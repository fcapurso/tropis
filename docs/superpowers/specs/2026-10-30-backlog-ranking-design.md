# The backlog is ranked like a real one — design

**Date:** 2026-10-30 · **Status:** agreed with the developer, not yet planned in full

## Why

The board groups open entries into bands, and inside a band it lists them by id. Band B
held 19 entries on 2026-10-30, so the band says which group to pick from and nothing about
which entry comes first. The developer wants the backlog sorted the way a real one is,
with something like value and effort behind the order.

Looking at the bands with the developer turned up a second problem. The bands have one
phrase of definition each and nothing about what qualifies, so the lowest band had become
a bin. On 2026-10-30 band E (*leave alone*) held eleven entries of four kinds: four
replaced by other entries, two shelved, one already done and never closed, and four
waiting — two on another entry going first, one on a flaky failure recurring, one on a
file growing large enough to matter. Band C (*cheap win, batch it*) held 21 entries whose
only distinguishing fact was being small, which a score says better.

## Goals

1. Inside each band, entries are ranked, so the board and `/next` give one order.
2. The ranking rests on two scores per entry, value and effort, each with a one-line
   reason a person can argue with.
3. Each band has a written meaning, and there are four: **A do now**, **B do next**,
   **C decide first**, **D leave it**.
4. Work nobody will do — shipped, replaced or shelved entries — leaves the bands and
   sits in a collapsed section at the bottom of the board.
5. An entry that waits on another is banded on its own value, as if the other were done,
   and carries a marker naming what it waits on, so the developer can decide whether to
   clear the way.
6. The backlog is groomed: overlaps, conflicts and natural bundles between entries are
   found and proposed, on every refresh for what is new, and in full on request.

## Non-goals

- One ranked list across the whole backlog. The band always wins; the rank only orders
  entries inside a band. A cheap, low-value entry must not climb above urgent work
  because it is cheap.
- Weights, extra factors (urgency, risk, confidence), story points, or any arithmetic
  beyond one division.
- A new command. Grooming is a mode of `/refresh-board`.
- Changing the catalog from `/refresh-board`. It still never edits `feature-catalog.yaml`;
  every catalog change a refresh proposes goes through `/feature` with the developer's yes.

## Anti-goals

- A rank that looks precise and is not. Scores are 1 to 5 and coarse on purpose.
- A board that hides blocked work. Blocked entries stay in their band, visible.
- Scores nobody can check. Every score has its reason written beside it.

## The bands

| Band | Name | What qualifies |
|---|---|---|
| A | Do now | High value, and urgent or blocking other work. |
| B | Do next | Worth doing, no deadline. |
| C | Decide first | An open question only the developer can answer stands between the entry and a plan. The verdict names the question. |
| D | Leave it | Nothing to do until something happens — a failure recurs, a file grows, an adopter asks. The verdict names that trigger. |

The old C (*cheap win*) is gone: effort carries it. The old D (*decide, don't build*) is
the new C, and the old E (*leave alone*) is the new D, minus everything that is not open
work.

`/next` suggests from A and B only, and, as today, only shaped entries: an idea is
ranked on the board but not suggested, because its next step is shaping, not a plan. C is listed as needing a decision, as old D is today.
D is listed and never suggested. An open entry with no band counts as D, as it counts as
E today (FW-017: counting no bands as the lowest band would make `/next` suggest nothing,
which is why a project with no bands file keeps the report it had).

## Scores and rank

Each row in the bands file carries:

- `value`: 1 to 5 — how much it matters once done: what breaks, or stays painful, until
  then.
- `valueWhy`: one line saying why.
- `effort`: 1 to 5 — how big the job is, from a one-line edit (1) to a multi-plan arc (5).
- `effortWhy`: one line saying why.

**Rank is value divided by effort.** Inside a band, higher rank first. Ties go to an
entry in an arc already under way, then to the order `/next` already uses (`after`, then
catalog order).

Value overlaps the band — every A entry is high value — so inside A effort does most of
the sorting. That is accepted: the developer wanted both scores, and in B and D value
still separates entries.

The agent scores, the same way it bands: it reads the entry and its criteria, checks
the code where a score rests on a claim, and writes the score with its reason. The
developer overrides any score by editing the row. An override stands until the entry
moves and the build flags it for re-reading, exactly as a band does today.

## Waiting entries

An entry is banded on its own value, as though everything it waits on were done.

- **Blocked by X** (`blockedBy` in the catalog): starting early would not work.
- **Comes after X** (`after` in the catalog): starting early would work; the design set an
  order.

Both show as a marker on the card, naming the entries waited on that have not shipped.
`/next` never suggests a blocked entry. When the highest-ranked entry it would otherwise
show first is blocked, it says so in one line and names the blocker, so the developer can
choose to build the blocker instead. A `comes after` entry is ready and may be suggested;
its marker is the warning.

## Closed entries

Shipped, superseded (`supersededBy`) and shelved (`shelved: true`) entries take no band and
no scores. The board shows them in one collapsed section at the bottom, each with what
closed it: shipped, replaced by X, or shelved. Today the board does not list shipped entries
at all, only their count.

A row in the bands file for a superseded or shelved entry is stale, and the build reports
it for deletion, as it reports a row for a shipped entry today.

The catalog keeps no "won't do" status. Shelved is the nearest thing: decided against, with
a reason, revived by deleting one line. Entries are never deleted, because plans and specs
cite their ids.

## What the build reports

On top of what it reports today (unbanded, stale, moved):

- a row whose band is not A to D;
- a row with no `value` or no `effort`.

Every row written before this change has neither score, so every one is reported. That is
the migration: the first `/refresh-board` after taking the release re-judges every row
under the new bands. An old C, D or E row keeps a letter the new scheme can read, but it
is reported until it has scores, so none is left judged under the old meanings. Until that
refresh, `/next` reads an old D as *leave it* and an old E as unbanded — both never
suggested, as before — and an old C as *decide first*, so a cheap win is not suggested in
the gap. That cost is accepted over a conversion step.

## Grooming

Two moments, both inside `/refresh-board`:

1. **Every refresh, for what is new or moved.** While banding an entry the agent is
   already reading it, so it compares it with the open backlog for an overlap, a conflict,
   or a natural bundle. It looks at the new and moved entries only, against the rest.
2. **`/refresh-board groom`**, run when the developer chooses: every open entry against
   every other.

`/refresh-board all` (re-read every band, verdict and score) stays, and the two combine:
`/refresh-board all groom`.

What a grooming pass proposes, and what each becomes on the developer's yes:

| Finding | Becomes |
|---|---|
| Two entries overlap | one keeps the work, the other is marked superseded by it (`/feature`) |
| Two entries conflict | the entry that must yield goes to band C, its verdict naming the conflict |
| Entries are better done together | the rows share a `bundle` name; the board tags them, and `/next`, suggesting one, names the rest |
| An entry is stale or already done | it is closed through `/feature` |

Nothing is applied without the developer's yes. Proposals go in the refresh's report.

## How this lands

Two plans, because each makes one thing true:

1. **Ranked bands** — goals 1 to 5: the four bands, scores, rank, the closed section,
   the waiting markers, the build's new reports, `/next`, `/refresh-board`, the template,
   and a decision record.
2. **Grooming** — goal 6: the two grooming moments in `/refresh-board`, the `bundle`
   field, its tag on the board and its line in `/next`. It builds on the bands file shape
   plan 1 sets, so it follows plan 1.

After both ship and this repository takes the release carrying them,
`/refresh-board all groom` here is the one-time pass: every open entry re-banded and
scored, rows for closed entries removed, grooming proposals put to the developer.

## Decided by the specifying session

- The scores live in the bands file, beside the band, not in the catalog: the catalog
  holds facts, the bands file holds judgment (FW-017).
- Two markers, *blocked by* and *comes after*, not one, because they mean different
  things to someone deciding whether to clear the way.
- Shelved entries go in the closed section, since shelving is a decision not to do the
  work.
- No conversion step for existing bands files; the missing scores flag every old row.
- `/next` keeps suggesting shaped entries only, and its blocked line looks only at shaped
  entries. Ideas are ranked on the board alongside them.
- The field names `value`, `valueWhy`, `effort`, `effortWhy` and `bundle`, in the
  catalog's camelCase.

## Left to the plans

How the page lays out the scores, the markers and the closed section; how the build
passes shipped entries to the page; and the exact wording of the build's new report lines.
