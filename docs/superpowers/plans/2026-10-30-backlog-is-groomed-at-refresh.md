# Refreshing the board grooms the backlog — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `/refresh-board` proposes merging, bundling, re-banding or closing entries that
overlap, conflict, belong together or are already done — on every refresh for the entries
that are new or moved, and for the whole open backlog when run as `/refresh-board groom`.
It applies nothing without the developer's yes. Rows that share a `bundle` name are tagged
together on the board, and `/next`, suggesting one of them, names the rest.

**Spec:** the entry `backlog-is-groomed-at-refresh` in `feature-catalog.yaml`, its four
criteria, and docs/superpowers/specs/2026-10-30-backlog-ranking-design.md, section
*Grooming*. *Decisions* below settles what the spec leaves to the plan. Do not reopen
them.

**Requires:** `backlog-is-ranked-inside-its-bands` merged to `main`.

This plan edits the bands file shape, the refresh command and the board page that plan
rewrites, and is written against them as that plan specifies. Before Task 1, check that
docs/superpowers/plans/2026-10-30-backlog-is-ranked-inside-its-bands.md carries a
`## Review record` on `main`; if it does not, stop and say so — that is a handover to the
specifying session, not something to work around.

**Read first:** the review record of
docs/superpowers/plans/2026-10-30-backlog-is-ranked-inside-its-bands.md. Where it says that
plan's code differs from what that plan's *Decisions* describe, the code on `main` wins,
and this plan's tasks apply to it as it is.

**What the specifying session verified on 2026-10-30, against `main` at `4c72ad9`, with
git 2.49.0 and Node v22.15.0, in Claude Code desktop (Opus 5.5) on macOS 26.2, arm64:**

- `commands/refresh-board.md` takes one argument today, `all`, which runs the build with
  `--reevaluate`. Nothing else parses the command's arguments: the agent reads them from
  the invocation.
- `/refresh-board` never edits `feature-catalog.yaml`; its last paragraph says a wrong
  status is a `/feature` matter. `/feature` (`commands/feature.md`) moves an entry's
  status and is where `supersededBy` is set.
- `scripts/board-bands.js` `stampBands()` rewrites only `seen` blocks and leaves every
  other line byte for byte, so a `bundle:` key in a row survives a stamp.
- `scripts/next.mjs` prints `Next step: <id> — band <letter>` when bands exist. The
  ranking plan adds, at most, one blocked-ahead line after it; put the *With it* line
  directly after `Next step:`, before any blocked-ahead line.

**Model tier: Medium.** Mostly command text, specified below; one small field through the
build, the page and the report.

**Merge authority: parent review.** The command's wording decides how every later refresh
behaves, and the board is a screen the developer looks at through `/manual-check`.

Do not store a kick-off prompt on this plan.

---

## Delivers

backlog-is-groomed-at-refresh

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-groomed-backlog -b plan/backlog-is-groomed-at-refresh` |

## Global Constraints

- **Edit the source, never the installed release** (`.claude/`, `.tropis/`, `.cursor/`).
- **Do not edit `docs/backlog-board/bands.yaml`** or any entry in `feature-catalog.yaml`
  other than this plan's own.
- **Add no dependency.** Every commit has a body.
- **Push only to this plan's branch.** Open a pull request; do not merge.

## Decisions

Taken by the specifying session on 2026-10-30.

### 1. The two moments, in the command

`commands/refresh-board.md` gains a step between *Band and prune* and *Build again*,
headed **Groom**, saying:

- On every refresh, compare each entry banded, re-banded or re-scored in step 2 against
  every other open entry — read their value and criteria, not their titles — for the four
  findings below.
- When invoked with `groom` (`/refresh-board groom`, or `/refresh-board all groom`),
  compare every open entry against every other. `all` and `groom` combine; either may be
  given alone.
- Superseded, shelved and shipped entries are not compared, except as the entry that
  already did the work of an open one.

### 2. The four findings, and what each becomes on a yes

| Finding | Proposed as | On the developer's yes |
|---|---|---|
| Two entries describe the same work | `merge: <keep> absorbs <other>` | `/feature` marks the other superseded by the one kept |
| Two entries cannot both be done as written | `conflict: <a> and <b> — <one line>` | the entry that must yield goes to band C, its verdict naming the conflict |
| Entries are better done together | `bundle <name>: <ids>` | each row gets `bundle: <name>` |
| An entry is already done, or no longer true | `close: <id> — <one line>` | `/feature` closes it: superseded by the entry that did the work, or shelved with a reason |

The command lists the proposals in its report, one per line as above, and asks the
developer which to apply. It applies none without a yes, and a catalog change only through
`/feature`. It says to propose nothing rather than a weak finding: a pass that finds
nothing reports `Grooming: nothing to propose.`

### 3. The bundle field

A row may carry `bundle: <name>`, a short kebab-case name, after `effortWhy`. Rows with
the same name form one bundle.

- The build passes it to the page; the page shows a tag `bundle <name>` on each card in
  it. The build reports a bundle with one row left as `bundle <name> has one entry —
  remove the field:`.
- `next.mjs`, when the suggested entry has a bundle, prints after the `Next step:` line
  `  With it, bundle <name>: <other ids>`, listing the bundle's other active entries in
  band and rank order. Nothing when it has no bundle.
- `bandLetters` and `bandScores` are untouched; add `bandBundles(rows)` returning
  `id → name` beside them in `scripts/board-bands.js`.

### 4. Bands template

`templates/backlog-bands.yaml` and `fixtures/base/docs/backlog-board/bands.yaml` gain one
header line naming `bundle` as optional and saying what it means.

## Traps

- **A grooming pass is judgment, so there is no test of its findings.** Test the
  mechanics: the field through the build, the page and the report, and the command's text
  (as `guards/backlog-board.test.js` › `/refresh-board` already reads the command for its
  arc wording).
- **The self-check reads committed content only.** Commit, then run it.
- **`npm --prefix .tropis test` is not this plan's suite.** It runs the installed
  release's checks on this repository, not the source guards under `guards/` this plan
  changes; those run only through `bash scripts/check-blueprint.sh`. "Run the suite" in
  the tasks means the self-check, after a commit. The ranking plan said otherwise and its
  executor had to work around it.

## File Structure

| File | Change |
|---|---|
| `commands/refresh-board.md` | *Decisions* 1, 2 |
| `scripts/board-bands.js` | `bandBundles` |
| `scripts/build-backlog-board.mjs` | bundle to the page; the one-row bundle report |
| `scripts/next.mjs` | the *With it* line |
| `templates/backlog-board.html` | the bundle tag |
| `templates/backlog-bands.yaml` | *Decision 4* |
| `fixtures/base/docs/backlog-board/bands.yaml` | *Decision 4* |
| `framework/DECISIONS.md` | FW-035: grooming is a mode of `/refresh-board`, on every refresh for what moved and in full on request; rejected a separate command (the refresh is where backlog judgments already live) and a full pass on every refresh (slow and noisy). Paths in plain text, not backticks |
| `guards/board-bands.test.js` | `bandBundles`; `stampBands` keeps `bundle` |
| `guards/backlog-board.test.js` | tag on the page; one-row bundle report; the command names `groom` and the four findings |
| `guards/next-report.test.js` | the *With it* line, and its absence |
| `feature-catalog.yaml` | the entry to `shipped`, a comment naming this handover |
| `docs/superpowers/plans/2026-10-30-backlog-is-groomed-at-refresh.md` | the handover report |

## Review Focus

1. The command proposes and never applies; a catalog change goes only through `/feature`.
2. A bundle shows on the board and in `/next`, and a one-row bundle is reported.
3. The fresh-agent check found duplicates it was not pointed at.

## Tasks

### Task 0 — Setup in the worktree

Check the *Requires* condition. Run `npm --prefix .tropis ci`, `git status --porcelain`
(expected: nothing) and `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`).

### Task 1 — The bundle field, tests first

Failing tests for `bandBundles`, `stampBands` keeping `bundle`, the page tag, the one-row
report and the *With it* line (present and absent). Then *Decision 3*. Run the suite.
Commit.

### Task 2 — The command, template and decision

*Decisions* 1, 2, 4 and FW-035. The command test reads `groom`, all four findings and the
words *applies none without*. Run the suite. Commit.

Then the fresh-agent check. Dispatch an agent that has only the repository on this branch,
tell it the task is a probe whose output will be discarded, and give it a scratch catalog
of six invented entries in which two describe the same work in different words, two are
naturally done together, and one is already done by another; with a bands file banding
and scoring all six. Ask it to run `/refresh-board groom` by following
`commands/refresh-board.md` (the source). It passes if it proposes the merge, the bundle
and the close, applies none of them, and edits no catalog entry. Do not tell it which
entries are which. Record what it proposed, and the tool, version, operating system and
architecture, in the commit body and the handover.

### Task 3 — Catalog, checks, handover

Set the entry to `shipped` with a comment naming this handover. Run
`npm --prefix .tropis test` and `bash scripts/check-blueprint.sh`. Append
`## Handover report` with the six sections the planning rule names, each measurement with
its tool, version, operating system and architecture. Commit, push the branch, open a pull
request against `main`. Do not merge.

## Not in this plan

- The first full grooming pass on this repository's backlog: after a release carrying both
  plans is taken, with `/refresh-board all groom`.
