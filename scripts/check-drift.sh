#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Says whether a project's copies of this blueprint's scripts have drifted from the
# shared machinery. A copy is supposed to differ only in the regions it marks
# project-owned — like the blocks commands such as `release.md` mark;
# framework-commit-check.sh has one, for the paths that may go straight to main.
# Anything else that differs is either a fix every project needs
# or a change that belongs in a project-owned region, and the two look identical until
# somebody looks.
#
# Compares every script under the project's .tropis/hooks/ and .tropis/scripts/
# that has a namesake in this blueprint's scripts/, ignoring comments, blank lines and
# project-owned regions.
#
# Usage: bash scripts/check-drift.sh <project-root>

set -uo pipefail

BP="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(cd "${1:?usage: check-drift.sh <project-root>}" && pwd)"

# Code only: drop project-owned regions, comments and blank lines.
normalise() {
  awk '
    /(#|\/\/) project-owned: begin/ { skip = 1; next }
    /(#|\/\/) project-owned: end/ { skip = 0; next }
    skip { next }
    /^[[:space:]]*$/ { next }
    /^[[:space:]]*(#|\/\/|\*|\/\*)/ { next }
    { print }
  ' "$1"
}

echo "Drift check: $PROJECT against $BP ($(git -C "$BP" rev-parse --short HEAD 2>/dev/null || echo 'not a git checkout'))"
echo

checked=0
drifted=0
for copy in "$PROJECT"/.tropis/hooks/* "$PROJECT"/.tropis/scripts/*; do
  [ -f "$copy" ] || continue
  shared="$BP/scripts/$(basename "$copy")"
  [ -f "$shared" ] || continue
  checked=$((checked + 1))
  rel="${copy#"$PROJECT"/}"
  if diff -q <(normalise "$shared") <(normalise "$copy") >/dev/null; then
    printf '  clean    %s\n' "$rel"
  else
    printf '  DRIFTED  %s\n' "$rel"
    diff <(normalise "$shared") <(normalise "$copy") | sed 's/^/             /'
    drifted=$((drifted + 1))
  fi
done

echo
if [ "$checked" -eq 0 ]; then
  echo "No script under .tropis/hooks/ or .tropis/scripts/ has a namesake in the blueprint."
  exit 2
fi
if [ "$drifted" -eq 0 ]; then
  echo "$checked script(s) match the blueprint outside their project-owned regions."
  exit 0
fi
echo "$drifted of $checked script(s) differ from the blueprint outside their project-owned regions."
echo "For each: if the project's version fixes something every project needs, queue it in"
echo "the upstream queue so the blueprint gets it. If it changed shared machinery for this"
echo "project alone, move the change into a project-owned region, or restore the"
echo "blueprint's version."
exit 1
