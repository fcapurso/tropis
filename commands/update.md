---
description: Bring this project onto the newest framework release, on its own committed branch, or leave it exactly as it was.
---

You are running `/update`. Work through the stages in order. It brings this project to a
newer framework release and commits that on a new branch, or it stops and the project is
as it was. You do the talking. The helper and the two scripts in the fetched clone do
the rest.

If the user named a version (`/update vX.Y.Z`), that is the target. Otherwise the helper
picks the newest release.

**Discard the clone on every path out**, including up to date, a refusal, a failed
check, and an abort. The path is the `clone` field of the helper's JSON. When that
field is null, nothing was fetched. Otherwise run
`node .tropis/scripts/update.mjs discard <clone>` and do not leave the directory behind.

The take and the check must be the copies in that clone:
`node <clone>/scripts/take-version.mjs` and `node <clone>/scripts/check-version.mjs`.
Never the project's installed copies, and never another checkout's.

## Stage 1 — Pre-flight

```bash
git status --porcelain
git branch --show-current
git rev-parse HEAD
```

Stop if `git status --porcelain` prints anything, and say why: an update has to be
undoable, and a dirty tree is not. Remember the current branch as *the starting
point*. When `git branch --show-current` prints nothing, the starting point is the
commit from `git rev-parse HEAD` (the repository is detached). Remember the base name of
the repository's top folder (`git rev-parse --show-toplevel`) as *the folder*.

## Stage 2 — Fetch

```bash
node .tropis/scripts/update.mjs fetch [vX.Y.Z]
```

Pass the version only when the user named one. The helper prints one JSON object on
stdout. Read `source`, `clone`, `held`, `target`, `breaking` and `steps`.

**Exit 2.** No source is recorded. Ask where this project's framework comes from, and
suggest the URL they cloned Tropis from. Run the helper again with
`--source <that url or path>`. Do not invent a source.

**`"target": null`.** Say the project is already up to date, naming `held`. Stop.
Nothing was cloned.

Any other non-zero exit: show the helper's message and stop. If a clone path was
printed, discard it first.

## Stage 3 — Check

```bash
node <clone>/scripts/check-version.mjs .
```

Show the whole report, uncut. Its first line is the verdict: `safe`, `safe with these
steps`, or `not now`.

## Stage 4 — Confirm

Show, before you ask anything:

- `<held>` → `<target>`
- the verdict, in the check's words
- whether the release is breaking (`breaking` from the helper)
- every step from `steps`, grouped by `version`, each marked required or optional
  (`optional: true` is optional; every other step is required)

Then ask, and go on only for the answer named here. Anything else is an abort
(Stage 9). The branch does not exist yet, so aborting here only discards the clone.

- **`safe` or `safe with these steps`:** ask `Update to <target>?` Go on only if the
  user says yes.
- **`not now`:** say plainly that the check advises against the update, and quote the
  report's reason. Go on only if the user explicitly chooses to update anyway.
- **Breaking:** say that it is breaking. The yes has to come after the steps were
  shown. A breaking release still uses the question above; the yes is not valid if
  you asked before showing the steps.

## Stage 5 — Branch and take

```bash
git worktree add ../<the folder>-update-<target> -b update/<target> <the starting point>
cd ../<the folder>-update-<target>
npm --prefix .tropis ci
node <clone>/scripts/take-version.mjs . [--accept-breaking]
```

The update gets a worktree of its own, beside this checkout, so a session working in
this checkout is not moved onto `update/<target>`. **From here on, run every command
in that worktree**; this checkout stays as it was.

If the worktree command fails because `update/<target>` already exists, an earlier
update was left there. Stop, say so, and leave that branch alone; discard the clone.
The user decides whether to finish it, merge it or delete it.

Pass `--accept-breaking` only when `breaking` is true. Show the take's whole report.

If the take exits non-zero, it refused before writing. Abort (Stage 9).

## Stage 6 — Finish what the take left

Do these in order. The take's report is the list: `Next:`, then *Needs a decision*
(`.new` files, files the project removed, files kept because the project changed them).

1. Run `npm --prefix .tropis install` when `Next:` lists that command. Do not run it
   otherwise.
2. **Each `.new` file.** Show the difference between the file and its `.new`. When the
   project's own change is only inside what the new version also changes, propose the
   merge and apply it on yes. Otherwise propose the merged text and ask. Delete the
   `.new` once the merge is applied. A `.new` left in place fails the installed-files
   check, so do not go on to the commit while one remains unless the user has declined
   the merge — then it is unfinished, and Stage 7 will fail.
3. **The entry files.** When *Needs a decision* says `CLAUDE.md` and `AGENTS.md`
   differ, show the lines it lists. Propose the merged `AGENTS.md` and ask. On yes,
   write it and make `CLAUDE.md` the single line `@AGENTS.md`. Until then the
   entry-file check fails, and Stage 7 will fail.
4. **Each file the project removed.** Ask whether it stays removed. The default is
   yes: leave it removed unless the user says to bring it back.
5. **Each file kept because the project changed it.** Leave it. List it at the end
   (Stage 8). Do not overwrite it.
6. **Each required step** from the helper's `steps`. Do it when it is mechanical: a
   command to run, a line to delete, a file to create or to move, with the content and
   the path the step states. When it needs the user's judgement, say what you would do
   and ask. A required step the user declines is not done; report it at the end. Do
   not perform an optional step. Those are printed at the end and left to the user.
7. **The pipeline, when the project does not have one.** When no file in
   `.github/workflows/` has a `uses:` line naming `tropis-pipeline.yml` or
   `project-pipeline.yml`, offer it in the same words as bootstrap's Stage 3b. On yes, write
   `.github/workflows/pipeline.yml` from `.tropis/templates/pipeline-caller.yml`
   and `pipeline/prose.txt` listing `README.md` and `docs/`, so they are committed
   with the update. Then list the steps to adopt it, which are printed at the end
   (Stage 8):
   1. Move each check the project's CI runs today into `pipeline/<stage>.sh`.
   2. List the prose in `pipeline/prose.txt`.
   3. Push a branch, open a pull request, and read the run summary.
   4. Once it is green, delete the old workflows whose work moved.
   On a host other than GitHub (the `origin` URL does not name `github.com`),
   show `node .tropis/scripts/pipeline.mjs commands` instead, and say that those
   are the commands to put in that host's CI.
8. **The gate, when the take's Added list includes
   `.tropis/templates/main-branch-ruleset.json`** and `.tropis/project.json` records no
   `ungated`. From this release the pipeline fails on every run until the project
   chooses, so ask now, as bootstrap's Stage 3b (*The gate*) does: print the command that
   applies the ruleset and the two settings, for the developer to run once this branch
   has merged, or write the reason they give into `.tropis/project.json`, so it is
   committed with the update. Never apply the ruleset yourself.

## Stage 7 — Check again

```bash
npm --prefix .tropis test
```

When it fails, do not commit. Show the failures. Offer to abort (Stage 9) or to leave
the branch as it is for the user to finish, and say what is left: the failing checks,
any required step not done, any `.new` still unmerged. If they leave the branch, still
discard the clone, and leave the worktree in place.

## Stage 8 — Commit

In the worktree, on `update/<target>`, commit everything the update changed.

Subject:

```
chore(framework): take Tropis <target>
```

Body, in this order:

1. What the release brings, in the release notes' own summary words: for each version
   after `held` up to `target`, the paragraph under its `## [x.y.z]` heading in the
   clone's `RELEASES.md`, before the by-hand heading.
2. Which required steps were done, and which were declined.
3. This line, exactly:

```
Fresh-agent check: not run; this installs a released version, checked before its release.
```

The commit touches `.claude/`. The project's commit check will ask for a branch and
for that fresh-agent line. You are on `update/<target>` and the line is in the body,
so the check is satisfied. Do not skip it and do not pass `--no-verify`.

Then discard the clone. Print:

- each optional step, with its version
- any required step not done
- files kept because the project changed them
- the files the take moved, from its *Moved* list: say that the project's settings and
  worktree setup now live under `.tropis/`, where releases before this one kept them in
  `.claude/`
- when the take's Replaced list includes .tropis/templates/readme-skeleton.md and the
  project has docs/readme/skeleton.md: say that the default README skeleton changed in this
  release, and offer to show the difference between the two
- when the take's Replaced list includes `.github/workflows/tropis-pipeline.yml` and the
  project has `.github/workflows/project-pipeline.yml`: say that Tropis's pipeline changed
  in this release, and offer to show the difference between the two
- how to merge, in these words: `Review the branch, then merge
  update/<target> the way this project merges a branch, and remove its worktree,
  ../<the folder>-update-<target>, once it has merged.`

## Stage 9 — Abort

From any stage after the branch exists:

Run these from the checkout Stage 1 ran in, not from the worktree:

```bash
git worktree remove --force ../<the folder>-update-<target>
git branch -D update/<target>
node .tropis/scripts/update.mjs discard <clone>
```

Before the worktree exists, only discard the clone.

Either way, say the project is as it was.
