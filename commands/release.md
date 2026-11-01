---
description: Draft the release notes, guide deploy to staging and promote to production, and print each trigger. Does not run them.
---

You are running `/release`. A release is two steps: **step 1, deploy to staging** — every
stage runs on one commit of the main branch, staging is put back on production's version,
that commit is deployed there, and the developer checks it by hand — and **step 2,
promote to production** — the project's promote pipeline tags a commit the main branch
holds and deploys the tag to production. A project whose `pipeline/staging/` is empty
has only step 2. This command drafts the notes, carries the developer through both
steps, and picks up where the last run stopped. **You never run a trigger, deploy, or
tag** — the person releasing starts each step, after reading what you drafted.

**Where to start.** Read `## [Unreleased]` in the notes file and the version sections
below it before anything else:

- It ends with `Checked on staging: (after staging)`, or with the line an earlier
  release of this command wrote,
  `Checked on the release candidate: (after the candidate)`:
  the notes are drafted and committed. Go to *Resume at staging*.
- The newest version's section ends with `Checked on staging: yes`, or the earlier
  `Checked on the release candidate: yes`, and `git tag --list v<version>` prints
  nothing: the promotion has merged and nothing is tagged yet. Go to *Step 2*, with
  `<commit>` the commit on `origin/main` that last changed the notes file
  (`git log -1 --format=%H origin/main -- <notes file>`), and `<staged>` the staged
  commit read as *Resume at staging* says. Where the section instead ends with
  `Checked on staging: no — this project does not deploy to staging` and no tag names
  it, go to *Step 2* the same way, with no `<staged>`.
- Otherwise start at Stage 1.

**Delete this command if the project does not ship versioned releases.**

<!-- project-owned: begin — this project's release. -->
<!-- Fill in each line:
     - Run from: the root of this repository, where the backlog also lives.
     - Notes file: RELEASES.md at the root (from templates/RELEASES.md), with an
       `## [Unreleased]` section /release promotes.
     - Readers: who the notes are for, in their words — e.g. "administrators and the
       people who use the product".
     - Breaking: what forces a major version beyond a breaking commit — e.g. a change to
       the permissions or network access the product asks for, which its users must
       approve again.
     - Version files: each file that carries the version, and where in it — e.g.
       package.json's version field.
     - Promote trigger: the command that starts the project's promote pipeline, with
       <commit> and, where the project deploys to staging, <staged> — e.g.
       gh workflow run promote.yml --ref main -f commit=<commit> -f staged=<staged>.
     - Staging trigger: where the project deploys to staging, the command that starts
       it, with <commit> — e.g. gh workflow run staging.yml --ref main -f commit=<commit>.
     - Staging workflow: the file name of that workflow — e.g. staging.yml.
     - Where the run is watched: the URL of the pipeline's runs.
     A block filled before this release may still say Trigger and Candidate trigger:
     read them as Promote trigger and Staging trigger. Where Version files or Staging
     workflow is missing, ask the developer, and suggest adding the line here. -->
<!-- project-owned: end -->

## Stage 1 — Pre-flight

```bash
git status --porcelain
git fetch origin
git log HEAD..origin/main --oneline
git log origin/main..HEAD --oneline
git branch --show-current
```

Stop if the tree is dirty, if either log prints anything, or if the branch is not `main`:
the release is cut from exactly what the remote has. List any open pull requests against
`main` and ask whether to continue without them.

```bash
node .tropis/scripts/pipeline.mjs staging slot
```

Stop on exit 1 and show its message: it names a missing script, or a layout an earlier
release used and the command that moves it. Remember whether it printed `filled` or
`empty`.

## Stage 1b — The README

Only after pre-flight has passed, so `main` is clean and equal to `origin/main`. Read
`docs/readme/readme.yaml`. At `manual`, skip this stage. Otherwise — `writes`, `suggests`,
no file, or a level that is none of these — run `/refresh-readme` as its command says.

If it committed a refreshed README, push it (`git push origin main`). Where the main
branch is gated (workflow.md, *Branching*), move that commit to a branch instead, open a
pull request, run `gh pr merge <N> --auto --squash`, then
`node .tropis/scripts/main-status.mjs --pull-request <N>`, and go on only once it
reports the main branch green; on any other line, show it and stop.
Pre-flight found nothing else unpushed, so the push carries only that commit.

If the refresh stopped before it could judge the page, say why. If the README is still
behind — at `writes` the developer said no, or otherwise it reported sections behind — list
those sections. In either case ask whether to release anyway. On no, stop. On yes, go on,
and remember what is behind for Stage 4.

## Stage 2 — Scope

```bash
git tag --list 'v*' --merged HEAD --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1 | grep . || echo "NO_PREVIOUS_TAG"
```

The last release is the highest tag of the form `vX.Y.Z` that this commit contains. Any
other tag, such as `v1.1.0-rc.1`, is not a release, and the window runs from the last
release however many such tags came after it.

**No previous tag:** every commit is in scope and the proposed bump is **major** — the
first release. Say so; the developer can still change it. Skip the catalog join; Stage 3
says what a first release covers.

**Otherwise** list the window and classify it: a breaking commit (`feat!:`,
`BREAKING CHANGE:`) → major; `feat:` → minor; anything else → patch. Then look at the
diff for whatever the project names as breaking above, and if it is there, propose
**major** whatever the commits say.

Then map the window onto the backlog. Squash commits are meant to carry an
`Implements: <id>` line:

```bash
git log <last-tag>..HEAD --format='%h|%s|%(trailers:key=Implements,valueonly)'
```

A commit with ids in the last field points at its entries. A commit without them is the
residue, read from its subject and body. **Nothing enforces that line, so assume some
squashes lack it:** match a residue subject against the titles of shipped entries before
calling it uncatalogued. Do both halves — the backlog says what a change means, the log
says what actually landed in the window, and neither alone is enough.

## Stage 3 — Draft the notes

**In a public project** — one whose `.claude/project.json` says `"public": true` — first
read the release window's diff for private material: people's names other than public
authorship, customers or their sites, another project's name or internals, home paths,
hostnames or computer names, email addresses, and anything copied from a private source.

```bash
git diff <last-tag>..HEAD
```

With no previous tag the window is the whole repository: read every file `git ls-files`
names. List each finding with its file and line, and ask whether to release anyway. On
no, stop with nothing drafted. This is a backstop: the material has been public since it
was pushed, and the commit and push hook asked for the same reading then. It matters at
a release because a release copies its files into every project that takes it. When the
project is not public, or nothing is found, list nothing and ask nothing; go straight on.

Read the notes file. The notes are for the readers named above, and the test for every
line is whether one of them, who never saw the work, can tell from it what the release
does for them and what they must do. Never a list of commit subjects.

**Decide what goes in: draft from the backlog, then check against the log.** For each
entry Stage 2 found, read its `title` and `value`: most say what someone can now do;
turn any written as a defect ("Today X is broken…") into what is now true. Keep an entry
only if it changes what a reader can do or see — the `layer` field is not that test: an
entry about how the product is built or released changes nothing for them. Then go
through the residue and add what each commit changed for a reader, if anything. Where
the log and the backlog disagree about what shipped, the log decides *whether* and the
backlog *what it means* — say which you found.

**Then write it in this shape:**

1. **A summary of two or three sentences** under the `## [Unreleased]` heading: what
   this release does for the reader, in their words.
2. **What they must do by hand comes next, before the changes**, under its own
   heading — every breaking change, and any change that alters a default they may want
   back. Number the steps. Start a step a project may skip with "Optional:" inside its
   bold lead, as in **3. Optional: refresh your model picks.**, and leave every other
   step unmarked: /update does each unmarked step, or asks the user about it. Leave the
   heading out when there is nothing to do.
   Each says in one sentence why it is needed, then exactly what to do and where, in the
   reader's terms: the file to open, the command to run, the line to delete. A reader
   who reads only this section updates safely.
3. **One section per change that matters to them**, its heading saying what they get —
   "Hooks warn only when they should", not the mechanism that achieves it. The body
   says what is different for them, and only then, if they need it, how.
4. **Small fixes as one-line bullets** under a closing heading such as "Smaller
   corrections". A fix that needs a paragraph to explain is not small.

While writing:

- **Spell out every term a reader would need this project's internals to understand**,
  or replace it with plain words. A name from the backlog, a process step or an internal
  mechanism is not the reader's vocabulary.
- **Leave out a change that changes nothing for them**, even one an earlier draft
  carried, and say in Stage 4 that you dropped it.
- **Do not label each section breaking or not.** Everything a reader must act on is
  under step 2, so they find it all there. Whether the release is breaking is Stage 2's
  call, not the notes'.
- **Check every path and command the notes name against where the reader actually has
  it**, which may not be where it sits in this repository. The notes give the reader's
  path.

**A first release** has no window: the notes describe the product as it stands, from
every shipped entry that passes the test above, in the shape above, with no by-hand
section unless there is something to do.

If `## [Unreleased]` already has content other than its placeholder, it was most likely
written change by change as each landed, in the voice of whoever built it. Keep its facts,
fill the gaps, and rewrite the whole section to the shape above; otherwise replace
the placeholder. End the draft with the line
`Checked on staging: no — this project does not deploy to staging` when the slot is
empty, and `Checked on staging: (after staging)` when it is filled; once the check on
staging has passed, the promotion pull request replaces that with
`Checked on staging: yes`. That line is the developer's record, not part of the notes:
it stays as the last line of the version's section, and the promote pipeline leaves it
out of anything it publishes.

## Stage 4 — Confirm

Work out the version: take the last release from Stage 2 and apply the bump by semantic
versioning — from 1.0, major raises the first number, minor the second, patch the third;
below 1.0 a breaking change raises the middle number and anything else the last. With no
previous release there is nothing to count from: ask the developer for the first version.

Print, before any further tool call:

```
Last version: <current version, or none>
Bump: <patch|minor|major>
Version: <current> → <next>
Commits in scope: <count> since <last tag, or the first commit>
Breaking: yes / no / n/a — first release
Dropped: <each change left out of the notes, and why — or none>
README: <refreshed · up to date · behind, released anyway: <sections or why it could not run> · not kept by Tropis>
Staging: step 1, then promote · none — pipeline/staging/ is empty, promote only

Draft notes:
─────────────────────────────────────
<the full [Unreleased] body>
─────────────────────────────────────
```

Ask the developer to confirm or adjust the bump, the version and the notes. Stop and
wait. Do not treat silence as confirmation. Loop until they confirm.

## Stage 5 — Commit the notes

Stop if `(ask)` is still in the draft: the section is promoted as written, and a
placeholder would become the permanent record.

The main branch is gated unless `.claude/project.json` records `"ungated"` (workflow.md,
*Branching*). Where it is gated, every commit below goes on a branch in a worktree of
its own —
`git worktree add ../<repo>-release-<version> -b release/<version> origin/main` — is
pushed, gets a pull request, `gh pr merge <N> --auto --squash` with the commit's subject
and body, then `node .tropis/scripts/main-status.mjs --pull-request <N>`; go on only once
it reports the main branch green, and on any other line show it and stop. The commit
the next step names is then the one the merge made on `main`
(`gh pr view <N> --json mergeCommit -q .mergeCommit.oid`). Remove the worktree after.
Where it is not gated, commit on `main` and push.

**Empty slot — one commit, then step 2.** Set the version in every version file;
replace `## [Unreleased]` and its body with a fresh `## [Unreleased]` holding
`_Nothing yet._`, above `## [<version>] — <date>` holding the confirmed draft, its last
line `Checked on staging: no — this project does not deploy to staging`. Commit with
`chore(release): <version>`. Stop if the commit would touch any file other than the
notes file and the version files. Then go to *Step 2*, with `<commit>` the commit that
landed on `main` and no `<staged>`.

**Filled slot — the notes alone, then step 1.** Replace the body of `## [Unreleased]`
with the confirmed draft, keeping the heading, its last line
`Checked on staging: (after staging)`. Stop if the commit would include any file other
than the notes file. Commit with `docs(release): draft notes for the next release` and
a body line `Bump: <bump>`. Then go to *Step 1*, with `<commit>` the commit that landed
on `main`.

## Step 1 — Deploy to staging

Print:

```
Step 1 of 2 — deploy to staging
<the staging trigger, with the full hash of <commit>>
Watch it at: <where the run is watched>
```

Ask the developer to say when they have started it, and wait: silence is not a yes. If
they say a run for this commit has already finished, find that one instead.

**Find the run:**

```bash
gh run list --workflow <staging workflow> --event workflow_dispatch --limit 20 --json databaseId,displayTitle,status,conclusion,url,createdAt
```

The run is the one whose `displayTitle` contains the full hash. Where none does — a
caller without `run-name` — take the newest run created after the developer said they
started it, and say that is how it was found.

**Wait for it:** `gh run watch <id> --exit-status`. Where the tool stops long commands,
run it in the background, or run it again: each run waits for the same run.

**Read it:** `gh run view <id> --log`, and report its `### Deploy to staging` block —
the commit, the reset, the deploy, and the **By hand** list, numbered.

**A failed run** — `gh run watch` exits non-zero, or the block says something failed:
add an entry to `docs/verification-log.md` for this commit, its *Change* line
``staging deploy at `<short hash>` ``, *Result* `fail — <what the summary says failed>`,
naming the run's URL. The notes stay. Say that once a fix has merged, `/release` starts
step 1 again for the new head of the main branch. Stop.

## Stage 6 — The check on staging

In the same sitting, draft and record the check with the developer by following
`/manual-check`'s stages: it decides the kind, drafts the steps, writes the entry as
`pending` before anything is run, waits for the developer, and records what they found.
The check runs on staging. The entry's *Change* line reads
``staging deploy at `<short hash>` ``. The run's *By hand* list comes first in the
steps: what must be upgraded or approved before anything else can be judged.

On `fail`, the entry records it; stop as for a failed run. On `pass`, go to Stage 7.

## Resume at staging

1. `git status --porcelain` must print nothing, then `git fetch origin`.
2. Find the newest entry in `docs/verification-log.md` whose *Change* line names
   `staging deploy at`, or `release candidate at` as an earlier release of this command
   wrote it. Read its short hash — the staged commit; resolve it to the full hash with
   `git rev-parse <short hash>^{commit}` — and its latest round's *Result*.
3. No such entry: go to *Step 1*, with `<commit>` the commit on `origin/main` that last
   changed the notes file (`git log -1 --format=%H origin/main -- <notes file>`).
4. `pending`: the check was started and not finished. Resume Stage 6 on that entry.
5. `fail`: say what it reported. The notes stay. Go to *Step 1* with `<commit>` the head
   of `origin/main`, once the developer says the fix has merged.
6. `pass`: go to Stage 7, with `<staged>` that full hash.

## Stage 7 — The promotion pull request

Read the bump from the newest `Bump:` line in `git log <staged> --format=%b`, work out
the version as Stage 4 does, and ask the developer to confirm it; wait.

**First, compare with the staged commit:**

```bash
git diff --name-only <staged> origin/main
```

If it names anything but the notes file and the version files, something merged after
staging was checked, and production would get code nobody checked. Say which paths, do
not prepare the pull request, and go to *Step 1* with `<commit>` the head of
`origin/main`: staging must be deployed and checked again. Production waits.

**Otherwise**, where the main branch is gated, in a worktree of its own:

```bash
git worktree add ../<repo>-release-<version> -b release/<version> origin/main
```

There, set the version in every version file; replace `## [Unreleased]` and its body
with a fresh `## [Unreleased]` holding `_Nothing yet._`, above `## [<version>] — <date>`
holding that body, with its last line replaced by `Checked on staging: yes`. Commit with
`chore(release): <version>`, then check again:

```bash
git diff --name-only <staged> HEAD
```

If it names anything but the notes file and the version files, refuse: something merged
since staging was checked. Say so, remove the worktree and the branch, and go to
*Step 1* with `<commit>` the head of `origin/main`.

Then push, open the pull request, run `gh pr merge <N> --auto --squash` with that
subject, then `node .tropis/scripts/main-status.mjs --pull-request <N>`, and go on only
once it reports the main branch green; on any other line, show it and stop. Remove the
worktree. Where the main branch is not gated, make the same commit on `main`, run the
same check, and push.

## Step 2 — Promote to production

Print:

```
Step 2 of 2 — promote to production
<the promote trigger, with <commit> and, where the project deploys to staging, <staged>>
Watch it at: <where the run is watched>
```

`<commit>` is the full hash of the commit the promotion put on `main` —
`gh pr view <N> --json mergeCommit -q .mergeCommit.oid`, or the pushed commit — and
`<staged>` the staged commit's full hash. Say what the promote pipeline does: it runs
`node .tropis/scripts/pipeline.mjs promote check` first and stops on a refusal, tags
`<commit>`, pushes only the tag, and deploys the tag to production. Anything merged
after `<commit>` waits for the next release. Stop.

Both steps are the developer's to start: an agent must not run a trigger. The promote
pipeline is the project's own; what it must do is stated in the workflow's release
section.
