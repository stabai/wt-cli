import { $ } from "bun";
import { basename, dirname, resolve } from "path";
import pc from "picocolors";
import type { WtConfig } from "./config";

export function log(prefix: string, msg: string) {
  console.error(pc.dim(`${prefix}: ${msg}`));
}

/** Get the repo root (toplevel of the main worktree). */
export async function repoRoot(): Promise<string> {
  // In a worktree, --show-toplevel returns the worktree root.
  // We need the common dir to find the actual repo root.
  const commonDir = (
    await $`git rev-parse --git-common-dir`.text()
  ).trim();
  // commonDir is e.g. /path/to/repo/.git — resolve to parent
  if (commonDir === ".git") {
    return (await $`git rev-parse --show-toplevel`.text()).trim();
  }
  return resolve(commonDir, "..");
}

/** Resolve the base directory where worktrees are stored. */
export async function resolveBaseDir(config: WtConfig): Promise<string> {
  if (config.base_dir) {
    return config.base_dir;
  }
  const root = await repoRoot();
  const repoName = basename(root);
  const parentDir = dirname(root);
  const baseDir = resolve(parentDir, `${repoName}_trees`);
  log("wt", `resolved base dir from repo root (${root}): ${baseDir}`);
  return baseDir;
}

/** Get the worktree path for a branch, or null if no worktree exists. */
export async function worktreePath(branch: string): Promise<string | null> {
  const list = await worktreeList();
  for (const wt of list) {
    if (wt.branch === branch) return wt.path;
  }
  return null;
}

export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string;
  bare: boolean;
  prunable: boolean;
}

/** List all worktrees in a structured format. */
export async function worktreeList(): Promise<WorktreeInfo[]> {
  const output = (
    await $`git worktree list --porcelain`.text()
  ).trim();

  if (!output) return [];

  const worktrees: WorktreeInfo[] = [];
  const blocks = output.split("\n\n");

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let path = "";
    let head = "";
    let branch = "";
    let bare = false;
    let prunable = false;

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        path = line.slice("worktree ".length);
      } else if (line.startsWith("HEAD ")) {
        head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        // refs/heads/foo → foo
        branch = line.slice("branch ".length).replace("refs/heads/", "");
      } else if (line === "bare") {
        bare = true;
      } else if (line.startsWith("prunable")) {
        prunable = true;
      }
    }

    if (path) {
      worktrees.push({ path, head, branch, bare, prunable });
    }
  }

  return worktrees;
}

/** Get the worktree path for a given directory (for detecting current worktree). */
export async function currentWorktreeBranch(): Promise<string | null> {
  try {
    const ref = (
      await $`git symbolic-ref --short HEAD`.text()
    ).trim();
    return ref || null;
  } catch {
    return null;
  }
}

/** Check if a branch exists locally. */
export async function branchExistsLocally(branch: string): Promise<boolean> {
  try {
    await $`git rev-parse --verify refs/heads/${branch}`.quiet();
    return true;
  } catch {
    return false;
  }
}

/** Check if a branch exists on origin. */
export async function branchExistsOnOrigin(branch: string): Promise<boolean> {
  try {
    await $`git rev-parse --verify refs/remotes/origin/${branch}`.quiet();
    return true;
  } catch {
    return false;
  }
}

/** Create a new worktree with a new branch. */
export async function worktreeAdd(
  worktreePath: string,
  newBranch: string,
  baseBranch: string,
): Promise<void> {
  await $`git worktree add -b ${newBranch} ${worktreePath} ${baseBranch}`.quiet();
}

/** Create a worktree for an existing branch. */
export async function worktreeCheckout(
  wtPath: string,
  branch: string,
): Promise<void> {
  await $`git worktree add ${wtPath} ${branch}`.quiet();
}

/** Remove a worktree. */
export async function worktreeRemove(
  wtPath: string,
  force: boolean,
): Promise<void> {
  if (force) {
    await $`git worktree remove --force ${wtPath}`.quiet();
  } else {
    await $`git worktree remove ${wtPath}`.quiet();
  }
}

/** Prune stale worktree metadata. */
export async function worktreePrune(): Promise<void> {
  await $`git worktree prune`.quiet();
}

/** Delete a local branch. */
export async function deleteBranch(
  branch: string,
  force: boolean,
): Promise<void> {
  if (force) {
    await $`git branch -D ${branch}`.quiet();
  } else {
    await $`git branch -d ${branch}`.quiet();
  }
}

/** Delete the remote tracking ref for a branch. */
export async function deleteRemoteTrackingRef(branch: string): Promise<void> {
  try {
    await $`git branch -dr origin/${branch}`.quiet();
  } catch {
    // tracking ref may not exist, that's fine
  }
}

/** Check if a branch has uncommitted changes in its worktree. */
export async function worktreeIsDirty(wtPath: string): Promise<boolean> {
  try {
    const status = (
      await $`git -C ${wtPath} status --porcelain`.text()
    ).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/** Check if a branch has unpushed commits. */
export async function hasUnpushedCommits(branch: string): Promise<boolean> {
  try {
    const output = (
      await $`git log origin/${branch}..${branch} --oneline`.text()
    ).trim();
    return output.length > 0;
  } catch {
    // No upstream — consider as unpushed
    return true;
  }
}

/** Check if a branch has commits not reachable from another branch. */
export async function hasUnmergedCommits(
  branch: string,
  intoBranch: string,
): Promise<boolean> {
  try {
    const output = (
      await $`git log ${intoBranch}..${branch} --oneline`.text()
    ).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/** Get git config value. */
export async function gitConfig(key: string): Promise<string> {
  try {
    return (await $`git config ${key}`.text()).trim();
  } catch {
    return "";
  }
}

export interface BranchInfo {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  hasWorktree: boolean;
  lastCommitterEmail?: string;
}

export type BranchGroup = "yours" | "your-agents" | "active" | "remote";

/** Classify a branch into a group. */
export function classifyBranch(
  branch: BranchInfo,
  owner: string,
  agentPrefixes: string[],
  userEmail: string,
): BranchGroup {
  if (branch.name.startsWith(`${owner}/`)) return "yours";
  const isAgentPrefix = agentPrefixes.some((p) => branch.name.startsWith(p));
  if (isAgentPrefix && branch.lastCommitterEmail === userEmail)
    return "your-agents";
  if (branch.hasWorktree) return "active";
  return "remote";
}

/** Get all local branches. */
export async function localBranches(): Promise<string[]> {
  const fmt = "%(refname:short)";
  const output = (
    await $`git for-each-ref --format=${fmt} refs/heads/`.text()
  ).trim();
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

/** Get all remote branches (origin only). */
export async function remoteBranches(): Promise<string[]> {
  const fmt = "%(refname:short)";
  const output = (
    await $`git for-each-ref --format=${fmt} refs/remotes/origin/`.text()
  ).trim();
  if (!output) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((b) => b.replace(/^origin\//, ""))
    .filter((b) => b !== "HEAD");
}

/** Get branches whose upstream tracking ref is gone. */
export async function branchesWithGoneUpstream(): Promise<string[]> {
  try {
    const fmt = "%(refname:short) %(upstream:track)";
    const output = (
      await $`git for-each-ref --format=${fmt} refs/heads/`.text()
    ).trim();
    if (!output) return [];
    const gone: string[] = [];
    for (const line of output.split("\n")) {
      if (line.includes("[gone]")) {
        const branch = line.split(" ")[0];
        if (branch) gone.push(branch);
      }
    }
    return gone;
  } catch {
    return [];
  }
}

/** Get the last committer email for a branch. */
export async function lastCommitterEmail(branch: string): Promise<string> {
  try {
    const fmt = "%ce";
    return (
      await $`git log -1 --format=${fmt} ${branch}`.text()
    ).trim();
  } catch {
    return "";
  }
}
