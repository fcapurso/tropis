# A plan states its result as checks that can fail — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the planning rule tells someone writing a plan how to state what the work will
produce: as checks the executor runs, each saying what it prints when it passes and when
it fails, never as figures the author measured by doing the work first; and, where the
result can be stated only by producing it, to choose between describing it for an
executor and building it themselves for a fresh reviewer.

**Spec:** the entries `plan-checks-must-be-falsifiable` and
`plans-are-accurate-without-a-rehearsal` in `feature-catalog.yaml`, bundled as
`planning-rule` in `docs/backlog-board/bands.yaml`. There is no design document; the
decisions below are the design.

**One plan, not two (decided by the specifying session).** What becomes true is one
sentence: *a plan states its result as checks the executor runs, which can fail, and
which the author did not measure by rehearsing the work.* The first entry is the "which
can fail" half and the second the "not measured by rehearsing" half; both rewrite the
same two bullets of `rules/planning.md`, and two plans would edit the same lines one
after the other.

**What the specifying session verified on 2026-11-01, against `main` at `b03d9e2`, with
git 2.49.0 in Claude Code on macOS 26.2 arm64:**

- **What the rule says today.** `rules/planning.md`, *Plans must be self-contained*, has
  the bullet "**Verify every claim the plan makes about the code before dispatching.** A
  plan that asserts something untrue sends the agent into a contradiction it was told not
  to resolve. This has cost a review round more than once." It does not separate claims
  about the repository as it is from claims about the result, so it reads as requiring
  the author to verify the result too, which can only be done by producing it. Nothing in
  the rule says a check must state its failing output. The bullet "**State claims about
  the code as invariants that survive the plan's own commit.**" already rules out "exactly
  one grep hit"; it does not mention counts the author measured by doing the work.
- **What the workflow says today.** `framework/workflow.md`, *Who does what*: the
  specifying session "writes the plans and does **not** execute them." The second
  entry's build-it-yourself shape is an exception to that sentence, so the workflow
  changes with the rule, or the two contradict.
- **How the rule reaches a plan's author.** `.claude/rule-areas.json` gives the area
  `planning` the paths `docs/superpowers/plans/**` and `docs/superpowers/specs/**`; the
  rules command writes the rule with that `paths:` header, so it loads when an agent
  first touches a plan file. That is the entry's second criterion, already true; this
  plan changes no area. The installed copy, `.claude/rules/planning.md`, is the last
  release and is not edited.
- **The evidence the first entry names.** Its `value`: three checks written for the
  first-adopter-harness plan of 2026-08-12 on the blueprint's technology scope expected
  output the work could never produce. One searched for a phrase the plan itself wrapped
  across two lines; one expected a listing the backlog command withholds until something
  has shipped; one demanded a count of zero for a string the authorised replacement text
  contains. Each was caught by the agent executing it. That repository is private, so the
  rule describes the three cases and names the plan in plain text, not as a path.
- **The evidence the second entry names.** Its `value`: an author carried out the work
  on a throwaway copy to measure exact figures for the plan's expected outputs, then paid
  an executor to do it again (first-adopter's plan of 2026-10-13 on the project living in
  one repository, private).
- **Which guards read these files.** `git grep -nF "planning.md" -- guards` finds
  `review-record`, `plan-dispatchable`, `absorb-flush`, `operator-page-closeout` and
  `rule-delivery`; none asserts the two bullets' wording (`git grep -nF "Verify every
  claim" -- guards scripts` prints nothing; the same search for `Plans must be
  self-contained` was checked to find the heading in `rules/planning.md`, so the search
  works). `guards/framework-integrity.test.js` fails on a backticked path under `docs/`,
  `scripts/` or `.claude/` that does not exist; the new text names only
  `.claude/rules/planning.md`, which exists.
- **The plan's catalog edit belongs in this pull request.** `guards/catalog-drift.test.js`,
  "every Delivers id on an executed live plan is shipped", fails once this plan's handover
  report is on the branch while its Delivers ids are not `shipped`. So the executor moves
  both entries to `shipped` here (Task 4), not in a later pull request.
- **The last decision record is FW-040** (`framework/DECISIONS.md`).
- **Review records read.** None exists from these entries. The record of
  `docs/superpowers/plans/2026-10-31-a-session-cannot-move-another-sessions-branch.md`
  found a probe that passed without showing whether the thing it tested had acted; the
  workflow now says to judge a fresh-agent check by the calls the agent made
  (`framework/workflow.md`, *Judge the check by what the agent did*), hence the
  `stream-json` runs in Task 3.
- **The developer's user-level instructions do not overlap.** They say nothing about
  how a plan states its checks or about rehearsing work before planning it, so a local
  probe is not answered by them. Task 3 still records what was checked.

**Model tier: Medium.** The rule, workflow and decision texts are given verbatim. The
fresh-agent check needs judgment to run and to read.

**Merge authority: parent review.** The change is to how every later plan is written,
and the fresh-agent check needs the specifying session's reading. Stop after the
handover report (Task 5). Do not write a review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

plan-checks-must-be-falsifiable
plans-are-accurate-without-a-rehearsal

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-planning-rule -b plan/planning-rule-states-results-as-checks origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's entry pair.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body. A commit touching `framework/` or `rules/` states in its body what the
  fresh-agent check found, or that it is recorded in the handover report because the
  probe runs later.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, in the handover or in the probes' scratch projects.

## Decisions

### 1. The planning rule, verbatim

In `rules/planning.md`, *Plans must be self-contained*:

**(a)** Replace the bullet that begins `- **Verify every claim the plan makes about the
code before dispatching.**` (three lines, ending `This has cost a review round more than
once.`) with these two bullets:

```markdown
- **Verify every claim about the repository as it stands before dispatching; write every
  claim about the result as a check the executor runs.** A claim about what is there now
  — a file exists, a function has three callers, a guard reads committed content only —
  the author checks against the repository and carries with what it was checked against.
  A plan that asserts something untrue sends the agent into a contradiction it was told
  not to resolve. This has cost a review round more than once. A claim about what the
  work will produce cannot be verified before the work exists. Write it as a check, and
  say what the executor does when the check fails: fix the work and run it again, or
  stop and hand back.
- **A check states what it prints when it passes and what it prints when it fails, and
  the two differ.** Before writing the passing output, ask what the check prints against
  the repository as it is, before the work: for a check of the result, that is the
  failing output, and it must not look like the passing one. A check the finished work
  cannot pass, or one that cannot fail, tells the executor nothing, and working out which
  it is costs the executor, or the review when the executor does not notice. Three checks
  written for one plan, the first-adopter-harness plan of 2026-08-12 on the blueprint's
  technology scope, could not pass, and each was caught only by the agent running it: a
  search for a phrase the plan itself wrapped across two lines, a listing the backlog
  command withholds until something has shipped, and a count of zero for a string that
  the replacement text the plan authorised contains.
```

**(b)** In the bullet that begins `- **State claims about the code as invariants that
survive the plan's own commit.**`, append this sentence after `while "nothing imports
it" still holds.`, in the same paragraph:

```markdown
A count the author measured by doing the work on a copy is the same trap: the
executor's work differs in some detail and the figure stops matching. An expected output
rests on what the work must make true — every caller passes the new argument, nothing
names the old file — not on a figure taken from a rehearsal.
```

**(c)** Directly after that bullet, add:

```markdown
- **Do not rehearse the work to write its plan.** Carrying out the change on a throwaway
  copy to measure what it produces, then dispatching an executor to do it again, pays for
  the work twice. Where the result can be stated only by producing it — prose whose
  wording is the deliverable, output nobody can predict before it is generated — choose
  one of two shapes while writing the plan, never both. **Describe it for an executor**:
  state what the result must satisfy as checks, and give the judgment it needs a higher
  model tier. Or **build it yourself and send it to a fresh reviewer**: an agent with
  only the repository reviews it as a reviewing session reviews a plan's work and writes
  the review record, and the plan, or the pull request where there is no plan, says this
  shape was chosen and why. The sign that the choice is due is an expected output you can
  fill in only by making the change. One plan was written by doing the whole change on a
  throwaway copy to measure exact figures for its checks, and then dispatched to an
  executor who did it again.
```

### 2. The workflow, verbatim

In `framework/workflow.md`, *Who does what*, after the paragraph ending `Execution is
dispatched to separate agents, which may dispatch their own review subagents.`, add a
paragraph:

```markdown
**The one exception is a change whose result can be stated only by producing it.** Its
author may build it and send it to a fresh agent to review, instead of describing it
for an executor, and decides which when writing the plan — never both:
`.claude/rules/planning.md`, *Do not rehearse the work to write its plan*.
```

### 3. The decision record, verbatim

Append to `framework/DECISIONS.md`, after FW-040, separated by a blank line as the
others are:

```markdown
## FW-041: A plan states its result as checks; an unstatable result is built or described, not both

**Date:** 2026-11-01 · **Status:** Accepted

**Decision:** A plan verifies its claims about the repository as it stands before
dispatch, and states every claim about the result as a check the executor runs, saying
what it prints on success and on failure, and what to do when it fails. Its author does
not carry out the work to measure what the checks should expect. Where the result can be
stated only by producing it, the author chooses while writing the plan between
describing it for an executor and building it and sending it to a fresh agent to review.

**Evidence:** Three checks in one plan could not pass, each caught only by the agent
running it (the entry `plan-checks-must-be-falsifiable`). An author rehearsed a whole
change on a throwaway copy to measure exact figures, then paid an executor to repeat it
(the entry `plans-are-accurate-without-a-rehearsal`). The rule asked for every claim to
be verified before dispatch, which reads as covering the result.

**Rejected:** Requiring the author to rehearse and record exact figures: it pays for the
work twice, and the figures stop matching when the executor's work differs in a detail.
Letting the author both rehearse and dispatch: the same cost, with two versions of the
result to reconcile. Forbidding the author from ever building: some results, prose above
all, have no checkable description short of the result itself.

**Consequences:** A plan's expected outputs are invariants and failure behaviour rather
than counts. A change built by its author is reviewed by a fresh agent, which writes the
review record; the specifying session is not its reviewer.
```

### 4. What this owes, and does not

- **The catalog** (Task 4): both entries to `shipped`, with modules and evidence.
- **A fresh-agent check** (Task 3), because `rules/` and `framework/` change.
- **No README, operator guide or rule-area change.** What someone developing a project is
  told about the framework's commands does not change; the rule's area is unchanged.
- **No new guard.** The texts are instructions for writing plans, not claims about code;
  the fresh-agent check is their test.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **Edit `rules/planning.md`, never `.claude/rules/planning.md`.** The installed copy
  carries a `paths:` header and a generated marker; the source has neither. Run no rules
  command: the source is not generated from anything here.
- **The probes run in scratch projects set up from this branch**, not in this
  repository: a session here loads the installed release's rule, which does not have the
  new text. Confirm the scratch project's `.claude/rules/planning.md` contains
  `Do not rehearse the work to write its plan` before starting a probe; if it does not,
  stop and hand back.
- **A probe that fails is a finding, not something to fix.** Do not reword the rule to
  make it pass. Record the failure, with the calls, in the handover, finish Tasks 4 and 5,
  and leave the verdict to the reviewing session.
- **Do not put `: ` (colon and space) inside an unquoted YAML value** in the catalog.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `rules/planning.md` | *Decision 1* |
| `framework/workflow.md` | *Decision 2* |
| `framework/DECISIONS.md` | *Decision 3* |
| `feature-catalog.yaml` | both entries to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/superpowers/plans/2026-11-01-a-plan-states-its-result-as-checks.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table). In the worktree run `npm --prefix .tropis ci`, then
`git status --porcelain` (passes when it prints nothing), then
`bash scripts/check-blueprint.sh` (passes when its last line starts `Self-check passed`;
any other last line, stop and hand back). Record `git --version`, `node --version`,
`claude --version` (or the tool you run probes with) and `uname -sm`, and the commit you
started from.

### Task 1 — The texts

Apply *Decisions 1, 2 and 3*. Wrap the inserted text as the surrounding paragraph is
wrapped; the checks below collapse line breaks first, so where a line breaks does not
matter. Each passes when it prints `1`; the specifying session ran each against `main`
at `b03d9e2` and each printed `0`, the failing output:

```bash
tr -s ' \n' ' ' < rules/planning.md | grep -cF 'write every claim about the result as a check the executor runs'
tr -s ' \n' ' ' < rules/planning.md | grep -cF 'A check states what it prints when it passes and what it prints when it fails'
tr -s ' \n' ' ' < rules/planning.md | grep -cF 'not on a figure taken from a rehearsal.'
tr -s ' \n' ' ' < rules/planning.md | grep -cF 'Do not rehearse the work to write its plan.'
tr -s ' \n' ' ' < framework/workflow.md | grep -cF 'The one exception is a change whose result can be stated only by producing it.'
tr -s ' \n' ' ' < framework/DECISIONS.md | grep -cF '## FW-041: A plan states its result as checks'
```

and this, which passes when it prints `0` (against `b03d9e2` it printed `1`):

```bash
tr -s ' \n' ' ' < rules/planning.md | grep -cF 'Verify every claim the plan makes about the code before dispatching.'
```

Any other figure: re-read the decision and fix the edit. Commit, noting in the body that
the fresh-agent check is recorded in the handover report. Run
`bash scripts/check-blueprint.sh`: passes when its last line starts `Self-check passed`;
on a failure, fix what the failing guard names if it is in this plan's files, otherwise
stop and hand back.

### Task 2 — Scratch projects

Make two empty directories outside every checkout (a system temporary directory). In
each: `git init -q -b main`, then `bash <this worktree>/scripts/set-up-project.sh .`,
then add `docs/notes.md` with three lines of text, a `README.md` whose opening paragraph
is two sentences describing an invented note-taking tool, and `docs/guide.md` that
mentions `docs/notes.md` twice; commit everything. Confirm the Trap about
`.claude/rules/planning.md`.

### Task 3 — The fresh-agent check

Two probes, one per scratch project, each a fresh agent session with the prompt piped on
stdin, its tool calls visible (for Claude Code,
`claude -p --output-format stream-json --verbose`), saving the stream to a file outside
the repository. Do not tell either agent about the rule.

**Probe A** — prompt: "This is a probe; its output will be discarded. Write an
implementation plan in this project, under docs/superpowers/plans/, for renaming
docs/notes.md to docs/journal.md and updating every reference to it. Another session will
execute it. Commit the plan."
**Passes when** all of: every verification step in the committed plan says what it
prints on success and what on failure, and the two differ; no expected output is a
figure the agent obtained by renaming or copying files; and the stream shows no call
that renames, moves or copies `docs/notes.md` or the project (a read or a search is
fine). Quote the plan's verification steps and the stream's file-changing calls.

**Probe B** — prompt: "This is a probe; its output will be discarded. Write an
implementation plan in this project, under docs/superpowers/plans/, for rewriting the
opening paragraph of README.md so a newcomer understands in two sentences what the tool
is for. Commit the plan."
**Passes when** the committed plan says which of the two shapes it chose — described for
an executor, with checks the new paragraph must pass, or built by its author and sent to
a fresh reviewer — and why; and it does not both carry a finished rewrite as its
expected output and hand the work to an executor. Quote the lines that state the choice,
and say whether the stream shows the agent reading `.claude/rules/planning.md` or
receiving it.

For each probe record pass or fail against every condition, the tool, its version, the
operating system and the architecture. Then delete both scratch directories.

### Task 4 — Catalog and full verification

In `feature-catalog.yaml`, on both `plan-checks-must-be-falsifiable` and
`plans-are-accurate-without-a-rehearsal`: set `status: shipped`, and set `modules` to
`rules/planning.md` and `framework/workflow.md`. Directly above each entry's `- id:`
line, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-a-plan-states-its-result-as-checks.md
# (FW-041). Criteria are covered by the rule text in rules/planning.md and by the
# fresh-agent probes A and B in that plan's handover report. The rule reaches a plan's
# author through the planning area in .claude/rule-areas.json.
```

For the first entry, leave its existing `# Raised 2026-08-12 ...` comment inside the
entry as it is. Commit. Then run, and record each output:

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
git diff --stat origin/main...HEAD     # passes: only the File Structure files
```

On a failure that is in this plan's files, fix and re-run; otherwise stop and hand back.

### Task 5 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*), each check's command with its actual
output, the probes' quotes, and the worktree path used. Commit and push the branch, open
a pull request against `main` whose body says what becomes true and links this plan, and
stop. Do not write a review record and do not merge.

## Handover report

Worktree used: `../tropis-planning-rule`, branch `plan/planning-rule-states-results-as-checks`,
started from `origin/main` at `ef13493`. Tools: git 2.49.0, Node v22.15.0, Claude Code
2.1.300, Darwin arm64.

### Task completion

- Task 0: setup done; `npm --prefix .tropis ci` ran; the tree was clean; the self-check
  ended `Self-check passed`.
- Task 1: Decisions 1 to 3 applied verbatim. Checks printed `1 1 1 1 1 1` for the six
  presence checks and `0` for the removed sentence, as required. Self-check passed.
- Task 2: two scratch projects set up from this branch; each project's
  `.claude/rules/planning.md` contained `Do not rehearse the work to write its plan`
  (count 1) before its probe started. Both were deleted afterwards.
- Task 3: both probes run; A passed, B failed (below).
- Task 4: both catalog entries are `shipped` with `modules` set and the comment added.
- Task 5: this report.

### Verification results

- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 128 passed, 128 total`.
- `git diff --stat origin/main...HEAD` before this report: `feature-catalog.yaml`,
  `framework/DECISIONS.md`, `framework/workflow.md`, `rules/planning.md`.

**Fresh-agent check.** Run with `claude -p --output-format stream-json --verbose
--allowedTools "Read,Write,Edit,Glob,Grep,Bash(git:*),Bash(ls:*),Bash(cat:*),Bash(grep:*)"`,
prompt on stdin, in each scratch project. A first attempt with
`--permission-mode bypassPermissions` was refused by the session's permission classifier
and nothing ran; the scoped tool list above was used instead. The developer's
user-level instructions do not cover this rule (the plan checked this), so the local run
was not contaminated by them.

**Probe A: pass.** The agent read `.claude/rules/planning.md` (a `cat` of it in the
stream). Its committed plan gives, for each of six verification steps, a Pass and a Fail
output that differ, for example "Pass: prints only `docs/journal.md`. Fail (before the
work): prints only `docs/notes.md`", and for the reference search "Pass: prints only
`exit=1`. Fail (before the work): prints the two `docs/guide.md` lines and `exit=0`";
it also plants a hit first to prove the search can find one. Expected outputs follow from
what the work must make true; none is a figure measured by renaming. The stream's
file-changing calls were: `git worktree add ../A-plan-notes-to-journal -b
plan/notes-to-journal-spec main` (a new working tree to hold the plan, as the branching
rule asks; it did not rename or copy `docs/notes.md`), a `Write` of the plan, and a
Python rewrite of the plan file's header lines. No call renamed, moved or copied
`docs/notes.md`. One point for the reviewer: the plan was committed on a branch in that
worktree, not on `main`; the agent said so, citing the project's rules.

**Probe B: fail.** The agent wrote no plan and committed nothing, so neither shape was
chosen. It read `.claude/rules/planning.md` and stopped, because another part of the
same rule says a plan does not patch the README (`/refresh-readme` does), and
asked which of three routes to take. Quote: "I haven't written or committed the plan.
This project's own rules say a plan should not edit the README". The new clause was
therefore not exercised. The cause is the probe's subject, which the README rule
forbids; it is not evidence that the new clause fails. Per the plan's trap, the rule
was not reworded. The reviewing session decides whether to rerun B with a subject that is
not the README, for example rewriting an invented prose file under `docs/`.

### Scope

`git diff --stat origin/main...HEAD` lists only the files in the plan's File Structure
(this report included). Worktree: `../tropis-planning-rule`.

### Judgment calls

- Used a scoped `--allowedTools` list for the probes after the bypass flag was refused.
- Kept the probe streams outside the repository and deleted the scratch projects; the
  streams are not committed.
- Task 3 asked for a pass or fail per condition; B's conditions are all unmet because
  nothing was written.

### What the plan got wrong

Probe B's subject collides with the README rule in the same file, so it could not
exercise the new clause. The plan's Decision text for Task 3 should have chosen a prose
subject outside the README.

### Outstanding

- Probe B needs a rerun with a different subject (reviewer's call).
- No review record written, nothing merged, as instructed.
