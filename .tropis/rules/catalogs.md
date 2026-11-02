# Backlog rules
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
  replaces it with the board through a backlog item of its own, which removes the
  generator, its guard, the document and every instruction to run them together. **An
  agent that meets such a document while changing the backlog, and finds no backlog item
  for its replacement, captures one with `/idea` in the same change.** Until that backlog
  item ships, keep following the project's instructions for the document; then there is
  one view.
- Never edit or commit the board's page. Change the backlog, and the page follows.
- **A generated region inside a hand-written page gets the same guard.** Where a page
  people write by hand must carry a generated reference, mark the region with two comment
  markers, have the generator rewrite only what lies between them, and compare that
  region byte-for-byte against a fresh render — the guard a wholly generated document
  gets. Never hand-edit between the markers. The page stays prose, and the reference
  cannot go stale.
- A backlog item may only reach `shipped` when every acceptance criterion is covered by an
  automated test or a recorded entry in `docs/verification-log.md`, drafted and recorded
  through `/manual-check`. If a criterion has neither, the backlog item does not ship —
  say so rather than promoting it.

  **A criterion about what a fresh agent session receives or answers has a third
  route:** a fresh-agent check recorded with its tool, version, operating system and
  architecture, in the commit body or review record that ships the backlog item. That is
  where the workflow already records those checks, and neither a test nor the log can hold
  one — a test cannot start a session, and the log is for what a person sees. Name the
  commit or record in a comment above the backlog item.
- **A criterion only the developer can observe does not hold the backlog item back.** The
  rule above and the delivery guard pull opposite ways the first time a plan merges with
  an observation still outstanding: this file says do not promote, while, where the
  project runs one, a guard that every Delivers id on an executed plan is shipped turns
  the branch red if you do not. **Where that guard runs, it wins.** Where it does not,
  make the same choice by hand. `shipped` says the code landed, not that every eye has
  been on it. Record the unobserved criterion in the review record's *Outstanding
  disposition*, naming who must observe it, and record the observation in
  `docs/verification-log.md`, through `/manual-check`, when it happens. An observation
  reported only in conversation is not recorded anywhere: every later record goes on
  calling it outstanding. (Incident:
  `.tropis/rules/incidents/catalogs.md#an-entry-promoted-and-called-unshipped`)
- Comments are part of the record. Say why a backlog item was re-pointed, shelved,
  dropped, or ordered the way it is, in a comment above the key it explains.
- **`refs` names the design the backlog item belongs to, and nothing else.** The backlog
  report treats every spec cited by more than one backlog item as an epic and reports how
  far it has got, so a grooming or review spec cited on each backlog item it touched shows
  as a false epic of unrelated work. Name such a document in a comment above the backlog
  item instead.
- **Three things in an unquoted value break the YAML.** A colon followed by a space
  reads the rest of the line as a nested mapping, and the backlog check fails with
  "Nested mappings are not allowed in compact mappings". A space followed by `#` starts
  a comment, which on a value's last line drops the rest of the value with no error at
  all. A value that begins with a backtick, or with a quotation mark that does not close
  the whole value, fails; one that begins with another YAML indicator, such as `*`, `&`,
  `!`, `[` or `{`, fails or parses as something else. Rephrase, or put the whole value
  in double quotes. These are what needs quoting where a backlog command says to quote
  nothing that does not need it.

## What does not become a backlog item

A finding — from a review, a handover, a fresh-agent check, or work in passing —
becomes a backlog item only when it would otherwise be lost. Two kinds would not be:

- **An improvement the next agent in that area would make on the spot.** If whoever
  next works there would see it and do it without being told — name the evidence a
  criterion needs, reword a sentence, pick the obvious default — a backlog item only adds
  a row someone must later read, band and close.
- **A bug of little or no impact that the normal flow would catch and neutralise.** If
  the ordinary next step — setup's own commit, a suite run, a review — would surface it
  and make its consequence disappear, leaving it costs nothing. (Incident:
  `.tropis/rules/incidents/catalogs.md#two-entries-filed-for-one-shipped-entry`)

**A bug that fails silently is always a backlog item.** A hook that emits nothing, a check
that cannot fail, a rule that is false about the code: the normal flow never catches
these, because nothing in it looks wrong. When unsure whether the flow would catch a
bug, it is a backlog item.

**A drop is a decision, and it carries a reason in one line** where the finding was
reported — the review record's *Outstanding disposition*, the handover report, or the
reply to the developer. A finding with neither a backlog item nor a reason has not been
dealt with. When the developer asks for a backlog item, it is captured; this section is
for findings an agent raises itself.

**A finding worth keeping is captured as a backlog item, and nowhere else instead.** A
task card, or a side or background session of the agent tool, is seen by neither the
backlog, its report nor its board, so the work it holds is planned by nobody and found
only by whoever opens that tool. Capture it with `/idea`, and tell the developer if it
matters now. (Incident:
`.tropis/rules/incidents/catalogs.md#a-guard-defect-left-on-a-task-card`)

**A fix an agent proposes on its own starts as an idea backlog item, and is shaped before
any branch or plan is made for it.** That holds for a fix to the project's own process
machinery too; work the upstream framework must do goes to the upstream queue instead
(*Layers*). The developer then decides whether and when it is done, rather than finding it
under way. Work the developer asks for directly is not proposed by the agent, and neither
paragraph applies to it. (Incident:
`.tropis/rules/incidents/catalogs.md#a-refresh-taken-straight-to-a-branch`)

## Status transitions

Status changes hands at fixed moments, not whenever it feels right:

- `idea` → `shaped` when acceptance criteria are written, before implementation.
- `shaped` → `building` **when its plan is dispatched**.
- `building` → `shipped` **when its plan merges**.
- `building` → `shaped` if the plan is abandoned; nothing stays `building` without a plan.
- `idea` or `shaped` → `dropped` when it is decided the work will not be done (see
  *Dropping*).

**A promotion to `shipped` removes `blockedBy`.** A backlog item that has landed cannot be
waiting for anything, and `.tropis/guards/catalog-entries.test.js` rejects any shipped
backlog item that still records a blocker, whether or not that blocker has itself shipped.
Delete the field as part of the promotion, in the same edit.

`after` is not touched. It records the order the work was designed in, which stays true
after the work is done.

A backlog item stuck at `building` with no open branch is the signal that something was
dropped — but only if this transition is actually made.

## Layers

Every backlog item says where the work happens: `product` or `framework`.

Work the upstream framework must do is not recorded here — it goes to the upstream queue
and reaches the framework's own backlog through `/flush-upstream`. A project still
holding backlog items with `layer: blueprint` writes each as a queue line, flushes it, and
deletes the backlog item once its pull request is open; the backlog report counts them
until then.

## Order and supersession

- `after` — the backlog item follows another in a designed sequence. Starting early would
  still work; it is merely not the order the design intended.
- `blockedBy` — starting early would genuinely not work. A backlog item may carry both.
- `supersededBy` — set on the original when a shaping splits one backlog item into
  several. Do **not** delete the original: specs and plans cite ids and those citations
  must keep resolving. A superseded backlog item is not work anyone can pick up, and must
  not also be `shipped`.
- `after`, `blockedBy` and `supersededBy` name backlog items in this backlog, and the
  backlog check fails on one that does not. An order that depends on another repository's
  backlog item goes in a comment above the backlog item, naming that repository and the
  id.

`.tropis/guards/catalog-entries.test.js` checks that every backlog item has the required
fields, and that no two backlog items share an id; that `after`, `blockedBy` and
`supersededBy` name only backlog items in this backlog, and `blockedBy` and `after`
together form no cycle; that no shipped backlog item records a blocker or is superseded;
that `shelved` is `true` or absent, and only on an `idea` or `shaped` backlog item; that a
spike has no modules; and that every module of a shipped backlog item exists.

## Shelving

`shelved: true` is a flag beside the status, not a status. It says: this is shaped,
understood, and parked until something changes — nobody is expected to pick it up until
then.

- Set it when work is parked on purpose rather than blocked or abandoned. `blockedBy`
  says *cannot start*; `shelved` says *could start, and we are waiting for a reason to*;
  `dropped` says *will not be done*.
- The backlog item keeps the status it earned. Un-shelving is deleting the line, not
  working out which status to restore.
- Only `idea` and `shaped` backlog items may carry it. A backlog item that is `building`
  has a plan running and one that is `shipped` has landed; neither is something anyone can
  decline to schedule.
- Never write `shelved: false`. Absent means not shelved, exactly as with `blockedBy`.
- Say **why** it is shelved, and what would bring it back, in the backlog item's `value`,
  and keep the plan or spec in `refs`. A shelf with no reason on it is indistinguishable
  from something forgotten.
- **A shelved backlog item is still open.** The board puts it in band D, marked shelved,
  and an epic with nothing else left reads as parked, not done.

## Dropping

`status: dropped` closes a backlog item that will not be done: the work is not needed, was
done elsewhere with no backlog item to point at, or was decided against. It is closed the
way `shipped` and `supersededBy` are: out of the bands, listed under Closed on the board,
and left out of an epic's count.

- **Dropped or shelved?** If you can name what would make the work worth doing, and it
  might happen, shelve it. If not, drop it.
- When another backlog item did the work, set `supersededBy` to it instead: a pointer says
  more than a reason.
- Only an `idea` or `shaped` backlog item is dropped. Remove `shelved` in the same edit.
- Say **why** in the backlog item's `value`, starting `Dropped <date> -`. A drop with no
  reason reads as forgotten, like a shelf with none.
- Remove the id from every other backlog item's `blockedBy`, in the same edit: a dropped
  backlog item never ships, so a backlog item blocked by it would wait forever. `after`
  stays, as it does for a shipped backlog item.
- Do not delete the backlog item: specs and plans cite ids, and its reason is the record
  that this was decided.
