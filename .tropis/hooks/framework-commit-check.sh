#!/usr/bin/env bash
# One part of this file is project-owned: the block naming the paths that may go straight to main.
# Shared machinery: everything outside that block.
# framework-commit-check.sh — PreToolUse hook for Bash.
#
# Fires when a commit is about to carry a change the workflow says belongs on
# a branch. The instruction layer (.claude/rules/, .claude/rule-additions/,
# .claude/framework/) and commands are named on every branch. On main, every
# other path is named too: all of them where .claude/project.json records no
# "ungated", since a gated main takes nothing but pull requests, and those
# outside the project-owned list where it records a reason. Those files are
# executed by every later session, so workflow.md requires the instruction
# layer to arrive on a branch and to state what its fresh-agent check found.
#
# Both halves were written as text first, and neither reached a fresh agent
# under test. Two probes, one of them asked outright to enumerate every
# obligation on the commit, quoted the closeout row truncated at exactly the
# clause that carries this. The instruction was correct, bolded, and stated in
# two places; workflow.md is ~300 lines arriving as one blob, and nothing fired
# at the moment the commit was written. This is that moment.
#
# The `if` in settings.json is an optimisation; this script re-checks the
# command itself and exits silently otherwise.

set -u

# project-owned: begin — the paths that may go straight to main (workflow.md, Branching).
# One extended regular expression, matched against each changed path. As shipped: the
# backlog, the release notes /release commits on main, the README /refresh-readme commits,
# and everything under docs/
# (plans, specs, generated documentation, prose). Add your own generated documentation
# here if it lives elsewhere, and your notes file if it is not RELEASES.md.
may_go_to_main='^(feature-catalog\.yaml$|RELEASES\.md$|README\.md$|docs/)'
# project-owned: end

payload=$(cat)
. "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
reply_on_exit

# The reply goes through hook-reply.sh, measured to reach Claude Code and not
# refused by Cursor — see .claude/rules/harness-scripts.md. No tool gate: this
# hook used to say nothing outside Claude Code because Cursor refused its plain
# stdout; the JSON reply is accepted by both, so the same reply goes to both.

command=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', '') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")

# Match a commit at command position (command-at-position.py). Do not rely
# on settings.json `if` alone.
printf '%s' "$command" | python3 "$(dirname "${BASH_SOURCE[0]}")/command-at-position.py" 'git commit' || exit 0

# Look at everything the working tree has moved — staged, unstaged, untracked.
# Checking only the index would miss the common shape `git add -A && git commit`
# in a single call, where nothing is staged yet when this hook runs.
#
# -uall is load-bearing: without it git collapses a wholly-untracked directory to
# its top level, so a new rule file in a fresh tree reports as `.claude/` and
# matches nothing.
changed=$(git status --porcelain -uall 2>/dev/null | sed 's/^...//; s/.* -> //')

instruction=$(printf '%s\n' "$changed" | grep -E '^\.claude/(rules|rule-additions|framework)/' || true)
commands=$(printf '%s\n' "$changed" | grep -E '^\.claude/commands/' || true)
elsewhere=$(printf '%s\n' "$changed" | grep -E -v '^\.claude/(rules|rule-additions|framework|commands)/' | grep -E -v "$may_go_to_main" || true)

# --show-current, not `rev-parse --abbrev-ref HEAD`: the latter fails outright on
# a repository with no commits yet, which is exactly the state a project freshly
# bootstrapped from the blueprint is in.
branch=$(git branch --show-current 2>/dev/null || echo "")

# Whether .claude/project.json records why main is not gated: "ungated" as a
# string with words in it. No repository root, or any failure, is no reason.
top=$(git rev-parse --show-toplevel 2>/dev/null || true)
ungated=no
if [ -n "$top" ]; then
  ungated=$(python3 -c "
import json, sys
try:
    with open(sys.argv[1], encoding='utf-8') as f:
        data = json.load(f)
    value = data.get('ungated') if isinstance(data, dict) else None
    print('yes' if isinstance(value, str) and value.strip() else 'no')
except Exception:
    print('no')
" "$top/.claude/project.json" 2>/dev/null || echo no)
fi

if [ "$branch" != "main" ]; then
  elsewhere=
elif [ "$ungated" != yes ]; then
  elsewhere=$(printf '%s\n' "$changed" | grep -E -v '^\.claude/(rules|rule-additions|framework|commands)/' | grep -E -v '^$' || true)
fi
if [ -z "$instruction" ] && [ -z "$commands" ] && [ -z "$elsewhere" ]; then
  exit 0
fi

if [ -n "$instruction" ]; then
  echo "This commit touches the instruction layer:"
  printf '%s\n' "$instruction" | sed 's/^/  /'
  echo

  if [ "$branch" = "main" ]; then
    cat <<'EOF'
You are on main. workflow.md requires a change under .claude/rules/,
.claude/rule-additions/ or .claude/framework/ to arrive on a branch: an error
in one of these is executed silently by every later session until something
external catches it.

EOF
  fi

  cat <<'EOF'
The commit body must say what the fresh-agent check found — what the agent was
asked to do, whether it found what the change intended it to find, and which
tool and version ran it, on which operating system and architecture — never the
computer's name. A check whose result lives only in the session that ran it is
a check nobody after you can see.

If the check has not been run, it is owed before this closes. See the
doc-closeout table in .claude/framework/workflow.md.
EOF
fi

if [ -n "$commands" ]; then
  if [ -n "$instruction" ]; then
    echo
  fi
  echo "This commit touches commands:"
  printf '%s\n' "$commands" | sed 's/^/  /'
  echo
  cat <<'EOF'
A command changes how every later session behaves. The commit body must say what
changed and why. A fresh-agent check is owed only if the edit changes what an agent
is told to do; if it does, record it in the body as for a rule.
EOF
  if [ "$branch" = "main" ]; then
    echo
    echo "You are on main. workflow.md requires a change under .claude/commands/ to arrive on a branch."
  fi
fi

if [ -n "$elsewhere" ]; then
  if [ -n "$instruction" ] || [ -n "$commands" ]; then
    echo
  fi
  echo "You are on main, and this commit carries files the workflow says belong on a branch:"
  printf '%s\n' "$elsewhere" | sed 's/^/  /'
  echo
  if [ "$ungated" != yes ]; then
    cat <<'EOF'
This project's main branch is gated: .claude/project.json records no "ungated", so
nothing reaches main except through a pull request (workflow.md, Branching). Commit on
a branch, push it, open a pull request, and run gh pr merge <N> --auto --squash with
--subject and --body; it merges itself once its checks pass.
EOF
  else
    cat <<'EOF'
What may go directly to main is the backlog, generated documentation, plan and spec
files, the release notes, the README, and prose under docs/ (workflow.md, Branching). Commit these
on a branch.
EOF
  fi
fi

exit 0
