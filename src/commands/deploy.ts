import { findClasp, runClasp } from "../clasp.js";
import {
  selectDeployment,
  deploymentId,
  deploymentDesc,
  updateDeployment,
} from "../deployment.js";

export const cmdDeploy = async (args: string[]): Promise<void> => {
  if (args[0] === "--help") {
    console.log("Usage: hug deploy [description]");
    console.log("       hug deploy --rollback <version>");
    console.log("");
    console.log(
      "Pushes code, creates a version, and updates the deployment."
    );
    console.log("If no deployment exists, creates one.");
    return;
  }

  const clasp = findClasp();

  // Rollback mode
  if (args[0] === "--rollback") {
    if (args.length !== 2) {
      process.stderr.write("Usage: hug deploy --rollback <version>\n");
      process.exit(1);
    }
    const version = args[1];
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

  const description = args.join(" ");

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
}
