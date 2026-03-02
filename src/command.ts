/**
 * Wrapper around citty's defineCommand that adds completion metadata.
 *
 * Every positional arg must declare a `completionType` so the shell
 * completion generators know what to offer (branches, worktree-branches,
 * or a static list like shells). This is enforced at the type level —
 * if you forget it, TypeScript will complain.
 *
 * Usage:
 *   export default defineWtCommand({
 *     meta: { name: "add", description: "..." },
 *     args: {
 *       branch: { type: "positional", completionType: "branches", ... },
 *       "no-cd": { type: "boolean", ... },
 *     },
 *     run({ args }) { ... },
 *   });
 */

import type { ArgsDef, CommandDef } from "citty";
import { defineCommand } from "citty";

export type CompletionType = "branches" | "worktree-branches" | "shells";

/** A positional arg definition with a required completionType. */
export interface WtPositionalArg {
  type: "positional";
  completionType: CompletionType;
  description?: string;
  required?: boolean;
  default?: string;
}

/** A boolean flag — same as citty, no extra fields. */
export interface WtBooleanArg {
  type: "boolean";
  description?: string;
  default?: boolean;
}

export type WtArgDef = WtPositionalArg | WtBooleanArg;
export type WtArgsDef = Record<string, WtArgDef>;

export interface WtCommandDef {
  meta: { name: string; description: string };
  args?: WtArgsDef;
  run: CommandDef["run"];
}

/**
 * A command created by defineWtCommand. Extends citty's CommandDef with
 * our completion metadata and a non-optional meta field.
 */
export interface WtCommand extends CommandDef {
  meta: { name: string; description: string };
  _wtArgs: WtArgsDef;
}

/**
 * Define a wt subcommand. Wraps citty's defineCommand but requires
 * completionType on positional args.
 *
 * Returns a WtCommand — the citty command with a `_wtArgs` property
 * that the completion generator reads for introspection.
 */
export function defineWtCommand(def: WtCommandDef): WtCommand {
  // Strip completionType before passing to citty (it doesn't know about it)
  const cittyArgs: ArgsDef = {};
  if (def.args) {
    for (const [name, arg] of Object.entries(def.args)) {
      if (arg.type === "positional") {
        const { completionType, ...rest } = arg;
        cittyArgs[name] = rest;
      } else {
        cittyArgs[name] = arg;
      }
    }
  }

  const cmd = defineCommand({
    meta: def.meta,
    args: cittyArgs,
    run: def.run,
  });

  return {
    ...cmd,
    meta: def.meta,
    _wtArgs: def.args ?? {},
  };
}

/**
 * Read completion metadata from a command created by defineWtCommand.
 */
export function getWtArgs(cmd: WtCommand): WtArgsDef {
  return cmd._wtArgs;
}
