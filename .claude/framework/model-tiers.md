# Model tiers
<!-- layer: framework -->

Which model to hand a plan to. Tiers are anchored on the kind of work a plan demands —
the definitions are durable. Which models sit in each tier today is the project's own
data: `docs/model-picks.md`, written by `/refresh-model-tiers` and read by `/dispatch`.
The framework ships no picks, and an update never touches that file. Until it exists,
`/dispatch` names no models and says to run `/refresh-model-tiers`.

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
