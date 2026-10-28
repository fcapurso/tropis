# A release is rehearsed on a candidate before it is tagged — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Two tasks stop for the developer (Tasks 6 and 8);
> each says what to check before stopping. **A stop is a stop:** say in one line that
> the plan is waiting for the developer, what they must do, and that you resume in this
> session. Do not write it as a summary of finished work.

**Goal:** a project that fills `pipeline/candidate/` rehearses each release before it is
tagged. `/release` commits the notes and prints a trigger for a candidate step. That step
runs every stage on a chosen commit, puts the pre-production environment back on the
version production runs, deploys the candidate there, and says what must be upgraded by
hand. The developer checks it through `/manual-check`. `/release`, run again, prints the
release trigger for that commit only once the check is recorded `pass`. A project that
leaves the slot empty releases as today, and `/release` records that no candidate was
rehearsed.

**Spec:** the entry `release-is-rehearsed-on-a-candidate` in `feature-catalog.yaml`, its
four criteria and the comments above it. Background is in the first-adopter checkout:
`docs/superpowers/specs/2026-10-22-pipeline-and-environments-design.md`, section
*Staging as the release candidate*. That section is about Forge and staging. Tropis stays
generic and says *pre-production environment*. Where the design leaves a choice,
*Decisions* below makes it. Do not reopen those decisions.

**Read first:** this builds on two plans from the same design:
`docs/superpowers/plans/2026-10-25-every-project-gets-one-pipeline.md` and
`docs/superpowers/plans/2026-10-25-a-branch-can-have-its-own-environment.md`. Read their
Decisions, their `…-review-fixes.md` follow-ups, and all four review records. What they
cost in review, and what this plan does about it:

- Inside a called workflow `$GITHUB_EVENT_NAME` is `workflow_call`. The event comes from
  `github.event_name`. Decision 4 needs no event.
- A job condition with no status function is combined with `success()`. This plan's
  candidate workflow skips nothing on purpose, so the implicit `success()` is what it
  wants (Decision 4).
- A probe of `/update` must put the notes under a version heading, or it tests nothing.
  A new `/update` stage reaches a project only from the release after the one adding it.
  This plan adds no `/update` stage. Its by-hand step is `Optional:`, so it is printed,
  and its text says what to do, not that `/update` offers it.
- A stop for the developer was twice taken for "done". See the note at the top.
- An executor tightened a workflow assertion beyond the plan, and was right. Do the same
  when a parse assertion would stay green with the behaviour broken, and say so.

**What the specifying session verified on 2026-10-26, against `main` at `7d9d264`:**

- `scripts/pipeline.mjs` has the subcommands `stages`, `plan`, `run`, `gate`, `branch`,
  `environment` and `commands`.
  - `branchSlot(root)` returns `{ slot: 'filled' | 'empty' }` or `{ error }` for
    `pipeline/branch/`. Decision 1 copies its shape.
  - `stageEnv()` builds a script's environment from `TROPIS_SECRETS`.
  - `runScript(root, script, env)` runs `bash <script>` from the root.
  - `commandList()` prints the commands for a host with no wiring file.
- `templates/github/` holds `tropis-pipeline.yml` and `tropis-framework-checks.yml`.
  - The framework-checks workflow takes one input, `node-version`. Its checkout has no
    `ref`.
  - The pipeline uses `actions/checkout@v7` and `actions/setup-node@v7`.
- `scripts/set-up-project.sh` copies `templates/github/*.yml` into `.github/workflows/`
  (a glob, so a new file there is copied with no edit), and copies
  `templates/pipeline-caller.yml` into `.tropis/templates/` by name.
- `scripts/installed-files.js` `SHIPPED_PATHS` lists the two pipeline workflows, and only
  those. The update take compares against a fresh setup, so a new workflow must be added
  there to be installed and fingerprinted.
- `guards/set-up-project.test.js` lists every file setup writes, including
  `.tropis/templates/pipeline-caller.yml` and both workflows.
- `guards/framework-integrity.test.js` exempts named `.github/workflows/` paths that a
  framework document names and this tree does not hold.
- `commands/release.md`:
  - Its project-owned block lists the fill-ins: run from, notes file, readers, breaking,
    trigger (with `<bump>`), where the run is watched.
  - Stage 3 ends the draft with `Checked on the release candidate: (ask)`. Stage 4 asks
    the developer yes or no.
  - Stage 6 prints the trigger.
  - `guards/release.test.js` pins phrases from Stages 1b, 3 and 4, and asserts there is
    no `## Stage 0`.
- `framework/workflow.md`, *Optional — release*, has three bullets. The first says
  `/release` drafts and the pipeline releases, and lists what the pipeline must do. The
  second says merging to the main branch "may deploy to staging".
- This repository's own release is the `release` job in `.github/workflows/ci.yml` with
  `.github/scripts/release.mjs`. Neither is shipped. `promote()` refuses notes that
  still say `(ask)`.
- `RELEASES.md` `## [Unreleased]` holds only `_Nothing yet._`. v0.4.2, which carried the
  pipeline and per-branch environments, was released on 2026-10-25.
- `framework/DECISIONS.md` ends at FW-029.
- The probe repository `fcapurso/tropis-pipeline-probe` exists, is private, and is
  **archived** (`gh repo view … --json isArchived` printed `true`). Task 6 stops for the
  developer to unarchive it.

**Model tier: Medium.** The design is decided and most text is given. The script, the
GitHub wiring and two fresh-agent probes need care.

**Requires:** GitHub CLI signed in with access to the developer's account, and any current Claude Code CLI for the fresh-agent checks in Task 7 (record which).

**Merge authority: parent review.** The developer must look at the GitHub runs, and the
change reaches every project's release.

Do not store a kick-off prompt on this plan.

---

## Delivers

release-is-rehearsed-on-a-candidate

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-candidate -b plan/release-is-rehearsed-on-a-candidate` |
| `first-adopter` | do not edit | |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`** in this repository. The sources live under `scripts/`, `templates/`,
  `commands/` and `framework/`. This repository's own release job is not changed (*Not in
  this plan*).
- **Add no dependency.** Use `node:` modules, and `yaml` in guards.
- **Do not change the `STAGES` pin, a pinned gate case, or `tropis-pipeline.yml`.** The
  candidate is a separate workflow. A change to the gate or the stage order is breaking.
- **Push only to this plan's branch and to the probe repository of Task 6.** Do not merge.
- **Do not lower, skip or delete a guard.** Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-26.

### 1. The slot: `pipeline/candidate/`

- The project fills it with two scripts: `pipeline/candidate/reset.sh` and
  `pipeline/candidate/deploy.sh`.
- **Filled** when both exist, **empty** when neither does. One without the other is an
  error naming the missing script, the same shape as `branchSlot()`. Write it as
  `candidateSlot(root)`.
- Each script runs with `bash` from the project root, with the `stageEnv()`
  environment plus the variables below.
- `reset.sh` puts the pre-production environment back on the version production runs.
  It gets:
  - `TROPIS_PRODUCTION_TAG`, that version's tag;
  - `TROPIS_PRODUCTION_DIR`, a temporary directory holding that tag's files, made with
    `git archive <tag> | tar -x -C <dir>` and deleted afterwards, whether the script
    passed or not.
- `deploy.sh` deploys the checked-out commit, the candidate, to the pre-production
  environment. It gets:
  - `TROPIS_CANDIDATE`, the candidate's full commit hash;
  - `TROPIS_BY_HAND`, the path of an empty file. The script appends one line per thing
    someone must upgrade or approve by hand before the candidate works there, such as an
    install that needs new permissions approved. An empty file means nothing.
- **Production's version** is the highest tag matching `v*` by version order
  (`git tag --list 'v*' --sort=-v:refname`, first line). With no such tag there is no
  release yet: `reset.sh` is not run, and the summary says so.

### 2. `pipeline.mjs candidate`

Two subcommands:

- **`candidate slot`** prints `candidate=filled` or `candidate=empty`. A partial slot
  exits 1 with `candidate: pipeline/candidate/ is missing <names>`. This is how
  `/release` decides which way it goes (Decision 5).
- **`candidate rehearse [--summary <file>]`**, run from a checkout of the candidate:
  1. Empty slot: print `candidate: empty — no pipeline/candidate/, so no candidate was rehearsed`, write the summary, exit 0.
  2. Partial slot: as `candidate slot`, exit 1.
  3. Reset (Decision 1). A failing `reset.sh` writes the summary and exits with its
     status. `deploy.sh` does not run.
  4. Deploy (Decision 1). It exits with its status.
  5. The summary is appended to `--summary <file>`, or written to stderr. Exact text,
     each line present in every case, with the values filled in:

     ```
     ### Release candidate

     - Candidate: `<full hash>`
     - Reset: <to `<tag>` · not needed — no release yet · failed — reset.sh exited <n> · not run — no pipeline/candidate/>
     - Deploy: <deployed · failed — deploy.sh exited <n> · not run — <why>>
     - By hand: <nothing, as deploy.sh reported · not known — the deploy did not finish>
     ```

     When `TROPIS_BY_HAND` holds lines, `By hand:` is followed by each line as a nested
     bullet, in the order written.
- Anything else after `candidate` exits 2, naming `slot` and `rehearse`.

**`commands`** gains, at the end:

```
# Release candidate. Started by hand for one commit on the main branch, never on a push.
# Every stage first, as on a push with nothing skipped; then:
node .tropis/scripts/pipeline.mjs candidate rehearse
```

Keep the logic in exported functions the guard imports (`candidateSlot`, and one that
builds the summary from what ran), as the existing subcommands do.

### 3. Why there is no gate

The candidate runs every stage, whatever the change, and skips none. So it needs no
`plan` and no `gate`: the rehearse job needs every stage job, and GitHub's implicit
`success()` holds it back when any of them failed. An empty stage exits 0 and counts as
passed, as it does on a push.

### 4. The GitHub wiring

- **`templates/github/tropis-framework-checks.yml`** gains an input `ref` (string,
  default `''`), passed to its checkout as `ref: ${{ inputs.ref }}`. Empty means
  checkout's default, so `tropis-pipeline.yml`, which does not pass it, is unchanged.
- **`templates/github/tropis-candidate.yml`**, new, `name: Tropis release candidate`,
  `on: workflow_call` with inputs `commit` (string, required) and `node-version` (string,
  default `'22'`). A comment at the top: Tropis's file, replaced on update, started
  through the project's `candidate.yml`. Jobs:
  - `framework`: `uses: ./.github/workflows/tropis-framework-checks.yml`, passing
    `node-version` and `ref: ${{ inputs.commit }}`.
  - `stages`: `needs: framework`, `strategy.matrix.stage: [sanity, unit, integration,
    end-to-end]`, `fail-fast: false` so every failing stage shows. Checkout at
    `ref: ${{ inputs.commit }}`, setup-node, `node .tropis/scripts/pipeline.mjs run
    ${{ matrix.stage }}` with `TROPIS_SECRETS: ${{ toJSON(secrets) }}`.
  - `rehearse`: `needs: stages`. Checkout at `ref: ${{ inputs.commit }}` with
    `fetch-depth: 0`, so the tags are there. Setup-node, then
    `node .tropis/scripts/pipeline.mjs candidate rehearse --summary "$GITHUB_STEP_SUMMARY"`
    with the same `TROPIS_SECRETS`. `concurrency: { group: tropis-candidate-${{ github.repository }}, cancel-in-progress: false }`.
  - A comment above `stages` says why there is no gate (Decision 3).
- **`templates/candidate-caller.yml`**, new, installed as
  `.tropis/templates/candidate-caller.yml`:
  - `name: Release candidate`;
  - `on: workflow_dispatch` with an input `commit` (string, not required, description
    `The commit to rehearse, in full. Empty means the head of the branch it is started on.`);
  - one job: `uses: ./.github/workflows/tropis-candidate.yml`, `secrets: inherit`,
    `with: commit: ${{ inputs.commit || github.sha }}`;
  - a comment: the project owns the file, it is started by hand —
    `gh workflow run candidate.yml --ref main -f commit=<commit>` — and never by an agent.
- **`scripts/set-up-project.sh`** copies `templates/candidate-caller.yml` into
  `.tropis/templates/` beside `pipeline-caller.yml`. It writes no `candidate.yml` and
  nothing under `pipeline/`.
- **`scripts/installed-files.js`**: add `.github/workflows/tropis-candidate.yml` to
  `SHIPPED_PATHS`.

Before writing these, confirm against GitHub's documentation, and record the URLs in the
handover:

- `actions/checkout` accepts a full commit hash as `ref`;
- `fetch-depth: 0` fetches the tags;
- a matrix job in a called workflow shows as one job per value, and a job that `needs` it
  runs only when every value succeeded.

If any is false, stop and hand back to the specifying session.

### 5. `/release`

Write these into `commands/release.md`, each wrapped to the file's width.

- **The opening paragraph** gains, after its first sentence: `If `## [Unreleased]`
  already ends with `Checked on the release candidate: (after the candidate)`, the notes
  are drafted and a candidate was started: go to Stage 7.`
- **The project-owned block**: the `Trigger` fill-in becomes `Trigger: the exact command
  that starts the release pipeline, with <bump> where the confirmed bump goes, and, where
  the project rehearses a candidate, <commit> where the candidate's commit goes.` Add one
  fill-in after it: `Candidate trigger: where the project rehearses a candidate, the
  command that starts it, with <commit> — e.g. gh workflow run candidate.yml --ref main
  -f commit=<commit>.` Only the comment changes. A project's filled block stays valid,
  so this is not a breaking change.
- **Stage 1** gains, after its command block: run
  `node .tropis/scripts/pipeline.mjs candidate slot`. Stop on exit 1 and show its
  message. Remember `filled` or `empty`.
- **Stage 3**, the sentence ending the draft becomes: `End the draft with the line
  `Checked on the release candidate: no — no candidate was rehearsed` when the slot is
  empty, and `Checked on the release candidate: (after the candidate)` when it is filled.`
  Keep the rest of that paragraph: the line is the developer's record and is left out of
  anything published. Do not touch the phrases `guards/release.test.js` pins in Stage 3.
- **Stage 4** no longer asks `Checked on the release candidate`. It asks the developer to
  confirm or adjust the bump and the notes. Its printout gains a line
  `Candidate: rehearsed before the release · none — pipeline/candidate/ is empty`.
- **Stage 5**: the commit gets a body line `Bump: <bump>`. The refusal on `(ask)` stays.
- **Stage 6** splits:
  - *Empty slot:* as today. Print the release trigger with the bump, and where the run is
    watched.
  - *Filled slot:* print the candidate trigger with the full hash of the commit Stage 5
    pushed, and where the run is watched. Then say what comes next, as numbered steps for
    the developer: read the run's summary and do anything it lists under *By hand*; run
    `/manual-check` on the pre-production environment, whose entry's *Change* line reads
    `release candidate at `<short hash>``; then run `/release` again. Stop.
  - Either way, an agent must not run a trigger.
- **Stage 7 — After the candidate**, new, after Stage 6:
  1. `git status --porcelain` must print nothing, then `git fetch origin`.
  2. Find the newest entry in `docs/verification-log.md` whose *Change* line names
     `release candidate at`, and read its hash and its latest round's *Result*.
  3. No such entry, or `pending`: say the candidate has not been checked, print the
     `/manual-check` step again, and stop.
  4. `fail`: say what failed. The notes stay. Once a fix has merged, print the candidate
     trigger for the head of `origin/main`, and the same next steps as Stage 6. Stop.
  5. `pass`: read the bump from the newest `Bump:` line in
     `git log <hash> --format=%b`, ask the developer to confirm or adjust it, and wait.
     Then print the release trigger with that bump and the candidate's full hash, where
     the run is watched, and that the release step writes
     `Checked on the release candidate: yes` in the version's section. An agent must not
     run it.
- **The closing paragraph of Stage 6**, naming what the pipeline must do, points at the
  workflow's release section instead of restating it.

### 6. The workflow's release section

Replace the first two bullets of *Optional — release* in `framework/workflow.md` with the
text below, wrapped to the file's width. Keep the third bullet, on rollback, as it is.

```markdown
- **`/release` drafts; the developer starts each step.** The command checks `main` is
  clean and pushed, where Tropis keeps the README brings it up to date with
  `/refresh-readme` (pushing the refreshed page, when there is one, as its own commit),
  proposes the bump, drafts the notes from the backlog for the people who use the
  product, commits the notes, and prints the trigger for the next step. An agent never
  runs a trigger. A release is three steps:
  1. **The release candidate**, for one commit on the main branch that already carries
     the notes. It runs every stage on that commit; puts the pre-production environment
     back on the version production runs; deploys the candidate there; and says whether
     anything must be upgraded by hand. It sets no version and makes no tag. Tropis
     ships this step: the project fills `pipeline/candidate/`, and
     `.github/workflows/tropis-candidate.yml` runs it.
  2. **The check**, by the developer on the pre-production environment, drafted and
     recorded through `/manual-check`. `/release`, run again, prints the release trigger
     only once that entry says `pass`.
  3. **The release**, given the candidate's commit. It is the project's own pipeline,
     and must: run the full suite as a gate; on top of the candidate, make one commit
     that sets the version, promotes `## [Unreleased]` in the notes file and writes
     `Checked on the release candidate: yes`, and changes no other file; tag that
     commit; merge it into the main branch; push the branch and the tag together; deploy
     the tag to production; publish the notes without the `Checked on the release
     candidate` line; and roll back on failure, as below. Nothing merged after the
     candidate reaches production through it.

  **Where the project leaves `pipeline/candidate/` empty, there is no candidate and no
  check.** `/release` records that no candidate was rehearsed, and the release runs on
  the main branch as it stands.
- **The tag sits one commit above the candidate, and its code is the candidate's.** The
  version and the promoted notes belong in the tagged commit, and the candidate cannot
  carry them: they are set only once it has passed. So the release refuses a commit
  that changes anything besides the notes file and the files carrying the version.
  Merging it into the main branch is a fast-forward when nothing landed since the
  candidate, and a merge otherwise; a conflict stops the release before anything is
  pushed.
- **The candidate is an upgrade rehearsal.** Because the pre-production environment is
  first put back on production's version, each candidate deploy is the upgrade
  production will receive, onto data an older version wrote.
- **Production deploy is a manual step, never a CI job.** Merging to the main branch may
  deploy to a development environment. The pre-production environment belongs to the
  release candidate, and production is started by a person after the check on the
  candidate.
```

### 7. Documents

- **`templates/README.md`**, `## The pipeline`: one paragraph after the per-branch one.
  It covers the two scripts and their variables, what `TROPIS_BY_HAND` is for, how
  production's version is found, `.tropis/templates/candidate-caller.yml` copied to
  `.github/workflows/candidate.yml`, and that `/release` then prints the candidate's
  trigger. One sentence on the release step: the project's release pipeline must take
  the candidate's commit, as the workflow's release section says.
- **`framework/DECISIONS.md`**, FW-030, *A release is rehearsed on a candidate, and the
  tag sits one commit above it*, in the format of FW-029:
  - **Decision:** Decisions 1, 4 and 6 in three sentences.
  - **Evidence:** the first-adopter design of 2026-10-22, where the developer decided that
    production ships exactly the commit the pre-production environment was checked on,
    never the main branch as it stands. Its release built from `main`, tagged and
    deployed in one run. Name the design path.
  - **Rejected:**
    - tagging the candidate itself: the tagged commit must carry the promoted notes and
      the version, which are set only once the candidate passed;
    - writing the check's outcome into the notes on the main branch: the candidate's
      commit is fixed before the check, so the line could only reach the release by
      taking the main branch's notes, which carry changes merged since;
    - a gate in the candidate workflow: it runs every stage and skips none;
    - Tropis shipping the release step: version files, tags and production differ per
      project; Tropis states what the step must do.
  - **Consequences:** a project rehearsing a candidate must change its release pipeline
    to take a commit; `/release` runs twice for such a release; a project that leaves
    the slot empty releases as before.
- **`RELEASES.md`**, `## [Unreleased]`, replacing `_Nothing yet._`: a section *Each
  release can be rehearsed first*, written to the shape in `commands/release.md` Stage 3,
  and an `### After updating: what to do by hand` heading with one step:
  `**1. Optional: rehearse each release on a candidate.**` The step says to fill
  `pipeline/candidate/`, copy `.tropis/templates/candidate-caller.yml` to
  `.github/workflows/candidate.yml`, make the project's release pipeline take the
  candidate's commit as the workflow's release section says, add `<commit>` to the
  trigger and fill the candidate trigger in `/release`'s own block, and read
  `.tropis/README.md` under *The pipeline*. Do not say `/update` offers it. Leave the
  summary paragraph to `/release`. Not breaking.

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **The tag on the candidate.** The catalog's third criterion says the release step
  "tags a commit whose code is therefore the candidate's". Do not "fix" Decision 6 to tag the
  candidate itself (FW-030, *Rejected*).
- **`(after the candidate)` is not `(ask)`.** This repository's `promote()` refuses
  `(ask)`. Do not change `promote()`, and do not make `/release` write `(ask)` into a
  commit.
- **The guards pin `/release` phrases.** Reword only what Decision 5 changes, and keep
  `## Stage 0` absent.
- **`TROPIS_SECRETS` holds secrets.** Never print it, its keys or its values.
- **A tag pushed to the probe repository is a fixture.** Push it there only, never to
  this repository.
- **A push that adds a workflow needs the `workflow` scope.** If the probe push is
  refused for that, print `gh auth refresh -s workflow` for the developer and stop.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | Decisions 1 and 2 |
| `templates/github/tropis-candidate.yml` | new, Decision 4 |
| `templates/github/tropis-framework-checks.yml` | the `ref` input, Decision 4 |
| `templates/candidate-caller.yml` | new, Decision 4 |
| `scripts/set-up-project.sh` | copy the caller template, Decision 4 |
| `scripts/installed-files.js` | `SHIPPED_PATHS`, Decision 4 |
| `guards/pipeline.test.js` | Tasks 1–3 |
| `guards/set-up-project.test.js` | the two new installed files |
| `guards/installed-files.test.js` | `SHIPPED_PATHS`, if a test lists it |
| `guards/framework-integrity.test.js` | exempt `.github/workflows/tropis-candidate.yml` and `.github/workflows/candidate.yml`, which the workflow document names and this tree does not hold |
| `guards/release.test.js` | Task 4 |
| `commands/release.md` | Decision 5 |
| `framework/workflow.md` | Decision 6 |
| `templates/README.md` | Decision 7 |
| `framework/DECISIONS.md` | FW-030 |
| `RELEASES.md` | Decision 7 |
| `docs/verification-log.md` | the entry `/manual-check` writes in Task 8 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-26-release-is-rehearsed-on-a-candidate.md` | the handover report |

Other guards may fail because of the change: `check-drift`, `operator-page-closeout`,
`take-version`, or the fixtures. If one does, fix it, list the file in the handover's
*Scope* with the reason, and say so under *What the plan got wrong*.

## Review Focus

Each line is pinned by a test in Tasks 1–4. Review checks them first.

1. A slot with one of the two scripts fails `candidate slot` and `candidate rehearse`,
   naming the missing one.
2. With no `v*` tag, `reset.sh` does not run and the summary says `not needed — no
   release yet`. With tags `v0.9.0` and `v0.10.0`, `TROPIS_PRODUCTION_TAG` is `v0.10.0`.
3. `TROPIS_PRODUCTION_DIR` holds the tag's files while `reset.sh` runs, and is gone
   afterwards, also when `reset.sh` fails.
4. A failing `reset.sh` means `deploy.sh` does not run.
5. Lines `deploy.sh` appends to `TROPIS_BY_HAND` appear under `By hand:` in order.
6. The candidate workflow's matrix is exactly the stages between `framework` and
   `deploy` in `STAGES`, and every checkout in it uses `inputs.commit`.
7. `/release` with a filled slot never prints the release trigger before a `pass`
   entry naming the candidate.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: its last line starts `Self-check passed`).

### Task 1 — The slot and `candidate slot`

Test first, in `guards/pipeline.test.js`, against temporary repositories:

- empty, filled, and each partial slot (Review Focus 1);
- `candidate` with no subcommand, and with an unknown one, exits 2.

See them fail. Implement. Commit.

### Task 2 — `candidate rehearse`

Test first. The scripts write what they received to a file the test reads.

- an empty slot prints the empty line and writes the summary with `not run — no
  pipeline/candidate/`;
- Review Focus 2, 3, 4 and 5;
- `TROPIS_CANDIDATE` is the full hash of `HEAD`;
- `TROPIS_SECRETS` reaches both scripts as it does a stage;
- the summary's four lines, for a deploy that passed with nothing by hand.

See them fail. Implement, and add the `commands` lines. Commit.

### Task 3 — The workflows

1. Confirm the three points in Decision 4 against GitHub's documentation.
2. Extend the workflow parse tests:
   - `tropis-candidate.yml` has the jobs `framework`, `stages` and `rehearse`, its
     `commit` input is required, and its matrix equals `STAGES` without `framework` and
     `deploy` (Review Focus 6);
   - every checkout in it has `ref: ${{ inputs.commit }}`, and the `rehearse` checkout
     has `fetch-depth: 0`;
   - `rehearse` needs `stages`, and has the concurrency group with
     `cancel-in-progress: false`;
   - the framework-checks workflow's checkout passes `inputs.ref`, and
     `tropis-pipeline.yml` is unchanged (compare it with `git show main:…`);
   - the caller template triggers on `workflow_dispatch` only and passes
     `inputs.commit || github.sha`.
3. See them fail. Write the workflows, the caller template, the setup copy and
   `SHIPPED_PATHS`. Update the setup and installed-files tests. Commit.

### Task 4 — `/release` and the workflow document

1. In `guards/release.test.js`, add phrase checks, whitespace collapsed as the file
   already does:
   - Stage 1 runs `candidate slot`;
   - Stage 3 names both endings of the draft;
   - Stage 6 has the empty and filled branches, and the `release candidate at` *Change*
     line;
   - Stage 7 exists after Stage 6, reads `release candidate at`, prints the release
     trigger only on `pass` (Review Focus 7), and stops on `pending` and `fail`;
   - the workflow document says `sets no version and makes no tag`, `Nothing merged
     after the candidate reaches production through it`, and `changes no other file`.
2. See them fail. Apply Decisions 5 and 6. See them pass. Commit.

### Task 5 — Documents and checks

Apply Decision 7. Add the two exemptions to `guards/framework-integrity.test.js`. Commit.
Run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`; both pass.

### Task 6 — Run it on GitHub (stops for the developer if the probe is archived)

1. **Look first.** Run
   `gh repo view fcapurso/tropis-pipeline-probe --json isArchived --jq .isArchived`.
   - If it prints `true`, print this for the developer and stop: "Unarchive
     `fcapurso/tropis-pipeline-probe` (GitHub → the repository → Settings → Danger Zone →
     Unarchive). Done looks like: `gh repo view fcapurso/tropis-pipeline-probe --json
     isArchived --jq .isArchived` prints `false`."
   - On resumption, run the same check again.
2. In a clone of it in the system temp directory, bring it up to this branch as the last
   plan did: copy `scripts/pipeline.mjs` to `.tropis/scripts/`, `templates/github/*.yml`
   to `.github/workflows/`, `templates/candidate-caller.yml` to `.tropis/templates/` and
   to `.github/workflows/candidate.yml`. Rewrite `.tropis/installed.json` with
   `node .tropis/scripts/record-installed.mjs`, keeping its version and source. Fill the
   slot:
   - `reset.sh`: `test -d "$TROPIS_PRODUCTION_DIR"`, then echo `reset to
     $TROPIS_PRODUCTION_TAG`;
   - `deploy.sh`: echo `deployed candidate $TROPIS_CANDIDATE`, and append
     `Approve the new permissions on the pre-production install` to `$TROPIS_BY_HAND`.
   Commit and push `main`. Do not force-push, and leave its pull requests alone.
3. Record each run with `gh run view --json jobs`, the relevant log lines, and the run
   page's summary. In order:
   - **No release yet.** If the probe has no `v*` tag (`git ls-remote --tags origin`),
     start `candidate.yml` on `main` with no commit. Expected: all stage jobs, then
     `rehearse` with `Reset: not needed — no release yet`, the deploy line, and the by-hand
     line. If it has one, say so and skip this run.
   - **A release exists.** Tag the commit before the slot was filled `v0.0.1`, and push
     the tag. Start `candidate.yml` with `commit` set to the full hash of `main`'s head.
     Expected: `reset to v0.0.1`, then `deployed candidate <hash>`.
   - **An older commit.** Push one more commit to `main`, then start `candidate.yml` with
     `commit` set to the previous commit's hash. Expected: the summary names that hash,
     not the head.
   - **A failing stage.** Push a branch whose `pipeline/unit.sh` exits 1, with no pull
     request, and start `candidate.yml` with its head's hash. Expected: `unit` fails, and
     `rehearse` does not run.
4. Delete the probe branch from the last step. Leave the tag. A result other than
   expected: fix, re-run that step, and report each round.

### Task 7 — Fresh-agent checks

In a scratch project in the system temp directory, set up from this worktree with
`scripts/set-up-project.sh`, with `pipeline/candidate/` filled by echo scripts. Fill
`/release`'s project-owned block: the trigger
`echo release <bump> <commit>`, the candidate trigger `echo candidate <commit>`. Give it a
bare `origin` in the temp directory, so pre-flight passes, and push `main`. Start each
session with `claude -p` and no other context. Tell it the work is a probe whose output
is discarded.

1. "Run /release. Accept the bump and the notes it proposes." Expected: it prints the
   candidate trigger with the full hash of the notes commit, not the release trigger, and
   names `/manual-check` and running `/release` again.
2. Add a `docs/verification-log.md` entry for `release candidate at <short hash>`
   recorded `pass`, and commit it. Then: "Run /release. Accept the bump." Expected: it
   goes to Stage 7 and prints the release trigger with the candidate's full hash.
3. Change that entry's result to `fail — step 1: the page did not load`, commit, and run
   the same prompt. Expected: no release trigger.

Record tool, version, machine and each outcome. If a run does not do what is expected,
fix the command's text and run it again, and report each round. Delete the scratch
folders.

### Task 8 — The check by the developer (stops)

1. **Look first.** If `docs/verification-log.md` already has an entry for the release
   candidate step recorded `pass`, carry on.
2. Otherwise, run `/manual-check`. Draft steps for the developer to open the three runs
   of Task 6 that rehearsed, and the failing one:
   - see the stage jobs, then `rehearse`;
   - read the summary: the candidate's hash, the reset line, the deploy line, the
     by-hand line;
   - on the older-commit run, see the older hash;
   - on the failing run, see `unit` failed and `rehearse` skipped.
   It writes the entry as `pending`. Stop and hand over.
3. On resumption, read the entry again. Proceed only on `pass`. On `fail`, hand back to
   the specifying session with what the developer saw.

### Task 9 — The entry

1. Set `release-is-rehearsed-on-a-candidate` to `shipped`.
2. Fill `modules` with `scripts/pipeline.mjs`, `templates/github/tropis-candidate.yml`
   and `commands/release.md`.
3. Add a comment above the entry naming this plan's handover report. Do not name a
   commit hash: a squash-merge discards them.
4. Run `npm --prefix .tropis test`.
5. Commit. The body says, for each criterion, what backs it:

| Criterion | Backed by |
|---|---|
| 1 two steps described; the candidate runs every stage, resets, deploys, says what is by hand, no version, no tag | Task 4 phrase checks; Tasks 1–3 tests; Task 6 runs; the verification-log entry |
| 2 the check through `/manual-check`; the release trigger only after a `pass` | Task 4 phrase checks; Task 7 probes 2 and 3 |
| 3 the release step given the candidate's commit, tagging a commit whose code is the candidate's | Task 4 phrase checks on the workflow document; Task 7 probe 2 |
| 4 the project fills reset and deploy or leaves them empty, and `/release` then says no candidate was rehearsed | Task 2 empty-slot test; Task 4 Stage 3 phrase check |

   Then add a line: `Fresh-agent check: <from Task 7, with tool, version and machine>`.

If a criterion has no backing, leave the entry at `building` and say so.

### Task 10 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit it, push the branch, and open a pull request against `main`. Do not merge.

## Not in this plan

- This repository's own release job, `.github/workflows/ci.yml`. Tropis has no
  pre-production environment, so it leaves the slot empty and releases from `main` as
  before.
- Anything Forge-specific: first-adopter fills the slot and changes its release workflow
  (`holds-tropis-release-candidate` there).
- `/update` offering the candidate step: the by-hand step tells a project what to do.

## Handover report

### Task completion

Tasks 0 through 5, 7, 9 and 10 are done. Task 10 is this report.

Task 6 stopped once. `gh repo view fcapurso/tropis-pipeline-probe --json isArchived --jq .isArchived` printed `true`. On resumption it printed `false`, and the four probe runs then matched. Pull requests 2, 3 and 4 were left open. The tag `v0.0.1` was left on the probe. The branch `probe-candidate-unit-fails` was deleted.

Task 7 had two rounds on the first probe. Round 1 stopped at Stage 1b because the scratch project had no README level. Round 2, after `docs/readme/readme.yaml` was set to `manual`, printed the candidate trigger. Probes 2 and 3 matched on the first run. The scratch folders were deleted.

Task 8 stopped once, with the entry pending. On resumption the developer opened the four run pages. They matched the entry, and the result is now `pass`.

### Verification results

Commands were read on dev-laptop.local, macOS 26.2 (25C56), arm64, Node v22.15.0. Probe runs were read with GitHub CLI 2.103.2 (2026-10-23). The jobs ran on GitHub-hosted `ubuntu-latest`. The fresh-agent check used Claude Code 2.1.300.

`bash scripts/check-blueprint.sh` at `a6db79a` printed `Checking a6db79a` and ended:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

The same command at `b179b70`, before the pipeline comparison was changed, failed the clean baseline on `GitHub workflow › rehearses every stage between framework and deploy on the chosen commit`. Planted defects were still caught. That comparison is described under *What the plan got wrong*.

`npm --prefix .tropis test` at `d4c75ea`: 5 suites, 31 tests, all passed.

GitHub's documentation, read before the workflow was written:

- `actions/checkout` accepts a full commit hash as `ref`, and an empty `ref` checks out the event's ref. https://github.com/actions/checkout/blob/main/README.md and https://github.com/actions/checkout/blob/main/action.yml
- `fetch-depth: 0` fetches all history for all branches and tags. The same README. The probe's rehearse log showed `git fetch --no-tags` together with an explicit `+refs/tags/*:refs/tags/*` refspec, and the later run reset to `v0.0.1`.
- A matrix is one job per value, and a job that needs it runs only when every value succeeded. https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions under `jobs.<job_id>.strategy.matrix` and `jobs.<job_id>.needs`. The failing probe run left `rehearse` skipped after `unit` failed.

Probe, `fcapurso/tropis-pipeline-probe`. Job conclusions are from `gh run view --json jobs`. The echo lines are from `gh run view --log`. The summary text is from the run pages the developer opened.

| Step | Run | What the jobs did |
|---|---|---|
| No release yet | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438137714 | success, 38s. `framework`, `sanity`, `unit`, `integration`, `end-to-end` and `rehearse` passed. The log contains `deployed candidate 0644a765ff6065e01f7031b330725934e679d9a1` and no `reset to` line. The summary: candidate that hash, reset `not needed — no release yet`, deploy `deployed`, by hand `Approve the new permissions on the pre-production install`. |
| A release exists | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438587388 | success, 39s. The same jobs passed. The log contains `reset to v0.0.1` and `deployed candidate 0644a765ff6065e01f7031b330725934e679d9a1`. The summary reset line is `to v0.0.1`, with the same by-hand line. |
| An older commit | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438677792 | success, 38s. The page's commit is `c6285d9`. The log and the summary name `0644a765ff6065e01f7031b330725934e679d9a1`. Reset `to v0.0.1`. |
| A failing stage | https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438770878 | failure, 24s. `unit` failed with exit code 1. `rehearse` was skipped. `gh pr list --head probe-candidate-unit-fails` printed `[]`. |

Fresh-agent check. Scratch project set up from this worktree, deleted afterwards. Claude Code 2.1.300, `claude -p --permission-mode bypassPermissions --permission-prompts none`, dev-laptop.local, Darwin 25.2.0 arm64, macOS 26.2 (25C56). Each prompt said the work was a probe whose output is discarded.

| Probe | Outcome |
|---|---|
| 1, round 1 | Stopped at Stage 1b and asked whether to release with no README. Nothing committed. |
| 1, round 2 | Committed `e5f4462f6b931518a8bd922ca6ec0163f7071473` with body `Bump: major` and notes ending `Checked on the release candidate: (after the candidate)`. Printed `echo candidate e5f4462f6b931518a8bd922ca6ec0163f7071473`, named `/manual-check` and running `/release` again, and did not print the release trigger. |
| 2 | Went to the after-the-candidate step and printed `echo release major e5f4462f6b931518a8bd922ca6ec0163f7071473`. |
| 3 | Printed no release trigger. Said the check reported `fail — step 1: the page did not load`. |

### Scope

`git diff --stat origin/main...HEAD` before this report: 18 files changed, 899 insertions, 37 deletions. Every file is in the File Structure table. This commit adds the plan file, the last row.

Worktree: `~/src/tropis-candidate`, branch `plan/release-is-rehearsed-on-a-candidate`. The parent checkout stayed on `main`.

### Judgment calls

- `candidate slot` and `candidate rehearse` with an unknown or extra argument exit 2 and name both subcommands.
- When `reset.sh` fails, the deploy line is `not run — reset.sh failed`. By-hand lines are reported only when `deploy.sh` exits 0. `deploy.sh` does not receive `TROPIS_PRODUCTION_TAG` or `TROPIS_PRODUCTION_DIR`. A tag that does not match `v*` is not a release. The summary is appended.
- The candidate workflow's `rehearse` job has no `if`, so `always()` cannot let it run after a failed stage. The plan said GitHub's implicit `success()` holds it back; the test requires `if` to be absent.
- Stage 1 runs `candidate slot` after the existing git stop, so a dirty tree stops first.
- Stage 6's closing paragraph does not contain the words `release trigger`, so the filled-slot slice stays limited to the candidate trigger. Stage 7 step 4 says "say what the check reported", so the fail slice does not start at an earlier "failed".
- The workflow document's opening sentence, "Three things transfer from the project that had this", was left as it stood. The first-adopter design path in FW-030 is plain text, so the integrity guard does not require that file. The exemption comment in `guards/framework-integrity.test.js` still says the exempted workflows are written by bootstrap or update.
- The fresh-agent session used `--permission-mode bypassPermissions` so a headless session could run git. The scratch project's README level was set to `manual` after round 1, which is the command's own skip for that stage.

### What the plan got wrong

The pipeline comparison `git show main:templates/github/tropis-pipeline.yml` cannot run in the self-check. The guards run from a `git archive` of `HEAD`, which has no `.git`, and `git show` there exits 128. The test now requires the pipeline's framework job to pass only the node version, and it byte-compares with `main` only when the guard is running inside a checkout of this repository.

Task 7's scratch project, set up as the task describes, has no `docs/readme/readme.yaml`. Stage 1b then stops and asks, before any trigger is printed. The command text was left as it is. The second round set the level to `manual`.

The jobs API and the run log do not include the step summary. `gh run view --json jobs` and `--log` record the job conclusions and the script's stdout. The summary text is on the run page, which is what the developer read.

On a failed check, probe 3 did not print a new candidate trigger. It read "Once a fix has merged" as not yet true: the only commits after the candidate edited the verification log. The expected result, no release trigger, held.

### Outstanding

Probe pull requests 2, 3 and 4 stay open. The probe tag `v0.0.1` stays. This repository's own release job is unchanged, as the plan says.

The release step itself is the project's pipeline. Tropis states what that step must do and does not ship it. A project that fills the slot still has to make its release pipeline take the candidate's commit.

## Review record

Reviewed by the specifying session on 2026-10-27, on dev-laptop.local,
macOS 26.2 (Darwin 25.2.0, arm64), Node v22.15.0, Claude Code (Opus 5.5), at `fa177f7`.

### Checks re-run

- `git diff --stat origin/main...HEAD`: 19 files, 981 insertions, 37 deletions. Every file
  is in the File Structure table. `origin/main` is still `191d663`, the branch's base, so
  no rebase was needed.
- `bash scripts/check-blueprint.sh` at `fa177f7`: `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards
  passed.`
- `npm --prefix .tropis test`: 5 suites, 31 tests, all passed.
- `guards/pipeline.test.js` and `guards/release.test.js` on a `git archive` of `fa177f7`,
  staged as the self-check stages it: 113 tests passed.
- Each Review Focus line was broken in that staged copy and its guard run. All nine went
  red:

  | Broken | Failing test |
  |---|---|
  | one script counts as a filled slot (1) | `candidate slot › exits 1 and names only the missing script…` |
  | lowest `v*` tag chosen (2) | `candidate rehearse › resets to the highest v* tag…` |
  | `reset.sh` runs with no tag (2) | `candidate rehearse › does not run reset when no tag matches v*…` |
  | the tag's directory is not removed (3) | `candidate rehearse › resets to the highest v* tag… and removes the archive afterwards` |
  | `deploy.sh` runs after a failed reset (4) | `candidate rehearse › removes the archive and skips deploy when reset.sh fails` |
  | by-hand lines reversed (5) | `candidate rehearse › lists by-hand lines in the order deploy.sh wrote them` |
  | `integration` dropped from the matrix (6) | `GitHub workflow › rehearses every stage between framework and deploy on the chosen commit` |
  | the rehearse checkout on `github.sha` (6) | the same test |
  | Stage 7 prints the release trigger while pending (7) | `the /release candidate › prints the release trigger only after a pass…` |

- The pull request's own pipeline: `plan`, `framework / checks`, `unit` and `gate`
  passed; the other stages were skipped by the gate.
- The probe runs and the fresh-agent results were not re-run. The developer opened the
  four run pages themselves in Task 8 and recorded `pass`.
- The handover's diagnosis of the plan's `git show main:` comparison was checked: the
  self-check stages a `git archive` of `HEAD`, which has no `.git`, so any git command
  against the staged tree fails. The fix in `a6db79a` keeps the byte comparison only
  inside a checkout, and pins the framework job's inputs everywhere.

### Found

- **The version sort picks a pre-release tag as production.** `git tag --list 'v*'
  --sort=-v:refname` on tags `v1.0.0`, `v1.0.0-rc.1` and `v1.1.0-rc.1` prints
  `v1.1.0-rc.1` first, and puts `v1.0.0-rc.1` above `v1.0.0`. A project that tags
  pre-releases with a `v` would have its pre-production environment reset to a version
  production never ran, and nothing would say so. The plan specified this sort; the code
  follows it.
- **The summary is not written when the rehearsal stops before `reset.sh`.** No commit,
  tags that cannot be listed, a tag that cannot be archived, or a bad secrets payload
  each exit 1 with a line on stderr and no *Release candidate* section.
- **Stage 7 reads the local verification log without checking that `main` equals
  `origin/main`.** It fetches but never compares.
- **An empty slot's summary says `By hand: not known — the deploy did not finish`**,
  when nothing was deployed by design. The plan's wording allowed it.

### Outstanding disposition

- Probe pull requests 2, 3 and 4 and the tag `v0.0.1` on `fcapurso/tropis-pipeline-probe`:
  dropped. They are the probe's fixtures, left on purpose by the plan.
- A project's release step taking the candidate's commit: dropped. Each project's own
  pipeline, as FW-030 decides; the workflow's release section and RELEASES.md tell the
  project what to change.
- Pre-release tags chosen as production's version: proposed to the developer as a
  catalog entry, because it fails silently.
- No summary when the rehearsal stops early: dropped. The job goes red with the reason in
  its log, so nobody is misled.
- Stage 7 not comparing `main` with `origin/main`: dropped. A stale log can only show an
  older verdict, and the trigger it prints carries that verdict's own candidate hash, so
  the release cannot be started for a commit nobody checked.
- The empty-slot by-hand wording: dropped. The next agent in that code would reword it on
  sight.
- No criterion is left for the developer to observe: the developer's check in Task 8 is
  recorded `pass` in `docs/verification-log.md`.

### Learnings routed

- **A guard cannot run git against the self-check's tree**, which has no `.git`. The
  project `CLAUDE.md` already says the self-check exports `HEAD` with `git archive`; it
  does not say that this leaves no repository to ask. Proposed to the developer as one
  clause in that gotcha, not yet written.
- Task 7's scratch project had no README level, so `/release` stopped at Stage 1b: not
  routed. It is specific to how this plan built its scratch project, and the command
  behaved as written.
- The step summary is not in the jobs API or the run log: not routed. It was a probe
  detail for this plan, and the developer's look covered it.

### Merged because

Every Review Focus line is pinned by a guard that goes red when it is broken, both checks
and the pull request's pipeline are green, the scope matches the table, and the
developer's check of the candidate on GitHub is recorded `pass`.
