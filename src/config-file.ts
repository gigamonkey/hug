import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { createContext, runInNewContext } from "node:vm";

export interface ConfigEntries {
  [key: string]: string;
}

/**
 * Read config.js and return key-value pairs.
 * Uses vm.runInNewContext to evaluate the JS and extract the CONFIG object.
 */
export function readConfig(): ConfigEntries | null {
  if (!existsSync("config.js")) {
    return null;
  }
  const source = readFileSync("config.js", "utf-8");
  // const/let declarations don't become sandbox properties, so we
  // wrap the source so the last expression is the CONFIG object.
  const wrapped = source.replace(/^(const|let|var)\s+CONFIG\s*=/m, "CONFIG =");
  const sandbox: Record<string, unknown> = {};
  createContext(sandbox);
  runInNewContext(wrapped, sandbox);

  const config = sandbox["CONFIG"] as Record<string, unknown> | undefined;
  if (!config || typeof config !== "object") {
    return null;
  }

  const entries: ConfigEntries = {};
  for (const [key, value] of Object.entries(config)) {
    entries[key] = String(value);
  }
  return entries;
}

/**
 * Write config.js from key-value pairs.
 * If entries is empty, removes config.js.
 */
export function writeConfig(entries: ConfigEntries): void {
  const keys = Object.keys(entries);
  if (keys.length === 0) {
    if (existsSync("config.js")) {
      unlinkSync("config.js");
    }
    return;
  }

  const lines = keys.map(
    (key) => `  ${key}: '${entries[key]}',`
  );

  const content = `// No need to export as all .gs files are loaded into the same namespace
const CONFIG = {
${lines.join("\n")}
};
`;

  writeFileSync("config.js", content);
}
