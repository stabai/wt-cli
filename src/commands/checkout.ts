import { defineCommand } from "citty";
import { resolve } from "path";
import { existsSync } from "fs";
import { loadConfig } from "../config";
import {
  resolveBaseDir,
  worktreeCheckout,
  worktreePath,
  branchExistsLocally,
  branchExistsOnOrigin,
  log,
} from "../git";

export default defineCommand({
  meta: {
    name: "checkout",
    description: "Create a new worktree for an existing branch",
  },
  args: {
    branch: {
      type: "positional",
      description: "Branch to check out into a worktree",
      required: true,
    },
    "no-cd": {
      type: "boolean",
      description: "Don't output path for cd",
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const branch = args.branch as string;

    // Check if worktree already exists
    const existing = await worktreePath(branch);
    if (existing) {
      log(
        "wt checkout",
        `worktree for '${branch}' already exists at ${existing}`,
      );
      if (!args["no-cd"]) {
        process.stdout.write(existing);
      }
      return;
    }

    // Verify the branch exists somewhere
    const local = await branchExistsLocally(branch);
    const remote = await branchExistsOnOrigin(branch);
    if (!local && !remote) {
      log(
        "wt checkout",
        `branch '${branch}' does not exist locally or on origin`,
      );
      process.exit(1);
    }

    const baseDir = await resolveBaseDir(config);
    const wtPath = resolve(baseDir, branch);

    if (existsSync(wtPath)) {
      log(
        "wt checkout",
        `directory already exists at ${wtPath}, skipping creation`,
      );
      if (!args["no-cd"]) {
        process.stdout.write(wtPath);
      }
      return;
    }

    log("wt checkout", `checking out '${branch}' at ${wtPath}`);
    await worktreeCheckout(wtPath, branch);

    if (!args["no-cd"]) {
      process.stdout.write(wtPath);
    }
  },
});
