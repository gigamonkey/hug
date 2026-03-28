import { existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { ensureClasp, findClasp, runClasp, patchParentId } from "../clasp.js";
import { copyTemplate } from "../templates.js";

export function cmdInit(args: string[]): void {
  let template = "";
  let name = "";
  let scriptId = "";
  let force = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--template":
        template = args[++i];
        break;
      case "--scriptId":
        scriptId = args[++i];
        break;
      case "-f":
      case "--force":
        force = true;
        break;
      case "--help":
        console.log("Usage: hug init [--template blank|webapp] [-f|--force] [name]");
        console.log("       hug init --scriptId <id> [-f|--force] [name]");
        console.log("");
        console.log("Creates a new Apps Script project. If name is given, creates a directory.");
        console.log("Refuses if the directory already exists (use -f to override).");
        console.log("");
        console.log("Options:");
        console.log("  --template   Start from a template: blank (default), webapp");
        console.log("  --scriptId   Import an existing Apps Script project by ID");
        console.log("  -f, --force  Use an existing directory even if it already exists");
        return;
      default:
        name = args[i];
        break;
    }
  }

  // Validate flags
  if (scriptId && template) {
    process.stderr.write("Error: --scriptId and --template are mutually exclusive\n");
    process.exit(1);
  }

  let projectDir = ".";
  if (name) {
    projectDir = name;
    if (existsSync(projectDir) && !force) {
      process.stderr.write(
        `Error: directory '${projectDir}' already exists. Use -f to override.\n`
      );
      process.exit(1);
    }
    mkdirSync(projectDir, { recursive: true });
  } else if (existsSync(".clasp.json") && !force) {
    process.stderr.write(
      "Error: .clasp.json already exists in this directory. Use -f to override.\n"
    );
    process.exit(1);
  }

  process.chdir(projectDir);
  ensureClasp();
  const clasp = findClasp();

  if (scriptId) {
    // Import mode: clone an existing project
    console.log(`Importing project ${scriptId}...`);
    const output = runClasp(clasp, ["clone", scriptId]);
    process.stdout.write(output);
    patchParentId();

    console.log("");
    console.log("Project imported. Next steps:");
    console.log("  hug pull        Fetch the latest code");
    console.log("  hug open        Open in the Apps Script editor");
  } else {
    // Template mode: create a new project
    const tmpl = template || "blank";

    if (!copyTemplate(tmpl, ".")) {
      process.stderr.write(
        `Error: unknown template '${tmpl}'. Available: blank, webapp\n`
      );
      process.exit(1);
    }

    console.log(`Copying ${tmpl} template...`);

    const title = name || basename(resolve("."));
    const type = tmpl === "webapp" ? "webapp" : "standalone";

    console.log(`Creating Apps Script project '${title}' (type: ${type})...`);
    const output = runClasp(clasp, ["create", "--type", type, "--title", title]);
    process.stdout.write(output);

    console.log("");
    console.log("Project ready. Next steps:");
    console.log("  hug push        Push code to Apps Script");
    console.log("  hug open        Open in the Apps Script editor");
    if (tmpl === "webapp") {
      console.log("  hug deploy      Push, version, and create a deployment");
    }
  }
}
