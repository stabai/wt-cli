import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { $ } from "bun";
import { mkdtempSync, existsSync, rmSync, realpathSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Integration tests that create a real git repo in a temp directory.
// These test the git helpers against actual git state.

let repoDir: string;
let originalCwd: string;

beforeAll(async () => {
  originalCwd = process.cwd();
  repoDir = mkdtempSync(join(tmpdir(), "wt-test-"));

  // Initialize a git repo with an initial commit
  // Disable GPG signing which may fail in CI/test environments
  await $`git init ${repoDir}`.quiet();
  await $`git -C ${repoDir} config user.email "test@example.com"`.quiet();
  await $`git -C ${repoDir} config user.name "testuser"`.quiet();
  await $`git -C ${repoDir} config commit.gpgSign false`.quiet();
  await $`git -C ${repoDir} config tag.gpgSign false`.quiet();
  await $`git -C ${repoDir} commit --no-gpg-sign --allow-empty -m "initial commit"`.quiet();
  // Create a dev branch
  await $`git -C ${repoDir} branch dev`.quiet();

  process.chdir(repoDir);
});

afterAll(async () => {
  process.chdir(originalCwd);
  // Clean up worktrees before removing repo
  try {
    await $`git -C ${repoDir} worktree prune`.quiet();
  } catch {
    // ignore
  }
  rmSync(repoDir, { recursive: true, force: true });
});

describe("git helpers (integration)", () => {
  test("repoRoot returns the repo directory", async () => {
    const { repoRoot } = await import("../src/git");
    const root = await repoRoot();
    expect(realpathSync(root)).toBe(realpathSync(repoDir));
  });

  test("resolveBaseDir falls back to <repo>_trees", async () => {
    const { resolveBaseDir } = await import("../src/git");
    const baseDir = await resolveBaseDir({
      default_branch: "dev",
      agent_prefixes: [],
    });
    expect(baseDir).toMatch(/_trees$/);
  });

  test("resolveBaseDir uses config.base_dir when set", async () => {
    const { resolveBaseDir } = await import("../src/git");
    const baseDir = await resolveBaseDir({
      default_branch: "dev",
      base_dir: "/custom/path",
      agent_prefixes: [],
    });
    expect(baseDir).toBe("/custom/path");
  });

  test("worktreeList returns at least the main worktree", async () => {
    const { worktreeList } = await import("../src/git");
    const list = await worktreeList();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(realpathSync(list[0].path)).toBe(realpathSync(repoDir));
  });

  test("currentWorktreeBranch returns current branch", async () => {
    const { currentWorktreeBranch } = await import("../src/git");
    const branch = await currentWorktreeBranch();
    expect(branch).toBeTruthy();
  });

  test("branchExistsLocally returns true for existing branch", async () => {
    const { branchExistsLocally } = await import("../src/git");
    expect(await branchExistsLocally("dev")).toBe(true);
  });

  test("branchExistsLocally returns false for non-existing branch", async () => {
    const { branchExistsLocally } = await import("../src/git");
    expect(await branchExistsLocally("nonexistent-branch-xyz")).toBe(false);
  });

  test("localBranches returns list including dev", async () => {
    const { localBranches } = await import("../src/git");
    const branches = await localBranches();
    expect(branches).toContain("dev");
  });

  test("gitConfig returns configured value", async () => {
    const { gitConfig } = await import("../src/git");
    const email = await gitConfig("user.email");
    expect(email).toBe("test@example.com");
  });

  test("gitConfig returns empty string for missing key", async () => {
    const { gitConfig } = await import("../src/git");
    const val = await gitConfig("nonexistent.key.xyz");
    expect(val).toBe("");
  });

  test("worktreeIsDirty detects clean state", async () => {
    const { worktreeIsDirty } = await import("../src/git");
    const dirty = await worktreeIsDirty(repoDir);
    expect(dirty).toBe(false);
  });

  test("worktreeIsDirty detects dirty state", async () => {
    const { worktreeIsDirty } = await import("../src/git");
    const { writeFileSync, unlinkSync } = await import("fs");
    const tempFile = join(repoDir, "dirty-test-file.txt");
    writeFileSync(tempFile, "dirty");
    const dirty = await worktreeIsDirty(repoDir);
    expect(dirty).toBe(true);
    unlinkSync(tempFile);
  });
});

describe("worktree operations (integration)", () => {
  const treesDir = join(tmpdir(), "wt-test-trees-" + Date.now());

  afterAll(() => {
    rmSync(treesDir, { recursive: true, force: true });
  });

  test("worktreeAdd creates a worktree with a new branch", async () => {
    const { worktreeAdd, worktreeList } = await import("../src/git");
    const wtPath = join(treesDir, "test-feature");
    await worktreeAdd(wtPath, "test-feature", "dev");

    expect(existsSync(wtPath)).toBe(true);

    const list = await worktreeList();
    const found = list.find((w) => w.branch === "test-feature");
    expect(found).toBeTruthy();
  });

  test("worktreePath returns path for existing worktree", async () => {
    const { worktreePath } = await import("../src/git");
    const path = await worktreePath("test-feature");
    expect(path).toBeTruthy();
    expect(path).toContain("test-feature");
  });

  test("worktreePath returns null for non-existent worktree", async () => {
    const { worktreePath } = await import("../src/git");
    const path = await worktreePath("no-such-branch-xyz");
    expect(path).toBeNull();
  });

  test("worktreeCheckout creates worktree for existing branch", async () => {
    const { worktreeCheckout, worktreeList } = await import("../src/git");
    await $`git -C ${repoDir} branch checkout-test`.quiet();

    const wtPath = join(treesDir, "checkout-test");
    await worktreeCheckout(wtPath, "checkout-test");

    expect(existsSync(wtPath)).toBe(true);

    const list = await worktreeList();
    const found = list.find((w) => w.branch === "checkout-test");
    expect(found).toBeTruthy();
  });

  test("worktreeRemove removes a worktree", async () => {
    const { worktreeRemove, worktreeList } = await import("../src/git");
    const wtPath = join(treesDir, "checkout-test");
    await worktreeRemove(wtPath, true);

    const list = await worktreeList();
    const found = list.find((w) => w.branch === "checkout-test");
    expect(!found || found.prunable).toBe(true);
  });

  test("deleteBranch deletes a local branch", async () => {
    const { deleteBranch, branchExistsLocally } = await import("../src/git");
    await $`git -C ${repoDir} branch delete-test dev`.quiet();
    expect(await branchExistsLocally("delete-test")).toBe(true);

    await deleteBranch("delete-test", true);
    expect(await branchExistsLocally("delete-test")).toBe(false);
  });
});
