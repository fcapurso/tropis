# What evidence should admit a model to the Large tier — finding, 2026-11-03

**Backlog item:** `large-tier-admits-on-judgment-evidence` (a spike). **Status:** answered;
the recommendation is put to the developer as the backlog item
`large-tier-anchors-on-the-best-pick`.

## Summary

No evidence available to this framework tells a Large model from a Medium–large one on
the work Large is defined by: open-ended judgment with nothing mechanical to check it.
The public boards the picks file uses all score tasks a script grades. The boards that
come closest to judgment were out of reach of this session's network, and the
second-hand figures for them also put Claude Sonnet 5.5 below Claude Opus 5.5, with a
Medium–large pick between them. A pilot of our own, a review task with four seeded judgment defects run eight
times, did not separate the tiers at all: Claude Haiku 5.5, a Small–medium pick, found
all four defects in both of its runs, as Sonnet and Opus did in all of theirs.

So the bar for Large cannot be found by measurement. It has to be stated as policy, and
the policy the picks file follows now has no bar at all. A model reaches Large by being
level with a model already in Large, so each admission can lower the bar for the next:
Gemini 4 Argon moved up on 2026-11-02 for being level with Claude Fable 5.1, which is
below Opus 5.5 and Sonnet 5.5 on every board.

**Recommendation:** anchor Large on the best pick. A model is in Large only when no
shared board places it below the highest-scoring selectable model by more than that
board's own stated uncertainty, or by more than a stated margin where the board states
none. Today that would leave Large to Claude Opus 5.5 alone, and put Sonnet 5.5, Gemini 4
Argon and Fable 5.1 in Medium–large. The cost is that every Large plan, team member and
fresh reviewer draws on Opus 5.5, about three times Sonnet 5.5's usage per task on
CursorBench 4.0 at High ($3.97 against $1.20).
That cost is the point of the tier: Large is the tier where no check catches a worse
model's mistake.

## The question

`docs/model-picks.md`, last verified 2026-11-02, lists Large least usage first: Claude
Sonnet 5.5, Claude Opus 5.5, Gemini 4 Argon, Claude Fable 5.1. FW-057 has `/dispatch`
name the first pick that a recorded subscription includes, so with Claude Code: Max
recorded, `dispatch.mjs --tier Large` names Sonnet 5.5. That model then runs every Large
plan, every sprint team member and every fresh-agent probe
(`.claude/framework/model-tiers.md`, *Agents that run no plan*).

Ordering by usage is right only if every model in a tier is fit for its work.
`commands/refresh-model-tiers.md` says a model "sits in the highest tier its evidence
supports", and states no threshold. Large is defined as judgment no check catches, and
the evidence used for placement is a set of boards that each score checked tasks. The
spike asks two things. Which evidence, if any, tells a Large model from a Medium–large
one? And what should the stated bar be, where no public board measures judgment?

## What was looked at

All of it on 2026-11-03, from a Claude Code 2.1.317 cloud session on Linux x86_64.

### The boards the picks file already uses

From `docs/model-picks.md`, each from its board's own page on 2026-11-02:

| Board | Opus 5.5 | Sonnet 5.5 | Gemini 4 Argon | Fable 5.1 | Muse Wonder (Medium–large) |
|---|---|---|---|---|---|
| AA Intelligence Index v5.0 | 58 (max) | 54 (max) | 50 (high) | 50 (xhigh) | 43 (max) |
| CursorBench 4.0 | 57.8% (Max) | 55.5% (Max) | 52.9% (High) | 51.8% (Max) | 50.4% (Max) |
| Terminal-Bench 4.0 | 64.85% | 61.82% | none | 57.88% | none |
| LMArena WebDev | 1810 | 1770 | 1679 | 1746 | 1652 |

Every one of them grades its tasks mechanically: test suites, exact answers, terminal
end states. The one with human judges, LMArena WebDev, asks people which of two web
pages they prefer, which is taste in a finished artefact, not the judgment Large names
(what is portable, what an entry file should hold, what a deletion loses). None reports
an uncertainty in the picks file's figures.

What they do agree on: **Opus 5.5 is first on every board, and Sonnet 5.5 second on
every board.** The gap from Opus to Sonnet is 4 points on AA, 2.3 on CursorBench, 3.0 on
Terminal-Bench and 40 on Arena WebDev. The gap from Sonnet to Fable 5.1, also in Large,
is 4, 3.7, 3.9 and 24. On these boards Sonnet is at least as far below Opus as Fable is
below Sonnet.

### Boards that come closer to judgment

- **GDPval-AA** (Artificial Analysis's run of OpenAI's GDPval: deliverables for real
  occupational tasks, compared in pairs, scored as Elo). It was part of the Intelligence
  Index up to v4.3.2 and was removed from it in v5.0; Artificial Analysis still lists it
  as a separate evaluation. Its own page, `artificialanalysis.ai/evaluations/gdpval-aa`,
  did not resolve from this session (DNS, `ENOTFOUND`). The figures found are
  second-hand only: one aggregator gives Opus 5.5 first at 1846 Elo, and lists Sonnet
  5.5 third with no score shown; another, normalising the scores, gives Opus 5.5 68.3%,
  Muse Wonder 67.9% and Sonnet 5.5 66.9%, and says the top models sit within 1.4 points.
  **Unconfirmed.** If they hold, this board puts Sonnet 1.4 points below Opus, more than
  the one-point margin proposed below, and ranks Muse Wonder, a Medium–large pick, between
  them. How it grades (people, or a model as judge) was not confirmed
  either.
- **GDPx** (SemiAnalysis). Reported in the press on 2026-11-03 with Opus 5.5 first at
  12.0% of tasks, and no Sonnet 5.5 result found. Second-hand, new, and no Sonnet
  figure: no use here.
- **Code review benchmarks.** The Martian code review benchmark
  (`github.com/withmartian/code-review-benchmark`, read directly) scores review *tools*
  (CodeRabbit, Cursor Bugbot, Claude Code and others), not models, and grades with model
  judges against human-checked expected comments. Its leaderboard host did not resolve
  from this session. A search found no code review board that scores the Claude 5.5
  models as models.
- **LMArena Text**, whose hard-prompt categories are the closest human-preference
  signal, did not resolve from this session (`lmarena.ai`, `ENOTFOUND`).

**Constraint met:** this session's network reaches none of `artificialanalysis.ai`,
`lmarena.ai` or `codereview.withmartian.com`. A pass of `/refresh-model-tiers` that can
reach them should read GDPval-AA from its own page before anything rests on it.

### A pilot of our own: review with seeded judgment defects

If no public board measures judgment, a project could measure it itself. The cheapest
version is a review task whose defects are judgment calls with a known answer. The pilot
tests whether that version tells the tiers apart.

**The task** is `docs/superpowers/specs/2026-11-03-large-tier-judgment-probe.md`: a pull
request to Ferry, an invented deployment tool, changing its agent instructions. It is
invented so that no project's history gives the answer away. The runs were subagents in
this repository, though, and loaded its entry files and workflow, which state the
principles behind D2, D3 and D4. That is one more reason every run found them. It seeds four defects,
each of the kind Large's definition names, and one decoy:

- **D1, what a deletion loses.** The "history lesson" deleted from the deploy page is the
  only record of why retries must stay off.
- **D2, what is portable.** A marker rule naming one organisation (`acme`, "the payments
  team") is put into the template every adopter copies.
- **D3, a claim against the code.** The entry file now says the pre-push hook refuses a
  push to `main` and that agents need not check the branch; the hook shown only warns,
  and exits 0.
- **D4, what belongs in an entry file.** A deploy-only "internals" section is added to the
  entry file, which the task itself says holds only what every session needs.
- **Decoy.** A heading rename whose two links were updated. Nothing is wrong with it.

The answer key and the scoring rule were written down before any run: a defect counts as
found when the review names it and what goes wrong if it is merged; a decoy counts as a
false positive when the review asks for it to be changed before merging.

**The runs.** Eight subagents of this session, started with the Agent tool's model
setting, each told to read only the task file, run nothing, and reply with its review.
Each run named its own model on its first line: `claude-haiku-5-5` twice,
`claude-sonnet-5-5` three times, `claude-opus-5-5` three times, at whatever effort a
subagent of this session runs at, which the runs did not record. Each was given the task
file, which then said only that its answer key is in this finding; the finding was
written after all eight runs had reported. All ran on the session's subscription, none on a key billed per use.
The author of the task scored the runs, which is a bias this pilot did not remove.

**The results.**

| Model | Runs | D1 | D2 | D3 | D4 | Decoy flagged |
|---|---|---|---|---|---|---|
| Claude Haiku 5.5 | 2 | 2 | 2 | 2 | 2 | 1 |
| Claude Sonnet 5.5 | 3 | 3 | 3 | 3 | 3 | 2 |
| Claude Opus 5.5 | 3 | 3 | 3 | 3 | 3 | 0 |

**Every run found every seeded defect.** The measure decided in advance does not
separate Opus from Sonnet, nor either of them from a Small–medium pick. The defects were
signposted: the task stated the rule each one broke (the entry file's purpose, who copies
the template) or showed the code that contradicted it. A seeded defect with a known
answer is, for that reason, close to a mechanically checkable one, and the Large models
were not needed to find it.

Some differences did show, all in things the key did not score, so they are hypotheses,
not results:

- **False positives on the decoy:** Sonnet 2 of 3 asked for the rename to be reverted,
  Haiku 1 of 2, Opus 0 of 3.
- **The description says the rule was *moved*, but the diff only adds it**, so either it
  now exists twice or a removal is missing: Opus 3 of 3, Haiku 2 of 2, Sonnet 0 of 3.
- **One prefix for every adopter defeats the namespacing it is for:** Opus 3 of 3, Sonnet
  1 of 3, Haiku 0 of 2.
- **The added compare-and-swap text invites the wrong conclusion that retries are now
  safe**, an interaction between two hunks of the change: Opus 1 of 3, no other run.

These lean towards Opus, and Haiku did better than Sonnet on two of them (the decoy and
the moved rule), so they do not follow the tier order either, but they are counts of one or two to three, found after the
fact by the person who wrote the task. Taken as evidence, they would be the same mistake
the picks file is warned against: ranking models on figures that were not measured the
same way.

**What a pilot that could separate the tiers would need**, written down here so nobody
pays for this one again: defects the task does not signpost, runs started outside any repository whose
instructions state the principles being tested, decoys that a careful
reviewer would be tempted to flag, scoring of precision as well as recall, a grader who
did not write the key (or one blind to which model wrote each review), and enough runs
per model for differences of one in three to mean something. That is dozens of runs per
model, repeated whenever the roster changes. It was not pursued: see *Rejected*.

## The answer

**Which evidence tells a Large model from a Medium–large one?** None that this framework
can get. The public boards measure checked work. The ones that come nearest to judgment
were unreachable, and second-hand they agree with the others or blur the tiers further.
A project's own seeded-defect review, the cheapest instrument, is too easy to separate
even Large from Small–medium. One that is hard enough costs dozens of runs per model per
roster change.

**What the bar should be.** Since judgment cannot be measured, the bar has to rest on
the one thing every board agrees on, the ordering, and on the asymmetry Large is defined
by. In every other tier a weaker model's mistake meets a check: a test fails, a coverage
figure does not move, a reviewer catches it. In Large nothing catches it. What is lost by
running a Large plan on the best model is usage. What is lost by running it on a weaker
model is unbounded and nobody sees it. So Large should take the best evidence offers, not
whatever is close to something already admitted.

The rule the picks file follows now cannot say that. "The highest tier its evidence
supports" with no threshold is applied as *level with a model already in the tier*, and
that bar falls each time a model is admitted. Fable 5.1 is in Large at four points below
Sonnet 5.5, and Argon was admitted for being level with Fable. Nothing in the rule stops
the next model level with Argon.

## Recommendation, put to the developer

Record as a decision, and apply through `/refresh-model-tiers`:

1. **Large is anchored on the best selectable pick.** The reference is the model with
   the highest score on the shared boards. A model joins it in Large only when no shared
   board places it below that model by more than the board's stated uncertainty, or by
   more than a margin the command states for boards that state none. Placement in every
   other tier stays as it is.
2. **The margin is small and fixed in the command**, not judged per pass. One point on a
   percentage board, or its equivalent, is a starting proposal, so that a model level
   with the best is admitted and one consistently a few points below it is not. The
   developer should choose the figure; the finding has no measurement that fixes it.
   The command should also say at which effort the best pick is judged: the boards rank
   at max or xhigh, Claude Code runs these models at medium by default, and FW-057 records
   that at max effort Sonnet 5.5 and Opus 5.5 cost about the same per task on AA, so the
   recommendation's cost depends on effort too.
3. **Applied to today's figures**, Large is Claude Opus 5.5 alone. Sonnet 5.5 is below
   it on every board (by 4 on AA v5.0, 2.3 on CursorBench 4.0, 3.0 on Terminal-Bench 4.0
   and 40 on Arena WebDev), so it moves to Medium–large, as do Gemini 4 Argon
   and Fable 5.1. Every subscription the picks file lists as including a Large pick today
   also includes Opus 5.5, so every developer who can dispatch a Large plan today still
   can.
4. **The cost is stated where it is paid.** The picks file says Large costs the most
   usage per task by design (Opus 5.5 is $3.97 per task on CursorBench 4.0 at High,
   against Sonnet 5.5's $1.20), so a developer short of allowance lowers a plan's tier
   deliberately, by reshaping the plan so a check exists, rather than by a cheaper model
   standing in for the tier.

This changes `commands/refresh-model-tiers.md`, `docs/model-picks.md` on its next pass,
and the decision record, amending FW-027's placement rule for Large. It does not change
`.claude/framework/model-tiers.md`, whose
tier definitions stay as they are. It is the backlog item
`large-tier-anchors-on-the-best-pick`, an idea until the developer agrees it.

## Rejected

- **Keep the present rule and let usage order Large.** That is the situation the backlog
  item was opened on. It is right only if all of Large is fit for its work, and nothing
  shows that Sonnet 5.5, still less Fable 5.1, is fit for what nothing checks.
- **Admit to Large on GDPval-AA.** Unconfirmed from its own page, and the second-hand
  figures put a Medium–large model between Opus and Sonnet. Even confirmed, it measures
  occupational deliverables rated in pairs, which is nearer to judgment than a test suite
  but is not this framework's kind of judgment. A pass that can read it should record it
  beside the others. It should not decide Large on its own.
- **Build a project-owned judgment battery and admit on it.** The pilot shows that the
  cheap version does not discriminate, and the version that might costs dozens of runs
  per model at every roster change, graded by someone other than its author. That is a
  research programme, not a step in `/refresh-model-tiers`. Dropped unless a public board
  for judgment never appears and the bar above proves too blunt.
- **Make Large a fixed list of named flagship models.** That records a vendor's
  marketing, not evidence, and goes stale with the next release.

## What was not measured

- No GDPval-AA, LMArena Text or code review leaderboard figure was read from its own page.
- No Cursor run, and no model other than the three Claude ones. The runs did not
  record their effort, and the board figures were measured at max or xhigh.
- The pilot's scoring was not blind and not repeated by a second grader.
