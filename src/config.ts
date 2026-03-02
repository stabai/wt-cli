import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

export interface WtConfig {
  default_branch: string;
  base_dir?: string;
  owner?: string;
  agent_prefixes: string[];
}

const CONFIG_PATH = resolve(homedir(), ".wtrc");

const DEFAULTS: WtConfig = {
  default_branch: "dev",
  agent_prefixes: [],
};

export function loadConfig(): WtConfig {
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    return {
      default_branch:
        typeof parsed.default_branch === "string"
          ? parsed.default_branch
          : DEFAULTS.default_branch,
      base_dir:
        typeof parsed.base_dir === "string"
          ? parsed.base_dir.replace(/^~/, homedir())
          : undefined,
      owner: typeof parsed.owner === "string" ? parsed.owner : undefined,
      agent_prefixes: Array.isArray(parsed.agent_prefixes)
        ? parsed.agent_prefixes.filter((p: unknown) => typeof p === "string")
        : DEFAULTS.agent_prefixes,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
