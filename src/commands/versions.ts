import { findClasp, runClasp } from "../clasp.js";

export function cmdVersions(args: string[]): void {
  const clasp = findClasp();
  const output = runClasp(clasp, ["list-versions", ...args]);
  process.stdout.write(output);
}
