import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineWtCommand } from "../command";
import { loadConfig } from "../config";
import {
  branchExistsLocally,
  log,
  resolveBaseDir,
  worktreeAdd,
  worktreePath,
} from "../git";

export default defineWtCommand({
  meta: { name: "add", description: "Create a new worktree with a new branch" },
  args: {
    branch: {
      type: "positional",
      completionType: "branches",
      description: "Name of the new branch to create",
      required: true,
    },
    base: {
      type: "positional",
      completionType: "branches",
      description:
        "Base branch to create from (defaults to config default_branch)",
      required: false,
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
    const baseBranch = (args.base as string) || config.default_branch;

    // Check if the branch already exists locally
    if (await branchExistsLocally(branch)) {
      const existing = await worktreePath(branch);
      if (existing) {
        log("wt add", `worktree for '${branch}' already exists at ${existing}`);
        if (!args["no-cd"]) {
          process.stdout.write(existing);
        }
        return;
      }
      log(
        "wt add",
        `branch '${branch}' already exists locally — use 'wt checkout' instead`,
      );
      process.exit(1);
    }

    const baseDir = await resolveBaseDir(config);
    const wtPath = resolve(baseDir, branch);

    if (existsSync(wtPath)) {
      log("wt add", `directory already exists at ${wtPath}, skipping creation`);
      if (!args["no-cd"]) {
        process.stdout.write(wtPath);
      }
      return;
    }

    log(
      "wt add",
      `creating branch '${branch}' from '${baseBranch}' at ${wtPath}`,
    );
    await worktreeAdd(wtPath, branch, baseBranch);

    if (!args["no-cd"]) {
      process.stdout.write(wtPath);
    }
  },
});
