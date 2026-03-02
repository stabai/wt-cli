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
import { defineCommand } from "citty";
import type { CommandDef, ArgsDef } from "citty";

export type CompletionType = "branches" | "worktree-branches" | "shells";

/** A positional arg definition with a required completionType. */
export interface WtPositionalArg {
  type: "positional";
  completionType: CompletionType;
  description?: string;
  required?: boolean;
  default?: any;
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
 * Define a wt subcommand. Wraps citty's defineCommand but requires
 * completionType on positional args.
 *
 * Returns the citty command with a `_wtArgs` property that the
 * completion generator reads for introspection.
 */
export function defineWtCommand(def: WtCommandDef) {
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

  // Attach the full arg definitions for introspection by completion.ts
  (cmd as any)._wtArgs = def.args ?? {};

  return cmd;
}

/**
 * Read completion metadata from a command created by defineWtCommand.
 */
export function getWtArgs(cmd: any): WtArgsDef {
  return cmd._wtArgs ?? {};
}
