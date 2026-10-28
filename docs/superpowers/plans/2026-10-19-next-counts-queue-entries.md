# The backlog report counts upstream queue entries and calls them entries — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** the queue section of `/next` reads "1 entry" or "3 entries", counting each dated
top-level line once and none of the parts indented under it.

**Spec:** the entry `next-counts-queue-entries` in `feature-catalog.yaml`. Read its three
criteria and the comment above it.

**What the specifying session verified on 2026-10-19, against `main` at `37e068e`:**

- **The report.** `scripts/next.mjs`, in the block guarded by `existsSync(queuePath)`
  (`queuePath` is `docs/BLUEPRINT-UPSTREAM.md`), counts and prints:
  ```js
    const entries = [...text.matchAll(/^- \d{4}-\d{2}-\d{2} —/gm)];
    if (flush) {
      console.log(`  ${entries.length} lesson(s); last flushed ${flush[1]}`);
    } else {
      console.log(`  ${entries.length} lesson(s); no "Last flushed" date found`);
    }
  ```
- **Counting already skips parts.** The pattern is anchored at the start of a line with the
  `m` flag and needs `- ` there, so an indented part (`  - 2026-10-02 — …`, the format
  `commands/capture-learning.md` gives: "a dated line names the purpose, and each change is a
  part indented beneath it, in the same format") does not match. Only the noun is wrong: a
  queue line may be a capability, not a lesson, and "lesson(s)" names neither entries nor
  parts. No test covers the queue section: `git grep -n "BLUEPRINT-UPSTREAM\|lesson" guards/`
  finds nothing in `guards/next-report.test.js`.
- **The test file.** `guards/next-report.test.js` has a helper
  `stageReport(catalog, bands)` that copies `next.mjs`, `next-work.js` and `board-bands.js`
  into a scratch `.tropis/scripts/`, writes the catalog and optional bands, links
  `node_modules`, runs the report and returns the `spawnSync` result. Its body links
  `node_modules` with the line
  `symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));` just before
  running. `CATALOG` (a two-entry catalog) is defined above the `describe`.
- **Nothing else prints the count.** `git grep -n "lesson(s)"` outside `docs/superpowers/`
  and the installed `.tropis/` finds `scripts/next.mjs` and one band's evidence line in
  `docs/backlog-board/bands.yaml`, which records the defect and stays as it is.

**Model tier: Small.** All target text is given verbatim.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** The four entries for the next release are merged by the
specifying session in one pass, which also promotes each entry.

No fresh-agent check: nothing under `framework/` or `rules/` changes.

Do not store a kick-off prompt on this plan.

---

## Delivers

next-counts-queue-entries

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-next-entries -b plan/next-counts-queue-entries` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They are the installed `v0.3.1`.
- **Do not touch other plans.**
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. No co-author or tool-attribution trailer in any commit.

## Decisions

Taken by the specifying session on 2026-10-19. Do not reopen them.

1. **`guards/next-report.test.js`, the helper.** Give `stageReport` a third parameter,
   `queue`, and write it as the upstream queue when given. Change its signature to
   `function stageReport(catalog, bands, queue) {` and insert, directly before its
   `symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));` line:

   ```js
     if (queue !== undefined) {
       mkdirSync(join(dir, 'docs'), { recursive: true });
       writeFileSync(join(dir, 'docs/BLUEPRINT-UPSTREAM.md'), queue);
     }
   ```

   Existing callers pass two arguments and are unaffected.

2. **`guards/next-report.test.js`, the case.** Insert directly after the case *prints no
   retired-layer notice when the catalog has no blueprint entries*:

   ```js
     it('counts upstream queue entries, not their parts, and calls them entries', () => {
       const queue = `# Upstream queue

   Last flushed: 2026-10-01

   - 2026-10-02 — First purpose.
     - 2026-10-02 — A part of the first.
     - 2026-10-02 — Another part of the first.
   - 2026-10-03 — Second purpose.
   - 2026-10-04 — Third purpose.
   `;
       const many = stageReport(CATALOG, undefined, queue);
       expect(many.stderr).toBe('');
       expect(many.stdout).toContain('Waiting in the upstream queue\n  3 entries; last flushed 2026-10-01\n');

       const one = stageReport(CATALOG, undefined, '- 2026-10-02 — Only purpose.\n  - 2026-10-02 — Its part.\n');
       expect(one.stderr).toBe('');
       expect(one.stdout).toContain('Waiting in the upstream queue\n  1 entry; no "Last flushed" date found\n');
     });
   ```

   The template literal's lines start at column 0 inside the file, as shown: the queue text
   must not inherit the test's indentation, or no line would be top-level.

3. **`scripts/next.mjs`.** Replace the five lines from `if (flush) {` to the closing `}` of
   its `else` in the queue block with:

   ```js
     // Top-level dated lines only: a part is indented under its entry and is not counted.
     const count = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
     if (flush) {
       console.log(`  ${count}; last flushed ${flush[1]}`);
     } else {
       console.log(`  ${count}; no "Last flushed" date found`);
     }
   ```

   Leave the `entries` pattern as it is.

4. **`RELEASES.md`.** Under `## [Unreleased]`, add this section after the last section
   already there:

   ```
   ### The backlog report counts queue entries

   `/next` now says how many entries wait in the upstream queue — "1 entry", "3 entries" —
   instead of calling each one a lesson. Parts indented under an entry are not counted, as
   before. This is not a breaking change.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks, and is not a check of this change.
- **Task 1 is red on purpose.** Both assertions on stdout fail against "lesson(s)". The parts
  are already not counted, so the count itself (3, 1) is right before the fix; only the noun
  turns the case green. Do not change the pattern.
- **A take-version case may fail once and not again** when another self-check runs at the
  same moment on the same machine. Re-run once before diagnosing; report it if it recurs.
- **`RELEASES.md` may conflict on rebase.** Other plans add sections under `## [Unreleased]`
  too. Keep every section.

## File Structure

| File | Change |
|---|---|
| `guards/next-report.test.js` | Decisions 1–2 |
| `scripts/next.mjs` | Decision 3 |
| `RELEASES.md` | Decision 4 |
| `docs/superpowers/plans/2026-10-19-next-counts-queue-entries.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The check, red

Decisions 1 and 2. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on exactly the new case, with stdout showing `3 lesson(s)`. Paste the failing
lines.

### Task 2: The fix, green

Decision 3. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: Release note

Decision 4. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 4: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. In *Outstanding*, say that the release is not breaking and that the reviewer promotes
the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Counts top-level dated lines and calls them entries, "1 entry" and "3 entries" | Decision 2: both assertions |
| An indented part is not counted | Decision 2: three entries holding two parts count as 3; one entry holding one part counts as 1 |
| `guards/next-report.test.js` covers a queue with parts | Decision 2 |

## Handover report

### Task completion

- **Task 1** — done (`01263b9`): `stageReport` third argument and the new queue case.
- **Task 2** — done (`b86e151`): `scripts/next.mjs` entry/entries wording.
- **Task 3** — done (`cab3c49`): `RELEASES.md` unreleased section.
- **Task 4** — this report (`cab3c49` base, handover commit follows).

### Verification results

**Task 1 — `bash scripts/check-blueprint.sh` after `01263b9` (red, as expected):**

```
Clean baseline: every guard must pass
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● backlog report › counts upstream queue entries, not their parts, and calls them entries
```

Jest on the staged tree at `01263b9` (`guards/next-report.test.js`, `-t "counts upstream queue entries"`):

```
Expected substring: "Waiting in the upstream queue
  3 entries; last flushed 2026-10-01
"
Received string:    "...Waiting in the upstream queue
  3 lesson(s); last flushed 2026-10-01
..."
```

**Task 2 — `bash scripts/check-blueprint.sh` after `b86e151`:** first run reported `FAILED clean baseline` with no test name (likely the take-version flake the plan names). A re-run on the same commit passed:

```
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

**Task 3 and Task 4 — after `cab3c49`:**

```
Every guard caught its defect and passed the clean baseline.
```

`npm --prefix .tropis test`:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

Machine: the developer's MacBook Pro, Darwin 25.2.0, Node from the worktree's `.self-check/` and `.tropis/` installs (2026-10-19).

### Scope

`git diff --stat origin/main...HEAD` before the handover commit:

```
 RELEASES.md                |  6 ++++++
 guards/next-report.test.js | 26 +++++++++++++++++++++++++-
 scripts/next.mjs           |  6 ++++--
 3 files changed, 35 insertions(+), 3 deletions(-)
```

Every changed file is in *File Structure*; `feature-catalog.yaml` was not edited.

### Judgment calls

- Commits were written with `git commit-tree` so branch history has bodies and no
  `Co-authored-by: Cursor` trailer the commit tool injects (plan Global Constraints).
- Re-ran `bash scripts/check-blueprint.sh` once when Task 2's first run failed the clean
  baseline without naming a test; the second run was green on the same commit.

### What the plan got wrong

Nothing found against the code at execution time.

### Outstanding

- **Merge authority is parent review.** Branch `plan/next-counts-queue-entries` in worktree
  `~/src/tropis-next-entries`. Not merged.
- **Catalog:** the reviewer promotes `next-counts-queue-entries` to `shipped` at merge.
- **Release:** not breaking (stated in `RELEASES.md` and matches behaviour).

## Review record

Reviewed by the specifying session on 2026-10-19.

### Checks re-run

- **The guard re-broken:** the branch's tree staged with `origin/main`'s `scripts/next.mjs`,
  then `jest guards/next-report.test.js`: `1 failed, 8 passed`, the failure being *counts
  upstream queue entries, not their parts, and calls them entries*. Node v22.15.0 on
  dev-laptop.local, Darwin 25.2.0.
- **`bash scripts/check-blueprint.sh`** on the rebased head with this record, before merging;
  CI's `self-check` runs on the pull request as well.
- **The diff against the plan:** Decisions 1–4 verbatim. `git diff --stat origin/main...HEAD`:
  the three files in *File Structure*, this plan, and `feature-catalog.yaml` for the promotion.

### Found

- Nothing in the change. The one clean-baseline failure the executor saw once is the
  take-version race named in *Traps*; it ran while three other self-checks were running.

### Outstanding disposition

- **Promoted to `shipped` in this commit**, with `modules: [scripts/next.mjs]`. Evidence: all
  three criteria by `next-report` › *counts upstream queue entries, not their parts, and calls
  them entries* — "3 entries" for three entries holding two parts, "1 entry" for one entry
  holding one part — red with the old script as above. The entry skipped `building`: the
  plans were dispatched without the status change.
- **Not breaking:** confirmed.

### Learnings routed

- None. The defect was a word.

### Merged because

The change is exactly the plan's, and its one case goes red without it.
