# A sprint's record survives the session that keeps it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the agreed sprint lives on `origin`, on the branch `tropis/sprint`, read and
written by git pushes with a lease, so a sprint session resumed in a new cloud container
or on another machine finds the sprint under way, and a team member's `mark` or `note`
from another checkout reaches it.

**Backlog item:** `sprint-record-outlives-its-session` in `feature-catalog.yaml`. Spec:
`docs/superpowers/specs/2026-11-03-cloud-sprint-design.md`, *What a cloud session hit*
item 4, and *The pieces, in order*, piece 3. The token it copies the mechanism from:
FW-063 and `scripts/merge-token.mjs`.

**One plan:** what becomes true is one sentence — every session on the project, wherever
it runs, reads and writes the same sprint.

**What the specifying session verified on 2026-11-03, against `origin/main` at `ffec54b`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64), and what a cloud session reported
(Claude Code 2.1.317, Claude Code cloud session, Linux x86_64):**

- **The record today is local.** `scripts/sprint.mjs` `sprintPath` (line 157) is
  `<git common dir>/tropis/sprint.json`; `readSprint` (192) parses it or returns null;
  `writeSprint` (198) writes a sibling file and renames it; `end` (793) removes it. The
  module comment (lines 5–50) says the file is local and never committed. Every command
  that changes the sprint reads it, changes it and writes it whole: `start` (610), `add`
  (640), `drop` (670), `mark` (681), `note` (701), `launch` (around 422).
- **Who writes it from where.** The workflow has a team member run
  `node .tropis/scripts/sprint.mjs mark <id> parked <why>` (`framework/workflow.md`,
  *Delivering a backlog item*, around line 479) from its own checkout, so in a cloud
  sprint each team member writes a different container's file and the sprint session
  never sees the mark. A cloud container is reclaimed after inactivity, and with it the
  file; the cloud session found `Sprint: none under way` would follow.
- **What stays local, and should.** The team folder `<git common dir>/tropis/team/`
  (briefs, logs, results of command-line team members launched on this machine) and the
  subscriptions record are this machine's, and are not part of this plan.
- **What a cloud session can push.** Branches only, with a lease; it cannot delete a
  branch (FW-063's evidence). So the record is never deleted: an ended sprint is a commit
  with no record in it.
- **What reads the record:** `commands/sprint.md` line 12 says the sprint is kept "in a
  local file git does not track". `guards/sprint.test.js` (line 115, 296) and
  `guards/team-member-cli.test.js` (line 121) read the local file directly. Both guards
  already build a local bare origin (`guards/sprint.test.js` lines 65–74).

**Decided by the specifying session:**

- **The branch `tropis/sprint`**, whose last commit's tree holds one file, `sprint.json`,
  the record as today. Each change is a new commit on the previous one, so the branch is
  the sprint's history. An ended sprint is a commit whose tree is empty. No such branch,
  or an empty tree, means no sprint under way.
- **Every change is a read, a change and a push with a lease** on the commit read. A push
  refused because another session moved the branch first reads again and applies the
  same change again, up to a few times, then fails with one line saying so. So every
  command that changes the sprint passes a function from the old record to the new one,
  rather than a whole record.
- **Where there is no remote named `origin`**, the record stays in the local file, as
  today, so a project with no remote keeps working.
- **A sprint under way when a project takes this release** is kept: where the branch
  holds no record and the local file does, a read returns the local file's record, the
  next change pushes it to the branch, and the local file is then removed.
- **Decision record:** write one, numbered at merge as the next free FW number, with the
  rejected options: keeping the file local and committing a copy on each change to the
  main branch (every change would need a pull request); a ref outside branches (a cloud
  session cannot push one, FW-063).

**Model tier: Large.** The read-change-push loop with its retry, the migration, and the
tests against a bare origin need judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**Merges after:** cloud-session-knows-the-subscriptions, cloud-session-works-on-a-plan-branch

**No fresh-agent check is owed:** no file under `framework/` other than the decision
record, nor under `rules/`, changes, and `commands/sprint.md` changes a fact it states,
not what it tells an agent to do.

Do not store a kick-off prompt on this plan.

---

## Delivers

sprint-record-outlives-its-session

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-sprint-record -b plan/sprint-record-outlives-its-session origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; a case that
  reads the local file is rewritten to read the record where it now lives.
- **Never push to `tropis/sprint`, `tropis/merge-token` or `main` of the real
  repository.** Every test runs against a local bare origin.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

1. **`scripts/sprint.mjs`:**
   - `SPRINT_REF = 'refs/heads/tropis/sprint'`.
   - `readSprint(root, env)` returns `{ sprint, sha }`: where origin exists,
     `git ls-remote`, `git fetch` of that commit, and `git show <sha>:sprint.json`
     (`sprint: null` for no branch or a commit without the file); otherwise the local
     file as today, with `sha: null`. Where the branch holds no record and the local file
     does, return the local file's record with the branch's `sha` (or none), so the next
     change pushes it.
   - `updateSprint(root, env, change)`: reads, calls `change(sprint)` (which returns the
     new record, or `null` to end it), and pushes a commit on the read commit (no parent
     when there was none) whose tree is `sprint.json` holding the new record, or the
     empty tree for `null`, with `--force-with-lease=<ref>:<sha or empty>`. On `stale
     info`, `fetch first` or `already exists`, read and apply `change` again, at most 5
     times, then refuse with `Sprint: the record kept changing under this command; run it again.`
     Where there is no origin, write the local file as today. After a push that carried a
     record read from the local file, remove the local file.
   - `start`, `add`, `drop`, `mark`, `note`, `launch` and `end` change the record through
     `updateSprint`; their checks (a sprint already under way, an unknown id) run inside
     the change, on the record read. Their printed lines do not change, except `end`'s
     last line, which becomes `Sprint: ended; the record on origin says no sprint is under way.`
     where origin exists.
   - The module comment says where the record lives, that it is never deleted, and what
     stays local (the team folder).
2. **`commands/sprint.md`**, line 12: the sprint is kept on `origin`, on the branch
   `tropis/sprint`, so it survives the conversation and the machine; without an
   `origin`, in a local file.
3. **`templates/README.md`**, where it describes `/sprint` (find it with
   `git grep -n "sprint" templates/README.md`): one sentence that the sprint's record is
   the branch `tropis/sprint` on `origin`, which nothing deletes.
4. **`framework/DECISIONS.md`**: the decision, numbered at merge (see *Traps*).

## Tests

In `guards/sprint.test.js`, reading how it builds its bare origin and clones:

1. † `test('a sprint started in one clone is under way in another', …)`: `start` in
   clone A; `status` in a fresh clone B of the same origin shows the sprint.
2. † `test('a mark from a team member\'s clone reaches the sprint session', …)`: `start`
   in A, `mark <id> parked <why>` in B, `status` in A shows the mark.
3. † `test('two changes at once both land', …)`: two clones each read, then the first
   pushes; the second's push is refused and its change is applied again on the first's.
   Drive it through `updateSprint` or by a `pre-receive` hook that refuses the first
   push once, whichever the script allows without a seam that exists only for tests;
   say which in the handover.
4. † `test('end leaves the branch with no record, and a new sprint can start', …)`.
5. † `test('a local sprint file is carried to origin by the next change', …)`: write the
   local file as an earlier release would, run `mark` or `note`, and expect the branch to
   hold the record and the local file to be gone.
6. † `test('without an origin the record stays local', …)`.

Rewrite the cases that read the local file (around lines 115 and 296) to read the record
where it now lives. In `guards/team-member-cli.test.js`, change only what reads or
writes the local sprint file (around line 121), the same way.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
- **Run a single guard the way the self-check runs one**, on the project-shaped tree
  `scripts/check-blueprint.sh` builds from a `git archive` of `HEAD`, with the jest under
  `.self-check/`. Say the exact command in the handover.
- **A plan running at the same time changes `scripts/sprint.mjs`.** The plan
  `cloud-session-starts-like-local` moves `teamModelLine` and `teamModelFor` to a shared
  subscriptions reader. This plan merges after it; do not touch those two functions.
- **The decision's number.** Write it as `FW-NNN`; the reviewing session numbers it at
  merge. A heading with `NNN` must not reach `main`.
- **A framework document may name a path in backticks only if it exists in a project.**
  Name the spec and plans in plain text in `framework/`, `commands/` and `templates/`.
- **`--force-with-lease=<ref>:` with an empty value** refuses when the branch exists; the
  lease must name exactly the commit read.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | the record on the branch `tropis/sprint`; `updateSprint`; the migration |
| `guards/sprint.test.js` | six cases; the local-file cases rewritten |
| `guards/team-member-cli.test.js` | only what reads or writes the local sprint file |
| `commands/sprint.md` | where the sprint is kept |
| `templates/README.md` | one sentence |
| `framework/DECISIONS.md` | the decision |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to cases (Task 5) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 5) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-sprint-record-outlives-its-session.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the sprint command and the operator
guide change here, and the decision is recorded. No upstream queue: this repository is
the upstream. A release-note line is the developer's at `/release`: the sprint is now
kept on `origin`, so it can be resumed from any machine, and a sprint under way is
carried there by its next change.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, `git status --porcelain` (nothing), and
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Record
`git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the † cases. Commit. Run `guards/sprint.test.js` alone: the † cases fail. Paste
their names.

### Task 2 — The record on the branch

*The change* item 1, and the rewritten cases in both guards. Commit. Run both guards
alone: all pass.

### Task 3 — The documents and the decision

*The change* items 2–4. Commit. Then `bash scripts/check-blueprint.sh`: last line starts
`Self-check passed`.

### Task 4 — A run by hand

In a scratch folder outside the repository, make a bare origin and two clones, install
this branch's scripts as a project has them (as the guards do), and run in clone A
`start`, in clone B `mark <id> parked testing`, then in A `status` and `end`. Paste the
lines.

### Task 5 — The backlog, the board and the handover

1. In `feature-catalog.yaml`, the item to `status: shipped`, `modules` set to
   `scripts/sprint.mjs`, and above it a
   `# Shipped by docs/superpowers/plans/2026-11-03-sprint-record-outlives-its-session.md.`
   comment with one line per acceptance criterion naming the case that covers it. No
   `: ` inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
3. Commit. Run `npm --prefix .tropis test`, `bash scripts/check-blueprint.sh` and
   `git diff --stat origin/main...HEAD`; paste each.
4. Append `## Handover report` with the six sections the planning rule names (Outstanding
   says there is no screen, and that a resumed cloud sprint session is the developer's
   live check after a release). Commit.
5. `git push -u origin plan/sprint-record-outlives-its-session`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

Tool: Claude Code, model Claude Sonnet 5.5; git 2.49.0, node v22.15.0, macOS (Darwin) on arm64. Source worked from: none in particular; the read, change and lease-push loop is written against this repository's own `scripts/merge-token.mjs` mechanism (FW-063) and `scripts/sprint.mjs` names.

### Task completion

- Task 0: done. `npm --prefix .tropis ci`, clean tree, baseline `bash scripts/check-blueprint.sh` ended `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1: done. Seven cases added to `guards/sprint.test.js` (the six the plan names plus one: a change overtaken five times refuses with the one line). Run alone before the source change: `Tests: 6 failed, 35 passed, 41 total`. The six that failed: a sprint started in one clone is under way in another; a mark from a team member's clone reaches the sprint session; two changes at once both land; a change that is overtaken every time refuses with one line; end leaves the branch with no record, and a new sprint can start; a local sprint file is carried to origin by the next change.
- Task 2: done. The record is on `tropis/sprint`; both guards rewritten where they read the local file. `sprint` and `team-member-cli` together: `Tests: 68 passed, 68 total`.
- Task 3: done. `commands/sprint.md`, `templates/README.md`, `framework/DECISIONS.md` (heading `FW-NNN`, to be numbered at merge).
- Task 4: done, by hand against a scratch bare origin and two clones (output below).
- Task 5: done (catalog item shipped, board row removed, this report).

### Verification results

- Final `bash scripts/check-blueprint.sh` on the last commit before this report: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.` (An earlier run failed on `private-material`: the placeholder author email and a variable named the read result's `local` field matched; renamed in a follow-up commit, run again green.)
- `npm --prefix .tropis test`: `Tests: 163 passed, 163 total` (the installed release's checks; it does not exercise this source).
- Single guards were run with `guard.sh`, a scratch script that does what the self-check does for one guard: `git archive HEAD` into a temp dir, write `{"type":"module"}` as `package.json`, copy `templates/framework-jest.config.js` to `jest.config.js`, link `.self-check/node_modules`, then `node --experimental-vm-modules .self-check/node_modules/.bin/jest --config jest.config.js guards/sprint.test.js guards/team-member-cli.test.js`.
- Task 4, run by hand (clone A, clone B, bare origin; output trimmed):
  - A `start e1`: `Sprint: started with 1 backlog items, 3 of 20 effort points; team members start as here.`
  - B `mark e1 parked testing`: `Sprint: e1 marked parked.`
  - A `status`: `Sprint: needs you — 1 stopped or parked.` then `  e1 — parked: testing`
  - A `end`, then A `status`: `Sprint: none under way; run propose, then start.`
  - `git log --format=%s tropis/sprint` on the origin: `sprint: ended`, `sprint: record changed`, `sprint: record changed`; `git ls-tree` of that last commit: empty.

### Scope

`git diff --stat origin/main...HEAD` (before this report): commands/sprint.md, docs/backlog-board/bands.yaml, feature-catalog.yaml, framework/DECISIONS.md, guards/sprint.test.js, guards/team-member-cli.test.js, scripts/sprint.mjs, templates/README.md: 8 files, 393 insertions, 114 deletions. Every file is in the File Structure table; `docs/backlog-board/index.html` did not change. Worktree used: the sibling `../tropis-sprint-record` of the `tropis` checkout.

### Judgment calls

- `readSprint` returns `{ sprint, sha, fromLocal, ... }` and is exported with `updateSprint`; `sprintPath` is kept for the team folder and the local file.
- The overtaking case (test 3) is driven through the exported `updateSprint`: the change function, on its first call, has another clone make its own change, so the first push is refused and the change runs again on the other's record. No test-only seam in the script.
- Origin unreachable: a read uses the last fetched copy of the branch (silently; the backlog read already names a failed fetch); a change refuses with `Sprint: could not reach origin, so the sprint record was not changed.` The plan did not say; the GitHub-origin cases in `status` need the read to work offline.
- A sprint command run where git has no identity writes the record under a stand-in author (`Tropis sprint`, example.com address).
- Retry is on any push refusal matching stale info, fetch first, already exists, non-fast-forward or rejected; any other push failure stops with the first line of git's error.

### What the plan got wrong

- Test 6 (without an origin the record stays local) cannot fail before the change: it describes behaviour that already held, so it is a regression case, not a red-then-green one.
- The plan's list of test 3's two ways (hook or `updateSprint`) was fine; the plan did not list that a hostname-shaped name (the read result's `local` field) or any email in the script trips `private-material`.

### Outstanding

No screen. A resumed cloud sprint session finding the sprint under way is the developer's live check after a release. The decision heading is `FW-NNN` and must be numbered at merge; the release-note line is the developer's at `/release`. Nothing was opened as a pull request, no review record written, nothing merged.
