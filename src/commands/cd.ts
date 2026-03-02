import { defineCommand } from "citty";
import { resolve } from "path";
import * as p from "@clack/prompts";
import { loadConfig } from "../config";
import {
  repoRoot,
  resolveBaseDir,
  worktreePath,
  worktreeAdd,
  worktreeCheckout,
  branchExistsLocally,
  branchExistsOnOrigin,
  log,
} from "../git";

export default defineCommand({
  meta: {
    name: "cd",
    description: "Change to a worktree directory",
  },
  args: {
    branch: {
      type: "positional",
      description:
        "Branch whose worktree to cd into (defaults to repo root)",
      required: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const branch = args.branch as string | undefined;

    // No argument or default branch → repo root
    if (!branch || branch === config.default_branch) {
      const root = await repoRoot();
      log("wt cd", `going to repo root: ${root}`);
      process.stdout.write(root);
      return;
    }

    // Check if worktree exists for this branch
    const existing = await worktreePath(branch);
    if (existing) {
      log("wt cd", `found worktree for '${branch}' at ${existing}`);
      process.stdout.write(existing);
      return;
    }

    // Branch exists but no worktree
    const local = await branchExistsLocally(branch);
    const remote = await branchExistsOnOrigin(branch);

    if (local || remote) {
      const action = await p.select({
        message: `Branch '${branch}' exists but has no worktree.`,
        options: [
          { value: "checkout", label: "Check it out as a new worktree" },
          { value: "quit", label: "Quit" },
        ],
      });

      if (p.isCancel(action) || action === "quit") {
        process.exit(0);
      }

      const baseDir = await resolveBaseDir(config);
      const wtPath = resolve(baseDir, branch);

      log("wt cd", `checking out '${branch}' at ${wtPath}`);
      await worktreeCheckout(wtPath, branch);
      process.stdout.write(wtPath);
      return;
    }

    // Branch doesn't exist at all
    const action = await p.select({
      message: `No branch '${branch}' found locally or on origin.`,
      options: [
        {
          value: "create",
          label: `Create a new branch from ${config.default_branch}`,
        },
        { value: "quit", label: "Quit" },
      ],
    });

    if (p.isCancel(action) || action === "quit") {
      process.exit(0);
    }

    const baseDir = await resolveBaseDir(config);
    const wtPath = resolve(baseDir, branch);

    log(
      "wt cd",
      `creating branch '${branch}' from '${config.default_branch}' at ${wtPath}`,
    );
    await worktreeAdd(wtPath, branch, config.default_branch);
    process.stdout.write(wtPath);
  },
});
