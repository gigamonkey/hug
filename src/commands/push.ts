import { findClasp, runClasp } from "../clasp.js";

export const cmdPush = (args: string[]): void => {
  const clasp = findClasp();
  const output = runClasp(clasp, ["push", ...args]);
  process.stdout.write(output);
};
