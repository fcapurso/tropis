# The overlap check sees every file a plan's table row lists — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `fileStructurePaths` in `scripts/plan-binding.js` returns every backticked path
in the first cell of each File Structure row, not only the first one, so the overlap
check at claim (and the dispatch check that pairs a rule's source with the files written
from it) sees every file a plan lists.

**Backlog item:** `overlap-check-reads-every-file-in-a-row` in `feature-catalog.yaml`
(type bug). Spec context: `docs/superpowers/specs/2026-11-01-sprint-design.md` §4.

**One plan:** what becomes true is one sentence — every file a plan's File Structure
table names is read, whatever the row holds.

**What the specifying session verified on 2026-11-02, against `origin/main` at `9cff834`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64):**

- **The defect, observed.** Claiming `backlog-speaks-in-epics-stories-and-points`, a draft
  plan whose File Structure rows each listed several files (for example
  ``| `scripts/a.js`, `scripts/sprint.mjs` | … |``) got
  `No overlap: … shares no file with a plan in building.` from
  `node scripts/plan-overlap.mjs --claim <plan>`, although two plans in `building` shared
  `scripts/sprint.mjs`, `commands/sprint.md`, `templates/README.md` and more with it.
  Rewritten one file per row, the same command printed
  `Overlaps team-members-start-in-another-tool (…): commands/sprint.md, …` and wrote
  `Merges after`.
- **The cause.** `scripts/plan-binding.js` lines 30–41:

  ```js
  /**
   * Every path a plan's File Structure section claims it will touch: the first backticked
   * span of each table row under that heading. Prose and bullets there are not claims —
   * a plan may name a file it deliberately leaves alone.
   * ...
   */
  export function fileStructurePaths(markdown) {
    const section = extractSection(markdown, 'File Structure');
    if (section == null) return [];
    return [...section.matchAll(/^\|\s*`([^`]+)`/gm)].map((m) => m[1]);
  }
  ```

  The regular expression anchors on the row's start and takes one span.
- **Its callers:** `scripts/plan-overlap.mjs` (`sharedFiles`, and the `--claim` refusal
  of a plan that lists no file) and `missingProjections` in `scripts/plan-binding.js`
  itself (used by `scripts/dispatch.mjs` and `guards/plan-dispatchable.test.js`). No
  other file calls it.
- **Its tests:** `guards/plan-overlap.test.js` builds plans with one file per row (the
  `plan(files, …)` helper) and has `describe('sharedFiles', …)`;
  `guards/plan-dispatchable.test.js` builds tables with one file per row (`table(...)`)
  for `missingProjections`. Neither has a row holding two files.
- **No framework document describes this reading.** `git grep -n -i "first backtick"`
  over `rules`, `framework`, `commands`, `templates` finds only the Repositories table's
  rule (`rules/planning.md`, the Checkout cell), which is a different table and stays.
- **Two plans in `building` edit the same files**: `team-members-and-reviewers-run-on-a-tier`
  (`scripts/plan-binding.js`) and `backlog-speaks-in-epics-stories-and-points`
  (`scripts/plan-binding.js`, `guards/plan-overlap.test.js`,
  `guards/plan-dispatchable.test.js`). The claim ran `plan-overlap.mjs --claim`; the
  header carries the `Merges after` it wrote. Build in parallel; the reviewer rebases.

**Model tier: Small.** One function and its comment, and three test cases, all given.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request, write a review record
or merge.

**Merges after:** backlog-speaks-in-epics-stories-and-points, team-members-and-reviewers-run-on-a-tier

**No fresh-agent check is owed:** the change touches no file under `framework/`, `rules/`
or `commands/`; it changes what a script reads, which the tests below pin.

Do not store a kick-off prompt on this plan.

---

## Delivers

overlap-check-reads-every-file-in-a-row

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-overlap-row -b plan/overlap-check-reads-every-file-in-a-row origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **No cloud session, cloud agent or API key.**
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

Replace the function and its comment with:

```js
/**
 * Every path a plan's File Structure section claims it will touch: each backticked span
 * in the first cell of each table row under that heading, so a row may list several
 * files. Prose and bullets there are not claims — a plan may name a file it deliberately
 * leaves alone — and nothing after the first cell is read.
 * @param {string} markdown
 * @returns {string[]}
 */
export function fileStructurePaths(markdown) {
  const section = extractSection(markdown, 'File Structure');
  if (section == null) return [];
  return section.split('\n')
    .filter((line) => /^\|\s*`/.test(line))
    .flatMap((line) => [...line.split('|')[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]));
}
```

A row whose first cell does not start with a backtick (the header `| File | Change |`,
the `|---|` line) is still not read, as before.

## Tests

1. In `guards/plan-overlap.test.js`, inside `describe('sharedFiles', …)`, add:
   † `test('reads every file in a row, not only the first', …)`: plan A is the text of
   `plan(['src/y.js'])` with one more row appended under the table,
   ``| `src/z.js`, `src/x.js` | change |``; plan B is `plan(['src/x.js'])`. Expect
   `sharedFiles(a, b)` to equal `['src/x.js']`.
2. In the same file, in `describe('--claim', …)` (read how its other cases call
   `claimProject` and run the command, and follow them): † a case where the claiming
   plan's only row is ``| `src/w.js`, `src/x.js` | change |`` (pass it through the same
   `plan` helper with a hand-built table, or append the row to `plan([])`'s output if
   `plan` cannot hold it; `plan([])` has an empty table and `--claim` refuses an empty
   list, so append before writing). Plan `a` in `building` lists `src/x.js`. Expect the
   output to name `a` and the plan's header to gain `Merges after: a`, as the existing
   overlap case expects.
3. In `guards/plan-dispatchable.test.js`, beside the other `missingProjections` cases:
   † a table whose single row is ``| `docs/x.md`, `.claude/rules/tests.md` | x |`` reports
   `.cursor/rules/tests.mdc` as missing (today it reports nothing, because the rule
   source is second in the row), and a row ``| `.claude/rules/tests.md`, `.cursor/rules/tests.mdc` | x |``
   reports nothing.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run a single test file the way the self-check's `run_guard` function in
  `scripts/check-blueprint.sh` runs a guard**: on a `git archive` of `HEAD` extracted to a
  temporary folder, with `templates/framework-jest.config.js` copied there as
  `jest.config.js`, `FRAMEWORK_ROOT` set to it, and the jest the self-check installed
  under `.self-check/` (present after Task 0). Say in the handover the exact command.
- **This plan quotes table rows it is not declaring** (in *The change* and *Tests*); they
  sit outside the `## File Structure` section and are not read as claims.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | `fileStructurePaths` and its comment |
| `guards/plan-overlap.test.js` | two cases |
| `guards/plan-dispatchable.test.js` | two cases |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to cases (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-overlap-check-reads-every-file-in-a-row.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: no document describes the reading, so
none is owed; no decision (no real alternative was weighed: refusing multi-file rows
would break plans already written); no upstream queue (this repository is the upstream);
a release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the cases under *Tests*. Commit. Run the two test files alone (*Traps*). Expected:
the four † cases fail, every other case passes. Paste the failing test names.

### Task 2 — The fix

Apply *The change*. Commit. Run the two test files alone (all pass), then
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Paste both.
Then, from the worktree with a symlink `ln -s .tropis/node_modules node_modules` (removed
after with `rm node_modules`, never committed), run
`node scripts/plan-overlap.mjs --claim docs/superpowers/plans/2026-11-02-overlap-check-reads-every-file-in-a-row.md`
and paste its output; then `git checkout -- docs/superpowers/plans` so any header it
rewrote is not kept (the claim's `Merges after` is already there).

### Task 3 — The backlog and the board

1. In `feature-catalog.yaml`, on `overlap-check-reads-every-file-in-a-row`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so),
   set `modules` to `scripts/plan-binding.js`. Leave `refs`. Add, directly above the
   item's existing comment block, a comment
   `# Shipped by docs/superpowers/plans/2026-11-02-overlap-check-reads-every-file-in-a-row.md.`
   and one line per acceptance criterion naming the case that covers it (criterion 2 is
   covered by the existing one-file-per-row cases staying green). No `: ` inside an
   unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole
   `overlap-check-reads-every-file-in-a-row:` block (through `blockers: []`), nothing
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
   so there is no developer check). Commit.
3. `git push -u origin plan/overlap-check-reads-every-file-in-a-row`. **Do not open a
   pull request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.

## Handover report

### Task completion

- **Task 0, setup.** Dependencies installed under the installed release folder; the tree
  was clean; the baseline self-check passed on the base commit `4aaee2e`.
- **Task 1, the tests, red.** Committed as `3bf6b0b`. Three test cases fail, as the plan
  expects, and every other case passes (see Verification). The plan counts four failing
  cases; see *What the plan got wrong*.
- **Task 2, the fix.** Committed as `5a498a8`. Both guard files pass, the self-check passes,
  and the claim command prints the expected overlap.
- **Task 3, the backlog and the board.** Committed as `d729dbd`. The catalog entry is
  `shipped` with its comment; the board row is removed. The installed-release tests pass.
- **Task 4, verification and handover.** Done. This section is committed on the branch.
  No pull request, review record, auto-merge or merge.

### Verification results

Tools: git 2.49.0; node v22.15.0; jest 30.5.2 (from the self-check's `.self-check/`);
macOS (Darwin kernel 25.2.0) on arm64.

- Baseline self-check on `4aaee2e`: last line `Self-check passed: every guard caught its
  defect, the clean baseline passed, and the framework repository's own guards passed.`
- Red run on `3bf6b0b`, each file alone on a `git archive` of `HEAD` (below):
  - `guards/plan-overlap.test.js`: `Tests: 2 failed, 17 passed, 19 total`. Failing:
    `sharedFiles › reads every file in a row, not only the first` and
    `--claim › reads a claiming plan whose only row lists several files`.
  - `guards/plan-dispatchable.test.js`: `Tests: 1 failed, 7 passed, 8 total`. Failing:
    `what a plan must list beside a rule source › reads every file in a row, so a rule
    source second in the row still asks for its projection`.
- Green run on `5a498a8`: `guards/plan-overlap.test.js` `Tests: 19 passed, 19 total`;
  `guards/plan-dispatchable.test.js` `Tests: 8 passed, 8 total`.
- Single-guard command, as the self-check's `run_guard` runs it: `git archive HEAD` into a
  temporary folder; `templates/framework-jest.config.js` copied there as `jest.config.js`;
  `node_modules` in that folder symlinked to `.self-check/node_modules`; then, in that
  folder, `FRAMEWORK_ROOT=<that folder> node --experimental-vm-modules
  .self-check/node_modules/.bin/jest --config <that folder>/jest.config.js
  guards/<name>.test.js`. The wrapper script lives outside the repository.
  `TROPIS_EXPECT_FRAMEWORK` was not set: neither guard calls `isBlueprintTree`.
- Claim, on the fixed tree, with the plan's `node_modules` symlink (removed after; the plan
  file was then restored with `git checkout`):
  ```
  Overlaps backlog-speaks-in-epics-stories-and-points (docs/superpowers/plans/2026-11-02-backlog-speaks-in-epics-stories-and-points.md): guards/plan-dispatchable.test.js, guards/plan-overlap.test.js, scripts/plan-binding.js
  Overlaps team-members-and-reviewers-run-on-a-tier (docs/superpowers/plans/2026-11-02-team-members-and-reviewers-run-on-a-tier.md): scripts/plan-binding.js
  Merges after: backlog-speaks-in-epics-stories-and-points, team-members-and-reviewers-run-on-a-tier — already in docs/superpowers/plans/2026-11-02-overlap-check-reads-every-file-in-a-row.md.
  ```
  The header already carried that `Merges after` line, so the claim wrote nothing new.
- Self-check after the fix, on `5a498a8`: last line `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test` on `d729dbd`: `Tests: 157 passed, 157 total`
  (`Test Suites: 13 passed, 13 total`).
- Self-check on `d729dbd`, which holds everything except this section: last line
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.` The only commit after it is this handover,
  a change to this plan file alone.

### Scope

`git diff --stat origin/main...HEAD` (before this section was added):

```
 docs/backlog-board/bands.yaml    | 12 ------------
 feature-catalog.yaml             | 12 ++++++++++--
 guards/plan-dispatchable.test.js |  6 ++++++
 guards/plan-overlap.test.js      | 15 +++++++++++++++
 scripts/plan-binding.js          | 11 +++++++----
 5 files changed, 38 insertions(+), 18 deletions(-)
```

Every file is in *File Structure*. `docs/backlog-board/index.html` was not touched: the board's
hook did not rebuild or stage it.

### Judgment calls

- The catalog's `Shipped by` comment sits above the item's existing comment block, as the
  plan asks. That older block still says the reader takes "the first backticked span of
  each row only"; it is kept as the record of how the defect was found.
- The dispatch-check case is one `test` with two assertions (one row with the rule source
  second, one row with both files), not two cases.
- `modules` is a one-item list, `scripts/plan-binding.js`, and `refs` is unchanged.
- The status went to `shipped`; the item read `building`, so no note was needed.
- Source worked from: none outside this repository. The change is written from
  `scripts/plan-binding.js` and the existing cases in the two guard files.

### What the plan got wrong

- It says four `†` cases fail on red. It lists three tests: two in `plan-overlap.test.js`
  and one in `plan-dispatchable.test.js`, whose single `it` covers both rows. All three
  failed on red, as the plan expects, and pass after the fix.

### Outstanding

- The change has no screen, so there is no developer check.
- The release-note line is the developer's at `/release`.
- The branch overlaps two plans in `building`: `backlog-speaks-in-epics-stories-and-points`
  (the same three files, the reason for the bug) and `team-members-and-reviewers-run-on-a-tier`
  (`scripts/plan-binding.js`). The parent reviewer rebases before merge, as the header
  already says.
- The worktree `../tropis-overlap-row` is left in place, as the plan asks.

## Review record

Reviewed by the specifying session, a Claude desktop app session. Tools: Claude Code
2.1.300, git 2.49.0, node v22.15.0, macOS 26.2 on arm64.

### Checks re-run

- Rebased onto `0f8ae55` (the backlog-words plan, which this one merges after). One
  conflict, in `docs/backlog-board/bands.yaml`: both sides removed their own row;
  resolved by keeping neither. Bookkeeping, no review needed.
- Scope: `git diff --stat origin/main...HEAD` lists 6 files, all in *File Structure*.
- `plan-overlap`, `plan-dispatchable` and `dispatch` run together on a `git archive` of
  `HEAD`, as the self-check's `run_guard` does: `Tests: 67 passed, 67 total`.
- Mutation: `scripts/plan-binding.js` put back as it is on `main` (first span only), as a
  throwaway commit: `plan-overlap` and `plan-dispatchable` printed `Tests: 3 failed, 24
  passed` — the three new cases. Reset afterwards.
- The full self-check and the installed checks ran again before the pull request (its
  description gives the result).

### Found

Public exposure: the diff was read for home paths, hostnames, email addresses and names;
nothing found.

- The handover's correction is right: *Tests* item 3 is one `it` with two assertions, so
  three cases are red before the fix, not four.
- Nothing else.

### Outstanding disposition

- No developer check: the change has no screen.
- The release-note line is the developer's at `/release`.
- The rebase: done above.

### Learnings routed

- Nothing generalises beyond the fix: this repository is the upstream, and the plan
  rule's File Structure guidance needs no change now that a row may hold several files.

### Merged because

The overlap check and the projection check now read every file a row names, three cases
pin it and go red with the old reading, and plans written one file per row read as
before.
