# A project fills in the framework's commands without editing framework files — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** `/next`, `/idea` and `/feature` ship working as they are in a set-up project. Each
line a project may change sits inside a project-owned block, so changing it leaves the
installed-files check green and survives an update. A check refuses any shipped file that
asks to be edited on adoption outside a block.

**Spec:** the entry `command-fill-ins-are-project-owned` in `feature-catalog.yaml`. Read its
four criteria and the comment above it. The fingerprint and block rules this relies on are
FW-014 in `framework/DECISIONS.md`. A fingerprint ignores what lies between a line
containing `project-owned: begin` and the next line containing `project-owned: end`, and an
update carries a project's block contents into the new text.

**What the specifying session verified on 2026-10-16, against `main` at `7dec75b`
(`v0.2.0`):**

- **The three commands.** Each opens, after its front matter, with an HTML comment
  `<!-- On adoption: replace <x> with this project's real script name. ... -->`. None has a
  project-owned block.
  - **`commands/next.md`**, line 8: ``Run `<backlog command>` and report its output.``
  - **`commands/idea.md`**, lines 34–35, step 7:
    ``7. Run `<docs command>` and the project's tests, and commit both the catalog and the``
    / `generated document. If either fails on the new entry, fix the entry, not the check.`
  - **`commands/feature.md`**, lines 20–23:
    - the bullet starting ``- Every acceptance criterion is covered by an automated test``;
    - the bullet ``- `<docs command>` has been run and the generated document is committed with it.``

    Its adoption comment also says to drop the verification-log clause if nothing needs a
    person to check it.
- **What a set-up project has.**
  - The backlog report is `npm --prefix .tropis run next` (the template package's `next`
    script).
  - The checks are `npm --prefix .tropis test`.
  - No catalog-document generator is installed. That is the entry
    `set-up-project-can-generate-its-catalog-document`.
- **How this repository filled them in its `v0.1.0` install.**
  - Its `.claude/commands/next.md` line reads
    ``Run `npm --prefix .framework run next` and report its output.``
  - Its `idea.md` step 7 reads
    ``7. Run the project's checks (`npm --prefix .framework test`) and commit the catalog.``
    / `This project generates no catalog document. If the checks fail on the new entry, fix`
    / `the entry, not the check.`
  - A trial update of a clone to `v0.2.0` wrote `.new` files for both.
- **`guards/set-up-project.test.js`** has the case *ships project-owned blocks only in
  manual-check and release* (around line 138). It asserts the exact list of shipped files
  that contain a block: `.claude/commands/manual-check.md` and `.claude/commands/release.md`.
- **`git grep -n 'On adoption'`** over `rules/ framework/ commands/ templates/` finds only
  the three commands.

**Model tier: Small–medium.** The target text is given verbatim below.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.**

Do not store a kick-off prompt on this plan.

---

## Delivers

command-fill-ins-are-project-owned

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-fill-ins -b plan/command-fill-ins-are-project-owned` |

## Global Constraints

- **Do not edit `.claude/`, `.framework/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They hold the installed `v0.1.0`. The update of this repository is the next
  plan.
- **Do not touch `rules/catalogs.md`** or anything else that belongs to
  `set-up-project-can-generate-its-catalog-document`, beyond the two command lines below.
- **No other command changes.** `release.md` and `manual-check.md` keep their blocks as they
  are.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken by the specifying session on 2026-10-16. Do not reopen them.

1. **Ship the real defaults, inside a block.** Each block's inner lines are what a set-up
   project needs as it is. Each block's begin line says in a few words what the project may
   put there. Remove the three `On adoption` comments entirely.
2. **`commands/next.md`.** Replace lines 5–8 (the comment, the blank line and the `Run` line)
   with:

   ```
   <!-- project-owned: begin — the command that prints this project's backlog report. -->
   Run `npm --prefix .tropis run next` and report its output.
   <!-- project-owned: end -->
   ```

3. **`commands/idea.md`.** Delete lines 5–7 (the comment and the blank line after it).
   Replace step 7 with:

   ```
   <!-- project-owned: begin — how this project checks and commits a new entry. -->
   7. Run the project's checks (`npm --prefix .tropis test`) and commit the catalog. If the
      checks fail on the new entry, fix the entry, not the check.
   <!-- project-owned: end -->
   ```

4. **`commands/feature.md`.** Delete lines 5–8 (the comment and the blank line after it).
   Replace the two bullets on lines 20–23 with:

   ```
   <!-- project-owned: begin — what else this project requires before an entry ships. -->
   - Every acceptance criterion is covered by an automated test **or** a recorded entry
     in `docs/verification-log.md`, drafted and recorded through `/manual-check`. State
     which, per criterion, in the commit body.
   - The project's checks pass (`npm --prefix .tropis test`).
   <!-- project-owned: end -->
   ```

   The first bullet keeps its exact wording. A project that has no manual checks may delete
   it inside the block.
5. **The check.** In `guards/set-up-project.test.js`:
   - The *ships project-owned blocks only in …* case's expected list becomes these five, in
     `shippedFiles` order: `.claude/commands/feature.md`, `.claude/commands/idea.md`,
     `.claude/commands/manual-check.md`, `.claude/commands/next.md`,
     `.claude/commands/release.md`. Rename the case to *ships project-owned blocks only
     where a project fills something in*.
   - Add a case *asks for no edit on adoption outside a block*. For every shipped file of a
     fresh setup, remove the inner lines of each block (with the `blocks`/`fingerprint`
     scanning already imported from `installed-files.js`, or a local equivalent), then
     assert that no remaining line matches `/on adoption/i`, `/<backlog command>/` or
     `/<docs command>/`. The failure names each file and line.
6. **Release notes.** Add to `## [Unreleased]` in `RELEASES.md` a section *Commands a
   project fills in no longer count as edited*, marked **Breaking**:
   - the project-specific lines of `/next`, `/idea` and `/feature` now sit in project-owned
     blocks, with defaults that work in a set-up project;
   - a project that had replaced the placeholders gets a `.new` for each of those commands
     on this update. It merges by taking the `.new` and putting its own line inside the
     block, then deletes the `.new`;
   - from then on, changes inside the block survive updates and keep the checks green.

## Traps

- **The source guards have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .framework test` runs this repository's
  installed `v0.1.0` checks and is not a check of this change.
- **A block's begin line is found by "contains `project-owned: begin`".** Keep each marker
  on its own line, as written in Decisions 2–4. Never put a marker in prose. If a page needs
  to quote the marker, quote it the way `rules/harness-scripts.md` does: both markers on one
  line, which leaves no block.
- **`idea.md` and `feature.md` blocks sit inside a list.** The marker comments are on their
  own lines with no indentation, as written. Markdown keeps the list.

## File Structure

| File | Change |
|---|---|
| `commands/next.md` | Decision 2 |
| `commands/idea.md` | Decision 3 |
| `commands/feature.md` | Decision 4 |
| `guards/set-up-project.test.js` | Decision 5 |
| `RELEASES.md` | Decision 6 |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The commands

Make Decisions 2–4 exactly. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on *ships project-owned blocks only in manual-check and release*, because three
more files now carry a block. This is the one deliberate red in the plan. Nothing else should
fail.

### Task 2: The check

Decision 5. Commit, then run the self-check: green.

Then put `<!-- On adoption: replace <x>. -->` back above the block in `commands/next.md`,
commit, and run the self-check. Expected: the new case fails and names
`.claude/commands/next.md`. Revert that commit with a new commit, and run the self-check
again: green.

### Task 3: Release notes

Decision 6. Commit, then run the self-check.

### Task 4: On a real setup

In a scratch folder outside any repository, `git init` a project, run this branch's
`scripts/set-up-project.sh` on it, then `npm --prefix .tropis install` and
`npm --prefix .tropis test`. Change the line inside `.claude/commands/next.md`'s block to
`Run \`make backlog\` and report its output.` and run `npm --prefix .tropis test` again.
Paste both test outputs. Both must pass: that is the second criterion. Delete the folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .framework test
git diff --stat origin/main...HEAD
```

Expected: the self-check green, the installed checks green, and only the files in *File
Structure* in the diff.

Append `## Handover report` with the six sections the planning rules name, and commit. In
*Outstanding*, say that this is a breaking release (`bump=major`, giving `v0.3.0`) and that
the reviewer promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| The three commands work as shipped, with no placeholder | Decisions 2–4; `set-up-project.test.js` › *asks for no edit on adoption outside a block*; Task 4 |
| Lines a project changes are in blocks; changing them keeps checks green | › *ships project-owned blocks only where a project fills something in*; Task 4 |
| A check fails on an adoption edit outside a block | › *asks for no edit on adoption outside a block*, seen red in Task 2 |
| Notes say what a project that had filled them in does | Decision 6 |

## Not in this plan

- **`rules/catalogs.md`'s instruction to run a catalog-document generator:**
  `set-up-project-can-generate-its-catalog-document`.
- **Updating this repository:** the next plan, after this release.

## Handover report

### Task completion

1. Done. `7b82fad`. The three commands ship the defaults from Decisions 2–4, and the adoption comments are gone.
2. Done. `a23cc2c` adds the block list and *asks for no edit on adoption outside a block*. `37d1dde` put the adoption comment back; `167b93f` removed it again.
3. Done. `9038ee4`. The unreleased notes name the section and mark it breaking.
4. Done. A scratch project outside any repository, set up from this branch, both test runs passed, and the folder was deleted.
5. Done. The three commands below, then this section.

The branch was cut from `a094a64`, which is `origin/main` at dispatch. The plan's line numbers were taken at `7dec75b`. Between those two commits only `feature-catalog.yaml` and this plan changed, and the command lines still matched.

### Verification results

**Task 1.** `bash scripts/check-blueprint.sh` on `7b82fad`, exit 1. The planted defects were all caught. The clean baseline failed two cases, not one:

```
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● set-up-project.sh › ships project-owned blocks only in manual-check and release
              ● take-version.mjs › moves an untouched v0.1.0 project to .tropis/

1 problem(s). A guard that cannot fail is not evidence.
```

The second failure, run alone, was `recordProblems` after the move:

```
".claude/commands/feature.md was changed after it was installed. …"
".claude/commands/idea.md was changed after it was installed. …"
".claude/commands/next.md was changed after it was installed. …"
```

An untouched file that gains its first block was left in place and a `.new` was written, so the new fingerprint did not match the file still on disk. `a5f7a31` replaces that file. `guards/take-version.test.js` then: `Tests: 27 passed, 27 total`.

**Task 2.** `bash scripts/check-blueprint.sh` on `a23cc2c`, exit 0: `ok clean baseline`, `Every guard caught its defect and passed the clean baseline.`

The probe commit `37d1dde`, same command, exit 1. The only clean-baseline failure:

```
              ● set-up-project.sh › asks for no edit on adoption outside a block
```

The self-check prints the test name only. Jest on that commit printed the line:

```
".claude/commands/next.md:5: <!-- On adoption: replace <x>. -->"
```

`bash scripts/check-blueprint.sh` on the restoring commit `167b93f`, exit 0, clean baseline ok.

**Task 3.** `bash scripts/check-blueprint.sh` on `9038ee4`, exit 0, clean baseline ok.

**Task 4.** Scratch directory `/tmp/tropis-fill-ins-project-KPDdqE`, `git init -b main`, this branch's `scripts/set-up-project.sh`, then `npm --prefix .tropis install`. Both runs exited 0. The folder was deleted.

First, as shipped:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.459 s
Ran all test suites.
```

After the line inside the block was changed to run `make backlog` and report its output:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.536 s, estimated 1 s
Ran all test suites.
```

**Task 5**, before this section, on `9038ee4`:

`bash scripts/check-blueprint.sh` — exit 0, `Checking 9038ee4`, every planted defect caught, `ok clean baseline`, `Every guard caught its defect and passed the clean baseline.`

`npm --prefix .framework test` — the installed release, exit 0:

```
Test Suites: 3 passed, 3 total
Tests:       4 passed, 4 total
```

`git diff --stat origin/main...HEAD` at that commit:

```
 RELEASES.md                   |  9 +++++++-
 commands/feature.md           |  8 +++----
 commands/idea.md              |  9 ++++----
 commands/next.md              |  7 +++---
 guards/set-up-project.test.js | 51 ++++++++++++++++++++++++++++++++++++++++++-
 scripts/take-version.mjs      | 11 +++++++---
 6 files changed, 76 insertions(+), 19 deletions(-)
```

This commit adds this plan file.

### Scope

The File Structure table covers `commands/next.md`, `commands/idea.md`, `commands/feature.md`, `guards/set-up-project.test.js` and `RELEASES.md`. `feature-catalog.yaml` was left for the reviewer.

`scripts/take-version.mjs` is not in that table. It is the fix for the second red in Task 1. This plan file is the handover the plan asked to commit.

### Judgment calls

When a shipped file matches its baseline fingerprint and contains no project-owned block, `take-version` now writes the new text even if the new version has blocks. A fingerprint match on a file with no blocks is the whole file, so there is nothing of the project's to carry. A file that already has blocks still gets a `.new` when the counts differ: the fingerprint cannot see a fill-in. That is FW-014's rule that an unchanged file is replaced. The existing case *writes the new text unchanged when the block counts differ* still holds, because that project file was edited and its fingerprint does not match.

The commit tool appends a `Co-authored-by` trailer to each branch commit. The squash message has to be passed explicitly so the trailer does not survive.

### What the plan got wrong

Task 1 said the block-list case would be the only red. *moves an untouched v0.1.0 project to .tropis/* also failed, for the reason in Verification results. The self-check's failure listing does not include the assertion, so the probe's listing names the test and not `.claude/commands/next.md`. The Jest failure does.

### Outstanding

This is a breaking release (`bump=major`, giving `v0.3.0`). The reviewer promotes `command-fill-ins-are-project-owned`. Merge authority is parent review.

There is no screen in this change, so there is nothing for a person to click through. The reviewer writes the review record.

## Review record

Reviewed by the specifying session on 2026-10-16, against `755fd73`.

### Checks re-run

- **`bash scripts/check-blueprint.sh` at `755fd73`, run by the reviewer:** exit 0. Every
  defect was caught, and the clean baseline was ok.
- **`git diff --stat origin/main...HEAD`:** the five files in *File Structure*,
  `scripts/take-version.mjs` (see below), and this plan.
- **The three commands checked against Decisions 2–4:** the block text and the default
  lines are verbatim, and the adoption comments are gone.
- **The probe pair `37d1dde` / `167b93f`:** the first adds one adoption line to
  `commands/next.md`, and the second removes it. Together they leave the file as
  `7b82fad` made it.
- **The new case** *asks for no edit on adoption outside a block* reads every shipped file
  of a fresh setup, outside its blocks, for the three patterns.

### Found

- **The plan's file list missed a defect in the update command, and the executor fixed it
  correctly.** An untouched file that gains its first project-owned block counted as a
  block-count mismatch. It was left in place with a `.new` beside it, and the
  installed-files check then failed on it.
  - This would have hit every project taking `v0.3.0`, on the three commands this plan
    changes.
  - The fix in `a5f7a31` replaces such a file, because a fingerprint match on a file with
    no blocks covers the whole file, so there is nothing of the project's to carry.
  - A file that already has blocks still gets a `.new` on a count change.
  - The existing take-version cases cover it: *moves an untouched v0.1.0 project* failed
    before the fix and passes after it.
  - The fix is understood and mechanical, so I accept it here rather than send it back.
- **Nothing else.**

### Outstanding disposition

- **Promoted to `shipped` in this branch**, with `modules` listed. Evidence per criterion:
  - *works as shipped, no placeholder:* the *asks for no edit…* case, and Task 4's first
    test run;
  - *lines in blocks, changing them keeps checks green:* the *ships project-owned blocks
    only where…* case, and Task 4's second run;
  - *a check fails on an adoption edit outside a block:* the *asks for no edit…* case, seen
    red on `37d1dde`;
  - *notes say what a project does:* the `RELEASES.md` section.
- **Release:** the developer runs `/release`, then the trigger with `bump=major`, giving
  `v0.3.0`. After that, the plan that updates this repository is written.
- **Squash message** is written explicitly, without the branch commits' trailers.

### Learnings routed

- **A plan's file list cannot always foresee a defect that its own change exposes in
  another tool.** That is covered by `rules/planning.md`'s File Structure section, whose
  question is *what is on the other side of this?*. The executor did the right thing:
  fixed it, named it under Scope, and explained it. Nothing new to write.

### Merged because

The self-check is green when re-run here. The commands ship working defaults inside
blocks, a check now refuses an adoption edit outside one, and the update-command defect
this exposed is fixed and covered.
