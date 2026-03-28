import { findClasp, runClasp } from "../clasp.js";
import {
  selectDeployment,
  deploymentId,
  deploymentDesc,
  updateDeployment,
} from "../deployment.js";

interface DeployOpts {
  rollback?: string;
}

export const cmdDeploy = async (
  descriptionParts: string[],
  opts: DeployOpts
): Promise<void> => {
  const clasp = findClasp();

  // Rollback mode
  if (opts.rollback) {
    const version = opts.rollback;
    const line = await selectDeployment(clasp);
    if (!line) {
      process.stderr.write(
        "Error: no non-HEAD deployment found to roll back\n"
      );
      process.exit(1);
    }
    const id = deploymentId(line);
    const desc = deploymentDesc(line);
    console.log(`Rolling back to version ${version} (deployment ${id})...`);
    updateDeployment(clasp, id, version, desc);
    console.log("Done.");
    return;
  }

  const description = descriptionParts.join(" ");

  console.log("Pushing...");
  let output = runClasp(clasp, ["push"]);
  process.stdout.write(output);

  console.log("Creating version...");
  const versionOutput = runClasp(clasp, ["create-version", description]);
  process.stdout.write(versionOutput);

  const versionMatch = versionOutput.match(/version (\d+)/);
  if (!versionMatch) {
    process.stderr.write(
      `Error: could not parse version number from: ${versionOutput}\n`
    );
    process.exit(1);
  }
  const version = versionMatch[1];

  let line: string;
  try {
    line = await selectDeployment(clasp);
  } catch {
    line = "";
  }

  if (!line) {
    console.log("No existing deployment found. Creating one...");
    output = runClasp(clasp, [
      "create-deployment",
      "-V",
      version,
      "-d",
      description,
    ]);
    process.stdout.write(output);
  } else {
    const id = deploymentId(line);
    const desc = deploymentDesc(line);
    console.log(`Updating deployment ${id} to version ${version}...`);
    updateDeployment(clasp, id, version, desc);
  }

  console.log("Done.");
};
