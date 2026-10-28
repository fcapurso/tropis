# The planning rule names the repository roles that dispatch accepts — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** a plan written the way the planning rule says is accepted by the dispatch
script. The rule stops naming the role "edit here", which the script refuses, and names
"execute here", which it requires. A check keeps the rule's example table dispatchable.

**Spec:** the entry `planning-rule-names-the-roles-dispatch-accepts` in
`feature-catalog.yaml`. Read its three criteria and the comment above them.

**What the specifying session verified on 2026-10-17, against `main` at `4027f73`:**

- **The rule.** `rules/planning.md`, section *A plan names the checkouts it may touch*:
  - lines 78–80:
    ```
    Every plan carries `## Repositories`: one row per checkout, its role — edit here, edit here
    too, or do not edit — and where the work happens. A project set up by this framework lives
    in one repository, so the table usually has one row: that repository, edit here. A plan
    ```
  - line 93, the example table's first row: checkout `` `the-project` ``, role `edit here`,
    and a sibling-worktree command in the isolation cell. (Not quoted here: see *Traps*.)
  - and section *Verification covers every checkout the plan edits*, line 146:
    ```
    A plan with two edit-here rows needs verification commands for **both**. Naming a checkout
    ```
- **The script.** `scripts/plan-binding.js` `validateDispatchable` (from line 119) refuses a
  plan with no row whose role matches `/execute here/i` (line 127), skips the isolation check
  for a row whose role matches `/do not edit/i` (line 132), and refuses any
  `git worktree add` command in the plan that is not an isolation cell of the table (lines
  143–148). `parseRepositories` skips the header row and the `|---|` row. `extractSection`
  reads from `## <heading>` to the next `## `.
- **Everything else already says "execute here":** `guards/dispatch.test.js`, both plans under
  `fixtures/defects/*/docs/superpowers/plans/`, `commands/flush-upstream.md` line 51, and all
  18 plans in `docs/superpowers/plans/` that have a Repositories table. No file outside
  `rules/planning.md` says "edit here" or "edit-here":
  `git grep -niE 'edit here|edit-here' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md`
  finds only the four lines above.
- **`guards/plan-dispatchable.test.js`** imports `extractSection`, `validateDispatchable` and
  `missingProjections` from `../scripts/plan-binding.js`, and defines
  `const here = dirname(fileURLToPath(import.meta.url))`. It is not copied into set-up
  projects (`scripts/set-up-project.sh` lines 68–71 copy other guards), so it runs only in
  the self-check, where `here` is the staged `guards/` folder and `../rules/planning.md` is the
  staged rule. The conformance step runs this guard against the fixtures
  `undispatchable-plan` and `unpaired-projection` and expects it to fail there; the new case
  below does not change that, because it reads the rule beside the guard, not the fixture.

**Model tier: Small.** All target text is given verbatim.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** This changes a shipped rule.

Do not store a kick-off prompt on this plan.

---

## Delivers

planning-rule-names-the-roles-dispatch-accepts

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-plan-roles -b plan/planning-rule-names-the-roles-dispatch-accepts` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They hold the installed `v0.3.1`, including its own copy of the planning rule.
  This change reaches them when this repository takes the release that ships it.
- **Do not change `scripts/plan-binding.js`.** The rule moves to the script's word, not the
  other way round.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-17. Do not reopen them.

1. **`rules/planning.md` lines 78–80.** Replace with:

   ```
   Every plan carries `## Repositories`: one row per checkout, its role — execute here,
   execute here too, or do not edit — and where the work happens. A project set up by this
   framework lives in one repository, so the table usually has one row: that repository,
   execute here. A plan
   ```

   The line after (`that also edits another repository — …`) stays as it is.
2. **`rules/planning.md` line 93.** Replace `| edit here |` with `| execute here |` in that row.
   Nothing else in the row changes.
3. **`rules/planning.md` line 146.** Replace `two edit-here rows` with `two execute-here
   rows`. Re-wrap the paragraph only if the line now exceeds the width of its neighbours.
4. **The check.** Append to `guards/plan-dispatchable.test.js`:

   ```js
   describe("the planning rule's example Repositories table", () => {
     it('is accepted by the dispatch script', () => {
       const rule = readFileSync(resolve(here, '../rules/planning.md'), 'utf8');
       const lines = rule.split('\n');
       const start = lines.findIndex((l) => /^\|\s*Checkout\s*\|\s*Role\s*\|\s*Isolation\s*\|/.test(l));
       expect(start).toBeGreaterThan(-1);
       const table = [];
       for (let i = start; i < lines.length && lines[i].trim().startsWith('|'); i++) table.push(lines[i]);
       const plan = [
         '## Delivers', 'None.',
         '## Repositories', table.join('\n'),
         '## Global Constraints', 'None.',
         '## Traps', 'None.',
       ].join('\n\n');
       expect(validateDispatchable(plan).errors).toEqual([]);
     });
   });
   ```

   It builds the smallest plan the script accepts around the rule's own example table, so it
   fails on any role, isolation or heading rule the example breaks, with the script's own
   error message.
5. **`RELEASES.md`.** Under `## [Unreleased]`: if it still reads `_Nothing yet._`, replace that
   line with the section below; otherwise add the section after the last section already
   there.

   ```
   ### The planning rule names the roles dispatch accepts

   The planning rule told plan writers to mark the working checkout "edit here", and the
   dispatch command refused any plan without an "execute here" row. The rule now says
   "execute here" and "execute here too", which is what the command always required. Plans
   that dispatch today are unaffected. This is not a breaking change.
   ```

6. **No decision record.** The only alternative, changing the script to accept "edit here",
   would have changed the script, its tests, two fixtures, a command and every existing plan
   to fix one rule. The catalog entry's comment records that.

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks on the repository as a project, and is not a check of this change.
- **Task 1 is red on purpose.** The new case is written before the rule is fixed, so it must
  fail first, naming `Repositories must include an execute here row`. Do not fix the rule in
  the same commit.
- **Two File Structure rows are not to be edited.** The dispatch script reads any
  `rules/<name>.md` as a shipped rule that a project generates into `.claude/rules/` and
  `.cursor/rules/`, and refuses a plan that does not list both. In this repository `rules/`
  is the next release's source and nothing is generated from it, so the two rows exist only
  to get past that check. Leave both files untouched; their absence from the diff is expected.
- **This plan quotes a worktree command only in its Repositories table.** The rule's example
  command is described in words above, never quoted as a command, because the plan check
  refuses any worktree command that is not in this plan's own table. Keep it that way in the
  handover report.

## File Structure

| File | Change |
|---|---|
| `guards/plan-dispatchable.test.js` | Decision 4 |
| `rules/planning.md` | Decisions 1–3 |
| `.claude/rules/planning.md` | **Not edited.** Listed only so dispatch accepts the plan; see *Traps* |
| `.cursor/rules/planning.mdc` | **Not edited.** Same reason |
| `RELEASES.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-17-planning-rule-names-the-roles-dispatch-accepts.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The check, red

Decision 4. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on *the planning rule's example Repositories table › is accepted by the
dispatch script*, with the error `Repositories must include an execute here row`. Nothing else
fails. Paste the failing lines.

### Task 2: The rule, green

Decisions 1–3. Then run:

```bash
git grep -niE 'edit here|edit-here' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md
```

Expected: no output. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: Release note

Decision 5. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 4: Fresh-agent check

`rules/` changed, so this is required. In a scratch folder outside any repository, `git init`
a project, run this branch's `scripts/set-up-project.sh` on it, then `npm --prefix .tropis ci`
(or `install`) in it. Confirm `.claude/rules/planning.md` there says "execute here". Then
start a fresh Claude Code session in the scratch project and give it, in one prompt:

> This is a probe and its output will be discarded. Write a plan file at
> `docs/superpowers/plans/2026-01-01-probe.md` for an invented change: add a line to
> `README.md` saying the project has no README yet. Follow this project's planning rules
> for the plan's headings and its Repositories table. Do not execute the plan.

Then, in the scratch project:

```bash
node .tropis/scripts/dispatch.mjs docs/superpowers/plans/2026-01-01-probe.md
```

**Pass:** the script prints a kick-off prompt, not an error. **Fail:** it prints a
Repositories error; read what role the agent wrote and why, fix the rule, and run again.

Record the prompt, the Repositories table the agent wrote, the script's first output line,
pass or fail, and the tool, version and machine, in a commit body on the branch. Delete the
scratch folder.

### Task 5: Handover

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
| The rule names execute here, execute here too, do not edit, and never edit here | Decisions 1–3; Task 2 grep |
| A plan copied from the rule's example is accepted | Decision 4 case; Task 4 |
| A check fails if the example carries a refused role | Decision 4 case, seen red in Task 1 |

## Not in this plan

- **This repository's installed copy of the rule** (`.claude/rules/planning.md`) keeps saying
  "edit here" until this repository takes the release that ships this.

## Handover report

### Task completion

| Task | Status |
|---|---|
| 1 — The check, red | Done — commit `02cc681`; guard failed on `Repositories must include an execute here row` as expected |
| 2 — The rule, green | Done — commit `dfcfb56`; grep in scope found no `edit here` / `edit-here` |
| 3 — Release note | Done — commit `8574f4c` |
| 4 — Fresh-agent check | Done — commit `a38770d` (empty); **PASS** — Claude Code **2.1.300** on `dev-laptop.local`; dispatch first line was kick-off tier/requires, not a Repositories error |
| 5 — Handover | Done — this section and commit on the branch |

No tasks skipped.

### Verification results

**`bash scripts/check-blueprint.sh`**

```
Checking a38770d of ~/src/tropis-plan-roles

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

Exit code: **0**.

**`npm --prefix .tropis test`**

```
> tropis-take-v031-framework@1.0.0 test
> node --experimental-vm-modules node_modules/.bin/jest

PASS guards/project-layout.test.js
PASS guards/rule-areas.test.js
PASS guards/catalog-entries.test.js
PASS guards/rules-generated.test.js
PASS guards/installed-files.test.js

Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.897 s
Ran all test suites.
```

Exit code: **0**.

**`git diff --stat origin/main...HEAD`** (before this handover commit; branch at `a38770d`)

```
 RELEASES.md                      |  7 ++++++-
 guards/plan-dispatchable.test.js | 18 ++++++++++++++++++
 rules/planning.md                | 11 ++++++-----
 3 files changed, 30 insertions(+), 6 deletions(-)
```

After the handover commit, the diff also includes this plan file (handover only).

### Scope

Every changed path is listed in *File Structure*:

- `guards/plan-dispatchable.test.js` — Decision 4 guard
- `rules/planning.md` — Decisions 1–3
- `RELEASES.md` — Decision 5
- `docs/superpowers/plans/2026-10-17-planning-rule-names-the-roles-dispatch-accepts.md` — handover report only (this section)
- `.claude/rules/planning.md`, `.cursor/rules/planning.mdc`, `feature-catalog.yaml` — **not edited** (expected absence from diff except plan)

Commit `a38770d` is empty (no file diff); fresh-agent evidence is in its message body.

### Judgment calls

None beyond the plan. Task 4 used `npm --prefix .tropis install` in the scratch project when `npm ci` failed (no lockfile in a fresh set-up); dispatch and rule inspection did not require `node_modules`.

### What the plan got wrong

Nothing material. The `take-version` scratch-folder case in `check-blueprint.sh` flaked once on earlier tasks (Task 3 report); this handover run passed on the first attempt.

### Outstanding

- **Release:** not breaking — existing dispatchable plans stay valid; the Unreleased note in `RELEASES.md` states this.
- **Catalog:** executor did not edit `feature-catalog.yaml`; the **reviewer promotes** `planning-rule-names-the-roles-dispatch-accepts` to `shipped` on merge.
- **Installed rule:** `.claude/rules/planning.md` in this repository still says "edit here" until this repo takes the release that ships `rules/planning.md`.

## Review record

Reviewed by the specifying session on 2026-10-17, against `c13beaf`, after rebasing onto
`4d2241f` (the dispatch projection fix).

### Checks re-run

- **`bash scripts/check-blueprint.sh` at `c13beaf`, run by the reviewer:** every conformance
  defect caught, and the clean baseline ok.
- **`npm --prefix .tropis test`:** 28 passed.
- **`git grep -niE 'edit here|edit-here' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md`:**
  no output.
- **`git diff --stat origin/main...HEAD`:** `RELEASES.md`, `guards/plan-dispatchable.test.js`,
  `rules/planning.md` and this plan, all in *File Structure*. The two "not edited" rows are
  absent from the diff, as intended.
- **The new case seen red:** before the plan was dispatched, the reviewer ran the same
  table-extraction logic against the unfixed rule and got
  `Repositories must include an execute here row`; against the fixed table, no errors. The
  handover reports the same red at `02cc681`.
- **The fresh-agent check** (commit `354f5e4`, Claude Code 2.1.300 on
  dev-laptop.local): the agent wrote an `execute here` row and dispatch printed a
  kick-off prompt. It exercised the clause the change rewrote.

### Found

- **The plan's verbatim text for Decision 1 split a paragraph.** It ended its replacement
  with "A plan" on a short line before the unchanged continuation. The reviewer rejoined the
  paragraph in `c13beaf`, with no wording changed. The fix is mechanical; the developer's
  reading of the rule is the check on it.
- **The release note conflicted with the projection fix's note on rebase.** Both sections
  were kept, as Decision 5 provides when another plan lands first.
- **The intermittent take-version failure the executor saw** is the one recorded in the
  projection fix's review record, with its likely cause there.

### Outstanding disposition

- **Promoted to `shipped` in this branch**, with `modules` listed. Evidence per criterion:
  - *the rule names execute here, execute here too, do not edit, and never edit here:* the
    grep above, and the diff of `rules/planning.md`;
  - *a plan copied from the rule's example is accepted:* `plan-dispatchable` › *the planning
    rule's example Repositories table › is accepted by the dispatch script*, and the
    fresh-agent check;
  - *a check fails if the example carries a refused role:* the same case, seen red.
- **This repository's installed rule** still says "edit here" until it takes the release
  that ships this.
- **The squash message** is written explicitly, without the branch commits' trailers.

### Learnings routed

- **A plan's verbatim replacement must end at a line boundary of the text it replaces.**
  This one ended mid-paragraph and left a broken line. It is a slip in this plan, not a gap
  in the planning rule, so it is not routed.

### Merged because

Both checks are green after the rebase, the fresh-agent check passed on the clause that
changed, and the only defect found was a line break, fixed and declared above.
