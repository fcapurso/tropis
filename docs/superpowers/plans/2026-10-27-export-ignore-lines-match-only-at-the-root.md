# An update never re-adds the export-ignore lines, and new ones match only at the root — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** setup writes each export-ignore line with a leading slash, so it matches only at
the project's root. Setup and an update treat a line with a leading slash and the same line
without one as the same line, in `.gitignore` and `.gitattributes`, so neither adds a line
the project already has in the other form. Neither adds an export-ignore line for a path
the project has unset with `-export-ignore` (or made unspecified with `!export-ignore`).
This repository unsets `docs/readme/` that way, and the operator guide says how.

**Spec:** the entry `export-ignore-lines-match-only-at-the-root` in `feature-catalog.yaml`,
its six criteria and the comments above it. It replaces
`setup-export-lines-match-only-the-root` and `update-keeps-ignore-lines-in-their-own-form`,
which already carry `supersededBy` on `main`; leave them as they are. *Decisions* below
settles what the entry leaves open. Do not reopen them.

**Read first:** the comment above the entry (the evidence from the v0.4.2 take, and the
`docs/readme/` gap), and the review record of
`docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md`, which also
changed `scripts/take-version.mjs`. What it teaches for this plan:

- `guards/take-version.test.js` needs `TROPIS_V010` (a folder holding `git archive v0.1.0`),
  which `bash scripts/check-blueprint.sh` sets. To run that file alone, export the tag
  yourself (Task 0 shows how).
- The take promises that every refusal comes before any write. This plan adds no refusal.

**What the specifying session verified on 2026-10-27, against `main` at `c9c0499`, with
git 2.43.0 and Node v22.22.0 in a Claude Code cloud session (Linux 6.18, x86_64):**

- `scripts/set-up-project.sh` defines `append_once()` (after the comment
  `# Appended once, never replacing the project's own lines.`). It skips a line only when
  `grep -qxF` finds the identical line. It is called three times for `.gitignore`
  (`.tropis/node_modules/`, `.claude/settings.local.json`, `docs/backlog-board/index.html`),
  once for the `.gitattributes` comment line, and then in a `for p in … ; do append_once
  .gitattributes "$p export-ignore"; done` loop over twelve paths: `.claude/ .cursor/
  .tropis/ CLAUDE.md AGENTS.md feature-catalog.yaml docs/superpowers/ docs/backlog-board/
  docs/verification-log.md docs/project-brief.md docs/readme/ docs/BLUEPRINT-UPSTREAM.md`.
- `scripts/take-version.mjs` builds the new release in a scratch repository by running that
  release's `set-up-project.sh` (`buildVersion()`), then, in `apply()`, for each of
  `.gitignore` and `.gitattributes`, calls `appendMissingLines(before, nextText)` and writes
  the result. `appendMissingLines(projectText, nextText)` appends every non-empty line of
  `nextText` that is not identical to a line of `projectText`. It has no other caller.
- `scripts/pipeline.mjs`'s `FRAMEWORK_PATHS` comment names "the `for p in` loop in
  set-up-project.sh that writes export-ignore". Keep the loop and its list as they are.
- `guards/set-up-project.test.js`, `keeps the project's own ignore and attribute lines`,
  expects exactly one `.claude/ export-ignore` and one `docs/readme/ export-ignore`. Those
  two expectations change in Task 1.
- `guards/take-version.test.js`, `adds new rule areas and ignore lines, keeping the project
  values`, edits `scripts/set-up-project.sh` in its scratch Tropis by replacing the line
  `append_once .gitignore '.claude/settings.local.json'`. Keep that line, word for word.
  `moves an untouched v0.1.0 project to .tropis/` expects `.gitattributes` to contain
  `.tropis/ export-ignore` as a substring, which an anchored line also satisfies.
- This repository's `.gitattributes` holds the comment line, a two-line comment on why the
  lines are anchored, and eleven anchored lines (every path of the loop except
  `docs/readme/`). Its `.gitignore` holds `.self-check/` and the three lines setup writes,
  unanchored. So today the next take would add `/docs/readme/ export-ignore` (once setup
  writes it anchored), and the self-check's `readme-usable` guard reads `docs/readme/` from
  the export.
- On a scratch repository with git 2.43.0: `.gitattributes` holding `/CLAUDE.md
  export-ignore`, `/.claude/ export-ignore`, `/docs/readme/ export-ignore` and, after it,
  `/docs/readme/ -export-ignore`; files `CLAUDE.md`, `sub/CLAUDE.md`, `.claude/a`,
  `sub/.claude/a`, `docs/readme/x`. `git archive HEAD | tar -t` listed `sub/CLAUDE.md`,
  `sub/.claude/a` and `docs/readme/x`, and neither root `CLAUDE.md` nor root `.claude/a`.
  So an anchored line matches only at the root, and a later `-export-ignore` line wins.
- The bash and JavaScript in *Decision 2* were run on scratch files before this plan was
  written: with a project `.gitattributes` holding `CLAUDE.md export-ignore`,
  `/docs/readme/ -export-ignore` and `AGENTS.md   !export-ignore`, both appended only the
  comment line and `/.claude/ export-ignore` (of a five-path loop), and a second run of the
  bash appended nothing. A `.gitignore` holding `/.tropis/node_modules/` gained no
  `.tropis/node_modules/`.
- `templates/README.md` is the operator guide (installed as `.tropis/README.md`). Its
  section `## Where the framework lives` has the paragraph beginning "To take a newer
  release, check out its tag". Nothing in `templates/README.md`, `framework/` or `rules/`
  mentions export-ignore today.
- `framework-integrity` requires every backticked path under `docs/`, `scripts/` or
  `.claude/` in a framework document to exist. The text this plan adds to
  `templates/README.md` names none in backticks.

**Model tier: Medium.** The code and every sentence are given; the tests need building in
two existing test worlds.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** The change reaches every project's next update and
this repository's own export, and criterion 5 is about this repository's self-check.

Do not store a kick-off prompt on this plan.

---

## Delivers

export-ignore-lines-match-only-at-the-root

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-export-lines -b plan/export-ignore-lines-match-only-at-the-root` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or
  `.github/`.** The sources are under `scripts/`, `guards/` and `templates/`.
- **Add no dependency.** Use `node:` modules.
- **Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Do not merge.

## Decisions

Taken by the specifying session on 2026-10-27, with the developer. The first three are
recorded in the comment above the entry.

### 1. What counts as the same line, and what counts as kept

- A line and the same line with a leading `/` are the same line, in `.gitignore` and
  `.gitattributes`, in setup and in the update.
- New export-ignore lines are written with a leading `/`. A project's existing lines
  without one are left exactly as they are; nothing rewrites them.
- An export-ignore line for a path is not written when the project already has any line
  for that path, with or without the slash, whose attributes include `export-ignore`,
  `-export-ignore` or `!export-ignore`. `-` unsets the attribute and `!` makes it
  unspecified; either is the project saying the path stays in exports, and since a later
  line wins, appending would undo it.
- The `.gitignore` lines setup writes keep their form. Each has a slash before its end, so
  git already matches it only at the root; only the duplicate check changes for them.

**Rejected:** rewriting a project's unanchored lines to anchored (the developer decided
they stay); a project-owned list of kept paths (the `-export-ignore` line already says it,
in the file git reads).

### 2. The code

**`scripts/set-up-project.sh`:** replace `append_once()` and the export-ignore loop with
the following. The comment line, the three `.gitignore` calls and the loop's path list stay
exactly as they are.

```bash
# Appended once, never replacing the project's own lines. A line with a leading slash
# and the same line without one count as the same line.
append_once() {
  local file="$PROJECT/$1" line="$2"
  if [ -f "$file" ] && { grep -qxF -- "/${line#/}" "$file" || grep -qxF -- "${line#/}" "$file"; }; then
    return 0
  fi
  if [ -s "$file" ] && [ -n "$(tail -c1 "$file")" ]; then printf '\n' >> "$file"; fi
  printf '%s\n' "$line" >> "$file"
}
# An export-ignore line for $1, anchored to the root. Skipped when the project already has
# a line for that path, with or without the slash, that sets, unsets (-export-ignore) or
# unspecifies (!export-ignore) the attribute: a later line wins, so appending would undo
# a path the project keeps in its exports.
export_ignore_once() {
  local path="${1#/}"
  if [ -f "$PROJECT/.gitattributes" ] && awk -v p="$path" '
      { f = $1; sub(/^\//, "", f) }
      f == p { for (i = 2; i <= NF; i++) if ($i ~ /^[-!]?export-ignore$/) found = 1 }
      END { exit !found }' "$PROJECT/.gitattributes"; then
    return 0
  fi
  append_once .gitattributes "/$path export-ignore"
}
```

and the loop body becomes `export_ignore_once "$p"`.

**`scripts/take-version.mjs`:** replace `appendMissingLines` with:

```js
/** A pattern line's path without its leading slash, and its attributes. */
function patternOf(line) {
  const [pattern = '', ...attributes] = line.trim().split(/\s+/);
  return { path: pattern.replace(/^\//, ''), attributes };
}

/**
 * The project's text with the lines of `nextText` it lacks appended. A line with a leading
 * slash and the same line without one count as the same line. With `attributes`, an
 * export-ignore line is also skipped when the project has any line for that path that
 * sets, unsets (-export-ignore) or unspecifies (!export-ignore) the attribute: a later
 * line wins, so appending would undo a path the project keeps in its exports.
 */
export function appendMissingLines(projectText, nextText, { attributes = false } = {}) {
  const lines = (projectText ?? '').split('\n');
  const unanchored = (line) => line.replace(/^\//, '');
  const have = new Set(lines.map(unanchored));
  const decided = new Set(attributes
    ? lines.map(patternOf)
      .filter(({ attributes: a }) => a.some((attr) => /^[-!]?export-ignore$/.test(attr)))
      .map(({ path }) => path)
    : []);
  const missing = [];
  for (const line of nextText.split('\n')) {
    if (line === '' || have.has(unanchored(line)) || missing.includes(line)) continue;
    if (attributes) {
      const { path, attributes: a } = patternOf(line);
      if (a.includes('export-ignore') && decided.has(path)) continue;
    }
    missing.push(line);
  }
  if (missing.length === 0) return projectText;
  const base = projectText ?? '';
  const lead = base !== '' && !base.endsWith('\n') ? '\n' : '';
  return `${base}${lead}${missing.join('\n')}\n`;
}
```

and in `apply()` the call becomes
`appendMissingLines(before, nextText, { attributes: file === '.gitattributes' })`.
It is exported so the guard in Task 3 can call it; the file header already says library
callers use `takeVersion()`, so add "and `appendMissingLines()`, for the ignore files" to
that sentence.

### 3. This repository and the operator guide

**`.gitattributes`** (this repository's own): append at the end

```
# docs/readme/ stays in exported copies: the self-check reads the README settings there.
/docs/readme/ -export-ignore
```

**`templates/README.md`**, *Where the framework lives*, the paragraph beginning "To take a
newer release": insert after the sentence ending "kept." (the one about
`.claude/settings.json`):

> Lines in `.gitignore` and `.gitattributes` are added only when missing, whether you
> wrote yours with a leading slash or without one. To keep one of the framework's paths in
> exported copies, such as `docs/readme/`, add a line such as
> `/docs/readme/ -export-ignore` to `.gitattributes`, and no update excludes it again.

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **`append_once` must keep its name and its three `.gitignore` call lines word for word.**
  A test in `guards/take-version.test.js` finds one of them by its exact text.
- **The comment line in `.gitattributes` goes through `append_once`, not
  `export_ignore_once`.** It is not a pattern.
- **Plan `update-keeps-the-package-name` also edits `scripts/take-version.mjs` and
  `guards/take-version.test.js`**, in other functions. Whichever lands second rebases onto
  `origin/main` and re-runs its criteria; the edits do not overlap.
- **`guards/set-up-project.test.js` fails `records every shipped file at version unknown`
  when run from a tagged checkout.** That predates this plan; the self-check's export has
  no `.git`.

## File Structure

| File | Change |
|---|---|
| `scripts/set-up-project.sh` | Decision 2 |
| `scripts/take-version.mjs` | Decision 2 |
| `guards/set-up-project.test.js` | Task 1 |
| `guards/take-version.test.js` | Tasks 2–3 |
| `.gitattributes` | Decision 3 |
| `templates/README.md` | Decision 3 |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming the handover |
| `docs/superpowers/plans/2026-10-27-export-ignore-lines-match-only-at-the-root.md` | the handover report |

Another guard may fail because of the new lines, such as `check-drift` or
`installed-files`. If one does, fix it, list the file in the handover's *Scope* with the
reason, and say so under *What the plan got wrong*.

## Review Focus

Each line is pinned by a test in Tasks 1–3. Review breaks each and expects red.

1. Setup writes `/CLAUDE.md export-ignore` (and every other loop path anchored), and a
   `git archive` of a set-up project with `sub/CLAUDE.md` and `sub/.claude/x` carries both.
2. Setup run on a project whose `.gitattributes` has `CLAUDE.md export-ignore` and whose
   `.gitignore` has `/.tropis/node_modules/` adds neither form again.
3. Setup run on a project with `docs/readme/ -export-ignore` adds no export-ignore line for
   `docs/readme/`; likewise for `!export-ignore`.
4. An update into a project whose lines are all unanchored adds no export-ignore line and
   leaves the file byte for byte; an update into one with `/docs/readme/ -export-ignore`
   adds none for `docs/readme/`.
5. The lines a fresh setup writes, appended to this repository's `.gitattributes` and
   `.gitignore` by `appendMissingLines`, change neither file.
6. The operator guide carries the `-export-ignore` sentence.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`git fetch --tags origin` and `bash scripts/check-blueprint.sh` (expected: its last line
starts `Self-check passed`).

To run one guard file alone: the source tree has no root `package.json`, so put a
temporary `{"type":"module"}` `package.json` and a `node_modules` link to
`.tropis/node_modules` at the worktree root, export `TROPIS_V010` as a folder holding
`git archive v0.1.0 | tar -x`, and run
`node --experimental-vm-modules .tropis/node_modules/.bin/jest guards/<file>`. Remove the
two temporary files before every commit.

### Task 1 — Setup (criteria 1–3)

In `guards/set-up-project.test.js`, add these tests first and watch them fail against the
current script:

- `writes each export-ignore line anchored, so a file of the same name deeper in the
  project is exported`: set up a fresh repository; expect every loop path to appear as
  `/<path> export-ignore` exactly once and no unanchored export-ignore line. Then write
  `sub/CLAUDE.md` and `sub/.claude/x`, `git add -A` and commit (with
  `-c user.name=t -c user.email=t@t`), and expect `git archive HEAD | tar -t` to list both
  and to list neither root `CLAUDE.md` nor anything under root `.claude/`.
- `does not add a line the project has in the other form`: a repository with
  `.gitattributes` `CLAUDE.md export-ignore\n/.cursor/ export-ignore\n` and `.gitignore`
  `/.tropis/node_modules/\n`. After setup, expect exactly one line each whose text without
  a leading `/` is `CLAUDE.md export-ignore`, `.cursor/ export-ignore` and
  `.tropis/node_modules/`, and the project's own lines unchanged and first.
- `adds no export-ignore line for a path the project keeps`: a repository with
  `.gitattributes` `docs/readme/ -export-ignore\n/AGENTS.md !export-ignore\n`. After setup,
  expect no line other than those two whose path (without its slash) is `docs/readme/` or
  `AGENTS.md`, and the others written anchored.
- Run setup twice on one repository and expect `.gitignore` and `.gitattributes` unchanged
  by the second run.

In `keeps the project's own ignore and attribute lines`, change the two expectations to
`/.claude/ export-ignore` and `/docs/readme/ export-ignore`.

Apply Decision 2's bash. Run the file until it passes. Commit.

### Task 2 — The update (criteria 2–4)

In `guards/take-version.test.js`, add, using `inWorld` and `w.release`:

- `adds no ignore or export-ignore line the project has in the other form`: in the
  project, rewrite `.gitattributes` so every `/<path> export-ignore` line reads
  `<path> export-ignore`, and `.gitignore` so `.tropis/node_modules/` reads
  `/.tropis/node_modules/`; commit. Release `v0.2.1` with `bumpNext`; take it. Expect exit
  0 and both files byte for byte as committed.
- `adds no export-ignore line for a path the project keeps`: remove the project's
  `/docs/readme/ export-ignore` line, append `docs/readme/ -export-ignore`, commit; release
  and take. Expect no line `/docs/readme/ export-ignore` or `docs/readme/ export-ignore`,
  and the `-export-ignore` line still last.
- `adds a new export-ignore line anchored`: release `v0.2.1` whose
  `scripts/set-up-project.sh` loop also lists `docs/extra/` (replace `docs/BLUEPRINT-UPSTREAM.md;`
  with `docs/BLUEPRINT-UPSTREAM.md docs/extra/;` in the loop, asserting the replacement
  changed the text). Expect exactly one `/docs/extra/ export-ignore` appended and nothing
  else changed in `.gitattributes`.

Watch the first two fail against the current `appendMissingLines` (the third may pass only
after Task 1, since the scratch Tropis copies the source tree). Apply Decision 2's
JavaScript. Run until the file passes. Commit.

### Task 3 — This repository and the guide (criteria 5–6)

Apply Decision 3. In `guards/take-version.test.js`, add
`this repository's own ignore files gain nothing from the lines setup writes`: set up a
fresh scratch repository with this tree's `scripts/set-up-project.sh` (as
`guards/set-up-project.test.js` does), read its `.gitignore` and `.gitattributes`, and
expect `appendMissingLines(<this tree's file>, <scratch file>, { attributes })` to return
this tree's text unchanged for each, with `attributes` true for `.gitattributes`. Read this
tree's files from the folder above `guards/` (`blueprint` in that test file), which is the
self-check's export when the self-check runs it. Watch it fail with the `.gitattributes`
addition reverted in a throwaway commit, then drop that commit.

Add a test to `guards/take-version.test.js` or `guards/set-up-project.test.js` that reads
`templates/README.md`, whitespace collapsed, for `add a line such as
\`/docs/readme/ -export-ignore\` to \`.gitattributes\`, and no update excludes it again`.
Run, commit.

### Task 4 — Verification

Commit, then run `bash scripts/check-blueprint.sh` (expected last line:
`Self-check passed: …`) and `npm --prefix .tropis test`. Record both outputs.

Then make each Review Focus line fail in a throwaway commit and run the self-check, to show
its guard goes red; drop the commit after each. At least: write the loop's lines without
the slash (lines 1 and 5), restore the old `grep -qxF -- "$line"` check in `append_once`
(line 2), drop the `awk` check (line 3), restore the old `appendMissingLines` (line 4),
delete the guide sentence (line 6). Record the failing test names.

No fresh-agent check: the plan changes no file under `framework/` or `rules/`, and no
command. Say so in the handover.

### Task 5 — Catalog

In `feature-catalog.yaml`, set `export-ignore-lines-match-only-at-the-root` to `shipped`,
set `modules` to `scripts/set-up-project.sh` and `scripts/take-version.mjs`, and add to the
comment above the entry a line naming this plan's handover. Map each criterion to its
backing:

| Criterion | Backed by |
|---|---|
| 1 anchored lines; a subfolder's `CLAUDE.md` and `.claude/` are archived | Task 1 first test |
| 2 no line added again in the other form, by setup or update | Task 1 second and fourth tests; Task 2 first test |
| 3 no export-ignore line for a path the project unset | Task 1 third test; Task 2 second test |
| 4 existing unanchored lines left as they are | Task 2 first test |
| 5 this repository's files gain nothing | Task 3 first test |
| 6 the operator guide says how | Task 3 second test |

If a criterion has no backing, leave the entry at `shaped` and say so. Commit.

### Task 6 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names.
Commit it, push the branch, and open a pull request against `main`. Do not merge.

## Not in this plan

- No `/manual-check`: nothing here has a screen or a deployed instance.
- No `framework/DECISIONS.md` entry: the choices are recorded in the comment above the
  catalog entry, and they change no framework mechanism beyond these two scripts.
- `bootstrap.md` says the ignore lines are "appended once, never replacing yours", which
  stays true.
- `RELEASES.md`: `/release` drafts the notes from the backlog.

## Handover report

### Task completion

Tasks 0 through 6 are done. None was skipped. No fresh-agent check: the plan changes no
file under `framework/` or `rules/`, and no command.

### Verification results

Platform: Claude Code cloud session, `Linux x86_64`, git 2.43.0,
Node v22.22.0.

Task 0, `bash scripts/check-blueprint.sh` on the base `b3cfb32`, last line:
`Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`

Task 1, `guards/set-up-project.test.js` against the old script: 5 failed, 13 passed. The
failures were the three new tests on anchoring, the other form and kept paths, the
changed `keeps the project's own ignore and attribute lines`, and the known
`records every shipped file at version unknown` (see *What the plan got wrong*). The
fourth new test, `adds nothing to the ignore files when run again on its own lines`,
passed before and after. After the bash: 1 failed (that known test), 17 passed.

Task 2, `guards/take-version.test.js -t "export-ignore|other form"` against the old
`appendMissingLines`: `adds no ignore or export-ignore line the project has in the other
form` and `adds no export-ignore line for a path the project keeps` failed, the second with
`/docs/readme/ export-ignore` appended after `docs/readme/ -export-ignore`;
`adds a new export-ignore line anchored` passed (Task 1 was already in). After the
JavaScript, the whole file: 41 passed.

Task 3, `this repository's own ignore files gain nothing from the lines setup writes` with
the two new `.gitattributes` lines taken out: failed, received
`+ /docs/readme/ export-ignore`. With them: passed. Whole file afterwards: 43 passed.

Task 4, on `8db498c`: `bash scripts/check-blueprint.sh` exit 0, last line
`Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
(clean baseline `ok`). `npm --prefix .tropis test`: `Test Suites: 5 passed, 5 total`,
`Tests: 31 passed, 31 total`. After the catalog commit `7658777`, `npm --prefix .tropis
test` again 31 passed, and `bash scripts/check-blueprint.sh` exit 0 with the same last line.

Review Focus mutations, each a throwaway commit on top of `8db498c`, the self-check run,
then `git reset --hard HEAD~1`. Every run ended `Self-check FAILED: conformance or the
clean baseline (above).`, with these clean-baseline failures:

- Loop lines written without the slash (`append_once .gitattributes "$path export-ignore"`),
  line 1: `set-up-project.sh › writes each export-ignore line anchored, so a file of the
  same name deeper in the project is exported`, `› keeps the project's own ignore and
  attribute lines`, `› adds no export-ignore line for a path the project keeps`;
  `take-version.mjs › adds a new export-ignore line anchored`, `› adds no export-ignore line
  for a path the project keeps`, `› adds no ignore or export-ignore line the project has in
  the other form`.
- The `-export-ignore` lines removed from `.gitattributes`, line 5: `take-version.mjs ›
  this repository's own ignore files gain nothing from the lines setup writes`.
- The old `grep -qxF -- "$line"` in `append_once`, line 2: `set-up-project.sh › does not
  add a line the project has in the other form`.
- The `awk` check dropped, line 3: `set-up-project.sh › adds no export-ignore line for a
  path the project keeps`.
- The old `appendMissingLines`, line 4: `take-version.mjs › adds no export-ignore line for
  a path the project keeps`, `› adds no ignore or export-ignore line the project has in the
  other form`, `› this repository's own ignore files gain nothing from the lines setup
  writes`.
- The guide sentence deleted, line 6: `take-version.mjs › the operator guide says how to
  keep a framework path in exported copies`.

Criteria and their backing:

| Criterion | Backed by |
|---|---|
| 1 | `set-up-project.sh › writes each export-ignore line anchored, so a file of the same name deeper in the project is exported` |
| 2 | `set-up-project.sh › does not add a line the project has in the other form`, `› adds nothing to the ignore files when run again on its own lines`; `take-version.mjs › adds no ignore or export-ignore line the project has in the other form` |
| 3 | `set-up-project.sh › adds no export-ignore line for a path the project keeps`; `take-version.mjs › adds no export-ignore line for a path the project keeps` |
| 4 | `take-version.mjs › adds no ignore or export-ignore line the project has in the other form` |
| 5 | `take-version.mjs › this repository's own ignore files gain nothing from the lines setup writes` |
| 6 | `take-version.mjs › the operator guide says how to keep a framework path in exported copies` |

### Scope

Worktree `/home/user/tropis-export-lines`, made by `isolate-for-plan.sh`, local branch
`plan/export-ignore-lines-match-only-at-the-root`, base `b3cfb32` (origin/main at the time;
one README commit above the plan's `177d869`).

`git diff --stat origin/main...HEAD` before this commit:

```
 .gitattributes                |  2 +
 feature-catalog.yaml          |  7 +++-
 guards/set-up-project.test.js | 95 ++++++++++++++++++++++++++++++++++++++++++-
 guards/take-version.test.js   | 83 +++++++++++++++++++++++++++++++++++++
 scripts/set-up-project.sh     | 23 +++++++++--
 scripts/take-version.mjs      | 39 ++++++++++++++----
 templates/README.md           |  6 ++-
 7 files changed, 240 insertions(+), 15 deletions(-)
```

Every file is in the File Structure table; this commit adds the plan file. No other guard
needed a change.

The branch is pushed to the remote as `claude/eloquent-lovelace-crze0o`, not as
`plan/export-ignore-lines-match-only-at-the-root`: the cloud session that executed it may
push only to that branch name. The pull request is opened from it.

### Judgment calls

- **Setup run twice.** The setup refuses a folder it already set up, so the fourth Task 1
  test runs it on a fresh repository holding the first run's `.gitignore` and
  `.gitattributes`, and expects both byte for byte.
- **The loop's paths in the tests** are read from `scripts/set-up-project.sh` (the
  `for p in … ; do` line) rather than listed again, with a check that the list holds
  `.claude/`, `CLAUDE.md` and `docs/BLUEPRINT-UPSTREAM.md`, so a parse that finds nothing
  fails.
- **The file header of `take-version.mjs`**: adding the plan's words to the existing
  sentence made "It throws" ambiguous, so the sentence now names `takeVersion()` as the
  one that throws.
- **Both Task 3 tests went in `guards/take-version.test.js`**, which imports
  `appendMissingLines` from `../scripts/take-version.mjs`.
- **Task 3's failing run** was done with the `.gitattributes` lines stashed in the working
  tree, not in a throwaway commit: the guard reads the working tree when run alone. The
  Task 4 mutation of the same lines was a commit, through the self-check.
- **The catalog entry** gained only the `# Handover report:` comment line, `shipped` and
  `modules`; `refs` stayed empty, as the plan said nothing of it.

### What the plan got wrong

- **Review Focus line 5 cannot fail from writing the loop's lines without the slash**, as
  Task 4 suggests. Under Decision 1 an unanchored line and an anchored one are the same
  line, so this repository's anchored `.gitattributes` gains nothing either way. Line 5
  goes red when the `-export-ignore` lines are removed from `.gitattributes`, or with the
  old `appendMissingLines`; both were run.
- **`records every shipped file at version unknown` fails in an ordinary worktree too**,
  not only in a tagged checkout: `git describe` finds a tag from any branch here. It fails
  the same way on the base commit and passes in the self-check's export.

### Outstanding

- Plan `update-keeps-the-package-name` also edits `scripts/take-version.mjs` and
  `guards/take-version.test.js`. Whichever lands second rebases onto `origin/main` and
  re-runs the criteria.
- Merge is the specifying session's (parent review).

## Review record

Reviewed 2026-10-27 by the specifying session (Claude Code desktop, macOS), on the branch
as pushed, with `origin/main` at `eea3537`, which carries `update-keeps-the-package-name`.

### Checks re-run

- Read the diff against the plan: the bash in `scripts/set-up-project.sh`, the
  JavaScript in `scripts/take-version.mjs`, this repository's `.gitattributes` lines and
  the operator guide sentence are Decisions 2 and 3 as written, apart from the header
  sentence the handover names.
- Scope: `git diff --stat origin/main...HEAD` is the seven files of the File Structure
  table plus this plan file.
- The sibling plan landed first and also changed `scripts/take-version.mjs` and
  `guards/take-version.test.js`. The two touch different functions and tests, and
  `git merge-tree` merges this branch into `origin/main` without conflict. The criteria
  are re-run by CI on https://github.com/fcapurso/tropis/pull/135, on the branch merged
  with current `main`, which runs the self-check; it is checked green before the merge.
- The executor's mutation runs (handover) show each Review Focus line going red. Not
  repeated here.

### Found

Nothing beyond the handover. Its correction to Task 4 is right: under Decision 1 an
unanchored loop line and an anchored one are the same line, so Review Focus line 5 goes
red only when the `-export-ignore` line or the new `appendMissingLines` is removed, and
both were run.

### Outstanding disposition

The rebase the handover names is covered by the merged-with-`main` CI run above. No
developer check by hand: the change has no screen.

### Learnings routed

The handover found that `records every shipped file at version unknown` in
`guards/set-up-project.test.js` fails whenever that file is run alone in a checkout that
can see a tag, and passes only in the self-check's export. It predates this plan and is
not in the catalog; it is put to the developer as a candidate idea. Nothing else
generalises: the decisions are recorded in the catalog entry's comment.

### Merged because

Setup now writes export-ignore lines anchored, neither setup nor an update adds a line a
project has in the other form or excludes a path the project keeps, and each of those is
pinned by a test that was seen to fail without the change.
