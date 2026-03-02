import * as p from "@clack/prompts";
import { defineWtCommand } from "../command";
import { loadConfig } from "../config";
import {
  currentWorktreeBranch,
  deleteBranch,
  deleteRemoteTrackingRef,
  hasUnmergedCommits,
  hasUnpushedCommits,
  log,
  repoRoot,
  worktreeIsDirty,
  worktreeList,
  worktreeRemove,
} from "../git";

export default defineWtCommand({
  meta: { name: "rm", description: "Remove a worktree and its branch" },
  args: {
    branch: {
      type: "positional",
      completionType: "worktree-branches",
      description:
        "Branch whose worktree to remove (defaults to current worktree)",
      required: false,
    },
    f: {
      type: "boolean",
      description: "Force removal without prompts",
      default: false,
    },
    "keep-branch": {
      type: "boolean",
      description: "Keep the local branch after removing the worktree",
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    let branch = args.branch as string | undefined;
    const force = args.f as boolean;
    const keepBranch = args["keep-branch"] as boolean;

    const worktrees = await worktreeList();
    const root = await repoRoot();

    // Auto-detect current worktree if no branch given
    if (!branch) {
      const currentBranch = await currentWorktreeBranch();
      if (!currentBranch) {
        p.log.error("Could not detect current branch. Specify a branch name.");
        process.exit(1);
      }
      branch = currentBranch;
    }

    // Find the worktree for this branch
    const wt = worktrees.find((w) => w.branch === branch);
    if (!wt) {
      p.log.error(`No worktree found for branch '${branch}'.`);
      process.exit(1);
    }

    // Don't allow removing the main worktree
    if (wt.path === root) {
      p.log.error("Cannot remove the main worktree.");
      process.exit(1);
    }

    // Check for dirty state
    const dirty = await worktreeIsDirty(wt.path);
    const unpushed = await hasUnpushedCommits(branch);

    if ((dirty || unpushed) && !force) {
      const reason = dirty ? "uncommitted changes" : "unpushed commits";
      const action = await p.select({
        message: `Worktree has ${reason}. Remove anyway?`,
        options: [
          { value: "yes", label: "Yes, remove it" },
          { value: "cancel", label: "Cancel" },
        ],
      });

      if (p.isCancel(action) || action === "cancel") {
        process.exit(0);
      }
    }

    // Detect if we're inside the worktree being removed
    const cwd = process.cwd();
    const insideWorktree = cwd.startsWith(wt.path);

    log("wt rm", `removing worktree at ${wt.path}`);
    await worktreeRemove(wt.path, true); // always force at git level since we handled prompts

    // Branch cleanup
    if (!keepBranch) {
      const unmerged = await hasUnmergedCommits(branch, config.default_branch);

      if (unmerged && !force) {
        const action = await p.select({
          message: `Branch '${branch}' has commits not merged into ${config.default_branch}.`,
          options: [
            { value: "delete", label: "Delete it anyway" },
            { value: "keep", label: "Keep the branch" },
            { value: "cancel", label: "Cancel (keep everything)" },
          ],
        });

        if (p.isCancel(action) || action === "cancel") {
          // Worktree is already removed, nothing to undo
          process.exit(0);
        }

        if (action === "keep") {
          log("wt rm", `keeping branch '${branch}'`);
        } else {
          log("wt rm", `deleting branch '${branch}'`);
          await deleteBranch(branch, true);
          await deleteRemoteTrackingRef(branch);
        }
      } else {
        log("wt rm", `deleting branch '${branch}'`);
        await deleteBranch(branch, force || unmerged === false);
        await deleteRemoteTrackingRef(branch);
      }
    }

    // If we were inside the removed worktree, output root for cd
    if (insideWorktree) {
      process.stdout.write(root);
    }
  },
});
