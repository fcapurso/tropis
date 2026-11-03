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
