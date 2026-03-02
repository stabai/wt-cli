import { defineCommand } from "citty";

const ZSH_COMPLETION = `\
#compdef wt

_wt() {
  local -a subcommands
  subcommands=(
    'add:Create a new worktree with a new branch'
    'checkout:Create a new worktree for an existing branch'
    'switch:Create a new worktree for an existing branch'
    'cd:Change to a worktree directory'
    'ls:List all worktrees'
    'rm:Remove a worktree and its branch'
    'purge:Clean up stale worktree and branch metadata'
    'completion:Output shell completion script'
  )

  _arguments -C \\
    '1:subcommand:->subcmd' \\
    '*::arg:->args'

  case $state in
    subcmd)
      _describe 'subcommand' subcommands
      ;;
    args)
      case $words[1] in
        add)
          _arguments \\
            '1:branch:->branches' \\
            '2:base branch:->branches' \\
            '--no-cd[Do not cd after creation]'
          ;;
        checkout|switch)
          _arguments \\
            '1:branch:->branches' \\
            '--no-cd[Do not cd after creation]'
          ;;
        cd)
          _arguments '1:branch:->branches'
          ;;
        rm)
          _arguments \\
            '1:branch:->wt_branches' \\
            '-f[Force removal]' \\
            '--keep-branch[Keep the local branch]'
          ;;
        ls)
          _arguments '--status[Show status badges]'
          ;;
        purge)
          _arguments '--branches[Also clean up branches with gone upstream]'
          ;;
        completion)
          _arguments '1:shell:(zsh bash fish)'
          ;;
      esac

      case $state in
        branches)
          local -a branches
          branches=(\${(f)"$(command wt --complete branches 2>/dev/null)"})
          _describe 'branch' branches
          ;;
        wt_branches)
          local -a branches
          branches=(\${(f)"$(command wt --complete worktree-branches 2>/dev/null)"})
          _describe 'branch' branches
          ;;
      esac
      ;;
  esac
}

_wt "$@"`;

const BASH_COMPLETION = `\
_wt() {
  local cur prev subcmd
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  subcmd="\${COMP_WORDS[1]}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "add checkout switch cd ls rm purge completion" -- "\${cur}") )
    return 0
  fi

  case "\${subcmd}" in
    add|checkout|switch|cd)
      local branches
      branches="$(command wt --complete branches 2>/dev/null)"
      COMPREPLY=( $(compgen -W "\${branches}" -- "\${cur}") )
      ;;
    rm)
      local branches
      branches="$(command wt --complete worktree-branches 2>/dev/null)"
      COMPREPLY=( $(compgen -W "\${branches}" -- "\${cur}") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "zsh bash fish" -- "\${cur}") )
      ;;
  esac
}

complete -F _wt wt`;

const FISH_COMPLETION = `\
# Disable file completions for wt
complete -c wt -f

# Subcommands
complete -c wt -n '__fish_use_subcommand' -a 'add' -d 'Create a new worktree with a new branch'
complete -c wt -n '__fish_use_subcommand' -a 'checkout' -d 'Create a new worktree for an existing branch'
complete -c wt -n '__fish_use_subcommand' -a 'switch' -d 'Create a new worktree for an existing branch'
complete -c wt -n '__fish_use_subcommand' -a 'cd' -d 'Change to a worktree directory'
complete -c wt -n '__fish_use_subcommand' -a 'ls' -d 'List all worktrees'
complete -c wt -n '__fish_use_subcommand' -a 'rm' -d 'Remove a worktree and its branch'
complete -c wt -n '__fish_use_subcommand' -a 'purge' -d 'Clean up stale worktree and branch metadata'
complete -c wt -n '__fish_use_subcommand' -a 'completion' -d 'Output shell completion script'

# Branch completions
complete -c wt -n '__fish_seen_subcommand_from add checkout switch cd' -a '(command wt --complete branches 2>/dev/null)'
complete -c wt -n '__fish_seen_subcommand_from rm' -a '(command wt --complete worktree-branches 2>/dev/null)'

# completion subcommand
complete -c wt -n '__fish_seen_subcommand_from completion' -a 'zsh bash fish'

# Flags
complete -c wt -n '__fish_seen_subcommand_from add checkout switch' -l 'no-cd' -d 'Do not cd after creation'
complete -c wt -n '__fish_seen_subcommand_from rm' -s 'f' -d 'Force removal'
complete -c wt -n '__fish_seen_subcommand_from rm' -l 'keep-branch' -d 'Keep the local branch'
complete -c wt -n '__fish_seen_subcommand_from ls' -l 'status' -d 'Show status badges'
complete -c wt -n '__fish_seen_subcommand_from purge' -l 'branches' -d 'Also clean up branches with gone upstream'`;

export default defineCommand({
  meta: {
    name: "completion",
    description: "Output shell completion script",
  },
  args: {
    shell: {
      type: "positional",
      description: "Shell to generate completions for (zsh, bash, fish)",
      required: true,
    },
  },
  async run({ args }) {
    const shell = args.shell as string;

    switch (shell) {
      case "zsh":
        process.stdout.write(ZSH_COMPLETION);
        break;
      case "bash":
        process.stdout.write(BASH_COMPLETION);
        break;
      case "fish":
        process.stdout.write(FISH_COMPLETION);
        break;
      default:
        console.error(
          `Unsupported shell: ${shell}. Supported: zsh, bash, fish`,
        );
        process.exit(1);
    }
  },
});
