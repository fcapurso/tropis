# Dispatch hands an executor the whole plan — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** an executor started from `/dispatch` gets everything the plan needs before its
first step: the plan's header fields read whole (or the plan refused, naming the line),
a step that attaches every other checkout it must isolate in, and a worktree cut only
from a commit that holds the plan. Three changes: `scripts/plan-binding.js` reads each
header field to the end of its paragraph and refuses one that reads empty; the prompt it
renders tells an executor to attach and clone the other checkouts before isolating; and
`scripts/isolate-for-plan.mjs` refuses a base without the plan and notes one that is not
on the remote's main branch.

**Spec:** the entries `dispatch-refuses-a-blank-header-field`,
`cloud-executor-attaches-every-checkout` and `isolation-refuses-a-base-without-the-plan`
in `feature-catalog.yaml`, bundled as `dispatch-fixes` in
`docs/backlog-board/bands.yaml`. There is no design document; the entries' acceptance
criteria and the decisions below are the design.

**One plan for three entries (decided by the specifying session).** The one-sentence test
passes on "dispatch hands an executor everything the plan needs before its first step":
each part closes one way an executor starts with less than the plan — a cut header, a
missing checkout, a worktree without the plan. Two of them change the same module and
the same test file; three dispatches and reviews for about two hundred lines would cost
more than they separate. A revert of one part is a revert of its lines. The squash body
names each.

**Two entries were re-shaped while planning (2026-11-01, recorded on each entry).**
`dispatch-refuses-a-blank-header-field` said a field whose bold spans the colon is
refused; but bold that runs from the field name through its value and full stop is how this repository's plans write the tier and
merge fields, and the parser already reads that shape for them. Refusing it for
`Requires` alone would refuse the standard shape, so the criterion now reads it like the
other two and refuses only a field that reads empty. Its last criterion said to remove
the entry file's one-line note; the installed release (0.7.1) still reads only the first
line until a release carrying this fix is installed, so the note is reworded to say so,
not removed. `cloud-executor-attaches-every-checkout` now counts the checkouts the plan
isolates in, not every row: a *do not edit* row needs no worktree, and the isolation
helper does not look for it.

**What the specifying session verified on 2026-11-01, against `main` at `cad7c17`, with
git 2.49.0 and Node v22.15.0 in Claude Code 2.1.300 on Darwin arm64:**

- **The header parser.** `parseExecutionProtocol` in `scripts/plan-binding.js` reads
  `Model tier` and `Merge authority` with two regexes, `\*\*<name>:\*\*\s*([^*]+?)\.\s`
  and `\*\*<name>:\s*([^*]+?)\.\*\*`, falling back to `''`, and `Requires` with
  `\*\*Requires:\*\*\s*(.+)` — one line only, and nothing when the bold spans the colon. Nothing
  refuses an empty value. `renderThinPrompt` prints them on its first line as
  Tier, Requires and Merge, each name in bold, separated by middle dots. `dispatch.mjs` calls
  `validateDispatchable` (exits 1 printing its `errors`, one per line, and nothing on
  stdout) and then `parseExecutionProtocol`. `isolate-for-plan.mjs` also calls
  `validateDispatchable`; `guards/plan-dispatchable.test.js` calls it on every plan with
  a `## Repositories` heading and no handover report.
- **The prompt.** `renderThinPrompt` prints the isolate line
  (`bash .tropis/scripts/isolate-for-plan.sh <plan>`), the setup steps, the raw commands
  "Do not run them yourself", and, for more than one execute-here row, "Verify in EACH
  execute-here checkout". Nothing tells an executor to attach or clone a sibling.
  `dispatch.mjs` resolves a row's directory with `checkoutName` and compares it with
  `basename(root)`, as `isolate-for-plan.mjs` does with `basename(repoRoot)`.
- **The isolation helper.** `isolate-for-plan.mjs` reads the plan from the working tree
  (`resolve(repoRoot, planArg)`; `guards/dispatch.test.js` runs it from `src/` with a
  root-relative path), resolves every row to a checkout before creating anything, prints
  `mainStatus(repoRoot).line`, then runs each row's command with `shell: true` in its
  checkout. Nothing checks the plan is in the commit a worktree is cut from. The
  isolation commands in this repository's plans end with `origin/main`; the ones in
  `guards/dispatch.test.js` give no start point, so they branch from `HEAD`.
- **The tests.** `guards/dispatch.test.js` builds a throwaway project (`project()`), with
  the plan committed in its seed commit, and its `plan()` template writes
  the tier as small and the merge authority as parent review, each with the bold spanning
  the colon, and no `Requires`.
  Two isolation tests read stdout by index: `out[0]` is the main-status line and
  `out[1]` starts `isolated in `. Their projects have no fetched `origin/*` ref.
- **The note.** `AGENTS.md` (this repository's entry file) says, under *Gotchas*:
  "**A plan header field must sit on one line.** The dispatch script reads the first
  line of `Requires:` and the other header fields, and drops the rest without saying
  so." No source file under `rules/`, `framework/`, `commands/` or `templates/` says
  so.
- **Documents that describe the prompt and the refusals.** `framework/dispatch.md`
  (*What the prompt carries*, *Handing over in chat*) and `commands/dispatch.md` list
  what the prompt carries and the problems a refusal names.
- **Review records read.** None exist for these entries. The record of
  `docs/superpowers/plans/2026-11-01-rule-text-says-what-is-true.md` found that the
  isolation command must run from the primary checkout; the Traps say so. Its
  fresh-agent check ran as `claude -p --output-format stream-json --verbose` with a
  scoped `--allowedTools` list; a bypass-permissions flag was refused.
- **A fresh-agent check is owed**, because `framework/dispatch.md` and
  `commands/dispatch.md` change and the prompt changes what an executor is told
  (Task 5). The user-level instructions on the specifying session's machine say nothing
  about attaching or cloning checkouts, or about plan headers, so a local probe is a
  real one.

**Model tier: Medium.** Node changes against stated behaviour, with tests to write, red
checks to run and one fresh-agent probe to set up and judge; the decisions are made.

**Merge authority: parent review.** Every later dispatch runs through this code. Stop
after the handover report (Task 7). Do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 5 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

dispatch-refuses-a-blank-header-field
cloud-executor-attaches-every-checkout
isolation-refuses-a-base-without-the-plan

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-dispatch-fixes -b plan/dispatch-hands-over-the-whole-plan origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `.github/` or `CLAUDE.md`.** They
  are the installed release, CI, and this repository's entry pointer. `AGENTS.md`
  changes in one place only, *Decision 4*.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body saying what becomes true.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from.
- **No vendor or tool name in the prompt text** (*Decision 2*).

## Decisions

### 1. Header fields read whole, or refused (`scripts/plan-binding.js`)

- New exported `headerFields(markdown)` returning
  `{ tier, merge, requires }`, each `{ value: string, line: number|null }` — `line` is
  the 1-based line the field starts on, `null` when the plan has no such field.
- A field starts on the first line whose text, after leading spaces, begins with
  `**<Name>` followed directly by `:**`, `**:` or `:` (names: `Model tier`,
  `Merge authority`, `Requires`). Its text is that line and each following line up to,
  not including, the first blank line or line that begins (after spaces) with `**`, the
  lines joined with single spaces and trimmed.
- The value: strip the leading `**<Name>`. If what is left starts with `:**` or `**:`,
  the value is everything after that. Otherwise (it starts with `:`, so the bold spans
  the colon) the value is what follows the `:` up to the next `**`, or the end if there
  is none. Trim it.
- For `Model tier` and `Merge authority` the value is then cut at the first `. ` (a full
  stop followed by a space) and any trailing `.` is dropped, so `**Model tier:** Medium.
  Because …` and `**Model tier: Medium.** Because …` both give `Medium`, as today.
  `Requires` keeps its whole value, trailing full stop included, as today.
- `parseExecutionProtocol` returns
  `{ tier: f.tier.value, merge: f.merge.value, requires: f.requires.value }` from
  `headerFields`, and its regexes go.
- `validateDispatchable` adds one error per field whose `line` is not `null` and whose
  `value` is `''`:
  `Header field "<Name>" on line <line> reads empty: write it as **<Name>:** followed by its value`.
  So dispatch, the isolation helper and the plan check all refuse it. A missing field is
  not refused (no criterion asks for it).

### 2. The attach step in the prompt (`scripts/plan-binding.js`, `scripts/dispatch.mjs`)

- `renderThinPrompt` takes a new option `here` (the checkout's directory name);
  `dispatch.mjs` passes `basename(root)`.
- When the plan has more than one row with an isolation command, the prompt prints,
  directly above the `Isolate (from the Repositories table)…` line, followed by a blank
  line:

  ```
  Before isolating: this session may have started with only this checkout, as a cloud session does. For each checkout below that is not already beside this one, attach it with your tool for adding a repository to the session, where you have one, and clone it beside this one under exactly this directory name:
    - <name>
  ```

  one `  - <name>` line per row with an isolation command whose `checkoutName` is not
  `here`, in table order.
- One row with an isolation command (do-not-edit rows not counted): no such lines.

### 3. Isolation checks its base (`scripts/plan-binding.js`, `scripts/isolate-for-plan.mjs`)

- New exported pure `isolationBase(isolation)` in `plan-binding.js`: split the command on
  whitespace, drop the leading `git worktree add`; walk the rest, skipping `-b`, `-B` and
  `--reason` with the token after each, and any other token starting with `-`; of the
  remaining tokens the first is the path and the second, if any, the start point.
  Returns the start point, or `'HEAD'` when there is none.
- In `isolate-for-plan.mjs`, after every row is resolved and before the main-status
  line, for each target whose `cwd` is `repoRoot` (the checkout holding the plan; other
  checkouts are not checked), with `plan` being the plan's path relative to `repoRoot`:
  - `git rev-parse --verify --quiet <start>^{commit}` in `repoRoot`. If it fails, write
    `refusing to isolate: <start> is not a commit in <checkout>. Nothing was created.`
    to stderr and exit 1. `<checkout>` is `checkoutName(row.checkout)`.
  - `git cat-file -e <commit>:<plan>`. If it fails, write
    `refusing to isolate: <plan> is not committed in <short> (<start>), the commit <checkout> would branch from. Commit the plan and push it to that base first. Nothing was created.`
    to stderr and exit 1. `<short>` is the first 7 characters of the commit.
  - The remote's main branch is `refs/remotes/origin/HEAD` when it resolves, else
    `refs/remotes/origin/main` when that does, else none, and then nothing is said: the
    main-status line already covers a checkout with no origin. When there is one and
    `git merge-base --is-ancestor <commit> <ref>` exits non-zero, remember the line
    `Note: <short> (<start>) is not on <name>, where the plan's review record is read from. Push it there before the review.`
    with `<name>` the ref without `refs/remotes/` (for example `origin/main`).
- Print the main-status line as today, then any remembered notes, then create the
  worktrees as today. A refusal happens before any worktree and before the main-status
  line.

### 4. The entry file's note (`AGENTS.md`)

Replace the *Gotchas* bullet quoted in the preamble with exactly:

```markdown
- **A plan header field must sit on one line, until a release after 0.7.1 is
  installed.** The installed dispatch script reads only the first line of `Requires:`
  and drops the rest without saying so; the source in `scripts/plan-binding.js` reads a
  field to the end of its paragraph and refuses one that reads empty.
```

### 5. The documents (`framework/dispatch.md`, `commands/dispatch.md`)

- `framework/dispatch.md`, *What the prompt carries*: in the dispatch-header bullet, add
  after its first sentence: "Each field is read to the end of its paragraph, and a field
  that is there but reads empty stops the dispatch, naming its line." Add a bullet before
  **Isolation:** — "**Attaching the other checkouts:** when the plan isolates in more than
  one checkout, a step before isolating tells an executor whose session started with
  only this one — a cloud session does — to attach and clone each other checkout beside
  it under the directory name the table gives." In the **Isolation:** bullet, add after
  its first sentence: "It refuses to cut a worktree of this checkout from a commit that
  does not hold the plan, and notes one that is not on the remote's main branch."
- `framework/dispatch.md`, *Handing over in chat*, and `commands/dispatch.md`: in the
  list of problems a refusal names, add "a header field that reads empty" after "a
  missing heading".

### 6. The tests (`guards/dispatch.test.js`)

`plan()` gains an optional second argument, extra header text placed after the merge
line (a blank line before it), so the existing calls are unchanged. New tests:

- **dispatch command** — *reads a wrapped Requires field whole*: the field
  `**Requires:** the developer at the\napplication for Task 4.`; the prompt contains
  `**Requires:** the developer at the application for Task 4.`
- *reads a Requires field whose bold spans the colon*: `**Requires: the developer for
  Task 4.**`; the prompt contains `**Requires:** the developer for Task 4.`
- *refuses a header field that reads empty, naming its line*: `**Requires:**` on a line
  of its own; status 1, stdout empty, stderr contains `Header field "Requires" on line `
  and the line number the test computes from the plan text.
- *tells the executor to attach every other checkout it isolates in*: with `BOTH`, stdout
  contains the attach paragraph and `  - example-other`, the paragraph comes before the
  `Isolate (from` line, does not list `example-project`, and the paragraph matches none
  of `/claude|cursor|codex|copilot|github|anthropic|openai/i`.
- *prints no attach step for one checkout*: with `PROJECT_ONLY`, and with
  `PROJECT_ONLY` plus a do-not-edit row (`| other (\`example-other\`) | do not edit | |`),
  stdout does not contain `Before isolating`.
- **isolation helper** — *refuses a base that does not hold the plan, and creates
  nothing*: in a `project()`, write a second plan file (same text, another path) and do
  not commit it; run the helper on it; status 1; stderr contains that path,
  `example-project` and the seed commit's short hash; the worktree does not exist.
- *notes a base that is not on the remote's main branch, and still isolates*: make a bare
  clone of the project beside it, add it as `origin`, `git fetch origin`, then commit a
  change on `main`; run the helper (with the stub `gh` from the red-main test on `PATH`
  if the main-status call needs one); status 0; stdout contains
  `is not on origin/main, where the plan's review record is read from`; the worktree
  exists.
- *isolates a base that holds the plan and is on the remote's main branch, with no note*:
  the same, without the extra commit; status 0; stdout does not contain `Note:`.

The existing test *puts each worktree in the repository its row names* covers the other
checkout not being checked (its second repository holds no plan); say so in the criteria
map.

## Traps

- **Run the isolation command from the primary checkout of the repository**, the one
  whose directory is named `tropis`, after `git fetch origin` there, so
  `../tropis-dispatch-fixes` is a sibling of it and `origin/main` holds this plan. A
  checkout under `.claude/worktrees/` would put the worktree inside the repository.
- **The old parser reads the first match anywhere in the plan**, not the header: the
  first dispatch of this very plan printed a Requires value quoted from its own preamble,
  so the preamble now describes the field shapes in words. The new parser takes the first
  line that *starts* with the field, which a quote inside a sentence does not.
- **The installed dispatch and isolation helper are the old ones.** This plan's own
  header keeps `Requires` on one line for that reason. Test the source through
  `guards/dispatch.test.js`, which copies `scripts/` into its throwaway projects.
- **The self-check reads `HEAD` only.** Commit before each run.
- **A red check needs a throwaway commit.** Make the deliberate defect a commit, run the
  check, record its output, then `git reset --hard HEAD~1`. Never push a throwaway
  commit.
- **The worktree command may appear in this plan only in its Repositories table.** The
  tests build theirs from parts (`const W = 'worktree'`); keep it that way, and do not
  quote an isolation command in the handover report — name the row instead.
- **Do not put a colon followed by a space, or a space followed by a hash, inside an
  unquoted YAML value** in the catalog.
- **The probe must not touch this repository.** It runs in a scratch folder under
  `$TMPDIR`; delete it afterwards.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | *Decisions 1, 2 and 3* |
| `scripts/dispatch.mjs` | *Decision 2*, passes `here` |
| `scripts/isolate-for-plan.mjs` | *Decision 3* |
| `guards/dispatch.test.js` | *Decision 6* |
| `framework/dispatch.md` | *Decision 5* |
| `commands/dispatch.md` | *Decision 5* |
| `AGENTS.md` | *Decision 4* |
| `feature-catalog.yaml` | the three entries to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/superpowers/plans/2026-11-01-dispatch-hands-over-the-whole-plan.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table, and the first Trap). In the worktree run
`npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints nothing),
then `bash scripts/check-blueprint.sh` (passes when its last line starts `Self-check
passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `uname -sm`, your tool and version, and the commit you started from.

To run one guard on committed content outside the self-check (used below), tried on
`9180850`:

```bash
S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
echo '{"type":"module"}' > "$S/package.json"
cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
(cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/dispatch.test.js); rm -rf "$S"
```

### Task 1 — Header fields (Decision 1, its tests)

Write the three header tests of *Decision 6* and commit; run `guards/dispatch.test.js`
with the snippet and record that exactly those three fail. Apply *Decision 1*, commit,
run again: passes when Jest reports every test passed. Then run
`guards/plan-dispatchable.test.js` the same way: passes when every test passed (every
plan in the repository still reads, and none reads empty).

**Red check:** as a throwaway commit, restore the old `parseExecutionProtocol` (the
three regexes) and remove the new error from `validateDispatchable`; run
`guards/dispatch.test.js`; record that the three header tests fail by name. Reset.

### Task 2 — The attach step (Decision 2, its tests)

Write the two prompt tests and commit; record that the attach test fails. Apply
*Decision 2*, commit, run again: every test passed.

**Red check:** as a throwaway commit, delete the attach lines from `renderThinPrompt`;
record that the attach test fails by name. Reset.

### Task 3 — The base check (Decision 3, its tests)

Write the three isolation tests and commit; record which fail (the refusal and the note
should; the unchanged case should pass). Apply *Decision 3*, commit, run again: every
test passed.

**Red check:** as a throwaway commit, delete the `cat-file` refusal and the note; record
that the refusal and note tests fail by name. Reset.

### Task 4 — Documents and note (Decisions 4 and 5)

Apply both, commit. Checks:

```bash
grep -n "must sit on one line" AGENTS.md
grep -n "reads empty" framework/dispatch.md commands/dispatch.md
grep -n "Attaching the other checkouts" framework/dispatch.md
```

The first passes when it prints the new bullet's first line only; the second when it
prints at least one line in each file; the third when it prints one line.

### Task 5 — The fresh-agent check

One probe, in a scratch folder `$P` under `$TMPDIR`, built from this branch's committed
source:

- `$P/remotes/example-other.git`: a bare repository with one commit holding a README.
- `$P/example-project`: a git repository laid out as `project()` in
  `guards/dispatch.test.js` lays one out (the scripts listed in
  `scripts/installed-scripts.txt` copied into `.tropis/scripts/`, `.tropis/package.json`
  as `{"type":"module"}`), with a plan at `docs/superpowers/plans/2026-01-01-probe.md`,
  committed, whose Repositories table has `example-project` (execute here) and
  `example-other` (execute here too), each with a sibling isolation command; whose
  header has `**Model tier: small.**`, `**Merge authority: parent review.**` and a
  `**Requires:**` field wrapped over two lines ("the developer at the application for
  Task 2, and a network connection for the clone in Task 1."); and whose Global
  Constraints say: "example-other's remote is ../remotes/example-other.git."
- No `$P/example-other`.

Print the prompt with `node .tropis/scripts/dispatch.mjs docs/superpowers/plans/2026-01-01-probe.md`
in `$P/example-project`, and pipe to a fresh agent there with its tool calls visible
(for Claude Code, `claude -p --output-format stream-json --verbose`, with a scoped
`--allowedTools` list that lets it read and run git, node and bash): "This is a probe; its output will be
discarded. You are the executor of the plan below, in a session that has only this
checkout. Follow this kick-off prompt up to and including isolation, then stop. Report
what the plan requires and what you did before isolating." followed by the printed
prompt. Save the stream outside the repository.

**Passes when** all of: the stream shows a `git clone` of the bare repository into
`$P/example-other` before the isolate call; the isolate call exits 0 and both worktrees
exist; and the agent's final message gives the whole Requires text, both halves. Record
each with the lines of the stream that show it, the tool and version, and the platform.
If it fails, change the attach paragraph's wording within *Decision 2*'s intent, run the
probe again, and record both runs. Delete `$P`.

### Task 6 — The full suite, the criteria, the catalog

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

For each acceptance criterion of the three entries, name the test or recorded check that
covers it, and check that the named test runs what the criterion describes; put the table
in the handover. A criterion with neither: say so and do not ship that entry.

In `feature-catalog.yaml`, on each of the three entries: set `status: shipped`; set
`modules` to the files of *File Structure* that entry's decisions touch (catalog, plan and
`AGENTS.md` excluded); and directly above its `- id:` line, below the comments already
there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-dispatch-hands-over-the-whole-plan.md; each
# criterion's test or check is in that plan's handover report.
```

Leave `docs/backlog-board/bands.yaml` alone. Commit, then re-run the two commands above
and `git diff --stat origin/main...HEAD` (passes: only the *File Structure* files).

### Task 7 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*), each check's command with its actual
output, the criteria table, the probe's result, and the worktree path used. Commit and
push the branch, open a pull request against `main` whose body says what becomes true
and links this plan, and stop. Do not write a review record and do not merge.
