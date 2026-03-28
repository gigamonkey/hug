import { existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { ensureClasp, findClasp, runClasp, patchParentId } from "../clasp.js";
import { copyTemplate } from "../templates.js";

interface InitOpts {
  template?: string;
  scriptId?: string;
  force?: boolean;
}

export const cmdInit = (name: string | undefined, opts: InitOpts): void => {
  let projectDir = ".";
  if (name) {
    projectDir = name;
    if (existsSync(projectDir) && !opts.force) {
      process.stderr.write(
        `Error: directory '${projectDir}' already exists. Use -f to override.\n`
      );
      process.exit(1);
    }
    mkdirSync(projectDir, { recursive: true });
  } else if (existsSync(".clasp.json") && !opts.force) {
    process.stderr.write(
      "Error: .clasp.json already exists in this directory. Use -f to override.\n"
    );
    process.exit(1);
  }

  process.chdir(projectDir);
  ensureClasp();
  const clasp = findClasp();

  if (opts.scriptId) {
    // Import mode: clone an existing project
    console.log(`Importing project ${opts.scriptId}...`);
    const output = runClasp(clasp, ["clone", opts.scriptId]);
    process.stdout.write(output);
    patchParentId();

    console.log("");
    console.log("Project imported. Next steps:");
    console.log("  hug pull        Fetch the latest code");
    console.log("  hug open        Open in the Apps Script editor");
  } else {
    // Template mode: create a new project
    const tmpl = opts.template || "blank";

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
};
