# Shell Completions

`wt` provides tab completions for zsh, bash, and fish. Completions are context-aware — different subcommands complete different sets of branches.

## Setup

```bash
# zsh — add to .zshrc
source <(command wt completion zsh)

# bash — add to .bashrc
eval "$(command wt completion bash)"

# fish — add to config.fish
command wt completion fish | source
```

## What Gets Completed

| Context | Completes |
|---|---|
| `wt cd <TAB>` | All branches with worktrees, plus other known branches |
| `wt add <TAB>` | All local + recent remote branches |
| `wt checkout <TAB>` / `wt switch <TAB>` | Branches that exist but have no worktree yet |
| `wt rm <TAB>` | Branches that currently have worktrees |
| `wt completion <TAB>` | `zsh`, `bash`, `fish` |

## Branch Grouping

Completions group branches to surface the most relevant ones first:

1. **Your branches** — prefix matches `{owner}/` (e.g., `stabai/my-feature`)
2. **Your agent branches** — prefix matches an `agent_prefixes` entry AND the last commit was authored by your email
3. **Active worktrees** — any branch currently checked out in a worktree
4. **Remote-only branches** — on `origin` but not checked out locally

Configure `owner` and `agent_prefixes` in [~/.wtrc](./configuration.md) to enable grouping.

## How It Works

The completion scripts use a two-level approach:

1. `wt completion <shell>` generates a **static shell script** that you source once.
2. At completion time, the script calls `wt --complete <type>` to get a **dynamic branch list**.

This means the branch list is always current without needing to regenerate the completion script. The `--complete` flag is an internal interface used only by the completion scripts.
