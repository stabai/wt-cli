import pc from "picocolors";
import { defineWtCommand } from "../command";
import {
  worktreeList,
  worktreeIsDirty,
  hasUnpushedCommits,
} from "../git";

export default defineWtCommand({
  meta: { name: "ls", description: "List all worktrees" },
  args: {
    status: {
      type: "boolean",
      description: "Show status badges for each worktree",
      default: false,
    },
  },
  async run({ args }) {
    const worktrees = await worktreeList();

    if (!args.status) {
      // Simple list, similar to git worktree list
      for (const wt of worktrees) {
        const branchLabel = wt.branch
          ? `[${wt.branch}]`
          : wt.bare
            ? "(bare)"
            : "(detached)";
        console.error(
          `${wt.path.padEnd(50)} ${wt.head.slice(0, 7)} ${branchLabel}`,
        );
      }
      return;
    }

    // Status mode: check each worktree
    for (const wt of worktrees) {
      if (wt.bare) {
        const label = `${wt.path.padEnd(50)} (bare)`;
        console.error(label);
        continue;
      }

      if (wt.prunable) {
        const badge = pc.red("[PRUNABLE]");
        const branchLabel = wt.branch ? `[${wt.branch}]` : "(detached)";
        console.error(
          `${wt.path.padEnd(50)} ${wt.head.slice(0, 7)} ${branchLabel} ${badge}`,
        );
        continue;
      }

      const dirty = await worktreeIsDirty(wt.path);
      const unpushed = wt.branch
        ? await hasUnpushedCommits(wt.branch)
        : false;

      let badge: string;
      if (dirty) {
        badge = pc.yellow("[dirty]");
      } else if (unpushed) {
        badge = pc.cyan("[unpushed]");
      } else {
        badge = pc.green("[clean]");
      }

      const branchLabel = wt.branch ? `[${wt.branch}]` : "(detached)";
      console.error(
        `${wt.path.padEnd(50)} ${wt.head.slice(0, 7)} ${branchLabel} ${badge}`,
      );
    }
  },
});
