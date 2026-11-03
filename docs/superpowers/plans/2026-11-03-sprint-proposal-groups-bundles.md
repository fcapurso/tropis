# The sprint proposal shows one entry per team member — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `sprint.mjs propose` prints the proposal as the team that will run it: one
numbered entry per team member, a bundle as one entry with its backlog items and their
points beneath it, and the first line says how many team members that is; `/sprint`
step 1 tells the session to show it that way.

**Backlog item:** `sprint-proposal-groups-bundles` in `feature-catalog.yaml`.

**One plan:** what becomes true is one sentence — the developer agreeing a sprint sees one
entry per team member.

**What the specifying session verified on 2026-11-03, against `origin/main` at `ea5093d`
(git 2.43.0, node v22.23.4, Claude Code cloud session, Linux x86_64):**

- **The proposal is a flat list.** `scripts/sprint.mjs`, function `propose` (around line
  709), prints a header line and then one line per backlog item:
  `` `  ${i + 1}. ${e.id} — ${e.points} pts, band ${e.band}${e.bundle ? `, bundle ${e.bundle}` : ''} — ${e.title}` ``,
  then an optional `Sprint: next in line, over the budget — <id> (<n> pts).` line.
  A bundle shows only as a trailing `, bundle <name>` label on each of its lines.
- **`proposeSprint`** (around line 329, exported) returns `entries` in sprint order, each
  `{ id, points, band, bundle?, title }`. It brings a bundle whole, at its first member's
  place, but its later pass moves an entry to directly after the last entry it names in
  `after` or `blockedBy`, so a bundle's members can end up apart in `entries`.
- **How a sprint starts team members:** `commands/sprint.md` step 2 says one team member
  per backlog item, or per bundle (one brief, for the bundle's first backlog item, naming
  the others). So one entry of the proposal is one team member.
- **Step 1 of `commands/sprint.md`** says only "Show the proposal and say how team members
  will start (below)." Nothing tells the session to group it, and in the sprint that
  found this the developer was twice shown a flat table and had to ask for it grouped.
- **The tests:** `guards/sprint.test.js`, `describe('propose', …)` (around line 182). Two
  cases assert the full output and one asserts the bundle line
  `'  2. k1 — 5 pts, band A, bundle kiln — Title k1'`; the bundle case's `ids` helper
  reads the id as the fourth space-separated word of each numbered line.

**Decided by the specifying session:**

- **`proposeSprint` does not change.** The grouping is how `propose` prints its result.
- **A bundle's entry sits at its first member's place in `entries`**, and lists its
  members beneath it in the order they appear in `entries`, even where another entry
  falls between them there. The team member delivers them in that order.
- **The exact lines** (`—` is U+2014, as today):
  - Header: `Sprint: proposed <total> of <budget> effort points for <n> team members, from main at <sha>.`
    — `team member` when `<n>` is 1.
  - A backlog item outside a bundle, unchanged:
    `  <k>. <id> — <points> pts, band <band> — <title>`
  - A bundle: `  <k>. bundle <name> — <sum of its members' points> pts, <m> backlog items`
    and then, for each member, `       <id> — <points> pts, band <band> — <title>`
    (seven spaces, no number).
  - The `next in line` line and the `nothing to propose` line are unchanged.
- **`commands/sprint.md` step 1**: replace `Show the proposal and say` with
  `Show the proposal as \`propose\` prints it, one entry per team member with a bundle's
  backlog items beneath it, and say` (the sentence otherwise unchanged).

**Model tier: Small.** The target output and the document sentence are given verbatim.

**Merge authority: parent review.** The specifying session reviews, runs the fresh-agent
probe of the command sentence, opens the pull request and merges. Stop after Task 4; do
not open a pull request, write a review record or merge.

**No fresh-agent check is owed by the executor.** No file under `framework/` or `rules/`
changes. The command sentence changes what a sprint session is told to show, so the
specifying session probes it at review and records the result in the merge body.

Do not store a kick-off prompt on this plan.

---

## Delivers

sprint-proposal-groups-bundles

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-groups -b plan/sprint-proposal-groups-bundles origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; a case whose
  expected output changes is rewritten to the new output.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

1. **`scripts/sprint.mjs`**, function `propose` only: group `entries` into team members
   (a backlog item without `bundle` is one; all entries sharing a `bundle` are one, at the
   first one's place) and print the lines *Decided* gives. Update the doc comment above
   `propose`, or add a one-line one, saying it prints one entry per team member.
2. **`commands/sprint.md`**, step 1: the sentence *Decided* gives.

## Tests

In `guards/sprint.test.js`, `describe('propose', …)`:

1. Rewrite the two full-output cases' header line to the new header (`for 5 team members`
   and `for 2 team members`).
2. † Rewrite the bundle case (`brings a bundle whole…`): with the default budget expect
   exactly these lines after the header —
   `'  1. f1 — 5 pts, band A — Title f1'`,
   `'  2. bundle kiln — 10 pts, 2 backlog items'`,
   `'       k1 — 5 pts, band A — Title k1'`,
   `'       k2 — 5 pts, band B — Title k2'`,
   `'  3. m1 — 5 pts, band B — Title m1'` — and a header saying `for 3 team members`.
   Keep the `--points 9` half as it is (no bundle comes in; `f1`, `s1`).
3. † New case, `test('keeps a bundle under one entry when an entry falls between its members', …)`:
   entries `k1`, `k2` (bundle `kiln`, `k2` with `after: ['x']`) and `x`, bands so that the
   walk order is `k1, k2, x` before the reorder (`k1: row('A', 5, 1, { bundle: 'kiln' })`,
   `k2: row('A', 4, 1, { bundle: 'kiln' })`, `x: row('B', 1, 1)` — check the order
   yourself by printing `proposeSprint` before relying on it, and adjust the scores until
   `entries` is `k1, x, k2`). Expect entry `1.` to be the bundle with `k1` then `k2`
   beneath it, entry `2.` to be `x`, and the header to say `for 2 team members`.
4. † New case, `test('says team member, not team members, for one', …)`: one entry, header
   contains `for 1 team member,`.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
- **Run a single guard the way the self-check runs one**, on the project-shaped tree
  `scripts/check-blueprint.sh` builds from a `git archive` of `HEAD`, with the jest under
  `.self-check/`. Read the script to find how, and say the exact command in the handover.
- **The installed `.tropis/scripts/sprint.mjs` is the old one.** Never run it to check
  this change; the guards install the source into their test clones.
- **A framework document may name a path in backticks only if it exists in a project.**
  Name no plan in backticks in `commands/`.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | `propose` prints one entry per team member |
| `guards/sprint.test.js` | the propose cases rewritten, two added |
| `commands/sprint.md` | step 1's sentence |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to cases (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-sprint-proposal-groups-bundles.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the sprint command changes here. No
decision record: the grouping chose between no real alternatives. No upstream queue:
this repository is the upstream. A release-note line is the developer's at `/release`:
the sprint proposal now shows one entry per team member, a bundle's backlog items beneath
it.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, `git status --porcelain` (nothing), and
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Record
`git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

*Tests* items 1–4. Commit. Run `guards/sprint.test.js` alone: the † cases fail (and the
two header rewrites). Paste their names.

### Task 2 — The change

*The change* items 1–2. Commit. Run `guards/sprint.test.js` alone: all pass. Then
`bash scripts/check-blueprint.sh`: last line starts `Self-check passed`.

### Task 3 — A run by hand

Paste the output of `propose` from one of the guard's test clones, or from a scratch
project built the way the guard builds one, with a bundle in it.

### Task 4 — The backlog, the board and the handover

1. In `feature-catalog.yaml`, the item to `status: shipped`, `modules` set to
   `scripts/sprint.mjs` and `commands/sprint.md`, and above it a
   `# Shipped by docs/superpowers/plans/2026-11-03-sprint-proposal-groups-bundles.md.`
   comment with one line per acceptance criterion naming the case that covers it. No
   `: ` inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
3. Commit. Run `npm --prefix .tropis test`, `bash scripts/check-blueprint.sh` and
   `git diff --stat origin/main...HEAD`; paste each.
4. Append `## Handover report` with the six sections the planning rule names (Outstanding
   says there is no screen; the developer sees it at the next `/sprint`). Commit.
5. `git push -u origin plan/sprint-proposal-groups-bundles`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

Executed in a Claude Code cloud session, Linux x86_64 (git 2.43.0, node v22.23.4).
Written from the code of this repository alone; no outside source was worked from.

### Task completion

- **Task 0** — done. `npm --prefix .tropis ci` ran, `git status --porcelain` printed
  nothing, and `bash scripts/check-blueprint.sh` on `f43d4bf` ended `Self-check passed:
  every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`
- **Task 1** — done, commit `51d8904`. Red run of `guards/sprint.test.js` alone:
  `Tests: 5 failed, 41 passed, 46 total`, the failures being
  - `propose › † fills 20 points in the order /next suggests, from ideas and shaped entries` (header)
  - `propose › † takes the budget from --points and refuses one that is not a whole number` (header)
  - `propose › † brings a bundle whole, at its first member's place, or not at all`
  - `propose › † keeps a bundle under one entry when an entry falls between its members`
  - `propose › † says team member, not team members, for one`
- **Task 2** — done, commit `793630f` (the change) and `4c87ed5`, a follow-up test commit (see
  *What the plan got wrong*). `guards/sprint.test.js` alone: `Tests: 46 passed, 46 total`.
  Self-check: last line `Self-check passed: …` as above.
- **Task 3** — done; output below.
- **Task 4** — done: the item is `shipped` with `modules` set and a criteria comment,
  its band block removed, nothing else in `bands.yaml`. The board's hook did not rebuild
  `docs/backlog-board/index.html`, so it is not in the diff. Branch pushed; no pull
  request opened, no review record, no merge. The worktree is left in place.

### Verification results

**One guard, run the way the self-check runs it.** No command in the repository runs a
single guard on the project-shaped tree, so a scratch script (outside the repository)
repeated what `scripts/check-blueprint.sh` and `scripts/check-conformance.sh` do: a
`git archive HEAD` extracted into a stage directory with `{"type":"module"}` as its
`package.json`, `templates/framework-jest.config.js` as `jest.config.js` and
`.self-check/node_modules` linked in; a work tree composed as `compose()` does (the base
fixture, the shipped hooks and scripts from `installed-hooks.txt` and
`installed-scripts.txt`, the instructions `install_instructions()` copies, then
`generate-rules.mjs` and `record-installed.mjs conformance`); then, from the stage:

```
FRAMEWORK_ROOT=<work tree> node --experimental-vm-modules <checkout>/.self-check/node_modules/.bin/jest --config <stage>/jest.config.js guards/sprint.test.js
```

After the change: `Tests: 46 passed, 46 total`.

**Ordering of the in-between case**, checked before relying on it (a temporary commit,
since reset, logging the old output): `k1 … bundle kiln`, `x`, `k2 … bundle kiln` — so
`entries` is `k1, x, k2` with the plan's suggested scores unchanged.

**Task 3, a run by hand** from a scratch project built the way the guard builds one (a
bare origin seeded with the bundle case's catalog and bands, a clone with the source
scripts the guard's `FILES` lists installed under `.tropis/scripts/`):

```
Sprint: proposed 20 of 20 effort points for 3 team members, from main at 5b0736a.
  1. f1 — 5 pts, band A — Title f1
  2. bundle kiln — 10 pts, 2 backlog items
       k1 — 5 pts, band A — Title k1
       k2 — 5 pts, band B — Title k2
  3. m1 — 5 pts, band B — Title m1
Sprint: next in line, over the budget — s1 (2 pts).
```

**Task 4 checks**, on the backlog commit:

- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 165 passed, 165 total`.
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.`
- Re-run after committing this report: see the reply to the specifying session (the
  report cannot quote the run of its own commit).

### Scope

```
 commands/sprint.md            |  5 +++--
 docs/backlog-board/bands.yaml | 12 ------------
 feature-catalog.yaml          | 11 +++++++++--
 guards/sprint.test.js         | 42 ++++++++++++++++++++++++++++++++++++++----
 scripts/sprint.mjs            | 29 +++++++++++++++++++++++++++--
 5 files changed, 77 insertions(+), 22 deletions(-)
```

Every file is in *File Structure*; this plan file joins them with this report. Worktree
used: `../tropis-groups`, on `plan/sprint-proposal-groups-bundles`, created by
`isolate-for-plan.sh` from `origin/main` at `f43d4bf`.

### Judgment calls

- **The bundle case's expectation includes the `next in line` line.** The plan listed
  "exactly these lines after the header" and left it out, but that fixture leaves `s1`
  (2 pts) over the budget, so the script prints the unchanged
  `Sprint: next in line, over the budget — s1 (2 pts).` after the entries. Added as its
  own commit after the first green run showed it; the case still fails on the old code.
- **The new cases assert the header with `toContain`** on its ` for <n> team member(s), `
  part, since their sha differs per run; the two full-output cases assert the whole header
  as before.
- **The in-between case asserts the bundle's points as `2 pts`** (two members of 1 point
  each: `row(band, value, effort)` puts effort third), which the plan did not spell out.
- **Step 1's paragraph was re-wrapped** around the new sentence, so the diff shows three
  lines; the words are exactly the plan's.
- **The existing comment above the backlog item was kept**, with the `# Shipped by` block
  added between it and the item. Criterion 4 has no test case; its line names the
  sentence in `commands/sprint.md` and the specifying session's probe.

### What the plan got wrong

- *Tests* item 2 said to expect "exactly these lines after the header" without the
  `next in line` line that this fixture prints under the default budget. As written, the
  case could never pass.
- Nothing else: the code claims (the flat list, `proposeSprint`'s ordering, the test
  helpers) were true, and the suggested scores for the in-between case did give
  `k1, x, k2`.

### Outstanding

- No screen: the developer sees the grouping at the next `/sprint`.
- The fresh-agent probe of step 1's sentence, the pull request and the merge are the
  specifying session's.
