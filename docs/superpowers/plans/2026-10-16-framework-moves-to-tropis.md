# The framework lives in .tropis/, and an earlier install moves there — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** A project set up from the next release holds the framework in `.tropis/`, not
`.framework/`. `node <tropis>/scripts/take-version.mjs <project>` brings a project installed
by an earlier release onto that layout. That covers both a `v0.1.0` install (shipped rules
hand-edited in `.claude/rules/`, no areas file, no record) and an install from `main`
between `v0.1.0` and now (areas file, possibly a record, but still in `.framework/`).

**Spec:** the entry `project-takes-a-framework-version` in `feature-catalog.yaml`. Read its
thirteen acceptance criteria and every dated comment above it, including the 2026-10-15 note
from the review of the first plan about shipped hooks under `.tropis/`. The first plan,
`docs/superpowers/plans/2026-10-15-take-a-framework-version.md`, built the command this
plan extends. Read its *Decisions* (numbered 1–15 there; cited below as **P1-D<n>**) and its
review record. FW-012 and FW-014 in `framework/DECISIONS.md` describe the rule-areas layout
and the update model.

**This is the second of three plans for the entry.** This one builds the move. The third,
written after the developer cuts the release this plan makes possible, runs the command on
this repository and ships the entry. A release must exist on `main` before anything can take
it, so the third plan cannot be part of this squash. This plan delivers nothing.

**What the specifying session verified on 2026-10-16, against `main` at `822a3f5`:**

- **What names `.framework` in the source.** `git grep -l '\.framework'` over `rules/`,
  `framework/`, `commands/`, `scripts/`, `guards/`, `templates/`, `fixtures/`, `README.md`,
  `bootstrap.md` and `.github/` lists the 57 files in *File Structure*, about 420 lines.
  - Two fixture folders are named `.framework`: `fixtures/base/.framework/rules/` (five rule
    stubs) and the defects `edited-framework-file/.framework/scripts/next.mjs` and
    `plain-reply/.framework/hooks/hook-reply.sh`.
  - `templates/rule-areas.json` gives `harness-scripts` the area `[".framework/**"]`.
  - `templates/package.json` names the package `PROJECT_SLUG-framework`. It has no dot and
    is not part of this rename.
  - `.claude/framework/` and `framework/` do not match `\.framework`.
- **`v0.1.0`'s setup** (`git show v0.1.0:scripts/set-up-project.sh`) has no areas file and
  no `.framework/rules/`. It copies `rules/*.md`, each with a `paths: [...]` header, straight
  into `.claude/rules/`, and runs `.framework/scripts/generate-cursor-rules.mjs`. That script
  writes `.cursor/rules/<n>.mdc` with a JSON-array `globs:` line and **no hash line**. Its
  install lists match today's minus `submit-upstream.sh`, `installed-files.js` and
  `record-installed.mjs`, and it runs `generate-cursor-rules.mjs` instead of
  `generate-rules.mjs`. This repository is such an install. Its `.claude/rules/` holds the
  five shipped rules with widened headers, and its `.claude/settings.json` adds a
  `permissions.deny` list of `Edit(.framework/...)` entries.
- **`scripts/rule-areas.js`** exports `parseRule(text)`, which returns `{ paths, body }`
  (with `paths` taken from a one-line JSON `paths:` header, or `null`). It also exports
  `checkStamp(text)`, which returns `{ generated, intact }` from the trailing hash line.
- **`scripts/generate-rules.mjs`** removes an extra generated file only when it carries a
  stamp (line 117). An old unstamped `.mdc` would stay, and `--check` would report it as
  *extra*. It refuses a project rule in `.claude/rules/` that has a shipped rule's name.
- **`scripts/take-version.mjs`** at `822a3f5`:
  - refuses a project without `.claude/rule-areas.json` (lines 224–227);
  - treats a hook as shipped when its command contains `.framework/hooks/` (line 142);
  - reads the record at `.framework/installed.json` (line 229).
- **CI.** `.github/workflows/ci.yml`'s `self-check` job uses `actions/checkout@v4` with the
  default depth, so it has no tags. The `release` job uses `fetch-depth: 0`.
- **The self-check** stages `HEAD` with `git archive` (no `.git` in the stage) and runs every
  guard against a composed sample project. The repository has one tag, `v0.1.0`.

**Model tier: Medium.** The rename is mechanical, with its exclusions stated. The migration
is specified rule by rule below.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 7 (record its version and machine).

**Merge authority: parent review.** It moves every project's framework folder, and the
specifying session holds the decisions.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-move -b plan/project-takes-a-framework-version-move` |

## Global Constraints

- **Do not reopen a decision under *Decisions*, or one of P1-D1 to P1-D15.** If one cannot
  be built as written, stop and report.
- **Do not edit `.claude/`, `.framework/`, `.cursor/` or `CLAUDE.md` in this repository.**
  They hold the installed `v0.1.0` and this repository's entry file. Updating them is the
  third plan's.
- **Do not rewrite history.** Leave these as they are:
  - FW-001 to FW-014 in `framework/DECISIONS.md`;
  - released sections of `RELEASES.md`;
  - everything under `docs/superpowers/`;
  - `feature-catalog.yaml`.

  They record what was true when written.
- **No new dependency.** Node built-ins only in shipped and command code.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken by the specifying session on 2026-10-16, within the entry's shaping. Do not reopen
them.

1. **The new layout.** Everything setup put in `.framework/` it now puts in `.tropis/`. The
   record is `.tropis/installed.json`, and P1-D3's shipped roots and exclusions read
   `.tropis/`. Setup's presence check also refuses a project that has `.framework/`:
   `set-up-project: <project> already holds the framework in .framework/. Take this release with node scripts/take-version.mjs <project> from this checkout instead.`
2. **The source rename.** In every file in *File Structure* marked *rename*, replace
   `.framework` with `.tropis` where it names the folder. Use `git mv` for the fixture
   folders. **Excluded:**
   - FW-001 to FW-014;
   - `## [Unreleased]` notes that describe the past;
   - in `scripts/take-version.mjs`, `scripts/installed-files.js` and their guards, the code
     and cases that deal with the old folder on purpose (Decisions 3–9).

   The `## [Unreleased]` note under *The framework is called Tropis* that says the move is a
   later plan is rewritten: the move is this release's.
3. **Layouts the command recognises**, checked after the refusals of P1-D9 that come before
   it (tag, git root, clean tree):
   - **current:** `.tropis/` exists and `.framework/` does not;
   - **areas layout, old folder:** `.framework/` exists, `.tropis/` does not, and
     `.claude/rule-areas.json` exists;
   - **`v0.1.0` layout:** `.framework/` exists, `.tropis/` does not, and there is no
     `.claude/rule-areas.json`;
   - **both folders:** refuse with
     `take-version: <project> has both .framework/ and .tropis/. Remove the one that is not in use, commit, and run again.`
   - **neither:** refuse with
     `take-version: <project> has no .tropis/ or .framework/. Set it up with scripts/set-up-project.sh first.`

   P1-D9's refusal for a project without an areas file is deleted. The record is read from
   `<folder>/installed.json` in whichever folder exists. The `--from` and version refusals
   are unchanged.
4. **The move**, for both old-folder layouts. It happens after every refusal and after both
   scratch builds, and before anything else is written.
   - Rename the directory `.framework` to `.tropis` with `renameSync`, so the project's own
     files inside it move too.
   - In the baseline's paths, the record's or the scratch's, replace the leading
     `.framework/` with `.tropis/`.
   - The scratch build of an old version (P1-D6) is set up into `.framework/`. Its
     fingerprints are taken there and its keys mapped the same way.
5. **Strings that name the old folder, on the move:**
   - **`.claude/settings.json`:** in every string value anywhere in the file, replace each
     `.framework/` with `.tropis/`. That includes the project's own hook commands and
     `permissions` entries.
   - **`.gitignore` and `.gitattributes`:** in each line containing `.framework/`, replace
     it with `.tropis/`, in place.
   - **`.claude/rule-areas.json`:** in each glob that starts with `.framework/`, replace that
     prefix with `.tropis/`.

   P1-D8's append and key adjustment then run as before.
6. **Which hooks are shipped.** Replace P1's substring test.
   - A hook is shipped when its `command` contains `.tropis/hooks/<name>` or
     `.framework/hooks/<name>`, where `<name>` is the file name of a file under the hooks
     folder in the baseline's paths or the new version's.
   - A project's own script in that folder, under a name the framework never shipped, is the
     project's hook: it is kept, and rewritten by Decision 5.
7. **The `v0.1.0` layout's rules.**
   - **Shipped names.** Let S be the shipped rule names of the held version: the basenames
     of the `.claude/rules/*.md` files in the baseline scratch.
   - **Areas.** For each key k of the new version's areas file:
     - if the project has `.claude/rules/<k>.md` and k is in S, its area is that file's
       `parseRule(...).paths`, rewritten by Decision 5;
     - otherwise it is the new version's default.

     Write `.claude/rule-areas.json` in P1's `areasText` layout.
   - **Edited text.** For each n in S that the project has as `.claude/rules/<n>.md`, compare
     `parseRule(project).body` with `parseRule(baseline scratch).body`. If they differ, write
     the project's whole file to `.claude/rule-additions/<n>.md.old`. The generator ignores
     non-`.md` files there.
   - **Cleanup.** Then delete `.claude/rules/<n>.md` for every n in S. The project's own
     rules (names not in S) stay. Delete every `.cursor/rules/<m>.mdc` that has no stamp
     (`checkStamp(...).generated` false) and whose `<m>.md` was in `.claude/rules/` before
     this step. The generator rewrites both folders afterwards.
   - Do all of this before P1-D11's per-path pass.
8. **What the report adds.**
   - `Moved .framework/ to .tropis/` and `Rewrote .framework/ to .tropis/ in: <files>`,
     covering settings, ignore files and areas.
   - `Rule areas taken from your rules' headers: <names>`.
   - `You had edited these shipped rules; your text is in .claude/rule-additions/<n>.md.old: <names>`,
     followed by the line
     `Move the lines you added into .claude/rule-additions/<n>.md, then delete the .old file.`
   - `Still names .framework/:` lists every file whose text contains `.framework/`, among
     the files from `git ls-files -co --exclude-standard` that sit under `.claude/`,
     `.cursor/`, `.tropis/` or at the root (`CLAUDE.md`, `AGENTS.md`, `package.json` and
     the like), excluding `.new` and `.old` files. These are files the command does not
     own, such as the entry files and the project's own rules and scripts.
   - The next steps start with `npm --prefix .tropis install` after a move.
9. **The self-check gets `v0.1.0`.**
   - `scripts/check-blueprint.sh` runs `git -C "$BP" archive v0.1.0` into a folder beside
     the stage, removed by the same trap, and exports its path as `TROPIS_V010` to the run.
     If the tag is missing, it exits 2 with
     `The self-check needs the tag v0.1.0: git fetch --tags.`
   - The `self-check` job in `.github/workflows/ci.yml` checks out with `fetch-depth: 0`.
   - A test that needs `TROPIS_V010` and finds it unset **fails**, naming the variable and
     `bash scripts/check-blueprint.sh`. It never skips.
10. **Release notes.** `## [Unreleased]` gets a section *The framework moves to `.tropis/`*,
    marked **breaking**. It tells an operator on `v0.1.0`, or on an install from `main` in
    `.framework/`, to:
    - check out this release in their Tropis clone and run
      `node scripts/take-version.mjs <project> --from v0.1.0 --accept-breaking` (an install
      with a record needs no `--from`);
    - fix each file listed as still naming `.framework/`, starting with `CLAUDE.md` and
      `AGENTS.md`;
    - move any `.md.old` additions;
    - run `npm --prefix .tropis install` and `npm --prefix .tropis test`;
    - commit.

    Remove the first plan's sentence that a `v0.1.0` project cannot use the command yet.

## Traps

- **The source guards have one runner: `bash scripts/check-blueprint.sh`, and it reads
  committed content only.** Commit, then run it. Red commits on the branch are expected and
  vanish in the squash. `npm --prefix .framework test` runs the installed `v0.1.0`'s guards
  on this repository, and keeps working through this plan because this plan does not touch
  `.framework/`.
- **The rename will tempt you into the installed copy.** `.claude/`, `.framework/`,
  `.cursor/` and this repository's `CLAUDE.md` all say `.framework`, and they are correct
  until the third plan. Every file you edit is a source file in *File Structure*.
- **Conformance runs each defect's guard by a filename fragment.** If you rename a guard,
  update `CASES`. Do not rename guards.
- **`guards/readme-usable.test.js` line 63 expects the README to match `.framework/`.** It
  is in the rename. After the rename it must expect `.tropis/`, and the README must say it.
- **The setup test's file list builds paths from `.framework/`.** After the rename every
  path in it reads `.tropis/`. If any still says `.framework/`, the test fails without
  making clear why.
- **`v0.1.0`'s setup runs in scratch and may print to stderr.** P1-D6 refuses only on a
  non-zero exit, and that stays.
- **A plan that quotes a worktree command outside its Repositories table is refused** by
  the plan check. Do not paste one into the handover. Describe it instead.

## Review Focus

Inputs no criterion names, most likely first. Each has its test in Task 4.

- A `v0.1.0` project whose `CLAUDE.md` names `.framework`: listed, not rewritten.
- A project's own hook script in `.framework/hooks/` under a name the framework never
  shipped: moved, kept and rewritten, not dropped as shipped.
- A shipped `v0.1.0` rule the project deleted: the new version's default area, and nothing
  written to `.old`.
- An old `.mdc` for the project's own rule: deleted and regenerated with a stamp.
- `.framework/node_modules/` present at the move: moves with the folder, and is still
  ignored afterwards under `.tropis/node_modules/`.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | Decisions 3–8; old-folder code kept on purpose |
| `scripts/installed-files.js` | Rename: roots and exclusions under `.tropis/` |
| `scripts/set-up-project.sh` | Rename; Decision 1's refusal |
| `scripts/check-blueprint.sh` | Rename; Decision 9 |
| `.github/workflows/ci.yml` | `fetch-depth: 0` on `self-check` (Decision 9) |
| `guards/take-version.test.js` | Rename; the old-layout cases in Task 4; the P1 *old layout refused* case is replaced |
| `guards/set-up-project.test.js` | Rename; a case for Decision 1's refusal |
| `RELEASES.md` | Decision 10; the Tropis-name note rewritten (Decision 2) |
| `framework/DECISIONS.md` | New FW-015: the folder is `.tropis/`, and how an earlier install moves. FW-001–FW-014 untouched |
| `fixtures/base/.framework/rules/*.md` (five files) | `git mv` to `fixtures/base/.tropis/rules/`; rename inside |
| `fixtures/defects/edited-framework-file/.framework/scripts/next.mjs` | `git mv` to `.tropis/scripts/` |
| `fixtures/defects/plain-reply/.framework/hooks/hook-reply.sh` | `git mv` to `.tropis/hooks/` |
| `README.md`, `bootstrap.md`, `fixtures/README.md` | Rename. README's *Taking a new version* loses "cannot be updated yet" and names the move |
| `commands/bootstrap.md`, `commands/capture-learning.md`, `commands/dispatch.md`, `commands/flush-upstream.md`, `commands/scope.md` | Rename |
| `framework/dispatch.md`, `framework/rule-delivery.md`, `framework/workflow.md` | Rename |
| `rules/harness-scripts.md`, `rules/learnings.md`, `rules/planning.md` | Rename |
| `fixtures/base/.claude/rule-areas.json`, `fixtures/defects/hand-edited-rule/.claude/rules/catalogs.md` | Rename |
| `guards/catalog-entries.test.js`, `guards/check-drift.test.js`, `guards/dispatch.test.js`, `guards/installed-files.test.js`, `guards/next-report.test.js`, `guards/plan-dispatchable.test.js`, `guards/readme-usable.test.js`, `guards/rule-additions.test.js`, `guards/rule-areas.test.js`, `guards/rule-delivery.test.js`, `guards/rules-generated.test.js`, `guards/submit-upstream.test.js` | Rename |
| `scripts/capture-at-merge.sh`, `scripts/capture-at-write.sh`, `scripts/check-conformance.sh`, `scripts/check-drift.sh`, `scripts/check-prerequisites.sh`, `scripts/dispatch.mjs`, `scripts/generate-rules.mjs`, `scripts/isolate-for-plan.mjs`, `scripts/plan-binding.js`, `scripts/probe-hook-channels.sh`, `scripts/projections.js`, `scripts/record-installed.mjs`, `scripts/rule-areas.js`, `scripts/submit-upstream.sh` | Rename |
| `templates/CLAUDE.md`, `templates/README.md`, `templates/framework-jest.config.js`, `templates/project-layout.test.js`, `templates/rule-areas.json`, `templates/settings.json` | Rename |

## Tasks

### Task 1: The rename

1. `git mv` the three fixture folders (Decision 2).
2. Replace `.framework` with `.tropis` in every *Rename* file. Inside
   `scripts/take-version.mjs`, `scripts/installed-files.js` and `guards/take-version.test.js`,
   rename only what refers to the current layout. Tasks 3 and 4 add the old-folder handling.
3. Add Decision 1's refusal to setup, with its test.
4. Run `git grep -n '\.framework' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md .github`.
   Every remaining line must be one of:
   - FW-001 to FW-014;
   - take-version code or tests that deal with the old folder (none yet at this step);
   - setup's refusal;
   - a sentence in a page that names the old folder as the thing that moves.

   Paste the output into the handover.
5. Commit, run the self-check. Expected: green.

### Task 2: The self-check gets v0.1.0

Decision 9: `check-blueprint.sh` and `ci.yml`. Commit, run the self-check, and confirm it
prints nothing new and stays green. Then rename the tag lookup to a tag that does not exist,
and confirm it exits 2 with the message. Revert.

### Task 3: The move in the command

Decisions 3–8 in `scripts/take-version.mjs`. Import `parseRule` and `checkStamp` from
`./rule-areas.js`.

### Task 4: Tests for the move

**Files:** `guards/take-version.test.js`.

- **A world with `v0.1.0`.** A helper builds a scratch Tropis repository whose first commit
  is the tree at `TROPIS_V010`, tagged `v0.1.0`. Its second commit is the current source
  (copied as the existing helper does), tagged `v0.2.0`. The project is set up from `v0.1.0`
  and committed.
- **Running it.** Each case runs `v0.2.0`'s `take-version.mjs` with
  `--from v0.1.0 --accept-breaking` unless it says otherwise.

One `it` each:

- **An untouched `v0.1.0` project moves:**
  - `.framework/` is gone and `.tropis/` exists;
  - `.tropis/installed.json` holds `v0.2.0`, and `recordProblems` is empty;
  - `.claude/rule-areas.json` deep-equals `v0.2.0`'s template;
  - `node .tropis/scripts/generate-rules.mjs --check` exits 0;
  - every hook command in `.claude/settings.json` names `.tropis/hooks/`, and no hook
    appears twice;
  - `.gitignore` has `.tropis/node_modules/` and no `.framework/` line;
  - `.gitattributes` has `.tropis/ export-ignore`;
  - stdout lists `CLAUDE.md` and `AGENTS.md` under *Still names .framework/*;
  - nothing was committed.
- **A widened area is kept:** the project adds `"src/**"` to `tests.md`'s header and widens
  `harness-scripts.md` with `"scripts/**"`. Afterwards `tests` includes `src/**`, and
  `harness-scripts` holds `.tropis/**` and `scripts/**`.
- **Edited rule text:** the project adds a line to `tests.md`'s body.
  `.claude/rule-additions/tests.md.old` equals the project's file before the run, stdout
  names it, and `.claude/rules/tests.md` is `v0.2.0`'s generated text.
- **Own rule kept:** `.claude/rules/app.md` with a `paths:` header and its old `.mdc`. The
  `.md` is unchanged, and the `.mdc` is regenerated with a stamp.
- **Own hook and permissions:** the project adds `.framework/hooks/own-check.sh` and wires
  it first in the `Bash` group, and adds `permissions.deny: ["Edit(.framework/hooks/**)"]`.
  Afterwards the script is at `.tropis/hooks/own-check.sh`, its hook command names it and
  still runs first, and the deny entry reads `.tropis/`.
- **Deleted shipped rule:** the project deletes `.claude/rules/learnings.md`. Its area is
  `v0.2.0`'s default, and no `.old` is written.
- **Moved with a record (areas layout, old folder):** take a project set up from `v0.2.0`,
  then build the intermediate layout by hand:
  - rename `.tropis` to `.framework`;
  - rewrite the `.tropis/` strings in settings, ignore files and the areas file to
    `.framework/`;
  - rewrite the record's keys to `.framework/` and its version to `v0.1.0-1-g<hash of the
    v0.1.0 commit>`;
  - commit.

  Then tag a third commit `v0.2.1` and take it without `--from`. Afterwards the project is
  in `.tropis/`, `recordProblems` is empty, and there are no `.new` files.
- **Both folders, neither folder:** each refused with Decision 3's message, and nothing
  changed.
- **`TROPIS_V010` unset:** a direct call to the world helper with it unset throws a message
  naming the variable. This is a unit check of the helper and does not skip anything.

Replace P1's *refuses a project set up before rule areas were project data* case. Commit
after each group and run the self-check. See each case red once on a deliberate break, then
revert the break.

### Task 5: Pages

Decision 10's release section, README's *Taking a new version*, `templates/README.md`'s
paragraph (the move, and the `.old` file), and FW-015. FW-015 states:

- **Decision:** Decisions 1, 3–7.
- **Evidence:** the name decision in `blueprint-tool-agnostic-name`, and this repository's
  `v0.1.0` install.
- **Rejected:** a separate migration command, since one command is what an operator learns;
  keeping `.framework/` as an alias, since two folders mean two places for every path.
- **Consequences:** the release is breaking, and the entry files are listed rather than
  rewritten.

Commit, and run the self-check.

### Task 6: Full check on a real `v0.1.0` install

In a **throwaway clone** of your worktree (never tag or push from it):

1. Check out `v0.1.0`, set up a scratch project outside any repository, and commit it.
2. Check out your branch's `HEAD` and tag it `v0.2.0`.
3. Run `node scripts/take-version.mjs <scratch> --from v0.1.0 --accept-breaking`.
4. In the scratch project, run `npm --prefix .tropis install` and
   `npm --prefix .tropis test`.

Paste all outputs, then delete both folders.

### Task 7: Fresh-agent check

In a scratch project set up from your worktree, start a fresh Claude Code session (any
current CLI; record version and machine). Tell it:

> This is a probe and its output will be discarded. Without running anything, tell me where
> this project's framework hook scripts live, and the command that runs the framework's
> checks.

Pass if it answers `.tropis/hooks/` and `npm --prefix .tropis test`, from the installed
documents. Paste the reply.

### Task 8: Self-check, scope, handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .framework test
git diff --stat origin/main...HEAD
```

The second command runs this repository's installed `v0.1.0` checks, which still live in
`.framework/`. Expected:

- the self-check is green;
- the installed checks are green;
- every file in the diff appears in *File Structure*, and the fixture renames show as
  renames.

Append `## Handover report` with the six sections the planning rules name, and commit. In
*Outstanding*, tell the developer to start the release job with `bump=major`.
`.github/scripts/release.mjs` turns that into `v0.2.0` below 1.0, and `minor` would give a
patch. Do not promote the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence here |
|---|---|
| First run moves `.framework/` to `.tropis/`, rewrites what names it; suite passes and hooks speak | `take-version.test.js` › *An untouched `v0.1.0` project moves*, *Own hook and permissions*, *Moved with a record*; Task 6. Hooks speaking to an agent: **third plan**, on this repository |
| First run moves shipped rule texts and areas; own rules stay; edited text listed | › *A widened area is kept*, *Edited rule text*, *Own rule kept*, *Deleted shipped rule* |
| This repository updated from `v0.1.0`; suite passes | **Third plan** |
| README tells an adopter how, and what to do with `.new` | Kept true by Task 5; Task 7 |

## Not in this plan

- **Updating this repository**, its `CLAUDE.md`, its settings and its installed copy: the
  third plan, after the developer releases.
- **`update-survives-a-dropped-edited-rule`** and **`update-skips-a-new-file-that-matches`**:
  their own entries.

## Handover report

### Task completion

1. Done. `.framework` renamed to `.tropis` in the source, fixtures moved with `git mv`, setup refuses a project that still has `.framework/`.
2. Done. The self-check archives `v0.1.0`, exports `TROPIS_V010`, and exits 2 when the tag is missing. CI checks the self-check job out with `fetch-depth: 0`.
3. Done. `scripts/take-version.mjs` moves an earlier install before any other write.
4. Done. The old-layout cases, the record case, both/neither, and the unset-archive case. Each was seen red on a deliberate break, then restored. Committed in three groups, each self-checked.
5. Done. Release section, README, operator guide, FW-015. The first citation of the plan path failed the clean baseline; the follow-up commit names the plan in prose.
6. Done. Throwaway clone of a real `v0.1.0` install, then deleted.
7. Done. Fresh Claude Code session. Pass.
8. Done. Self-check, installed checks, and the scope diff below. This section is the last commit.

### Verification results

**Task 1 remaining `.framework` lines** (`git grep -n '\.framework' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md .github`):

```
framework/DECISIONS.md:166:paragraph. `.framework/scripts/check-prerequisites.sh` reports what is missing and how to
framework/DECISIONS.md:232:guide, `.framework/README.md` (what an operator of an adopting project is told),
framework/DECISIONS.md:284:`.framework/hooks/hook-reply.sh` with `hookSpecificOutput.additionalContext`, never a
framework/DECISIONS.md:294:`.framework/scripts/probe-hook-channels.sh` repeats it.
framework/DECISIONS.md:346:`.framework/` and root, all committed. Every command runs from an entry point under
framework/DECISIONS.md:347:`.framework/`, and `.gitattributes` keeps the framework out of an exported copy. The
framework/DECISIONS.md:360:`.framework/` — the developer chose copies with fingerprints on 2026-10-09
framework/DECISIONS.md:408:**Decision:** The text of each shipped rule lives in `.framework/rules/<name>.md` with no
framework/DECISIONS.md:411:areas. `.framework/scripts/generate-rules.mjs` (`npm --prefix .framework run rules`) writes each
framework/DECISIONS.md:489:**Decision:** `.framework/installed.json` records the version a project holds and a
framework/DECISIONS.md:496:Shipped files are every file under `.framework/`, `.claude/framework/` and
framework/DECISIONS.md:497:`.claude/commands/`, except `.framework/node_modules/`, `.framework/package-lock.json`,
framework/DECISIONS.md:498:the record itself and `.framework/README.md` — the project's operator guide. Generated
framework/DECISIONS.md:505:whose command contains `.framework/hooks/` — are removed from the project, and the new
guards/set-up-project.test.js:229:  it('refuses a project that already holds the framework in .framework/', () => {
guards/set-up-project.test.js:232:      mkdirSync(join(dir, '.framework'));
guards/set-up-project.test.js:233:      writeFileSync(join(dir, '.framework/installed.json'), '{}\n');
guards/set-up-project.test.js:241:        `set-up-project: ${project} already holds the framework in .framework/. `
scripts/set-up-project.sh:12:# framework in .framework/. Never commits.
scripts/set-up-project.sh:27:if [ -e "$PROJECT/.framework" ]; then
scripts/set-up-project.sh:28:  echo "set-up-project: $PROJECT already holds the framework in .framework/. Take this release with node scripts/take-version.mjs $PROJECT from this checkout instead." >&2
```

Those are FW-001–FW-014 and Decision 1's refusal.

**Task 2 missing tag.** The lookup was pointed at `v9.9.9-missing`. The first run printed `The self-check needs the tag v0.1.0: git fetch --tags.` and exited 1, because the cleanup trap's failing test became the script status. After the trap was changed to an `if`, the same probe printed that line and exited 2. The lookup was reverted and committed as `cf71d8f`.

**Task 4, full suite** (`TROPIS_V010` set to an archive of the `v0.1.0` tag):

```
PASS guards/take-version.test.js (56.842 s)
Tests:       27 passed, 27 total
```

Each new case was then broken and run alone. Jest exited non-zero for: untouched move (rename skipped), widened area (globs not rewritten), edited rule (`.old` not written), own hook (settings strings not rewritten), deleted shipped rule (area set to `[]`), record layout (baseline keys not mapped), both folders, neither folder, and `TROPIS_V010` unset. Leaving an unstamped cursor file in place left *keeps a project rule* green, because the generator overwrites it; deleting the project's own rule as well made that case red. The breaks were restored. `cmp` matched the saved copies.

**Self-check** (`bash scripts/check-blueprint.sh`) after the rename, after the archive export, after each Task 4 group, and after the citation fix. The Task 8 run, on `2576fed`:

```
Checking 2576fed of ~/src/tropis-move

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

The notes commit `a7737ac` failed that clean baseline:

```
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● framework integrity › references no file that does not exist
```

`2576fed` is the fix. Its self-check is the output above.

**Installed checks** (`npm --prefix .framework test`):

```
PASS guards/project-layout.test.js
PASS guards/rule-areas.test.js
PASS guards/catalog-entries.test.js

Test Suites: 3 passed, 3 total
Tests:       4 passed, 4 total
```

**Task 6.** A throwaway clone, checked out at `v0.1.0` (`8aa2446`), set up `/tmp/tropis-task6-project` and committed it (`57 files changed, 5383 insertions(+)`). The throwaway then checked out this branch and was tagged `v0.2.0`. `git describe --exact-match HEAD` (no `--tags`) printed `fatal: no tag exactly matches '2576fed0ff277d269017ce33e3b795d52d9fc1dd'` because the tag is lightweight. The command uses `git describe --tags --exact-match` and accepted it.

Setup:

```
Wrote 5 rule files to .cursor/rules/
Set the framework up in /private/tmp/tropis-task6-project.
Next, from there: npm --prefix .framework install, then npm --prefix .framework test, then commit.
setup_exit=0
```

`node scripts/take-version.mjs <scratch> --from v0.1.0 --accept-breaking`:

```
take-version: /tmp/tropis-task6-project now holds v0.2.0 (was v0.1.0).

Replaced:
  .claude/commands/bootstrap.md
  .claude/commands/capture-learning.md
  .claude/commands/dispatch.md
  .claude/commands/flush-upstream.md
  .claude/commands/idea.md
  .claude/commands/next.md
  .claude/commands/scope.md
  .claude/framework/DECISIONS.md
  .claude/framework/dispatch.md
  .claude/framework/rule-delivery.md
  .claude/framework/workflow.md
  .tropis/guards/catalog-entries.test.js
  .tropis/guards/project-layout.test.js
  .tropis/guards/rule-areas.test.js
  .tropis/hooks/capture-at-merge.sh
  .tropis/hooks/capture-at-write.sh
  .tropis/jest.config.js
  .tropis/package.json
  .tropis/scripts/check-prerequisites.sh
  .tropis/scripts/dispatch.mjs
  .tropis/scripts/isolate-for-plan.mjs
  .tropis/scripts/next-work.js
  .tropis/scripts/next.mjs
  .tropis/scripts/plan-binding.js
  .tropis/scripts/probe-hook-channels.sh
  .tropis/scripts/projections.js
  .tropis/scripts/rule-areas.js

Added:
  .tropis/guards/installed-files.test.js
  .tropis/guards/rules-generated.test.js
  .tropis/rules/catalogs.md
  .tropis/rules/harness-scripts.md
  .tropis/rules/learnings.md
  .tropis/rules/planning.md
  .tropis/rules/tests.md
  .tropis/scripts/generate-rules.mjs
  .tropis/scripts/installed-files.js
  .tropis/scripts/record-installed.mjs
  .tropis/scripts/submit-upstream.sh

Deleted, no longer shipped:
  .tropis/scripts/generate-cursor-rules.mjs

Moved .framework/ to .tropis/

Rewrote .framework/ to .tropis/ in: .claude/settings.json, .gitignore, .gitattributes, .claude/rule-areas.json

Rule areas taken from your rules' headers: catalogs, harness-scripts, learnings, planning, tests

Still names .framework/:
  .claude/framework/DECISIONS.md
  .tropis/README.md
  AGENTS.md
  CLAUDE.md

Next:
  npm --prefix .tropis install
  npm --prefix .tropis test
  Commit.
take_exit=0
```

`npm --prefix .tropis install` added 268 packages in 9s (`install_exit=0`), with the usual deprecation warnings for `inflight` and `glob`. `npm --prefix .tropis test`:

```
PASS guards/rule-areas.test.js
PASS guards/project-layout.test.js
PASS guards/catalog-entries.test.js
PASS guards/rules-generated.test.js
PASS guards/installed-files.test.js

Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Time:        0.427 s
test_exit=0
```

Both folders were deleted.

**Task 7.** Claude Code `2.1.300`, on the developer's MacBook Pro (`uname -sm` Darwin arm64, `sw_vers` 26.2). Scratch project set up from this worktree. Session: `claude -p --permission-mode plan --permission-prompts none`, prompt exactly as written. Reply:

```
The framework's hook scripts are in **`.tropis/hooks/`**. They're connected to Claude Code in `.claude/settings.json`:

- `capture-at-write.sh` runs on Edit and Write.
- `capture-at-merge.sh` runs on `gh pr merge`.
- `framework-commit-check.sh` runs on `git commit`.
- `hook-reply.sh` is the shared helper every hook uses to send its message back to the agent.

The command that runs the framework's checks is `npm --prefix .tropis test`.

`.tropis/README.md` says to run it before merging any change to `.claude/` or `.tropis/`. I only read files to answer this; I didn't run anything.
```

Pass: `.tropis/hooks/` and `npm --prefix .tropis test`. This plan did not edit `.claude/framework/` or `.claude/rules/`, so the outcome is recorded here and not in a commit that touches those paths.

### Scope

`git diff --stat origin/main...HEAD` before this handover commit: 64 files, 951 insertions, 338 deletions. Every path is in *File Structure*. The fixture moves are renames (`R100`, and `R064` for `harness-scripts.md`, whose text changed in the rename). This commit adds this plan file, which the plan requires and which is not in that table.

### Judgment calls

- A current-layout project with no areas file is still `current`. The areas it is given start empty, and the existing fill-in of missing defaults applies. The old refusal is gone.
- A `v0.1.0` header whose `paths` is not an array is given the new default and is not listed as taken from headers.
- The record-layout case passes `--accept-breaking` as well as taking `v0.2.1` without `--from`. A held `v0.1.0-1-g…` to `v0.2.1` is breaking below 1.0.
- "No hook appears twice" is checked per matcher group. Edit and Write both run `capture-at-write.sh`, so a set of every command in the file is smaller than the list.
- The name note keeps the sentence about the old address in the operator guide, and now says the move is this release's.
- The command section keeps "Not breaking. This is the first release with the command." The sentence that a `v0.1.0` project cannot use it yet is removed. The move is the breaking section.
- FW-015 names the plan in prose. A backtick path would be followed by the integrity check inside a set-up project, which does not have this repository's plans.

### What the plan got wrong

- "No hook appears twice" cannot be a single set of every command. Two matchers share one script on an untouched install.
- *Own rule kept* stays green if the old unstamped cursor file is left for the generator to overwrite. The deletion the decision asks for is not what that case fails on.
- The record case, as written ("take it without `--from`"), is refused until `--accept-breaking` is also passed.

### Outstanding

The developer starts the release job with `bump=major`. `.github/scripts/release.mjs` turns that into `v0.2.0` below 1.0, and `minor` would give a patch. Do not promote `project-takes-a-framework-version`. The third plan, after that release, updates this repository and ships the entry.

Parent review merges. This session does not.

The commits on this branch carry the tool's `Co-authored-by` trailer. The squash subject and body should not.

## Review record

Reviewed by the specifying session on 2026-10-16, against `f8e48b1`, then `2a73e64` after
the reviewer's fixes below.

### Checks re-run

- **`bash scripts/check-blueprint.sh`, run by the reviewer seven times.**
  - Once on `f8e48b1`: exit 0, all 16 defects caught, clean baseline ok.
  - Six times on the fix commit: five passed. One failed the clean baseline with
    `FAILED      clean baseline — a guard fails on a project with nothing wrong`. Its output
    was not kept past the summary line, so which guard failed is not known.
  - The next five runs were all green. See *Outstanding disposition*.
- **The pull request's `self-check` job** passed on the fix commit (1m54s). With
  `fetch-depth: 0` it had the `v0.1.0` tag. That is the first CI run to build the `v0.1.0`
  world.
- **`git diff --stat -M origin/main...HEAD`:** 65 files, the 64 in *File Structure* plus
  this plan. The fixture moves show as renames.
- **The handover's remaining-`.framework` grep** holds only FW-001 to FW-014 and Decision 1's
  refusal, as the handover reported.
- **`scripts/take-version.mjs`, read against Decisions 3–8:**
  - every refusal comes before the rename;
  - both scratch builds happen before `relocate`;
  - shipped hooks are judged by the file names in the baseline's and the new version's
    hooks folders;
  - settings, ignore lines and areas are rewritten on the move;
  - `migrateV010Rules` takes areas from the headers, writes `.old` for edited text, and
    deletes only unstamped `.mdc` files whose `.md` existed.
- **The handover's Task 6 output** (a real `v0.1.0` install moved, then `npm test` 28/28)
  was consistent with the code. It also showed the first finding below.

### Found

1. **The *Still names .framework/* list included shipped files.** Task 6's report listed
   `.claude/framework/DECISIONS.md`, which the command had just replaced and which names the
   old folder only in FW-001 to FW-014. Every moved project would have been told to fix a
   file it does not own and must not edit. This contradicts Decision 8 ("files the command
   does not own"). **Fixed on the branch by the reviewer:** `stillNamesFramework` skips
   every path in the new version's shipped files. The *untouched `v0.1.0` project moves*
   case asserts that no `.claude/framework/` path is listed. This is mechanical and
   declared here. The developer's run of the third plan exercises it on this repository.
2. **`check-blueprint.sh`'s cleanup could delete a folder it did not make.** It removed
   `$TROPIS_V010` on exit. If the tag check failed while the caller's environment already
   held `TROPIS_V010`, the trap ran `rm -rf` on the caller's folder. **Fixed on the branch by
   the reviewer:** the script keeps the folder it makes in its own variable, removes only
   that, and exports it as `TROPIS_V010`. Mechanical and declared.
3. **The new assertion in Found 1 was not seen red on the old code.** Each run of the
   take-version suite takes about a minute and the fix was a one-line filter. The case
   fails if the filter is removed, because `DECISIONS.md` names `.framework/`. Not checked
   by a run.

### Outstanding disposition

- **One clean-baseline failure, cause unknown.**
  - One of seven local self-check runs failed the clean baseline, the second of the six on
    the fix commit. The guard that failed was not captured.
  - Six other local runs and the CI run on the same commit were green.
  - The take-version suite is the slowest guard (about 57 s, with git and npm-free setups
    in temporary folders), so a timeout or a temporary-folder race is plausible. Neither is
    tested, so neither is recorded as the cause.
  - Recorded as idea entry `self-check-clean-baseline-flake`: capture the failing guard's
    output the next time it happens, and find the cause before guessing.
- **Release.** The developer starts the release job with `bump=major`, giving `v0.2.0`.
  Then the third plan updates this repository and ships `project-takes-a-framework-version`.
  The entry is not promoted here.
- **Commit trailers.** The squash is written with an explicit subject and body, so the
  branch commits' `Co-authored-by` trailers do not land.
- **The handover's *What the plan got wrong*** (hooks shared by two matchers, the *own rule*
  case not exercising the deletion, `--accept-breaking` needed for the record case) are
  plan errors the executor handled correctly. Nothing is carried forward.
- **Developer observation:** none needed for this plan. The third plan runs the command on
  this repository and checks that its hooks still speak to an agent.

### Learnings routed

- **A list meant for the operator must exclude what the tool itself owns.** Specific to
  this command, and now enforced by a test. Not generalised.
- **A cleanup trap must delete only what its own script created.** This is general:
  `rules/harness-scripts.md` already says to namespace what is written under `TMPDIR`, and
  this is the deletion side of the same care. Not written as a new rule. One occurrence,
  fixed, and the existing rule's area covers the file. If it recurs, attach it there with
  this incident.
- **An unexplained red that does not reproduce gets an entry, not a cause.** Already the
  review rule in `rules/planning.md`; followed here.

### Merged because

CI and six of seven local self-checks are green on the merged content. The move does what
the decisions say on a real `v0.1.0` install. The two defects review found are fixed and
declared, and the one red run is recorded as unexplained with an entry to chase it.
