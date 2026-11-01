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
  `FW-` number on `origin/main` when you write it (FW-045 if nothing has taken it; the
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
