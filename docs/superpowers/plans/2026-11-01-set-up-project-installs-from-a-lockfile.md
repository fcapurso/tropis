# A set-up project installs from a lockfile — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a project that was just set up runs `npm --prefix .tropis ci` and gets exactly
the dependency versions the release's own self-check ran on, and an update keeps that
lockfile matching the package file it installs.

**Spec:** the entry `set-up-project-installs-from-a-lockfile` in `feature-catalog.yaml`:
its three acceptance criteria, and the comment above it, which folds in a fix to one
setup test. There is no design document.

**One plan:** what becomes true is one sentence — the framework ships one lockfile, its
self-check installs from it, and setup and update put it in the project. Every file below
serves that.

**What the specifying session verified on 2026-11-01, against `origin/main` at `03f7459`:**

- **Setup writes a package file and no lockfile.** `scripts/set-up-project.sh` ends its
  copying with `sed "s/PROJECT_SLUG/$slug/" "$BP/templates/package.json" > "$PROJECT/.tropis/package.json"`.
  `templates/` holds `package.json` and no `package-lock.json`. Its closing line is
  `echo "Next, from there: npm --prefix .tropis install, then npm --prefix .tropis test, then commit."`.
  `$slug` is the display name's slug, or the folder's when there is none.
- **`templates/package.json`** is named `PROJECT_SLUG-framework`, has devDependencies
  `jest ^30.0.0` and `yaml ^2.9.0`, and an `overrides` entry `"test-exclude": "^8.0.0"`.
- **The self-check installs the newest versions in range.** `scripts/check-blueprint.sh`
  copies `HEAD:templates/package.json` into `.self-check/package.json` and runs
  `npm install --prefix "$TOOLS" --ignore-scripts --no-audit --no-fund --loglevel=error`
  whenever that file changed or jest is missing. `.self-check/` is in `.gitignore`.
  Its header comment says so in the paragraph starting `# Its test tools are the ones a
  set-up project gets`.
- **`guards/dependency-overrides.test.js` relies on that.** Its header says "An install
  resolves the newest version in range, and CI installs afresh on every run, so the first
  run after the dependent catches up is the one that fails." It reads the dependent's
  package.json from the self-check's `node_modules`.
- **The lockfile is outside the release record.** `scripts/installed-files.js` lists
  `.tropis/package-lock.json` in `EXCLUDED`. It stays there: its name varies per project,
  and a project's own install rewrites it.
- **How an update builds the new release.** `scripts/take-version.mjs` `buildVersion()`
  runs the new version's `scripts/set-up-project.sh` in a scratch folder named by
  `setupName()`, the slug read back from the project's `.tropis/package.json` name. So the
  scratch package file carries the project's own package name, and so would a scratch
  lockfile written by setup. `apply()` walks only record paths, so today it never touches
  the lockfile. It sets `packageChanged` when `.tropis/package.json` is replaced, added,
  or written as `.new`, and the report's `Next:` then says
  `  npm --prefix .tropis install` (line `if (packageChanged) lines.push(...)`).
- **The instructions that say `install`.** `git grep -nF "tropis install"` in the source
  finds, among others: `scripts/set-up-project.sh` (closing line), `scripts/take-version.mjs`
  (the `Next:` line), `scripts/check-prerequisites.sh` (`gone yaml "run: npm --prefix .tropis install"`),
  `commands/bootstrap.md` Stage 7 code block, `bootstrap.md` (the code block before
  "Then commit everything, including `.tropis/package-lock.json`"), `commands/update.md`
  Stage 6 step 1, and `templates/README.md` lines 12–14 (the paragraph "On a project just
  set up, before `.tropis/package-lock.json` is committed, run `npm --prefix .tropis
  install` instead…"). The other hits — `rules/catalogs.md`, `templates/README.md`'s board
  paragraph, `framework/DECISIONS.md` FW-043, `scripts/install-board-hooks.mjs`,
  `guards/board-hooks.test.js` — describe what an install does, stay true, and are not
  changed.
- **The folded-in test.** `guards/set-up-project.test.js`, `records every shipped file at
  version unknown`, runs setup from this checkout. Setup computes
  `version=$(git -C "$BP" describe --tags --always 2>/dev/null || true)`, so from a
  checkout it records a tag or a hash, and the test fails; in the self-check's
  `git archive` export there is no `.git` and it records `unknown`. The same file's
  `blueprintCopy()` helper copies `rules`, `framework`, `commands`, `scripts`, `guards`
  and `templates` into a temporary folder and runs `git init` and a commit there.
- **The test that a command names only installed `.tropis/` paths** (`names only .tropis/
  paths it installed`, in `guards/set-up-project.test.js`) already skips
  `.tropis/package-lock.json` (line with `node_modules|package-lock\.json`). Setup will
  now write that file anyway.
- **The developer's user-level instructions** on the specifying session's machine say
  nothing about npm, lockfiles or setup, so a local fresh-agent probe is a real one.

**Model tier: Medium.** Shell, one function in `take-version.mjs` and four test files,
against decisions given here; care, not design.

**Merge authority: parent review.** The specifying session reviews and merges. Stop after
Task 8; do not open a pull request, write a review record or merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 6 (record which, and its version), and network access to the npm registry.

Do not store a kick-off prompt on this plan.

---

## Delivers

set-up-project-installs-from-a-lockfile

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-lockfile -b plan/set-up-project-installs-from-a-lockfile origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency and change no version range in `templates/package.json`.** Do not
  lower, skip or delete a guard or a test. An existing assertion may change only where
  this plan says so.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from.
- **Keep the change to `scripts/set-up-project.sh` to the lines named here.** Another
  plan is changing that script in parallel; small edits keep the merge simple.

## Decisions

### 1. The framework ships one lockfile (`templates/package-lock.json`)

Generate it from `templates/package.json` as it stands: copy that file alone into an
empty scratch folder under `$TMPDIR`, run
`npm install --package-lock-only --ignore-scripts --no-audit --no-fund` there, and copy
the resulting `package-lock.json` to `templates/package-lock.json`. Its name fields must
read `PROJECT_SLUG-framework`, as the package file's does. If npm refuses that name,
generate it under `project-slug-framework` and put `PROJECT_SLUG` back in both name
fields (the top-level `name` and `packages[""].name`) with a text replacement; say which
under *Judgment calls*. Commit the file with nothing else changed in it.

### 2. The self-check installs from it (`scripts/check-blueprint.sh`)

Replace the install block so that it copies both `HEAD:templates/package.json` and
`HEAD:templates/package-lock.json` into `.self-check/`, reinstalls when either differs
from the copy already there or jest is missing, and installs with
`npm ci --prefix "$TOOLS" --ignore-scripts --no-audit --no-fund --loglevel=error`. Keep
the `NODE_MODULES` override as it is. Rewrite the header paragraph that starts
`# Its test tools are the ones a set-up project gets` to say: the tools are exactly what
`templates/package-lock.json` pins, the lockfile setup gives every project, so the
versions a release was checked with are the versions its projects install; `npm ci`
refuses a lockfile that no longer matches `templates/package.json`, so a change to the
package file fails the self-check until the lockfile is regenerated with
`npm install --package-lock-only --ignore-scripts` from a copy of the package file. Keep
the `--ignore-scripts` reason line.

### 3. The overrides guard says what now triggers it (`guards/dependency-overrides.test.js`)

Only its header comment changes. Replace the sentence "An install resolves the newest
version in range, and CI installs afresh on every run, so the first run after the
dependent catches up is the one that fails." with: "Those tools come from
templates/package-lock.json, so the guard fails on the first regeneration of that
lockfile after the dependent catches up." No code change.

### 4. Setup writes the lockfile (`scripts/set-up-project.sh`)

Directly after the line that writes `.tropis/package.json`, add one line writing
`.tropis/package-lock.json` from `templates/package-lock.json` with the same
`sed "s/PROJECT_SLUG/$slug/"` substitution. Change the closing line to
`echo "Next, from there: npm --prefix .tropis ci, then npm --prefix .tropis test, then commit."`.
Nothing else in this file changes.

### 5. An update keeps the lockfile matching (`scripts/take-version.mjs`)

In `apply()`, after the loop over record paths and before the settings are merged: read
the new release's `.tropis/package-lock.json` from `next`, the project's
`.tropis/package.json` (as it now stands, after the loop) and the new release's
`.tropis/package.json`. **When the release has a lockfile and the project's package file
is byte-for-byte the release's**, make the project's `.tropis/package-lock.json` the
release's: write it when it is absent (push the path to `added`) or differs (push it to
`replaced`), and note that it changed. Otherwise — the project changed its package file,
so its lockfile is its own — leave the lockfile alone.

The `Next:` line becomes: `  npm --prefix .tropis ci` when the project's package file is
the release's and the package file or the lockfile changed; otherwise
`  npm --prefix .tropis install` when `packageChanged`, as today; otherwise no install
line. Add the lockfile flag to the returned `result` object beside `packageChanged`.
Update the comment above `setupName()` only if it becomes untrue.

### 6. The instructions say `ci`

- `scripts/check-prerequisites.sh`: `gone yaml "run: npm --prefix .tropis ci"`.
- `commands/bootstrap.md` Stage 7 and `bootstrap.md` (the code block before "Then commit
  everything"): `npm --prefix .tropis ci` in place of `npm --prefix .tropis install`. The
  sentences after them, which say to commit `.tropis/package-lock.json`, stay.
- `commands/update.md` Stage 6 step 1 becomes: "Run the install command `Next:` lists —
  `npm --prefix .tropis ci`, or `npm --prefix .tropis install` where the project changed
  its package file — and nothing when it lists neither." Keep its line wrapping near the
  file's width.
- `templates/README.md`: delete the paragraph "On a project just set up, before
  `.tropis/package-lock.json` is committed, run … and commit the lock it writes." (it is
  untrue once setup writes the lockfile). The `npm --prefix .tropis ci` block above it
  stays.

### 7. The tests

**`guards/set-up-project.test.js`.**

- New test, `leaves a lockfile npm ci installs from`: run setup with a display name, then
  assert `.tropis/package-lock.json` exists, that its top-level `name` and
  `packages[""].name` equal `.tropis/package.json`'s `name`, then run
  `npm --prefix .tropis ci --no-audit --no-fund --prefer-offline` in the project with
  `spawnSync` and assert status 0 and that `.tropis/node_modules/.bin/jest` exists. Give
  it a timeout of 180 seconds. It must fail when setup writes no lockfile — npm ci
  refuses to run without one.
- Fix `records every shipped file at version unknown` so it passes from a checkout as
  well as in the export: run setup from a copy of the six source folders with **no**
  `.git` (a variant of `blueprintCopy()` that skips the `git init` and commit, or an
  option on it), so `git describe` finds nothing and the record says `unknown`. Its
  assertions do not change.

**`guards/take-version.test.js`.** Next to the existing package tests, using the file's
own world helpers and `edit()`:

- A release that changes `templates/package-lock.json` (any text change, such as adding
  a key) and a project that kept the shipped package file: after the take, the project's
  `.tropis/package-lock.json` equals the new release's lockfile with the project's slug,
  the report lists it under `Replaced`, and `Next:` says `npm --prefix .tropis ci` and
  not `install`.
- A project whose `.tropis/package.json` it changed itself (any extra script) and a
  release that changes the lockfile: the project's lockfile is unchanged, and `Next:`
  does not say `npm --prefix .tropis ci`.
- A project with no `.tropis/package-lock.json` and the shipped package file: after the
  take it has the release's lockfile, listed under `Added`.

### 8. What this owes, and does not

- **Decision record.** Add to `framework/DECISIONS.md`, after the last entry, a decision
  numbered with the next free `FW-` number on your branch's base, titled
  `A release's lockfile is the one its self-check installed`. Date 2026-11-01, status
  Accepted. Decision: the framework ships `templates/package-lock.json`; the self-check
  installs its tools from it with `npm ci`; setup writes it into every project; an update
  replaces it while the project's package file is the release's. Rejected: letting the
  self-check keep resolving the newest versions in range (a release would then be checked
  with versions no project installs from its lockfile); writing the lockfile at setup
  with `npm install` (needs the network at setup and takes whatever is newest that day);
  recording the lockfile in the release record (its name varies by project and a
  project's own install rewrites it). Consequences: the lockfile is regenerated by hand
  when `templates/package.json` changes, and the self-check fails until it is;
  `dependency-overrides` now fires on a regeneration rather than on any CI run;
  security updates arrive through a regeneration, which GitHub's dependency alerts on
  this repository prompt. The reviewer renumbers it if `main` has taken that number by
  merge time.
- **Operator guide:** `templates/README.md`, *Decision 6*.
- **Rules and framework documents:** none changed. The command edits change what an agent
  is told, so Task 6 runs a fresh-agent check.
- **Upstream queue:** none; this is the upstream.
- **README:** not patched; no command it names is removed or renamed.

## Traps

- **The tests must fail first.** Task 1 commits them before the code, and the self-check
  must then fail on them. That is the red step, not a breakage.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **The self-check now needs `templates/package-lock.json` at `HEAD` to install its
  tools.** Task 1 therefore commits the lockfile (Decision 1) before the tests, and Task 2
  switches the install. Until Task 2, `.self-check/` still installs the old way.
- **The new setup test runs `npm ci` and needs the registry or npm's cache.** It is slow
  (tens of seconds); let it run. If it fails with a network error rather than an npm
  refusal, say so and run it again; do not raise the timeout past 180 seconds.
- **`take-version.test.js` is slow** (its tests are marked `SLOW`). Let it run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green.
- **`guards/private-material.test.js` scans every committed file**, the new lockfile
  included. If it fails on the lockfile, stop and hand back with its output; do not edit
  the lockfile by hand or exempt it.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `templates/package-lock.json` | new, *Decision 1* |
| `scripts/check-blueprint.sh` | *Decision 2* |
| `guards/dependency-overrides.test.js` | header comment, *Decision 3* |
| `scripts/set-up-project.sh` | *Decision 4* |
| `scripts/take-version.mjs` | *Decision 5* |
| `scripts/check-prerequisites.sh` | *Decision 6* |
| `commands/bootstrap.md` | *Decision 6* |
| `bootstrap.md` | *Decision 6* |
| `commands/update.md` | *Decision 6* |
| `templates/README.md` | *Decision 6* |
| `guards/set-up-project.test.js` | *Decision 7* |
| `guards/take-version.test.js` | *Decision 7* |
| `framework/DECISIONS.md` | *Decision 8* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment mapping criteria to tests (Task 7) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 7) |
| `docs/superpowers/plans/2026-11-01-set-up-project-installs-from-a-lockfile.md` | the handover report |

Nothing else.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version`, `npm --version` and
`uname -sm` for the handover.

### Task 1 — The lockfile and the tests, red

Apply *Decision 1* and commit. Apply *Decision 7* and commit. Run
`bash scripts/check-blueprint.sh`: it must fail. The failing tests must be the new
lockfile test in `set-up-project.test.js` and the first and third new cases in
`take-version.test.js`. The second take-version case and the fixed `version unknown`
test may pass already; say which did. No test that existed before this plan may fail.
Paste the failing test names.

If a new test passes here that this list says must fail, it cannot fail: fix the test
and run again.

### Task 2 — The self-check installs from the lockfile

Apply *Decisions 2 and 3*. Commit. Delete `.self-check/package.json` so the next run
reinstalls, run `bash scripts/check-blueprint.sh`, and paste the line saying it is
installing the test tools and the failing test names (the same as Task 1).

### Task 3 — Setup and update

Apply *Decisions 4 and 5*. Commit. Run `bash scripts/check-blueprint.sh`; the last line
must start `Self-check passed`. Paste it.

Then show the lockfile test can fail: make a throwaway commit deleting the line Decision 4
added, run the self-check, paste the failing test name, and drop the commit with
`git reset --hard HEAD~1`.

### Task 4 — The instructions and the decision

Apply *Decisions 6 and 8*. Commit. Run
`git grep -nF "tropis install" -- scripts/set-up-project.sh scripts/check-prerequisites.sh commands/bootstrap.md bootstrap.md templates/README.md`
and paste it. Expected: only `templates/README.md`'s board paragraph (the line saying the
hooks are written by `npm --prefix .tropis install`). Before the work it also prints the
setup closing line, the prerequisite line, both bootstrap lines and the README's
just-set-up paragraph. Run `bash scripts/check-blueprint.sh` again; the last line must
start `Self-check passed`.

### Task 5 — A project set up from the branch installs with npm ci

Make a scratch repository: `mkdir -p "$TMPDIR/lock-probe/quay-works" && git -C "$TMPDIR/lock-probe/quay-works" init -q -b main`.
Run `bash scripts/set-up-project.sh "$TMPDIR/lock-probe/quay-works" "Quay Works"` from
the worktree. In the scratch project: record `shasum .tropis/package-lock.json`, run
`npm --prefix .tropis ci`, record the shasum again, then `npm --prefix .tropis test`.
Paste: the exit status of `ci` (must be 0), both shasums (must be equal — `ci` never
rewrites the lockfile), the `"name"` line of the lockfile (must be
`"name": "quay-works-framework",`), and the `Tests:` line. Delete the scratch folder.

### Task 6 — Fresh-agent check

The command edits change what an agent is told to run, so a fresh agent with only this
worktree must be seen to follow them. Run it with its tool calls visible (in Claude Code,
`claude -p --output-format stream-json --verbose`, with permission to run shell commands
and write files in the scratch folder), from the worktree.

1. Make a scratch repository: `mkdir -p "$TMPDIR/lock-agent/pier-tools" && git -C "$TMPDIR/lock-agent/pier-tools" init -q -b main` with one committed file.
2. Prompt, verbatim apart from the two paths: *"This is a probe; its output will be
   discarded. Using the framework in `<worktree>` as the blueprint, run setup for the
   project at `<scratch path>` with the display name `Pier Tools`, as Stage 2 of
   `commands/bootstrap.md` says, then do only the install step of its Stage 7 and the
   test command after it. Do not commit. Report what you ran."*
3. Check, and paste: from the stream, the install command the agent ran (must be
   `npm --prefix .tropis ci`, not `install`) and its exit status (must be 0); the
   `Tests:` line of its test run.

If the agent runs `npm --prefix .tropis install`, the command text is not clear enough:
change it, commit, and run the probe again. If it fails twice, stop and hand back with
both transcripts' relevant calls. Record the tool, its version, the operating system and
the architecture; these go in the commit body of the final commit (a no-change commit
with `--allow-empty` is fine) and in the handover. Delete the scratch folder afterwards.

### Task 7 — The catalog and the board

1. In `feature-catalog.yaml`, on `set-up-project-installs-from-a-lockfile`: set
   `status: shipped` (it reads `building` once dispatched; if it reads anything else, set
   `shipped` anyway and say so under *Judgment calls*). Set `modules` to
   `scripts/set-up-project.sh`, `scripts/take-version.mjs`, `scripts/check-blueprint.sh`,
   `templates/package-lock.json` and `guards/set-up-project.test.js`. Leave `refs` as it
   is. Add, directly above the entry's `- id:` line and below the existing comments:

   ```yaml
   # Shipped by docs/superpowers/plans/2026-11-01-set-up-project-installs-from-a-lockfile.md.
   # Criteria 1 and 3 - set-up-project.test.js, "leaves a lockfile npm ci installs from".
   # Criterion 2 - take-version.test.js, the three lockfile cases. The folded-in fix -
   # "records every shipped file at version unknown" now runs setup from a copy with no git.
   ```

   Do not put `: ` (colon and space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole `set-up-project-installs-from-a-lockfile:`
   block (the key and its indented lines, through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 8 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/set-up-project-installs-from-a-lockfile`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.
