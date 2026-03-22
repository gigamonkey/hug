# Plan: Add `hug config` for managing project configuration

## Context

After forking a project with `hug fork`, you need to configure it to point at
different resources (e.g. a different spreadsheet). Using `clasp run` with
script properties would be the "right" approach but requires heavy GCP setup
(link project, enable API, create OAuth client, re-login with creds).

Instead, use a simple local `config.js` file that gets pushed with the code.
`hug config` manages this file, and Apps Script code reads from the `CONFIG`
object directly. Each git branch can have different config values, which pairs
well with `hug fork`.

Config values end up in source/git, which is fine for things like spreadsheet
IDs but means sensitive values shouldn't go here.

## Files to modify

- `bin/hug` — add `cmd_config` and dispatch entry
- `README.md` — document the config command
- `CLAUDE.md` — update command list and design decisions

Templates are not modified — `config.js` is created on demand by `hug config set`.

## Changes

### 1. Add `cmd_config` to `bin/hug`

```
hug config                     # list all config values
hug config set KEY=VALUE ...   # set one or more values
hug config unset KEY ...       # remove one or more values
```

Implementation:

**`hug config`** (no args): read `config.js`, parse and display key-value pairs.
If no `config.js` exists, say "No config.js found."

**`hug config set K=V ...`**: parse KEY=VALUE args. If `config.js` exists, read
it and merge new values. If not, create it. Write the file as:

```javascript
const CONFIG = {
  SPREADSHEET_ID: '1BxiM...',
  SHEET_NAME: 'Data',
};
```

**`hug config unset K ...`**: read `config.js`, remove specified keys, rewrite.
If no keys remain, delete the file.

The parser for reading `config.js` can be simple — grep for lines matching
`KEY: 'VALUE'` or `KEY: "VALUE"` patterns. No need for a full JS parser since
hug controls the file format.

### 2. Add dispatch entry

Add `config` to the case statement and usage block:

```
Configuration:
  config                        List config values
  config set KEY=VALUE ...      Set config values (writes config.js)
  config unset KEY ...          Remove config values
```

### 3. Update docs

- README: add config section with example workflow (init, config set, push)
- CLAUDE.md: add config to command list and design decisions

## Verification

- `hug config --help` shows usage
- `hug config` with no config.js prints "No config.js found."
- `hug config set FOO=bar BAZ=qux` creates config.js with both values
- `hug config` lists FOO and BAZ
- `hug config set FOO=updated` changes FOO, keeps BAZ
- `hug config unset FOO` removes FOO, keeps BAZ
- `hug config unset BAZ` removes last key and deletes config.js
- config.js is valid JavaScript that can be pushed to Apps Script
