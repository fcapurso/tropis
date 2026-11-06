# Tropis

Tropis governs a codebase that AI agents do most of the work in. It gives the project a
development workflow, rules that reach an agent at the moment they apply, a routine for
recording what each change taught, and documents that cannot quietly go stale. You set it
up inside your project's own repository, and every session after that starts from it.

## What is Tropis?

Tropis is the word for the ship's keel, in Ancient Greek (τρόπις). A shipwright lays it
first, before a single plank, and everything else is built along it. Once the ship is
afloat you never see it again, but it is what keeps the hull true, and what holds the
boat on its course when the wind pushes it sideways.

Tropis does that job in a project where agents write most of the code. You set it up
first, and from then on every change follows the same line. An idea becomes a backlog
entry. One session writes the plan and another carries it out. A reviewer checks the
result before it merges, and what the change taught is written where the next agent will
meet it. The agents change from one session to the next, and so do the tools they run
in; the keel stays. What you keep is a project that holds its shape: rules in front of
the agent when they apply, documents that cannot quietly go stale, and a record of why
things are the way they are.

## What it does for you

- **Sprints that deliver themselves.** You agree a sprint, and a team of agent sessions
  takes each backlog item from idea to merged change: planned by one session, built by
  another on the cheapest included model that can do it, reviewed and merged, stopping
  only when it needs you.
- **You always know what to do next.** `/next` and a backlog page in your browser show
  what is in flight, ready and blocked, ranked by value over effort.
- **Rules and lessons reach the agent when they apply.** A rule arrives when the agent
  touches its area, and what a change taught is written where the next agent will meet
  it.
- **Records that cannot quietly go stale.** Your project's own checks fail on a backlog,
  plan, document or rule that has drifted from what is true, and in a public project the
  agent reads what it commits for private material.
- **A main branch that takes only checked changes.** One pipeline for every project,
  a host that refuses a merge whose checks have not passed, and agents that see each
  merge through to a green main branch, even with several sessions working at once.
- **Releases you can take safely.** `/update` says whether a release is safe before you
  take it, a release can be checked on staging first, and its notes say briefly what
  changed and in full what you must do.

## Who it is for

A developer running a project where agents write most of the code, and where the
expensive failures are the quiet ones: a convention nobody sees at the moment it applies,
a document describing a subsystem deleted months ago, a rule obeyed in a project whose
assumptions it does not fit.

It does not care what language your project is written in: no check reads a line of your
code.

## What it needs

- **Required on your machine:** `git`, `bash`, `python3` and `node` 20, 22, or 24 or
  later (the test tools that run the checks refuse 18, 21 and 23). They enter none of
  your project's dependencies; why these four is in [`framework/DECISIONS.md`](framework/DECISIONS.md), FW-005.
- **Required: an agent tool** that runs hooks before a command and reads a project
  instruction file. Claude Code and Cursor are supported today.
- **Optional: GitHub.** The pipeline runs there as CI, and the host can refuse a merge
  that has not passed it. On another host, you put the pipeline's commands in its CI
  yourself, and nothing refuses an unchecked merge.
- **Optional: the `gh` command.** The merge steps, `/next`'s look at open pull requests
  and `/flush-upstream` use it; everything else works without it.

## Getting started

1. Clone this repository anywhere outside your project and check out its newest `v…`
   tag. [RELEASES.md](RELEASES.md) says what each release changed.
2. In your project, run **`/bootstrap`**. It installs Tropis, holds a short conversation
   that writes the project brief and first backlog, drafts the project's instruction
   file and first rules for you to confirm, and checks that everything passes.
3. Run `/sprint` to agree your first sprint.

If your tool cannot run `/bootstrap`, follow [bootstrap.md](bootstrap.md) by hand.

## How it works

Everything lives in your project's repository and is committed: rules, commands and hook
settings in `.claude/`, Tropis's own code and checks in `.tropis/`, and the backlog,
designs and plans beside your code.

Each change has a session that shapes a backlog item and writes a self-contained plan, an
agent that carries it out in a worktree of its own, and the planning session again,
which reviews the branch and merges it once the checks pass. You try anything with a
screen before it merges. The cycle is in
[`framework/workflow.md`](framework/workflow.md). Rules are delivered by the area of the
code being touched, in each tool's own way
([`framework/rule-delivery.md`](framework/rule-delivery.md)), and every choice between
real alternatives is recorded in [`framework/DECISIONS.md`](framework/DECISIONS.md).

## Using it day to day

- **Agree a sprint.** **`/sprint`** proposes one from the backlog, ranked by value over
  effort. You add, drop and reorder, and say start. One session per backlog item, or per
  bundle, then shapes, plans, builds, reviews and merges it on its own; `/sprint` again
  shows where each stands.
- **Answer when asked.** A session stops only for a decision that is yours, a check only
  a person can do, or work outside what you agreed. **`/manual-check`** sets out such a
  check and records what you found.
- **Capture ideas as they come.** **`/idea`** adds one to the backlog without refining
  it, and **`/next`** and the backlog page show what is in flight, ready and blocked.
- **One backlog item at a time** is the same path, in a session you start on it.
- **Release and update.** **`/release`** drafts the notes and walks you through staging
  and production, and **`/update`** takes a new Tropis release. Now and then:
  `/refresh-readme`, `/refresh-model-tiers` and `/flush-upstream`.

## Where it stands

- **Working today:** everything above, in Claude Code and Cursor, on your machine or in
  the cloud.
- **Before 1.0.** A release that needs you to do something by hand raises the middle
  number, and its notes say what to do first.
- **Built from two projects, not a theory.** Both share a language, a platform and a
  developer, which limits what that proves;
  [docs/history/PORTABILITY-NOTES.md](docs/history/PORTABILITY-NOTES.md) says what the
  evidence does not cover.
- **Not yet:** running without `node`.

## Where to go next

- [`framework/workflow.md`](framework/workflow.md), the development workflow, and
  [`framework/DECISIONS.md`](framework/DECISIONS.md), why it works the way it does.
- [RELEASES.md](RELEASES.md): what each release changed.
- **Contributing:** [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Licence:** MIT, in [`LICENSE`](LICENSE).
