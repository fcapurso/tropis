# A wait that outlasts a cloud container still ends on its event — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** each of the three waits a delivery runs — for what a backlog item is blocked by,
for a plan it merges after, and for the merge token — can check once and say it is still
waiting, and the workflow tells a session whose processes may not outlast its idle time,
such as a Claude Code cloud session, to run them that way from a wake it schedules for
itself, instead of as one long background command.

**Backlog item:** `cloud-waits-wake-on-a-schedule` in `feature-catalog.yaml`. Spec:
`docs/superpowers/specs/2026-11-03-cloud-sprint-design.md`, *What a cloud session hit*
item 5, and *The pieces, in order*, piece 4. Decisions it builds on: FW-055 (waits end
when something happens) and FW-063.

**One plan:** what becomes true is one sentence — a wait ends when its event happens,
however long the session sits idle and wherever it runs.

**What the specifying session verified on 2026-11-03, against `origin/main` at `3cefb56`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64), and what a cloud session measured the
same day (Claude Code 2.1.317, Claude Code cloud session, Linux x86_64):**

- **The cloud replaces an idle container, and that ends every process.** At 14:15:59Z
  `uptime` printed `up 0 min` after the session had sat idle about two hours with nothing
  running; files on disk survived, processes did not, and the session saw only
  `This session's worker process was restarted.` when next woken.
- **A background command is capped and is not safe across that.** The shell tool stops a
  background command after 7 200 000 ms, two hours. A 90-minute `sleep` started in the
  background did finish and woke the idle session, in the same container; whether a
  running command keeps a container alive was not established.
- **A self-scheduled wake survives it.** `send_later` (fields `message`, `at` or
  `delay_minutes`, `name`, `initiation`; its description says "Delivery survives
  container restarts") was set for 20 minutes and woke the session 35 s after the due
  minute, as its own turn. `create_trigger` is the general form, stored on the server.
  `CronCreate`, `ScheduleWakeup` and `Monitor` live in the container or only in a loop,
  and do not survive.
- **What can wake a cloud session:** the developer, another session's message, pull
  request activity it subscribed to (one pull request at a time), a scheduled task, and a
  background command ending. Nothing subscribes to pushes to a branch, so a change on
  `main` is seen only by checking.
- **The three waits today.** `scripts/sprint.mjs wait <id> [--interval <seconds>]`: exit
  0 when what the item is blocked by has shipped, 3 with `PARKED: depends on <id>` when a
  blocker was dropped, parked or stopped, 1 for an unknown id; no time limit (module
  comment, lines 31–33). `scripts/plan-overlap.mjs --wait <plan> [--interval]
  [--timeout]`: exit 0 when nothing it merges after is `building`, 2 when origin or its
  catalog cannot be read, 3 at the `--timeout` with `STOPPED: waiting on <ids>` (lines
  12–18). `scripts/merge-token.mjs take`: exit 0 taken or already held by this holder, 3
  when the holder turned stale or at the `--timeout`, 2 when it could not be taken.
- **Where the workflow runs them in the background:** `framework/workflow.md`, *Plans
  that touch the same files* (around line 272), *The merge token* (around line 311) and
  *Delivering a backlog item* step 0 (around line 468).

**Decided by the specifying session:**

- **`--once` on each of the three:** it checks once and exits; where the wait would go
  on, it exits **5** with one line starting `Still waiting:` and saying on what (the ids,
  or the token's holder). Every other exit keeps its meaning: a `--once` that finds the
  event done behaves as the wait does when it ends, `take --once` takes a free token, and
  a stale holder or a parked blocker still exits 3. `--once` and `--timeout` together are
  refused as a usage error.
- **The workflow's rule:** where a session's processes may not outlast its idle time — a
  Claude Code cloud session, whose container can be replaced while it sits idle and whose
  background commands stop after two hours — run each wait with `--once`. On exit 5,
  schedule a wake for 30 minutes later with the session's own scheduling tool that
  survives a restart (`send_later` in a Claude Code cloud session), naming the command to
  run again, and end the turn; on that wake, run it again. A wait for a pull request is a
  subscription to its activity instead, where the tool has one (*Merge and clean up*).
  Each check is a turn, so a long wait costs about two turns an hour.
- **Decision record:** write one, numbered at merge as the next free FW number, with the
  rejected options: one long background command (capped at two hours and ended by a
  container replacement); a scheduler inside the container such as cron (it lives in the
  container); and a shorter interval (more turns for an event that takes hours).

**Model tier: Large.** Three scripts, their guards, and the workflow's wording, with a
fresh-agent check.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 6; do not open a pull request, write a review record
or merge.

**A fresh-agent check is owed**, because `framework/workflow.md` changes: Task 5.

Do not store a kick-off prompt on this plan.

---

## Delivers

cloud-waits-wake-on-a-schedule

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-cloud-waits -b plan/cloud-waits-wake-on-a-schedule origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Never take, release or break the live merge token, and never push to `main`,
  `tropis/merge-token` or `tropis/sprint` of the real repository.** Every test runs
  against a local bare origin.
- **Every commit has a body** saying what becomes true; the commit touching
  `framework/workflow.md` states the fresh-agent check's outcome once it has run.
- **This repository is public.** No home paths, hostnames (a dotted name with a local-network suffix
  counts), personal or computer names in anything committed, the handover
  included.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

1. **`scripts/sprint.mjs`**, `wait`: `--once`. Update the module comment's usage lines.
2. **`scripts/plan-overlap.mjs`**, `--wait`: `--once`. Update the module comment.
3. **`scripts/merge-token.mjs`**, `take`: `--once`. Update the module comment and `USAGE`.
4. **`framework/workflow.md`:** a short section, **Waiting where a session may not last**,
   after *The merge token*, stating the rule above in the workflow's voice, and in each
   of the three places that say to run a wait in the background, one clause pointing to
   it. Keep the existing wording otherwise.
5. **`commands/sprint.md`**, where it describes the sprint session waiting on its team
   (`watch`, and "where are we?"): one sentence that a sprint session in such a session
   checks `status` on a scheduled wake the same way, since command-line team members are
   not started there.
6. **The spec**, `docs/superpowers/specs/2026-11-03-cloud-sprint-design.md`: under *The
   answer*, a short paragraph with the wait probe's findings above; in *The pieces, in
   order*, piece 4 says it is built this way.
7. **`framework/DECISIONS.md`:** the decision, numbered at merge.

## Tests

1. In `guards/sprint.test.js`: † `wait --once` exits 5 with `Still waiting:` and the
   blocker's id while it is `building`, and 0 once it has shipped; and † it exits 3 with
   `PARKED: depends on <id>` when the blocker was parked.
2. In `guards/plan-overlap.test.js`: † `--wait --once` exits 5 naming the ids while one
   is `building`, and 0 once none is; † `--once` with `--timeout` is a usage error.
3. In `guards/merge-token.test.js`: † `take --once` exits 5 naming the holder while
   another holds it and leaves the token as it was; † it takes a free token and exits 0;
   † it exits 3 for a stale holder, as `take` does.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run, and **run it again after
  the handover report is committed**: a handover can break a check on its own.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
- **Run a single guard the way the self-check runs one**, on the project-shaped tree
  `scripts/check-blueprint.sh` builds from a `git archive` of `HEAD`, with the jest under
  `.self-check/`. Say the exact command in the handover.
- **A child process takes the machine's real environment under Jest** unless the test
  passes `env` explicitly; deleting from `process.env` inside a test does not reach it.
- **The decision's number.** Write it as `FW-NNN`; the reviewing session numbers it at
  merge. A heading with `NNN` must not reach `main`.
- **A framework document may name a path in backticks only if it exists in a project.**
  Name the spec and plans in plain text in `framework/` and `commands/`.
- **Tool names are not a contract.** The workflow names `send_later` as the Claude Code
  cloud session's tool, as an example; the rule is a wake the session schedules that
  survives a restart.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | `wait --once` |
| `scripts/plan-overlap.mjs` | `--wait --once` |
| `scripts/merge-token.mjs` | `take --once` |
| `guards/sprint.test.js` | the `wait --once` cases |
| `guards/plan-overlap.test.js` | the `--wait --once` cases |
| `guards/merge-token.test.js` | the `take --once` cases |
| `framework/workflow.md` | *Waiting where a session may not last*, and three pointers |
| `commands/sprint.md` | one sentence |
| `docs/superpowers/specs/2026-11-03-cloud-sprint-design.md` | the wait probe's findings; piece 4 |
| `framework/DECISIONS.md` | the decision |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to cases (Task 6) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 6) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-cloud-waits-wake-on-a-schedule.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the workflow, the sprint command and
the spec change here, and the decision is recorded. No upstream queue: this repository is
the upstream. A release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, `git status --porcelain` (nothing), and
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Record
`git --version`, `node --version`, `uname -sm` and `claude --version`.

### Task 1 — The tests, red

Add the † cases. Commit. Run the three guards alone: the † cases fail. Paste their names.

### Task 2 — The three waits

*The change* items 1–3. Commit. Run the three guards alone: all pass.

### Task 3 — The documents and the decision

*The change* items 4–7. Commit. Then `bash scripts/check-blueprint.sh`: last line starts
`Self-check passed`.

### Task 4 — A run by hand

In a scratch folder outside the repository, with a bare origin and two clones holding
this branch's scripts as a project has them: take the token in one clone, run
`take --once` in the other (expect exit 5 and the holder), release in the first, and run
`take --once` again (expect exit 0). Paste the lines and exits.

### Task 5 — The fresh-agent check

In a scratch clone of this branch outside the repository, run
`claude -p --output-format stream-json --verbose`, with `ANTHROPIC_API_KEY` unset, Bash,
Edit and Write disallowed, and a prompt saying it is a probe whose output is discarded,
that it is a team member in a Claude Code cloud session (its container can be replaced
while it sits idle, its background commands stop after two hours, and it has
`send_later`), that its invented plan is ready to merge but the merge token is held by
another session, and asking what it runs now and what it does until the token is free,
following `framework/workflow.md` in this checkout, without running anything. It passes
when it runs `merge-token.mjs take --once`, and on exit 5 schedules a wake about 30
minutes later naming that command, and ends its turn rather than starting a background
wait. Quote the relevant part, with tool, version, operating system and architecture. If
it misses, change the wording until a new run finds it, and say so. State the outcome in
the body of Task 3's commit (amend) or a new commit.

### Task 6 — The backlog, the board and the handover

1. In `feature-catalog.yaml`, the item to `status: shipped`, `modules` set to
   `scripts/sprint.mjs`, `scripts/plan-overlap.mjs`, `scripts/merge-token.mjs` and
   `framework/workflow.md`, and above it a
   `# Shipped by docs/superpowers/plans/2026-11-03-cloud-waits-wake-on-a-schedule.md.`
   comment with one line per acceptance criterion naming what covers it. No `: ` inside
   an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
3. Commit. Append `## Handover report` with the six sections the planning rule names
   (Outstanding says there is no screen, and that a cloud session waiting through a
   container replacement is the developer's live check after a release). Commit.
4. **Then**, with everything committed: `npm --prefix .tropis test`,
   `bash scripts/check-blueprint.sh` and `git diff --stat origin/main...HEAD`. Add their
   output to the handover's Verification results and commit again; if the self-check is
   red, fix what it names first.
5. `git push -u origin plan/cloud-waits-wake-on-a-schedule`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

Tool: Claude Code, model Claude Sonnet 5.5; git 2.49.0, node v22.15.0, macOS (Darwin) on arm64. Source worked from: none in particular; the `--once` flags are written against this repository's own `scripts/sprint.mjs`, `scripts/plan-overlap.mjs` and `scripts/merge-token.mjs`.

### Task completion

- Task 0: done. `npm --prefix .tropis ci`, clean tree, baseline self-check ended `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1: done. Seven † cases added (sprint 2, plan-overlap 2, merge-token 3, one of the sprint cases covering exit 5 and then 0). Run alone before the change: `Tests: 6 failed, 96 passed, 102 total`. Failing: sprint `wait --once` exits 5 then 0; sprint `wait --once` exits 3 PARKED; merge-token `take --once` exits 3 for a stale holder; merge-token `take --once` takes a free token; and two of the other three, the held-token case and the plan-overlap cases (the `--once` with `--timeout` usage-error case already exited 2 before the change, so it cannot fail first; see below).
- Task 2: done. Same three guards after: `Tests: 102 passed, 102 total`.
- Task 3: done. Workflow section and three pointers, sprint command sentence, spec paragraph and piece 4, decision (heading `FW-NNN`, to be numbered at merge). Self-check passed.
- Task 4: done, by hand (below).
- Task 5: done, passed on the first run; outcome is in the body of Task 3's commit.
- Task 6: done.

### Verification results

- Single guards were run with a scratch script that does what the self-check does for one guard: `git archive HEAD` into a temp dir, write `{"type":"module"}` as `package.json`, copy `templates/framework-jest.config.js` to `jest.config.js`, link `.self-check/node_modules`, then `node --experimental-vm-modules .self-check/node_modules/.bin/jest --config jest.config.js guards/sprint.test.js guards/plan-overlap.test.js guards/merge-token.test.js`.
- Task 4, by hand, against a scratch bare origin and two clones holding this branch's `merge-token.mjs`:
  - clone a `take --holder a`: `Merge token: taken by a.`, exit 0
  - clone b `take --holder b --once`: `Still waiting: the merge token is held by a.`, exit 5
  - clone a `release --holder a`: `Merge token: released by a.`, exit 0
  - clone b `take --holder b --once`: `Merge token: taken by b.`, exit 0
- Task 5, fresh-agent check: Claude Code 2.1.300 on macOS (Darwin) arm64, `claude -p --output-format stream-json --verbose`, `ANTHROPIC_API_KEY` unset, signed in to the developer's plan, Bash, Edit and Write disallowed, in a scratch clone of this branch outside the repository. Its tool calls were a search of and two reads of `framework/workflow.md`. Its answer: run `node .tropis/scripts/merge-token.mjs take --once`; "That shows as exit 5 and a line starting `Still waiting:`"; call `send_later` with `delay_minutes: 30` and a message naming that command; "I end the turn. I don't use cron or a background loop"; on the wake run the same command again. It passed on the first run, so the wording was not changed. The default user instructions on this machine say nothing about waits, so the probe did not follow them in place of the change.
- `npm --prefix .tropis test` (the installed release's checks, not this source): `Test Suites: 13 passed, 13 total`, `Tests: 164 passed, 164 total`.
- `bash scripts/check-blueprint.sh` after the handover commit: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `git diff --stat origin/main...HEAD` (before this edit): 13 files changed, 269 insertions, 33 deletions; commands/sprint.md, docs/backlog-board/bands.yaml, the plan, the spec, feature-catalog.yaml, framework/DECISIONS.md, framework/workflow.md, three guards, three scripts.

### Scope

Files changed are the ones in the File Structure table; `docs/backlog-board/index.html` did not change. Worktree used: the sibling `../tropis-cloud-waits` of the `tropis` checkout.

### Judgment calls

- Exit 5 lines: `Still waiting: <id> is blocked by <ids>, which has/have not shipped.` (sprint), `Still waiting: this plan merges after <ids>, which is/are still building.` (plan-overlap), `Still waiting: the merge token is held by <holder>.` (token).
- `--once` is accepted with `--interval` and ignores it. Only `--once` with `--timeout` is a usage error (plan-overlap and merge-token). `--once` on any merge-token command other than `take` is a usage error. On `sprint.mjs` it is accepted only for `wait`.
- For `take --once`, a stale branch holder is judged before the exit 5, so it exits 3 as `take` does.
- The spec cites the decision as "the decision that follows FW-065", since its number is given at merge.

### What the plan got wrong

- The plan's † case that `--once` with `--timeout` is a usage error cannot fail before the change: an unknown flag already exits 2 with the usage line, so it is a regression case. The red count was six of seven.
- The fresh-agent probe noticed a gap that is older than this change: the workflow does not say what a session does when its wake lands in a new container where its worktree is gone, so `take` would claim the token under whatever branch is checked out. Not fixed here.

### Outstanding

There is no screen. A cloud session waiting through a container replacement, woken by its own `send_later`, is the developer's live check after a release. The decision's `FW-NNN` heading needs its number at merge.

## Review record

Reviewed by the specifying session, a Claude desktop app session. Tools: Claude Code
2.1.300, git 2.49.0, node v22.15.0, macOS 26.2 on arm64.

### Checks re-run

- Rebased onto `origin/main` cleanly. Scope: 13 files, all in *File Structure*.
- The handover's self-check ran after its own commit: `Self-check passed: every guard
  caught its defect, the clean baseline passed, and the framework repository's own guards
  passed.` The reviewer's changes below touch only the decision's number and the spec's
  reference to it, and the pull request's pipeline runs the checks again.
- The hand run: `take --once` printed `Still waiting: the merge token is held by a.` and
  exited 5 while another clone held the token, and exited 0 taking it once released.
- The fresh-agent check is in the handover: `claude -p` 2.1.300 on macOS arm64, with
  Bash, Edit and Write disallowed, chose `take --once`, then `send_later` with 30 minutes
  naming that command, and ended its turn, with no background loop or cron. It found
  what the change intended.

### Found

Public exposure: the diff was read for home paths, hostnames, email addresses and names;
nothing found.

- The three waits take `--once` with exit 5 and a `Still waiting:` line; every other exit
  keeps its meaning; `--once` with `--timeout` is refused. The workflow's new section and
  its three pointers say when to use it and how to re-arm.
- The executor's choices where the plan was silent stand (`--interval` ignored with
  `--once`; `--once` only on `take`).
- The decision is numbered FW-066, and the spec's forward reference now names it.
- **Not fixed here, proposed as a backlog item:** a cloud session whose wake lands after
  a container replacement may find its worktree gone, and `take` without `--holder` names
  the holder from the current branch, which in a cloud session's only checkout is the
  assigned branch. The probe found the disk survived its one restart, so the worktree
  normally stays; the workflow does not yet say what to do when it does not.

### Outstanding disposition

- No developer check: the change has no screen. A cloud session waiting through a
  container replacement is the developer's live check after a release.
- The release-note line is the developer's at `/release`.

### Learnings routed

- The follow-up above, put to the developer as a backlog item.

### Merged because

Each wait can check once and say it is still waiting, the workflow tells a session that
may not last to re-run it from a wake it schedules, a fresh agent did exactly that, and
the self-check passes.
