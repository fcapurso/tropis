#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Checks that the tools this framework needs are on the path, and says how to get
# the ones that are not.
#
# Written in bash on purpose: it has to run before anything else is confirmed, so it
# cannot be written in the language it is checking for.
#
# Exit 0 when everything required is present, 1 otherwise. Safe to run at any time,
# not only during setup.

set -uo pipefail

# Installed at .tropis/scripts/: the framework's packages are one level up, the
# project root two. Found from this script's location, never the working directory.
framework_dir="$(cd "$(dirname "$0")/.." && pwd -P)"
project_root="$(cd "$framework_dir/.." && pwd -P)"

missing=0
optional_missing=0

ok()   { printf '  ok       %-10s %s\n' "$1" "$2"; }
gone() { printf '  MISSING  %-10s %s\n' "$1" "$2"; missing=$((missing + 1)); }
warn() { printf '  --       %-10s %s\n' "$1" "$2"; optional_missing=$((optional_missing + 1)); }

echo "Framework prerequisites"
echo

# ── Required ────────────────────────────────────────────────────────────────

if command -v git >/dev/null 2>&1; then
  ok git "$(git --version | awk '{print $3}')"
else
  gone git "install from https://git-scm.com or your package manager"
fi

if command -v python3 >/dev/null 2>&1; then
  ok python3 "$(python3 --version 2>&1 | awk '{print $2}')  — parses the hook's payload"
else
  gone python3 "install python3; the rule-delivery hook uses it to read JSON"
fi

if command -v node >/dev/null 2>&1; then
  node_version=$(node --version | sed 's/^v//')
  node_major=${node_version%%.*}
  node_minor=$(echo "$node_version" | cut -d. -f2)
  # Jest, which runs the guards, accepts 18 only from 18.14.
  if [ "$node_major" -gt 18 ] || { [ "$node_major" -eq 18 ] && [ "$node_minor" -ge 14 ]; }; then
    ok node "$node_version  — runs the guards and the backlog command"
  else
    gone node "found $node_version, need 18.14 or newer (Jest, which runs the guards, refuses older)"
  fi
else
  gone node "install from https://nodejs.org or your package manager"
fi

# ── Required only if you adopted the backlog ────────────────────────────────

echo
if [ -f "$project_root/feature-catalog.yaml" ]; then
  if node -e "require.resolve('yaml', { paths: [process.argv[1]] })" "$framework_dir" >/dev/null 2>&1; then
    ok yaml "resolvable — reads feature-catalog.yaml"
  else
    gone yaml "run: npm --prefix .tropis install"
  fi
else
  warn backlog "no feature-catalog.yaml — the backlog is optional, skipping its parser"
fi

# ── Optional ────────────────────────────────────────────────────────────────

if command -v gh >/dev/null 2>&1; then
  ok gh "$(gh --version | head -1 | awk '{print $3}')  — used by the merge steps"
else
  warn gh "not found; the workflow's merge commands use it, everything else works without"
fi

echo
if [ "$missing" -gt 0 ]; then
  echo "$missing required tool(s) missing. Install them and run this again."
  exit 1
fi

if [ "$optional_missing" -gt 0 ]; then
  echo "Everything required is present. $optional_missing optional item(s) noted above."
else
  echo "Everything required is present."
fi
exit 0
