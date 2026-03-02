---
title: Configuration
nav_order: 3
---

# Configuration

`wt` reads configuration from `~/.wtrc`, a JSON file. All fields are optional.

## Example

```json
{
  "default_branch": "dev",
  "base_dir": "~/code_trees",
  "owner": "stabai",
  "agent_prefixes": ["claude/", "devin/", "copilot/"]
}
```

## Fields

### `default_branch`

**Default:** `"dev"`

The base branch used by `wt add` when no base is specified, and by `wt cd` with no arguments (goes to repo root). Also used by `wt rm` to check whether a branch has unmerged commits.

```json
{ "default_branch": "main" }
```

### `base_dir`

**Default:** `<repo-parent>/<repo-name>_trees`

The directory where worktree directories are created. Supports `~` expansion.

If not set, `wt` creates a sibling directory next to your repo. For example, if your repo is at `~/code/my-project`, worktrees go in `~/code/my-project_trees/`.

```json
{ "base_dir": "~/code_trees" }
```

### `owner`

**Default:** value of `git config user.name`

Your username, used to identify your personal branches in shell completions. Branches prefixed with `{owner}/` are grouped first.

```json
{ "owner": "stabai" }
```

### `agent_prefixes`

**Default:** `[]`

Branch prefixes used by AI coding agents. Branches matching these prefixes are grouped separately in completions when the last committer email matches yours (indicating you kicked off the agent session).

```json
{ "agent_prefixes": ["claude/", "devin/", "copilot/"] }
```

## Migration from Shell Version

If you were previously using the `.zsh_worktrees` shell functions, move these environment variables to `~/.wtrc`:

| Old env var | New config field |
|---|---|
| `WORKTREE_BASE_DIR` | `base_dir` |
| `WORKTREE_DEFAULT_BRANCH` | `default_branch` |

The environment variables are no longer read.
