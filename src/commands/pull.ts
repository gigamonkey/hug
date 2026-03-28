import { execFileSync } from "node:child_process";
import { findClasp, runClasp } from "../clasp.js";

export const cmdPull = (args: string[]): void => {
  let force = false;
  const rest: string[] = [];

  for (const arg of args) {
    if (arg === "-f" || arg === "--force") {
      force = true;
    } else if (arg === "--help") {
      console.log("Usage: hug pull [-f|--force]");
      console.log("");
      console.log(
        "Pulls remote files from Apps Script, overwriting local files."
      );
      console.log(
        "Refuses to run if there are uncommitted changes (use -f to override)."
      );
      return;
    } else {
      rest.push(arg);
    }
  }

  if (!force) {
    try {
      execFileSync("git", ["diff", "--quiet"], { stdio: "ignore" });
    } catch {
      process.stderr.write(
        "Error: you have uncommitted changes. Commit or stash them first,\n"
      );
      process.stderr.write("or use 'hug pull --force' to overwrite.\n");
      process.exit(1);
    }
  }

  const clasp = findClasp();
  const output = runClasp(clasp, ["pull", ...rest]);
  process.stdout.write(output);
}
