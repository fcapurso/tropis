#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Proves every guard can fail.
#
# For each planted defect: compose the fixture tree, point the guards at it, and require
# the guard to fail. Then run the clean baseline and require every guard to pass.
#
# A guard that has only ever passed may be correct, or may be checking nothing. These two
# look identical until you make it fail on purpose.
#
# Run by check-blueprint.sh, which stages the blueprint and sets the paths below.

set -uo pipefail

TEST_CMD="${TEST_CMD:-npm test --}"
FIXTURES="${FIXTURES:-fixtures}"
SCRIPTS="${SCRIPTS:-scripts}"
WORK="${TMPDIR:-/tmp}/conformance-$$"

# Set by check-blueprint.sh to a blueprint checkout. Its shipped instruction layer then
# replaces the base fixture's stubs, so the clean baseline reads the real rules, framework
# documents and commands. Unset, the base fixture's stubs are what is tested.
INSTRUCTIONS="${INSTRUCTIONS:-}"

# defect directory : guard filename fragment
CASES="
orphan-rule:rule-areas
stale-verification:doc-currency
stale-picks:doc-currency
missing-review:review-record
projection-drift:rules-generated
hand-edited-rule:rules-generated
orphan-addition:rules-generated
stale-addition:rules-generated
edited-framework-file:installed-files
plain-reply:rule-delivery
unpromoted-delivery:catalog-drift
future-dated-plan:catalog-drift
silent-shelf:catalog-drift
undispatchable-plan:plan-dispatchable
unpaired-projection:plan-dispatchable
incomplete-entry:catalog-entries
idea-omits-a-field:catalog-entries
duplicate-id:catalog-entries
dangling-after:catalog-entries
order-cycle:catalog-entries
shipped-with-blocker:catalog-entries
superseded-shipped:catalog-entries
shelved-not-true:catalog-entries
shelf-on-building:catalog-entries
spike-with-modules:catalog-entries
missing-module:catalog-entries
entry-file-not-pointer:entry-file
entry-agents-is-symlink:entry-file
entry-agents-is-import:entry-file
dangling-reference:framework-integrity
unasserted-clause:rule-claims
clause-unknown-entry:rule-claims
orphan-assertion:rule-claims
"

fail=0

# The duplication this exists to prevent, checked before anything runs: if the base
# fixture grows its own copy of a shipped script again, the run below stops proving
# anything about what ships.
strays=$(find "$FIXTURES/base" -name '*.sh' 2>/dev/null || true)
if [ -n "$strays" ]; then
  echo "The base fixture carries its own scripts. It must not — they shadow the ones that ship:"
  printf '  %s\n' $strays
  echo "Delete them; compose() copies the shipped scripts in."
  exit 1
fi

# What the setup installs from the blueprint, laid over the base fixture: the shipped
# rule texts and their areas, framework documents, commands, hook wiring and entry-file
# template. The rule files agents read are generated afterwards, by compose(), with the
# shipped generator.
install_instructions() {
  cp "$INSTRUCTIONS"/rules/*.md "$WORK/.tropis/rules/"
  cp "$INSTRUCTIONS"/templates/rule-areas.json "$WORK/.claude/rule-areas.json"
  cp "$INSTRUCTIONS"/templates/settings.json "$WORK/.claude/settings.json"
  cp "$INSTRUCTIONS"/framework/*.md "$WORK/.claude/framework/"
  cp "$INSTRUCTIONS"/commands/*.md "$WORK/.claude/commands/"
  cp "$INSTRUCTIONS"/templates/AGENTS.md "$WORK/AGENTS.md"
  cp "$INSTRUCTIONS"/templates/CLAUDE.md "$WORK/CLAUDE.md"
}

# The base fixture deliberately carries no scripts of its own: the hooks under test are
# the ones that ship, copied in here. A fixture that kept its own copies would be checked
# instead of them, and a fix applied to one would not be applied to the other — which is
# exactly how a hook shipped for six weeks looking for its rules in the wrong place while
# the conformance run passed against a corrected copy.
#
# Order matters. The shipped hooks and scripts land in .tropis/hooks/ and
# .tropis/scripts/ after the base and before the defect overlay,
# so a defect that plants a broken hook still wins.
compose() {
  rm -rf "$WORK"
  cp -R "$FIXTURES/base" "$WORK"
  mkdir -p "$WORK/.tropis/hooks" "$WORK/.tropis/scripts"
  while read -r f; do
    [ -n "$f" ] || continue
    cp "$SCRIPTS/$f" "$WORK/.tropis/hooks/"
  done < "$SCRIPTS/installed-hooks.txt"
  while read -r f; do
    [ -n "$f" ] || continue
    cp "$SCRIPTS/$f" "$WORK/.tropis/scripts/"
  done < "$SCRIPTS/installed-scripts.txt"
  echo '{"type":"module"}' > "$WORK/.tropis/package.json"
  [ -n "$INSTRUCTIONS" ] && install_instructions
  node "$WORK/.tropis/scripts/generate-rules.mjs" >/dev/null
  node "$WORK/.tropis/scripts/record-installed.mjs" conformance >/dev/null
  [ -n "${1:-}" ] && cp -R "$FIXTURES/defects/$1/." "$WORK/"
  return 0
}

echo "Conformance: every guard must fail on its planted defect"
echo

# A guard is credited with a catch only if it passes the clean project first. One that
# fails there — a syntax error, a runner that cannot load it, a path that does not
# resolve — would fail on the planted defect too, for a reason that has nothing to do
# with it. Five such failures were once reported as catches; the clean baseline below
# still said otherwise, but every line above it was wrong.
for case in $CASES; do
  defect="${case%%:*}"
  guard="${case##*:}"
  compose ""
  if ! FRAMEWORK_ROOT="$WORK" $TEST_CMD "$guard" >/dev/null 2>&1; then
    printf '  CANNOT RUN  %-22s %s fails on the clean project, so its failure proves nothing\n' "$defect" "$guard"
    fail=$((fail + 1))
    continue
  fi
  compose "$defect"
  if FRAMEWORK_ROOT="$WORK" $TEST_CMD "$guard" >/dev/null 2>&1; then
    printf '  NOT CAUGHT  %-22s %s passed against a broken project\n' "$defect" "$guard"
    fail=$((fail + 1))
  else
    printf '  caught      %-22s %s\n' "$defect" "$guard"
  fi
done

echo
echo "Clean baseline: every guard must pass"
compose ""
if FRAMEWORK_ROOT="$WORK" $TEST_CMD >/dev/null 2>&1; then
  echo "  ok          clean baseline"
else
  echo "  FAILED      clean baseline — a guard fails on a project with nothing wrong"
  FRAMEWORK_ROOT="$WORK" $TEST_CMD 2>&1 | grep -E '^  ● ' | sort -u | sed 's/^  ●/              ●/'
  fail=$((fail + 1))
fi

rm -rf "$WORK"

echo
if [ "$fail" -gt 0 ]; then
  echo "$fail problem(s). A guard that cannot fail is not evidence."
  exit 1
fi
echo "Every guard caught its defect and passed the clean baseline."
exit 0
