import { existsSync, readFileSync } from "node:fs";
import { findClasp, runClasp } from "../clasp.js";

export const cmdOpen = (
  args: string[],
  opts: { container?: boolean }
): void => {
  const clasp = findClasp();

  if (opts.container) {
    if (!existsSync(".clasp.json")) {
      process.stderr.write(
        "Error: no .clasp.json found. Run 'hug init' first.\n"
      );
      process.exit(1);
    }
    const claspJson = JSON.parse(readFileSync(".clasp.json", "utf-8"));
    if (!claspJson.parentId) {
      process.stderr.write(
        "Error: this project is not container-bound (no parentId in .clasp.json)\n"
      );
      process.exit(1);
    }
    const output = runClasp(clasp, ["open-container", ...args]);
    process.stdout.write(output);
  } else {
    const output = runClasp(clasp, ["open-script", ...args]);
    process.stdout.write(output);
  }
};
