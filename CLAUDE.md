# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`hug` is a TypeScript CLI that wraps [clasp](https://github.com/google/clasp) to provide opinionated project management for Google Apps Script projects. It handles project creation (from templates or by importing existing projects), forking projects for branch-based workflows, and a push→version→deploy workflow.

## Project structure

```
src/cli.ts           # CLI entry point (commander-based)
src/clasp.ts         # Clasp resolution, auth error detection
src/deployment.ts    # Deployment selection and update helpers
src/config-file.ts   # config.js read/write
src/templates.ts     # Template resolution
src/commands/        # One file per subcommand (init, fork, deploy, etc.)
templates/blank/     # Minimal Apps Script project template
templates/webapp/    # Webapp template (doGet + index.html)
package.json         # npm package, bin points to dist/cli.js
```

## Key commands

```bash
hug init [--template blank|webapp] [name]   # create new project from template
hug init --scriptId <id> [name]             # import existing project
hug fork                                    # new Apps Script project from current code
hug config set KEY=VALUE                    # manage config.js
hug deploy "description"                    # push + version + deploy
hug deploy --rollback <version>             # roll back
hug push / pull [-f] / open                 # clasp passthrough (pull checks git status)
hug versions / deployments                  # list versions/deployments
```

## Design decisions

### Deployments

Apps Script deployments are mainly useful for web apps (stable URL) and API
executables. Hug takes an opinionated approach: one deployment per project,
managed via `hug deploy`. If multiple deployments exist (e.g. created directly
via clasp), hug handles them gracefully — `selectDeployment` in `deployment.ts`
prompts the user to pick one. But hug doesn't provide commands to create or
delete individual deployments.

Multiple deployments on a single script share script properties, so they all
operate on the same underlying data (e.g. the same spreadsheet). This makes
them suitable for variant UIs against the same data, but not for dev/prod
separation. For dev/prod, use `hug fork` + git branches instead — each branch
gets its own script project with independent properties and deployments.

### Container-bound vs standalone scripts

Container-bound scripts are created from within a Google Doc/Sheet/Form via
Extensions > Apps Script. They can call `getActiveSpreadsheet()` etc. but are
tied to that container. There's no way to convert them to standalone. `hug fork`
detects container-bound projects (via `parentId` in `.clasp.json`) and refuses
unless `--force` is used, since the forked standalone copy would lose access to
the container's APIs.

### Config

`hug config` manages a local `config.js` file (JS constants object) that gets
pushed with the code. This avoids the heavy GCP setup required by `clasp run`
for setting script properties. Config values are in source/git, which is fine
for spreadsheet IDs etc. but not for secrets. Each git branch can have different
config values, pairing well with `hug fork`.

### Auth

Hug does not wrap `clasp login`. Auth credentials are stored globally in
`~/.clasprc.json` and persist across projects. Instead, all clasp invocations
go through `runClasp` in `clasp.ts` which detects auth errors and suggests
running `npx clasp login`.

## Development

Build with `npm run build` (runs `tsc`). Run tests with `npm test`. To test locally:

```bash
npx hug --help
```

clasp is a runtime dependency (`@google/clasp`). The CLI finds it at `./node_modules/.bin/clasp` first, then falls back to a global `clasp`.
