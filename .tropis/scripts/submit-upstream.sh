#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
#
# Submits a flush to the framework as one branch and one pull request. It is the only
# place the flush talks to GitHub. It never merges.
#
# Usage:
#   bash submit-upstream.sh preflight <project-root>
#     Exits 0 and prints the framework repository as OWNER/NAME when gh is installed,
#     signed in, and <project-root>/.tropis/README.md's "set up from the framework
#     at `X`" line names a GitHub repository (https://github.com/OWNER/NAME, with or
#     without .git, or git@github.com:OWNER/NAME.git). Otherwise exits 1 with one line
#     on stderr saying what is missing.
#
#   bash submit-upstream.sh open <project-root> <OWNER/NAME> <branch> <title> <body-file>
#     Run inside a clone whose HEAD is the commit to submit; <project-root> is the
#     project the flush comes from, not that clone. Before anything is sent, reads
#     <project-root>/docs/BLUEPRINT-UPSTREAM.md for its "Flushes as: <name>" line and
#     refuses unless the name matches ^[a-z0-9][a-z0-9-]*$ and the branch starts with
#     upstream/<name>/, so the project is never named by anything the operator did not
#     choose. Pushes HEAD to <branch> on
#     the framework repository when the signed-in account can write there, otherwise on
#     <login>/<NAME>, creating that fork if it does not exist. Then opens one pull
#     request against main and prints its URL, and nothing else, on stdout. Refuses a
#     branch named main.
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
#     upstream/<name>/. The branch is compared as gh reports it, without a fork's owner.
#     open makes the same check before it pushes.
#
# gh is needed only by the flush, at the moment it runs; check-prerequisites.sh does not
# ask for it.

set -euo pipefail

refuse() {
  echo "$1" >&2
  exit 1
}

preflight() {
  local root="${1:?preflight needs the project root}"
  local readme="$root/.tropis/README.md"

  command -v gh >/dev/null 2>&1 || refuse "gh not installed (https://cli.github.com)"
  gh auth status >/dev/null 2>&1 || refuse "gh not signed in (gh auth login)"

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

# Refuses a name another account already flushes under. headRefName is the branch
# without the fork owner, so a pull request from a fork reads like one on the framework.
check_name() {
  local up="${1:?check-name needs OWNER/NAME}"
  local name="${2:?check-name needs a name}"

  [[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] \
    || refuse "the flush name \"$name\" is not lowercase letters, digits and hyphens: change it"

  local me prs others
  me="$(gh api user -q .login)"
  prs="$(gh pr list --repo "$up" --state all --limit 1000 --json headRefName,author \
    -q '.[] | "\(.headRefName) \(.author.login)"')"
  others="$(printf '%s\n' "$prs" \
    | awk -v p="upstream/$name/" -v me="$me" 'index($1, p) == 1 && $2 != me { print $2 }' \
    | sort -u | paste -sd, - | sed 's/,/, /g')"
  [ -z "$others" ] \
    || refuse "the flush name \"$name\" is already used on $up by $others: choose another name"
}

open_pr() {
  local root="${1:?open needs the project root}"
  local up="${2:?open needs OWNER/NAME}"
  local branch="${3:?open needs a branch}"
  local title="${4:?open needs a title}"
  local body="${5:?open needs a body file}"
  local name="${up#*/}"

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

  local permission
  permission="$(gh repo view "$up" --json viewerPermission -q .viewerPermission)"

  local target head_ref
  case "$permission" in
    ADMIN | MAINTAIN | WRITE)
      target="$up"
      head_ref="$branch"
      ;;
    *)
      local login
      login="$(gh api user -q .login)"
      # gh reports the fork on stdout; send it to stderr so stdout stays the pull
      # request's URL alone, which is what the caller records.
      gh repo fork "$up" --clone=false --remote=false >&2
      target="$login/$name"
      head_ref="$login:$branch"
      ;;
  esac

  local url
  url="$(gh repo view "$target" --json url -q .url 2>/dev/null)" && [ -n "$url" ] \
    || refuse "no repository $target to push to (looked for it with gh repo view)"
  git push "$url" "HEAD:refs/heads/$branch"

  gh pr create --repo "$up" --base main --head "$head_ref" --title "$title" --body-file "$body"
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
  *)
    echo "usage: submit-upstream.sh suggest-name | check-name <OWNER/NAME> <name> | preflight <project-root> | open <project-root> <OWNER/NAME> <branch> <title> <body-file>" >&2
    exit 2
    ;;
esac
