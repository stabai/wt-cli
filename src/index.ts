import { defineCommand, runMain } from "citty";
import { loadConfig } from "./config";
import {
  worktreeList,
  localBranches,
  remoteBranches,
  classifyBranch,
  gitConfig,
  lastCommitterEmail,
} from "./git";
import type { BranchInfo, BranchGroup } from "./git";

import { subCommands } from "./subcommands";

// Handle --complete for dynamic shell completions
async function handleComplete(args: string[]) {
  const type = args[0]; // "branches" or "worktree-branches"
  const config = loadConfig();

  if (type === "worktree-branches") {
    // Branches that have worktrees (for `wt rm`)
    const worktrees = await worktreeList();
    for (const wt of worktrees) {
      if (wt.branch && !wt.bare) {
        console.log(wt.branch);
      }
    }
    return;
  }

  if (type === "branches") {
    const worktrees = await worktreeList();
    const wtBranches = new Set(worktrees.map((w) => w.branch).filter(Boolean));
    const local = await localBranches();
    const remote = await remoteBranches();

    const allBranches = new Set([...local, ...remote]);
    const userEmail = await gitConfig("user.email");
    const owner = config.owner || (await gitConfig("user.name"));

    const infos: BranchInfo[] = [];
    for (const name of allBranches) {
      const isLocal = local.includes(name);
      const isRemote = remote.includes(name);
      const hasWorktree = wtBranches.has(name);

      let email: string | undefined;
      if (isLocal) {
        email = await lastCommitterEmail(name);
      }

      infos.push({
        name,
        isLocal,
        isRemote,
        hasWorktree,
        lastCommitterEmail: email,
      });
    }

    // Classify and group
    const groups: Record<BranchGroup, BranchInfo[]> = {
      yours: [],
      "your-agents": [],
      active: [],
      remote: [],
    };

    for (const info of infos) {
      const group = classifyBranch(
        info,
        owner,
        config.agent_prefixes,
        userEmail,
      );
      groups[group].push(info);
    }

    // Output in order: yours, your-agents, active, remote
    const order: BranchGroup[] = ["yours", "your-agents", "active", "remote"];
    for (const group of order) {
      for (const b of groups[group]) {
        console.log(b.name);
      }
    }
    return;
  }
}

// Check for --complete flag before running citty
const completeIdx = process.argv.indexOf("--complete");
if (completeIdx !== -1) {
  const completeArgs = process.argv.slice(completeIdx + 1);
  handleComplete(completeArgs)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  const main = defineCommand({
    meta: {
      name: "wt",
      version: "0.1.0",
      description: "Helper utility for working with git worktrees",
    },
    subCommands,
  });

  runMain(main);
}
