---
title: Shell Integration
nav_order: 4
---

# Shell Integration

## The cd Problem

A compiled binary can't change the parent shell's working directory — it runs in a child process. `wt` solves this with a lightweight protocol between the binary and a shell wrapper function.

## How It Works

1. **All user-visible output** (prompts, status messages, errors) goes to **stderr**. This keeps stdout clean for the protocol.
2. **When a directory change is needed**, the binary prints the target path to **stdout** and exits 0.
3. **The shell wrapper** captures stdout and `cd`s into it if non-empty.

This means `@clack/prompts` interactive UI works normally (it writes to stderr/TTY), and the wrapper reliably gets the cd target from stdout.

## Shell Wrapper

Add this to your `.zshrc` or `.bashrc`:

```bash
wt() {
  local cd_target
  cd_target=$(command wt "$@")
  local exit_code=$?
  [[ $exit_code -ne 0 ]] && return $exit_code
  [[ -n "$cd_target" ]] && cd "$cd_target"
}
```

### How the wrapper works

- `command wt "$@"` runs the actual binary (bypassing the function itself).
- `cd_target=$(...)` captures stdout into a variable.
- stderr passes through to your terminal normally — you see all prompts and log messages.
- If the binary exits non-zero, the wrapper returns the same exit code.
- If stdout is non-empty, the wrapper cd's into the path.

## Which Commands Produce cd Targets

| Command | Outputs to stdout? | When? |
|---|---|---|
| `wt add` | Yes | Path to new worktree (unless `--no-cd`) |
| `wt checkout` / `switch` | Yes | Path to new worktree (unless `--no-cd`) |
| `wt cd` | Yes | Path to worktree or repo root |
| `wt rm` | Yes | Repo root (only if cwd was inside removed worktree) |
| `wt ls` | No | Output goes to stderr |
| `wt purge` | No | Output goes to stderr |
| `wt completion` | Yes | Completion script (not a cd target — used with `source`) |

## Fish Shell

Fish uses a slightly different syntax:

```fish
function wt
  set -l cd_target (command wt $argv)
  set -l exit_code $status
  if test $exit_code -ne 0
    return $exit_code
  end
  if test -n "$cd_target"
    cd $cd_target
  end
end
```
