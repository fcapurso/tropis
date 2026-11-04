# The model picks are judged at the effort each tool starts a model at — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `/refresh-model-tiers` judges every pick at the lowest effort a supported tool
starts it at, records those efforts and their sources in the picks file, reads each board
at that effort and marks a placement inferred where a board has no row there; the
decision record says so; and this repository's picks are re-placed under that rule.

**Backlog item:** `picks-are-judged-at-the-default-effort` in `feature-catalog.yaml`
(type improvement). No spec: the backlog item's comment and criteria, and this plan.

**One plan:** what becomes true is one sentence — each pick sits in the tier its
evidence supports at the effort a supported tool actually starts it at.

**Why.** Step 2 of the Large bar in `commands/refresh-model-tiers.md` reads each model
at its best score, and nothing in the command asks at which effort a tool starts the
model. Claude Code starts Opus 5.5, Sonnet 5.5 and Haiku 5.5 at medium, and neither
`/dispatch` nor `sprint.mjs launch` sets an effort, so the picks judged Sonnet 5.5 at
max (CursorBench 4.0 55.5%) and hand it Medium–large work it runs at medium (39.2%). The
developer stated the item on 2026-11-04 and chose to judge the picks at each tool's
default, not to start models at the boards' effort: the default is the vendor's own
trade-off.

**Decided by the specifying session while shaping** (the developer left these to it):

- **Which effort a tool starts a pick at.** Claude Code: the model's default on its
  model-configuration page. Cursor: the default the model's own page in Cursor's
  documentation states, and any plan that fixes it (Plus fixes Cursor's own models at
  medium); where Cursor states no default, the effort the pick's Cursor command-line
  name selects, which in this repository's picks is High.
- **One effort per pick, the lowest of the tools'.** The tier table has one row per
  model and `/dispatch` reads it by name, so a pick cannot sit in two tiers; its tier
  must hold wherever it runs.
- **A board with no row at the judged effort:** the nearest row is read, with its
  effort, and the placement marked `inferred`. A row above may overstate, so it never
  lifts a model into a higher tier and never sets Large's highest score; a row below may
  understate, so it never keeps a model out of one. A board that scores a model only
  above its judged effort does not confirm it for Large.
- **Usage per task stays at High for every pick** (FW-057), and the Cursor command-line
  names stay the High variants: they were not re-read, and `cursor-agent` is not in this
  session.
- **`Last verified` stays 2026-11-02.** The pass of 2026-11-04 re-read the boards and
  the efforts, not the subscriptions, the command-line names, Arena WebDev (arena.ai
  answered 403) or the departures; a line in the file says which.

**What the specifying session verified on 2026-11-04** (curl through this session's
proxy, Linux x86_64), recorded so the executor need not re-read anything:

- `code.claude.com/docs/en/model-config`, *Adjust effort level*: "The model's default
  effort: `high` on every model that supports effort, except that Opus 5.5, Sonnet 5.5,
  and Haiku 5.5 default to `medium` and Opus 4.7 defaults to `xhigh`." Fable 5.1
  supports effort, so it defaults to high.
- Cursor's model pages (`cursor.com/docs/models/<model>.md`): Gemini 4 Argon "medium
  (the default)"; Grok 4.7 "high (default)", and "On Plus … fixed at medium effort";
  Muse Wonder "high (the default)"; Gemini 3.8 Flash "high (the default)"; Sonnet 5.5
  "the default high effort". Opus 5.5 and Fable 5.1 pages recommend "the high thinking
  variant" and state no default; Haiku 5.5, GPT-5.6 Sol, Terra and Luna, and Composer
  2.5 state none; DeepSeek V4.1 Flash has no page. `cursor.com/docs/models-and-pricing`:
  Plus runs Cursor's own models "at fixed settings: Fast is off, effort is medium".
- `cursor.com/cursorbench` (CursorBench 4.0), the rows used: Opus 5.5 Medium 52.5;
  Gemini 4 Argon Medium 52.8; Fable 5.1 High 49.2; Muse Wonder High 46.1; DeepSeek V4.1
  Flash 1017 High 45.6; Grok 4.7 Medium 41.6; Gemini 3.8 Flash High 39.6; Sonnet 5.5
  Medium 39.2; Haiku 5.5 Medium 36.9; GPT-5.6 Sol High 35.7; Terra High 30.7; Luna High
  29.4; Composer 2.5 27.7. Every High figure and cost in the picks' usage table matches.
- `artificialanalysis.ai/leaderboards/models`, Intelligence Index v5.0.1, rounded as AA
  shows them: Opus 5.5 medium 48 (max 59); Gemini 4 Argon high 50, its only row; Fable
  5.1 high 47; Muse Wonder max 44, its only row; Sonnet 5.5 medium 31 (max 54); Gemini
  3.8 Flash high 31; Grok 4.7 high 35, low 31, no medium row; DeepSeek V4.1 Flash 1017
  high 29; Haiku 5.5 medium 25; no score for GPT-5.6 Sol, Terra, Luna or Composer 2.5.
- `www.tbench.ai/leaderboard/terminal-bench/4.0`: Opus 5.5 64.85 (max), Sonnet 5.5 61.82
  (max), Fable 5.1 54.55 (high) and 57.88 (max), Grok 4.7 37.58 (xhigh), Sol 37.27
  (max), Terra 21.52 (max), Gemini 3.8 Flash 19.09 (high), Luna 17.27 (max).
- Against `origin/main` at `7e9ccc7`: the command's Large steps read as quoted in *The
  command*; `guards/dispatch.test.js` has the case `tells /refresh-model-tiers to admit
  to Large only models within 1 point of the best pick`; the last decision is FW-068;
  `/dispatch` reads only the tier table and the table whose header begins
  `| Model | Usage per task | Included on |` (`scripts/plan-binding.js`), and the new
  picks file below gives the tiers above through `picksForTier` and 13 rows through
  `inclusionTable`.

**Model tier: Small–medium.** Every text is given verbatim; the work is copying it into
five files and checking.

**Merge authority: parent review.** The specifying session reviews, runs the fresh-agent
check on the command (it wrote the clause), opens the pull request and merges. Stop after
Task 5; do not open a pull request, write a review record or merge.

---

## Delivers

picks-are-judged-at-the-default-effort

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-default-effort -b plan/picks-are-judged-at-the-default-effort origin/main` |

The worktree already exists, made by the specifying session, with the claim commit on
it: work in it, on that branch.

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
- **Read no web page.** Every figure is given here.

## The command

Three edits to `commands/refresh-model-tiers.md`, verbatim.

**Edit 1.** Directly before the line `## What the picks are for`, insert this section
and a blank line after it:

```markdown
## The effort each pick is judged at

**Judge every pick at the effort a supported tool starts it at, never at its best.** A
model's score climbs with its effort setting, and each tool starts a model at a default
of its own, which `/dispatch` and `sprint.mjs launch` do not change: on 2026-11-04 Claude
Code started Opus 5.5, Sonnet 5.5 and Haiku 5.5 at medium, while every board's best row
for them was at max. A model judged at its best is handed work only its best setting can
hold. The developer chose the tools' defaults over starting each model at the boards'
effort, in FW-069.

1. **For each pick, and each supported tool that offers it, find the effort the tool
   starts it at, from that tool's own documentation, read this pass.** For Claude Code,
   the model's default effort on its model-configuration page. For Cursor, the default
   the model's own page in Cursor's documentation states, and the effort any Cursor plan
   fixes it at. Where Cursor's documentation states no default, the pick starts at the
   effort its Cursor command-line name selects: record that, marked `Cursor states no
   default`.
2. **A pick is judged at the lowest of those efforts.** Its tier must hold wherever it
   runs, so it rests on the weakest setting a supported tool starts it at.
3. **Record each pick's efforts in the picks file**, in a table whose header row begins
   `| Model | Judged at |`, one row per pick: the effort it is judged at, each supported
   tool's start effort written `<tool>: <effort>`, and the page each came from.

**Read each board at the effort a pick is judged at.** Take the board's row for the
model at that effort, and record the effort beside the figure. Where the board has no
such row, take the nearest it has, record its effort, and mark the placement `inferred`:
a row above the judged effort may overstate the model, and a row below may understate
it. **A figure that may overstate never lifts a model into a higher tier and never sets
the highest score Large is measured against; a figure that may understate never keeps a
model out of one.** A model with no effort setting is read at its one row. A board that
does not say at which effort it scored a model orders models and decides nothing.
```

**Edit 2.** In Large's step 1, replace

```markdown
   Artificial Analysis's Intelligence Index or CursorBench, find the highest score any
   selectable model has. A model is in Large only when, on every such board that scores
```

with

```markdown
   Artificial Analysis's Intelligence Index or CursorBench, find the highest score any
   selectable model has at the effort it is judged at. A model is in Large only when, on
   every such board that scores
```

**Edit 3.** Replace step 2 of Large,

```markdown
2. **Read each model at its best score on the board**, and record the effort setting
   beside it. Where the board did not score a model at the highest effort the model
   supports, say so beside the figure: the comparison may understate the model, and a
   pass that finds the higher setting compares again.
```

with

```markdown
2. **Read each model at the effort it is judged at**, as *Read each board at the effort
   a pick is judged at* says. A board that scores a model only above its judged effort
   does not confirm it for Large: the model stays out of Large, marked `Large
   unconfirmed`, and a pass that finds the board's row at the judged effort compares
   again.
```

Nothing else in the file changes.

## The decision record

In `framework/DECISIONS.md`:

**Edit 1.** In FW-067's status, replace

```markdown
`large-tier-anchors-on-the-best-pick`. Amends FW-027's placement rule for Large.
```

with

```markdown
`large-tier-anchors-on-the-best-pick`. Amends FW-027's placement rule for Large. Its
reading of each model at its best score is replaced by FW-069.
```

**Edit 2.** Append at the end of the file, after FW-068, separated by a blank line,
verbatim:

```markdown
## FW-069: The picks are judged at the effort each tool starts a model at

**Date:** 2026-11-04 · **Status:** Accepted; built by the backlog item
`picks-are-judged-at-the-default-effort`. Replaces FW-067's reading of each model at its
best score.

**Decision:** `/refresh-model-tiers` judges each pick at the lowest effort a supported
tool starts it at: Claude Code's documented default for the model; Cursor's documented
default, or the effort a Cursor plan fixes; and, where Cursor states no default, the
effort the pick's Cursor command-line name selects. The picks file records those efforts
and the pages they came from. Each board is read at its row for that effort. Where a
board has none, its nearest row is read and the placement marked inferred: a figure that
may overstate a model never lifts it into a higher tier or sets Large's highest score,
one that may understate it never keeps it out, and a board that scores a model only
above its judged effort does not confirm it for Large. Usage per task is still read at
one effort for every model (FW-057).

**Evidence:** Claude Code's model-configuration page, read 2026-11-04: Opus 5.5, Sonnet
5.5 and Haiku 5.5 default to medium, and every other model that supports effort to high.
Neither `/dispatch` nor `sprint.mjs launch` sets an effort. The picks of 2026-11-03 read
each model at its best row, mostly max: Sonnet 5.5 sat in Medium–large on CursorBench
4.0's 55.5% at Max, and scores 39.2% at Medium, level with Gemini 3.8 Flash and below
Grok 4.7; Artificial Analysis's Intelligence Index v5.0.1 shows the same fall, 54 at max
against 31 at medium. Source: none in particular; the pages above.

**Rejected:** Starting each model at the effort the boards scored it at (the developer
chose the tools' defaults on 2026-11-04: a default is the vendor's own trade-off, and a
higher setting draws on the subscription faster). Judging a pick once per tool, so one
model sits in two tiers (the tier table has one row per model, and `/dispatch` reads it
by name). Reading every model at its best and marking it (that is the reading this
replaces).

**Consequences:** On the figures read 2026-11-04, Opus 5.5 at medium stays alone in
Large. Gemini 4 Argon, highest on CursorBench 4.0 at its medium default, stays out:
Artificial Analysis scores it only at high. Sonnet 5.5 moves from Medium–large to
Small–medium, Muse Wonder from Medium–large to Medium, GPT-5.6 Sol from Medium to
Small–medium and GPT-5.6 Terra from Small–medium to Small. Claude Code then has no pick of
its own in Medium or Medium–large but Fable 5.1, so a plan of either tier runs on Fable
5.1 where Max, Ultra or Team Premium includes it, the most expensive pick per task, and
on Opus 5.5 on Pro and Team Standard.
```

## The picks

Replace the whole of `docs/model-picks.md` with this, verbatim:

````markdown
# Model picks

Which models this project hands each tier to. The tiers are defined in
`.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.
Each model sits in the tier its fitness supports. Inside a tier, models are listed
least usage per task first, and `/dispatch` names the first one your subscriptions
include; the second table gives each pick's usage and the subscriptions that include it.

**Last verified: 2026-11-02.**

Placement was re-done on 2026-11-04 under FW-069: each pick is judged at the lowest
effort a supported tool starts it at, given in the third table, on CursorBench 4.0,
Artificial Analysis Intelligence Index v5.0.1 and Terminal-Bench 4.0 as read that day,
and under FW-067's bar for Large. The subscriptions, the command-line names, Arena WebDev
and the departures were not read again and stand as of 2026-11-02. Every High-effort
CursorBench 4.0 figure in the second table matched Cursor's page on 2026-11-04.

| Tier | Models |
|---|---|
| **Large** | Claude Opus 5.5 *(all)* |
| **Medium–large** | Gemini 4 Argon *(Cursor)*; Claude Fable 5.1 *(all)*; or any pick from a higher tier |
| **Medium** | DeepSeek V4.1 Flash 1017 *(Cursor)*; Muse Wonder *(Cursor)*; Grok 4.7 *(Cursor)*; or any pick from a higher tier |
| **Small–medium** | Claude Haiku 5.5 *(all)*; Claude Sonnet 5.5 *(all)*; GPT-5.6 Sol *(Cursor)*; Gemini 3.8 Flash *(Cursor)*; or any pick from a higher tier |
| **Small** | GPT-5.6 Luna *(Cursor)*; Composer 2.5 *(Cursor)*; GPT-5.6 Terra *(Cursor)*; or any pick from a higher tier |

| Model | Usage per task | Included on | Command-line name |
|---|---|---|---|
| Claude Opus 5.5 | $3.97 per task (CursorBench 4.0, High effort; 53,078 tokens per task) | Claude Code: Pro, Max, Ultra, Team Standard, Team Premium; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-opus-5-5; Cursor: claude-opus-5-5-high |
| Gemini 4 Argon | $4.57 per task (CursorBench 4.0, High effort; 109,500 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gemini-4-argon-high |
| Claude Fable 5.1 | $9.08 per task (CursorBench 4.0, High effort; 58,438 tokens per task) | Claude Code: Max (up to 50% of the weekly limit), Ultra (up to 50% of the weekly limit), Team Premium (up to 50% of the weekly limit); Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-fable-5-1; Cursor: claude-fable-5-1-high |
| DeepSeek V4.1 Flash 1017 | $0.77 per task (CursorBench 4.0, High effort; 385,196 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: deepseek-v41-flash-1017-high |
| Muse Wonder | $3.51 per task (CursorBench 4.0, High effort; 33,612 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: muse-wonder-1.0-high |
| Grok 4.7 | $4.69 per task (CursorBench 4.0, High effort; 56,382 tokens per task) | Claude Code: none; Cursor: Free, Plus, Premium, Super, Ultra, Teams, Enterprise, Hobby, Start, Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: grok-4.7-high |
| Claude Haiku 5.5 | $0.32 per task (CursorBench 4.0, High effort; 77,057 tokens per task) | Claude Code: Pro, Max, Ultra, Team Standard, Team Premium; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-haiku-5-5; Cursor: claude-haiku-5-5-thinking-high |
| Claude Sonnet 5.5 | $1.20 per task (CursorBench 4.0, High effort; 37,391 tokens per task) | Claude Code: Pro, Max, Ultra, Team Standard, Team Premium; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-sonnet-5-5; Cursor: claude-sonnet-5-5-high |
| GPT-5.6 Sol | $2.85 per task (CursorBench 4.0, High effort; 16,174 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gpt-5.6-sol-high |
| Gemini 3.8 Flash | $4.70 per task (CursorBench 4.0, High effort; 162,565 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gemini-3.8-flash-high |
| GPT-5.6 Luna | $0.25 per task (CursorBench 4.0, High effort; 23,368 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gpt-5.6-luna-high |
| Composer 2.5 | $0.68 per task (CursorBench 4.0, its only setting; 17,347 tokens per task) | Claude Code: none; Cursor: Free, Plus, Premium, Super, Ultra, Teams, Enterprise, Hobby, Start, Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: composer-2.5 |
| GPT-5.6 Terra | $1.11 per task (CursorBench 4.0, High effort; 13,162 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gpt-5.6-terra-high |

| Model | Judged at | Starts at | Sources |
|---|---|---|---|
| Claude Opus 5.5 | medium | Claude Code: medium; Cursor: high, by its command-line name (Cursor states no default) | code.claude.com/docs/en/model-config; cursor.com/docs/models/claude-opus-5-5 |
| Gemini 4 Argon | medium | Claude Code: none; Cursor: medium | cursor.com/docs/models/gemini-4-argon |
| Claude Fable 5.1 | high | Claude Code: high; Cursor: high, by its command-line name (Cursor states no default) | code.claude.com/docs/en/model-config; cursor.com/docs/models/claude-fable-5-1 |
| DeepSeek V4.1 Flash 1017 | high | Claude Code: none; Cursor: high, by its command-line name (Cursor states no default) | `cursor-agent --list-models` (version 2026.10.22); Cursor's documentation has no page for it |
| Muse Wonder | high | Claude Code: none; Cursor: high | cursor.com/docs/models/muse-wonder |
| Grok 4.7 | medium | Claude Code: none; Cursor: high, and medium, fixed, on Plus | cursor.com/docs/models/grok-4-7; cursor.com/docs/models-and-pricing |
| Claude Haiku 5.5 | medium | Claude Code: medium; Cursor: high, by its command-line name (Cursor states no default) | code.claude.com/docs/en/model-config; cursor.com/docs/models/claude-haiku-5-5 |
| Claude Sonnet 5.5 | medium | Claude Code: medium; Cursor: high | code.claude.com/docs/en/model-config; cursor.com/docs/models/claude-sonnet-5-5 |
| GPT-5.6 Sol | high | Claude Code: none; Cursor: high, by its command-line name (Cursor states no default) | cursor.com/docs/models/gpt-5-6-sol |
| Gemini 3.8 Flash | high | Claude Code: none; Cursor: high | cursor.com/docs/models/gemini-3-8-flash |
| GPT-5.6 Luna | high | Claude Code: none; Cursor: high, by its command-line name (Cursor states no default) | cursor.com/docs/models/gpt-5-6-luna |
| Composer 2.5 | no effort setting | Claude Code: none; Cursor: no effort setting | cursor.com/docs/models/cursor-composer-2-5 |
| GPT-5.6 Terra | high | Claude Code: none; Cursor: high, by its command-line name (Cursor states no default) | cursor.com/docs/models/gpt-5-6-terra |

## Reading the tables

- *(all)* means both supported tools, Claude Code and Cursor, offer the model. Claude
  Code offers only Anthropic models; Cursor offers those and the others tagged
  *(Cursor)*.
- **Judged at**, in the third table, is the lowest effort a supported tool starts the
  pick at (FW-069), and every figure that places a pick below is read at it. **Starts
  at** gives each tool's: Claude Code's documented default for the model, since
  `/dispatch` and `sprint.mjs launch` set no effort; Cursor's documented default, and
  any plan that fixes it; and where Cursor states no default, the effort its
  command-line name selects. Where a board has no row at the judged effort, the nearest
  row is given with its effort and the placement is marked **inferred**: a row above may
  overstate the model, and never lifts it into a higher tier or sets Large's highest
  score; a row below may understate it, and never keeps it out of one.
- **Usage per task** is CursorBench 4.0's average cost per task at **High** effort, the
  one setting every pick except Composer 2.5 has a row for. Cursor computes it by
  applying each model's published per-token API prices to the tokens it spent. It is
  the only board that covers every pick: Artificial Analysis's Intelligence Index
  (v5.0.1) has no score for the GPT-5.6 models or Composer 2.5. Composer 2.5 has one
  row, with no effort setting, and its figure is not strictly like-for-like with the
  others. Usage orders models inside a tier, at one effort for every model (FW-057),
  and never moved a model between tiers.
- **The Cursor command-line names are the High-effort variants**, to match the usage
  figure; `cursor-agent --list-models` lists the other efforts. The Claude Code names
  run each model at Claude Code's own default effort: medium on Opus 5.5, Sonnet 5.5 and
  Haiku 5.5, and high on Fable 5.1, per the model-config page.
- **Cursor's plan names overlap.** Cursor's current plans are Free, Plus, Premium,
  Super, Ultra, Teams and Enterprise; its legacy plans are Hobby, Start, Pro, Pro+,
  Ultra and Teams (Standard and Premium seats). Current and legacy Ultra and Teams share
  a name but not an allowance, so this file writes the legacy ones `legacy Ultra` and
  `legacy Teams`.
- **Third-party models in Cursor are included only on legacy plans.** On Pro, Pro+,
  legacy Ultra and legacy Teams, a monthly "Other Models" pool covers third-party models
  (Anthropic, Google, OpenAI, Meta, DeepSeek), drawn down at API price. On every current
  plan they are paid from prepaid credit from the first request, which counts as billed
  on top, and on Free and Plus they are not available at all. Start has no Other Models
  pool, and Cursor's page does not say whether Hobby has one; both are left out.
- **Cursor's own models (Grok 4.7, Composer 2.5)** are in the Cursor Models pool of
  every paid current plan and every legacy plan. Free has "limited" usage of them. On
  Plus they run "at fixed settings", effort medium, so the High-effort name does not
  apply there, and Grok 4.7 is judged at medium.
- **Claude Code:** Pro, Max, Ultra and both Team seat types include Opus, Sonnet and
  Haiku. Fable 5.1 is included only on Max, Ultra and Team Premium seats, up to half
  the weekly limit; on Pro and Team Standard it runs on usage credits. Enterprise is left
  out of every cell: the current Enterprise plan is billed per seat plus usage, and
  Fable on usage-based Enterprise is billed at API rates. Premium seats on legacy
  seat-based Enterprise plans include Fable like Team Premium; a developer on one should
  say so when the subscriptions record is written. Anthropic's pricing page lists Max at
  5x Pro and Ultra at 10x Pro and no longer names Max 5x or Max 20x.
- **In Claude Code, Medium and Medium–large have no pick of their own but Fable 5.1.**
  `/dispatch` falls through to the next tier up, so a Medium or Medium–large plan runs
  on Fable 5.1 where Max, Ultra or Team Premium includes it, the most expensive pick per
  task, and on Opus 5.5 on Pro and Team Standard.

## Why each pick sits where it does

Boards used for placement, each compared only with itself:

- **AA v5.0.1**: Artificial Analysis Intelligence Index v5.0.1, read 2026-11-04. Its
  leaderboard lists each Claude model once per effort setting, labelled as in "Claude
  Opus 5.5 (Medium, Default Fallback)", and other models at one or more settings. The
  pass of 2026-11-02 read v5.0, which is not compared with it.
- **CursorBench 4.0**: Cursor's benchmark, introduced 2026-09-10, with one row per model
  and effort, read 2026-11-04.
- **TB 4.0**: the Terminal-Bench 4.0 leaderboard on tbench.ai, read 2026-11-04. Each row
  runs in its model vendor's own agent (Claude Code, Codex, Grok Build, Muse Code) or
  mini-SWE-agent, so its harnesses differ: use it as an ordering hint only. Only Fable
  5.1 has rows at more than one effort.
- **Arena WebDev**: LMArena's WebDev board, 2026-10-27 snapshot, not read again: arena.ai
  refused this pass's request. Its rows name no effort, so it orders models and decides
  nothing.

- **Claude Opus 5.5** (judged at medium, Claude Code's default): CursorBench 4.0 52.5%
  (Medium), 0.3 below Gemini 4 Argon's 52.8%, the highest score at a judged effort; AA
  v5.0.1 48 (medium), the highest at a judged effort; TB 4.0 64.85% (max, Claude Code)
  only, which may overstate it; Arena WebDev 1810, first. **Alone in Large**: within 1
  point of the highest score on both boards that score it at its judged effort. At max
  it scores 57.8% and 59. Launched 2026-09-22.
- **Gemini 4 Argon** (judged at medium, Cursor's default): CursorBench 4.0 52.8%
  (Medium), the highest of any pick at its judged effort; AA v5.0.1 50 (high) only,
  which may overstate it; Arena WebDev 1679. No TB 4.0 entry. **Large unconfirmed**: AA
  scores it only above the medium Cursor starts it at, and a figure that may overstate
  does not confirm Large (FW-069). Released 2026-09-30.
- **Claude Fable 5.1** (judged at high, Claude Code's default; Cursor states none):
  CursorBench 4.0 49.2% (High), 3.6 below Argon; AA v5.0.1 47 (high); TB 4.0 54.55%
  (high, Claude Code), the highest TB 4.0 row at a judged effort; Arena WebDev 1746.
  Kept out of Large by CursorBench. The most expensive pick per task. Launched
  2026-09-01.
- **DeepSeek V4.1 Flash 1017** (judged at high, its command-line name's; Cursor states
  no default): CursorBench 4.0 45.6% (High), level with Muse Wonder's 46.1%; but AA
  v5.0.1 29 (high), below the Small–medium picks' 31. **Placement contested**: one board
  puts it with the Medium picks, one a tier lower. Arena WebDev 1665. Open weights
  (MIT). Released 2026-10-17. Hidden by default in Cursor.
- **Muse Wonder** (judged at high, Cursor's default): CursorBench 4.0 46.1% (High),
  level with DeepSeek V4.1 Flash and 3.1 below Fable 5.1; AA v5.0.1 44 (max) only, which
  may overstate it; Arena WebDev 1652. No TB 4.0 entry. **Moved down from
  Medium–large**: its one figure at its judged effort puts it with the Medium picks.
  Released 2026-10-12.
- **Grok 4.7** (judged at medium, which Cursor fixes on Plus; its default elsewhere is
  high): CursorBench 4.0 41.6% (Medium), 2.0 above Gemini 3.8 Flash and 2.4 above Sonnet
  5.5; AA v5.0.1 has no medium row: 35 (high), which may overstate it, and 31 (low),
  which may understate it; TB 4.0 37.58% (xhigh, Grok Build), which may overstate it;
  Arena WebDev 1637. **Inferred** on AA. Released 2026-09-21.
- **Claude Haiku 5.5** (judged at medium, Claude Code's default; Cursor states none):
  CursorBench 4.0 36.9% (Medium); AA v5.0.1 25 (medium); Arena WebDev 1589. No TB 4.0
  entry. At max it scores 48.4% and 36. Released 2026-10-07.
- **Claude Sonnet 5.5** (judged at medium, Claude Code's default; Cursor's is high):
  CursorBench 4.0 39.2% (Medium), level with Gemini 3.8 Flash's 39.6%; AA v5.0.1 31
  (medium), level with Gemini 3.8 Flash; TB 4.0 61.82% (max, Claude Code) only, which may
  overstate it; Arena WebDev 1770. **Moved down from Medium–large**: at max it scores
  55.5% and 54, second only to Opus 5.5, and at the high Cursor starts it at, 47.8%;
  Claude Code starts it at medium, and a pick is judged at the lowest effort a tool
  starts it at. Launched 2026-09-28.
- **GPT-5.6 Sol** (judged at high, its command-line name's; Cursor states no default):
  CursorBench 4.0 35.7% (High), level with Haiku 5.5's 36.9%; TB 4.0 37.27% (max, Codex)
  only, which may overstate it; Arena WebDev 1616. No AA v5.0.1 score (see
  *Departures*). **Moved down from Medium**: at max it scores 41.7%. Launched
  2026-07-09.
- **Gemini 3.8 Flash** (judged at high, Cursor's default): CursorBench 4.0 39.6% (High);
  AA v5.0.1 31 (high); TB 4.0 19.09% (high, mini-SWE-agent); Arena WebDev 1583
  (preliminary). Released 2026-09-02.
- **GPT-5.6 Luna** (judged at high, its command-line name's; Cursor states no default):
  CursorBench 4.0 29.4% (High); TB 4.0 17.27% (max) only, which may overstate it; Arena
  WebDev 1519. No AA v5.0.1 score. Launched 2026-07-09.
- **Composer 2.5** (no effort setting): CursorBench 4.0 27.7%, its one row, the lowest of
  any pick. On no other board found. **Unconfirmed**, and the figure is Cursor's own for
  its own model. Released 2026-05-18, the oldest pick here.
- **GPT-5.6 Terra** (judged at high, its command-line name's; Cursor states no default):
  CursorBench 4.0 30.7% (High), level with GPT-5.6 Luna's 29.4%; TB 4.0 21.52% (max)
  only, which may overstate it; Arena WebDev 1520. No AA v5.0.1 score. **Moved down
  from Small–medium**: at max it scores 41.3%. Launched 2026-07-09.

## How much to trust the scores

- **CursorBench 4.0 is Cursor's own benchmark**, and Cursor sells every model on it.
  Composer 2.5 is Cursor's own model, and Grok 4.7 is sold as one of "Cursor's models"
  in its own pool; their CursorBench figures are a tool's scores for models it offers as
  its own. The cost-per-task figures are arithmetic on published prices, not a claim
  about quality, and are used here only for ordering. Cursor's page says small
  differences in scores may not be statistically meaningful.
- **Terminal-Bench 4.0 rows are run in each vendor's own agent**: Anthropic's Claude
  Code for Claude models, OpenAI's Codex, xAI's Grok Build. They are not one harness.
  No TB 4.0 row exists for Gemini 4 Argon, Muse Wonder, Haiku 5.5, DeepSeek V4.1 Flash
  or Composer 2.5.
- **Artificial Analysis now publishes Intelligence Index v5.0.1.** Every AA figure here
  was read from it on 2026-11-04; Opus 5.5 at max reads 59 there, against 58 on v5.0.
  The two versions are not compared.
- **SWE-bench Pro is not used.** Scale's public board had no model newer than the
  previous generation on 2026-11-02; the newest figures circulating are vendor-published.
- **Corroboration**: every placing figure above comes from the board's own page, read
  2026-11-04; this pass did not check each AA figure again on the model's own AA page.
  CursorBench 4.0's Haiku 5.5 and Sonnet 5.5 figures at low and max effort also appear
  on those models' pages in Cursor's documentation; both are Cursor's.
- **Not found:** a current LiveCodeBench board.

## Departures

- **GPT-5.6 Terra and GPT-5.6 Luna** are now marked deprecated on Artificial Analysis,
  with "no publicly available API", in favour of GPT-6.1 Terra and GPT-6 Luna. GPT-5.6
  Sol was already marked so, in favour of GPT-6 Sol. All three are still selectable in
  Cursor, and no successor is.
- **Anthropic**: Sonnet 4.5 is deprecated and retires on 2026-11-30. No new retirement
  since the last pass.
- **Superseded, not picked**: Opus 5, Opus 4.x, Sonnet 5, Fable 5, Grok 4.6, Grok 4.5,
  Gemini 3.7 Flash and older are still selectable but score lower than their
  successors on every board that has both. Muse Spark 1.3 scores below Muse Wonder on
  CursorBench 4.0 at every effort.

## Outside the supported tools

GPT-6 Astra, GPT-6 Sol, GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Luna, Muse Wonder Full and
Gemini 4 Carbon appear on the boards above, several near the top, but are selectable in
neither Claude Code nor Cursor, so they cannot be picks.

## Not placed

- **Kimi K3** (hidden by default in Cursor): no score under that name on any board
  found; Artificial Analysis lists only Kimi K3.1 Pro, which Cursor does not offer.
- **GLM 5.3** is on Cursor's models page but not in `cursor-agent --list-models`
  (version 2026.10.22), which lists only GLM 5.2, so it has no command-line name.
  CursorBench 4.0 42.6% (Max); AA v5.0.1 32 (max).

### Sources used this pass

Read on 2026-11-04, for the efforts and the placement:

- https://code.claude.com/docs/en/model-config
- https://cursor.com/docs/models/claude-opus-5-5
- https://cursor.com/docs/models/claude-sonnet-5-5
- https://cursor.com/docs/models/claude-haiku-5-5
- https://cursor.com/docs/models/claude-fable-5-1
- https://cursor.com/docs/models/gemini-4-argon
- https://cursor.com/docs/models/gemini-3-8-flash
- https://cursor.com/docs/models/muse-wonder
- https://cursor.com/docs/models/gpt-5-6-sol
- https://cursor.com/docs/models/gpt-5-6-terra
- https://cursor.com/docs/models/gpt-5-6-luna
- https://cursor.com/docs/models/grok-4-7
- https://cursor.com/docs/models/cursor-composer-2-5
- https://cursor.com/docs/models-and-pricing
- https://cursor.com/cursorbench
- https://artificialanalysis.ai/leaderboards/models
- https://www.tbench.ai/leaderboard/terminal-bench/4.0

Read on 2026-11-02, for what was not read again (the subscriptions, the command-line
names, Arena WebDev, SWE-bench Pro and the departures):

- https://cursor.com/docs/models
- `cursor-agent --list-models` (version 2026.10.22)
- https://cursor.com/docs/account/pricing
- https://cursor.com/docs/account/pricing/legacy-cursor-plans
- https://claude.com/pricing
- https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/about-claude/model-deprecations
- https://artificialanalysis.ai/models/gpt-5-6-sol
- https://artificialanalysis.ai/models/gpt-5-6-terra
- https://artificialanalysis.ai/models/gpt-5-6-luna
- https://arena.ai/leaderboard/webdev
- https://labs.scale.com/leaderboard/swe_bench_pro_public
````

## The test

In `guards/dispatch.test.js`, in the case `tells /refresh-model-tiers to admit to Large
only models within 1 point of the best pick`, replace the line

```js
    expect(command).toContain('**Read each model at its best score on the board**');
```

with

```js
    expect(command).toContain('**Read each model at the effort it is judged at**');
```

and directly after that case add, verbatim:

```js
  it('tells /refresh-model-tiers to judge each pick at the effort a tool starts it at', () => {
    const command = readFileSync(join(blueprint, 'commands/refresh-model-tiers.md'), 'utf8')
      .replace(/\s+/g, ' ');
    expect(command).toContain('**Judge every pick at the effort a supported tool starts it at, never at its best.**');
    expect(command).toContain('**A pick is judged at the lowest of those efforts.**');
    expect(command).toContain('in a table whose header row begins `| Model | Judged at |`');
    expect(command).toContain('marked `Cursor states no default`');
    expect(command).toContain('**A figure that may overstate never lifts a model into a higher tier and never sets the highest score Large is measured against; a figure that may understate never keeps a model out of one.**');
    expect(command).toContain('marked `Large unconfirmed`');
    expect(command).toContain('in FW-069');
  });
```

Both must fail before *The command* is applied and pass after.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it**, from the worktree:
  `NM=$PWD/.self-check/node_modules; S=$(mktemp -d); git archive HEAD | tar -x -C "$S"; echo '{"type":"module"}' > "$S/package.json"; cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"; ln -s "$NM" "$S/node_modules"; cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/dispatch.test.js`.
  `.self-check/` exists once `bash scripts/check-blueprint.sh` has run once.
- **`framework-integrity` checks backticked paths** under `docs/`, `scripts/` or
  `.claude/` in framework documents. The texts above name none; if the guard fails on
  something this plan added, stop and hand back with its output.
- **Writing `framework/DECISIONS.md` or `commands/` prints a hook's reminder** about
  capturing learnings and the fresh-agent check. The specifying session runs that check
  in review; note the reminder in the handover and carry on.
- **A colon followed by a space inside an unquoted backlog value breaks the YAML.** The
  comments Task 4 adds are comments, so they may hold one; nothing else in the backlog
  changes but `status` and `modules`.
- **The picks block is long.** Copy it whole, then compare: `diff` the file with the
  block extracted from this plan (Task 3 says how).
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `commands/refresh-model-tiers.md` | the effort section and Large's steps 1 and 2 (*The command*) |
| `framework/DECISIONS.md` | FW-069, and FW-067's status |
| `docs/model-picks.md` | re-placed at the judged efforts (*The picks*) |
| `guards/dispatch.test.js` | one line changed, one case added (*The test*) |
| `feature-catalog.yaml` | the item claimed (by the specifying session), then `shipped`, with comments mapping criteria to their cover (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-04-picks-are-judged-at-the-default-effort.md` | this plan, and its handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the decision record is in the plan;
`framework/model-tiers.md` defines the tiers and says nothing on effort, and does not
change; the operator guide and the README name no pick. No upstream queue: this
repository is the upstream. A release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The test, red

Apply *The test*. Commit. Run `guards/dispatch.test.js` alone (*Traps*). Expected: the
changed case and the new case fail. Paste the failing names.

### Task 2 — The command and the decision

Apply *The command* and *The decision record*. Commit. Run the guard alone: every case
passes. Paste the `Tests:` line.

### Task 3 — The picks

Apply *The picks*. Then check, and paste each output:

- `awk '/^## The picks$/{f=1;next} f&&/^````markdown$/{g=1;next} g&&/^````$/{exit} g' docs/superpowers/plans/2026-11-04-picks-are-judged-at-the-default-effort.md | diff - docs/model-picks.md`
  prints nothing.
- `node -e "import('./scripts/plan-binding.js').then(b=>{const t=require('fs').readFileSync('docs/model-picks.md','utf8');for(const x of ['Large','Medium–large','Medium','Small–medium','Small'])console.log(b.picksForTier(t,x));console.log(b.inclusionTable(t).size)})"`
  prints the five tier cells of the file's tier table, in order, and `13`.

Commit.

### Task 4 — The backlog and the board

1. In `feature-catalog.yaml`, on `picks-are-judged-at-the-default-effort`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them; set `modules` to
   `commands/refresh-model-tiers.md` and `docs/model-picks.md`. Directly above the
   item's `- id:` line, add
   `# Shipped by docs/superpowers/plans/2026-11-04-picks-are-judged-at-the-default-effort.md.`
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
3. `git push -u origin plan/picks-are-judged-at-the-default-effort`. **Do not open a
   pull request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.

## Handover report

### Task completion

- **Task 0, setup.** Done. `npm --prefix .tropis ci` completed with an npm audit notice
  and no failure. The worktree was clean. `git --version`: git 2.43.0; `node --version`:
  v22.23.4; `uname -sm`: Linux x86_64. The self-check passed before any change.
- **Task 1, the test, red.** Done, commit `cbc829f`. The dispatch guard, run alone,
  failed the two expected cases: `dispatch command › tells /refresh-model-tiers to admit
  to Large only models within 1 point of the best pick` and `dispatch command › tells
  /refresh-model-tiers to judge each pick at the effort a tool starts it at`.
- **Task 2, the command and the decision.** Done, commit `a4a782c`. The guard, run alone,
  passes: `Tests: 42 passed, 42 total`.
- **Task 3, the picks.** Done, commit `8d5c84c`. The picks file is the plan block copied
  with the plan's own awk command; the diff against it is empty. The tier table gives
  the five cells in order (Large: Claude Opus 5.5 *(all)*; Medium–large: Gemini 4 Argon
  and Fable 5.1; Medium: DeepSeek V4.1 Flash 1017, Muse Wonder and Grok 4.7; Small–medium:
  Haiku 5.5, Sonnet 5.5, GPT-5.6 Sol and Gemini 3.8 Flash; Small: GPT-5.6 Luna, Composer
  2.5 and GPT-5.6 Terra). The inclusion table has 13 rows.
- **Task 4, the backlog.** Done, commit `93b8800`. Status set to `shipped`, modules set,
  the Shipped comment placed above the item's id line, and the item's 12 lines removed
  from `docs/backlog-board/bands.yaml`. `docs/backlog-board/index.html` was not changed.
- **Task 5, verification and handover.** Steps 1 and 2 done (this section, and its
  commit). Step 3, the push, follows this report.

### Verification results

Tool and platform for every result: git 2.43.0, Node v22.23.4, Linux x86_64.

- `npm --prefix .tropis test`, after Task 4: `Test Suites: 13 passed, 13 total` and
  `Tests: 180 passed, 180 total`.
- `bash scripts/check-blueprint.sh` on HEAD `93b8800` (the commit before this report):
  the last line of the run is `Self-check passed: every guard caught its defect, the
  clean baseline passed, and the framework repository's own guards passed.` It exited 0.
  It was run twice on that HEAD; the second run finished in the background and its
  output has the same last line.
- The scope check, `git diff --stat origin/main...HEAD` before this report: six files,
  each in *File Structure*: `commands/refresh-model-tiers.md`, `docs/backlog-board/bands.yaml`,
  `docs/model-picks.md`, `feature-catalog.yaml`, `framework/DECISIONS.md`,
  `guards/dispatch.test.js`. Totals: 262 insertions, 120 deletions.
- The fresh-agent check was not run in any commit (see *Judgment calls*).

### Scope

Only the six files above, plus this report in the plan file. `docs/backlog-board/index.html`
was not touched. No file under `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or
`AGENTS.md` changed. No dependency added, and no guard or test removed or lowered: the
one changed guard line is the plan's replacement, and one case was added.

### Judgment calls

- **Criterion-to-cover comments in the catalog.** *File Structure* says the catalog
  change carries comments mapping each acceptance criterion to its cover; Task 4 step 1
  does not list them. I added them as comments inside the item's `acceptanceCriteria`
  block, above `type:`. The criteria text is unchanged.
- **Commit bodies.** Each commit body names the plan and the backlog item and, for the
  command commit, says the fresh-agent check was not run in that commit, as the plan
  directs.
- **Scratch files.** The awk extraction for Task 3 wrote to a `mktemp` directory under
  `/tmp`, not the session scratchpad. The file is outside the repository and was not
  committed.
- **Hook reminders.** Writing `framework/DECISIONS.md` and `commands/` triggered the hook's
  reminder about capturing learnings and the fresh-agent check. Per *Traps*, it is noted
  here and left for the specifying session's review.

### What the plan got wrong

- *File Structure* asks for criterion-to-cover comments in the catalog; Task 4 step 1 does
  not. The plan is internally inconsistent on this point; the comments were added (above).
- The Task 1 guard run was first attempted before the test edit applied (the first
  `Edit` was refused because the file had not been read in this session). The guard run
  in that attempt covered the unedited file, so its `41 passed` result was discarded; the
  red run was taken after the edit was committed.
- A no-op `Edit` was sent by mistake during Task 4; it changed nothing.

### Outstanding

- **No screen, so no developer check.** The change has no user-visible surface; the
  review record should say so and skip the manual check (per the workflow's handover rules).
- **Fresh-agent check.** Not run. `commands/refresh-model-tiers.md` changes what an agent
  is told to do, so the specifying session runs the check in review, as the plan says.
- **Not re-read this pass:** the Cursor subscriptions, the command-line names, Arena
  WebDev and the departures, as the plan's Global Constraints and the picks file record.
- **Release note.** A release-note line is the developer's, at `/release`.
- **Pull request.** Not opened, reviewed or merged; the specifying session does those.

## Review record

Written after the merge, in its own pull request: the plan merged as `3d70dfe` without
this section, and `review-record` turned the main branch red. The review below was done
before that merge; only its record came late.

### Checks re-run

- `bash scripts/check-blueprint.sh` on the branch's last commit, after each rebase:
  `Self-check passed`. `npm --prefix .tropis test`: 180 passed, 180 total. node v22.23.4,
  git 2.43.0, Linux x86_64.
- `git diff --stat origin/main...HEAD`: the seven files in *File Structure* and this plan;
  `docs/backlog-board/index.html` untouched.
- **Fresh-agent check**, on the Large tier's pick, Claude Opus 5.5 (`claude-opus-5-5`,
  named by `dispatch.mjs --tier Large`). Run as `claude -p --model claude-opus-5-5
  --output-format stream-json --verbose`, Claude Code 2.1.318, Linux x86_64, in a cloud
  session where no personal instructions load, in the plan's worktree. The task, said to
  be a probe whose output is discarded: place two invented models, Zephyr 2 (Claude Code
  default low, Cursor default high, AA only at max) and Quill 1 (Cursor only, no stated
  default, High command-line name), with `commands/refresh-model-tiers.md`. Its tool
  calls show it reading the command, `docs/model-picks.md` and `framework/model-tiers.md`.
  Expected before the run: Zephyr 2 judged at low, read at CursorBench's Low row, its AA
  max figure inferred and kept from setting AA's highest, out of Large; Quill 1 judged at
  high from its command-line name, in Large. **It answered exactly that**, quoting the
  clauses for each step.

### Found

Public exposure: the diff was read for private material; nothing found.

- Large's step 1 wrapped mid-sentence after the plan's edit: re-flowed in review.
- The criterion comments the executor added named prose rather than the guard case and
  checks: rewritten in review, in the form the previous picks item used.
- The probe found that step 2's `Large unconfirmed` mark could be read onto a model that
  another board, at its judged effort, already keeps out of Large: one sentence added in
  review saying it is not marked then.
- The reviewing session merged without writing this record; the guard caught it on the
  main branch.

### Outstanding disposition

- No developer check: the change has no screen.
- The release-note line is the developer's at `/release`.
- The subscriptions, Cursor command-line names, Arena WebDev and departures were not read
  again; the next full `/refresh-model-tiers` pass reads them, which is its ordinary work.
- Claude Code now falls through to Fable 5.1 for Medium and Medium–large plans on Max,
  Ultra and Team Premium; the backlog item `tier-falls-through-to-the-cheapest-included-pick`,
  added by the developer the same day, covers it.

### Learnings routed

The lesson is the change itself, in the command and in FW-069. The late record is not a
new lesson: the workflow already requires the record before the squash-merge, and the
guard that caught it is the mechanism; no durable change.

### Merged because

The command, the decision and the re-placed picks say what the developer asked for, the
new case goes red without the command change, every medium-effort figure the placement
moves on was read from Cursor's own page, and a fresh agent with only the repository
applied the rule correctly to invented models built to exercise it.
