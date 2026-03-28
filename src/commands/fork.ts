import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { findClasp, runClasp } from "../clasp.js";
import { readConfig, writeConfig, type ConfigEntries } from "../config-file.js";

export const cmdFork = (args: string[]): void => {
  let force = false;
  let detach = false;

  for (const arg of args) {
    switch (arg) {
      case "-f":
      case "--force":
        force = true;
        break;
      case "--detach":
        detach = true;
        break;
      case "--help":
        console.log("Usage: hug fork [-f|--force] [--detach]");
        console.log("");
        console.log(
          "Creates a new Apps Script project from the current local code."
        );
        console.log(
          "Replaces .clasp.json with a new project, then pushes code to it."
        );
        console.log("");
        console.log(
          "Refuses if the current project is container-bound (use -f to override,"
        );
        console.log(
          "or --detach to fork and save the container ID to config)."
        );
        console.log("");
        console.log(
          "  --detach   Fork a container-bound project and set CONTAINER_ID in"
        );
        console.log(
          "             config.js to the original container's ID, so code can"
        );
        console.log(
          "             open it via SpreadsheetApp.openById() etc."
        );
        console.log("");
        console.log(
          "Useful with git branches: fork on a branch to get a separate"
        );
        console.log("Apps Script project for each branch.");
        return;
    }
  }

  if (!existsSync(".clasp.json")) {
    process.stderr.write(
      "Error: no .clasp.json found. Run 'hug init' first.\n"
    );
    process.exit(1);
  }

  // Capture parentId before we replace .clasp.json
  const claspJson = JSON.parse(readFileSync(".clasp.json", "utf-8"));
  const parentId: string | undefined = claspJson.parentId;

  if (parentId && !force && !detach) {
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
  if (detach && parentId) {
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
}
