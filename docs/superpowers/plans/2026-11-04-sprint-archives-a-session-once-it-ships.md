# A sprint archives each team member's session once its work ships — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** a sprint whose team members start as sessions records, at its start, whether
the developer wants each team member's session archived once its work ships.
`sprint.mjs status` then names the team members whose work has all shipped and that are
not parked or stopped, and a new `sprint.mjs archive <id>` checks that again and records
the archive. `/sprint` asks the question once at start, notes a team member's decisions
before archiving its session, archives it with the tool, and says so where the tool
cannot.

**Backlog item:** `sprint-archives-a-session-once-it-ships` in `feature-catalog.yaml`
(type improvement). No spec: the design is this plan.

**One plan:** what becomes true is one sentence — a finished team member's session is
archived, on the developer's one answer at the sprint's start.

**Model tier: Medium.** The code and the command text are specified below, but the code
change spans several functions and a guard file that must be read for its helpers.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**A fresh-agent check is owed, and the specifying session runs it:** the change alters
what `commands/sprint.md` tells an agent to do. The executor does not run it.

**What the specifying session verified on 2026-11-04, against `origin/main` at `a59bf5a`
(node v22, Linux x86_64):**

- `scripts/sprint.mjs` keeps the sprint as a record (`start()` builds it: `started`,
  `budget`, `way`, `entries`, `baseline`, `marks`, `notes`), changed only through
  `updateSprint(root, env, change)`. Each entry is `{ id, points, bundle? }`; members of
  one bundle share `bundle`, and the team member that carries a bundle is started with
  the brief of the bundle's first entry in sprint order (`commands/sprint.md`, step 2).
- `teamMarks(root, env, sprint)` gives the marks with command-line team members' results
  overlaid; a mark of `parked` or `stopped` is what makes a team member need the
  developer.
- `statusOf()` returns `shipped` before it looks at a mark, so an entry shipped on main
  reads shipped even when it was marked parked. That stays as it is.
- `parseArgs()` takes `--points`, `--way`, `--interval`, `--tool`, `--model` as flags
  with a value; `COMMANDS` and `USAGE` list the commands. `main()` dispatches through the
  `commands` object.
- The tools that start sessions: a Claude Code cloud session archives another session
  with its `archive_session` tool. Other tools may have no way to archive a session;
  `/sprint` must then say so and leave it open (the backlog item's fourth criterion).
  Only the `session` way starts sessions of this tool: under `here` this session does the
  work itself, and under `claude` and `cursor` each team member is a print-mode run that
  ends by itself.

**Decided by the specifying session:**

- The answer is the record's `archive` field, `true` or `false`, set by
  `start --archive yes|no` and absent flag meaning `false`. A new sprint starts without
  it, so the answer holds for one sprint.
- `--archive yes` is refused unless the way is `session`: no other way leaves a session
  of this tool to archive.
- The script cannot know whether a team member reported decisions; the command tells the
  sprint session to record them with `note` before it runs `archive`. The script's gate
  is what it can check: every backlog item the team member carried shows shipped on the
  main branch, and none carries a `parked` or `stopped` mark.
- `archive <id>` records first and the session archives after. If the tool then cannot
  archive, `/sprint` says so; the record still reads archived, so `status` does not ask
  again. No decision record: this is internal to the sprint.

---

## Delivers

sprint-archives-a-session-once-it-ships

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-archive-sessions -b plan/sprint-archives-a-session-once-it-ships origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change — `scripts/sprint.mjs`

1. **Header comment.** In the usage list, change the `start` line to
   `sprint.mjs start <id> ... [--points <n>] [--way session|here|claude|cursor] [--archive yes|no]`
   and add, after the `note` line:
   `sprint.mjs archive <id>   records that the team member carrying <id> (a backlog item alone, or a bundle's first) is archived; exit 1 unless the sprint archives, all it carried shipped on main and none is parked or stopped`
   wrapped to the comment's width.
2. **`COMMANDS`** gains `'archive'` after `'note'`. **`USAGE`** gains
   ` [--archive yes|no]` after the `start` part's `--way` part, and `archive <id> | `
   after `note <id> <text> | `.
3. **`parseArgs()`**: add `'--archive'` to the list of flags taking a value, setting
   `opts.archive = value`. Add `'archive'` to the commands that take exactly one id.
4. **`start()`**: inside the change, after the `--way` check, refuse
   `opts.archive` that is neither `undefined`, `'yes'` nor `'no'` with
   `Sprint: --archive takes yes or no.`; compute `way` before this next check, and refuse
   `opts.archive === 'yes'` when `way !== 'session'` with
   `Sprint: --archive yes needs --way session; no other way leaves a session of this tool to archive.`
   Add `archive: opts.archive === 'yes'` and `archived: []` to the record. After the
   first output line, when `way === 'session'`, push
   `Sprint: each team member's session is archived once its work ships.` when archiving,
   otherwise `Sprint: each team member's session is left open once its work ships.`;
   the model line stays last.
5. **A helper** `teamMembers(sprint)`: the sprint's team members in sprint order, each
   `{ id, carried }` where `id` is the entry alone or a bundle's first entry and
   `carried` the ids of that bundle's entries in sprint order (`[id]` for an entry alone).
6. **A helper** `readyToArchive(ctx, sprint, backlog)`: `[]` unless `sprint.archive`;
   otherwise the `id` of each team member not in `sprint.archived ?? []` whose every
   carried id has `status: 'shipped'` in `backlog.catalog`, and none of whose carried ids
   has a `teamMarks(...)` mark of `parked` or `stopped`.
7. **`status()`**: after the entry lines and before the open pull requests line, when
   `readyToArchive` is not empty, push
   `Sprint: ready to archive, once the decisions each reported are noted — <ids joined by ", ">.`
8. **`archive(ctx, opts)`**, added to the `commands` object in `main()`: inside
   `updateSprint`, with `current` null refuse `NONE_UNDER_WAY`; then `requireEntry`;
   then refuse, in this order:
   - not `current.archive`: `Sprint: this sprint leaves sessions open; archiving was not agreed at its start.`
   - the id is a bundle member but not the bundle's first:
     `Sprint: <id> is carried by <first>'s team member; name <first>.`
   - already in `archived`: `Sprint: <id>'s session is already recorded as archived.`
   - a carried id with a `parked` or `stopped` mark (from `teamMarks`):
     `Sprint: <id>'s team member is <state>; its session stays open.` (`<state>` of the
     first such carried id)
   - carried ids not shipped on the backlog read with `ctx.backlog()`:
     `Sprint: <id>'s team member has work not shipped on main — <ids joined by ", ">.`

   Otherwise return the record with `archived: [...(current.archived ?? []), id]`, and
   print `Sprint: <id>'s session is recorded as archived; archive it now.`

A record an earlier release wrote has no `archive` field and so never archives; leave it
so.

## The change — `commands/sprint.md`

1. In *2. Start the whole team*, insert this paragraph directly before the paragraph
   that begins "When the developer says to start", leaving that paragraph unchanged:

   > For `--way session`, ask the developer once, before running `start` and in that same
   > turn, whether to archive each team member's session once its work ships — with the
   > tool's question prompt where it has one, so the team still starts in this turn — and
   > pass the answer as `--archive yes` or `--archive no`. The answer holds for this
   > sprint only: ask again at the next one. Do not ask for another way; `start` refuses
   > `--archive yes` there, since no other way leaves a session of this tool to archive.

   Write it so the existing sentences around it still read; keep "in that same turn" in
   the file.
2. Add a section between *3. Where are we?* and *4. New backlog items*, numbering it in
   the heading text as a sub-part of 3 so the later headings keep their numbers:

   > ## 3a. Archive a finished team member's session
   >
   > When `status` lists team members as ready to archive, for each one, in this order:
   >
   > 1. Read its session's last message and record each decision it reported with
   >    `node .tropis/scripts/sprint.mjs note <id> <decision>`, if not already recorded.
   > 2. Run `node .tropis/scripts/sprint.mjs archive <id>`. It refuses a team member whose
   >    work has not all shipped on the main branch, or that is parked or stopped, and the
   >    session then stays open.
   > 3. Archive that team member's session with the tool — in a Claude Code cloud
   >    session, its archive session tool. Where the tool has no way to archive a
   >    session, or the archive fails, tell the developer which session it is and that
   >    it stays open.
   >
   > Never archive a parked or stopped team member's session: it waits for the
   > developer. A bundle's session is archived once every backlog item in it has
   > shipped, named by the bundle's first.

## Tests — `guards/sprint.test.js`

Add a `describe('archiving team members\' sessions', …)` after `describe('add, drop,
mark and note', …)`, using the file's own `makeWorld`, `makeClone`, `run`, `lines`,
`readSprint`, `publish`, `entry`, `row`, `at` and `T0`. Every † case must fail before the
change and pass after it.

1. † `it('† start records the answer for a session sprint and refuses it for another way', …)`:
   `start e1 --way session --archive yes` exits 0, prints
   `Sprint: each team member's session is archived once its work ships.` as its second
   line, and the record has `archive: true`, `archived: []`. In a fresh world:
   `start e1 --way session --archive no` records `archive: false` and prints
   `… is left open once its work ships.`; with no `--archive`, `archive` is `false`.
   In fresh worlds: `start e1 --way here --archive yes` exits 1 with the `needs --way
   session` line, `start e1 --way session --archive maybe` exits 1, and neither writes a
   record (`readSprint(clone)` is null).
2. † `it('† status names a team member ready to archive only once all it carried has shipped and it is not parked or stopped', …)`:
   entries `a1`, `k1`, `k2`, `p1`, `n1`; bands with `k1` and `k2` in bundle `kiln`.
   `start a1 k1 k2 p1 n1 --way session --archive yes`; `mark p1 parked waits for you`.
   Publish a catalog where `a1`, `k1` and `p1` are shipped. `status` contains
   `Sprint: ready to archive, once the decisions each reported are noted — a1.` (not `k1`,
   since `k2` has not shipped; not `p1`, parked; not `n1`). Publish `k2` shipped too:
   the line reads `… — a1, k1.`. `archive a1` exits 0 with
   `Sprint: a1's session is recorded as archived; archive it now.`; `status` then reads
   `… — k1.` In a sprint started with `--archive no` and everything shipped, `status`
   has no `ready to archive` line.
3. † `it('† archive refuses what it must not record', …)`: in the world of case 2,
   before anything ships: `archive n1` exits 1 with
   `Sprint: n1's team member has work not shipped on main — n1.`; `archive k2` exits 1
   with `Sprint: k2 is carried by k1's team member; name k1.`; `archive p1` exits 1 with
   `Sprint: p1's team member is parked; its session stays open.`; `archive nope` exits 1;
   after `a1` ships and `archive a1` succeeds, a second `archive a1` exits 1 with
   `… already recorded as archived.` A sprint started with `--archive no` refuses
   `archive` with the `leaves sessions open` line. The record's `archived` lists only
   `a1`.
4. In `the command names every script command it runs, …`, add `'archive'` to the verbs,
   and expect the text to contain `--archive yes` and `--archive no`.
5. In `with no sprint under way`, add `['archive', 'e1']` to the list of commands that
   exit 1 with the one line.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run `guards/sprint.test.js` that way; say the exact command in the
  handover.
- **Each case reaches origin through git**; give `start` the clock with `at(T0)` as the
  other cases do.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | the `archive` field, `--archive`, the `archive` command, the status line |
| `guards/sprint.test.js` | three cases, two documents assertions |
| `commands/sprint.md` | the question at start; step 3a |
| `RELEASES.md` | one bullet under `## [Unreleased]` replacing `_Nothing yet._` (Task 4) |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-04-sprint-archives-a-session-once-it-ships.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide does not describe
`/sprint`'s steps; no decision record; no upstream queue, this repository is the
upstream. The release note is one bullet, given in Task 4.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the cases and assertions. Commit. Run `guards/sprint.test.js` alone (*Traps*).
Expected: the three † cases and the documents case fail. Paste the failing names.

### Task 2 — The script

Make the `scripts/sprint.mjs` change. Commit. Run the guard alone: only the documents
case still fails. Paste the `Tests:` line.

### Task 3 — The command

Make the `commands/sprint.md` change. Commit. Run the guard alone: every case passes.

### Task 4 — Release note, backlog and board

1. In `RELEASES.md`, replace `_Nothing yet._` under `## [Unreleased]` with:
   `- A sprint whose team members run as sessions asks once, at its start, whether to archive each team member's session once its work ships, and archives it then, never a parked or stopped one.`
2. In `feature-catalog.yaml`, on `sprint-archives-a-session-once-it-ships`: set
   `status: shipped` (if it does not read `building`, set it anyway and say so); leave
   `acceptanceCriteria` as they are; set `modules` to `scripts/sprint.mjs` and
   `commands/sprint.md`; add this plan to `refs`. Above the item, after its existing
   comment lines, add
   `# Shipped by docs/superpowers/plans/2026-11-04-sprint-archives-a-session-once-it-ships.md.`
   and one comment line per criterion naming the case that covers it (criteria 1 and 2
   are partly prose in `commands/sprint.md`: name the fresh-agent check the specifying
   session records in the merge commit for those parts; criterion 4 is prose only).
3. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
4. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/sprint-archives-a-session-once-it-ships`. **Do not open a
   pull request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.
