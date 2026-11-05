#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Submits a flush to the framework as one branch and one pull request. It is the only
# place the flush talks to GitHub. It never merges.
#
# Usage:
#   bash submit-upstream.sh preflight <project-root>
#     Exits 0 and prints the framework repository as OWNER/NAME when gh is installed,
#     GitHub answers it as a signed-in account, and <project-root>/.tropis/README.md's
#     "set up from the framework at `X`" line names a GitHub repository
#     (https://github.com/OWNER/NAME, with or without .git, or
#     git@github.com:OWNER/NAME.git). Otherwise exits 1 with one line on stderr saying
#     what is missing. It asks GitHub which account gh is signed in as (gh api user), so
#     it passes where GitHub answers even when gh auth status fails, as it does in a
#     Claude Code cloud session.
#
#   bash submit-upstream.sh open <project-root> <OWNER/NAME> <branch> <title> <body-file>
#     Run inside a clone whose HEAD is the commit to submit; <project-root> is the
#     project the flush comes from, not that clone. Before anything is sent, reads
#     <project-root>/docs/BLUEPRINT-UPSTREAM.md for its "Flushes as: <name>" line and
#     refuses unless the name matches ^[a-z0-9][a-z0-9-]*$ and the branch starts with
#     upstream/<name>/, so the project is never named by anything the operator did not
#     choose. Pushes HEAD to <branch> on
#     the framework repository when the signed-in account can push there (the REST
#     repository route's permissions.push), otherwise on <login>/<NAME>, asking GitHub
#     to fork the framework first (which returns the existing fork when there is one).
#     Then opens one pull request against main and prints its URL, and nothing else, on
#     stdout. Refuses a branch named main.
#
#   bash submit-upstream.sh check-open <project-root> <OWNER/NAME> <branch>
#     Makes every check open makes before it sends anything (the queue's flush name, the
#     branch under upstream/<name>/ and not main, and check-name) and sends nothing: no
#     push, no fork, no pull request. Exits 0 and prints nothing when they hold, or
#     refuses as open would. For a session whose gh cannot write: it then pushes with git
#     and opens the pull request with its own GitHub tools.
#
#   bash submit-upstream.sh suggest-name
#     Prints a generated flush name, adopter- and six lowercase hexadecimal characters,
#     and nothing else. Uses no gh and no network.
#
#   bash submit-upstream.sh check-name <OWNER/NAME> <name>
#     Exits 0 and prints nothing when <name> is a valid flush name that no other account
#     is using. Refuses (one line on stderr, exit 1) a name that is not lowercase letters,
#     digits and hyphens, and a name under which an account other than the signed-in one
#     has a pull request on the framework, in any state, from a branch starting
#     upstream/<name>/. The branch is compared as GitHub reports it, without a fork's
#     owner. open and check-open make the same check before anything is sent.
#
# gh is needed only by the flush, at the moment it runs; check-prerequisites.sh does not
# ask for it. Every call goes through gh api, GitHub's REST interface, because a Claude
# Code cloud session refuses the gh commands that go through GraphQL (gh pr list,
# gh pr create, gh repo view, gh repo fork, gh repo clone) with HTTP 403.

set -euo pipefail

refuse() {
  echo "$1" >&2
  exit 1
}

preflight() {
  local root="${1:?preflight needs the project root}"
  local readme="$root/.tropis/README.md"

  command -v gh >/dev/null 2>&1 || refuse "gh not installed (https://cli.github.com)"
  local login
  login="$(gh api user -q .login 2>/dev/null)" || login=""
  [ -n "$login" ] || refuse "gh cannot reach GitHub as a signed-in account (gh auth login)"

  local addr=""
  if [ -f "$readme" ]; then
    addr="$(sed -n 's/.*set up from the framework at `\([^`]*\)`.*/\1/p' "$readme" | head -n 1)"
  fi
  [ -n "$addr" ] || refuse "no \"set up from the framework at \`...\`\" line in $readme"

  local trimmed="${addr%/}"
  trimmed="${trimmed%.git}"
  local re='^(https://github\.com/|git@github\.com:)([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$'
  if [[ "$trimmed" =~ $re ]]; then
    echo "${BASH_REMATCH[2]}/${BASH_REMATCH[3]}"
  else
    refuse "the framework address is not a GitHub repository: $addr"
  fi
}

suggest_name() {
  # Three bytes only: a reader that stops early would kill the writer, and pipefail
  # would then fail the script after it had printed.
  echo "adopter-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
}

# Refuses a name another account already flushes under. head.ref is the branch without
# the fork owner, so a pull request from a fork reads like one on the framework. The
# list is read page by page until a page comes back empty, never with gh api --paginate:
# its next-page link names the repository by numeric id, which the Claude Code cloud
# session's proxy refuses.
check_name() {
  local up="${1:?check-name needs OWNER/NAME}"
  local name="${2:?check-name needs a name}"

  [[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] \
    || refuse "the flush name \"$name\" is not lowercase letters, digits and hyphens: change it"

  local me others page=1 batch prs=""
  me="$(gh api user -q .login)"
  while :; do
    batch="$(gh api "repos/$up/pulls?state=all&per_page=100&page=$page" \
      -q '.[] | "\(.head.ref) \(.user.login)"')"
    [ -n "$batch" ] || break
    prs+="$batch"$'\n'
    page=$((page + 1))
  done
  others="$(printf '%s\n' "$prs" \
    | awk -v p="upstream/$name/" -v me="$me" 'index($1, p) == 1 && $2 != me { print $2 }' \
    | sort -u | paste -sd, - | sed 's/,/, /g')"
  [ -z "$others" ] \
    || refuse "the flush name \"$name\" is already used on $up by $others: choose another name"
}

# open_checks <project-root> <OWNER/NAME> <branch>: every check open makes before it
# sends anything. check-open runs these alone, so the two cannot drift.
open_checks() {
  local root="${1:?open needs the project root}"
  local up="${2:?open needs OWNER/NAME}"
  local branch="${3:?open needs a branch}"

  local queue="$root/docs/BLUEPRINT-UPSTREAM.md"
  [ -f "$queue" ] || refuse "no queue at $queue: run the flush from the project that has one"
  local flush_name
  flush_name="$(sed -n 's/^[[:space:]]*Flushes as:[[:space:]]*\(.*[^[:space:].]\)[.[:space:]]*$/\1/p' "$queue" | head -n 1)"
  [ -n "$flush_name" ] || refuse "no \"Flushes as: <name>\" line in $queue: add the name this project flushes under"
  [[ "$flush_name" =~ ^[a-z0-9][a-z0-9-]*$ ]] \
    || refuse "the flush name \"$flush_name\" in $queue is not lowercase letters, digits and hyphens: change it"
  [[ "$branch" == "upstream/$flush_name/"* ]] \
    || refuse "the branch \"$branch\" is not under upstream/$flush_name/: name it upstream/$flush_name/<date>-<entry>"

  # The pull request's base is main, so a branch of that name would be a push straight
  # onto the framework's main for anyone who can write there.
  [ "$branch" != "main" ] || refuse "refusing to push to main: name the branch for the flushed line"

  check_name "$up" "$flush_name"
}

open_pr() {
  local root="${1:?open needs the project root}"
  local up="${2:?open needs OWNER/NAME}"
  local branch="${3:?open needs a branch}"
  local title="${4:?open needs a title}"
  local body="${5:?open needs a body file}"
  local name="${up#*/}"

  open_checks "$root" "$up" "$branch"

  # The push target: the framework itself when the REST repository route says the
  # signed-in account may push there, otherwise the account's own fork.
  local can_push
  can_push="$(gh api "repos/$up" -q .permissions.push)"

  local target head_ref
  if [ "$can_push" = "true" ]; then
    target="$up"
    head_ref="$branch"
  else
    local login
    login="$(gh api user -q .login)"
    # The fork's full name goes to stderr so stdout stays the pull request's URL alone,
    # which is what the caller records.
    gh api -X POST "repos/$up/forks" -q .full_name >&2
    target="$login/$name"
    head_ref="$login:$branch"
  fi

  local url
  url="$(gh api "repos/$target" -q .clone_url 2>/dev/null)" && [ -n "$url" ] \
    || refuse "no repository $target to push to (looked for it with gh api repos/$target)"
  git push "$url" "HEAD:refs/heads/$branch"

  # -f sends the title and head as strings; -F reads the body from its file.
  gh api -X POST "repos/$up/pulls" -f base=main -f "head=$head_ref" -f "title=$title" \
    -F "body=@$body" -q .html_url
}

case "${1:-}" in
  preflight)
    shift
    preflight "$@"
    ;;
  open)
    shift
    open_pr "$@"
    ;;
  suggest-name)
    suggest_name
    ;;
  check-name)
    shift
    check_name "$@"
    ;;
  check-open)
    shift
    open_checks "$@"
    ;;
  *)
    echo "usage: submit-upstream.sh suggest-name | check-name <OWNER/NAME> <name> | preflight <project-root> | open <project-root> <OWNER/NAME> <branch> <title> <body-file> | check-open <project-root> <OWNER/NAME> <branch>" >&2
    exit 2
    ;;
esac
