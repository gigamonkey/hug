# hug

A lightweight wrapper around [clasp](https://github.com/google/clasp) for managing Google Apps Script projects.

## Install

```bash
npm install -g hug-clasp
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
cd my-project
hug import <scriptId>
```

Clones an existing Apps Script project into the current directory and sets up npm/clasp.

### Clone (fork) a project

```bash
hug clone <scriptId> my-fork
```

Pulls code from an existing project, creates a new Apps Script project, and pushes the code to it.

### Push / Pull / Open

```bash
hug push          # push local files to Apps Script
hug pull          # pull remote files from Apps Script
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

## Multi-environment pattern

For dev/prod setups, keep separate clasp configs:

```
dev.clasp.json
prod.clasp.json
```

Copy the one you want to `.clasp.json` before running commands:

```bash
cp dev.clasp.json .clasp.json
hug push
```
