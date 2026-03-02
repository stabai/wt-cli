import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const WTRC_PATH = join(homedir(), ".wtrc");
let originalWtrc: string | null = null;

function saveOriginalWtrc() {
  if (existsSync(WTRC_PATH)) {
    originalWtrc = readFileSync(WTRC_PATH, "utf-8");
  } else {
    originalWtrc = null;
  }
}

function restoreOriginalWtrc() {
  if (originalWtrc !== null) {
    writeFileSync(WTRC_PATH, originalWtrc);
  } else if (existsSync(WTRC_PATH)) {
    unlinkSync(WTRC_PATH);
  }
}

function writeWtrc(content: string) {
  writeFileSync(WTRC_PATH, content);
}

function removeWtrc() {
  if (existsSync(WTRC_PATH)) {
    unlinkSync(WTRC_PATH);
  }
}

function freshLoadConfig() {
  const { loadConfig } = require("../src/config");
  return loadConfig();
}

describe("config", () => {
  beforeAll(() => {
    saveOriginalWtrc();
  });

  afterAll(() => {
    restoreOriginalWtrc();
  });

  test("returns defaults when no .wtrc exists", () => {
    removeWtrc();
    const config = freshLoadConfig();
    expect(config.default_branch).toBe("dev");
    expect(config.agent_prefixes).toEqual([]);
    expect(config.base_dir).toBeUndefined();
    expect(config.owner).toBeUndefined();
  });

  test("parses valid .wtrc", () => {
    writeWtrc(
      JSON.stringify({
        default_branch: "main",
        base_dir: "/tmp/trees",
        owner: "testuser",
        agent_prefixes: ["claude/", "devin/"],
      }),
    );
    const config = freshLoadConfig();
    expect(config.default_branch).toBe("main");
    expect(config.base_dir).toBe("/tmp/trees");
    expect(config.owner).toBe("testuser");
    expect(config.agent_prefixes).toEqual(["claude/", "devin/"]);
  });

  test("expands ~ in base_dir", () => {
    writeWtrc(JSON.stringify({ base_dir: "~/my_trees" }));
    const config = freshLoadConfig();
    expect(config.base_dir).toBe(join(homedir(), "my_trees"));
  });

  test("ignores non-string fields", () => {
    writeWtrc(
      JSON.stringify({
        default_branch: 123,
        owner: false,
        agent_prefixes: "not-an-array",
      }),
    );
    const config = freshLoadConfig();
    expect(config.default_branch).toBe("dev");
    expect(config.owner).toBeUndefined();
    expect(config.agent_prefixes).toEqual([]);
  });

  test("filters non-string entries from agent_prefixes", () => {
    writeWtrc(
      JSON.stringify({
        agent_prefixes: ["claude/", 42, null, "devin/"],
      }),
    );
    const config = freshLoadConfig();
    expect(config.agent_prefixes).toEqual(["claude/", "devin/"]);
  });

  test("returns defaults on invalid JSON", () => {
    writeWtrc("this is not json {{{");
    const config = freshLoadConfig();
    expect(config.default_branch).toBe("dev");
    expect(config.agent_prefixes).toEqual([]);
  });

  test("handles empty JSON object", () => {
    writeWtrc("{}");
    const config = freshLoadConfig();
    expect(config.default_branch).toBe("dev");
    expect(config.agent_prefixes).toEqual([]);
    expect(config.base_dir).toBeUndefined();
    expect(config.owner).toBeUndefined();
  });
});
