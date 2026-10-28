# Model picks rest only on figures that can be compared — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover, except the stop in Task 4 if the fresh-agent check fails.

**Goal:** `/refresh-model-tiers` ranks one model above another only on scores measured the
same way, takes every figure from its primary source, counts the supported tools' own
benchmarks, and leaves cost out of the picks.

**Spec:** none. The backlog entry `model-picks-compare-like-with-like` carries the seven
acceptance criteria the developer approved on 2026-10-21, and its comment carries the
evidence summarised below.

**Why — what went wrong, verified by the specifying session on 2026-10-21.** The first
`/refresh-model-tiers` pass in this repository (commit `d2add2e`, `docs/model-picks.md`)
ranked Grok 4.7 a tier below Composer 2.5. The developer doubted it, and it was wrong on
four counts, each allowed by the command as written today:

1. **Different versions of one benchmark were compared.** Composer 2.5 scored 62 on
   Artificial Analysis's Coding Agent Index in May 2026; Grok 4.7 scored 56 in September.
   In between, that index's Terminal-Bench component moved from version 2 to 4.0, and in
   May 62 ranked third against Opus 4.7 and GPT-5.5 while in September 56 ranked fourth
   against Fable 5.1, GPT-6 Astra and Opus 5. The pass also set Terminal-Bench 2.0 scores
   beside 4.0 scores, and an older Artificial Analysis Intelligence Index beside v4.3.2.
2. **Different setups were compared.** Grok was run in xAI's own harness (Grok Build) at
   extra-high effort, Composer in another harness at its standard setting.
3. **A second-hand figure was used.** A press article gave Grok 4.7 26% on Terminal-Bench
   4.0; Artificial Analysis's own article gives 33%, and Cursor's page 37.6%.
4. **The one board scoring both was skipped.** The command says to avoid "vendor
   marketing", so Cursor's CursorBench was passed over. Cursor sells every model on it and
   makes none of them except Composer. CursorBench 4.0 (cursor.com/grok, cursor.com/composer):
   Fable 5.1 51.8%, Grok 4.7 46.3%, GPT-5.6 Sol 41.7%, Grok 4.6 40.4%, Composer 2.5 27.7%.

**Why cost goes too.** Neither tool publishes how fast each model uses up a plan's limits:
Cursor's pricing page says only that models "draw from the pool at different rates", and
Anthropic's Claude Code help gives no per-model weights for subscription limits. A per-token
price therefore says nothing comparable across the two tools, and the developer chose to
leave cost to whoever dispatches. With cost gone there is no reason to list a strong model
in a lower row, so each model sits once, in the highest tier its evidence supports.

**What the specifying session verified about the repository, at `086b27b`:**

- `commands/refresh-model-tiers.md` is identical below its front matter to the installed
  `.claude/commands/refresh-model-tiers.md`. Only the source changes here.
- `/dispatch` reads the picks with `picksForTier` in `scripts/plan-binding.js`: it splits
  on `| Tier | Models |` and returns the second cell of the matching row, so it reads a
  table with or without a third column. `guards/dispatch.test.js` already has a case
  with a price column (*prints the picks and their date…*) and one without (*warns when
  the picks file is older…*).
- The words "price", "repriced", "Token efficiency" and "Indicative price" occur in
  `commands/refresh-model-tiers.md`, in the `guards/dispatch.test.js` fixture above, and
  in the merged plan `2026-10-19-tier-picks-are-project-data.md` — nowhere else in the
  source folders. The merged plan is history and is not edited.
- `framework/model-tiers.md` says nothing about prices or cost.
- The last decision in `framework/DECISIONS.md` is FW-026.
- `RELEASES.md` has `## [Unreleased]` holding only `_Nothing yet._`.

**Model tier: Small–medium.** Every text is given verbatim; the judgment is in reading the
fresh-agent check against its pass conditions.

**Requires:** any current Claude Code or Cursor install for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** It changes what an agent is told to do, and whether the probe's output passes depends on context the specifying session holds.

Do not store a kick-off prompt on this plan.

---

## Delivers

model-picks-compare-like-with-like

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-picks-comparable -b plan/model-picks-compare-like-with-like` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md`.**
- **Do not edit `docs/model-picks.md` or `feature-catalog.yaml`.** This repository's own
  picks are refreshed once a release installs the new command; the reviewer promotes the
  entry.
- **Do not edit the merged plan `docs/superpowers/plans/2026-10-19-tier-picks-are-project-data.md`.**
- **Do not lower, skip or delete a guard to get green.**
- **Do not reword the command after a failed fresh-agent check.** Task 4 says what to do.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-21. Do not reopen them.

### 1. The command

Replace the whole of `commands/refresh-model-tiers.md` with exactly this (the outer fence
is the plan's; the file's own fence uses three backticks):

````markdown
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
prices, price changes or token counts, and do not move a model between tiers because of
them.

**Each model sits in the highest tier its evidence supports, and fits every tier below
it.** A lower tier's row names only the models that reach no higher, and ends with
`or any pick from a higher tier`.

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
  against its neighbours.

  > The first pass in the framework's own repository ranked Grok 4.7 below Composer 2.5
  > on two Coding Agent Index scores taken four months apart, across a change to that
  > index. Cursor's own CursorBench 4.0, the one board scoring both, put Grok at 46.3%
  > and Composer at 27.7%.
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
dispatches.

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
````

### 2. The test

Add this case to `guards/dispatch.test.js`, directly after *warns when the picks file is
older than ~45 days*, inside the same `describe`. `readFileSync`, `join`, `blueprint` and
`picksForTier` are already in scope there.

```js
  it('reads the picks table /refresh-model-tiers tells a project to start from', () => {
    const command = readFileSync(join(blueprint, 'commands/refresh-model-tiers.md'), 'utf8');
    const template = command.split('Start a new file like this')[1].split('```')[1];
    expect(template).toContain('| Tier | Models |\n|---|---|\n');
    for (const tier of ['Large', 'Medium–large', 'Medium', 'Small–medium', 'Small']) {
      expect(picksForTier(template, tier)).not.toBe('');
    }
  });
```

Leave the existing fixtures as they are: the one with a price column proves a project's
older picks file still reads, which is part of "reads the picks exactly as before".

### 3. The decision record

Append to `framework/DECISIONS.md`, after FW-026, separated by a blank line:

```markdown
## FW-027: Model picks rest only on figures that can be compared

**Date:** 2026-10-21 · **Status:** Accepted

**Decision:** `/refresh-model-tiers` ranks one model above another only on scores that
share the benchmark and its version, the harness, the effort setting, and a period in
which the benchmark did not change, each taken from its primary source. The supported
tools' own benchmarks count as evidence, with a tool's score for its own model marked
self-published. Cost is left out: each model sits in the highest tier its evidence
supports, and a lower row names only models that reach no higher.

**Evidence:** The first pass in this repository (`d2add2e`) ranked Grok 4.7 below
Composer 2.5 on Coding Agent Index scores taken four months apart across a change to
that index, used a press figure the evaluator's own article contradicts, and passed over
CursorBench 4.0, the one board scoring both, as vendor marketing; there Grok scored
46.3% and Composer 27.7%. Neither Cursor nor Anthropic publishes how fast each model
uses up a plan's limits, so a per-token price compares nothing across the two tools.

**Rejected:** Excluding a tool's own benchmark as vendor marketing (a tool that sells
every vendor's models is no model's vendor, and its board is often the only shared one);
keeping prices as indicative (they hide a model that spends many tokens, and say
nothing about subscription limits); listing cheap models again in lower rows (a cost
choice, which is now the dispatcher's).

**Consequences:** A picks file has no price column, and a placement with no shared board
behind it is marked unconfirmed. A project's existing picks file keeps working until its
next refresh.
```

### 4. The release note

In `RELEASES.md`, under `## [Unreleased]`, replace `_Nothing yet._` with:

```markdown
### Model picks compare only like with like

`/refresh-model-tiers` now ranks one model above another only on scores measured the
same way — the same benchmark version, harness and effort setting, in a period when the
benchmark did not change — and takes every figure from its primary source. Benchmarks
your tools publish themselves, such as Cursor's CursorBench, now count as evidence.
Prices are gone from the picks: how fast a model uses up a plan's limits is not
published in a form you can compare across tools, so that choice is yours when you
dispatch. Your current picks keep working; run `/refresh-model-tiers` to have them
placed the new way.
```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. Commit before running it. An intermittent
  red run with no failing test named has been seen (backlog
  `self-check-red-runs-keep-their-output`): run once more and report both; change nothing
  for it. Run nothing else at the same time.
- **Task 1 is red on purpose.** The new test reads the command's template, which still has
  a price column until Task 2. Confirm it fails for that reason before going on.
- **The new test finds the template by the phrase `Start a new file like this` and the
  next fence.** Decision 1's text keeps both; do not reword them.
- **`npm --prefix .tropis test` checks this repository with the installed release**, not
  the source. It must stay green but says nothing about the new command.
- **Task 4's prompt tells the probe agent not to search the web.** That contradicts the
  command on purpose: the probe's subject is invented, and its evidence file stands in for
  the searches.

## File Structure

| File | Change |
|---|---|
| `commands/refresh-model-tiers.md` | Decision 1 |
| `guards/dispatch.test.js` | Decision 2 |
| `framework/DECISIONS.md` | Decision 3 |
| `RELEASES.md` | Decision 4 |
| `docs/superpowers/plans/2026-10-21-model-picks-compare-like-with-like.md` | Handover report only |

## Tasks

### Task 1: The test, red

Decision 2. Commit it alone and run `bash scripts/check-blueprint.sh`. Expected: red, with
the new case in `guards/dispatch.test.js` failing on
`expect(template).toContain('| Tier | Models |\n|---|---|\n')`, because the command's
template still has a price column. Paste the failing lines. Do not run jest directly from
the repository root: there is no config there, and the self-check stages its own.

### Task 2: The command

Decision 1. Commit; self-check green, with the new case passing.

### Task 3: Records

Decisions 3 and 4. Commit; self-check green.

### Task 4: Fresh-agent check

A rule an agent follows changed, so this is required. In a scratch folder outside any
repository: `git init`, run this branch's `scripts/set-up-project.sh` on it,
`npm --prefix .tropis install`, and commit everything. Write `probe-evidence.md` in it
with exactly this content:

```markdown
# Search results for this probe (all invented)

Selectable models, read from each tool's own list today:
- Claude Code: Orin 2
- Cursor: Orin 2, Vale 3, Tarn 1 (Tarn 1 is Cursor's own model)

Prices per million tokens, input / output: Orin 2 $3 / $15, Vale 3 $1 / $4,
Tarn 1 $0.50 / $2.50.

1. Evaluator Ardent's own article, 2026-05-10, "Agent Index" version 1 (its terminal
   suite then was Terminal-Bench 2.0): Vale 3 scores 62, run in Vale's own CLI at
   default effort.
2. Evaluator Ardent's own article, 2026-09-14, "Agent Index" version 2 (its terminal
   suite moved to Terminal-Bench 4.0 in August): Orin 2 scores 71, run in Claude Code
   at high effort; Tarn 1 scores 56, run in Cursor at high effort.
3. Cursor's own page, 2026-09-20, "DevBench 4.0", both run in Cursor at high effort:
   Orin 2 52%, Tarn 1 31%.
4. Evaluator Ardent's own article, 2026-09-14, Terminal-Bench 4.0: Orin 2 48% at high
   effort, in Claude Code.
5. A news write-up, 2026-09-16, quoting Ardent: "Orin 2 scores 40% on Terminal-Bench 4.0."
6. Launch dates: Orin 2 2026-09-01, Vale 3 2026-04-02, Tarn 1 2026-08-11.
```

Start a fresh agent session in the scratch folder — for Claude Code, `claude -p` with
permission to edit files there — and give it, in one prompt:

> This is a probe and its output will be discarded. Do not search the web: treat
> probe-evidence.md in this folder as the results of every search the command asks for.
> Run /refresh-model-tiers.

If the tool does not expand the slash command, say "Follow the command file for
/refresh-model-tiers in this project" instead, and record that you did.

**Pass, all of these, read from the `docs/model-picks.md` it writes:**

- (a) Vale 3 is not ranked above or below Orin 2 or Tarn 1 on the Agent Index figures, and
  its placement is marked unconfirmed against its neighbours, or the file says it shares
  no comparable score with them.
- (b) The DevBench 4.0 figures are used, and Tarn 1's is marked self-published.
- (c) Orin 2's Terminal-Bench 4.0 figure is 48%, not 40%.
- (d) The table header is exactly `| Tier | Models |`, and `grep -E '\$[0-9]'
  docs/model-picks.md` prints nothing.
- (e) Every figure the file relies on names its benchmark version, harness, effort setting
  and date.
- (f) Every row except **Large** ends with `or any pick from a higher tier`.
- (g) Orin 2 sits in a higher tier than Tarn 1.
- (h) `node .tropis/scripts/dispatch.mjs` on a probe plan prints a non-empty picks line —
  write `docs/superpowers/plans/2026-01-01-probe.md` with the tier of Tarn 1's row and the
  headings and Repositories table the dispatch command requires (copy the shape from
  `guards/dispatch.test.js`'s `plan()` helper, with the scratch folder's own name).

**Fail — any condition does not hold:** do not change the command's wording. Record which
conditions failed, with the passages of `docs/model-picks.md` that show it, in the
handover report, commit it, and stop: the specifying session decides the rewording. This is
a mid-plan gate.

Record the prompt, the tool's answer in summary, each condition with pass or fail, and the
tool, version and machine, in a commit body on the branch (an empty commit is fine). Delete
the scratch folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: last line `Self-check passed: …`; project checks green; only files in *File
Structure*. Append `## Handover report` with the six sections the planning rules name,
commit, push, and open a pull request against `main`. Do not merge. In *Outstanding*, say
that the reviewer promotes the entry and that this repository's `docs/model-picks.md` is
refreshed once a release installs the command.

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Compares scores only on the same benchmark version, harness, effort and period, and records those four | Decision 1, *Compare only like with like*; Task 4 (e) |
| No shared score: no ranking across boards or versions, placement marked unconfirmed | Decision 1, *Place by shared boards*; Task 4 (a), (g) |
| Every figure from its primary source; a disagreeing second-hand figure is not used | Decision 1, *Take every figure from its primary source*; Task 4 (c) |
| Tools' own benchmarks count; a tool's score for its own model is self-published | Decision 1, *What to gather* and *Contamination and self-publication*; Task 4 (b) |
| No prices, price changes or token counts; no price column; cost left to the dispatcher; dispatch reads as before | Decision 1, *What the picks are for* and the template; Decision 2's case; the existing *prints the picks…* (price column) and *warns…* (no price column) cases; Task 4 (d), (h) |
| Highest tier its evidence supports; lower rows end with "or any pick from a higher tier" | Decision 1, *What the picks are for* and the template; Task 4 (f) |
| A fresh agent declines to rank across benchmark versions; recorded with tool, version, machine | Task 4 (a) and its commit body |

## Not in this plan

- **This repository's own picks.** `docs/model-picks.md` was written by the installed
  command and already has no price column. It is refreshed the new way once a release
  installs this command.
- **Tagging picks by a tool's plan** (Cursor's Plus plan offers only Composer and Grok).
  The current picks file does it by hand; the command does not ask for it. Not part of
  this entry.

## Handover report

### Task completion

- **Task 1 (the test, red):** done, commit `564e793`. Self-check red, for the expected reason.
- **Task 2 (the command):** done, commit `f7891e0`. Self-check green, new case passing.
- **Task 3 (records):** done, commit `9e3b437` (FW-027 and the Unreleased note). Self-check green.
- **Task 4 (fresh-agent check):** three probes.
  - First probe (`dcf521b`) failed condition (f) and stopped the plan.
  - Specifying session gave the rewording for (a) and (f) (`debface`). Second probe (`b62b93b`) passed every condition.
  - Specifying session then added token usage beside the picks (`01aa41d`). Third probe (`700d600`) passed every condition, including (i) to (k).
- **Task 5 (handover):** done. Final self-check, installed-release tests and diff stat below.

### Verification results

- Task 1, `bash scripts/check-blueprint.sh` before the command change: red. The only failing case was `dispatch command › reads the picks table /refresh-model-tiers tells a project to start from`. The template at that point read `| Tier | Models | Indicative price (in/out per Mtok) |`, which does not match `| Tier | Models |\n|---|---|\n`.
- Task 2, `bash scripts/check-blueprint.sh` at `f7891e0`: `Self-check passed: …`, exit 0.
- Task 3, same check at `9e3b437`: same last line, exit 0.
- Task 4, first probe (`dcf521b`), before the rewording: failed (f). Three lower rows read "any pick from a higher tier" without "or".
- Task 4, second probe (`b62b93b`), after the rewording in `debface`. Claude Code 2.1.300, `claude -p`, dev-laptop, Darwin arm64. Every condition passes:
  - (a, revised) Vale 3 is in the table, marked unconfirmed, and the notes say its only score cannot be compared with the others'.
  - (b) DevBench 4.0 used; Tarn 1's score marked self-published.
  - (c) Orin 2 Terminal-Bench 4.0 is 48%.
  - (d) header `| Tier | Models |`; `grep -E '\$[0-9]' docs/model-picks.md` printed nothing.
  - (e) every figure names its benchmark version, harness, effort and date.
  - (f, revised) Medium–large, Small–medium and Small read exactly "Any pick from a higher tier"; Medium ends "; or any pick from a higher tier".
  - (g) Orin 2 (Large) is above Tarn 1 (Medium).
  - (h) dispatch on a probe plan at tier Medium printed `Picks today: Tarn 1 *(Cursor)*; Vale 3 *(Cursor)* — unconfirmed, uncorroborated; or any pick from a higher tier`.
- Task 4, third probe (`700d600`), after the token-usage wording in `01aa41d`. Same tool and machine. Every condition passes:
  - (a, revised), (b) to (h) as in the second probe.
  - (i) DevBench 4.0 tokens per task recorded for Orin 2 (70,000) and Tarn 1 (17,000), with the board, version, harness and effort named.
  - (j) Vale 3's 25,000 is marked as coming from a different board, with a note not to set it beside the DevBench figures.
  - (k) no placement gives token usage as its reason; the file says tokens are not a placement input.
- Task 5, `bash scripts/check-blueprint.sh` at `700d600`: `Self-check passed: …`, exit 0.
- Task 5, `npm --prefix .tropis test`: 5 suites, 30 tests, all passed.
- Task 5, `git diff --stat origin/main...HEAD`:
  ```
   RELEASES.md                                        | 12 ++-
   commands/refresh-model-tiers.md                    | 89 ++++++++++++++++------
   ...026-10-21-model-picks-compare-like-with-like.md | 63 +++++++++++++++
   framework/DECISIONS.md                             | 31 ++++++++
   guards/dispatch.test.js                            |  9 +++
   5 files changed, 179 insertions(+), 25 deletions(-)
  ```
  Every file is in the File Structure table; the plan file carries only this handover report.

The scratch projects for all three probes were deleted.

### Scope

Worktree actually used: `~/src/tropis-picks-comparable` on `plan/model-picks-compare-like-with-like`. The isolate helper created it. Nothing was done in `~/src/tropis` apart from running the helper.

### Judgment calls

- **Rewording in `debface`, given by the specifying session.** Two sentences of the command: an empty lower tier row reads "Any pick from a higher tier", and a model with no comparable score is still placed in the table, marked unconfirmed. Reason: the developer's 2026-10-21 choice that a model a supported tool offers must never be invisible at dispatch. Backlog criteria updated on main in `cdbede4`.
- **Token usage beside the picks, given by the specifying session (`01aa41d`).** Five edits across the command, FW-027 and the release note. Token counts from a shared board are recorded beside the models it covers, with the board's version, harness and effort; counts from different boards are not set side by side; no placement rests on them. Reason: the developer's 2026-10-21 decision that token usage, unlike price, can be compared when it comes from one board and helps the dispatcher weigh cost. Backlog criteria updated on main in `cdd2d5c`.
- **Probes run headless** (`claude -p`, `--permission-mode acceptEdits`, tools Bash, Read, Write, Edit, Glob, Grep). The probe sessions also loaded the developer's global `CLAUDE.md`, which the plan does not address.
- **No Co-Authored-By trailers** on the commits, per the developer's global instructions, which take precedence over the attribution reminder.

### What the plan got wrong

- **The command did not say how an empty lower row reads.** The first probe wrote a bare "any pick from a higher tier" and failed (f). Fixed by the rewording.
- **A model with no comparable score was not required to be placed.** Fixed by the rewording: it stays in the table, marked unconfirmed.
- **The command did not say where token usage goes.** Fixed by the token-usage addition: beside the picks, not in them.
- **Nothing else found.** The file names, self-check commands and test helper matched the repository.

### Outstanding

- **Reviewer:** the specifying session reviews and decides the merge. Not merged.
- **Catalog entry:** the reviewer promotes `model-picks-compare-like-with-like`. `feature-catalog.yaml` and `docs/model-picks.md` were not edited, per the plan's Global Constraints.
- **This repository's own picks file** is refreshed the new way once a release installs the command.

## Review record

Reviewer: the specifying session, Claude Code desktop (Opus 5.5), on the developer's MacBook Pro,
Darwin 25.2.0.

### Checks re-run

- Scope: `git diff --stat origin/main...HEAD` before this record listed exactly the five
  files in *File Structure*: `RELEASES.md`, `commands/refresh-model-tiers.md`, this plan,
  `framework/DECISIONS.md`, `guards/dispatch.test.js`. This record adds
  `feature-catalog.yaml` for the promotion, which the plan assigns to the reviewer.
- The command against the plan: the plan's Decision 1 text, with the three amendments the
  specifying session sent (empty row, unplaceable model, token usage), diffed against
  `commands/refresh-model-tiers.md` — the only differences are those amendments, word for
  word.
- At `810afdf` (before the rebase): `bash scripts/check-blueprint.sh` →
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.`; `npm --prefix .tropis test` →
  `Tests: 30 passed, 30 total`.
- The new guard re-broken: a throwaway commit restoring `origin/main`'s command →
  `Self-check FAILED: conformance or the clean baseline`, naming
  `dispatch command › reads the picks table /refresh-model-tiers tells a project to start
  from`. The throwaway commit was dropped.
- Not re-run: the fresh-agent probe. Its three runs are recorded in the branch's probe
  commits with tool (Claude Code 2.1.300, `claude -p`), machine (dev-laptop,
  Darwin arm64), prompt and each condition with the passage that shows it, and the
  records agree with each other where the wording did not change. The scratch projects
  are deleted, so its output could only be re-checked by running it again.

### Found

- The release note's token-usage sentence was spliced in without rewrapping, leaving one
  line far over the file's width. **Fixed here by the reviewer** (`docs(releases): rewrap
  the model picks note`), wording unchanged.
- The first probe's failure was the plan's own: condition (f) required an "or" that an
  empty row cannot carry, and condition (a) allowed a model to be left out, against the
  approved criterion. Both were the specifying session's errors, settled by the
  developer's decision (place it, marked unconfirmed) and two sentences of command
  wording; the criteria were corrected on `main` (`cdbede4`).
- Token usage was added mid-plan at the developer's request; criteria corrected on
  `main` (`cdd2d5c`), wording sent to the executor, third probe passed.

### Outstanding disposition

- Reviewer merge and the entry's promotion: done in this record's commit.
- This repository's own `docs/model-picks.md` refreshed the new way: dropped as an entry.
  It happens on the next `/refresh-model-tiers` after a release installs the command, and
  the staleness check names the file within ~45 days regardless.
- Tagging picks by a tool's plan (Cursor Plus offers only Composer and Grok): not in this
  plan's criteria; the developer said "not yet" when it was offered, so it is held, not
  captured.

### Learnings routed

- Compare only like with like, primary sources, tools' own boards: written into the
  command itself and recorded as FW-027.
- A probe's pass conditions must be derived from the text under test, not from the
  output the author pictured: the first probe failed on a condition stricter than the
  command and passed one looser than the criterion. Not routed: the next plan author
  reading this record sees it, and a rule for it would be a second copy of "a check
  tests what its task touches", already in the workflow's fresh-agent section.

### Merged because

The command says, word for word, what the approved criteria require; the one guard it
adds fails on the old command and passes on the new; and a fresh agent running it on
evidence built to set each trap from the first real pass avoided every one.
