# Plan: Direct Apps Script API calls via clasp credentials

## Goal

Enable hug to make Apps Script API calls directly (e.g. `hug rename`) by
reusing the OAuth tokens that clasp already stores in `~/.clasprc.json`. No
separate login flow needed.

## Background

`clasp login` stores OAuth tokens in `~/.clasprc.json` with scopes that include
`https://www.googleapis.com/auth/script.projects`, which covers the Apps Script
REST API. Hug can read those tokens and use them directly, handling token
refresh as needed.

## Implementation

### 1. Shared helper in `lib/common.sh`: `call_apps_script_api`

Reads `~/.clasprc.json`, refreshes the access token if expired, and makes an
authenticated API call using `curl`.

```bash
# Usage: call_apps_script_api METHOD path [curl-body-args...]
# METHOD: GET, PATCH, POST, etc.
# path: e.g. "projects/scriptId"
# Additional args passed to curl (e.g. -d '{"title":"foo"}')
#
# Exits with an error if ~/.clasprc.json is missing or the call fails.
call_apps_script_api() {
  local method="$1"
  local path="$2"
  shift 2

  local creds=~/.clasprc.json
  if [ ! -f "$creds" ]; then
    echo "Error: not logged in to clasp. Run 'npx clasp login' first." >&2
    return 1
  fi

  local access_token expiry_date refresh_token client_id client_secret
  access_token=$(jq -r '.token.access_token' "$creds")
  expiry_date=$(jq -r '.token.expiry_date' "$creds")   # milliseconds
  refresh_token=$(jq -r '.token.refresh_token' "$creds")
  client_id=$(jq -r '.oauth2ClientSettings.clientId' "$creds")
  client_secret=$(jq -r '.oauth2ClientSettings.clientSecret' "$creds")

  # Refresh if expired (expiry_date is ms, date +%s%3N is ms on Linux;
  # on macOS use $(date +%s)000 as a close-enough approximation)
  local now_ms
  now_ms=$(( $(date +%s) * 1000 ))
  if [ "$expiry_date" -lt "$now_ms" ]; then
    local refresh_response
    refresh_response=$(curl -s -X POST https://oauth2.googleapis.com/token \
      -d "grant_type=refresh_token" \
      -d "refresh_token=$refresh_token" \
      -d "client_id=$client_id" \
      -d "client_secret=$client_secret")
    access_token=$(echo "$refresh_response" | jq -r '.access_token')
    if [ -z "$access_token" ] || [ "$access_token" = "null" ]; then
      echo "Error: failed to refresh auth token. Try running 'npx clasp login' again." >&2
      return 1
    fi
    # Write refreshed token back so subsequent calls don't re-refresh
    local new_expiry=$(( now_ms + $(echo "$refresh_response" | jq -r '.expires_in') * 1000 ))
    local tmp
    tmp=$(mktemp)
    jq --arg tok "$access_token" --argjson exp "$new_expiry" \
      '.token.access_token = $tok | .token.expiry_date = $exp' "$creds" > "$tmp"
    mv "$tmp" "$creds"
  fi

  local base="https://script.googleapis.com/v1"
  curl -s -X "$method" "$base/$path" \
    -H "Authorization: Bearer $access_token" \
    -H "Content-Type: application/json" \
    "$@"
}
```

Dependency: `jq`. Check for it at call site and print a clear error if missing.

### 2. `hug rename <new-name>`

First command to use `call_apps_script_api`. Renames the current project.

```bash
cmd_rename() {
  local new_title="$1"
  if [ -z "$new_title" ]; then
    echo "Usage: hug rename <new-name>" >&2
    return 1
  fi

  local script_id
  script_id=$(jq -r '.scriptId' .clasp.json 2>/dev/null)
  if [ -z "$script_id" ] || [ "$script_id" = "null" ]; then
    echo "Error: no .clasp.json found. Run 'hug init' first." >&2
    return 1
  fi

  local result
  result=$(call_apps_script_api PATCH "projects/$script_id" \
    -d "{\"title\": \"$new_title\"}" \
    "?updateMask=title")
  if echo "$result" | jq -e '.error' > /dev/null 2>&1; then
    echo "Error: $(echo "$result" | jq -r '.error.message')" >&2
    return 1
  fi

  echo "Renamed project to '$new_title'."
}
```

### 3. Wire up dispatch

Add `rename) cmd_rename "$@" ;;` to the case statement in `bin/hug`, and add
`hug rename <new-name>` to the usage/help text.

## Error handling

- Missing `~/.clasprc.json` → "Run 'npx clasp login' first"
- Missing `jq` → "Error: jq is required for this command. Install with: brew install jq"
- Token refresh failure → "Try running 'npx clasp login' again"
- API 403 (insufficient scope) → surface the error message and note that re-running `clasp login` may fix it

## Notes

- The token refresh writes back to `~/.clasprc.json`. This matches clasp's own
  behavior (it also updates the file on refresh).
- `jq` is not currently a hug dependency. It's ubiquitous enough on developer
  machines that a clear error message is probably sufficient rather than
  shipping a workaround.
- This pattern generalizes to any Apps Script API endpoint — future commands
  (e.g. listing/managing triggers, getting project metadata) can reuse
  `call_apps_script_api` directly.
