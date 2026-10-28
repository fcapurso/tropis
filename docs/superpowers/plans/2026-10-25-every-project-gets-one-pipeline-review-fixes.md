# The first update offers the pipeline, and a cancelled run never deploys — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first.
> **This plan continues an open branch and pull request
> (fcapurso/tropis#121). It does not start a new one.** Nothing in it needs the developer.

**Goal:** a project's first `/update` onto this release offers the pipeline, and a run
cancelled after the gate decided never deploys.

**Spec:** the entry `setup-offers-ci-for-its-host` in `feature-catalog.yaml`, criterion 8:
"Setup offers a new project the small workflow file that calls the pipeline, and /update
offers an existing project the same, listing the steps to adopt it." Also the first plan
on this branch, `docs/superpowers/plans/2026-10-25-every-project-gets-one-pipeline.md`.
Read its Decisions and its handover report.

**What the review found, at `3ac97c4`, each checked by the specifying session:**

1. **The first `/update` onto this release cannot offer the pipeline.** A running
   `/update` follows the project's installed `.claude/commands/update.md`, which is the
   held release's copy. So the new Stage 6 item 6 only takes effect from the next release.
   What the held copy does with release notes is in its Stage 6 item 5:

   - it does each **required** by-hand step, and asks the user when the step needs their
     judgement;
   - it only prints an `Optional:` step.

   This branch's `RELEASES.md` step is
   `**1. Optional: run your checks through the pipeline.** /update offers this.`. It is
   printed, never offered, and its second sentence is false.

   Fresh-agent probe 1 could not show this, because its release left the notes under
   `## [Unreleased]`. `stepsBetween` in `scripts/update.mjs` reads only
   `## [x.y.z] — ` headings. The entry was promoted to `shipped` with criterion 8 unbacked.
2. **A cancelled run can still deploy.** `templates/github/tropis-pipeline.yml` gives
   `deploy` the condition `always() && needs.gate.outputs.deploy == 'run'`. `always()` is
   true after a cancellation, so a run cancelled once the gate has said `run` deploys
   anyway. `!cancelled()` keeps what `always()` was added for, and stops the deploy when
   the run is cancelled. `always()` was added so that skipped empty stages do not make
   the deploy's implicit `success()` false. `guards/pipeline.test.js` asserts `always()`
   in the deploy condition (around line 617).

**Model tier: Small–medium.** Every edit is given. The probe needs care in setup.

**Requires:** GitHub CLI signed in with access to the developer's account, and any current Claude Code CLI for the probe in Task 3 (record which).

**Merge authority: parent review.** The specifying session reviews and merges the whole
branch.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-pipeline-fixes plan/setup-offers-ci-for-its-host` |

## Global Constraints

- **Work on the existing branch** `plan/setup-offers-ci-for-its-host`, and push to it.
  Do not open another pull request, and do not merge.
- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`** in this repository.
- **Push only to this branch and to `fcapurso/tropis-pipeline-probe`.** Tags made in
  Task 3 are fixtures in a scratch clone, and are never pushed.
- **Do not lower, skip or delete a guard to get green.** Every commit has a body.

## Traps

- **The step stays required even though a project may say no.** `commands/release.md`
  marks a step `Optional:` when a project may skip it. Here, the old `/update` must put the
  question, and only a required step makes it do that. Its Stage 6 item 5 already allows a
  no ("A required step the user declines is not done; report it at the end"). Do not mark
  the step optional.
- **The probe's notes must sit under a version heading**, or the probe tests nothing
  (Finding 1).
- **The self-check reads committed content only.** Commit before running it.

## File Structure

| File | Change |
|---|---|
| `RELEASES.md` | the by-hand step, Task 1 |
| `templates/github/tropis-pipeline.yml` | the deploy condition and its comment, Task 2 |
| `guards/pipeline.test.js` | the deploy condition assertion, Task 2 |
| `feature-catalog.yaml` | the comment above the entry, Task 4 |
| `docs/superpowers/plans/2026-10-25-every-project-gets-one-pipeline-review-fixes.md` | the handover report |

## Tasks

### Task 1 — The notes offer the pipeline

In `RELEASES.md`, under `## [Unreleased]`, `### After updating: what to do by hand`,
replace step 1 and its paragraph with the following, wrapped to the file's width:

```
**1. Offer the pipeline.** When no file in `.github/workflows/` names
`tropis-pipeline.yml` or `project-pipeline.yml`, ask whether to add the pipeline.
On yes, write `.github/workflows/pipeline.yml` from
`.tropis/templates/pipeline-caller.yml`, and `pipeline/prose.txt` holding the two
lines `README.md` and `docs/`. Then list the steps to adopt it: move each check your
CI runs today into `pipeline/<stage>.sh`; list your prose in `pipeline/prose.txt`;
push a branch, open a pull request and read the run summary; once it is green,
delete the old workflows whose work moved. On a host other than GitHub, show
`node .tropis/scripts/pipeline.mjs commands` instead: those are the commands to put
in that host's CI. A no is fine; nothing else depends on it.
```

Commit.

### Task 2 — A cancelled run never deploys

1. In `guards/pipeline.test.js`, change the deploy assertion. The condition must contain
   `!cancelled()` and must not contain `always()`. It still contains
   `needs.gate.outputs.deploy == 'run'`.
2. Run it, and see it fail.
3. In `templates/github/tropis-pipeline.yml`, change the condition to
   `${{ !cancelled() && needs.gate.outputs.deploy == 'run' }}`. Rewrite the comment above
   the job to say why: a condition with no status function is combined with
   `success()`, which is false once an empty stage was skipped; and `!cancelled()`
   rather than `always()`, so a cancelled run does not deploy.
4. Run the guard, and see it pass.
5. Commit.
6. Clone `fcapurso/tropis-pipeline-probe` into the system temp directory. Copy the new
   template over its `.github/workflows/tropis-pipeline.yml`, commit it, and push it to
   its `main`. Wait for the run with
   `gh run watch`. Record its URL and the `deploy` job's conclusion (expected: success,
   its log contains `deployed`).

### Task 3 — Probe the first update

All of this in the system temp directory, outside any repository:

1. Clone this branch to `<tmp>/source` and remove its `origin`.
2. Tag `7d7d725` (`main` before this branch) as `v0.5.0`.
3. Create a scratch branch at this branch's head. On it, run
   `node .github/scripts/release.mjs promote RELEASES.md 0.6.0 2026-10-25`, so that the
   notes sit under `## [0.6.0] — 2026-10-25`. Commit, and tag that commit `v0.6.0`.
4. `git init` `<tmp>/project` with a `src/app.js`. Set it up with
   `<tmp>/source/scripts/set-up-project.sh` at `v0.5.0` (check out the tag first).
   Run `npm --prefix .tropis install`, and commit.
5. Add an `origin` to the project that names `github.com` (any URL will do, since
   nothing is pushed), so that the step takes the GitHub branch.
6. In the project, start a fresh `claude -p` session with no other context, and send:
   "This is a probe; the project and the release are throwaway. Run /update. When it
   asks whether to update, say yes. Say yes to anything it offers."
7. Expected:
   - it asks about the pipeline;
   - the update commit holds `.github/workflows/pipeline.yml` and `pipeline/prose.txt`;
   - the four adoption steps are printed;
   - `npm --prefix .tropis test` passes in the project.
8. Reset the project and run it again, saying no to the pipeline. Expected: the update
   commits without `pipeline.yml`, and reports the step as declined.

Record tool, version and machine, and each outcome. If a run does not do what is
expected, fix the step's text and run it again, and report each round. Delete the
scratch folders.

### Task 4 — The record

1. Update the comment above `setup-offers-ci-for-its-host` so that it names the commit
   recording Task 3, and says that the first update offers the pipeline through the
   release notes.
2. If Task 3 did not pass, set the entry back to `building` instead, and say why in the
   comment.
3. Run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`.
4. Commit. The body states:
   - criterion 8 and what now backs it (the probe in this commit, and the
     `release.test.js` phrases);
   - `Fresh-agent check: <outcome, with tool, version and machine>`.

### Task 5 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names,
including the probe push's run URL. Commit, and push the branch. Do not merge.

## Handover report

### Task completion

Tasks 1–5 are done. Nothing in the plan needed the developer. This session does not merge.

### Verification results

Task 2, the deploy assertion, before the template change:

```
node --experimental-vm-modules node_modules/.bin/jest --config templates/framework-jest.config.js --rootDir . guards/pipeline.test.js --no-coverage -t "gives each stage its own job"
```

```
Expected substring: "!cancelled()"
Received string:    "${{ always() && needs.gate.outputs.deploy == 'run' }}"
Tests:       1 failed, 40 skipped, 41 total
```

The same file after the condition change, without the name filter:

```
Tests:       41 passed, 41 total
```

Probe repository `fcapurso/tropis-pipeline-probe`. The template copy alone failed the install check, so deploy was held. The fingerprint update touched only `.tropis/`, so that push skipped deploy. An empty commit is a full run, and that push deployed.

| Push | URL | deploy |
|---|---|---|
| template only | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40186605133 | skipped; run failed. installed-files: `.github/workflows/tropis-pipeline.yml` was changed after it was installed |
| fingerprint only | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40186718107 | skipped; run success. sanity, unit, integration, end-to-end and deploy skipped |
| empty commit | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40186772824 | success. The log contains `deployed`. sanity, integration and end-to-end skipped; unit passed |

Task 3, Claude Code 2.1.300 (`claude --version`), dev-laptop.local, Darwin 25.2.0 arm64. Each session was `claude -p --permission-mode bypassPermissions --setting-sources project --strict-mcp-config --no-session-persistence` in the throwaway project.

Yes, commit `2a2706c` on `update/v0.6.0`: `.github/workflows/pipeline.yml` and `pipeline/prose.txt` (`README.md` and `docs/`) are in the commit. The transcript printed the four adoption steps. `npm --prefix .tropis test`: 5 suites, 31 passed.

No, commit `c4f1654`: the stat has no `pipeline.yml` and no `prose.txt`. The body says `offer the pipeline: declined`.

Task 4, on `653ee2d`:

```
bash scripts/check-blueprint.sh
```

```
Every guard caught its defect and passed the clean baseline.
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

```
npm --prefix .tropis test
```

```
Test Suites: 5 passed, 5 total
Tests:       30 passed, 30 total
```

### Scope

`git diff --stat 3ac97c4...HEAD`, before this report: 4 files changed, 18 insertions, 9 deletions. `RELEASES.md`, `guards/pipeline.test.js`, `templates/github/tropis-pipeline.yml`, `feature-catalog.yaml`. Each is in the File Structure table. This commit adds the plan file, the last row.

`git diff --stat origin/main...HEAD` also lists the earlier plan's files. This branch continues that work. `origin/main` is `4cc5193`, which has this plan and not the pipeline. The merge-base is `7d7d725`.

Worktree: `~/src/tropis-pipeline-fixes`, branch `plan/setup-offers-ci-for-its-host`. The earlier checkout `~/src/tropis-pipeline` was detached so this worktree could hold the branch. It was clean apart from untracked `node_modules` and `package.json`.

### Judgment calls

The release-notes step is wrapped as the plan gave it. The longest line is 84 characters. The file's longest line is 90.

The probe's install record had to be updated with the copied workflow, which is what commit `62a79d8` did for the previous condition. A fingerprint-only push is framework files only and skips deploy, so the deploy observation is the empty commit, whose diff lists no paths and is a full run.

`node .github/scripts/release.mjs` was run from the scratch clone. An absolute path exited without writing: the script's main-module check did not match.

The fresh session used the flags the earlier update probe recorded, so it had the project and no other settings, and it could act.

The catalog comment cannot contain the hash of the commit that adds it. `c88dab6` records the probe. `653ee2d` names that commit.

The self-check reads committed content, so the catalog commits came before it. The task lists the check first.

### What the plan got wrong

Copying the template onto the probe and pushing it does not deploy. The framework stage fails the install check, and the gate holds deploy. Updating only the fingerprint then skips deploy, because that path is under `.tropis/`.

The plan file is on `main` and not on this branch. This commit adds it here. A rebase onto `main` meets the same file from both sides.

The promoted `## [0.6.0]` section starts at the by-hand heading, so there is no summary paragraph before it. Both sessions said so. The yes run used the section headings. The no run used the section text. The expected outcomes still held.

The step's condition is false once the take has installed `tropis-pipeline.yml`, which is a file that names it. Both sessions noticed, treated a mention in a comment as not counting, and still asked. The expected outcomes held, so the text was not changed.

### Outstanding

Parent review merges pull request 121. This session does not.

The two observations above — no summary paragraph before the by-hand heading, and a condition the installed workflow file already meets — are for that review. Both probe runs did what the task expected.

The probe repository stays, including the three pushes above. The scratch clone and the throwaway project were deleted. Tags made there were not pushed.

## Review record

Reviewed by the specifying session on 2026-10-25, Claude Code desktop on
dev-laptop.local.

### Checks re-run

- After rebasing onto `origin/main` (`4cc5193`): `bash scripts/check-blueprint.sh` ended
  `Self-check passed`. `npm --prefix .tropis test`: 30 passed.
- `guards/pipeline.test.js`: 41 passed. With `always()` put back in the deploy
  condition, 1 failed.
- Probe run 40186772824, read with `gh run view`: `deploy` succeeded on a full run, with
  three empty stages skipped.

### Found

- **The offer's condition could never be true.** It said "no file in
  `.github/workflows/` names `tropis-pipeline.yml`", in both the notes and
  `commands/update.md`. The take installs that file, and its header names
  `project-pipeline.yml`. Both probe sessions asked anyway, by reading past the
  condition. The wording was the specifying session's.
  - **Fixed on the branch by the reviewer,** as understood and mechanical: the condition
    is now a `uses:` line naming either file. Tropis's own files have none, and the
    caller template has one (checked with `grep -h "uses:"`).
- **The catalog comment named branch commit hashes,** which the rebase had already
  changed and the squash discards. Fixed by the reviewer: it now names the two handover
  reports.
- The add/add conflict on this plan file during the rebase was resolved to the branch's
  copy, which is the `main` text plus the handover report.
- No summary paragraph before the by-hand heading in `[Unreleased]`: `/release` writes
  the summary when it drafts the release. Not a defect of this branch.

### Outstanding disposition

None.

### Learnings routed

Covered in the first plan's review record. No other durable change.

### Merged because

The first update now offers the pipeline through a condition that can be met, a
cancelled run does not deploy, and the checks pass on the rebased branch.
