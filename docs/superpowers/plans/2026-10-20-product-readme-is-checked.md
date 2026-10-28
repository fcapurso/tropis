# The product README is checked on every plan, and the checks that say so run — Implementation Plan

**Abandoned on 2026-10-20, not merged** (PR fcapurso/tropis#110, closed). The README design was reshaped; see the catalog entry `product-readme-is-kept-current`. Its self-check fix landed separately (PR fcapurso/tropis#111). Do not dispatch.

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover. **This plan continues an open branch and pull request; it does not start a
> new one** — see *Traps*.

**README:** no change — the framework's README names neither the plan format nor the self-check.

**Goal:** a plan waiting to run that neither lists the product's README nor says why it
needs none is refused by the dispatch command and fails the plans check, in every project
and in this repository; and the guards that check this repository's own pages run in the
self-check, fail when this repository stops looking like itself, and are shown to fail on
a planted defect. Both serve one thing: the README is kept current by a tested mechanism.

**Spec:** the entry `product-readme-is-kept-current` in `feature-catalog.yaml`, criteria 3
and 5. The first plan on this branch is
`docs/superpowers/plans/2026-10-20-product-readme-is-kept-current.md`; read its Decisions 1–6
and its *Review record*. This plan finishes what that review found.

**Why, in the developer's words (2026-10-20):** "the goal is to have a tested mechanism for
the README.md to stay up to date, and that the same mechanism applies to Tropis itself as
well as to any other project using it." The first plan made the README a rule and checked
it once with a fresh agent; nothing checked a real plan. The developer chose the plan
check below, and chose to land it in the same pull request.

**What an independent review of the branch found (2026-10-20, at `6ffa346`), each confirmed
by the specifying session:**

1. The self-check step added at review (`scripts/check-blueprint.sh`, last lines) runs
   `operator-page-closeout` and `readme-usable` on the staged tree, but both take their
   skip branch — which passes — whenever `isBlueprintTree` is false. Removing `README.md`
   from the staged tree gave `Tests: 2 passed, 2 total`, exit 0. A later rename of
   `PORTABILITY-NOTES.md` would silence both guards again.
2. The review record claims that an empty `grep -l isBlueprintTree` makes Jest exit 1.
   It does not: the substitution expands to nothing, `set -euo pipefail` does not stop
   it, and Jest runs all 25 guards against the wrong tree. That is red today only by
   accident (`9 suites / 43 tests failed`).
3. `check-conformance.sh` prints `Every guard caught its defect and passed the clean
   baseline.` before the new step runs, so a red run still shows that line. The header
   comment of `check-blueprint.sh` does not mention the new step.
4. The operator-guide row, `alters what someone developing the project is told … (commands
   named, start path, jobs, streams)`, would send a project's own developer command
   (`npm test`, a dev server) to `.tropis/README.md`, which is only about working with the
   framework. The fresh-agent check never tried a developer-only change.
5. `/never another product's/` and planning's `/operator guide/` in
   `guards/operator-page-closeout.test.js` match anywhere in their file, not in their row.

**What the specifying session verified on 2026-10-20, at `0426c37`:**

- `scripts/plan-binding.js` holds the plan rules for the dispatch command
  (`scripts/dispatch.mjs`), the isolation helper (`scripts/isolate-for-plan.mjs`) and the
  plans guard (`guards/plan-dispatchable.test.js`). `fileStructurePaths(markdown)` returns
  the first backticked path of each File Structure row. `validateDispatchable` is applied by
  the guard to **every** plan with a `## Repositories` heading, executed or not, so a new
  requirement must not go there; the guard already applies one requirement only to plans
  with no `## Handover report` (the projections check), and this plan follows that.
- In this repository, the only plan with `## Repositories` and no `## Handover report` is
  `2026-10-15-contributors-know-how-to-contribute.md`, and its File Structure lists
  `README.md`. This plan carries its own `**README:**` line above.
- Fixture plans with `## Repositories` and no handover: `fixtures/defects/undispatchable-plan/…/2026-01-02-nested-worktree.md`
  and `fixtures/defects/unpaired-projection/…/2026-01-03-unpaired-projection.md`. Each must
  fail `plan-dispatchable` for its own defect only. `fixtures/base/` has no such plan.
- `guards/dispatch.test.js` builds its plans from one template, `plan(rows)`, near the top;
  that template has no README line.
- `scripts/check-conformance.sh` lists its defect cases in `CASES` (lines 27–45) as
  `<defect>:<guard>`, each a folder under `fixtures/defects/` copied over the base project.
- `templates/framework-jest.config.js` sets `roots: ['<rootDir>/guards']`, so guard paths
  given to Jest are relative to the staged tree.
- `RELEASES.md` `## [Unreleased]` has no `### After updating: what to do by hand` section.
  `/update` reads that heading and its numbered bold leads (FW-023) and does each step not
  marked `Optional:`.
- `framework/DECISIONS.md` ends at FW-024, which is on this branch and not yet merged, so it
  may be edited.

**Model tier: Small–medium.** Every edit is given; the code steps give signatures and tests.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 6 (record which).

**Merge authority: parent review.** The specifying session reviews, then merges the whole
branch as one squash.

Do not store a kick-off prompt on this plan.

---

## Delivers

product-readme-is-kept-current

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-product-readme-checked plan/product-readme-is-kept-current` |

## Global Constraints

- **Work on the existing branch `plan/product-readme-is-kept-current` and push to it.** It
  backs the open pull request fcapurso/tropis#110. Do not create a branch, do not open a
  pull request, do not merge, do not rebase or force-push.
- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.** They hold
  the installed release.
- **Do not edit the first plan's file**, `2026-10-20-product-readme-is-kept-current.md`,
  except where Decision 10 says.
- **Do not lower, skip or delete a guard to get green.** Decisions 5, 6 and 9 change guards;
  those are the only guard changes allowed.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-20, with the developer. Do not reopen them.

1. **`framework/workflow.md`, the two README rows of the doc-closeout table.** Replace both
   rows with:

   ```
   | alters what someone developing the project is told about working with the framework (the framework commands it names, how to set up a working copy) | the project's operator guide, `.tropis/README.md` (and any guard that asserts those claims) |
   | alters what the product's users are told to do or how they start | the product's own README, usually `README.md` at the repository root. In the framework's own repository that is the framework's README, by this same row. A plan updates only the README of the product it changes, never another product's. A plan waiting to run lists `README.md` in its File Structure table or says on one line `**README:** no change — <reason>`; the dispatch command refuses it otherwise |
   ```

2. **`rules/planning.md`, step 5 of *Before finalising the table*.** Replace the step with:

   ```
   5. If the plan changes what the product's users are told to do or how they start, add
      the product's own README, `README.md`; otherwise put `**README:** no change —
      <reason>` on one line in the plan's header. The dispatch command and the plans check
      refuse a plan waiting to run that has neither. If the plan changes what someone
      developing the project is told about working with the framework, add the operator
      guide as well. They are separate rows of the doc-closeout table.
   ```

   Then check the trap below about header fields: the `**README:**` line in a plan is one
   line; this rule text wraps only because it is a rule.

3. **`scripts/plan-binding.js`.** Add, after `fileStructurePaths`:

   ```js
   /**
    * Why a plan waiting to run says nothing about the product README, or null. It must list
    * `README.md` in its File Structure table, or carry one line `**README:** no change —
    * <reason>`. Executed plans are history and are not held to this; the caller decides.
    * @param {string} markdown
    * @returns {string|null}
    */
   export function readmeCloseoutError(markdown)
   ```

   Accept the line with `—`, `–` or `-` after `no change`, and require at least one
   non-space character after the dash. Return exactly
   `Neither lists README.md in File Structure nor says why not — add **README:** no change — <reason>`
   when neither holds. `.tropis/README.md` is not `README.md`.

4. **`scripts/dispatch.mjs`.** After the `validateDispatchable` block, refuse when
   `readmeCloseoutError(markdown)` is not null: write it to stderr with a newline and exit 1,
   as that block does. The isolation helper is unchanged.

5. **`guards/plan-dispatchable.test.js`.**
   - In the per-plan test, inside a new `if (extractSection(markdown, 'Handover report') == null)`
     — not inside the `.cursor/rules` condition — add
     `expect(readmeCloseoutError(markdown)).toBeNull();`
   - Add a `describe("what a plan waiting to run says about the product README", …)` with
     these cases, each calling `readmeCloseoutError` on a small plan string:
     - lists `README.md` in File Structure → `null`
     - carries `**README:** no change — internal tooling only.` → `null`
     - carries `**README:** no change -- nothing users see.` → `null`
     - carries `**README:** no change —` with nothing after → the error string
     - lists only `.tropis/README.md` → the error string
     - neither → the error string

6. **`guards/operator-page-closeout.test.js`.** Anchor each assertion to its row or step,
   and follow Decision 1's wording:
   - operator guide: `/alters what someone developing the project is told about working with the framework[^\n]*\| the project's operator guide/`
   - product README: keep the row test, and replace `/never another product's/` with
     `/\| the product's own README[^\n]*never another product's/`
   - add to the product README test: `/\| the product's own README[^\n]*\*\*README:\*\* no change/`
   - planning: replace `/operator guide/` with
     `/5\. If the plan changes what the product's users are told[\s\S]*?add the operator\s+guide/`
     and add `/no change —\s+<reason>/`
   - In the skip branch, before `expect(blueprint).toBe(false)`, add
     `expect(process.env.TROPIS_EXPECT_FRAMEWORK ?? '').toBe('');` with the comment
     `// The self-check sets this where it runs this guard on the framework repository, so a
     layout change that stops the tree being recognised fails instead of passing silently.`
   Do the same skip-branch change in `guards/readme-usable.test.js`; nothing else in that file.

7. **Fixtures and the dispatch test.**
   - Add the line `**README:** no change — fixture.` after the title paragraph of both
     waiting fixture plans named above, so each still fails only for its own defect.
   - Create `fixtures/defects/plan-skips-readme/docs/superpowers/plans/2026-01-04-skips-readme.md`:
     a copy of the unpaired-projection fixture plan with the title `# Skips README Plan`,
     the description `A plan that claims to be dispatchable and is not: it neither lists
     README.md nor says why not. Nothing else about it is wrong.`, its isolation
     cell copied with `unpaired` replaced by `skips-readme` in both places, and a File
     Structure table whose only row is `` | `src/app.js` | One line | ``.
   - In `scripts/check-conformance.sh` add `plan-skips-readme:plan-dispatchable` to `CASES`,
     after `unpaired-projection:plan-dispatchable`.
   - In `guards/dispatch.test.js`, add `**README:** no change — example.` to the `plan(rows)`
     template after the merge-authority line, and add a test in `describe('dispatch command')`:
     `"refuses a plan that neither lists README.md nor says why not"` — a plan from the
     template with that line removed: exit 1, empty stdout, stderr contains
     `Neither lists README.md`.

8. **`scripts/check-blueprint.sh`.** Replace everything from `cd "$STAGE"` to the end of the
   file with the block below, and replace the header comment's sentence
   `so besides proving every guard can fail, the clean baseline runs every guard over the
   rules, framework documents and commands that actually ship.` with
   `so besides proving every guard can fail, the clean baseline runs every guard over the
   rules, framework documents and commands that actually ship. Then it runs the guards that
   check this repository itself, which skip on a project-shaped tree, and shows each can
   fail. Read the last line: it is the verdict.`

   ```bash
   cd "$STAGE"
   set +e
   INSTRUCTIONS="$STAGE" FIXTURES="$STAGE/fixtures" SCRIPTS="$STAGE/scripts" \
     TEST_CMD="node --experimental-vm-modules $NM/.bin/jest --config $STAGE/jest.config.js" \
     bash "$STAGE/scripts/check-conformance.sh"
   conformance=$?
   set -e

   # Guards that check the framework repository itself skip on the project-shaped tree
   # check-conformance.sh builds, so they run here, on HEAD as staged. The list is explicit:
   # a guard that calls isBlueprintTree and is missing from it is an error, and a listed
   # guard that does not exist fails to run. TROPIS_EXPECT_FRAMEWORK turns a skip into a
   # failure, and each guard must also fail on a planted defect.
   FRAMEWORK_GUARDS="operator-page-closeout readme-usable"
   framework=0
   echo
   echo "Framework repository: its own guards must pass here and fail on a planted defect"
   echo
   run_guard() { # <tree> <guard>
     FRAMEWORK_ROOT="$1" TROPIS_EXPECT_FRAMEWORK=1 \
       node --experimental-vm-modules "$NM/.bin/jest" --config "$STAGE/jest.config.js" \
       "guards/$2.test.js" >/dev/null 2>&1
   }
   for f in guards/*.test.js; do
     name="$(basename "$f" .test.js)"
     if grep -q isBlueprintTree "$f"; then
       case " $FRAMEWORK_GUARDS " in
         *" $name "*) ;;
         *) echo "  UNLISTED    $name calls isBlueprintTree; add it to FRAMEWORK_GUARDS"; framework=1 ;;
       esac
     fi
   done
   # plant <guard> <file> [line to delete]: with no line, the file is removed.
   plant() {
     local guard="$1" file="$2" line="${3:-}" tree
     if ! run_guard "$STAGE" "$guard"; then
       echo "  FAILED      $guard fails on the framework repository"; framework=1; return
     fi
     tree="$(mktemp -d "${TMPDIR:-/tmp}/blueprint-plant-XXXXXX")"
     cp -R "$STAGE/." "$tree/"
     if [ -n "$line" ]; then
       grep -vF -- "$line" "$tree/$file" > "$tree/$file.new" || true
       mv "$tree/$file.new" "$tree/$file"
     else
       rm -f "$tree/$file"
     fi
     if run_guard "$tree" "$guard"; then
       echo "  NOT CAUGHT  $guard passed with $file planted"; framework=1
     else
       echo "  caught      $guard: $file planted"
     fi
     rm -rf "$tree"
   }
   plant operator-page-closeout framework/workflow.md "the product's own README"
   plant operator-page-closeout PORTABILITY-NOTES.md
   plant readme-usable README.md "## Getting started"
   plant readme-usable PORTABILITY-NOTES.md

   echo
   if [ "$conformance" -eq 0 ] && [ "$framework" -eq 0 ]; then
     echo "Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed."
   else
     [ "$conformance" -ne 0 ] && echo "Self-check FAILED: conformance or the clean baseline (above)."
     [ "$framework" -ne 0 ] && echo "Self-check FAILED: the framework repository's own guards (above)."
     exit 1
   fi
   ```

9. **`framework/dispatch.md`** and **`commands/dispatch.md`.** Where each lists what a
   refusal names — `a missing heading, no checkout anyone may edit, or isolation that is not
   a sibling worktree` — make it `a missing heading, no checkout anyone may edit, isolation
   that is not a sibling worktree, or a plan that says nothing about the product README`.

10. **Records.**
    - `framework/DECISIONS.md`, FW-024: append to its **Decision** paragraph
      `A plan waiting to run lists README.md or carries one line, **README:** no change —
      <reason>; the dispatch command and the plans check refuse it otherwise. The check
      cannot judge the reason; it makes skipping the README a stated decision rather than an
      omission.` Replace the operator-guide sentence `The operator-guide row now says it is
      about what someone developing the project is told.` with `The operator-guide row now
      says it is about what someone developing the project is told about working with the
      framework.` Append to **Rejected**: `A reminder alone, checked once by a fresh agent —
      it leaves every real plan unchecked, which is not a tested mechanism.`
    - `framework/DECISIONS.md`: append FW-025, using the next free number if taken:

      ```
      ## FW-025: The self-check runs the guards that check the framework repository

      **Date:** 2026-10-20 · **Status:** Accepted

      **Decision:** The guards that check this repository's own pages run in
      `check-blueprint.sh` on HEAD as staged, from an explicit list that is cross-checked
      against every guard calling the repository test. A skip there is a failure, and each
      listed guard is shown to fail on a planted defect, as every conformance case is.

      **Evidence:** Until 2026-10-20 those guards ran nowhere: the conformance run builds a
      project-shaped tree, where they skip and pass, and CI runs only the self-check. A
      rewrite of one was green while untested.

      **Rejected:** Composing the framework's layout into the conformance tree — that tree is
      a set-up project by design, and every other guard reads it as one. Choosing the guards
      by searching for a function name alone — renaming it would run every guard, or none,
      against the wrong tree.

      **Consequences:** A new guard that checks this repository must be added to the list
      and given a planted defect, or the self-check names it as unlisted.
      ```
    - `RELEASES.md`, under `## [Unreleased]`: in the section `### Your product's README is
      part of every plan's closeout`, replace its last two sentences (from `The row for the
      operator guide…` to `…not a breaking change.`) with `The row for the operator guide now
      says it is about working with the framework. The dispatch command and the plans check
      now refuse a plan waiting to run that neither lists README.md nor says why it needs no
      change — see the step below.` Then add, after that section:

      ```
      ### After updating: what to do by hand

      **1. Give each plan not yet run a word on the README.** Every plan in
      `docs/superpowers/plans/` that has a `## Repositories` heading and no
      `## Handover report` must now list `README.md` in its File Structure table or carry
      one line in its header, `**README:** no change — <reason>`. Until it does, the
      project's checks fail on it and `/dispatch` refuses it.
      ```
    - The first plan's *Review record*: under *Found*, after the bullet about the guards that
      ran nowhere, add `- An independent review at 6ffa346 found the self-check fix above
      could still pass silently and gave a false reason; the follow-up plan
      2026-10-20-product-readme-is-checked.md replaced it.` Change nothing else in that file.

## Traps

- **The branch already exists and is checked out nowhere else.** The isolation command has
  no `-b`: it checks out `plan/product-readme-is-kept-current`. If it reports the branch is
  already checked out, stop and hand back — do not create another branch.
- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. After Decision 8 its verdict is its **last line**.
- **The `**README:**` line in a plan must be one line.** Plan header fields are read from
  their first line only.
- **Do not put a path in backticks under `docs/`, `scripts/` or `.claude/` that does not
  exist into framework or rule text.** `framework-integrity` fails on it. The paths this plan
  names in that text all exist.
- **Two installed rule files are in *File Structure* and must not be edited.** The installed
  dispatch (v0.3.1) asks for them because `rules/planning.md` changes; here `rules/` is
  source and nothing is generated from it.
- **The installed dispatch (v0.3.1) does not know the README line.** It accepts this plan
  without it; the line is there for this branch's own plans check.
- **The fresh-agent check needs the agent to write a plan file and run dispatch.** Rules
  reach it by file path.

## File Structure

| File | Change |
|---|---|
| `framework/workflow.md` | Decision 1 |
| `rules/planning.md` | Decision 2 |
| `scripts/plan-binding.js` | Decision 3 |
| `scripts/dispatch.mjs` | Decision 4 |
| `guards/plan-dispatchable.test.js` | Decision 5 |
| `guards/operator-page-closeout.test.js` | Decision 6 |
| `guards/readme-usable.test.js` | Decision 6, skip branch only |
| `guards/dispatch.test.js` | Decision 7 |
| `fixtures/defects/undispatchable-plan/docs/superpowers/plans/2026-01-02-nested-worktree.md` | Decision 7 |
| `fixtures/defects/unpaired-projection/docs/superpowers/plans/2026-01-03-unpaired-projection.md` | Decision 7 |
| `fixtures/defects/plan-skips-readme/docs/superpowers/plans/2026-01-04-skips-readme.md` | Decision 7, created |
| `scripts/check-conformance.sh` | Decision 7, one `CASES` line |
| `scripts/check-blueprint.sh` | Decision 8 |
| `framework/dispatch.md` | Decision 9 |
| `commands/dispatch.md` | Decision 9 |
| `framework/DECISIONS.md` | Decision 10 |
| `RELEASES.md` | Decision 10 |
| `docs/superpowers/plans/2026-10-20-product-readme-is-kept-current.md` | Decision 10, one bullet |
| `docs/superpowers/plans/2026-10-20-product-readme-is-checked.md` | Handover report only |
| `feature-catalog.yaml` | Not edited; the entry is already shipped on this branch |
| `.claude/rules/planning.md` | **Not edited.** Listed only so dispatch accepts the plan; see *Traps* |
| `.cursor/rules/planning.mdc` | **Not edited.** Same reason |

## Tasks

### Task 1: The README check

Decisions 3, 4, 5 and 7. Write the `readmeCloseoutError` cases and the dispatch test first,
run them through the self-check (commit, then `bash scripts/check-blueprint.sh`) and paste
the failing names; then implement and run it green. Paste the conformance line for
`plan-skips-readme` (`caught      plan-skips-readme …`).

### Task 2: The text and its guard

Decisions 1, 2, 6 and 9. Commit and run the self-check: green.

### Task 3: The self-check

Decision 8. Commit and run the self-check: green, ending in the `Self-check passed:` line,
with four `caught` lines in the framework-repository section. Then prove each failure path
on throwaway commits, never pushed, each dropped with `git reset --hard HEAD~1` after:

1. Restore `main`'s `framework/workflow.md` (`git show origin/main:framework/workflow.md`).
   Expected: last line `Self-check FAILED: the framework repository's own guards (above).`,
   exit 1. (The conformance part may fail too; paste what it printed.)
2. `git rm PORTABILITY-NOTES.md`. Expected: exit 1, and the framework section shows
   `FAILED      operator-page-closeout fails on the framework repository`.
3. Create `guards/zz-probe.test.js` holding two lines, `// isBlueprintTree` and
   `it('passes', () => {});`. Expected: `UNLISTED    zz-probe …` and exit 1.

Paste each result's framework section and last line.

### Task 4: Records

Decision 10. Commit and run the self-check: green.

### Task 5: On a real setup

In a scratch folder outside any repository, `git init` a project, run this branch's
`scripts/set-up-project.sh` on it, `npm --prefix .tropis install`, `npm --prefix .tropis test`:
green. Then `grep -rnF "**README:** no change" .claude .cursor`: expected hits in
`.claude/framework/workflow.md`, `.claude/rules/planning.md` and `.cursor/rules/planning.mdc`.
Commit everything. Keep the folder.

### Task 6: Fresh-agent check

Required: a framework document and a shipped rule changed. In the Task 5 project, add a
`package.json` with `"scripts": { "start": "node server.js" }`, the Greeter `README.md` from
the first plan's Task 3, and commit. Start a fresh Claude Code session and give it, in one
prompt:

> This is a probe and its output will be discarded. Write two plans under
> `docs/superpowers/plans/`, following this project's planning rules, and do not implement
> either. Plan A: contributors get an `npm run lint` script that runs ESLint on `src/`;
> users of the product see no change. Plan B: the server greets in the language of the
> request's `Accept-Language` header, falling back to English. Then run the dispatch command
> on each and tell me what it printed, which documentation pages each plan updates, and
> which instruction told you so.

**Pass:** Plan A carries a one-line `**README:** no change — <reason>` and does not list
`.tropis/README.md`; Plan B lists `README.md`; dispatch accepts both; the agent names the
planning rule's step 5 or the doc-closeout row. Then remove Plan A's README line yourself
and run dispatch on it: it must exit 1 naming `Neither lists README.md`.

**Fail:** any other outcome. Find which passage the agent did not receive or misread, fix
it, and run again. If it fails twice, stop and hand back.

Record the prompt, the answer's gist, both plans' headers and File Structure tables, the
dispatch outputs, pass or fail, and the tool, version and machine — **in this plan's
handover report**, not only a commit body, because the squash discards branch commits.
Delete the scratch folder.

### Task 7: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: the self-check's last line is `Self-check passed: …`; the project checks green;
the diff holds only the files in both plans' File Structure tables. Append `## Handover
report` to this file with the six sections the planning rules name, commit, and push to
`plan/product-readme-is-kept-current`. In *Outstanding*, say that the release note now
carries a by-hand step.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| 3 — the two README rows are told apart | Decision 1; guard (Decision 6); Task 6, Plan A |
| 5 — a plan that says nothing about the README is refused, everywhere | Decisions 3–5, 7; conformance case `plan-skips-readme`; dispatch test; Task 5 grep; Task 6 |
| The page guards run and can fail (review findings 1–3) | Decision 8; Task 3's three failure paths |

## Not in this plan

- **A README somewhere other than the root.** The check accepts `README.md` only; a project
  whose README lives elsewhere states that in its `**README:**` line. Widen it when one asks.
- **Judging the reason.** No check can tell whether `no change` is true; the reviewer can.
