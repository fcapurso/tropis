# A project's name is written once — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** someone setting up a project gives its display name once, setup writes it to
`.tropis/project.json`, and the backlog board, the operator guide, the framework package
name, the brief heading and the entry file's heading all take the name from there, with
the folder name as the fallback. An update never replaces or removes that file.

**Spec:** the entry `project-has-one-display-name` in `feature-catalog.yaml`: its
acceptance criteria, and the comments above it, which record the decisions taken when it
was shaped. There is no design document.

**One plan:** what becomes true is one sentence — the name given at setup is the one the
framework writes everywhere. Every file below serves that.

**What the specifying session verified on 2026-11-01, against `origin/main` at `e33c114`:**

- **Setup takes one argument and drops the name.** `scripts/set-up-project.sh` reads
  `PROJECT="$(cd "${1:?usage: set-up-project.sh <project-root>}" && pwd -P)"`. It copies
  `templates/README.md` to `.tropis/README.md` unchanged (its first line is
  `# {{PROJECT_NAME}} — working with the framework`), and writes the package with
  `slug=$(basename "$PROJECT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')`
  then `sed "s/PROJECT_SLUG/$slug/" "$BP/templates/package.json" > "$PROJECT/.tropis/package.json"`.
  The last step runs `record-installed.mjs`, which records every shipped file.
- **`/bootstrap` asks for the name and the agent types it in by hand.**
  `commands/bootstrap.md` Stage 1 asks for "the project path, a display name, and the
  blueprint URL" and says "The package name is derived from the project's folder name.";
  Stage 2 runs `bash "$BP"/scripts/set-up-project.sh <project-root>`; Stage 4 says "In
  `.tropis/README.md`, replace `{{PROJECT_NAME}}` and `{{BLUEPRINT_URL}}` from Stage 1
  answers."; Stage 5 says "Fill `AGENTS.md` from the brief's identity." The long form,
  `bootstrap.md` at the root, says the same in Step 1 (line "The package name in
  `.tropis/package.json` is derived from the project's folder name."), Step 2 (the same
  command, then a table of what setup writes), Step 4 (a list of the two placeholders)
  and Step 5. `templates/AGENTS.md` opens its config with `# <Project name> — project config`.
- **The brief.** `commands/scope.md` Stage 3 says "Read `.tropis/templates/project-brief.md`
  now. … Draft `docs/project-brief.md` from it." The template's first line is
  `# Project Brief — [Project Name]`.
- **The board titles itself after the folder.** `scripts/build-backlog-board.mjs`
  computes `root = resolve(here, '../..')` and writes
  `.replaceAll('__TITLE__', `${basename(root)} backlog`)`; `__TITLE__` appears twice in
  `templates/backlog-board.html`, in `<title>` and in `<h1>`, and is not escaped today. An
  `escapeHtml` helper is defined a few lines above that call.
- **`.tropis/` is walked into the release record.** `scripts/installed-files.js` has
  `SHIPPED_ROOTS = ['.tropis', '.claude/framework', '.claude/commands']` and
  `EXCLUDED = ['.tropis/node_modules', '.tropis/package-lock.json', '.tropis/installed.json', '.tropis/README.md']`.
  `shippedFiles` walks every root and skips excluded paths. In `scripts/take-version.mjs`
  a path in the old record (the baseline) and absent from the new release whose
  fingerprint is unchanged is deleted (`unlinkSync(dest)`). So without an exclusion, a
  `.tropis/project.json` written at setup would be recorded as shipped, and the next
  update would delete it.
- **An update keeps the package name already.** `take-version.mjs` `setupName()` reads
  the slug back from `.tropis/package.json`'s `name` (dropping `-framework`) and runs
  setup, with only the folder argument, in a scratch folder of that name. So once setup
  names the package after the display name, an update keeps it, with no change to
  `take-version.mjs`. The tests `keeps the package name …` and `names the package after
  the folder when the package names nothing` in `guards/take-version.test.js` cover it.
- **Callers of setup.** `git grep -nF "set-up-project.sh"` outside plans, the installed
  copies and the catalog finds the two bootstrap documents, `commands/scope.md` (prose),
  and tests that run it with one argument: `guards/set-up-project.test.js`,
  `guards/check-version.test.js`, `guards/rule-additions.test.js`,
  `guards/take-version.test.js`, and `scripts/take-version.mjs` line 167. A second
  argument that is optional leaves every one of them working unchanged.
- **The guard that would trip.** `guards/set-up-project.test.js`, `names only .tropis/
  paths it installed`, runs setup with no name and fails on any `.tropis/…` path the
  installed commands name that does not exist. This plan's command edits name
  `.tropis/project.json`, which a setup without a name does not write. Decision 6 handles
  it. `guards/framework-integrity.test.js` checks only backticked paths under `src/`,
  `docs/`, `scripts/`, `.claude/` and `.github/`, so it is not affected.
- **This repository has no `.tropis/project.json`.** Its package is `tropis-framework`.
  `.claude/settings.json` denies edits under `.tropis/hooks/`, `scripts/`, `guards/`,
  `rules/`, `templates/` and `jest.config.js`, not `.tropis/project.json`.
- **The developer's user-level instructions** on the specifying session's machine say
  nothing about project names or setup, so a local fresh-agent probe is a real one.

**Model tier: Medium.** Several files and four test files, against verbatim decisions;
writing the tests and the shell change needs care, not design.

**Merge authority: parent review.** The specifying session reviews and merges. Stop after
the pull request's checks (Task 8); do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 6 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

project-has-one-display-name

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-display-name -b plan/project-has-one-display-name origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`, nor anything under `.tropis/`
  except creating `.tropis/project.json` (Task 5).
- **Add no dependency. Do not lower, skip or delete a guard or a test.** An existing
  assertion may change only where this plan says so.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. Setup takes the display name as an optional second argument (`scripts/set-up-project.sh`)

- Usage becomes `set-up-project.sh <project-root> [<display name>]`. Update the usage
  line in the header comment and in the `${1:?…}` message, and add one sentence to the
  header comment: with a display name, setup writes it to `.tropis/project.json`, names
  the package after it and puts it at the head of the operator guide.
- `name="${2:-}"`. An empty string counts as no name.
- **With a name**, write `.tropis/project.json` with node, so any character is encoded
  correctly:
  `node -e 'process.stdout.write(JSON.stringify({ name: process.argv[1] }, null, 2) + "\n")' "$name" > "$PROJECT/.tropis/project.json"`.
  The file is then exactly `{\n  "name": "<name, JSON-escaped>"\n}\n`. **Without one**,
  write no such file.
- **The slug.** Compute it from the name when there is one, with the same pipeline used
  today, run under `LC_ALL=C` so bytes outside a–z and 0–9 become hyphens on any
  platform: `printf '%s' "$name" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//'`.
  When there is no name, or the name's slug is empty (a name with no a–z or 0–9 at all,
  such as `東京`), use the folder's slug exactly as today. The package line is unchanged.
- **The operator guide.** Replace the plain `cp` of `templates/README.md` with a node
  call that writes `.tropis/README.md` from the template with every `{{PROJECT_NAME}}`
  replaced by the display name, or by `basename "$PROJECT"` when there is none. Use a
  replacer function (`text.replaceAll('{{PROJECT_NAME}}', () => value)`) so a `$` in the
  name is not read as a pattern. `{{BLUEPRINT_URL}}` stays for the agent to fill.
- Nothing else in the script changes. Every write happens before `record-installed.mjs`
  runs, as today.

### 2. The record leaves the file out (`scripts/installed-files.js`)

Add `'.tropis/project.json'` to `EXCLUDED`, after `'.tropis/README.md'`, and extend the
comment above it: `project.json` is the project's own settings, written by setup when it
is given a name. Nothing else changes: an excluded path is neither recorded nor in a
release's files, so `take-version.mjs` never writes, replaces or deletes it.

### 3. The board takes its title from the file (`scripts/build-backlog-board.mjs`)

Before the HTML is built, compute the name:

```js
// The project's display name, from its own settings; the folder's name when the file
// is absent, unreadable, or names nothing.
function projectName() {
  try {
    const { name } = JSON.parse(readFileSync(resolve(root, '.tropis/project.json'), 'utf8'));
    if (typeof name === 'string' && name.trim() !== '') return name.trim();
  } catch {
    // fall through
  }
  return basename(root);
}
```

and write `.replaceAll('__TITLE__', escapeHtml(`${projectName()} backlog`))`. Escaping
applies to the folder name too; a folder name with no `&<>"` is unchanged by it. Move
`escapeHtml` above the `html` construction if it is not already there.

### 4. The commands say where the name comes from

Replace these sentences exactly; leave the rest of each file as it is.

**`commands/bootstrap.md`**

- Stage 1, the sentence `The package name is derived from the project's folder name.`
  becomes: `Take the display name exactly as given — capitals, spaces and symbols
  included. Setup stores it in `.tropis/project.json`, and the framework takes the
  project's name from there wherever it writes one.` (keep the inner backticks around
  the path).
- Stage 2, the command becomes `bash "$BP"/scripts/set-up-project.sh <project-root> "<display name>"`,
  and after `It does not commit.` add: `With the display name it also writes
  `.tropis/project.json`, a file of the project's own that an update never replaces,
  names the package after the name, and puts the name at the head of `.tropis/README.md`.`
- Stage 4 becomes: `In `.tropis/README.md`, replace `{{BLUEPRINT_URL}}` from the Stage 1
  answers. Setup has already written the display name at its head.`
- Stage 5, `Fill `AGENTS.md` from the brief's identity.` becomes `Fill `AGENTS.md` from
  the brief's identity, and title it with the name in `.tropis/project.json`.`

**`bootstrap.md`** (the long form, at the repository root)

- Step 1, `The package name in `.tropis/package.json` is derived from the project's folder name.`
  becomes: `Take the display name exactly as given — capitals, spaces and symbols
  included. Setup stores it in `.tropis/project.json`; the backlog board, the operator
  guide and the package name in `.tropis/package.json` take it from there, and fall back
  to the project's folder name when it is absent.`
- Step 2, the command becomes the same as in `commands/bootstrap.md`, and the table of
  what setup writes gains a row after its first: `| `.tropis/project.json` | the
  project's display name, written when setup is given one — yours, never replaced by an
  update |`.
- Step 4: the sentence before the list becomes `The setup copied `templates/README.md` to
  `.tropis/README.md` with the display name at its head. Replace this placeholder from
  the Step 1 answers:` and the list keeps only `- `{{BLUEPRINT_URL}}``.
- Step 5: after `Fill `AGENTS.md` from the brief's identity.` add `Title it with the name
  in `.tropis/project.json`.`

**`commands/scope.md`**, Stage 3: after `Draft `docs/project-brief.md` from it.` add:
`Title it `# Project Brief — <name>`, with the name from `.tropis/project.json`, or the
repository folder's name when that file is absent.`

If a sentence quoted here is not in the file word for word (a line break inside a
sentence does not count), stop and hand back: the file changed since the plan was
written. Rewrap edited paragraphs to the file's existing line width.

### 5. The operator guide template says where the name lives (`templates/README.md`)

After the paragraph that ends `An update never touches the file.` and begins
`**If the repository is or will be public**`, add this paragraph:

```
The project's display name is in `.tropis/project.json`, as `{ "name": "…" }`. Setup
writes it when it is given one; the backlog board is titled with it, and with this
folder's name when the file is absent. An update never touches the file.
```

### 6. The installed-paths guard skips the file a nameless setup does not write

In `guards/set-up-project.test.js`, `names only .tropis/ paths it installed`, add a skip
next to the existing one for `node_modules` and `package-lock.json`:

```js
          // Written only when setup is given a display name; this run gives none.
          if (ref === '.tropis/project.json') continue;
```

That test stays a test of a setup without a name. Decision 7 covers the setup with one.

### 7. The tests

Write these before the code (Task 1). Each must fail before Tasks 2–4 and pass after.

**`guards/set-up-project.test.js`.** Change `runSetup` to
`const runSetup = (dir, ...rest) => spawnSync('bash', [setup, dir, ...rest], { encoding: 'utf8' });`
— existing calls are unchanged. Add a `describe('the display name', …)` with:

- `writes the name it is given to .tropis/project.json, exactly`: setup with
  `Acme Portal & Co. <β> $1` exits 0; the file's text is
  `${JSON.stringify({ name: 'Acme Portal & Co. <β> $1' }, null, 2)}\n`; the package name
  is `acme-portal-co-1-framework`; the first line of `.tropis/README.md` is
  `# Acme Portal & Co. <β> $1 — working with the framework` and the file holds no
  `{{PROJECT_NAME}}`; `.tropis/installed.json`'s `files` has no `.tropis/project.json`
  key.
- `writes no settings file without a name, and uses the folder's name`: setup with no
  second argument, and again in a fresh repository with `''`: no `.tropis/project.json`;
  package `example-project-framework`; guide's first line
  `# example-project — working with the framework`.
- `names the package after the folder when the name has nothing a package name can use`:
  name `東京`: the file holds `東京`, the package is `example-project-framework`.

**`guards/installed-files.test.js`.** In the test that writes `.tropis/README.md` and
checks it is not recorded, also write `.tropis/project.json` (`{"name":"x"}\n`) and assert
the written record's `files` does not contain it either.

**`guards/take-version.test.js`.** Add, next to the `keeps the package name …` tests,
`leaves .tropis/project.json as the project wrote it`: in `inWorld({}, …)`, write
`.tropis/project.json` holding `{ "name": "Example Project" }` with a newline, commit it,
release `v0.2.1` with `addExtraScript` as the neighbouring tests do, run
`takeInWorktree(w, 'v0.2.1')`; assert exit 0, the file in the worktree byte-identical to
what was written, no `.tropis/project.json.new`, `.tropis/project.json` not a key of the
worktree's `.tropis/installed.json` `files`, and `recordProblems(worktree)` empty. Mark it
`SLOW` like its neighbours.

**`guards/backlog-board.test.js`.** Using `stage()` and `build()`:

- with `.tropis/project.json` holding `{ "name": "Acme & <Co>" }`: the page contains
  `<title>Acme &amp; &lt;Co&gt; backlog</title>` and `<h1>Acme &amp; &lt;Co&gt; backlog</h1>`;
- with no file, with `not json`, and with `{ "name": "  " }`: the title is
  `<basename of the staged folder> backlog`.

Check how existing board tests read the page (`page(dir)`) and assert the same way.

### 8. What this owes, and does not

- **Fresh-agent check: yes**, because `commands/bootstrap.md` and `commands/scope.md`
  change what an agent is told to do. Task 6.
- **No `framework/DECISIONS.md` entry.** The choices are recorded in the comments above
  the catalog entry, and where a project's settings live is decided by the later entry
  `project-settings-live-under-tropis`, which revisits FW-032.
- **No rule changes**, so nothing under `rules/` and no regeneration.
- **No `README.md` edit at the root** (refreshed by `/refresh-readme`), and **no
  release-notes edit** (`/release` drafts them).
- **No migration.** A project set up earlier gets no file and keeps its package name; its
  board keeps the folder name until someone writes the file. This is decided in the
  entry's comments.

## Traps

- **The tests must fail first.** Task 1 commits them before the code, and the self-check
  must then fail on them. That is the red step, not a breakage.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **`take-version.test.js` is slow** (its tests are marked `SLOW`). Let it run.
- **`npm --prefix .tropis test` and `npm --prefix .tropis run board` run the installed
  release, not this source.** They will not show the new title. Check the board through
  `guards/backlog-board.test.js`, and through the scratch run in Task 7.
- **`LC_ALL=C` is load-bearing.** Without it, `tr` and `sed` on some platforms treat a
  multibyte character as a letter or refuse the input, and `東京` would not fall back.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/set-up-project.sh` | *Decision 1* |
| `scripts/installed-files.js` | *Decision 2* |
| `scripts/build-backlog-board.mjs` | *Decision 3* |
| `commands/bootstrap.md` | *Decision 4* |
| `commands/scope.md` | *Decision 4* |
| `bootstrap.md` | *Decision 4* |
| `templates/README.md` | *Decision 5* |
| `guards/set-up-project.test.js` | *Decisions 6 and 7* |
| `guards/installed-files.test.js` | *Decision 7* |
| `guards/take-version.test.js` | *Decision 7* |
| `guards/backlog-board.test.js` | *Decision 7* |
| `.tropis/project.json` | new, this repository's own name (Task 5) |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to tests (Task 5) |
| `docs/superpowers/plans/2026-11-01-project-has-one-display-name.md` | the handover report and the review record |

Nothing else.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The tests, red

Apply *Decisions 6 and 7*. Commit. Run `bash scripts/check-blueprint.sh`: it must fail.
The failing tests must be the new ones in *Decision 7* that depend on the change — every
new case in `set-up-project.test.js` except the no-name one, the new assertion in
`installed-files.test.js`, the new `take-version.test.js` case, and the board cases with
a name. The no-name setup case and the board fallback cases may already pass; say which
did. No test that existed before this plan may fail. Paste the failing test names.

If a new test passes here that this list says must fail, it cannot fail: fix the test
and run again.

### Task 2 — Setup and the record

Apply *Decisions 1 and 2*. Commit. Run `bash scripts/check-blueprint.sh`; only the board
cases with a name may still fail. Paste the failing names, or the passing last line.

### Task 3 — The board

Apply *Decision 3*. Commit. Run `bash scripts/check-blueprint.sh`; the last line must
start `Self-check passed`. Paste it.

### Task 4 — The documents

Apply *Decisions 4 and 5*. Commit. Then run
`git grep -nF "{{PROJECT_NAME}}" -- commands bootstrap.md templates scripts` and paste
it. Expected: exactly two lines, `templates/README.md:1:…` and the line in
`scripts/set-up-project.sh` that replaces it (before the work it prints the two bootstrap
documents' lines and the template's, and no script line). Run
`bash scripts/check-blueprint.sh` again; the last line must start `Self-check passed`.

### Task 5 — This repository's name, and the catalog

1. Create `.tropis/project.json` holding exactly `{\n  "name": "Tropis"\n}\n`.
2. In `feature-catalog.yaml`, on `project-has-one-display-name`: set `status: shipped`
   (it reads `building` once dispatched; if it reads anything else, set `shipped` anyway
   and say so under *Judgment calls*). Set `modules` to `scripts/set-up-project.sh`,
   `scripts/installed-files.js`, `scripts/build-backlog-board.mjs`,
   `commands/bootstrap.md` and `commands/scope.md`. Leave `refs` as it is: it names
   designs, and the plan is named in a comment. Add, directly above the entry's `- id:` line and below the existing
   comments:

   ```yaml
   # Shipped by docs/superpowers/plans/2026-11-01-project-has-one-display-name.md.
   # Criteria 1, 4 and 5 - set-up-project.test.js, the display name. Criterion 2 -
   # installed-files.test.js and take-version.test.js. Criterion 3 - backlog-board.test.js.
   # Criterion 6 - the fresh-agent check recorded in the commit body. Criterion 7 - the
   # file itself.
   ```

   Do not put `: ` (colon and space) inside an unquoted YAML value. Commit.
3. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must pass.

### Task 6 — Fresh-agent check

The command edits change what an agent is told, so a fresh agent with only this worktree
must be seen to follow them. Run it with its tool calls visible (in Claude Code,
`claude -p --output-format stream-json --verbose`, with permission to run shell commands
and write files in the scratch folder), from the worktree.

1. Make a scratch repository: `mkdir -p "$TMPDIR/name-probe/harbour-tools" && git -C "$TMPDIR/name-probe/harbour-tools" init -q -b main` with one committed file.
2. Prompt, verbatim apart from the two paths: *"This is a probe; its output will be
   discarded. Using the framework in `<worktree>` as the blueprint, carry out Stages 1
   and 2 of `commands/bootstrap.md` for the project at `<scratch path>`. Its display
   name is `Harbour Tools & Co.` and the blueprint URL is the worktree path. Treat both
   answers as confirmed. Then, following `commands/scope.md` Stage 3 only, write
   `docs/project-brief.md` holding just its title line. Do nothing else."*
3. Check, and paste each result: `cat .tropis/project.json` in the scratch project prints
   `{` / `  "name": "Harbour Tools & Co."` / `}`; the package name is
   `harbour-tools-co-framework`; `head -1 .tropis/README.md` is
   `# Harbour Tools & Co. — working with the framework`; `head -1 docs/project-brief.md`
   is `# Project Brief — Harbour Tools & Co.`. Quote the agent's setup command and its
   reply from the stream.

If any check fails, the command text is not clear enough: change it, commit, and run the
probe again. If it fails twice, stop and hand back with both transcripts' relevant calls.
Record the tool, its version, the operating system and the architecture; these go in the
commit body of the final commit (a no-change commit with `--allow-empty` is fine) and in
the handover. Delete the scratch folder afterwards.

### Task 7 — A scratch board

In the Task 6 scratch project (or a fresh one set up with a name, if you deleted it):
`npm --prefix .tropis install`, then `node .tropis/scripts/build-backlog-board.mjs`, then
`grep -o '<title>[^<]*</title>' docs/backlog-board/index.html`. Expected:
`<title>Harbour Tools &amp; Co. backlog</title>`. Paste it, then delete the scratch
folder.

### Task 8 — Verification, handover, pull request

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen beyond the board title, which Task 7 checked, so there is no developer check.
   Commit.
3. Push the branch and open a pull request against `main` titled
   `feat(setup): a project's display name is written once and used everywhere`, whose
   body says what is now true, ending with the attribution lines your session gives.
4. Wait for the pull request's checks (`gh pr checks <N> --watch`) and report whether
   they are green. **Stop there.** Do not write a review record, set auto-merge or merge:
   `main` is gated and the dispatching session reviews and merges. Leave the worktree in
   place; the reviewer removes it.

## Handover report

### Task completion

Tasks 0 to 7 done. Task 8 done except its steps 3 and 4: **no pull request was opened, by
instruction of the developer** (the branch is pushed and stops there).

### Verification results

Ran with git 2.49.0, Node v22.15.0, Claude Code 2.1.300, on macOS 26.2, arm64.

- Task 1, red run: the new `the display name` cases (all three, including the no-name one,
  whose guide heading was still `{{PROJECT_NAME}}`), `backlog board title › takes the
  display name … escaped`, `record-installed.mjs › writes the record for its own project…`
  failed, plus cascades in `check-version.mjs` cases and `a freshly set-up project passes
  its own checks` (they run the installed copy of the changed guard). The take-version
  case did not appear in the failing list I captured. The board fallback cases passed.
  No test that existed before the plan failed on its own account.
- After Tasks 2 and 3: the self-check failed only on two `main-status.test.js` cases
  (`brings a branch that is behind…`, `never asks twice…`; status 3 instead of 0). They
  passed alone (37 of 37) and passed in the next full run: see *What the plan got wrong*.
- Task 4: `git grep -nF "{{PROJECT_NAME}}" -- commands bootstrap.md templates scripts` printed
  `scripts/set-up-project.sh:89:` (the replacer) and `templates/README.md:1:`.
- Self-check after Task 4, second run: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 5: `npm --prefix .tropis test` printed `Tests:       137 passed, 137 total`.
- Task 6, fresh-agent check (Claude Code 2.1.300, macOS 26.2, arm64, `claude -p
  --output-format stream-json --verbose`, with `--allowedTools` limited to bash, git, read
  and write; the first attempt with bypassed permissions was refused by the session's
  classifier). The agent ran
  `bash scripts/set-up-project.sh "<scratch>/harbour-tools" "Harbour Tools & Co."`, exit 0.
  Results: `.tropis/project.json` = `{` / `  "name": "Harbour Tools & Co."` / `}`; package
  `harbour-tools-co-framework`; guide line 1 `# Harbour Tools & Co. — working with the
  framework`; brief line 1 `# Project Brief — Harbour Tools & Co.` (written from the name
  in `.tropis/project.json`). Passed first time; no command text was changed. The
  developer's user-level instructions say nothing about project names, so the probe was
  not primed.
- Task 7: `<title>Harbour Tools &amp; Co. backlog</title>`.

### Scope

See the diff stat in the final report; every file is in *File Structure*. Worktree used:
`../tropis-display-name` (branch `plan/project-has-one-display-name`).

### Judgment calls

- Tasks 2 and 3 were committed together (setup, record and board in one commit): the board
  change is four lines and the intermediate self-check would only have shown its cases red.
- The probe ran with a scoped tool allow-list instead of bypassed permissions, because the
  latter was refused.
- In `commands/bootstrap.md` Stage 2 I added the `.tropis/project.json` sentence before
  "Prune what the project does not need", after "It does not commit."
- The Stage 5 sentence in `commands/bootstrap.md` was rewrapped to the file's line width.

### What the plan got wrong

- Task 1 said the no-name setup case may already pass; it failed, because the guide's
  heading must now be the folder name, not the placeholder.
- `main-status.test.js` (`--pull-request` update-branch cases) failed twice in full
  self-checks under load, passed in isolation and in the third full run. Unrelated to this
  change; per the workflow it is a check that passes on a rerun and is worth a backlog
  entry (runs: failed at 14:34 and 14:40, passed at 14:47 and alone, same tree for the last
  two).
- The plan's record of cascading red tests in Task 1 (check-version and the freshly
  set-up project) was not anticipated.

### Outstanding

- No pull request was opened, by instruction. The branch is pushed for the reviewer.
- The change has no screen beyond the board title, which Task 7 checked, so there is no
  developer check.
- The flaky `main-status.test.js` cases above need an entry if the reviewer agrees.

## Review record

### Checks re-run

All by the specifying session, with git 2.49.0 and Node v22.15.0 on macOS 26.2, arm64.

- `git diff --stat origin/main...HEAD` at `d60d67b`: 14 files, every one in *File
  Structure*. The review added one file the table did not list, declared below:
  `docs/backlog-board/bands.yaml`.
- Each guard re-broken in a scratch export of the branch (`git archive`, run with the
  branch's own Jest):
  - `.tropis/project.json` removed from `EXCLUDED`: `the display name › writes the name it
    is given to .tropis/project.json, exactly`, `record-installed.mjs › writes the record
    for its own project and prints nothing` and `a freshly set-up project passes its own
    checks` fail. **The new take-version case passed** (`Tests: 45 skipped, 1 passed`):
    see *Found*. After the fix it fails with the exclusion removed (`1 failed`) and passes
    with it (`1 passed`).
  - The board's title line restored to `${basename(root)} backlog`: `backlog board title`
    fails (`1 failed, 3 passed` — the three fallback cases pass, as they should).
- `bash scripts/check-blueprint.sh` at the review fix: `Self-check passed: every guard
  caught its defect, the clean baseline passed, and the framework repository's own guards
  passed.`, exit 0.
- `npm --prefix .tropis test`: `Tests:       137 passed, 137 total`.
- The setup diff read line by line: `node -e` puts its first argument at `process.argv[1]`,
  so the guide writer's template, destination and value are `argv[1]`, `[2]` and `[3]`,
  and the settings writer's name is `argv[1]`; the slug runs under `LC_ALL=C`; every write
  happens before `record-installed.mjs`.
- The handover's diagnosis of the two `main-status.test.js` failures: the kept logs under
  the worktree's `.self-check/logs/` (`…-0a27f09/` and `…-d354efc/`, clean baseline) show
  both cases exiting 3, the command's timeout code, with `--interval 0.05 --timeout 0.05`.
  That fits a loaded run, not this change, which touches nothing `main-status.mjs` reads.

### Found

Public exposure: the diff was read for private material; nothing found. Paths in the
handover are relative or written as `<scratch>`.

- **The take-version case could not fail.** It wrote `.tropis/project.json` after setup,
  so the file was never in the record, and an update has nothing to delete whether or
  not the exclusion exists. The defect the exclusion prevents is a file setup writes and
  then records. **Fixed by the reviewer, mechanically**: `world()` takes a `name` and
  passes it to setup, and the case sets the scratch project up with one. The plan's
  Decision 7 asked for the write-after-setup shape, so this is the plan's error.
- The edited paragraphs in `commands/bootstrap.md` (Stages 1, 2 and 5) and `bootstrap.md`
  (Step 5) were left with short ragged lines. **Rewrapped by the reviewer**; no word
  changed.
- **Unbanded on the branch, by the reviewer**: the entry's row is deleted from
  `docs/backlog-board/bands.yaml`, so its move to shipped and its unbanding land in this
  one pull request. `npm --prefix .tropis run board -- --stamp` would also have restamped
  three other entries' rows, which other sessions are editing, so the row was deleted by
  hand instead.

### Outstanding disposition

- The two flaky `main-status.test.js` cases: another session had already recorded the
  same two cases as `main-status-tests-pass-under-load`; this plan's two runs are added
  to that entry as a comment.
- No pull request opened by the executor: by instruction; the reviewer opens it.
- No developer check: nothing has a screen except the board title, which the executor's
  Task 7 and the board guard both checked.

### Learnings routed

- **A test of "an update keeps X" must put X where the release record can see it.** This
  is the planning rule's existing *A check states what it prints when it passes and when
  it fails* applied to an update test, and the reviewer's re-break caught it as that rule
  says; nothing generalises beyond it, so no new rule.
- Nothing this plan built is portable beyond the framework itself: it is the framework's
  own setup.

### Merged because

Every criterion has a test that fails without the change, the fresh-agent check passed on
the first run, and the self-check and the installed checks are green; the review fixed one
test that could not fail and added the flaky check it surfaced to the entry that records it.
