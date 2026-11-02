# A session waiting for the token or for another plan waits until it happens — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `merge-token.mjs take` and `plan-overlap.mjs --wait` lose their 60-minute
default. The token wait lasts while the holder is working and stops, naming the holder,
only when the token turns stale; the merges-after wait ends when no entry it waits on is
`building` any more. Both still accept `--timeout`. The workflow tells a session to run
both as background commands that wake it.

**Spec:** decision FW-055 in `framework/DECISIONS.md` (*Every wait in a team member's life
ends on something happening, not on a clock*), with FW-051 and FW-052, whose waits this
changes; `docs/superpowers/specs/2026-11-01-sprint-design.md` §3 to §5 and §11; the six
acceptance criteria of the entry `waits-end-when-something-happens` in
`feature-catalog.yaml`. Build only this entry. The sprint command and its own
`sprint.mjs wait` (`sprint-plans-and-runs-a-team`) are another entry. The 30-minute
limit of `main-status.mjs` is not part of this entry: leave it.

**One plan:** what becomes true is one sentence — a session waiting for the merge token
or for a plan it merges after keeps waiting until that happens, and stops only on a stale
holder. Two scripts, their guards, the workflow's two sections and one decision serve
that one thing.

**What the specifying session verified on 2026-11-02, against `origin/main` at `12d4a50`:**

- **`scripts/merge-token.mjs`.** `take(root, { env, ref, holder, hold, intervalMs = 30000,
  timeoutMs = 3600000 })` computes `deadline = Date.now() + timeoutMs` once, then loops:
  read the marker (three read errors in a row exit 2); held by this holder → exit 0
  `already held`; held by another → if past the deadline exit 3 with
  `STOPPED: waiting for the token, held by <holder>`, else print once on stderr
  `merge-token: held by <holder>; asking every <s> s for up to <min> min` and sleep;
  free → try to take. It never asks whether the holder is stale. `parseArgs` defaults
  `timeoutMs: 3600000` and accepts `--timeout <minutes>` with `Number(value) >= 0`.
  The module comment's usage block says `3 still held by another at the timeout`.
- **Staleness today.** `STALE_MINUTES = 30`. `isStale({ kind, minutes, openPull,
  tipMinutes })` is true for a `branch` marker at least 30 minutes old with no open pull
  request and a branch tip absent (`null`) or at least 30 minutes old; a `hold` is never
  stale. `tokenStatus(root, { env, now, ref })` asks it only where `origin` is on GitHub
  (`ctx.github`), through the private `judgeStale(ctx, marker, minutes, now)`, which asks
  `gh` for open pull requests and the branch's last commit and treats any error as not
  stale. Its stale line is
  `` `${held} — stale: no open pull request and no push for ${STALE_MINUTES} min. ` ``
  followed by `` `Break it only on the developer's word: node .tropis/scripts/merge-token.mjs break --holder ${marker.holder}` ``.
  Off GitHub, status never says stale, so a waiter there whose holder died would wait
  forever once the limit goes: *Decision 2*.
- **`scripts/plan-overlap.mjs`.** `wait(root, opts)` is private; `parseArgs` defaults
  `intervalS: 30, timeoutMin: 60`. Each round it fetches `origin`, reads
  `feature-catalog.yaml` on `origin/HEAD` (else `origin/main`), exits 2 naming an id the
  catalog lacks, goes ahead (exit 0, `Merges after: <ids> — shipped on <branch>; go
  ahead.`) when every id is `shipped` or `dropped`, and past the deadline exits 3 with
  `STOPPED: waiting on <pending ids>`. So an entry parked back to `shaped` (the sprint
  design §6: *an entry parked after its claim moves back from `building` to `shaped`*)
  keeps it waiting, contrary to FW-055.
- **The guards.** `guards/merge-token.test.js` has `describe` blocks *against a local
  origin* (bare repositories made by `makeOrigin`/`makeClone`, async runs through
  `runAsync`), *against an origin on GitHub, faked* (a stub `gh` whose state file has
  `ref`, `commits`, `pulls`, `branch` — the branch's committer date or `null` for a 404 —
  and helpers `stage`, `ago(minutes)`, `message(holder, taken, kind)`), and *the
  documents*. Its cases pass `--timeout` (`0.01` to `0.5` minutes) wherever a take waits;
  the case *waits and stops, naming the holder, when the create says the reference
  exists* asserts the exact stdout `STOPPED: waiting for the token, held by other\n`.
  `guards/plan-overlap.test.js` has `describe('--wait')` with `waitProject({ status,
  header })` and `FAST = ['--interval', '0', '--timeout', '0.01']`; its case *stops
  naming the entry when it has not shipped in time* expects exit 3 and
  `/STOPPED: waiting on a/`.
- **The workflow.** `framework/workflow.md`, section `## Plans that touch the same
  files`, last bullet starts `- **Before merging**, run` and contains `After 60 minutes`.
  Section `## The merge token` has the bullet starting `- **The wait has a time limit.**`
  and the bullet starting `- **A stale token is broken only on the developer's word.**`.
  Section `## Merging` has the numbered list whose items 1 and 2 are
  `` `node .tropis/scripts/plan-overlap.mjs --wait <plan>` — *Plans that touch the same
  files*. `` and `` `node .tropis/scripts/merge-token.mjs take` — *The merge token*. ``.
  The guard case *workflow.md takes the token after the wait for overlapping plans and
  releases it after* checks the order of those strings after `## Merging`: keep them.
  Nothing else under `framework/`, `commands/`, `templates/` or `rules/` names either
  time limit (`git grep -nF -e "60 min" -e "time limit" -- framework commands templates
  rules` finds only the two workflow lines and an unrelated line in
  `rules/incidents/planning.md`).
- **The decision record.** FW-052's *Consequences* still says `A waiter whose holder died
  stops after an hour and says so.` after the sentence pointing at FW-055; that sentence
  becomes false with this plan (*Decision 4*). FW-051's *Decision* says `for at most 60
  minutes, then stops naming it`, and its *Consequences* already says FW-055 replaces it;
  leave FW-051 as it is.
- **The other plan in building.** `sprint-plans-and-runs-a-team`
  (`docs/superpowers/plans/2026-11-02-sprint-plans-and-runs-a-team.md`) also edits
  `framework/workflow.md`, so this plan's header carries `Merges after` for it (written
  by the overlap check at claim). It adds its own new section to the workflow; expect a
  rebase conflict there only if both edit the same lines.
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about the merge token, the merges-after wait or background commands, so a
  local fresh-agent probe in a scratch folder outside this repository is a real one.
- **Lessons from the two plans already written from this spec** (their review records):
  import a module under test as a namespace; a red self-check stops at its clean-baseline
  step and never lists test names, so run the changed test file alone for red; the next
  free `FW-` number moves while a plan is in flight.

**Model tier: Medium.** Two scripts get a clock seam and a new stop condition over two
kinds of origin, with stateful `gh` stubs and real local bare repositories; the approach
and the prose are fixed, the edge cases need care.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 7; do not open a pull request, write a review record
or merge.

**Requires:** an agent command-line tool that starts a fresh session from a prompt, for the fresh-agent check in Task 5 (record which, and its version).

**Merges after:** sprint-plans-and-runs-a-team

Do not store a kick-off prompt on this plan.

---

## Delivers

waits-end-when-something-happens

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-waits -b plan/waits-end-when-something-happens origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.** Use `node:` built-ins and what the scripts already import.
- **Do not lower, skip or delete a guard or a test.** Changing an existing case's expected
  output is allowed only where *Decision 5* says so.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`. Test identities use `example.com` addresses.
- **Never touch `refs/tropis/merge-token` on GitHub.** Other sessions are using it right
  now. No task in this plan needs GitHub at all; every check runs against local bare
  repositories or a stub `gh`.
- **No test reaches the network**, and no test sleeps for minutes: time beyond a second
  is simulated through the `now` seam (*Decisions 1 and 3*).
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from. The two scripts and their guards are this
  repository's own and may be followed.
- **Tests isolate git, the script does not**, as the existing guards do
  (`.claude/rules/harness-scripts.md`).

## Decisions

### 1. The token wait (`scripts/merge-token.mjs`)

- `take` gains two options, `now = Date.now` and `sleep` (default: the module's own
  `sleep`), used for every reading of the clock and every pause inside `take`, so a test
  can run hours of waiting in milliseconds. `timeoutMs` defaults to `Infinity`; the
  deadline is `now() + timeoutMs` (Infinity when none was given). `parseArgs` defaults
  `timeoutMs: Infinity` and still accepts `--timeout <minutes>`.
- While another holds the token, each round, after the deadline check: when the marker
  is a `branch` marker whose `taken` is at least `STALE_MINUTES` old by `now()`, ask
  whether it is stale, the same way `tokenStatus` does (*Decision 2*). If it is, exit 3
  with exactly one stdout line:
  `STOPPED: waiting for the token, held by <holder>, which is stale — <reason>. Break it only on the developer's word: node .tropis/scripts/merge-token.mjs break --holder <holder>`
  where `<reason>` is `no open pull request and no push for 30 min` where `origin` is on
  GitHub and `no push for 30 min` elsewhere (30 is `STALE_MINUTES`). A `hold` is never
  asked about and never stale. A marker with no readable `taken` is never stale.
- At the deadline (only when `--timeout` or `timeoutMs` was given), exit 3 with the line
  it prints today: `STOPPED: waiting for the token, held by <holder>`.
- The stderr line printed once becomes
  `merge-token: held by <holder>; asking every <s> s until it is free or turns stale`
  with ` (at most <min> min)` appended when a limit was given.
- The module comment's usage block: `3 still held by another at the timeout` becomes
  `3 the holder turned stale, or the --timeout passed`, and `--timeout` is described as
  optional with no default.

### 2. Staleness where `origin` is not on GitHub

Pull requests cannot be asked there, so `openPull` is `false` and the judgement rests on
the branch alone: `isStale` unchanged, with `tipMinutes` read through git. Add a private
`judgeStaleByGit(ctx, marker, minutes, now)`: `git ls-remote --exit-code origin
refs/heads/<holder>`; exit 2 → `tipMinutes = null`; exit 0 → `git fetch --quiet
--no-write-fetch-head origin <sha>` then `git log -1 --format=%ct <sha>` →
`tipMinutes = max(0, floor((now() - ct*1000) / 60000))`; any other failure → not stale.
`tokenStatus` uses it off GitHub, as it uses `judgeStale` on GitHub, so status and take
agree everywhere. Off GitHub the status line's reason reads `stale: no push for 30 min.`
instead of `stale: no open pull request and no push for 30 min.`; the rest of the line is
as today. One function choosing between the two judgements by `ctx.github`, called by
both `tokenStatus` and `take`, is the intended shape.

*Why:* without it, removing the limit would leave every waiter off GitHub waiting forever
on a holder that died, the failure FW-052's limit existed to prevent. Off GitHub nothing
in Tropis waits on a pull request, so a branch with no push for 30 minutes is a fair sign.
*Rejected:* keeping a limit off GitHub only (two behaviours to explain); never judging
stale off GitHub (waits forever).

### 3. The merges-after wait (`scripts/plan-overlap.mjs`)

- Export the wait as `waitForPlans(root, opts, { now = Date.now, sleep } = {})`, the
  command line calling it; every clock reading and pause goes through the seam.
  `parseArgs` defaults `timeoutMin: Infinity`; `--timeout <minutes>` still sets one.
- It goes ahead when **no** id in `Merges after` has `status: building` in the catalog on
  origin's main branch, whatever the others' statuses are. The line becomes
  `Merges after: <ids> — none building on <branch> (<id> <status>, …); go ahead.` — for
  example `Merges after: a — none building on origin/main (a shaped); go ahead.` An id
  the catalog lacks still exits 2 as today.
- At a given deadline it exits 3 with today's `STOPPED: waiting on <ids still building>`.
- The stderr line becomes
  `plan-overlap: waiting until <ids> is no longer building, asking origin every <s> s`
  with ` (at most <min> min)` appended when a limit was given.
- The module comment: `Defaults 30 seconds and 60 minutes` becomes `Defaults 30 seconds
  and no limit`; `until every entry … is shipped or dropped` becomes `until no entry … is
  building (shipped, dropped, or parked back to shaped)`; `3 at the timeout` stays, noting
  it happens only with `--timeout`.

### 4. The documents

**`framework/workflow.md`, section `## Plans that touch the same files`.** Replace the
whole last bullet, from `- **Before merging**, run` to the end of that bullet (`…which
also covers waiting on an entry that was parked.`), with:

```markdown
- **Before merging**, run `node .tropis/scripts/plan-overlap.mjs --wait <plan>` as a
  background command that wakes you when it ends. It asks `origin` every 30 seconds
  until no entry the plan merges after is `building` there — shipped, dropped, or parked
  back to `shaped` — and goes ahead at once when the plan has no `Merges after`. It has
  no time limit: an entry still building after hours is still being worked on, and its
  session ends the wait by landing or parking it. `--timeout <minutes>` sets a limit,
  after which it exits 3 and prints `STOPPED: waiting on <id>`: report that line and
  stop.
```

**Same file, section `## The merge token`.** Replace the whole bullet starting
`- **The wait has a time limit.**` with:

```markdown
- **The wait ends when something happens, not after a time.** Run `take` as a
  background command that wakes you when it ends. It waits as long as the holder is
  working, however long that is, and takes the token once it is free. When the token
  turns stale (below), it exits 3 and prints `STOPPED: waiting for the token, held by
  <holder>, which is stale`, the reason and the command that breaks it: report that line
  and stop, because breaking a token is the developer's call. A hold never turns stale,
  so a session waits for the developer to release it. `--timeout <minutes>` sets a
  limit, after which `take` exits 3 and prints `STOPPED: waiting for the token, held by
  <holder>`.
```

In the bullet starting `- **A stale token is broken only on the developer's word.**`,
append after its last sentence (`A hold is never stale.`):

```markdown
  Where `origin` is not on GitHub, pull requests cannot be asked, so a token held by a
  branch for 30 minutes is stale when that branch is absent on `origin` or has had no
  push for 30 minutes.
```

**Same file, section `## Merging`, the numbered list.** Item 1 becomes
`` `node .tropis/scripts/plan-overlap.mjs --wait <plan>`, in the background — *Plans that touch the same files*. ``
and item 2 becomes
`` `node .tropis/scripts/merge-token.mjs take`, in the background — *The merge token*. ``
(rewrapped to the list's width as the existing items are).

Keep every line within the file's existing width (the longest prose lines are 89
characters); rewrap only the lines you change.

**`framework/DECISIONS.md`.** In FW-052's *Consequences*, replace the sentence
`A waiter whose holder died stops after an hour and says so.` with
`A waiter whose holder died stops once the token turns stale and says so.` Then append a
new decision at the end of the file, numbered with the next free `FW-` number on your
base (the reviewer renumbers it at merge if `main` has moved; write it as the number you
see, not a placeholder):

```markdown
## FW-NNN: A wait for the token stops on a stale holder, judged by the branch alone off GitHub

**Date:** 2026-11-02 · **Status:** Accepted.

**Decision:** `merge-token.mjs take` and `plan-overlap.mjs --wait` have no time limit
unless `--timeout` gives one. The token wait asks, each round, whether the holder is
stale, as `/next` does, and stops naming the holder and the command that breaks the
token when it is; the merges-after wait goes ahead when no entry it waits on is
`building` on origin's main branch. Where `origin` is not on GitHub, pull requests
cannot be asked, so a token held by a branch for 30 minutes is stale when that branch is
absent on `origin` or has had no push for 30 minutes; the status line says so too.

**Rejected:** Keeping a limit where `origin` is not on GitHub (two behaviours to explain
for one wait). Never judging staleness there (a waiter whose holder died would wait
forever, which FW-052's limit existed to prevent). Going ahead on `shipped` or `dropped`
only (an entry parked back to `shaped` would hold its followers forever).

**Consequences:** A session runs both waits as background commands that wake it; a
tool that cannot keep a command running for hours ends the wait early, and running the
same command again resumes it. Implements FW-055 for the waits shipped with FW-051 and
FW-052. Source: the entry `waits-end-when-something-happens`.
```

### 5. The tests

**`guards/merge-token.test.js`** — keep every existing case; their `--timeout` arguments
stay. Add, in the block named in brackets (cases marked † must fail before *Decision 1
or 2* is applied, which Task 3 proves):

1. † [local origin] **takes past an hour while the holder is working**: an origin whose
   token is held by branch `plan/b` (taken by a second clone), with `plan/b` pushed to
   origin. Call `take(clone, { holder: 'plan/a', intervalMs: 0, now, sleep })` imported
   from the module, where `now` starts at the real time and advances 20 minutes on each
   `sleep` call, and each `sleep` call commits and pushes a fresh commit to `plan/b`
   (committer date = the simulated now, through `GIT_COMMITTER_DATE`) so the branch never
   ages; on the sixth `sleep` it releases the token from the second clone. Expect exit
   0, `taken by plan/a`, and at least six `sleep` calls (two simulated hours). Before the
   change it exits 3 at the 60-minute deadline.
2. † [local origin] **stops naming a stale holder**: token marker held by `plan/gone`,
   written straight into the bare repository with `taken` 45 minutes ago (build it with
   `markerMessage`, `git commit-tree` on the seed tree and `git update-ref`), and no
   branch `plan/gone` on origin. `take` through the command line with
   `--interval 0` and no `--timeout`, under a Jest timeout of 20 s: exit 3, stdout exactly
   `STOPPED: waiting for the token, held by plan/gone, which is stale — no push for 30 min. Break it only on the developer's word: node .tropis/scripts/merge-token.mjs break --holder plan/gone\n`.
   Before the change it waits 60 minutes and the case times out: that is its red.
3. † [local origin] **status shows a stale holder off GitHub**: the same origin; the
   status line contains `held by plan/gone for 45 min — stale: no push for 30 min.` and
   `break --holder plan/gone`. Then push a fresh `plan/gone` branch: the line does not
   contain `stale`.
4. [local origin] **waits on a hold however old**: a `hold` marker taken 500 minutes ago;
   `take` with the simulated clock of case 1 and no branch at all: still waiting after
   six `sleep` calls, then released by the test; exit 0. (Not †: holds were never
   judged.)
5. † [GitHub, faked] **stops on a stale holder through the API**: `stage({ ref: SHA,
   commits: { [SHA]: message('plan/x', ago(45)) }, pulls: [], branch: null })`, `take`
   with `--interval 0` and no `--timeout`: exit 3 and stdout exactly
   `STOPPED: waiting for the token, held by plan/x, which is stale — no open pull request and no push for 30 min. Break it only on the developer's word: node .tropis/scripts/merge-token.mjs break --holder plan/x\n`.
6. [GitHub, faked] **does not stop on an open pull request**: as 5 with
   `pulls: [{ head: { ref: 'plan/x' } }]` and `--timeout 0.01`: exit 3 with the
   timeout line `STOPPED: waiting for the token, held by plan/x\n` — the limit, not
   staleness, ended it.

**`guards/plan-overlap.test.js`** — keep every case. Add in `describe('--wait')`:

7. † **goes ahead when the entry was parked back to shaped**: `waitProject({ status:
   'shaped' })`, run with `FAST`: exit 0 and stdout matching
   `/none building on origin\/main \(a shaped\); go ahead/`.
8. † **keeps waiting past an hour while the entry is building**: import `waitForPlans`
   as a namespace member; `waitProject({ status: 'building' })`; call it with
   `{ plan: P('mine'), intervalS: 0, timeoutMin: Infinity }` and a `now` that advances 20
   minutes per `sleep`; on the sixth `sleep`, push `a` as `shipped` from another clone.
   Expect 0. Before the change it exits 3 at 60 minutes.

Before the change, case 7 exits 3 (`shaped` is not `shipped` or `dropped`).

### 6. What this owes, and does not

- **Doc closeout:** the workflow and the decision record (*Decision 4*). The operator
  guide `templates/README.md` names neither limit (checked), so it is unchanged. The
  README is not patched (`/refresh-readme`). No upstream queue: this repository is the
  upstream. A release-note line is the developer's at `/release`.
- **No developer check:** nothing here has a screen.
- **No live check on GitHub:** the GitHub stale judgement is unchanged and already
  checked live by the plan that shipped it; the new code reuses it.

## Traps

- **The tests must fail first.** Task 2 commits the new cases before the code and runs
  each changed test file alone (`npx --prefix .self-check jest guards/merge-token.test.js`
  or however the self-check's own Jest is invoked — find it in `scripts/check-blueprint.sh`):
  the self-check never lists test names when it is red. Case 2's red is a Jest timeout,
  not an assertion: that is expected.
- **Import the modules as namespaces**, or every case fails at link time for one reason.
- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.** It
  shows nothing of this change; it must stay green.
- **This plan quotes `Merges after` lines that are not declarations** (in *Task 5*'s
  scratch project). Its header's only `Merges after` field is the one the overlap check
  wrote at claim; add none, and remove none.
- **A forgotten background process.** The fresh-agent probe (Task 5) starts waits in the
  background inside a scratch project. Kill every process it left (`pkill -f
  "$TMPDIR/waits-agent"` or by pid) before deleting the folder.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/merge-token.mjs` | *Decisions 1 and 2* |
| `scripts/plan-overlap.mjs` | *Decision 3* |
| `guards/merge-token.test.js` | *Decision 5*, cases 1 to 6 |
| `guards/plan-overlap.test.js` | *Decision 5*, cases 7 and 8 |
| `framework/workflow.md` | *Decision 4* |
| `framework/DECISIONS.md` | *Decision 4* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment mapping criteria to tests (Task 6) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 6) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-waits-end-when-something-happens.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm`, and the
operating system's version, for the handover.

### Task 1 — Confirm the starting point

Run `git grep -nF -e "3600000" -e "timeoutMin: 60" -- scripts` — expected before the
work: `scripts/merge-token.mjs` (twice) and `scripts/plan-overlap.mjs` (once). Paste it.
After Task 3 the same command must print nothing.

### Task 2 — The tests, red

Write cases 1 to 8 (*Decision 5*). For cases 1, 4 and 8 the `now`/`sleep` options do not
exist yet, so add to the scripts only what lets the cases call them: export
`waitForPlans` with today's behaviour, and pass `now`/`sleep` through `take` without
changing what it decides. Commit. Run each changed test file alone (*Traps*): every †
case fails, cases 4 and 6 pass, and every case that existed before passes. Paste the
failing test names.

### Task 3 — The scripts

Apply *Decisions 1 to 3*. Commit. Run both test files alone (all pass), then Task 1's
grep (prints nothing), then `bash scripts/check-blueprint.sh` (last line starts
`Self-check passed`). Paste each.

Then show the stale stop can fail: as a throwaway commit, make `take` skip the staleness
question (always wait); run `guards/merge-token.test.js` alone — expected red: cases 2
and 5. Then, as another throwaway commit, make `waitForPlans` go ahead only on
`shipped`/`dropped` again — expected red: case 7. `git reset --hard HEAD~1` after each.
Paste the failing names. If one stays green, fix the test, commit, and repeat.

### Task 4 — The documents and the decision

Apply *Decision 4*. Commit. Run
`git grep -nF -e "After 60 minutes" -e "The wait has a time limit" -- framework` —
expected: nothing (before the work it prints two lines). Run
`git grep -nF "in the background" -- framework/workflow.md` — expected: at least the two
Merging items and the two bullets. Run `bash scripts/check-blueprint.sh`; last line
`Self-check passed`. Paste each.

### Task 5 — Fresh-agent check

The workflow now tells an agent to run both waits as background commands with no limit,
and that only a stale holder stops the token wait. A fresh agent with only a project set
up from this branch must be seen to do so. Run it with its tool calls visible (in Claude
Code, `claude -p --output-format stream-json --verbose`, allowed to run shell commands),
with the scratch project as its working directory.

1. Set up: `mkdir -p "$TMPDIR/waits-agent" && git init -q --bare "$TMPDIR/waits-agent/origin.git"`,
   `mkdir "$TMPDIR/waits-agent/kiln-yard" && git -C "$TMPDIR/waits-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/waits-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/waits-agent/kiln-yard/.tropis" ci`. Give the project a local
   identity (`example.com`), a `feature-catalog.yaml` with two entries in `building`,
   `glaze-log` (plan `docs/superpowers/plans/glaze-log.md`, delivering `glaze-log`, with
   `**Merges after:** kiln-timer` in its header) and `kiln-timer` (plan
   `docs/superpowers/plans/kiln-timer.md`), commit everything, add the bare repository as
   `origin`, push `main`, then create branch `plan/glaze-log` with one commit and push
   it. Put a token marker in the bare repository held by branch `plan/kiln-timer`, taken
   now, and push a branch `plan/kiln-timer` with a fresh commit (so the holder is not
   stale).
2. Prompt, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, the branch `plan/glaze-log` has
   been reviewed and is ready to merge. Check it out and start the steps the project's
   `.claude/framework/workflow.md` lists in its Merging section, the way it says to run
   them. Do not rebase or merge anything. Then report each command you started, how you
   ran it, and what will end each wait."*
3. Check, and paste from the stream: a `plan-overlap.mjs --wait` call run in the
   background (in Claude Code, a Bash call with `run_in_background: true`) with no
   `--timeout`, and the agent's report saying it ends when `kiln-timer` is no longer
   building. If the agent ran the token take too (it may, or may wait for the first wait
   to end first; both follow the workflow), the same for `merge-token.mjs take`, and the
   report saying it ends when the token is free or turns stale. If the agent did not
   reach the take, run a second prompt: *"This is a probe; its output will be discarded.
   In the project at `<scratch project>`, the wait for overlapping plans for
   `plan/glaze-log` has gone ahead. Take the next step of the Merging section the way the
   workflow says to run it, and report the command, how you ran it, and what will end
   it."* and check the take the same way.
4. Kill every process the probe left (*Traps*).

If the agent runs a wait in the foreground, passes `--timeout`, or says a wait ends after
a time, the wording is not clear enough: change it, commit, and run the probe again. If
it fails twice, stop and hand back with both transcripts' relevant calls. Record the
tool, its version, the operating system and the architecture; these go in the commit body
of the final commit (a no-change commit with `--allow-empty` is fine) and in the
handover, with one sentence per prompt on what the agent was asked and whether it did
it. Delete the scratch folder afterwards.

### Task 6 — The catalog and the board

1. In `feature-catalog.yaml`, on `waits-end-when-something-happens`: set `status:
   shipped` (it reads `building`; if it reads anything else, set `shipped` anyway and say
   so under *Judgment calls*). Set `modules` to `scripts/merge-token.mjs`,
   `scripts/plan-overlap.mjs`, `guards/merge-token.test.js` and
   `guards/plan-overlap.test.js`. Add this plan's path to `refs` if it is not there.
   Remove `blockedBy` if the entry has it. Add, directly above the entry's `- id:` line,
   a comment `# Shipped by docs/superpowers/plans/2026-11-02-waits-end-when-something-happens.md.`
   and lines mapping each of the six criteria to the cases (by number and name) or the
   Task 5 check that cover it, as the comment above `overlapping-plans-merge-in-order`
   does. Criterion 6 (the workflow) is covered by Task 5. Do not put `: ` (colon and
   space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole `waits-end-when-something-happens:`
   block (the key and its indented lines, through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 7 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/waits-end-when-something-happens`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.

## Handover report

### Task completion

Tasks 0 to 7 done, in order. Setup, starting grep, red tests, scripts, documents,
fresh-agent check, catalog and board, verification. The branch is pushed; no pull request.

### Verification results

Platform for everything below: git 2.49.0, node v22.15.0, Claude Code 2.1.300 (model
sonnet), macOS 26.2 on arm64.

- Task 0: `git status --porcelain` empty; `bash scripts/check-blueprint.sh` last line
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1, before: `scripts/merge-token.mjs:269` and `:361` (`3600000`),
  `scripts/plan-overlap.mjs:81` (`timeoutMin: 60`). After Task 3 the same grep prints nothing.
- Task 2, red (both test files alone, committed seam only): `Tests: 6 failed, 42 passed, 48 total`. Failing:
  case 1 (takes the token after two hours), case 2 (stops naming a holder with no branch),
  case 3 (status line stale off GitHub), case 4 (keeps waiting on a hold), case 5 (GitHub
  faked, stale through the API), case 7 (parked back to shaped).
- Task 3, green: `Tests: 48 passed, 48 total`; grep empty; self-check `Self-check passed`.
  Throwaway commit making `take` never ask about staleness: failed
  `with no time limit › stops, naming a holder with no branch...` and `against an origin
  on GitHub, faked › stops naming a holder GitHub shows stale...` (cases 2 and 5);
  `Tests: 2 failed, 29 passed`. Throwaway commit going ahead only on shipped/dropped:
  failed `--wait › goes ahead when the entry was parked back to shaped` (case 7);
  `Tests: 1 failed, 16 passed`. Each throwaway commit was dropped with `git reset --hard HEAD~1`.
- Task 4: `git grep -nF -e "After 60 minutes" -e "The wait has a time limit" -- framework`
  prints nothing. `git grep -nF "in the background" -- framework/workflow.md` prints the two
  Merging items (lines 411, 413) and an unrelated line 388; the two bullets say "as a
  background command" instead (the plan's own wording), so they do not match that phrase.
  Self-check passed.
- Task 5, fresh-agent check, run locally with `claude -p --model sonnet --output-format
  stream-json --verbose`, ANTHROPIC_API_KEY unset, in a scratch project set up from this
  branch with two `building` entries (`glaze-log` merging after `kiln-timer`) and a token
  held by a non-stale `plan/kiln-timer` branch. The user's own global instructions load in
  that run but say nothing about the merge token, the waits or background commands.
  - Prompt 1 (check out `plan/glaze-log` and start the Merging steps): the agent made a
    worktree and ran `node .tropis/scripts/plan-overlap.mjs --wait docs/superpowers/plans/glaze-log.md`
    with `run_in_background: true` and no `--timeout`, and reported it ends when `kiln-timer`
    is no longer `building` (shipped, dropped or parked), with no limit. It did not start the
    take, saying it follows once the first wait ends (the workflow's order). Its stderr:
    `plan-overlap: waiting until kiln-timer is no longer building, asking origin every 30 s`.
  - Prompt 2 (wait has gone ahead; take the next step): the agent ran
    `node .tropis/scripts/merge-token.mjs take` with `run_in_background: true`, no
    `--timeout`, and reported it ends when the token is free, or exits 3 with `STOPPED ...
    stale` for a stale holder (the developer breaks it), a hold waits for release.
  - Both passed first time; no wording change was needed. Processes killed and scratch deleted.
- Task 6: `npm --prefix .tropis test`: `Tests: 152 passed, 152 total`.
- Task 7: same command `Tests: 152 passed, 152 total`; `bash scripts/check-blueprint.sh`
  last line `Self-check passed: ...`; diff stat below.

### Scope

Worktree used: `../tropis-waits` (a sibling of `tropis`).

```
 docs/backlog-board/bands.yaml |  13 -----
 feature-catalog.yaml          |  18 ++++++-
 framework/DECISIONS.md        |  24 ++++++++-
 framework/workflow.md         |  35 +++++++-----
 guards/merge-token.test.js    | 120 +++++++++++
 guards/plan-overlap.test.js   |  32 +++++++
 scripts/merge-token.mjs       |  90 ++++++++++++++++++++++---------
 scripts/plan-overlap.mjs      |  31 ++++++-----
 (plus this plan file)
```

Every file is in File Structure; `docs/backlog-board/index.html` did not change.

### Judgment calls

- Decision number: the next free one on `origin/main` was FW-056 (the plan said FW-055 is
  taken), written as such.
- `take` stamps the new marker with `now()` (the seam), not `Date.now()`, so a simulated
  clock stays consistent.
- One function, `judgeHolder`, picks the GitHub or git judgement and is used by both
  `tokenStatus` and `take`; the stale-reason text and break advice are shared constants.
- The case-4 and case-5 cases sit in their blocks; the local-origin cases share one nested
  `describe('with no time limit')` block inside *against a local origin*.
- Source worked from: none outside this repository; the two scripts and their guards were followed.
- The fresh-agent probe could not use `git checkout -b` in the scratch project (the
  worktree hook refuses it); branches there were made with `git commit-tree` and a push.

### What the plan got wrong

- Case 8 cannot be red before the change. With the seam already in (Task 2) and
  `timeoutMin: Infinity` passed explicitly, the old code also waits and goes ahead on
  `shipped`; the 60-minute default lives in `parseArgs`, which the case does not reach. It
  stays as a guard against a limit creeping in, but it is not proof of the default's removal;
  the grep in Task 1 is.
- Case 4 (hold) is red before the change too, not green: the old 60-minute default stops
  it after three simulated pauses. It passes after.
- The plan's `git grep "in the background"` expectation (two items plus two bullets) does
  not hold for the bullets, which use the plan's "as a background command" wording.

### Outstanding

- The change has no screen, so there is no developer check.
- The FW number may need renumbering at merge if `main` moved.
- A tool that cannot keep a background command alive for hours ends a wait early (stated in
  FW-056); not observed here.

## Review record

### Checks re-run

All by the specifying session, with git 2.49.0, node v22.15.0 and the self-check's own
Jest, on macOS 26.2, arm64, against the branch's committed `HEAD`.

- Scope: `git diff --stat origin/main...HEAD` lists the eight files of *File Structure*
  and this plan, nothing else.
- The two changed guard files alone, staged from `HEAD` as the self-check stages them:
  `Tests: 48 passed, 48 total`.
- Re-breaking, each as a throwaway commit then dropped:
  - `take` never asking about staleness: red on *stops, naming a holder with no branch
    and no push for half an hour* and *stops naming a holder GitHub shows stale*
    (`2 failed, 46 passed`).
  - The merges-after wait going ahead only on `shipped`/`dropped`: red on *goes ahead
    when the entry was parked back to shaped* (`1 failed, 47 passed`).
  - `take`'s default limit put back to an hour: red on *takes the token after two hours
    of waiting on a holder that keeps pushing* and *keeps waiting on a hold, however old*
    (`2 failed, 46 passed`).
- `bash scripts/check-blueprint.sh` on `3329615`: `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards
  passed.` `npm --prefix .tropis test`: `Tests: 152 passed, 152 total`.

### Found

Public exposure: the diff was read for private material; nothing found. Test identities
are `example.com` addresses, and holder names are invented.

- FW-052's edited *Consequences* sentence ran past the file's width. Fixed on the branch
  by the reviewer (rewrapped, same words): mechanical, and the checks above ran after it.
- The `plan-overlap.mjs` command line's default (no limit) is shown only by the Task 1
  grep, not by a test: case 8 passes `timeoutMin: Infinity` itself, as the handover says.
  The token wait's default is tested through `take`'s own default. Accepted: the
  command-line default is one literal, and the grep shows it.
- The handover's three corrections to the plan (case 8 cannot be red, case 4 is red
  before the change, the `in the background` grep) are right; checked against the cases
  and the workflow text.

### Outstanding disposition

- No screen, so no developer check: none owed.
- The decision number: renumbered at merge if `main` has moved (done at the token, if
  needed; the commit landing it says so).
- A tool that cannot keep a background command alive for hours ends a wait early: stated
  in the new decision's *Consequences*, and observing it in Claude Code is already the
  job of `sprint-plans-and-runs-a-team` (FW-055). No new entry.

### Learnings routed

- The plan's case 8 could not go red because the default it guarded lives in the command
  line's argument parsing, which the case did not reach. A one-off planning error, named
  here for the next plan that adds a seam beside a default; not routed further.
- What this built is the upstream already; nothing is queued.

### Merged because

Both waits now end on events and both stop conditions are guarded by cases shown to go
red, the fresh-agent check found the workflow's new wording does what it says, and the
only defect found was a line width, fixed on the branch.
