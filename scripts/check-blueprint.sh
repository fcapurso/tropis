#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Checks this blueprint's committed content the way a set-up project would meet it.
#
# The blueprint has no test runner of its own (framework/DECISIONS.md), so this uses the
# tools a set-up project gets: it stages HEAD in a temporary directory, links the test
# tools, and runs check-conformance.sh with INSTRUCTIONS set — so
# besides proving every guard can fail, the clean baseline runs every guard over the
# rules, framework documents and commands that actually ship. Then it runs the guards that
# check this repository itself, which skip on a project-shaped tree, and shows each can
# fail. Read the last line: it is the verdict.
#
# Usage, from anywhere:
#   bash scripts/check-blueprint.sh
#
# Its test tools are the ones a set-up project gets: what templates/package.json names
# at HEAD, installed into .self-check/ (ignored by git) on first use and again whenever
# that file changes. NODE_MODULES=<a folder holding jest and yaml> uses those instead.
#
# Only committed content is checked. Commit first.

set -euo pipefail

BP="$(cd "$(dirname "$0")/.." && pwd)"
if [ -n "${NODE_MODULES:-}" ]; then
  NM="$(cd "$NODE_MODULES" && pwd)"
else
  TOOLS="$BP/.self-check"
  mkdir -p "$TOOLS"
  git -C "$BP" show HEAD:templates/package.json > "$TOOLS/package.json.next"
  if ! cmp -s "$TOOLS/package.json.next" "$TOOLS/package.json" \
     || [ ! -x "$TOOLS/node_modules/.bin/jest" ]; then
    mv "$TOOLS/package.json.next" "$TOOLS/package.json"
    echo "Installing the self-check's test tools from templates/package.json…"
    npm install --prefix "$TOOLS" --no-audit --no-fund --loglevel=error >/dev/null
  else
    rm "$TOOLS/package.json.next"
  fi
  NM="$TOOLS/node_modules"
fi
if [ ! -x "$NM/.bin/jest" ]; then
  echo "No jest under $NM." >&2
  exit 2
fi

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/blueprint-check-XXXXXX")"
cleanup() {
  rm -rf "$STAGE"
  if [ -n "${FULL:-}" ]; then rm -rf "$FULL" "$FULL.index"; fi
}
trap cleanup EXIT

git -C "$BP" archive HEAD | tar -x -C "$STAGE"
# A second copy of HEAD with the export-ignored paths kept, for guards that must see what
# the export hides. A temporary index leaves the checkout's own index and tree alone.
FULL="$(mktemp -d "${TMPDIR:-/tmp}/blueprint-full-XXXXXX")"
GIT_INDEX_FILE="$FULL.index" git -C "$BP" read-tree HEAD
GIT_INDEX_FILE="$FULL.index" git -C "$BP" checkout-index -a --prefix="$FULL/"
rm -f "$FULL.index"
# The guards are ES modules; a set-up project says so in its .tropis/package.json.
# And it runs them with the template's Jest config — which also keeps the test roots out of the
# command line, where Jest's --roots takes every argument after it as another root and
# swallows the guard name each conformance case passes.
echo '{"type":"module"}' > "$STAGE/package.json"
cp "$STAGE/templates/framework-jest.config.js" "$STAGE/jest.config.js"
ln -s "$NM" "$STAGE/node_modules"

echo "Checking $(git -C "$BP" rev-parse --short HEAD) of $BP"
echo
cd "$STAGE"
set +e
INSTRUCTIONS="$STAGE" FIXTURES="$STAGE/fixtures" SCRIPTS="$STAGE/scripts" \
  TEST_CMD="node --experimental-vm-modules $NM/.bin/jest --config $STAGE/jest.config.js" \
  bash "$STAGE/scripts/check-conformance.sh"
conformance=$?
set -e

# Guards that check the framework repository itself skip on the project-shaped tree
# check-conformance.sh builds, so they run here, on HEAD as staged. The list is explicit:
# a guard that calls isBlueprintTree and is missing from it is an error, and a listed
# guard that does not exist fails to run. TROPIS_EXPECT_FRAMEWORK turns a skip into a
# failure, and each guard must also fail on a planted defect.
FRAMEWORK_GUARDS="operator-page-closeout readme-usable private-material dependency-overrides"
framework=0
echo
echo "Framework repository: its own guards must pass here and fail on a planted defect"
echo
run_guard() { # <tree> <guard>
  FRAMEWORK_ROOT="$1" TROPIS_EXPECT_FRAMEWORK=1 \
    node --experimental-vm-modules "$NM/.bin/jest" --config "$STAGE/jest.config.js" \
    "guards/$2.test.js" >/dev/null 2>&1
}
for f in guards/*.test.js; do
  name="$(basename "$f" .test.js)"
  if grep -q isBlueprintTree "$f"; then
    case " $FRAMEWORK_GUARDS " in
      *" $name "*) ;;
      *) echo "  UNLISTED    $name calls isBlueprintTree; add it to FRAMEWORK_GUARDS"; framework=1 ;;
    esac
  fi
done
# plant <guard> <file> [line to delete]: with no line, the file is removed.
plant() {
  local guard="$1" file="$2" line="${3:-}" tree
  if ! run_guard "$STAGE" "$guard"; then
    echo "  FAILED      $guard fails on the framework repository"; framework=1; return
  fi
  tree="$(mktemp -d "${TMPDIR:-/tmp}/blueprint-plant-XXXXXX")"
  cp -R "$STAGE/." "$tree/"
  if [ -n "$line" ]; then
    grep -vF -- "$line" "$tree/$file" > "$tree/$file.new" || true
    mv "$tree/$file.new" "$tree/$file"
  else
    rm -f "$tree/$file"
  fi
  if run_guard "$tree" "$guard"; then
    echo "  NOT CAUGHT  $guard passed with $file planted"; framework=1
  else
    echo "  caught      $guard: $file planted"
  fi
  rm -rf "$tree"
}
plant operator-page-closeout framework/workflow.md "A plan does not patch it"
plant operator-page-closeout PORTABILITY-NOTES.md
plant readme-usable README.md "## What is Tropis?"
plant readme-usable PORTABILITY-NOTES.md
plant dependency-overrides templates/package.json '"test-exclude": "^8.0.0"'

# plant_add <kind> <text>: append a line to a file under an export-ignored path of the
# full copy and expect private-material to fail. The text is assembled by the caller so
# that this script does not match its own patterns.
plant_add() {
  local kind="$1" text="$2" file="docs/superpowers/specs/planted-private-material.md" tree
  tree="$(mktemp -d "${TMPDIR:-/tmp}/blueprint-plant-XXXXXX")"
  cp -R "$FULL/." "$tree/"
  mkdir -p "$tree/docs/superpowers/specs"
  printf 'first line\n%s\n' "$text" >> "$tree/$file"
  if run_guard "$tree" private-material; then
    echo "  NOT CAUGHT  private-material passed with a $kind planted"; framework=1
  else
    out="$(FRAMEWORK_ROOT="$tree" TROPIS_EXPECT_FRAMEWORK=1 \
      node --experimental-vm-modules "$NM/.bin/jest" --config "$STAGE/jest.config.js" \
      "guards/private-material.test.js" 2>&1 || true)"
    if printf '%s' "$out" | grep -qF "$file:2: $kind"; then
      echo "  caught      private-material: $kind planted in $file:2"
    else
      echo "  NOT NAMED   private-material failed on a $kind but did not name $file:2"; framework=1
    fi
  fi
  rm -rf "$tree"
}
if run_guard "$FULL" private-material; then
  echo "  passed      private-material on the full copy of HEAD"
else
  echo "  FAILED      private-material fails on the full copy of HEAD"; framework=1
fi
plant_add "home path" "/Us""ers/alice/notes"
plant_add "hostname" "run on alice-Mac""Book-Pro"
plant_add "hostname" "run on alice-lap""top.lo""cal"
plant_add "Atlassian site" "see acme.atlas""sian.net"
plant_add "session id" "id 123e4567-e89b-12d3-a456-4266141""74000"
plant_add "session id" "id session_""0123456789abcdefABCD"
plant_add "email" "mail alice@corp""mail.com"

echo
if [ "$conformance" -eq 0 ] && [ "$framework" -eq 0 ]; then
  echo "Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed."
else
  [ "$conformance" -ne 0 ] && echo "Self-check FAILED: conformance or the clean baseline (above)."
  [ "$framework" -ne 0 ] && echo "Self-check FAILED: the framework repository's own guards (above)."
  exit 1
fi
