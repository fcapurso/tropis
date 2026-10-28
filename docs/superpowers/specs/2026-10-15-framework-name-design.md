# The framework is called Tropis — design

Agreed with the developer on 2026-10-15, for `blueprint-tool-agnostic-name`. The search
behind the choice is recorded in the comment above that entry in `feature-catalog.yaml`.

## The name

**Tropis** — Ancient Greek τρόπις, a ship's keel. Two syllables, TRO-pis.

## The README story

Approved word for word by the developer on 2026-10-15. The naming plan puts it in
`README.md` directly under the opening paragraph, unchanged. A change to the wording goes
back to the developer first.

```markdown
## What is Tropis?

Tropis is the word for the ship's keel, in Ancient Greek (τρόπις). A shipwright lays it
first, before a single plank, and everything else is built along it. Once the ship is
afloat you never see it again, but it is what keeps the hull true, and what holds the
boat on its course when the wind pushes it sideways.

Tropis does that job in a project where agents write most of the code. You set it up
first, and from then on every change follows the same line. An idea becomes a backlog
entry. One session writes the plan and another carries it out. A reviewer checks the
result before it merges, and what the change taught is written where the next agent will
meet it. The agents change from one session to the next, and so do the tools they run
in; the keel stays. What you keep is a project that holds its shape: rules in front of
the agent when they apply, documents that cannot quietly go stale, and a record of why
things are the way they are.
```

"Rules in front of the agent when they apply" is the framework's aim, as the README's
opening states it; in Cursor it holds once `rule-areas-are-project-data` generates the
unquoted glob (`docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md`).
