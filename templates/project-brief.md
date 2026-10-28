# Project Brief — [Project Name]

<!--
This document is the output of /scope. It captures the problem and solution shape
agreed during the shaping conversation, before any backlog is written. It is the
rationale artifact — future sessions can read it to understand *why* the backlog
looks the way it does.

Keep it short. A project brief should fit on two pages. If it's growing longer,
the problem isn't well-shaped yet.
-->

## Problem

<!--
Who has this problem? What do they currently do? Why is that insufficient?
Write this from the user's perspective, not the builder's.
Good: "Users track work in scattered threads, losing the link between a task
      and the request it was raised against."
Bad:  "We need to build a tracking module."
-->

[Describe the problem here]

## Appetite

<!--
How much time is this solution worth? This is not an estimate of how long it will
take — it is a budget you are willing to spend. If the solution can't be built
within the appetite, you descope, not extend.

For a solo developer using this framework, appetite maps directly to phases:
- Small appetite (< 20h) → 1–2 phases
- Medium appetite (20–60h) → 3–5 phases
- Large appetite (60h+) → 6+ phases, or consider splitting into separate projects
-->

[e.g. "60 hours across 6 development phases"]

## Solution sketch

<!--
A rough shape of the solution — enough to understand what it does and what it
deliberately does NOT do. Not a spec. No wireframes required. A few sentences
or a short bullet list per major surface.

The goal is to bound the solution so the backlog doesn't grow unbounded.
-->

[Describe the rough solution shape here]

## Rabbit holes

<!--
Known complexities that look simpler than they are. Things to avoid diving into
during implementation. Name them explicitly so they don't accidentally consume
an epic's entire budget.

Examples:
- "Real-time sync across sessions — out of scope, polling is sufficient"
- "Multi-currency conversion — use display-only, no conversion logic"
-->

- [Rabbit hole 1]
- [Rabbit hole 2]

## Out of scope

<!--
Explicit out-of-scope decisions. Things someone might reasonably expect the
solution to include but that are deliberately excluded. Writing these down
prevents scope creep and resolves ambiguity before it becomes a disagreement.
-->

- [Out of scope item 1]
- [Out of scope item 2]
