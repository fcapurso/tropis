---
description: "Before a release of this repository, try one rule clause with a fresh agent that does not receive it, record the outcome, and remove the clause if the agent did not need it."
---

This command lives in this repository only and never ships. `/release` runs it before
its Stage 1 (this repository's project-owned block says so). It takes the last release
tag, tries **one** clause from the rule file that grew most since that tag, and starts
nothing, removes nothing and lands nothing without the developer's yes. Rule files only
grow, and every clause costs context in every session that touches its area; a fresh
agent that does the work without a clause is the only evidence that the clause can go.

## Measure

Run `node .github/scripts/rule-trial.mjs growth <tag>`, with `<tag>` the last release
(the command in `/release`'s Stage 2 finds it). On exit 1, show its output and stop: the
tag is not a commit here, or the record in `docs/rule-trials.md` has a problem to fix
first. Otherwise show the table. When it says no rule file grew, propose a `skipped`
entry with that reason and go to *Record, and remove*.

## Choose the clause

From the top file of the table only. Read `git diff <tag> HEAD -- <file>` and prefer a
clause added or changed since the tag. A clause is one whole instruction, a bullet or a
paragraph under a heading, never a heading's whole section. Never one that the *Tried
before* list shows as `kept`. Propose it to the developer, quoted, with the task (next
section) and what tripping over its absence would look like, and wait. The developer may
choose another clause from the same file, or skip: record `skipped`, with their reason
as *Why*.

## Design the task

A real task that makes the agent touch files in the rule's area (`.claude/rule-areas.json`
names the patterns), so the rule is delivered to it: an agent that only discusses a clause
never receives the rule, and the trial proves nothing. The situation the clause governs
must arise in the task. The subject is invented, never a backlog entry, and the prompt
says the output is a probe and will be discarded. Before running, write down what an
agent that had the clause would do, and what tripping over its absence looks like.

## Set up the scratch copy

A clone, never a worktree of this checkout and never the branch you are on:

```bash
T="$(mktemp -d)"; git clone -q "$PWD" "$T/tropis"; git -C "$T/tropis" remote remove origin
```

Copy every `rules/*.md` into `$T/tropis/.tropis/rules/`, delete the clause from the
chosen one there, run `node .tropis/scripts/generate-rules.mjs` inside `$T/tropis`, and
confirm with `grep` that `$T/tropis/.claude/rules/<name>.md` lacks the clause and that
the other rule files carry the next release's text. The installed rules are the last
release's, so without the copy the agent would receive neither the clause's neighbours
as they now stand nor what grew around it, and the trial would test the wrong text.

## Run

Check that the developer's own user-level instructions do not say what the clause says.
If they do, the agent follows them whether or not the rule is delivered: run where they
do not load, such as a cloud session, and say so in the record. From `$T/tropis`, pipe
the prompt to a fresh agent with its tool calls visible, and save the output to a file;
in Claude Code that is `claude -p --output-format stream-json --verbose`. One run. Note
the tool and its version, the operating system and the architecture, never the
computer's name.

## Judge by what it did, not what it says

Read the agent's tool calls. It did what the clause asks without having it: `removed`.
It did what the clause exists to prevent: `kept`. The situation never arose:
`inconclusive`, and nothing is removed. Quote the calls that decided it. Put the verdict
to the developer as a recommendation and wait.

## Record, and remove

On a branch in a worktree of its own (`.claude/framework/workflow.md`, *Branching*), add
the entry to `docs/rule-trials.md` under `## Since <tag>` in the format that file shows,
and run `node .github/scripts/rule-trial.mjs check`.

On `removed`, the same branch deletes the clause from `rules/<file>.md`. Commit, then run
`bash scripts/check-blueprint.sh`, since a guard may cite the clause. The commit body
states what the trial agent was asked, what it did, and the tool, version, operating
system and architecture: the trial is that change's fresh-agent check, so a removal goes
the way any rule change goes.

Then push, open the pull request, run `gh pr merge <N> --auto --squash` with `--subject`
and `--body`, and `node .tropis/scripts/main-status.mjs --pull-request <N>`. Go back to
`/release` only once it reports the main branch green; a skipped trial is recorded and
landed the same way. Remove the worktree and `$T`.

## For the notes

Where a clause was removed, tell `/release` so its Stage 3 names the rule and what it no
longer says, under the closing small-corrections heading.
