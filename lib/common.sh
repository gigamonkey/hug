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
  lines=$($clasp list-deployments | grep '^-' | grep -v '@HEAD')

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
    $clasp update-deployment "$id" -V "$version" -d "$desc"
  else
    $clasp update-deployment "$id" -V "$version"
  fi
}
