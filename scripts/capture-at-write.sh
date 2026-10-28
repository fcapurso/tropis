#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# capture-at-write.sh — PreToolUse hook for Edit and Write.
#
# Fires when a rule, rule addition, decision record, or framework document
# is being written. Prints the three-question quality check from
# .claude/commands/capture-learning.md — the only copy. The command
# remains invocable by hand.
#
# Do not add a CLAUDECODE gate. One reply is heard in both tools; it is sent
# through hook-reply.sh (.claude/framework/DECISIONS.md FW-008).
#
# Path resolution strips against the physical project root (239cd19).

set -u

payload=$(cat)
. "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
reply_on_exit

# Claude Code PreToolUse puts the target under tool_input.file_path, and Cursor
# sends the same nested envelope. Tests also send a top-level file_path. Read both.
# Do not read `path`.
path=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    nested = data.get('tool_input') or {}
    print(data.get('file_path', '') or (nested.get('file_path', '') if isinstance(nested, dict) else '') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")
[ -z "$path" ] && exit 0

session=$(printf '%s' "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null || echo "")
[ -z "$session" ] && session="default"

if ! project_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  # Installed at .tropis/hooks/, two levels below the project root.
  project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
fi
if resolved_dir=$(cd "$(dirname "$path")" 2>/dev/null && pwd -P); then
  path="$resolved_dir/$(basename "$path")"
fi
case "$path" in
  "$project_root"/*) path="${path#"$project_root"/}" ;;
esac

case "$path" in
  # DECISIONS.md is the project's decision record at the git root.
  # A framework-only record lives at .claude/framework/DECISIONS.md.
  DECISIONS.md|.claude/rules/*|.claude/rule-additions/*|.claude/framework/*) ;;
  *) exit 0 ;;
esac

marker_dir="${TMPDIR:-/tmp}/capture-write-${session}"
mkdir -p "$marker_dir" 2>/dev/null || true
if [ -f "$marker_dir/emitted" ]; then
  exit 0
fi

src="$project_root/.claude/commands/capture-learning.md"
[ -f "$src" ] || exit 0

check=$(awk '
  /<!-- capture-check:begin -->/ { p=1; next }
  /<!-- capture-check:end -->/ { p=0; next }
  p
' "$src")
[ -n "$check" ] || exit 0

printf '%s\n' "$check"
: > "$marker_dir/emitted"
exit 0
