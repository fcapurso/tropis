# An update never empties the entry instructions behind a symlink — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** when a project's `CLAUDE.md` or `AGENTS.md` is a symlink, taking an update
turns the link into a regular file before it writes the `@AGENTS.md` pointer, and says
so, so `AGENTS.md` ends holding the instructions whichever way the link pointed; and the
entry-file check fails, saying what to do, on a project whose `AGENTS.md` is a symlink
or only an import line, so a project already emptied by an earlier update finds out.

**Spec:** the entry `update-keeps-instructions-behind-a-symlink` in `feature-catalog.yaml`
and the comment above it (raised by first-adopter's upstream flush). There is no design
document. The plan that built the entry pair is
docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md; its review
record was read for this plan (it found a refusal placed after writes, and a plan named
in backticks that drew an integrity exemption — both avoided below).

**What the specifying session verified on 2026-10-31, against `main` at `d270b72`, with
git 2.43.0, Node v22.23.4 and GNU cp (coreutils) 9.4, in a Claude Code cloud session on
Linux x86_64:**

- `scripts/take-version.mjs`:
  - `readText(path)` (about line 65) uses `statSync`, which follows links, and returns
    `null` for a missing path or a non-file; a dangling link reads as `null`, and a link
    cycle throws `ELOOP` out of it.
  - `writeText(path, text)` (about line 74) is `writeFileSync`, which **writes through a
    symlink** into its target, and through a dangling link creates the missing target.
  - `isEntryPointer(text)` (about line 373) is true for `@AGENTS.md` with or without one
    trailing newline.
  - `entryFiles(project)` (about line 386): returns `{}` when `CLAUDE.md` is already the
    pointer; when both are present and identical, writes `@AGENTS.md\n` to `CLAUDE.md`
    and returns `{ report: 'Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.' }`;
    `CLAUDE.md` only → moves it to `AGENTS.md` and writes the pointer; `AGENTS.md` only →
    writes the pointer; they differ → `{ decision }`, changing neither.
  - **The defect:** with `CLAUDE.md` a symlink to `AGENTS.md`, or the reverse, both read
    identical, the identical-pair branch writes the pointer through the link, so both
    names end as `@AGENTS.md` and the update prints `Pointed CLAUDE.md at AGENTS.md,
    which keeps the entry instructions.` and exits 0.
  - `entryFiles` is called once, at about line 539 (`const entry = entryFiles(project);`);
    `entry` goes into the returned `result` object; `entry.report` is printed at about
    line 587 as one line followed by a blank line; `entry.decision` goes into *Needs a
    decision* (about line 585) and adds a `Next:` line (about line 597). Nothing outside
    this file reads `entry.report` or `result.entry` (`grep -rn` over `scripts`, `guards`
    and `.github`).
  - The `node:fs` import (about line 28) already holds `readFileSync`, `statSync`,
    `unlinkSync`, `writeFileSync`; it does not hold `lstatSync`.
- `guards/take-version.test.js`: the entry-pair tests sit at about lines 728–811, each
  `inWorld({}, (w) => …)` with `write(w.project, rel, text)`, `w.commit(msg)`,
  `w.release('v0.2.1', bumpNext)`, `w.take('v0.2.1')`, and the `SLOW` timeout. Its
  `write` helper is `writeFileSync` (writes through a link), and its `snapshot()` helper
  uses `statSync` (throws on a dangling link). The `node:fs` import does not hold
  `symlinkSync` or `lstatSync`.
- `guards/entry-file.test.js` (49 lines): root is `FRAMEWORK_ROOT`, else two levels above
  the file. `agentsProblem()` only checks `existsSync(AGENTS.md)`; `claudeProblem()`
  requires `CLAUDE.md` to be `@AGENTS.md` (one trailing newline optional). So a project
  whose `AGENTS.md` is a symlink, or is itself just `@AGENTS.md` — the state the defect
  leaves — passes today.
- `scripts/check-conformance.sh`: `CASES` is a list of `defect:guard` lines, ending with
  `entry-file-not-pointer:entry-file` (about line 45). `compose()` does
  `cp -R "$FIXTURES/base" "$WORK"`, installs scripts and, under the self-check, the
  shipped `templates/AGENTS.md` and `templates/CLAUDE.md` (the latter is `@AGENTS.md`),
  then `cp -R "$FIXTURES/defects/$1/." "$WORK/"`. Measured: GNU cp 9.4 `-R` copies a
  relative symlink inside the overlay as a symlink, replacing an existing regular file of
  the same name, and the link resolves to a file the overlay also carries. BSD/macOS `cp`
  was not measured. CI runs `bash scripts/check-blueprint.sh` on `ubuntu-latest`.
- No file in the repository is a symlink today (`git ls-files -s` has no mode `120000`).
  `guards/private-material.test.js` walks files with `Dirent.isFile()`, which is false for
  a symlink, so it skips one. `guards/doc-currency.test.js` skips `fixtures/`. No guard or
  script lists `fixtures/defects/` or counts `CASES`.
- `scripts/set-up-project.sh` refuses when `CLAUDE.md` or `AGENTS.md` already exists, so
  setup is not affected. Nothing else writes the entry pair: `CLAUDE.md` appears in
  `scripts/*.mjs` and `scripts/*.js` only in `pipeline.mjs` (its framework path list) and
  `take-version.mjs`.
- `commands/update.md` Stage 6, item 3 (about lines 112–115) handles only the *differ*
  decision; Stage 5 shows the take's whole report.
- **How a single source guard is run.** The repository root has no `package.json`, so a
  guard under `guards/` cannot be run in place; `.tropis`'s Jest runs the *installed*
  guards. Stage committed content the way `scripts/check-blueprint.sh` does — this was run
  and printed `Tests: 35 skipped, 5 passed, 40 total`:

  ```bash
  S="$(mktemp -d)" && git archive HEAD | tar -x -C "$S" \
    && echo '{"type":"module"}' > "$S/package.json" \
    && cp "$S/templates/framework-jest.config.js" "$S/jest.config.js" \
    && ln -s "$PWD/.tropis/node_modules" "$S/node_modules" \
    && (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js take-version -t "entry pair|AGENTS.md|symlink"); rm -rf "$S"
  ```

  Run it from the worktree root. It reads `HEAD`, so commit before running it.

**Model tier: Medium.** The code, messages and tests are specified; symlinks across
fs calls, git and `cp` need care in a test world and a fixture.

**Requires:** nothing beyond the repository.

**Merge authority: self-merge.** Every criterion is checked by a test or a conformance case that must go red first; the executor writes the `## Review record` itself before merging.

Do not store a kick-off prompt on this plan.

---

## Delivers

update-keeps-instructions-behind-a-symlink

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-entry-symlink -b plan/update-keeps-instructions-behind-a-symlink` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's own entry
  pair; the work is in the source folders.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, the handover or the review record.

## Decisions

Taken by the specifying session on 2026-10-31.

### 1. The update turns a symlinked entry file into a regular one, first

In `scripts/take-version.mjs`, add `lstatSync` to the `node:fs` import and add this
helper directly above `entryFiles`:

```js
/**
 * Leaves `path` a regular file or nothing, so no write below goes through a link: a
 * symlink that leads to a file becomes a regular file holding that file's text, and one
 * that leads nowhere — missing target or a cycle — is removed. A link to anything else
 * is left alone. Returns the line to report, or null when nothing changed.
 * @param {string} path
 * @param {string} name
 */
function unlinkEntryFile(path, name) {
  let link;
  try {
    link = lstatSync(path);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  if (!link.isSymbolicLink()) return null;
  let target;
  try {
    target = statSync(path);
  } catch (e) {
    if (e.code !== 'ENOENT' && e.code !== 'ELOOP' && e.code !== 'ENOTDIR') throw e;
    unlinkSync(path);
    return `Removed the dangling symlink ${name}.`;
  }
  if (!target.isFile()) return null;
  const text = readFileSync(path, 'utf8');
  unlinkSync(path);
  writeFileSync(path, text);
  return `Replaced the symlink ${name} with a regular file holding the text it pointed at.`;
}
```

At the very start of `entryFiles`, before `readText` is called on either file:

```js
  const reports = [];
  for (const [path, name] of [[claudePath, 'CLAUDE.md'], [agentsPath, 'AGENTS.md']]) {
    const line = unlinkEntryFile(path, name);
    if (line) reports.push(line);
  }
```

(declare `claudePath` and `agentsPath` first, then this loop, then the existing `readText`
calls). `CLAUDE.md` goes first: when `AGENTS.md` links to `CLAUDE.md`, the replaced
`CLAUDE.md` still holds the same text, so `AGENTS.md` then resolves to it as before.

**Any symlink target, not only the other entry file.** A link to any file is turned into
that file's text; the rule does not try to tell "the other entry file" from "some other
file". It is the simplest rule that makes every later write land on the name it means,
and the project loses nothing: the target file is not touched, and the text it held is
now in the entry file too. A link to a directory is left alone, as today (out of scope:
the existing writes then fail as they already do).

**Then the existing logic runs unchanged**, on what are now regular files or nothing.

**The return shape.** `entryFiles` always returns an object with `reports`, an array of
lines, and optionally `decision`. Every existing `return` changes as follows and no
other way:

| Today | Becomes |
|---|---|
| `return {};` (already the pointer) | `return { reports };` |
| `return { report: 'Pointed CLAUDE.md …' };` | `return { reports: [...reports, 'Pointed CLAUDE.md …'] };` (same text) |
| `return { report: 'Moved the entry instructions …' };` | `return { reports: [...reports, 'Moved the entry instructions …'] };` (same text) |
| `return { report: 'Wrote CLAUDE.md as …' };` | `return { reports: [...reports, 'Wrote CLAUDE.md as …'] };` (same text) |
| `if (claude === null) return {};` | `if (claude === null) return { reports };` |
| `return { decision };` | `return { reports, decision };` |

So a symlink report is kept even when a later branch returns early. In `apply`, replace
`if (entry.report) lines.push(entry.report, '');` with
`if (entry.reports.length > 0) lines.push(...entry.reports, '');` — each line on its own
line, the symlink lines first, one blank line after the group. Update the doc comment
above `entryFiles` with one sentence: a symlinked entry file is first made a regular
file (or removed when it leads nowhere), and the report says so.

### 2. Both directions end the same way

After *Decision 1*, `CLAUDE.md` → `AGENTS.md` and `AGENTS.md` → `CLAUDE.md` both reach
the identical-pair branch with two regular files: `AGENTS.md` keeps the instructions and
`CLAUDE.md` becomes `@AGENTS.md\n`. The report prints the `Replaced the symlink …` line
before `Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.`

### 3. The entry-file check fails on a symlinked or import-only `AGENTS.md`

In `guards/entry-file.test.js`, add `lstatSync` to the import and two messages, verbatim:

```js
const AGENTS_SYMLINK =
  'AGENTS.md is a symlink. It must be a regular file holding this project\'s entry instructions, with CLAUDE.md the single line @AGENTS.md. Replace the link with the text it points at. If an update has already left both files as @AGENTS.md, restore the instructions from the last commit before that update (git log -p -- AGENTS.md CLAUDE.md shows it), then commit.';

const AGENTS_IMPORT =
  'AGENTS.md is a single import line, so it holds none of this project\'s entry instructions. It must be a regular file holding them, with CLAUDE.md the single line @AGENTS.md. Put the instructions back in AGENTS.md; if an update emptied it, restore them from the last commit before that update (git log -p -- AGENTS.md CLAUDE.md shows it), then commit.';
```

`agentsProblem()` becomes, in this order: `lstatSync` the path — missing (`ENOENT`)
→ `AGENTS_MISSING`; `isSymbolicLink()` → `AGENTS_SYMLINK` (checked before anything is
read, so a dangling link names the link, not a missing file); otherwise read it, strip
one trailing newline, and if what is left matches `/^@\S+$/` (one line, starting with
`@`, no whitespace) → `AGENTS_IMPORT`; else `null`. Do not use `existsSync` any more in
`agentsProblem`. Add one line to the file's header comment: `AGENTS.md` must be a regular
file holding the instructions, not a link and not an import line, because an update
once emptied a project that had either.

The shipped `templates/AGENTS.md`, `fixtures/base/AGENTS.md` and this repository's own
`AGENTS.md` start with `@.claude/framework/workflow.md` but run to many lines, so none
matches.

### 4. Conformance: two overlays, one fault each

- `fixtures/defects/entry-agents-is-symlink/` holds `AGENTS.md`, a **relative** symlink
  to `entry-instructions.md`, and `entry-instructions.md`, a regular file:

  ```
  # Example project

  The entry instructions, reached through a symlink.
  ```

  The link target is a file carried in the overlay, not `CLAUDE.md`, on purpose: a link
  to `CLAUDE.md` would be dangling inside the repository (the overlay folder has no
  `CLAUDE.md`), and in the composed tree it would read as `@AGENTS.md` and be caught by
  the import-line check too — two faults, so the case would not show the symlink check
  works on its own. Here only the link is wrong.
- `fixtures/defects/entry-agents-is-import/AGENTS.md`, a regular file whose whole content
  is `@AGENTS.md` and one newline. The base `CLAUDE.md` is already the pointer, so this is
  exactly the state the defect leaves, and only the import-line check can catch it.
- Two lines appended to `CASES` in `scripts/check-conformance.sh`, after
  `entry-file-not-pointer:entry-file`:

  ```
  entry-agents-is-symlink:entry-file
  entry-agents-is-import:entry-file
  ```

  Leave the `printf` widths alone: `entry-agents-is-symlink` is one character wider than
  `%-22s`, which only shifts that line's alignment.

Both are NOT CAUGHT by today's guard; Task 2 shows that before changing the guard.

### 5. What this owes, and does not

- **No `framework/DECISIONS.md` entry:** a bug fix with no real alternative.
- **No fresh-agent check:** nothing under `rules/`, `framework/`, `commands/` or `.claude/`
  changes, and no agent is told anything new.
- **`commands/update.md` is not changed.** Stage 5 already shows the take's whole report,
  where the new `Replaced the symlink …` / `Removed the dangling symlink …` lines appear;
  they report something already done and ask nothing of the agent. Stage 6 item 3
  concerns only the *differ* decision, which this plan does not change. A project already
  damaged fails the entry-file check at Stage 7 with a message that says what to do.
- **Operator guide (`templates/README.md`) not changed:** it does not describe the entry
  check's failures.
- **No upstream queue line:** this repository is the upstream; the fix is the source.

## Traps

- **The take-version tests that must fail first do fail.** Task 1 writes four tests and
  runs them against today's code: all four must fail. Do not adjust them to pass.
- **Conformance must report NOT CAUGHT first, and the self-check then fails.** Task 2 runs
  `bash scripts/check-blueprint.sh` with the overlays and table lines committed and the
  guard unchanged; it must print `NOT CAUGHT  entry-agents-is-symlink …` and
  `NOT CAUGHT  entry-agents-is-import …` and fail. That is the red step, not a breakage.
- **The self-check and the staged single-guard command read `HEAD` only.** Commit before
  each run. The red runs are ordinary commits on this branch; they are working history
  and disappear in the squash.
- **The test helper `write()` writes through a link.** Make each symlink **after** the
  last `write` to that name: `rmSync` the regular file the setup left, then
  `symlinkSync(<relative target>, join(w.project, <name>))`. Never call `snapshot()` in a
  test with a dangling link in the project: it uses `statSync` and throws.
- **A symlink must be committed as one.** After `git add` of each overlay, run
  `git ls-files -s fixtures/defects/entry-agents-is-symlink` and confirm `AGENTS.md` shows
  mode `120000`. A checkout with `core.symlinks=false` stores a text file instead, and the
  case would then be caught for the wrong reason (import line) or not at all.
- **`cp -R` on another platform.** GNU cp copies the link as a link (measured, see above);
  BSD/macOS cp was not measured. On whatever platform runs Task 2, compose the symlink case
  by hand once (`cp -R fixtures/base/. <tmp>/ && cp -R fixtures/defects/entry-agents-is-symlink/. <tmp>/ && ls -l <tmp>/AGENTS.md`)
  and paste the `ls -l` line in the handover, with the `cp` version. If it is not a link,
  record it under *What the plan got wrong*; CI on Linux remains the gate.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | *Decision 1*: `lstatSync` import, `unlinkEntryFile`, the loop, the `reports` return shape, the printer line, the doc comment |
| `guards/take-version.test.js` | Task 1's four tests; `lstatSync`, `symlinkSync` added to the `node:fs` import |
| `guards/entry-file.test.js` | *Decision 3* |
| `scripts/check-conformance.sh` | *Decision 4*: two `CASES` lines |
| `fixtures/defects/entry-agents-is-symlink/AGENTS.md` | new, a relative symlink to `entry-instructions.md` |
| `fixtures/defects/entry-agents-is-symlink/entry-instructions.md` | new, the link's target |
| `fixtures/defects/entry-agents-is-import/AGENTS.md` | new, `@AGENTS.md` and a newline |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` widened, a comment mapping criteria to tests |
| `docs/superpowers/plans/2026-10-31-update-keeps-instructions-behind-a-symlink.md` | the handover report and the review record |

Nothing else: no generated feature document exists in this repository, no guard lists
the defects or counts `CASES`, `fixtures/README.md` already says how to add a defect,
and the backlog board's bands file is refreshed by `/refresh-board`, not by a plan.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version`, `cp --version | head -1`
and `uname -sm` for the handover.

### Task 1 — The update: tests first, then the fix

In `guards/take-version.test.js`, beside the existing entry-pair tests, add four tests,
each `inWorld({}, (w) => …)` with `SLOW`, each committing the project
(`w.commit(…)`) after making its links, then `w.release('v0.2.1', bumpNext)` and
`const r = w.take('v0.2.1')`, and each asserting `r.stderr` is `''` and `r.status` is 0:

1. **`CLAUDE.md` → `AGENTS.md`.** `write` `AGENTS.md` = `'# The entry\nBehind a link.\n'`;
   `rmSync` `CLAUDE.md`; `symlinkSync('AGENTS.md', join(w.project, 'CLAUDE.md'))`.
   After: `lstatSync` of both is not a symbolic link; `AGENTS.md` bytes equal the text;
   `CLAUDE.md` is `'@AGENTS.md\n'`; stdout contains
   `Replaced the symlink CLAUDE.md with a regular file holding the text it pointed at.`
   and `Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.`, the first
   at a lower index than the second.
2. **`AGENTS.md` → `CLAUDE.md`.** `write` `CLAUDE.md` = the same text; `rmSync`
   `AGENTS.md`; `symlinkSync('CLAUDE.md', join(w.project, 'AGENTS.md'))`. After: the same
   four file assertions; stdout contains
   `Replaced the symlink AGENTS.md with a regular file holding the text it pointed at.`
   before the `Pointed CLAUDE.md …` line.
3. **A dangling link.** `write` `AGENTS.md` = `'# Only in agents\n'`; `rmSync`
   `CLAUDE.md`; `symlinkSync('missing.md', join(w.project, 'CLAUDE.md'))`. After:
   `CLAUDE.md` is a regular file `'@AGENTS.md\n'`; `AGENTS.md` unchanged;
   `existsSync(join(w.project, 'missing.md'))` is false; stdout contains
   `Removed the dangling symlink CLAUDE.md.` and
   `Wrote CLAUDE.md as the single line @AGENTS.md.`
4. **A link to another file, kept on an early return.** `write` `AGENTS.md` =
   `'# Kept aside.\n'` and `pointer.md` = `'@AGENTS.md\n'`; `rmSync` `CLAUDE.md`;
   `symlinkSync('pointer.md', join(w.project, 'CLAUDE.md'))`. After: `CLAUDE.md` is a
   regular file `'@AGENTS.md\n'`; `AGENTS.md` and `pointer.md` unchanged; stdout contains
   `Replaced the symlink CLAUDE.md with a regular file holding the text it pointed at.`
   and none of `Pointed CLAUDE.md at AGENTS.md`, `Moved the entry instructions`,
   `Wrote CLAUDE.md as the single line`, `CLAUDE.md and AGENTS.md differ`.

Commit the tests, run them with the staged command from the verified notes (the `-t`
pattern there matches them only if their names contain `AGENTS.md` or `symlink`; name
them so, e.g. `replaces a CLAUDE.md symlinked to AGENTS.md …`), and record how each of
the four fails. Expected today: 1 and 2 fail on `AGENTS.md`'s content (it is
`@AGENTS.md`); 3 fails because `CLAUDE.md` is still a link (and `missing.md` was
created); 4 fails because `CLAUDE.md` is still a link.

Apply *Decision 1*. Commit, re-run the same command until all pass, then run the whole
`take-version` file the same way without `-t` and record the totals: the existing
entry-pair tests must still pass unchanged.

### Task 2 — The check: overlays first, red, then the guard

Create the files of *Decision 4* (make the link with
`ln -s entry-instructions.md fixtures/defects/entry-agents-is-symlink/AGENTS.md`), add
the two `CASES` lines, commit, and confirm mode `120000` (*Traps*). Run
`bash scripts/check-blueprint.sh` and paste the two `NOT CAUGHT` lines and the last
line; the self-check must fail here.

Apply *Decision 3*. Commit, run `bash scripts/check-blueprint.sh` again: paste the lines
`caught      entry-agents-is-symlink …`, `caught      entry-agents-is-import …`,
`caught      entry-file-not-pointer …`, `ok          clean baseline`, and the last line,
which must start `Self-check passed`.

Then show each message once. With the staged command's setup (`S` as in the verified
notes, after committing), for each of three scratch roots — `AGENTS.md` a link to a file
holding text and `CLAUDE.md` = `@AGENTS.md`; `AGENTS.md` = `@AGENTS.md\n` and
`CLAUDE.md` = `@AGENTS.md\n`; `AGENTS.md` a dangling link — run
`(cd "$S" && FRAMEWORK_ROOT=<scratch root> node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js entry-file)`
and paste the failing assertion's message. The first and third must show
`AGENTS_SYMLINK`'s text, the second `AGENTS_IMPORT`'s.

Also do the `cp -R` composition by hand from *Traps* and paste the `ls -l` line.

### Task 3 — Catalog

In `feature-catalog.yaml`, on `update-keeps-instructions-behind-a-symlink`: set
`status: shipped` (it will read `building` once dispatched; if it still reads `shaped`,
set `shipped` anyway and say so under *Judgment calls*). Set `modules` to
`scripts/take-version.mjs`, `guards/entry-file.test.js`, `guards/take-version.test.js`,
`scripts/check-conformance.sh`. Add a comment directly above the entry's `- id:` line,
below the existing comment, mapping each criterion:

```yaml
# Shipped by docs/superpowers/plans/2026-10-31-update-keeps-instructions-behind-a-symlink.md.
# Criterion 1: take-version tests for CLAUDE.md -> AGENTS.md and AGENTS.md -> CLAUDE.md
# (the Replaced line printed before the Pointed line), the dangling link and the link to
# another file. Criterion 2: the same two direction tests. Criterion 3: conformance cases
# entry-agents-is-symlink and entry-agents-is-import. Criterion 4: all of the above.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit.

### Task 4 — Full verification

From the worktree, after committing everything:

- `npm --prefix .tropis test` — the installed release's checks on this repository; paste
  the `Tests:` line. It reads the catalog and this plan.
- `bash scripts/check-blueprint.sh` — paste the three `caught      entry-…` lines,
  `ok          clean baseline`, and the last line, which must start `Self-check passed`.
- `git diff --stat origin/main...HEAD` — paste it; every file must be in *File Structure*.

### Task 5 — Handover report, review record, merge

1. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Commit, push the branch, and open a pull
   request against `main` whose body says what is now true, ending with the attribution
   lines your session gives.
2. **Self-merge: you write the review record.** Wait for the pull request's checks to
   finish (`gh pr checks <N> --watch`); they must all be green. Then append
   `## Review record` below the handover with its five sections: *Checks re-run* (re-run
   Task 1's staged `take-version` command and Task 4's self-check on the final commit,
   with output, tool, version, OS and architecture; and re-break one guard by hand —
   in a throwaway commit, delete the `isSymbolicLink()` branch from `agentsProblem`, run
   the self-check, paste the `NOT CAUGHT  entry-agents-is-symlink` line, then
   `git reset --hard HEAD~1`), *Found* (opening with `Public exposure:` and what reading
   the diff for names, home paths and hostnames found, or `nothing`), *Outstanding
   disposition* (each Outstanding item with a catalog id or a one-line reason to drop;
   say the change has no screen, so there is no developer check), *Learnings routed*
   (or why nothing generalises), *Merged because*. Commit and push, and wait for the
   checks again; all green.
3. Merge, in this order. If `origin/main` moved, first `git fetch origin && git rebase
   origin/main`, re-run Task 4 in full, push with `--force-with-lease`, and wait for
   green. Then, from the main checkout (not the worktree):

   ```bash
   git worktree remove --force ../tropis-entry-symlink
   git branch -D plan/update-keeps-instructions-behind-a-symlink
   gh pr merge <N> --squash --delete-branch \
     --subject "fix(update): an update keeps the entry instructions behind a symlink" \
     --body "<what is now true: a symlinked CLAUDE.md or AGENTS.md is made a regular file before the pointer is written, and reported; AGENTS.md ends holding the instructions either way; the entry-file check fails on a symlinked or import-only AGENTS.md and says how to restore it. Then: Implements: update-keeps-instructions-behind-a-symlink / Plan: docs/superpowers/plans/2026-10-31-update-keeps-instructions-behind-a-symlink.md, and the attribution lines>"
   git checkout main && git pull origin main
   ```

## Handover report

### Task completion

Tasks 0–4 done. Task 5 stopped at the handover: the specifying session overrode the plan's self-merge, so there is no Review record and no merge.

### Verification results

Platform: git 2.43.0, Node v22.23.4, GNU cp (coreutils) 9.4, Linux x86_64.

- Task 0, baseline `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect, …`.
- Task 1, red run (staged command, `-t symlink`, tests committed, code unchanged): `Tests: 4 failed, 40 skipped, 44 total`. All four fail at `expect(lstatSync(CLAUDE.md or AGENTS.md).isSymbolicLink()).toBe(false)` (Received: true), earlier than the plan predicted: the link was still a link, which is the plan's stated cause. After the fix, whole file: `Tests: 44 passed, 44 total`.
- Task 2, overlays committed, guard unchanged: `NOT CAUGHT  entry-agents-is-symlink entry-file passed against a broken project`, `NOT CAUGHT  entry-agents-is-import …`, `Self-check FAILED: conformance or the clean baseline (above).` `git ls-files -s` shows `120000` for the symlink overlay. After the guard: `caught      entry-agents-is-symlink entry-file`, `caught      entry-agents-is-import entry-file`, `caught      entry-file-not-pointer entry-file`, `ok          clean baseline`, `Self-check passed: …`.
- Task 2, each message once (`FRAMEWORK_ROOT` scratch roots): link to a text file → `AGENTS.md is a symlink. It must be a regular file …`; `AGENTS.md` = `@AGENTS.md` → `AGENTS.md is a single import line, …`; dangling link → `AGENTS.md is a symlink. …`. Each run: `Tests: 1 failed, 1 passed, 2 total`.
- Hand composition: `cp -R fixtures/base/. T/ && cp -R fixtures/defects/entry-agents-is-symlink/. T/` gives `lrwxrwxrwx 1 root root 21 Oct 31 10:25 AGENTS.md -> entry-instructions.md` (GNU cp 9.4; BSD cp not measured).
- Task 4: `npm --prefix .tropis test` → `Tests: 33 passed, 33 total`; self-check passed with the three `caught      entry-…` lines and `ok          clean baseline`.

### Scope

`git diff --stat origin/main...HEAD` (before this report): 8 files, 170 insertions, 14 deletions: `feature-catalog.yaml`, the three fixture files, `guards/entry-file.test.js`, `guards/take-version.test.js`, `scripts/check-conformance.sh`, `scripts/take-version.mjs`. Every one is in *File Structure*. Worktree: `../tropis-entry-symlink`.

### Judgment calls

- `isolate-for-plan.sh` failed because the session had already created and checked out `plan/update-keeps-instructions-behind-a-symlink` in the starting directory. I detached HEAD there and added the worktree on the existing branch, which sat at `origin/main` (f575fa1, later than the plan's d270b72; no conflict).
- The catalog entry read `building`; set to `shipped` as the plan says.

### What the plan got wrong

Nothing that blocked work. The red failures land at the symlink assertion, not on file content as predicted for tests 1–2.

### Outstanding

Review and merge by the specifying session. The plan's Review record (including the re-break of the `isSymbolicLink()` branch) is not written, by instruction.
