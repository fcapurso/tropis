#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Sets this framework up inside a project's own repository: rules, framework documents,
# commands and hook wiring in .claude/, the framework's code in .tropis/, the entry
# file and the backlog at the root, and the lines that keep all of it out of an
# exported copy. Every command the framework offers then runs from .tropis/. The
# last step writes .tropis/installed.json.
#
# Refuses, changing nothing, when anything it would write is already there — a second
# run, or a project with its own CLAUDE.md — and when the project holds the framework
# in the layout this release no longer takes. Never commits.
#
# With a display name, setup writes it to .tropis/project.json, names the package after it
# and puts it at the head of the operator guide.
#
# Usage: bash <framework>/scripts/set-up-project.sh <project-root> [<display name>]

set -euo pipefail

BP="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(cd "${1:?usage: set-up-project.sh <project-root> [<display name>]}" && pwd -P)"
name="${2:-}"

top=$(git -C "$PROJECT" rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$top" ] || [ "$(cd "$top" && pwd -P)" != "$PROJECT" ]; then
  echo "set-up-project: $PROJECT is not the root of a git repository. Run git init there first." >&2
  exit 1
fi

if [ -e "$PROJECT/.framework" ]; then
  echo "set-up-project: $PROJECT holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and run this again." >&2
  exit 1
fi

present=()
for t in .claude/rules .claude/rule-areas.json .claude/framework .claude/commands .claude/settings.json \
         .cursor/rules .tropis CLAUDE.md AGENTS.md feature-catalog.yaml \
         docs/verification-log.md; do
  if [ -e "$PROJECT/$t" ]; then present+=("$t"); fi
done
if [ "${#present[@]}" -gt 0 ]; then
  echo "set-up-project: nothing changed — already present in $PROJECT:" >&2
  printf '  %s\n' "${present[@]}" >&2
  echo "Move them aside, run this again, then merge your own content back in." >&2
  exit 1
fi

mkdir -p "$PROJECT"/.claude/rules "$PROJECT"/.claude/framework "$PROJECT"/.claude/commands \
         "$PROJECT"/.tropis/rules "$PROJECT"/.tropis/hooks "$PROJECT"/.tropis/scripts \
         "$PROJECT"/.tropis/guards "$PROJECT"/.tropis/templates "$PROJECT"/docs

# Shipped rule texts live in .tropis/; their areas are the project's own data in
# .claude/rule-areas.json; generate-rules.mjs writes the files agents read, and the
# installed record is written after it.
cp "$BP"/rules/*.md "$PROJECT/.tropis/rules/"
cp "$BP"/templates/rule-areas.json "$PROJECT/.claude/rule-areas.json"
cp "$BP"/framework/*.md "$PROJECT/.claude/framework/"
cp "$BP"/commands/*.md "$PROJECT/.claude/commands/"
cp "$BP"/templates/settings.json "$PROJECT/.claude/settings.json"

# The install lists are the one place each set is named; check-conformance.sh builds the
# project the guards test from the same two files, so what ships is what is checked.
while read -r f; do
  if [ -n "$f" ]; then cp "$BP/scripts/$f" "$PROJECT/.tropis/hooks/"; fi
done < "$BP/scripts/installed-hooks.txt"
while read -r f; do
  if [ -n "$f" ]; then cp "$BP/scripts/$f" "$PROJECT/.tropis/scripts/"; fi
done < "$BP/scripts/installed-scripts.txt"
chmod +x "$PROJECT"/.tropis/hooks/*.sh "$PROJECT"/.tropis/scripts/*.sh

mkdir -p "$PROJECT/.github/workflows"
cp "$BP"/templates/github/*.yml "$PROJECT/.github/workflows/"

cp "$BP"/guards/catalog-entries.test.js "$BP"/guards/rule-areas.test.js \
   "$BP"/guards/rules-generated.test.js "$BP"/guards/installed-files.test.js \
   "$BP"/guards/entry-file.test.js "$BP"/guards/framework-integrity.test.js \
   "$BP"/guards/doc-currency.test.js "$BP"/guards/review-record.test.js \
   "$BP"/guards/plan-dispatchable.test.js "$BP"/guards/catalog-drift.test.js \
   "$BP"/guards/rule-claims.test.js "$BP"/guards/flush-drained.test.js \
   "$PROJECT/.tropis/guards/"
cp "$BP"/templates/project-layout.test.js "$PROJECT/.tropis/guards/"
cp "$BP"/templates/framework-jest.config.js "$PROJECT/.tropis/jest.config.js"
# The operator guide carries the display name, or the folder's name when there is none.
node -e '
const fs = require("node:fs");
const value = process.argv[3];
const text = fs.readFileSync(process.argv[1], "utf8");
fs.writeFileSync(process.argv[2], text.replaceAll("{{PROJECT_NAME}}", () => value));
' "$BP/templates/README.md" "$PROJECT/.tropis/README.md" "${name:-$(basename "$PROJECT")}"
if [ -n "$name" ]; then
  node -e 'process.stdout.write(JSON.stringify({ name: process.argv[1] }, null, 2) + "\n")' "$name" > "$PROJECT/.tropis/project.json"
fi
cp "$BP"/templates/project-brief.md "$BP"/templates/readme-skeleton.md "$PROJECT/.tropis/templates/"
cp "$BP"/templates/pipeline-caller.yml "$BP"/templates/staging-caller.yml \
   "$BP"/templates/github/main-branch-ruleset.json "$PROJECT/.tropis/templates/"
cp "$BP"/templates/backlog-board.html "$BP"/templates/backlog-bands.yaml "$PROJECT/.tropis/templates/"
mkdir -p "$PROJECT/docs/backlog-board"
cp "$BP"/templates/backlog-bands.yaml "$PROJECT/docs/backlog-board/bands.yaml"
# Bytes outside a-z and 0-9 become hyphens on any platform; a name with none falls back to the folder's.
slugify() { LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//'; }
slug=""
if [ -n "$name" ]; then slug=$(printf '%s' "$name" | slugify); fi
if [ -z "$slug" ]; then slug=$(basename "$PROJECT" | slugify); fi
sed "s/PROJECT_SLUG/$slug/" "$BP/templates/package.json" > "$PROJECT/.tropis/package.json"
sed "s/PROJECT_SLUG/$slug/" "$BP/templates/package-lock.json" > "$PROJECT/.tropis/package-lock.json"

cp "$BP"/templates/AGENTS.md "$PROJECT/AGENTS.md"
cp "$BP"/templates/CLAUDE.md "$PROJECT/CLAUDE.md"
cp "$BP"/templates/catalog.yaml "$PROJECT/feature-catalog.yaml"
cp "$BP"/templates/verification-log.md "$PROJECT/docs/verification-log.md"

# Appended once, never replacing the project's own lines. A line with a leading slash
# and the same line without one count as the same line.
append_once() {
  local file="$PROJECT/$1" line="$2"
  if [ -f "$file" ] && { grep -qxF -- "/${line#/}" "$file" || grep -qxF -- "${line#/}" "$file"; }; then
    return 0
  fi
  if [ -s "$file" ] && [ -n "$(tail -c1 "$file")" ]; then printf '\n' >> "$file"; fi
  printf '%s\n' "$line" >> "$file"
}
# An export-ignore line for $1, anchored to the root. Skipped when the project already has
# a line for that path, with or without the slash, that sets, unsets (-export-ignore) or
# unspecifies (!export-ignore) the attribute: a later line wins, so appending would undo
# a path the project keeps in its exports.
export_ignore_once() {
  local path="${1#/}"
  if [ -f "$PROJECT/.gitattributes" ] && awk -v p="$path" '
      { f = $1; sub(/^\//, "", f) }
      f == p { for (i = 2; i <= NF; i++) if ($i ~ /^[-!]?export-ignore$/) found = 1 }
      END { exit !found }' "$PROJECT/.gitattributes"; then
    return 0
  fi
  append_once .gitattributes "/$path export-ignore"
}
append_once .gitignore '.tropis/node_modules/'
append_once .gitignore '.claude/settings.local.json'
append_once .gitignore 'docs/backlog-board/index.html'
append_once .gitattributes '# The framework and its planning material: kept out of any exported copy (git archive).'
for p in .claude/ .cursor/ .tropis/ CLAUDE.md AGENTS.md feature-catalog.yaml \
         docs/superpowers/ docs/backlog-board/ docs/verification-log.md docs/project-brief.md docs/readme/ \
         docs/BLUEPRINT-UPSTREAM.md; do
  export_ignore_once "$p"
done

node "$PROJECT/.tropis/scripts/generate-rules.mjs"

version=$(git -C "$BP" describe --tags --always 2>/dev/null || true)
[ -n "$version" ] || version=unknown
# Where the next update fetches from: the checkout's origin, or its own path
# when it was not cloned (a local copy, a probe).
framework_source=$(git -C "$BP" remote get-url origin 2>/dev/null || true)
if [ -z "$framework_source" ]; then
  framework_source=$(cd "$BP" && pwd -P)
fi
node "$PROJECT/.tropis/scripts/record-installed.mjs" "$version" "$framework_source"

echo "Set the framework up in $PROJECT."
echo "Next, from there: npm --prefix .tropis ci, then npm --prefix .tropis test, then commit."
