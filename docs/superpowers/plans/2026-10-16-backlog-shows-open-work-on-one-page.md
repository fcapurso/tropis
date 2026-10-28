# The backlog shows open work on one page — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** A set-up project gets first-adopter's backlog board. `npm --prefix .tropis run
board` writes one local HTML page of every open entry, grouped by a band kept in the
project's own `docs/backlog-board/bands.yaml`. `/refresh-board` walks someone through
banding and refreshing it, and `/next` suggests by the same bands, so the page and `/next`
agree. With no bands written, `/next` is unchanged.

**Spec:** the entry `backlog-shows-open-work-on-one-page` in `feature-catalog.yaml`. Read
its eight acceptance criteria and the dated comment above it, which records the two
choices this plan implements. The source being brought over lives in the sibling checkout
`../first-adopter` (read it; never edit it):

| first-adopter file | Lines | What it is |
|---|---|---|
| `.claude/commands/refresh-board.md` | 69 | The command |
| `.framework/scripts/build-backlog-board.mjs` | 134 | The page builder |
| `.framework/src/shared/board-bands.js` | 105 | `openBlockers`, `movedBands`, `stampBands`, `bandLetters` |
| `.framework/src/shared/next-work.js` | 321 | Its `/next` logic, bands included (`bandOf`, `byBand`, `stream`) |
| `docs/backlog-board/template.html` | 491 | The page template |
| `docs/backlog-board/bands.yaml` | 329 | Its bands: copy only the 11-line header comment |
| `.framework/src/shared/__tests__/backlog-board.test.js` | 108 | Builder tests |
| `.framework/src/shared/__tests__/board-bands.test.js` | 171 | Bands-module tests |

If `../first-adopter` is not on the machine, stop and report: the plan cannot be carried out
from this document alone.

**What the specifying session verified on 2026-10-16, against `main` at `9b30292`:**

- **Tropis's `/next`** is `scripts/next.mjs` (130 lines) over `scripts/next-work.js` (159
  lines), both installed through `scripts/installed-scripts.txt`. `next-work.js` exports
  `inFlight`, `ready`, `blocked`, `arcs` and `nextStep(catalog)`, which returns the first
  ready entry in an arc already under way, or null. It has no bands. `next.mjs` reads
  `feature-catalog.yaml` two levels above itself with the `yaml` package and prints, in
  order: an optional `Next step:` line, *Building*, *Ready to start*, *Blocked*, a
  retired-layer notice, the upstream queue, *Arcs under way*, and two counts. It has one
  stream, not first-adopter's split into product and framework streams.
- **first-adopter's builder** hard-codes a claude.ai Artifact address (`BOARD_URL`) and
  prints it; its command's step 4 publishes with an `Artifact` tool call. Both are what
  Decision 1 removes. The template's title and heading say "First Adopter Backlog", its
  layer labels name the Jira app and a retired `blueprint` layer, and its top box reads
  `__NEXT__` as one suggestion per stream.
- **`guards/next-report.test.js`** copies `next.mjs` and `next-work.js` into a scratch
  `.tropis/scripts/`, links `<blueprint root>/node_modules`, writes a catalog and runs the
  report. `guards/check-drift.test.js` line 94 edits the exact line
  `console.log('Ready to start');` in `next.mjs`.
- **`scripts/set-up-project.sh`** copies templates one by one into `.tropis/templates/`,
  runs `append_once .gitignore …` and `append_once .gitattributes "$p export-ignore"` over
  a fixed list, and writes the package file from `templates/package.json`, whose scripts
  are `test`, `next`, `dispatch`, `rules`.
- **`guards/set-up-project.test.js`** asserts the exact list of files setup writes
  (lines 90–116), that only five shipped files carry project-owned blocks (line 174:
  `feature.md`, `idea.md`, `manual-check.md`, `next.md`, `release.md`), that no shipped
  line outside a block says "on adoption", and that an exported copy leaks none of the
  tooling (lines 231–245).
- **`guards/framework-integrity.test.js`** fails on any backticked path starting `src/`,
  `docs/`, `scripts/`, `.claude/` or `.github/` in the shipped rules, framework documents,
  commands or `CLAUDE.md` that does not exist in the tree under test. Paths containing
  `*`, `<` or `>` are skipped. In the self-check that tree is the composed fixture built
  from `fixtures/base/`; `fixtures/README.md` says `base/docs/` holds documents the shipped
  prose names.
- **`guards/readme-usable.test.js`** line 73 fails when a slash command named on
  `README.md` has no file under `commands/`.
- **Taking a version** (FW-014) replaces only files under `.tropis/`, `.claude/framework/`
  and `.claude/commands/`, and appends `.gitignore` and `.gitattributes` lines the new
  version's setup has. A file under `docs/` is never touched.

**Model tier: Medium.** Most of the work is bringing over code that exists, with stated
changes; the judgment is in fitting bands into Tropis's single-stream `/next` without
changing it when no bands exist.

**Requires:** a sibling checkout of first-adopter at `../first-adopter` to read from, and any current Claude Code CLI for the fresh-agent check in Task 7 (record its version and machine).

**Merge authority: parent review.** It changes `/next` for every project, and the
specifying session holds the two choices behind it.

Do not store a kick-off prompt on this plan.

---

## Delivers

backlog-shows-open-work-on-one-page

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-backlog-board -b plan/backlog-shows-open-work-on-one-page` |
| first-adopter | do not edit | |

## Global Constraints

- **Do not reopen a decision under *Decisions*.** If one cannot be built as written, stop
  and report.
- **Never edit `../first-adopter`.** Read from it only.
- **Without bands, `/next` prints exactly what it prints today**, byte for byte.
- **Do not edit `.claude/` or `.tropis/` in this repository.** They hold the installed
  release; this repository gets the board when it takes the next release, which is not
  this plan.
- **No new dependency.** The `yaml` package is already a project dependency; nothing else.
- **The shipped command and pages name no single agent tool**, and nothing publishes the
  page.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken with the developer on 2026-10-16 (the entry's comment) and by the specifying
session. Do not reopen them.

1. **The board is a local page.** The builder writes `docs/backlog-board/index.html` and
   prints its path and `Open it in a browser.` No address, no publish step, no
   "not yet published" line. `/refresh-board` gets one project-owned block, after the
   step that looks at the page, for a project's own publishing step; as shipped the block
   holds only a comment saying what it is for.
2. **Where things live in a set-up project.**

   | Shipped from | Installed at | Owner |
   |---|---|---|
   | `scripts/build-backlog-board.mjs` | `.tropis/scripts/` (via `installed-scripts.txt`) | framework |
   | `scripts/board-bands.js` | `.tropis/scripts/` (via `installed-scripts.txt`) | framework |
   | `templates/backlog-board.html` | `.tropis/templates/backlog-board.html` | framework |
   | `templates/backlog-bands.yaml` | `.tropis/templates/backlog-bands.yaml`, and copied by setup to `docs/backlog-board/bands.yaml` | framework / project |
   | `commands/refresh-board.md` | `.claude/commands/refresh-board.md` | framework, one block the project's |

   `templates/backlog-bands.yaml` is first-adopter's 11-line header comment, with
   `npm run board` written `npm --prefix .tropis run board`, and no rows. The package
   template gains `"board": "node ./scripts/build-backlog-board.mjs"`. Setup appends
   `docs/backlog-board/index.html` to `.gitignore`, and adds `docs/backlog-board/` to the
   export-ignore list beside `docs/superpowers/`.
3. **The builder** is first-adopter's with these changes, and no others:
   - root two levels above its own folder, as `next.mjs`; the catalog read with `yaml`
     as `next.mjs` reads it; the template from `.tropis/templates/backlog-board.html`;
   - a missing `docs/backlog-board/bands.yaml` reads as no bands (every open entry is
     then listed as having no band). A project that took this release rather than being
     set up with it has no bands file, because taking a version never writes under
     `docs/`. `--stamp` with no bands file prints
     `No bands file yet: copy .tropis/templates/backlog-bands.yaml to docs/backlog-board/bands.yaml first.`
     and exits 0;
   - it creates `docs/backlog-board/` when absent;
   - the top box shows the single suggestion `nextStep(catalog, bands)` returns
     (Decision 5), as `{ id, t, b }` or `null`;
   - `__TITLE__` is `<project folder name> backlog`; the layer counts are `product` and
     `framework` only;
   - Decision 1's output lines.
4. **The template** is first-adopter's with: the title and heading from `__TITLE__`; the
   layer labels `product: "Product"` and `framework: "Framework — this project's own tooling"`
   and no `blueprint`, in the labels, the chips and the grouping order; the top box
   rendering one suggestion (or saying nothing is suggested) instead of one per stream.
   Everything else is kept.
5. **Bands in `/next`.** Port first-adopter's band logic into Tropis's `next-work.js`,
   shaped to its single stream:
   - `bandOf(id, bands)` and the A–E rank as in first-adopter (unknown or missing → `E`).
   - `nextStep(catalog, bands = null)`. When `bands` is null **or has no rows**, it
     returns what it returns today. Otherwise it orders `ready(catalog)` by band, an
     entry in an arc already under way first within a band, then the ready order (a
     stable sort), and returns the first entry banded A, B or C, or null.
   - `bandLetters` stays in `board-bands.js`; `next.mjs` and the builder both read
     `docs/backlog-board/bands.yaml` if it exists, parse it with `yaml`, and pass
     `bandLetters(parsed)` — an empty object for a header-only file, which counts as no
     rows.
6. **What `/next` prints with bands** (no bands: unchanged).
   - The `Next step:` line gains ` — band <X>` after the id.
   - When nothing ready is banded A–C: `Next step: none — nothing ready is banded A to C; <ids> need a decision, not a plan.`
     when some ready entries are D, otherwise
     `Next step: none — nothing ready is banded A to C; the rest is banded to leave alone.`
   - *Ready to start* lists entries in the band order above, each line beginning
     `  - [<band>] ` before the existing `[<type>]`, and a D line ending
     ` (needs a decision)`.
   - Nothing else changes. first-adopter's *to shape* line and its passed-over line are not
     ported.
7. **The command** is first-adopter's, with: `npm --prefix .tropis run board` everywhere;
   step 2's pointer to arcs naming *Arcs under way* in `npm --prefix .tropis run next`;
   a first line in step 2 saying that when `docs/backlog-board/bands.yaml` does not exist,
   copy `.tropis/templates/backlog-bands.yaml` there first; step 4 becoming "open the page
   the build printed and look at it", followed by Decision 1's block; step 5 unchanged in
   substance. It names no agent tool. It does not write the generated page's path in
   backticks (Trap 4).

## Traps

1. **The source guards have one runner: `bash scripts/check-blueprint.sh`, and it reads
   committed content only.** Every "see it red" is a commit followed by the self-check.
   Red commits on the branch are expected and vanish in the squash.
2. **Keep the line `console.log('Ready to start');` in `next.mjs` exactly as it is.**
   `check-drift.test.js` edits it to prove drift is reported.
3. **"Unchanged without bands" must be proven, not assumed.** Task 2 compares the report's
   output for one catalog with no bands file, with a header-only bands file, and as
   produced by `next.mjs` and `next-work.js` from `origin/main`. All three must be
   byte-identical.
4. **framework-integrity reads backticked `docs/…` paths in commands.** The generated page
   never exists in the composed fixture, so the command must not backtick it. The bands
   file it does name must exist there: add `fixtures/base/docs/backlog-board/bands.yaml`
   (a copy of the header template) and say so in `fixtures/README.md`.
5. **`set-up-project.test.js` pins three lists** (files written, files with blocks,
   exported entries). Update each for this plan; do not loosen any.
6. **The README is locked by `guards/readme-usable.test.js`.** Naming `/refresh-board` on
   the page requires `commands/refresh-board.md` to exist, which it will.

## Review Focus

- A project that took this release without being set up with it: no bands file. The
  build lists every entry as unbanded and `/next` is unchanged (Task 3, Task 2).
- A header-only bands file counts as no bands (Task 2).
- A D entry ready while nothing is A–C: no suggestion, and the D named (Task 2).
- The page's top box and `/next` agreeing, including when both say nothing (Task 3).

## File Structure

| File | Change |
|---|---|
| `scripts/next-work.js` | `bandOf`, band rank, `nextStep(catalog, bands)` (Decision 5) |
| `scripts/next.mjs` | Reads the bands file; prints Decision 6 when bands exist |
| `scripts/board-bands.js` | New, installed. From first-adopter, unchanged except the header line |
| `scripts/build-backlog-board.mjs` | New, installed (Decision 3) |
| `scripts/installed-scripts.txt` | Adds the two scripts |
| `scripts/set-up-project.sh` | Templates, bands file, ignore and export lines (Decision 2) |
| `templates/backlog-board.html` | New (Decision 4) |
| `templates/backlog-bands.yaml` | New (Decision 2) |
| `templates/package.json` | `board` script |
| `templates/README.md` | How to see and refresh the board; `/refresh-board` in the commands list |
| `commands/refresh-board.md` | New (Decision 7) |
| `guards/board-bands.test.js` | New, not installed. first-adopter's cases, imports adjusted |
| `guards/backlog-board.test.js` | New, not installed (Task 3) |
| `guards/next-report.test.js` | Band cases (Task 2) |
| `guards/set-up-project.test.js` | The three lists and the new assertions (Task 4) |
| `fixtures/base/docs/backlog-board/bands.yaml` | New (Trap 4) |
| `fixtures/README.md` | One sentence on that file |
| `README.md` | `/refresh-board` in the commands list, one sentence on the board |
| `framework/DECISIONS.md` | New FW-017 |
| `RELEASES.md` | `## [Unreleased]`: a new subsection, not breaking |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The bands module

**Files:** `scripts/board-bands.js`, `guards/board-bands.test.js`,
`scripts/installed-scripts.txt`

1. Copy `board-bands.js`; first line `// Shared machinery: no part of this file is project-owned.`
2. Copy its tests, importing from `../scripts/board-bands.js`. Every case keeps its name.
3. Add `board-bands.js` to `installed-scripts.txt`. Commit, run the self-check.

### Task 2: Bands in `/next`

**Files:** `scripts/next-work.js`, `scripts/next.mjs`, `guards/next-report.test.js`

1. Decisions 5 and 6.
2. Add to `next-report.test.js`, using its existing scratch pattern (copy `board-bands.js`
   too), one `it` each:
   - **Unchanged without bands:** one catalog with an arc under way, a ready entry and a
     blocked one. The output with no bands file, with a header-only bands file, and from
     the two scripts as they are on `origin/main` (read them with
     `git show origin/main:scripts/next.mjs` during the task and store the expected output
     in the test as a literal) are identical.
   - **Suggests by band:** two ready entries, the later one banded A and the earlier B.
     `Next step:` names the A entry with ` — band A`; the ready list shows A before B
     with their letters.
   - **An arc first within a band:** two ready entries both banded B, one in an arc under
     way. It is the one suggested.
   - **D and E are never suggested:** ready entries banded D and E only. The `Next step:`
     line is the decision sentence naming the D entry; the D line ends
     `(needs a decision)`. With E only, the leave-alone sentence.
   - **An unbanded entry counts as E:** one ready entry banded C and one with no band. The
     C entry is suggested and the other is listed after it as `[E]`.
3. Commit after each case, run the self-check, and see each red once on a deliberate
   break of the code it exercises, then revert.

### Task 3: The builder and the page

**Files:** `scripts/build-backlog-board.mjs`, `templates/backlog-board.html`,
`scripts/installed-scripts.txt`, `guards/backlog-board.test.js`

1. Decisions 3 and 4. Add the builder to `installed-scripts.txt`.
2. `guards/backlog-board.test.js`: a scratch project with `.tropis/scripts/` holding the
   builder, `next-work.js` and `board-bands.js`, `.tropis/templates/backlog-board.html`,
   `.tropis/package.json` `{"type":"module"}`, the linked `node_modules`, a catalog, and
   a bands file. Port first-adopter's cases, adjusted to this layout and to one suggestion:
   runs and writes the page; leaves no placeholder; embeds data the page can parse,
   covering every open entry; names unbanded entries and bands whose entry is gone; names
   moved bands; `--reevaluate` lists every open band; the top box shows the entry
   `nextStep(catalog, bandLetters(bands))` returns, **and is empty when that is null**;
   the command asks whether finishing an arc under way raises the band (read
   `commands/refresh-board.md` once Task 4 adds it — order the commit after Task 4, or
   write that case in Task 4). Add:
   - **No bands file:** exit 0, every open entry listed as unbanded, the page written.
   - **`--stamp` with no bands file:** Decision 3's sentence, exit 0, no file created.
   - **Local only:** the output contains `Open it in a browser.` and no `http`.
3. Commit after each case or group, run the self-check, see each red once, revert.

### Task 4: Setup and the command

**Files:** `scripts/set-up-project.sh`, `templates/backlog-bands.yaml`,
`templates/package.json`, `commands/refresh-board.md`, `guards/set-up-project.test.js`,
`fixtures/base/docs/backlog-board/bands.yaml`, `fixtures/README.md`

1. Decision 2 in setup; Decision 7 for the command; the fixture file and sentence.
2. In `set-up-project.test.js`:
   - the expected list gains `.tropis/templates/backlog-board.html`,
     `.tropis/templates/backlog-bands.yaml` and `docs/backlog-board/bands.yaml`;
   - the block list gains `.claude/commands/refresh-board.md`;
   - the leak check also refuses `docs/backlog-board/`;
   - a new `it`: the bands file parses with no rows; `shippedFiles(dir)` does not include
     it (so taking a version never touches it); the package file has a `board` script;
     `.gitignore` has `docs/backlog-board/index.html` once.
3. Commit, run the self-check. Expected: clean baseline ok, every defect still caught.

### Task 5: Pages

**Files:** `templates/README.md`, `README.md`, `framework/DECISIONS.md`, `RELEASES.md`

1. **`templates/README.md`**: add `/refresh-board` to *Commands you will type here*, and a
   short paragraph under *What to type*: `npm --prefix .tropis run board` writes the page
   to open in a browser; `/refresh-board` walks through banding and refreshing it; with
   bands written, `/next` suggests by band.
2. **`README.md`**: add `/refresh-board` to *Commands you will type*, and one sentence
   where `/next` is described in *Living with it*.
3. **FW-017** in `framework/DECISIONS.md`, dated 2026-10-16.
   - **Decision:** Decisions 1, 2 (ownership of the bands file) and 5 in prose.
   - **Rejected:** publishing to a hosted page (works in one agent tool, and the address
     belongs to one project); bands inside the catalog (a judgment beside facts, rewritten
     by every promotion); counting no bands as all-E (would make `/next` suggest nothing
     in every project that has not banded).
   - **Consequences:** a project that takes this release has no bands file until it
     copies the template; the page loads its fonts from Google Fonts, so offline it falls
     back to system fonts.
4. **`RELEASES.md`**: replace `_Nothing yet._` under `## [Unreleased]` with a subsection
   *The backlog on one page*, saying what the reader can now do, that it is not breaking,
   and that a project taking this release copies `.tropis/templates/backlog-bands.yaml`
   to `docs/backlog-board/bands.yaml` before banding.
5. Commit and run the self-check.

### Task 6: Full check on a real setup

In a scratch folder outside any repository, `git init`, run
`bash <worktree>/scripts/set-up-project.sh <it>`, `npm --prefix .tropis install`, commit.
Then:

1. `npm --prefix .tropis test` **before building the board**. Paste the counts.
2. `npm --prefix .tropis run board`. Paste the output. Confirm `git status --porcelain`
   is empty afterwards (the page is ignored).
3. Add two `idea` entries with acceptance criteria to the scratch catalog, band one B and
   one D in the bands file, commit, run `npm --prefix .tropis run next` and paste it.
4. Delete the scratch folder.

### Task 7: Fresh-agent check

Start a fresh agent session (any current Claude Code CLI; record the version and machine)
in a scratch project set up from your worktree. Tell it:

> This is a probe and its output will be discarded. I want to see this project's backlog
> on one page and decide what to work on next. Without running anything, tell me how.

Pass if it names `npm --prefix .tropis run board` (or `/refresh-board`), says the page is
opened in a browser, and says `/next` follows the bands once they are written, citing the
operator guide or the command. Paste its reply.

### Task 8: Self-check, scope and handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green; every file in the diff stat listed in *File Structure*, this plan
file included. State which doc-closeout rows of `framework/workflow.md` applied (operator
guide, adopter README, a decision — Task 5; a rule — say whether you met a constraint an
agent would trip over). Append `## Handover report` with the six sections the planning
rules name and every command from Tasks 1–7 with its output, and commit. The reviewer
writes the review record and promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| `run board` writes one page, grouped by band, blockers and arcs; ignored by git | `backlog-board.test.js` › runs and writes, embeds data; `set-up-project.test.js` › ignore line; Task 6 |
| Bands file is the project's; setup writes header only; updates never change it | `set-up-project.test.js` › new case (parses empty, not a shipped file) |
| Build lists unbanded, gone and moved bands, exits 0; `--stamp` records | `backlog-board.test.js` › names unbanded and gone, moved, `--reevaluate`, no bands file; `board-bands.test.js` › stamp cases |
| `/refresh-board` walks the steps; publishing a block; no tool named | `set-up-project.test.js` › block list; `backlog-board.test.js` › arc question; Task 7 |
| With bands, `/next` suggests by band; D and E not suggested; board top equals `/next` | `next-report.test.js` › suggests by band, arc first, D and E, unbanded as E; `backlog-board.test.js` › top box |
| Without bands, `/next` unchanged | `next-report.test.js` › unchanged without bands |
| Fresh checkout and self-check pass before the board is built | self-check clean baseline; Task 6 step 1 |
| Operator guide says how to see and refresh it | Task 5; Task 7 |

## Not in this plan

- **This repository taking the release that carries the board**, after this merges.
- **The report changes in `next-shows-which-work-is-planned`** and
  **`next-leaves-replaced-entries-out-of-arcs`**, which touch the same files; leave both
  for their own plans.
- **first-adopter's *to shape* and passed-over lines in `/next`.**
- **Anchoring the export lines:** `setup-export-lines-match-only-the-root`.

## Handover report

### Task completion

All eight tasks are done. Merge is parent review: this session does not merge, does not write the review record, and does not promote `backlog-shows-open-work-on-one-page`.

- **Task 1.** `scripts/board-bands.js` (first-adopter's file, plus the shared-machinery header), `guards/board-bands.test.js` (every case name kept), and `board-bands.js` on `scripts/installed-scripts.txt`. Commit `4911511`. Self-check green.
- **Task 2.** Decisions 5 and 6 in `scripts/next-work.js` and `scripts/next.mjs`. Five cases in `guards/next-report.test.js`. Each case was committed, seen red on a deliberate break, and reverted. Commits `c60c926`, `1b54aa2`, `21b2ed2`, `c32d1c7`, `72c4165`.
- **Task 3.** `scripts/build-backlog-board.mjs`, `templates/backlog-board.html`, the builder on the installed list, and `guards/backlog-board.test.js`. The arc question was written in Task 4, because the command did not exist yet. Commit `da4cd8e`, then the reds below.
- **Task 4.** Setup copies both templates, writes the header-only bands file, gitignores the page, and export-ignores `docs/backlog-board/`. `commands/refresh-board.md`, the fixture bands file, and the fixture README sentence. Commit `1216976`. Self-check green.
- **Task 5.** Operator guide, adopter README, FW-017, and the unreleased note. Commit `a1a7483`. Self-check green.
- **Task 6.** Scratch project outside any repository, then deleted. Counts and output are below.
- **Task 7.** Claude Code 2.1.300 on dev-laptop.local. The first reply did not say the page is opened in a browser. Step 4 of the command now says so (`926e33a`). The second reply passes. Both scratch projects were deleted.
- **Task 8.** Both suites green on `926e33a`. This commit is the report.

### Verification results

**Task 1.** `bash scripts/check-blueprint.sh` on `4911511`, exit 0. Closing lines:

```
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

**Task 2, each case seen red** (`bash scripts/check-blueprint.sh`, exit 1, clean baseline failed on the named test, then `git revert`):

| Break | Revert | Test that failed |
|---|---|---|
| `9b70ae3` append ` — band E` with no rows | `ee00f3f` | backlog report › is unchanged without bands |
| `ff71e6b` sort by arc only | `693adfc` | backlog report › suggests by band |
| `250c6a4` arc-first always wins | `e840881` | backlog report › suggests an entry in an arc under way first within a band |
| `f5dba6b` drop the D suffix | `4afeae4` | backlog report › never suggests D or E |
| `e637e50` unknown band prints `?` | `9365d71` | backlog report › counts an unbanded entry as E |

The matching green commits are in Task completion. Each of those self-checks exited 0 with the same closing lines as Task 1.

**Task 3, each break seen red**, then reverted:

| Break | Revert | Test that failed |
|---|---|---|
| `5723316` top box null, title replace is a no-op | `b437533` | backlog board build › leaves no placeholder in the output; backlog board build › shows at the top the entry nextStep returns, and is empty when that is null |
| `5a70614` empty unbanded and moved lists | `4f5b36d` | backlog board build › names unbanded entries and bands whose entry is gone; backlog board build › names moved bands; backlog board build › --reevaluate lists every open band; backlog board without a bands file › lists every open entry as unbanded and writes the page |
| `1bce5e5` stamp prints `No bands file.` | `711b8d2` | backlog board without a bands file › --stamp with no bands file explains and writes nothing |
| `c9b14bf` stdout includes `http://example.com` | `f671899` | backlog board without a bands file › is local only |

`bash scripts/check-blueprint.sh` on `da4cd8e` exited 0.

**Task 4.** `bash scripts/check-blueprint.sh` on `1216976`, exit 0, clean baseline ok, every planted defect caught. Adding the `board` script made the self-check reinstall its tools from `templates/package.json`; the run still ended green.

**Task 5.** `bash scripts/check-blueprint.sh` on `a1a7483`, exit 0, about 88s, closing lines as Task 1.

**Task 6.** Scratch directory `/tmp/tropis-board-b3nv`, outside any repository. `git init -b main`, then `bash ~/src/tropis-backlog-board/scripts/set-up-project.sh` on it, `npm --prefix .tropis install`, and a commit made with `git -c user.name` and `git -c user.email` (git config was not changed).

1. `npm --prefix .tropis test` before the board, exit 0:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.433 s
Ran all test suites.
```

2. `npm --prefix .tropis run board`, exit 0:

```
> tropis-board-b3nv-framework@1.0.0 board
> node ./scripts/build-backlog-board.mjs

/private/tmp/tropis-board-b3nv/docs/backlog-board/index.html
Open it in a browser.
```

`git status --porcelain` afterwards printed nothing.

3. Two `idea` entries, `paint-the-shed` (band B) and `choose-the-colour` (band D), each with acceptance criteria, modules `[]` and refs `[]`. Committed, then `npm --prefix .tropis run next`, exit 0:

```
Next step: none — nothing ready is banded A to C; the rest is banded to leave alone.

Building (catalog status)
  (none)

Ready to start
  (none)

Blocked
  (none)

2 idea(s) not yet shaped.
```

Ideas are not ready, so neither band is suggested. The leave-alone sentence is Decision 6's otherwise branch: nothing ready is D.

4. The scratch folder was deleted.

**Task 7.** Tool: Claude Code 2.1.300 (`claude --version` reports `2.1.300 (Claude Code)`). Machine: dev-laptop.local, Darwin arm64, macOS 26.2 (build 25C56). Prompt, verbatim, in a scratch project set up from this worktree, with `claude -p --permission-mode dontAsk --permission-prompts none --allowedTools "Read,Grep,Glob"`:

> This is a probe and its output will be discarded. I want to see this project's backlog on one page and decide what to work on next. Without running anything, tell me how.

The first reply named `/refresh-board` and `npm --prefix .tropis run board`, and said `/next` suggests by priority letter. It said "open the page" and did not say a browser. That reply is why `926e33a` exists. Full reply:

```
Run **`/refresh-board`**, then **`/next`**.

1. **`/refresh-board`** builds the one-page board from `feature-catalog.yaml` (it runs `npm --prefix .tropis run board`). The build tells you where it wrote the page. The page itself is gitignored and gets rebuilt each time.
   - Each open entry on the board has a priority letter and a one- or two-sentence reason. The letters are A (do now), B (do next), C (cheap win, batch it), D (decide, don't build) and E (leave alone). They are stored in `docs/backlog-board/bands.yaml`, which already exists here.
   - If an entry has no letter yet, or a letter is out of date, the command has the agent read that entry and assign or rewrite one. The agent then rebuilds the page and commits `bands.yaml` to `main`.
   - Use `/refresh-board all` if you want every reason re-read, not just the ones the build flags.
2. **`/next`** lists what is in progress, what is ready, and what is blocked. It suggests what to pick by priority letter, and uses "finishes something already under way" only to break a tie between entries with the same letter. It also compares the backlog with the actual repository (uncommitted changes, open pull requests, worktrees), so you'd see an entry still marked as being built after it was merged, or work going on that the backlog doesn't know about.

Then open the page and pick from the A rows. When you've chosen, `/feature` moves that entry to its next status.

Both commands are in `.claude/commands/`. I read them but didn't run them.
```

The second reply, after step 4 said "in a browser", passes. It names both commands, says the rebuild tells you to open the page in a browser, and says `/next` suggests by band. It cites the commands. Full reply:

```
Two commands do this. The first gives you the one page, and the second helps you pick from it.

1. **`/refresh-board` builds the one-page backlog.** It runs `npm --prefix .tropis run board`, which turns `feature-catalog.yaml` into a page and prints where that page is. Each open item sits in a priority band:
   - A: do now
   - B: do next
   - C: cheap win, do it with others
   - D: needs a decision, don't build yet
   - E: leave alone

   Each item also gets a one- or two-sentence reason. The bands live in `docs/backlog-board/bands.yaml`, which already exists here. If the build finds items with no band, or bands that are out of date, the agent fills them in from the catalog. It then rebuilds the page, tells you to open it in a browser, and commits `bands.yaml` straight to `main`. That's allowed because it's a file under `docs/`.
   - `/refresh-board all` re-checks every band, not just the ones the build flagged.

2. **`/next` shows what's in progress, ready, or blocked.** It runs `npm --prefix .tropis run next`, which suggests work by band and breaks ties within a band by favouring partly finished groups of related items. It then checks `git status`, open pull requests and worktrees for work the backlog doesn't show. A mismatch usually means an item was never moved off "building" after its merge.

Start with `/refresh-board`, look at the A and B rows, then run `/next` to confirm nothing is already under way.

On a fresh clone, run `npm --prefix .tropis ci` first. Both commands need it.
```

Both scratch projects were deleted.

**Task 8, on `926e33a`.**

`bash scripts/check-blueprint.sh` exit 0, 90829 ms:

```
Checking 926e33a of ~/src/tropis-backlog-board

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

`npm --prefix .tropis test` exit 0. This is the installed release's suite on this repository, not the source guards:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.696 s
Ran all test suites.
```

`git diff --stat origin/main...HEAD` before this commit:

```
 README.md                                   |   4 +-
 RELEASES.md                                 |   4 +
 commands/refresh-board.md                   |  71 ++++
 fixtures/README.md                          |   1 +
 fixtures/base/docs/backlog-board/bands.yaml |  11 +
 framework/DECISIONS.md                      |  24 ++
 guards/backlog-board.test.js                | 240 ++++++++++++++
 guards/board-bands.test.js                  | 171 ++++++++++
 guards/next-report.test.js                  | 256 ++++++++++++++-
 guards/set-up-project.test.js               |  25 +-
 scripts/board-bands.js                      | 106 ++++++
 scripts/build-backlog-board.mjs             | 130 ++++++++
 scripts/installed-scripts.txt               |   2 +
 scripts/next-work.js                        |  79 ++++-
 scripts/next.mjs                            |  32 +-
 scripts/set-up-project.sh                   |   6 +-
 templates/README.md                         |   4 +-
 templates/backlog-bands.yaml                |  11 +
 templates/backlog-board.html                | 492 ++++++++++++++++++++++++++++
 templates/package.json                      |   1 +
 20 files changed, 1647 insertions(+), 23 deletions(-)
```

**Doc closeout.** The operator-guide row applied: `templates/README.md`, which setup installs as `.tropis/README.md`. The adopter-README row applied: `README.md`. The decision row applied: FW-017. No architecture change. The feature-catalog row is the reviewer's: this session did not edit `feature-catalog.yaml`. The upstream-queue row does not add a separate line: this repository is the upstream, and the feature is the change. No new rule. The constraint an agent would trip over while writing the command — do not wrap the generated page path in backticks, because that page never exists in the composed fixture — is already enforced by `guards/framework-integrity.test.js`, and the command and FW-017 keep that path out of backticks. An agent using the board does not hit it.

### Scope

Every file in the diff stat above is in *File Structure*. This commit adds only this plan file, which Task 8 names. `feature-catalog.yaml` is not in the diff.

### Judgment calls

- `hasBandRows` and `readyInBandOrder` are exported from `scripts/next-work.js` so `scripts/next.mjs` and `nextStep` share one sort. The plan named `bandOf` and `nextStep`. `underWayIds` and `byBand` stay private.
- With band rows, the page's top box is `{ id, t, b }` from `nextStep`. With no rows, `b` is null even when an arc suggestion exists, so a project that has not banded is not shown as all-E.
- The template's footer paragraphs that talk about keeping the rest of the backlog were left as copied. Nothing in them names a product or a second stream.
- The arc-question test reads `commands/refresh-board.md` and was committed with Task 4.
- After the first probe, step 4 of `/refresh-board` says "Open the page the build printed in a browser and look at it." The plan's sentence did not include "in a browser". The build already prints `Open it in a browser.`, and the pass line of Task 7 requires the agent to say so.

### What the plan got wrong

- `RELEASES.md` no longer has `_Nothing yet._` under `## [Unreleased]`. The version-check plan already wrote "A project can ask whether to update". The new subsection was added above that one, not in place of the placeholder.
- `guards/set-up-project.test.js` › records every shipped file at version unknown fails when run inside this worktree, because `git describe --tags --always` returns a tag (for example `v0.3.0-29-g5723316`). The self-check stages an archive that is not a git repository, so the version is `unknown` and the test passes there. Setup was not changed to force `unknown`.
- Task 6's two entries are ideas, so they are not ready and `/next` does not name band B or band D. The pasted output is what the command printed.

### Outstanding

Nothing left for this session. The reviewer writes the review record, promotes the catalog entry, and merges. This repository taking the release that carries the board is a later plan.

## Review record

Reviewed by the specifying session (Claude Code desktop, Claude Opus 5.5, on the
developer's Mac, Darwin 25.2.0) on 2026-10-16, against `3555c05`.

### Checks re-run

- `bash scripts/check-blueprint.sh` in a review worktree at `3555c05`, exit 0: 16 planted
  defects each `caught`, `ok clean baseline`.
- CI on the pull request at `3555c05`: `self-check pass`.
- `git diff --stat origin/main...HEAD`: 21 files, every one in *File Structure*.
- `npm --prefix .tropis test` with the entry promoted: `Tests: 28 passed, 28 total`.
- On this repository's real backlog, in a scratch copy: `next.mjs` and `next-work.js`
  from the branch and from `origin/main`, with no bands file, print byte-identical
  output (`diff` empty). The builder wrote the page and listed 39 unbanded entries.
- The page, served locally and opened in the desktop app's browser: entries, filters,
  arcs and the top suggestion render. Every dash and middle dot was garbled (Found).
- Not re-run: the per-case breaks; their commits are on the branch. `9b70ae3` changes one
  line of `next.mjs`, as the table says.
- The handover's diagnosis that `set-up-project.test.js` › records every shipped file at
  version unknown fails inside a worktree because `git describe` finds a tag there and
  passes in the self-check's archive: consistent with `set-up-project.sh` recording
  `git describe --tags --always` or `unknown` (FW-014). Not a defect of this plan.

### Found

- **The page declared no encoding.** first-adopter's template had no doctype and no
  `<meta charset>`, because the hosted page it was published to supplied them. Opened
  from disk, the browser read it in its default encoding. Fixed on the branch by the
  reviewer, as understood and mechanical: the test first, `93b769d` (seen red: the
  clean baseline failed on backlog board build › declares itself an HTML page in UTF-8),
  then the template's first three lines, `f791d87` (self-check green). The page re-checked by eye
  afterwards renders correctly.
- **The build asks for bands on replaced entries.** On the real backlog its unbanded list
  includes the four entries closed as replaced on 2026-10-16, and the page shows an arc
  of two shelved entries as work in progress. Inherited from first-adopter. Routed below.
- A malformed bands file makes `/next` stop with a YAML error, since `next.mjs` now reads
  it. The error names the file and line. Dropped: the operator is told exactly what to fix.

### Outstanding disposition

- Promote the entry and write this record: done in this commit.
- The plan's Task 6 step 3 banded two ideas, which are never ready, so it could not show a
  band suggestion: the plan's error, as the handover says. The behaviour is covered by
  the five `next-report.test.js` band cases.
- This repository taking the release that carries the board: after the next release,
  as the plan says.

### Learnings routed

- Replaced and shelved entries counted as work by the board: added to the existing entry
  `next-leaves-replaced-entries-out-of-arcs` on `main` right after this merge, which
  already covers the same fault in the backlog report.
- A template written for a host that supplies the page skeleton needs its own once it is
  opened from disk. Specific to bringing this page over; not general enough for a rule.

### Merged because

Every criterion has a test seen red, `/next` is proven unchanged without bands on the real
backlog, and the one defect found was fixed on the branch with its own red-then-green test.
