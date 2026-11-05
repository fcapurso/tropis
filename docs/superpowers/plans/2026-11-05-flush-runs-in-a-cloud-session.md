# A flush runs from a cloud session as it does from the developer's computer — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `/flush-upstream` run from a Claude Code cloud session gets past its preflight,
checks the flush name, clones the framework and opens its pull requests, as it does from
the developer's computer. `submit-upstream.sh` talks to GitHub through REST alone
(`gh api`), never through a gh command that goes through GraphQL; a new `check-open`
command makes `open`'s checks without sending anything, for a session where gh cannot
write at all; and `/flush-upstream` says how such a session opens each pull request with
its own GitHub tools.

**Backlog item:** `flush-runs-in-a-cloud-session` in `feature-catalog.yaml` (type bug).
No spec: the backlog item and this plan.

**One plan:** what becomes true is one sentence — a flush reaches the framework from a
cloud session as it does from the developer's computer.

**Model tier: Medium.** The code and tests are specified closely below, but the stub gh
and the open tests must be reworked against a changed call pattern, which takes some
judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed:** nothing under `framework/` or `rules/` changes. The
command `commands/flush-upstream.md` changes what an agent running a flush is told, so the
reviewer reads it for that; the workflow asks a command edit for a commit body, not a
probe, unless it changes what an agent is told to do — it does, so the specifying session
runs a probe on the command at review (*Tasks*, after Task 5) and records it.

**Decided by the specifying session while shaping** (the developer left these to it):

1. **Every call to GitHub in `submit-upstream.sh` goes through `gh api` (REST).** The
   backlog item's criteria assumed gh cannot write from a cloud session; the session
   measured that `gh api` reaches GitHub's REST interface for a write as well as a read
   (*Verified*, below). So `open` moves to REST too, and a cloud session runs the same
   script as the developer's computer: one code path. Rejected: keeping `open` on
   `gh repo view`, `gh repo fork` and `gh pr create` and describing the session's own
   tools for every cloud flush, which leaves two paths to drift.
2. **`check-open` for where gh cannot write at all.** The criterion that `/flush-upstream`
   say how a task opens its pull request with the session's own GitHub tools still holds,
   for a session whose REST writes are refused too. `check-open` makes every check `open`
   makes before it sends anything (the flush name, the branch under
   `upstream/<name>/`, never `main`, the name check) and sends nothing; the task then
   pushes with git and opens the pull request with the session's tools. `open` itself
   calls the same function, so the two cannot drift.
3. **Preflight asks GitHub who is signed in** (`gh api user`), not `gh auth status`,
   which in a cloud session fails although GitHub answers.
4. **The clone in step 3 and in each task is `git clone --depth 1` from the framework's
   address**, falling back to `gh repo clone` only where git cannot reach it (a private
   framework with no git credentials). `gh repo clone` goes through GraphQL.
5. **This follows the spike `cloud-session-gh-routes`**, shipped the same day: its
   finding, docs/superpowers/specs/2026-11-05-cloud-session-gh-routes-finding.md,
   *Recommendations*, says to keep gh through `gh api` for this item, to read lists page
   by page and never with `--paginate`, and that writes to another repository and forks
   are untried, so the criterion on the session's own tools stands for whichever of
   those is refused. `check-open` and the step 5 bullet are that.
6. **Lists are read page by page, never with `--paginate`.** The spike found that the
   proxy refuses `--paginate`'s next-page link, which names the repository by numeric id
   ("Numeric-ID repository paths are not supported through this proxy"), while
   `page=1`, `page=2` and so on work.

**What the specifying session verified on 2026-11-05, against `origin/main` at `770a494`
(gh 2.89.0, git 2.43.0, node v22.23.4, a Claude Code cloud session, Linux x86_64):**

- `gh auth status` exits non-zero and prints "The token in GH_TOKEN is invalid", while
  `gh api user -q .login` prints the signed-in login and exits 0.
- `gh pr list --repo <this repository> --limit 1` answers `HTTP 403: GitHub GraphQL is not
  available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...)`.
- `gh api 'repos/<this repository>/pulls?state=all&per_page=2' -q '.[] | "\(.head.ref) \(.user.login)"'`
  prints one `<branch> <login>` line per pull request.
- `git clone --depth 1 https://github.com/<this repository>.git <tmp>` succeeds;
  `gh repo clone <this repository> <tmp> -- --depth 1` answers the same GraphQL 403.
- `gh api -X POST repos/<this repository>/pulls -f title=x -f head=<a branch that does not exist> -f base=main`
  answered GitHub's own `Validation Failed (HTTP 422)` for `head`, not a refusal: the
  write reached GitHub. The spike above opened a pull request with `POST pulls` on this
  repository. Neither was a write to another repository, nor a fork: a flush's real
  first run from a cloud session is the first test of those, which is why `check-open`
  exists.
- `scripts/submit-upstream.sh`: `preflight` runs `gh auth status` (line 54); `check_name`
  runs `gh pr list --repo "$up" --state all --limit 1000 --json headRefName,author`
  (line 89); `open_pr` runs `gh repo view --json viewerPermission`, `gh api user`,
  `gh repo fork`, `gh repo view --json url` and `gh pr create`. All but `gh api` go through
  GraphQL.
- `scripts/sprint.mjs` already lists pull requests with `gh api` for the same reason
  (`openPullRequests`, its comment says so).
- `commands/flush-upstream.md` step 3 clones with `gh repo clone OWNER/NAME <tmp> -- --depth 1`.
- `CONTRIBUTING.md`, *From a project*, *What you need*: "`gh` installed and signed in".
- No guard asserts the wording of `commands/flush-upstream.md` or of `CONTRIBUTING.md`'s
  *What you need* (`grep -n "signed in\|gh" guards/contributing-page.test.js` prints
  nothing; no guard reads `flush-upstream.md` beyond its plan file names).
- **Overlap:** the claim's overlap check is the record.

---

## Delivers

flush-runs-in-a-cloud-session

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-flush-cloud-build -b plan/flush-runs-in-a-cloud-session-build origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Rewriting the
  stub gh and the expectations of the cases named under *Tests* is part of the plan;
  nothing else is.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Nothing here reaches GitHub.** The guard runs the script against a stub gh first on
  `PATH` and local bare repositories, as today. Do not run `open` against a real
  repository.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change — `scripts/submit-upstream.sh`

Keep the file's shape: the header comment, `refuse`, one function per command, the
`case` at the end. Update the header comment for every command whose behaviour changes,
and add `check-open` to it and to the usage line.

### preflight

Replace the `gh auth status` line with a question GitHub answers:

```bash
local login
login="$(gh api user -q .login 2>/dev/null)" || login=""
[ -n "$login" ] || refuse "gh cannot reach GitHub as a signed-in account (gh auth login)"
```

`gh not installed` stays as it is and stays first. The header comment says preflight asks
GitHub which account gh is signed in as, and passes where GitHub answers even when
`gh auth status` fails (it does in a Claude Code cloud session).

### check-name

List the framework's pull requests through the REST pulls route, page by page, until a
page comes back empty — never with `--paginate` (Decision 6):

```bash
local page=1 batch prs=""
while :; do
  batch="$(gh api "repos/$up/pulls?state=all&per_page=100&page=$page" \
    -q '.[] | "\(.head.ref) \(.user.login)"')"
  [ -n "$batch" ] || break
  prs+="$batch"$'\n'
  page=$((page + 1))
done
```

Stopping on an empty page costs one call more than counting a short page, and needs no
`wc`, whose output BSD pads. The comment above the function says why it does not use
`--paginate`.

`head.ref` is the branch without a fork's owner, as `headRefName` was, so the comparison
is unchanged. The comment above the function says so. Everything else in `check_name`
stays.

### check-open (new) and open

Move the checks `open_pr` makes before it sends anything into one function,
`open_checks <project-root> <OWNER/NAME> <branch>`: the queue file, the `Flushes as:`
line, the name's form, the branch under `upstream/<name>/`, the branch not `main`, and
`check_name`. Same refusals, same order, same messages as today.

- `check-open <project-root> <OWNER/NAME> <branch>` runs `open_checks`, prints nothing
  and exits 0, or refuses as `open` would. It sends nothing: no push, no fork, no pull
  request.
- `open` runs `open_checks`, then:

```bash
local can_push
can_push="$(gh api "repos/$up" -q .permissions.push)"

local target head_ref
if [ "$can_push" = "true" ]; then
  target="$up"
  head_ref="$branch"
else
  local login
  login="$(gh api user -q .login)"
  # The fork's full name goes to stderr so stdout stays the pull request's URL alone.
  gh api -X POST "repos/$up/forks" -q .full_name >&2
  target="$login/$name"
  head_ref="$login:$branch"
fi

local url
url="$(gh api "repos/$target" -q .clone_url 2>/dev/null)" && [ -n "$url" ] \
  || refuse "no repository $target to push to (looked for it with gh api repos/$target)"
git push "$url" "HEAD:refs/heads/$branch"

gh api -X POST "repos/$up/pulls" -f base=main -f "head=$head_ref" -f "title=$title" \
  -F "body=@$body" -q .html_url
```

`-f` sends a value as a string; `-F name=@file` reads the value from the file. The
pull request's URL is the only thing on stdout, as today. The comment on the push target
says it asks the REST repository route for `permissions.push`.

The header's last paragraph adds: every call goes through `gh api`, GitHub's REST
interface, because a Claude Code cloud session refuses GraphQL (`gh pr list`,
`gh pr create`, `gh repo view`, `gh repo fork`, `gh repo clone`) with HTTP 403.

## Tests — `guards/submit-upstream.test.js`

Rework the stub gh so it answers only the calls the script now makes, and refuses every
GraphQL-backed command the way a cloud session does. A shape that works (adapt freely):

```bash
#!/usr/bin/env bash
echo "$*" >> "$STUB_LOG"
graphql() { echo "HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...). (https://api.github.com/graphql)" >&2; exit 1; }
case "$1" in
  auth) [ "${STUB_AUTH_STATUS:-1}" = 1 ]; exit ;;
  pr|repo) graphql ;;
  api) ;;
  *) echo "stub gh: unexpected call: $*" >&2; exit 99 ;;
esac
# gh api: find the route among the arguments
...
```

answering, for `gh api`:

| Route | Answer |
|---|---|
| `user` | `$STUB_LOGIN`, or exit 1 with a 401 line when `STUB_SIGNED_IN=0` |
| `repos/<up>/pulls?state=all&per_page=100&page=1` | `$STUB_PRS` |
| `repos/<up>/pulls?state=all&per_page=100&page=2` | `$STUB_PRS_PAGE2` (empty when unset) |
| `repos/<up>/pulls?…&page=<3 or more>` | nothing |
| any call carrying `--paginate` | exit 1 with `Numeric-ID repository paths are not supported through this proxy`, as the proxy answers |
| `repos/<owner>/<name>` (GET) with `-q .permissions.push` | `$STUB_CAN_PUSH` for the framework |
| `repos/<owner>/<name>` (GET) with `-q .clone_url` | the bare repository path for that full name, as `STUB_URL_*` does today; empty when unset |
| `-X POST repos/<up>/forks` | `$STUB_LOGIN/framework` |
| `-X POST repos/<up>/pulls` | `https://github.com/$STUB_UPSTREAM/pull/1` |

Anything else exits 99 with `stub gh: unexpected call`, as today. The log keeps one line
per call. In JavaScript, mind the template literal: `${` inside the stub needs escaping
as the current stub does.

Then:

- **Preflight.** Keep every existing case. `refuses when gh is not signed in` sets
  `STUB_SIGNED_IN=0` (so `gh api user` fails) and still expects one line containing
  `gh auth login`. Add:
  - `passes where gh auth status fails and GitHub answers` — `STUB_AUTH_STATUS=0`,
    signed in: exit 0, prints `acme/framework`, stderr empty.
  - `never asks gh auth status` — after a passing preflight, no logged call starts
    `auth`.
- **check-name.** Keep every existing case; `prsCalls` now filters calls that start
  `api` and contain `/pulls?state=all`. `compares the branch without the fork owner` expected one
  such call; with an empty page 2 there are now two (`page=1`, `page=2`): change that
  count, nothing else in the case. Add:
  - `lists pull requests through the REST pulls route, page by page` — with
    `STUB_PRS` set and `STUB_PRS_PAGE2` set, the logged pulls calls are exactly
    `page=1`, `page=2` and `page=3`, in that order; none carries `--paginate`; no
    logged call starts `pr `.
  - `refuses a name used only on a later page` — `STUB_PRS` holds another name's
    branch, `STUB_PRS_PAGE2` holds `upstream/example/2026-10-01-x other`: exit 1 naming
    `other`.
  - `works where GraphQL is refused` — with the stub refusing `pr` and `repo` as above
    (it always does now), a name nobody uses exits 0 and one another account uses
    exits 1 naming that account. (This may be the existing accept and refuse cases; if
    so, say so in the handover and add only an assertion that no logged call starts `pr `
    or `repo `.)
- **open.** Every existing case keeps its intent; change what each asserts about calls:
  - the write case uses `STUB_CAN_PUSH=true`; the fork case `STUB_CAN_PUSH=false`; the
    missing-fork case `STUB_CAN_PUSH=false` with the fork's URL empty;
  - "no fork" means no logged call contains `/forks`; the fork case has exactly one, and
    it contains `-X POST` and `repos/acme/framework/forks`;
  - "a pull request" means a logged call containing `-X POST` and
    `repos/acme/framework/pulls`; assert `base=main`, `head=<BRANCH>` (write case) or
    `head=someone:<BRANCH>` (fork case), and `body=@`;
  - the never-merges case asserts no logged call contains `merge`.
  Add `opens its pull request with no GraphQL call` — after a passing `open` (write
  case), no logged call starts `pr ` or `repo `.
- **check-open (new describe).** Reuse the queue-root helpers.
  - `passes and sends nothing when every check holds` — exit 0, stdout and stderr empty,
    no branch on either bare repository, no logged call contains `/forks`,
    `-X POST` or `.permissions.push`.
  - `refuses as open does` — one case each: no queue file, no `Flushes as` line, a
    branch under another name, a branch named `main`, a name another account uses
    (`STUB_PRS`). Each exits non-zero with the same message pattern the matching `open`
    case expects, and sends nothing.

Run the guard alone (*Traps*). Every case named here must go red against the script as
it is on `origin/main` (Task 1) — except the cases that only keep existing intent, which
may pass or fail there; say which in the handover.

## The command — `commands/flush-upstream.md`

Three changes; keep everything else word for word.

1. **Step 1, preflight**, after "On a non-zero exit, show its line and stop: nothing is
   drafted.", add:

   > The preflight asks GitHub which account gh is signed in as, so it passes in a Claude
   > Code cloud session, where `gh auth status` fails although GitHub answers. Every call
   > the flush makes to GitHub goes through `gh api`, GitHub's REST interface, which a
   > cloud session allows; it refuses the gh commands that go through GraphQL.

2. **Step 3, the clone.** Replace
   "(`gh repo clone OWNER/NAME <tmp> -- --depth 1`, with `OWNER/NAME` from the preflight)"
   with
   "(`git clone --depth 1 https://github.com/OWNER/NAME.git <tmp>`, with `OWNER/NAME`
   from the preflight; only where git cannot reach it, as for a private framework with no
   git credentials, `gh repo clone OWNER/NAME <tmp> -- --depth 1`, which a cloud session
   refuses)".

3. **Step 5, the task.** Change "clones the framework's current `main` afresh into a
   temporary directory;" to "clones the framework's current `main` afresh into a
   temporary directory, as step 3 does;". Then, directly after the bullet that runs
   `open` and records the URL it prints, add one bullet:

   > - where `open` stops on a line from GitHub refusing the write (HTTP 403) — a session
   >   whose gh cannot write — opens the pull request with the session's own GitHub tools
   >   instead, and nothing else changes: runs
   >   `bash <project-root>/.tropis/scripts/submit-upstream.sh check-open <project-root> OWNER/NAME <branch>`
   >   from inside the clone, which makes every check `open` makes and sends nothing, and
   >   goes on only once it exits 0; pushes the branch with
   >   `git push https://github.com/OWNER/NAME.git HEAD:refs/heads/<branch>`, or, where
   >   the account cannot push there, to its own fork, created with the session's tools;
   >   opens one pull request against `main` with the session's tools, with the same title
   >   and the body file's text as its description, never merging it or setting it to
   >   merge; and records its URL as it would `open`'s. A push or a pull request the
   >   session cannot make stops that entry: the drain task keeps it in the queue with the
   >   refusal as its note;

## The contribution page — `CONTRIBUTING.md`

In *From a project*, *What you need*, replace "`gh` installed and signed in" with
"`gh` installed and answering GitHub as you, which it does from a Claude Code cloud
session too". Nothing else changes.

## Traps

- **The self-check reads committed content only.** Commit before
  `bash scripts/check-blueprint.sh`. To see a test red against the old script, run the
  guard alone in the worktree with the old script restored in the working tree, not the
  self-check.
- **Run the guard alone** with the installed release's Jest:
  `node --experimental-vm-modules .tropis/node_modules/jest/bin/jest.js --rootDir . guards/submit-upstream.test.js`.
  If that exact form does not run, find how `scripts/check-blueprint.sh` runs the source
  guards and use that; say which in the handover.
- **`npm --prefix .tropis test` checks this repository as a project with the installed
  release**, not the source script: it will not exercise the change. Run it anyway
  (the backlog edit must pass it).
- **A path in backticks under `docs/`, `scripts/` or `.claude/` in a command must
  exist**, or `framework-integrity` fails the self-check. The text added to
  `commands/flush-upstream.md` names `.tropis/scripts/submit-upstream.sh`, which is
  already named in that file in the same form; add no other such path.
- **`-F body=@file` and `-f`**: `-F` converts `true`, `false`, `null` and numbers to
  JSON types; the title and the head go through `-f` so a title such as `123` stays a
  string. The body read from a file stays a string.
- **A colon followed by a space inside an unquoted backlog value breaks the YAML.** The
  comment lines in Task 4 are comments; keep them so.

## File Structure

| File | Change |
|---|---|
| `scripts/submit-upstream.sh` | preflight asks `gh api user`; check-name lists through REST, every page; `open_checks`, `check-open`; `open` through `gh api` alone |
| `guards/submit-upstream.test.js` | the stub gh refuses GraphQL; preflight, check-name and open cases reworked; check-open cases |
| `commands/flush-upstream.md` | three changes under *The command* |
| `CONTRIBUTING.md` | one phrase under *What you need* |
| `feature-catalog.yaml` | the item to `shipped`, `modules`, comments mapping criteria to cases (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's block removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-05-flush-runs-in-a-cloud-session.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: `CONTRIBUTING.md` is updated, since
this changes what a contributor needs; no decision record, since the choice follows
FW-063's (a cloud session uses REST and its own tools where gh's GraphQL is refused) and
the alternatives are recorded above; no rule change; no upstream queue, this repository is
the upstream; `RELEASES.md` is drafted from the backlog by `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: its last line starts `Self-check passed`).
Record `git --version`, `node --version`, `gh --version` (if installed) and `uname -sm`.

### Task 1 — The tests, red

Make every change under *Tests*. Commit. Run the guard alone. Expected: the added
preflight, check-name, open and check-open cases fail against the current script (which
calls `gh auth status`, `gh pr list`, `gh repo view` and has no `check-open`). Paste the
failing case names and the `Tests:` line.

### Task 2 — The script

Make every change under *The change*. Commit. Run the guard alone: every case passes.
Paste the `Tests:` line. Then `bash -n scripts/submit-upstream.sh` (expected: no output)
and `grep -nE 'gh (pr|repo|auth)' scripts/submit-upstream.sh` — expected: no line that
runs one (a mention in a comment is fine; say which lines, if any).

### Task 3 — The documents

Make the changes under *The command* and *The contribution page*. Commit. Run
`bash scripts/check-blueprint.sh` and paste its last line.

### Task 4 — Backlog and board

1. In `feature-catalog.yaml`, on `flush-runs-in-a-cloud-session`: set `status: shipped`
   (if it does not read `building`, set it anyway and say so); leave
   `acceptanceCriteria` as they are; set `modules` to `scripts/submit-upstream.sh` and
   `commands/flush-upstream.md`; keep this plan in `refs`. Directly above the item,
   after its existing comment lines (if any), add comment lines naming, per criterion,
   the guard case that covers it:
   - Criterion 1 (preflight): `passes where gh auth status fails and GitHub answers`,
     `refuses when gh is not signed in`.
   - Criterion 2 (check-name REST, every page): `lists pull requests through the REST
     pulls route, page by page`, `refuses a name used only on a later page`.
   - Criterion 3 (open with the session's tools): the check-open cases, and the bullet
     in `commands/flush-upstream.md` step 5; plus `open` now opening through REST.
   - Criterion 4 (the guard): the cases above, which run with the stub refusing GraphQL.
   - Criterion 5 (clone with git): `commands/flush-upstream.md` step 3; the session's
     own `git clone --depth 1` of this repository's address in Task 5 (paste its
     outcome).
   Keep each comment line starting `# `; no colon followed by a space except after
   `# Criterion N`.
2. In `docs/backlog-board/bands.yaml`, delete the `flush-runs-in-a-cloud-session:` block
   (from that line to the line before `framework-calls-itself-one-thing:`).
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. `git clone --depth 1 https://github.com/fcapurso/tropis.git <a temporary directory>`
   and paste whether it succeeded; delete the clone. (This is the framework's own
   address; it reads, it writes nothing.)
2. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), the guard alone (paste the
   `Tests:` line) and `git diff --stat origin/main...HEAD` (paste it; every file in
   *File Structure*).
3. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
4. `git push -u origin plan/flush-runs-in-a-cloud-session-build`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.

### After Task 5 — the specifying session

Reviews the branch, runs a probe of `commands/flush-upstream.md` with a fresh agent (an
invented flush in a cloud session whose `open` stops on HTTP 403: does it run
`check-open`, push with git and open the pull request with the session's tools, without
merging), writes the review record, and merges.

## Handover report

### Task completion

- **Task 0.** Isolated with `bash .tropis/scripts/isolate-for-plan.sh` from the main
  checkout, then `npm --prefix .tropis ci` in the worktree; `git status --porcelain`
  printed nothing; the self-check passed. Tools: git 2.43.0, node v22.23.4, gh 2.89.0,
  Linux x86_64, in a Claude Code cloud session.
- **Task 1.** Stub gh and cases reworked as *Tests* says; committed (`06cd8f7`); red
  against the old script (below).
- **Task 2.** Script changed as *The change* says; committed (`35a0534`); guard green.
- **Task 3.** The three command changes and the CONTRIBUTING phrase; committed; self-check
  passed.
- **Task 4.** Backlog item to `shipped` (it read `building`), `modules` set, criteria
  mapped in comments, band block removed; committed. The board hook staged no
  `docs/backlog-board/index.html`, so that file is not in the diff.
- **Task 5.** Clone, checks, this report, push. No pull request opened.

### Verification results

All on Linux x86_64, Claude Code cloud session; git 2.43.0, node v22.23.4, gh 2.89.0,
Jest from `.tropis/node_modules` (the installed release's).

- **Guard alone, red (Task 1, old script):** `Tests: 23 failed, 14 passed, 37 total`.
  Failing: preflight › refuses when gh is not signed in, passes where gh auth status
  fails and GitHub answers, never asks gh auth status; check-name › refuses a name another
  account has a pull request under, compares the branch without the fork owner, lists
  pull requests through the REST pulls route, page by page, refuses a name used only on a
  later page, accepts the signed-in account's own earlier flushes, accepts a name nobody
  uses…; open › pushes to the framework itself…, opens its pull request with no GraphQL
  call, pushes to the account's own fork…, stops naming the fork…, and accepts the name
  without its trailing full stop, refuses a name another account already uses…, never
  merges… (can push: true) and (can push: false); check-open › passes and sends nothing…,
  and all five refuses-as-open-does cases. Every added case is red. Of the cases that only
  keep existing intent, these passed against the old script: preflight prints OWNER/NAME
  (3), refuses a local-path address, refuses when the README does not say, refuses when gh
  is not installed; suggest-name; check-name refuses an invalid name before asking gh;
  open refuses a branch named main, and the five refusals of a branch not under the flush
  name except the trailing-full-stop acceptance. The rest failed because the stub now
  refuses `gh pr`/`gh repo` and answers `gh auth status` by `STUB_AUTH_STATUS`.
- **Guard alone, green (Task 2 and on the final commit):** `Tests: 37 passed, 37 total`.
- `bash -n scripts/submit-upstream.sh`: no output.
- `grep -nE 'gh (pr|repo|auth)' scripts/submit-upstream.sh`: lines 15, 52, 53 (header
  comment) and 69 (the refusal message's "(gh auth login)" hint). None runs a command.
- **Task 5 clone:** `git clone --depth 1 https://github.com/fcapurso/tropis.git <tmp>`
  exited 0 (head `f38ef18`); the clone was deleted.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 191 passed, 191 total`.
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.`
  The same line again on the commit carrying this report, with `npm --prefix .tropis test`
  again at 191 passed.
- `git diff --stat origin/main...HEAD` before this report:

  ```
   CONTRIBUTING.md                |   5 +-
   commands/flush-upstream.md     |  26 ++++-
   docs/backlog-board/bands.yaml  |  16 ---
   feature-catalog.yaml           |  20 +++-
   guards/submit-upstream.test.js | 225 ++++++++++++++++++++++++++++++++---------
   scripts/submit-upstream.sh     | 122 ++++++++++++++--------
   6 files changed, 303 insertions(+), 111 deletions(-)
  ```

### Scope

The six files above plus this plan file; every one is in *File Structure*.
`docs/backlog-board/index.html` was not touched. Worktree used:
`../tropis-flush-cloud-build` (a sibling of the main checkout), branch
`plan/flush-runs-in-a-cloud-session-build`.

### Judgment calls

- **How the guard was run alone.** The plan's form
  (`jest.js --rootDir . guards/submit-upstream.test.js`) does not run: Jest finds no
  config file ("Could not find a config file based on provided values"), and the guards
  are ES modules with no `package.json` saying so at the repository root. I ran it as the
  self-check does, from a scratch directory outside the repository holding
  `{"type":"module"}` as `package.json`, `templates/framework-jest.config.js` as
  `jest.config.js`, a copy of `guards/submit-upstream.test.js`, and a symlink `scripts`
  to the worktree's `scripts/`, then
  `node --experimental-vm-modules .tropis/node_modules/jest/bin/jest.js --config <scratch>/jest.config.js guards/submit-upstream.test.js`.
  This reads the working tree, so the red run used the old script as it stood at the
  Task 1 commit.
- **The queue-root helpers** (`queueRoot`, `named`) moved from inside `describe('open')`
  to the outer describe so `check-open` reuses them, as *Tests* asks. `isPullRequest`
  sits beside them for the same reason.
- **"works where GraphQL is refused"** is the existing accept and refuse cases of
  check-name, since the stub always refuses `pr` and `repo` now; I added a `noGraphQL()`
  assertion (no logged call starts `pr ` or `repo `) to "refuses a name another account
  has a pull request under" and "accepts a name nobody uses…", and added no separate case.
- **check-open › when the branch is named main** is refused by the branch-under-name
  check (its message quotes `"main"`), exactly as `open`'s own main case is; the later
  `refusing to push to main` line is reached by neither, as before this plan.
- **check-open dispatches straight to `open_checks`**; there is no separate
  `check_open` function. Its argument-missing messages read "open needs …", the same as
  `open`'s.
- **The stub's never-merges assertion** checks no logged call contains `merge`, as the
  plan says.
- **Source.** Written against this repository's own script and guard; no outside
  source was used. The REST shapes (`permissions.push`, `POST forks`, `POST pulls`,
  `head.ref`, `user.login`, `clone_url`) are the ones the plan names.

### What the plan got wrong

- **The guard-alone command does not run** as written (see *Judgment calls*): with
  `--rootDir .` and no config, Jest refuses for want of a config file, and without a
  `{"type":"module"}` package the guard cannot load. The plan's fallback (do what the
  self-check does) worked.
- Nothing else found untrue: the line numbers, call list and wording anchors in
  *Verified* matched `origin/main`.

### Outstanding

- **The change has no screen**, so there is no developer check.
- The real cloud-session behaviour of a write to another repository and of a fork
  (`POST repos/<up>/forks`, `POST repos/<up>/pulls` against the framework from a
  project) is still untried; the guard only exercises a stub. The first real flush from
  a cloud session is that test, and `check-open` is the fallback if it is refused.
- `POST forks` returns before GitHub has finished creating a new fork; `open` asks for
  the fork's `clone_url` and pushes straight after. Where the fork is new, that push may
  race the fork's creation. Not covered by the plan or the guard; for the reviewer to
  judge.
- The probe of `commands/flush-upstream.md` named under *After Task 5* is the
  specifying session's.
