# Commit format
<!-- layer: framework -->

```
<type>(<scope>): <short imperative summary>   (max 72 chars)

<body — what this enables or prevents, and why>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Scopes:** one per area a change can belong to, chosen once and kept short.

Choose them from the project's own top-level structure — the directories and concerns
someone would name when asked "where did this change land?" — plus `docs`, `ci`, and
one for the framework layer itself. Both projects this was extracted from had eight or
fewer and shared none of them, so there is no useful default list to copy. What matters
is that the set is closed and written down in the project's own `AGENTS.md`: an
open-ended scope vocabulary sorts nothing, because no two commits pick the same word for
the same area. Add a scope only when none on the list fits, in the commit that first
uses it, and say in its body why the existing ones don't.

## Rules

- **Every commit has a body.** Never subject-only. State the functionality and the
  intention — what someone can do now that they could not, or what failure is now
  prevented. Not a list of changed files.
- **Plan-execution merges must cite the plan document path** in the message, so the
  reasoning behind the change stays reachable from `git log`.
- Scope the message against the actual diff (`git diff main...HEAD`), not against
  the conversation. The conversation includes work that was reverted, deferred, or
  never written.

## Good and bad bodies

The question a body answers: *what can someone do now that they could not before, or
what failure is now prevented?*

- Good: "Authors get a clear message when a value cannot be resolved, instead of a
  silently empty field they have to debug against live data."
- Bad: "Add unresolved-value warning to pipeline.js and update tests."

The bad one is not wrong, it is redundant — the diff already says it, and says it more
precisely.

## What these conventions assume

**One squash-merge per unit of work.** Branch commits are working history and are
discarded at merge, so per-commit organisation reaches no one. The message that survives
is the squash message, which is why the rules above are about it.

**A project that merges without squashing should read this differently.** There, branch
commits *are* the history: each one needs a body that stands alone, and separating
application changes from framework changes into distinct commits is worth doing. Under
squash-merge that same separation asks for bookkeeping the merge throws away — which is
exactly how the rule survived one port and had to be removed on the next.

Decide which model this project uses before adopting either reading. Everything else in
this file holds under both.

## One unit of work, one thing that becomes true

Under squash-merge, the plan is the unit that reaches `main`, as a single commit with a
single message. So the only question is whether a plan is one unit of work — and it is
decided by the **specifying session when the plan is written**, never by the executing
agent and never at merge time. There is no splitting a squash.

**The test:** state what becomes true in one sentence. If you need the words *"and
also"*, it is two plans.

A plan may mix application and framework changes freely, provided it passes that test.
In practice mixed plans pass it when the framework half exists *to serve* the
application half — a catalog and the commands that operate on it; a set of rules and the
script that projects them.

Two things follow:

- **The squash message must account for everything that shipped.** The failure to avoid
  is not a mixed commit; it is a message describing half the change, leaving the rest
  undiscoverable in `git log`.
- **The scope check is the backstop.** `git diff --stat origin/main...HEAD` must contain
  only files the plan declares. A plan that quietly grew a second nature fails there,
  before the message can misdescribe it.
