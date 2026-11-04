# The capture-at-write hook tests give the same answer on every run — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the capture-at-write cases in `guards/rule-delivery.test.js` run the hook with
a temporary folder of their own, so a marker an earlier run left behind can no longer
silence the hook and fail the case.

**Backlog item:** `capture-at-write-tests-pass-under-load` in `feature-catalog.yaml`
(type bug).

**One plan:** what becomes true is one sentence — the capture-at-write cases start from
no state an earlier run left. The test rule's new clause is the lesson that sentence
teaches, delivered where the next test of the same kind is written.

**Model tier: Small.** Every change is given below, the code nearly verbatim and the rule
text verbatim.

**Merge authority: parent review.** The change adds a clause to `rules/tests.md`, which
owes a fresh-agent check; the specifying session runs it at review. Stop after Task 5;
do not open a pull request, write a review record or merge.

**Merges after:** probe-keeps-to-its-tools

**What the specifying session verified on 2026-11-04, against `origin/main` at `a59bf5a`
(node v22, Linux x86_64, in a Claude Code cloud session):**

- `scripts/capture-at-write.sh` keeps a once-per-session marker at
  `${TMPDIR:-/tmp}/capture-write-${session}/emitted` and exits silently when it exists.
  Nothing removes it: not the hook, not the test file.
- `guards/rule-delivery.test.js` names each session
  `` `p13-${process.pid}-${seq++}` `` (`freshSession`, near the top), and spawns the
  hook with the inherited `TMPDIR` in three places: `runWriteHookOn`, the case
  `capture-at-write sends the same reply with and without Claude Code` (its `run`), and
  the case `exits 0 with no output on malformed JSON`.
- So a run whose jest process gets a process id an earlier run had finds that run's
  markers for the same session names, and the hook replies with nothing.
  `contextOf('')` then throws `Unexpected end of JSON input` — the exact failure the
  backlog item records. Process ids wrap at `/proc/sys/kernel/pid_max` (32768 in this
  container), sooner the more processes parallel sessions spawn, which is why it looked
  like load. The self-check runs this guard many times (once per conformance fixture
  that runs it, plus the baseline), each run leaving its markers.
- **Reproduced.** In a stage built as `scripts/check-blueprint.sh` builds it, with
  `T=$(mktemp -d)`, running twice
  `TMPDIR=$T unshare -pf --mount-proc node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/rule-delivery.test.js -t "capture-at-write"`
  (a new process-id namespace gives jest the same process id both times) printed
  `Tests: 145 skipped, 12 passed, 157 total` and then
  `Tests: 6 failed, 145 skipped, 6 passed, 157 total` — six, as in the backlog item. The
  six: `capture-at-write sends the same reply with and without Claude Code`,
  `emits the check for a rule addition`, `emits the four-question check for a rule file`,
  `emits for a decision record and a framework document`,
  `emits the check at most once per session`,
  `emits for the Claude Code PreToolUse envelope`.
- No other script under `scripts/` keeps state keyed by session id in `TMPDIR`
  (`grep -n TMPDIR scripts/*.sh`), so no other guard has this defect. In real use
  Claude Code's session ids are UUIDs and do not collide, so the hook is not changed.

**Decided by the specifying session:**

- **The test file owns the folder.** One folder made with `mkdtempSync` when the file
  loads, passed as `TMPDIR` to every spawn of the write hook, removed in an `afterAll`.
  This is the mechanism; it makes a leftover marker unreachable whatever the session is
  called.
- **Session names are drawn at random as well** (`randomUUID` from `node:crypto`), so a
  case that someday spawns the hook without the folder still cannot meet an old marker
  by process id.
- **A case pins the folder**: the marker lands in the test file's folder and not in the
  machine's, so dropping the `TMPDIR` from `runWriteHookOn` turns it red.
- **The lesson goes into `rules/tests.md`** with its incident in
  `rules/incidents/tests.md`, worded below. It is portable: any test of a script that
  keeps state in a shared folder has it.
- The hook is not changed, and no decision record: nothing chose between alternatives a
  later reader needs.

---

## Delivers

capture-at-write-tests-pass-under-load

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-capture-load -b plan/capture-at-write-tests-pass-under-load origin/main` |

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

## Acceptance criteria (as the claim set them)

1. Every case that runs the capture-at-write hook runs it with a temporary folder the
   test file creates and removes, so no marker an earlier run left can reach it.
2. A case asserts the hook's marker lands in that folder and not in the machine's
   temporary folder, and goes red when the folder is no longer passed.
3. The capture-at-write cases pass twice in a row run with the same process id, where
   before the change the second run failed six of them.
4. The test rule tells an agent that state a test leaves in a shared folder outlives
   the run, so the test gives it a folder of its own, and a fresh agent writing such a
   test follows it.

## The change

### `guards/rule-delivery.test.js`

1. Import `randomUUID` from `node:crypto`.
2. Replace
   ```js
   let seq = 0;
   const freshSession = () => `p13-${process.pid}-${seq++}`;
   ```
   with
   ```js
   const freshSession = () => `p13-${randomUUID()}`;
   ```
3. Directly after `const writeHook = …`, add:
   ```js
   // The hook keeps a once-per-session marker under TMPDIR and nothing removes it, so a
   // run that shared the machine's folder could inherit an earlier run's markers and hear
   // nothing. Every spawn of the hook gets this folder instead.
   const hookTmp = mkdtempSync(join(tmpdir(), 'rule-delivery-hooks-'));
   const inHookTmp = (env = process.env) => ({ ...env, TMPDIR: hookTmp });
   ```
4. Pass `env: inHookTmp()` in `runWriteHookOn`'s `spawnSync` and in the case
   `exits 0 with no output on malformed JSON`; in the case
   `capture-at-write sends the same reply with and without Claude Code`, its `run`
   passes `env: inHookTmp(env)`.
5. Inside `describe('rule delivery', …)`, as its first statement, add
   `afterAll(() => rmSync(hookTmp, { recursive: true, force: true }));`.
6. Update the file's header paragraph that begins `Each case uses a unique session id`
   to say each case uses a random session id and every spawn of the write hook gets the
   file's own `TMPDIR`, because the hook's markers outlive the run.

### The new case

In `describe('capture-at-write surfaces Phase 2 when a rule is written', …)`, after
`emits the check at most once per session`:

```js
it('keeps its marker in the test file\'s own folder, not the machine\'s', () => {
  const dir = repoWithCaptureCommand();
  tmpDirs.push(dir);
  const { stdout, session } = runWriteHookOn(dir, '.claude/rules/backend.md');
  expect(contextOf(stdout)).toContain(PHASE2);
  expect(existsSync(join(hookTmp, `capture-write-${session}`, 'emitted'))).toBe(true);
  expect(existsSync(join(tmpdir(), `capture-write-${session}`))).toBe(false);
});
```

It must fail when `runWriteHookOn` stops passing `env: inHookTmp()` (Task 3 checks this).

### `rules/tests.md`

Append, as the last bullet, exactly:

```markdown
- **A test of something that keeps state in a shared folder gives it a folder of its
  own.** A script or hook that writes a marker into the machine's temporary folder, keyed
  by a name the test chose, leaves it there after the run. A name built from the process
  id comes round again — process ids are reused, sooner the busier the machine — and a
  later run then starts from the earlier run's state: the case fails, and passes on the
  rerun with nothing changed, which reads as load. Point the shared folder (`TMPDIR`, a
  home or cache directory) at one the test creates and removes, and draw names at
  random. (Incident:
  `.tropis/rules/incidents/tests.md#six-hook-cases-that-inherited-an-earlier-runs-markers`)
```

### `rules/incidents/tests.md`

Append, at the end:

```markdown
## Six hook cases that inherited an earlier run's markers

In this framework a self-check on a machine at a load average near 47 failed six cases
of the capture-at-write hook, the hook replying with nothing, and passed on the rerun
with nothing changed. It was filed as load, beside two polling cases that were. The
cases named each session after the process id and a counter, and the hook's
once-per-session markers in the shared temporary folder were never removed; a run that
drew an earlier run's process id found its markers, and the hook stayed silent. Run
twice in a new process-id namespace, so jest had the same process id both times, the
second run failed the same six cases.
```

The heading's slug is `six-hook-cases-that-inherited-an-earlier-runs-markers`, which the
pointer above names; `guards/rule-incidents.test.js` checks the two match.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run the guard alone the way the self-check stages it.** Build a stage:
  `S=$(mktemp -d) && git archive HEAD | tar -x -C $S && echo '{"type":"module"}' > $S/package.json && cp $S/templates/framework-jest.config.js $S/jest.config.js && ln -s "$PWD/.self-check/node_modules" $S/node_modules`
  (run `bash scripts/check-blueprint.sh` once first so `.self-check/` exists), then from
  `$S`: `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/rule-delivery.test.js -t "capture-at-write"`.
  Rebuild the stage after each commit.
- **The reproduction needs `unshare`, run as root** (`unshare -pf --mount-proc`). Give
  each pair of runs a fresh `T=$(mktemp -d)` as `TMPDIR`, so the first run of the pair
  starts clean. If `unshare` is refused, say so in the handover with its message and go
  on; criterion 3 then rests on the specifying session's re-run.
- **`.claude/rules/tests.md` is the installed copy.** Do not touch it; the source is
  `rules/tests.md`.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `guards/rule-delivery.test.js` | the folder, random session names, one case |
| `rules/tests.md` | one clause |
| `rules/incidents/tests.md` | its incident |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to evidence (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's block removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-04-capture-at-write-tests-pass-under-load.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the rule clause and its incident are
the closeout (a portable lesson; this repository is the upstream). No decision record,
no operator-guide or architecture change. A release-note line is the developer's at
`/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The failure, before the change

Build a stage from `HEAD` (*Traps*). With a fresh `T`, run the reproduction command
from *What the specifying session verified* twice from the stage. Expected: the first
run all passed, the second `6 failed`. Paste both `Tests:` lines.

### Task 2 — The change

Make every change under *The change* to `guards/rule-delivery.test.js`. Commit. Rebuild
the stage. Run the guard alone, whole file (no `-t`): every case passes. Then, with a
fresh `T`, the reproduction twice: both runs pass. Paste the three `Tests:` lines.

### Task 3 — The new case goes red without the folder

In a scratch copy of the stage (not the worktree), delete `env: inHookTmp(),` from
`runWriteHookOn` and run the guard with `-t "own folder"`. Expected: the new case fails
on the `toBe(true)` of the marker in `hookTmp`. Paste the failing line. Discard the
scratch copy.

### Task 4 — The rule, the backlog and the board

1. Append the clause to `rules/tests.md` and the incident to `rules/incidents/tests.md`,
   exactly as given.
2. In `feature-catalog.yaml`, on `capture-at-write-tests-pass-under-load`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them; set `modules` to
   `guards/rule-delivery.test.js` and `rules/tests.md`; add
   `docs/superpowers/plans/2026-11-04-capture-at-write-tests-pass-under-load.md` to
   `refs`. Replace the comment block directly above the item (it begins `# Seen
   executing` and ends `reproduced in the plan.`) with:
   ```
   # Shipped by docs/superpowers/plans/2026-11-04-capture-at-write-tests-pass-under-load.md.
   # The cause was not load: the cases named sessions after the process id, and the hook's
   # markers in the shared temporary folder outlived each run, so a run that drew an
   # earlier run's process id inherited its markers and the hook stayed silent.
   # Criterion 1: guards/rule-delivery.test.js, every spawn of the write hook passes inHookTmp.
   # Criterion 2: guards/rule-delivery.test.js, 'keeps its marker in the test file's own folder, not the machine's'.
   # Criterion 3: the reproduction in the plan's handover report, before and after.
   # Criterion 4: rules/tests.md, and the fresh-agent check in the squash commit's body.
   ```
   Quote any comment or value you add only if the YAML needs it; comments do not.
3. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
4. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check, and that the fresh-agent check is the specifying
   session's). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/capture-at-write-tests-pass-under-load`. **Do not open a
   pull request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.

## Handover report

### Task completion

Tasks 0 to 5 done in order. No developer-only step in this plan.

### Verification results

Tools: git 2.43.0, node v22.23.4, Linux x86_64 (Claude Code cloud session, root).

- Task 0: `bash scripts/check-blueprint.sh` on the untouched worktree: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1, before the change, reproduction twice in a new process-id namespace with a fresh `TMPDIR`:
  `Tests:       145 skipped, 12 passed, 157 total` then
  `Tests:       6 failed, 145 skipped, 6 passed, 157 total`.
- Task 2, after the change, reproduction twice with a fresh `TMPDIR`:
  `Tests:       145 skipped, 13 passed, 158 total` and
  `Tests:       145 skipped, 13 passed, 158 total`.
- Task 3, scratch stage with `env: inHookTmp(),` deleted from `runWriteHookOn`, `-t "own folder"`: `Expected: true` / `Received: false` at `expect(existsSync(join(hookTmp, \`capture-write-${session}\`, 'emitted'))).toBe(true);`, `Tests: 1 failed, 157 skipped, 158 total`.
- Task 4: `npm --prefix .tropis test`: `Tests:       177 passed, 177 total`.
- Final: `bash scripts/check-blueprint.sh` last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.` (re-run after this report's commit, see below).

### Scope

Worktree: `../tropis-capture-load` (tropis). Diff files are all in File Structure; `docs/backlog-board/index.html` was not changed (nothing rebuilt it).

### Judgment calls

None beyond the plan. Source worked from: none in particular; written against this repository's own names.
The new case sits before `is wired on Edit and Write, and not on Read`, directly after `emits the check at most once per session`'s neighbour order as in the plan.

### What the plan got wrong

- Task 2 says to run the guard alone, whole file, in the stage and expect every case to pass. In a bare stage 78 cases fail both before (`78 failed, 79 passed`) and after (`78 failed, 80 passed`) the change, because the file resolves `.tropis/hooks/...` from `FRAMEWORK_ROOT` or the installed layout and the stage has none (exit 127). The whole-file check only means something inside the self-check, which passed. The capture-at-write subset is unaffected.
- The `feature-catalog.yaml` item already had `modules` and `refs` set as Task 4 asks, and was `status: building`.

### Outstanding

The change has no screen, so there is no developer check. The fresh-agent check of the `rules/tests.md` clause is the specifying session's, at review.
