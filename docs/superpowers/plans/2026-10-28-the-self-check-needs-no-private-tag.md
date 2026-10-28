# The self-check runs in the public repository — Implementation Plan

> **For agentic workers:** read the whole plan before starting. Its Global Constraints and
> Traps bind you, and it says what to report and who merges.

**Goal:** `bash scripts/check-blueprint.sh` passes in a clone of the public
`fcapurso/tropis` that has no tags, because `take-version` no longer supports projects
that hold the framework in `.framework/`, and nothing in the self-check reads the
`v0.1.0` tag any more.

**Why:** the public repository's history starts at one commit, `21b855f`, made from the
private archive's `main` (plan docs/superpowers/plans/2026-10-28-tropis-is-public.md).
The archive's tags were not carried over, and `v0.1.0` cannot be: its commit is in the
private history, and its tree holds 187 private-material hits by the private-material
guard's scan. The public pipeline's unit stage (`pipeline/unit.sh`, which runs the
self-check) has been red since its first run, run 1 on `21b855f`, which stopped before
any test ran:

```
The self-check needs the tag v0.1.0: git fetch --tags.
```

`scripts/check-blueprint.sh` extracts the `v0.1.0` tree into `TROPIS_V010` for the
tests in `guards/take-version.test.js` that build a project on that layout. On
2026-10-28 the developer decided that **no project needs to move off the `.framework/`
layout any more**, neither a `v0.1.0` install nor a later areas-layout install still in
`.framework/`: the one adopting project is on `.tropis/`, and the next one will be set
up fresh. So the migration goes, and with it the need for the tag.

**What the specifying session verified on 2026-10-28, against `fcapurso/tropis` `main`
at `21b855f`, with git 2.43.0 and Node v22.22.0, in a Claude Code cloud session on Linux
x86_64:**

- In `guards/take-version.test.js`, only `worldV010()` and `inV010()` read
  `TROPIS_V010`. `world()`, which 35 tests use through `inWorld(`, builds its scratch
  Tropis from this checkout's source folders and reads no tag.
- Eight tests use `inV010` or `worldV010`, and all eight are about the old layout:
  `moves an untouched v0.1.0 project to .tropis/`, `keeps a widened area from a v0.1.0
  rule header`, `keeps edited v0.1.0 rule text for the operator`, `keeps a project rule
  and regenerates its old cursor file`, `keeps a project hook and rewrites a permissions
  entry`, `uses the new default area when a shipped v0.1.0 rule was deleted`, `moves an
  areas-layout project that already has a record`, and `throws when TROPIS_V010 is unset`.
- Two `inWorld` tests name `.framework/` in their expectations: `refuses a project that
  has both folders, changing nothing` and `refuses a project that has neither folder,
  changing nothing`. `guards/set-up-project.test.js` has `refuses a project that already
  holds the framework in .framework/`.
- Code that handles the old layout, outside the installed release:
  `scripts/take-version.mjs` (the layout detection near `hasFramework`, `legacyFiles`,
  the rename and rewrite near `renameSync(join(input.project, '.framework')…`, the
  `v0.1.0` areas build described above its `A v0.1.0 install keeps its areas` comment,
  the `.framework/hooks/` branch in the hook matcher, and the report lines `Moved
  .framework/ to .tropis/`, `Rewrote .framework/ to .tropis/ in:` and `Still names
  .framework/:`); `scripts/check-version.mjs` (`dependencyLink` looks in `.framework`
  too); `scripts/set-up-project.sh` (refuses a project with `.framework/` and tells it to
  run take-version); `templates/README.md` (the operator guide says a project in
  `.framework/` is moved by the same command); `framework/DECISIONS.md` FW-015, which
  records the migration.
- `scripts/check-blueprint.sh` lines 48–64 make and clean up `TROPIS_V010`.
  `pipeline/unit.sh` unshallows the checkout and fetches tags "because the self-check
  needs the release tags".

**Model tier: Medium.** The target is stated; the judgment is in removing a code path
from `take-version.mjs` without disturbing the current-layout path around it.

**Requires:** nothing from the developer.

**Merge authority: parent review.** The specifying session reviews and merges.

---

## Delivers

the-self-check-needs-no-private-tag

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-no-private-tag -b plan/the-self-check-needs-no-private-tag` |

The `tropis` checkout must be a clone of the **public** `https://github.com/fcapurso/tropis`
(its `origin`), based on its `main`. Check with `git remote get-url origin` and
`git log --oneline -1 origin/main` before isolating; the first public commit is `21b855f`.

## Global Constraints

- **Do not skip, weaken or delete a test that does not exercise the `.framework/`
  layout.** Every test removed is one of the eight named above; every other test
  stays, changed only where its expectation names `.framework/`.
- **Do not add a fixture built from the `v0.1.0` tree** or from any file of the private
  history. The point is that the public repository needs nothing it cannot have.
- **Change nothing under `.claude/`, `.tropis/` or `.cursor/`.** They are the installed
  release, and change only by taking one.
- **Every commit has a body.** This repository is public: read your own diff for
  people's names, other projects' names, home paths and hostnames before pushing, and
  record a measurement by its tool, version, operating system and architecture, never
  the computer.

## Traps

- **A self-check run in a checkout that holds the archive's tags cannot fail on this.**
  That is how the defect reached the public repository. Run the self-check that this
  plan's criteria name in a clone with **no tags at all** (Task 4 says how), and check
  `git tag | wc -l` prints `0` there before trusting its result.
- **A project that holds only `.framework/` must still be refused, not set up or
  updated into a mess.** Retiring the migration means refusing that layout with a clear
  message, not forgetting it exists.
- The private-material guard scans every committed file outside the installed release,
  plans included. Do not quote a real kernel build string or a hostname in the
  handover, not even as an example.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | Task 1: the `.framework/` and `v0.1.0` paths removed; a project with `.framework/` refused |
| `scripts/check-version.mjs` | Task 1: `dependencyLink` looks only in `.tropis` |
| `scripts/set-up-project.sh` | Task 1: the `.framework/` refusal says to remove the folder, not to run take-version |
| `guards/take-version.test.js` | Task 2: `worldV010`, `inV010`, the eight tests, and any helper only they used, removed; the two refusal tests updated; one test added |
| `guards/set-up-project.test.js` | Task 2: the refusal message updated |
| `scripts/check-blueprint.sh` | Task 3: the `v0.1.0` and `TROPIS_V010` steps removed |
| `pipeline/unit.sh` | Task 3: the tag fetch removed, or its comment corrected (see Task 3) |
| `templates/README.md` | Task 1: the sentence about moving `.framework/` removed |
| `framework/DECISIONS.md` | Task 5: FW-033, which supersedes FW-015's migration |
| `RELEASES.md` | Task 5: one line under `## [Unreleased]` |
| `feature-catalog.yaml` | Task 5: the entry to `shipped`, with a comment naming this plan |
| `docs/superpowers/plans/2026-10-28-the-self-check-needs-no-private-tag.md` | Task 6: the handover report |

## Tasks

### Task 1 — `take-version` supports only `.tropis/`

In `scripts/take-version.mjs`, remove every path that reads, detects, moves or rewrites
`.framework/`, and the `v0.1.0` install path (areas from rule headers, rule text kept
for the operator, shipped rule files deleted). The current-layout path must behave
exactly as before.

A project that has `.framework/` is refused before any write, with exactly:

```
take-version: <project> holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and set the project up again with scripts/set-up-project.sh.
```

whether or not it also has `.tropis/`. A project with neither folder keeps its refusal,
reworded to name only `.tropis/`:

```
take-version: <project> has no .tropis/. Set it up with scripts/set-up-project.sh first.
```

Update the file's header comment to match. In `scripts/check-version.mjs`,
`dependencyLink` looks only in `.tropis`. In `scripts/set-up-project.sh`, the refusal for
a project with `.framework/` becomes:

```
set-up-project: <project> holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and run this again.
```

In `templates/README.md`, delete the sentence beginning "A project that still holds the
framework in `.framework/`". Change nothing else on that paragraph.

### Task 2 — the tests

In `guards/take-version.test.js`: remove `worldV010`, `inV010`, the eight tests named in
*What the specifying session verified*, and any helper left unused by that (check
`copySource` and `renameSync` in the imports). Update the two refusal tests to the new
messages, and rename the "both folders" test to say what it now checks. Add one test,
built with `inWorld`, that a project holding only `.framework/` (rename the scratch
project's `.tropis/` to it and commit) is refused with the new message and that
`snapshot(w.project)` is identical before and after.

In `guards/set-up-project.test.js`, update the expected refusal message.

Run `npm --prefix .tropis test` after each change. It runs the installed release's
checks on this repository, not these source tests, so also run the source tests the way
the self-check does: Task 4.

### Task 3 — the self-check needs no tag

In `scripts/check-blueprint.sh`, remove the `v0.1.0` check, the `TROPIS_V010` export, the
folder it makes and its clean-up, and their comment.

Then decide `pipeline/unit.sh` by evidence, not by guess: run `git grep -nE "git
(describe|tag|rev-parse)|refs/tags|TROPIS_V" -- scripts guards templates` and read each
hit that the self-check runs. If nothing in the self-check reads a tag of this
repository, remove the unshallow-and-fetch block; otherwise keep it and correct its
comment to name what needs the tags. Say which, and why, in the handover.

### Task 4 — verification, in a clone with no tags

Commit first: the self-check reads committed content only. Then:

```bash
rm -rf ../tropis-tagless
git clone --quiet --no-tags --single-branch --branch plan/the-self-check-needs-no-private-tag \
  "$(pwd)" ../tropis-tagless
git -C ../tropis-tagless tag | wc -l           # must print 0
(cd ../tropis-tagless && npm --prefix .tropis ci && bash scripts/check-blueprint.sh)
```

The self-check must pass there. Also, in the worktree:

```bash
npm --prefix .tropis test
git grep -nE 'TROPIS_V010|v0\.1\.0' -- scripts guards templates pipeline
git grep -nF '.framework/' -- scripts guards templates
```

The first must pass. The second must print only `guards/installed-files.test.js` and
`guards/release.test.js`, which use `v0.1.0` as a version string, not as the tag. Show
the third's every remaining hit and why it stays: only the refusals and their tests.

To show the self-check would have caught the defect, make a throwaway commit that
restores `scripts/check-blueprint.sh` from `origin/main`, clone that commit the same
tagless way, run the self-check there and record that it stops with `The self-check
needs the tag v0.1.0`, then drop the commit.

### Task 5 — the record

- `framework/DECISIONS.md`: add **FW-033: A project in `.framework/` is set up afresh,
  not moved**, dated 2026-10-28, Accepted. Decision: `take-version` and setup refuse a
  project holding `.framework/`, and the migration FW-015 described is removed.
  Evidence: the public repository cannot carry the `v0.1.0` tag its tests needed (see
  *Why*), and no adopting project is on that layout. Rejected: a fixture built from the
  `v0.1.0` tree, since that tree holds private material; skipping the tests when the tag
  is absent, since the public pipeline would then check less than it claims.
  Consequences: a project still in `.framework/` must set up again. In FW-015's
  **Status**, write `Accepted; its migration superseded by FW-033`.
- `RELEASES.md`, under `## [Unreleased]`: a line saying that a project which still holds
  the framework in `.framework/` can no longer update and must be set up again, and that
  projects in `.tropis/` are unaffected. Keep whatever is already there.
- `feature-catalog.yaml`: set `the-self-check-needs-no-private-tag` to `shipped` and add a
  comment above it naming this plan and which task meets each criterion.

### Task 6 — handover report

Append `## Handover report` to this plan with the six sections the planning rule names,
commit it, push the branch to `origin` and open a pull request. Do not merge.

## Handover report

### Task completion

Tasks 1 through 5 are done and committed as `b655d20`. Task 6 is this report. Nothing was skipped. No step needed the developer.

### Verification results

Ran on macOS 26.2, Darwin arm64, with git 2.49.0 and Node v22.15.0.

`npm --prefix .tropis test` in the worktree, exit 0:

```
Test Suites: 6 passed, 6 total
Tests:       33 passed, 33 total
Time:        0.889 s
```

Before that commit, `guards/take-version.test.js` run directly with Jest 30 from `.tropis/node_modules` (the self-check's config, on the working tree) printed `Tests: 40 passed, 40 total` in 83s. `guards/set-up-project.test.js` the same way printed `Tests: 1 failed, 17 passed, 18 total`. The failure was `records every shipped file at version unknown`, which expected `unknown` and received a `git describe` string, because that run was in a checkout that has tags. The self-check below is the run the plan names: its stage is an export with no `.git`, and its clean baseline passed.

Tagless clone of `plan/the-self-check-needs-no-private-tag` at `b655d20`, then `npm --prefix .tropis ci` and `bash scripts/check-blueprint.sh`. `git tag | wc -l` printed `       0` (the count is 0; `wc` pads). The self-check exited 0. Last line:

```
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

It named the commit `b655d20`. The absolute clone path is a home path and is omitted.

`git grep -nE 'TROPIS_V010|v0\.1\.0' -- scripts guards templates pipeline` printed only:

```
guards/installed-files.test.js:249:        version: 'v0.1.0',
guards/installed-files.test.js:271:        version: 'v0.1.0',
guards/release.test.js:43:    expect(() => nextVersion('huge', 'v0.1.0')).toThrow(/bump/);
```

Both use `v0.1.0` as a version string. `TROPIS_V010` is gone.

`git grep -nF '.framework/' -- scripts guards templates` printed only the refusals and the tests that build the refused layout:

```
guards/set-up-project.test.js:351:  it('refuses a project that already holds the framework in .framework/', () => {
guards/set-up-project.test.js:355:      writeFileSync(join(dir, '.framework/installed.json'), '{}\n');
guards/set-up-project.test.js:363:        `set-up-project: ${project} holds the framework in .framework/, a layout this release no longer takes. `
guards/set-up-project.test.js:364:        + `Remove .framework/, commit, and run this again.\n`,
guards/take-version.test.js:629:  it('refuses a project that holds .framework/ beside .tropis/, changing nothing', () => inWorld({}, (w) => {
guards/take-version.test.js:632:    write(w.project, '.framework/marker', 'old\n');
guards/take-version.test.js:639:      `take-version: ${w.project} holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and set the project up again with scripts/set-up-project.sh.\n`,
guards/take-version.test.js:658:  it('refuses a project that holds only .framework/, changing nothing', () => inWorld({}, (w) => {
guards/take-version.test.js:667:      `take-version: ${w.project} holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and set the project up again with scripts/set-up-project.sh.\n`,
scripts/set-up-project.sh:28:  echo "set-up-project: $PROJECT holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and run this again." >&2
scripts/take-version.mjs:309:    refuse(`${project} holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and set the project up again with scripts/set-up-project.sh.`);
```

The lines that are not the refusal message are the tests constructing the folder the refusal is about.

Throwaway commit restoring `scripts/check-blueprint.sh` from `origin/main`, cloned the same tagless way (`wc -l` again `       0`). `bash scripts/check-blueprint.sh` exited 2 and printed:

```
The self-check needs the tag v0.1.0: git fetch --tags.
```

That commit was then dropped. `HEAD` is `b655d20`, and that sentence is absent from `scripts/check-blueprint.sh`.

`pipeline/unit.sh`: the plan's grep, run before the `TROPIS_V010` lines were removed, hit `scripts/check-blueprint.sh` (the tag export), `git rev-parse` in `scripts/capture-at-merge.sh`, `scripts/capture-at-write.sh`, `scripts/probe-hook-channels.sh` and `scripts/public-exposure-check.sh` (repository root or branch name), and `guards/release.test.js` matching the words `git tag` and `git rev-parse` in the release job's text. Nothing else in that list reads a tag of this repository, so the unshallow-and-fetch block was removed. `scripts/set-up-project.sh` still runs `git describe --tags --always`; that line is not a hit of the plan's pattern (`git -C`, not `git describe`), and `--always` names the commit when no tag exists.

### Scope

`git diff --stat origin/main...HEAD` at `b655d20`, before this report:

```
 RELEASES.md                   |   3 +-
 feature-catalog.yaml          |   5 +-
 framework/DECISIONS.md        |  21 +++-
 guards/set-up-project.test.js |   4 +-
 guards/take-version.test.js   | 267 +++------------------------------------
 pipeline/unit.sh              |   4 -
 scripts/check-blueprint.sh    |  12 --
 scripts/check-version.mjs     |   4 +-
 scripts/set-up-project.sh     |   6 +-
 scripts/take-version.mjs      | 287 ++++--------------------------------------
 templates/README.md           |   5 +-
 11 files changed, 78 insertions(+), 540 deletions(-)
```

Every one of those files is in the File Structure table. This report's commit adds only this plan, which the table also names.

Isolation: a sibling worktree `tropis-no-private-tag` of a clone whose `origin` is `https://github.com/fcapurso/tropis.git`, on `main` at `0f75a2d` (the public repository; the first commit is `21b855f`). Created by `isolate-for-plan.sh`. The archive checkout was not used. The absolute path is a home path and is omitted.

### Judgment calls

- Header comments in `scripts/take-version.mjs` and `scripts/set-up-project.sh` do not contain the characters `.framework/`. The verification grep would otherwise have counted them, and the plan says the remaining hits are the refusals and their tests. The refusal strings are unchanged from the plan.
- `apply` no longer carries a migration report. On the current layout that report was empty, and the install line still prints only when the package file changed.
- FW-033 names this plan in plain text. A path in backticks in `framework/DECISIONS.md` is copied into projects that do not have the plan.
- `## [Unreleased]` held only the placeholder `_Nothing yet._`. That line was replaced by the note. Nothing else was under the heading.
- The three package-name tests that sit in the file between the old-layout tests were kept. They use `inWorld` and do not exercise the old layout.

### What the plan got wrong

The eight tests to remove are not one contiguous block. `keeps the package name when the update runs in a folder of another name`, `keeps the package name with --from when there is no record`, and `names the package after the folder when the package names nothing` sit between `moves an areas-layout project that already has a record` and `throws when TROPIS_V010 is unset`.

The sentence in `templates/README.md` after the one the plan deletes still says edited text from a shipped rule is left in `.claude/rule-additions/<n>.md.old`. `take-version` no longer does that. The plan said to change nothing else on that paragraph, so the sentence is still there.

`git tag | wc -l` on this platform prints a space-padded `0`, not the digit alone.

### Outstanding

The specifying session reviews and merges. This branch is not merged.

The installed release under `.claude/`, `.tropis/` and `.cursor/` still describes the migration. This plan forbids editing those directories; they change when a release is taken.
