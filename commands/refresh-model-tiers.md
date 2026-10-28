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

**Picks place models on fitness for the tier's work, and on nothing else.** Price, and
how fast a model uses up a plan's limits, are left to whoever dispatches: neither is
published in a form that can be compared across the supported tools. Do not record
prices or price changes. Token usage is recorded beside the picks, as *What to record*
says, but no model moves between tiers because of it or of price.

**Each model sits in the highest tier its evidence supports, and fits every tier below
it.** A lower tier's row names only the models that reach no higher, and ends with
`or any pick from a higher tier`; a lower tier with no model of its own reads
`Any pick from a higher tier`.

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
- **Token usage, beside the picks, not in them.** Where a shared board reports tokens per
  task — Cursor's CursorBench does, for every model it runs — record that figure beside
  the models it covers, with the board's version, harness and effort, so whoever
  dispatches can weigh cost. Vendors split text into tokens differently, so set token
  counts side by side only from the same board. No placement rests on them.
- **Corroboration.** Prefer a figure appearing in two or more independent sources. If a
  model appears in only one, either omit it or mark it explicitly as uncorroborated —
  aggregator sites vary in reliability and some list models that do not exist.
- **Contamination and self-publication.** Note any benchmark known to be compromised, and
  any score published by the model's own vendor — including a tool's score for a model
  it makes itself. Both change how much weight a reader should give them.
- **Departures.** Models deprecated or withdrawn since the last pass.

## The file

`/dispatch` reads two things from `docs/model-picks.md`, and both must keep this shape:

- one line `**Last verified: YYYY-MM-DD.**` — the date of this pass. `/dispatch` warns when
  it is more than ~45 days old;
- one table whose header row begins `| Tier | Models |`, with one row per tier, the tier
  named in bold exactly as the definitions name it. `/dispatch` prints the second cell of
  the plan's tier as its picks.

Start a new file like this, then add the notes and sources below the table:

```
# Model picks

Which models this project hands each tier to. The tiers are defined in
`.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.
Picks are placed on fitness for the tier's work alone; cost is left to whoever
dispatches. Token usage, where a shared board reports it, is in the notes below.

**Last verified: YYYY-MM-DD.**

| Tier | Models |
|---|---|
| **Large** | … |
| **Medium–large** | …; or any pick from a higher tier |
| **Medium** | …; or any pick from a higher tier |
| **Small–medium** | …; or any pick from a higher tier |
| **Small** | …; or any pick from a higher tier |
```

Everything else in the file — caveats, benchmark figures, positioning notes — is for
people, and `/dispatch` ignores it.

## Finishing

1. Update the `Last verified` date.
2. Replace the source list with the URLs actually used this time, under
   `### Sources used this pass`.
3. Summarise what changed since the previous verification — new entries, tier moves,
   departures — in the commit body, not in the file. The file states the current
   position; git holds the history.
4. Commit as `docs(workflow): refresh the model picks`.
