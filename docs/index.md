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

## Quick Start

### Install

```bash
git clone https://github.com/stabai/wt-cli.git
cd wt-cli
bun run install-cli
```

This compiles the binary to `~/.local/bin/wt`. Make sure `~/.local/bin` is in your `PATH`.

### Shell Wrapper

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

### Shell Completions

```bash
# zsh (add to .zshrc)
source <(command wt completion zsh)

# bash (add to .bashrc)
eval "$(command wt completion bash)"

# fish (add to config.fish)
command wt completion fish | source
```

---

## Next Steps

- [Commands](./commands.md) — full reference for every subcommand
- [Configuration](./configuration.md) — customize defaults with `~/.wtrc`
- [Shell Integration](./shell-integration.md) — how the cd protocol works
- [Completions](./completions.md) — branch grouping and tab completion
