# A rule carries its mechanism, and the incident behind it is one pointer away — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** every shipped rule text in `rules/` states each constraint and why it holds,
without retelling the occasion it was learned on. Each incident that leaves a rule moves to
a record that mirrors that rule file, `rules/incidents/<name>.md`, which ships beside the
rules (installed at `.tropis/rules/incidents/`) and is loaded by no tool. The rule keeps a
pointer to it. A guard fails on a pointer that leads nowhere and on a record section no
rule points at. The capture check that `capture-at-write.sh` prints when someone writes a
rule gains a fourth question, *is this mechanism or provenance, and where does the
provenance go*, so the split holds after the migration.

**Spec:** the entry `rules-carry-mechanism-not-provenance` in `feature-catalog.yaml`
(band B in `docs/backlog-board/bands.yaml`), its seven acceptance criteria, and the
comment block above its `- id:` line. There is no design document; the entry and the
decisions below are the design.

**What the specifying session verified on 2026-11-01, against `main` at `c189fd3`:**

- **The rule files.** The next release's shipped rule texts are `rules/catalogs.md`,
  `rules/harness-scripts.md`, `rules/learnings.md`, `rules/planning.md` and
  `rules/tests.md` — five files (the entry's "ten files" counted each with its generated
  copy). `rules/` has no subdirectory. Byte sizes at `c189fd3` (`wc -c`): catalogs 12687,
  harness-scripts 7713, learnings 6172, planning 29271, tests 4620. Do not reuse these
  figures: measure at your own base (Task 5).
- **How the rules ship.** `scripts/set-up-project.sh` copies `rules/*.md` into a
  project's `.tropis/rules/` (line 56) and then runs
  `.tropis/scripts/generate-rules.mjs` (line 147). An update (`scripts/take-version.mjs`)
  builds the new release by running `set-up-project.sh` into a scratch directory
  (line 167), so a change to the setup's copy reaches updates too.
  `scripts/check-conformance.sh` line 97 copies `rules/*.md` the same way for the
  conformance baseline.
- **Nothing reads a subdirectory of the rules folder as a rule.** `generate-rules.mjs`
  lists `.tropis/rules/` with `readdirSync(dir).filter((f) => f.endsWith('.md'))` —
  top level only; `guards/rule-areas.test.js` the same; `.github/scripts/rule-trial.mjs`
  lists `rules/` with a non-recursive `git ls-tree` filtered on `.md`. Claude Code loads
  `.claude/rules/**`, and Cursor `.cursor/rules/`; neither looks in `.tropis/`.
- **The capture check.** `scripts/capture-at-write.sh` prints the text between
  `<!-- capture-check:begin -->` and `<!-- capture-check:end -->` in a project's
  `.claude/commands/capture-learning.md` (source: `commands/capture-learning.md`) when an
  Edit or Write targets `DECISIONS.md`, `.claude/rules/*`, `.claude/rule-additions/*` or
  `.claude/framework/*`. The block opens "Three questions." `rules/learnings.md` line 66
  calls it "the three-question check", and `guards/rule-delivery.test.js` has a case
  named `emits the three-question check for a rule file` (line 879).
- **In this repository** the hook does not fire on the source `rules/`, but
  `.claude/rule-areas.json` puts `rules/**` in the `learnings` area, so the learnings rule
  is what an agent editing a source rule here receives.
- **A clause that now contradicts the change.** `rules/learnings.md`, *A rule that was
  skipped needs evidence, not a second copy*, says to "attach the incident to the rule
  that already exists". After this change the incident goes in the rule's record, with a
  pointer from the rule; that clause is reworded (Decision 5).
- **Guards that read rule text.** `guards/plan-dispatchable.test.js` (line 104) parses the
  example `| Checkout | Role | Isolation |` table in `rules/planning.md`;
  `guards/operator-page-closeout.test.js` reads `rules/planning.md`;
  `guards/absorb-flush.test.js` applies patches to a copy of `rules/planning.md` and
  checks every line is at most 88 columns. `scripts/check-blueprint.sh` runs the
  framework repository's own guards from `FRAMEWORK_GUARDS` (line 102) and plants a
  defect for each with `plant <guard> <file> [line to delete]`; a guard that calls
  `isBlueprintTree` and is missing from that list fails the self-check as `UNLISTED`.
- **The developer's user-level instructions** on the specifying session's machine say
  nothing about rule incidents, provenance or the capture check, so a local fresh-agent
  probe is a real one.

**Model tier: Large.** The split is judgment on every clause: whether removing a sentence
would change what an agent does in a case the rule does not literally cover. Nothing here
can be specified verbatim.

**Merge authority: parent review.** It rewrites every shipped rule, and a mechanism
stripped with its story makes the rules worse in a way no guard sees. Push the branch
after the handover report (Task 7); do not open a pull request, write a review record or
merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt and can show its tool calls and hook replies, for the fresh-agent check in Task 6 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

rules-carry-mechanism-not-provenance

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-rules-carry-mechanism -b plan/rules-carry-mechanism-not-provenance origin/main` |

## Global Constraints

- **Edit the source only.** `rules/`, `commands/`, `scripts/`, `guards/`, `framework/`.
  Never edit `.claude/`, `.tropis/`, `.cursor/` or `CLAUDE.md`: they are the installed
  release.
- **Never run a release or a workflow.** No tag, no push except this plan's branch, no
  pull request. The only agent you start is Task 6's probe.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body saying what becomes true.
- **Rule text stays at most 88 columns a line**, as it is now.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`. An incident moved into a record keeps the
  pseudonyms the rule already used (`first-adopter`, "the project this came from").
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from. `guards/contributing-page.test.js` is the
  model for a framework-repository guard (`isBlueprintTree`, `FRAMEWORK_ROOT`,
  `TROPIS_EXPECT_FRAMEWORK`).

## Decisions

### 1. Where the line falls

The test, from the comment above the entry: **would removing this sentence change what
an agent does in a case the rule does not literally cover?** If yes, it is mechanism and
stays inline. If it only shows that the rule was once needed — who, when, which plan,
how many times, what it cost — it is provenance and moves.

- **Moves:** blockquotes of the form `> This paragraph exists because…`; "Got wrong three
  times…", "Failed once…", "One plan did exactly that…", "This has cost a review round
  more than once"; dated measurement narratives whose figures do not change what to do.
- **Stays:** the constraint, its mechanism (*X causes Y because Z*), its precondition,
  and any measurement table or version list an agent acts on (the hook reply table in
  `harness-scripts.md` stays: it is what an author reads to choose a reply).
  **Temporary-clause markers** (`Temporary — until …`) stay exactly as they are.
- **Stays because the incident is the mechanism:** where the story is the only statement
  of the failure mode. The date-formatting clause in `tests.md` ("never pin it in the
  code only to make a test pass: in one project that changed the date format for every
  user") is one: the occasion teaches that a bad assertion drags production code to meet
  it. Each clause kept for this reason is listed in the record index (Decision 3).
- **Where a story is half mechanism**, rewrite the mechanism as a plain sentence in the
  rule and move the story. Do not delete a sentence whose content goes nowhere: every
  moved sentence lands in a record section, reworded only as much as reading it on its
  own needs.

### 2. The records

- One record per rule file that loses at least one incident: `rules/incidents/<name>.md`,
  `<name>` the rule's file name. It opens with `# Incidents behind rules/<name>.md`, one
  sentence saying it is not delivered to any session and is read on demand from a
  pointer, then one `## <heading>` section per incident, in the order the rule's
  pointers appear. A heading names the incident ("A plan that forbade its own
  regeneration"), not the rule.
- **Pointer, in the rule:** the incident's place, in backticks, as an installed project
  sees it — `` `.tropis/rules/incidents/<name>.md#<slug>` `` — introduced by
  `Incident:` (several pointers: `Incidents:`, each in its own backticks). Usually a
  short parenthesis at the end of the constraint's paragraph or bullet. A pointer in
  `rules/<name>.md` names only `incidents/<name>.md`: the record mirrors the rule file.
- **Slug:** the heading lowercased, every character other than `a-z`, `0-9`, space and
  hyphen dropped, each space replaced by a hyphen. (Close to GitHub's anchors; exact for
  headings written in plain words.)
- **Index:** `rules/incidents/README.md`, not a record. It says what the folder is, the
  pointer form and slug rule, where a project's own incidents go (Decision 4), and has
  two sections:
  - `## Kept inline` — one bullet per clause left inline because its incident is the
    mechanism: the rule file, a quoted phrase of at least six words that appears in that
    clause, and one sentence on why the occasion is the mechanism. The `tests.md`
    date-formatting clause is among them.
  - `## What the split bought` — a table of each rule file's size in bytes and words
    before (your base commit) and after (your last commit before the handover), naming
    both commits. A dated record, not a claim the guard keeps true.

### 3. Shipping the records

`scripts/set-up-project.sh` creates `.tropis/rules/incidents/` and copies
`rules/incidents/*.md` into it, next to the existing copy of `rules/*.md`. Do the same in
`scripts/check-conformance.sh`'s `install_instructions` only if the self-check needs it
(a guard comparing the conformance project with a set-up one); say which in the handover.
Nothing else changes in the install: `.tropis` is already a walked root of
`scripts/installed-files.js`, and an update builds from the setup.

### 4. A project's own incidents

A project's own rule (`.claude/rules/<area>.md`) or addition
(`.claude/rule-additions/<name>.md`) keeps its incidents in
`docs/rule-incidents/<name>.md`, same format and pointer form with that path. The
capture question (Decision 5) says so. Nothing guards it in a project; the guard below
checks only this repository's shipped rules.

### 5. The capture check and the learnings rule

- In `commands/capture-learning.md`, inside the capture-check block: "Three questions."
  becomes "Four questions.", and a **4. Is this mechanism or provenance?** follows
  question 3, in the same shape as the other three (the question, two or three sentences,
  a `> Failed once:` example). It asks of each sentence about to go into a rule whether
  removing it would change what an agent does in a case the rule does not literally
  cover; mechanism goes in the rule; provenance goes in the rule's record —
  `docs/rule-incidents/<name>.md` for a project's own rule or addition, under a heading,
  with a pointer from the rule — and stays inline only when the occasion is itself the
  mechanism. Its `Failed once` example is this entry's own: rule files had grown with
  incident stories that every session paid for and no agent needed once the rule was in
  front of it.
- `rules/learnings.md`: "three-question check" becomes "four-question check".
  *A rule that was skipped needs evidence, not a second copy* keeps its argument (attach
  the evidence to the existing rule, not a second copy elsewhere) and changes where:
  the incident goes in the rule's record, with a pointer from the rule. Add one short
  clause, in the section you judge best, saying a rule clause carries its mechanism, its
  incident lives in the record its pointer names, and the fourth capture question
  decides which is which. This is what an agent editing `rules/**` here receives.
- `scripts/capture-at-write.sh`: its header comment's "three-question" becomes
  "four-question". `guards/rule-delivery.test.js`: rename the case to
  `emits the four-question check for a rule file` and make it assert something only the
  fourth question prints (for instance its `**4.` heading), so the case goes red if the
  question is absent.

### 6. The guard, `guards/rule-incidents.test.js`

A framework-repository guard (skips on a project-shaped tree, fails instead under
`TROPIS_EXPECT_FRAMEWORK`). Over `rules/*.md` and `rules/incidents/*.md`:

1. Every pointer in `rules/<name>.md` names `.tropis/rules/incidents/<name>.md` (its own
   name), the file `rules/incidents/<name>.md` exists, and has a `##` heading whose slug
   is the pointer's.
2. Every `##` section of every record (not `README.md`) is named by at least one pointer
   in its rule.
3. Every record (not `README.md`) has a rule file of the same name.
4. Every `## Kept inline` bullet names an existing rule file, and its quoted phrase
   appears in that file once whitespace runs are collapsed to one space.
5. **Not delivered:** run `scripts/set-up-project.sh` into a temporary directory (as
   `guards/set-up-project.test.js` does). The records are under
   `.tropis/rules/incidents/`; nothing under `.claude/rules/` or `.cursor/rules/` is a
   record or has `incidents` in its name; and no line of any record section's body,
   longer than 40 characters, occurs in any file under `.claude/rules/` or
   `.cursor/rules/`.

Each failure message names the file, the pointer or heading, and what to do (add the
section, point at it, or remove it). Add the guard to `FRAMEWORK_GUARDS` in
`scripts/check-blueprint.sh`, and two plants after the existing ones:
`plant rule-incidents rules/incidents/planning.md` (a record removed: pointers dangle),
and one that deletes a line carrying a pointer from a rule file, chosen once the work
exists (a record section left unpointed). If your split leaves `planning.md` with no
record, plant a record that does exist.

### 7. Decision record and document map

- `framework/DECISIONS.md`: a new entry, numbered **FW-049** (the next free number at
  `c189fd3`; the reviewing session renumbers at landing if it has been taken), in the
  form of its neighbours: rules carry mechanism, incidents live in a mirrored record one
  pointer away that no tool loads; the records ship beside the rules; a project's own go
  in `docs/rule-incidents/`. Rejected: the decision log (a decision records a choice and
  its alternatives, an incident what produced a constraint; mixing them stops the log
  being scannable); deleting the stories (unrecoverable, and they persuade a human
  reading a rule the first time); records only in this repository with pointers as web
  addresses (not one pointer away in an installed project, and a moving target); a
  convention for new rules only (leaves every shipped rule as it is, and the accretion
  resumes). Say the split is judged, not mechanical, and where its judgments are listed.
  Name `/capture-learning` and the guard in plain text where a backticked path would
  trip `framework-integrity` (Trap 1).
- `framework/doc-architecture.md`, table *What goes where*: a row
  `| What produced a rule | Its incident record, one pointer away from the rule, never delivered |`.

## Traps

1. **`framework-integrity` checks backticked paths** under `docs/`, `scripts/`, `.claude/`,
   `src/` and `.github/` in framework documents, commands and rules, against a set-up
   project's layout. `docs/rule-incidents/<name>.md` contains `<`, which the guard skips
   as a placeholder; any concrete `docs/…` path you add that a project does not have
   fails it. `.tropis/…` paths are not checked. Run the self-check.
2. **Guards that read rule text** (verified above): keep the example Repositories table in
   `rules/planning.md` intact and every line at most 88 columns. Run the self-check after
   each rule file, not once at the end.
3. **The plan check refuses the worktree command anywhere in a plan but its Repositories
   table.** Do not quote it in the handover.
4. **`guards/set-up-project.test.js` "records every shipped file at version unknown"** has
   been seen to fail from a checkout and pass in the self-check's export. If it is your
   only failure in `npm --prefix .tropis test`, record it and go on.
5. **Load.** Other sessions run self-checks on this machine; `rule-delivery`
   capture-at-write cases have failed under high load with
   `SyntaxError: Unexpected end of JSON input` and passed on a re-run
   (`capture-at-write-tests-pass-under-load`). If that is the only failure, record the
   load average (`uptime`) and both runs; do not change those tests for it.
6. **The board page.** Committing `feature-catalog.yaml` or `bands.yaml` may make a git
   hook rebuild `docs/backlog-board/index.html`; commit it if it changed, and say so.

## File Structure

| File | Change |
|---|---|
| `rules/catalogs.md`, `rules/harness-scripts.md`, `rules/planning.md`, `rules/tests.md` | Decision 1: incidents out, pointers in |
| `rules/learnings.md` | Decisions 1 and 5 |
| `rules/incidents/<name>.md`, one per rule file that loses an incident | Decision 2, new |
| `rules/incidents/README.md` | Decision 2, new |
| `scripts/set-up-project.sh` | Decision 3 |
| `scripts/check-conformance.sh` | Decision 3, only if needed |
| `commands/capture-learning.md` | Decision 5, inside the capture-check block |
| `scripts/capture-at-write.sh` | Decision 5, header comment only |
| `guards/rule-delivery.test.js` | Decision 5, the one case |
| `guards/rule-incidents.test.js` | Decision 6, new |
| `scripts/check-blueprint.sh` | Decision 6: `FRAMEWORK_GUARDS` and two plants |
| `framework/DECISIONS.md` | Decision 7 |
| `framework/doc-architecture.md` | Decision 7, one table row |
| `feature-catalog.yaml` | Task 5: the entry to shipped |
| `docs/backlog-board/bands.yaml` | Task 5: the entry's row removed |
| `docs/backlog-board/index.html` | Task 5, only if the hook rebuilt it (Trap 6) |
| `docs/superpowers/plans/2026-11-01-rules-carry-mechanism-not-provenance.md` | Task 7: the handover report |

Doc closeout, decided by the specifying session: the decision, the document map row and
the record index are the documents this change owes. No operator-guide change
(`templates/README.md`): it names no capture questions and no rule layout. The README is
not patched (`/refresh-readme`). No upstream queue: this repository is the upstream. A
release-note line is the developer's at `/release`.

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table; run the command from the primary checkout of `tropis`,
the one whose `.git` is a directory, after `git fetch origin`). In the worktree run
`npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints nothing),
then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, re-run once for Trap 5, then stop and hand
back). Record `git --version`, `node --version`, `uname -sm`, `sw_vers -productVersion`
or the system's equivalent, your tool and version, and the commit you started from. Run
`wc -c -w rules/*.md` and keep the output for Task 5.

To run one guard on committed content outside the self-check:

```bash
S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
echo '{"type":"module"}' > "$S/package.json"
cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
(cd "$S" && FRAMEWORK_ROOT="$S" TROPIS_EXPECT_FRAMEWORK=1 node --experimental-vm-modules node_modules/.bin/jest guards/rule-incidents.test.js); rm -rf "$S"
```

### Task 1 — The guard first (Decision 6)

Write `guards/rule-incidents.test.js`, add it to `FRAMEWORK_GUARDS` (not the plants yet),
commit, run the snippet. Against the repository as it is, with no pointers and no
records, checks 1–3 pass vacuously and check 4 fails naming the missing
`rules/incidents/README.md`. Record that output. Then create the index with its opening
and its two sections empty, commit, and run the snippet again (passes: no failed test).
The plants in Task 3 are what show checks 1 and 2 can fail.

### Task 2 — The split, one rule file at a time (Decisions 1, 2)

In this order: `tests.md`, `harness-scripts.md`, `catalogs.md`, `learnings.md`,
`planning.md`. For each: move each incident to its record with a pointer, list each
kept-inline clause in the index, commit (body: what moved and what stayed inline, in a
sentence each), and run the snippet (passes: no failed test) and
`bash scripts/check-blueprint.sh` (passes: last line starts `Self-check passed`). A
failure in this plan's files: fix and re-run. In `learnings.md` make Decision 5's edits
at the same time.

Before committing each file, read the rule from top to bottom as an agent that has just
been handed it, and check each constraint still says what it forbids and why that
holds. If a constraint now reads as an unexplained prohibition, put its mechanism back in
words of the rule's own.

### Task 3 — Shipping and the delivery check (Decisions 3, 6)

Change `scripts/set-up-project.sh`. Run the snippet: check 5 passes. Re-break it: a
throwaway commit that has the setup copy the records into `.claude/rules/incidents/`
instead; the snippet must fail on check 5; drop the commit. Add the two plants to
`scripts/check-blueprint.sh`; run it: passes when both plant lines print `caught` and the
last line starts `Self-check passed`.

### Task 4 — The capture check (Decision 5)

Edit `commands/capture-learning.md`, `scripts/capture-at-write.sh` and
`guards/rule-delivery.test.js`. Re-break: a throwaway commit removing the fourth
question from the block; the renamed `rule-delivery` case must fail; drop it. Then
Decision 7's two documents. Do not commit Task 4's files yet: Task 6's result goes in
that commit's body.

### Task 5 — Full suite, criteria, sizes, catalog and band

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: no failed suite (Trap 4 aside)
```

Fill `## What the split bought` from Task 0's `wc` output and a fresh one.

For each of the entry's seven acceptance criteria name the test, check or text that
covers it; put the table in the handover. Expected: 1 — Task 2's read-through and the
review; 2 — guard checks 1 and 3; 3 — guard checks 1 and 2 and both plants; 4 — guard
check 5 and its re-break; 5 — the fourth question, the `rule-delivery` case and the
probe; 6 — `## Kept inline` and guard check 4; 7 — `## What the split bought`.

In `feature-catalog.yaml`, on `rules-carry-mechanism-not-provenance`: `status: shipped`;
`modules`: `guards/rule-incidents.test.js`, `rules/incidents/README.md`,
`commands/capture-learning.md`, `scripts/set-up-project.sh`; `refs`: this plan's path;
and directly above its `- id:` line, below the comments already there:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-rules-carry-mechanism-not-provenance.md;
# each criterion's test or check is in that plan's handover report.
```

In `docs/backlog-board/bands.yaml`, delete the whole
`rules-carry-mechanism-not-provenance:` block. Commit (Trap 6), re-run both commands,
and `git diff --stat origin/main...HEAD` (passes: only *File Structure* files).

### Task 6 — The fresh-agent check

The change alters what an agent is told when it writes a rule. Probe it with a fresh
session in a scratch clone set up as a project would receive this release:

```bash
P="$(mktemp -d)"; git clone -q "$PWD" "$P/tropis"; cd "$P/tropis"
git remote remove origin
cp rules/*.md .tropis/rules/; mkdir -p .tropis/rules/incidents; cp rules/incidents/*.md .tropis/rules/incidents/
cp commands/capture-learning.md .claude/commands/
cp scripts/capture-at-write.sh .tropis/hooks/
node .tropis/scripts/generate-rules.mjs
```

From `$P/tropis`, pipe this prompt to the fresh session, with Read, Grep, Glob, Edit and
Write allowed and tool calls and hook replies visible:

> This is a probe; its output is discarded. This project has learned something, and it
> must become a project addition to the shipped tests rule, in
> `.claude/rule-additions/tests.md`. What was learned: a test that
> reads the system clock to compute an expected date fails on the one day a year the
> clock crosses a daylight-saving change, because the expected and actual values are
> computed an hour apart; so a test fixes the clock and builds both from it. How it was
> learned: on 2026-03-29 the nightly run of a project called `orchard` went red for one
> night, three people spent a morning on it, and it passed again the next night. Write the
> addition and anything else the project's conventions say should go with it.

**Passes when** the tool calls show: the capture check reaching the agent with the
fourth question when it writes under `.claude/`; `.claude/rule-additions/tests.md`
holding the mechanism (the clock, the hour apart, fix the clock) without the date, the
project name or the morning; `docs/rule-incidents/tests.md` holding that story under a
`##` heading; and a pointer of Decision 2's form from the addition to that heading. Any
other result: the fourth question or the learnings clause is not finished; reword,
re-run, and record each run. Delete `$P` afterwards. Commit Task 4's files with a body
saying what becomes true and, in one or two sentences, what the probe was asked, what it
did, and the tool, version, operating system and architecture (never the computer's
name).

### Task 7 — Handover report, then push and stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (Task completion, Verification results, Scope, Judgment calls, What the plan got
wrong, Outstanding): each check's command with its actual output, each re-break's failing
test names, the criteria table, the probe's calls (quoted where they decide the pass),
the worktree path used, and under *Judgment calls* every clause you were unsure about and
which side you put it on. Commit and push the branch
(`git push -u origin plan/rules-carry-mechanism-not-provenance`) and stop. Do not open a
pull request, write a review record or merge.
