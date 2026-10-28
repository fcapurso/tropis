# An update keeps the framework package's name — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** an update reads the name a project was set up with from the project's own
framework package, `.tropis/package.json`, and builds its scratch copies of both releases
under that name. A project updated in a worktree or a renamed folder then keeps its
package name, and a package file it left as shipped takes the new release's changes in
place rather than as a `.new` file.

**Spec:** the entry `update-keeps-the-package-name` in `feature-catalog.yaml`, its four
criteria and the comment above it. *Decisions* below settles what the entry leaves open.
Do not reopen them.

**Read first:** the review record of
`docs/superpowers/plans/2026-10-17-this-repository-takes-v0-3-1.md`, whose *Found* records
this defect (the take named this repository's package `tropis-take-v031-framework`), and
the review record of `docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md`,
which also changed `scripts/take-version.mjs`. What they teach for this plan:

- `guards/take-version.test.js` needs `TROPIS_V010` (a folder holding `git archive v0.1.0`),
  which `bash scripts/check-blueprint.sh` sets. To run that file alone, export it yourself
  (Task 0).
- The take promises that every refusal comes before any write. This plan adds no refusal.

**What the specifying session verified on 2026-10-27, against `main` at `c9c0499`, with
git 2.43.0 and Node v22.22.0 in a Claude Code cloud session (Linux 6.18, x86_64):**

- In `scripts/take-version.mjs`, `takeVersion()` has `const name = basename(project);` and
  passes `name` to both `buildVersion(from, tmp, 'from', name)` (only when there is no
  record and `--from` is given) and `buildVersion(target, tmp, 'to', name)`. It has computed
  `const folder = layout === 'current' ? '.tropis' : '.framework';` a few lines earlier.
  `basename` has no other use in the file today, and `readFileSync` and `join` are already
  imported.
- `buildVersion(version, tmp, label, name)` sets the release up in `<tmp>/<label>/out/<name>`
  with that release's `scripts/set-up-project.sh`.
- `scripts/set-up-project.sh` names the package after the folder it runs in:
  `slug=$(basename "$PROJECT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')`,
  then `sed "s/PROJECT_SLUG/$slug/"` over `templates/package.json`, whose name is
  `PROJECT_SLUG-framework`. `v0.1.0`, `v0.2.0` and `v0.4.2` all have that template name and
  the same slug line (`v0.1.0` writes `.framework/package.json`).
- So today: with a record, the project's unchanged `.tropis/package.json` matches the
  record's fingerprint and is replaced with the new release's file, named after the folder
  the update ran in. With `--from`, the baseline is also built under that folder's name, so
  the project's file no longer matches it; when the new release changes
  `templates/package.json`, the update writes `.tropis/package.json.new` for a file the
  project never touched.
- This repository's `.tropis/package.json` is named `tropis-framework` today.
- `guards/take-version.test.js` sets a project up in `<tmp>/example-project` (`world()`),
  exposes `w.project`, `w.tropis`, `w.release(tag, change)`, `w.commit()` and
  `w.take(ref, ...flags)`, which runs the command on `w.project` only. `needs --from when
  there is no record` shows how a project without a record is made.
  `recordProblems` (the installed-files check) and `fingerprint` are already imported.

**Model tier: Small.** The code is given verbatim, and each test is described step by step
in an existing test world.

**Requires:** nothing beyond the repository.

**Merge authority: self-merge.** Every criterion is checked by a test, and the change is
one function in a script that runs only when a developer takes an update. The executor
writes the review record before merging (see Task 5).

Do not store a kick-off prompt on this plan.

---

## Delivers

update-keeps-the-package-name

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-package-name -b plan/update-keeps-the-package-name` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`.** This repository's own `.tropis/package.json` keeps the name it has.
- **Add no dependency.** Use `node:` modules.
- **Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.**

## Decisions

Taken by the specifying session on 2026-10-27.

### 1. The name comes from the framework package

The name is read from `<folder>/package.json` (`.tropis/` or, on an earlier install,
`.framework/`), dropping a trailing `-framework` and turning it into a slug the same way
setup does. It is used as the scratch folder's name, so setup derives the same name again.
When the file is missing, unreadable, or names nothing that leaves a slug, the folder's
name is used, as today.

**Rejected:** the root `package.json` (it is the product's, not the framework's, and setup
never used its name); rewriting the new release's package name after the build (the
`--from` baseline would still be built under the wrong name, and the false `.new` stays);
renaming a package an earlier update already got wrong (the project may have kept that
name on purpose, and it is not what the entry asks).

### 2. The code

In `scripts/take-version.mjs`, add above `takeVersion()`:

```js
/**
 * The name the project was set up under. Setup names the framework package
 * `<slug>-framework` after the folder it ran in, so the slug is read back from that
 * package, and an update run in a worktree or a renamed folder builds its scratch copies
 * under the same name. The folder's name when the package is missing or names nothing.
 */
function setupName(project, folder) {
  let name = '';
  try {
    name = String(JSON.parse(readFileSync(join(project, folder, 'package.json'), 'utf8')).name ?? '');
  } catch {
    name = '';
  }
  const slug = name.replace(/-framework$/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || basename(project);
}
```

and replace `const name = basename(project);` with `const name = setupName(project, folder);`.

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **`w.take()` always runs on `w.project`.** The new tests run the command on a worktree, so
  they call `spawnSync('node', [join(w.tropis, 'scripts/take-version.mjs'), <worktree>, ...flags], { encoding: 'utf8' })`
  after `git -C <w.tropis> checkout -q <tag>`, as `take()` does.
- **The worktree is a git worktree of the project**, created with `git -C <w.project>
  worktree add -q <w.parent>/example-project-update -b update`. Its root is a repository
  root, so the take accepts it. This is a test fixture, not this plan's isolation.
- **Plan `export-ignore-lines-match-only-at-the-root` also edits `scripts/take-version.mjs`
  and `guards/take-version.test.js`**, in other functions. Whichever lands second rebases
  onto `origin/main` and re-runs its criteria; the edits do not overlap.
- **`guards/set-up-project.test.js` fails `records every shipped file at version unknown`
  when run from a tagged checkout.** That predates this plan.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | Decision 2 |
| `guards/take-version.test.js` | Task 1 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-27-update-keeps-the-package-name.md` | the handover report and the review record |

## Review Focus

Each line is pinned by a test in Task 1.

1. An update run in a worktree named `example-project-update` leaves the package named
   `example-project-framework`.
2. In that update, when the new release adds a script to `templates/package.json`, the
   project's unchanged package takes it in place: no `.tropis/package.json.new`, the
   installed-files check passes.
3. The same with no record and `--from v0.2.0`.
4. A package with no `name` falls back to the folder's name.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`git fetch --tags origin` and `bash scripts/check-blueprint.sh` (expected: its last line
starts `Self-check passed`).

To run one guard file alone: the source tree has no root `package.json`, so put a
temporary `{"type":"module"}` `package.json` and a `node_modules` link to
`.tropis/node_modules` at the worktree root, export `TROPIS_V010` as a folder holding
`git archive v0.1.0 | tar -x`, and run
`node --experimental-vm-modules .tropis/node_modules/.bin/jest guards/take-version.test.js`.
Remove the two temporary files before every commit.

### Task 1 — Tests first, then the code

In `guards/take-version.test.js`, add a small helper beside the others that makes the
worktree and runs the command on it (see *Traps*), and these tests. In each, the release
`v0.2.1` adds a script `"extra": "echo extra"` to `templates/package.json`'s `scripts`
(edit the JSON and assert the edit changed the text).

- `keeps the package name when the update runs in a folder of another name`: take `v0.2.1`
  in the worktree. Expect exit 0, empty stderr, `.tropis/package.json`'s `name` to be
  `example-project-framework`, its `scripts.extra` to be `echo extra`, no
  `.tropis/package.json.new`, and `recordProblems(<worktree>)` to be `[]`.
- `keeps the package name with --from when there is no record`: in the project, delete
  `.tropis/installed.json` and commit before making the worktree; take `v0.2.1` in the
  worktree with `--from v0.2.0`. Expect the same four things.
- `names the package after the folder when the package names nothing`: in the project,
  delete `name` from `.tropis/package.json` and commit before making the worktree; take
  `v0.2.1` in the worktree. Expect exit 0, `.tropis/package.json` left as committed (the
  project changed it), and `.tropis/package.json.new`'s `name` to be
  `example-project-update-framework`.

Run them against the current code and record which fail (the first two must). Then apply
Decision 2. Run the file until it passes. Commit.

### Task 2 — Verification

Commit, then run `bash scripts/check-blueprint.sh` (expected last line:
`Self-check passed: …`) and `npm --prefix .tropis test`. Record both outputs.

Make each Review Focus line fail in a throwaway commit and run the self-check; drop the
commit after each. At least: restore `const name = basename(project);` (lines 1–3), and
make `setupName` return `''` instead of `basename(project)` as its fallback (line 4).
Record the failing test names.

No fresh-agent check: the plan changes no file under `framework/` or `rules/`, and no
command.

### Task 3 — Catalog

In `feature-catalog.yaml`, set `update-keeps-the-package-name` to `shipped`, set `modules`
to `scripts/take-version.mjs`, and add to the comment above the entry a line naming this
plan's handover. Each criterion is backed by the Task 1 test of the same order (criteria 1
and 2 by the first test, 3 by the second, 4 by the third). If one has no backing, leave the
entry at `shaped` and say so. Commit.

### Task 4 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit it, push the branch, and open a pull request against `main`.

### Task 5 — Review record and merge

This plan self-merges, so the executor writes `## Review record` below the handover report,
with the five sections the planning rule names, and commits it before merging:
`review-record.test.js` fails `main` for a plan whose handover is there without one. Wait
for the pull request's checks to finish green — the host marks none as required, so an
auto-merge would not wait. Then follow `.claude/framework/workflow.md`, *Merge and clean
up — in this order*, with the subject
`fix(update): an update keeps the framework package's name`.

## Not in this plan

- No `/manual-check`: nothing here has a screen or a deployed instance.
- `scripts/set-up-project.sh` keeps naming a new project's package after its folder.
- `RELEASES.md`: `/release` drafts the notes from the backlog.

---

## Handover report

Executed 2026-10-27 in a Claude Code cloud session (Linux 6.18.44, x86_64), git 2.43.0,
Node v22.22.0, from `main` at `b3cfb32` (one README commit after `177d869`).

### Task completion

- **Task 0** — done. `npm --prefix .tropis ci`, `git status --porcelain` printed nothing,
  `git fetch --tags origin`, and `bash scripts/check-blueprint.sh` ended
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- **Task 1** — done. Helpers `addExtraScript`, `takeInWorktree` and `packageOf` added
  beside `takeVersionDirs`; the three tests added before `throws when TROPIS_V010 is unset`.
  Decision 2 applied verbatim.
- **Task 2** — done, below.
- **Task 3** — done. `update-keeps-the-package-name` is `shipped`, `modules` is
  `scripts/take-version.mjs`, and the comment above it names this handover. Every
  criterion has a backing test, so it was not left at `shaped`.
- **Task 4** — this report.
- **Task 5** — the review record below.

### Verification results

- **Before the code change**, `node --experimental-vm-modules .tropis/node_modules/.bin/jest guards/take-version.test.js -t "package name|names nothing"`:
  `✕ keeps the package name when the update runs in a folder of another name` (Expected
  `"example-project-framework"`, Received `"example-project-update-framework"`),
  `✕ keeps the package name with --from when there is no record` (Expected `"echo extra"`,
  Received `undefined` — the update wrote `package.json.new`), `✓ names the package after
  the folder when the package names nothing`. `Tests: 2 failed, 38 skipped, 1 passed, 41 total`.
- **After it**, the whole file: `Tests: 41 passed, 41 total`.
- `bash scripts/check-blueprint.sh` on `bb27b56`: exit 0, last line
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: exit 0, `Test Suites: 5 passed, 5 total`,
  `Tests: 31 passed, 31 total` (and again after the catalog commit: `31 passed`).
- **Mutations**, each a throwaway commit run through the self-check, then dropped:
  - `const name = basename(project);` restored (Review Focus 1–3): exit 1,
    `Self-check FAILED: conformance or the clean baseline (above).`; failing:
    `keeps the package name when the update runs in a folder of another name`,
    `keeps the package name with --from when there is no record`.
  - `setupName` falls back to `''` (Review Focus 4): exit 1, same last line; failing:
    `names the package after the folder when the package names nothing`.

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 feature-catalog.yaml        |  8 +++++--
 guards/take-version.test.js | 57 +++++++++++++++++++++++++++++++++++++++++++++
 scripts/take-version.mjs    | 20 +++++++++++++++-
 3 files changed, 82 insertions(+), 3 deletions(-)
```

All three, and this plan file, are in the File Structure table. Worktree used:
`/home/user/tropis-package-name` on `plan/update-keeps-the-package-name`, made by
`isolate-for-plan.sh`. The temporary root `package.json` and `node_modules` link were
removed before each commit.

### Judgment calls

- The third test also asserts that the committed package's `name` was
  `example-project-framework` before it is dropped, so it cannot pass on a package that
  never had the name. It checks exit status but not empty stderr, as the plan lists.
- `addExtraScript` re-serialises the template with two-space indentation; the assertion
  that the text changed is inside it, so every caller gets it.

### What the plan got wrong

Nothing found. Every claim in *What the specifying session verified* held at `b3cfb32`.

### Outstanding

None. The sibling plan `export-ignore-lines-match-only-at-the-root` had not landed on
`origin/main` when this was written; if it lands first, this branch rebases and re-runs
its criteria before merging.

## Review record

Written by the executor, who merges under this plan's self-merge authority, on 2026-10-27,
on the branch at `936b732`. No independent reviewer: what follows is the executor's own
re-run, and every criterion is pinned by a test that was seen to fail.

### Checks re-run

- `guards/take-version.test.js` alone on `936b732`, `TROPIS_V010` set from
  `git archive v0.1.0`: `Tests: 41 passed, 41 total`.
- The self-check, `npm --prefix .tropis test` and both mutations are the handover's runs
  above, on the same code. They were not repeated here: nothing but this plan file
  changed after them.
- Scope: `git diff --stat origin/main...HEAD` is the three files in the handover plus this
  plan file, all in the File Structure table.
- CI on https://github.com/fcapurso/tropis/pull/133 is checked green before the merge.

### Found

Nothing beyond the handover.

### Outstanding disposition

The handover lists nothing outstanding. No developer check by hand: the change has no
screen.

### Learnings routed

None generalises beyond this plan: the defect and its fix are the catalog entry, now
shipped. The worktree test helper is local to `guards/take-version.test.js`.

### Merged because

The two tests that reproduce the defect failed before `setupName()` and pass after it, the
fallback is pinned by a third, and the self-check and installed checks are green.
