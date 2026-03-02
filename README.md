# wt — Git Worktree Manager

A CLI tool for managing [git worktrees](https://git-scm.com/docs/git-worktree) — create, switch, and clean up worktrees without the boilerplate.

Built with [Bun](https://bun.sh) and TypeScript. Compiles to a single binary.

## Install

### From source

```bash
git clone https://github.com/stabai/wt-cli.git
cd wt-cli
bun run install-cli
```

> **Coming soon:** prebuilt binaries for macOS and Linux via `curl` one-liner. See [#1](https://github.com/stabai/wt-cli/issues/1) or `.github/TODO-release.md`.

Then add the shell wrapper to your `.zshrc` or `.bashrc`:

```bash
wt() {
  local cd_target
  cd_target=$(command wt "$@")
  local exit_code=$?
  [[ $exit_code -ne 0 ]] && return $exit_code
  [[ -n "$cd_target" ]] && cd "$cd_target"
}

# Tab completions (zsh)
source <(command wt completion zsh)
```

## Usage

```bash
wt add stabai/my-feature       # create worktree + new branch from dev
wt checkout stabai/pr-review   # create worktree for existing branch
wt cd stabai/my-feature        # jump to a worktree
wt cd                          # jump to repo root
wt ls --status                 # list worktrees with clean/dirty badges
wt rm                          # remove current worktree + branch
wt purge --branches            # clean up stale metadata + orphaned branches
```

## Configuration

Create `~/.wtrc` (JSON, all fields optional):

```json
{
  "default_branch": "dev",
  "base_dir": "~/code_trees",
  "owner": "stabai",
  "agent_prefixes": ["claude/", "devin/"]
}
```

## Documentation

Full user guide: **[stabai.github.io/wt-cli](https://stabai.github.io/wt-cli/)**

- [Getting Started](https://stabai.github.io/wt-cli/getting-started) — installation, shell setup, and worktree layout
- [Commands](https://stabai.github.io/wt-cli/commands) — complete reference for every subcommand
- [Configuration](https://stabai.github.io/wt-cli/configuration) — all `~/.wtrc` options
- [Shell Integration](https://stabai.github.io/wt-cli/shell-integration) — how the cd protocol works
- [Completions](https://stabai.github.io/wt-cli/completions) — tab completion and branch grouping

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Setup

```bash
bun install
```

### Run from source

```bash
bun run src/index.ts --help
bun run src/index.ts ls --status
```

### Test

```bash
bun test
```

Tests cover:
- **Branch classification logic** — pure unit tests for the grouping algorithm
- **Config parsing** — various `~/.wtrc` contents including edge cases
- **Git helpers** — integration tests against a real temporary git repo
- **CLI smoke tests** — subprocess tests for subcommands and completion scripts

### Build

```bash
bun run build                    # compile to ./wt (local dev)
bun run install-cli              # compile + install to ~/.local/bin/wt
bun run install-cli /usr/local/bin  # custom install directory
```

### Project structure

```
src/
  index.ts              # entrypoint, registers subcommands
  config.ts             # loads ~/.wtrc
  git.ts                # all git subprocess calls
  commands/
    add.ts              # wt add
    checkout.ts         # wt checkout / wt switch
    cd.ts               # wt cd
    ls.ts               # wt ls
    rm.ts               # wt rm
    purge.ts            # wt purge
    completion.ts       # wt completion
tests/
  classify-branch.test.ts
  config.test.ts
  git-integration.test.ts
  cli.test.ts
docs/                   # user guide (VitePress → GitHub Pages)
```

## Contributing

1. Fork and clone
2. `bun install`
3. Make changes
4. `bun test` — all tests must pass
5. Open a PR

### Guidelines

- All user-visible output goes to **stderr**; stdout is reserved for the cd protocol (paths that the shell wrapper acts on).
- Use `@clack/prompts` for interactive UI and `picocolors` for colors.
- Git commands go through helpers in `src/git.ts` using Bun's `$` shell template literal.
- Format strings containing `%(...)` must be passed as variables to `$` template literals to avoid Bun shell parsing issues.
- **No bash scripts.** Friends don't let friends write bash scripts. All scripts live in `scripts/` as TypeScript and run with `bun`.
- **Keep tests and docs current.** New features and behavior changes should include corresponding test coverage and documentation updates. CI will catch missing tests; reviewers will catch missing docs.

## License

MIT
