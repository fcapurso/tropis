# An update never leaves out a shipped file in silence — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** `scripts/take-version.mjs` names every shipped file it leaves absent, and with
`--from` it writes a shipped file the project lacks instead of reading the absence as a
removal.

**Spec:** the entry `update-never-omits-a-file-in-silence` in `feature-catalog.yaml`. Read
its three criteria and the comment above it.

**What the specifying session verified on 2026-10-19, against `main` at `37e068e`:**

- **The silent case.** `scripts/take-version.mjs`, function `apply`, walks every path in the
  baseline or the new version. For a path in both (`inB && inN`) that the project does not
  have (`projectText === null`), the code is:
  ```js
      if (projectText === null) {
        if (nextFiles[rel] !== baseline[rel]) removedByProject.push(rel);
      } else if (fingerprint(projectText) === baseline[rel]) {
  ```
  So when the new version did not change the file, nothing is written and nothing is listed.
  Every other case already writes or lists: a path only the new version has is written (or
  written to `.new`); a path only the baseline has is deleted, kept and listed, or was
  already absent and is no longer shipped.
- **Where the baseline comes from.** In `takeVersion`, `fromRecord` is true when
  `.tropis/installed.json` (or `.framework/installed.json`) holds a version that parses. Then
  the baseline is the record's own `files`: the files the project was given, so a missing one
  was removed by the project. Otherwise the operator passed `--from`, and the baseline is a
  scratch setup of that version (`scratchFiles(buildVersion(from, …))`): a list of what that
  version ships, not of what this project was given. `apply` is called with
  `{ project, target, held, baseline, baselineRoot, layout, next, nextFiles, projectSettings, projectAreas }`
  and receives it through `relocate(input)`, which returns `{ ...input, … }` on every path, so
  a new field passes through unchanged.
- **What went wrong in practice.** first-adopter's first take ran with `--from` and installed
  nothing, with no message, for twelve shipped files it kept in other folders; the rule
  generator then could not import one of them and the take stopped half-written
  (first-adopter `docs/superpowers/specs/2026-10-17-this-project-takes-tropis-design.md`,
  *What was found*).
- **Who else reads the result.** `scripts/check-version.mjs` calls `takeVersion` in a scratch
  clone and prints `result.added` under *Added* and `result.removedByProject` as
  "removed by the project, not restored". It needs no change: it reports whatever the take
  does. No case in `guards/check-version.test.js` deletes a shipped file.
- **The decision this changes.** `framework/DECISIONS.md`, FW-014, ends its decision text with
  "A shipped file the project removed is left absent, whether or not the new version still
  ships it." That paragraph is followed by the line beginning `**Evidence:** The update-model
  finding's spike`.
- **The adopter text.** `README.md`, the paragraph beginning "A breaking release asks for
  `--accept-breaking`", says "A project set up before versions were recorded passes `--from`
  and the version it holds."
- **The tests.** `guards/take-version.test.js` builds a scratch Tropis tagged `v0.2.0` and a
  project set up from it (`inWorld`, `w.release`, `w.take`, `w.at`, `w.commit`, `read`,
  `bumpNext`, `SLOW`, `rmSync`, `existsSync` are all in scope). `bumpNext` changes only
  `commands/next.md`, so `.claude/commands/idea.md` is the same in `v0.2.0` and `v0.2.1`. The
  case *does not restore a file the project deleted* covers the deleted-and-changed case.

**Model tier: Small–medium.** Code and tests are given verbatim; the suite is slow and a
case may need adapting to the file's helpers.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** It changes how every project takes the next release.

No fresh-agent check: the decision record's amendment describes what a script does and
tells no agent to act differently; nothing under `rules/` changes.

Do not store a kick-off prompt on this plan.

---

## Delivers

update-never-omits-a-file-in-silence

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-take-names-absent -b plan/update-never-omits-a-file-in-silence` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They are the installed `v0.3.1`; they change only when this repository takes
  a release.
- **Do not touch other plans.**
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. No co-author or tool-attribution trailer in any commit.

## Decisions

Taken by the specifying session on 2026-10-19. Do not reopen them.

1. **With `--from`, write the missing file.** The criterion allowed "writes it, or stops and
   names it". Writing is chosen: without a record nothing says the project removed the file,
   git is the backup (the command refuses a dirty tree), and the file is listed under *Added*
   so the operator sees it and can delete it again. Stopping would leave the operator no way
   through but placing the files by hand, which is what first-adopter had to do.
2. **With a record, keep leaving it absent, and always say so.** A recorded file that is
   missing was removed by the project (the installed-files check allows that: "a project may
   remove a command it cannot use"). It is now listed as "removed by the project, not
   restored" whether or not the new version changed it.
3. **`scripts/take-version.mjs`, in `takeVersion`.** Pass `fromRecord` to `apply`: replace

   ```js
       const applied = apply({
         project, target, held, baseline, baselineRoot, layout, next, nextFiles, projectSettings, projectAreas,
       });
   ```

   with

   ```js
       const applied = apply({
         project, target, held, fromRecord, baseline, baselineRoot, layout, next, nextFiles, projectSettings,
         projectAreas,
       });
   ```

   Keep whatever follows `});` as it is. If the call's text differs, add `fromRecord` to the
   object and say so under *Judgment calls*.

4. **`scripts/take-version.mjs`, in `apply`.** Add `fromRecord` to the destructuring:

   ```js
     const {
       project, target, held, fromRecord, baseline, next, nextFiles, projectSettings, projectAreas, report,
     } = relocate(input);
   ```

   and replace

   ```js
         if (projectText === null) {
           if (nextFiles[rel] !== baseline[rel]) removedByProject.push(rel);
         } else if (fingerprint(projectText) === baseline[rel]) {
   ```

   with

   ```js
         if (projectText === null) {
           // A record lists what the project was given, so a missing file was removed by it.
           // A --from baseline lists only what that version ships: the project may never
           // have had the file, so it is written rather than left out.
           if (fromRecord) {
             removedByProject.push(rel);
           } else {
             writeText(dest, nextText, source);
             added.push(rel);
             if (rel === '.tropis/package.json') packageChanged = true;
           }
         } else if (fingerprint(projectText) === baseline[rel]) {
   ```

5. **`scripts/take-version.mjs`, the module comment.** In the paragraph beginning "A shipped
   file the project left alone is replaced", directly after the sentence ending "the new
   text lands beside it as `<path>.new`.", add this sentence:

   ```
   A shipped file the project lacks is listed as removed by the project when a record says
   it was given it, and written when the baseline came from `--from`.
   ```

   Rewrap the paragraph to the comment's width, keeping the ` * ` prefix.

6. **`guards/take-version.test.js`.** Insert these two cases directly after the case
   *does not restore a file the project deleted*:

   ```js
     it('names a file the project deleted even when the new version left it unchanged', () => inWorld({}, (w) => {
       w.release('v0.2.1', bumpNext);
       rmSync(join(w.project, '.claude/commands/idea.md'));
       w.commit();

       const r = w.take('v0.2.1');
       expect(r.status).toBe(0);
       expect(existsSync(join(w.project, '.claude/commands/idea.md'))).toBe(false);
       expect(r.stdout).toContain('.claude/commands/idea.md — removed by the project, not restored');
     }), SLOW);

     it('with --from, writes a shipped file the project never had, even when the new version left it unchanged', () => inWorld({}, (w) => {
       w.release('v0.2.1', bumpNext);
       rmSync(join(w.project, '.claude/commands/idea.md'));
       rmSync(join(w.project, '.tropis/installed.json'));
       w.commit('never had idea.md, and no record');

       const r = w.take('v0.2.1', '--from', 'v0.2.0');
       expect(r.stderr).toBe('');
       expect(r.status).toBe(0);
       expect(read(w.project, '.claude/commands/idea.md')).toBe(w.at('v0.2.1', 'commands/idea.md'));
       expect(r.stdout).toMatch(/Added:\n(?: {2}.*\n)* {2}\.claude\/commands\/idea\.md\n/);
       expect(r.stdout).not.toContain('idea.md — removed by the project');
     }), SLOW);
   ```

7. **`framework/DECISIONS.md`, FW-014.** Insert this paragraph after the paragraph ending
   "removed is left absent, whether or not the new version still ships it." and before the
   line beginning `**Evidence:** The update-model finding's spike`, with one blank line on
   each side:

   ```
   **Amended 2026-10-19 — a missing file is never left out in silence.** With a record, a
   shipped file the project lacks was removed by it: it stays absent, and the take lists it
   as removed by the project whether or not the new version changed it. Before, a file the
   new version left unchanged was left out with no message. With `--from` there is no
   record, and the baseline lists what that version ships rather than what the project was
   given, so a shipped file the project lacks is written and listed as added. Evidence:
   first-adopter's first take ran with `--from`, installed nothing for twelve files it kept
   elsewhere, and stopped half-written when the rule generator could not import one
   (first-adopter `docs/superpowers/specs/2026-10-17-this-project-takes-tropis-design.md`).
   ```

8. **`README.md`.** Replace "A project set up before versions were recorded passes `--from`
   and the version it holds." with "A project set up before versions were recorded passes
   `--from` and the version it holds; any shipped file it lacks is then written and listed
   as added." Rewrap that paragraph to the lines around it if needed.

9. **`RELEASES.md`.** Under `## [Unreleased]`, add this section after the last section already
   there:

   ```
   ### An update names every shipped file it leaves out

   Taking a release now lists each shipped file the project has removed, under *Needs a
   decision*, even when the new version did not change it; before, such a file was left out
   with no message. A project taking a release with `--from`, which has no record of what it
   was given, now gets every shipped file it lacks written and listed under *Added*, instead
   of having it left out. Delete any you do not want after the take. This is not a breaking
   change.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks on the repository as a project, and is not a check of this change.
- **Task 1 is red on purpose.** The two new cases are written before the fix and must both
  fail first. Do not fix the script in the same commit.
- **The take-version cases are slow** (each builds two scratch setups) and the self-check takes
  minutes; run it in the background if your tool allows.
- **A take-version case may fail once and not again.** Earlier reviews saw *removes its scratch
  folder on every exit path* fail when another self-check ran at the same moment on the same
  machine, because it counts every new `take-version-*` folder in the shared temp folder as its
  own. Re-run once before diagnosing; report it if it recurs.
- **`RELEASES.md` may conflict on rebase.** Other plans add sections under `## [Unreleased]`
  too. Keep every section.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | Decisions 3–5 |
| `guards/take-version.test.js` | Decision 6 |
| `framework/DECISIONS.md` | Decision 7 |
| `README.md` | Decision 8 |
| `RELEASES.md` | Decision 9 |
| `docs/superpowers/plans/2026-10-19-update-never-omits-a-file-in-silence.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The checks, red

Decision 6. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on exactly the two new cases. Paste the failing lines.

### Task 2: The fix, green

Decisions 3–5. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: Decision record, README, release note

Decisions 7–9. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 4: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. In *Outstanding*, say that the release is not breaking and that the reviewer promotes
the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| The take prints every shipped file it leaves absent, with the reason | Decision 6, first case: a recorded, deleted, unchanged file is listed as removed by the project. The deleted-and-changed case is the existing *does not restore a file the project deleted*. A file no longer shipped is not a shipped file. |
| With `--from`, a missing file is written, never omitted in silence | Decision 6, second case |
| A test covers a `--from` the project never held and goes red with the old reading | Task 1's red run on the second case |

## Not in this plan

- **Telling a deliberately removed file from one never had, without a record.** Nothing in a
  project says which it was; the operator deletes what they do not want after the take.

## Handover report

### Task completion

All four tasks are done.

- **Task 1** — commit `588033e`. The two cases were committed before the script changed. The first self-check was red on those two cases and on *removes its scratch folder on every exit path*. The re-run was red on exactly the two new cases.
- **Task 2** — commit `d7d2a38`. The first self-check was red only on the scratch-folder case, while other self-checks were running on this machine. The re-run was green.
- **Task 3** — commits `cfaea50` and `fdedcde`. The first self-check was red on `framework integrity › references no file that does not exist` and on the scratch-folder case. `fdedcde` drops the backticks around the first-adopter path. The self-check on that commit was green.
- **Task 4** — the checks below. The first self-check failed the clean baseline and named no case. The re-run was green.

### Verification results

Tool: Node v22.15.0, `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`. Machine: dev-laptop.local, Darwin 25.2.0. Each self-check below is that command, exit code as stated.

**Task 1, re-run, commit `588033e`, exit 1.** Conformance caught every planted defect. Clean baseline:

```
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● take-version.mjs › names a file the project deleted even when the new version left it unchanged
              ● take-version.mjs › with --from, writes a shipped file the project never had, even when the new version left it unchanged

1 problem(s). A guard that cannot fail is not evidence.
```

**Task 2, re-run, commit `d7d2a38`, exit 0.** Every guard caught its defect and the clean baseline was `ok`.

**Task 3, first run, commit `cfaea50`, exit 1.** The two failing lines:

```
              ● framework integrity › references no file that does not exist
              ● take-version.mjs › removes its scratch folder on every exit path
```

**Task 3, after the citation fix, commit `fdedcde`, exit 0.** Every guard caught its defect and the clean baseline was `ok`. Elapsed 141872 ms.

**Task 4, `npm --prefix .tropis test`, exit 0:**

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.867 s
```

**Task 4, self-check re-run, commit `fdedcde`, exit 0.** Elapsed 119856 ms. Every conformance case caught; `ok          clean baseline`; `Every guard caught its defect and passed the clean baseline.`

The scratch-folder case, and one clean-baseline failure that named no case, each failed once and passed on the re-run of the same commit. Other self-checks were running on this machine at the same time.

### Scope

`git diff --stat origin/main...HEAD` after this handover is committed:

```
 README.md                                          |  7 +-
 RELEASES.md                                        |  9 +++
 ...6-10-19-update-never-omits-a-file-in-silence.md | 81 ++++++++++++++++++++++
 framework/DECISIONS.md                             | 10 +++
 guards/take-version.test.js                        | 25 +++++++
 scripts/take-version.mjs                           | 22 ++++--
 6 files changed, 146 insertions(+), 8 deletions(-)
```

Every file is in the File Structure table. `feature-catalog.yaml` is not in the diff.

### Judgment calls

- The two cases use the file's two-space indent. The plan's snippet carried the extra indent of a markdown list. The assertions are the plan's text. The helpers (`inWorld`, `w.take`, `w.at`, `w.commit`, `read`, `bumpNext`, `SLOW`) matched the plan, so the cases were not otherwise adapted.
- The module comment was rewrapped to 85 characters of text, inside the comment's existing 88–89 character lines. The new sentence is the plan's sentence.
- The README paragraph was rewrapped to 76 columns, the width of the lines around it. The first two lines are unchanged.
- The `apply({...})` call matched the plan, so `fromRecord` was added as specified. `relocate` already returns `{ ...input, … }` on both paths, so the field arrives.

### What the plan got wrong

The FW-014 paragraph backticks `docs/superpowers/specs/2026-10-17-this-project-takes-tropis-design.md`. `scripts/check-conformance.sh` copies `framework/*.md` into the clean project's `.claude/framework/`, and `guards/framework-integrity.test.js` requires every backticked `docs/`, `scripts/`, `.claude/` or `.github/` path to exist in that project. The spec is in first-adopter, not here. The path stays, named as first-adopter's file, without backticks. The guard was not changed.

### Outstanding

- The release is not a breaking change. The reviewer promotes `update-never-omits-a-file-in-silence`.
- `templates/README.md` still says a project set up before versions were recorded passes `--from` and the version it holds, and points at the framework README for the details. It is not in the File Structure table, so it was left as it is. The reviewer can decide whether a later plan should say the same thing there.

## Review record

Reviewed by the specifying session on 2026-10-19, rebased onto `origin/main` at `6dba4c6`.

### Checks re-run

- **`bash scripts/check-blueprint.sh` at `5325eb2`, run by the reviewer:** exit 0, every
  conformance defect caught, clean baseline ok. Re-run on the rebased head with this record
  before merging; CI's `self-check` runs on the pull request as well.
- **The guard re-broken:** the branch's tree staged with `main`'s `scripts/take-version.mjs`
  in place of the fix, then
  `jest guards/take-version.test.js -t "left it unchanged"`: both new cases failed
  (`2 failed, 27 skipped`). Node v22.15.0 on dev-laptop.local, Darwin 25.2.0.
- **The diff against the plan:** Decisions 3–9 are as written; the only departure is the one
  the handover names (the first-adopter path without backticks).
- **`git diff --stat origin/main...HEAD`:** the six files in *File Structure*, plus
  `feature-catalog.yaml` for the promotion in this commit.

### Found

- **The plan was wrong about one thing, and the executor fixed it correctly.** Decision 7
  backticked a path in another repository; `framework-integrity` fails any backticked
  `docs/` path that does not exist here. Naming it without backticks is right.
- The intermittent take-version scratch-folder failure appeared again, only while several
  self-checks ran on this machine at once. Not caused by this change.

### Outstanding disposition

- **Promoted to `shipped` in this commit**, with `modules: [scripts/take-version.mjs]`. Evidence
  per criterion: *every shipped file left absent is printed* — `take-version.mjs` › *names a
  file the project deleted even when the new version left it unchanged*, with the existing
  *does not restore a file the project deleted*; *with `--from`, a missing file is written* and
  *a test goes red with the old reading* — *with --from, writes a shipped file the project
  never had…*, red with the old script as above. The entry skipped `building`: the plans were
  dispatched without the status change.
- **`templates/README.md` not mentioning that `--from` writes missing files:** dropped. That
  page points at the framework README for the details, which now says it.
- **Not breaking:** confirmed; the release note says so.

### Learnings routed

- None new. A backticked path in a framework document must exist in this repository; the
  `framework-integrity` guard already enforces that, and it caught it.

### Merged because

The fix is exactly the plan's, both new cases go red without it and green with it, and the
self-check passes.
