import { defineWtCommand, getWtArgs } from "../command";
import type { CompletionType, WtArgsDef } from "../command";

// ---------------------------------------------------------------------------
// Build the completion spec by introspecting the actual command modules.
//
// - name, description → from each command's meta (set by defineWtCommand)
// - positional completion types → from each command's _wtArgs (set by defineWtCommand)
// - flags → from each command's _wtArgs
// - aliases → detected from the subCommands registry (two keys → same object)
//
// To add a new subcommand:
//   1. Create src/commands/<name>.ts using defineWtCommand
//   2. Register it in src/subcommands.ts
// That's it — the shell completion scripts update automatically.
// ---------------------------------------------------------------------------

interface FlagSpec {
  name: string;
  description: string;
}

interface ArgSpec {
  completionType: CompletionType;
}

interface SubcommandSpec {
  name: string;
  aliases: string[];
  description: string;
  args: ArgSpec[];
  flags: FlagSpec[];
}

/**
 * Build SubcommandSpecs by inspecting the subCommands registry.
 *
 * If two registry keys point to the same command object (by reference),
 * the second is an alias of the first.
 */
function buildSpecs(): SubcommandSpec[] {
  // Dynamic require breaks the circular import chain:
  //   subcommands.ts → completion.ts → subcommands.ts
  // This is safe because buildSpecs() is called lazily (first run() call),
  // well after all modules have finished initializing.
  const { subCommands } = require("../subcommands");
  const seen = new Map<any, { name: string; aliases: string[] }>();

  for (const [key, cmd] of Object.entries(subCommands) as [string, any][]) {
    const existing = seen.get(cmd);
    if (existing) {
      existing.aliases.push(key);
    } else {
      seen.set(cmd, { name: (cmd as any).meta?.name ?? key, aliases: [] });
    }
  }

  const specs: SubcommandSpec[] = [];
  for (const [cmd, entry] of seen) {
    const wtArgs: WtArgsDef = getWtArgs(cmd);
    const args: ArgSpec[] = [];
    const flags: FlagSpec[] = [];

    for (const [name, def] of Object.entries(wtArgs)) {
      if (def.type === "positional") {
        args.push({ completionType: def.completionType });
      } else if (def.type === "boolean") {
        flags.push({ name, description: def.description ?? "" });
      }
    }

    specs.push({
      name: entry.name,
      aliases: entry.aliases,
      description: (cmd as any).meta?.description ?? "",
      args,
      flags,
    });
  }

  return specs;
}

// Lazily built on first use to avoid circular import issues
// (subcommands.ts imports completion.ts which imports subcommands.ts)
let _specs: SubcommandSpec[] | null = null;
function getSpecs(): SubcommandSpec[] {
  if (!_specs) _specs = buildSpecs();
  return _specs;
}

/** All names including aliases. */
function allNames(cmd: SubcommandSpec): string[] {
  return [cmd.name, ...cmd.aliases];
}

// ---------------------------------------------------------------------------
// The --complete flag (handled in src/index.ts) returns branch lists at
// runtime. The completion type maps to the argument passed:
//
//   "branches"           →  wt --complete branches
//   "worktree-branches"  →  wt --complete worktree-branches
//   "shells"             →  static list: zsh bash fish
// ---------------------------------------------------------------------------

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

  lines.push("  local -a subcommands");
  lines.push("  subcommands=(");
  for (const cmd of getSpecs()) {
    for (const name of allNames(cmd)) {
      lines.push(`    '${name}:${cmd.description}'`);
    }
  }
  lines.push("  )", "");

  lines.push("  _arguments -C \\");
  lines.push("    '1:subcommand:->subcmd' \\");
  lines.push("    '*::arg:->args'", "");

  lines.push("  case $state in");
  lines.push("    subcmd)");
  lines.push("      _describe 'subcommand' subcommands");
  lines.push("      ;;");
  lines.push("    args)");

  lines.push("      case $words[1] in");
  for (const cmd of getSpecs()) {
    const names = allNames(cmd).join("|");
    lines.push(`        ${names})`);

    const argParts: string[] = [];
    for (let i = 0; i < cmd.args.length; i++) {
      const arg = cmd.args[i];
      argParts.push(`'${i + 1}:${arg.completionType}:->${zshState(arg.completionType)}'`);
    }
    for (const flag of cmd.flags) {
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
  const allSubcmdNames = getSpecs().flatMap(allNames);
  const lines: string[] = [];

  lines.push("_wt() {");
  lines.push("  local cur prev subcmd");
  lines.push("  COMPREPLY=()");
  lines.push(`  cur="\${COMP_WORDS[COMP_CWORD]}"`);
  lines.push(`  prev="\${COMP_WORDS[COMP_CWORD-1]}"`);
  lines.push(`  subcmd="\${COMP_WORDS[1]}"`);
  lines.push("");

  lines.push("  if [[ ${COMP_CWORD} -eq 1 ]]; then");
  lines.push(`    COMPREPLY=( $(compgen -W "${allSubcmdNames.join(" ")}" -- "\${cur}") )`);
  lines.push("    return 0");
  lines.push("  fi", "");

  lines.push(`  case "\${subcmd}" in`);

  const branchCmds: string[] = [];
  const wtBranchCmds: string[] = [];
  const shellCmds: string[] = [];
  for (const cmd of getSpecs()) {
    const names = allNames(cmd);
    const type = cmd.args[0]?.completionType;
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

  for (const cmd of getSpecs()) {
    for (const name of allNames(cmd)) {
      lines.push(
        `complete -c wt -n '__fish_use_subcommand' -a '${name}' -d '${cmd.description}'`,
      );
    }
  }

  lines.push("", "# Branch completions");
  const branchCmds = getSpecs().filter(
    (c) => c.args[0]?.completionType === "branches",
  ).flatMap(allNames);
  if (branchCmds.length) {
    lines.push(
      `complete -c wt -n '__fish_seen_subcommand_from ${branchCmds.join(" ")}' -a '(command wt --complete branches 2>/dev/null)'`,
    );
  }

  const wtBranchCmds = getSpecs().filter(
    (c) => c.args[0]?.completionType === "worktree-branches",
  ).flatMap(allNames);
  if (wtBranchCmds.length) {
    lines.push(
      `complete -c wt -n '__fish_seen_subcommand_from ${wtBranchCmds.join(" ")}' -a '(command wt --complete worktree-branches 2>/dev/null)'`,
    );
  }

  const shellCmds = getSpecs().filter(
    (c) => c.args[0]?.completionType === "shells",
  ).flatMap(allNames);
  if (shellCmds.length) {
    lines.push("", "# completion subcommand");
    lines.push(
      `complete -c wt -n '__fish_seen_subcommand_from ${shellCmds.join(" ")}' -a 'zsh bash fish'`,
    );
  }

  const flagCmds = getSpecs().filter((c) => c.flags.length);
  if (flagCmds.length) {
    lines.push("", "# Flags");
    for (const cmd of flagCmds) {
      const names = allNames(cmd).join(" ");
      for (const flag of cmd.flags) {
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

export default defineWtCommand({
  meta: {
    name: "completion",
    description: "Output shell completion script",
  },
  args: {
    shell: {
      type: "positional",
      completionType: "shells",
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
