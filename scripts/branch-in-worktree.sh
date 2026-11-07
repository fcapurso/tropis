#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# branch-in-worktree.sh — PreToolUse hook for Bash.
#
# Refuses a command that creates a branch — git checkout -b, git switch -c, git branch
# <name> — when it runs in a project's main checkout. Two sessions open on one project
# share that checkout, so one session's checkout or pull moves the branch the other is
# working on, and a commit lands on the wrong branch with nothing saying so until a push
# carries it. The refusal prints the command that creates the branch in a worktree of its
# own, based on origin/main (workflow.md, Branching).
#
# It refuses rather than advises: the reply of an advising hook arrives with the call,
# which still runs, so the checkout has moved before the agent reads the advice. A hook
# that stops a call exits 2 with its message on stderr — measured to refuse the call and
# reach the agent in both Claude Code and Cursor (harness-scripts.md). It does not use
# hook-reply.sh: that is the reply of a hook that lets the call run.
#
# Switching to an existing branch is not refused: going back to main is the repair.
# The hook judges the directory the command acts on — after a leading cd or pushd joined
# by &&, ; or a newline, and git's -C — and its own directory where it cannot tell. It
# filters the command itself, because Cursor ignores `if` on a Bash hook.

set -u

payload=$(cat)

command=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', '') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")

here=$(dirname "${BASH_SOURCE[0]}")
printf '%s' "$command" | python3 "$here/command-at-position.py" 'git checkout' 'git switch' 'git branch' || exit 0

# -B: loading the matcher as a module would write __pycache__/ beside it.
parsed=$(HOOK_COMMAND="$command" python3 -B - "$here/command-at-position.py" "$PWD" <<'PY'
import importlib.util
import os
import sys

spec = importlib.util.spec_from_file_location('command_at_position', sys.argv[1])
cap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cap)

try:
    tokens = cap.tokenize(os.environ.get('HOOK_COMMAND', ''))
except ValueError:
    sys.exit(0)

START = sys.argv[2]
HOME = os.environ.get('HOME', '')

# git branch: these options mean the command lists, edits or deletes rather than creates.
BRANCH_NOT_CREATING = {
    '-d', '-D', '--delete', '-m', '-M', '--move', '-l', '--list', '-u',
    '--set-upstream-to', '--unset-upstream', '--edit-description', '--contains',
    '--no-contains', '--merged', '--no-merged', '--points-at', '--show-current',
    '-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose',
}
BRANCH_COPY = {'-c', '-C', '--copy'}


def arguments(index):
    """Words after the subcommand, up to the next separator."""
    words = []
    while index < len(tokens) and tokens[index] not in cap.SEPARATORS:
        words.append(tokens[index])
        index += 1
    return words


def value_of(words, short, long_):
    for place, word in enumerate(words):
        if word in short | long_ and place + 1 < len(words):
            return words[place + 1]
        for option in long_:
            if word.startswith(option + '=') and len(word) > len(option) + 1:
                return word[len(option) + 1:]
    return None


def created(subcommand, words):
    if subcommand == 'checkout':
        return value_of(words, {'-b', '-B'}, set())
    if subcommand == 'switch':
        return value_of(words, {'-c', '-C'}, {'--create', '--force-create'})
    if any(word in BRANCH_NOT_CREATING for word in words):
        return None
    names = [word for word in words if not word.startswith('-')]
    if not names:
        return None
    if any(word in BRANCH_COPY for word in words):
        return names[-1]
    return names[0]


def resolve(base, target):
    """Absolute directory for `target` seen from `base`; no filesystem access."""
    if base is None or '$' in target or '`' in target:
        return None
    if target == '~' or target.startswith('~/'):
        if not HOME:
            return None
        target = HOME + target[1:]
    return os.path.normpath(os.path.join(base, target))


def global_directory(words, current):
    """Directory a git command acts on, from its global options; None when unknown."""
    place = 0
    while place < len(words) and words[place].startswith('-'):
        word = words[place]
        if word in ('--git-dir', '--work-tree') or word.startswith(('--git-dir=', '--work-tree=')):
            return None
        if word == '-C':
            if place + 1 >= len(words):
                return None
            current = resolve(current, words[place + 1])
        place += 2 if word in cap.CONSUMES_NEXT else 1
    return current


def segment_end(index):
    while index < len(tokens) and tokens[index] not in cap.SEPARATORS and tokens[index] != ')':
        index += 1
    return index


current = START
saved = []
index = 0
while index < len(tokens):
    token = tokens[index]
    if token == '(':
        saved.append(current)
        index += 1
        continue
    if token == ')':
        if saved:
            current = saved.pop()
        index += 1
        continue
    if token in cap.SEPARATORS:
        index += 1
        continue
    start = cap.skip_prefix(tokens, index)
    end = segment_end(index)
    if start < end and tokens[start] == 'git':
        place = start + 1
        while place < len(tokens) and tokens[place].startswith('-'):
            place += 2 if tokens[place] in cap.CONSUMES_NEXT else 1
        if place < len(tokens) and tokens[place] in ('checkout', 'switch', 'branch'):
            name = created(tokens[place], arguments(place + 1))
            if name:
                print(name)
                target = global_directory(tokens[start + 1:place], current)
                print(target or '')
                sys.exit(0)
    elif start < end and tokens[start] in ('cd', 'pushd', 'popd'):
        words = tokens[start + 1:end]
        follower = tokens[end] if end < len(tokens) else None
        if (tokens[start] != 'popd' and len(words) == 1 and not words[0].startswith('-')
                and follower in ('&&', ';', '\n')):
            current = resolve(current, words[0])
        else:
            current = None
    index = end
PY
) || exit 0
branch=$(printf '%s\n' "$parsed" | sed -n 1p)
target=$(printf '%s\n' "$parsed" | sed -n 2p)
[ -n "$branch" ] || exit 0
[ -n "$target" ] || target=$PWD

# The directory may not exist yet (a clone followed by a cd into it): judge the nearest
# existing ancestor.
while [ ! -d "$target" ] && [ "$target" != / ]; do target=$(dirname "$target"); done

# A linked worktree has its own git dir under .git/worktrees; the main checkout's git dir
# is the common one. Outside a repository there is nothing to protect.
git_dir=$(git -C "$target" rev-parse --path-format=absolute --git-dir 2>/dev/null) || exit 0
common_dir=$(git -C "$target" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
[ "$git_dir" = "$common_dir" ] || exit 0

# The project is the repository the hook runs in. A command that names another directory
# is let through when that is in another repository — a flush's clone of the framework,
# say — and refused only where it is this project's main checkout.
if [ "$target" != "$PWD" ]; then
  own_common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
  [ "$own_common" = "$common_dir" ] || exit 0
fi

top=$(git -C "$target" rev-parse --show-toplevel 2>/dev/null || echo "$target")
folder=$(basename "$top")
own_top=$(git rev-parse --show-toplevel 2>/dev/null || true)
enter=
[ "$top" = "$own_top" ] || enter="cd $(printf %q "$top") && "
leaf=${branch##*/}
if git -C "$top" remote get-url origin >/dev/null 2>&1; then
  base=origin/main
  fetch='git fetch origin && '
else
  base=main
  fetch=
fi

cat >&2 <<EOF
This is the main checkout of $folder. Other sessions may be working in it, and a branch
created here moves under them. Create the branch in a worktree of its own, based on
$base, and work there:

  ${enter}${fetch}git worktree add ../$folder-$leaf -b $branch $base

Leave this checkout on main, for pulling and reading. Once the branch has merged, remove
the worktree and delete the branch (workflow.md, Branching).
EOF
exit 2
