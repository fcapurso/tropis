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
