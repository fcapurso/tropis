# A sprint started in one tool can hand entries to team members in another — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `sprint.mjs launch <id>` starts an entry's team member in Claude Code's or
Cursor's command line, in print mode, in a worktree of its own, as a detached process
that first waits for what the entry is blocked by, then runs the agent on exact grants
and no API key, and finally judges what it reported against `origin/main`. `status`
shows such team members, and `watch` wakes a sprint session when one ends. `/sprint`
says when to use it.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md` §9 (*Starting team
members — one seam*, its *Second spike* answer and *Every way is paid for by the
developer's plan*) and §11; decisions FW-050 (the command line, exact grants, the
repository over the reply), FW-053 (no key billed per use; `ANTHROPIC_API_KEY` removed,
no `--bare`) and FW-055 (the whole team starts on the developer's word; waits end on
events) in `framework/DECISIONS.md`; the seven acceptance criteria of the entry
`team-members-start-in-another-tool` in `feature-catalog.yaml`. Build only this entry.
Which model a team member gets is the entry `team-members-and-reviewers-run-on-a-tier`:
here `--model` is only passed through.

**One plan:** what becomes true is one sentence — a sprint session can start a team
member in the other tool's command line and learn, from the repository, how it ended.
The launcher, its tests, the command text and one decision serve that one thing.

**What the specifying session verified on 2026-11-02, against `origin/main` at
`f7597ec`:**

- **`scripts/sprint.mjs`** (624 lines; second line `// Shared machinery: no part of this
  file is project-owned.`). `WAYS = ['session', 'here']`; `COMMANDS = ['propose',
  'start', 'add', 'drop', 'mark', 'note', 'wait', 'brief', 'status', 'report', 'end']`;
  `USAGE` names each. The sprint file is `<git common dir>/tropis/sprint.json`, read by
  the private `readSprint(root, env)` and written by `writeSprint(root, env, sprint)`
  through a sibling file and a rename. Its fields: `started`, `budget`, `way`,
  `entries` (`{ id, points, band, bundle?, title }`), `baseline`, `marks` (`{ [id]: {
  state, reason } }`, states `planning`, `parked`, `stopped`), `notes`.
  `readBacklog(root, env)` (exported) fetches origin and reads `feature-catalog.yaml` at
  `origin/main`. `statusOf(id, { catalog, marks, pulls, planOf })` (exported) returns,
  first match wins: `shipped`, `dropped`, `parked: <reason>` / `stopped: <reason>` from
  `marks`, a pull request state, `building` states, `waiting for <ids> to ship`,
  `planning`, `not started`. The private `statuses(ctx, sprint, backlog)` passes
  `sprint.marks`. The private `wait(ctx, opts, print)` reads
  `readSprint(...)?.marks ?? {}` each round and returns exit 3 with
  `PARKED: depends on <id>` for a blocker dropped, or marked `parked` or `stopped`; exit
  0 when nothing is open. `brief(ctx, opts)` returns the brief's lines (pinned verbatim
  by `BRIEF(...)` in `guards/sprint.test.js`). `parseArgs` takes `--points`, `--way`,
  `--interval` (seconds, `intervalMs` default 30000) and puts every other word in `ids`.
  `main(argv, { root, env, print })` dispatches, catching the private `Refusal` (a line
  and an exit status). Clock seam: `TROPIS_SPRINT_NOW`.
- **`guards/sprint.test.js`** installs `FILES` (`sprint.mjs`, `next-work.js`,
  `board-bands.js`, `plan-binding.js`, `projections.js`, `main-status.mjs`,
  `merge-token.mjs`) into `.tropis/scripts/` of a clone of a local bare origin
  (`makeWorld`, `publish`, `makeClone`, `run`, `at`, `entry`, `row`). Its documents case
  *the command names every script command it runs…* requires `sprint.mjs <verb>` for nine
  verbs and that the rows of the table matching `` ^\| `([a-z]+)` \| `` in
  `commands/sprint.md` are exactly `['session', 'here']`. Its *start* case refuses
  `--way subagent`.
- **`commands/sprint.md`**, step *2. Start the whole team, on the developer's word*, has
  the two-row `--way` table and the paragraph beginning `Never start a team member the
  developer cannot open, such as a subagent of this session or a command line run in the
  background.`
- **`scripts/installed-scripts.txt`** lists every script setup installs, one per line;
  `guards/set-up-project.test.js`, `guards/dispatch.test.js` and
  `scripts/check-conformance.sh` read it, so a script listed there is installed and
  copied by them with no further change.
- **The two tools on this machine:** Claude Code 2.1.300 (`claude`) and Cursor's
  `cursor-agent` 2026.10.22-27dcf5f, both signed in to the developer's plans; macOS 26.2,
  arm64. The spike's runs (spec, *Second spike — evidence*) used `--output-format json`;
  this plan uses `stream-json` (*Decision 2*), whose events neither spike run printed.
- **`docs/model-picks.md`** marks Cursor's own models, Composer and Grok, *(Cursor, any
  plan)*: included on every Cursor plan. Claude Haiku is included on every Claude plan.
- **Next free decision number:** FW-058 today, but others land first. Write the decision
  as `FW-NNN`; the reviewer numbers it when merging.

## Delivers

team-members-start-in-another-tool

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-team-cli -b plan/team-members-start-in-another-tool origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.** Use `node:` built-ins and what the scripts already import.
- **Do not lower, skip or delete a guard or a test.** Changing an existing case's
  expectation is allowed only where *Decision 6* says so.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names,
  session ids or account names in anything committed or in the handover. Paths in the
  handover are relative to the worktree or written as `$TMPDIR/...`; session ids as
  `<session-id>`. Test identities use `example.com` addresses.
- **Nothing billed beyond the developer's plans, and no cloud agent.** The live runs in
  Task 6 use the signed-in command lines only, with `--model haiku` for Claude Code and a
  Cursor-own model for Cursor (*Task 6*). Never set an API key, never pass `--bare`,
  never use Cursor's cloud agent API.
- **Never touch `refs/tropis/merge-token` or anything on GitHub.** Every check runs
  against local bare repositories, fake tools, or the real tools in a scratch folder.
- **No test reaches the network or a real agent.** The guards use fake `claude` and
  `cursor-agent` scripts first on `PATH` (*Decision 6*).
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from. `scripts/sprint.mjs` and its guard are
  this repository's own and may be followed.

## Decisions

### 1. The seam: `scripts/team-member-cli.mjs`

A new module, second line `// Shared machinery: no part of this file is project-owned.`,
with a module comment saying what it is for and pointing at FW-050, FW-053 and this
plan's decision. Imported only by `sprint.mjs`; it imports nothing from `sprint.mjs`.
It exports plain functions and constants:

- `TOOLS = { claude: { command: 'claude', name: 'Claude Code' }, cursor: { command:
  'cursor-agent', name: 'Cursor' } }`. A third tool is a third key.
- `GRANTED_COMMANDS`: the commands the workflow runs — `git`, `gh`, `node`, `npm`, `npx`
  — and read-only helpers an agent reaches for — `ls`, `cat`, `head`, `tail`, `grep`,
  `wc`, `diff`, `mkdir`, `date`, `uname`. Never `bash`, `sh`, `zsh`, `rm`, `curl`: a
  shell grant is a grant of everything.
- `claudeRules()`: for each command `Bash(<c>)` and `Bash(<c> *)`, plus
  `Bash(bash scripts/*)` and `Bash(bash .tropis/*)`, which run the project's own scripts.
- `cursorGrants()`: `{ permissions: { allow: GRANTED_COMMANDS.map((c) => `Shell(${c})`),
  deny: [] } }`.
- `commandLine(tool, { prompt, model })` → `{ command, args }`:
  - claude: `['-p', prompt, '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'acceptEdits', '--setting-sources', 'project',
    '--allowedTools', <claudeRules() in the form claude --help documents>]`, then
    `['--model', model]` when given. Check `claude --help` for how `--allowedTools`
    takes several rules (a comma- or space-separated string, or one argument each); if
    it is variadic, keep it after the prompt so it cannot swallow it. Task 6 proves the
    form with a real run.
  - cursor: `['-p', prompt, '--output-format', 'stream-json', '--trust']`, then
    `['--model', model]` when given.
  - Never `--bare`, `--dangerously-skip-permissions`, `--force` or `--yolo`.
- `agentEnv(env)`: a copy of `env` without `ANTHROPIC_API_KEY`,
  `ANTHROPIC_AUTH_TOKEN` and `CURSOR_API_KEY`.
- `readRun(logText)` → `{ sessionId, result }`: parse the log line by line, skipping
  lines that are not JSON (the launcher's own lines share the log). `sessionId` is the
  first `session_id` any event carries, or null; `result` the last event whose `type` is
  `result`, or null.
- `finalLine(text)`: the last non-empty line of the agent's reply, trimmed, with `*` and
  backticks removed from both ends, when it is `SHIPPED`, or starts `PARKED: ` or
  `STOPPED: ` with something after; otherwise null.
- `judge({ tool, id, exit, run, entryStatus })` → `{ line, denied }`, the first that
  applies (`<Name>` is `TOOLS[tool].name`):
  1. `run.result` is null → `STOPPED: <Name> ended without a result (exit <exit>)`.
  2. `run.result.is_error` → `STOPPED: <Name> reported an error — <first line of
     result.result, or result.subtype>`.
  3. `finalLine(run.result.result)` is null → `STOPPED: <Name> ended without SHIPPED,
     PARKED or STOPPED as its last line`.
  4. It is `SHIPPED` and `entryStatus !== 'shipped'` → `STOPPED: it said SHIPPED, but
     origin/main shows <id> as <entryStatus, or missing>`.
  5. Otherwise the final line itself.

  `denied` lists `run.result.permission_denials` (Claude Code reports them; absent is
  empty) as `<tool_name>` or `<tool_name>(<tool_input.command>)`, without repeats. When
  `line` is not `SHIPPED` and `denied` is not empty, `line` gains ` — denied: <a>; <b>`.
- `openCommand(tool, worktree, sessionId)` → `` cd <worktree> && <command> --resume
  <sessionId> ``.

### 2. Why stream-json and a detached process

FW-050 chose `json`. This plan uses `stream-json` (Claude Code needs `--verbose` with
it) so the log grows while the agent works: the developer can follow it, and the session
id is in the log before the run ends. The last `result` event is FW-050's JSON object.
Cursor's documentation says a failed run may end without a `result` event; rule 1 of
*judge* covers that.

`launch` returns at once and the run is a detached process, so a sprint session in any
tool can start the whole team in one turn (FW-055) whether or not its tool runs
background commands, and a reset of the sprint session's conversation does not end the
runs. The result reaches the sprint through a file `status` and `watch` read.

### 3. `sprint.mjs`: `launch`, `run`, `watch`

- `WAYS` becomes `['session', 'here', 'claude', 'cursor']`: `start --way claude` or
  `--way cursor` records that team members start in that tool's command line.
- `COMMANDS` gains `launch`, `run` and `watch`; `USAGE` names them:
  `launch <id> [--tool claude|cursor] [--model <m>]`, `watch`. `run` is what `launch`
  starts, and the usage line says so: `run <id> --tool <t> (started by launch)`.
- `parseArgs` takes `--tool <t>` and `--model <m>`; `launch` and `run` take exactly one
  id; `--interval` applies to `launch` (passed on to `run`), `run` and `watch`.
- **The team folder:** `<git common dir>/tropis/team/`, written by the script only
  (Claude Code refuses file-tool writes under `.git`). Per entry: `<id>.brief.md` (the
  prompt), `<id>.log` (the run's output), `<id>.json` (the result).
- **`launch <id>`**, in this order:
  1. A sprint is under way and `<id>` is in it, else the usual refusals.
  2. The tool is `--tool`, else the sprint's way when that is `claude` or `cursor`;
     otherwise refuse `Sprint: --tool takes claude or cursor.`
  3. The tool's command runs (`<command> --version`, with `agentEnv`); if it cannot be
     found, refuse `Sprint: <command> is not installed, so <Name> cannot start a team
     member.`
  4. If `sprint.launched[id]` names a process still alive (`process.kill(pid, 0)`) and
     `<id>.json` does not exist, refuse `Sprint: <id>'s team member is still running
     (pid <pid>).`
  5. The worktree is `<parent of the checkout>/<checkout folder name>-team-<id>`. If it
     does not exist, add it as a detached worktree of `origin/main` (git's `worktree
     add` with `--detach`); a failure is a refusal naming git's first line. If it exists, it is reused (a team member started
     again carries on where its worktree is).
  6. For cursor, when `<worktree>/.cursor/cli.json` does not exist, write
     `cursorGrants()` there as JSON. One that exists is the project's and is left alone.
  7. The prompt is the file `TROPIS_TEAM_PROMPT` names, when that variable is set (for
     checks, like `TROPIS_SPRINT_NOW`); otherwise `brief`'s lines, a blank line, and the
     command-line lines (*Decision 4*). Write it to `<id>.brief.md`; delete an old
     `<id>.json`.
  8. Start `process.execPath` on this script with `run <id> --tool <t>` (and `--model`,
     `--interval` when given), from the checkout, `detached: true`, stdin ignored, stdout
     and stderr appended to `<id>.log`, then `unref()`.
  9. Record `sprint.launched[id] = { tool, model, worktree, pid, started, log }` and the
     mark `planning`, and write the sprint file.
  10. Print `Sprint: <id> started in <Name>'s command line (pid <pid>), in <worktree>.`
      and `Sprint: its log is <log>; status names the command that opens its session.`
- **`run <id> --tool <t>`** (the detached process):
  1. The entry's wait, by calling `wait` with the same interval. On exit 3 its line is
     the result (`PARKED: depends on <id>`) and no agent starts; on exit 1 the result is
     `STOPPED: <its line>`.
  2. Start `commandLine(t, { prompt: <id>.brief.md, model })` with `cwd` the worktree
     from `sprint.launched[id]`, `env: agentEnv(env)`, stdin ignored, stdout and stderr
     appended to `<id>.log`; wait for it to exit. A spawn error is exit `null` with the
     error in the log.
  3. Read the backlog (`ctx.backlog()`); `entryStatus` is the entry's status there.
  4. `judge` on `readRun(<id>.log)`; write `<id>.json` = `{ tool, line, denied,
     sessionId, exit, finished }` (sibling file and rename). Print the line.
- **Marks from the team folder.** A private `teamMarks(root, env, sprint)` returns
  `sprint.marks` overlaid with, for each launched entry: a result whose line starts
  `PARKED: ` or `STOPPED: ` → `{ state: 'parked' | 'stopped', reason: <the rest> }`; no
  result and a process that is not alive → `{ state: 'stopped', reason: 'the run ended
  without writing a result' }`. `statuses` and `wait` use it in place of `sprint.marks`,
  so the status and an entry waiting on this one see it. A `SHIPPED` result adds no
  mark: the main branch says shipped.
- **`status`** adds to each launched entry's line ` — in <Name>, running; log <log>`
  while it runs, or ` — in <Name>, ended; open it with `<openCommand>`` once it has a
  result with a session id (` — in <Name>, ended` without one).
- **`watch`** loops every interval: the first launched entry with a result not yet marked
  `reported`, or with no result and a dead process (then write the result as
  `teamMarks` words it), is marked `reported: true` in its `<id>.json`, and `watch`
  prints `Sprint: <id> ended in <Name> — <line>` and the open command when there is a
  session id, and exits 0. When no launched entry is running or unreported, exit 1
  with `Sprint: no team member started by command line is running.` No time limit.
- `drop` and `end` leave runs alone: they say nothing about them, and a run's result
  file outlives the sprint file.
- Update the module comment's usage block for the new commands and fields.

### 4. The brief's command-line lines (verbatim)

After `brief`'s own lines and one blank line, for both tools:

```
You were started in <Name>'s command line, in print mode, and nobody is watching this
run. A background command does not wake you here: run every wait in the foreground,
and run it again whenever the tool stops it, until it ends. Everything this entry is
blocked by has shipped already, so skip the wait for it. When a command you need is
refused, end with STOPPED and name the command.
```

and for cursor only, one more line:

```
`.cursor/cli.json` holds the grants this run was started with. It is not part of your work: never commit it.
```

### 5. The documents and the decision

**`commands/sprint.md`**, step 2:

- The table gains two rows, after `here`:

  ```
  | `claude` | one Claude Code command-line run per team member, started with `sprint.mjs launch` | a sprint session in Cursor |
  | `cursor` | one Cursor command-line run per team member, started with `sprint.mjs launch` | a sprint session in Claude Code |
  ```

- After the table, a paragraph (wrap to the file's width):

  > For `claude` or `cursor`, start each team member with `node .tropis/scripts/sprint.mjs
  > launch <id>` in place of a session and its brief, adding `--model <model>` with a
  > model the developer's plan includes in that tool (`docs/model-picks.md`), and
  > `--tool <tool>` to start one entry in a tool other than the sprint's way. Each run
  > starts at once, waits by itself for what its entry is blocked by, and works with
  > nobody watching. Then run `node .tropis/scripts/sprint.mjs watch` as a background
  > command where this tool runs them; each time it ends, tell the developer the line it
  > printed unless it is `SHIPPED`, and run it again until it says none is running.

- The paragraph beginning `Never start a team member the developer cannot open`
  becomes:

  > Never start a team member of this tool that the developer cannot open, such as a
  > subagent of this session or this tool's own command line run in the background. The
  > other tool's command line is the exception: `status` names the command that opens
  > each run's session.

  followed by the paragraph's remaining sentences unchanged.

**`templates/README.md`** (the operator guide), at the end of the `/sprint` paragraph,
one sentence: `` Team members can also start in the other tool's command line:
`node .tropis/scripts/sprint.mjs launch <id> --tool cursor` (or `claude`). ``

**`framework/DECISIONS.md`**, appended at the end:

```
## FW-NNN: A team member in the other tool is a detached run that waits, works and is judged by the repository

**Date:** 2026-11-02 · **Status:** Accepted.

**Decision:** `sprint.mjs launch <id>` starts a team member in Claude Code's or Cursor's
command line as a detached process and returns at once. The process waits for what the
entry is blocked by, then runs the tool in print mode with `stream-json` output, in a
worktree of its own beside the checkout, on exact grants (one list of commands the
workflow runs, never a shell) and with no API key in its environment. When the agent
exits, the process judges its last line against `origin/main` and writes the result
where `sprint.mjs status` and `sprint.mjs watch` read it. A `SHIPPED` the main branch
does not show is recorded as `STOPPED`.

**Evidence:** FW-050's runs, and this entry's live runs on 2026-11-02 recorded in
its plan's review record: one run per tool that did its task and one that claimed
`SHIPPED` without doing it, each judged as the decision says.

**Rejected:** Blocking until the agent exits (a sprint session whose tool cannot run a
background command could then start only one team member per turn, against FW-055).
`json` output, as FW-050 ran it (nothing to follow while the run works). The project's
own permission settings alone, as FW-055 has for sessions (a command-line run cannot
ask anyone, and a project with no allow rules would be refused every command; the
grants file is written only where the project has none). A shell among the grants (it
grants everything).

**Consequences:** A team member started this way does not appear in the developer's
tool until its run ends; the developer follows its log and opens it with `--resume`.
`--model` is passed through as given; which model is
`team-members-and-reviewers-run-on-a-tier`. Ending or dropping a sprint does not stop
a run.
```

Check every sentence of the decision against what you built; change a sentence that
your work made untrue and say so under *Judgment calls*. The *Evidence* paragraph's
claim is made true by Task 6.

### 6. The tests

New file `guards/team-member-cli.test.js` (`// Level: unit`, a comment saying what it
covers and that nothing reaches the network or a real agent). It reuses the helpers of
`guards/sprint.test.js` by copying the few it needs (`makeWorld`, `publish`,
`makeClone`, `install`, `run`) — do not import from another test file. Its `FILES` is
`sprint.test.js`'s plus `team-member-cli.mjs`. Import both modules as namespaces.

**Fake tools.** A folder first on `PATH` holding executable `claude` and `cursor-agent`
scripts (`#!/bin/sh` or `#!/usr/bin/env node`). Each answers `--version` with exit 0;
otherwise it appends one JSON line `{ argv, cwd, env: <the four key names and whether
each is set> }` to a file the case names in `FAKE_RECORD`, then prints stream-json lines
chosen by `FAKE_MODE`: `shipped` (a `system` event with `session_id`, then a `result`
event `{ type: 'result', is_error: false, result: '...\nSHIPPED', session_id }`),
`claims` (the same reply, nothing done), `parked` (`PARKED: needs a decision`),
`denied` (a `STOPPED: ...` reply with `permission_denials: [{ tool_name: 'Bash',
tool_input: { command: 'git push' } }]`), `error` (`is_error: true`), `silent` (no
result event, exit 1), `slow` (sleeps `FAKE_SLEEP` seconds first). Mode `shipped`
also pushes a commit setting the entry `shipped` on the bare origin before replying
(`FAKE_ORIGIN`, `FAKE_ID`), so the repository agrees.

Cases († means it must fail before the code exists):

1. † `commandLine` for claude and cursor, with and without a model: the exact args;
   neither contains `--bare`, `--dangerously-skip-permissions`, `--force` or `--yolo`;
   claude's grants include `Bash(git *)` and no rule for `bash`, `sh` or `rm` alone.
2. † `agentEnv` drops the three keys and keeps everything else.
3. † `finalLine` and `judge`: each of the five rules, `**SHIPPED**` read as `SHIPPED`,
   a `SHIPPED` with the entry `building` on main becomes the rule-4 `STOPPED` line, and
   denials appended to a non-`SHIPPED` line only.
4. † `readRun` skips non-JSON lines and takes the first session id and the last result.
5. † `launch` refuses: no sprint, an entry not in it, `--tool vim`, no `--tool` with
   the sprint's way `session`, a tool not on `PATH` (a `PATH` without the fake folder),
   and a second launch while the first (`slow`) still runs.
6. † `launch --tool claude` in a clone: it exits 0 at once (within a second, while the
   fake sleeps); the worktree `../clone-team-<id>` exists and is detached at
   `origin/main`; the fake was started in that folder with the args of case 1 and none
   of the three keys set although the case's environment sets all three; the log and
   the brief exist under `<common dir>/tropis/team/`; the brief is `brief`'s text, a
   blank line, then *Decision 4*'s lines for that tool, exactly.
7. † `launch --tool cursor`: writes `.cursor/cli.json` with `cursorGrants()` in a
   worktree that has none, and leaves an existing one byte for byte.
8. † End to end, by mode, each awaited through the result file (poll up to 10 s):
   `shipped` → result `SHIPPED`, status shows the entry `shipped` and ` — in Claude
   Code, ended; open it with cd <worktree> && claude --resume <session-id>`; `claims`
   → the rule-4 `STOPPED` line, listed under status's needs-you lines; `parked` →
   `parked: needs a decision`; `denied` → the line ends `— denied: Bash(git push)`;
   `silent` → rule 1 naming exit 1.
9. † A blocked entry: launched while its blocker is `building`, the fake is not started
   (no record) until the blocker is published `shipped`, then it is (`--interval 0.2`).
   Launched while its blocker is marked `parked`, the result is `PARKED: depends on
   <blocker>` and the fake never starts.
10. † An entry blocked by a launched entry whose result is `PARKED: …` parks: `sprint.mjs
    wait <it>` exits 3.
11. † `watch` exits 0 printing the ended entry's line once, exits 1 with its line when
    nothing is running or unreported, and reports a dead process with no result (kill a
    `slow` run's pid) as `the run ended without writing a result`.
12. The documents: `commands/sprint.md` names `sprint.mjs launch` and `sprint.mjs watch`,
    `--model`, and the exception sentence; `templates/README.md` names `sprint.mjs
    launch`; `scripts/installed-scripts.txt` lists `team-member-cli.mjs`.

Changes to **`guards/sprint.test.js`**, and only these: add `'team-member-cli.mjs'` to
`FILES` (sprint.mjs now imports it, so every installed copy needs it); in the documents
case, the ways expected become `['session', 'here', 'claude', 'cursor']`. Every other
case there must pass unchanged.

Kill every process a case started (detached runs and fakes) in `afterAll`, and give
`spawn`ed runs a `--interval` well under a second.

## Traps

- **The tests must fail first.** Task 2 commits the new cases before the code. Run the
  new test file alone with the self-check's own Jest (find the invocation in
  `scripts/check-blueprint.sh`; the self-check never lists test names when it is red,
  and it stops early for an empty script missing the shared-machinery line, so create
  `team-member-cli.mjs` with that line and nothing else first).
- **Import the modules as namespaces**, or every case fails at link time for one reason.
- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green.
- **Detached processes outlive the test.** A forgotten one keeps writing into a deleted
  folder and holds Jest open. Track every pid; kill them in `afterAll`.
- **A real agent is started only in Task 6 and Task 5**, never by a guard.
- **The live runs push to a local bare repository**, never to GitHub.
- **Write under `.git` through the script**, never through a file tool: Claude Code
  refuses file-tool writes under `.git` as sensitive.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/team-member-cli.mjs` | new, *Decision 1* |
| `scripts/sprint.mjs` | *Decision 3* |
| `scripts/installed-scripts.txt` | `team-member-cli.mjs` added after `sprint.mjs` |
| `guards/team-member-cli.test.js` | new, *Decision 6* |
| `guards/sprint.test.js` | `FILES` and the ways, *Decision 6* |
| `commands/sprint.md` | *Decision 5* |
| `templates/README.md` | one sentence, *Decision 5* |
| `framework/DECISIONS.md` | the decision, *Decision 5* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment mapping criteria to tests (Task 7) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 7) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-team-members-start-in-another-tool.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version`, `claude --version`,
`cursor-agent --version`, `uname -sm` and the operating system's version for the
handover.

### Task 1 — Confirm the starting point

Run `git grep -nF -e "team-member-cli" -e "sprint.mjs launch" -- scripts guards commands templates`
— expected before the work: nothing. After Task 4 the same command must list at least
`scripts/sprint.mjs`, `scripts/installed-scripts.txt`, `guards/sprint.test.js`,
`guards/team-member-cli.test.js`, `commands/sprint.md` and `templates/README.md`.
Paste both.

Run `claude --help | grep -i -A2 allowedTools` and paste it; use what it says for
*Decision 1*'s rule form.

### Task 2 — The tests, red

Create `scripts/team-member-cli.mjs` holding only its first two lines (*Traps*). Write
`guards/team-member-cli.test.js` (*Decision 6*) and the two `guards/sprint.test.js`
changes. Commit. Run the new file alone: every † case fails; case 12 fails too. Paste
the failing names.

### Task 3 — The code

Apply *Decisions 1 to 4* to `scripts/team-member-cli.mjs` and `scripts/sprint.mjs`, and
add the script to `scripts/installed-scripts.txt`. Commit. Run both test files alone
(all pass except case 12 until Task 4), then `bash scripts/check-blueprint.sh`. Paste
each.

Then show the judging can fail: as a throwaway commit, make `judge` return the final
line as it stands (no rule 4); run the new file alone — expected red: the rule-4 parts of
cases 3 and 8. Then, as another throwaway commit, make `agentEnv` return `env`
unchanged — expected red: cases 2 and 6. `git reset --hard HEAD~1` after each. Paste
the failing names. If one stays green, fix the test, commit, and repeat.

### Task 4 — The documents and the decision

Apply *Decision 5*. Commit. Run Task 1's grep again and both test files alone (all
pass), then `bash scripts/check-blueprint.sh` (last line `Self-check passed`). Paste
each.

### Task 5 — Fresh-agent check

`commands/sprint.md` changes what a sprint session is told. A fresh agent given only a
project set up from this branch must be seen to start a team member in the other tool.
Run it with its tool calls visible (`claude -p --output-format stream-json --verbose`,
allowed to run shell commands), with the scratch project as its working directory, and
with `cursor-agent` replaced on its `PATH` by Task 2's fake in mode `slow`, so no real
Cursor agent starts.

1. Set up: `mkdir -p "$TMPDIR/team-agent" && git init -q --bare "$TMPDIR/team-agent/origin.git"`,
   `mkdir "$TMPDIR/team-agent/kiln-yard" && git -C "$TMPDIR/team-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/team-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/team-agent/kiln-yard/.tropis" ci`. Give the project a
   local identity (`example.com`), a `feature-catalog.yaml` with one `shaped` entry
   `glaze-log`, banded A in `docs/backlog-board/bands.yaml`, commit, add the bare
   repository as `origin` and push `main`. Run `node .tropis/scripts/sprint.mjs start
   glaze-log --way cursor` there.
2. Prompt, verbatim apart from nothing: *"This is a probe; its output will be
   discarded. Run /sprint. The developer has agreed the sprint already under way and
   says: start it, with the team members in Cursor using the model composer-2.5. Do
   what the command says for starting the team, then report what you ran and how the
   developer will hear when a team member ends."* (If the tool cannot run `/sprint`
   in print mode, say instead *"Follow `.claude/commands/sprint.md`."*)
3. Check, and paste from the stream: a call running `sprint.mjs launch glaze-log` with
   `--model composer-2.5` (with or without `--tool cursor`), and a call running
   `sprint.mjs watch` in the background; and the report saying it hears through
   `watch` or `status`.
4. Kill every process the probe left (the fake and the detached run), then delete the
   scratch folder.

If the agent starts a session, a subagent or nothing, the wording is not clear enough:
change it, commit, and run the probe again. If it fails twice, stop and hand back with
both transcripts' relevant calls. Record the tool, its version, the operating system
and the architecture in the commit body of the final commit and in the handover, with
one sentence on what the agent was asked and what it did.

### Task 6 — Live runs with the real tools

The fakes stand in for the tools' output. Four short runs show the real tools take the
arguments and that the judging holds, signed in to the developer's plans, nothing
billed beyond them.

1. Set up `$TMPDIR/team-live` like Task 5's project (with its own bare origin), with one
   `shaped` entry `probe-entry`, and run `sprint.mjs start probe-entry --way claude`.
2. Write a prompt file `$TMPDIR/team-live/do.md`: *"This is a probe. In this directory,
   set `status: shipped` on the entry probe-entry in feature-catalog.yaml, commit with
   the message 'probe', and push with `git push origin HEAD:main`. Then end your reply
   with the line SHIPPED."* and `$TMPDIR/team-live/claim.md`: *"This is a probe. Do
   nothing at all. End your reply with the line SHIPPED."*
3. Claude Code: `TROPIS_TEAM_PROMPT=$TMPDIR/team-live/claim.md node .tropis/scripts/sprint.mjs launch probe-entry --tool claude --model haiku`,
   then `node .tropis/scripts/sprint.mjs watch` — expected: the rule-4 `STOPPED` line.
   Then with `do.md` — expected `SHIPPED`, and `git -C <origin> show main:feature-catalog.yaml`
   shows `probe-entry` shipped; the result's `denied` is empty.
4. Reset the entry to `shaped` on origin and repeat both with `--tool cursor`, the
   model one of Cursor's own models that `cursor-agent --list-models` offers (Composer
   or Grok; included on every Cursor plan per `docs/model-picks.md`). Expected the same
   two lines; `.cursor/cli.json` in the worktree, and the push done under it.
5. Paste for each run the launch line, the `watch` line, and the result file with the
   session id replaced by `<session-id>`.

If a real tool's events differ from what the fakes print (no `session_id`, another
`result` shape, the grants form refused), change the code and the fakes to match the
real tool, rerun the guards and the run, and say so under *What the plan got wrong*. If a
run is refused a granted command, fix the grants and rerun. If a run needs anything
beyond the developer's plan — a key, a paid model, credits — stop that run and hand
back. Kill any process left, then delete the scratch folder.

### Task 7 — The catalog and the board

1. In `feature-catalog.yaml`, on `team-members-start-in-another-tool`: set `status:
   shipped` (it reads `building`; if it reads anything else, set `shipped` anyway and
   say so under *Judgment calls*). Set `modules` to `scripts/team-member-cli.mjs`,
   `scripts/sprint.mjs`, `guards/team-member-cli.test.js`. Remove `blockedBy`. Keep
   `after` and `refs`. Add, directly above the entry's `- id:` line, a comment
   `# Shipped by docs/superpowers/plans/2026-11-02-team-members-start-in-another-tool.md.`
   and lines mapping each of the seven criteria to the cases (by number) that cover it;
   criterion 7's fresh agent is Task 5, recorded in the commit body and the review
   record. Do not put `: ` (colon and space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole `team-members-start-in-another-tool:`
   block (the key and its indented lines, through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 8 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has
   no screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/team-members-start-in-another-tool`).
   **Do not open a pull request**, write a review record, set auto-merge or merge:
   `main` is gated and the dispatching session reviews, opens the pull request and
   merges. Leave the worktree in place; the reviewer removes it.

## Model tier and merge authority

**Model tier: Large.** The code is specified by behaviour, not verbatim: a detached
process, a stream parser, and live runs whose real output may differ from the fakes and
must be reconciled with judgement.

**Requires:** `claude` and `cursor-agent` installed and signed in to the developer's plan, for Task 5 and Task 6.

**Merge authority: parent review.** The specifying session reviews, re-runs the checks,
writes the review record, numbers the decision and merges under the merge token.

## Handover report

### Task completion

Tasks 0 to 8 done. Worktree `../tropis-team-cli` (made by the isolate helper). Task 5's fresh-agent check and Task 6's four live runs were done with the signed-in tools only; no key, no `--bare`, no cloud agent; scratch folders deleted and processes killed afterwards.

### Verification results

Platform: git 2.49.0, Node v22.15.0, Claude Code 2.1.300, cursor-agent 2026.10.22-27dcf5f, macOS 26.2 on arm64 (`uname -sm`: Darwin arm64).

- Task 0 baseline: `bash scripts/check-blueprint.sh` last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1: `git grep -nF -e "team-member-cli" -e "sprint.mjs launch" -- scripts guards commands templates` printed nothing before the work. After: hits in `scripts/sprint.mjs`, `scripts/installed-scripts.txt`, `guards/sprint.test.js`, `guards/team-member-cli.test.js`, `commands/sprint.md`, `templates/README.md`. `claude --help` says `--allowedTools <tools...>` is variadic, "Comma or space-separated"; the code passes one comma-joined argument.
- Task 2 (red): all 22 cases of `guards/team-member-cli.test.js` failed before the code (`Tests: 22 failed, 22 total`), the documents case included.
- Task 3: both files green except the documents cases (`Tests: 2 failed, 47 passed, 49 total`) until Task 4. Throwaway mutations, run against the working tree and reverted with `git checkout`: removing judge rule 4 turned red "a run ends > STOPPED when it claimed SHIPPED…" and "the seam > judge…"; making `agentEnv` return `env` turned red "launch > starts the tool at once…" and "the seam > agentEnv…".
- Task 4/8: `bash scripts/check-blueprint.sh` last line `Self-check passed: …`; `npm --prefix .tropis test` `Tests: 154 passed, 154 total`.
- Task 5 (Claude Code 2.1.300, no `--model`, `--allowedTools Bash`, a fake `cursor-agent` in mode `slow` first on PATH): the agent called the `sprint` skill, then `node .tropis/scripts/sprint.mjs status`, then `node .tropis/scripts/sprint.mjs launch glaze-log --model composer-2.5` (reply: `Sprint: glaze-log started in Cursor's command line (pid …), in …/kiln-yard-team-glaze-log.`), then `node .tropis/scripts/sprint.mjs watch` with `run_in_background: true`, and its report said the developer hears through `watch` and `status`. The fake recorded one start with the brief as prompt. Passed at the first attempt. The probe ran on the developer's machine, whose global instructions do not mention the sprint, so they could not make it pass.
- Task 6 (live; the model for Claude Code was `haiku`, for Cursor `composer-2.5`):
  - Claude, `claim.md`: `Sprint: probe-entry ended in Claude Code — STOPPED: it said SHIPPED, but origin/main shows probe-entry as shaped`; result `{"tool":"claude","line":"STOPPED: it said SHIPPED, but origin/main shows probe-entry as shaped","denied":[],"sessionId":"<session-id>","exit":0,…}`.
  - Claude, `do.md`: `Sprint: probe-entry ended in Claude Code — SHIPPED`; `git show main:feature-catalog.yaml` on origin: `status: shipped`; `denied: []`; result `{"tool":"claude","line":"SHIPPED","denied":[],"sessionId":"<session-id>","exit":0,…}`.
  - Cursor, `claim.md`: `… ended in Cursor — STOPPED: it said SHIPPED, but origin/main shows probe-entry as shaped`; `.cursor/cli.json` in the worktree held `Shell(git)`, `Shell(gh)`, …
  - Cursor, `do.md`: `… ended in Cursor — SHIPPED`; origin's main has the commit `probe` and `status: shipped`; result `{"tool":"cursor","line":"SHIPPED","denied":[],"sessionId":"<session-id>","exit":0,…}`.
  - Two earlier Claude `do.md` attempts ended `STOPPED`/`PARKED` for a reason of the scratch project's own, not the launcher: the agent read the framework's rules there (a gated `main` refuses a direct push; a criterion without a test cannot ship). Both lines were correctly recorded as the agent's. I then gave the scratch project `"ungated"` in `.tropis/project.json` and an entry with no criteria.

### Scope

`git diff --stat origin/main...HEAD`: `commands/sprint.md`, `docs/backlog-board/bands.yaml`, `feature-catalog.yaml`, `framework/DECISIONS.md`, `guards/sprint.test.js`, `guards/team-member-cli.test.js`, `scripts/installed-scripts.txt`, `scripts/sprint.mjs`, `scripts/team-member-cli.mjs`, `templates/README.md` (10 files, 1052 insertions, 40 deletions) plus this plan. Every file is in *File Structure*; `docs/backlog-board/index.html` did not change. Worktree: `../tropis-team-cli`.

Worked from no named external source: the code is written against this repository's `sprint.mjs`, `claude --help` and `cursor-agent --help`.

### Judgment calls

- The decision keeps `FW-NNN` for the reviewer to number. Every sentence of it was checked against the build and stands.
- `launch` renames an existing `<id>.log` to `<id>.log.1` before starting, so a restarted run is not judged through the previous run's events (the first session id and last result would otherwise come from the old log).
- `run` takes its worktree from the same function `launch` uses, not from `sprint.launched`, which `launch` writes only after the process starts.
- `launch` re-reads the sprint file just before writing `launched` and the `planning` mark.
- `claude --allowedTools` gets one comma-joined argument (variadic option).
- The guards could not be named "case 1…12" as the plan numbers them; the catalog comment maps criteria to the `describe` blocks and cases by name. The `launch` timing assertion was replaced by "the run is alive and has no result when launch returns", because a clock limit failed once on a loaded machine.
- The documents case collapses whitespace before looking for the exception sentence (it wraps across lines).
- `isolate-for-plan.sh` was run once from the specifying session's checkout as dispatched.

### What the plan got wrong

- Case 12's exact sentence cannot be found in a wrapped paragraph; whitespace is collapsed instead.
- "within a second" for `launch` is not stable on a busy machine (the self-check ran at over 200 s for the suite).
- The live run for `do.md` needs the scratch project to be ungated and to have an entry without acceptance criteria, or the framework's own rules make the agent decline.
- Cursor's stream reports no `permission_denials`, so `denied` is always empty for Cursor.

### Outstanding

The change has no screen, so there is no developer check. The reviewer numbers `FW-NNN`. The `watch` and `status` suffix lines were exercised with fakes and with the four live runs only; a run lasting hours has not been tried.

## Review record

### Checks re-run

All by the specifying session, with git 2.49.0, node v22.15.0 and the self-check's own
Jest, on macOS 26.2, arm64, against the branch's committed `HEAD`.

- Scope: `git diff --stat origin/main...HEAD` lists the ten files of *File Structure*
  that changed and this plan, nothing else; `docs/backlog-board/index.html` did not
  change.
- The two guard files alone, staged from the branch: `Tests: 49 passed, 49 total`.
- Re-breaking, different from the executor's two, each in the staged copy:
  - Claude Code's command line without `--allowedTools`: `1 failed, 48 passed`.
  - `bash` added to the granted commands: `1 failed, 48 passed`.
- `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`: results in the
  commit that carries this record.
- `/dispatch` on this plan prints the tier, the requirement and the merge authority
  after the reviewer's fix below.

### Found

Public exposure: the diff was read for private material; nothing found. Session ids in
the handover are written `<session-id>`; the scratch projects are invented names.

- The plan's closing section held the model tier and merge authority as bullets, so
  `/dispatch` printed them empty and the executor was given them in its prompt. Fixed on
  the branch by the reviewer: header lines, and a `**Requires:**` line naming the two
  signed-in tools. Mechanical; the plan's own author's slip.
- The operator guide's new sentence ran past the paragraph's width. Fixed on the branch
  by the reviewer (rewrapped, same words).
- `TROPIS_TEAM_PROMPT`, which the plan specified for the live runs, was not named in
  `sprint.mjs`'s header beside `TROPIS_SPRINT_NOW`. Fixed on the branch by the reviewer:
  one comment sentence, no code.
- The handover's judgment calls (the old log renamed to `.log.1`, `run` deriving the
  worktree, launch's liveness assertion instead of a clock, whitespace collapsed in the
  documents case) were each checked against the code and the cases, and stand.
- The live runs (handover, *Verification results*, Task 6) are the evidence the decision
  cites: in each tool, the run that claimed `SHIPPED` without the work was recorded as
  `STOPPED` against `origin/main`, and the run that did the work as `SHIPPED`, with no
  denials. Accepted as recorded.

### Outstanding disposition

- No screen, so no developer check: none owed.
- The decision number: given at the merge token from the next free number on `main`.
- Cursor's stream carries no permission denials, so `denied` is always empty for Cursor
  and a refused command shows only through the agent's own `STOPPED` line, which the
  brief tells it to write. Accepted; the brief covers it.
- A run lasting hours has not been tried live. Its wait and its exit use the same code
  the fakes exercise; the next real sprint in the other tool is that trial. No new entry.

### Learnings routed

- A plan's tier, requirement and merge authority must be bold header lines, not bullets
  under a heading, or `/dispatch` prints them empty without refusing. The dispatch
  script's refusal of an empty field did not fire because it read none. Not routed as a
  rule: the planning rule already shows the header form; the slip was the author's.
- In a scratch project for a live run, the framework's own rules (a gated `main`, a
  criterion with no test) make an honest agent decline. Recorded in the handover for the
  next live run; not portable beyond that.
- What this built is the upstream already; nothing is queued.

### Merged because

A sprint session can start a team member in the other tool's command line and learn from
the repository how it ended. The no-key environment, the exact grants and the judgement
against `origin/main` are each guarded by cases shown to go red. The fresh-agent check
found the command text does what it says. Live runs in both tools ended as the decision
says. The defects found were a header format, a line width and a missing comment, all
fixed on the branch.
