# A fresh-agent check keeps the probe to the tools it names — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** the workflow's fresh-agent section tells whoever runs a probe of a clause that
watches one route — a hook on one tool — to take the other routes away from the probe,
and to read a run that went round the watched route as inconclusive, not as a pass.

**Backlog item:** `probe-keeps-to-its-tools` in `feature-catalog.yaml` (type bug). There
is no design document; the decisions below are the design.

**One plan:** what becomes true is one sentence — a probe of a hook can no longer pass by
doing the work through a tool the hook does not watch.

**What the specifying session verified on 2026-11-04, against `origin/main` at
`a59bf5a` (git 2.43, Claude Code 2.1.318 in a cloud session, Linux x86_64):**

- **The section as it stands:** `framework/workflow.md`, *Doc closeout — required*, the
  paragraph starting "**Judge the check by what the agent did, not by what it says it
  did.**" says to run the probe with its calls visible (`claude -p --output-format
  stream-json --verbose`). Nothing in the section says which tools the probe has.
- **The evidence:** `docs/superpowers/plans/2026-11-01-rules-carry-mechanism-not-provenance.md`,
  handover, *Task 6*: run 1 used `--allowedTools "Read,Grep,Glob,Edit,Write"`; the agent
  wrote both files with a shell heredoc, so the Edit/Write hook never fired. Run 2 added
  `--disallowedTools "Bash"` and the hook's reply reached the agent. The same report's
  *Learnings routed* says the rules-are-retired-on-evidence probe saw the same.
- **What the flags do, from `claude --help` in 2.1.318:** `--allowedTools` is "list of
  tool names to allow" — a permission that spares a prompt, which takes no other tool
  away; `--disallowedTools` is a "list of tool names to deny"; `--tools` is "the list of
  available tools from the built-in set". The repository already uses `--allowedTools`
  as pre-approval, in `scripts/team-member-cli.mjs`, which this plan does not touch.
- **No guard asserts the paragraph's wording** (`grep -rn "Judge the check by" guards`
  prints nothing), so no guard changes.
- **Overlap:** no item in `building` lists `framework/workflow.md` at the time of writing;
  the claim's overlap check is the record.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): the deliverable is the wording of one paragraph,
and the probe decides whether the wording works. The reviewer runs as a fresh subagent
of the cloud session, signed in to the developer's plan.

**Merge authority: self-merge after the fresh review.**

**Fresh-agent check: owed**, since `framework/workflow.md` changes what an agent running
a probe is told. The probe is given an invented hook on the Write tool and asked to set
up its fresh-agent check; it passes if the command it would run takes the shell (and
every other route that writes a file) away from the probe rather than only allowing the
file tools, and if it says a run that wrote through another route is inconclusive.

## Delivers

probe-keeps-to-its-tools

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-probe-tools-build -b plan/probe-keeps-to-its-tools origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body**; the commit touching `framework/workflow.md` states the
  fresh-agent check's outcome, with tool, version, model, operating system and
  architecture.
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Decisions

1. **A new paragraph directly after *Judge the check by what the agent did*,** since it
   is the same act — running the probe so its result means something. Rejected: folding
   it into that paragraph, which is about seeing calls, not limiting them.
2. **Say the mechanism, not the flag alone:** a list of allowed tools spares the probe a
   prompt and takes nothing away, so take away every route the clause does not watch.
   Name Claude Code's way (`--disallowedTools`, or `--tools` naming the set) as the
   example, as the paragraph before names `stream-json`.
3. **A run that went round the watched route is inconclusive, and is run again** with that
   route removed; it is never recorded as a pass.
4. **Provenance in one sentence**, as the neighbouring paragraphs do.

## Traps

- `framework/workflow.md` is the source; `.claude/framework/workflow.md` is not edited.
- A path in backticks under `docs/`, `scripts/` or `.claude/` must exist, or
  `framework-integrity` fails: the new paragraph names no such path.

## File Structure

| File | Change |
|---|---|
| `framework/workflow.md` | a paragraph after *Judge the check by what the agent did* |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-04-probe-keeps-to-its-tools.md` | the handover report and the review record |

## Tasks

1. Write the paragraph.
2. Commit, then run the fresh-agent check from a scratch clone of the branch with its
   tool calls visible; amend the commit body with the outcome.
3. Move the item to `shipped`, write the handover report.
4. Send the branch to the fresh reviewer, who writes the review record.
