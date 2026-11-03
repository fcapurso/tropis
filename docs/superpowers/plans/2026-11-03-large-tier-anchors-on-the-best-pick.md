# Large admits only models level with the best selectable pick — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `/refresh-model-tiers` admits a model to Large only when it is within 1 point of
the best selectable pick on every board scored from 0 to 100 that scores it, the decision
record says so, and this repository's picks are re-placed under that rule, leaving Claude
Opus 5.5 alone in Large.

**Backlog item:** `large-tier-anchors-on-the-best-pick` in `feature-catalog.yaml` (type
feature). Spec: `docs/superpowers/specs/2026-11-03-large-tier-evidence-finding.md`, the
finding of the spike `large-tier-admits-on-judgment-evidence`, section *Recommendation,
put to the developer*.

**One plan:** what becomes true is one sentence — Large holds only models the boards
place level with the best pick, by a margin stated once.

**Why.** FW-057 lists a tier's models least usage first and `/dispatch` names the first
one a subscription includes, so the cheapest model in Large runs every Large plan, every
sprint team member and every fresh reviewer. The command says a model "sits in the
highest tier its evidence supports" with no threshold, and it has been applied as *level
with a model already in the tier*, a bar that falls with each admission: Gemini 4 Argon
moved up on 2026-11-02 for being level with Claude Fable 5.1, which is below Opus 5.5 and
Sonnet 5.5 on every board. The spike found no evidence that measures the judgment Large
is defined by, so the bar is policy: anchor Large on the best pick. The developer agreed
on 2026-11-03 with a margin of 1 point; the criterion they stated is on the backlog item.

**Decided by the specifying session while shaping** (the developer left these to shaping):

- **Which boards the 1-point margin applies to:** every board scored from 0 to 100, in
  percentages or index points. That includes Artificial Analysis's Intelligence Index,
  which is index points rather than a percentage; the finding applied the margin to it.
- **A board on another scale** (LMArena's Elo): it bars a model from Large only when it
  states an uncertainty for both scores and the ranges do not overlap. One that states
  none, as the picks record LMArena WebDev today, orders models and does not decide Large.
- **Effort:** each model is read at its best score on the board, with the setting
  recorded, and a figure below the model's highest supported effort is marked as possibly
  understating it. The developer asked why Fable 5.1 sits below Opus 5.5, since AA v5.0
  scores Fable at xhigh and Opus at max: Anthropic's effort page says Fable 5.1 supports
  all five effort levels, max included, so that AA comparison is not like with like. On
  the two boards that score both at max (CursorBench 4.0, Terminal-Bench 4.0) Fable is
  still 6.0 and 6.97 points below, so the placement does not rest on the AA mismatch.
- **No model on any 0-to-100 board** stays out of Large, marked unconfirmed. **Boards
  that disagree on the best** put every model highest on some board in Large, marked
  contested.
- **The picks file is re-placed now**, from the figures recorded on 2026-11-02, without
  reading any board again: this session's network reaches none of
  `artificialanalysis.ai`, `cursor.com` or `tbench.ai` (checked 2026-11-03, the proxy
  refuses each). `Last verified` stays 2026-11-02 and a line says what was re-applied.

**What the specifying session verified on 2026-11-03, against `origin/main` (node v22,
Linux x86_64):**

- `commands/refresh-model-tiers.md` is identical to the installed
  `.claude/commands/refresh-model-tiers.md`. Its section `## What the picks are for`
  opens with the paragraph beginning `**A model's tier rests on fitness for the tier's
  work, and on nothing else.**`, followed by the paragraph beginning `**Inside a tier,
  the models go least usage first.**`.
- `docs/model-picks.md` lists Large as `Claude Sonnet 5.5 *(all)*; Claude Opus 5.5
  *(all)*; Gemini 4 Argon *(Cursor)*; Claude Fable 5.1 *(all)*` and Medium–large as
  `Muse Wonder *(Cursor)*; or any pick from a higher tier`, and the figures quoted in
  *The picks* below are the ones it records.
- `/dispatch` reads the tier row's second cell (`picksForTier` in
  `scripts/plan-binding.js`) and the usage table by model name (`inclusionTable`); row
  order in the usage table is for people only.
- The last decision in `framework/DECISIONS.md` is FW-066, and FW-027's status line reads
  `**Date:** 2026-10-21 · **Status:** Accepted; its exclusion of cost now covers
  placement only (FW-057).`
- `guards/dispatch.test.js` has the case `reads the picks table /refresh-model-tiers
  tells a project to start from`, which reads `commands/refresh-model-tiers.md` through
  `join(blueprint, …)`.
- `framework/model-tiers.md` defines the tiers and names no model; it does not change.

**Model tier: Small–medium.** Every text is given verbatim.

**Merge authority: parent review.** The specifying session reviews, runs the fresh-agent
check on the command (it wrote the clause), opens the pull request and merges. Stop after
Task 5; do not open a pull request, write a review record or merge.

---

## Delivers

large-tier-anchors-on-the-best-pick

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-large-anchor -b plan/large-tier-anchors-on-the-best-pick origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the text as given.** Where a block below is marked verbatim, copy it exactly;
  say in the handover which named source, if any, you worked from beyond this plan.

## The command

In `commands/refresh-model-tiers.md`, section `## What the picks are for`:

1. In the first paragraph, replace `Each model
sits in the highest tier its evidence supports, and fits every tier below it.` (the
   line break falls after `Each model`) with `Each model sits in the highest tier its
   evidence supports, Large as the next paragraph says, and fits every tier below it.`,
   rewrapping the paragraph at 88 columns.
2. Insert this paragraph and list, verbatim, between that paragraph and the one starting
   `**Inside a tier, the models go least usage first.**`, with one blank line on each
   side:

```markdown
**Large takes only models level with the best selectable pick.** In Large no check
catches a weaker model's mistake, so the tier holds the best the boards agree on. A model
is never admitted for being level with another model already in Large: that bar falls
with each admission. Place Large this way:

1. **On each board scored from 0 to 100**, in percentages or index points, such as
   Artificial Analysis's Intelligence Index or CursorBench, find the highest score any
   selectable model has. A model is in Large only when, on every such board that scores
   it, it is within **1 point** of that highest score.
2. **Read each model at its best score on the board**, and record the effort setting
   beside it. Where the board did not score a model at the highest effort the model
   supports, say so beside the figure: the comparison may understate the model, and a
   pass that finds the higher setting compares again.
3. **A board on another scale**, such as LMArena's Elo, keeps a model out of Large only
   when it states an uncertainty for both scores and the two ranges do not overlap. A
   board on another scale that states none orders models and does not decide Large.
4. **A model that no board scored from 0 to 100 scores** stays out of Large, marked
   unconfirmed.
5. **Where no model meets step 1** because the boards disagree on which is best, Large
   holds each model that has the highest score on at least one board, and the picks say
   the tier is contested.

A model this keeps out of Large goes in the highest tier below it that its evidence
supports. The 1-point margin is the developer's choice, recorded in FW-067: change it
there and here together, never within a pass.
```

## The decision record

In `framework/DECISIONS.md`:

1. Replace FW-027's status line with, verbatim:
   `**Date:** 2026-10-21 · **Status:** Accepted; its exclusion of cost now covers placement only (FW-057), and Large is placed by FW-067.`
2. Append after FW-066, at the end of the file, with one blank line before it, verbatim:

```markdown
## FW-067: Large admits only models level with the best selectable pick

**Date:** 2026-11-03 · **Status:** Accepted; built by the backlog item
`large-tier-anchors-on-the-best-pick`. Amends FW-027's placement rule for Large.

**Decision:** `/refresh-model-tiers` places a model in Large only when, on every board
scored from 0 to 100 that scores it, it is within 1 point of the highest score any
selectable model has there. Each model is read at its best score on the board, with the
effort setting recorded, and a figure taken below the model's highest supported effort is
marked. A board on another scale keeps a model out only where it states an uncertainty
and the two ranges do not overlap. A model no 0-to-100 board scores stays out of Large;
where the boards disagree on the best, Large holds each model highest on some board,
marked contested. Every other tier is placed as FW-027 says, and usage still orders
models inside a tier (FW-057).

**Evidence:** The spike `large-tier-admits-on-judgment-evidence` (its finding of
2026-11-03) found nothing that tells a Large model from a Medium–large one on the work
Large is defined by. Every board the picks use grades its tasks mechanically; the boards
nearer to judgment were unreachable from the session or second-hand; and a pilot review
with four seeded judgment defects, run eight times, was found in full by Claude Haiku
5.5, Sonnet 5.5 and Opus 5.5 alike. The rule then in use admitted a model level with one
already in Large: Gemini 4 Argon joined on 2026-11-02 for being level with Claude Fable
5.1, which is below Opus 5.5 and Sonnet 5.5 on every board. The developer chose the
1-point margin on 2026-11-03. Source: none in particular; the finding above.

**Rejected:** Keeping usage order across a tier whose members are not all fit for it
(FW-057 puts the cheapest first, so the least fit would run every Large plan). Admitting
on GDPval-AA (unconfirmed from its own page, and second-hand it puts a Medium–large model
between Opus and Sonnet). A project-owned judgment battery (the cheap version did not
separate even Large from Small–medium, and one that might costs dozens of runs per model
at every roster change). A fixed list of flagship models (a vendor's positioning, not
evidence). A margin judged per pass (the bar would move with whoever ran the pass).

**Consequences:** Applied to the 2026-11-02 figures, Large is Claude Opus 5.5 alone, and
Sonnet 5.5, Gemini 4 Argon and Fable 5.1 move to Medium–large. Every Large plan, sprint
team member and fresh reviewer then draws on Opus 5.5, about three times Sonnet 5.5's
usage per task on CursorBench 4.0 at High; a developer short of allowance lowers a plan's
tier by reshaping it so a check exists, not by a cheaper model standing in. Every
subscription that includes a Large pick today includes Opus 5.5.
```

## The picks

In `docs/model-picks.md`, change only what follows; leave every other line as it is.

1. Directly after the line `**Last verified: 2026-11-02.**` and its following blank line,
   insert this paragraph, verbatim, followed by a blank line:

```markdown
Placement was re-applied on 2026-11-03 to the figures below, under FW-067's bar for
Large: within 1 point of the best selectable pick on every board scored from 0 to 100.
No figure was read again.
```

2. Replace the Large and Medium–large rows of the tier table with, verbatim:

```markdown
| **Large** | Claude Opus 5.5 *(all)* |
| **Medium–large** | Claude Sonnet 5.5 *(all)*; Muse Wonder *(Cursor)*; Gemini 4 Argon *(Cursor)*; Claude Fable 5.1 *(all)*; or any pick from a higher tier |
```

3. In the usage table, move the `| Claude Opus 5.5 |` row above the `| Claude Sonnet
   5.5 |` row, and the `| Muse Wonder |` row directly below the `| Claude Sonnet 5.5 |`
   row, so the first five rows run Opus 5.5, Sonnet 5.5, Muse Wonder, Gemini 4 Argon,
   Fable 5.1. Change no cell.
4. Under `## Why each pick sits where it does`, replace the five bullets for Claude Opus
   5.5, Claude Sonnet 5.5, Gemini 4 Argon, Claude Fable 5.1 and Muse Wonder (each starts
   `- **<name>**:` and runs to the next bullet) with these, verbatim, in this order:

```markdown
- **Claude Opus 5.5**: AA v5.0 58 (max), the highest selectable; CursorBench 4.0 57.8%
  (Max), first; TB 4.0 64.85% (max, Claude Code); Arena WebDev 1810, first. **Alone in
  Large**: it sets the best score on every board (FW-067). Launched 2026-09-22.
- **Claude Sonnet 5.5**: AA v5.0 54 (max); CursorBench 4.0 55.5% (Max); TB 4.0 61.82%
  (max); Arena WebDev 1770. Second to Opus 5.5 on every board. **Moved down from
  Large**: 4 points below Opus 5.5 on AA v5.0, 2.3 on CursorBench 4.0 and 3.03 on TB 4.0,
  each more than FW-067's 1-point margin. Launched 2026-09-28.
- **Muse Wonder**: AA v5.0 43 (max), well below the other Medium–large picks' 50 and
  above; CursorBench 4.0 50.4% (Max); Arena WebDev 1652. No TB 4.0 entry. Released
  2026-10-12.
- **Gemini 4 Argon**: AA v5.0 50 (high); CursorBench 4.0 52.9% (High); Arena WebDev 1679.
  No TB 4.0 entry. **Moved down from Large**: 8 points below Opus 5.5 on AA v5.0 and 4.9
  on CursorBench 4.0. Level with Fable 5.1 on both boards that score them together (AA
  50 against 50 at xhigh, CursorBench 52.9% against 51.8% at Max), and below it on Arena
  WebDev (1746). Released 2026-09-30.
- **Claude Fable 5.1**: AA v5.0 50 (xhigh); CursorBench 4.0 51.8% (Max); TB 4.0 57.88%
  (max), third among selectable models; Arena WebDev 1746. **Moved down from Large**:
  below Opus 5.5 and Sonnet 5.5 on every board. AA scores it at xhigh, below the max
  effort Fable 5.1 supports, while Opus 5.5 is scored at max, so AA may understate it;
  CursorBench 4.0 and TB 4.0 score both at max, and there it is 6.0 and 6.97 points below
  Opus 5.5. The most expensive pick per task. Launched 2026-09-01.
```

5. Under `### Sources used this pass`, add as the last line, verbatim:
   `- https://platform.claude.com/docs/en/build-with-claude/effort`

## The test

In `guards/dispatch.test.js`, directly after the case `reads the picks table
/refresh-model-tiers tells a project to start from`, add, verbatim:

```js
  it('tells /refresh-model-tiers to admit to Large only models within 1 point of the best pick', () => {
    const command = readFileSync(join(blueprint, 'commands/refresh-model-tiers.md'), 'utf8')
      .replace(/\s+/g, ' ');
    expect(command).toContain('**Large takes only models level with the best selectable pick.**');
    expect(command).toContain('it is within **1 point** of that highest score.');
    expect(command).toContain('**Read each model at its best score on the board**');
    expect(command).toContain('that states none orders models and does not decide Large.');
    expect(command).toContain('Large holds each model that has the highest score on at least one board');
    expect(command).toContain('recorded in FW-067');
  });
```

It must fail before *The command* is applied and pass after.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run `guards/dispatch.test.js` that way; say the exact command in the
  handover.
- **`framework-integrity` checks backticked paths** under `docs/`, `scripts/` or
  `.claude/` in framework documents. The texts above name no such path; if the guard
  fails on something this plan added, stop and hand back with its output.
- **Writing `framework/DECISIONS.md` or `commands/` prints a hook's reminder** about
  capturing learnings and the fresh-agent check. The specifying session runs that check
  in review; note the reminder in the handover and carry on.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `commands/refresh-model-tiers.md` | the Large bar (*The command*) |
| `framework/DECISIONS.md` | FW-067, and FW-027's status line |
| `docs/model-picks.md` | re-placed under the bar (*The picks*) |
| `guards/dispatch.test.js` | one case (*The test*) |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to their cover (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-large-tier-anchors-on-the-best-pick.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the decision record is in the plan;
`framework/model-tiers.md` keeps its definitions; the operator guide and the README name
no pick. No upstream queue: this repository is the upstream. A release-note line is the
developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The test, red

Add the case. Commit. Run `guards/dispatch.test.js` alone (*Traps*). Expected: the new
case fails on its first `toContain`. Paste the failing name.

### Task 2 — The command and the decision

Apply *The command* and *The decision record*. Commit. Run the guard alone: every case
passes. Paste the `Tests:` line.

### Task 3 — The picks

Apply *The picks*. Then check, and paste each output:

- `grep -c 'Claude Opus 5.5 \*(all)\*' docs/model-picks.md` prints `1`, and
  `grep -n '^| \*\*Large\*\*' docs/model-picks.md` prints exactly the row given in step 2.
  Before the change the Large row also names Sonnet 5.5, Argon and Fable 5.1.
- `node -e "import('./scripts/plan-binding.js').then(b=>{const t=require('fs').readFileSync('docs/model-picks.md','utf8');console.log(b.picksForTier(t,'Large'));console.log(b.inclusionTable(t).size)})"`
  prints `Claude Opus 5.5 *(all)*` and `13`. If `plan-binding.js` exports differently,
  read its exports and adapt the one-liner; say how in the handover.

Commit.

### Task 4 — The backlog and the board

1. In `feature-catalog.yaml`, on `large-tier-anchors-on-the-best-pick`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them; set `modules` to
   `commands/refresh-model-tiers.md` and `docs/model-picks.md`. Above the item, add
   `# Shipped by docs/superpowers/plans/2026-11-03-large-tier-anchors-on-the-best-pick.md.`
   and one comment line per criterion: criteria 1 and 2 are backed by the case
   `tells /refresh-model-tiers to admit to Large only models within 1 point of the best
   pick` and by the fresh-agent check recorded in this plan's Review record; criterion 3
   by Task 3's checks and the same check; criterion 4 by FW-067.
2. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/large-tier-anchors-on-the-best-pick`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

Executed on 2026-11-03 by an executing agent in `../tropis-large-anchor` on branch
`plan/large-tier-anchors-on-the-best-pick`, from `origin/main` at `1bedcec`. No pull
request is open and nothing is merged, as Task 5 asks.

### Task completion

- **Task 0, setup:** done. `npm --prefix .tropis ci` ran (it reported npm audit findings
  in the installed release's dependencies, which the plan does not cover and nothing here
  changed). `git status --porcelain` printed nothing. The self-check passed (see
  *Verification results*).
- **Task 1, the test, red:** done, commit `4c8f3ce`. The new case fails on its first
  `toContain`, as expected.
- **Task 2, the command and the decision:** done, commit `c9a02a9`. Every case in the
  guard passes.
- **Task 3, the picks:** done, commit `5360e3a`. Both checks pass.
- **Task 4, the backlog and the board:** done, commit `cb3f880`. The item's status was
  `building`, and it was set to `shipped` as the plan says. `docs/backlog-board/index.html`
  was not changed, and the working tree is clean after the commit.
- **Task 5, verification and handover:** this section, committed on top of `cb3f880`.
  The self-check was run on `cb3f880` and passed. It was then run again on the commit
  carrying this section, which is the last commit of the branch; its result is in the
  report to the caller.

### Verification results

Tools for every run: git 2.43.0, Node v22.23.4, Linux x86_64.

- **Guard alone, the way the self-check runs it.** The guard is run on a staged copy of
  `HEAD`, with the self-check's jest linked in. From the worktree, the command is:
  `NM=$PWD/.self-check/node_modules; S=$(mktemp -d); git archive HEAD | tar -x -C "$S"; echo '{"type":"module"}' > "$S/package.json"; cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"; ln -s "$NM" "$S/node_modules"; cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/dispatch.test.js`
- **Task 1, red:** `● dispatch command › tells /refresh-model-tiers to admit to Large only
  models within 1 point of the best pick`, and `Tests: 1 failed, 40 passed, 41 total`.
- **Task 2, green:** `Tests: 41 passed, 41 total`.
- **Task 3, picks:**
  - `grep -c 'Claude Opus 5.5 \*(all)\*' docs/model-picks.md` printed `1`.
  - `grep -n '^| \*\*Large\*\*' docs/model-picks.md` printed
    `17:| **Large** | Claude Opus 5.5 *(all)* |`.
  - `picksForTier(text, 'Large')` printed `Claude Opus 5.5 *(all)*`, and
    `inclusionTable(text).size` printed `13`. The plan's one-liner was used as written,
    since `scripts/plan-binding.js` exports both names.
- **Task 4, installed release's checks:** `npm --prefix .tropis test` printed
  `Test Suites: 13 passed, 13 total` and `Tests: 174 passed, 174 total`.
- **Task 5, self-check on `cb3f880`:** the last line is
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
  The run takes about half an hour on this machine. A run started in the foreground ended
  at the shell timeout, and an earlier background run ended without a verdict, so the
  verdict above comes from a detached run that finished with exit 0.
- **Scope, `git diff --stat origin/main...HEAD`:** every file is in *File Structure*:
  `commands/refresh-model-tiers.md`, `framework/DECISIONS.md`, `docs/model-picks.md`,
  `guards/dispatch.test.js`, `feature-catalog.yaml`, `docs/backlog-board/bands.yaml`, and
  this plan. `index.html` is not in the diff.

### Scope

Nothing outside *File Structure* changed. The installed release (`.claude/`, `.tropis/`,
`CLAUDE.md`, `AGENTS.md`) was not edited. No dependency was added, and no guard or test was
lowered, skipped or deleted. The only test change is the added case.

### Judgment calls

- **Ran the guard through a staged copy of `HEAD`, not the working tree.** This matches how
  the self-check reads committed content, and it is what *Traps* asks for.
- **Set the item's `modules` to the two files the plan names, and wrote the criterion
  comments as the plan gives them.** The comments on criteria 1 and 2 point at "the plan's
  Review record", which does not exist yet; the specifying session writes it in review.
- **Wrote the commit bodies with the fresh-agent check marked as not yet run.** The plan
  places that check with the specifying session, not with this branch. The commit that
  changes `commands/` and `framework/DECISIONS.md` does not touch `.claude/framework/` or
  `.claude/rules/`, so the commit-body requirement for those paths does not apply.
- **The working-tree `framework/DECISIONS.md` append was made with a heredoc.** Its text is
  the plan's, verbatim, with one blank line before the heading.
- **Stopped a duplicate self-check run** that was started while the first one was still
  going. Both were on `cb3f880`, and only the first is cited above.
- **Reminder from the hook on writing `framework/DECISIONS.md` and `commands/`:** noted, and
  learnings were not routed in this branch. The specifying session routes them in review.

### What the plan got wrong

- **The Muse Wonder bullet does not say what it means.** The plan's text reads "AA v5.0 43
  (max), well below the other Medium–large picks' 50 and above". Sonnet 5.5 is also a
  Medium–large pick in the same plan, at 54 on AA v5.0, so "50 and above" is not an accurate
  description of the other Medium–large picks. The text was applied verbatim, as the plan
  says to. The specifying session should decide whether to fix the wording.
- **The criterion comments point at a Review record that does not exist yet.** The plan
  writes that record in review, so a reader of the catalog in the meantime finds a pointer
  to nothing. It was written as the plan says.

### Outstanding

- **No developer check.** The change has no screen. Its only user-facing text is the
  command's section, the picks file and the decision record, so there is no manual check
  for the developer to run.
- **Not reviewed or merged.** The branch is pushed, and no pull request is open. Parent
  review, the fresh-agent check on `commands/refresh-model-tiers.md` and the review record
  belong to the specifying session.
- **Release note.** The plan leaves the release-note line to the developer at `/release`.
- **The Muse Wonder wording** (see *What the plan got wrong*) is open.

## Review record

### Checks re-run

- The new case's six assertions, run with node v22 on Linux x86_64 against
  `commands/refresh-model-tiers.md` at `origin/main` and at `f5aa94a`: `000000` before,
  `111111` after. Each fails on the old text and passes on the new.
- `git diff --stat origin/main...HEAD`: the seven files in *File Structure*, 219
  insertions, 36 deletions; `docs/backlog-board/index.html` untouched.
- **Fresh-agent check**, on the Large tier's pick after this change, Claude Opus 5.5
  (`claude-opus-5-5`; `/dispatch --tier Large` names none because no subscriptions are
  recorded in this cloud session, and Opus 5.5 is the one Large pick Claude Code
  offers). Run as `claude -p --model claude-opus-5-5 --output-format stream-json
  --verbose`, Claude Code 2.1.317, Linux x86_64, in a cloud session where no personal
  instructions load, on a `git archive` of `f5aa94a`. The task, said to be a probe whose
  output is discarded: follow `commands/refresh-model-tiers.md` with six invented models
  and invented figures on two 0-to-100 boards and one Elo board with stated intervals,
  and write the tier table. Its tool calls show it reading the command and
  `framework/model-tiers.md`, nothing else. The expected answer, written before the run:
  Large is Bexa 4 then Arro 9; Coro 2 out at 1.2 points below on one board, although
  within 1 point of Bexa 4, which is the bar falling by admission that the change
  forbids; Dyne 7 out on the Elo board, its below-max figure marked; Eldo 1 out,
  unconfirmed, because no 0-to-100 board scores it. **It answered exactly that**,
  citing step 1 for Coro 2, step 3 for Dyne 7 (with the effort note from step 2) and
  step 4 for Eldo 1, and ordered Large by usage.

### Found

Public exposure: the diff was read for private material; nothing found.

- The handover says the Muse Wonder bullet's "the other Medium–large picks' 50 and
  above" is wrong because Sonnet 5.5 scores 54. 54 is above 50, so the wording is
  accurate; no change.
- The developer asked why Fable 5.1 sits below Opus 5.5 when AA v5.0 scores Fable at
  xhigh and Opus at max. Anthropic's effort page says Fable 5.1 supports max, so that AA
  comparison is not like with like, and the picks now say so beside the figure. The
  placement does not rest on it: CursorBench 4.0 and Terminal-Bench 4.0 score both at
  max, with Fable 6.0 and 6.97 points below Opus, and Arena WebDev 1746 against 1810.
  Whether AA lists a max variant of Fable could not be read: this session's network
  reaches none of the boards.

### Outstanding disposition

- No developer check: the change has no screen.
- The release-note line is the developer's at `/release`.
- The next `/refresh-model-tiers` pass with network access reads the boards again,
  including a max-effort AA figure for Fable 5.1 if one exists; that is the command's
  ordinary work, so it is not a backlog item.

### Learnings routed

The lesson is the change itself: a bar stated relative to models already admitted falls
with each admission, and it is now in the command and in FW-067. Nothing else
generalises.

### Merged because

The command, the decision and the re-placed picks say what the developer agreed, the
new case goes red without the command change, and a fresh agent with only the
repository applied the bar correctly to a case built to tempt it.
