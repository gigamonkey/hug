# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`hug` is a lightweight bash CLI that wraps [clasp](https://github.com/google/clasp) to provide opinionated project management for Google Apps Script projects. It handles project creation (from templates or by importing existing projects), forking projects for branch-based workflows, and a push→version→deploy workflow.

## Project structure

```
bin/hug              # CLI entry point (bash, subcommand dispatch)
lib/common.sh        # Shared functions (clasp resolution, deployment helpers)
templates/blank/     # Minimal Apps Script project template
templates/webapp/    # Webapp template (doGet + index.html)
package.json         # npm package with bin field pointing to bin/hug
```

## Key commands

```bash
./bin/hug init [--template blank|webapp] [name]   # create new project from template
./bin/hug init --scriptId <id> [name]             # import existing project
./bin/hug fork                                    # new Apps Script project from current code
./bin/hug deploy "description"                    # push + version + deploy
./bin/hug deploy --rollback <version>             # roll back
./bin/hug push / pull [-f] / open                  # clasp passthrough (pull checks git status)
./bin/hug versions / deployments                  # list versions/deployments
```

## Development

There is no build step or test suite. The CLI is pure bash. To test locally:

```bash
./bin/hug --help
```

clasp is a dependency (`@google/clasp`). The CLI finds it at `./node_modules/.bin/clasp` first, then falls back to a global `clasp`.
