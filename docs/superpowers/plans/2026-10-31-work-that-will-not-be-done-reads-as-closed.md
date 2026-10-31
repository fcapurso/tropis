# An entry that will not be done is dropped, and reads as closed — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer; the check
> only a person can make on the board is the reviewer's, after your handover.

**Goal:** the catalog gains a status, `dropped`, for an entry that will not be done.
Dropped entries are closed the way shipped and replaced ones are. `shelved` keeps one
meaning, parked until something changes, and a shelved entry is open: the board puts it
in band D, marked shelved. An arc with nothing left but dropped or replaced steps reads
as done, one with nothing open but a shelved step reads as parked, and the board and the
backlog report get both from one function. This repository's three shelved entries are
re-sorted in the same change, so the board is never half converted.

**Spec:** the entry `work-that-will-not-be-done-reads-as-closed` in `feature-catalog.yaml`
and the comment above it. There is no design document. The design was settled with the
developer on 2026-10-31, in the session that wrote this plan:

- The board showed the harness sidecar arc as in progress. Its two entries,
  `harness-does-not-need-node` and `learnings-can-be-declined`, are both shelved and
  neither shipped. The board leaves replaced entries out of an arc's count but keeps
  shelved ones in ("parked is not resolved"), so the arc read 0 of 2.
- Everywhere else the board counts a shelved entry as closed: it leaves the bands and is
  listed under Closed. So the page contradicted itself.
- The real cause: `shelved` was carrying two meanings. The catalog rule defines it as
  parked, reversible by deleting one line. In use it also meant "not needed":
  `learnings-can-be-declined` has a comment saying "dropped", and
  `entry-file-says-how-rules-arrive` says "nothing left to do". The catalog had no other
  way to say that.
- The developer chose: add `dropped`, counted as closed like shipped and superseded;
  keep `shelved` for what is only parked; put shelved entries in band D (whose written
  meaning is already "nothing to do until something happens"), not in a separate
  section; re-sort the existing shelved entries in this same plan.

**What the specifying session verified on 2026-10-31, against `main` at `a4127eb`, with
git 2.49.0 and Node v22.15.0 on macOS (Darwin 25.2.0), arm64:**

- No guard lists the allowed statuses. `templates/catalog.yaml` documents them on one
  comment line (`# status  idea | shaped | building | shipped`); `guards/catalog-entries.test.js`
  checks only that `status` is present.
- Every reader of `shelved` or of closed-ness, by `git grep -n -i shelved` over
  `rules framework commands scripts guards templates fixtures`:
  `scripts/next-work.js` (`ready`, `blocked`: exclude shelved; `arcs`, `underWayIds`:
  count shipped only), `scripts/next.mjs` (`bundleMates` `open`, the shelved count,
  `Arcs under way`), `scripts/build-backlog-board.mjs` (`closedHow`, `arcData`, the
  stale/unbanded reports), `scripts/board-bands.js` (`movedBands` skip), the page
  `templates/backlog-board.html`, `templates/backlog-bands.yaml` and its copy
  `fixtures/base/docs/backlog-board/bands.yaml` (byte-identical today),
  `templates/catalog.yaml`, `rules/catalogs.md`, `commands/feature.md`,
  `commands/refresh-board.md`, `framework/DECISIONS.md` (FW-034), the guards
  `guards/backlog-board.test.js`, `guards/board-bands.test.js`,
  `guards/catalog-drift.test.js`, and the conformance case `silent-shelf`
  (`fixtures/defects/silent-shelf/`, listed in `scripts/check-conformance.sh` as
  `silent-shelf:catalog-drift`). `templates/readme-skeleton.md` names shelved as a fact
  source for the README; that stays true and is not changed.
- `ready()` keeps only `status === 'shaped'` and `blocked()` only `shaped` or `idea`, so a
  `dropped` entry falls out of both with no change. `inFlight` keeps `building` only.
- `guards/backlog-board.test.js` asserts `a.order.length === a.total` for every arc. This
  plan keeps `total` as the raw entry count and adds new fields, so that stays true.
- `guards/next-report.test.js` pins the no-bands output byte for byte
  (`UNCHANGED_WITHOUT_BANDS`, with `docs/specs/arc-design.md — 1 of 2 shipped`). Its
  catalog has no dropped or superseded entry, so the count is unchanged.
- No entry's `blockedBy` or `after` names `learnings-can-be-declined` or
  `entry-file-says-how-rules-arrive`.
- `.tropis/guards/` holds `catalog-entries.test.js` but not `catalog-drift.test.js`: the
  shelf-reason check runs on this repository only, not in set-up projects. The new
  drop-reason check is the same.
- The user-level instructions loaded on the specifying session's install say nothing
  about catalog statuses, shelving or dropping, so a local fresh-agent probe is not
  absorbing a copy of this change.

**Model tier: Medium.** Nineteen files. The script changes and the rule text are given
verbatim; the page edits are specified edit by edit but need care in a 500-line
template, and the probe needs its result judged.

**Requires:** nothing beyond the repository, plus a `claude` command-line install for Task 6's probe if one is available (a subagent otherwise).

**Merge authority: parent review.** It changes the catalog's vocabulary for every project and the rule every agent follows when editing the catalog, and the board change has a screen the reviewer must have the developer look at.

Do not store a kick-off prompt on this plan.

---

## Delivers

work-that-will-not-be-done-reads-as-closed

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-dropped -b plan/work-that-will-not-be-done-reads-as-closed` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release; the work is in the source folders.
  `rules/catalogs.md` is the source of the next release's rule; nothing is regenerated
  in this repository.
- **Add no dependency. Do not lower, skip or delete a guard or a test** except the
  expectations this plan says to change. Every commit has a body.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, the handover or the review record.

## Decisions

Taken by the specifying session on 2026-10-31.

### 1. One function decides closed, and one decides an arc's state

In `scripts/next-work.js`, directly below `isSuperseded`, add:

```js
/**
 * Closed for good: shipped, replaced by other entries, or dropped. A shelved entry is
 * not closed — it is parked until something changes.
 * @param {{status: string, supersededBy?: string[]}} entry
 */
export function isClosed(entry) {
  return entry.status === 'shipped' || entry.status === 'dropped' || isSuperseded(entry);
}
```

Replace the body of `arcs()`'s `.map(...)` and its doc comment:

```js
/**
 * Entries sharing a spec path, so an arc can be shown together, ordered by `after`.
 * `shipped` and `total` are raw counts. `counted` leaves out replaced and dropped
 * entries, whose work moved or will not be done. `state` is `under way` (something
 * shipped, something open), `not started` (something open, nothing shipped), `parked`
 * (nothing open, at least one step shelved) or `done` (nothing open or shelved).
 */
```

```js
    .map(([ref, entries]) => {
      const ordered = orderByAfter(entries);
      const shipped = ordered.filter((e) => e.status === 'shipped').length;
      const counted = ordered.filter((e) => e.status !== 'dropped' && !isSuperseded(e)).length;
      const open = ordered.some((e) => !isClosed(e) && !e.shelved);
      const parked = ordered.some((e) => !isClosed(e) && e.shelved);
      const state = open
        ? (shipped > 0 ? 'under way' : 'not started')
        : (parked ? 'parked' : 'done');
      return { ref, entries: ordered, shipped, total: ordered.length, counted, state };
    });
```

In `underWayIds`, replace the two lines computing `shipped` and testing it with
`if (arc.state === 'under way') {` (keep the loop body). An arc whose only remaining
step is replaced or dropped is no longer "under way" for the tie-break, which is the
point.

### 2. The backlog report uses them

In `scripts/next.mjs`:

- Add `isClosed` to the import from `./next-work.js`.
- In `bundleMates`, `const open = (e) => !isClosed(e) && !e.shelved;`
- `const underWay = arcs(catalog).filter((arc) => arc.state === 'under way');`
- The arc line prints `${arc.shipped} of ${arc.counted} shipped`.
- The per-entry mark: `const mark = entry.status === 'shipped' ? '✓' : isClosed(entry) ? '-' : ' ';`
  (a replaced or dropped step shows `-`).

The shelved count line stays as it is.

### 3. The board: dropped is closed, shelved is in D

In `scripts/build-backlog-board.mjs`:

- The header comment's second sentence becomes: `An entry that has shipped, been
  replaced or been dropped is closed: it leaves the bands and is listed in a collapsed
  section at the bottom of the page. A shelved entry is open and sits in band D, marked
  shelved, whatever the bands file says.`
- `closedHow`: comment `// Closed entries are not work: shipped, dropped, or replaced by
  another entry.` Its body checks `shipped` → `{ k: 'shipped' }`, then
  `e.status === 'dropped'` → `{ k: 'dropped' }`, then replaced as today. Remove the
  shelved line.
- The open entry object gains `sh: !!e.shelved,` after `cl: null,`.
- `arcData` items gain `counted: a.counted, state: a.state,` after `total: a.total,`.
  Keep `sh` and `sup` in `order` as they are. Sort by `(y.counted - y.shipped) - (x.counted - x.shipped)`.
- A shelved entry needs no band, so the bands reports are about the rest. Directly after
  `const active = …` add
  `const bandable = active.filter((e) => !e.shelved);`
  and use `bandable` instead of `active` in `activeIds`, `unbanded`, and the
  `--reevaluate` branch of `moved`. (`stale`, `notAToD`, `unscored` and `bundleMembers`
  all read `activeIds`, so a band row on a shelved entry is reported stale, as today.)
  `count` and `__OPEN__` keep using `active`: a shelved entry is open.
- The stale line reads `… for entries that have shipped, been dropped, been replaced,
  been shelved or gone — delete them:`.
- The unbanded line is unchanged.

In `scripts/board-bands.js`, `movedBands` also skips `entry.status === 'dropped'`, and
its doc comment says `shipped, been dropped, been replaced, been shelved or gone`.

### 4. The page

In `templates/backlog-board.html`, edit by edit:

- **Footer, first paragraph:** replace the sentence `Shipped, replaced and shelved
  entries are not banded: they are listed under Closed.` with `Shipped, replaced and
  dropped entries are not banded: they are listed under Closed. A shelved entry is
  parked until something changes: it sits in D, marked shelved, and needs no row in the
  bands file.`
- **Footer, second paragraph**, replace whole with: `<b>Arcs</b> are derived by the same
  code as <span class="mono">npm run next</span> — entries sharing a design spec, ordered
  by <span class="mono">after</span>. A <b>replaced</b> or <b>dropped</b> step is set
  aside: it is left out of the count, since its work moved or will not be done. An arc
  with nothing open left is <b>done</b>, or <b>parked</b> when a shelved step remains.
  Group by Arc to see each design's full sequence: shipped steps in green, open ones
  hollow, shelved, replaced or dropped ones struck through.` (keep the `<p …>` wrapper
  and its style attribute).
- **The `CLOSED` comment:** `// Closed entries (shipped, replaced, dropped) are not work:
  they leave the bands and appear only in the Closed section. A shelved entry is open,
  in D.`
- **The band in `data`:** `const band = e.sh ? "D" : BAND_LETTERS.includes(a.b) ? a.b : "D";`
  with the comment above it `// A shelved entry is parked on purpose: it sits in D,
  whatever bands.yaml says.`
- **The arc state:** delete the comment block and `for (const a of ARCS) {…}` loop that
  computes `effTotal`, `effShipped`, `done` and `superseded`, and replace
  `LIVE_ARCS` / `DONE_BY_SUPERSESSION` with:

  ```js
  // Each arc's state comes from arcs() in next-work.js, the same code /next uses.
  const LIVE_ARCS = ARCS.filter(a=>a.state==="under way" || a.state==="not started");
  const PARKED_ARCS = ARCS.filter(a=>a.state==="parked");
  const DONE_SET_ASIDE = ARCS.filter(a=>a.state==="done" && a.counted<a.total);
  ```

  Every later use of `a.effShipped` becomes `a.shipped`, `a.effTotal` becomes
  `a.counted`, and `arc.effShipped` / `arc.effTotal` in the group-by-arc head likewise.
- **The arcs box:** in each live row, the note becomes
  `const aside = a.total - a.counted;` and
  `const note = aside ? '<span class="sp" title="replaced or dropped steps are left out of the count">'+aside+' set aside</span>' : '';`.
  The trailing done block uses `DONE_SET_ASIDE`, reads `Complete once replaced or
  dropped steps are set aside: ` and lists each as
  `esc(a.label)+' <span class="sp">'+a.shipped+' shipped, '+(a.total-a.counted)+' set aside</span>'`.
  After it, append the same shape for `PARKED_ARCS`: an `arc arc-done` row reading
  `Parked — nothing open, a shelved step remains: ` then each `esc(a.label)`, joined by
  ` · `, with `parked` in the `af` cell. Rendered only when `PARKED_ARCS.length`.
- **`GORDER.arc`:** `[...LIVE_ARCS.map(a=>a.key), ...PARKED_ARCS.map(a=>a.key), ...DONE_SET_ASIDE.map(a=>a.key), "_none"]`.
  A shelved entry is now on the board, so a parked arc's group can appear.
- **`UNDER_WAY`:** `new Set(ARCS.filter(a=>a.state==="under way").flatMap(a=>a.order.map(o=>o.id)))`,
  with its comment `// An arc already under way, as arcs() decides it.`
- **The ladder:** `const cls = o.s==="shipped" ? "done" : (o.sh||o.sup||o.s==="dropped") ? "parked" : "open";`
- **The row tag:** in `row(e)`, right after the bundle tag, `if (e.sh) tags.push('<span class="tag tag-shelved">shelved</span>');`.
  Add a CSS line after `.tag-after{…}`, identical to it but named `.tag-shelved`.

The Closed section's renderer needs no change: it prints `e.cl.k`, which is now
`dropped` for a dropped entry.

### 5. The words

**`rules/catalogs.md`.** Line 44's bullet: `re-pointed, shelved, dropped, or ordered`. In
*Status transitions*, after the `building → shaped` bullet, add:
`- \`idea\` or \`shaped\` → \`dropped\` when it is decided the work will not be done (see *Dropping*).`
Replace the *Shelving* section's first paragraph and first bullet with:

```markdown
`shelved: true` is a flag beside the status, not a status. It says: this is shaped,
understood, and parked until something changes — nobody is expected to pick it up until
then.

- Set it when work is parked on purpose rather than blocked or abandoned. `blockedBy`
  says *cannot start*; `shelved` says *could start, and we are waiting for a reason to*;
  `dropped` says *will not be done*.
```

Change its last bullet's first sentence to `Say **why** it is shelved, and what would
bring it back, in the entry's \`value\`, and keep the plan or spec in \`refs\`.` and add
a final bullet:

```markdown
- **A shelved entry is still open.** The board puts it in band D, marked shelved, and an
  arc with nothing else left reads as parked, not done.
```

Then add a new section directly after *Shelving*:

```markdown
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
```

**`templates/catalog.yaml`.** The *Behaviour* line names `what shelving and dropping
mean`. The status line becomes `# status  idea | shaped | building | shipped | dropped`
followed by one more comment line, aligned with the descriptions above it:
`#         dropped: will not be done, and the value says why.` The `shelved` line
becomes `true when an entry is parked until something changes. Only \`idea\`` (its
second line unchanged). The *Comments* line names `a re-pointing, a shelving, a drop or
an unusual decision`.

**`commands/feature.md`.** Line 5: ``Promote an entry in `feature-catalog.yaml` through
`idea → shaped → building → shipped`, or close one as `dropped`.`` The shelving
paragraph begins `To park an \`idea\` or \`shaped\` entry until something changes, add`.
After it, add:

```markdown
**Dropping closes an entry that will not be done.** Set `status: dropped` on an `idea`
or `shaped` entry, remove `shelved` if it has it, and remove its id from every other
entry's `blockedBy`. Its `value` says why, starting `Dropped <date> -`, and so does the
commit body. Shelve it instead when you can name what would make the work worth doing.
The rule is `.claude/rules/catalogs.md`, *Dropping*.
```

**`commands/refresh-board.md`.** The report list: `bands whose entry has shipped, been
dropped, been replaced, been shelved or gone`. The grooming bullet: `Shipped, dropped,
shelved and superseded entries are not compared`. The close row's last cell:
``/feature` closes it: superseded by the entry that did the work, or dropped with a reason``.

**`templates/backlog-bands.yaml` and `fixtures/base/docs/backlog-board/bands.yaml`,
identically.** Lines 4–5 become: `# One row per active catalog id: an entry that has not
shipped, been dropped, been replaced or been shelved.` / `# Shipped, dropped and
replaced entries have no band; a shelved one needs none, since the board puts it in D.`
The report paragraph's list: `shipped, been dropped, been replaced, been shelved or gone`
(rewrap so no line passes 90 characters). Confirm the two files are still identical
with `cmp`.

**`framework/DECISIONS.md`.** FW-034's status line becomes `**Status:** Accepted. Its
sentence on shelved entries is superseded by FW-037`. Append:

```markdown
---

## FW-037: An entry that will not be done is dropped; a shelved one is only parked

**Date:** 2026-10-31 · **Status:** Accepted

**Decision:** `dropped` is a catalog status, reached from `idea` or `shaped`, for an
entry that will not be done; its value says why. It is closed like `shipped` and
`supersededBy`: out of the bands, under Closed on the board, left out of an arc's count.
`shelved` means only parked until something changes. A shelved entry is open: the board
puts it in band D, marked shelved, and it needs no row in the bands file. One function,
`arcs()`, gives every arc a state — under way, not started, parked or done — and the
board and the backlog report both use it.

**Evidence:** the board showed the harness sidecar arc as in progress though both its
entries were shelved: it left replaced entries out of an arc's count and kept shelved
ones in, while listing shelved entries as closed everywhere else. Two of this
repository's three shelved entries recorded work that was not needed, which the catalog
had no other way to say.

**Rejected:** Counting shelved as closed, since a parked entry is not resolved and an arc
holding one is not done. A flag beside the status for dropped, since there is no earlier
status to restore. A Parked section on the board, since band D already means nothing to
do until something happens.

**Consequences:** A project's shelved entries keep their meaning, but any that recorded
work nobody will do should be dropped by hand; nothing converts them. A band row on a
shelved entry is reported stale. `/next` still does not offer shelved entries.
```

## Traps

- **New tests fail first.** Tasks 1 and 2 write tests and run them against today's code;
  each listed as red must fail. Do not adjust them to pass.
- **The self-check reads `HEAD` only.** Commit before each `bash scripts/check-blueprint.sh`
  run. Task 4's conformance case must report `NOT CAUGHT  silent-drop …` before the guard
  is written: that is the red step, as an ordinary commit on this branch.
- **The page's script is not run by any test.** `guards/backlog-board.test.js` checks the
  data the build embeds and that no placeholder survives; nothing executes the page's
  JavaScript. Open the built page in a browser if you have one and say whether it
  rendered; if you have none, say so. The reviewer has the developer look at it either
  way.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/next-work.js` | *Decision 1* |
| `scripts/next.mjs` | *Decision 2* |
| `scripts/build-backlog-board.mjs` | *Decision 3* |
| `scripts/board-bands.js` | *Decision 3* |
| `templates/backlog-board.html` | *Decision 4* |
| `rules/catalogs.md` | *Decision 5* |
| `templates/catalog.yaml` | *Decision 5* |
| `commands/feature.md` | *Decision 5* |
| `commands/refresh-board.md` | *Decision 5* |
| `templates/backlog-bands.yaml` | *Decision 5* |
| `fixtures/base/docs/backlog-board/bands.yaml` | *Decision 5*, identical to the template |
| `framework/DECISIONS.md` | *Decision 5*, FW-034's status line and FW-037 |
| `guards/backlog-board.test.js` | Task 1 |
| `guards/next-report.test.js` | Task 2 |
| `guards/catalog-drift.test.js` | Task 4 |
| `scripts/check-conformance.sh` | Task 4, one `CASES` line |
| `fixtures/defects/silent-drop/feature-catalog.yaml` | new, Task 4 |
| `feature-catalog.yaml` | Task 5: the re-sort, and this plan's entry to `shipped` |
| `docs/superpowers/plans/2026-10-31-work-that-will-not-be-done-reads-as-closed.md` | the handover report |

Nothing else: no rule is regenerated in this repository, no generated feature document
exists here, `guards/board-bands.test.js` needs no change (its shelved case still holds
and a dropped case is covered through the build), the operator guide
`templates/README.md` does not describe statuses, and the board's own bands file is
refreshed by `/refresh-board`, not by a plan.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The board: tests first, then *Decisions 1, 3 and 4*

In `guards/backlog-board.test.js`:

1. Add `arcs` to the import from `../scripts/next-work.js`.
2. In `CLOSED_CATALOG`, add an entry `dropped-one` (title `Dropped one`,
   `status: dropped`, value `Dropped 2026-10-31 - not needed.`, one criterion,
   `modules: []`, `refs: []`), and in that describe's `bands` a row
   `dropped-one:\n  band: B\n  verdict: Dropped.\n`.
3. Change the stale test: its title says `a replaced, dropped or shelved entry`; the
   expected line is `3 bands in bands.yaml for entries that have shipped, been dropped,
   been replaced, been shelved or gone — delete them:`, the slice starts at
   `been shelved or gone`, and it also expects `- dropped-one` in the stale list and not
   `- dropped-one —`.
4. In `flags closed entries…`: `byId['dropped-one'].cl` is `{ k: 'dropped' }`,
   `byId.parked.cl` is `null` and `byId.parked.sh` is `true`.
5. Add `it('does not ask for a band on a shelved entry', …)`, with its own stage and
   cleanup: `stage(CLOSED_CATALOG, 'open-a:\n  band: A\n')`, build, and expect
   `2 active entries have no band` followed by the lines `  - open-b` and
   `  - waiting`, and no `  - parked` anywhere in the output. Today `parked` is closed
   and not listed either, so this test passes before and after: it keeps the new
   `bandable` filter from regressing, and it is the one new test not expected to fail
   first.
6. Add `describe('arc state', …)` calling `arcs()` directly on a catalog of plain objects,
   each `{ id, status, refs: ['docs/specs/<x>.md'] }` plus the flags named:
   - spec `a`: one `shipped`, one `dropped` → state `done`, `shipped` 1, `counted` 1,
     `total` 2.
   - spec `b`: one `shipped`, one `shaped` with `supersededBy: ['z']` → `done`,
     `counted` 1.
   - spec `c`: one `dropped`, one `shaped` with `shelved: true` (the harness sidecar
     shape) → `parked`, `shipped` 0, `counted` 1.
   - spec `d`: one `shipped`, one `shaped` → `under way`, `counted` 2.
   - spec `e`: one `shaped`, one `dropped` → `not started`, `counted` 1.
7. In the first describe's `embeds data…` test, also expect every arc to carry a
   `state` among the four and a numeric `counted`.

Run `npm --prefix .tropis test -- guards/backlog-board.test.js`: the new and changed
expectations fail. Then make *Decisions 1, 3 and 4*, and run it again: green. Commit.

### Task 2 — The backlog report: tests first, then *Decision 2*

In `guards/next-report.test.js`, add two tests using `stageReport`:

- `it('leaves dropped and replaced steps out of an arc\'s count, and marks them', …)`: a
  catalog of four entries sharing `docs/specs/arc-design.md` — `shipped`, `shaped`,
  `dropped`, and `shaped` with `supersededBy: [<the shaped one>]`. Expect
  `docs/specs/arc-design.md — 1 of 2 shipped` and, for each of the two set-aside entries,
  a line `    - <id>`.
- `it('does not report an arc as under way when only dropped or shelved steps are left', …)`:
  `shipped` plus `dropped`, and separately `shipped` plus `shaped` with `shelved: true`
  (two specs). Expect no `Arcs under way` in the output.

Run the file: both fail. Make *Decision 2*; run again: green, and
`UNCHANGED_WITHOUT_BANDS` still passes unchanged. Commit.

### Task 3 — The words

Make every edit in *Decision 5*. Run `npm --prefix .tropis test` (paste the `Tests:`
line) and `cmp templates/backlog-bands.yaml fixtures/base/docs/backlog-board/bands.yaml`
(expected: no output). Commit with a body that says the catalog rule changed and that
Task 6 carries its fresh-agent check.

### Task 4 — The drop-reason check: conformance first, red, then the guard

1. Create `fixtures/defects/silent-drop/feature-catalog.yaml`: a copy of
   `fixtures/defects/silent-shelf/feature-catalog.yaml` with `status: dropped`, no
   `shelved` line, `modules: []`, and the value's last sentence `Not needed, without
   saying why.` (no form of *dropped*, *shelved*, *shelf* or *parked* anywhere in the
   value).
2. In `scripts/check-conformance.sh`, add `silent-drop:catalog-drift` on the line after
   `silent-shelf:catalog-drift`.
3. Commit, run `bash scripts/check-blueprint.sh`: it must print
   `NOT CAUGHT  silent-drop …` and fail. Paste the line.
4. In `guards/catalog-drift.test.js`, after the shelf test, add:

   ```js
   it('every dropped entry says it was dropped, and why, in its value', () => {
     if (!existsSync(catalogPath)) return;
     const featureCatalog = YAML.parse(readFileSync(catalogPath, 'utf8'));
     const silent = featureCatalog
       .filter((e) => e.status === 'dropped')
       .filter((e) => !/dropped/i.test(e.value ?? ''))
       .map((e) => e.id);
     expect(silent).toEqual([]);
   });
   ```

5. Commit, run the self-check again: `caught      silent-drop …` and
   `caught      silent-shelf …`, last line `Self-check passed`. Paste them.

### Task 5 — The re-sort, and the catalog

In `feature-catalog.yaml`:

- **`learnings-can-be-declined` → dropped.** `status: dropped`, delete `shelved: true`.
  In its value replace `Shelved 2026-08-16 —` with `Dropped 2026-08-16 —` and delete the
  last sentence, `Reopen only if those outs stay unused and a blank Learnings routed
  section needs a mechanical fail.` (keep the closing quote). Add a comment line under
  its existing comment: `# 2026-10-31: recorded as dropped rather than shelved - the work
  is covered elsewhere, and nothing is waited for (work-that-will-not-be-done-reads-as-closed).`
- **`entry-file-says-how-rules-arrive` → dropped.** `status: dropped`, delete
  `shelved: true`, and in its value replace `Shelved 2026-10-30 - nothing left to do`
  with `Dropped 2026-10-30 - nothing left to do`. Add the comment line
  `# 2026-10-31: recorded as dropped rather than shelved - the work was already done
  (work-that-will-not-be-done-reads-as-closed).` at the end of its comment block.
- **`harness-does-not-need-node` stays shelved.** Its value already names what would
  bring it back (an adopter who cannot install Node). No change.
- **This plan's entry** to `shipped`, `modules` set to the scripts, the page and
  `rules/catalogs.md`, and a comment above it in the form of the entries just above it:
  `Shipped by` this plan's path, then which test or check covers each criterion (1:
  `catalog-drift` drop-reason test and the `silent-drop` case; 2: `backlog-board` closed
  and shelved tests; 3: the `arc state` tests and the two `next-report` tests; 4: Task
  6's fresh-agent check, by its handover entry; 5: this edit). Criterion 2's page
  rendering is the reviewer's manual check; say so in the comment.

Run `npm --prefix .tropis run board` in the worktree and confirm, from the embedded
`ARCS` data in `docs/backlog-board/index.html`, that the arc for
`2026-08-14-harness-sidecar-design.md` has `state` `parked`. **Do not commit the built
page or `bands.yaml`**: `git status --porcelain` must show neither (the page is ignored;
if `bands.yaml` changed, `git checkout` it). Commit the catalog.

### Task 6 — Fresh-agent check

`rules/catalogs.md` and the commands changed what an agent is told, so a fresh-agent
check is owed (workflow.md, *Fresh-agent check*). Aim it at the *Dropping* section's
first bullet: telling dropped from shelved.

1. Build a scratch project outside every checkout: a new directory, `git init -b main`,
   `bash <worktree>/scripts/set-up-project.sh <scratch>`, commit everything on `main`.
2. Run a fresh agent whose only context is that directory — preferably `claude -p` with
   the scratch project as its working directory; otherwise a subagent given only the
   path. Check first whether the instructions that load for every project on that
   install say anything about dropping or shelving backlog entries; if they do, run it
   where they do not load and say so. The prompt, verbatim:

   > This is a probe; whatever you produce will be discarded. Add two ideas to this
   > project's backlog, following its own rules: `probe-widget-export` ("A widget can be
   > exported") and `probe-widget-print` ("A widget can be printed"). Then record two
   > decisions the developer has made about them: exporting will not be done, because
   > the sharing feature already covers it; printing is on hold until a customer asks
   > for it. Commit the result.

3. **Expected:** `probe-widget-export` has `status: dropped`, no `shelved`, and a value
   starting or containing `Dropped` with the reason; `probe-widget-print` keeps
   `status: idea` with `shelved: true` and a value naming the customer request. Then
   `npm --prefix .tropis run board` in the scratch project lists the export idea under
   Closed (`cl` `{ k: 'dropped' }` in the embedded `ENTRIES`) and the print idea open
   with `sh: true`.
4. If it does not tell them apart, the change is not finished: say what it did, adjust
   only the *Dropping* section's first bullet, and run it again. Record each run.

Record, for each run: the prompt, what it did, whether that is what the change intended,
and the tool, its version, the operating system and the architecture — never the
computer's name. Put the same two or three sentences in the handover so the reviewer
can carry them into the squash message. End with a proposal for anything it found (a
backlog entry, a rule, or a one-line reason to drop it), under *Outstanding*.

### Task 7 — Full verification

From the worktree, after committing everything:

- `npm --prefix .tropis test` — paste the `Tests:` line.
- `bash scripts/check-blueprint.sh` — paste the `silent-drop` and `silent-shelf` lines,
  `ok          clean baseline`, and the last line, which must start `Self-check passed`.
- `npm --prefix .tropis run next` — paste the `Arcs under way` section, or say it is
  absent.
- `git diff --stat origin/main...HEAD` — paste it; every file must be in *File Structure*.

### Task 8 — Handover report and pull request

Append `## Handover report` to this plan with the six sections the planning rule names:
Task completion, Verification results (each command, its actual output, and the tool,
version, operating system and architecture — never the computer's name), Scope (diff
stat, every file in *File Structure*, the worktree path used), Judgment calls, What the
plan got wrong, Outstanding. Under Outstanding, name the reviewer's manual check of the
board page: the harness sidecar arc reads as parked, `harness-does-not-need-node` sits
in D marked shelved, and the two dropped entries are under Closed reading `dropped`.

Commit, push the branch, and open a pull request against `main` whose body says what is
now true, ending with the attribution lines your session gives. **Do not merge.** The
specifying session reviews, has the developer check the board, writes the review record
and merges.

---

## Handover report

Executed by a dispatched agent in the worktree `../tropis-dropped` on branch
`plan/work-that-will-not-be-done-reads-as-closed`, dispatched on `main` at `1e3fa2f` and rebased onto `main` at `a00f4bd` before the pull
request (see *Judgment calls*).
Environment for every check: git 2.49.0, Node v22.15.0, macOS (Darwin), arm64.

### Task completion

- **Task 0.** Worktree created by the isolate helper; `npm --prefix .tropis ci`; tree
  clean; `bash scripts/check-blueprint.sh` on `1e3fa2f` ended `Self-check passed`.
- **Task 1** (`81c2e8a`). Board tests written first and run red: 10 failed, 16 passed.
  Then *Decisions 1, 3 and 4*; green. One commit.
- **Task 2** (`85632ee`). The two report tests failed (2 failed, 24 passed), then
  *Decision 2*; green, with `UNCHANGED_WITHOUT_BANDS` unchanged.
- **Task 3** (`e3df2df`). Every *Decision 5* edit. `cmp` of the two bands files prints
  nothing.
- **Task 4** (`e6797a2` red, `7ffb40f` green; hashes after the rebase). The red commit's self-check printed
  `NOT CAUGHT  silent-drop            catalog-drift passed against a broken project` and
  `Self-check FAILED`. After the guard: see *Verification results*.
- **Task 5** (`e795f9f`). Two entries dropped, `harness-does-not-need-node` left
  shelved, this plan's entry promoted to `shipped` with its modules and the comment
  naming each criterion's check. Built with the source scripts (see *What the plan got
  wrong*), the arc `2026-08-14-harness-sidecar-design` has `state` `parked`, `shipped` 0,
  `counted` 1, `total` 2; the two dropped entries carry `cl` `{"k":"dropped"}`, and
  `harness-does-not-need-node` has `cl` null and `sh` true. Neither the built page nor
  `bands.yaml` is committed.
- **Task 6.** Fresh-agent check, one run, passed. See below.
- **Task 7 and 8.** This report; branch pushed; pull request opened. Not merged.

**Fresh-agent check** (for the squash message). A fresh Claude Code 2.1.300 session
(`claude -p`, macOS, arm64), in a scratch project set up from this branch with
`set-up-project.sh` and committed, was given the plan's prompt verbatim: add
`probe-widget-export` and `probe-widget-print`, then record that exporting will not be
done because sharing covers it, and printing is on hold until a customer asks. It set
the export idea to `status: dropped` with no `shelved` and a value starting
`Dropped 2026-10-31 -` giving the reason, kept the print idea at `status: idea` with
`shelved: true` and a value naming the customer request that brings it back, and
committed. The scratch project's board then listed the export idea with `cl`
`{"k":"dropped"}` and the print idea open with `sh: true`. That is what the change
intended. Before running it, the instructions that load for every project on this
install were read: they say nothing about catalog statuses, shelving or dropping, so the
probe was not following its own copy of the rule.

### Verification results

- `npm --prefix .tropis test`, on the catalog commit: `Tests:       33 passed, 33 total`.
- `bash scripts/check-blueprint.sh`, on the guard commit before the rebase:
  `caught      silent-shelf           catalog-drift`,
  `caught      silent-drop            catalog-drift`, `ok          clean baseline`, last
  line `Self-check passed: every guard caught its defect, the clean baseline passed, and
  the framework repository's own guards passed.` Run again on the handover commit
  before the rebase, the same lines and `Self-check passed`, with `TMPDIR` set to a
  folder of its own. Two runs on that commit with the shared temporary folder failed the
  clean baseline on one test, `take-version` *removes its scratch folder on every exit
  path*. That test counts take-version folders in the temporary folder, and two other
  sessions' self-checks were running there at the same time. It is run again on the
  rebased head; the pull request gives that result.
- The source guards touched here, run against the working tree with the self-check's
  test tools (`backlog-board`, `board-bands`, `next-report`, `next-work`): 52 passed.
- `npm --prefix .tropis run next`: an `Arcs under way` section is present, listing the
  framework updates arc (`10 of 20 shipped`) and the readme arc (`1 of 2 shipped`). That
  is the **installed** release's script, which predates this change. The source
  `next.mjs`, run on the same catalog, prints `10 of 17 shipped` for the updates arc,
  marks `seed-installs-cursor-generator`, `entry-file-says-how-rules-arrive` and
  `update-keeps-ignore-lines-in-their-own-form` with `-`, and does not list the harness
  sidecar arc.
- The page: built with the source scripts and opened in the desktop app's built-in
  browser over a local server. No console errors. The arcs box lists the updates arc at
  `10/17` with `3 set aside` and a row `Parked — nothing open, a shelved step remains:
  harness sidecar` / `parked`; `harness-does-not-need-node` sits in a band D row tagged
  `shelved`; with Closed expanded, `learnings-can-be-declined` and
  `entry-file-says-how-rules-arrive` read `dropped`.

### Scope

`git diff --stat origin/main...HEAD`, taken before this report was written, lists 18
files. With this plan file that is 19, every row of *File Structure* and nothing else:

```
 commands/feature.md                               | 17 +++--
 commands/refresh-board.md                         |  8 +--
 feature-catalog.yaml                              | 34 ++++++---
 fixtures/base/docs/backlog-board/bands.yaml       | 12 ++--
 fixtures/defects/silent-drop/feature-catalog.yaml | 23 +++++++
 framework/DECISIONS.md                            | 31 ++++++++-
 guards/backlog-board.test.js                      | 83 +++++++++++++++++++++--
 guards/catalog-drift.test.js                      | 10 +++
 guards/next-report.test.js                        | 37 ++++++++++
 rules/catalogs.md                                 | 41 +++++++++--
 scripts/board-bands.js                            |  6 +-
 scripts/build-backlog-board.mjs                   | 23 ++++---
 scripts/check-conformance.sh                      |  1 +
 scripts/next-work.js                              | 27 ++++++--
 scripts/next.mjs                                  | 10 +--
 templates/backlog-bands.yaml                      | 12 ++--
 templates/backlog-board.html                      | 72 ++++++++++----------
 templates/catalog.yaml                            | 17 ++---
```

Worktree: `../tropis-dropped`.

### Judgment calls

- **The silent-drop fixture keeps the base fixture's entry and adds a second one.** A
  copy of the silent-shelf fixture with `status: dropped` was caught on the red commit
  for the wrong reason: the base fixture's plan delivers `example-entry`, so the
  "every Delivers id is shipped" test failed on it. The fixture now holds `example-entry`
  as shipped, as in the base, plus `unwanted-entry`, dropped, whose value ends `Not
  needed, without saying why.` Confirmed by hand to pass the guard file without the new
  test and fail with it, then by the self-check as above.
- **Lines wrapped at 90 characters** where the verbatim text would have run past it: the
  bands files' lines 4–5 (wrapped to three lines, same words), the new status-transition
  bullet in `rules/catalogs.md`, the `commands/feature.md` opening line, and the
  catalog template's *Behaviour* and *Comments* paragraphs. The words are the plan's.
- **The footer's Arcs paragraph** keeps its `<p style="margin-top:9px">` wrapper; its
  first line is longer than its neighbours because the plan's text opens with a span.
- **FW-034's status line** keeps its date and is written exactly as the plan gives it,
  with no closing full stop, matching FW-008 and FW-021.
- **Rebased, and the decision renumbered FW-038.** `main` took FW-037 for the gate
  decision while this branch was open, and the pull request conflicted. The branch was
  rebased onto `a00f4bd`; the only conflict was the appended record, kept after FW-037 as
  FW-038, and FW-034's status line and the docs commit's body now name FW-038. The plan's
  own text above still says FW-037.
- **The `learnings-can-be-declined` comment** is wrapped as two lines at the entry's
  indentation, same words as the plan.

### What the plan got wrong

- **`npm --prefix .tropis run board` and `run next` use the installed release**, not the
  source scripts this plan changes. Task 5's check of `state` in the embedded `ARCS`
  could not pass that way (`state` is absent), and Task 7's `run next` shows the old
  counts. Both were done with the source scripts in a staged copy instead, as reported
  above. Until the next release is installed here, this repository's own board and
  report keep the old behaviour.
- **`npm --prefix .tropis test -- guards/backlog-board.test.js` finds no tests**: the
  installed suite holds only the installed guards. The source guards were run against
  the working tree with the self-check's test tools.
- **The silent-drop fixture as described was caught for the wrong reason** (see
  *Judgment calls*).
- **Two more tests than listed failed first in Task 1.** "does not ask for a band on a
  shelved entry" failed on today's code, because `dropped-one` was then open and listed
  as unbanded; and "reports a band outside A to D…" failed because `dropped-one`'s band
  was counted as unscored. Both pass after the change, and neither was adjusted.

### Outstanding

- **The reviewer's manual check of the board page**, by the developer, on a build made
  with this branch's scripts: the harness sidecar arc reads as parked,
  `harness-does-not-need-node` sits in D marked shelved, and
  `learnings-can-be-declined` and `entry-file-says-how-rules-arrive` are under Closed
  reading `dropped`. Note that `npm --prefix .tropis run board` here builds with the
  installed release, so it will not show this until a release is installed.
- **`entry-template-says-how-rules-load` is `supersededBy` an entry that is now
  dropped.** It still reads as closed (replaced), which is right, since its work was done
  either way; but its pointer now leads to an entry that says the work was done
  elsewhere. Proposal: leave it, with this line as the reason. Re-pointing a replaced
  entry is grooming, and the catalog rule says a pointer says more than a reason.
- **The fresh-agent check found nothing to fix.** Proposal: no backlog entry, since the
  clause it exercised did what it said on the first run.
- **This repository's `bands.yaml`** has no row for any of the three entries re-sorted
  here, so nothing in it goes stale. Built with this branch's scripts, the board's
  report lists six bands whose entry moved to `building`; that is the board's own
  upkeep, for `/refresh-board`, and not this plan's.

## Review record

Reviewed by the specifying session, 2026-10-31. Every check below ran with git 2.49.0 and
Node v22.15.0 on macOS (Darwin 25.2.0), arm64.

### Checks re-run

- **Scope.** `git diff --stat origin/main...HEAD` on `ef79a26`, and again after each rebase,
  onto `a5915cc` and `beae091`: 19 files, every one a row of *File Structure*.
- **The diff, read in full.** The scripts and the rule text match the plan word for word;
  the page edits match it edit by edit. FW-038 instead of FW-037, and the two-entry
  `silent-drop` fixture, are the executor's declared judgment calls, and both are right.
- **Self-check on `ef79a26`**, with its own `TMPDIR`: `caught      silent-shelf`,
  `caught      silent-drop`, `ok          clean baseline`, `Self-check passed`.
- **Guards re-broken**, in a throwaway detached worktree of `ef79a26`, one commit removing
  the drop-reason test from `guards/catalog-drift.test.js` and the `dropped` line from
  `closedHow` in `scripts/build-backlog-board.mjs`: `NOT CAUGHT  silent-drop
  catalog-drift passed against a broken project`, and the clean baseline failed on four
  board tests (`does not ask for a band on a shelved entry`, `flags closed entries…`,
  `reports a band on a replaced, dropped or shelved entry as stale…`, `reports a band
  outside A to D…`). `Self-check FAILED`. The worktree was removed.
- **After the rebase, on `a166d55`:** `npm --prefix .tropis test` printed
  `Tests:       33 passed, 33 total`; the self-check printed the same three lines and
  `Self-check passed`, in under three minutes.
- **After a second rebase, onto `beae091`**, which brought four merged plans, among them
  new catalog checks in `guards/catalog-entries.test.js` (no status list; `shelved` only
  on an idea or shaped entry, which the two dropped entries satisfy) and edits to
  `rules/catalogs.md`, `next.mjs` and `guards/next-report.test.js`: no conflict. On
  `797948d`, 19 files in the diff, `Tests:       33 passed, 33 total`, and the self-check
  again `caught      silent-shelf`, `caught      silent-drop`, `ok          clean
  baseline`, `Self-check passed`. The merged *Status transitions* section was read and
  reads as one.
- **The board's data**, built from the branch's four board files over the branch's
  catalog: harness sidecar `parked`, 0 of 1 counted, 2 in all; the updates arc `under
  way`, 10 of 17, 20 in all; `harness-does-not-need-node` open with `sh: true`; the two
  re-sorted entries closed as `dropped`.
- **The developer's check of the page**: `docs/verification-log.md`, entry of 2026-10-31,
  *The backlog board tells dropped work from shelved work*, five steps, `pass`.

### Found

Public exposure: the diff, the handover and this record were read for names, home paths,
hostnames and other projects' internals; nothing found.

- **A self-check run hung for an hour.** The first run on the rebased head never
  finished: a `take-version` test sat in `buildVersion` (`scripts/take-version.mjs`) for
  52 minutes, `tar -x` blocked at `archive_read_close` reading stdin to its end, and the
  Node process that spawned it never closed the pipe. The test uses `spawnSync`, which
  blocks the test worker, so the test's timeout could not fire. An orphaned
  `check-version.mjs` test process, 11 days old, was found on the same machine and
  killed. Why Node never closed the pipe is not known. The rerun passed in under three
  minutes. Not caused by this plan, which does not touch `take-version`.
- The handover's diagnosis of its two failed runs, `take-version` *removes its scratch
  folder on every exit path* failing while other sessions' self-checks shared the
  temporary folder, is consistent with what was seen here (runs with their own `TMPDIR`
  passed) but was not reproduced.

### Outstanding disposition

- **The board check:** done, `pass`, recorded.
- **`entry-template-says-how-rules-load` points `supersededBy` at an entry now dropped:**
  dropped, for the executor's reason: it still reads as closed, its work was done, and
  re-pointing a replaced entry is grooming, not this plan.
- **The fresh-agent check found nothing:** no entry; the clause did what it says on the
  first run.
- **This repository's `bands.yaml`:** no change owed; the six moved bands are
  `/refresh-board` upkeep.
- **The hung test:** put to the developer as a backlog entry after this merge. A test
  that can hang with nothing to stop it fails silently, so it qualifies.

### Learnings routed

- **`npm --prefix .tropis run board` and `run next` run the installed release here, not
  the source.** The plan told its executor to check source behaviour with them; it could
  not. `AGENTS.md`'s gotcha already says this of `npm --prefix .tropis test` and not of
  the other two. Put to the developer as a one-line addition to that gotcha, on a branch
  of its own, since `AGENTS.md` is not in this plan's file list.
- The hung test, as above.

### Merged because

Every criterion is backed by a test that was seen to fail without the change, a
fresh-agent check that passed, or the developer's recorded look at the page, and the
self-check passes on the head as rebased onto `beae091`.
