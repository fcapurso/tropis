# The release job checks the commit it tags — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the release job in `.github/workflows/ci.yml` runs `bash scripts/check-blueprint.sh`
on the commit that promotes `RELEASES.md` — the commit it tags — after committing and before
tagging and pushing. When the check fails, the job fails and pushes nothing; when it passes,
the job tags and pushes the commit and the tag together, as today. A guard runs the job's
own steps in a scratch repository and shows both outcomes.

**Spec:** the entry `release-job-checks-the-commit-it-tags` in `feature-catalog.yaml`, its
three criteria and the comment above it. *Decisions* below settles what the entry leaves
open. Do not reopen them.

**What the specifying session verified on 2026-10-27, against `main` at `c9c0499`, with
git 2.43.0 and Node v22.22.0 in a Claude Code cloud session (Linux 6.18, x86_64):**

- `.github/workflows/ci.yml` has two jobs. `self-check` checks out with `fetch-depth: 0`,
  sets up Node 22 and runs `bash scripts/check-blueprint.sh`. `release` (`needs:
  self-check`, `if: github.event_name == 'workflow_dispatch'`, `permissions: contents:
  write`) has these steps, in order: `Releases are cut from main only` (with an `if:`),
  `actions/checkout@v7` (`fetch-depth: 0`), `actions/setup-node@v7` (Node 22),
  `Work out the version` (`id: version`), and `Promote the notes, commit, tag, push`, whose
  `run` promotes `RELEASES.md` with `node .github/scripts/release.mjs promote RELEASES.md
  "$VERSION" "$(date -u +%F)"`, sets `user.name` and `user.email` with `git config`, runs
  `git commit -am "chore(release): v$VERSION" -m "…"`, `git tag -a "v$VERSION" -m "Release
  v$VERSION"` and `git push --atomic origin HEAD:main "v$VERSION"`. Nothing runs the
  self-check between the commit and the push. The file's opening comment says "this job
  runs the self-check again on the commit it releases", which is not what it does.
- `git config` without `--global` writes the repository's own `.git/config`, so the
  identity set in one step holds for `git tag -a` in a later step of the same job.
- `bash scripts/check-blueprint.sh` checks `HEAD` as committed (it stages `git archive
  HEAD`), needs the tag `v0.1.0` (present with `fetch-depth: 0`) and installs its test tools
  into `.self-check/`, which `.gitignore` lists, so it leaves the tree clean.
- Promoting this repository's current `RELEASES.md` (with a line `Checked on the release
  candidate: no` added to its Unreleased section, as `/release` writes one) under `0.5.0`
  and committing gave a commit on which `bash scripts/check-blueprint.sh` ended `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.` and exited 0. So the new step passes on a normal
  release.
- `.github/scripts/release.mjs promote <file> <version> <date>` rewrites the notes in place
  and exits non-zero on notes it refuses. `guards/release.test.js` holds a notes fixture it
  accepts (`head`, `unreleased`) and already imports from `../.github/scripts/release.mjs`.
  `guards/pipeline.test.js` imports `YAML from 'yaml'`, which the guards' test tools
  provide.
- No guard reads `.github/workflows/ci.yml` today. `framework-integrity` scans framework
  documents only, and this plan changes none.
- GitHub Actions runs a `run:` step with `bash -e {0}` by default on Linux runners, and
  skips every later step once one fails unless that step has an `if:` such as `always()`
  or the failing step has `continue-on-error`.

**Model tier: Medium.** The workflow text is given verbatim; the guard runs the job's steps
in a scratch repository and needs care.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** The job runs only when the developer cuts a release,
so a mistake in it shows only then, and on `main`.

Do not store a kick-off prompt on this plan.

---

## Delivers

release-job-checks-the-commit-it-tags

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-release-check -b plan/release-job-checks-the-commit-it-tags` |

## Global Constraints

- **Edit only `.github/workflows/ci.yml` under `.github/`.** Do not edit `.claude/`,
  `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md`, `.github/scripts/` or the other
  workflows.
- **Never trigger the release job.** Only the developer starts it.
- **Add no dependency.** Use `node:` modules and `yaml`.
- **Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Do not merge.

## Decisions

Taken by the specifying session on 2026-10-27.

### 1. Check before the tag, in a step of its own

The job commits, then runs the self-check as its own step, then tags and pushes. The tag
is made only once the commit has passed, and a failed check fails the job at a step whose
name says what failed. The `self-check` job stays: it stops a release from a red `main`
before anything is promoted.

**Rejected:** checking after the tag (a tag on a failed commit would sit in the runner,
harmless but pointless); dropping the `self-check` job (a red `main` would then be found
only after the notes were promoted).

### 2. The workflow text

Replace the step `Promote the notes, commit, tag, push` with these three steps, at the
same indentation:

```yaml
      - name: Promote the notes and commit
        env:
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          node .github/scripts/release.mjs promote RELEASES.md "$VERSION" "$(date -u +%F)"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -am "chore(release): v$VERSION" \
            -m "Promotes the release notes under $VERSION and tags the commit, so a project can be set up from this release."
      # The commit that is tagged, checked before anything is pushed: a failure here ends
      # the job, and neither the commit nor the tag leaves the runner.
      - name: Self-check the release commit
        run: bash scripts/check-blueprint.sh
      - name: Tag and push
        env:
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          git tag -a "v$VERSION" -m "Release v$VERSION"
          git push --atomic origin HEAD:main "v$VERSION"
```

Replace the file's opening comment with:

```yaml
# The release job. Pull requests and pushes to main run through pipeline.yml,
# whose unit stage is the self-check. Here the self-check runs on the commit the
# release starts from, and again on the commit that promotes the notes, before that
# commit is tagged or pushed. It is started by hand, on main, by the developer —
# never by an agent:
#   gh workflow run ci.yml --ref main -f bump=<patch|minor|major>
```

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **The guard runs the job's own `run:` text, taken from `ci.yml`**, never a copy of it. A
  test that runs its own copy passes with the workflow unchanged.
- **The guard never runs the real self-check or pushes anywhere real.** Its scratch
  repository holds a stub `scripts/check-blueprint.sh`, and its `origin` is a bare
  repository in the same temporary folder.
- **A guard must not run git against the tree under test.** The self-check's export has no
  `.git`. Every git command in the new tests runs in a repository the test created.

## File Structure

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | Decision 2 |
| `guards/release.test.js` | Task 1 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-27-release-job-checks-the-commit-it-tags.md` | the handover report |

## Review Focus

Each line is pinned by a test in Task 1. Review breaks each and expects red.

1. In the release job, the step running `bash scripts/check-blueprint.sh` comes after the
   step that runs `git commit` and before every step that runs `git tag` or `git push`,
   and no step from the commit on has an `if:` or `continue-on-error`.
2. Run in a scratch repository with a check that fails, the job's steps stop at the check,
   and the bare `origin` has neither a new commit on `main` nor the tag.
3. With a check that passes, the check ran on the promoted commit, and `origin` has that
   commit on `main` and the tag on it.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`git fetch --tags origin` and `bash scripts/check-blueprint.sh` (expected: its last line
starts `Self-check passed`).

To run one guard file alone: the source tree has no root `package.json`, so put a
temporary `{"type":"module"}` `package.json` and a `node_modules` link to
`.tropis/node_modules` at the worktree root, and run
`node --experimental-vm-modules .tropis/node_modules/.bin/jest guards/release.test.js`.
Remove the two temporary files before every commit.

### Task 1 — Tests first, then the workflow

In `guards/release.test.js`, add `describe('the release job')`. It parses
`../.github/workflows/ci.yml` (relative to the test file) with `YAML.parse` and takes
`jobs.release.steps`. Name the steps it runs as "the steps after the one with
`id: version`".

- `checks the commit it tags before tagging or pushing`: the index of the step whose
  `run`, trimmed, is `bash scripts/check-blueprint.sh` is greater than the index of the
  step whose `run` contains `git commit`, and less than the index of every step whose
  `run` contains `git tag` or `git push`. No step from the commit step on has `if` or
  `continue-on-error`, and the job has no `continue-on-error`.
- A helper builds the scratch world in a fresh `mkdtempSync` folder under `os.tmpdir()`,
  removed afterwards: a bare repository `origin.git`; a repository `work` on branch `main`
  with `RELEASES.md` (the file's `head` and `unreleased` fixtures, then `\n---\n`),
  `.github/scripts/release.mjs` copied from this tree, and an executable
  `scripts/check-blueprint.sh` stub that writes `git rev-parse HEAD` to `<folder>/checked`
  and then exits with the code the test chooses; committed (with
  `-c user.name=t -c user.email=t@t`), `origin` added and `main` pushed. It runs each step
  after `id: version` that has a `run`, in order, with
  `spawnSync('bash', ['-e', '-c', step.run], { cwd: work, encoding: 'utf8', env: { ...process.env, VERSION: '0.2.0' } })`,
  stopping at the first non-zero exit, and returns which step stopped it. It first asserts
  every such step's `env` names nothing but `VERSION`, so the scratch run supplies all of
  it.
- `pushes nothing when the check of the release commit fails`: stub exits 1. Expect the run
  to stop at the check step; `git -C origin.git rev-parse main` unchanged; `git -C
  origin.git tag --list v0.2.0` empty; and `<folder>/checked` equal to the work repository's
  `HEAD`, whose subject is `chore(release): v0.2.0`.
- `pushes the checked commit and its tag together when the check passes`: stub exits 0.
  Expect every step to exit 0; `origin.git`'s `main` equal to the commit in
  `<folder>/checked`, whose subject is `chore(release): v0.2.0`; and `git -C origin.git
  rev-parse v0.2.0^{commit}` equal to it too.

Run them against the current workflow and record how each fails (all three must: there is
no check step, so nothing stops the push and the stub never writes `checked`). Then apply
Decision 2. Run the file until it passes. Commit.

### Task 2 — Verification

Commit, then run `bash scripts/check-blueprint.sh` (expected last line:
`Self-check passed: …`) and `npm --prefix .tropis test`. Record both outputs.

Make each Review Focus line fail in a throwaway commit and run the self-check; drop the
commit after each. At least: move the check step after `Tag and push` (lines 1 and 2), add
`continue-on-error: true` to the check step (line 1), and put the check step before
`Promote the notes and commit` (lines 1 and 3). Record the failing test names.

No fresh-agent check: the plan changes no file under `framework/` or `rules/`, and no
command.

### Task 3 — Catalog

In `feature-catalog.yaml`, set `release-job-checks-the-commit-it-tags` to `shipped`, set
`modules` to `.github/workflows/ci.yml`, and add to the comment above the entry a line
naming this plan's handover. Map each criterion to its backing:

| Criterion | Backed by |
|---|---|
| 1 the self-check runs on the promoted commit before any push | the order test, and `checked` in both run tests |
| 2 a failed check pushes neither the commit nor the tag | the failing-check test |
| 3 a passed check pushes the commit and the tag together | the passing-check test |

If a criterion has no backing, leave the entry at `shaped` and say so. Commit.

### Task 4 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Under *Outstanding*, name the first real release as the moment the job is seen on GitHub
for the first time. Commit it, push the branch, and open a pull request against `main`.
Do not merge.

## Not in this plan

- No `/manual-check`: nothing here has a screen. The job runs on GitHub only when the
  developer cuts a release; the guard runs its own steps instead.
- `framework/workflow.md`, *Optional — release*, already requires a project's pipeline to
  run the full suite as a gate; this plan brings this repository's own job in line and
  changes no framework text.
- `RELEASES.md`: `/release` drafts the notes from the backlog.

## Handover report

### Task completion

- **Task 0** — done. `npm --prefix .tropis ci` installed; `git status --porcelain` printed
  nothing; `git fetch --tags origin`; `bash scripts/check-blueprint.sh` ended `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`
- **Task 1** — done. `describe('the release job')` added to `guards/release.test.js` with
  the three tests; run against the unchanged workflow, all three failed (below). Decision 2
  applied verbatim (the three steps and the opening comment). The file then passed, 47 of
  47. Committed as `388f58b`.
- **Task 2** — done. Outputs and mutations below.
- **Task 3** — done. Entry at `shipped`, `modules: [.github/workflows/ci.yml]`, a
  `# Handover report:` line added to its comment. Every criterion has a backing (table
  below). Committed as `f2d7b9a`.
- **Task 4** — this report; branch pushed, pull request opened, not merged.

### Verification results

Against the workflow before Decision 2
(`node --experimental-vm-modules .tropis/node_modules/.bin/jest guards/release.test.js -t 'the release job'`):

- `checks the commit it tags before tagging or pushing` — `expect(checkStep).toBeGreaterThan(commit)`: Expected `> 0`, Received `-1` (no check step).
- `pushes nothing when the check of the release commit fails` — `expect(r.originMain).toBe(r.start)`: Expected `26b8d93…`, Received `4a98e07…` — `origin`'s `main` moved, so the release commit was pushed although the stub check would fail.
- `pushes the checked commit and its tag together when the check passes` — `expect(r.checked).not.toBeNull()`: Received `null` (the stub never ran).

After Decision 2: `Tests: 47 passed, 47 total` for the file.

On the committed branch:

- `bash scripts/check-blueprint.sh` — exit 0, last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test` — `Test Suites: 5 passed, 5 total`, `Tests: 31 passed, 31 total`.

Review Focus mutations, each a throwaway commit run under `bash scripts/check-blueprint.sh`
and dropped with `git reset --hard HEAD~1`. Each run exited 1 with `Self-check FAILED:
conformance or the clean baseline (above).`, failing these tests:

| Mutation | Lines | Failing tests |
|---|---|---|
| check step moved after `Tag and push` | 1, 2 | `checks the commit it tags before tagging or pushing`; `pushes nothing when the check of the release commit fails` |
| `continue-on-error: true` on the check step | 1 | `checks the commit it tags before tagging or pushing` |
| check step before `Promote the notes and commit` | 1, 3 | `checks the commit it tags before tagging or pushing`; `pushes nothing when the check of the release commit fails`; `pushes the checked commit and its tag together when the check passes` |

Criteria and their backing:

| Criterion | Backed by |
|---|---|
| 1 the self-check runs on the promoted commit before any push | `checks the commit it tags before tagging or pushing`, and `checked` equal to the `chore(release): v0.2.0` commit in both run tests |
| 2 a failed check pushes neither the commit nor the tag | `pushes nothing when the check of the release commit fails` |
| 3 a passed check pushes the commit and the tag together | `pushes the checked commit and its tag together when the check passes` |

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 .github/workflows/ci.yml |  16 +++++--
 feature-catalog.yaml     |   6 ++-
 guards/release.test.js   | 121 ++++++++++++++++++++++++++++++++++++++++++++++-
 3 files changed, 137 insertions(+), 6 deletions(-)
```

plus this plan file. All four are in the File Structure table. Worktree used:
`/home/user/tropis-release-check` on `plan/release-job-checks-the-commit-it-tags`, made by
`isolate-for-plan.sh`. The base is `origin/main` at `b3cfb32`, one commit past `177d869`
(`docs(readme)`, README only); nothing of it is in this diff.

### Judgment calls

- In the failing-check test, the `origin` assertions come before `stoppedAt`, so against a
  workflow without the check the test reports that the release commit reached `origin`,
  not only that no check step exists.
- The `env`-names-only-`VERSION` assertion runs inside the helper, before any step, as the
  plan says; the step order test also asserts that some step runs `git tag` or `git push`,
  so it cannot pass on a job that lost them.
- The catalog comment line uses the form other shipped entries use:
  `# Handover report: <plan path>`.
- The cloud session can push only to its designated branch, so the branch is pushed as
  `claude/wizardly-heisenberg-r0oz4h` (same commits as
  `plan/release-job-checks-the-commit-it-tags`) and the pull request comes from it.

### What the plan got wrong

Nothing untrue found. One wording note: the self-check reports a guard failure from the
framework repository's own guards under "conformance or the clean baseline", so a red
mutation run names the failing test inside that block rather than on its last line.

### Outstanding

- The job has not run on GitHub. The first real release, started by the developer, is the
  first time the new steps are seen there — in particular that `Self-check the release
  commit` passes on the runner after the promotion commit and that `Tag and push` uses
  the identity set in the earlier step.
- Merge is the specifying session's (parent review).

## Review record

Reviewed 2026-10-27 by the specifying session (Claude Code desktop, macOS), on the branch
as pushed, with `origin/main` at `eea3537`, which carries `update-keeps-the-package-name`.

### Checks re-run

- Read the diff against the plan: the three workflow steps and the opening comment are
  Decision 2 verbatim; the guard reads the job's own `run:` text from `ci.yml` and runs it
  in a scratch repository with a stub check and a bare `origin`, as *Traps* requires.
- Scope: `git diff --stat origin/main...HEAD` is `.github/workflows/ci.yml`,
  `feature-catalog.yaml`, `guards/release.test.js` and this plan file, all in the File
  Structure table. Nothing on `main` since the base touches any of them, and the branch
  merges into it without conflict.
- The executor's mutation runs (handover) show each Review Focus line going red. Not
  repeated here.
- CI on https://github.com/fcapurso/tropis/pull/134, run on the branch merged with current
  `main`, is checked green before the merge.

### Found

Nothing beyond the handover.

### Outstanding disposition

The job has not run on GitHub; the next release the developer starts is its first run.
Nothing else can stand in for that without pushing a release. No developer check by hand
otherwise: the change has no screen.

### Learnings routed

None generalises beyond this plan. The requirement it brings this repository in line with
is already in the workflow's release section.

### Merged because

The check now runs on the commit that is tagged, before anything leaves the runner, and a
guard that runs the job's own steps shows that a failing check pushes nothing and a
passing one pushes the commit and its tag together.
