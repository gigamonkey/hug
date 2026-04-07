# Hug's Own GCP Project for Authentication

## Background: How clasp does it

Clasp ships with a hardcoded OAuth client ID from a Google-owned GCP project
(project `1072944905499`). The client ID and secret are embedded in the source
code (`src/auth/oauth_client.ts`). When a user runs `clasp login`, clasp starts
a localhost HTTP server, opens the browser for Google's consent screen, catches
the redirect with the auth code, and stores tokens in `~/.clasprc.json`.

This shared OAuth client covers the common operations — push, pull, create,
deploy, versions, etc. — with no GCP setup from the user.

Clasp's default scopes include `script.projects`, `script.deployments`,
`script.webapp.deploy`, `drive.file`, `drive.metadata.readonly`,
`cloud-platform`, `service.management`, `logging.read`, `userinfo.email`, and
`userinfo.profile`.

For operations that require the user's own GCP project (like `clasp run`),
clasp provides `clasp login --creds client_secret.json` which accepts a
user-provided OAuth client ID from their own project.

## What hug could do

Hug could create its own GCP project and embed an OAuth client ID, just like
clasp does. This would give hug independent authentication — users would run
`hug login` instead of relying on clasp's credentials.

### Setup steps

1. Create a GCP project in Google Cloud Console
2. Enable the Apps Script API and Drive API
3. Configure the OAuth consent screen (app name, support email, privacy policy)
4. Create an OAuth 2.0 Client ID (type: Desktop Application)
5. Embed the client ID and secret in hug's source code
6. Implement a `hug login` command that does the OAuth flow and stores tokens

### Scopes hug would need

Sticking to non-sensitive scopes keeps verification simple:

| Scope | Purpose | Classification |
|-------|---------|---------------|
| `script.projects` | Create/manage script projects | Non-sensitive |
| `script.deployments` | Manage deployments | Non-sensitive |
| `script.webapp.deploy` | Deploy web apps | Non-sensitive |
| `drive.file` | Access script files on Drive | Non-sensitive |
| `drive.metadata.readonly` | List/find scripts | Non-sensitive |
| `userinfo.email` | Identify user | Non-sensitive |

Adding sensitive scopes (like `cloud-platform`, `logging.read`) is possible but
would require a heavier verification process (see below).

### OAuth app verification

- **Unverified apps**: capped at 100 lifetime users, show a scary warning
  screen during consent. Fine for personal use, not for a published tool.
- **Non-sensitive scopes only**: brand verification (domain ownership + privacy
  policy), takes 2-3 business days.
- **Sensitive scopes** (e.g. `cloud-platform`, `logging.read`): requires a demo
  video, justification for each scope, and Google review (4-6 weeks).
- **Restricted scopes** (e.g. full `drive`, Gmail): requires a third-party
  security assessment ($15k-$75k). Avoid these.

Recommendation: stick to non-sensitive scopes for the shared OAuth client. This
covers all the project management operations hug needs and keeps verification
straightforward.

## What hug's own project enables

With its own OAuth client, hug can:

- **Control its own auth UX** — no dependency on clasp's credentials or login
  flow.
- **Request custom scopes** — if hug wants to interact with Sheets, Calendar,
  or other Google APIs directly, it can request those scopes. Clasp's default
  set is fixed.
- **Manage token lifecycle independently** — refresh tokens, handle expiry,
  support multiple accounts, etc.
- **Decouple from clasp entirely** — hug could call the Apps Script API
  directly instead of shelling out to clasp (see `plans/api-calls.md`).

## What still requires the user's own GCP project

These are Google platform constraints, not clasp or hug limitations:

1. **Remote function execution** (Apps Script Execution API / `clasp run`) —
   Google requires the OAuth client and the Apps Script project to be linked to
   the **same** GCP project. A shared CLI's project will never match the user's
   script's project. No workaround.

2. **Cloud Logging** — Logs live in the GCP project linked to the script. A
   third-party OAuth client can't read them without IAM permissions on that
   project.

3. **Enabling APIs on the user's project** — The Apps Script API must be
   enabled on the GCP project linked to the script. A CLI tool can't do this
   on behalf of the user.

4. **Service accounts for CI/CD** — Automated deployments need service accounts
   in the user's own project.

For these use cases, hug would need a `hug login --creds` equivalent, same as
clasp's `clasp login --creds`.

## Scope implications for spreadsheet operations

A motivating use case: `hug fork --detach` could set up a spreadsheet (or copy
an existing one) for the forked project. The scope requirements vary
significantly depending on the operation.

### Creating a new spreadsheet

Works with `drive.file`, which is already in the proposed scope list. Since hug
would be creating the file, `drive.file` grants access to it automatically. Can
use either the Drive API or Sheets API.

### Copying an existing user spreadsheet

This is where scopes get expensive. `drive.file` only covers files the app
created or the user explicitly opened *through the app* (via Google's file
picker, which is a browser widget — awkward for a CLI). An arbitrary spreadsheet
the user already owns wasn't created by hug, so `drive.file` won't grant access.

A true `files.copy` via the Drive API on a user's existing spreadsheet requires
the full `drive` scope — **restricted**, triggers the $15k-$75k security
assessment. Not worth it.

### Workarounds for copying

1. **`spreadsheets` scope** — `https://www.googleapis.com/auth/spreadsheets`
   gives read/write access to all the user's spreadsheets. Classified as
   **sensitive** (not restricted), so it needs the 4-6 week review but no
   security audit. With this, hug could read the source spreadsheet's data and
   create a new one with the same content. Not a true Drive-level copy — you'd
   lose comments, permissions, named ranges tied to other sheets, etc. — but
   keeps data and structure.

2. **Only copy spreadsheets hug created** — if `hug init` creates the
   spreadsheet, then `hug fork` can copy it because hug created the original
   and `drive.file` covers it. This stays within non-sensitive scopes but
   limits the "import existing spreadsheet" case. Fits the `hug init` ->
   `hug fork` workflow naturally.

3. **Use the Apps Script itself** — a script running as the user already has
   access to their Drive. Hug could push a small utility function that copies
   the spreadsheet, execute it, and clean up. But this circles back to needing
   the user's own GCP project for `script.run` (the Execution API).

### Recommendation

Option 2 (only copy spreadsheets hug created) is the most practical starting
point. It keeps scopes non-sensitive, avoids verification headaches, and aligns
with the intended workflow where hug manages the project lifecycle end-to-end.

If users need to copy spreadsheets they created outside hug, adding the
`spreadsheets` scope later is a reasonable escalation — it bumps verification
from "brand only" to "sensitive scope review" but avoids the restricted-scope
security audit.

## Relationship to dropping clasp

This plan pairs with `plans/api-calls.md`. If hug calls the Apps Script API
directly (instead of shelling out to clasp), it needs its own OAuth tokens
anyway. Having hug's own GCP project is a prerequisite for that.

The migration path:
1. Set up hug's GCP project and `hug login`
2. Use hug's tokens to call the Apps Script REST API directly
3. Drop clasp as a runtime dependency
