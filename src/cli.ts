#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cmdInit } from "./commands/init.js";
import { cmdFork } from "./commands/fork.js";
import { cmdDeploy } from "./commands/deploy.js";
import { cmdConfig } from "./commands/config.js";
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
const VERSION = pkg.version;

const usage = (): void => {
  console.log(`hug ${VERSION} — a wrapper around clasp

Usage: hug <command> [options]

Project commands:
  init [--template blank|webapp] [name]   Create a new project from a template
  init --scriptId <id> [name]             Import an existing Apps Script project
  fork [--detach]                          Create a new Apps Script project from current code

Development commands:
  push                Push local files to Apps Script
  pull [-f|--force]   Pull remote files (refuses if uncommitted changes)
  open [--container]  Open the project script (or container)

Configuration:
  config                        List config values
  config set KEY=VALUE ...      Set config values (writes config.js)
  config unset KEY ...          Remove config values

Deployment commands:
  deploy [description]          Push, version, and update deployment
  deploy --rollback <version>   Roll back to a previous version
  versions                      List versions
  deployments                   List deployments

Run 'hug <command> --help' for details on a specific command.`);
}

const args = process.argv.slice(2);

if (args.length === 0) {
  usage();
  process.exit(1);
}

const command = args[0];
const rest = args.slice(1);

switch (command) {
  case "init":
    cmdInit(rest);
    break;
  case "fork":
    cmdFork(rest);
    break;
  case "config":
    cmdConfig(rest);
    break;
  case "deploy":
    await cmdDeploy(rest);
    break;
  case "push":
    cmdPush(rest);
    break;
  case "pull":
    cmdPull(rest);
    break;
  case "open":
    cmdOpen(rest);
    break;
  case "versions":
    cmdVersions(rest);
    break;
  case "deployments":
    cmdDeployments(rest);
    break;
  case "--version":
  case "-v":
    console.log(`hug ${VERSION}`);
    break;
  case "--help":
  case "-h":
    usage();
    break;
  default:
    process.stderr.write(`Error: unknown command '${command}'\n`);
    process.stderr.write("Run 'hug --help' for usage.\n");
    process.exit(1);
}
