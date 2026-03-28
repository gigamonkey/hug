# Plan: Direct Apps Script API calls via clasp credentials

## Goal

Enable hug to make Apps Script API calls directly by reusing the OAuth tokens
that clasp already stores in `~/.clasprc.json`. No separate login flow needed.

## Background

`clasp login` stores OAuth tokens in `~/.clasprc.json` with scopes that include
`https://www.googleapis.com/auth/script.projects`, which covers the Apps Script
REST API. Hug can read those tokens and use them directly, handling token
refresh as needed.

`patchParentId()` in `src/clasp.ts` already reads `~/.clasprc.json` and makes a
direct API call via `curl`. The new helper generalizes this pattern using
Node's built-in `fetch` (no `curl` dependency) and adds token refresh.

## Implementation

### 1. `callAppsScriptApi` helper in `src/clasp.ts` — DONE

Reads `~/.clasprc.json`, uses the access token, and makes an authenticated API
call using `fetch`. On a 401, refreshes the token and retries once.

Key details discovered during implementation:
- clasp stores creds under `tokens.default` (not `token` + `oauth2ClientSettings`
  as older docs suggest). The helper reads from `tokens.default` with fallback
  to the legacy `token` path.
- clasp does not store `expiry_date`, so the helper uses the token as-is and
  refreshes on 401 rather than pre-checking expiry.
- The API can return HTML error pages on 404/403, so the helper parses the
  response as text first and handles non-JSON gracefully.

### 2. `hug rename` — DROPPED

The original plan included `hug rename <new-name>` as the first command to use
the helper. However, the Apps Script API does not support renaming projects.
The available methods on `projects` are: `create`, `get`, `getContent`,
`getMetrics`, and `updateContent` — none accept a title update.

### 3. Future commands

`callAppsScriptApi` is available for future commands that use valid API
endpoints, e.g.:
- `projects.get` — fetch project metadata
- `projects.getContent` — fetch script files
- `projects.deployments.*` — manage deployments directly

## Error handling

- Missing `~/.clasprc.json` → "Run 'npx clasp login' first"
- No access token found → "Run 'npx clasp login' first"
- Token refresh failure → "Try running 'npx clasp login' again"
- Non-JSON API response → "API returned {status}: {statusText}"
- JSON API error → surfaces `result.error.message`

## Notes

- The token refresh writes back to `~/.clasprc.json`. This matches clasp's own
  behavior (it also updates the file on refresh).
- No new dependencies — `fetch` is built into Node 18+.
- `patchParentId` can be updated to use the new helper, but since it's
  fire-and-forget (silently returns on any failure), it may make sense to keep
  it simple with a separate try/catch wrapper or convert it to async.
