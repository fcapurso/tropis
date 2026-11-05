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
