# Plan: Transform this repo into `hug` — a general-purpose clasp wrapper

## Context

This repo currently contains a specific Apps Script app (BHS LC lottery form). We're turning it into `hug`, a lightweight CLI tool that wraps `clasp` to provide opinionated project management for Google Apps Script projects. The app-specific code will be removed; the deployment workflow in the `hug` script becomes the foundation.

## Phase 1: Clean up — remove app-specific files

**Delete:**
- `Code.js` — app business logic
- `index.html` — app UI
- `appsscript.json` — app-specific manifest
- `dev.clasp.json`, `prod.clasp.json` — app-specific project configs
- `.clasp.json` — app-specific (will be recreated per-project by hug)
- `plans/multi-project-deployment.md` — app-specific plan (concepts will be incorporated into hug's design)

**Keep:**
- `hug` script (will be rewritten)
- `package.json` (will be rewritten)
- `CLAUDE.md`, `README.md` (will be rewritten)
- `.gitignore`
- `.claude/` directory

## Phase 2: Project structure

```
hug/
├── bin/
│   └── hug              # CLI entry point (bash)
├── templates/
│   ├── blank/
│   │   ├── appsscript.json
│   │   └── Code.js      # empty/minimal
│   └── webapp/
│       ├── appsscript.json   # with webapp config
│       ├── Code.js           # doGet() stub
│       └── index.html        # minimal HTML page
├── lib/
│   └── common.sh        # shared bash functions (clasp path resolution, error handling, deployment helpers)
├── package.json          # bin field points to bin/hug, clasp as dependency
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Phase 3: CLI commands

The `hug` script becomes a subcommand-based CLI. All commands assume clasp is available (bundled as a dependency).

### `hug init [--template blank|webapp] [name]`
- Creates a new Apps Script project directory (or uses current dir)
- Copies template files into it
- Runs `npm init -y` and `npm install @google/clasp`
- Runs `clasp create --type standalone --title <name>` (or `--type webapp` for webapp template)
- Result: a ready-to-push project

### `hug import`
- For adopting an existing Apps Script project
- Runs `clasp clone <scriptId>` into current directory
- Sets up the standard project structure (package.json with clasp dep, .gitignore)

### `hug clone <scriptId> [directory]`
- Creates a new Apps Script project, then pushes existing code to it
- Basically: `clasp create` + copy files + `clasp push`
- Useful for forking an existing project into a new script

### `hug deploy [description]`
- The current push→version→update-deployment workflow (what `hug` does now)
- If no deployment exists yet, creates one
- Preserves existing deployment descriptions

### `hug deploy --rollback <version>`
- Roll back a deployment to a previous version (existing functionality)

### `hug push`
- Thin wrapper: just runs `clasp push`
- Convenience so you don't need to remember the clasp path

### `hug pull`
- Thin wrapper: just runs `clasp pull`

### `hug open`
- Thin wrapper: runs `clasp open`

### `hug versions`
- Lists versions (`clasp list-versions`)

### `hug deployments`
- Lists deployments (`clasp list-deployments`)

## Phase 4: Rewrite `bin/hug`

- Move current `hug` script to `bin/hug`
- Refactor into subcommand dispatch (case statement)
- Extract shared logic (clasp path resolution, deployment selection) into `lib/common.sh`
- Add `--help` for each subcommand
- The existing deploy logic stays largely intact, just reorganized

## Phase 5: Templates

### `templates/blank/`
- `appsscript.json`: minimal manifest (V8 runtime, America/Los_Angeles timezone)
- `Code.js`: empty file with a comment

### `templates/webapp/`
- `appsscript.json`: manifest with `webapp` section (executeAs USER_DEPLOYING, access ANYONE or DOMAIN)
- `Code.js`: `doGet()` that serves `index.html`
- `index.html`: minimal HTML5 boilerplate

## Phase 6: Update package.json

```json
{
  "name": "hug-clasp",
  "version": "0.1.0",
  "description": "A lightweight wrapper around clasp for managing Google Apps Script projects",
  "bin": { "hug": "bin/hug" },
  "dependencies": { "@google/clasp": "^3.2.0" }
}
```

## Phase 7: Rewrite docs

- `README.md`: document all commands with examples, installation instructions
- `CLAUDE.md`: update to reflect new project structure and purpose

## Verification

1. Run `./bin/hug --help` — should show available commands
2. Run `./bin/hug init --template webapp test-project` in a temp dir — should scaffold a project
3. Run `./bin/hug deploy "test"` in an existing clasp project — should do push→version→deploy
4. Run `./bin/hug versions` and `./bin/hug deployments` — should proxy to clasp
