---
description: Capture a new idea in the feature catalog without refining it
---

Add an entry to `feature-catalog.yaml` with `status: idea` for what the developer just
described.

When the finding is your own rather than the developer's, first check it against the
catalog rule's *What does not become an entry*. If it falls under it, say so in one line
with the reason, write nothing, and stop.

1. Choose a stable kebab-case `id` that describes the outcome, not the mechanism, and
   a short `title` that says the same thing in plain words. The id never changes,
   including when the entry ships; the title may.
2. Write `value` functionally: what someone can do, and why it matters. Not which
   modules change. If you cannot state the user-facing value, ask — an idea whose
   value cannot be stated is not ready to capture.
3. Write `acceptanceCriteria` only if the developer stated them. An `idea` may have
   an empty array; a `shaped` entry may not.
4. Set `type` and `layer` — both required. Ask the developer rather than guess when
   the kind is not obvious from what they said.
   - `type`: `feature` (something a user can newly do), `bug` (something that does not
     work as intended), `improvement` (existing behaviour made better, and a user
     notices), `chore` (maintenance a user never notices), or `spike` (a question to
     answer — no modules, ever).
   - `layer`: `product` (the thing this repository builds) or `framework` (this
     repository's own process machinery).
5. Leave `modules` empty — it is populated when the work ships — and set `refs` to the
   spec or plan the idea came from, or leave it empty if there is none. Both are lists
   and both are required even when empty: write `modules: []` and `refs: []`, never
   leave them out.
6. The file is YAML. Quote nothing that does not need it, let long prose fold across
   lines, and put any reasoning about the entry in a `#` comment above the key it
   explains — comments are part of the record here.
<!-- project-owned: begin — how this project checks and commits a new entry. -->
7. Run the project's checks (`npm --prefix .tropis test`) and commit the catalog. If the
   checks fail on the new entry, fix the entry, not the check.
<!-- project-owned: end -->

Do not refine, plan, or estimate. Capture and stop.
