---
description: Record a learning, constraint, or decision in the right layer
---

Every learning has two separate concerns:

- **Reference record** — the permanent account of the *why*: what was decided, what
  was rejected, what the platform does.
- **Operational rule** — a compact constraint in front of an agent at the moment it
  would otherwise get it wrong.

These are not alternatives. A learning recorded only in a reference document will not
reliably shape future behaviour. Work through **both phases** every time.

## Phase 1 — Find the reference destination

Stop at the first branch that fits.

**Branch 1 — Was an alternative evaluated and a choice made?**
→ `DECISIONS.md`. Include what was rejected and why; that is the part that stops a
future session from rediscovering the same dead end.

**Branch 2 — Is this a fact about how an external engine, API, or platform behaves?**
→ The relevant `.claude/rules/<area>.md`, stated as verified behaviour **with how it was
verified**. Recall is not verification: a claim about an external system needs a probe,
a document, or a measurement recorded beside it.

**Branch 3 — A coding constraint with no decision behind it?**
→ Straight to a rules file. Phase 1 is skipped; Phase 2 is the only write.

**Branch 4 — Does it change module boundaries or data flow?**
→ The architecture document, diagrams included.

**Branch 5 — Is it about work not yet done?**
→ A feature catalog entry via `/idea`, not a rule — unless the catalog rule's *What
does not become an entry* says it needs none; then say why in one line and stop.

**Branch 6 — Would this be true for any project using this framework?**
A learning about the workflow, the documentation architecture, the rule mechanism, or
the tools the framework is built from — the shell, git, the hook contract — not about
this codebase, this platform, or this domain. When in doubt, the strip test below
decides.
→ Append to the upstream queue (`docs/BLUEPRINT-UPSTREAM.md` or equivalent), **and**
apply it locally if it changes something under `.claude/framework/`.

**Something built here that a seeded project would want** — a command, a guard, a
script — is a queue line too. Do not skip the queue because porting it is work rather
than prose: the flush decides that, and turns a capability line into a shaped entry submitted to
the framework as a pull request. Deciding it at write time is how two commands were once built in one project and
recorded nowhere upstream, while a third got an entry because somebody happened to think
of it.

**An entry is one purpose.** When several changes deliver their value only together —
sent apart, one could be accepted and the other declined, and the half accepted would no
longer make sense — they are one entry: a dated line names the purpose, and each change
is a part indented beneath it, in the same format. Changes that only share a topic stay
separate entries; how to review them together is the receiving maintainer's call. Before
appending, read the queue: when the new change serves an entry already there, add it as
a part of that entry.

The test: strip every mention of this project's domain, platform, and codebase. If the
learning still says something useful, it belongs upstream. If it evaporates, it does not.

<!-- capture-check:begin -->
## Phase 2 — Assess operational reach

Three questions. Each has been got wrong on rules that were correct when written.

**1. Does it state its mechanism?** Not "do not do X", but "X causes Y because of Z".
A rule that gives only the prohibition cannot be applied to a case its author did not
foresee — the reader has no way to ask whether their situation is one of them.

> Failed once: "never hold module-level state" gave the prohibition without the
> mechanism — a serverless platform reusing warm containers across tenants — so it
> banned immutable configuration along with the mutable tenant data that was the
> actual hazard.

**2. Does it state its precondition?** What has to be true elsewhere for this to hold?
A rule ported into a project that does not satisfy its precondition fails silently —
obeyed while producing nothing, or trusted while wrong.

> Failed once: "split application and framework commits" assumed merges preserve branch
> commits. True where it came from, false under squash-merge, and nothing said so.

**3. Where is it delivered?** Ask: *would an agent violate this if they did not see it
at the moment they act?*

- **Yes** → write it in `.claude/rules/<area>.md`, opening with a `paths:` header that
  names the files it governs (`paths: ["src/area/**"]` between `---` lines). Claude Code
  loads the rule when the agent first touches a matching file; `rule-areas.test.js`
  fails a rule without a header. To widen what a shipped rule covers, change its area in
  `.claude/rule-areas.json`. To add clauses to a shipped rule, write
  `.claude/rule-additions/<name>.md` — plain text, no header, named after the shipped
  rule. Never edit the shipped text in `.tropis/rules/` or a generated file. Then
  run `npm --prefix .tropis run rules`, which writes the Cursor files and the shipped
  rules' Claude Code files, the additions following the shipped text in the one rule
  each tool loads and winning where they contradict. `npm --prefix .tropis test`
  fails while they are out of date.
- **No** → say so explicitly, with the reason.

> Failed once: a rule about plan granularity went into the commit-format document, which
> no planning session opens and no hook fires. Correct rule, unreachable location.
<!-- capture-check:end -->

## Then

1. State which branch applies and why, in one or two sentences.
2. Show the drafted reference record and the drafted rule.
3. **Ask the developer whether the placement is right, and wait.**
4. Write the reference record first, the rule second.
5. Commit according to the project's merge model — see `.claude/framework/commit-format.md`.
   Under squash-merge, separating framework changes into their own commit buys nothing;
   where branch commits survive, it does.
