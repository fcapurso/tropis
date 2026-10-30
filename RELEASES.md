# Releases

What changed in each release, for the people who set up and run projects with this
framework — not for whoever wrote it. `/release` drafts the next section; the release
job promotes it under a version heading when it runs.

A release is breaking when a project taking it must act by hand: a file in `.claude/`
or `.framework/` moved, renamed or removed; a command removed or renamed; a hook entry
in `settings.json` changed; a block the project fills in changed shape; a rule's
`paths:` header changed so the project's own paths need revisiting; or the
pipeline's stages changed order or the deploy gate decides differently.

For the full development history, see the git log.

---

## [Unreleased]

The backlog now comes in one order. Entries sit in four bands, from *do now* to *leave
it*, and are ranked inside each band by what they are worth against what they cost.
Refreshing the board proposes merging, bundling or closing entries that overlap or are
already done. Agents are also told to say where the code they write came from.

### After updating: what to do by hand

**1. Re-band your backlog.** The bands have changed meaning, and every row now needs a
value and an effort score, so `/next` misreads your existing bands until they are judged
again. C used to mean "cheap win, batch it" and now means "decide first"; D used to mean
"decide, don't build" and now means "leave it"; E is gone. If your project has
`docs/backlog-board/bands.yaml`, run `/refresh-board` and answer what it asks. It
re-judges every row under the new bands and writes the scores. A project without that
file has nothing to do.

### You see what to do next, in one order

Each entry on the board and in `/next` now carries a value score and an effort score
from 1 to 5, each with a one-line reason you can argue with. Inside a band, entries are
listed by value divided by effort. Each of the four bands says what qualifies: A do now,
B do next, C decide first, D leave it.

`/next` suggests only from A and B, and lists C as needing a decision. When a blocked
entry would outrank its suggestion, it says so and names what blocks it. An entry waiting
on another keeps its own band, with a marker naming what it waits on. Shipped, replaced
and shelved entries move to a collapsed *Closed* section at the bottom of the board.

### Refreshing the board tidies the backlog

`/refresh-board` now compares each entry it banded or re-scored with the rest of the open
backlog. It proposes one of four things: merging entries that overlap, flagging two that
cannot both be done, bundling entries better done together, or closing one that is
already done. `/refresh-board groom` does this across the whole backlog. Nothing changes
without your yes. Entries in one bundle are tagged together on the board, and `/next`
names the rest of a bundle beside its suggestion.

### Agents say where their code came from

The workflow now tells agents that a pointer at a working example is a place to look, not
something to copy. They study it, write your project's own version using your project's
own names, and say which source they worked from: in the plan, the handover or their
reply. An agent cannot check its own output for where it came from, so that statement is
the only record you get. In a closed-source product, it is what keeps out code copied
from an open-source project, along with the licence terms that come with it.

### What your pipeline scripts must do for themselves

A newly set-up project's operator guide now says this. An update never changes your guide
at `.tropis/README.md`, so here it is.

Each pipeline stage starts from a shallow checkout of the commit, with no submodules and
no record of the base branch. Only the framework stage has `.tropis/` installed. A stage
script that reads git history, or needs submodules or your product's dependencies, must
fetch and install them itself.

If you rehearse releases in `pipeline/candidate/`, your `reset.sh` and `deploy.sh` must
handle three things Tropis does not:

- **Stored data that can only grow.** Deploy the production tag's code with the
  candidate's data schema.
- **Submodules.** The tag's files arrive without them, so fetch each one over the
  candidate's address, at the commit the tag pins.
- **A new major version.** It may need approving or upgrading. Do that in the scripts, or
  add a line to `TROPIS_BY_HAND`.

### Smaller corrections

- The workflow requires a fresh agent to check any change to the framework itself. If you
  run that check on your own machine and your personal instructions already say what the
  change says, run it where they do not load, such as a cloud session, and say so in the
  commit.
- `/flush-upstream` writes framework paths without backticks in wording it proposes, so
  the proposal no longer fails Tropis's check that every backticked path exists.

Checked on the release candidate: no — no candidate was rehearsed

## [0.5.2] — 2026-10-29

A project whose files add up to more than 1 MiB, which is any real project, can now
rehearse a release before it is tagged. Tropis no longer updates a project that still
keeps the framework in `.framework/`; projects in `.tropis/` have nothing to do.

### Rehearsing a release works on a real project

Until now the rehearsal stopped at once with `candidate: could not read the production
tag` whenever the files of your last release added up to more than 1 MiB, before
`pipeline/candidate/reset.sh` ran. It now reads a release of any size and goes on to put
your pre-production environment back on that version. If your rehearsal failed this way,
run it again after updating.

### A project in `.framework/` must be set up again

Tropis used to move a project from the old `.framework/` folder into `.tropis/` when it
updated. It no longer does: setting up and updating refuse such a project and say to
remove the folder and set the project up again. If your framework lives in `.tropis/`,
nothing changes for you.

Checked on the release candidate: no — no candidate was rehearsed

## [0.5.1] — 2026-10-28

Tropis's own checks now run on Jest 30. The lockfile Tropis installs in your project
no longer carries an outdated package whose npm notice named its author's email
address, so a scan of your repository for private material no longer reports it.

### After updating: what to do by hand

**1. Reinstall the framework's test tools.** The tools Tropis's checks run on have
changed, so `.tropis/package-lock.json` and `.tropis/node_modules` are out of date
until you reinstall them. From your project's root, run `npm --prefix .tropis install`,
then commit the new `.tropis/package-lock.json`.

### Tropis's checks need Node 18.14 or later

Jest 30 does not run on older Node releases. If `node --version` prints anything
below 18.14, upgrade Node before you run `npm --prefix .tropis test`. Your project's
own tests, and whichever Jest version they use, are not affected.

Checked on the release candidate: no — no candidate was rehearsed

## [0.5.0] — 2026-10-28

Tropis is now licensed under MIT. This release keeps your project's private details
out of what it publishes: a public project is warned to read what it commits and
pushes, suggestions go back to Tropis under a name you choose, and records of where a
check ran name the platform rather than your computer. You can also rehearse a release
before it is tagged, and your entry instructions now live in one file.

### After updating: what to do by hand

**1. Merge your entry instructions into `AGENTS.md`, if the update says they differ.**
Claude Code and Cursor should read the same instructions, so `CLAUDE.md` is now the
single line `@AGENTS.md`. The update makes that change itself when the two files are
identical; when they differ it changes neither and lists the lines that differ. Move
anything only `CLAUDE.md` has into `AGENTS.md`, then replace the whole of `CLAUDE.md`
with the line `@AGENTS.md`. Until you do, the installed checks fail and name
`CLAUDE.md`.

**2. If your repository is public, say so.** The new check for private material speaks
only in a project that declares itself public. Create `.claude/project.json` holding
`{ "public": true }` and commit it. A private repository leaves this out.

**3. Optional: rehearse each release on a candidate.** Fill
`pipeline/candidate/` with `reset.sh` and `deploy.sh`, copy
`.tropis/templates/candidate-caller.yml` to
`.github/workflows/candidate.yml`, and make your release pipeline take the
candidate's commit, as the workflow's release section says. Add `<commit>` to
the release trigger and fill in the candidate trigger in `/release`'s own
block. Read how the two scripts work in `.tropis/README.md` under
*The pipeline*.

### A public project is warned before private material leaves it

In a project that declares itself public, the agent is told at every `git commit` and
`git push` to read what is going out for people's names, customers or their sites,
another project's name or internals, home paths and hostnames, and to ask you before
going on if it finds any. Each plan's review record now says whether its diff was
checked, and `/release` lists anything that looks private in the release window before
it drafts the notes. A private project is told nothing new.

### Your suggestions to Tropis go out under a name you choose

`/flush-upstream` names every branch and pull request it opens after a name you choose,
never your project's folder, repository or product. The first time you flush, it asks
for the name, tells you it will be public, and records it as `Flushes as: <name>.` at
the top of `docs/BLUEPRINT-UPSTREAM.md`. Without that line it opens nothing.

### Each release can be rehearsed first

You can try a release on the pre-production environment before it is tagged.
The rehearsal runs every check on the commit that carries the notes, puts that
environment back on the version production is running, deploys this commit
there, and lists anything you must upgrade or approve by hand. It sets no
version and makes no tag. Once you have checked that environment, the release
tags a commit one step above it whose code is the same. If you leave the two
scripts out, the release runs as before and the notes say that no candidate
was rehearsed.

### Smaller corrections

- Records of where a check ran, in plans, review records and commit bodies, name the
  tool, its version, the operating system and the architecture, never the computer.
- Only a tag of the form `vX.Y.Z` counts as a release: a test tag such as
  `v1.1.0-rc.1` is never taken for the version production runs, and `/release` counts
  changes from the last real release.
- An update no longer adds your export-ignore lines a second time, and new ones match
  only at your repository's root, so a file such as a `CLAUDE.md` in a subfolder stays
  in exported copies. To keep one of Tropis's paths in your exports, add it once to
  `.gitattributes` with `-export-ignore`; no update excludes it again.
- An update run in a worktree or a renamed folder keeps the framework package's name
  instead of taking the folder's.
- The pipeline's GitHub workflows use the Node 24 releases of `actions/checkout` and
  `actions/setup-node`.

Checked on the release candidate: no

## [0.4.2] — 2026-10-25

Your project's checks and deploys can now run through one pipeline that Tropis
gives every project: the stages come in a fixed order, your own scripts say what
each one runs, and nothing deploys unless every stage passed. An open pull
request can also deploy to an environment of its own, and `/refresh-model-tiers`
now ranks models only on scores that were measured the same way.

### After updating: what to do by hand

**1. Add the pipeline.** Your project has none until you add it, and `/update`
asks you first; a no is fine, and nothing else depends on it. If no file in
`.github/workflows/` has a `uses:` line naming `tropis-pipeline.yml` or
`project-pipeline.yml`, write `.github/workflows/pipeline.yml` from
`.tropis/templates/pipeline-caller.yml`, and `pipeline/prose.txt` holding the
two lines `README.md` and `docs/`. Then adopt it: move each check your CI runs
today into `pipeline/<stage>.sh`; list your prose files in `pipeline/prose.txt`;
push a branch, open a pull request and read the run summary; once it is green,
delete the old workflows whose work moved. On a host other than GitHub, run
`node .tropis/scripts/pipeline.mjs commands` instead: it prints the commands to
put in that host's CI.

**2. Optional: give each pull request its own environment.** Only if your
platform can create environments cheaply. Add `pipeline/branch/create.sh`,
`pipeline/branch/deploy.sh` and `pipeline/branch/remove.sh`, add `closed` to the
`pull_request` types in `.github/workflows/pipeline.yml`, and read how the
scripts and the environment's name work in `.tropis/README.md` under
*The pipeline*.

### One pipeline for every project

Every project now runs the same stages, in this order: framework checks, sanity
checks, unit and seam tests, integration tests, end-to-end tests, then deploy.
You fill a stage by adding `pipeline/<stage>.sh`; a stage you have not filled is
empty and passes. A change that touches only prose and Tropis's own files runs
the framework checks alone. Nothing deploys unless every stage passed or was
empty, and a cancelled run never deploys. Each run ends with a summary naming
every stage as run, empty or skipped, and why a deploy was held.

You can run any stage on your machine exactly as CI runs it, with
`node .tropis/scripts/pipeline.mjs run <stage>`. On GitHub the stages run as
separate jobs, the four test stages side by side. Tropis replaces its copy of
the pipeline on every update; if you want to change the pipeline itself, copy
`.github/workflows/tropis-pipeline.yml` to
`.github/workflows/project-pipeline.yml`, point `.github/workflows/pipeline.yml`
at it, and `/update` tells you whenever Tropis's version changes.

From now on, a release that changes the order of the stages or when a deploy is
allowed counts as one you must act on by hand.

### Each pull request can have its own environment

With the three scripts from step 2 in place, a branch with an open pull request
gets an environment named after it. It is created when the pull request opens,
deployed to on every push whose stages all passed, and removed when the pull
request closes, merged or not. A push to your main branch still deploys to the
one shared environment, and a branch with no pull request gets none. Deploys to
one environment never overlap: a waiting deploy is replaced by a newer one. To
work out a branch's environment name or deploy a branch by hand, see
`.tropis/README.md` under *The pipeline*.

### Model picks compare only like with like

`/refresh-model-tiers` now ranks one model above another only on scores measured
the same way — the same benchmark version, harness and effort setting, in a
period when the benchmark did not change — and takes every figure from its
primary source. Benchmarks your tools publish themselves, such as Cursor's
CursorBench, now count as evidence, marked as published by the tool's own maker.
A model with no comparable score is still listed, marked unconfirmed, so nothing
your tool offers is missing when you dispatch. Prices are gone from the picks:
how fast a model uses up a plan's limits is not published in a form you can
compare across tools, so that choice is yours when you dispatch. Where a shared
benchmark reports how many tokens each model uses per task, the picks show it.
Your current picks keep working; run `/refresh-model-tiers` to have them placed
the new way.

### Smaller corrections

- When an agent is asked to merge a pull request on a host that requires no
  check, it now waits for the checks to finish rather than turning on
  auto-merge, which would merge at once.

Checked on the release candidate: no

## [0.4.1] — 2026-10-21

Your project's README can now stay up to date without anyone remembering to
edit it: Tropis rewrites it as a whole page when you ask, tells you when it has
fallen behind, and brings it up to date before each release. From the next
release on, you also update a project by typing `/update`.

### After updating: what to do by hand

**1. Take this release the old way.** A project gets `/update` only by taking
this release. In a Tropis clone, check out this release's tag and run
`node scripts/take-version.mjs <project>`, where `<project>` is the path to your
project.

**2. Let your README be committed straight to main.** Without this, the warning
an agent sees when it commits says a refreshed README belongs on a branch. Open
`.tropis/hooks/framework-commit-check.sh`, find `may_go_to_main` in the block
marked as yours, and add `README\.md$|` right after `RELEASES\.md$|`.

**3. Choose how much Tropis does with your README.** Until you choose,
Tropis only reports what is behind and never changes the page. Run
`/refresh-readme writes`, `/refresh-readme suggests` or `/refresh-readme manual`,
explained under the next heading.

### Keep your README current with /refresh-readme

`/refresh-readme` brings your README up to date as a whole page, section by
section, against a list of the sections it should have. Tropis ships that list;
you can keep your own copy in `docs/readme/skeleton.md`, which updates never
touch, and `/update` tells you when Tropis's default changes. You choose how much
it does:

- `writes`: it rewrites the sections that are behind, shows you each one with
  the reason, and commits only when you say yes.
- `suggests`: it only reports what is behind. Choose this if you write your
  README yourself.
- `manual`: Tropis stays out of your README entirely.

Plans no longer edit the README a change at a time. The one exception is a plan
that removes or renames something the README names: it corrects that mention
and nothing else.

### You hear when your README has fallen behind

Unless you chose `manual`, `/next` and the backlog board say when the README was
last brought up to date and name the features shipped since. They say nothing
when nothing has shipped.

### /release brings your README up to date first

Unless you chose `manual`, `/release` runs `/refresh-readme` before it drafts
the notes. If the README is still behind, because you said no to the rewrite or
Tropis only reports, it names the sections that are behind and asks whether to
release anyway.

### Update with one command: /update

From the next release on, type `/update` in your project. It fetches the newest
Tropis release from where your project's copy came from and shows whether taking
it is safe. On your yes it takes the release on a new branch `update/<version>`,
does the by-hand steps the notes do not mark optional, and commits. Optional
steps are listed at the end for you. Say no, or decline a release it advises
against, and your project stays as it was. The first time, it asks where your
copy of Tropis came from.

If your project ships its own releases, `/release` now starts a by-hand step a
project may skip with "Optional:", so `/update` knows which steps to leave to
the person.

### Smaller corrections

- The backlog board's closing notes no longer include a paragraph about another
  project's backlog; they now say only what holds for any project.

Checked on the release candidate: no

## [0.4.0] — 2026-10-20

This release makes the framework quieter and more accurate: hooks stop warning about
commands you are not running, an update tells you about every file it skips, and the
model choices you make for your project survive updates. A few changes need a few
minutes of your time after updating; they come first.

### After updating: what to do by hand

**1. Run `/refresh-model-tiers` once.** Your project's choice of which AI model to use for
each kind of plan used to live in `.claude/framework/model-tiers.md`, a file every update
replaces, so your choices could be overwritten. They now live in `docs/model-picks.md`,
which updates never touch. Until you run the command, `/dispatch` prints its prompts
without suggesting a model and reminds you to run it. If you had edited `model-tiers.md`
yourself, the update leaves the new version beside it as `model-tiers.md.new`: copy your
model table, its `Last verified` date and any notes into `docs/model-picks.md`, then
replace `model-tiers.md` with the `.new` file.

**2. Check two commands you fill in.** `/manual-check` and `/release` each have a section
your project fills in with its own details. The markers around those sections changed, so
filling one in no longer leaves a stray half-comment behind. Open
`.claude/commands/manual-check.md` and `.claude/commands/release.md` and look at each
section. If you never filled one in, a leftover line ending in `-->` may sit just under
the new marker; delete it.

**3. If you want agents to keep leaving AI-tool credit out of commits, say so.** The
framework no longer tells agents to remove lines such as "Co-Authored-By" or "Generated
with" from commits and pull requests. To keep them out, add a line to your project's
`CLAUDE.md`, for example: "Never add Co-Authored-By or generated-with lines to commits or
pull requests."

**4. If you wrote project details into a framework document, move them.** If you edited
`.claude/framework/commit-format.md` or `.claude/framework/workflow.md` to add your
commit scopes, whether anything stops a push to `main`, or which optional workflow
sections you keep, the update leaves a `.new` copy beside the file. Move your text to
your project's `CLAUDE.md`, then replace the file with its `.new` copy.

### Hooks warn only when they should

The warnings that appear when an agent commits or merges no longer go off just because a
command mentions `git commit` or `gh pr merge`, for example in a search or inside a
commit message. They now react only when that command is actually being run.

When an agent commits straight to `main`, the warning now covers everything your workflow
says belongs on a branch, including commands and your own code, not just rules and
framework documents. What may still go straight to `main` is a list you control at the
top of `.tropis/hooks/framework-commit-check.sh`. Out of the box it is the backlog,
`RELEASES.md` and anything under `docs/`.

If you write your own hooks, the script that decides whether a command is really being
run is available to them as `.tropis/hooks/command-at-position.py`.

### Updates tell you about every file they skip

If you deleted a file the framework ships, an update now lists it under *Needs a
decision* every time, so you can decide whether you still want it gone. Before, the
update skipped it without a word unless that file had changed in the new release.

If you update with `--from` (because your project has no record of which version it
installed), any shipped file you are missing is now added and listed under *Added*,
instead of quietly skipped. Delete any you do not want afterwards.

### Your own setup steps for new worktrees

If a plan's separate working copy needs more than the framework's own install before its
tests can run, such as fetching a submodule or installing your project's dependencies,
list every command in order, one per line, in `.claude/worktree-setup.txt`, including
`npm --prefix .tropis ci`. The prompt `/dispatch` prints then tells the agent to run your
commands instead of only the framework's install. Without the file nothing changes, and
updates never touch it.

### Crediting the AI tool in commits is now your choice

The framework no longer tells agents to remove lines such as "Co-Authored-By" or
"Generated with" from commits and pull requests, so each project decides. To keep the old
behaviour, see step 3 above.

### Text you write about your project goes in your CLAUDE.md

The commit format and workflow documents used to ask you to write some project details
into them: your list of commit scopes, whether anything stops a push to `main`, and which
optional workflow sections you keep. Every update replaces those documents, so writing in
them made the framework's installed-files check fail and left a `.new` copy at the next
update. Both documents now ask you to write those details in your project's own
`CLAUDE.md`. If you had written in them, see step 4 above.

### Fewer small findings clutter the backlog

Agents are now told when a finding from a review or check does not need its own backlog
entry: an improvement the next agent would make anyway, or a minor bug that normal work
would catch. They note in one line why they dropped it. A bug that would fail without
anyone noticing is still always recorded. `/idea` and `/capture-learning` apply this
before adding an entry for something an agent found itself.

### Suggestions you send back to the framework are grouped by purpose

The list where your project collects improvements to send back to the framework (the
upstream queue) now groups changes that only make sense together under one dated entry,
as indented parts. Changes that merely share a topic stay separate. `/capture-learning`
checks the list first and adds a related change to its existing entry, `/flush-upstream`
shows you whole entries and opens one pull request for each, and `/next` reports the
count as "entries" rather than "lessons".

### `/release` drafts notes your readers can act on

If your project uses `/release`, it now drafts notes in the shape of these: a short
summary, then what readers must do by hand after updating, then one section per change
saying what they get, with small fixes as one-line bullets. It explains your project's
internal terms in plain words, leaves out changes that make no difference to your readers
and tells you which it left out, and checks that every file path it names is where your
readers actually have that file. Notes that built up in `[Unreleased]` as changes
landed are rewritten to that shape, not only added to.

### Smaller corrections

- `/dispatch` no longer asks a plan to list rule files the rules command never creates.
- The planning rule now uses the same words for a plan's working copy, "execute here",
  that `/dispatch` requires, so plans written from the rule no longer get refused.
- The `CLAUDE.md` template now describes correctly how Claude Code and Cursor each load
  area rules.
- `/feature` explains how to park an entry without changing its status.

Checked on the release candidate: no

## [0.3.1] — 2026-10-16

### The backlog on one page

`npm --prefix .tropis run board` writes every open backlog entry to one page to open in
a browser, grouped by bands the project keeps. `/refresh-board` walks through banding
and refreshing it. With bands written, `/next` suggests by those bands; with none
written, `/next` is unchanged. This is not a breaking change. A project taking this
release copies `.tropis/templates/backlog-bands.yaml` to `docs/backlog-board/bands.yaml`
before banding.

### A project can ask whether to update

Before taking a release, `node scripts/check-version.mjs <project>` from a Tropis
checkout at that tag tells the project whether taking it is safe, safe with these
steps, or not now, and why. It writes nothing in the project: it takes the release in a
scratch copy and runs the project's checks there. A release that changes the
framework's package file needs the network to check. If the project's checks already
fail before the update, the answer is not now as well, so get them passing first. This
is not a breaking change.

Checked on the release candidate: no

## [0.3.0] — 2026-10-16

### Commands a project fills in no longer count as edited

- **Breaking.** The project-specific lines of `/next`, `/idea` and `/feature` now sit in
  project-owned blocks, with defaults that work in a set-up project: `/next` runs
  `npm --prefix .tropis run next`, and `/idea` and `/feature` run the project's checks
  (`npm --prefix .tropis test`) instead of asking for a catalog-document generator the
  setup never installs.
- A project that had replaced the placeholders gets a `.new` for each of those commands
  on this update. Merge by taking the `.new` and putting your own line inside the block,
  then delete the `.new`.
- A project that had left those commands as shipped gets them replaced, with no `.new`.
- From then on, changes inside the block survive updates and keep the checks green.

Checked on the release candidate: no

## [0.2.0] — 2026-10-16

### The framework moves to `.tropis/`

- **Breaking.** A project on `v0.1.0`, or on an install from `main` that still holds the
  framework in `.framework/`, takes this release to move it.
- Check out this release in your Tropis clone and run
  `node scripts/take-version.mjs <project> --from v0.1.0 --accept-breaking`. An install
  that already has a record needs no `--from`.
- Fix each file the command lists as still naming `.framework/`, starting with
  `CLAUDE.md` and `AGENTS.md`.
- Where it names `.claude/rule-additions/<n>.md.old`, move the lines you added into
  `.claude/rule-additions/<n>.md` and delete the `.old` file.
- Run `npm --prefix .tropis install` and `npm --prefix .tropis test`, then commit.

### A project can take a new version

- Check out the release tag in a Tropis clone and run
  `node scripts/take-version.mjs <project>` from it. The project must have no
  uncommitted changes, and the command never commits. A file you had changed is
  left in place and the new text is written beside it as `<path>.new`: merge
  that into the file and delete it. Your own hook entries and other settings in
  `.claude/settings.json` are kept. A breaking release asks for
  `--accept-breaking` after you read its notes.
- `npm --prefix .tropis test` now also fails when a framework file was edited after it
  was installed, naming the file. Put a project's own change in a project-owned block,
  a rule additions file or a file of its own.
- Not breaking. This is the first release with the command.

### A shipped rule's area is yours to change

- The text of each shipped rule is in `.tropis/rules/` and its area — the files it
  governs — is in `.claude/rule-areas.json`, which is yours. Change an area there, run
  `npm --prefix .tropis run rules`, and the Claude Code and Cursor files are written.
  Your own rules stay in `.claude/rules/` with their own `paths:` header.
  `npm --prefix .tropis run rules -- --check` and the project's checks fail while a
  generated file is out of date or was edited by hand.
- The command is `rules`; `rules:cursor` is gone. Cursor files are now written in the form
  measured to reach a Cursor agent.
- Part of the breaking move above: a `v0.1.0` project's areas are read from its rules'
  `paths:` headers, so an area you widened is kept.

### A project can add to a shipped rule

- Write `.claude/rule-additions/<name>.md` — plain text, no header, named after the
  shipped rule — then run `npm --prefix .tropis run rules`. The additions follow the
  shipped text in the one Claude Code file and the one Cursor file, and win where they
  contradict. Never edit the shipped text in `.tropis/rules/` or a generated file.
  Additions to a framework document go in the project's own `CLAUDE.md`.
- Not breaking. A project without an additions file gets the same generated files as
  before.

### A flush reaches the framework as pull requests

- `/flush-upstream` now puts each queued line to you, flush, hold or decline, and opens
  one pull request per line against the framework — on its repository if you can push
  there, otherwise on your fork. A capability arrives shaped, with its value and
  criteria written with you in the sitting. It needs `gh` signed in.
- Not breaking.

### The framework is called Tropis

- The framework now has a name: Tropis, the Ancient Greek word for a ship's keel. The
  README says why. Its repository is `https://github.com/fcapurso/tropis`; the old
  address redirects there.
- A project's `.tropis/README.md` may name the old address; it keeps working.

### Correction to 0.1.0's notes

- `npm --prefix .framework test` runs three checks in a set-up project: that every
  backlog entry has its required fields, that every rule has a `paths:` header, and that
  the framework is where the setup put it. The 0.1.0 notes said it also checks plans and
  their review records; it does not yet.

Checked on the release candidate: no

## [0.1.0] — 2026-10-15

The first release: the framework as it stands.

### Setting a project up

- `scripts/set-up-project.sh` sets the framework up inside your project's own
  repository: rules, commands and hook wiring in `.claude/`, the framework's code and
  checks in `.framework/`, the backlog at the root. All of it is committed, so a clone or
  a worktree is a working copy, and an exported copy of your project carries none of it.
- `/bootstrap` runs the setup, then a shaping conversation that writes the project
  brief, the first backlog entries, the entry file and the first rules.

### Working with it

- In Claude Code each rule loads when the agent first touches a file in its area. Cursor
  receives the workflow and a generated copy of the rules, but no area rule reaches a
  Cursor agent yet.
- `/idea`, `/feature` and `/next` keep the backlog; `/dispatch` hands a plan to an agent
  working in its own worktree; `/capture-learning` routes what a change taught;
  `/release` drafts release notes and never releases.
- `npm --prefix .framework test` runs checks that fail when the backlog, the rules, the
  plans and their review records stop agreeing.

### What you need

- `git`, `bash`, `python3` and `node` on your machine, and Claude Code or Cursor.

Checked on the release candidate: no

---
