# hug

A wrapper around [clasp](https://github.com/google/clasp) for managing Google Apps Script projects.

## Install

```bash
npm install -g @peterseibel/hug
```

Or clone this repo and link it:

```bash
git clone https://github.com/gigamonkey/hug.git && cd hug
npm install && npm link
```

## Already using clasp?

Just use `hug` in your existing project. There's nothing special about a hug project — any clasp project works out of the box.

## Prerequisites

You need to be logged in to clasp:

```bash
npx clasp login
```

## Commands

### Create a new project

```bash
hug init my-app                         # blank project
hug init --template webapp my-app       # webapp with doGet + index.html
```

This creates the directory, copies template files, installs clasp, and creates the Apps Script project.

### Import an existing project

```bash
hug init --scriptId <scriptId> my-project
```

Imports an existing Apps Script project into a new directory and sets up npm/clasp.

### Fork a project

```bash
hug fork
```

Creates a new Apps Script project from the current local code. Useful with git branches — fork on a branch to get a separate Apps Script project you can develop against independently. If you're using `hug config` to manage resources like spreadsheet IDs, you'll probably want to update them after forking so the new project points at its own resources.

#### Forking a container-bound project

If your project is a container-bound script (created via Extensions > Apps Script inside a Google Sheet, Doc, etc.), `hug fork` will refuse by default since the forked standalone copy can't call `getActiveSpreadsheet()` and similar container APIs.

Use `--detach` to fork anyway and automatically save the original container's ID to `config.js`:

```bash
hug fork --detach
```

This sets `CONTAINER_ID` in `config.js` to the original container's ID. You'll then need to update your code to open the container explicitly instead of relying on the bound context. For example:

```javascript
// Before (container-bound only)
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = SpreadsheetApp.getActiveSheet();
const range = SpreadsheetApp.getActiveRange();

// After (works in standalone fork)
const ss = SpreadsheetApp.openById(CONFIG.CONTAINER_ID);
const sheet = ss.getActiveSheet();         // or ss.getSheetByName("Sheet1")
const range = sheet.getActiveRange();      // or sheet.getRange(...)
```

Similarly for other container types:

```javascript
// Google Doc
const doc = DocumentApp.openById(CONFIG.CONTAINER_ID);

// Google Form
const form = FormApp.openById(CONFIG.CONTAINER_ID);
```

After updating the code, push it and optionally set up a fresh deployment:

```bash
hug push
hug deploy "detach from container"
```

### Configure

```bash
hug config                          # list config values
hug config set SPREADSHEET_ID=1Bx.. # set a value
hug config set FOO=bar BAZ=qux      # set multiple values
hug config unset FOO                # remove a value
```

Manages a `config.js` file that gets pushed with your code. Apps Script code can access values via `CONFIG.SPREADSHEET_ID`, etc. Useful for pointing different branches/forks at different resources.

Note: config values are stored in source. Don't put secrets here.

### Push / Pull / Open

```bash
hug push          # push local files to Apps Script
hug pull          # pull remote files (refuses if uncommitted changes)
hug pull -f       # pull even with uncommitted changes
hug open          # open in the Apps Script editor
```

### Deploy

```bash
hug deploy "description of changes"
```

Pushes code, creates a version, and updates the existing deployment (or creates one if none exists).

### Roll back

```bash
hug deploy --rollback <versionNumber>
```

### List versions and deployments

```bash
hug versions
hug deployments
```

## Templates

- **blank** — minimal `appsscript.json` + empty `Code.js`
- **webapp** — `doGet()` serving an `index.html`, with webapp config in the manifest

## Branch-per-environment pattern

Use `hug fork` and `hug config` combined with git branches to maintain separate
Apps Script projects. Write code to use config values (e.g. using
`SPREADSHEET_ID` to a spreadsheet the script should use) rather than using
container-bound projects and then different branches can use different AppScript
projects each configured with separate resources as needed. And shared resources
can be shared by simply using the same config values.

```bash
git switch -c staging
hug fork                              # new Apps Script project, updates .clasp.json
hug config set SPREADSHEET_ID=1Bx..   # point at a staging spreadsheet
hug deploy                            # deploys to the staging project
git commit                            # Commit work in branch.
git switch main                       # .clasp.json and config.js switch back to production
```
