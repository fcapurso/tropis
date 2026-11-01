# The board is every project's readable view of its backlog, and keeps itself current — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** in every project set up with Tropis, the backlog board's page,
docs/backlog-board/index.html, rebuilds itself from the backlog at every commit, merge,
checkout and rebase, through git hooks the framework package installs, without banding
and without being committed; and the backlog rule, the workflow's doc closeout, the
documentation architecture and the operator guide name the board as the one readable
view of the backlog, asking for no generated catalog document.

**Spec:** the entry `board-is-the-backlog-view` in `feature-catalog.yaml` (band B in
`docs/backlog-board/bands.yaml`) and the decision FW-043 in `framework/DECISIONS.md`.
There is no design document; the entry's acceptance criteria, FW-043 and the decisions
below are the design.

**One thing becomes true:** the board is the backlog's one readable view and keeps
itself current. The rule text exists to point at the mechanism, so it passes the
one-sentence test with it.

**What the specifying session verified on 2026-11-01, against `main` at `c9a9b3c`, with
git 2.49.0, npm 11.6.4 and Node v22.15.0 in Claude Code 2.1.300 on Darwin arm64:**

- **The build.** `scripts/build-backlog-board.mjs` resolves the project root as two
  folders above its own (`resolve(here, '../..')`, so `.tropis/scripts/` → the project),
  reads `feature-catalog.yaml` and, when present, `docs/backlog-board/bands.yaml`, and
  writes docs/backlog-board/index.html. Without `--stamp` it never writes the bands file;
  without a bands file it still builds. It imports `yaml`, so it fails with
  `ERR_MODULE_NOT_FOUND` where `.tropis/node_modules` is missing (measured). A build of
  this repository's backlog took 0.22 seconds.
- **The page is never committed.** `scripts/set-up-project.sh` has
  `append_once .gitignore 'docs/backlog-board/index.html'`, asserted by the test
  "writes a header-only bands file the project owns" in `guards/set-up-project.test.js`;
  this repository's `.gitignore` has the same line.
- **How the framework package gets installed.** `templates/package.json` becomes
  `.tropis/package.json` in setup (`sed "s/PROJECT_SLUG/$slug/"`). Setup ends by telling
  the person to run `npm --prefix .tropis install`; `scripts/take-version.mjs` prints
  `npm --prefix .tropis install` when `.tropis/package.json` changed in an update; the
  repository's AGENTS.md and the dispatch prompt (`scripts/plan-binding.js`) tell every
  clone and worktree to run `npm --prefix .tropis ci`. Measured with npm 11.6.4: both
  `npm ci` and `npm install` run the package's `prepare` script, with the package's own
  folder as the working directory.
- **The trap in the self-check.** `scripts/check-blueprint.sh` installs its test tools by
  copying `templates/package.json` into `.self-check/` and running
  `npm install --prefix "$TOOLS" --no-audit --no-fund --loglevel=error`. With a `prepare`
  script added, that install would run it from `.self-check/`, where no
  `scripts/install-board-hooks.mjs` exists, fail, and stop the self-check under
  `set -euo pipefail`. Hence *Decision 3*.
- **Other installs that will now run `prepare`:** `scripts/check-version.mjs` (an
  `npm install` in a temporary clone), the projects' pipeline (`scripts/pipeline.mjs`,
  `templates/github/tropis-framework-checks.yml`, `npm --prefix .tropis ci`) and tests
  that install a set-up project. In each, the installer runs inside that project's own
  `.tropis/`, which carries the script. *Decision 2* makes it write nothing unless that
  project's root is the top of its own git repository, and exit 0 always.
- **No generated catalog document exists to remove in the framework.**
  `scripts/installed-scripts.txt` lists no catalog-document generator; `git grep` over
  `rules framework commands scripts templates guards` finds the generated-document
  instruction only in `rules/catalogs.md` (opening bullets and *Status transitions*) and
  in `framework/workflow.md`'s doc-closeout row "the feature catalog, and any document
  generated from it". `framework/doc-architecture.md` says planned work is "rendered
  separately" and that non-shipped entries "render under a separate heading". No command
  asks to regenerate a catalog document (`git grep -niE "regenerat" -- commands` finds
  nothing).
- **The framework-integrity guard** fails on a backticked path under `docs/`, `scripts/`
  or `.claude/` that does not exist in the rules, framework documents and commands it
  reads. docs/backlog-board/index.html is not committed anywhere, so every text in
  `rules/` and `framework/` names it in plain text, never in backticks (FW-017 already
  does).
- **Guards that read the operator guide** (`guards/release.test.js`,
  `guards/take-version.test.js`) assert sentences this plan does not touch.
  `guards/set-up-project.test.js` asserts `scripts.board` only, not the whole `scripts`
  object; `guards/take-version.test.js` adds a `scripts.extra` and expects it kept.
- **Review records read**: those of
  `docs/superpowers/plans/2026-11-01-rule-text-says-what-is-true.md` and
  `docs/superpowers/plans/2026-11-01-next-report-shows-all-open-work.md`. The first found
  a probe that never exercised the rule because the agent never opened the catalog file;
  the probes below tell the agent to open `feature-catalog.yaml`. The second found a
  check that passed against unchanged code; every check below is shown failing first.
- **The developer's user-level instructions** say nothing about catalog documents, the
  board or git hooks. They do say to offer adjacent work as a separate question: a probe
  agent that only asks about the old generator, and captures nothing, is inconclusive,
  not a failure.

**Model tier: Medium.** The texts and the hook are verbatim; the installer and its guard
are specified by behaviour and need care with git; the probes need judgment to run and
read.

**Merge authority: parent review.** The change alters rules every later session follows
and installs git hooks in every project. Stop after the handover report (Task 6). Do not
write a review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

board-is-the-backlog-view

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-board-view -b plan/board-is-the-backlog-view origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's entry pair.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body. A commit touching `framework/` or `rules/` says in its body that the
  fresh-agent check is recorded in the handover report, because the probes run later.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, in the handover, or in the probes' scratch projects.

## Decisions

### 1. The hook, verbatim

Four git hooks — `post-commit`, `post-merge`, `post-checkout`, `post-rewrite` — each a
file with exactly this content (git runs a hook from the top of the working tree, so the
relative paths resolve in whichever worktree ran the git command):

```sh
#!/bin/sh
# tropis-backlog-board: written by .tropis/scripts/install-board-hooks.mjs at each npm --prefix .tropis install.
# Rebuilds the backlog board, docs/backlog-board/index.html, from the backlog as checked out. Never fails or prints.
[ -d .tropis/node_modules ] || exit 0
node .tropis/scripts/build-backlog-board.mjs >/dev/null 2>&1
exit 0
```

The marker is the string `tropis-backlog-board`: a hook file containing it is the
framework's, and is rewritten; any other is the project's.

The line a project adds to a hook of its own (printed by the installer, *Decision 2*):

```sh
[ -d .tropis/node_modules ] && node .tropis/scripts/build-backlog-board.mjs >/dev/null 2>&1 || true
```

### 2. The installer, by behaviour

New file `scripts/install-board-hooks.mjs`, an ES module, opening with the line
`// Shared machinery: no part of this file is project-owned.` and a short docblock in the
style of `scripts/build-backlog-board.mjs`. It is listed in `scripts/installed-scripts.txt`
(after `build-backlog-board.mjs`), so setup and updates install it at
`.tropis/scripts/install-board-hooks.mjs`. It takes no arguments. It:

1. Works out the project root as `resolve(here, '../..')`, as the build does.
2. Asks git, with the git config in force (the script sets no `GIT_CONFIG_*` or `HOME`;
   `rules/harness-scripts.md`), for `rev-parse --show-toplevel` from the root. If git
   fails, or the real path of the answer is not the real path of the root, it prints
   `Backlog board: no git hooks written, because this project's folder is not the top of a git repository. npm --prefix .tropis run board rebuilds the page.`
   and exits 0. (This is what keeps it out of a repository the project merely sits
   inside, such as a test's temporary project under another checkout.)
3. Reads `config --get core.hooksPath`. If set to anything non-empty, it writes no hook
   and prints
   `Backlog board: core.hooksPath is set, so no git hook was written. To rebuild the board at each commit, merge, checkout and rebase, add this line to the post-commit, post-merge, post-checkout and post-rewrite hooks there:`
   followed by a line holding the project line of *Decision 1*, indented two spaces.
4. Otherwise finds the hooks folder with `rev-parse --git-path hooks` (resolved against
   the root when relative; in a linked worktree this is the main repository's shared
   folder), creates it if missing, and for each of the four hooks:
   - absent, or containing `tropis-backlog-board`: writes the content of *Decision 1*
     when the file's bytes differ from it, and sets mode `0o755`;
   - otherwise: leaves the file untouched and prints
     `Backlog board: left your <name> hook as it is. To rebuild the board from it, add:`
     followed by the project line, indented two spaces.

   If at least one hook is the framework's after this, it prints
   `Backlog board: rebuilds itself at each commit, merge, checkout and rebase.`
5. Runs the build once (`node <its own folder>/build-backlog-board.mjs`, output
   discarded), so the page exists right after install, whatever happened above.
6. Exits 0 in every case, including an exception, which it reports in one line beginning
   `Backlog board:` on stderr. A failing install of the framework package is never worth
   a board.

### 3. Wiring

- `templates/package.json`: add `"prepare": "node ./scripts/install-board-hooks.mjs"` to
  `scripts`, after `"rules"`. Change nothing else there.
- `scripts/check-blueprint.sh`: add `--ignore-scripts` to the
  `npm install --prefix "$TOOLS" …` line, and add to the comment above
  (`# Its test tools are the ones a set-up project gets: …`) one line:
  `# Installed with --ignore-scripts: the package's prepare script installs a project's git hooks, and this is not a project.`

### 4. The texts, verbatim

In `rules/catalogs.md`, replace the opening paragraph and the first two bullets — from
`The backlog is the source of truth` through
`- Never hand-edit a generated document. Change the backlog and regenerate.` — with:

```markdown
The backlog is the source of truth for what this product does and what is planned. Its
readable view is the backlog board, docs/backlog-board/index.html: one page built from
the backlog, which rebuilds itself without banding anything at every commit, merge,
checkout and rebase, through the git hooks `npm --prefix .tropis install` writes, and is
never committed. After an edit not yet committed, `npm --prefix .tropis run board`
rebuilds it at once.

- **Keep no other readable view of the backlog.** A change to the backlog commits the
  backlog alone: no page, and no document generated from it. A project that already
  generates its own document from the backlog, such as a feature list or a roadmap page,
  replaces it with the board through an entry of its own, which removes the generator,
  its guard, the document and every instruction to run them together. Until that entry
  ships, keep following those instructions; then there is one view.
- Never edit or commit the board's page. Change the backlog, and the page follows.
```

Leave the next bullet (`**A generated region inside a hand-written page gets the same
guard.**`) as it is: it governs generated references in prose pages, not a view of the
backlog.

In *Status transitions*, replace

```markdown
- `building` → `shipped` **when its plan merges**, in the same commit as any document
  regenerated from the backlog.
```

with

```markdown
- `building` → `shipped` **when its plan merges**.
```

In `framework/workflow.md`, *Doc closeout*, replace the row

```markdown
| adds or alters user-visible behaviour | the feature catalog, and any document generated from it |
```

with

```markdown
| adds or alters user-visible behaviour | the feature catalog; the backlog board rebuilds itself from it |
```

In `framework/doc-architecture.md`, replace the table row

```markdown
| What is planned | The same catalog, at a non-shipped status, rendered separately |
```

with

```markdown
| What is planned | The same catalog, at a non-shipped status, read on the backlog board |
```

and in the paragraph below it replace

```markdown
Entries at any other status are intent, not claims about the product, and they render
under a separate heading. Never guard a non-shipped entry, and never let one render as
though it ships; that is how a documentation file starts lying.
```

with

```markdown
Entries at any other status are intent, not claims about the product, and the board
shows them apart from what has shipped. Never guard a non-shipped entry, and never let
one show as though it ships; that is how a documentation file starts lying.
```

In `templates/README.md` (the operator guide a project gets as `.tropis/README.md`),
section *What to type*, replace

```markdown
`npm --prefix .tropis run board` writes one page of the open backlog to open in a browser;
```

with

```markdown
The board, `docs/backlog-board/index.html`, is the backlog as one page to open in a browser. It rebuilds itself at each commit, merge, checkout and rebase, through git hooks that `npm --prefix .tropis install` writes, and is never committed; `npm --prefix .tropis run board` rebuilds it at once, such as after an edit not yet committed. Where the install found a hook of your own, or `core.hooksPath` set, it wrote nothing there and printed the line to add.
```

(the sentence it replaces sits inside one long line; keep the rest of that line,
starting `` `/refresh-board` walks through banding``, after the new text, separated by a
space).

### 5. What this owes, and does not

- **A new guard**, `guards/board-hooks.test.js` (Task 2). It proves the criteria by the
  page's file and contents; no person needs to look at anything, and the page's looks do
  not change.
- **The catalog** (Task 5): the entry to `shipped`, with modules and evidence.
- **A fresh-agent check** (Task 4), because `rules/` and `framework/` change.
- **The decision record** is FW-043, already on `main`; do not edit it.
- **No README change.** `README.md` names `npm --prefix .tropis run board`, which still
  exists; `/refresh-readme` refreshes the page as a whole.
- **No command change.** `/refresh-board` step 1 still builds and reports; it is the
  banding path, and the hooks only rebuild.
- **No rule-area change**, and no rules command: the sources in `rules/` have no
  generated files in this repository's source tree.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **Edit `rules/`, `framework/`, `scripts/`, `guards/`, `templates/`, never `.claude/` or
  `.tropis/`.** In this repository the installed `.tropis/package.json` has no `prepare`
  script and will not get one from this plan; that is correct.
- **Run the isolation command from the primary checkout of the repository**, the one
  whose directory is named `tropis`, so `../tropis-board-view` is a sibling of it. A
  checkout under `.claude/worktrees/` would put the worktree inside the repository.
- **Tests of the installer must isolate git config in the environment they spawn git and
  the installer with** (`GIT_CONFIG_GLOBAL` pointing at an empty file,
  `GIT_CONFIG_NOSYSTEM=1`), and give each temporary repository its own `user.name` and
  `user.email`. The installer itself sets neither (`rules/harness-scripts.md`). Put every
  temporary repository in the system temporary folder, never under a checkout: inside
  one, git would find the outer repository.
- **A hook's output is not the git command's output.** To prove the hook prints nothing,
  run the hook file directly (`sh <hooks>/post-commit` from the project root) and assert
  empty stdout and stderr and exit 0; do not grep `git commit`'s output.
- **The page path is never backticked in `rules/` or `framework/`** (the integrity
  guard); `templates/README.md` is not read by that guard, so it may be.
- **The probes run in scratch projects set up from this branch**, not in this
  repository: a session here loads the installed release, which has neither the new text
  nor the hooks. Confirm before each probe (Task 3); on a `0`, stop and hand back.
- **A probe that fails is a finding, not something to fix.** Do not reword a rule to make
  it pass. Record the failure with the calls, finish Tasks 5 and 6, and leave the verdict
  to the reviewing session.
- **Do not put a colon followed by a space, or a space followed by a hash, inside an
  unquoted YAML value** in the catalog.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/install-board-hooks.mjs` | new, *Decision 2* |
| `scripts/installed-scripts.txt` | one line, *Decision 2* |
| `templates/package.json` | `prepare`, *Decision 3* |
| `scripts/check-blueprint.sh` | `--ignore-scripts` and a comment line, *Decision 3* |
| `guards/board-hooks.test.js` | new, Task 2 |
| `rules/catalogs.md` | *Decision 4* |
| `framework/workflow.md` | *Decision 4*, the doc-closeout row |
| `framework/doc-architecture.md` | *Decision 4* |
| `templates/README.md` | *Decision 4* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/superpowers/plans/2026-11-01-board-is-the-backlog-view.md` | the handover report |

If an existing guard turns red because it pins something this plan changes (for
example a list of installed scripts kept in a test rather than read from
`installed-scripts.txt`), fix the pin, add the file to this table in the handover's
*What the plan got wrong*, and say so; do not weaken the assertion.

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table, and the Trap about where to run it). In the worktree
run `npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints
nothing), then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `npm --version`, the agent tool's version and `uname -sm`, and the
commit you started from.

### Task 1 — Installer, hook and wiring

Write `scripts/install-board-hooks.mjs` (*Decisions 1 and 2*) and apply *Decision 3*.
Then, before any guard, show by hand in a scratch git repository in the system temporary
folder, set up with `bash <worktree>/scripts/set-up-project.sh .` after `git init -q -b
main`, that `npm --prefix .tropis install` prints
`Backlog board: rebuilds itself at each commit, merge, checkout and rebase.` and leaves
four hook files containing `tropis-backlog-board`. Delete the scratch repository.

Commit. Run `bash scripts/check-blueprint.sh`: passes when its last line starts
`Self-check passed` (this is the first proof that *Decision 3*'s `--ignore-scripts`
holds: the self-check reinstalls its tools because `templates/package.json` changed).

### Task 2 — The guard

`guards/board-hooks.test.js`, first line `// Level: seam`, then a docblock saying what it
protects. Build each temporary project the way `guards/backlog-board.test.js` builds its
own (copy the board's scripts and template into `.tropis/`, link the `yaml` the guards
resolve as `.tropis/node_modules`), add `scripts/install-board-hooks.mjs`, a
`.gitignore` holding `docs/backlog-board/index.html`, a catalog and a bands file, then
`git init`, its own identity, and an initial commit. Run the installer as `prepare` does:
`node scripts/install-board-hooks.mjs` with the working directory `.tropis/`. One test
per item, each named for what it proves:

1. Install writes the four hooks, each byte-identical to *Decision 1* and executable,
   and prints the "rebuilds itself" line; the page exists afterwards.
2. Committing a catalog change (a new entry id) leaves the page containing that id, and
   `git status --porcelain` prints nothing.
3. Switching to a branch whose catalog has a different entry shows that entry; merging a
   branch that adds an entry shows it; rebasing a branch onto one that adds an entry
   shows it once the rebase completes.
4. After a rebuild, `docs/backlog-board/bands.yaml` is byte-identical to before.
5. Each hook file, run directly from the project root, exits 0 with empty stdout and
   stderr — with `.tropis/node_modules` present, and with it removed.
6. A pre-existing `post-commit` that is not the framework's is left byte-identical; the
   other three are written; the output names `post-commit` and holds the project line of
   *Decision 1*.
7. With `core.hooksPath` set to a folder in the project, no file is written in that
   folder or in the default hooks folder, and the output holds the project line.
8. A second install leaves all four files byte-identical and exits 0.
9. A linked worktree (`git worktree add` to a sibling folder in the temporary parent,
   with its own `.tropis/node_modules` link) uses the same hooks: a catalog commit there
   rebuilds that worktree's page.
10. A project folder that is a subfolder of a git repository, not its top, gets no hook
    written in that repository, and the output says so.
11. `templates/package.json`'s `scripts.prepare` is `node ./scripts/install-board-hooks.mjs`,
    `scripts/installed-scripts.txt` lists `install-board-hooks.mjs`, and the
    `npm install --prefix "$TOOLS"` line of `scripts/check-blueprint.sh` carries
    `--ignore-scripts`.

**Show it fails first.** Make a throwaway commit that replaces the hook body's build line
with `exit 0` (the hook does nothing), run the guard, and record that tests 2, 3 and 9
fail; drop the commit. Make a second throwaway commit removing `--ignore-scripts` from
`scripts/check-blueprint.sh` and record that test 11 fails; drop it. Then the guard
passes on the real commit. Commit, and run `bash scripts/check-blueprint.sh` (passes:
last line starts `Self-check passed`; the clean baseline runs the new guard).

### Task 3 — The texts

Apply *Decision 4*. Wrap inserted text as the surrounding paragraph is wrapped. Each of
these passes when it prints `1`; the specifying session ran each against `main` at
`c9a9b3c` and each printed `0`:

```bash
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Its readable view is the backlog board, docs/backlog-board/index.html'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Keep no other readable view of the backlog.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Never edit or commit the board'
tr -s ' \n' ' ' < framework/workflow.md | grep -cF 'the feature catalog; the backlog board rebuilds itself from it'
tr -s ' \n' ' ' < framework/doc-architecture.md | grep -cF 'read on the backlog board'
tr -s ' \n' ' ' < templates/README.md | grep -cF 'It rebuilds itself at each commit, merge, checkout and rebase'
```

These pass when they print `0` (against `c9a9b3c` each printed `1`):

```bash
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Where the project generates a document from the backlog'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'in the same commit as any document regenerated'
tr -s ' \n' ' ' < framework/workflow.md | grep -cF 'and any document generated from it'
tr -s ' \n' ' ' < framework/doc-architecture.md | grep -cF 'rendered separately'
tr -s ' \n' ' ' < templates/README.md | grep -cF 'writes one page of the open backlog'
```

And these must print `1` before and after (the text that stays):

```bash
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'A generated region inside a hand-written page gets the same guard.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Three things in an unquoted value break the YAML.'
tr -s ' \n' ' ' < templates/README.md | grep -cF '`/refresh-board` walks through banding and refreshing it'
```

Any other figure: re-read the decision and fix the edit. Read
`git diff origin/main -- rules framework templates/README.md` and say in the handover
that it shows only the replacements of *Decision 4*. Commit, noting in the body that the
fresh-agent check is recorded in the handover report. Run
`bash scripts/check-blueprint.sh`: passes when its last line starts `Self-check passed`.

### Task 4 — The fresh-agent check

Make two empty directories in the system temporary folder, called here B and G. In each:
`git init -q -b main`, `bash <worktree>/scripts/set-up-project.sh .`,
`npm --prefix .tropis install` (record that it printed the "rebuilds itself" line), and
commit everything. Before each probe confirm, and record the count, that
`tr -s ' \n' ' ' < .claude/rules/catalogs.md | grep -cF 'Keep no other readable view of the backlog.'`
prints `1`; a `0` means the scratch project did not get this branch: stop and hand back.

Prepare G as a project with its own generated view: add `scripts/features.mjs`, which
writes `docs/features.md` listing each catalog entry's id and title (any few lines of
Node that read the catalog with `.tropis/node_modules/yaml`), run it, and append to G's
`AGENTS.md` the line
`After changing feature-catalog.yaml, run node scripts/features.mjs and commit docs/features.md with it.`
Commit.

Run each probe as a fresh agent session with the prompt on stdin and its tool calls
visible (for Claude Code, `claude -p --output-format stream-json --verbose` with a scoped
`--allowedTools` list that lets it read, write, edit, search and run git, node and npm;
earlier handovers found a bypass-permissions flag refused and a scoped list working).
Save each stream outside every repository. Do not tell either agent about the rules.

**Probe B** (the board is the view) — prompt: "This is a probe; its output will be
discarded. Open feature-catalog.yaml and add an idea entry to this project's backlog for:
export every note to one file. Commit it. Then say, in one or two sentences, where
someone reads this project's backlog, and whether anything besides the backlog had to be
updated or committed."
**Passes when** all of: the agent's commit changes `feature-catalog.yaml` and nothing
else (on any branch); the stream shows no call that runs, writes or searches for a
catalog-document generator; the final message names the board or
docs/backlog-board/index.html as where the backlog is read. Then, in B's primary
checkout, check out the agent's branch (or stay on `main` if it committed there) and
record whether the page contains the new entry's id — expected yes, through the
post-checkout or post-commit hook; record which. Quote the final message and say
whether the stream shows the agent reading or receiving `.claude/rules/catalogs.md`.

**Probe G** (converge) — prompt: "This is a probe; its output will be discarded. Open
feature-catalog.yaml and add an idea entry to this project's backlog for: export every
note to one file. Do whatever this project's rules say goes with a change to the backlog,
and commit."
**Passes when** the committed backlog holds, besides the export entry, an idea entry to
replace `docs/features.md` and its generator with the board, or the final message says
the catalog rule asks for that and why the agent did not add one. Record, without it
deciding the verdict, whether the agent also ran `scripts/features.mjs` (the project's
AGENTS.md asks it to, and the rule says to keep doing so until the replacement ships).
If the agent only asks the developer and captures nothing, record inconclusive. Quote
the new entry or the reason.

For each probe record pass, fail or inconclusive against every condition, with the tool,
its version, the operating system and the architecture. Then delete both scratch
directories and the stream files.

### Task 5 — Catalog and full verification

In `feature-catalog.yaml`, on `board-is-the-backlog-view`: set `status: shipped` and
`modules` to `scripts/install-board-hooks.mjs`, `templates/package.json`,
`scripts/check-blueprint.sh`, `rules/catalogs.md`, `framework/workflow.md`,
`framework/doc-architecture.md` and `templates/README.md`. Directly above its `- id:`
line, below the comments already there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-board-is-the-backlog-view.md. Criteria
# 1 to 5 are covered by guards/board-hooks.test.js, criteria 6 and 7 by that plan's
# Task 3 checks, and criterion 8 by probes B and G in its handover report.
```

Commit. Then run, and record each output:

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
git diff --stat origin/main...HEAD     # passes: only the File Structure files
```

On a failure that is in this plan's files, fix and re-run; otherwise stop and hand back.

### Task 6 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*), each check's command with its actual
output, the fail-first runs of Task 2, the probes' quotes and verdicts, and the worktree
path used (relative to the primary checkout, no home path). Commit and push the branch,
open a pull request against `main` whose body says what becomes true and links this
plan, and stop. Do not write a review record and do not merge.

## Handover report

Executed by a dispatched agent. Worktree used: `../tropis-board-view` (a sibling of the
primary checkout), branch `plan/board-is-the-backlog-view`, started from `f6f49a1`
(`origin/main`, which carries this plan; the plan names `c9a9b3c`, one commit earlier).
Tools: git 2.49.0, Node v22.15.0, npm 11.6.4, Claude Code 2.1.300, Darwin arm64.

### Task completion

- Task 0: done. `npm --prefix .tropis ci` ran; `git status --porcelain` printed nothing;
  baseline self-check last line `Self-check passed: every guard caught its defect, …`.
- Task 1: done. Installer, hook, `installed-scripts.txt`, `prepare`, `--ignore-scripts`.
  By hand in a scratch repository (`git init -q -b main`, `set-up-project.sh .`,
  `npm --prefix .tropis install`): printed `Backlog board: rebuilds itself at each
  commit, merge, checkout and rebase.` and left four hook files containing
  `tropis-backlog-board`. Scratch repository deleted. Self-check passed afterwards.
- Task 2: done. `guards/board-hooks.test.js`, 11 tests; fail-first runs below.
- Task 3: done. All the text checks gave the expected figures (see below).
- Task 4: done. Probe B passed. Probe G did not (a finding, not fixed).
- Task 5: done. Entry shipped; self-check, Jest and scope check below.
- Task 6: this report.

### Verification results

- Fail first, throwaway 1 (hook build line replaced with `exit 0` in the installer):
  `Tests: 5 failed, 6 passed, 11 total`. Failing: the committed-catalog-change test (2),
  the checkout/merge/rebase test (3), the linked-worktree test (9), and also the
  byte-identical-install test (1) and the project-hook test (6), which compare the
  hook's bytes. Dropped.
- Fail first, throwaway 2 (`--ignore-scripts` removed from `check-blueprint.sh`):
  `Tests: 1 failed, 10 passed, 11 total`, the wiring test (11). Dropped.
- Real commit: `Tests: 11 passed, 11 total`.
- Task 3 text checks (via `tr -s ' \n' ' ' | grep -cF`): the six new phrases printed `1`;
  the five old phrases printed `0`; the three kept phrases printed `1`.
- `git diff origin/main -- rules framework templates/README.md` shows only the
  replacements of *Decision 4*.
- `bash scripts/check-blueprint.sh` after Task 1, Task 2, Task 3 and Task 5: each last
  line starts `Self-check passed: every guard caught its defect, the clean baseline
  passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 134 passed,
  134 total`.

**Probes** (Claude Code 2.1.300, `claude -p --output-format stream-json --verbose`,
scoped `--allowedTools`, Darwin arm64; the session model reported was
`claude-opus-5-5`; the user-level instructions on this machine say nothing about the
board, hooks or catalog documents). Scratch projects B and G were set up from this
branch; `npm --prefix .tropis install` printed the "rebuilds itself" line in both;
before each probe the check for `Keep no other readable view of the backlog.` printed `1`.

- **Probe B: pass.** The agent's commit changes `feature-catalog.yaml` only (11 lines,
  on branch `idea/export-all-notes` in its own worktree). The stream shows it reading
  `.claude/rules/catalogs.md` once and no call that runs or searches for a catalog
  generator. Final message: "You read the backlog on the backlog board,
  `docs/backlog-board/index.html`. It's a page built from `feature-catalog.yaml` that
  rebuilds itself on each commit and is never committed. Nothing else had to be updated
  or committed". Page check: in the agent's worktree the page held the new id right
  after its commit (`1`), by the post-commit hook. In B's primary checkout, a detached
  checkout of the agent's branch showed the id (`1`, by post-checkout) and returning to
  `main` removed it (`0`).
- **Probe G: fail on its condition.** The agent read `.claude/rules/catalogs.md`
  (three references in the stream), ran `scripts/features.mjs` and committed
  `docs/features.md` with the catalog, as the project's `AGENTS.md` says, and said "The
  backlog rules plan to replace that file with the backlog board, but they say to keep
  following this instruction until that replacement ships." The committed backlog holds
  only the export entry besides the example: no entry to replace `docs/features.md`, and
  no reason given for not adding one. It then asked the developer whether to merge to
  `main`. It did not merely ask and capture nothing, so not inconclusive. Finding: the
  rule's "replaces it with the board through an entry of its own" was understood as a
  future thing for someone else, and the agent that read it did not capture it. Per the
  Traps, the rule was not reworded. Fixing it is a decision for the reviewing session.

Scratch directories and streams were deleted.

### Scope

`git diff --stat origin/main...HEAD` (before this report): 10 files, 386 insertions, 23
deletions: `feature-catalog.yaml`, `framework/doc-architecture.md`,
`framework/workflow.md`, `guards/board-hooks.test.js`, `rules/catalogs.md`,
`scripts/check-blueprint.sh`, `scripts/install-board-hooks.mjs`,
`scripts/installed-scripts.txt`, `templates/README.md`, `templates/package.json`. Every
one is in *File Structure*; this report adds the plan file.

### Judgment calls

- The comment above the catalog entry says criterion 8 is covered by probe B and notes
  that probe G did not pass, instead of claiming both, since G failed.
- The installer prints the project line indented two spaces on every use, and the guard
  matches it as a substring, so the indentation is not pinned.
- The installer runs the build once after the hook step even when it wrote no hook
  (including outside a repository top), as Decision 2 step 5 says.
- The guard's temporary projects link `node_modules` from the guard's own tree, the way
  `guards/backlog-board.test.js` does. To run the guard by hand in the worktree I made a
  temporary `node_modules` link and `package.json` (git-ignored, removed before the
  final commit).

### What the plan got wrong

- *Decision 4* quotes the opening of `rules/catalogs.md` as "the opening paragraph and
  the first two bullets", ending at "Never hand-edit a generated document. Change the
  backlog and regenerate." On `main` the first bullet was longer than the plan's
  sketch (it already said a set-up project has no such document and that the board's
  page is not committed). I replaced the span from the opening line up to the bullet
  `**A generated region inside a hand-written page…**`, which is the stated intent.
- The plan's "Task 3" figures for the old phrases matched `main` as found.
- The plan names `c9a9b3c` as the base; the branch was cut from `f6f49a1`, which adds
  only this plan's own commit.

### Outstanding

- Probe G failed: a project that already generates its own view is not told, in a way
  an agent acts on, to capture the replacement. The reviewing session should decide
  whether to reword the rule, add the instruction elsewhere, or accept it.
- Nothing in this repository's installed `.tropis/` was changed, so the hooks are not
  active here until a release is installed.
- The fresh-agent check is recorded here, as the commits touching `rules/` and
  `framework/` say. Doc closeout: the lesson of probe G is the only portable item; no
  other durable change beyond what the plan lists.

### Review round 1

Fix for probe G's finding, as instructed by the reviewing session: in
`rules/catalogs.md` the bullet *Keep no other readable view of the backlog.* now says
that an agent that meets such a document while changing the backlog, and finds no entry
for its replacement, captures one with `/idea` in the same change. Commit `c2ce7db`.

- Text check: `tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'An agent that meets such
  a document while changing the backlog, and finds no entry for its replacement,
  captures one with'` printed `1`. The other Task 3 figures were unchanged: readable
  view `1`, keep no other `1`, never edit or commit `1`, old "Where the project
  generates" `0`, "generated region" `1`.
- `bash scripts/check-blueprint.sh`: last line `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards
  passed.`
- **Probe G re-run: pass.** Fresh scratch project G set up from this branch at
  `c2ce7db`, same seeding (`scripts/features.mjs`, `docs/features.md`, the AGENTS.md
  line), the new sentence present in its `.claude/rules/catalogs.md` (count `1`),
  same prompt, same flags. Claude Code 2.1.300, Darwin arm64, session model
  `claude-opus-5-5`. The agent read `.claude/rules/catalogs.md`, committed the export
  entry and `docs/features.md` as the project's AGENTS.md says, and also added an
  idea entry `backlog-board-only-view`, "Backlog board is the only readable view of the
  backlog", whose value ends "Removes scripts/features.mjs, docs/features.md and the
  AGENTS.md instruction to run them together." Its final message: "A second idea entry,
  `backlog-board-only-view`. The backlog rules say the backlog board should be the only
  readable view of it. An agent that finds a second generated document like
  `docs/features.md`, with no entry yet to remove it, must capture one in the same
  change. Until that entry ships, regenerating the document still applies, which is why
  I did both." It ran `scripts/features.mjs` too, as expected. Scratch project and
  stream deleted.
- The catalog comment above the entry now names probe B and the re-run of probe G.

## Review record

Reviewed by the specifying session, 2026-11-01, on `666b8a1`, with Claude Code 2.1.300
(Opus 5.5), git 2.49.0, npm 11.6.4 and Node v22.15.0 on Darwin arm64.

### Checks re-run

- `git diff --stat origin/main...HEAD`: the eleven files of *File Structure*, nothing
  else; the branch contains `origin/main` (`f6f49a1`).
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 134 passed,
  134 total`.
- `guards/board-hooks.test.js` alone, on an export of `HEAD` with the self-check's
  tools: `Tests: 11 passed, 11 total`.
- The diff of `rules/`, `framework/` and `templates/README.md` read against *Decision 4*
  and review round 1: verbatim, and the only removals are the passages it replaces.
  `scripts/install-board-hooks.mjs` read against *Decisions 1 and 2*: the hook body is
  byte-for-byte the plan's, the top-of-repository and `core.hooksPath` checks come
  before any write, and every path exits 0.

### Found

Public exposure: the diff was read for private material; it names no person, project,
home path or hostname (the guard's identity is `test@example.com`). Nothing found.

- **Probe G failed on the first run, and the clause was the cause.** The agent read the
  catalog rule, quoted it back, and treated "replaces it with the board through an entry
  of its own" as someone else's later work. The rule said what a project does and not
  who captures the entry when. Sent back to the executor as a rule change, not fixed
  here, because it changes what agents do: the bullet now says an agent that meets such
  a document while changing the backlog, and finds no entry for its replacement,
  captures one with `/idea` in the same change. The re-run passed (review round 1).
- The handover's "What the plan got wrong" about *Decision 4*'s span: the plan said to
  replace from the opening sentence through the "Never hand-edit" bullet, which is what
  the executor did; no defect.

### Outstanding disposition

- "Probe G failed": fixed in review round 1, re-probe passed.
- "The hooks are not active in this repository until a release is installed": that is
  how every change here ships; nothing to track.
- "Doc closeout, the lesson of probe G": routed below.

### Learnings routed

- A rule that asks a project for work through a future entry must say who captures that
  entry and at what moment, or an agent reading it defers it. Written into the clause it
  came from (`rules/catalogs.md`); one instance, so no general rule yet.
- The trigger choice and its gaps (uncommitted edits, a git client without `node`, a
  project's own hooks) are in FW-043, written before dispatch.
- Nothing else generalises.

### Merged because

Every criterion is covered by the new guard, the text checks or the two probes, all
re-run or read here, and the one defect review found was fixed by the executor and
re-probed.
