# hug

A lightweight wrapper around [clasp](https://github.com/google/clasp) for managing Google Apps Script projects.

## Install

```bash
npm install -g @peterseibel/hug
```

Or clone this repo and link it:

```bash
git clone <repo-url> && cd hug
npm install && npm link
```

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

Creates a new Apps Script project from the current local code. Useful with git branches — fork on a branch to get a separate Apps Script project you can develop against independently.

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

Use `hug fork` with git branches to maintain separate Apps Script projects:

```bash
git checkout -b staging
hug fork          # creates a new Apps Script project, updates .clasp.json
hug deploy        # deploys to the staging project
git checkout main # .clasp.json switches back to the production project
```
