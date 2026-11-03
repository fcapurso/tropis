# The version check says which failing checks the release caused — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `check-version.mjs` runs the project's checks in its scratch clone twice —
once on the version the project holds, once after taking the release — and tells the
failures the release causes apart from those already failing. Only failures the release
causes make the verdict `not now`; the ones already failing are listed under their own
heading.

**Backlog item:** `version-check-tells-a-red-baseline` in `feature-catalog.yaml` (type
improvement). Spec: `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
entry 8 (`project-knows-whether-to-update`).

**One plan:** what becomes true is one sentence — someone deciding whether to take a
release can tell the checks it breaks from the ones already failing.

**Model tier: Medium.** The flow is given below; the clone's dependency handling between
the two runs and the slow world-based tests need judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request, write a review record
or merge.

**Merges after:** update-skips-a-new-file-that-matches

**No fresh-agent check is owed:** the change touches no file under `framework/`, `rules/`
or `commands/`; the tests below pin what changes.

**What the specifying session verified on 2026-11-03, against `origin/main` at `f43d4bf`
(node v22, Linux x86_64):**

- `scripts/check-version.mjs`, `checkVersion()`: clones the project into a temporary
  folder (`git clone -q --no-hardlinks`), takes the release there with `takeVersion()`,
  makes the dependencies available (`dependencyLink()` symlinks the project's
  `.tropis/node_modules` into the clone when the two `.tropis/package.json` files are
  byte-identical, otherwise it runs `npm --prefix .tropis install`), then runs
  `npm --prefix .tropis test -- --json --outputFile=<tmp>/results.json` with
  `FRAMEWORK_ROOT` and every `JEST_*` variable removed from the environment. It reads the
  failing test names with `failingNames(parsed, clone)` (a test's `fullName`, or
  `<suite file>: <first message line>` for a suite that failed with no failed test).
  Any failure makes the verdict `not now`, with the why line
  `the project's checks failed against the release`.
- `takeVersion()` refuses a dirty tree. A symlink at `.tropis/node_modules` is an
  untracked file to git: the ignore line `.tropis/node_modules/` matches a directory, not
  a symlink (`guards/check-version.test.js`, `world()`, says so and excludes it).
- A project's suite is every `*.test.js` under `.tropis/guards/`
  (`templates/framework-jest.config.js`, `roots: ['<rootDir>/guards']`). A test file the
  project adds there is not in any record, so the take neither replaces nor deletes it.

**Decided by the specifying session:**

- **The baseline runs in the same scratch clone, before the take**, with the same
  environment and the same JSON output, into its own results file. Then the clone's
  `.tropis/node_modules` (the link or the folder the baseline put there) is removed, so
  the take sees a clean tree and the steps after it run exactly as now.
- **Only failures the release causes count against it.** A failing name present in the
  baseline is *already failing*. The verdict is `not now` only when at least one failing
  name after the take is absent from the baseline. Failures already failing add no step.
- **When the baseline cannot be read** (no results file, or one that does not parse, or
  its install failed), every failure counts against the release, as today, and the tests
  section says the baseline could not be run. The check never says `not now` only because
  the baseline failed to run.
- No decision record: this plan records the choice.

---

## Delivers

version-check-tells-a-red-baseline

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-red-baseline -b plan/version-check-tells-a-red-baseline origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Raising a case's
  time limit is allowed; say so in the handover.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

### 1. `scripts/check-version.mjs`

- Factor the test run into one function, used twice, that installs or links the
  dependencies as needed, runs the suite into a given results file, and returns the
  parsed results or null with the tail of its output.
- **Baseline:** right after the clone succeeds and before anything else changes the
  clone, run it. Link the project's `.tropis/node_modules` when it exists (the clone's
  package file is the project's), otherwise `npm --prefix .tropis ci` (or `install` when
  the clone has no lockfile). Write `<tmp>/baseline.json`. Then remove the clone's
  `.tropis/node_modules` (`rmSync(..., { recursive: true, force: true })`, which removes
  a symlink without following it). Then assert the clone's `git status --porcelain` is
  empty; if not, return exit 1 with a `check-version:` line naming what the baseline
  left behind.
- **After the take:** as now, into `<tmp>/results.json`.
- Let `before` be the failing names of the baseline (null when unread), `after` those of
  the release run. `caused` = names in `after` not in `before` (all of `after` when
  `before` is null); `already` = names in `after` that are in `before`.
- `testsFailed` becomes `caused.length > 0`, or, when `before` is null, the current rule.
- The tests section reads, in this order: `${passed} passed, ${failed} failed`; then,
  when `caused` is not empty, a line `failing because of the release:` followed by each
  name; then, when `already` is not empty, a line `already failing before the release, not counted against it:`
  followed by each name; then, when `before` is null, the line
  `the checks could not be run on <held> first, so every failure is counted against the release`;
  then the existing `the tests ran with the project's version of …` lines.
- Update the file's header comment in one sentence.

### 2. `templates/README.md` (the operator guide)

In the sentence beginning `Before taking a release, \`node scripts/check-version.mjs <project>\``,
replace `not now means do not take it yet and look at the failing checks it names` with
`not now means do not take it yet and look at the checks it names as failing because of the release; checks already failing before the release are listed apart and do not count against it`.

## Tests

In `guards/check-version.test.js` (read `world()`, `kept()`, `passedLine()` and the case
`says not now when the release breaks the project checks`):

1. † `it('does not count a check already failing against the release', …)`: the project
   adds `.tropis/guards/our-own.test.js` with one test that always fails
   (`describe('our own check', () => { it('fails before and after', () => { expect(1).toBe(2); }); });`
   — write it as an ES module test like the others), commits; release v0.2.1 with
   `bumpNext`. Check it inside `kept()`. Expect status 0; stdout containing `is safe.`,
   `already failing before the release`, and `our own check fails before and after`; not
   containing `is not now.`; `passedLine(r.stdout).failed` at least 1.
2. † `it('names the failures the release causes apart from those already failing', …)`:
   the project's failing test as in case 1, and the release that breaks the checks as in
   `says not now when the release breaks the project checks`. Expect `is not now.`;
   `failing because of the release:` followed later by
   `set-up project layout fails on purpose for the version check`;
   `already failing before the release` followed later by
   `our own check fails before and after`; and the release's failure not listed under the
   already-failing heading.
3. Keep every existing case passing; `says not now when the release breaks the project checks`
   still answers `not now`.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run `guards/check-version.test.js` that way; say the exact command in
  the handover. Each case runs the project's suite, now twice, so it is slow; raise the
  file's limit if a case runs out of time, and say so.
- **The check is itself a Jest test during the self-check.** The nested runs must keep
  the environment cleaning the current run does (`FRAMEWORK_ROOT`, `JEST_*`).
- **Before starting, rebase on `origin/main` if `update-survives-a-dropped-edited-rule`
  has shipped**, since both plans edit the same two files.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/check-version.mjs` | a baseline run; failures split into caused and already failing |
| `templates/README.md` | one sentence changed |
| `guards/check-version.test.js` | two cases |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's row removed, if it has one (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-version-check-tells-a-red-baseline.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide's sentence changes
(above). `commands/update.md` shows the check's report uncut and quotes its reason for
`not now`, which stays true. No decision record. No upstream queue: this repository is
the upstream. A release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the two cases. Commit. Run the guard alone (*Traps*). Expected: case 1 fails on
`is not now.`, case 2 on the missing headings. Paste the failing names.

### Task 2 — The change

Make the changes. Commit. Run the guard alone: every case passes. Paste the `Tests:` line
and the report case 2 printed.

### Task 3 — The backlog and the board

1. In `feature-catalog.yaml`, on `version-check-tells-a-red-baseline`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them;
   and set `modules` to `scripts/check-version.mjs`. Above the item, add
   `# Shipped by docs/superpowers/plans/2026-11-03-version-check-tells-a-red-baseline.md.`
   and one comment line per criterion naming the case that covers it.
2. In `docs/backlog-board/bands.yaml`, delete the item's block if it has one, nothing
   else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 4 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/version-check-tells-a-red-baseline`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

### Task completion

- Task 0: `npm --prefix .tropis ci`, clean tree, `bash scripts/check-blueprint.sh` on `origin/main` (461bc43): `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1: two cases added, committed, run alone: `Tests: 2 failed, 11 passed, 13 total`; the failing names were `check-version.mjs › does not count a check already failing against the release` and `check-version.mjs › names the failures the release causes apart from those already failing`.
- Task 2: change made; the guard alone gives `Tests: 13 passed, 13 total`. No case time limit was raised (SLOW stays 120000). The case 2 report was not printed separately; its format is fixed by the code (headings `failing because of the release:` and `already failing before the release, not counted against it:`, names indented two spaces).
- Task 3: item set to `shipped` (it read `building`), `modules` set, criteria mapped in comments, its `bands.yaml` block removed. `npm --prefix .tropis test`: `Tests: 172 passed, 172 total`.
- Task 4: see below. No pull request, review record or merge.

### Verification results

Tools: git 2.43.0, node v22.23.4, Linux x86_64.

- One guard alone: `bash <scratchpad>/runguard.sh /home/user/tropis-red-baseline HEAD check-version.test.js`. It stages `git archive HEAD` with `templates/framework-jest.config.js` as the jest config and `.self-check/node_modules`, and runs `FRAMEWORK_ROOT=<stage> node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/check-version.test.js`.
- `bash scripts/check-blueprint.sh` on the commit before this report: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `git diff --stat origin/main...HEAD` (before this report): bands.yaml 14 deletions, feature-catalog.yaml 13, guards/check-version.test.js 53, scripts/check-version.mjs 111, templates/README.md 2; 5 files, 129 insertions, 64 deletions.
- The self-check on the report's own commit is recorded in the final message of the run.

### Scope

All files are in File Structure; `docs/backlog-board/index.html` was not rebuilt by any hook and is unchanged. Worktree: `/home/user/tropis-red-baseline`, branch `plan/version-check-tells-a-red-baseline`, from `origin/main` 461bc43. Named source: none; written against this repository's own `check-version.mjs`.

### Judgment calls

- One `runSuite` function does the dependency link/install and the run; the baseline and the release run both call it. A clone with `.tropis/package-lock.json` and no link gets `npm ci`, otherwise `install`; the release run now uses the same rule (it used `install` before).
- Failure names are compared as strings; a suite failing with no failed test is named `<file>: <first message line>`, so a changed message counts as a new failure.
- When the baseline's install fails or its results are unreadable, `before` is null and the old rule applies, plus the "could not be run" line.
- Names in the tests section are indented two spaces under their heading.

### What the plan got wrong

- Nothing blocked the work. The plan's rebase trap was already met by `origin/main`. The plan says the baseline "installs or links" and the cleanup removes the node_modules; that the link made by the release run is removed by the temp-dir cleanup, not explicitly, is fine. The plan's File Structure listed `docs/backlog-board/index.html` as conditional; nothing rebuilt it here.

### Outstanding

Nothing the executor could not do. The change has no screen, so there is no developer check. Review should re-break the guards (e.g. make the baseline run a no-op and watch both new cases go red) and confirm the cost: every check now runs the project's suite twice.

## Review record

Reviewed by the specifying session, a Claude Code cloud session. Tools: git 2.43.0,
node v22.23.4, Linux x86_64.

### Checks re-run

- After the reviewer's fix (below) and a rebase on `origin/main` at `1d7570a`,
  `guards/check-version.test.js` alone, staged from `git archive HEAD` with the
  self-check's jest: `Tests: 13 passed, 13 total`.
- The same guard with `scripts/check-version.mjs` put back as `origin/main` has it (the
  change reverted, tests kept): `Tests: 2 failed, 11 passed, 13 total`, the two failing
  being `does not count a check already failing against the release` and
  `names the failures the release causes apart from those already failing`.
- Scope: six files, all in *File Structure*.
- The full self-check was not re-run by the reviewer; the pipeline runs it on the pull
  request.

### Found

Public exposure: the diff was read for home paths, hostnames, email addresses and names;
nothing found.

- **The run after the take had switched from `npm install` to `npm ci`**, which the plan
  asked for only for the baseline. After the take, a project that owns its package file
  can hold a lockfile that no longer matches it, which `ci` refuses, and the check would
  then answer `not now` for a reason that is not the release's. The reviewer fixed it on
  the branch: `runSuite()` takes the install command, the baseline uses `ci` when the
  clone has a lockfile, and the run after the take uses `install` as before. Mechanical
  and understood, so fixed here rather than dispatched; commit
  `fix(check-version): the run after the take installs as before, not with ci`. No case
  pins it: a fixture with a mismatched lockfile would need a real install, which the
  guard's worlds avoid by linking the dependencies.

### Outstanding disposition

- The check now runs the suite twice and takes about twice as long: the cost of the
  item, accepted.
- A suite failing with no failed test is named by its first message line, so a changed
  message counts as a new failure: errs towards `not now`, which is the safe side;
  dropped.
- No developer check: the change has no screen.

### Learnings routed

- None generalise beyond this plan.

### Merged because

The version check runs the project's checks before and after the take and counts only
the failures the release causes, the two cases that pin it go red without the change,
and the reviewer's one fix restores the install behaviour the plan did not ask to change.
