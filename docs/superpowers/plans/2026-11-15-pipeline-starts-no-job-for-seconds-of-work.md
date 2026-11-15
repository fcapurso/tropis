# The pipeline starts no job that has only seconds of work — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the pipeline template stops starting two jobs that only decide. The host's
gate is asked by a step at the end of the `plan` job instead of a `host` job of its own,
and that step still turns the run red. A closing pull request starts one job,
`branch-remove`, which decides whether the branch slot is filled and removes the
environment, instead of a `plan` job and a `branch-remove` job. The stage order, what
the gate decides and the required check `pipeline / gate` do not change.

**Backlog item:** `pipeline-starts-no-job-for-seconds-of-work` in `feature-catalog.yaml`
(type improvement). There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — every job the pipeline starts has work
of its own beyond deciding, except the gate the host requires by name.

**Model tier: Medium.** The workflow text is given verbatim below; the executor adapts
the guard's assertions to it and writes the new ones.

**Merge authority: parent review.** The specifying session reviews, runs the fresh-agent
check `framework/workflow.md` owes, moves the backlog item to `shipped` and merges. Stop
after Task 5; do not open a pull request, write a review record, edit
`feature-catalog.yaml` or merge.

**Merges after:** a-sessions-prose-lands-as-one-pull-request, passed-check-can-ask-the-host, stage-jobs-restore-npm-from-a-cache

**A fresh-agent check is owed** (`framework/workflow.md` changes one clause); the
specifying session runs it at review. The executor does not.

**What the specifying session verified on 2026-11-15, against `origin/main` at `a464046`
(git 2.43.0, node v22.23.4, Linux x86_64):**

- `templates/github/tropis-pipeline.yml` has these jobs, in this order: `plan`, `host`,
  `framework`, `sanity`, `unit`, `integration`, `end-to-end`, `branch-create`,
  `end-to-end-deployed`, `gate`, `deploy`, `branch-remove`.
  - `host` has no `needs`, runs when `github.event.action != 'closed'`, and its one run
    step is `node .tropis/scripts/pipeline.mjs host --summary "$GITHUB_STEP_SUMMARY"`
    with `GH_TOKEN: ${{ github.token }}`. Nothing needs it. When the host is not gated
    and no reason is recorded, that command exits non-zero, so the job fails and the
    run's conclusion is failure, while the gate stays green.
  - The `plan` job's `plan` step, on `closed`, computes the environment with
    `environment "$HEAD_REF" --no-check`, writes `plan --closed` to `$GITHUB_OUTPUT` and
    exits 0. Otherwise it writes `environment=` (pull requests only), then `branch=` and
    the plan lines, all in the last block of the step. `branch=` is written only when
    planning succeeded.
  - `framework` (a call of `tropis-framework-checks.yml`, one job `checks`) needs `plan`
    and runs when `github.event.action != 'closed'`. `sanity`, `unit` and `integration`
    need `[plan, framework]` and run when `needs.plan.outputs.<stage> == 'run'`;
    `end-to-end` likewise, and also when `end-to-end-on != 'environment'`. None of these
    conditions has a status function, so each carries an implicit `success()` over its
    `needs`.
  - `branch-create` needs `plan`, condition without a status function. `end-to-end-deployed`,
    `gate` and `deploy` already use `!cancelled()` or `always()`.
  - `branch-create`, `end-to-end-deployed`, `deploy` and `branch-remove` share the
    concurrency group
    `tropis-env-${{ github.repository }}-${{ needs.plan.outputs.environment || 'shared' }}`
    with `cancel-in-progress: false`. `branch-remove` needs `plan` and runs on `closed`
    when `needs.plan.outputs.branch == 'filled'`.
- `scripts/pipeline.mjs`: `plan --closed` prints six `<stage>=skipped` lines and
  `branch=filled` or `branch=empty`, or exits 1 on a partial slot (`closedPlan`).
  `branch remove <branch>` derives the environment name itself. Nothing in this plan
  changes the script.
- A stage the plan says is `empty` or `skipped` already starts no job: its job's `if` is
  false, and GitHub starts no runner for a job it skips. So the second acceptance
  criterion holds today; this plan keeps it and has the guard assert it.
- `guards/pipeline.test.js`, `describe('GitHub workflow')`, first test, asserts the job
  list above, the `host` job's command and condition, and that `planRun` contains
  `plan --closed`, `--no-check`, `environment "$HEAD_REF" --no-check)`, the
  `else … environment "$HEAD_REF")` line, and `plan --closed >> "$GITHUB_OUTPUT"`. These
  are the assertions this plan changes.
- Prose naming the `host` job: `framework/workflow.md` (*Branching*, bullet *Say whether
  anything enforces this*), `templates/README.md` (the paragraph on the ruleset),
  `commands/bootstrap.md` (Stage 3, GitHub), `framework/DECISIONS.md` FW-037.
  `AGENTS.md` and `RELEASES.md` also name it; `AGENTS.md` describes this repository's
  installed release, which keeps the job until a release is installed, and `RELEASES.md`
  names it only in shipped notes. Neither changes.
- Whether GitHub hands a failed job's outputs to the jobs after it: no official document
  was read (docs.github.com did not resolve from the session). One report,
  actions/runner issue 2598 (2023), shows a failed job's output reaching a job that ran
  under `always()`. The design below fails closed if that does not hold: see FW-076's
  *Consequences* in Task 3.

## Delivers

pipeline-starts-no-job-for-seconds-of-work

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-no-seconds-jobs -b plan/pipeline-starts-no-job-for-seconds-of-work origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `.github/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; change an
  existing assertion only where this plan changes what it asserts.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `templates/github/tropis-pipeline.yml` | `host` job folded into `plan` as its last step; `plan` skips a closing run; downstream conditions gain `!cancelled()`; `branch-remove` decides and removes on its own; the environment concurrency group keys on the head branch |
| `guards/pipeline.test.js` | *GitHub workflow* assertions follow the template; new assertions for the host step, the conditions and the closing job |
| `templates/README.md` | the sentence on the `host` job |
| `commands/bootstrap.md` | the sentence on the `host` job |
| `framework/workflow.md` | the clause on the `host` job |
| `framework/DECISIONS.md` | FW-076 appended; FW-028 and FW-037 gain an amendment line |
| `RELEASES.md` | one line under `## [Unreleased]` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session does this at merge; the executor does not touch it) |
| `docs/superpowers/plans/2026-11-15-pipeline-starts-no-job-for-seconds-of-work.md` | this plan; the handover report |

## Task 1 — the workflow

Edit `templates/github/tropis-pipeline.yml` only. Keep every comment not named here.

1. **`plan` job.** Add `if: ${{ github.event.action != 'closed' }}` under `plan:`, before
   `runs-on`. In the `plan` step's `run`, replace the opening block

   ```bash
          if [ "$EVENT_NAME" = "pull_request" ]; then
            if [ "$ACTION" = "closed" ]; then
              environment=$(node .tropis/scripts/pipeline.mjs environment "$HEAD_REF" --no-check)
            else
              environment=$(node .tropis/scripts/pipeline.mjs environment "$HEAD_REF")
            fi
            echo "environment=$environment" >> "$GITHUB_OUTPUT"
          fi
          if [ "$ACTION" = "closed" ]; then
            node .tropis/scripts/pipeline.mjs plan --closed >> "$GITHUB_OUTPUT"
            exit 0
          fi
   ```

   with

   ```bash
          if [ "$EVENT_NAME" = "pull_request" ]; then
            environment=$(node .tropis/scripts/pipeline.mjs environment "$HEAD_REF")
            echo "environment=$environment" >> "$GITHUB_OUTPUT"
          fi
   ```

   Remove `ACTION: ${{ github.event.action }}` from the step's `env` **only if** nothing
   left in the step reads `$ACTION` — the `synchronize` test further down still does, so
   it stays. After the `plan` step, append a step:

   ```yaml
      # Whether the main branch is gated by the host, or the project has said why not.
      # Last, so the outputs above are written first. A red answer fails this job and
      # the run, as the host job did, and the jobs below still run: each reads the
      # plan's outputs under !cancelled().
      - name: host
        if: ${{ !cancelled() }}
        run: node .tropis/scripts/pipeline.mjs host --summary "$GITHUB_STEP_SUMMARY"
        env:
          GH_TOKEN: ${{ github.token }}
   ```

2. **Delete the `host` job** and the two comment lines above it.

3. **`framework` job:** `if: ${{ !cancelled() && github.event.action != 'closed' && needs.plan.outputs.branch != '' }}`.
   Add above the job:

   ```yaml
  # The plan job fails when the host is not gated, after writing its outputs, so
  # every job that needs it reads those outputs under !cancelled(). branch= is
  # written only when planning succeeded.
   ```

4. **`sanity`, `unit`, `integration`:** each `if` becomes
   `${{ !cancelled() && needs.framework.result == 'success' && needs.plan.outputs.<stage> == 'run' }}`
   with `<stage>` the job's own name.

5. **`end-to-end`:**
   `${{ !cancelled() && needs.framework.result == 'success' && needs.plan.outputs.end-to-end == 'run' && needs.plan.outputs.end-to-end-on != 'environment' }}`.

6. **`branch-create`:**
   `${{ !cancelled() && github.event_name == 'pull_request' && (github.event.action == 'opened' || github.event.action == 'reopened') && needs.plan.outputs.branch == 'filled' }}`.

7. **Concurrency group.** In `branch-create`, `end-to-end-deployed`, `deploy` and
   `branch-remove`, the group becomes
   `tropis-env-${{ github.repository }}-${{ github.event.pull_request.head.ref || 'shared' }}`.
   Replace the sentence "One group per environment:" in the comment above
   `branch-create` with "One group per branch (the shared environment on a push), so the
   closing job can name it before anything has run:"; leave the rest of that comment.

8. **`branch-remove`** becomes, in full:

   ```yaml
  # A closed pull request starts this job alone. It decides whether the branch slot
  # is filled and, if it is, removes the environment.
  branch-remove:
    if: ${{ github.event.action == 'closed' }}
    runs-on: ubuntu-latest
    concurrency:
      group: tropis-env-${{ github.repository }}-${{ github.event.pull_request.head.ref || 'shared' }}
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
      - id: plan
        run: node .tropis/scripts/pipeline.mjs plan --closed >> "$GITHUB_OUTPUT"
      - if: steps.plan.outputs.branch == 'filled'
        run: node .tropis/scripts/pipeline.mjs branch remove "$HEAD_REF"
        env:
          HEAD_REF: ${{ github.event.pull_request.head.ref }}
          TROPIS_SECRETS: ${{ toJSON(secrets) }}
   ```

   Do not pipe `plan --closed` through `tee` or anything else: a step with no `shell:`
   runs as `bash -e {0}`, without `pipefail`, so a pipe would hide its exit 1 on a
   partial slot.

9. `gate`, `end-to-end-deployed` and `deploy` keep their conditions. The `gate` comment
   line "A closed pull request removes the environment and runs no stage." stays true.

Check: the template parses (`YAML.parse`), and `grep -n "host" templates/github/tropis-pipeline.yml`
prints only the new step's lines and comment — no line `  host:` at two-space indent.

## Task 2 — the guard

In `guards/pipeline.test.js`, `describe('GitHub workflow')`:

1. In the first test, the expected job list loses `'host'`. Replace the four `jobs.host`
   assertions and the two `not.toContain('host')` lines with assertions that:
   - the `plan` job's last step is named `host`, has `if` containing `!cancelled()`,
     runs exactly `node .tropis/scripts/pipeline.mjs host --summary "$GITHUB_STEP_SUMMARY"`
     with `env.GH_TOKEN` `${{ github.token }}`, has no `continue-on-error`, and comes
     after the step with `id: plan`;
   - `String(jobs.plan.if)` contains `github.event.action != 'closed'`;
   - no job other than `plan` runs `pipeline.mjs host`.
2. Replace the `planRun` assertions about `--closed` and `--no-check` with: `planRun`
   contains neither `--closed` nor `--no-check`, and contains
   `environment=$(node .tropis/scripts/pipeline.mjs environment "$HEAD_REF")`.
3. Add assertions for the closing run:
   - `jobs['branch-remove'].needs` is undefined and its `if` is exactly
     `${{ github.event.action == 'closed' }}` (as YAML parses it);
   - its steps run `pipeline.mjs plan --closed` (into `$GITHUB_OUTPUT`) and, under
     `if: steps.plan.outputs.branch == 'filled'`, `branch remove "$HEAD_REF"`;
   - every job but `branch-remove` has an `if` that is false when the plan job did not
     run: it contains `github.event.action != 'closed'`,
     `needs.framework.result == 'success'`, `needs.gate.outputs.deploy == 'run'`, or a
     comparison `needs.plan.outputs.<name> == '<value>'` with a non-empty value — so a
     closing run starts only `branch-remove`. Loop over the parsed jobs, not a fixed
     list, so a job added later is held to it. (`needs.<job>` of a skipped job is not
     enough: under `!cancelled()` a job still runs after a skipped one.)
4. Change the expected concurrency group to
   `tropis-env-${{ github.repository }}-${{ github.event.pull_request.head.ref || 'shared' }}`.
5. Add assertions that every job with `plan` in its `needs` has `!cancelled()` or
   `always()` in its `if`, and that `sanity`, `unit`, `integration` and `end-to-end`
   each have `needs.framework.result == 'success'` and `needs.plan.outputs.<stage> == 'run'`
   in theirs — so a stage the plan says is empty or skipped starts no job.
6. The *ruleset* test's `template.jobs.gate` assertion stays.

Run the guard alone (Task 5, step 2) after this task.

## Task 3 — the decision record

1. `framework/DECISIONS.md`: after FW-028's last amendment line
   (`**Amended 2026-11-07** — a pull request's own environment may receive a deploy before every stage has passed; FW-074.`)
   add `**Amended 2026-11-15** — the host's gate is asked inside the plan job, and a closing run starts one job; FW-076.`
   After FW-037's *Consequences* paragraph (the last paragraph before `## FW-038`), add
   a line `**Amended 2026-11-15** — the plan job's last step asks the host, in place of the host job; FW-076.`
   Append at the end of the file:

   ```markdown
   ## FW-076: The pipeline starts no job only to decide, except the gate

   **Date:** 2026-11-15 · **Status:** Accepted; built by the backlog item
   pipeline-starts-no-job-for-seconds-of-work. Amends FW-028 and FW-037.

   **Decision:** The host's gate is asked by the last step of the plan job, not a job of
   its own. The step runs after the plan's outputs are written, even when planning
   failed, and a red answer fails the plan job and so the run, as the host job did.
   Every job that needs the plan reads its outputs under `!cancelled()`, so a red host
   holds no stage and no deploy. A closing pull request starts one job, which decides
   whether the branch slot is filled and removes the environment if it is; the plan job
   does not run. The jobs that touch an environment share one concurrency group per
   head branch, `shared` on a push, because the closing job has no plan to name the
   environment before it starts. The gate stays a job of its own: the shipped ruleset
   requires the check `pipeline / gate`. A stage the plan says is empty or skipped
   already started no job, and still does not.

   **Evidence:** GitHub bills each job rounded up to a minute. In first-adopter, 60 runs
   over two days billed 651 minutes, 169 of them on jobs that ran 20 seconds or less.
   Jobs a run starts, before and after, for a project that fills all five stages and no
   branch slot (a stage the plan skips or finds empty starts none either way):

   | Run | Before | After |
   |---|---|---|
   | A push to a pull request changing only prose and framework files | 4 — plan, host, framework, gate | 3 — plan, framework, gate |
   | A push to a pull request changing code | 8 — plan, host, framework, sanity, unit, integration, end-to-end, gate | 7 — the same without host |
   | A push to the main branch changing code | 9 — the eight above and deploy | 8 — the same without host |
   | A closing pull request, branch slot filled | 2 — plan, branch-remove | 1 — branch-remove |
   | A closing pull request, branch slot empty | 1 — plan | 1 — branch-remove |

   Counted from the template's conditions, not from runs. Whether GitHub hands a failed
   job's outputs to the jobs after it was not read in its documentation; actions/runner
   issue 2598 (2023) shows a failed job's output reaching a job that ran under
   `always()`.

   **Rejected:** Folding the gate into the deploy job (the ruleset requires the gate by
   name, and the deploy job is skipped on most runs). Letting the host step continue on
   error (the run would be green with the host red, which the backlog item forbids).
   Keeping the concurrency group on the environment's name (only the plan computes it,
   and the closing job would need the plan job to know it).

   **Consequences:** If a failed job's outputs ever stop reaching the jobs after it, a
   run whose host is red runs no stage and its gate fails: the fault shows, and holds
   merges, rather than passing. Two branches whose environment names collide no longer
   share a concurrency group; a collision already fails the plan of the open one, so
   only the removal of a closed branch's environment can overlap a deploy to it. A
   project that owns its pipeline keeps its copy and changes nothing.
   ```

   If `origin/main` already has an FW-076 when you rebase, use the next free number in
   all three places and in `RELEASES.md` if it names one.

## Task 4 — the prose

1. `framework/workflow.md`, *Branching*, bullet *Say whether anything enforces this*:
   replace "and its `host` job fails until" with "and the `host` step that ends its plan
   job fails the run until".
2. `templates/README.md`: replace "The pipeline's `host` job fails on every run until"
   with "The `host` step at the end of the pipeline's plan job fails every run until",
   and in the same paragraph "so the job checks it only where GitHub says" with "so the
   step checks it only where GitHub says".
3. `commands/bootstrap.md`, Stage 3: replace "the pipeline's `host` job fails on every
   run, by design." with "the `host` step at the end of the pipeline's plan job fails
   every run, by design."
4. `RELEASES.md`: under `## [Unreleased]`, replace `_Nothing yet._` (or, if a sibling
   plan merged first, add below its lines) with:

   ```markdown
   - A pipeline run starts fewer jobs, each billed at least a minute on GitHub. The check that your main branch is gated is now the last step of the plan job, and still turns the run red when it fails; a closing pull request starts one job, which removes the branch's environment if there is one. The jobs that deploy to an environment now take turns per branch rather than per environment name.
   ```

## Task 5 — verification, then the handover report

Commit everything first: the self-check reads committed content only.

1. `bash scripts/check-blueprint.sh` from the worktree must end with
   `Self-check passed: …`. A red verdict names its log folder; fix and re-run, or stop
   and report.
2. Run `guards/pipeline.test.js` alone, staged as `CLAUDE.md` (*To run one source guard
   alone*) says: in an export of `HEAD` (`git archive HEAD | tar -x -C <dir>`), a
   `{"type":"module"}` package file, `templates/framework-jest.config.js` copied to
   `jest.config.js`, and `node_modules` linked to `.self-check/node_modules` (run step 1
   once first so it exists); then
   `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/pipeline.test.js`.
   Passing: every test passes; report the count.
3. Re-break, in the staged export only, and report each failing test name:
   - Put the `host:` job back (any body running `pipeline.mjs host`): the job-list
     assertion fails.
   - Add `continue-on-error: true` to the plan job's `host` step: its assertion fails.
   - Remove `!cancelled() && ` from the `unit` job's `if`: the conditions assertion fails.
   - Give `branch-remove` `needs: plan` back: the closing-run assertion fails.
   - Take `github.event.action != 'closed'` out of the `plan` job's `if`: the
     closing-run assertion fails.
   Restore each and see the guard pass.
4. `npm --prefix .tropis test` from the worktree (after `npm --prefix .tropis ci`): it
   must pass; report its count.
5. `git diff --stat origin/main...HEAD`: every file in the File Structure table except
   `feature-catalog.yaml`, nothing else.

Then append `## Handover report` to this plan, with the six sections
`.claude/rules/planning.md` names (*Every plan ends with a handover report*), commit it,
run step 1 again on that commit, and push the branch.

## Traps

- **The workflow cannot be run here.** Nothing in this plan runs GitHub Actions; the
  guard reads the template as YAML. Do not try to run a workflow or open a pull request
  to see one run.
- **`npm --prefix .tropis test` runs the installed release**, which knows nothing of this
  change. That is right; do not edit `.tropis/` or `.github/`.
- **`.github/workflows/` in this repository is the installed copy**, and keeps its `host`
  job. Edit only `templates/github/tropis-pipeline.yml`.
- **YAML parses `${{ … }}` conditions as strings**, and a bare
  `steps.plan.outputs.branch == 'filled'` too; compare the parsed value, not the source
  line, in the guard.
- **A sibling plan may touch the same files** — `stage-jobs-restore-npm-from-a-cache` and
  `passed-check-can-ask-the-host` edit this template too. If `origin/main` moved when you
  rebase, keep both sides' changes; a conflict outside `RELEASES.md` and
  `framework/DECISIONS.md` is reported in the handover.

## Handover report

### Task completion

- **Task 1 — the workflow:** done. `plan` skips a closing run and ends with a `host`
  step under `!cancelled()`; the `host` job and its comment are gone; `framework`,
  `sanity`, `unit`, `integration`, `end-to-end` and `branch-create` read the plan under
  `!cancelled()` with the conditions the plan gives; the four environment jobs group on
  `github.event.pull_request.head.ref || 'shared'`; `branch-remove` decides and removes
  on its own. `ACTION` stays in the `plan` step's `env` (the `synchronize` test reads it).
- **Task 2 — the guard:** done. The first *GitHub workflow* test follows the template
  and asserts the host step; two new tests: *starts only branch-remove on a closing pull
  request, and it decides and removes on its own* and *reads the plan under
  !cancelled(), and starts no job for a stage the plan does not run*. The ruleset test
  is untouched.
- **Task 3 — the decision record:** done. FW-076 appended (no FW-076 on `origin/main`);
  FW-028 and FW-037 carry an amendment line.
- **Task 4 — the prose:** done in `framework/workflow.md`, `templates/README.md` (both
  sentences), `commands/bootstrap.md` and `RELEASES.md` (replacing `_Nothing yet._`).
- **Task 5 — verification:** done, below. `feature-catalog.yaml` not touched.

### Verification results

All run with git 2.43.0, node v22.23.4, npm 10.9.9, Jest 30.5.2, on Linux x86_64, from
the worktree `../tropis-no-seconds-jobs`.

1. `bash scripts/check-blueprint.sh` on the implementation commit: last line
   `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
   Re-run on the commit carrying this report: see *Outstanding* for its result line.
2. `guards/pipeline.test.js` alone, staged as `CLAUDE.md` says (export of `HEAD`,
   `{"type":"module"}` package file, `templates/framework-jest.config.js` as
   `jest.config.js`, `node_modules` linked to `.self-check/node_modules`):
   `Tests:       164 passed, 164 total`.
3. Re-breaks, each in the staged export only, run with `-t 'GitHub workflow'`, then
   restored (`cmp` against the saved template: identical; full guard again
   `164 passed, 164 total`):
   - `host:` job put back, running `pipeline.mjs host`: fails *gives each stage its own
     job, and the four filled stages run side by side* and *starts only branch-remove on
     a closing pull request, and it decides and removes on its own*.
   - `continue-on-error: true` on the plan job's `host` step: fails *gives each stage its
     own job, and the four filled stages run side by side*.
   - `!cancelled() && ` removed from `unit`'s `if`: fails *reads the plan under
     !cancelled(), and starts no job for a stage the plan does not run*.
   - `needs: plan` given back to `branch-remove`: fails *starts only branch-remove on a
     closing pull request, and it decides and removes on its own* and *reads the plan
     under !cancelled(), and starts no job for a stage the plan does not run*.
   - `github.event.action != 'closed'` removed from `plan`'s `if`: fails *gives each
     stage its own job, and the four filled stages run side by side* and *starts only
     branch-remove on a closing pull request, and it decides and removes on its own*.
4. `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`,
   `Tests:       214 passed, 214 total`.
5. `grep -n "host" templates/github/tropis-pipeline.yml` prints the new step's lines and
   comments, the new comment above `framework`, and one pre-existing comment in the plan
   step (`plan falls back if the host cannot serve the commit`); no `  host:` job line.

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 RELEASES.md                          |  2 +-
 commands/bootstrap.md                |  2 +-
 framework/DECISIONS.md               | 51 ++++++++++++++++++++++++++
 framework/workflow.md                |  2 +-
 guards/pipeline.test.js              | 71 +++++++++++++++++++++++++++++-------
 templates/README.md                  |  4 +-
 templates/github/tropis-pipeline.yml | 70 +++++++++++++++++------------------
 7 files changed, 146 insertions(+), 56 deletions(-)
```

Every file is in the File Structure table; this report adds the plan file, also listed.
`feature-catalog.yaml` is untouched, as the plan says. Worktree used:
`../tropis-no-seconds-jobs`, branch `plan/pipeline-starts-no-job-for-seconds-of-work`,
created by the dispatching session from `origin/main` at `2c07ddd`. Since then
`origin/main` moved to `809d0fd`, a backlog claim touching only `feature-catalog.yaml`
and another plan file; the branch was not rebased, since nothing overlaps.

### Judgment calls

- The `host` step follows the `plan` step with no blank line between them, as steps
  in this template are written.
- FW-037's amendment line went after its last paragraph, the *Amended 2026-10-31*
  paragraph, before the `---` that precedes FW-038 (see below).
- The guard names the offending job in a failure by comparing `[id, held]` to
  `[id, true]` in its loops, so a failing loop says which job broke it.
- The closing-run loop treats a job with no `if` as failing (`String(job.if ?? '')`),
  so a job added later without a condition is held to it.
- Code written against this repository's own names; no outside source was used beyond
  the template and guard already in the repository.

### What the plan got wrong

- Task 3 calls the last paragraph before `## FW-038` FW-037's *Consequences*; it is an
  *Amended 2026-10-31* paragraph, after which the line was placed.
- Task 1's check says `grep -n "host"` prints only the new step's lines and comment; it
  also prints the new comment above `framework` (which Task 1 itself adds) and one
  pre-existing comment line in the plan step. Harmless.

### Outstanding

- The fresh-agent check `framework/workflow.md` owes, the move to `shipped`, the rebase
  onto `origin/main` and the merge are the specifying session's.
- Nothing here runs GitHub Actions: whether a failed job's outputs reach the jobs after
  it remains as FW-076 states it.
- Self-check on the commit carrying this report: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`

## Review record

Reviewed by the specifying session, 2026-11-15, on the branch rebased onto `origin/main`
after `a-sessions-prose-lands-as-one-pull-request`, `passed-check-can-ask-the-host` and
`stage-jobs-restore-npm-from-a-cache` merged (Claude Code cloud session; git 2.43.0,
node v22.23.4, Linux x86_64).

### Checks re-run

- `guards/pipeline.test.js` alone, staged from an export of `HEAD` as `CLAUDE.md` says,
  before the rebase: `Tests: 164 passed, 164 total`. After the rebase, with
  `guards/framework-checks-workflow.test.js`: `Tests: 183 passed, 183 total`.
- Re-broke two guards in the export before the rebase: the `unit` job's `if` put back to
  `needs.plan.outputs.unit == 'run'`, and `needs: plan` put back on `branch-remove`:
  `Tests: 2 failed, 162 passed, 164 total`.
- `bash scripts/check-blueprint.sh` on the rebased branch: first run failed in the clean
  baseline, `guards/framework-checks-workflow.test.js` with `TypeError: Cannot read
  properties of undefined (reading 'steps')` (see *Found*); after the fix, `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`
- `npm --prefix .tropis test`: `Tests: 215 passed, 215 total`.
- `git diff --stat origin/main...HEAD`: the plan's files plus
  `guards/framework-checks-workflow.test.js` (see *Found*).

### Found

Public exposure: the diff was read for private material; nothing found.

- **Fresh-agent check of the `framework/workflow.md` clause.** A fresh agent (Claude Code
  subagent, Claude Opus 5.5, the Large pick `dispatch.mjs --tier Large` names; Linux
  x86_64), given only the repository and an invented project whose run showed
  `pipeline / plan` red at its last step with `pipeline / gate` green and no `ungated`
  key, told the developer the code passed and the main branch is not gated, quoted the
  changed clause, and gave the ruleset command and the `ungated` opt-out. The clause
  reaches the agent it was written for. It also read FW-078's "a red host holds no stage
  and no deploy" as saying the stages stop, the opposite of what was meant, and found
  the template comment still naming "the host job". Both were reworded on the branch by
  the reviewer (commit "review: say plainly that a red host holds nothing"): a wording
  fix, understood and mechanical.
- **Rebase onto the three sibling plans.** Conflicts in `templates/github/tropis-pipeline.yml`
  (the `host` job had gained `permissions: contents: read`; `branch-remove` had gained
  the npm cache), `RELEASES.md` and `framework/DECISIONS.md`, all resolved keeping both
  sides: the host step stays in the plan job, which already declares `contents: read`;
  `branch-remove` keeps its cache lines and gains the decide step; the cache comment
  drops `host` from the jobs that install nothing. This plan's decision is renumbered
  FW-078 (FW-076 and FW-077 were taken); FW-077 gains an amendment line saying the host
  job's permission went with the job. `guards/pipeline.test.js`'s permissions test and
  `guards/framework-checks-workflow.test.js`'s `NO_INSTALL` list named the `host` job and
  lose it; the second file is outside the File Structure table, added by the reviewer
  because the sibling that wrote it merged first.
- The handover's two corrections to the plan (FW-037's last paragraph is an amendment,
  and the `grep -n "host"` check also prints comments the plan itself adds) are right.

### Acceptance criteria

| Criterion | Covered by |
|---|---|
| The host's gate is asked inside the plan job, and a red answer is as visible as today | `pipeline.test.js` › *gives each stage its own job…* (the `host` step is the plan job's last, under `!cancelled()`, with no `continue-on-error`, and no other job runs `pipeline.mjs host`) |
| A stage the plan knows is skipped gets no job, and the gate still reports right | `pipeline.test.js` › *reads the plan under !cancelled(), and starts no job for a stage the plan does not run*; the gate's decision code and its tests are unchanged |
| A closing pull request starts one job at most, which decides and removes | `pipeline.test.js` › *starts only branch-remove on a closing pull request…* |
| The stage order and what the gate means do not change | `pipeline.test.js` › *pipeline stages* and *deploy gate* unchanged and passing; the job list keeps the stage order |
| The decision record gives the job counts before and after | FW-078's table in `framework/DECISIONS.md` |

### Outstanding disposition

- **That GitHub hands a failed job's outputs to the jobs after it** is not observed in a
  run. Evidence is actions/runner issue 2598; FW-078 records that a run fails closed if it
  does not hold. It is first exercised when a project takes the release and its host is
  red; dropped as a backlog item because the fault, if any, shows as a red gate on that
  project's first run and needs no tracking to be found.
- The fresh-agent probe also named FW-037's body still saying `.claude/project.json`,
  guard fixtures using `pipeline / host` as a check name, and a failed GitHub lookup
  being reported in the same line as "not gated". None comes from this change; the
  first is history in an amended record, the second are fixtures for the `main-status`
  check list, which any name serves. Dropped. The third is a real ambiguity but small,
  and the line already says "could not ask GitHub" with the reason; dropped.

### Learnings routed

- No durable change beyond FW-078: the one lesson — a sibling plan that merges first can
  add a file naming what this plan deletes — is already what the overlap check and
  *Merging* step 4 (re-run the full merge criteria after the rebase) exist for, and they
  caught it here.

### Merged because

Every criterion has a guard that goes red when broken, the self-check and the installed
checks pass on the rebased branch, and the two reviewer fixes are wording and a stale
list entry, both declared above.
