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

- **An idea becomes a merged change along one path.** It is captured in the backlog,
  shaped, planned by one session, carried out by another, reviewed, and merged.
- **You see what is in flight and what is ready**, in the terminal or on one page in a
  browser.
- **Rules reach the agent when it touches their area**, and your project can change where
  a rule applies or add to it in its own files, which updates never overwrite.
- **What a change taught is recorded where the next agent will meet it**: as a rule, a
  decision, or a suggestion sent back to Tropis.
- **A public repository is checked for private material.** If your project is public,
  the agent is told to read what it commits and pushes for people's names, customers,
  other projects' names or internals, home paths and hostnames, and the same check
  comes back at review and before a release.
- **Every project gets the same pipeline**: checks in a fixed order, each stage filled
  by your own script, and nothing deploys unless every stage passed. An open pull request
  can deploy to an environment of its own.
- **Your README stays current** without every change editing it.
- **You update to a new release with one command**, which first tells you whether it is
  safe to take and why.
- **Release notes say what a release does for the people who take it**, not which commits
  it contains.
- **A release can be rehearsed before it is tagged.** It is tried first on a
  pre-production copy, through the same upgrade production will go through, and
  production then ships exactly the commit that was checked.

## Who it is for

A developer running a project where agents write most of the code, and where the
expensive failures are the quiet ones: a convention nobody sees at the moment it applies,
a document describing a subsystem deleted months ago, a rule obeyed in a project whose
assumptions it does not fit.

It does not care what language your project is written in: no check reads a line of your
code. It does need `git`, `bash`, `python3` and `node` 18.14 or later on your machine,
though they enter none of your project's dependencies, and an agent tool that runs hooks
before a command and reads a project instruction file. Claude Code and Cursor are
supported today. The reasoning, and what you get without `node`, are in
[`framework/DECISIONS.md`](framework/DECISIONS.md) under *Independent of the project's
technology, opinionated about its own*.

## Getting started

1. Clone this repository anywhere outside your project and check out its newest `v…`
   tag. [RELEASES.md](RELEASES.md) says what each release changed; `main` carries the next
   release while it is being built.
2. In your project, run **`/bootstrap`**. It puts Tropis in the project's `.claude/` and
   `.tropis/` folders, then holds a short conversation (`/scope`) that writes the project
   brief and the first backlog, drafts the project's instruction file and first rules for
   you to confirm, fills in the operator guide at `.tropis/README.md`, and checks that
   everything passes.
3. Run `/next` and follow what it suggests to your first plan.

If your tool cannot run `/bootstrap`, or you want to see what it does, follow
[bootstrap.md](bootstrap.md) by hand.

## How it works

Everything lives in your project's repository and is committed: rules, commands and hook
settings in `.claude/`, Tropis's own code and checks in `.tropis/`, and the backlog,
designs and plans beside your code. A fresh clone is a working copy.

Three roles share each change. A specifying session writes a plan that carries everything
its executor needs. An executing agent carries it out in its own worktree and opens a pull
request. A developer tries the result before it merges. The cycle is in
[`framework/workflow.md`](framework/workflow.md), and handing a plan over in
[`framework/dispatch.md`](framework/dispatch.md).

Rules are delivered by the area of the code being touched: Claude Code loads a rule when
the agent first touches a file in its area, and Cursor attaches a copy generated for it
when the agent reads one. [`framework/rule-delivery.md`](framework/rule-delivery.md) says
what each tool gets. Checks under `.tropis/` catch documents and rules that have drifted
from what is true, and each check is shown to fail on a sample project with faults planted
in it. Your project's checks and deploys run through one pipeline whose stages Tropis
fixes and your scripts fill, described in the operator guide your project gets at
`.tropis/README.md`. Every choice between real alternatives is recorded, with its reasons, in
[`framework/DECISIONS.md`](framework/DECISIONS.md).

## Using it day to day

- **`/next`** reports what is in flight, ready and blocked. `npm --prefix .tropis run
  board` writes the backlog as one page to open in a browser, and `/refresh-board` walks
  you through grouping it.
- **`/idea`** adds an entry to the backlog; **`/feature`** moves it along
  `idea → shaped → building → shipped`. An entry can also be parked on purpose.
- **`/dispatch`** prints the prompt that hands a plan to an executing agent, and
  **`/manual-check`** writes down a check only a person can do and records how it went.
- **`/capture-learning`** decides where a lesson belongs: a rule, a decision, or a
  suggestion for Tropis itself, which **`/flush-upstream`** later sends as pull requests
  under a name you choose, so a private project's own name never appears in them.
- **`/refresh-readme`** brings the README up to date; **`/release`** drafts release notes
  if your project ships versions; **`/refresh-model-tiers`** updates which AI model
  `/dispatch` suggests for each kind of plan.
- **`node .tropis/scripts/pipeline.mjs run <stage>`** runs one pipeline stage on your
  machine the way CI runs it.
- **`/update`** takes a new Tropis release on its own branch, after telling you whether it
  is safe to take. A project that does not have `/update` yet takes a release from a
  Tropis clone checked out at its tag, with `node scripts/check-version.mjs <project>` to
  see whether it is safe, then `node scripts/take-version.mjs <project>`. A `<path>.new`
  file left behind means you had changed that file: merge the two and delete the `.new`.

## Where it stands

- **Working today:** setup in a project's own repository, the plan-and-review cycle,
  rule delivery in Claude Code and Cursor, the backlog report and board, versioned
  releases with an update command and an optional rehearsal before each one, a README
  kept current, and one pipeline for every project with an optional environment per pull
  request. Tropis is developed with
  its own last release installed.
- **Before 1.0.** A release that needs you to do something by hand raises the middle
  number, and its notes say what to do first.
- **Built from two projects, not a theory.** The layer grew in one real project and was
  ported to a second; this repository is what survived the port. Both projects share a
  language, a platform and a developer, which limits what that proves.
  [PORTABILITY-NOTES.md](PORTABILITY-NOTES.md) records what was kept, what was left
  behind, and what the evidence does not cover.
- **The pipeline runs as CI on GitHub only.** On another host, setup prints the commands
  to put in that host's CI yourself.
- **Not yet:** running without `node`, and parking a lesson instead of turning it into a
  rule, are in the backlog and set aside for now.

## Where to go next

- [`framework/workflow.md`](framework/workflow.md): the development workflow.
- [`framework/DECISIONS.md`](framework/DECISIONS.md): why Tropis works the way it does.
- [`framework/doc-architecture.md`](framework/doc-architecture.md): how documents are kept
  from going stale.
- [RELEASES.md](RELEASES.md): what each release changed.
- [bootstrap.md](bootstrap.md): setting a project up by hand.
- **Contributing:** a project sends its suggestions back with `/flush-upstream`, one pull
  request per suggestion and under the name it chooses, the same way for a project's
  maintainer or a contributor with a fork.
- **Licence:** MIT, in [`LICENSE`](LICENSE).
