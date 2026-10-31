# The prerequisite check refuses a Node the guards cannot run on — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `scripts/check-prerequisites.sh` refuses node older than 18.14, saying which
version it found and that 18.14 or newer is needed, and a test fails if it ever accepts
such a node again or refuses one it should accept.

**Spec:** the entry `prerequisite-check-refuses-old-node` in `feature-catalog.yaml` and
the comment above it. There is no design document; the decisions below are the design.

**What the specifying session verified on 2026-10-31, against `main` at `d612b14`, with
git 2.49.0, Node v22.15.0 and Jest 30.5.2, in Claude Code on macOS (Darwin 25.2.0) arm64:**

- **The check accepts any node 18.** `scripts/check-prerequisites.sh`, in the node block,
  takes `node_major=${node_version%%.*}` and passes on `[ "$node_major" -ge 18 ]`; below
  that it prints `gone node "found $node_version, need 18 or newer (the guards use ES
  modules)"`. It never looks at the minor version.
- **Jest needs 18.14.** The Jest the framework installs, 30.5.2, declares `engines.node`
  `^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0` in `.tropis/node_modules/jest/package.json`.
  `README.md` (*Who it is for*) and `RELEASES.md` (*Tropis's checks need Node 18.14 or
  later*) already tell adopters 18.14. Only the check disagrees.
- **Nothing tests the check today.** No file under `guards/` names
  `check-prerequisites`. It is named by `commands/bootstrap.md` (run during setup),
  `scripts/installed-scripts.txt` (it is installed into projects at
  `.tropis/scripts/check-prerequisites.sh`) and `framework/DECISIONS.md` (FW-005). None of
  those quotes the version or the message, so none changes.
- **How guards test a shipped script.** `guards/submit-upstream.test.js` runs the script
  with `spawnSync('/bin/bash', [script, …])`, with stub commands written to a scratch `bin`
  placed first on `PATH`. The test below follows that pattern.
- **The script finds its folders from its own location.** `framework_dir` is the
  script's folder's parent and `project_root` the one above, so a copy placed at
  `<scratch>/project/.tropis/scripts/` treats `<scratch>/project` as the project. With no
  `feature-catalog.yaml` there, the check skips the `yaml` lookup, which is the only
  other call it makes to `node`. A stub node therefore needs to answer `--version` only.
- **The test and the fix below were run before this plan was written**, in a scratch
  copy of `guards/` and `scripts/` with this repository's Jest config: against the current
  script the test failed 3 of 7 (18.0.0 and 18.13.0 exited 0; 16.20.2 printed the old
  message); with the fix, 7 of 7 passed.
- **The new guard is not installed into projects.** `scripts/set-up-project.sh` copies a
  named list of guards into `.tropis/guards/`; like `submit-upstream.test.js`, this one is
  not in it and runs only in the self-check. It resolves the script as
  `../scripts/check-prerequisites.sh` from `guards/`, which is where the self-check's
  staged tree has it.

**Model tier: Small.** The script change and the test are given verbatim below.

**Requires:** nothing beyond the repository.

**Merge authority: self-merge.** Every criterion is checked by the test Task 1 writes,
which must fail first. You write the review record (Task 4).

Do not store a kick-off prompt on this plan.

---

## Delivers

prerequisite-check-refuses-old-node

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-prereq-node -b plan/prerequisite-check-refuses-old-node` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's own entry
  pair; the work is in `scripts/` and `guards/`.
- **Do not edit `README.md` or `RELEASES.md`.** Both already say 18.14.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, the handover or the review record.

## Decisions

### 1. The check

In `scripts/check-prerequisites.sh`, replace exactly these lines:

```bash
  node_major=${node_version%%.*}
  if [ "$node_major" -ge 18 ]; then
    ok node "$node_version  — runs the guards and the backlog command"
  else
    gone node "found $node_version, need 18 or newer (the guards use ES modules)"
  fi
```

with:

```bash
  node_major=${node_version%%.*}
  node_minor=$(echo "$node_version" | cut -d. -f2)
  # Jest, which runs the guards, accepts 18 only from 18.14.
  if [ "$node_major" -gt 18 ] || { [ "$node_major" -eq 18 ] && [ "$node_minor" -ge 14 ]; }; then
    ok node "$node_version  — runs the guards and the backlog command"
  else
    gone node "found $node_version, need 18.14 or newer (Jest, which runs the guards, refuses older)"
  fi
```

Nothing else in the script changes.

### 2. Odd-numbered majors are left alone

Jest's range also leaves out node 19, 21 and 23. The check keeps accepting them, as it
does today: they are short-lived releases nobody is told to use, and refusing them is a
different change from the one this entry describes. Do not add them.

### 3. The test

Create `guards/check-prerequisites.test.js`, verbatim:

```js
// Level: unit
/**
 * The prerequisite check refuses a Node the guards cannot run on.
 *
 * Jest, which runs the guards, accepts Node 18 only from 18.14, so the check must too:
 * otherwise a machine on 18.0 to 18.13 passes setup and fails at the first guard. This
 * runs the shipped script from a scratch .tropis/scripts/, with stubs for node, git and
 * python3 first on PATH, so the version under test is the one the stub reports.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../scripts/check-prerequisites.sh');

const STUBS = {
  node: 'echo "v$STUB_NODE_VERSION"',
  git: 'echo "git version 2.49.0"',
  python3: 'echo "Python 3.12.0"',
};

describe('the prerequisite check and the Node version', () => {
  let dir;
  let bin;
  let installed;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'check-prerequisites-'));
    bin = join(dir, 'bin');
    mkdirSync(bin);
    for (const [name, body] of Object.entries(STUBS)) {
      writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
      chmodSync(join(bin, name), 0o755);
    }
    // Installed at .tropis/scripts/ in a project with no feature-catalog.yaml, so the
    // check never asks the stub node to resolve the yaml package.
    mkdirSync(join(dir, 'project/.tropis/scripts'), { recursive: true });
    installed = join(dir, 'project/.tropis/scripts/check-prerequisites.sh');
    copyFileSync(script, installed);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (version) =>
    spawnSync('/bin/bash', [installed], {
      env: { PATH: `${bin}:${process.env.PATH}`, STUB_NODE_VERSION: version },
      encoding: 'utf8',
    });

  it.each(['18.14.0', '18.20.4', '20.0.0', '22.15.0'])('accepts node %s', (version) => {
    const r = run(version);
    expect({ status: r.status, out: r.stdout }).toEqual({
      status: 0,
      out: expect.stringMatching(new RegExp(`ok +node +${version.replace(/\./g, '\\.')} `)),
    });
  });

  it.each(['18.0.0', '18.13.0', '16.20.2'])('refuses node %s and says 18.14 is needed', (version) => {
    const r = run(version);
    expect({ status: r.status, out: r.stdout }).toEqual({
      status: 1,
      out: expect.stringContaining(`MISSING  node       found ${version}, need 18.14 or newer`),
    });
  });
});
```

The `MISSING  node       ` spacing is what the script's `gone` function prints
(`printf '  MISSING  %-10s %s\n'`): two spaces after `MISSING`, then `node` padded to ten
characters, then one space.

### 4. What this owes, and does not

- **No fresh-agent check.** Nothing under `rules/`, `framework/`, `commands/` or
  `.claude/` changes.
- **No `framework/DECISIONS.md` entry.** FW-005 decides to depend on node; the minimum
  version follows from the test runner and weighs no alternative.
- **No release-notes edit.** `/release` drafts the notes from the backlog, and
  `RELEASES.md` already tells adopters 18.14.
- **No operator guide change.** `templates/README.md` does not state a Node version.

## Traps

- **The test must fail first.** Task 1 commits the test before the script changes, and
  the self-check must then fail on it. That is the red step, not a breakage.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **The stubs shadow the real git and python3 on purpose.** The test is about node; it
  must give the same answer on a machine without python3. Do not remove them.
- **Your own Node does not matter.** The stub reports the version under test; the real
  node only runs Jest.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/check-prerequisites.sh` | *Decision 1* |
| `guards/check-prerequisites.test.js` | new, *Decision 3* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to the test |
| `docs/superpowers/plans/2026-10-31-prerequisite-check-refuses-old-node.md` | the handover report and the review record |

Nothing else: no generated feature document exists in this repository, and the backlog
board's bands file is refreshed by `/refresh-board`, not by a plan.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The test, red

Apply *Decision 3*. Commit. Run `bash scripts/check-blueprint.sh`: it must fail, and the
failing tests must be exactly three, `refuses node 18.0.0 and says 18.14 is needed`,
`refuses node 18.13.0 …` and `refuses node 16.20.2 …`; the four `accepts node` cases
pass. Paste the failing test names.

### Task 2 — The check

Apply *Decision 1*. Commit. Run `bash scripts/check-blueprint.sh`; the last line must
start `Self-check passed`. Paste it. Then run `bash scripts/check-prerequisites.sh` from
the worktree and paste its `node` line, which must start `ok` with your own Node version.

### Task 3 — Catalog

In `feature-catalog.yaml`, on `prerequisite-check-refuses-old-node`: set
`status: shipped` (it will read `building` once dispatched; if it still reads `shaped`,
set `shipped` anyway and say so under *Judgment calls*). Set `modules` to
`scripts/check-prerequisites.sh` and `guards/check-prerequisites.test.js`. Add a comment
directly above the entry's `- id:` line, below the existing comment:

```yaml
# Shipped by docs/superpowers/plans/2026-10-31-prerequisite-check-refuses-old-node.md.
# Criteria 1, 2 and 3: check-prerequisites.test.js, which runs the shipped script against
# a stub node reporting each version.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit.

### Task 4 — Full verification

From the worktree, after committing everything:

- `npm --prefix .tropis test` — the installed release's checks on this repository; paste
  the `Tests:` line.
- `bash scripts/check-blueprint.sh` — paste the last line, which must start
  `Self-check passed`.
- `git diff --stat origin/main...HEAD` — paste it; every file must be in *File Structure*.

### Task 5 — Handover report, review record, merge

1. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Commit, push the branch, and open a pull
   request against `main` whose body says what is now true, ending with the attribution
   lines your session gives.
2. **Self-merge: you write the review record.** Wait for the pull request's checks to
   finish (`gh pr checks <N> --watch`); they must all be green. Then append
   `## Review record` below the handover with its five sections: *Checks re-run* (re-run
   Task 4's self-check on the final commit, with output, tool, version, OS and
   architecture; and re-break the test by hand — in a throwaway commit, change `-ge 14`
   in `scripts/check-prerequisites.sh` to `-ge 0`, run the self-check, paste the failures
   for 18.0.0 and 18.13.0, then `git reset --hard HEAD~1`), *Found* (opening with
   `Public exposure:` and what reading the diff for names, home paths and hostnames
   found, or `nothing`), *Outstanding disposition* (each Outstanding item with a catalog
   id or a one-line reason to drop; say the change has no screen, so there is no
   developer check), *Learnings routed* (or why nothing generalises), *Merged because*.
   Commit and push, and wait for the checks again; all green.
3. Merge, in this order. If `origin/main` moved, first `git fetch origin && git rebase
   origin/main`, re-run Task 4 in full, push with `--force-with-lease`, and wait for
   green. Then, from the main checkout (not the worktree):

   ```bash
   git worktree remove --force ../tropis-prereq-node
   git branch -D plan/prerequisite-check-refuses-old-node
   gh pr merge <N> --squash --delete-branch \
     --subject "fix(prerequisites): the check refuses a Node the guards cannot run on" \
     --body "<what is now true: the prerequisite check refuses node older than 18.14, the oldest the installed Jest runs on, and says which version it found and that 18.14 or newer is needed, so a machine on 18.0 to 18.13 is told at setup rather than failing at the first guard; a test runs the shipped script against stub node versions. Then: Implements: prerequisite-check-refuses-old-node / Plan: docs/superpowers/plans/2026-10-31-prerequisite-check-refuses-old-node.md, and the attribution lines>"
   git checkout main && git pull origin main
   ```
