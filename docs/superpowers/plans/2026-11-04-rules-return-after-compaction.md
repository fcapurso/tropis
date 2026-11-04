# Find out whether an area rule comes back after compaction — Implementation Plan

> **For agentic workers:** this plan is built by its author, not dispatched (see
> *Shape*). A fresh reviewer reads it, the finding and the diff, and writes the review
> record. Nothing in it stops for the developer.

**Goal:** a written finding says, measured in Claude Code with its version and platform,
whether an agent that touches a file in an area after `/compact` or `/clear` is given that
area's rule again, and `framework/rule-delivery.md` says what was measured.

**Backlog item:** `rules-return-after-compaction` in `feature-catalog.yaml` (type
spike). Spec: `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
entry 2 and *What changes in the arc*: "whether Claude Code re-attaches a rule loaded by
its `paths:` header after `/compact` or `/clear`, and whether Cursor re-attaches its
projection. If both do, the entry closes with no work."

**One plan:** what becomes true is one sentence — the framework knows, measured, whether
Claude Code gives an area rule again after `/compact` and after `/clear`.

**Why.** Claude Code loads an area rule the first time the agent touches a file matching
its `paths:` header (FW-009). If the record that the rule was loaded survives compaction
while the rule's text does not, a long session works on without its rules exactly when it
has run longest, and nothing says so.

## Shape

**Built by its author and sent to a fresh reviewer** (`.claude/rules/planning.md`, *Do
not rehearse the work to write its plan*). The deliverable is a measurement nobody can
state before running it; describing it for an executor would mean writing every expected
output as "whatever the tool does". The reviewer is an agent with only the repository, on
the model `node .tropis/scripts/dispatch.mjs --tier Large` names (Claude Opus 5.5; this
session records no subscription, so the picks file's Large row is read directly: Opus 5.5
is included on every Claude Code plan). It re-reads the raw transcripts the finding
quotes, which are kept outside the repository, from the excerpts committed in the finding.

**Shaping decisions, made by the delivering session (the developer agreed the sprint):**

- **Cursor is split into its own backlog item,** `cursor-rules-return-after-summarize`.
  This session runs in a Linux cloud container with no Cursor application and no
  `cursor-agent`; the Cursor half needs the developer at Cursor and is a check only a
  person can perform. Splitting lets the Claude Code half ship, rather than parking the
  whole spike on a check the developer has not been asked for.
- **Read the rule's arrival from the transcript, not only from the agent's answer.**
  Claude Code writes each session's transcript as JSON lines; a rule loaded by its header
  appears there as an attachment carrying the rule's text. The marker sentence in the
  rule is the second signal, read from the agent's reply.
- **The runs:** in a throwaway project with one invented area rule
  (`.claude/rules/alpha.md`, `paths: ["areas/alpha/**"]`) whose body is a marker sentence.
  1. *Baseline:* a fresh session reads `areas/alpha/one.js`; the rule arrives.
  2. *After `/compact`:* the same session is compacted, then reads `areas/alpha/one.js`
     again; then `areas/alpha/two.js`, a file in the area it has not touched.
  3. *After `/clear`:* the same for `/clear`.
  4. *Control:* a session that never touched the area before compaction reads
     `areas/alpha/one.js` after it.
  Headless runs use `claude -p --resume <session>`, with `/compact` sent as the prompt;
  where a command does not run headless, the run is made in an interactive session
  driven through `tmux`, and the finding says which.

## Delivers

- `rules-return-after-compaction`

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-rules-after-compact -b plan/rules-return-after-compaction origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Nothing under `.claude/`, `.tropis/`,
  `CLAUDE.md` or `AGENTS.md` changes.
- **The probe is throwaway,** in the session's scratchpad, never in this repository.
- **This repository is public.** No home paths, hostnames, session ids or computer names
  in anything committed: transcript excerpts are quoted with session ids replaced by
  `<session>`.
- **Every agent runs on the developer's plan (FW-053):** the `claude` command signed in
  through this session, no API key.
- **A measurement names its tool, version and platform** (`claude --version`, `uname -sm`).

## Traps

- `framework/rule-delivery.md` is a framework document: its edit needs a fresh-agent
  check, recorded in the commit body.
- A path in backticks under `docs/`, `scripts/` or `.claude/` in a framework document
  must exist; the finding's own path does, the probe's paths must be written in plain
  text.
- A colon followed by a space inside an unquoted backlog value breaks the YAML.

## File Structure

| File | Change |
|---|---|
| `docs/superpowers/plans/2026-11-04-rules-return-after-compaction.md` | this plan, its handover report and review record |
| `docs/superpowers/specs/2026-11-04-rules-after-compaction-finding.md` | new: the finding |
| `framework/rule-delivery.md` | what was measured after `/compact` and `/clear` |
| `framework/DECISIONS.md` | FW-009's consequence names the finding instead of the open entry, if the result changes it |
| `feature-catalog.yaml` | the backlog item shaped, building, then shipped; the Cursor item added |
| `docs/backlog-board/bands.yaml` | the Cursor item banded |

## Tasks

1. Build the probe and run the four runs; keep the transcripts in the scratchpad.
2. Write the finding: how it was measured, a table of the runs with what arrived, the
   transcript excerpts, and a recommendation.
3. Update `framework/rule-delivery.md` and, if the result changes it, FW-009's
   consequence.
4. Run the fresh-agent check on the `rule-delivery.md` change.
5. Move the backlog item to `shipped`; run `bash scripts/check-blueprint.sh` and
   `npm --prefix .tropis test` on the committed branch.
6. Write the handover report; send the branch to the fresh reviewer, who writes the
   review record.
7. Merge as the workflow's *Merging* says.

**Model tier: Large** (the author builds it). **Merge authority: self-merge after the
fresh reviewer's record,** by the delivering session.

## Handover report

### Task completion

1. **Probe and runs: done.** Seven sessions in a throwaway repository in the session's
   scratchpad: A, B, D (control), E (automatic compaction), F (short rule, edit without
   a read), G (60-clause rule) headless, and one interactive session through `tmux` for
   `/clear` and a second `/compact`. Runs F and G were added beyond the plan's four, to
   test what the summary keeps and whether an edit without a read brings the rule back.
2. **Finding: done**, `docs/superpowers/specs/2026-11-04-rules-after-compaction-finding.md`.
3. **`framework/rule-delivery.md` and FW-009's consequence: done.** The result changed
   FW-009's consequence, which named this backlog item as the open question.
4. **Fresh-agent check: done**, outcome below.
5. **Backlog: done.** `rules-return-after-compaction` shipped, its band removed;
   `cursor-rules-return-after-summarize` added as an idea, band C.
6. This report; the fresh reviewer writes the review record.

### Verification results

All on Claude Code 2.1.318, node v22.23.4, git on Ubuntu 24.04.5 LTS, Linux x86_64.

- `bash scripts/check-blueprint.sh` on the branch's committed content: `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`, exit 0.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 175 passed,
  175 total`.
- `node .tropis/scripts/plan-overlap.mjs --claim` on this plan: `No overlap: … shares no
  file with a plan in building.`
- `node .tropis/scripts/dispatch.mjs` on this plan validates (the plan check passes).
- Measurements: the finding's *Results* table, read from each session's transcript.
- **Fresh-agent check** on the `rule-delivery.md` and FW-009 change: `claude -p
  --model claude-opus-5-5 --output-format stream-json --verbose`, Claude Code 2.1.318,
  from this worktree, no user-level instructions present (`~/.claude/CLAUDE.md` absent).
  Task: an invented proposal for a SessionStart hook that re-prints every area rule
  after `/compact` or `/clear`; decide from `framework/` and `rules/` whether to build
  it. Its calls: a grep for `compact|/clear|SessionStart` in `framework/` and `rules/`,
  reads of `framework/rule-delivery.md` lines 35–70 and FW-008/FW-009 in
  `framework/DECISIONS.md`. Its answer: "do not build the compact/clear SessionStart
  hook. After `/compact`, automatic compaction or `/clear`, Claude Code puts an area rule
  back by itself", naming the one-edit gap, FW-008, and Cursor as unmeasured. It found
  what the change intended.

### Scope

`git diff --stat origin/main...HEAD`: `docs/backlog-board/bands.yaml`, this plan, the
finding, `feature-catalog.yaml`, `framework/DECISIONS.md`, `framework/rule-delivery.md`
— every one in the File Structure table. Worktrees: `../tropis-rules-compaction` for the
claim, `../tropis-rules-after-compact` for this branch, stacked on the claim commit and
rebased onto `main` once the claim lands.

### Judgment calls

- The Cursor half is split into its own backlog item (see *Shape*).
- `/clear` was measured interactively only: headless `/clear` starts a new session id
  and resuming the old one restores the cleared conversation, so it measures nothing.
- Automatic compaction was forced with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=1`, an
  environment variable this cloud session already sets (to 80); the transcript's
  `"trigger":"auto"` confirms it ran as automatic compaction.
- The recommendation leaves the first-edit gap alone rather than proposing a backlog
  item; it is recorded in `rule-delivery.md` so it can be reopened with evidence.
- The `claude` banner reads "Claude API" in this cloud session; no API key was set, and
  the child processes used the session's own sign-in, which is the developer's plan.

### What the plan got wrong

- It listed `docs/backlog-board/index.html`; the board is not committed here, and the
  row was removed before the claim.
- Its four runs could not show the first-edit gap; runs F and G were needed.

### Outstanding

- Why the interactive `/compact` restored the rule file itself and the headless ones did
  not was not established; either way the rule was back before the agent's next action
  in the area had a result.
- Cursor: `cursor-rules-return-after-summarize`, needing the developer at Cursor.
