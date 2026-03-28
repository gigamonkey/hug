import { findClasp, runClasp } from "../clasp.js";

export const cmdDeployments = (args: string[]): void => {
  const clasp = findClasp();
  const output = runClasp(clasp, ["list-deployments", ...args]);
  process.stdout.write(output);
}
