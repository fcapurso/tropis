# A release's notes say briefly what changed — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** `/release` drafts notes that say in a sentence or two per change what someone
can now do, keep every step to do by hand in full, and mention a small correction only
where someone taking the release would notice it.

**Backlog item:** `a-release-says-what-changed-briefly` in `feature-catalog.yaml` (type
improvement), in the bundle `release-writing` of `docs/backlog-board/bands.yaml`. There
is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — the notes `/release` drafts are short
everywhere except the steps to do by hand.

**What the specifying session verified on 2026-11-03, against `origin/main` at
`fb21abc` (git 2.43, Claude Code in a cloud session, Linux x86_64):**

- **The shape the command asks for today**, `commands/release.md`, Stage 3, *Then write
  it in this shape*: item 3, "**One section per change that matters to them**, its
  heading saying what they get … The body says what is different for them, and only
  then, if they need it, how." and item 4, "**Small fixes as one-line bullets** under a
  closing heading such as "Smaller corrections". A fix that needs a paragraph to explain
  is not small." Nothing sets a length, and nothing limits small fixes to those a reader
  would notice.
- **What it produced:** `RELEASES.md`, `## [0.8.0]`, has a section of five to ten
  sentences per change (*Run a sprint with a team of agents*, *Parallel work merges in
  turn…*); the item's comment records about 1,350 words against roughly 700 for each of
  0.5.0 to 0.7.0.
- **The guard on the shape:** `guards/release.test.js`, *the /release drafting stage*,
  asserts the phrases `One section per change that matters to them` and `Small fixes as
  one-line bullets`; they change with the wording.
- **Overlap:** `docs/superpowers/plans/2026-11-03-release-notes-cover-a-restaged-commit.md`,
  in `building`, touches `commands/release.md` and `guards/release.test.js` in other
  sections. Its new section says a redraft is written "to Stage 3's shape", which this
  plan's change leaves true.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is the wording of a command. The
reviewer runs on Claude Sonnet 5.5, the Large tier's first pick every Claude Code
subscription includes (`docs/model-picks.md`); `node .tropis/scripts/dispatch.mjs --tier
Large` names none in this cloud session, which records no subscription.

**Merge authority: self-merge after the fresh review.**

**Merges after:** release-notes-cover-a-restaged-commit

**Fresh-agent check: owed**, since the command changes what an agent drafting notes is
told. The probe drafts notes for an invented release from given backlog items, one of
them needing a step by hand and one a fix nobody would notice, and passes if the step is
in full, each change takes at most two sentences, and the unnoticeable fix is left out
and reported as dropped.

## Delivers

a-release-says-what-changed-briefly

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-brief-notes-build -b plan/a-release-says-what-changed-briefly origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body**; the commit touching `commands/release.md` states the
  fresh-agent check's outcome.
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Decisions

1. **Item 3 becomes one or two sentences per change**, as bullets under a heading such
   as "What you can now do", saying what the reader can now do; the how is a link to
   the document that holds it. Rejected: a word limit for the whole notes, which a long
   list of by-hand steps would break through no fault of the draft.
2. **Item 2 says its steps are written in full however short the rest is**, since they
   are followed literally (and `/update` does them).
3. **Item 4 keeps a small correction only where someone taking the release would notice
   it**, and every other fix goes under `Dropped:` in Stage 4, which already lists what
   the notes leave out.
4. **A closing reminder under *While writing*:** when a draft runs long, shorten the
   changes, never the steps.
5. **This repository's own `RELEASES.md` is not rewritten.** Past notes are the record of
   what was published; the next `/release` drafts in the new shape.

## Traps

- `commands/release.md` is the source; `.claude/commands/release.md` is not edited.
- The guard collapses whitespace before matching; a phrase it asserts must not be split
  by markdown emphasis.

## File Structure

| File | Change |
|---|---|
| `commands/release.md` | Stage 3, items 2–4 and *While writing* |
| `guards/release.test.js` | *the /release drafting stage*: the new phrases replace the two old ones |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-03-a-release-says-what-changed-briefly.md` | the handover report and the review record |

## Tasks

1. Change the guard's phrases and run it: it fails against the command as it stands.
2. Change Stage 3; the guard passes.
3. Run the fresh-agent check with its tool calls visible; record it in the commit body.
4. Move the item to `shipped`, write the handover report.
5. Send the branch to the fresh reviewer, who writes the review record.

## Handover report

Built by the specifying session, a Claude Code 2.1.317 cloud session; git 2.43.0, node
v22.23.4, Linux x86_64. Source worked from: none in particular; the wording is written
against this repository's own `commands/release.md`.

### Task completion

- Task 1: done. *The /release drafting stage* now asserts seven new phrases in place of
  the two old ones.
- Task 2: done. Stage 3 items 2–4 and a closing bullet under *While writing*.
- Task 3: done, on the third run; the wording changed twice between runs (below).
- Task 4: done.
- Task 5: the fresh reviewer's record follows.

### Verification results

- Guard, run on the working tree with the scratch script described in the restaged-notes
  plan's handover (copy to a temporary directory, jest there):
  `guards/release.test.js` with the change: `Tests: 83 passed, 83 total`; with
  `commands/release.md` stashed: the new phrases fail (`Tests: 6 failed, 76 passed, 82
  total` before the seventh phrase was added in the second round).
- Fresh-agent check: Claude Code 2.1.317 on Linux x86_64, `claude -p --model
  claude-sonnet-5-5 --output-format stream-json --verbose
  --disallowedTools=Bash,Edit,Write,NotebookEdit,Agent`, signed in to the developer's
  plan with no API key, in a scratch clone of this branch. The task: draft the notes for
  an invented shop with four shipped items — a price filter with several details, a
  payment interface change that needs a key added by hand, an internal log fix nobody
  outside hosting reads, and a mobile button colour administrators had reported.
  - Run 1: the step by hand was in full (four numbered sub-steps), the log fix was
    dropped and reported, the button fix kept; but the price filter took a bold lead and
    three sentences. **Fail on "at most two sentences".** The wording then said "Two
    sentences at most, a bold lead included".
  - Run 2: same, with the lead and two sentences on each change: the lead was still not
    counted. The wording then said "Two sentences at most, and a bold lead counts as one
    of them", with the detail (a setting, a default or an edge case) left to the linked
    document.
  - Run 3: each change a bold lead and one sentence ("**Let shoppers filter by price.**
    The search results page has a price slider, shown in the currency your shop is set
    to, so shoppers no longer have to scroll through every result."); the step in full;
    `Dropped: log-rotation-off-by-one, because only the hosting team reads those log
    files…`; and "I also left the slider's remembered position and whole-unit rounding
    out of the notes as detail the reader doesn't need to act on." **Pass.**
- `bash scripts/check-blueprint.sh`: run by the pull request's pipeline.

### Scope

`commands/release.md`, `guards/release.test.js`, `feature-catalog.yaml`,
`docs/backlog-board/bands.yaml` and this plan, all in *File Structure*. Worktree: the
sibling `../tropis-brief-notes-build`.

### Judgment calls

- The two-sentence limit counts a bold lead as a sentence; without that, the probe read
  the lead as a heading and wrote three.
- No word limit for the notes as a whole (Decision 1).

### What the plan got wrong

- Nothing found in the plan; the first wording was not tight enough, as the probe showed.

### Outstanding

- No screen. The next real `/release` draft is the developer's check.

## Review record

Reviewed by a fresh reviewer: Claude Code 2.1.317, model claude-sonnet-5-5, on Linux
x86_64 (`uname -sm`); git 2.43.0, node v22.23.4. It had only this repository and the
branch `plan/a-release-says-what-changed-briefly`, and did not write the change.

### Checks re-run

- `guard.sh . guards/release.test.js` (working tree copied to a temporary directory, jest
  there): `Tests: 83 passed, 83 total`.
- Re-broken: `commands/release.md` replaced with `origin/main`'s copy, same guard:
  `Tests: 7 failed, 76 passed, 83 total` (the seven new phrases). Restored from a backup
  copy; `git status --short` printed nothing afterwards.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 167 passed,
  167 total`.
- `git diff origin/main...HEAD --stat`: five files, all in the plan's File Structure.
- A search of the added lines for home paths, hostnames and email-like strings found
  nothing; no names appear. A search of the source folders for the two replaced phrases
  finds them only in `feature-catalog.yaml` (an older shipped item's description, a
  record), the plan, and the installed `.claude/commands/release.md`, which is the last
  release and not edited.
- Read the commit body: it records the probe's tool, version, model, OS and architecture
  and its three runs, and the doc closeout.

### Found

- **The wording is correct and consistent.** Item 2 keeps by-hand steps in full and says
  nothing below shortens them; item 3 sets one or two sentences, bold lead counted, how
  left to a link; item 4 keeps only a noticed correction and sends every other fix to
  `Dropped:`, which Stage 4's printed block already has ("each change left out of the
  notes, and why"). The *While writing* bullet agrees with item 3, and with the existing
  "Leave out a change that changes nothing for them". Nothing in Stage 4, Stage 5 or Step
  1 contradicts it. The section *Back to staging for a newer commit* is not on this
  branch (the plan it comes from, `release-notes-cover-a-restaged-commit`, has not
  landed, and this plan merges after it); its redraft "to Stage 3's shape" stays true
  either way. Each backlog criterion maps to wording and a guard phrase; criterion 4 maps
  to the commit body.
- **The guard is sound.** Each new phrase is a contiguous run in the source and is not
  split by emphasis (the bold ends after the phrase), whitespace collapses as before, and
  seven of the new assertions fail against the old command. No guard was lowered; two
  assertions were replaced by seven.
- **Cosmetic, not a defect:** in `commands/release.md` Stage 3 item 3, the line
  beginning "sentences at most, and a bold lead counts as one of them:** a detail such
  as a setting, a default or" runs to about 112 columns, where the rest wrap near 90. A
  re-wrap changes no guard result. Left as is; fix it in the next edit of that section.
- **Cosmetic:** the commit body says the third run had each change "in two" sentences;
  the handover report says one sentence and a bold lead. Both fit "at most two".
- **One judgment point, not a defect:** "the how is one link away, in the document that
  holds it" assumes a document to link to exists for the reader (a notes reader may only
  have the release page). The same instruction already says to check each path against
  where the reader has it, so a drafter has the cover it needs; no change.
- Mechanical defects needing a fix before merge: none.

### Outstanding disposition

- The next real `/release` draft is the developer's check (no screen). Nothing else
  outstanding. The cosmetic re-wrap above is dropped as not worth a commit of its own,
  with the reason given.

### Learnings routed

- No rule, decision or architecture change; the command is the durable place. Nothing for
  the upstream queue: this repository is the upstream, and the lesson (a probe must be
  told how a bold lead counts) is in the wording itself.

### Merged because

The change does what the backlog item's four criteria ask, the guard fails without it and
passes with it, the installed release's checks are green, the diff stays inside the plan's
files and holds no private material, and the fresh-agent check is recorded in the
commit body. The plan's merge authority is self-merge after this review; it still merges
after `release-notes-cover-a-restaged-commit`, as its header says, and the rebase onto
that plan's changes to `commands/release.md` and `guards/release.test.js` re-runs the
criteria then.

### Fixed after this record, by the author

The over-long line in Stage 3 item 3 is re-wrapped; no word changed, and the guard still
passes. Self-merged on the reviewer's recommendation, as the plan's merge authority says.
