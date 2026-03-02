import { describe, test, expect } from "bun:test";
import { classifyBranch } from "../src/git";
import type { BranchInfo, BranchGroup } from "../src/git";

function makeBranch(overrides: Partial<BranchInfo> = {}): BranchInfo {
  return {
    name: "some-branch",
    isLocal: true,
    isRemote: false,
    hasWorktree: false,
    ...overrides,
  };
}

describe("classifyBranch", () => {
  const owner = "stabai";
  const agentPrefixes = ["claude/", "devin/", "copilot/"];
  const userEmail = "stabai@example.com";

  test("classifies owner-prefixed branches as 'yours'", () => {
    const branch = makeBranch({ name: "stabai/my-feature" });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "yours",
    );
  });

  test("classifies owner-prefixed branches as 'yours' even with worktree", () => {
    const branch = makeBranch({
      name: "stabai/my-feature",
      hasWorktree: true,
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "yours",
    );
  });

  test("classifies agent-prefixed branches with matching email as 'your-agents'", () => {
    const branch = makeBranch({
      name: "claude/refactor-auth",
      lastCommitterEmail: "stabai@example.com",
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "your-agents",
    );
  });

  test("classifies agent-prefixed branches with different email as 'remote'", () => {
    const branch = makeBranch({
      name: "claude/refactor-auth",
      lastCommitterEmail: "other@example.com",
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "remote",
    );
  });

  test("classifies agent-prefixed branches with no email as 'remote'", () => {
    const branch = makeBranch({
      name: "devin/some-task",
      lastCommitterEmail: undefined,
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "remote",
    );
  });

  test("classifies branches with worktrees as 'active'", () => {
    const branch = makeBranch({
      name: "teammate/their-feature",
      hasWorktree: true,
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "active",
    );
  });

  test("classifies unmatched branches as 'remote'", () => {
    const branch = makeBranch({
      name: "teammate/their-feature",
      hasWorktree: false,
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "remote",
    );
  });

  test("owner match takes precedence over agent match", () => {
    // If the owner prefix is also in agent_prefixes somehow
    const branch = makeBranch({
      name: "stabai/agent-style",
      lastCommitterEmail: userEmail,
    });
    expect(
      classifyBranch(branch, owner, [...agentPrefixes, "stabai/"], userEmail),
    ).toBe("yours");
  });

  test("agent match takes precedence over worktree", () => {
    const branch = makeBranch({
      name: "claude/task",
      hasWorktree: true,
      lastCommitterEmail: userEmail,
    });
    expect(classifyBranch(branch, owner, agentPrefixes, userEmail)).toBe(
      "your-agents",
    );
  });

  test("works with empty agent prefixes", () => {
    const branch = makeBranch({ name: "claude/task" });
    expect(classifyBranch(branch, owner, [], userEmail)).toBe("remote");
  });
});
