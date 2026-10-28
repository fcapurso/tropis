# Every product's README is kept current by the same closeout row — Implementation Plan

**Abandoned on 2026-10-20, not merged** (PR fcapurso/tropis#110, closed). The README design was reshaped; see the catalog entry `product-readme-is-kept-current`. Its self-check fix landed separately (PR fcapurso/tropis#111). Do not dispatch.

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** the doc-closeout table has one row that sends a change in what a product's
users are told to that product's own README — the same row in every project and in this
repository — and the planning rule asks a plan author for it. Today the table names only
the framework's own README ("the blueprint `README`"), so a set-up project's README has
no row at all.

**Spec:** the entry `product-readme-is-kept-current` in `feature-catalog.yaml`. Read its
value and its four criteria. There is no separate design document: the change is two
table rows, one checklist step, one guard, a decision record and a release note, all
given verbatim below.

**What the specifying session verified on 2026-10-20, against `main` at the commit that
adds this plan:**

- **`framework/workflow.md`, lines 285–286**, the two README rows of the doc-closeout
  table:
  ```
  | alters what an operator is told to do or how to start (commands named, start path, jobs, streams) | the project's operator guide, `.tropis/README.md` (and any guard that asserts those claims) |
  | alters what an adopter is told to do or how to start | the blueprint `README` — only in a plan that executes in the blueprint repository; never as a side-effect of a project plan |
  ```
  No other row names a README.
- **`rules/planning.md`, lines 238–240**, step 5 of *Before finalising the table*:
  ```
  5. If the plan changes what an operator or adopter is told to do or how to start,
     add the matching README from the doc-closeout table (the project's operator
     guide vs the blueprint README — separate rows), or state in the plan that no durable page change is warranted.
  ```
- **`guards/operator-page-closeout.test.js`** locks the current wording: it requires
  `alters what an adopter is told to do or how to start … blueprint \`README\``,
  `never as a side-effect of a project plan`, and `operator or adopter` in the planning
  rule. All three go away here, so the guard is rewritten (Decision 3). It runs only in
  this repository (its `isBlueprintTree` check), through the self-check.
- `git grep -nE "blueprint .?README|adopter is told|operator or adopter"` over
  `rules framework commands scripts guards templates README.md bootstrap.md
  PORTABILITY-NOTES.md AGENTS.md` finds only the three places above plus
  `framework/DECISIONS.md` FW-006 (lines 226–241), which is history and is not edited;
  FW-024 says what it replaces.
- `framework/DECISIONS.md` ends at FW-023. `RELEASES.md` `## [Unreleased]` opens with a
  paragraph about `/update` and holds one section, `### Update with one command: /update`.
- Per the breaking-change definition at the top of `RELEASES.md`, this change is **not
  breaking**: no file moves, no command changes, no hook or project-filled block changes
  shape, no `paths:` header changes.
- This repository's installed release is v0.3.1 (`.tropis/installed.json`), whose dispatch
  asks for the projections of an edited `rules/<name>.md`; see *Traps*.

**Model tier: Small.** All target text is given verbatim.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** This changes a shipped rule and a framework document,
and the fresh-agent check's result needs reading by the session that wrote the criteria.

Do not store a kick-off prompt on this plan.

---

## Delivers

product-readme-is-kept-current

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-product-readme -b plan/product-readme-is-kept-current` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They hold the installed release. This change reaches them when this
  repository takes the release that ships it.
- **Do not edit FW-006 in `framework/DECISIONS.md`.** A decision record is history.
- **Do not lower, skip or delete a guard to get green.** Decision 3 replaces one guard's
  assertions with new ones; that is the only guard change allowed.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-20. Do not reopen them.

1. **`framework/workflow.md`.** Replace the two rows quoted above with these two, in the
   same place:

   ```
   | alters what someone developing the project is told to do or how to start (commands named, start path, jobs, streams) | the project's operator guide, `.tropis/README.md` (and any guard that asserts those claims) |
   | alters what the product's users are told to do or how they start | the product's own README, usually `README.md` at the repository root. In the framework's own repository that is the framework's README, by this same row. A plan updates only the README of the product it changes, never another product's |
   ```

   *Why the first row changes too:* "operator" did not say whose — a product's user
   operates it as well. Naming the developer of the project is what tells the two rows
   apart (criterion 3).

2. **`rules/planning.md`.** Replace step 5 (quoted above, three lines) with:

   ```
   5. If the plan changes what the product's users are told to do or how they start,
      add the product's own README; if it changes what someone developing the project is
      told, add the operator guide. They are separate rows of the doc-closeout table. Or
      state in the plan that neither page needs a change.
   ```

3. **`guards/operator-page-closeout.test.js`.** Keep the file header, imports,
   `isBlueprintTree`, the file reads, the skip branch and the test
   `does not impose a blanket project-or-blueprint → README obligation` unchanged. Replace
   the other three tests with these four:

   ```js
   it("names the project's operator guide for what a developer of the project is told", () => {
     expect(workflow).toMatch(
       /alters what someone developing the project is told[\s\S]*?operator guide/,
     );
   });

   it("names the product's own README for what its users are told, as its own row", () => {
     expect(workflow).toMatch(
       /alters what the product's users are told to do or how they start \| the product's own README/,
     );
     expect(workflow).toMatch(/never another product's/);
   });

   it('has no separate row for the framework README', () => {
     expect(workflow).not.toMatch(/adopter is told/);
     expect(workflow).not.toMatch(/blueprint `README`/);
   });

   it('tells plan authors to check both README rows', () => {
     expect(planning).toMatch(/what the product's users are told[\s\S]*?product's own README/);
     expect(planning).toMatch(/operator guide/);
   });
   ```

   Change the header line `Locks the two narrow README closeout rows.` to
   `Locks the two README closeout rows: the operator guide and the product's own README.`

4. **`framework/DECISIONS.md`.** Append, after FW-023, separated by a blank line as the
   other entries are. If another plan has taken FW-024 by the time you append, use the
   next free number:

   ```
   ## FW-024: Every product's README closes out by the same row

   **Date:** 2026-10-20 · **Status:** Accepted

   **Decision:** The doc-closeout table has one row for a change that alters what a
   product's users are told or how they start, and it names that product's own README —
   the framework's in the framework's repository, a project's in that project's. It
   replaces FW-006's blueprint-README row, which named only the framework's README. The
   operator-guide row now says it is about what someone developing the project is told.
   FW-006's narrowness holds: a plan owes the page only when it changes what the page
   says, and only the README of the product it changes.

   **Evidence:** Before this, the table named two pages — the operator guide and the
   blueprint README — and a set-up project's own README was neither. No rule in any
   set-up project named it, so it stayed current only if someone remembered.

   **Rejected:** A third row for project READMEs beside the blueprint one — two rows
   saying the same thing for different products drift, and the framework becomes a
   special case of its own rules. Folding the product README into the operator-guide
   row — the two pages have different readers, and a change for one rarely owes the
   other.

   **Consequences:** A plan in a set-up project lists its README when it changes what the
   product's users are told, or says it needs no change. A project's plan still never
   edits the framework's README; that is now a case of the general limit rather than a
   rule of its own.
   ```

5. **`RELEASES.md`.** Under `## [Unreleased]`, add after the last section already there,
   separated by a blank line:

   ```
   ### Your product's README is part of every plan's closeout

   The workflow's doc-closeout table now has a row for a change that alters what your
   product's users are told or how they start, and it names your product's own README.
   Before, it named only the framework's README, so nothing reminded a plan to update
   yours. The planning rule asks a plan that makes such a change to list the README or
   say it needs none. The row for the operator guide now says it is about what someone
   developing the project is told. This is not a breaking change.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs the installed
  release's checks on this repository as a project, and is not a check of this change.
- **Task 1 has a deliberately red step.** The guard is committed before the text it
  checks, and the self-check must then fail. Do not fix that by changing the guard.
- **Line numbers shift once you edit.** Make the replacements by matching the quoted text.
- **Do not put a path in backticks under `docs/`, `scripts/` or `.claude/` into any of the
  new text.** `framework-integrity` fails the self-check on a named path that does not
  exist. `README.md` and `.tropis/README.md` are outside those and are fine.
- **Two installed rule files are in *File Structure* and must not be edited.** This
  repository's installed dispatch (v0.3.1) treats `rules/planning.md` as a shipped rule a
  project generates into `.claude/rules/` and `.cursor/rules/`, and refuses a plan that
  does not list both. Here `rules/` is source and nothing is generated from it, so they
  stay out of the diff.
- **The fresh-agent check needs the agent to write a plan file.** The planning rule is
  delivered by file path; an agent that only discusses the change never receives it. The
  prompt in Task 4 asks for a file under `docs/superpowers/plans/`.

## File Structure

| File | Change |
|---|---|
| `guards/operator-page-closeout.test.js` | Decision 3 |
| `framework/workflow.md` | Decision 1 |
| `rules/planning.md` | Decision 2 |
| `framework/DECISIONS.md` | Decision 4 |
| `RELEASES.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-20-product-readme-is-kept-current.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |
| `.claude/rules/planning.md` | **Not edited.** Listed only so dispatch accepts the plan; see *Traps* |
| `.cursor/rules/planning.mdc` | **Not edited.** Same reason |

## Tasks

### Task 1: Guard, then the rows it checks

1. Make Decision 3. Commit. Run `bash scripts/check-blueprint.sh`. **Expected: red**, with
   these four failing in `operator-page-closeout`: *names the project's operator guide
   for what a developer of the project is told*, *names the product's own README for what
   its users are told, as its own row*, *has no separate row for the framework README*,
   and *tells plan authors to check both README rows*. Paste the failing test names.
2. Make Decisions 1 and 2. Then run:

   ```bash
   git grep -nF "the product's own README" -- framework rules
   ```

   Expected: two hits, one in `framework/workflow.md` and one in `rules/planning.md`. Then:

   ```bash
   git grep -nE "adopter is told|blueprint .README|operator or adopter" -- framework/workflow.md rules/planning.md
   ```

   Expected: no output, exit status 1. Paste both outputs.
3. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 2: Decision record and release note

Decisions 4 and 5. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: On a real setup

In a scratch folder outside any repository, `git init` a project, run this branch's
`scripts/set-up-project.sh` on it, then `npm --prefix .tropis install` and
`npm --prefix .tropis test`: green. Then run, in that project:

```bash
grep -rnF "the product's own README" .claude .cursor
```

Expected, three hits: `.claude/framework/workflow.md`, `.claude/rules/planning.md` and
`.cursor/rules/planning.mdc` (setup installs each; verified by the plan of 2026-10-20 for
findings, which grepped the same three files). Paste the output.

Then give the scratch project a product to describe: a `package.json` with
`"scripts": { "start": "node server.js" }` and a root `README.md` reading

```
# Greeter

A small web server that says hello.

## Getting started

Run `npm start`. The server listens on port 3000.
```

Commit everything (setup's own step included), so Task 4 starts from a clean tree. Keep
the folder for Task 4.

### Task 4: Fresh-agent check

A shipped rule and a framework document changed, so this is required. In the Task 3
scratch project, start a fresh Claude Code session and give it, in one prompt:

> This is a probe and its output will be discarded. Write a plan, as a file under
> `docs/superpowers/plans/`, for this change: the start command becomes
> `npm run serve`, and the port becomes a `--port` option that defaults to 3000. Follow
> this project's planning rules, including its File Structure table. Do not implement
> the change. Then tell me which documentation pages the plan updates, and which
> instruction told you so.

**Pass:** the plan's File Structure table lists the root `README.md` as updated; the
agent names the doc-closeout row for what the product's users are told, or step 5 of the
planning rule, as the instruction; and it does not send this change to
`.tropis/README.md`.

**Fail:** any other outcome. Then find which passage the agent did not receive or
misread, fix it, and run the check again. If it fails twice, stop and hand back: the
wording is a judgment for the reviewer, not the executor.

Record the prompt, the answer's gist, the plan's File Structure table, pass or fail, and
the tool, version and machine, in a commit body on the branch. Delete the scratch folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name,
and commit. In *Outstanding*, say that this change is not breaking and that the reviewer
promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| A closeout row for what the product's users are told names the product's own README | Decision 1; guard (Decision 3); Task 1 grep |
| The row reads the same everywhere; no separate framework-README row remains | Decision 1; guard *has no separate row for the framework README*; Task 3 grep on an installed project |
| The row is told apart from the operator-guide row | Decision 1; guard's first two tests; Task 4 (the change does not go to `.tropis/README.md`) |
| The planning rule asks for the README or a stated reason | Decision 2; guard *tells plan authors to check both README rows*; Task 4 |

## Not in this plan

- **Checking that a plan actually lists its README.** The criteria ask that the rule
  reach the plan author, not that a guard enforce it; a README change is a judgment about
  what a change tells users, which no check can make.
- **This repository's own `CLAUDE.md`,** which describes `README.md` as what adopters are
  told. It is the project's own file, already true, and outside this plan's checkout
  constraints.
