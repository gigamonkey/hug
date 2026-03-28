# Plan: Reimplement hug in TypeScript

## Goal

Rewrite the hug CLI in TypeScript, maintaining full behavioural parity with the
bash implementation. The primary challenge is verifying completeness and
correctness — every behaviour of the bash version must be reproduced and tested.

## Motivation

- TypeScript gives us proper argument parsing, structured error handling, and
  testable units in a way bash doesn't
- Enables the `call_apps_script_api` plan (api-calls.md) to use the Google APIs
  Node client rather than curl + jq
- Easier to maintain and extend (e.g. adding `hug rename`)
- npm-native: the package already has `package.json`; a TS build fits naturally

## Package structure

```
bin/hug              # thin shell shim (stays, just execs node dist/cli.js)
  OR
bin/hug.js           # compiled entry point (package.json bin points here)
src/
  cli.ts             # argument dispatch (main entry)
  commands/
    init.ts
    fork.ts
    deploy.ts
    config.ts
    push.ts
    pull.ts
    open.ts
    versions.ts
    deployments.ts
  clasp.ts           # clasp invocation + auth-error detection (replaces run_clasp)
  api.ts             # Apps Script REST API calls (from api-calls.md plan)
  config-file.ts     # config.js read/write logic
  templates.ts       # template copying
tsconfig.json
```

## Key design decisions

### Clasp invocation

`clasp.ts` wraps `spawn`/`execa` for clasp calls, replicating `run_clasp`'s
auth-error detection on stderr. The clasp binary resolution (`find_clasp`)
becomes a function that checks `./node_modules/.bin/clasp` then `$PATH`.

### Config file parsing

`config-file.ts` replaces `_read_config` / `_write_config`. The config file is
valid JavaScript, so *reading* it uses `vm.runInNewContext()` to evaluate it
and extract the `CONFIG` object — more robust than regex and handles any valid
JS values without special-casing. *Writing* is plain string templating to
produce the same `const CONFIG = { ... }` format.

### No interactive use of stdin in tests

`select_deployment` (multiple-deployment prompt) should be injectable — accept
an optional `select: (lines: string[]) => Promise<string>` parameter so tests
can provide a deterministic selector.

### Template resolution

`HUG_ROOT` resolution (currently done via `BASH_SOURCE` symlink-following) is
replaced with `import.meta.url` or `__dirname` depending on the module system.

---

## Testing strategy

The goal is to be confident the TS implementation is a complete and accurate
reimplementation. The approach has three layers:

### Layer 1: Behavioural contract tests (primary)

Write a test suite that runs against **both** the bash implementation and the TS
implementation via a shared set of black-box tests. Each test:

1. Sets up a temp directory with whatever files the scenario needs
2. Invokes `hug <command>` (configurable: bash or TS binary)
3. Asserts on stdout, stderr, exit code, and filesystem state

The tests use no mocks for the filesystem — real files are created and
inspected. Clasp itself **is** mocked (see below).

Run the suite against bash first to establish it passes, then against TS to
verify parity. If a test fails only against TS, that's a reimplementation bug.
If it fails against both, the test is wrong.

#### Clasp mock

Create a `test/mock-clasp` script (bash, executable) that:
- Records invocations to a log file (`$MOCK_CLASP_LOG`)
- Returns configurable responses via env vars or fixture files
- Exits with a configurable exit code

Tests set `PATH=test/mock-clasp-dir:$PATH` so `hug` finds the mock instead of
the real clasp. This lets us test all clasp-touching commands without Google
auth, and assert on what clasp was called with.

Example mock fixture for `create`:

```bash
# test/mock-clasp
case "$1" in
  create)
    echo '{"scriptId":"test-script-id"}' > .clasp.json
    cat appsscript.json > /tmp/mock-appsscript-before.json  # capture state
    echo '{"timeZone":"America/New_York","runtimeVersion":"V8"}' > appsscript.json
    echo "Created new script: test-script-id"
    ;;
  push)
    echo "Pushed 3 files."
    ;;
  ...
esac
echo "$@" >> "${MOCK_CLASP_LOG:-/tmp/clasp.log}"
```

#### Test cases to cover

For each command, tests cover:

**`hug init`**
- Creates directory when name given
- Refuses if directory exists (no -f)
- Accepts -f to overwrite
- Copies blank template by default
- Copies webapp template with --template webapp
- --scriptId runs `clasp clone` not `clasp create`
- --scriptId and --template are mutually exclusive (error)
- Calls `patch_parent_id` after clone
- Error if template name is unknown

**`hug fork`**
- Refuses if no .clasp.json
- Refuses if container-bound without --force or --detach
- --force proceeds despite container-bound
- --detach sets CONTAINER_ID in config.js
- --detach preserves appsscript.json after `clasp create`
- `clasp push` called with --force
- appsscript.json content is identical before and after fork

**`hug deploy`**
- Calls push, create-version, then update-deployment
- Creates new deployment if none exists
- --rollback calls update-deployment with specified version
- --rollback errors if no non-HEAD deployment found
- Parses version number from `clasp create-version` output

**`hug config`**
- Lists keys from config.js
- `set` creates config.js if missing
- `set` updates existing key
- `set` adds new key, preserves others
- `set` multiple keys in one command
- `unset` removes a key
- `unset` all keys deletes config.js
- `unset` errors if config.js missing
- Invalid KEY=VALUE format errors

**`hug pull`**
- Refuses with uncommitted git changes
- -f bypasses git check
- Passes remaining args to clasp

**`hug push`**
- Passes args through to clasp

**`hug open`**
- Default calls `clasp open-script`
- --container calls `clasp open-container`
- --container errors if not container-bound

**Error/auth handling**
- Auth-related clasp output triggers the login hint
- Unknown command prints usage and exits 1

### Layer 2: Unit tests

For logic that's fiddly in isolation, unit-test the TS modules directly:

- `config-file.ts`: round-trip parse/write, values containing single quotes or
  special characters, empty config, single key, multiple keys
- `clasp.ts`: auth-error detection on various stderr strings
  (`"authorize"`, `"401"`, `"ENOENT .clasprc"`, etc.)
- `api.ts`: token refresh logic (with a mocked fetch), error response handling

### Layer 3: Diff testing (completeness check)

To catch any bash behaviours we forgot to translate, run a structured diff:

1. Extract every distinct code path from `bin/hug` and `lib/common.sh`
   (manually or with a script that lists all `if`/`case` branches)
2. Produce a checklist of behaviours
3. For each behaviour, confirm there is at least one test covering it

This is a one-time audit done during the migration, not an ongoing automated
check.

---

## Migration approach

Rather than a big-bang rewrite, do it command by command, keeping the bash
version working throughout:

1. **Scaffold**: Set up `tsconfig.json`, build output to `dist/`, add
   `ts-node` for development. Keep `bin/hug` pointing at bash for now.
2. **Port commands one at a time**, starting with the simplest
   (`push`, `pull`, `open`, `versions`, `deployments`) and ending with the
   most complex (`deploy`, `fork`).
3. **Run behavioural tests against both** after each command is ported.
4. **Switch `bin/hug`** to the TS build only after all tests pass for both.
5. **Delete the bash source** once the TS version has been in use.

---

## Build and packaging

- `tsc` compiles `src/` → `dist/`
- `package.json` `bin` points to `dist/cli.js`
- Add `"prepare": "tsc"` script — runs automatically during `npm publish`,
  so the tarball includes compiled JS without needing to commit `dist/`
- `dist/` is gitignored
- `devDependencies`: `typescript`, `@types/node`, test runner (e.g. `node:test`
  built-in, or `vitest`)

---

## Dependencies

Aim to keep runtime dependencies minimal:

- No new runtime deps required for the core rewrite (Node built-ins cover
  `fs`, `child_process`, `path`, `readline`)
- `@googleapis/script` (Google API client) if/when implementing `api.ts`,
  replacing the curl approach from api-calls.md
- Dev only: `typescript`, `@types/node`, test runner
