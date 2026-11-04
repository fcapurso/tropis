# Model tiers
<!-- layer: framework -->

Which model to hand a plan to. Tiers are anchored on the kind of work a plan demands —
the definitions are durable. Which models sit in each tier today is the project's own
data: `docs/model-picks.md`, written by `/refresh-model-tiers` and read by `/dispatch`.
The framework ships no picks, and an update never touches that file. Until it exists,
`/dispatch` names no models and says to run `/refresh-model-tiers`.

Inside a tier, the picks list models least usage per task first, and say which
subscriptions of each supported tool include each one. Which subscriptions the developer
holds is kept on their machine, never committed. `/dispatch` names, of the picks for a
plan's tier and every tier above it that one of them includes, the one that costs least
per task (FW-070), and never one that would cost extra (FW-053). Any pick above a tier
can do that tier's work, so a gap in a tier, or a dearer pick listed first, does not
put a plan on a more expensive model than it needs.

**Listed: only models an executor can select in a tool this framework supports.** A
model in none of them is not a pick however well it scores; the picks file's notes say
when one matters. `/refresh-model-tiers` says how the list follows the supported tools.

### What the tiers mean

Tiers are anchored on **the kind of work a plan demands**, not on parameter count or
vendor. Models move between tiers as the field changes; these definitions do not.

| Tier | Can be trusted with |
|---|---|
| **Small** | Applying verbatim specifications; following an explicit checklist; single-file edits with stated expected output. Plans under ~300 lines. |
| **Small–medium** | The above, plus coherent multi-file changes where the shape is given. Plans to ~700 lines. |
| **Medium** | Independent debugging inside a stated approach; choosing between options the plan has framed. |
| **Medium–large** | Exploratory work against an objective bar — "raise this coverage number", "make this suite pass" — where the route is not specified. Long plans. |
| **Large** | Open-ended judgment with no mechanical check: what is portable, what belongs in an entry-point file, what a deletion loses. Plans over ~1000 lines. |

The practical question: can the model hold a plan of the length this project actually
writes — 300 to 1500 lines, in both projects this came from — and follow it without
drifting?

### Agents that run no plan

`/dispatch` chooses an executor's model from its plan's tier. Two kinds of agent
Tropis starts run no plan, and run on the **Large** tier, because each does open-ended
judgement with no mechanical check:

| Agent | Its work | Where its model is named |
|---|---|---|
| A sprint's team member | shapes a backlog item, writes its plan, reviews the executor's branch | the last line of `sprint.mjs start`, `sprint.mjs add` and `sprint.mjs launch` |
| A fresh reviewer: a fresh-agent check's probe, or the reviewer of work its author built | judges, with only the repository, whether the work says and does what it should | `node .tropis/scripts/dispatch.mjs --tier Large` |

Each runs on the Large pick that costs least per task of those a subscription the
developer holds includes, the pick `/dispatch` names for a Large plan; where none is
named, on the tool's default model (FW-053).
