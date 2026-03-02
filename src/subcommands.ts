/**
 * Subcommand registry — maps names to command modules.
 *
 * This is the single source of truth for which subcommands exist and
 * what names they're registered under. Both index.ts (runtime) and
 * completion.ts (shell script generation) import this.
 *
 * To add a subcommand:
 *   1. Create src/commands/<name>.ts using defineWtCommand
 *   2. Import it here and add it to the map
 */
import add from "./commands/add";
import cd from "./commands/cd";
import checkout from "./commands/checkout";
import completion from "./commands/completion";
import ls from "./commands/ls";
import purge from "./commands/purge";
import rm from "./commands/rm";

export const subCommands = {
  add,
  checkout,
  switch: checkout, // alias
  cd,
  ls,
  rm,
  purge,
  completion,
} as const;
