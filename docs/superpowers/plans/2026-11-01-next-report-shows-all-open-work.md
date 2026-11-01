# The backlog report shows all open work and what to do about it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the backlog report (`scripts/next.mjs`, with `scripts/next-work.js`) prints
product work and framework work as two streams, each with its own next step and what to
do about it — dispatch the plan that is waiting, or write one — and, with bands, the
ideas worth shaping and the arcs that lost their turn; and its upstream-queue section
names `/flush-upstream` when the queue is worth a sitting. Nothing open drops out of the
report without a word.

**Spec:** the three entries of the bundle `next-report` in `feature-catalog.yaml`:
`next-lets-no-open-work-drop-out`, `next-shows-which-work-is-planned` and
`next-names-the-flush-when-due` (all band B in `docs/backlog-board/bands.yaml`). There
is no design document; the entries' acceptance criteria and the decisions below are the
design.

**One plan, decided by the specifying session:** what becomes true is one sentence —
the report says, for every kind of open work, what to do next. All three entries change
the same two scripts and the same guard, so separate plans would only queue behind each
other.

**What the specifying session verified on 2026-11-01, against `main` at `783dd62`:**

- **The report today.** `scripts/next.mjs` prints, in order: the main-branch line from
  `mainStatus(root).line` (from `scripts/main-status.mjs`) and a blank line; then, with
  bands, a `Next step:` line (`Next step: <id> — band <X>[ (<spec>)]`, or one of two
  `Next step: none — …` lines), an optional `  With it, bundle <name>: <ids>` line, an
  optional `  Ahead of it, blocked: …` or `  Highest blocked: …` line, and a blank line;
  without bands, `Next step: <id>[ (<spec>)]` and a blank line only when `nextStep`
  returns an entry. Then `Building (catalog status)`, `Ready to start` and `Blocked`
  over the whole catalog, mixed layers; then the README section, the retired-layer
  notice, the upstream-queue section, `Arcs under way`, and the idea and shelved counts.
  `line(entry)` prints `  - [<band>] [<type>] <id>: <title>` + `sourcePath(entry)` +
  ` (needs a decision)` for band C; `sourcePath` takes a `/plans/` ref, else a
  `/specs/` ref, from `entry.refs`.
- **Why planned work is invisible.** The catalog rule says `refs` names only the
  design, so a plan written for an entry is never in its `refs`; a plan names its
  entries under `## Delivers`. Three guards already read that section the same way:
  `guards/catalog-drift.test.js` (`stripFences`, `extractSection`, `deliveredIds`) — a
  plan is executed when `^## Handover report` matches outside fenced code blocks; the
  Delivers body has HTML comments removed, `None.` means no ids, and each line is split
  on commas, trimmed, has a leading `- ` or `* ` removed, and keeps tokens matching
  `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Plans live in `docs/superpowers/plans/`.
- **`scripts/next-work.js`** is pure (no I/O). It exports `isClosed`, `inFlight`,
  `ready`, `blocked`, `arcs`, `bandOf`, `hasBandRows`, `readyInBandOrder`, `nextStep`
  and `blockedAhead`; `BAND_RANK`, `SUGGESTABLE`, `compareByBand`, `underWayIds`,
  `waitingOn`, `isSuperseded` are module-private. `ready()` keeps only layers `product`
  and `framework`; `blocked()` keeps every layer.
- **Other readers of `next-work.js`:** `scripts/build-backlog-board.mjs` and
  `guards/backlog-board.test.js` import `arcs`, `bandOf`, `hasBandRows`, `nextStep` and
  call `nextStep(catalog, bands, scores)` with three arguments. A new optional fourth
  parameter that defaults to "all layers" leaves them unchanged.
- **The process the report already starts.** `scripts/main-status.mjs` imports
  `node:child_process` and runs `git` and `gh`; `next.mjs` imports `mainStatus` from it.
  `next.mjs` itself imports no `node:child_process`.
- **The queue section.** Printed only when `docs/BLUEPRINT-UPSTREAM.md` exists;
  `entries` are lines matching `^- \d{4}-\d{2}-\d{2} —` (parts are indented and not
  counted); `Last flushed:\s*(\d{4}-\d{2}-\d{2})` gives the date. This repository has no
  queue file. `today` is already computed in `next.mjs` as a local `YYYY-MM-DD` for
  `readmeFreshnessAt`.
- **Other places that depend on the report's text:** `guards/check-drift.test.js`
  ("says what to do about drift where the report is read") edits the literal
  `console.log('Ready to start');` in a copied `next.mjs` and expects drift — that
  statement must stay in `next.mjs` byte for byte. `git grep -nF` of `Ready to start`,
  `Building (catalog`, and `Next step:` outside `docs/superpowers`, the installed copies
  and the catalog finds nothing else that parses the output. `commands/next.md` says only
  to run the report and report its output.
- **Decisions on record.** `framework/DECISIONS.md` FW-017 says that with no bands file
  "`/next` prints what it printed before bands existed"; two streams without bands
  change that, so this plan records FW-042 and amends FW-017 (Decision 7). The operator
  guide's source is `templates/README.md`; its *What to type* section describes `/next`
  in one sentence (Decision 8).
- **The developer's user-level instructions** on the specifying session's machine say
  nothing about backlog reports, so a local fresh-agent probe is a real one.

**Model tier: Medium.** A restructure of one script and its guard against verbatim formats; the decisions are made, but rewriting about twenty assertions to the new format needs care.

**Merge authority: parent review.** The specifying session reviews and merges. Stop after the handover report (Task 6); do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 5 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

next-lets-no-open-work-drop-out
next-shows-which-work-is-planned
next-names-the-flush-when-due

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-next-report -b plan/next-report-shows-all-open-work origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.tropis/`, `.cursor/`, or `CLAUDE.md` / `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** An existing
  assertion whose expected text this plan's format changes is updated to the new
  format, not removed; say in the handover which ones you updated.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; the plan-reading
  helpers in `guards/catalog-drift.test.js` are this repository's own and may be
  followed. Say in the handover which named source, if any, you worked from.

## Decisions

### 1. Plans waiting to be dispatched (`next-work.js`, `next.mjs`)

Add to `next-work.js`, exported and pure:

```js
/**
 * Plans not yet executed, by the entry ids their Delivers section names.
 * @param {{path: string, text: string}[]} plans in file-name order
 * @returns {Map<string, string>} id to plan path; a later plan wins
 */
export function waitingPlans(plans) { … }
```

A plan counts when, with fenced code blocks blanked (lines from a ```` ``` ```` line to
the next, both included), `^## Handover report` does not match and a `## Delivers`
section exists. Its ids are read exactly as `deliveredIds` in
`guards/catalog-drift.test.js` reads them. Later plans in the array overwrite earlier
ones in the map.

In `next.mjs`: `const plansDir = resolve(root, 'docs/superpowers/plans')`; when it
exists, read every `*.md` in it, sorted by file name, as `{ path:
'docs/superpowers/plans/<name>', text }`, and build `const waiting =
waitingPlans(plans)`; when it does not exist, `waiting` is an empty map.

### 2. Where a line points (`sourcePath` in `next.mjs`)

When `waiting` has the entry's id, `sourcePath(entry)` returns `` ` — ${plan}` ``, and
when `entry.status === 'shaped'` adds ` (planned, not dispatched)` after it. Otherwise it
returns what it returns today. ` (needs a decision)` still follows, from `line()`.

Example: `  - [B] [improvement] some-entry: Some title — docs/superpowers/plans/2026-11-01-x.md (planned, not dispatched)`

### 3. The next step says what to do

A step's action is `` `dispatch ${plan}` `` when `waiting` has its id, else
`write its plan`, followed by `` ` (${spec})` `` when the entry has a `/specs/` ref. The
step line is:

- with bands: `Next step: <id> — band <X> — <action>`
- without bands: `Next step: <id> — <action>`

When there is no step: with bands, the two `Next step: none — …` lines of today,
computed over the stream's own layer; without bands,
`Next step: none — no ready entry continues an arc under way.` (new — today nothing is
printed). The `  With it, bundle …` line (bundle mates from the whole catalog, as today)
and the `  Ahead of it, blocked: …` / `  Highest blocked: …` line follow the step line
unchanged in wording.

### 4. Two streams (`next-work.js`, `next.mjs`)

In `next-work.js`:

- `nextStep(catalog, bands = null, scores = null, layer = null)`: as today, but when
  `layer` is given only entries of that layer are candidates. Readiness and order are
  still computed over the whole catalog first.
- `blockedAhead(catalog, bands, scores, step, layer = null)`: as today, but when `layer`
  is given only blocked entries of that layer are candidates.
- New, exported: `toShape(catalog, bands = null, scores = null, layer = null)` — `[]`
  without band rows; otherwise entries with `status: idea`, not shelved, not
  superseded, with no unshipped blocker, banded A or B, of `layer` when given, sorted
  by `compareByBand` then id.

In `next.mjs`, the line after the main-branch line is no longer a blank line; instead
the report prints `printStream('product', 'Product work')` then
`printStream('framework', 'Framework work')`, where `printStream` does exactly this:

1. Print an empty line, then `== <title> ==`.
2. Work out, each filtered to `entry.layer === layer` **after** being computed on the
   whole catalog: Building (`inFlight`), Ready (`readyInBandOrder`), Blocked
   (`blocked`, by `entry.layer`), and, with bands, To shape (`toShape(…, layer)`).
3. If all of those are empty, print `  (none)` and return.
4. Print an empty line, then the next-step block of Decision 3 for
   `nextStep(catalog, bands, scores, layer)` and `blockedAhead(…, step, layer)`.
5. Print an empty line, `Building (catalog status)` and its lines; an empty line,
   `Ready to start` (keep the statement `console.log('Ready to start');` byte for byte —
   see Traps) and its lines; an empty line, `Blocked` and its lines and `waiting on:`
   lines — each `  (none)` when empty, as today.
6. With bands only: an empty line, `To shape (ideas banded A or B)`, and each entry
   through `line()`, or `  (none)`.

Everything after the streams — README, retired-layer notice, queue, `Arcs under way`,
counts — stays in today's order and wording, each still preceded by its empty line.
The idea and shelved counts stay over the whole catalog.

### 5. Arcs that lost their turn (`next-work.js`, `next.mjs`)

New, exported in `next-work.js`: `lostTurns(catalog, bands = null, scores = null)` —
`[]` without band rows; otherwise, for each arc with `state === 'under way'`: its first
entry, in the arc's own order, that `ready(catalog)` contains; if there is one, the step
`nextStep(catalog, bands, scores, thatEntry.layer)`; when that step exists, is not the
entry, and its band ranks strictly higher (`BAND_RANK` smaller), the result holds
`{ ref, entry, step }`.

In `next.mjs`, in `Arcs under way`, after an arc's entry lines, for a lost arc print:
`    lost its turn: <entry id> is band <X>, behind <step id> (band <Y>)`

### 6. The flush when due (`next.mjs`)

In the queue section, after the count line, collect reasons:

- `entries.length >= 3` → `` `${count} waiting (three or more)` `` (`count` is today's
  `"3 entries"` string, so this reads `3 entries waiting (three or more)`);
- `entries.length >= 1`, a Last flushed date found, and more than 14 whole days from that
  date to today → `` `last flushed ${days} days ago (more than 14)` ``. Days are
  `(Date.UTC(today) - Date.UTC(flushed)) / 86400000` over the two `YYYY-MM-DD` dates'
  year, month and day parts, so time zones and daylight saving do not shift it. Reuse
  the local `YYYY-MM-DD` today that `readmeFreshnessAt` already receives; compute it once.

When any reason holds, print `` `  Run /flush-upstream: ${reasons.join('; ')}.` ``.
Otherwise print nothing more. With no queue file there is still no section. `next.mjs`
gains no import of `node:child_process`; the report names the command and never runs it.

### 7. The decision record (`framework/DECISIONS.md`)

At the end of FW-017's **Decision** paragraph, after `Amended by FW-034: four bands, C
and D listed and never suggested.`, add: ` Amended by FW-042: without bands it prints a
product and a framework stream.`

Append after FW-041, verbatim (wrap to the file's width):

> ## FW-042: The backlog report shows product and framework work as two streams
>
> **Date:** 2026-11-01 · **Status:** Accepted
>
> **Decision:** The backlog report prints a product stream and a framework stream, each
> with its own next step and its own Building, Ready and Blocked lists, and, with bands,
> the ideas banded A or B that are ready to shape. Readiness is worked out on the whole
> catalog before entries are sorted into streams, so a product entry waiting on a
> framework entry shows as blocked. A next step says what to do: dispatch the plan that
> delivers it when one is waiting, found by its Delivers section, or write its plan.
> Arcs under way follow both streams, and with bands an arc whose next entry lost to a
> higher band says so. Without bands the report still prints both streams, and nothing
> about shaping or lost turns.
>
> **Rejected:** One list across layers, where a ready entry of one layer hides the other
> layer's next step. Two streams only when bands exist, which would give a project two
> shapes of report and a reason not to band. Finding a plan through `refs`, which the
> catalog rule keeps for the design.
>
> **Consequences:** A project with no framework entries sees a framework stream reading
> (none). The board's top box still makes one suggestion across layers; it is unchanged.

### 8. The operator guide (`templates/README.md`)

In *What to type*, replace `with bands written, \`/next\` suggests by band, and by value
over effort inside one.` with:

`/next` shows product work and framework work as two streams, each with its next step:
dispatching the plan that is waiting, or writing one. With bands written it suggests by
band, and by value over effort inside one, lists the ideas banded A or B to shape, and
says when an arc under way lost its turn. It names `/flush-upstream` when the upstream
queue holds three entries, or has one waiting and was last flushed more than 14 days ago.

### 9. Tests (`guards/next-report.test.js`)

Extend `stageReport` with an optional fourth argument, `plans`, an object of file name
to text written under `docs/superpowers/plans/`. Add these tests, each failing against
today's `next.mjs` (Task 1):

1. **two streams, each with its own lists** — a catalog with a ready product entry and a
   ready framework entry, both in arcs under way, no bands: both headings appear in the
   order product, framework; each stream's `Next step:` names its own entry; each
   entry appears in its own stream's Ready list only.
2. **a layer with no entries reads (none)** — product entries only: output contains
   `== Framework work ==\n  (none)\n`.
3. **blocked across layers** — a product entry `blockedBy` a framework idea: it is under
   the product stream's `Blocked`, `waiting on: <framework id>`, and not in any Ready.
4. **arcs after both streams** — `indexOf('Arcs under way')` > `indexOf('== Framework work ==')`.
5. **ideas to shape, with bands** — an unblocked band A idea, an unblocked band B idea, a
   band C idea and a blocked band A idea: the `To shape (ideas banded A or B)` section
   lists the first two and neither of the others.
6. **a lost turn, with bands** — an arc under way whose next ready entry is band C while
   another ready product entry is band B: the arc prints
   `    lost its turn: <entry> is band C, behind <step> (band B)`; and with the arc's
   entry banded B and ranked equal, no `lost its turn`.
7. **nothing about shaping or lost turns without bands** — catalog of test 5 and 6, no
   bands file: no `To shape`, no `lost its turn`, both stream headings present.
8. **a waiting plan** — a plan whose Delivers names a shaped ready entry, no handover
   report: the Ready line ends `— docs/superpowers/plans/<name> (planned, not
   dispatched)` and the Next step line ends `— dispatch docs/superpowers/plans/<name>`
   (with and without bands).
9. **plans that mark nothing** — a plan with a `## Handover report`, a plan naming
   another id, and a plan whose `## Delivers` heading and id sit only inside a fenced
   block: the entry's line has no `(planned, not dispatched)` and the step says
   `write its plan`.
10. **no plans folder** — the output equals the expected text in test 11 (no error).
11. **the same with no bands file and a header-only one** — replaces "is unchanged
    without bands": `UNCHANGED_WITHOUT_BANDS` becomes exactly the text below, and both
    runs equal it and each other. Rename the constant and the test to say what they now
    hold.

    ```
    Main branch: could not tell — no remote named origin.

    == Product work ==

    Next step: ready-step — write its plan (docs/specs/arc-design.md)

    Building (catalog status)
      (none)

    Ready to start
      - [feature] ready-step: Ready step — docs/specs/arc-design.md

    Blocked
      - [feature] blocked-step: Blocked step
          waiting on: not-shipped

    == Framework work ==
      (none)

    Arcs under way
      docs/specs/arc-design.md — 1 of 2 shipped
        ✓ shipped-step
          ready-step

    1 idea(s) not yet shaped.
    ```

    (Without the four-space indent this block carries here, and with a trailing newline.)
12. **the flush when due** — dates built from the local date at test time with the same
    `YYYY-MM-DD` formatting the report uses: three entries flushed 2 days ago → the line
    `  Run /flush-upstream: 3 entries waiting (three or more).`; one entry flushed 20
    days ago → `  Run /flush-upstream: last flushed 20 days ago (more than 14).`; three
    entries flushed 20 days ago → both reasons joined by `; `; two entries flushed 14
    days ago, two entries with no date, and no entries flushed 20 days ago → no
    `/flush-upstream`; no queue file → no `Waiting in the upstream queue`.
13. **the report never runs the flush** — reads `scripts/next.mjs` and expects it not
    to match `/child_process/`.

Existing tests whose expected text the new format changes (the `Next step:` lines that
now end in an action, the old byte-for-byte constant) are updated to the new format.

## Traps

- **`console.log('Ready to start');` must stay byte for byte in `next.mjs`.**
  `guards/check-drift.test.js` edits that exact statement to prove drift is reported;
  written any other way (a template string, a variable) that test fails.
- **`bash scripts/check-blueprint.sh` reads committed content only.** Commit before you
  run it. For a red check, make the revert a throwaway commit, run the guard through the
  snippet in Task 0, and drop the commit (`git reset --hard HEAD~1` on your own branch
  only).
- **`npm --prefix .tropis run next` runs the installed release**, not your change. Run
  the source through `guards/next-report.test.js`, or the scratch project of Task 5.
- **Several existing tests slice the output between `indexOf('Ready to start')` and
  `indexOf('Blocked')`.** With two streams those find the product stream's sections,
  which is right for their product-only catalogs; check each still reads what its name
  says.
- **`guards/set-up-project.test.js` "records every shipped file at version unknown"** is
  known to pass only in the self-check's archive export and to fail from a checkout. If
  it is the only failure in `npm --prefix .tropis test`, check it fails the same on
  `origin/main` and record that; do not fix it here.
- **A plan header field sits on one line** until a release after 0.7.1 is installed;
  this plan's do. Do not rewrap them.

## File Structure

| File | Change |
|---|---|
| `scripts/next-work.js` | Decisions 1, 4, 5 |
| `scripts/next.mjs` | Decisions 1–6 |
| `guards/next-report.test.js` | Decision 9 |
| `framework/DECISIONS.md` | Decision 7 |
| `templates/README.md` | Decision 8 |
| `feature-catalog.yaml` | Task 5: the three entries to shipped |
| `docs/superpowers/plans/2026-11-01-next-report-shows-all-open-work.md` | Task 6: the handover report |

Doc closeout, decided by the specifying session: FW-042 records the choice between real
alternatives, and amends FW-017, whose sentence about the report without bands stops
being true. The operator guide says what `/next` shows. No rule: nothing here is a
constraint an agent would trip over that the report itself does not now show. No
release-note line: `/release` drafts the notes from the backlog. `commands/next.md` is
unchanged: it says to report the output, which now carries the streams. Nothing for the
upstream queue: this repository is the upstream. The board's top box, which still makes
one suggestion across layers, is out of scope.

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table; run the command from the primary checkout of
`tropis`, the one whose `.git` is a directory, after `git fetch origin`). In the
worktree run `npm --prefix .tropis ci`, then `git status --porcelain` (passes when it
prints nothing), then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `uname -sm`, your tool and version, and the commit you started from.

To run one guard on committed content outside the self-check (used below):

```bash
S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
echo '{"type":"module"}' > "$S/package.json"
cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
(cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/next-report.test.js guards/check-drift.test.js guards/backlog-board.test.js); rm -rf "$S"
```

### Task 1 — Tests first (Decision 9)

Write the new tests and update the existing ones. Commit the test change alone and run
the snippet: record the failures (every new test must fail, each for the reason its
name gives; test 13 is the exception — it passes today and guards the future, so say
so).

### Task 2 — Plans and streams (Decisions 1–5)

Change `next-work.js` and `next.mjs`. Commit, run the snippet: passes when the three
guards report no failed test, apart from test 12, which waits for Task 3.

### Task 3 — The flush (Decision 6)

Change `next.mjs`. Commit, run the snippet: passes when the three guards report no
failed test.

**Red checks**, each as a throwaway commit, run through the snippet, then dropped;
record the failing test names:

- `waitingPlans` no longer skips a plan with a handover report — test 9 must fail;
- `printStream` filters by layer before working out Blocked (pass a catalog filtered to
  the layer to `blocked`) — test 3 must fail;
- `toShape` without its blocker check — test 5 must fail;
- the age threshold without its `entries.length >= 1` condition — test 12 must fail.

### Task 4 — The records (Decisions 7 and 8)

Edit `framework/DECISIONS.md` and `templates/README.md`. Commit, then run
`bash scripts/check-blueprint.sh` (passes: last line starts `Self-check passed`).

### Task 5 — The fresh-agent check, the full suite, the catalog

**The probe.** Build a scratch project the way `stageReport` does (a temporary folder
with `.tropis/scripts/` holding the five report files, `.tropis/package.json`
`{"type":"module"}`, `.tropis/node_modules` linked to the worktree's), with a catalog,
a bands file and a queue you write so that: a ready product entry banded B has a waiting
plan under `docs/superpowers/plans/`; a ready framework entry banded A has none; an
unblocked product idea is banded A; the queue holds three entries. Invent every id and
title; this is a probe and is discarded. Run its `next.mjs` and save the output. Pipe a
fresh session this prompt with the output appended, from a folder that is not a
repository, allowing no tools; give the tool and version you used:

> This is a probe; its output is discarded and nothing you say will be run. Below is the
> backlog report a project's `/next` printed. Using only the report, say: what to do
> next for product work, what to do next for framework work, which ideas want shaping,
> and whether anything else is due.

**Passes when** the answer says to dispatch the product entry's plan by its path, to
write a plan for the framework entry, names the idea as one to shape, and says to run
`/flush-upstream`. Any other answer: the report's wording is not finished; reword it
(within the formats above, or record the change as a judgment call), re-run, and record
each run. Delete the scratch folder afterwards.

**The suite.**

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite (Trap's known one aside)
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

**The criteria.** For each acceptance criterion of the three entries (sixteen in all),
name the test that covers it and check the named test runs what the criterion
describes; put the table in the handover.

**The catalog.** In `feature-catalog.yaml`, on each of the three entries: set
`status: shipped`; set `modules` to `scripts/next.mjs`, `scripts/next-work.js` and
`guards/next-report.test.js`; and directly above its `- id:` line, below the comments
already there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-next-report-shows-all-open-work.md; each
# criterion's test is in that plan's handover report.
```

Leave `docs/backlog-board/bands.yaml` alone. Commit with a body that says what becomes
true and, in one or two sentences, what the probe was asked, what it answered, and the
tool, version, operating system and architecture (never the computer's name). Re-run
the two commands above and `git diff --stat origin/main...HEAD` (passes: only the
*File Structure* files).

### Task 6 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*: Task completion, Verification results,
Scope, Judgment calls, What the plan got wrong, Outstanding), each check's command with
its actual output, the red checks' failing test names, the criteria table, the probe's
answer, and the worktree path used. Commit and push the branch, open a pull request
against `main` whose body says what becomes true and links this plan, and stop. Do not
write a review record and do not merge.
