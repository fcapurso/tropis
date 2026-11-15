# A pipeline job restores its npm packages from a cache — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** every job in Tropis's three shipped workflows that installs packages, or runs
the project's own commands that may, turns on `actions/setup-node`'s npm cache, keyed on
the lock files it installs from, and turns it off when there is no lock file to key on.

**Backlog item:** `stage-jobs-restore-npm-from-a-cache` in `feature-catalog.yaml` (type
improvement).

**One plan:** what becomes true is one sentence — a job that installs npm packages
restores them from a cache when its lock files have not changed.

**Model tier: Small.** Every change is given verbatim below.

**Merge authority: parent review.** The specifying session reviews and merges. Stop
after Task 4; do not open a pull request, write a review record or merge.

**What the specifying session verified on 2026-11-15, against `origin/main` at `a464046`
(git 2.43, node v22, Linux x86_64, in a Claude Code cloud session):**

- `templates/github/tropis-pipeline.yml` has twelve jobs: `plan`, `host`, `framework`
  (a call to `tropis-framework-checks.yml`, no steps of its own), `sanity`, `unit`,
  `integration`, `end-to-end`, `branch-create`, `end-to-end-deployed`, `gate`, `deploy`,
  `branch-remove`. Every one but `framework` has one step
  `uses: actions/setup-node@v7` whose `with` holds only
  `node-version: ${{ inputs.node-version }}`.
- `plan`, `host` and `gate` run only `node .tropis/scripts/pipeline.mjs` (`plan`,
  `passed`, `environment`, `host`, `gate`) and install nothing. Every other job with
  steps runs `pipeline.mjs run <stage>`, `branch create|deploy|remove` or `run deploy`,
  which run the project's own commands, and those may install packages.
- `templates/github/tropis-staging.yml` has jobs `framework` (a call), `stages` (a matrix
  over the four stages) and `deploy`, each with the same setup-node step.
- `templates/github/tropis-framework-checks.yml` has one job, `checks`, with the same
  setup-node step followed by `npm --prefix .tropis ci`, which installs from
  `.tropis/package-lock.json`. That is the only `npm ci` in the three files.
- No guard asserts the absence of a `cache` input. The guards that read these templates
  are `guards/pipeline.test.js` (*GitHub workflow*: job names, `needs`, `if`,
  concurrency, the host step) and `guards/framework-checks-workflow.test.js` (the
  checkout step). Neither is installed into projects: `.tropis/guards/` has neither, so
  both run only in the self-check.
- **actions/setup-node, read from its repository on 2026-11-15 (latest release v7.1.0):**
  `cache-dependency-path` "Supports wildcards or a list of file names", one per line in a
  `|` block, and "works only If cache is specified"; the post step saves only when the
  restored key is not the primary key ("Cache hit occurred on the primary key …, not
  saving cache"), and only when the job succeeded (`post-if: success()`). It also turns
  npm caching on by itself when `package.json` names npm in `packageManager`
  (`package-manager-cache`, default true) — today's behaviour, which this plan leaves
  alone.
- **Not verified from a document, and so recorded as the first run's observation:**
  that an empty `cache` input skips caching, that `!` excludes in `hashFiles` and in
  `cache-dependency-path` (both go through `@actions/glob`, whose patterns take `!`), and
  that `hashFiles` returns an empty string when nothing matches. This repository's own
  CI runs the installed copies in `.github/workflows/`, not these templates, so no run
  before a release is installed exercises the change.

**Decided by the specifying session:**

1. **`plan`, `host` and `gate` leave the cache off.** They install nothing, and every
   job keyed on the same lock files shares one cache key. `plan` runs first; on a miss
   its post step would save an npm cache holding nothing under that key, and every
   stage job after it would then hit the key, restore nothing, and never save a full
   one. The backlog criterion is narrowed to say so (Task 3).
2. **Two keys.** The framework checks job installs from `.tropis/package-lock.json` and
   keys on that file alone. The project's jobs key on every `package-lock.json` and
   `npm-shrinkwrap.json` in the checkout except those under `.tropis/` and
   `node_modules/`, since the project's commands install from its own lock files, and a
   project with none must not borrow the framework's.
3. **The cache is on only when a lock file matches.** The `cache` input is an
   expression: `'npm'` when `hashFiles` over the same patterns is not empty, `''`
   otherwise, so a job with no lock file runs as today. The patterns in `hashFiles` and
   in `cache-dependency-path` are the same list, and the guard holds them equal.
4. **Written out in each job, not through a YAML anchor or a composite action**: an
   anchor depends on runner support a project's host may lack, and a composite action
   is one more file to install.
5. No decision record: the reasons sit in a comment in each workflow file, where the
   next editor of the step reads them.

---

## Delivers

stage-jobs-restore-npm-from-a-cache

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-npm-cache -b plan/stage-jobs-restore-npm-from-a-cache origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `.github/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## Acceptance criteria (as the claim set them)

1. Every Tropis workflow job that installs packages or runs the project's own commands
   turns on its npm cache, keyed on the lock files it installs from, and a run with an
   unchanged lock file restores from the cache. Planning, the host check and the gate
   install nothing and leave it off.
2. A job with no lock file to key on runs as today, without failing.

## The change

### Project jobs

In `templates/github/tropis-pipeline.yml`, in each of the jobs `sanity`, `unit`,
`integration`, `end-to-end`, `branch-create`, `end-to-end-deployed`, `deploy` and
`branch-remove`, and in `templates/github/tropis-staging.yml`, in `stages` and `deploy`,
replace the step

```yaml
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
```

with

```yaml
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
          cache: ${{ hashFiles('**/package-lock.json', '**/npm-shrinkwrap.json', '!.tropis/**', '!**/node_modules/**') != '' && 'npm' || '' }}
          cache-dependency-path: |
            **/package-lock.json
            **/npm-shrinkwrap.json
            !.tropis/**
            !**/node_modules/**
```

Leave `plan`, `host` and `gate` exactly as they are.

### Framework checks job

In `templates/github/tropis-framework-checks.yml`, job `checks`, the setup-node step
becomes

```yaml
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
          cache: ${{ hashFiles('.tropis/package-lock.json') != '' && 'npm' || '' }}
          cache-dependency-path: .tropis/package-lock.json
```

### Comments

In `templates/github/tropis-pipeline.yml`, directly above `jobs:`, add:

```yaml
# npm cache: a job that installs packages, or runs the project's commands that may,
# restores ~/.npm keyed on the project's lock files, and only when one exists, so a
# project without one runs as before. plan, host and gate install nothing and leave it
# off: every job keyed on the same lock files shares one key, and plan runs first, so
# its empty cache would be the one every stage restored.
```

In `templates/github/tropis-staging.yml`, directly above `jobs:`, add:

```yaml
# npm cache: as in tropis-pipeline.yml, keyed on the project's lock files, and only
# when one exists.
```

In `templates/github/tropis-framework-checks.yml`, directly above `jobs:`, add:

```yaml
# npm cache: keyed on .tropis/package-lock.json, the one lock file this job installs
# from, apart from the project's own key.
```

### The guard

Append to `guards/framework-checks-workflow.test.js` (after the existing `describe`), and
extend the file's opening comment with one paragraph:
"Also: every job in the three shipped workflows that sets up Node and installs, or runs
the project's commands, turns the npm cache on keyed on its lock files, only when one
exists; plan, host and gate leave it off."

```js
const workflows = ['tropis-pipeline.yml', 'tropis-staging.yml', 'tropis-framework-checks.yml'];
const parse = (name) => YAML.parse(readFileSync(resolve(here, '../templates/github', name), 'utf8'));
const NO_INSTALL = ['plan', 'host', 'gate'];
const PROJECT_LOCKS = ['**/package-lock.json', '**/npm-shrinkwrap.json', '!.tropis/**', '!**/node_modules/**'];
const FRAMEWORK_LOCKS = ['.tropis/package-lock.json'];
const cacheOf = (patterns) =>
  `\${{ hashFiles(${patterns.map((p) => `'${p}'`).join(', ')}) != '' && 'npm' || '' }}`;
const setupNodeSteps = () =>
  workflows.flatMap((name) =>
    Object.entries(parse(name).jobs).flatMap(([job, body]) =>
      (body.steps ?? [])
        .filter((s) => /^actions\/setup-node@/.test(s.uses ?? ''))
        .map((step) => ({ name, job, step })),
    ),
  );

describe('the npm cache in the shipped workflows', () => {
  it('finds a setup-node step in every workflow', () => {
    const seen = new Set(setupNodeSteps().map((s) => s.name));
    expect([...seen].sort()).toEqual([...workflows].sort());
  });

  it('is on in every job that installs or runs the project, keyed on its lock files', () => {
    for (const { name, job, step } of setupNodeSteps()) {
      if (NO_INSTALL.includes(job) && name === 'tropis-pipeline.yml') continue;
      const locks = name === 'tropis-framework-checks.yml' ? FRAMEWORK_LOCKS : PROJECT_LOCKS;
      const where = `${name} ${job}`;
      expect({ where, cache: step.with?.cache }).toEqual({ where, cache: cacheOf(locks) });
      const paths = String(step.with?.['cache-dependency-path'] ?? '').split('\n').filter(Boolean);
      expect({ where, paths }).toEqual({ where, paths: locks });
    }
  });

  it('is off in plan, host and gate, which install nothing', () => {
    const jobs = parse('tropis-pipeline.yml').jobs;
    for (const job of NO_INSTALL) {
      const step = jobs[job].steps.find((s) => /^actions\/setup-node@/.test(s.uses ?? ''));
      expect({ job, cache: step.with.cache }).toEqual({ job, cache: undefined });
      expect({ job, path: step.with['cache-dependency-path'] }).toEqual({ job, path: undefined });
    }
  });
});
```

`readFileSync`, `resolve`, `here` and `YAML` are already imported or defined at the top
of the file; add nothing to the imports.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run the guard alone the way the self-check stages it.** Run
  `bash scripts/check-blueprint.sh` once first so `.self-check/` exists. Then build a
  stage: `S=$(mktemp -d) && git archive HEAD | tar -x -C $S && echo '{"type":"module"}' > $S/package.json && cp $S/templates/framework-jest.config.js $S/jest.config.js && ln -s "$PWD/.self-check/node_modules" $S/node_modules`,
  and from `$S`: `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/framework-checks-workflow.test.js`.
  Rebuild the stage after each commit.
- **Do not edit `.github/workflows/`.** Those are this repository's installed copies;
  they change only when a release is installed.
- **The `cache` value is a single-line string with `${{ … }}` in a plain YAML scalar.**
  YAML reads it as a string because it starts with `$`; do not quote it, so the text
  the guard compares is exactly the text in *The change*.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `templates/github/tropis-pipeline.yml` | cache on eight jobs, a comment |
| `templates/github/tropis-staging.yml` | cache on two jobs, a comment |
| `templates/github/tropis-framework-checks.yml` | cache on `checks`, a comment |
| `guards/framework-checks-workflow.test.js` | three cases, one paragraph of its opening comment |
| `feature-catalog.yaml` | the item to `shipped`, with a comment mapping criteria to evidence (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's block removed, if it has one (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-15-stage-jobs-restore-npm-from-a-cache.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the comments in the three workflows are
the closeout. No decision record, no rule, no operator-guide change (the operator guide
does not describe the workflows' steps). A release-note line is the developer's at
`/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The guard, red before the change

Append the guard from *The guard*, and its comment paragraph. Commit. Build a stage and
run the guard alone (*Traps*). Expected: `finds a setup-node step in every workflow`
passes, `is off in plan, host and gate` passes, and
`is on in every job that installs or runs the project` fails, its diff showing
`tropis-pipeline.yml sanity` (the first such job) with `"cache": undefined`. Paste the
`Tests:` line and that diff's first lines. If it fails any other way, fix the guard to
match *The guard* and run it again.

### Task 2 — The change

Make every change under *Project jobs*, *Framework checks job* and *Comments*. Commit.
Rebuild the stage, run the guard alone: all four cases in the file pass. Paste the
`Tests:` line. Then run `guards/pipeline.test.js -t "GitHub workflow"` from the same
stage: it passes. Paste its `Tests:` line.

Then two red checks, each in a scratch copy of the stage (not the worktree), each
discarded after:

1. In `templates/github/tropis-staging.yml`, delete the `cache:` line from the `deploy`
   job only. The guard fails naming `tropis-staging.yml deploy`. Paste the line.
2. In `templates/github/tropis-pipeline.yml`, add
   `          cache: npm` under `node-version` in the `gate` job. The guard fails naming
   `gate`. Paste the line.

### Task 3 — The backlog and the board

1. In `feature-catalog.yaml`, on `stage-jobs-restore-npm-from-a-cache`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as they are (the claim already narrowed criterion 1); set
   `modules` to the three templates and `guards/framework-checks-workflow.test.js`; make
   sure `refs` holds
   `docs/superpowers/plans/2026-11-15-stage-jobs-restore-npm-from-a-cache.md`. Add,
   below the comment lines already directly above the item:
   ```
   # Shipped by docs/superpowers/plans/2026-11-15-stage-jobs-restore-npm-from-a-cache.md.
   # Criterion 1, configuration: guards/framework-checks-workflow.test.js, the npm cache cases.
   # Criterion 1, the restore, and criterion 2 on a real run: observed on the first pipeline
   # run after a release carrying this is installed here - a stage job's log names the key
   # it restored, and a job with no lock file shows no cache step.
   ```
2. In `docs/backlog-board/bands.yaml`, delete the item's block if it has one, nothing
   else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 4 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check, and that the restore on a real run is observed after
   a release is installed). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/stage-jobs-restore-npm-from-a-cache`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.

## Handover report

Tools: git 2.43.0, node v22.23.4, Linux x86_64. No named source was worked from; the
change and guard are written from the plan's text against this repository's own names.

### Task completion

- Task 0: worktree clean, `npm --prefix .tropis ci` done, self-check passed at the start.
- Task 1: guard and its comment paragraph appended, committed; red as expected.
- Task 2: cache turned on in eight `tropis-pipeline.yml` jobs, two `tropis-staging.yml`
  jobs and `checks`; three comments added; guard green; both red checks failed as named.
- Task 3: item set to `shipped` with modules, refs and evidence comment; its block
  removed from `bands.yaml`. The board's `index.html` was not rebuilt by a hook, so it is
  not in the diff.
- Task 4: verification below.

### Verification results

- Guard before the change (staged `HEAD` export): `Tests:       1 failed, 3 passed, 4 total`;
  first diff lines: `"cache": "${{ hashFiles('**/package-lock.json', ...) ... }}"` expected,
  `"cache": undefined` received, `"where": "tropis-pipeline.yml sanity"`.
- Guard after: `Tests:       4 passed, 4 total`.
- `guards/pipeline.test.js -t "GitHub workflow"`: `Tests:       157 skipped, 5 passed, 162 total`.
- Red check 1 (no `cache:` in staging `deploy`): failure names `"where": "tropis-staging.yml deploy"`.
- Red check 2 (`cache: npm` in `gate`): failure names `"job": "gate"`, `Tests:       1 failed, 3 passed, 4 total`.
- `npm --prefix .tropis test`: `Tests:       211 passed, 211 total`.
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `git diff --stat origin/main...HEAD` (before this report): six files, 125 insertions,
  14 deletions, all in *File Structure*.

### Scope

Only files in *File Structure*; nothing under `.claude/`, `.tropis/` or `.github/`.

### Judgment calls

None beyond the plan. The edits to the workflows were applied by a script that replaced
the setup-node step per job, skipping `plan`, `host` and `gate`.

### What the plan got wrong

Nothing found. The pipeline template has eleven setup-node steps, eight after leaving out
`plan`, `host` and `gate`, as the plan said.

### Outstanding

The change has no screen, so there is no developer check. That a run restores from the
cache, that an empty `cache` skips caching, that `!` excludes in `hashFiles` and
`cache-dependency-path`, and that `hashFiles` is empty when nothing matches, are observed
on the first pipeline run after a release carrying this is installed. A release-note line
is the developer's at `/release`.
