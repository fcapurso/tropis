# /dispatch names the cheapest pick the developer's subscriptions include — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `/dispatch` prints, beside a plan's tier picks, the one pick to run the plan
on: the first, in an order of least usage per task, that one of the developer's own
subscriptions includes with nothing billed on top. To make that possible,
`/refresh-model-tiers` orders each tier's models by usage per task, records which
subscriptions of each supported tool include each pick, and keeps which subscriptions
the developer holds in a file under the git directory, never committed.

**Spec:** decision FW-053 in `framework/DECISIONS.md` (every agent Tropis starts runs on
a subscription the developer already pays for, and never on a model that costs extra on
it) and FW-027 (model picks rest only on figures that can be compared); the sprint
design, `docs/superpowers/specs/2026-11-01-sprint-design.md`, §9's last paragraph; the
five acceptance criteria of the entry `agents-run-on-the-most-efficient-model` in
`feature-catalog.yaml`. Build only this entry. Giving a sprint's team members and the
reviewers Tropis starts a tier is the entry `team-members-and-reviewers-run-on-a-tier`,
which waits for the sprint command; do not touch it.

**Model tier: Medium.** Three small pure functions and their tests, with every message
given verbatim, and command and framework prose given verbatim; the fresh-agent check
needs care in reading what the probe did.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 7; do not open a pull request, write a review
record or merge.

**Requires:** an agent command-line tool signed in to the developer's own subscription that starts a fresh local session from a prompt, for the fresh-agent check in Task 6 (record which, and its version).


Do not store a kick-off prompt on this plan.

---

## Delivers

agents-run-on-the-most-efficient-model

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-agents-run-on-the-most-efficient-model -b plan/agents-run-on-the-most-efficient-model origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`. In particular, do not
  touch `docs/model-picks.md`: it is this repository's own data, refreshed by running
  the command after a release, not by this plan.
- **Add no dependency.** `node:` built-ins only.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`. **Never write which subscription anyone
  actually holds** — yours, the developer's, or what a tool on this machine reported —
  in anything committed, the handover included. The probe in Task 6 uses invented
  subscriptions and stubbed tool reports.
- **No cloud session, cloud agent or API key**, in the work or its checks. The
  fresh-agent check uses the agent command line already signed in on this machine.
- **Never touch the merge token or open a pull request on GitHub.**
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from. `plan-binding.js`, `dispatch.mjs` and
  `guards/dispatch.test.js` are this repository's own and may be followed.
- **Lines in framework documents and commands stay within 90 characters**, as the text
  around them, except table rows and where the verbatim text below has a longer line.

## Evidence

What the specifying session checked on 2026-11-02, for the reasoning below. None of it
goes into a committed file except as *Decision 5* writes it.

- **Claude subscriptions.** Anthropic's help article *Claude Fable models on your plan*
  (support.claude.com, article 15424964, "updated this week") says Fable 5 and 5.1 are
  included on Max and Ultra and on premium Team and Enterprise seats, up to 50% of the
  weekly limits, and use the limits faster than other Claude models; on Pro and on
  standard seats they are not included and run on usage credits. The article *Use Claude
  Code with your Pro, Max, or Ultra plan* (article 11145838) gives no per-model rate for
  the other models. So inclusion differs by subscription, and how fast each model draws
  a Claude subscription is not published.
- **Cursor.** Cursor's models page (cursor.com/docs/models) says paid plans include a
  weekly pool for Cursor's own models, which "draw from the pool at different rates";
  third-party models (Claude, GPT, Gemini) are not in the pool and are billed at the
  model's API list price from prepaid credit on Premium and above; Plus and Free offer
  no third-party models. Its current plans are Free, Plus, Premium, Super, Ultra, Teams
  and Enterprise, and it lists older plan names as legacy.
- **Usage per task.** Artificial Analysis's comparison of Claude Opus 5.5 and Claude
  Sonnet 5.5, both at max effort, shows a cost per task of $10.04 and $10.02: Sonnet's
  token price is half Opus's, and it spends about 1.6 times the output tokens per task.
  A per-token price would have ranked Sonnet at half Opus's usage; cost per task on one
  board puts them level. That is why the order uses cost per task, and why FW-027's
  ban on prices stands.
- **What the tools report.** `claude auth status --json` (Claude Code 2.1.300) prints a
  `subscriptionType` field; `cursor-agent about` (Cursor CLI 2026.10.22) prints a
  `Subscription Tier` line, on macOS 26.2, arm64. On the machine checked, Cursor's line
  gave a plan name its models page lists only as legacy, and neither report says whether
  a team seat is standard or premium. So a report alone cannot always be matched to the
  picks, and the command asks the developer when it cannot.
- **Where a local record lives.** The sprint plan in flight
  (`docs/superpowers/plans/2026-11-02-sprint-plans-and-runs-a-team.md`) keeps its local
  file in `<git common dir>/tropis/`, shared by every worktree and never committed. The
  subscriptions record goes beside it.

## Decisions

### 1. The picks file's second table

`docs/model-picks.md` keeps its tier table, `| Tier | Models |`, unchanged in shape: an
installed release before this one prints its second cell, and keeps working. Two things
change:

- Inside a tier's cell, the models are listed **least usage per task first**. The tool
  tag after a name (`*(all)*`, `*(Cursor)*`) stays.
- A second table follows, its header row beginning `| Model | Usage per task | Included on |`,
  one row per model in the tier table. The first cell is the model's name exactly as the
  tier table writes it, without its tag. The second is the cost per task with its board,
  version and effort, or `unmeasured`. The third names, for each supported tool, the
  subscriptions that include the model, as `<tool>: <subscription>, <subscription>`,
  tools separated by `; `, and `<tool>: none` where every subscription bills it on top.
  A parenthesis after a subscription is a note for people (`Max (to half the weekly
  limit)`) and is ignored when matching.

### 2. The subscriptions record

`<git common dir>/tropis/subscriptions.txt`, where the common dir is what
`git rev-parse --git-common-dir` prints, resolved against the project root. One line per
supported tool, `<tool>: <subscription>` or `<tool>: none`; blank lines and lines
starting `#` are ignored. Tool and subscription match the second table's names case-
insensitively, after a parenthesis and the spaces around it are removed. Written by
`/refresh-model-tiers` (*Decision 5*); read by `/dispatch`. Never committed.

### 3. Three functions in `scripts/plan-binding.js`

Add, beside `picksForTier`, with JSDoc like their neighbours:

- `parseSubscriptions(text)` → a `Map` from lower-cased tool name to a `Set` of
  lower-cased subscription names, from the record's format (*Decision 2*). `none` adds the
  tool with an empty set. Text with no line of the form `<tool>: <value>` gives an empty
  map.
- `inclusionTable(picksText)` → `null` when the text has no line starting
  `| Model | Usage per task | Included on |`; otherwise a `Map` from model name (as
  written in the first cell, trimmed) to a `Map` from lower-cased tool name to
  `{ name, subscriptions }`: `name` is the tool as the cell spells it, `subscriptions` a
  `Set` of lower-cased subscription names. Read the rows under that header up to the
  first line that does not start with `|`, skipping the `|---|` row.
- `pickToUse(picksText, tier, subscriptionsText)` → the text of one prompt line, or
  `null`. `subscriptionsText` is `null` when there is no record. Tier order, lowest
  first: `Small`, `Small–medium`, `Medium`, `Medium–large`, `Large`, compared through the
  existing `normalizeTier`. Steps:
  1. If `tier` is none of the five, return `null` (no line is printed).
  2. If `inclusionTable` is `null`, return
     `**Use:** not chosen — the picks do not say which subscriptions include each model. Run /refresh-model-tiers.`
  3. If `subscriptionsText` is `null` or parses to an empty map, return
     `**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers.`
  4. For the plan's tier and then each higher tier in order: take the tier's cell with
     `picksForTier`, split it on `;`, trim each part, drop a part that reads
     `or any pick from a higher tier` or `Any pick from a higher tier` (any case), and
     remove a trailing `*(…)*` tag and the spaces before it. For each model in that
     order, look it up in the inclusion table; for each tool in the order the cell lists
     them, if the record has that tool and one of its subscriptions is in the model's
     set for that tool, the model is chosen with that tool, and the tool's name is
     written as the inclusion cell writes it. A model missing from the inclusion table is
     skipped.
  5. Chosen in the plan's own tier:
     `**Use:** <model>, in <tool> — the first pick for this tier that your subscriptions include.`
     Chosen in a higher tier:
     `**Use:** <model>, in <tool> — no pick for this tier is included in your subscriptions; this is the first included pick from the <Tier> tier.`
     with `<Tier>` as the definitions name it (`Medium–large`, with the en dash).
  6. Nothing chosen:
     `**Use:** none — no pick for this tier or above is included in your subscriptions, and a model that costs extra is not used (FW-053).`

Matching is on lower case; the output uses the inclusion cell's spelling of the tool.

### 4. `renderThinPrompt` and `scripts/dispatch.mjs`

`renderThinPrompt` takes one more option, `use` (string or null, default null), and,
where picks are printed, pushes it on the line straight after `**Picks today:** …`, when
it is not null. With no picks file (`picks === null`) it prints no `use` line.

`dispatch.mjs` reads the record: run `git rev-parse --git-common-dir` with `cwd: root`
through `spawnSync` from `node:child_process`, resolve its output against `root`, and
read `tropis/subscriptions.txt` there; any failure (no git, no file) gives `null`. It
passes `use: picksText === null ? null : pickToUse(picksText, protocol.tier, subscriptionsText)`.

### 5. The prose, verbatim

**`commands/refresh-model-tiers.md`.**

(a) Replace the whole section `## What the picks are for` (heading included, up to the
next `## ` heading) with:

```markdown
## What the picks are for

**A model's tier rests on fitness for the tier's work, and on nothing else.** Each model
sits in the highest tier its evidence supports, and fits every tier below it. A lower
tier's row names only the models that reach no higher, and ends with
`or any pick from a higher tier`; a lower tier with no model of its own reads
`Any pick from a higher tier`.

**Inside a tier, the models go least usage first.** A developer's subscriptions last
longer on the model that does the job with the least of their allowance, and `/dispatch`
names the first one the developer's subscriptions include. Usage is measured as cost per
task on one shared board, at one effort setting for every model compared, such as the
cost per task Artificial Analysis shows for its Intelligence Index. Cost per task folds a
model's price and the tokens it spends into one figure, so a model with a lower price
that spends more tokens is not taken for the cheaper one. It stands in for usage because
no vendor publishes how fast each model draws a subscription's allowance: Cursor bills a
third-party model at its API price, and Anthropic says only that some models draw a
Claude subscription's limits faster than others. A model the board does not cover goes
after the ones it does, marked `unmeasured`. Usage never moves a model between tiers.
Record cost per task, never list prices.

**Say which subscriptions include each pick.** For every supported tool, read the
vendor's own pages on which of its subscriptions include each model within the
allowance, with nothing billed on top: usage credits, on-demand usage and prepaid credit
are billed on top. A model a subscription includes only up to a share of its allowance
is included, with the share in parentheses after the subscription. A fact only a
third-party page states is marked `(third-party)` in the same way. `/dispatch` never
names a pick that none of the developer's subscriptions include (FW-053).

## Which subscriptions the developer has

`/dispatch` chooses among the picks by the subscriptions the developer holds. They are
kept on this machine and never committed: the picks file is shared, in a public project
read by anyone, and a person's subscriptions are theirs.

1. Read what each supported tool reports: `claude auth status --json`, its
   `subscriptionType` field, and `cursor-agent about`, its `Subscription Tier` line. A
   tool that is not installed or not signed in reports nothing.
2. Read the record, `tropis/subscriptions.txt` in the directory
   `git rev-parse --git-common-dir` prints, if there is one.
3. Ask the developer, in one question covering every supported tool, when a tool reports
   nothing, reports a name the *Included on* cells do not use, or disagrees with the
   record. Show what each tool reported. A report does not say whether a team seat is
   standard or premium, and a tool can report a name its vendor now lists only as legacy.
   When every report matches the record and a name the cells use, do not ask.
4. Write the record: one line per supported tool, `<tool>: <subscription>`, with the tool
   and the subscription written as the *Included on* cells write them, or
   `<tool>: none`. Create the `tropis` folder if it is missing. Never commit the record
   or copy it into the repository, and never write the developer's subscriptions into
   the picks file or a commit message.
```

(b) In `## What to record`, replace the whole bullet that starts
`- **Token usage, beside the picks, not in them.**` (to the end of that bullet) with:

```markdown
- **Usage per task, in the second table.** Each figure names its board, the board's
  version, and the effort setting, and is compared only with figures from the same board
  at the same effort. Where the board also reports tokens per task, give them beside the
  cost. Vendors split text into tokens differently, so set token counts side by side only
  from the same board.
```

(c) In `## The file`, replace the sentence
``/dispatch` reads two things from `docs/model-picks.md`, and both must keep this shape:``
with ``/dispatch` reads three things from `docs/model-picks.md`, and all must keep this shape:``,
and add after the bullet about the tier table, as a third bullet:

```markdown
- one table whose header row begins `| Model | Usage per task | Included on |`, with one
  row per model in the tier table: its name as the tier table writes it, without the
  tool tag; its cost per task, or `unmeasured`; and, for each supported tool, the
  subscriptions that include it, written `<tool>: <subscription>, <subscription>`, tools
  separated by `; `, and `<tool>: none` where none does.
```

(d) In the template block that follows (`Start a new file like this`), replace the two
lines

```
Picks are placed on fitness for the tier's work alone; cost is left to whoever
dispatches. Token usage, where a shared board reports it, is in the notes below.
```

with

```
Each model sits in the tier its fitness supports. Inside a tier, models are listed
least usage per task first, and `/dispatch` names the first one your subscriptions
include; the second table gives each pick's usage and the subscriptions that include it.
```

and, after the tier table's `| **Small** | …; or any pick from a higher tier |` row and
before the closing fence, add a blank line and:

```
| Model | Usage per task | Included on |
|---|---|---|
| … | $… per task (board, version, effort) | Claude Code: …; Cursor: … |
```

(e) In `## Finishing`, insert as a new step 2, renumbering the rest:
`2. Write the subscriptions record (*Which subscriptions the developer has*); it is not
part of the commit.` In the step about the commit body, append: `Name no subscription
anyone holds.`

**`framework/model-tiers.md`.** After the paragraph that ends
``says to run `/refresh-model-tiers`.``, insert a paragraph:

```markdown
Inside a tier, the picks list models least usage per task first, and say which
subscriptions of each supported tool include each one. Which subscriptions the developer
holds is kept on their machine, never committed; `/dispatch` names the first pick for a
plan's tier that one of them includes, and never one that would cost extra (FW-053).
```

**`framework/dispatch.md`.** In the bullet `**The dispatch header:**`, after the
sentence that ends ``to run `/refresh-model-tiers`; the prompt never invents picks.``,
add: ``Beneath the picks, the pick to use: the first in the tier's order, then the next
tier up, that a subscription recorded on this machine includes, with the tool to run it
in. Where no subscription is recorded, the picks do not say which subscriptions include
each model, or none is included, the line says so and names no pick.``

**`commands/dispatch.md`.** Replace ``are stale or the project has none, the prompt says
so,`` with ``are stale or the project has none, or no subscription of yours is recorded
on this machine, the prompt says so,``.

**`framework/DECISIONS.md`.** Append, after the last decision, with the next free number
on your base: **FW-057** if neither FW-056 nor FW-057 is taken (FW-056 is reserved by
the sprint plan in flight). Say under *Judgment calls* which number you took.

```markdown
## FW-057: Inside a tier, picks go least usage first, and dispatch names one the developer's subscriptions include

**Date:** 2026-11-02 · **Status:** Accepted.

**Decision:** `/refresh-model-tiers` still places each model in a tier on fitness alone,
and now lists a tier's models least usage per task first, measured as cost per task on
one shared board at one effort setting, and records which subscriptions of each
supported tool include each pick. Which subscriptions the developer holds is read from
what the tools report, asked of the developer when that cannot be matched, and kept in
`<git common dir>/tropis/subscriptions.txt`, never committed. `/dispatch` prints the
first pick for the plan's tier, then for each tier above, that a recorded subscription
includes, and names none when none is.

**Evidence:** Read on 2026-11-02. Anthropic's article on Fable models says they are
included on some Claude subscriptions, up to half the weekly limits, and run on usage
credits on others; no vendor page gives how fast each other model draws a subscription.
Cursor's models page says third-party models are billed at the model's API list price,
outside the included pool. Artificial Analysis shows Claude Sonnet 5.5 and Claude Opus
5.5 at about $10 per task each at max effort, though Sonnet's token price is half
Opus's: a per-token price would have ranked them wrongly, and cost per task on one board
did not. A tool's report can name a plan its vendor lists only as legacy, and does not
say whether a team seat is premium. Source: none in particular; the pages above.

**Rejected:** Ranking by list price per token (it hides a model that spends more
tokens, as FW-027 found). Letting usage move a model between tiers (it would put a
cheaper, less capable model on work it cannot hold). Recording the developer's
subscriptions in the picks file (it is committed, and in a public project anyone reads
it). Trusting the tools' reports without asking (they cannot always be matched to the
vendors' names).

**Consequences:** FW-027's *cost is left out* now covers placement only. A picks file
from before this has no inclusion table; `/dispatch` still prints its picks and says to
refresh. A sprint's team members and the reviewers Tropis starts get a tier through the
entry `team-members-and-reviewers-run-on-a-tier`.
```

And in FW-027, replace its status line
`**Date:** 2026-10-21 · **Status:** Accepted` with
`**Date:** 2026-10-21 · **Status:** Accepted; its exclusion of cost now covers placement only (FW-057).`

### 6. The tests, in `guards/dispatch.test.js`

Import `parseSubscriptions`, `inclusionTable` and `pickToUse` beside the existing
imports from `../scripts/plan-binding.js`. Keep every existing case. Add these, using the
file's own `project()`, `plan()` and `run()` helpers; a record is written to
`join(root, '.git/tropis/subscriptions.txt')` after `mkdirSync(join(root, '.git/tropis'), { recursive: true })`.
The `plan()` helper's tier is `small`.

The picks text for the end-to-end cases, `PICKS` (the date is today, built as the
existing case builds it):

```
**Last verified: <today>.**

| Tier | Models |
|---|---|
| **Large** | Birch 2 *(all)*; Alder 3 *(all)* |
| **Medium–large** | Any pick from a higher tier |
| **Medium** | Cedar 1 *(Cursor)*; or any pick from a higher tier |
| **Small–medium** | Any pick from a higher tier |
| **Small** | Elm 0 *(Cursor)*; Dogwood 1 *(Cursor)*; or any pick from a higher tier |

| Model | Usage per task | Included on |
|---|---|---|
| Alder 3 | $9 per task (Example Index v1, high) | Claude Code: Max (to half the weekly limit), Ultra; Cursor: none |
| Birch 2 | $4 per task (Example Index v1, high) | Claude Code: none; Cursor: Premium |
| Cedar 1 | $1 per task (Example Index v1, high) | Cursor: Plus, Premium |
| Dogwood 1 | unmeasured | Cursor: Premium |
```

The second table lists Alder 3 before Birch 2 on purpose, the reverse of the tier
row, and Elm 0 has no row in it on purpose.

Cases, each with what it expects (the † cases must fail before Task 2):

1. † *names the first included pick of the tier, with its tool, skipping a model
   missing from the inclusion table*: picks `PICKS`, record
   `Cursor: Premium\n`; stdout contains
   `**Use:** Dogwood 1, in Cursor — the first pick for this tier that your subscriptions include.`
2. † *goes up a tier when none of this tier's picks is included*: picks `PICKS`, record `Cursor: Plus\n`; stdout
   contains `**Use:** Cedar 1, in Cursor — no pick for this tier is included in your subscriptions; this is the first included pick from the Medium tier.`
3. † *matches a subscription that carries a note*:
   picks `PICKS`, record `# mine\nclaude code: max\nCursor: none\n`; stdout contains
   `**Use:** Alder 3, in Claude Code — no pick for this tier is included in your subscriptions; this is the first included pick from the Large tier.`
   and does not contain `**Use:** Birch 2`.
4. † *names no pick when none is included*: picks `PICKS`, record
   `Claude Code: Pro\nCursor: none\n`; stdout contains
   `**Use:** none — no pick for this tier or above is included in your subscriptions, and a model that costs extra is not used (FW-053).`
5. † *says so when no subscriptions are recorded*: picks `PICKS`, no record; stdout
   contains `**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers.`
6. † *keeps an earlier picks file working*: picks
   `**Last verified: <today>.**\n\n| Tier | Models |\n|---|---|\n| **Small** | Old Model |\n`,
   record `Cursor: Premium\n`; stdout contains `**Picks today:** Old Model` and
   `**Use:** not chosen — the picks do not say which subscriptions include each model. Run /refresh-model-tiers.`
7. † *the Use line sits under the picks, and the same from `.tropis/`*: picks `PICKS`,
   record `Cursor: Premium\n`; in stdout the line after the one starting
   `**Picks today:**` starts `**Use:**`; running `node scripts/dispatch.mjs <plan>` with
   cwd `.tropis/` prints the same stdout.
8. *no picks file, no Use line*: the existing first case also asserts stdout does not
   contain `**Use:**` — add that one assertion to it.
9. † *the template the refresh command gives carries the inclusion table*: in the
   existing case `reads the picks table /refresh-model-tiers tells a project to start
   from`, add `expect(template).toContain('| Model | Usage per task | Included on |\n|---|---|---|\n')`
   and `expect(inclusionTable(template).size).toBe(1)`.
10. † *unit*: `parseSubscriptions('# x\n\nClaude Code: Max\ncursor: none\nnot a line\n')`
    has two keys, `claude code` with `{'max'}` and `cursor` with an empty set;
    `inclusionTable('| Tier | Models |\n|---|---|\n')` is `null`; `inclusionTable(PICKS).get('Alder 3').get('claude code')`
    has `name` `Claude Code` and subscriptions `{'max', 'ultra'}`; `pickToUse(PICKS, 'Huge', 'Cursor: Premium')`
    is `null`; and *takes the tier's order, not the table's*:
    `pickToUse(PICKS, 'Large', 'Claude Code: Max\nCursor: Premium')` is
    `**Use:** Birch 2, in Cursor — the first pick for this tier that your subscriptions include.`

## Traps

- **The tests must fail first.** Task 1 commits them before the code; until Task 2 the
  new imports are `undefined`, so import nothing new by name that would stop the file
  loading — import the module as a namespace for the three new functions
  (`import * as binding from '../scripts/plan-binding.js'`), or the whole file fails at
  link time for one reason. Run the test file alone to see the † cases fail: the
  self-check runs the whole suite, and a red case there tells you less.
- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green.
- **The en dash.** Tier names use `–` (U+2013), not a hyphen: `Small–medium`,
  `Medium–large`. `normalizeTier` already treats both alike for matching; the output
  line writes the en dash.
- **`picksForTier` scans every line after the tier table's header**, including the new
  second table. A model name never equals a tier name, so it still finds the tier row;
  do not change it.
- **The probe's stub tools are only for the probe.** Put them in a scratch folder first
  on the probe's `PATH`; never in the repository, and never replace the real `claude`
  the probe itself is started with — start it by its absolute path.
- **This plan quotes commands that are not declarations.** Its header has no
  `Merges after` field unless the claim wrote one; do not add or remove one.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | *Decision 3*, and `renderThinPrompt`'s `use` option (*Decision 4*) |
| `scripts/dispatch.mjs` | reads the record and passes `use` (*Decision 4*) |
| `guards/dispatch.test.js` | *Decision 6* |
| `commands/refresh-model-tiers.md` | *Decision 5* |
| `commands/dispatch.md` | *Decision 5* |
| `framework/model-tiers.md` | *Decision 5* |
| `framework/dispatch.md` | *Decision 5* |
| `framework/DECISIONS.md` | the new decision and FW-027's status line (*Decision 5*) |
| `feature-catalog.yaml` | the entry to `shipped`, with a comment mapping criteria to checks (Task 5) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 5) |
| `docs/superpowers/plans/2026-11-02-agents-run-on-the-most-efficient-model.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the decision record, the framework's
tier and dispatch documents and the two commands are what this change owes. The operator
guide, `templates/README.md`, names `/refresh-model-tiers` in a list and describes none
of its behaviour, so it owes nothing; it is also in the sprint plan's file list, and
leaving it out keeps this plan from waiting on that one. The README is not
patched (`/refresh-readme`). No upstream queue: this repository is the upstream. This
repository's own `docs/model-picks.md` is refreshed by the developer running the command
after the release; it is not this plan's.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` and the
operating system's version for the handover.

### Task 1 — The tests, red

Write the cases of *Decision 6*. Commit. Run the file alone with the Jest that Task 0's
self-check installed under `.self-check/`, the way `scripts/check-blueprint.sh` runs
Jest (it stages the tree and writes a config from `templates/framework-jest.config.js`;
a plain `jest guards/dispatch.test.js` from the worktree root does not find a config),
and write the exact command under *Verification results*. Every † case must fail; no case
that existed before this plan may fail. Paste the failing test names.

### Task 2 — The code

Apply *Decisions 3 and 4*. Commit. Run the test file alone (all pass), then
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Paste both.

### Task 3 — Show the cases can fail

Each a throwaway commit, then the test file alone, then `git reset --hard HEAD~1`:

1. Make step 4 of `pickToUse` look only at the plan's own tier. Expected red: cases 2
   and 3.
2. Make it ignore the record and choose the first model with any inclusion at all.
   Expected red: cases 2, 3 and 4.
3. Stop stripping a parenthesis from a subscription. Expected red: case 3.
4. Make step 4 walk the inclusion table's rows instead of the tier's cell. Expected
   red: cases 1 and 10.

Paste each red run's failing test names.

### Task 4 — The prose

Apply *Decision 5*: the two commands, the two framework documents and the decision
record. Commit. Run `bash scripts/check-blueprint.sh`; paste the last
line.

### Task 5 — The catalog and the board

1. In `feature-catalog.yaml`, on `agents-run-on-the-most-efficient-model`: set
   `status: shipped` (it reads `building`; if it reads anything else, set `shipped`
   anyway and say so under *Judgment calls*). Set `modules` to `scripts/plan-binding.js`,
   `scripts/dispatch.mjs`, `commands/refresh-model-tiers.md` and
   `guards/dispatch.test.js`. It has no `blockedBy`; leave `refs` as it is. Add, directly
   above the comment that already sits over the entry, a comment
   `# Shipped by docs/superpowers/plans/2026-11-02-agents-run-on-the-most-efficient-model.md.`
   and one line per acceptance criterion naming what covers it: criteria 3, 4 and 5 by
   the dispatch test cases (by name), criterion 1 by case 9 and the Task 6 check, and
   criterion 2 by the Task 6 fresh-agent check, recorded in the commit that ends Task 6.
   Do not put `: ` (colon and space) inside an unquoted YAML value. Do not touch the
   entry `team-members-and-reviewers-run-on-a-tier`.
2. In `docs/backlog-board/bands.yaml`, delete the whole
   `agents-run-on-the-most-efficient-model:` block (the key and its indented lines,
   through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 6 — The fresh-agent check

The change is to a command and to framework documents, so a fresh agent with nothing but
a project carrying the new command text must do what it says. This is a probe with
invented models and invented subscriptions; its output is discarded.

1. Make a scratch project: `$TMPDIR/picks-probe`, `git init -b main`, an identity of
   `probe@example.com`. Copy this worktree's `commands/refresh-model-tiers.md` to its
   `.claude/commands/refresh-model-tiers.md` and `framework/model-tiers.md` to its
   `.claude/framework/model-tiers.md`; add a `README.md` of one line; commit.
2. Make `$TMPDIR/picks-probe-bin` with two executable stubs: `claude`, which for the
   arguments `auth status` (with or without `--json`) prints
   `{"loggedIn":true,"authMethod":"claude.ai","subscriptionType":"max"}` and otherwise
   exits 1; and `cursor-agent`, which for `about` prints
   `Subscription Tier   Pro` on a line of its own and otherwise exits 1.
3. Start the agent command line by its absolute path, with `PATH` set to
   `$TMPDIR/picks-probe-bin` followed by the existing `PATH`, in the scratch project,
   with its tool calls visible (for Claude Code:
   `--output-format stream-json --verbose --permission-mode acceptEdits`), and this
   prompt, verbatim apart from the path:

   *"This is a probe; its output will be discarded. In the project at `<scratch
   project>`, run /refresh-model-tiers as `.claude/commands/refresh-model-tiers.md`
   says, with one exception: do not search the web. The only evidence there is, is
   this. The supported tools are Claude Code and Cursor. Placement is settled: Alder 3
   and Birch 2 are Large, Cedar 1 is Medium, Dogwood 1 is Small. Cost per task on the
   Example Index v1 at high effort: Alder 3 $9.10, Birch 2 $4.20, Cedar 1 $1.10;
   Dogwood 1 is not on that board. Alder 3 and Birch 2 are offered in both tools, Cedar
   1 only in Cursor, Dogwood 1 in both. The vendors' pages say: Claude Code's
   subscriptions are Pro, Max and Ultra; Alder 3 is included on Max and Ultra up to half
   the weekly limit and costs usage credits on Pro; Birch 2 and Dogwood 1 are included
   on Pro, Max and Ultra. Cursor's subscriptions are Plus, Premium and Ultra; Cursor
   includes Cedar 1 on all three and bills every other model at its API price. When you
   would ask the developer something, write the question in your reply and take this as
   the answer: 'Claude Code: Max. Cursor: Plus.' Report what you ran."*

4. Check, and paste the evidence for each:
   - the agent ran `claude auth status` and `cursor-agent about` (the calls from the
     stream);
   - it asked the developer a question about Cursor's subscription, because `Pro` is
     not a name the cells use (quote the question);
   - `<scratch project>/.git/tropis/subscriptions.txt` exists and reads, apart from
     comments and blank lines, `Claude Code: Max` and `Cursor: Plus` (any order, case
     as the cells write them);
   - `docs/model-picks.md` in the scratch project's last commit lists Birch 2 before
     Alder 3 in the Large row, has the `| Model | Usage per task | Included on |` table
     with a row for each of the four models, and marks Dogwood 1 `unmeasured`;
   - neither that file nor the commit message names `Max` or `Plus` as anyone's
     subscription (they may appear only in *Included on* cells) — quote the commit
     message;
   - `node -e` importing `pickToUse` from this worktree's `scripts/plan-binding.js`,
     given the scratch picks file, tier `Large` and the scratch record, prints a line
     naming Birch 2 in Claude Code.

If the agent misses a step, the wording is not clear enough: change it, commit, and run
the probe again. If it fails twice, stop and hand back with both runs' relevant calls.
Record the tool, its version, the model, the operating system and the architecture;
these go in the body of a commit (a no-change commit with `--allow-empty` is fine) and
in the handover, with one sentence on what the agent was asked and whether it did it.
Delete `$TMPDIR/picks-probe` and `$TMPDIR/picks-probe-bin` afterwards.

### Task 7 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Read your whole diff for private material, and for any subscription someone actually
   holds; say in the handover that you did and what you found.
3. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check, and that this repository's own picks file is
   refreshed after the release. Commit.
4. Push the branch (`git push -u origin plan/agents-run-on-the-most-efficient-model`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.
