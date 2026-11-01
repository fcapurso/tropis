# A pull request whose pipeline finished without its required check is reported — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `node scripts/main-status.mjs --pull-request <N>` stops with exit 4 and one
line naming the missing check, the head commit and the run's address when the pull
request is blocked, every pipeline run on its head commit has finished, and a check the
base branch's rules require has no check run on that commit. Today that pull request
stays blocked with every check it shows green, and the wait times out after 30 minutes
saying only that it is still open.

**Spec:** the entry `a-run-without-its-gate-is-reported` in `feature-catalog.yaml` (band B
in `docs/backlog-board/bands.yaml`). There is no design document; the entry's six
acceptance criteria, the `#` comments above it, and the decisions below are the design.

**What happened (from the comments above the entry):** on 2026-11-01, landing pull
request 74 of this repository, pipeline run 41291063425 on its head commit completed with
conclusion success and no gate job at all — not skipped, absent — while the run on the
commit before had its gate pass. The ruleset requires `pipeline / gate`, so auto-merge
waited with the pull request `BLOCKED`, the merge wait ran its 30 minutes, and nothing
said why. One manual re-run of that run scheduled the gate, which passed, and the pull
request merged. The cause is not known and is out of scope.

**What the specifying session verified on 2026-11-01, against `main` at `9a670c4`:**

- **The wait.** `seeThrough(root, number, …)` in `scripts/main-status.mjs` loops: it asks
  `gh api repos/{owner}/{repo}/pulls/<n>`; returns when `merged` (then waits for the push
  run on the merge commit through `waitForRun`); stops (exit 4, through the local
  `stopped(why)`, which prints `Pull request #<n>: did not merge — <why>`) when the pull
  request is closed, when `auto_merge` is null, when a check run on the head has a
  conclusion in `RED`, or when `mergeable_state` is `dirty`; brings a `behind` branch up to
  date once per head; and returns exit 3 at the deadline. Check runs come from
  `gh api repos/{owner}/{repo}/commits/<head>/check-runs?per_page=100` and each has
  `name`, `status`, `conclusion` and `html_url`. Errors from `gh` go through `askGh`, which
  returns `{ error }`; `cannotTell(reason)` turns one into an exit-0 "could not tell" line.
- **Run listing.** `runsOn(root, filter, options)` always adds `--event push`; it is used
  for push runs on `main`. Pull request runs have event `pull_request`, so the new
  question cannot go through `runsOn` as it stands. `FIELDS` is
  `status,conclusion,headSha,url,createdAt,displayTitle`; `newestFirst` sorts by
  `createdAt`.
- **The rules.** The ruleset Tropis ships, `templates/github/main-branch-ruleset.json`,
  has a rule `{ "type": "required_status_checks", "parameters": { …,
  "required_status_checks": [{ "context": "pipeline / gate" }] } }`. GitHub's
  `GET repos/{owner}/{repo}/rules/branches/<branch>` returns the active rules for a branch
  as a list in that shape; the pipeline's host job already reads it, in `readHost` in
  `scripts/pipeline.mjs`, as
  ``['api', `repos/${repo}/rules/branches/${encodeURIComponent(branch)}?per_page=100`]``.
  The check run for the gate job of the reusable workflow is named `pipeline / gate`,
  the same string as the rule's context (the existing test "stops with exit 4 naming the
  check that failed" uses that name).
- **The tests.** `guards/main-status.test.js` runs the script against a stub `gh` first on
  `PATH` (`STUB_GH`). Its `api` routing is a `case` on `$*`: `*pulls/*/update-branch*`,
  `*check-runs*` (answers `checks.json`), `*pulls/*` (answers `pull-<k>.json` on its k-th
  call, else `pull.json`); then `api repos/{owner}/{repo}` answers the default branch and
  `run list` answers `runs-<n>.json` on its n-th call, else `runs.json`. Anything else
  prints `stub gh: unexpected call` and exits 99. `beforeEach` writes `runs.json` as `[]`
  and `checks.json` with no check runs. Inside `describe('--pull-request')` the helpers are
  `pull(fields)` (default `mergeable_state: 'blocked'`, head `HEAD_SHA`, base `main`),
  `MERGED`, `pulls(...)`, `checks(...[name, conclusion])` (every check `status:
  'completed'`), `updates()`, `GREEN`, `fast`, and a `beforeEach` that writes `runs.json`
  as one successful run on `MERGED_SHA`. So today a rules call from the script would hit
  the stub's exit 99.
- **The workflow text.** `framework/workflow.md`, *Merge and clean up*, the paragraph
  beginning **Where the main branch is gated, the merge is**, says: "Its exits are those
  of `--wait` below, plus 4 when the pull request did not merge. Its line then names why:
  a conflict, a failed check, auto-merge off, or the pull request closed. On 4, fix what
  it names, set auto-merge again if it was off, and run it again." No guard asserts that
  sentence (`grep -rn "a conflict, a failed check" guards scripts` prints nothing).
  `templates/README.md` says only that the wait "says why when it did not merge", which
  stays true.

**Model tier: Medium.** A function, its tests and one paragraph against stated behaviour,
red checks to run, and one fresh-agent probe to set up and judge; every decision is made.

**Merge authority: parent review.** The wait is what every gated merge in every project ends with; a wrong exit 4 tells an agent to act on a pull request that was fine. Stop after the handover report (Task 5); do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 3 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

a-run-without-its-gate-is-reported

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-gate-report -b plan/a-run-without-its-gate-is-reported origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Change `scripts/main-status.mjs`,
  `guards/main-status.test.js` and `framework/workflow.md`. Do not edit anything under
  `.claude/`, `.tropis/` or `.cursor/`, or `CLAUDE.md`.
- **The script never re-runs a run, starts a check, or writes anything on GitHub** beyond
  the update-branch call it already makes. The new questions are reads.
- **Never push anything except this plan's branch; never touch a real pull request.**
  Every test runs against the stub `gh`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. The new stop (`scripts/main-status.mjs`)

- **Where in the loop.** After the `dirty` stop and after the `behind` update block,
  before the deadline check, and only when `pull.mergeable_state === 'blocked'`. A branch
  that is `behind` is brought up to date instead, which gives it a new head and a new run;
  only a blocked pull request is waiting on a check.
- **The required checks** are the `context` of every entry in
  `parameters.required_status_checks` of every rule whose `type` is
  `required_status_checks`, from
  `gh api repos/{owner}/{repo}/rules/branches/<encodeURIComponent(base)>?per_page=100`.
  Ask once per invocation, the first time the pull request is blocked, and keep the
  answer. **A failed or malformed answer counts as no required checks**: the wait then
  behaves exactly as before, and the rules are not asked again. It does not become a
  "could not tell": this question is an extra, and must never turn a working wait into a
  stopped one.
- **Which are missing.** A required context is missing when no check run on the head (the
  `check_runs` already fetched this iteration) has that `name`. When none is missing, or
  none is required, nothing changes. A required check that is present, in any state, is
  left to the existing logic.
- **Every pipeline run on the head has finished.** Only when something is missing, ask
  `gh run list --workflow pipeline.yml --commit <head> --limit 20 --json <FIELDS>` — no
  `--event`, because the pull request's runs are `pull_request` runs. Add this as a small
  function beside `runsOn` (or give `runsOn` a way to leave out `--event push`, keeping
  every existing call's arguments byte-for-byte the same, since tests assert them). The
  state is reported only when the answer is a non-empty list and every run in it has
  `status === 'completed'`. An empty list, a run still going, or a failed or malformed
  answer: nothing is reported, and the wait goes on.
- **The line**, through the existing `stopped`, exit 4, naming the first missing context
  in the rules' order and the newest run (`newestFirst`) by its `url`:

  ```
  Pull request #<n>: did not merge — the pipeline finished on <head7> without the required check <context>, and nothing will start it now. Run: <url>
  ```

  `<head7>` is `short(head)`. Nothing is re-run.
- Update the file's top comment and the `seeThrough` doc comment so they stay true: the
  exit-4 reasons now include this one, and the wait reads the base branch's rules.

### 2. The tests (`guards/main-status.test.js`, inside `describe('--pull-request')`)

- **The stub.** Add an `api` route `*rules/branches/*` answering `rules.json`, placed
  before `*pulls/*`, and have the outer `beforeEach` write `rules.json` as `[]`, so every
  existing test keeps its behaviour. Update the stub's comment. Add a helper
  `requires(...contexts)` that writes one `required_status_checks` rule with those
  contexts (plus, to prove the type is read, a `{ "type": "pull_request" }` rule before
  it).
- **Pipeline runs on the head** come from the stub's `run list` route; in these tests the
  pull request never merges, so `runs.json` (or `runs-<n>.json`) answers the head's runs.
  Give each run `headSha: HEAD_SHA` through the existing `run(...)` helper.
- **Cases**, each asserting `status` and exact `stdout`, and filtering `log()` by name
  rather than counting calls:
  1. Blocked, `requires('pipeline / gate')`, checks `pipeline / host` success and
     `pipeline / build` success, runs on the head all `completed`: exit 4 and
     `Pull request #7: did not merge — the pipeline finished on feed000 without the required check pipeline / gate, and nothing will start it now. Run: <the newest run's url>\n`;
     the log has a line containing `rules/branches/main` and a `run list` line containing
     `--commit ${HEAD_SHA}` and no `--event`.
  2. Same, but one run on the head `in_progress`, then on a later call all completed
     (`runs-1.json`, then `runs.json`): the first iteration does not stop; the second
     does, with exit 4. And a variant where it stays in progress until the timeout: exit 3
     with the existing timeout line.
  3. Required check present: `checks(['pipeline / gate', 'success'])` with the pull
     request blocked, then `MERGED`: exit 0 and `GREEN`; no `run list` line naming
     `HEAD_SHA`.
  4. Rules unreadable: make the rules route fail (a file `rules-fails`, like
     `update-fails`, makes it print an error and exit 1), gate missing, runs completed,
     blocked then `MERGED`: exit 0 and `GREEN`, and the rules were asked once. And rules
     `[]` (no required check): the same.
  5. Not blocked: `mergeable_state: 'clean'` (or `unstable`) with the gate missing and the
     runs completed, then `MERGED`: exit 0, `GREEN`, and no rules call.
  6. No run on the head (`runs.json` `[]` for the head): not reported; with `MERGED`
     after, exit 0.
  7. Nothing is written: in case 1, no logged call has `-X`, `rerun`, `workflow run` or
     `update-branch`.

### 3. The workflow paragraph (`framework/workflow.md`)

In the paragraph quoted above, replace

> Its line then names why: a conflict, a failed check, auto-merge off, or the pull
> request closed. On 4, fix what it names, set auto-merge again if it was off, and run it
> again.

with

> Its line then names why: a conflict, a failed check, auto-merge off, the pull request
> closed, or a pipeline that finished without a check the main branch requires. On 4,
> fix what it names, set auto-merge again if it was off, and run it again. **A pipeline
> that finished without its required check** leaves nothing on the branch to fix, and
> nothing will start the check: re-run that run once by hand, with `gh run rerun` and
> the run id from the address the line gives, say so in your report with that address,
> and run the wait again. That re-run starts a check that never ran, so it hides no
> failure; if the check is missing again, stop and report both runs.

Reflow to the paragraph's line width; change nothing else in the file.

## Traps

- **`bash scripts/check-blueprint.sh` reads committed content only.** Commit before you
  run it. For a red check, make the revert a throwaway commit, run the guard through the
  snippet in Task 0, and drop the commit (`git reset --hard HEAD~1` on your own branch
  only).
- **`npm --prefix .tropis test` runs the installed release's checks**, not the source
  guards: it does not run `guards/main-status.test.js` from this branch. Use the snippet
  for the guard and the self-check for everything.
- **Existing tests assert exact `gh` argument lists** for `run list` on `main` and on the
  merge commit. Leave those calls' arguments unchanged.
- **The commit hook speaks at a commit touching framework documents**, asking for a
  fresh-agent outcome in the body. The commit that changes `framework/workflow.md` carries
  Task 3's result; make Task 3 run before that commit.
- **`guards/set-up-project.test.js` "records every shipped file at version unknown"** is
  known to pass only in the self-check's archive export and to fail from a checkout. If
  it is the only failure in `npm --prefix .tropis test`, check it fails the same on
  `origin/main` and record that; do not fix it here.
- **A plan header field sits on one line** until a release after 0.7.1 is installed; this
  plan's do. Do not rewrap them.

## File Structure

| File | Change |
|---|---|
| `scripts/main-status.mjs` | Decision 1 |
| `guards/main-status.test.js` | Decision 2 |
| `framework/workflow.md` | Decision 3 |
| `feature-catalog.yaml` | Task 4: the entry to shipped |
| `docs/superpowers/plans/2026-11-01-a-run-without-its-gate-is-reported.md` | Task 5: the handover report |

Doc closeout, decided by the specifying session: the workflow paragraph (Decision 3) and
the script's own comments are the documents this change owes. No `DECISIONS.md` entry:
reading the required checks from the rules rather than naming `pipeline / gate` follows
what the pipeline's host job already does, and the catalog comments record it. No rule:
the behaviour is the script's, and the workflow paragraph is where an agent reads what to
do on exit 4. `templates/README.md` stays true as written. Nothing for an upstream queue:
this repository is the upstream, and the change ships with the next release.

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table; run the command from the primary checkout of `tropis`,
the one whose `.git` is a directory, after `git fetch origin`). In the worktree run
`npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints nothing),
then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `uname -sm`, your tool and version, and the commit you started from.

To run one guard on committed content outside the self-check (used below):

```bash
S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
echo '{"type":"module"}' > "$S/package.json"
cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
(cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/main-status.test.js); rm -rf "$S"
```

### Task 1 — The stop and its tests (Decisions 1 and 2)

Write the tests first and commit them alone; run the snippet and record the failures (at
least cases 1 and 2 must fail; every test that passed on `main` must still pass). Then
change the script, commit, and run the snippet: passes when `guards/main-status.test.js`
reports no failed test.

**Red checks**, each as a throwaway commit, run through the snippet, then dropped; record
the failing test names:

- the `mergeable_state === 'blocked'` condition removed — case 5 must fail;
- the "every run completed" condition removed (report whenever something is missing) —
  case 2 must fail;
- a failed rules answer turned into `cannotTell` — case 4 must fail.

### Task 2 — The workflow paragraph (Decision 3)

Edit the paragraph. Check with `git diff origin/main -- framework/workflow.md` that only
that paragraph changed. Do not commit yet: Task 3's result goes in this commit's body.

### Task 3 — The fresh-agent check

The paragraph changes what an agent does on exit 4. Probe it with a fresh session that
has only a scratch clone of your branch, holding your uncommitted paragraph:

```bash
P="$(mktemp -d)"; git clone -q "$PWD" "$P/tropis"
cp framework/workflow.md "$P/tropis/framework/workflow.md"
git -C "$P/tropis" remote remove origin
```

Pipe it this prompt, from `$P/tropis`, allowing only read tools (Read, Grep, Glob); give
the tool and version you used:

> This is a probe; its output is discarded and nothing you say will be run. This
> repository is the framework itself; `framework/workflow.md` is the next release and
> governs here, over `.claude/framework/workflow.md`. You set pull request 512 to merge
> itself and ran `node .tropis/scripts/main-status.mjs --pull-request 512`. It exited 4
> and printed:
> `Pull request #512: did not merge — the pipeline finished on 3c9e1aa without the required check pipeline / gate, and nothing will start it now. Run: https://github.com/acme/example/actions/runs/7700112233`
> You cannot run commands. Say exactly what you would do next, in order, with any
> command in full, and what you would do if the same line came back afterwards.

**Passes when** the answer re-runs that run once (`gh run rerun 7700112233`, or the same
with a flag such as `--failed` left out or included), says it will report it with the
run's address, runs the wait again, and stops and reports both runs if the line comes
back — and does not push a commit, close or reopen the pull request, turn auto-merge off
and on, or re-run more than once. Any other answer: the paragraph is not finished;
reword it, re-run, and record each run. Delete `$P` afterwards.

Before running it, check that your own instructions for every project (outside this
repository) do not already say what the paragraph says; if they do, say so in the
record. Then commit Task 2 with a body saying what becomes true and, in one or two
sentences, what the probe was asked, what it answered, and the tool, version, operating
system and architecture (never the computer's name).

### Task 4 — The full suite, the criteria, the catalog

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite (Trap's known one aside)
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

For each of the entry's six acceptance criteria, name the test or recorded check that
covers it, and check the named test runs what the criterion describes; put the table in
the handover. Expected: 1 is case 1; 2 is case 2; 3 is case 3; 4 is case 4; 5 is case 7;
6 is the paragraph and the probe.

In `feature-catalog.yaml`, on `a-run-without-its-gate-is-reported`: set
`status: shipped`; set `modules` to `scripts/main-status.mjs`,
`guards/main-status.test.js` and `framework/workflow.md`; set `refs` to this plan's path;
and directly above its `- id:` line, below the comments already there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-a-run-without-its-gate-is-reported.md;
# each criterion's test or check is in that plan's handover report.
```

Leave `docs/backlog-board/bands.yaml` alone. Commit, then re-run the two commands above
and `git diff --stat origin/main...HEAD` (passes: only the *File Structure* files).

### Task 5 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*: Task completion, Verification results,
Scope, Judgment calls, What the plan got wrong, Outstanding), each check's command with
its actual output, the red checks' failing test names, the criteria table, the probe's
answer, and the worktree path used. Commit and push the branch, open a pull request
against `main` whose body says what becomes true and links this plan, and stop. Do not
write a review record and do not merge.

## Handover report

Worktree used: `../tropis-gate-report`, branch `plan/a-run-without-its-gate-is-reported`, rebased onto `origin/main` at the end. Started from `955622c`. git 2.49.0, node v22.15.0, Darwin arm64, Claude Code 2.1.300.

### Task completion

Tasks 0 to 4 done; Task 5 changed by the dispatching session: the branch is pushed and **no pull request is opened**.

### Verification results

- `bash scripts/check-blueprint.sh` (run alone, after the final commit): `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.` One earlier run, started in parallel with `npm --prefix .tropis test`, ended `Self-check FAILED`; the same command alone passed, so parallel runs interfere. Not investigated further.
- `npm --prefix .tropis test`: 13 suites, 135 tests passed.
- Guard snippet on the tests-only commit: 3 failed, 44 passed. Failing: "stops with exit 4 naming the check, the commit and the newest run", "waits while a run on the head is still going, then stops", "goes on waiting when the rules cannot be read, and asks only once". Every test passing on `main` still passed. With the script change: 47 passed, 47 total.
- Red checks (throwaway commits, dropped):
  - `blocked` condition removed: "does not ask the rules when the pull request is clean" and "... is unstable" fail.
  - "every run completed" condition removed: "waits while a run on the head is still going, then stops" and "exits 3 at the timeout when a run on the head never finishes" fail.
  - unreadable rules turned into `cannotTell`: "goes on waiting when the rules cannot be read, and asks only once" fails.

### Criteria

| # | Criterion | Covered by |
|---|---|---|
| 1 | exit 4, one line naming check, commit, run | "stops with exit 4 naming the check, the commit and the newest run" (exact stdout, rules call, `--commit` without `--event`) |
| 2 | a run still going: not reported | "waits while a run on the head is still going, then stops" and "exits 3 at the timeout ..." |
| 3 | required check present: as before | "says nothing when the required check is there" |
| 4 | rules unreadable or none required: as before | "goes on waiting when the rules cannot be read ..." and "... require no check" |
| 5 | never re-runs or starts anything | "writes nothing on GitHub" (no `-X`, `rerun`, `workflow run`, `update-branch` in the log) |
| 6 | workflow paragraph | `framework/workflow.md` paragraph plus the probe below |

### Probe

Claude Code 2.1.300, Darwin arm64, `claude -p --output-format stream-json --verbose --allowedTools Read Grep Glob`, from a scratch clone holding the paragraph. Its one call was a Grep on `framework/workflow.md`. Answer: change nothing on the branch; `gh run rerun 7700112233 --repo acme/example` once; report it with the run address; run the wait again; if the same line returns, stop, no second re-run, report both runs. No push, close or reopen, or auto-merge toggle. Passed first run. The owner's global instructions say nothing about re-running.

### Scope

`git diff --stat origin/main...HEAD`: `feature-catalog.yaml`, `framework/workflow.md`, `guards/main-status.test.js`, `scripts/main-status.mjs`, and this plan file.

### Judgment calls

- `runsOn` kept its exact arguments; a new `listRuns` omits `--event`, and `runsOn` calls it with `--event push` added.
- Named source worked from: nothing in particular; written against this repository's own names.
- Two earlier commits lack the attribution trailer; the later ones carry it.

### What the plan got wrong

- Tests that reach `MERGED` after a missing gate need their own run for the merge commit, since the stub does not filter by commit; the plan's case list did not say so.
- The Task 1 snippet's throwaway-commit steps are dangerous if an edit does not apply: a `git reset --hard HEAD~1` after a failed edit drops a real commit. It happened once and was recovered from the reflog.

### Outstanding

Nothing known. No pull request, no review record, nothing merged.
