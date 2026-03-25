# common.sh — shared functions for hug CLI

# Ensure package.json exists and clasp is installed locally
ensure_clasp() {
  if [ ! -f package.json ]; then
    echo "Initializing npm project..."
    npm init -y --quiet >/dev/null
  fi
  if [ ! -d node_modules/.bin ] || [ ! -x node_modules/.bin/clasp ]; then
    echo "Installing clasp..."
    npm install --save-dev @google/clasp --quiet >/dev/null
  fi
}

# Resolve the path to clasp, preferring local install
find_clasp() {
  if [ -x "./node_modules/.bin/clasp" ]; then
    echo "./node_modules/.bin/clasp"
  elif command -v clasp &>/dev/null; then
    echo "clasp"
  else
    echo "Error: clasp not found. Run 'npm install @google/clasp' first." >&2
    return 1
  fi
}

# Run clasp and check for auth errors on failure
run_clasp() {
  local clasp="$1"
  shift

  local output
  output=$("$clasp" "$@" 2>&1) && { echo "$output"; return 0; }
  local exit_code=$?

  echo "$output" >&2

  if echo "$output" | grep -qiE "authorize|unauthorized|unauthenticated|login|credential|ENOENT.*clasprc|401"; then
    echo "" >&2
    echo "Hint: you may need to log in. Run 'npx clasp login' to authenticate." >&2
  fi

  return $exit_code
}

# If the project is container-bound, patch parentId into .clasp.json
patch_parent_id() {
  local script_id
  script_id=$(grep '"scriptId"' .clasp.json | sed 's/.*"scriptId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
  if [ -z "$script_id" ]; then
    return
  fi

  local token
  token=$(sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' ~/.clasprc.json 2>/dev/null)
  if [ -z "$token" ]; then
    return
  fi

  local response
  response=$(curl -sf -H "Authorization: Bearer $token" \
    "https://script.googleapis.com/v1/projects/$script_id" 2>/dev/null) || return 0

  local parent_id
  parent_id=$(echo "$response" | sed -n 's/.*"parentId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  if [ -z "$parent_id" ]; then
    return
  fi

  # Already has parentId
  if grep -q '"parentId"' .clasp.json 2>/dev/null; then
    return
  fi

  # Inject parentId into .clasp.json before the closing brace
  local tmp
  tmp=$(mktemp)
  sed '$s/}$/,"parentId":"'"$parent_id"'"}/' .clasp.json > "$tmp" && mv "$tmp" .clasp.json
}

# Resolve the hug package root (where templates/ lives)
hug_root() {
  local source="${BASH_SOURCE[0]}"
  while [ -L "$source" ]; do
    local dir
    dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    [[ "$source" != /* ]] && source="$dir/$source"
  done
  cd -P "$(dirname "$source")/.." && pwd
}

# Get all non-HEAD deployment lines, select one interactively if multiple
select_deployment() {
  local clasp="$1"

  local lines
  lines=$(run_clasp "$clasp" list-deployments | grep '^-' | grep -v '@HEAD')

  if [ -z "$lines" ]; then
    echo ""
    return
  fi

  local count
  count=$(echo "$lines" | wc -l | tr -d ' ')

  if [ "$count" -eq 1 ]; then
    echo "$lines"
  else
    echo "Multiple deployments found. Choose one:" >&2
    echo "$lines" | nl -w1 -s') ' >&2
    printf "Choice: " >&2
    read -r choice
    local selected
    selected=$(echo "$lines" | sed -n "${choice}p")
    if [ -z "$selected" ]; then
      echo "Error: invalid choice" >&2
      return 1
    fi
    echo "$selected"
  fi
}

# Extract deployment ID from a deployment line
deployment_id() {
  echo "$1" | awk '{print $2}'
}

# Extract description from a deployment line (may be empty)
deployment_desc() {
  echo "$1" | sed -n 's/^- [^ ]* @[^ ]* - \(.*\)/\1/p'
}

# Update a deployment, preserving its description if it has one
update_deployment() {
  local clasp="$1" id="$2" version="$3" desc="$4"
  if [ -n "$desc" ]; then
    run_clasp "$clasp" update-deployment "$id" -V "$version" -d "$desc"
  else
    run_clasp "$clasp" update-deployment "$id" -V "$version"
  fi
}
