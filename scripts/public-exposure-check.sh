#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# public-exposure-check.sh — PreToolUse hook for Bash.
#
# In a public project, tells the agent at `git commit` and `git push` to read what is
# about to be committed or pushed for private material, and to ask the developer before
# going on if it finds any. A project is public when .tropis/project.json at the
# repository root holds {"public": true}; absent, unreadable, or anything but true means
# not public, and the hook says nothing.
#
# A push is where content becomes exposed, and a commit is the last moment it is cheap
# to take out. A guard knows only the names it was given; a reader of the diff catches
# the next one, so this hook asks for a reader rather than matching names. It never
# blocks: exit 0 always.
#
# Wired once with no `if` (harness-scripts.md, Wire a hook once): it has two triggers,
# and Cursor ignores `if` anyway. It matches both itself, at command position.

set -u

payload=$(cat)
. "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
reply_on_exit

command=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', '') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")

matcher="$(dirname "${BASH_SOURCE[0]}")/command-at-position.py"
commit=no
push=no
printf '%s' "$command" | python3 "$matcher" 'git commit' && commit=yes
printf '%s' "$command" | python3 "$matcher" 'git push' && push=yes
if [ "$commit" = no ] && [ "$push" = no ]; then
  exit 0
fi

# The repository root from git, never pwd: a relative lookup misses from every
# subdirectory, and misses silently. Outside a repository, two levels above the hook.
top=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$top" ]; then
  top="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

public=$(python3 -c "
import json, sys
try:
    with open(sys.argv[1], encoding='utf-8') as f:
        data = json.load(f)
    print('yes' if isinstance(data, dict) and data.get('public') is True else 'no')
except Exception:
    print('no')
" "$top/.tropis/project.json" 2>/dev/null || echo no)
if [ "$public" != yes ]; then
  exit 0
fi

# $1: commit or push. $2: what to read, and how.
say() {
  cat <<EOF
This repository is public: what you are about to $1 will be readable by
anyone once pushed, and stays in its history. Before running it, read the
$2
for private material: people's names other than public authorship, customers or their
sites, another project's name or internals, home paths, hostnames or computer names,
email addresses, and anything copied from a private source.
If you find any, stop and ask the developer before going on.
EOF
}

if [ "$commit" = yes ]; then
  say commit 'staged changes and untracked files (git status -uall; git diff --cached)'
fi
if [ "$push" = yes ]; then
  [ "$commit" = yes ] && echo
  say push "commits not yet on the remote (git log -p @{upstream}..HEAD, or against
origin's default branch when there is no upstream)"
fi

exit 0
