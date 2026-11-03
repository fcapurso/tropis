# The README is a short overview, and stays short — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** the README's *What it does for you* covers five to seven aspects instead of
one bullet per feature, the whole page has a word limit it is under, and `/refresh-readme`
folds what ships into existing text and trims to stay under the limit, saying what it
cut.

**Backlog item:** `readme-gives-an-overview-not-a-feature-list` in `feature-catalog.yaml`
(type improvement), in the bundle `release-writing` of `docs/backlog-board/bands.yaml`.
There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — the README is a short overview, and
the command that keeps it keeps it short.

**What the specifying session verified on 2026-11-03, against `origin/main` at
`177c7ad` (git 2.43, Claude Code in a cloud session, Linux x86_64):**

- **The page today:** `README.md` is 2,107 words (`wc -w README.md`); *What it does for
  you* has 16 bullets, one per capability (the item's comment counted 17 before a hand
  cut).
- **Why it grows:** both outlines, `templates/readme-skeleton.md` and this repository's
  `docs/readme/skeleton.md`, give *What it does for you* the job "the outcomes someone
  gets, as outcomes, not a list of files" and the length "a short list". Nothing sets a
  length for the page. `commands/refresh-readme.md`, *At `writes`*, rewrites each
  out-of-date section whole and says nothing about trimming or folding.
- **What reads the outlines:** `guards/readme-usable.test.js` (the title, the fixed
  text, commands named, and *What it needs*); `scripts/set-up-project.sh` copies the
  template into a new project. No script parses a section's **Length** line.
- **The README exception:** a plan does not patch the product's README
  (`rules/planning.md`, *Before finalising the table*, item 5). This item's own criteria
  are about the page — five to seven bullets, a limit "every other section is cut to
  fit" — so the plan rewrites it, as the refresh the changed command describes would,
  and the reviewer judges the page against the outline.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is a page and a command's wording.
The reviewer runs on Claude Sonnet 5.5, the Large tier's first pick every Claude Code
subscription includes (`docs/model-picks.md`); `node .tropis/scripts/dispatch.mjs --tier
Large` names none in this cloud session, which records no subscription.

**Merge authority: self-merge after the fresh review.**

**Fresh-agent check: owed**, since `/refresh-readme` changes what an agent is told. The
probe is given an invented project's outline and a README one word under its limit, and
an invented feature that has shipped, and is asked for the refreshed *What it does for
you* and what it would cut; it passes if the feature joins an existing bullet, the bullet
count stays the same, and it names what it cut to stay under the limit.

## Delivers

readme-gives-an-overview-not-a-feature-list

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-readme-overview-build -b plan/readme-gives-an-overview-not-a-feature-list origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body**; the commit touching `commands/refresh-readme.md` states
  the fresh-agent check's outcome.
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Keep the fixed text under *What is Tropis?* word for word**, and every command and
  link the page keeps must exist.

## Decisions

1. **A fixed set of aspects, not features.** *What it does for you*'s job becomes an
   overview across five to seven aspects, one bullet each; a feature that ships joins
   its aspect's bullet. Length: five to seven bullets. In both outlines.
2. **The page limit is in the outline**, a line `**Page length:** at most 1,200 words`
   after the header comment, counted as `wc -w` counts, title and fixed text included.
   An outline without the line, copied by a project before it existed, gets 1,200.
   Rejected: a limit per section, which leaves the page's length the sum of many guesses;
   a limit in `docs/readme/readme.yaml`, which holds the level and refresh point, not the
   page's shape. 1,200 is a little over half today's page, which a reader takes in a few
   minutes.
3. **`/refresh-readme` replaces and folds, then trims.** At `writes`, what ships goes
   into the text that covers its part of the work; then the page is counted and cut
   until it is under, sections judged fine included, never the fixed text or a needed
   Getting started step; the report lists what was cut, section by section. At
   `suggests` it reports the count against the limit.
4. **This repository's README is rewritten to the new outline now**, to 1,115 words, with
   six aspects; `refreshedAt` is left as it is, since the page was not refreshed by the
   command.

## Traps

- `commands/refresh-readme.md` is the source; `.claude/commands/refresh-readme.md` is
  not edited.
- The fixed text is checked word for word by `guards/readme-usable.test.js`; copy it, do
  not retype it.

## File Structure

| File | Change |
|---|---|
| `README.md` | rewritten to the outline, under its limit |
| `templates/readme-skeleton.md` | the page-length line; *What it does for you*'s job and length |
| `docs/readme/skeleton.md` | the same |
| `commands/refresh-readme.md` | reading the limit; counting; replace and fold; trim and report |
| `guards/readme-usable.test.js` | the outlines' limit and aspects, the page's bullets and words, the command's phrases |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-03-readme-gives-an-overview-not-a-feature-list.md` | the handover report and the review record |

## Tasks

1. Add the guard's cases and run them: they fail against the repository as it stands.
2. Change the outlines and the command, and rewrite the page; the guard passes.
3. Run the fresh-agent check with its tool calls visible; record it in the commit body.
4. Move the item to `shipped`, write the handover report.
5. Send the branch to the fresh reviewer, who writes the review record.

## Handover report

Built by the specifying session, a Claude Code 2.1.317 cloud session; git 2.43.0, node
v22.23.4, Linux x86_64. Source worked from: none in particular; the page is rewritten
from this repository's own README, and the command against its own text.

### Task completion

- Task 1: done. Four cases in `guards/readme-usable.test.js`: both outlines set a page
  length and five to seven aspects; *What it does for you* has five to seven bullets; the
  page is within its outline's limit; `/refresh-readme` says to fold, keep the page under
  its limit and report what it cut.
- Task 2: done. Both outlines, the command, and `README.md` (2,107 → 1,115 words, 16 →
  6 bullets).
- Task 3: done, passed on the second run (below).
- Task 4: done.
- Task 5: the fresh reviewer's record follows.

### Verification results

- Guard on the working tree, with a scratch script that copies the tracked and untracked
  files into a temporary directory and runs jest there: `guards/readme-usable.test.js`
  with the change: `Tests: 8 passed, 8 total`. With `README.md`, both outlines and the
  command stashed: `Tests: 4 failed, 4 passed, 8 total`, the four new cases.
- `wc -w README.md`: `1115 README.md`, against a limit of 1,200.
- Fresh-agent check: Claude Code 2.1.317 on Linux x86_64, `claude -p --model
  claude-sonnet-5-5 --output-format stream-json --verbose
  --disallowedTools=Bash,Edit,Write,NotebookEdit,Agent`, signed in to the developer's
  plan with no API key, in a scratch clone of this branch. The task: refresh, at
  `writes`, an invented shop's README with five aspects after a price filter shipped,
  saying what it would write, the count, and its report. Its tool calls were reads of
  `commands/refresh-readme.md` and `templates/readme-skeleton.md`.
  - Run 1, limit 260 words, the page said to be 252: it folded the feature into the
    existing bullet ("The feature folds into the existing 'Sell from your own site'
    bullet … instead of getting a bullet of its own"), kept five bullets, counted 255
    against 260 and so cut nothing. Not a test of trimming: the page was not over.
  - Run 2, limit 240: it folded the feature the same way, cut words across *What it does
    for you*, *Who it is for*, *What it needs* and *How it works*, left Getting started
    whole ("No step was cut from Getting started"), and reported "What I cut to get under
    the limit" section by section. It also counted the given page by hand at 283 words,
    not the 252 the prompt claimed, and said "A real run recounts with `wc -w` and keeps
    cutting until it is under." **Pass.**
- `bash scripts/check-blueprint.sh`: run by the pull request's pipeline.

### Scope

`README.md`, `templates/readme-skeleton.md`, `docs/readme/skeleton.md`,
`commands/refresh-readme.md`, `guards/readme-usable.test.js`, `feature-catalog.yaml`,
`docs/backlog-board/bands.yaml` and this plan, all in *File Structure*. Worktree: the
sibling `../tropis-readme-overview-build`.

### Judgment calls

- The six aspects: one path from idea to merged change; knowing what to do next; rules
  and lessons reaching the agent; records that cannot go stale (the public-repository
  check folded in); a main branch that takes only checked changes (merges seen through,
  red noticed, parallel sessions folded in); releases you can take safely.
- Cut from the page, each still in the document it links to: the board's bands and
  grooming, the per-pull-request environment, the update path for a project without
  `/update`, `node .tropis/scripts/pipeline.mjs run`, the list of what works today
  (now "everything above"), and the links to `doc-architecture.md` and `bootstrap.md`
  under *Where to go next* (`bootstrap.md` stays linked from Getting started).
- `refreshedAt` is unchanged: the page was rewritten by hand to the new outline, not by
  the command.

### What the plan got wrong

- Nothing found.

### Outstanding

- The developer may want to read the page: it is what someone deciding on Tropis reads
  first. The next `/refresh-readme` is the live check of the command.
