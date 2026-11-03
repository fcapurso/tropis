# A fresh clone runs the framework cleanly — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** in a fresh clone, a framework script whose packages are not installed says to
run `npm --prefix .tropis ci` instead of failing with Node's missing-package error, and
running the hooks leaves no untracked file behind, so a new checkout's first commands
and its clean-tree check work.

**Backlog items:** `fresh-clone-says-to-install` and `hooks-leave-no-untracked-cache` in
`feature-catalog.yaml` (both type bug). Spec context:
`docs/superpowers/specs/2026-11-03-cloud-sprint-design.md`, items 7 and 8 of *What a
cloud session hit*.

**One plan:** what becomes true is one sentence — a fresh checkout runs the framework's
commands and hooks without an error it cannot explain and without leaving files behind.

**What the specifying session verified on 2026-11-03, against `origin/main` at `6aec308`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64), and what a cloud session reported:**

- **The missing-package failure.** A cloud session (Claude Code 2.1.317, Linux x86_64)
  ran `node .tropis/scripts/sprint.mjs status` in a fresh clone and got
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'yaml' imported from …/.tropis/scripts/sprint.mjs`.
- **Where the package is imported.** `yaml` is the framework's only runtime package
  (`templates/package.json` lists `jest` and `yaml`). Five source scripts import it
  statically, `import YAML from 'yaml';`: `scripts/build-backlog-board.mjs:21`,
  `scripts/next.mjs:16`, `scripts/plan-overlap.mjs:27`, `scripts/sprint.mjs:59`,
  `scripts/readme-freshness.js:11`. A static import is resolved before any of a module's
  code runs, so no check inside those files can run first; the failure is catchable only
  around a dynamic `import()`.
- **The untracked cache.** `scripts/branch-in-worktree.sh` (installed as
  `.tropis/hooks/branch-in-worktree.sh`) loads `command-at-position.py` as a module, at
  lines 44–51:

  ```bash
  branch=$(HOOK_COMMAND="$command" python3 - "$here/command-at-position.py" <<'PY'
  import importlib.util
  ...
  spec.loader.exec_module(cap)
  ```

  Loading a file as a module makes Python write `__pycache__/` beside it. Every other
  hook runs `command-at-position.py` as a script (`python3 "$…/command-at-position.py"`),
  which writes no cache. Nothing ignores `.tropis/hooks/__pycache__/`.
- **The scripts installed into a project** are listed in `scripts/installed-scripts.txt`;
  `scripts/set-up-project.sh:72` and `scripts/check-conformance.sh:126` read it. A new
  script must be added there or it is not installed.

**Decided by the specifying session:**

- **The package is loaded in one place.** A new module, `scripts/load-yaml.mjs`, imports
  `yaml` dynamically and, when it is missing, prints one line and exits; the five scripts
  import `YAML` from it. Rejected: a check at the top of each script (a static import
  fails before it runs), and a shell wrapper around each command (the commands are run by
  `node` directly from documents and other scripts).
- **The cache is not written, rather than ignored.** The one call that loads the module
  runs `python3 -B`. Rejected: an ignore line, which every project would have to receive
  through its update, and which leaves the folder on disk.

**Model tier: Medium.** The changes are given, but the loader's behaviour under Jest's
ES module support and the tests' fresh-checkout setup need judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed:** the change touches no file under `framework/`, `rules/`
or `commands/`; the tests below pin what changes.

Do not store a kick-off prompt on this plan.

---

## Delivers

fresh-clone-says-to-install, hooks-leave-no-untracked-cache

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-fresh-clone -b plan/fresh-clone-runs-clean origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

### 1. `scripts/load-yaml.mjs` (new)

```js
// Shared machinery: no part of this file is project-owned.
/**
 * The yaml package, for the framework's scripts. A script that imports `yaml` directly
 * fails before any of its code runs when the framework's packages are not installed, as
 * in a fresh clone; importing it from here turns that into one line saying what to run.
 */
import { basename } from 'node:path';

let YAML;
try {
  ({ default: YAML } = await import('yaml'));
} catch (e) {
  if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  const script = basename(process.argv[1] ?? 'this script');
  process.stderr.write(
    `${script}: the framework's packages are not installed. `
    + 'Run npm --prefix .tropis ci from the repository root, then run this again.\n',
  );
  process.exit(1);
}

export default YAML;
```

The module is ES, `.mjs`, and uses top-level `await`, which Node 18 and later support.

### 2. The five scripts

In each of `scripts/build-backlog-board.mjs`, `scripts/next.mjs`,
`scripts/plan-overlap.mjs`, `scripts/sprint.mjs` and `scripts/readme-freshness.js`,
replace `import YAML from 'yaml';` with `import YAML from './load-yaml.mjs';`. Nothing
else in them changes.

### 3. `scripts/installed-scripts.txt`

Add a line `load-yaml.mjs`, beside the other shared modules.

### 4. `scripts/branch-in-worktree.sh`

In the call quoted above, run `python3 -B -` instead of `python3 -`, and add a comment on
the line above it: `# -B: loading the matcher as a module would write __pycache__/ beside it.`

## Tests

Add a new guard, `guards/fresh-clone.test.js`, with three cases. Read how
`guards/sprint.test.js` and `guards/rule-delivery.test.js` find the scripts and hooks of
the tree under test (`FRAMEWORK_ROOT`, the `.tropis/` layout of a set-up project), and do
the same.

1. † `test('a script without its packages says to install them', …)`: copy the tree
   under test's `.tropis/scripts/` into a new temporary folder with no `node_modules`
   anywhere above it (the operating system's temporary directory), run
   `node <that folder>/next.mjs` with `spawnSync`, and expect exit status 1, stderr
   containing `npm --prefix .tropis ci`, and stderr not containing
   `ERR_MODULE_NOT_FOUND`. Do the same for `sprint.mjs status`. Before relying on the
   folder, assert that `yaml` cannot be resolved from it (for example, that
   `node -e "import('yaml')"` run there fails), so the case cannot pass on a machine
   where a parent folder happens to hold the package.
2. † `test('no framework script imports yaml except through load-yaml', …)`: read every
   `.mjs` and `.js` file in the tree's scripts folder and expect none but `load-yaml.mjs`
   to contain `from 'yaml'` or `import('yaml')`. A new script that imports the package
   directly then fails here.
3. † `test('the branch hook leaves no cache behind', …)`: in a temporary git repository
   set up the way `guards/rule-delivery.test.js` sets one up for
   `branch-in-worktree refuses a branch created in the main checkout`, with a copy of the
   tree's `.tropis/hooks/` in it, send the hook a payload for `git checkout -b x` (the
   shape that test sends), then expect no `__pycache__` folder anywhere under that copy's
   `hooks/`. Before sending, assert the folder is absent, so the case tests the hook and
   not a leftover.

Every † case must fail before the change and pass after it. Case 3 fails before the
change only if the hook reaches the module load; if it does not with that payload, find
the payload that does, and say so in the handover.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run a single guard the way the self-check runs one**: `scripts/check-blueprint.sh`
  sets up a project-shaped tree from a `git archive` of `HEAD` and runs the guards there
  through `scripts/check-conformance.sh`. Find where that tree is built and run the new
  guard against it with the jest the self-check installed under `.self-check/`. Say in
  the handover the exact command.
- **Jest runs ES modules here under `--experimental-vm-modules`.** A dynamic `import()`
  inside a module that Jest loads works there. The new guard runs the scripts in a child
  `node` process, not inside Jest, so it does not depend on that.
- **A temporary folder under the repository has the repository's `node_modules` above
  it** and would find `yaml`. Use the operating system's temporary directory.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/load-yaml.mjs` | new |
| `scripts/build-backlog-board.mjs` | imports `YAML` from `./load-yaml.mjs` |
| `scripts/next.mjs` | imports `YAML` from `./load-yaml.mjs` |
| `scripts/plan-overlap.mjs` | imports `YAML` from `./load-yaml.mjs` |
| `scripts/sprint.mjs` | imports `YAML` from `./load-yaml.mjs` |
| `scripts/readme-freshness.js` | imports `YAML` from `./load-yaml.mjs` |
| `scripts/installed-scripts.txt` | one line |
| `scripts/branch-in-worktree.sh` | `python3 -B` and its comment |
| `guards/fresh-clone.test.js` | new, three cases |
| `feature-catalog.yaml` | both items to `shipped`, comments mapping criteria to cases (Task 4) |
| `docs/backlog-board/bands.yaml` | both items' rows removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-fresh-clone-runs-clean.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: no framework document describes how the
scripts load their packages or how the hook runs Python, so none is owed. The operator
guide, `templates/README.md`, already tells someone to run `npm --prefix .tropis ci`
after cloning, and stays true. No decision record: the two choices above are internal to
the scripts, and this plan records them. No upstream queue: this repository is the
upstream. A release-note line is the developer's at `/release`; it should say that a
project with an existing `.tropis/hooks/__pycache__/` folder can delete it.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add `guards/fresh-clone.test.js` as *Tests* describes. Commit. Run it alone (*Traps*).
Expected: the three † cases fail. Paste the failing test names and, for case 1, the
stderr the script printed.

### Task 2 — The loader

Add `scripts/load-yaml.mjs`, switch the five scripts to it, and add it to
`scripts/installed-scripts.txt`. Commit. Run the new guard alone: cases 1 and 2 pass.
Then, from the worktree, run `npm --prefix .tropis run next` and paste its first two
lines, so the scripts still work with the packages installed.

### Task 3 — The hook

Change `scripts/branch-in-worktree.sh` as *The change* says. Commit. Run the new guard
alone (all three pass), then `bash scripts/check-blueprint.sh` (last line starts
`Self-check passed`). Paste both.

### Task 4 — The backlog and the board

1. In `feature-catalog.yaml`, on `fresh-clone-says-to-install`: set `status: shipped` (if
   it does not read `building`, set `shipped` anyway and say so), and set `modules` to
   `scripts/load-yaml.mjs`. On `hooks-leave-no-untracked-cache`: the same, with `modules`
   set to `scripts/branch-in-worktree.sh`. Leave `refs`. Above each item's existing
   comment block, add a comment
   `# Shipped by docs/superpowers/plans/2026-11-03-fresh-clone-runs-clean.md.` and one
   line per acceptance criterion naming the case that covers it. No `: ` inside an
   unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole block of each of the two items
   (through `blockers: []`), nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit.
3. `git push -u origin plan/fresh-clone-runs-clean`. **Do not open a pull request**,
   write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

Tool and platform for every command below: git 2.49.0, node v22.15.0, Darwin arm64
(macOS), jest from `.self-check/`. Worktree used: `../tropis-fresh-clone`.

### Task completion

- Task 0 done. `npm --prefix .tropis ci` clean; `git status --porcelain` empty; baseline
  `bash scripts/check-blueprint.sh` ended `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1 done. The guard was run alone against a project-shaped tree built from `HEAD`
  (the same build `check-conformance.sh` does). Before the change: `Tests: 3 failed, 3 total`.
  Case 1 stderr was Node's `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'yaml' imported from …/scripts/next.mjs`.
- Task 2 done. Cases 1 and 2 pass. The installed `npm --prefix .tropis run next` runs the
  installed release, so it shows nothing of this change; instead `next.mjs` and
  `sprint.mjs status` from a scratch copy of `scripts/` under a `.tropis/` with the
  packages linked ran (`Main branch: could not tell — no remote named origin.` and
  `Sprint: none under way; run propose, then start.`).
- Task 3 partly done. The hook change is made and the new guard passes `Tests: 3 passed, 3 total`.
  The self-check does NOT pass (see below), so the stop condition in *File Structure* applies.
- Task 4 done. `npm --prefix .tropis test`: `Tests: 160 passed, 160 total`.
- Task 5: the self-check is red; stopped and handed back as the plan directs.

### Verification results

- `bash scripts/check-blueprint.sh` on the final commit:
  `Self-check FAILED: conformance or the clean baseline (above).` Clean baseline:
  `Tests: 124 failed, 883 passed, 1007 total`, in six guards: `next-report`,
  `team-member-cli`, `backlog-board`, `plan-overlap`, `board-hooks`, `sprint`. Every
  failure read `Cannot find module '…/.tropis/scripts/load-yaml.mjs' imported from …/next.mjs`
  (or the other four scripts): each guard copies a hand-written list of script files
  into a scratch project, and `load-yaml.mjs` is not on any list.
- `git diff --stat origin/main...HEAD`: only the files in *File Structure*.

### Scope

All changed files are in *File Structure*. The six guards above need `load-yaml.mjs`
added to their copy lists, and are not in the table; per the plan, not edited.

### Judgment calls

- Case 3 of the new guard deletes `PYTHONDONTWRITEBYTECODE` and `PYTHONPYCACHEPREFIX` from
  the child's environment. The executor's shell had `PYTHONDONTWRITEBYTECODE=1`, under
  which the case passed before the change; with the variable cleared it fails first
  (`3 failed`). The payload `git checkout -b x` in a main checkout does reach the module
  load. The hook copy in the case leaves out any `__pycache__` the tree already held.
- Task 4 comment block: neither item had an existing comment block; the comments were put
  above each item's `- id:` line. Both items read `building` and were set to `shipped`.
- Worked from no named source.

### What the plan got wrong

- *File Structure* omits the guards that copy scripts by hand: `guards/next-report.test.js`,
  `team-member-cli.test.js`, `backlog-board.test.js`, `plan-overlap.test.js`,
  `board-hooks.test.js`, `sprint.test.js`. An import added to five scripts is a changed
  import surface for every guard that copies them (the planning rule's last bullet).
- Task 2 says to paste `npm --prefix .tropis run next`; that runs the installed release.
- The plan did not say a shell setting `PYTHONDONTWRITEBYTECODE` hides the cache.

### Outstanding

- Add `load-yaml.mjs` to the copy lists of the six guards (a plan amendment or a small
  fixup), then re-run the self-check. Nothing else known to fail.
- The change has no screen, so there is no developer check.

## Review record

Reviewed by the specifying session, a Claude desktop app session. Tools: Claude Code
2.1.300, git 2.49.0, node v22.15.0, macOS 26.2 on arm64.

### Checks re-run

- Scope: `git diff --stat origin/main...HEAD` lists 18 files: those in *File Structure*,
  plus the six guards fixed below.
- The full self-check on `HEAD` after the fix: `Self-check passed: every guard caught its
  defect, the clean baseline passed, and the framework repository's own guards passed.`
- The handover shows the new guard red before the change (`3 failed`) and green after;
  the reviewer read the guard and the three cases against the plan.

### Found

Public exposure: the diff was read for home paths, hostnames, email addresses and names;
nothing found. The new guard's git identity is `probe@example.test`.

- **The plan missed six guards, and the reviewer fixed them on the branch.** Six guards
  build a scratch project from a hand-written list of scripts (`next-report`,
  `team-member-cli`, `backlog-board`, `plan-overlap`, `board-hooks`, `sprint`), so each
  failed on the missing `load-yaml.mjs`. The fix adds the file to each list, one line
  per guard, nothing else. It is mechanical and understood, so it was made here rather
  than dispatched; the developer is told so. Commit
  `test(guards): the guards that copy scripts into a scratch project copy the yaml loader too`.
- The executor's two judgment calls stand: clearing the two Python cache variables in
  case 3 is needed for the case to test the hook, and the shipped comments sit above
  each `- id:` line because neither item had a block.

### Outstanding disposition

- No developer check: the change has no screen.
- The release-note line is the developer's at `/release`, including that a project with
  an existing `.tropis/hooks/__pycache__/` folder can delete it.

### Learnings routed

- No new rule: the planning rule already says a changed import surface reaches every
  guard that copies the scripts. The specifying session did not apply it.

### Merged because

A script without its packages says to run `npm --prefix .tropis ci` and exits 1, the
scripts import yaml only through one module with a check that fails otherwise, the hook
leaves no cache, and the full self-check passes.
