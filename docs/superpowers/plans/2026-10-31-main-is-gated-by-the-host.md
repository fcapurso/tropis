# A project's main branch is gated by its host, or the project has said why not — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 1 can stop the plan and hand back to the
> specifying session (its last step says when); nothing else stops for the developer.

**Goal:** Tropis ships a GitHub ruleset for the default branch and the one command that
applies it; the pipeline's new `host` job fails on every run until the default branch
requires a pull request and a check and the repository allows auto-merge, or
`.claude/project.json` records why the project is `ungated`; the gate job turns red
when it holds the deploy, so the required check means the run passed; setup and
`/update` ask the developer to choose; the workflow, the commands that commit on `main`
and the commit hook send every change through a pull request that merges itself where
the main branch is gated; and this repository's release tags what `main` already holds
and pushes only the tag.

**Spec:** the entry `main-is-gated-by-the-host` in `feature-catalog.yaml` and the comment
above it. Its band and verdict are in `docs/backlog-board/bands.yaml` (band A, bundle
`main-stays-green`: "Prevention the host already offers, and the condition for turning
it on here. Do it now, before a-failing-push-is-visible."). There is no design document;
the decisions below, taken with the developer on 2026-10-31, are the design. Two
neighbouring entries are **not** this plan: `release-tags-what-main-holds` (an adopter's
release pipeline — adopters keep FW-030 until it ships) and `a-failing-push-is-visible`
(the sibling plan `docs/superpowers/plans/2026-10-31-a-failing-push-is-visible.md`,
written in parallel, which runs after this one). The last plan written and executed here,
`docs/superpowers/plans/2026-10-31-branch-slot-never-touches-a-permanent-environment.md`,
was read for its handover and review record; what it got wrong is in *Traps*.

**What the specifying session verified on 2026-10-31, against `dd165ba` (the branch
carrying the catalog entry), with git 2.43.0, Node v22.23.4, gh 2.89.0 (not signed in)
and curl, in a Claude Code cloud session on Linux, x86_64:**

- **No existing job means "the run passed".** `gateCommand` in `scripts/pipeline.mjs`
  (around line 813) writes the summary and `deploy=<decision>` and **always returns 0**,
  so the `gate` job is green when a stage failed and the deploy is `held`. The `plan`
  job always runs but says nothing about the stages. When the `plan` job fails, every
  stage job is skipped, the gate reads an empty plan, `stagesThatDidNotPass` finds
  nothing (`plan[stage]` is undefined), and the gate is green again. GitHub reports a
  job skipped by its condition as a success for a required check, so requiring the
  stage jobs instead would pass a run whose plan failed. Hence *Decision 3*.
- **The required check's name is `pipeline / gate`.** The caller
  `templates/pipeline-caller.yml` calls the reusable workflow from a job with id
  `pipeline` and no `name`; the reusable workflow's job id is `gate` with no `name`.
  GitHub names a reusable workflow's check runs `<caller job> / <called job>`. Confirmed
  on this repository, whose `.github/workflows/pipeline.yml` is the same caller: the
  check runs on `main`'s head (`GET repos/fcapurso/tropis/commits/main/check-runs`,
  unauthenticated) are named `pipeline / plan`, `pipeline / framework / checks`,
  `pipeline / sanity`, `pipeline / unit`, `pipeline / integration`,
  `pipeline / end-to-end`, `pipeline / branch-create`, `pipeline / gate`,
  `pipeline / deploy` and `pipeline / branch-remove`.
- **What GitHub answers, unauthenticated, for this public repository:**
  `GET repos/fcapurso/tropis` carries `"default_branch": "main"`,
  `"allow_auto_merge": false`, `"delete_branch_on_merge": false`;
  `GET repos/fcapurso/tropis/rules/branches/main` returns
  `[{"type":"deletion",…},{"type":"non_fast_forward",…}]` (each also carrying
  `ruleset_source_type`, `ruleset_source`, `ruleset_id`); and the same endpoint for a
  branch with no rules returns `[]`. The rules endpoint reads **rulesets only**: a
  classic branch protection rule is not in its answer, and the pull-request requirement
  of a classic rule is readable only by administrators.
- **`gh pr merge --auto` deletes no branch.** In gh v2.89.0's
  `pkg/cmd/pr/merge/merge.go`, `deleteLocalBranch` returns at once when auto-merge was
  enabled, and `deleteRemoteBranch` does nothing when `m.autoMerge` is set; auto-merge
  counts as enabled only when the pull request is not immediately mergeable. So with
  `--auto`, `--delete-branch` acts only when gh merged on the spot. The repository
  setting *Automatically delete head branches* deletes the remote branch on any merge.
- `scripts/set-up-project.sh` copies `templates/github/*.yml` into
  `.github/workflows/` (line 69) — a `.json` there is not copied by that glob — and
  copies templates a project reaches into `.tropis/templates/` (lines 78–80).
  `guards/set-up-project.test.js` lists every installed path (lines 95–131).
  `scripts/take-version.mjs` builds the next release by running `set-up-project.sh`
  into a scratch directory, so a file the setup installs reaches an update with no
  other change, and the take's report lists it under `Added:`.
- `guards/framework-integrity.test.js` checks backticked paths under `src/`, `docs/`,
  `scripts/`, `.claude/` and `.github/` in `.claude/rules/`, `.claude/framework/`,
  `.claude/commands/` and `AGENTS.md`. `.claude/project.json` is already exempt;
  `.tropis/…` paths are not scanned. No exemption is needed for anything this plan
  names.
- `guards/pipeline.test.js`, `describe('GitHub workflow')`: the first test pins the job
  list of `templates/github/tropis-pipeline.yml` (around line 1325); the second test
  ends (lines 1420–1430) with a byte comparison of that template against
  `git show main:templates/github/tropis-pipeline.yml`, run only in a checkout. It was
  written for `docs/superpowers/plans/2026-10-26-release-is-rehearsed-on-a-candidate.md`,
  whose criterion was that the candidate left the pipeline template unchanged (that
  plan, line 486). Any change to the template fails it in a worktree.
  `describe('run, gate and commands')` holds the gate tests (lines 1217–1290); the
  first two assert `result.status` 0 for a held deploy.
- `runPipeline(root, args, { env, input })` in `guards/pipeline.test.js` merges `env`
  over `process.env`. The self-check runs in GitHub Actions on every pull request, where
  `GITHUB_ACTIONS=true` is inherited.
- `guards/rule-delivery.test.js` runs the hooks as installed (`.tropis/hooks/…` under
  `FRAMEWORK_ROOT`, which `scripts/check-conformance.sh` points at a composed project);
  it cannot be run from the worktree directly. Its `describe('framework-commit-check
  fires when a commit carries the instruction layer')` (lines 246–444) has four
  "stays silent on main for …" tests (docs, release notes, README, backlog) and one
  "names a file outside the may-go-to-main paths" test expecting `belong on a branch`.
- `scripts/framework-commit-check.sh`: the project-owned block (lines 25–31) holds
  `may_go_to_main`; outside it, on `main`, files not matching it are named, with the
  message at lines 128–138 restating the direct-to-main list.
- `framework/workflow.md` is identical to `.claude/framework/workflow.md`. Branching:
  the direct-to-main bullet (lines 105–111), the CI-filter bullet (112–122), *Say
  whether anything enforces this* (123–129), the release-pipeline bullet (130–133).
  Preflight ends with "Push `main` before dispatching…" (line 190). *Merge and clean up*
  (202–229) includes the sentence guarded by `guards/release.test.js`: "Where the host
  marks no check as required, its auto-merge merges at once."
- Commands that commit or push on `main`: `commands/release.md` Stage 1b ("push it
  (`git push origin main`)", line 59) and Stage 5 ("Commit with … and push", around
  line 196), and Stage 6 names "the commit Stage 5 pushed" (line 212);
  `commands/refresh-board.md` step 6 ("Directly on `main` … no branch is needed",
  around line 99). `/idea`, `/refresh-readme` and `/refresh-model-tiers` commit but
  name no branch and do not push; the workflow's rule covers them.
- This repository's release: `.github/workflows/ci.yml` (a `self-check` job and a
  `release` job, started with `-f bump=…`) works out the version, promotes the notes,
  commits, self-checks that commit, then `git push --atomic origin HEAD:main "v$VERSION"`.
  `.github/scripts/release.mjs` exports `nextVersion` and `promote`.
  `guards/release.test.js`, `describe('the release job')` (lines 93–201), reads
  `jobs.release` and runs its steps after `id: version` in a scratch repository. The
  shipped catalog entry `release-job-checks-the-commit-it-tags` (around line 2945 of
  `feature-catalog.yaml`) has a third criterion, "pushes the commit and its tag
  together", which this plan supersedes. This repository's own `/release` settings are
  the project-owned block of `.claude/commands/release.md` (its trigger is
  `gh workflow run ci.yml --ref main -f bump=<bump>`); the installed-files fingerprint
  removes a block's inner lines, so editing them is not a change to the installed
  release.
- `framework/DECISIONS.md` ends with FW-036. The sibling plan may add a decision too.

**Model tier: Large.** Twenty-two files, a new pipeline command, a behaviour change to the
gate and to a hook, prose in six instruction documents, a probe of an external API that
can stop the plan, and a fresh-agent check. Most target text is given verbatim, but
fitting the prose edits to the surrounding paragraphs and keeping every restatement
consistent is judgment.

**Requires:** network access to GitHub's public API and documentation for Task 1; nothing else beyond the repository.

**Merge authority: parent review.** It changes how every project merges and what every
project's pipeline reports, and the review must re-read the instruction prose. The
executor stops after the handover report and the pull request (Task 11); the
specifying session reviews, writes the review record and merges.

Do not store a kick-off prompt on this plan.

---

## Delivers

main-is-gated-by-the-host

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-gate -b plan/main-is-gated-by-the-host` |

## Global Constraints

- **Do not edit `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`, nor anything
  under `.claude/` except the project-owned block of `.claude/commands/release.md`**
  (Task 10, between its `project-owned: begin` and `project-owned: end` lines, the
  marker lines themselves unchanged). They are the installed release. `AGENTS.md`'s
  note *What GitHub enforces here* is updated by the specifying session after the
  developer applies the ruleset, not by this plan.
- **Never apply the ruleset, and never change a repository setting.** Do not run
  `gh api … rulesets -X POST`, and do not turn on auto-merge or branch deletion
  anywhere. That is the developer's, after merge (*Outstanding*).
- **No test reaches the network.** Every test of the `host` command runs against a stub
  `gh` first on `PATH`, as `guards/submit-upstream.test.js` does.
- **Add no dependency. Do not lower, skip or delete a guard**, except the one
  assertion *Decision 3* names. Every commit has a body.
- **Do not touch `docs/superpowers/plans/2026-10-31-a-failing-push-is-visible.md`**
  or `docs/backlog-board/bands.yaml`.
- **Push only to this plan's branch. Do not merge.**
- **This repository is public.** No hostnames, home paths, email addresses or personal
  names in anything you commit, the handover included. Name the worktree as
  `../tropis-gate`, not by an absolute path.

## Decisions

Taken with the developer on 2026-10-31, and by the specifying session where it says so.

### 1. Prevention is the host's: the ruleset Tropis ships

Create `templates/github/main-branch-ruleset.json` with exactly this content:

```json
{
  "name": "Tropis: the main branch takes green pull requests only",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "pipeline / gate" }]
      }
    }
  ]
}
```

No approvals, because an agent and a solo developer must be able to merge. No bypass
actor at all. `~DEFAULT_BRANCH` targets whatever the default branch is called. No
`integration_id` on the check: the context alone is what the caller's job produces. If
Task 1 finds GitHub's documentation for *Create a repository ruleset* requires a field
this file lacks, add it with the least restrictive value and record it under *Judgment
calls*; change nothing else in the file.

`scripts/set-up-project.sh` installs it as `.tropis/templates/main-branch-ruleset.json`
(append it to the `cp` on line 79, beside the two caller templates). The one command
that applies it, run by the developer from the project root:

```
gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json
```

with, beside it, two repository settings under **Settings → General → Pull Requests**:
*Allow auto-merge* (the check reads it) and *Automatically delete head branches*
(recommended, not checked: with auto-merge, `gh` deletes no branch).

### 2. The `host` command and job

A new subcommand, `node .tropis/scripts/pipeline.mjs host [--summary <file>]`, in
`scripts/pipeline.mjs`, run by its own job in `templates/github/tropis-pipeline.yml`.

**Why its own job (specifying session's choice).** Any job has `github.token` and
`GITHUB_REPOSITORY`, so the question is what a red answer must not do. In the `plan`
job it would skip every stage, so a project that has not chosen yet would get no test
results; inside the gate or the framework stage it would hold the deploy on the main
branch. Its own job with no `needs` makes the run red on every event without holding a
stage or a deploy. It is not the required check: where the ruleset is missing there is
nothing for it to require, and where only auto-merge is off, holding merges is not its
job.

The job, placed directly after `plan` in the file:

```yaml
  # Whether the main branch is gated by the host, or the project has said why not.
  # Its own job: a red answer shows on every run without holding a stage or a deploy.
  host:
    if: ${{ github.event.action != 'closed' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
      - run: node .tropis/scripts/pipeline.mjs host --summary "$GITHUB_STEP_SUMMARY"
        env:
          GH_TOKEN: ${{ github.token }}
```

Add a `permissions:` block only if Task 1 finds one is needed, naming only what it
found.

**Behaviour, in this order:**

1. Any argument other than none or `--summary <file>`: stderr
   `host: the only argument is --summary <file>`, exit 2.
2. `GITHUB_ACTIONS` is not `true`: stdout, one line, exit 0, nothing else read:
   `host: whether the main branch is gated is read from GitHub, in the pipeline; nothing to check here.`
3. `.claude/project.json` at the project root (`projectRoot()`): absent, unreadable, not
   JSON, not an object, or without the key `ungated` → no reason recorded. `ungated`
   present but not a string with something other than whitespace → stderr
   `host: "ungated" in .claude/project.json must say why the main branch is not gated, in words.`,
   exit 1. A reason (trimmed) → stdout
   `host: the main branch is not gated — <reason> (.claude/project.json)`, append to
   the summary file, if given, `**The main branch is not gated.** <reason> — recorded in .claude/project.json.` followed by a newline, exit 0. **GitHub is not asked.**
4. `GITHUB_REPOSITORY` empty: stderr `host: GITHUB_REPOSITORY is not set`, exit 1.
5. Ask GitHub, through `gh`, with these exact arguments:
   `gh api repos/<repo>` — read `default_branch` and `allow_auto_merge`; then
   `gh api repos/<repo>/rules/branches/<encodeURIComponent(default_branch)>?per_page=100`
   — an array. `gh` missing, a non-zero exit, or output that is not the expected JSON
   (an object with a string `default_branch`; an array) → the failure text below with
   the gap line `could not ask GitHub (<the gh arguments>): <first non-empty stderr line, or the parse error>`.
6. Gaps, in this order: no rule of type `pull_request` → `no pull request is required`;
   no rule of type `required_status_checks` → `no check is required` (**any** required
   check counts, whatever its name, so a project that renamed its job is not punished;
   do not read the rule's parameters); `allow_auto_merge` is `false` →
   `auto-merge is not allowed`; `allow_auto_merge` not a boolean →
   `GitHub did not say whether auto-merge is allowed`.
7. No gaps: stdout
   `host: <branch> requires a pull request and a passing check, and auto-merge is allowed.`,
   the same line appended to the summary, exit 0.
8. Gaps (or a failure to ask): the text below to stderr and appended to the summary,
   exit 1. It does **not** try to tell "the account's plan does not allow it" from "it
   is off": one message covers both.

```
host: the main branch <branch> is not gated: <gaps joined with "; ">.
Only rulesets are read: a classic branch protection rule does not count.
If your plan allows it (a public repository, or a private one on GitHub Pro, Team or Enterprise), apply the ruleset Tropis ships:
  gh api repos/<repo>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json
and turn on Settings → General → Pull Requests → Allow auto-merge.
Otherwise record why in .claude/project.json, as "ungated": "<the reason>".
```

When the repository could not be read there is no branch name, so the first line reads
`host: the main branch is not gated: could not ask GitHub (…): ….`

Export two pure functions for the tests and keep the command thin:
`ungatedReason(root)` → `{ reason: string | null } | { error: string }`, and
`gateGaps(repository, rules)` → `string[]` (step 6). Add the command to the
dispatch block at the bottom of the file, after `environment`, resolving the root as
`environment` does. Do not add it to `commandList()`: it reads GitHub, and that list is
for other hosts.

### 3. The gate job is red when it holds the deploy

So that `pipeline / gate` means "this run passed", `gateCommand` changes in two places,
and nothing else about the gate changes — its decision, its stdout line and its summary
table are as before:

- **No plan.** If any of the six stages has no line in the plan read from stdin (the
  `plan` job failed, so its output is empty), write
  `gate: no plan — the plan job did not finish, so this run cannot pass.` to stderr and,
  when `--summary` was given, append it to that file; exit 1. Print no `deploy=` line.
- **Held.** After writing the summary and `deploy=<decision>` as today, return 1 when
  the decision is `held`, 0 otherwise.

Update `gateCommand`'s doc comment to say so. In the workflow, the gate step's
`decision=$(… gate …)` then fails the step under the runner's default `bash -e`, so the
`deploy` output is never written and the deploy is skipped — as it already was for a
held deploy. Add one comment line above the gate step's `run:` saying the gate exits 1
when it holds the deploy, so the job is the run's required check.

Tests change accordingly (Task 3). **The one guard assertion this plan deletes** is the
byte comparison at the end of the second `describe('GitHub workflow')` test (the
`// The self-check runs this guard from an archive…` comment and the `if (top.status
=== 0 …) { … }` block that follows it): it pinned the template to `main` for the
candidate plan's criterion, and fails in every worktree that changes the template.
Keep every other assertion in that test.

### 4. The commit hook speaks at every commit on a gated `main`

In `scripts/framework-commit-check.sh`, outside the project-owned block:

- After `branch=…`, read whether `.claude/project.json` at the repository root
  (`git rev-parse --show-toplevel`; no root → not recorded) holds `ungated` as a string
  with something other than whitespace, with a `python3 -c` reader shaped like
  `public-exposure-check.sh`'s (lines 50–58): any failure prints `no`.
- On `main` with no reason recorded, `elsewhere` is every changed path outside the
  instruction layer and commands — the `may_go_to_main` filter does not apply — and its
  message (replacing the `What may go directly to main …` paragraph in that case only) is:

```
This project's main branch is gated: .claude/project.json records no "ungated", so
nothing reaches main except through a pull request (workflow.md, Branching). Commit on
a branch, push it, open a pull request, and run gh pr merge <N> --auto --squash with
--subject and --body; it merges itself once its checks pass.
```

  The first line, `You are on main, and this commit carries files the workflow says
  belong on a branch:`, and the list stay as they are.
- On `main` with a reason recorded, and on any other branch, the hook behaves exactly as
  today. Update the header comment's description of the main case in one sentence.

### 5. The workflow, the commands and the operator guide

Exact placements are in Tasks 6–8. The substance:

- **Where the main branch is gated, nothing goes directly to `main`**, and an agent
  treats it as gated unless `.claude/project.json` records `ungated`. Every change — a
  backlog edit and a plan file included — reaches `main` through a pull request that
  merges itself once green (`gh pr merge <N> --auto --squash` with `--subject` and
  `--body`). Dispatch's move of an entry to `building` is such a change: the dispatching
  session lands it and waits for it to merge before the executor starts. Where it is not
  gated, the existing direct-to-`main` list stands, unchanged.
- **A check that passes on a rerun with nothing changed is a bug**, recorded in the
  backlog with both runs; **nothing retries a failed check automatically**.
- **Setup and `/update` ask, and never apply.** `/bootstrap` asks at Stage 3b;
  `/update` asks when the take's `Added:` list carries
  `.tropis/templates/main-branch-ruleset.json` and no reason is recorded. Either prints
  the apply command and the two settings, or writes the developer's reason as
  `"ungated"` into `.claude/project.json`, keeping any other key. Before a choice the
  `host` job is red on every run; that is deliberate, and asking at that moment makes
  the window as short as the answer.
- **A release pipeline that pushes to the main branch cannot run behind the gate**,
  because nothing bypasses it; such a project records why it is ungated for now. (The
  adopter-side fix is `release-tags-what-main-holds`; shipped text names no catalog id.)

### 6. This repository's release becomes a tag

Separable from the rest, and last (Task 10). The version heading and the promoted notes
reach `main` through `/release`'s notes commit — through a pull request where `main` is
gated — and the release job only checks and tags:

- `.github/scripts/release.mjs` gains `export function checkReleased(text, version)`,
  which throws unless: `version` matches `^\d+\.\d+\.\d+$` (otherwise
  `"<version>" is not a version of the form X.Y.Z.`); the notes have
  `## [Unreleased]`; the lines after it, up to the first line starting `## [` or equal
  to `---`, trimmed, are empty or exactly `_Nothing yet._` (otherwise:
  `The Unreleased section still holds notes: promote them under the version first.`);
  and the first line after `## [Unreleased]` starting `## [` starts with
  `## [<version>]` (otherwise `The newest version in the notes is <found>, not <version>.`,
  or `The notes have no version section below Unreleased.`). Its CLI gains
  `check <file> <version>`, which prints the error message alone to stderr and exits 1
  on failure, and prints nothing and exits 0 otherwise. Update the usage line.
- `.github/workflows/ci.yml` becomes one job, `release`, started with
  `gh workflow run ci.yml --ref main -f version=<X.Y.Z>`; input `version` (string,
  required, described as the version the notes on `main` were promoted to). Its steps:
  the existing "Releases are cut from main only" step; checkout with `fetch-depth: 0`;
  setup-node 22; a step `id: notes`, named "The notes name this version, and it is not
  tagged yet", with `env: VERSION: ${{ inputs.version }}`, running
  `node .github/scripts/release.mjs check RELEASES.md "$VERSION"` and then failing with
  `v$VERSION is already tagged.` when `git rev-parse -q --verify "refs/tags/v$VERSION"`
  succeeds; a step "Self-check the commit to tag" running exactly
  `bash scripts/check-blueprint.sh`; and a step "Tag and push the tag" with the same
  `env`, setting the git identity with the two `git config` lines the current "Promote
  the notes and commit" step uses, then `git tag -a "v$VERSION" -m "Release v$VERSION"`
  and `git push origin "v$VERSION"`. Permissions stay `contents: write`. It commits
  nothing and pushes no branch. The separate `self-check` job goes: the job's own
  self-check is of the very commit it tags. Rewrite the header comment to say this.
- This repository's `/release` settings (the project-owned block of
  `.claude/commands/release.md`) say how the notes reach `main` already promoted, and
  print the new trigger (Task 10 gives the text). Adopters' `/release` is unchanged
  except for the gated wording of Stages 1b, 5 and 6 (Task 7), which applies to any
  gated project.
- `RELEASES.md`'s opening paragraph: replace "`/release` drafts the next section; the
  release job promotes it under a version heading when it runs." with "`/release`
  drafts the next section and moves it under its version heading; the release job tags
  the commit that carries it."

### 7. The decision record

Append to `framework/DECISIONS.md`, after the last decision, a `---` line, a blank line,
and the record below. Use **FW-037** if it is still the next free number; if a decision
has taken it on `main` since (the sibling plan may add one), use the next free number
and say so under *Judgment calls*.

```markdown
## FW-037: A project's main branch is gated by its host, or the project records why not

**Date:** 2026-10-31 · **Status:** Accepted

**Decision:** Tropis does not prevent a red merge itself; the host does. Tropis ships a
GitHub ruleset for the default branch — a pull request with no approval required, the
check `pipeline / gate` passing on a branch up to date with the main branch, no force
push, no deletion, and nobody able to bypass it — and the one command that applies it,
which a developer runs and an agent never does. The pipeline's `host` job asks GitHub on
every run whether the default branch requires a pull request and any check, whatever its
name, and whether the repository allows auto-merge, and fails, naming what is missing,
the command and the opt-out, until `.claude/project.json` records `"ungated"` with a
reason, which every run then repeats in its summary. The gate job fails when it holds the
deploy, so the required check means the run passed. Where a project records no reason,
every change reaches the main branch through a pull request that merges itself once
green, and the commit hook says so at any commit on main. This repository's release tags
a commit the main branch already holds and pushes only the tag.

**Evidence:** On 2026-10-30 a pull request here merged with its checks still queued: no
check was required, so the host's auto-merge merged at once. The gate job exited 0
whatever the stages did, so no check said a run had passed. Read from GitHub's API on
2026-10-31, unauthenticated, for this public repository: a branch's rules come back as
typed objects, `[]` for a branch with none, and the repository's answer carries
`allow_auto_merge`. With auto-merge, gh 2.89.0 deletes neither branch.

**Rejected:** A hook asking the host on every push — a network call per command. A
workflow opening an issue when the gate is missing or the main branch is red — it lands
in notifications nobody reads. Detecting whether the account's plan allows rulesets —
one message with an opt-out covers both cannot and will not. Requiring a check by name —
a project that renamed its job would fail for nothing. A GitHub App or a deploy key that
bypasses the ruleset for the release — a bypass is a way around the gate for whoever
holds it, so this repository's release became a tag instead. Reading classic branch
protection — its pull-request requirement is visible only to administrators.

**Consequences:** Until a project applies the ruleset or records a reason, its pipeline
is red on every run; setup and the update ask at that moment. A private repository on
GitHub's free plan cannot have the gate and records why. A project whose release pipeline
pushes to the main branch stays ungated until its release only tags. A project protected
by a classic rule moves to the ruleset or records that rule as its reason. The gate job
is now red when a stage failed, as the run already was. A pull request behind the main
branch waits until it is rebased.
```

## Traps

- **Task 1 can stop the plan.** It is a probe of what GitHub lets the pipeline's token
  read. If it cannot be settled from the documentation and the public API, stop there
  and hand back (its last step). Do not build the `host` command on a guess.
- **This plan lands before the sibling `a-failing-push-is-visible`**, which also edits
  `framework/workflow.md`'s merge sequence. Edit only the places Task 6 names, so the
  sibling's rebase meets small hunks. If the sibling has merged first, rebase and keep
  both; say so under *Judgment calls*.
- **The self-check reads committed content only.** `bash scripts/check-blueprint.sh`
  exports `HEAD`. Commit, then run it. (An earlier plan here ordered it the other way
  round and checked the previous commit.)
- **`guards/rule-delivery.test.js` cannot be run from the worktree**: it finds the hooks
  through `FRAMEWORK_ROOT`, which only the self-check's conformance run sets. Commit
  Task 4's change, then run the self-check to see it.
- **`GITHUB_ACTIONS=true` is inherited in CI.** The self-check runs in GitHub Actions,
  so every `host` test sets `GITHUB_ACTIONS` itself — `'true'` or `''` — and puts the
  stub `gh` first on `PATH`. A test that leaves it inherited passes locally and asks
  real GitHub in CI.
- **Red first is natural, with exceptions.** Most new tests fail before their code
  exists. Some pass against the old code by construction — the outside-Actions line
  test cannot (the command does not exist), but the hook's "stays silent on main when a
  reason is recorded" tests and the gate's "exits 0 when it decides run" test do.
  Each task says which, and shows they can fail with a temporary mutation.
- **No guard checks DECISIONS numbering,** and the board's `index.html` is git-ignored:
  no generated document follows from `feature-catalog.yaml` here.
- **The repository has no `package.json` at its root.** Task 0 gives the command that
  runs one guard file; its two temporary files are never committed. `git add` only files
  in the File Structure table.
- **Status.** The dispatching session moves the entry `shaped` → `building` on `main`.
  Whatever status it has on your branch, Task 10 sets it to `shipped`.
- **The pull request runs this repository's installed pipeline, not the template.**
  `.github/workflows/tropis-pipeline.yml` is the last release; the `host` job and the
  red gate reach this repository only when it takes the release carrying them. Their
  real behaviour on GitHub is therefore not observed by this plan's pull request — that
  is *Outstanding*, not a failure.
- **This plan quotes commands it does not run.** The ruleset apply command and
  `gh pr merge … --auto` appear as text to write into files. Do not run them.

## File Structure

| File | Change |
|---|---|
| `templates/github/main-branch-ruleset.json` | new — *Decision 1* |
| `scripts/set-up-project.sh` | install the ruleset at `.tropis/templates/main-branch-ruleset.json` |
| `guards/set-up-project.test.js` | the installed path in the expected list |
| `scripts/pipeline.mjs` | `host`, `ungatedReason`, `gateGaps` (*Decision 2*); the gate's exit (*Decision 3*) |
| `templates/github/tropis-pipeline.yml` | the `host` job; the gate step's comment |
| `guards/pipeline.test.js` | host tests, gate exit tests, workflow and ruleset tests; the one deleted assertion |
| `scripts/framework-commit-check.sh` | *Decision 4* |
| `guards/rule-delivery.test.js` | gated and ungated cases for the commit hook |
| `framework/workflow.md` | Task 6 |
| `commands/bootstrap.md` | Stage 3b, *The gate* |
| `commands/update.md` | Stage 6, item 8 |
| `commands/release.md` | Stages 1b, 5 and 6, gated wording |
| `commands/refresh-board.md` | step 6, gated wording |
| `templates/README.md` | the operator guide's gate paragraph |
| `guards/release.test.js` | text tests for the commands, the workflow and the guide; the release job rewritten |
| `framework/DECISIONS.md` | *Decision 7* |
| `.github/workflows/ci.yml` | *Decision 6* — tag only |
| `.github/scripts/release.mjs` | `checkReleased` and `check` |
| `.claude/commands/release.md` | the project-owned block only (Task 10) |
| `RELEASES.md` | one sentence (*Decision 6*) |
| `feature-catalog.yaml` | the entry to `shipped` with `modules`, `refs` and a comment mapping criteria to tests; one comment line above `release-job-checks-the-commit-it-tags` |
| `docs/superpowers/plans/2026-10-31-main-is-gated-by-the-host.md` | the handover report |

Checked, and unchanged: `templates/pipeline-caller.yml` (its job id `pipeline` is what
names the check); `scripts/installed-files.js` (the file sits under `.tropis/`, a shipped
root); `guards/framework-integrity.test.js` (nothing new to exempt);
`scripts/installed-scripts.txt` (no new script); the fixtures (no new guard and no new
installed hook; the conformance run composes the changed hook from `scripts/`);
`rules/` (no rule restates the direct-to-main list — `rules/harness-scripts.md` names
the project-owned block, which stays); `framework/dispatch.md` and `commands/dispatch.md`
(they say nothing about the status change); this repository's
`.github/workflows/pipeline.yml`, `.github/workflows/tropis-*.yml` and `AGENTS.md`.

## Tasks

### Task 0 — Setup in the worktree

In the worktree, run `npm --prefix .tropis ci`, `git status --porcelain` (expected:
nothing) and `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record all three.

To run one guard file against the working tree, from the worktree root, then remove the
two temporary files:

```bash
echo '{"type":"module"}' > package.json && ln -s .tropis/node_modules node_modules
node --experimental-vm-modules node_modules/.bin/jest --config templates/framework-jest.config.js --rootDir . guards/pipeline.test.js --no-coverage
rm package.json node_modules
```

The same command with `guards/release.test.js` or `guards/set-up-project.test.js` in
place of `guards/pipeline.test.js` runs those. Run all three now and record their
counts.

### Task 1 — Probe what the pipeline's token can read (may stop the plan)

Settle three questions before building on them, and record the evidence for each:

1. **Can `GITHUB_TOKEN` read both endpoints, and does the job need a `permissions:`
   block?** Read GitHub's REST documentation for *Get rules for a branch* and *Get a
   repository* (docs.github.com, REST API, repos → rules and repos → repos): each page's
   *Fine-grained access tokens* section names the permission it needs. Then read
   *Permissions for the GITHUB_TOKEN* (Actions → security → automatic token
   authentication). Expected: both endpoints need **Metadata: read**, which the
   `GITHUB_TOKEN` always has, so no `permissions:` block is needed. If a page names
   another permission, add exactly that, read-only, to the `host` job in Task 3 and
   record why.
2. **What do the endpoints return?** Re-run, unauthenticated, through the session's
   proxy: `curl -sS https://api.github.com/repos/fcapurso/tropis` (expect
   `default_branch` and a boolean `allow_auto_merge`),
   `curl -sS https://api.github.com/repos/fcapurso/tropis/rules/branches/main` (expect
   an array of objects with `type`), and the same for a branch name that does not exist
   (expect `[]`). If `gh auth status` succeeds, also run `gh api` for the same three and
   record whether the answers match.
3. **Does the ruleset file match the API's schema?** Read *Create a repository ruleset*
   and check each field of *Decision 1*'s JSON, in particular which `pull_request`
   parameters are required and that `~DEFAULT_BRANCH` is accepted in
   `conditions.ref_name.include`.

**If all three are settled, carry on and record the outcome under *Task completion*.**
If question 1 or 2 cannot be settled — the documentation or the API cannot be reached,
or they contradict this plan in a way a `permissions:` line does not fix — **stop**:
do not start Task 3. Write the handover report's *Task completion* with what you found,
commit it on the branch, and hand back to the specifying session saying which question
is open and what you saw. That session puts it to the developer. On resumption, run
these checks again and proceed on their result. Question 3 never stops the plan: fix the
file as *Decision 1* allows.

### Task 2 — The ruleset and its installation

1. Create `templates/github/main-branch-ruleset.json` (*Decision 1*, with any Task 1
   correction).
2. In `scripts/set-up-project.sh`, install it at `.tropis/templates/main-branch-ruleset.json`.
3. In `guards/set-up-project.test.js`, add `'.tropis/templates/main-branch-ruleset.json'`
   after `'.tropis/templates/candidate-caller.yml'` in the expected list.
4. In `guards/pipeline.test.js`, `describe('GitHub workflow')`, add a test
   `the ruleset requires a pull request and the gate, and lets nobody bypass it` that
   parses the JSON and asserts: `enforcement` is `active`; `bypass_actors` is `[]`;
   `conditions.ref_name.include` is `['~DEFAULT_BRANCH']`; the rule types, sorted, are
   `['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']`;
   `required_approving_review_count` is `0`; `strict_required_status_checks_policy` is
   `true`; and the required contexts are exactly
   `[`${Object.keys(caller.jobs)[0]} / gate`]`, where `caller` is
   `templates/pipeline-caller.yml` parsed — and that the template has a `gate` job. So a
   rename of the caller's job or the gate turns it red.

Run `guards/pipeline.test.js` and `guards/set-up-project.test.js` before step 1 (both new
assertions red: the file is absent) and after step 3 (green). Commit.

### Task 3 — The `host` command, the job, and the gate's exit

**Tests first**, in `guards/pipeline.test.js`:

- A new `describe('host')`. A helper writes a stub `gh` into a temporary `bin/` (pushed
  to `temps`) that appends `"$*"` to `$STUB_LOG`, prints `$STUB_REPO` and exits
  `${STUB_REPO_EXIT:-0}` for exactly `api repos/acme/app` (printing `$STUB_REPO_ERR` to
  stderr when set), prints `$STUB_RULES` for any `api repos/acme/app/rules/branches/*`,
  and otherwise writes `stub gh: unexpected call: $*` to stderr and exits 99. Every case
  sets `PATH` with the stub first, `GITHUB_REPOSITORY=acme/app`, `GH_TOKEN=stub` and
  `GITHUB_ACTIONS` explicitly. Cases, by name:
  1. `outside GitHub Actions it says it reads the host in the pipeline and passes` —
     `GITHUB_ACTIONS: ''`: exit 0, stdout exactly the one line of *Decision 2* step 2,
     and the stub log empty.
  2. `passes when the main branch requires a pull request and any check, and auto-merge is allowed`
     — rules with `pull_request` and `required_status_checks` whose context is
     `renamed / job`, `allow_auto_merge: true`: exit 0, the step 7 line on stdout and in
     the summary file, and the log holds the two calls (filter the log by their
     arguments; do not count every line).
  3. `fails on a branch with no rules, naming each gap, the command and the opt-out` —
     rules `[]`, `allow_auto_merge: false`: exit 1; stderr and the summary each contain
     the three gaps, `gh api repos/acme/app/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json`,
     `Settings → General → Pull Requests → Allow auto-merge`, `"ungated"`,
     `Pro, Team or Enterprise` and `a classic branch protection rule does not count`.
  4. `names only what is missing` — `pull_request` only, auto-merge on: stderr names
     `no check is required` and neither of the other two gaps.
  5. `reads the default branch from the repository` — `default_branch: 'trunk'`: the
     log holds `api repos/acme/app/rules/branches/trunk?per_page=100`.
  6. `an ungated reason passes without asking GitHub, and the summary carries it` —
     `.claude/project.json` holding `{"public": true, "ungated": "private, on the free plan"}`:
     exit 0, the reason on stdout and in the summary, the log empty.
  7. `an ungated value that is not a reason fails` — `"ungated": "  "` and then
     `"ungated": true`: exit 1 each, *Decision 2* step 3's message.
  8. `fails when GitHub cannot be asked, saying why and how to opt out` —
     `STUB_REPO_EXIT=1`, `STUB_REPO_ERR='HTTP 403: Resource not accessible'`: exit 1,
     stderr contains `could not ask GitHub`, `HTTP 403` and `"ungated"`.
  9. `says when GitHub did not report auto-merge` — `allow_auto_merge` absent: exit 1,
     `GitHub did not say whether auto-merge is allowed`.
- In `describe('run, gate and commands')`: the two held tests now expect
  `result.status` 1 (stdout and summary assertions unchanged); the third test asserts
  status 0 for the pull-request, push, branch and prose cases; and a new test
  `fails with no plan, saying the plan job did not finish` — empty stdin: exit 1, stderr
  contains `the plan job did not finish`, stdout empty.
- In `describe('GitHub workflow')`, the first test's job list becomes
  `['plan', 'host', 'framework', 'sanity', 'unit', 'integration', 'end-to-end', 'branch-create', 'gate', 'deploy', 'branch-remove']`,
  and it asserts that `jobs.host` has no `needs`, that its `if` contains
  `github.event.action != 'closed'`, that its `run` step is exactly
  `node .tropis/scripts/pipeline.mjs host --summary "$GITHUB_STEP_SUMMARY"` with
  `env.GH_TOKEN` `${{ github.token }}`, and that neither `gate.needs` nor `deploy.needs`
  names `host` (the existing `gate.needs` assertion already pins it). Delete the byte
  comparison named in *Decision 3*.

Run the file and record which tests fail and why. Expected green against the old code:
none of the host tests, none of the new workflow assertions; the third gate test (status
0) is green already.

**Then the code:** *Decision 2* in `scripts/pipeline.mjs` and the job in
`templates/github/tropis-pipeline.yml`; *Decision 3* in `gateCommand` and the gate
step's comment. Run the file: all green. Then show the tests that cannot fail by
construction can fail, each with a temporary edit reverted at once (Jest reads the
working tree):

1. Make `gateCommand` return 0 for `held`: the two held tests fail.
2. Make it return 1 always: the third gate test fails.
3. Make `gateGaps` require a context named `pipeline / gate`: case 2 fails.
4. Ask GitHub before reading `.claude/project.json`: case 6 fails (the log is not empty).

Record each failing name, revert, re-run green, commit.

### Task 4 — The commit hook

**Tests first**, in `guards/rule-delivery.test.js`, inside
`describe('framework-commit-check fires when a commit carries the instruction layer')`:

- Give `repoWith(paths, branch, projectJson)` an optional third argument: when given,
  write it as `.claude/project.json` **and commit it** on that branch before writing the
  other paths (commit with `-c user.name=t -c user.email=t@t`), so the hook does not
  list it as a change.
- The four "stays silent on main for …" tests pass
  `{ "ungated": "the probe's reason" }` and are renamed to end `… when a reason is recorded`.
- `names a file outside the may-go-to-main paths when the commit is on main` passes the
  same, and keeps its assertions.
- New: `on a gated main names the backlog and says to use a pull request that merges itself`
  — `feature-catalog.yaml` on `main`, no project.json: the reply contains
  `feature-catalog.yaml`, `belong on a branch`, `main branch is gated` and
  `gh pr merge <N> --auto --squash`.
- New: `on a gated main names docs too` — `docs/notes.md` on `main`, no project.json:
  the reply contains `docs/notes.md` and `main branch is gated`.
- New: `a blank ungated counts as gated` — `docs/notes.md` on `main` with
  `{ "ungated": " " }`: the reply contains `main branch is gated`.
- New: `stays silent off main whether or not a reason is recorded` — `docs/notes.md` on
  `plan/x`, no project.json: stdout empty.

Apply *Decision 4*. Commit (tests and hook together; they can only be run by the
self-check). Run `bash scripts/check-blueprint.sh`: passes. Then show the new tests can
fail: make the gated branch of the hook unreachable (for instance `ungated=yes` right
after it is read), commit that as a throwaway, run the self-check, record the failing
test names, and `git reset --hard HEAD~1`.

### Task 5 — The decision record

Apply *Decision 7* to `framework/DECISIONS.md`. Commit.

### Task 6 — The workflow

In `framework/workflow.md`, *Branching*:

1. Insert, as the second bullet (after `One branch per plan …`):

```markdown
- **Where the main branch is gated, nothing goes directly to `main`.** It is gated when
  its host refuses a merge whose checks have not passed — on GitHub, the ruleset Tropis
  ships — and an agent treats it as gated unless `.claude/project.json` records
  `"ungated"`. There every change, a backlog edit or a plan file included, reaches
  `main` through a pull request that merges itself once green: commit on a branch, push
  it, open the pull request, and run `gh pr merge <N> --auto --squash` with `--subject`
  and `--body`. Dispatch's move of an entry to `building` is such a change: the
  dispatching session lands it through its pull request and waits until it has merged
  before the executor starts. A pull request behind `main` waits too, because the host
  requires it to be up to date: rebase it on `origin/main` and push, and it merges once
  green again.
```

2. The next bullet opens `**Where it is not gated, what may go directly to `main` is what
   cannot change how an agent behaves**:` — the rest of it unchanged.
3. Replace the bullet *Say whether anything enforces this* with:

```markdown
- **Say whether anything enforces this.** Tropis's pipeline asks the host on every run,
  and its `host` job fails until the main branch requires a pull request and a passing
  check and auto-merge is allowed, or `.claude/project.json` records `"ungated"` with the
  reason, which every run then repeats in its summary. Where the project records a
  reason, also write in its own `AGENTS.md` that nothing refuses a push to `main` or a
  red merge, with the date it was checked: a reader who assumes a gate exists will trust
  a green tick that nothing was checking. The moment to repeat it is the commit itself:
  `framework-commit-check.sh` speaks at any commit on `main` where no reason is
  recorded, and otherwise only when the commit carries something that belonged on a
  branch.
```

4. At the end of the bullet *A release pipeline is a third writer to `main`*, add:
   `Where the main branch is gated it cannot be: nothing bypasses the gate, so a project
   whose release pipeline pushes to `main` records why it is ungated until its release
   only tags what `main` holds.`

*Preflight*: replace `Push `main` before dispatching, or hand the agent an explicitly
stated base commit.` with `Push `main` before dispatching, or hand the agent an
explicitly stated base commit. Where `main` is gated nothing is committed on it to push:
the dispatch's status change lands through its own pull request first.`

*Merge and clean up*: after the paragraph ending `…leave an orphaned branch behind.`,
insert:

```markdown
**Where the main branch is gated, the merge is
`gh pr merge <N> --auto --squash --subject "…" --body "…"`**, in place of the command
above. It returns at once, and the host merges when the required check passes. With
auto-merge enabled, `gh` deletes neither the local nor the remote branch, so the local
branch is deleted beforehand, as above, and the remote one by the repository setting
*Automatically delete head branches*. Pull `main` once the pull request says merged.
```

Leave the paragraph `**Where the host marks no check as required, its auto-merge merges
at once.** …` exactly as it is (a guard reads it).

*Merging*: after the numbered list (`3. Squash-merge.`) insert:

```markdown
**A check that passes on a rerun with nothing changed is a bug.** Record it in the
backlog with both runs, as any defect. Nothing retries a failed check automatically —
not the pipeline, not an agent — because a retry that passes hides the failure a person
needed to see.
```

Then, in `guards/release.test.js`, add `describe('the gate in the workflow')`, reading
`framework/workflow.md` with whitespace collapsed, with one test per clause:
`Where the main branch is gated, nothing goes directly to`, `gh pr merge <N> --auto --squash`,
`waits until it has merged before the executor starts`,
`Where it is not gated, what may go directly to`,
`A check that passes on a rerun with nothing changed is a bug`,
`Nothing retries a failed check automatically`,
`Automatically delete head branches`. Run the file: red before the edit, green after.
Commit.

### Task 7 — The commands

1. `commands/bootstrap.md`, Stage 3b: after the **GitHub.** paragraph and before
   **Any other host.**, insert:

```markdown
**The gate.** Ask whether the host should refuse a merge that has not passed the
pipeline. On GitHub, print, with `<owner>/<name>` taken from `origin`:
`gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json`,
and say to turn on *Allow auto-merge* and *Automatically delete head branches* under
Settings → General → Pull Requests. The developer runs it; never run it yourself. A
private repository on GitHub's free plan cannot have rulesets. If the developer will not
or cannot apply it, or the host is not GitHub, ask why, and write their reason into
`.claude/project.json` as `"ungated": "<reason>"`, keeping any key already there. Until
one of the two is done, the pipeline's `host` job fails on every run, by design.
```

2. `commands/update.md`, Stage 6: add item 8, after item 7:

```markdown
8. **The gate, when the take's Added list includes
   `.tropis/templates/main-branch-ruleset.json`** and `.claude/project.json` records no
   `ungated`. From this release the pipeline fails on every run until the project
   chooses, so ask now, as bootstrap's Stage 3b (*The gate*) does: print the command that
   applies the ruleset and the two settings, for the developer to run once this branch
   has merged, or write the reason they give into `.claude/project.json`, so it is
   committed with the update. Never apply the ruleset yourself.
```

3. `commands/release.md`:
   - Stage 1b: after `push it (`git push origin main`).`, add: `Where the main branch
     is gated (workflow.md, *Branching*), move that commit to a branch instead, open a
     pull request, run `gh pr merge <N> --auto --squash`, and wait until it has merged.`
     Adjust the next sentence ("Pre-flight found nothing else unpushed…") only if it no
     longer reads true.
   - Stage 5: after `… a body line `Bump: <bump>`, and push.`, add: `Where the main
     branch is gated, commit on a branch instead, open a pull request, run
     `gh pr merge <N> --auto --squash` with the same subject and body, and wait until it
     has merged; the commit Stage 6 names is then the one the merge made on `main`.`
   - Stage 6: `the commit Stage 5 pushed` → `the commit Stage 5 put on `main``.
4. `commands/refresh-board.md`, step 6: replace `Directly on `main`, when step 2 changed
   it — which, after a stamp, it always has — it is a file under `docs/`, so no branch is
   needed.` with `When step 2 changed it — which, after a stamp, it always has. It is a
   file under `docs/`, so it goes directly on `main`, or, where the main branch is gated,
   through a pull request that merges itself (workflow.md, *Branching*).` Keep the rest
   of the step.

In `guards/release.test.js`, extend `describe('the pipeline offer')` with:
`asks bootstrap for the gate, and never applies it` (bootstrap contains the apply
command, `Allow auto-merge`, `"ungated": "<reason>"` and `never run it yourself`);
`asks the update for the gate when the release brings the ruleset` (update contains
`.tropis/templates/main-branch-ruleset.json`, `Never apply the ruleset yourself`); and
`release and refresh-board use a pull request on a gated main` (both contain
`gh pr merge <N> --auto --squash` or `merges itself`). Red, then green. Commit; the body
says what changed in each command and why (the commit hook asks).

### Task 8 — The operator guide

In `templates/README.md`, before the paragraph starting `Tropis ships the pipeline and
replaces its copy on update.`, insert:

```markdown
On GitHub the host can refuse a pull request whose checks have not passed. Tropis ships
the settings in `.tropis/templates/main-branch-ruleset.json`: the main branch takes
changes only through a pull request, needs no approval, requires the check
`pipeline / gate` on a branch up to date with it, refuses force pushes and deletion, and
lets nobody bypass it. Apply it with
`gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json`,
and turn on *Allow auto-merge* and *Automatically delete head branches* under Settings →
General → Pull Requests. If you renamed the job in `pipeline.yml` or the gate, apply a
copy with the check's name changed. The pipeline's `host` job fails on every run until
the main branch requires a pull request and a check and auto-merge is allowed, or until
`.claude/project.json` says why not, as `"ungated": "<the reason>"` — a private
repository on GitHub's free plan cannot have rulesets, for one; the run summary then
carries the reason. Only rulesets are read: a classic branch protection rule does not
count. A release pipeline that pushes to the main branch cannot run behind the gate,
because nothing bypasses it; such a project records why it is ungated for now.
```

In `guards/release.test.js`, `describe('the /release candidate')` already reads the
guide; add a test `the operator guide says how to apply the gate and how to opt out`
(contains the apply command and `"ungated": "<the reason>"`). Red, then green. Commit.

### Task 9 — Fresh-agent check

`framework/workflow.md` and the commands changed what an agent is told, so a fresh-agent
check is owed (workflow.md, *Fresh-agent check*). Aim it at Task 6's first bullet.

1. Build a scratch project outside every checkout: a new directory, `git init -b main`,
   `bash <worktree>/scripts/set-up-project.sh <scratch>`, commit everything on `main`.
   No `.claude/project.json`, no remote.
2. Run a fresh agent whose only context is that directory — preferably `claude -p` with
   the scratch project as its working directory, so its hooks load; otherwise a
   subagent given only the path, and record that the scratch hooks did not load. Check
   first whether the instructions that load for every project on that install already
   say anything about gated branches or auto-merge; if they do, run it where they do not
   load and say so. The prompt, verbatim:

   > This is a probe; whatever you produce will be discarded. In this project, add an
   > idea to the backlog with the id `probe-widget-export` (title: "A widget can be
   > exported") following the project's own rules for ideas, and get it onto the main
   > branch. The repository has no remote: where a step would reach GitHub, write the
   > exact command you would run instead of running it, and carry on.

3. **Expected:** it commits on a branch, not on `main`, and names `gh pr create` and
   `gh pr merge … --auto --squash` (with a subject and body) rather than a push to
   `main`. Then run the same prompt in a fresh copy of the scratch project whose
   `.claude/project.json` holds `{ "ungated": "probe control" }`, committed on `main`:
   expected, it commits the backlog edit on `main`.
4. If the first run does not find the gated path, the change is not finished: say what
   it did instead, adjust the wording of Task 6's bullet (only that), and run it again.
   Record each run.

Record, for each run: the prompt, what it did, whether that is what the change intended,
and the tool, its version, the operating system and the architecture (`uname -sm`) —
never the computer's name. Put the same two or three sentences in the body of Task 10's
catalog commit, and in the handover, so the reviewer can carry them into the squash
message. End with a proposal for anything it found (a backlog entry, a rule, or a
one-line reason to drop it), under *Outstanding*.

### Task 10 — This repository's release becomes a tag (separable), and the catalog

This task is separable: if the reviewer splits it out, it becomes its own plan with no
change to the tasks above.

1. **Tests first** in `guards/release.test.js`:
   - `describe('checkReleased')`: passes on `promote`'s output for `0.2.0` checked as
     `0.2.0`; throws `/still holds notes/` on unpromoted notes; throws
     `/newest version in the notes is 0\.2\.0, not 0\.3\.0/` for `0.3.0`; throws
     `/of the form X\.Y\.Z/` for `v0.2.0` and `0.2`; throws `/no version section/` when
     only Unreleased exists.
   - Rewrite `describe('the release job')` for *Decision 6*. Keep its scratch world (a
     bare origin, a work repository with `RELEASES.md`, the copied `release.mjs`, a stub
     `scripts/check-blueprint.sh` recording the commit it saw), now with `RELEASES.md`
     already promoted to `0.2.0` and pushed. Run the job's steps after the setup-node
     step that have a `run`, with `bash -e -c` and `env` `{ VERSION }` only (assert no
     step's `env` names anything else). Cases:
     `tags the commit main holds and pushes only the tag` (check passes: origin's
     `main` unchanged, origin's `v0.2.0` points at that same commit, the work
     repository's `HEAD` unchanged, the stub saw that commit);
     `pushes nothing when the self-check fails` (no tag on origin; stopped at the
     self-check step);
     `refuses a version the notes do not name, before the self-check` (`VERSION=0.3.0`:
     stopped at the `notes` step, the stub never ran, no tag);
     `refuses a version already tagged` (tag `v0.2.0` locally first: stopped at the
     `notes` step);
     and a structural test: no step runs `git commit`; the only `git push` is
     `git push origin "v$VERSION"`; the self-check step comes after `notes` and before
     the tag step; no step from `notes` on has `if` or `continue-on-error`; the
     workflow's only input is `version`; there is one job.
   Run the file and record the red.
2. Apply *Decision 6* to `.github/scripts/release.mjs` and `.github/workflows/ci.yml`.
   Run the file: green. Update the release.mjs header comment if it still says the job
   promotes the notes.
3. `RELEASES.md`: the one sentence of *Decision 6*.
4. `.claude/commands/release.md`, inside the project-owned block only, replace the
   `Notes file` and `Trigger` lines and add a `Main branch` line, so the block reads:

```
- Run from: the root of this repository, where the backlog also lives.
- Notes file: `RELEASES.md` at the root. Here the notes reach main already promoted: at
  Stage 5, once the bump is confirmed, work out the version with
  `node .github/scripts/release.mjs version <bump> <last tag>`, then run
  `node .github/scripts/release.mjs promote RELEASES.md <version> <today, YYYY-MM-DD, UTC>`
  before committing. The release job only tags.
- Main branch: gated where `.claude/project.json` records no `ungated`. There Stage 1b's
  README commit and Stage 5's notes commit each go on a branch, through a pull request
  that merges itself (`gh pr merge <N> --auto --squash`), and the next stage waits until
  it has merged.
- Readers: people who set up and run projects with the framework.
- Breaking: as `RELEASES.md` defines it — a project taking the release must act by hand.
  Below 1.0 the release job raises the middle number only for `bump=major`, and `minor`
  raises the last one: so a breaking release is `bump=major` until 1.0.
- Trigger: `gh workflow run ci.yml --ref main -f version=<version>`, once the notes are
  on main. The job checks main, tags it, and pushes only the tag.
- Where the run is watched: https://github.com/fcapurso/tropis/actions/workflows/ci.yml
```

   Keep the marker lines exactly. Then run `npm --prefix .tropis test`: the
   installed-files check must still pass, which shows the edit stayed inside the block.
   If it fails, revert this step and report it.
5. `feature-catalog.yaml`:
   - On `main-is-gated-by-the-host`: `status: shipped`; `modules`:
     `templates/github/main-branch-ruleset.json`, `scripts/pipeline.mjs`,
     `templates/github/tropis-pipeline.yml`, `scripts/framework-commit-check.sh`,
     `framework/workflow.md`, `commands/bootstrap.md`, `commands/update.md`,
     `.github/workflows/ci.yml`, `.github/scripts/release.mjs`; `refs`: this plan's
     path. Below the existing comment above it, add a comment mapping each criterion to
     its tests — criterion 1: the ruleset test (`guards/pipeline.test.js`) and the
     setup's installed list (`guards/set-up-project.test.js`); 2: host cases 2–9; 3: host
     case 1; 4: the bootstrap and update tests in `the pipeline offer`; 5: `the gate in
     the workflow`, the release and refresh-board test, and the gated commit-hook tests
     in `guards/rule-delivery.test.js`; 6: the rerun and retry tests in `the gate in the
     workflow`; 7: `the release job` and `checkReleased`.
   - Above `release-job-checks-the-commit-it-tags`, add one comment line:
     `# 2026-10-31: its third criterion is superseded by main-is-gated-by-the-host; the release job now pushes only the tag.`
6. Commit, with Task 9's record in the body. Then run and record:
   - the three guard files (Task 0's command): counts;
   - `npm --prefix .tropis test`: counts, all passed;
   - `bash scripts/check-blueprint.sh` after the commit: last line starts
     `Self-check passed`;
   - `git diff --stat origin/main...HEAD`: every file is in the File Structure table.

### Task 11 — Handover report and pull request

Append `## Handover report` to this plan file with the six sections the planning rule
names — *Task completion* (Task 1's outcome included, and whether it stopped),
*Verification results* (each command, its actual output, and the tool, version,
operating system and architecture; never the computer's name), *Scope* (the diff stat,
confirmation against the File Structure table, the worktree path `../tropis-gate`),
*Judgment calls*, *What the plan got wrong*, *Outstanding*. Commit, push the branch, and
open a pull request against `main` titled
`feat(pipeline): a project's main branch is gated by its host, or it says why not`.
Stop there: the specifying session reviews and merges.

*Outstanding* must carry, at least, these items for the reviewer to disposition:

- **The developer applies the ruleset to this repository after merge, in this order.**
  (1) Release with `/release` — the new block prints `-f version=…`. (2) Take that
  release here with `/update`, so this repository's installed pipeline has the red gate
  and the `host` job; before that, `pipeline / gate` here is green even when a stage
  fails, and requiring it would gate nothing. (3) Run the apply command for
  `fcapurso/tropis` and turn on *Allow auto-merge* and *Automatically delete head
  branches*. (4) The specifying session then updates `AGENTS.md`'s *What GitHub enforces
  here*, with the date checked.
- **The `host` job and the red gate have not run on GitHub.** The first run after this
  repository takes the release is the observation; the reviewer names who looks at it.
- Whatever Task 1 and Task 9 found that this plan did not settle.
