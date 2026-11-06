#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# own-session-guard.sh — PreToolUse hook for the cloud session tools that stop a session.
#
# Refuses a call to interrupt or archive the cloud session the calling agent runs in. A
# subagent makes its tool calls in the session of the agent that started it, so that call
# stops its dispatcher, and nothing resumes it until a person does: an executor that had
# finished its plan once interrupted the sprint team member that dispatched it, and the
# session sat idle for hours, shown as building, with the items merging after it held
# up. A call aimed at another session goes through: a sprint session legitimately stops
# a team member, which is a session of its own.
#
# It refuses rather than advises: the reply of an advising hook arrives with the call,
# which still runs, and there is no agent left to read the advice. A hook that stops a
# call exits 2 with its message on stderr — measured to refuse the call and reach the
# agent in both Claude Code and Cursor (harness-scripts.md). It does not use
# hook-reply.sh: that is the reply of a hook that lets the call run.
#
# The session's own id comes from the environment: a Claude Code cloud session holds
# CLAUDE_CODE_REMOTE_SESSION_ID=cse_<X>, and the session tools name the same session
# session_<X>, so the two are compared after their first underscore. Outside a cloud
# session the variable is absent and the hook says nothing. The tool name is matched on
# its suffix, whatever the server's name: that is the project's choice.

set -u

payload=$(cat)

# One line each: the tool name, then the session id the call names. Malformed JSON reads
# as empty, and an empty tool name matches nothing below.
fields=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tool_input = data.get('tool_input') or {}
    print(str(data.get('tool_name', '') or ''))
    print(str(tool_input.get('session_id', '') or ''))
except Exception:
    print('')
    print('')
" 2>/dev/null || printf '\n\n')

tool_name=$(printf '%s\n' "$fields" | sed -n '1p')
session_id=$(printf '%s\n' "$fields" | sed -n '2p')

case "$tool_name" in
  *__interrupt_session) verb=interrupt ;;
  *__archive_session) verb=archive ;;
  *) exit 0 ;;
esac

own=${CLAUDE_CODE_REMOTE_SESSION_ID:-}
[ -n "$own" ] || exit 0
[ -n "$session_id" ] || exit 0

# cse_X and session_X name one session: compare what follows the first underscore. An id
# with no underscore compares whole.
[ "${own#*_}" = "${session_id#*_}" ] || exit 0

cat >&2 <<EOF
Refused: this would $verb the session you are running in ($session_id).
A subagent runs in the session of the agent that started it, so this stops that agent too, and nothing resumes it until a person does.
To finish, end your turn and return your report: the agent that dispatched you reads it.
(own-session-guard.sh)
EOF
exit 2
