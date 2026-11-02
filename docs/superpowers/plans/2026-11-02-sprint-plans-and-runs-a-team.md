# The developer plans a sprint with /sprint, and a team delivers it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a developer runs `/sprint`, agrees a proposed sprint of about 20 story points,
says to start, and the sprint session starts the whole team in that turn: one session
per entry, which the developer can open, each delivering its entry through the workflow
and waiting by itself for what it depends on. The developer can ask where the sprint
stands, with stopped team members first, hears about new entries, and gets a report at
the end. In a tool that cannot start sessions, the sprint session works through the
entries itself, one at a time.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md`, §1, §2, §5 to §9, §11
and *Goals*; decisions FW-049 to FW-053 and FW-055 in `framework/DECISIONS.md`; the eight
acceptance criteria of the entry `sprint-plans-and-runs-a-team` in `feature-catalog.yaml`.
Build only this entry. Starting a team member in another tool
(`team-members-start-in-another-tool`, FW-050), renaming the backlog's words
(`backlog-speaks-in-epics-stories-and-points`) and taking the 60-minute limits off the
token wait and the merges-after wait (`waits-end-when-something-happens`) are other
entries: do not build them. The new wait this plan adds, for a blocker to ship, has no
time limit from the start (FW-055).

**One plan:** what becomes true is one sentence — a developer plans a sprint with
`/sprint` and a team delivers it under rules every delivering session follows. The script,
its tests, the command, the workflow section and the operator guide's paragraph all serve
that one thing.

**What the specifying session verified on 2026-11-02, against `origin/main` at `d434d75`:**

- **The merge token and the overlap check exist.** `scripts/merge-token.mjs` exports
  `tokenStatus(root, { env, now, ref })`, returning `{ state, line }` with `line` starting
  `Merge token:`. `scripts/plan-overlap.mjs` and `scripts/plan-binding.js` exist;
  `plan-binding.js` exports `mergesAfterIds(markdown)` and `deliversIds(markdown)`.
  `framework/workflow.md` has the sections `## Plans that touch the same files`,
  `## The merge token`, `## Merge and clean up — in this order`, `## Merging`,
  `## The cycle` and `## Doc closeout — required`, in that order. Nothing in
  `framework/`, `commands/` or `templates/` says `PARKED` or `SHIPPED`; `STOPPED` appears
  in the overlap and token sections.
- **`scripts/main-status.mjs`** exports `originOnGitHub(root, env)` (returns `{}` for a
  GitHub origin, else `{ error }`). Its private `askGh` is the model for asking `gh`
  with a timeout and keeping the first stderr line on failure; it resolves the root with
  `git rev-parse --show-toplevel`, falling back to two levels above the script.
- **`scripts/next-work.js`** exports `isClosed(entry)` (shipped, dropped, or
  `supersededBy` non-empty), `bandOf(id, bands)` (A to D, unbanded or unknown counts as
  D), `hasBandRows`, `readyInBandOrder` and others. The comparator `compareByBand(bands,
  scores, underWay)` and the helpers `underWayIds(catalog)` and `orderByAfter(entries)`
  are private. `readyInBandOrder` covers only `shaped` entries, so a sprint, which also
  takes ideas, cannot use it as it is.
- **`scripts/board-bands.js`** exports `bandLetters(rows)`, `bandScores(rows)` (id to
  `{ value, effort }`, only rows whose two scores are integers 1 to 5) and
  `bandBundles(rows)` (id to bundle name). The `effort` score is what the spec calls
  story points.
- **The catalog's statuses** are `idea`, `shaped`, `building`, `shipped`, `dropped`;
  `shelved: true` parks an entry; `type` is one of `bug`, `chore`, `feature`,
  `improvement`, `spike`; `layer` is `product`, `framework` or others. A plan an entry
  is built from is the entry's `refs` item under `docs/superpowers/plans/`.
- **`git rev-parse --git-common-dir`** prints `.git` (relative) in the main checkout and
  an absolute path ending `/.git` in a worktree. Both name one directory, which git never
  tracks; a file under it is shared by every worktree and never committed. Checked with
  git 2.49.0 on macOS 26.2, arm64.
- **`templates/package.json`** has `scripts` `test`, `next`, `board`, `dispatch`,
  `rules`, `prepare`. **`scripts/installed-scripts.txt`** lists every file setup copies
  into `.tropis/scripts/`; its last line is `merge-token.mjs`. **`commands/`** is
  installed whole into `.claude/commands/`; no list of commands needs a line, except the
  operator guide's sentence in `templates/README.md` that starts
  ``Commands you will type here: `/idea`, `/feature`, `/next`, `/refresh-board`, `/refresh-readme`, `/dispatch`,``
  and goes on, on the next line, ``` `/capture-learning`, `/refresh-model-tiers`.```.
  The operator guide's merge-token paragraph ends with "…as the second line of `/next`
  does." directly before `## Where the framework lives`.
- **`guards/set-up-project.test.js`** asserts the exact list of shipped files holding
  project-owned blocks. The new command and script carry none, so that list does not
  change.
- **The integrity guard** (`guards/framework-integrity.test.js`) checks backticked paths
  starting `src/`, `docs/`, `scripts/`, `.claude/` or `.github/` in framework documents
  and commands. Write `.tropis/scripts/sprint.mjs`, never `scripts/sprint.mjs`, in
  backticks there.
- **No other entry is in `building`** on `origin/main`; the claim ran
  `plan-overlap.mjs --claim` to confirm no plan in `building` shares a file.
- **FW-055 decides how the team starts and waits.** On the developer's word the sprint
  session starts every team member in that same turn, as ordinary sessions of its tool
  the developer can open; nothing starts later except an entry slid in, on the turn it is
  added. Subagents of the sprint session and command lines run in the background were
  rejected: the developer cannot open them. A team member whose entry is `blockedBy` an
  unshipped one waits in a background wait in its own session until it ships, then
  carries on; if that entry is parked it stops `PARKED: depends on <id>`. Waits end on
  events, not clocks. What a team member may run is the tool's own permission settings;
  the sprint adds no list of commands. The status lists stopped team members first and
  the sprint session notifies the developer where the tool can. **Unobserved:** whether
  a Claude Code session keeps waking from its own background wait over hours; this entry
  must check it (*Decision 8*).
- **FW-053, the plan-only limitation.** Every agent Tropis starts runs signed in to a
  plan the developer already pays for; no API key billed per call. A cloud session billed
  to the plan is allowed on cost.
- **The Claude desktop app** lets a session start another only on a turn the developer
  typed, and a session started by a session cannot start sessions (FW-055's evidence).
  So a team member in that app dispatches its executor as a subagent, never as a
  session.
- **The last two plans from this spec** (review records read): import a module under
  test as a namespace (`import * as sprint from '../scripts/sprint.mjs'`), or a missing
  export fails the whole test file at link time; a red self-check stops at its
  clean-baseline step for a new script lacking the shared-machinery line, so get red test
  names by running the new test file alone; a line in a framework document must not run
  past the file's width (both reviews rewrapped one); and the fresh-agent probe for the
  token found a wording gap the plan's verbatim text had — expect the same and fix the
  wording, not the probe.
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about sprints, parking or final lines, so a local fresh-agent probe in a
  scratch folder outside this repository is a real one.
- **No cloud agent and nothing billed beyond the developer's plan.** The developer has
  ruled this out for building and testing this entry. The fresh-agent check uses the
  agent command line already signed in on this machine, never a cloud session or an API
  key.

**Model tier: Medium.** One script with eleven small commands over a local file, the
backlog on `origin/main`, `gh` and the token, with stubbed tests; the prose is given
verbatim. The ordering, the wait and the status rules need care, not invention.

**Merge authority: parent review.** The specifying session reviews, runs the hours-long
wake check (*Decision 8*), opens the pull request and merges. Stop after Task 8; do not
open a pull request, write a review record or merge.

**Requires:** `gh` signed in, for nothing but reading this repository's open pull requests in the Task 5 live run, and an agent command-line tool that starts a fresh local session from a prompt, for the fresh-agent check in Task 6 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

sprint-plans-and-runs-a-team

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-sprint -b plan/sprint-plans-and-runs-a-team origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.** Use `node:` built-ins and the `yaml` package the scripts already
  use.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`. Test identities use `example.com` addresses.
- **No test reaches the network.** A test whose origin is a `github.com` URL puts a stub
  `gh` first on PATH; a test that fetches uses a local bare repository as `origin`.
- **Never touch the merge token or open a pull request on GitHub.** Other sessions are
  working on this repository. The live run in Task 5 only reads.
- **No cloud session, cloud agent or API key**, in the work or its checks.
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from. `main-status.mjs`, `merge-token.mjs`,
  `plan-overlap.mjs`, `next-work.js` and their tests are this repository's own and may
  be followed.
- **Tests isolate git, the script does not.** Per `.claude/rules/harness-scripts.md`: set
  `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_NOSYSTEM` (or `HOME`) only in the environment a test
  spawns git or the script with, and give each temporary repository its own identity.
- **Lines in framework documents and commands stay within the file's width** (90
  characters, as the text around them), except where the verbatim text below has a
  longer line.

## Decisions

### 1. The sprint file

The agreed sprint lives in `<git common dir>/tropis/sprint.json`, where the common dir is
`git rev-parse --git-common-dir` resolved against the repository root. It is local,
shared by every worktree of the checkout, survives a reset of the sprint session's
conversation, and is never committed. Create the `tropis/` directory when writing. Its
shape, written with two-space indentation and a trailing newline:

```json
{
  "started": "2026-11-02T09:00:00Z",
  "budget": 20,
  "way": "session",
  "entries": [
    { "id": "glaze-log", "points": 3 },
    { "id": "kiln-alarm", "points": 2, "bundle": "kiln" }
  ],
  "baseline": ["every", "catalog", "id", "on", "main", "at", "the", "start"],
  "marks": {
    "glaze-log": { "state": "parked", "reason": "needs the developer to choose a printer" }
  },
  "notes": { "kiln-alarm": ["took FW-060 for the alarm's sound"] }
}
```

`started` is ISO 8601 UTC to the second. `way` is `session` (every team member a session
of the tool, started at once) or `here` (the sprint session delivers the entries itself,
one at a time). `points` is the entry's `effort` score from the bands file, or 0 when it
has none. `marks` and `notes` start empty. Team members write marks too: they share the
file through the common dir, since each works in a worktree of the same checkout.

### 2. `scripts/sprint.mjs`

A new script with `// Shared machinery: no part of this file is project-owned.` on its
second line after a `#!/usr/bin/env node` first line, a module comment in the style of
`merge-token.mjs` (what it is, its commands and exits, which file imports it — none), the
root resolved as `main-status.mjs` resolves it, and a `ranDirectly` block. Each command
prints its result on stdout; errors go to stdout too, as one line, with a non-zero exit.

**Reading the backlog.** Every command that reads the backlog first runs
`git fetch --quiet origin` and then reads `feature-catalog.yaml` and
`docs/backlog-board/bands.yaml` at `origin/main` with `git show`. A failed fetch prints
`Sprint: could not fetch origin — <first stderr line>; reading origin/main as last fetched.`
and goes on. Where `origin/main` does not exist, it reads both files from the working
tree and prints `Sprint: no origin/main, so this reads the working tree.` A missing
bands file is no bands.

**Candidates and order** (`propose`). A candidate is an entry whose status is `idea` or
`shaped`, that is not closed (`isClosed`), not `shelved`, of layer `product` or
`framework`, banded `A` or `B`, and has scores (`bandScores`). Sort candidates with the
same comparator `/next` uses: export a new function from `scripts/next-work.js`,

```js
/**
 * Entries in the order /next suggests them: band, then value over effort, then an
 * arc already under way first. The sprint proposal uses it for ideas as well as
 * shaped entries.
 */
export function inRankOrder(entries, catalog, bands = null, scores = null) {
  return [...entries].sort(compareByBand(bands, scores, underWayIds(catalog)));
}
```

and leave every existing function as it is. Then walk the sorted candidates and add each
to the sprint when all of these hold, otherwise skip it and go on to the next:

- every id in its `blockedBy` is shipped on main, or is already in the sprint;
- its points, together with the points of every other candidate in its bundle
  (`bandBundles`; a bundle comes whole, at the place of its first member in the order),
  fit inside what is left of the budget.

Inside the sprint, an entry moves to directly after the last sprint entry it names in
`after` or `blockedBy` when it stands before it; the order is otherwise the walk's.
`--points <n>` sets the budget (a positive integer; anything else exits 1 with
`Sprint: --points takes a whole number above 0.`); the default is 20.

**Status of one entry** (`status`, `report`), the first that applies, `main` meaning the
catalog on `origin/main`:

1. shipped on main → `shipped`
2. dropped on main → `dropped`
3. marked `parked` or `stopped` → `parked: <reason>` / `stopped: <reason>`
4. an open pull request whose head branch contains the id: when the entry is `building`
   on main → `merging (#<N>)`, otherwise `claiming (#<N>)`
5. `building` on main, and its plan (the last `refs` item under
   `docs/superpowers/plans/`, read at `origin/main`) names in `Merges after` an entry that
   is neither shipped nor dropped on main → `waiting to merge, after <id>[, <id>]`
6. `building` on main → `building`
7. an id in its `blockedBy` is not shipped on main → `waiting for <id>[, <id>] to ship`
8. marked `planning` → `planning`
9. otherwise → `not started`

Open pull requests come from `gh pr list --state open --limit 100 --json
number,headRefName` run in the root, only when `originOnGitHub` says origin is on GitHub,
with a 20-second timeout. When it cannot be asked, status prints
`Sprint: open pull requests unknown — <reason>.` and step 4 is skipped.

**Commands and their exact output.** `<p>` is a number of points, `<h>` hours to one
decimal place, `<time>` ISO 8601 UTC to the second. Two spaces indent every listed line.

- `propose [--points <n>]` — exit 0.
  ```
  Sprint: proposed <p> of <budget> points, from main at <7-character sha>.
    1. <id> — <p> pts, band <A|B>[, bundle <name>] — <title>
    2. ...
  Sprint: next in line, over the budget — <id> (<p> pts).
  ```
  The last line only when a candidate was skipped for the budget alone, naming the first
  such. The sha is `origin/main`'s, or `working tree` in its place when there is none.
  With no candidate added: `Sprint: nothing to propose — no idea or shaped entry banded A or B is free to start.`
- `start <id> [<id> ...] [--points <n>] [--way session|here]` — writes the file
  with the ids in the order given, the budget (default 20), `way` (default `here`), the
  points from the bands file, `started` now and `baseline` every catalog id on main.
  Prints `Sprint: started with <n> entries, <p> of <budget> points; team members start as <way>.`,
  exit 0. Exit 1 with a line, writing nothing, for: a sprint file that exists
  (`Sprint: one is under way since <time>; end it first.`), an id not in the catalog
  (`Sprint: no entry <id> in the backlog.`), a `--way` not in the list, no ids.
- `add <id>` — appends it with its points. Prints
  `Sprint: added <id> (<p> pts); <total> of <budget> points.` When the total is then over
  the budget, also `Sprint: over the budget by <k> points — <id>, <id> not started yet would leave the sprint to make room.`,
  naming entries whose status is `not started`, from the end of the sprint backwards,
  until the rest fits; it removes none. Exit 0; exit 1 for an id already in the sprint
  or not in the catalog.
- `drop <id>` — removes it, and its mark and notes. `Sprint: dropped <id>; <total> of <budget> points.`
- `mark <id> planning|parked|stopped|clear [<reason> ...]` — records or, with `clear`,
  removes the entry's mark; `parked` and `stopped` need a reason. `Sprint: <id> marked <state>.`
  or `Sprint: <id> mark cleared.` Run by the sprint session and by team members.
- `wait <id> [--interval <seconds>]` — the team member's wait for its blockers. Every
  interval (default 30 seconds) it fetches origin and reads the catalog on `origin/main`
  as *Reading the backlog* says, and the sprint file if there is one. When every id in
  the entry's `blockedBy` is shipped on main (or it has none) it prints
  `Sprint: <id> can start — nothing it is blocked by is still open.` and exits 0. When
  one is dropped on main, or marked `parked` or `stopped` in the sprint file, it prints
  `PARKED: depends on <blocker>` and exits 3. Otherwise it keeps waiting, with no time
  limit, printing nothing more than one line when it starts:
  `Sprint: <id> waits for <blocker>[, <blocker>] to ship.` A failed fetch does not end
  the wait; it reads `origin/main` as last fetched, as the other commands do, and says so
  once. An id not in the catalog exits 1. It works with no sprint file, so a session the
  developer started by hand can use it too.
- `note <id> <text> ...` — appends the words as one note. `Sprint: noted for <id>.`
- `brief <id>` — prints the team member's brief, *Decision 3*, for an entry in the
  sprint. Exit 1 for an id not in the sprint.
- `status` — exit 0.
  ```
  Sprint: started <time>, <h> h ago; <p> of <total> points shipped, <budget> budgeted.
  Merge token: <tokenStatus line, as it stands>
  Sprint: needs you — <n> stopped or parked.
    <id> — <parked: reason | stopped: reason>
  Sprint: the rest.
    <id> — <status of the entry>
    ...
  Sprint: other open pull requests — #<N> <branch>, #<N> <branch>.
  Sprint: new in the backlog since the start — <id> [<type>] <title>; <id> [<type>] <title>.
  ```
  The `needs you` line and its entries only when an entry's status is parked or
  stopped; then `Sprint: the rest.` and every other entry. With none, the entries follow
  the token line directly. Entries in sprint order within each group. The
  other-pull-requests line only when an open pull request's
  head branch contains no sprint entry's id; the new-entries line only when the catalog
  on main has ids not in `baseline`, bugs first, then catalog order.
- `report` — exit 0.
  ```
  Sprint report: <started time> to <now time>, <h> h.
  Shipped: <n> entries, <p> points, <p per h> points per hour.
    <id> — <p> pts
  Parked, needs your decision:
    <id> — <reason>
  Stopped:
    <id> — <reason>
  Not done:
    <id> — <status of the entry>
  Decisions team members reported:
    <id> — <note>
  New entries:
    <id> [<type>] — <title>
  ```
  Points per hour to one decimal place, `0.0` when no time has passed. A section with
  nothing in it prints `  none.` under its heading. `Not done` is every entry not shipped,
  parked or stopped.
- `end` — prints the report, then removes the sprint file and prints
  `Sprint: ended; the sprint file is removed.`

Every command except `propose`, `start` and `wait`, run with no sprint file, prints
`Sprint: none under way; run propose, then start.` and exits 1. An unknown command
prints the usage line from the module comment and exits 2.

### 3. The team member's brief

`brief <id>` prints exactly this, with the entry's id and title, and the line naming its
design only when the entry has `refs` containing `/specs/` (each such ref, in backticks,
joined with `, `):

```
Take the backlog entry `<id>` (<title>) in `feature-catalog.yaml` to shipped.
Its design: `<spec ref>`.

Follow `.claude/framework/workflow.md`, *Delivering an entry*, from the wait for what it
is blocked by to the merge: take the merge token yourself and land your own pull
requests. The developer has agreed this sprint, so make the decisions yourself and
report each one. Stop only for what that section allows.

Run every agent signed in to the plan the developer already pays for, never on a key
billed per use.

End your last message with exactly one line: SHIPPED, PARKED: <why> or STOPPED: <why>.
```

### 4. The workflow section

Insert into `framework/workflow.md` directly before `## The cycle`, verbatim:

```markdown
## Delivering an entry

A session that takes one backlog entry to shipped — a team member a sprint started, or a
session the developer started by hand — runs the whole of this document, in this order:

0. If the entry is `blockedBy` one that has not shipped, run
   `node .tropis/scripts/sprint.mjs wait <id>` as a background command and do nothing
   else until it ends. It ends when everything the entry is blocked by has shipped, and
   has no time limit. If it prints `PARKED: depends on <id>`, end with that line.
1. Shape the entry (`/feature`) and write its plan.
2. Claim it: run the overlap check on the plan (*Plans that touch the same files*), then
   land the plan, the shaping and the move to `building` through one pull request, under
   the merge token.
3. Dispatch an executor on the model the plan's tier calls for — a subagent or session
   where the tool can start one, otherwise yourself — and review its branch.
4. Merge as *Merging* says: wait for what the plan merges after, take the token, rebase,
   re-run the merge criteria, open the pull request and wait for the main branch. Keep
   the token for a follow-up pull request, then release it.
5. End with exactly one line: `SHIPPED`, `PARKED: <why>` or `STOPPED: <why>`. `STOPPED`
   is for a wait that ran out, a usage limit, or an error you could not get past; the
   lines the overlap and token waits print are `STOPPED` lines. In a sprint, record a
   `PARKED` or `STOPPED` line first with
   `node .tropis/scripts/sprint.mjs mark <id> parked <why>` (or `stopped <why>`), so the
   sprint's status and the team members waiting on this entry see it.

**Stop only for one of three things:** a judgement only the developer can make, a check
only a person can perform by hand (written to the verification log as `pending` through
`/manual-check` first), or work outside what was agreed. Anything else you decide, and
report the decision. What you may run is the tool's own permission settings; a prompt
for a permission is answered in your session. A parked entry goes back on the board as
needing a decision. **An entry parked after its claim moves back** from `building` to
`shaped`, its plan kept in `refs` and the reason in a comment directly above the entry,
landed under the token like any backlog edit; it then leaves the overlap check, which
counts only entries in `building`. An entry parked before its claim changes nothing in
the backlog.

**A sprint starts these sessions; the rules are here so that any session follows them.**
`/sprint` plans the sprint with the developer, starts one session per entry or bundle,
all at once, with the brief `node .tropis/scripts/sprint.mjs brief <id>` prints, and
shows where each stands. It never merges, reviews or orders merges: the token and the
overlap check do that.
```

### 5. The command

Create `commands/sprint.md`, verbatim:

```markdown
---
description: Plan a sprint with the developer and run it with a team
---

The developer is the product owner and this session is the sprint session. It plans,
starts team members and reports. It does not shape, plan, review or merge an entry,
and it does not decide the order of merges: each team member does those under
`.claude/framework/workflow.md`, *Delivering an entry*. Keep this conversation small:
read what the script prints, not the team members' work.

Every step runs `node .tropis/scripts/sprint.mjs`, which reads the backlog on `origin`'s
main branch and keeps the agreed sprint in a local file git does not track, so a sprint
survives this conversation being reset. **Start by running
`node .tropis/scripts/sprint.mjs status`.** If it shows a sprint, carry on with it; if it
says none is under way, plan one.

## 1. Plan

Run `node .tropis/scripts/sprint.mjs propose`, or `propose --points <n>` when the
developer names a budget; 20 story points is where it starts. Show the proposal and say
how team members will start (below). The developer adds, drops, reorders and resizes it;
run `propose` again for a new budget. An entry you find missing a `blockedBy` while
looking is proposed to the developer like any backlog edit. What the developer agrees is
what the team is approved to do: each entry, in that order, carried through the whole
workflow to its own merge.

## 2. Start the whole team, on the developer's word

When the developer says to start, in that same turn run
`node .tropis/scripts/sprint.mjs start <id> ... --points <n> --way <way>`, with the ids
in the agreed order, and then start every team member at once: one per entry, or per
bundle (one brief, for the bundle's first entry, naming the others). Do not keep any for
later — a later turn may not be one the developer typed, and some tools refuse to start
a session on such a turn. An entry blocked by another starts too: its team member waits
by itself until that entry ships. Pass each team member the brief
`node .tropis/scripts/sprint.mjs brief <id>` prints, as it stands, and run
`node .tropis/scripts/sprint.mjs mark <id> planning` for it.

| `--way` | How | Where |
|---|---|---|
| `session` | one session of this tool per team member, which the developer can open | a tool that starts sessions, such as the Claude desktop app |
| `here` | this session delivers the entries itself, one at a time, in sprint order | every tool; the fallback |

Never start a team member the developer cannot open, such as a subagent of this
session or a command line run in the background. Every team member runs signed in to
the plan the developer already pays for, never on a key billed per use. The sprint adds
no limit of its own to what a team member may run: that is the tool's permission
settings, and a permission prompt is answered in that team member's session.

## 3. Where are we?

When the developer asks, run `node .tropis/scripts/sprint.mjs status` and report it as it
stands. Team members that stopped or parked come first, with their reasons: each one
waits for the developer in its own session. It also shows who holds the merge token: a
token it marks stale is broken only on the developer's word, with the command it names.

When a team member's last line reaches you, or `status` shows a new stopped or parked
one, tell the developer the tool's way, with a notification where the tool has one,
naming the entry and its reason. A `SHIPPED` line needs nothing: `status` reads shipped
from the main branch, and an entry the main branch does not show as shipped is not
shipped. Record each decision a team member reports with
`node .tropis/scripts/sprint.mjs note <id> <decision>`.

## 4. New entries

When `status` lists entries new in the backlog since the start, raise them, bugs first,
and offer to slide each into the sprint. On the developer's word,
`node .tropis/scripts/sprint.mjs add <id>` adds one and says which entries not yet
started would then fall outside the budget; drop those with
`node .tropis/scripts/sprint.mjs drop <id>` only on the developer's word. Start the new
entry's team member in that same turn, as in step 2.

## 5. End

When every entry has shipped, parked or stopped, or the developer ends the sprint, run
`node .tropis/scripts/sprint.mjs end` and report what it prints: what shipped and its
points, points per hour, what was parked and what the developer must decide, what
stopped, the decisions team members reported, and the new entries.
```

### 6. The rest

- **`scripts/installed-scripts.txt`:** add the line `sprint.mjs` after `merge-token.mjs`.
- **`templates/package.json`:** add `"sprint": "node ./scripts/sprint.mjs",` directly
  after the `dispatch` line.
- **`templates/README.md`** (the operator guide): directly after the paragraph ending
  "…as the second line of `/next` does.", insert a blank line and this paragraph,
  verbatim:

  ```markdown
  `/sprint` plans a sprint with you and runs it: it proposes about 20 story points from
  the top of the ranking, you agree the entries and their order, and when you say to
  start it starts the whole team at once, one session per entry, each of which delivers
  its entry through the workflow, waits by itself for what it depends on, and merges its
  own work under the merge token. Ask it where the sprint stands at any time; team
  members that need you come first. `node .tropis/scripts/sprint.mjs status` prints the
  same from the shell; the agreed sprint lives in a file under `.git/`, never committed.
  ```

  In the sentence starting ``Commands you will type here:``, add `` `/sprint`,`` after
  `` `/dispatch`,`` and rewrap the two lines so neither runs past 90 characters.
- **`framework/DECISIONS.md`:** append, after the last decision, numbered with the next
  free FW number on `main` when you write it (FW-056 at the time of writing; the reviewer
  confirms it at merge):

  ```markdown
  ## FW-056: A sprint session plans and reports, and the workflow carries every team member's rule

  **Date:** 2026-11-02 · **Status:** Accepted.

  **Decision:** `/sprint` proposes about 20 story points from the top of the ranking —
  ideas and shaped entries banded A or B, in the order `/next` suggests them — and keeps
  the agreed sprint in `.git/tropis/sprint.json`, local and shared by every worktree. On
  the developer's word it starts every team member at once, as FW-055 says: a session of
  its own tool per entry or bundle, or, where the tool cannot start sessions, itself, one
  entry at a time. Every team member is given the same brief, pointing at the workflow's
  *Delivering an entry*, whose steps — the wait for a blocker first, which ends only when
  the blocker ships or is dropped, parked or stopped — the reasons to stop, and the last
  lines apply to any session delivering an entry. A team member records its own `PARKED`
  or `STOPPED` in the sprint file, which every worktree of the checkout shares. The
  sprint's status is read from the backlog on `origin`'s main branch, the open pull
  requests and the merge token, lists stopped and parked team members first, and reads
  from the sprint file only what nothing on GitHub shows: planning, parked, stopped.

  **Rejected:** Keeping the team member's rules in the sprint command (a session started
  by hand would not follow them). Committing the sprint file (a sprint is the
  developer's working state, not the project's). Reading a team member's `SHIPPED` as
  shipped (FW-050: a reply is a claim; the main branch is the truth). The sprint session
  recording every team member's last line (it is not always woken when one ends; the
  team member writing its own mark needs nobody). A tie-break by rank at merge (the
  spec's non-goal). Starting team members in another tool
  (`team-members-start-in-another-tool`).

  **Consequences:** A sprint session whose conversation is reset picks the sprint up from
  the file. A session the developer started by hand shows in the status only as an open
  pull request no sprint entry accounts for. A team member's mark reaches only sessions on
  the same machine, which is where FW-055's team runs. <the wake check's outcome, one
  sentence, written by the reviewer from *Decision 8*.> Source: the sprint design of
  2026-11-01, sections 1, 2, 5 to 9 and 11, and FW-055.
  ```

  Rewrap to 90 characters if a line runs over; change only the number if FW-056 is
  taken. Leave the angle-bracketed sentence as it is: the reviewer replaces it.

### 7. The tests

`guards/sprint.test.js`, `// Level: unit` first, then a module comment in the style of
`merge-token.test.js`. Import the script as a namespace for its pure parts and run a copy
of it, with `next-work.js`, `board-bands.js`, `plan-binding.js`, `projections.js`,
`main-status.mjs` and `merge-token.mjs` and the `yaml` package resolvable, installed at
`.tropis/scripts/` in a clone of a local bare repository, as `merge-token.test.js` does.
Each case marked † must fail before the script exists.

- † `propose` fills 20 points in rank order: a catalog with A and B ideas and shaped
  entries of known scores, a C entry, an unbanded one, a shelved one, a shipped one, and
  one of layer `docs`; asserts the exact lines, that only A and B open entries of the two
  layers appear, the `next in line` line, and `--points 5`.
- † a blocker: an entry blocked by an unshipped entry outside the sprint is left out;
  the same entry blocked by one ranked below it that is in the sprint comes after it.
- † `after` inside the sprint moves an entry after the one it names.
- † a bundle of two whose sum does not fit is left out whole, and one that fits comes
  whole, at its first member's place.
- † `start` writes the file under `git rev-parse --git-common-dir` (with its `baseline`,
  points and `way`), refuses a second start, an unknown id and a `--way` of `subagent`;
  and the file is read, and a `mark` written, from a second worktree of the same clone.
- † `wait`: with every blocker shipped it exits 0 at once with its line; with a blocker
  open it is still running after three intervals of 1 second, and exits 0 within a few
  intervals of the blocker being shipped on origin from another clone (so it fetches);
  it exits 3 with `PARKED: depends on <blocker>` once the blocker is marked parked in
  the sprint file, and once it is dropped on origin; it runs with no sprint file. Use
  `--interval 1`, spawn it asynchronously, and kill it in the test's cleanup.
- † on a local origin, `status` reads an entry shipped on origin's main after the clone
  last fetched as `shipped` (so the fetch is tested), and an entry marked parked that
  main shows shipped reads `shipped`.
- † on a GitHub origin, `status` shows each of the eleven states: one shipped, one
  dropped, one marked parked, one marked stopped, one with an open pull request while
  `building` (merging), one with an open pull request while `shaped` (claiming), one
  `building` whose plan merges after an unshipped entry, one `building`, one waiting for
  an unshipped blocker, one marked planning, one not started; the parked and stopped ones
  come first, under `Sprint: needs you — 2 stopped or parked.`, then `Sprint: the rest.`.
  Set it up by cloning from a local bare repository, so `origin/main` is fetched, then
  pointing `origin` at a `github.com` URL with `git remote set-url`, and spawning the
  script with `GIT_ALLOW_PROTOCOL=file` in its environment: the fetch is then refused at
  once without reaching the network (checked: `fatal: transport 'https' not allowed`,
  exit 128, git 2.49.0 on macOS 26.2, arm64), the script prints its `could not fetch
  origin` line and reads `origin/main` as last fetched, while `git remote get-url origin`
  still prints the GitHub URL. A stub `gh` first on PATH answers `pr list` and fails
  every other call with exit 99.
- † with nothing stopped or parked, `status` prints no `needs you` line.
- † `status` lists an open pull request matching no entry, and a new bug and a new
  feature added on main after the start, the bug first.
- † with origin not on GitHub, `status` prints the `open pull requests unknown` line and
  never runs `gh` (the stub fails with exit 99 if called).
- † `add` over the budget names the not-started entries from the end and removes none;
  `drop` removes an entry and its mark.
- † `brief` prints the text of *Decision 3* with the design line, and without it for an
  entry with no spec ref.
- † `report` with a faked clock (an environment variable the script reads for "now",
  such as `TROPIS_SPRINT_NOW`, documented in the module comment as for tests) shows the
  shipped points, points per hour, parked, stopped, not done, notes and new entries;
  `end` removes the file.
- † every command but `propose`, `start` and `wait` without a sprint file exits 1 with
  the line.
- The documents: `framework/workflow.md` has `## Delivering an entry` before
  `## The cycle`, naming `sprint.mjs wait`, `PARKED: <why>`, `moves back` and
  `sprint.mjs brief`; `commands/sprint.md` names every command of the script it tells a
  session to run (`propose`, `start`, `brief`, `mark`, `note`, `status`, `add`, `drop`,
  `end`), `in that same turn` and `--way`, and its `--way` table has the rows `session`
  and `here` and no other;
  `scripts/installed-scripts.txt` lists `sprint.mjs`; `templates/package.json` has the
  `sprint` script.

### 8. The hours-long wake check — the reviewer's

FW-055 rests on something nobody has observed: that a Claude Code session waiting on its
own background command keeps being woken when the command ends, after hours. This is not
the executor's to run — an executor working as a subagent is not the kind of session a
team member is. The specifying session, itself a session of the Claude desktop app
started by another session, as a team member is, runs it during review:

1. Before going idle, start in the background
   `node .tropis/scripts/sprint.mjs wait <entry>` from the plan's worktree — or, before
   the script is on `main`, `node scripts/sprint.mjs wait <entry>` — against a probe:
   a throwaway clone of this repository in `$TMPDIR` whose `origin` is a local bare
   repository, with an entry blocked by another, and, in the background too, a command
   that ships the blocker on that bare origin after at least three hours
   (`sleep 10800 && <commit and push the blocker as shipped>`). Note the time.
2. End the turn with nothing else pending that would wake the session sooner — no
   subagent running, no other background command, no message expected — and say so.
3. When the session is woken, record: the time it was woken, by what (the `wait`
   command's completion with `can start`), how long it was idle, the tool and its
   version, and the operating system and architecture.
4. Record the outcome in the review record's *Checks re-run*, in the catalog comment for
   the criterion it covers, and as the sentence in the decision's *Consequences*; and
   replace the spec's *Unchecked* bullet in §11 with what was seen. If the session was
   not woken, or was woken by something else, say so in those same places: the entry
   then does not ship until the check has passed, and the review hands back to the
   parent session with what was seen.

## Traps

- **The tests must fail first.** Task 2 commits them before the code. Run the new test
  file alone to see them fail — the self-check stops at its clean-baseline step on an
  empty script (it lacks the shared-machinery line) and never lists test names.
- **Import the module as a namespace**, or every case fails at link time for one reason.
- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green.
- **This plan quotes commands and text that are not declarations.** Its header has no
  `Merges after` field unless the claim wrote one; do not add or remove one.
- **The live run in Task 5 only reads.** No `start` against this repository's own
  sprint file without `end` straight after, no token command, no pull request.
- **The fresh-agent probe runs in a scratch project set up from this worktree**, not in
  this repository: here the installed release (`.claude/`) is the last one and does not
  have the change.
- **The hours-long wake check (*Decision 8*) is the reviewer's.** Do not run it, and do
  not edit the spec or the angle-bracketed sentence in the decision.
- **`wait` never ends by itself on a clock.** Its tests spawn it and must kill it in
  cleanup; a test that awaits it without a kill hangs the suite.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*, the spec excepted, which only the reviewer edits.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | new, *Decisions 1 to 3* |
| `scripts/next-work.js` | `inRankOrder` exported, *Decision 2* |
| `scripts/installed-scripts.txt` | one line, *Decision 6* |
| `guards/sprint.test.js` | new, *Decision 7* |
| `framework/workflow.md` | *Decision 4* |
| `commands/sprint.md` | new, *Decision 5* |
| `templates/package.json` | one line, *Decision 6* |
| `templates/README.md` | *Decision 6* |
| `framework/DECISIONS.md` | *Decision 6* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment mapping criteria to tests (Task 7) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 7) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-sprint-plans-and-runs-a-team.md` | the handover report |
| `docs/superpowers/specs/2026-11-01-sprint-design.md` | §11's *Unchecked* bullet, by the reviewer only (*Decision 8*) |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the decision record, the operator guide
and the workflow are the documents this change owes. The README is not patched
(`/refresh-readme`). No upstream queue: this repository is the upstream. A release-note
line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version`, `gh --version` (first
line) and `uname -sm` for the handover.

### Task 1 — The tests, red

Write `guards/sprint.test.js` (*Decision 7*) and an empty module `scripts/sprint.mjs`
exporting nothing. Commit. Run the new file alone (*Traps*): every † case must fail. No
test that existed before this plan may fail. Paste the failing test names.

### Task 2 — The script

Apply *Decisions 1 to 3* and the `next-work.js` export. Commit. Run the new test file
alone (all pass), then `bash scripts/check-blueprint.sh`; the last line must start
`Self-check passed`. Paste both.

### Task 3 — Show the cases can fail

Each a throwaway commit followed by running the new test file, then `git reset --hard
HEAD~1`:

1. Make `status` read the catalog from the working tree instead of `origin/main`.
   Expected red: the local-origin `status` case.
2. Make the status rules take a mark before a shipped status (swap rules 1 and 3).
   Expected red: the parked-but-shipped case.
3. Drop the blocker condition from the walk. Expected red: the blocker case.
4. Let a bundle come in part. Expected red: the bundle case.
5. Make `wait` exit 0 while a blocker is still open. Expected red: the `wait` case.
6. Make `wait` ignore the sprint file's marks. Expected red: the `wait` case, at its
   parked step.
7. Put the parked and stopped entries in sprint order with the rest. Expected red: the
   GitHub-origin `status` case.

Paste the failing test names of each. If one stays green, fix the test, commit, and
repeat.

### Task 4 — The documents and the decision

Apply *Decisions 4 to 6*. Commit. Run
`git grep -nF "sprint.mjs" -- framework commands templates scripts/installed-scripts.txt`
and paste it. Expected: `framework/workflow.md`, `commands/sprint.md` (several),
`templates/README.md`, `templates/package.json`, `scripts/installed-scripts.txt`. Before
the work it prints nothing. Run `bash scripts/check-blueprint.sh`; last line
`Self-check passed`.

### Task 5 — A live read on this repository

From the worktree, whose `origin` is this repository, run
`node scripts/sprint.mjs propose` and `node scripts/sprint.mjs status`. Expected:
`propose` lists open A and B entries from `origin/main` with their points and a total of
at most 20 (paste it); `status` prints `Sprint: none under way; run propose, then start.`
and exits 1. Then `node scripts/sprint.mjs start <the first proposed id> --way here`,
`status` (paste it: the entry's state, the token line, and any other open pull requests),
and at once `node scripts/sprint.mjs end` (paste it). Then confirm with
`ls "$(git rev-parse --git-common-dir)/tropis/"` that no `sprint.json` is left. Also run
`node scripts/sprint.mjs wait <an open entry with no blockedBy>`, expected to exit 0 at
once with its `can start` line.

### Task 6 — Fresh-agent check

The workflow now tells every session delivering an entry to wait for its blockers first,
when to stop, how an entry parked after its claim moves back, and which last line to
print, and `/sprint` tells a sprint session to start the whole team at once, on the
developer's word. A fresh agent with only a project set
up from this branch must be seen to follow both. Run it with its tool calls visible (in
Claude Code, `claude -p --output-format stream-json --verbose`, allowed to run shell
commands and edit files), with the scratch project as its working directory, on this
machine only.

1. Set up: `mkdir -p "$TMPDIR/sprint-agent" && git init -q --bare "$TMPDIR/sprint-agent/origin.git"`,
   `mkdir "$TMPDIR/sprint-agent/kiln-yard" && git -C "$TMPDIR/sprint-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/sprint-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/sprint-agent/kiln-yard/.tropis" ci`. Give the project a
   local identity, `"ungated": "a probe with a local origin"` in `.tropis/project.json`,
   a `feature-catalog.yaml` with three entries: `glaze-log` (`building`, refs naming the
   plan `docs/superpowers/plans/glaze-log.md`, which delivers `glaze-log` and whose
   *Requires* says the developer must choose the label printer before any task can
   start), and `kiln-alarm` and `shelf-map` (both `idea`, `feature`, layer `product`,
   `shelf-map` with `blockedBy: [kiln-alarm]`), and a `docs/backlog-board/bands.yaml`
   banding `kiln-alarm` A (value 4, effort 3) and `shelf-map` B (value 3, effort 2). Commit everything, add the bare repository as
   `origin`, push `main`.
2. Prompt, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, you are the team member for the
   entry `glaze-log`, which has been claimed. Carry on delivering it as the project's
   `.claude/framework/workflow.md` says. Report what you ran."* Check, and paste: the
   agent did not start the plan's tasks; `glaze-log` reads `status: shaped` on
   `origin/main` (`git -C "$TMPDIR/sprint-agent/origin.git" show main:feature-catalog.yaml`),
   its plan still in `refs`, with a comment directly above it giving the reason; and the
   agent's last line starts `PARKED:`.
3. Second prompt: *"This is a probe; its output will be discarded. In the project at
   `<scratch project>`, run /sprint: propose a sprint. I agree the proposal; start it.
   This session cannot start other sessions, so deliver here, but stop before
   delivering anything; show me each team member's brief and where the sprint stands."*
   (Where the tool does not run slash commands from a prompt, say *"follow
   `.claude/commands/sprint.md`"* instead.) Check, and paste: the calls `sprint.mjs
   propose`, `sprint.mjs start kiln-alarm shelf-map` with `--way here`, `sprint.mjs
   brief` for each, `sprint.mjs mark … planning` for each, and `sprint.mjs status`; that
   `shelf-map` was not left out for being blocked; and no call that starts a cloud
   session or a subagent.
4. Third prompt, with the sprint from prompt 3 still in place: *"This is a probe; its
   output will be discarded. In the project at `<scratch project>`, you are the team
   member the sprint started for `shelf-map`; here is your brief: <what
   `sprint.mjs brief shelf-map` printed>. Begin. Once you have done what the workflow's
   first step asks, and it has not ended, report what you ran and stop."* Check, and
   paste: a call `sprint.mjs wait shelf-map`, run in the background; that it printed
   `Sprint: shelf-map waits for kiln-alarm to ship.`; and that the agent did not shape
   `shelf-map` or write a plan. Kill the `wait` process afterwards.

If the agent misses a step, the wording is not clear enough: change it, commit, and run
the probe again. If it fails twice, stop and hand back with both transcripts' relevant
calls. Record the tool, its version, the model, the operating system and the
architecture; these go in the commit body of the final commit (a no-change commit with
`--allow-empty` is fine) and in the handover, with one sentence per prompt on what the
agent was asked and whether it did it. Delete the scratch folder afterwards, after
running `node .tropis/scripts/sprint.mjs end` in it if a sprint file is left.

### Task 7 — The catalog and the board

1. In `feature-catalog.yaml`, on `sprint-plans-and-runs-a-team`: set `status: shipped`
   (it reads `building`; if it reads anything else, set `shipped` anyway and say so under
   *Judgment calls*). Set `modules` to `scripts/sprint.mjs`, `commands/sprint.md` and
   `guards/sprint.test.js`. Remove `blockedBy` (a shipped entry may not keep one: the
   `catalog-entries` guard). Leave `refs` and `after` as they are. Add, directly above
   the entry's `- id:` line, a comment
   `# Shipped by docs/superpowers/plans/2026-11-02-sprint-plans-and-runs-a-team.md.` and
   lines mapping each criterion to the test cases or the Task 5/6 checks that cover it,
   as the comment above `merges-take-turns-under-one-token` does. Do not put `: ` (colon
   and space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole `sprint-plans-and-runs-a-team:`
   block (the key and its indented lines, through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 8 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/sprint-plans-and-runs-a-team`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.

## Handover report

Source worked from: none outside this repository. `scripts/sprint.mjs` follows the
shape of `merge-token.mjs` and `main-status.mjs` (module comment, root resolution, the
`ranDirectly` block, the `originOnGitHub` call); the test harness follows
`merge-token.test.js` and `plan-overlap.test.js`. Everything else is written against
this repository's own names.

### Task completion

- Task 0 done. Task 1 done: `guards/sprint.test.js` and an empty `scripts/sprint.mjs`
  committed first; run alone, all 27 cases in the file failed (27 failed, 27 total),
  before the script existed. No earlier test failed.
- Task 2 done (script plus `inRankOrder`). Task 3 done, all seven mutations went red and
  were reset. Task 4 done. Task 5 done. Task 6 done, each prompt passed on its first
  run, no wording changed. Task 7 done. Task 8 done up to the push.
- Task 3 red names (each run with `-t` for the one case, test file otherwise whole):
  1. working-tree read: `status › † reads the backlog from origin after fetching, and an entry shipped on main is shipped whatever its mark says`
  2. mark before shipped: the same case
  3. no blocker condition: `propose › † leaves out an entry blocked by an unshipped one outside the sprint, and puts one blocked by a lower-ranked sprint entry after it`
  4. bundle in part: `propose › † brings a bundle whole, at its first member's place, or not at all`
  5. wait exits 0 with a blocker open: `wait › † keeps waiting without a time limit and carries on within a few intervals of the blocker shipping on origin`
  6. wait ignores marks: `wait › † stops with PARKED once the blocker is marked parked in the sprint file`
  7. parked and stopped in sprint order: `status › † shows each of the eleven states for an origin on GitHub, stopped and parked entries first`
- Handover (3 and 4): none, the change has no screen.

### Verification results

Tools: git 2.49.0, node v22.15.0, gh 2.103.2, npm, Claude Code 2.1.300, macOS 26.2 on
arm64 (`uname -sm`: Darwin arm64).

- `bash scripts/check-blueprint.sh` at the last code commit, from the worktree:
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
  (exit 0). After Task 2 alone it failed with exactly three red cases, all in
  `the documents` (workflow section, command file, installed list and package script),
  which is expected before Task 4; after Task 4 it passed.
- `npm --prefix .tropis test`: `Tests:       151 passed, 151 total` (13 suites).
- New test file, run alone through a staged copy of the worktree with the template's Jest
  config (`node --experimental-vm-modules jest --config jest.config.js sprint.test.js`):
  27 cases, all passing after Task 2 apart from the three document cases, and after
  Task 4 all 27 pass (the file takes about 90 seconds; the `wait` cases dominate).
- Task 4 grep, `git grep -nF "sprint.mjs" -- framework commands templates scripts/installed-scripts.txt`:
  hits in `commands/sprint.md` (11 lines), `framework/workflow.md` (3),
  `scripts/installed-scripts.txt`, `templates/README.md`, `templates/package.json`.
- Task 5, live, from the worktree (origin is this repository; `origin/main` at `0711048`
  when run, which moved after the plan was written): `propose` listed 7 entries, 17 of 20
  points, command-slots-spike first, `next in line` project-chooses-its-repository-host
  (5 pts), exit 0; `status` before a start printed `Sprint: none under way; run propose,
  then start.` and exited 1; `start command-slots-spike --way here` printed
  `Sprint: started with 1 entries, 4 of 20 points; team members start as here.`;
  `status` then printed the started line, `Merge token: free.` and
  `  command-slots-spike — not started`, with no other-pull-requests line (`gh pr list`
  returned none); `end` printed the report and `Sprint: ended; the sprint file is
  removed.`; the `tropis/` folder under the git common dir was empty afterwards (no
  `sprint.json`); `wait rules-return-after-compaction` printed `Sprint:
  rules-return-after-compaction can start — nothing it is blocked by is still open.`,
  exit 0. To run the checked-in copy from `scripts/` I linked
  `.tropis/node_modules` as `scripts/node_modules` for the run and removed it after; it
  was never staged.
- Task 6, Claude Code 2.1.300, model `claude-sonnet-5-5`, `env -u ANTHROPIC_API_KEY`,
  `--output-format stream-json --verbose`, `--allowedTools Bash,Edit,Write,Read,Glob,Grep`,
  macOS 26.2 arm64, scratch project set up from this branch with a local bare origin:
  1. Asked to deliver the claimed `glaze-log` whose plan needs the developer to choose
     a printer: it started no task, ran `sprint.mjs mark glaze-log parked ...` (exit 1,
     no sprint under way, as the workflow allows only "where there is one"), moved the
     entry to `shaped` with the plan in `refs` and a comment above it, pushed that to
     origin's main (`git show main:feature-catalog.yaml` read `status: shaped`, comment
     `# Parked: the plan requires the developer to choose the label printer before any
     task can start.` directly above), and its last line started `PARKED:`.
  2. Asked to run /sprint, agree and start, delivering here: the Skill call `sprint`,
     then `status`, `propose` (5 of 20, kiln-alarm then shelf-map, so the blocked
     one was not left out), then one call running `start kiln-alarm shelf-map --points 5
     --way here`, `brief` and `mark ... planning` for each, and `status`; no session,
     subagent or cloud call.
  3. Given `shelf-map`'s brief: ran `sprint.mjs wait shelf-map` with
     `run_in_background: true`; its output file read
     `Sprint: shelf-map waits for kiln-alarm to ship.`; it shaped nothing and wrote no
     plan. The `claude -p` process stays alive while a background command runs, so I
     killed the `wait` process afterwards (the output file ended `[killed]`).
  The scratch folder was removed after `sprint.mjs end` there.
- Scope: `git diff --stat origin/main...HEAD` before this handover:
  11 files changed, 1561 insertions(+), 20 deletions(-): `commands/sprint.md`,
  `docs/backlog-board/bands.yaml`, `feature-catalog.yaml`, `framework/DECISIONS.md`,
  `framework/workflow.md`, `guards/sprint.test.js`, `scripts/installed-scripts.txt`,
  `scripts/next-work.js`, `scripts/sprint.mjs`, `templates/README.md`,
  `templates/package.json`. (`origin/main` had moved to `3048d0f` by the end; the
  branch is based on `12d4a50` and is not rebased.)

### Scope

Every file above is in *File Structure*. `docs/backlog-board/index.html` was not staged
(ignored by git). The spec was not edited. Worktree used: `../tropis-sprint`, a sibling
of the main checkout.

### Judgment calls

- `proposeSprint` walks the candidates repeatedly until a pass adds nothing. The plan
  said "walk, add or skip, go on", which would never put an entry after a lower-ranked
  blocker that joins later, yet its test asks for exactly that. An entry added in a
  later pass comes after the entries added earlier, so it can stand after a lower-ranked
  one (the test expects `free, y2, x3, x2`).
- `next in line` names the first unblocked candidate left out, and for a bundle gives the
  whole bundle's points.
- `add` over the budget never names the entry just added, and when no entry not started
  can leave it prints `Sprint: over the budget by <k> points — no entry not started yet
  could leave to make room.`.
- A fetch-failure or no-`origin/main` note is printed once, first, by every command
  except `brief`, where it goes to stderr so the brief printed on stdout stays whole.
- `start` also refuses an id listed twice (`Sprint: <id> is listed twice.`), `mark`
  refuses an unknown state, `note` and `mark` need an entry already in the sprint, and a
  missing `feature-catalog.yaml` is a one-line error.
- The sprint file is written to a sibling file and renamed, so a reader never sees half
  of it. Two team members marking at the same instant could still lose one mark; not
  guarded, kept simple.
- `main()` and `readBacklog()`, `proposeSprint()`, `statusOf()` are exported so the pure
  parts can be imported; the tests mostly run the installed copy as a session would.
- `status` prints `Sprint: open pull requests unknown — <reason>.` as its last-but-one
  line (where the pull requests would be), not first.
- Wait's first read happens before any sleep, so it exits at once when nothing blocks.
- The catalog entry read `building` as the plan expected.

### What the plan got wrong

- Task 2 says the self-check must pass after the script. It cannot: the plan's own
  document cases (workflow section, command, installed list, package script) are in the
  same test file and stay red until Task 4. Only those three cases were red.
- The walk as worded cannot produce the blocker-below case it tests (see Judgment calls).
- Task 6 step 1 says `.tropis/project.json` holds `"ungated"`; the installed workflow
  text at `.claude/framework/workflow.md` in the scratch project says the same, but this
  repository's installed copy names `.claude/project.json`. The source reads `.tropis/`.
  I used `.tropis/project.json`, which the agent honoured ("the project is ungated").
- The plan expects `status` to show open pull requests by `gh pr list`; the live run
  against this repository showed none open at the time, so the line was not exercised
  live (the faked-GitHub cases cover it).
- Task 5's `start` writes the real sprint file of this checkout; I ended it at once as
  instructed, but note another session on the same checkout would have seen it briefly.

### Outstanding

- The hours-long wake check (Decision 8), the replacement of the angle-bracketed
  sentence in FW-056, and the spec's §11 bullet are the reviewer's, as the plan says.
  The catalog comment says criterion 5's wake is not yet seen; the reviewer updates it.
- `origin/main` moved after the plan was written (`3048d0f`); the branch needs a rebase
  and a re-run of the merge criteria before the pull request.
- The five commit subjects below the handover are working history; the squash message is
  the reviewer's to write.
- The change has no screen, so there is no developer check.
