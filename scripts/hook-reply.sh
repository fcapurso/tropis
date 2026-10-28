#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# hook-reply.sh — sourced by every PreToolUse hook that speaks to the agent.
#
# A hook's plain stdout reaches no agent: Claude Code drops it, and Cursor refuses the
# call ("returned invalid JSON"). What reaches the agent in both is one JSON object,
# hookSpecificOutput.additionalContext — measured on 2026-10-09 in the project this
# framework came from, in Claude Code 2.1.260, 2.1.289 and 2.1.295 and Cursor 3.23.12;
# the table is in .claude/rules/harness-scripts.md. This file is the only place that
# shape is written.
#
#   . "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
#   reply_on_exit
#
# After reply_on_exit, the hook prints as it always did; everything it printed is sent as
# one reply when it exits, and nothing at all is sent when it printed nothing. Its exit
# status is untouched.
#
# The reply never carries a permission key. Cursor reads "permission" as the hook's
# verdict on the call, and a hook that answers "allow" has approved whatever it saw.
# Neither tool hears "agent_message", so it is not sent either.
#
# The reply is the same whichever tool runs the hook. Do not choose a shape by detecting
# the tool: one shape is heard by both.

# reply_context <text> — print <text> as a reply the agent receives.
reply_context() {
  printf '%s' "$1" | python3 -c '
import json, sys
text = sys.stdin.read()
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": sys.argv[1], "additionalContext": text},
}))' "${_hook_reply_event:-PreToolUse}"
}

# reply_on_exit [event] — capture everything printed from here on, and send it as one
# reply. The event defaults to PreToolUse. The buffer's name needs no per-installation
# prefix: mktemp makes it unique.
reply_on_exit() {
  _hook_reply_event="${1:-PreToolUse}"
  _hook_reply_buf=$(mktemp "${TMPDIR:-/tmp}/hook-reply.XXXXXX")
  exec 3>&1 >"$_hook_reply_buf"
  trap '_hook_reply_flush' EXIT
}

_hook_reply_flush() {
  exec 1>&3 3>&-
  if [ -s "$_hook_reply_buf" ]; then
    reply_context "$(cat "$_hook_reply_buf")"
  fi
  rm -f "$_hook_reply_buf"
}
