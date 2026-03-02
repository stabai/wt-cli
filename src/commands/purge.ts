import { defineCommand } from "citty";
import * as p from "@clack/prompts";
import {
  worktreePrune,
  branchesWithGoneUpstream,
  deleteBranch,
  deleteRemoteTrackingRef,
  log,
} from "../git";

export default defineCommand({
  meta: {
    name: "purge",
    description: "Clean up stale worktree and branch metadata",
  },
  args: {
    branches: {
      type: "boolean",
      description:
        "Also scan for local branches whose upstream tracking ref is gone",
      default: false,
    },
  },
  async run({ args }) {
    log("wt purge", "pruning stale worktree metadata");
    await worktreePrune();
    p.log.success("Pruned stale worktree metadata.");

    if (!args.branches) return;

    const gone = await branchesWithGoneUpstream();
    if (gone.length === 0) {
      p.log.info("No local branches with deleted upstream tracking refs.");
      return;
    }

    const selected = await p.multiselect({
      message: "Found local branches with deleted upstream tracking refs:",
      options: gone.map((b) => ({
        value: b,
        label: b,
        hint: "upstream gone",
      })),
      required: false,
    });

    if (p.isCancel(selected) || selected.length === 0) {
      return;
    }

    for (const branch of selected) {
      log("wt purge", `deleting branch '${branch}'`);
      await deleteBranch(branch, true);
      await deleteRemoteTrackingRef(branch);
    }

    p.log.success(`Deleted ${selected.length} branch(es).`);
  },
});
