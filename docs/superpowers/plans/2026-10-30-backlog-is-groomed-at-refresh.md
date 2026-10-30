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

## Handover report

Measured with git 2.49.0, Node v22.15.0, Claude Code desktop (Sonnet 5.5), macOS 26.2 on arm64.

### Task completion

- Task 0: the prerequisite plan carries a `## Review record` on `main`. `npm --prefix .tropis ci` ran. The self-check was run after Task 1, not before (see Judgment calls).
- Task 1: done. `bandBundles`, the `bundle` key surviving a stamp, the page tag, the one-row bundle report and the *With it* line (present and absent), tests first.
- Task 2: done. The Groom step, the bands template and fixture line, FW-035, and the fresh-agent check.
- Task 3: done. The entry is `shipped` with a comment naming this report; both suites run; pull request opened, not merged.

### Verification results

- `bash scripts/check-blueprint.sh` on the Task 1 commit: `Self-check FAILED`, with exactly one failure, `/refresh-board › grooms: names groom, the four findings, and that nothing is applied without a yes`. I wrote that test in Task 1 along with the others, so it was red until Task 2 supplied the command text.
- The same command on the Task 2 commit: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 6 passed, 6 total`, `Tests: 33 passed, 33 total`.
- Fresh-agent check (a general-purpose subagent in Claude Code desktop, Sonnet 5.5, macOS 26.2 on arm64), run on a scratch project of six invented entries: two describing CSV export in different words, two about theme choice, one sign-in entry open beside a shipped one that already did the work, with all six banded and scored. It ran `/refresh-board groom` from the source command text. It proposed `merge: export-to-csv absorbs spreadsheet-download`, `bundle theme: dark-theme, theme-toggle-memory`, and `close: sign-in-screen — the shipped entry login-page already provides the sign-in page`. It proposed no conflict (there was none). It applied none of them and changed no catalog entry; its only change was the `seen` stamp on the five rows. It passes.
- The self-check was run once more after the final commit; see the pull request for the result.

### Scope

Diff stat against `a1df7bb`, before the catalog and plan commit: 11 files, 193 insertions, 13 deletions. Every file is in the File Structure table; the catalog entry and this plan file are the last two. Worktree used: `../tropis-groomed-backlog` (sibling of `tropis`), created by the isolate helper.

### Judgment calls

- The Task 1 tests included the command-text test that Task 2 satisfies, so the Task 1 commit's self-check was red on that one test. I did not split it, since the plan asks for the command test in Task 2 but one test file holds both.
- `next.mjs` sorts the bundle-mates itself (band letter, then value over effort with unscored last, then id) instead of exporting `compareByBand` from `next-work.js`, which is not in the File Structure table.
- The bundle-mates listed by `/next` are every open entry with that name, including entries that are blocked.
- `bandBundles` ignores a `bundle` that is not a non-empty string. The one-row report counts only rows whose entry is open.
- The fresh-agent check used a scratch project outside the repository, a copy of the board scripts, and a git repository of its own; it was not pointed at any real backlog entry.
- The command renumbers its steps to six and now skips to step 5 (Look) when the build reports nothing and `groom` was not asked.

### What the plan got wrong

- It says the self-check on the Task 1 commit is expected to pass; with the command test written in Task 1 it cannot (above).
- It never says how to choose a bundle name; the probe agent invented one, which is the intended behaviour.
- The planned `Then` ordering (Groom between *Band and prune* and *Build again*) leaves the bundle-with-one-entry report in the first build, before grooming can add or remove a bundle. A bundle proposed and applied during a refresh is only checked by the next one.

### Outstanding

- The first full grooming pass on this repository's backlog is deliberately not in this plan.
- Nothing for the developer to observe on a screen beyond the `bundle` tag on the board; a `/manual-check` for that is the reviewer's call.

## Review record

Reviewed by the specifying session on 2026-10-30, with git 2.49.0 and Node v22.15.0 in
Claude Code desktop (Opus 5.5) on macOS 26.2, arm64.

### Checks re-run

- `bash scripts/check-blueprint.sh` on the branch at `08bba8b`: last line `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`
- `npm --prefix .tropis test` in the worktree: 33 tests passed.
- Scope: `git diff --name-only origin/main...HEAD` against the File Structure table:
  every file listed, nothing outside it.
- A scratch project set up from the branch with `scripts/set-up-project.sh`, given this
  repository's catalog and bands file at `a1df7bb` and three scratch `bundle` fields: the
  build printed `bundle check-alone has one entry — remove the field:`, and `next`
  printed `  With it, bundle check-pair: a-failing-push-is-visible` directly under its
  `Next step:` line.
- The command text was read against *Decisions* 1 and 2: the Groom step sits between
  *Band and prune* and *Build again*, names both moments and their combination with
  `all`, carries the four findings with what each becomes, and says it applies none
  without a yes and changes the catalog only through `/feature`.

### Found

Public exposure: the diff and the branch's commit bodies were read for private material
(people's names, other projects, home paths, hostnames, email addresses): nothing.

The handover's third item under *What the plan got wrong* does not hold. It says a bundle
applied during a refresh is checked only by the next refresh. The Groom step comes before
*Build again*, which must report nothing needing a person, so a bundle left with one entry
is reported in the same refresh. No change needed.

### Outstanding disposition

- The first full grooming pass on this repository's backlog: not an entry. It is the
  one-time `/refresh-board all groom` after a release carrying this plan and the ranking
  plan, named in the design and in this plan's *Not in this plan*.
- The bundle tag on the board: checked by the developer through `/manual-check`, all
  three steps passed — `docs/verification-log.md`, entry 2026-10-30, *The backlog board
  tags bundles*.
- No bundle-naming guidance in the plan: dropped. The command asks for a short
  kebab-case name and the agent choosing it is the right judge; the fresh-agent check
  named one sensibly unprompted.

### Learnings routed

The handover's first item, a test written in Task 1 that only Task 2 can satisfy, is a
plan-writing slip of this plan alone: the command test belonged in Task 2's list. Nothing
generalises beyond it, so nothing was written.

### Merged because

Every check re-ran green, the scope matches the plan, the fresh-agent check found the
merge, bundle and close unprompted and applied none, and the developer passed the page
check.
