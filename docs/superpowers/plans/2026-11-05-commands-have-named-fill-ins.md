# A command's fill-ins are carried by name when a project takes a new release — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the six commands that hold a project-owned block today hold named fill-ins
instead, and `take-version.mjs` carries each fill-in by name: it lists a fill-in that is
new, renamed, re-purposed or gone, prints the text of one that is gone, moves a
project's old single block into the named fill-ins once, and writes `.new` only for a
change outside the fill-ins. `check-version.mjs` lists the same fill-in lines.

**Backlog item:** `commands-have-named-fill-ins` in `feature-catalog.yaml`. Spec:
`docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`; the
evidence and the prototype are in `docs/superpowers/specs/2026-11-04-command-slots-finding.md`
(read *The answer*, *The proposed procedure and fill-ins, per command*, *The prototype*
and *Recommendations* before starting).

**One plan:** what becomes true in one sentence — a project's command fill-ins are
carried by name through every take of a release.

**Model tier: Large.** The parsing and carrying rules are specified below, but placing
the six commands' fill-ins, rewriting the tests that assume one unnamed block, and
building world tests on the real `/release` need judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 7; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed.** No file under `framework/` other than the decision
record, and none under `rules/`, changes. The command edits change where a project's
values sit, not what an agent is told to do with them: `/release` already tells the agent
to ask the developer for a missing value, and still does. The commit body says so
(`workflow.md`, *Branching*: a command edit needs a commit body).

**What the specifying session verified on 2026-11-05, against `origin/main` at `770a494`
(git 2.43.0, node v22, Linux x86_64):**

- **The block.** `scripts/installed-files.js` finds a block by a line containing
  `project-owned: begin` and the next line containing `project-owned: end` (`scan()`;
  the marker string is assembled at runtime so the file itself holds no block).
  `fingerprint()` hashes the text with the inner lines of each complete block removed
  and the marker lines kept. `blocks()` returns each block's inner lines.
  `carryBlocks(projectText, nextText)` puts the project's blocks into the new text by
  position and returns `{ text, mismatch: true }` unchanged when the counts differ.
- **The take.** `scripts/take-version.mjs`, `apply()`: for a file in the baseline and
  the release, when the project's fingerprint equals the baseline, it calls
  `carryBlocks`; on a mismatch where the project has blocks it writes `<path>.new` and
  pushes the path on `blockMismatch` (reported as `project-owned blocks differ in
  number`); otherwise it writes the carried text. When the fingerprint differs and the
  release changed the file, it writes `.new` with the carried text, or lists it as
  already new. The report is assembled near the end of `takeVersion()` (`list('Replaced', …)`
  through `Next:`); `apply()` returns `blockMismatch` in its result.
- **The version check.** `scripts/check-version.mjs` runs the take in a scratch clone
  and reads its result; `settingsThatDoNotFit()` turns each `result.blockMismatch` path
  into `project-owned blocks differ in number; carry your fill-ins into <rel>.new by hand`.
- **The commands with a block**, each one unnamed block today: `commands/feature.md`
  (begin `— what else this project requires before an item ships.`), `commands/idea.md`
  (`— how this project checks and commits a new backlog item.`), `commands/next.md`
  (`— the command that prints this project's backlog report.`),
  `commands/manual-check.md` (`— this project's kinds of check.`),
  `commands/refresh-board.md` (`— a project's own step for publishing the page, if it
  has one.`) and `commands/release.md` (`— this project's release.`, whose body is one
  HTML comment listing nine `- <Label>: …` lines and two closing sentences that read
  the old names Trigger and Candidate trigger as Promote trigger and Staging trigger).
  No other file under `commands/` has a block.
- **Other blocks** are in shipped scripts with `//` or `#` markers
  (`guards/rule-claims.test.js`, `scripts/framework-commit-check.sh`); `check-drift.sh`
  reads only those. They stay unnamed and unchanged.
- **Tests that assume one unnamed block per command:** `guards/release.test.js`
  (*names the fill-in lines, and reads the old trigger names as the new*: one
  `project-owned: begin` in `release.md`, and the sentence about Trigger),
  `guards/take-version.test.js` (*carries a filled project-owned block into the new
  text* and *writes the new text unchanged when the block counts differ*, both on
  `release.md`, both using `fillBlock`, which fills the first block), and
  `guards/check-version.test.js` (*names a command whose project-owned blocks differ in
  number*, which adds a second unnamed block to the release's `release.md`).
  `guards/set-up-project.test.js` (*ships project-owned blocks only where a project
  fills something in*) lists the shipped files with blocks; that list does not change.
- **The operator guide**, `templates/README.md`, says in its paragraph on taking a
  release what a `<path>.new` means; it says nothing about blocks.
- **The last decision** in `framework/DECISIONS.md` is FW-070.

**Decided by the specifying session:**

- **A fill-in is a project-owned block with a name.** Its begin marker carries a name,
  any former names, and its purpose:
  `<!-- project-owned: begin <name>[ (was <old>[, <old>…])] — <purpose> -->`, one line,
  closed on that line. The end marker is unchanged. So `fingerprint()`, `blocks()`,
  `check-drift.sh` and every guard that finds blocks keep working, and the purpose is
  part of the fingerprint: a project cannot change it without forking the command.
  Rejected: the prototype's separate `<!-- slot … -->` syntax (a second marker every
  tool would have to learn, for no gain).
- **Carry by name, and report only what needs reading.** A fill-in carried under its own
  name with an unchanged purpose is not listed.
- **The shipped text of a fill-in the project has is never taken**, as today: the
  project's body is carried even when it is still an earlier release's default. Known
  and accepted; the take keeps no copy of earlier shipped texts to compare with.
- **The two transitional fill-ins** (`/feature`'s `before-ship-commit`, `/idea`'s
  `before-commit`) are not built: they served only generated documents that FW-043
  retires (finding, *The two transitional fill-ins*).
- **`/release`'s fill-ins are the finding's list**: values `run-from`, `notes-file`,
  `readers`, `breaking`, `version-files`, `first-release`, `promote-trigger (was
  trigger, release-trigger)`, `staging-trigger (was candidate-trigger)`,
  `staging-workflow`, `runs-url (was where-the-run-is-watched)`; behaviour
  `before-preflight`, `breaking-notes`, `notes-also`, `published`. The `was` names make
  the old labels of today's block place themselves when a project's block is moved.
- **A decision record**, FW-071, because the format chose between real alternatives.

---

## Delivers

commands-have-named-fill-ins

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-fill-ins -b plan/commands-have-named-fill-ins origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test** other than the
  assertions this plan says to change.
- **Every commit has a body** saying what becomes true. The commit that changes
  `commands/` says no fresh-agent check is owed and why (above).
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names.** The finding's
  appendix is a throwaway prototype in this repository; you may read it for the idea.
  Say in the handover which named source, if any, you worked from.

## The change

### 1. `scripts/installed-files.js`

Keep `scan()`, `fingerprint()`, `blocks()` and `carryBlocks()` as they are. Add, and
export:

- **`fillIns(text)`** → the named fill-ins in order, each
  `{ name, was: string[], purpose, body: string[] }`. A begin marker line is named when
  it matches (assemble the marker at runtime, as the file already does)
  `/project-owned: begin ([a-z][a-z0-9-]*)(?: \(was ([a-z0-9, -]+)\))? — (.*?) -->\s*$/`;
  `was` is group 2 split on commas and trimmed; `purpose` is group 3 trimmed. Any other
  complete block is unnamed. An unclosed begin is ordinary text, as in `scan()`.
- **`carryFillIns(projectText, nextText)`** → `{ text, mismatch, notes }`.
  - **When `nextText` has no named fill-in**, return `{ ...carryBlocks(projectText,
    nextText), notes: [] }`: unchanged behaviour.
  - **Otherwise**, build the result from `nextText`, replacing the inner lines of each of
    its blocks:
    1. **Named fill-in of the new text**, in order. Its source is the project's named
       fill-in with the same name, else the first of its `was` names the project has.
       - Found: its body is the project's body. Add a note `renamed` (`from`, `name`)
         when the source was a `was` name. Add a note `purpose` (`name`, `was`: the
         project's purpose, `now`: the new purpose) when the two purposes differ after
         collapsing runs of whitespace.
       - Not found and filled by the move below: the moved lines.
       - Otherwise: the new text's own body stays, with a note `new` (`name`, `purpose`).
    2. **Unnamed blocks of the new text** take the project's unnamed blocks by position
       when the counts are equal. When the new text has at least one unnamed block and
       the counts differ, return `{ text: nextText, mismatch: true, notes: [] }`.
    3. **The move.** When the project has no named fill-in, at least one unnamed block,
       and the new text has no unnamed block, the project's unnamed blocks are moved,
       before step 1 decides `new`:
       - If the project has exactly one unnamed block and the new text exactly one named
         fill-in, the whole body moves into it: note `moved` (`from: 'the block'`, `name`).
       - Otherwise each unnamed block's inner lines are read as items. A line whose
         trimmed text starts with `<!--` begins a comment that runs to the first line
         containing `-->`, inclusive: comment lines are dropped, never placed or listed
         (they are the shipped help). A line matching `/^- ([^:]+):(\s|$)/` starts an
         item labelled with group 1, trimmed; the item runs to the next item start or
         comment, without trailing blank lines. Non-blank lines before the first item
         are one unlabelled chunk. An item's slug is its label lowercased, each run of
         characters other than `a-z0-9` replaced by `-`, leading and trailing `-`
         removed. It is placed in the new text's named fill-in whose name, or one of
         whose `was` names, equals the slug and which has not already been given lines:
         note `moved` (`from`: the label, `name`). An item that finds none, and an
         unlabelled chunk, gets a note `unplaced` (`lines`).
    4. **Gone.** Each project named fill-in that no new fill-in took, whose body has a
       non-blank line, gets a note `removed` (`name`, `purpose`, `lines`). And when the
       project has named fill-ins, each of its unnamed blocks with a non-blank line gets
       a note `unplaced` (`lines`).
  - `mismatch` is false in this branch except as step 2 says.

### 2. `scripts/take-version.mjs`

- Use `carryFillIns` where `apply()` calls `carryBlocks` (both branches), with the same
  conditions on `mismatch` as today. Collect each note with its path into a `fillIns`
  array (`{ rel, ...note }`) and return it in the result beside `blockMismatch`. In the
  branch that writes `.new`, the note's `rel` is `<rel>.new`.
- Export `fillInLines(fillIns)` → the report lines, one string each, in this exact form:
  - renamed: `` `<rel>: <name> was <from>; your text was carried` ``
  - purpose: `` `<rel>: <name> now asks for: <now> (was: <was>). Check that your text still answers it.` ``
  - new: `` `<rel>: <name> is new and holds the shipped text — <purpose>` ``
  - moved: `` `<rel>: <from> moved into <name>` `` (with `from` the label in double
    quotes, or the words `the block`)
  - removed: `` `<rel>: <name> is no longer a fill-in; your text is not in the new version:` ``
    then each of its lines prefixed with four spaces
  - unplaced: `` `<rel>: not placed in any fill-in; your text is not in the new version:` ``
    then each of its lines prefixed with four spaces
- In the report, add `list('Fill-ins', fillInLines(fillIns))` after the `Moved` list and
  before `Needs a decision`. When any note is `purpose`, `removed` or `unplaced`, add to
  `Next:`, before `Commit.`, the line
  `  Read Fill-ins: put back any text it printed where it belongs, and check each fill-in whose purpose changed.`
- Update the file's doc comment: a fill-in is carried by name, and a block of an earlier
  release is moved into the named fill-ins.

### 3. `scripts/check-version.mjs`

Import `fillInLines` and list each of its lines for `result.fillIns` where it lists the
`blockMismatch` lines (`settingsThatDoNotFit()`), so the check prints exactly what the
take will. Keep the `blockMismatch` line as it is.

### 4. The six commands

Replace each unnamed begin marker with a named one at the same place, keeping the body
unless stated:

| Command | Begin marker |
|---|---|
| `commands/next.md` | `<!-- project-owned: begin report-command — the command that prints this project's backlog report. -->` |
| `commands/idea.md` | `<!-- project-owned: begin checks — how this project checks and commits a new backlog item. -->` |
| `commands/feature.md` | `<!-- project-owned: begin ship-requires — what else this project requires before an item ships. -->` |
| `commands/manual-check.md` | `<!-- project-owned: begin kinds — this project's kinds of check: what each is, what in a change triggers it, and where its procedure lives. -->` |
| `commands/refresh-board.md` | `<!-- project-owned: begin publish — a project's own step for publishing the page, if it has one. -->` |

**`commands/release.md`.** Replace the whole block (its begin marker through its end
marker) with one paragraph and ten value fill-ins:

```
Each fill-in below holds one value this command reads, and the command calls it by
that name: *the notes file*, *the promote trigger*. A fill-in that holds only its
example comment is empty: where this command needs it, ask the developer, and suggest
filling it in here. The fill-ins further down add what this project does at that point;
an empty one adds nothing.

<!-- project-owned: begin run-from — where /release runs, and what else lives there. -->
- Run from: the root of this repository, where the backlog also lives.
<!-- project-owned: end -->
<!-- project-owned: begin notes-file — the notes file, with an `## [Unreleased]` section /release promotes. -->
- Notes file: RELEASES.md at the root (from templates/RELEASES.md).
<!-- project-owned: end -->
<!-- project-owned: begin readers — who the notes are for, in their words. -->
<!-- e.g. - Readers: administrators and the people who use the product. -->
<!-- project-owned: end -->
<!-- project-owned: begin breaking — what forces a major version beyond a breaking commit. -->
<!-- e.g. - Breaking: a change to the permissions or network access the product asks for, which its users must approve again. -->
<!-- project-owned: end -->
<!-- project-owned: begin version-files — each file that carries the version, and where in it. -->
<!-- e.g. - Version files: package.json's version field. -->
<!-- project-owned: end -->
<!-- project-owned: begin first-release — the version a first release takes. -->
<!-- e.g. - First release: 1.0.0 -->
<!-- project-owned: end -->
<!-- project-owned: begin promote-trigger (was trigger, release-trigger) — the command that starts the project's promote pipeline, with <commit> and, where the project deploys to staging, <staged>. -->
<!-- e.g. - Promote trigger: gh workflow run promote.yml --ref main -f commit=<commit> -f staged=<staged> -->
<!-- project-owned: end -->
<!-- project-owned: begin staging-trigger (was candidate-trigger) — where the project deploys to staging, the command that starts it, with <commit>. -->
<!-- e.g. - Staging trigger: gh workflow run staging.yml --ref main -f commit=<commit> -->
<!-- project-owned: end -->
<!-- project-owned: begin staging-workflow — the file name of the staging workflow. -->
<!-- e.g. - Staging workflow: staging.yml -->
<!-- project-owned: end -->
<!-- project-owned: begin runs-url (was where-the-run-is-watched) — the address where the pipeline's runs are watched. -->
<!-- e.g. - Where the run is watched: https://github.com/<owner>/<repo>/actions -->
<!-- project-owned: end -->
```

Then four behaviour fill-ins, each with an empty body (begin marker, end marker, nothing
between):

| Name and purpose | Where |
|---|---|
| `before-preflight — what this project does before the pre-flight.` | directly under `## Stage 1 — Pre-flight`, before its code block |
| `breaking-notes — what the by-hand section says for this project's readers when a release is breaking for them.` | Stage 3, directly after item 2 of *Then write it in this shape* (after "nothing below shortens them.") |
| `notes-also — anything else this project's notes carry.` | the end of Stage 3, directly before `## Stage 4 — Confirm` |
| `published — what this project's promote pipeline publishes besides the notes.` | Step 2, directly after the paragraph that says what the promote pipeline does |

Stage 4 already asks the developer for the first version where there is no previous
release; add "unless the first-release fill-in names it" to that sentence. Change no
other wording of `/release`; references such as *the notes file* and *the staging
workflow* already match the fill-in names.

### 5. `commands/update.md`

In Stage 6, after step 2 (*Each `.new` file*), add a step, renumbering the rest: **The
fill-ins.** For each line of the report's *Fill-ins* list that printed text, show it and
propose where it belongs — a fill-in of the command, or nowhere, when the new version
does it already — and apply it on yes. For each fill-in whose purpose changed, show the
two purposes and the project's text, and ask whether the text still answers it. A
fill-in listed as new holds the shipped text: say so, and leave it.

### 6. `templates/README.md`

In the paragraph on taking a release, after the sentence about a `<path>.new` file, add:
"A command's fill-ins are carried by name, and the report's *Fill-ins* list names any
that is new, renamed, asks for something different or is gone, with the text of one
that is gone."

### 7. `framework/DECISIONS.md`

Append FW-071, *A command's fill-ins are named blocks carried by name*, in the shape of
FW-070: Date 2026-11-05, Status Accepted, built by `commands-have-named-fill-ins`.
Decision: the format and the carrying rules above, in prose. Evidence: the finding
(23 of 40 real changes held by fill-ins; today's take carried a renamed field silently
and wrote `.new` on a count change). Rejected: the prototype's separate slot syntax;
taking a new default into a fill-in the project never changed (no earlier text is kept
to compare with); the two transitional fill-ins. Consequences: the take reports fill-in
changes; a command edited outside its fill-ins still forks it with `.new`; a fill-in's
purpose is an interface, changed only when its meaning changes.

## Tests

Write each as a case in the file named. Mark the cases the change makes pass with `†`
in your handover.

**`guards/installed-files.test.js`**, a `describe('carryFillIns')` with small texts:

1. † Fill-ins are carried by name when the new text reorders them; no notes.
2. † A `was` name carries the body and notes `renamed`.
3. † A changed purpose notes `purpose` with both purposes; whitespace-only differences
   note nothing.
4. † A fill-in the project lacks keeps the new text's body and notes `new`.
5. † A project fill-in the new text drops notes `removed` with its lines; one with only
   blank lines notes nothing.
6. † One unnamed block and one named fill-in: the whole body moves (`moved`, `the
   block`).
7. † An unnamed block of `- Label:` items, with a shipped help comment, moves each item
   by name or `was` name, drops the comment lines, and notes an unknown label and lines
   before the first item as `unplaced`.
8. † A new text with no named fill-in behaves as `carryBlocks`, including `mismatch`.
9. `fillIns()` reads name, `was` and purpose, and ignores an unnamed block.

**`guards/take-version.test.js`**, world cases on the shipped `release.md`:

10. † Carried by name: the project fills `readers` and `promote-trigger`; the release
    adds a `## Stage` heading; the take writes no `.new`, the command holds both
    fill-ins' text and the new heading, and the report has a *Fill-ins* list only for
    what step 10's release changed (none if it changed only the heading).
11. † Renamed, re-purposed and removed: the release renames one filled fill-in (with
    `was`), changes the purpose of another, and drops a third. No `.new`; the report has
    the `renamed`, `purpose` and `removed` lines, the removed one's text, and the `Read
    Fill-ins` line under `Next:`.
12. † The move: the project's `release.md` is set back to the single block of today
    (write the old block text into the test as a fixture string, filled with
    `- Run from:`, `- Trigger:`, `- Candidate trigger:` and `- Rule trial:` lines) in a
    release `v0.2.0` built that way; taking `v0.2.1` from the source places the first
    three by name (`run-from`, `promote-trigger`, `staging-trigger`), and prints
    `- Rule trial:` under `not placed`.
13. Change the two existing release cases: *carries a filled project-owned block* fills
    a named fill-in (`fillBlock` fills the first block, which is now `run-from`; keep it
    or name the fill-in); *block counts differ* becomes a project adding its own unnamed
    block outside the fill-ins: a fork, so `.new` holds the new version with the
    project's fill-ins carried, and no `project-owned blocks differ in number` line.

**`guards/check-version.test.js`:**

14. † A release that renames a filled fill-in: the check's output contains the
    `renamed` line. Leave *names a command whose project-owned blocks differ in number*
    as it is; it must still pass (the release's `release.md` gains an unnamed block
    beside the named ones, which is step 2's mismatch).

**`guards/release.test.js`:**

15. Replace *names the fill-in lines, and reads the old trigger names as the new* with:
    `release.md` has the fourteen named fill-ins of *The change* §4, `promote-trigger`
    with `was trigger, release-trigger`, `staging-trigger` with `was candidate-trigger`,
    and no unnamed block.

**`guards/set-up-project.test.js`:**

16. † In a newly set-up project, every project-owned block in `.claude/commands/*.md` is
    a named fill-in with a non-empty purpose, no two in one command share a name, and
    only the six commands have any.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run the guard file you changed that way; say the exact command in the
  handover. The take and version guards are slow (each case sets up a world).
- **`installed-files.js` must hold no literal marker.** Its own begin/end text would be
  read as a block, and the file is shipped. Build every marker and the named-marker
  regex from the runtime `marker()` helper.
- **The `was` names in `/release` exist for the move.** `runs-url (was
  where-the-run-is-watched)` looks odd; it is how the label *Where the run is watched*
  finds its fill-in. Do not drop it.
- **A world's v0.2.0 is this checkout's source.** Case 12 needs a release whose
  `release.md` still has the old single block: build it by editing the v0.2.0 source in
  the world (the `v020` option of `world()` or an edit before the first release), not by
  checking out an old tag.
- **`check-drift.sh` and the script blocks are out of scope.** They stay unnamed.
- **FW-071 names only paths that exist.** `framework-integrity` fails the self-check on a
  backticked path under `docs/`, `scripts/` or `.claude/` in a framework document that
  does not exist; cite the plan and the finding by paths that exist on the branch.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/installed-files.js` | `fillIns`, `carryFillIns` |
| `scripts/take-version.mjs` | carries by name; `fillInLines`; the *Fill-ins* list; doc comment |
| `scripts/check-version.mjs` | lists the fill-in lines |
| `commands/next.md` | named fill-in |
| `commands/idea.md` | named fill-in |
| `commands/feature.md` | named fill-in |
| `commands/manual-check.md` | named fill-in |
| `commands/refresh-board.md` | named fill-in |
| `commands/release.md` | fourteen named fill-ins; the Stage 4 sentence |
| `commands/update.md` | Stage 6, the fill-ins step |
| `templates/README.md` | one sentence |
| `framework/DECISIONS.md` | FW-071 |
| `guards/installed-files.test.js` | cases 1–9 |
| `guards/take-version.test.js` | cases 10–13 |
| `guards/check-version.test.js` | case 14 |
| `guards/release.test.js` | case 15 |
| `guards/set-up-project.test.js` | case 16 |
| `feature-catalog.yaml` | the item to `shipped` (Task 6) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 6) |
| `docs/superpowers/plans/2026-11-05-commands-have-named-fill-ins.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide gains one sentence;
`/update` gains the step that reads the new list; FW-071 records the choice. No rule
changes: `rules/harness-scripts.md`'s *Change a shared script only inside its
project-owned regions* still holds, since command blocks are still `project-owned`
blocks. No upstream queue: this repository is the upstream. A release-note line is the
developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — `carryFillIns`, test first

Write cases 1–9. Run `guards/installed-files.test.js` alone after a commit: the † cases
fail (the functions do not exist). Implement *The change* §1. Commit. Run it again: all
pass. Paste both `Tests:` lines.

### Task 2 — The commands

Make §4. Write cases 15 and 16. Commit. Run `release.test.js` and
`set-up-project.test.js` alone: all pass. Paste the `Tests:` lines.

### Task 3 — The take and the check, test first

Write cases 10–14. Commit. Run `take-version.test.js` and `check-version.test.js` alone:
the † cases fail. Paste the failing names. Make §2 and §3. Commit. Run both again: all
pass. Paste the `Tests:` lines.

### Task 4 — `/update`, the operator guide, the decision

Make §5, §6 and §7. Commit.

### Task 5 — The red check

Revert `apply()`'s call back to `carryBlocks` in a throwaway commit, run
`take-version.test.js` alone, paste the failing names (cases 10–12 must be among them),
and drop the commit (`git reset --hard HEAD~1`).

### Task 6 — The backlog and the board

1. In `feature-catalog.yaml`, on `commands-have-named-fill-ins`: set `status: shipped`
   (if it does not read `building`, set `shipped` anyway and say so); set `modules` to
   `scripts/installed-files.js`, `scripts/take-version.mjs`, `scripts/check-version.mjs`
   and `commands/release.md`. Above the item, add
   `# Shipped by docs/superpowers/plans/2026-11-05-commands-have-named-fill-ins.md.`
   and one comment line per criterion naming the case that covers it.
2. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 7 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/commands-have-named-fill-ins`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.
