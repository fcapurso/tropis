# The main-status tests give the same answer however busy the machine is — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** no case in `guards/main-status.test.js` can change its answer with the speed of
the machine. Cases whose answer is not "still waiting at the deadline" run with a
deadline the stub's sequence can never reach; one case slows every stub `gh` call on
purpose, so a deadline tightened later is caught; and the test rule says why.

**Spec:** the entry `main-status-tests-pass-under-load` in `feature-catalog.yaml`: its
acceptance criteria, and the comments above it, which record the evidence and the
decisions taken when it was shaped. There is no design document.

**One plan:** what becomes true is one sentence — the main-status tests answer the same
on a busy machine as on an idle one. The rule bullet is the lesson of that fix, routed
where the doc closeout sends a portable lesson.

**What the specifying session verified on 2026-11-01, against `origin/main` at `03f7459`,
with Node v22.15.0 and Jest 30.5.2 on macOS 26.2, arm64 (Claude Code 2.1.300):**

- **The failures.** Six full self-check runs on 2026-11-01, two in each of three
  sessions' worktrees, failed the clean baseline on `--pull-request › brings a branch
  that is behind up to date once, and waits on` and `--pull-request › never asks twice to
  update the same head` (one of them on the second only), each `Expected: 0, Received:
  3`, and the same trees passed on a rerun with nothing changed. In the two kept logs the
  file took 124 and 84 seconds; alone, at load average 4, it took 20.
- **Why exit 3.** Exit 3 from `--pull-request` is `scripts/main-status.mjs`'s own
  deadline: `seeThrough` computes `deadline = Date.now() + timeoutMs` once, and after
  each pass that has not ended it checks `Date.now() >= deadline` before sleeping
  `intervalMs`. Both describe blocks in the test file define
  `const fast = ['--interval', '0.05', '--timeout', '0.05'];` (lines 183 and 245), and
  `--timeout` is in minutes, so every case using `...fast` has three seconds. The two
  failing cases need three passes (behind, then clean or behind, then merged), about six
  stub `gh` calls before the second deadline check. Each call is a `bash` process.
- **The mechanism, reproduced.** With one line added to the stub's start that sleeps
  `$STUB_SLOW` seconds, `STUB_SLOW=0.5` passed all 47 cases and `STUB_SLOW=0.8` failed
  exactly five, all exit 3: the two above first, then `waits while a run on the head is
  still going, then stops`, `goes on waiting when the rules cannot be read, and asks only
  once` and `does not report a head that has no run` — every case that polls more than
  once. The `--wait` case `waits for the run on the commit to appear and finish` polls
  three times and would follow at about one second per call.
- **Real load alone did not reproduce it here.** The file passed 3 of 3 under 40 busy
  loops (load average 11), 3 of 3 under 40 process-spawning loops (load average 132), and
  2 of 2 under 30 of each with the test run at `nice -n 20` (load average 63). So the
  load run in Task 4 is a check that the fix holds under load, not a proof that it was
  needed; the slowed-stub case in Task 1 is that proof.
- **The cases that test the deadline** pass their own short `--timeout`, not `fast`:
  line 222 (`--wait`, `0.005`), line 363 and line 418 (`--pull-request`, `0.005`), and
  lines 175 and 177 (`0.01`, in `never runs gh with %s`, which returns before any
  poll). They exit 3 sooner on a slow machine, never later, so they are not at risk and
  are left as they are.
- **`...fast);`** occurs 23 times, and `fast` occurs nowhere else but the two
  definitions.
- **The stub** starts `const STUB_GH = \`#!/usr/bin/env bash` and then
  `echo "$*" >> "$STUB_DIR/gh.log"`. The test's `env` is `{ ...process.env, PATH: …,
  STUB_DIR: dir }`, rebuilt in `beforeEach`, and `cli` spawns with that `env`, so a key
  set on `env` inside a case reaches the stub and is gone in the next case.
- **The rule's source** is `rules/tests.md`, which has no header; the installed
  `.claude/rules/tests.md` is generated from it and is not edited (Global Constraints).
  `guards/dispatch.test.js` accepts a plan listing `rules/tests.md` alone.
- **Review records read.** None exist for this entry. The record of
  `docs/superpowers/plans/2026-11-01-project-has-one-display-name.md` is the model for
  the fresh-agent task below.

**Model tier: Small–medium.** The test and rule text are given verbatim and every check
states its passing output; the one judgment, reading the fresh agent's test file, is
reduced to stated numbers.

**Merge authority: parent review.** Stop after the handover report (Task 6). Do not write
a review record, open a pull request or merge.

**Requires:** a shell, git and Node; `claude` on `PATH` for the fresh-agent check.

Do not store a kick-off prompt on this plan.

---

## Delivers

main-status-tests-pass-under-load

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-main-status-load -b plan/main-status-tests-pass-under-load origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `.github/`, `CLAUDE.md` or
  `AGENTS.md`.** They are the installed release, CI, and this repository's entry pair.
- **Do not change `scripts/main-status.mjs`.** The command is right; the tests are not.
- **Add no dependency. Do not skip or delete a test**, and change no deadline other than
  the one *Decision 1* names.
- **Push only to this plan's branch.** Every commit has a body saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. Cases that do not test the deadline get one they cannot reach

In `guards/main-status.test.js`:

1. Delete both lines `    const fast = ['--interval', '0.05', '--timeout', '0.05'];`.
2. Directly after the line `  const cli = (...args) => spawnSync('node', [script, ...args], { cwd: repo, env, encoding: 'utf8' });`
   insert, verbatim:

   ```js
     // Polling options for a case whose answer is not "still waiting at the deadline". The
     // stub's last answer ends the wait, so the two-minute deadline only bounds a script
     // that never stops. A three-second one made cases that poll several times exit 3 on a
     // busy machine, where one stub gh call can take most of a second. A case that tests the
     // deadline passes a short --timeout of its own.
     const settles = ['--interval', '0.05', '--timeout', '2'];
   ```

3. Replace every `...fast);` with `...settles);`:
   `perl -pi -e 's/\.\.\.fast\);/...settles);/g' guards/main-status.test.js`.

Two minutes is the honest figure, not a raised timeout hiding a cause: the deadline was
never what these cases test. A failing sequence still fails at once on its assertions;
only a script that never stops waits the two minutes, and then fails with exit 3.

### 2. The stub can be slowed, and one case slows it

1. In `STUB_GH`, directly after the line `const STUB_GH = \`#!/usr/bin/env bash`, insert:

   ```bash
   if [ -n "$STUB_SLOW" ]; then sleep "$STUB_SLOW"; fi
   ```

   (The `$` signs are not followed by `{`, so they need no escaping in the template
   literal.)
2. Add to the comment block above `STUB_GH`, after its last line
   (`// and runs.json otherwise.`):

   ```js
   // With STUB_SLOW set, every call first sleeps that many seconds.
   ```

3. In the `--pull-request` describe block, directly after the case
   `never asks twice to update the same head`, add:

   ```js
       it('gives the same answer when every gh call is slow', () => {
         env.STUB_SLOW = '0.8';
         pulls(pull({ mergeable_state: 'behind' }), pull({ mergeable_state: 'behind' }), MERGED);
         const r = cli('--pull-request', '7', ...settles);
         expect(r.status).toBe(0);
         expect(r.stdout).toBe(GREEN);
         expect(updates()).toHaveLength(1);
       });
   ```

   It takes about six seconds. That is the price of catching a deadline someone tightens
   again; one case pays it, not every case.

### 3. The test rule says what a deadline in a test is for

In `rules/tests.md`, append after the last bullet (the one beginning
`- **A precise check that replaces a crude one`), verbatim:

```markdown
- **A deadline in a test stops a hang; it is not something the code must beat.** Where a
  test runs something that polls a fake until the fake's last answer ends it, give that
  run a deadline it cannot reach on any machine, and pass a short one only in a test of
  the deadline itself. A deadline the fake's sequence must beat makes the answer depend
  on how busy the machine is: in this framework two cases that polled a stub three times
  under a three-second deadline exited "still waiting" during busy runs and passed on the
  rerun with nothing changed. Slow every call of the fake in one test, so a deadline
  tightened later is caught.
```

### 4. What this owes, and does not

- **Fresh-agent check: yes**, because `rules/tests.md` changes what an agent is told.
  Task 3.
- **No `framework/DECISIONS.md` entry.** The choice between a long deadline, counting
  polls in the command, and an injected clock is recorded in the comments above the
  catalog entry; it changes no part of how the framework works.
- **No change to `.claude/`**: the installed rule follows when a release is installed.
- **No `README.md` or release-notes edit** (`/refresh-readme` and `/release` own them),
  and no operator-guide change: nothing a developer runs changes.

## Traps

- **Task 1 must fail.** The new case runs with the old three-second deadline there, and
  exit 3 is the expected red. That is the red step, not a breakage.
- **The one-file run and the self-check read `HEAD`.** Commit before each run.
- **The load run in Task 4 is slow and makes the machine sluggish.** Run it in the
  background if your tool stops commands sooner than ten minutes. The script kills its
  loops on exit; afterwards check `pgrep -f 'while :; do' | wc -l` prints `0`, and kill
  any that remain.
- **`npm --prefix .tropis test` runs the installed release's checks**, not this source;
  it is run only to show the catalog edit is well-formed.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `guards/main-status.test.js` | *Decisions 1 and 2* |
| `rules/tests.md` | *Decision 3* |
| `feature-catalog.yaml` | the entry to `shipped`, and a comment naming what covers each criterion (Task 5) |
| `docs/superpowers/plans/2026-11-01-main-status-tests-pass-under-load.md` | the handover report |

Nothing else.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing). Record `git --version`, `node --version`, `uname -sm`, `sw_vers -productVersion`
(or the system's equivalent) and `sysctl -n hw.ncpu` (or `nproc`) for the handover.

Define the one-file run used below. It reads `HEAD`:

```bash
one_file() {
  S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
  echo '{"type":"module"}' > "$S/package.json"
  cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
  ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
  (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/main-status.test.js 2>&1 | grep -E '^Tests:|●')
  rm -rf "$S"
}
```

Run `one_file` once. Expected: `Tests:       47 passed, 47 total`.

### Task 1 — The slow case, red

Apply *Decision 2* only, but in step 3 write `...fast` in place of `...settles` (the
old options, which still exist). Commit. Run `one_file`. Expected: exactly one failure,
`● main branch status › --pull-request › gives the same answer when every gh call is
slow`, and `Tests:       1 failed, 47 passed, 48 total`. Paste the output.

If it passes, the case cannot catch the defect: stop and hand back with the output.

### Task 2 — The deadline, green

Apply *Decision 1* (its step 3 also turns the new case's `...fast` into `...settles`).
Commit. Run `one_file`. Expected: `Tests:       48 passed, 48 total`. Then run
`grep -c 'fast' guards/main-status.test.js` — expected `0` — and
`grep -c '\.\.\.settles);' guards/main-status.test.js` — expected `24`. Paste all three.

### Task 3 — The rule, and its fresh-agent check

Apply *Decision 3*. Commit.

Then run a fresh agent with its tool calls visible, from the worktree, with permission
to run shell commands and write files (in Claude Code:
`claude -p --output-format stream-json --verbose --permission-mode bypassPermissions "<prompt>"`).
Prompt, verbatim apart from the two paths:

*"This is a probe; its output will be discarded. In `<scratch>` (an empty folder, a
Node project with `"type": "module"`), write `poll.mjs`: it runs the command `status`
from PATH every `--interval` seconds until it prints `done`, then exits 0; at
`--timeout` seconds it gives up and exits 3. Write `poll.test.js` for it with Jest,
using a fake `status` script put first on PATH, with at least these cases: the fake
prints `waiting` twice then `done`, and poll exits 0; the fake always prints `waiting`,
and poll exits 3. Follow this project's test rules, in `<worktree>/rules/tests.md`. Do
not run npm install. Say in one sentence why you chose each `--timeout` value."*

Use `"$TMPDIR/deadline-probe"` (created empty) as `<scratch>`.

Pass: in the agent's `poll.test.js`, the exit-0 case's `--timeout` is at least ten times
what its fake sequence needs (or the case states no deadline the sequence has to beat),
the exit-3 case's is short, and the agent's sentence gives the hang-versus-deadline
reason. Quote the `--timeout` values from its file and its sentence. If it fails, the
bullet is not clear enough: change it, commit, and run the probe again. If it fails
twice, stop and hand back with both transcripts' relevant parts. Record the tool, its
version, the operating system and the architecture in the commit body of a commit
(an `--allow-empty` commit is fine) and in the handover. Delete the scratch folder.

### Task 4 — The load run

Write this script to `$TMPDIR/load.sh` (outside the worktree):

```bash
#!/usr/bin/env bash
# load.sh <loops> <runs> <dir>: runs main-status.test.js <runs> times at the lowest
# priority while <loops> busy loops and <loops> process-spawning loops run.
pids=()
for i in $(seq "$1"); do
  (while :; do :; done) & pids+=($!)
  (while :; do /bin/sh -c : ; done) & pids+=($!)
done
trap 'kill "${pids[@]}" 2>/dev/null' EXIT
sleep 5; uptime
cd "$3" && for r in $(seq "$2"); do
  nice -n 20 node --experimental-vm-modules node_modules/.bin/jest guards/main-status.test.js 2>&1 | grep -E '^Tests:|●'
done
uptime
```

Build the one-file tree from `HEAD` as `one_file` does, but keep it: run the first four
lines of `one_file`'s body, then `bash "$TMPDIR/load.sh" <3 × the core count> 3 "$S"`,
then `rm -rf "$S"`. Expected: three lines `Tests:       48 passed, 48 total`, no `●`
line, and the two `uptime` lines. Paste the output, including both load averages. Then
confirm no loop survives (Traps).

If a case fails under load, that is a real finding: stop and hand back with the output.

### Task 5 — The catalog

In `feature-catalog.yaml`, on `main-status-tests-pass-under-load`: set `status: shipped`
(it reads `building` once dispatched; if it reads anything else, set `shipped` anyway and
say so under *Judgment calls*). Leave `modules`, `refs` and the criteria as they are. Add,
directly above the entry's `- id:` line and below the existing comments:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-main-status-tests-pass-under-load.md.
# Criterion 1 - main-status.test.js, the settles options. Criterion 2 - its case "gives
# the same answer when every gh call is slow", red with the old deadline in that plan's
# Task 1. Criterion 3 - the load run in that plan's handover report, re-run in its review
# record. Criterion 4 - the fresh-agent check recorded in the commit body.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit. Run
`npm --prefix .tropis test` and paste the `Tests:` line; every test must pass.

### Task 6 — Verification and handover

1. From the worktree, everything committed: `bash scripts/check-blueprint.sh` (paste the
   last line, which must start `Self-check passed`), and
   `git diff --stat origin/main...HEAD` (paste it; every file must be in
   *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/main-status-tests-pass-under-load`).
   **Stop there.** Do not open a pull request, write a review record, set auto-merge or
   merge: the dispatching session reviews, and opens the pull request when it holds the
   merge token. Leave the worktree in place; the reviewer removes it.
