# A release is deploy to staging, then promote to production — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a release is two plainly named steps that `/release` carries the developer
through — deploy to staging, then promote to production — and promoting tags a commit
the main branch already holds, so no release writes to a gated main branch.

**Spec:** the bundle `release-flow` in `docs/backlog-board/bands.yaml`: the entries
`release-tags-what-main-holds` and `release-guides-through-both-steps` in
`feature-catalog.yaml`. There is no design document; the entries' acceptance criteria and
the decisions below are the design.

**Why one plan for two entries.** The first entry says what promoting does (it tags a
commit main holds, after a pull request carries the version and the promoted notes); the
second names the steps and has `/release` walk through them. Both rewrite the same
stages of `commands/release.md` and the same release section of `framework/workflow.md`,
and the second's step 2 *is* the first's promotion. Done apart, the second plan would
rewrite what the first had just written. One sentence states the result: the goal above.

**What the specifying session verified on 2026-11-01, against `origin/main` at `191673f`:**

- **`/release` today** (`commands/release.md`, 251 lines). Stage 1 runs
  `node .tropis/scripts/pipeline.mjs candidate slot` and remembers `filled` or `empty`.
  Stage 3 ends the notes with `Checked on the release candidate: no — no candidate was
  rehearsed` (empty slot) or `Checked on the release candidate: (after the candidate)`
  (filled). Stage 4 prints `Proposed bump: … (the pipeline computes the number)`. Stage 5
  commits only the notes file (through an auto-merging pull request where main is gated).
  Stage 6 prints, for an empty slot, the release trigger with the bump; for a filled slot,
  the candidate trigger with the full hash, then three numbered steps for the developer
  (read the run summary, run `/manual-check` with the *Change* line
  ``release candidate at `<short hash>` ``, run `/release` again). Stage 7 (entered when
  the notes end with `(after the candidate)`) reads the newest verification-log entry
  whose *Change* names `release candidate at`, and on `pass` prints the release trigger
  with the bump and the candidate's hash, saying the release step writes
  `Checked on the release candidate: yes`. The project-owned block's comment lists the
  fill-in lines *Run from*, *Notes file*, *Readers*, *Breaking*, *Trigger*, *Candidate
  trigger*, *Where the run is watched*. The command never runs a trigger.
- **The release section of `framework/workflow.md`** (*Optional — release*, from line
  ~525) describes three steps: the release candidate, the check, and the release — which
  "on top of the candidate, make[s] one commit that sets the version, promotes
  `## [Unreleased]` … tag[s] that commit; merge[s] it into the main branch; push[es] the
  branch and the tag together". The bullet *The tag sits one commit above the candidate*
  explains that shape. The *Branching* section says a project whose release pipeline
  pushes to main records why it is ungated "until its release only tags what `main`
  holds". So today a gated project cannot release without a bypass — the problem
  `release-tags-what-main-holds` names.
- **The slot and its run** (`scripts/pipeline.mjs`): `CANDIDATE_SCRIPTS = ['reset.sh',
  'deploy.sh']` under `pipeline/candidate/`; `candidateSlot(root)` returns `filled`,
  `empty`, or an error naming the missing script; `candidateSummary(...)` writes a block
  headed `### Release candidate` with `- Candidate:`, `- Reset:`, `- Deploy:` and
  `- By hand:` lines; `rehearse(root, summary)` resets to the highest `vX.Y.Z` tag
  (`reset.sh` gets `TROPIS_PRODUCTION_TAG` and `TROPIS_PRODUCTION_DIR`), then runs
  `deploy.sh` with `TROPIS_CANDIDATE` (the head hash) and `TROPIS_BY_HAND`, and writes the
  summary to `--summary <file>` or, without it, to stderr. `candidateCommand` takes
  `slot` (prints `candidate=filled|empty`) and `rehearse [--summary <file>]`; usage
  `candidate: use slot or rehearse` exits 2. The `commands` listing ends with
  `# Release candidate. …` and `node .tropis/scripts/pipeline.mjs candidate rehearse`.
  Tests: `guards/pipeline.test.js`, `describe('candidate slot')` and
  `describe('candidate rehearse')`, plus mentions in `describe('GitHub workflow')`.
- **The workflows.** `templates/github/tropis-candidate.yml` (installed as
  `.github/workflows/tropis-candidate.yml`, replaced on update) is a `workflow_call` with
  input `commit`, jobs `framework` (the framework checks at that ref), `stages` (matrix of
  sanity, unit, integration, end-to-end at that ref, no gate) and `rehearse` (concurrency
  group `tropis-candidate-${{ github.repository }}`, runs
  `pipeline.mjs candidate rehearse --summary "$GITHUB_STEP_SUMMARY"`).
  `templates/candidate-caller.yml` is the project-owned caller, copied by the operator to
  `.github/workflows/candidate.yml`, started with
  `gh workflow run candidate.yml --ref main -f commit=<commit>`.
- **Where these names are wired:** `scripts/installed-files.js` `SHIPPED_PATHS` lists
  `.github/workflows/tropis-candidate.yml`; `scripts/set-up-project.sh` copies
  `templates/candidate-caller.yml` into `.tropis/templates/`;
  `guards/framework-integrity.test.js` exempts `.github/workflows/tropis-candidate.yml`
  and `.github/workflows/candidate.yml`; `guards/installed-files.test.js` and
  `guards/set-up-project.test.js` name both files; `templates/README.md` (the operator
  guide a project gets) explains the slot from "To rehearse a release before it is
  tagged"; `guards/release.test.js` `describe('the /release drafting stage')` asserts
  Stage 3 contains both `Checked on the release candidate` lines.
- **An update deletes a file the new release no longer ships** (`scripts/take-version.mjs`,
  *Deleted, no longer shipped*), so renaming `tropis-candidate.yml` removes it from a
  project, and a caller still naming it breaks. A release note's numbered by-hand step is
  done by `/update` (`commands/update.md`, Stage 6 item 6: "a file to create or to move, …
  Do it when it is mechanical"). `RELEASES.md`'s `## [Unreleased]` holds `_Nothing yet._`
  and `/release` keeps the facts of content already there (Stage 3).
- **The search that defines "old names"** —
  `git grep -n -i -E "release candidate|pipeline/candidate|candidate(-caller)?\.yml|TROPIS_CANDIDATE|candidate (slot|rehearse)|rehears|pre-production" -- rules framework commands scripts guards templates`
  — finds, today: `commands/release.md`, `framework/workflow.md`, `framework/DECISIONS.md`
  (FW-030's text, and FW-041's unrelated "rehearse the work"), `scripts/pipeline.mjs`,
  `scripts/installed-files.js`, `scripts/set-up-project.sh`, `templates/README.md`, both
  workflow templates, five guards, and `rules/planning.md` (its unrelated "Do not rehearse
  the work to write its plan"). `commands/refresh-readme.md` and `scripts/next-work.js`
  use "candidate" in an unrelated sense and are not matched.
- **This repository's own release** (`.github/workflows/ci.yml`, `.github/scripts/`,
  `RELEASES.md`'s released sections) is not shipped, already tags only, and is out of
  scope. The product `README.md` mentions a rehearsal; it is refreshed by
  `/refresh-readme` at release, never patched by a plan.
- **The developer's user-level instructions** on the specifying session's machine say
  nothing about releases, staging or promotion, so a local fresh-agent probe is a real
  one.

**Model tier: High.** Command prose that an agent will follow across two sittings, a script command with refusals, a rename through every shipped file with a migration, and a fresh-agent probe to set up and judge.

**Merge authority: parent review.** The release flow is irreversible when a project runs it, and the real staging and promote runs cannot be exercised here. Stop after the handover report (Task 7); do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 6 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

release-tags-what-main-holds
release-guides-through-both-steps

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-release-flow -b plan/release-flow origin/main` |

## Global Constraints

- **Never run a release.** Do not run `gh workflow run`, `gh run rerun`, or anything that
  starts a workflow; do not push a tag; push nothing except this plan's branch. Commands
  that only read GitHub (`gh run list`, `gh run view`) appear in the command text as
  things `/release` runs for the developer; you need not run them.
- **Edit only the source folders** (`rules/`, `framework/`, `commands/`, `scripts/`,
  `guards/`, `templates/`) and the other files in *File Structure*. Never edit `.claude/`,
  `.tropis/`, `.cursor/`, `.github/` or `CLAUDE.md`: they are the installed release.
- **Add no dependency. Do not lower, skip or delete a guard or a test** except where a
  test is renamed or rewritten for the new names, which you list in the handover.
- **Every commit has a body** saying what becomes true. The commit touching
  `framework/` carries Task 6's fresh-agent outcome (tool, version, operating system and
  architecture; never the computer's name).
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from.

## Decisions

The words. **The release** is the whole thing `/release` guides. **Step 1, deploy to
staging**: run every stage on one commit of the main branch, put staging back on
production's version, deploy that commit there, and check it by hand. **Step 2, promote
to production**: tag a commit the main branch holds and deploy the tag to production.
"Staging" replaces "pre-production environment"; "the staged commit" replaces "the
candidate"; "promote" replaces "the release" where it meant the last step. The command
stays `/release`.

### 1. The renames (every shipped file)

| Old | New |
|---|---|
| `pipeline/candidate/` (`reset.sh`, `deploy.sh`) | `pipeline/staging/` (same two scripts) |
| `pipeline.mjs candidate slot` → `candidate=filled\|empty` | `pipeline.mjs staging slot` → `staging=filled\|empty` |
| `pipeline.mjs candidate rehearse [--summary f]` | `pipeline.mjs staging deploy [--summary f]` |
| `candidateSlot`, `candidateSummary`, `rehearse…` functions | `stagingSlot`, `stagingSummary`, `deployToStaging…` (your choice of exact names) |
| summary heading `### Release candidate`, line `- Candidate:` | `### Deploy to staging`, `- Commit:` |
| env `TROPIS_CANDIDATE` | `TROPIS_STAGING_COMMIT` |
| `templates/github/tropis-candidate.yml` → `.github/workflows/tropis-candidate.yml`, name `Tropis release candidate`, job `rehearse`, concurrency `tropis-candidate-…` | `templates/github/tropis-staging.yml` → `.github/workflows/tropis-staging.yml`, name `Tropis deploy to staging`, job `deploy`, concurrency `tropis-staging-…` |
| `templates/candidate-caller.yml` → `.github/workflows/candidate.yml`, name `Release candidate` | `templates/staging-caller.yml` → `.github/workflows/staging.yml`, name `Deploy to staging`, plus `run-name: Deploy to staging ${{ inputs.commit \|\| github.sha }}` |
| notes line `Checked on the release candidate: yes` / `no — no candidate was rehearsed` / `(after the candidate)` | `Checked on staging: yes` / `no — this project does not deploy to staging` / `(after staging)` |
| verification-log *Change* ``release candidate at `<short hash>` `` | ``staging deploy at `<short hash>` `` |
| project-owned fill-in *Trigger*, *Candidate trigger* | *Promote trigger*, *Staging trigger* (Decision 3) |

`staging deploy` also writes its summary block to **stdout**, in addition to the summary
file, so `/release` can read it from the run's log (Decision 3). Keep `TROPIS_PRODUCTION_TAG`
and `TROPIS_PRODUCTION_DIR` as they are.

**The slot refuses the old layout, so nothing is lost silently.** `stagingSlot` returns
an error (exit 1 from `staging slot` and from `staging deploy`) when:

- `pipeline/candidate/` exists: `staging: pipeline/candidate/ is the old name of pipeline/staging/ — run git mv pipeline/candidate pipeline/staging`;
- any file under `pipeline/staging/` contains `TROPIS_CANDIDATE`:
  `staging: pipeline/staging/<file> reads TROPIS_CANDIDATE, now TROPIS_STAGING_COMMIT`.

These two messages, the migration step (Decision 5) and the decision record's mapping
(Decision 6) are the only places the old names stay in shipped files.

### 2. The promote check (`scripts/pipeline.mjs`)

Tropis still does not ship the promote pipeline (FW-030: version files, tags and
production differ per project). It ships the check that pipeline runs before it tags, so
the refusal is the same everywhere and tested here:

```
node .tropis/scripts/pipeline.mjs promote check <commit> [--staged <commit>] [--allow <path>]...
```

Run from a checkout of the main branch with full history. In order, each refusal exits 1
with one line starting `promote: `:

1. `<commit>` (and `--staged` when given) is a 40-character lowercase hex hash, else
   `promote: "<value>" is not a full commit hash`.
2. It names a commit in this repository, else `promote: <hash> is not a commit here`.
3. `<commit>` is an ancestor of `HEAD` (or `HEAD` itself), else
   `promote: <hash> is not on the main branch — tag only a commit main holds`.
4. When the staging slot is filled and `--staged` is absent:
   `promote: this project deploys to staging — give --staged <the commit staging was checked on>`.
5. With `--staged`: it is an ancestor of `<commit>` (or equal), else
   `promote: <commit> does not contain the staged commit <staged>`.
6. With `--staged`: every path in `git diff --name-only <staged> <commit>` is one of the
   `--allow` paths, else
   `promote: <path>, <path> changed since staging was checked — deploy <commit> to staging first`
   (all offending paths, comma-separated).

Passing prints `promote: <commit> may be tagged` and exits 0. Usage errors exit 2 with
`promote: use check <commit> [--staged <commit>] [--allow <path>]...`. Add it to the
`commands` listing with a comment line saying the promote pipeline runs it before it tags.
Write it against the existing `git(root, args)` helper and the module's existing style.

### 3. `/release` (`commands/release.md`)

Rewrite the command so it carries the developer through both steps and resumes. Keep
Stages 1b (README), 2 (scope) and the drafting rules of Stage 3 as they are, apart from
the names. Every place it says the pipeline computes the number now says `/release`
computes it. Required content, in your own wording:

- **Front matter and opening.** Description: drafts the notes, guides deploy to staging
  and promote to production, and prints each trigger; does not run them. The opening says
  the release is two steps, deploy to staging and promote to production, and that a
  project with an empty staging slot has only step 2. It says where to resume: if
  `## [Unreleased]` ends with `Checked on staging: (after staging)` **or** the old
  `Checked on the release candidate: (after the candidate)`, go to the staging stage
  (*Step 1*, below) for the commit the notes' merge put on main; if the version's
  section already ends with `Checked on staging: yes` (or the old `…release candidate:
  yes`) and no tag names that version, go to *Step 2*. "Never runs a trigger, deploys, or
  tags" stays.
- **Project-owned block comment.** Fill-in lines: *Run from*, *Notes file*, *Readers*,
  *Breaking*, **Version files** (each file that carries the version and where in it, e.g.
  `package.json`'s `version` field), **Promote trigger** (the command that starts the
  project's promote pipeline, with `<commit>` and, where the project deploys to staging,
  `<staged>`; e.g. `gh workflow run promote.yml --ref main -f commit=<commit> -f staged=<staged>`),
  **Staging trigger** (e.g. `gh workflow run staging.yml --ref main -f commit=<commit>`),
  **Staging workflow** (its file name, e.g. `staging.yml`), *Where the run is watched*.
  Say that a block filled before this release may still say *Trigger* and *Candidate
  trigger*, read as *Promote trigger* and *Staging trigger*.
- **Stage 1** runs `node .tropis/scripts/pipeline.mjs staging slot` and remembers
  `filled` or `empty`; on exit 1 it shows the message (which may be the old-layout
  refusal) and stops.
- **Stage 4** prints `Version: <current> → <next>` computed by `/release` from the last
  `vX.Y.Z` tag and the bump (semantic versioning; below 1.0 a breaking change raises the
  middle number; the first release is the version the developer confirms), and
  `Staging: step 1, then promote · none — pipeline/staging/ is empty, promote only`.
- **Stage 5, empty slot.** One commit (one pull request where gated, merged as today and
  waited for with `main-status.mjs --pull-request <N>`) sets the version in every
  version file, promotes `## [Unreleased]` to `## [<version>] — <date>` with a fresh empty
  `## [Unreleased]` above it, and ends the section with `Checked on staging: no — this
  project does not deploy to staging`. Subject `chore(release): <version>`. Stop if the
  commit would touch any file other than the notes file and the version files. Then
  *Step 2* with `<commit>` = the commit that landed on main, no `<staged>`.
- **Stage 5, filled slot.** As today: commit only the notes, ending
  `Checked on staging: (after staging)`, with `Bump: <bump>` in the body. Then *Step 1*
  with `<commit>` = the commit that landed on main.
- **Step 1 of 2 — deploy to staging.** Print `Step 1 of 2 — deploy to staging`, the
  staging trigger with the full hash, and where the run is watched. Ask the developer to
  say when they have started it, and wait (silence is not a yes). Then find the run:
  `gh run list --workflow <staging workflow> --event workflow_dispatch --limit 20 --json databaseId,displayTitle,status,conclusion,url,createdAt`,
  the run whose `displayTitle` contains the full hash; where none does (a caller without
  `run-name`), the newest one created after the developer said it started, saying so.
  Wait for it with `gh run watch <id> --exit-status` (in the background where the tool
  stops long commands, or run again). Then read its log, `gh run view <id> --log`, and
  report the `### Deploy to staging` block: the commit, reset, deploy, and **By hand**
  list, numbered. A failed run: record a verification-log entry for this commit with
  *Result* `fail`, naming the run's URL and what the summary says failed, and stop,
  saying that once a fix has merged `/release` starts step 1 again for the new head of
  the main branch. The notes stay.
- **The check, same sitting.** Draft and record the check with the developer by
  following `/manual-check`'s stages (it decides the kind, drafts, writes the entry as
  `pending` before anything is run, waits, records), on staging, with *Change*
  ``staging deploy at `<short hash>` ``. The by-hand list from the run comes first in
  the steps. On `fail`, the entry records it, and `/release` stops as for a failed run.
  On a later run of `/release`, the newest entry whose *Change* names `staging deploy at`
  **or** the old `release candidate at` is the one read; `pending` resumes the check,
  `fail` starts step 1 for the head of `origin/main`.
- **On pass — the promotion pull request.** In a worktree of its own from `origin/main`
  (a sibling worktree on a new branch `release/<version>` from `origin/main`, as the
  workflow's *Branching* section says; write the command into the command text in that
  form, and say under *Traps* in your handover that the plan describes it in words
  because the plan check refuses a worktree command outside the Repositories table):
  set the version in every version file, promote `## [Unreleased]` to
  `## [<version>] — <date>` with a fresh `## [Unreleased]` above, and replace the last
  line with `Checked on staging: yes`. Refuse if `git diff --name-only <staged> HEAD`
  then names anything but the notes file and the version files: something merged since
  staging was checked; say so and start step 1 for the head of `origin/main`. Commit
  `chore(release): <version>`, push, open the pull request, run
  `gh pr merge <N> --auto --squash` with that subject, then
  `node .tropis/scripts/main-status.mjs --pull-request <N>`, and go on only once it
  reports the main branch green. Where the main branch is not gated, commit on `main`
  and push instead. Remove the worktree after.
- **Step 2 of 2 — promote to production.** Print `Step 2 of 2 — promote to production`,
  the promote trigger with `<commit>` = the full hash of the commit that pull request
  put on main (`gh pr view <N> --json mergeCommit -q .mergeCommit.oid`, or the pushed
  commit) and `<staged>` = the staged commit's full hash, and where the run is watched.
  Say the promote pipeline runs `promote check` first, tags `<commit>`, pushes only the
  tag, and deploys the tag to production; anything merged after `<commit>` waits for the
  next release. Stop.
- **Both steps:** the developer starts each; an agent must not run a trigger.

### 4. `framework/workflow.md`, release section and branching

Rewrite *Optional — release* to the new words and flow:

- `/release` drafts and guides; the developer starts each step. Step 1, **deploy to
  staging** (Tropis ships it: the project fills `pipeline/staging/`, and
  `.github/workflows/tropis-staging.yml` runs it); the **check** on staging, drafted and
  recorded by `/release` as `/manual-check` does; then the **promotion pull request**
  that carries the version and the promoted notes onto the main branch; step 2,
  **promote to production**, the project's own pipeline, which must: run
  `node .tropis/scripts/pipeline.mjs promote check <commit> --staged <staged> --allow <notes file> --allow <each version file>`
  (without `--staged` where the slot is empty) and stop on a refusal; run the full suite
  as a gate; tag `<commit>`; push only the tag; deploy the tag to production; publish the
  notes without the `Checked on staging` line; and roll back on failure. It never commits
  and never pushes a branch.
- Replace *The tag sits one commit above the candidate* with **the tag sits on a commit
  the main branch holds, and its code is the staged commit's**: the promotion pull
  request changes only the notes and the version files, and the check refuses anything
  else, so production gets what staging was checked on, and anything merged meanwhile
  needs a new deploy to staging.
- Keep the `vX.Y.Z` bullet, the upgrade-rehearsal bullet (renamed: "each deploy to
  staging is the upgrade production will receive"), the manual-production bullet and the
  rollback bullet, in the new words.
- *Branching*: the release-pipeline paragraph ("A release pipeline is a third writer to
  `main`" … "until its release only tags what `main` holds") becomes: a promote pipeline
  never writes to the main branch; the version and the notes reach it through `/release`'s
  pull request, so a gated project needs no bypass. A project whose own release still
  pushes to main records why it is ungated until it follows this section. The
  where-it-is-not-gated list's "the release notes `/release` commits" becomes "the
  release notes and version `/release` commits".

### 5. Migration (`RELEASES.md`, `## [Unreleased]`)

Replace `_Nothing yet._` with a by-hand section the next release's `/release` keeps and
`/update` performs. Heading `### What to do by hand`, then numbered steps, each one
sentence of why and the exact action, for a project that deploys to staging today:

1. `git mv pipeline/candidate pipeline/staging`, and in `pipeline/staging/*.sh` replace
   `TROPIS_CANDIDATE` with `TROPIS_STAGING_COMMIT`.
2. `git mv .github/workflows/candidate.yml .github/workflows/staging.yml`; in it, change
   `uses: ./.github/workflows/tropis-candidate.yml` to
   `uses: ./.github/workflows/tropis-staging.yml`, set `name: Deploy to staging`, and add
   `run-name: Deploy to staging ${{ inputs.commit || github.sha }}` under it.
3. In `.claude/commands/release.md`'s project-owned block, rename *Trigger* to *Promote
   trigger* and *Candidate trigger* to *Staging trigger*, and add *Version files* and
   *Staging workflow*.
4. Change the release pipeline to the promote step in the workflow's release section:
   take `commit` and `staged`, run `promote check`, tag `commit`, push only the tag, and
   stop committing the version and the notes — `/release` does that now.

Each step says it applies only where the file named exists. Steps 1–2 are mechanical;
step 4 needs the developer. Keep it as plain release-note prose, in the reader's terms.

### 6. Decision record (`framework/DECISIONS.md`)

Add `## FW-<next>: A release is deploy to staging then promote to production, and
promoting only tags`, with Date, Status Accepted, Decision (the two steps, `/release`
guiding both and resuming from the notes line and the verification log, the promotion
pull request, the tag on a commit main holds, the shipped `promote check`, the rename),
Evidence (FW-037's consequence that a project whose release pushes to main stays ungated;
the bundle's two entries; the old names read as jargon and "release" named three
things), Rejected (a bypass for the release pipeline, as FW-037 rejected; tagging the
staged commit itself, which cannot carry the version; Tropis shipping the whole promote
pipeline, as FW-030 rejected; keeping both env names), Consequences (a project that
deploys to staging renames its slot, caller and env var, through the release's by-hand
steps; its promote pipeline stops committing; anything merged after staging is checked
needs a new deploy to staging before promotion). `<next>` is the number after the
highest `FW-` heading in the file when you write it; at the time of writing that is
FW-044, and another session may take it first — the reviewer renumbers at merge if so.
Append to FW-030 an `**Amended 2026-11-01 — renamed, and the tag moved.**` paragraph:
the old names map to the new (the table in Decision 1, as prose), and the tag is now
on the promotion commit main holds, per FW-<next>. Leave FW-037 unchanged; say in the
new record's Consequences that FW-037's "stays ungated until its release only tags" is
now met by following the release section. FW-030's original text
is history and keeps its words.

### 7. Shaping change carried by this plan

`release-guides-through-both-steps` criterion 1 already reads (re-shaped by the
specifying session in the pull request that moved it to building): decision records
written from now on use the new names, and the old names stay only in a migration note
and in earlier decision records' original text. So FW-030's original text is in scope
to keep.

## Traps

- **A release is never run.** Its proof is `guards/pipeline.test.js` running the slot,
  the deploy and the promote check against scratch repositories, and the probe in Task 6.
  `gh workflow run` appears only as text to print.
- **`bash scripts/check-blueprint.sh` reads committed content only.** Commit before you
  run it. For a red check, make the revert a throwaway commit, run the guard through the
  snippet in Task 0, and drop it (`git reset --hard HEAD~1` on your own branch only).
- **The old-names search is a check of the result, and it matches the unrelated
  "rehearse the work" in `rules/planning.md` and FW-041.** Those, FW-030's original text
  and amendment, the new decision's mapping, the two refusal messages and their tests are
  the expected hits; anything else is a miss to fix.
- **`.github/workflows/tropis-candidate.yml` exists in this repository** — it is the
  installed release's copy. Leave it; an update removes it.
- **The commit hook speaks at a commit touching `framework/`** only as advice in this
  repository's source folders; still put Task 6's outcome in the body of the commit that
  changes `framework/workflow.md`.
- **`guards/set-up-project.test.js` "records every shipped file at version unknown"** is
  known to pass only in the self-check's archive export and to fail from a checkout. If
  it is the only failure in `npm --prefix .tropis test`, check it fails the same on
  `origin/main` and record that; do not fix it here.
- **A plan header field sits on one line** until a release after 0.7.1 is installed;
  this plan's do. Do not rewrap them.
- **`feature-catalog.yaml` and `docs/backlog-board/bands.yaml` are being edited by other
  sessions.** Touch only this bundle's two entries in the catalog, and not `bands.yaml`
  at all; rebase on `origin/main` before pushing and resolve conflicts by keeping both
  sides.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | Decisions 1, 2 |
| `guards/pipeline.test.js` | Decisions 1, 2: renamed describes, the refusals, stdout summary, promote check |
| `templates/github/tropis-candidate.yml` → `templates/github/tropis-staging.yml` | Decision 1 (`git mv`) |
| `templates/candidate-caller.yml` → `templates/staging-caller.yml` | Decision 1 (`git mv`) |
| `scripts/installed-files.js` | Decision 1 |
| `scripts/set-up-project.sh` | Decision 1 |
| `guards/installed-files.test.js` | Decision 1 |
| `guards/set-up-project.test.js` | Decision 1 |
| `guards/framework-integrity.test.js` | Decision 1: the two exempted workflow paths |
| `templates/README.md` | Decisions 1, 3: the operator guide's staging paragraph and the promote check |
| `commands/release.md` | Decision 3 |
| `guards/release.test.js` | Decision 3: `describe('the /release drafting stage')` and any assertion naming old text; add assertions for the new lines (step headers, both resume forms, the promotion refusal) |
| `framework/workflow.md` | Decision 4 |
| `framework/DECISIONS.md` | Decision 6 |
| `RELEASES.md` | Decision 5 |
| `feature-catalog.yaml` | Task 7: both entries to shipped |
| `docs/superpowers/plans/2026-11-01-release-flow.md` | Task 7: the handover report |

If another shipped file turns out to name the old words (the search in Task 5 finds it),
it is in scope: change it, and list it under *What the plan got wrong*.

Doc closeout, decided by the specifying session: the decision record (Decision 6), the
workflow's release section (Decision 4), the operator guide template
(`templates/README.md`) and the release-note migration (Decision 5) are what this change
owes. No rule: the constraint lives where `/release` and the promote pipeline read it.
The product `README.md` is refreshed by `/refresh-readme` at the next release, not
patched (it names no file this plan removes). Nothing for an upstream queue: this
repository is the upstream.

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table; run the command from the primary checkout of `tropis`,
after `git fetch origin`). In the worktree run `npm --prefix .tropis ci`, then
`git status --porcelain` (passes when it prints nothing), then
`bash scripts/check-blueprint.sh` (passes when its last line starts `Self-check passed`;
any other last line, stop and hand back). Record `git --version`, `node --version`,
`uname -sm`, your tool and version, and the commit you started from.

To run one guard on committed content outside the self-check:

```bash
S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
echo '{"type":"module"}' > "$S/package.json"
cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
(cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/pipeline.test.js); rm -rf "$S"
```

### Task 1 — The rename in the script, workflows and installers (Decision 1)

Tests first: rename the describes and expectations in `guards/pipeline.test.js` and the
guards naming the files, add tests for the two old-layout refusals and for the summary
reaching stdout. Commit, run the snippet on `guards/pipeline.test.js`: record the
failures (the new names and refusals must fail). Then the script, the `git mv`s, the
installers; commit; the snippet passes when the guard reports no failed test.

**Red checks**, each a throwaway commit run through the snippet and dropped; record the
failing test names: the `pipeline/candidate/` refusal removed; the `TROPIS_CANDIDATE`
refusal removed.

### Task 2 — The promote check (Decision 2)

Tests first, in `guards/pipeline.test.js`, in a scratch repository with a `main` branch:
one test per refusal 1–6 asserting the exit code and the line, a pass with `--staged`
and only allowed paths changed, a pass with no `--staged` and an empty slot, and usage
exit 2. Record the red run, implement, record the green run.

**Red checks** (throwaway commits): the ancestor-of-`HEAD` test removed — refusal 3's
test must fail; the allow-list comparison removed — refusal 6's test must fail.

### Task 3 — `/release` (Decision 3)

Rewrite `commands/release.md`. Update `guards/release.test.js` so it asserts, in the
command text: Stage 1 runs `pipeline.mjs staging slot`; Stage 3 has the three
`Checked on staging` lines; both resume forms (new and old notes line, new and old
*Change* line) are named; the strings `Step 1 of 2 — deploy to staging` and
`Step 2 of 2 — promote to production`; the promotion refusal compares against the staged
commit; and the command says an agent must not run a trigger. Run the snippet on
`guards/release.test.js`: passes with no failed test. Commit.

### Task 4 — The workflow, the decision, the guide, the migration (Decisions 4–6)

Write them. Do not commit `framework/workflow.md` until Task 6 has run; its outcome goes
in that commit's body. Commit the others.

### Task 5 — The old names are gone

```bash
git grep -n -i -E "release candidate|pipeline/candidate|candidate(-caller)?\.yml|TROPIS_CANDIDATE|candidate (slot|rehearse)|rehears|pre-production" -- rules framework commands scripts guards templates
```

Passes when every hit is one of the expected kinds in *Traps* (list each with its kind in
the handover). Before the work this prints hits in `commands/release.md`,
`scripts/installed-files.js` and others, which is the failing output. Any other hit: fix
it and re-run.

### Task 6 — The fresh-agent check

The change rewrites what `/release` tells an agent to do. Probe it with a fresh session
that has only a scratch project:

```bash
P="$(mktemp -d)"; git clone -q "$PWD" "$P/tropis"; git -C "$P/tropis" remote remove origin
```

From `$P/tropis`, run the tool with read tools only (Read, Grep, Glob) and its tool calls
visible (in Claude Code, `claude -p --output-format stream-json --verbose`), piping:

> This is a probe; its output is discarded and nothing you say will be run. Read
> `commands/release.md` and act as `/release` would in a project set up from it. The
> project deploys to staging; its project-owned block was filled before this release and
> still says *Trigger* and *Candidate trigger*. Its `RELEASES.md` `## [Unreleased]`
> section ends with `Checked on the release candidate: (after the candidate)`. Its
> `docs/verification-log.md`'s newest entry has *Change* ``release candidate at `abc1234` ``
> and its latest round says `pass`. Since that commit, one pull request that changed
> `src/app.js` has merged into main. The version files are `package.json`. You cannot run
> commands. Say, in order, what you would do next and what you would print for the
> developer, and why.

**Passes when** the answer reads the old notes line and the old *Change* line as the
staging stage and a passed check, starts preparing the promotion pull request, finds that
`src/app.js` changed since the staged commit, and says step 1 (deploy to staging) must
run again for the head of the main branch — without printing a promote trigger and
without running anything. Any other answer: the command is not finished; reword, re-run,
and record each run. Delete `$P` afterwards. Commit `framework/workflow.md` with a body
saying what becomes true and, in one or two sentences, what the probe was asked, what it
answered, and the tool, version, operating system and architecture.

### Task 7 — Full suite, criteria, catalog, handover

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite (Trap's known one aside)
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

For each acceptance criterion of both entries, name the test, text or recorded check
that covers it and check it covers what the criterion describes; put the table in the
handover. Mark a criterion only a real run can show (the run lookup by `run-name`, the
log reading) as covered by the command text and outstanding for a real staging run.

In `feature-catalog.yaml`, on both entries: `status: shipped`; set `modules` to the
shipped files each changed (the first entry at least `scripts/pipeline.mjs`,
`commands/release.md`, `framework/workflow.md`; the second as listed now with the
template renamed to `templates/github/tropis-staging.yml`); and directly above each
`- id:` line add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-release-flow.md; each criterion's test
# or check is in that plan's handover report.
```

Leave `docs/backlog-board/bands.yaml` alone. Commit, re-run the two commands, then
`git diff --stat origin/main...HEAD` (passes: only *File Structure* files).

Append `## Handover report` to this plan with the six sections the planning rule names
(*Every plan ends with a handover report*), each check's command and its actual output,
the red checks' failing test names, the criteria table, the old-names hits with their
kinds, the probe's answer, and the worktree path used. Commit, push the branch, open a
pull request against `main` whose body says what becomes true and links this plan, and
stop. Do not write a review record and do not merge.

---

## Handover report

Executed by Claude Code 2.1.300 (model claude-opus-5-5) on macOS 26.2, arm64 (`uname -sm`:
`Darwin arm64`), with git 2.49.0 and Node.js v22.15.0. Started from `origin/main` at
`553841d` (the plan was verified against `191673f`; nothing between them touched this
plan's files). Worktree used: `../tropis-release-flow` beside the primary checkout, branch
`plan/release-flow`, created by `.tropis/scripts/isolate-for-plan.sh`. No other checkout
was edited.

Developer's override, given at dispatch: the branch is pushed, and **no pull request is
opened** — the reviewing session opens pull requests one at a time.

Provenance: no outside source was worked from. The new code follows this repository's own
patterns in `scripts/pipeline.mjs` (`branchSlot`'s error shape, the `git(root, args)`
helper, the `candidateCommand` dispatch it replaces).

### Task completion

- **Task 0** — done. `npm --prefix .tropis ci`, then `git status --porcelain` printed
  nothing. `bash scripts/check-blueprint.sh` on the untouched base **failed**, twice, on
  one clean-baseline test (see *Judgment calls*); I carried on rather than stop.
- **Task 1** — done. Tests first (commit `f554f58`), red, then the script, `git mv`s and
  installers (`31a26e5`), green. Both red checks run and dropped.
- **Task 2** — done. Tests (`1d9cb3c`), red, implementation (`471377f`), green. Both red
  checks run and dropped.
- **Task 3** — done (`a649fc1`, and `5bdc716` after the probe). The release guard's one
  workflow assertion was held back to the workflow commit (see *What the plan got wrong*).
- **Task 4** — done. `framework/DECISIONS.md`, `templates/README.md`, `RELEASES.md` in
  `4d42f48`. `framework/workflow.md` in `34bb726`, after Task 6, with the probe's outcome
  in its body.
- **Task 5** — done. Every hit is one of the kinds listed below.
- **Task 6** — done, two runs, both pass. Scratch clones deleted.
- **Task 7** — done, except the pull request (override above). Catalog in `9c490e3`, plus
  `6e8e314` for two other entries that named the renamed template.

### Verification results

**Task 1, red** (the guard snippet from Task 0 on `guards/pipeline.test.js`, after the
test commit): the suite did not load —
`SyntaxError: The requested module '../scripts/pipeline.mjs' does not provide an export named 'stagingSlot'`,
`Tests: 0 total`, `Test Suites: 1 failed`.

**Task 1, green:** `Tests: 101 passed, 101 total` for `guards/pipeline.test.js`.

**Task 1 red checks** (each a throwaway commit, run through the snippet, dropped with
`git reset --hard HEAD~1`):
- `pipeline/candidate/` refusal disabled → `Tests: 1 failed, 100 passed, 101 total`;
  failing: `staging slot › refuses the old pipeline/candidate/ folder, from slot and from deploy, and names the move`.
- `TROPIS_CANDIDATE` refusal disabled → `Tests: 1 failed, 100 passed, 101 total`;
  failing: `staging slot › refuses a staging script that still reads TROPIS_CANDIDATE, from slot and from deploy`.

**Task 2, red:** `Tests: 10 failed, 101 passed, 111 total` — every test under
`promote check` (two passes, refusals 1–6 in six tests, usage, the command listing).

**Task 2, green:** `Tests: 111 passed, 111 total`.

**Task 2 red checks:**
- ancestor-of-`HEAD` test disabled (`if (!onMain)` → `if (false)`) →
  `Tests: 1 failed, 110 passed, 111 total`; failing:
  `promote check › refuses a commit the main branch does not hold`.
- allow-list comparison disabled (`!allow.includes(path)` → `false`) →
  `Tests: 1 failed, 110 passed, 111 total`; failing:
  `promote check › refuses every path changed since staging that is not allowed, and names them all`.

**Task 3:** snippet on `guards/release.test.js` → `Tests: 77 passed, 77 total`. With the
workflow assertion restored after Task 4, on `guards/release.test.js`,
`guards/pipeline.test.js`, `guards/set-up-project.test.js` and
`guards/installed-files.test.js` together → `Tests: 221 passed, 221 total`.

**Task 5** — the plan's search, on the final tree, prints these hits; each is an expected
kind:

| Hit | Kind |
|---|---|
| `commands/release.md:19`, `:22` | the old notes line, read on resume (Decision 3 requires it) |
| `commands/release.md:317` | the old check *Change* line, read on resume (Decision 3) |
| `framework/DECISIONS.md:942–979` | FW-030's original text and its 2026-10-27 amendment |
| `framework/DECISIONS.md:985–990` | FW-030's new amendment: the name mapping |
| `framework/DECISIONS.md:1300–1307` | FW-041, the unrelated "rehearse the work" |
| `framework/workflow.md:20` | the unrelated citation of planning.md's *Do not rehearse the work to write its plan* |
| `rules/planning.md:67`, `:68` | the unrelated "rehearse the work" |
| `scripts/pipeline.mjs:345`, `:351`, `:353` | the two refusal messages |
| `guards/pipeline.test.js:390–427` | the two refusals' tests |
| `guards/release.test.js:537`, `:539`, `:542` | the assertions that `/release` reads both old resume forms |

The search is case-insensitive `-E` with no `\b`, so the macOS `git grep` gap does not
apply; it is shown to find planted hits by `rules/planning.md` (2 matches) being found.

**Task 6 — fresh-agent probe.** Claude Code 2.1.300, model claude-opus-5-5, macOS 26.2,
arm64. Run from a scratch clone at `$TMPDIR/tmp.*/tropis` with its remote removed:
`claude -p --output-format stream-json --verbose --allowedTools "Read,Grep,Glob" --disallowedTools "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent"`,
the plan's prompt piped in. The developer's user-level instructions say nothing about
releases or staging, so a local probe is a real one. The session's tool list still
carried some connector tools, but Bash, Edit and Write were absent. In both runs the only
call was `Read` of `commands/release.md`.

- **Run 1** (command at `4d42f48`) — **pass.** It read
  `Checked on the release candidate: (after the candidate)` as the earlier form and went
  to *Resume at staging*. It took the `abc1234` *release candidate at* entry with `pass`
  as the staged commit and went to Stage 7, where `git diff --name-only <staged> origin/main`
  listed `src/app.js`. It said it would not prepare the pull request, and that staging
  must be deployed and checked again at the head of main. It printed
  `Step 1 of 2 — deploy to staging` with the *Candidate trigger* read as the staging
  trigger. It printed no promote trigger and ran nothing. It raised two things:
  - Stage 7 asked for the version before running the comparison that throws it away.
    Fixed in `5bdc716`.
  - Notes drafted before a later merge are never redrafted (see *Outstanding*).
- **Run 2** (command at `5bdc716`) — **pass.** The same path. It now compared before
  asking for the version, said it would not ask for the version, and printed
  `Step 1 of 2 — deploy to staging` for the head of `origin/main`. It also said it would
  ask for the missing *Staging workflow* line, as the block instructs. No promote trigger,
  nothing run.

**Task 7** (on the final commit before this report, `6e8e314`):
- `bash scripts/check-blueprint.sh` →
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
  (clean baseline `ok`; 49 `caught` lines; no `missed` or `FAILED` line). The run on
  `9c490e3` printed the same last line.
- `npm --prefix .tropis test` → `Test Suites: 13 passed, 13 total`,
  `Tests: 137 passed, 137 total`. The first run, on `9c490e3`, failed one test:
  `catalog invariants › finds every shipped entry's modules`, with
  `release-is-rehearsed-on-a-candidate: module templates/github/tropis-candidate.yml does not exist`.
  Fixed in `6e8e314`. The Trap's known `set-up-project` failure did not appear: that
  guard is not among the installed release's 13 suites.

**Acceptance criteria**

| Entry · criterion | Covered by | Covers what it describes? |
|---|---|---|
| tags-what-main-holds · 1, the version and notes reach main through a pull request `/release` drafts after the check passes | `guards/release.test.js` *refuses the promotion when anything but the notes and version files changed…* and *commits the version with the notes where there is no staging…* (assert the command text); probe runs 1–2 | Command text only. An agent opening that pull request is outstanding for a real release |
| tags-what-main-holds · 2, the release pipeline tags a commit main holds and pushes only the tag | `guards/release.test.js` *states the promote step in the workflow document*; `guards/pipeline.test.js` *refuses a commit the main branch does not hold* | The refusal runs for real in a scratch repository. Tagging and pushing only the tag are the project's own pipeline, which the workflow states and nothing here runs |
| tags-what-main-holds · 3, refuses to tag on any change beyond notes and version files since the checked commit | `guards/pipeline.test.js` *refuses every path changed since staging…* (runs the check against a scratch main branch, including a commit merged after staging), red check above; `/release` Stage 7's two `git diff` checks, the probe | Yes for the shipped check. `/release`'s own refusal is command text, exercised by the probe |
| guides-through-both-steps · 1, the new names everywhere, the old ones only in migration and earlier records | Task 5 search and its table | Yes. The resume forms are the transition that criterion 7 asks for |
| guides-through-both-steps · 2, step 1 of 2 with its trigger, wait, then report the summary and by-hand list | `guards/release.test.js` *prints the two steps by their plain names…*, *finds the staging run by its commit…*; `guards/pipeline.test.js` summary-on-stdout tests and the caller's `run-name` assertion | Text and the summary's shape. **The run lookup by `run-name` and the log reading are outstanding for a real staging run** |
| guides-through-both-steps · 3, the check drafted and recorded in the same sitting, as `/manual-check` does | `guards/release.test.js` *drafts the check as /manual-check does…* | Command text only |
| guides-through-both-steps · 4, step 2 of 2 on a pass; a failure is recorded and stops; a rerun resumes at step 1 for the new commit | `guards/release.test.js` *prints the promote trigger only in step 2…*, *resumes from the new and the old notes line…*; probe runs 1–2 (resume and restart of step 1) | Command text, and the probe's reading of it |
| guides-through-both-steps · 5, the developer starts both steps and the command runs neither | `guards/release.test.js` *…never runs a trigger*; probe runs 1–2 (no command run, no promote trigger) | Yes as text. The probe could not run commands, so it shows intent, not restraint |
| guides-through-both-steps · 6, an old slot or caller is moved, or the project is told exactly what to rename, and nothing is lost silently | `guards/pipeline.test.js` two refusal tests (slot and deploy both exit 1, naming the fix, nothing runs); `RELEASES.md` by-hand steps 1–2, which `/update` performs | Yes for the slot and the variable. The old caller is covered only by the by-hand step; nothing checks it by machine |
| guides-through-both-steps · 7, the notes line is renamed and `/release` reads either form | `guards/release.test.js` *names all three endings…*, *resumes from the new and the old…*; probe runs 1–2 | Yes |

**After rebasing on `origin/main` at `a989f1e`** (two commits landed meanwhile:
`main-status` and the backlog; the rebase was clean): `bash scripts/check-blueprint.sh` →
`Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`;
`npm --prefix .tropis test` → `Test Suites: 13 passed, 13 total`,
`Tests: 137 passed, 137 total`. The rebase rewrote this branch's commits, so the short
hashes named in this report (`f554f58` … `6e8e314`) are those from before it; the
subjects are unchanged.

### Scope

`git diff --stat origin/main...HEAD` before this report: 17 files, 1030 insertions, 401
deletions. Files: `RELEASES.md`, `commands/release.md`, `feature-catalog.yaml`,
`framework/DECISIONS.md`, `framework/workflow.md`,
`guards/{framework-integrity,installed-files,pipeline,release,set-up-project}.test.js`,
`scripts/installed-files.js`, `scripts/pipeline.mjs`, `scripts/set-up-project.sh`,
`templates/README.md`, `templates/candidate-caller.yml → templates/staging-caller.yml`,
`templates/github/tropis-candidate.yml → templates/github/tropis-staging.yml`. With this
report, the plan file too. All are in *File Structure*. The catalog edit reaches two
entries outside the bundle (see *What the plan got wrong*). `bands.yaml` is untouched,
and so are `.claude/`, `.tropis/`, `.cursor/`, `.github/` and `CLAUDE.md`.

### Judgment calls

- **I carried on past a red baseline.** Task 0's self-check failed twice on `origin/main`
  with `main branch status › --pull-request › never asks twice to update the same head`:
  exit 3 instead of 0, a timeout under `--timeout 0.05`, in a 232-second run. Alone
  through the snippet, `guards/main-status.test.js` passed 37/37, and both Task 7
  self-checks passed. It is load-dependent timing in a file this plan does not touch, so
  it says nothing about the base. The plan said to stop.
- **Where the summary goes.** `staging deploy` now writes the summary to stdout always,
  and also to the file when `--summary` is given. Without `--summary` it no longer goes to
  stderr.
- **The old-layout refusals.**
  - The old folder is refused whenever `pipeline/candidate/` exists, even beside a filled
    `pipeline/staging/`.
  - The variable check reads every file under `pipeline/staging/`, recursively, and names
    the first in sorted order.
- **The promote check's output.**
  - Refusals go to stderr and the pass line to stdout.
  - Where the slot itself errors, refusal 4's place returns the slot's own `staging:`
    line, exit 1.
  - Three extra refusals cover git failing: `promote: could not compare …` and
    `promote: could not list what changed since staging`.
  - The diff uses `--no-renames`, so a renamed file names both paths.
  - The command listing's line uses `"$COMMIT"` and `"$STAGED"`, like the listing's other
    lines.
- **`/release`'s structure.**
  - Order: Stage 5 → *Step 1* → Stage 6 (the check) → *Resume at staging* → Stage 7 (the
    promotion pull request) → *Step 2*.
  - Stage 7 compares `git diff --name-only <staged> origin/main` before preparing
    anything, then runs the plan's `<staged> HEAD` check after its commit. It asks for the
    version only after the first comparison passes (probe run 1).
  - An extra resume case: a version section ending `Checked on staging: no — …` with no
    tag goes to *Step 2* with no `<staged>`.
  - A first release asks the developer for the version.
  - A block missing *Version files* or *Staging workflow* means asking the developer and
    suggesting the line.
  - Stage 5's empty-slot commit uses the same `release/<version>` worktree where the
    branch is gated.
- **The release guard.**
  - `describe('the /release candidate')` is rewritten as `describe('the /release steps')`.
  - Its workflow assertions now name the new text.
  - The fixtures for this repository's own release script at its top (`promote`,
    `checkReleased`) say `Checked on staging: yes`. The test
    `refuses notes whose release-candidate line still reads (ask)` is renamed
    `…checked line…`.
- **The pipeline guard.**
  - The `candidate slot` and `candidate rehearse` describes are renamed `staging slot` and
    `staging deploy`.
  - The command-listing test now checks that the staging lines are present rather than
    last, since the promote line now ends the list.
- **Wording.**
  - The operator guide names no old path, so the search stays clean; it says a project on
    an earlier layout is refused with the fix.
  - The workflow's upgrade bullet is reworded so it does not say "rehearsal".
- **The catalog.** `release-guides-through-both-steps` also lists
  `templates/staging-caller.yml` and `templates/README.md` among its modules.

### What the plan got wrong

- **Two other catalog entries name the renamed template.** The shipped
  `release-is-rehearsed-on-a-candidate` and the shaped
  `pipeline-bills-no-job-that-decides-nothing` both list
  `templates/github/tropis-candidate.yml` as a module, and the plan said to touch only
  this bundle's two entries. The catalog check failed on the shipped one. I renamed the
  path in both (`6e8e314`). Path only, nothing else changed in either.
- **Traps' list of expected old-name hits is incomplete.** It omits three kinds:
  - the resume forms in `commands/release.md` that Decision 3 itself requires;
  - their assertions in `guards/release.test.js`;
  - `framework/workflow.md:20`, which cites planning.md's "Do not rehearse" heading.
- **The plan did not mention `guards/release.test.js`'s fixtures** for this repository's
  own release script. They carried the old notes line, so the search found them; I
  changed them.
- **Task 3 cannot finish green as written.** It asks for the release guard to pass and be
  committed, while Decision 4's workflow text lands only in Task 4. I held that one
  assertion back and committed it with `framework/workflow.md`.
- **Not every guard runs through Task 0's snippet.** `guards/framework-integrity.test.js`
  reads `.claude/rules` beside its own folder, which the snippet's export does not have
  (`ENOENT … /.claude/rules`). It ran through the self-check instead.
- **The Trap about `set-up-project.test.js` is about a guard `npm --prefix .tropis test`
  does not run.** That command runs the installed release's 13 suites, so it could not
  show that failure.
- **Task 0 was red on the base before any change** (*Judgment calls*). The plan's
  stop-on-red would have ended the run on a timing fault in an unrelated file.

### Outstanding

- **A real deploy to staging.** Nothing here can exercise the run lookup by `run-name`,
  `gh run watch`, or reading the `### Deploy to staging` block from `gh run view --log`.
  Only the command text covers them. Someone has to see them work on an adopter's first
  release after this one.
- **A real promote pipeline.** Tagging and pushing only the tag are the project's own
  pipeline. Only the workflow's text and the shipped `promote check` cover them.
- **Stale notes after a restart (from probe run 1).** When Stage 7 sends the developer
  back to step 1 because something merged after staging, `## [Unreleased]` was drafted
  before that merge, and nothing offers to redraft it. The release can then ship a change
  its notes do not mention. This is a design question for the reviewer: a backlog entry,
  or a line in Stage 7.
- **A flaky main-status test.** `guards/main-status.test.js` *never asks twice to update
  the same head* failed twice under a full self-check, with exit 3 instead of 0 under
  `--timeout 0.05`, and passed on reruns. The workflow calls a check that passes on a
  rerun with nothing changed a bug, and it needs a backlog entry. I did not add one,
  because the catalog is outside this plan's scope beyond its two entries.
- **The old caller workflow is caught only by a release note.** `/update` performs
  step 2 of the notes. Nothing checks a project's `staging.yml` by machine. A
  `tropis-candidate.yml` caller left in place fails on GitHub once the update removes
  the workflow it calls.
- **This repository's own release script still says the old line.**
  `.github/scripts/release.mjs` (not shipped, outside scope) still says
  `answer "Checked on the release candidate" first` in its `(ask)` refusal.
- **FW-044's number.** It was free on `origin/main` when written. The reviewer renumbers
  if another session takes it first.
- **The pull request.** Not opened, per the developer's override; the reviewing session
  opens it.

## Review record

Reviewed by the specifying session, 2026-11-01, on `cfa053f`, with git 2.49.0 and Node
v22.15.0 in Claude Code 2.1.300 on Darwin arm64.

### Checks re-run

- Scope: `git diff --stat origin/main...HEAD` names 18 files, every one in *File
  Structure* (the template renames as `git mv`s), plus the two other catalog entries the
  handover explains.
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Tests: 137 passed, 137 total`.
- Re-break: a throwaway commit making `promoteCheck` ignore the allow list, then
  `guards/pipeline.test.js` through the Task 0 snippet: `Tests: 1 failed, 110 passed`.
  Commit dropped, never pushed.
- Read in full: `promoteCheck` and the slot's two old-layout refusals in
  `scripts/pipeline.mjs`, `commands/release.md`, FW-044 and FW-030's amendment, and the
  by-hand steps in `RELEASES.md`. They do what Decisions 1–6 say.

### Found

- **The notes can miss what merged since staging (judgement, not fixed here).** When
  Stage 7 or a failed check sends the developer back to step 1 for the head of the main
  branch, nothing offers to redraft the notes for what merged meanwhile. Whether to
  redraft, append or ask is a design choice, so it is a backlog idea,
  `release-notes-cover-a-restaged-commit`, added on this branch.
- **A main-status test passed on a rerun** on the untouched base (the handover's
  *Outstanding*). The workflow calls that a bug to record. Another session had raised it
  as `main-status-tests-pass-under-load` by merge time, so this branch adds this
  sighting to that idea instead of a second entry.
- Nothing mechanical to fix. The executor's deviations — renaming the template path in
  two other catalog entries, which the catalog check required, and holding one release
  test until the workflow text landed — are right.

### Outstanding disposition

- A real deploy to staging (finding the run by `run-name`, `gh run watch`, reading the
  summary from the log) and a real promote pipeline can be checked only on an adopter's
  first release after this one. Loose end, reported to the parent session; not run.
- The old caller is caught only by the release note's by-hand step, which `/update`
  performs; the slot refuses the old folder and variable by machine. Accepted.
- This repository's own `.github/scripts/release.mjs` still names the old notes line in
  one message. It is not shipped and changes when this repository takes the release.
- FW-044 was free on `origin/main` at review; renumber at merge if another session takes
  it first.

### Learnings routed

- Plan check: a plan may not quote a worktree command outside its Repositories table,
  even inside a decision about what a command must print; already in `AGENTS.md`'s
  gotchas, no new rule.
- The two findings above are backlog ideas: one added on this branch, one a sighting
  added to an existing idea. Nothing else generalises:
  this repository is the upstream, so there is no queue entry.

### Merged because

Every criterion of both entries is covered by a test, the command text or the probe, as
the handover's table shows, apart from the real runs above, which nothing here can
exercise. The pull request carries both entries to shipped and removes their band rows.
