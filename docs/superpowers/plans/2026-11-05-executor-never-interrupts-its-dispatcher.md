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
