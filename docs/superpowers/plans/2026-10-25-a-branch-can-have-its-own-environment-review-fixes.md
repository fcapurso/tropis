# A closed pull request always removes its environment — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first.
> **This plan continues an open branch and pull request
> (fcapurso/tropis#122). It does not start a new one.** Nothing in it needs the developer.

**Goal:** closing a pull request removes its environment even when another branch now
maps to the same name. The close path's logic lives in the tested script, and the
operator guide's by-hand line creates the environment before deploying to it.

**Spec:** the entry `deploy-stage-offers-an-environment-per-branch` in
`feature-catalog.yaml`, and the first plan on this branch,
`docs/superpowers/plans/2026-10-25-a-branch-can-have-its-own-environment.md`. Read its
Decisions 1–5 and its handover report.

**What the review found, at `7242b4e`, each checked by the specifying session:**

1. **A collision can stop a removal.** On a closed pull request, the `plan` job in
   `templates/github/tropis-pipeline.yml` runs
   `node .tropis/scripts/pipeline.mjs environment "$HEAD_REF"`. That command calls
   `resolveEnvironment(root, branch)` with the default `checkCollision = true`
   (`environmentCommand` in `scripts/pipeline.mjs`).
   - **How it goes wrong:**
     1. A pull request opens on `Fix/A`, and its environment `fix-a` is created.
     2. Someone then pushes a branch `fix-a` with no pull request.
     3. When the first pull request closes, `plan` exits 1 on the collision.
     4. `branch-remove` (`needs: plan`) never runs, and the environment is left behind.
   - **What the plan meant:** Decision 3 says removal skips the collision check, and
     `branch remove` does skip it (`checkCollision: action !== 'remove'`). Only the
     `plan` job's name lookup does not.
2. **The close path is untested shell.** On `closed`, the `plan` step counts
   `pipeline/branch/*.sh` and writes the six `<stage>=skipped` lines in a bash loop
   inside the workflow. No test reaches it. The script's `branchSlot()` already
   classifies the slot, and nothing calls it on this path.
3. **The by-hand line skips create.** `templates/README.md` tells a person to run
   `node .tropis/scripts/pipeline.mjs branch deploy "$(git branch --show-current)"`. On a
   branch with no environment yet, that deploys to nothing. The first plan's fresh-agent
   probe ran `branch create` first by itself, and pointed this out. `create.sh` must
   tolerate running again (Decision 1), so create-then-deploy is always safe.

**Model tier: Small–medium.** Every change is given. The probe needs care in setup.

**Requires:** GitHub CLI signed in with access to the developer's account.

**Merge authority: parent review.** The specifying session reviews and merges the whole
branch.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-branch-env-fixes plan/deploy-stage-offers-an-environment-per-branch` |

## Global Constraints

- **Work on the existing branch** `plan/deploy-stage-offers-an-environment-per-branch`,
  and push to it. Do not open another pull request, and do not merge.
- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`** in this repository.
- **Do not change a pinned gate case or the `STAGES` pin.**
- **Push only to this branch and to `fcapurso/tropis-pipeline-probe`.** On the probe, do
  not force-push, and leave its existing pull requests alone.
- **Do not lower, skip or delete a guard.** Every commit has a body.

## Decisions

1. **`environment <branch> --no-check`** prints the name without listing the remote. Any
   other argument after the branch exits 2. Without the flag, behaviour is unchanged.
2. **`plan --closed`** prints six `<stage>=skipped` lines, then `branch=filled` or
   `branch=empty`.
   - It does not read the diff, and takes no `--base` or `--head`.
   - A partial slot exits 1 with the same message `plan` gives today, from
     `branchSlot()`.
3. **The workflow's close path** becomes two calls, with no shell loop:
   - `pipeline.mjs environment "$HEAD_REF" --no-check` into `environment`;
   - `pipeline.mjs plan --closed` into `$GITHUB_OUTPUT`.
   Every other path in the `plan` step stays as it is. The collision check still runs on
   opened, synchronize and reopened, where it belongs.
4. **The operator guide's by-hand sentence** in `templates/README.md` becomes, wrapped to
   the paragraph's width:

   ```
   deploy the branch you are on by creating its environment, then deploying to it:
   `node .tropis/scripts/pipeline.mjs branch create "$(git branch --show-current)"`,
   then the same with `branch deploy`. Create is safe to run again.
   ```

## Traps

- **The self-check reads committed content only.** Commit before running it.
- **The probe's collision needs a pushed branch with no pull request.** Opening a pull
  request for `fix-a` would make it a second, colliding pull request, which fails its own
  plan job and proves nothing about removal.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | Decisions 1 and 2 |
| `templates/github/tropis-pipeline.yml` | Decision 3 |
| `templates/README.md` | Decision 4 |
| `guards/pipeline.test.js` | Tasks 1 and 2 |
| `docs/superpowers/plans/2026-10-25-a-branch-can-have-its-own-environment-review-fixes.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `bash scripts/check-blueprint.sh` (expected: its last
line starts `Self-check passed`).

### Task 1 — The script

Test first, in `guards/pipeline.test.js`:

- `environment Fix/A --no-check`, against a bare `origin` that also holds `fix-a`, prints
  `fix-a` and exits 0. The same without the flag still exits 1 naming both.
- `environment Fix/A --other` exits 2.
- `plan --closed` with an empty slot prints the six skipped lines and `branch=empty`.
  With a filled slot it prints `branch=filled`. With two scripts it exits 1 naming the
  missing one.
- `plan --closed --base x` exits 2.

See each new test fail, then implement Decisions 1 and 2. Commit.

### Task 2 — The workflow and the guide

1. Extend the workflow parse test. The `plan` step's `run` text:
   - contains `plan --closed` and `--no-check`;
   - contains no `for script in`.
2. See it fail.
3. Apply Decision 3, and see it pass.
4. Apply Decision 4.
5. Run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`; both pass.
6. Commit.

### Task 3 — Probe the close with a collision

In a clone of `fcapurso/tropis-pipeline-probe` in the system temp directory:

1. Copy this worktree's `scripts/pipeline.mjs` to `.tropis/scripts/` and
   `templates/github/tropis-pipeline.yml` to `.github/workflows/`. Rewrite
   `.tropis/installed.json` with `node .tropis/scripts/record-installed.mjs`, keeping
   its version and source. Commit and push `main`.
2. Push a branch `Fix/A` that changes `src/app.js`, and open a pull request. Expected:
   `created fix-a`, then `deployed fix-a`.
3. Push a branch `fix-a` from `main`, with no pull request (Traps).
4. Close the `Fix/A` pull request without merging. Expected: `plan` succeeds,
   `branch-remove` logs `removed fix-a`, and no stage runs.
5. Delete the remote branches `Fix/A` and `fix-a`.

Record each run's URL, job conclusions and the echo lines. A result other than expected:
fix, re-run, and report each round.

No fresh-agent check: this plan changes no framework document or rule. The operator
guide's sentence is checked by the review.

### Task 4 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit, and push the branch. Do not merge.

## Handover report

### Task completion

Tasks 0 through 3 are done. Task 4 is this report.

No step needed the developer. The probe repository named in the plan exists and was already set up.

The close matched on the first attempt. There was no second round.

No fresh-agent check. This plan changes no framework document and no rule. The operator guide's sentence is for the review.

### Verification results

Commands were read on dev-laptop.local, macOS 26.2 (25C56), arm64, Node v22.15.0. Probe runs were read with GitHub CLI 2.102.0 (2026-09-30). The jobs ran on GitHub-hosted `ubuntu-latest`.

`bash scripts/check-blueprint.sh` at `7242b4e`, before these commits, ended:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

`guards/pipeline.test.js` at `895acd7`, with `node --experimental-vm-modules` and Jest from `.self-check/node_modules`, config `templates/framework-jest.config.js`: 1 suite, 61 tests, all passed. The blueprint root has no `package.json`, so that run used a temporary `{"type":"module"}` and a link to `.self-check/node_modules`, both removed afterwards and not committed.

`bash scripts/check-blueprint.sh` at `899a746` ended with the same self-check passed line. It printed `Checking 899a746`.

`npm --prefix .tropis test` at `899a746`: 5 suites, 30 tests, all passed.

The same pipeline guard at `9434189`, after the workflow assertions were tightened: 1 suite, 61 tests, all passed. `bash scripts/check-blueprint.sh` then printed `Checking 9434189` and ended with the same self-check passed line.

Probe, `fcapurso/tropis-pipeline-probe`. Job conclusions are from `gh run view --json jobs`. The echo lines are from `gh run view --log`.

| Step | Run | What the jobs did |
|---|---|---|
| Push of the script and workflow to `main` | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40208181914 | success. `deploy` logged `deployed shared`. `branch-create` and `branch-remove` skipped. |
| Open `Fix/A` | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40208199273 | success. `branch-create` logged `created fix-a` at `2026-10-25T15:42:35Z`. `deploy` logged `deployed fix-a` at `2026-10-25T15:43:51Z`. |
| Branch `fix-a`, no pull request | none | `gh pr list --head fix-a` printed nothing. `gh run list --branch fix-a` printed nothing. |
| Close `Fix/A`, not merged | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40208366173 | success. `plan` succeeded. `branch-remove` logged `removed fix-a` at `2026-10-25T15:44:42Z`. `framework`, `sanity`, `unit`, `integration`, `end-to-end`, `gate` and `deploy` skipped. |

The close run carries an annotation that `actions/checkout@v4` and `actions/setup-node@v4` target Node.js 20 and were forced onto Node.js 24. The jobs still succeeded. This plan did not change those actions.

### Scope

`git diff --stat 7242b4e..HEAD` before this commit: 5 files changed, 299 insertions, 44 deletions.

```
docs/superpowers/plans/2026-10-25-a-branch-can-have-its-own-environment-review-fixes.md
guards/pipeline.test.js
scripts/pipeline.mjs
templates/README.md
templates/github/tropis-pipeline.yml
```

Those are the File Structure table. This commit adds the report to the plan file, the last row.

`git diff --stat origin/main...HEAD` also lists `RELEASES.md`, the first plan, `docs/verification-log.md`, `feature-catalog.yaml`, `framework/DECISIONS.md` and `templates/pipeline-caller.yml`. Those belong to the open pull request this plan continues. This plan did not edit them. The merge-base with `origin/main` is still `dbf25ba`, before that work.

Worktree: `~/src/tropis-branch-env-fixes`, branch `plan/deploy-stage-offers-an-environment-per-branch`.

### Judgment calls

The review-fixes plan was commit `f73c6b7` on `main` only. This branch had diverged, so the file was cherry-picked as `1100d15`. `git patch-id --stable` is `291d391a20ad9b861ddf2f95c8e2bf34948547c0` for both commits, so a rebase onto `origin/main` can drop the duplicate.

`plan --closed --base x` already exited 2, because `--closed` was an unknown argument. The test also requires stderr to contain `--closed takes no other arguments`, which is the string the script now prints. Without that, the test could not go red.

The workflow guard, as the plan wrote it, stayed green if `--no-check` were used on every pull request, and if `plan --closed` were not written to `$GITHUB_OUTPUT`. It now requires `--no-check` on the closed branch only, the non-close branch to call `environment` without that flag, and `plan --closed >> "$GITHUB_OUTPUT"`. That assertion was watched fail by putting `--no-check` on the non-close branch, then watched pass with the branch restored. `guards/pipeline.test.js`: 61 passed. The self-check then passed at `9434189`.

The self-check was run after the commits it checks, including the workflow commit. The task lists the check and then the commit. A check of uncommitted content would have read the previous commit.

A fresh review of `7242b4e..899a746` (GPT-5.6 Sol, in this session) found no critical issue. Its important note that the handover was missing is this task. Its important note on the workflow guard is the commit above. An attempt to run that review on Claude Opus was blocked by the vendor and was not a review.

Environments for a pull request that closed before the slot was filled, Forge scripts, and the release candidate stay out of scope, as the first plan's handover said. Nothing in this diff changes that.

### What the plan got wrong

The plan file was not on this branch. Appending the handover required bringing `f73c6b7` across.

`plan --closed --base x` exits 2 before the feature exists. The test in Task 1 cannot fail on the status alone.

Task 2 runs `bash scripts/check-blueprint.sh` and then says to commit. The self-check reads committed content only, so that order passes against the previous commit.

### Outstanding

Parent review merges. This session does not. The pull request is https://github.com/fcapurso/tropis/pull/122.

Probe pull requests 2, 3 and 4 stay open. Probe pull request 7, https://github.com/fcapurso/tropis-pipeline-probe/pull/7, is closed and not merged. Remote branches `Fix/A` and `fix-a` are deleted.

## Review record

Reviewed by the specifying session on 2026-10-25, Claude Code desktop on
dev-laptop.local.

### Checks re-run

- `guards/pipeline.test.js` at `c60f621`: 61 passed. The planted defects:
  - `--no-check` ignored: 1 failed;
  - `plan --closed` printing `run`: 1 failed.
- Probe close run 40208366173: `plan` and `branch-remove` succeeded, the log says
  `removed fix-a`, and every stage job, `gate` and `deploy` were skipped. The
  repository's activity shows `fix-a` created at 15:44:20 and the removal at 15:44:42,
  so the collision existed when the pull request closed.
- After rebasing onto `origin/main` (`f73c6b7`, which drops the cherry-picked plan
  commit): the self-check and `npm --prefix .tropis test`, below.

### Found

- The executor tightened the workflow assertion beyond the plan, so that `--no-check`
  is required on the close path only. That was right. The plan's version would have
  passed with the collision check off everywhere.
- The guide now says create, then deploy.

### Outstanding disposition

None.

### Learnings routed

Covered in the first plan's review record. No other durable change.

### Merged because

Closing a pull request removes its environment despite a collision, the close path is
tested script rather than shell, and the guide's by-hand steps work on a branch with no
environment yet.
