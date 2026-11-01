# How a session starts another tool's agent and reads back what it did — Spike Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions*, *Probing limits* and *Traps*. Nothing in it stops for the
> developer.

**Goal:** the sprint spec's open question in section 9 is answered from each tool's own
documentation and from trial runs: what Claude Code's command line, Cursor's command line
and Cursor's cloud agent API take and return when a session starts an agent with them,
how the started agent's last line and its handover report are read back, and how
approvals behave with nobody watching. The answer is written into the spec, the choice
it settles for `team-members-start-in-another-tool` is recorded as a decision, and the
entry ships.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md`, read whole; the question
is the paragraph starting `**Open — second spike:**` in section 9, *Starting team
members — one seam*. The entry `another-tools-agent-can-be-started` in
`feature-catalog.yaml` carries the acceptance criteria this plan delivers; the comment
above it records the probing limits it was shaped with.

**One plan:** what becomes true is one sentence — the sprint design knows, from evidence,
how one tool's session starts another tool's agent and reads it back.

**What the specifying session verified on 2026-11-02, against `origin/main` at `c189fd3`,
with git 2.49 and Node v22.15.0 on macOS 26.2, arm64 (Claude Code 2.1.300):**

- **The question's place.** Section 9 of the spec lists four ways of starting a team
  member — in the sprint session itself, a subagent of the same tool, *a command line
  that starts another tool's agent — such as `cursor-agent -p` or `claude -p`*, and a
  printed prompt — then the paragraph `**Open — second spike:** …`, then section 10.
  The spec's `## Sources` ends by saying Cursor's capabilities were read from its
  changelog and third-party docs, not its own documentation, and that this spike does
  that.
- **A team member**, in the spec's words, takes an entry's brief, runs the workflow and
  leaves a handover report on its branch and a final line: `SHIPPED`, `PARKED: <why>` or
  `STOPPED: <why>` (section 2, step 6). That is what the probes imitate.
- **Both command lines were installed and signed in where the plan was written:**
  `claude --version` printed `2.1.300 (Claude Code)` and `claude auth status` printed
  `"loggedIn": true`; `cursor-agent --version` printed `2026.10.22-27dcf5f` and
  `cursor-agent status` printed `✓ Logged in as` an account. The plan does not depend on
  that: where a tool is absent or signed out where you run, that tool's runs are recorded
  as unproven (*Probing limits*).
- **The last decision** in `framework/DECISIONS.md` is `## FW-048: A run skips the stages
  when the same code already passed`. Decisions are `## FW-NNN: <title>` with a
  `**Date:** … · **Status:** Accepted.` line and then `**Decision:**`, `**Evidence:**`
  and `**Rejected:**` paragraphs, in that order; FW-048 is the model.
- **The private-material guard** (`guards/private-material.test.js`) fails the self-check
  on a committed UUID-shaped string or `session_` followed by sixteen or more letters and
  digits (it calls both "session id"), on home paths, hostnames and email addresses
  outside its allowlist. A command line's JSON output carries a session id and the
  account's email can appear in a status line, so neither may be pasted unredacted.
- **Review records read.** No plan from this spec has a review record yet; the sibling
  spike `merge-token-can-live-on-github` was being run at the same time. The shape of a
  spike plan and its finding follows `docs/superpowers/plans/2026-10-15-rule-tooling-spike.md`.

**Model tier: Large.** The deliverable is an answer whose content can be known only by
reading the documentation and running the probes, and it ends in a design decision; this
plan describes what the answer must satisfy rather than its wording, so the executor
needs the judgment.

**Merge authority: parent review.** Stop after pushing the handover report (Task 7). Do
not write a review record, open a pull request or merge.

**Requires:** a shell, git and Node; web access to read documentation; `claude` and `cursor-agent` on `PATH`, signed in, for the trial runs (a tool that is absent is recorded as unproven, not a reason to stop).

Do not store a kick-off prompt on this plan.

---

## Delivers

another-tools-agent-can-be-started

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-another-tools-agent -b plan/another-tools-agent-can-be-started origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `.github/`, `CLAUDE.md` or
  `AGENTS.md`.** They are the installed release, CI, and this repository's entry pair.
- **The trial runs happen in a throwaway repository under `$TMPDIR`, never in this
  repository or its worktree.** No probe agent is ever started with its working
  directory inside a checkout of this repository.
- **Push only to this plan's branch.** Every commit has a body saying what becomes true.
- **This repository is public.** No home paths, hostnames, account names, email
  addresses, personal or computer names, session ids or API keys in anything committed or
  in the handover. Write a session id as `<session-id>`, an email as `<email>`, and a
  path as relative to the worktree or as `$TMPDIR/...`. Read your own diff for them before
  every push.
- **Every claim names its source**: the tool's own documentation, with its address and
  the date read, or a run, with the tool's version and the operating system and
  architecture (never the computer). The tool's own `--help` output counts as its own
  documentation; say which version printed it. No blog, forum, third-party integration
  page, or what a model remembers.
- **Write the text yourself**; say in the handover which named sources you worked from.

## Probing limits

The developer set these; they are not yours to widen.

- Probe only tools already installed and signed in where you run, and documentation on
  the web.
- **Do not** install a tool, create an account, create or enter an API key or token, or
  start a cloud agent of any tool (Cursor's cloud agents are paid). Do not sign in or out.
- A part of the answer that can be had only by one of those is recorded in the spec as
  **unproven**, with what proving it would take (which account, key or plan, which
  call), not skipped in silence and not parked.
- Keep the trial runs small: at most five runs per command line, each on the invented
  task in Task 2, each with a wall-clock limit of five minutes, and on the tool's cheapest
  model where it lets you choose one (say which).

## Decisions

### 1. Where the answer goes

- In the spec, replace the paragraph starting `**Open — second spike:**` with one
  starting `**Answered — second spike (<date>):**`: the answer in plain English, at most
  about fifteen lines — which ways of starting a team member in another tool work today,
  the command for each, how its last line and handover report are read back, how it is
  run with nobody watching, what remains unproven — ending with a pointer to the evidence
  section below.
- Add a section `## Second spike — evidence`, directly before `## Sources`, holding the
  evidence: per command line, a table or list of what it takes (prompt, working
  directory, model, output format, permissions, resuming) and what it returns (exit code,
  output shape, where the last line is, the resume id), each line citing its source; the
  trial runs, each with its command (redacted), the tool version, operating system and
  architecture, and what it printed or did, quoted short; then Cursor's cloud agent API
  from its documentation, with every unproven part marked.
- In `## Sources`, rewrite the sentence about Cursor's capabilities having been read from
  its changelog and third-party docs so it says the second spike checked them against
  Cursor's own documentation and trial runs, on the date it did, and add the
  documentation addresses read.
- Change nothing else in the spec.

### 2. The decision record

Add one decision at the end of `framework/DECISIONS.md`, numbered with the next free
`FW-` number on `origin/main` when you write it (FW-049 if nothing newer than FW-048 has
landed). Other sessions are adding decisions at the same time, so the reviewer may
renumber it when it merges: say in the handover which number you used.

It records the choice the answer settles for `team-members-start-in-another-tool`, in
the shape of FW-048: what a sprint session uses to start a team member in another tool,
how it learns the team member is done and what it reported, and how the team member is
allowed to act with nobody watching. *Evidence* is the spike's runs and the documentation,
briefly, pointing at the spec section. *Rejected* names each alternative the evidence
ruled out or that the probing limits left unproven, and why — at least the other ways the
spec's section 9 lists that apply, and reading the result only from the command's output
rather than from the repository, or only from the repository, whichever you did not
choose. If the evidence settles no choice — for example, neither command line can run an
agent unattended — write no decision; say so and why in the spec's answer, and in the
handover. That outcome also fails the fifth acceptance criterion: say so in Outstanding
rather than shipping the entry (Task 6).

### 3. The probe imitates a team member, no more

A team member pushes a branch with a handover report and ends with a final line. The
probe's invented task does exactly that in a throwaway repository with a local bare
remote, so reading back is tested against a real push without touching GitHub. It never
runs this repository's workflow, opens a pull request or reaches a network remote.

## Traps

- **Your own instructions travel with a probe started on this machine.** A command line
  started from your session loads the signed-in user's own settings and instructions as
  well as the throwaway repository's, and the user's settings may already allow commands
  the approval runs are meant to find refused. For each tool, find from its documentation
  whether a run can be limited to the project's settings (for Claude Code, look for a
  flag naming setting sources), use it on the approval runs where it exists, and record
  which settings loaded on every run. Where it cannot be limited, say the approval result
  may reflect the user's own settings.
- **A probe may wait for an answer that never comes.** That is one of the outcomes being
  measured, not a fault. Run each probe under a five-minute wall-clock limit; macOS has no
  `timeout`, so use `perl -e 'alarm shift; exec @ARGV' 300 <command> ...` and record a
  kill by the limit as "waited until killed after 300 s". Run long probes in the
  background if your tool stops commands sooner.
- **A command line started from inside another agent session may behave differently**
  from one started in a plain terminal (environment variables the parent sets, no
  terminal attached). That is the case the spike is about, so measure it as it is, and
  record the environment variables your session sets whose names start `CLAUDE` or
  `CURSOR` (names only, not values).
- **Output carries private material.** JSON results carry session ids; status lines can
  carry the account's email. Redact before writing anything into the repository.
- **The self-check reads `HEAD`.** Commit before running `bash scripts/check-blueprint.sh`.
- **`npm --prefix .tropis test` runs the installed release's checks**, not this source;
  it is run only to show the catalog edit is well-formed.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-11-01-sprint-design.md` | *Decision 1* |
| `framework/DECISIONS.md` | *Decision 2*, one new decision |
| `feature-catalog.yaml` | the entry to `shipped`, with a comment naming what covers each criterion (Task 6) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 6) |
| `docs/superpowers/plans/2026-11-02-another-tools-agent-can-be-started.md` | the handover report |

Nothing else. The throwaway repository and the probes' output stay under `$TMPDIR`.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing). Record for the handover: `git --version`, `node --version`, `uname -sm`,
`sw_vers -productVersion` (or the system's equivalent), `claude --version`,
`cursor-agent --version`, and whether each is signed in (`claude auth status`,
`cursor-agent status`) — signed in or not, never the account. A tool that is absent or
signed out: record it, and treat its runs as unproven from here on.

### Task 1 — Read each tool's own documentation

For each of Claude Code's command line, Cursor's command line and Cursor's cloud agent
API, find and read the tool's own current documentation (its documentation site and,
for the command lines, `--help` of the installed version). Note, with the address and
date for each:

- how an agent is started with no one at the keyboard: the prompt, the working
  directory, the model, the output format and its fields, a limit on turns or time, the
  exit code, and whether it returns at once or when the agent is done;
- how it is resumed or sent a follow-up, and what id that takes;
- what permissions it has unattended by default, what it does when it needs one it
  lacks, and every flag or setting that grants more — with what each allows;
- for the cloud agent API only: how it is authenticated, how an agent is started on a
  repository and branch, how its status, its conversation and its result (a branch, a
  pull request) are read, how a follow-up is sent, and whether Cursor's command line
  can itself start or hand work to a cloud agent.

Where the documentation is silent, say so; that is a finding.

### Task 2 — The throwaway repository

```bash
P="$(mktemp -d)"; git init -q --bare "$P/origin.git"
git clone -q "$P/origin.git" "$P/work" && cd "$P/work"
printf '# Probe\n\nA throwaway repository for a spike. Nothing here is real.\n' > README.md
git add README.md && git commit -qm "chore: probe repository" && git push -q origin HEAD
```

Before each run, reset the clone to that first commit with no other branches, so each run
starts the same. The invented task, with `<tool>` replaced by `claude` or `cursor`:

> This is a probe; its output will be discarded. Create a branch `probe/<tool>`. Write
> `HANDOVER.md` containing a heading `## Handover report` and one line saying what you
> did. Commit it with a message and push the branch to `origin`. End your reply with a
> line that is exactly `SHIPPED`.

### Task 3 — Claude Code's command line

From your session, in `$P/work`, under the five-minute limit:

1. **Granted.** Start `claude -p` with the task, the output format that gives a
   machine-readable result, and the narrowest permissions the documentation offers that
   let it write a file and run `git` (say which you used). Record the exit code, the
   result's shape (field names, not values), where the last line is, and whether a resume
   id is returned.
2. **Read back.** From the starting session: the last line from the output, and the
   handover from the remote — `git --git-dir "$P/origin.git" log --oneline probe/claude`
   and `git --git-dir "$P/origin.git" show probe/claude:HANDOVER.md`. Quote both.
3. **Nobody to approve.** Reset; start it again with no permission granted beyond the
   default, limited to the project's settings if the tool allows (*Traps*). Record what
   it did: refused and went on, stopped, or waited until killed; its exit code; and what
   its output said.
4. **Resume.** Optionally, resume run 1 with a one-line follow-up ("Which file did you
   write?") using the returned id, to show the id works. Record the answer's last line.

### Task 4 — Cursor's command line

The same four steps with `cursor-agent` (`-p` or the print mode its documentation names),
branch `probe/cursor`, recording the same things. For step 3, also record whether a run
without the flag that grants everything can write files or run commands at all in print
mode.

### Task 5 — Write the answer and the decision

Write the spec's answer and evidence section (*Decision 1*) and the decision record
(*Decision 2*) from Tasks 1–4. The answer must cover every acceptance criterion of the
entry in `feature-catalog.yaml`; check each against what you wrote, one by one. Commit.

Check, and paste the outputs in the handover:

```bash
grep -c '^\*\*Open — second spike' docs/superpowers/specs/2026-11-01-sprint-design.md
grep -c '^\*\*Answered — second spike' docs/superpowers/specs/2026-11-01-sprint-design.md
grep -c '^## Second spike — evidence' docs/superpowers/specs/2026-11-01-sprint-design.md
```

Before the work they print `1`, `0`, `0`; after it they must print `0`, `1`, `1`. If not,
fix the spec and run them again.

### Task 6 — Ship the entry

If the fifth acceptance criterion failed (*Decision 2*, no decision settled), skip this
task, leave the entry in `building`, and say so in Outstanding.

Otherwise, in `feature-catalog.yaml`, set the entry's `status` to `shipped`, leave
`modules: []` (a spike has no modules; the catalog guard requires it), and add above it,
below the existing comment:

```yaml
# Shipped by docs/superpowers/plans/2026-11-02-another-tools-agent-can-be-started.md.
# Criteria 1 to 4 and 6 - the spec's section 9 answer and its Second spike evidence
# section, re-read in the plan's review record. Criterion 5 - the decision FW-<n>.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Remove the entry's row
from `docs/backlog-board/bands.yaml`. Commit. Run `npm --prefix .tropis test` and paste
the `Tests:` line; every test must pass.

### Task 7 — Verification and handover

1. From the worktree, everything committed: `bash scripts/check-blueprint.sh` (paste the
   last line, which must start `Self-check passed`), and
   `git diff --stat origin/main...HEAD` (paste it; every file must be in
   *File Structure*).
2. Search the diff for private material: `git diff origin/main...HEAD | grep -nEi
   '[0-9a-f]{8}-[0-9a-f]{4}-|@[a-z0-9-]+\.[a-z]|/Users/|/home/'` must print only lines
   you can account for (paste it, or say it printed nothing).
3. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls (including the permission flags chosen, the models used, and the decision
   number), What the plan got wrong, Outstanding (every part recorded as unproven, with
   what proving it would take; and that the change has no screen, so there is no
   developer check). Commit.
4. Push the branch (`git push -u origin plan/another-tools-agent-can-be-started`).
   **Stop there.** Do not open a pull request, write a review record, set auto-merge or
   merge: the dispatching session reviews, and opens the pull request when it holds the
   merge token. Leave the worktree in place; the reviewer removes it.
