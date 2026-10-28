# A project's entry instructions live in one file — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. No task stops for the developer.

**Goal:** a project's entry instructions are in `AGENTS.md`, and `CLAUDE.md` is the
single line `@AGENTS.md`. Setup writes the pair that way, `/bootstrap` fills only
`AGENTS.md`, an update converts an identical pair and refuses to guess on a differing
one, the project's checks fail on a `CLAUDE.md` that is anything else, and this
repository's own pair follows suit.

**Spec:** the entry `entry-instructions-live-in-one-file` in `feature-catalog.yaml`, its
six criteria and the two comments above it. There is no design document; the decisions
were taken in conversation and are written out below. Do not reopen them. No earlier
plan comes from the same source, so there are no review records to read first.

**Why this shape, from the entry's comments:** on 2026-10-27 a sentence went into this
repository's `CLAUDE.md` only, and the developer had to point out that `AGENTS.md`, the
copy Cursor reads, had been identical until then. Setup copies one template into both
files, `/bootstrap` fills both, and nothing notices when they drift. `AGENTS.md` holds
the content because Cursor does not expand `@` imports. `CLAUDE.md` is the single line
`@AGENTS.md` because Claude Code does. A symlink was set aside as unreliable on Windows
checkouts.

**What the specifying session verified on 2026-10-27, against `main` at `db73d0c`:**

- `scripts/set-up-project.sh` copies `templates/CLAUDE.md` to both `CLAUDE.md` and
  `AGENTS.md` (two `cp` lines near the end). It refuses, changing nothing, when either
  already exists. It copies five guards into `.tropis/guards/`: `catalog-entries`,
  `rule-areas`, `rules-generated`, `installed-files` from `guards/`, and
  `project-layout` from `templates/`.
- `templates/CLAUDE.md` is the entry template. Its first line is
  `@.claude/framework/workflow.md`.
- `CLAUDE.md` and `AGENTS.md` at this repository's root are byte-identical (`diff`
  printed nothing).
- `scripts/take-version.mjs` never touches `CLAUDE.md` or `AGENTS.md` as shipped files:
  they are not under `SHIPPED_ROOTS` or `SHIPPED_PATHS` in `scripts/installed-files.js`.
  `apply()` walks the shipped files, merges `settings.json`, the rule areas and the two
  ignore files, regenerates the rules, writes the record, then builds the report.
  `stillNamesFramework()` is computed while building the report, after every write.
  The take refuses a dirty tree before writing anything.
- `guards/take-version.test.js`, in the v0.1.0 move test, expects the report's
  `Still names .framework/:` list to contain both `CLAUDE.md` and `AGENTS.md`.
- `guards/framework-integrity.test.js` scans the root `CLAUDE.md` for backticked paths.
  `guards/rule-delivery.test.js` (`reachableRoots()`) reads the root `CLAUDE.md` as the
  entry file and follows its backticked `.md` paths. Both use
  `FRAMEWORK_ROOT ?? …`, and run against the composed fixture in the self-check.
- `scripts/check-conformance.sh`, `install_instructions()`, copies
  `templates/CLAUDE.md` to `$WORK/CLAUDE.md`. `fixtures/base/CLAUDE.md` holds the
  sample project's entry content (it begins `# Example project`, then
  `@.claude/framework/workflow.md`). `fixtures/base/` has no `AGENTS.md`.
- Each conformance case is a line `defect-dir:guard-fragment` in `CASES`, with an overlay
  in `fixtures/defects/<defect-dir>/`.
- Framework documents that tell a project to write into "its own `CLAUDE.md`":
  `framework/workflow.md` (four places: the branch-protection bullet, the release
  pipeline bullet, the doc-closeout row on rules, and *Optional sections*),
  `framework/commit-format.md` (one), `framework/rule-delivery.md` (one, in the opening
  section), `bootstrap.md` (one, after the setup table). No file under `rules/`,
  `templates/README.md`, `commands/update.md` or `README.md` names `CLAUDE.md`.
- `commands/bootstrap.md` Stage 5 says "Fill `CLAUDE.md` / `AGENTS.md`". Its preamble says
  a project's own `CLAUDE.md` is moved aside and merged back. `bootstrap.md` Step 5 says
  "Fill both", its setup table has a row `CLAUDE.md`, `AGENTS.md` — the entry file, and
  its closing section says setup "copied four" guards and names four (it is five
  already; this plan makes it six).
- `framework/DECISIONS.md` ends at FW-030.
- `framework/rule-delivery.md` records that Cursor 3.24.12 received the root
  `CLAUDE.md`, and a nested `AGENTS.md`. No measurement in the repository says Cursor
  receives a root `AGENTS.md`.
- `.claude/settings.json` denies edits under `.claude/rules/`, `.claude/framework/` and
  `.tropis/`. It does not deny `CLAUDE.md` or `AGENTS.md`.

**Model tier: Medium.** Most text is given. The take-version change, its tests and the
fresh-agent probe need care.

**Requires:** any current Claude Code CLI for the fresh-agent checks in Task 7 (record which).

**Merge authority: parent review.** The change reaches every project's entry file and
its update path, and a wrong conversion would rewrite a project's instructions.

Do not store a kick-off prompt on this plan.

---

## Delivers

entry-instructions-live-in-one-file

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-entry-file -b plan/entry-instructions-live-in-one-file` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/` or `.cursor/`** in this repository. They are the
  installed release. The sources live under `scripts/`, `templates/`, `commands/`,
  `framework/`, `guards/` and `fixtures/`. The root `CLAUDE.md` and `AGENTS.md` are this
  plan's to change (Task 6), and nothing else at the root except `bootstrap.md`.
- **Add no dependency.** Use `node:` modules, and git through `spawnSync`.
- **Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Do not merge.

## Decisions

Taken by the specifying session on 2026-10-27.

### 1. The pair

- `CLAUDE.md` is exactly `@AGENTS.md` followed by one newline. The check accepts the line
  with or without that newline, and nothing else: no blank lines, no comment, no second
  import.
- `AGENTS.md` holds everything else, including the `@.claude/framework/workflow.md` import
  on its first line. Claude Code follows an import inside an imported file; Task 7
  measures that this holds.
- `templates/AGENTS.md` is new and holds today's `templates/CLAUDE.md` text unchanged.
  `templates/CLAUDE.md` becomes the single line. Use `git mv templates/CLAUDE.md
  templates/AGENTS.md`, then write the new `templates/CLAUDE.md`, so history follows the
  content.
- `scripts/set-up-project.sh` copies `templates/AGENTS.md` to `AGENTS.md` and
  `templates/CLAUDE.md` to `CLAUDE.md`. Its refusal list is unchanged.

### 2. The check: a new installed guard, `guards/entry-file.test.js`

A new guard rather than a line in `project-layout.test.js`, because `project-layout`
lives in `templates/` and the self-check never shows it failing. A guard in `guards/` is
run by conformance against a planted defect.

- Header `// Level: unit`, then a short docstring in the style of
  `guards/installed-files.test.js`: what it checks and where the root is.
- `const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');` — the
  installed-files idiom: two levels above `.tropis/guards/`.
- One `describe('entry file')`, two `it`s:
  - `AGENTS.md` exists. Failure message:
    `AGENTS.md is missing. It holds this project's entry instructions; CLAUDE.md points at it.`
  - `CLAUDE.md` is the single line. Read it (missing counts as wrong). Strip one trailing
    `\n`; anything other than `@AGENTS.md` fails with:
    `CLAUDE.md must be the single line @AGENTS.md. The entry instructions live in AGENTS.md: move anything else in CLAUDE.md there, then make CLAUDE.md that one line.`
  - Assert with `expect(problem).toBeNull()` or similar, so the message is what Jest
    prints. The file name must appear in the message.
- `scripts/set-up-project.sh` copies it into `.tropis/guards/` with the other four from
  `guards/`. It is under `.tropis/`, so the installed record fingerprints it and an update
  adds it with no further edit.
- Conformance: add `entry-file-not-pointer:entry-file` to `CASES` in
  `scripts/check-conformance.sh`, and the overlay `fixtures/defects/entry-file-not-pointer/CLAUDE.md`
  holding `@AGENTS.md`, a blank line, and `A project line added here by mistake.`.

### 3. The fixture and the two guards that read the entry file

- `git mv fixtures/base/CLAUDE.md fixtures/base/AGENTS.md`, then write
  `fixtures/base/CLAUDE.md` as the single line. The base must stay clean under the new
  guard.
- `install_instructions()` in `scripts/check-conformance.sh` copies
  `templates/AGENTS.md` to `$WORK/AGENTS.md` and `templates/CLAUDE.md` to
  `$WORK/CLAUDE.md`.
- `guards/framework-integrity.test.js` scans `AGENTS.md` instead of `CLAUDE.md`.
- `guards/rule-delivery.test.js`, `reachableRoots()`: the entry is `AGENTS.md`. Update
  the comment that says "the root DECISIONS.md that CLAUDE.md names" to say `AGENTS.md`.
- `fixtures/README.md`: where it says compose lays the "entry-file template" over
  `base/`, say "entry-file templates". Change nothing else there.

### 4. The update: `entryFiles(project)` in `scripts/take-version.mjs`

A plain function, called from `apply()` after the ignore-file merge and before the rules
are regenerated, so it runs before the report and `stillNamesFramework()`. It returns
what it did, and `apply()` puts it in `result.entry` and the report.

| `CLAUDE.md` | `AGENTS.md` | Writes | Report |
|---|---|---|---|
| the single line | any | nothing | nothing |
| present | identical to it | `CLAUDE.md` ← `@AGENTS.md\n`; `AGENTS.md` unchanged | `Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.` |
| present | absent | `AGENTS.md` ← `CLAUDE.md`'s text; `CLAUDE.md` ← `@AGENTS.md\n` | `Moved the entry instructions from CLAUDE.md to AGENTS.md, and pointed CLAUDE.md at it.` |
| absent | present | `CLAUDE.md` ← `@AGENTS.md\n` | `Wrote CLAUDE.md as the single line @AGENTS.md.` |
| present | different from it | nothing | under *Needs a decision*, see below |
| absent | absent | nothing | nothing (the entry-file guard names it) |

The report lines that change something go in their own paragraph before `Next:`, like
`Moved .framework/ to .tropis/`. The differing case goes in *Needs a decision*:

```
  CLAUDE.md and AGENTS.md differ, so neither was changed. Merge CLAUDE.md's lines
  into AGENTS.md, then make CLAUDE.md the single line @AGENTS.md. The lines that differ:
    <each line of the diff, indented four spaces>
```

The diff is `git diff --no-index --no-color -U0 -- AGENTS.md CLAUDE.md`, run with
`cwd: project` through the file's `run()` helper (exit 1 means they differ; anything
else above 1 is an error: refuse with the stderr). Drop the `diff --git` and `index`
header lines; keep `---`, `+++`, `@@` and the changed lines, so each line says which file
it came from.

When the pair differs, also add to `Next:`, before `Commit.`:
`  Merge CLAUDE.md into AGENTS.md as above. Until then the entry-file check fails.`

**Why the differing case changes nothing:** which lines win is the developer's call (the
entry's comment). **Why this lives in take-version and not in `/update`:** the take runs
from the new release's clone, while `/update` is the project's installed, older copy. A
new `/update` step reaches a project only on the release after the one adding it, so the
take's report must carry the whole instruction.

### 5. `/update` and `/bootstrap`

- `commands/update.md`, Stage 6: add an item after the `.new` files item, renumbering the
  ones after it:

  > **The entry files.** When *Needs a decision* says `CLAUDE.md` and `AGENTS.md`
  > differ, show the lines it lists. Propose the merged `AGENTS.md` and ask. On yes,
  > write it and make `CLAUDE.md` the single line `@AGENTS.md`. Until then the
  > entry-file check fails, and Stage 7 will fail.

- `commands/bootstrap.md`:
  - Stage 5 begins: "Fill `AGENTS.md` from the brief's identity. Leave `CLAUDE.md` as it
    is: the single line `@AGENTS.md`, which Claude Code follows to `AGENTS.md`." Keep the
    rest of the stage.
  - The preamble's "merge it back" sentence about a project's own `CLAUDE.md`: say it is
    merged back into `AGENTS.md`.
- `bootstrap.md`:
  - The setup table row becomes two rows: `AGENTS.md` — the entry file, from the
    template; `CLAUDE.md` — the single line `@AGENTS.md`.
  - Step 5: "The setup left `AGENTS.md` as the template and `CLAUDE.md` as the single line
    `@AGENTS.md`. Fill `AGENTS.md` from the brief's identity." Keep the rest; where the
    step says "the file", it now means `AGENTS.md`.
  - The sentence "A project's additions to a framework document go in its own
    `CLAUDE.md`" → `AGENTS.md`.
  - The closing section: setup copied six guards; add `installed-files.test.js` (fails a
    framework file edited after it was installed) and `entry-file.test.js` (fails a
    `CLAUDE.md` that is not the single line `@AGENTS.md`) to the list, and say "six".

### 6. Framework documents

Each place that tells a project to write into "its own `CLAUDE.md`" says `AGENTS.md`:
the four in `framework/workflow.md`, the one in `framework/commit-format.md`, the one in
the opening section of `framework/rule-delivery.md`. Change only the file name in each
sentence. Leave `rule-delivery.md`'s Cursor measurement as it is: it is a record of what
was measured.

`framework/DECISIONS.md`, append, in the shape of FW-030:

```markdown
## FW-031: A project's entry instructions live in AGENTS.md, and CLAUDE.md points at it

**Date:** 2026-10-27 · **Status:** Accepted

**Context:** Setup wrote the entry template into both `CLAUDE.md` and `AGENTS.md`, and
`/bootstrap` filled both. Nothing kept them together. In this repository a sentence went
into `CLAUDE.md` only, and the copy Cursor reads went stale with no sign of it.

**Decision:** `AGENTS.md` holds the entry instructions. `CLAUDE.md` is the single line
`@AGENTS.md`, and the project's checks fail on anything else. An update turns an
identical pair into that shape. Where the two differ it changes neither, and names the
lines for the developer to merge. Where an earlier entry says a project's own
`CLAUDE.md`, read `AGENTS.md`.

**Evidence:** Claude Code expands `@` imports, including one inside an imported file, so
a session still receives the workflow `AGENTS.md` imports (measured in the plan
`docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md`). Cursor does
not expand them, so the content cannot live behind an import Cursor would have to follow.

**Rejected:** A symlink from `CLAUDE.md` to `AGENTS.md` — unreliable on Windows
checkouts. Merging a differing pair during the update — which lines win is the
developer's call.

**Consequences:** A project edits one file. A project whose pair differed has a failing
check after the update until it merges them.
```

### 7. This repository's own pair

The two files are identical. Replace `CLAUDE.md` with the single line `@AGENTS.md` and
leave `AGENTS.md` exactly as it is. Nothing in this repository's installed checks reads the
pair (`npm --prefix .tropis test` runs the installed release, which has no entry-file
guard).

## Traps

- **The self-check reads committed content only, and exports no root `CLAUDE.md` or
  `AGENTS.md`** (`.gitattributes` export-ignores both). The conformance run reads the
  fixture and the templates, never this repository's own pair. Commit, then run it.
- **The v0.1.0 move test changes on purpose.** With an identical pair, the take now
  points `CLAUDE.md` at `AGENTS.md` before the report, so `Still names .framework/:`
  lists `AGENTS.md` and no longer `CLAUDE.md`. Change that expectation to
  `not.toContain('\n  CLAUDE.md\n')`, assert `CLAUDE.md` is the single line, and keep
  the `AGENTS.md` expectation. This is not a guard lowered: it is the behaviour this plan
  adds.
- **A take-version test world is set up by this branch's own setup script**, so its
  project already has the new pair. A test of the conversion must first write the old
  shape — the same text into both files, or two different texts — and commit it, before
  taking a release.
- **This session's own `CLAUDE.md` changes under it in Task 6.** That is expected. A
  session started after that commit reads `AGENTS.md` through the pointer.
- **Do not make Claude Code read `AGENTS.md` some other way** (a setting, a hook). The
  import is the mechanism, and Task 7 measures it.

## File Structure

| File | Change |
|---|---|
| `templates/AGENTS.md` | new, by `git mv` from `templates/CLAUDE.md`, Decision 1 |
| `templates/CLAUDE.md` | the single line, Decision 1 |
| `scripts/set-up-project.sh` | the two copies, and the new guard, Decisions 1 and 2 |
| `guards/entry-file.test.js` | new, Decision 2 |
| `scripts/check-conformance.sh` | the case and `install_instructions()`, Decisions 2 and 3 |
| `fixtures/defects/entry-file-not-pointer/CLAUDE.md` | new, Decision 2 |
| `fixtures/base/AGENTS.md` | new, by `git mv` from `fixtures/base/CLAUDE.md`, Decision 3 |
| `fixtures/base/CLAUDE.md` | the single line, Decision 3 |
| `fixtures/README.md` | one word, Decision 3 |
| `guards/framework-integrity.test.js` | scans `AGENTS.md`, Decision 3 |
| `guards/rule-delivery.test.js` | the entry is `AGENTS.md`, Decision 3 |
| `scripts/take-version.mjs` | `entryFiles()` and its report, Decision 4 |
| `guards/take-version.test.js` | Task 3, and the v0.1.0 expectation (*Traps*) |
| `guards/set-up-project.test.js` | Task 1 |
| `commands/update.md` | Decision 5 |
| `commands/bootstrap.md` | Decision 5 |
| `bootstrap.md` | Decision 5 |
| `framework/workflow.md` | Decision 6 |
| `framework/commit-format.md` | Decision 6 |
| `framework/rule-delivery.md` | Decision 6 |
| `framework/DECISIONS.md` | FW-031 |
| `CLAUDE.md` | the single line, Decision 7 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md` | the handover report |

Other guards may fail because of the change: `check-drift`, `installed-files`,
`check-version`, `update`, or a fixture. If one does, fix it, list the file in the
handover's *Scope* with the reason, and say so under *What the plan got wrong*.

## Review Focus

1. A fresh setup writes `CLAUDE.md` as exactly `@AGENTS.md\n` and `AGENTS.md` as the
   template.
2. The entry-file guard fails, naming `CLAUDE.md`, on the planted defect, and naming
   `AGENTS.md` when it is missing.
3. A take on an identical pair leaves `AGENTS.md` byte-for-byte as it was.
4. A take on a differing pair leaves both files byte-for-byte as they were, and its
   report shows lines from each.
5. A fresh Claude Code session in a set-up project quotes text from `AGENTS.md` and from
   the workflow it imports (Task 7).

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: its last line starts `Self-check passed`).

### Task 1 — The pair at setup

1. In `guards/set-up-project.test.js`, in *sets a project up in its own repository*,
   assert `CLAUDE.md` reads `@AGENTS.md\n` and `AGENTS.md` equals
   `templates/AGENTS.md`. In *names only .tropis/ paths it installed*, scan `AGENTS.md`
   alongside `CLAUDE.md`.
2. See them fail. Apply Decision 1. Commit.

### Task 2 — The guard, the fixture and conformance

1. Write `guards/entry-file.test.js` (Decision 2), add its copy to
   `scripts/set-up-project.sh`, and add `.tropis/guards/entry-file.test.js` to the
   expected list in `guards/set-up-project.test.js`. Apply Decision 3.
2. Commit, then run `bash scripts/check-blueprint.sh`. Expected: a line
   `caught      entry-file-not-pointer  entry-file`, and the clean baseline passes.
3. Show the guard also fails on a missing `AGENTS.md`. The conformance case covers only
   `CLAUDE.md`, so do this by hand: make a temporary directory holding only `CLAUDE.md`
   as the single line, run the one guard with `FRAMEWORK_ROOT` set to it, using the
   self-check's test tools in `.self-check/node_modules`, and record the command and the
   failure message. Expected: it fails naming `AGENTS.md`.

### Task 3 — The update

1. In `guards/take-version.test.js`, test first, one `it` per row of Decision 4's table
   (skip the both-absent row), plus:
   - the differing case: the take exits 0, both files are byte-for-byte unchanged, the
     report contains `CLAUDE.md and AGENTS.md differ, so neither was changed`, a `+`
     line from `CLAUDE.md` and a `-` line from `AGENTS.md`, and `Next:` contains
     `Merge CLAUDE.md into AGENTS.md`;
   - the identical case: `AGENTS.md` byte-for-byte unchanged, `CLAUDE.md` is
     `@AGENTS.md\n`, and the report line is present;
   - the already-pointed case: neither file changes and the report says nothing about
     them.
   Each test writes the old shape and commits before taking (*Traps*).
2. Change the v0.1.0 expectation (*Traps*).
3. See them fail. Implement Decision 4. See them pass. Commit.

### Task 4 — Commands and documents

Apply Decisions 5 and 6. Commit. Run `bash scripts/check-blueprint.sh`; it passes.

### Task 5 — Grep for what was missed

Run `git grep -n -F "CLAUDE.md" -- framework commands templates scripts guards fixtures bootstrap.md rules`.
First plant a hit to show the search finds one (for example, check it lists
`templates/CLAUDE.md`'s own path in `scripts/set-up-project.sh`). Every remaining hit
must be one of: the pointer itself, a refusal or ignore list naming both files, a
historical record (`framework/DECISIONS.md` entries before FW-031, the Cursor
measurement in `rule-delivery.md`), or a test. Fix any that tells a project to write
content into `CLAUDE.md`, and list it in the handover's *Scope*.

### Task 6 — This repository's pair

Apply Decision 7. Commit with a body saying the content is unchanged and now lives in
`AGENTS.md` only.

### Task 7 — Fresh-agent checks

In a scratch folder in the system temp directory: `git init -b main`, run this
worktree's `scripts/set-up-project.sh` on it, then `npm --prefix .tropis install`, and
commit. In `AGENTS.md`, replace the first Gotchas placeholder with
`- **Marker: the cache is cleared with make flush-cache.** Clearing it by hand leaves stale keys.`
and commit. Start each session with `claude -p` from that folder and no other context,
and tell it the work is a probe whose output is discarded.

1. "This is a probe; your answer is discarded. Without reading any file, answer from your
   instructions only: what is the first gotcha in this project's entry instructions, and
   which three commands does the development workflow's preflight section give?"
   Expected: the marker sentence, and `git fetch origin`, `git status --porcelain`,
   `git rev-parse main origin/main`.
2. "This is a probe; the change is discarded. Add a gotcha to this project's entry
   instructions: the build must run with NODE_ENV=production or the bundle is unminified."
   Run with edits allowed. Expected: `AGENTS.md` changed, `CLAUDE.md` still
   `@AGENTS.md`. Then run `npm --prefix .tropis test` there; expected: passes.
3. If a Cursor command-line agent is on `PATH`, run probe 1 with it and record the
   result. If none is, record that Cursor was not probed; do not install one.

Record tool, version (`claude --version`), machine (`uname -a`) and each outcome. If a
run does not do what is expected, fix the text it read and run it again, and report each
round. Delete the scratch folder.

### Task 8 — The entry

1. Set `entry-instructions-live-in-one-file` to `shipped`.
2. Fill `modules` with `templates/AGENTS.md`, `scripts/set-up-project.sh`,
   `scripts/take-version.mjs` and `guards/entry-file.test.js`.
3. Add a comment above the entry naming this plan's handover report. Do not name a
   commit hash: a squash-merge discards them.
4. Run `npm --prefix .tropis test` and `bash scripts/check-blueprint.sh`.
5. Commit. The body says, for each criterion, what backs it:

| Criterion | Backed by |
|---|---|
| 1 a new project's pair | Task 1 setup test |
| 2 `/bootstrap` fills `AGENTS.md` only | Decision 5 text; Task 7 probe 2 (an agent adding to the entry instructions edits `AGENTS.md`) |
| 3 a fresh Claude Code session receives `AGENTS.md` and the workflow | Task 7 probe 1 |
| 4 the update converts an identical pair, refuses on a differing one | Task 3 tests |
| 5 the checks fail naming the file | Task 2 conformance case and the missing-`AGENTS.md` run |
| 6 this repository's pair | Task 6; `cat CLAUDE.md` prints `@AGENTS.md` |

   Then add a line: `Fresh-agent check: <from Task 7, with tool, version and machine>`.

If a criterion has no backing, leave the entry at `building` and say so.

### Task 9 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Under *Outstanding*, say whether Cursor was probed and what it received. Commit it, push
the branch, and open a pull request against `main`. Do not merge.

## Not in this plan

- Measuring which root files Cursor reads. Task 7 records it when a Cursor agent is
  available; otherwise it is an outstanding item for review.
- Nested `CLAUDE.md` or `AGENTS.md` files in a project's subfolders. Nothing the framework
  ships writes them.
- The product README. Nothing it names is removed or renamed; `/refresh-readme` keeps it
  current.

## Handover report

### Task completion

Tasks 0 through 9 are done. No task was skipped. The scratch project for Task 7 was created under `/tmp`, probed, and deleted.

### Verification results

`bash scripts/check-blueprint.sh` on `dacf48e` (this run, after the catalog commit). Last lines:

```
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
...
  caught      entry-file-not-pointer entry-file
...
Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

Exit 0. Elapsed 276469 ms. The same command on `6a6f7ad` had already printed `caught      entry-file-not-pointer entry-file` and passed. On `1819a13` it failed the clean baseline with `framework integrity › references no file that does not exist`; after the exemption commit `41de282` it passed again.

`npm --prefix .tropis test` in this worktree, after the catalog edit and before that commit: 5 suites passed, 31 tests passed. That is the installed release, which has no entry-file guard.

`guards/take-version.test.js`, full file, with `TROPIS_V010` set from `git archive v0.1.0`: 38 passed.

Task 2, missing `AGENTS.md`. A temporary directory holding only `CLAUDE.md` as `@AGENTS.md\n`, then:

```
FRAMEWORK_ROOT=<that directory> node --experimental-vm-modules .self-check/node_modules/.bin/jest --config jest.config.js guards/entry-file.test.js --no-coverage
```

Exit 1. The failure Jest printed:

```
Received: "AGENTS.md is missing. It holds this project's entry instructions; CLAUDE.md points at it."
```

The other test in that run passed. `cat CLAUDE.md` in this worktree prints `@AGENTS.md`.

Task 7, platform macOS 26.2 (Darwin 25.2.0), arm64. Tool `claude --version`: `2.1.300 (Claude Code)`. Probe 1 was `claude -p --tools ""` from the scratch project, so it could not read a file. Its answer:

```
**First gotcha:** The cache is cleared with `make flush-cache`. Clearing it by hand leaves stale keys.

**Preflight commands:**
git fetch origin
git status --porcelain
git rev-parse main origin/main
```

Probe 2 was `claude -p --dangerously-skip-permissions`. It edited `AGENTS.md` only, replacing the second gotcha placeholder with a `NODE_ENV=production` gotcha, and left `CLAUDE.md` as the bytes `40 41 47 45 4e 54 53 2e 6d 64 0a` (`@AGENTS.md` plus one newline). `npm --prefix .tropis test` in that project: 6 suites passed, 33 tests passed. The scratch folder was then deleted.

`cursor-agent --version`: `2025.09.18-7ae6800`, on `PATH` at `~/.local/bin/cursor-agent`. Probe 1 exited 1 and printed `Press any key to sign in...`. No answer.

### Scope

Worktree: `~/src/tropis-entry-file`, branch `plan/entry-instructions-live-in-one-file`.

`git diff --stat origin/main...HEAD` before this handover commit:

```
 CLAUDE.md                                         |  83 +-------------
 bootstrap.md                                      |  31 ++---
 commands/bootstrap.md                             |   5 +-
 commands/update.md                                |  12 +-
 feature-catalog.yaml                              |  10 +-
 fixtures/README.md                                |   2 +-
 fixtures/base/AGENTS.md                           |   5 +
 fixtures/base/CLAUDE.md                           |   6 +-
 fixtures/defects/entry-file-not-pointer/CLAUDE.md |   3 +
 framework/DECISIONS.md                            |  26 +++++
 framework/commit-format.md                        |   2 +-
 framework/rule-delivery.md                        |   2 +-
 framework/workflow.md                             |   8 +-
 guards/entry-file.test.js                         |  49 ++++++++
 guards/framework-integrity.test.js                |   5 +-
 guards/rule-delivery.test.js                      |   4 +-
 guards/set-up-project.test.js                     |   6 +
 guards/take-version.test.js                       |  89 ++++++++++++++-
 scripts/check-conformance.sh                      |   2 +
 scripts/set-up-project.sh                         |   3 +-
 scripts/take-version.mjs                          |  63 +++++++++++
 templates/AGENTS.md                               | 130 +++++++++++++++++++++
 templates/CLAUDE.md                               | 131 +---------------------
 23 files changed, 427 insertions(+), 250 deletions(-)
```

Every path is in the File Structure table. This commit adds only this plan file, which is also in that table.

Task 5's search was `git grep -n -F "CLAUDE.md" -- framework commands templates scripts guards fixtures bootstrap.md rules`. It found the planted hit `scripts/set-up-project.sh` copying `templates/CLAUDE.md`. Two hits were not in the allowed set and were fixed, both in `bootstrap.md` (already in the table): the vocabulary no longer calls `CLAUDE.md` an entry file, and content moved aside before setup is merged back into `AGENTS.md`. The integrity exemption is an extra change inside `guards/framework-integrity.test.js`, which the table already lists.

### Judgment calls

FW-031 cites the plan path in backticks, and a set-up project does not have that file, so the integrity guard exempts `docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md`. The decision text is unchanged.

Probe 1 disabled tools with `--tools ""`. The plan said not to read a file; an empty tool list is what made that true. A user-level `~/.claude/CLAUDE.md` still loads on this machine. It does not contain the marker sentence, and the answer quoted the marker.

The already-pointed take-version test passed before `entryFiles` existed, because a take already left those two files alone. It stayed, as the lock on that row.

Running `guards/set-up-project.test.js` from this checkout fails `records every shipped file at version unknown`: `git describe` returns `v0.4.2-16-g9459de1` rather than `unknown`. The self-check runs that test against an archive with no `.git`, where it passes. Nothing in that test was changed.

### What the plan got wrong

The evidence sentence in FW-031, as written, fails the clean baseline. `framework-integrity` treats a backticked `docs/` path as a file the project must have. Other decision entries cite plan paths without backticks. The exemption is the fix; the specified text was kept.

The scan of `AGENTS.md` added in Task 1 did not go red. Both files already named only paths the setup had installed, so that assertion passed before Decision 1. The `CLAUDE.md` content assertion is what failed, and it failed on the full template.

### Outstanding

Cursor was not probed. `cursor-agent` 2025.09.18-7ae6800 is on `PATH` and exited asking to sign in, so it received nothing and returned no answer. Which root files a signed-in Cursor agent reads is still unmeasured. Signing in is the developer's step; this session did not install or authenticate a client.

## Review record

Reviewed by the specifying session on 2026-10-27, on the branch at `383e671` and after.

### Checks re-run

- `bash scripts/check-blueprint.sh` on `383e671`: `caught      entry-file-not-pointer entry-file`,
  `ok          clean baseline`, and `Self-check passed: …`. Exit 0. This run is after the two
  review fixes below, so the clean baseline passes with no integrity exemption.
- `guards/take-version.test.js`, `guards/set-up-project.test.js` and
  `guards/entry-file.test.js` on an archive of the branch, `TROPIS_V010` set from
  `git archive v0.1.0`: take-version 38 of 38, set-up-project all passed. The entry-file
  guard failed both tests there, correctly: the archive has no root `CLAUDE.md` or
  `AGENTS.md` (`.gitattributes` export-ignores both), and the guard is meant to run in a
  project or with `FRAMEWORK_ROOT` set.
- **Re-broke the update.** In that archive, `const entry = entryFiles(project);` was
  replaced with `const entry = {};`. Result: 5 failed, 33 passed. The four new conversion
  tests and the v0.1.0 move test went red. The already-pointed test stays green either
  way, as the handover said: it locks a row the take already satisfied.
- The guard's own break is the conformance case above. The missing-`AGENTS.md` run is
  the handover's (exit 1, message naming `AGENTS.md`); not re-run.
- Scope: `git diff --stat origin/main...HEAD` is 24 files, all in the File Structure
  table. `diff` of `main`'s `templates/CLAUDE.md` against `templates/AGENTS.md`, and of
  `main`'s `CLAUDE.md` against `AGENTS.md`, printed nothing.
- CI on the pull request: `pipeline / plan` and `pipeline / framework / checks` passed;
  the other jobs skipped.
- **The Cursor probe the handover left outstanding.** After the developer signed in,
  Task 7's probe 1, word for word, in a fresh set-up scratch project, with
  `cursor-agent -p … --output-format stream-json < /dev/null`. Tool: `cursor-agent`
  2025.09.18-7ae6800, model `Auto`. Machine: the same Mac as the handover's Task 7
  (Darwin 25.2.0, arm64). No tool call in the stream. Its answer quoted the marker
  gotcha from `AGENTS.md`, and said the preflight commands were not in its instructions
  because `@.claude/framework/workflow.md` did not expand. That is the expected result:
  Cursor receives `AGENTS.md` and does not follow imports, and `AGENTS.md`'s first
  paragraph tells such a tool to read the workflow itself (it did not here, because the
  probe forbade reads). With stdin left open, the same command printed nothing for five
  minutes and was stopped.

### Found

- **A refusal after writes.** `entryFiles()` runs after the shipped files are written,
  and refused when `git diff --no-index` exited above 1. That would leave a half-taken
  update, which the take's header promises never happens. Fixed on the branch: the
  failure is now listed in place of the differing lines, and the pair is still left
  unchanged. Understood and mechanical, so fixed here rather than sent back; the error
  path has no test, because nothing in a test world makes that diff fail.
- **The plan's FW-031 text named the plan in backticks.** The integrity guard then
  required that file in every set-up project, and the executor added an exemption, which
  the plan's own *Traps* should have prevented. Fixed on the branch: FW-031 names the
  plan in plain text, as the other decisions do, and the exemption is gone.
- The executor's note that `guards/set-up-project.test.js` fails `records every shipped
  file at version unknown` when run from a tagged checkout predates this plan: the test
  is written for the self-check's export, which has no `.git`.

### Outstanding disposition

- *Cursor was not probed* — done in review, above.
- *Which root files a signed-in Cursor agent reads* — measured for the command-line
  agent and recorded in `framework/rule-delivery.md`. The Cursor editor's agent was not
  measured; dropped, because the editor and the command-line agent are documented to
  share project rules and the measurement here is the one an agent can repeat.
- No developer check by hand: the change has no screen.

### Learnings routed

- Cursor's command-line agent receives the root `AGENTS.md` and does not expand an
  import in it, and it hangs in `-p` with stdin open: written into
  `framework/rule-delivery.md`, beside the existing Cursor measurements, on this branch.
- A decision citing a plan names it in plain text, not backticks: not routed yet. This
  repository's gotcha *A framework document may name an absent file only through the
  integrity guard* points the author at the exemption, which is the wrong fix for a plan
  citation. Proposed to the developer as a one-line amendment to that gotcha in
  `AGENTS.md`, on its own branch.
- Nothing else generalises.

### Merged because

Every criterion is backed by a test or a measured probe, including Cursor, which the
handover could not reach, and the two defects found in review were mechanical and are
fixed on the branch, with the self-check green after them.
