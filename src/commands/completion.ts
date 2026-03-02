import { defineCommand } from "citty";

// ---------------------------------------------------------------------------
// Completion spec — single source of truth for all shell completion scripts.
//
// To add a new subcommand or flag, edit this spec. The shell-specific
// generators below will pick up the changes automatically.
// ---------------------------------------------------------------------------

type CompletionType = "branches" | "worktree-branches" | "shells";

interface FlagSpec {
  /** The flag name without leading dashes (e.g. "no-cd", "f"). Single char = short flag. */
  name: string;
  description: string;
}

interface ArgSpec {
  /** What kind of completions to offer for this argument position. */
  completionType: CompletionType;
}

interface SubcommandSpec {
  name: string;
  /** Additional names that invoke the same subcommand (e.g. "switch" for "checkout"). */
  aliases?: string[];
  description: string;
  /** Positional arguments, in order. */
  args?: ArgSpec[];
  flags?: FlagSpec[];
}

const SUBCOMMANDS: SubcommandSpec[] = [
  {
    name: "add",
    description: "Create a new worktree with a new branch",
    args: [
      { completionType: "branches" },
      { completionType: "branches" },
    ],
    flags: [
      { name: "no-cd", description: "Do not cd after creation" },
    ],
  },
  {
    name: "checkout",
    aliases: ["switch"],
    description: "Create a new worktree for an existing branch",
    args: [{ completionType: "branches" }],
    flags: [
      { name: "no-cd", description: "Do not cd after creation" },
    ],
  },
  {
    name: "cd",
    description: "Change to a worktree directory",
    args: [{ completionType: "branches" }],
  },
  {
    name: "ls",
    description: "List all worktrees",
    flags: [
      { name: "status", description: "Show status badges" },
    ],
  },
  {
    name: "rm",
    description: "Remove a worktree and its branch",
    args: [{ completionType: "worktree-branches" }],
    flags: [
      { name: "f", description: "Force removal" },
      { name: "keep-branch", description: "Keep the local branch" },
    ],
  },
  {
    name: "purge",
    description: "Clean up stale worktree and branch metadata",
    flags: [
      { name: "branches", description: "Also clean up branches with gone upstream" },
    ],
  },
  {
    name: "completion",
    description: "Output shell completion script",
    args: [{ completionType: "shells" }],
  },
];

/** All names including aliases, for the top-level subcommand list. */
function allNames(cmd: SubcommandSpec): string[] {
  return [cmd.name, ...(cmd.aliases ?? [])];
}

// ---------------------------------------------------------------------------
// The --complete flag (handled in src/index.ts) returns branch lists at
// runtime. The completion type maps to the argument passed:
//
//   "branches"           →  wt --complete branches
//   "worktree-branches"  →  wt --complete worktree-branches
//   "shells"             →  static list: zsh bash fish
// ---------------------------------------------------------------------------

/** zsh completion state name for a given completion type. */
function zshState(type: CompletionType): string {
  switch (type) {
    case "branches": return "branches";
    case "worktree-branches": return "wt_branches";
    case "shells": return "shells";
  }
}

// ---------------------------------------------------------------------------
// Zsh generator
//
// Uses _arguments for positional + flag parsing, and _describe for dynamic
// branch lists fetched via `wt --complete`.
// ---------------------------------------------------------------------------

function generateZsh(): string {
  const lines: string[] = ["#compdef wt", "", "_wt() {"];

  // Subcommand list
  lines.push("  local -a subcommands");
  lines.push("  subcommands=(");
  for (const cmd of SUBCOMMANDS) {
    for (const name of allNames(cmd)) {
      lines.push(`    '${name}:${cmd.description}'`);
    }
  }
  lines.push("  )", "");

  // Top-level argument dispatch
  lines.push("  _arguments -C \\");
  lines.push("    '1:subcommand:->subcmd' \\");
  lines.push("    '*::arg:->args'", "");

  lines.push("  case $state in");
  lines.push("    subcmd)");
  lines.push("      _describe 'subcommand' subcommands");
  lines.push("      ;;");
  lines.push("    args)");

  // Per-subcommand arguments
  lines.push("      case $words[1] in");
  for (const cmd of SUBCOMMANDS) {
    const names = allNames(cmd).join("|");
    lines.push(`        ${names})`);

    const argParts: string[] = [];
    for (let i = 0; i < (cmd.args?.length ?? 0); i++) {
      const arg = cmd.args![i];
      argParts.push(`'${i + 1}:${arg.completionType}:->${zshState(arg.completionType)}'`);
    }
    for (const flag of cmd.flags ?? []) {
      if (flag.name.length === 1) {
        argParts.push(`'-${flag.name}[${flag.description}]'`);
      } else {
        argParts.push(`'--${flag.name}[${flag.description}]'`);
      }
    }

    if (argParts.length === 1) {
      lines.push(`          _arguments ${argParts[0]}`);
    } else if (argParts.length > 1) {
      lines.push("          _arguments \\");
      for (let i = 0; i < argParts.length; i++) {
        const suffix = i < argParts.length - 1 ? " \\" : "";
        lines.push(`            ${argParts[i]}${suffix}`);
      }
    }

    lines.push("          ;;");
  }
  lines.push("      esac", "");

  // Dynamic completion states
  lines.push("      case $state in");
  lines.push("        branches)");
  lines.push("          local -a branches");
  lines.push(`          branches=(\${(f)"$(command wt --complete branches 2>/dev/null)"})`);
  lines.push("          _describe 'branch' branches");
  lines.push("          ;;");
  lines.push("        wt_branches)");
  lines.push("          local -a branches");
  lines.push(`          branches=(\${(f)"$(command wt --complete worktree-branches 2>/dev/null)"})`);
  lines.push("          _describe 'branch' branches");
  lines.push("          ;;");
  lines.push("        shells)");
  lines.push("          _arguments '1:shell:(zsh bash fish)'");
  lines.push("          ;;");
  lines.push("      esac");
  lines.push("      ;;");
  lines.push("  esac");
  lines.push("}", "");
  lines.push(`_wt "$@"`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Bash generator
//
// Uses compgen -W for word lists. Simpler than zsh — no argument position
// tracking, just matches the current word against the right list.
// ---------------------------------------------------------------------------

function generateBash(): string {
  const allSubcmdNames = SUBCOMMANDS.flatMap(allNames);
  const lines: string[] = [];

  lines.push("_wt() {");
  lines.push("  local cur prev subcmd");
  lines.push("  COMPREPLY=()");
  lines.push(`  cur="\${COMP_WORDS[COMP_CWORD]}"`);
  lines.push(`  prev="\${COMP_WORDS[COMP_CWORD-1]}"`);
  lines.push(`  subcmd="\${COMP_WORDS[1]}"`);
  lines.push("");

  // First word: subcommand name
  lines.push("  if [[ ${COMP_CWORD} -eq 1 ]]; then");
  lines.push(`    COMPREPLY=( $(compgen -W "${allSubcmdNames.join(" ")}" -- "\${cur}") )`);
  lines.push("    return 0");
  lines.push("  fi", "");

  // Per-subcommand completions
  lines.push(`  case "\${subcmd}" in`);

  // Group commands by completion type for cleaner output
  const branchCmds: string[] = [];
  const wtBranchCmds: string[] = [];
  const shellCmds: string[] = [];
  for (const cmd of SUBCOMMANDS) {
    const names = allNames(cmd);
    const type = cmd.args?.[0]?.completionType;
    if (type === "branches") branchCmds.push(...names);
    else if (type === "worktree-branches") wtBranchCmds.push(...names);
    else if (type === "shells") shellCmds.push(...names);
  }

  if (branchCmds.length) {
    lines.push(`    ${branchCmds.join("|")})`);
    lines.push("      local branches");
    lines.push(`      branches="$(command wt --complete branches 2>/dev/null)"`);
    lines.push(`      COMPREPLY=( $(compgen -W "\${branches}" -- "\${cur}") )`);
    lines.push("      ;;");
  }
  if (wtBranchCmds.length) {
    lines.push(`    ${wtBranchCmds.join("|")})`);
    lines.push("      local branches");
    lines.push(`      branches="$(command wt --complete worktree-branches 2>/dev/null)"`);
    lines.push(`      COMPREPLY=( $(compgen -W "\${branches}" -- "\${cur}") )`);
    lines.push("      ;;");
  }
  if (shellCmds.length) {
    lines.push(`    ${shellCmds.join("|")})`);
    lines.push(`      COMPREPLY=( $(compgen -W "zsh bash fish" -- "\${cur}") )`);
    lines.push("      ;;");
  }

  lines.push("  esac");
  lines.push("}", "");
  lines.push("complete -F _wt wt");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Fish generator
//
// Uses `complete -c wt` directives. Fish checks conditions via
// __fish_use_subcommand and __fish_seen_subcommand_from.
// ---------------------------------------------------------------------------

function generateFish(): string {
  const lines: string[] = [
    "# Disable file completions for wt",
    "complete -c wt -f",
    "",
    "# Subcommands",
  ];

  for (const cmd of SUBCOMMANDS) {
    for (const name of allNames(cmd)) {
      lines.push(
        `complete -c wt -n '__fish_use_subcommand' -a '${name}' -d '${cmd.description}'`,
      );
    }
  }

  // Branch completions
  lines.push("", "# Branch completions");
  const branchCmds = SUBCOMMANDS.filter(
    (c) => c.args?.[0]?.completionType === "branches",
  ).flatMap(allNames);
  if (branchCmds.length) {
    lines.push(
      `complete -c wt -n '__fish_seen_subcommand_from ${branchCmds.join(" ")}' -a '(command wt --complete branches 2>/dev/null)'`,
    );
  }

  const wtBranchCmds = SUBCOMMANDS.filter(
    (c) => c.args?.[0]?.completionType === "worktree-branches",
  ).flatMap(allNames);
  if (wtBranchCmds.length) {
    lines.push(
      `complete -c wt -n '__fish_seen_subcommand_from ${wtBranchCmds.join(" ")}' -a '(command wt --complete worktree-branches 2>/dev/null)'`,
    );
  }

  // Shell completions
  const shellCmds = SUBCOMMANDS.filter(
    (c) => c.args?.[0]?.completionType === "shells",
  ).flatMap(allNames);
  if (shellCmds.length) {
    lines.push("", "# completion subcommand");
    lines.push(
      `complete -c wt -n '__fish_seen_subcommand_from ${shellCmds.join(" ")}' -a 'zsh bash fish'`,
    );
  }

  // Flags
  const flagCmds = SUBCOMMANDS.filter((c) => c.flags?.length);
  if (flagCmds.length) {
    lines.push("", "# Flags");
    for (const cmd of flagCmds) {
      const names = allNames(cmd).join(" ");
      for (const flag of cmd.flags!) {
        if (flag.name.length === 1) {
          lines.push(
            `complete -c wt -n '__fish_seen_subcommand_from ${names}' -s '${flag.name}' -d '${flag.description}'`,
          );
        } else {
          lines.push(
            `complete -c wt -n '__fish_seen_subcommand_from ${names}' -l '${flag.name}' -d '${flag.description}'`,
          );
        }
      }
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

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
        process.stdout.write(generateZsh());
        break;
      case "bash":
        process.stdout.write(generateBash());
        break;
      case "fish":
        process.stdout.write(generateFish());
        break;
      default:
        console.error(
          `Unsupported shell: ${shell}. Supported: zsh, bash, fish`,
        );
        process.exit(1);
    }
  },
});
