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
