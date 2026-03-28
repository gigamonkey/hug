import { existsSync } from "node:fs";
import { readConfig, writeConfig, type ConfigEntries } from "../config-file.js";

export const cmdConfigList = (): void => {
  if (!existsSync("config.js")) {
    console.log(
      "No config.js found. Use 'hug config set KEY=VALUE' to create one."
    );
    return;
  }
  const entries = readConfig();
  if (entries) {
    for (const [key, value] of Object.entries(entries)) {
      console.log(`${key}=${value}`);
    }
  }
};

export const cmdConfigSet = (pairs: string[]): void => {
  const existing: ConfigEntries = readConfig() || {};

  for (const arg of pairs) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) {
      process.stderr.write(
        `Error: invalid format '${arg}'. Use KEY=VALUE.\n`
      );
      process.exit(1);
    }
    const eqIdx = arg.indexOf("=");
    const key = arg.substring(0, eqIdx);
    const value = arg.substring(eqIdx + 1);
    existing[key] = value;
  }

  writeConfig(existing);
  console.log("Updated config.js.");
};

export const cmdConfigUnset = (keys: string[]): void => {
  if (!existsSync("config.js")) {
    process.stderr.write("No config.js found.\n");
    process.exit(1);
  }

  const entries = readConfig() || {};
  for (const key of keys) {
    delete entries[key];
  }

  writeConfig(entries);

  if (!existsSync("config.js")) {
    console.log("Removed config.js (no keys remaining).");
  } else {
    console.log("Updated config.js.");
  }
};
