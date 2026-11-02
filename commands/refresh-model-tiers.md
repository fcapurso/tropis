---
description: Refresh the model tier roster from independent sources
---

Write this project's model picks to `docs/model-picks.md`, creating it if it does not
exist. The tier definitions are in `.claude/framework/model-tiers.md`: read them, and do
not edit that file — it is the framework's, and an update replaces it.

**Do not answer from training data.** This topic moves faster than any cutoff — models
launch, get deprecated, and move between benchmark versions monthly. Every figure must
come from a search performed now.

## What to keep fixed

**The tier definitions do not change.** They are anchored on the kind of work a plan
demands, not on the current roster. You are moving models between existing tiers — not
redesigning the scale. If you believe a definition is genuinely wrong, say so and stop
rather than editing it.

## Which models count

**Only models an executor can select in a tool this framework supports.** Read each
supported tool's own list of selectable models **first**, from the source, every pass —
do not carry it over from the previous version of the picks. A model in none of those
lists does not go in the pick table, however well it scores; it may appear in one short
note saying what is outside the supported tools and why that matters. Tag every model
in the pick table with the tools that offer it, or *(all)* for one every supported tool
offers. `/dispatch` prints that cell as the picks line, so the tag tells the operator
where each pick can run.

**When the framework supports another tool, add its model list to this step**, re-tag
every pick by the tools that actually offer it, and reword every sentence in the picks
that names or counts the supported tools.

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

## What to gather

For the models that count, search independent aggregators and benchmark leaderboards,
and the benchmarks the supported tools publish themselves — not a model vendor's
marketing:

- Artificial Analysis (intelligence and coding indices)
- SWE-bench Pro and LiveCodeBench leaderboards
- Terminal-Bench, and any agentic-coding benchmark with published methodology
- LMArena
- The supported tools' own benchmarks, such as Cursor's CursorBench. A tool that offers
  many vendors' models is not any one model's vendor, and its board is often the only
  one that scores every model it offers.

**Take every figure from its primary source** — the benchmark's own page or the
evaluator's own article — not from a write-up quoting it. Where the two disagree, the
primary source wins; a figure found only second-hand is marked so.

For each model: at least one coding benchmark score, and the launch or last-update date.

## What to record

- **Compare only like with like.** Two scores may be compared only when they share the
  benchmark *and its version*, the harness, the effort setting, and a period in which the
  benchmark did not change. Record all four next to every figure a placement relies on.
  An evaluator's index changes its parts over time: a score from before a change is not
  comparable with one from after it, however alike the names.
- **Place by shared boards.** A model's tier rests on comparisons with models already
  placed, on a board both appear on. When two models share no score measured the same
  way, do not rank one above the other from different boards or versions: place the
  model on the strongest independent evidence, and mark the placement unconfirmed
  against its neighbours. A model with no score comparable to any other model's is still
  placed — never left out of the table — in the tier its strongest independent figure
  suggests, marked unconfirmed so the dispatcher knows the tier is a judgment, not a
  comparison.

  > The first pass in the framework's own repository ranked Grok 4.7 below Composer 2.5
  > on two Coding Agent Index scores taken four months apart, across a change to that
  > index. Cursor's own CursorBench 4.0, the one board scoring both, put Grok at 46.3%
  > and Composer at 27.7%.
- **Usage per task, in the second table.** Each figure names its board, the board's
  version, and the effort setting, and is compared only with figures from the same board
  at the same effort. Where the board also reports tokens per task, give them beside the
  cost. Vendors split text into tokens differently, so set token counts side by side only
  from the same board.
- **Corroboration.** Prefer a figure appearing in two or more independent sources. If a
  model appears in only one, either omit it or mark it explicitly as uncorroborated —
  aggregator sites vary in reliability and some list models that do not exist.
- **Contamination and self-publication.** Note any benchmark known to be compromised, and
  any score published by the model's own vendor — including a tool's score for a model
  it makes itself. Both change how much weight a reader should give them.
- **Departures.** Models deprecated or withdrawn since the last pass.

## The file

`/dispatch` reads three things from `docs/model-picks.md`, and all must keep this shape:

- one line `**Last verified: YYYY-MM-DD.**` — the date of this pass. `/dispatch` warns when
  it is more than ~45 days old;
- one table whose header row begins `| Tier | Models |`, with one row per tier, the tier
  named in bold exactly as the definitions name it. `/dispatch` prints the second cell of
  the plan's tier as its picks.
- one table whose header row begins `| Model | Usage per task | Included on |`, with one
  row per model in the tier table: its name as the tier table writes it, without the
  tool tag; its cost per task, or `unmeasured`; and, for each supported tool, the
  subscriptions that include it, written `<tool>: <subscription>, <subscription>`, tools
  separated by `; `, and `<tool>: none` where none does.

Start a new file like this, then add the notes and sources below the table:

```
# Model picks

Which models this project hands each tier to. The tiers are defined in
`.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.
Each model sits in the tier its fitness supports. Inside a tier, models are listed
least usage per task first, and `/dispatch` names the first one your subscriptions
include; the second table gives each pick's usage and the subscriptions that include it.

**Last verified: YYYY-MM-DD.**

| Tier | Models |
|---|---|
| **Large** | … |
| **Medium–large** | …; or any pick from a higher tier |
| **Medium** | …; or any pick from a higher tier |
| **Small–medium** | …; or any pick from a higher tier |
| **Small** | …; or any pick from a higher tier |

| Model | Usage per task | Included on |
|---|---|---|
| … | $… per task (board, version, effort) | Claude Code: …; Cursor: … |
```

Everything else in the file — caveats, benchmark figures, positioning notes — is for
people, and `/dispatch` ignores it.

## Finishing

1. Update the `Last verified` date.
2. Write the subscriptions record (*Which subscriptions the developer has*); it is not
   part of the commit.
3. Replace the source list with the URLs actually used this time, under
   `### Sources used this pass`.
4. Summarise what changed since the previous verification — new entries, tier moves,
   departures — in the commit body, not in the file. The file states the current
   position; git holds the history. Name no subscription anyone holds.
5. Commit as `docs(workflow): refresh the model picks`.
