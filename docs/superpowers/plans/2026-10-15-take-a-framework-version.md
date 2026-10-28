# A project takes a new framework version with one command — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** From a Tropis checkout at a release tag,
`node <tropis>/scripts/take-version.mjs <project>` brings a set-up project's framework
files to that release. It writes a `.new` file beside anything the project changed instead
of overwriting it, keeps the project's own hook entries and settings, asks for an explicit
yes before a breaking release, refuses a dirty tree and records the version it installed.
A guard shipped to every project fails when a shipped file no longer matches its recorded
fingerprint.

**Spec:** the entry `project-takes-a-framework-version` in `feature-catalog.yaml`. Read its
thirteen acceptance criteria and the dated comments above it, which record every decision.
Also read `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
in particular *Decided: copy with fingerprints, not a submodule*, for why the project holds
a copy with fingerprints. Section 2 of
`docs/superpowers/specs/2026-10-15-framework-is-developed-with-itself-design.md` defines
"breaking".

**This is the first of two plans for the entry.** This one builds the command for projects
already in the current layout, meaning projects set up by `scripts/set-up-project.sh` as it
is on `main` today. The second plan is the one-time move for projects installed before it
(`.framework/` to `.tropis/`, rule areas to data), run on this repository first. The entry
ships with the second plan, so this one delivers nothing.

**What the specifying session verified on 2026-10-15, against `main` at `7a03ac8`:**

- **Setup** is `scripts/set-up-project.sh <project-root>`. Bash; refuses unless the target
  is a git repository root with none of its outputs present. It copies `rules/*.md` to
  `.framework/rules/`, `templates/rule-areas.json` to `.claude/rule-areas.json`,
  `framework/*.md` to `.claude/framework/`, `commands/*.md` to `.claude/commands/`,
  `templates/settings.json` to `.claude/settings.json`, the files named in
  `scripts/installed-hooks.txt` to `.framework/hooks/` and in
  `scripts/installed-scripts.txt` to `.framework/scripts/`, three guards plus
  `templates/project-layout.test.js` to `.framework/guards/`, the Jest config,
  `templates/README.md` to `.framework/README.md`, `templates/project-brief.md` to
  `.framework/templates/`, and `templates/package.json` to `.framework/package.json` with
  `PROJECT_SLUG` replaced by a slug of the project folder's **basename**. It also writes
  `CLAUDE.md`, `AGENTS.md`, `feature-catalog.yaml` and `docs/verification-log.md`, appends
  lines to `.gitignore` and `.gitattributes` through `append_once`, and finally runs
  `node .framework/scripts/generate-rules.mjs`. That script uses Node built-ins only and
  writes `.claude/rules/*.md` and `.cursor/rules/*.mdc` from the rule texts and the areas
  file. Setup never commits.
- **`guards/set-up-project.test.js`** runs the real setup on scratch repositories built by
  its `repository()` helper (a folder named `example-project` inside an `mkdtemp`
  folder). Its first `it` asserts the **exact** list of files setup writes. It explicitly
  names `.framework/guards/catalog-entries.test.js`, `rule-areas.test.js`,
  `rules-generated.test.js` and `project-layout.test.js`, and builds the scripts and hooks
  from the two install lists.
- **Project-owned blocks.** `commands/release.md` (lines 12–24) and
  `commands/manual-check.md` (lines 19–28) mark the parts a project fills in between a line
  containing `project-owned: begin` and one containing `project-owned: end` (HTML comments
  in Markdown). `scripts/check-drift.sh` lines 25–26 already ignore what lies between such
  markers, matching `(#|//) project-owned: begin/end`. No shipped script has a block today.
- **The shipped `templates/settings.json`** holds a `_comment` array that tells a project to
  delete it before use, and `hooks.PreToolUse` with three matcher groups: `Edit`, `Write`
  and `Bash`. Every hook in them is `{"type":"command","command":"bash .framework/hooks/<script>"}`,
  and the two Bash ones also carry an `if`. This repository's installed
  `.claude/settings.json` has dropped `_comment` and added a `permissions.deny` list.
- **Versions.** This repository has one tag, `v0.1.0`. `git describe --tags --always` here
  prints `v0.1.0-37-g7a03ac8`, and `git rev-parse` resolves that string to the commit. A
  checkout without `.git`, such as the self-check's stage, has no version to describe.
- **The self-check** (`bash scripts/check-blueprint.sh`) stages `HEAD` with `git archive`, so
  the stage has **no `.git`**. It then runs `scripts/check-conformance.sh`, whose
  `compose()` builds a sample project from `fixtures/base`, copies in the installed scripts
  from both install lists, overlays the shipped instruction files, runs the generator, and
  only **then** overlays a defect folder. `CASES` maps each defect folder to the guard that
  must fail on it, and the clean baseline runs every guard.

**Model tier: Medium.** Every rule the command applies is given below. The work is one new
command, a small installed module, a guard, setup and self-check wiring, and three pages.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 8 (record its version and machine).

**Merge authority: parent review.** It is the mechanism every project will update through,
and the specifying session holds the decisions it implements.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-take-version -b plan/project-takes-a-framework-version-command` |

## Global Constraints

- **Do not reopen a decision under *Decisions*.** If one cannot be built as written, stop
  and report.
- **Do not edit `.claude/` or `.framework/` in this repository.** They hold the installed
  release. This repository is not updated by this plan; that is the second plan.
- **No migration code.** Nothing moves `.framework/` to `.tropis/`, rewrites a rule's
  `paths:` header into the areas file, or handles a project without
  `.claude/rule-areas.json`. Such a project is refused (Decision 9).
- **No new dependency.** Node built-ins only, in every file this plan adds. Setup runs
  before `npm install`.
- **Setup's output changes only by the record and the files that make it.** Every file
  setup writes today keeps its bytes.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken with the developer on 2026-10-15 (the entry's comments). Do not reopen them.

1. **Where it runs.** `node <tropis>/scripts/take-version.mjs <project-root> [--from <version>] [--accept-breaking]`,
   run from a Tropis checkout. The target version is the checkout's own tag,
   `git -C <tropis> describe --tags --exact-match HEAD`. If the checkout is not exactly at
   a tag, refuse with `take-version: check out a release tag first (git checkout vX.Y.Z); this checkout is <describe output>.`
   `take-version.mjs` is **not** installed into projects.
2. **The record.** `.framework/installed.json` holds
   `{"version": "<version>", "files": {"<path>": "<sha256 hex>", ...}}`, with paths
   relative to the project root, sorted, two-space indent and a final newline. Setup writes
   it last; the command rewrites it after an update.
3. **Shipped files** are every file under `.framework/`, `.claude/framework/` and
   `.claude/commands/`, **except** `.framework/node_modules/`,
   `.framework/package-lock.json`, `.framework/installed.json` and `.framework/README.md`.
   The last is the project's operator guide, which `/bootstrap` fills in. Nothing outside
   those three folders is shipped in this sense.
   - `.claude/rules/` and `.cursor/rules/` are generated and already carry their own
     hash check. The command regenerates them; it never compares them.
   - `.claude/settings.json` is merged (Decision 7).
   - `.gitignore` and `.gitattributes` get lines appended (Decision 8).
   - `.claude/rule-areas.json` gets keys adjusted (Decision 8).
   - Everything else setup writes (`CLAUDE.md`, `AGENTS.md`, `feature-catalog.yaml`,
     `docs/verification-log.md`) is the project's and is never touched.
4. **A fingerprint** is the SHA-256 of a file's UTF-8 text after removing every line that
   lies strictly between a line matching `/project-owned: begin/` and the next line
   matching `/project-owned: end/`. The marker lines stay. So filling in a block never
   changes a fingerprint.
5. **The baseline**, meaning what the project was given, comes from the record when one
   exists. Without a record, `--from <version>` is required. Refuse without it:
   `take-version: <project> has no .framework/installed.json. Say which version it holds: --from vX.Y.Z.`
   The baseline is then built by setting that version up in scratch (Decision 6) and
   fingerprinting the result.
6. **Building a version in scratch.**
   `git -C <tropis> archive <version> | tar -x -C <tmp>/src`. Then make
   `<tmp>/out/<project basename>`, `git init` it, and run
   `bash <tmp>/src/scripts/set-up-project.sh <that folder>`. Using the project's basename
   makes the slug in `.framework/package.json` match. The new version is built the same
   way, from the checkout's tag. Remove `<tmp>` on every exit path.
7. **Settings.** The command reads the project's `.claude/settings.json` and the new
   scratch's.
   - **Shipped hooks.** A hook is shipped when its `command` contains `.framework/hooks/`.
     In the project, remove every shipped hook from every matcher group of every event,
     and drop groups left with no hooks.
   - **Adding the new version's hooks.** For each group of each event in the new version's
     `hooks`, find the project group for the same event whose keys other than `hooks` are
     deep-equal. Append the new version's hooks **after** the project's own hooks in that
     group. If there is no such group, append the whole group to that event.
   - **Everything else stays.** Every key other than `hooks` is left exactly as the project
     had it. `_comment` is never copied in.
   - Write with two-space indent and a final newline. This file never gets a `.new`.
8. **Areas file and ignore files.**
   - **Areas file.** For each key in the new version's `.claude/rule-areas.json` missing
     from the project's, add it with the new version's value. Remove each project key the
     new version lacks. Report both. Existing keys keep the project's value.
   - **`.gitignore` and `.gitattributes`.** Append every line of the new scratch's file
     that the project's lacks, in order, after the project's last line (adding a newline
     first if the file does not end in one).
   - **Regenerate.** Run `node .framework/scripts/generate-rules.mjs` in the project. If it
     exits non-zero, print its output, say the tree can be restored with
     `git restore . && git clean -fd`, and exit 1.
9. **Refusals, all checked before anything is written.** Each prints one line starting
   `take-version:` and exits 1.
   - The checkout is not at a tag (Decision 1).
   - The project root is not a git repository root.
   - `git -C <project> status --porcelain` prints anything: `take-version: <project> has uncommitted changes. Commit or stash them first; git is this command's backup.`
   - The project has no `.claude/rule-areas.json`: `take-version: <project> was set up before rule areas were project data; the move to this layout is not built yet.`
   - There is no record and no `--from` (Decision 5).
   - The target is not newer than the held version (Decision 10):
     `take-version: <project> already holds <held>; <target> is not newer.`
   - The target is breaking and `--accept-breaking` is absent: `take-version: <target> is a breaking release for a project on <held>. Read its section in RELEASES.md, then run again with --accept-breaking.`
10. **Comparing versions.** Parse `^v(\d+)\.(\d+)\.(\d+)` from each. A held version with a
    suffix after its numbers (a describe string such as `v0.1.0-37-g7a03ac8`) counts as
    later than its numbers but earlier than the next release. Taking `v0.1.0` over it is
    refused; taking `v0.1.1` is allowed. A held version that does not parse (`unknown`)
    needs `--from`, as if there were no record, and `--from` must parse.
    - **Breaking**, below 1.0: the target's major is above 0, or its minor is higher than
      the held minor.
    - **Breaking**, from 1.0: the target's major is higher.
11. **What happens to each path** in the union of the baseline's paths (B) and the new
    version's (N). P is the project's file at that path; fp is the fingerprint.

    | In B | In N | P | Action |
    |---|---|---|---|
    | yes | yes | absent | leave absent; list as *removed by the project, not restored* if fp(N) ≠ fp(B) |
    | yes | yes | fp(P) = fp(B) | replace with N, carrying blocks (Decision 12) |
    | yes | yes | fp(P) ≠ fp(B), fp(N) = fp(B) | leave; nothing to merge |
    | yes | yes | fp(P) ≠ fp(B), fp(N) ≠ fp(B) | leave P; write N, blocks carried, to `<path>.new`; list it |
    | no | yes | absent | write N |
    | no | yes | present | leave P; write N to `<path>.new`; list it |
    | yes | no | absent | nothing |
    | yes | no | fp(P) = fp(B) | delete P |
    | yes | no | fp(P) ≠ fp(B) | leave; list as *no longer shipped, kept because you changed it* |

    The new record is the new version's version and the fingerprints of N, for every path in
    N.
12. **Carrying blocks.** Take the inner lines of each project-owned block in P, in order,
    and substitute them for the inner lines of the matching block in N. If P and N have a
    different number of blocks, treat the file as changed: write `<path>.new` as N
    unchanged, and list it with `project-owned blocks differ in number`.
13. **The report** goes to stdout and ends with the next steps:
    - `npm --prefix .framework install` if `.framework/package.json` changed;
    - `npm --prefix .framework test`;
    - resolve each `.new` file: merge it into the file beside it and delete it. Until then
      the installed-files check fails for that file;
    - commit.
14. **Setup records its version.** At the very end of `set-up-project.sh`, run
    `node "$PROJECT/.framework/scripts/record-installed.mjs" "$version"`. `$version` is
    `git -C "$BP" describe --tags --always 2>/dev/null`, or `unknown` when that fails.
15. **The installed-files guard**, `guards/installed-files.test.js`, is installed into every
    project. With no record it has one passing test, named
    `no record — set up before versions were recorded`. Otherwise it fails if any recorded
    file that exists no longer matches its fingerprint, naming each one, with the message
    `<path> was changed after it was installed. Framework files are replaced on update: move the change into a project-owned block, a rule additions file or a file of your own, or merge the <path>.new beside it.`
    A recorded file that is absent is **not** a failure: a project may remove a command it
    cannot use, and Decision 11 respects that.

## Traps

- **The source guards have one runner: `bash scripts/check-blueprint.sh`, and it reads
  committed content only.** The guards are ES modules and the root has no package file, so
  Jest cannot run them in place. Every "see it red" is a commit followed by the self-check.
  Red commits on the branch are expected and vanish in the squash.
  `npm --prefix .framework test` runs the *installed* release's guards, not the source.
- **The stage has no `.git`.** A test that needs tags builds its own repository. Copy
  `rules/`, `framework/`, `commands/`, `scripts/`, `guards/` and `templates/` from the
  blueprint root (found from the test file's location, as `set-up-project.test.js` does)
  into a scratch folder, `git init`, commit and tag. Never copy `node_modules` or
  `.self-check`. For the same reason, setup run from the stage records `unknown`, and
  `set-up-project.test.js` must expect that.
- **`set-up-project.test.js` asserts the exact file list.** Add
  `.framework/installed.json` and `.framework/guards/installed-files.test.js` to it. The two
  new scripts arrive through `installed-scripts.txt`, which that test already reads.
- **The defect overlay lands after `compose()` writes the record.** A defect that edits a
  shipped file is therefore seen by the guard as an edit after install, which is the point.
- **`framework-integrity` fails a backticked path that does not exist** in the installed
  rules, framework documents, commands and `CLAUDE.md`. If a framework document names a
  `.new` file, write it with a placeholder (`<path>.new`); the guard skips paths with `<`.
- **The README is locked by `guards/readme-usable.test.js`.** Read it before editing
  `README.md`, and keep every claim it asserts true.

## Review Focus

Inputs no criterion names, most likely first. Each has its test in the task named.

- A command whose project-owned block was filled in, and which the new version also changes
  outside the block: replaced, the block carried, no `.new` (Task 3).
- A file the project changed that the new version did not change: left, no `.new` (Task 3).
- A project hook in the same `Bash` matcher group as the shipped ones: kept, and it runs
  first (Task 3).
- A project holding a describe-string version (set up from an untagged checkout) (Task 3).
- A second run immediately after a successful one: refused as not newer (Task 3).
- The project removed a shipped command: not restored (Task 3).

## File Structure

| File | Change |
|---|---|
| `scripts/installed-files.js` | New, installed. `fingerprint(text)`, `blocks(text)`, `carryBlocks(project, next)`, `SHIPPED_ROOTS` and `EXCLUDED`, `shippedFiles(root)`, `recordOf(root, version)`, `recordProblems(root)` (Decisions 2–4, 12, 15) |
| `scripts/record-installed.mjs` | New, installed. CLI `node .framework/scripts/record-installed.mjs <version>`; writes the record for its own project (root two levels up) |
| `scripts/take-version.mjs` | New, not installed. The command (Decisions 1, 5–13) |
| `scripts/installed-scripts.txt` | Adds `installed-files.js` and `record-installed.mjs` |
| `scripts/set-up-project.sh` | Copies `guards/installed-files.test.js`; records the version last (Decision 14); header comment mentions the record |
| `guards/installed-files.test.js` | New, installed (Decision 15), plus unit cases for `fingerprint`, `blocks` and `carryBlocks` |
| `guards/take-version.test.js` | New, not installed. The command against scratch projects (Task 3) |
| `guards/set-up-project.test.js` | Expects the record and the new guard; asserts the record's version is `unknown` from the stage and that it lists exactly the shipped files |
| `scripts/check-conformance.sh` | `compose()` runs `record-installed.mjs conformance` after the generator; one `CASES` line |
| `fixtures/defects/edited-framework-file/.framework/scripts/next.mjs` | New defect: `// edited by hand after install` |
| `fixtures/README.md` | Says the composed project carries a record written by `compose()` |
| `README.md` | New section *Taking a new version*, after *Getting started* |
| `templates/README.md` | One paragraph under *Where the framework lives*: how to take a new version, what a `.new` file asks |
| `framework/DECISIONS.md` | New FW-014: the update model as built (Decisions 2–4, 7, 9–11) |
| `RELEASES.md` | `## [Unreleased]`: a new subsection, not breaking |

## Tasks

### Task 1: The installed module and its guard

**Files:** `scripts/installed-files.js`, `scripts/record-installed.mjs`,
`scripts/installed-scripts.txt`, `guards/installed-files.test.js`

1. Write `installed-files.js` as an ES module, built-ins only, with the functions named in
   *File Structure*.
   - `shippedFiles(root)` walks the three roots, skips what Decision 3 excludes, and returns
     sorted relative paths with `/` separators.
   - `recordOf(root, version)` returns the record object.
   - `recordProblems(root)` returns one message per mismatch (Decision 15), or `[]`.
2. Write `record-installed.mjs`: it resolves the project root two levels above itself,
   writes `recordOf(root, argv[2])` to `.framework/installed.json` in Decision 2's format,
   and prints nothing. With no argument it exits 1 with `usage: record-installed.mjs <version>`.
3. Add both to `installed-scripts.txt`.
4. Write `guards/installed-files.test.js`. Its root is `FRAMEWORK_ROOT`, or two levels above
   the file when installed. Include:
   - Decision 15's two behaviours;
   - unit cases: a fingerprint is unchanged by editing inside a block and changed by
     editing outside one; `carryBlocks` substitutes block contents in order; a mismatch in
     block count is reported.
5. Commit.

### Task 2: Setup records, the self-check proves the guard

**Files:** `scripts/set-up-project.sh`, `guards/set-up-project.test.js`,
`scripts/check-conformance.sh`, the new defect folder, `fixtures/README.md`

1. In setup, add `"$BP"/guards/installed-files.test.js` to the guards `cp`, and add
   Decision 14's last step after the generator, before the final `echo`s.
2. Update `set-up-project.test.js`:
   - the expected list gains `.framework/installed.json` and
     `.framework/guards/installed-files.test.js`;
   - add an `it` asserting the record's `version` is `unknown` (the stage has no `.git`),
     that its `files` keys equal `shippedFiles(dir)`, and that each fingerprint matches.
3. In `compose()`, after the generator line, add
   `node "$WORK/.framework/scripts/record-installed.mjs" conformance >/dev/null`. Add
   `edited-framework-file:installed-files` to `CASES` after
   `stale-addition:rules-generated`. Create the defect file and the README sentence.
4. Commit, run the self-check. Expected: `caught      edited-framework-file  installed-files`,
   every existing line unchanged, the clean baseline ok.

### Task 3: The command

**Files:** `scripts/take-version.mjs`, `guards/take-version.test.js`

1. Write `take-version.mjs` to Decisions 1 and 5–13. Import `fingerprint`, `blocks`,
   `carryBlocks`, `shippedFiles` and `recordOf` from `./installed-files.js`, so the command
   and the guard share one definition.
2. Write `guards/take-version.test.js`, copying the `git()` helper from
   `set-up-project.test.js`.
   - **Fixture.** A helper builds a scratch Tropis repository (see *Traps*) and tags its
     first commit `v0.2.0`. Further helpers commit a change and tag `v0.2.1` or `v0.3.0`.
     The project is a scratch repository named `example-project`, set up by running
     `scripts/set-up-project.sh` from a checkout of `v0.2.0` and committed.
   - **Running it.** Each case checks the scratch Tropis repository out at the target tag,
     with `git checkout -q <tag>`, and runs
     `node <scratch tropis>/scripts/take-version.mjs <project>` with `spawnSync`.

   One `it` each:

   - **Takes a version:** `v0.2.1` changes `commands/next.md` and adds `framework/new-doc.md`.
     After the run, both files in the project equal `v0.2.1`'s, the record's version is
     `v0.2.1`, its fingerprints match, the installed-files guard's `recordProblems` is
     empty, `CLAUDE.md`, `AGENTS.md`, `feature-catalog.yaml`, `docs/verification-log.md` and
     `.framework/README.md` are byte-identical to before, and nothing was committed (`git log`
     has one commit).
   - **Dirty tree refused:** an untracked file in the project. Exit 1, Decision 9's
     message, and every file byte-identical to before.
   - **Changed file gets a `.new`:** the project edits `.claude/commands/next.md` and
     commits; `v0.2.1` changes it too. The project's file is unchanged, the `.new` beside it
     equals `v0.2.1`'s, and stdout lists it.
   - **Changed file the new version left alone:** the project edits
     `.claude/framework/dispatch.md`, which `v0.2.1` does not change. The file is unchanged
     and there is no `.new`.
   - **Blocks carried:** the project fills the block in `.claude/commands/release.md`;
     `v0.2.1` changes a line outside the block. There is no `.new`, and the result is
     `v0.2.1`'s text with the project's block.
   - **Removed when unchanged, kept when changed:** `v0.2.0` ships two extra framework
     documents, `framework/gone-a.md` and `framework/gone-b.md`, and `v0.2.1` deletes both.
     The project edits `gone-b.md` and commits. After the run `gone-a.md` is gone, while
     `gone-b.md` stays and is listed as no longer shipped.
   - **Not restored:** the project deletes `.claude/commands/idea.md`, and `v0.2.1`
     changes it. It stays absent and is listed.
   - **Settings merged:** the project deletes `_comment`, adds `permissions.deny`, and adds
     its own hook to the `Bash` group and a new `Read` group. `v0.2.1` changes one shipped
     hook's command. After the run:
     - `permissions` is unchanged and there is no `_comment`;
     - the `Read` group is intact;
     - in the `Bash` group the project's hook comes first, followed by `v0.2.1`'s shipped
       hooks;
     - there is no `settings.json.new`.
   - **Areas and ignore files:** `v0.2.1` adds a shipped rule `extra.md` with a default area
     in `templates/rule-areas.json`, and a line to setup's `.gitignore` list. After the
     run the project's areas file has the new key, its other values are untouched,
     `.claude/rules/extra.md` exists, and `.gitignore` gained the line once.
   - **Breaking needs a yes:** `v0.3.0`. Without `--accept-breaking`: exit 1, Decision 9's
     message, nothing changed. With it: taken.
   - **Not newer refused:** run `v0.2.1` twice; the second exits 1 with the *already
     holds* message.
   - **No record:** delete `.framework/installed.json` and commit. Without `--from`: exit
     1, the message. With `--from v0.2.0`: the same result as *Changed file gets a `.new`*,
     with the edit committed before the record was deleted.
   - **Describe-string version:** set the record's version to `v0.2.0-3-g<real short hash of
     v0.2.0>` and commit. Taking `v0.2.1` works; taking `v0.2.0` from a checkout at that
     tag is refused as not newer.
   - **Untagged checkout refused:** commit in the scratch Tropis repository without
     tagging. Exit 1, Decision 1's message.
   - **Old layout refused:** delete `.claude/rule-areas.json` and commit. Exit 1, Decision
     9's message.
   - **Scratch removed:** list the system temporary folder before and after a run (success
     and refusal). No new entry remains.

   Commit after each case or small group and run the self-check. For each case, see it red
   once on a deliberate break of the code it exercises, then revert the break.

### Task 4: Pages

**Files:** `README.md`, `templates/README.md`, `framework/DECISIONS.md`, `RELEASES.md`

1. **`README.md`**, a section *Taking a new version* after *Getting started*. It covers:
   - check out the release tag in your Tropis clone and run
     `node scripts/take-version.mjs <project>` from it;
   - the project must have no uncommitted changes, and the command never commits;
   - a `.new` file means you had changed that file: merge it into the file beside it and
     delete it. Until you do, the installed-files check fails;
   - your own hook entries and other settings in `.claude/settings.json` are kept;
   - a breaking release asks for `--accept-breaking` after you read its notes;
   - a project set up before versions were recorded passes `--from <the version it holds>`;
   - a project set up before rule areas were project data cannot be updated yet.
2. **`templates/README.md`**: the same in one paragraph, pointing at the framework's README
   for the details.
3. **FW-014** in `framework/DECISIONS.md`, in the file's format.
   - **Decision:** Decisions 2–4, 7 and 9–11 in prose.
   - **Evidence:** the update-model finding's spike and the entry's shaping comments.
   - **Rejected:** a backup folder (git is the backup); plain `.new` for settings (every
     project changes the file on day one); a submodule (the 2026-10-09 decision).
   - **Consequences:** a project's edit to a framework file keeps the suite red until moved
     or merged; updating needs a Tropis clone until `framework-installs-as-a-package`; the
     move to `.tropis/` is the second plan's.
4. **`RELEASES.md`**: under `## [Unreleased]`, a subsection *A project can take a new
   version*, saying what the reader can now do and that it is not breaking. It is the
   first release with the command, so projects on `v0.1.0` cannot use it yet; say so.
5. Commit and run the self-check.

### Task 5: Full check on a real setup

Make a **throwaway clone** of your worktree outside any repository; never tag the real
repository. In the clone:

1. Tag `HEAD` `v9.9.8`.
2. Set up a scratch project from the clone, and commit it.
3. Make a one-line change to `commands/next.md`, commit, and tag `v9.9.9`.
4. Run the clone's `take-version.mjs` on the scratch project.

Paste the full output into the handover. Then, in the scratch project, run
`npm --prefix .framework install && npm --prefix .framework test` and paste that output
too. Delete the clone and the scratch project.

### Task 6: Doc closeout

State in the handover which rows of the doc-closeout table in `framework/workflow.md`
apply:

- **adopter-facing:** README, done in Task 4;
- **operator guide:** `templates/README.md`, done in Task 4;
- **a decision:** FW-014, done in Task 4;
- **a rule:** none expected; say whether you met a constraint an agent would trip over;
- **feature catalog:** do not edit `feature-catalog.yaml`; the reviewer moves the entry.

### Task 7: Self-check and scope

```bash
bash scripts/check-blueprint.sh
npm --prefix .framework test
git diff --stat origin/main...HEAD
```

Expected: the self-check green with `edited-framework-file` caught by `installed-files`; the
installed checks green; every file in the diff stat listed in *File Structure*.

### Task 8: Fresh-agent check

Start a fresh agent session (any current Claude Code CLI; record the version and machine)
in a scratch project set up from your worktree. Tell it:

> This is a probe and its output will be discarded. This project uses the Tropis
> framework. A new Tropis release is out. Without running anything, tell me exactly how to
> take it, and what I must do if the update leaves a file named
> `.claude/commands/next.md.new`.

Pass if it names the command, the clean-tree requirement and the merge-then-delete step for
`.new`, citing the operator guide or the framework README. Paste its reply.

### Task 9: Handover

Append `## Handover report` to this file with the six sections the planning rules name.
Include every command from Tasks 2–8 with its output, and commit. The reviewer writes the
review record and does not promote the entry: it ships with the second plan.

---

## Criteria and their evidence

What this plan provides for each criterion it touches. The entry ships with the second
plan; criteria it does not touch are listed for that plan.

| Criterion (short) | Evidence here |
|---|---|
| One command takes a version, records it and fingerprints; never commits | `take-version.test.js` › *Takes a version*; Task 5 |
| Uncommitted changes refused | › *Dirty tree refused* |
| Unchanged replaced; changed left with `.new`, listed | › *Takes a version*, *Changed file gets a `.new`*, *Changed file the new version left alone* |
| Removed when unchanged; kept and listed when changed | › *Removed when unchanged, kept when changed* |
| Project-owned files untouched; blocks carried, never a `.new` | › *Blocks carried*; *Areas and ignore files*; *Takes a version* (catalog and entry files unchanged; assert it) |
| Settings: shipped hooks replaced, project's first, the rest kept | › *Settings merged* |
| Breaking asks; same or older refused | › *Breaking needs a yes*, *Not newer refused*, *Describe-string version* |
| No record: asks, judges against that version | › *No record* |
| Shipped check fails on an edited file | `installed-files.test.js`; `edited-framework-file` caught |
| Move to `.tropis/`; rule layout migration; this repository updated | **Second plan** |
| README tells an adopter how and what to do with `.new` | Task 4; Task 8 fresh-agent check |

## Not in this plan

- **The move to `.tropis/` and to the rule-areas layout**, and updating this repository:
  the second plan.
- **The check before updating:** `project-knows-whether-to-update`.
- **Installing as a package:** `framework-installs-as-a-package`.
## Handover report

### Task completion

All nine tasks are done. Nothing was skipped.

- Task 1: `scripts/installed-files.js`, `scripts/record-installed.mjs`, the install list, and `guards/installed-files.test.js`. Commits `d7ce49a`, `2902b5b`.
- Task 2: setup writes the record and copies the guard; the self-check plants an edited shipped file after the record. Commit `2e69450`.
- Task 3: `scripts/take-version.mjs` and `guards/take-version.test.js`, including the two cases added in review (block-count mismatch, generator failure). The command landed in `17808c1`; red runs and their reverts are `1f6e068`, `0810e0f`, `0c64e95`, `6663be1`, `bd99d36`, `dc58a81`.
- Task 4: README, operator guide, FW-014, unreleased notes. Commits `d16b50d`, `3de5c7b`.
- Task 5: throwaway clone, run twice (before and after the marker fix below). Both clones and scratch projects were deleted.
- Task 6: doc closeout, stated below.
- Task 7: self-check, installed-release tests, and the scope diff. Re-checked after `588fcb7`; the file list did not change.
- Task 8: fresh-agent check, Claude Code 2.1.300, dev-laptop.local (Darwin 25.2.0 arm64, macOS 26.2).
- Task 9: this report.

After the whole-branch review, `588fcb7` stops a shipped file from containing the project-owned marker text, so those lines stay in the fingerprint. A setup test now fails if any shipped file other than the release and manual-check commands has a block.

`feature-catalog.yaml` was not edited. The reviewer does not promote the entry; it ships with the second plan.

### Verification results

**Task 2** — `bash scripts/check-blueprint.sh` on `2e69450`, exit 0:

```
Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline
```

**Task 3** — each listed case was red once, in groups rather than one commit per case. The final green run on `dc58a81`:

```
Checking dc58a81 of ~/src/tropis-take-version

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

**Task 4** — `bash scripts/check-blueprint.sh` on `d16b50d` and again on `3de5c7b`, both exit 0, clean baseline ok. The full listing at `3de5c7b` is Task 7 below.

**Task 5, first run** (before the marker fix), throwaway clone tagged `v9.9.8`, scratch project set up and committed, one line added to `commands/next.md`, tagged `v9.9.9`, then the command. The clone was not the real repository. Both were deleted.

```
take-version: /tmp/tropis-take-v998-project/example-project now holds v9.9.9 (was v9.9.8).

Replaced:
  .claude/commands/next.md

Next:
  npm --prefix .framework test
  Commit.
```

`npm --prefix .framework install && npm --prefix .framework test` in that project:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

The five suites were `rule-areas`, `project-layout`, `catalog-entries`, `rules-generated`, `installed-files`. Node printed `ExperimentalWarning: VM Modules` from Jest's experimental loader. npm printed its usual deprecation warnings for `inflight` and `glob`.

**Task 5, second run** after `588fcb7`, same procedure. Record at setup was `v9.9.8`. The command printed the same three-line report (replaced `.claude/commands/next.md`, next step the test and a commit). `npm --prefix .framework test`:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.535 s, estimated 1 s
Ran all test suites.
```

**Task 7** — on `3de5c7b`:

```
bash scripts/check-blueprint.sh
```

exit 0, `edited-framework-file` caught by `installed-files`, clean baseline ok, same caught-lines as Task 2.

```
npm --prefix .framework test
```

This is the installed release, not the source. Exit 0:

```
Test Suites: 3 passed, 3 total
Tests:       4 passed, 4 total
```

```
git diff --stat origin/main...HEAD
```

at that commit, 15 files, 1532 insertions, 6 deletions. After `588fcb7` the name list is unchanged:

```
README.md
RELEASES.md
fixtures/README.md
fixtures/defects/edited-framework-file/.framework/scripts/next.mjs
framework/DECISIONS.md
guards/installed-files.test.js
guards/set-up-project.test.js
guards/take-version.test.js
scripts/check-conformance.sh
scripts/installed-files.js
scripts/installed-scripts.txt
scripts/record-installed.mjs
scripts/set-up-project.sh
scripts/take-version.mjs
templates/README.md
```

Every name is in the plan's File Structure table.

The self-check was run again on `588fcb7` and was green, with the same caught line for `edited-framework-file`.

**Task 8.** Scratch project set up from this branch (not tagged; the real repository was not tagged). Prompt, verbatim:

> This is a probe and its output will be discarded. This project uses the Tropis framework. A new Tropis release is out. Without running anything, tell me exactly how to take it, and what I must do if the update leaves a file named `.claude/commands/next.md.new`.

Tool: Claude Code 2.1.300. Machine: dev-laptop.local, Darwin 25.2.0 arm64, macOS 26.2.

The reply names `node scripts/take-version.mjs`, the clean-tree refusal, and merge-then-delete for `next.md.new`. The wording matches the operator guide (`.framework/README.md` in that project). It does not name that file. It also said it read files, which the prompt asked it not to do. It stated the breaking rule for a describe-string version (`v0.1.0-53-g3de5c7b`) correctly. The scratch project was deleted after the reply was saved.

### Scope

The implementation diff is the 15 paths listed above. Each is in the File Structure table. This commit adds this plan file, which the plan required for the handover and which is not in that table. Nothing under `.claude/` or `.framework/` was edited.

### Judgment calls

- `carryBlocks` returns `{ text, mismatch }`. A count mismatch returns the next text unchanged and `mismatch: true`.
- Refusals are one line on stderr and exit 1. The success report is stdout.
- A recorded path that is not a regular file is not a failure, same as a missing file.
- `--from` is used only when the record is missing or its version does not parse. A parsed record ignores `--from`.
- The npm-install next step is printed only when `.framework/package.json` was replaced or a `.new` was written beside it.
- Scratch directories use the prefix `take-version-`. The temp-folder test asserts none of those remain, rather than that the whole system temp folder is unchanged, because the self-check runs other guards in the same run.
- Messages for a project that is not a git root, an unreadable JSON file, and a `--from` that does not parse are one `take-version:` line each. Decision 9 required a line and did not set the words.
- `blocks` and `shippedFiles` are imported by the command and not called. The plan required the import line.
- The marker regex is built at runtime so the shipped module's own source is not a block. It still matches by "contains".
- Working commits carry a `Co-authored-by: Cursor` trailer the commit tool appended. They were not amended. The squash message has to be written fresh so the trailer does not land.

### What the plan got wrong

- A shipped test file that quotes the marker text is itself a project-owned block. Decision 4 is literal, and the plan's unit cases put the markers in `guards/installed-files.test.js`, which setup installs. The fingerprint then ignored about sixty lines of the guard, and an update would have copied the project's old lines back. FW-014's prose did the same with an empty block. Fixed in `588fcb7`, with a setup test that the only shipped files containing a block are the two commands.
- The existing unreleased note said the update command would move `.framework/` to `.tropis/`. This command does not. That sentence now says the move is a later plan.
- `edited-framework-file` is 21 characters, so the self-check's padded column puts two spaces before `installed-files`. The plan's expected line matches that.

### Outstanding

- Merge is parent review. This session does not merge and does not write the review record.
- Do not promote `project-takes-a-framework-version`. It ships with the second plan, which also does the move to `.tropis/` and updates this repository.
- The squash message must not inherit the `Co-authored-by` trailers on the working commits.
- Two minors left on purpose: `--from` is silent when the record already has a usable version, and a `.new` is still written when the project's bytes already match the new version (Decision 11).
- No new rule. The constraint an agent would trip over — a literal marker in a shipped file — is now a failing setup test, and FW-014 records the update model. The operator guide and the README say how to take a version.

### Doc closeout (Task 6)

- Adopter-facing: `README.md`, section *Taking a new version*, Task 4.
- Operator guide: `templates/README.md`, one paragraph under *Where the framework lives*, Task 4.
- A decision: FW-014, Task 4.
- A rule: none. The marker constraint is enforced by the new setup test rather than a rule an agent would have to remember.
- Feature catalog: not edited.

## Review record

Reviewed by the specifying session on 2026-10-15, against `21c766d`.

### Checks re-run

- `bash scripts/check-blueprint.sh` at `21c766d`, run by the reviewer: exit 0. All 16
  defects were caught, including `edited-framework-file` by `installed-files`, and the
  clean baseline was ok. The pull request's own `self-check` CI job is also green.
- `git diff --stat origin/main...HEAD`: 16 files. These are the 15 in *File Structure* plus
  this plan file, which carries the handover. Nothing under `.claude/` or `.framework/`.
- **The handover's diagnosis about marker text in shipped files.** I re-checked it with
  `grep -rln 'project-owned: begin'` over the source folders. Five files match:
  - `commands/manual-check.md` and `commands/release.md`, which are the real blocks;
  - `scripts/check-drift.sh` and `guards/take-version.test.js`, which are not installed;
  - `rules/harness-scripts.md`, which is installed.

  In `rules/harness-scripts.md`, line 64 holds both markers on one line. No later line
  holds an end marker, so `scan` treats the begin as unclosed and keeps every line. The
  diagnosis and the fix in `588fcb7` hold. The setup test *ships project-owned blocks only
  in manual-check and release* is what keeps that rule safe if it is edited later.
- `scripts/take-version.mjs` and `scripts/installed-files.js`, read in full against
  Decisions 1–15:
  - every refusal comes before the first write;
  - the per-path table in Decision 11 is implemented row for row;
  - the settings merge removes hooks whose command contains `.framework/hooks/` and appends
    the new version's after the project's own;
  - the scratch folder is removed in a `finally`.

### Found

Four things the handover did not raise. None blocks the merge.

1. **A shipped rule the project edited, then dropped by the new version, stops the update
   part-way.** The rule's key is removed from `.claude/rule-areas.json`, but its edited text
   stays in `.framework/rules/` (Decision 11's *kept because you changed it* row). The
   generator then refuses, because there is a shipped rule text with no area. The command
   exits 1 and prints the restore line, so nothing is lost. It is still a dead end the
   operator can only leave by hand. Rare, because additions files exist precisely so that
   a project does not edit shipped rule texts.
2. **The shipped-hook test names `.framework/hooks/`.** The second plan moves the folder to
   `.tropis/`. Until it also widens `isShippedHook`, an update after the move would treat
   every shipped hook as the project's own and duplicate it.
3. **`.claude/settings.json` is rewritten on every run**, with two-space JSON, even when
   nothing in it changed. A project that formats it differently sees a diff with no content
   change.
4. **A `.new` is written even when the project's file already equals the new version's**
   (the executor noted this under *Outstanding*). The operator deletes a `.new` identical to
   the file beside it.

### Outstanding disposition

- **Do not promote the entry.** It stays `building` and ships with the second plan.
- **Squash message without the `Co-authored-by` trailers.** The merge passes `--subject`
  and `--body` explicitly.
- **`--from` is ignored when the record has a usable version.** Dropped: Decision 5 makes
  the record the baseline whenever it exists. A second source would only invite
  disagreement.
- **`.new` written when the bytes already match.** This is Found 4; see below.
- **Found 1:** new idea entry `update-survives-a-dropped-edited-rule`.
- **Found 2:** recorded in a comment on `project-takes-a-framework-version` for the second
  plan, which must widen the test to `.tropis/hooks/`.
- **Found 3:** dropped. Setup writes two-space JSON, and the template is two-space JSON, so a
  project only differs if it reformatted the file itself. The diff then shows once.
- **Found 4:** new idea entry `update-skips-a-new-file-that-matches`.
- **Developer observation:** none needed. The change has no screen, and Task 5 ran the
  command end to end on a real setup.

### Learnings routed

- **A literal marker inside a shipped file silently becomes a block.** Routed to a failing
  setup test in this branch, rather than to a rule an agent must remember. The test is the
  delivery. FW-014 records the marker convention.
- **The plan's unit cases put the marker in a shipped guard.** That was a specifying defect:
  the plan asked for something that broke its own Decision 4. No rule was added. The
  general lesson, that a fixture written into a shipped file ships, is already covered by
  the File Structure rule in `rules/planning.md`. Its question, *what is on the other side
  of this?*, would have caught it, and the setup test now does.

### Merged because

The self-check is green when re-run here, the command implements every decision as written,
and the four findings are small, recorded and routed, with none of them able to lose a
project's work.
