# A project updates to a new framework version with one slash command — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** someone running a project types `/update` inside it and ends up on the newest
framework release, on a committed branch, with every step the release requires done —
or with nothing changed, if the release is not safe or they abort. Today taking a
release means cloning Tropis, checking out the tag, running two scripts from there with
the right flags, then reading the release notes for what to do by hand.

**Spec:** the entry `project-updates-with-one-slash-command` in `feature-catalog.yaml`.
Read its ten criteria and the comment above it. There is no separate design document;
the design is under *Decisions*.

**Why, in the developer's words (2026-10-20):** "I want a command that goes through all
the steps … so the user can safely update with one slash command and after it they're
ready to use the new version, or the update does not go through in case it is not safe
and he decides to abort it. If the user should run any *optional* steps afterwards …
this is printed at the end and left to the user. But if these steps are required to be
able to use the updated framework, they must either be executed or at least proposed to
the user (in case a judgement call from them is strictly required)." Asked where the
result should land, they chose: on a new branch, committed.

**What the specifying session verified on 2026-10-20, against `main` at the commit that
adds this plan:**

- `scripts/take-version.mjs` brings a project to the version of the Tropis checkout it
  runs from. It refuses unless that checkout is exactly on a tag
  (`git describe --tags --exact-match HEAD`, around line 449), refuses a dirty project,
  refuses a breaking release without `--accept-breaking` (the `breaking` function near
  line 102; refusal text near line 507), never commits, regenerates the rules itself
  (`generate-rules.mjs`, near line 667), and writes `.tropis/installed.json` with
  `recordOf(next, target)` (near line 678). Its report lists `Replaced`, `Added`,
  `Deleted, no longer shipped`, `Needs a decision` (`.new` files, files the project
  removed, files kept because the project changed them), then `Next:` — which includes
  `npm --prefix .tropis install` when the framework's package file changed.
- `scripts/check-version.mjs` takes the release in a scratch copy, runs the project's
  checks there, writes nothing in the project, and prints a first line
  `check-version: <project> holds <held>; taking <target> is <verdict>.` where the
  verdict is `safe`, `safe with these steps` or `not now`, then sections (`Why not now`,
  `Steps`, …). Neither script is installed into projects.
- `.tropis/installed.json` holds `{ "version", "files" }` only (`recordOf` in
  `scripts/installed-files.js`, line 161). Nothing records where the framework came
  from. `scripts/set-up-project.sh` writes it at line 107 with
  `node "$PROJECT/.tropis/scripts/record-installed.mjs" "$version"`, `$BP` being the Tropis
  checkout it runs from. `recordProblems` reads only `record.files`, so an extra key is
  ignored by the installed-files check.
- Scripts installed into a project are listed in `scripts/installed-scripts.txt`;
  commands are every `commands/*.md` (setup line 55).
- The Tropis repository on GitHub is private, so fetching it must use the user's own git
  access — a plain `git clone` does.
- `commands/release.md` Stage 3 now asks for numbered by-hand steps under their own
  heading (merged in `be6e552`); nothing marks a step optional. The 0.4.0 notes, under
  `### After updating: what to do by hand`, have four bold-numbered steps:
  `**1. Run …**` and so on.
- `guards/release.test.js` asserts phrases of `commands/release.md` Stage 3, with
  whitespace collapsed.
- `framework/DECISIONS.md` ends at FW-022.

**Model tier: Medium.** The design is decided and the script and its behaviour are
specified; the command's prose and the end-to-end probe need judgement within that.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 7 (record which).

**Merge authority: parent review.** The command is shipped to every project, and the
probe's result needs reading by the session that wrote the criteria.

Do not store a kick-off prompt on this plan.

---

## Delivers

project-updates-with-one-slash-command

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-update-command -b plan/project-updates-with-one-slash-command` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They hold the installed release. `/update` reaches this repository when
  it takes the release that ships it.
- **Never push a tag, and never create a tag in this repository or its worktree.** Task 7
  creates tags only in a scratch clone outside any repository.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-20. Do not reopen them.

1. **Where the release comes from: recorded at install.** `recordOf(root, version,
   source)` gains an optional third argument and writes `source` between `version` and
   `files` when given. The source is the Tropis checkout's `git remote get-url origin`,
   or its absolute path when it has no `origin`. `set-up-project.sh` passes it to
   `record-installed.mjs` as a second argument; `take-version.mjs` records its own
   checkout's source the same way. Since `/update` takes the release from a clone of the
   source, its `origin` is the source, and every update keeps the record right. A project
   with no `source` (every project today) is asked once by `/update`; the take then
   records it.

2. **One installed helper, `.tropis/scripts/update.mjs`, with two subcommands.** The
   slash command does the conversation; the helper does what can be tested.

   - `node .tropis/scripts/update.mjs fetch [vX.Y.Z] [--source <git url or path>]`
     - Reads `.tropis/installed.json`: `version` (the held version) and `source`.
       `--source` overrides; with neither, exit 2 and print
       `update: no source recorded. Run again with --source <where Tropis comes from>.`
     - Lists the source's tags with `git ls-remote --tags --refs <source>`, keeps those
       matching `vX.Y.Z`, and picks the highest, or the one named. A named version that
       does not exist: exit 1, saying so. A target not newer than the held version:
       exit 0 with `"target": null` and nothing fetched.
     - Clones the whole repository (not shallow: `take-version.mjs` needs the tag and
       may need history) into a new directory `mkdtemp(join(tmpdir(), 'tropis-update-'))`
       and checks out the tag.
     - Reads the clone's `RELEASES.md`. For every `## [x.y.z] — date` section with
       held < x.y.z ≤ target, it takes the subsection whose heading starts
       `### After updating`, and in it each step: a paragraph that starts with `**<n>. `.
       A step is optional when its bold lead starts `**<n>. Optional:`; every other step
       is required. Nothing found means no steps for that version.
     - Prints one JSON object to stdout:
       `{ "source", "clone", "held", "target", "breaking", "steps": [ { "version",
       "optional", "text" } ] }`, steps in version order. `breaking` uses the same rule
       as `take-version.mjs`: below 1.0 a higher middle number, from 1.0 a higher first
       number, compared with the held version. Export that rule from `take-version.mjs`
       or duplicate it — not both; if duplicated, a test asserts the two agree.
   - `node .tropis/scripts/update.mjs discard <clone>` removes the clone, and refuses
     any path whose last component does not start `tropis-update-` or that is not under
     `os.tmpdir()`.

   No network in tests: every test uses a local bare repository as the source.

3. **The command: `commands/update.md`.** It runs the helper and the two scripts from the
   fetched clone, and talks to the user. Its stages, in order — write them in the voice
   of `commands/release.md`, numbered, with what to print and when to stop:

   1. **Pre-flight.** `git status --porcelain` must print nothing; otherwise stop and
      say why — the update must be undoable. Remember the current branch (or commit when
      detached) as *the starting point*.
   2. **Fetch.** `node .tropis/scripts/update.mjs fetch [version]`. On exit 2, ask the
      user where their framework comes from (suggest the URL they cloned Tropis from) and
      run again with `--source`. On `"target": null`, say the project is up to date and
      stop.
   3. **Check.** `node <clone>/scripts/check-version.mjs .` Show its whole report.
   4. **Confirm.** Show: held → target; the verdict; whether it is breaking; every step
      from `fetch`, grouped by version, marked required or optional. Then ask:
      - `safe` or `safe with these steps`: "Update to <target>?" — go on only on yes.
      - `not now`: say plainly that the check advises against it and why, and go on only
        if the user explicitly chooses to update anyway.
      - breaking: the yes must come after the steps were shown; say it is breaking.
      Any other answer is an abort: discard the clone, and the project is untouched.
   5. **Branch and take.** `git switch -c update/<target>`, then
      `node <clone>/scripts/take-version.mjs . [--accept-breaking]`. Show its report.
   6. **Finish what the take left.** In this order:
      - `npm --prefix .tropis install` when the report's `Next:` lists it.
      - Each `.new` file: show the difference between the file and its `.new`. When the
        project's own change is only inside what the new version also changes, propose
        the merge and apply it on yes; otherwise propose the merged text and ask. Delete
        the `.new` once merged.
      - Each file the project removed: ask whether it stays removed; the default is yes.
      - Each file kept because the project changed it: leave it and list it at the end.
      - Each **required** step from `fetch`: do it when it is mechanical — a command to
        run, a line to delete, a file to move. When it needs the user's judgement, say
        what you would do and ask. A required step the user declines is reported at the
        end as not done.
   7. **Check again.** `npm --prefix .tropis test`. When it fails, do not commit: show
      the failures and offer to abort (Stage 9) or to leave the branch as it is for the
      user to finish, saying what is left.
   8. **Commit.** On `update/<target>`, everything the update changed, with subject
      `chore(framework): take Tropis <target>` and a body that says, in the release
      notes' summary words, what the release brings, then which required steps were done
      and which were declined, then this line:
      `Fresh-agent check: not run; this installs a released version, checked before its release.`
      Then discard the clone, and print: the optional steps, each with its version; any
      required step not done; files kept because the project changed them; and how to
      merge — "Review the branch, then merge update/<target> the way this project merges
      a branch."
   9. **Abort**, from any stage after the branch exists: `git restore --staged --worktree .`,
      `git clean -fd`, `git switch <the starting point>`, `git branch -D update/<target>`,
      discard the clone. Before the branch exists: discard the clone. Either way, say the
      project is as it was.

   The clone is discarded on every path out of the command; say so in the command.

4. **`/release` marks optional steps.** In `commands/release.md` Stage 3, step 2 of the
   shape, after "Number the steps.", add this sentence, wrapped to the file's width:

   ```
   Start a step a project may skip with "Optional:" inside its bold lead, as in
   **3. Optional: refresh your model picks.**, and leave every other step unmarked:
   /update does each unmarked step, or asks the user about it.
   ```
 Add the phrase `'Optional:'` to the
   test in `guards/release.test.js`.

5. **This repository's notes and docs.**
   - `RELEASES.md`, `## [Unreleased]`: replace `_Nothing yet._` with a short summary and
     a section `### Update with one command: /update`, written to the shape in
     `commands/release.md` Stage 3, saying: from the next release on, type `/update` in
     the project; this release itself is taken the old way, by running
     `take-version.mjs` from a Tropis clone at its tag, because the project does not have
     `/update` until it holds this release; the first `/update` asks where the framework
     comes from unless the take recorded it. Not breaking.
   - `README.md`, *Taking a new version*: start with `/update` — what it does in three or
     four sentences — then keep the existing text as the manual route, introduced as
     "Without `/update` — before a project holds it, or to do each step yourself".
   - `framework/DECISIONS.md`: FW-023, *A project updates with one command, on its own
     branch*, in the format of FW-022: the decision (Decisions 1–3 in two sentences);
     evidence (the developer's request; the four manual steps around `take-version.mjs`
     that the 0.4.0 notes and this repository's own takes needed); rejected — leaving the
     result uncommitted on the current branch (breaks the branch rule on `main`, and
     aborting means discarding files), committing on the current branch (lands framework
     changes on `main`), a shallow clone, a machine-readable migration file per release
     (a second copy of what the notes say); consequences — release notes are now read by
     a command as well as a person, so the `After updating` heading and the numbered
     bold leads are a format.

## Traps

- **`take-version.mjs` reads the checkout it runs from.** It must be run as
  `node <clone>/scripts/take-version.mjs <project>`, never the project's or this
  repository's copy.
- **A test that clones from GitHub is wrong.** Build a local bare repository with tags in
  a temp directory.
- **The commit hook will speak in a project.** `/update`'s commit touches `.claude/`; the
  project's `framework-commit-check.sh` asks for a branch and a fresh-agent line. The
  command commits on `update/<target>` with that line, so it is satisfied — do not
  silence the hook.
- **Task 7's tags are fixtures.** They are created in a scratch clone in the system temp
  directory and never pushed. The scratch clone's `origin` is this worktree; do not push
  from it.
- **`.gitattributes` lines.** `take-version.mjs` may append `export-ignore` lines the
  project already has in another form (open entry
  `update-keeps-ignore-lines-in-their-own-form`). Out of scope here; if Task 7 shows it,
  report it under *Outstanding*.

## File Structure

| File | Change |
|---|---|
| `scripts/update.mjs` | new: the helper, Decision 2 |
| `scripts/installed-scripts.txt` | add `update.mjs` |
| `scripts/installed-files.js` | `recordOf` takes an optional `source` |
| `scripts/record-installed.mjs` | optional second argument, the source |
| `scripts/set-up-project.sh` | pass the source to `record-installed.mjs` |
| `scripts/take-version.mjs` | record its checkout's source; export `breaking` if shared |
| `commands/update.md` | new: the command, Decision 3 |
| `commands/release.md` | Decision 4 |
| `guards/update.test.js` | new: the helper's tests |
| `guards/release.test.js` | the `Optional:` phrase |
| `guards/installed-files.test.js` | `recordOf` with and without a source |
| `guards/set-up-project.test.js` | setup records the source |
| `guards/take-version.test.js` | the take records the source |
| `RELEASES.md` | Decision 5 |
| `README.md` | Decision 5 |
| `framework/DECISIONS.md` | FW-023 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the probe |
| `docs/superpowers/plans/2026-10-20-project-updates-with-one-slash-command.md` | the handover report |

If a guard outside this table fails because of the change — `framework-integrity`,
`check-drift`, `readme-usable`, the conformance fixtures — fix it, add the file to the
handover's *Scope* with the reason, and say so under *What the plan got wrong*.

## Tasks

### Task 1 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: no output), then
`bash scripts/check-blueprint.sh` (expected last line:
`Every guard caught its defect and passed the clean baseline.`).

### Task 2 — Record the source

Decision 1, test first: `installed-files.test.js` (`recordOf` with a source puts it
between `version` and `files`; without, the object is unchanged), `set-up-project.test.js`
(a project set up from a checkout with an `origin` records it; without `origin`, the
checkout's absolute path), `take-version.test.js` (after a take, the record's `source` is
the Tropis checkout's). Commit.

### Task 3 — The helper

Decision 2, test first, in `guards/update.test.js`, against a local bare repository with
tags `v0.4.0`, `v0.5.0`, `v0.5.1` whose `RELEASES.md` has sections for each:
- `fetch` with no version picks `v0.5.1`; with `v0.5.0`, that one; with `v9.9.9`, exit 1.
- held `v0.5.1`: `"target": null`, nothing cloned.
- no recorded source and no `--source`: exit 2 with the message.
- steps: only versions after the held one and up to the target; `Optional:` marks
  optional; an unmarked step is required; a version with no `### After updating`
  contributes none; the text of a step is the whole paragraph.
- `breaking` true for `v0.4.0` → `v0.5.0`, false for `v0.5.0` → `v0.5.1`.
- the clone is on the target tag; `discard` removes it; `discard` refuses `/tmp` itself,
  a path outside the temp directory, and one not named `tropis-update-*`.
Add `update.mjs` to `installed-scripts.txt`. Commit.

### Task 4 — The command and `/release`

Write `commands/update.md` (Decision 3) with a `description:` front-matter line like the
other commands. Apply Decision 4. Commit.

### Task 5 — Notes, README, decision record

Decision 5. Commit.

### Task 6 — Checks

`bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`; both pass. Record
their last lines in the handover.

### Task 7 — Fresh-agent check, end to end

All of this outside any repository, in the system temp directory:

1. `git clone --branch plan/project-updates-with-one-slash-command <this worktree> <tmp>/source`,
   then `git -C <tmp>/source remote remove origin`, so that the project set up from it
   records `<tmp>/source` itself as its source — with `origin` left in place it would
   record this repository, whose tags are the real releases. Tag the current commit
   `v0.5.0` there (a fixture tag in a throwaway clone).
2. Set up `<tmp>/project` from it: `git init`, then
   `bash <tmp>/source/scripts/set-up-project.sh <tmp>/project`, then
   `npm --prefix .tropis install`, then commit everything. Confirm
   `.tropis/installed.json` holds `"version": "v0.5.0"` and that `"source"` is the
   absolute path of `<tmp>/source`.
3. In `<tmp>/source`, add to `RELEASES.md` a section `## [0.5.1] — 2026-10-21` with a
   one-line summary and `### After updating: what to do by hand` holding
   `**1. Create a file.** Create docs/updated.md containing the word done.` and
   `**2. Optional: say hello.** Run echo hello.`; commit it with a body; tag `v0.5.1`.
4. In `<tmp>/project`, start a fresh Claude Code session with no other context and send:
   "This is a probe; the project and the release are throwaway. Run /update. When it asks
   whether to update, say yes." Record the transcript's key lines. Expected: branch
   `update/v0.5.1`, one commit with a body; `docs/updated.md` contains `done`;
   `.tropis/installed.json` says `v0.5.1`; the optional step printed and not run; the
   clone gone from the temp directory; `npm --prefix .tropis test` passes.
5. Reset the project to step 2's commit on its original branch, delete
   `update/v0.5.1`, and in a new fresh session send the same message but "When it asks
   whether to update, say no." Expected: `git status --porcelain` empty, the same branch
   and commit as before, no `update/` branch, no clone left.
6. Record tool, version and machine, and both outcomes, in the handover. If either run
   does not do what is expected, fix the command or the helper and run that case again;
   report each round.

Then delete `<tmp>/source` and `<tmp>/project`.

### Task 8 — The entry

Set the entry to `shipped`, fill `modules` with `scripts/update.mjs` and
`commands/update.md`, and add a comment above it naming the commit whose body or handover
records Task 7. Run `npm --prefix .tropis test`. Commit.

### Task 9 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names,
and commit it.

## Not in this plan

- Fixing the `.gitattributes` duplicates (`update-keeps-ignore-lines-in-their-own-form`).
- Marking the steps in the 0.4.0 notes optional or required after the fact; unmarked
  means required, so `/update` asks about all four.
- Merging the branch `/update` makes. That stays the project's own merge.

## Handover report

### Task completion

All nine tasks are done. Task 7 passed on the first round of each case; nothing was
re-run after a fix. The throwaway source and project were deleted afterwards.

### Verification results

Task 1, `bash scripts/check-blueprint.sh` on `b647b6a`, last line:

```
Every guard caught its defect and passed the clean baseline.
```

`git status --porcelain` before that printed nothing.

Task 6, `bash scripts/check-blueprint.sh` on `e7b603d`, last line:

```
Every guard caught its defect and passed the clean baseline.
```

Task 6, `npm --prefix .tropis test`, last lines:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        1.055 s
Ran all test suites.
```

Task 8 ran `npm --prefix .tropis test` again after the catalog edit. Same five suites,
28 passed.

Task 7, both sessions, Claude Code 2.1.300 (`claude --version`), on
dev-laptop.local (Darwin 25.2.0, arm64). Each session was
`claude -p --permission-mode bypassPermissions --setting-sources project
--strict-mcp-config --no-session-persistence` in the throwaway project, with no other
prompt than the one Task 7 names. The yes-run commit trailer named Claude Opus 5.5.

Yes: branch `update/v0.5.1`, commit `d690e93`, subject
`chore(framework): take Tropis v0.5.1`. The body used the notes' sentence "A patch
that asks the project to record that it was updated.", listed the required step as
done and none declined, and contained
`Fresh-agent check: not run; this installs a released version, checked before its release.`
`docs/updated.md` contained `done`. `.tropis/installed.json` said `v0.5.1`, source
still the scratch clone's path. The transcript printed the optional step (v0.5.1,
run `echo hello`) and did not run it. No `tropis-update-*` directory remained.
`npm --prefix .tropis test` in that project: 5 suites, 30 passed. The diff was
`.tropis/installed.json` and `docs/updated.md` only.

No: after resetting to the setup commit `eb65eb5` on `main` and deleting
`update/v0.5.1`, the session stopped at the confirmation. `git status --porcelain`
was empty, branch `main`, HEAD `eb65eb5`, no `update/` branch, no clone,
`docs/updated.md` absent, installed version still `v0.5.0`.

### Scope

`git diff --stat origin/main...HEAD` before this handover commit:

```
 README.md                      |   9 ++
 RELEASES.md                    |  19 ++-
 commands/release.md            |   5 +-
 commands/update.md             | 177 +++++++++++++++++++++++++++
 feature-catalog.yaml           |  10 +-
 framework/DECISIONS.md         |  25 ++++
 guards/installed-files.test.js |  45 +++++++
 guards/release.test.js         |   1 +
 guards/set-up-project.test.js  |  48 +++++++-
 guards/take-version.test.js    |  15 ++-
 guards/update.test.js          | 259 +++++++++++++++++++++++++++++++++++++++
 scripts/installed-files.js     |  10 +-
 scripts/installed-scripts.txt  |   1 +
 scripts/record-installed.mjs   |  12 +-
 scripts/set-up-project.sh      |   8 +-
 scripts/take-version.mjs       |  13 +-
 scripts/update.mjs             | 267 +++++++++++++++++++++++++++++++++++++++++
 17 files changed, 905 insertions(+), 19 deletions(-)
```

Every one of those paths is in the File Structure table. This commit adds the
handover to this plan, which is in the table, and names `cc18d5c` in the comment
above the catalog entry, which is already in the diff. Nothing under `.claude/`,
`.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` was edited.

### Judgment calls

- The breaking rule is copied in `scripts/update.mjs` and exported from
  `scripts/take-version.mjs` so the test can compare them. `take-version.mjs` is not
  installed into a project, and `update.mjs` is, so the installed helper cannot import
  it. The plan allowed a duplicate when a test asserts the two agree.
- With no `origin`, the recorded source is `pwd -P` of the checkout (setup) or
  `realpath` of it (the take). Both are the physical path, so a macOS temp directory
  reached through `/var` still matches.
- The setup tests that record a source build their own copy of the blueprint and add
  an origin or leave it off. The self-check runs the guards from `git archive`, which
  has no `.git`, so a test of this worktree's real origin would fail there.
- Stage 6 of `/update` treats creating a file, with the path and content the step
  states, as mechanical, along with a command, a deleted line, and a move. The probe's
  required step is that case.
- The catalog comment could not name `cc18d5c` inside that commit. This commit adds
  the hash. The probe itself is in `cc18d5c`'s body.

### What the plan got wrong

`recordOf(next, target)` in `take-version.mjs` fingerprints the scratch project built
from the tag, not the Tropis checkout and not the destination. The destination's
record matches because the take copied those files. The checkout's source is a third
argument on that same call. The plan's line number was the right call; `next` is not
the checkout.

### Outstanding

The probe's take did not touch `.gitattributes`. The open entry
`update-keeps-ignore-lines-in-their-own-form` did not appear. Nothing to add for it.

Merge is parent review. This branch is handed over as a pull request and is not
merged from here.

## Review record

Reviewed by the specifying session on 2026-10-20, in a separate worktree of the branch
at `b6cc449`, Claude Code on dev-laptop.local.

### Checks re-run

- `bash scripts/check-blueprint.sh` at `b6cc449`: first run in a fresh worktree
  reported `1 problem(s). A guard that cannot fail is not evidence.`; the next three
  runs ended `Every guard caught its defect and passed the clean baseline.` See
  *Outstanding disposition*.
- `npm --prefix .tropis test`: `Tests: 28 passed, 28 total`.
- Scope: `git diff --stat origin/main...HEAD` lists 18 files, all in the File Structure
  table.
- Read `scripts/update.mjs` and `commands/update.md` against Decisions 2 and 3, and the
  prose changes against Decisions 4 and 5. The helper, the command's nine stages, the
  abort path and the commit body match. The handover's account of Task 7 was not re-run;
  its transcript facts (branch, commit, file, installed version, no clone left, unchanged
  project on abort) are consistent with the code.
- After the fixes below, at `d8fc578`: `bash scripts/check-blueprint.sh` five times in a
  row, each ending `Every guard caught its defect and passed the clean baseline.`
  (111–118 s each).

### Found

Fixed on the branch by the reviewer in `d8fc578`, each understood and mechanical:

1. **A token in Tropis's cloned URL would be committed.** The source is `git remote
   get-url origin`, verbatim, and `.tropis/installed.json` is committed in every project,
   so a clone made as `https://<token>@github.com/...` would publish the token.
   `recordOf` now drops the user part of an http(s) URL; an ssh address is kept.
   `installed-files.test.js` asserts both, and fails with the strip removed (checked with
   a throwaway commit, then dropped).
2. **A leftover `update/<target>` branch was not handled.** `git switch -c` fails on it,
   and Stage 5 said nothing. The command now stops, leaves that branch alone and
   discards the clone.
3. **The release note ended "Not a breaking release."**, the per-section label
   `/release` Stage 3 now says not to write. Removed.

### Outstanding disposition

- **Unexplained: the self-check went red twice and then not again.** Once on the first
  run in a fresh worktree at `b6cc449` (`1 problem(s)`, details not kept), and once in
  the throwaway run for finding 1, where five `check-version.mjs` tests failed alongside
  the one deliberately broken test. Neither reproduced: three runs at `b6cc449`, five at
  `d8fc578`, one in a fresh worktree of `main`, and `check-version.test.js` alone three
  times, all passed. No cause is claimed. Filed as a backlog entry so the next red run
  keeps its output.
- Criterion 9 (the fresh-agent run) is backed by `cc18d5c`'s body and the handover; the
  reviewer did not repeat it.
- The handover's own *Outstanding* (the `.gitattributes` duplicates did not appear):
  nothing to carry.

### Learnings routed

- A committed record must not carry anything copied from a URL verbatim: fixed in code
  with a test, which is where the next writer of a record will meet it. Nothing else
  generalises.

### Merged because

Every criterion is met by the helper's tests, the command's text and the recorded
end-to-end probe, and the three defects review found are fixed and checked on the branch.
