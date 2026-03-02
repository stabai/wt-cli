---
title: Commands
nav_order: 2
---

# Commands

## `wt add <branch> [base] [--no-cd]`

Creates a new worktree with a **new branch**.

| Argument | Description |
|---|---|
| `branch` | Name of the new branch to create |
| `base` | Branch to create from (defaults to `default_branch` from config) |
| `--no-cd` | Don't change directory after creation |

**Behavior:**
- If the branch already exists locally, `wt add` will error and suggest using `wt checkout` instead.
- If a worktree already exists for this branch, skips creation and just cd's into it.
- Outputs the new worktree path to stdout (triggers cd via the shell wrapper).

```bash
wt add stabai/my-feature        # branch from dev (default)
wt add stabai/my-feature main   # branch from main
wt add stabai/my-feature --no-cd
```

---

## `wt checkout <branch> [--no-cd]`

Creates a new worktree for an **existing branch** (local or remote).

Alias: `wt switch`

| Argument | Description |
|---|---|
| `branch` | Existing branch to check out |
| `--no-cd` | Don't change directory after creation |

```bash
wt checkout stabai/existing-feature
wt switch stabai/existing-feature   # same thing
```

---

## `wt cd [branch]`

Changes to a worktree directory. This is the primary navigation command.

| Argument | Description |
|---|---|
| `branch` | Branch whose worktree to cd into (optional) |

**Behavior:**
- **No argument** — cd to the main repo root.
- **Branch has a worktree** — cd into it.
- **Branch exists but no worktree** — prompts to check it out:
  ```
  ◆ Branch 'stabai/my-feature' exists but has no worktree.
  ● Check it out as a new worktree
  ○ Quit
  ```
- **Branch doesn't exist** — prompts to create it:
  ```
  ◆ No branch 'stabai/my-feature' found locally or on origin.
  ● Create a new branch from dev
  ○ Quit
  ```

```bash
wt cd                        # go to repo root
wt cd stabai/my-feature      # go to that worktree
```

---

## `wt ls [--status]`

Lists all worktrees.

| Flag | Description |
|---|---|
| `--status` | Show status badges for each worktree |

**Status badges:**
- `[clean]` — no uncommitted changes, no unpushed commits
- `[dirty]` — uncommitted/staged changes or untracked files
- `[unpushed]` — clean working tree but commits not pushed upstream
- `[PRUNABLE]` — worktree directory is gone, metadata can be pruned

```bash
wt ls
wt ls --status
```

---

## `wt rm [branch] [-f] [--keep-branch]`

Removes a worktree and (by default) deletes its local branch.

| Argument | Description |
|---|---|
| `branch` | Branch whose worktree to remove (defaults to current) |
| `-f` | Force — skip all confirmation prompts |
| `--keep-branch` | Keep the local branch after removing the worktree |

**Worktree removal:**
- If the worktree has uncommitted changes or unpushed commits, prompts for confirmation (skipped with `-f`).
- If you're inside the worktree being removed, cd's to the repo root.

**Branch cleanup:**
- After removing the worktree, deletes the local branch and its remote tracking ref.
- If the branch has unmerged commits, prompts before deleting (skipped with `-f`).
- Does **not** delete the remote branch on origin — that's typically handled by the hosting provider after merge.
- Use `--keep-branch` to skip branch cleanup entirely.

```bash
wt rm                          # remove current worktree
wt rm stabai/old-feature       # remove specific worktree
wt rm stabai/old-feature -f    # force, no prompts
wt rm --keep-branch            # remove worktree, keep branch
```

---

## `wt purge [--branches]`

Cleans up stale metadata.

| Flag | Description |
|---|---|
| `--branches` | Also scan for local branches with deleted upstream tracking refs |

**Without `--branches`:** Runs `git worktree prune` to clean up metadata for worktree directories that were deleted outside of `wt rm`.

**With `--branches`:** Also finds local branches whose remote tracking branch is gone (e.g., deleted on origin after a PR merge). Presents a multi-select list:

```
◆ Found local branches with deleted upstream tracking refs:
◻ stabai/old-feature (upstream gone)
◻ claude/refactor-auth (upstream gone)
```

```bash
wt purge                # prune stale worktree metadata
wt purge --branches     # also clean up orphaned branches
```

---

## `wt completion <shell>`

Outputs a shell completion script.

| Argument | Description |
|---|---|
| `shell` | `zsh`, `bash`, or `fish` |

See [Completions](./completions.md) for setup details.
