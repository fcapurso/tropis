# The version check lists the ignore and export lines a release would add — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `check-version.mjs` lists every line the take would add to the project's
`.gitignore` and `.gitattributes`, as a step, so a line that duplicates one the project
wrote its own way is seen before the take rather than found in a broken export.

**Backlog item:** `version-check-lists-ignore-lines` in `feature-catalog.yaml` (type
improvement). Spec: `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
entry 8 (`project-knows-whether-to-update`).

**One plan:** what becomes true is one sentence — the version check names every ignore
and export line the release adds.

**Model tier: Small.** The change is a comparison of two files and a report section,
given below.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request, write a review record
or merge.

**Merges after:** version-check-tells-a-red-baseline

**No fresh-agent check is owed:** the change touches no file under `framework/`, `rules/`
or `commands/`; the tests below pin what changes.

**What the specifying session verified on 2026-11-03, against `origin/main` at `f43d4bf`
(node v22, Linux x86_64):**

- The take appends lines to `.gitignore` and `.gitattributes` with
  `appendMissingLines(before, nextText, { attributes })` in `scripts/take-version.mjs`,
  near the end of `apply()`. Since `update-keeps-ignore-lines-in-their-own-form` shipped,
  it skips a line the project has written with or without a leading slash
  (`guards/take-version.test.js`, `adds no ignore or export-ignore line the project has
  in the other form`), but a line the project wrote any other way, or one it means to
  keep out, is still added. The take's result does not list the added lines, and
  `check-version.mjs` reports only files (`releaseLines`, `changedLines`), settings and
  rules — so the backlog note from 2026-10-17 stands: the check said `safe` for a
  release whose take added eleven export lines that broke a project's export.
- `check-version.mjs` takes the release in a scratch clone of the project, so after the
  take the clone's two files hold exactly the project's lines plus what the take added.
- A release adds an ignore line through `append_once .gitignore '<line>'` in
  `scripts/set-up-project.sh`; the take reads the release's files from a project set up
  by that script (`guards/take-version.test.js`,
  `adds new rule areas and ignore lines, keeping the project values`, does exactly this).

**Decided by the specifying session:**

- **Compute the added lines in `check-version.mjs`** by comparing the clone's file after
  the take with the project's committed file: every line of the clone's file, other than
  an empty one, that does not appear among the project's lines. The take is not changed.
- **Each added line is a step**, so a release that adds any line answers
  `safe with these steps` at best:
  `` `the take adds ${line} to ${file}; if you already cover that path another way, keep one of the two` ``.
  The lines are also listed under their own heading,
  `Lines the release adds to .gitignore and .gitattributes`, as `<file>: <line>`.
- No decision record: this plan records the choice.

---

## Delivers

version-check-lists-ignore-lines

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-ignore-lines -b plan/version-check-lists-ignore-lines origin/main` |

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

In `scripts/check-version.mjs`:

- A function `addedLines(project, clone)` returning, for `.gitignore` then
  `.gitattributes`, each line as `{ file, line }`: read the project's file (absent means
  no lines) and the clone's file (absent means nothing added); a non-empty line of the
  clone's file whose exact text is not a line of the project's file is added.
- After a successful take (where `stepsFor` is called), compute it; pass one step per
  line, worded as decided above, into the steps (after the settings lines), and the
  `<file>: <line>` list to `render()` as a new section placed after
  `Settings that no longer fit`.
- The verdict rule is unchanged: steps present makes it `safe with these steps` unless
  the checks fail.
- Update the file's header comment in one sentence.

## Tests

In `guards/check-version.test.js`:

1. † `it('lists each ignore and export line the release adds, as a step', …)`: release
   v0.2.1 adds `append_once .gitignore '.tropis/extra-output/'` after the line
   `append_once .gitignore '.claude/settings.local.json'` in `scripts/set-up-project.sh`
   (as the take-version case named above does; assert the replacement happened). Check
   it inside `kept()`. Expect status 0; `is safe with these steps.`;
   `Lines the release adds to .gitignore and .gitattributes`; `.gitignore: .tropis/extra-output/`;
   and the step `the take adds .tropis/extra-output/ to .gitignore`.
2. † `it('lists no line the project already has', …)`: the same release, but the project
   first adds `.tropis/extra-output/` to its own `.gitignore` and commits. Expect the
   heading `Lines the release adds` absent and no step naming `.tropis/extra-output/`.
   (This case passes before the change too, since nothing lists lines yet; it guards
   against a later over-reporting. It is not marked †.)
3. Keep every existing case passing; `says a release that only changes an untouched file is safe`
   still answers `safe`, which proves a release adding no line adds no step.

Case 1 must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run `guards/check-version.test.js` that way; say the exact command in
  the handover. Each case is slow.
- **Before starting, rebase on `origin/main` if `version-check-tells-a-red-baseline` has
  shipped**, since both plans edit the same two files.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/check-version.mjs` | the lines the take adds, as steps and a section |
| `guards/check-version.test.js` | two cases |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's row removed, if it has one (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-version-check-lists-ignore-lines.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide already says lines
are added only when missing, which stays true; `commands/update.md` performs each step
the check lists, and a line to keep or drop is such a step. No decision record. No
upstream queue: this repository is the upstream. A release-note line is the developer's
at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the two cases. Commit. Run the guard alone (*Traps*). Expected: case 1 fails on
`is safe.` where `is safe with these steps.` was expected; case 2 passes. Paste the
failing name.

### Task 2 — The change

Make the change. Commit. Run the guard alone: every case passes. Paste the `Tests:` line
and the report case 1 printed.

### Task 3 — The backlog and the board

1. In `feature-catalog.yaml`, on `version-check-lists-ignore-lines`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them;
   and set `modules` to `scripts/check-version.mjs`. Above the item, add
   `# Shipped by docs/superpowers/plans/2026-11-03-version-check-lists-ignore-lines.md.`
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
3. `git push -u origin plan/version-check-lists-ignore-lines`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

### Task completion

- **Task 0.** `npm --prefix .tropis ci` ran; the tree was clean; the baseline self-check
  on `f1c90ee` passed (exit 0).
- **Task 1.** The two cases are committed as `6099f00`, red. The guard run alone gave
  `Tests: 1 failed, 14 passed, 15 total`; the failing case is `lists each ignore and
  export line the release adds, as a step`. `lists no line the project already has`
  passed before the change, as the plan expects.
- **Task 2.** The change is committed as `19dfbdd`. The guard run alone gave
  `Tests: 15 passed, 15 total`.
- **Task 3.** The backlog edits are committed as `3b76eff`. The item reads `shipped`,
  its `modules` names `scripts/check-version.mjs`, and a comment above it maps each
  criterion to its case. Its row is removed from `docs/backlog-board/bands.yaml`. The
  board's hook did not rebuild `docs/backlog-board/index.html`, so it is unchanged.
- **Task 4.** The verification below ran on `3b76eff`. This report is committed after it.

### Verification results

Tools: git 2.43.0, node v22.23.4, npm 10.9.9, `uname -sm` Linux x86_64, in a Claude Code
cloud session.

- Baseline self-check on `f1c90ee`: last line `Self-check passed: every guard caught its
  defect, the clean baseline passed, and the framework repository's own guards passed.`
  (exit 0).
- Guard alone, as the self-check runs it: the helper `runguard.sh` from the session's
  scratch folder, which stages `git archive HEAD` and runs jest from `.self-check/`,
  invoked as `bash runguard.sh ../tropis-ignore-lines HEAD check-version.test.js`. It
  prints the `Tests:` line and failing names only.
- The report for case 1 was printed once from a scratch copy of `HEAD` with one
  `process.stdout.write` added, then discarded. The printed report:

  ```
  check-version: <scratch project> holds v0.2.0; taking v0.2.1 is safe with these steps.

  Steps
    the take adds .tropis/extra-output/ to .gitignore; if you already cover that path another way, keep one of the two

  Lines the release adds to .gitignore and .gitattributes
    .gitignore: .tropis/extra-output/

  Tests against v0.2.1 in a scratch copy
    62 passed, 0 failed
  ```

- `npm --prefix .tropis test` on `3b76eff`: `Tests: 173 passed, 173 total`. This runs
  the installed release's checks and shows nothing of this change.
- `bash scripts/check-blueprint.sh` on `3b76eff`: `Self-check passed` line above, exit 0.
- `git diff --stat origin/main...HEAD`, before this report was added:

  ```
   docs/backlog-board/bands.yaml | 12 ------------
   feature-catalog.yaml          |  9 +++++++--
   guards/check-version.test.js  | 28 ++++++++++++++++++++++++++++
   scripts/check-version.mjs     | 41 ++++++++++++++++++++++++++++++++++++-----
   4 files changed, 71 insertions(+), 19 deletions(-)
  ```

  Every file is in *File Structure*. This report adds the plan file, which that table
  lists.

### Scope

The four files above and the plan's own handover, all in *File Structure*. No file under
`.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md`, `AGENTS.md`, `framework/`, `rules/` or
`commands/` changed. No dependency was added. No guard or test was skipped or deleted.

### Judgment calls

- `addedLines` runs after the take's own suite, just before `stepsFor`, which is where the
  plan put it. The two early `render` calls pass `ignoreLines: []` explicitly, matching
  the other empty sections there, not a default parameter.
- Exact-text comparison means a line the take writes in a different spelling from one the
  project has (a leading slash, for example) is not listed. The take itself skips such
  a line, so the list agrees with what the take adds.
- The case for "lists no line the project already has" also asserts that the string
  `.tropis/extra-output/` appears nowhere in the report. That is stricter than the plan's
  "no step naming it".
- Both criteria in the catalog comment rest on the first case. Criterion 2 ("not plainly
  safe") is covered by its verdict assertion, and "each line is a step" by its step
  assertion.
- The header sentence went into the file's existing JSDoc paragraph, as one sentence.

### What the plan got wrong

- The doc-closeout paragraph says the operator guide already states that lines are added
  only when missing. A search for that wording (and for "when missing" and "ignore line")
  in `.tropis/README.md`, `README.md` and `docs/` found nothing. I did not establish where
  the source operator guide lives, so I changed nothing there. The claim is unverified.
- The plan says `commands/update.md` performs each listed step. Checked: it does perform
  required steps when they are mechanical and asks otherwise. The ignore steps are not
  marked optional, so they are required. See Outstanding.

### Outstanding

- No developer check. The change has no screen, so there is nothing for a developer to
  click through.
- The ignore steps are required. `commands/update.md` treats each required step as one
  to perform, and the step's text asks the user to keep one of two entries. So a release
  that adds an ignore line will prompt on every update until the project already has
  that line. Whether these should be optional is a design question. It is not changed
  here.
- `addedLines` assumes the take only appends to the ignore files. `appendMissingLines`
  does append only. If a take ever rewrites an existing line, the rewritten line would be
  listed as added.
- The operator guide wording above is unverified.
- No fresh-agent check is owed, since no file under `framework/`, `rules/` or `commands/`
  changed.
- No upstream queue entry and no decision record: this repository is the upstream, and
  the plan records the one choice made.
- Not done, as the plan requires: no pull request, no review record, no auto-merge, no
  merge. The branch is pushed; the worktree `../tropis-ignore-lines` is left in place.
