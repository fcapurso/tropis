# A README outline for closed-source products — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** Tropis ships a second README skeleton, for a closed-source product, whose
readers build, run, release or assess it; `/refresh-readme skeleton` and `/bootstrap` ask
whether the product is open or closed-source and use the matching one.

**Backlog item:** `readme-skeleton-for-closed-products` in `feature-catalog.yaml` (type
feature), in the bundle `readme-outline` of `docs/backlog-board/bands.yaml`, after
`readme-follows-the-developers-role`, whose outline this one starts from. There is no
design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — a closed-source product's README is
refreshed from an outline written for its readers.

**What the specifying session verified on 2026-11-05, against `origin/main` at `e6717b5`
(git 2.43.0, node v22.23.4, Claude Code 2.1.318 in a cloud session, Linux x86_64):**

- `templates/readme-skeleton.md` is the only skeleton shipped. Its header comment names
  no reader; its sections (*What it does for you*, *Who it is for*, *What it needs*,
  *Getting started* …) address someone deciding whether to adopt the product.
- `scripts/set-up-project.sh` copies it to `.tropis/templates/` (line 97), and
  `guards/set-up-project.test.js` lists `.tropis/templates/readme-skeleton.md` among the
  files a set-up project has. An update re-runs the same setup, so a template copied there
  is kept current by every release.
- `commands/refresh-readme.md`, *`/refresh-readme skeleton`*, copies the default to
  `docs/readme/skeleton.md` when that file is absent and leaves a copy the project owns;
  a refresh reads `docs/readme/skeleton.md` when it exists, else the installed default.
- `commands/bootstrap.md`, *Stage 3a*, and the by-hand `bootstrap.md`, *Step 3a*, ask
  only for the README level. `guards/readme-level.test.js` pins phrases of that stage.
- `commands/update.md`, Stage 8's report, says the default skeleton changed when the
  take replaced `.tropis/templates/readme-skeleton.md` and the project has its own copy.
- `guards/readme-usable.test.js` checks "both README outlines", the template and this
  repository's, for *What it needs*, a page length and five to seven aspects, and the
  *Using it day to day* jobs `readme-follows-the-developers-role` wrote. No script parses
  a skeleton's sections.
- This plan shares `templates/readme-skeleton.md` and `guards/readme-usable.test.js` with
  `readme-follows-the-developers-role`, building now; the overlap check records it.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is an outline's wording and
command text. The reviewer is a subagent of this session with only the repository and the
branch, on Claude Opus 5.5, the pick `node .tropis/scripts/dispatch.mjs --tier Large`
names, signed in to the developer's plan.

**Merge authority: self-merge after the fresh review.**

**Merges after:** readme-follows-the-developers-role


**Fresh-agent check: owed**, since `/refresh-readme` and `/bootstrap` change what an
agent is told. The probe, a subagent with only the repository, is given an invented
closed-source product in a scratch directory holding the installed templates and no
`docs/readme/skeleton.md`, and told to run `/refresh-readme skeleton` from
`commands/refresh-readme.md`, the developer answering that the product is closed-source.
It passes if it asks the question before copying, copies the closed-source skeleton,
and stops without refreshing; and if, run again on a project that already has a
skeleton, it does not ask.

## Delivers

readme-skeleton-for-closed-products

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-readme-closed-build -b plan/readme-skeleton-for-closed-products-build origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body**; the commit touching `commands/` states the fresh-agent
  check's outcome with its tool, version, model, operating system and architecture.
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Decisions

1. **A second template, `templates/readme-skeleton-closed.md`**, with these sections in
   this order: *What it is* (the opening, no heading: the product and its business
   status), *Getting a working copy*, *Environments and accounts* (which exist and who
   holds them, never a secret), *How it works* (with the mistakes that cost the most),
   *Changing and releasing it* (what the project adds to Tropis's workflow, pointing to
   the rest), *Limits and risks* (including legal and licence exposure), *Where to go
   next*. Page length: at most 1,500 words — longer than the default's 1,200 because it
   holds environments and risks a team needs, still one page. Rejected: one skeleton with
   optional sections, which every refresh would have to judge and no guard could check.
2. **Each skeleton's header names its reader.** The default: someone deciding whether to
   use or adopt the product, who may never have seen it — an open project. The
   closed-source one: someone who builds, runs, releases or assesses the product with
   access to its repository — a new team member, an operator, someone doing due
   diligence. Each says which skeleton fits instead.
3. **The question, and what is copied.** `/refresh-readme skeleton`, when
   `docs/readme/skeleton.md` is absent, asks whether the product is open or
   closed-source and copies the matching skeleton; with a skeleton present it asks
   nothing and leaves it. `/bootstrap` (Stage 3a, and the by-hand Step 3a) asks the same
   question after the level, unless the level is `manual`: on closed-source it copies the
   closed-source skeleton to `docs/readme/skeleton.md`; on open-source it copies nothing,
   since the installed default is the matching skeleton and a copy would stop later
   releases improving it. A project never asked, or not answering, keeps the default.
   Rejected: copying the default for an open product too, which freezes it.
4. **Installed beside the default.** `scripts/set-up-project.sh` copies the new template
   to `.tropis/templates/`, asserted in `guards/readme-usable.test.js` by reading the
   script. `commands/update.md`, whose Stage 8 note names only the default skeleton, and
   `guards/set-up-project.test.js`, whose list of installed files is a subset check, are
   left alone: both are in plans building now (`commands-have-named-fill-ins`,
   `update-lists-the-release-steps`), and touching them would hold this plan behind
   theirs for a courtesy line and a duplicate assertion. A project that owns a skeleton
   owns its changes either way.
5. **The guards say which check holds for which skeleton.** In
   `guards/readme-usable.test.js`, the checks of *What it needs*, the aspects and the
   page length name the open skeletons they read; a new case checks the closed-source
   skeleton's sections in order, its page length, and that it has no *What it does for
   you* or *What it needs*; a case checks both headers name their reader. The phrases of
   the question are pinned in `guards/readme-level.test.js` for both commands.

## Traps

- `commands/` is the source; `.claude/commands/` is not edited.
- The installed `npm --prefix .tropis test` does not run source guards; run the changed
  guards from a scratch copy of the working tree, and `bash scripts/check-blueprint.sh`
  from a commit.
- A backticked path under `docs/`, `scripts/` or `.claude/` in a framework document must
  exist or `framework-integrity` fails; `docs/readme/skeleton.md` is already exempt, and
  the new template is named as `.tropis/templates/…` or `templates/…`, which the guard
  does not check.

## File Structure

| File | Change |
|---|---|
| `templates/readme-skeleton-closed.md` | new: the closed-source skeleton |
| `templates/readme-skeleton.md` | header names its reader and points to the other |
| `commands/refresh-readme.md` | the skeleton option asks open or closed-source |
| `commands/bootstrap.md` | Stage 3a asks and copies the closed-source skeleton |
| `bootstrap.md` | Step 3a, the same by hand |
| `scripts/set-up-project.sh` | installs the new template |
| `guards/readme-usable.test.js` | which checks hold for which skeleton; the closed-source skeleton; setup installs it |
| `guards/readme-level.test.js` | the question in both commands |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-05-readme-skeleton-for-closed-products.md` | the handover report and the review record |

## Tasks

1. Add the guards' cases and run them: they fail against the repository as it stands.
2. Write the skeleton, the headers, the commands, setup and update text; the guards pass.
3. Run the fresh-agent check with its tool calls visible; record it in the commit body.
4. Move the item to `shipped`, write the handover report.
5. Send the branch to the fresh reviewer, who writes the review record.

## Handover report

Built by the specifying session, a Claude Code 2.1.318 cloud session; git 2.43.0, node
v22.23.4, Linux x86_64. Source worked from: none in particular; the skeleton follows the
backlog item's section list and the default skeleton's form, and the command text this
repository's own commands.

### Task completion

- Task 1: done. In `guards/readme-usable.test.js`: the closed-source outline's sections,
  page length and lines; both headers naming their reader and the other skeleton; setup
  copying both; the two open-source cases renamed and a comment saying which checks hold
  for which skeleton. In `guards/readme-level.test.js`: the skeleton option's question,
  both templates and "do not ask"; the same question and "copy nothing" in
  `commands/bootstrap.md` Stage 3a and `bootstrap.md` Step 3a.
- Task 2: done. `templates/readme-skeleton-closed.md`, the default's header,
  `commands/refresh-readme.md`, `commands/bootstrap.md`, `bootstrap.md`,
  `scripts/set-up-project.sh`.
- Task 3: done, passed (below).
- Task 4: done.
- Task 5: the fresh reviewer's record follows.

### Verification results

- Guards on the working tree, with a scratch script that copies the tracked and untracked
  files into a temporary directory and runs jest there:
  `guards/readme-usable.test.js guards/readme-level.test.js` before the change:
  `Tests: 9 failed, 19 passed, 28 total`; after it: `Tests: 28 passed, 28 total`.
- `bash scripts/check-blueprint.sh` on the build commit: `Self-check passed: every guard
  caught its defect, the clean baseline passed, and the framework repository's own guards
  passed.` (set-up-project and framework-integrity run there, not in the scratch copy,
  which lacks their environment).
- Fresh-agent check: a Claude Code 2.1.318 subagent, model Claude Opus 5.5, Linux x86_64,
  signed in to the developer's plan, with only an invented closed-source project in a
  scratch repository (a project brief, a one-line README, `.tropis/templates/` holding
  both skeletons, `.claude/commands/refresh-readme.md` from this branch). Told it was a
  probe, to run `/refresh-readme skeleton` twice, writing each question before taking the
  given answer (closed-source; no changes; yes to commit). Run 1: it asked "Is the
  product open or closed-source?" first, quoting "If `docs/readme/skeleton.md` is absent,
  ask whether the product is open or closed-source, and wait for the answer.", copied
  `.tropis/templates/readme-skeleton-closed.md`, asked to rework and to commit, and
  committed that file only. Run 2: no open-or-closed question, quoting "If the copy is
  already there, do not ask and leave it", and stopped with nothing to commit. Checked
  on disk afterwards: `cmp docs/readme/skeleton.md .tropis/templates/readme-skeleton-closed.md`
  printed nothing and the probe's log was `33a92e1 docs(readme): add the closed-source
  README skeleton` over `init`. Its tool calls were Bash and file reads inside the
  scratch project; a relative `cp` was refused by a permission rule and retried with
  absolute paths, which does not bear on the clause. **Pass.**

### Scope

Every file in *File Structure*. Worktree: the sibling `../tropis-readme-closed-build`,
built on `readme-follows-the-developers-role`'s branch and rebased onto `main` once that
merged.

### Judgment calls

- The page length is 1,500 words, against the default's 1,200: the closed-source page
  holds environments and risks a team needs.
- No *Using it day to day*: the item's section list has none; *Changing and releasing
  it* carries what the team does.
- A clear answer is required to copy the closed-source skeleton; no clear answer copies
  the default in `/refresh-readme skeleton` and nothing in `/bootstrap`, so criterion 5
  holds in both.
- `/bootstrap` skips the question at `manual`, where Tropis keeps out of the README.
- The `Merges after` lines the overlap check first wrote for `commands-have-named-fill-ins`
  and `update-lists-the-release-steps` went with the files that caused them
  (`commands/update.md`, `guards/set-up-project.test.js`), before the claim landed; the
  plan's Decision 4 says why.

### What the plan got wrong

- Nothing found.

### Outstanding

- `/update`'s Stage 8 note names only the default skeleton changing. A closed-source
  project owning a copy is not told when the closed-source template changes. Left out to
  avoid holding this plan behind two others (Decision 4); a project owning a skeleton
  owns its changes.
