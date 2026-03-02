#!/usr/bin/env bun
/**
 * Build + install script for wt CLI.
 *
 * Usage:
 *   bun run scripts/install.ts [install-dir]
 *
 * Defaults to ~/.local/bin if no install dir is provided.
 */
import { $ } from "bun";
import { resolve } from "path";
import { homedir } from "os";

const projectRoot = resolve(import.meta.dir, "..");
const installDir = process.argv[2] ?? resolve(homedir(), ".local", "bin");

process.chdir(projectRoot);

console.error("Building wt CLI...");
await $`bun install --frozen-lockfile 2>/dev/null || bun install`.quiet();

console.error("Compiling binary...");
await $`bun build --compile --outfile ${resolve(installDir, "wt")} src/index.ts`.quiet();

console.error(`
Installed: ${installDir}/wt

Add the following shell wrapper to your .zshrc or .bashrc:

  wt() {
    local cd_target
    cd_target=$(command wt "$@")
    local exit_code=$?
    [[ $exit_code -ne 0 ]] && return $exit_code
    [[ -n "$cd_target" ]] && cd "$cd_target"
  }

For shell completions, add:
  source <(command wt completion zsh)   # for zsh
  eval "$(command wt completion bash)"   # for bash
  command wt completion fish | source    # for fish
`);
