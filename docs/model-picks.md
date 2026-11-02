# Model picks

Which models this project hands each tier to. The tiers are defined in
`.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.
Each model sits in the tier its fitness supports. Inside a tier, models are listed
least usage per task first, and `/dispatch` names the first one your subscriptions
include; the second table gives each pick's usage and the subscriptions that include it.

**Last verified: 2026-11-02.**

| Tier | Models |
|---|---|
| **Large** | Claude Sonnet 5.5 *(all)*; Claude Opus 5.5 *(all)*; Gemini 4 Argon *(Cursor)*; Claude Fable 5.1 *(all)* |
| **Medium–large** | Muse Wonder *(Cursor)*; or any pick from a higher tier |
| **Medium** | DeepSeek V4.1 Flash 1017 *(Cursor)*; GPT-5.6 Sol *(Cursor)*; Grok 4.7 *(Cursor)*; or any pick from a higher tier |
| **Small–medium** | Claude Haiku 5.5 *(all)*; GPT-5.6 Terra *(Cursor)*; Gemini 3.8 Flash *(Cursor)*; or any pick from a higher tier |
| **Small** | GPT-5.6 Luna *(Cursor)*; Composer 2.5 *(Cursor)*; or any pick from a higher tier |

| Model | Usage per task | Included on | Command-line name |
|---|---|---|---|
| Claude Sonnet 5.5 | $1.20 per task (CursorBench 4.0, High effort; 37,391 tokens per task) | Claude Code: Pro, Max, Ultra, Team Standard, Team Premium; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-sonnet-5-5; Cursor: claude-sonnet-5-5-high |
| Claude Opus 5.5 | $3.97 per task (CursorBench 4.0, High effort; 53,078 tokens per task) | Claude Code: Pro, Max, Ultra, Team Standard, Team Premium; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-opus-5-5; Cursor: claude-opus-5-5-high |
| Gemini 4 Argon | $4.57 per task (CursorBench 4.0, High effort; 109,500 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gemini-4-argon-high |
| Claude Fable 5.1 | $9.08 per task (CursorBench 4.0, High effort; 58,438 tokens per task) | Claude Code: Max (up to 50% of the weekly limit), Ultra (up to 50% of the weekly limit), Team Premium (up to 50% of the weekly limit); Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-fable-5-1; Cursor: claude-fable-5-1-high |
| Muse Wonder | $3.51 per task (CursorBench 4.0, High effort; 33,612 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: muse-wonder-1.0-high |
| DeepSeek V4.1 Flash 1017 | $0.77 per task (CursorBench 4.0, High effort; 385,196 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: deepseek-v41-flash-1017-high |
| GPT-5.6 Sol | $2.85 per task (CursorBench 4.0, High effort; 16,174 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gpt-5.6-sol-high |
| Grok 4.7 | $4.69 per task (CursorBench 4.0, High effort; 56,382 tokens per task) | Claude Code: none; Cursor: Free, Plus, Premium, Super, Ultra, Teams, Enterprise, Hobby, Start, Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: grok-4.7-high |
| Claude Haiku 5.5 | $0.32 per task (CursorBench 4.0, High effort; 77,057 tokens per task) | Claude Code: Pro, Max, Ultra, Team Standard, Team Premium; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: claude-haiku-5-5; Cursor: claude-haiku-5-5-thinking-high |
| GPT-5.6 Terra | $1.11 per task (CursorBench 4.0, High effort; 13,162 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gpt-5.6-terra-high |
| Gemini 3.8 Flash | $4.70 per task (CursorBench 4.0, High effort; 162,565 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gemini-3.8-flash-high |
| GPT-5.6 Luna | $0.25 per task (CursorBench 4.0, High effort; 23,368 tokens per task) | Claude Code: none; Cursor: Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: gpt-5.6-luna-high |
| Composer 2.5 | $0.68 per task (CursorBench 4.0, its only setting; 17,347 tokens per task) | Claude Code: none; Cursor: Free, Plus, Premium, Super, Ultra, Teams, Enterprise, Hobby, Start, Pro, Pro+, legacy Ultra, legacy Teams | Claude Code: none; Cursor: composer-2.5 |

## Reading the tables

- *(all)* means both supported tools, Claude Code and Cursor, offer the model. Claude
  Code offers only Anthropic models; Cursor offers those and the others tagged
  *(Cursor)*.
- **Usage per task** is CursorBench 4.0's average cost per task at **High** effort, the
  one setting every pick except Composer 2.5 has a row for. Cursor computes it by
  applying each model's published per-token API prices to the tokens it spent. It is
  the only board that covers every pick: Artificial Analysis's Intelligence Index
  (v5.0) has no score for the GPT-5.6 models or Composer 2.5. Composer 2.5 has one row,
  with no effort setting, and its figure is not strictly like-for-like with the others.
  Usage orders models inside a tier and never moved a model between tiers.
- **The Cursor command-line names are the High-effort variants**, to match the usage
  figure; `cursor-agent --list-models` lists the other efforts. The Claude Code names
  run each model at Claude Code's own default effort (medium on Opus 5.5, Sonnet 5.5
  and Haiku 5.5, per the model-config page), which is lower than the effort the usage
  figures are measured at.
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
  Plus they run "at fixed settings", so the High-effort name may not apply there.
- **Claude Code:** Pro, Max, Ultra and both Team seat types include Opus, Sonnet and
  Haiku. Fable 5.1 is included only on Max, Ultra and Team Premium seats, up to half
  the weekly limit; on Pro and Team Standard it runs on usage credits. Enterprise is left
  out of every cell: the current Enterprise plan is billed per seat plus usage, and
  Fable on usage-based Enterprise is billed at API rates. Premium seats on legacy
  seat-based Enterprise plans include Fable like Team Premium; a developer on one should
  say so when the subscriptions record is written. Anthropic's pricing page lists Max at
  5x Pro and Ultra at 10x Pro and no longer names Max 5x or Max 20x.

## Why each pick sits where it does

Boards used for placement, each compared only with itself:

- **AA v5.0**: Artificial Analysis Intelligence Index v5.0 (nine evaluations including
  FrontierCode 2.0 and Terminal-Bench 4.0). Each model is scored at the variant AA
  lists; the setting is given beside each figure.
- **CursorBench 4.0**: Cursor's benchmark, introduced 2026-09-10, best score per model
  and its effort.
- **TB 4.0**: the Terminal-Bench 4.0 leaderboard on tbench.ai. Each row runs in its
  model vendor's own agent (Claude Code, Codex, Grok Build, Muse Code) or
  mini-SWE-agent, so its harnesses differ: use it as an ordering hint only.
- **Arena WebDev**: LMArena's WebDev board, 2026-10-27 snapshot.

- **Claude Opus 5.5**: AA v5.0 58 (max), the highest selectable; CursorBench 4.0 57.8%
  (Max), first; TB 4.0 64.85% (max, Claude Code); Arena WebDev 1810, first. Launched
  2026-09-22.
- **Claude Sonnet 5.5**: AA v5.0 54 (max); CursorBench 4.0 55.5% (Max); TB 4.0 61.82%
  (max); Arena WebDev 1770. Second to Opus 5.5 on every board. Launched 2026-09-28.
- **Gemini 4 Argon**: AA v5.0 50 (high), level with Fable 5.1's 50 (xhigh);
  CursorBench 4.0 52.9% (High) against Fable 5.1's 51.8% (Max). **Moved up from
  Medium–large**: it is level with Fable 5.1 on both boards that score them together,
  and below it only on Arena WebDev (1679 against 1746). No TB 4.0 entry. Released
  2026-09-30.
- **Claude Fable 5.1**: AA v5.0 50 (xhigh); CursorBench 4.0 51.8% (Max); TB 4.0 57.88%
  (max), third among selectable models; Arena WebDev 1746. Below Opus 5.5 and Sonnet
  5.5 everywhere, and the most expensive pick per task. Launched 2026-09-01.
- **Muse Wonder**: AA v5.0 43 (max), well below the Large picks' 50 and above; CursorBench
  4.0 50.4% (Max); Arena WebDev 1652. No TB 4.0 entry. Released 2026-10-12.
- **DeepSeek V4.1 Flash 1017**: CursorBench 4.0 47.7% (Max), above Grok 4.7's 46.3%;
  Arena WebDev 1665, above Grok 4.7's 1637; but AA v5.0 32 (max), below Grok 4.7's 34
  (xhigh) and level with Gemini 3.8 Flash. **New; placement contested**: two boards put
  it level with or above Grok 4.7, one puts it a tier lower. Open weights (MIT).
  Released 2026-10-17. Hidden by default in Cursor.
- **GPT-5.6 Sol**: CursorBench 4.0 41.7% (Max); TB 4.0 37.27% (max, Codex), level with
  Grok 4.7's 37.58%; Arena WebDev 1616. No AA v5.0 score (see *Departures*). Launched
  2026-07-09.
- **Grok 4.7**: AA v5.0 34 (xhigh), 35 (high); CursorBench 4.0 46.3% (Extra High); TB
  4.0 37.58% (xhigh, Grok Build); Arena WebDev 1637. Released 2026-09-21.
- **Claude Haiku 5.5**: AA v5.0 36 (max); CursorBench 4.0 48.4% (Max), 42.3% (High),
  36.9% (Medium); Arena WebDev 1589. **At max effort it scores level with or above the
  Medium picks on AA and CursorBench, but Claude Code runs it at medium by default**,
  where it scores with the Small–medium picks; it stays here. No TB 4.0 entry. Released
  2026-10-07.
- **GPT-5.6 Terra**: CursorBench 4.0 41.3% (Max), level with Sol; but TB 4.0 21.52%
  (max) against Sol's 37.27%, and Arena WebDev 1520 against Sol's 1616. No AA v5.0
  score. Launched 2026-07-09.
- **Gemini 3.8 Flash**: AA v5.0 31 (high); CursorBench 4.0 39.6% (High); TB 4.0 19.09%
  (high, mini-SWE-agent); Arena WebDev 1583 (preliminary). Released 2026-09-02.
- **GPT-5.6 Luna**: CursorBench 4.0 35.9% (Max); TB 4.0 17.27% (max); Arena WebDev
  1519. No AA v5.0 score. Launched 2026-07-09.
- **Composer 2.5**: CursorBench 4.0 27.7%, the lowest of any pick and below GPT-5.6
  Luna at High (29.4%). **Moved down from Small–medium**: that is the only board that
  scores it with the others. On no other board found. **Unconfirmed**, and the figure is
  Cursor's own for its own model. Released 2026-05-18, the oldest pick here.

## How much to trust the scores

- **CursorBench 4.0 is Cursor's own benchmark**, and Cursor sells every model on it.
  Composer 2.5 is Cursor's own model, and Grok 4.7 is sold as one of "Cursor's models"
  in its own pool; their CursorBench figures are a tool's scores for models it offers as
  its own. The cost-per-task figures are arithmetic on published prices, not a claim
  about quality, and are used here only for ordering.
- **Terminal-Bench 4.0 rows are run in each vendor's own agent**: Anthropic's Claude
  Code for Claude models, OpenAI's Codex, xAI's Grok Build. They are not one harness.
  No TB 4.0 row exists for Gemini 4 Argon, Muse Wonder, Haiku 5.5, DeepSeek V4.1 Flash
  or Composer 2.5.
- **Artificial Analysis moved to Intelligence Index v5.0** since the last pass (it was
  v4.3.2); GDPval-AA was removed. Every v5.0 figure is lower than its v4.3.2
  counterpart, and the two cannot be compared.
- **SWE-bench Pro is not used.** Scale's public board has no model newer than the
  previous generation; the newest figures circulating are vendor-published.
- **Corroboration**: every placing figure above comes from the board's own page.
  Opus 5.5, Grok 4.7, Gemini 4 Argon, Gemini 3.8 Flash, Muse Wonder and DeepSeek V4.1
  Flash were checked on both AA's leaderboard and the model's own AA page. CursorBench
  4.0's Grok 4.7, Fable 5.1 and GPT-5.6 Sol figures also appear on Cursor's Grok 4.7
  page; its Composer 2.5 figure also appears on Cursor's Composer page. Both are Cursor's.
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
  CursorBench 4.0 42.6% (Max); AA v5.0 32 (max).

### Sources used this pass

- https://code.claude.com/docs/en/model-config
- https://cursor.com/docs/models
- `cursor-agent --list-models` (version 2026.10.22)
- https://cursor.com/docs/account/pricing
- https://cursor.com/docs/account/pricing/legacy-cursor-plans
- https://claude.com/pricing
- https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/about-claude/model-deprecations
- https://cursor.com/cursorbench
- https://cursor.com/grok
- https://cursor.com/composer
- https://artificialanalysis.ai/leaderboards/models
- https://artificialanalysis.ai/methodology/intelligence-benchmarking
- https://artificialanalysis.ai/models/claude-opus-5-5
- https://artificialanalysis.ai/models/grok-4-7
- https://artificialanalysis.ai/models/gemini-4-argon
- https://artificialanalysis.ai/models/gemini-3-8-flash
- https://artificialanalysis.ai/models/muse-wonder
- https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017
- https://artificialanalysis.ai/models/gpt-5-6-sol
- https://artificialanalysis.ai/models/gpt-5-6-terra
- https://artificialanalysis.ai/models/gpt-5-6-luna
- https://www.tbench.ai/leaderboard
- https://arena.ai/leaderboard/webdev
- https://labs.scale.com/leaderboard/swe_bench_pro_public
