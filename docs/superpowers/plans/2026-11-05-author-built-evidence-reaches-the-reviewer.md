# Evidence for a plan its author built reaches the fresh reviewer — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** the planning rule's build-it-yourself shape tells the author to put every file
the handover rests on inside the checkout the fresh reviewer runs in, kept out of
commits, and to start the reviewer with the commands it re-runs permitted; and tells the
reviewer to stop, rather than write a record, when it cannot reach either.

**Backlog item:** `author-built-evidence-reaches-the-reviewer` in `feature-catalog.yaml`
(type feature). There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — a fresh reviewer of author-built work
can re-check the evidence and re-run the commands the work rests on.

**What the specifying session verified on 2026-11-05, against `origin/main` at
`770a494` (git 2.43, Claude Code 2.1.318 in a cloud session, Linux x86_64):**

- **The shape as it stands:** `rules/planning.md`, the bullet "**Do not rehearse the work
  to write its plan.**", says the fresh reviewer is "an agent with only the repository"
  that "reviews it as a reviewing session reviews a plan's work and writes the review
  record". Nothing says where the author's evidence goes or what the reviewer may run.
- **The evidence:** `docs/superpowers/plans/2026-11-04-rules-return-after-compaction.md`.
  Its probe and transcripts were kept in the session's scratchpad, outside the repository
  (*Shape*, "The probe is throwaway, in the session's scratchpad"). Its review record's
  *Learnings routed* says the first review run could not reach the evidence
  ("Evidence outside the reviewer's reach (the first review run)"); the second run was
  given uncommitted copies in an untracked `.review-evidence/` folder in its worktree
  (*Checks re-run*, *Scope*). That run's `npm --prefix .tropis test` and
  `bash scripts/check-blueprint.sh` "were refused by this session's permission settings
  ("This command requires approval")", so the handover's figures were left to the pull
  request's `pipeline / gate`.
- **Why the copies stay uncommitted:** the same record says "The raw transcripts do carry
  scratchpad paths and session ids, and stay uncommitted"; `.tropis/project.json` says
  `"public": true`, and `guards/private-material.test.js` refuses session ids and home
  paths in committed files.
- **The local exclude file is shared by worktrees:** `git rev-parse --git-common-dir`
  names the main repository's `.git` from a worktree, and git reads `info/exclude` there
  for every worktree, so one line keeps the folder out of `git add -A` in all of them
  without a committed `.gitignore` change.
- **The dispatch prompt does not cover this shape:** `framework/dispatch.md` and
  `commands/dispatch.md` describe handing a plan to an executor; author-built work is not
  dispatched, so the planning rule is the one place to say it. The band's *effortWhy*
  mentions the dispatch prompt; this plan does not change it, and says why here.
- **Guards:** no guard asserts the bullet's wording (`grep -rn "Do not rehearse" guards`
  prints nothing). `guards/rule-incidents.test.js` fails on a pointer to an incident
  section that does not exist and on a section nothing points at, so the new pointer and
  the new section in `rules/incidents/planning.md` land together.
- **Overlap:** the claim's overlap check is the record.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is the wording of one bullet, and
the fresh-agent check decides whether it works. The reviewer runs as a fresh subagent of
the cloud session, on Claude Opus 5.5 (`node .tropis/scripts/dispatch.mjs --tier Large`),
signed in to the developer's plan — and, as the new bullet asks, with the probe's stream
copied into `.review-evidence/` in its worktree, excluded locally, and with the checks it
re-runs permitted.

**Merge authority: self-merge after the fresh review,** by the delivering session.

**Fresh-agent check: owed**, since `rules/planning.md` changes what a plan's author is
told. The probe has only a scratch clone of the branch, with the source rule installed
where Claude Code delivers it (`.claude/rules/planning.md`, its `paths:` header kept), so
it receives the new text by touching a plan file, as a real author would. Its task is
invented: write the *Shape* section of a plan for an invented measurement whose
transcripts sit in a scratch directory outside the repository, saying how the fresh
reviewer will be started. It passes if it puts the evidence inside the reviewer's
checkout, kept out of commits, and starts the reviewer with the re-run commands
permitted.

## Delivers

author-built-evidence-reaches-the-reviewer

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-evidence-reach -b plan/author-built-evidence-reaches-the-reviewer origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body**; the commit touching `rules/planning.md` states the
  fresh-agent check's outcome, with tool, version, model, operating system and
  architecture.
- **This repository is public.** No home paths, hostnames, session ids, personal or
  computer names in a committed file; the probe's raw stream stays uncommitted.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Decisions

1. **A new bullet directly after *Do not rehearse the work to write its plan*,** since it
   is the second half of that shape. Rejected: lengthening that bullet, which is about
   choosing the shape, not running it.
2. **Inside the reviewer's checkout, excluded locally.** Rejected: committing the evidence
   (raw transcripts carry session ids and paths a public repository refuses); handing the
   reviewer absolute paths outside its checkout (that is what failed, and a reviewer
   confined to its working directory cannot open them); a committed `.gitignore` entry
   (a change to every project's tree for a folder that exists only during a review).
3. **The commands are named and permitted at start.** In Claude Code that is
   `--allowedTools` naming each command for a headless reviewer; a subagent inherits the
   session's permissions. Named as an example, as the workflow names `stream-json`.
4. **A command the host's required check runs before anything merges may be left to it**,
   saying so in the record: that is what the last review did, and it is sound, since the
   check runs on the same commit.
5. **A reviewer that cannot reach what it was given stops** and names it; the author puts
   it within reach and starts the review again. A record that reports "could not" for a
   measurement merges an unchecked measurement.
6. **The occasion goes in the incident record,** the mechanism in the rule, as
   `rules/incidents/README.md` asks.

## Traps

- `rules/planning.md` is the source; `.claude/rules/planning.md` is not edited in this
  checkout. The probe's scratch clone overwrites its own copy, which is thrown away.
- A path in backticks under `docs/`, `scripts/` or `.claude/` must exist, or
  `framework-integrity` fails: the new bullet names `.review-evidence/` and `info/exclude`
  only as examples outside those directories.

## File Structure

| File | Change |
|---|---|
| `rules/planning.md` | a bullet after *Do not rehearse the work to write its plan* |
| `rules/incidents/planning.md` | the section *Evidence the reviewer could not reach* |
| `feature-catalog.yaml` | the item shaped, building, then shipped |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-05-author-built-evidence-reaches-the-reviewer.md` | this plan, its handover report and review record |

## Tasks

1. Write the bullet and the incident section.
2. Commit, then run the fresh-agent check from a scratch clone of the branch with its
   tool calls visible; amend the commit body with the outcome.
3. Run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test` on the committed
   branch.
4. Move the item to `shipped`, write the handover report.
5. Copy the probe's stream into `.review-evidence/`, excluded locally, and send the branch
   to the fresh reviewer, who writes the review record.
6. Merge as the workflow's *Merging* says.

**Model tier: Large** (the author builds it).

## Handover report

Built by the specifying session, a Claude Code 2.1.318 cloud session; git 2.43.0, node
v22.23.4, Linux x86_64. Source worked from: none in particular; the wording is written
against this repository's own `rules/planning.md` and the review record it cites.

### Task completion

- Task 1: done. The bullet "**Put what the fresh reviewer re-checks within its reach
  before starting it.**" follows *Do not rehearse the work to write its plan*; the
  section *Evidence the reviewer could not reach* is in `rules/incidents/planning.md`.
- Task 2: done (below); the commit body records it.
- Task 3: done (below).
- Task 4: done; the item is `shipped`.
- Task 5: the probe's two streams and the self-check and suite output are in
  `.review-evidence/` in this worktree, excluded by `info/exclude` under
  `git rev-parse --git-common-dir`; the fresh reviewer's record follows.

### Verification results

- **Fresh-agent check:** Claude Code 2.1.318 on Linux x86_64, `claude -p --model
  claude-opus-5-5 --output-format stream-json --verbose --tools
  "Read,Grep,Glob,Write,Edit" --permission-mode acceptEdits`, signed in to the
  developer's plan (the stream's `apiKeySource` is `none`), in a scratch clone of the
  branch with `.claude/rules/planning.md` replaced by the source rule under its `paths:`
  header. No user-level instructions exist in this container. `dispatch.mjs --tier
  Large` names Claude Opus 5.5. The task: write the title, Goal and *Shape* of an
  invented spike (whether a hook's reply reaches an interrupted agent) whose three raw
  transcripts, carrying session ids, sit in a scratch directory outside the repository,
  saying exactly how the reviewer is prepared and started; the prompt named no folder,
  no exclude file and no flag.
  - **Run 1, inconclusive:** its calls included a `Read` of this plan (still in the
    clone), which describes the answer. It wrote the expected Shape, but a run that read
    the answer proves nothing about the rule.
  - **Run 2, pass:** this plan removed from the clone. Calls: `Grep` of
    `rules/planning.md` for `rehearse|reviewer|fresh agent|session id|## Shape` (its
    reply carries the new bullet), `Glob` of the plans, `Read` of `rules/planning.md`
    lines 55–114 (carries the bullet), `Grep`s and a `Read` of the compaction plan's
    *Shape*, a `Grep` of `.tropis/scripts/dispatch.mjs` for `--tier`, one `Write`. The
    Shape it wrote: `echo '/.review-evidence/' >> "$(git rev-parse
    --git-common-dir)/info/exclude"`, copies the three transcripts into
    `.review-evidence/`, checks `git status --porcelain` "still prints nothing: the
    folder is excluded", starts the reviewer with `--allowedTools` naming
    `Bash(bash scripts/check-blueprint.sh)` and `Bash(npm --prefix .tropis test)`, and
    tells it: "If you cannot open a file the handover rests on, or a command you need is
    refused, stop and name it instead of" writing the record.
- **Exclude file reaches every worktree:** in this build worktree, with an untracked
  `.review-evidence/x`, `git status --short` listed `?? .review-evidence/`; after one
  line in `/…/tropis/.git/info/exclude` (the common dir) it did not, here or in the claim
  worktree.
- `bash scripts/check-blueprint.sh` on commit `6080f6e`: "Self-check passed: every guard
  caught its defect, the clean baseline passed, and the framework repository's own
  guards passed.", exit 0.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 188 passed,
  188 total`.

### Scope

To be read from `git diff --stat origin/main...HEAD` once the claim has landed; the
files are the five in the File Structure table. Worktrees: `../tropis-evidence-reach`
(the claim) and `../tropis-evidence-reach-build` (this work, stacked on the claim and
rebased onto `main` after it lands).

### Judgment calls

- The shipped item's band is removed from `docs/backlog-board/bands.yaml`, as shipping
  `rules-return-after-compaction` removed its band, rather than its `seen.status`
  following it as the File Structure row says: the board reports a band for a shipped
  entry as stale.
- The dispatch prompt (named in the band's *effortWhy*) is not changed: author-built
  work is not dispatched.
- The probe received the rule by reading `rules/planning.md`, not as a loaded area
  rule: it searched the source rule first. The text it acted on is the new text either
  way.

### What the plan got wrong

- The bands row: removed, not followed (above).

### Outstanding

- Nothing.
