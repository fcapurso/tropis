# A project refreshes its README as a whole page with /refresh-readme — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** a project can bring its README up to date as a whole page with `/refresh-readme`,
at a level it chose — Tropis writes it, Tropis suggests, or manual — from a skeleton Tropis
ships or the project's own copy; setup asks for the level, an existing project is asked on
its next update, Tropis itself is set up the same way, and the workflow stops asking each
plan to patch the README.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md`, approved by the
developer on 2026-10-20. Read it whole. This is the first of four plans for the entry
`product-readme-is-kept-current`; the other three — the fact check, the nudge in `/next` and
the board, and the step in `/release` — are written after this one merges and build on the
settings file it creates. **This plan delivers nothing.**

**What the specifying session verified on 2026-10-20, against `main` at the commit that adds
this plan:**

- Commands are agent instructions in `commands/<name>.md` with a `description:` front matter
  line; `scripts/set-up-project.sh` line 55 copies `commands/*.md` into a project's
  `.claude/commands/`. `guards/set-up-project.test.js` lists, in *ships project-owned blocks
  only where a project fills something in*, every installed command that has a project-owned
  block; a new command without one changes nothing there.
- Templates reach a project only by an explicit `cp` in `scripts/set-up-project.sh` (lines
  74–75 copy three into `.tropis/templates/`). `scripts/take-version.mjs` builds what an
  update installs by running that same script into a temporary folder (line 147), so one
  `cp` line covers new and updated projects. `guards/set-up-project.test.js` lists every
  file setup writes (lines 100–118); a new template must be added there.
- `/update` (`commands/update.md`, Stage 6 step 5) does every required step in the release
  notes' `### After updating: what to do by hand` section, and asks when a step needs the
  user's judgement (FW-023). `RELEASES.md` `## [Unreleased]` has no such section yet.
- `commands/bootstrap.md` has Stages 0–7; `bootstrap.md` is its long form with Steps 0–7 and a
  closing checklist. Stage 3 runs `/scope`, which writes `docs/project-brief.md`.
- `framework/workflow.md` lines 285–286 are the two README rows of the doc-closeout table:
  ```
  | alters what an operator is told to do or how to start (commands named, start path, jobs, streams) | the project's operator guide, `.tropis/README.md` (and any guard that asserts those claims) |
  | alters what an adopter is told to do or how to start | the blueprint `README` — only in a plan that executes in the blueprint repository; never as a side-effect of a project plan |
  ```
- `rules/planning.md` lines 238–240, step 5 of *Before finalising the table*:
  ```
  5. If the plan changes what an operator or adopter is told to do or how to start,
     add the matching README from the doc-closeout table (the project's operator
     guide vs the blueprint README — separate rows), or state in the plan that no durable page change is warranted.
  ```
- `guards/operator-page-closeout.test.js` asserts exactly those words (`operator is told`,
  `adopter is told … blueprint \`README\``, `never as a side-effect of a project plan`,
  `operator or adopter`). `scripts/check-blueprint.sh` plants a defect for it by deleting the
  line of `framework/workflow.md` containing ``blueprint `README` `` (its `plant` calls near
  the end). Both change here.
- `guards/framework-integrity.test.js` fails on a path in backticks under `docs/`, `scripts/`
  or `.claude/` that does not exist, except those it exempts on line 59
  (`docs/model-picks.md`, `.claude/worktree-setup.txt`). The settings and skeleton paths this
  plan names are absent in a fresh project, so they join that exemption.
- `templates/README.md` (the operator guide a project gets) lists "Commands you will type
  here" on line 53.
- This repository has no `docs/project-brief.md`. Its README's "What is Tropis?" section is
  lines 7–21 of `README.md`, approved word for word by the developer on 2026-10-15.
- The installed release is v0.3.1; nothing here reaches `.claude/` until this repository
  takes the release.

**Model tier: Small–medium.** Every file's content or shape is given; the command's prose is
specified stage by stage.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 5 (record which).

**Merge authority: parent review.**

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-refresh-readme -b plan/refresh-readme-command` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.**
- **Do not edit `README.md`.** Bringing it up to date is what the command is for; its first
  refresh happens after this repository takes the release.
- **Do not lower, skip or delete a guard to get green.** Decision 7 rewrites one guard's
  assertions to the new wording; that is the only guard change allowed besides additions.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-20 from the approved design. Do not reopen them.

1. **The settings file**, `docs/readme/readme.yaml`, owned by the project and never written
   by setup or an update. Its whole format:

   ```yaml
   # How Tropis keeps this project's README. Change it with /refresh-readme <level>.
   level: writes          # writes · suggests · manual
   refreshedAt: ""        # the commit the README was last refreshed at; empty until then
   ```

   **No file means the level is unchosen**: `/refresh-readme` then behaves as at `suggests`.

2. **The default skeleton**, `templates/readme-skeleton.md`, installed as
   `.tropis/templates/readme-skeleton.md`. **A project's own copy** lives at
   `docs/readme/skeleton.md`; when it exists it is used instead, and setup and updates never
   write it. The format: a short header comment, then one `## <Heading>` per section in
   order. Under each heading, either three lines —

   ```
   - **Job:** <what the section is for>
   - **Facts from:** <where the facts come from>
   - **Length:** <roughly how long>
   ```

   — or a line `Fixed text:` followed by the text to copy into the README word for word, up to
   the next `## `. The default skeleton's content, verbatim:

   ```
   <!-- The README's sections, in order. A project may copy this file to
        docs/readme/skeleton.md and change it; /refresh-readme then uses that copy. -->

   ## What it is
   - **Job:** one paragraph a newcomer can read in ten seconds: what this is and what problem it solves.
   - **Facts from:** the project brief (Problem, Solution), the catalog's shipped entries.
   - **Length:** one paragraph.

   ## What it does for you
   - **Job:** the outcomes someone gets, as outcomes, not a list of files.
   - **Facts from:** the shipped catalog entries of layer product, type feature or improvement.
   - **Length:** a short list.

   ## Who it is for
   - **Job:** who it fits and who it does not, so a reader can rule themselves in or out.
   - **Facts from:** the project brief, the decision record.
   - **Length:** two short paragraphs.

   ## Getting started
   - **Job:** the shortest path to a first success, as numbered steps that work as written.
   - **Facts from:** the setup scripts and commands, the operator guide.
   - **Length:** as few steps as it takes.

   ## How it works
   - **Job:** an overview of how the parts fit, linking to the deeper documents instead of copying them.
   - **Facts from:** the architecture document, the decision record, the framework documents.
   - **Length:** a few paragraphs.

   ## Using it day to day
   - **Job:** what someone does once it is set up: the commands they type and when.
   - **Facts from:** the installed commands and scripts.
   - **Length:** a short section.

   ## Where it stands
   - **Job:** what works today and the known limits, honestly.
   - **Facts from:** the catalog (shipped, building, shelved), the release notes.
   - **Length:** a short list.

   ## Where to go next
   - **Job:** links to the deeper documents, how to contribute, the licence.
   - **Facts from:** the repository's own documents.
   - **Length:** a short list.
   ```

3. **`commands/refresh-readme.md`**, a new command, `description: Bring the README up to date
   as a whole page, at the level the project chose`. Its stages, in this order, written in
   the voice of the other commands:

   - **Options.** `/refresh-readme` refreshes. `/refresh-readme writes|suggests|manual`
     writes that level into `docs/readme/readme.yaml` (creating the file, `refreshedAt: ""`,
     if absent), commits that one file with a message saying the level and why it matters,
     and stops. `/refresh-readme skeleton` copies `.tropis/templates/readme-skeleton.md` to
     `docs/readme/skeleton.md` if absent, then offers to rework it with the developer in
     conversation; it commits the skeleton on the developer's yes and stops.
   - **Pre-flight.** Refuse on a working tree with uncommitted changes (`git status
     --porcelain` prints anything). Read the level; no file means `suggests`.
   - **Read.** The skeleton (the project's copy, else the default), `README.md`, and the
     facts each section names. The shipped entries since `refreshedAt` are found by
     comparing `git show <refreshedAt>:feature-catalog.yaml` with the current catalog; with
     `refreshedAt` empty, every section is a candidate.
   - **Judge.** For each skeleton section, decide whether the README's section is out of
     date, missing, or fine — by reading it against the section's job and facts, not by
     matching words. A README whose sections do not match the skeleton is restructured to
     it. A `Fixed text:` section must match its text exactly; if it differs, it is out of
     date.
   - **At `suggests`, or `manual`, or an unchosen level:** report, per section, what is
     missing or out of date and why, and change nothing. Stop.
   - **At `writes`:** rewrite each out-of-date section in `README.md`, whole, in the order
     the skeleton gives; copy `Fixed text:` exactly. Then list each changed section with one
     line on why. Ask the developer to read the page and edit it if they like. On yes, write
     the current `HEAD` commit into `refreshedAt` and commit `README.md` and the settings
     file once, with a message naming what was brought up to date. On no, run
     `git restore README.md` and stop.
   - **Never** edit the skeleton during a refresh, and never push.

4. **`scripts/set-up-project.sh`.** Add `"$BP"/templates/readme-skeleton.md` to the `cp` on
   line 74 (beside `project-brief.md`). Add `'.tropis/templates/readme-skeleton.md'` to the
   list in `guards/set-up-project.test.js` after `'.tropis/templates/project-brief.md'`.

5. **Setup asks.** In `commands/bootstrap.md`, add after Stage 3:

   ```
   ## Stage 3a — Choose how Tropis keeps the README

   Ask which level the project wants: Tropis writes the README from its skeleton
   (`writes`), Tropis only reports what is behind (`suggests`), or Tropis stays out of it
   (`manual`). Recommend `writes` when the project had no `README.md` before the setup, and
   `suggests` when it had one. Then run `/refresh-readme <level>`.
   ```

   In `bootstrap.md`, add the same as `## Step 3a — Choose how Tropis keeps the README`
   after Step 3, with `/refresh-readme <level>` replaced by writing `docs/readme/readme.yaml`
   in the format of Decision 1 by hand, and add `- [ ] README level chosen
   (`docs/readme/readme.yaml`)` to its checklist after the brief's line.

6. **Tropis itself.** Create `docs/readme/readme.yaml` with `level: writes` and
   `refreshedAt: ""`, and `docs/readme/skeleton.md`: the default skeleton with a section
   `## What is Tropis?` inserted after `## What it is`, holding `Fixed text:` followed by
   lines 9–21 of `README.md` exactly (the two paragraphs under that heading, without the
   heading). Change `## What it is`'s **Facts from** to `the opening paragraph of README.md,
   the framework documents, RELEASES.md` — this repository has no project brief.

7. **The workflow and the planning rule.**
   - `framework/workflow.md`: replace the two rows quoted above with

     ```
     | alters what someone developing the project is told about working with the framework (the framework commands it names, how to set up a working copy) | the project's operator guide, `.tropis/README.md` (and any guard that asserts those claims) |
     | alters what the product's users are told to do or how they start | nothing in the plan: the product's README is refreshed as a whole page by `/refresh-readme`, on its own or from `/release`. A plan does not patch it |
     ```
   - `rules/planning.md`: replace step 5 with

     ```
     5. If the plan changes what someone developing the project is told about working with
        the framework, add the operator guide from the doc-closeout table. A plan does not
        patch the product's README; `/refresh-readme` keeps it current.
     ```
   - `guards/operator-page-closeout.test.js`: keep the header, imports, `isBlueprintTree`,
     the reads, the skip branch and *does not impose a blanket … obligation*. Replace the
     other three tests with:

     ```js
     it("names the project's operator guide for what a developer of the project is told", () => {
       expect(workflow).toMatch(
         /alters what someone developing the project is told about working with the framework[^\n]*\| the project's operator guide/,
       );
     });

     it("sends the product's README to /refresh-readme, not to each plan", () => {
       expect(workflow).toMatch(
         /alters what the product's users are told to do or how they start \| nothing in the plan[^\n]*`\/refresh-readme`[^\n]*A plan does not patch it/,
       );
       expect(workflow).not.toMatch(/adopter is told/);
     });

     it('tells plan authors that a plan does not patch the README', () => {
       expect(planning).toMatch(/5\. If the plan changes what someone developing the project is told[\s\S]*?A plan does not\s+patch the product's README/);
     });
     ```
   - `scripts/check-blueprint.sh`: in the `plant operator-page-closeout framework/workflow.md`
     call, replace ``"blueprint \`README\`"`` with `"A plan does not patch it"`.

8. **`guards/framework-integrity.test.js` line 59.** Add `docs/readme/readme.yaml` and
   `docs/readme/skeleton.md` to the paths exempted, with the existing comment's reason: a
   project may not have them yet.

9. **`templates/README.md`.** Add `` `/refresh-readme` `` to the "Commands you will type here"
   list on line 53, after `` `/refresh-board` ``.

10. **Records.**
    - `framework/DECISIONS.md`: change FW-006's status line to `**Date:** 2026-08-16 ·
      **Status:** Accepted. Its blueprint-README row is superseded by FW-<n>` and append
      FW-<n> (the next free number), titled `A product's README is refreshed as a whole
      page, at a level the project chooses`, dated 2026-10-20, Accepted. **Decision:** the
      design's *How it works* in four sentences — skeleton the project may own, three
      levels recorded in the project's settings, `/refresh-readme` rewrites whole sections
      and commits only on the developer's yes, plans no longer patch the README.
      **Evidence:** the two abandoned plans of 2026-10-20 (PR fcapurso/tropis#110): per-plan
      patching accrues, and a check at dispatch misses work built without it. **Rejected:**
      a closeout row per plan; a check at dispatch; markers in the README for fixed text
      (the skeleton holds it). **Consequences:** the fact check, the nudge and the
      `/release` step follow in their own plans.
    - `RELEASES.md`, under `## [Unreleased]`, after the last section:

      ```
      ### Keep your README current with /refresh-readme

      `/refresh-readme` brings your project's README up to date as a whole page, section by
      section, from a skeleton Tropis ships or your own copy of it. You choose how much it
      does: it rewrites the page and commits only when you say yes (`writes`), it only
      reports what is behind (`suggests`), or it stays out of your README (`manual`). Plans
      no longer patch the README one change at a time.

      ### After updating: what to do by hand

      **1. Choose how Tropis keeps your README.** Run `/refresh-readme writes`,
      `/refresh-readme suggests` or `/refresh-readme manual`. Choose `suggests` if you wrote
      your README yourself and want to keep writing it; `manual` to keep Tropis out of it
      entirely. Until you choose, `/refresh-readme` only reports.
      ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict.
- **Decision 7's guard change and its plant change are one edit.** With the old plant the
  self-check reports `NOT CAUGHT` or `FAILED` for `operator-page-closeout`; commit them
  together.
- **Do not put a path in backticks under `docs/`, `scripts/` or `.claude/` into framework or
  command text unless it exists here or is exempted by Decision 8.**
- **Two installed rule files are in *File Structure* and must not be edited.** The installed
  dispatch (v0.3.1) asks for them because `rules/planning.md` changes.
- **The fresh-agent check needs the agent to run the command on a real README**, in a
  project set up from this branch.

## File Structure

| File | Change |
|---|---|
| `templates/readme-skeleton.md` | Decision 2, created |
| `commands/refresh-readme.md` | Decision 3, created |
| `scripts/set-up-project.sh` | Decision 4 |
| `guards/set-up-project.test.js` | Decision 4 |
| `commands/bootstrap.md` | Decision 5 |
| `bootstrap.md` | Decision 5 |
| `docs/readme/readme.yaml` | Decision 6, created |
| `docs/readme/skeleton.md` | Decision 6, created |
| `framework/workflow.md` | Decision 7 |
| `rules/planning.md` | Decision 7 |
| `guards/operator-page-closeout.test.js` | Decision 7 |
| `scripts/check-blueprint.sh` | Decision 7, one argument |
| `guards/framework-integrity.test.js` | Decision 8 |
| `templates/README.md` | Decision 9 |
| `framework/DECISIONS.md` | Decision 10 |
| `RELEASES.md` | Decision 10 |
| `docs/superpowers/plans/2026-10-20-refresh-readme-command.md` | Handover report only |
| `.claude/rules/planning.md` | **Not edited.** Listed only so dispatch accepts the plan |
| `.cursor/rules/planning.mdc` | **Not edited.** Same reason |

## Tasks

### Task 1: The skeleton, the settings, setup

Decisions 1, 2, 4, 6 and 8. Commit; `bash scripts/check-blueprint.sh`: green.

### Task 2: The command and the setup question

Decisions 3, 5 and 9. Commit; self-check green.

### Task 3: The workflow, the rule, the guard

Decision 7, in one commit. Self-check green, with `caught operator-page-closeout:
framework/workflow.md planted` in its framework section. Then, on a throwaway commit never
pushed, restore `main`'s `framework/workflow.md`: the self-check must end
`Self-check FAILED: the framework repository's own guards (above).` Paste both; drop the
throwaway with `git reset --hard HEAD~1`.

### Task 4: Records, and a real setup

Decision 10. Commit; self-check green. Then in a scratch folder outside any repository:
`git init`, run this branch's `scripts/set-up-project.sh`, `npm --prefix .tropis install`,
`npm --prefix .tropis test` (green), and confirm `.claude/commands/refresh-readme.md` and
`.tropis/templates/readme-skeleton.md` exist and `docs/readme/` does not. Paste the
output. Keep the folder.

### Task 5: Fresh-agent check

Required: a framework document, a shipped rule and a command changed. In the Task 4
project, write a `docs/project-brief.md` of five lines describing **Greeter**, a small web
server that says hello, whose users start it with `npm start` and can set `--port`; a root
`README.md` of three lines that mentions only `npm start`; a `feature-catalog.yaml` entry
`port-option` (layer product, type feature, status shipped) for the port option; and
`docs/readme/readme.yaml` at `level: writes`, `refreshedAt: ""`. Commit. Start a fresh
Claude Code session in it and give it, in one prompt:

> This is a probe and its output will be discarded. Run /refresh-readme. When it asks me to
> approve, stop there and tell me which sections you changed and why. Do not commit.

**Pass:** the README now follows the default skeleton's sections; it mentions `--port`;
nothing is committed (`git log` unchanged, `git status` shows `README.md` modified); the
agent lists changed sections with a reason each. Then `git restore README.md`, set
`level: suggests`, commit, and give a new session the same prompt: **pass** if it reports
and `git status` is clean. Then set `level: manual` and repeat: **pass** if it only reports
and changes nothing.

**Fail:** any other outcome. Find which passage the agent did not receive or misread, fix
it, and run again. If it fails twice, stop and hand back.

Record the prompts, each answer's gist, `git status` and `git log --oneline -1` after each
run, pass or fail, and the tool, version and machine, **in the handover report**. Delete the
scratch folder.

### Task 6: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: the self-check's last line is `Self-check passed: …`; the project checks green;
only the files in *File Structure*. Append `## Handover report` with the six sections the
planning rules name, commit, push the branch and open a pull request against `main`. Do not
merge.

---

## Criteria this plan advances

Of `product-readme-is-kept-current`'s criteria: the refresh at each level, the skeleton and
the project's own copy, the setup question and the update step, and Tropis's own skeleton and
closeout row. The entry ships with the fourth plan.

## Not in this plan

- The fact check, the nudge, the `/release` step: three later plans.
- `/update` telling a project with its own skeleton that the default changed: with the fact
  check's plan, which touches the update path anyway.
- Refreshing this repository's README: after it takes the release.

## Handover report

### Task completion

All six tasks are done. The fresh-agent check passed on the first run at each level.
The scratch project was deleted afterwards. Nothing was merged: merge authority is
parent review.

### Verification results

Each `bash scripts/check-blueprint.sh` below ended

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

and its framework section contained `caught operator-page-closeout: framework/workflow.md planted`.

- Task 1, on `cd8f4a6`.
- Task 2, on `6de1fd1`.
- Task 3, on `b2fed19`, before the throwaway. Framework section:

```
Framework repository: its own guards must pass here and fail on a planted defect

  caught      operator-page-closeout: framework/workflow.md planted
  caught      operator-page-closeout: PORTABILITY-NOTES.md planted
  caught      readme-usable: README.md planted
  caught      readme-usable: PORTABILITY-NOTES.md planted

Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

- Task 3 throwaway, on `cda1d66`, `main`'s `framework/workflow.md` restored and committed, never pushed. The conformance block was the same caught list as the green runs. Framework section and verdict:

```
Framework repository: its own guards must pass here and fail on a planted defect

  FAILED      operator-page-closeout fails on the framework repository
  FAILED      operator-page-closeout fails on the framework repository
  caught      readme-usable: README.md planted
  caught      readme-usable: PORTABILITY-NOTES.md planted

Self-check FAILED: the framework repository's own guards (above).
```

  Dropped with `git reset --hard HEAD~1`. `HEAD` was `b2fed19` afterwards. The throwaway `cda1d66` is not on the branch.

- Task 4, on `00ed838`, same passed verdict as Task 1.

Scratch project at `/tmp/tropis-refresh-readme-probe` (deleted after Task 5). `git init`, then this branch's `scripts/set-up-project.sh`, then:

```
=== npm test ===

> tropis-refresh-readme-probe-framework@1.0.0 test
> node --experimental-vm-modules node_modules/.bin/jest

PASS guards/rule-areas.test.js
PASS guards/project-layout.test.js
PASS guards/catalog-entries.test.js
PASS guards/rules-generated.test.js
PASS guards/installed-files.test.js

Test Suites: 5 passed, 5 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        0.682 s
Ran all test suites.
=== confirm ===
HAS .claude/commands/refresh-readme.md
HAS .tropis/templates/readme-skeleton.md
docs/readme does not exist
```

`npm --prefix .tropis install` had already printed `added 268 packages`.

Task 5. Tool: Claude Code `2.1.300` (`claude --version`). Machine: dev-laptop.local, Darwin 25.2.0, arm64. Each run was a new process, `claude -p --dangerously-skip-permissions`, in the scratch project, with this prompt and no other:

> This is a probe and its output will be discarded. Run /refresh-readme. When it asks me to approve, stop there and tell me which sections you changed and why. Do not commit.

**writes.** Before the session, `git log --oneline -1` was `396ca46 chore: commit the framework setup so the refresh starts from a clean tree` and `git status --porcelain` was empty. After: log still `396ca46`; status ` M README.md`. The README's headings were the default skeleton's eight sections, in order, and the page mentions `--port`. The session listed all eight as missing and gave a reason each, and stopped without committing. **Pass.**

**suggests.** After `git restore README.md` and a commit setting `level: suggests`, the session started at `9ae1d66`. After: log still `9ae1d66`; `git status --porcelain` empty. It reported all eight sections missing, named `--port` as the shipped fact the README omits, and said it edited nothing. **Pass.**

**manual.** A commit set `level: manual` at `9ad42d1`. After: log still `9ad42d1`; status empty. It reported and said it changed no section and committed nothing. **Pass.**

Task 6, on `00ed838` (before this handover commit):

`bash scripts/check-blueprint.sh` last line:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

`npm --prefix .tropis test`:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.735 s
Ran all test suites.
```

`git diff --stat origin/main...HEAD` before this handover commit:

```
 RELEASES.md                           |  15 +++++
 bootstrap.md                          |  15 +++++
 commands/bootstrap.md                 |   7 +++
 commands/refresh-readme.md            | 112 ++++++++++++++++++++++++++++++++++
 docs/readme/readme.yaml               |   3 +
 docs/readme/skeleton.md               |  58 ++++++++++++++++++
 framework/DECISIONS.md                |  21 ++++++-
 framework/workflow.md                 |   4 +-
 guards/framework-integrity.test.js    |   8 ++-
 guards/operator-page-closeout.test.js |  15 +++--
 guards/set-up-project.test.js         |   1 +
 rules/planning.md                     |   6 +-
 scripts/check-blueprint.sh            |   2 +-
 scripts/set-up-project.sh             |   2 +-
 templates/README.md                   |   2 +-
 templates/readme-skeleton.md          |  42 +++++++++++++
 16 files changed, 295 insertions(+), 18 deletions(-)
```

### Scope

Every path in that stat is in the File Structure table. This commit adds the handover to this plan, which is in the table. `.claude/rules/planning.md` and `.cursor/rules/planning.mdc` are listed there and were not edited. Nothing under `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md` was edited.

### Judgment calls

- The fixed text in `docs/readme/skeleton.md` follows the `Fixed text:` line with no extra blank line, so lines 9–21 of `README.md` are copied as they stand, including the blank line between the paragraphs.
- `bootstrap.md` shows Decision 1's settings format in a yaml block. The plan said to write that file by hand in that format, and the long form cannot run the command.
- The probe's catalog replaced the template's example entry with `port-option`. The template says to replace that entry, and leaving it would have given the session a second shipped feature.
- The setup does not commit, so after the four fixture files were committed the tree was still dirty and `/refresh-readme` would have refused. The setup files were committed before the first session. That commit is `396ca46`, the log line the writes run left unchanged.
- The writes session rendered the port as `npm start -- --port 8080` and said the `--` was its own addition. The page still follows the skeleton and mentions `--port`, so the run counts as a pass.

### What the plan got wrong

Task 5 says to commit the brief, the README, the catalog entry and the settings file. That commit does not clean the tree: `set-up-project.sh` never commits, and the command refuses when `git status --porcelain` prints anything. The probe cannot start until the setup is committed too. The plan does not say to.

### Outstanding

None. The three later plans, and this repository's own first refresh, stay out of this one as the plan says. The branch is handed over as a pull request and is not merged from here.

## Review record

Reviewed together with its follow-up, `2026-10-20-refresh-readme-review-fixes.md`, as one
pull request (fcapurso/tropis#112). Reviewer: the specifying session, Claude Code desktop
(Opus 5.5), on the developer's MacBook Pro, Darwin 25.2.0.

### Checks re-run

- `bash scripts/check-blueprint.sh` at `05f0a38`: `Self-check passed: …`; `npm --prefix
  .tropis test`: `Tests: 28 passed, 28 total`.
- `git diff --stat origin/main...origin/plan/refresh-readme-command` at `05f0a38`: 17 files,
  all in *File Structure*.
- Read `commands/refresh-readme.md` whole against Decision 3.

### Found

An independent review (fresh agent, read-only) found eight defects at `05f0a38`, the most
serious that a refreshed README committed on `main` was refused by the commit hook, because
the design had wrongly assumed the README may go straight to main. All eight were sent back
out as the follow-up plan rather than fixed here; see its review record.

### Outstanding disposition

The executor's Outstanding was empty. The three later plans for the entry are its next work.

### Learnings routed

None beyond the follow-up plan: the design's "may go straight to main" claim was checked
against the workflow and the hook only at review, and the follow-up corrected both.

### Merged because

Merged with its follow-up; see that plan's record.
