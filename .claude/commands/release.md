---
description: Draft the release notes, record whether the candidate was checked, commit them, and print the trigger. Does not release.
---

You are running `/release`. Work through the stages in order. If `## [Unreleased]`
already ends with `Checked on the release candidate: (after the candidate)`, the notes
are drafted and a candidate was started: go to Stage 7. It drafts and records; the
project's release pipeline does everything irreversible, after the developer runs the
trigger this prints. **You never run the trigger, deploy, or tag** — the person
releasing does that, after reading what you drafted.

**Delete this command if the project does not ship versioned releases.**

<!-- project-owned: begin — this project's release. -->
- Run from: the root of this repository, where the backlog also lives.
- Notes file: `RELEASES.md` at the root, with an `## [Unreleased]` section the release
  job promotes.
- Readers: people who set up and run projects with the framework.
- Breaking: as `RELEASES.md` defines it — a project taking the release must act by hand.
  Below 1.0 the release job raises the middle number only for `bump=major`, and `minor`
  raises the last one: so a breaking release is `bump=major` until 1.0.
- Trigger: `gh workflow run ci.yml --ref main -f bump=<bump>`
- Where the run is watched: https://github.com/fcapurso/tropis/actions/workflows/ci.yml
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
node .tropis/scripts/pipeline.mjs candidate slot
```

Stop on exit 1 and show its message. Remember whether it printed `filled` or `empty`.

## Stage 1b — The README

Only after pre-flight has passed, so `main` is clean and equal to `origin/main`. Read
`docs/readme/readme.yaml`. At `manual`, skip this stage. Otherwise — `writes`, `suggests`,
no file, or a level that is none of these — run `/refresh-readme` as its command says.

If it committed a refreshed README, push it (`git push origin main`). Pre-flight found
nothing else unpushed, so the push carries only that commit.

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
`Checked on the release candidate: no — no candidate was rehearsed` when the slot is
empty, and `Checked on the release candidate: (after the candidate)` when it is filled.
That line is the developer's record, not part of the notes: it stays as the last line of
the version's section, and the pipeline leaves it out of anything it publishes.

## Stage 4 — Confirm

Print, before any further tool call:

```
Last version: <current version>
Proposed bump: <patch|minor|major> (the pipeline computes the number)
Commits in scope: <count> since <last tag, or the first commit>
Breaking: yes / no / n/a — first release
Dropped: <each change left out of the notes, and why — or none>
README: <refreshed · up to date · behind, released anyway: <sections or why it could not run> · not kept by Tropis>
Candidate: rehearsed before the release · none — pipeline/candidate/ is empty

Draft notes:
─────────────────────────────────────
<the full [Unreleased] body>
─────────────────────────────────────
```

Ask the developer to confirm or adjust the bump and the notes. Stop and wait. Do not
treat silence as confirmation. Loop until they confirm.

## Stage 5 — Commit the notes, nothing else

Replace the body of `## [Unreleased]` with the confirmed draft, keeping the heading.
Stop if the commit would include any file other than the notes file, or if `(ask)` is
still in it — the pipeline promotes the section as written, and a placeholder would
become the permanent record. Commit with
`docs(release): draft notes for the next release`, a body line `Bump: <bump>`, and push.

## Stage 6 — Print the next trigger. Do not run it.

**Empty slot.** Print the release trigger named above with the confirmed bump, and
where the run is watched.

**Filled slot.** Print the candidate trigger named above with the full hash of the
commit Stage 5 pushed, and where the run is watched. Then say what comes next, as
numbered steps for the developer:

1. Read the run's summary and do anything it lists under *By hand*.
2. Run `/manual-check` on the pre-production environment. The entry's *Change* line
   reads `release candidate at `<short hash>``.
3. Run `/release` again.

Stop.

Either way, an agent must not run a trigger.

The pipeline that step starts is the project's own. What it must do is stated in the
workflow's release section.

## Stage 7 — After the candidate

1. `git status --porcelain` must print nothing, then `git fetch origin`.
2. Find the newest entry in `docs/verification-log.md` whose *Change* line names
   `release candidate at`, and read its hash and its latest round's *Result*.
3. No such entry, or `pending`: say the candidate has not been checked, print the
   `/manual-check` step again, and stop.
4. `fail`: say what the check reported. The notes stay. Once a fix has merged, print
   the candidate trigger for the head of `origin/main`, and the same next steps as
   Stage 6. Stop.
5. `pass`: read the bump from the newest `Bump:` line in
   `git log <hash> --format=%b`, ask the developer to confirm or adjust it, and wait.
   Then print the release trigger with that bump and the candidate's full hash, where
   the run is watched, and that the release step writes
   `Checked on the release candidate: yes` in the version's section. An agent must not
   run it.
