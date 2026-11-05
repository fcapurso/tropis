# An executor never stops the session that dispatched it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a new shipped hook refuses a call to stop or archive the cloud session the
calling agent runs in. A subagent shares its session with the agent that started it, so
that call stops its dispatcher, and nothing resumes it until a person does.

**Backlog item:** `executor-never-interrupts-its-dispatcher` in `feature-catalog.yaml`
(type bug). There is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — an agent in a project set up from the
next release cannot interrupt or archive the session it is running in.

**What the specifying session verified on 2026-11-05, against `origin/main` at
`8f36064`, in a Claude Code 2.1.318 cloud session on Linux x86_64:**

- **What happened** (the item's comment in `feature-catalog.yaml`). A sprint team
  member's executor, a Claude Code subagent in the team member's cloud session, finished
  its plan, committed its handover, and then called `interrupt_session` on the team
  member's own session. The session sat idle from 18:16 to about 20:40 UTC, the sprint
  status showed it as building throughout, and two items waiting to merge after it were
  held up with it. The developer resumed it by hand.
- **The tools.** A cloud session has `mcp__claude-code-remote__interrupt_session` and
  `mcp__claude-code-remote__archive_session`, each taking a required `session_id`
  (`session_...`). Both act on any session of the account, the caller's own included.
  A subagent's tool calls are made in its parent's session.
- **How a session knows its own id.** In this session the environment holds
  `CLAUDE_CODE_REMOTE_SESSION_ID=cse_<X>`, and `get_session` with
  no id answered `"id":"session_<X>"`: the same `<X>` after the
  first `_`, with a different prefix. `CLAUDE_CODE_REMOTE=true` there as well. Outside
  a cloud session the variable is absent.
- **A fresh `claude -p` in the cloud container has neither tool** (asked, it named
  none), so the hook cannot be measured live by a `claude -p` probe there; the review
  measures it in a throwaway cloud session (*Outstanding* below, and Task 5).
- **How a hook is shipped.** `scripts/installed-hooks.txt` lists the hooks;
  `scripts/set-up-project.sh` and `scripts/check-conformance.sh` read it, and
  `guards/set-up-project.test.js` builds its expected file list from it and checks every
  command in the installed `.claude/settings.json` has the form
  `bash .tropis/hooks/<name>` with the file present. `templates/settings.json` wires the
  hooks and its `_comment` describes them. `scripts/take-version.mjs` merges the
  framework's hook groups into a project's `.claude/settings.json` on update, adding a
  group whose matcher the project lacks; `guards/take-version.test.js`, around line 655,
  asserts the sorted list of matchers after an update is
  `['Bash', 'Edit', 'Read', 'Write']`, which the new group changes.
- **How a hook that refuses is built.** `scripts/branch-in-worktree.sh` is the
  precedent: second line `# Shared machinery: no part of this file is project-owned.`,
  a header saying what it refuses and why, the payload read with `python3`, exit 2 with
  its message on stderr. Its tests are in `guards/rule-delivery.test.js`,
  *branch-in-worktree refuses a branch created in the main checkout*, including a test
  that it is wired in `templates/settings.json` and listed in
  `scripts/installed-hooks.txt`. `.claude/rules/harness-scripts.md` holds the rules for
  hooks, among them: exit 0 and say nothing when the payload does not apply; exit 2
  with the message on stderr to stop a call.
- **Nothing in `.claude/` changes here.** This repository's own sessions get the hook
  only once a release carrying it is installed.

**Model tier: Medium.** The behaviour, the matcher, the message and the tests are
specified; the script and the test code are the executor's to write.

**Merge authority: parent review.** The specifying session reviews, measures the hook
live in a throwaway cloud session and merges. Stop after the handover report (Task 4).
Do not write a review record and do not merge.

**Fresh-agent check: not owed.** No file under `framework/` or `rules/` changes, and the
hook's refusal is its own instruction at the moment it applies.

Do not store a kick-off prompt on this plan.

---

## Delivers

executor-never-interrupts-its-dispatcher

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-self-interrupt -b plan/executor-never-interrupts-its-dispatcher origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.** Add no dependency.
- **Never call `interrupt_session` or `archive_session` yourself**, on any session, in
  any test or probe. The hook is tested by running the script with payloads.
- **Every commit has a body.** Push only to this plan's branch.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed. The tests
  use invented ids such as `cse_01TESTOWN` and `session_01TESTOWN`.

## Decisions

### 1. A new hook, `scripts/own-session-guard.sh`, that refuses

Shared machinery (second line `# Shared machinery: no part of this file is
project-owned.`), with a header comment in the voice of `branch-in-worktree.sh` saying
what it refuses, why (the incident in one sentence, without names), why it refuses
rather than advises, and that it reads the session's own id from the environment.

1. Read `tool_name` and `tool_input.session_id` from the payload on stdin with
   `python3`, as `branch-in-worktree.sh` reads the command. Malformed JSON reads as
   empty.
2. **Exit 0 with no output** unless `tool_name` ends with `__interrupt_session` or
   `__archive_session` (any server prefix: the server's name is the project's choice).
3. **Exit 0 with no output** when `CLAUDE_CODE_REMOTE_SESSION_ID` is unset or empty, or
   `session_id` is empty.
4. Compare the two ids after their first `_` (`cse_X` and `session_X` are one session).
   An id with no `_` compares whole. **Different: exit 0 with no output.** A session
   may stop another session, such as a sprint stopping a team member.
5. **The same: exit 2**, with this message on stderr, `<verb>` being `interrupt` or
   `archive` by the tool name and `<id>` the `session_id` given:

   ```
   Refused: this would <verb> the session you are running in (<id>).
   A subagent runs in the session of the agent that started it, so this stops that agent too, and nothing resumes it until a person does.
   To finish, end your turn and return your report: the agent that dispatched you reads it.
   (own-session-guard.sh)
   ```

Rejected: a sentence in the dispatch prompt alone (it is in front of the executor at the
start, not at the call, and the executor in the incident had read its plan); refusing
every interrupt from a subagent (a hook cannot tell a subagent's call from its parent's
in the payload this plan relies on, and a sprint session legitimately interrupts its team
members, which are other sessions).

### 2. Wiring

In `templates/settings.json`, a new `PreToolUse` group after the `Bash` group:

```json
{
  "matcher": "mcp__.*__(interrupt_session|archive_session)",
  "hooks": [
    {
      "type": "command",
      "command": "bash .tropis/hooks/own-session-guard.sh"
    }
  ]
}
```

Its `_comment` gains one sentence after the one about `branch-in-worktree.sh`, such as:
"own-session-guard.sh, on the cloud session tools that interrupt or archive a session,
refuses one aimed at the session it runs in, the same way." `scripts/installed-hooks.txt`
gains `own-session-guard.sh` on its own line, after `branch-in-worktree.sh`.

### 3. Guards

In `guards/rule-delivery.test.js`, a new `describe('own-session-guard refuses stopping
the session it runs in', …)`, beside the branch-in-worktree one, running the script with
`spawnSync('bash', [script], { input, env })` and a controlled
`CLAUDE_CODE_REMOTE_SESSION_ID`. Each case states the exit code and output:

- `interrupt_session` on the own id (`cse_01TESTOWN` against `session_01TESTOWN`):
  exit 2, stderr contains `Refused: this would interrupt the session you are running in`
  and `session_01TESTOWN`, stdout empty.
- `archive_session` on the own id: exit 2, stderr contains `would archive`.
- A tool name with another server prefix (`mcp__remote__interrupt_session`): exit 2.
- Another session's id: exit 0, no output.
- The variable unset (deleted from the spawned env): exit 0, no output.
- An empty `session_id`: exit 0, no output.
- Another tool on the own id (`mcp__claude-code-remote__get_session`): exit 0, no
  output.
- Malformed JSON: exit 0, no output.
- Wiring: `templates/settings.json` has exactly one group whose hooks name
  `own-session-guard.sh`, its matcher is the one in Decision 2, and a JavaScript
  `RegExp` built from it as `^(?:<matcher>)$` matches
  `mcp__claude-code-remote__interrupt_session` and
  `mcp__claude-code-remote__archive_session` and not
  `mcp__claude-code-remote__get_session`; `scripts/installed-hooks.txt` lists the file.

In `guards/take-version.test.js`, the expected sorted matchers after an update gain the
new matcher. No other assertion in that test changes.

## Traps

- **The refusal cases go red without the script's comparison.** After the tests pass,
  change step 4 to always exit 0, run the new tests, see the refusal cases fail, and
  restore it. Report both runs. The guards read committed content only through the
  self-check, so run the new tests directly (*Tasks*, 3) for this, not the self-check.
- **The variable set in this session leaks into a test that does not set it.** Every
  case builds its env from `process.env` and sets or deletes
  `CLAUDE_CODE_REMOTE_SESSION_ID` explicitly.
- **To run one guard alone, stage it as the self-check does**: in an export of `HEAD`
  (`git archive HEAD | tar -x -C <dir>`), write `{"type":"module"}` to `package.json`,
  copy `templates/framework-jest.config.js` to `jest.config.js`, link a `node_modules`
  holding Jest (the self-check's `.self-check/node_modules`, after one self-check run),
  and run `node --experimental-vm-modules node_modules/.bin/jest --config
  jest.config.js guards/rule-delivery.test.js`. `scripts/check-blueprint.sh` shows each
  step. Commit first.
- **`.claude/settings.json` at the root is the installed release.** It does not change.

## File Structure

| File | Change |
|---|---|
| `scripts/own-session-guard.sh` | new: Decision 1 |
| `scripts/installed-hooks.txt` | the new hook |
| `templates/settings.json` | the new group and the `_comment` sentence |
| `guards/rule-delivery.test.js` | the new `describe` |
| `guards/take-version.test.js` | the expected matchers |
| `docs/superpowers/plans/2026-11-05-executor-never-interrupts-its-dispatcher.md` | the handover report, then the review record |
| `feature-catalog.yaml` | (reviewer) the item to `shipped`, `modules` set |
| `docs/backlog-board/bands.yaml` | (reviewer) `seen.status` follows the item |

## Tasks

1. Isolate with the Repositories row; run `npm --prefix .tropis ci` in the worktree.
2. Write the hook, the wiring and the guards (Decisions 1–3). Commit with a body.
3. Run `bash scripts/check-blueprint.sh`; it prints its summary and exits 0 when green.
   Run the new describe alone (*Traps*) with the comparison removed, see the refusal
   cases fail, restore, and see them pass. Fix the work until all of this holds.
4. Append `## Handover report` (six sections, `rules/planning.md`) with the commands and
   their output, the tool versions (`node --version`, `bash --version | head -1`,
   `python3 --version`, `uname -sm`), and the diff stat. Commit it, run the self-check
   again on that commit, and push the branch. Stop there.
5. (Reviewer) Re-run the checks, measure the hook live: push a throwaway branch whose
   `.claude/settings.json` and `.tropis/hooks/` carry the new hook, start a cloud
   session on it, and have it call `interrupt_session` on its own id; it must report the
   refusal and keep running. Record the tool, version and the call with its answer, then
   delete the throwaway branch.

---

## Handover report

Executed on 2026-11-05 by a Claude Code subagent in a cloud session (Claude Code 2.1.318
on Linux x86_64, Ubuntu 24.04), from `origin/main` at `a64e8b7`.

### Task completion

1. **Isolate** — done. `bash .tropis/scripts/isolate-for-plan.sh <plan>` created
   `../tropis-self-interrupt` on `plan/executor-never-interrupts-its-dispatcher` from
   `origin/main`; `npm --prefix .tropis ci` run there.
2. **Hook, wiring, guards** — done, in commit `c1e6617`: `scripts/own-session-guard.sh`
   (Decision 1), the line in `scripts/installed-hooks.txt`, the group and `_comment`
   sentence in `templates/settings.json` (Decision 2), the new `describe` in
   `guards/rule-delivery.test.js` and the matcher list in `guards/take-version.test.js`
   (Decision 3). One defect in the new guard, found by the first self-check, fixed in
   `3f2f3a2` (*Verification results*).
3. **Self-check and the trap** — done: the self-check is green on `3f2f3a2`; the new
   describe alone went red on the three refusal cases with the comparison removed and
   green with it restored.
4. **Handover report** — this section; its commit is self-checked and the branch pushed
   (the last two results are under *Verification results*).
5. (Reviewer) The live measurement in a throwaway cloud session: not done here, as the
   plan says. Neither `interrupt_session` nor `archive_session` was called on any session.

### Verification results

Tools: node v22.23.4, GNU bash 5.2.21, Python 3.13.18, git 2.43.0, Jest from
`templates/package-lock.json` through the self-check; all on Linux x86_64 (`uname -sm`:
`Linux x86_64`), Ubuntu 24.04.5.

**Smoke run of the script**, before the guards were written (working tree, later
committed unchanged as `c1e6617`), each payload piped to `bash scripts/own-session-guard.sh`
with `CLAUDE_CODE_REMOTE_SESSION_ID=cse_01TESTOWN` unless said otherwise:

```
mcp__claude-code-remote__interrupt_session, session_01TESTOWN: exit=2, stderr:
  Refused: this would interrupt the session you are running in (session_01TESTOWN).
  A subagent runs in the session of the agent that started it, so this stops that agent too, and nothing resumes it until a person does.
  To finish, end your turn and return your report: the agent that dispatched you reads it.
  (own-session-guard.sh)
mcp__claude-code-remote__archive_session, session_01TESTOWN: exit=2, "would archive"
mcp__remote__interrupt_session, session_01TESTOWN:               exit=2, "would interrupt"
mcp__claude-code-remote__get_session, session_01TESTOWN:         exit=0, no output
interrupt_session, session_01OTHER:                              exit=0, no output
interrupt_session, session_01TESTOWN, variable unset (env -u):   exit=0, no output
malformed JSON ({not json):                                      exit=0, no output
```

**Self-check 1**, `bash scripts/check-blueprint.sh` on `c1e6617`: exit 1.

```
  CANNOT RUN  plain-reply            rule-delivery fails on the clean project, so its failure proves nothing
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● rule delivery › own-session-guard refuses stopping the session it runs in › is silent outside a cloud session, where the variable is unset
2 problem(s). A guard that cannot fail is not evidence.
Self-check FAILED: conformance or the clean baseline (above).
```

The case passed `undefined` to the helper's `own = OWN` parameter to unset the variable,
and a default parameter takes its default on an explicit `undefined`, so the variable
stayed set and the hook refused (status 2 where 0 was expected). Fixed in `3f2f3a2`: the
sentinel is `null`, and the helper's comment says why.

**New describe alone, green run**, on `3f2f3a2`'s content, staged as the trap says: export
of `HEAD` into a scratch folder, `{"type":"module"}` as `package.json`,
`templates/framework-jest.config.js` as `jest.config.js`, `node_modules` linked to the
self-check's `.self-check/node_modules`, and `FRAMEWORK_ROOT` pointing at a fixture whose
`.tropis/hooks/` holds a copy of each file in `scripts/installed-hooks.txt` (the guard
resolves the hook from `root`, as the branch-in-worktree one does, and the conformance run
composes the same fixture). Command:
`FRAMEWORK_ROOT=<fixture> node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/rule-delivery.test.js -t 'own-session-guard'`

```
Test Suites: 1 passed, 1 total
Tests:       158 skipped, 9 passed, 167 total
```

**Trap run**: line 58 of the fixture's copy of the hook,
`[ "${own#*_}" = "${session_id#*_}" ] || exit 0`, replaced with `exit 0`; same command:

```
  ● rule delivery › own-session-guard refuses stopping the session it runs in › refuses interrupt_session on the session it runs in, naming the id
  ● rule delivery › own-session-guard refuses stopping the session it runs in › refuses archive_session on the session it runs in
  ● rule delivery › own-session-guard refuses stopping the session it runs in › refuses the tool under another server prefix
Test Suites: 1 failed, 1 total
Tests:       3 failed, 158 skipped, 6 passed, 167 total
```

Copy restored (`diff` against `scripts/own-session-guard.sh` in the worktree: identical;
the worktree's script was never edited for this), same command again:

```
Test Suites: 1 passed, 1 total
Tests:       158 skipped, 9 passed, 167 total
```

**Self-check 2**, `bash scripts/check-blueprint.sh` on `3f2f3a2`: exit 0.

```
Checking 3f2f3a2 of /home/user/tropis-self-interrupt
Conformance: every guard must fail on its planted defect
  caught      plain-reply            rule-delivery
  (every other plant: caught)
Clean baseline: every guard must pass
  ok          clean baseline
Every guard caught its defect and passed the clean baseline.
Framework repository: its own guards must pass here and fail on a planted defect
  (every plant: caught; private-material passed on the full copy of HEAD)
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

The clean baseline runs `guards/take-version.test.js` too, so the new matcher in its
expected list (`['Bash', 'Edit', 'Read', 'Write', 'mcp__.*__(interrupt_session|archive_session)']`,
the order JavaScript's default sort gives) passed there; no other assertion in that test
changed.

**Self-check 3**, on the commit carrying this report (the report's own commit can break a
check, so it is run on that commit): exit 0, `Self-check passed: every guard caught its
defect, the clean baseline passed, and the framework repository's own guards passed.`
The result is written here by amending that
commit, and the self-check is run once more on the amended commit, the one pushed; that
last result goes in the executor's report to its dispatcher, since a result written in
the file is always one commit behind the run that produced it.

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 guards/rule-delivery.test.js | 98 ++++++++++++++++++++++++++++++++++++++++++++
 guards/take-version.test.js  |  4 +-
 scripts/installed-hooks.txt  |  1 +
 scripts/own-session-guard.sh | 66 +++++++++++++++++++++++++++++
 templates/settings.json      | 11 +++++
 5 files changed, 179 insertions(+), 1 deletion(-)
```

Every file is in the File Structure table; this report adds the plan file, which is there
too. Nothing under `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md` changed.
Worktree used: `../tropis-self-interrupt` (`/home/user/tropis-self-interrupt`), on
`plan/executor-never-interrupts-its-dispatcher` from `origin/main` at `a64e8b7`; the main
checkout was left detached at `origin/main`.

### Judgment calls

- **The hook reads both fields in one `python3` call**, printing the tool name and the
  session id on two lines, instead of two calls as a literal copy of
  `branch-in-worktree.sh` would make; malformed JSON prints two empty lines. Behaviour as
  Decision 1 states.
- **The group sits after the `Bash` group**, as Decision 2 says, which is at the end of
  `PreToolUse`. `take-version.mjs` appends a group whose matcher the project lacks, so an
  updated project gets it last as well.
- **The wiring test asserts the group's hook list is exactly
  `['bash .tropis/hooks/own-session-guard.sh']`**, one step past "exactly one group whose
  hooks name it": a second hook in that group would otherwise pass unnoticed.
- **Three extra `toContain` assertions on the interrupt message** (`end your turn and
  return your report`, `(own-session-guard.sh)`), so the guard pins the instruction the
  agent is given, not only the first line.
- **The `_comment` sentence** is the plan's suggested wording, split over two lines of the
  array as the surrounding lines are.
- **The commit messages** are working history and were written to the merge format in
  case the reviewer squashes with the first one.

### What the plan got wrong

- **The trap's "run one guard alone" recipe is incomplete for this guard.** In a plain
  export of `HEAD`, `rule-delivery.test.js` resolves `root` to three levels above
  `guards/` and the hook under `<root>/.tropis/hooks/`, which does not exist in an export
  of this repository: both the branch-in-worktree describe and the new one need
  `FRAMEWORK_ROOT` pointing at a composed fixture, as `check-conformance.sh` provides. The
  trap names the self-check as showing each step, and that was enough to work it out, but
  the recipe as written fails with a missing file. The handover says what was run.
- Nothing else: every claim about the repository checked out (file lists, the line in
  `take-version.test.js`, the precedent's shape, the hook list readers).

### Outstanding

- **The live measurement (Task 5)** is the reviewer's: a throwaway cloud session on a
  branch carrying the hook in `.claude/settings.json` and `.tropis/hooks/`, asked to
  interrupt its own id, reporting the refusal and continuing, with tool and version.
  Not attempted here, per the plan and the Global Constraints.
- **Whether Claude Code's hook matcher is applied anchored or as a search** is not settled
  by this plan's guard, which tests the regex anchored (`^(?:…)$`). The matcher has no
  anchors, so it matches either way; the live measurement shows the hook firing.
- **Whether `CLAUDE_CODE_REMOTE_SESSION_ID` reaches a hook's environment** in a cloud
  session is what the live measurement decides; the plan's evidence is that the session's
  shell holds it, and a hook is a child of the tool's process. If it does not, the hook is
  silent everywhere (step 3) and the fix is a different source for the id.
- **Review record and merge**: not written, not done — parent review.

## Review record

Reviewed by the specifying session, a Claude Code 2.1.318 cloud session on Linux x86_64.

### Checks re-run

- `bash scripts/check-blueprint.sh` on the handover commit `ce93976`, in the plan's
  worktree: "Self-check passed: every guard caught its defect, the clean baseline passed,
  and the framework repository's own guards passed.", exit 0 (node v22.23.4, git 2.43.0).
- The hook run by hand from the worktree with `CLAUDE_CODE_REMOTE_SESSION_ID=cse_01OWN`
  (bash 5.2.21, Python 3.13.18): `interrupt_session` on `session_01OWN` printed the
  four-line refusal and exited 2; `archive_session` on it printed `Refused: this would
  archive the session you are running in (session_01OWN).` and exited 2; another
  session's id, the variable unset, and malformed JSON each exited 0 with no output.
- **Live, Task 5.** A throwaway branch carrying the hook in `.claude/settings.json` and
  `.tropis/hooks/` was pushed, and a new cloud session started on it (Claude Code
  2.1.318, Linux x86_64, `CLAUDE_CODE_REMOTE_SESSION_ID` present with prefix `cse`). It
  called `get_session`, then `mcp__claude-code-remote__interrupt_session` with its own
  `session_...` id, and the call answered, as an error, `PreToolUse:mcp__claude-code-remote__interrupt_session
  hook error: [command hook 6]: Refused: this would interrupt the session you are running
  in (session_<its id>).` followed by the hook's other three lines; the tool-result
  record shows `permission_decision: reject, reason_type: hook`. The session then
  replied with its report and ended its turn normally (`stop_reason: end_turn`). This
  settles the two handover *Outstanding* questions: the matcher fires on the MCP tool's
  name, and the variable reaches the hook's environment.
- Not re-run: the executor's red run with the comparison removed. The handover shows
  three refusal cases failing and six passing with step 4 replaced by `exit 0`, which is
  what the change predicts; the live run above is the stronger check of the same line.

### Found

Public exposure: the diff was read for private material; nothing found. The plan quotes
no session id (the specifying session replaced its own with `<X>` before the claim
landed), and the tests use invented ids.

Nothing else. The diff matches the File Structure table (six files, plus the backlog and
the bands file in this review commit).

### Outstanding disposition

- Task 5 and both questions it was to settle: done above.
- The throwaway branch `probe/own-session-guard` could not be deleted from this cloud
  session (`git push --delete` answered HTTP 403); it is never merged and carries only
  the probe commit. Left for the developer to delete; dropped as a backlog item, since it
  changes nothing on `main`.
- The probe session is left idle, not archived: archiving another session is the
  developer's acknowledgement to give.

### Learnings routed

- The one-guard recipe in `AGENTS.md` omits `FRAMEWORK_ROOT` for guards that run a
  shipped hook (*What the plan got wrong*): backlog item
  `one-guard-recipe-names-framework-root`.
- The hook is the delivery of this item's lesson at the moment it applies; no rule or
  framework text changes, so no fresh-agent check is owed. The choice between a hook and
  a dispatch-prompt sentence is recorded in the hook's header and the plan's Decision 1
  rather than in `framework/DECISIONS.md`: it changes no framework document and
  constrains nothing beyond this hook.

### Merged because

Every check passes on the pushed commit and the hook refused a real self-interrupt in a
live cloud session while letting the session carry on.
