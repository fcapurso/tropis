# The README work is finished without a mechanical check — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** the last pieces of `product-readme-is-kept-current` land: this repository's own
README check keeps only what a refresh guarantees; `/update` tells a project with its own
skeleton when the default changed; `/refresh-readme` records its refresh point quoted and
leaves nothing changed when the answer is no; and tests back the two criteria that had only
command text behind them — so the entry can ship.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md`, including its
*Between refreshes: no mechanical check* section, revised by the developer on 2026-10-21. The
earlier plans for the entry are merged except the fact-check pair, which is abandoned:
`2026-10-21-readme-fact-check.md` and its follow-up, PR fcapurso/tropis#115 closed unmerged.
This plan takes three pieces from that closed branch, `origin/plan/readme-fact-check`, and
nothing else from it.

**What the specifying session verified on 2026-10-21, at `main` `d0ce75d`:**

- `guards/readme-usable.test.js` on `main` asserts fixed phrases, headings and links ("take
  an idea to a merged change", `## Getting started` with "shaping conversation", links to
  `framework/workflow.md`, …) that a page rewritten from this repository's skeleton
  (`docs/readme/skeleton.md`) is not guaranteed to keep, so this repository's first refresh
  would turn its self-check red. The closed branch has a reduced version that keeps three
  assertions: the first line is `# Tropis`; `## What is Tropis?` is followed by the skeleton's
  fixed text exactly; every slash command the page names exists under `commands/`. Read it
  with `git show "origin/plan/readme-fact-check:guards/readme-usable.test.js"`. No catalog
  entry in this repository relies on the assertions it drops (checked:
  `blueprint-readme-usable` lives in another repository's catalog).
- `scripts/check-blueprint.sh` plants `plant readme-usable README.md "## Getting started"`;
  the reduced guard does not look at that heading, so the plant must target `## What is
  Tropis?`.
- `docs/readme/skeleton.md`'s header comment says the README guard "requires certain phrases
  and headings: keep them until that check is reworked".
- `commands/update.md`, Stage 8's printed list, has no notice for a changed default skeleton;
  the closed branch has one (`git diff main...origin/plan/readme-fact-check -- commands/update.md`).
- `commands/refresh-readme.md`, **On yes**, reads exactly:
  ```
  **On yes:** set `refreshedAt` in `docs/readme/readme.yaml` to the current `HEAD`
  (`git rev-parse HEAD` — the commit the page was refreshed against, not a new one).
  If the developer edited the page, run the checks again first. If one fails, say which
  and why, and ask again whether to keep the page; commit only on a second yes.
  Commit those two files only, once:
  ```
  So the settings file is changed before the second ask, and a no at that ask leaves it
  changed while the page is restored. Nothing says to quote the hash; an unquoted all-digit
  hash reads as a number.
- Criteria of `product-readme-is-kept-current` with no test or recorded check behind them:
  *a project with its own copy is refreshed from that copy, and updates never change it*, and
  */bootstrap asks which level the project wants, /refresh-readme with a level records it, and
  the first update after this release asks an existing project once*. `guards/set-up-project.test.js`
  asserts the files setup writes; `guards/take-version.test.js` uses `inWorld`, `w.release`,
  `w.take`, `w.commit`, `edit` and `read` (see *leaves a changed file alone when the new
  version did not change it*).
- `framework/DECISIONS.md` ends at FW-025.

**Model tier: Small–medium.**

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** The reviewer ships the entry at merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

product-readme-is-kept-current

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-readme-rescue -b plan/readme-rescue` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md`.**
- **Take nothing from `origin/plan/readme-fact-check` beyond Decisions 1 and 2.** No fact
  check, no ignore list, no change to the workflow's exception, no `.claude/`/`.tropis/`
  restore in the self-check.
- **Do not lower, skip or delete a guard to get green** beyond Decision 1's reduction.
- Every commit has a body. No `Co-authored-by` trailer.

## Decisions

Taken by the specifying session on 2026-10-21. Do not reopen them.

1. **This repository's README check.**
   - Replace `guards/readme-usable.test.js` with the closed branch's version, byte for byte.
   - `scripts/check-blueprint.sh`: replace `plant readme-usable README.md "## Getting started"`
     with `plant readme-usable README.md "## What is Tropis?"`.
   - `docs/readme/skeleton.md`: in the header comment, replace `This repository's README is
     also checked by guards/readme-usable.test.js, which requires certain phrases and headings:
     keep them until that check is reworked.` with `This repository's README is also checked
     by guards/readme-usable.test.js, for its title, the fixed text below, and the commands it
     names.` (rewrap the comment as needed).

2. **`commands/update.md`.** Add to Stage 8's printed list, before the `how to merge` item,
   the closed branch's three lines:
   ```
   - when the take's Replaced list includes .tropis/templates/readme-skeleton.md and the
     project has docs/readme/skeleton.md: say that the default README skeleton changed in this
     release, and offer to show the difference between the two
   ```

3. **`commands/refresh-readme.md`, On yes.** Replace the four lines quoted above (from
   `**On yes:**` to `commit only on a second yes.`) with:
   ```
   **On yes:** if the developer edited the page, run the checks again. If one fails, say
   which and why, and ask again whether to keep the page. On a no now, do what **On no**
   says. Only on the last yes, set `refreshedAt` in `docs/readme/readme.yaml` to the current
   `HEAD` — `git rev-parse HEAD`, written in double quotes so YAML reads it as text: the
   commit the page was refreshed against, not a new one.
   ```
   The line `Commit those two files only, once:` and what follows stay.

4. **Tests for the two unbacked criteria.**
   - `guards/take-version.test.js`, in `describe('take-version.mjs')`, a test `never touches a
     project's own README skeleton or settings`: in the project, write
     `docs/readme/skeleton.md` (`## Ours\n- **Job:** ours.\n`) and `docs/readme/readme.yaml`
     (`level: suggests\nrefreshedAt: ""\n`) and commit; release a version that changes
     `templates/readme-skeleton.md` (append a line); take it; assert status 0, both files byte
     for byte as written, and no `.new` beside either.
   - `guards/set-up-project.test.js`: in the test that lists every file setup writes, assert
     that no path under `docs/readme/` is among them — setup leaves the level to `/bootstrap`.
   - A new `guards/readme-level.test.js` (`// Level: unit`, reading source files relative to
     this file, as `guards/release.test.js` reads `../commands/release.md`), whitespace
     collapsed, asserting:
     - `commands/bootstrap.md` has `## Stage 3a — Choose how Tropis keeps the README`, and that
       stage contains `Then run \`/refresh-readme <level>\`` and recommends `writes` for a project
       with no `README.md` and `suggests` for one that had it;
     - `commands/refresh-readme.md`'s level option contains `Commit that one file only` and
       `Do not refresh`;
     - `RELEASES.md`'s `## [Unreleased]` holds `### After updating: what to do by hand` with a
       numbered bold step `**1. Choose how Tropis keeps your README.**` not marked `Optional:`
       — the step `/update` performs (FW-023).
     Each assertion must fail when its phrase is removed; show it under *Verification results*.

5. **Records.**
   - `framework/DECISIONS.md`: append FW-026 `A README is not checked mechanically between
     refreshes`, dated 2026-10-21, Accepted. **Decision:** the README is kept honest between
     releases by the doc-closeout step at merge (a change correcting what it made wrong, adding
     nothing), the nudge in `/next` and the board, and the whole-page refresh in `/release`; no
     check in a project's suite. **Evidence:** PR fcapurso/tropis#115 (closed): a check that a
     README names only what exists raised false alarms on web routes, MIME types, branch and
     package names, footnotes and protocol-relative images, or lost its rules one by one until
     only broken links were left. **Rejected:** that check, by the developer; a warning-only
     version of it (it adds a parser to every project for broken links the refresh finds
     anyway). **Consequences:** this repository's README check keeps only what a refresh
     guarantees; nothing in a set-up project's suite reads its README.
   - `RELEASES.md`, `### Keep your README current with /refresh-readme`: append the sentence
     `If you keep your own skeleton, /update tells you when the default one changes.`

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. Run nothing else at the same time. A run that
  hangs inside a `tar` extract or fails naming no test has been seen when two ran at once;
  wait, run once more, and report both.
- **The closed branch is a source, not a base.** Read files from it with `git show`; never
  merge, cherry-pick or check it out.
- **`readme-usable` reads this repository's real `README.md`**, which must pass the reduced
  version unchanged — it already has the title, the fixed text and only commands that exist.
  If it fails, report why; do not edit `README.md`.

## File Structure

| File | Change |
|---|---|
| `guards/readme-usable.test.js` | Decision 1 |
| `scripts/check-blueprint.sh` | Decision 1, one line |
| `docs/readme/skeleton.md` | Decision 1, header comment |
| `commands/update.md` | Decision 2 |
| `commands/refresh-readme.md` | Decision 3 |
| `guards/take-version.test.js` | Decision 4 |
| `guards/set-up-project.test.js` | Decision 4 |
| `guards/readme-level.test.js` | Decision 4, created |
| `framework/DECISIONS.md` | Decision 5 |
| `RELEASES.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-21-readme-rescue.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer ships the entry |

## Tasks

### Task 1: This repository's README check

Decision 1. Commit; self-check green, with `caught readme-usable: README.md planted`.

### Task 2: The commands

Decisions 2 and 3. Commit; self-check green.

### Task 3: The tests

Decision 4, each test first seen failing (against the text before the edit, or by removing its
phrase on a throwaway copy) and then passing. Commit; self-check green.

### Task 4: Records

Decision 5. Commit; self-check green.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: last line `Self-check passed: …`; project checks green; only files in *File
Structure*. Append `## Handover report` with the six sections the planning rules name; under
*Verification results*, list for each acceptance criterion of `product-readme-is-kept-current`
the test or recorded check that backs it. Commit, push, open a pull request against `main`. Do
not merge.

## Not in this plan

- No fresh-agent check: the commands change only in wording a reader can verify, and no rule or
  framework instruction changes; the decision record is a record. Say so in the handover.
- Deleting the closed branch: the reviewer does it after merge.

## Handover report

### Task completion

All five tasks are done. Nothing was merged: merge authority is parent review, and the
reviewer ships `product-readme-is-kept-current`.

- Task 1, commit `923d6e2`. Self-check green, including `caught      readme-usable: README.md planted`.
- Task 2, commit `4d50762`. Self-check green.
- Task 3, commit `bd018e8`. Each new assertion was seen failing, then the three files passed. Self-check green.
- Task 4, commit `69e4fe5`. Self-check green.
- Task 5 is this commit. No fresh-agent check: the commands change only in wording a reader can verify, and no rule or framework instruction changes. FW-026 is a record.

Each task's self-check last line was `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`

### Verification results

Tool: Cursor 3.24.12, this session. Machine: dev-laptop.local, Darwin arm64, macOS 26.2 (25C56). Node v22.15.0, npm 11.6.4, git 2.49.0.

**`bash scripts/check-blueprint.sh`**, on `69e4fe5` (HEAD before this handover commit). Exit 0.

```
Checking 69e4fe5 of ~/src/tropis-readme-rescue

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      stale-picks            doc-currency
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

Framework repository: its own guards must pass here and fail on a planted defect

  caught      operator-page-closeout: framework/workflow.md planted
  caught      operator-page-closeout: PORTABILITY-NOTES.md planted
  caught      readme-usable: README.md planted
  caught      readme-usable: PORTABILITY-NOTES.md planted

Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

**`npm --prefix .tropis test`**, on `69e4fe5`. Exit 0. These are the installed release's checks.

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.648 s
Ran all test suites.
```

**`git diff --stat origin/main...HEAD`**, on `69e4fe5`, before this handover commit:

```
 RELEASES.md                   |  2 ++
 commands/refresh-readme.md    |  9 ++++---
 commands/update.md            |  3 +++
 docs/readme/skeleton.md       |  4 +--
 framework/DECISIONS.md        | 19 ++++++++++++++
 guards/readme-level.test.js   | 59 +++++++++++++++++++++++++++++++++++++++++
 guards/readme-usable.test.js  | 61 +++++++++++++------------------------------
 guards/set-up-project.test.js |  2 ++
 guards/take-version.test.js   | 16 ++++++++++++
 scripts/check-blueprint.sh    |  2 +-
 10 files changed, 127 insertions(+), 50 deletions(-)
```

**Task 3, each assertion failing, then passing.** Jest from `.self-check/node_modules/.bin/jest` with `--experimental-vm-modules`, a throwaway root `package.json` of `{"type":"module"}`, and `node_modules` linked to `.self-check/node_modules`. Both were removed afterwards. The first set-up run, before that link, failed to load: `Cannot find module 'yaml' from 'guards/set-up-project.test.js'`. That was the runner, not the assertion.

Each phrase was removed from a copy of the source that was restored before the next run. Exit 1 every time, one failed test:

| Phrase removed | Failure |
|---|---|
| `## Stage 3a — Choose how Tropis keeps the README` | `Expected: >= 0` |
| `Then run `/refresh-readme <level>`` | `Expected substring: "Then run `/refresh-readme <level>`"` |
| `Recommend `writes` when the project had no `README.md`` | `Expected substring: "Recommend `writes` when the project had no `README.md`"` |
| `` `suggests` when it had one `` | `Expected substring: "`suggests` when it had one"` |
| `Commit that one file only` | `Expected substring: "Commit that one file only"` |
| first `Do not refresh` | `Expected substring: "Do not refresh"` |
| first `### After updating: what to do by hand` | `Expected: >= 0` |
| `**1. Choose how Tropis keeps your README.**` | `Expected substring: "**1. Choose how Tropis keeps your README.**"` |

Marking that step `Optional:` (the exact lead left in place, then ` Optional:`) failed with `Expected substring: not "Optional:"`. Received string started `**1. Choose how Tropis keeps your README.** Optional: Run `/refresh-readme writes`…`.

Putting `docs/readme/readme.yaml` into the setup file list failed at `guards/set-up-project.test.js:124`:

```
- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "docs/readme/readme.yaml",
+ ]
```

Asserting the project skeleton equalled the released `templates/readme-skeleton.md` failed. Received was the project's own file:

```
+ ## Ours
+ - **Job:** ours.
```

Expected was the template plus `A line from the next version.` (`- Expected  - 46`, `+ Received  +  2`). Status 0 had already passed, so the take had run and left the file alone.

Then the three files, restored, with the name filter covering the new tests: `PASS guards/readme-level.test.js`, `PASS guards/set-up-project.test.js`, `PASS guards/take-version.test.js`. `Tests: 44 skipped, 9 passed, 53 total`. Exit 0. The nine are the seven level assertions, the setup test, and `never touches a project's own README skeleton or settings` (1789 ms on its own green run).

**Each acceptance criterion of `product-readme-is-kept-current`, and what backs it.**

- At `writes`, `/refresh-readme` rewrites out-of-date sections, lists them, and commits only on yes; on a no the page is as before. Command text in `commands/refresh-readme.md` (**On yes** / **On no**). This plan's On yes sets `refreshedAt` only on the last yes, quoted, and a no after a failed re-check does what **On no** says. Recorded fresh-agent check in `56fc3c4` (Claude Code CLI 2.1.300, the developer's MacBook Pro, Darwin 25.2.0 arm64) covered the first yes/no at `writes`, not this second-ask wording. No automated test of the agent procedure. The plan waived a fresh-agent check of the new wording.
- At `suggests`, or with no level, `/refresh-readme` reports and leaves `README.md` unchanged; at `manual`, no check, nudge or release step, and a hand run only reports. `commands/refresh-readme.md` section `At suggests, or manual, or an unchosen level`. `guards/readme-freshness.test.js` `says nothing when the level is not writes or suggests`. `guards/next-report.test.js` `prints no README section when the level is manual`. `guards/release.test.js` `manual skips the stage`. The same `56fc3c4` check: at `suggests` and `manual` the probe only reported.
- A project without its own skeleton is refreshed from the one Tropis ships; a project with its own copy is refreshed from that copy, and updates never change it. `commands/refresh-readme.md` reads `docs/readme/skeleton.md` when that file exists, otherwise `.tropis/templates/readme-skeleton.md`. `guards/take-version.test.js` `never touches a project's own README skeleton or settings` (this plan): after a release that appends a line to `templates/readme-skeleton.md`, both project files were byte for byte as written and neither had a `.new`. The Stage 8 notice in `commands/update.md` is the wording that tells the project; this plan did not add a test that reads those three lines.
- `/bootstrap` asks which level, `/refresh-readme` with a level records it, and the first update asks an existing project once. `guards/readme-level.test.js` (this plan): Stage 3a, `Then run `/refresh-readme <level>``, the `writes` and `suggests` recommendations, `Commit that one file only`, `Do not refresh`, and in `## [Unreleased]` the step `**1. Choose how Tropis keeps your README.**` not marked `Optional:`. `guards/set-up-project.test.js` asserts no path under `docs/readme/` is among the files setup writes.
- At `writes` or `suggests`, `/next` and the board say when the README was last refreshed and name the shipped product features and improvements since, and say nothing when there are none. `guards/readme-freshness.test.js` (`says nothing when nothing has ever shipped and the README was never refreshed`, `says nothing when nothing countable has shipped since a readable refresh`, `names what shipped since the refresh`). `guards/next-report.test.js` `names the product feature shipped since the README was refreshed`. `guards/backlog-board.test.js` `puts the README line in #readme when one is due, and leaves #readme empty when not`. Shipped in `55d7baa`.
- At `writes` or `suggests`, `/release` refreshes the README before drafting the notes, and when the README is still behind it lists what and asks whether to release anyway. `guards/release.test.js` `the /release README stage`, including `a README still behind asks` and `On yes, go on, and remember what is behind for Stage 4`. Recorded fresh-agent check in `6767b5d` (same tool and machine as the check above): at `suggests` the summary read `README: behind, released anyway`; at `manual` the step was skipped.
- Tropis has its own skeleton, the story of its name word for word, at `writes`, and its workflow tells plans not to patch the README. `guards/readme-usable.test.js` `keeps the title and the fixed text under What is Tropis` (this plan) reads that fixed text from `docs/readme/skeleton.md` and requires it under `## What is Tropis?`. `docs/readme/readme.yaml` is `level: writes`; no guard reads that field. The workflow row is `framework/workflow.md`, and the self-check plants it: `caught      operator-page-closeout: framework/workflow.md planted`.

### Scope

The stat above is every file except this plan. This handover commit adds `docs/superpowers/plans/2026-10-21-readme-rescue.md`, which is in the File Structure table. `feature-catalog.yaml` is in that table and was not edited. No other path is in the diff.

### Judgment calls

- The bootstrap sentences in the file are `Recommend `writes` when the project had no `README.md`` and `` `suggests` when it had one ``. The assertions use those, which fail when removed. `Do not refresh` also occurs later as `Do not refresh either way`; the test slices the level option, and removing only the first occurrence failed it. `### After updating: what to do by hand` also heads the 0.4.0 section; the test slices `## [Unreleased]`, and removing only the first occurrence failed it.
- `guards/readme-usable.test.js` is the closed branch's file byte for byte, including an unused `readdirSync` import. The self-check does not flag it.
- The Stage 8 notice and the On yes replacement are the plan's lines, rewrapped only where the plan said to rewrap (the skeleton comment). The release-notes sentence is its own paragraph under `### Keep your README current with /refresh-readme`.
- FW-026's sentences are the plan's. The first word after **Decision:** is capitalised, as the other entries in `framework/DECISIONS.md` are.
- No rule was added for FW-026. The plan lists no rule file and says the decision record is a record. An agent writing a new README fact-check would not have to open `framework/DECISIONS.md` first. The plan forbade the rule, so it was not written and the developer was not asked.
- Every commit on this branch carries `Co-authored-by: Cursor <cursoragent@cursor.com>`, appended by the executing tool. The commits were not amended.

### What the plan got wrong

- Decision 4's "recommends `writes` for a project with no `README.md`" is a paraphrase. The stage does not contain the word "for" in that sentence. Asserting the paraphrase would have failed, and `commands/bootstrap.md` is not in the File Structure table.
- The specifying session verified the quotations at `main` `d0ce75d`. Execution started at `32fad95`, which is that plan's own commit. The quoted command text, the plant line and the closed-branch guard matched.

### Outstanding

- The reviewing session merges. This session does not. The reviewer ships the catalog entry, and deletes `origin/plan/readme-fact-check` after merge.
- The squash onto `main` needs an explicit subject and body, so the `Co-authored-by` trailer on these commits does not land.
- `origin/main` is `22e8e0b`, one commit ahead of this branch's base `32fad95`: `feature-catalog.yaml` only (`backlog: idea — every living document is refreshed like the README`). This branch does not touch that file. Rebase before merge.
- No fresh-agent check of the second-ask wording in `/refresh-readme`, by the plan. A reader can verify it.

## Review record

Reviewer: the specifying session, Claude Code desktop (Opus 5.5), on the developer's MacBook Pro,
Darwin 25.2.0.

### Checks re-run

- At `d342d65`, alone: `bash scripts/check-blueprint.sh` → `Self-check passed: …`;
  `npm --prefix .tropis test` → `Tests: 28 passed, 28 total`. `guards/readme-usable.test.js`
  is byte-identical to the closed branch's, as Decision 1 required.
- **Fresh-agent checks for criteria 1 and 3** (Claude Code CLI 2.1.300, the developer's MacBook Pro,
  Darwin 25.2.0 arm64; `claude -p` limited to Read, Write, Edit, Glob, Grep and git, npm, cat,
  ls, test commands), in a scratch project set up from this branch with its **own**
  `docs/readme/skeleton.md` (sections "Greeter in one line" and "Start it"), an existing
  three-line `README.md`, a shipped `port-option` entry and `level: writes`:
  - Prompt: "This is a probe and its output will be discarded. Run /refresh-readme. When it asks
    me to approve the page, answer yes yourself, and finish as the command says. Then tell me
    which skeleton you used, what you committed, and what refreshedAt now holds." It used the
    project's skeleton, rebuilt the page to its two sections (naming `--port`), ran the
    project's checks (30 of 30), and committed one commit touching exactly `README.md` and
    `docs/readme/readme.yaml`, with `refreshedAt: "f286d4e…"` — quoted, the pre-commit `HEAD`.
    **Pass.**
  - Reset to the fixture, same prompt with "answer no yourself": it restored the page with
    `git restore README.md` and left the settings file alone; both files byte-identical to
    before (`shasum`), no commit. **Pass.** Scratch folder deleted.

### Found

The independent review at `d342d65` found the code sound and the entry not yet shippable:
criterion 1's commit-on-yes and restore-an-existing-page paths, and criterion 3's "refreshed
from that copy", had no test or recorded check — run above. Also: the take-version test did
not confirm the take replaced the default skeleton; Tropis's README check did not confirm the
fixed text is the story of the name or that Tropis is at `writes`; the entry's value still
said "its facts are checked"; FW-025 did not say its anticipated fact check was dropped.
**Fixed here by the reviewer** in `review: the README tests prove what they claim` and in the
shipping commit; the probes above re-checked the command's behaviour.

### Outstanding disposition

- After a failed re-check, a developer who edits the page yet again gets no third run of the
  checks; dropped as an entry — the commit hook and the project's own checks catch a red page
  on the next run, and it is not silent.
- `guards/readme-level.test.js` pins words in command files, not an agent's behaviour; accepted
  for criterion 4, which is about what the commands instruct, with `/update`'s handling of a
  required step covered by `guards/update.test.js`.
- The closed branch `origin/plan/readme-fact-check` is deleted after this merge.

### Learnings routed

- An entry ships on evidence per criterion, and a review should map them before the last plan
  merges, not after: already the catalog rule; nothing new to route.

### Merged because

Every criterion of `product-readme-is-kept-current` is backed by a test or a recorded
fresh-agent check, listed in the comment above the entry, and the self-check and project
checks pass.
