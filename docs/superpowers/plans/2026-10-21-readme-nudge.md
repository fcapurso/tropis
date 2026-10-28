# /next and the board say when the README has probably fallen behind — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** in a project that keeps its README with Tropis (`writes` or `suggests`), `/next`
and the backlog board say when the README was last refreshed and name the product features
and improvements shipped since, and say nothing when there are none.

**Spec:** `docs/superpowers/specs/2026-10-20-readme-stays-current-design.md` (*The nudge*),
and the merged plan `2026-10-20-refresh-readme-command.md` (Decision 1, the settings file).
This is plan 3 of 4 for `product-readme-is-kept-current`; plans 2 (the fact check) and 4
(the `/release` step) run at the same time on their own branches. **This plan delivers
nothing;** the reviewing session ships the entry when the last of the three merges.

**What the specifying session verified on 2026-10-21, at `main` after PR fcapurso/tropis#112:**

- `docs/readme/readme.yaml` holds `level` (`writes`, `suggests`, `manual`) and
  `refreshedAt`, a commit hash or `""`. No file, or another level, means the nudge is off.
- `scripts/next.mjs` prints the report: `Next step`, `Building`, `Ready to start`,
  `Blocked`, then optional sections (the retired-layer note, the upstream queue, `Arcs under
  way`), then the idea and shelf counts. It resolves the root as `resolve(here, '../..')`
  and imports from `./next-work.js` and `./board-bands.js`.
- `scripts/build-backlog-board.mjs` fills `templates/backlog-board.html` by replacing
  placeholders (`__TITLE__`, `__OPEN__`, `__SHIPPED__`, `__ASOF__`, …; the header block
  around line 200 shows `<b>__OPEN__</b> open · <b>__SHIPPED__</b> shipped` and
  `<div id="asof">built __ASOF__</div>`), writes the page, and prints its path.
- **Tests stage these scripts by an explicit file list:** `guards/next-report.test.js`
  copies `next.mjs`, `next-work.js`, `board-bands.js` into a temporary `.tropis/scripts/`
  (`stageReport`); `guards/backlog-board.test.js` (line 72) copies
  `build-backlog-board.mjs`, `next-work.js`, `board-bands.js`. A new module both scripts
  import must be added to both lists, or both tests fail on a missing import.
- Shipped modules are listed in `scripts/installed-scripts.txt`.
- Catalog entries carry `status`, `layer` (`product`, `framework`) and `type` (`feature`,
  `improvement`, `bug`, `chore`, `spike`). The design counts only `layer: product` entries of
  type `feature` or `improvement`.

**Model tier: Small–medium.**

**Requires:** nothing beyond the repository.

**Merge authority: parent review.**

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-readme-nudge -b plan/readme-nudge` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md` or `README.md`.**
- **Do not edit `commands/refresh-readme.md`, `commands/release.md`, `scripts/set-up-project.sh`
  or any guard other than the two named here.** Plans 2 and 4 own them.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-21. Do not reopen them.

1. **`scripts/readme-freshness.js`**, a pure module, added to `scripts/installed-scripts.txt`:

   ```js
   /**
    * One line saying the README has probably fallen behind, or null when there is nothing
    * to say. Counts shipped entries of layer product and type feature or improvement.
    * @param {object} a
    * @param {string|null} a.level        level from docs/readme/readme.yaml; null when absent
    * @param {string} a.refreshedAt       commit hash, or '' when never refreshed
    * @param {Array<object>} a.catalogNow the current catalog
    * @param {Array<object>|null} a.catalogThen the catalog at refreshedAt; null when it
    *                                     cannot be read (unknown commit, no file there)
    * @param {string|null} a.refreshedOn  YYYY-MM-DD of that commit, or null
    * @param {string} a.today             YYYY-MM-DD
    * @returns {string|null}
    */
   export function readmeFreshness(a)
   ```

   Exactly these results, with `<ids>` the entry ids joined by `, ` in catalog order:
   - level not `writes` or `suggests` → `null`
   - `refreshedAt` empty, none shipped → `null`
   - `refreshedAt` empty, N shipped → `README not refreshed yet; N shipped features and improvements: <ids>. Run /refresh-readme.`
   - `refreshedAt` set, `catalogThen` null → `README refresh point <first 7 of refreshedAt> not found. Run /refresh-readme.`
   - set and readable, none shipped since → `null`
   - set and readable, N shipped since (shipped now, not shipped then) → `README last refreshed <refreshedOn> (<D> days ago); N shipped since: <ids>. Run /refresh-readme.`

   With N = 1 write `1 shipped feature or improvement:` in the first case and keep
   `1 shipped since:` in the last. D is whole days between `refreshedOn` and `today`.

2. **Reading the facts**, in a second exported function in the same module, not pure:
   `export function readmeFreshnessAt(root, catalogNow, today)` reads
   `docs/readme/readme.yaml` (absent → level null), and for a set `refreshedAt` runs
   `git -C <root> show <refreshedAt>:feature-catalog.yaml` and
   `git -C <root> log -1 --format=%cs <refreshedAt>` with `spawnSync`; a non-zero exit gives
   `catalogThen` null and `refreshedOn` null. It returns `readmeFreshness(…)`.

3. **`scripts/next.mjs`.** After the `Blocked` section and before the retired-layer note,
   when `readmeFreshnessAt(root, catalog, today)` is not null, print an empty line, `README`,
   and the line indented two spaces. Print nothing otherwise.

4. **The board.** `scripts/build-backlog-board.mjs` computes the same line and replaces a new
   placeholder `__README__` in `templates/backlog-board.html`, placed directly after the
   `asof` div as `<div id="readme">__README__</div>`, with the line HTML-escaped, or with the
   empty string; the page's own style hides `#readme:empty`. When the line is not null the
   build also prints it after the page path.

5. **Tests.**
   - In a new `guards/readme-freshness.test.js`, one test per result of Decision 1, on plain
     objects, plus: a `bug` and a `framework` entry shipped since are not counted; the
     1-entry wording.
   - `guards/next-report.test.js`: add `readme-freshness.js` to `stageReport`'s copied files;
     add a test that stages a git repository (init, commit a catalog with one `shaped`
     product feature and `docs/readme/readme.yaml` at `writes` with that commit as
     `refreshedAt`, then ship the entry and commit) and asserts the report contains
     `README` and `1 shipped since: <id>`; and one at `manual` asserting the report has no
     `README` section.
   - `guards/backlog-board.test.js`: add `readme-freshness.js` to the copied files, and a test
     that the built page carries the line in `#readme` when one is due and an empty `#readme`
     when not.

6. **Records.** `RELEASES.md`, `## [Unreleased]`, after the last change section:

   ```
   ### /next and the board tell you when your README is behind

   When Tropis keeps your README (`writes` or `suggests`), `/next` and the backlog board say
   when it was last refreshed and name the features and improvements shipped since, so you
   can run `/refresh-readme` before the next release. They say nothing when nothing has
   shipped.
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only; its last line is the verdict. An intermittent red run with no failing test
  named has been seen (backlog `self-check-red-runs-keep-their-output`): run once more and
  report both; change nothing for it. Run nothing else at the same time.
- **Adding an import to `next.mjs` and `build-backlog-board.mjs` changes their import
  surface:** the two staged-file lists above must grow, or those tests fail.
- **`git` in a test needs a user**: pass `-c user.email=t@t -c user.name=t` to the commits.
- Plans 2 and 4 also add sections to `RELEASES.md`. Append at the end and do not rebase; the
  reviewer resolves the order at merge.

## File Structure

| File | Change |
|---|---|
| `scripts/readme-freshness.js` | Decisions 1–2, created |
| `scripts/installed-scripts.txt` | Decision 1 |
| `scripts/next.mjs` | Decision 3 |
| `scripts/build-backlog-board.mjs` | Decision 4 |
| `templates/backlog-board.html` | Decision 4 |
| `guards/readme-freshness.test.js` | Decision 5, created |
| `guards/next-report.test.js` | Decision 5 |
| `guards/backlog-board.test.js` | Decision 5 |
| `RELEASES.md` | Decision 6 |
| `docs/superpowers/plans/2026-10-21-readme-nudge.md` | Handover report only |

## Tasks

### Task 1: The line

Decision 1 and its tests. Commit; self-check green.

### Task 2: Reading the facts, and /next

Decisions 2 and 3, with the `next-report` tests. Commit; self-check green.

### Task 3: The board

Decision 4 and the `backlog-board` test. Commit; self-check green. Build the board once in
this repository (`npm --prefix .tropis run board` reads the installed scripts and will not
show it; instead run `node scripts/build-backlog-board.mjs` from a scratch project set up
from this branch) and paste the printed line, or say it printed none and why.

### Task 4: Records, and a real setup

Decision 6. Commit; self-check green. In a scratch folder outside any repository: `git init`,
run this branch's `scripts/set-up-project.sh`, `npm --prefix .tropis install`, commit, set
`docs/readme/readme.yaml` to `writes` with `refreshedAt` the current commit, ship one product
feature in the catalog, commit, and paste `npm --prefix .tropis run next` and the line
`npm --prefix .tropis run board` prints. Then set `level: manual` and paste `run next` again:
no `README` section. Delete the folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: last line `Self-check passed: …`; project checks green; only files in *File
Structure*. Append `## Handover report` with the six sections the planning rules name,
commit, push, and open a pull request against `main`. Do not merge.

## Criteria this plan advances

`product-readme-is-kept-current`: *at the writes or suggests level, /next and the backlog board
say when the README was last refreshed and name the shipped product features and improvements
since, and say nothing when there are none.*

## Not in this plan

No fresh-agent check: no rule, framework document or command changes; the behaviour is
checked by the tests above.

## Handover report

### Task completion

All five tasks are done. Nothing was merged: merge authority is parent review.

- Task 1, commit `f4a9be9`. The self-check on that commit is the first run under Verification.
- Tasks 2–4 were committed (`44f1531`, `43d773e`, `ab89919`) without a separate self-check each. Sibling plans were already running `bash scripts/check-blueprint.sh`, and the trap says not to run another at the same time. One self-check on `ab89919`, which contains all four commits, is the second run below.
- Task 3 scratch project: set up from this branch, board built, folder deleted. It printed no README line.
- Task 4 scratch project `/tmp/tropis-readme-nudge-real-znt7` (deleted): `/next` and the board named `shown-since`; at `manual`, `/next` had no README section.

### Verification results

Tool: Cursor, this session. Machine: dev-laptop.local, `uname` Darwin arm64, `sw_vers` macOS 26.2 (25C56). Node v22.15.0, npm 11.6.4, git 2.49.0.

**Self-check, first run**, on `f4a9be9`, while other checkouts were also running `bash scripts/check-blueprint.sh`. Conformance printed the usual `caught` lines. Then:

```
Clean baseline: every guard must pass
  FAILED      clean baseline — a guard fails on a project with nothing wrong
```

The re-run that should have printed the failing test name produced none. It sat with `tar -x` as a child of `node scripts/check-version.mjs … --from v0.2.0`, the extract directory not growing, until the run was killed (exit 143). Nothing was changed for it.

**Self-check, second run**, on `ab89919`:

```
Checking ab89919 of ~/src/tropis-readme-nudge

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      stale-picks            doc-currency
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

Framework repository: its own guards must pass here and fail on a planted defect

  caught      operator-page-closeout: framework/workflow.md planted
  caught      operator-page-closeout: PORTABILITY-NOTES.md planted
  caught      readme-usable: README.md planted
  caught      readme-usable: PORTABILITY-NOTES.md planted

Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.
```

Exit 0. Elapsed about 124 seconds.

**`npm --prefix .tropis test`**, on `ab89919`:

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        0.663 s
Ran all test suites.
```

Exit 0. These are the installed release's checks.

**`git diff --stat origin/main...HEAD`**, on `ab89919`, before this handover commit:

```
 RELEASES.md                     |   7 +++
 guards/backlog-board.test.js    |  60 ++++++++++++++++++-
 guards/next-report.test.js      |  68 +++++++++++++++++++--
 guards/readme-freshness.test.js | 128 ++++++++++++++++++++++++++++++++++++++++
 scripts/build-backlog-board.mjs |  16 ++++-
 scripts/installed-scripts.txt   |   1 +
 scripts/next.mjs                |  13 ++++
 scripts/readme-freshness.js     |  96 ++++++++++++++++++++++++++++++
 templates/backlog-board.html    |   2 +
 9 files changed, 385 insertions(+), 6 deletions(-)
```

Focused jest runs while writing, not the self-check: `guards/readme-freshness.test.js` 9 passed; `guards/next-report.test.js` and `guards/readme-freshness.test.js` together 20 passed; `guards/backlog-board.test.js` 13 passed.

**Task 3 board.** Scratch project set up with this branch's `scripts/set-up-project.sh`, then `npm --prefix .tropis install`, then `node .tropis/scripts/build-backlog-board.mjs` (setup installs the script under `.tropis/scripts/`). Output:

```
/private/tmp/tropis-readme-nudge-board-a9wS/docs/backlog-board/index.html
Open it in a browser.
```

No README line. Setup does not write `docs/readme/readme.yaml`, so the level is absent and the nudge is off. The template catalog's `example-stable-id` is a shipped product feature; it was not named because the nudge was off, not because nothing had shipped. Folder deleted.

**Task 4.** Same setup, `npm --prefix .tropis install` (`added 268 packages`), commit `c5d3518feec0ea295d1e6801398bacd897d9dc0c`, `docs/readme/readme.yaml` at `writes` with `refreshedAt` that commit, then a new shipped product feature `shown-since` committed. `npm --prefix .tropis run next`:

```
Building (catalog status)
  (none)

Ready to start
  (none)

Blocked
  (none)

README
  README last refreshed 2026-10-21 (0 days ago); 1 shipped since: shown-since. Run /refresh-readme.

0 idea(s) not yet shaped.
```

`npm --prefix .tropis run board` printed, after the page path:

```
README last refreshed 2026-10-21 (0 days ago); 1 shipped since: shown-since. Run /refresh-readme.
```

After `level: manual`, `npm --prefix .tropis run next` had no `README` section: the report went from `Blocked` to `0 idea(s) not yet shaped.` Folder deleted.

### Scope

The stat above is every file except this plan. This handover commit adds `docs/superpowers/plans/2026-10-21-readme-nudge.md`, which is in the File Structure table. No other path is in the diff.

### Judgment calls

- A commit cannot contain its own hash, so the tests do not put `refreshedAt` inside the commit it names. They commit the shaped catalog, record that hash in a following commit, then ship. `git show <refreshedAt>:feature-catalog.yaml` is the shaped catalog.
- `guards/next-report.test.js` copies the script list in `stageReport` and in three other tests. All four lists include `readme-freshness.js`. The plan named only `stageReport`.
- The day count is always `N days ago`, including `0` and `1`. The plan's sentence uses `days` and only special-cases the shipped-count wording.
- `today` is the local calendar date. On this machine `git log -1 --format=%cs` for the Task 4 commit was `2026-10-21`, and the line said `0 days ago`.
- A git command with a non-zero exit is the "not found" result. A zero exit whose catalog YAML is not an array is treated as an empty catalog, so the pure function is not handed `null` for a commit that did exist.
- "Shipped then" means `status: shipped`, whatever the type and layer were then. An id that was a shipped bug at the refresh point and is a shipped product feature now is not counted as since. No test covers that.
- The board escapes `&`, `<`, `>` and `"` in the line. The board test uses the id `kept&page` and expects `kept&amp;page` in the page.

### What the plan got wrong

- The next-report and board tests cannot, in one commit, store a catalog and a `refreshedAt` equal to that commit's hash. The hash is recorded in the next commit.
- Naming only `stageReport`'s copy list leaves three copies in the same file that fail once `next.mjs` imports the new module.
- In a project set up by `scripts/set-up-project.sh` the builder is `.tropis/scripts/build-backlog-board.mjs`, not `scripts/build-backlog-board.mjs`.
- That same setup writes no `docs/readme/readme.yaml`. Task 3's board therefore prints no line, including when the template catalog already has a shipped product feature.

### Outstanding

- The reviewing session merges. This session does not.
- Plans 2 and 4 also append to `## [Unreleased]` in `RELEASES.md`. This section is after "Keep your README current with /refresh-readme". The reviewer resolves the order at merge.
- `product-readme-is-kept-current` stays unshipped until the last of the three plans merges, as the plan says.
- The first self-check's unnamed clean-baseline failure was not diagnosed past the stuck `tar -x`. `self-check-red-runs-keep-their-output` already records that class of failure. Nothing new was filed.

## Review record

Reviewer: the specifying session, Claude Code desktop (Opus 5.5), on the developer's MacBook Pro,
Darwin 25.2.0.

### Checks re-run

- At `54d4a88`, with no other self-check running: `bash scripts/check-blueprint.sh` →
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.`; `npm --prefix .tropis test` →
  `Tests: 28 passed, 28 total`.
- `guards/next-report.test.js`, `guards/readme-freshness.test.js` and
  `guards/backlog-board.test.js` on a staged working-tree copy: `Tests: 40 passed, 40 total`.
  `guards/next-report.test.js` against the previous `scripts/readme-freshness.js`:
  `Tests: 6 failed, 12 passed, 18 total` — the six new failure-path tests can fail.

### Found

An independent review at `48b97ae` found that the README line read `docs/readme/readme.yaml`
and the catalog at the refresh commit unguarded: a typo or a catalog that did not parse there
crashed `/next` and the board on every run; a refresh point starting with `-` reached git as
an option that wrote files; a tree hash gave "NaN days ago"; an unquoted numeric hash
crashed; a project below the top of its repository always got "not found"; days could go
negative. **Fixed here by the reviewer**, with the developer's approval (`0ff4f75`): an
unreadable settings file is reported in one line; a refresh point that is not a commit hash
naming a commit whose catalog parses is "not found", and nothing else reaches git; each path
has a test. A fresh re-check confirmed all seven fixed and found three small leftovers; two
fixed in `54d4a88` (a `$` in the line garbling the board, SHA-256 hashes rejected), with a
test for the day clamp.

### Outstanding disposition

- `/refresh-readme` does not say to quote the hash it records; an unquoted all-digit hash now
  fails safe as "not found". Moved into the fact-check plan's follow-up, which edits that
  command.
- No test stages a project in a subfolder of its repository; checked by hand by the
  re-check. Dropped as an entry: the `./` path is one line, and a regression shows up as the
  "not found" line, which says what to do.

### Learnings routed

- A report that reads a file anyone can edit must treat it as untrusted input — catch its
  parse, and validate a value before it reaches a command. Already in
  `.claude/rules/harness-scripts.md` in spirit (quiet failures); not rerouted.

### Merged because

The line appears when it should and says nothing otherwise, nothing a project can write in
its settings crashes `/next` or the board or reaches git as anything but a commit, and every
failure path has a test that fails on the previous code.
