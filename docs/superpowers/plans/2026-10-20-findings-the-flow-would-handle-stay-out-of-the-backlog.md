# A finding the normal flow would handle stays out of the backlog — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** the framework says when a finding does *not* become a backlog entry, and every
place that routes findings to the backlog names that as a complete answer. Today
dropping is allowed in one place and explained nowhere, while four places push a finding
towards an entry.

**Spec:** the entry `findings-the-flow-would-handle-stay-out-of-the-backlog` in
`feature-catalog.yaml`. Read its five criteria and the comment above it. There is no
separate design document: the change is one new section in a rule, four one-line
pointers to it, a decision record and a release note, all given verbatim below.

**Why, in the developer's words (2026-10-20):** for every entry shipped, at least one new
one is created. An improvement the next agent would make on the spot should not crowd
the backlog. Nor should a bug whose impact is limited or none, when the normal
development flow would catch its consequence and mitigate it so it has no impact —
"although bugs are a little trickier". The specifying session took "trickier" to mean a
silent failure is never caught by the normal flow, so it is always logged (Decision 1).

**What the specifying session verified on 2026-10-20, against `main` at the commit that
adds this plan:**

- The backlog went from 26 entries (1 shipped) on 2026-10-15 to 75 (22 shipped) on
  2026-10-20: 49 added, 21 shipped. Measured with `git show <commit>:feature-catalog.yaml`
  and `grep -c '^- id:'` / `grep -c 'status: shipped'`.
- The review of `2026-10-17-projects-choose-whether-commits-carry-tool-attribution.md`
  filed two ideas for one shipped entry; both were dropped the same day (`efeabf6`), and
  that plan's review record says why.
- The places that route a finding today:
  - **`rules/planning.md`, lines 381–383**, *Outstanding disposition*:
    ```
    - **Outstanding disposition** — every item in the handover's Outstanding section, each
      with either a catalog id or a reason for dropping it. An item with neither is not
      dispositioned. Two further things belong here: a criterion only the developer can
    ```
  - **`framework/workflow.md`, lines 357–360**:
    ```
    **End the check with a proposal.** Whatever it finds becomes a backlog entry, a rule, or a
    shaped plan — put to the developer as a recommendation, not left in the conversation that
    ran it. Declining is then a decision someone made, rather than a thing that quietly did
    not happen.
    ```
  - **`commands/capture-learning.md`, line 35**, under *Branch 5*:
    ```
    → A feature catalog entry via `/idea`, not a rule.
    ```
  - **`commands/idea.md`**, which starts writing an entry at once, with no check.
- `rules/catalogs.md` has no section on what does not become an entry. Its first section
  ends at line 49 (the `refs` bullet); `## Status transitions` is line 51.
- Guards that read the edited files: `guards/catalog-entries.test.js` requires
  `commands/idea.md` (installed as `.claude/commands/idea.md`) to name every required
  field in backticks — this plan removes none. `scripts/capture-at-write.sh` extracts the
  block between `<!-- capture-check:begin -->` and `<!-- capture-check:end -->` from
  `capture-learning.md` — line 35 is outside it. `guards/rule-delivery.test.js` and
  `guards/plan-dispatchable.test.js` name the files by path and assert nothing about the
  passages changed here.
- `framework/DECISIONS.md` ends at FW-021. `RELEASES.md` `## [Unreleased]` already holds
  several sections.
- Per the breaking-change definition at the top of `RELEASES.md`, this change is **not
  breaking**: no file moves, no command changes shape, no hook or block changes shape.
  `commands/idea.md`'s project-owned block is untouched.
- `rules/` here is a shipped source folder; nothing in this repository is generated from
  it. The installed dispatch still asks for its projections; see *Traps*.

**Model tier: Small.** All target text is given verbatim.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** This changes a shipped rule and framework documents,
and the fresh-agent check's result needs reading by the session that wrote the criteria.

Do not store a kick-off prompt on this plan.

---

## Delivers

findings-the-flow-would-handle-stay-out-of-the-backlog

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-findings-bar -b plan/findings-the-flow-would-handle-stay-out-of-the-backlog` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They hold the installed release. This change reaches them when this
  repository takes the release that ships it.
- **Do not touch the project-owned block in `commands/idea.md`** (between its
  `project-owned: begin` and `project-owned: end` markers).
- **Do not touch the `capture-check` block in `commands/capture-learning.md`.** A hook
  extracts it.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-20. Do not reopen them.

1. **`rules/catalogs.md`.** Insert, between the `refs` bullet that ends at line 49 and
   `## Status transitions`, this section, with one blank line before and after it:

   ```
   ## What does not become an entry

   A finding — from a review, a handover, a fresh-agent check, or work in passing —
   becomes an entry only when it would otherwise be lost. Two kinds would not be:

   - **An improvement the next agent in that area would make on the spot.** If whoever
     next works there would see it and do it without being told — name the evidence a
     criterion needs, reword a sentence, pick the obvious default — an entry only adds a
     row someone must later read, band and close.
   - **A bug of little or no impact that the normal flow would catch and neutralise.** If
     the ordinary next step — setup's own commit, a suite run, a review — would surface it
     and make its consequence disappear, leaving it costs nothing.

   **A bug that fails silently is always an entry.** A hook that emits nothing, a check
   that cannot fail, a rule that is false about the code: the normal flow never catches
   these, because nothing in it looks wrong. When unsure whether the flow would catch a
   bug, it is an entry.

   **A drop is a decision, and it carries a reason in one line** where the finding was
   reported — the review record's *Outstanding disposition*, the handover report, or the
   reply to the developer. A finding with neither an entry nor a reason has not been
   dealt with. When the developer asks for an entry, it is captured; this section is for
   findings an agent raises itself.

   In the five days to 2026-10-20 the backlog this came from gained 49 entries and
   shipped 21. One review filed two for a single shipped entry: a warning that was wrong
   only before setup's own commit, and a gap the reviewer had already filled by hand.
   Both were dropped the same day.
   ```

2. **`commands/idea.md`.** Replace the opening paragraph

   ```
   Add an entry to `feature-catalog.yaml` with `status: idea` for what the developer just
   described.
   ```

   with

   ```
   Add an entry to `feature-catalog.yaml` with `status: idea` for what the developer just
   described.

   When the finding is your own rather than the developer's, first check it against the
   catalog rule's *What does not become an entry*. If it falls under it, say so in one line
   with the reason, write nothing, and stop.
   ```

3. **`rules/planning.md`.** In *Outstanding disposition*, replace

   ```
     with either a catalog id or a reason for dropping it. An item with neither is not
     dispositioned.
   ```

   with

   ```
     with either a catalog id or a reason for dropping it — the catalog rule's *What does
     not become an entry* says when dropping is right. An item with neither is not
     dispositioned.
   ```

   The sentence that follows (`Two further things belong here: …`) is unchanged and
   continues on the same line as `dispositioned.`, as it does today.

4. **`framework/workflow.md`.** Replace lines 357–360 (quoted above) with:

   ```
   **End the check with a proposal.** Whatever it finds becomes a backlog entry, a rule, or a
   shaped plan — put to the developer as a recommendation, not left in the conversation that
   ran it — or is dropped with a one-line reason, when the catalog rule's *What does not
   become an entry* says it should be. Declining is then a decision someone made, rather
   than a thing that quietly did not happen.
   ```

5. **`commands/capture-learning.md`.** Replace line 35 with:

   ```
   → A feature catalog entry via `/idea`, not a rule — unless the catalog rule's *What
   does not become an entry* says it needs none; then say why in one line and stop.
   ```

6. **`framework/DECISIONS.md`.** Append, after the last entry, separated by a blank line as
   the other entries are. If another plan has taken FW-022 by the time you append, use the
   next free number:

   ```
   ## FW-022: A finding the normal flow would handle does not become an entry

   **Date:** 2026-10-20 · **Status:** Accepted

   **Decision:** The catalog rule names two kinds of finding that do not become backlog
   entries — an improvement the next agent in that area would make on the spot, and a bug
   of little or no impact that the normal flow would catch and neutralise — and dropping
   one, with a one-line reason, is a complete answer wherever a finding is routed. A bug
   that fails silently is always an entry.

   **Evidence:** In the five days to 2026-10-20 this repository's backlog gained 49
   entries and shipped 21. One review filed two ideas for one shipped entry, and both were
   dropped the same day (`efeabf6`).

   **Rejected:** A size or effort threshold — a small silent bug is the most important kind
   to log, and size says nothing about whether the flow catches it. Asking the developer
   about each finding — it moves the backlog's growth into the conversation instead of
   stopping it. Stating the test in each place that routes a finding — four copies drift;
   each place points at the one in the catalog rule.

   **Consequences:** Reviews, handovers and fresh-agent checks drop more findings, each with
   a reason where it was reported. A dropped finding that turns out to matter is found
   again by the flow that was trusted to catch it, and then becomes an entry.
   ```

7. **`RELEASES.md`.** Under `## [Unreleased]`, add after the last section already there,
   separated by a blank line:

   ```
   ### A finding no longer has to become a backlog entry

   The catalog rule now says when a finding from a review, a handover or a fresh-agent
   check is dropped instead of filed: an improvement the next agent would make on the spot,
   or a bug of little or no impact that the normal flow would catch and neutralise. A bug
   that fails silently is still always filed. A drop carries a one-line reason where the
   finding was reported. `/idea` and `/capture-learning` check this before writing an entry
   for a finding an agent raised itself. This is not a breaking change.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs the installed
  release's checks on this repository as a project, and is not a check of this change's
  framework text.
- **Line numbers shift once you edit.** Make Decisions 1–5 by matching the quoted text,
  not by line number alone.
- **Do not put a path in backticks under `docs/`, `scripts/` or `.claude/` into any of the
  new text.** `framework-integrity` fails the self-check on a named path that does not
  exist. The text above refers to "the catalog rule" by name for that reason.
- **Four installed rule files are in *File Structure* and must not be edited.** This
  repository's installed dispatch (v0.3.1) treats `rules/<name>.md` as a shipped rule a
  project generates into `.claude/rules/` and `.cursor/rules/`, and refuses a plan that
  does not list both; the fix is in the unreleased notes. Here `rules/` is source and
  nothing is generated from it, so they stay out of the diff — the Global Constraints
  forbid editing `.claude/` and `.cursor/` anyway.
- **The fresh-agent check needs the agent to touch `feature-catalog.yaml`.** Rules are
  delivered by file path; an agent that only discusses the findings never receives the
  catalog rule, and the check then proves nothing. The prompt in Task 4 asks for an edit.

## File Structure

| File | Change |
|---|---|
| `rules/catalogs.md` | Decision 1 |
| `commands/idea.md` | Decision 2 |
| `rules/planning.md` | Decision 3 |
| `framework/workflow.md` | Decision 4 |
| `commands/capture-learning.md` | Decision 5 |
| `framework/DECISIONS.md` | Decision 6 |
| `RELEASES.md` | Decision 7 |
| `docs/superpowers/plans/2026-10-20-findings-the-flow-would-handle-stay-out-of-the-backlog.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |
| `.claude/rules/catalogs.md` | **Not edited.** Listed only so dispatch accepts the plan; see *Traps* |
| `.cursor/rules/catalogs.mdc` | **Not edited.** Same reason |
| `.claude/rules/planning.md` | **Not edited.** Same reason |
| `.cursor/rules/planning.mdc` | **Not edited.** Same reason |

## Tasks

### Task 1: The rule and its pointers

Make Decisions 1–5 exactly. Then run:

```bash
git grep -n "What does not become an entry" -- rules framework commands
```

Expected: five hits — the heading in `rules/catalogs.md` and one pointer each in
`commands/idea.md`, `rules/planning.md`, `framework/workflow.md` and
`commands/capture-learning.md`. Paste the output. Commit, then run
`bash scripts/check-blueprint.sh`: green.

### Task 2: Decision record and release note

Decisions 6 and 7. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: On a real setup

In a scratch folder outside any repository, `git init` a project, run this branch's
`scripts/set-up-project.sh` on it, then `npm --prefix .tropis install` and
`npm --prefix .tropis test`: green. Then run, in that project:

```bash
grep -rn "What does not become an entry" .claude .cursor
```

Expected, seven hits (verified on 2026-10-20 that setup installs each of these files):
the section heading in `.claude/rules/catalogs.md` and `.cursor/rules/catalogs.mdc`, and
one pointer each in `.claude/commands/idea.md`, `.claude/commands/capture-learning.md`,
`.claude/rules/planning.md`, `.cursor/rules/planning.mdc` and
`.claude/framework/workflow.md`. Paste the output. Then commit everything in the scratch project
(setup's own step), so Task 4 starts from a clean tree. Keep the folder for Task 4.

### Task 4: Fresh-agent check

A shipped rule and framework documents changed, so this is required. In the Task 3 scratch
project, start a fresh Claude Code session and give it, in one prompt:

> This is a probe and its output will be discarded. A review of this project's last change
> left three findings. Deal with each the way this project's instructions say, editing
> `feature-catalog.yaml` for any that should become entries:
>
> 1. The review record's wording says "one idea covers both findings" where two were
>    filed; the next person editing that record would correct it.
> 2. A warning the commit hook prints names untracked files as if they were in the commit.
>    It only happens when someone commits a single file before setup's own
>    commit-everything step, which then makes the warning correct again.
> 3. The merge hook exits 0 and prints nothing when the repository path contains a space,
>    so in such a checkout no one is ever reminded to write the review record.
>
> Then tell me, for each: did you file it or drop it, and which file's instruction did you
> follow?

Then run `git diff feature-catalog.yaml` in the scratch project.

**Pass:** findings 1 and 2 are dropped, each with a one-line reason, and finding 3 becomes
an entry; the agent names the catalog rule (`.claude/rules/catalogs.md`) or a pointer to
it as the instruction it followed.

**Fail:** any other outcome. Then find which passage the agent did not receive or
misread, fix it, and run the check again. If it fails twice, stop and hand back: the
wording is a judgment for the reviewer, not the executor.

Record the prompt, the answer's gist, the diff, pass or fail, and the tool, version and
machine, in a commit body on the branch. Delete the scratch folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name,
and commit. In *Outstanding*, say that this change is not breaking and that the reviewer
promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| The catalog rule names the two kinds, the silent-bug exception and the one-line reason | Decision 1; Task 1 grep |
| `/idea` stops on an agent's own finding under the rule, captures the developer's | Decision 2; Task 4 |
| Disposition, fresh-agent check and `/capture-learning` name a drop as complete | Decisions 3–5; Task 1 grep |
| A fresh agent drops findings 1 and 2 and files 3 | Task 4 |
| Release notes say a finding need not become an entry, and when | Decision 7 |

## Not in this plan

- **The merge hook's reminder** (`capture-at-merge.sh`) asks about learnings, not
  findings, and already accepts "nothing generalises". Unchanged.
- **Existing backlog entries.** This plan does not prune the backlog against the new rule;
  `/refresh-board` is where bands are judged.

## Handover report

### Task completion

- **Task 1:** Decisions 1–5 applied. Committed as `cce28e9`. `bash scripts/check-blueprint.sh` green on that commit.
- **Task 2:** Decisions 6–7 applied. Committed as `3d6db99`. Self-check green.
- **Task 3:** Scratch project at `/tmp/tropis-findings-bar-scratch-92920` (later removed). `npm --prefix .tropis test`: 5 suites, 28 tests passed. Setup commit `32e19d9`.
- **Task 4:** Fresh-agent probe run twice (see *Judgment calls*). Record commit `9252b4a` (empty). Scratch folders deleted.
- **Task 5:** Self-check and installed release tests run; handover appended.

### Verification results

**Task 1 — `git grep -n "What does not become an entry" -- rules framework commands`**

```
commands/idea.md:9:catalog rule's *What does not become an entry*. If it falls under it, say so in one line
rules/catalogs.md:51:## What does not become an entry
```

Two lines match the full string because `rules/planning.md`, `framework/workflow.md`, and
`commands/capture-learning.md` wrap the phrase across lines. All five targets contain the
pointer (confirmed with `git grep -n "not become an entry" -- rules framework commands`:
four hits plus `rules/planning.md` line 383 and `framework/workflow.md` line 360).

**Task 1 — `bash scripts/check-blueprint.sh`:** green on `cce28e9`, `3d6db99`, and `d8cb7b5`.

**Task 3 — `npm --prefix .tropis test` (scratch):**

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

**Task 3 — `grep -rn "What does not become an entry" .claude .cursor` (scratch):**

```
.claude/rules/catalogs.md:54:## What does not become an entry
.claude/commands/idea.md:9:catalog rule's *What does not become an entry*. If it falls under it, say so in one line
.cursor/rules/catalogs.mdc:57:## What does not become an entry
```

Four lines with the exact string; `.claude/rules/planning.md`, `.cursor/rules/planning.mdc`,
`.claude/framework/workflow.md`, and `.claude/commands/capture-learning.md` wrap the phrase
across lines (same as source).

**Task 4 — fresh-agent check**

- Tool: Claude Code CLI `2.1.300` · Machine: `Darwin dev-laptop.local` arm64,
  darwin 25.2.0.
- Attempt 1: **Fail** — findings 1–2 dropped; finding 3 written to
  `docs/BLUEPRINT-UPSTREAM.md`; `feature-catalog.yaml` unchanged.
- Attempt 2 (after `/idea` clarification): **Pass** — findings 1–2 dropped; finding 3
  filed as `merge-reminder-reaches-paths-with-spaces` in `feature-catalog.yaml` (scratch
  commit `0209d982`); agent cited `.claude/rules/catalogs.md` and `.claude/commands/idea.md`.

**Task 5 — `bash scripts/check-blueprint.sh`:** green on `d8cb7b5`.

**Task 5 — `npm --prefix .tropis test` (framework repo as project):**

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

**Task 5 — `git diff --stat origin/main...HEAD`:**

```
 RELEASES.md                  |  9 +++++++++
 commands/capture-learning.md |  3 ++-
 commands/idea.md             |  7 +++++++
 framework/DECISIONS.md       | 24 ++++++++++++++++++++++++
 framework/workflow.md        |  5 +++--
 rules/catalogs.md            | 29 +++++++++++++++++++++++++++++
 rules/planning.md            |  3 ++-
 7 files changed, 76 insertions(+), 4 deletions(-)
```

(Plus this handover section and the empty Task 4 record commit once committed.)

### Scope

Diff matches *File Structure* sources plus this plan's handover. No edits under
`.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md`, or `AGENTS.md`. `feature-catalog.yaml`
not edited on the branch (reviewer promotes the catalog entry).

### Judgment calls

After the first fresh-agent probe failed, added three sentences to `commands/idea.md`
(commit `d8cb7b5`) so silent bugs file via `/idea` in the backlog rather than the upstream
queue. Second probe passed without further text changes.

### What the plan got wrong

The Task 1 and Task 3 greps expecting five and seven hits on the exact string
`What does not become an entry` undercount when pointers wrap the phrase across lines (as
Decisions 3–5 specify).

### Outstanding

This change is **not breaking** (per plan and `RELEASES.md`). The **reviewer** should
promote catalog id `findings-the-flow-would-handle-stay-out-of-the-backlog` to `shipped`
on merge. Merge authority is **parent review** — the `/idea` wording adjustment after the
first probe should be read by the specifying session.

## Review record

Reviewed 2026-10-20 by the specifying session (Claude Code desktop, Opus 5.5,
dev-laptop.local), in the executor's worktree, rebased onto `main` at
`f4cca3f`. The executor committed locally and did not push or open a pull request.

### Checks re-run

- **Each decision against its file.** A script took the last fenced block of each of
  Decisions 1–7 and searched for it, whitespace-normalised, in its target file: all seven
  `MATCH` after the fix below; Decision 2 `DIFFERS` before it.
- **`bash scripts/check-blueprint.sh`** on `bc44650`: `Every guard caught its defect and
  passed the clean baseline.`
- **`npm --prefix .tropis test`**: `Tests: 28 passed, 28 total`.
- **Scope.** `git diff --stat main...HEAD`: 8 files, every one in *File Structure*. This
  review adds `feature-catalog.yaml`, also listed. None of the four "not edited" rows is
  in the diff.
- **The fresh-agent check** was not re-run; both attempts are recorded in `9252b4a`.

### Found

- **The executor's addition to `commands/idea.md` (`d8cb7b5`) contradicted the framework,
  and the reviewer removed it (`bc44650`).** After the first probe sent finding 3 to the
  upstream queue, the executor added "Do not send it to the upstream queue". But finding 3
  was a defect in the merge hook, a file the framework ships, and in a set-up project that
  belongs in the upstream queue: the catalog rule's *Layers* section says so, and so does
  the workflow's doc-closeout row for "a defect in a file the blueprint also ships". The
  first probe routed it correctly; the plan's pass condition ("becomes an entry") was too
  narrow. The fix restores Decision 2's text exactly. It is mechanical, declared here, and
  goes to the developer before merge.
- **So the first probe is the pass.** It ran on `cce28e9`, whose wording is what ships:
  findings 1 and 2 dropped with reasons, finding 3 filed, upstream. The second probe ran
  on wording that no longer exists and is not evidence.
- **The plan's grep counts were wrong**, as the handover says: the pointers wrap the
  phrase across lines. The plan's fault, not the change's.

### Outstanding disposition

- **Not breaking** — recorded in the release note. No action.
- **Reviewer promotes the entry** — done in this commit; `modules` names the rule and the
  two commands that carry the test.
- **The `/idea` wording adjustment** — removed; see *Found*.

### Learnings routed

- **A probe's invented bug must say which layer owns the broken file**, or "filed" has two
  right answers and a narrow pass condition fails the right one. Dropped under the rule
  this plan ships: the next author of a probe prompt meets the same routing rules and
  writes the condition from them.

### Merged because

Every decision is in its file word for word, the one addition that contradicted the
framework is gone, both suites are green, and a fresh agent on the shipped wording dropped
the two findings the rule names and filed the silent one where it belongs.
