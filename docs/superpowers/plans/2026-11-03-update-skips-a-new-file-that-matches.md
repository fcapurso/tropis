# An update writes no .new file when the project already has the new text — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `take-version.mjs` writes `<path>.new` only when the text it would write differs
from the project's file. A file the project had changed in exactly the way the release
does is left as it is, written nowhere, and named in the report as already holding the
release's text.

**Backlog item:** `update-skips-a-new-file-that-matches` in `feature-catalog.yaml` (type
improvement). Spec: `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
entry 7 (`project-takes-a-framework-version`).

**One plan:** what becomes true is one sentence — the operator is asked to merge only
files that actually differ.

**Model tier: Small.** The change is two comparisons and a report line, given below.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request, write a review record
or merge.

**Merges after:** update-survives-a-dropped-edited-rule

**No fresh-agent check is owed:** the change touches no file under `framework/`, `rules/`
or `commands/`; the tests below pin what changes.

**What the specifying session verified on 2026-11-03, against `origin/main` at `f43d4bf`
(node v22, Linux x86_64):**

- In `scripts/take-version.mjs`, `apply()` writes a `.new` through its local
  `writeNew(text)` in three places:
  1. the file is in the baseline and the release, the project changed it, and the release
     changed it (`else if (nextFiles[rel] !== baseline[rel])`): it writes
     `carryBlocks(projectText, nextText).text`, the release's text with the project's
     project-owned blocks carried in;
  2. the same, where the project left the file alone but the block counts differ
     (`carried.mismatch && blocks(projectText).length > 0`) — the project's fill-ins could
     be lost, so this one stays as it is;
  3. the file is in the release only and the project already has a file at that path
     (`else if (inN)`, `projectText !== null`): it writes `nextText`.
- In cases 1 and 3, when the text to write equals `projectText`, the `.new` is
  byte-identical to the file beside it. The record written at the end
  (`recordOf(next, …)`) fingerprints the release's text, and `fingerprint()` in
  `scripts/installed-files.js` ignores what is inside project-owned blocks, so the
  project's unchanged file then matches its record and the installed-files check passes.
- `check-version.mjs` lists `result.newFiles` as `<path>.new would be left beside yours`,
  and counts each as a step; it needs no change, since a skipped file is no longer in
  `newFiles`.

**Decided by the specifying session:** a skipped file goes into a new result list,
`alreadyNew`, reported under its own heading so the operator sees why nothing was
written. It does not set `packageChanged`. No decision record: this is internal to the
take.

---

## Delivers

update-skips-a-new-file-that-matches

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-new-file-matches -b plan/update-skips-a-new-file-that-matches origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

In `scripts/take-version.mjs`, `apply()`:

- Add `const alreadyNew = [];` beside the other lists, and `alreadyNew` to the `result`
  object.
- In case 1 above: when `!carried.mismatch && carried.text === projectText`, push `rel`
  to `alreadyNew` and write nothing; otherwise behave as now.
- In case 3 above: when `nextText === projectText`, push `rel` to `alreadyNew` and write
  nothing; otherwise behave as now.
- In the report, after `list('Deleted, no longer shipped', deleted);`, add
  `list('Already the new version\'s text, left as it is', alreadyNew);`.
- Add one sentence to the file's header comment: a changed file that already holds the
  new text gets no `.new`.

## Tests

In `guards/take-version.test.js` (read `writes a .new beside a file the project changed
and the new version changed too` for the shape):

1. † `it('writes no .new when the project already made the release\'s change', …)`: the
   project appends `\nA line from the next version.\n` to `.claude/commands/next.md`
   exactly as `bumpNext` appends it to `commands/next.md` in the release, commits;
   release v0.2.1 with `bumpNext`; take it. Expect status 0;
   `.claude/commands/next.md.new` absent; the project's file equal to
   `w.at('v0.2.1', 'commands/next.md')`; stdout containing `Already the new version's text`
   and `.claude/commands/next.md`, and not containing `next.md.new`; and `fingerprint()`
   (imported from the source `scripts/installed-files.js`; check whether the file already
   imports it) of the project's file equal to
   `recordOfProject(w.project).files['.claude/commands/next.md']`.
2. † `it('writes no .new for a newly shipped file the project already has with the same text', …)`:
   release v0.2.1 adds `commands/brand-new.md` with some text; before taking, the project
   writes the same text at `.claude/commands/brand-new.md` and commits. Take it. Expect
   status 0, no `.claude/commands/brand-new.md.new`, the file unchanged, and the
   `Already the new version's text` heading in stdout.
3. Keep `writes a .new beside a file the project changed and the new version changed too`
   passing unchanged: a file whose text differs still gets its `.new`.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run `guards/take-version.test.js` that way; say the exact command in
  the handover. Each case sets up a world and is slow.
- **Before starting, rebase on `origin/main` if `update-survives-a-dropped-edited-rule`
  has shipped**, since both plans edit the same two files.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | no `.new` for a file that already holds the text; report heading |
| `guards/take-version.test.js` | two cases |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's row removed, if it has one (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-update-skips-a-new-file-that-matches.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide says a `.new` means
you had changed that file, which stays true; `commands/update.md` handles each `.new`
listed, and a file not listed needs nothing. No decision record. No upstream queue: this
repository is the upstream. A release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the two cases. Commit. Run `guards/take-version.test.js` alone (*Traps*). Expected:
the two † cases fail on the `.new` being present. Paste the failing names.

### Task 2 — The change

Make the change. Commit. Run the guard alone: every case passes. Paste the `Tests:` line.

### Task 3 — The backlog and the board

1. In `feature-catalog.yaml`, on `update-skips-a-new-file-that-matches`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them;
   and set `modules` to `scripts/take-version.mjs`. Above the item, add
   `# Shipped by docs/superpowers/plans/2026-11-03-update-skips-a-new-file-that-matches.md.`
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
3. `git push -u origin plan/update-skips-a-new-file-that-matches`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

Executed by a Claude Code cloud session (Haiku 5.5, claude-haiku-5-5), node v22.23.4,
npm 10.9.9, git 2.43.0, Linux x86_64. Branch `plan/update-skips-a-new-file-that-matches`,
built on `origin/main` at `fbeb529`. Not rebased on `update-survives-a-dropped-edited-rule`,
which is still `building`.

### Task completion

- Task 0: worktree isolated; `npm --prefix .tropis ci` ran. The first self-check ran after
  Task 1's commit, so it was a red run, not a baseline (see *What the plan got wrong*).
- Task 1 (`ef2c70b`): two cases added. Both fail on the `.new` assertion before the change.
- Task 2 (`cd4b645`): `scripts/take-version.mjs` changed as specified. The guard passes.
- Task 3 (`dbe7501`): catalog item set to `shipped` with comments mapping criteria to
  cases; `modules` set to `scripts/take-version.mjs`; band block removed. The board was not
  rebuilt, since no hook staged it.
- Task 4: scope checked, self-check run, this report committed, branch pushed. No pull
  request, review record or merge.

### Verification results

- `bash /tmp/claude-0/…/scratchpad/runguard.sh <worktree> ef2c70b take-version.test.js`
  (red): `Tests:       2 failed, 54 passed, 56 total`. Failing names, from the self-check's
  clean-baseline log: `writes no .new when the project already made the release's change`
  and `writes no .new for a newly shipped file the project already has with the same text`.
  Both fail with `Expected: false / Received: true` on the `.new` existence check.
- `runguard.sh <worktree> cd4b645 take-version.test.js` (green): `Tests:       56 passed, 56 total`.
- `npm --prefix .tropis test` at `dbe7501` (installed release's checks on this repository,
  not the source): `Tests:       172 passed, 172 total`. It shows nothing of this change.
- `bash scripts/check-blueprint.sh` at `ef2c70b`: failed in the clean baseline on the two
  red cases only; every conformance and framework guard passed.
- `bash scripts/check-blueprint.sh` at `dbe7501`: last line
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Private-material scan of `git diff origin/main...HEAD` for home paths, hostnames, email
  addresses, Atlassian sites and session ids: no match.
- Self-check on the final commit: see the report's last line.

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 docs/backlog-board/bands.yaml | 12 ------------
 feature-catalog.yaml          | 11 +++++++++--
 guards/take-version.test.js   | 29 +++++++++++++++++++++++++++++
 scripts/take-version.mjs      | 16 +++++++++---
 4 files changed, 51 insertions(+), 17 deletions(-)
```

All four are in *File Structure*. This report adds the plan file, also listed.

### Judgment calls

- Three commits, one plan: the red tests first, the change second, the backlog edit third,
  so each commit's self-check result is recorded.
- Case 1 writes nothing only when `!carried.mismatch && carried.text === projectText`;
  case 3 only when `nextText === projectText`. A block-count mismatch still writes its `.new`.
- The new report line is placed after `Deleted, no longer shipped`, as the plan says.
  `update-survives-a-dropped-edited-rule` also edits `apply()` and the report; the
  specifying session should expect a conflict there at rebase.
- `alreadyNew` is also a field of the result object `takeVersion()` returns to library
  callers. It is additive.
- The header sentence was added as the plan specifies, wrapped to the file's comment width.
- Named source: none. The code was written from the plan and this repository's existing
  `apply()` and tests.
- The fresh-agent check is not owed: nothing under `framework/`, `rules/` or `commands/` changed.

### What the plan got wrong

- Task 0's expected `Self-check passed` cannot hold where Task 0 runs after Task 1's commit,
  as the plan's order implies. I committed the red tests before the first self-check, so
  that run was red by design. A baseline run belongs before Task 1's commit.
- The plan asks for the failing names from the guard run. `runguard.sh` greps for `✕`,
  and this Jest prints no such line, so the helper shows only `Tests:` and the names had to
  come from the self-check log. The helper should print the `●` lines.
- The plan's verified facts name `origin/main` at `f43d4bf`; the branch was built on
  `fbeb529`. The lines the plan cites still held; the line numbers had moved.
- Its Task 0 check says `Self-check passed`, which was not the first run's result (above).

### Outstanding

- No developer check: the change has no screen, so none is owed. The update's report now
  shows a new heading, which is the only visible surface.
- Not rebased on `update-survives-a-dropped-edited-rule`, still `building`. Both plans
  edit the same `apply()` and the same report; the specifying session rebases at merge.
- `npm ci` reported audit findings. Nothing was changed for them; this plan adds no
  dependency and did not run `npm audit fix`.
- No pull request, review record or merge: parent review.

## Review record

Reviewed by the specifying session, a Claude Code cloud session. Tools: git 2.43.0,
node v22.23.4, Linux x86_64.

### Checks re-run

- After rebasing on `origin/main` at `461bc43` (which holds
  `update-survives-a-dropped-edited-rule`), `guards/take-version.test.js` alone, staged
  from `git archive HEAD` with the self-check's jest: `Tests: 59 passed, 59 total`.
- The same guard with `scripts/take-version.mjs` put back as `origin/main` has it (the
  fix reverted, tests kept): `Tests: 2 failed, 57 passed, 59 total`, the two failing
  being `writes no .new when the project already made the release's change` and
  `writes no .new for a newly shipped file the project already has with the same text`.
- Scope: five files, all in *File Structure*.
- The full self-check was not re-run by the reviewer after the rebase; the pipeline runs
  it on the pull request.

### Found

Public exposure: the diff was read for home paths, hostnames, email addresses and names;
nothing found.

- The rebase applied the code commits cleanly; `docs/backlog-board/bands.yaml` conflicted
  because both plans deleted adjacent blocks, and was resolved by keeping both
  deletions. It is a file every plan touches, so the resolution needs no review.
- The code matches the plan: the block-count case still writes its `.new`, and
  `packageChanged` is not set for a skipped file.

### Outstanding disposition

- *What the plan got wrong*, first point: the Task 0 baseline must run before Task 1's
  commit. True; plans 3 and 4 of this bundle were dispatched with that order spelled out.
  Not a backlog item: the plans' own Task 0 already says to run it first; the executor
  committed first.
- The helper's missing failing names: fixed in the helper, which lives outside the
  repository.
- `npm ci` audit findings: unrelated to this plan, which adds no dependency; dropped.
- No developer check: the change has no screen.

### Learnings routed

- None generalise beyond this plan.

### Merged because

An update writes no `.new` beside a file that already holds the release's text and names
it instead, and the two cases that pin it go red without the fix.
