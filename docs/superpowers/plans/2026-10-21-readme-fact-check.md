# A project's checks fail when its README names something that does not exist — Implementation Plan

**Abandoned on 2026-10-21, not merged** (PR fcapurso/tropis#115, closed). The developer decided not to check the README mechanically between refreshes; see the design's *Between refreshes* section. Do not dispatch.

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** in a project that keeps its README with Tropis (level `writes` or `suggests`), the
project's own checks fail when the README names a slash command, a linked file or a path
that does not exist — in every set-up project and in this repository; this repository's
own README check keeps only what a refreshed page is guaranteed to have; and `/update` tells
a project with its own skeleton that the default skeleton changed.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md` (*The fact
check*), and the merged plans `2026-10-20-refresh-readme-command.md` and
`2026-10-20-refresh-readme-review-fixes.md` — read their Decisions and review records. This
is plan 2 of 4 for `product-readme-is-kept-current`. Plans 3 (the nudge) and 4 (the
`/release` step) run at the same time on their own branches. **This plan delivers nothing;**
the reviewing session ships the entry when the last of the three merges.

**What the specifying session verified on 2026-10-21, at `main` after PR fcapurso/tropis#112:**

- A project records its README level in `docs/readme/readme.yaml` (`level: writes|suggests|
  manual`); no file means unchosen. The design: the fact check runs at `writes` and
  `suggests` **once a level has been chosen**; unchosen or `manual` means it does not run.
- The workflow now lets a plan that removes or renames a command, file or link the README
  names correct that reference and add nothing else (`framework/workflow.md` doc-closeout
  README row; `rules/planning.md` step 5). This check is what makes that rule bite.
- Guards installed into a project live in `.tropis/guards/` and resolve the root as
  `process.env.FRAMEWORK_ROOT ?? resolve(here, '../..')` — `guards/catalog-entries.test.js`
  line 18 is the pattern. `scripts/set-up-project.sh` lines 68–71 copy exactly five guards
  there; `guards/set-up-project.test.js` lists them (around line 105).
- A guard may import a shipped module from `../scripts/`; `guards/plan-dispatchable.test.js`
  does. Shipped modules are listed in `scripts/installed-scripts.txt`, which setup reads.
- `scripts/check-conformance.sh` runs each guard against a fixture project and against it
  with a planted defect (`CASES`, lines 27–45, `<defect>:<guard>`). The base fixture
  (`fixtures/base/`) has no `README.md` and no `docs/readme/`.
- `scripts/check-blueprint.sh` runs the guards that check this repository itself from
  `FRAMEWORK_GUARDS="operator-page-closeout readme-usable"`, each with `plant` cases (near
  the end): `plant readme-usable README.md "## Getting started"` deletes that line.
- `guards/readme-usable.test.js` (root `resolve(here, '..')`, gated by `isBlueprintTree`)
  asserts fixed phrases, headings and links that a page rewritten from this repository's
  skeleton (`docs/readme/skeleton.md`) is not guaranteed to keep. The skeleton's header
  comment says so. `feature-catalog.yaml` lists `guards/readme-usable.test.js` as a module
  of the shipped entry `blueprint-page-guards-run-in-the-self-check`, so the file must stay.
- `commands/update.md` Stage 8 ends with a printed list; the take's report lists `Replaced`
  files (`scripts/take-version.mjs`, `list('Replaced', replaced)`).

**Model tier: Small–medium.** Interfaces, rules and tests are given; the bodies are the
executor's.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 5 (record which).

**Merge authority: parent review.**

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-readme-facts -b plan/readme-fact-check` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.**
- **`README.md` may change only to correct a reference the new check reports as gone** —
  the workflow's exception. Add nothing.
- **Do not edit `scripts/next.mjs`, `scripts/build-backlog-board.mjs`, `templates/backlog-board.html`
  or `commands/release.md`.** Plans 3 and 4 own them.
- **Do not lower, skip or delete a guard to get green**, except Decision 5's reduction of
  `readme-usable`, which is the decision.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-21. Do not reopen them.

1. **`scripts/readme-facts.js`**, a pure module (strings and paths in, values out; it may
   read the file system only through the `exists` function it is given), added to
   `scripts/installed-scripts.txt`:

   ```js
   /**
    * Each concrete thing a README names: slash commands, relative links, and paths written
    * in inline code. Fenced code blocks are skipped — they quote examples.
    * @param {string} markdown
    * @returns {Array<{kind: 'command'|'link'|'path', name: string, line: number}>}
    */
   export function namedThings(markdown)

   /**
    * The named things that do not exist. `exists(rel)` answers for a path relative to the
    * project root. A command exists when `.claude/commands/<name>.md` or `commands/<name>.md`
    * exists — the second is this repository's source folder.
    * @param {ReturnType<typeof namedThings>} things
    * @param {(rel: string) => boolean} exists
    * @returns {Array<{kind: string, name: string, line: number}>}
    */
   export function missingThings(things, exists)
   ```

   What counts, outside fenced blocks:
   - **command** — `/name` where `name` matches `[a-z][a-z0-9-]*`, preceded by the start of a
     line, whitespace, `(` or a backtick, and not followed by `/`, a letter, digit, `.` or
     `-`. So `/update` counts; `/usr/bin`, `and/or` and URLs do not.
   - **link** — a Markdown link target `](target)` that does not start with `http:`,
     `https:`, `mailto:` or `#`; drop any `#anchor` or `?query`; resolved from the root.
   - **path** — an inline code span whose whole content matches
     `^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]*)+$` (at least one `/`, no spaces), does not start with
     `/`, and contains no `<`, `>`, `*`, `{` or `}`. A trailing `/` names a folder.

2. **`guards/readme-facts.test.js`**, installed into every project's `.tropis/guards/`:
   root `process.env.FRAMEWORK_ROOT ?? resolve(here, '../..')`. It reads
   `docs/readme/readme.yaml`; when the file is absent or the level is not `writes` or
   `suggests`, one test `skips: Tropis does not check this README` passes and nothing else
   runs. Otherwise, with `README.md` absent, one test passes (`nothing is named`); with it
   present, one test asserts `missingThings(namedThings(readme), exists)` is `[]`, and its
   failure message lists each as `README.md:<line> names <kind> <name>, which does not exist`.
   Unit tests in the same file, on strings, for each rule of Decision 1 — one accepted and
   one rejected example per bullet, including `/usr/bin`, `and/or`, a URL, a fenced block, a
   `#anchor` link and a `<placeholder>/path`.

3. **Setup.** `scripts/set-up-project.sh` copies `"$BP"/guards/readme-facts.test.js` with the
   other five guards; add `'.tropis/guards/readme-facts.test.js'` to the list in
   `guards/set-up-project.test.js`.

4. **Conformance.** Create `fixtures/defects/readme-names-missing/` holding
   `docs/readme/readme.yaml` (`level: writes`, `refreshedAt: ""`) and `README.md`:

   ```
   # Fixture

   Run `/no-such-command` to start. See [the guide](docs/no-such-guide.md) and `src/missing/file.js`.
   ```

   Add `readme-names-missing:readme-facts` to `CASES` in `scripts/check-conformance.sh`.
   The clean base has no `docs/readme/`, so the guard skips there and passes.

5. **This repository's own README.**
   - `guards/readme-usable.test.js`: keep its header (reworded to `Locks what this
     repository's README is guaranteed to keep when refreshed from docs/readme/skeleton.md`),
     imports, `isBlueprintTree`, the skip branch, and these assertions only: the page's first
     line is `# Tropis`; it contains `## What is Tropis?` followed by the fixed text in
     `docs/readme/skeleton.md` exactly (read the skeleton, take the text after `Fixed text:`
     up to the next `## `, and assert the README contains it); every slash command the page
     names exists under `commands/` (the existing test). Delete every other assertion.
   - `docs/readme/skeleton.md`: in its header comment, replace the sentence about
     `guards/readme-usable.test.js` with `This repository's README is also checked by
     guards/readme-usable.test.js, for its title and the fixed text below.`
   - `scripts/check-blueprint.sh`: `FRAMEWORK_GUARDS="operator-page-closeout readme-usable
     readme-facts"`; replace `plant readme-usable README.md "## Getting started"` with
     `plant readme-usable README.md "## What is Tropis?"`; add
     `plant readme-facts framework/workflow.md` after the readme-usable plants (the README
     links that file; removing it must fail the check).

6. **`commands/update.md`, Stage 8's printed list.** Add, before the `how to merge` item:
   `- when the take's Replaced list includes .tropis/templates/readme-skeleton.md and the
   project has docs/readme/skeleton.md: say that the default README skeleton changed in this
   release, and offer to show the difference between the two`.

7. **Records.**
   - `framework/DECISIONS.md`: append FW-<next> `A README names only what exists, checked in
     every project`, dated 2026-10-21, Accepted. **Decision:** Decision 1's three kinds, run
     at `writes` and `suggests`, as a guard in every project. **Evidence:** the design; the
     review of PR fcapurso/tropis#112, which found that "a plan does not patch the README"
     and a check on its references deadlock unless a plan may correct a stale reference.
     **Rejected:** warning only, in `/next` and the board (the developer chose a failing
     check, 2026-10-21); checking prose (no check can judge it). **Consequences:**
     `readme-usable` keeps only what a refresh guarantees.
   - `RELEASES.md`, `## [Unreleased]`, after the last change section:

     ```
     ### Your checks catch a README that names something gone

     When Tropis keeps your README (`writes` or `suggests`), `npm --prefix .tropis test` now
     fails if the README names a slash command, a linked file or a path that no longer
     exists, and says which line. Fix it by correcting that reference — or run
     `/refresh-readme`. A project at `manual`, or that has not chosen, is not checked.
     ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. An intermittent red run with no failing test
  named has been seen (backlog `self-check-red-runs-keep-their-output`): run once more and
  report both; change nothing for it. Run nothing else at the same time.
- **The new guard will read this repository's own README in the self-check.** Run it first
  (Task 3) and look at every hit. A real stale reference: correct it in `README.md`, adding
  nothing. A false positive: narrow the rule in `readme-facts.js`, add a unit case for it, and
  say so under *Judgment calls*. Do not exempt a file by name.
- **A guard installed in a project imports `../scripts/readme-facts.js`.** Setup puts it in
  `.tropis/scripts/` only if `scripts/installed-scripts.txt` lists it.
- Plans 3 and 4 also add sections to `RELEASES.md` and records to `framework/DECISIONS.md`.
  Append at the end and do not rebase; the reviewer resolves the order at merge.

## File Structure

| File | Change |
|---|---|
| `scripts/readme-facts.js` | Decision 1, created |
| `scripts/installed-scripts.txt` | Decision 1 |
| `guards/readme-facts.test.js` | Decision 2, created |
| `scripts/set-up-project.sh` | Decision 3 |
| `guards/set-up-project.test.js` | Decision 3 |
| `fixtures/defects/readme-names-missing/docs/readme/readme.yaml` | Decision 4, created |
| `fixtures/defects/readme-names-missing/README.md` | Decision 4, created |
| `scripts/check-conformance.sh` | Decision 4 |
| `guards/readme-usable.test.js` | Decision 5 |
| `docs/readme/skeleton.md` | Decision 5 |
| `scripts/check-blueprint.sh` | Decision 5 |
| `README.md` | Only corrections of references the new check reports as gone, if any |
| `commands/update.md` | Decision 6 |
| `framework/DECISIONS.md` | Decision 7 |
| `RELEASES.md` | Decision 7 |
| `docs/superpowers/plans/2026-10-21-readme-fact-check.md` | Handover report only |

## Tasks

### Task 1: The rules, tested

Decision 1 and Decision 2's unit tests. Commit; self-check green.

### Task 2: The guard in every project

Decisions 2, 3 and 4. Commit; self-check green, with `caught readme-names-missing
readme-facts` in its conformance block. Paste that line.

### Task 3: This repository

Run the new guard on this repository (`FRAMEWORK_ROOT` set to a `git archive HEAD` copy, or
the self-check after Decision 5's list change) and paste every hit; handle each as *Traps*
says. Then Decision 5. Commit; self-check green with `caught readme-facts:
framework/workflow.md planted` and `caught readme-usable: README.md planted`.

### Task 4: Update notice and records

Decisions 6 and 7. Commit; self-check green.

### Task 5: On a real setup, and a fresh-agent check

In a scratch folder outside any repository: `git init`, run this branch's
`scripts/set-up-project.sh`, `npm --prefix .tropis install`. Write `docs/readme/readme.yaml`
at `level: writes` and a `README.md` naming `/next`, `/no-such-thing` and
`[brief](docs/project-brief.md)` (absent). `npm --prefix .tropis test` must fail naming
`/no-such-thing` and `docs/project-brief.md`, and nothing else; paste the failure. Set
`level: manual`: it must pass. Commit at `level: writes` with only `/no-such-thing`
removed from the README.

Then a fresh Claude Code session in it, one prompt:

> This is a probe and its output will be discarded. The project's checks are failing. Find
> out why and fix it the way this project's instructions say. Do not commit.

**Pass:** the agent corrects or removes the reference to `docs/project-brief.md` in
`README.md` (or creates no file and says why), adds no other README text, and names the
planning rule's exception or the workflow's README row; `npm --prefix .tropis test` then
passes. **Fail:** anything else; fix the passage it misread and re-run; if it fails twice,
stop and hand back. Record the prompt, the answer's gist, `git diff`, the tool, version and
machine **in the handover report**. Delete the folder.

### Task 6: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: last line `Self-check passed: …`; project checks green; only files in *File
Structure*. Append `## Handover report` with the six sections the planning rules name,
commit, push, and open a pull request against `main`. Do not merge.

## Criteria this plan advances

`product-readme-is-kept-current`: *renaming or deleting a command, file or link target the
README names makes the project's checks fail*, and the update notice for a project's own
skeleton (part of *a project with its own copy … updates never change it*).
