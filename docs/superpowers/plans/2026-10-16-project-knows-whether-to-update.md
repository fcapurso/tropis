# A project is told before updating whether it is safe, and why — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** From a Tropis checkout at a release tag,
`node <tropis>/scripts/check-version.mjs <project> [--from <version>]` tells a set-up
project whether taking that release is **safe**, **safe with these steps** or **not now**,
with the reasons. It writes nothing in the project. It works by taking the release for
real in a scratch clone of the project, with the take command's own code, then running
the project's checks there and comparing what agents would be told.

**Spec:** the entry `project-knows-whether-to-update` in `feature-catalog.yaml`. Read its
seven acceptance criteria. Background, for why updates work this way:
`docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`, item 8
under *Decisions already made*. The take command it builds on is decision FW-014 and
FW-015 in `framework/DECISIONS.md`, and `scripts/take-version.mjs`.

**What the specifying session verified on 2026-10-16, against `main` at `7939510`:**

- **`scripts/take-version.mjs`** (691 lines) is a CLI only. Its last lines call `main()`
  at import time and turn a `Refusal` into one `take-version:` line on stderr and exit 1.
  `main()` parses arguments, checks the checkout is exactly at a tag, the project is a git
  root, the tree is clean, which layout it has (`current`, `areas-old`, `v010`), reads the
  record or needs `--from`, refuses a target that is not newer
  (`<project> already holds <held>; <target> is not newer.`) and a breaking one without
  `--accept-breaking`, then builds the baseline and the new version in a
  `mkdtemp(take-version-)` folder and calls `apply()`. `apply()` keeps these lists in
  local variables: `replaced`, `added`, `deleted`, `newFiles`, `blockMismatch`,
  `removedByProject`, `keptButGone`, `areasAdded`, `areasRemoved`, plus `packageChanged`
  and the relocation `report` (`moved`, `rewrote`, `fromHeaders`, `editedRules`). It
  builds the text report from them and writes it to stdout, returning 0. When the
  project's rule generator fails it writes the generator output and a
  `take-version: generating the rules failed…` line to stderr and returns 1.
- **Nothing imports `take-version.mjs`.** `guards/take-version.test.js` runs it with
  `spawnSync`. Its `world()` helper (lines 58–112) builds a scratch Tropis repository from
  the source folders, tags `v0.2.0`, sets a project named `example-project` up from it
  with `scripts/set-up-project.sh`, commits, and offers `release(tag, change)`,
  `commit()`, `take(ref, ...flags)`, `at(tag, rel)` and `clean()`. `snapshot(dir)`
  (lines 42–49) reads every file outside `.git`.
- **The rule generator refuses an additions file for a rule that is not shipped.**
  `scripts/generate-rules.mjs` lines 72–77 call `additionsProblem()` from
  `scripts/rule-areas.js` and collect a problem; the script then exits 1. So taking a
  release that drops a shipped rule fails in any project holding additions to it.
- **A set-up project's checks** are `npm --prefix .tropis test`, which runs
  `node --experimental-vm-modules node_modules/.bin/jest` with
  `.tropis/jest.config.js` (`roots: ['<rootDir>/guards']`, `testMatch: ['**/*.test.js']`).
  Installed guards: `catalog-entries`, `installed-files`, `rules-generated`, `rule-areas`,
  `project-layout`. `installed-files.test.js` fails, naming the file, for every recorded
  file whose fingerprint no longer matches — which includes every file a take left with a
  `.new` beside it, until it is merged.
- **Twelve guard and script reads of `process.env.FRAMEWORK_ROOT`** point a guard at a tree
  other than the one it sits in. The self-check sets it for its own runs.
- **Setup ignores `.tropis/node_modules/`** (`append_once .gitignore` in
  `scripts/set-up-project.sh`) and does not ignore `.tropis/package-lock.json`.
- **The self-check stage links its test tools** at `<stage>/node_modules`
  (`scripts/check-blueprint.sh`: `ln -s "$NM" "$STAGE/node_modules"`), and the stage is
  the blueprint root the guards find from their own location.
- **Every script's first comment line** is `// Shared machinery: no part of this file is
  project-owned.` (after a shebang where there is one); `guards/check-drift.test.js`
  reads it.

**Model tier: Medium.** Every rule the command applies is given below; the refactor of
the take command is mechanical but must not change its behaviour.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 6 (record its version and machine).

**Merge authority: parent review.** The verdict is what an operator will act on before
every update, and the specifying session holds the decisions behind it.

Do not store a kick-off prompt on this plan.

---

## Delivers

project-knows-whether-to-update

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-check-version -b plan/project-knows-whether-to-update` |

## Global Constraints

- **Do not reopen a decision under *Decisions*.** If one cannot be built as written, stop
  and report.
- **The take command's behaviour does not change.** Same arguments, same refusals, same
  output on the same streams, same exit codes. `guards/take-version.test.js` is not
  edited and stays green.
- **Do not edit `.claude/` or `.tropis/` in this repository.** They hold the installed
  release.
- **No new dependency.** Node built-ins only.
- **`check-version.mjs` is not installed into projects.** Do not add it to
  `scripts/installed-scripts.txt`.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken by the specifying session on 2026-10-16. Do not reopen them.

1. **Where it runs.**
   `node <tropis>/scripts/check-version.mjs <project-root> [--from <version>]`, from a
   Tropis checkout, beside `take-version.mjs`. The target is the checkout's tag, exactly
   as the take command finds it. Exit 0 with a verdict (including *nothing to take*);
   exit 1 with one `check-version:` line on stderr for a refusal.
2. **It takes the release in a scratch clone, with the take command's code.** That is how
   "judges what the project changed the same way the take command does" holds by
   construction rather than by keeping two copies in step. To make that possible,
   `take-version.mjs` gains a library seam:
   - `export class Refusal extends Error` with an optional `kind`; the *not newer*
     refusal sets `kind = 'not-newer'`, no other does.
   - `export function takeVersion({ project, from, acceptBreaking })` does what `main()`
     does after argument parsing and returns
     `{ status, text, held, target, breaking, result }`. `status` is 0 or 1; `text` is
     what the CLI writes (stdout when 0, stderr when 1); `breaking` is whether the target
     is breaking for the held version; `result` holds the lists named in the verified
     facts above, `packageChanged` and the relocation `report`. It throws `Refusal`.
     It writes nothing to stdout or stderr itself.
   - The CLI block runs only when the file is executed directly
     (`process.argv[1]` resolves to this file): parse arguments, call `takeVersion`,
     write `text` to the right stream, set the exit code; a `Refusal` goes to stderr with
     exit 1, as today.
3. **Refusals, checked before any scratch work, each one `check-version:` line, exit 1.**
   - Not a git repository root, and uncommitted changes:
     `check-version: <project> has uncommitted changes. Commit or stash them first; the check reads what is committed.`
     The clone sees only committed content, so a dirty tree would be checked as
     something it is not.
   - Every other refusal comes from `takeVersion` on the clone. Re-issue its message with
     the prefix `take-version:` replaced by `check-version:` and every occurrence of the
     clone's path replaced by the project's path.
   - A `Refusal` with `kind === 'not-newer'` is not a refusal here: print
     `check-version: <project> already holds <held>; <target> is not newer. Nothing to take.`
     and exit 0.
4. **The scratch clone.** `mkdtemp(<tmpdir>/check-version-)`, then
   `git clone -q --no-hardlinks <project> <tmp>/<basename of project>` — the same
   basename, because setup derives the package slug from it. Remove `<tmp>` on every exit
   path.
5. **Additions to a rule the release drops.** Before taking, list the target's shipped
   rule names with `git -C <tropis> ls-tree --name-only <target> rules/`. For each
   `.claude/rule-additions/<name>.md` in the clone whose `<name>` is not among them,
   delete it in the clone and commit there
   (`git -c user.name=check-version -c user.email=check-version@localhost commit -qm …`),
   so the take is not stopped by the generator. Each one is a setting that no longer
   fits (Decision 8).
6. **Taking it.** Call `takeVersion({ project: <clone>, from, acceptBreaking: true })`.
   If it returns status 1, the verdict is **not now**, and the reason is its text with
   the clone's path replaced by the project's.
7. **Running the checks in the clone.**
   - **Dependencies.** If the project has `<folder>/node_modules` (`.tropis/` or, for an
     earlier install, `.framework/`) and its `<folder>/package.json` is byte-identical to
     the clone's `.tropis/package.json` after the take, symlink the project's
     `node_modules` to `<clone>/.tropis/node_modules`. Otherwise run
     `npm --prefix .tropis install --no-audit --no-fund` in the clone; if it fails the
     verdict is **not now**, with npm's last lines as the reason. Never run npm in the
     project.
   - **Files the take left with a `.new`.** In the clone's `.tropis/installed.json`, set
     each path in `result.newFiles` whose file exists to the fingerprint of the file in
     place (`fingerprint` from `scripts/installed-files.js`). Without this the
     installed-files check fails for every `.new` by design, and a step would read as a
     broken release. The report says the tests ran with the project's version of those
     files.
   - **Run** `npm --prefix .tropis test -- --json --outputFile=<tmp>/results.json` in the
     clone, with `FRAMEWORK_ROOT` removed from the environment.
   - **Read** `numPassedTests`, `numFailedTests` and, from `testResults[].assertionResults[]`
     with `status === 'failed'`, each `fullName`. A suite that failed to run (a
     `testResults[]` entry with `status === 'failed'` and no failed assertions) is named
     by its file path relative to the clone, with the first line of its `message`. If the
     results file is missing or unreadable, the tests did not run: **not now**, with the
     last lines of the run's output.
8. **Settings that no longer fit**, each named with what to do:
   - each additions file from Decision 5: *the release no longer ships rule `<name>`;
     move or delete `.claude/rule-additions/<name>.md`*;
   - each key in `result.areasRemoved`: *the release no longer ships rule `<key>`; the
     take removes its areas from `.claude/rule-areas.json`*;
   - each path in `result.blockMismatch`: *project-owned blocks differ in number; carry
     your fill-ins into `<path>.new` by hand*;
   - each hook in the clone's `.claude/settings.json` after the take whose command names
     a path matching `/\.tropis\/[^\s"'`;|&)]+/` that does not exist in the clone:
     *hook `<command>` names `<path>`, which the release does not ship*. Shipped hooks
     always exist, so only the project's own can appear.
9. **Rules that change what agents are told.** Compare the generated `.claude/rules/*.md`
   in the project with the clone's after the take — the generated file is what an agent
   is given, the project's additions included. For each name present in both whose text
   differs, print `<name> (areas: <globs from the clone's .claude/rule-areas.json, or
   "its own paths header" for a project's own rule>)` followed by
   `diff -u -L <held>/.claude/rules/<name>.md -L <target>/.claude/rules/<name>.md <project file> <clone file>`.
   List names only in the clone as *added*, with their areas, and names only in the
   project as *removed*.
10. **The verdict**, in this order:
    - **not now** — the take failed in the clone (Decision 6), the install failed, the
      tests did not run, or any test failed;
    - **safe with these steps** — any item under *Needs a decision* in the take's terms
      (`result.newFiles`, `result.removedByProject`, `result.keptButGone`), any setting
      from Decision 8, or a breaking target. The breaking step reads: *this is a breaking
      release for a project on `<held>`: read its section in RELEASES.md, then take it
      with `--accept-breaking`*;
    - **safe** — none of the above.
    The routine steps every take prints (install, run the checks, commit) are not steps
    for the verdict.
11. **The report**, to stdout. The first line is
    `check-version: <project> holds <held>; taking <target> is <verdict>.`, where
    `<verdict>` is exactly `safe`, `safe with these steps` or `not now`. Then, each
    section left out when empty, in this order: *Why not now*, *Steps*,
    *Files the release changes* (replaced, added, deleted), *Files you changed* (each
    `result.newFiles` path, written `<path>.new` would be left beside yours; and
    `removedByProject`, `keptButGone` with the take's wording), *Settings that no longer
    fit*, *Tests against `<target>` in a scratch copy* (`<p> passed, <f> failed`, then
    each failing name; always printed when the tests ran), *Rules that change what agents
    are told*.

## Traps

- **The source guards have one runner: `bash scripts/check-blueprint.sh`, and it reads
  committed content only.** Every "see it red" is a commit followed by the self-check.
  Red commits on the branch are expected and vanish in the squash.
  `npm --prefix .tropis test` runs the *installed* release's checks, not the source.
- **The test fixture's project needs test tools.** In the new test, link
  `realpathSync(join(blueprint, 'node_modules'))` to the scratch project's
  `.tropis/node_modules` after setup, so the clone's checks can run. That folder exists
  in the self-check stage (see the verified facts). It is ignored by the project's
  `.gitignore`, so committing is unaffected. Leave `.tropis/node_modules` out of every
  snapshot comparison.
- **A nested Jest run inherits the outer environment.** If the check does not remove
  `FRAMEWORK_ROOT`, the clone's guards check the wrong tree and pass. The test for
  *not now* is what catches this; see it red with the removal reverted.
- **The fresh project's own checks must pass at `v0.2.0`** for the *safe* case to mean
  anything. If they do not, stop and report: that is a finding about setup, not about
  this plan.
- **`take-version.mjs` must still run as a CLI** from a symlinked or relative path. Compare
  `realpathSync(process.argv[1])` with `realpathSync(fileURLToPath(import.meta.url))`,
  guarding a missing `argv[1]`.
- **The README is locked by `guards/readme-usable.test.js`.** Read it before editing
  `README.md`, and keep every claim it asserts true.

## Review Focus

Inputs no criterion names, most likely first.

- A project whose `.tropis/package.json` the release changes: the check installs in the
  clone, which needs the network. Not covered by the suite for that reason; Task 5
  exercises it on a real setup.
- A project still on `.framework/` (an earlier install): the clone's take moves it, and
  dependencies come from `.framework/node_modules` or an install (Task 3, if the
  executor adds a case; otherwise Task 5).
- A `.new` on an installed guard or script: the record adjustment covers it, and the
  `.new` file itself does not match Jest's `testMatch`.
- Refusal messages naming the project, never the scratch clone (Task 3).

## File Structure

| File | Change |
|---|---|
| `scripts/take-version.mjs` | Library seam (Decision 2): `Refusal` with `kind`, `takeVersion()`, CLI only when run directly. No behaviour change |
| `scripts/check-version.mjs` | New, not installed. The check (Decisions 1, 3–11) |
| `guards/check-version.test.js` | New, not installed. The check against scratch projects (Task 3) |
| `README.md` | *Taking a new version* opens with the check |
| `templates/README.md` | One sentence under *Where the framework lives* |
| `framework/DECISIONS.md` | New FW-016 |
| `RELEASES.md` | `## [Unreleased]`: a new subsection, not breaking |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |
| `docs/superpowers/plans/2026-10-16-project-knows-whether-to-update.md` | This handover. The table omitted it; Task 7 requires the report on the branch |

## Tasks

### Task 1: The take command's library seam

**Files:** `scripts/take-version.mjs`

1. Make the changes in Decision 2. Move the stdout/stderr writes out of `apply()` into
   the returned `text`; keep the strings byte-identical.
2. Commit, run the self-check. Expected: every `take-version.mjs` case passes unchanged.

### Task 2: The check

**Files:** `scripts/check-version.mjs`

1. Write it to Decisions 1 and 3–11, first comment line as the verified facts say. Import
   `takeVersion` and `Refusal` from `./take-version.mjs` and `fingerprint` from
   `./installed-files.js`.
2. Commit.

### Task 3: Its tests

**Files:** `guards/check-version.test.js`

Copy `git()`, `read`, `write`, `edit`, `snapshot`, `fillBlock`/`BEGIN_TO_END` and
`world()` from `guards/take-version.test.js` (do not edit that file), add the
`node_modules` link (see *Traps*), and give `world()` a `check(ref, ...flags)` that checks
`ref` out in the scratch Tropis and runs `check-version.mjs` on the project with
`spawnSync`. Use a generous per-test timeout like `SLOW` there.

In every case that reaches a verdict or a refusal, assert the project is unchanged:
`snapshot` (without `.tropis/node_modules`), `git status --porcelain`, and
`git rev-parse HEAD` equal before and after; no `check-version-` or `take-version-` entry
left in the temporary folder.

One `it` each:

- **Safe:** `v0.2.1` appends a line to `commands/next.md`. Exit 0; first line ends
  `is safe.`; *Files the release changes* lists `.claude/commands/next.md`; the tests
  line reports more than 0 passed and 0 failed.
- **A changed file is a step:** the project edits `.claude/commands/next.md` and commits;
  `v0.2.1` changes it too. `safe with these steps`; *Files you changed* lists it with
  `.new`; the tests line reports 0 failed (this is what proves the record adjustment —
  see it red with Decision 7's second bullet reverted).
- **Not now:** `v0.2.1` adds a failing `it` to `templates/project-layout.test.js`. Exit 0;
  `not now`; the failing test's full name is printed. See it red with the
  `FRAMEWORK_ROOT` removal reverted, run under an environment that sets it.
- **A dropped rule:** `v0.2.0` ships an extra rule (`rules/extra.md` and its key in
  `templates/rule-areas.json`, through `world({ v020 })`); the project adds
  `.claude/rule-additions/extra.md`, regenerates its rules with
  `node .tropis/scripts/generate-rules.mjs`, and commits; `v0.2.1` removes the rule and
  the key. `safe with these steps`; *Settings that no longer fit* names the additions
  file and the removed area; the tests ran.
- **A project hook loses its script:** `v0.2.1` removes one line from
  `scripts/installed-scripts.txt` whose script no installed guard depends on (the
  specifying session suggests `probe-hook-channels.sh`; confirm with a grep); the
  project adds its own hook running that script and commits. The hook is named under
  *Settings that no longer fit*.
- **Block counts differ:** the project fills the block in `.claude/commands/release.md`;
  `v0.2.1` adds a second block to `commands/release.md`. The path is named under
  *Settings that no longer fit*.
- **Rule changes shown:** `v0.2.1` appends a line to one shipped rule in `rules/`. Under
  *Rules that change what agents are told*: the rule's name, its areas from the
  project's `.claude/rule-areas.json`, and a diff containing `+` and that line.
- **Breaking:** `v0.3.0` with a trivial change. `safe with these steps`, and a step that
  names `--accept-breaking`. The project is unchanged and holds `v0.2.0`.
- **Nothing to take:** checking `v0.2.0` itself. Exit 0, *Nothing to take*.
- **Refusals:** an untracked file in the project — exit 1, Decision 3's message; an
  untagged commit in the scratch Tropis — exit 1, a `check-version:` line; the record
  deleted and committed, no `--from` — exit 1, a message containing the project's path
  and not the clone's.
- **`--from` passes through:** the record deleted and committed, `--from v0.2.0`, `v0.2.1`
  as in *Safe*. `safe`.

Commit after each case or small group and run the self-check. For each case, see it red
once on a deliberate break of the code it exercises, then revert the break.

### Task 4: Pages

**Files:** `README.md`, `templates/README.md`, `framework/DECISIONS.md`, `RELEASES.md`

1. **`README.md`**, *Taking a new version*: a first paragraph saying that before taking a
   release, `node scripts/check-version.mjs <project>` from the same checkout answers
   safe, safe with these steps or not now, with reasons; that it writes nothing in the
   project; that it runs the project's checks against the release in a scratch copy; and
   that the project must have no uncommitted changes.
2. **`templates/README.md`**: one sentence before *To take a newer release…* saying the
   same in short.
3. **FW-016** in `framework/DECISIONS.md`, in the file's format, dated 2026-10-16.
   - **Decision:** Decisions 2, 7 and 10 in prose.
   - **Rejected:** a second classifier that predicts what the take would do (two copies
     of one judgment drift); running the checks in the project itself (writes to the
     project); counting a `.new` as a failing check (every project that changed a file
     would read *not now*).
   - **Consequences:** the check costs a full take plus a test run; a release that
     changes the package file needs the network to check.
4. **`RELEASES.md`**: replace `_Nothing yet._` under `## [Unreleased]` with a subsection
   *A project can ask whether to update*, saying what the reader can now do and that it
   is not breaking.
5. Commit and run the self-check.

### Task 5: Full check on a real setup

Make a **throwaway clone** of your worktree outside any repository; never tag the real
repository. In the clone, tag `HEAD` `v9.9.8`, set up a scratch project from it,
`npm --prefix .tropis install` there and commit. Then in the clone change
`templates/package.json` (add `"description": "probe"`) and `commands/next.md`, commit
and tag `v9.9.9`. Run the clone's `check-version.mjs` on the scratch project and paste
the full output. Confirm `git status --porcelain` in the project is empty. Delete both.

### Task 6: Fresh-agent check

Start a fresh agent session (any current Claude Code CLI; record the version and
machine) in a scratch project set up from your worktree. Tell it:

> This is a probe and its output will be discarded. This project uses the Tropis
> framework, and a new Tropis release is out. Without running anything, tell me how to
> find out whether it is safe to take it, and what to do if the answer is "not now".

Pass if it names `check-version.mjs` run from a Tropis checkout at the release tag, says
it changes nothing in the project, and reads *not now* as "do not take it yet; look at
the failing checks it named", citing the operator guide or the framework README. Paste
its reply.

### Task 7: Self-check, scope and handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green; every file in the diff stat listed in *File Structure*. State in
the handover which doc-closeout rows of `framework/workflow.md` applied (adopter README,
operator guide, a decision — all Task 4; a rule — say whether you met a constraint an
agent would trip over). Then append `## Handover report` to this file with the six
sections the planning rules name, every command from Tasks 1–6 with its output, and
commit. The reviewer writes the review record and promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| One command answers safe / with steps / not now; writes nothing | `check-version.test.js` › every case's unchanged-project assertions; *Safe*, *Not now*; Task 5 |
| Lists files replaced, added, removed; marks the project's with `.new` | › *Safe*, *A changed file is a step* |
| Settings that no longer fit | › *A dropped rule*, *A project hook loses its script*, *Block counts differ* |
| Checks run against the release in a scratch copy, counts and failing names | › *Safe*, *Not now* |
| Rules whose text changes, by area, with what changes | › *Rule changes shown* |
| Verdict rules, breaking as a step | › *Not now*, *A changed file is a step*, *Breaking*, *Safe* |
| Same or older version: nothing to take | › *Nothing to take* |

## Not in this plan

- **Installing as a package with a `check` command:** `framework-installs-as-a-package`.
- **Making this repository answer *safe*:** `harness-adopts-the-update-model`.

## Handover report

### Task completion

All seven tasks are done. Merge is parent review: this session does not merge and does not write the review record.

- **Task 1.** `takeVersion()` and `Refusal` are exported from `scripts/take-version.mjs`. The CLI runs only when the file is the program. Commit `6f25caa`. `guards/take-version.test.js` was not edited.
- **Task 2.** `scripts/check-version.mjs` implements Decisions 1 and 3–11. It is not on `scripts/installed-scripts.txt`. Commit `8f490e1`.
- **Task 3.** `guards/check-version.test.js` covers the eleven cases. Each case was seen red on a committed break, then reverted. The first not-now break (`f170275`) stayed green and was reverted (`1532155`); the fixture that can actually fail landed in `4e35ddd`, and that break (`68d1697`) went red.
- **Task 4.** `README.md`, `templates/README.md`, FW-016, and the unreleased note. Commit `d3dd4fd`. A later sentence (`e5ce523`) says what not now means, after the first fresh-agent reply would not.
- **Task 5.** Throwaway clone, tags `v9.9.8` and `v9.9.9`, scratch project, then both deleted. The real repository was not tagged.
- **Task 6.** Fresh agent, Claude Code 2.1.300, machine dev-laptop.local (Darwin 25.2.0 arm64). The second reply passes. The scratch project was deleted.
- **Task 7.** Both suites green on `ea81fd3`. This commit is the report.

A whole-branch review of `56bc7b4..e5ce523` found that the report never said the checks ran with the project's copy of a `.new` file. The assertion was committed first (`6f4df56`) and the self-check went red on that case. The sentence landed in `ea81fd3`.

### Verification results

**Task 1.** `bash scripts/check-blueprint.sh` on `6f25caa`, exit 0. Closing lines:

```
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

**Task 3, first self-check on `466b6e9`.** Exit 1. The clean baseline failed four tests, because the leftover assertion scanned the shared temporary folder while `take-version.test.js` was creating `take-version-*` directories:

```
● check-version.mjs › names an additions file and an area for a rule the release drops
● check-version.mjs › passes --from through and then answers safe
● check-version.mjs › refuses a dirty tree, an untagged checkout, and a missing record without naming the clone
● check-version.mjs › treats a file the project also changed as a step, and the checks still pass
```

**Task 3, after the private `TMPDIR` (`83e1dad`) and after the not-now fixture (`4e35ddd`).** `bash scripts/check-blueprint.sh` exit 0, clean baseline ok, every planted defect caught.

**Each case, seen red** (`bash scripts/check-blueprint.sh`, exit 1, clean baseline failed on the named test, then reverted):

| Break | Test that failed |
|---|---|
| `a63861f` safe | says a release that only changes an untouched file is safe |
| `a4dd108` changed file | treats a file the project also changed as a step, and the checks still pass |
| `68d1697` not now | says not now when the release breaks the project checks |
| `f48b04e` dropped rule | names an additions file and an area for a rule the release drops |
| `35dd313` hook | names a project hook whose script the release no longer ships |
| `5d2f8e2` blocks | names a command whose project-owned blocks differ in number |
| `6d2350c` rules | shows the diff of a shipped rule whose text changes, with its areas |
| `4a02bce` breaking | names --accept-breaking for a breaking release and leaves the project on v0.2.0 |
| `a8a5999` nothing | says there is nothing to take for the version the project holds |
| `d8a8fba` refusals | refuses a dirty tree, an untagged checkout, and a missing record without naming the clone |
| `9225f62` --from | passes --from through and then answers safe |
| `6f4df56` whose text ran | treats a file the project also changed as a step, and the checks still pass |

**Task 4.** `bash scripts/check-blueprint.sh` on `d3dd4fd`, exit 0, clean baseline ok.

**Task 5.** Throwaway clone of the worktree, outside any repository. `HEAD` tagged `v9.9.8`, a scratch project set up from it, `npm --prefix .tropis install` there and committed. The clone then added `"description": "probe"` to `templates/package.json` and changed `commands/next.md`, committed, and tagged `v9.9.9`. The clone's `check-version.mjs` on the scratch project exited 0. stderr was empty. `git status --porcelain` in the project was empty. Both directories were deleted. stdout:

```
check-version: /tmp/check-version-probe-RYrN/example-project holds v9.9.8; taking v9.9.9 is safe.

Files the release changes
  Replaced:
    .claude/commands/next.md
    .tropis/package.json

Tests against v9.9.9 in a scratch copy
  28 passed, 0 failed
```

The package file differed, so the install ran inside the scratch copy. The project had not edited that file, so the verdict is safe and the file is listed under replaced.

**Task 6.** Tool: Claude Code 2.1.300 (`claude --version` reports `2.1.300 (Claude Code)`). Machine: dev-laptop.local, Darwin 25.2.0 arm64. Prompt, verbatim, in a scratch project set up from this worktree, with `claude -p --allowedTools "Read,Grep,Glob"`:

> This is a probe and its output will be discarded. This project uses the Tropis framework, and a new Tropis release is out. Without running anything, tell me how to find out whether it is safe to take it, and what to do if the answer is "not now".

The first reply named `node scripts/check-version.mjs` from the Tropis clone at the tag and said it changes nothing. It did not read not now as "look at the failing checks it named". It said the project's docs don't say what to do after not now, and it inferred the three stages from the installed FW-016. That reply is why `e5ce523` exists.

The second reply, after that commit, passes. It cites `.tropis/README.md:27` and says: don't take the release yet; look at the failing checks the output names. Full reply:

```
**How to find out:** in your Tropis clone (not in this project), check out the new release's tag, then run:

node scripts/check-version.mjs <path-to-this-project>

It gives one of three answers: **safe**, **safe with these steps**, or **not now**. It doesn't change anything in the project, so you can run it at any time. (Source: `.tropis/README.md:27`.)

**If the answer is "not now":** don't take the release yet. Look at the failing checks the output names; those are what's blocking it. That one sentence is all this project's documentation says about "not now". It doesn't explain how to fix the failing checks or when to try again. `.tropis/README.md:23-25` sends you to the framework's own README for maintenance after setup, so the rest would be there, if it exists.

**When the answer is safe:** run `node scripts/take-version.mjs <project>` from the same tag. The project must have no uncommitted changes, and the command doesn't commit for you.

I didn't run anything. I read `.tropis/README.md` and nothing else.
```

The scratch project was deleted.

**Task 7, on `ea81fd3`.**

`bash scripts/check-blueprint.sh` exit 0:

```
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

`npm --prefix .tropis test` exit 0:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

`git diff --stat origin/main...HEAD` before this commit:

```
 README.md                    |   7 +
 RELEASES.md                  |   7 +-
 framework/DECISIONS.md       |  23 +++
 guards/check-version.test.js | 322 +++++++++++++++++++++++++++++++
 scripts/check-version.mjs    | 450 +++++++++++++++++++++++++++++++++++++++++++
 scripts/take-version.mjs     |  91 +++++++--
 templates/README.md          |   2 +
 7 files changed, 880 insertions(+), 22 deletions(-)
```

### Scope

Every path in that stat is in *File Structure*. `feature-catalog.yaml` is absent because the table leaves it to the reviewer. This commit adds this plan file. The table had omitted it; the row was added here because Task 7 requires the report on the branch. Nothing under `.claude/` or `.tropis/` was edited. `guards/take-version.test.js` was not edited. `scripts/check-version.mjs` is not listed in `scripts/installed-scripts.txt`.

### Judgment calls

- A project that is not a git root is refused before the clone, with take-version's sentence and the `check-version:` prefix. A clone cannot represent that tree, and the dirty-tree sentence would be false there.
- The nested test run deletes `FRAMEWORK_ROOT` and every `JEST_*` variable. A nested Jest that inherits the worker id does not run the clone's suite.
- The test links `.tropis/node_modules` and appends that path to `.git/info/exclude`. Setup's ignore line ends in a slash and does not match a symlink, so the link otherwise shows as an uncommitted change.
- The leftover assertion gives the check a private `TMPDIR` (`cv-assert-`) and asserts that directory has no `check-version-` or `take-version-` names.
- When `takeVersion` returns status 1, the verdict is not now and the reason is the take text with the clone path replaced. The `take-version:` prefix stays, as Decision 6 says the reason is that text.
- Steps repeats the changed-file and settings lines, so a with-these-steps verdict has a Steps section. A rule-text change is reported and does not by itself make the verdict with-these-steps.
- A failed clone and a failed additions commit are `check-version:` refusals.
- The tests section names each `.new` path whose file existed, with `the tests ran with the project's version of <path>`.
- Working commits carry a `Co-authored-by: Cursor` trailer the commit tool appended. They were not amended.

### What the plan got wrong

- `templates/project-layout.test.js` does not read `FRAMEWORK_ROOT`. An `expect(true).toBe(false)` in that file fails even when the variable points at a healthy tree, so reverting the env scrub cannot turn the not-now case red. The fixture now deletes `commands/next.md` and teaches that guard to honor `FRAMEWORK_ROOT` and expect the file.
- The trap says the linked `node_modules` is ignored by the project's `.gitignore`. The ignore line is `.tropis/node_modules/` with a trailing slash, and a symlink is not ignored. The test writes `.tropis/node_modules` into `.git/info/exclude`.
- The leftover assertion cannot scan the shared temporary folder. Parallel take-version tests create `take-version-*` names there, and the first self-check on `466b6e9` failed four cases that way.
- Task 4's page text did not teach what not now means. The first Task 6 reply found the command and "changes nothing", then said the docs don't say what to do, and inferred the stages from the installed decision. `e5ce523` adds the sentence the pass line requires.
- Task 5's package change produced **safe**, with `.tropis/package.json` under replaced. The project had not edited that file. The network install happened only in the scratch copy.

### Outstanding

- The reviewer promotes `project-knows-whether-to-update` in `feature-catalog.yaml` and writes `## Review record` before the squash-merge. This session does not.
- The squash message must be written fresh so the `Co-authored-by: Cursor` trailers on the working commits do not land.
- Three review minors, left on purpose: a suite that fails to load is named by a string prefix of the clone path, so a realpath difference (`/var` versus `/private/var`) can leave a deleted scratch path in that line; `section` indents unified-diff context lines, so a rule diff is not a valid patch; the rule, hook, and block cases do not assert the verdict's first line.

### Doc closeout

Rows from `framework/workflow.md`:

- Adopter README: `README.md`, *Taking a new version*, Task 4, with the not-now sentence in `e5ce523`.
- Operator guide: `templates/README.md`, the sentence under *Where the framework lives*. Setup installs that file as `.tropis/README.md`, which is the page the fresh agent cited.
- A decision: FW-016.
- A rule: none added. The first probe would not say to look at the failing checks until that sentence was on the page an agent reads. The sentence is the delivery. This repository is the upstream, so the lesson is the source change itself.

## Review record

Reviewed by the specifying session (Claude Code desktop, Claude Opus 5.5, on the
developer's Mac, Darwin 25.2.0) on 2026-10-16, against `d616a14`.

### Checks re-run

- `bash scripts/check-blueprint.sh` in a review worktree at `d616a14`, exit 0:
  `Checking d616a14 …`, 17 planted defects each `caught`, `ok clean baseline`,
  `Every guard caught its defect and passed the clean baseline.`
- `npm --prefix .tropis test` there, with the entry promoted: `Tests: 28 passed, 28 total`.
- `git diff --stat origin/main...HEAD`: 8 files, 1048 insertions, 22 deletions. Every
  path is in *File Structure*, the plan file included.
- CI on the pull request: `self-check pass`.
- Not re-run: the per-case breaks. Their commits are on the branch and say what they
  break; `68d1697` removes exactly the `FRAMEWORK_ROOT` deletion, `a4dd108` and
  `35dd313` one line each of `check-version.mjs`.
- The handover's diagnoses, checked against the repository:
  `templates/project-layout.test.js` line 8 sets its root without reading
  `FRAMEWORK_ROOT`, so the plan's suggested not-now fixture could not go red; and
  `scripts/check-conformance.sh` lines 113–134 run every guard with `FRAMEWORK_ROOT`
  set, which is why the nested run must drop it. Both true. A `.gitignore` line ending
  in `/` matches directories only, so a symlinked `node_modules` is not ignored: true,
  and it matters only to the test fixture, where real projects hold a directory.

### Found

- The take command's refactor keeps every string and stream; `take-version.test.js` is
  untouched and green.
- The check matches Decisions 1–11. Two departures the handover declared: a take that
  fails in the clone keeps its `take-version:` prefix in the reason (Decision 6 says the
  reason is that text), and *Steps* repeats the changed-file and settings lines so a
  *safe with these steps* verdict always has a Steps section. Both accepted.
- A *not now* from failing checks says "the project's checks failed against the
  release" even when those checks already fail at the version the project holds. The
  criteria ask only for *not now* when the checks fail, so this is not a defect of this
  plan, but the reason can mislead — this harness's own spike reading (49 of 388 red) is
  the case. Routed below.

### Outstanding disposition

- Promote the entry and write this record: done in this commit.
- Fresh squash message without the `Co-authored-by: Cursor` trailers: done at merge.
- A failing-to-load suite named through a string prefix of the clone path, which a
  `/var` versus `/private/var` difference can defeat: dropped. It affects only how one
  line of the report reads, and the suite name still identifies the file.
- Unified-diff context lines indented by `section`, so a rule diff is not a valid patch:
  dropped. The diff is shown to a person, not applied.
- The rule, hook and block cases not asserting the verdict line: dropped. The verdict
  rules are covered by the safe, changed-file, not-now, dropped-rule and breaking cases.
- Developer check by hand (handovers 3 and 4): not needed. The change has no screen; its
  whole output is the text the suite asserts, and Task 5 ran it on a real setup.

### Learnings routed

- The not-now reason above becomes a catalog entry, `version-check-tells-a-red-baseline`,
  added to `main` right after this merge.
- The plan's trap about the linked `node_modules` being ignored was false. It concerns
  only test fixtures that link their tools; not general enough for a rule.
- The plan's not-now fixture assumed a guard read `FRAMEWORK_ROOT` without checking.
  That is the planning rule's existing "verify every claim before dispatching"; nothing
  new to write.

### Merged because

Every criterion has a test that was seen red, the self-check and CI are green on the
head, and the departures from the plan are declared and sound.
