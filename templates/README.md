# {{PROJECT_NAME}} — working with the framework

This project is developed with Tropis, the agent-project framework, set up inside this
repository: rules, commands and hook wiring in `.claude/`, the framework's code and
checks in `.tropis/`, the backlog in `feature-catalog.yaml`, specs and plans in
`docs/superpowers/`. All of it is committed, so a clone is a working copy.

## Setting up a working copy

    npm --prefix .tropis ci

On a project just set up, before `.tropis/package-lock.json` is committed, run
`npm --prefix .tropis install` instead, as setup's closing message says, and commit the
lock it writes.

A plan's worktree needs the same before its suite can run, and the prompt `/dispatch`
prints says so for each worktree a plan creates. When this project needs more than the
line above — a submodule, its own dependency install, a second tools package — write
every command, in order and one per line, in `.claude/worktree-setup.txt`, the line above
included: the file replaces it rather than adding to it. Lines starting with `#` are
comments. An update never touches the file.

**If the repository is or will be public**, say so in `.claude/project.json`, holding
`{ "public": true }`. Setup asks and writes it; a project that goes public later writes
the same file. Then the agent is told at every `git commit` and `git push` to read what
is going out for private material — people's names, customers, another project's name or
internals, home paths, hostnames — and to ask you before going on if it finds any; a
review record's *Found* opens with a `Public exposure:` line; and `/release` lists
anything private in the release window before drafting the notes. Without the file, or
with anything but `true`, none of this happens. An update never touches the file.

## What to type

    npm --prefix .tropis run next

`/next` is a report. It does not start the next command. `npm --prefix .tropis run board` writes one page of the open backlog to open in a browser; `/refresh-board` walks through banding and refreshing it; with bands written, `/next` suggests by band, and by value over effort inside one. Before merging a change to
`.claude/` or `.tropis/`, run the framework's checks:

    npm --prefix .tropis test

## Where the framework lives

This project was set up from the framework at `{{BLUEPRINT_URL}}`. General adoption,
the development cycle, and maintenance after setup are documented there — start at
its README, not by copying those pages into this repository.

Before taking a release, `node scripts/check-version.mjs <project>` from your Tropis clone at that tag says whether it is safe, safe with these steps, or not now — not now means do not take it yet and look at the failing checks it names — and it changes nothing in the project.

To take a newer release, check out its tag in your Tropis clone and run
`node scripts/take-version.mjs <project>` from it. The project must have no uncommitted
changes, and the command never commits. A `<path>.new` file means you had changed that
file: merge it into the file beside it and delete it; until you do, the installed-files
check fails. Your own hook entries and other settings in `.claude/settings.json` are
kept. Lines in `.gitignore` and `.gitattributes` are added only when missing, whether you
wrote yours with a leading slash or without one. To keep one of the framework's paths in
exported copies, such as `docs/readme/`, add a line such as
`/docs/readme/ -export-ignore` to `.gitattributes`, and no update excludes it again. A
breaking release asks for `--accept-breaking` after you read its notes. A
project set up before versions were recorded passes `--from` and the version it holds.
The framework's README has the details.

## The pipeline

Checks and deploys run through one pipeline. The stages, in order, are framework
checks, sanity checks, unit and seam tests, integration tests, end-to-end tests,
and deploy. Unit and seam tests run in-process with no outside service.
Integration tests talk to something real outside the code.

You own `pipeline/` at the project root. `pipeline/<stage>.sh` fills a stage, and
`pipeline/prose.txt` lists the files you count as prose, one pattern per line. A
stage with no script is empty and passes. Run one locally with
`node .tropis/scripts/pipeline.mjs run <stage>`. The run summary says what each
stage did, including why a deploy was held or skipped.

Each stage starts from a shallow checkout of the commit, with no submodules and no ref
for the base branch. The framework stage has `.tropis/` installed; the other stages have
nothing installed. A stage script that reads git history, such as a file as it stands on
the main branch, fetches that history first; one that needs submodules or the product's
dependencies fetches and installs them first.

To give each open pull request an environment of its own, fill
`pipeline/branch/` with `create.sh`, `deploy.sh` and `remove.sh`. Each receives
`TROPIS_ENVIRONMENT`, the environment's name, and `TROPIS_BRANCH`, the branch.
`create.sh` and `remove.sh` must succeed when run again, because the environment
may already exist or may already be gone. The name is the branch in lower case,
with anything that is not a letter or digit turned into hyphens, a `b-` prefix
when it would not start with a letter, and a short hash of the original name
when it would be longer than 24 characters. Work the name out with
`node .tropis/scripts/pipeline.mjs environment <branch>`, and deploy the branch
you are on by creating its environment, then deploying to it:
`node .tropis/scripts/pipeline.mjs branch create "$(git branch --show-current)"`,
then the same with `branch deploy`. Create is safe to run again.
Removing the environment when the pull request closes needs `closed` listed in
the `pull_request` types of `.github/workflows/pipeline.yml`.

A branch whose environment would be a permanent one is refused: `branch create`,
`branch deploy` and `branch remove` stop before running any script in
`pipeline/branch/`, so a pull request from a branch called `production` can neither
deploy over that environment nor remove it when it closes. List your permanent
environments in `pipeline/branch/permanent.txt`, one name per line; blank lines and
lines starting with `#` are ignored. The list is compared with the environment's
name, not the branch's, so `Production` is refused too. The file replaces the
default list of `production`, `staging` and `development`, so an empty file refuses
nothing.

`deploy.sh` may find no environment to deploy to: `create.sh` failed, or the pull
request was closed while the run was going and its environment was removed. It must
not create one there, because nothing would remove it; it should fail, saying to
close and reopen the pull request, which creates the environment again.

To rehearse a release before it is tagged, fill `pipeline/candidate/` with
`reset.sh` and `deploy.sh`. `reset.sh` puts the pre-production environment back
on the version production runs. It receives `TROPIS_PRODUCTION_TAG`, that
version's tag, and `TROPIS_PRODUCTION_DIR`, a temporary directory of that tag's
files. Only a tag of the form `vX.Y.Z`, such as `v1.4.0`, counts as a release; a
tag such as `v1.5.0-rc.1` is not one. The version is the highest release tag. With no
such tag there is no release yet, and `reset.sh` is not run. `deploy.sh` deploys
the candidate. It receives `TROPIS_CANDIDATE`, the candidate's full commit hash,
and `TROPIS_BY_HAND`, the path of an empty file. Append one line for each thing
someone must upgrade or approve by hand; an empty file means nothing. Copy
`.tropis/templates/candidate-caller.yml` to `.github/workflows/candidate.yml`.
`/release` then prints the trigger that starts the rehearsal. The project's
release pipeline must take the candidate's commit, as the workflow's release
section says.

Three things the reset meets that nothing here handles for you. A stored-data schema
that may only grow: the pre-production environment holds every attribute the main branch
has had, production's tag can lack some, and a platform may refuse a deploy that drops
one, so deploy the tag's code with the candidate's schema. Submodules:
`TROPIS_PRODUCTION_DIR` holds the tag's files without them, and an old tag's
`.gitmodules` may name an address the runner cannot reach, so fetch each one over the
candidate's address at the commit the tag pins. A new major version: a non-interactive
deploy may need approving, and an installed site may stay on the old major version until
upgraded, so approve and upgrade the pre-production install in the scripts, or append a
line to `TROPIS_BY_HAND`.

On GitHub the host can refuse a pull request whose checks have not passed. Tropis ships
the settings in `.tropis/templates/main-branch-ruleset.json`: the main branch takes
changes only through a pull request, needs no approval, requires the check
`pipeline / gate` on a branch up to date with it, refuses force pushes and deletion, and
lets nobody bypass it. Apply it with
`gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json`,
and turn on *Allow auto-merge* and *Automatically delete head branches* under Settings →
General → Pull Requests. If you renamed the job in `pipeline.yml` or the gate, apply a
copy with the check's name changed. The pipeline's `host` job fails on every run until
the main branch requires a pull request and a check and auto-merge is allowed, or until
`.claude/project.json` says why not, as `"ungated": "<the reason>"` — a private
repository on GitHub's free plan cannot have rulesets, for one; the run summary then
carries the reason. Only rulesets are read: a classic branch protection rule does not
count. A release pipeline that pushes to the main branch cannot run behind the gate,
because nothing bypasses it; such a project records why it is ungated for now.

Tropis ships the pipeline and replaces its copy on update. To own the pipeline,
copy `.github/workflows/tropis-pipeline.yml` to
`.github/workflows/project-pipeline.yml` and point
`.github/workflows/pipeline.yml` at that copy. Tropis keeps installing its own
file, and an update tells you when that file changed.

Commands you will type here: `/idea`, `/feature`, `/next`, `/refresh-board`, `/refresh-readme`, `/dispatch`,
`/capture-learning`, `/refresh-model-tiers`.
