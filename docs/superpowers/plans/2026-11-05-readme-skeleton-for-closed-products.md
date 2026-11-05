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
built on `readme-follows-the-developers-role`'s branch, which has not merged yet; it is
rebased onto `main` once that merges.

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

## Review record

Fresh reviewer: a Claude Code 2.1.318 subagent on Claude Opus 5.5, with only the
repository and this branch; git 2.43.0, node v22.23.4, Linux x86_64. Reviewed
`HEAD~2..HEAD` (`d964159`, the claim; `8874f14`, the build) on
`plan/readme-skeleton-for-closed-products-build`, which sits on
`readme-follows-the-developers-role`'s unmerged commits.

### Checks re-run

- Changed guards on a scratch copy of the working tree
  (`guards/readme-usable.test.js guards/readme-level.test.js`):
  `Tests: 28 passed, 28 total`.
- Re-broken: `templates/readme-skeleton.md`, `commands/refresh-readme.md`,
  `commands/bootstrap.md`, `bootstrap.md` and `scripts/set-up-project.sh` taken from
  `HEAD~2`, `templates/readme-skeleton-closed.md` removed: `Tests: 9 failed, 19 passed,
  28 total`. The failures are the three new `readme-usable` cases (the closed-source
  outline, both headers naming their reader, setup installing both) and six
  `readme-level` cases (the skeleton option's question, the closed template and "do not
  ask"; Stage 3a and Step 3a's question, the closed template and "copy nothing"). The
  handover's 9 / 19 matches. Restored with `git checkout HEAD -- .`; `git status --short`
  printed nothing.
- `npm --prefix .tropis test` before this record: `Tests: 1 failed, 189 passed, 190
  total`, the one failure `gives every executed plan a review record` naming this plan,
  which this record answers.
- `bash scripts/check-blueprint.sh` on `8874f14`: `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards
  passed.`, exit 0.
- `git diff --stat HEAD~2..HEAD`: eleven files, each in *File Structure*; nothing else.
- Diagnoses re-checked. Decision 4's claim that an update installs the new template:
  `scripts/take-version.mjs` line 173 runs `scripts/set-up-project.sh`, so it holds. The
  `Merges after` removal: on `origin/main` (`e6717b5`) the items building are
  `commands-have-named-fill-ins`, `update-lists-the-release-steps` and
  `readme-follows-the-developers-role`; the first two plans' File Structure tables share
  no file with this plan's except the backlog and bands file the overlap check ignores,
  so a `--claim` on the final plan would have written only
  `readme-follows-the-developers-role`. The removal happened before the claim landed
  (`d964159` carries only that line), so nothing on `main` was taken back. Acceptable.
  The fresh-agent check is described the same way in the handover and in `8874f14`'s
  body, with tool, version, model, operating system and architecture.

### Found

Public exposure: read the whole diff, the plan and both commit messages; nothing. The
only other project is named by its pseudonym, `first-adopter`; no home paths,
hostnames, sessions other than the attribution line, or personal names.

Criteria: 1, 2 and 4 hold and are pinned by guards. 3 holds for `/refresh-readme
skeleton` and, by construction, for `/bootstrap` (below). 5 holds: the skeleton option
copies the open default on no clear answer, Stage 3a and Step 3a copy nothing, and
*Read* falls back to the installed default; the refresh half is checked by reading only,
no guard pins "with no clear answer, copy the open one". The closed-source skeleton fits
its stated reader, has the sections in the stated order, and keeps secrets off the page
twice (the header, and *Environments and accounts*: "where credentials live, never what
they are"). The two commands and the by-hand bootstrap say the same thing; the skeleton
option's later steps (rework, commit that file only) apply unchanged to either copy.
Leaving `commands/update.md` and `guards/set-up-project.test.js` alone is sound: both
are in building plans, and the new template is installed and asserted through
`guards/readme-usable.test.js` reading the setup script.

Defects, none blocking:

1. `commands/refresh-readme.md`, *At `writes`*: "never cut a step from Getting started
   that a reader needs" names the open skeleton's section only. The closed-source
   skeleton's equivalent, *Getting a working copy*, loses that protection when a page
   runs over its limit. One-line fix: name both sections. Not fixed here: this review
   commits only the plan file.
2. `/bootstrap` Stage 3a and `bootstrap.md` Step 3a do not say to skip the question when
   `docs/readme/skeleton.md` already exists. Criterion 3's "not asked, copy untouched"
   holds there only because a project just set up has no skeleton; a project that
   carried one in would be asked, and a closed-source answer would overwrite it.
3. The fresh-agent check exercised `/refresh-readme skeleton` only. The new `/bootstrap`
   paragraph changes what an agent is told too, and no probe ran it; the plan's *Shape*
   scoped the probe that way, so this is a gap in the plan, not in the build.
4. `commands/refresh-readme.md`, *Read*: one line runs to 119 characters, past the
   file's wrap. Cosmetic.
5. The handover's *Scope* said the branch was rebased onto `main` once
   `readme-follows-the-developers-role` merged; that plan has not merged (`origin/main`
   lacks `b50787a`). Fixed in this file by the reviewer, a wording correction of the
   report only.

### Outstanding disposition

- `/update`'s Stage 8 note naming only the default skeleton: no backlog id yet. This
  review commits only the plan file, so it cannot add one. The specifying session raises
  it as an idea, together with defects 1 to 3, once `commands-have-named-fill-ins` and
  `update-lists-the-release-steps` (both touching `commands/update.md`) have shipped, or
  fixes 1 on this branch before merge; either way it is recorded before the merge.
- No criterion needs the developer to observe it; no unexplained symptom.

### Learnings routed

- None generalises beyond this plan. Defect 3 is an instance of the workflow's existing
  rule, *Choose the task to exercise the clause you just wrote*: a change to two commands
  wants a probe of each. No new rule.

### Merged because

The deliverable meets all five criteria, its guards go red without it and green with it,
the self-check passes, and the defects found are small edges and wording that the
specifying session can fix or record as a backlog idea before the self-merge.
