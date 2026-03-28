import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { findClasp, runClasp } from "../clasp.js";
import { readConfig, writeConfig, type ConfigEntries } from "../config-file.js";

interface ForkOpts {
  force?: boolean;
  detach?: boolean;
}

export const cmdFork = (opts: ForkOpts): void => {
  if (!existsSync(".clasp.json")) {
    process.stderr.write(
      "Error: no .clasp.json found. Run 'hug init' first.\n"
    );
    process.exit(1);
  }

  // Capture parentId before we replace .clasp.json
  const claspJson = JSON.parse(readFileSync(".clasp.json", "utf-8"));
  const parentId: string | undefined = claspJson.parentId;

  if (parentId && !opts.force && !opts.detach) {
    process.stderr.write(
      "Error: this is a container-bound script. Forking will create a standalone\n"
    );
    process.stderr.write(
      "project, but the code may depend on its container (e.g. by calling.\n"
    );
    process.stderr.write("getActiveSpreadsheet()).\n");
    process.stderr.write("\n");
    process.stderr.write(
      `Container: https://drive.google.com/file/d/${parentId}\n`
    );
    process.stderr.write("\n");
    process.stderr.write(
      "Use 'hug fork --force' to fork anyway, or '--detach' to fork and\n"
    );
    process.stderr.write("save the container ID to config.js as CONTAINER_ID.\n");
    process.exit(1);
  }

  const clasp = findClasp();
  const title = basename(resolve("."));

  console.log(`Creating new Apps Script project '${title}'...`);
  unlinkSync(".clasp.json");

  // Preserve appsscript.json because clasp create overwrites it with server defaults
  let savedManifest: string | null = null;
  if (existsSync("appsscript.json")) {
    savedManifest = readFileSync("appsscript.json", "utf-8");
  }

  let output = runClasp(clasp, [
    "create",
    "--type",
    "standalone",
    "--title",
    title,
  ]);
  process.stdout.write(output);

  if (savedManifest !== null) {
    writeFileSync("appsscript.json", savedManifest);
  }

  console.log("Pushing code to new project...");
  output = runClasp(clasp, ["push", "--force"]);
  process.stdout.write(output);

  // If detaching, save the original container ID to config
  if (opts.detach && parentId) {
    const existing: ConfigEntries = readConfig() || {};
    existing["CONTAINER_ID"] = parentId;
    writeConfig(existing);
    console.log(`Set CONTAINER_ID=${parentId} in config.js.`);
    console.log(
      "Push will include config.js. Use SpreadsheetApp.openById(CONFIG.CONTAINER_ID) etc."
    );
  }

  console.log("");
  console.log(
    "Fork complete. This directory now points to a new Apps Script project."
  );
};
