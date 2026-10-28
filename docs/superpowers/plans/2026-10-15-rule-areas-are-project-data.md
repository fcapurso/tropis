# A project's rule areas live in its own file — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 8 is a handover to the developer: it stops the
> plan until a Cursor check has been run and recorded.

**Goal:** In a newly set-up project, the framework's shipped rule texts live in
`.framework/rules/` and their areas in the project's own `.claude/rule-areas.json`; one
command writes each shipped rule's Claude Code file and every rule's Cursor file — the
latter in the form measured to reach a Cursor agent — stamps each generated file with a
content hash, and has a check mode the project's checks run. A project's own rules stay
hand-written in `.claude/rules/`.

**Spec:** the entry `rule-areas-are-project-data` in `feature-catalog.yaml` — its nine
acceptance criteria and the comments above it, which record every decision. The evidence
behind them: `docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md` (what reaches
a Cursor agent) and `docs/superpowers/specs/2026-10-15-rule-tooling-finding.md` (why the
generator stays ours, and the hash and check mode borrowed from ai-rulez, with proposed
criteria this entry's criteria were written from). Read all three first.

**What this delivers:** `rule-areas-are-project-data`, all nine criteria. See *Criteria and
their evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `19de1ac`:**

- **The generator today** is four files, 154 lines with its guard:
  - `scripts/rule-areas.js` — `parseRule(text)` reads a one-line `paths: [JSON array]`
    header between `---` lines and returns `{ paths, body }`.
  - `scripts/generate-cursor-rules.mjs` — for every `.claude/rules/*.md`, writes
    `.cursor/rules/<name>.mdc` with `description: <name> rules (generated from
    .claude/rules/<file> — do not edit)`, `globs: ${JSON.stringify(globs)}` (a JSON array —
    **the form that reached no Cursor agent**), `alwaysApply: false`, a blank line and the
    body. Exits 1 on a rule with no header. Run by `npm --prefix .framework run
    rules:cursor` (`templates/package.json`).
  - `scripts/projections.js` — `projectionOf(path)` maps `.claude/rules/<n>.md` to
    `.cursor/rules/<n>.mdc`, else null. Read by the generator and by
    `scripts/plan-binding.js` › `missingProjections`, which `/dispatch` and
    `guards/plan-dispatchable.test.js` use to refuse a plan listing a rule without its
    projection.
  - `guards/cursor-rules-projection.test.js` — every `.claude/rules/*.md` has a `.mdc`, the
    bodies match, the `globs` is a non-empty **JSON array**. Not installed into projects.
- **The shipped rules** are `rules/{catalogs,harness-scripts,learnings,planning,tests}.md`,
  each opening with a header; their areas today:
  `catalogs` `["feature-catalog.yaml"]`; `harness-scripts` `[".framework/**"]`;
  `learnings` `["DECISIONS.md", ".claude/framework/**", ".claude/rules/**", ".claude/commands/**"]`;
  `planning` `["docs/superpowers/plans/**", "docs/superpowers/specs/**"]`;
  `tests` `["**/__tests__/**", "**/*.test.*", "**/*.spec.*", "test/**", "tests/**"]`.
  None contains a comma.
- **The setup** (`scripts/set-up-project.sh`) copies `rules/*.md` to `.claude/rules/`, the
  scripts in `scripts/installed-scripts.txt` to `.framework/scripts/`, the guards
  `catalog-entries`, `rule-areas` and `templates/project-layout.test.js` to
  `.framework/guards/`, refuses when any of a listed set of paths exists, and finally runs
  `generate-cursor-rules.mjs`. `guards/set-up-project.test.js` › *sets a project up…*
  asserts the installed file list and that `.cursor/rules/` and `.claude/rules/` hold the
  same names.
- **The self-check** (`scripts/check-conformance.sh`): `install_instructions` copies
  `rules/*.md` into the composed project's `.claude/rules/`; `compose` then runs
  `generate-cursor-rules.mjs`. `CASES` maps defect `orphan-rule` → guard `rule-areas` and
  `projection-drift` → `cursor-rules-projection`. `fixtures/base/.claude/rules/` holds stub
  copies of the five shipped rules plus five of the sample project's own (`area`,
  `backend`, `ci`, `frontend`, `shared`), each with a header.
  `fixtures/defects/projection-drift/.cursor/rules/backend.mdc` is a drifted projection of
  an own rule; `orphan-rule/.claude/rules/orphan.md` is a rule with no header;
  `unpaired-projection` is a plan listing a rule without its `.mdc`.
- **Pages that tell an agent to edit a header or run `rules:cursor`:** `rules/learnings.md`
  (lines 13–15), `rules/planning.md` (the *A rule file and its Cursor projection are one
  edit* bullet, lines 179–186, and checklist item 4, line 204), `framework/workflow.md`
  (doc-closeout row, line 254), `framework/rule-delivery.md` (*What each tool delivers*,
  *What is not met*), `commands/capture-learning.md` (lines 77–82),
  `commands/bootstrap.md` (lines 55–57), `bootstrap.md` (lines 71, 174–212, 225, 268, 301),
  `fixtures/README.md` (lines 21, 49–51), `README.md` (line 102, the `scripts/` row).
  `templates/CLAUDE.md`'s sentences on rule delivery belong to
  `entry-file-says-how-rules-arrive`, ordered after this entry — not here.
- **What Cursor 3.24.12 attached** (the Cursor finding): `.cursor/rules/<n>.mdc` with
  `alwaysApply: false`, a `description`, and `globs:` unquoted — one directory glob, or
  several separated by a comma and a space — on a read, not on a create. **Not measured:**
  a glob naming one file (`feature-catalog.yaml`), a glob beginning with `*`
  (`**/*.test.*`), and text after the body. All three ship in this plan, so Task 8
  measures them.

**Model tier: Medium–large.** The design is decided and the files are named; the generator,
its check mode and the guard changes are written to it across about thirty files.

**Requires:** any current Claude Code CLI for Tasks 7 and 9, and the developer at the Cursor application for Task 8 (record which).

**Merge authority: parent review.** It changes how every set-up project receives its rules.

Do not store a kick-off prompt on this plan.

---

## Delivers

rule-areas-are-project-data

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-rule-areas -b plan/rule-areas-are-project-data` |
| worked example (`first-adopter`) | do not edit | |

## Global Constraints

- **Do not reopen a decision under *Decisions*.** If one cannot be built as written, stop
  and report.
- **Do not edit `.claude/` or `.framework/` in this repository** — the installed release.
  This repository takes the new layout through `project-takes-a-framework-version`, like
  any project.
- **No migration code.** Nothing here moves an already set-up project; that is
  `project-takes-a-framework-version`'s.
- **No new dependency.** The generator stays a Node script using only `node:` modules (the
  areas file is JSON).
- **Every Cursor file is written in the measured form and nothing else** — no extra
  front-matter field, no comment before the body.
- **Do not touch `templates/CLAUDE.md`'s rule-delivery sentences** —
  `entry-file-says-how-rules-arrive`.
- **Do not lower, skip or delete a guard to get green.** Replacing
  `cursor-rules-projection` with `rules-generated` is specified below; it is not a skip.
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken in shaping with the developer on 2026-10-15; do not reopen them.

1. **Only shipped rules are generated.** Their texts — no header — live in
   `.framework/rules/<name>.md` in a project (in this repository, `rules/<name>.md` loses its
   header). A project's own rules stay hand-written in `.claude/rules/` with their own
   header, and the generator never writes them.
2. **The areas file is `.claude/rule-areas.json`**, an object keyed by shipped rule name,
   each value a non-empty array of glob strings:
   `{ "catalogs": ["feature-catalog.yaml"], "tests": ["**/__tests__/**", …] }`. The shipped
   default is `templates/rule-areas.json`, holding today's five headers exactly. JSON,
   because globs that begin with `*` must be quoted in YAML.
3. **The generator fails, naming the problem and writing nothing,** when: the areas file
   lacks a shipped rule, names a rule that is not shipped, or gives an empty list; a glob
   contains a comma (it cannot be written in the measured form); or a project rule in
   `.claude/rules/` has the name of a shipped rule, or has no header.
4. **What it writes, and nothing else:**
   - for each shipped rule, `.claude/rules/<name>.md`: `---`, `paths: <JSON array from the
     areas file>`, `---`, the text, then the hash line;
   - for every rule, shipped and own, `.cursor/rules/<name>.mdc`: `---`,
     `description: <name> rules (generated — do not edit)`, `globs: <globs joined by ", ">`,
     `alwaysApply: false`, `---`, a blank line, the body (without any header), then the
     hash line.
   Running it twice writes identical bytes.
5. **The hash line** is the last line of each generated file:
   `<!-- generated by .framework/scripts/generate-rules.mjs · sha256:<hex> -->`, where
   `<hex>` is the SHA-256 of everything above that line. Front matter is untouched, so the
   measured Cursor form holds; Task 8 measures that text after the body does not stop a
   rule attaching.
6. **Check mode:** `node .framework/scripts/generate-rules.mjs --check` writes nothing,
   lists every generated file that is missing, extra, or differs from what the sources
   would write — saying *edited by hand* when its hash line no longer matches its own
   content, *stale* otherwise — and exits 1 if it listed any. Exit 0 and a one-line "rules
   up to date" otherwise.
7. **Names.** The generator becomes `scripts/generate-rules.mjs` (replacing
   `generate-cursor-rules.mjs`); the command is `npm --prefix .framework run rules`
   (replacing `rules:cursor`), and `npm --prefix .framework run rules -- --check`.
8. **Plan checks follow the generator.** `projectionOf` returns every path the generator
   writes from a source: `.claude/rules/<n>.md` (an own rule) →
   `[.cursor/rules/<n>.mdc]`; `.framework/rules/<n>.md` and `rules/<n>.md` (a shipped text)
   → `[.claude/rules/<n>.md, .cursor/rules/<n>.mdc]`; `.claude/rule-areas.json` → `[]`
   with the plan check asking instead for every shipped rule's two generated files. A plan
   listing a source without what is written from it is still refused, and
   `missingProjections` keeps its shape — one `{ source, projection }` per missing path.
9. **The project's checks run the check mode.** A new guard, `guards/rules-generated.test.js`,
   runs it and also checks every `.mdc` field by field against Decision 4. It replaces
   `guards/cursor-rules-projection.test.js` and is installed into projects. `rule-areas`
   keeps checking that every `.claude/rules/*.md` has a header — generated ones have.
10. **Existing projects keep their layout** until `project-takes-a-framework-version`. The
    release notes say so and mark the release breaking for anyone taking it by hand.
11. **A decision record, FW-012,** in `framework/DECISIONS.md`: a shipped rule's areas are
    the project's data; only shipped rules are generated; the generator is ours, with a
    hash and a check mode; JSON. Rejected: generating every rule; leaving the header out of
    a fingerprint; adopting a rule-sync tool (the tooling finding).

## Traps

- **`paths:` stays the Claude Code header.** Only where it comes from changes. Do not
  rename it.
- **The Cursor file's body for an own rule is its text without the header**, as today.
- **`rule-areas` also runs in this repository's composed self-check**, where the generated
  shipped rules must exist before it runs — `compose` runs the generator first.
- **The base fixture keeps its own rules in `.claude/rules/`** and moves its five shipped
  stubs to `fixtures/base/.framework/rules/` without headers, with
  `fixtures/base/.claude/rule-areas.json`. Without `INSTRUCTIONS`, those stubs are what is
  checked; with it, `install_instructions` overwrites them with `rules/*.md` and
  `templates/rule-areas.json`. `fixtures/README.md` says the base holds no `.mdc`; it holds
  no generated `.claude/rules/` file either.
- **`projection-drift` keeps its fixture** but is now caught by `rules-generated`; update
  its `CASES` line. Add one defect, `hand-edited-rule`, whose overlay changes a line in a
  generated shipped `.claude/rules/*.md` without touching its hash line;
  `rules-generated` must fail on it, naming *edited by hand*.
- **A glob beginning with `*` must not be quoted** in the `.mdc`, even though YAML would
  want it: the measured form is unquoted, and Cursor reads that line itself. Task 8 tells
  you whether it attaches.
- **The installed `.claude/` here still has `rules:cursor`** and headed rules; this
  repository's own `CLAUDE.md` and `AGENTS.md` (line 67) name `rules:cursor` for the
  installed release. Leave them.

## File Structure

| File | Change |
|---|---|
| `rules/catalogs.md` | Header removed |
| `rules/harness-scripts.md` | Header removed |
| `rules/learnings.md` | Header removed; lines 13–15: a shipped rule's area is set in `.claude/rule-areas.json`, a project's own rule carries its header; run `npm --prefix .framework run rules` |
| `rules/planning.md` | Header removed; the projection bullet and checklist item 4 follow Decision 8 |
| `rules/tests.md` | Header removed |
| `templates/rule-areas.json` | New — the five shipped areas, Decision 2 |
| `templates/package.json` | `rules` replaces `rules:cursor` |
| `templates/project-layout.test.js` | Expects `.framework/rules/` and `.claude/rule-areas.json` |
| `scripts/rule-areas.js` | Reads the areas file and validates it (Decision 3); `parseRule` stays |
| `scripts/generate-rules.mjs` | New — Decisions 3–6 |
| `scripts/generate-cursor-rules.mjs` | Deleted |
| `scripts/projections.js` | Decision 8 |
| `scripts/plan-binding.js` | `missingProjections` uses the new `projectionOf`, the areas-file case included, and keeps returning one `{ source, projection }` per missing path, so `scripts/dispatch.mjs` and `guards/dispatch.test.js` (which asserts `.cursor/rules/tests.mdc` in the refusal) need no change |
| `scripts/installed-scripts.txt` | `generate-rules.mjs` replaces `generate-cursor-rules.mjs` |
| `scripts/set-up-project.sh` | Copies shipped texts to `.framework/rules/`, the areas template to `.claude/rule-areas.json`, installs `rules-generated.test.js`, refuses an existing `.claude/rule-areas.json`, runs `generate-rules.mjs` |
| `scripts/check-conformance.sh` | `install_instructions` and `compose` follow the new layout; `CASES` updated and `hand-edited-rule` added |
| `guards/rules-generated.test.js` | New — Decision 9 |
| `guards/cursor-rules-projection.test.js` | Deleted (replaced by `rules-generated`) |
| `guards/rule-areas.test.js` | Also checks the areas file names every shipped rule, only those, with non-empty lists |
| `guards/set-up-project.test.js` | New file list; generated and own rules both projected; areas file present |
| `guards/plan-dispatchable.test.js` | Cases for Decision 8 |
| `fixtures/base/.framework/rules/{catalogs,harness-scripts,learnings,planning,tests}.md` | New — the shipped stubs, moved, without headers |
| `fixtures/base/.claude/rules/{catalogs,harness-scripts,learnings,planning,tests}.md` | Deleted (now generated) |
| `fixtures/base/.claude/rule-areas.json` | New — the stubs' areas |
| `fixtures/defects/hand-edited-rule/.claude/rules/catalogs.md` | New defect |
| `fixtures/README.md` | Lines 21 and 49–51: the new layout |
| `framework/rule-delivery.md` | What each tool gets, from the areas file and the generator; Cursor now generated in the measured form, pending Task 8's result |
| `framework/workflow.md` | Doc-closeout row (line 254) |
| `framework/DECISIONS.md` | New FW-012 |
| `commands/capture-learning.md` | Lines 77–82 |
| `commands/bootstrap.md` | Lines 55–57 |
| `bootstrap.md` | Lines 71, 174–212, 225, 268, 301 |
| `README.md` | Line 102, the `scripts/` row |
| `RELEASES.md` | `## [Unreleased]`: the new layout; breaking for a project taking it by hand; existing projects wait for the update command |
| `docs/verification-log.md` | Task 8's entry, via `/manual-check` |
| `feature-catalog.yaml` | `rule-areas-are-project-data` to `shipped`, at merge, by the reviewer |
| `docs/superpowers/plans/2026-10-15-rule-areas-are-project-data.md` | Handover report |

If a grep in Task 6 finds another file naming `generate-cursor-rules`, `rules:cursor`,
`projectionOf` or telling a project to edit a shipped rule's header, stop and report it —
the table is wrong, and the reviewer decides.

Doc closeout: rules and framework documents change (Task 9's fresh-agent check);
a choice between real alternatives is recorded (FW-012); adopter-facing claims change
(`README.md`, `bootstrap.md`); the release notes say what a project gets.

---

### Task 1: The areas file and its reader

1. Write `templates/rule-areas.json` from the five headers listed under *What the
   specifying session verified*, exactly.
2. In `scripts/rule-areas.js`, add a pure function that takes the parsed areas object and
   the list of shipped rule names and returns the problems of Decision 3 that concern the
   areas file. Keep `parseRule`.
3. Remove the header (the first three lines) from each `rules/*.md`.

Commit.

### Task 2: The generator

Write `scripts/generate-rules.mjs` to Decisions 3–7. Keep it a thin I/O shell over pure
functions (render one Claude file, render one Cursor file, hash a text) so the guard can
test them without the filesystem — the pattern `rule-areas.js` follows. It resolves the
project root two levels above itself, as the old generator did. Delete
`generate-cursor-rules.mjs`; update `installed-scripts.txt`, `templates/package.json` and
`scripts/projections.js` / `scripts/plan-binding.js` (Decision 8).

Commit.

### Task 3: Setup and self-check

Update `scripts/set-up-project.sh`, `templates/project-layout.test.js`,
`scripts/check-conformance.sh` and the fixtures as the *File Structure* and *Traps* say.

Commit.

### Task 4: Guards

Write `guards/rules-generated.test.js` (Decision 9): run the check mode against the tree
under test (`FRAMEWORK_ROOT`, as the other installed guards do) and require exit 0; parse
every `.cursor/rules/*.mdc` front matter and require exactly the three fields of Decision 4
in that order, `globs` unquoted and comma-space separated, `alwaysApply: false`; and unit
cases for the render and hash functions, including a hand-edited file reported as such.
Delete `guards/cursor-rules-projection.test.js`. Extend `rule-areas.test.js`,
`set-up-project.test.js` and `plan-dispatchable.test.js` as listed.

After each guard change, run it at once, see it red on a deliberate break, restore it.

Commit.

### Task 5: Pages

Rewrite the lines listed in *File Structure* so that each says: a shipped rule's area is
changed in `.claude/rule-areas.json`; a project's own rule is written in
`.claude/rules/<area>.md` with a `paths:` header; after changing either, run
`npm --prefix .framework run rules`; `npm --prefix .framework test` fails while generated
files are out of date. Nothing may tell a project to edit a shipped rule's header or its
`.mdc`. Write FW-012 (Decision 11) and the `RELEASES.md` section (Decision 10).

`framework/rule-delivery.md` reports the Cursor side as "generated in the form measured on
2026-10-15; whether a single-file glob and a glob beginning with `*` attach is Task 8's
check" until Task 8 returns, then states the result.

Commit.

### Task 6: Checks

```bash
npm --prefix .framework test
git add -A && git commit -m "…" && bash scripts/check-blueprint.sh
git diff --stat origin/main...HEAD
grep -rn "generate-cursor-rules\|rules:cursor" --exclude-dir=node_modules --exclude-dir=.self-check --exclude-dir=docs -I . | grep -v "^\.claude/\|^\.framework/\|^CLAUDE.md\|^AGENTS.md\|^feature-catalog"
```

Expected: both suites green, the self-check listing `hand-edited-rule` as *caught* by
`rules-generated` and `projection-drift` as *caught* by `rules-generated`; the diff stat
matching *File Structure*; the grep printing nothing.

Then in a scratch folder: `git init`, run this branch's `scripts/set-up-project.sh` on it,
`npm --prefix .framework install`, `npm --prefix .framework test` (green), then
`npm --prefix .framework run rules -- --check` (exit 0). Edit one line of the generated
`.claude/rules/catalogs.md`; `--check` must exit 1 naming it *edited by hand*. Change
`tests`' list in `.claude/rule-areas.json`; `--check` must name the two `tests` files
*stale*; `rules` then rewrites them and `--check` exits 0. Paste every output.

### Task 7: Claude Code

In a fresh scratch project set up from this branch, with one sample file per area
(`feature-catalog.yaml` exists; add `src/a.test.js`, `docs/superpowers/plans/x.md`,
`.framework/x.js`, `src/app.js` in no area) and one own rule
(`.claude/rules/app.md`, `paths: ["src/app.js"]`, regenerate), add a marker sentence to
each rule's text (in `.framework/rules/` for shipped ones, then `rules`). Start a fresh
Claude Code session: before any tool, it quotes every marker it was given (expected: none
from an area rule); then it reads `src/a.test.js` and quotes again (expected: the `tests`
marker only); then `src/app.js` (expected: the `app` marker only). Record the prompt, the
answers, the version and the machine.

Keep the scratch project for Task 8.

### Task 8: Handover — the Cursor check

**The task is the handover. Do not simulate it.**

Use `/manual-check` to draft the steps into `docs/verification-log.md` as `pending`, for
the scratch project of Task 7: in a new Cursor Agent chat with the folder opened as its own
workspace, the agent quotes markers before any tool, then reads in turn
`feature-catalog.yaml` (single-file glob), `src/a.test.js` (glob beginning with `*`),
`docs/superpowers/plans/x.md` (comma-separated globs) and `src/app.js` (an own rule), and
after each read quotes any marker received and the files it opened. It writes the report to
`cursor-check.md` in the scratch folder, first line `Cursor version: <version>`.

**Check first:** does `cursor-check.md` exist in the scratch folder with that first line,
and does the log entry read `pass` or `fail`? If yes, record that and go to step 3 below.

**If not, print to the developer** where the scratch folder is, the prompt to paste, and
"done looks like: `cursor-check.md` there, starting with the version line, and the log
entry marked pass or fail with what was seen" — **then stop.**

**On resumption,** run the same check and proceed on its result.

3. Copy the report into the log entry. If any of the four did not attach, do not change
   the generator: record it, and say in `framework/rule-delivery.md` exactly which shapes
   attached. The reviewer and the developer decide what follows.

### Task 9: Fresh-agent check

Rules and framework documents changed. In a fresh clone of this branch, start a fresh
Claude Code session with:

> This is a probe and its output will be discarded. An invented project set up with this
> framework wants the tests rule to cover its `spec/` folder too, and wants a new rule of
> its own for `src/billing/`. Using only this repository, say exactly which files to change
> for each, and what to run afterwards.

Pass: the areas file for the first, a new `.claude/rules/billing.md` with a header for the
second, `npm --prefix .framework run rules` after both, and no edit to a shipped rule or a
`.mdc`. Record prompt, gist, pass or fail, tool, version and machine in a commit body. A
fail means a page is unclear: fix it and run again.

Delete the scratch projects afterwards.

### Task 10: Handover

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. The reviewer promotes the entry and writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Areas in `.claude/rule-areas.json`; no shipped file carries a project's paths | `set-up-project.test.js`; Task 6 scratch run (`tests` change touches only the areas file) |
| One command writes shipped Claude files and all Cursor files in the measured form, nothing else, deterministic | `rules-generated.test.js`; Task 6 |
| Own rules untouched, their Cursor files written | `rules-generated.test.js`; Task 7 (`app` rule) |
| Hash; check mode catches a hand edit; project checks run it | `rules-generated.test.js`; `hand-edited-rule` caught; Task 6 |
| Shipped texts in `.framework/rules/` | `set-up-project.test.js`; `project-layout.test.js` |
| Claude Code: nothing before, the area's rule only after a read | Task 7 |
| Cursor: generated rule on a read, single-file glob and `*` glob included | Task 8, `docs/verification-log.md` |
| Pages say where to change areas; nothing says edit a shipped header | Task 6 grep; Task 9 fresh-agent check |
| Existing projects keep their layout until the update command | `RELEASES.md`; `project-takes-a-framework-version`'s value and comment |

## Not in this plan

- **Moving an installed project** (this repository, first-adopter) —
  `project-takes-a-framework-version`.
- **Project additions to a shipped rule** — `shipped-rules-have-project-companions`, next.
- **The entry file's sentences on rule delivery** — `entry-file-says-how-rules-arrive`.
- **Running without Node** — `harness-does-not-need-node`.

## Handover report

### Task completion

Tasks 1–10 done. Task 8 was a handover: the check was not present at first, the developer was asked, ran it in Cursor 3.24.12 on their MacBook Pro and reported `pass`; `cursor-check.md` was read by the executor and copied into the log entry.

### Verification results

- `bash scripts/check-blueprint.sh` on commit 61f1e44: all 13 planted defects "caught", including `projection-drift` and `hand-edited-rule` by `rules-generated`; "ok clean baseline"; "Every guard caught its defect and passed the clean baseline."
- `npm --prefix .framework test` (installed release, this repository): 3 suites, 4 tests passed.
- Scratch project set up from the branch: `npm --prefix .framework test` → 4 suites, 13 tests passed. `rules -- --check` → "rules up to date", exit 0. After a one-word edit to `.claude/rules/catalogs.md` → "rules out of date … .claude/rules/catalogs.md: edited by hand", exit 1. After adding `spec/**` to `tests` in `.claude/rule-areas.json` → ".claude/rules/tests.md: stale — its source has changed" and the same for `.cursor/rules/tests.mdc`; `rules` then "Wrote 10 rule files", `--check` exit 0, tests green. Two runs of `rules` gave the same `shasum` of all generated files (c78ae0d4…).
- Task 7, Claude Code 2.1.300, macOS (Darwin 25.2.0, dev-laptop): prompt in the scratchpad (`prompt7.txt`), full stream `run7.jsonl`. Before any tool: "none". After reading `src/a.test.js`: `MARKER-TESTS-9x4m` only. After `src/app.js`: `MARKER-APP-7k2q` added. No other marker arrived.
- Task 8, Cursor 3.24.12: all four reads attached their rule (`catalogs` single-file glob, `tests` `*`-leading glob, `planning` comma-separated globs, `app` own rule); nothing before a read. Report copied into `docs/verification-log.md` (pass).
- Task 6 grep for `generate-cursor-rules|rules:cursor` outside the allowed paths: prints `RELEASES.md` (intended mention), and `fixtures/base/.claude/framework/workflow.md:5` (see below).
- Task 9 fresh-agent check — see the commit that adds this report.

### Scope

`git diff --stat origin/main...HEAD`: 38 files changed (before this report), 644 insertions, 235 deletions. Every file is in the File Structure table except none; `feature-catalog.yaml` is left to the reviewer.

### Judgment calls

- Pure render, hash and area-check functions live in `scripts/rule-areas.js` (a listed file), not in a new module; `generate-rules.mjs` is the I/O shell.
- A project rule with a shipped rule's name is detected by the generated file carrying no hash line; a generated file with the hash line but no source is "extra", and plain `rules` deletes extras that carry the hash line (hand-written `.mdc` without it are left for `--check` to name).
- `missingProjections(markdown, shipped = [])` takes the shipped rule names for the areas-file case; `scripts/dispatch.mjs` was not changed (per the table), so `/dispatch` does not yet ask for the generated files of every shipped rule when a plan lists only `.claude/rule-areas.json`. `guards/plan-dispatchable.test.js` does.
- `framework/DECISIONS.md` FW-008 text named `generate-cursor-rules.mjs` in two places; changed to "the Cursor generator's glob table" so the Task 6 grep is clean. Historical meaning unchanged.
- Added a guard case in `set-up-project.test.js` for the refusal on an existing `.claude/rule-areas.json`.

### What the plan got wrong

- Task 6's grep was expected to print nothing; it prints `RELEASES.md` (the notes must say the old command is gone) and a fixture stub, `fixtures/base/.claude/framework/workflow.md:5`, which is not in the File Structure table. Left unedited per the plan's instruction to report it; it is overwritten by the real `framework/workflow.md` in the clean baseline.
- The File Structure table's note that `dispatch.mjs` needs no change holds only if the areas-file case is not required at dispatch (see above).

### Outstanding

- Fixture stub line (above) — reviewer decides: one-line fix or leave.
- `dispatch.mjs` passing shipped rule names — reviewer decides; small change.
- `feature-catalog.yaml`: promote `rule-areas-are-project-data` to `shipped` at merge (reviewer).
- Scratch projects deleted at the end of this task; the Cursor check's report remains in the log.

## Review record

Reviewed 2026-10-15 by the specifying session (Claude Code, Claude Opus 5.5, on the
developer's Mac). Executor: Claude Sonnet 5.5, a tier above this plan's Medium–large.

### Checks re-run

- Rebased onto `origin/main` at `a58f6eb`; clean.
- `git diff --stat origin/main...HEAD` before review: 39 files, every one in *File
  Structure*.
- `bash scripts/check-blueprint.sh` after the review fix: `caught projection-drift
  rules-generated`, `caught hand-edited-rule rules-generated`, `ok clean baseline`, "Every
  guard caught its defect and passed the clean baseline."
- `npm --prefix .framework test`: `Tests: 4 passed, 4 total`.
- A scratch project set up from the branch, with this worktree's test tools linked: the
  project's checks `Tests: 13 passed, 13 total`; `generate-rules.mjs --check` "rules up to
  date", exit 0. `.cursor/rules/tests.mdc` opens with `description`, `globs: **/__tests__/**,
  **/*.test.*, **/*.spec.*, test/**, tests/**` unquoted and comma-space separated,
  `alwaysApply: false`, and ends with the hash line. `.claude/rule-areas.json` holds the five
  shipped areas exactly.
- The Cursor check: read the log entry and the agent's report it quotes — all four reads
  attached their rule, nothing before a read, each attachment named as an injected
  `.cursor/rules/*.mdc`. That closes the two shapes never measured before (a single-file
  glob, a glob beginning with `*`) and the text after the body.
- The fresh-agent check is in the body of the handover commit: pass, Claude Code 2.1.300.

### Found

- **Fixed at review, two small, understood defects** (the handover's two *Outstanding*
  items):
  - `scripts/dispatch.mjs` called `missingProjections` without the shipped rule names, so a
    project's `/dispatch` accepted a plan listing `.claude/rule-areas.json` without the
    generated files — only this repository's plan guard caught it. It now reads the names
    from `.framework/rules/`. Checked in a scratch project: a plan listing only the areas
    file is refused with ten lines naming each generated file; with them listed, exit 0.
  - `fixtures/base/.claude/framework/workflow.md` still named
    `scripts/generate-cursor-rules.mjs`; now names `.claude/rule-areas.json`.

  Neither file was in the plan's table; the plan was wrong to say `dispatch.mjs` needed no
  change. The developer's next use of `/dispatch` in a project is the check on the first.

### Outstanding disposition

- Both handover items — fixed above.
- `project-takes-a-framework-version` no longer waits on this entry; it carries the
  migration of installed projects to this layout.

### Learnings routed

- A plan that changes what a function needs must list every caller, not only the one its
  tests reach: `dispatch.mjs` was left out because its output shape was kept. Covered
  already by `rules/planning.md`'s "an import you add is a shape you changed" and its
  checklist step 2 (grep for what produces and consumes a shape); the miss was the
  specifying session's, not a gap in the rule. Not routed further.

### Merged because

Every criterion has its evidence — the guards, the self-check's planted defects, a Claude
Code session, the developer's Cursor check and a fresh-agent check — and the two defects
review found were fixed and checked before merging.
