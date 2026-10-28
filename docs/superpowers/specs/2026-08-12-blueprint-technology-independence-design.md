# Blueprint Technology Independence — Design

**Date:** 2026-08-12
**Status:** Approved (brainstorm complete, plans pending)
**Scope:** `../claude-project-framework` (the blueprint) and this repository's own framework
machinery. Six plans, executed and merged one at a time in the order below.
**Input:** `docs/superpowers/specs/2026-08-11-blueprint-technology-scope-brief.md`
**Catalog arc:** the six entries in §6 share this file's path in `refs`, which is what makes
them one arc (`next-work.js:134-150` groups by shared `/specs/` reference).

---

## 1. Problem

The blueprint presents as a project-and-technology-independent development framework. A
material part of what it ships assumes JavaScript, Node, npm and Jest. Nobody decided that;
it was inherited from the project the framework grew in, and `PORTABILITY-NOTES.md` closes
by conceding the evidence behind the whole extraction is "a sample of two" — two
JavaScript/TypeScript projects on one hosting platform with one test runner.

Three things cannot be written honestly until this is settled, and one lesson from the
2026-08-01 flush has nowhere to land because of it.

### 1.1 What the brief got wrong, and why it matters

The brief's evidence table binds the guards to Jest and treats that as a language binding.
Checked against both repositories on 2026-08-12, that is not what is happening.

**No guard the blueprint ships reads a line of project source.** Every path the five of them
resolve is under `.claude/`, `docs/`, `CLAUDE.md`, or the injection hook. They are text
analysis over the instruction layer, and the adopting project's language is not a variable
they can see. The one guard that *would* read project source, `rule-claims`, already ships as
a template rather than a guard, for exactly this reason.

| Guard | What it reads |
|---|---|
| `framework-integrity` | `.claude/rules/`, `.claude/framework/`, `.claude/commands/`, `inject-rules.sh`, `CLAUDE.md` |
| `doc-currency` | `docs/**.md`, `.claude/**.md` |
| `review-record` | `docs/superpowers/plans/` |
| `rule-delivery` | executes `inject-rules.sh` against synthetic paths |
| `cursor-rules-projection` | the rule files and their generator |

**Nor is Node a new kind of assumption.** `inject-rules.sh:38` — the central mechanism of the
entire framework — shells out to `python3` to parse its JSON payload, as do
`capture-at-merge.sh` and `framework-commit-check.sh`. `bootstrap.md:15` has listed `python3`
as a prerequisite since it was written. The blueprint has never been runtime-independent. It
has been runtime-*unstated*, which is a different and worse condition, because an adopter
cannot plan around an assumption nobody wrote down.

So the real boundary is not `blueprint ↔ JavaScript`. It is `blueprint ↔ a set of tools on
the developer's machine`, and that set already had three members.

### 1.2 What actually breaks

Two things, both narrower than the brief states:

1. **The guards must run inside the adopting project's single test command.** For a
   JavaScript project Jest collects them for free. For any other project they are a second
   command unless something wires them in — and "a second suite is a suite that gets
   skipped" is the framework's own rule (`split-framework-and-project-backlog`, criterion 5).
2. **The catalog is a JavaScript module.** `templates/catalog.js` and this repository's
   `src/shared/feature-catalog.js` are `.js` files holding pure data. Framework tooling in
   another language cannot read them without a JavaScript runtime, and a human reading a
   1500-line file of string concatenation is not reading data.

---

## 2. The decision

Recorded as **FW-005** in the blueprint's own `framework/DECISIONS.md`, continuing its local
sequence. That file's header requires cross-project citation by title, never by number, so
this repository refers to it as *"Independent of the project's technology, opinionated about
its own"*.

### 2.1 The claim

The blueprint is **independent of the language, runtime, and toolchain of the project it
governs**, and **deliberately opinionated about the tools the framework layer itself runs
on**: `git`, `bash`, `python3`, and `node`.

The load-bearing distinction is between a **developer-machine tool** and a **project
dependency**. The four above appear in no project manifest, are imported by no project code,
and constrain the project's language not at all.

### 2.2 What it ships

- **Prose**, which binds to nothing and is the bulk of the value.
- **Mechanisms** in `bash` + `git` + `python3`.
- **Guards and commands as specified properties**, each with a Node **reference
  implementation**. The `.js` file is an implementation of the definition, not the
  definition.
- **A catalog schema** with one canonical interchange format, **YAML** — chosen because it
  preserves comments, which this framework uses load-bearingly, and because Node and Python
  read it natively. A project may hold its backlog in another representation provided it can
  produce the canonical one, so the reference tooling and the shared fixtures still apply.
- **A conformance fixture tree**: a deliberately broken project, shipped as inert data. Every
  correct implementation of a property must catch its planted defect.

### 2.3 What it refuses to ship

- **Rule content.** Refuted by its own evidence: five rule files shared a filename across the
  two source installations and not one shared a sentence. Only the convention ports.
- **A test runner or package manifest of its own.** Conformance is proven at install time, in
  the project that will use the guards, where a runner already exists. A blueprint running
  its own suite would only prove its files work in the blueprint.
- **Anything that reads the adopting project's source.** This is the structural fact the
  whole claim rests on. A shipped guard that broke it would break the claim.

### 2.4 Where things live

Two placement rules the blueprint does not currently draw, both of which follow from the
claim:

- **`.claude/` is for tool-specific delivery machinery** — the hook, `settings.json`, the
  injected rules, the slash commands. Those genuinely are one agent tool's mechanism.
- **Tool-neutral framework data does not go there, and does not go in the application's
  source tree either.** The catalog lives at the repository root. It is read by tooling, read
  by the developer in every diff an agent makes to it, and belongs to neither the app nor any
  one vendor.

### 2.5 What an adopter on an unsupported stack gets

Not "you are on your own". They get the properties, the fixture tree, and a working
implementation to read. What they supply is the implementation in their own language, proven
correct by the same fixtures that prove every other implementation. A project that would
rather not reimplement can call the Node reference implementations from its own suite as a
subprocess. Both paths keep framework checks inside the project's single test command, which
is the constraint that matters.

### 2.6 Evidence standard

This claim does **not** rest on a port. It rests on a structural property of the artifact —
no shipped guard reads project source — which is mechanically checkable and will be checked
(step 5 states it as a property, step 6 plants a defect against it). That is stronger evidence
than the sample of two behind `PORTABILITY-NOTES.md`, because it is a property of the thing
rather than an observation about two uses of it.

It rests on **no experience of a non-JavaScript installation**, and does not pretend
otherwise. The squash-merge and single-developer assumptions remain exactly as untested as
`PORTABILITY-NOTES.md` already says.

**What would widen it:** a third installation in another language, testing three things this
cannot — whether the properties are complete enough to reimplement from, whether the fixture
tree actually catches a wrong reimplementation, and whether YAML survives a project whose
tooling prefers otherwise. Until one exists, there is **no public commitment**.

### 2.7 Alternatives rejected

| Rejected | Why |
|---|---|
| Scope down to "a framework for JavaScript projects" | Discards value that is demonstrably there — no guard reads project source, so nothing about them requires JavaScript in the project. |
| Ship behaviour specifications with no reference implementations | More machinery than one developer across two projects justifies. The fixtures deliver conformance without it. |
| JSON for the catalog | Loses comments. This repository's catalog carries reasoning in them — the `after:` re-pointing note on `split-framework-and-project-backlog` is a comment, and would be lost. |
| Leave the catalog as a JavaScript module | Works, but is unreadable to a reimplementation and reads as an accident in a repository with no other JavaScript. |
| Keep the catalog under `.claude/` | Extends one vendor's branding to neutral data, and hides in a dotdir a file the developer reads. |

---

## 3. The arc

Six steps. The ordering is deliberate: **this repository migrates before the blueprint
canonises**, so the blueprint adopts a format that has been field-tested rather than one that
was reasoned about. That is the same method `PORTABILITY-NOTES.md` used to draw the original
generic/specific boundary — convergence and evidence over inspection — applied to a decision
the original method could not reach.

| # | Entry id | Layer | Order | What becomes true |
|---|---|---|---|---|
| 1 | `blueprint-technology-scope` *(exists)* | blueprint | — | The blueprint states what it claims, on what evidence, and what a non-Node adopter gets. |
| 2 | `catalog-as-portable-data` | framework | `after` 1 | This repository's catalog is language-neutral data at the repository root, and every consumer reads it from there. |
| 3 | `blueprint-defines-catalog-schema` | blueprint | `blockedBy` 2 | The blueprint defines the catalog as a schema with one canonical format, and ships the template in it. |
| 4 | `blueprint-backlog-command` | blueprint | `blockedBy` 3 | A seeded project can ask what to work on next. |
| 5 | `blueprint-states-its-properties` | blueprint | `after` 4 | Every guard and command is defined by what it must do; the `.js` file is a reference implementation. |
| 6 | `blueprint-conformance-fixtures` | blueprint | `blockedBy` 5 | A reimplementation in any language can be proven correct against a deliberately broken project. |

`blockedBy` on 3, 4 and 6 because starting early genuinely does not work: 3 would canonise a
format nothing has proven, which defeats the ordering; 4 has no format to read; 6 has no
properties to plant defects against. Steps 2 and 5 are designed order only.

---

## 4. The steps

### Step 1 — `blueprint-technology-scope`

**Becomes true:** the blueprint states what it claims to work with, on what evidence, and what
an adopter on an unsupported stack should expect.

Writes §2 of this document into the blueprint as FW-005, and brings three documents into line
with it:

| File | Change |
|---|---|
| `framework/DECISIONS.md` | FW-005, from §2 |
| `README.md` | "It assumes git, and an agent tool that supports pre-tool hooks and a project entry file" understates the dependencies — it does not mention the `python3` that `bootstrap.md` already requires |
| `PORTABILITY-NOTES.md` | Its closing *"What this evidence does not cover"* section now has a position rather than a concession |
| `bootstrap.md` | The prerequisites line, and its "Steps 6 and 7 additionally need a JavaScript test runner" clause, which FW-005 supersedes |

**Also, in this repository** (a catalog edit, which is the same thing becoming true — the
decision is what these entries were waiting for):

- Re-point the three waiting entries per §6.2.
- Add the misplaced-machinery inventory from §5.3 to `split-framework-and-project-backlog`'s
  acceptance criteria, so whoever shapes it does not reconstruct the list.
- Correct `.claude/rules/shared.md` and `.cursor/rules/shared.mdc`: they say "Eight framework
  guards live in `__tests__/`" and there are ten — the count omits `next-work.test.js` and
  `render-feature-docs.test.js`.

**Add a fifth acceptance criterion** to the existing entry, since FW-005 carries mechanism
decisions its current four do not reach:

> The mechanisms the claim depends on — how a guard is defined, how an implementation is
> proven, what format the catalog is in, and where it lives — are each decided and recorded,
> so the arc's later steps can be written without re-opening them.

### Step 2 — `catalog-as-portable-data`

**Becomes true:** this repository's feature catalog is language-neutral data at the repository
root that a person can read and any language can parse, and every consumer reads it from
there.

**Shape.** `src/shared/feature-catalog.js` stays the module all four consumers import. Its data
array is replaced by a read of `feature-catalog.yaml` **at the repository root**. `STATUSES`,
`TYPES`, `LAYERS`, the named and default exports, and the JSDoc typedef block — which *is* the
schema documentation — all survive unchanged. No import site is edited; a new module path
would touch four files and buy nothing.

**Acceptance is mechanical.** `feature-catalog-coverage.test.js` — *"docs/FEATURES.md matches
what the catalog renders"* — regenerates and compares byte-for-byte. The migration is correct
exactly when `npm run docs:features` produces a byte-identical file. That is the only check
that can prove the data survived, and it beats reviewing every entry by eye.

**What is on the other side of it** — each of these must be in the plan's File Structure table
or the plan forbids work it also demands:

| File | Why |
|---|---|
| `.claude/rules/shared.md` + `.cursor/rules/shared.mdc` | "Catalogs (`token-catalog.js`, `feature-catalog.js`) are pure data with no imports. Keep them that way." Stops being true of the feature catalog. |
| `src/shared/__tests__/rule-claims.test.js` | Its `catalogs.md — the catalogs are pure data with no imports` block asserts that claim for both catalogs by name. Narrows to `token-catalog.js`. |
| `.claude/rules/catalogs.md` + `.cursor/rules/catalogs.mdc` | Name and location of the catalog change under them. |
| `.claude/commands/idea.md`, `.claude/commands/feature.md` | Both instruct editing the catalog; the format changes. |
| `.claude/scripts/inject-rules.sh` | Its branch firing `catalogs.md` names `src/shared/feature-catalog.js` by path. |
| `scripts/generate-cursor-rules.mjs` | Its `GLOBS` table maps `catalogs.md` onto the same two paths, and `framework-integrity` check 3 requires the hook and the glob map to agree. |
| `src/shared/__tests__/rule-delivery.test.js` | Its `CASES` table asserts that path emits `catalogs.md` and `shared.md`. It runs the hook, so it fails for real if the branch moves without it. |
| `.cursor/rules/catalogs.mdc` | Regenerated from the glob table; `cursor-rules-projection.test.js` compares them. |
| `package.json` | A YAML parser — the first non-builtin dependency any framework tooling has had. |
| `DECISIONS.md` (root) | A real choice between alternatives, citing FW-005 by title. |
| `docs/file-inventory.md` | Names the catalog's path. |

**Traps.**

1. **`token-catalog.js` does not migrate.** Only the feature catalog moves. `TokenHelpModal.jsx`
   imports the token catalog into the browser, so it must stay a pure JS module with no
   imports — that half of the rule and that half of the `rule-claims` assertion are still true
   and must survive. An executor doing the obvious symmetric thing breaks the frontend. **This
   is the trap most likely to be sprung.**
2. **String concatenation joins are single spaces, and YAML must reproduce them exactly.** A
   folded scalar (`>`) joins lines with one space, which matches — but its handling of trailing
   whitespace and blank lines does not. This is the most likely source of a byte diff, and it
   is why the byte-identical check is the acceptance criterion rather than a nicety.
3. **The loader must not cost coverage.** `jest.config.mjs` collects from `src/**/*.js` at an
   80% backend branch threshold, and lowering a threshold to go green is forbidden. A loader
   with no branches is safe; one that grows fallbacks is not.
4. **Comments are data here.** At least two entries carry load-bearing comments — the `after:`
   re-pointing note on `split-framework-and-project-backlog` and the note on
   `blueprint-readme-usable`. They must survive as YAML comments.

**Judgment already made:** the parser is `yaml`, not `js-yaml` — no dependencies of its own, and
it can round-trip comments if a generator ever needs to write entries. Nothing writes the
catalog programmatically today (`/idea` and `/feature` are agents editing text), so this is not
load-bearing.

**Deliberately not in this step:** the loader stays at `src/shared/feature-catalog.js`. Moving
the machinery is `split-framework-and-project-backlog`'s job. Step 2 moves the data only.

### Step 3 — `blueprint-defines-catalog-schema`

**Becomes true:** the blueprint defines the catalog as a schema with one canonical interchange
format, and ships the template in it.

- `templates/catalog.yaml` replaces `templates/catalog.js`, same example entry, field comments
  intact.
- **A new `rules/catalogs.md`** — the blueprint's third project-independent rule file. The field
  set, the four statuses and the exact moment each transition happens, `layer`, `shelved`,
  `after` / `blockedBy` / `supersededBy`, and the regenerate-in-the-same-commit rule. Plus the
  format statement: YAML is canonical, and a project may hold another representation provided
  it can produce the canonical one.
- The hook's placeholder branch. `scripts/inject-rules.sh` already carries
  `src/shared/CATALOG.js) emit catalogs.md shared.md` — a branch for a rule file the blueprint
  does not ship. This step closes that, and updates the placeholder path to a root-level
  catalog.
- `commands/idea.md`, `commands/feature.md` placeholders; `bootstrap.md` step 6;
  `PORTABILITY-NOTES.md` recording that a prior exclusion was reversed and why.

**This looks like it contradicts bucket 4 finding 1** ("any future attempt to ship a standard
rule set with this blueprint is refuted by its own evidence") and does not. That finding
concerns rules describing a *project's code*, which is why five same-named rule files shared no
sentence. Catalog rules describe the framework's own data model — the same category as
`learnings.md`, a rule about rules, and `planning.md`. The 2026-08-01 flush excluded this
material as **out of scope**, not as unportable. Say so in the flush note.

**To settle while shaping:** `layer: 'blueprint'` means "work belonging to an upstream framework
repository", which is meaningless in a seeded project with no upstream. Define the three layers
as *the product*, *the framework as installed here*, and *an upstream framework repository if
one exists*, with the third optional.

### Step 4 — `blueprint-backlog-command`

**Becomes true:** a seeded project can ask what to work on next.

`commands/next.md`, `scripts/next-work.js`, `scripts/next.mjs`. This is where the brief's
"unported, not unportable" claim is made true: `next-work.js` has zero imports and is pure
functions over a catalog array, so it ports unchanged; `next.mjs` couples only to node
builtins, two relative paths, and now a YAML parse.

`bootstrap.md` gains the wiring step and names the parser dependency for both paths — `yaml`
for the Node reference implementation, `pyyaml` or equivalent for a reimplementation.
`README.md` gains the command.

### Step 5 — `blueprint-states-its-properties`

**Becomes true:** every guard and command the blueprint ships is defined by what it must do,
and the `.js` file is a reference implementation rather than the definition.

**One document at the repository root, `CONFORMANCE.md`**, pairing with the fixtures step 6
builds. One document rather than per-file headers, because a port does not take the `.js` files
and headers would reach nobody. Eleven items: five guards plus the `rule-claims` template, and
six commands.

`framework-integrity.test.js` already carries an `ADOPTING THIS` block listing its four
properties. That is the model; it moves into the document.

**Properties are written as what must be caught, never how.** That discipline is the only thing
that makes step 6 constructible.

`rule-claims` is reclassified honestly here. Its property is perfectly specifiable — *every
falsifiable claim a rule makes about the code has an assertion, and every unfalsifiable one is
listed with its reason* — while its implementation is unportable by construction, because the
assertions are claims about one codebase. It is a template not as a compromise but because
that is what it is.

### Step 6 — `blueprint-conformance-fixtures`

**Becomes true:** a reimplementation of any guard in any language can be proven correct,
because the blueprint ships a deliberately broken project that every correct implementation
must catch.

A `fixtures/` tree shaped like a seeded project — `.claude/rules/`, `.claude/framework/`,
`.claude/scripts/inject-rules.sh`, `.claude/commands/`, `CLAUDE.md`, `docs/superpowers/plans/`,
`feature-catalog.yaml` — as a **clean baseline plus one overlay per planted defect**, each
overlay holding only the files it changes. Overlays rather than full variant trees keeps it
small, at the cost of a short runner that composes baseline plus overlay into a temporary
directory. That runner is itself a reference implementation, specified in `CONFORMANCE.md`
like everything else.

Defects to plant, one per property: an orphan rule no branch names; a branch naming a missing
rule; a dangling backtick path; a document asserting current state; a stale `Last verified`;
a plan with a handover and no review record; a hook ladder where a broad branch shadows a
narrow one; a `shipped` entry whose module path does not exist; a rule and its projection out
of sync.

`root` becomes injectable in all five guards — currently `resolve(here, '../../..')`, becoming
`process.env.FRAMEWORK_ROOT ?? resolve(here, '../../..')`. An environment variable is the one
mechanism that works across runners *and* across languages. `bootstrap.md` gains a conformance step after step 7, and the checklist gains
its line.

**Traps.**

1. **A seeded project's own guards must skip `fixtures/`.** The tree contains a `.claude/` and a
   `CLAUDE.md` full of deliberate defects; once bootstrap copies it in, `framework-integrity`
   and `doc-currency` would scan it and fail on planted breakage. The pattern already exists —
   `doc-currency.test.js` skips `worktrees/` and `superpowers/` for exactly this reason, with
   the reasoning written out.
2. **`doc-currency`'s staleness check is clock-relative.** A fixed date in the baseline goes
   stale on its own and turns the clean case red. The baseline omits `Last verified` entirely;
   only the must-catch overlay carries one.
3. **`rule-delivery` executes the hook**, so the fixture tree needs a real, executable
   `inject-rules.sh`. Still inert from the blueprint's side — nothing there runs it — but say
   so, or the "nothing in the blueprint runs" trap from the 2026-08-01 plan gets misapplied.

---

## 5. Verified facts the plans rely on

Checked 2026-08-12. Stated as invariants where the argument depends on them, because a plan is
verified against the repository as it stands and executed against it after the plan has landed.

### 5.1 Structural, and load-bearing

- **No guard the blueprint ships reads project source.** Every resolved path is under
  `.claude/`, `docs/`, `CLAUDE.md`, or the injection hook.
- **The blueprint has no `package.json` and no test runner.** Nothing in it executes.
- **`inject-rules.sh`, `capture-at-merge.sh` and `framework-commit-check.sh` all require
  `python3`**, and `bootstrap.md` lists it as a prerequisite.
- **`src/shared/next-work.js` has zero imports** — pure functions over a catalog array.
- **Nothing in the application imports `feature-catalog.js`**; only generators, guards, and
  `scripts/next.mjs` do. Recorded already in `.claude/rules/shared.md`.
- **`token-catalog.js` *is* imported by the application** — `TokenHelpModal.jsx` — so it must
  remain browser-safe.
- **Blueprint-layer entries are exempt from the shipped-entry `modules` requirement**
  (`feature-catalog.test.js`), with the reasoning written in the guard. Step 2 is `framework`
  layer and is not exempt.
- **An arc is entries sharing a `/specs/` path in `refs`**, ordered by `after`, and requires
  more than one entry to register.

### 5.2 Counts, true on 2026-08-12 and not to be relied on later

`src/shared/feature-catalog.js` is 1535 lines with 267 concatenation joins. There are ten
framework test files in `src/shared/__tests__/`. `feature-catalog.js` has four import sites.

### 5.3 Framework machinery currently mixed with application files

Needed by step 1, which adds it to `split-framework-and-project-backlog`:

| | Files |
|---|---|
| Data | `src/shared/feature-catalog.js` — moves in step 2 |
| Pure logic | `src/shared/next-work.js`, `src/shared/render-feature-docs.js` |
| Guards | `src/shared/__tests__/`: `framework-integrity`, `rule-claims`, `rule-delivery`, `cursor-rules-projection`, `doc-currency`, `review-record`, `feature-catalog`, `feature-catalog-coverage`, `next-work`, `render-feature-docs` |
| Scripts | `scripts/next.mjs`, `scripts/generate-cursor-rules.mjs`, `scripts/generate-feature-docs.mjs` |
| Config | `jest.config.mjs` — `collectCoverageFrom: src/**/*.js` minus frontend and tests, so framework tooling counts toward the application's 80% branch threshold |

---

## 6. Catalog changes

### 6.1 New entries

Five, all sharing this file's path in `refs`. Ids, layers, types and ordering per §3. Step 1
uses the existing `blueprint-technology-scope` entry, amended.

| Entry | Type | Layer |
|---|---|---|
| `catalog-as-portable-data` | chore | framework |
| `blueprint-defines-catalog-schema` | improvement | blueprint |
| `blueprint-backlog-command` | feature | blueprint |
| `blueprint-states-its-properties` | improvement | blueprint |
| `blueprint-conformance-fixtures` | feature | blueprint |

### 6.2 Re-pointed entries

| Entry | Today | Becomes | Why |
|---|---|---|---|
| `blueprint-project-bootstrap` | `after: ['blueprint-technology-scope']` | `after: ['blueprint-conformance-fixtures']` | Promises a seeded project passes the guards immediately, which needs steps 3 and 6 |
| `blueprint-readme-usable` | `after: ['blueprint-technology-scope']` | `after: ['blueprint-states-its-properties']` | Documents the commands, which are not settled until step 5 |
| `split-framework-and-project-backlog` | `after: ['blueprint-absorb-framework-hardening']` | `after: ['blueprint-backlog-command']` | Step 4 settles where the blueprint says framework machinery lives; the split then follows a settled convention instead of inventing one |

### 6.3 Outside the arc

One new entry, `blueprint-test-design-rules`, with no `after`: the surviving row in
`docs/BLUEPRINT-UPSTREAM.md` — *a unit test that mocks the state its own upstream caller writes
cannot see a contract break between them* — lands as a small third rule file in the blueprint.
It passes the extraction test cleanly, naming no language, platform, or domain, and it depends
on none of these six steps. Blocking it behind five of them would be arbitrary.

### 6.4 A consequence to expect

Five of the six arc entries are `layer: 'blueprint'`, which `ready()` excludes and `nextStep()`
therefore cannot return. After step 2 ships, the arc reports as "elsewhere" in `npm run next`
and steps 3 to 6 are driven by hand. That is the layer rule working as designed, not a defect.

---

## 7. Execution

One plan per step, written and dispatched **one at a time**: the specifying session writes the
plan and the kick-off prompt, the developer dispatches it, the branch comes back, the
specifying session reviews and merges before the next plan is written. Each plan states its own
model tier and merge authority.

No plan carries self-merge authority. Two reasons hold across the whole arc: nothing in the
blueprint can be verified by running it, so a human-shaped review is the only check on whether a
generalisation reads correctly to someone who has never seen this project; and every step has a
catalog closeout in *this* repository that the executing agent must not touch.

Step 2 is the exception in kind rather than in authority — it runs entirely in this repository,
it has a mechanical acceptance criterion, and it is the only step with a real test suite behind
it.

**Doc closeout obligations across the arc**, so no plan omits one:

| Step | Owes |
|---|---|
| 1 | Blueprint `framework/DECISIONS.md`; catalog re-pointings; rule correction + `.mdc` projection |
| 2 | This repository's root `DECISIONS.md`; `.claude/rules/` edits paired with their `.cursor/rules/*.mdc`; catalog entry to `shipped` with regenerated `docs/FEATURES.md`; `docs/architecture.md` if the loader changes data flow enough to matter |
| 3–6 | `PORTABILITY-NOTES.md` in each case; catalog entry to `shipped` with regenerated documentation |

Every step touching `.claude/rules/` or `.claude/framework/` in this repository owes a
fresh-agent check with its outcome in the commit body, per `.claude/framework/workflow.md`.
Steps 1 and 2 both do.

---

## Amendment — 2026-08-15: steps 5 and 6 reshaped

**Steps 1 to 4 are unaffected and shipped.** This amends what the last two steps do, and
supersedes §4's descriptions of them. The original text above is left as written, because
a design record that is edited to match the present cannot show what changed.

### What was wrong

§4 step 5 asked for a written definition of what every guard and command must do, so a
project on an unsupported stack could reimplement them. FW-005 — merged in step 1 — states
that `node` is a required tool, on the same footing as `git` and `bash`.

**Those two cannot both be load-bearing.** If `node` is a precondition, the person who
would reimplement the guards in another language is someone who has declined a
precondition. Writing nine definitions to serve them is substantial work for a reader the
decision already ruled out.

There is a second problem, and it is the argument this design already used against
specifying the prose commands: a written description of what code must do, sitting beside
that code, is a second copy of the same statement. When the two disagree neither looks
wrong. This framework's own evidence is that copies drift silently — five rule files
across two installations shared a filename and not one sentence, and nobody noticed until
they were compared.

**Requiring the tooling and checking it is strictly better than describing an alternative
to it**, because a check fails loudly and a paragraph does not.

### What replaces it

**Step 5 becomes `framework-states-what-it-requires`.** Two halves of one thing — a project
can tell, before it starts, whether this framework will work for it, and finds out loudly
rather than silently when something is missing:

- A prerequisites script that reports which required tools are present and how to install
  the ones that are not. Written in `bash`, because it has to run before anything else is
  confirmed and cannot be written in the language it is checking for.
- One written statement of what rule delivery must achieve. **This is the one description
  that survives the argument above**, because its portability problem is not about the
  language: one agent tool runs a script before every file read, another matches file
  patterns, a third may do neither. No runtime fixes that, and when it fails it fails
  silently — a defect of exactly that shape went unnoticed here for six months.

The five guards, the backlog command and the projection generator get **no** written
definition. They are code, they run on a required tool, and the fixture tree is what proves
they work.

**Step 6 keeps its shape and changes its justification.** The deliberately broken sample
project is no longer there to let a reimplementation prove itself. It is there to prove a
check **can fail** — which is the defect that has recurred most while this arc was being
built: nine verification checks written across five plans could not have failed, or
returned a number their author had not counted. A guard that passes tells you nothing until
you have seen it fail on purpose.

### What this costs

FW-005 is amended in step 5, not left standing. Its promise to an adopter without `node`
changes from *"here are the properties, reimplement from them"* to *"install it; here is a
command that tells you what is missing"*. The evidence-standard paragraph is unaffected —
the claim still rests on the structural fact that no guard reads project source.

The catalog entry `blueprint-states-its-properties` is superseded rather than rewritten, so
that the outcome this arc decided against stays visible.
