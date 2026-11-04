# Cursor gets the workflow at session start — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** an agent in Cursor has the development workflow in context from the start of
its session, as one in Claude Code does, because the rule generator writes every file
`AGENTS.md` imports as an always-applied Cursor rule, and the project's checks fail when
one is missing, stale or edited by hand.

**Backlog item:** `framework-reaches-every-tool` in `feature-catalog.yaml` (type bug),
re-shaped on 2026-11-04 from the finding
`docs/superpowers/specs/2026-11-04-framework-doc-delivery-finding.md`, *Recommendations*.

**One plan:** what becomes true is one sentence — whatever Claude Code loads at start
through `AGENTS.md`'s imports, Cursor loads at start too, and a check says when it does not.

**What the specifying session verified on 2026-11-04, against `origin/main` (Claude Code
2.1.318, node v22, Linux x86_64):**

- **Claude Code loads the workflow at start; Cursor gets a sentence.** `AGENTS.md` and
  `templates/AGENTS.md` open with `@.claude/framework/workflow.md` and, on line 3, a
  paragraph beginning `**If the line above did not expand into the development workflow,
  read`. A fresh `claude -p` session had the workflow's text before any tool call (the
  finding, *The measurement made for this finding*). Cursor does not expand `@` imports
  (FW-031; `cursor-agent` 2025.09.18-7ae6800, `framework/rule-delivery.md`), so it gets
  the workflow only if its agent obeys that sentence, which nobody has measured.
- **Cursor applies an always-applied rule.** `framework/rule-delivery.md`, *What each tool
  delivers today*: Cursor 3.24.12 "receives an always-applied rule and the root
  `CLAUDE.md`".
- **The generator.** `scripts/generate-rules.mjs` (119 lines) builds a map `expected` of
  path → text: a `.claude/rules/<name>.md` per shipped rule and a
  `.cursor/rules/<name>.mdc` per rule, each rendered by `scripts/rule-areas.js`
  (`renderClaude`, `renderCursor`, which ends the text with a hash line through
  `stamped`). `--check` compares `expected` with disk, reporting `missing`,
  `stale — its source has changed`, `edited by hand`, or `extra — no source writes it`
  for any `.mdc` in `.cursor/rules/` that `expected` lacks; without `--check` it writes
  `expected` and removes stamped extras. `renderCursor` writes
  `description: <name> rules (generated — do not edit)`, `globs: …`, `alwaysApply: false`.
- **Who runs it.** `scripts/set-up-project.sh:150` at setup; `scripts/take-version.mjs:731`
  after every update; `npm --prefix .tropis run rules` by hand. So a file the generator
  writes reaches every project at its next update, and follows each release's workflow.
- **What checks it.** `guards/rules-generated.test.js` runs `generate-rules.mjs --check`
  (first case) and requires every `.mdc` to have exactly the measured glob front matter
  (second case, lines 35–48). `scripts/check-conformance.sh` composes a project-shaped
  tree from `fixtures/base`, copies the source's `templates/AGENTS.md` and
  `framework/*.md` into it when the self-check runs it, then runs `generate-rules.mjs`
  (its `compose()`), and plants each defect listed in its `CASES` (for example
  `projection-drift:rules-generated`) from `fixtures/defects/<name>/`.
- **Nothing else names the fallback paragraph.** `grep -rn "did not expand"` over
  `guards/`, `scripts/` and `templates/` finds only `templates/AGENTS.md`.

**Decided by the specifying session:**

- **Project, do not rely on the sentence.** A delivery that depends on the agent choosing
  to follow an instruction is what `framework/rule-delivery.md`'s first requirement rules
  out. The context cost in Cursor is what Claude Code already spends on the same file.
  Rejected: keeping only the fallback sentence (unmeasured and obedience-dependent);
  measuring first in Cursor (needs the developer's machine and would not change the
  decision unless Cursor ignored the sentence, which the projection makes moot).
- **Every import, not the workflow by name.** The generator reads `AGENTS.md`'s import
  lines, so a project that imports a second document gets it projected too, and the
  check is the guard criterion 3 of the old entry asked for: what `AGENTS.md` imports
  without a current always-applied Cursor rule fails `--check`.
- **The file name is `imported-<basename>.mdc`**, so it cannot collide with an area
  rule's `<name>.mdc`; a project rule named `imported-<x>` is refused, as a project rule
  with a shipped rule's name already is.
- **The fallback paragraph stays, reworded** to say "If the development workflow is not
  already in your context", so a Cursor agent that has the rule does not read the file
  again, and one without it (an older project before its update) still does.
- **`projectionOf` in `scripts/projections.js` is not changed.** It answers what a plan
  editing a source must also list; `.claude/framework/` changes only at install, where
  `take-version.mjs` regenerates. Say so in the handover.

**Model tier: Medium.** The changes are specified; the generator's handling of import
lines, its check messages and the fixture defect need judgment within that.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 6; do not open a pull request, write a review record
or merge.

**A fresh-agent check is owed**, since the plan changes `framework/rule-delivery.md`,
`framework/DECISIONS.md` and `templates/AGENTS.md`: the specifying session runs it at
review (Task 6 says what the executor records for it).

Do not store a kick-off prompt on this plan.

---

## Delivers

framework-reaches-every-tool

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-cursor-workflow -b plan/cursor-gets-the-workflow origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/` or `.tropis/`. `AGENTS.md` at the root is this repository's own
  entry file: change only its line-3 paragraph, exactly as `templates/AGENTS.md`'s.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

### 1. `scripts/rule-areas.js`

Add and export:

- `importsOf(agentsText)` → the repository-relative paths of the `@` import lines in an
  `AGENTS.md` text: every line that is exactly `@<path>` with `<path>` having no spaces,
  in order, duplicates removed. Lines inside fenced code blocks and HTML comments do not
  count. Pure.
- `importedRuleName(path)` → `imported-<basename without .md>`.
- `renderCursorAlways(name, body)` → the same shape as `renderCursor`, stamped, with
  front matter exactly:

  ```
  ---
  description: <name> (generated from an AGENTS.md import — do not edit)
  alwaysApply: true
  ---
  ```

  then an empty line and the body, trimmed at the end, then a newline, then the hash
  line `stamped` adds.

### 2. `scripts/generate-rules.mjs`

After the existing rules are added to `expected`, read `AGENTS.md` at the root (absent →
nothing to add). For each path `importsOf` returns:

- the file missing → a problem `AGENTS.md imports <path>, which does not exist`;
- `importedRuleName(path)` equal to one of the project's own rules → the problem the
  generator already gives for a project rule named after a shipped one, worded for this
  case;
- otherwise `expected.set('.cursor/rules/<name>.mdc', renderCursorAlways(name, text))`.

Problems stop generation as the existing ones do. `--check` then reports a missing,
stale, hand-edited or extra imported rule exactly as it reports the others. Update the
file's header comment to name the new output.

### 3. `guards/rules-generated.test.js`

- The second case accepts, for a file named `imported-<x>.mdc`, exactly the front matter
  of `renderCursorAlways` instead of the glob form, and rejects it for any other name.
- New unit cases for `importsOf`: one import; two imports and a duplicate; an import
  inside a fenced block and inside an HTML comment, ignored; a line `@foo bar`, ignored.
- New unit case: `renderCursorAlways` output passes `checkStamp` as generated and intact.

### 4. The self-check fixture

Add the defect `missing-imported-rule` to `scripts/check-conformance.sh`'s `CASES` as
`missing-imported-rule:rules-generated`. A defect is an overlay copied over the composed
tree after `compose()` has run the generator (`cp -R "$FIXTURES/defects/$1/." "$WORK/"`),
so it can add or replace files but not remove one. The fixture has two files: `fixtures/defects/missing-imported-rule/.claude/framework/second.md`,
a heading and one sentence, and `fixtures/defects/missing-imported-rule/AGENTS.md`, a copy
of `fixtures/base/AGENTS.md` with a second import line, `@.claude/framework/second.md`,
directly under the first. The composed tree then imports an existing document whose
Cursor rule was never generated, and `--check` must report
`.cursor/rules/imported-second.mdc: missing`. Paste that report in the handover.

### 5. `templates/AGENTS.md` and `AGENTS.md`

Replace the paragraph on lines 3–7 of `templates/AGENTS.md` with:

```
**If the development workflow is not already in your context, read
`.claude/framework/workflow.md` now.** Claude Code expands the import above; Cursor
receives the workflow as an always-applied rule the framework generates. A tool that does
neither reads this file as plain text and would otherwise get every area rule and none of
the process — no preflight, no branching rule, no merge sequence, no documentation
closeout.
```

Make the same replacement in the root `AGENTS.md`, keeping its own wording of what
follows. Change nothing else in either file.

### 6. `framework/rule-delivery.md`

In *What each tool delivers today*, Cursor's bullet: add, after the sentence about the
always-applied rule, one sentence saying that the generator writes each file `AGENTS.md`
imports, the workflow included, as `.cursor/rules/imported-<name>.mdc` with
`alwaysApply: true`, so Cursor has it from the start. Change no measured sentence.

### 7. `framework/DECISIONS.md`

Append `## FW-068: Cursor receives what AGENTS.md imports as an always-applied rule`, in
the shape of the entries above it: Date 2026-11-04, Status Accepted; Decision; Evidence
(the finding, and the rule-delivery measurement of always-applied rules); Rejected (the
three alternatives under *Decided* above); Consequences (a project gets the file at its
next update; the context cost; the fallback paragraph stays for projects not yet updated).
Source: none in particular.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change. In particular this repository's
  own `.cursor/rules/` gets no imported rule until a release is installed: do not add
  one by hand and do not run the source generator against this repository.
- **The composed tree's `AGENTS.md` is the source template** when the self-check runs,
  so the clean baseline must pass with `imported-workflow.mdc` generated there.
- **`framework-integrity` fails on a backticked path under `docs/`, `scripts/` or
  `.claude/` that does not exist** in a framework document. `.cursor/rules/imported-<name>.mdc`
  is not under those prefixes; keep any other path you add real.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/rule-areas.js` | `importsOf`, `importedRuleName`, `renderCursorAlways` |
| `scripts/generate-rules.mjs` | writes and checks the imported rules |
| `guards/rules-generated.test.js` | front-matter case widened; new unit cases |
| `scripts/check-conformance.sh` | one `CASES` line |
| `guards/set-up-project.test.js` | the `.cursor/rules/` expectation: area-rule projections equal the shipped rules, plus `imported-workflow` (added at review, 2026-11-04) |
| `fixtures/defects/missing-imported-rule/AGENTS.md` | new defect fixture |
| `fixtures/defects/missing-imported-rule/.claude/framework/second.md` | new defect fixture |
| `templates/AGENTS.md` | the fallback paragraph |
| `AGENTS.md` | the fallback paragraph |
| `framework/rule-delivery.md` | one sentence |
| `framework/DECISIONS.md` | FW-068 |
| `feature-catalog.yaml` | the item to `shipped` (Task 5) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 5) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-04-cursor-gets-the-workflow.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: `framework/rule-delivery.md` and the
decision record as above. The operator guide `templates/README.md` says nothing about
what Cursor receives; no change. No upstream queue: this repository is the upstream. A
release-note line is the developer's at `/release`: Cursor sessions get the workflow
after the update.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the guard cases of *The change* §3. Commit. Run the guard the way the self-check
runs one (find in `scripts/check-blueprint.sh` where the tree is built and use the jest
under `.self-check/`; say the exact command in the handover). Expected: the new cases
fail. Paste the failing names.

### Task 2 — The functions and the generator

§1 and §2. Commit. Run the guard alone: all pass. Then generate into a scratch copy of
the composed tree (or a temporary project from `scripts/set-up-project.sh` in the
operating system's temporary directory) and paste the first six lines of
`.cursor/rules/imported-workflow.mdc` and the output of `generate-rules.mjs --check`.

### Task 3 — The defect

§4. Commit. `bash scripts/check-blueprint.sh`; paste the line for
`missing-imported-rule` and the last line.

### Task 4 — The documents

§5, §6, §7. Commit. `bash scripts/check-blueprint.sh`; paste the last line.

### Task 5 — The backlog and the board

1. In `feature-catalog.yaml`, on `framework-reaches-every-tool`: `status: shipped`,
   `modules` set to `scripts/generate-rules.mjs` and `scripts/rule-areas.js`, the plan
   path added to `refs`. Above its comment block add
   `# Shipped by docs/superpowers/plans/2026-11-04-cursor-gets-the-workflow.md.` and one
   comment line per acceptance criterion naming the test case, defect or file that
   covers it. No `: ` inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the item's whole block, nothing else.
3. Commit. `npm --prefix .tropis test`; paste the `Tests:` line.

### Task 6 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (the last line), and
   `git diff --stat origin/main...HEAD` (every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say that a run in Cursor
   confirming the rule arrives is not part of this plan, and that the fresh-agent check
   is the reviewer's). Commit.
3. `git push -u origin plan/cursor-gets-the-workflow`. **Do not open a pull request**,
   write a review record, set auto-merge or merge. Leave the worktree in place.
