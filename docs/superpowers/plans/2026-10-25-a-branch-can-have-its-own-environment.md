# A branch with an open pull request can have its own environment — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Two tasks stop for the developer (Tasks 5 and 7);
> each says what to check before stopping.

**Goal:** a project whose platform can create environments cheaply fills three scripts,
and the pipeline then gives each branch with an open pull request an environment of its
own. The environment is created when the pull request opens, deployed to on every green
push, and removed when the pull request closes. Today a pull request never deploys.

**Spec:** the entry `deploy-stage-offers-an-environment-per-branch` in
`feature-catalog.yaml`, its five criteria and the comment above it. Background is in the
first-adopter checkout: `docs/superpowers/specs/2026-10-22-pipeline-and-environments-design.md`,
section *Per-branch environments*. That section is about Forge, and Tropis stays generic.
Where it leaves a choice, *Decisions* below makes it. Do not reopen those decisions.

**Read first:** the pipeline this builds on was planned in
`docs/superpowers/plans/2026-10-25-every-project-gets-one-pipeline.md`. Read that plan's
Decisions, its follow-up `…-review-fixes.md`, and both review records. They record two
GitHub behaviours that cost a review round:

- inside a called workflow `$GITHUB_EVENT_NAME` is `workflow_call`, so the event comes from
  `github.event_name`;
- a job condition with no status function is combined with `success()`, which is false
  once any earlier job was skipped, so the deploy job uses `!cancelled()`.

**What the specifying session verified on 2026-10-25, against `main` at `7eb68da`:**

- `scripts/pipeline.mjs` exports `STAGES`, `FRAMEWORK_PATHS`, `matchesProse`,
  `isProseAndFramework`, `planStages`, `gateDecision` and `summaryTable`.
  - `gateDecision({ plan, results, event })` returns `held` when a stage did not pass,
    `skipped` for `event === 'pull_request'`, and otherwise `plan.deploy`.
  - `deployCell` writes `skipped — a pull request does not deploy` for a pull request.
  - `run <stage>` runs `pipeline/<stage>.sh` with the environment from `stageEnv()`,
    where `TROPIS_SECRETS` adds variables.
- `guards/pipeline.test.js` pins `STAGES` and a table of gate cases. Its failure messages
  say that changing the stage order or the gate is breaking. One pinned case is
  "the same results on a pull request do not deploy" (`expected: 'skipped'`).
- `templates/github/tropis-pipeline.yml` has these jobs: `plan`, `framework` (calling
  `tropis-framework-checks.yml`), `sanity`, `unit`, `integration`, `end-to-end`, `gate`
  (`if: always()`) and `deploy` (`needs: [gate]`,
  `if: ${{ !cancelled() && needs.gate.outputs.deploy == 'run' }}`).
  - The plan step reads base and head from `github.event.pull_request` on a pull request,
    and from `github.event.before` and `github.sha` on a push.
  - Nothing sets `concurrency`.
- `templates/pipeline-caller.yml` triggers on `push` to `main`, and on `pull_request` with
  `types: [opened, synchronize, reopened]`. A project owns its copy, so an update does not
  change it.
- `templates/README.md` has a section `## The pipeline`.
- `RELEASES.md` `## [Unreleased]` holds the pipeline's section and its by-hand step, so
  the pipeline is not released yet. Check this again at Task 6 (Traps).
- `framework/DECISIONS.md` ends at FW-028.
- The probe repository of the last plan, `fcapurso/tropis-pipeline-probe`, is archived and
  cannot be pushed to. This plan uses a new one (Task 5).

**Model tier: Medium.** The design is decided. GitHub's concurrency and event handling
need debugging inside it.

**Requires:** GitHub CLI signed in with access to the developer's account, and any current Claude Code CLI for the fresh-agent check in Task 6 (record which).

**Merge authority: parent review.** The GitHub runs need the developer to look at them, and
the change reaches every project's pipeline.

Do not store a kick-off prompt on this plan.

---

## Delivers

deploy-stage-offers-an-environment-per-branch

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-branch-env -b plan/deploy-stage-offers-an-environment-per-branch` |
| `first-adopter` | do not edit | |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`** in this repository. The pipeline's sources live under `templates/`.
- **Add no dependency.** Use `node:` modules, and `yaml` in guards.
- **Do not change a pinned gate case or the `STAGES` pin.** Add cases only (Decision 4).
- **Push only to this plan's branch and to the probe repository of Task 5.** Do not merge.
- **Do not lower, skip or delete a guard.** Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-25.

### 1. The slot: `pipeline/branch/`

- The project fills the slot with three scripts: `pipeline/branch/create.sh`,
  `pipeline/branch/deploy.sh` and `pipeline/branch/remove.sh`.
- The slot is **filled** when all three exist, and **empty** when none do. Anything in
  between is an error: `plan` exits 1 naming the missing scripts, so the run fails at its
  first job.
- Each script runs with `bash` from the project root. It gets the `stageEnv()`
  environment plus two variables:
  - `TROPIS_ENVIRONMENT`, the environment's name;
  - `TROPIS_BRANCH`, the branch.
- `create.sh` must succeed when the environment already exists (a reopened pull request),
  and `remove.sh` must succeed when it does not. The operator guide says so. Tropis does
  not check it.
- `pipeline/deploy.sh` is unchanged. It is the shared development environment, deployed
  on a push to `main`.

### 2. The name rule

`environmentName(branch)`, exported from `scripts/pipeline.mjs`:

1. Lowercase the branch name.
2. Replace every run of characters outside `[a-z0-9]` with one `-`, and trim `-` from
   both ends.
3. If the result does not start with a letter, prefix `b-`.
4. If it is longer than 24 characters, keep its first 17 characters, trim a trailing
   `-`, and append `-` and the first 6 hex characters of the SHA-1 of the original
   branch name.
5. An empty result (a branch of only symbols) is an error.

Example: `plan/setup-offers-ci-for-its-host` becomes `plan-setup-offers` plus `-` and six
hex characters. The test pins this example with its real hash.

`node .tropis/scripts/pipeline.mjs environment <branch>` prints the name. It is how a
person or an agent works the name out by hand.

**Collisions.** `environment` and `branch create|deploy` list the remote's branches with
`git ls-remote --heads origin`, and name each one. If another branch gets the same name,
they exit 1 and name both branches. A branch with no `origin` checks nothing, which
covers a local run.

### 3. Commands

- **`branch <create|deploy|remove> <branch>`** works out the name, checks for a collision
  (create and deploy only), and runs `pipeline/branch/<action>.sh` with Decision 1's
  environment. It exits with the script's status. When the slot is empty, it prints
  `branch: empty — no pipeline/branch/` and exits 0.
  - By hand: `node .tropis/scripts/pipeline.mjs branch deploy "$(git branch --show-current)"`.
- **`plan`** prints one more line after the six stages: `branch=filled` or
  `branch=empty`. Partial slot: Decision 1.
- **`gate`** takes `--branch filled|empty`. `commands` lists the branch commands, each
  with its `#` comment saying when to run it.

### 4. The gate

`gateDecision({ plan, results, event, branch })`:

- `held`: unchanged.
- For a pull request:
  - `skipped` when `plan.deploy` is `skipped` (prose and framework only);
  - `run` when `branch` is `filled`;
  - `skipped` otherwise.
- For a push: unchanged.

`branch` defaults to `empty`, so **every pinned case keeps its expected value**. That is
why this release is not breaking: given the same inputs, the gate decides as before.
Add cases for a filled slot:

- a green pull request runs;
- a pull request with prose and framework only skips;
- a failed stage holds;
- a push ignores the slot.

The summary's deploy row on a pull request says one of:

- `will run — to the branch's environment`;
- `skipped — no pipeline/branch/`;
- `skipped — only prose and framework files changed`.

### 5. The GitHub wiring

In `templates/github/tropis-pipeline.yml`:

- **`plan`** also runs when the pull request is closed. When `github.event.action` is
  `closed`, it does not call `pipeline.mjs plan`, and sets every stage output to
  `skipped`.
  - On every pull request event it also sets an output `environment`, from
    `pipeline.mjs environment "$HEAD_REF"`, with `HEAD_REF` set to
    `github.event.pull_request.head.ref`.
  - It sets `branch` from the plan line, or by checking for the three scripts on a
    close.
  - A collision fails this job.
- **`framework`** gets `if: github.event.action != 'closed'`. The stage jobs already skip
  through their own conditions.
- **`gate`** becomes `if: always() && github.event.action != 'closed'`, and passes
  `--branch`.
- **`branch-create`**, a new job:
  - `needs: plan`;
  - runs when the event is a pull request, the action is `opened` or `reopened`, and
    `branch` is `filled`;
  - runs `pipeline.mjs branch create "$HEAD_REF"`.
  It does not wait for the stages: opening a pull request creates the environment.
- **`deploy`**:
  - `needs: [plan, gate, branch-create]`;
  - `if: ${{ !cancelled() && needs.gate.outputs.deploy == 'run' && needs.branch-create.result != 'failure' }}`;
  - on a pull request it runs `branch deploy "$HEAD_REF"`, and otherwise `run deploy`.
- **`branch-remove`**, a new job:
  - `needs: plan`;
  - runs when the action is `closed` and `branch` is `filled`;
  - runs `branch remove "$HEAD_REF"`.
- **Concurrency.** `branch-create`, `deploy` and `branch-remove` share
  `concurrency: { group: tropis-env-${{ github.repository }}-${{ needs.plan.outputs.environment || 'shared' }}, cancel-in-progress: false }`.
  - At most one runs per environment.
  - A newer pending job replaces an older pending one.
  - A running one is never cancelled.
  - Confirm this behaviour against GitHub's documentation for `concurrency`, and record
    the page in the handover.
- Each new job passes `TROPIS_SECRETS` as the stage jobs do.

In `templates/pipeline-caller.yml`, add `closed` to the `pull_request` types, and add a
comment saying that `closed` is what removes a branch's environment.

### 6. Documents

- **`templates/README.md`**, `## The pipeline`: one paragraph on the slot. It covers the
  three scripts and the two variables, that `create.sh` and `remove.sh` must tolerate
  being run again, the name rule in one sentence, the `environment` and `branch deploy`
  commands, and that removal needs `closed` in `pipeline.yml`'s `pull_request` types.
- **`framework/DECISIONS.md`**, FW-029, *A branch's environment is named from the branch
  and lives as long as its pull request*:
  - **Decision:** Decisions 1, 2 and 5 in three sentences.
  - **Evidence:** the first-adopter design and its Forge spike of 2026-10-22, which
    created, deployed, installed, uninstalled and deleted an environment from CI.
  - **Rejected:**
    - a name chosen at creation and stored somewhere: it cannot be worked out by hand;
    - creating the environment on the first green push: an opened pull request would
      have nothing to try until its stages passed;
    - an environment per branch without a pull request: a pushed branch would cost an
      environment nobody asked for.
  - **Consequences:** a project's existing `pipeline.yml` needs `closed` added by hand to
    remove environments; the gate decides as before unless the slot is filled.
- **`RELEASES.md`**, `## [Unreleased]`: a section *Each pull request can have its own
  environment*, written to the shape in `commands/release.md` Stage 3. Add a by-hand step
  to the existing `### After updating` list, numbered after the steps already there:
  `**<n>. Optional: give each pull request its own environment.**` The step says to fill
  `pipeline/branch/`, add `closed` to `pull_request` types in
  `.github/workflows/pipeline.yml`, and read the operator guide.

## Traps

- **The self-check reads committed content only.** Commit before running it.
- **The gate pin.** Do not edit an existing case's `expected`. If one has to change, the
  gate decides differently and the release is breaking. Stop and hand back to the
  specifying session.
- **A release may land before this merges.** At Task 6, check whether `RELEASES.md` still
  has the pipeline's section under `## [Unreleased]`. If a version heading now sits above
  it, the pipeline was released. Write this section and step under `[Unreleased]` as
  usual, and say in the handover that the step must name `pipeline.yml` as it shipped.
- **`TROPIS_SECRETS` holds secrets.** Never print it, its keys or its values.
- **Push only to the probe repository of Task 5**, and do not change its settings.
- **A push that adds a workflow needs the `workflow` scope.** If the probe push is
  refused for that, print `gh auth refresh -s workflow` for the developer and stop.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | Decisions 1–4 |
| `templates/github/tropis-pipeline.yml` | Decision 5 |
| `templates/pipeline-caller.yml` | `closed`, Decision 5 |
| `guards/pipeline.test.js` | Tasks 1–4 |
| `templates/README.md` | Decision 6 |
| `framework/DECISIONS.md` | FW-029 |
| `RELEASES.md` | Decision 6 |
| `docs/verification-log.md` | the entry `/manual-check` writes in Task 7 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-25-a-branch-can-have-its-own-environment.md` | the handover report |

Other guards may fail because of the change: `framework-integrity`, `check-drift`,
`operator-page-closeout`, or the fixtures. If one does, fix it, list the file in the
handover's *Scope* with the reason, and say so under *What the plan got wrong*.

## Review Focus

Each line below is pinned by a test in Tasks 1–4. They are listed so that review checks
them first.

1. Two branches that differ only in case or punctuation (`Fix/A` and `fix-a`) collide.
   Both are named, and the command exits 1.
2. A branch longer than 24 characters is truncated with a hash. Two long branches that
   share their first 17 characters do not collide.
3. A slot with two of the three scripts fails `plan` and names the missing one.
4. A closed pull request with an empty slot runs no removal, and runs no stage.
5. A green pull request with a filled slot, where the change was prose only, does not
   deploy.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: its last line starts `Self-check passed`).

### Task 1 — The name rule

Test first, in `guards/pipeline.test.js`:

- `environmentName` on a plain branch, `plan/setup-offers-ci-for-its-host` (pin the full
  result), a branch starting with a digit, and Review Focus item 2;
- a branch of only symbols throws;
- `environment` against a temporary repository with a bare `origin`, holding branches
  `Fix/A` and `fix-a`: exits 1 naming both (Review Focus item 1);
- without an `origin`: prints the name.

Implement. Commit.

### Task 2 — The slot and `branch`

Test first:

- `plan` prints `branch=empty` with no `pipeline/branch/`, and `branch=filled` with all
  three scripts;
- `plan` exits 1 naming the missing script (Review Focus item 3);
- `branch deploy <b>` runs `deploy.sh` with `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` set
  (the script writes them to a file the test reads);
- `branch remove` skips the collision check;
- `branch create` with an empty slot prints the empty line and exits 0;
- `TROPIS_SECRETS` reaches the script as it does a stage.

Implement. Commit.

### Task 3 — The gate

Add the four filled-slot cases to the gate table, plus Review Focus item 5. Leave every
existing case as it is. Extend the summary test for the three deploy-row phrases on a
pull request. Implement `branch` in `gateDecision`, `deployCell`, the `gate` command and
`commands`. Commit.

### Task 4 — The workflow

1. Confirm the `concurrency` behaviour of Decision 5 against GitHub's documentation.
2. Extend the workflow parse test:
   - the job ids now include `branch-create` and `branch-remove`;
   - the `deploy` condition contains `!cancelled()`, the gate output and
     `needs.branch-create.result != 'failure'`;
   - the three environment jobs share one concurrency group with
     `cancel-in-progress: false`;
   - `framework` and `gate` exclude `closed`;
   - the caller template's `pull_request` types include `closed`, and its `push`
     branches are exactly `[main]`.
3. Write the workflow changes. Commit.

### Task 5 — Run it on GitHub (stops for the developer if the probe repository is missing)

1. **Look first.** Run
   `gh repo view fcapurso/tropis-branch-env-probe --json name,isPrivate`.
   - If it fails, print this for the developer and stop: "Create an empty private GitHub
     repository `fcapurso/tropis-branch-env-probe` with no README, for a throwaway probe
     of per-branch environments. Done looks like:
     `gh repo view fcapurso/tropis-branch-env-probe` succeeds."
   - On resumption, run the same check again.
2. In the system temp directory, set up a project from this worktree as the last plan's
   Task 7 did. Give it `pipeline/unit.sh` passing and `pipeline/deploy.sh` echoing
   `deployed shared`. Fill the slot:
   - `create.sh` echoes `created $TROPIS_ENVIRONMENT`;
   - `deploy.sh` runs `sleep 45`, then echoes `deployed $TROPIS_ENVIRONMENT`;
   - `remove.sh` echoes `removed $TROPIS_ENVIRONMENT`.
   Commit and push `main`.
3. Record each run with `gh run view --json jobs`, the relevant job logs, and the gate
   summary. Do these in order:
   - **Open:** branch `feature/try-it`, which changes `src/app.js`. Open a pull request.
     Expected: `branch-create` logs `created feature-try-it`, then `deploy` logs
     `deployed feature-try-it`.
   - **Queue:** push three commits to it within ten seconds. Expected: never two
     `deploy` jobs running at once. A middle deploy is cancelled while still pending. The
     last one runs.
   - **Close:** close the pull request without merging. Expected: `branch-remove` logs
     `removed feature-try-it`, and no stage runs.
   - **No pull request:** push a branch `no-pr` and open nothing. Expected: no run.
   - **Merge:** open and merge a second pull request. Expected: its close removes its
     environment. The push to `main` runs `deploy` with `deployed shared`, and no branch
     job.
4. A result other than expected: fix and re-run that step, and report each round.

### Task 6 — Documents and checks

Apply Decision 6, including the Traps check on `RELEASES.md`. Run
`bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`; both pass. Commit.

Fresh-agent check: in a scratch project set up from this branch, with the slot filled by
echo scripts and no other context, start a fresh `claude -p` session. Tell it the work is
a probe whose output is discarded, and ask: "Deploy the branch I am on to its own
environment, by hand." Expected: it runs `pipeline.mjs branch deploy` with the current
branch, or works the name out with `environment` first. Record tool, version, machine and
outcome. If it does not find the commands, fix the operator guide and run it again.

### Task 7 — The GitHub check by the developer (stops)

1. **Look first.** If `docs/verification-log.md` already has an entry for per-branch
   environments recorded `pass`, carry on.
2. Otherwise, run `/manual-check`. Draft steps for the developer to open the runs of
   Task 5:
   - see the create and deploy jobs on the opened pull request;
   - see the cancelled middle deploy;
   - see the remove job on the close;
   - see the shared deploy on `main`.
   It writes the entry as `pending`. Stop and hand over.
3. On resumption, read the entry again. Proceed only on `pass`. On `fail`, hand back to
   the specifying session with what the developer saw.

### Task 8 — The entry

1. Set `deploy-stage-offers-an-environment-per-branch` to `shipped`.
2. Fill `modules` with `scripts/pipeline.mjs` and `templates/github/tropis-pipeline.yml`.
3. Add a comment above the entry naming this plan's handover report. Do not name a
   commit hash: a squash-merge discards them.
4. Run `npm --prefix .tropis test`.
5. Commit. The body says, for each criterion, what backs it:

| Criterion | Backed by |
|---|---|
| 1 the optional three-script part | Task 2 tests; the operator guide |
| 2 create on open, deploy on green, remove on close, none without a pull request | Task 3 gate cases; the workflow parse test; Task 5 open, close, no pull request; the verification-log entry |
| 3 the name rule, by hand, collisions fail | Task 1 tests; the fresh-agent check |
| 4 no two deploys at once, a waiting one replaced | the concurrency parse test; Task 5 queue; the verification-log entry |
| 5 a push to `main` deploys to the shared environment | Task 3 push case; Task 5 merge |

   Then add a line to the commit body: `Fresh-agent check: <from Task 6, with tool, version and machine>`.

If a criterion has no backing, leave the entry at `building` and say so.

### Task 9 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit it, push the branch, and open a pull request against `main`. Do not merge.

## Not in this plan

- Anything Forge-specific: first-adopter fills the slot (`holds-tropis-branch-environments`
  there).
- Removing an environment whose pull request closed before the slot was filled.
- The release candidate (`release-is-rehearsed-on-a-candidate`).

## Handover report

### Task completion

Tasks 0 through 8 are done. Task 9 is this report.

Task 5 used `fcapurso/tropis-pipeline-probe`. The repository named in the plan did not exist; the developer pointed at this one. It was already a set-up project. Its `main` was updated in place and pushed, not force-pushed. Pull requests 2, 3 and 4 were left open.

The queue step took two rounds. The first, three pushes inside five seconds, registered two runs and cancelled nothing. The second registered three runs. Its pushes were about three seconds apart and the span was twelve seconds. That round matched the expected concurrency. The close, the branch with no pull request, and the merge matched on the first attempt.

At Task 6, `RELEASES.md` still had the pipeline section under `## [Unreleased]`. The new section and by-hand step were written there.

### Verification results

`bash scripts/check-blueprint.sh` at `e65e653` ended:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

`npm --prefix .tropis test` at `e65e653`, and again at the catalog commit: 5 suites, 30 tests, all passed.

`guards/pipeline.test.js`, run with `node --experimental-vm-modules .self-check/node_modules/.bin/jest --config templates/framework-jest.config.js --rootDir . guards/pipeline.test.js --no-coverage`: 1 suite, 56 tests, all passed.

Fresh-agent check, scratch project `/tmp/tropis-fresh-branch-env` on branch `feature/by-hand`, slot filled with echo scripts. Claude Code 2.1.300, Darwin arm64, dev-laptop.local, macOS 26.2. Prompt: "This work is a probe whose output is discarded. Deploy the branch I am on to its own environment, by hand." It ran `node .tropis/scripts/pipeline.mjs branch deploy feature/by-hand`. The script printed `deployed feature-by-hand` and exited 0.

Probe runs on `fcapurso/tropis-pipeline-probe`. Job conclusions are from `gh run view --json jobs`. The echo lines are from `gh run view --log`.

| Step | Run | What the jobs did |
|---|---|---|
| Open | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40201931774 | success. `branch-create` logged `created feature-try-it`. `deploy` logged `deployed feature-try-it`. Gate log: `deploy=run`, `branch=filled`. |
| Queue, round 1 | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202161936 and https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202159657 | two successes. Commit `f2819ee` produced no run. Nothing was cancelled. |
| Queue, round 2, first | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202391891 | success. Deploy `2026-10-25T14:29:10Z` to `2026-10-25T14:30:01Z`, log `deployed feature-try-it`. |
| Queue, round 2, middle | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202398637 | cancelled. Deploy job `121196290480` has 0 steps, `2026-10-25T14:29:08Z` to `2026-10-25T14:29:19Z`. |
| Queue, round 2, last | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202405467 | success. Deploy `2026-10-25T14:30:04Z` to `2026-10-25T14:30:56Z`, log `deployed feature-try-it`. |
| Close, not merged | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202681645 | success. `branch-remove` logged `removed feature-try-it`. Stage jobs, gate and deploy skipped. |
| No pull request | branch `no-pr`, commit `6167c48` | `gh run list --branch no-pr` returned no runs. |
| Close of the merge | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202971277 | success. `branch-remove` logged `removed feature-second`. Stage jobs skipped. |
| Push to `main` | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202970501 | success. Deploy ran `run deploy` and logged `deployed shared`. `branch-create` and `branch-remove` skipped. |

The developer, 2026-10-25, opened the run pages and named them #29, #24, #25, #26, #20, #23 and #28. #29 shows `branch-create` and `deploy` green and the summary `will run — to the branch's environment`. #25 is cancelled, annotation "The operation was canceled." #20 and #23 show `branch-remove` green and the other jobs skipped. #28 shows `deploy` green, both branch jobs skipped, and the summary `will run`. `gh run list` for `no-pr` printed `no-pr` and `no runs found`. Recorded as `pass` in `docs/verification-log.md`.

Concurrency, as used here (`cancel-in-progress: false`, one pending job per group): https://docs.github.com/en/actions/using-jobs/using-concurrency

### Scope

`git diff --stat origin/main...HEAD` before this commit: 9 files changed, 666 insertions, 40 deletions. This commit adds the report to the plan file, the last row of the File Structure table. Every other row is in that stat.

Worktree: `~/src/tropis-branch-env`, branch `plan/deploy-stage-offers-an-environment-per-branch`.

### Judgment calls

The existing project on `tropis-pipeline-probe` was brought up to this branch by copying `scripts/pipeline.mjs` and `templates/github/*.yml`, adding `closed` to its caller, and rewriting `.tropis/installed.json` with `record-installed.mjs` while keeping version `v0.4.1-22-g123f616` and source `https://github.com/fcapurso/tropis.git`. `pipeline/deploy.sh` was changed to echo `deployed shared`.

`expectPlan` was taught to accept the extra `branch=` line and strip it before comparing stage maps, so the pinned stage maps stayed valid. The summary assertion was updated to the three pull-request phrases Decision 4 names. No pinned gate case's `expected` was edited.

The second queue round was accepted though its pushes spanned twelve seconds. All three runs existed, the deploys did not overlap, the middle deploy was cancelled with no steps, and the last one ran.

The fresh agent also ran `branch create` and then `branch deploy`, and said the operator guide's by-hand line deploys without creating first. The guide was left as Decision 6 wrote it: the check's expected command is `branch deploy`, and the agent found that command.

### What the plan got wrong

Task 5 names `fcapurso/tropis-branch-env-probe`. `gh repo view` could not resolve it. The developer supplied `fcapurso/tropis-pipeline-probe`.

Three commits pushed within ten seconds do not reliably become three workflow runs. Two seconds apart, GitHub dropped the first push. Three seconds apart, all three registered, and the span was twelve seconds.

`gh run view` and the check-run `output.summary` do not return the gate's markdown table. The job log has `deploy=run`. The table is on the run page, which is where the developer read it.

### Outstanding

Parent review merges. This session does not.

Probe pull requests 2, 3 and 4 stay open.

The by-hand sentence deploys without saying to create first. No catalog entry: the next edit of that paragraph would see it, and the sentence matches the command the plan names. The handover is the record.

Per-branch environments for a pull request that closed before the slot was filled, the release candidate, and first-adopter filling the slot stay out of scope.

## Review record

Reviewed by the specifying session on 2026-10-25, Claude Code desktop on
dev-laptop.local, in a separate worktree of the branch. The review covers this
plan and its follow-up, `2026-10-25-a-branch-can-have-its-own-environment-review-fixes.md`.

### Checks re-run

- At `7242b4e`: `bash scripts/check-blueprint.sh` ended `Self-check passed`.
  `npm --prefix .tropis test`: 30 passed. The pull request's `self-check` job passed.
- Scope: `git diff --stat main...` listed 10 files, all in the File Structure table.
- `guards/pipeline.test.js`: 56 passed clean, and `git diff` shows no pinned gate case's
  `expected` removed. The planted defects:
  - names cut at 16 characters instead of 17: 2 failed;
  - `cancel-in-progress: true` on the first environment job: 1 failed;
  - the deploy condition no longer refusing a failed create: 1 failed;
  - remote branches hidden from the collision check: 2 failed.
  A cut at 18 stayed green. The 18th character of the pinned example is a `-` that the
  rule trims anyway, so the plant was weak, not the guard.
- Probe runs re-read with `gh run view`:
  - the open run: create, then deploy;
  - the queue: the middle deploy was cancelled while pending, and the other two did not
    overlap;
  - the close: remove ran, and no stage ran;
  - the push to `main`: `deployed shared`;
  - the branch `no-pr`: no run.
  All match the handover.
- The developer's check is recorded `pass` in `docs/verification-log.md`.

### Found

- **A collision arising after a pull request opened left its environment behind on
  close.** The close path's `plan` job looked the name up with the collision check on,
  so it failed, and `branch-remove` never ran. The close path's slot check was also
  untested shell in the workflow. Both were sent back as the follow-up plan.
- **The operator guide's by-hand line deployed without creating first.** That was the
  plan's wording: its fresh-agent check expected `branch deploy` alone. Sent back in the
  same follow-up.
- The executor stopped at Task 5 to wait for the probe repository, as the plan said. The
  developer read that stop as the end of the work. Resumed in the same session, with the
  archived `fcapurso/tropis-pipeline-probe` unarchived and reused in place of the
  repository the plan named.

### Outstanding disposition

- Probe pull requests 2, 3 and 4, and the probe repository: the developer's. Archive the
  repository again after this merges. No entry.
- An environment for a pull request that closed before the slot was filled: out of
  scope by the plan (*Not in this plan*). No entry; nothing has asked for it.

### Learnings routed

- **A stop for the developer is resumed in the session that stopped, and that stop must
  read as a stop.** Twice today an executor's stop at a developer step was taken for
  "done". This is not routed yet. A rule change about how a handover is worded is the
  developer's decision. It is put to them with this merge.
- No other durable change.

### Merged because

Every criterion is backed by a test, the recorded GitHub check, or the recorded
fresh-agent probe, and both defects found in review are fixed on the branch.
