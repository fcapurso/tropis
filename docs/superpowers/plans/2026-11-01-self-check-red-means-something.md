# A red self-check means something, and says what — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** when the self-check goes red, the red comes from the change under test and the
run says which test failed and why, in a file that outlives the terminal; and taking or
checking a version can no longer hang with nothing on the screen. Three changes: the
self-check keeps the output of every run that counts against it and names failing tests
from the run that failed; the take-version and update guards look for leftovers only in
a temporary folder of their own; and take-version unpacks a version without a pipe, with
a time limit on every child it starts.

**Spec:** the entries `self-check-red-runs-keep-their-output`,
`self-check-runs-beside-another` and `an-update-never-hangs-unpacking-a-version` in
`feature-catalog.yaml`, bundled as `self-check` in `docs/backlog-board/bands.yaml`.
There is no design document; the entries' acceptance criteria and the decisions below
are the design. The fourth member of the bundle, `self-check-clean-baseline-flake`, is
shelved, not built here (see the comment above it).

**One plan for three entries (decided by the specifying session).** The one-sentence
test passes on "a red self-check comes from the change under test and names its cause":
each part removes one way the self-check goes red, or hangs, for a reason outside the
change, or makes such a red unreadable. They touch disjoint lines, and three dispatches
and reviews for about two hundred lines would cost more than they separate. A revert of
one part is a revert of its files. The squash body names each.

**What the specifying session verified on 2026-11-01, against `main` at `9180850`, with
git 2.49.0 and Node v22.15.0 in Claude Code 2.1.300 on Darwin arm64:**

- **The self-check discards every run's output.** `scripts/check-conformance.sh` runs
  each guard as `FRAMEWORK_ROOT="$WORK" $TEST_CMD "$guard" >/dev/null 2>&1`, twice per
  case (clean project, then planted defect), and the clean baseline as
  `FRAMEWORK_ROOT="$WORK" $TEST_CMD >/dev/null 2>&1`. When the baseline fails it runs
  the whole suite **again** and prints `grep -E '^  ● '` of that second run. So an
  intermittent failure prints `FAILED      clean baseline` and no test name: the CI run
  of 2026-10-25 recorded on `self-check-red-runs-keep-their-output` said exactly that.
  `scripts/check-blueprint.sh`'s `run_guard` sends its Jest run to `/dev/null` too; only
  `plant_add`'s *NOT NAMED* branch re-runs and reads output. `CASES` in
  `check-conformance.sh` is a literal assigned without a default from the environment.
  `.self-check/` is in `.gitignore`, and `check-blueprint.sh` already creates it.
- **Who writes into the machine's shared temporary folder.** `scripts/take-version.mjs`
  makes its scratch folder with `mkdtempSync(join(tmpdir(), 'take-version-'))` and
  removes it in a `finally`. `guards/take-version.test.js` spawns it (`w.take`,
  `takeInWorktree`) with no `env`, so its child uses the shared folder, and
  `takeVersionDirs` reads `readdirSync(tmpdir())`; the test *removes its scratch folder
  on every exit path* compares that listing before and after, so another run's
  `take-version-` folder appearing in between turns it red. `guards/update.test.js` has
  the same shape: `run` spawns `.tropis/scripts/update.mjs` with no `env`, `update.mjs`
  makes `mkdtempSync(join(tmpdir(), 'tropis-update-'))`, and `clones` reads
  `readdirSync(tmpdir())`, used in counts (`toBe(2)`), an equality with the listing
  before, and an `rmSync(join(tmpdir(), name))`. `guards/check-version.test.js` already
  isolates: its `check` spawns `check-version.mjs` with
  `env: { ...process.env, TMPDIR: scratch }` and reads `scratch`. That is the pattern to
  follow; Node's `os.tmpdir()` returns `TMPDIR` when it is set, on macOS and Linux.
- **The hang.** `take-version.mjs`'s `buildVersion` runs `git archive --format=tar
  <version>` through `spawnSync` into a buffer, then `spawnSync('tar', ['-x', '-C',
  src], { input: archive.stdout })`. Its comment block above `an-update-never-hangs-…`
  records tar waiting on its standard input after git archive had exited. The module's
  `run(command, args, options)` and `check-version.mjs`'s own `run` both call
  `spawnSync` with no `timeout`. `check-version.mjs` imports `Refusal` and
  `takeVersion` from `take-version.mjs` and rewrites `take-version:` to
  `check-version:` in the messages it prints. `update.mjs` does not run take-version.
  The guards spawn `take-version.mjs` and `check-version.mjs` with `spawnSync` and no
  `timeout`, inside tests whose Jest timeout is `SLOW = 120000`; `spawnSync` blocks the
  worker, so a hung child is never timed out and no test is named.
- **How to run one guard on committed content outside the self-check** (used by the red
  checks below), tried on `9180850`, passing in under 3 seconds:

  ```bash
  S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
  echo '{"type":"module"}' > "$S/package.json"
  cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
  ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
  (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/take-version.test.js -t 'scratch folder'); rm -rf "$S"
  ```

  It reads `HEAD`, so a red check of a reverted line needs a throwaway commit (Traps).
- **New guards are not installed into projects** unless `scripts/set-up-project.sh`
  copies them; it copies a fixed list that names none of the files below, and nothing
  here changes it. A guard named by a conformance case fragment would be run per case;
  `conformance-output` matches no fragment in `CASES`.
- **Review records read.** None exist for these entries. The record of
  `docs/superpowers/plans/2026-11-01-rule-text-says-what-is-true.md` found that the
  isolation command must run from the primary checkout; the Traps say so.
- **No rule or framework document changes**, so no fresh-agent check is owed. The doc
  closeout is the catalog (Task 6) and the header comment of `check-blueprint.sh`; the
  operator guide names neither the logs nor the time limit, and a developer running the
  self-check meets the folder in its verdict line.

**Model tier: Medium.** Bash and Node changes against stated behaviour, with tests to
write and red checks to run; the decisions are made, but the guard and the time-limit
plumbing need care.

**Merge authority: parent review.** This is the check every merge relies on. Stop after
the handover report (Task 7). Do not write a review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

self-check-red-runs-keep-their-output
self-check-runs-beside-another
an-update-never-hangs-unpacking-a-version

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-self-check -b plan/self-check-red-means-something origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `.github/`, `CLAUDE.md` or
  `AGENTS.md`.** They are the installed release, CI, and this repository's entry pair.
- **Add no dependency. Do not lower, skip or delete a guard or a test**, and do not raise
  `SLOW` or any Jest timeout. Every commit has a body saying what becomes true.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from (`guards/check-version.test.js`'s TMPDIR
  pattern is one).

## Decisions

### 1. Where kept output goes, and what is kept

- `scripts/check-conformance.sh` takes `LOGS` from the environment, defaulting to
  `${TMPDIR:-/tmp}/conformance-logs-$$`. Every `$TEST_CMD` run writes its standard output
  and error to a file instead of `/dev/null`. When the run's outcome is a problem —
  `CANNOT RUN`, `NOT CAUGHT`, or the clean baseline `FAILED` — that file is kept as
  `$LOGS/<name>.log` (`mkdir -p "$LOGS"` at that moment), with `<name>` being
  `<defect>-cannot-run`, `<defect>-not-caught` or `clean-baseline`. Otherwise it is
  deleted. Nothing creates `$LOGS` on a passing run.
- **No second run.** When the clean baseline fails, the names printed under it are
  `grep -E '^  ● ' "$LOGS/clean-baseline.log" | sort -u`, indented as today. If that
  finds nothing (a crash, a timeout), print the log's last 20 lines, indented, instead.
- When any problem was found, the closing lines add one:
  `Output of each failing run: <LOGS>`.
- When `GITHUB_ACTIONS` is `true`, after that line print each kept log between
  `::group::<file name>` and `::endgroup::`, so the job's log carries it.
- `CASES` becomes `CASES="${CASES:-<the existing literal>}"`, so a guard can run one case.
  The literal is unchanged.
- `scripts/check-blueprint.sh` sets
  `LOGS="$BP/.self-check/logs/$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "$BP" rev-parse --short HEAD)"`
  and passes it to `check-conformance.sh`. Its own Jest runs (`run_guard`, and the
  output `plant_add` reads) write to a file the same way, kept as
  `$LOGS/framework-<guard>-<what>.log` when the outcome is `FAILED`, `NOT CAUGHT` or
  `NOT NAMED`, deleted otherwise. `plant_add` reads its *NOT NAMED* output from that
  file rather than running the guard a second time. On a red verdict it prints
  `Output of each failing run: <LOGS>` and, under `GITHUB_ACTIONS=true`, the same groups
  for its own kept logs (conformance prints its own). The header comment says where red
  runs keep their output.

### 2. A temporary folder of the test's own

- `guards/take-version.test.js`: `world()` makes `join(parent, 'tmp')` and exposes it
  (for example `w.tmp`). `w.take` and `takeInWorktree` spawn with
  `env: { ...process.env, TMPDIR: w.tmp }`. `takeVersionDirs` takes that folder as an
  argument and reads it; its one caller passes `w.tmp`.
- `guards/update.test.js`: the same for `run` and `clones`, with a folder the test makes
  and removes; the `rmSync` that cleans listed clones removes them from that folder.
- No other test changes for this decision.

### 3. No pipe, and a time limit on every child

- `buildVersion` runs `git -C <tropis> archive --format=tar -o <tmp>/<label>/version.tar
  <version>` and then `tar -x -f <that file> -C <src>`. Nothing is passed as `input`.
- `take-version.mjs`'s `run` passes `timeout: limit` and `killSignal: 'SIGKILL'` to every
  `spawnSync`, with `limit` from `TROPIS_STEP_TIMEOUT_MS` when that is a positive integer
  and 300000 (five minutes) otherwise. Every child it starts goes through `run` (the two
  in `buildVersion` included). When a child is stopped (`result.error?.code ===
  'ETIMEDOUT'`), it refuses with
  `take-version: <step> did not finish within <seconds> s and was stopped.` The unpack's
  step is `unpacking <version>`, the archive's `reading <version>`; a caller that gives
  no step gets `<command> <first argument>`.
- `run` is exported, and `check-version.mjs` uses it in place of its own, so its
  children get the same limit and its existing prefix rewrite turns the refusal into
  `check-version: …`.
- **A guard makes tar hang.** In `guards/take-version.test.js`, a test writes a `tar` into
  a folder of its own containing `#!/bin/sh` and `exec sleep 600` (so the stopped process
  is the sleep, and no orphan holds the pipe), makes it executable, and runs `w.take`
  with `PATH` starting with that folder and `TROPIS_STEP_TIMEOUT_MS=3000`. It expects
  status 1 and stderr matching
  `/^take-version: unpacking v0\.2\.1 did not finish within 3 s and was stopped\./m`
  (adjust the version to the one the test takes), and the scratch folder removed.
- **Every guard spawn of `take-version.mjs` or `check-version.mjs`** in
  `guards/take-version.test.js` and `guards/check-version.test.js` passes `timeout` below
  the test's own limit (for example a `CHILD = SLOW - 20000`) and `killSignal:
  'SIGKILL'`, so a hung child returns and the test that started it fails by name.

### 4. The guard for kept output

`guards/conformance-output.test.js` (new, not installed into projects; open with the
`// Level:` line and a doc comment as the other guards do). It runs
`bash scripts/check-conformance.sh` from the blueprint root it resolves, with
`FIXTURES`, `SCRIPTS` pointing at the blueprint's, `INSTRUCTIONS` empty, `TMPDIR` and
`LOGS` inside a folder of its own, `CASES` set to `orphan-rule:rule-areas`,
`FRAMEWORK_ROOT` unset, and `TEST_CMD` set to `bash <stub>`. The stub, written by the
test, appends each call to a calls file (its argument, or `baseline` when it has none).
With an argument it passes on that argument's odd-numbered calls and on even-numbered
ones prints `  ● <argument> › planted defect` and exits 1 (each case runs clean, then
planted). Without one it prints `  ● stub suite › fails only the first time` and
`FIRST-BASELINE-OUTPUT` and exits 1 on its first call, and exits 0 on later ones. Three
tests:

- **Red baseline:** status 1; stdout contains `● stub suite › fails only the first
  time` and the `LOGS` path; the calls file holds exactly one `baseline`;
  `$LOGS/clean-baseline.log` contains `FIRST-BASELINE-OUTPUT`.
- **On GitHub Actions:** the same run with `GITHUB_ACTIONS=true`; stdout contains
  `::group::clean-baseline.log`, `FIRST-BASELINE-OUTPUT` and `::endgroup::`.
- **Green:** a stub whose baseline always passes; status 0, and `LOGS` does not exist.

Against `main` the first test fails (the second baseline run passes, so no name is
printed and there is no log), which is the failing output.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **A red check needs a throwaway commit.** Make the deliberate defect a commit, run the
  check, record its output, then `git reset --hard HEAD~1`. Never push a throwaway commit.
- **Run the isolation command from the primary checkout of the repository**, the one
  whose directory is named `tropis`, so `../tropis-self-check` is a sibling of it. A
  checkout under `.claude/worktrees/` would put the worktree inside the repository.
- **The hang test must not hang.** If it runs for more than a minute, the fake `tar`'s
  process outlived the kill: check it uses `exec`, and that the test's own spawn has a
  timeout. Stop the run rather than waiting out `SLOW`.
- **`check-conformance.sh` runs with `set -uo pipefail` and no `-e`**, and counts
  problems in `fail`; keep that shape. `check-blueprint.sh` runs with `set -euo
  pipefail`: a `grep` that finds nothing exits 1, so guard it with `|| true` where its
  result is not the point.
- **The two-runs check takes two full self-checks at once**, roughly twice as long as
  one. Run it in the background and wait; do not shorten it.
- **Do not put a colon followed by a space, or a space followed by a hash, inside an
  unquoted YAML value** in the catalog.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/check-conformance.sh` | *Decision 1* |
| `scripts/check-blueprint.sh` | *Decision 1* |
| `guards/conformance-output.test.js` | new, *Decision 4* |
| `guards/take-version.test.js` | *Decisions 2 and 3* |
| `guards/update.test.js` | *Decision 2* |
| `scripts/take-version.mjs` | *Decision 3* |
| `scripts/check-version.mjs` | *Decision 3*, uses the exported `run` |
| `guards/check-version.test.js` | *Decision 3*, child time limits |
| `feature-catalog.yaml` | the three entries to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/superpowers/plans/2026-11-01-self-check-red-means-something.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table, and the Trap about where to run it). In the worktree run
`npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints nothing),
then `bash scripts/check-blueprint.sh` (passes when its last line starts `Self-check
passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `uname -sm`, your tool and version, and the commit you started from.

### Task 1 — Kept output (Decisions 1 and 4)

Write `guards/conformance-output.test.js` first and commit it. Run it alone with the
snippet in the preamble (`guards/conformance-output.test.js`, no `-t`): it must fail on
the red-baseline test, the failing output. Then change `check-conformance.sh` and
`check-blueprint.sh`, commit, and run it again: passes when Jest reports all three tests
passed. Then run `bash scripts/check-blueprint.sh`: passes when its last line starts
`Self-check passed`, and `ls .self-check/logs 2>/dev/null` lists no folder named for
this commit's short hash.

**Red check on the real self-check:** as a throwaway commit, add a test to
`guards/conformance-output.test.js` that always fails (`expect(1).toBe(2)`, named
`throwaway red`), run `bash scripts/check-blueprint.sh`, and record: the clean baseline's
`FAILED` line names `throwaway red`; the output ends with a line naming
`.self-check/logs/<timestamp>-<hash>`; that folder holds `clean-baseline.log`
containing `throwaway red`. Any of the three missing: fix and run again. Then reset the
throwaway commit and delete that log folder.

### Task 2 — A folder of its own (Decision 2)

Apply *Decision 2*, commit. Checks:

```bash
grep -n "readdirSync(tmpdir())" guards/take-version.test.js guards/update.test.js
```

passes when it prints nothing and exits 1 (on `9180850` it printed one line per file).
Run both guards with the snippet: Jest reports every test passed.

**Red check:** as a throwaway commit, delete the `rmSync` of the scratch folder in
`take-version.mjs`'s `finally`; run `guards/take-version.test.js -t 'scratch folder'`
with the snippet; record that it fails. Reset.

**Two runs at once:** make two clones of the branch in two temporary folders
(`git clone -q <worktree> "$TMPDIR/sc-a"` and `sc-b`, each followed by
`npm --prefix .tropis ci`), then start `bash scripts/check-blueprint.sh` in both at the
same moment, in the background, each writing to its own file, and wait for both. Passes
when both last lines start `Self-check passed`. Record both last lines and the wall
time. Delete the clones.

### Task 3 — No pipe, a time limit (Decision 3)

Write the hang test and commit it; run it alone with the snippet and record that it
fails within a minute (the child's guard-side limit stops it; the expected refusal is
missing). Then change `take-version.mjs` and `check-version.mjs` and the guard spawns,
commit, and run `guards/take-version.test.js` and `guards/check-version.test.js` with
the snippet: passes when Jest reports every test passed. Checks:

```bash
grep -c "input: archive" scripts/take-version.mjs
grep -n "spawnSync(" scripts/take-version.mjs scripts/check-version.mjs
```

The first passes when it prints `0` (on `9180850`, `1`). The second passes when it
prints only the line inside the exported `run`. Read every spawn of
`take-version.mjs` and `check-version.mjs` in the two guards and record, for each, that
it passes `timeout`.

### Task 4 — The full suite

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

### Task 5 — Map criteria to evidence

For each acceptance criterion of the three entries, name the test or recorded check
that covers it, and check that the named test runs what the criterion describes. Put the
table in the handover. A criterion with neither: say so and do not ship that entry.

### Task 6 — Catalog

In `feature-catalog.yaml`, on each of the three entries: set `status: shipped`; set
`modules` to the files of *File Structure* that entry's decisions touch (catalog and
plan excluded); and directly above its `- id:` line, below the comments already there,
add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-self-check-red-means-something.md; each
# criterion's test or check is in that plan's handover report.
```

Leave `self-check-clean-baseline-flake` and `docs/backlog-board/bands.yaml` alone. Commit,
then re-run Task 4's two commands and `git diff --stat origin/main...HEAD` (passes: only
the *File Structure* files).

### Task 7 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*), each check's command with its actual
output, the criteria table, and the worktree path used. Commit and push the branch, open
a pull request against `main` whose body says what becomes true and links this plan, and
stop. Do not write a review record and do not merge.
