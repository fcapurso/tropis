# A branch environment can never be a permanent one — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `branch create`, `branch deploy` and `branch remove` refuse, before any
project script runs, a branch whose environment name is permanent — `production`,
`staging` and `development` by default, or the names a project lists in
`pipeline/branch/permanent.txt` — so a pull request from a branch named like a permanent
environment can neither deploy over it nor delete it when it closes; and the operator
guide says what `deploy.sh` does when it finds no environment.

**Spec:** the entry `branch-slot-never-touches-a-permanent-environment` in
`feature-catalog.yaml` and the comment above it. Its band and verdict are in
`docs/backlog-board/bands.yaml` (band A: "One branch named like production would deploy
over it and remove it when its pull request closes. Small to build, and every project
guards it by hand today."). There is no design document; the decisions below are the
design. The plans that built the branch slot (2026-10-25, *a branch can have its own
environment* and its review fixes) were read for their review records: their lessons
that apply here are in *Traps*.

**What the specifying session verified on 2026-10-31, against `main` at `d270b72`, with
git 2.43.0 and Node v22.23.4, in a Claude Code cloud session (Opus 5.5) on Linux,
x86_64:**

- `scripts/pipeline.mjs` already imports `existsSync` and `readFileSync` from
  `node:fs` and `join` from `node:path` (lines 12 and 14). No new import is needed.
- `environmentName(branch)` (around line 42) lowercases, turns each run of characters
  outside `[a-z0-9]` into one `-`, trims `-` from both ends, prefixes `b-` when the
  result does not start with a letter, and past 24 characters keeps a 17-character
  prefix plus `-` plus 6 hex of the SHA-1 of the original branch. A branch of only
  symbols throws `environment: a branch of only symbols has no name`. So `Production`,
  `production/` and `PRODUCTION` all name `production`.
- `BRANCH_ACTIONS = ['create', 'deploy', 'remove']` (around line 319).
- `branchSlot(root)` (around line 537) checks only that `create.sh`, `deploy.sh` and
  `remove.sh` exist under `pipeline/branch/`, so another file there — such as
  `permanent.txt` — does not change whether the slot is filled, empty or partial.
- `resolveEnvironment(root, branch, { checkCollision })` (around line 557) returns
  status 2 `environment: needs a branch` with no branch, status 1 with the
  `environmentName` error for a nameless branch, and — when `checkCollision` is on —
  calls `originBranches(root)`, which runs `git ls-remote --heads origin` and on failure
  writes `environment: could not list branches on origin` and makes the command exit 1.
  It refuses a name another origin branch shares, with
  `environment: A and B both name X`.
- `branchCommand(root, action, branch)` (around line 637): an unknown action exits 2;
  a partial slot prints the slot error and exits 1; an empty slot prints
  `branch: empty — no pipeline/branch/` to stdout and exits 0; then it calls
  `resolveEnvironment` (collision check off for `remove`), then `stageEnv()`, sets
  `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH`, and runs `pipeline/branch/<action>.sh`.
- `environmentCommand` (around line 595) only prints the name. The workflow template
  `templates/github/tropis-pipeline.yml` calls `environment "$HEAD_REF"` in its plan job
  (lines 47–49) to name the concurrency group of every pull request's environment jobs,
  and calls `branch create` (line 153), `branch deploy` (line 204) and `branch remove`
  (line 225) with `"$HEAD_REF"`. The template needs no change.
- `guards/pipeline.test.js`, `describe('branch slot')` (line 192), has the helpers this
  plan's tests use: `repository()` (an empty git repository with no origin),
  `fillBranchSlot(root, body)` (writes `body` to all three scripts), `write(root, rel,
  text)`, `runPipeline(root, args, { env })`, `git(cwd, ...args)`, and the constant
  `blueprint` (the repository root). `statSync` and `readFileSync` are already imported.
  Existing tests detect that a script ran by having it write `seen.txt`.
- `templates/README.md` is the operator guide (installed into projects as
  `.tropis/README.md`). Its branch-slot paragraph starts "To give each open pull request
  an environment of its own" (line 81) and ends "…needs `closed` listed in the
  `pull_request` types of `.github/workflows/pipeline.yml`." (lines 93–94). It does not
  mention `permanent` or "close and reopen".
- `framework/DECISIONS.md`: FW-029 (line 913) records the branch environment design;
  the last decision is FW-035, at the end of the file, preceded by a `---` line, as is
  FW-034.
- No guard checks DECISIONS numbering. No generated document is written from
  `feature-catalog.yaml` in this repository (the board's `index.html` is git-ignored).
  `guards/catalog-drift.test.js` requires every `## Delivers` id of a plan whose handover
  report is on `main` to be `shipped`.
- `guards/pipeline.test.js` passed on an export of `d270b72`: 1 suite, 77 tests.

**Model tier: Small.** Every decision, the refusal's text, the code, the tests, the
guide's sentences and the decision record are given below nearly verbatim; executing it
is placing them, running the suite, and recording output. No design judgment is left.

**Requires:** nothing beyond the repository.

**Merge authority: self-merge.** Every criterion is checked by a guard this plan adds,
the change is a refusal in one function plus prose, and it is easy to revert. Because
there is no reviewing session, **the executor writes the `## Review record` itself**
before merging (Task 5).

Do not store a kick-off prompt on this plan.

---

## Delivers

branch-slot-never-touches-a-permanent-environment

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-permanent-env -b plan/branch-slot-never-touches-a-permanent-environment` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.** They
  are the installed release.
- **Add no dependency. Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Merge only as Task 5 says.
- **This repository is public.** No hostnames, home paths or personal names in anything
  you commit, the handover and review record included. Name the worktree as
  `../tropis-permanent-env`, not by an absolute path.

## Decisions

Taken by the specifying session on 2026-10-31.

### 1. The list and how it is read

The project's list is the file `pipeline/branch/permanent.txt`, one name per line. Each
line has surrounding whitespace trimmed (which also drops a `\r`) and is lowercased;
blank lines and lines starting with `#` (after trimming) are ignored. Each entry is
compared with the branch's **environment name** — the output of `environmentName` — not
with the branch name, so `Production`, `production/` and `PRODUCTION` are refused when
`production` is listed. The comparison is exact equality; nothing is normalised beyond
trimming and lowercasing.

### 2. The file replaces the default

If `pipeline/branch/permanent.txt` exists, its names are the whole list: the default is
not added, and a file with no names refuses nothing — the project has said what is
permanent. If the file does not exist, the list is `production`, `staging`,
`development`.

### 3. Where and how the refusal happens

In `branchCommand`, after the slot check — so an unknown action still exits 2, a partial
slot still exits 1, and an empty slot still prints `branch: empty — no
pipeline/branch/` and exits 0 whatever the branch — and **before** `resolveEnvironment`
(so before origin is listed) and before `stageEnv()`. It applies to all three actions,
`remove` included: a pull request from `production` must not delete `production` when it
closes. A missing branch or a branch of only symbols is not refused here; it falls
through to `resolveEnvironment`, which reports it as today.

The refusal exits 1 and writes exactly one line to stderr, and nothing to stdout. With
the file:

```
branch: <branch> would use the environment <name>, which is permanent (listed in pipeline/branch/permanent.txt) — rename the branch.
```

With the default list:

```
branch: <branch> would use the environment <name>, which is permanent (a default permanent name; list yours in pipeline/branch/permanent.txt) — rename the branch.
```

`<branch>` is the argument as given; `<name>` is the environment name. The dash is an em
dash (U+2014), as in the existing empty-slot line.

**`environment` is unchanged.** It only prints a name and touches no environment, and the
workflow's plan job calls it on every pull request to name the concurrency group; the
refusal belongs to the three commands that change an environment.

The code, to add in `scripts/pipeline.mjs` directly above the `branchCommand` doc
comment:

```js
const PERMANENT_DEFAULT = Object.freeze(['production', 'staging', 'development']);

/**
 * The refusal for a branch whose environment is permanent, or null. When
 * pipeline/branch/permanent.txt exists its names replace the default list,
 * so a file with no names refuses nothing. A missing or nameless branch is
 * left to resolveEnvironment, which reports it.
 * @param {string} root
 * @param {string | undefined} branch
 * @returns {string | null}
 */
function permanentRefusal(root, branch) {
  if (!branch) return null;
  let name;
  try {
    name = environmentName(branch);
  } catch {
    return null;
  }
  const listPath = join(root, 'pipeline', 'branch', 'permanent.txt');
  const listed = existsSync(listPath);
  const names = listed
    ? readFileSync(listPath, 'utf8')
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line !== '' && !line.startsWith('#'))
    : PERMANENT_DEFAULT;
  if (!names.includes(name)) return null;
  const why = listed
    ? 'listed in pipeline/branch/permanent.txt'
    : 'a default permanent name; list yours in pipeline/branch/permanent.txt';
  return `branch: ${branch} would use the environment ${name}, which is permanent (${why}) — rename the branch.\n`;
}
```

And in `branchCommand`, immediately after the `if (slot.slot === 'empty') { … }` block
and before `const resolved = resolveEnvironment(…)`:

```js
  const refusal = permanentRefusal(root, branch);
  if (refusal) {
    process.stderr.write(refusal);
    return 1;
  }
```

Then add one sentence to `branchCommand`'s doc comment, after "Remove does not check for
a colliding name: the environment may already exist to be deleted.":
`All three refuse a branch whose environment is permanent, before origin is listed or any script runs.`

### 4. The operator guide

In `templates/README.md`, after the paragraph ending "…needs `closed` listed in the
`pull_request` types of `.github/workflows/pipeline.yml`." and before the paragraph
starting "To rehearse a release before it is tagged", insert these two paragraphs, each
preceded by a blank line, wrapped as shown:

```markdown
A branch whose environment would be a permanent one is refused: `branch create`,
`branch deploy` and `branch remove` stop before running any script in
`pipeline/branch/`, so a pull request from a branch called `production` can neither
deploy over that environment nor remove it when it closes. List your permanent
environments in `pipeline/branch/permanent.txt`, one name per line; blank lines and
lines starting with `#` are ignored. The list is compared with the environment's
name, not the branch's, so `Production` is refused too. The file replaces the
default list of `production`, `staging` and `development`, so an empty file refuses
nothing.

`deploy.sh` may find no environment to deploy to: `create.sh` failed, or the pull
request was closed while the run was going and its environment was removed. It must
not create one there, because nothing would remove it; it should fail, saying to
close and reopen the pull request, which creates the environment again.
```

### 5. The decision record

Append to `framework/DECISIONS.md`, after the last decision, a `---` line, a blank line,
and the record below. Use **FW-036** if it is still the next free number; if a decision
has landed on `main` since and taken it, use the next free number and say so under
*Judgment calls*.

```markdown
## FW-036: A branch's environment is never a permanent one

**Date:** 2026-10-31 · **Status:** Accepted

**Decision:** `branch create`, `branch deploy` and `branch remove` refuse, before
listing origin or running any project script, a branch whose environment name is on the
project's permanent list. The list is pipeline/branch/permanent.txt, one name per line,
trimmed and lowercased, and is compared with the environment name derived from the
branch, so `Production` and `production/` are refused when `production` is listed. When
the file exists it replaces the default list; when it does not, the list is production,
staging and development. An empty slot is still empty, and `environment` still prints
any name.

**Evidence:** first-adopter's upstream flush of 2026-10-29, from its queue entry of
2026-10-28: a branch named like a permanent environment would deploy over it and remove
it when its pull request closed, and the project guarded against that by hand.

**Rejected:** Extending the default with the file's names, because a project could then
never take a default name back, and one that writes its own list has said what is
permanent. Comparing the branch name, because `Production` and `production/` name the
same environment as `production`. Refusing in `environment`, because it touches no
environment and the workflow calls it for every pull request to name its concurrency
group.

**Consequences:** A project whose permanent environments have other names must list
them, and a list drops any default it does not repeat. Closing a pull request from a
refused branch fails its remove job, having touched nothing. `deploy.sh` may still find
no environment; the operator guide says it must fail, not create one.
```

## Traps

- **The self-check reads committed content only.** `bash scripts/check-blueprint.sh`
  exports `HEAD`. Commit, then run it; running it before the commit checks the previous
  commit. (An earlier plan in this area ordered it the other way round; its handover
  recorded that the check then passed against the wrong commit.)
- **Red first is natural here**: Task 1 adds the tests before any code changes, so most
  are red against the current code. Three new tests pass against the current code by
  construction — the empty file refusing nothing, the empty slot, and `environment`
  printing a permanent name — because today nothing is refused. They guard *Decisions 2
  and 3* against a wrong implementation, so Task 2 shows each can fail with a temporary
  mutation of the new code. That is expected; do not rewrite them to make them red
  first.
- **The repository has no `package.json` at its root**, so Jest cannot run the guards
  from the worktree as it stands. Task 0 says how to run one guard file; the two files it
  creates are temporary and must not be committed — `git status --porcelain` before each
  commit shows them as untracked, and `git add` only the files in the File Structure
  table.
- **A refusal on `remove` makes the close job fail.** That is the decision, not a defect:
  the job touched nothing. Do not exempt `remove`.
- **Leave `docs/backlog-board/bands.yaml` alone.** A shipped entry's band is dropped by
  the next `/refresh-board`, not by the plan that ships it.
- **Status.** The catalog rule moves `shaped` → `building` when the plan is dispatched;
  that is the dispatching session's edit on `main`, not yours. Whatever status the entry
  has on your branch (`shaped` or `building`), Task 4 sets it to `shipped`; do not set
  `building` yourself.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | *Decision 3*: `PERMANENT_DEFAULT`, `permanentRefusal`, the refusal in `branchCommand`, one sentence in its doc comment |
| `guards/pipeline.test.js` | Task 1's tests, in `describe('branch slot')` |
| `templates/README.md` | *Decision 4*'s two paragraphs |
| `framework/DECISIONS.md` | *Decision 5*'s record |
| `feature-catalog.yaml` | the entry to `shipped`, and a comment above it mapping criteria to tests (Task 4) |
| `docs/superpowers/plans/2026-10-31-branch-slot-never-touches-a-permanent-environment.md` | the handover report and the review record |

Nothing else changes: the workflow template, the fixtures, the installed release and the
bands file stay as they are.

## Tasks

### Task 0 — Setup in the worktree

In the worktree, run `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing) and `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record both.

To run one guard file against the working tree, use this throughout, from the worktree
root, then remove the two temporary files:

```bash
echo '{"type":"module"}' > package.json && ln -s .tropis/node_modules node_modules
node --experimental-vm-modules node_modules/.bin/jest --config templates/framework-jest.config.js --rootDir . guards/pipeline.test.js --no-coverage
rm package.json node_modules
```

Run it once now: expected 1 suite, 77 tests passed (or more, if `main` moved — record the
number).

### Task 1 — Tests first

In `guards/pipeline.test.js`, inside `describe('branch slot')`, after the test
`create with an empty slot prints the empty line and exits 0`, add:

```js
  describe('permanent environments', () => {
    const DEFAULT_WHY = '(a default permanent name; list yours in pipeline/branch/permanent.txt)';
    const LISTED_WHY = '(listed in pipeline/branch/permanent.txt)';
    const ran = (root) => statSync(join(root, 'seen.txt'), { throwIfNoEntry: false }) !== undefined;

    it.each(['create', 'deploy', 'remove'])('%s refuses production by default and runs nothing', (action) => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      const result = runPipeline(root, ['branch', action, 'production']);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe(
        `branch: production would use the environment production, which is permanent ${DEFAULT_WHY} — rename the branch.\n`,
      );
      expect(result.stdout).toBe('');
      expect(ran(root)).toBe(false);
    });

    it('refuses staging and development by their environment names', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      const staging = runPipeline(root, ['branch', 'deploy', 'Staging']);
      expect(staging.status).toBe(1);
      expect(staging.stderr).toBe(
        `branch: Staging would use the environment staging, which is permanent ${DEFAULT_WHY} — rename the branch.\n`,
      );
      const development = runPipeline(root, ['branch', 'create', 'development/']);
      expect(development.status).toBe(1);
      expect(development.stderr).toBe(
        `branch: development/ would use the environment development, which is permanent ${DEFAULT_WHY} — rename the branch.\n`,
      );
      expect(ran(root)).toBe(false);
    });

    it('a permanent.txt replaces the default list', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      write(root, 'pipeline/branch/permanent.txt', '  Live\r\n# comment\n\n');
      const live = runPipeline(root, ['branch', 'deploy', 'live']);
      expect(live.status).toBe(1);
      expect(live.stderr).toBe(
        `branch: live would use the environment live, which is permanent ${LISTED_WHY} — rename the branch.\n`,
      );
      expect(ran(root)).toBe(false);
      const production = runPipeline(root, ['branch', 'deploy', 'production']);
      expect(production.status).toBe(0);
      expect(ran(root)).toBe(true);
    });

    it('an empty permanent.txt refuses nothing', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      write(root, 'pipeline/branch/permanent.txt', '');
      const result = runPipeline(root, ['branch', 'deploy', 'production']);
      expect(result.status).toBe(0);
      expect(ran(root)).toBe(true);
    });

    it('an empty slot still prints its line for a permanent name', () => {
      const root = repository();
      const result = runPipeline(root, ['branch', 'create', 'production']);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('branch: empty — no pipeline/branch/\n');
      expect(result.stderr).toBe('');
    });

    it('refuses before listing origin', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      git(root, 'remote', 'add', 'origin', join(root, 'no-such-origin'));
      const result = runPipeline(root, ['branch', 'create', 'production']);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('which is permanent');
      expect(result.stderr).not.toContain('could not list branches on origin');
      expect(ran(root)).toBe(false);
    });

    it('environment still prints a permanent name', () => {
      const root = repository();
      const result = runPipeline(root, ['environment', 'production']);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('production\n');
    });

    it('the operator guide names the list and what deploy.sh does with no environment', () => {
      const guide = readFileSync(join(blueprint, 'templates', 'README.md'), 'utf8').replace(/\s+/g, ' ');
      expect(guide).toContain('pipeline/branch/permanent.txt');
      expect(guide).toContain('replaces the default list');
      expect(guide).toContain('must not create one');
      expect(guide).toContain('close and reopen the pull request');
    });
  });
```

Run the guard file (Task 0's command) against the unchanged code and record, by name,
which new tests fail and how. Expected red: the three `refuses production by default`
cases (status 0, the script ran), `refuses staging and development`, `a permanent.txt
replaces the default list` (`live` ran), `refuses before listing origin` (stderr is the
origin error), and the operator guide test. Expected green: `an empty permanent.txt
refuses nothing`, `an empty slot still prints its line`, `environment still prints a
permanent name` (see *Traps*). If any test outside that green list passes, stop and
report it under *What the plan got wrong* rather than carry on.

Commit the tests alone, with a body saying they are red until the next commit.

### Task 2 — The refusal

Apply *Decision 3* to `scripts/pipeline.mjs`. Run the guard file: every test green,
including the 77 that were there before. Record the counts.

Then show the three tests that were green before can fail, each with a temporary edit
you revert at once (Jest reads the working tree, so no commit is needed; `git diff
scripts/pipeline.mjs` after reverting must show only *Decision 3*'s change):

1. Make the list extend the default: replace `: PERMANENT_DEFAULT;` with
   `: []; names.push(...PERMANENT_DEFAULT);` — or any edit with that effect — and run:
   `an empty permanent.txt refuses nothing` and `a permanent.txt replaces the default
   list` must fail.
2. Move the four refusal lines in `branchCommand` above the `const slot =
   branchSlot(root);` line, and run: `an empty slot still prints its line` must fail.
3. Add the same four lines, with `branch` → `args[0]`, at the top of
   `environmentCommand`, and run: `environment still prints a permanent name` must fail.

Record each failing test's name. Revert, re-run green, commit.

### Task 3 — The guide and the decision

Apply *Decision 4* to `templates/README.md` and *Decision 5* to
`framework/DECISIONS.md`. Run the guard file: all green, the guide test included.
Commit.

### Task 4 — Catalog and verification

In `feature-catalog.yaml`, on the entry `branch-slot-never-touches-a-permanent-environment`,
set `status: shipped` and leave `modules` as it is. Below the existing comment line
above it (`# 2026-10-29, raised by first-adopter's upstream flush, …`), add:

```yaml
# Shipped by the handover in
# docs/superpowers/plans/2026-10-31-branch-slot-never-touches-a-permanent-environment.md.
# Criterion 1: "a permanent.txt replaces the default list" and "an empty permanent.txt
# refuses nothing". Criterion 2: the three "refuses production by default" cases,
# "refuses staging and development", "refuses before listing origin" and "an empty slot
# still prints its line". Criterion 3: "the operator guide names the list and what
# deploy.sh does with no environment". All in guards/pipeline.test.js, branch slot.
```

Commit. Then run and record:

- the guard file (Task 0's command): counts;
- `npm --prefix .tropis test`: counts, all passed;
- `bash scripts/check-blueprint.sh` — after the commit: last line starts `Self-check
  passed`;
- `git diff --stat origin/main...HEAD`: every file is in the File Structure table (the
  plan file will join it in Task 5).

### Task 5 — Handover report, review record, merge

1. Append `## Handover report` to this plan file with the six sections the planning rule
   names — *Task completion*, *Verification results* (each command, its actual output,
   and the tool, version, operating system and architecture that ran it; never the
   computer's name), *Scope* (the diff stat, confirmation against the File Structure
   table, and the worktree path `../tropis-permanent-env`), *Judgment calls*, *What the
   plan got wrong*, *Outstanding*. Commit, push the branch, and open a pull request
   against `main` titled
   `fix(pipeline): a branch environment can never be a permanent one`.
2. **No fresh-agent check is owed**: nothing under `rules/`, `framework/` documents an
   agent is told to follow, or `commands/` changes. `framework/DECISIONS.md` is a record,
   not an instruction; the change is a refusal in a script and operator prose, each
   covered by a guard. Say so in the review record.
3. **Wait for the pull request's checks to finish green.** This host requires no check,
   so a merge does not wait for them by itself (`gh pr checks <N> --watch`). If one is
   red, fix it on the branch if the fix is mechanical and say so; otherwise stop and
   report without merging.
4. `git fetch origin && git rebase origin/main`. If `main` moved, re-run Task 4's four
   checks on the rebased head and push (`--force-with-lease`, this branch only), then
   wait for checks again. If FW-036 was taken meanwhile, renumber (see *Decision 5*).
5. Append `## Review record` below the handover report — you merge, so you write it —
   with the five sections the planning rule names: *Checks re-run* (what you ran after
   the handover, with output and tool, version, OS and architecture), *Found* (opening
   with `Public exposure:` and what reading your own diff for private material found, or
   `nothing`), *Outstanding disposition* (each handover *Outstanding* item with a catalog
   id or a one-line reason to drop it), *Learnings routed* (or a statement that nothing
   generalises, and why), *Merged because*. Commit and push; wait for checks to finish
   green again.
6. Merge, in this order, from the primary `tropis` checkout (not from inside the
   worktree):

   ```bash
   git worktree remove --force ../tropis-permanent-env
   git branch -D plan/branch-slot-never-touches-a-permanent-environment
   gh pr merge <N> --squash --delete-branch \
     --subject "fix(pipeline): a branch environment can never be a permanent one" \
     --body "branch create, deploy and remove refuse, before any project script runs, a branch whose environment name is permanent: production, staging and development by default, or the names a project lists in pipeline/branch/permanent.txt, which replace the default. A pull request from a branch named like a permanent environment can no longer deploy over it or remove it on close. The operator guide says so, and says deploy.sh must fail rather than create a missing environment.

   Implements: branch-slot-never-touches-a-permanent-environment
   Plan: docs/superpowers/plans/2026-10-31-branch-slot-never-touches-a-permanent-environment.md"
   git checkout main && git pull origin main
   ```

   `--force` is required: the worktree holds an untracked `.tropis/node_modules`, and a
   plain remove refuses, which makes `--delete-branch` abandon the remote deletion.

---

## Handover report

Executed by a dispatched agent in the worktree `../tropis-permanent-env` on branch
`plan/branch-slot-never-touches-a-permanent-environment`, four commits on top of `main`
at `f575fa1`: `d4792ed` (red tests), `8ed8826` (refusal), `34fab84` (operator guide and
FW-036), `76a3351` (catalog). Environment for every check: git 2.43.0, Node v22.23.4,
npm 10.9.9, jest 30.5.2, Linux x86_64.

### Task completion

- **Task 0 — setup:** done. `npm --prefix .tropis ci` ran; `git status --porcelain` was
  empty; the self-check passed on the baseline. Guard file baseline: 77 of 77.
- **Task 1 — tests first:** done, committed alone (`d4792ed`). Against the unchanged code,
  seven tests failed, exactly the plan's expected red set: the three `… refuses production
  by default and runs nothing` cases (create, deploy, remove), `refuses staging and
  development by their environment names`, `a permanent.txt replaces the default list`,
  `refuses before listing origin`, and `the operator guide names the list …`. The three
  expected-green tests passed: `an empty permanent.txt refuses nothing`, `an empty slot
  still prints its line for a permanent name`, `environment still prints a permanent name`.
- **Task 2 — the refusal:** done (`8ed8826`), *Decision 3* applied as written. Three
  temporary mutations were each run alone and reverted; each failed the test the plan
  named:
  1. Extending the default (`: []; names.push(...PERMANENT_DEFAULT);`) failed
     `an empty permanent.txt refuses nothing` and `a permanent.txt replaces the default list`.
  2. Moving the refusal above the slot check failed `an empty slot still prints its line
     for a permanent name`.
  3. Adding the refusal to `environmentCommand` failed `environment still prints a
     permanent name`.
  After reverting, `git diff` on `scripts/pipeline.mjs` showed only *Decision 3*'s change.
  The guard file then had 86 passed and 1 failed, the failure being the operator-guide
  test (fixed in Task 3).
- **Task 3 — guide and decision:** done (`34fab84`). *Decision 4* placed after the
  `pull_request` paragraph, before the release-rehearsal paragraph; *Decision 5* appended
  as FW-036 (the number was free: the last decision on `main` was FW-035). Guard file:
  87 of 87 passed.
- **Task 4 — catalog and verification:** done (`76a3351`). Status `building` → `shipped`;
  the criteria-to-tests comment added above the entry. `modules` unchanged. Checks below.
- **Task 5:** this report. The review record and merge are not part of this handover, per
  the specifying session's override (see *Outstanding*).

### Verification results

1. **Task 0 guard run, baseline** (`guards/pipeline.test.js`, Jest config
   `templates/framework-jest.config.js`, run with the temporary `package.json` and
   `node_modules` symlink, removed afterwards):
   `Tests: 77 passed, 77 total` — `Test Suites: 1 passed, 1 total`.
2. **Task 0 self-check, baseline:** last line `Self-check passed: every guard caught its
   defect, the clean baseline passed, and the framework repository's own guards passed.`
3. **Task 1 red run:** `Tests: 7 failed, 80 passed, 87 total`; failing names listed in
   *Task completion* above.
4. **Task 2 green-with-refusal run:** `Tests: 1 failed, 86 passed, 87 total`; the one
   failure is `… the operator guide names the list …` (expected until Task 3).
5. **Task 2 mutations:** as listed in *Task completion*; each mutation run alone gave
   `2 failed` / `3 failed` / `2 failed` respectively, the named tests among them.
6. **Task 3 guard run:** `Tests: 87 passed, 87 total`.
7. **Task 4 self-check, after the catalog commit** (committed content, `HEAD` = `76a3351`):
   last line `Self-check passed: every guard caught its defect, the clean baseline passed,
   and the framework repository's own guards passed.`
8. **Task 4 `npm --prefix .tropis test`:** `Test Suites: 6 passed, 6 total`,
   `Tests: 33 passed, 33 total`, exit 0.
9. **Task 4 diff scope:** `git diff --stat origin/main...HEAD` before this report:
   `feature-catalog.yaml 9 ++++-`, `framework/DECISIONS.md 31 +`, `guards/pipeline.test.js
   92 +`, `scripts/pipeline.mjs 44 ++-`, `templates/README.md 15 +`; 5 files, 188 insertions,
   3 deletions.
10. **Node syntax check** of `scripts/pipeline.mjs` after the refusal: `node --check` passed.

### Scope

- Diff: the five files in the File Structure table, plus this plan file (the handover
  report, below). Nothing under `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`,
  `AGENTS.md`, `rules/`, `commands/`, `docs/backlog-board/bands.yaml`, the workflow
  template or the fixtures was touched.
- No dependency added. No guard lowered, skipped or deleted.
- Worktree: `../tropis-permanent-env`.

### Judgment calls

- **The plan's branch already existed.** `plan/branch-slot-never-touches-a-permanent-environment`
  existed locally and on origin, at `main`'s commit `f575fa1`, with no commits of its own
  (`git rev-list --count origin/main..<branch>` = 0). The isolation helper's `-b` failed on
  it. The primary checkout was sitting on that branch, so I checked it out to `main` (clean,
  same commit) and ran `git worktree add ../tropis-permanent-env
  plan/branch-slot-never-touches-a-permanent-environment` on the existing branch. Nothing was
  lost; the helper did not run beyond its failed attempt.
- **Commit attribution.** The attribution reminder asked for a `Co-Authored-By` line naming
  the model. The session's instructions forbid model identifiers in commit messages, so the
  commits carry `Co-Authored-By: Claude <noreply@anthropic.com>` and the session URL, with
  no model name.
- **`permanentRefusal` return on a branch that is missing or made only of symbols** follows
  *Decision 3*: it returns null and `resolveEnvironment` reports it, as the plan says.
- **FW-036** was used as the plan named; the number was free.

### What the plan got wrong

- **Task 2's "every test green" cannot be met at that step.** The operator-guide test is
  written in Task 1 and fixed by Task 3, so after Task 2 exactly one test (the guide test)
  is still red. I committed Task 2 as planned and recorded the remaining failure in the
  commit body; Task 3 turns it green.
- **Task 0 and Task 5 assumed the branch did not exist.** It did (see *Judgment calls*). The
  isolation helper cannot cope with a pre-existing branch; the plan should either say to
  reuse it or the helper should check first.
- **The plan's verified baseline is out of date.** It says `main` is at `d270b72`; `main`
  was at `f575fa1` when this ran. The 77-test baseline still held, and the line references
  in the plan matched the code, so nothing else needed changing.

### Outstanding

- **No review record and no merge** here. The specifying session has asked to do the review
  itself, so Task 5's steps 5–6 are left to it.
- **The pull request's checks** are not waited on by this handover; they run on the pull
  request as usual.
- **Private-material read.** Each commit's staged diff was checked by reading it for names,
  hosts, paths and addresses, as the commit hook asks; nothing found. The worktree is named
  by its relative path throughout. The self-check's private-material guard passed on the
  committed content at `76a3351`; it does not cover this file's wording, so the read is the
  check for it.
