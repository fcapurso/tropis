# The kick-off prompt prints each worktree's own setup — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** a checkout that needs more than the framework's install before its suite can run
lists its steps in `.claude/worktree-setup.txt`, and the prompt `/dispatch` prints shows
those steps, in order, for each worktree the plan creates. A checkout without the file gets
`npm --prefix .tropis ci`, as today.

**Spec:** the entry `worktree-setup-comes-from-the-project` in `feature-catalog.yaml`. Read its
four criteria and the comment above it.

**Dispatch this plan only after `2026-10-19-tier-picks-are-project-data.md` has merged,** and
start from `main` as it is then. Both change `scripts/plan-binding.js`, `scripts/dispatch.mjs`,
`guards/dispatch.test.js`, `framework/dispatch.md`, `framework/DECISIONS.md` and
`RELEASES.md`. The claims below are about parts of those files the tier-picks plan does not
change; check each against `main` before starting, and stop and report under *What the plan
got wrong* if one no longer holds.

**What the specifying session verified on 2026-10-19, against `main` at `37e068e`:**

- **The fixed line.** `scripts/plan-binding.js`, `renderThinPrompt`, after the isolate command,
  prints:
  ```js
    lines.push('In each worktree it creates that has a .tropis/ folder, before running anything else:');
    lines.push('  npm --prefix .tropis ci');
  ```
  for every plan, whatever the project needs. `renderThinPrompt` is pure (the module's comment:
  "No file or process access, so a guard can import it"); its options are documented in a
  JSDoc `@param {{ … }} opts` block and destructured in its first line. The tier-picks plan
  changes only the lines above the isolate command.
- **What first-adopter needs.** Before its suite runs, a first-adopter worktree needs
  `git submodule update --init --recursive`, `npm ci`, `npm --prefix .tropis ci` and
  `npm --prefix .project-tools ci` (first-adopter `CLAUDE.md`, *Setting up a working copy*, and
  `docs/framework-layers.yaml`). An executor that followed the fixed line ran the parent
  checkout's test binary against a worktree that was never set up (first-adopter `225e2f4`).
- **How checkouts are found.** `scripts/isolate-for-plan.mjs` resolves each Repositories row
  to a checkout by `checkoutName(row.checkout)` (exported by `plan-binding.js`: the first
  backticked span of the cell): the current repository when the name equals its folder's
  name, otherwise the sibling folder of that name. `scripts/dispatch.mjs` sets
  `const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')` — the project
  root, two levels above `.tropis/scripts/` — imports `readFileSync, existsSync, readdirSync`
  from `node:fs` and `dirname, resolve` from `node:path`, and gets the parsed rows as
  `v.repos` from `validateDispatchable`. Each row is `{ checkout, role, isolation }`; a
  `do not edit` row has `isolation === ''`.
- **Nothing owns `.claude/worktree-setup.txt` today.** `SHIPPED_ROOTS` in
  `scripts/installed-files.js` is `.tropis`, `.claude/framework`, `.claude/commands`, so the
  file is not fingerprinted, and `scripts/take-version.mjs` writes nothing under `.claude/`
  outside those roots except `settings.json` and `rule-areas.json`. `git grep -n -F
  "worktree-setup" -- scripts guards templates framework commands fixtures` finds nothing.
- **The tests.** `guards/dispatch.test.js` builds a throwaway set-up project
  (`project(planText)` returns `{ parent, root, fw }`, with `.claude/framework/` created),
  and has `plan(rows)`, `PROJECT_ONLY` (checkout cell `` project (`example-project`) ``),
  `BOTH` (adds `` other (`example-other`) ``), `PLAN`, `repo(dir)` and `run(cwd, cmd, args)`.
  Its first case asserts `toContain('npm --prefix .tropis ci')`.
- **The prose.** `framework/dispatch.md`, *What the prompt carries*, the *Isolation* bullet,
  ends "Then the install step, `npm --prefix .tropis ci`, in each worktree that carries the
  framework." `templates/README.md` (installed as a project's operator guide,
  `.tropis/README.md`) has `## Setting up a working copy` with the indented line
  `npm --prefix .tropis ci` and a paragraph beginning "On a project just set up". The
  blueprint `README.md` does not describe the prompt's setup line and needs no change.

**Model tier: Small–medium.** Code, tests and prose are given verbatim; the base will have
moved, so some context lines may need finding rather than matching.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** It adds a file shape every project may write.

Do not store a kick-off prompt on this plan.

---

## Delivers

worktree-setup-comes-from-the-project

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-worktree-setup -b plan/worktree-setup-comes-from-the-project` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They are the installed `v0.3.1`. Do not create `.claude/worktree-setup.txt`
  here: this repository needs only the framework's install, which is the default.
- **Do not touch other plans.**
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. No co-author or tool-attribution trailer in any commit.

## Decisions

Taken by the specifying session on 2026-10-19. Do not reopen them.

1. **The place is `.claude/worktree-setup.txt`,** in each checkout: one command per line, in
   order; blank lines and lines starting with `#` are not steps. It **replaces** the
   framework's install line rather than adding to it, so a project that needs the install
   lists it too. Rejected: a fenced block under a heading in `CLAUDE.md` (a heading is prose a
   project rewrites, and setup writes `CLAUDE.md` and `AGENTS.md` as two copies), and adding
   the project's steps after the framework's (the order would not be the project's, and a
   project that installs differently could not drop it).

2. **`scripts/plan-binding.js`.** Add, directly above `renderThinPrompt`'s JSDoc:

   ```js
   /** A checkout's own worktree setup, read by the dispatch command. */
   export const WORKTREE_SETUP = '.claude/worktree-setup.txt';

   /**
    * The steps in a worktree setup file: one command per line, in order. Blank lines and
    * lines starting with `#` are not steps. No steps → null, and the prompt falls back to
    * the framework's install.
    * @param {string} text
    * @returns {string[]|null}
    */
   export function parseWorktreeSetup(text) {
     const steps = text.split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('#'));
     return steps.length > 0 ? steps : null;
   }
   ```

3. **`scripts/plan-binding.js`, `renderThinPrompt`.** In its JSDoc options block add the line
   `*   setups?: Array<{checkout: string, steps: string[]|null}>,` after the `stale` line, and
   add `setups = []` to the destructuring in its first line (as
   `const { planPath, protocol, repos, picks, lastVerified, stale, setups = [] } = opts;`, keeping
   any other names the line has by then). Replace

   ```js
     lines.push('In each worktree it creates that has a .tropis/ folder, before running anything else:');
     lines.push('  npm --prefix .tropis ci');
   ```

   with

   ```js
     // A checkout may need more than the framework's install before its suite can run — a
     // submodule, its own dependencies — and lists it in its own worktree setup file.
     if (setups.every((s) => s.steps === null)) {
       lines.push('In each worktree it creates that has a .tropis/ folder, before running anything else:');
       lines.push('  npm --prefix .tropis ci');
     } else {
       lines.push('Before running anything else, set up each worktree it creates:');
       for (const { checkout, steps } of setups) {
         if (steps === null) {
           lines.push(`  In ${checkout}, if it has a .tropis/ folder:`);
           lines.push('    npm --prefix .tropis ci');
         } else {
           lines.push(`  In ${checkout}:`);
           for (const step of steps) lines.push(`    ${step}`);
         }
       }
     }
   ```

4. **`scripts/dispatch.mjs`.** Add `checkoutName`, `parseWorktreeSetup` and `WORKTREE_SETUP` to
   the import from `./plan-binding.js`, and `basename` and `join` to the import from
   `node:path`. Directly before the `process.stdout.write(` call, add:

   ```js
   // Each worktree's setup comes from its own checkout — this one, or the sibling folder the
   // row names — the way the isolation helper finds them.
   function setupFor(row) {
     const name = checkoutName(row.checkout);
     const dir = name === basename(root) ? root : resolve(root, '..', name);
     try {
       return parseWorktreeSetup(readFileSync(join(dir, WORKTREE_SETUP), 'utf8'));
     } catch {
       return null;
     }
   }
   const setups = v.repos
     .filter((row) => row.isolation)
     .map((row) => ({ checkout: row.checkout, steps: setupFor(row) }));
   ```

   and pass `setups,` in the object given to `renderThinPrompt`, after `stale`.

5. **`guards/dispatch.test.js`.**
   - In the first case, *prints a thin prompt that points at the plan, from the root and from
     .tropis/*, replace `expect(r.stdout).toContain('npm --prefix .tropis ci');` with:

     ```js
           // No worktree setup file: the framework's install alone, as before.
           expect(r.stdout).toContain('In each worktree it creates that has a .tropis/ folder, before running anything else:\n  npm --prefix .tropis ci\n');
     ```

   - Insert these cases directly after the case *reminds the executor to verify every checkout
     it edits*, inside the same `describe('dispatch command', …)`:

     ```js
       it("prints the project's own worktree setup, in order, in place of the framework install", () => {
         const { parent, root } = project(plan(PROJECT_ONLY));
         try {
           writeFileSync(
             join(root, '.claude/worktree-setup.txt'),
             '# Before the suite can run\ngit submodule update --init --recursive\n\nnpm ci\nnpm --prefix .tropis ci\n',
           );
           const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
           expect(r.status).toBe(0);
           expect(r.stdout).toContain(
             'Before running anything else, set up each worktree it creates:\n'
             + '  In project (`example-project`):\n'
             + '    git submodule update --init --recursive\n'
             + '    npm ci\n'
             + '    npm --prefix .tropis ci\n',
           );
           expect(r.stdout).not.toContain('In each worktree it creates that has a .tropis/ folder');
           expect(r.stdout).not.toContain('Before the suite can run');
         } finally {
           rmSync(parent, { recursive: true, force: true });
         }
       });

       it('reads each checkout its own setup, and gives one without a file the framework install', () => {
         const { parent, root } = project(plan(BOTH));
         const other = join(parent, 'example-other');
         repo(other);
         try {
           mkdirSync(join(other, '.claude'), { recursive: true });
           writeFileSync(join(other, '.claude/worktree-setup.txt'), 'npm ci\n');
           const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
           expect(r.status).toBe(0);
           expect(r.stdout).toContain(
             '  In project (`example-project`), if it has a .tropis/ folder:\n'
             + '    npm --prefix .tropis ci\n'
             + '  In other (`example-other`):\n'
             + '    npm ci\n',
           );
         } finally {
           rmSync(parent, { recursive: true, force: true });
         }
       });
     ```

6. **`framework/dispatch.md`.** In the *Isolation* bullet, replace "Then the install step,
   `npm --prefix .tropis ci`, in each worktree that carries the framework." with:

   ```
   Then what each worktree needs before its suite can run: the commands in that
   checkout's `.claude/worktree-setup.txt`, in order, or `npm --prefix .tropis ci` where
   the checkout has no such file. The file is the project's — one command per line, `#`
   for a comment — and an update never touches it. It replaces the framework's install
   rather than adding to it, so list that install in it too when the checkout needs it.
   ```

   Keep the bullet's two-space continuation indent and rewrap to the file's width.

7. **`templates/README.md`.** In `## Setting up a working copy`, after the paragraph beginning
   "On a project just set up", add:

   ```
   A plan's worktree needs the same before its suite can run, and the prompt `/dispatch`
   prints says so for each worktree a plan creates. When this project needs more than the
   line above — a submodule, its own dependency install, a second tools package — write
   every command, in order and one per line, in `.claude/worktree-setup.txt`, the line above
   included: the file replaces it rather than adding to it. Lines starting with `#` are
   comments. An update never touches the file.
   ```

8. **`framework/DECISIONS.md`.** Append after the last decision, separated from it by one blank
   line as the last decisions in the file are, using the next free number (the heading below
   says FW-019; the tier-picks plan and `maintainer-absorbs-contributions-in-groups` each add
   one before it may land):

   ```
   ## FW-019: A worktree's setup is the project's own list

   **Date:** 2026-10-19 · **Status:** Accepted

   **Decision:** The prompt `/dispatch` prints shows, for each worktree a plan creates, the
   commands in that checkout's `.claude/worktree-setup.txt`, in order, in place of the
   framework's install line. A checkout without the file gets `npm --prefix .tropis ci`, as
   before. The file is the project's: one command per line, `#` for a comment, and nothing
   the framework ships writes or fingerprints it.

   **Evidence:** first-adopter needs a submodule, its own install and a second tools package
   before its suite runs. An executor that followed the fixed install line ran the parent
   checkout's test binary against a worktree that was never set up (first-adopter `225e2f4`).

   **Rejected:** A fenced block under a heading in the project's `CLAUDE.md` — a heading is
   prose a project rewrites, and setup writes `CLAUDE.md` and `AGENTS.md` as two copies.
   Adding the project's steps after the framework's install — the order would not be the
   project's, and a project that installs differently could not drop it.

   **Consequences:** A project whose worktrees need more than the framework's install writes
   the file once, its install line included.
   ```

9. **`RELEASES.md`.** Under `## [Unreleased]`, add this section after the last section already
   there:

   ```
   ### The kick-off prompt prints your own worktree setup

   When a plan worktree needs more than `npm --prefix .tropis ci` before its suite can run —
   a submodule, your own dependency install — list every command, in order, one per line,
   in `.claude/worktree-setup.txt`, the framework's install included. The prompt `/dispatch`
   prints then shows those commands for each worktree a plan creates, in place of the
   framework's install line. Without the file nothing changes. An update never touches the
   file. This is not a breaking change.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks, and is not a check of this change.
- **`npm --prefix .tropis run dispatch` in this checkout runs the installed copy,** which still
  prints the fixed line. Check the change through the self-check and the fresh-agent check.
- **Task 1 is red on purpose.** The two new cases fail until the fix; the changed first case
  passes already (it describes today's output exactly). Do not fix the code in the same
  commit.
- **The tier-picks plan has merged before this one starts,** so the destructuring line and the
  JSDoc of `renderThinPrompt`, and `dispatch.mjs` around the `renderThinPrompt` call, look
  different from the version this plan was written against. Find the places by the code
  quoted in each decision, not by line number.
- **A take-version case may fail once and not again** when another self-check runs at the
  same moment on the same machine. Re-run once before diagnosing; report it if it recurs.
- **`RELEASES.md` and `framework/DECISIONS.md` may conflict on rebase.** Keep every section.
- **Do not write a worktree command into a commit body or this plan's handover** other than by
  naming the plan's own Repositories row; the plan check scans the plan file for such
  commands and refuses any that is not an isolation cell.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | Decisions 2–3 |
| `scripts/dispatch.mjs` | Decision 4 |
| `guards/dispatch.test.js` | Decision 5 |
| `framework/dispatch.md` | Decision 6 |
| `templates/README.md` | Decision 7 |
| `framework/DECISIONS.md` | Decision 8 |
| `RELEASES.md` | Decision 9 |
| `docs/superpowers/plans/2026-10-19-worktree-setup-comes-from-the-project.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The checks, red

Decision 5. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on exactly the two new cases. Paste the failing lines.

### Task 2: The fix, green

Decisions 2–4. Commit, then run `bash scripts/check-blueprint.sh`: green.

Then restore the two fixed `lines.push` calls in place of the new `if`/`else`, without
committing, run the self-check again, and paste that the two new cases go red; then
`git checkout -- scripts/plan-binding.js` and confirm the tree is clean.

### Task 3: The documents

Decisions 6–9. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 4: Fresh-agent check

`framework/` changed, so this is required. In a scratch folder outside any repository,
`git init` a project, run this branch's `scripts/set-up-project.sh` on it, then
`npm --prefix .tropis install` in it, and commit everything. Write a probe plan at
`docs/superpowers/plans/2026-01-01-probe.md` in it with the headings and Repositories table the
dispatch command requires (copy the shape from `guards/dispatch.test.js`'s `plan()` helper,
with the project folder's own name). Then start a fresh Claude Code session in the scratch
project and give it, in one prompt:

> This is a probe and its output will be discarded. This project's tests need
> `npm --prefix tools ci` to have run in every fresh worktree before they can start (invented
> for the probe). Make the kick-off prompts for this project's plans tell executors so, the
> way this project's framework says to. Then show me the kick-off prompt for
> `docs/superpowers/plans/2026-01-01-probe.md`.

**Pass:** the agent writes `.claude/worktree-setup.txt` holding both `npm --prefix .tropis ci`
and `npm --prefix tools ci`, edits nothing under `.claude/framework/`, `.claude/commands/` or
`.tropis/` (`git status --porcelain` shows only the new file), and the prompt it shows lists
both commands under the project's checkout. **Fail:** any of those does not hold — in
particular a file holding only `npm --prefix tools ci`, which would drop the framework's
install. Read where the agent looked and why, fix the text that sent it there, and run again.

Record the prompt, the file the agent wrote, the setup lines the prompt showed, pass or fail,
and the tool, version and machine, in a commit body on the branch (an empty commit is fine).
Delete the scratch folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. In *Outstanding*, say that the release item is not breaking and that the reviewer
promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| The steps are read from a place the project owns and an update leaves alone | Decision 1; the file is outside `SHIPPED_ROOTS` and the take writes nothing there (verified above) |
| The prompt prints those steps, in order, in place of the fixed line, for each worktree | Decision 5, both new cases |
| A project with no steps gets the framework install alone | Decision 5, the first case's changed assertion; the second new case for one checkout of two |
| A dispatch test covers both and goes red with the fixed line restored | Task 2's restore-and-run |

## Handover report

### Task completion

- **Task 1** — done (`f0cd4fe`). Red on exactly the two new cases.
- **Task 2** — done (`d78836a`). Green; the restore-and-run went red on the two new cases, and the tree was clean afterwards.
- **Task 3** — done (`e15a9d6`), plus an integrity-guard change the plan did not foresee (`80587f8`, see *What the plan got wrong*).
- **Task 4** — done, pass (`c5482d5`, the record is in that commit's body).
- **Task 5** — this report.

Every claim in the plan's "verified on 2026-10-19" list held against `main` at `6f7a7fe`: the fixed two `lines.push` calls, the JSDoc block and destructuring line, the `dispatch.mjs` imports and `root`, `checkoutName` exported, `SHIPPED_ROOTS` unchanged, `git grep worktree-setup` empty, and the test helpers as described.

### Verification results

Task 1, `bash scripts/check-blueprint.sh` at `3694a34` (before the rebase), clean-baseline section:

```
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● dispatch command › prints the project's own worktree setup, in order, in place of the framework install
              ● dispatch command › reads each checkout its own setup, and gives one without a file the framework install
```

Every conformance case printed `caught`.

Task 2, the self-check after the fix: `Every guard caught its defect and passed the clean baseline.`

Task 2, restore-and-run. The self-check checks only committed content, so it cannot see an uncommitted restore. Instead the working tree, with the two fixed lines restored and nothing committed, was copied to a scratch folder laid out as the self-check lays out its stage, and `jest guards/dispatch.test.js` was run there:

```
    ✕ prints the project's own worktree setup, in order, in place of the framework install (243 ms)
    ✕ reads each checkout its own setup, and gives one without a file the framework install (397 ms)
Tests:       2 failed, 13 passed, 15 total
```

Then `git checkout -- scripts/plan-binding.js`, and `git status --porcelain` printed nothing.

Task 3, after the docs: the self-check went red on `framework integrity › references no file that does not exist`, because `.claude/worktree-setup.txt` is now named in backticks and deliberately absent. After `80587f8` the self-check printed `Every guard caught its defect and passed the clean baseline.`

Task 5, after rebasing onto `origin/main` at `5cd30aa`:

- `bash scripts/check-blueprint.sh` → `Every guard caught its defect and passed the clean baseline.`
- `npm --prefix .tropis test` → `Tests:       28 passed, 28 total`

### Scope

`git diff --stat origin/main...HEAD`, before this report:

```
 RELEASES.md                        |  9 ++++++++
 framework/DECISIONS.md             | 22 ++++++++++++++++++
 framework/dispatch.md              |  7 ++++--
 guards/dispatch.test.js            | 46 +++++++++++++++++++++++++++++++++++++-
 guards/framework-integrity.test.js |  7 +++---
 scripts/dispatch.mjs               | 21 ++++++++++++++++-
 scripts/plan-binding.js            | 37 +++++++++++++++++++++++++++---
 templates/README.md                |  7 ++++++
 8 files changed, 146 insertions(+), 10 deletions(-)
```

Every file is in *File Structure* except `guards/framework-integrity.test.js`, explained below. This report adds the plan file. Worktree used: `../tropis-worktree-setup`, made by the isolation helper from the plan's Repositories row.

### Judgment calls

- **The integrity guard exemption.** `guards/framework-integrity.test.js` already exempts `docs/model-picks.md`: the framework names that file and ships none. `.claude/worktree-setup.txt` is the same kind of file, so it got the same exemption on the same line, with the comment widened to cover both. The guard still reports every other missing path. The alternative was to drop the backticks from the verbatim prose in Decision 6, which would have meant changing text the plan fixed. The reviewer may prefer that instead.
- **The restore-and-run** was done on a copy of the working tree, not through the self-check (reason above).
- **Decision number.** `main` gained `FW-019` (the maintainer-flush decision) while this plan was running, so this decision is **FW-020**. The docs commit's message was renumbered to match during the rebase. The `RELEASES.md` and `DECISIONS.md` conflicts were resolved by keeping both sections, main's first.
- **The fresh-agent check ran twice.** In headless `acceptEdits` mode, Claude Code's own permission check refused the probe agent's write under `.claude/`. The agent had already found the right file and both commands, but no file was written, so that run cannot count as a pass. The recorded run used `bypassPermissions` in the throwaway project.

### What the plan got wrong

- Task 2's restore-and-run says to run the self-check without committing. The self-check exports `HEAD`, so it would have passed on the committed fix and shown nothing.
- The plan did not foresee that naming `.claude/worktree-setup.txt` in `framework/dispatch.md` turns `framework integrity › references no file that does not exist` red. That needed a change to a file outside *File Structure*.

### Outstanding

- The release item is not breaking.
- The reviewer promotes `worktree-setup-comes-from-the-project` in `feature-catalog.yaml`. The executor did not edit the catalog.
- The reviewer decides whether to keep the integrity-guard exemption or rephrase the prose instead.

## Review record

Reviewed by the specifying session on 2026-10-19, against `f7031d8` on `origin/main` at
`5cd30aa`.

### Checks re-run

- **The guard re-broken:** the branch's tree staged with the two fixed `lines.push` calls put
  back in place of the new `if`/`else` in `scripts/plan-binding.js`, then
  `jest guards/dispatch.test.js`: `2 failed, 13 passed` — exactly the two new cases. Node
  v22.15.0 on dev-laptop.local, Darwin 25.2.0.
- **`bash scripts/check-blueprint.sh`** on the head with this record, before merging; CI's
  `self-check` runs on the pull request as well.
- **The diff against the plan:** Decisions 2–9 as written, read in full for the scripts, the
  guard and both documents. `git diff --stat origin/main...HEAD`: the files in *File
  Structure*, `guards/framework-integrity.test.js` (below), and `feature-catalog.yaml` for the
  promotion.
- **The fresh-agent check** is reported in commit `c5482d5`'s body; not re-run.

### Found

- **Two plan errors, both fixed correctly by the executor.** Task 2's restore-and-run named the
  self-check, which reads only committed content and so could not see an uncommitted restore;
  the executor ran the guard on a staged copy instead, as this review did. And naming
  `.claude/worktree-setup.txt` in a framework document turns `framework-integrity` red, because
  the file is absent on purpose — the same miss as the tier-picks plan's. The executor added
  the path to that plan's one-line exemption. Kept rather than unquoting the path: both files
  are named and deliberately not shipped, and the guard still fails every other missing path.
- **The first probe run was refused a write under `.claude/` by the tool's own permission
  mode**, so it proved nothing; the recorded run used a permissive mode in the throwaway
  project. A finding about running probes, not about this change.

### Outstanding disposition

- **Promoted to `shipped` in this commit**, with the two scripts as modules. Evidence per
  criterion: *steps read from a place the project owns that an update leaves alone* — the file
  sits outside `SHIPPED_ROOTS` and the take writes nothing there; *printed in order, in place of
  the fixed line, per worktree* — `dispatch` › *prints the project's own worktree setup…* and
  *reads each checkout its own setup…*; *no steps: the framework install alone* — the first
  `dispatch` case's exact assertion; *a test goes red with the fixed line restored* — the
  re-break above. The entry skipped `building`.
- **The integrity exemption:** kept, as above.
- **Not breaking:** confirmed. The decision is FW-020: `main` gained FW-019 while this ran.

### Learnings routed

- **A plan that names an intentionally absent file in a framework document must list
  `guards/framework-integrity.test.js`.** Missed twice in one batch. Not written as a rule here:
  the planning rule's question "what is on the other side of this?" already covers it, and two
  hits in one author's batch are not yet a pattern across authors. Raised to the developer.
- **A restore-and-run check must not name the self-check**, which reads `HEAD` only. The same
  reasoning applies; raised to the developer rather than written.

### Merged because

The change is the plan's, its guard goes red with the old line and green with the fix, and the
one file outside the table carries a declared one-line exemption that the plan made necessary.
