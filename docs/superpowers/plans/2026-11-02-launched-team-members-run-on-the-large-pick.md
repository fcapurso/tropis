# A team member launched in a command line runs on the Large tier's pick — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `sprint.mjs launch <id>` without `--model` starts the team member on the Large
tier's first pick that the developer's subscription *in that tool* includes, passed to
the tool by the name its command line accepts; where no such pick can be named, it says
why and starts the tool on its default model, as a session sprint already does.

**Backlog item:** `launched-team-members-run-on-the-large-pick` in `feature-catalog.yaml`.
**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md` §9 (*Its `--model` should
be the cheapest that can do the job*); decisions FW-059 (launch) and FW-060 (the Large
pick for team members, whose *Consequences* leave this gap "to a later entry").

**One plan:** what becomes true is one sentence — a launched team member runs on the
same pick a session team member does, in its own tool, or is told why not.

**What the specifying session verified on 2026-11-02, against `origin/main` at `0f8ae55`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64):**

- **`launch` passes `--model` only when given.** `scripts/sprint.mjs` `launch(ctx, opts)`
  builds the detached run's arguments with `...(opts.model ? ['--model', opts.model] : [])`,
  records `launched[id]` with `model` only when given, and returns two lines
  (`Sprint: <id> started in <name>'s command line (pid …), in <worktree>.` and
  `Sprint: its log is …`). `runMember` passes `opts.model` to `commandLine(tool, { prompt,
  model })` from `scripts/team-member-cli.mjs`, which appends `--model <m>` when set.
  `TOOLS` there is `{ claude: { command: 'claude', name: 'Claude Code' }, cursor:
  { command: 'cursor-agent', name: 'Cursor' } }`.
- **The session way already names a pick.** `teamModelLine(root, env)` in `sprint.mjs`
  reads `docs/model-picks.md` and the record `tropis/subscriptions.txt` under
  `git rev-parse --git-common-dir`, and calls `pickToUse(picksText, TEAM_TIER,
  recordText)` from `scripts/plan-binding.js` (`TEAM_TIER` is `Large`), or uses
  `NO_PICKS_USE` when there is no picks file. Its line ends ` Start them on the tool's
  default model.` when the `**Use:**` text starts `**Use:** not chosen` or
  `**Use:** none`.
- **`pickToUse` names a display name and a tool, not a command-line name.** It returns
  `**Use:** <model>, in <tool name> — …` for the first model of the tier (then each tier
  above) whose row in the picks file's inclusion table (header beginning
  `| Model | Usage per task | Included on |`, parsed by `inclusionTable`) lists a
  subscription the record holds for some tool. Model names are display names such as
  `Claude Opus 5.5`; a tool's command line wants its own identifier (Claude Code's
  `--model` takes an alias or a full model name; Cursor's takes an id from
  `cursor-agent --list-models`, such as `gpt-5.3-codex-low` in the sprint spec's second
  spike). Nothing in the picks file holds those identifiers today, and a pick may be in a
  tool other than the one being launched.
- **`inclusionTable` matches the header with `startsWith`**, reads cells 0 and 2 of each
  row, and stops at the first line not starting `|`. A fourth column is therefore ignored
  by every reader today. `commands/refresh-model-tiers.md` is the only producer of the
  table (its *What to write* list and the template block after it). The record's lines
  are `<tool>: <subscription>`, tool names as the *Included on* cells write them
  (`Claude Code`, `Cursor`); `parseSubscriptions` lowercases the tool.
- **Tests:** `guards/team-member-cli.test.js` covers `launch` with fake tools that record
  their `argv` (`fakes.records()`); its `launch` cases pass `--model haiku` or no model and
  assert exact output lines. `guards/sprint.test.js` covers `teamModelLine` with a picks
  fixture `PICKS` and record `RECORD`.
- **`overlap-check-reads-every-file-in-a-row` also edited `scripts/plan-binding.js`.** The
  first overlap check wrote the header's `Merges after` for it; it shipped at `0e3e3a2`
  before this claim landed, so that wait is already over. No plan in `building` shares a
  file with this one.
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about model picks or launching, so a local fresh-agent probe is a real one.

**Model tier: Medium.** One function with a few cases, its use in `launch`, a column the
model-picks command writes, and wording; the reasons and lines are given.

**Merge authority: parent review.** The specifying session reviews, opens the pull request
and merges. Stop after Task 6; do not open a pull request, write a review record or merge.

**Requires:** an agent command-line tool that starts a fresh local session from a prompt, signed in to the developer's existing plan, for the fresh-agent check in Task 4 (record which, and its version).

**Merges after:** overlap-check-reads-every-file-in-a-row

Do not store a kick-off prompt on this plan.

---

## Delivers

launched-team-members-run-on-the-large-pick

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-launch-pick -b plan/launched-team-members-run-on-the-large-pick origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Never write anyone's subscriptions into a
  committed file; test records use invented plan names.
- **No test reaches the network or a real agent tool**; use the fake tools the test file
  already has.
- **No cloud session, cloud agent or API key**, in the work or its checks.
- **Lines in framework documents and commands stay within 90 characters.**
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## Decisions

### 1. Where a tool's name for a model comes from

The picks file's inclusion table gains a fourth column, **`Command-line name`**, written
like *Included on*: `<tool>: <name>` per supported tool, tools separated by `; `, and
`<tool>: none` where the tool does not offer the model. Example row:

```
| Claude Opus 5.5 | $… per task (…) | Claude Code: pro, max; Cursor: pro | Claude Code: claude-opus-5-5; Cursor: claude-opus-5.5 |
```

The header row becomes `| Model | Usage per task | Included on | Command-line name |`. It
still begins with the old header, so every reader of the first three columns is unchanged.
A file without the column still works for `/dispatch`; `launch` then says the names are
missing (*Decision 3*). Rejected: deriving the name from the display name (Cursor's ids do
not follow one rule), and asking the tool at launch (Claude Code has no list command).

### 2. The function: `pickForTool` in `scripts/plan-binding.js`

```js
/**
 * The model a tool's command line should start a run of this tier on: the first pick of
 * the tier, then each tier above it, that the recorded subscription *in that tool*
 * includes and that has a command-line name for that tool. `model` is that name, or null
 * with `reason` saying why none could be named.
 * @param {string|null} picksText the picks file, or null when there is none
 * @param {string} tier
 * @param {string|null} subscriptionsText the local record, or null when there is none
 * @param {string} toolName as the Included on cells write it, such as "Claude Code"
 * @returns {{model: string|null, pick: string|null, reason: string|null}}
 */
export function pickForTool(picksText, tier, subscriptionsText, toolName) { … }
```

Rules, in order (each `reason` verbatim):

1. `picksText` null → `this project has no model picks. Run /refresh-model-tiers.`
2. no inclusion table → `the picks do not say which subscriptions include each model.
   Run /refresh-model-tiers.`
3. no record, or the record has no line for `toolName` (compare lowercased) →
   `which ${toolName} subscription you have is not recorded on this machine. Run
   /refresh-model-tiers.`
4. Walk the models of the tier, then each tier above it, exactly as `pickToUse` does
   (same splitting, same stripping of the tool tag and of `any pick from a higher
   tier`). For each, take its inclusion row's entry for `toolName`; skip the model unless
   one of its subscriptions is the one the record holds for that tool. The first model
   that passes is the pick. If none passes →
   `no ${tier} pick or above is included in your ${toolName} subscription, and a model
   that costs extra is not used (FW-053).`
5. The pick's `Command-line name` cell has no `<toolName>: <name>` entry, the column is
   absent, or the name is `none` → `pick` is the display name, `model` null, reason
   `the picks do not give ${toolName}'s name for ${pick}. Run /refresh-model-tiers.`
6. Otherwise `{ model: <name>, pick: <display name>, reason: null }`.

Read the fourth column the way `inclusionTable` reads the third (the same split on `|`,
the same handling of a parenthesised note). Share code with `pickToUse` and
`inclusionTable` where it keeps both readable; do not change what either returns.

### 3. `launch` without `--model`

In `launch`, when `opts.model` is not given: read the picks file and the record as
`teamModelLine` does, call `pickForTool(picks, TEAM_TIER, record, TOOLS[tool].name)`, and:

- with a `model`: use it exactly as if `--model <model>` had been given (the run's
  arguments and `launched[id].model`), and add a third output line
  `Sprint: ${id} runs on ${pick} (${model}), the ${TEAM_TIER} tier's first pick your ${name} subscription includes.`
- with none: pass no `--model`, and add a third line
  `Sprint: ${id} starts on ${name}'s default model — ${reason}`

With `--model` given, nothing changes: no third line, the given model is used.

### 4. The words

- **`commands/sprint.md`**, the paragraph that starts `For \`claude\` or \`cursor\``:
  replace the clause about adding `--model <model>` with: `launch` starts each team
  member on the Large tier's first pick that the developer's subscription in that tool
  includes, by the name that tool's command line takes, or says why it starts on the
  tool's default model; pass `--model <model>` only to choose another.
- **`commands/refresh-model-tiers.md`**: in the list item describing the table whose
  header begins `| Model | Usage per task | Included on |`, add the fourth column: for
  each supported tool, the name its command line takes for the model
  (`<tool>: <name>`, tools separated by `; `, `<tool>: none` where it does not offer it),
  found from the tool itself — Cursor's `cursor-agent --list-models`, Claude Code's
  documented model names — never guessed; `sprint.mjs launch` starts a team member by it.
  Update the template block's header and example row to four columns.
- **`framework/model-tiers.md`**: in the row for *A sprint's team member*, the third
  cell names `sprint.mjs launch` as well (for example ``the last line of `sprint.mjs
  start`, `sprint.mjs add` and `sprint.mjs launch` ``).
- **`templates/README.md`**: in the sentence about starting team members in the other
  tool's command line, say that they start on the Large tier's pick in that tool when the
  picks give its name.
- **`framework/DECISIONS.md`**: in FW-060's *Consequences*, replace the sentence starting
  `A team member started in another tool's command line (FW-059) is still passed` and
  ending `that is left to a later entry.` with `A team member started in another tool's
  command line (FW-059) runs on this pick in its own tool (FW-0NN).` Then append a
  decision under the next free number on your branch (the reviewer renumbers it at merge
  if `main` took it), verbatim apart from the number and rewrapping:

  ```
  ## FW-0NN: A launched team member runs on the Large pick its own tool's subscription includes

  **Date:** 2026-11-02 · **Status:** Accepted.

  **Decision:** `sprint.mjs launch` without `--model` starts the team member on the first
  Large pick that the developer's recorded subscription in that tool includes, passed by
  the name that tool's command line takes, which the picks file's inclusion table gives
  in a fourth column, `Command-line name`. Where no pick can be named it says why and
  starts the tool on its default model. `--model` still overrides.

  **Rejected:** The pick `/dispatch` names whatever its tool (it may be in the other
  tool). Deriving the command-line name from the display name (Cursor's ids follow no
  one rule). Asking the tool at launch (Claude Code has no list command).

  **Consequences:** A picks file written before this has no fourth column; `/dispatch`
  reads it as before, and `launch` says the names are missing until
  `/refresh-model-tiers` runs. Completes FW-060 for FW-059's team members. Source: the
  backlog item `launched-team-members-run-on-the-large-pick`.
  ```

## Tests

All in `guards/team-member-cli.test.js` (import `../scripts/plan-binding.js` as a
namespace, as the file does other modules). Picks fixtures are written in the test, with
invented models and plans (for example models `Alder 3` and `Birch 2`, plans `gold` and
`silver`).

1. † `pickForTool` returns each of the six rules' results: one case per rule, asserting
   the whole returned object, including the exact `reason`.
2. † It skips a pick included only in the other tool: a Large row with
   `Alder 3` included on `Cursor: gold` only and `Birch 2` on `Claude Code: gold`, record
   `Claude Code: gold` → `Birch 2` and its Claude Code name.
3. † `launch` with no `--model`, a picks file with names, and a record: the fake tool's
   `argv` equals `cli.commandLine('claude', { prompt, model: <the name> }).args`,
   `launched.e1.model` is the name, and the third line is the *Decision 3* text.
4. † `launch` with no `--model` and no picks file: the third line is
   `Sprint: e1 starts on Cursor's default model — this project has no model picks. Run /refresh-model-tiers.`
   (or the Claude Code equivalent), and the `argv` has no `--model`.
5. `launch` with `--model haiku` and a picks file that would name another: `haiku` is
   used and there is no third line.

Existing `launch` cases that pass no `--model` gain the third line their world produces
(no picks file: rule 1); change only their expected lines. Every † case must fail before
the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run a single test file the way the self-check's `run_guard` function in
  `scripts/check-blueprint.sh` runs a guard**: a `git archive` of `HEAD` extracted to a
  temporary folder, `templates/framework-jest.config.js` copied there as
  `jest.config.js`, a `package.json` reading `{"type":"module"}`, `node_modules` linked
  to `.self-check/node_modules`, `FRAMEWORK_ROOT` set to the folder. Say in the handover
  the exact command.
- **The `launch` tests spawn detached processes**; follow the file's existing helpers
  (`launch`, `noteFakePids`, `until`) so they are cleaned up.
- **Do not edit `docs/model-picks.md`** in this repository: it is the developer's, written
  by `/refresh-model-tiers`.
- **This plan quotes a table row and commands it is not declaring.** Its header has a
  `Merges after` field only as the claim wrote it; do not add or remove one.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | `pickForTool`, *Decision 2* |
| `scripts/sprint.mjs` | `launch`, *Decision 3* |
| `guards/team-member-cli.test.js` | *Tests* |
| `guards/dispatch.test.js` | the template-header assertion in "reads the picks table /refresh-model-tiers tells a project to start from" becomes the four-column header and separator (added by the reviewer after the executor stopped on it) |
| `commands/sprint.md` | *Decision 4* |
| `commands/refresh-model-tiers.md` | *Decision 4* |
| `framework/model-tiers.md` | *Decision 4* |
| `templates/README.md` | *Decision 4* |
| `framework/DECISIONS.md` | FW-060's line and one decision, *Decision 4* |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to checks (Task 5) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 5) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-02-launched-team-members-run-on-the-large-pick.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the decision record, the operator guide
(`templates/README.md`), the command that writes the picks and the tier document are the
documents this change owes, all listed. The README is not patched (`/refresh-readme`). No
upstream queue: this repository is the upstream. A release-note line is the developer's
at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, `git status --porcelain` (expected: nothing),
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Write the cases under *Tests* and an exported `pickForTool` that returns
`{ model: null, pick: null, reason: null }`. Commit. Run the test file alone (*Traps*):
every † case fails; no case that existed before the plan fails. Paste the failing names.

### Task 2 — The code

Apply *Decisions 2 and 3*, and the third line in the existing `launch` cases. Commit. Run
the test file alone (all pass), then `bash scripts/check-blueprint.sh` (last line starts
`Self-check passed`). Paste both. Then two throwaway commits, each followed by the test
file alone and `git reset --hard HEAD~1`: (a) make `pickForTool` ignore `toolName` when
choosing (take the first included pick in any tool) — expected red: case 2; (b) make
`launch` drop the found model — expected red: case 3. Paste the failing names of each.

### Task 3 — The words and the decision

Apply *Decision 4*. Commit. Run `bash scripts/check-blueprint.sh` (last line starts
`Self-check passed`) and
`git grep -n "left to a later entry" -- framework/DECISIONS.md` (expected: no line in
FW-060; before the work it prints FW-060's). Paste both.

### Task 4 — Fresh-agent check

The model-picks command now tells an agent to write each tool's command-line name, and
`/sprint` tells the sprint session that `launch` chooses the model. A fresh agent with
only a project set up from this branch must be seen to write the column so that `launch`
can read it. Run it with its tool calls visible (in Claude Code,
`claude -p --output-format stream-json --verbose`, allowed to run shell commands and edit
files), signed in to the developer's plan, with `ANTHROPIC_API_KEY` unset, in a scratch
project as its working directory, on this machine only.

1. Set up: `mkdir -p "$TMPDIR/pick-agent/kiln-yard" && git -C "$TMPDIR/pick-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/pick-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/pick-agent/kiln-yard/.tropis" ci`; give it a local git
   identity. Write `docs/model-picks.md` in it with a Large row `Alder 3 *(all)*` and an
   inclusion table of three columns only, where `Alder 3` is included on
   `Claude Code: gold; Cursor: gold`. Commit.
2. Prompt, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, the model Alder 3 is called
   `alder-3` in Claude Code's command line and `alder-3-thinking` in Cursor's. Record
   that in the project's model picks the way its /refresh-model-tiers command says, so
   that a sprint can launch team members on it. Change nothing else and do not
   commit."* Check, and paste: the diff of `docs/model-picks.md` adds the
   `Command-line name` column to the header and the separator and
   `Claude Code: alder-3; Cursor: alder-3-thinking` to Alder 3's row; and
   `node -e` importing `pickForTool` from the scratch project's `.tropis/scripts/plan-binding.js`
   with that file, tier `Large`, record `Claude Code: gold\n` and tool `Claude Code`
   prints `alder-3` as `model`.

If the agent misses a step, the wording is not clear enough: change it, commit, and run
the probe again. If it fails twice, stop and hand back with both transcripts' relevant
calls. Record the tool, its version, the model, the operating system and the
architecture in the commit body of the final commit (a no-change commit with
`--allow-empty` is fine) and in the handover. Delete the scratch folder afterwards.

### Task 5 — The backlog and the board

1. In `feature-catalog.yaml`, on `launched-team-members-run-on-the-large-pick`: set
   `status: shipped` (if it does not read `building`, set it anyway and say so), set
   `modules` to `scripts/plan-binding.js` and `scripts/sprint.mjs`, leave `refs`. Add,
   directly above the item's `- id:` line (above any comment already there), a comment
   `# Shipped by docs/superpowers/plans/2026-11-02-launched-team-members-run-on-the-large-pick.md.`
   and one line per acceptance criterion naming the case or check that covers it. No
   `: ` inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole
   `launched-team-members-run-on-the-large-pick:` block (through `blockers: []`).
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 6 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (the `Tests:` line),
   `bash scripts/check-blueprint.sh` (the last line), `git diff --stat origin/main...HEAD`
   (every file in *File Structure*). Read your own diff for private material and say so.
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen, so
   there is no developer check). Commit.
3. `git push -u origin plan/launched-team-members-run-on-the-large-pick`. **Do not open a
   pull request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.
