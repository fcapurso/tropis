# Documentation architecture
<!-- layer: framework -->

The rule that prevents documentation rot:

> A document either states timeless rules, or it is generated from a source of truth
> in code and guarded by a test. Hand-written current-state description is not allowed.

Stale documentation is worse than none in an AI-primary codebase: a human skims past a
wrong line, a model reads it as fact and acts on it.

## The loop

    source of truth (pure data, in code)
      → renderer (pure function → Markdown)
        → generator script (I/O only)
          → committed Markdown
    guard test: regenerate and compare byte-for-byte

Splitting the renderer from the generator is what lets the guard run without touching
the filesystem. Output must be deterministic — no timestamps, stable ordering.

The guard is not optional and not a later refinement. A generated document without one
goes stale exactly as fast as a hand-written one; the only difference is that everybody
now believes it cannot.

## What goes where

| Content | Home |
|---|---|
| Timeless conventions | Rule files, which the agent tool loads without being asked |
| What the code currently is | Generated and guarded, never hand-written |
| Why a choice was made | A decision record, written when the choice is made |
| What the product does | A catalog with a lifecycle; only shipped entries guarded |
| What is planned | The same catalog, at a non-shipped status, rendered separately |

The catalog line carries the subtlety. One file holds both what ships and what is only
intended, distinguished by a status field — because an idea and the feature it becomes
are the same thing at different times, and giving them separate homes means every
promotion is a migration. **Only `shipped` entries are guarded against real code.**
Entries at any other status are intent, not claims about the product, and they render
under a separate heading. Never guard a non-shipped entry, and never let one render as
though it ships; that is how a documentation file starts lying.

## Stable identity

An entry keeps one id from the moment it is first captured, through spec, plan, decision
record, and shipped documentation. The id describes the outcome, never the mechanism, so
it survives the implementation changing under it. This is what lets a commit message,
a plan, and a feature list refer to the same thing without a lookup table.

## The closing step

Every unit of work ends by updating the affected durable artifact, or stating that none
is affected. **Its absence is the single most common cause of rot** — plan execution that
ends at "tests green, merge" leaves reference documents drifting from the code
indefinitely. The workflow's doc-closeout table is where this is enforced.

## Preconditions

- **A guard needs a test runner that runs in CI.** Without CI, the guard is a thing
  someone remembers to run, which is the situation it exists to replace.
- **The source of truth must be pure data with no imports**, or the generator, the guard,
  and any UI reading it drag a dependency graph behind them. Both projects that adopted
  this converged on the same constraint independently.
- **Determinism is the whole basis of the byte-for-byte comparison.** A renderer that
  emits a timestamp, iterates an unordered map, or localises a date turns the guard into
  a source of spurious failures, and a guard that cries wolf gets disabled.
