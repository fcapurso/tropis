# The README fact check checks links and paths only, without false alarms — Implementation Plan

**Abandoned on 2026-10-21, not merged** (PR fcapurso/tropis#115, closed). The developer decided not to check the README mechanically between refreshes; see the design's *Between refreshes* section. Do not dispatch.

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover. **This plan continues an open branch and pull request; it does not start a
> new one** — see *Global Constraints*.

**Goal:** the README fact check in every project checks links and file paths only — no slash
commands, which cannot be told apart from web routes and tool built-ins — without the false
alarms and misses an independent review found; one README exception covers every stale
reference; and a fresh agent fixes a failing check from the documents alone.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md` (*The fact
check*), and the first plan on this branch, `docs/superpowers/plans/2026-10-21-readme-fact-check.md`
— read its Decisions and its handover report.

**What the developer decided on 2026-10-21:** drop slash commands from the fact check in every
project. A product README writing "the API answers at /health", "files go to /tmp" or "type
/help in Claude Code" was failing its own checks for naming a Tropis command that does not
exist, and a command at the end of a sentence ("Start with /bootstrap.") was never checked.
Links and file paths are what a product README names and can be checked reliably. This
repository's own README keeps its separate check that every command it names exists
(`guards/readme-usable.test.js`, *every slash command named on the page exists*).

**What the independent review of this branch found (2026-10-21, at `dee4f4c`), each checked by
the specifying session — and what this plan does with it:**

1. Commands: false alarms and misses (above). → Decision 1.
2. The executor added a paragraph after the doc-closeout table (`framework/workflow.md`, "When
   the checks fail because the README names … That is the same exception as the README row
   above.") and a matching sentence in `rules/planning.md` step 5. It is a *wider* exception
   than the row's — any stale reference, not only one the plan itself removed — while calling
   itself the same; FW-026 does not record it; the release note still says only "a plan that
   removes or renames". → Decision 2: one exception, worded once, everywhere.
3. The check's failure message tells the agent what to do ("Correct that reference and add
   nothing else … Do not rewrite the page"), so the second fresh-agent probe may have followed
   the message rather than the documents. → Decision 3 and Task 5.
4. The release note says "Fix it by correcting that reference — or run `/refresh-readme`";
   rewriting the page is what the first probe did and was marked failed for. → Decision 2.
5. The rule that a single dot-folder (`` `.framework/` ``) is not a path exempts every
   top-level dot-folder in every project (`.github/`, `.husky/` deleted would pass). The only
   real case was this repository's README naming the old install folder `.framework/`. →
   Decision 4: a per-project ignore list.
6. Parser gaps: fences indented four or more spaces (code nested in a list) are not skipped;
   HTML comments count; `[x](<docs/a b.md>)` is misread; percent-encoded targets
   (`my%20file.md`) are false positives; a path git ignores (`dist/`, `node_modules/`) exists
   locally and not in CI. → Decision 5.
7. A malformed `docs/readme/readme.yaml` fails the suite with a raw parse error; a mistyped
   level (`Writes`) silently skips. → Decision 6.
8. The conformance case plants all three kinds of name in one README, so it is credited with a
   catch even if two detections broke. → Decision 7.
9. Carried from the reviews of the sibling plans (they edit no file here): `/refresh-readme`
   does not say to quote the hash it records, and an unquoted all-digit hash reads as a number;
   at `writes`, a developer who says no at the second ask after a failing check is left with a
   changed `README.md`. → Decision 8.

**What the specifying session verified, at `dee4f4c` and `main` after PRs fcapurso/tropis#113
and #114:**

- `scripts/readme-facts.js`: `COMMAND` (line 10), `LINK`, `CODE`, `PATH`, `FENCE`
  (`/^( {0,3})(`{3,}|~{3,})/`), `linkName`, `isPath` with the dot-folder rule, `namedThings`,
  `missingThings` (its command branch checks `.claude/commands/` and `commands/`).
- `guards/readme-facts.test.js`: `readmeLevel()` parses the settings with no try; the
  project test throws the message quoted in finding 3; unit tests for commands start at
  *counts a slash command and rejects /usr/bin, and/or, and a URL*.
- `fixtures/defects/readme-names-missing/README.md` holds one line naming a command, a link and
  a path; `scripts/check-conformance.sh` line 45 is `readme-names-missing:readme-facts`.
- `guards/operator-page-closeout.test.js`, *lets a plan correct a README reference to what it
  removed or renamed, and nothing more*, pins the row's exception and planning's
  `corrects that\s+reference in \`README\.md\`, and adds nothing else`.
- `commands/refresh-readme.md` line 125: "**On yes:** set `refreshedAt` … to the current
  `HEAD`"; line 128: "… ask again whether to keep the page; commit only on a second yes."
- `feature-catalog.yaml`, entry `product-readme-is-kept-current`, the criterion beginning
  `- In a project at the writes or suggests level, renaming or deleting a command, file`.
- `main` now also has `scripts/readme-freshness.js` in `scripts/installed-scripts.txt` and new
  sections in `RELEASES.md`, both of which this branch also appends to.

**Model tier: Small–medium.** Every rule and wording is given; the parser changes are small
and each has its test.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 5 (record which).

**Merge authority: parent review.** The specifying session reviews and merges; this branch
ships the entry.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-readme-facts-fixes plan/readme-fact-check` |

## Global Constraints

- **Work on the existing branch `plan/readme-fact-check` and push to it.** It backs the open
  pull request fcapurso/tropis#115. Do not create a branch, open a pull request, merge into
  `main`, rebase or force-push.
- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md`.**
- **Do not edit the first plan's file**, `2026-10-21-readme-fact-check.md`.
- **Do not lower, skip or delete a guard to get green.** Decisions 1, 2 and 7 change guards
  as stated; nothing else may.
- Every commit has a body. No `Co-authored-by` trailer.

## Decisions

Taken by the specifying session on 2026-10-21, Decision 1 by the developer. Do not reopen them.

1. **No slash commands.** In `scripts/readme-facts.js`, delete `COMMAND`, its loop in
   `namedThings`, and the command branch of `missingThings`; the kinds are `link` and `path`
   only, and the doc comments say so. In `guards/readme-facts.test.js`, replace the command
   unit tests with one test that `/update`, `/health`, `/tmp` and `` `/next` `` are not named,
   and update the header comment to "may name only a linked file or a path that exists".

2. **One exception.**
   - `framework/workflow.md`: delete the paragraph after the doc-closeout table that begins
     `When the checks fail because the README names`. In the README row, replace `except to
     correct a command, file or link the README names that the plan removed or renamed —
     correcting the reference and adding nothing` with `except to correct a command, file or
     link the README names that no longer exists — correcting the reference and adding
     nothing`.
   - `rules/planning.md` step 5: replace from `The one exception:` to the end of the step with
     `The one exception: when a command, file or link the README names no longer exists —
     because the plan removed or renamed it, or the project's checks say so — correct that
     reference in README.md and add nothing else; do not rewrite the page.`
   - `guards/operator-page-closeout.test.js`: in *lets a plan correct …*, rename the test to
     `lets a plan correct a README reference that no longer exists, and nothing more`; the
     workflow regex becomes `/A plan does not patch it, except to correct a command, file or
     link the README names that no longer exists — correcting the reference and adding nothing \|/`
     and the planning regex `/correct that reference in README\.md and add nothing else; do not\s+rewrite the page/`.
     Add `expect(workflow).not.toMatch(/same exception as the README row/);`.
     Where `rules/planning.md` wraps the sentence at a different word, put `\s+` for the space
     at that break in the regex, and nowhere else.
   - `RELEASES.md`, section `### Your checks catch a README that names something gone`:
     replace its body with
     ```
     When Tropis keeps your README (`writes` or `suggests`), `npm --prefix .tropis test` now
     fails if the README links to a file that is gone or names a path that no longer exists,
     and says which line. Correct that reference and add nothing else. A project at `manual`,
     or that has not chosen, is not checked.
     ```
     In `### Keep your README current with /refresh-readme`, replace `a plan that removes or
     renames something the README names only corrects that reference.` with `when something
     the README names no longer exists, a plan only corrects that reference.`
   - `framework/DECISIONS.md` FW-026: in **Decision**, replace `three kinds of concrete thing
     — a slash command, a relative link, and a path written in inline code —` with `two kinds
     of concrete thing — a relative link and a path written in inline code —`. Append to
     **Rejected**: `Checking slash commands in every README — a web route, a folder and a tool's
     built-in command look the same, and a command ending a sentence was missed (the developer,
     2026-10-21); this repository's own README check keeps its command check.` Append to
     **Consequences**: `The README exception covers any reference that no longer exists, found by
     the plan or by this check: correct it and add nothing.`

3. **The failure message states the problem, not the remedy.** In
   `guards/readme-facts.test.js` the project test throws the missing lines followed by one line:
   `See the doc-closeout table's README row in the workflow.` Nothing else.

4. **A per-project ignore list.** Delete the dot-folder rule from `isPath`. The settings file
   may carry `ignore:`, a list of exact names (as written in the README) the check does not
   report. The guard reads it and filters `missingThings`' result. This repository's
   `docs/readme/readme.yaml` gets `ignore: [".framework/"]` with the comment `# The install
   folder before 0.3; the README names it to explain the move.` Add `ignore` to the settings
   format where `commands/refresh-readme.md` shows it, as `# ignore: [names the fact check skips]`
   on its own commented line after `refreshedAt`.

5. **Parser.** In `scripts/readme-facts.js`:
   - a fence opens or closes at any indentation (`/^\s*(`{3,}|~{3,})/`);
   - text inside `<!-- … -->`, on one line or across lines, is skipped;
   - a link target written `<…>` is taken from inside the brackets, spaces included;
   - a link target is percent-decoded (`decodeURI`, and left as written if decoding throws)
     before it is checked;
   - reference-style definitions (`[label]: target` at the start of a line) are links.
   In the guard, a name **exists** when it exists on disk or git ignores it
   (`git -C <root> check-ignore -q -- <name>` exits 0), so a build folder named in the README is
   the same locally and in CI. One unit test per bullet; one guard-level test for the ignored
   case is not needed — say so under *Judgment calls* if you add one.

6. **Settings the guard cannot use fail loudly.** `readmeLevel()`: a file that does not parse
   → one failing test `docs/readme/readme.yaml cannot be read: <the parser's message>`; a
   `level` present but not `writes`, `suggests` or `manual` → one failing test `level must be
   writes, suggests or manual, not "<value>"`. No file, or `manual`, still skips.

7. **Conformance, one kind per case.** Delete `fixtures/defects/readme-names-missing/`. Create
   `fixtures/defects/readme-missing-link/` and `fixtures/defects/readme-missing-path/`, each
   with `docs/readme/readme.yaml` (`level: writes`, `refreshedAt: ""`) and a `README.md` of a
   title and one line — `See [the guide](docs/no-such-guide.md).` in the first, ``Edit
   `src/missing/file.js`.`` in the second. In `scripts/check-conformance.sh` replace
   `readme-names-missing:readme-facts` with `readme-missing-link:readme-facts` and
   `readme-missing-path:readme-facts`.

8. **`commands/refresh-readme.md`.** In **On yes**, after `git rev-parse HEAD`, add `— write it
   quoted, so YAML reads it as text`. Replace `commit only on a second yes.` with `commit only on
   a second yes; on a no, put the page back as **On no** says.`

9. **Catalog.** In `feature-catalog.yaml`, replace the criterion `In a project at the writes or
   suggests level, renaming or deleting a command, file or link target the README names makes
   the project's checks fail.` (it is wrapped over two lines) with `In a project at the writes or
   suggests level, deleting or renaming a file or link target the README names makes the
   project's checks fail, and this repository's own checks also fail when its README names a
   command that does not exist.` Change nothing else in the catalog.

## Traps

- **Bring `main` in first.** Run `git merge origin/main` before any edit. `RELEASES.md` and
  `scripts/installed-scripts.txt` will conflict: keep every section and every line from both
  sides, `main`'s first. Commit the merge with a body.
- **The branch already exists.** The isolation command has no `-b`. If git says it is checked
  out elsewhere, stop and hand back.
- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. Run nothing else at the same time. Two runs on
  this machine hung inside a `tar` extract when another self-check ran at once; if a run hangs
  or fails naming no test, wait until nothing else runs, run once more, and report both.
- **This repository's README must still pass** the reduced check (the self-check's
  `readme-facts` plant runs it on the staged tree). If a hit appears after Decision 4, it is
  `.framework/` not being ignored — check the settings file.
- **Do not put a path in backticks under `docs/`, `scripts/` or `.claude/` into framework or
  command text unless it exists here or is exempted.**

## File Structure

| File | Change |
|---|---|
| `scripts/readme-facts.js` | Decisions 1, 4, 5 |
| `guards/readme-facts.test.js` | Decisions 1, 3, 4, 5, 6 |
| `framework/workflow.md` | Decision 2 |
| `rules/planning.md` | Decision 2 |
| `guards/operator-page-closeout.test.js` | Decision 2 |
| `RELEASES.md` | Decision 2, and the merge |
| `framework/DECISIONS.md` | Decision 2 |
| `docs/readme/readme.yaml` | Decision 4 |
| `commands/refresh-readme.md` | Decisions 4, 8 |
| `fixtures/defects/readme-names-missing/README.md` | Decision 7, deleted |
| `fixtures/defects/readme-names-missing/docs/readme/readme.yaml` | Decision 7, deleted |
| `fixtures/defects/readme-missing-link/README.md` | Decision 7, created |
| `fixtures/defects/readme-missing-link/docs/readme/readme.yaml` | Decision 7, created |
| `fixtures/defects/readme-missing-path/README.md` | Decision 7, created |
| `fixtures/defects/readme-missing-path/docs/readme/readme.yaml` | Decision 7, created |
| `scripts/check-conformance.sh` | Decision 7 |
| `feature-catalog.yaml` | Decision 9 |
| `scripts/installed-scripts.txt` | the merge only |
| `docs/superpowers/plans/2026-10-21-readme-fact-check-review-fixes.md` | Handover report only |
| `.claude/rules/planning.md` | **Not edited.** Listed only so dispatch accepts the plan |
| `.cursor/rules/planning.mdc` | **Not edited.** Same reason |

## Tasks

### Task 1: Merge main

As *Traps* says. Self-check green.

### Task 2: The check

Decisions 1, 3, 4, 5, 6 and 7, tests first. Commit; self-check green, with
`caught readme-missing-link readme-facts`, `caught readme-missing-path readme-facts` and
`caught readme-facts: framework/workflow.md planted`. Paste those lines.

### Task 3: One exception, and the records

Decisions 2, 8 and 9. Commit; self-check green with `caught operator-page-closeout:
framework/workflow.md planted`.

### Task 4: On a real setup

In a scratch folder outside any repository: `git init`, run this branch's
`scripts/set-up-project.sh`, `npm --prefix .tropis install`, write `docs/readme/readme.yaml` at
`level: writes` and a `README.md` naming `GET /health`, `/tmp`, `` `dist/` `` (with `dist/` in
`.gitignore` and no such folder), `[brief](docs/project-brief.md)` (absent) and
`` `src/gone.js` `` (absent). `npm --prefix .tropis test` must fail naming exactly
`docs/project-brief.md` and `src/gone.js`; paste it. Then `level: Writes`: it must fail with
`level must be writes, suggests or manual`. Then a settings file reading `level: [`: it must fail
with `cannot be read`. Keep the folder, with the level back at `writes` and everything committed.

### Task 5: Fresh-agent check

Required: a framework document and a shipped rule changed. In the Task 4 project, start a fresh
Claude Code session and give it, in one prompt:

> This is a probe and its output will be discarded. The project's checks are failing. Find out
> why and fix it the way this project's instructions say. Do not commit.

**Pass:** the agent changes only the two failing references in `README.md` — corrects or removes
each — adds no other text, does not rewrite the page or run `/refresh-readme`, and names the
workflow's README row or the planning rule as what it followed (the failure message now names
only the row, so the planning rule or the row's wording is its source); `npm --prefix .tropis
test` then passes; `git diff --stat` shows only `README.md`. **Fail:** anything else; find the
passage it misread, fix it, run again; if it fails twice, stop and hand back. Record the prompt,
the answer's gist, `git diff`, the tool, version and machine **in the handover report**. Delete
the folder.

### Task 6: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: last line `Self-check passed: …`; project checks green; only files in this plan's or
the first plan's File Structure. Append `## Handover report` with the six sections the planning
rules name, commit, and push to `plan/readme-fact-check`.
