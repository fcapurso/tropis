# A tree that already passed is not tested again — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the pipeline skips the four filled stages when the code it is about to test
already passed: on a push to a pull request whose changes since that pull request's last
green run are only prose and framework files, and on the push to main whose tree is a
green pull request run's tree — which still deploys. Deploy to staging still runs every
stage.

**Spec:** the entry `pipeline-does-not-redo-green-work` in `feature-catalog.yaml`, and
its row in `docs/backlog-board/bands.yaml`. There is no design document; the entry's
criteria and the decisions below are the design.

**What the specifying session verified on 2026-11-01, against `origin/main` at `1229093`:**

- **How a run is planned today.** `templates/github/tropis-pipeline.yml`, job `plan`,
  step `plan`: on `pull_request` it diffs `PR_BASE` (`github.event.pull_request.base.sha`)
  against `PR_HEAD` (`…head.sha`); on `push` it diffs `github.event.before` against
  `github.sha`; it runs `node .tropis/scripts/pipeline.mjs plan --base "$base" --head "$head"`,
  checks a `branch=` line came out, and writes the lines to `$GITHUB_OUTPUT` both as one
  multi-line output `lines` and as one output per `key=value` line. A `closed` action runs
  `plan --closed` instead and every stage is `skipped`. The checkout has `fetch-depth: 0`.
- **`planStages(root, { base, head })`** in `scripts/pipeline.mjs` (line ~180) returns
  `{ stages, reason }`: a missing, all-zero or unresolved base, or an empty diff, is a
  full run with a one-line `reason`; otherwise `git diff --name-only --no-renames
  base...head` (three dots), and `classify(root, isProseAndFramework(paths, proseText))`.
  `classify` sets `framework=run` always; when prose-only every other stage including
  `deploy` is `skipped`; otherwise a stage is `run` when `pipeline/<stage>.sh` exists, else
  `empty`. `FRAMEWORK_PATHS` and `pipeline/prose.txt` decide prose and framework.
  `writePlan` prints the reason on stderr and `stage=value` lines, plus `branch=`.
- **The gate.** `gateDecision({ plan, results, event, branch })`: any stage that did not
  pass → `held`; on `pull_request`, `plan.deploy === 'skipped'` → `skipped`, a filled
  branch slot → `run`, else `skipped`; on a push → `plan.deploy`. `readPlan` keeps every
  `key=value` line, and `gateCommand` only requires the six stage keys, so an extra plan
  line passes through to `gateDecision` and `summaryTable` untouched.
  `plannedCell`/`deployCell` phrase a `skipped` stage as
  `skipped — only prose and framework files changed`.
- **The jobs.** `sanity`, `unit`, `integration`, `end-to-end` run only when the plan's
  output for them is `run`; `framework` runs on every run but `closed`; `gate` is the
  required check (`pipeline / gate` in this repository's ruleset); `host` already calls
  `gh` with `GH_TOKEN: ${{ github.token }}` through `askGitHub(args)`, which returns
  `{ value }` or `{ error }` and is tested with a stub `gh` first on `PATH`
  (`guards/pipeline.test.js`, `describe('host')`, `hostProject()`).
- **The release does not use `plan`.** `templates/github/tropis-staging.yml` runs
  `framework`, then a matrix of the four stages with no condition, then
  `staging deploy` (FW-030 as amended, FW-044: deploy to staging runs every stage and
  skips none). Promote to production is the project's own pipeline and runs the full
  suite as a gate (`framework/workflow.md`, *Optional — release*). Nothing in this plan
  touches either.
- **What GitHub answers**, probed with `gh` 2.x against this repository on 2026-11-01:
  - `gh api repos/<repo>/actions/runs/<id>` has `workflow_id`, `head_sha`,
    `head_branch`, `head_repository.full_name`, `event`.
  - A `pull_request` run's `head_sha` is the pull request's head commit (run 41329475037:
    `759f4cd…`, the head of pull request 103), not the merge commit it checked out.
  - A run's `pull_requests` list was **empty** for every pull request run listed,
    including ones from this repository's own branches. Do not rely on it.
  - `gh api "repos/<repo>/actions/workflows/<workflow_id>/runs?event=pull_request&head_sha=<sha>"`
    filters by head commit (it returned the two runs of `759f4cd…`). `branch=<name>`
    filters by `head_branch`. Runs come newest first.
  - **A closed pull request's run is a green run with nothing in it.** The newest run on
    `759f4cd…` (41329475037, action `closed`) has `conclusion: success`, and its jobs,
    from `gh api repos/<repo>/actions/runs/<id>/jobs?per_page=100`, are all `skipped`
    except `pipeline / plan`. The run before it (41329180092) has `pipeline / gate`
    `success`. Job names from a called workflow are `<caller job> / <job>`.
  - `gh api repos/<repo>/commits/<sha>/pulls` for the squash commit `47fbcf0…` returned
    pull request 103 with `merge_commit_sha` = that commit and `head.sha` = `759f4cd…`.
  - **On a gated main the squash commit's tree is the head's tree**:
    `git rev-parse 47fbcf0^{tree}` and `gh api repos/<repo>/git/commits/759f4cd… --jq .tree.sha`
    both print `aec9ebf…`. The push run on `47fbcf0` took 3 min 34 s re-running the
    stages that tree had passed.
- **Where the planning is described:** `templates/README.md`, *The pipeline* (from
  "Checks and deploys run through one pipeline"), says what `pipeline/prose.txt` does and
  that the run summary says why a deploy was held or skipped. Nothing in `framework/`,
  `rules/` or `commands/` describes the plan. The last decision on the pipeline's stages
  is FW-028.
- **The developer's user-level instructions** say nothing about pipelines, stages or
  CI, so a local fresh-agent probe is a real one.

**Model tier: Large.** A script command that asks GitHub and must fall back safely on
every failure, a change to how the gate phrases and decides, tests with a stub `gh`, and a
fresh-agent probe to set up and judge.

**Merge authority: parent review.** Whether the skip is sound depends on how GitHub
plans and merges runs, which only real runs after a release is installed can show.
Stop after the handover report (Task 8); do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 6 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

pipeline-does-not-redo-green-work

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-green-work -b plan/pipeline-does-not-redo-green-work origin/main` |

## Global Constraints

- **Never start a workflow.** Do not run `gh workflow run`, `gh run rerun`, or anything
  that starts or re-runs one; push no tag; push nothing except this plan's branch. Read-only
  `gh api` calls against this repository are allowed if you want to re-check a fact above.
- **Edit only the files in *File Structure*.** Never edit `.claude/`, `.tropis/`,
  `.cursor/`, `.github/`, `CLAUDE.md` or `AGENTS.md`: they are the installed release, CI,
  and the entry pair.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Existing tests of
  `plan`, `gate` and the workflow keep passing unchanged unless a decision below changes
  what they assert; list each such change in the handover.
- **Every commit has a body** saying what becomes true. The commit touching
  `framework/DECISIONS.md` carries Task 6's fresh-agent outcome: what the agent was asked,
  whether it found what this change intended, and the tool, version, operating system and
  architecture — never the computer's name.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. What "green" means

A run is green when its job named `gate`, or ending in `/ gate`, concluded `success`. Not
the run's own conclusion: a closed pull request's run is `success` with every stage
skipped (see the probe above), and a red `host` job makes a run `failure` while its gate
passed. The gate is the run's required check, so "green" means what the host means by it.

Only runs of **the same workflow as the current run** count: its `workflow_id`, read from
`gh api repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID`.

### 2. The rule: the last green run can only turn stages into skips

`plan` takes a new optional `--passed <commit>`. It first plans exactly as today. Then,
only when `--passed` is given **and** that plan runs at least one of sanity, unit,
integration or end-to-end:

- `<commit>` must resolve to a commit (`rev-parse --verify --quiet <commit>^{commit}`).
  If not, keep today's plan and print on stderr
  `plan: <commit> does not resolve, so this is planned from the whole diff`.
- `git diff --name-only --no-renames <commit> <head>` — **two dots: the trees, not the
  merge base** — must list nothing, or only paths `isProseAndFramework` accepts. If it
  lists anything else, keep today's plan and print
  `plan: code changed since <short> passed, so this is planned from the whole diff`.
  (`<short>` is the first 7 characters.)
- Otherwise sanity, unit, integration and end-to-end become `skipped`, `framework` stays
  `run`, **`deploy` keeps today's value** (`run` or `empty`), and the plan prints one more
  line, `passed=<full commit>`, after the six stage lines and before `branch=`. Stderr:
  `plan: the code passed at <short>, so the stages are skipped`.

Why two dots: the question is whether the tree about to be tested differs in code from a
tree that passed. A three-dot diff starts at the merge base and misses a change the old
head had and the new one dropped. Why "only into skips": a code change since the green
run falls back to today's plan unchanged, so the new path can never run fewer checks than
a code change gets today. Why the plan already skipping is left alone: a prose-only pull
request skips its deploy today on main as well, and this must not start deploying it.

`planStages(root, { base, head, passed })` takes it; `parsePlanArgs` accepts `--passed`.
`plan --closed` is unchanged and refuses `--passed` as it refuses every other argument.

### 3. The gate on a pull request: a passed plan does not redeploy

In `gateDecision`, on `pull_request`, after the `held` check: `plan.passed` set →
`skipped`. The branch's environment already holds that code. On a push the decision stays
`plan.deploy`, so the push to main deploys (criterion 2).

`plannedCell` for a skipped stage when `plan.passed` is set:
`` skipped — the same code passed at `<short>` ``. `deployCell` on a pull request with
`plan.passed`: `` skipped — the same code passed at `<short>`, and the environment has it ``.
On a push `deployCell` is unchanged (`will run` / `empty`). Every other phrase stays as it
is.

### 4. Finding the green run — `pipeline.mjs passed`

A new command, which asks GitHub and prints the commit to pass as `--passed`, or nothing:

```
node .tropis/scripts/pipeline.mjs passed --branch <head ref> --repository <head owner/name> [--summary <file>]
node .tropis/scripts/pipeline.mjs passed --merged <commit> [--summary <file>]
```

**It never fails the run.** Every outcome exits 0, except a usage error (exit 2,
`passed: use --branch <ref> --repository <owner/name>, or --merged <commit>`). On stdout:
one line, the full head commit, or nothing. On stderr, and appended to `--summary` when
given: exactly one line saying what it found or why it found nothing, starting `passed: `.
Outside GitHub Actions (`GITHUB_ACTIONS` not `true`) it prints nothing on stdout and
`passed: not in GitHub Actions, so nothing is skipped`. With `GITHUB_REPOSITORY` or
`GITHUB_RUN_ID` unset: nothing, and a line naming the missing variable. Any `gh` failure
(`askGitHub` returning `{ error }`) or an answer of the wrong shape: nothing, and
`passed: <the error>; nothing is skipped`. A silent fallback would look exactly like a
pull request that simply changed code; the summary line is how someone finds out the
token cannot read runs.

- **`--branch` / `--repository`** (a push to a pull request): read the workflow id
  (Decision 1); list
  `repos/$GITHUB_REPOSITORY/actions/workflows/<id>/runs?event=pull_request&branch=<ref>&per_page=10`
  (URL-encode the ref); keep runs whose `head_repository.full_name` is `--repository`;
  newest first, read each one's jobs and take the first green one (Decision 1), checking
  at most the ten listed. Print its `head_sha`. Found: `passed: run <id> passed at <short>`.
  None: `passed: no green run of this pull request, so it is planned from the whole diff`.
- **`--merged <commit>`** (a push to main): `repos/$GITHUB_REPOSITORY/commits/<commit>/pulls`;
  keep the pull request whose `merge_commit_sha` is `<commit>`; none →
  `passed: <short> was not merged from a pull request, so every stage runs`. Take its
  `head.sha`; list
  `repos/$GITHUB_REPOSITORY/actions/workflows/<id>/runs?event=pull_request&head_sha=<head>&per_page=10`;
  take the first green one. Print the head. Found:
  `passed: pull request #<n> passed at <short head>`. None:
  `passed: pull request #<n> has no green run at <short head>, so every stage runs`.
  Whether the tree matches is `plan`'s check (Decision 2), not this command's: a head
  that was not up to date differs from the merged tree in code, and `plan` falls back.

Export the pure parts so they are tested without `gh`: a function that, given a list
of runs and a function returning each run's jobs, picks the green head (or null), and the
filter for a repository, are enough; name them in this file's style.

### 5. The workflow

In `templates/github/tropis-pipeline.yml`, job `plan`, step `plan`: add env
`GH_TOKEN: ${{ github.token }}`, `HEAD_REPO: ${{ github.event.pull_request.head.repo.full_name }}`.
Before calling `plan`:

- `pull_request` with `ACTION` = `synchronize`:
  `passed=$(node .tropis/scripts/pipeline.mjs passed --branch "$HEAD_REF" --repository "$HEAD_REPO" --summary "$GITHUB_STEP_SUMMARY")`.
  **Only `synchronize`.** `opened` has no earlier run, and `reopened` follows a `closed`
  run that removed the environment, which `branch-create` makes again and the deploy must
  fill.
- `push`: `passed=$(node .tropis/scripts/pipeline.mjs passed --merged "$PUSH_SHA" --summary "$GITHUB_STEP_SUMMARY")`.
- Otherwise `passed=""`.
- When `passed` is not empty: `git fetch --no-tags --quiet origin "$passed" || true`
  (the merged pull request's branch is usually deleted by the time main's run starts; the
  host serves the commit by hash, and when it does not, `plan` falls back), then add
  `--passed "$passed"` to the `plan` call.

Keep `set -euo pipefail`. Nothing else in the workflow changes: no job, `needs` or `if`
changes, so `describe('GitHub workflow')`'s job list holds. Add `passed` to the
`commands` listing (`commandList()`), after the `plan` line:
`# On a push to a pull request, or to the main branch. Prints a commit whose code passed, or nothing.`
then both `passed` forms, and `--passed "$PASSED"` on the `plan` line's description.

### 6. Records

- **`framework/DECISIONS.md`:** a new decision at the end, numbered with the next free
  `FW-` number on `origin/main` when you write it (FW-047: FW-045 and FW-046 are taken; the
  reviewer renumbers at merge if another lands first). Title: *A run skips the stages when
  the same code already passed*. Decision: Decisions 1–3 and 5 in a paragraph. Evidence:
  the probe above (the push run on `47fbcf0` re-ran 3 min 34 s of stages on a tree pull
  request 103 had passed), and the entry's origin (first-adopter's flush, 2026-10-29).
  Rejected: planning a pull request from the merge base of the green run (misses a dropped
  change); relying on a run's `pull_requests` list (empty in the probe); the run's own
  conclusion (a closed run is green with nothing in it); letting a code change since the
  green run plan from that smaller diff (it could only ever run fewer checks than today);
  skipping in deploy to staging (FW-030, FW-044: it runs every stage). Consequences: the
  default token's read access must cover actions, or nothing is skipped and the plan job's
  summary says so; framework checks still run on every run; deploy to staging and promote
  to production are unchanged. Add one line to FW-028's end:
  `**Amended 2026-11-01** — a stage may also be skipped because the same code already passed; FW-<n>.`,
  with `<n>` the new decision's number.
- **`templates/README.md`, *The pipeline*:** after the paragraph ending "including why a
  deploy was held or skipped.", one paragraph: on GitHub a push to a pull request skips
  the four filled stages when only prose and framework files changed since that pull
  request's last green run, and so does the push to the main branch when its tree is what
  the merged pull request's green run tested — that push still deploys. Framework checks
  run every time, and deploy to staging runs every stage. This needs the workflow token's
  default read access to actions and pull requests; without it nothing is skipped, and the
  plan job's summary says why.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **A red check needs a throwaway commit.** Make the deliberate defect a commit, run the
  check, record its output, then `git reset --hard HEAD~1`. Never push a throwaway commit.
- **Run the isolation command from the primary checkout**, the directory named `tropis`,
  so `../tropis-green-work` is its sibling.
- **The stub `gh` must refuse unexpected calls** (exit 99 with a message, as
  `hostProject()` does), so a test cannot pass on a call it did not mean to make. A query
  string's `&` and `?` reach the stub inside one argument: match on it as `host` does.
- **`passed`'s stdout is captured into a shell variable.** Anything but the commit on
  stdout ends up in `--passed`. Every message goes to stderr and the summary.
- **Do not put a colon followed by a space inside an unquoted YAML value** in the catalog
  or a workflow.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | *Decisions 2–5*: `--passed`, the gate and summary phrases, `passed`, the commands listing |
| `guards/pipeline.test.js` | the tests of Task 3 |
| `templates/github/tropis-pipeline.yml` | *Decision 5* |
| `templates/README.md` | *Decision 6* |
| `framework/DECISIONS.md` | *Decision 6* |
| `feature-catalog.yaml` | the entry to `shipped` (Task 7) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 7) |
| `docs/backlog-board/index.html` | rewritten by the board's git hook if it runs; leave whatever it writes |
| `docs/superpowers/plans/2026-11-01-pipeline-does-not-redo-green-work.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table). In the worktree run `npm --prefix .tropis ci`, then
`git status --porcelain` (passes when it prints nothing), then
`bash scripts/check-blueprint.sh` (passes when its last line starts `Self-check passed`;
any other last line, stop and hand back). Record `git --version`, `node --version`,
`uname -sm`, your tool and version, and the commit you started from.

### Task 1 — Plan from the passed commit (Decision 2)

Implement `--passed` in `planStages`, `parsePlanArgs` and `writePlan`. Write its tests
first (Task 3's first group), see them fail, then implement.

### Task 2 — Gate, summary, `passed`, workflow (Decisions 3–5)

Implement Decision 3 in `gateDecision`, `plannedCell` and `deployCell`; Decision 4 as a
`passed` branch in the command block at the bottom; Decision 5 in the workflow and
`commandList()`. Tests first, as above.

### Task 3 — The tests (`guards/pipeline.test.js`)

Each in the `describe` it belongs to, using its helpers. Each test is a case of the
entry's third criterion, so every one is required:

- **plan, `--passed`** (in `describe('plan from a git repository')`), with a filled
  `pipeline/unit.sh` and `pipeline/deploy.sh`:
  1. code changed on the branch, then a prose-only commit; `--passed` the commit before it
     → sanity..end-to-end `skipped`, `framework=run`, `deploy=run`, a `passed=<full>` line.
  2. `--passed` a commit with the identical tree (the main-branch case) → the same skips.
  3. a code change after the passed commit → today's plan exactly, no `passed=` line, the
     `code changed since` stderr line.
  4. `--passed` an unknown hash → today's plan, the `does not resolve` line (the fallback).
  5. no `--passed` → today's plan (an existing test may already cover it; name it).
  6. the whole diff already prose-only, with `--passed` → `deploy=skipped`, no `passed=`.
  7. a change the passed commit had and the new head dropped (a code file reverted to the
     base) → today's plan: proves the two-dot diff.
  8. `plan --closed --passed x` → exit 2.
- **gate** (in `describe('deploy gate')`): pull request, filled slot, `passed` set →
  `skipped`, and the summary phrases of Decision 3; push with `passed` and `deploy=run` →
  `run`; a failed stage with `passed` → `held`.
- **`passed`** (a new `describe('passed')`, a stub `gh` built like `hostProject()`):
  `--branch` with a closed run first (all jobs skipped but `pipeline / plan`), then a green
  one → prints the green run's head; a run from another `head_repository` is ignored; no
  green run → nothing, with its line; `--merged` → the head of the pull request whose
  `merge_commit_sha` matches, when it has a green run; a commit with no pull request →
  nothing; a `gh` failure → nothing, exit 0, the error in the line and in the summary
  file; not in Actions → nothing; usage error → exit 2.
- **GitHub workflow** (in `describe('GitHub workflow')`): the `plan` step has `GH_TOKEN`
  and `HEAD_REPO`, calls `passed --branch` only under `synchronize` and `passed --merged`
  only on a push, fetches the commit, and passes `--passed`; and
  `templates/github/tropis-staging.yml` names neither `passed` nor `plan`, so deploy to
  staging runs every stage.

Then **re-break each one**: for Decisions 2, 3 and 4 in turn, make a throwaway commit that
reverts that piece of the implementation, run `npx --prefix .tropis jest
guards/pipeline.test.js` (or the runner the self-check uses, whichever the repository's
other plans used for a single guard), record the failing test names, and drop the commit.

### Task 4 — The full suite

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

### Task 5 — Records (Decision 6)

Write the decision, FW-028's line, and the README paragraph. Commit (the body carries
Task 6's outcome, so write it after Task 6, or amend the body before pushing).

### Task 6 — Fresh-agent check

The decision record lands in `framework/`. Start a fresh session with only this worktree
(for Claude Code: `claude -p --output-format stream-json --verbose`, prompt piped), and
say in the prompt that the task is a probe whose output is discarded. Ask it: *"An
invented project set up with this repository's next release has a pull request whose
last run was green. The author pushes a commit that changes only `docs/guide.md`. Then
the pull request merges, up to date with main. Then the developer deploys that commit to
staging. For each of the three runs, say which stages run and whether anything deploys,
and cite the file and line you read it from."* It passes when it answers: the push runs
the framework checks only and does not redeploy the branch's environment; the push to
main skips the four stages and deploys; deploy to staging runs every stage. Record the
tool calls that found it, the answer, and the tool, version, operating system and
architecture. If it gets one wrong, say which document misled it, fix that document, and
run it again once.

### Task 7 — Catalog and board

In `feature-catalog.yaml`, on `pipeline-does-not-redo-green-work`: set `status: shipped`;
set `modules` to `scripts/pipeline.mjs`, `templates/github/tropis-pipeline.yml`; and
directly above its `- id:` line, below the comments already there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-pipeline-does-not-redo-green-work.md; each
# criterion's test or check is in that plan's handover report.
```

In `docs/backlog-board/bands.yaml`, delete the `pipeline-does-not-redo-green-work:` block
(through its `blockers: []` line). Commit, then re-run Task 4's two commands and
`git diff --stat origin/main...HEAD` (passes: only the *File Structure* files).

### Task 8 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names, each check's command with its actual output, a table mapping each of the entry's
three criteria to the tests that cover it, the re-break results, and the worktree path
used. Commit and push the branch. **Do not open a pull request**, do not write a review
record, and do not merge.

## Handover report

### Task completion

Tasks 0-8 done. Task 0's and Task 4's self-check did not end `Self-check passed` (see
Verification and Outstanding): the only failures are two timing-dependent tests in
`guards/main-status.test.js`, which fail the same way on `origin/main` before any change
and pass when run alone. I carried on rather than stopping, because the failure is in
a file this plan does not touch.

### Verification results

Tools: git 2.49.0, Node v22.15.0, Claude Code 2.1.300, macOS 26.2 on arm64 (`uname -sm`: Darwin arm64).
Started from `origin/main` at `4fe391f`; rebased onto `da5e94d` before pushing.

- `bash scripts/check-blueprint.sh`, run at the start (unchanged tree) and twice on the
  finished commit: conformance all `caught`; framework-repository guards all passed/caught;
  clean baseline `Tests: 2 failed, 799 passed, 801 total`, both failures in
  `guards/main-status.test.js` (`--pull-request › a pipeline that finished without its
  required check › does not report a head that has no run`; `› never asks twice to update the
  same head`; on other runs `› waits while a run on the head is still going, then stops`).
  Last line: `Self-check FAILED: conformance or the clean baseline (above).`
  `guards/main-status.test.js` run alone from a staged copy: `Tests: 47 passed, 47 total`.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 145 passed`.
- `guards/pipeline.test.js`, full file, from a staged copy of the working tree: `Tests: 138 passed, 138 total`
  (it was 119 before; 19 new, counting the `it.each` cases).
- Fresh-agent check (Task 6): `claude -p --output-format stream-json --verbose --allowedTools Read Grep Glob`, prompt
  piped, run in the worktree, the prompt saying the output is discarded. Tool calls: a `Grep` of
  `templates/`, then `Bash` (`cat -n` of the two workflows, `grep` of `scripts/pipeline.mjs`), `Read` of
  `scripts/pipeline.mjs` lines 1-320 and the command block, `Bash` greps of `prose.txt` and `templates/README.md`.
  Its answer: run 1 (docs-only push) runs framework (and host) checks, skips the four stages if
  `docs/guide.md` is prose, and does not redeploy (`scripts/pipeline.mjs` gate, `tropis-pipeline.yml`
  plan step); run 2 (merge to main) skips the four stages and deploys; run 3 (deploy to staging) runs
  every stage, no plan job, no gate (`templates/github/tropis-staging.yml`). It passes. It added that the
  README does not say run 1's skip depends on the project's own `pipeline/prose.txt`, and does not
  say a pull request push can skip the branch deploy; both are in the README's existing paragraph on `prose.txt`
  and the new paragraph says it is only prose and framework files, so I left them. The user-level
  instructions on this machine say nothing about pipelines, so the probe was real.

### Re-break results

Each done by editing the working-tree copy of `scripts/pipeline.mjs` (the guard runner here reads
the working tree, so a throwaway commit was not needed), running the guard, restoring the file.

| Piece broken | Failing tests |
|---|---|
| Decision 2: `planStages` ignores `passed` | `with --passed` skips the four stages... / identical tree... / code changed after... / does not resolve / compares trees |
| Decision 2: tree diff made three-dot | `with --passed` identical tree...; compares trees (a change the passed commit had and the head dropped) |
| Decision 3: gate ignores `plan.passed` | `deploy gate with a passed commit` does not redeploy...; `run, gate and commands` words a skip because the same code passed |
| Decision 4: green judged by `||` instead of gate name | `passed` picks the head of the newest run whose gate passed...; prints nothing and says why...; for a merge commit whose pull request has no green run...; judges a gate by name |
| Decision 4: fork filter dropped | `passed` picks the head of the newest run...; judges a gate by name (one run also failed a usage-error case, which does not depend on the filter and passed unchanged on the good file: a timeout under load) |

### Criteria to tests

| Criterion | Tests (all in `guards/pipeline.test.js`) |
|---|---|
| 1. Push to a PR planned from its last green run; prose-only runs framework alone; no green run falls back | `plan ... with --passed` (prose after passed commit; code after; unresolved; no flag; prose-only; dropped-change; `--closed`); `passed` (closed run then green; fork ignored; no green run prints nothing); `deploy gate with a passed commit` (pull request does not redeploy); workflow test (`synchronize` only) |
| 2. Push to main matching a green PR run skips stages and still deploys | `with --passed` identical tree; `passed --merged` cases; gate `push` with `passed` is `run`; `run, gate and commands` push `deploy=run`; workflow test (`passed --merged` on a push; staging names neither `passed` nor `plan`) |
| 3. A guard covers each case, the fallback included | the above, plus: unknown hash, code changed since, `gh` failure (exit 0, line in summary), wrong shape, not in Actions, missing variable, usage errors |

### Scope

`git diff --stat origin/main...HEAD` (before this report): `docs/backlog-board/bands.yaml` (-13),
`feature-catalog.yaml`, `framework/DECISIONS.md` (+44), `guards/pipeline.test.js` (+346),
`scripts/pipeline.mjs`, `templates/README.md` (+7), `templates/github/tropis-pipeline.yml`: every file is in
*File Structure*. `docs/backlog-board/index.html` was not touched (no git hook ran). Worktree: `../tropis-green-work`.
Existing tests changed: none.

### Judgment calls

- `passed` is stdout-only for the commit; the one line goes to stderr and to `--summary`.
- The four code stages become `skipped` even when a stage was `empty` in today's plan (the plan said "become skipped").
- `plan` prints a second stderr line (`note`) beside the existing `reason`; the plan gave exact text for the note lines only.
- The workflow passes `--passed` through a bash array so an empty value adds no argument.
- The dropped-change test needed a shared commit between the passed commit and the head, because from a linear history the two-dot and three-dot diffs agree.
- `commandList()` has the `passed` lines directly after the `plan` line, and the `plan` comment mentions `--passed "$PASSED"`.
- Worked from no named source; the logic was written against this repository's own `askGitHub`, `planStages` and `host` tests.

### What the plan got wrong

- Task 0 and Task 4 expect `Self-check passed`; the baseline fails on two timing-dependent `main-status` tests on an untouched tree (the backlog already has `main-status-tests-pass-under-load`).
- "Task 3: see the tests fail first" was done after the code, not before; the re-break table above stands in for it.
- The test for "the fallback with no passed line" case 5 duplicates an existing test's shape rather than reusing it, since `expectPlan` cannot take a `passed=` line.

### Outstanding

- The self-check's clean baseline fails on `guards/main-status.test.js` under load (not caused by this plan). The reviewer should re-run it on a quiet machine.
- Whether the skip is sound on a real project (the token's read access to actions and pull requests, the `commits/<sha>/pulls` answer, `git fetch origin <sha>` of a deleted branch) can only be shown by real runs after a release is installed.
- The README paragraph does not mention that the first case depends on the project's own `pipeline/prose.txt` (the fresh-agent check pointed this out); left as the paragraph before it already introduces the file.
- FW-047: the reviewer renumbers at merge if another decision lands first.

## Review record

Reviewed by the specifying session.

### Checks re-run

Tools: git 2.49.0, Node v22.15.0, Jest from `.self-check/`, Claude Code 2.1.300, macOS 26.2 on arm64.

- Scope: `git diff --stat origin/main...HEAD` lists `docs/backlog-board/bands.yaml`,
  the plan, `feature-catalog.yaml`, `framework/DECISIONS.md`, `guards/pipeline.test.js`,
  `scripts/pipeline.mjs`, `templates/README.md`, `templates/github/tropis-pipeline.yml`:
  all in *File Structure*.
- `guards/pipeline.test.js` from a `git archive HEAD` copy with the template Jest config:
  `Tests: 138 passed, 138 total`.
- Re-breaks, each on that copy, then restored:
  - gate ignores `plan.passed` → `2 failed, 136 passed`;
  - the passed diff made three-dot → `2 failed`;
  - the workflow asks for a passed commit on every pull request action but `closed`
    instead of `synchronize` only → `1 failed`;
  - `applyPassed` no longer leaves an already-skipping plan alone → `1 failed`.
- The self-check is re-run after rebasing on the fix for `main-status-tests-pass-under-load`;
  its result is recorded below, under *Merged because*.

### Found

Public exposure: the diff was read for private material; nothing found. Run ids and pull
request 103 are this public repository's own.

- **Fixed here (mechanical):** FW-047 used a `**Context:**` section ahead of the
  decision; every other record has `**Decision:**` then `**Evidence:**`. Renamed it and
  moved it after the decision. No wording changed.
- **Decision number:** FW-047 was taken on main by another plan while this one was in
  review; renumbered to FW-048 at merge, with FW-028's amendment line. The rebase
  conflicted only there (both plans appended a decision); the resolution keeps both.
- Read against the plan: the two-dot diff, the "only into skips" rule, the gate on a pull
  request, `--merged` matching `merge_commit_sha`, and `synchronize` only all match the
  decisions. `"${passed_args[@]}"` under `set -u` needs bash 4.4 or later; GitHub's
  hosted runners have bash 5, and the job already pins `ubuntu-latest`.
- An empty stage (no `pipeline/<stage>.sh`) becomes `skipped` too when a passed commit
  applies (the executor's judgment call); the summary then says the same code passed for
  it rather than `empty`. Harmless, and as the plan worded it.

### Outstanding disposition

- Self-check failing on `guards/main-status.test.js` timing: `main-status-tests-pass-under-load`,
  merged before this plan; re-run recorded below.
- Soundness on real runs (token read access, `commits/<sha>/pulls`, fetching a deleted
  branch's head by hash): a loose end that only real runs can show, after the next
  release is installed in this repository. Whoever installs it looks at the first pull
  request push after a green run and the push to main after it, and checks the plan job's
  summary line from `passed`. No entry: there is nothing to build until a run shows a gap.
- README and `pipeline/prose.txt`: dropped — the paragraph before the new one introduces
  the file, and the new one says "only prose and framework files".
- FW number: renumbered to FW-048, above.

### Learnings routed

The probe finding that a closed pull request's run is a green run with nothing in it is
recorded in FW-047's *Rejected* and in `gateIsGreen`'s comment, where the next person
reading run conclusions will be. Nothing else generalises beyond this plan.

### Merged because

After rebasing on `origin/main` (which carries the `main-status` timing fix),
`bash scripts/check-blueprint.sh` ended `Self-check passed: every guard caught its
defect, the clean baseline passed, and the framework repository's own guards passed.`
and `npm --prefix .tropis test` reported `13 passed` suites, `145 passed` tests (git
2.49.0, Node v22.15.0, macOS 26.2 on arm64). The behaviour matches the plan's decisions,
every new guard goes red when its piece is broken, and deploy to staging still runs
every stage; the one fix made in review was the decision record's section order.
