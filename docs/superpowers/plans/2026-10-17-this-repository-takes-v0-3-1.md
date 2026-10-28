# This repository takes v0.3.1 — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** This repository's installed framework goes from `v0.3.0` to `v0.3.1` through
`take-version.mjs`, the way any project takes a release, and it can use the backlog board
straight away: `docs/backlog-board/bands.yaml` exists, `npm --prefix .tropis run board`
writes the page, and the entry files and operator guide name it.

**Background:** `v0.3.1` (`RELEASES.md`, section `0.3.1`) adds the backlog board and
`/refresh-board`, and the version check. Its notes say a project taking it copies
`.tropis/templates/backlog-bands.yaml` to `docs/backlog-board/bands.yaml` before banding,
because taking a version never writes under `docs/`.

**What the specifying session verified on 2026-10-17, on a scratch clone of `main` at
`e7f3fb9`, updated from a scratch checkout of `v0.3.1`:**

- `node scripts/check-version.mjs .`, run by the developer from this checkout at
  `v0.3.1`, answered **safe**: four files replaced, five added, `28 passed, 0 failed`.
- The take exited 0 and printed exactly this, apart from the path:

  ```
  Replaced:
    .claude/framework/DECISIONS.md
    .tropis/package.json
    .tropis/scripts/next-work.js
    .tropis/scripts/next.mjs

  Added:
    .claude/commands/refresh-board.md
    .tropis/scripts/board-bands.js
    .tropis/scripts/build-backlog-board.mjs
    .tropis/templates/backlog-bands.yaml
    .tropis/templates/backlog-board.html
  ```

  It also rewrote `.tropis/installed.json`, appended `docs/backlog-board/index.html` to
  `.gitignore`, and appended eleven unanchored `export-ignore` lines to `.gitattributes`
  (`.claude/` … `docs/BLUEPRINT-UPSTREAM.md`, with `docs/backlog-board/` among them) after
  this repository's ten anchored ones.
- After `npm --prefix .tropis install`, `npm --prefix .tropis test` gave
  `Tests: 28 passed, 28 total`.
- Committed as it stood, `bash scripts/check-blueprint.sh` **failed**: the clean baseline
  failed dozens of guards (catalog entries, framework integrity, generated rules,
  set-up-project.sh, take-version.mjs, check-version.mjs among them), and the run ended
  `14 problem(s). A guard that cannot fail is not evidence.` The unanchored lines also match the sample
  project under `fixtures/`, which the self-check exports with `git archive`; this is the
  open entry `update-keeps-ignore-lines-in-their-own-form`, and the reason the check said
  safe is the open entry `version-check-lists-ignore-lines`.
- With the eleven lines deleted and `/docs/backlog-board/ export-ignore` added after
  `/docs/superpowers/ export-ignore`, the self-check passed: `Every guard caught its
  defect and passed the clean baseline.`
- With `docs/backlog-board/bands.yaml` copied from the template,
  `npm --prefix .tropis run board` printed the page's path and `Open it in a browser.`,
  `git status --porcelain` showed only `?? docs/backlog-board/` (the bands file; the page
  is ignored), and the installed checks stayed at 28 of 28.
- This repository's `.tropis/README.md` is its own operator guide (not replaced by an
  update). It lacks the board sentence and `/refresh-board` that `v0.3.1`'s
  `templates/README.md` added. `CLAUDE.md` and `AGENTS.md` are identical; their
  *Commands* block lists `test`, `next` and `rules`.

**Model tier: Small.** Every step is given below.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 5 (record its version and machine).

**Merge authority: parent review.** It changes the instruction layer every later session
here runs on.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-take-v031 -b plan/this-repository-takes-v0-3-1` |

## Global Constraints

- **The command does the update, not you.** Do not copy files from the source folders into
  `.claude/` or `.tropis/` by hand. The only hand edits are those in Tasks 3 and 4.
- **Do not edit the source folders** (`rules/`, `framework/`, `commands/`, `scripts/`,
  `guards/`, `templates/`), `README.md`, `RELEASES.md` or `fixtures/`. If the command
  behaves differently from *What the specifying session verified*, stop and report.
- **Do not edit `feature-catalog.yaml`.**
- **Do not write bands.** The bands file is copied with its header and no rows; banding the
  backlog is the developer's, through `/refresh-board`, after this merges.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken by the specifying session on 2026-10-17. Do not reopen them.

1. **`.gitattributes`.** Delete the eleven unanchored lines the command appends at the end.
   Add `/docs/backlog-board/ export-ignore` on the line after
   `/docs/superpowers/ export-ignore`. Keep the comment and the other anchored lines.
2. **The bands file.** `mkdir -p docs/backlog-board` and copy
   `.tropis/templates/backlog-bands.yaml` to `docs/backlog-board/bands.yaml`, unchanged.
3. **`CLAUDE.md` and `AGENTS.md`**, identically: in *Commands*, after the `run next` line,
   add

   ```
   npm --prefix .tropis run board            # the backlog board, one page to open in a browser
   ```

4. **`.tropis/README.md`**, this repository's operator guide: make the two changes `v0.3.1`
   made to `templates/README.md`, in the same places:
   - after `` `/next` is a report. It does not start the next command. `` insert
     `` `npm --prefix .tropis run board` writes one page of the open backlog to open in a browser; `/refresh-board` walks through banding and refreshing it; with bands written, `/next` suggests by band. ``
   - in *Commands you will type here*, insert `` `/refresh-board`, `` after `` `/next`, ``.

   Nothing else in that file changes.

## Traps

- **Run the update from a checkout of `v0.3.1`, not from your worktree.** `main` is past
  the tag, and the command refuses a checkout that is not exactly on one. Clone this
  repository into a scratch folder outside any repository, `git checkout v0.3.1` there,
  and run that clone's `scripts/take-version.mjs` against your worktree's root. Delete the
  clone afterwards.
- **The command refuses a dirty tree.** Run it right after `npm --prefix .tropis ci`. If
  the worktree is dirty because of that install, stop: `.tropis/node_modules/` is ignored.
- **`.claude/settings.json` denies Edit on the installed copy.** Running the command,
  copying the bands file and editing `.tropis/README.md` are shell steps. Do not work
  around the deny list for anything else.
- **The commit hook will speak.** This commit touches `.claude/framework/` and
  `.claude/commands/`; `framework-commit-check.sh` asks for the fresh-agent check's outcome
  in the body (Task 5).
- **The self-check fails until Decision 1 is applied.** That is expected; do not commit
  and run it before Task 3.

## File Structure

| Path | Written by |
|---|---|
| `.claude/framework/DECISIONS.md`, `.claude/commands/refresh-board.md` | the command |
| `.tropis/package.json`, `.tropis/installed.json`, `.tropis/scripts/next-work.js`, `.tropis/scripts/next.mjs`, `.tropis/scripts/board-bands.js`, `.tropis/scripts/build-backlog-board.mjs`, `.tropis/templates/backlog-bands.yaml`, `.tropis/templates/backlog-board.html` | the command |
| `.gitignore` | the command |
| `.gitattributes` | the command; Decision 1 |
| `docs/backlog-board/bands.yaml` | Decision 2 |
| `CLAUDE.md`, `AGENTS.md` | Decision 3 |
| `.tropis/README.md` | Decision 4 |
| `docs/superpowers/plans/2026-10-17-this-repository-takes-v0-3-1.md` | the handover |

Nothing else may appear.

## Tasks

### Task 1: Preconditions

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain`. Expected: no
output. Then `git -C <scratch clone> describe --tags --exact-match HEAD`. Expected:
`v0.3.1`.

### Task 2: Check, then take

```bash
node <scratch clone>/scripts/check-version.mjs <worktree root>
node <scratch clone>/scripts/take-version.mjs <worktree root>
```

Paste both outputs. The first must answer **safe** with the same file lists as above; the
second must list exactly the files above. If either differs, stop and report.

### Task 3: Resolve what it left

Decision 1. Then:

```bash
npm --prefix .tropis install
npm --prefix .tropis test
node .tropis/scripts/generate-rules.mjs --check
```

Expected: `Tests: 28 passed, 28 total` (or more, never a failure), and `rules up to date`.

### Task 4: The board, entry files and operator guide

Decisions 2, 3 and 4. Then:

```bash
npm --prefix .tropis run board
git status --porcelain
npm --prefix .tropis run next
```

Expected: the board prints its page's path and `Open it in a browser.`; the status lists
no `docs/backlog-board/index.html`; `/next`'s report has no band letters (the bands file
has no rows). Commit everything in one commit (see Task 5 for the body), then run
`bash scripts/check-blueprint.sh`. Expected: green, clean baseline ok.

### Task 5: Fresh-agent check, and the commit body

Start a fresh Claude Code session in the worktree (any current CLI; record version and
machine). Tell it:

> This is a probe; its output will be discarded. Do not commit and change no file.
> Without running anything, tell me how I see this repository's open backlog on one page,
> where the priority bands are kept, and how /next uses them.

Pass if it names `npm --prefix .tropis run board` or `/refresh-board`, says
`docs/backlog-board/bands.yaml`, and says `/next` suggests by band once bands are written.
Put the outcome in the commit's body with the tool, version and machine; amend the Task 4
commit if it is already made.

### Task 6: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green; every path in *File Structure* and nothing else. Append
`## Handover report` with the six sections the planning rules name and every command
from Tasks 1–5 with its output, and commit.

---

## Not in this plan

- **Banding the backlog**, with `/refresh-board`: the developer's, after this merges.
- **The update keeping anchored lines:** `update-keeps-ignore-lines-in-their-own-form`.
- **The check listing ignore lines:** `version-check-lists-ignore-lines`.
- **Replaced and shelved entries asking for bands:**
  `next-leaves-replaced-entries-out-of-arcs`.

## Handover report

### Task completion

- **Task 1** — done. `npm --prefix .tropis ci` in
  `~/src/tropis-take-v031`; `git status --porcelain` empty.
  Scratch clone at `/tmp/tropis-v031-ajGlpZ` (deleted after take):
  `git describe --tags --exact-match HEAD` → `v0.3.1`.
- **Task 2** — done. Check answered **safe** with the expected file lists; take
  exited 0 with the same Replaced/Added lists.
- **Task 3** — done. Decision 1 applied. `npm --prefix .tropis test` →
  `Tests: 28 passed, 28 total`. `generate-rules.mjs --check` → `rules up to date`.
- **Task 4** — done. Decisions 2–4 applied. Board printed its page path and
  `Open it in a browser.`; status showed `?? docs/backlog-board/` (bands only; no
  `index.html`); `/next` had no band letters. One commit; self-check green.
- **Task 5** — done. Fresh Claude Code session; pass criteria met; outcome in the
  commit body (tool, version, machine).
- **Task 6** — done. Checks re-run green; this report appended.

### Verification results

**Task 1 — preconditions**

```
$ npm --prefix .tropis ci
added 269 packages, and audited 270 packages in 3s
$ git status --porcelain
(no output)
$ git -C /tmp/tropis-v031-ajGlpZ describe --tags --exact-match HEAD
v0.3.1
```

**Task 2 — check-version**

```
check-version: ~/src/tropis-take-v031 holds v0.3.0; taking v0.3.1 is safe.

Files the release changes
  Replaced:
    .claude/framework/DECISIONS.md
    .tropis/package.json
    .tropis/scripts/next-work.js
    .tropis/scripts/next.mjs
  Added:
    .claude/commands/refresh-board.md
    .tropis/scripts/board-bands.js
    .tropis/scripts/build-backlog-board.mjs
    .tropis/templates/backlog-bands.yaml
    .tropis/templates/backlog-board.html

Tests against v0.3.1 in a scratch copy
  28 passed, 0 failed
```

**Task 2 — take-version**

```
take-version: ~/src/tropis-take-v031 now holds v0.3.1 (was v0.3.0).

Replaced:
  .claude/framework/DECISIONS.md
  .tropis/package.json
  .tropis/scripts/next-work.js
  .tropis/scripts/next.mjs

Added:
  .claude/commands/refresh-board.md
  .tropis/scripts/board-bands.js
  .tropis/scripts/build-backlog-board.mjs
  .tropis/templates/backlog-bands.yaml
  .tropis/templates/backlog-board.html
```

**Task 3 — install / test / rules**

```
$ npm --prefix .tropis test
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
$ node .tropis/scripts/generate-rules.mjs --check
rules up to date
```

**Task 4 — board / status / next / self-check**

```
$ npm --prefix .tropis run board
~/src/tropis-take-v031/docs/backlog-board/index.html
Open it in a browser.
(also listed 39 open entries with no band — expected with an empty bands file)

$ git status --porcelain
(…) ?? docs/backlog-board/   # with -uall: only bands.yaml; no index.html

$ npm --prefix .tropis run next
(report listed Ready / Blocked / Arcs; no [A]–[E] band prefixes)

$ bash scripts/check-blueprint.sh
Every guard caught its defect and passed the clean baseline.
```

**Task 5 — fresh-agent check**

- Tool: Claude Code CLI `2.1.300`
- Machine: `dev-laptop.local` / macOS
- Prompt: how to see the open backlog on one page; where bands are kept; how `/next` uses them. Probe; no file changes.
- Result: named `npm --prefix .tropis run board` and `/refresh-board`; `docs/backlog-board/bands.yaml`; `/next` suggests by band once bands are written. **Pass.**

**Task 6 — re-run**

```
$ bash scripts/check-blueprint.sh
Every guard caught its defect and passed the clean baseline.

$ npm --prefix .tropis test
Tests:       28 passed, 28 total

$ git diff --stat origin/main...HEAD
 .claude/commands/refresh-board.md       |  71 +++++
 .claude/framework/DECISIONS.md          |  47 +++
 .gitattributes                          |   1 +
 .gitignore                              |   1 +
 .tropis/README.md                       |   4 +-
 .tropis/installed.json                  |  15 +-
 .tropis/package-lock.json               |   4 +-
 .tropis/package.json                    |   3 +-
 .tropis/scripts/board-bands.js          | 106 +++++++
 .tropis/scripts/build-backlog-board.mjs | 130 +++++++++
 .tropis/scripts/next-work.js            |  79 ++++-
 .tropis/scripts/next.mjs                |  32 ++-
 .tropis/templates/backlog-bands.yaml    |  11 +
 .tropis/templates/backlog-board.html    | 495 ++++++++++++++++++++++++++++++++
 AGENTS.md                               |   1 +
 CLAUDE.md                               |   1 +
 docs/backlog-board/bands.yaml           |  11 +
 17 files changed, 988 insertions(+), 24 deletions(-)
```

### Scope

Every path above is in *File Structure* except `.tropis/package-lock.json`, which
`npm --prefix .tropis install` after the take necessarily updates when
`.tropis/package.json` changes. The plan's File Structure omitted it; it is included
in the commit. Nothing else appears. The plan file itself is in the table for this
handover commit.

### Judgment calls

- Ran the fresh-agent check before the take commit so the body could carry the outcome
  without a second amend cycle (Task 5 allows amend if already committed).
- Stripped a `Co-authored-by: Cursor` trailer Cursor injected on `git commit` by
  rewriting the commit with `git commit-tree` (plan Global Constraints forbid that
  trailer). Same approach used for this handover commit if the tool injects again.

### What the plan got wrong

- *File Structure* did not list `.tropis/package-lock.json`, though Task 3 requires
  `npm --prefix .tropis install` after a `package.json` change.

### Outstanding

- **Merge:** parent review (specifying session). Branch
  `plan/this-repository-takes-v0-3-1` in worktree
  `~/src/tropis-take-v031`. Not merged; no PR opened by the
  executor unless the reviewing session wants one.
- **Banding the backlog** remains the developer's after merge (`/refresh-board`).

## Review record

Reviewed by the specifying session (Claude Code desktop, Claude Opus 5.5, on the
developer's Mac, Darwin 25.2.0) on 2026-10-17, against `8e0b9a5`.

### Checks re-run

- `bash scripts/check-blueprint.sh` at `8e0b9a5`, exit 0: `Every guard caught its defect
  and passed the clean baseline.`
- `npm --prefix .tropis test`: `Tests: 28 passed, 28 total`.
- `node .tropis/scripts/generate-rules.mjs --check`: `rules up to date`.
- `git diff --stat origin/main...HEAD`: 18 files — the 17 the handover lists and this plan.
- `npm --prefix .tropis run next`: `Next step: command-slots-spike (…)`, no band letters.
- The hand edits read against the decisions: `.gitattributes` gains only
  `/docs/backlog-board/ export-ignore`, after `/docs/superpowers/`; the bands file is
  byte-identical to `.tropis/templates/backlog-bands.yaml`; `CLAUDE.md` and `AGENTS.md`
  gain the same `run board` line; `.tropis/README.md` gains exactly Decision 4's two
  changes. The take's commit body carries the fresh-agent outcome with tool, version and
  machine; no commit carries a trailer.
- The handover's one diagnosis, that `.tropis/package-lock.json` changed because the
  install follows a changed `package.json`: true. The lock is tracked here, and the
  package file gained the `board` script.

### Found

- **The take names the package after the folder it ran in.** `.tropis/package.json` is
  now `tropis-take-v031-framework`, as the v0.3.0 take left `tropis-take-v030-framework`.
  `take-version.mjs` sets the scratch project up under the project folder's basename, and
  a plan's update runs in a worktree named after the plan. The file is shipped and
  fingerprinted, so renaming it by hand would turn the installed-files check red. Harmless
  (the package is private and nothing reads its name) and left as it is. Routed below.
- The fresh-agent check's reply is summarised in the commit body rather than pasted.
  Accepted: it names each pass item.

### Outstanding disposition

- `.tropis/package-lock.json` missing from *File Structure*: the plan's omission, accepted
  as the handover reports it.
- Banding the backlog with `/refresh-board`: the developer's, after this merges.
- No developer check by hand: the change has no screen beyond the board, which the
  board plan's review already looked at.

### Learnings routed

- The package named after the update's folder becomes a catalog entry,
  `update-keeps-the-package-name`, added to `main` after this merge.
- A plan that runs `npm install` must list the lock file when one is tracked. Covered by
  the planning rule's existing "what is on the other side of this?" questions; nothing new
  to write.

### Merged because

The update ran exactly as the scratch run predicted, the one hand step keeps the
self-check green, and the board is usable here once this lands.
