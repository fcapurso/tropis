# /release refreshes the README before drafting the notes — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** in a project that keeps its README with Tropis, `/release` runs `/refresh-readme`
before it drafts the notes; when the README is still behind afterwards it lists what and asks
whether to release anyway, never stopping on its own and never going ahead silently; and the
workflow says the README is refreshed from `/release` too.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md` (*In
`/release`*, and the call that `/release` asks rather than stops), and the merged plans
`2026-10-20-refresh-readme-command.md` and `2026-10-20-refresh-readme-review-fixes.md`. This
is plan 4 of 4 for `product-readme-is-kept-current`; plans 2 (the fact check) and 3 (the
nudge) run at the same time on their own branches. **This plan delivers nothing;** the
reviewing session ships the entry when the last of the three merges.

**What the specifying session verified on 2026-10-21, at `main` after PR fcapurso/tropis#112:**

- `commands/release.md`: a project-owned block at the top (lines 12–25), then `## Stage 1 —
  Pre-flight` (clean tree, `main` equal to `origin/main`, on `main`), `## Stage 2 — Scope`,
  `## Stage 3 — Draft the notes`, `## Stage 4 — Confirm` (prints a fenced summary beginning
  `Last version:` … `Dropped:`, then the draft), `## Stage 5 — Commit the notes, nothing else`
  (commits and **pushes**), `## Stage 6 — Print the trigger`.
- `/refresh-readme` (`commands/refresh-readme.md`) refuses a dirty tree; at `writes` it
  commits `README.md` and `docs/readme/readme.yaml` only on the developer's yes and restores on
  a no; at `suggests`, at `manual` and with no level chosen it only reports. The design: the
  `/release` step runs at `writes`, `suggests` and unchosen, and not at `manual`.
- `guards/release.test.js`, *the /release drafting stage*, reads `commands/release.md` and
  asserts phrases inside Stage 3, with whitespace collapsed.
- `framework/workflow.md`, the doc-closeout README row, reads `… refreshed as a whole page by
  `/refresh-readme`. A plan does not patch it, except to correct a command, file or link the
  README names that the plan removed or renamed — correcting the reference and adding nothing |`.
  `guards/operator-page-closeout.test.js` pins `A plan does not patch it, except …` in full
  and `` `\/refresh-readme`[^\n]*A plan does not patch it ``; inserting text between
  `/refresh-readme` and `. A plan` keeps both.

**Model tier: Small–medium.** Every edit is given.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 3 (record which).

**Merge authority: parent review.**

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-release-readme -b plan/release-refreshes-readme` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md`.**
- **Do not edit the project-owned block in `commands/release.md`.**
- **Do not edit `commands/refresh-readme.md`, `scripts/`, or any guard other than
  `guards/release.test.js`.** Plans 2 and 3 own the rest.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-21. Do not reopen them.

1. **`commands/release.md`, a new stage before Stage 1:**

   ```
   ## Stage 0 — The README

   Read `docs/readme/readme.yaml`. At `manual`, skip this stage. Otherwise — `writes`,
   `suggests`, or no file — run `/refresh-readme` as its command says, before anything else.

   If it committed a refreshed README, push `main` (`git push origin main`), so Stage 1 finds
   `main` equal to `origin/main`.

   If the README is still behind — at `writes` the developer said no, or at `suggests` or with
   no level chosen it reported sections behind — list those sections and ask whether to
   release anyway. On no, stop. On yes, go on, and remember the sections for Stage 4.
   ```

2. **`commands/release.md`, Stage 4.** In the fenced summary, after the `Dropped:` line, add
   `README: <refreshed · up to date · behind, released anyway: <sections> · not kept by Tropis>`.

3. **`guards/release.test.js`.** Add a `describe('the /release README stage', …)` that reads
   `commands/release.md`, collapses whitespace as the existing block does, takes the text from
   `## Stage 0` to `## Stage 1`, and asserts it contains: `At \`manual\`, skip this stage`,
   `run \`/refresh-readme\``, `git push origin main`, `ask whether to release anyway`,
   `On no, stop`. Add one test that `## Stage 0` comes before `## Stage 1`, and one that the
   Stage 4 text contains `README: <refreshed`.

4. **`framework/workflow.md`.** In the doc-closeout README row, change `by \`/refresh-readme\`.
   A plan does not patch it` to `by \`/refresh-readme\`, on its own or from \`/release\`. A plan
   does not patch it`. Nothing else in the row changes.

5. **Records.** `RELEASES.md`, `## [Unreleased]`, after the last change section:

   ```
   ### /release brings your README up to date first

   When Tropis keeps your README, `/release` now runs `/refresh-readme` before it drafts the
   notes. If the README is still behind — you declined the rewrite, or Tropis only suggests —
   it tells you which sections and asks whether to release anyway. At `manual` it leaves the
   README alone.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. An intermittent red run with no failing test
  named has been seen (backlog `self-check-red-runs-keep-their-output`): run once more and
  report both; change nothing for it. Run nothing else at the same time.
- **Stage 1 needs a remote.** The fresh-agent check's scratch project needs a bare repository
  as `origin`, with `main` pushed, or Stage 1 stops for a reason that has nothing to do with
  this change.
- **The project-owned block in `commands/release.md` asks a project to fill in its trigger and
  notes file.** In the scratch project fill it with a harmless trigger (`echo release <bump>`)
  so the command can run; never in this repository.
- Plans 2 and 3 also add sections to `RELEASES.md`. Append at the end and do not rebase; the
  reviewer resolves the order at merge.

## File Structure

| File | Change |
|---|---|
| `commands/release.md` | Decisions 1–2 |
| `guards/release.test.js` | Decision 3 |
| `framework/workflow.md` | Decision 4 |
| `RELEASES.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-21-release-refreshes-readme.md` | Handover report only |

## Tasks

### Task 1: The stage and its test

Decisions 1–3. Commit; self-check green.

### Task 2: The workflow row and records

Decisions 4 and 5. Commit; self-check green, with `caught operator-page-closeout:
framework/workflow.md planted` in its framework section.

### Task 3: Fresh-agent check

Required: a framework document and a command changed. In a scratch folder outside any
repository: create a bare repository, `git init` a project with it as `origin`, run this
branch's `scripts/set-up-project.sh`, `npm --prefix .tropis install`, fill the release
command's project-owned block (trigger `echo release <bump>`), copy `templates/RELEASES.md` to
`RELEASES.md`, write the Greeter fixture of the first README plan's Task 5 (a brief, a catalog
with the shipped `port-option` entry, a three-line `README.md` mentioning only `npm start`), set
`docs/readme/readme.yaml` to `suggests`, commit, and push `main`. Start a fresh Claude Code
session there and give it, in one prompt:

> This is a probe and its output will be discarded. Run /release. When it asks whether to
> release anyway, answer yes yourself. Stop at Stage 4: print its summary and do not commit or
> push the notes. Then tell me what you did about the README and in what order.

**Pass:** the agent ran the README stage first; it reported sections behind and asked whether
to release anyway; the Stage 4 summary carries `README: behind, released anyway:` with those
sections; `README.md` is unchanged (`git status --porcelain` is empty or shows only what the
draft touched). Then set `level: manual`, commit and push, and repeat: **pass** if the agent
skipped the README stage and the summary says `README: not kept by Tropis`.

**Fail:** anything else. Find which passage it misread, fix it, run again. If it fails twice,
stop and hand back. Record the prompts, each answer's gist, the summaries, `git status`, and
the tool, version and machine **in the handover report**. Delete the folder.

### Task 4: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: last line `Self-check passed: …`; project checks green; only files in *File
Structure*. Append `## Handover report` with the six sections the planning rules name, commit,
push, and open a pull request against `main`. Do not merge.

## Criteria this plan advances

`product-readme-is-kept-current`: *at the writes or suggests level, /release refreshes the
README before drafting the notes, and when the README is still behind it lists what and asks
whether to release anyway.*

## Handover report

### Task completion

- Task 1, done. Commit `1520cf6`. Self-check last line: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 2, done. Commit `ad50938`. Same verdict, and the framework section printed `caught operator-page-closeout: framework/workflow.md planted`.
- Task 3, done. Both probes passed. The scratch folder `/tmp/tropis-release-readme-probe` was deleted afterwards.
- Task 4, done, in the checks below. This commit adds the report.

Task 3. Tool: Claude Code `2.1.300` (`claude --version`). Machine: dev-laptop.local, Darwin 25.2.0, arm64 (Apple M1 Pro). Each run was a new process, `claude -p --dangerously-skip-permissions`, in the scratch project, with this prompt and no other:

> This is a probe and its output will be discarded. Run /release. When it asks whether to release anyway, answer yes yourself. Stop at Stage 4: print its summary and do not commit or push the notes. Then tell me what you did about the README and in what order.

The project was a `git init -b main` with a bare repository as `origin`, this branch's `scripts/set-up-project.sh`, `npm --prefix .tropis install` (`added 268 packages`), the release command's project-owned block filled with trigger `echo release <bump>`, `templates/RELEASES.md` copied to `RELEASES.md`, and the Greeter fixture at `level: suggests`. That tree was committed and pushed as `afabd6e`. `git status --porcelain` was empty and `HEAD` equalled `origin/main` before the first session.

**suggests.** Before: log `afabd6e`, status empty, `README.md` sha256 prefix `b5b79cf554121f65990cbb334ae1224be050e951`. After: log still `afabd6e`, status empty, same README hash. The session ran the README stage first, reported all eight skeleton sections missing, answered yes to releasing anyway, and stopped at Stage 4. The summary line was `README: behind, released anyway: What it is, What it does for you, Who it is for, Getting started, How it works, Using it day to day, Where it stands, Where to go next`. It said `RELEASES.md` was unchanged. **Pass.**

**manual.** A commit set `level: manual` and was pushed: `7216e7e`. Before the second session, status was empty and `HEAD` equalled `origin/main`. After: log still `7216e7e`, status empty, README hash unchanged. The session read the level, skipped the README stage, did not run `/refresh-readme`, and did not ask whether to release anyway. The summary line was `README: not kept by Tropis`. **Pass.**

### Verification results

`bash scripts/check-blueprint.sh` at `ad50938`, before this handover commit:

```
Checking ad50938 of ~/src/tropis-release-readme

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      stale-picks            doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.

Framework repository: its own guards must pass here and fail on a planted defect

  caught      operator-page-closeout: framework/workflow.md planted
  caught      operator-page-closeout: PORTABILITY-NOTES.md planted
  caught      readme-usable: README.md planted
  caught      readme-usable: PORTABILITY-NOTES.md planted

Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

`npm --prefix .tropis test` at the same commit:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.583 s
Ran all test suites.
```

`git diff --stat origin/main...HEAD` before this handover commit:

```
 RELEASES.md            |  7 +++++++
 commands/release.md    | 13 +++++++++++++
 framework/workflow.md  |  2 +-
 guards/release.test.js | 37 +++++++++++++++++++++++++++++++++++++
 4 files changed, 58 insertions(+), 1 deletion(-)
```

### Scope

Every path in that stat is in the File Structure table. This commit adds the handover to this plan, which is in the table. Nothing under `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md` was edited. The project-owned block in `commands/release.md` was not edited. `commands/refresh-readme.md`, `scripts/`, and every guard other than `guards/release.test.js` were not edited.

### Judgment calls

- The probe ran as `claude -p --dangerously-skip-permissions` so the session could use tools. The plan said a fresh Claude Code session and one prompt; it did not name the flags.
- The catalog replaced the template's example entry with `port-option`. The template says to replace that entry. `modules` points at `README.md`, which exists in the fixture. The plan named the entry and not the other required fields.
- The brief is five lines, which is how the first README plan's Task 5 wrote the Greeter fixture this plan points at.
- The release command's project-owned block was filled with a run-from line, the notes file, readers, a breaking rule, the trigger `echo release <bump>`, and where the run is watched. The plan named the trigger.

### What the plan got wrong

Nothing that changed the work. The command text and the workflow row were where the plan said they were. Stage 1 did need a remote: with the bare `origin` and `main` pushed, pre-flight found the branch equal to `origin/main`. The suggests session could not list pull requests, because `gh` does not treat that bare path as a GitHub remote; it said so and continued. The command tells it to list them and ask, and the pass criteria do not depend on that list.

### Outstanding

None. This plan delivers nothing; the reviewing session ships `product-readme-is-kept-current` when the last of the three plans merges. Plans 2 and 3 may also append to `RELEASES.md`; this section was appended at the end. The branch is handed over as a pull request and is not merged from here.

## Review record

Reviewer: the specifying session, Claude Code desktop (Opus 5.5), on the developer's MacBook Pro,
Darwin 25.2.0.

### Checks re-run

- At `5e26918`, with no other self-check running: `bash scripts/check-blueprint.sh` →
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.`; `npm --prefix .tropis test` →
  `Tests: 28 passed, 28 total`.
- The tightened guard against mutated copies of `commands/release.md`: deleting "On yes, go
  on, and remember what is behind for Stage 4." → `Tests: 1 failed, 30 passed, 31 total`;
  moving the README stage before pre-flight → `Tests: 1 failed, 30 passed, 31 total`.
- **Fresh-agent check, re-run against the stage as fixed** (Claude Code CLI 2.1.300,
  the developer's MacBook Pro, Darwin 25.2.0 arm64; `claude -p` limited to Read, Glob, Grep and
  git, gh, cat, ls, test commands), in a scratch project set up from this branch with a bare
  `origin`, the Greeter fixture at `suggests`, and the release command's block filled with a
  harmless trigger. Prompt: "This is a probe and its output will be discarded. Run /release.
  When it asks whether to release anyway, answer yes yourself. Stop at Stage 4: print its
  summary and do not commit or push the notes. Then tell me what you did about the README and
  in what order relative to the pre-flight check." Answer: pre-flight ran and passed first;
  only then it read the level, ran `/refresh-readme` (report only), found every section
  behind, answered yes, and the summary read `README: behind, released anyway: all sections —
  …`. `HEAD` unchanged, tree clean. **Pass.** At `manual`: it skipped the step, the summary
  read `README: not kept by Tropis`, nothing committed. **Pass.** Scratch folder deleted.

### Found

An independent review at `2359ab0` found that the README step ran before pre-flight, so its
`git push origin main` could carry unpushed commits past the check that exists to stop them,
or strand a README commit on another branch. With smaller gaps: no instruction when the
refresh stops on its own, a guard that could not fail on half of the behaviour, an unknown
level only implied, and the workflow's `/release` paragraph and the release note silent or
narrow. **Fixed here by the reviewer**, with the developer's approval: the stage is now
Stage 1b, after pre-flight, pushing only its own commit; the guard pins every clause, its
position and every Stage 4 value. A fresh re-check of that fix confirmed all six fixed and
found the workflow line overclaiming a push on every release; fixed in `5e26918`. The
fresh-agent check, recorded by the executor against the old order, was re-run above.

### Outstanding disposition

- Two edge cases from the re-check, dropped as entries: a writes refresh whose developer
  says no at a second ask may leave `README.md` changed — moved into the follow-up of the
  fact-check plan, which edits `/refresh-readme` (one line: restore on that no); a push
  rejected because `main` moved during pre-flight's question prints git's error, which the
  agent sees, so it does not fail silently.

### Learnings routed

- A step added in front of a command's pre-flight inherits none of its guarantees: none
  beyond this command; the fix is the ordering itself.

### Merged because

The step runs after pre-flight, every clause is pinned by a test that fails without it, and
a fresh agent followed the new order at both levels.
