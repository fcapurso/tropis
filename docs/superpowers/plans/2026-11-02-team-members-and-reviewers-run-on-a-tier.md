# A sprint's team members and the reviewers Tropis starts run on a tier's included pick — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** every agent Tropis starts gets a model, not only an executor. `sprint.mjs start`
and `sprint.mjs add` print the model to start a team member on, and
`node .tropis/scripts/dispatch.mjs --tier <tier>` names the pick for any tier, which the
fresh-agent check's probe and a fresh reviewer use. Both name the same pick `/dispatch`
names for a Large plan: the first Large pick a subscription the developer holds includes.

**Spec:** the entry `team-members-and-reviewers-run-on-a-tier` in `feature-catalog.yaml`
(its four acceptance criteria); decisions FW-053 (every agent Tropis starts is paid for by
a plan the developer already has), FW-055 and FW-056 (the sprint, its team members and
`sprint.mjs`) and FW-057 (picks go least usage first; `/dispatch` names one the
developer's subscriptions include, whose *Consequences* hands this entry the rest) in
`framework/DECISIONS.md`; `docs/superpowers/specs/2026-11-01-sprint-design.md` §2 and §9.
Build only this entry. Starting a team member in another tool's command line, with its
`--model`, is the entry `team-members-start-in-another-tool`; leave it.

**One plan:** what becomes true is one sentence — every agent Tropis starts that runs no
plan, a sprint's team member or a fresh reviewer, is told which model to run on, chosen
as `/dispatch` chooses an executor's. Two scripts, their guards, four documents and one
decision serve that one thing.

**What the specifying session verified on 2026-11-02, against `origin/main` at `f7597ec`:**

- **`scripts/plan-binding.js`** is pure (strings in, values out). It has the private
  `normalizeTier(name)` (lower-cases and turns `-` into `–`), the private
  `const TIER_ORDER = ['Small', 'Small–medium', 'Medium', 'Medium–large', 'Large'];`, and
  the export `pickToUse(picksText, tier, subscriptionsText)`, which returns `null` for a
  tier not in `TIER_ORDER`, and otherwise one line starting `**Use:** `. The four shapes
  it returns, exactly:
  - `**Use:** <model>, in <tool> — the first pick for this tier that your subscriptions include.`
  - `**Use:** <model>, in <tool> — no pick for this tier is included in your subscriptions; this is the first included pick from the <tier> tier.`
  - `**Use:** not chosen — the picks do not say which subscriptions include each model. Run /refresh-model-tiers.`
    and `**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers.`
  - `**Use:** none — no pick for this tier or above is included in your subscriptions, and a model that costs extra is not used (FW-053).`
- **`scripts/dispatch.mjs`** runs its whole body at the top level; it is not importable.
  In order: it computes `root` as two folders above the script; defines
  `commonGitDir()`; handles the writer mode `--subscriptions` and exits; reads the plan
  argument (none → usage on stderr, exit 1); validates the plan; checks rule
  projections; then reads `picksText` from `docs/model-picks.md` under `root` (null when
  absent) and, after `const protocol`/`const lastVerified`, `subscriptionsText` from
  `<commonGitDir()>/tropis/subscriptions.txt` (null when absent); then prints
  `renderThinPrompt(...)` with `use: picksText === null ? null : pickToUse(picksText,
  protocol.tier, subscriptionsText)`. With no picks file the prompt has no `**Use:**`
  line at all. Its usage message (no argument) is two lines:
  `usage: npm --prefix .tropis run dispatch -- <plan-path>` and
  `   or: node .tropis/scripts/dispatch.mjs --subscriptions "<tool>: <subscription>" ...`.
- **`scripts/sprint.mjs`** already imports `mergesAfterIds` from `./plan-binding.js`, and
  `readFileSync`, `existsSync` from `node:fs`, and `dirname`, `resolve` from `node:path`.
  `sprintPath(root, env)` returns `<git common dir>/tropis/sprint.json`, resolved against
  `root` (throws a `Refusal` outside a checkout). `root` is the checkout's top level (the
  worktree, in a worktree). `start(ctx, opts)` returns one line,
  `` `Sprint: started with ${n} entries, ${points} of ${budget} points; team members start as ${way}.` ``,
  with `way` defaulting to `'here'`; `WAYS = ['session', 'here']`. `add(ctx, opts)`
  returns `Sprint: added <id> (<n> pts); <total> of <budget> points.` and, when over the
  budget, a second line starting `Sprint: over the budget by`. The sprint file records
  `way`. The module comment's usage block lists `start` and `add` without saying what
  they print besides.
- **`guards/sprint.test.js`** installs `FILES` (`sprint.mjs`, `next-work.js`,
  `board-bands.js`, `plan-binding.js`, `projections.js`, `main-status.mjs`,
  `merge-token.mjs`) into a clone's `.tropis/scripts/` (`makeWorld`, `makeClone`,
  `install`), runs the script with `run(clone, args, env)` and reads lines with
  `lines(result)`. The case *† writes the sprint under the git common dir, refuses a
  second start, …* asserts, for `start e2 e1 --points 12 --way session`, the exact
  stdout `Sprint: started with 2 entries, 5 of 12 points; team members start as session.\n`
  — a clone with no picks file. That assertion changes in *Decision 5*. The case
  *† defaults to one entry at a time and records the default way* asserts the exact
  stdout of a `here` start; it stays as it is. The `describe('the documents')` case on
  `commands/sprint.md` checks every `sprint.mjs <verb>`, `in that same turn`, `--way` and
  the two ways' table rows; keep them.
- **`guards/dispatch.test.js`**, `describe('dispatch names the pick to use')`, has
  `picksText()` (a Large row `Birch 2 *(all)*; Alder 3 *(all)*`, a Small row
  `Elm 0 *(Cursor)*; Dogwood 1 *(Cursor)*; …`, and an inclusion table where Alder 3 is
  included on `Claude Code: Max (…), Ultra; Cursor: none` and Birch 2 on
  `Claude Code: none; Cursor: Premium`), `withPicks(picks, record)` (a project with that
  picks file and, when `record` is given, `.git/tropis/subscriptions.txt`) and
  `run(cwd, cmd, args)`. `project()` copies every script in `scripts/installed-scripts.txt`
  into `.tropis/scripts/`. Its plan fixture is `**Model tier: small.**`. The case
  *matches a subscription that carries a note* shows that, for the Small tier, the record
  `claude code: max` gives `**Use:** Alder 3, in Claude Code — no pick for this tier is
  included …; this is the first included pick from the Large tier.`
- **The documents.** `commands/sprint.md` step 2 (`## 2. Start the whole team, on the
  developer's word`) has the paragraph ending
  ``Pass each team member the brief `node .tropis/scripts/sprint.mjs brief <id>` prints, as it stands, and run `node .tropis/scripts/sprint.mjs mark <id> planning` for it.``
  (wrapped over lines 34 to 36), then the ways table, then the paragraph starting
  `Never start a team member the developer cannot open`. Step 4 ends
  `Start the new entry's team member in that same turn, as in step 2.`
  `framework/workflow.md`, section `## Doc closeout — required`, holds the fresh-agent
  check paragraphs; the one starting `**Any current install may run the check; record
  which one.**` is followed by the one starting `**Judge the check by what the agent
  did, not by what it says it did.**`. `rules/planning.md`, bullet `**Do not rehearse
  the work to write its plan.**`, contains the sentence
  `Or **build it yourself and send it to a fresh reviewer**: an agent with only the repository reviews it as a reviewing session reviews a plan's work and writes the review record,`
  (wrapped). `framework/model-tiers.md` ends with the section `### What the tiers mean`,
  its table, and the paragraph starting `The practical question:`.
  `templates/README.md` (the operator guide a project gets as `.tropis/README.md`) has
  the paragraph starting `` `/sprint` plans a sprint with you and runs it `` and ending
  `the agreed sprint lives in a file under `.git/`, never committed.`
- **Nothing else in `framework/`, `commands/`, `rules/` or `templates/` tells anyone which
  model a team member, a fresh-agent probe or a fresh reviewer runs on**
  (`git grep -n -i -e "fresh reviewer" -e "fresh agent" -e "--model" -- framework commands rules templates`
  finds the planning bullet, the workflow's *Who does what* exception and fresh-agent
  paragraphs, and `rules/harness-scripts.md`'s note that a hook change reaches only
  later sessions, none naming a model). The repository's own `/rule-trial` command is
  not shipped to projects and is left alone.
- **The decision record** ends with FW-057. `waits-end-when-something-happens` is building
  and adds a decision too, so the number this plan takes is provisional (*Decision 4*).
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about model tiers, picks, team members' models or fresh reviewers, so a local
  fresh-agent probe in a scratch project outside this repository is a real one.
- **Lessons from the plans already written from this spec** (their review records): do
  not demand a passing self-check before the documents a guard checks are written (this
  plan runs the self-check once, at the end); import a module under test as a namespace;
  a red self-check stops at its clean-baseline step and never lists test names, so run
  the changed test file alone for red; Claude Code refuses every file-tool write under
  `.git`, so tests write the subscriptions record with `writeFileSync`, and a probe gets
  it through `node .tropis/scripts/dispatch.mjs --subscriptions …`; the next free `FW-`
  number moves while a plan is in flight.

**Model tier: Medium.** Two scripts get a small mode and a printed line each, with cases
in two existing guards built on their fixtures; the prose is given verbatim. The probe
needs judging, not invention.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 6; do not open a pull request, write a review record
or merge.

**Requires:** an agent command-line tool that starts a fresh local session from a prompt, signed in to the developer's existing plan, for the fresh-agent check in Task 5 (record which, and its version).

**Merges after:** waits-end-when-something-happens, team-members-start-in-another-tool

Do not store a kick-off prompt on this plan.

---

## Delivers

team-members-and-reviewers-run-on-a-tier

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-tier -b plan/team-members-and-reviewers-run-on-a-tier origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.**
- **Do not lower, skip or delete a guard or a test.** Changing an existing case's expected
  output is allowed only where *Decision 5* says so.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names, and
  no subscription anyone actually holds, in anything committed or in the handover. Test
  and probe subscriptions are the invented ones this plan gives. Paths in the handover are
  relative to the worktree, or written as `$TMPDIR/...`.
- **Nothing billed beyond the developer's existing plan (FW-053).** The fresh-agent probe
  uses the agent command line already signed in on this machine, with `ANTHROPIC_API_KEY`
  unset; never a cloud session or an API key.
- **Never touch the merge token or open a pull request on GitHub.** No task needs GitHub.
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source you worked from, even when the answer is "nothing in particular".

## Decisions

1. **Team members and fresh reviewers run on the Large tier.** A team member shapes an
   entry, writes a self-contained plan and reviews an executor's branch; a fresh-agent
   probe and a fresh reviewer judge, with only the repository, whether work says and does
   what it should. Each is open-ended judgement with no mechanical check, which is what
   `framework/model-tiers.md` defines Large as. The tier's picks are listed least usage
   first, so its first included pick is already the least usage that holds the quality
   (FW-057). The tier is written once per script, as `const TEAM_TIER = 'Large';` in
   `sprint.mjs`, and as the `--tier Large` the documents tell a session to run, so it is
   nameable and swappable without a configuration system.
2. **`dispatch.mjs --tier <tier>`** prints the line `/dispatch` would print as `**Use:**`
   for a plan of that tier, from the same picks file and subscriptions record, and exits
   0. Move the two reads (`picksText` and `subscriptionsText`, with their comments) up to
   just after the `--subscriptions` writer block, unchanged, and add the new mode right
   after them, before the plan argument is read. Exactly:
   - `--tier` followed by a tier name, matched as `pickToUse` matches it (case and `-`/`–`
     do not matter): print `pickToUse(picksText, tier, subscriptionsText)` and a newline
     when a picks file exists, else print
     `**Use:** not chosen — this project has no model picks. Run /refresh-model-tiers.`
     and a newline. Exit 0.
   - `--tier` with no name, or a name that is not a tier: print nothing on stdout, print
     on stderr
     `usage: node .tropis/scripts/dispatch.mjs --tier <tier>, where <tier> is one of Small, Small–medium, Medium, Medium–large, Large`
     and a newline, exit 1.
   - Add a third line to the no-argument usage message:
     `   or: node .tropis/scripts/dispatch.mjs --tier <tier>`.
   - In `plan-binding.js`, export the no-picks line as
     `export const NO_PICKS_USE = '**Use:** not chosen — this project has no model picks. Run /refresh-model-tiers.';`
     and add `export function isTier(name)`, true when `normalizeTier(name)` equals that
     of a `TIER_ORDER` entry. Both scripts use these; nothing else in `plan-binding.js`
     changes, and `renderThinPrompt` keeps printing no `**Use:**` line when there is no
     picks file.
3. **`sprint.mjs` names the team member's model** at the two moments a sprint session
   starts team members. `start`, when the sprint's way is `session`, returns a second
   line after its existing one; `add`, when the sprint's way is `session`, returns the
   same line after all its existing lines. A `here` sprint prints no such line, since
   nobody is started. The line is
   `` `Sprint: team members run on the Large tier. ${use}` ``, where `use` is
   `pickToUse(picks, TEAM_TIER, subscriptions)` when `docs/model-picks.md` exists under
   `root`, else `NO_PICKS_USE`; `subscriptions` is the text of `subscriptions.txt` in the
   same folder as the sprint file (`dirname(sprintPath(root, env))`), or `null` when
   absent. When `use` starts `**Use:** not chosen` or `**Use:** none`, the line ends with
   ` Start them on the tool's default model.` Put the reading in one function
   (`teamModelLine(root, env)` or similar) with a one-line comment; update the module
   comment's usage block to say `start` and `add` name the team member's model for a
   `session` sprint.
4. **One decision, numbered at merge.** Add it to `framework/DECISIONS.md` after the last
   one, with the next free number on your base (`FW-058` on `f7597ec`); the reviewer
   renumbers it if another plan took that number first. Verbatim apart from the number:

   ```markdown
   ## FW-058: Team members and fresh reviewers run on the Large tier's included pick

   **Date:** 2026-11-02 · **Status:** Accepted.

   **Decision:** An agent Tropis starts that runs no plan is given a model as an executor
   is, from a tier. A sprint's team member, the probe of a fresh-agent check and a fresh
   reviewer of work its author built each run on the Large tier, and on the first Large
   pick that a subscription the developer holds includes — the pick `/dispatch` names for
   a Large plan. `sprint.mjs start` and `add` print it for a sprint whose team members
   start as sessions; `node .tropis/scripts/dispatch.mjs --tier <tier>` prints it for any
   tier, and the workflow and the planning rule tell whoever starts a probe or a reviewer
   to run `--tier Large`. Where no pick is named, the agent starts on the tool's default
   model, and the line says why.

   **Evidence:** `framework/model-tiers.md` defines Large as open-ended judgement with no
   mechanical check, and each of these agents does exactly that: a team member shapes,
   plans and reviews; a probe or a reviewer judges work with only the repository. FW-057
   lists a tier's picks least usage per task first, so the first included Large pick is
   the least usage that keeps the tier's quality. Source: none in particular; the sprint
   design §2 and §9 and FW-057.

   **Rejected:** A tier per agent kind, such as Medium for a probe (a probe that fails for
   want of capability reads as a defect in the rule it was testing). A setting naming
   each agent kind's tier (nothing needs a different tier yet; the tier is written once
   in each script and document, and that is the seam). Leaving the model to whatever the
   session started with (that is what this replaces: the developer's default model,
   whatever it costs).

   **Consequences:** A team member started in another tool's command line takes the same
   pick as its `--model`, which the entry `team-members-start-in-another-tool` builds. An
   executor's own review subagents are its business and are not covered. The repository's
   own `/rule-trial` is not shipped and is left as it is.
   ```

5. **The guards.** In `guards/sprint.test.js`, the one existing assertion that changes is
   the exact stdout of `start e2 e1 --points 12 --way session` in the case *† writes the
   sprint under the git common dir, …*: it becomes
   `Sprint: started with 2 entries, 5 of 12 points; team members start as session.\nSprint: team members run on the Large tier. **Use:** not chosen — this project has no model picks. Run /refresh-model-tiers. Start them on the tool's default model.\n`.
   Add `describe('the team member\'s model')` with cases a to e below; in
   `guards/dispatch.test.js`, inside `describe('dispatch names the pick to use')`, add
   cases f to h. Write the picks file and the record with `writeFileSync` (the clone's
   common dir is `<clone>/.git`). For the sprint cases use a picks text built like
   `dispatch.test.js`'s `picksText()` (a Large row `Birch 2 *(all)*; Alder 3 *(all)*`, the
   same inclusion table), copied into the sprint test with today's date, since the two
   files share no helper.
   - a. `start … --way session` with that picks file and the record `Claude Code: Max\n`:
     the second line is exactly
     `Sprint: team members run on the Large tier. **Use:** Alder 3, in Claude Code — the first pick for this tier that your subscriptions include.`,
     and its part after `tier. ` equals `binding.pickToUse(picks, 'Large', record)` from
     `import * as binding from '../scripts/plan-binding.js'` — the pick `/dispatch` names
     for a Large plan.
   - b. Under that sprint, `add <id>` (within the budget) returns exactly two lines: the
     `Sprint: added …` line, then the line of case a.
   - c. With no picks file: the line ends `**Use:** not chosen — this project has no model
     picks. Run /refresh-model-tiers. Start them on the tool's default model.`
   - d. With the picks file and no record; with a picks file that has no inclusion table;
     and with the record `Claude Code: Pro\nCursor: none\n`: each line ends
     ` Start them on the tool's default model.`, contains the matching `pickToUse` text,
     and contains neither `Alder 3` nor `Birch 2`.
   - e. With the picks file and the record of case a, `start` with no `--way` prints
     exactly one line, and `add` under that sprint prints no line containing `Large tier`.
   - f. `--tier Large` with `PICKS` and the record `claude code: max\n`: exit 0, stdout
     exactly `**Use:** Alder 3, in Claude Code — the first pick for this tier that your subscriptions include.\n`;
     and `--tier small` with the record `Cursor: Premium\n` prints exactly the `**Use:**`
     line that `dispatch(p)` prints for the fixture's small plan, plus a newline.
   - g. `--tier Large` in a project with no picks file: exit 0, stdout exactly
     `**Use:** not chosen — this project has no model picks. Run /refresh-model-tiers.\n`.
   - h. `--tier Huge` and `--tier` alone: exit 1, empty stdout, stderr containing
     `Small, Small–medium, Medium, Medium–large, Large`.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | `NO_PICKS_USE`, `isTier` (*Decision 2*) |
| `scripts/dispatch.mjs` | the `--tier` mode, the reads moved up, the usage line (*Decision 2*) |
| `scripts/sprint.mjs` | the team member's model line in `start` and `add`, the module comment (*Decision 3*) |
| `guards/sprint.test.js` | *Decision 5*, cases a to e and the one changed assertion |
| `guards/dispatch.test.js` | *Decision 5*, cases f to h |
| `commands/sprint.md` | Task 4 |
| `framework/workflow.md` | Task 4 |
| `framework/model-tiers.md` | Task 4 |
| `rules/planning.md` | Task 4 |
| `templates/README.md` | Task 4 |
| `framework/DECISIONS.md` | *Decision 4* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules`, a comment mapping criteria to tests (Task 6) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 6) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-team-members-and-reviewers-run-on-a-tier.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

## Traps

- **`dispatch.mjs` is not importable.** Its body runs at the top level and exits; test it
  only by running it, as the existing cases do. Do not restructure it beyond moving the
  two reads.
- **The changed sprint assertion is the only expected output that changes.** The `here`
  start's exact stdout stays one line. If any other existing case goes red, the code is
  wrong, not the case.
- **A self-check exports `HEAD`.** `bash scripts/check-blueprint.sh` sees committed
  content only: commit before running it. It is run once, in Task 6, after every
  document exists.
- **`framework-integrity` fails on a backticked path under `docs/`, `scripts/` or
  `.claude/` that does not exist.** The verbatim texts below name only paths that exist
  (`.claude/framework/model-tiers.md` exists in every project); `.tropis/scripts/…` is
  outside that guard. Do not add other backticked paths.
- **Running one guard alone.** `npm --prefix .tropis test` runs the installed release's
  checks, not this source, and the self-check never lists test names when it is red. Run
  a changed guard the way `scripts/check-blueprint.sh` stages `HEAD`: copy the committed
  tree into a scratch folder (`git archive HEAD | tar -x -C "$TMPDIR/stage"`), write
  `{"type":"module"}` to its `package.json`, copy `templates/framework-jest.config.js` to
  its `jest.config.js`, link its `node_modules` to the worktree's `.self-check/node_modules`
  (the self-check installs jest and yaml there the first time it runs; run it once if the
  folder is absent, whatever it reports), and run
  `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/<file>`
  there. It sees committed content only, so commit first, and make each Task 3 mutation a
  throwaway commit dropped afterwards (`git reset --hard HEAD~1`, on your own branch only).
- **The probe's subscriptions are invented** and must not be the developer's: Task 5
  records `Claude Code: Max` in a scratch project only.

## Tasks

### Task 1 — `plan-binding.js` and `dispatch.mjs --tier`

Make *Decision 2* true. Then add cases f, g and h to `guards/dispatch.test.js`. Commit,
and run the file alone as *Traps* says (*Running one guard alone*); every case passes.

### Task 2 — the sprint's line

Make *Decision 3* true. Change the one assertion and add cases a to e
(*Decision 5*). Commit, and run `guards/sprint.test.js` alone the same way; every case
passes.

### Task 3 — the guards go red when the work is undone

Each as a throwaway commit, run the changed test file alone (*Traps*), see the named
cases fail, then drop the commit:

1. In `sprint.mjs`, return the line for every way, not only `session`: case e fails.
2. In `sprint.mjs`, pass `'Medium'` instead of `TEAM_TIER`: case a fails.
3. In `dispatch.mjs`, print `pickToUse` for `--tier` without checking `isTier`: case h
   fails.

Paste each run's failing case names into the handover. If a mutation leaves every case
green, the guard is incomplete: fix the guard and run it again.

### Task 4 — the documents

Exactly these edits, wrapped to 89 columns like the files around them:

1. `commands/sprint.md`, step 2: after the sentence ending
   ``and run `node .tropis/scripts/sprint.mjs mark <id> planning` for it.`` add:

   > Start each team member on the model the last line of `start` names: the first pick
   > of the Large tier that a subscription the developer holds includes, since a team
   > member shapes, plans and reviews. Where that line names none, start it on the tool's
   > default model.

   And in step 4, after `Start the new entry's team member in that same turn, as in step
   2.` add: ``Start it on the model the last line of `add` names.``
2. `framework/workflow.md`, *Doc closeout*: a new paragraph between the one starting
   `**Any current install may run the check; record which one.**` and the one starting
   `**Judge the check by what the agent did`:

   > **Run the probe on the Large tier's included pick.** A probe judges, with only the
   > repository, whether a change reaches the agent it was written for, which is the
   > Large tier's kind of work (`.claude/framework/model-tiers.md`).
   > `node .tropis/scripts/dispatch.mjs --tier Large` names the model: the first Large
   > pick that a subscription the developer holds includes, as `/dispatch` would choose
   > for a Large plan. Pass it as the probe's model, such as `claude -p --model <model>`;
   > where it names none, run the probe on the tool's default model and say why in the
   > record. Record the model with the tool and its version.
3. `rules/planning.md`, in the bullet `**Do not rehearse the work to write its plan.**`:
   replace `an agent with only the repository reviews it as a reviewing session reviews a
   plan's work` with `an agent with only the repository, run on the model
   `node .tropis/scripts/dispatch.mjs --tier Large` names, reviews it as a reviewing
   session reviews a plan's work`. Nothing else in the bullet changes.
4. `framework/model-tiers.md`: append a section at the end of the file:

   ```markdown
   ### Agents that run no plan

   `/dispatch` chooses an executor's model from its plan's tier. Two kinds of agent
   Tropis starts run no plan, and run on the **Large** tier, because each does open-ended
   judgement with no mechanical check:

   | Agent | Its work | Where its model is named |
   |---|---|---|
   | A sprint's team member | shapes an entry, writes its plan, reviews the executor's branch | the last line of `sprint.mjs start` and `sprint.mjs add` |
   | A fresh reviewer: a fresh-agent check's probe, or the reviewer of work its author built | judges, with only the repository, whether the work says and does what it should | `node .tropis/scripts/dispatch.mjs --tier Large` |

   Each runs on the first Large pick that a subscription the developer holds includes,
   the pick `/dispatch` names for a Large plan; where none is named, on the tool's
   default model (FW-053).
   ```
5. `templates/README.md`, in the `/sprint` paragraph: after the sentence ending
   `merges its own work under the merge token.` add
   `Each team member starts on the model the sprint names: the Large tier's first pick that your subscriptions include.`

Then `git grep -n -e "--tier Large" -- commands framework rules templates` must list
`framework/workflow.md`, `rules/planning.md` and `framework/model-tiers.md`, and
`git grep -n "Large tier" -- commands/sprint.md templates/README.md` both files. Commit,
with a body naming the fresh-agent check to come (the commit after Task 5 records it).

### Task 5 — Fresh-agent check

The workflow and the planning rule now tell a session which model to start a probe or a
fresh reviewer on, and `/sprint` tells a sprint session which model to start team members
on. A fresh agent with only a project set up from this branch must be seen to follow
them. Run it with its tool calls visible (in Claude Code, `claude -p --output-format
stream-json --verbose`, allowed to run shell commands and edit files, with
`ANTHROPIC_API_KEY` unset), with the scratch project as its working directory, on this
machine only.

1. Set up: `mkdir -p "$TMPDIR/tier-agent/kiln-yard" && git -C "$TMPDIR/tier-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/tier-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/tier-agent/kiln-yard/.tropis" ci`. Give the project a local
   git identity, and write `docs/model-picks.md` as the Large and Small rows and the
   inclusion table of `dispatch.test.js`'s `picksText()`, with today's date. From the
   project, run `node .tropis/scripts/dispatch.mjs --subscriptions "Claude Code: Max" "Cursor: none"`.
   Commit.
2. Prompt A, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, you have just edited
   `.claude/framework/workflow.md` and must run the fresh-agent check the workflow asks
   for. Do not run it: tell me the exact command line you would start the probe with,
   including its model, and how you chose the model."* Pass: the agent ran
   `node .tropis/scripts/dispatch.mjs --tier Large`, and its command line names
   `Alder 3` (the invented model its answer named) as the model.
3. Prompt B, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, the developer has agreed a sprint
   and said to start it with team members as sessions. Do not start anything: say which
   model each team member must be started on, and where that comes from."* Pass: the
   agent read `/sprint`'s instructions (the project's `.claude/commands/sprint.md`) and
   answered `Alder 3`, naming the line `sprint.mjs start` prints, or ran `sprint.mjs
   start` in the scratch project and read it there.

Quote, for each prompt, the calls that show the pass and the agent's answer, with the
tool, its version, the model the probe ran on, and the operating system and architecture
(`uname -sm`, `sw_vers -productVersion` or the system's equivalent). If a prompt fails,
say what the agent did instead, change the document text only if it was unclear (and say
so as a judgement call), and run that prompt once more. Two failures of one prompt: stop
and hand back. Delete `$TMPDIR/tier-agent` afterwards.

### Task 6 — Close out and hand over

1. In `feature-catalog.yaml`, set the entry's `status: shipped`, its `modules` to
   `scripts/sprint.mjs`, `scripts/dispatch.mjs` and `scripts/plan-binding.js`, and add a
   comment directly above the entry mapping each criterion to what covers it: criterion 1
   → sprint cases a and b; 2 → c, d and e; 3 → dispatch cases f, g and h; 4 → the Task 5
   probe (in the handover report) and the Task 4 greps. Remove the entry's row from
   `docs/backlog-board/bands.yaml`.
2. Commit, then run `bash scripts/check-blueprint.sh`; it must end `Self-check passed`.
   Run `npm --prefix .tropis test`; it must report every test passed. If either is red,
   fix the work and run both again; a red you cannot explain is handed back.
3. Append `## Handover report` to this plan file with the six sections
   `rules/planning.md` names (*Task completion*, *Verification results*, *Scope*,
   *Judgment calls*, *What the plan got wrong*, *Outstanding*); under *Verification
   results*, every check's command and its actual output, with the tool and version and
   the operating system and architecture that ran it; under *Scope*, the output of
   `git diff --stat origin/main...HEAD` and the worktree path used. Commit with a body
   that records the fresh-agent check: what each prompt asked, whether the agent found
   what the change intended, and the tool, its version, the model, the operating system
   and architecture.
4. Push the branch. Do not open a pull request.
