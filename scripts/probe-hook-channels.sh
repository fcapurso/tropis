#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# probe-hook-channels.sh — build a throwaway project that measures what an agent
# actually receives from a PreToolUse hook, in whichever tool opens it.
#
# Usage: bash .tropis/scripts/probe-hook-channels.sh <dir>
#
# Creates one project, <dir>, with real .claude/ and .cursor/ folders and its probe hooks
# under <dir>/.tropis/hooks/. (2026-10-09: links were measured once and loaded nothing;
# the framework no longer uses them.) Open <dir> in the tool being measured and give the
# agent the text of PROMPT.md. The agent writes its report to probe-answer.md; every hook
# invocation appends its payload to probe-log/, so whether a hook ran is never inferred
# from what the agent says.
#
# One hook, wired on Read, Write and Bash, answers in the shape named in the file or
# command it sees:
#   silent       exit 0, nothing printed (the control)
#   plain        Markdown on stdout, exit 0
#   ccjson       {"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":…}}
#                — what hook-reply.sh sends
#   cursorsnake  {"permission":"allow","agent_message":…,"user_message":…}
#   cursorcamel  {"permission":"allow","agentMessage":…,"userMessage":…}
#   both         ccjson and cursorsnake keys in one object
#   agentonly    {"agent_message":…} — no permission key
#   mixed        ccjson plus agent_message, no permission key
#   block        the nonce on stderr, exit 2
# Each reply carries NONCE-<SHAPE>, so the report says which shape reached the agent.
#
# Two rule files carry RULE-NONCE-CLAUDE (.claude/rules/probe.md, no frontmatter) and
# RULE-NONCE-CURSOR (.cursor/rules/probe.mdc, globs probe-*.txt), to measure what each
# tool loads natively without any hook.
#
# A second Bash hook carries "if": "Bash(echo probe-iftest*)" and only logs the command
# it saw, to probe-log/if-fired.log — so the log shows whether the tool honours `if`: one
# line for `echo probe-iftest` means yes, a line per command means it fires regardless.
#
# Record the tool, its version, the operating system and the architecture with the
# result, never the computer's name, and update the table in
# .claude/rules/harness-scripts.md. This is a measurement, not a hook: nothing wires it.

set -euo pipefail

dir="${1:?usage: probe-hook-channels.sh <dir>}"
[ -e "$dir" ] && { echo "probe: $dir exists — choose a new directory" >&2; exit 1; }
mkdir -p "$dir/.claude/rules" "$dir/.tropis/hooks" "$dir/.cursor/rules" "$dir/probe-log"
dir="$(cd "$dir" && pwd -P)"

shapes="silent plain ccjson cursorsnake cursorcamel both agentonly mixed block"

cat > "$dir/.tropis/hooks/probe-hook.sh" <<'HOOK'
#!/usr/bin/env bash
set -u
payload=$(cat)
log_dir="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)/probe-log"
mkdir -p "$log_dir"
subject=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print(''); sys.exit()
t = d.get('tool_input') or {}
t = t if isinstance(t, dict) else {}
print(t.get('file_path') or t.get('path') or t.get('command') or d.get('file_path') or d.get('path') or d.get('command') or '')
")
shape=$(printf '%s' "$subject" | sed -n 's/.*probe-\([a-z]*\).*/\1/p' | head -1)
printf '%s\n' "$payload" >> "$log_dir/${shape:-none}.log"
nonce="NONCE-$(printf '%s' "$shape" | tr '[:lower:]' '[:upper:]')"
msg="Probe hook reply in shape '$shape'. Quote this token in your report: $nonce"
json() { python3 -c 'import json,sys; print(json.dumps(json.loads(sys.argv[1])))' "$1"; }
case "$shape" in
  plain) printf '## Probe\n\n%s\n' "$msg" ;;
  ccjson) json "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"$msg\"}}" ;;
  cursorsnake) json "{\"permission\":\"allow\",\"agent_message\":\"$msg\",\"user_message\":\"$msg\"}" ;;
  cursorcamel) json "{\"permission\":\"allow\",\"agentMessage\":\"$msg\",\"userMessage\":\"$msg\"}" ;;
  both) json "{\"permission\":\"allow\",\"agent_message\":\"$msg\",\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"$msg\"}}" ;;
  agentonly) json "{\"agent_message\":\"$msg\"}" ;;
  mixed) json "{\"agent_message\":\"$msg\",\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"$msg\"}}" ;;
  block) printf '%s\n' "$msg" >&2; exit 2 ;;
  *) ;;
esac
exit 0
HOOK

cat > "$dir/.tropis/hooks/probe-if.sh" <<'HOOK'
#!/usr/bin/env bash
payload=$(cat)
log_dir="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)/probe-log"
mkdir -p "$log_dir"
printf '%s' "$payload" | python3 -c "
import sys, json
try: print((json.load(sys.stdin).get('tool_input') or {}).get('command', ''))
except Exception: print('')
" >> "$log_dir/if-fired.log"
exit 0
HOOK

cat > "$dir/.claude/settings.json" <<'JSON'
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Read", "hooks": [{ "type": "command", "command": "bash .tropis/hooks/probe-hook.sh" }] },
      { "matcher": "Write", "hooks": [{ "type": "command", "command": "bash .tropis/hooks/probe-hook.sh" }] },
      { "matcher": "Bash", "hooks": [
        { "type": "command", "command": "bash .tropis/hooks/probe-hook.sh" },
        { "type": "command", "command": "bash .tropis/hooks/probe-if.sh", "if": "Bash(echo probe-iftest*)" }
      ] }
    ]
  }
}
JSON

printf '# Probe rule\n\nIf asked, quote this token: RULE-NONCE-CLAUDE\n' > "$dir/.claude/rules/probe.md"
printf -- '---\ndescription: probe rule\nglobs: ["probe-*.txt"]\nalwaysApply: false\n---\n\n# Probe rule\n\nIf asked, quote this token: RULE-NONCE-CURSOR\n' \
  > "$dir/.cursor/rules/probe.mdc"

for s in $shapes; do printf 'FILE-CONTENT-%s\n' "$s" > "$dir/probe-$s.txt"; done

reads=""; cmds=""
for s in $shapes; do reads="$reads probe-$s.txt,"; cmds="$cmds \`echo probe-$s\`,"; done
cmds="$cmds \`echo probe-iftest\`,"
cat > "$dir/PROMPT.md" <<EOF
This is a measurement probe. Do exactly the steps below and nothing else. Do not
explain, fix, or investigate anything you see; only report it.

1. Before using any tool, quote exactly every piece of text you have been given that
   contains RULE-NONCE, or write "none".
2. Read each of these files with your file-reading tool, one call per file, in this
   order:${reads%,}. For each file report: whether the read succeeded, was refused, or
   errored (quote any refusal or error text exactly); and every piece of text you
   received alongside it that is not the file's own content — quote anything containing
   NONCE exactly, or write "none".
3. Run each of these shell commands, one call per command, in this order:${cmds%,}.
   Report the same three things for each.
4. Repeat step 1.
5. Write your full report, steps 1 to 4, to probe-answer.md in this folder.
EOF

( cd "$dir" && git init -q && printf 'probe-log/\nprobe-answer.md\n' > .gitignore \
  && git add -A && git -c user.email=p@p -c user.name=p commit -qm probe )

echo "probe: open $dir in the tool to measure, and give the agent the text of $dir/PROMPT.md"
