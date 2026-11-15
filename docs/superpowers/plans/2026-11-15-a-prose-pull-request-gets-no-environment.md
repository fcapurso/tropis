# A pull request of prose alone starts no job to create or remove an environment — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** where the branch slot is filled, the plan job says whether a pull request is
prose (`prose=yes` or `prose=no`) and whether its environment is to be created
(`create=run` or `create=skipped`). A prose pull request starts neither `branch-create`
nor `branch-remove`. A pull request that started as prose and gains other changes gets
its environment on the first push that carries them, after GitHub says the pull request
is still open. Everywhere else the pipeline is exactly as it is.

**Backlog item:** `a-prose-pull-request-gets-no-environment` in `feature-catalog.yaml`
(type improvement). There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — a pull request of prose alone starts no
job to create or remove an environment, and gets one when it gains code.

**Model tier: Medium.** The design, names, wording and workflow text are given below; the
executor writes the JavaScript and its tests against `scripts/pipeline.mjs` and
`guards/pipeline.test.js`.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request, moves the backlog item to `shipped` and merges. Stop after Task 6; do not open a
pull request, write a review record, edit `feature-catalog.yaml` or merge.

**Merges after:** pipeline-starts-no-job-for-seconds-of-work, a-sessions-prose-lands-as-one-pull-request, passed-check-can-ask-the-host, stage-jobs-restore-npm-from-a-cache

**No fresh-agent check is owed:** nothing under `framework/`'s workflow, `rules/` or
`commands/` changes. `templates/README.md` is the operator guide a project installs as
`.tropis/README.md`, and the decision record gains an entry.

**What the specifying session verified on 2026-11-15, against `origin/main` at `a464046`
(git 2.43, node v22, Linux x86_64):**

- `templates/github/tropis-pipeline.yml`, job `plan`, step `plan`: on `pull_request` it
  prints the environment name; when `$ACTION` is `closed` it runs
  `node .tropis/scripts/pipeline.mjs plan --closed >> "$GITHUB_OUTPUT"` and exits 0.
  Otherwise it runs `plan --base "$base" --head "$head" --event "$EVENT_NAME"` (plus
  `--passed` when a commit passed) and writes every line it prints to `$GITHUB_OUTPUT`
  under `lines` and as single keys. The job's `outputs:` block forwards each key by
  name; a key not listed there is not visible to other jobs. The step's env has
  `PR_BASE` (`github.event.pull_request.base.sha`), `PR_HEAD`
  (`github.event.pull_request.head.sha`) and `PUSH_BEFORE` (`github.event.before`). The
  checkout uses `fetch-depth: 0`. The step already fetches a commit the checkout may not
  hold with `git fetch --no-tags --quiet origin "$passed" || true`.
- `branch-create` runs when
  `github.event_name == 'pull_request' && (github.event.action == 'opened' || github.event.action == 'reopened') && needs.plan.outputs.branch == 'filled'`
  and runs `node .tropis/scripts/pipeline.mjs branch create "$HEAD_REF"`.
  `branch-remove` runs when `github.event.action == 'closed' && needs.plan.outputs.branch == 'filled'`.
  `deploy` and `end-to-end-deployed` need `branch-create` and run unless its result is
  `failure`, so a skipped create lets them run.
- `scripts/pipeline.mjs`:
  - `isProseAndFramework(paths, proseText)` is true when there is at least one path and
    every path is framework or prose; `readProse(root)` reads `pipeline/prose.txt` or
    returns null. `git(root, args)` runs git with `-C root`.
  - `parsePlanArgs` accepts only `--base`, `--head`, `--passed`, `--event`, each with a
    value. The CLI block computes `branchSlot(root)`, then `planStages`, sets
    `outcome.branch`, sets `outcome.endToEndOn` when `--event` is given, and calls
    `writePlan`, which prints the six stage lines, then `end-to-end-on=`, `passed=`,
    `branch=` when present, and `reason`/`note` on stderr.
  - `plan --closed` takes no other argument (exit 2 otherwise) and calls `closedPlan`,
    which prints six `skipped` stage lines and `branch=`.
  - `branchCommand(root, action, branch)` is called from the CLI as
    `branchCommand(root, args[0], args[1])`; it checks the action, the slot, the
    permanent list and the name, then runs `pipeline/branch/<action>.sh`.
  - `askGitHub(args)` runs `gh` and returns `{ value }` (parsed JSON) or `{ error }`.
    `host` and `passed` read `GITHUB_REPOSITORY` from the environment.
  - `readPlan` (the gate's) keeps every `key=value` line, and the gate refuses only a
    plan missing a stage, so extra plan lines do not disturb it.
  - `commandList()` has, among others, the comment lines
    `# When a pull request opens or reopens and the plan says branch=filled.` (before
    `branch create "$BRANCH"`) and `# When a pull request closes and the plan says branch=filled.`
    (before `branch remove "$BRANCH"`).
- `guards/pipeline.test.js`: *plan from a git repository* builds real repositories and
  runs the plan; *host* and *passed* put a stub `gh` first on `PATH` (see
  `hostProject`); *GitHub workflow* asserts the job list, the plan step's text and the
  `branch-create`/`deploy` conditions.
- `templates/README.md`, *The pipeline*, says `create.sh` and `remove.sh` "must succeed
  when run again, because the environment may already exist or may already be gone",
  and that `deploy.sh` with no environment should fail, saying to close and reopen the
  pull request.
- `framework/DECISIONS.md` ends at FW-075. FW-029 (*A branch's environment is named from
  the branch and lives as long as its pull request*) says opening or reopening a pull
  request creates the environment and closing it removes it.
- `RELEASES.md` has `## [Unreleased]` with `_Nothing yet._` under it.

**Decided by the specifying session:**

- **What prose means for a pull request.** A pull request is prose when every file it
  touches is prose or framework (`isProseAndFramework`), where the files it touches are
  the union of `git diff --name-only --no-renames <base>...<head>` and
  `git log --format= --name-only --no-renames <base>..<head>` (every commit's files, so
  a pull request that added code and then reverted it is not prose: it had an
  environment, and closing it must remove it). An exported pure-ish function
  `pullRequestProse(root, { base, head })` returns `true`, `false`, or `null` when
  either revision does not resolve or git fails. No files at all is `false`, as
  `isProseAndFramework` already decides.
- **Unknown counts as code.** Wherever the answer is `null`, the plan says `prose=no`.
  That is today's behaviour (create and remove run), and `create.sh`/`remove.sh` are
  already required to succeed when run again.
- **When the environment is created** — exported function
  `createDecision({ branch, action, prose, proseBefore })` returning `'run'` or
  `'skipped'`:
  - `branch !== 'filled'` → `skipped`; `prose === true` → `skipped`;
  - `action` `opened` or `reopened` → `run`;
  - `action` `synchronize` → `run` when `proseBefore` is `true` or `null` (the pull
    request was prose before this push, or that cannot be told, as after a force push),
    `skipped` when `proseBefore` is `false` (it already had code, so its environment
    exists);
  - any other action → `skipped`.
- **The plan's CLI.** `plan` takes two more options: `--action <name>` and
  `--before <sha>`. `--action` requires `--event pull_request`
  (`plan: --action needs --event pull_request`, exit 2). `--before` requires
  `--action synchronize` (`plan: --before is for --action synchronize`, exit 2). An
  empty value for either is the existing "needs a revision" style error, exit 2 (word
  it `plan: --action needs a value`). When `--action` is given, the plan prints two
  more lines after `end-to-end-on=` and before `passed=`/`branch=`:
  `prose=yes|no` (from `pullRequestProse(root, { base, head })`) and
  `create=run|skipped` (from `createDecision`, with `proseBefore` from
  `pullRequestProse(root, { base, head: before })`, or `null` when `--before` is absent
  or all zeros). Without `--action` nothing new is printed, so every existing caller
  and test sees the plan it sees today. When the slot is filled and `prose=yes`, the
  plan writes one stderr line:
  `plan: only prose and framework files in this pull request, so no environment is created or removed`.
- **The closed plan.** `plan --closed` also accepts `--base <sha> --head <sha>` (both or
  neither; one alone, or any other argument, exits 2 with
  `plan: --closed takes --base and --head together, and nothing else`). With them it
  prints `prose=yes|no` after the stage lines and before `branch=`; without them it
  prints what it prints today. With `prose=yes` and a filled slot it writes the same
  stderr line as above.
- **The open check.** `branch create <branch> --if-open <number>`: before running
  `create.sh` (after the slot, permanent and name checks it already does), it asks
  `gh api repos/<GITHUB_REPOSITORY>/pulls/<number>` with `askGitHub`. State `open` →
  create as today. Any other state → print
  `branch: pull request #<number> is <state>, so its environment is not created` on
  stdout and exit 0 without running `create.sh`. `GITHUB_REPOSITORY` unset →
  `branch: --if-open needs GITHUB_REPOSITORY`, exit 1. GitHub cannot be asked, or the
  answer has no string `state` → `branch: could not tell whether pull request #<number> is open: <why>`,
  exit 1 (an environment nothing would remove is worse than a red job that says why).
  `--if-open` with another action, a missing or non-numeric number, or any other extra
  argument exits 2 (`branch: --if-open is for create only`,
  `branch: --if-open needs a pull request number`, `branch: unknown argument <arg>`).
  Without `--if-open`, `branch` behaves as today. An empty slot still prints its one
  line and exits 0 before any of this.
- **The workflow** (`templates/github/tropis-pipeline.yml`), exactly:
  - The plan step's env gains nothing: `PUSH_BEFORE` (`github.event.before`) is also
    used for a pull request, since a `synchronize` event carries it.
  - The `closed` branch becomes:
    ```bash
          if [ "$ACTION" = "closed" ]; then
            # The head branch may be deleted already; an unresolved head plans prose=no.
            git fetch --no-tags --quiet origin "$PR_HEAD" || true
            node .tropis/scripts/pipeline.mjs plan --closed --base "$PR_BASE" --head "$PR_HEAD" >> "$GITHUB_OUTPUT"
            exit 0
          fi
    ```
  - On `pull_request`, the plan call gains `--action "$ACTION"`, and on `synchronize`
    also `--before "$PUSH_BEFORE"`, after
    `git fetch --no-tags --quiet origin "$PUSH_BEFORE" || true` (a force push can leave
    the old head unfetched; it then plans as unknown). Build the arguments in a bash
    array the way `passed_args` is built (`pr_args=()`), so a push event passes neither.
  - The plan job's `outputs:` gains `prose: ${{ steps.plan.outputs.prose }}` and
    `create: ${{ steps.plan.outputs.create }}`.
  - `branch-create`'s `if` becomes
    `${{ github.event_name == 'pull_request' && needs.plan.outputs.branch == 'filled' && needs.plan.outputs.create == 'run' }}`,
    and its run becomes
    `node .tropis/scripts/pipeline.mjs branch create "$HEAD_REF" --if-open "$PR_NUMBER"`,
    with env `HEAD_REF`, `PR_NUMBER: ${{ github.event.pull_request.number }}`,
    `GH_TOKEN: ${{ github.token }}` and `TROPIS_SECRETS` as now. Update the comment above
    the job: opening or reopening a pull request that is not prose creates the
    environment, and so does the first push that gives a prose pull request other
    changes, once GitHub says it is still open.
  - `branch-remove`'s `if` becomes
    `${{ github.event.action == 'closed' && needs.plan.outputs.branch == 'filled' && needs.plan.outputs.prose != 'yes' }}`
    (`!= 'yes'`, so a plan that printed no prose line removes, as today).
  - Nothing else in the file changes.
- **The command list** (`commandList()`): the create comment becomes
  `# When the plan says create=run: a pull request that is not prose opens or reopens, or a push first gives it other changes.`
  and the command `node .tropis/scripts/pipeline.mjs branch create "$BRANCH" --if-open "$NUMBER"`;
  the remove comment becomes
  `# When a pull request closes, the plan says branch=filled and it does not say prose=yes.`
  The closed plan's command line, if the list shows one, gains `--base "$BASE" --head "$HEAD"`;
  if it shows none, add none.
- **Not breaking.** A project's prose pull requests stop creating and removing
  environments, which only saves jobs; nothing a project wrote changes. The release
  line says so, and that a closed pull request whose head commit GitHub cannot serve
  still removes its environment.
- A decision record entry, FW-076, amends FW-029; FW-029 gains the line
  `**Amended 2026-11-15** — a prose pull request gets no environment, and one that gains code gets it on that push; FW-076.`

---

## Delivers

a-prose-pull-request-gets-no-environment

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-prose-env -b plan/a-prose-pull-request-gets-no-environment origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `.github/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; change an
  existing assertion only where this plan changes what it asserts (the plan step's
  closed line, the `branch-create` and `branch-remove` conditions, the command list).
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | `pullRequestProse`, `createDecision`, `plan --action/--before`, `plan --closed --base --head`, `branch create --if-open`, `commandList`, the module docstring |
| `guards/pipeline.test.js` | tests for each of the above; the *GitHub workflow* assertions follow the template |
| `templates/github/tropis-pipeline.yml` | the plan step's closed and pull-request calls, two outputs, `branch-create` and `branch-remove` |
| `templates/README.md` | one paragraph in *The pipeline* |
| `framework/DECISIONS.md` | FW-076 appended; FW-029 gains an amendment line |
| `RELEASES.md` | one line under `## [Unreleased]` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session does this at merge; the executor does not touch it) |
| `docs/superpowers/plans/2026-11-15-a-prose-pull-request-gets-no-environment.md` | this plan; the handover report |

## Task 1 — the plan says whether the pull request is prose, and whether to create

In `scripts/pipeline.mjs`, add `pullRequestProse` and `createDecision` (exported, each
with a JSDoc contract), the `--action`/`--before` options and the two lines, and the
closed plan's `--base`/`--head`, as decided above. Update the module docstring's sentence
about pull requests to say a prose pull request gets no environment.

Tests in `guards/pipeline.test.js`, in *plan from a git repository* (real repositories,
with `pipeline/branch/` filled where the case needs it), at least:

- a pull request of prose alone (a file matched by `pipeline/prose.txt`):
  `--action opened` prints `prose=yes` and `create=skipped`, and the stderr line;
- a pull request with a code file, `--action opened`: `prose=no`, `create=run`;
- **a pull request that starts as prose and gains code** — base commit, a prose commit
  `P`, then a code commit `C` on top: `--head C --action synchronize --before P` prints
  `prose=no` and `create=run`; a further code commit `D` with `--head D --before C`
  prints `create=skipped`;
- a pull request that added a code file and then deleted it again (net diff prose only):
  `prose=no`;
- `--before` that does not resolve, or is all zeros: `create=run`;
- an empty slot: `create=skipped` whatever the diff;
- `plan --closed --base B --head H` on a prose pull request prints `prose=yes`; on a
  code one `prose=no`; with a head that does not resolve `prose=no`; plain
  `plan --closed` prints exactly what it printed before (no `prose=` line);
- the argument errors above, each with its exit status;
- without `--action`, the plan prints no `prose=` and no `create=` line (an existing
  test's exact output must keep passing unchanged).

Unit tests for `createDecision` cover every row of its table.

Passing: the new tests pass and every existing one in the file still passes.

## Task 2 — `branch create --if-open`

Add the option as decided. Tests, with a stub `gh` first on `PATH` in the style of
`hostProject` (log its calls; answer `api repos/acme/app/pulls/7` with
`{"state":"open"}` or `{"state":"closed"}`; `GITHUB_REPOSITORY=acme/app`), and a
`pipeline/branch/create.sh` that writes a marker file:

- open → `create.sh` runs (the marker exists), exit 0;
- closed → the marker does not exist, stdout is the `is closed` line, exit 0;
- the stub fails → exit 1, the `could not tell` line, no marker;
- `GITHUB_REPOSITORY` unset → exit 1, no marker, and `gh` was not called;
- `--if-open` with `deploy`, a missing number, `abc` → exit 2 with the messages above;
- without `--if-open`, `gh` is not called (the stub log stays empty).

## Task 3 — the workflow

Edit `templates/github/tropis-pipeline.yml` exactly as decided. Update the *GitHub
workflow* tests: the plan step contains
`plan --closed --base "$PR_BASE" --head "$PR_HEAD" >> "$GITHUB_OUTPUT"`,
`git fetch --no-tags --quiet origin "$PR_HEAD" || true`, `--action "$ACTION"` and
`--before "$PUSH_BEFORE"`; `jobs.plan.outputs.prose` and `.create` forward the step's
outputs; `branch-create`'s `if` contains `needs.plan.outputs.create == 'run'` and no
longer contains `github.event.action == 'opened'`; its run is the `--if-open` command and
its env has `PR_NUMBER` and `GH_TOKEN`; `branch-remove`'s `if` contains
`needs.plan.outputs.prose != 'yes'`. Keep every other existing assertion.

## Task 4 — the command list

Update `commandList()` as decided, and the test that inspects the command lines (*names
every stage, in order, with when to run each command*, or wherever the create and
remove lines are asserted).

## Task 5 — the documents

- `templates/README.md`, *The pipeline*, after the paragraph that ends "Removing the
  environment when the pull request closes needs `closed` listed …": one paragraph
  saying that a pull request whose files are all prose or framework, counting every
  commit on it, gets no environment, so no job creates one or removes it; that the first
  push giving it other changes creates the environment, once GitHub says the pull request
  is still open, which needs the workflow token's default read access to pull requests;
  and that where the pipeline cannot tell, it creates and removes as before, which is
  why `create.sh` and `remove.sh` must succeed when run again.
- `framework/DECISIONS.md`: append FW-076, *A pull request of prose alone gets no
  environment*, in the format of FW-074 (Date 2026-11-15, Status Accepted; built by the
  backlog item a-prose-pull-request-gets-no-environment; amends FW-029), with Decision
  (the bullets above, in prose), Evidence (under a gated main branch every backlog edit,
  claim and plan is a pull request, and with a filled slot each paid a job to create an
  environment and another to remove it, none ever deployed; raised by first-adopter's
  upstream flush; source: none in particular), Rejected (deciding prose from the net
  diff alone: a pull request that added and reverted code would leak its environment;
  asking GitHub at close whether the environment was ever created: the pipeline has no
  record of it, and `remove.sh` already succeeds on an absent one; telling the developer
  to close and reopen a pull request that gains code: the criterion this item replaced),
  and Consequences (not breaking; a closed pull request whose head GitHub cannot serve
  still removes; a pull request force-pushed from code to prose alone keeps its
  environment when closed, and `branch remove <branch>` run by hand removes it). Add the
  amendment line to FW-029, after its *Consequences* paragraph.
- `RELEASES.md`, under `## [Unreleased]`, replacing `_Nothing yet._`: one line in the
  style of the entries below it saying a pull request of prose alone no longer starts a
  job to create or remove its environment, and one that gains code gets its environment
  on that push; not breaking.

## Task 6 — verification, then the handover report

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
   - make `pullRequestProse` read only the net diff (drop the `git log` paths): the
     add-then-delete test fails (it would say `prose=yes`);
   - make `createDecision` return `skipped` for `synchronize`: the starts-as-prose-gains-code
     test fails;
   - make `--if-open` skip the state check: the closed-pull-request test fails (the
     marker exists);
   - remove `needs.plan.outputs.prose != 'yes'` from `branch-remove` in the template:
     the *GitHub workflow* test fails.
   Restore each and see the guard pass.
4. `npm --prefix .tropis test` from the worktree (after `npm --prefix .tropis ci`): it
   must pass; report its count.
5. `git diff --stat origin/main...HEAD`: every file in the File Structure table except
   `feature-catalog.yaml`, nothing else.

Then append `## Handover report` to this plan, with the six sections
`.claude/rules/planning.md` names (*Every plan ends with a handover report*), commit it,
run step 1 again on that commit, and push the branch.

## Traps

- **The workflow cannot be run here.** The guard reads the template as YAML. Do not try
  to run a workflow or open a pull request to see one run.
- **`npm --prefix .tropis test` runs the installed release**, which knows nothing of this
  change. That is right; do not edit `.tropis/`.
- **`.github/workflows/` in this repository is the installed copy.** Edit only
  `templates/github/tropis-pipeline.yml`.
- **FW-076 may be taken by a plan that merges first.** If `origin/main` has an FW-076
  when you rebase, renumber yours to the next free number in both places and in
  `RELEASES.md` if it names it; that is a mechanical conflict in a file every plan
  touches.
- **Existing plan-output tests must not change**: without `--action`, and `--closed`
  without `--base`/`--head`, the plan prints exactly what it prints today. If one of them
  fails, the new lines leaked; fix the code, not the test.
- **`git log base..head` on a merge commit lists no files** by default. That is wanted:
  a merge from the main branch brings the main branch's files, which are not the pull
  request's. Do not add `-m` or `--first-parent`.
