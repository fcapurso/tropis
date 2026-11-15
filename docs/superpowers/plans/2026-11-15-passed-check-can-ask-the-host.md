# The check for code that already passed works in a private repository — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the pipeline's own jobs that ask GitHub something declare the token
permissions they need, the caller template grants them, a run whose lookup is refused
says so as a warning in its summary naming the missing permission, and a new command,
`pipeline.mjs permissions`, tells a project which workflow that calls the pipeline
withholds what and what to add. The release notes carry the step that runs it.

**Backlog item:** `passed-check-can-ask-the-host` in `feature-catalog.yaml` (type bug).
There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — the check for code that already passed
gets the token permissions it needs in a private repository, and says so when it does not.

**Model tier: Medium.** Names, wording, YAML and the decision text are given below; the
executor writes the JavaScript and its tests against `scripts/pipeline.mjs` and
`guards/pipeline.test.js`.

**Merge authority: parent review.** The specifying session reviews, writes the manual
check, opens the pull request, moves the backlog item to `shipped` and merges. Stop after
Task 6; do not open a pull request, write a review record, edit `feature-catalog.yaml`,
`docs/verification-log.md` or merge.

**Merges after:** a-sessions-prose-lands-as-one-pull-request, stage-jobs-restore-npm-from-a-cache

**No fresh-agent check is owed:** nothing under `framework/`'s workflow, `rules/` or
`commands/` changes. `templates/README.md` is the operator guide a project installs as
`.tropis/README.md`, and the decision record gains an entry.

**What the specifying session verified on 2026-11-15, against `origin/main` at `a464046`
(git 2.43, node v22, Linux x86_64):**

- **The cause, measured.** In a private project on v0.10.0 whose workflows are the
  release's unchanged, every plan job for three days printed
  `passed: could not ask GitHub (gh api repos/<owner>/<repo>/actions/runs/<run id>): gh: Resource not accessible by integration (HTTP 403); nothing is skipped`,
  on pushes to the main branch and on a pull request's `synchronize` alike. The
  project's caller then granted `contents: read` and `pull-requests: read` and no
  `actions`; before that it had no `permissions` block. The 403 was the same both ways.
- **Why this repository is spared: it is public.** The plan job of this repository's run
  43641176644 (push to main, 2026-11-14) logged, under *GITHUB_TOKEN Permissions*,
  only `Contents: read`, `Metadata: read`, `Packages: read` — no Actions — and its
  lookup still answered: `passed: pull request #302 passed at ffd3010`. Reading runs of
  a public repository needs no permission; of a private one it needs `actions: read`.
- **A called workflow's token is bounded by its caller.** A job in a reusable workflow
  may only lower what the caller grants. A caller with no `permissions` block grants the
  repository's default, which in a repository set to read-only is contents, metadata and
  packages read. A job in the called workflow that declares more than its caller grants
  fails the whole run at startup (GitHub reports the nested job as requesting a
  permission it is only allowed `none` of). That is why the caller has to change with
  the template, and why the release notes carry a required step.
- **What each lookup asks** (`findPassed` in `scripts/pipeline.mjs`, ~line 1290):
  `repos/<repo>/actions/runs/<id>`, `repos/<repo>/actions/workflows/<id>/runs?...` and
  `repos/<repo>/actions/runs/<id>/jobs?...` need `actions: read`;
  `repos/<repo>/commits/<sha>/pulls` needs `pull-requests: read` (and `contents: read`).
  The `host` job asks `repos/<repo>` and `repos/<repo>/rules/branches/<branch>`, which
  need only metadata, always granted; its checkout needs `contents: read`.
  `askGitHub(args)` returns `{ value }` or `{ error }` whose text starts
  `could not ask GitHub (gh <args>): `. `findPassed` returns `{ commit, line }` or
  `{ line }`; `passedCommand` writes `line` to stderr and, with `--summary`, appends
  `${line}\n\n` to the summary file. `passed` never fails the run (exit 0).
- **Which jobs use the token.** In `templates/github/tropis-pipeline.yml` only `plan`
  (its `plan` step's `GH_TOKEN`) and `host` set `GH_TOKEN`. Every other job checks out
  and runs `pipeline.mjs run|branch|gate`; `sanity` … `deploy` run the project's own
  scripts with `TROPIS_SECRETS`. `templates/github/tropis-framework-checks.yml` and
  `templates/github/tropis-staging.yml` use no token. No template and neither caller
  template (`templates/pipeline-caller.yml`, `templates/staging-caller.yml`) has a
  `permissions` key. This repository's own caller, `.github/workflows/pipeline.yml`, is
  `templates/pipeline-caller.yml` byte for byte; it is project-owned, not the installed
  release (`.github/workflows/tropis-*.yml` are the release).
- `pipeline.mjs` imports no `yaml` at the top: the plan job runs it before any
  `npm ci`. `scripts/load-yaml.mjs` exports the `yaml` package for scripts that need it.
  `projectRoot()` (~line 827) finds the repository root; the CLI block at the bottom
  dispatches on the first argument and ends with `pipeline: unknown command`.
- `guards/pipeline.test.js`: *passed* (~line 2083) stubs `gh` with `passedProject()`
  and `passed(project, args, { env, … })`; `STUB_FAIL` makes every call fail with that
  stderr. The test *never fails the run: a gh failure prints nothing, exits 0, and says
  why in the summary* uses `STUB_FAIL: 'HTTP 403: Resource not accessible by integration'`.
  *GitHub workflow* (~line 2252) parses the templates with `YAML` and `blueprint`.
- `templates/README.md` line ~170 says: "This needs the workflow token's default read
  access to actions and pull requests; without it nothing is skipped, and the plan job's
  summary says why." That is wrong for a private repository and is replaced (Task 5).
- `framework/DECISIONS.md` ends at FW-075. FW-048 (*A run skips the stages when the same
  code already passed*) is at ~line 1528.
- `RELEASES.md` has `## [Unreleased]` with `_Nothing yet._` under it. Its preamble counts
  "a new check fails until the project changes something only a person can change" as
  breaking; a pipeline that fails at startup until the caller grants is that.

**Decided by the specifying session:**

- **Only the jobs that ask GitHub declare permissions, at job level.** `plan` declares
  `actions: read`, `contents: read`, `pull-requests: read`; `host` declares
  `contents: read`. No workflow-level `permissions` block in any template, and no block
  on the jobs that run the project's scripts: once a job lists permissions it has only
  those, and only the project knows what its stage and deploy scripts need (packages
  from GitHub's registry, an OIDC token for a cloud deploy). Those jobs keep taking what
  the caller grants. `tropis-framework-checks.yml` and `tropis-staging.yml` are not
  changed: they use no token beyond the checkout.
- **The caller template grants exactly the three**, at job level on `pipeline:`, with a
  comment saying that a stage or deploy script needing more adds it there, since a job
  that lists permissions has only those. `templates/staging-caller.yml` is not changed.
  This repository's own `.github/workflows/pipeline.yml` gets the same block now, so it
  stops depending on being public and is ready when it installs the release.
- **The warning.** When a lookup in `findPassed` cannot ask GitHub (an `askGitHub`
  error — not a missing variable, not an answer of the wrong shape), the `passed:` line
  is unchanged and, with `--summary`, a GitHub alert is appended after it:

  ```
  > [!WARNING]
  > The check for code that already passed could not ask GitHub, so nothing was skipped and every stage ran. The job's token needs `<permission>`: grant it in the workflow that calls the pipeline, as `.tropis/templates/pipeline-caller.yml` does. `node .tropis/scripts/pipeline.mjs permissions` says what to add.
  ```

  `<permission>` is `actions: read` for the requests under `/actions/` and
  `pull-requests: read` for `commits/<sha>/pulls`. The same text, without the `> `
  prefixes, also goes to stderr after the `passed:` line, so the job log carries it.
  Exit status stays 0 and stdout stays empty.
- **`pipeline.mjs permissions`** (no arguments; any argument is
  `permissions: takes no arguments`, exit 2). From `projectRoot()` (none:
  `pipeline: not a git repository`, exit 1) it reads every `*.yml` and `*.yaml` file
  directly in `.github/workflows/`, parsed with `yaml` loaded by dynamic
  `import('./load-yaml.mjs')` inside this command only. A job calls the pipeline when its
  `uses` is a string ending `/tropis-pipeline.yml` or `/project-pipeline.yml`. Its grant
  is the job's `permissions` if the key is present, else the workflow's top-level
  `permissions` if present, else none stated. Needed: `actions`, `contents`,
  `pull-requests`, each `read` or `write`. `read-all` and `write-all` grant everything;
  `{}`, `null` or any other string grants nothing. Output, one block per job that lacks
  any:

  ```
  permissions: <path relative to the root>, job <id>, does not grant <a>, <b>.
  ```

  with, when no `permissions` is stated anywhere, ` It states no permissions, so its token has the repository's default, which in a private repository set to read-only lacks actions: read.`
  appended to that line; then

  ```
  Add to that job, with every other permission its stage and deploy scripts need (a job that lists permissions has only those):
      permissions:
        actions: read
        contents: read
        pull-requests: read
  ```

  Exit 1 when any job lacks one. A file that does not parse prints
  `permissions: <path> is not valid YAML, so it was not read` and does not change the
  exit status by itself. With callers and no gap: `permissions: every workflow that calls
  the pipeline grants what it reads` (exit 0). With no caller:
  `permissions: no workflow in .github/workflows calls the pipeline` (exit 0). No
  `.github/workflows` directory is the same as no caller. `commandList()` gains, before
  `npm --prefix .tropis ci`:
  `# After taking a release, on GitHub. Says which workflow calling the pipeline withholds a permission it needs.`
  and `node .tropis/scripts/pipeline.mjs permissions`.
- **The release notes carry a required step** (Task 5), so a project on an older
  release, whose `/update` treats each numbered step under a *by hand* heading as
  required, is told before its first run fails.
- A decision record entry, FW-076 (or the next free number at rebase), amends FW-048.

---

## Delivers

passed-check-can-ask-the-host

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-passed-check -b plan/passed-check-can-ask-the-host origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`, nor
  `.github/workflows/tropis-*.yml`. The one file under `.github/` this plan changes is
  `.github/workflows/pipeline.yml`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; change an
  existing assertion only where this plan changes what it asserts.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Name the adopting project only as
  `first-adopter`, and quote none of its run ids, pull request numbers or files.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | the warning in `findPassed`/`passedCommand`; the `permissions` command and a pure exported function behind it; `commandList`; the CLI block |
| `guards/pipeline.test.js` | tests for the warning, for `permissions`, and the template and caller permissions |
| `templates/github/tropis-pipeline.yml` | `permissions` on `plan` and `host`, and one comment |
| `templates/pipeline-caller.yml` | `permissions` on `pipeline`, with a comment |
| `.github/workflows/pipeline.yml` | the same as the caller template |
| `templates/README.md` | the sentence on the token's access, in *The pipeline* |
| `framework/DECISIONS.md` | FW-076 appended; FW-048 gains an amendment line |
| `RELEASES.md` | a by-hand step under `## [Unreleased]` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session, at merge) |
| `docs/verification-log.md` | the pending manual check (the specifying session, at review) |
| `docs/superpowers/plans/2026-11-15-passed-check-can-ask-the-host.md` | this plan; the handover report |

## Task 1 — the warning

In `scripts/pipeline.mjs`, in `findPassed`, make each request carry the permission it
needs (for example a local `ask(path, permission)` that calls `askGitHub(['api', path])`
and, on error, returns `{ error, permission }`), and have `failed` return
`{ line, warning }` when it is given a permission. `warning` is the alert text decided
above with `<permission>` filled in. Errors that are not a refused request (missing
`workflow_id`, wrong shapes, no head commit) keep today's line and no warning.
`passedCommand` writes `line` then, when present, the warning (unprefixed) to stderr;
with `--summary` it appends `${line}\n\n` and then the alert, each line prefixed `> `,
starting `> [!WARNING]`, followed by a blank line. Update `findPassed`'s JSDoc.

Tests, in *passed*:

- The existing *never fails the run* test also asserts the summary contains
  `> [!WARNING]` and `` `actions: read` `` and `pipeline.mjs permissions`, and stderr
  contains `actions: read`.
- A refusal of only the `commits/<sha>/pulls` request (`--merged`, with the stub
  answering the run lookup and failing on `/pulls`: add a `STUB_FAIL_PULLS` variable to
  the stub, checked inside the `/pulls` case) names `pull-requests: read`, not
  `actions: read`.
- A wrong-shape answer and a missing variable write no `[!WARNING]` to the summary.
- A green lookup writes no `[!WARNING]`.

Revert the warning in `passedCommand` and check the new assertions go red; restore it.
Run the suite (Verification step 2).

## Task 2 — `pipeline.mjs permissions`

In `scripts/pipeline.mjs`:

1. Export a pure function `permissionGaps(workflows)` taking
   `[{ path, parsed }]` (parsed YAML, or `undefined` for a file that did not parse) and
   returning `{ unreadable: string[], callers: number, gaps: [{ path, job, missing: string[], stated: boolean }] }`
   by the rules decided above. JSDoc it.
2. A `permissionsCommand(root, args)` that reads the files, dynamically imports
   `./load-yaml.mjs`, calls `permissionGaps`, prints as decided, and returns the exit
   status. Wire it into the CLI block as `permissions`.
3. `commandList()` gains the two lines decided above.

Tests, a new `describe('permissions', …)` after *passed*:

- `permissionGaps` alone: a job with the three → no gap; a job with none stated →
  all three missing, `stated: false`; a job with `{ contents: read, 'pull-requests': read }`
  → `['actions']`, `stated: true`; workflow-level `read-all` with no job block → no gap;
  job `{}` overriding a workflow-level `read-all` → all three; `write` counts;
  `uses: ./.github/workflows/project-pipeline.yml` counts as a caller; a job using
  another workflow and a job with `runs-on` are ignored; an unparsed file goes to
  `unreadable`.
- The command in a temporary git repository (use the file's existing repository
  fixture): no `.github/workflows` → the no-caller line, exit 0; the caller template
  copied in → the all-grant line, exit 0; a caller with no `permissions` → exit 1, the
  line names the path, `job pipeline`, `actions: read` and the read-only sentence, and
  the block to add is printed; an invalid YAML file beside a good caller → its line,
  exit 0; an argument → exit 2.
- The command-list test that inspects lines (search *names every stage, in order*)
  still passes, with `permissions` listed.

Run the suite.

## Task 3 — the workflows

1. `templates/github/tropis-pipeline.yml`: on `plan`, after `runs-on`:

   ```yaml
       # The check for code that already passed reads this repository's runs and the pull
       # request a commit merged from. In a private repository that needs these grants,
       # and the workflow that calls this one must grant them too.
       permissions:
         actions: read
         contents: read
         pull-requests: read
   ```

   On `host`, after `runs-on`: `permissions:` with `contents: read`. No other job and no
   top-level block.
2. `templates/pipeline-caller.yml`: on the `pipeline` job, before `uses`:

   ```yaml
       # What the pipeline's token may do. The pipeline reads its own runs and pull
       # requests to skip code that already passed. A stage or deploy script that needs
       # more, such as packages: read or id-token: write, adds it here: a job that lists
       # permissions has only those.
       permissions:
         actions: read
         contents: read
         pull-requests: read
   ```

   The existing assertions on the caller (`on`, the `closed` comment, the ruleset's
   required check named after the first job) must still hold.
3. `.github/workflows/pipeline.yml`: make it equal to the new caller template.

Tests, in *GitHub workflow*: the template's `plan.permissions` equals the three, `host`'s
equals `{ contents: 'read' }`, the template has no top-level `permissions`, and no other
job has one; every permission any template job declares is granted (`read` or `write`)
by the caller template's `pipeline` job; `permissionGaps` on the caller template finds
no gap; `.github/workflows/pipeline.yml` equals `templates/pipeline-caller.yml` byte for
byte. Run the suite.

## Task 4 — the decision

Append to `framework/DECISIONS.md`, after the last entry, in the file's own entry shape
(read FW-074 and FW-075 for it):

- **FW-076: The pipeline's own jobs state their token's permissions, and the caller
  grants them.** Context: the check for code that already passed (FW-048) asks the host
  for runs; in a private repository the token's default does not include reading
  Actions, so the check was refused on every run in first-adopter and nothing was
  skipped, with a green run saying so only in a summary line; this repository was spared
  only because it is public. Decision: as decided above — job-level grants on `plan` and
  `host` only, the caller template grants the three, a refused lookup warns in the
  summary naming the permission, `pipeline.mjs permissions` tells a project what its
  caller withholds, and the release notes carry the step. Alternatives rejected: a
  workflow-level block (it would take from the stage and deploy jobs what the project's
  scripts need); declaring nothing and telling projects to change their repository's
  default (it widens every workflow's token, and nothing checks it); failing the run
  when the lookup is refused (FW-048 keeps the lookup from ever failing a run).
  Consequences: a project whose caller withholds a permission the template's jobs
  declare gets a run that fails at startup until it grants it, which makes the release
  breaking. Amends FW-048.
- Under FW-048, after its last line, add:
  `**Amended 2026-11-15** — the lookup's jobs state the permissions they need, and a refused lookup warns; FW-076.`

Use the next free number if FW-076 is taken when you rebase.

## Task 5 — the operator guide and the release notes

1. `templates/README.md`, *The pipeline*: replace the sentence "This needs the workflow
   token's default read access to actions and pull requests; without it nothing is
   skipped, and the plan job's summary says why." with:
   "This reads the repository's runs and pull requests, so the workflow that calls the
   pipeline grants `actions: read`, `contents: read` and `pull-requests: read`, as
   `.tropis/templates/pipeline-caller.yml` does; `node .tropis/scripts/pipeline.mjs
   permissions` says what yours withholds. Where the check cannot ask, nothing is
   skipped and the plan job's summary warns, naming the permission."
2. `RELEASES.md`, under `## [Unreleased]`, replace `_Nothing yet._` with:

   ```markdown
   ### What to do by hand

   **1. Let your pipeline read its own runs.** In a private repository the pipeline
   could not tell that a pull request's code had already passed, so every merge ran
   every stage again, and from this release the pipeline does not start at all until
   the workflow that calls it grants what it reads. Run
   `node .tropis/scripts/pipeline.mjs permissions` and, for each workflow it names, add
   the `permissions` block it prints to that job, keeping any permission your own stage
   and deploy scripts use. When it says every workflow grants what it reads, there is
   nothing to do.
   ```

   If another plan has already written under `## [Unreleased]`, add the heading only if
   it is absent and number the step after any steps already there.

## Task 6 — verification, then the handover report

1. `git diff --stat origin/main...HEAD` lists only the files in *File Structure*, less
   `feature-catalog.yaml` and `docs/verification-log.md`.
2. Run `guards/pipeline.test.js` from an export of `HEAD`, staged as
   `scripts/check-blueprint.sh` stages it (this repository's `AGENTS.md`, *To run one
   source guard alone*): commit, `git archive HEAD | tar -x -C <tmp>`, write
   `{"type":"module"}` to `<tmp>/package.json`, copy `templates/framework-jest.config.js`
   to `<tmp>/jest.config.js`, link a `node_modules` holding Jest (the one
   `scripts/check-blueprint.sh` installs into `.self-check/`, after running it once), and
   run `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/pipeline.test.js`.
3. `bash scripts/check-blueprint.sh` passes, on committed content.
4. `npm --prefix .tropis test` passes.
5. `node scripts/pipeline.mjs permissions` from the worktree prints the all-grant line
   and exits 0 (this repository's own caller).
6. Append to this plan a `## Handover report` with the subsections `### Task completion`,
   `### Verification results`, `### Scope`, `### Judgment calls`,
   `### What the plan got wrong` and `### Outstanding`, filled in; commit it, and push
   the branch. Stop. (The heading is not in the plan until then: the backlog guard reads
   a plan carrying it as executed.)

## Traps

- **`pipeline.mjs` must load without `node_modules`.** The plan job runs `plan` and
  `passed` before any install. A top-level `import YAML` breaks every run; load it with
  `await import('./load-yaml.mjs')` inside `permissions` only, and keep a test running
  some other command from a fixture without `node_modules` green (the existing ones do).
- **stdout of `passed` is captured as the commit.** The warning goes to stderr and the
  summary, never to stdout.
- **Do not add `permissions` to any job that runs a project script**, nor at workflow
  level: it would silently take away what the project's scripts use.
- **The caller template's first job id names the required check** (`pipeline / gate`);
  keep the job id `pipeline`.
- **`.github/workflows/tropis-pipeline.yml` is the installed release.** Leave it; it
  changes only when a release is installed. Granting more in this repository's caller
  than the installed template declares is harmless.

