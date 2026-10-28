# A project adds to a shipped rule in its own file — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 7 is a handover to the developer: it stops the
> plan until a Cursor check has been run and recorded.

**Goal:** In a set-up project, a project adds clauses to a shipped rule by writing
`.claude/rule-additions/<name>.md`; `npm --prefix .framework run rules` joins them after
the shipped text, under a fixed separator that says the additions win and that an agent
following one over a shipped clause tells the operator, in the one Claude Code file and the
one Cursor file for that rule.

**Spec:** the entry `shipped-rules-have-project-companions` in `feature-catalog.yaml` — its
ten acceptance criteria and the comment above it, which records every decision. The evidence
behind them: `docs/superpowers/specs/2026-10-08-blueprint-update-model-finding.md` section 3
(a companion measured once in Claude Code: one rule set, precedence taken from one sentence)
and `docs/superpowers/specs/2026-10-15-rule-tooling-finding.md` (no rule-sync tool joins a
companion; the criteria this entry's were written from). Read all three first. The generator
this plan extends was built by `docs/superpowers/plans/2026-10-15-rule-areas-are-project-data.md`;
read its *Decisions* for the shape it already has.

**What this delivers:** `shipped-rules-have-project-companions`, all ten criteria. See
*Criteria and their evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `c2ad965`:**

- **The generator** is `scripts/generate-rules.mjs` (installed at
  `.framework/scripts/generate-rules.mjs`, root two levels up). It reads the shipped texts
  from `.framework/rules/*.md`, the areas from `.claude/rule-areas.json`, and the project's
  own rules from `.claude/rules/*.md` (those without the hash line). It collects every
  problem first and, if there is any, prints `rules: nothing written.` and the list, and
  exits 1 — in check mode too, before any comparison. Otherwise it builds a map of
  path → expected text: for each shipped rule `renderClaude(areas[name], text)` and
  `renderCursor(name, areas[name], text)`; for each own rule `renderCursor(name, paths, body)`.
  `--check` compares that map with disk and names each file *missing*, *stale*, *edited by
  hand* or *extra*.
- **The pure half** is `scripts/rule-areas.js`: `parseRule`, `areaProblems`,
  `renderClaude(globs, text)`, `renderCursor(name, globs, body)`, `checkStamp(text)`. Both
  renderers call `trimEnd()` on the text and append the hash line, which fingerprints
  everything above it — so any change to the text, additions included, changes the hash.
- **The plan check** is `scripts/projections.js` › `projectionOf(path)`, read by
  `scripts/plan-binding.js` › `missingProjections` (used by `/dispatch` and
  `guards/plan-dispatchable.test.js`). It maps `.claude/rules/<n>.md` →
  `[.cursor/rules/<n>.mdc]`; `.framework/rules/<n>.md` and `rules/<n>.md` →
  `[.claude/rules/<n>.md, .cursor/rules/<n>.mdc]`; anything else → `[]`.
- **The guards:** `guards/rules-generated.test.js` (installed into projects) runs the check
  mode against `FRAMEWORK_ROOT` or the project root, checks every `.mdc`'s front matter, and
  unit-tests the renderers. `guards/set-up-project.test.js` runs the real setup on scratch
  repositories and asserts `.claude/rules/` and `.cursor/rules/` hold exactly the shipped
  rule names. `guards/framework-integrity.test.js` fails any backticked path under
  `src/ docs/ scripts/ .claude/ .github/` in the installed rules, framework documents,
  commands and `CLAUDE.md` that does not exist — **skipping any path containing `*`, `<`
  or `>`**.
- **The self-check:** `scripts/check-conformance.sh` › `compose()` copies `fixtures/base`,
  installs the shipped scripts, runs `install_instructions` when `INSTRUCTIONS` is set
  (which overwrites `.framework/rules/` with `rules/*.md` and the areas file with the
  template), runs the generator, **then** overlays the defect folder. `CASES` maps each
  defect folder to the guard that must fail on it.
- **Setup** (`scripts/set-up-project.sh`) never mentions `.claude/rule-additions/`.
- **Claude Code loads `.md` files from `.claude/rules/`**, and one with no `paths:` header
  in every session (FW-009; `bootstrap.md` Step 6). It has never been measured whether a
  file under `.claude/rule-additions/` is loaded by anything — Task 6 measures it.
- **What a measured companion did** (update-model finding, section 3): a fresh Claude Code
  session given a shipped `tests.md` and a `tests.project.md` applied them as one list and,
  asked about a conflict, said it would follow the project file, citing that file's opening
  sentence. A genuine conflict was never run, and no Cursor agent was asked.

**Model tier: Medium.** The design, the separator text and the refusals are given verbatim
below; the work is a focused change to two scripts, guards, fixtures and about ten pages.

**Requires:** any current Claude Code CLI for Tasks 6 and 8, and the developer at the Cursor application for Task 7 (record which).

**Merge authority: parent review.** It changes the rule every set-up project's agents
receive, and two criteria rest on agent behaviour.

Do not store a kick-off prompt on this plan.

---

## Delivers

shipped-rules-have-project-companions

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-rule-additions -b plan/shipped-rules-have-project-companions` |
| worked example (`first-adopter`) | do not edit | |

## Global Constraints

- **Do not reopen a decision under *Decisions*.** If one cannot be built as written, stop
  and report.
- **Do not edit `.claude/` or `.framework/` in this repository** — the installed release.
- **No migration code**, and nothing that moves an existing project's edits out of a shipped
  rule — that is `harness-adopts-the-update-model`'s.
- **No new dependency.** Node built-ins only.
- **A rule with no additions file is written byte for byte as today.** Every existing
  generated file in a project with no `.claude/rule-additions/` must be unchanged.
- **Do not fix `plan-checks-pair-only-generated-sources`** (the `rules/<n>.md` mapping in
  `projections.js`). It is its own entry; add the new mapping beside it and leave it alone.
- **Do not touch `templates/CLAUDE.md`'s sentences on how rules arrive** (the paragraph
  beginning "Area rules under `.claude/rules/` reach you") — `entry-file-says-how-rules-arrive`.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken in shaping with the developer on 2026-10-15; do not reopen them.

1. **Rules only.** Additions to a framework document go in the project's own `CLAUDE.md`
   (every session loads it; the project owns it); the pages say so and nothing else is built
   for them. Commands are out: they already carry `project-owned: begin/end` regions.
2. **Where additions live:** `.claude/rule-additions/<name>.md`, where `<name>` is a shipped
   rule's name. Plain text, no header — the area is the shipped rule's, from
   `.claude/rule-areas.json`. Not in `.claude/rules/`, because Claude Code would load the
   file there by itself, and with no header in every session.
3. **The join.** For a shipped rule with additions, the text handed to both renderers is:
   the shipped text with trailing whitespace removed, a blank line, the separator (Decision
   4), a blank line, the additions trimmed at both ends, and a newline. An additions file
   that is empty or only whitespace counts as absent. With no additions the text is passed
   through untouched.
4. **The separator**, exactly — export it as `ADDITIONS_SEPARATOR` from
   `scripts/rule-areas.js`:

   ```
   ## This project's additions to the rule above

   The text above is the framework's rule. The text below is this project's own addition to it. Where the two contradict, follow the text below, and tell the operator which clause above you set aside and why.
   ```

   The project's additions win (the developer's ruling). A contradiction cannot be detected
   mechanically, so telling the operator is the agent's job, asked of it here.
5. **Refusals.** The generator adds a problem — so it writes nothing and exits 1, in check
   mode too — for an additions file:
   - named for no shipped rule but for one of the project's own rules:
     `"<name>" is this project's own rule — add to .claude/rules/<name>.md itself`;
   - named for no rule at all:
     `no shipped rule is named "<name>" (shipped: <comma-separated names>) — rename the file after one, or move its text into a rule of your own in .claude/rules/`;
   - beginning (after any leading whitespace) with a `---` line:
     `an additions file carries no header — its area is the shipped rule's, set in .claude/rule-areas.json. Delete the header.`

   Each message is prefixed with the file's path, as the existing problems are. Only `.md`
   files in the folder are read; anything else is ignored.
6. **No new check.** The hash line already covers the joined text, so a changed additions
   file makes its two generated files *stale* in `--check`. The plan check learns one
   mapping: `projectionOf('.claude/rule-additions/<n>.md')` →
   `['.claude/rules/<n>.md', '.cursor/rules/<n>.mdc']`.
7. **A project's own rules get no additions file** — Decision 5's first message.
8. **A decision record, FW-013,** in `framework/DECISIONS.md`, in the shape of FW-012:
   the decision (Decisions 2–5); evidence (the update-model finding's companion measurement,
   the rule-tooling finding's N7 row, this plan's Task 6 and Task 7 results); rejected — a
   companion beside the rule in `.claude/rules/` (loaded by itself, and written as a second
   rule by Cursor and every surveyed tool), companions for framework documents imported from
   `CLAUDE.md` (the project's `CLAUDE.md` already holds them, and an `@` import is not
   expanded by every tool), the shipped rule winning (a project with a real reason to differ
   would edit the shipped file again), detecting conflicts mechanically (not possible);
   consequences — a project can quietly override a framework lesson, and the separator makes
   the agent say so when it does.

## Traps

- **The source guards have one runner: `bash scripts/check-blueprint.sh`, and it reads
  committed content only.** The guards are ES modules and the root has no package file, so
  running Jest on them in place fails to load them (tried 2026-10-15). Every "see it red" in
  this plan is therefore a commit followed by the self-check; red commits on the branch are
  expected and vanish in the squash. `npm --prefix .framework test` runs the *installed*
  release's guards on this repository, not the source — it is not a substitute.
- **Never write a concrete additions path in backticks on a page** — e.g. a path naming the
  `tests` file in that folder. `framework-integrity` fails a backticked path that does not
  exist in the project, and a real project has no such file. Write it with the placeholder,
  `.claude/rule-additions/<name>.md`; the guard skips paths containing `<`.
- **The defect overlays land after generation.** A defect that plants an additions file is
  therefore seen by `--check`, not by the generation `compose()` ran — which is what makes
  `orphan-addition` and `stale-addition` fail `rules-generated`.
- **With `INSTRUCTIONS` set, the self-check replaces the base's shipped stubs** with the real
  `rules/*.md`, and the base's additions file stays. The composed `tests` rule is then the
  real shipped text plus the stub addition — that is intended, and it is part of the evidence
  that replacing shipped texts leaves additions alone.
- **`set-up-project.test.js` asserts `.claude/rules/` holds exactly the shipped names.** Setup
  writes no additions file, so that assertion must keep passing unchanged.
- **The probe in Task 6 needs the rule loaded before the task.** Claude Code loads a rule
  when the agent touches a matching file; have the session read an existing file in the area
  before it is given the task, so a missing rule cannot be mistaken for a refused one.

## Review Focus

Inputs no criterion names, most likely first; each has its test in the task named.

- An empty or whitespace-only additions file — written as if absent, byte for byte (Task 1, Task 3).
- Additions with no trailing newline, or with trailing blank lines — one newline at the end, same hash either way (Task 1).
- An additions file removed after it was joined — regenerating writes the shipped-only file, and `--check` reports *stale* until it does (Task 3).
- An additions file named for one of the project's own rules — refused with the message pointing at that rule (Task 1, Task 3).
- A non-`.md` file in `.claude/rule-additions/` (a `README`, an editor backup) — ignored (Task 3).

## File Structure

| File | Change |
|---|---|
| `scripts/rule-areas.js` | `ADDITIONS_SEPARATOR`, `joinAdditions`, `additionsProblem` (Decisions 3–5); module comment names the additions folder |
| `scripts/generate-rules.mjs` | Reads `.claude/rule-additions/`, adds its problems, joins additions into each shipped rule; header comment lists the new source |
| `scripts/projections.js` | Decision 6 mapping and its line in the comment |
| `guards/rules-generated.test.js` | Unit cases for `joinAdditions` and `additionsProblem` |
| `guards/rule-additions.test.js` | New, not installed — the generator on a scratch project set up by `set-up-project.sh` (Task 3) |
| `guards/plan-dispatchable.test.js` | A case for the Decision 6 mapping |
| `fixtures/base/.claude/rule-additions/tests.md` | New — a one-paragraph stub addition |
| `fixtures/defects/orphan-addition/.claude/rule-additions/pricing.md` | New defect — named for no shipped rule |
| `fixtures/defects/stale-addition/.claude/rule-additions/tests.md` | New defect — the base addition changed after generation |
| `scripts/check-conformance.sh` | Two `CASES` lines, both `:rules-generated` |
| `fixtures/README.md` | The base holds one additions file; never a generated file |
| `rules/learnings.md` | Lines 10–13: a project's addition to a shipped rule goes in `.claude/rule-additions/<name>.md` |
| `rules/planning.md` | The *A rule's source…* bullet and checklist item 4 name the additions file as a source |
| `framework/workflow.md` | Doc-closeout row (line 254) names the additions file |
| `framework/rule-delivery.md` | What a shipped rule's generated file holds when the project has additions; Task 6 and 7 results |
| `framework/DECISIONS.md` | New FW-013 (Decision 8) |
| `commands/capture-learning.md` | Lines 77–83: adding to a shipped rule goes in its additions file |
| `commands/bootstrap.md` | Stage 6, lines 56–59 |
| `bootstrap.md` | The setup table (line 70 area) gains `.claude/rule-additions/`; Step 6's *Exception — `tests`* paragraph says this project's test conventions may go in the `tests` additions file or a rule of its own; a sentence that additions to a framework document go in `CLAUDE.md` |
| `templates/CLAUDE.md` | One comment line under the import comment: this project's additions to a framework document go in this file, because each framework version replaces `.claude/framework/` |
| `RELEASES.md` | `## [Unreleased]`: a new subsection, not breaking |
| `docs/verification-log.md` | Task 7's entry, via `/manual-check` |
| `feature-catalog.yaml` | `shipped-rules-have-project-companions` to `shipped`, at merge, by the reviewer |
| `docs/superpowers/plans/2026-10-15-shipped-rules-have-project-companions.md` | Handover report |

If a grep in Task 5 finds another page telling a project to edit a shipped rule's text or
its generated files, stop and report it — the table is wrong, and the reviewer decides.

Doc closeout: rules and framework documents change (Task 8's fresh-agent check); a choice
between real alternatives is recorded (FW-013); adopter-facing claims change (`bootstrap.md`,
`templates/CLAUDE.md`); the release notes say what a project gets. `README.md` names no rule
source and needs no change — Task 5's grep confirms it.

---

### Task 1: The join and the refusals, pure

**Files:** `scripts/rule-areas.js`, `guards/rules-generated.test.js`

**Produces:** `ADDITIONS_SEPARATOR: string`; `joinAdditions(text: string, additions: string | null): string`;
`additionsProblem(name: string, text: string, shipped: string[], own: string[]): string | null`.

1. Add to `guards/rules-generated.test.js`, importing the three names:

   ```js
   describe('rule additions', () => {
     it('joins additions after the shipped text, under the separator', () => {
       const out = joinAdditions('# Tests\n\nShipped.\n\n', '\n\nOurs.\n');
       expect(out).toBe(`# Tests\n\nShipped.\n\n${ADDITIONS_SEPARATOR}\n\nOurs.\n`);
     });
     it('leaves the text untouched with no additions, or empty ones', () => {
       for (const a of [null, '', '  \n\n']) expect(joinAdditions('# T\n\nS.\n\n', a)).toBe('# T\n\nS.\n\n');
     });
     it('ends in one newline whatever the additions end in', () => {
       expect(joinAdditions('S.', 'Ours.')).toBe(joinAdditions('S.', 'Ours.\n\n\n'));
     });
     it('says the additions win and that the agent tells the operator', () => {
       expect(ADDITIONS_SEPARATOR).toContain('follow the text below');
       expect(ADDITIONS_SEPARATOR).toContain('tell the operator');
     });
     it('refuses a header, an own rule\'s name and an unknown name', () => {
       const shipped = ['catalogs', 'tests'];
       expect(additionsProblem('tests', 'Ours.\n', shipped, ['app'])).toBeNull();
       expect(additionsProblem('tests', '---\npaths: ["x/**"]\n---\nOurs.\n', shipped, [])).toContain('carries no header');
       expect(additionsProblem('app', 'Ours.\n', shipped, ['app'])).toContain('.claude/rules/app.md itself');
       const unknown = additionsProblem('pricing', 'Ours.\n', shipped, []);
       expect(unknown).toContain('no shipped rule is named "pricing"');
       expect(unknown).toContain('catalogs, tests');
     });
   });
   ```

2. Commit, and run `bash scripts/check-blueprint.sh`. Expected: the clean baseline fails,
   naming `rules-generated` and the missing exports.
3. Implement in `scripts/rule-areas.js`, after `areaProblems`:

   ```js
   /** The line and sentence between a shipped rule and a project's additions to it. */
   export const ADDITIONS_SEPARATOR = [
     "## This project's additions to the rule above",
     '',
     "The text above is the framework's rule. The text below is this project's own addition to it. Where the two contradict, follow the text below, and tell the operator which clause above you set aside and why.",
   ].join('\n');

   /**
    * A shipped rule's text with the project's additions joined after it. Empty or absent
    * additions leave the text exactly as it was, so a rule with none is written as before.
    * @param {string} text The shipped text, no header. @param {string | null} additions
    */
   export function joinAdditions(text, additions) {
     if (additions === null || additions.trim() === '') return text;
     return `${text.trimEnd()}\n\n${ADDITIONS_SEPARATOR}\n\n${additions.trim()}\n`;
   }

   /**
    * Why an additions file cannot be joined, or null. `.claude/rule-additions/<name>.md`
    * adds to the shipped rule of that name and carries no header of its own.
    * @param {string} name @param {string} text
    * @param {string[]} shipped Shipped rule names. @param {string[]} own The project's own rule names.
    */
   export function additionsProblem(name, text, shipped, own) {
     if (!shipped.includes(name)) {
       return own.includes(name)
         ? `"${name}" is this project's own rule — add to .claude/rules/${name}.md itself`
         : `no shipped rule is named "${name}" (shipped: ${shipped.join(', ')}) — rename the file after one, or move its text into a rule of your own in .claude/rules/`;
     }
     if (/^\s*---[ \t]*\n/.test(text)) {
       return "an additions file carries no header — its area is the shipped rule's, set in .claude/rule-areas.json. Delete the header.";
     }
     return null;
   }
   ```

   Extend the module comment: a third source, `.claude/rule-additions/<name>.md`, joined after
   a shipped rule's text.
4. Commit and run the self-check again. Expected: green. Break `joinAdditions` (drop the
   separator), commit, see it red, revert that commit.

### Task 2: The generator joins them; the plan check knows the file

**Files:** `scripts/generate-rules.mjs`, `scripts/projections.js`, `guards/plan-dispatchable.test.js`

**Consumes:** Task 1's three exports.

1. In `guards/plan-dispatchable.test.js` › *what a plan must list beside a rule source*, add:

   ```js
   it("asks for both generated files of a shipped rule when its additions file is listed", () => {
     const both = ['.claude/rules/tests.md', '.cursor/rules/tests.mdc'];
     expect(missing(table('.claude/rule-additions/tests.md'))).toEqual(both);
     expect(missing(table('.claude/rule-additions/tests.md', ...both))).toEqual([]);
   });
   ```

   Commit and run the self-check; expected red on this case.
2. In `scripts/projections.js`, before the `shipped` match:

   ```js
   const added = /^\.claude\/rule-additions\/([^/]+)\.md$/.exec(path);
   if (added) return [`.claude/rules/${added[1]}.md`, `.cursor/rules/${added[1]}.mdc`];
   ```

   and add the line to the comment's list. Commit and run the self-check; expected green.
3. In `scripts/generate-rules.mjs`: import the two functions; record the names of the
   project's own rules as the existing loop over `.claude/rules/` finds them (hand-written,
   not shipped); then, before `if (problems.length === 0)`, read every `.md` in
   `.claude/rule-additions/` with the existing `names()` helper, push
   `` `.claude/rule-additions/${name}.md: ${problem}` `` for each `additionsProblem`, and keep
   the text of the rest in a `Map`. In the shipped loop, pass
   `joinAdditions(text, additions.get(name) ?? null)` to both renderers in place of `text`.
   Add `.claude/rule-additions/` to the header comment's list of sources.
4. Commit.

### Task 3: The generator on a real setup

**Files:** `guards/rule-additions.test.js` (new; not installed)

Write it on the pattern of `guards/set-up-project.test.js` (its `repository()` and `git()`
helpers — copy them, they are not exported): set up a scratch repository with
`scripts/set-up-project.sh`, then run `node .framework/scripts/generate-rules.mjs` (and
`--check`) in it with `spawnSync`. One `it` each:

- **Joins:** write `.claude/rule-additions/tests.md` (`Ours: marker A.\n`), run the
  generator; `.claude/rules/tests.md` and `.cursor/rules/tests.mdc` both contain the shipped
  text, then `ADDITIONS_SEPARATOR`, then `Ours: marker A.`, in that order; no file named
  after the additions appears in either folder; `--check` exits 0.
- **Untouched without additions:** the bytes of every generated file after setup equal the
  bytes after writing an empty additions file and regenerating.
- **Stale, then current:** change the additions; `--check` exits 1 naming both `tests`
  files *stale*; regenerate; `--check` exits 0. Delete the additions file; `--check` names
  them *stale*; regenerate; the files equal the setup-time bytes.
- **Refused, nothing written:** for each of an unknown name (`pricing.md`), a header, and an
  own rule's name (write `.claude/rules/app.md` with `paths: ["src/app.js"]` first, then
  `.claude/rule-additions/app.md`): the generator exits 1, stderr starts `rules: nothing
  written.` and contains Decision 5's message, and every file under `.claude/rules/` and
  `.cursor/rules/` is byte-identical to before the run.
- **Ignored:** a `README` and a `tests.md~` in the folder change nothing.
- **Survives a new shipped text:** with additions in place, append a line to
  `.framework/rules/tests.md` (standing in for a new framework version), regenerate; the
  additions file's bytes are unchanged and `.claude/rules/tests.md` holds the new line,
  then the separator, then the additions.
- **Setup writes none:** right after setup, `.claude/rule-additions/` does not exist.

Commit and run the self-check after each `it`; see each red once on a deliberate break,
then revert the break.

### Task 4: Self-check

1. `fixtures/base/.claude/rule-additions/tests.md`: `Stub addition for the conformance run.`
2. `fixtures/defects/orphan-addition/.claude/rule-additions/pricing.md`: `An addition to a
   rule the project does not have.`
3. `fixtures/defects/stale-addition/.claude/rule-additions/tests.md`: `Stub addition, changed
   after the rules were generated.`
4. In `scripts/check-conformance.sh` › `CASES`, after `hand-edited-rule:rules-generated`:
   `orphan-addition:rules-generated` and `stale-addition:rules-generated`.
5. `fixtures/README.md`: the base holds its shipped stubs, their areas and one additions
   file; never a generated file.
6. Commit, then `bash scripts/check-blueprint.sh`. Expected: both new defects *caught* by
   `rules-generated`, every existing line unchanged, clean baseline ok.

### Task 5: Pages

Write each so that it says: to add to a shipped rule, write `.claude/rule-additions/<name>.md`
— plain text, no header, named after the shipped rule — then run
`npm --prefix .framework run rules`; the additions follow the shipped text in the one rule
each tool loads, and win where they contradict; never edit the shipped text in
`.framework/rules/` or a generated file. Where a page speaks of framework documents: a
project's additions to one go in its own `CLAUDE.md`. Pages and lines are in *File
Structure*. Write FW-013 (Decision 8) and the `RELEASES.md` subsection (*A project can add
to a shipped rule*, not breaking: nothing moves, and a project without additions gets
identical files).

`framework/rule-delivery.md` reports the Claude Code and Cursor results as "Task 6 / Task 7
of this plan" until they return, then states them with tool and version.

Then:

```bash
grep -rn "rule-additions" rules framework commands bootstrap.md templates README.md fixtures/README.md
grep -rnE "edit (the|a) shipped rule|shipped rule's text" rules framework commands bootstrap.md templates README.md
```

The first lists every page in the table and no other; the second finds no sentence telling a
project to edit a shipped rule's text. Commit.

### Task 6: Claude Code

In a scratch folder: `git init`, run this branch's `scripts/set-up-project.sh` on it,
`npm --prefix .framework install`. Add `src/a.test.js` (in the `tests` area; any one-line
test) and `src/app.js` (in none) holding `export const sum = (a, b) => a + b;`. Append to `.framework/rules/tests.md`: `Marker S: name every test file with the
suffix .check.js.` Write `.claude/rule-additions/tests.md`: `Marker P: name every test file
with the suffix .spec.js.` Run `npm --prefix .framework run rules`; `--check` exits 0.

Start a fresh Claude Code session in that folder (`claude -p` or interactive) and give it, in
turn:

1. *Before using any tool: quote every sentence beginning "Marker" that you have been given.*
   Expected: none.
2. *Read `src/a.test.js`, then quote every sentence beginning "Marker" you have now been
   given.* Expected: S and P, and the separator's heading.
3. *Write a test for a function `sum` in `src/app.js`.* Expected: it names the file with
   `.spec.js`, and tells you it set aside the shipped `.check.js` clause and why.

Record each prompt, the answers verbatim, the file it created, the Claude Code version and
the machine. A fail on 3 — it followed `.check.js`, or did not say so — is a finding: record
it, change nothing, and report; the reviewer and the developer decide. Keep the folder for
Task 7.

### Task 7: Handover — the Cursor check

**The task is the handover. Do not simulate it.**

Use `/manual-check` to draft the steps into `docs/verification-log.md` as `pending`, for the
scratch folder of Task 6 (delete any test file Task 6 created first): in a new Cursor Agent
chat with the folder opened as its own workspace, the three prompts of Task 6, in order. The
developer writes the answers to `cursor-check.md` in the scratch folder, first line
`Cursor version: <version>`.

**Check first:** does `cursor-check.md` exist in the scratch folder with that first line,
and does the log entry read `pass` or `fail`? If yes, record that and go to step 3 below.

**If not, print to the developer** where the scratch folder is, the three prompts to paste,
and "done looks like: `cursor-check.md` there, starting with the version line, holding the
three answers, and the log entry marked pass or fail with what was seen" — **then stop.**

**On resumption,** run the same check and proceed on its result.

3. Copy the answers into the log entry. If Cursor did not receive both texts, or followed the
   shipped clause, or did not say so, change no code: record it, say exactly what was seen in
   `framework/rule-delivery.md`, and leave the decision to the reviewer and the developer.

### Task 8: Fresh-agent check

Rules and framework documents changed. In a fresh clone of this branch, start a fresh
Claude Code session with:

> This is a probe and its output will be discarded. An invented project set up with this
> framework wants to add one clause of its own to the framework's shipped `tests` rule, and
> one requirement of its own to the framework's workflow document before an entry ships.
> Using only this repository, say exactly which files to change for each, and what to run
> afterwards.

Pass: `.claude/rule-additions/tests.md`, no header, then `npm --prefix .framework run rules`,
for the first; the project's own `CLAUDE.md` for the second; no edit to `.framework/rules/`,
`.claude/rules/tests.md`, a `.mdc`, or `.claude/framework/workflow.md`. Record prompt, gist,
pass or fail, tool, version and machine in a commit body. A fail means a page is unclear: fix
it and run again.

Delete the scratch folder afterwards.

### Task 9: Handover

Run the full checks and paste their output into the report:

```bash
bash scripts/check-blueprint.sh
npm --prefix .framework test
git diff --stat origin/main...HEAD
```

Expected: the self-check green with `orphan-addition` and `stale-addition` *caught* by
`rules-generated`; the installed checks green; the diff stat matching *File Structure*.
Append `## Handover report` to this file with the six sections the planning rules name, and
commit. The reviewer promotes the entry and writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Additions in `.claude/rule-additions/<name>.md`, no header; `.framework/` unchanged | `rule-additions.test.js` › *Joins*, *Survives a new shipped text* |
| One Claude Code file and one Cursor file: shipped, separator, additions; no second file; no additions → identical bytes | `rule-additions.test.js` › *Joins*, *Untouched without additions*; `rules-generated.test.js` › *rule additions* |
| Separator: additions win; agent tells the operator | `rules-generated.test.js` › *says the additions win…*; Task 6 step 3 |
| Refuses an unknown name and a header, says what to do | `rule-additions.test.js` › *Refused*; `rules-generated.test.js`; `orphan-addition` caught |
| Check mode reports stale; plan check pairs the additions file | `rule-additions.test.js` › *Stale, then current*; `stale-addition` caught; `plan-dispatchable.test.js` |
| Setup writes no additions; replacing shipped texts leaves them unchanged | `rule-additions.test.js` › *Setup writes none*, *Survives a new shipped text*; the self-check's composed baseline |
| Claude Code: neither text before a read, both after | Task 6 steps 1–2, in the handover |
| Claude Code: follows the contradicting addition and says so | Task 6 step 3, in the handover |
| Cursor: both texts on a read; follows the addition and says so | Task 7, `docs/verification-log.md` |
| Pages say where additions go, and framework-document additions go in `CLAUDE.md` | Task 5 greps; Task 8 fresh-agent check |

## Not in this plan

- **Moving an existing project's edits out of its shipped rules** (first-adopter's, this
  repository's) — `harness-adopts-the-update-model` and `project-takes-a-framework-version`.
- **The plan check's `rules/<n>.md` mapping** — `plan-checks-pair-only-generated-sources`.
- **The entry file's sentences on how rules arrive** — `entry-file-says-how-rules-arrive`.

## Handover report

### Task completion

All nine tasks are done. Task 7 stopped until the developer ran the Cursor check, then resumed from the three replies they pasted. The catalog entry is still `building`; the reviewer promotes it at merge.

### Verification results

`bash scripts/check-blueprint.sh` at `e74965a`, exit 0:

```
Checking e74965a of ~/src/claude-project-framework-rule-additions

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

`npm --prefix .framework test`, exit 0: 3 suites, 4 tests passed (`project-layout`, `rule-areas`, `catalog-entries`).

`git diff --stat origin/main...HEAD` at `e74965a` (before this handover commit):

```
 RELEASES.md                                        |  10 +
 bootstrap.md                                       |  16 +-
 commands/bootstrap.md                              |   7 +-
 commands/capture-learning.md                       |   8 +-
 docs/verification-log.md                           |  25 +++
 fixtures/README.md                                 |   7 +-
 fixtures/base/.claude/rule-additions/tests.md      |   1 +
 .../.claude/rule-additions/pricing.md              |   1 +
 .../stale-addition/.claude/rule-additions/tests.md |   1 +
 framework/DECISIONS.md                             |  45 +++++
 framework/rule-delivery.md                         |  22 ++-
 framework/workflow.md                              |   2 +-
 guards/plan-dispatchable.test.js                   |   6 +
 guards/rule-additions.test.js                      | 208 +++++++++++++++++++++
 guards/rules-generated.test.js                     |  31 ++-
 rules/learnings.md                                 |   7 +-
 rules/planning.md                                  |  12 +-
 scripts/check-conformance.sh                       |   2 +
 scripts/generate-rules.mjs                         |  18 +-
 scripts/projections.js                             |   3 +
 scripts/rule-areas.js                              |  47 ++++-
 templates/CLAUDE.md                                |   3 +-
 22 files changed, 453 insertions(+), 29 deletions(-)
```

### Scope

Every file in that stat is in *File Structure*. This handover commit adds only this plan file, which is also in the table. `feature-catalog.yaml` is absent because the table assigns it to the reviewer at merge. `scripts/set-up-project.sh` was edited only inside a reverted red commit, so it is not in the final diff.

### Judgment calls

- The second Cursor answer quoted both marker sentences and did not quote the separator's heading. The prompt asks only for sentences beginning "Marker", and the heading does not. Both texts arrived, the new file ended in `.spec.js`, and the agent said the addition wins where the two disagree. Recorded as pass, with that note, in `docs/verification-log.md`. Claude Code 2.1.300 did the same on Task 6: both sentences, `.spec.js`, said it set `.check.js` aside, heading not quoted.
- Cursor version `3.24.12` was read from `/Applications/Cursor.app` (`CFBundleShortVersionString`) on dev-laptop. The developer's reply did not include an About line.
- `templates/CLAUDE.md` gained the one comment line the plan specifies, about additions to a framework document. That line does not contain the folder name `rule-additions`. The Task 5 grep over the named directories listed `rules/learnings.md`, `rules/planning.md`, `framework/workflow.md`, `framework/rule-delivery.md`, `framework/DECISIONS.md`, `commands/capture-learning.md`, `commands/bootstrap.md`, `bootstrap.md`, and `fixtures/README.md`. `README.md` had no match. The second grep found no sentence telling a project to edit a shipped rule's text.
- The setup table gained a `.claude/rule-additions/<name>.md` row that says setup does not create it.

### What the plan got wrong

- The first red self-check names `rules-generated` as unable to run, and the clean-baseline line is `Test suite failed to run`. The script prints only `●` lines, so the missing-export message itself is not in the summary.
- Task 6 and Task 7 ask the agent to quote sentences beginning "Marker", and the expected result also asks for the separator's heading. A reply that follows the prompt does not quote the heading.
- The Task 7 instructions, as first printed, were not something the developer could follow. They reported the three replies in this chat. `cursor-check.md` was written from that paste in the scratch folder, and Task 8 then deleted the folder. The replies are in the verification log.

### Outstanding

- The reviewer promotes `shipped-rules-have-project-companions` to `shipped` and writes the review record. Merge authority is parent review.
- Working commits on this branch carry a `Co-authored-by: Cursor` trailer injected at commit time. The squash needs an explicit subject and body so that trailer does not land.
- Red commits that exist to show a guard fail are on the branch. They disappear in the squash.

## Review record

Reviewed by the specifying session, 2026-10-15, after rebasing onto `origin/main` at
`64bf004` (one backlog commit, no conflict).

### Checks re-run

- `bash scripts/check-blueprint.sh` at `4d055c7` (mid-plan, before Task 7): the first run
  reported `CANNOT RUN plain-reply rule-delivery fails on the clean project`. A
  hand-composed clean project at the same commit passed `rule-delivery`, 24 of 24, and two
  further full runs at `4d055c7` printed `caught plain-reply rule-delivery` and *Every guard
  caught its defect and passed the clean baseline.* `main` at `b25a106` passed the same day.
- `bash scripts/check-blueprint.sh` at `692ad81`: every guard caught its defect,
  `orphan-addition` and `stale-addition` both *caught* by `rules-generated`, clean baseline
  ok.
- `npm --prefix .framework test` at `692ad81`: 4 of 4 passed.
- Scope: the diff against `origin/main` is the 22 files in the handover's stat plus this
  plan file and `feature-catalog.yaml`, all in *File Structure*.
- Read the code in `scripts/rule-areas.js`, `scripts/generate-rules.mjs` and
  `scripts/projections.js` against Decisions 3–6: the separator, the join and the three
  refusal messages match the plan verbatim. Read the page changes: each says where a
  project's additions go, that they win, never to edit the shipped text, and that additions
  to a framework document go in `CLAUDE.md`.
- Did not re-run Task 6, Task 7 or the fresh-agent check. Their records name tool, version
  and machine, and the Cursor answers are in the verification log verbatim.

### Found

- **A plan error, mine.** Task 6 step 2 and the Cursor log entry expected the agent to quote
  the separator's heading, but the prompt asks only for sentences beginning "Marker", which
  the heading is not. Both tools followed the prompt. The executor recorded pass with a note;
  that is the right reading, and the expected column is left as drafted so the record shows
  what was asked.
- **A plan error, mine.** Task 7's printed instructions asked the developer to write
  `cursor-check.md` themselves; they pasted the replies into the chat instead, and the
  executor wrote the file from them. Nothing was lost.
- Nothing else beyond the handover.

### Outstanding disposition

- Promote the entry and write this record — done in this commit.
- The `Co-authored-by: Cursor` trailers — dropped by the squash's explicit subject and body.
- The red commits — dropped by the squash.
- **Unexplained:** the one `CANNOT RUN` for `rule-delivery` above. Not caused by anything
  this branch changed (the guard passed on this branch's clean project by hand and in two
  later runs). Seen once, not reproduced; dropped with no entry. If it is seen again, it
  becomes a backlog entry with the failing run's output, which this record does not have.

### Learnings routed

- The two plan errors are about how this plan was written, not about the framework: the
  planning rule already says a handover prints what to do and what done looks like, and a
  prompt's expected answer must follow from the prompt. Not routed.
- FW-013 records the decision. Nothing else generalises.

### Merged because

Every criterion has its evidence — guards for the mechanism, Claude Code and Cursor runs for
the agent behaviour, a passing fresh-agent check for the pages — and both suites are green
after the rebase.
