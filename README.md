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
- **You see what to do next**, in the terminal or on one page in a browser. Product
  work and work on how the project is run are two streams, each with its own next step:
  dispatch the plan that is waiting, or write one. The backlog sits in four bands, from
  *do now* to *leave it*, ranked inside each by value over effort; nothing open drops out
  of sight, and refreshing it proposes merging, bundling or closing entries that overlap,
  belong together or are already done.
- **The backlog page is always current.** It rebuilds itself after every commit, pull,
  branch switch and rebase, and is never committed, so two changes to the backlog never
  conflict over it.
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
  can deploy to an environment of its own, and a branch named like a permanent
  environment is refused rather than deployed over it.
- **Your main branch takes only checked changes.** Tropis ships a GitHub ruleset that
  makes the host refuse a pull request whose checks failed or have not finished, and the
  pipeline fails until the project applies it or records why it will not.
- **Work handed to the host to merge is seen through.** An agent that sets a pull
  request to merge itself stays until it has merged and the main branch is green, or
  says why not.
- **A red main branch is noticed.** If the main branch fails its checks after a merge,
  the session that merged is told and stops, and anyone starting work next hears it
  first: `/next` and starting a plan both open by saying so.
- **Two sessions can work in one project at once.** Every branch is created in a
  worktree of its own, so one session can never move another's branch or land a commit
  on it.
- **Your project's own checks hold its records true.** They fail on a backlog that breaks
  its own rules, a page that points nowhere or is past its verified date, a merged plan
  with no review record or with its entry left unshipped, and a rule whose claim about
  the code has stopped being true.
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
code.

## What it needs

- **Required on your machine:** `git`, `bash`, `python3` and `node` 18.14 or later. They
  run Tropis's hooks and checks, and enter none of your project's dependencies. Why these
  four, and what you get without `node`, is in
  [`framework/DECISIONS.md`](framework/DECISIONS.md) under *Independent of the project's
  technology, opinionated about its own*.
- **Required: an agent tool** that runs hooks before a command and reads a project
  instruction file. Claude Code and Cursor are supported today.
- **Optional: GitHub.** The pipeline runs there as CI, and the host can refuse a merge
  that has not passed it. On another host, setup prints the pipeline's commands for you to
  put in that host's CI, and the project records why its main branch is not gated.
- **Optional: the `gh` command.** The merge steps, `/next`'s look at open pull requests
  and `/flush-upstream` use it; everything else works without it.

## Getting started

1. Clone this repository anywhere outside your project and check out its newest `v…`
   tag. [RELEASES.md](RELEASES.md) says what each release changed; `main` carries the next
   release while it is being built.
2. In your project, run **`/bootstrap`**. It puts Tropis in the project's `.claude/` and
   `.tropis/` folders, then holds a short conversation (`/scope`) that writes the project
   brief and the first backlog, drafts the project's instruction file and first rules for
   you to confirm, fills in the operator guide at `.tropis/README.md`, asks whether the
   host should refuse unchecked merges, and checks that everything passes.
3. Run `/next` and follow what it suggests to your first plan.

If your tool cannot run `/bootstrap`, or you want to see what it does, follow
[bootstrap.md](bootstrap.md) by hand.

## How it works

Everything lives in your project's repository and is committed: rules, commands and hook
settings in `.claude/`, Tropis's own code and checks in `.tropis/`, and the backlog,
designs and plans beside your code. A fresh clone is a working copy.

Three roles share each change. A specifying session writes a plan that carries everything
its executor needs. An executing agent carries it out and opens a pull request. Every branch,
whoever creates it, lives in a worktree of its own beside the project's checkout. A developer tries the result before it merges. The cycle is in
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

- **`/next`** says first whether the main branch's last pipeline run failed, then
  reports what is in flight, ready and blocked for product work and for framework work,
  suggests what to take next in each, and says when it is time to run
  `/flush-upstream`.
- **`docs/backlog-board/index.html`** is the backlog as one page to open in a browser.
  It keeps itself current; `npm --prefix .tropis run board` rebuilds it at once after an
  edit you have not committed. `/refresh-board` walks you through banding and scoring new
  entries and proposes tidy-ups for you to accept or decline; `/refresh-board groom`
  looks across the whole backlog.
- **`/idea`** adds an entry to the backlog; **`/feature`** moves it along
  `idea → shaped → building → shipped`. An entry can also be parked on purpose, or
  dropped when nobody will do it, and the board then shows it as closed.
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
  kept current, one pipeline for every project with an optional environment per pull
  request, and a main branch gated by its host, whose red is reported to whoever merged
  and whoever starts next. Tropis is developed with its own last release installed.
- **Before 1.0.** A release that needs you to do something by hand raises the middle
  number, and its notes say what to do first.
- **Built from two projects, not a theory.** The layer grew in one real project and was
  ported to a second; this repository is what survived the port. Both projects share a
  language, a platform and a developer, which limits what that proves.
  [docs/history/PORTABILITY-NOTES.md](docs/history/PORTABILITY-NOTES.md) records what was kept, what was left
  behind, and what the evidence does not cover.
- **Not yet:** running without `node`, and parking a lesson instead of turning it into a
  rule, are in the backlog and set aside for now.

## Where to go next

- [`framework/workflow.md`](framework/workflow.md): the development workflow.
- [`framework/DECISIONS.md`](framework/DECISIONS.md): why Tropis works the way it does.
- [`framework/doc-architecture.md`](framework/doc-architecture.md): how documents are kept
  from going stale.
- [RELEASES.md](RELEASES.md): what each release changed.
- [bootstrap.md](bootstrap.md): setting a project up by hand.
- **Contributing:** a project sends its suggestions back as pull requests with
  `/flush-upstream`; [`CONTRIBUTING.md`](CONTRIBUTING.md) says how that works and how to
  change the framework directly.
- **Licence:** MIT, in [`LICENSE`](LICENSE).
