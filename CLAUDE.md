# CLAUDE.md — wt-cli

## What this project is

`wt` is a TypeScript/Bun CLI for managing git worktrees. It compiles to a single binary via `bun build --compile`. A thin shell wrapper function intercepts the binary's stdout to handle `cd` into worktree directories.

## Key commands

```bash
bun install              # install dependencies
bun test                 # run all tests (bun:test)
bun run build            # compile to ./wt binary
bun run src/index.ts     # run from source (dev mode)
```

## Architecture

- **src/index.ts** — entrypoint. Registers subcommands via citty. Also handles `--complete` flag for dynamic shell completions.
- **src/config.ts** — loads and validates `~/.wtrc` (JSON config file).
- **src/git.ts** — all git subprocess calls using Bun's `$` template literal shell. Also contains `classifyBranch()` for grouping branches in completions.
- **src/commands/*.ts** — one file per subcommand (add, checkout, cd, ls, rm, purge, completion). Each exports a citty command definition.

## Critical conventions

### The cd protocol
- **stdout** is reserved exclusively for directory paths that the shell wrapper should `cd` into.
- **All user-facing output** (logs, prompts, errors) must go to **stderr** (`console.error`, `@clack/prompts` which defaults to stderr).
- Breaking this convention will cause the shell wrapper to try to `cd` into error messages.

### Bun shell escaping
Format strings containing `%(...)` (used in `git for-each-ref --format=...`) must be stored in a variable first, then interpolated into the `$` template literal. Direct embedding causes Bun's shell parser to choke on the parentheses.

```typescript
// CORRECT
const fmt = "%(refname:short)";
await $`git for-each-ref --format=${fmt} refs/heads/`.text();

// WRONG — will throw "Unexpected token"
await $`git for-each-ref --format=%(refname:short) refs/heads/`.text();
```

### Testing
- Tests use `bun:test` (Bun's built-in test runner).
- Git integration tests create a temporary repo in `beforeAll` and clean up in `afterAll`. They disable GPG signing with `--no-gpg-sign` and `commit.gpgSign false`.
- CLI subprocess tests use `Bun.spawnSync`. Note: `bun test` cannot capture stdout from child `bun` processes that call `process.exit()` (citty does this for `--help`), so help output is tested via direct module import instead.
- Config tests write to `~/.wtrc` — they save/restore the original file.

### Dependencies
- **citty** — CLI framework (subcommand definitions, arg parsing).
- **@clack/prompts** — interactive prompts (select, multiselect, confirm). Writes to stderr.
- **picocolors** — terminal colors. Used for log dimming and status badges.

## File locations

| What | Where |
|---|---|
| Config file | `~/.wtrc` |
| Default worktree dir | `<repo-parent>/<repo-name>_trees/` |
| Install target | `~/.local/bin/wt` |
| User docs | `docs/` |
