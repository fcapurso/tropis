---
description: Shape a new project through conversation; write the brief and the feature catalog
---

You are running the project shaping conversation. Your job is to understand the problem
deeply enough to write a project brief and an initial feature catalog — not to build
anything yet.

Work from the **project root**. Work through the stages below in
order. Do not skip a stage. Do not proceed until the current one is complete.

Do not write a Markdown backlog, phases, or epics. Do not write docs/BACKLOG.md. Do
not suggest `/epic-start`. The catalog is the backlog.

**Verification principle:** when you check a file's existence or read current state, do
it directly — never infer from session context.

---

## Stage 1 — Preflight

Before anything else, confirm you are in the project root:

```bash
test -f .tropis/templates/project-brief.md && test -f feature-catalog.yaml && echo "PROJECT ROOT" || echo "NOT PROJECT ROOT"
```

If that is not `PROJECT ROOT`: stop. Explain that `/scope` runs from the root of the
repository `set-up-project.sh` set up, where `.tropis/templates/project-brief.md` and
`feature-catalog.yaml` live.

Then:

1. Check whether `docs/project-brief.md` already exists.

   ```bash
   test -f docs/project-brief.md && echo "EXISTS" || echo "NOT FOUND"
   ```

   If it exists: stop. `/scope` creates a new brief from scratch and must not overwrite
   one. If the developer genuinely wants to start over, they delete that file first.

2. Create `docs/` if needed:

   ```bash
   mkdir -p docs
   ```

---

## Stage 2 — Shaping conversation

Understand the problem well enough to write the brief. You are not collecting
requirements for a spec. You are answering five questions:

1. **Who has the problem?** (user/persona + context)
2. **What do they currently do?** (existing behaviour, workaround, or absence)
3. **What does success look like?** (concrete outcome, not a feature list)
4. **What are the constraints?** (time budget, tech stack, known limits)
5. **What is the core value?** (the one thing that must exist for the solution to be
   worth building — everything else is secondary)

Ask open questions and follow the conversation naturally. Do not present a form. Do not
ask all five at once. Do not offer scripted multiple-choice options. Let the developer's
answers guide which clarifying questions come next.

When you judge that you can answer all five with confidence, say so explicitly:

> "I think I have a clear enough picture to draft the project brief. Let me show you
> what I've understood before we write anything."

Then proceed to Stage 3.

---

## Stage 3 — Project brief

Read `.tropis/templates/project-brief.md` now. That file is the section skeleton
(copied by the setup). Draft `docs/project-brief.md` from it.

Keep the title and the sections **Problem**, **Appetite**, **Solution sketch**,
**Rabbit holes**, and **Out of scope**. Do not copy the HTML author-guidance comments
into the written brief — they are for you, not for the artifact.

Apply these judgements while drafting:

- **Problem:** write from the user's perspective. If the developer described it in
  builder terms ("we need to build X"), reframe it in user terms ("users currently
  can't do Y, which means Z").
- **Appetite:** translate the developer's time/scope signals into a budget. If none
  was given, propose one and explain why. Use the template's mapping from hours to
  phases as a guide for the brief only — do not turn phases into a separate backlog.
- **Solution sketch:** be deliberately rough. Name surfaces and flows, not
  implementation details.
- **Rabbit holes:** name anything that came up that sounded simple but has hidden
  complexity. If none came up, say so rather than inventing them.
- **Out of scope:** record things someone might reasonably expect that this solution
  deliberately excludes.

Show the complete draft. Explain what you chose to include or exclude and why. Then
ask, in prose, whether it captures the problem correctly — write it, or change it.
Do not present labelled options.

**STOP — wait for the answer.**

If they want a change: apply it, show the updated draft, and ask again. Repeat until
they confirm.

Do not write the file yet.

---

## Stage 4 — Feature catalog

The confirmed brief is the input. Decompose it into initial entries in
`feature-catalog.yaml`. The document **root is a YAML sequence** (a list of
entries), matching `templates/catalog.yaml` — not a mapping with an `entries:`
key. Follow the field schema already documented in that file
(copied by the setup from the blueprint catalog template).

**Status.** Every entry this command writes is `idea` or `shaped`. Never `building` or
`shipped`.

- `shaped` when you can write observable acceptance criteria with confidence.
- `idea` when the outcome is clear but the criteria are not yet. An `idea` may have an
  empty `acceptanceCriteria` array; a `shaped` entry may not.

**Shape of each entry.**

- `id` — stable kebab-case, the outcome not the mechanism. Assigned now and never
  changed.
- `title` — short display name.
- `type` — usually `feature`. Use `spike` for a question whose output is a finding.
- `layer` — `product` unless the conversation is about the framework itself or an
  upstream framework repository.
- `value` — what someone can do and why it matters, in the problem domain. Not which
  modules change, not which API to use.
- `acceptanceCriteria` — observable conditions a person could check. Not implementation
  steps. Required at `shaped`.
- `modules` — empty. Populated when the work ships.
- `refs` — omit, or leave empty, unless a spec already exists.
- `after` / `blockedBy` — use `after` for a designed sequence; `blockedBy` only when
  starting early would genuinely not work. Omit either key rather than writing an
  empty list.

Replace the seed placeholder (`example-stable-id`) if it is still present. Keep any
real entries already captured (for example via `/idea`) and add or reshape from this
conversation — do not wipe work that is already there.

Show the complete catalog draft (the entries, not a dump of the comment header).
Explain the decomposition: why you split where you did, and which entries are `idea`
versus `shaped`. Then ask, in prose, whether the catalog looks right — write both
files, or change it.

**STOP — wait for the answer.**

If they want a change: apply it, show the updated entries, and ask again. Repeat until
they confirm.

---

## Stage 5 — Write output

After both drafts are confirmed:

1. Write `docs/project-brief.md`.
2. Write `feature-catalog.yaml` (schema comments at the top of the file stay; replace
   the placeholder entry; keep any pre-existing real entries).

Report what was written. Then tell the developer:

> "The project is shaped. The brief is in `docs/project-brief.md` and the work is in
> `feature-catalog.yaml`. Use `/idea` to capture more, `/feature` to promote an entry,
> or `/next` to see what is ready."
