# The backlog speaks of epics, backlog items and effort points — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** everything a person or an agent reads about the backlog uses four new words:
the catalog is **the backlog**, an entry is a **backlog item**, an arc is an **epic**, and
the effort score is **effort points**. Files, fields, types, statuses and code identifiers
keep their names, so a project takes the release with no update step.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md`, §10 and *Goals* 6; the
acceptance criteria of the backlog item `backlog-speaks-in-epics-stories-and-points` in
`feature-catalog.yaml`. The spec's wording (user stories, story points) was narrowed by
the developer while this item was shaped; *Decision 1* is what binds. Build only this
item.

**One plan:** what becomes true is one sentence — the backlog's words are epic, backlog
item and effort points wherever they are read. The prose, the printed reports, the board,
their tests, the new guard and the decision all serve that one thing.

**What the specifying session verified on 2026-11-02, against `origin/main` at `e124d09`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64):**

- **The developer decided the words in conversation with the specifying session on
  2026-11-02.** Four renames: catalog → backlog, entry → backlog item, arc → epic,
  effort → effort points. Not renamed: the item types (`feature`, `improvement`, `bug`,
  `spike`, `chore`; no "user story", no "task"), "story points" (the developer: "those are
  not real story points"), value, band, verdict, bundle, the statuses, and the file
  `feature-catalog.yaml` (a rename to `backlog.yaml` was considered and dropped).
- **The size.** `git grep -ciP '\b(arcs?|catalogs?|effort|entr(y|ies)|story points?)\b'`
  over the files in *File Structure* counted 1,452 matches in 86 files on `e124d09`. Most
  matches of `entry`/`entries` in scripts and tests are code identifiers, which stay; many
  in prose mean something other than a backlog item (an entry file, an entry point, a
  verification-log entry, a decision-record entry), which also stay.
- **The catalog's fields** are `id`, `title`, `status`, `value`, `acceptanceCriteria`,
  `type`, `layer`, `after`, `blockedBy`, `modules`, `refs`, `shelved`, `supersededBy`.
  `docs/backlog-board/bands.yaml` rows have `band`, `value`, `valueWhy`, `effort`,
  `effortWhy`, `verdict`, `bundle`, `seen`. There is no `arc` field: an arc is the set of
  entries sharing a spec path in `refs` (`arcs()` in `scripts/next-work.js`).
- **`sprint.mjs` already says "story points"** in places, and `commands/sprint.md` says
  "20 story points is where it starts". These become effort points.
- **Headings with the old words** (only ones meaning a backlog item, an arc or the
  catalog): `framework/workflow.md` `## Delivering an entry`; `rules/catalogs.md`
  `## What does not become an entry`; `rules/planning.md`
  `## A plan states which entries it completes`; `commands/scope.md`
  `## Stage 4 — Feature catalog`; `commands/sprint.md` `## 4. New entries`. Other
  documents cite some of them in italics (for example `workflow.md` cites
  *What does not become an entry*). `## Step 5 — Draft the entry point` and
  `## 3. Write the entry before anything is run` (a verification-log entry) are not
  backlog words and stay.
- **`scripts/check-blueprint.sh` plants defects by deleting a line matched by its text**
  (`plant <guard> <file> "<text>"`). The planted texts today are `A plan does not patch
  it`, `## What is Tropis?`, `A pull request from a fork runs the pipeline once the
  maintainer approves the run.`, `"test-exclude": "^8.0.0"` and
  `.tropis/rules/incidents/tests.md#two-polling-cases-that-lost-to-a-busy-machine`. None
  contains an old word. Its `FRAMEWORK_GUARDS` list names the guards that check the
  framework repository itself; a guard calling `isBlueprintTree` must be listed there.
  `guards/contributing-page.test.js` is the pattern for such a guard.
- **The integrity guard** (`guards/framework-integrity.test.js`) fails on a backticked
  path under `docs/`, `scripts/` or `.claude/` that does not exist. This plan adds no path.
- **Two other plans in `building` touch files this one does**:
  `team-members-start-in-another-tool` and `team-members-and-reviewers-run-on-a-tier`
  (both edit `scripts/sprint.mjs`, `commands/sprint.md`, `templates/README.md` and more).
  The claim ran `scripts/plan-overlap.mjs --claim` on this plan; its header carries the
  `Merges after` the check wrote. Build in parallel; the reviewer merges after them and
  resolves the rebase.
- **Review records read** from this spec's earlier plans: a line in a framework document
  must not run past the file's width (two reviews rewrapped one); import a module under
  test as a namespace; the self-check reads committed content only.
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about backlog words, so a local fresh-agent probe in a scratch folder outside
  this repository is a real one.
- **No cloud agent and nothing billed beyond the developer's plan**, in the work or its
  checks.

**Model tier: Medium.** About a thousand small edits, each a judgement of whether a word
means a backlog item, an arc, the catalog or the effort score, inside rules given here.
No design; the new guard is given in full.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 7; do not open a pull request, write a review record
or merge.

**Requires:** an agent command-line tool that starts a fresh local session from a prompt, signed in to the developer's existing plan, for the fresh-agent check in Task 5 (record which, and its version).

**Merges after:** team-members-start-in-another-tool, team-members-and-reviewers-run-on-a-tier

Do not store a kick-off prompt on this plan.

---

## Delivers

backlog-speaks-in-epics-stories-and-points

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-epics -b plan/backlog-speaks-in-epics-stories-and-points origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.**
- **Do not lower, skip or delete a guard or a test.** Changing an expected string to the
  new word is not lowering it.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **No cloud session, cloud agent or API key**, in the work or its checks.
- **Lines in framework documents, rules and commands stay within the file's width** (90
  characters, as the text around them). Rewrap a paragraph a rename lengthens.
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. The words

| Old, where it means… | New |
|---|---|
| catalog, feature catalog (the list in `feature-catalog.yaml`) | the backlog |
| entry, catalog entry (one item in that list) | backlog item; "item" alone where the sentence already says backlog |
| arc (backlog items sharing a spec) | epic |
| effort, effort score (the 1-to-5 score in `bands.yaml`) | effort points |

- **Rename only these meanings.** "Entry" stays when it means an entry file, an entry
  point, a verification-log entry, a decision-record entry, a release-notes entry, a
  `.gitignore` entry, a list or map entry in code, or anything else that is not one item
  of the backlog. "Effort" stays in plain English ("worth the effort").
- **The ranking reads "value over effort points"** (or "value divided by effort points").
- **A file, field, type, status, command name, guard name or code identifier keeps its
  name**, also inside prose and inside backticks: `feature-catalog.yaml`,
  `templates/catalog.yaml`, `rules/catalogs.md`, `catalog-entries`, `effort`,
  `effortWhy`, `arcs()`, `isClosed(entry)`, CSS classes such as `.arc`. Where prose names
  the file, it may say "the backlog, `feature-catalog.yaml`," once per document, so the
  word and the file are tied.
- **Where it applies:**
  - Prose: every Markdown file under `commands/`, `framework/` (not `DECISIONS.md`:
    *Decision 4*), `rules/` (not `rules/incidents/`: records of what happened, written in
    the words of their day), `templates/`, and `bootstrap.md` and `CONTRIBUTING.md`; the
    comments of `templates/catalog.yaml` and `templates/backlog-bands.yaml` (the keys
    stay); command front-matter `description:` lines.
  - Printed text: every string a script under `scripts/` prints, writes into a file
    people read, or puts on the board; the visible text of
    `templates/backlog-board.html` (headings, labels, options, notes, the strings its
    script renders).
  - Tests: an expected string in `guards/*.test.js` or `templates/project-layout.test.js`
    that asserts printed text or prose this plan changes. Test names, fixture data,
    variable names and comments stay.
  - **Not:** code comments, JSDoc, identifiers, YAML keys, file names, `framework/
    DECISIONS.md` except the new decision, `rules/incidents/`, the root `README.md`
    (refreshed as a whole page by `/refresh-readme`), specs and plans other than the
    spec edit in *Decision 4*, and this repository's own `feature-catalog.yaml` and
    `docs/backlog-board/bands.yaml` text (data, not the framework's words) beyond Task 6.
- **Headings.** Rename the five headings listed under *What the specifying session
  verified* that carry a backlog word (for example `## Delivering a backlog item`,
  `## What does not become a backlog item`, `## A plan states which backlog items it
  completes`, `## Stage 4 — The backlog`, `## 4. New backlog items`). Then search the
  whole tree, outside `.claude/`, `.tropis/`, `rules/incidents/`, `docs/` and
  `framework/DECISIONS.md`, for each old heading's text and update every citation of it.

### 2. The board and the reports

- **The board** (`templates/backlog-board.html` and the text
  `scripts/build-backlog-board.mjs` prints or embeds): "Arcs in progress" → "Epics in
  progress"; the group-by option and filter label "Arc" → "Epic"; "No arc" / "no arc" →
  "No epic" / "no epic"; "Effort <n>" → "Effort points <n>"; "value <v> · effort <e>" →
  "value <v> · effort points <e>"; "entries" meaning backlog items → "backlog items" or
  "items"; "the catalog" → "the backlog". The data keys (`arc`, `effort`, `ew`, `sc`)
  stay.
- **The backlog report** (`scripts/next.mjs`, `scripts/next-work.js` printed strings):
  "Arcs under way" → "Epics under way", "continues an arc" → "continues an epic", "entry"
  meaning a backlog item → "backlog item" or "item".
- **The sprint** (`scripts/sprint.mjs`, `commands/sprint.md`): "story points" → "effort
  points"; "points" alone may stay where the sentence already says effort points.
- **Every other script** (for example `plan-overlap.mjs`, `take-version.mjs`,
  `check-conformance.sh`, `board-bands.js`, `dispatch.mjs` if it prints one): apply
  *Decision 1* to what it prints, nothing else.

### 3. The guard: `guards/backlog-words.test.js`

A framework-repository guard, modelled on `guards/contributing-page.test.js` (the same
`isBlueprintTree` and `FRAMEWORK_ROOT` handling, skipping where the tree is not the
framework repository).

- **Scanned:** every `*.md` under `commands/`, `framework/` except `DECISIONS.md`, and
  `rules/` except `rules/incidents/`; `templates/*.md`; `bootstrap.md`;
  `CONTRIBUTING.md`; the comment lines (those starting `#`, after leading spaces) of
  `templates/catalog.yaml` and `templates/backlog-bands.yaml`.
- **Before matching,** remove every backtick span (`` `…` ``) from the line, so file
  names, fields and identifiers are never matched.
- **Refused,** case-insensitively, on what remains: `\barcs?\b`, `\bstory points?\b`,
  and `catalogs?` as a whole word not touching a `-`, `.`, `/` or `_` on either side
  (`(?<![-./_\w])catalogs?(?![-./_\w])`).
- **On failure,** it lists every match as `<path>:<line>: "<word>" — say epic, backlog or
  effort points (Decision 1 of the backlog-words plan)`, one per line, and the test
  fails.
- **Its own cases**, in the same file, run the scan over a temporary tree (written with
  `mkdtempSync`, removed in `afterEach`): † a `commands/x.md` line `Pick an arc.` is
  refused; † a `framework/x.md` line `20 story points` is refused; † a `rules/x.md`
  line `Add it to the catalog.` is refused; a line ``Edit `feature-catalog.yaml` and
  `rules/catalogs.md`.`` passes; `rules/incidents/x.md` with `an arc` passes;
  `framework/DECISIONS.md` with `an arc` passes; a `templates/catalog.yaml` key line
  `arc: x` (not a comment) passes; † a comment line `# an arc` there is refused. And the real
  case: the scan of `FRAMEWORK_ROOT` finds nothing.
- **In `scripts/check-blueprint.sh`:** add `backlog-words` to `FRAMEWORK_GUARDS`, and a
  plant that appends a refused line to a copy and expects the guard to fail. The
  existing `plant` only deletes, so add beside it a small function in the style of
  `plant_add` that copies `$STAGE` to a temporary tree, appends `Pick an arc.` to
  `commands/next.md` there, runs the guard on it, and prints `caught      backlog-words:
  commands/next.md planted` or `NOT CAUGHT  backlog-words passed with an arc planted`
  (setting `framework=1`), and that first runs the guard on `$STAGE` and prints
  `FAILED      backlog-words fails on the framework repository` (setting `framework=1`)
  if that fails, as `plant` does.

### 4. The record

- **`framework/DECISIONS.md`:** append one decision at the end, under the next free
  `FW-` number on your branch (the reviewer renumbers it at merge if `main` took that
  number meanwhile). Verbatim apart from the number and rewrapping:

  ```
  ## FW-0NN: The backlog's words change; its files and fields keep their names

  **Date:** 2026-11-02 · **Status:** Accepted.

  **Decision:** Everything people and agents read says the backlog, backlog item, epic
  and effort points, where it said the catalog, entry, arc and effort. The file
  `feature-catalog.yaml`, the `effort` and `effortWhy` fields, the item types (feature,
  improvement, bug, spike, chore), the statuses and code identifiers keep their names,
  so a project takes the release with no update step. The guard `backlog-words` refuses
  the old words in the framework's prose.

  **Rejected:** "User story" for a backlog item (an item keeps its type: a bug or a spike
  is not a story). "Story points" (the effort score is not a story point estimate; the
  developer's call). Renaming fields or the file to `backlog.yaml` (an update step in
  every project for words nobody reads while planning).

  **Consequences:** Decisions before this one, incident records, specs and plans keep the
  words of their day. A project's own text is its own. Narrows §10 of the sprint design.
  Source: the backlog item `backlog-speaks-in-epics-stories-and-points`.
  ```

- **The spec,** `docs/superpowers/specs/2026-11-01-sprint-design.md`: at the end of §10,
  add one paragraph: `*Decided when shaped (2026-11-02):* the words are epic, backlog item
  and effort points; the item types keep their names, and no file or field is renamed
  (FW-0NN).` with the same number.

## Traps

- **Most matches are not renames.** Identifiers, keys, file names and other meanings of
  "entry" stay (*Decision 1*). A blind replace breaks scripts and guards.
- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green.
- **A renamed heading is cited elsewhere.** Update each citation (*Decision 1*,
  *Headings*), or a reader follows a name that no longer exists.
- **The guard's cases marked † must fail before the guard exists.** Task 1 commits them
  with an empty scan first.
- **This plan quotes old words and commands it is not declaring.** Its header has a
  `Merges after` field only if the claim wrote one; do not add or remove one. The plan
  file itself is not scanned by the guard (it is under `docs/`).
- **Another plan edits `scripts/sprint.mjs`, `commands/sprint.md` and
  `templates/README.md` in parallel.** Do not wait for it or rebase onto it; the reviewer
  resolves the conflict at merge.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `guards/backlog-words.test.js` | new, *Decision 3* |
| `scripts/check-blueprint.sh` | *Decision 3* |
| `framework/DECISIONS.md` | one decision appended, *Decision 4* |
| `docs/superpowers/specs/2026-11-01-sprint-design.md` | one paragraph, *Decision 4* |
| `commands/bootstrap.md` | *Decision 1* |
| `commands/capture-learning.md` | *Decision 1* |
| `commands/feature.md` | *Decision 1* |
| `commands/flush-upstream.md` | *Decision 1* |
| `commands/idea.md` | *Decision 1* |
| `commands/manual-check.md` | *Decision 1* |
| `commands/next.md` | *Decision 1* |
| `commands/refresh-board.md` | *Decision 1* |
| `commands/refresh-model-tiers.md` | *Decision 1* |
| `commands/refresh-readme.md` | *Decision 1* |
| `commands/release.md` | *Decision 1* |
| `commands/scope.md` | *Decision 1* |
| `commands/sprint.md` | *Decision 1* |
| `commands/update.md` | *Decision 1* |
| `framework/commit-format.md` | *Decision 1* |
| `framework/dispatch.md` | *Decision 1* |
| `framework/doc-architecture.md` | *Decision 1* |
| `framework/model-tiers.md` | *Decision 1* |
| `framework/rule-delivery.md` | *Decision 1* |
| `framework/workflow.md` | *Decision 1* |
| `rules/catalogs.md` | *Decision 1* |
| `rules/learnings.md` | *Decision 1* |
| `rules/planning.md` | *Decision 1* |
| `rules/harness-scripts.md` | *Decision 1* |
| `rules/tests.md` | *Decision 1* |
| `bootstrap.md` | *Decision 1* |
| `CONTRIBUTING.md` | *Decision 1* |
| `templates/AGENTS.md` | *Decisions 1 and 2* |
| `templates/README.md` | *Decisions 1 and 2* |
| `templates/backlog-bands.yaml` | *Decisions 1 and 2* |
| `templates/backlog-board.html` | *Decisions 1 and 2* |
| `templates/catalog.yaml` | *Decisions 1 and 2* |
| `templates/readme-skeleton.md` | *Decisions 1 and 2* |
| `templates/verification-log.md` | *Decisions 1 and 2* |
| `templates/project-layout.test.js` | *Decisions 1 and 2* |
| `templates/rule-areas.json` | *Decisions 1 and 2* |
| `scripts/board-bands.js` | printed text only, *Decisions 1 and 2* |
| `scripts/build-backlog-board.mjs` | printed text only, *Decisions 1 and 2* |
| `scripts/capture-at-merge.sh` | printed text only, *Decisions 1 and 2* |
| `scripts/check-conformance.sh` | printed text only, *Decisions 1 and 2* |
| `scripts/check-prerequisites.sh` | printed text only, *Decisions 1 and 2* |
| `scripts/dispatch.mjs` | printed text only, *Decisions 1 and 2* |
| `scripts/framework-commit-check.sh` | printed text only, *Decisions 1 and 2* |
| `scripts/installed-files.js` | printed text only, *Decisions 1 and 2* |
| `scripts/next-work.js` | printed text only, *Decisions 1 and 2* |
| `scripts/next.mjs` | printed text only, *Decisions 1 and 2* |
| `scripts/pipeline.mjs` | printed text only, *Decisions 1 and 2* |
| `scripts/plan-binding.js` | printed text only, *Decisions 1 and 2* |
| `scripts/plan-overlap.mjs` | printed text only, *Decisions 1 and 2* |
| `scripts/readme-freshness.js` | printed text only, *Decisions 1 and 2* |
| `scripts/rule-areas.js` | printed text only, *Decisions 1 and 2* |
| `scripts/rule-claims.js` | printed text only, *Decisions 1 and 2* |
| `scripts/set-up-project.sh` | printed text only, *Decisions 1 and 2* |
| `scripts/sprint.mjs` | printed text only, *Decisions 1 and 2* |
| `scripts/submit-upstream.sh` | printed text only, *Decisions 1 and 2* |
| `scripts/take-version.mjs` | printed text only, *Decisions 1 and 2* |
| `guards/absorb-flush.test.js` | expected strings only, *Decision 1* |
| `guards/backlog-board.test.js` | expected strings only, *Decision 1* |
| `guards/board-bands.test.js` | expected strings only, *Decision 1* |
| `guards/board-hooks.test.js` | expected strings only, *Decision 1* |
| `guards/catalog-drift.test.js` | expected strings only, *Decision 1* |
| `guards/catalog-entries.test.js` | expected strings only, *Decision 1* |
| `guards/check-prerequisites.test.js` | expected strings only, *Decision 1* |
| `guards/check-version.test.js` | expected strings only, *Decision 1* |
| `guards/dependency-overrides.test.js` | expected strings only, *Decision 1* |
| `guards/dispatch.test.js` | expected strings only, *Decision 1* |
| `guards/doc-currency.test.js` | expected strings only, *Decision 1* |
| `guards/entry-file.test.js` | expected strings only, *Decision 1* |
| `guards/flush-drained.test.js` | expected strings only, *Decision 1* |
| `guards/framework-checks-workflow.test.js` | expected strings only, *Decision 1* |
| `guards/next-report.test.js` | expected strings only, *Decision 1* |
| `guards/pipeline.test.js` | expected strings only, *Decision 1* |
| `guards/plan-dispatchable.test.js` | expected strings only, *Decision 1* |
| `guards/plan-overlap.test.js` | expected strings only, *Decision 1* |
| `guards/private-material.test.js` | expected strings only, *Decision 1* |
| `guards/readme-freshness.test.js` | expected strings only, *Decision 1* |
| `guards/readme-usable.test.js` | expected strings only, *Decision 1* |
| `guards/release.test.js` | expected strings only, *Decision 1* |
| `guards/rule-claims.test.js` | expected strings only, *Decision 1* |
| `guards/rule-delivery.test.js` | expected strings only, *Decision 1* |
| `guards/rule-incidents.test.js` | expected strings only, *Decision 1* |
| `guards/rule-trial.test.js` | expected strings only, *Decision 1* |
| `guards/rules-generated.test.js` | expected strings only, *Decision 1* |
| `guards/set-up-project.test.js` | expected strings only, *Decision 1* |
| `guards/sprint.test.js` | expected strings only, *Decision 1* |
| `guards/take-version.test.js` | expected strings only, *Decision 1* |
| `guards/temporary-clauses.test.js` | expected strings only, *Decision 1* |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to checks (Task 6) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 6) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-backlog-speaks-in-epics-stories-and-points.md` | the handover report |


Nothing else. A listed file may stay unchanged. If a guard demands a change to a file not
listed, stop and hand back with its output.

Doc closeout, decided by the specifying session: the decision record, the operator guide
(`templates/README.md`), the rules and the workflow are the documents this change owes,
all listed. The README is not patched (`/refresh-readme`). No upstream queue: this
repository is the upstream. A release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The guard, red

Write `guards/backlog-words.test.js` (*Decision 3*) with the scan returning no matches,
and the `check-blueprint.sh` change. Commit. Run the new file alone the way the
self-check's `run_guard` function runs a guard: on a `git archive` of `HEAD` extracted to
a temporary folder, with `templates/framework-jest.config.js` copied there as
`jest.config.js`, `FRAMEWORK_ROOT` and `TROPIS_EXPECT_FRAMEWORK=1` set, and the jest the
self-check installed (`.self-check/`, after Task 0's run). Say in the handover the exact
command you used. Expected: the four † cases fail and the
rest pass. Paste the failing test names. Then write the real scan and commit. Run it
again: now the four † cases pass and the real-tree case fails, listing the old words
still in the framework. Paste the count of lines it lists. (The self-check is red from
here until Task 2 ends; that is expected.)

### Task 2 — The prose

Apply *Decision 1* to the Markdown and YAML comments in *File Structure*, a folder at a
time, committing after each folder (`commands/`, `framework/`, `rules/`, `templates/`,
the two root files). Then the heading citations. Then run the guard alone; expected: all
cases pass. Paste its result line.

For the occurrences the guard cannot see — "entry" and "effort" — run
`git grep -nP '\b(entr(y|ies)|effort)\b' -- commands 'framework/*.md' ':!framework/DECISIONS.md' 'rules/*.md' templates bootstrap.md CONTRIBUTING.md`
and read every line it prints. Each remaining match must be a name kept by
*Decision 1* (a backticked field or file), or a meaning other than a backlog item or the
effort score. List in the handover, per file, how many matches remain and of which kind
(for example "workflow.md: 3, entry file / verification-log entry").

### Task 3 — The printed text

Apply *Decision 2* to the scripts in *File Structure*, then update the expected strings
in the tests. Commit. Run `bash scripts/check-blueprint.sh`; the last line must start
`Self-check passed`. Paste it.

Then show the board and the report changed: build the board for this repository with
`node scripts/build-backlog-board.mjs` and run `node scripts/next.mjs`. Both import the
`yaml` package, which the source tree does not resolve: for the two runs, create a
symlink `ln -s .tropis/node_modules node_modules` at the worktree root, and remove it
afterwards (`rm node_modules`); never commit it. Paste: the lines of `next.mjs`
output containing `Epics under way` (or, if no epic is under way, say so), and
`grep -c "Epics in progress" docs/backlog-board/index.html` (expected `1` or more), and
`grep -ciE "Arcs in progress|No arc" docs/backlog-board/index.html` (expected `0`). Do
not commit `docs/backlog-board/index.html` from this run unless the board's hook staged
it at a commit.

### Task 4 — Show the guard and the tests can fail

Each a throwaway commit followed by the named check, then `git reset --hard HEAD~1`:

1. Put back `Arcs under way` in `scripts/next.mjs`. Expected red: a case in
   `guards/next-report.test.js` (run alone, as in Task 1).
2. Put back `story points` in `commands/sprint.md`. Expected red: the real-tree case of
   `guards/backlog-words.test.js`.
3. Put back `Arcs in progress` in `templates/backlog-board.html`. Expected red: a case in
   `guards/backlog-board.test.js`. If no case asserts the board's epic heading, add one
   that does (`Epics in progress` present, `Arcs in progress` absent), commit it, and
   repeat this step.

Paste the failing test names of each. If one stays green, fix the test, commit, and
repeat.

### Task 5 — Fresh-agent check

The rules and commands now call the list the backlog and its items backlog items, and
the score effort points, while the file and fields keep their names. The risk is an agent
taking the words for the names: creating `backlog.yaml`, or writing `effortPoints:`.
A fresh agent with only a project set up from this branch must be seen to add and band an
item under the real names. Run it with its tool calls visible (in Claude Code,
`claude -p --output-format stream-json --verbose`, allowed to run shell commands and edit
files), with the scratch project as its working directory, on this machine only, signed
in to the developer's plan and with `ANTHROPIC_API_KEY` unset.

1. Set up: `mkdir -p "$TMPDIR/words-agent/kiln-yard" && git -C "$TMPDIR/words-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/words-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/words-agent/kiln-yard/.tropis" ci`. Give the project a
   local git identity and commit everything.
2. Prompt, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, add a backlog item: the kiln log
   shows the last firing's peak temperature. Then band it B with value 3 and 2 effort
   points, and tell me which epic it belongs to. Do not commit."*
   (Where the tool does not run slash commands, the prompt is enough: the project's
   commands are files it can read.) Check, and paste: the item was written to
   `feature-catalog.yaml` (`git -C <scratch project> diff --stat`), no `backlog.yaml` was
   created, the band row in `docs/backlog-board/bands.yaml` has `effort: 2` and no key
   named other than the template's, and the agent's reply uses "backlog item" or "epic"
   and does not say "arc".

If the agent misses a step, the wording is not clear enough: change it, commit, and run
the probe again. If it fails twice, stop and hand back with both transcripts' relevant
calls. Record the tool, its version, the model, the operating system and the
architecture; these go in the commit body of the final commit (a no-change commit with
`--allow-empty` is fine) and in the handover, with one sentence on what the agent was
asked and whether it did it. Delete the scratch folder afterwards.

### Task 6 — The backlog and the board

1. In `feature-catalog.yaml`, on `backlog-speaks-in-epics-stories-and-points`: set
   `status: shipped` (it reads `building`; if it reads anything else, set `shipped`
   anyway and say so under *Judgment calls*). Set `modules` to
   `guards/backlog-words.test.js`, `templates/backlog-board.html` and `scripts/next.mjs`.
   Leave `refs` and `after` as they are. Add, directly above the item's `- id:` line, a
   comment `# Shipped by docs/superpowers/plans/2026-11-02-backlog-speaks-in-epics-stories-and-points.md.`
   and lines mapping each acceptance criterion to the test cases or the Task 3/5 checks
   that cover it, as the comment above `merges-take-turns-under-one-token` does. Do not
   put `: ` (colon and space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole
   `backlog-speaks-in-epics-stories-and-points:` block (the key and its indented lines,
   through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 7 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Read your own diff for private material (names, home paths, hostnames) and say so.
3. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls (including every "entry" or "effort" you left and why, as Task 2 lists them),
   What the plan got wrong, Outstanding. Say in Outstanding that the board is a page
   people look at, so the reviewer decides whether the developer checks it by hand.
   Commit.
4. Push the branch (`git push -u origin plan/backlog-speaks-in-epics-stories-and-points`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.
