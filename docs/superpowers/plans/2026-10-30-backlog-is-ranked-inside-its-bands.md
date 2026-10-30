# The backlog is ranked inside four bands — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the board and the backlog report order every open entry by band and then by
rank, where rank is value divided by effort, both scored 1 to 5 in the bands file with a
reason each. There are four bands with written meanings — A do now, B do next, C decide
first, D leave it. Shipped, superseded and shelved entries leave the bands for a collapsed
section at the bottom of the board, and an entry waiting on another carries a marker
naming it.

**Spec:** the entry `backlog-is-ranked-inside-its-bands` in `feature-catalog.yaml`, its
eight criteria, and docs/superpowers/specs/2026-10-30-backlog-ranking-design.md, all of it
except *Grooming*, which is the next plan's. *Decisions* below settles what the spec
leaves to the plan. Do not reopen them.

**Read first:** the review record of
docs/superpowers/plans/2026-10-16-backlog-shows-open-work-on-one-page.md, the plan that
built the board. What it teaches here: the page is opened from disk, so it must declare its
own encoding (it does; keep it); a superseded or shelved entry counted as work is a defect
the board has had before; and `next.mjs` with no bands file must print exactly what it
printed before, byte for byte.

**What the specifying session verified on 2026-10-30, against `main` at `4c72ad9`, with
git 2.49.0 and Node v22.15.0, in Claude Code desktop (Opus 5.5) on macOS 26.2, arm64:**

- The band letters and their meanings are written in these places, and nowhere else
  outside plans, the bands file itself, the installed release (`.claude/`, `.tropis/`,
  `.cursor/`) and the catalog (searched with `git grep -P`, which found the planted
  pattern in `scripts/next-work.js`):
  - `scripts/next-work.js`: `BAND_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4 }`,
    `SUGGESTABLE = new Set(['A', 'B', 'C'])`, `bandOf` defaulting to `'E'`, and the
    comments and JSDoc around them.
  - `scripts/next.mjs`: the `(needs a decision)` suffix on band `D`, the `D` filter in the
    no-suggestion branch, and the line `nothing ready is banded A to C; the rest is banded
    to leave alone.`
  - `templates/backlog-board.html`: the footer paragraph *Bands.*, the `BANDS` object,
    the default band `"E"` in `data`, the three `["A","B","C","D","E"]` arrays (chips,
    tallies, `GORDER.band`), and the comment *Nothing banded A–C*.
  - `templates/backlog-bands.yaml` and its copy `fixtures/base/docs/backlog-board/bands.yaml`
    (header lines 4–5).
  - `commands/refresh-board.md`, lines 30–31.
  - Tests: `guards/next-report.test.js` (cases *suggests by band*, *suggests an entry in
    an arc under way first within a band*, *never suggests D or E*, *counts an unbanded
    entry as E*, and the C case asserting `Next step: cheap — band C`),
    `guards/board-bands.test.js` and `guards/backlog-board.test.js` (rows banded A, C, D,
    E in fixtures).
- `ready()` in `scripts/next-work.js` already excludes shelved and superseded entries;
  `blocked()` excludes them too. `after` orders ready entries (`orderByAfter`) and never
  holds one back.
- `scripts/build-backlog-board.mjs` passes only open entries (`status !== 'shipped'`) to
  the page, and the page shows shipped entries only as a count (`__SHIPPED__`). It computes
  `stale` as bands whose id is not an open entry, so a band on a superseded or shelved
  entry is not stale today.
- `bandLetters()` in `scripts/board-bands.js` reduces each row to its letter; `next.mjs`
  and the build pass that map to `nextStep()`. Nothing reads `value` or `effort` today,
  and no row in `docs/backlog-board/bands.yaml` has them.
- `stampBands()` rewrites only `seen` blocks, line by line, and leaves every other line
  byte for byte. A new key in a row is safe for it as long as the key is a two-space
  indented line, which it is.
- `guards/backlog-board.test.js` › `/refresh-board` reads `commands/refresh-board.md` and
  expects the words *arc already under way* and *finishing that arc*.
- `templates/README.md` line 36 says `/next` suggests by band. It is the operator guide
  setup installs.
- The last decision in `framework/DECISIONS.md` is FW-033. FW-017 records the board and
  the bands, and its *Decision* says D and E are listed and never suggested.

**Model tier: Medium.** The rules are given; the page layout, the build's new reports and
the test changes need judgment within them.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** The page is a screen, so the reviewing session puts it
in front of the developer through `/manual-check` before merging; and the ordering on the
real backlog is judged against context this plan does not carry.

Do not store a kick-off prompt on this plan.

---

## Delivers

backlog-is-ranked-inside-its-bands

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-ranked-bands -b plan/backlog-is-ranked-inside-its-bands` |

## Global Constraints

- **Edit the source, never the installed release.** `scripts/`, `templates/`, `commands/`,
  `framework/`, `guards/` and `fixtures/` are the next release. Do not edit `.claude/`,
  `.tropis/` or `.cursor/`.
- **Do not edit `docs/backlog-board/bands.yaml`.** This repository's own rows are
  re-judged after a release carrying this change is taken, not by this plan.
- **With no bands file, or a header-only one, `next.mjs` prints exactly what it printed
  before.** The test *is unchanged without bands* holds that; keep it green.
- **Add no dependency.** Every commit has a body.
- **Push only to this plan's branch.** Open a pull request; do not merge.

## Decisions

Taken by the specifying session on 2026-10-30.

### 1. The bands

| Letter | Name | Meaning, as written in the template, the command and the page |
|---|---|---|
| A | Do now | High value, and urgent or blocking other work. |
| B | Do next | Worth doing, no deadline. |
| C | Decide first | An open question only the developer can answer stands between the entry and a plan; the verdict names the question. |
| D | Leave it | Nothing to do until something happens; the verdict names what. |

`BAND_RANK = { A: 0, B: 1, C: 2, D: 3 }`. `SUGGESTABLE` is A and B. `bandOf` returns `'D'`
for an id with no band or with a letter outside A to D. `next.mjs` marks band C
`(needs a decision)` and its no-suggestion lines read
`Next step: none — nothing ready is banded A or B; <ids> need a decision, not a plan.` and
`Next step: none — nothing ready is banded A or B; the rest is banded to leave for now.`

### 2. The row

```yaml
some-entry:
  band: B
  value: 4
  valueWhy: "One line."
  effort: 2
  effortWhy: "One line."
  verdict: "One or two sentences."
  evidence: "Optional, dated."
  seen:
    status: shaped
    blockers: []
```

`value` and `effort` are integers 1 to 5. Key order is as above; the build does not
enforce order.

### 3. Rank

`rank = value / effort`. A row missing either score, or carrying one outside 1 to 5, has
no rank and sorts after every ranked entry in its band. Inside a band: rank descending,
then an entry in an arc already under way, then the order `ready()` gave (for the report)
or the id (for entries the page shows that are not ready). `nextStep()` takes the first
ready entry banded A or B in that order.

`bandLetters()` keeps its name and return shape for the letter. Add a sibling,
`bandScores(rows)`, returning `id → { value, effort }` for rows whose two scores are both
integers 1 to 5. `nextStep(catalog, bands, scores = null)` and
`readyInBandOrder(catalog, bands, scores = null)` take it as an optional third argument;
with no scores the order is exactly today's. Callers — `next.mjs` and the build — pass it.

### 4. Blocked ahead of the suggestion

After the `Next step:` line, when bands exist, `next.mjs` finds the `shaped` entry (not
shelved, not superseded — ideas are never suggested, so never reported here either) with
unshipped blockers that would sort
before the suggestion under *Decision 3* — or, with no suggestion, the highest such entry
banded A or B. When there is one it prints
`  Ahead of it, blocked: <id> — band <letter>, waiting on <ids>` (with no suggestion:
`  Highest blocked: <id> — band <letter>, waiting on <ids>`). One line, the single highest.
Nothing is printed when there is none, and nothing when there are no bands.

### 5. Closed entries on the page

The build passes every catalog entry to the page, with a flag for closed: `shipped`, or
`supersededBy` non-empty, or `shelved: true`. Open-and-active entries are the rest. The
bands, chips, tallies and groups count active entries only. Below the board, one
`<details>` element, closed by default, headed *Closed* with its count, lists closed
entries by id with what closed each — `shipped`, `replaced by <ids>`, or `shelved` — and
its title. The *Parked* tally and the *shelved* and *superseded* state chips go; the
closed section replaces them.

`stale` in the build becomes: a band whose id is not an active entry. Its report line reads
`<n> band(s) in bands.yaml for entries that have shipped, been replaced, been shelved or
gone — delete them:`.

### 6. Waiting markers

On a card, for each unshipped id in the entry's `blockedBy`: a tag `blocked by <id>`; for
each unshipped id in `after`: a tag `after <id>`. The existing `blocked` tag and the
`blocked` state chip stay, counting entries with an unshipped blocker (today they count
any `blockedBy`, shipped or not — fix that while here).

### 7. Ranking on the page

The page sorts each band group by *Decision 3*. The `Sort` control gains `rank` and it
becomes the default; `localStorage` may hold an older choice, which still works. Each card
shows `value <n> · effort <n>` beside its tags, and the detail panel shows `valueWhy` and
`effortWhy` under a heading *Scores*. A card with no scores shows `not scored`.

### 8. The build's new reports

After the existing three, in this order:

- `<n> band(s) not A to D — re-band them:` and one line per id with its letter.
- `<n> band(s) with no value or effort score (1 to 5) — score them:` and one line per id.

Both count only rows whose entry is active. Neither fails the build.

### 9. The refresh command

In `commands/refresh-board.md`, step 2's first bullet asks for the band (with the four
meanings), `value` and `effort` with one line each saying why, the verdict and the
evidence. Add, after the arc bullet, one bullet: band an entry that waits on another on its
own value, as though what it waits on were done — the board marks the wait. Add one bullet
for the two new reports: re-band a row not A to D, score a row with no scores, and say that
on the first refresh after this release every existing row is reported this way, and is
re-judged under the new bands, not converted letter for letter. `/refresh-board all` is
described as re-reading every band, verdict and score. Keep the arc wording the test reads.
Step 1's list of what the build reports gains the two new kinds. The final paragraph
(*Report what moved*) adds scores written.

### 10. The decision record

Add FW-034 to `framework/DECISIONS.md`, in the existing format (date, status, Decision,
Rejected, Consequences). Decision: four bands with written meanings; rank inside a band by
value over effort, scored 1 to 5 with reasons in the bands file; closed entries out of the
bands; waiting entries banded on their own value with a marker. Rejected: one ranked list
across bands (a cheap low-value entry would climb above urgent work); keeping *cheap win*
as a band (effort says it); a conversion step for existing bands files (the missing scores
flag every old row, and the refresh re-judges them). Consequences: a project's first
refresh after taking the release re-judges every row; until then an old C row reads as
*decide first*, an old D as *leave it* and an old E as unbanded, none suggested. Write
paths in plain text, not backticks (the integrity guard requires a backticked path under
`docs/`, `scripts/` or `.claude/` to exist).

Amend FW-017 with one line at the end of its *Decision*: `Amended by FW-034: four bands,
C and D listed and never suggested.`

### 11. The operator guide

`templates/README.md` line 36: `with bands written, /next suggests by band` becomes
`with bands written, /next suggests by band, and by value over effort inside one`.

## Traps

- **`guards/backlog-board.test.js` and `guards/next-report.test.js` assert today's
  letters.** They change with the letters; that is the work, not a regression. Every test
  that asserted E behaviour is rewritten for D, and the C (*cheap*) suggestion case
  becomes a B case.
- **The no-bands output must not move by a byte.** `ready()` order with no scores is the
  order today.
- **The self-check reads committed content only.** Commit, then run it.
- **`stampBands` must still leave every non-`seen` line byte for byte**, including the new
  keys. Its test *writes seen on every row and leaves everything else byte for byte*
  gains a row with scores.

## File Structure

| File | Change |
|---|---|
| `scripts/next-work.js` | *Decisions* 1, 3 |
| `scripts/next.mjs` | *Decisions* 1, 3, 4 |
| `scripts/board-bands.js` | `bandScores` (*Decision 3*) |
| `scripts/build-backlog-board.mjs` | *Decisions* 3, 5, 8; passes scores and closed entries to the page |
| `templates/backlog-board.html` | *Decisions* 1, 5, 6, 7 |
| `templates/backlog-bands.yaml` | header: four bands, the row keys of *Decision 2* |
| `fixtures/base/docs/backlog-board/bands.yaml` | same header as the template |
| `commands/refresh-board.md` | *Decision 9* |
| `templates/README.md` | *Decision 11* |
| `framework/DECISIONS.md` | *Decision 10* |
| `guards/next-work.test.js` or the existing guards below | new cases for rank, `bandScores`, blocked-ahead |
| `guards/next-report.test.js` | letters, rank order, blocked-ahead line |
| `guards/board-bands.test.js` | `bandScores`; `stampBands` with scored rows |
| `guards/backlog-board.test.js` | closed section, markers, new reports, stale on superseded and shelved |
| `feature-catalog.yaml` | the entry to `shipped`, a comment naming this handover |
| `docs/superpowers/plans/2026-10-30-backlog-is-ranked-inside-its-bands.md` | the handover report |

`guards/next-work.test.js` does not exist today; create it only if the new unit cases do
not fit `next-report.test.js` or `board-bands.test.js`, and say which in the handover.

## Review Focus

1. With no bands file, `next.mjs` prints byte for byte what `main` prints, on this
   repository's real catalog.
2. On a copy of this repository's real catalog and bands file, the build reports every row
   as unscored and every E row as not A to D, and the page still renders every active entry.
3. A superseded and a shelved entry appear only in the closed section, and a band on either
   is reported stale.
4. The blocked-ahead line names the right entry and nothing when none qualifies.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: its last line starts `Self-check passed`).
Save `node scripts/next.mjs` run from a scratch copy of the repository with
`docs/backlog-board/bands.yaml` removed — its output is the no-bands baseline for Task 6.
(The scripts resolve the project root two levels above themselves, so run them from a
copy laid out as `.tropis/scripts/`, as `guards/next-report.test.js` stages them; read
that test's `stage` helper.)

### Task 1 — Letters and rank in `next-work.js`, tests first

Write the failing cases: four letters; unbanded and unknown letters count as D; A and B
suggested, C and D never; rank order inside a band with arc and ready-order tie-breaks;
unscored after scored; with no scores, today's order. Then *Decisions* 1 and 3 in
`scripts/next-work.js` and `bandScores` in `scripts/board-bands.js`. Run the suite. Commit.

### Task 2 — The report

`scripts/next.mjs`: letters, wording, scores passed through, and *Decision 4*. Rewrite the
band cases in `guards/next-report.test.js` and add the blocked-ahead cases (one where it
prints, one where it does not, one with no suggestion). Run the suite. Commit.

### Task 3 — The build

`scripts/build-backlog-board.mjs`: *Decisions* 5 and 8, scores and closed entries to the
page. Tests in `guards/backlog-board.test.js` for stale on superseded and shelved, the two
new reports, and the page data carrying closed entries. Run the suite. Commit.

### Task 4 — The page

`templates/backlog-board.html`: *Decisions* 1, 5, 6, 7. Build the page from a copy of this
repository's catalog and bands file, open it in a browser, and check: four bands, ranked
order (by hand, give two rows in one band scores in a scratch copy), markers, the closed
section collapsed with every shipped, superseded and shelved entry in it. Describe what you
saw in the handover; a screenshot is welcome but not required. Commit.

### Task 5 — Template, fixture, command, guide, decision

*Decisions* 9, 10, 11; the template and fixture headers. Run the suite. Commit.

Then the fresh-agent check the workflow asks of a command change that alters what an agent
is told. Dispatch an agent that has only the repository on this branch. Tell it the task
is a probe whose output will be discarded. Give it an invented catalog entry — for example
`board-shows-a-legend: The board explains its colours`, an idea with one criterion — and a
bands file holding one old row banded `C` with no scores, and ask it to follow
`commands/refresh-board.md` (the source, not `.claude/commands/`) to band the new entry
and deal with what the build reports. It passes if it writes a band A to D with `value`,
`effort` and a reason for each, and re-judges the old C row rather than keeping or mapping
its letter. Record what it did, and the tool, version, operating system and architecture,
in the commit body and the handover.

### Task 6 — Catalog, checks, handover

Set the entry to `shipped`, `modules` as the catalog already lists them plus any test file
created, and a comment above it naming this handover. Run `npm --prefix .tropis test`,
`bash scripts/check-blueprint.sh`, and the no-bands comparison against Task 0's baseline
(`diff` must print nothing). Append `## Handover report` with the six sections the planning
rule names, each measurement with its tool, version, operating system and architecture.
Commit, push the branch, open a pull request against `main`. Do not merge.

## Not in this plan

- Grooming and the `bundle` field: `backlog-is-groomed-at-refresh`.
- Re-banding and scoring this repository's own rows: after a release carrying this change
  is taken, with `/refresh-board all groom`.
