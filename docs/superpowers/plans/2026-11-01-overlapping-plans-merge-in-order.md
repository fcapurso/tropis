# Plans that touch the same files merge in order — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** when a session claims an entry, a script compares its plan's files with the plan
of every entry already in `building` and, on an overlap, writes `Merges after` into the
plan's header; before merging, the session runs the same script to wait until every
entry it merges after has shipped, and stops with a named line when the wait runs out.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md`, §4 (*Overlap, judged at
claim*) and §5 (*Dependencies*), and the six acceptance criteria of the entry
`overlapping-plans-merge-in-order` in `feature-catalog.yaml`. The merge token (§3) is a
different entry, `merges-take-turns-under-one-token`, not built yet: **do not build any
part of it**, and do not mention a token in what you write.

**One plan:** what becomes true is one sentence — a plan that shares a file with a plan
already being built records that it merges after it, and waits for it before merging.
The script, its tests and the three documents that tell a session when to run it serve
that one thing.

**What the specifying session verified on 2026-11-01, against `origin/main` at `c189fd3`:**

- **Plans list their files in a table.** `scripts/plan-binding.js` exports
  `fileStructurePaths(markdown)`: the first backticked span of every table row under
  `## File Structure`. Prose there is not a claim. It also exports `extractSection`.
- **Plan header fields.** `plan-binding.js` has `const HEADER_FIELDS = [...]` with
  `tier` (`Model tier`), `merge` (`Merge authority`) and `requires` (`Requires`), each
  `{ key, name, cut }`. `headerFields(markdown)` reads each field from the line it starts
  on to the end of its paragraph (a blank line, or a line starting with `**`), written
  `**Name:** value`. `validateDispatchable()` loops over `HEADER_FIELDS` and refuses a
  field that is present and reads empty, naming its line. Nothing outside
  `plan-binding.js` imports `headerFields` or `HEADER_FIELDS` (checked with
  `git grep -n "headerFields\|HEADER_FIELDS" -- guards scripts`).
- **Which entries' plans count.** `/feature` (`commands/feature.md`) says *To
  `building`: add the plan path to `refs`.* So an entry in `building` names its plan in
  `refs`; `scripts/next.mjs` finds it the same way (`refs.find((r) => r.includes('/plans/'))`).
  A plan also lists the ids it completes under `## Delivers` (one id per line or comma
  separated, or `None.`); `scripts/next-work.js` parses that in the private function
  `deliveredIds()`, which is not exported.
- **The catalog** is `feature-catalog.yaml` at the root, a top-level YAML list of entries
  with `id`, `status` (`idea`, `shaped`, `building`, `shipped`, `dropped`) and `refs`.
  Scripts parse it with the `yaml` package (`import YAML from 'yaml'`), as `next.mjs` does.
- **The bookkeeping files.** The catalog is `feature-catalog.yaml`; the bands file
  `docs/backlog-board/bands.yaml`; the generated board `docs/backlog-board/index.html`
  (not committed, but a plan may list it); the release notes `RELEASES.md`; the decision
  record `DECISIONS.md` in a project (`templates/AGENTS.md` names it at the root) and
  `framework/DECISIONS.md` in this repository.
- **How framework scripts are installed.** `scripts/installed-scripts.txt` lists every
  file setup copies into a project's `.tropis/scripts/`; `main-status.mjs` is the last
  line today. `guards/set-up-project.test.js` and `guards/dispatch.test.js` read that list.
- **The pattern for a CLI test.** `guards/next-report.test.js` copies the scripts a
  command needs into a temporary project's `.tropis/scripts/`, symlinks
  `resolve(here, '../node_modules')` to `.tropis/node_modules`, writes a
  `.tropis/package.json` of `{"type":"module"}` where needed, and runs
  `spawnSync('node', [script], { cwd })`. Follow it.
- **`main-status.mjs`** is the model for the waiting mode: it resolves the root with
  `git rev-parse --show-toplevel`, waits every 30 seconds by default, takes
  `--interval <seconds>` and `--timeout <minutes>`, prints one line on stdout, writes a
  "waiting …" line on stderr when it starts, and exits 3 when it times out. Its
  `ranDirectly` block is how a script that is also imported knows it was run.
- **The documents to change.** `framework/workflow.md` has `## Scope check — before
  merging` (line 232) followed by `## Merge and clean up — in this order`, and
  `## Merging` whose numbered list starts `1. \`git fetch origin && git rebase
  origin/main\``. Its Branching bullet on a gated main ends with the sentence starting
  "Dispatch's move of an entry to `building` is such a change". `commands/feature.md`
  has the line `**To \`building\`:** add the plan path to \`refs\`.` outside its
  project-owned block. `framework/dispatch.md`'s first bullet under *What the prompt
  carries* describes the dispatch header and says a field that is there but reads empty
  stops the dispatch. `templates/README.md` (the operator guide a project gets) has a
  paragraph about `main-status.mjs` ending "…it says it could not tell, and why.",
  directly before `## Where the framework lives`.
- **The integrity guard** checks backticked paths starting `src/`, `docs/`, `scripts/`,
  `.claude/` or `.github/` in the framework documents. `.tropis/scripts/plan-overlap.mjs`
  starts with `.tropis/` and is not checked; `.claude/framework/workflow.md` exists. No
  exemption is needed. Do not write `scripts/plan-overlap.mjs` in backticks in a
  framework document or command; write `.tropis/scripts/plan-overlap.mjs`.
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about overlapping plans, `Merges after` or waiting before a merge, so a local
  fresh-agent probe is a real one.

**Model tier: Medium.** One script with two modes, a header field, tests in temporary git
repositories, and prose given verbatim; care, not design.

**Merge authority: parent review.** The specifying session reviews and merges. Stop after
Task 7; do not open a pull request, write a review record or merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 5 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

overlapping-plans-merge-in-order

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-overlap -b plan/overlapping-plans-merge-in-order origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.** Use `node:` built-ins and the `yaml` package already in
  `templates/package.json`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from. `main-status.mjs` and `next-report.test.js`
  are this repository's own and may be followed.
- **Tests isolate git, the script does not.** Per `.claude/rules/harness-scripts.md`: set
  `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_NOSYSTEM` (or `HOME`) only in the environment a test
  spawns git or the script with, give each temporary repository its own `user.name` and
  `user.email`, and never set them inside `plan-overlap.mjs`.

## Decisions

### 1. The header field (`scripts/plan-binding.js`)

- Add `{ key: 'mergesAfter', name: 'Merges after', cut: false }` as the fourth element of
  `HEADER_FIELDS`. `validateDispatchable()` then refuses an empty `Merges after` field the
  way it refuses an empty `Requires`, with no further change. Update the JSDoc of
  `headerFields` so its type and its "three header fields" wording include it.
- Export `mergesAfterIds(markdown)`: the ids in that field, in order, without
  duplicates — the value split on commas and whitespace, keeping tokens matching
  `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. No field → `[]`.
- Export `deliversIds(markdown)`: the ids under `## Delivers`, read as
  `next-work.js`'s `deliveredIds()` reads them (comments stripped, `None.` → `[]`, one
  per line or comma separated, an optional leading `-` or `*`). Write it in
  `plan-binding.js`; do not change `next-work.js`.
- Export `withMergesAfter(markdown, ids)`: the plan with its header saying it merges
  after the union of the ids it already has and `ids` — existing ids first in their
  order, then new ones in the order given; never removes one. When the field exists,
  replace its whole paragraph (as `headerFields` delimits it) with the single line
  `**Merges after:** <ids joined by ", ">`. When it does not, insert that line as its own
  paragraph (a blank line before and after) directly after the paragraph of the last of
  `Requires`, `Merge authority`, `Model tier` that the plan has; when it has none of
  them, directly before the first line starting `## `. When the union equals the ids the
  plan already has, return the markdown unchanged, byte for byte.

### 2. The script (`scripts/plan-overlap.mjs`, new)

Line 1 `#!/usr/bin/env node`, line 2 `// Shared machinery: no part of this file is
project-owned.`, then a module comment saying what it does, its two modes and their exit
codes, as `main-status.mjs`'s does. It resolves the root with `git rev-parse
--show-toplevel` from the working directory, falling back to two levels above the
script. Pure functions are exported so the guard can import them; the command-line part
runs only when run directly (`main-status.mjs`'s `ranDirectly`).

- **`export const BOOKKEEPING`**: a `Set` of `feature-catalog.yaml`,
  `docs/backlog-board/bands.yaml`, `docs/backlog-board/index.html`, `RELEASES.md`,
  `DECISIONS.md` and `framework/DECISIONS.md`, with a comment saying why: every plan
  touches them, so counting them would make every pair of plans overlap; a conflict in
  them on rebase is resolved mechanically. It is the one list to extend.
- **`export function sharedFiles(planA, planB)`**: the paths both plans'
  `fileStructurePaths` list, minus `BOOKKEEPING`, sorted.
- **`export function overlaps(catalog, planPath, planText, readPlan)`**: for every
  catalog entry with `status: building` whose id is not in `deliversIds(planText)`, each
  of its `refs` that contains `/plans/` and ends `.md` and is not `planPath` itself;
  `readPlan(path)` returns its text or `null`. Returns
  `{ found: [{ id, plan, files }], unreadable: [{ id, plan }] }`, `found` only for plans
  sharing at least one file, in catalog order.

**`--claim <plan>`.** Reads `feature-catalog.yaml` and the plan from the working tree.
Exit 2 with a message on stderr when either cannot be read, or when the plan's File
Structure table lists no file (it cannot be compared). For each unreadable plan print
`Cannot read <plan>, named by <id>; not compared.` Then:

- No overlap: print `No overlap: <plan> shares no file with a plan in building.`; do not
  write the plan; exit 0.
- Overlap: for each found, print `Overlaps <id> (<its plan>): <file>, <file>`; write
  `withMergesAfter(planText, ids)` to the plan when it differs; print
  `Merges after: <all ids now in the field> — written to <plan>.` (or `— already in
  <plan>.` when unchanged); exit 0.

**`--wait <plan> [--interval <seconds>] [--timeout <minutes>]`.** Defaults 30 seconds and
60 minutes; both accept fractions (`--timeout 0.01`). Reads the plan's
`mergesAfterIds`. None: print `Merges after: none — go ahead.` and exit 0 without
running git. Otherwise write
`plan-overlap: waiting for <ids> to ship, asking origin every <s> s for up to <m> min` on
stderr, and loop:

1. `git fetch --quiet origin`. On failure print `Could not fetch origin — <first stderr
   line>.` and exit 2.
2. The main branch is `git symbolic-ref --short refs/remotes/origin/HEAD` when that
   succeeds, otherwise `origin/main`. Read `git show <it>:feature-catalog.yaml`; on
   failure print the reason and exit 2.
3. An id the catalog there does not have: print `<plan> merges after <id>, which the
   catalog on <branch> does not have.` and exit 2.
4. Every id `shipped` or `dropped` (a dropped entry's plan will never merge): print
   `Merges after: <ids> — shipped on <branch>; go ahead.` and exit 0.
5. Past the deadline: print `STOPPED: waiting on <ids not yet shipped, joined by ", ">`
   and exit 3.
6. Sleep the interval and go back to 1.

Anything else on the command line: print a usage line to stderr and exit 2.

Add `plan-overlap.mjs` as the last line of `scripts/installed-scripts.txt`.

### 3. The tests (`guards/plan-overlap.test.js`, new)

`// Level: unit` first line, a short header, then cases. Imports from
`../scripts/plan-overlap.mjs` and `../scripts/plan-binding.js`; the command-line cases
copy `plan-overlap.mjs`, `plan-binding.js` and `projections.js` into a temporary
project's `.tropis/scripts/` as `next-report.test.js` does. Every case must be able to
fail; the cases marked † are shown red in Task 3.

- `sharedFiles` ignores every `BOOKKEEPING` path and returns a shared source file.
- `withMergesAfter`: inserts the line after `Requires` in a plan with all three header
  fields; keeps existing ids and appends new ones without duplicates; returns the input
  unchanged when nothing is new; `mergesAfterIds` reads back what it wrote.
- `validateDispatchable` refuses a plan with `**Merges after:**` and nothing after it,
  naming the field, and accepts one with an id.
- † `--claim` on an overlap: a catalog with entry `a` in `building` whose plan lists
  `src/x.js` and `feature-catalog.yaml`, and entry `b` (in `building` too, delivered by
  the claimed plan) whose plan lists `src/x.js`, `src/y.js`, `feature-catalog.yaml`:
  exit 0, stdout names `a` and `src/x.js` and not `feature-catalog.yaml`, and the plan
  file now has `**Merges after:** a`. `b` is not listed as an overlap of itself.
- † `--claim` with no overlap: plans sharing only bookkeeping files; exit 0, stdout says
  `No overlap`, the plan file is byte-for-byte unchanged.
- `--claim` on a plan already reading `**Merges after:** z`: after the run it reads
  `**Merges after:** z, a`.
- `--claim` on a plan with no File Structure table exits 2.
- The waiting cases use a bare repository as `origin` and a clone, each with its own
  identity, the catalog committed on `main` and pushed:
  - † `--wait` on a plan merging after `a`, which is `building` on origin, with
    `--interval 0 --timeout 0.01`: exit 3, stdout `STOPPED: waiting on a`.
  - † `--wait` where `a` was set to `shipped` and pushed **from a second clone after the
    first one last fetched**: exit 0 and `go ahead` — this is the case that fails when
    the script reads a stale `origin/main` without fetching.
  - `--wait` where `a` is `dropped` on origin: exit 0.
  - `--wait` naming an id the origin catalog lacks: exit 2.
  - `--wait` on a plan with no `Merges after`: exit 0, `go ahead`, in a directory with no
    `origin` at all.

### 4. The documents

**`framework/workflow.md`.** Insert this section between `## Scope check — before
merging` and `## Merge and clean up — in this order`, verbatim:

```markdown
## Plans that touch the same files

Two entries can be built at the same time. Each plan lists every file it touches, so
whether two of them overlap is judged from their plans, never guessed from the entries.

- **At claim, before the move to `building` lands**, run
  `node .tropis/scripts/plan-overlap.mjs --claim <plan>`. It compares the plan's File
  Structure table with the plan of every entry already in `building` and, where they
  share a file, names the entry and the files and writes `**Merges after:** <id>` into
  the plan's header. Land the claim with that line. Build either way: whoever claimed
  second waits at merge. Claims land one at a time, so every earlier claim is already
  on `main` when the check runs.
- **It compares files, not lines.** Two plans touching one file in unrelated places
  still wait for each other; the one rebase settles it. It ignores the files every plan
  touches — the catalog, the bands file, the generated board, the release notes and the
  decision record — or every pair of plans would overlap. A conflict in one of those on
  rebase is resolved mechanically, keeping both sides' entries and rebuilding the board,
  and needs no review. A conflict in any other file needs its resolution reviewed.
- **A session may add to `Merges after`, never remove from it**, also when it finds a
  dependency while planning. Needing the other entry's code is not this: that is
  `blockedBy`, and no branch is built on another unmerged branch.
- **Before merging**, run `node .tropis/scripts/plan-overlap.mjs --wait <plan>`. It asks
  `origin` every 30 seconds until every entry the plan merges after has shipped or been
  dropped, and goes ahead at once when the plan has no `Merges after`. After 60 minutes
  it exits 3 and prints `STOPPED: waiting on <id>`: report that line and stop. The work
  resumes with the same command once that entry ships, which also covers waiting on an
  entry that was parked.
```

In the same file, the Branching bullet on a gated main: after the sentence ending
"…and waits until it has merged before the executor starts." add, in the same bullet:
"Before that pull request opens, the overlap check runs on the plan (*Plans that touch
the same files*)." Keep line wrapping near the file's width.

In `## Merging`, make the list:

```markdown
1. `node .tropis/scripts/plan-overlap.mjs --wait <plan>` — *Plans that touch the same
   files*.
2. `git fetch origin && git rebase origin/main`
3. **Re-run the plan's full merge criteria, not just the test suite.** …
4. Squash-merge.
```

keeping the text of the old items 2 and 3 exactly as it is.

**`commands/feature.md`.** Replace `**To \`building\`:** add the plan path to \`refs\`.`
with:

```markdown
**To `building`:** add the plan path to `refs`. Then run
`node .tropis/scripts/plan-overlap.mjs --claim <plan>` and land the claim with whatever
it wrote into the plan's header: `.claude/framework/workflow.md`, *Plans that touch the
same files*.
```

**`framework/dispatch.md`.** At the end of the first bullet under *What the prompt
carries* (the dispatch header), add: "A plan's `Merges after` field is read and refused
the same way; the prompt does not carry it, since the executor does not merge."

**`templates/README.md`** (the operator guide). Directly after the paragraph ending "…it
says it could not tell, and why." and before `## Where the framework lives`, add:

```markdown
When two plans are built at once, `node .tropis/scripts/plan-overlap.mjs --claim <plan>`
runs as an entry moves to `building`: where the plan shares a file with a plan already
in `building` it writes `Merges after` into the plan's header, and
`node .tropis/scripts/plan-overlap.mjs --wait <plan>` before the merge waits until those
entries have shipped. The catalog, the bands file, the board, the release notes and the
decision record do not count as shared.
```

### 5. What this owes, and does not

- **Decision record.** Add to `framework/DECISIONS.md`, after the last entry, a decision
  numbered with the next free `FW-` number on your branch's base, titled
  `Plans that share a file merge in the order they were claimed`. Date 2026-11-01, status
  Accepted. Decision: overlap is judged at claim from plans' File Structure tables,
  against every entry in `building`; on an overlap the later plan records `Merges after`
  and waits before merging until the other has shipped or been dropped, for at most 60
  minutes, then stops naming it; the bookkeeping files never count. Rejected: judging
  overlap from entry descriptions (a guess, where the plan lists every file); comparing
  lines rather than files (a rebase settles unrelated edits, and lines move); counting
  the bookkeeping files (every pair would overlap and parallel work would run one at a
  time); building a branch on another unmerged branch (needing the other's code is
  `blockedBy`). Consequences: two plans touching one file in unrelated places wait for
  each other; a session that ignores the check still cannot put a red or out-of-date
  change on a gated `main`, it only rebases more. Source: the sprint design of
  2026-11-01, §4 and §5. The reviewer renumbers it if `main` has taken that number by
  merge time.
- **Operator guide:** `templates/README.md`, *Decision 4*.
- **Rules:** none changed. The framework documents and command change what an agent is
  told to do, so Task 5 runs a fresh-agent check.
- **Upstream queue:** none; this is the upstream.
- **README:** not patched; no command it names is removed or renamed.

## Traps

- **The tests must fail first.** Task 1 commits them before the code; the self-check must
  then fail on them. That is the red step, not a breakage.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green. It also runs the installed
  plan-dispatchable guard over this plan, which does not know `Merges after`; that is
  fine.
- **This plan quotes `Merges after` lines and commands in code blocks and prose.** Its
  own header has no `Merges after` field, and must not gain one unless the review says
  so.
- **Waiting tests must not wait.** Use `--interval 0` and a fractional `--timeout`; a
  case taking more than a few seconds is wrong.
- **The fresh-agent probe runs in a scratch project set up from this worktree**, not in
  this repository: here the installed release (`.claude/`) is the last one and does not
  have the change.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | *Decision 1* |
| `scripts/plan-overlap.mjs` | new, *Decision 2* |
| `scripts/installed-scripts.txt` | one line, *Decision 2* |
| `guards/plan-overlap.test.js` | new, *Decision 3* |
| `framework/workflow.md` | *Decision 4* |
| `commands/feature.md` | *Decision 4* |
| `framework/dispatch.md` | *Decision 4* |
| `templates/README.md` | *Decision 4* |
| `framework/DECISIONS.md` | *Decision 5* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment mapping criteria to tests (Task 6) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 6) |
| `docs/superpowers/plans/2026-11-01-overlapping-plans-merge-in-order.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The tests, red

Write `guards/plan-overlap.test.js` (*Decision 3*) and an empty module
`scripts/plan-overlap.mjs` exporting nothing (so imports resolve to `undefined` rather
than crashing the file). Commit. Run `bash scripts/check-blueprint.sh`: it must fail,
and the failing tests must include every † case. No test that existed before this plan
may fail. Paste the failing test names.

### Task 2 — The header field and the script

Apply *Decisions 1 and 2*. Commit. Run `bash scripts/check-blueprint.sh`; the last line
must start `Self-check passed`. Paste it.

### Task 3 — Show the † cases can fail

Two throwaway commits, each followed by the self-check and `git reset --hard HEAD~1`:

1. Make `--claim` never write the plan (skip the write). Expected red: the overlap case.
2. Remove the `git fetch` from the wait loop. Expected red: the "pushed from a second
   clone" case.

Paste the failing test names of each. If either stays green, fix the test, commit, and
repeat.

### Task 4 — The documents and the decision

Apply *Decisions 4 and 5*. Commit. Run
`git grep -nF "plan-overlap.mjs" -- framework commands templates` and paste it. Expected:
`framework/workflow.md` (the new section's two commands, the Merging list),
`commands/feature.md`, `templates/README.md` (two). Before the work it prints nothing.
Run `bash scripts/check-blueprint.sh`; last line `Self-check passed`.

### Task 5 — Fresh-agent check

The workflow and `/feature` now tell an agent to run a script at claim and before
merging; a fresh agent with only a project set up from this branch must be seen to do
both. Run it with its tool calls visible (in Claude Code,
`claude -p --output-format stream-json --verbose`, allowed to run shell commands and
edit files), with the scratch project as its working directory.

1. Set up: `mkdir -p "$TMPDIR/overlap-agent" && git init -q --bare "$TMPDIR/overlap-agent/origin.git"`,
   `mkdir "$TMPDIR/overlap-agent/kiln-yard" && git -C "$TMPDIR/overlap-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/overlap-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/overlap-agent/kiln-yard/.tropis" ci`. In the project write
   `feature-catalog.yaml` with two entries — `glaze-log` (`status: building`, refs
   `docs/superpowers/plans/glaze-log.md`) and `firing-chart` (`status: shaped`, no plan
   ref) — and two plans: `glaze-log.md` delivering `glaze-log` with File Structure
   `src/kiln.js`, `feature-catalog.yaml`; `firing-chart.md` delivering `firing-chart`
   with header fields Model tier, Merge authority and Requires, and File Structure
   `src/kiln.js`, `src/chart.js`, `feature-catalog.yaml`. Give the project a local
   identity, commit everything, add the bare repository as `origin` and push `main`.
2. Prompt, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, claim the entry `firing-chart`
   with the plan `docs/superpowers/plans/firing-chart.md`: move it to `building` as the
   project's `/feature` command says, doing everything that command says to do. Do not
   commit or push. Report what you ran."*
3. Check, and paste: from the stream, the `plan-overlap.mjs --claim` call and its
   output (must name `glaze-log` and `src/kiln.js`), and `grep -n "Merges after"
   docs/superpowers/plans/firing-chart.md` in the scratch project (must print
   `**Merges after:** glaze-log`).
4. Commit the scratch project's changes yourself, set `glaze-log` to `shipped`, commit,
   push. Second prompt: *"This is a probe; its output will be discarded. In the project
   at `<scratch project>`, you are about to merge the plan
   `docs/superpowers/plans/firing-chart.md`. Do the steps the project's
   `.claude/framework/workflow.md` lists in its Merging section before the rebase, and
   stop before the rebase. Report what you ran."*
5. Check, and paste: the `plan-overlap.mjs --wait` call and its output (must end
   `go ahead`).

If the agent misses either call, the wording is not clear enough: change it, commit, and
run the probe again. If it fails twice, stop and hand back with both transcripts'
relevant calls. Record the tool, its version, the operating system and the architecture;
these go in the commit body of the final commit (a no-change commit with `--allow-empty`
is fine) and in the handover, with one sentence per prompt on what the agent was asked
and whether it did it. Delete the scratch folder afterwards.

### Task 6 — The catalog and the board

1. In `feature-catalog.yaml`, on `overlapping-plans-merge-in-order`: set `status:
   shipped` (it reads `building`; if it reads anything else, set `shipped` anyway and
   say so under *Judgment calls*). Set `modules` to `scripts/plan-overlap.mjs`,
   `scripts/plan-binding.js` and `guards/plan-overlap.test.js`. Leave `refs` as it is.
   Add, directly above the entry's `- id:` line:

   ```yaml
   # Shipped by docs/superpowers/plans/2026-11-01-overlapping-plans-merge-in-order.md.
   # Criteria 1 to 5 - plan-overlap.test.js (claim, bookkeeping, keeps ids and the empty
   # field, the waiting cases). Criterion 6 - the fresh-agent check in the plan's handover.
   ```

   Do not put `: ` (colon and space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole `overlapping-plans-merge-in-order:`
   block (the key and its indented lines, through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 7 — Verification and handover

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
3. Push the branch (`git push -u origin plan/overlapping-plans-merge-in-order`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.

## Handover report

### Task completion

Tasks 0 to 6 done; Task 7 is this report and the push. No pull request, review record or
merge.

### Verification results

Tools: git 2.49.0, node v22.15.0, Claude Code 2.1.300, on macOS 26.2, arm64.

- Task 1, red: the self-check failed. It stops at the clean-baseline step (the empty
  script lacked the shared-machinery line, "drift check"), before it reaches the
  framework's own guards, so the failing test names came from running the new file
  alone in a scratch stage: 14 failed, 1 passed, including every dagger case (`--claim`
  on an overlap, `--claim` with no overlap, `--wait` stops, `--wait` from a second clone).
- Task 2: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 3, run as working-tree edits in the scratch stage, reverted with `git checkout`
  (not throwaway commits): skipping the claim write failed `--claim > on an overlap ...`
  and `--claim > adds to a field the plan already has` (2 failed, 13 passed); removing the
  fetch failed `--wait > sees a ship pushed from another clone after this one last
  fetched` (1 failed, 14 passed).
- Task 4: `git grep -nF "plan-overlap.mjs" -- framework commands templates` printed
  `commands/feature.md:13`, `framework/workflow.md:249, 264, 352`,
  `templates/README.md:68, 71`; self-check passed.
- Task 5: Claude Code 2.1.300, tool calls visible. Prompt 1 (claim `firing-chart`): the
  agent made its own worktree (the project is gated), ran
  `node .tropis/scripts/plan-overlap.mjs --claim docs/superpowers/plans/firing-chart.md`,
  output `Overlaps glaze-log (docs/superpowers/plans/glaze-log.md): src/kiln.js` and
  `Merges after: glaze-log — written to ...`; `grep -n "Merges after"` printed
  `9:**Merges after:** glaze-log`. Prompt 2 (merge steps before the rebase, after
  `glaze-log` was set to shipped and pushed): it ran `--wait` and got
  `Merges after: glaze-log — shipped on origin/main; go ahead.` Both passed on the first
  run. The machine's user-level instructions say nothing on overlap or `Merges after`
  (grepped), so the probe was not helped by them. Scratch folder deleted.
- Task 6: `npm --prefix .tropis test`: `Tests: 148 passed, 148 total`.
- Task 7: same `Tests:` line; last self-check line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`

### Scope

Worktree used: `../tropis-overlap` (branch `plan/overlapping-plans-merge-in-order`).
`git diff --stat origin/main...HEAD` (before this report): 11 files, 627 insertions, 24
deletions: commands/feature.md, docs/backlog-board/bands.yaml, feature-catalog.yaml,
framework/DECISIONS.md, framework/dispatch.md, framework/workflow.md,
guards/plan-overlap.test.js, scripts/installed-scripts.txt, scripts/plan-binding.js,
scripts/plan-overlap.mjs, templates/README.md. All are in File Structure; the plan file
is the twelfth, with this report.

### Judgment calls

- The tests import the two modules as namespaces. The plan said an empty module makes
  imports resolve to `undefined`; in ES modules a missing named export fails at link time
  and the whole file fails, so each case would not fail for its own reason.
- The dispatchable-plan test builds its plan inline; reading this plan file from `docs/`
  fails in the self-check's export, which has no `docs/`.
- `origin/main` moved during the work (the merge-token spec commit and FW-049). I rebased
  onto it, so the decision is numbered FW-050, not FW-049.
- Task 3 reverts were working-tree edits run through the test file directly, not
  throwaway commits plus the self-check; same test names, far quicker.
- `plan-overlap.mjs` is committed executable, like `main-status.mjs`.
- In the probe the agent put its claim in a worktree of its own and ran `npm ci` there;
  that is the workflow working as written.

### What the plan got wrong

- The "empty module so imports resolve to undefined" claim (above).
- The red self-check stops at the clean baseline, so it never lists the new test names;
  they have to be got by running the file alone.
- The next free `FW-` number on the base was already taken by main moving on.

### Outstanding

The change has no screen, so there is no developer check. Reviewer: confirm FW-050
against `main` at merge time; the Task 3 mutations were not run as throwaway commits.
