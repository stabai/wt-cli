# Getting Started

## Why worktrees?

With regular git branching, switching branches means stashing changes, rebuilding, and hoping nothing breaks. Worktrees give each branch its own directory, so you can:

- Work on a feature while a CI build runs on another branch
- Review a PR without leaving your current work
- Keep multiple long-running branches alive without conflict

`wt` removes the friction of managing worktree directories by hand.

## Install

```bash
git clone https://github.com/stabai/wt-cli.git
cd wt-cli
bun run install-cli
```

This compiles the binary to `~/.local/bin/wt`. Make sure `~/.local/bin` is in your `PATH`.

## Shell Wrapper

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

## Shell Completions

```bash
# zsh (add to .zshrc)
source <(command wt completion zsh)

# bash (add to .bashrc)
eval "$(command wt completion bash)"

# fish (add to config.fish)
command wt completion fish | source
```

## Arranging your worktrees

The key to a clean worktree setup is keeping worktree directories **outside** of your main repo folder, as siblings in the same parent directory. This avoids nesting repos inside each other and keeps your file tree easy to navigate.

### Recommended layout

```
~/code/
  my-project/              # main repo (bare or regular checkout)
  my-project_trees/        # worktree directory (created by wt)
    stabai/my-feature/     # one directory per branch
    stabai/bugfix-login/
    main/
```

This is the default behavior — `wt` automatically creates a `_trees` sibling directory next to your repo. If your repo is at `~/code/my-project`, worktrees are created under `~/code/my-project_trees/`.

### Custom worktree location

If you want worktrees stored somewhere else, set `base_dir` in your `~/.wtrc` config file:

```json
{
  "base_dir": "~/worktrees"
}
```

You can also configure other defaults like which branch `wt add` branches from and your username for branch grouping in completions:

```json
{
  "default_branch": "main",
  "base_dir": "~/worktrees",
  "owner": "stabai",
  "agent_prefixes": ["claude/", "devin/"]
}
```

See [Configuration](./configuration.md) for full details on every option.

## Next Steps

- [Commands](./commands.md) — full reference for every subcommand
- [Configuration](./configuration.md) — customize defaults with `~/.wtrc`
- [Shell Integration](./shell-integration.md) — how the cd protocol works
- [Completions](./completions.md) — branch grouping and tab completion
