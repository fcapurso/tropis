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
