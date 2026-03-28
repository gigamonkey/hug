import { existsSync } from "node:fs";
import { readConfig, writeConfig, type ConfigEntries } from "../config-file.js";

export function cmdConfig(args: string[]): void {
  if (args[0] === "--help") {
    console.log("Usage: hug config");
    console.log("       hug config set KEY=VALUE ...");
    console.log("       hug config unset KEY ...");
    console.log("");
    console.log("Manages config.js, a JS constants file pushed with your code.");
    console.log("Apps Script code can read values via CONFIG.KEY.");
    console.log("");
    console.log("Note: config values are stored in source. Don't put secrets here.");
    return;
  }

  const subcmd = args[0] || "";

  switch (subcmd) {
    case "": {
      // List config
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
      break;
    }

    case "set": {
      const setArgs = args.slice(1);
      if (setArgs.length === 0) {
        process.stderr.write("Usage: hug config set KEY=VALUE ...\n");
        process.exit(1);
      }

      // Load existing config
      const existing: ConfigEntries = readConfig() || {};

      // Parse new values and merge
      for (const arg of setArgs) {
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
      break;
    }

    case "unset": {
      const unsetArgs = args.slice(1);
      if (unsetArgs.length === 0) {
        process.stderr.write("Usage: hug config unset KEY ...\n");
        process.exit(1);
      }

      if (!existsSync("config.js")) {
        process.stderr.write("No config.js found.\n");
        process.exit(1);
      }

      const entries = readConfig() || {};
      for (const key of unsetArgs) {
        delete entries[key];
      }

      writeConfig(entries);

      if (!existsSync("config.js")) {
        console.log("Removed config.js (no keys remaining).");
      } else {
        console.log("Updated config.js.");
      }
      break;
    }

    default:
      process.stderr.write(
        `Error: unknown config subcommand '${subcmd}'\n`
      );
      process.stderr.write("Run 'hug config --help' for usage.\n");
      process.exit(1);
  }
}
