#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# capture-at-merge.sh — PreToolUse hook for Bash.
#
# Fires when a plan is being merged. Surfaces the routing questions that the
# review record's "Learnings routed" section owes, and points at the
# documentation closeout table. The `if` in settings.json is an optimisation;
# this script still checks the command itself and exits silently otherwise.

set -u

payload=$(cat)
. "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
reply_on_exit

# The reply goes through hook-reply.sh, measured to reach Claude Code and not
# refused by Cursor — see .claude/rules/harness-scripts.md. No tool gate: the
# same reply is sent whichever tool runs this.

command=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', '') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")

# Match a plan merge at command position (command-at-position.py). Do not rely
# on settings.json `if` alone.
printf '%s' "$command" | python3 "$(dirname "${BASH_SOURCE[0]}")/command-at-position.py" 'gh pr merge' || exit 0

cat <<'EOF'
Merging a plan — what did it teach, and what did it build?

- What did this teach that is true beyond this plan?
- What did it build — a command, a guard, a script — that a set-up project would want? That owes an upstream queue entry, exactly as a lesson does.
- Where was it written: a rule, a decision record, the blueprint upstream, a catalog entry?
- If nothing generalises, say so in the review record's Learnings routed section rather than leaving it blank.
- The doc-closeout table applies now too — see .claude/framework/workflow.md.
- The Review record is owed BEFORE this merge, on the plan file. If you are
  self-merging, you are the merging party and it is yours to write — there is no
  separate reviewer coming. A plan whose handover is on main and has no record
  turns the suite red, and not on your branch: on the next one to rebase.
EOF

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# Installed at .tropis/hooks/, two levels below the project root.
project_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
# Prefer git toplevel when available
if toplevel=$(git rev-parse --show-toplevel 2>/dev/null); then
  project_root="$toplevel"
fi
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
plans_dir="$project_root/docs/superpowers/plans"

if [ -d "$plans_dir" ] && [[ "$branch" == plan/* ]]; then
  node --input-type=module -e '
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
const branch = process.argv[1];
const plansDir = process.argv[2];
function extractSection(markdown, heading) {
  const re = new RegExp("^## " + heading + "\\s*$", "m");
  const m = re.exec(markdown);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = markdown.slice(start);
  const next = /^## /m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}
function deliveredIds(markdown) {
  const section = extractSection(markdown, "Delivers");
  if (section == null) return null;
  const body = section.replace(/<!--[\\s\\S]*?-->/g, "").trim();
  if (body === "None.") return [];
  const ids = [];
  for (const line of body.split("\\n")) {
    for (const part of line.split(",")) {
      const tok = part.trim().replace(/^[-*]\\s*/, "");
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tok)) ids.push(tok);
    }
  }
  return ids;
}
function findPlanForBranch(plansDir, branchName) {
  const suffix = branchName.replace(/^plan\\//, "");
  const matches = readdirSync(plansDir)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => basename(f).slice(11) === suffix + ".md" || basename(f) === suffix + ".md" || basename(f).endsWith("-" + suffix + ".md"));
  // dated YYYY-MM-DD-suffix.md
  const dated = readdirSync(plansDir).filter((f) => f.endsWith(".md") && f.slice(11) === suffix + ".md");
  const files = dated.length ? dated : matches;
  if (files.length !== 1) throw new Error(files.length === 0 ? "not found" : "ambiguous");
  return join(plansDir, files[0]);
}
try {
  const plan = findPlanForBranch(plansDir, branch);
  const ids = deliveredIds(readFileSync(plan, "utf8"));
  process.stdout.write("\\nDelivers (promote before merge):\\n");
  if (ids == null) process.stdout.write("- (missing ## Delivers heading)\\n");
  else if (ids.length === 0) process.stdout.write("- None.\\n");
  else for (const id of ids) process.stdout.write("- " + id + " — is it shipped?\\n");
} catch (e) {
  process.stdout.write("\\nDelivers: could not resolve plan for " + branch + " (" + e.message + ")\\n");
}
' "$branch" "$plans_dir" 2>/dev/null || true
fi

exit 0
