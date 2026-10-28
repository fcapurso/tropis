# Every project gets one pipeline whose stages it fills in — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Two tasks stop for the developer (Tasks 7 and 9);
> each says what to check before stopping.

**Goal:** a set-up project's checks and deploys run through one pipeline whose stages
come from Tropis in a fixed order. The project says what each stage runs. A stage it has
not filled is empty and passes, and nothing deploys unless every stage passed or was
empty. Today a set-up project gets no CI at all.

**Spec:** the entry `setup-offers-ci-for-its-host` in `feature-catalog.yaml`, its eleven
criteria and the comment above it. The design is in the first-adopter checkout:
`docs/superpowers/specs/2026-10-22-pipeline-and-environments-design.md`, sections *The
pipeline* and *Delivery: Tropis first*. Read those for background. Where they leave a
choice to the builder, *Decisions* below makes it. Do not reopen those decisions.

**What the specifying session verified on 2026-10-25, against `main` at `d0fdec3`:**

- A set-up project gets no workflow file. `scripts/set-up-project.sh` writes `.claude/`,
  `.cursor/rules/`, `.tropis/`, the entry files, the backlog and `docs/`, and nothing
  under `.github/`.
- Installed files are what `shippedFiles()` in `scripts/installed-files.js` returns: every
  file under `SHIPPED_ROOTS` (`.tropis`, `.claude/framework`, `.claude/commands`), minus
  `EXCLUDED`. `recordOf()` fingerprints exactly those, and `take-version.mjs` builds the
  next version by running the setup in a scratch folder, then compares `shippedFiles`. So
  a file the setup writes and `shippedFiles` lists is replaced on update, checked by the
  installed-files guard, and listed as `Added` for a project that did not have it.
- Scripts installed into `.tropis/scripts/` are listed in `scripts/installed-scripts.txt`.
- The README skeleton is the model for *follow or own*: Tropis ships
  `.tropis/templates/readme-skeleton.md`, and a project that owns its copy keeps it at
  `docs/readme/skeleton.md`. `commands/update.md` Stage 8 says the default skeleton
  changed when the take replaced it and the project has its own (FW-025).
- `guards/framework-integrity.test.js` fails on any backticked path under `src/`, `docs/`,
  `scripts/`, `.claude/` or `.github/` that a framework document, a command or
  `CLAUDE.md` names and that does not exist. It exempts four paths by name. The pipeline
  files exist in a set-up project, but not in the self-check's tree, which is this
  repository's layout.
- `templates/package.json` provides `jest` and `yaml`. Nothing else is available to a
  guard or to an installed script, and none may be added.
- `RELEASES.md` defines a breaking release in its header paragraph. `## [Unreleased]`
  holds one section, *Model picks compare only like with like*.
- `framework/workflow.md`, *Merge and clean up*, says nothing about auto-merge.
- `framework/DECISIONS.md` ends at FW-027.
- This repository's own CI is `.github/workflows/ci.yml`. It runs the self-check on every
  push. This plan does not change it.

**Model tier: Medium.** The design is decided below. GitHub's workflow syntax and the
probe on GitHub need debugging inside that design.

**Requires:** GitHub CLI signed in with access to the developer's account, and any current Claude Code CLI for the fresh-agent checks in Task 8 (record which).

**Merge authority: parent review.** The pipeline ships to every project, and the GitHub run
needs the developer to look at it.

Do not store a kick-off prompt on this plan.

---

## Delivers

setup-offers-ci-for-its-host

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-pipeline -b plan/setup-offers-ci-for-its-host` |
| `first-adopter` | do not edit | |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/` in this repository.** The first five are the installed release. `.github/` is
  this repository's own CI. The pipeline's sources live under `templates/`.
- **Add no dependency** to `templates/package.json`. Use `node:` modules, and `yaml`
  in guards.
- **Do not lower, skip or delete a guard to get green.**
- **Never push to any repository except the probe repository in Task 7.** Push this
  plan's branch only when opening its pull request at the end.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-25.

### 1. The stages and their names

In this order: `framework`, `sanity`, `unit`, `integration`, `end-to-end`, `deploy`. One
exported constant, `STAGES`, in `scripts/pipeline.mjs` holds the six names. In prose:
framework checks, sanity checks, unit and seam tests, integration tests, end-to-end
tests, deploy. **Unit and seam tests** run in-process with no outside service.
**Integration tests** talk to something real outside the code. The operator guide says
that, in those words.

### 2. What the project owns

- **`pipeline/` at the project root.** Tropis never writes or reads anything there
  except to run it. `pipeline/<stage>.sh` fills a stage, run with `bash` from the project
  root. `pipeline/framework.sh` is the project's own checks of framework files. It runs
  after Tropis's checks in the framework stage.
- **`pipeline/prose.txt`**: the files the project counts as prose, one pattern per line.
  The format is described in Decision 3.
- **`.github/workflows/pipeline.yml`**: the small file that calls Tropis's pipeline.
  Written from a template at setup or update when the developer agrees. After that, the
  project owns it.
- **`.github/workflows/project-pipeline.yml`**: a project that *owns* its pipeline copies
  `tropis-pipeline.yml` here, and its `pipeline.yml` calls this file instead. Tropis keeps
  installing `tropis-pipeline.yml`. That copy is unused in an owning project, and it is
  what `/update` compares against.

### 3. `scripts/pipeline.mjs`: the host-neutral script

Installed as `.tropis/scripts/pipeline.mjs`. Its project root is `git rev-parse
--show-toplevel` from the current directory, so it works when called from the root and
when called through `npm --prefix .tropis`. Subcommands:

- **`stages`** prints the six names, one per line.
- **`plan [--base <rev>] [--head <rev>]`** prints six lines, `<stage>=run|empty|skipped`:
  - `framework=run` always.
  - Every other stage is `skipped` when the change is *prose and framework only*. If not,
    it is `empty` when `pipeline/<stage>.sh` does not exist, and `run` when it does.
  - The change is `git diff --name-only --no-renames <base>...<head>`. It is *prose and
    framework only* when there is at least one changed path and every path matches
    `FRAMEWORK_PATHS` or `pipeline/prose.txt`.
  - It is a **full run** (nothing skipped) when `--base` is missing, is all zeros, or
    does not resolve, or when the diff lists no paths. Each case prints one line to stderr
    saying why.
  - `FRAMEWORK_PATHS`, exported: `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md`,
    `AGENTS.md`, `feature-catalog.yaml`, `docs/superpowers/`, `docs/backlog-board/`,
    `docs/verification-log.md`, `docs/project-brief.md`, `docs/readme/`,
    `docs/BLUEPRINT-UPSTREAM.md`, `docs/model-picks.md`, `pipeline/framework.sh`. This
    is the setup's `export-ignore` list (`set-up-project.sh`, the `for p in` loop), plus
    the last two. A comment names that loop so the two lists stay together.
  - The `prose.txt` format: blank lines and `#` lines are ignored. A line ending in `/`
    matches that directory and everything under it. `*` matches within one path
    segment, and `**` matches across segments. A line starting with `!` re-includes a
    path, so a guarded document under a prose directory still counts as code. The last
    matching line wins. A missing `prose.txt` means no prose.
- **`run <stage>`** runs one stage from the project root and exits with its status:
  - `framework`: `npm --prefix .tropis test`, then `bash pipeline/framework.sh` when it
    exists. It stops at the first failure.
  - Any other stage: `bash pipeline/<stage>.sh` when it exists. If it does not exist, it
    prints `<stage>: empty — no pipeline/<stage>.sh` and exits 0.
  - An unknown stage: exit 2, naming the six.
  - When the environment variable `TROPIS_SECRETS` holds a JSON object, each key becomes
    an environment variable of the stage, unless the environment already sets it.
    `TROPIS_SECRETS` itself is not passed on. This is how a GitHub stage reads the
    project's secrets.
- **`gate --plan - --event <push|pull_request> [--summary <file>] <stage>=<result> …`**
  reads the six lines `plan` printed on stdin. It takes one argument for each of the
  first five stages. `<result>` is `success`, `failure`, `cancelled` or `skipped`, the
  values GitHub gives a job.
  - It prints exactly one line to stdout: `deploy=run`, `deploy=held`, `deploy=empty` or
    `deploy=skipped`.
    - `held`: any stage has `failure` or `cancelled`, or was planned `run` and has any
      result other than `success`.
    - Otherwise `skipped` when the event is `pull_request`. A pull request does not
      deploy until per-branch environments exist, which is the next entry's.
    - Otherwise the deploy's own planned value.
  - It writes the run summary, a Markdown table with one row per stage (deploy included),
    to `--summary <file>` (appended) or to stderr. The second column starts with one of:
    `run — passed`, `run — failed`, `run — cancelled`, `not run — an earlier stage
    failed`, `empty — no pipeline/<stage>.sh`, `skipped — only prose and framework files
    changed`. The deploy row says `will run`, `held — <stages> did not pass`, `empty`,
    `skipped — a pull request does not deploy`, or the prose-only skip.
  - It exits 0 whatever it decides. The failed stage already failed the run.
- **`commands`** prints, for a host with no wiring file, the commands to run in the
  project's CI, in order, with a `#` comment on each saying when to run it: `plan`,
  `npm --prefix .tropis ci`, `run framework`, the four `run`s that are run when planned
  `run`, `gate`, then `run deploy` when the gate prints `deploy=run`.

Keep the logic in exported functions (`planStages`, `isProseAndFramework`,
`matchesProse`, `gateDecision`, `summaryTable`) that the guard imports. The block at
the bottom runs only when the file is the program, as in `take-version.mjs`.

### 4. The GitHub wiring

The sources live in `templates/github/`. The setup copies them into the project's
`.github/workflows/`.

- **`tropis-framework-checks.yml`**, `on: workflow_call` with an input `node-version`
  (string, default `'22'`). One job, `checks`: checkout, setup-node with that version,
  `npm --prefix .tropis ci`, `node .tropis/scripts/pipeline.mjs run framework`.
- **`tropis-pipeline.yml`**, `on: workflow_call` with the same input. The jobs, by id:
  - `plan`: checkout with `fetch-depth: 0`. Base and head come from the caller's event.
    On a pull request they are `github.event.pull_request.base.sha` and
    `github.event.pull_request.head.sha`. On a push they are `github.event.before` and
    `github.sha`. The job runs `pipeline.mjs plan` into `$GITHUB_OUTPUT`, and exposes one
    output per stage and the raw lines as `lines`.
  - `framework`: `uses: ./.github/workflows/tropis-framework-checks.yml`, `needs: plan`,
    passing `node-version`.
  - `sanity`, `unit`, `integration`, `end-to-end`: each has `needs: [plan, framework]`
    and `if: needs.plan.outputs.<stage> == 'run'`. Each checks out, sets up node, and runs
    `node .tropis/scripts/pipeline.mjs run <stage>` with
    `env: TROPIS_SECRETS: ${{ toJSON(secrets) }}`. They run side by side.
  - `gate`: `needs` the plan and the five stage jobs, and `if: always()`. It runs
    `gate --plan - --event "$GITHUB_EVENT_NAME" --summary "$GITHUB_STEP_SUMMARY"`, with
    the plan's `lines` output on stdin and each `needs.<stage>.result` as an argument.
    It writes `deploy` to its outputs.
  - `deploy`: `needs: [gate]`, `if: needs.gate.outputs.deploy == 'run'`. It runs
    `pipeline.mjs run deploy` with the same `TROPIS_SECRETS`.
  - A comment at the top: Tropis's file, replaced on update, and to own it, copy it to
    `project-pipeline.yml` (Decision 2).
- **`templates/pipeline-caller.yml`**, installed as
  `.tropis/templates/pipeline-caller.yml`: `name: Pipeline`. Triggers: `push` to
  `branches: [main]`, and `pull_request` with `types: [opened, synchronize, reopened]`.
  One job: `uses: ./.github/workflows/tropis-pipeline.yml`, `secrets: inherit`. A comment
  says the project owns the file, where to change the branch name, and how to own the
  pipeline instead.

Before writing these, confirm against GitHub's documentation each of these points, and
record the page URLs in the handover:

- a called workflow must sit in `.github/workflows/`;
- a called workflow may call another local one with `./.github/workflows/…`;
- the caller's `github.event` is visible inside the called workflow;
- `secrets: inherit` makes `secrets` usable in the called workflow, including in
  `toJSON(secrets)`;
- a job whose `needs` failed is skipped unless it has `always()`.

If any point is false, stop and hand back to the specifying session (Traps).

### 5. Setup, update and bootstrap

- **`set-up-project.sh`** copies both `templates/github/*.yml` into
  `.github/workflows/`, `pipeline-caller.yml` into `.tropis/templates/`, and
  `pipeline.mjs` through `installed-scripts.txt`. It writes nothing under `pipeline/`
  and no `pipeline.yml`.
- **`installed-files.js`** gains `SHIPPED_PATHS = ['.github/workflows/tropis-pipeline.yml',
  '.github/workflows/tropis-framework-checks.yml']`. `shippedFiles()` adds each one that
  exists, still sorted. `SHIPPED_ROOTS` stays as it is. The project's other workflows
  must never be swept in.
- **`commands/bootstrap.md`**, a new *Stage 3b — The pipeline* after 3a. Ask where the
  repository is hosted.
  - **GitHub:** offer to write `.github/workflows/pipeline.yml` from
    `.tropis/templates/pipeline-caller.yml` and to create `pipeline/` holding a
    `prose.txt` that lists `README.md` and `docs/`. Say that every other stage starts
    empty, and how to fill one (Decision 2).
  - **Any other host:** show `node .tropis/scripts/pipeline.mjs commands` and say that
    those are the commands to put in that host's CI.
- **`commands/update.md`**:
  - **Stage 6, a new item 6.** When no file in `.github/workflows/` names
    `tropis-pipeline.yml` or `project-pipeline.yml`, offer the pipeline in the same words
    as bootstrap. On yes, write the same files, so they are committed with the update.
    Then list the steps to adopt it, which are printed at the end (Stage 8):
    1. Move each check the project's CI runs today into `pipeline/<stage>.sh`.
    2. List the prose in `pipeline/prose.txt`.
    3. Push a branch, open a pull request, and read the run summary.
    4. Once it is green, delete the old workflows whose work moved.
    On a host other than GitHub (the `origin` URL does not name `github.com`), show
    `pipeline.mjs commands` instead.
  - **Stage 8, a new print line** beside the README skeleton line. When the take's
    Replaced list includes `.github/workflows/tropis-pipeline.yml` and the project has
    `.github/workflows/project-pipeline.yml`, say that Tropis's pipeline changed in this
    release, and offer to show the difference between the two.

### 6. Breaking, merging, and the record

- **`RELEASES.md` header.** Add to the list of what makes a release breaking: "the
  pipeline's stages changed order or the deploy gate decides differently". A guard
  pins both (Task 2), and its failure message says that changing either is breaking.
- **`framework/workflow.md`**, in *Merge and clean up*, after the `--force` paragraph,
  this paragraph, wrapped to the file's width:

  > **Where the host marks no check as required, its auto-merge merges at once.** It does
  > not wait for checks that are still running, so a merge waits until the pull request's
  > checks have finished green. In one project a pull request merged with both checks
  > pending; they passed afterwards, by luck.

- **`framework/DECISIONS.md`**, FW-028, *Every project runs one pipeline, its stages
  filled by the project*, in the format of FW-027:
  - **Decision:** Decisions 1–4 in three sentences.
  - **Evidence:** first-adopter's review of 2026-10-22. It had two workflows, and its
    deploy waited for only one. Its auto-merge merged with checks pending. Name the
    design path.
  - **Rejected:**
    - Conditions written in the workflow file. They cannot be tested.
    - A project-owned block inside Tropis's workflow. Tropis's files and the project's
      never share a file.
    - Sweeping all of `.github/workflows/` into the shipped roots. That would claim the
      project's own workflows.
    - Calling a reusable workflow from Tropis's repository. It is private, and a project
      pins a release, not a branch.
  - **Consequences:** Tropis's pipeline files are installed in every project, including
    those hosted elsewhere, where they are inert. Changing the stage order or the gate
    is breaking.
- **`templates/README.md`** (the operator guide). A new section, *The pipeline*: the six
  stages and the unit/integration distinction, `pipeline/` and `prose.txt`, running a
  stage locally with `node .tropis/scripts/pipeline.mjs run <stage>`, reading the run
  summary, and follow or own. Ten to fifteen lines.
- **`RELEASES.md` `## [Unreleased]`**, a new section, *One pipeline for every project*,
  written to the shape in `commands/release.md` Stage 3. Not breaking. Under its by-hand
  heading, one step: `**1. Optional: run your checks through the pipeline.**` Say that
  `/update` offers it.

## Traps

- **The self-check reads committed content only.** Commit before running `bash
  scripts/check-blueprint.sh`.
- **`framework-integrity` will fail** on the first backticked
  `.github/workflows/tropis-pipeline.yml`, `tropis-framework-checks.yml`, `pipeline.yml`
  or `project-pipeline.yml` in a command. Exempt those four by name, with a one-line
  comment like the existing ones. Do not drop the backticks.
- **A GitHub point in Decision 4 found false is a design question, not a debugging
  one.** Hand back to the specifying session, with the documentation and what you
  observed. Do not route around it.
- **`TROPIS_SECRETS` holds secrets.** Never print it, its keys or its values, in the
  script, a test or the handover. GitHub masks secret values in logs, and that masking is
  the only protection. Do not add `set -x` anywhere near it.
- **The probe repository is the developer's** (Task 7). Push only there. Do not delete
  it. Do not change its settings.
- **The fresh-agent sessions in Task 8 are probes.** Their projects and releases live in
  the system temp directory. Tags made there are fixtures and are never pushed.
- **A push that adds a file under `.github/workflows/` needs the `workflow` scope** on
  the GitHub token. If the push to the probe is refused for that, that is a handover:
  print `gh auth refresh -s workflow` for the developer to run, and stop.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | new: Decision 3 |
| `scripts/installed-scripts.txt` | add `pipeline.mjs` |
| `scripts/installed-files.js` | `SHIPPED_PATHS`, Decision 5 |
| `scripts/set-up-project.sh` | Decision 5 |
| `templates/github/tropis-pipeline.yml` | new: Decision 4 |
| `templates/github/tropis-framework-checks.yml` | new: Decision 4 |
| `templates/pipeline-caller.yml` | new: Decision 4 |
| `templates/README.md` | *The pipeline*, Decision 6 |
| `commands/bootstrap.md` | Stage 3b, Decision 5 |
| `commands/update.md` | Stage 6 item 6 and a Stage 8 line, Decision 5 |
| `framework/workflow.md` | the auto-merge paragraph, Decision 6 |
| `framework/DECISIONS.md` | FW-028 |
| `RELEASES.md` | the header line and the Unreleased section, Decision 6 |
| `guards/pipeline.test.js` | new: Tasks 2–4 |
| `guards/installed-files.test.js` | `shippedFiles` with `SHIPPED_PATHS` |
| `guards/set-up-project.test.js` | the expected list, nothing under `pipeline/` |
| `guards/take-version.test.js` | a take adds the pipeline files to a project that lacks them |
| `guards/framework-integrity.test.js` | the four exemptions |
| `guards/release.test.js` | the commands' phrases, Task 5 |
| `docs/verification-log.md` | the entry `/manual-check` writes in Task 9 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the probe |
| `docs/superpowers/plans/2026-10-25-every-project-gets-one-pipeline.md` | the handover report |

Other guards or fixtures may fail because of the change: `check-drift`, `readme-usable`,
`operator-page-closeout`, or the conformance fixtures under `fixtures/base/`. If one
does, fix it, add the file to the handover's *Scope* with the reason, and say so under
*What the plan got wrong*.

## Review Focus

Each line below is pinned by a test in Task 3 or 4. They are listed so that review checks
them first.

1. A file moved from `src/` to `docs/`. `--no-renames` lists both paths, so the change is
   not prose only.
2. A first push or a force push, where `github.event.before` is all zeros or does not
   resolve. Expect a full run, and a stderr line saying why.
3. A guarded document under a prose directory, re-included with `!`. A change to it
   alone runs everything.
4. `pipeline/unit.sh` exists but is not executable. `run` uses `bash`, so it still runs.
5. The framework stage fails. The four stage jobs are skipped by GitHub, and the gate
   must say `held`, not `deploy=run`. A stage planned `run` with result `skipped` is
   held. Also: a green pull request says `deploy=skipped`, and the same results on a
   push say `deploy=run`.

## Tasks

### Task 1 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected last line:
`Every guard caught its defect and passed the clean baseline.`). Record both in the
handover.

### Task 2 — The stages and the pin

Test first, in a new `guards/pipeline.test.js` (`// Level: unit`, a docstring saying
what it holds). `STAGES` equals the six names of Decision 1, in order. The failure
message says: "Changing the stage order is breaking: say so in RELEASES.md." A table
test pins `gateDecision` on the cases in Decision 3, with the same message for the gate.
Write `STAGES`, `gateDecision` and `summaryTable` in `scripts/pipeline.mjs`. Commit.

### Task 3 — Plan and prose matching

Test first, in the same guard, against a temporary git repository built in the test:

- Only `docs/a.md` and `.claude/x.md` changed, with `prose.txt` holding `docs/`: every
  stage but `framework` is `skipped`.
- Also `src/a.js` changed: `run` or `empty` per script present.
- Review Focus items 1–3.
- A missing `prose.txt`: `docs/a.md` alone is not prose.
- `**` and `*`, and last-match-wins with `!`.
- No `--base`: a full run.

Implement `matchesProse`, `isProseAndFramework`, `planStages` and the `plan` and
`stages` subcommands. Commit.

### Task 4 — Run, gate, commands

Test first:

- `run unit` with no script prints the empty line and exits 0.
- With `pipeline/unit.sh` doing `exit 3`, the run exits 3.
- Review Focus item 4.
- `run framework` runs `pipeline/framework.sh` after the framework's tests. Point the
  test's project at a `.tropis/package.json` whose `test` script is `true`, so the test
  does not run Jest inside Jest.
- `TROPIS_SECRETS='{"A":"1"}'` makes `A` visible to the stage, and does not override an
  `A` already set.
- An unknown stage exits 2.
- `gate` prints one line on stdout and appends the table to `--summary`. Review Focus
  item 5.
- `commands` names every stage, in order.

Implement. Commit.

### Task 5 — The GitHub wiring, setup and the shipped list

1. Confirm the five GitHub points of Decision 4 against the documentation (Traps if one
   is false).
2. Write the three templates.
3. Add to `guards/pipeline.test.js` a test that parses `templates/github/tropis-pipeline.yml`
   with `yaml`. It checks:
   - its job ids are `plan`, the six stages and `gate`;
   - each of `sanity`, `unit`, `integration` and `end-to-end` needs `framework` and
     nothing else besides `plan`, so they run side by side;
   - `gate` needs all five pre-deploy stages and runs `always()`;
   - `deploy` needs `gate`;
   - each stage job's `run` line names its own stage.
   The stage list comes from `STAGES`, so the list in the workflow and the list in the
   script are held equal.
4. Then apply Decision 5's setup and `installed-files.js` changes, with tests first in
   `installed-files.test.js`, `set-up-project.test.js` and `take-version.test.js`. The
   take test: a project set up before this change (built with its record lacking the two
   paths) gets both as `Added`.
5. Commit.

### Task 6 — Commands, documents, notes

Apply Decision 5's bootstrap and update text and all of Decision 6, including the
`framework-integrity` exemptions. In `guards/release.test.js`, beside its existing
phrase checks and in their style, assert these phrases (whitespace collapsed):

- `commands/bootstrap.md` names `.tropis/templates/pipeline-caller.yml` and
  `pipeline.mjs commands`;
- `commands/update.md` names `tropis-pipeline.yml`, `project-pipeline.yml` and the four
  adoption steps;
- `framework/workflow.md` holds the auto-merge sentence.

Commit, then run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`. Both
must pass.

### Task 7 — Run it on GitHub (stops for the developer if the probe repository is missing)

1. **Look first.** Run `gh repo view fcapurso/tropis-pipeline-probe --json name,isPrivate`.
   - If it fails, print this for the developer and stop: "Create an empty private GitHub
     repository `fcapurso/tropis-pipeline-probe` with no README, for a throwaway pipeline
     probe. Done looks like: `gh repo view fcapurso/tropis-pipeline-probe` succeeds."
   - On resumption, run the same check again.
2. In the system temp directory, `git init` a project with `src/app.js`, set it up with
   this worktree's `scripts/set-up-project.sh`, and run `npm --prefix .tropis install`.
   Write:
   - `.github/workflows/pipeline.yml` from the caller template;
   - `pipeline/prose.txt` holding `docs/`;
   - `pipeline/unit.sh`, which runs `node -e "process.exit(0)"`;
   - `pipeline/deploy.sh`, which runs `echo deployed`.
   Commit, add the probe as `origin`, and push `main`.
3. Three pull requests, each from its own branch off `main`:
   - **A**, which changes `src/app.js`;
   - **B**, which changes only `docs/note.md`;
   - **C**, which changes `src/app.js` and makes `pipeline/unit.sh` exit 1.
   For each, wait for the run to finish (`gh run watch`), then record:
   - `gh run view <id> --json jobs`: each job's name, conclusion, `startedAt` and
     `completedAt`;
   - the run summary's table.
   Expected:
   - **A**: `framework` and `unit` succeed. `sanity`, `integration` and `end-to-end` are
     skipped as empty. `gate` succeeds, and its summary says `skipped — a pull request
     does not deploy`. `deploy` is skipped.
   - **B**: only `plan`, `framework` and `gate` run. The summary says `skipped — only
     prose and framework files changed`.
   - **C**: `unit` fails, the gate says `held — unit did not pass`, and `deploy` is
     skipped.
4. Merge A with `gh pr merge --merge`, after its checks finished green (Decision 6). On
   the push run to `main`, `deploy` succeeds and its log shows `deployed`.
5. Record run URLs, job timings showing the four stage jobs overlapping or skipped, and
   all outcomes in the handover. A result other than expected: fix and re-run that pull
   request, and report each round.

### Task 8 — Fresh-agent checks

Run these in the system temp directory, as Task 7 of
`docs/superpowers/plans/2026-10-20-project-updates-with-one-slash-command.md` did. Make a
scratch clone of this branch with its `origin` removed. Tag a commit from before this
plan's first commit as `v0.5.0`, and this branch's head as `v0.6.0`. Set up a project at
`v0.5.0` and commit it. Run each probe in a fresh `claude -p` session with no other
context. Tell each one that it is a probe and its output is discarded.

1. "Run /update. When it asks whether to update, say yes. Say yes to anything it offers."
   Expected:
   - the update offers the pipeline and lists the four adoption steps;
   - `.github/workflows/pipeline.yml` and `pipeline/prose.txt` are in the update commit;
   - `.github/workflows/tropis-pipeline.yml` is listed as added.
2. Copy `tropis-pipeline.yml` to `project-pipeline.yml` in a project at `v0.6.0`, and
   point `pipeline.yml` at it. Tag a `v0.6.1` that changes a comment in
   `templates/github/tropis-pipeline.yml`. Run the same prompt. Expected: it says Tropis's
   pipeline changed and offers the difference.
3. In a project at `v0.6.0`, ask: "A pull request in this repository has checks still
   running, and the repository marks no check as required. Merge it with the commands
   you would use." Expected: it waits for the checks, or says it must, rather than
   running `gh pr merge --auto` at once. This exercises the clause added to the
   workflow document.

Record tool, version and machine, and each outcome. A probe that does not find what was
intended: fix the text and run it again, and report each round. Delete the scratch
folders.

### Task 9 — The GitHub check by the developer (stops)

1. **Look first.** If `docs/verification-log.md` already has an entry for this pipeline
   recorded `pass`, carry on.
2. Otherwise, run `/manual-check`. Draft steps for the developer:
   - open run A's page, and see one job per stage, with the skipped ones marked;
   - open run B's summary, and see the prose-only row;
   - open run C, and see the deploy held and why.
   It writes the entry as `pending`. Stop and hand over.
3. On resumption, read the entry again. Proceed only on `pass`. On `fail`, hand back to
   the specifying session with what the developer saw.

### Task 10 — The entry

1. Set `setup-offers-ci-for-its-host` to `shipped`.
2. Fill `modules`: `scripts/pipeline.mjs`, `templates/github/tropis-pipeline.yml`,
   `templates/github/tropis-framework-checks.yml`, `templates/pipeline-caller.yml`.
3. Add a comment above the entry naming the commit that records Tasks 7 and 8.
4. Run `npm --prefix .tropis test`.
5. Commit. The body says, for each of the eleven criteria, which test or record backs
   it:

| Criterion | Backed by |
|---|---|
| 1 stage order and the unit/integration line | `STAGES` pin; the operator guide's wording |
| 2 the script and its tests | `guards/pipeline.test.js` |
| 3 prose and framework only | Task 3 tests; probe B; the verification-log entry |
| 4 the project's folder, empty passes, no shared file | Task 4 tests; the setup test (nothing under `pipeline/`); the `SHIPPED_PATHS` test |
| 5 the framework-checks piece and the project's additions | the workflow parse test; the `run framework` test |
| 6 the GitHub jobs and the equal stage list | the workflow parse test; probes A–C; the verification-log entry |
| 7 follow or own | fresh-agent probe 2; the `release.test.js` phrases; empty-by-default from the Task 4 test |
| 8 setup and `/update` offer it | fresh-agent probe 1; the `release.test.js` phrases |
| 9 breaking | the `STAGES` and gate pins and their messages; the `RELEASES.md` header line |
| 10 other hosts | the `commands` test; the bootstrap phrase |
| 11 auto-merge | the `release.test.js` phrase; fresh-agent probe 3 |

Then add a line to the commit body: `Fresh-agent check: <from Task 8, with tool, version and machine>`.
It must go in this commit, because this branch changes `framework/`.

### Task 11 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit it. Push the branch, and open a pull request against `main`. Do not merge.

## Not in this plan

- Per-branch environments (`deploy-stage-offers-an-environment-per-branch`) and the
  release candidate (`release-is-rehearsed-on-a-candidate`). Each is a later plan.
- Wiring for hosts other than GitHub (`project-chooses-its-repository-host`).
- Moving this repository's own CI onto the pipeline.
- first-adopter taking this release.

## Handover report

### Task completion

Tasks 1–11 are done. The developer looked at the probe and the entry is `shipped`. This session does not merge.

### Verification results

`bash scripts/check-blueprint.sh` on `f7e8427` ended:

```
Every guard caught its defect and passed the clean baseline.
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

`npm --prefix .tropis test` on the same commit: 5 suites, 30 passed.

`node --experimental-vm-modules node_modules/.bin/jest --config templates/framework-jest.config.js --rootDir . guards/pipeline.test.js --no-coverage` after the deploy condition was corrected: 1 passed, 40 skipped (the filtered run). The full pipeline suite was green at Task 4 (40 passed). `guards/release.test.js`: 34 passed.

The four GitHub points in Decision 4 were read on 2026-10-25 and found true:

- https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- the expressions reference, for `toJSON`, `success()` and `always()`

Probe repository `fcapurso/tropis-pipeline-probe`. Round 2:

| Run | URL | Conclusion |
|---|---|---|
| A | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40174449359 | success: plan, framework, unit, gate passed; sanity, integration, end-to-end, deploy skipped |
| B | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40174450703 | success: plan, framework, gate passed; the other five skipped |
| C | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40174453105 | failure: unit failed; plan, framework, gate passed; deploy skipped |
| push | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40175369233 | success: deploy passed; its log contains `deployed` |
| PR 4 | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40175385322 | success: deploy skipped |

The developer, 2026-10-25, from the pull-request checks list: run A 4 skipped and 4 passed, run B 5 skipped and 3 passed, run C 1 failed, 4 skipped and 3 passed, probe A merged. They also opened the corrected push (`62a79d8`): deploy passed after the empty stages were skipped, and the gate summary says `will run`. Recorded as `pass` in `docs/verification-log.md`.

Fresh-agent check: Claude Code 2.1.300, dev-laptop.local, Darwin 26.2. Probe 2 said Tropis's pipeline changed and offered the one-comment difference. Probe 3 refused `gh pr merge --auto` and said the checks must finish green. Probe 1 did not offer the pipeline.

### Scope

`git diff --stat 7d7d725...f7e8427`: 21 files changed, 1511 insertions, 5 deletions. This commit adds the report to the plan file, which is the last row of the File Structure table. Every other row is in that stat. `package.json` and `node_modules` stayed untracked.

Worktree: `~/src/tropis-pipeline`, branch `plan/setup-offers-ci-for-its-host`.

### Judgment calls

The gate step passes `EVENT_NAME: ${{ github.event_name }}`. `GITHUB_EVENT_NAME` inside a called workflow is `workflow_call`, and the `github` context is the caller's, so a pull request would otherwise look like a push and deploy.

The deploy job's condition is `always() && needs.gate.outputs.deploy == 'run'`. A condition that names no status function is combined with `success()`, and `success()` is false once any earlier job was skipped. Empty stages are skipped jobs, so a push whose gate said `run` never started deploy. Debug steps on the probe saw the output `run` and the job still skipped, until the condition named `always()`.

The probe's lockfile was regenerated with npm 10. This machine's npm 11 writes a lockfile GitHub's npm 10 rejects (`Missing: jest@29.7.0 from lock file`). The product still runs `npm ci`.

Probe 1's miss was recorded and not patched. A fake `## [0.6.0]` heading would have made `stepsBetween` return the steps and hidden the gap.

### What the plan got wrong

The plan's gate invocation uses `$GITHUB_EVENT_NAME`. That variable is the event that triggered the called workflow.

The plan's deploy `if` compares the gate output and does not name `always()`. A push with an empty stage then never deploys.

`/update` on the first hop does not offer the pipeline. The session follows the previous release's command, and `[Unreleased]` is not a version section `stepsBetween` reads, so the helper returns no steps. The notes say "`/update` offers this." Probe 1 added `tropis-pipeline.yml` and did not write `pipeline.yml` or `pipeline/prose.txt`. Left as written: a version heading invented to feed the helper would hide this.

The developer read the pull-request checks list for runs A–C, and then opened the corrected push. That page shows deploy passed after the empty stages were skipped, and the gate summary says `will run`. The `deployed` line was read from the job log while the probe was run.

### Outstanding

Parent review merges. Pull requests B, C and 4 on the probe stay open, and the probe repository stays.

The first update onto this release does not offer the pipeline. Once a project is on this release, a later update does offer the difference, which probe 2 showed. No catalog entry: the mechanism is take-version reading the previous command, and the handover is the record. The reviewer can qualify the notes.

Per-branch environments, the release candidate, other hosts' wiring, this repository's own CI, and first-adopter taking the release stay out of scope.

## Review record

Reviewed by the specifying session on 2026-10-25, Claude Code desktop on
dev-laptop.local, in a separate worktree of the branch. The review covers this
plan and its follow-up, `2026-10-25-every-project-gets-one-pipeline-review-fixes.md`.

### Checks re-run

- At `3ac97c4`: `bash scripts/check-blueprint.sh` ended `Self-check passed`. `npm --prefix
  .tropis test`: 30 passed. The pull request's `self-check` job passed.
- Scope: `git diff --stat origin/main...` listed 22 files, all in the File Structure table.
- `guards/pipeline.test.js`: 41 passed clean. With `unit` and `integration` swapped in
  `STAGES`, 3 failed. With `deploy` needing `plan` instead of `gate`, 1 failed.
- Probe runs A, B, C and the push to `main` were read with `gh run view --json jobs`. Each
  job's conclusion matches the handover. The four middle stage jobs start within two
  seconds of each other, after `framework`.
- The developer's manual check is recorded `pass` in `docs/verification-log.md`.

### Found

- **Criterion 8 was unbacked when the entry was promoted.** A project's first `/update`
  onto this release runs the held release's command, which only prints an `Optional:`
  step. That made the notes' sentence "`/update` offers this" false. The plan's own probe
  could not show it, because its release left the notes under `[Unreleased]`, which
  `stepsBetween` does not read. That was the plan's mistake. Sent back as the follow-up
  plan, which made the step required and probed it under a real version heading.
- **A cancelled run could still deploy.** `always()` in the deploy condition. Sent back
  in the same follow-up: now `!cancelled()`, held by the guard.
- Both of the executor's departures from this plan were right: `EVENT_NAME` from the
  caller's `github.event_name`, and a status function in the deploy condition.

### Outstanding disposition

- Pull requests B, C and 4, and the probe repository itself: the developer's, kept as
  the record of the runs. No entry.
- The first `/update` not offering the pipeline: fixed by the follow-up. No entry.

### Learnings routed

- **A probe of `/update` must put the notes under a version heading,** or it tests
  nothing. **And a new `/update` stage reaches a project only from the release after the
  one that adds it.** Both are written into the follow-up plan, and this second point is
  in the catalog comment above `setup-offers-ci-for-its-host`. No rule: the next plan to
  change `/update` meets it through that comment and FW-023's consequences. If it happens
  twice, it becomes a clause of `rules/planning.md`.

### Merged because

Every criterion is backed by a test, the recorded GitHub check, or a recorded
fresh-agent probe, and the two defects found in review are fixed on the branch.
