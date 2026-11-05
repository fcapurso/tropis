# The README describes the developer's part — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** the README outline gives *Using it day to day* the job of describing what the
developer does while sessions deliver the work, sprint first, and the README is refreshed
against it as a whole page.

**Backlog item:** `readme-follows-the-developers-role` in `feature-catalog.yaml` (type
improvement), in the bundle `readme-outline` of `docs/backlog-board/bands.yaml`, before
`readme-skeleton-for-closed-products`, which starts from the outline this plan writes.
There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — the README, and the outline it is
refreshed from, describe the developer's part as it is today.

**What the specifying session verified on 2026-11-05, against `origin/main` at `770a494`
(git 2.43.0, node v22.23.4, Claude Code 2.1.318 in a cloud session, Linux x86_64):**

- Both outlines, `templates/readme-skeleton.md` and `docs/readme/skeleton.md`, give
  *Using it day to day* the job "what someone does once it is set up: the commands they
  type and when", with facts from "the installed commands and scripts".
- `README.md`'s *Using it day to day* is five bullets of commands, among them
  "**`/dispatch`** hands a plan to an executing agent" and "**`/feature`** moves an item
  along `idea → shaped → building → shipped`"; `/sprint` is half a sentence in its second
  bullet. Under `.claude/framework/workflow.md`, *Delivering a backlog item*, a session
  shapes, plans, claims, dispatches, reviews and merges an item itself, and stops only
  for a judgement only the developer can make, a check only a person can perform, or
  work outside what was agreed; `commands/sprint.md` plans the sprint with the developer
  and starts one session per item or bundle.
- The page is 1,115 words (`wc -w README.md`) against the 1,200 its outline sets.
- `docs/readme/readme.yaml` is at `writes` with `refreshedAt` `04f677f…`; `npm --prefix
  .tropis run next` reports nine product features and improvements shipped since:
  version-check-tells-a-red-baseline, version-check-lists-ignore-lines,
  update-skips-a-new-file-that-matches, a-release-says-what-changed-briefly,
  readme-gives-an-overview-not-a-feature-list, large-tier-anchors-on-the-best-pick,
  picks-are-judged-at-the-default-effort, tier-falls-through-to-the-cheapest-included-pick,
  sprint-archives-a-session-once-it-ships.
- What reads the outlines: `guards/readme-usable.test.js`; `scripts/set-up-project.sh`
  copies the template into a new project. No script parses a section's **Job** line.
- The README exception (`rules/planning.md`, *Before finalising the table*, item 5): a
  plan does not patch the README. This item's criteria are about the page, so the plan
  runs the refresh `commands/refresh-readme.md` describes, at `writes`, against the new
  outline, and the refresh point moves with it.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is an outline's wording and a page
whose words are the result. The reviewer is a subagent of this session with only the
repository and the branch, on Claude Opus 5.5, the pick `node .tropis/scripts/dispatch.mjs
--tier Large` names, signed in to the developer's plan.

**Merge authority: self-merge after the fresh review.**

**Fresh-agent check: not owed.** The plan changes no file under `framework/`, `rules/` or
`commands/`; the outline is content `/refresh-readme` reads, and the refresh run on it is
this plan's own work, judged by the reviewer.

## Delivers

readme-follows-the-developers-role

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-readme-role-build -b plan/readme-follows-the-developers-role-build origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body.**
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Keep the fixed text under *What is Tropis?* word for word**, and every command and
  link the page names must exist.

## Decisions

1. **This repository's outline names the developer's part.** *Using it day to day*: what
   the developer does once Tropis is set up — captures ideas, agrees a sprint, answers
   when a session asks for a decision, checks by hand, releases — while sessions take
   each backlog item from shaping to merged on their own. A sprint is the main way to
   work, a single backlog item the same path taken one at a time. Commands a session runs
   for itself (`/dispatch`, `/feature`, `/capture-learning`) are not the developer's
   steps. Facts from the workflow's *Delivering a backlog item* and the commands the
   developer runs.
2. **The default outline says the reader's part, generically.** Its job becomes what
   someone does once it is set up, around the part they play: what they decide, do and
   check, and when, naming the commands that serve each, not a list of every command.
   It stays product-neutral: an adopter's product has no sprints.
3. **One whole-page refresh, at `writes`, follows the outline.** It takes in the nine
   items shipped since `04f677f`, folds rather than adds, stays under 1,200 words, and
   sets `refreshedAt` to the `HEAD` it was refreshed against, as the command says. The
   developer's yes the command asks for is given by this sprint's agreement; the
   reviewer reads the page in its place.
4. **The guard pins the job and the page.** `guards/readme-usable.test.js` gains: both
   outlines' *Using it day to day* jobs (this repository's names the sprint and the
   decision; the template's says "the part they play"); the page's *Using it day to day*
   names `/sprint` before any other command and names neither `/dispatch` nor `/feature`.

## Traps

- The fixed text is checked word for word by `guards/readme-usable.test.js`; copy it, do
  not retype it.
- `refreshedAt` is the commit the page was refreshed against, written in double quotes;
  it is not the commit that carries the refresh.
- The installed `npm --prefix .tropis test` does not run the source guard; run the
  changed guard from a scratch copy of the working tree, as the predecessor plan did.

## File Structure

| File | Change |
|---|---|
| `docs/readme/skeleton.md` | *Using it day to day*'s job and facts |
| `templates/readme-skeleton.md` | *Using it day to day*'s job and facts, product-neutral |
| `README.md` | refreshed as a whole page against the outline |
| `docs/readme/readme.yaml` | `refreshedAt` set to the commit refreshed against |
| `guards/readme-usable.test.js` | the outlines' jobs and the page's day-to-day section |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-05-readme-follows-the-developers-role.md` | the handover report and the review record |

## Tasks

1. Add the guard's cases and run them: they fail against the repository as it stands.
2. Change both outlines; refresh the page against this repository's outline; set
   `refreshedAt`. The guard passes, the page is within its limit.
3. Move the item to `shipped`, write the handover report.
4. Send the branch to the fresh reviewer, who writes the review record.

## Handover report

Built by the specifying session, a Claude Code 2.1.318 cloud session; git 2.43.0, node
v22.23.4, Linux x86_64. Source worked from: none in particular; the outline is rewritten
from this repository's own workflow and commands, and the page from its own README.

### Task completion

- Task 1: done. Three cases in `guards/readme-usable.test.js`: the default outline's
  *Using it day to day* job says "the part they play" and no longer "the commands they
  type"; this repository's names the developer's part, sprint first; the page's
  *Using it day to day* names `/sprint` first and neither `/dispatch` nor `/feature`.
- Task 2: done. Both outlines; `README.md` refreshed against this repository's outline
  (1,115 → 1,190 words, limit 1,200); `refreshedAt` set to the `origin/main` commit the
  page was refreshed against, once the claim had merged.
- Task 3: done.
- Task 4: the fresh reviewer's record follows.

### Verification results

- Guard on the working tree, with a scratch script that copies the tracked and untracked
  files into a temporary directory and runs jest there with `"type": "module"`:
  `guards/readme-usable.test.js` with the change: `Tests: 11 passed, 11 total`. With
  `README.md` and both outlines stashed: `Tests: 3 failed, 8 passed, 11 total`, the
  three new cases.
- `wc -w README.md`: `1190 README.md`, against a limit of 1,200.
- `npm --prefix .tropis test`: run again after the report's commit, below the review.
- `bash scripts/check-blueprint.sh`: run by the pull request's pipeline.

### Scope

`README.md`, `templates/readme-skeleton.md`, `docs/readme/skeleton.md`,
`docs/readme/readme.yaml`, `guards/readme-usable.test.js`, `feature-catalog.yaml`,
`docs/backlog-board/bands.yaml` and this plan, all in *File Structure*. Worktree: the
sibling `../tropis-readme-role-build`.

### Judgment calls

- **The refresh, section by section.** *What it does for you*: the first bullet becomes
  "Sprints that deliver themselves" and takes in the tier fall-through (the cheapest
  included model that can do the work); the release bullet takes in
  a-release-says-what-changed-briefly. *How it works*: the roles now include the
  shaping session, a fresh reviewer, and the session merging once checks pass, with the
  developer trying anything with a screen. *Using it day to day*: rewritten as five
  bullets, sprint first, then answering when asked, capturing ideas, one item at a time,
  release and update. The opening, the fixed text, *Who it is for*, *What it needs*,
  *Getting started* and *Where to go next* were judged fine.
- **Folded without words of their own**, as detail the linked documents hold: the two
  version-check items, update-skips-a-new-file-that-matches (all under "says whether a
  release is safe"), large-tier-anchors-on-the-best-pick and
  picks-are-judged-at-the-default-effort (under the model the work runs on), and
  sprint-archives-a-session-once-it-ships.
- **Cut to stay under the limit:** `/refresh-board`, `/capture-learning`, `/dispatch`
  and `/feature` from *Using it day to day* (sessions run them); the board's file path
  there (the aspect bullet names the page); "Tropis is developed with its own last
  release installed" from *Where it stands*.
- **The default outline stays product-neutral**: an adopter's product has no sprints, so
  its job speaks of "the part they play" and what the product does on its own.

### What the plan got wrong

- Nothing found.

### Outstanding

- The developer may want to read the page. The next real `/refresh-readme` against the
  new outline is the live check of the outline.

## Review record

Reviewed on 2026-11-05 by a fresh reviewer: a Claude Code 2.1.318 subagent on Claude
Opus 5.5, with only the repository and the branch; git 2.43.0, node v22.23.4, Linux
x86_64. It did not write the change.

### Checks re-run

- The changed guard on a scratch copy of the working tree (the handover's script):
  `guards/readme-usable.test.js` gives `Tests: 11 passed, 11 total`.
- Re-broken: with `origin/main`'s `README.md`, `docs/readme/skeleton.md` and
  `templates/readme-skeleton.md` checked out, `Tests: 3 failed, 8 passed, 11 total`, the
  three new cases by name (*the default outline gives Using it day to day the reader's
  part…*, *this repository's outline gives Using it day to day the developer's part,
  sprint first*, *Using it day to day shows /sprint first and not /dispatch or
  /feature*). Restored with `git checkout HEAD --`; `git status --short` printed nothing.
- `wc -w README.md`: `1190 README.md`, against 1,200.
- `npm --prefix .tropis test`: `Test Suites: 13 passed`, `Tests: 189 passed, 189 total`.
- `bash scripts/check-blueprint.sh` on the branch's `HEAD`: `Self-check passed: every
  guard caught its defect, the clean baseline passed, and the framework repository's own
  guards passed.`
- `git diff --stat origin/main...HEAD`: eight files, exactly the *File Structure* table.
- `refreshedAt` is `3140469c…`, which is `origin/main`'s `HEAD` and the branch's base,
  the claim's merge: the commit the page was refreshed against, in double quotes.
- The shipped items since `04f677f`, by comparing `feature-catalog.yaml` at that commit
  and at `3140469`: 21 shipped since, of which exactly the nine features and
  improvements the plan names; the rest are bugs and spikes, which *What it does for
  you* does not take facts from.
- Every command the page names is under `commands/`; every link resolves.

### Found

- **Public exposure:** none. The diff names no person, computer, home path, hostname or
  other project; the self-check's private-material guard passed on the full copy of
  `HEAD`.
- **One claim on the page reads wrong against the workflow (wording, not fixed).** *How
  it works* says "Three agent roles carry each change: a session that shapes … and writes
  a self-contained plan, an agent that carries it out …, and a reviewer with none of the
  author's context. The session merges once the checks pass". Under `framework/workflow.md`,
  *Delivering a backlog item* step 3, and `rules/planning.md`, *Who reviews*, the
  reviewer is the session that shaped and planned the item, not a third party; a reviewer
  "with none of the author's context" is the exception for a change built by its author
  (as this plan was). Read as "none of the executor's context" it holds, but a newcomer
  will read three separate sessions. Suggested wording: "…an agent that carries it out in
  a worktree of its own, and the planning session again, which reviews the branch and
  merges it once the checks pass. You try anything with a screen before it merges." Not
  blocking: the fixed text and the rest of the page agree with the workflow, and the
  sentence spans more than one line, so it is left to the author.
- The rest of the page checks out against the repository: `/sprint` proposes from the top
  of `/next`'s ranking (`inRankOrder` in `scripts/sprint.mjs`), the developer adds, drops
  and reorders and says start, `status` shows where each stands; a session stops for the
  three things *Delivering a backlog item* names; a plan runs on the cheapest included
  model in its tier or above (tier-falls-through-to-the-cheapest-included-pick); a
  release's notes are brief on what changed and full on the steps by hand
  (a-release-says-what-changed-briefly).
- The refresh folded rather than added: *What it does for you* keeps six bullets, its
  first rewritten in place; *Using it day to day* replaces the command list. The fixed
  text matches the outline word for word (its guard passes).
- The default outline stays product-neutral: no sprint, no Tropis command, only "the part
  they play" and what the product does on its own.
- The handover's judgment calls hold: the bugs and spikes since the refresh point are not
  facts for *What it does for you*; the cuts are listed; `/manual-check` is named as the
  developer's because the developer runs the check it sets out, though the session starts
  it. The diagnosis "no script parses a section's **Job** line" holds: only the guard and
  `/refresh-readme`'s prose read the outline, and `scripts/set-up-project.sh` copies it.
- Observation, not a defect: *Getting started* step 3 still ends "to your first plan",
  which leans on the developer planning; it was judged fine and is true for a first item
  started by hand.

### Outstanding disposition

- The *How it works* wording above: the author's call before merge, or the next
  `/refresh-readme`. Recommended now, as a one-sentence edit.
- The developer has not read the page; the refresh's yes was given by the sprint's
  agreement, as the plan says. No screen: no `/manual-check` owed.

### Learnings routed

- No durable change: the one finding is a wording slip on the page, and the outline's job
  already names where the facts come from.

### Merged because

Fit to merge: each of the four criteria is backed by a guard case that fails on
`origin/main`'s files and passes on the branch, the page is within its limit, its refresh
point is the commit it was refreshed against, the self-check and the installed checks
pass, and the diff is the plan's file list. The one wording finding does not make any
criterion untrue.
