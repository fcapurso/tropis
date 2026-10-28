@.claude/framework/workflow.md

**If the line above did not expand into the development workflow, read
`.claude/framework/workflow.md` now.** `@` imports are a feature of some agent tools and
not others; a tool that does not expand them reads this file as plain text and would
otherwise get every area rule and none of the process — no preflight, no branching rule,
no merge sequence, no documentation closeout.

<!-- The import above is the only thing loaded unconditionally besides this file.
     Add a second import only for a platform layer every session genuinely needs.
     This project's additions to a framework document go in this file, because each framework version replaces `.claude/framework/`. -->

# <Project name> — project config

<!-- Two to four sentences. What the software does, for whom, and the shape of it:
     the runtime, the frameworks, the external services it depends on. Enough that
     an agent reading only this knows what kind of codebase it is in.

     Not a feature list, and not an architecture summary — those have their own
     homes and are loaded on demand. -->

## Gotchas

<!-- WRITE THIS SECTION FIRST. It is the highest-value content in the file.

     Things that are surprising, and that cost real time when got wrong. Not what
     the project is — what would trip up someone competent who has read the code.

     The test: if you cannot list three things that would cost an hour to
     rediscover, you do not yet know the project well enough to write its entry
     point. Come back after the first week.

     Good entries look like:
       - a command that must be run a particular way, and what breaks otherwise
       - a directory whose name promises more uniformity than it delivers
       - two components that must be changed together, and the guard that enforces it
       - a threshold or check that must never be relaxed, stated as a prohibition

     Each one earns its place by having already gone wrong. Remove any you invented
     by imagining what might be confusing. -->

- **<Surprising thing>.** <Why it bites, and what to do instead.>
- **<Surprising thing>.** <Why it bites, and what to do instead.>
- **<Surprising thing>.** <Why it bites, and what to do instead.>

## Setting up a working copy

Run `npm --prefix .tropis ci` after cloning. The framework is committed in this
repository — rules, commands and hook wiring in `.claude/`, its code in `.tropis/` —
so a clone is a working copy, and there is no second repository to fetch.

## Key constants

<!-- Optional. Identifiers an agent would otherwise guess wrong or hardcode:
     storage keys, field names, schema versions, flag ids. Only values that are
     referenced from more than one place and cannot be discovered from a single
     obvious file. Delete the section if there are none. -->

| Constant | Value |
|---|---|
| <name> | `<value>` |

## Load on demand

<!-- Pointers, with the condition attached to each. The condition is the point:
     "read this before X" is actionable, a bare list of filenames is not.

     Keep this accurate — the integrity guard checks that these paths resolve, and
     a dangling pointer wastes a session before it is noticed. -->

Do not read these at session start. Read the one that matches the work:

| File | When |
|---|---|
| `docs/architecture.md` | Module boundaries, seams, data flow. Before any structural change. |
| `DECISIONS.md` | **Before proposing an architectural approach.** Records what was already decided and rejected. |
| `.claude/framework/DECISIONS.md` | The same, for the framework itself. Before changing how it works. |
| `.claude/framework/doc-architecture.md` | Before adding a document, or describing current state in prose. |
| `docs/<generated feature document>` | What ships today and what is planned. Generated — edit the catalog. |
| `docs/playbooks/test-strategy.md` | Before writing tests. |

Area rules under `.claude/rules/` reach you without asking, when you first touch a file
in their area: Claude Code loads the rule whose `paths:` header covers the file. Cursor
attaches the generated `.cursor/rules/*.mdc` copy when the agent reads a file in its
area, and nothing before a read — not when it creates a file without reading one
(`.claude/framework/rule-delivery.md`) — so **in Cursor, read the area's rule yourself
before creating or changing a file you have not read.** In either tool, if you are about
to change code in an area and have not seen its rule, read it. Delivery is tool-specific
and fails silently: a hook meant to deliver these rules once reached no agent for months
while its tests passed.

## Commands

<!-- Only what an agent needs to run. One line each, with the reason where the
     obvious invocation is wrong. -->

```bash
<test command>            # <any flag that must be present, and why>
<lint command>
<generator commands>
```

## Comment philosophy

<!-- Keep or replace. This one transferred between both source projects unchanged,
     which is some evidence it is not project-specific. -->

Comment API contracts, non-obvious platform behaviour, invariants, and usage of
shared utilities. Do not narrate. A comment that restates the identifier is noise;
a module docstring that re-describes the filename is noise.

<!-- ─────────────────────────────────────────────────────────────────────────
     WHAT DELIBERATELY DOES NOT GO IN THIS FILE

     - A directory listing or repository tree. `ls` produces it, more accurately.
     - An architecture summary. It goes in the architecture document, loaded on
       demand, where it can carry diagrams and be updated by the closeout step.
     - A feature inventory. It is generated from the catalog and guarded.
     - Test strategy detail. It goes in a playbook the rules point at.
     - Area coding rules. They go in `.claude/rules/`, where the agent tool
       loads them as rules — put them here and they become part of the entry
       file every tool reads, and stop being rules a project can scope to an
       area.
     - Guidance current models do not need. Every line here is paid for on every
       session, and content the model would have got right anyway narrows its
       exploration for nothing.

     The failure this file is shaped to avoid: an entry point that grows into the
     place every learning gets appended, until nothing in it is read.
     ───────────────────────────────────────────────────────────────────────── -->
