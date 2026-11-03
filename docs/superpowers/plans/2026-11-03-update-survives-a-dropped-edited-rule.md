# An update keeps a dropped rule the project edited as the project's own — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** when a release stops shipping a rule whose text the project had edited, or
added to with a `.claude/rule-additions/` file, `take-version.mjs` finishes instead of
stopping in the rule generator: it keeps the project's text as the project's own rule,
`.claude/rules/<name>.md`, with the area the rule had, and says so in its report.
`check-version.mjs` reports what the take now does.

**Backlog item:** `update-survives-a-dropped-edited-rule` in `feature-catalog.yaml`
(type bug). Spec: `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
entry 7 (`project-takes-a-framework-version`).

**One plan:** what becomes true is one sentence — an update that drops a rule the project
edited or added to completes, keeping the project's text as its own rule.

**Model tier: Medium.** The change is specified below; fitting it into `apply()` and
writing the world-based tests need judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed:** the change touches no file under `framework/`, `rules/`
or `commands/`; the tests below pin what changes.

**What the specifying session verified on 2026-11-03, against `origin/main` at `f43d4bf`
(node v22, Linux x86_64):**

- **The failure.** In `scripts/take-version.mjs`, `apply()` walks every path in the
  baseline record and the new release. A shipped rule text is `.tropis/rules/<name>.md`.
  When the release no longer ships it and the project changed it (its fingerprint differs
  from the baseline), the file is kept and listed in `keptButGone` (the `else if
  (projectText !== null)` branch near the end of the loop). Then the areas merge drops
  every key the release's `.claude/rule-areas.json` lacks (`areasRemoved`), and
  `.tropis/scripts/generate-rules.mjs` runs. The generator lists the shipped rules as
  every `.md` file directly in `.tropis/rules/` (`const shipped = names(...)`), and
  `areaProblems()` in `scripts/rule-areas.js` reports `no area for the shipped rule
  "<name>"`. So the generator fails, and `apply()` returns status 1 with
  `take-version: generating the rules failed. The tree can be restored with: git restore . && git clean -fd`.
- **The same failure with an additions file.** When the project left the shipped text
  alone but wrote `.claude/rule-additions/<name>.md`, the take deletes the unchanged text
  and the area, and the generator then refuses the additions file
  (`additionsProblem()`: `no shipped rule is named "<name>"`). `check-version.mjs` hides
  this from its own run: `dropStaleAdditions()` deletes such files in its scratch clone
  and commits before taking, and the report says `move or delete .claude/rule-additions/<name>.md`.
  The real take still fails.
- **A project's own rule** is a file in `.claude/rules/` with no generator hash line and
  a `paths:` header: `---\npaths: ["glob", ...]\n---\n` then the body (`parseRule()` in
  `scripts/rule-areas.js`). The generator writes its `.cursor/rules/<name>.mdc` from it
  and leaves the `.md` alone. The generated `.claude/rules/<name>.md` of a shipped rule
  carries the hash line; once `<name>` is no longer shipped, a file with the hash line is
  removed as extra, and one without it is treated as the project's own rule.
- **`joinAdditions(text, additions)`** in `scripts/rule-areas.js` joins a rule's text
  and its additions exactly as the generator delivers them.
- **Nothing under `.claude/rules/` is a shipped file** (`SHIPPED_ROOTS` in
  `scripts/installed-files.js` is `.tropis`, `.claude/framework`, `.claude/commands`), so
  the installed-files check does not see the new own rule.

**Decided by the specifying session:**

- **The project's text becomes its own rule, rather than being left for the operator.**
  The agent goes on receiving what the project had chosen to tell it, in the same area,
  and the update completes. The report tells the operator to delete the rule if they no
  longer want it. Rejected: leaving the text where the generator does not read it (such as
  renaming it) and asking the operator to decide — the agent would silently lose the rule
  until someone acted.
- **The additions-only case is the same defect and is fixed with it.** Its own rule's
  body is the shipped text joined with the additions. `check-version.mjs` stops deleting
  additions files in its clone, so its run takes exactly as the real take does.
- **A rule the project neither edited nor added to** is deleted with its area, as today.
- **A dropped rule the project had no area for** is left as it is today (kept, listed);
  the generator was already failing for that project before the update.
- No decision record: this plan records the choice, and it is internal to the take.

---

## Delivers

update-survives-a-dropped-edited-rule

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-dropped-rule -b plan/update-survives-a-dropped-edited-rule origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test** other than the
  assertions this plan says to change.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

### 1. `scripts/take-version.mjs`, `apply()`

After the rule areas are merged (`areas`, `areasRemoved` computed) and before the
generator runs, for each `name` in `areasRemoved`:

- At the start of `apply()`, before the loop deletes anything, read the project's text
  of every `.tropis/rules/<name>.md` (a file directly in that folder, not under
  `incidents/`) that is in the baseline and not in the release. Let `text` be that
  captured text for `name`, and `additions` the project's
  `.claude/rule-additions/<name>.md` if it exists.
- If `text` is null (the project had deleted the rule's text itself), do nothing more.
- If neither the project changed the text (it is not in `keptButGone`) nor an additions
  file exists, do nothing more: the rule is gone, as today.
- Otherwise, when `projectAreas[name]` is a non-empty array, write
  `.claude/rules/<name>.md` as
  `` `---\npaths: ${JSON.stringify(projectAreas[name])}\n---\n${joinAdditions(text, additions).trimEnd()}\n` ``,
  remove `.tropis/rules/<name>.md` if present and `.claude/rule-additions/<name>.md` if
  present, take `.tropis/rules/<name>.md` out of `keptButGone`, and add `name` to a new
  list `ownRules` in the result. Import `joinAdditions` from
  `./rule-areas.js` (the source file beside it; check how `take-version.mjs` already
  imports from `./installed-files.js` and do the same).

Report: in the *Needs a decision* list, one line per `ownRules` entry:
`` `.claude/rules/${name}.md — rule ${name} is no longer shipped; your text is kept as your own rule, with the area it had. Delete it if you no longer want it.` ``

Update the file's header comment to say this in one sentence.

### 2. `scripts/check-version.mjs`

- Remove `dropStaleAdditions()` and its call, and the `dropped` list it fed; the take now
  handles those files.
- In `settingsThatDoNotFit()`, replace the `dropped` lines with one line per
  `result.ownRules` entry:
  `` `the release no longer ships rule ${name}; the take keeps your text as your own rule in .claude/rules/${name}.md` ``.
  Keep the `areasRemoved` line as it is. Adjust the function's parameters accordingly.

### 3. `templates/README.md` (the operator guide)

In the paragraph that begins `To take a newer release`, after the sentence about
`.claude/settings.json`, add:
`When a release stops shipping a rule you had edited or added to, your text is kept as your own rule in .claude/rules/, with the area it had; delete it if you no longer want it.`

## Tests

In `guards/take-version.test.js` (read `world()`, `release()`, and the case
`adds new rule areas and ignore lines, keeping the project values` for how a release adds
a rule and its area through `rules/<name>.md` and `templates/rule-areas.json`):

1. † `it('keeps a dropped rule the project edited as its own rule', …)`: a world whose
   v0.2.0 ships an extra rule `rules/extra.md` with area `["extra/**"]` (pass both through
   `v020`, as `guards/check-version.test.js` does in
   `names an additions file and an area for a rule the release drops`). The project
   appends a line to `.tropis/rules/extra.md`, runs its generator
   (`node .tropis/scripts/generate-rules.mjs` with `cwd` the project), commits. Release
   v0.2.1 deletes `rules/extra.md` and the `extra` area. Take it. Expect status 0; stderr
   empty; `.tropis/rules/extra.md` absent; `.claude/rules/extra.md` starting
   `---\npaths: ["extra/**"]\n---\n` and containing the project's line;
   `.cursor/rules/extra.mdc` present; `extra` absent from `.claude/rule-areas.json`;
   stdout containing `.claude/rules/extra.md — rule extra is no longer shipped`; and the
   project's generator, run again with `--check`, exiting 0.
2. † `it('keeps a dropped rule the project added to as its own rule', …)`: the same, but
   the project leaves the text alone and writes `.claude/rule-additions/extra.md`
   (`Remember the extra thing.\n`). Expect status 0; `.claude/rules/extra.md` containing
   the shipped text and `Remember the extra thing.`; `.claude/rule-additions/extra.md`
   absent; the same report line.
3. `it('deletes a dropped rule the project left alone, with its area', …)`: the same
   world, the project changes nothing about the rule. Expect status 0,
   `.tropis/rules/extra.md`, `.claude/rules/extra.md` and `.cursor/rules/extra.mdc` all
   absent, and no `rule extra is no longer shipped` line.

In `guards/check-version.test.js`, change
`names an additions file and an area for a rule the release drops` so it expects
`the take keeps your text as your own rule in .claude/rules/extra.md` in place of
`move or delete .claude/rule-additions/extra.md`, and still expects
`is safe with these steps.`, the areas line and no failed tests. Rename it
`says a rule the release drops is kept as the project's own`.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run the guard file you changed that way; say the exact command in the
  handover. These two guards are slow (each case sets up a world; the file sets a
  120-second limit per case).
- **The world's generator is the project's copy**, `.tropis/scripts/generate-rules.mjs`
  in the scratch project, set up from the scratch Tropis. It is the source
  `scripts/generate-rules.mjs` of this checkout, so it behaves as described above.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | a dropped rule the project edited or added to becomes its own rule; report line |
| `scripts/check-version.mjs` | no longer drops additions in its clone; reports the own rule |
| `templates/README.md` | one sentence in the paragraph on taking a release |
| `guards/take-version.test.js` | three cases |
| `guards/check-version.test.js` | one case changed and renamed |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's row removed, if it has one (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-update-survives-a-dropped-edited-rule.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide gains one sentence
(above). `commands/update.md`, Stage 6 step 5 (*Each file kept because the project
changed it. Leave it.*), already fits the new report line, so the command is not changed.
No decision record (above). No upstream queue: this repository is the upstream. A
release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Add the three take-version cases and change the check-version case. Commit. Run
`guards/take-version.test.js` alone (*Traps*). Expected: cases 1 and 2 fail (status 1,
`generating the rules failed`), case 3 passes. Paste the failing names.

### Task 2 — The change

Make the changes in *The change*. Commit. Run both guard files alone: every case passes.
Paste the `Tests:` lines.

### Task 3 — The backlog and the board

1. In `feature-catalog.yaml`, on `update-survives-a-dropped-edited-rule`: set
   `status: shipped` (if it does not read `building`, set `shipped` anyway and say so);
   leave `acceptanceCriteria` as the claim set them;
   and set `modules` to `scripts/take-version.mjs` and `scripts/check-version.mjs`.
   Above the item, add `# Shipped by docs/superpowers/plans/2026-11-03-update-survives-a-dropped-edited-rule.md.`
   and one comment line per criterion naming the case that covers it.
2. In `docs/backlog-board/bands.yaml`, delete the item's block if it has one, nothing
   else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 4 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/update-survives-a-dropped-edited-rule`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.
