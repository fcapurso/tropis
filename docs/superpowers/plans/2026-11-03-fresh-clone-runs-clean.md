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
