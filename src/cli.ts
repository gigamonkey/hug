#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, Option } from "commander";

import { cmdInit } from "./commands/init.js";
import { cmdFork } from "./commands/fork.js";
import { cmdDeploy } from "./commands/deploy.js";
import { cmdConfigList, cmdConfigSet, cmdConfigUnset } from "./commands/config.js";
import { cmdPush } from "./commands/push.js";
import { cmdPull } from "./commands/pull.js";
import { cmdOpen } from "./commands/open.js";
import { cmdVersions } from "./commands/versions.js";
import { cmdDeployments } from "./commands/deployments.js";

const thisFile = fileURLToPath(import.meta.url);
const hugRoot = dirname(dirname(thisFile));
const pkg = JSON.parse(
  readFileSync(join(hugRoot, "package.json"), "utf-8")
);

const program = new Command()
  .name("hug")
  .description("A wrapper around clasp for managing Google Apps Script projects")
  .version(pkg.version, "-v, --version");

// ─── init ────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Create a new Apps Script project")
  .addOption(new Option("--template <name>", "start from a template: blank (default), webapp").conflicts("scriptId"))
  .addOption(new Option("--scriptId <id>", "import an existing Apps Script project by ID").conflicts("template"))
  .option("-f, --force", "use an existing directory even if it already exists")
  .argument("[name]", "project directory name")
  .action(cmdInit);

// ─── fork ────────────────────────────────────────────────────────────────────

program
  .command("fork")
  .description("Create a new Apps Script project from current code")
  .option("-f, --force", "fork even if container-bound")
  .option("--detach", "fork and save container ID to config.js")
  .action(cmdFork);

// ─── config ──────────────────────────────────────────────────────────────────

const config = program
  .command("config")
  .description("Manage config.js (KEY=VALUE constants pushed with your code)")
  .action(cmdConfigList);

config
  .command("set")
  .description("Set config values")
  .argument("<pairs...>", "KEY=VALUE pairs")
  .action(cmdConfigSet);

config
  .command("unset")
  .description("Remove config values")
  .argument("<keys...>", "keys to remove")
  .action(cmdConfigUnset);

// ─── deploy ──────────────────────────────────────────────────────────────────

program
  .command("deploy")
  .description("Push, version, and update deployment")
  .option("--rollback <version>", "roll back to a previous version")
  .argument("[description...]", "deployment description")
  .action(cmdDeploy);

// ─── push / pull / open ──────────────────────────────────────────────────────

program
  .command("push")
  .description("Push local files to Apps Script")
  .allowUnknownOption()
  .argument("[args...]", "arguments forwarded to clasp")
  .action(cmdPush);

program
  .command("pull")
  .description("Pull remote files (refuses if uncommitted changes)")
  .option("-f, --force", "bypass uncommitted changes check")
  .allowUnknownOption()
  .argument("[args...]", "arguments forwarded to clasp")
  .action(cmdPull);

program
  .command("open")
  .description("Open the project script (or container)")
  .option("--container", "open the container document instead")
  .allowUnknownOption()
  .argument("[args...]", "arguments forwarded to clasp")
  .action(cmdOpen);

// ─── versions / deployments ──────────────────────────────────────────────────

program
  .command("versions")
  .description("List versions")
  .allowUnknownOption()
  .argument("[args...]", "arguments forwarded to clasp")
  .action(cmdVersions);

program
  .command("deployments")
  .description("List deployments")
  .allowUnknownOption()
  .argument("[args...]", "arguments forwarded to clasp")
  .action(cmdDeployments);

// ─── parse ───────────────────────────────────────────────────────────────────

await program.parseAsync();
