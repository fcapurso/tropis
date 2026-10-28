# A project chooses the name it sends its suggestions under — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a project's flush names it only by a name the operator chose, kept in the
upstream queue as `Flushes as: <name>`. `/flush-upstream` asks for the name when there
is none and says it will be public; the plan it drafts uses it for every branch, commit
and pull request; and `submit-upstream.sh open` refuses a branch that is not under that
name, so a project's folder name cannot reach a public framework repository by
accident.

**Spec:** the entry `project-chooses-the-name-it-flushes-under` in `feature-catalog.yaml`
and the comment above it, and docs/superpowers/specs/2026-10-27-tropis-goes-public-design.md
(*Removing the sources*). Its criteria were written with this plan.

**What the specifying session verified on 2026-10-28, against `main` at `7507bf7`, with
git 2.49.0, in Claude Code desktop (Opus 5.5) on macOS 26.2, arm64:**

- `commands/flush-upstream.md`, step 5, tells each task to create the branch
  `upstream/<project-folder>/<flush-date>-<entry-slug>`, and to commit "with a body that
  quotes the queue entry, with all its parts, and names the project". Step 5 also has
  each task run
  `bash <project-root>/.tropis/scripts/submit-upstream.sh open OWNER/NAME <branch> <title> <body-file>`
  from inside a temporary clone of the framework.
- `scripts/submit-upstream.sh` `open_pr` takes `<OWNER/NAME> <branch> <title>
  <body-file>`, refuses only a branch named `main`, pushes `HEAD` to the branch on the
  framework or the account's fork, and opens the pull request. Its usage line, its
  header comment (lines 15–20) and `preflight <project-root>` are the other places that
  describe its arguments.
- `guards/submit-upstream.test.js` runs the source script with a stub `gh` on `PATH`
  and local bare repositories, using `BRANCH = 'flush/example'` for every `open` test.
- The queue is `docs/BLUEPRINT-UPSTREAM.md`. Setup does not create it. Its header holds
  `Last flushed: <date>.` (`fixtures/base/docs/BLUEPRINT-UPSTREAM.md`), which
  `scripts/next.mjs` reads with `/Last flushed:\s*(\d{4}-\d{2}-\d{2})/`.
- `.github/scripts/absorb-flush.mjs` (the maintainer's side, this repository only) reads
  branches by a prefix the maintainer gives; the branch shape `upstream/<name>/…` does
  not change.
- `templates/README.md` (the operator guide) does not mention the flush.

**Model tier: Medium.** The decisions and wording are given; the script change and its
tests need building in an existing test world.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** It changes a command every project's operator runs
and the script that publishes to the framework.

Do not store a kick-off prompt on this plan.

---

## Delivers

project-chooses-the-name-it-flushes-under

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-flush-name -b plan/project-chooses-the-name-it-flushes-under` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.**
- **Add no dependency. Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Open a pull request; do not merge.

## Decisions

Taken by the specifying session on 2026-10-28.

### 1. Where the name lives

A line in the queue's header, below `Last flushed`: `Flushes as: <name>.` — the queue is
the one file the flush already reads and writes, so no new settings file is needed. The
name matches `^[a-z0-9][a-z0-9-]*$`. The trailing full stop is optional when read.

### 2. What `/flush-upstream` does

In step 1, after the preflight: read `Flushes as:` from the queue. If it is missing,
ask the operator for the name, saying in one sentence that it will be published in
branch names, commits and pull requests on the framework's repository, so a private
project should pick a name that does not identify it. Suggest no name derived from the
folder or the repository. Write the line into the queue (create the queue's header if
the file has none) before going on.

In step 5, every `<project-folder>` becomes `<flush name>`, and the commit body "names
the project" becomes "names the project by its flush name, and by nothing else — not
its folder, repository or product name". The pull request body says the same.

### 3. `submit-upstream.sh open` takes the project root

New signature: `open <project-root> <OWNER/NAME> <branch> <title> <body-file>`, matching
`preflight <project-root>`. Before any `gh` call or push, `open` reads
`<project-root>/docs/BLUEPRINT-UPSTREAM.md` and refuses — through the script's existing
`refuse` — when the file or its `Flushes as:` line is missing, when the name does not
match *Decision 1*, or when the branch does not start with `upstream/<name>/`. Each
refusal says which and what to do. An explicit argument rather than a path derived from
the script's own location, because the script runs from inside a clone of another
repository.

Update the usage line, the header comment, and the command's `open` call to the new
signature.

## Traps

- **Every existing `open` test changes its call**, to pass a project root holding a
  queue with `Flushes as: example` and a branch `upstream/example/…`. That is the
  signature change, not a weakened test.
- **The self-check reads committed content only.** Commit, then run it.

## File Structure

| File | Change |
|---|---|
| `scripts/submit-upstream.sh` | *Decision 3* |
| `guards/submit-upstream.test.js` | Task 1 |
| `commands/flush-upstream.md` | *Decision 2*, and the new `open` call |
| `fixtures/base/docs/BLUEPRINT-UPSTREAM.md` | add `Flushes as: example.`, only if a guard reading the fixture needs it |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming this handover |
| `docs/superpowers/plans/2026-10-28-project-chooses-the-name-it-flushes-under.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, `git status --porcelain` (expected: nothing),
`git fetch --tags origin` and `bash scripts/check-blueprint.sh` (expected last line
starts `Self-check passed`).

### Task 1 — Tests first

In `guards/submit-upstream.test.js`, move every `open` call to the new signature, and
add, each asserting a non-zero exit, a message naming the problem, nothing pushed to
either bare repository and no `pr create` in the stub's log:

- no queue file; a queue with no `Flushes as:` line;
- `Flushes as: Example Project` (not a valid name);
- a valid name with branch `upstream/other/2026-10-28-x`, and with `flush/example`.

And one that a valid name with a branch under it pushes and opens as before. Run them
against the current script and record how each fails. Then apply *Decision 3* and run
until green. Commit.

### Task 2 — The command

Apply *Decision 2* to `commands/flush-upstream.md`. Then
`git grep -n "project-folder" -- commands scripts templates framework rules` must print
nothing; paste it. Commit.

### Task 3 — Fresh-agent check

The command change alters what an agent is told to do, so it owes one. Make a scratch
project in a temporary folder: `git init`, then
`bash <worktree>/scripts/set-up-project.sh <scratch>`, then a
`docs/BLUEPRINT-UPSTREAM.md` holding the fixture's header and one entry, and no
`Flushes as:` line. Start a fresh agent session in it (for Claude Code, `claude -p`;
any current agent tool will do) with, verbatim:

> This is a probe and will be discarded; do not push or open anything. Read
> `.claude/commands/flush-upstream.md` and do its step 1 as far as you can without a
> network. Then say what branch name the first flushed entry would get.

Pass: it asks for (or says it must ask for) a flush name, says that name will be
public, does not propose the folder name, and gives a branch under `upstream/<that
name>/`. Record the prompt, the reply and the tool, version, operating system and
architecture. If no agent tool can be started here, say so under *Outstanding*.

### Task 4 — Catalog

The entry's criteria are already written on `main`. Set `status: shipped`, `modules` to `commands/flush-upstream.md` and
`scripts/submit-upstream.sh`. Above the entry, a comment naming this handover and
mapping: criteria 1 and 2 — Task 3's check, recorded in the squash commit's body;
criterion 3 — Task 1's tests. If Task 3 did not run, leave the entry at `building` and
say so. Remove the sentence "Until this ships, first-adopter must not flush to the
public repository." from the comment only if the entry ships. Commit, run
`npm --prefix .tropis test` and `bash scripts/check-blueprint.sh`, record both.

### Task 5 — Handover report

Append `## Handover report` with the six sections the planning rule names. Commit, push
the branch, open a pull request against `main` whose body carries Task 3's result. Do
not merge.

---

## Handover report

### Task completion

Tasks 0–5 done. Task 3 ran (Claude Code 2.1.312, Linux x86_64).

### Verification results

- Task 1, red first: against the old script, 12 of 19 tests in `guards/submit-upstream.test.js` failed (every `open` test, old signature). After the change: `Tests: 19 passed, 19 total`.
- Task 2: `git grep -n "project-folder" -- commands scripts templates framework rules` printed nothing (exit 1).
- Task 3 (fresh agent). Tool: `claude -p`, Claude Code 2.1.312, Linux x86_64. Scratch project set up with `scripts/set-up-project.sh`, queue with the fixture header and one entry, no `Flushes as:` line. Prompt, verbatim: "This is a probe and will be discarded; do not push or open anything. Read `.claude/commands/flush-upstream.md` and do its step 1 as far as you can without a network. Then say what branch name the first flushed entry would get." Reply (abridged): it could not run preflight, read the script instead; found no `Flushes as:` line and said the command has it ask the operator for a name; said the name "will appear in branch names, commits and pull requests on the framework's repository, so a private project should pick a name that doesn't identify it"; proposed no name, since the command says not to derive one from folder or repository; gave the branch as `upstream/<flush name>/2026-10-27-<entry-slug>`. Pass on all four points.
- Task 4: `npm --prefix .tropis test`: 5 suites, 31 tests passed. `bash scripts/check-blueprint.sh`: see Outstanding.

### Scope

`git diff --stat origin/main...HEAD` before this report: commands/flush-upstream.md, feature-catalog.yaml, guards/submit-upstream.test.js, scripts/submit-upstream.sh (4 files, 94 insertions, 19 deletions), plus this plan file. All are in the File Structure table. Worktree: /home/user/tropis-flush-name. The fixture queue was not changed; no guard needed it.

### Judgment calls

- The `main` check in `open` runs after the queue checks; a branch `main` is refused either way, with a message naming the branch.
- The name is read tolerating an optional trailing full stop and surrounding spaces.
- Added a test for the name without its full stop.

### What the plan got wrong

Nothing found. The probe noted that the command does not say how an entry slug is made from its title; pre-existing, not addressed here.

### Outstanding

- `bash scripts/check-blueprint.sh` on commit 198c910 ended: "Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed." An earlier run failed its clean baseline on the take-version guard tests; it ran while another copy of the self-check had just been killed, and I could not reproduce it (the same baseline passed when re-run by hand and in the final full run). Likely interference between concurrent runs; not investigated further.
- The container restarted once mid-task; the worktree and commits were intact and the check was re-run.
- Merge is for parent review; I did not merge.

## Review record

Reviewed 2026-10-28 by the reviewing session, in the worktree /home/user/tropis-review-137,
on Claude Code (Opus 5.5) in a cloud session, Linux 6.18 x86_64, git 2.43.0, Node v22.22.0.
The branch was rebased onto `origin/main` at `c4f8b28` (it brings in the private-material
guard from PR 136) with no conflicts.

### Checks re-run

- `git diff --stat origin/main...HEAD`: 5 files — `commands/flush-upstream.md`,
  `feature-catalog.yaml`, `guards/submit-upstream.test.js`, `scripts/submit-upstream.sh`
  and this plan. All are in the File Structure table; the fixture queue is untouched.
- `bash scripts/check-blueprint.sh` on the rebased head `197cf64`, with nothing else
  running: "Self-check passed: every guard caught its defect, the clean baseline passed,
  and the framework repository's own guards passed." Exit 0. This covers the handover
  commit, which the executor had not run the check over. It ran again after this
  review's test fix; result under *Merged because*.
- `npm --prefix .tropis test`: 5 suites, 31 tests passed.
- `guards/submit-upstream.test.js`, run on a staged `git archive` of the head the way the
  self-check stages it: 19 passed. With `scripts/submit-upstream.sh` restored to
  `origin/main` in a throwaway commit: 12 failed, 7 passed — matches the handover.
- Re-planting, each a throwaway commit then dropped: removing all the queue checks failed
  the five refusal tests; removing only the branch-prefix check failed the two branch
  tests; **removing only the name-format check failed nothing** (see *Found*).
- `guards/catalog-drift.test.js` with `FRAMEWORK_ROOT` set to the worktree: 3 passed. It
  skips this plan until the plan is on `origin/main`, so checked by hand: the Delivers id
  `project-chooses-the-name-it-flushes-under` is `status: shipped` in `feature-catalog.yaml`,
  so it holds once this merges.
- Task 2's grep, `git grep -n "project-folder" -- commands scripts templates framework rules`:
  no output, exit 1. A wider grep for the old `open OWNER/NAME` signature outside plans and
  the installed release found nothing; the remaining `project-folder` mentions are the
  catalog comment and `docs/backlog-board/bands.yaml` evidence, both describing the
  problem as it was.

The handover's points were checked as well as its figures:
- *Self-check not re-run after the handover commit*: re-run above, passed.
- *Early self-check failure while runs overlapped, cause unconfirmed*: with nothing
  running alongside it, the clean baseline including `take-version` passed. That shows the
  failure does not happen in a solo run; it does not confirm the overlap as the cause.
- *The `main` refusal now runs after the queue checks*: true, and it is now unreachable —
  `main` never starts with `upstream/<name>/`, so the branch check refuses it first. The
  test "refuses a branch named main before pushing anything" still holds (exit 1, one
  stderr line naming `main`, nothing pushed, no `pr create`), through the branch check's
  message. Behaviour is unchanged; the line stays as defence if the prefix check is ever
  loosened.
- *The probe's note on entry slugs*: confirmed. `commands/flush-upstream.md` does not say
  how `<entry-slug>` is made, and did not before this plan.

The fresh-agent check (Task 3) was not re-run; its recorded reply addresses all four pass
points, and the command text it read is the text reviewed here.

### Found

- **The invalid-name test could not fail.** It used the branch `upstream/example/2026-10-28-x`
  with `Flushes as: Example Project`, so the branch check refused it and that message also
  contains "Example Project". Understood and mechanical, so **fixed on the branch by the
  reviewer** in `81188d1`: the branch is now `upstream/Example Project/2026-10-28-x` and the
  test matches the name check's own message. Re-planted: with the name check removed, that
  test now fails (1 failed, 18 passed); with it, 19 passed. The developer's later use of
  the flush is the check on this fix.
- Nothing else.

### Outstanding disposition

- The earlier self-check failure under concurrent runs: not reproduced in a solo run here.
  Unexplained, and recorded as such; nobody is looking at it now. The dispatching session
  reported the same `take-version` scratch-folder test failing intermittently while four
  self-checks ran in parallel, so it is a property of parallel runs, not of this plan.
  Dropped for this plan: it is not in this plan's files, and a solo run is green.
- The container restart: no residue; dropped.
- Merge by parent review: done by this session.
- The entry-slug note from the probe: dropped. The slug comes from the queue entry, which
  the commit and pull request already quote in full, so how the slug is made exposes
  nothing the body does not, and nothing has been reported as going wrong with it.
- Criteria 1 and 2 rest on the Task 3 fresh-agent check, recorded in the squash body.
  Nothing here needs the developer to observe it: there is no screen.

### Learnings routed

- "A refusal test whose expected message also appears in an earlier refusal's message
  does not isolate the check it names" is the planning rule's existing *re-break each
  guard* step working as intended; it caught this. Not routed further: the rule already
  requires the re-plant, and this is an instance of it, not a gap.
- Nothing else generalises.

### Merged because

Every check re-ran green on the rebased head, the one guard that could not fail was fixed
and shown to fail when planted, and the diff is exactly the File Structure table.
`bash scripts/check-blueprint.sh` on `b2944fb`, the commit carrying the test fix and this
record before this sentence was added: "Self-check passed", exit 0.
