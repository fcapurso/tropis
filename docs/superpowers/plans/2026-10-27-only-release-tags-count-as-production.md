# Only a vX.Y.Z tag counts as a release — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a tag counts as a release only when it is exactly `v` and three numbers, such as
`v1.4.0`. The release-candidate rehearsal takes production's version from such tags only,
`/release` counts the release's changes from such a tag only, and the workflow document and
the operator guide say so. A project that also tags test versions, such as `v1.1.0-rc.1`,
then rehearses and drafts a release correctly.

**Spec:** the entry `only-release-tags-count-as-production` in `feature-catalog.yaml`, its
four criteria and the comment above it. *Decisions* below settles what the entry leaves
open. Do not reopen them.

**Read first:** `docs/superpowers/plans/2026-10-26-release-is-rehearsed-on-a-candidate.md`,
its *Decisions* 1–2, its handover report and its review record. This plan fixes the first
item under that record's *Found*. What that plan cost in review, and what this plan does
about it:

- A guard that runs git against the self-check's tree fails there: the self-check stages a
  `git archive` of `HEAD`, which has no `.git`. **The new guards in this plan create their
  own temporary repositories** with `git init`, as `guards/pipeline.test.js` already does,
  and never run git against the tree under test.
- The scratch project for the fresh-agent check needs a README level, or `/release` stops
  at Stage 1b before it reaches the stage under test. Task 4 sets it to `manual`.

**What the specifying session verified on 2026-10-27, against `main` at `db73d0c`, with
git 2.49.0 on dev-laptop.local (macOS, Darwin 25.2.0, arm64):**

- `scripts/pipeline.mjs` has `highestVersionTag(root)`, documented as "Highest `v*` tag by
  version order, `''` when there is none, null when git fails". It runs
  `git tag --list 'v*' --sort=-v:refname` and returns the first non-empty line. `rehearse()`
  is its only caller: `null` exits 1 with `candidate: could not list tags`, `''` skips
  `reset.sh` with the summary line `Reset: not needed — no release yet`, and any other value
  is passed to `reset.sh` as `TROPIS_PRODUCTION_TAG` and written as ``Reset: to `<tag>` ``.
- On a scratch repository with commits a, b, c tagged `v1.0.0-rc.1` (a), `v1.0.0` (b),
  `v1.1.0-rc.1` and `v2` (c), and `v1.0.10` on a:
  - `git tag --list 'v*' --sort=-v:refname` printed `v2`, `v1.1.0-rc.1`, `v1.0.10`,
    `v1.0.0-rc.1`, `v1.0.0`, in that order. So today the rehearsal would reset to `v2`, and
    without `v2` to `v1.1.0-rc.1`; and `v1.0.0-rc.1` ranks above `v1.0.0`.
  - `git describe --tags --abbrev=0` printed `v1.1.0-rc.1`.
  - The Stage 2 command in *Decision 2* printed `v1.0.10`. On a repository whose only tag
    is `v1.0.0-rc.1` it printed `NO_PREVIOUS_TAG`.
- `commands/release.md` Stage 2 opens with a bash block whose one line is
  `git describe --tags --abbrev=0 2>/dev/null || echo "NO_PREVIOUS_TAG"`. The stage then
  says what to do on `NO_PREVIOUS_TAG`, and later uses `<last-tag>` in
  `git log <last-tag>..HEAD`. No other place in `commands/`, `scripts/` (other than the two
  below), `templates/` or `framework/` looks up a project's last release.
- Two other tag lookups are **not** a project's release and stay as they are:
  `scripts/set-up-project.sh` runs `git describe --tags --always` against the Tropis clone to
  record which Tropis it came from, and `scripts/check-version.mjs` runs
  `git describe --tags --exact-match HEAD` against the Tropis clone. `scripts/update.mjs`
  already keeps only tags matching `/^v\d+\.\d+\.\d+$/` (its `refs/tags/(v\d+\.\d+\.\d+)$`
  match), and this repository's `.github/scripts/release.mjs` refuses anything else; this
  plan brings the rehearsal and `/release` to the same rule.
- `templates/README.md` (the operator guide, installed as `.tropis/README.md`) says, in the
  paragraph that starts "To rehearse a release before it is tagged": "The version is the
  highest tag matching `v*`, in version order. With no such tag there is no release yet,
  and `reset.sh` is not run."
- `framework/workflow.md`, *Optional — release*, never says which tags count. Its first
  bullet's step 1 says the candidate "puts the pre-production environment back on the
  version production runs".
- `framework/DECISIONS.md` FW-030's decision says the rehearsal "resets the pre-production
  environment to the highest v* tag". The file already records later changes to a decision
  as a bold `**Amended <date> — <what>.**` paragraph under it (FW-002 and others).
- `guards/pipeline.test.js`, `describe('candidate rehearse')`, has
  `does not run reset when no tag matches v*, and says no release yet` (tag
  `not-a-release`) and `resets to the highest v* tag, then deploys, and removes the archive
  afterwards` (tags `v0.9.0`, `v0.10.0` through `versionedRepository()`). Helpers in that
  file: `repository()`, `commit(root, msg)`, `git(root, ...args)`, `write(root, path,
  text)`, `runPipeline(root, args)`, `summaryFor({...})`, `fillCandidateSlot(root, text)`.
- `guards/release.test.js` reads `commands/release.md` and `framework/workflow.md` from the
  source tree and pins phrases from Stages 1, 3, 6 and 7. Nothing pins Stage 2's command or
  the guide's `v*` sentence.
- `framework-integrity` requires every backticked path under `docs/`, `scripts/` or
  `.claude/` in a framework document to exist. The text this plan adds names no such path.

**Model tier: Medium.** The code and every sentence of text are given. The fresh-agent
check in Task 4 needs a scratch project set up with care.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** The change reaches every project's release, and the
fresh-agent result needs reading by the session that wrote the clause.

Do not store a kick-off prompt on this plan.

---

## Delivers

only-release-tags-count-as-production

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-release-tags -b plan/only-release-tags-count-as-production` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`.** The sources are under `scripts/`, `commands/`, `templates/` and
  `framework/`.
- **Add no dependency.** Use `node:` modules.
- **Do not change the summary's wording.** ``Reset: to `<tag>` `` and
  `Reset: not needed — no release yet` already say what the criteria ask.
- **Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Do not merge.

## Decisions

Taken by the specifying session on 2026-10-27, with the developer, in the conversation that
shaped the entry.

### 1. A release tag is `v` and three numbers, nothing else

A tag counts as a release when it matches `/^v\d+\.\d+\.\d+$/`. Not `v1.1.0-rc.1`, not
`v1.0.0+build.5`, not `v2`, not `release-1.0.0`. This is the rule `scripts/update.mjs` and
this repository's own release already apply. Among release tags, the highest by version
order is production's version.

**Rejected:** treating any tag without a `-` as a release (it accepts `v2` and
`v1.0.0+build.5`); a project-owned pattern (a configuration seam for a choice no project
has asked to make).

### 2. The code

In `scripts/pipeline.mjs`, replace `highestVersionTag` with:

```js
const RELEASE_TAG = /^v\d+\.\d+\.\d+$/;

/**
 * Production's version: the highest tag of the form vX.Y.Z by version order. Any other
 * tag, such as v1.1.0-rc.1, is not a release. `''` when there is none, null when git fails.
 */
function highestReleaseTag(root) {
  const listed = git(root, ['tag', '--list', 'v*', '--sort=-v:refname']);
  if (listed.status !== 0) return null;
  return listed.stdout.split('\n').find((line) => RELEASE_TAG.test(line)) ?? '';
}
```

and change its one call in `rehearse()` to `highestReleaseTag(root)`. Version order among
tags that all have three numbers is numeric, so the first match is the highest release.

In `commands/release.md`, Stage 2, replace the bash block's one line with:

```bash
git tag --list 'v*' --merged HEAD --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1 | grep . || echo "NO_PREVIOUS_TAG"
```

and add this paragraph directly after the block, before **No previous tag:**:

> The last release is the highest tag of the form `vX.Y.Z` that this commit contains. Any
> other tag, such as `v1.1.0-rc.1`, is not a release, and the window runs from the last
> release however many such tags came after it.

`--merged HEAD` keeps a release made on another branch out of the window. The last `grep .`
turns an empty result into `NO_PREVIOUS_TAG`.

### 3. The documents

**`templates/README.md`:** replace the sentence "The version is the highest tag matching
`v*`, in version order." with:

> Only a tag of the form `vX.Y.Z`, such as `v1.4.0`, counts as a release; a tag such as
> `v1.5.0-rc.1` is not one. The version is the highest release tag.

Leave "With no such tag there is no release yet, and `reset.sh` is not run." as it is.

**`framework/workflow.md`**, *Optional — release*: insert a new bullet directly after the
bullet that begins **"The tag sits one commit above the candidate"**:

> - **Only a tag of the form `vX.Y.Z` is a release.** A tag such as `v1.5.0-rc.1` may mark
>   anything else, and the framework ignores it: the candidate puts the pre-production
>   environment back on the highest `vX.Y.Z` tag, and `/release` counts the changes since
>   the last one. Without this, a test tag sorts above the release it precedes and above
>   the one before it, and the pre-production environment is reset to a version production
>   never ran, with nothing to say so.

**`framework/DECISIONS.md`**: under FW-030, after its last existing paragraph, add:

> **Amended 2026-10-27 — only a vX.Y.Z tag counts.** The rehearsal resets to the highest
> tag of the form `vX.Y.Z`, and `/release` counts from the last one, not from any `v*` tag.
> `git tag --sort=-v:refname` ranks `v1.1.0-rc.1` above `v1.0.0` and `v1.0.0-rc.1` above
> `v1.0.0`, so a project tagging pre-releases had its pre-production environment reset to
> a version production never ran. A tag of any other form may mark anything a project
> likes; a project-owned pattern was rejected as a setting no project had asked for.

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **A guard must not run git against the tree under test.** The self-check's export has no
  `.git`. Every git command in the new tests runs in a repository the test created.
- **The Stage 2 test extracts the command from `commands/release.md`, not a copy of it.**
  A test that runs its own copy of the command passes with the command file unchanged.
- **The existing test named `resets to the highest v* tag…` still passes after the change**
  (its tags are all releases). Rename it to `resets to the highest release tag…` and leave
  its body alone.
- **`.claude/commands/release.md` is the installed copy.** Edit `commands/release.md` only.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | Decision 2 |
| `guards/pipeline.test.js` | Task 1 |
| `commands/release.md` | Decision 2 |
| `guards/release.test.js` | Task 2 |
| `templates/README.md` | Decision 3 |
| `framework/workflow.md` | Decision 3 |
| `framework/DECISIONS.md` | Decision 3 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-27-only-release-tags-count-as-production.md` | the handover report |

Another guard may fail because of the wording change, such as `operator-page-closeout` or
`check-drift`. If one does, fix it, list the file in the handover's *Scope* with the
reason, and say so under *What the plan got wrong*.

## Review Focus

Each line is pinned by a test in Tasks 1–2. Review breaks each and expects red.

1. With tags `v1.0.0`, `v1.0.0-rc.1` and `v1.1.0-rc.1`, the rehearsal passes `v1.0.0` to
   `reset.sh` and the summary says ``Reset: to `v1.0.0` ``.
2. With only tags `v1.0.0-rc.1`, `v2` and `release-1.0.0`, `reset.sh` does not run and the
   summary says `Reset: not needed — no release yet`.
3. `/release`'s Stage 2 command, taken from the command file, prints `v1.0.0` on a
   repository where `v1.0.0` is followed by `v1.1.0-rc.1`, and `NO_PREVIOUS_TAG` on one
   whose only tag is `v1.0.0-rc.1`.
4. The workflow document and the operator guide say only a `vX.Y.Z` tag is a release.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: its last line starts `Self-check passed`).

### Task 1 — The rehearsal (criteria 1 and 2)

In `guards/pipeline.test.js`, `describe('candidate rehearse')`, add two tests, then run
them and watch them fail against the current code before changing `scripts/pipeline.mjs`:

- `resets to the highest vX.Y.Z tag, not to a pre-release tag above it`: a repository with
  three commits writing `version.txt` as `v1.0.0-rc.1`, `v1.0.0` and `v1.1.0-rc.1`, each
  tagged with that name, then a fourth commit. `reset.sh` writes `$TROPIS_PRODUCTION_TAG`
  and `$TROPIS_PRODUCTION_DIR/version.txt` to files; `deploy.sh` exits 0. Expect the tag
  file to be `v1.0.0`, the version file `v1.0.0\n`, exit 0, and the summary on stderr equal
  to `summaryFor({ hash, reset: 'to \`v1.0.0\`', deploy: 'deployed', byHand: [] })`.
- `does not run reset when no tag is of the form vX.Y.Z, and says no release yet`: one
  commit tagged `v1.0.0-rc.1`, `v2` and `release-1.0.0`. Expect no `reset-ran.txt`, exit 0,
  and the summary with `reset: 'not needed — no release yet'`.

Rename `resets to the highest v* tag, then deploys, and removes the archive afterwards` to
`resets to the highest release tag, then deploys, and removes the archive afterwards`, and
`does not run reset when no tag matches v*, and says no release yet` to
`does not run reset when there is no tag at all like a release, and says no release yet`.
Leave both bodies as they are.

Then apply Decision 2's code. Run `npx --prefix .tropis jest guards/pipeline.test.js`
(or the runner the self-check uses) until all pass. Commit.

### Task 2 — `/release` Stage 2 (criterion 3)

In `guards/release.test.js` add `describe('the /release last release')`. It reads
`commands/release.md`, takes the slice from `## Stage 2` to `## Stage 3`, and extracts the
first fenced `bash` block's body. Each test creates a repository in a fresh temporary
directory (`mkdtempSync` under `os.tmpdir()`, removed afterwards), with
`git -c user.name=t -c user.email=t@t commit --allow-empty`, and runs the extracted
command with `spawnSync('bash', ['-c', body], { cwd: dir, encoding: 'utf8' })`.

- `counts from the last vX.Y.Z tag, past pre-release tags after it`: commits a, b, c, d;
  `v1.0.0-rc.1` on a, `v1.0.0` on b, `v1.1.0-rc.1` on c, `v2` on d. Expect stdout
  `v1.0.0\n`.
- `says there is no previous release when only other tags exist`: one commit tagged
  `v1.0.0-rc.1`. Expect stdout `NO_PREVIOUS_TAG\n`.
- `leaves out a release the commit does not contain`: commit a tagged `v1.0.0`; a branch
  from a with a commit tagged `v1.1.0`; back on the first branch, one more commit. Expect
  `v1.0.0\n`.

Also assert the Stage 2 slice, whitespace collapsed, contains `the highest tag of the form
\`vX.Y.Z\` that this commit contains`.

Run the three against the current command first and record which fail (the first two must;
the third passes with `git describe` too and is there to pin `--merged`). Then apply
Decision 2's command and paragraph, and run until all pass. Commit.

### Task 3 — The documents (criterion 4)

Apply Decision 3 to `templates/README.md`, `framework/workflow.md` and
`framework/DECISIONS.md`. In `guards/release.test.js`, `describe('the /release candidate')`,
extend `states the release step in the workflow document` with
`expect(workflow).toContain('Only a tag of the form \`vX.Y.Z\` is a release')`, and add a
test reading `templates/README.md` (whitespace collapsed) for
`Only a tag of the form \`vX.Y.Z\`, such as \`v1.4.0\`, counts as a release` and the absence
of `highest tag matching \`v*\``. Run, commit.

### Task 4 — Fresh-agent check

The change touches `framework/workflow.md` and a shipped command, so a fresh agent must
show it finds the rule. Set up a scratch project in the system temp directory from this
worktree with `scripts/set-up-project.sh`, as the 2026-10-26 plan's Task 7 did. Leave
`pipeline/candidate/` empty. Fill `/release`'s project-owned trigger with
`echo release <bump> <commit>`. Set `docs/readme/readme.yaml` to `level: manual`. Give it a
bare `origin` in the temp directory. Make these commits on `main`, with tags:

1. `feat: first feature` — tag `v1.0.0`
2. `feat: second feature` — tag `v1.1.0-rc.1`
3. `fix: a fix` — tag `v1.1.0-rc.2`

Push `main` and the tags. Start each session with `claude -p` and no other context, and say
in the prompt that the work is a probe whose output is discarded.

1. "Run /release up to and including Stage 2, then stop and report the last release, the
   commits in scope and the bump you would propose. Commit nothing." Expected: last release
   `v1.0.0`; commits 2 and 3 in scope; bump minor.
2. "This project tags test builds as v1.2.0-rc.1 and so on. According to the framework
   documents in this project, what version does the release-candidate rehearsal put the
   pre-production environment on, and why? Answer from the documents; change nothing."
   Expected: the highest `vX.Y.Z` tag, `v1.0.0` here, because only such a tag is a release.

If either answer differs, do not edit the text to fit: record the answer verbatim under
*What the plan got wrong* and stop for review. Delete the scratch folder afterwards.

### Task 5 — Verification

Commit, then run `bash scripts/check-blueprint.sh` (expected last line:
`Self-check passed: …`) and `npm --prefix .tropis test`. Record both outputs.

Then make each Review Focus line fail in a throwaway commit and run the self-check, to show
its guard goes red; drop the commit after each. At least: return the first `v*` line in
`highestReleaseTag` (lines 1 and 2), restore `git describe --tags --abbrev=0` in Stage 2
(line 3), drop `--merged HEAD` (line 3, third test), and remove the new workflow bullet
(line 4). Record the failing test names.

### Task 6 — Catalog

In `feature-catalog.yaml`, set `only-release-tags-count-as-production` to `shipped`, set
`modules` to `scripts/pipeline.mjs` and `commands/release.md`, and add to the comment
above the entry a line naming this plan's handover and one line
`Fresh-agent check: <tool, version, machine, outcome from Task 4>`. Map each criterion to
its backing:

| Criterion | Backed by |
|---|---|
| 1 reset to `v1.0.0` with the summary saying so | Task 1 first test |
| 2 no `reset.sh` and "no release yet" with only other tags | Task 1 second test |
| 3 `/release` lists changes since the last `vX.Y.Z` | Task 2 tests, run on the command file's own text; Task 4 probe 1 |
| 4 the workflow document and the operator guide say so | Task 3 phrase checks; Task 4 probe 2 |

If a criterion has no backing, leave the entry at `building` and say so. Commit.

### Task 7 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit it, push the branch, and open a pull request against `main`. Do not merge.

## Not in this plan

- No `/manual-check`: nothing here has a screen or a deployed instance. The rehearsal's
  GitHub wiring is unchanged, so the probe runs of the 2026-10-26 plan still hold.
- `scripts/set-up-project.sh` and `scripts/check-version.mjs` read Tropis's own tags, not a
  project's releases, and are left as they are.
- `RELEASES.md`: `/release` drafts the notes from the backlog.

## Handover report

### Task completion

Every task done.

- Task 0. Worktree `~/src/tropis-release-tags`, branch `plan/only-release-tags-count-as-production`, from `9459de1`. `npm --prefix .tropis ci` installed 269 packages. `git status --porcelain` printed nothing. `bash scripts/check-blueprint.sh` ended `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1. The two new rehearsal tests failed first (`saw-tag.txt` was `v1.1.0-rc.1`; `reset-ran.txt` existed). After `highestReleaseTag`, `guards/pipeline.test.js` was 76 passed. Commit `2ce157b`.
- Task 2. Against the old Stage 2 command, `counts from the last vX.Y.Z tag…` received `v2`, `says there is no previous release…` received `v1.0.0-rc.1`, and `leaves out a release the commit does not contain` passed. The new paragraph assertion failed. After the command and paragraph, `guards/release.test.js` was 43 passed. Commit `ae7c3d9`.
- Task 3. The two phrase assertions failed first (the sentences were absent). After Decision 3, `guards/release.test.js` was 44 passed. Commit `3ff3b55`.
- Task 4. Both probes matched. Scratch project deleted. Recorded under Verification results.
- Task 5. Nothing was uncommitted, so there was no extra commit before the checks. Self-check and `npm --prefix .tropis test` passed at `3ff3b55`. Each review-focus break was a throwaway commit, the self-check went red, and the commit was dropped. HEAD was `3ff3b55` again after each.
- Task 6. Entry shipped. All four criteria have the backing in the plan's table. Commit `432426e`.
- Task 7. This report.

### Verification results

`bash scripts/check-blueprint.sh` at `3ff3b55`:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

`npm --prefix .tropis test` at `3ff3b55`:

```
Test Suites: 5 passed, 5 total
Tests:       31 passed, 31 total
```

Review-focus breaks, each a throwaway commit then `bash scripts/check-blueprint.sh`, then `git reset --hard 3ff3b55`. Every run exited 1 with `Self-check FAILED: conformance or the clean baseline (above).` and `FAILED clean baseline`. Failing tests:

| Break | Failing test |
|---|---|
| first `v*` line from `highestReleaseTag` | `candidate rehearse › resets to the highest vX.Y.Z tag, not to a pre-release tag above it` |
| same break | `candidate rehearse › does not run reset when no tag is of the form vX.Y.Z, and says no release yet` |
| Stage 2 restored to `git describe --tags --abbrev=0` | `the /release last release › counts from the last vX.Y.Z tag, past pre-release tags after it` |
| same break | `the /release last release › says there is no previous release when only other tags exist` |
| `--merged HEAD` removed | `the /release last release › leaves out a release the commit does not contain` |
| new workflow bullet removed | `the /release candidate › states the release step in the workflow document` |

The workflow-bullet run also named `take-version.mjs › removes its scratch folder on every exit path`. That test does not read `framework/workflow.md`. Another session was running `guards/take-version.test.js` at the same time, and the test fails when any unexpected take-version directory appears under the temp directory. The expected workflow test failed in the same run.

Fresh-agent check. Tool: Claude Code 2.1.300 (`claude -p --dangerously-skip-permissions`). Machine: dev-laptop.local, Darwin arm64, macOS 26.2. Scratch project from this worktree via `scripts/set-up-project.sh`, `pipeline/candidate/` absent, `docs/readme/readme.yaml` at `level: manual`, bare `origin`, tags `v1.0.0`, `v1.1.0-rc.1`, `v1.1.0-rc.2` on the three commits. Both sessions left the tree clean at `d2e0d83`.

Probe 1 reported last release `v1.0.0`, commits `de13ffa` feat: second feature and `d2e0d83` fix: a fix in scope, proposed bump minor. Probe 2 reported the highest tag of the form `vX.Y.Z`, `v1.0.0` in that repository, because a tag such as `v1.2.0-rc.1` is not a release.

### Scope

Worktree: `~/src/tropis-release-tags`.

`git diff --stat origin/main...HEAD` after this report is committed:

```
 commands/release.md                                |  6 +-
 ...-10-27-only-release-tags-count-as-production.md | 88 +++++++++++++++++++++
 feature-catalog.yaml                               |  8 +-
 framework/DECISIONS.md                             |  7 ++
 framework/workflow.md                              |  6 ++
 guards/pipeline.test.js                            | 54 ++++++++++++-
 guards/release.test.js                             | 91 +++++++++++++++++++++-
 scripts/pipeline.mjs                               | 13 +++-
 templates/README.md                                |  3 +-
 9 files changed, 264 insertions(+), 12 deletions(-)
```

Every path is in the File Structure table. `docs/backlog-board/bands.yaml` is not in the diff.

### Judgment calls

- Task 3's text was applied after the new assertions had failed, so the tests were seen red. The plan names the documents first and the assertions second; the commit is the same set of files.
- The source tree has no root `package.json`. Each Jest run of `guards/` used a temporary `{"type":"module"}` and a `node_modules` link to `.tropis/node_modules`, both removed before the next commit. The self-check does not need them.
- The superpowers ledger scripts are not in the installed skill. Progress was kept in the session, not in a committed file.
- The scratch project's release block also names the root, `RELEASES.md`, readers, and a breaking rule, and `templates/RELEASES.md` was copied to `RELEASES.md`, so `/release` could get through Stage 1. The plan names the trigger. `npm --prefix .tropis install` was run there. The setup files are inside `feat: first feature`, which is the `v1.0.0` commit, so they are outside the release window.
- `claude -p` was given `--dangerously-skip-permissions` so the probe could run git and read files without a prompt. The prompts were otherwise the plan's, plus the sentence that the work is a probe and will be discarded.

### What the plan got wrong

The code claims matched this tree: `highestVersionTag` was the first non-empty `v*` line, Stage 2 was `git describe --tags --abbrev=0`, and the third Stage 2 test passed on that command. Nothing in the implementation had to depart from Decision 2 or 3.

The workflow-bullet self-check named a second test, as recorded above. That is not a failure of the bullet.

### Outstanding

- `docs/backlog-board/bands.yaml` still has a row for `only-release-tags-count-as-production`. No guard failed on it. `node scripts/build-backlog-board.mjs` prints shipped entries as bands to delete. The file is not in this plan's table, so it was left for the reviewer.
- Merge is parent review. This branch is not merged.
- No screen and no deployed instance, so there is nothing for the developer to click. The plan says the 2026-10-26 probe runs still hold for the GitHub wiring, which this plan does not change.

## Review record

Reviewed by the specifying session on 2026-10-27, on dev-laptop.local,
macOS 26.2 (Darwin 25.2.0, arm64), Node v22.15.0, git 2.49.0, Claude Code (Opus 5.5), at
`39cc907`, in a detached worktree `../tropis-review-129`.

### Checks re-run

- `git diff --stat origin/main...origin/plan/only-release-tags-count-as-production`:
  9 files, 264 insertions, 12 deletions. Every file is in the File Structure table.
  `origin/main` is still `9459de1`, the branch's base, so no rebase was needed.
- The diff of `scripts/pipeline.mjs`, `commands/release.md`, `templates/README.md`,
  `framework/workflow.md` and `framework/DECISIONS.md` was read against Decisions 2 and 3:
  the code and every sentence match.
- `bash scripts/check-blueprint.sh` at `39cc907`: `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards
  passed.`
- `npm --prefix .tropis test`: 5 suites, 31 tests, all passed.
- `guards/pipeline.test.js` and `guards/release.test.js` on a `git archive` of `39cc907`,
  staged as the self-check stages it: 120 tests passed. Each break below was made in a
  fresh staged copy and the two guards run:

  | Broken | Failing test |
  |---|---|
  | `highestReleaseTag` returns the first `v*` line (1, 2) | `candidate rehearse › resets to the highest vX.Y.Z tag, not to a pre-release tag above it`; `… › does not run reset when no tag is of the form vX.Y.Z, and says no release yet` |
  | `RELEASE_TAG` accepts any tag without a `-` (2) | `candidate rehearse › does not run reset when no tag is of the form vX.Y.Z…` (its `v2`) |
  | Stage 2 back to `git describe --tags --abbrev=0` (3) | `the /release last release › counts from the last vX.Y.Z tag…`; `… › says there is no previous release when only other tags exist` |
  | `--merged HEAD` dropped (3) | `the /release last release › leaves out a release the commit does not contain` |
  | Stage 2's pattern also accepts `-…` suffixes (3) | 2 failed |
  | the workflow bullet removed (4) | 1 failed |
  | the guide sentence reverted (4) | 1 failed |

- The pull request's pipeline: `plan` and `framework / checks` passed when this record was
  written; `unit` was still running.
- The fresh-agent probes were not re-run. Their reported answers are the plan's expected
  ones, and the probe prompts aimed at the two clauses the plan added.
- The handover's diagnosis of the extra `take-version` failure in one break run, another
  session running that guard at the same time, was not tested. It does not recur: the
  clean self-check above and the staged runs show no `take-version` failure.

### Found

Nothing the handover did not report.

### Outstanding disposition

- `docs/backlog-board/bands.yaml` still bands this entry: dropped. Pruning shipped entries
  from the board is what `/refresh-board` does on `main`, as in `db73d0c`.
- No criterion is left for the developer to observe: nothing here has a screen or a
  deployed instance.

### Learnings routed

None. The plan's two carried lessons from the previous review (tests make their own
repositories; the scratch project needs a README level) held, and nothing new
generalises.

### Merged because

Every Review Focus line is pinned by a guard that goes red when it is broken, the
self-check and the installed tests are green, the scope matches the table, and both
fresh-agent probes found the new rule.
