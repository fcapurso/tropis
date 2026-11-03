# A cloud session starts a plan as a local one does — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** a session in a fresh clone, such as a Claude Code cloud session, can be told
which subscriptions the developer holds without anything personal being committed, so
`/dispatch` and the sprint name the included model there too; and the workflow says that
a cloud session does a plan's work on the plan's own branch, in a worktree, not on the
branch the cloud assigned it.

**Backlog items:** `cloud-session-knows-the-subscriptions` and
`cloud-session-works-on-a-plan-branch` in `feature-catalog.yaml`. Spec:
`docs/superpowers/specs/2026-11-03-cloud-sprint-design.md`, *What a cloud session hit*
items 6 and 9, and *The pieces, in order*, pieces 5 and 8.

**One plan:** what becomes true is one sentence — a cloud session starts a plan the way
a local one does, on the plan's branch and with its model named.

**What the specifying session verified on 2026-11-03, against `origin/main` at `ffec54b`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64), and what a cloud session reported
(Claude Code 2.1.317, Claude Code cloud session, Linux x86_64):**

- **No record in a fresh clone.** In the cloud, `node .tropis/scripts/dispatch.mjs --tier Large`
  printed `**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers.`
- **Where the record is read.** `scripts/dispatch.mjs` lines 69–76 read
  `<git common dir>/tropis/subscriptions.txt`; `scripts/sprint.mjs` `teamModelLine` and
  `teamModelFor` (lines 165–190) read the same path beside `sprint.json`. Both pass the
  text to `pickToUse` or `pickForTool` in `scripts/plan-binding.js`, which parse it with
  `parseSubscriptions`: one `<tool>: <subscription>` per line, `#` lines ignored. The
  message for no record is in `pickToUse` (line 444).
- **How the record is written and described.** `dispatch.mjs --subscriptions` writes it;
  `commands/refresh-model-tiers.md` *Which subscriptions the developer has* says it is
  kept on the machine and never committed, because a person's subscriptions are theirs
  and the project may be public.
- **The branch a cloud session starts on.** A cloud session starts in its only checkout,
  on a branch the cloud assigned (`ccr-…`), and its own instructions say to push there.
  Pushing other branch names works: the probe pushed `plan/probe-sprint-cloud`,
  `probe/cloud-pr` and `scratch/…` branches. The workflow's *Branching* says a session
  creates its branch in a worktree of its own from `origin/main`, with the command it
  gives there, and a hook refuses creating a branch in the main checkout.
- **Guards that copy these scripts by hand:** `guards/sprint.test.js`,
  `guards/team-member-cli.test.js`, `guards/plan-overlap.test.js` and
  `guards/fresh-clone.test.js` hold lists of script files they copy into a scratch
  project. A new module that `dispatch.mjs`, `sprint.mjs` or `plan-binding.js` imports
  must be added to every list that copies one of them.

**Decided by the specifying session:**

- **The record can come from the environment.** Where no local record exists, the
  variable `TROPIS_SUBSCRIPTIONS` holds the same lines, separated by `;`, such as
  `Claude Code: Max; Cursor: Pro`. A local record wins where both exist. The variable is
  set in the cloud environment's settings, never in a committed file. Rejected: a
  committed record (personal, in a public project), and asking the developer in every
  cloud session (a sprint session starts unattended team members).
- **One reader.** A new module `scripts/subscriptions.js` exports
  `readSubscriptions(root, env)`, returning the record's text or `null`; `dispatch.mjs`
  and both functions in `sprint.mjs` call it. The no-record message in `pickToUse` names
  the variable as the other way to say it.
- **A cloud session leaves its assigned branch alone.** It creates each plan's branch in
  a worktree from `origin/main`, as every session does, and pushes that branch; it
  commits nothing to the branch the cloud assigned, and does not need it merged.
- **Decision record:** write one, numbered at merge as the next free FW number, for the
  variable and the branch rule, with the rejected options above.

**Model tier: Medium.** Small code change with its tests, plus wording and a decision.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 6; do not open a pull request, write a review record
or merge.

**A fresh-agent check is owed**, because `framework/workflow.md` changes: Task 5.

Do not store a kick-off prompt on this plan.

---

## Delivers

cloud-session-knows-the-subscriptions, cloud-session-works-on-a-plan-branch

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-cloud-start -b plan/cloud-session-starts-like-local origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true; the commit touching `framework/`
  states the fresh-agent check's outcome once it has run.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Never write the developer's real subscriptions
  anywhere committed; tests use invented ones.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

1. **`scripts/subscriptions.js`** (new), with the shared-machinery first line the other
   scripts carry: `readSubscriptions(root, env = process.env)` returns the local record's
   text where `<git common dir>/tropis/subscriptions.txt` exists, otherwise, where
   `env.TROPIS_SUBSCRIPTIONS` is set and not blank, its parts split on `;`, trimmed and
   joined with newlines, otherwise `null`. A comment says the variable is how a fresh
   clone, such as a cloud session, is told, and that it is never committed.
2. **`scripts/dispatch.mjs`** and **`scripts/sprint.mjs`** (`teamModelLine`,
   `teamModelFor`) read the record through it. Nothing else in them changes.
3. **`scripts/plan-binding.js`**, `pickToUse`'s no-record line: keep its start
   (`**Use:** not chosen — which subscriptions you have is not recorded on this machine.`)
   and end it `Run /refresh-model-tiers, or set TROPIS_SUBSCRIPTIONS.`
4. **`scripts/installed-scripts.txt`**: add `subscriptions.js`.
5. **`commands/refresh-model-tiers.md`**, *Which subscriptions the developer has*: one
   paragraph after step 4 saying that a fresh clone has no record, and that where one is
   used, such as a cloud session, the developer sets `TROPIS_SUBSCRIPTIONS` in that
   environment's settings, in the same `<tool>: <subscription>` form separated by `;`; a
   local record wins.
6. **`templates/README.md`**, the operator guide, where it mentions the record or the
   picks (find it with `git grep -n "subscription" templates/README.md`): one sentence
   naming the variable for cloud sessions.
7. **`framework/workflow.md`**, *Branching*, after the bullet on creating a branch in a
   worktree: a bullet saying that a cloud session starts on a branch the cloud assigned
   it, in its only checkout, and leaves that branch alone: it creates each plan's branch
   in a worktree from `origin/main` as above and pushes that, commits nothing to the
   assigned branch, and needs nothing merged from it.
8. **`framework/DECISIONS.md`**: the decision, numbered at merge (see *Traps*).

## Tests

In a new guard `guards/subscriptions.test.js` (read how `guards/dispatch.test.js` runs
`dispatch.mjs` against a scratch project, and do the same):

1. † `test('reads the record from TROPIS_SUBSCRIPTIONS where no local record exists', …)`:
   `readSubscriptions` on a scratch repository with no record and
   `TROPIS_SUBSCRIPTIONS='Claude Code: Max; Cursor: Pro'` returns the two lines.
2. † `test('a local record wins over the variable', …)`.
3. † `test('dispatch names the included pick from the variable', …)`: with a picks file
   whose Large tier's first pick is included on an invented subscription, `dispatch.mjs
   --tier Large` run with the variable set names that pick, and without it prints the
   no-record line ending `or set TROPIS_SUBSCRIPTIONS.`
4. In `guards/sprint.test.js`: † a case that `sprint.mjs start` with the variable set and
   no local record prints a team-model line naming a pick, not `not chosen`.

Add `subscriptions.js` to every hand-written copy list in `guards/sprint.test.js`,
`guards/team-member-cli.test.js`, `guards/plan-overlap.test.js` and
`guards/fresh-clone.test.js` that copies `dispatch.mjs`, `sprint.mjs` or
`plan-binding.js`; leave a list that copies none of them as it is. Change any case that
asserts the old no-record line's ending.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
- **Run a single guard the way the self-check runs one**, on the project-shaped tree
  `scripts/check-blueprint.sh` builds from a `git archive` of `HEAD`, with the jest under
  `.self-check/`. Say the exact command in the handover.
- **The decision's number.** Write it as `FW-NNN` with a note in the handover; the
  reviewing session numbers it at merge, since another plan may take the next number
  first. A heading with `NNN` must not reach `main`.
- **A framework document may name a path in backticks only if it exists in a project.**
  Name the spec and plans in plain text in `framework/`, `commands/` and `templates/`.
- **A child process inherits `TROPIS_SUBSCRIPTIONS` from your shell.** Set or delete it
  explicitly in every test's environment.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/subscriptions.js` | new |
| `scripts/dispatch.mjs` | reads the record through `readSubscriptions` |
| `scripts/sprint.mjs` | reads the record through `readSubscriptions` |
| `scripts/plan-binding.js` | the no-record line names the variable |
| `scripts/installed-scripts.txt` | one line |
| `guards/subscriptions.test.js` | new |
| `guards/sprint.test.js` | one case; the copy lists |
| `guards/team-member-cli.test.js` | the copy lists, where they copy one of the three |
| `guards/plan-overlap.test.js` | the copy lists, where they copy one of the three |
| `guards/fresh-clone.test.js` | the copy lists, where they copy one of the three |
| `guards/dispatch.test.js` | only a case asserting the old no-record line |
| `commands/refresh-model-tiers.md` | the variable |
| `templates/README.md` | the variable |
| `framework/workflow.md` | *Branching*: the cloud session's assigned branch |
| `framework/DECISIONS.md` | the decision |
| `feature-catalog.yaml` | both items to `shipped`, comments mapping criteria to cases (Task 6) |
| `docs/backlog-board/bands.yaml` | both items' rows removed (Task 6) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-cloud-session-starts-like-local.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the workflow, the refresh command and
the operator guide change here, and the decision is recorded. No upstream queue: this
repository is the upstream. A release-note line is the developer's at `/release`: set
`TROPIS_SUBSCRIPTIONS` in a cloud environment's settings to have cloud sessions name the
included model.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, `git status --porcelain` (nothing), and
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Record
`git --version`, `node --version`, `uname -sm` and `claude --version`.

### Task 1 — The tests, red

Add the † cases. Commit. Run the two guards alone: the † cases fail. Paste their names.

### Task 2 — The reader

*The change* items 1–4, and the copy lists. Commit. Run every guard you touched alone:
all pass.

### Task 3 — The documents

*The change* items 5–7. Commit.

### Task 4 — The decision

*The change* item 8: `## FW-NNN: …` at the end of `framework/DECISIONS.md`, in the shape
of the entries above it (Date, Status, Decision, Rejected, Consequences). Commit. Then
`bash scripts/check-blueprint.sh`: last line starts `Self-check passed`.

### Task 5 — The fresh-agent check

In a scratch clone of this branch outside the repository, run
`claude -p --output-format stream-json --verbose`, with `ANTHROPIC_API_KEY` unset, and a
prompt saying it is a probe whose output is discarded, that it is a Claude Code cloud
session started on an assigned branch `ccr-example`, and that it must deliver an invented
plan `plan/example-change`; ask which branch it does the work on, where, and what it does
with `ccr-example`, following `framework/workflow.md` in this checkout, without running
anything. It passes when it creates `plan/example-change` in a worktree from
`origin/main`, pushes that, and leaves `ccr-example` alone. Quote the relevant part, with
tool, version, operating system and architecture. If it misses, change the wording until
a new run finds it, and say so. State the outcome in the body of Task 3's commit (amend)
or a new commit.

### Task 6 — The backlog, the board and the handover

1. In `feature-catalog.yaml`, both items to `status: shipped` with their `modules`
   (`scripts/subscriptions.js`; `framework/workflow.md`), and above each a
   `# Shipped by docs/superpowers/plans/2026-11-03-cloud-session-starts-like-local.md.`
   comment with one line per acceptance criterion naming what covers it. No `: ` inside
   an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete both items' blocks, nothing else.
3. Commit. Run `npm --prefix .tropis test`, `bash scripts/check-blueprint.sh` and
   `git diff --stat origin/main...HEAD`; paste each.
4. Append `## Handover report` with the six sections the planning rule names (Outstanding
   says there is no screen). Commit.
5. `git push -u origin plan/cloud-session-starts-like-local`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.
