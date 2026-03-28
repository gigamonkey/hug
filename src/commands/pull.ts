import { execFileSync } from "node:child_process";
import { findClasp, runClasp } from "../clasp.js";

export const cmdPull = (
  args: string[],
  opts: { force?: boolean }
): void => {
  if (!opts.force) {
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
  const output = runClasp(clasp, ["pull", ...args]);
  process.stdout.write(output);
};
