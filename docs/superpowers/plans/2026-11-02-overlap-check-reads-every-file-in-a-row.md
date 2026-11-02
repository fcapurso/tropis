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
