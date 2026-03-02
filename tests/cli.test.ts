import { describe, test, expect } from "bun:test";

// Tests that verify the CLI entrypoint works end-to-end via subprocess calls.
// These are high-level smoke tests. citty writes --help to stderr.

function run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise(async (resolve) => {
    const proc = Bun.spawn(["bun", "run", "src/index.ts", ...args], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    resolve({ stdout, stderr, exitCode });
  });
}

describe("CLI entrypoint", () => {
  test("--help shows usage info", async () => {
    const { stdout, stderr } = await run(["--help"]);
    const output = stdout + stderr;
    expect(output).toContain("wt");
    expect(output).toContain("add");
    expect(output).toContain("checkout");
    expect(output).toContain("cd");
    expect(output).toContain("ls");
    expect(output).toContain("rm");
    expect(output).toContain("purge");
    expect(output).toContain("completion");
  });

  test("add --help shows add usage", async () => {
    const { stdout, stderr } = await run(["add", "--help"]);
    const output = stdout + stderr;
    expect(output).toContain("branch");
  });

  test("checkout --help shows checkout usage", async () => {
    const { stdout, stderr } = await run(["checkout", "--help"]);
    const output = stdout + stderr;
    expect(output).toContain("branch");
  });

  test("ls lists worktrees to stderr", async () => {
    const { stderr, exitCode } = await run(["ls"]);
    expect(exitCode).toBe(0);
    expect(stderr).toBeTruthy();
  });

  test("completion zsh outputs zsh script to stdout", async () => {
    const { stdout } = await run(["completion", "zsh"]);
    expect(stdout).toContain("#compdef wt");
    expect(stdout).toContain("_wt");
  });

  test("completion bash outputs bash script to stdout", async () => {
    const { stdout } = await run(["completion", "bash"]);
    expect(stdout).toContain("complete -F _wt wt");
  });

  test("completion fish outputs fish script to stdout", async () => {
    const { stdout } = await run(["completion", "fish"]);
    expect(stdout).toContain("complete -c wt");
  });

  test("ls --status shows status badges", async () => {
    const { stderr, exitCode } = await run(["ls", "--status"]);
    expect(exitCode).toBe(0);
    expect(
      stderr.includes("[clean]") ||
        stderr.includes("[dirty]") ||
        stderr.includes("[unpushed]"),
    ).toBe(true);
  });
});
