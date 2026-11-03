# A restaged release's notes cover what merged since — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** whenever `/release` sends the developer back to deploy a newer commit to
staging, it first lists what merged since the notes were drafted and redrafts the notes
to cover it, so a release cannot ship a change its notes never mention.

**Backlog item:** `release-notes-cover-a-restaged-commit` in `feature-catalog.yaml`
(type bug), in the bundle `release-writing` of `docs/backlog-board/bands.yaml`. There is
no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — every path back to staging for a newer
commit passes through a redraft of the notes for what merged since they were drafted.

**What the specifying session verified on 2026-11-03, against `origin/main` at
`ea5093d` (git 2.43, Claude Code in a cloud session, Linux x86_64):**

- **The four paths back to step 1 for a newer commit**, all in `commands/release.md`:
  *Step 1*, a failed run ("once a fix has merged, `/release` starts step 1 again for the
  new head of the main branch"); *Resume at staging* item 5 (`fail`: "Go to *Step 1*
  with `<commit>` the head of `origin/main`, once the developer says the fix has
  merged"); *Stage 7*, the first comparison with the staged commit ("go to *Step 1* with
  `<commit>` the head of `origin/main`: staging must be deployed and checked again"); and
  *Stage 7*, the second comparison after the promotion commit ("go to *Step 1* with
  `<commit>` the head of `origin/main`"). Stage 6's `fail` stops "as for a failed run",
  so it reaches the same resume path. None of the four says anything about the notes.
- **Step 1 already expects a commit that carries the notes:** workflow.md's release
  section: "Step 1, deploy to staging, for one commit on the main branch that already
  carries the notes." So a redraft must land on `main` before step 1 deploys, and the
  commit step 1 deploys is the one that landed it.
- **Stage 7 reads the bump from the newest `Bump:` line in `git log <staged>`**, so a
  redraft commit carrying its own `Bump:` line changes the bump the promotion uses.
- **What guards read the command.** `guards/release.test.js`, *the /release drafting
  stage* and *the /release README stage*, assert phrases from Stage 3 and Stage 1b. None
  asserts the four sentences above (`git grep -nF "head of" -- guards` prints nothing).

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is the wording of a command, which
can be stated only by writing it. The specifying session writes the change on the plan's
branch; an agent with only the repository, on the model
`node .tropis/scripts/dispatch.mjs --tier Large` names, reviews it and writes the review
record. That command names no model in this cloud session, because no subscription is
recorded; the Large tier's first pick that every Claude Code subscription includes, per
`docs/model-picks.md`, is Claude Sonnet 5.5, and that is what the reviewer runs on.

**Merge authority: self-merge after the fresh review.** The criteria are checked by the
guard and the fresh-agent check; the review record is the reviewer's.

**Fresh-agent check: owed.** `commands/release.md` changes what an agent running
`/release` is told to do (workflow.md, *Branching*). The probe is told it is running
`/release` on an invented project whose check on staging failed and whose fix has since
merged, and is asked what it does next; it passes if it lists the commits merged since
the notes commit and proposes a redraft before printing the staging trigger.

## Delivers

release-notes-cover-a-restaged-commit

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-restaged-notes-build -b plan/release-notes-cover-a-restaged-commit origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true; the commit touching
  `commands/release.md` states the fresh-agent check's outcome.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Decisions

1. **One section, four pointers.** A new section of `commands/release.md`, *Back to
   staging for a newer commit*, holds the redraft; the four paths above go there instead
   of straight to *Step 1*. Rejected: a sentence at each of the four, which would be four
   copies to drift.
2. **The window is the notes commit to the head of `origin/main`**, where the notes
   commit is `git log -1 --format=%H origin/main -- <notes file>`, the same expression
   *Resume at staging* already uses. Mapped onto the backlog as Stage 2 does, read for
   private material as Stage 3 does in a public project, and written into the existing
   `## [Unreleased]` body to Stage 3's shape, keeping its facts.
3. **Nothing that changes anything for a reader keeps the notes as they are**, and says
   which commits and why, then goes to *Step 1* with the head of `origin/main`: a fix
   for the check that failed is often of that kind.
4. **Otherwise the redraft is confirmed and committed as the first draft was**: Stage 4
   with the bump worked out again over the whole window from the last tag (a `feat:`
   merged after a patch-only draft raises it), Stage 5's filled slot with a fresh `Bump:`
   line, and *Step 1* with the commit that landed it. The merge token is still held in
   the developer's name, unless the command gave it back on a failure, in which case it
   is taken again first, as *Resume at staging* already says.

## Traps

- `commands/release.md` is the source; `.claude/commands/release.md` is the installed
  release and is not edited.
- The guard collapses whitespace before matching, so a re-wrapped phrase still matches;
  a phrase the guard asserts must not be split by markdown emphasis.

## File Structure

| File | Change |
|---|---|
| `commands/release.md` | the new section and the four pointers |
| `guards/release.test.js` | a `describe` asserting the section and that no path goes to step 1 with the head of `origin/main` directly |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-03-release-notes-cover-a-restaged-commit.md` | the handover report and the review record |

## Tasks

1. Add the guard's `describe` and run it: it fails against the command as it stands.
2. Write the section and the four pointers; the guard passes.
3. Run the fresh-agent check, with its tool calls visible, and record it in the commit
   body.
4. Move the item to `shipped`, write the handover report, run
   `bash scripts/check-blueprint.sh` after committing it.
5. Send the branch to the fresh reviewer, who writes the review record.

## Handover report

Built by the specifying session, a Claude Code 2.1.317 cloud session; git 2.43.0, node
v22.23.4, Linux x86_64. Source worked from: none in particular; the section is written
against this repository's own `commands/release.md`.

### Task completion

- Task 1: done. The guard's new `describe`, *the /release way back to staging*, run
  against `commands/release.md` as it stood: `Tests: 11 failed, 77 passed, 88 total`.
- Task 2: done. The section *Back to staging for a newer commit* sits between *Resume at
  staging* and *Stage 7*; the four paths point at it. After: `Tests: 88 passed, 88 total`.
- Task 3: done, passed on the first run (below).
- Task 4: done.
- Task 5: the fresh reviewer's record follows.

### Verification results

- Guards were run on the working tree with a scratch script that copies the tracked and
  untracked files into a temporary directory, writes `{"type":"module"}` as
  `package.json`, copies `templates/framework-jest.config.js` and links the
  `.self-check/node_modules` the self-check installed, then runs
  `node --experimental-vm-modules node_modules/.bin/jest guards/release.test.js`.
  With the change: `Tests: 88 passed, 88 total`. With `commands/release.md` stashed:
  `Tests: 11 failed, 77 passed, 88 total` (the eleven new cases, and the existing Stage 7
  case, whose phrase moved to the new pointer).
- Fresh-agent check: Claude Code 2.1.317 on Linux x86_64, `claude -p --model
  claude-sonnet-5-5 --output-format stream-json --verbose
  --disallowedTools=Bash,Edit,Write,NotebookEdit,Agent`, signed in to the developer's
  plan with no API key, in a scratch clone of this branch. The task: an invented project
  whose check on staging failed, a fix and a `feat:` merged since, and the developer
  saying the fix has merged; say what you do up to the staging trigger, running nothing.
  Its only tool call was a read of `commands/release.md`. It went *Resume at staging*
  item 5 → *Back to staging for a newer commit*, quoted
  `git log aaa1111..origin/main --format='%h|%s|%(trailers:key=Implements,valueonly)'`,
  judged the price filter a change for readers ("So I take step 3, 'Otherwise redraft'"),
  worked the bump out again ("`ccc3333` is a `feat:`, so the bump is at least minor"),
  confirmed as Stage 4, committed as Stage 5's filled slot with a fresh `Bump:` line, and
  printed the staging trigger with "the full hash of the redraft's merge commit, not
  `aaa1111`, `bbb2222` or `ccc3333`". It found what the change intended.
- `bash scripts/check-blueprint.sh`: run by the pull request's pipeline
  (`pipeline / framework / checks`); locally it outran this session's command limit.

### Scope

`git diff --stat origin/main...HEAD`: `commands/release.md`, `guards/release.test.js`,
`feature-catalog.yaml`, `docs/backlog-board/bands.yaml` and this plan, all in *File
Structure*. Worktree: the sibling `../tropis-restaged-notes-build`.

### Judgment calls

- The window starts at the notes commit, not the staged commit: in the failed-check path
  they are the same commit, and in Stage 7's path the notes commit is the one whose
  draft is out of date.
- The private-material reading covers only the new window, since the earlier one was
  read when the notes were first drafted.
- Stage 6's `fail` already stops "as for a failed run", so it needed no pointer of its
  own.

### What the plan got wrong

- Nothing found.

### Outstanding

- No screen; a real release that goes back to staging is the developer's live check.
