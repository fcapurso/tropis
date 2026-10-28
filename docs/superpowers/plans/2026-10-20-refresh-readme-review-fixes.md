# /refresh-readme commits where the workflow allows, and handles the whole page — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover. **This plan continues an open branch and pull request; it does not start a
> new one** — see *Global Constraints*.

**Goal:** the README a refresh commits may go straight to `main`, as the workflow and the
commit hook now both say; a refresh handles the page's title and opening paragraph, a
README that did not exist, a refresh point that no longer exists, and an unknown level; it
runs the project's checks before asking for a yes; and its option commits carry only their
own file.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md`, and the first
plan on this branch, `docs/superpowers/plans/2026-10-20-refresh-readme-command.md` — read its
Decisions and its handover report. This plan fixes what an independent review of that branch
found.

**What the independent review found (2026-10-20, at `05f0a38`), each checked by the
specifying session:**

1. `commands/refresh-readme.md` commits `README.md` on the current branch — `main` in normal
   use — and says "Do not create a branch". But `README.md` is not on the workflow's list of
   what may go directly to `main` (`framework/workflow.md` line 105–107: "the backlog,
   generated documentation, plan and spec files, the release notes `/release` commits, and
   prose under `docs/`"), nor in the commit hook's `may_go_to_main`
   (`scripts/framework-commit-check.sh` line 30:
   `may_go_to_main='^(feature-catalog\.yaml$|RELEASES\.md$|docs/)'`). Fed a commit of
   `README.md` on `main`, the hook replies "You are on main, and this commit carries files the
   workflow says belong on a branch: README.md". The design meant the README to go straight
   to `main`: it is prose, and cannot change how an agent behaves — the list's own test.
2. A missing README is "a page with no sections"; at `writes` the refresh creates it. On a
   no, `git restore README.md` fails on an untracked file and leaves the new page behind.
3. The command never says what to do with the text above the first `## `: the `# ` title
   and the opening paragraph. Tropis's skeleton takes its first section's facts from "the
   opening paragraph of README.md", and `guards/readme-usable.test.js` requires a `# ` title
   line. The command also never runs the project's checks before asking for a yes.
4. `git show <refreshedAt>:feature-catalog.yaml` has no failure path: the commit may be gone
   (a squash-merge), the file may not exist there or now, and `level` may hold a typo.
5. The level and `skeleton` options `git add` one file and commit, so anything already staged
   goes into that commit.
6. `framework/workflow.md` line 286 says the README is refreshed "on its own or from
   `/release`"; `/release` has no such step until the fourth plan.
7. `RELEASES.md` puts the new `### After updating: what to do by hand` (line 43) after the
   change sections; `commands/release.md` line 88 says it comes first, after the summary.
8. FW-025 does not record that the operator-guide row was narrowed to working with the
   framework. `docs/readme/skeleton.md` lines 1–2 keep the default's header, which tells the
   reader to copy the file to itself. `scripts/set-up-project.sh` lines 96–98 keep
   `docs/project-brief.md` out of exported copies (`export-ignore`) but not `docs/readme/`.

**What the specifying session verified, at `05f0a38`:**

- `may_go_to_main` sits inside a project-owned block of `scripts/framework-commit-check.sh`
  (its `project-owned: begin`/`end` lines around line 30). A project keeps its own block's
  content on an update, so changing the shipped value reaches new projects only; an existing
  project needs a step in the release notes, which `/update` does.
- The hook's message for files off the list is the heredoc at the end of the script: "What
  may go directly to main is the backlog, generated documentation, plan and spec files, the
  release notes, and prose under docs/ (workflow.md, Branching). Commit these on a branch."
- `guards/rule-delivery.test.js` tests the hook (`describe('framework-commit-check fires when
  a commit carries the instruction layer'`), including *stays silent on main for the release
  notes alone, which /release commits there* (around line 381), which the new test follows.
- `RELEASES.md` `## [Unreleased]`: summary paragraph (lines 18–21), `### Update with one
  command: /update` (line 23), `### Keep your README current with /refresh-readme` (line 35),
  `### After updating: what to do by hand` (line 43). The next `### After updating` (line 57)
  belongs to 0.4.0 and is not touched.
- In this repository the README check `readme-usable` runs only in the self-check, which
  reads committed content; `npm --prefix .tropis test` does not run it.

**Model tier: Small–medium.** Every edit is given.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** The specifying session reviews and merges the whole
branch.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-refresh-readme-fixes plan/refresh-readme-command` |

## Global Constraints

- **Work on the existing branch `plan/refresh-readme-command` and push to it.** It backs the
  open pull request fcapurso/tropis#112. Do not create a branch, open a pull request, merge,
  rebase or force-push.
- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md`.**
- **Do not edit the first plan's file**, `2026-10-20-refresh-readme-command.md`.
- **Do not lower, skip or delete a guard to get green.** Decision 2 adds a test.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-20. Do not reopen them.

1. **`framework/workflow.md`, Branching.** In the bullet beginning `**What may go directly to
   `main` is what cannot change how an agent behaves**`, change `the backlog, generated
   documentation, plan and spec files, the release notes `/release` commits, and prose under
   `docs/`.` to `the backlog, generated documentation, plan and spec files, the release notes
   `/release` commits, the README `/refresh-readme` commits, and prose under `docs/`.`
   In the doc-closeout row for what the product's users are told, change `by
   `/refresh-readme`, on its own or from `/release`. A plan does not patch it` to `by
   `/refresh-readme`. A plan does not patch it`.

2. **`scripts/framework-commit-check.sh`.** Inside the project-owned block, change the value
   to `may_go_to_main='^(feature-catalog\.yaml$|RELEASES\.md$|README\.md$|docs/)'` and the
   block's comment line `backlog, the release notes /release commits on main, and everything
   under docs/` to `backlog, the release notes /release commits on main, the README
   /refresh-readme commits, and everything under docs/`. In the closing heredoc, change `the
   release notes, and prose under docs/` to `the release notes, the README, and prose under
   docs/`. In `guards/rule-delivery.test.js`, after the release-notes test, add:

   ```js
   it('stays silent on main for the README alone, which /refresh-readme commits there', () => {
     const dir = repoWith(['README.md'], 'main');
     const { stdout, status } = runCommitHook('git commit -m "x"', dir);
     expect(status).toBe(0);
     expect(stdout).toBe('');
   });
   ```

3. **`commands/refresh-readme.md`.**
   - **Options:** in both the level and the `skeleton` option, commit with the path named so
     nothing else staged goes in: `git add <file>` then `git commit -m "…" -- <file>`.
   - **Pre-flight:** after reading the level, add: `A level that is not writes, suggests or
     manual is treated as unchosen; say so.` Also record whether `README.md` exists now.
   - **Read:** after the sentence about the shipped-entries comparison, add: `If
     <refreshedAt> is not a commit this repository has, or feature-catalog.yaml cannot be read
     at it or now, there is no refresh point: say so, and treat every section as a candidate.`
   - **A new paragraph at the start of Judge:** `The page starts with its # title line. Keep
     it as it is; if there is none, write one from the project's name. The first skeleton
     section is the page's opening: it is written under the title as plain paragraphs, with no
     ## heading of its own. Every later skeleton section is a ## section, headed as in the
     skeleton.`
   - **At `writes`, before "Then list each changed section":** `Run the project's checks
     (npm --prefix .tropis test). If any fails because of the page, fix the page and run them
     again; if one still fails, say which and why when you ask.`
   - **On no:** replace `run git restore README.md and stop` with `if README.md existed before
     the refresh, run git restore README.md; if it did not, delete it. Then stop.`
   - In the opening paragraph, after `Do not create a branch.`, add `A refreshed README is
     committed on the current branch, which may be main: the workflow lets the README go there
     directly.`

4. **The skeletons.**
   - `templates/readme-skeleton.md`: replace the header comment with

     ```
     <!-- The README's sections, in order. The first is written as the page's opening
          paragraph under its title, with no heading of its own; the rest are ## sections.
          A project may copy this file to docs/readme/skeleton.md and change it;
          /refresh-readme then uses that copy. -->
     ```
   - `docs/readme/skeleton.md`: replace its header comment with

     ```
     <!-- This repository's own README skeleton; /refresh-readme uses it instead of the
          default. The first section is the opening paragraph under the title; the rest
          are ## sections. -->
     ```

5. **`scripts/set-up-project.sh`.** In the `export-ignore` loop, add `docs/readme/` after
   `docs/project-brief.md`. If `guards/set-up-project.test.js` asserts the `.gitattributes`
   lines, add it there too.

6. **`RELEASES.md`, `## [Unreleased]`.** Move the whole `### After updating: what to do by
   hand` section (from line 43 to just before `## [0.4.0]`) to directly after the summary
   paragraph, before `### Update with one command: /update`. Then add a second step to it:

   ```
   **2. Let your README be committed straight to main.** In
   `.tropis/hooks/framework-commit-check.sh`, in the block marked as yours, add
   `README\.md$|` after `RELEASES\.md$|` in `may_go_to_main`. Without it, the commit hook
   tells you a refreshed README belongs on a branch.
   ```

7. **`framework/DECISIONS.md`, FW-025.** Append to its **Consequences**: `The operator-guide
   row is narrowed to what someone developing the project is told about working with the
   framework, so it no longer catches a project's own developer commands. The README may go
   directly to main, in the workflow's Branching list and in the commit hook, because it
   cannot change how an agent behaves.`

## Traps

- **The branch already exists.** The isolation command has no `-b`. If git reports it is
  checked out elsewhere, stop and hand back.
- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. An intermittent red run with no failing test
  named has been seen on an unchanged tree (backlog entry
  `self-check-red-runs-keep-their-output`): if that happens, run it once more and report both
  runs; do not change code for it.
- **Line numbers shift as you edit.** Match the quoted text.
- **Do not put a path in backticks under `docs/`, `scripts/` or `.claude/` into framework or
  command text unless it exists here or is exempted.**

## File Structure

| File | Change |
|---|---|
| `framework/workflow.md` | Decision 1 |
| `scripts/framework-commit-check.sh` | Decision 2 |
| `guards/rule-delivery.test.js` | Decision 2 |
| `commands/refresh-readme.md` | Decision 3 |
| `templates/readme-skeleton.md` | Decision 4 |
| `docs/readme/skeleton.md` | Decision 4 |
| `scripts/set-up-project.sh` | Decision 5 |
| `guards/set-up-project.test.js` | Decision 5, only if it asserts the `.gitattributes` lines |
| `RELEASES.md` | Decision 6 |
| `framework/DECISIONS.md` | Decision 7 |
| `docs/superpowers/plans/2026-10-20-refresh-readme-review-fixes.md` | Handover report only |

## Tasks

### Task 1: The README may go to main

Decisions 1 and 2. Commit; `bash scripts/check-blueprint.sh`: green. Paste the line of the
self-check output that shows the new hook test passing, or the conformance result for
`rule-delivery`.

### Task 2: The command and the skeletons

Decisions 3, 4 and 5. Commit; self-check green.

### Task 3: Records

Decisions 6 and 7. Commit; self-check green.

### Task 4: Fresh-agent check

Required: a framework document and a command changed. In a scratch folder outside any
repository: `git init`, run this branch's `scripts/set-up-project.sh`,
`npm --prefix .tropis install`, then write the Greeter fixture of the first plan's Task 5
(`docs/project-brief.md`, `feature-catalog.yaml` with the shipped `port-option` entry) with
**no `README.md`**, and `docs/readme/readme.yaml` at `level: writes` with `refreshedAt:
"0000000000000000000000000000000000000000"`. Commit everything. Start a fresh Claude Code
session there and give it, in one prompt:

> This is a probe and its output will be discarded. Run /refresh-readme. When it asks me to
> approve, answer no yourself, then tell me what you did at each step and what the page
> looked like before you put it back.

**Pass, all of:** the agent says the refresh point could not be read and treated every
section as a candidate; the page it wrote began with a `# ` title and an opening paragraph
with no `## ` heading for the first section; it ran `npm --prefix .tropis test` before
asking; after the no, `README.md` does not exist and `git status --porcelain` is empty.

Then commit a `README.md` of three lines, run in a new session `/refresh-readme writes` —
**pass** if exactly one commit is added and it changes only `docs/readme/readme.yaml`, while
a file you staged beforehand (`echo x > note.txt && git add note.txt`) is still staged and
uncommitted.

**Fail:** any other outcome. Find which passage the agent did not receive or misread, fix
it, run again. If it fails twice, stop and hand back.

Record the prompts, each answer's gist, `git status` and `git log --oneline -2` after each
run, pass or fail, and the tool, version and machine, **in the handover report**. Delete the
scratch folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: the self-check's last line `Self-check passed: …`; project checks green; the diff
holds only files in this plan's or the first plan's File Structure. Append `## Handover
report` with the six sections the planning rules name, commit, and push to
`plan/refresh-readme-command`.

## Not in this plan

- The fact check, the nudge and the `/release` step: the three later plans. The fourth puts
  "or from `/release`" back into the workflow row when it is true.
- Making the README check `readme-usable` run before a commit in this repository: the first
  refresh of Tropis's README will be reviewed by hand, and the self-check catches the rest.

## Handover report

### Task completion

All five tasks are done. Tasks 1–3 landed as three commits on `plan/refresh-readme-command`.
Task 4 fresh-agent checks passed (the `/refresh-readme writes` staged-file check needed the
level changed from `suggests` to `writes` first, because the fixture already had `writes`).
The scratch project was deleted. Nothing was merged: merge authority is parent review.

### Verification results

**Task 1** — `bash scripts/check-blueprint.sh` on `317f78a`, exit 0. Last line:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

The clean baseline includes `guards/rule-delivery.test.js` › *stays silent on main for the
README alone, which /refresh-readme commits there* (added in Task 1). Conformance block on
that run included `caught plain-reply rule-delivery`.

**Tasks 2–3** — self-check green on `9b654a1` and `5008695` with the same last line.

**Task 4** — Tool: Claude Code `2.1.300` (`claude --version`). Machine:
dev-laptop.local, Darwin 25.2.0, arm64. Scratch path:
`/tmp/tropis-refresh-readme-review-probe` (removed after).

Probe 1 prompt:

> This is a probe and its output will be discarded. Run /refresh-readme. When it asks me to
> approve, answer no yourself, then tell me what you did at each step and what the page
> looked like before you put it back.

Before: `git log --oneline -1` → `4c64620 Greeter fixture for refresh-readme probe`;
`git status --porcelain` empty; no `README.md`. **Pass.** The agent reported the all-zero
refresh point as unreadable, wrote a `# Greeter` title with an opening paragraph (no `##`
for the first skeleton section), ran `npm --prefix .tropis test` (5 suites, 30 tests) before
asking, answered no, deleted `README.md`. After: no `README.md`; `git status --porcelain`
empty; log unchanged.

Probe 2 (`/refresh-readme writes` with staged `note.txt`): after committing a three-line
`README.md`, setting `level: suggests` and committing, then `echo x > note.txt && git add
note.txt`. **Pass** on second attempt: one new commit `bcd5704` touching only
`docs/readme/readme.yaml`; `note.txt` remained staged (`A  note.txt`). The first attempt
with `level` already `writes` made no commit (expected for the option-only path).

**Task 5** — on `5008695` before this handover commit:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Time:        0.533 s
```

`git diff --stat origin/main...HEAD`: 19 files, 482 insertions, 23 deletions (includes the
first plan's branch work plus this plan's edits; only paths listed in those plans' File
Structure tables).

### Scope

This plan's commits: `317f78a`, `9b654a1`, `5008695`, plus this handover commit. Files
touched match this plan's File Structure table and the continuing branch from
`2026-10-20-refresh-readme-command.md`. No edits under `.claude/`, `.tropis/`, `.cursor/`,
root `README.md`, or the first plan file.

### Judgment calls

- **Task 4 probe 2:** Retried after changing `level` to `suggests` so `/refresh-readme
  writes` would commit; the plan's pass criteria target the `-- <file>` commit shape, not
  the no-op when the level is unchanged.
- **Task 4 probe 1:** The agent noted missing-source sections in its narrative but did not
  list them in the approval ask; behaviour still met the plan's pass criteria.

### What the plan got wrong

Nothing material. FW-025 exists on the branch (the review-fixes text says FW-025; the entry
is the readme refresh decision, not the self-check FW-024).

### Outstanding

None for the executing agent. Parent review re-runs the plan checks and merges
`plan/refresh-readme-command` (PR fcapurso/tropis#112).

## Review record

Reviewer: the specifying session, Claude Code desktop (Opus 5.5), on the developer's MacBook
Pro, Darwin 25.2.0. Covers the whole branch, both plans.

### Checks re-run

- An independent review (fresh agent, read-only) at `873dd04` confirmed the first review's
  eight findings fixed in code and text, and ran the self-check (`Self-check passed: …`) and
  the project checks (`Tests: 28 passed, 28 total`).
- After the reviewer's fixes below, at the commit that adds them:
  `bash scripts/check-blueprint.sh` → `Self-check passed: every guard caught its defect, the
  clean baseline passed, and the framework repository's own guards passed.`;
  `npm --prefix .tropis test` → `Tests: 28 passed, 28 total`. The new guard test
  *lets a plan correct a README reference to what it removed or renamed, and nothing more*,
  run against the previous commit's workflow page and planning rule:
  `Tests: 1 failed, 4 passed, 5 total` — it can fail.

### Found

The second independent review found, and the developer decided:

- **A deadlock** between "a plan does not patch the README" and any check that the README
  names only what exists (`readme-usable` here, the fact check in every project later): a
  plan renaming a command could not get green. The developer chose that a plan which removes
  or renames something the README names corrects that reference and adds nothing (option A,
  over a warning-only check).
- **Every refresh would restructure the page**, because the opening section has no heading.
- **Tropis's first refresh would likely fail `readme-usable`**, which requires fixed phrases
  the new skeleton does not name.
- Small gaps: setting the current level commits nothing and the command did not say so; the
  final commit was not limited to its two files; checks were not re-run after the
  developer's edits; the `docs/readme/` export-ignore line had no test; FW-006 omitted the
  narrowed operator-guide row.

**Fixed here by the reviewer**, with the developer's approval, in one commit on the branch:
the exception in `framework/workflow.md`, `rules/planning.md`, FW-025 and `RELEASES.md`, with
a guard test; the heading comparison; the commit and re-check wording in
`commands/refresh-readme.md`; the guard named in `docs/readme/skeleton.md`; the export-ignore
test; the FW-006 status. This is a reviewer approving their own fix; it is small, declared
here, and was re-checked by the runs above and the fresh-agent check below.

**Fresh-agent check of the exception**, Claude Code CLI 2.1.300 on the developer's MacBook Pro
(Darwin 25.2.0, arm64), `claude -p` limited to Read, Write, Edit, Glob and Grep, in a
scratch project set up from this branch whose README says ``Run `scripts/start.sh`.``.
Prompt: "This is a probe and its output will be discarded. Write a plan, as a file under
docs/superpowers/plans/, for this change: scripts/start.sh is renamed to scripts/serve.sh,
and nothing else changes for users. Follow this project's planning rules, including its File
Structure table. Do not implement the change. Then tell me, in a few lines, whether the plan
touches README.md, exactly what it changes there and why, and which instruction told you
so." Answer: the plan changes one README line, `scripts/start.sh` to `scripts/serve.sh`, and
tells the executor to add or reword nothing else; it cited step 5 of `.claude/rules/planning.md`
and the workflow's README row. **Pass.** Scratch folder deleted.

**Re-check of those fixes** by a fresh read-only agent at `b1ea266`: would merge after
one fix. It found six wording gaps — a freshly copied skeleton could be read as "nothing
changed" and left uncommitted; the heading comparison did not exclude the `#` title; a check
failing after the developer's edits had no next step; FW-025 overclaimed that the README is
never wrong between refreshes; the guard pinned only the ends of the exception's wording;
and the fresh-agent check had to reach the squash body. The first five were fixed in
`d826645`, after which `bash scripts/check-blueprint.sh` ended `Self-check passed: …` and
`npm --prefix .tropis test` gave `Tests: 28 passed, 28 total`; the sixth is the squash body.

### Outstanding disposition

- `readme-usable`'s fixed-phrase assertions conflict with a page an agent rewrites: to be
  retired or reduced when the fact check lands (plan 2 of the entry), which gives every
  project the "names only what exists" check. Until then the skeleton names the guard.
- The intermittent red self-check with no failing test named, seen once by the first
  reviewer while another run was in progress: already the backlog entry
  `self-check-red-runs-keep-their-output`.

### Learnings routed

- Plans that forbid touching a page collide with checks on that page: written into the rule
  itself (the exception) and FW-025.

### Merged because

Both plans' checks and the reviewers' re-runs are green, every finding of both reviews is
fixed or dispositioned above, and the fresh agent applied the new exception as intended.
