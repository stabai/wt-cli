---
title: Home
nav_order: 1
---

# wt — Git Worktree Manager

`wt` is a CLI tool that makes working with [git worktrees](https://git-scm.com/docs/git-worktree) fast and ergonomic. It handles branch creation, directory management, and cleanup so you can switch between tasks without stashing or losing context.

Built with [Bun](https://bun.sh), compiled to a single binary.

## Why worktrees?

With regular git branching, switching branches means stashing changes, rebuilding, and hoping nothing breaks. Worktrees give each branch its own directory, so you can:

- Work on a feature while a CI build runs on another branch
- Review a PR without leaving your current work
- Keep multiple long-running branches alive without conflict

`wt` removes the friction of managing worktree directories by hand.

---

## Arranging your worktrees

Git worktrees work best when each worktree directory lives **outside** the main repo folder, as a sibling. This avoids nested `.git` confusion and keeps your filesystem clean.

### Recommended layout

```
~/code/
  my-project/              # main repo (bare or regular checkout)
  my-project_trees/        # worktrees live here
    stabai/my-feature/     # one directory per branch
    stabai/bugfix-auth/
    claude/refactor-cli/
```

The `_trees` sibling directory keeps worktrees colocated with the repo they belong to without nesting them inside it. This is `wt`'s default behavior — if your repo is at `~/code/my-project`, worktrees go in `~/code/my-project_trees/`.

### Why not inside the repo?

Placing worktrees inside the main checkout causes problems:

- Nested git directories confuse editors and tools
- File watchers (webpack, vite, tsc) may pick up worktree files
- `git status` and `git clean` can stumble on the nested checkouts

### Custom worktree location

If you prefer a different layout (e.g., a single directory for all projects), set `base_dir` in `~/.wtrc`:

```json
{
  "base_dir": "~/worktrees"
}
```

This produces:

```
~/worktrees/
  stabai/my-feature/
  stabai/bugfix-auth/
~/code/
  my-project/
```

See [Configuration](./configuration.md) for all options.

### Telling `wt` about your setup

`wt` works out of the box with zero configuration — it detects your repo location and creates the `_trees` sibling directory automatically. But you can customize its behavior with `~/.wtrc`:

```json
{
  "default_branch": "main",
  "owner": "your-username",
  "agent_prefixes": ["claude/", "devin/"]
}
```

- **`default_branch`** — the branch `wt add` creates new branches from (default: `"dev"`)
- **`base_dir`** — override where worktree directories are created
- **`owner`** — your username, for grouping your branches first in tab completions
- **`agent_prefixes`** — prefixes used by AI coding agents, for grouping their branches in completions

---

## Quick start

### Install

```bash
git clone https://github.com/stabai/wt-cli.git
cd wt-cli
bun run install-cli
```

This compiles the binary to `~/.local/bin/wt`. Make sure `~/.local/bin` is in your `PATH`.

### Shell wrapper

Add this to your `.zshrc` or `.bashrc` — it lets `wt` change your shell's working directory:

```bash
wt() {
  local cd_target
  cd_target=$(command wt "$@")
  local exit_code=$?
  [[ $exit_code -ne 0 ]] && return $exit_code
  [[ -n "$cd_target" ]] && cd "$cd_target"
}
```

### Shell completions

```bash
# zsh (add to .zshrc)
source <(command wt completion zsh)

# bash (add to .bashrc)
eval "$(command wt completion bash)"

# fish (add to config.fish)
command wt completion fish | source
```

---

## Next steps

- [Commands](./commands.md) — full reference for every subcommand
- [Configuration](./configuration.md) — customize defaults with `~/.wtrc`
- [Shell Integration](./shell-integration.md) — how the cd protocol works
- [Completions](./completions.md) — branch grouping and tab completion
