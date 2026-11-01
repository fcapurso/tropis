# Catalog rules (the backlog)
<!-- layer: framework -->

The backlog is the source of truth for what this product does and what is planned. Its
readable view is the backlog board, docs/backlog-board/index.html: one page built from
the backlog, which rebuilds itself without banding anything at every commit, merge,
checkout and rebase, through the git hooks `npm --prefix .tropis install` writes, and is
never committed. After an edit not yet committed, `npm --prefix .tropis run board`
rebuilds it at once.

- **Keep no other readable view of the backlog.** A change to the backlog commits the
  backlog alone: no page, and no document generated from it. A project that already
  generates its own document from the backlog, such as a feature list or a roadmap page,
  replaces it with the board through an entry of its own, which removes the generator,
  its guard, the document and every instruction to run them together. Until that entry
  ships, keep following those instructions; then there is one view.
- Never edit or commit the board's page. Change the backlog, and the page follows.
- **A generated region inside a hand-written page gets the same guard.** Where a page
  people write by hand must carry a generated reference, mark the region with two comment
  markers, have the generator rewrite only what lies between them, and compare that
  region byte-for-byte against a fresh render — the guard a wholly generated document
  gets. Never hand-edit between the markers. The page stays prose, and the reference
  cannot go stale.
- An entry may only reach `shipped` when every acceptance criterion is covered by an
  automated test or a recorded entry in `docs/verification-log.md`, drafted and recorded
  through `/manual-check`. If a criterion has neither, the entry does not ship — say so
  rather than promoting it.

  **A criterion about what a fresh agent session receives or answers has a third
  route:** a fresh-agent check recorded with its tool, version, operating system and
  architecture, in the commit body or review record that ships the entry. That is where
  the workflow already records those checks, and neither a test nor the log can hold
  one — a test cannot start a session, and the log is for what a person sees. Name the
  commit or record in a comment above the entry.
- **A criterion only the developer can observe does not hold the entry back.** The rule
  above and the delivery guard pull opposite ways the first time a plan merges with an
  observation still outstanding: this file says do not promote, while, where the project
  runs one, a guard that every Delivers id on an executed plan is shipped turns the
  branch red if you do not. **Where that guard runs, it wins.** Where it does not, make
  the same choice by hand. `shipped` says the code landed, not that every eye has been
  on it. Record the unobserved criterion in the review record's *Outstanding
  disposition*, naming who must observe it, and record the observation in
  `docs/verification-log.md`, through `/manual-check`, when it happens.

  Got wrong in both directions on one plan. Its executor left the entry short of
  `shipped`, then promoted it while writing the review record to keep the branch green —
  and the record's own summary two sections below still claimed the entry was not being
  shipped on an unbacked criterion. The check had in fact been run and reported in
  conversation; nothing wrote it down, so three separate records said outstanding while
  the developer believed it closed.
- Comments are part of the record. Say why an entry was re-pointed, shelved, dropped, or
  ordered the way it is, in a comment above the key it explains.
- **`refs` names the design the entry belongs to, and nothing else.** The backlog report
  treats every spec cited by more than one entry as an arc and reports how far it has
  got, so a grooming or review spec cited on each entry it touched shows as a false arc
  of unrelated work. Name such a document in a comment above the entry instead.
- **Three things in an unquoted value break the YAML.** A colon followed by a space
  reads the rest of the line as a nested mapping, and the catalog check fails with
  "Nested mappings are not allowed in compact mappings". A space followed by `#` starts
  a comment, which on a value's last line drops the rest of the value with no error at
  all. A value that begins with a backtick, or with a quotation mark that does not close
  the whole value, fails; one that begins with another YAML indicator, such as `*`, `&`,
  `!`, `[` or `{`, fails or parses as something else. Rephrase, or put the whole value
  in double quotes. These are what needs quoting where a backlog command says to quote
  nothing that does not need it.

## What does not become an entry

A finding — from a review, a handover, a fresh-agent check, or work in passing —
becomes an entry only when it would otherwise be lost. Two kinds would not be:

- **An improvement the next agent in that area would make on the spot.** If whoever
  next works there would see it and do it without being told — name the evidence a
  criterion needs, reword a sentence, pick the obvious default — an entry only adds a
  row someone must later read, band and close.
- **A bug of little or no impact that the normal flow would catch and neutralise.** If
  the ordinary next step — setup's own commit, a suite run, a review — would surface it
  and make its consequence disappear, leaving it costs nothing.

**A bug that fails silently is always an entry.** A hook that emits nothing, a check
that cannot fail, a rule that is false about the code: the normal flow never catches
these, because nothing in it looks wrong. When unsure whether the flow would catch a
bug, it is an entry.

**A drop is a decision, and it carries a reason in one line** where the finding was
reported — the review record's *Outstanding disposition*, the handover report, or the
reply to the developer. A finding with neither an entry nor a reason has not been
dealt with. When the developer asks for an entry, it is captured; this section is for
findings an agent raises itself.

In the five days to 2026-10-20 the backlog this came from gained 49 entries and
shipped 21. One review filed two for a single shipped entry: a warning that was wrong
only before setup's own commit, and a gap the reviewer had already filled by hand.
Both were dropped the same day.

**A finding worth keeping is captured as a backlog entry, and nowhere else instead.** A
task card, or a side or background session of the agent tool, is seen by neither the
backlog, its report nor its board, so the work it holds is planned by nobody and found
only by whoever opens that tool. Capture it with `/idea`, and tell the developer if it
matters now.

**A fix an agent proposes on its own starts as an idea entry, and is shaped before any
branch or plan is made for it.** That holds for a fix to the project's own process
machinery too; work the upstream framework must do goes to the upstream queue instead
(*Layers*). The developer then decides whether and when it is done, rather than finding
it under way. Work the developer asks for directly is not proposed by the agent, and
neither paragraph applies to it.

Both were corrected in the framework's own repository before they were written here: a
guard defect raised as a background task card instead of an entry, and defects found by
a model-tier refresh taken straight to a branch and then a plan, until the developer had
asked twice where the entry was.

## Status transitions

Status changes hands at fixed moments, not whenever it feels right:

- `idea` → `shaped` when acceptance criteria are written, before implementation.
- `shaped` → `building` **when its plan is dispatched**.
- `building` → `shipped` **when its plan merges**.
- `building` → `shaped` if the plan is abandoned; nothing stays `building` without a plan.
- `idea` or `shaped` → `dropped` when it is decided the work will not be done (see
  *Dropping*).

**A promotion to `shipped` removes `blockedBy`.** An entry that has landed cannot be
waiting for anything, and `.tropis/guards/catalog-entries.test.js` rejects any shipped
entry that still records a blocker, whether or not that blocker has itself shipped.
Delete the field as part of the promotion, in the same edit.

`after` is not touched. It records the order the work was designed in, which stays true
after the work is done.

An entry stuck at `building` with no open branch is the signal that something was
dropped — but only if this transition is actually made.

## Layers

Every entry says where the work happens: `product` or `framework`.

Work the upstream framework must do is not recorded here — it goes to the upstream queue
and reaches the framework's own backlog through `/flush-upstream`. A project still
holding entries with `layer: blueprint` writes each as a queue line, flushes it, and
deletes the entry once its pull request is open; the backlog report counts them until
then.

## Order and supersession

- `after` — the entry follows another in a designed sequence. Starting early would still
  work; it is merely not the order the design intended.
- `blockedBy` — starting early would genuinely not work. An entry may carry both.
- `supersededBy` — set on the original when a shaping splits one entry into several. Do
  **not** delete the original: specs and plans cite ids and those citations must keep
  resolving. A superseded entry is not work anyone can pick up, and must not also be
  `shipped`.
- `after`, `blockedBy` and `supersededBy` name entries in this catalog, and the catalog
  check fails on one that does not. An order that depends on another repository's entry
  goes in a comment above the entry, naming that repository and the id.

`.tropis/guards/catalog-entries.test.js` checks that every entry has the required fields,
and that no two entries share an id; that `after`, `blockedBy` and `supersededBy` name
only entries in this catalog, and `blockedBy` and `after` together form no cycle; that no
shipped entry records a blocker or is superseded; that `shelved` is `true` or absent, and
only on an `idea` or `shaped` entry; that a spike has no modules; and that every module of
a shipped entry exists.

## Shelving

`shelved: true` is a flag beside the status, not a status. It says: this is shaped,
understood, and parked until something changes — nobody is expected to pick it up until
then.

- Set it when work is parked on purpose rather than blocked or abandoned. `blockedBy`
  says *cannot start*; `shelved` says *could start, and we are waiting for a reason to*;
  `dropped` says *will not be done*.
- The entry keeps the status it earned. Un-shelving is deleting the line, not working out
  which status to restore.
- Only `idea` and `shaped` entries may carry it. An entry that is `building` has a plan
  running and one that is `shipped` has landed; neither is something anyone can decline
  to schedule.
- Never write `shelved: false`. Absent means not shelved, exactly as with `blockedBy`.
- Say **why** it is shelved, and what would bring it back, in the entry's `value`, and
  keep the plan or spec in `refs`. A shelf with no reason on it is indistinguishable from
  something forgotten.
- **A shelved entry is still open.** The board puts it in band D, marked shelved, and an
  arc with nothing else left reads as parked, not done.

## Dropping

`status: dropped` closes an entry that will not be done: the work is not needed, was
done elsewhere with no entry to point at, or was decided against. It is closed the way
`shipped` and `supersededBy` are: out of the bands, listed under Closed on the board,
and left out of an arc's count.

- **Dropped or shelved?** If you can name what would make the work worth doing, and it
  might happen, shelve it. If not, drop it.
- When another entry did the work, set `supersededBy` to it instead: a pointer says more
  than a reason.
- Only an `idea` or `shaped` entry is dropped. Remove `shelved` in the same edit.
- Say **why** in the entry's `value`, starting `Dropped <date> -`. A drop with no reason
  reads as forgotten, like a shelf with none.
- Remove the id from every other entry's `blockedBy`, in the same edit: a dropped entry
  never ships, so an entry blocked by it would wait forever. `after` stays, as it does
  for a shipped entry.
- Do not delete the entry: specs and plans cite ids, and its reason is the record that
  this was decided.
