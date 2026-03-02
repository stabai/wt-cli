import { describe, test, expect } from "bun:test";
import { resolve } from "path";

// Tests that verify the CLI entrypoint works end-to-end via subprocess calls.
// Note: citty calls process.exit() after --help, which prevents bun test from
// capturing child process stdout. We test help via direct import instead.
const PROJECT_ROOT = resolve(import.meta.dir, "..");
const ENTRY = resolve(PROJECT_ROOT, "src/index.ts");

function run(args: string[]) {
  const proc = Bun.spawnSync(["bun", "run", ENTRY, ...args], {
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
    exitCode: proc.exitCode,
  };
}

describe("CLI command registration", () => {
  test("all subcommands are registered", async () => {
    // Verify command structure by importing the modules directly
    const add = (await import("../src/commands/add")).default;
    const checkout = (await import("../src/commands/checkout")).default;
    const cd = (await import("../src/commands/cd")).default;
    const ls = (await import("../src/commands/ls")).default;
    const rm = (await import("../src/commands/rm")).default;
    const purge = (await import("../src/commands/purge")).default;
    const completion = (await import("../src/commands/completion")).default;

    expect(add.meta?.name).toBe("add");
    expect(checkout.meta?.name).toBe("checkout");
    expect(cd.meta?.name).toBe("cd");
    expect(ls.meta?.name).toBe("ls");
    expect(rm.meta?.name).toBe("rm");
    expect(purge.meta?.name).toBe("purge");
    expect(completion.meta?.name).toBe("completion");
  });

  test("add command has expected args", async () => {
    const add = (await import("../src/commands/add")).default;
    expect(add.args?.branch).toBeDefined();
    expect(add.args?.base).toBeDefined();
    expect(add.args?.["no-cd"]).toBeDefined();
  });

  test("checkout command has expected args", async () => {
    const checkout = (await import("../src/commands/checkout")).default;
    expect(checkout.args?.branch).toBeDefined();
    expect(checkout.args?.["no-cd"]).toBeDefined();
  });

  test("rm command has expected args", async () => {
    const rm = (await import("../src/commands/rm")).default;
    expect(rm.args?.branch).toBeDefined();
    expect(rm.args?.f).toBeDefined();
    expect(rm.args?.["keep-branch"]).toBeDefined();
  });

  test("all commands carry _wtArgs completion metadata", async () => {
    const { getWtArgs } = await import("../src/command");
    const add = (await import("../src/commands/add")).default;
    const rm = (await import("../src/commands/rm")).default;
    const completion = (await import("../src/commands/completion")).default;

    const addArgs = getWtArgs(add);
    expect(addArgs.branch?.type).toBe("positional");
    expect((addArgs.branch as any)?.completionType).toBe("branches");
    expect(addArgs.base?.type).toBe("positional");
    expect((addArgs.base as any)?.completionType).toBe("branches");

    const rmArgs = getWtArgs(rm);
    expect((rmArgs.branch as any)?.completionType).toBe("worktree-branches");

    const compArgs = getWtArgs(completion);
    expect((compArgs.shell as any)?.completionType).toBe("shells");
  });
});

describe("CLI subprocess", () => {
  test("ls lists worktrees to stderr", () => {
    const { stderr, exitCode } = run(["ls"]);
    expect(exitCode).toBe(0);
    expect(stderr).toBeTruthy();
  });

  test("completion zsh outputs zsh script to stdout", () => {
    const { stdout } = run(["completion", "zsh"]);
    expect(stdout).toContain("#compdef wt");
    expect(stdout).toContain("_wt");
  });

  test("completion bash outputs bash script to stdout", () => {
    const { stdout } = run(["completion", "bash"]);
    expect(stdout).toContain("complete -F _wt wt");
  });

  test("completion fish outputs fish script to stdout", () => {
    const { stdout } = run(["completion", "fish"]);
    expect(stdout).toContain("complete -c wt");
  });

  test("ls --status shows status badges", () => {
    const { stderr, exitCode } = run(["ls", "--status"]);
    expect(exitCode).toBe(0);
    expect(
      stderr.includes("[clean]") ||
        stderr.includes("[dirty]") ||
        stderr.includes("[unpushed]"),
    ).toBe(true);
  });
});
