# On a pull request, the end-to-end stage tests the commit deployed to its environment — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** on a pull request whose branch slot is filled and whose plan runs the end-to-end
stage, a new job `end-to-end-deployed` waits for sanity, unit and integration and for the
branch's environment, then, holding the environment's concurrency group, deploys the head
commit with `branch deploy` and runs `pipeline/end-to-end.sh` against it with
`TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` set, uploading `end-to-end-evidence/` when it
fails. The gate takes that job's result as the end-to-end stage's, and does not deploy the
same commit again. Everywhere else the pipeline is exactly as it is.

**Backlog item:** `end-to-end-tests-the-deployed-pull-request` in `feature-catalog.yaml`
(type feature). There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — on a pull request with a filled branch
slot, the end-to-end stage tests the pull request's own commit, deployed to its
environment.

**Model tier: Medium.** The design, names, wording and workflow text are given below; the
executor writes the JavaScript and its tests against `scripts/pipeline.mjs` and
`guards/pipeline.test.js`.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request, moves the backlog item to `shipped` and merges. Stop after Task 7; do not open a
pull request, write a review record, edit `feature-catalog.yaml` or merge.

**No fresh-agent check is owed:** nothing under `framework/`'s workflow, `rules/` or
`commands/` changes. `templates/README.md` is the operator guide a project installs as
`.tropis/README.md`, and the decision record gains an entry.

**What the specifying session verified on 2026-11-07, against `origin/main` at `71248ba`
(git 2.43, node v22, Linux x86_64):**

- `templates/github/tropis-pipeline.yml` has the jobs, in this order: `plan`, `host`,
  `framework`, `sanity`, `unit`, `integration`, `end-to-end`, `branch-create`, `gate`,
  `deploy`, `branch-remove`. `sanity`, `unit`, `integration` and `end-to-end` each need
  `[plan, framework]` and run when `needs.plan.outputs.<stage> == 'run'`. `branch-create`
  runs on `opened`/`reopened` when `needs.plan.outputs.branch == 'filled'`. `branch-create`,
  `deploy` and `branch-remove` share the concurrency group
  `tropis-env-${{ github.repository }}-${{ needs.plan.outputs.environment || 'shared' }}`
  with `cancel-in-progress: false`. The `gate` job needs
  `[plan, framework, sanity, unit, integration, end-to-end]` and passes one
  `<stage>=<result>` argument per stage to `pipeline.mjs gate`. `deploy` needs
  `[plan, gate, branch-create]` and, on a pull request, runs `branch deploy "$HEAD_REF"`
  when the gate's output `deploy` is `run`. The plan job's `outputs:` block lists each key
  it forwards; the `plan` step writes every `key=value` line `pipeline.mjs plan` prints to
  `$GITHUB_OUTPUT`.
- `actions/checkout@v7` and `actions/setup-node@v7` are the versions used throughout.
  `actions/upload-artifact` has a tag `v7.0.2` (`git ls-remote --tags
  https://github.com/actions/upload-artifact`), so `actions/upload-artifact@v7` resolves.
  No template uses it yet.
- `scripts/pipeline.mjs`:
  - `planStages` returns `{ stages, reason, passed?, note? }`; the CLI block adds
    `outcome.branch = slot.slot` (`filled` or `empty`) and calls `writePlan`, which prints
    the six `stage=value` lines, then `passed=` when there is one, then `branch=`.
    `parsePlanArgs` accepts only `--base`, `--head`, `--passed`. `applyPassed` turns
    `end-to-end` into `skipped` when the same code passed.
  - `gateDecision({ plan, results, event, branch })` returns `held` when
    `stagesThatDidNotPass` lists anything (a stage planned `run` whose result is not
    `success`, or any `failure`/`cancelled`); on a pull request it returns `skipped` for a
    plan with `passed` or with `deploy=skipped`, `run` for a filled slot, else `skipped`.
    `deployCell` words the deploy row; `summaryTable` builds the table; `gateCommand`
    reads the plan from stdin with `readPlan` (any `key=value` line) and refuses one
    missing a stage.
  - `parseGateArgs` puts every `key=value` argument into `results` and requires one for
    each of the five stages before deploy.
  - `runCommand(root, stage)` runs `pipeline/<stage>.sh` with `stageEnv()`; the CLI calls
    it as `runCommand(found, args[0])` and ignores further arguments.
  - `branchCommand` checks `branchSlot`, `permanentRefusal`, then
    `resolveEnvironment(root, branch, { checkCollision: true })` for deploy, and sets
    `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` on the stage environment.
  - `commandList()` prints the commands `pipeline.mjs commands` shows, one comment line
    before each.
- `guards/pipeline.test.js`, *GitHub workflow*, asserts the job list above in order, the
  gate's `needs` as `['plan', ...STAGES.slice(0, -1)]`, the deploy's `needs` and `if`, and
  the concurrency group for `branch-create`, `deploy` and `branch-remove`. Its tests at
  lines 732, 878 and 1653 run `pipeline.mjs commands`; the one at 1653 (*names every
  stage, in order, with when to run each command*) inspects the command lines.
- `templates/README.md`, *The pipeline*, describes the stages and the branch slot
  (`pipeline/branch/` with `create.sh`, `deploy.sh`, `remove.sh`).
- `framework/DECISIONS.md` ends at FW-073. FW-028 ends with the line
  `**Amended 2026-11-01** — a stage may also be skipped because the same code already passed; FW-048.`
- `RELEASES.md` has `## [Unreleased]` with `_Nothing yet._` under it. Its preamble counts
  "the pipeline's stages changed order or the deploy gate decides differently" as
  breaking.

**Decided by the specifying session:**

- **Which job runs the stage is decided in JavaScript, by the plan.** `pipeline.mjs plan`
  takes an optional `--event <name>`. When it is given, the plan prints one more line,
  `end-to-end-on=environment` or `end-to-end-on=runner`, after the six stage lines and
  before `passed=`/`branch=`. It is `environment` exactly when the event is
  `pull_request`, the branch slot is `filled` and the planned `end-to-end` is `run` (after
  `--passed` is applied); otherwise `runner`. Without `--event` no such line is printed,
  so existing callers and tests see the plan they see today. The `--closed` plan prints
  no such line. A pure exported function `endToEndOn({ stages, branch, event })` returns
  the value; the CLI uses it.
- **Two jobs, not one.** `end-to-end` keeps its place and `needs`, and runs when
  `end-to-end == 'run'` and `end-to-end-on != 'environment'`, so on a push and wherever
  the slot is empty or the script absent the order of stages is unchanged. A new job
  `end-to-end-deployed`, after `branch-create` in the file, runs when
  `end-to-end-on == 'environment'`. GitHub's `needs` is fixed per job, which is why the
  waiting job is a second job.
- **The gate maps the second job's result onto the stage.** The workflow passes
  `end-to-end-deployed=<result>` to the gate as well. When the plan says
  `end-to-end-on=environment`, every decision and the summary use that result as the
  `end-to-end` result (a missing `end-to-end-deployed` argument is then the error
  `gate: missing result for end-to-end-deployed`, exit 2, from `parseGateArgs` or as early
  as the plan is read — the executor picks where, and says so). Otherwise the argument is
  ignored. On a pull request whose plan says `environment` and that is not held, the
  gate decides `skipped`, and the deploy row reads
  `skipped — the end-to-end stage deployed this commit to the branch's environment`.
  Held still wins over everything, so an end-to-end failure stops the merge.
- **`run end-to-end --branch <branch>`** sets `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` the
  way `branch deploy` does: it refuses (exit 1) when the branch slot is empty
  (`run: --branch needs pipeline/branch/`), a partial slot (the slot's own error), a
  permanent environment (the same refusal `branch` gives), a colliding or unnamable
  branch (the resolver's message and status). `--branch` with any other stage, a missing
  value, or any other extra argument exits 2 (`run: --branch is for end-to-end only`,
  `run: --branch needs a branch`, `run: unknown argument <arg>`). Without `--branch`,
  `run` behaves as today. An absent `pipeline/end-to-end.sh` still prints the empty line
  and exits 0.
- **The deploy and the tests are two steps of one job**, so the job-level concurrency
  group (the environment's, the same expression the other three jobs use) is held across
  both. A deploy failure fails the job, which holds the gate.
- **Evidence:** a last step, `if: failure()`, `actions/upload-artifact@v7` with
  `name: end-to-end-evidence`, `path: end-to-end-evidence/`, `retention-days: 7`,
  `if-no-files-found: ignore`.
- **This is a breaking release line**: for a project with both a filled branch slot and
  `pipeline/end-to-end.sh`, the stage order on a pull request changes and the gate no
  longer deploys after it. The release-notes line says what such a project checks.
- A decision record entry, FW-074, amends FW-028.

---

## Delivers

end-to-end-tests-the-deployed-pull-request

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-e2e-deployed -b plan/end-to-end-tests-the-deployed-pull-request origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `.github/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; change an
  existing assertion only where this plan changes what it asserts (the job list, the
  gate's `needs`, the command list).
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | `plan --event`, `endToEndOn`, the gate's mapping and deploy decision, `run --branch`, `commandList`, the module docstring |
| `guards/pipeline.test.js` | tests for each of the above; the *GitHub workflow* assertions follow the template |
| `templates/github/tropis-pipeline.yml` | the plan passes `--event` and forwards `end-to-end-on`; `end-to-end`'s condition; the `end-to-end-deployed` job; the gate needs and passes it |
| `templates/README.md` | one paragraph in *The pipeline* |
| `framework/DECISIONS.md` | FW-074 appended; FW-028 gains an amendment line |
| `RELEASES.md` | one line under `## [Unreleased]` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session does this at merge; the executor does not touch it) |
| `docs/superpowers/plans/2026-11-07-end-to-end-tests-the-deployed-pull-request.md` | this plan; the handover report |

## Task 1 — the plan says where the end-to-end stage runs

In `scripts/pipeline.mjs`:

1. Export `endToEndOn({ stages, branch, event })` with a JSDoc: returns `'environment'`
   when `event === 'pull_request'`, `branch === 'filled'` and `stages['end-to-end'] ===
   'run'`, else `'runner'`.
2. `parsePlanArgs` accepts `--event <name>` (any non-empty value; a missing value is
   `plan: --event needs push or pull_request`, exit 2). Keep `--base`, `--head`,
   `--passed` as they are; the error message for an unknown argument is unchanged.
3. In the CLI block, after `outcome.branch = slot.slot`, when `--event` was given and the
   outcome has stages, set `outcome.endToEndOn = endToEndOn({ stages: outcome.stages,
   branch: slot.slot, event })`. `planStages` must not receive `event` (pass it the other
   options only) — or accept and ignore it; say which.
4. `writePlan` prints `end-to-end-on=<value>` after the six stage lines, before `passed=`,
   only when `outcome.endToEndOn` is set.

Tests in `guards/pipeline.test.js` (alongside *plan from a git repository*, using its
fixtures and `runPipeline`): `endToEndOn` for each combination that matters
(pull request + filled + run → environment; push + filled + run, pull request + empty +
run, pull request + filled + empty, pull request + filled + skipped → runner); the CLI
with `--event pull_request` and a filled slot and a code change prints
`end-to-end-on=environment`, with `--event push` prints `end-to-end-on=runner`, without
`--event` prints no `end-to-end-on` line; with `--passed` making `end-to-end` skipped it
prints `runner`. Run the suite (Verification step 2) after writing them.

## Task 2 — the gate uses the deployed job's result, and does not deploy again

In `scripts/pipeline.mjs`:

1. A helper (e.g. `stageResults(plan, results)`) returns `results` with `end-to-end`
   replaced by `results['end-to-end-deployed']` when `plan['end-to-end-on'] ===
   'environment'`, else `results` unchanged. `gateDecision` and `summaryTable` (and so
   `deployCell` and `plannedCell`) use it.
2. `gateDecision`: after the held check, on a pull request, when
   `plan['end-to-end-on'] === 'environment'`, return `'skipped'` (before the other pull
   request branches). A push ignores `end-to-end-on`.
3. `deployCell`: the matching row text is
   `skipped — the end-to-end stage deployed this commit to the branch's environment`.
4. A missing `end-to-end-deployed` result when the plan says `environment` is an error as
   decided above. Document `end-to-end-on` and the extra result in the JSDoc of
   `gateDecision` and `gateCommand`.

Tests (alongside *deploy gate* and *run, gate and commands*): with `end-to-end-on=
environment` on a pull request, `end-to-end=skipped end-to-end-deployed=success` and the
other stages green → `skipped`, the deploy row reads the sentence above, the end-to-end
row reads `run — passed`, exit 0; `end-to-end-deployed=failure` → `held`, the row names
`end-to-end`, exit 1; `end-to-end-deployed=skipped` (the job never started) → `held`;
the same plan on a push → the push's usual decision, the deployed result ignored; a plan
without `end-to-end-on` → today's decisions, whatever `end-to-end-deployed` says; the
missing-result error. Run the suite.

## Task 3 — `run end-to-end --branch`

In `scripts/pipeline.mjs`, extend `runCommand` (or add a small wrapper the CLI calls with
all of `args`) as decided above. Reuse `branchSlot`, `permanentRefusal` and
`resolveEnvironment(root, branch, { checkCollision: true })`; set
`env.TROPIS_ENVIRONMENT` and `env.TROPIS_BRANCH` on the environment from `stageEnv()`.

Tests (alongside *run, gate and commands*, with a fixture that has a filled
`pipeline/branch/` and a `pipeline/end-to-end.sh` that exits non-zero unless
`TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` hold the expected values): the script sees both
values and exits 0; without `--branch` it sees neither; an empty slot, a permanent
branch (`production`), `--branch` on `unit`, a missing value and an unknown argument each
give the decided message and status; an absent script prints the empty line and exits 0.
Run the suite.

## Task 4 — the workflow

In `templates/github/tropis-pipeline.yml`:

1. Plan job `outputs:` gains, after `end-to-end`:
   `end-to-end-on: ${{ steps.plan.outputs.end-to-end-on }}`. In the `plan` step, the
   `pipeline.mjs plan --base "$base" --head "$head" "${passed_args[@]}"` call gains
   `--event "$EVENT_NAME"` (the `--closed` call does not change).
2. `end-to-end`'s `if` becomes
   `needs.plan.outputs.end-to-end == 'run' && needs.plan.outputs.end-to-end-on != 'environment'`.
3. After `branch-create`, add:

   ```yaml
     # On a pull request with a filled branch slot, the end-to-end stage tests the
     # pull request's own commit in its environment. It waits for the other stages
     # and for the environment, then deploys and tests inside the environment's
     # group, so no other run deploys over the environment while it is under test.
     # The gate takes this job's result as the stage's and does not deploy again.
     end-to-end-deployed:
       needs: [plan, framework, sanity, unit, integration, branch-create]
       if: ${{ !cancelled() && needs.plan.outputs.end-to-end-on == 'environment' && needs.framework.result == 'success' && contains(fromJSON('["success","skipped"]'), needs.sanity.result) && contains(fromJSON('["success","skipped"]'), needs.unit.result) && contains(fromJSON('["success","skipped"]'), needs.integration.result) && needs.branch-create.result != 'failure' }}
       runs-on: ubuntu-latest
       concurrency:
         group: tropis-env-${{ github.repository }}-${{ needs.plan.outputs.environment || 'shared' }}
         cancel-in-progress: false
       steps:
         - uses: actions/checkout@v7
         - uses: actions/setup-node@v7
           with:
             node-version: ${{ inputs.node-version }}
         - run: node .tropis/scripts/pipeline.mjs branch deploy "$HEAD_REF"
           env:
             HEAD_REF: ${{ github.event.pull_request.head.ref }}
             TROPIS_SECRETS: ${{ toJSON(secrets) }}
         - run: node .tropis/scripts/pipeline.mjs run end-to-end --branch "$HEAD_REF"
           env:
             HEAD_REF: ${{ github.event.pull_request.head.ref }}
             TROPIS_SECRETS: ${{ toJSON(secrets) }}
         - if: failure()
           uses: actions/upload-artifact@v7
           with:
             name: end-to-end-evidence
             path: end-to-end-evidence/
             retention-days: 7
             if-no-files-found: ignore
   ```

   A sanity, unit or integration job that is `skipped` was empty or skipped by the plan;
   with framework required to succeed, it cannot be one GitHub skipped after a failure.
4. `gate`: `needs` becomes
   `[plan, framework, sanity, unit, integration, end-to-end, end-to-end-deployed]`; its
   step's `env` gains `END_TO_END_DEPLOYED: ${{ needs.end-to-end-deployed.result }}`; the
   gate call gains the argument `"end-to-end-deployed=$END_TO_END_DEPLOYED"` after
   `"end-to-end=$END_TO_END"`.
5. `deploy` does not change.

In `guards/pipeline.test.js`, *GitHub workflow*: the job list gains `end-to-end-deployed`
after `branch-create`; the gate's `needs` is
`['plan', ...STAGES.slice(0, -1), 'end-to-end-deployed']`; the concurrency loop covers
`end-to-end-deployed` too; new assertions: its `needs` are exactly
`['plan', 'framework', 'sanity', 'unit', 'integration', 'branch-create']`; its `if`
contains `!cancelled()`, `end-to-end-on == 'environment'`, `needs.framework.result ==
'success'`, each of the three stages' result checks and `needs.branch-create.result !=
'failure'`; the deploy step comes before the test step and they run exactly the two
commands above; the upload step has `if: failure()` and the four `with` values above;
`end-to-end`'s `if` contains `end-to-end-on != 'environment'` and its `needs` are still
`[plan, framework]`; the plan's run text contains `--event "$EVENT_NAME"` and its
outputs map `end-to-end-on`; the gate step's run text contains
`end-to-end-deployed=$END_TO_END_DEPLOYED`. Run the suite.

## Task 5 — the command list

`commandList()`: the plan line gains `--event "$EVENT"`; the gate line gains
` end-to-end-deployed="$END_TO_END_DEPLOYED"`; after the `branch create` entry, add

```
'# On a pull request whose plan says end-to-end-on=environment, in one job holding the environment: deploy, then test.',
'node .tropis/scripts/pipeline.mjs branch deploy "$BRANCH"',
'node .tropis/scripts/pipeline.mjs run end-to-end --branch "$BRANCH"',
```

and leave the existing `branch deploy` entry as it is. Update the three
tests that read `commands` only as far as they assert the lines changed here; each must
still check what it checks today. Update the module docstring's sentence about pull
requests to say that, where the branch slot is filled and the end-to-end stage runs, the
pull request deploys before that stage and the gate does not deploy again. Run the suite.

## Task 6 — the documents

1. `templates/README.md`, *The pipeline*: after the paragraph that ends
   "...needs `closed` listed in the `pull_request` types of
   `.github/workflows/pipeline.yml`.", add:

   ```markdown
   When the branch slot is filled and `pipeline/end-to-end.sh` exists, a pull request's
   end-to-end stage tests that pull request's own code in its environment. It starts
   once sanity, unit and integration have passed or were empty and the environment
   exists, deploys the head commit with `deploy.sh`, and runs `end-to-end.sh` with
   `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` set, while no other run can deploy to that
   environment. The run then does not deploy the same commit again. If the stage fails,
   whatever it wrote to `end-to-end-evidence/` is kept as an artifact for 7 days. Run it
   locally against an environment with
   `node .tropis/scripts/pipeline.mjs run end-to-end --branch <branch>`. On a push to
   the main branch, and where either is missing, the end-to-end stage runs beside the
   others as before.
   ```

2. `framework/DECISIONS.md`: after the FW-028 line
   `**Amended 2026-11-01** — a stage may also be skipped because the same code already passed; FW-048.`
   add a line `**Amended 2026-11-07** — a pull request's own environment may receive a deploy before every stage has passed; FW-074.`
   Append:

   ```markdown
   ## FW-074: A pull request's end-to-end stage tests the commit deployed to its environment

   **Date:** 2026-11-07 · **Status:** Accepted; built by the backlog item
   end-to-end-tests-the-deployed-pull-request. Amends FW-028: only a pull request's own
   environment may receive a deploy before every stage has passed.

   **Decision:** On a pull request whose branch slot is filled and whose plan runs the
   end-to-end stage, that stage runs in its own job, `end-to-end-deployed`, after sanity,
   unit and integration passed or were empty and after the branch's environment exists.
   Holding the environment's concurrency group, it deploys the head commit with the
   slot's deploy and then runs `pipeline/end-to-end.sh` with `TROPIS_ENVIRONMENT` and
   `TROPIS_BRANCH`; on failure it uploads `end-to-end-evidence/` for 7 days. `plan
   --event` prints `end-to-end-on=environment` or `runner`, so which job runs is decided
   in the script, not the workflow. The gate takes that job's result as the stage's, still
   holds on its failure, and does not deploy the same commit again. On a push to the main
   branch, and where the slot is empty or the script absent, the stages run as before.

   **Evidence:** A project whose browser tests need a deployed app could not make them a
   required check on a pull request: the end-to-end stage ran beside the others, before
   the pull request's deploy, so it tested an older deploy or no environment at all.
   Raised by first-adopter's upstream flush.

   **Rejected:** Making the existing `end-to-end` job wait for the other stages on every
   run (it would slow every push to main and every project without a branch slot);
   deciding the job in workflow conditions alone (FW-028 rejected untestable conditions;
   the remaining condition only reads the plan and the needed jobs' results); deploying in
   one job and testing in another (the concurrency group is per job, so another run could
   deploy between them).

   **Consequences:** Breaking for a project with both a filled branch slot and
   `pipeline/end-to-end.sh`: its pull requests deploy before the end-to-end stage, and
   that script can now read the environment it tests. The required check is still the
   gate, which needs both end-to-end jobs.
   ```

3. `RELEASES.md`: under `## [Unreleased]`, replace `_Nothing yet._` with:

   ```markdown
   - **Breaking, for a project with `pipeline/branch/` filled and a `pipeline/end-to-end.sh`:** on a pull request, the end-to-end stage now waits for the other stages, deploys the pull request's commit to its environment and tests it there, with `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH` set, and the run no longer deploys that commit again afterwards. If your end-to-end script ran without a deployed app, check it still does what you want; to keep evidence of a failure, write it to `end-to-end-evidence/`, which is kept for 7 days.
   ```

## Task 7 — verification, then the handover report

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
   Passing: every test passes; report the count. Use this after each task.
3. Re-break, in the staged export only, and report each output:
   - In `scripts/pipeline.mjs`, make `endToEndOn` always return `'runner'`: the Task 1
     tests expecting `environment` fail.
   - Remove the `end-to-end-on === 'environment'` return from `gateDecision`: the Task 2
     test expecting `skipped` on a green pull request fails (it would say `run`).
   - Remove `end-to-end-deployed` from the gate's `needs` in the template: the
     *GitHub workflow* test fails.
   Restore each and see the guard pass.
4. `npm --prefix .tropis test` from the worktree (after `npm --prefix .tropis ci`): it
   must pass; report its count.
5. `YAML.parse` the template (any node one-liner using `.self-check/node_modules/yaml`)
   to confirm it parses; the guard does this too.
6. `git diff --stat origin/main...HEAD`: every file in the File Structure table except
   `feature-catalog.yaml`, nothing else.

Then append `## Handover report` to this plan, with the six sections
`.claude/rules/planning.md` names (*Every plan ends with a handover report*), commit it,
run step 1 again on that commit, and push the branch.

## Traps

- **The workflow cannot be run here.** Nothing in this plan runs GitHub Actions; the
  guard reads the template as YAML. Do not try to run a workflow or open a pull request
  to see one run.
- **`npm --prefix .tropis test` runs the installed release**, which knows nothing of this
  change. That is right; do not edit `.tropis/`.
- **`.github/workflows/` in this repository is the installed copy.** Edit only
  `templates/github/tropis-pipeline.yml`.
- **FW-074 may be taken by a plan that merges first.** If `origin/main` has an FW-074 when
  you rebase, renumber yours to the next free number in both places (the entry and the
  FW-028 amendment line) and in `RELEASES.md` if it names it; that is a mechanical
  conflict in a file every plan touches.
- **Existing plan-output tests must not change**: without `--event` the plan prints
  exactly what it prints today. If one of them fails, the new line leaked; fix the code,
  not the test.

## Handover report

### Task completion

Tasks 1 to 7 done. Task 1 (`endToEndOn`, `plan --event`, the `end-to-end-on=` line), Task 2
(gate mapping, deploy decision and row text, missing-result error), Task 3
(`run end-to-end --branch`), Task 4 (workflow job and gate wiring, with the *GitHub workflow*
guard), Task 5 (`commandList`, module docstring), Task 6 (README paragraph, FW-074 and the
FW-028 amendment line, release-notes line). `feature-catalog.yaml` untouched, no pull
request opened, as instructed. Named source worked from: none beyond this repository's own
`scripts/pipeline.mjs` and `guards/pipeline.test.js`; the YAML job is the plan's text.

### Verification results

Run with git 2.43, node v22, bash, on Linux x86_64 (Claude Code cloud session).

- `guards/pipeline.test.js` alone, staged from an export of `HEAD` as `CLAUDE.md` describes
  (`{"type":"module"}` package file, `templates/framework-jest.config.js` as `jest.config.js`,
  `node_modules` linked to the installed `.tropis/node_modules`): `Tests: 162 passed, 162 total`
  (it was 135 before this change; 27 added, none removed or weakened).
- Re-breaks in the staged export only, each restored afterwards:
  - `endToEndOn` always returns `'runner'`: `Tests: 2 failed, 160 passed` (`where the end-to-end
    stage runs › is the environment only for a pull request with a filled slot and a planned
    stage`, `… › prints end-to-end-on=environment for a pull request with a filled slot`).
  - the `end-to-end-on === 'environment'` return removed from `gateDecision`: `Tests: 2 failed,
    160 passed` (`the gate with the end-to-end stage in the environment › takes the deployed
    result as the stage, and does not deploy again`, `… › decides through gateDecision the same
    way`).
  - `end-to-end-deployed` removed from the gate's `needs`: `Tests: 1 failed, 161 passed`
    (`GitHub workflow › gives each stage its own job, and the four filled stages run side by
    side`).
  - restored: `Tests: 162 passed, 162 total`.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 210 passed, 210 total`.
- `YAML.parse` of `templates/github/tropis-pipeline.yml` with `.self-check/node_modules/yaml`:
  `yaml ok`.
- `bash scripts/check-blueprint.sh` on the implementation commit ended
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.` (re-run on the report's own commit: see the end of
  this section.)

### Scope

`git diff --stat origin/main...HEAD` on the implementation commit: `RELEASES.md`,
`framework/DECISIONS.md`, `guards/pipeline.test.js`, `scripts/pipeline.mjs`,
`templates/README.md`, `templates/github/tropis-pipeline.yml` (6 files, 495 insertions, 22
deletions), plus this plan file with the report. Every file is in the File Structure table;
`feature-catalog.yaml` is not touched. Worktree used: `tropis-e2e-deployed`, a sibling of the
main checkout, on `plan/end-to-end-tests-the-deployed-pull-request`; nothing was done in the
main checkout.

### Judgment calls

- `planStages` is not given `event`: the CLI block removes it from the options before the call
  and applies `endToEndOn` afterwards.
- The result substitution (`stageResults`) takes the event and applies on a pull request only,
  so on a push the deployed result is ignored, as Task 2's tests require. The missing-result
  error (`gate: missing result for end-to-end-deployed`, exit 2) is raised in `gateCommand`
  after the plan is read, again only for a pull request whose plan says `environment`.
- `end-to-end`'s `if` is wrapped in `${{ }}` so the `!=` expression is unambiguous YAML.
- `plan --event ''` is refused with the same message as a missing value.
- The `run --branch` fixture tests use a script that exits 9 on wrong or unexpected values, so
  the "neither without `--branch`" case also proves the values are not leaked.
- The work was committed as one commit (the working commits were squashed before the self-check).

### What the plan got wrong

Nothing that blocked the work. Task 2 step 1 describes the helper as keyed on the plan alone,
while its tests require the deployed result to be ignored on a push; the helper needed the
event as well (found by the first test run).

### Outstanding

Nothing. The workflow itself was not run (the plan forbids it); the reviewer sees it only
through the guard.
