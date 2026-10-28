# Model picks

Which models this project hands each tier to. The tiers are defined in
`.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.

**Last verified: 2026-10-21.**

| Tier | Models |
|---|---|
| **Large** | Claude Opus 5.5 *(all)*; Claude Sonnet 5.5 *(all)*; Claude Fable 5.1 *(all)* |
| **Medium–large** | Gemini 4 Argon *(Cursor)*; Muse Wonder *(Cursor)*; or any pick from a higher tier |
| **Medium** | Grok 4.7 *(Cursor, any plan)*; GPT-5.6 Sol *(Cursor)*; or any pick from a higher tier |
| **Small–medium** | Claude Haiku 5.5 *(all)*; GPT-5.6 Terra *(Cursor)*; Gemini 3.8 Flash *(Cursor)*; Composer 2.5 *(Cursor, any plan)*; or any pick from a higher tier |
| **Small** | GPT-5.6 Luna *(Cursor)*; or any pick from a higher tier |

Picks are placed on fitness for the tier's work alone. Price and how fast a model uses up
a plan's limits are left to whoever dispatches: neither is published in a form that can
be compared across the two tools. Each model sits in the highest tier the evidence
supports, and fits every tier below it — so a lower tier's row names only the models
that reach no higher.

*(all)* means both supported tools, Claude Code and Cursor, offer the model. Claude Code
offers only Anthropic models; Cursor offers those and the others tagged *(Cursor)*.

*(Cursor, any plan)* marks Cursor's own bundled models, Composer and Grok. They are the
only ones on Cursor's Plus plan; every other model in Cursor, Claude models included,
needs Premium or higher. **On Plus there is no Large or Medium–large pick**: hand those
plans to Claude Code or a higher Cursor plan.

## Why each pick sits where it does

Index figures are the Artificial Analysis Intelligence Index (v4.3.2, the current one).
The Coding Agent Index is Artificial Analysis's measure of models doing real coding tasks
as agents.

- **Claude Opus 5.5** — index 58, the highest measured. Terminal-Bench 4.0 measured
  independently at 59.6%; Anthropic reports 66.4%. Launched 2026-09-22.
- **Claude Sonnet 5.5** — index 56, second only to Opus 5.5. Independent Terminal-Bench
  4.0 runs report 64% and 70.6% depending on harness. Launched late September 2026 (date
  inferred from Haiku 5.5's announcement, not found directly).
- **Claude Fable 5.1** — index 53, now below Opus 5.5 and Sonnet 5.5; Terminal-Bench 4.0
  55% (Artificial Analysis). Kept in **Large** as Anthropic's top tier and a different
  second opinion on judgment-heavy plans. Launched 2026-09-01. In Cursor it may need a
  data-retention approval; in Claude Code it can need usage credits and asks for consent.
- **Gemini 4 Argon** — index 53. Google's own Terminal-Bench 4.0 figure is 57.4%; one
  independent run gives 57%. Announced 2026-09-30; in Google's API generally from about
  2026-10-13. Google employees are reported saying it does worse in practice than on
  benchmarks on some coding tasks.
- **Muse Wonder** — index 52. Released 2026-10-12, nine days before this pass, so
  independent results are thin; Meta's coding figures are its own, and its stronger
  sibling, Wonder Full, is not selectable in Cursor.
- **Grok 4.7** — index 46. CursorBench 4.0 46.3% at extra-high effort, above GPT-5.6
  Sol's 41.7% and below Fable 5.1's 51.8%. Terminal-Bench 4.0 33% in Artificial
  Analysis's agent run (37.6% on Cursor's page, level with Sol's 37.3%). Coding Agent
  Index 56, fourth among models in their own harness in September. Released 2026-09-21.
- **GPT-5.6 Sol** — index 47; CursorBench 4.0 41.7%; Terminal-Bench 4.0 37.3%.
  Launched 2026-07-09. See *Departures* — its successor is in neither tool.
- **Claude Haiku 5.5** — index 43 at max effort. Anthropic reports Terminal-Bench 4.0
  39.2% against Sonnet 5.5's 70.6%. Released 2026-10-07. Its index score is at max effort;
  at its default effort, treat it as **Small**.
- **GPT-5.6 Terra** — index 42; Coding Agent Index 77 at launch, on an earlier index.
- **Gemini 3.8 Flash** — index 41. Released 2026-09-02.
- **Composer 2.5** — Cursor's own model. CursorBench 4.0 27.7%, published by Cursor
  itself, below Grok 4.6's 40.4%. Its Coding Agent Index 62 from May 2026 was measured
  before that index moved to Terminal-Bench 4.0 and cannot be compared with September
  scores. Released 2026-05-18, the oldest pick here.
- **GPT-5.6 Luna** — no current index score found under its own name (see the naming note
  below); Coding Agent Index 75 at launch, on an earlier index.

## How much to trust the scores

- **SWE-bench Pro is mostly self-reported.** The headline leaderboard (Opus 5.5 89.9%,
  Sonnet 5.5 81.3%, Fable 5.1 81.2%) is vendor-published. The best independently
  measured result on Scale's board is 61.5%. Treat vendor SWE-bench Pro figures as an
  ordering hint, not a measurement. They are not used for placement here.
- **CursorBench 4.0 is Cursor's own benchmark**, and Cursor sells every model on it. It
  is the one board that scores Grok 4.7 and Composer 2.5 side by side, and Composer's
  low score there is Cursor's own figure, so it is used for placing those two.
- **The Coding Agent Index changed between May and September.** Its Terminal-Bench
  component moved from version 2 to 4.0, so Composer 2.5's May score cannot be compared
  with Grok 4.7's September one.
- **Terminal-Bench versions differ.** Boards report versions 2.0, 2.1 and 4.0 under the
  same name, and the same model's score swings by ten points or more between harnesses.
  Compare only within one board.
- **Artificial Analysis changed index version.** Its July articles used an earlier index
  (GPT-5.6 Sol 59, Terra 55); the current v4.3.2 scores are lower across the board. Only
  current-version figures are used above.
- **Naming is inconsistent.** Artificial Analysis and press now list GPT-6 Sol, GPT-6
  Astra and GPT-6 Luna, and some articles use those names interchangeably with GPT-5.6.
  Cursor offers only the GPT-5.6 names.
- **Uncorroborated:** Gemini 3.8 Flash's Terminal-Bench 2.1 score (90.8% and 89.4% in two
  sources, setup unknown) and all of Muse Wonder's coding figures. Neither is used for
  placement.
- **Not found:** a current LiveCodeBench board, and a current official LMArena WebDev
  board (the latest official snapshot found was January 2026; a third-party mirror with
  September data could not be checked against it).

## Departures

- **GPT-5.6 Sol** is marked deprecated on Artificial Analysis in favour of GPT-6 Sol,
  which neither supported tool offers. It is still selectable in Cursor.
- **Retired at Anthropic:** Opus 4.1, Opus 4, Sonnet 4 and Haiku 3.5. Sonnet 4.5 is
  deprecated.
- **Superseded, not picked:** Opus 5, Opus 4.x, Sonnet 5 and Fable 5 are still selectable
  in both tools but score lower than their successors.

## Outside the supported tools

GPT-6 Sol, GPT-6 Astra and Muse Wonder Full appear on the leaderboards above at or near
the top but are selectable in neither Claude Code nor Cursor, so they cannot be picks.

## Not placed

Hidden-by-default Cursor models (Kimi K3, GLM 5.3) score around 44–45 on the index and
were not placed.

### Sources used this pass

- https://code.claude.com/docs/en/model-config
- https://cursor.com/docs/models
- https://cursor.com/docs/account/pricing
- https://platform.claude.com/docs/en/about-claude/pricing (retirements)
- https://artificialanalysis.ai/leaderboards/models
- https://artificialanalysis.ai/articles/claude-opus-5-5
- https://artificialanalysis.ai/articles/gpt-5-6-has-landed
- https://artificialanalysis.ai/articles/cursor-composer-2-5-coding-agent-index
- https://artificialanalysis.ai/models/gpt-5-6-sol
- https://artificialanalysis.ai/models/claude-haiku-5-5
- https://artificialanalysis.ai/articles/benchmarking-grok-4-7
- https://cursor.com/grok
- https://cursor.com/composer
- https://artificialanalysis.ai/models/comparisons/gemini-4-argon-vs-claude-opus-5-5
- https://www.trendingtopics.eu/gemini-4-artificial-analysis-en/
- https://llmlearner.com/rankings/swe-bench-pro
- https://benchlm.ai/benchmarks/swe-bench-pro
- https://benchlm.ai/coding
- https://www.morphllm.com/best-ai-coding-agents-2026
- https://pricepertoken.com/leaderboards/benchmark/terminalbench
- https://benchlm.ai/benchmarks/terminal-bench-2
- https://lmarena.ai/leaderboard/webdev
- https://llmrun.dev/benchmark/lmarena-webdev
- https://computingforgeeks.com/claude-haiku-5-5-released-features-benchmarks/
- https://apidog.com/blog/claude-haiku-5-5-benchmarks/
- https://computingforgeeks.com/gemini-4-argon-released-features-benchmarks/
- https://apidog.com/blog/gemini-4-argon-benchmarks/
- https://pasqualepillitteri.it/en/news/17476/xai-launches-grok-4-7
- https://pasqualepillitteri.it/en/news/23176/muse-wonder-launches-opus-5-5-prices-trails-benchmarks
- https://www.eesel.ai/blog/meta-muse-wonder-review
- https://computingforgeeks.com/gemini-3-8-flash-released-features-benchmarks/
- https://www.vellum.ai/blog/gemini-3-8-flash-benchmarks-explained
- https://anthonymaio.substack.com/p/cursor-composer-25-lands-the-crowd
