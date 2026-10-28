# Dispatch asks a plan to list only files the rules command really writes — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** a plan that changes a file under a top-level `rules/` folder is dispatched without
listing `.claude/rules/` or `.cursor/rules/` files that nothing generates from it. A plan that
changes a shipped text in `.tropis/rules/` is still refused until it lists both files the
rules command writes from it.

**Spec:** the entry `dispatch-asks-only-for-files-the-rules-command-writes` in
`feature-catalog.yaml`. Read its three criteria and both comments above it.

**What the specifying session verified on 2026-10-17, against `main` with `origin/main` at
`282a64d`:**

- **`scripts/projections.js`** `projectionOf` answers "what does the rules command write from
  this file". Line 30:
  ```js
  const shipped = /^(?:\.tropis\/)?rules\/([^/]+)\.md$/.exec(path);
  ```
  The optional `.tropis/` makes a bare `rules/<name>.md` count as a shipped text too. Its doc
  comment, lines 14–15, says so on purpose:
  ```
   * - `.tropis/rules/<n>.md`, or `rules/<n>.md` in the framework's own repository (a shipped
   *   text) → its Claude Code file and its Cursor file;
  ```
- **Nothing writes from a bare `rules/`.** The generator, `scripts/generate-rules.mjs`, reads
  shipped texts only from `.tropis/rules` (line 35). In this repository `rules/` is the next
  release's source, and `.claude/` changes only by installing a release.
- **Who reads `projectionOf`:** only `scripts/plan-binding.js` (line 13 import, line 60 in
  `missingProjections`). `missingProjections` is called by `scripts/dispatch.mjs` (only when
  `.cursor/rules/` exists) and by `guards/plan-dispatchable.test.js`.
- **`guards/plan-dispatchable.test.js` lines 71–75** assert the current behaviour:
  ```js
    it("asks for both generated files of a shipped text, in a project and in the framework's own repository", () => {
      const both = ['.claude/rules/tests.md', '.cursor/rules/tests.mdc'];
      expect(missing(table('.tropis/rules/tests.md'))).toEqual(both);
      expect(missing(table('rules/tests.md'))).toEqual(both);
      expect(missing(table('rules/tests.md', ...both))).toEqual([]);
    });
  ```
- **`guards/dispatch.test.js`** runs `.tropis/scripts/dispatch.mjs` in a throwaway set-up
  project built by its `project(markdown)` helper, with helpers `plan(rows)`, `PROJECT_ONLY`,
  `PLAN` and `run(root, cmd, args)`. The case *refuses a plan that lists a rule file without
  its projection, where rules are projected* (around line 150) creates `.cursor/rules/` and
  expects a refusal naming both files. The next case is *does not hold a project that does
  not project its rules to it*.
- **The conformance fixture** `fixtures/defects/unpaired-projection/` lists
  `.claude/rules/tests.md`, not a bare `rules/` path, so it still fails as it must.
- `git grep -n "framework's own repository" -- scripts guards rules framework` finds the two
  places above (`projections.js` line 14, `plan-dispatchable.test.js` line 71) among those
  about rule generation. The others (`commands/bootstrap.md`, `framework/rule-delivery.md`,
  FW-010) are about where a project is set up and are untouched.

**Model tier: Small.** All target text is given verbatim.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.**

No fresh-agent check: nothing under `framework/` or `rules/` changes.

Do not store a kick-off prompt on this plan.

---

## Delivers

dispatch-asks-only-for-files-the-rules-command-writes

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-projections -b plan/dispatch-asks-only-for-files-the-rules-command-writes` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** `.tropis/scripts/projections.js` is the installed `v0.3.1` copy; it keeps the
  old behaviour until this repository takes the release that ships this.
- **Do not touch other plans,** including
  `2026-10-17-planning-rule-names-the-roles-dispatch-accepts.md`, which lists two files as
  "not edited" to get past this bug. Those rows stay harmless after the fix.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-17. Do not reopen them.

1. **`scripts/projections.js` line 30.** Replace with:

   ```js
   const shipped = /^\.tropis\/rules\/([^/]+)\.md$/.exec(path);
   ```

2. **`scripts/projections.js` lines 14–15.** Replace with:

   ```
    * - `.tropis/rules/<n>.md` (a shipped text) → its Claude Code file and its Cursor file.
    *   A top-level `rules/` folder is not one: nothing generates from it, and in the
    *   framework's own repository it is the next release's source;
   ```

3. **`guards/plan-dispatchable.test.js` lines 71–75.** Replace that case with these two:

   ```js
     it('asks for both generated files of a shipped text in .tropis/rules/', () => {
       const both = ['.claude/rules/tests.md', '.cursor/rules/tests.mdc'];
       expect(missing(table('.tropis/rules/tests.md'))).toEqual(both);
       expect(missing(table('.tropis/rules/tests.md', ...both))).toEqual([]);
     });

     it('asks nothing for a file under a top-level rules/ folder, which nothing generates from', () => {
       expect(missing(table('rules/tests.md'))).toEqual([]);
     });
   ```

4. **`guards/dispatch.test.js`.** Insert these two cases directly after the case *does not
   hold a project that does not project its rules to it*:

   ```js
     it('accepts a plan that lists a file under a top-level rules/ folder alone, where rules are projected', () => {
       const listed = `${plan(PROJECT_ONLY)}\n## File Structure\n\n| File | Change |\n|---|---|\n| \`rules/tests.md\` | One bullet |\n`;
       const { parent, root } = project(listed);
       try {
         mkdirSync(join(root, '.cursor/rules'), { recursive: true });
         const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
         expect(r.stderr).toBe('');
         expect(r.status).toBe(0);
       } finally {
         rmSync(parent, { recursive: true, force: true });
       }
     });

     it('refuses a plan that lists a shipped text without both files written from it', () => {
       const unpaired = `${plan(PROJECT_ONLY)}\n## File Structure\n\n| File | Change |\n|---|---|\n| \`.tropis/rules/tests.md\` | One bullet |\n`;
       const { parent, root } = project(unpaired);
       try {
         mkdirSync(join(root, '.cursor/rules'), { recursive: true });
         const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
         expect(r.status).toBe(1);
         expect(r.stdout).toBe('');
         expect(r.stderr).toContain('.claude/rules/tests.md');
         expect(r.stderr).toContain('.cursor/rules/tests.mdc');
       } finally {
         rmSync(parent, { recursive: true, force: true });
       }
     });
   ```

   If `run` returns something other than `{ status, stdout, stderr }`, or `project` has another
   name, adapt to what the file's existing cases use and say so under *Judgment calls*.

5. **`RELEASES.md`.** Under `## [Unreleased]`: if it still reads `_Nothing yet._`, replace that
   line with the section below; otherwise another plan landed first, so add the section after
   the last section already there.

   ```
   ### Dispatch no longer asks for rule files nothing generates

   A plan that changes a file under a top-level `rules/` folder is dispatched without listing
   `.claude/rules/` or `.cursor/rules/` copies of it, since the rules command writes nothing
   from that folder. A plan that changes a shipped text in `.tropis/rules/` must still list
   both files written from it. This is not a breaking change.
   ```

6. **No decision record.** The bare `rules/` form served an arrangement this repository no
   longer has; removing it is a correction, recorded in the catalog entry's comment.

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks on the repository as a project, and is not a check of this change.
- **Task 1 is red on purpose.** The new cases are written before the fix, so the two that
  expect a bare `rules/` path to be accepted must fail first. Do not fix the script in the
  same commit.
- **`npm --prefix .tropis run dispatch` in this checkout still runs the installed copy,** so
  it keeps refusing bare `rules/` paths until this repository takes the release. That is
  expected; check the fix through the self-check, not through that command.

## File Structure

| File | Change |
|---|---|
| `guards/plan-dispatchable.test.js` | Decision 3 |
| `guards/dispatch.test.js` | Decision 4 |
| `scripts/projections.js` | Decisions 1–2 |
| `RELEASES.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-17-dispatch-asks-only-for-files-the-rules-command-writes.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The checks, red

Decisions 3 and 4. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on exactly two cases, *asks nothing for a file under a top-level rules/
folder, which nothing generates from* and *accepts a plan that lists a file under a top-level
rules/ folder alone, where rules are projected*. The new refusal case for `.tropis/rules/`
passes already. Paste the failing lines.

### Task 2: The fix, green

Decisions 1 and 2. Commit, then run `bash scripts/check-blueprint.sh`: green, including the
conformance step's line for `unpaired-projection`.

### Task 3: Release note

Decision 5. Commit, then run `bash scripts/check-blueprint.sh`: green.

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
| A plan listing a bare `rules/` file is accepted, here and in a set-up project | Decision 3 second case; Decision 4 first case (a set-up project with `.cursor/rules/`) |
| A plan listing `.tropis/rules/` alone is still refused, naming both | Decision 3 first case; Decision 4 second case |
| The description no longer claims bare `rules/` is generated from | Decision 2 |

## Not in this plan

- **This repository's installed copy** (`.tropis/scripts/projections.js`) keeps the old
  behaviour until this repository takes the release that ships this.

## Handover report

### Task completion

- Task 1: done — Decisions 3 and 4 applied; committed as `66a668e`.
- Task 2: done — Decisions 1 and 2 applied; committed as `e8dc44c`.
- Task 3: done — Decision 5 applied (`_Nothing yet._` replaced); committed as `8d91a02`.
- Task 4: done — final checks below; this report committed on the branch.

### Verification results

**Task 1** — `bash scripts/check-blueprint.sh` after the red tests (commit `66a668e`):

```
Clean baseline: every guard must pass
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● dispatch command › accepts a plan that lists a file under a top-level rules/ folder alone, where rules are projected
              ● what a plan must list beside a rule source › asks nothing for a file under a top-level rules/ folder, which nothing generates from

3 problem(s). A guard that cannot fail is not evidence.
```

Those two named cases are the deliberate reds. Conformance also showed `CANNOT RUN` for `undispatchable-plan` and `unpaired-projection` because `plan-dispatchable` failed on the clean project — expected while the new cases were red. A first run briefly also named `take-version.mjs › removes its scratch folder on every exit path`; a re-run showed only the two expected cases.

**Task 2** — `bash scripts/check-blueprint.sh` after the fix (commit `e8dc44c`):

```
  caught      unpaired-projection    plan-dispatchable
…
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

(One intermediate run between commit and this green result reported an unnamed clean-baseline failure with no `●` lines; re-running the same commit was green, including `unpaired-projection` caught.)

**Task 3** — `bash scripts/check-blueprint.sh` after the release note (commit `8d91a02`): green, same shape as Task 2.

**Task 4** — both required commands:

`bash scripts/check-blueprint.sh` — exit 0; every conformance case caught; clean baseline ok.

`npm --prefix .tropis test` — exit 0:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 RELEASES.md                      |  7 ++++++-
 guards/dispatch.test.js          | 28 ++++++++++++++++++++++++++++
 guards/plan-dispatchable.test.js |  9 +++++----
 scripts/projections.js           |  7 ++++---
 4 files changed, 44 insertions(+), 7 deletions(-)
```

After this commit the plan file is also in the diff (handover only). Every path is in the File Structure table. `feature-catalog.yaml` was not edited.

### Judgment calls

None. Decisions 1–5 were applied verbatim. `run` / `project` in `guards/dispatch.test.js` already matched the shapes the plan used.

### What the plan got wrong

Nothing material. The Task 1 expectation of “exactly two” failing cases held on re-run; a transient third failure (`take-version` scratch cleanup) appeared once and did not recur.

### Outstanding

- Merge authority is **parent review** — the specifying session merges.
- The release is **not breaking** (stated in the Unreleased note).
- The reviewer promotes the catalog entry `dispatch-asks-only-for-files-the-rules-command-writes`.
- This repository’s installed `.tropis/scripts/projections.js` still has the old behaviour until a release that ships this is taken (as *Not in this plan*).

## Review record

Reviewed by the specifying session on 2026-10-17, against `ccab660`.

### Checks re-run

- **`bash scripts/check-blueprint.sh` at `ccab660`, run by the reviewer:** every conformance
  defect caught, `unpaired-projection` among them, and the clean baseline ok.
- **CI on pull request 47:** `self-check` succeeded at `ccab660`.
- **The diff checked against Decisions 1–5:** the pattern in `scripts/projections.js` now
  requires `.tropis/`, its comment says a top-level `rules/` folder is not a shipped text,
  the two guard files carry the cases as written, and the release note is verbatim.
- **`git diff --stat origin/main...HEAD`:** the four files in *File Structure* and this plan.
- **The red run** in the handover names exactly the two cases the plan said would fail. Not
  re-run: the old pattern visibly matches `rules/tests.md`, so the cases could not have
  passed against it.

### Found

- **Nothing in the change.**
- **Two failures the executor saw once each and could not reproduce:** the take-version case
  *removes its scratch folder on every exit path*, and a clean-baseline failure that named no
  case. The second one recurred in review: the self-check run after the review commit
  reported *clean baseline — a guard fails on a project with nothing wrong* with no case
  named, and the next run on the same commit was green. Neither failure names a file this
  plan changes.
  - **Four runs of the self-check on `main` (`b78d071`), with nothing else running, were
    all green.**
  - **Likely cause, not proven:** the take-version case counts every new `take-version-*`
    folder in the machine's shared temp folder as its own leftover
    (`guards/take-version.test.js` line 215). So any other process taking a version at the
    same moment fails it, for example a second self-check. Both plans' executors and this
    review ran self-checks on this machine at overlapping times. The roles executor saw the
    same case fail on a branch that does not touch projections.

### Outstanding disposition

- **Promoted to `shipped` in this branch**, with `modules` listed. Evidence per criterion:
  - *a bare `rules/` file is accepted, here and in a set-up project:* `plan-dispatchable`
    › *asks nothing for a file under a top-level rules/ folder…*, and `dispatch` › *accepts a
    plan that lists a file under a top-level rules/ folder alone…*, which runs the command
    in a set-up project;
  - *a `.tropis/rules/` file alone is still refused, naming both:* `plan-dispatchable` ›
    *asks for both generated files of a shipped text in .tropis/rules/*, and `dispatch` ›
    *refuses a plan that lists a shipped text without both files written from it*;
  - *the description no longer claims bare `rules/` is generated from:* the comment in
    `scripts/projections.js`.
- **The intermittent failures above:** pre-existing and not caused by this change. The likely
  cause is recorded above, unproven. Left to the developer whether to capture it as a bug;
  not routed as a learning, since the cause is not proven.
- **This repository's installed copy** keeps the old behaviour until it takes the release
  that ships this. The roles plan's two "not edited" rows stay harmless either way.

### Learnings routed

- None. The defect was an assumption that outlived the arrangement it served, and the
  catalog entry's comment records it.

### Merged because

The self-check is green when re-run here and in CI, and the change is exactly the plan's.
The intermittent clean-baseline failure predates this change, and its likely cause is in the
take-version guard.
