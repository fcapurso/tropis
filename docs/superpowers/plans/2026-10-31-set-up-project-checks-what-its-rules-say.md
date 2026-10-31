# A set-up project's own checks enforce what its rules say they enforce — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions*, *Running beside two other plans* and *Traps*. Nothing in it
> stops for the developer. Task 8 is a fresh-agent check you dispatch yourself.

**Goal:** a project set up with Tropis runs, in `npm --prefix .tropis test`, the checks
its shipped rules already claim it runs: the catalog invariants the catalog rule states;
a reference check and a document-currency check on its pages; the checks on plans,
review records and delivered entries; a rule-claims check with temporary clauses that
retire with their fix; and a check that an executed flush drained the queue. A freshly
set-up project passes all of them, and a self-check test proves it, so a later change
that would leave a new project red fails here first.

**One thing becomes true:** a set-up project's own checks enforce what its rules say
they enforce. The five entries are one bundle (`set-up-project-checks` in
`docs/backlog-board/bands.yaml`) because each is a check Tropis states or runs on itself
and does not install; they share the setup's install list, the fixture tree and one new
self-check test, and split apart they would each edit the same lines in turn.

**Spec:** the five entries in `feature-catalog.yaml`, with the comments above them:
`set-up-project-checks-its-catalog`, `set-up-project-checks-its-pages`,
`set-up-project-checks-its-plans` (shaped by the specifying session on 2026-10-31, in the
commit that adds this plan), `rule-claims-are-held-true` and
`flush-is-seen-to-drain-the-queue`. Their bands are in
`docs/backlog-board/bands.yaml`, all band B. There is no design document; the decisions
below are the design. The last two plans executed here (2026-10-31, *a branch
environment can never be a permanent one*, and *an update keeps the entry instructions
behind a symlink*) were read for their handover and review records; what they got wrong
is in *Traps*.

**What the specifying session verified on 2026-10-31, against `main` at `243c1b8` (the plan check and the two sibling plans re-checked at `d63adce`),
with git 2.50, Node v22, Jest 30, on macOS (Darwin 25.2.0), arm64:**

- **What setup installs today.** `scripts/set-up-project.sh` lines 71–75 copy five
  guards — `catalog-entries`, `rule-areas`, `rules-generated`, `installed-files`,
  `entry-file` — and `templates/project-layout.test.js` into `.tropis/guards/`. The jest
  config a project gets (`templates/framework-jest.config.js`) runs everything under
  `.tropis/guards/`. `guards/set-up-project.test.js` lists every installed path (lines
  95–131) and the files that may carry a project-owned block (lines 244–252).
- **Every file under `.tropis/` is fingerprinted** (`SHIPPED_ROOTS` in
  `scripts/installed-files.js`), except `.tropis/README.md`, `installed.json`,
  `package-lock.json` and `node_modules`. The fingerprint drops the inner lines of each
  project-owned block, and `scripts/take-version.mjs` (`carryBlocks`, around line 508)
  carries a project's block contents into the next release for any shipped file. So a
  shipped `.js` file can hold a block the project fills in.
- **The five checks this plan installs, run against a freshly set-up project** (setup
  run into a new `git init` folder, the guard files copied into its `.tropis/guards/`,
  `FRAMEWORK_ROOT` pointed at it):
  - `framework-integrity` fails with 10 dangling references: `docs/architecture.md`
    (named by `rules/planning.md` and by `templates/AGENTS.md`),
    `docs/BLUEPRINT-UPSTREAM.md` (`commands/capture-learning.md`,
    `commands/flush-upstream.md`), `docs/project-brief.md` (four times in
    `commands/scope.md`), `docs/playbooks/test-strategy.md` (`templates/AGENTS.md`).
    Each is a file a project writes later or never; none is the setup's to create.
    The generated backlog board (`docs/backlog-board/index.html`) is named nowhere in
    backticks, so it did not appear.
  - `review-record` throws `ENOENT` on all three tests: `docs/superpowers/plans/` does
    not exist in a fresh project.
  - `plan-dispatchable` fails `finds the plans directory` for the same reason.
  - `doc-currency` and `catalog-drift` pass.
- **The same five checks run against this repository** (`FRAMEWORK_ROOT` at the
  repository root):
  - `framework-integrity` fails with 6: the same `docs/architecture.md`,
    `docs/BLUEPRINT-UPSTREAM.md` and `docs/project-brief.md` references from the
    installed release.
  - `plan-dispatchable` failed, at `243c1b8`, on
    `docs/superpowers/plans/2026-10-31-branch-slot-never-touches-a-permanent-environment.md`:
    its handover report quoted the plan's own worktree command, wrapped across two
    lines, which the scan reads as a worktree command outside the Repositories table.
    At `d63adce` that handover was reworded by hand to avoid the command, and the guard
    passes (68 tests). So a merged plan's history was rewritten to satisfy a check
    that should not have judged it — the evidence for *Decision 3*.
  - `review-record`, `catalog-drift`, `doc-currency` pass.
  - This matters because this repository takes its own next release: whatever this
    plan installs runs here at the next `/update`.
- **The catalog invariants, run against this repository's `feature-catalog.yaml`** (109
  entries): no duplicate id, no cycle, no shipped entry with `blockedBy` (no entry
  carries `blockedBy` at all), no superseded entry shipped, no bad `shelved`, no spike
  with modules, every shipped module path exists. **Five `after` ids name entries that
  are not in this catalog**: `blueprint-tool-agnostic-name` → `blueprint-readme-usable`;
  `cursor-agents-receive-area-rules` → `rules-load-only-for-their-area`;
  `rule-tooling-spike` → `rules-load-only-for-their-area`;
  `rule-areas-are-project-data` → `framework-claims-are-measured` and
  `blueprint-hooks-reach-the-agent`. All four ids are entries of the first adopter's
  catalog, from before the framework moved here (the comments around lines 410–550 and
  `docs/superpowers/plans/2026-10-21-readme-rescue.md` line 31 say so).
  `supersededBy` is a list where present; `after` is a list.
- **A project's framework checks job cannot see `origin/main` today.**
  `templates/github/tropis-framework-checks.yml` checks out with `actions/checkout@v7`
  and no `fetch-depth`, so a shallow single-ref clone. `review-record` and
  `catalog-drift` call `git show origin/main:docs/superpowers/plans/<name>`, and fail
  closed when it cannot be read: every plan with a handover is then judged as already on
  `main`, so an executing branch is red from its handover until its review record —
  the exemption both guards carry would never apply on a pull request.
  `templates/github/tropis-pipeline.yml` and `tropis-candidate.yml` already use
  `fetch-depth: 0` for their own checkouts.
- **`guards/set-up-project.test.js` 'asks for no edit on adoption outside a block'**
  refuses `/on adoption/i` outside a block in every shipped file.
  `guards/framework-integrity.test.js` carries "ADOPTING THIS" and "SET ON ADOPTION" in
  comments, so installing it as it stands turns that test red.
- `templates/rule-claims.test.js` has no test in it (only a template comment, imports
  and a helper), so Jest refuses it as a suite with no tests if installed as is; its
  `root` is `resolve(here, '../../..')`. Nothing installs it. `PORTABILITY-NOTES.md`
  lines 237 and 253 record, as history of a 2026 flush, that it shipped as a template.
- `review-record`, `plan-dispatchable` and `doc-currency` default `root` to
  `resolve(here, '../../..')`; `catalog-drift` to `resolve(here, '..')`;
  `catalog-entries` to `resolve(here, '../..')`. Installed at `.tropis/guards/`, the
  root is two levels up. Every guard honours `FRAMEWORK_ROOT` first, which is how the
  self-check points them at the fixture tree.
- `scripts/check-conformance.sh` composes `fixtures/base/`, overlays one
  `fixtures/defects/<name>/` and requires the named guard (a Jest path fragment) to
  fail, then runs every `guards/*.test.js` against the clean base. `framework-integrity`
  has no planted defect today. `fixtures/base/docs/` already carries
  `BLUEPRINT-UPSTREAM.md` (`Last flushed: 2026-01-01.`), `architecture.md`,
  `project-brief.md` and `playbooks/`, and one plan,
  `docs/superpowers/plans/2026-01-01-example-plan.md`, with a handover and a review
  record. `fixtures/base/feature-catalog.yaml` has one shipped entry, `example-entry`,
  whose module is `CLAUDE.md`.
- `commands/flush-upstream.md` (around line 97) gives the drain task: remove submitted
  and declined entries, keep held ones, set `Last flushed` to the flush date.
  `scripts/next.mjs` line 156 reads it as `/Last flushed:\s*(\d{4}-\d{2}-\d{2})/`.
- `rules/planning.md` names `guards/plan-dispatchable.test.js` (line 137),
  `guards/doc-currency.test.js` (line 132) and `review-record.test.js` (line 331) as
  checks that run; in a set-up project none of them does today. `rules/catalogs.md`
  (lines 90–92) says the catalog check rejects a shipped entry with a blocker "where the
  project has one"; no project has one. `templates/catalog.yaml` says of `modules`
  "Required at `shipped`, where a guard asserts each one exists"; no installed guard
  does.

**Model tier: Large.** Seven guards change or are added, nine to thirteen fixture
overlays, a helper module, three rule texts and the setup. The checks' logic is given
below; fitting it to each guard's existing structure, and keeping the fresh project, the
fixture base and this repository green together, is judgment.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** It changes what every set-up project's build
enforces, so the next `/update` can turn an adopter's checks red on things that were
always wrong; the review re-reads the rule prose and re-breaks each guard. The executor
stops after the handover report and the pull request (Task 10); the specifying session
reviews, writes the review record and merges.

Do not store a kick-off prompt on this plan.

---

## Delivers

set-up-project-checks-its-catalog, set-up-project-checks-its-pages, set-up-project-checks-its-plans, rule-claims-are-held-true, flush-is-seen-to-drain-the-queue

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-checks -b plan/set-up-project-checks` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.** They
  are the installed release. The new checks reach this repository at its next `/update`.
- **Do not edit `templates/github/tropis-pipeline.yml`, `framework/workflow.md`,
  `scripts/framework-commit-check.sh`, `scripts/pipeline.mjs`, `scripts/next.mjs`,
  `scripts/isolate-for-plan.*`, any file under `commands/`, `framework/DECISIONS.md` or
  `docs/backlog-board/bands.yaml`.** Two other plans are changing the first six (see
  *Running beside two other plans*); this plan needs none of them.
- **No test reaches the network. Add no dependency. Do not lower, skip or delete a
  guard**, except the changes *Decision 3* makes to `plan-dispatchable`. Every commit has
  a body.
- **Push only to this plan's branch. Do not merge.**
- **This repository is public.** No hostnames, home paths, email addresses or personal
  names in anything you commit, the handover included. Other projects are named only by
  pseudonym (`first-adopter`). Name the worktree as `../tropis-checks`.

## Decisions

Taken by the specifying session on 2026-10-31.

### 1. One guard file serves this repository and every project

Each check is one file in `guards/`, installed by setup into `.tropis/guards/`. No
second copy. Each resolves its root as `process.env.FRAMEWORK_ROOT ?? resolve(here,
'../..')` — two levels up from `.tropis/guards/` — which is what `catalog-entries`
already does. The self-check always sets `FRAMEWORK_ROOT`, so nothing changes there.

Each check must pass on a fresh project with no plans, no queue and no rules of its
own: an absent `docs/superpowers/plans/` means no plans, not an error.

### 2. Pages: the reference check knows what a project writes later

`guards/framework-integrity.test.js` keeps its scope — backticked paths under `src/`,
`docs/`, `scripts/`, `.claude/` and `.github/`, in `.claude/rules/`,
`.claude/framework/`, `.claude/commands/` and `AGENTS.md`. It does not scan `docs/`
itself: a project's dated plans and specs name files that were deleted since, on purpose.

Its exemption list gains four paths, each with a one-line comment saying who writes it:
`docs/project-brief.md` (`/scope`), `docs/BLUEPRINT-UPSTREAM.md` (`/capture-learning`,
on the first portable lesson), `docs/architecture.md` (the project, at its first
module-boundary closeout) and `docs/playbooks/test-strategy.md` (the project, where it
keeps one). Remove the "ADOPTING THIS" block and the "SET ON ADOPTION" line from its
header comment (*Traps*); the root comment says it is installed at `.tropis/guards/`.

`guards/doc-currency.test.js`, in its staleness test, skips every file listed in
`.tropis/installed.json`'s `files`: a fingerprinted file is not the project's to
re-date, and asking for it would turn `installed-files` red. When `installed.json` is
absent it skips nothing. Its message keeps naming `/refresh-model-tiers`, which writes
`docs/model-picks.md`, an unfingerprinted file.

### 3. Plans: three existing guards installed, made to pass on a fresh project

Install `catalog-drift`, `review-record` and `plan-dispatchable` unchanged in what they
judge, with three fixes:

- An absent plans directory is no plans: `review-record` returns no files instead of
  throwing; `plan-dispatchable` drops the `finds the plans directory` test (its
  `it.each` already handles none).
- **`plan-dispatchable` judges only plans with no `## Handover report`** (fences
  stripped, as `review-record` strips them). Its own comment already says that once the
  handover is written the table is history; it applied that only to the projection
  check. A handover may quote its worktree command; this repository's merged plan of
  2026-10-31 did, and was edited after merge to get past the check.
- **The framework checks job fetches full history:** `fetch-depth: 0` on the checkout
  step of `templates/github/tropis-framework-checks.yml`, keeping its `ref` input. With
  it, `origin/main` resolves on a pull request and the exemption both guards carry for
  the executing branch works. A new Tropis-only test,
  `guards/framework-checks-workflow.test.js`, asserts it.

The guards keep reading `origin/main` by that name; a project whose main branch has
another name is not this plan.

### 4. Catalog: `catalog-entries` checks the invariants the catalog rule states

Add one test per invariant to `guards/catalog-entries.test.js`. Each collects
`<id>: <invariant>` lines and expects none, so the failure names the entry and what it
breaks. A field that may be a string or a list is read as a list.

| Invariant | Failure line |
|---|---|
| two entries share an id | `<id>: two entries have this id` |
| a `blockedBy`, `after` or `supersededBy` id names no entry | `<id>: <field> names <other>, which is not in the catalog` |
| a cycle through `blockedBy` and `after` together | `<id>: in a cycle through blockedBy/after: a → b → a` |
| a shipped entry carries `blockedBy` | `<id>: shipped, but still records blockedBy` |
| an entry with `supersededBy` is `shipped` | `<id>: superseded, so it cannot be shipped` |
| `shelved` present and not `true` | `<id>: shelved must be true or absent` |
| `shelved` on a status other than `idea` or `shaped` | `<id>: shelved on a <status> entry` |
| a `spike` with a non-empty `modules` | `<id>: a spike has no modules` |
| a `shipped` entry's module path does not exist | `<id>: module <path> does not exist` |

The last row is not in the entry's criteria; it is there because `templates/catalog.yaml`
already tells every project a guard asserts it, and the entry's fourth criterion is that
the rule names the check only for what it checks. Better to make the template true than
to strike the sentence.

**An id in another repository's catalog is not a reference.** The catalog rule gains a
sentence under *Order and supersession*: `after`, `blockedBy` and `supersededBy` name
entries in this catalog; an order that depends on another repository's entry goes in a
comment above the entry, naming that repository. This repository's five dangling `after`
ids move into such comments in this plan (Task 9), so its catalog passes the check it
will install at its next `/update`.

### 5. Rule claims: a shipped guard with a project-owned block, and temporary clauses

`templates/rule-claims.test.js` moves to `guards/rule-claims.test.js` and is installed.
Its shape:

- the header comment, kept, rewritten in place to say it is installed and the project
  writes its assertions inside the block;
- `root` as in *Decision 1*;
- a `project-owned: begin` / `project-owned: end` block (marker lines written as `//`
  comments) holding the template's example comment and the *untestable claims* list.
  The project writes its claims there; the fingerprint ignores it; the take carries it;
- one shipped test, **temporary clauses are paired**, described below.

**A temporary clause** is a paragraph in a rule that exists only because the code is
still wrong. It carries, exactly, the marker first-adopter uses:

```
Temporary — until <id>. Asserted by rule-claims › <name>.
```

`<id>` is a catalog id; `<name>` is a test name with no full stop in it.

**The assertion** is written in the block with a helper from a new shipped module,
`scripts/rule-claims.js` (installed via `scripts/installed-scripts.txt`):

```js
temporary('<name>', () => { /* expect the defect to still be there */ });
```

`temporary(name, fn)` registers a Jest `it(name, …)` inside a
`describe('rule-claims')`. When `fn` throws — the defect is gone — it throws instead:
`The defect "<name>" waits on is fixed. Delete the paragraph marked "Temporary — until
<id>" in <file>, then delete this assertion.` It finds `<id>` and `<file>` by scanning the
rules for the clause naming `<name>`; with no such clause, it says so.

**The pairing test** scans `.claude/rules/*.md` for clauses and reads the project's
assertion names from `<root>/.tropis/guards/rule-claims.test.js` (by root, not by its own
path, so the fixture tree can plant one) with the pattern
`temporary\(\s*(['"`])(.+?)\1`. It fails, naming the rule file, when a clause names an id
not in `feature-catalog.yaml`; when a clause names no assertion that exists; when an
assertion names no clause; and when two clauses name one assertion. Where the clause
text is also in `.claude/rule-additions/<area>.md`, the message names that file, since
that is the one a person edits; otherwise the `.claude/rules/` file.

`scripts/rule-claims.js` exports `temporaryClauses(root)`, `assertionNames(text)` and
`temporary(name, fn)`. A Tropis-only unit test, `guards/temporary-clauses.test.js`,
covers the message `temporary` throws when its `fn` throws, and the clause parsing. (Its
name must not contain `rule-claims`: the conformance table matches guards by fragment.)

The learnings rule gains a section, *A rule that says the code is a certain way is
asserted*: such a rule gets an assertion in `.tropis/guards/rule-claims.test.js`, inside
its block, or a line on the untestable list there with the reason; a clause that exists
only because the code is still wrong is a temporary clause with the marker above, and
its assertion is a `temporary(…)` that goes red once the fix lands. It joins the existing
section *A rule that describes a defect names the defective code*, which already asks
for the assertion and now says where it goes.

### 6. Flush: a new guard

`guards/flush-drained.test.js`, installed. It finds plans named
`YYYY-MM-DD-flush-upstream.md` in `docs/superpowers/plans/` whose text, fences stripped,
has `## Handover report`. With none, or with no `docs/BLUEPRINT-UPSTREAM.md`, it passes.
Otherwise it reads `Last flushed: YYYY-MM-DD` from the queue (the `next.mjs` pattern) and
fails when that date is missing or earlier than the latest such plan's date:

```
docs/BLUEPRINT-UPSTREAM.md: Last flushed is 2026-01-01, but the flush plan
2026-02-01-flush-upstream.md has run. Drain the queue as that plan's drain task says,
and set "Last flushed: 2026-02-01."
```

(With no date: `…has no Last flushed date, but…`.)

### 7. A fresh project passes its own checks, and the self-check proves it

A new test in `guards/set-up-project.test.js`, *a freshly set-up project passes its own
checks*: run setup into a new repository, link a `node_modules` that holds Jest and
`yaml` at `.tropis/node_modules` (resolve the one this test itself runs with: walk up
from `createRequire(import.meta.url).resolve('jest')` to the `node_modules` folder), and
run the project's own suite — `node --experimental-vm-modules
<that node_modules>/.bin/jest --config .tropis/jest.config.js --rootDir .tropis` with
`FRAMEWORK_ROOT` unset in the child's environment — and expect exit 0. On failure the
test prints the suite's output.

This is the test that makes this plan safe beside the other two (*Running beside two
other plans*): any change, by any plan, that leaves a new project's checks red fails
the self-check of whichever branch lands second.

### 8. No decision record

Nothing here chooses between framework-wide alternatives: the checks already exist or
are stated in shipped rules; this plan installs them and makes them true. The
choices above are recorded in the rule texts and the guards' comments. (It also keeps
this plan clear of `framework/DECISIONS.md`, where the gate plan adds FW-037.)

## Running beside two other plans

Two plans are in flight while this one runs. The specifying session checked both on
2026-10-31.

**`main-is-gated-by-the-host`** — on `main` as
`docs/superpowers/plans/2026-10-31-main-is-gated-by-the-host.md`, dispatched at
`d63adce`. It ships a GitHub
ruleset and a `host` pipeline job, makes the gate job red when it holds the deploy, and
sends every change through a pull request where `main` is gated. **Files both plans
touch:** `scripts/set-up-project.sh` (it adds one `cp` of
`templates/github/main-branch-ruleset.json` into `.tropis/templates/`),
`guards/set-up-project.test.js` (it adds one path to the installed list),
`templates/README.md` (a paragraph on the gate) and `feature-catalog.yaml` (other
entries). Each is a separate hunk; a rebase conflict there is mechanical — keep both
sides.

Assumptions checked across the two:

- **Its required check makes this plan's new checks blocking.** Once a project applies
  its ruleset, `pipeline / gate` must pass to merge, and the framework checks job feeds
  it. So any check this plan installs that is wrongly red on an executing branch would
  block every merge. *Decision 3*'s `fetch-depth: 0` is what keeps `review-record` and
  `catalog-drift` from being wrongly red on a pull request; it is not optional.
- **Its "everything through a pull request" changes nothing these checks assume.** A
  review record, a promotion to `shipped` and a queue drain all already land on the plan's
  branch, before the squash; the checks read the tree, not how it reached `main`.
- **What it adds to shipped prose must resolve in a fresh project.** It names
  `.tropis/templates/main-branch-ruleset.json` (installed by its own setup change; the
  reference check does not scan `.tropis/`) and `.claude/project.json` (already exempt).
  If it names anything else that a fresh project lacks, *Decision 7*'s test catches it on
  whichever branch lands second.
- **It does not touch `rules/`, `fixtures/`, `scripts/check-conformance.sh`,
  `scripts/installed-scripts.txt` or `templates/github/tropis-framework-checks.yml`**
  (its *File Structure* says so), so it cannot invalidate the fixtures or the workflow
  change here. It does not mark a shipped entry `supersededBy` (it adds a comment line
  above `release-job-checks-the-commit-it-tags` instead), so it adds nothing the new
  catalog check rejects. Its `release-tags-what-main-holds` has `after:
  main-is-gated-by-the-host`, an entry it adds in the same commit.

**`a-failing-push-is-visible`** — on `main` as
`docs/superpowers/plans/2026-10-31-a-failing-push-is-visible.md`, to run after the gate
plan. It adds `scripts/main-status.mjs`, which asks `gh` how `main`'s last run finished,
and prints that line from `scripts/next.mjs` and `scripts/isolate-for-plan.mjs`; the
merge sequence in `framework/workflow.md` waits for `main`'s run. **Files both plans
touch:** `scripts/installed-scripts.txt` (it appends `main-status.mjs` as the last line;
this plan appends `rule-claims.js` — keep both), `templates/README.md` (a paragraph in
*What to type*) and `feature-catalog.yaml`. Assumptions checked:

- None of the checks this plan installs runs `next.mjs`, the isolation helper or `gh`,
  so a fresh project's checks never reach the network through its script.
- It names no new backticked path a fresh project lacks (its own *File Structure* says
  no exemption is needed); *Decision 7* catches it if that changes.
- `guards/set-up-project.test.js` reads `installed-scripts.txt` to build its expected
  list, so its added script needs no edit there, and neither does this plan's.

**When `main` moves under you:** rebase (`git fetch origin && git rebase origin/main`),
keep both sides of any conflict in the four shared files, then re-run Task 10's
verification in full — not just the suite. In particular, re-run the catalog check
against this repository's own catalog and *Decision 7*'s test: those two are where the
other plans' content meets this one's.

## Traps

- **The self-check reads committed content only.** `bash scripts/check-blueprint.sh`
  exports `HEAD`. Commit, then run it.
- **"Every test green" between tasks.** Task 4 leaves `catalog-entries` red against this
  repository's own catalog until Task 9 moves the five `after` ids; the fixture base and
  the fresh project stay green throughout. Each task's commit body says which tests are
  still red and why. (The last plan's handover recorded a mismatch like this one.)
- **The repository has no `package.json` at its root.** To run one guard file against
  the working tree, from the worktree root:

  ```bash
  echo '{"type":"module"}' > package.json && ln -s .tropis/node_modules node_modules
  node --experimental-vm-modules node_modules/.bin/jest --config templates/framework-jest.config.js --rootDir . guards/<name>.test.js --no-coverage
  rm package.json node_modules
  ```

  Never commit those two files; `git add` only paths in the File Structure table.
- **Installing `framework-integrity` as it stands turns
  `set-up-project.test.js` red**, on "asks for no edit on adoption outside a block":
  its header says "ADOPTING THIS" and "SET ON ADOPTION". *Decision 2* removes them.
- **A literal `temporary('…')` call outside the block of `guards/rule-claims.test.js`
  would be read as a project assertion.** Write examples in the shipped comment as
  `temporary(<name>, …)`, unquoted.
- **The conformance table matches guards by Jest path fragment.** `rule-claims` would
  also match a file named `rule-claims-helper.test.js`; hence
  `temporary-clauses.test.js`.
- **A defect overlay replaces whole files.** Each catalog overlay is a full copy of
  `fixtures/base/feature-catalog.yaml` with one thing broken, and usually needs a second
  entry to break it against. Break one thing per overlay (`fixtures/README.md`).
- **The clean baseline runs every guard against `fixtures/base/`.** The flush plan
  *Task 7* adds there has no handover report and no Repositories table, so
  `review-record`, `catalog-drift` and `plan-dispatchable` all leave it alone — check
  that they do.
- **Quoting a worktree command in this plan's own handover is safe only after
  *Decision 3*.** Until then the scan refuses it, as it refused the merged plan of
  2026-10-31. Name the worktree by its path in prose, as this plan does.
- **Leave `docs/backlog-board/bands.yaml` alone.** A shipped entry's band is dropped by
  the next `/refresh-board`.
- **Status.** Whatever status the five entries have on your branch (`shaped` or
  `building`), Task 9 sets them to `shipped`; do not set `building` yourself.
- **`PORTABILITY-NOTES.md` is a history of how the blueprint was assembled.** Its lines
  on `templates/rule-claims.test.js` describe a past flush and stay as they are.

## File Structure

| File | Change |
|---|---|
| `guards/catalog-entries.test.js` | *Decision 4*: nine invariant tests; header comment names them |
| `guards/framework-integrity.test.js` | *Decision 2*: root, four exemptions, header comment |
| `guards/doc-currency.test.js` | *Decision 1* root; *Decision 2* skip fingerprinted files |
| `guards/review-record.test.js` | *Decision 1* root; absent plans directory |
| `guards/plan-dispatchable.test.js` | *Decision 1* root; absent directory; skip executed plans |
| `guards/catalog-drift.test.js` | *Decision 1* root |
| `guards/rule-claims.test.js` | new (moved from `templates/`) — *Decision 5* |
| `templates/rule-claims.test.js` | deleted |
| `scripts/rule-claims.js` | new — *Decision 5* helper |
| `scripts/installed-scripts.txt` | `rule-claims.js` |
| `guards/temporary-clauses.test.js` | new, Tropis-only — *Decision 5* |
| `guards/flush-drained.test.js` | new — *Decision 6* |
| `guards/framework-checks-workflow.test.js` | new, Tropis-only — *Decision 3* |
| `templates/github/tropis-framework-checks.yml` | `fetch-depth: 0` |
| `scripts/set-up-project.sh` | install the seven guards |
| `guards/set-up-project.test.js` | installed paths; block list gains `.tropis/guards/rule-claims.test.js`; *Decision 7* test |
| `scripts/check-conformance.sh` | one `CASES` line per new overlay |
| `fixtures/defects/<name>/` | new overlays, Task 3–6 (names below) |
| `fixtures/base/docs/superpowers/plans/2026-01-02-flush-upstream.md` | new — an unexecuted flush plan the clean baseline must leave alone |
| `fixtures/base/docs/superpowers/plans/2026-01-01-example-plan.md` | a Repositories table, and a worktree command quoted in its handover (Task 3) |
| `rules/catalogs.md` | names the check and what it checks; the cross-repository sentence |
| `rules/learnings.md` | *Decision 5*'s section |
| `rules/planning.md` | the three guard paths become `.tropis/guards/…` |
| `templates/README.md` | the operator guide: what `npm --prefix .tropis test` now checks |
| `feature-catalog.yaml` | five entries to `shipped`; criteria-to-test comments; five `after` ids to comments |
| `docs/superpowers/plans/2026-10-31-set-up-project-checks-what-its-rules-say.md` | the handover report |

New overlays (`fixtures/defects/`): `duplicate-id`, `dangling-after`, `order-cycle`,
`shipped-with-blocker`, `superseded-shipped`, `shelved-not-true`, `shelf-on-building`,
`spike-with-modules`, `missing-module` (all → `catalog-entries`); `dangling-reference`
(→ `framework-integrity`); `unasserted-clause`, `clause-unknown-entry`,
`orphan-assertion` (→ `rule-claims`); `undrained-flush` (→ `flush-drained`).

Checked, and unchanged: `scripts/installed-files.js` (`.tropis/` is already a shipped
root); `templates/framework-jest.config.js` (already runs every file under
`.tropis/guards/`); `templates/catalog.yaml` (its `modules` sentence becomes true);
`fixtures/README.md` (the procedure is unchanged); `templates/package.json`;
`commands/` (no command names these checks); `framework/` (see *Decision 8*).
`scripts/take-version.mjs` needs nothing: the take builds the next release by running
setup, so the new guards reach `/update` as `Added:`.

## Tasks

### Task 0 — Setup in the worktree

From the repository root, create the worktree as the Repositories table says. In it, run
`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing) and
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record both, with `main`'s commit hash. If `main` has moved past `d63adce`, re-run the
two probes in *What the specifying session verified* that this plan depends on — the
five checks against a fresh project, and against this repository — and record any
difference under *What the plan got wrong*.

### Task 1 — The fresh-project test, red

Write *Decision 7*'s test in `guards/set-up-project.test.js`. Against today's setup it
passes, because none of the new checks is installed yet. **Show it can fail:**
temporarily add `guards/review-record.test.js` to the `cp` in `scripts/set-up-project.sh`,
run the test, see it red with the `ENOENT` failure, and revert. Record the output. Commit
the test. It is then a guard every later task must keep green as it installs each check.

### Task 2 — Pages

*Decision 2*. Edit `framework-integrity` and `doc-currency`; add both to setup's `cp`;
add both installed paths to the expected list. Add `fixtures/defects/dangling-reference/`
— an `AGENTS.md` copied from the base with one added backticked path under `docs/` that
does not exist — and its `CASES` line. Run both guard files, the setup test and the
conformance script (through `check-blueprint.sh`, after a commit). Commit.

### Task 3 — Plans

*Decision 3*. Fix the three guards; add them to setup's `cp` and the expected list;
change the workflow template; write `guards/framework-checks-workflow.test.js` (it reads
the template, finds the `actions/checkout` step of `jobs.checks`, and expects
`with['fetch-depth']` to be `0` and `with.ref` to be `${{ inputs.ref }}`). Give the base
fixture's executed plan, `fixtures/base/docs/superpowers/plans/2026-01-01-example-plan.md`,
a valid `## Repositories` table and, inside its handover report, a sentence quoting a
different worktree command in a code span, so the clean baseline proves an executed
plan is not judged; show `plan-dispatchable` failing on the base before the guard change
(a throwaway commit, then the self-check) and passing after. The existing overlays
`missing-review`, `unpromoted-delivery`, `undispatchable-plan` and
`unpaired-projection` must still be caught. Commit.

### Task 4 — Catalog

*Decision 4*. The nine tests in `catalog-entries`; the nine overlays and `CASES` lines;
the catalog rule (*Task 7* has its text). Run `catalog-entries` against this repository:
expected, the five dangling `after` ids and nothing else — leave them red until Task 9.
Commit, saying so in the body.

### Task 5 — Rule claims

*Decision 5*. `git mv templates/rule-claims.test.js guards/rule-claims.test.js`, then
reshape it; write `scripts/rule-claims.js` and add it to `installed-scripts.txt`; write
`guards/temporary-clauses.test.js`; add the guard to setup's `cp`, the installed list,
and the block list of 'ships project-owned blocks only where a project fills something
in'. Overlays:

- `unasserted-clause` — `.claude/rules/backend.md` from the base plus a paragraph ending
  `Temporary — until example-entry. Asserted by rule-claims › backend calls lack a
  timeout.`, and no assertion anywhere;
- `clause-unknown-entry` — the same clause naming `no-such-entry`, plus
  `.tropis/guards/rule-claims.test.js` containing a matching `temporary('backend calls
  lack a timeout', () => {})`;
- `orphan-assertion` — only that `.tropis/guards/rule-claims.test.js`, with no clause.

Show `temporary` failing with its message in `temporary-clauses.test.js`. Commit.

### Task 6 — Flush

*Decision 6*. The guard; setup's `cp`; the installed list. Overlay `undrained-flush`:
`docs/superpowers/plans/2026-02-01-flush-upstream.md` with a `## Delivers` of `None.`, a
`## Handover report` and a `## Review record` with a `### Learnings routed` section (so
only the drain is wrong). Add `fixtures/base/docs/superpowers/plans/2026-01-02-flush-upstream.md`
with no handover report: the clean baseline proves an unexecuted flush is not judged.
*Decision 7*'s test still passes with all seven installed. Commit.

### Task 7 — Rule text and the operator guide

- `rules/catalogs.md`: in *Status transitions*, replace "and the catalog check rejects
  any shipped entry that still records a blocker, where the project has one — whether or
  not that blocker has itself shipped." with "and `.tropis/guards/catalog-entries.test.js`
  rejects any shipped entry that still records a blocker, whether or not that blocker
  has itself shipped." Under *Order and supersession*, add a bullet: "`after`,
  `blockedBy` and `supersededBy` name entries in this catalog, and the catalog check
  fails on one that does not. An order that depends on another repository's entry goes
  in a comment above the entry, naming that repository and the id." Add one short
  paragraph at the end of *Order and supersession* listing what
  `.tropis/guards/catalog-entries.test.js` checks — the required fields and the nine
  invariants of *Decision 4*, in plain words — and nothing else.
- `rules/planning.md`: `guards/doc-currency.test.js` → `.tropis/guards/doc-currency.test.js`;
  `guards/plan-dispatchable.test.js` → `.tropis/guards/plan-dispatchable.test.js`, and
  "reads every plan carrying a `## Repositories` heading" → "reads every plan carrying a
  `## Repositories` heading and no handover report"; `review-record.test.js` →
  `.tropis/guards/review-record.test.js`. Nothing else.
- `rules/learnings.md`: *Decision 5*'s section, placed after *A rule that describes a
  defect names the defective code*, with the marker in a code span and one sentence on
  where the assertion goes. Keep it short; that section's incident is already told.
- `templates/README.md`: where it says to run `npm --prefix .tropis test`, one paragraph
  saying what those checks cover — the backlog's fields and invariants; rule areas and
  generated rules; the installed files; the entry file; references in the instruction
  pages; dated documents; plans, review records and delivered entries; rule claims and
  temporary clauses; the upstream queue after a flush — and that a release which adds a
  check can turn an existing project's checks red on something that was always wrong,
  which the check's message names.

Run every guard that reads rule or guide text (`git grep -lF` for each sentence you
replaced, under `guards/`), then commit.

### Task 8 — Fresh-agent check

The rules changed, so a fresh agent with only this repository checks the new learnings
clause. Before running it, check that the person's own instructions that load for every
project do not already describe temporary clauses or rule-claims assertions; if they do,
run it where they do not load, and say so.

Prompt it, in a scratch project set up from this worktree (`bash
scripts/set-up-project.sh <scratch>` after `git init`), with: *"This is a probe; the
output will be discarded. Our API client in `src/api.js` has no request timeout. Write a
rule in `.claude/rules/api.md` (paths: `src/**`) saying every request must set one, and
record that the existing client does not yet. There is a catalog entry
`api-client-sets-timeouts` for the fix."* (Create that entry and a one-line `src/api.js`
first.) It passes if the agent writes the clause with the exact marker and a matching
`temporary(…)` inside the block of `.tropis/guards/rule-claims.test.js`, and the
project's checks pass. Record the prompt, what it wrote, and the tool, version, operating
system and architecture, in the handover. If it fails, fix the learnings text and run it
again.

### Task 9 — Catalog

- The five dangling `after` ids: delete each from its entry's `after` (delete the key
  when the list empties) and add a comment line above the entry: `# Ordered after
  <id> in first-adopter-harness's catalog, from before the framework moved here.`
- The five entries to `shipped`, with `modules` (the guard files and scripts each
  delivered) and, above each, a comment mapping each criterion to the test or overlay
  that covers it — named exactly, per the planning rule's warning that such a table is a
  claim. The fresh-agent check covers the learnings criterion of
  `rule-claims-are-held-true`; name the handover section.
- Run `catalog-entries` against this repository: expected green.

### Task 10 — Verification, handover report, pull request

Run, and record command and output for each:

1. `bash scripts/check-blueprint.sh` on the final commit — last line `Self-check
   passed`, with every new overlay listed as `caught`.
2. The seven installed guards against this repository (`FRAMEWORK_ROOT` at the
   worktree, through the runner in *Traps*): all green.
3. A fresh scratch project: setup, `npm --prefix .tropis install`, `npm --prefix
   .tropis test` — all green, with the test count.
4. `git diff --stat origin/main...HEAD` — every file in the File Structure table.

Append `## Handover report` to this plan with the six sections the planning rule names,
commit it, push the branch, and open a pull request against `main` whose body says what
becomes true and lists the five entries. Stop there: the specifying session reviews,
writes the review record and merges.

Under *Outstanding*, name for the reviewer: the first project to take this release will
see `fetch-depth: 0` work on a real pull request — nothing here can run GitHub Actions;
and adopters may go red on the new checks at their next `/update`, which the release
notes should say.

## Handover report

Tools for every run below unless a line says otherwise: git 2.49.0, Node v22.15.0,
Jest 30.5.2 (the self-check's own `.self-check/` install), on macOS 26.2, Darwin arm64.

### Task completion

- **Task 0** — done. Worktree at `../tropis-checks`, branched from `main` at `a4127eb`.
  `npm --prefix .tropis ci` installed; `git status --porcelain` printed nothing; the
  self-check passed. `main` had moved past `d63adce` only by this plan's own commit and
  its catalog status. The probe against this repository matched the plan: 1 failure
  (`references no file that does not exist`), naming the same six references. The
  fresh-project probe was re-run as Task 1's red step.
- **Task 1** — done (`1160f90`). Shown to fail: with `guards/review-record.test.js` added
  to the setup's copy, the project's suite failed 3 of 36 tests with
  `ENOENT: no such file or directory, scandir '<tmp>/set-up-…/docs/superpowers/plans'`.
  The root resolved one folder *above* the project, which is Decision 1's defect.
  Reverted.
- **Task 2** — done (`6614677`, with a root fix in `4a6f31c`; see Judgment calls).
- **Task 3** — done (`b7c65f3`). Before the guard change, a throwaway commit of the new
  base plan made the self-check print `CANNOT RUN undispatchable-plan` and
  `CANNOT RUN unpaired-projection`, and the clean baseline failed on
  `a plan that claims to be dispatchable is dispatchable › 2026-01-01-example-plan.md`.
  That commit was dropped. After the change all four named overlays are caught.
  `framework-checks-workflow.test.js` was seen red, with `Expected: 0, Received:
  undefined`, with the `fetch-depth` line deleted.
- **Task 4** — done (`5575e20`). Against this repository the check named exactly the
  five dangling `after` ids, and nothing else, until Task 9.
- **Task 5** — done (`9ab3fb3`). `temporary-clauses.test.js › temporary › says which
  paragraph to delete once the defect is fixed` asserts the full message.
- **Task 6** — done (`52b9132`).
- **Task 7** — done (`e044ff1`). The `git grep -lF` over `guards/` for each replaced
  sentence found no guard quoting any of them.
- **Task 8** — done, passed; see Verification results.
- **Task 9** — done (`6c952fc`, plus the coverage overlays in `ea23274`).
- **Task 10** — done: this report and the pull request.
- **Rebase.** `main` moved to `21fe930` during execution: the gate plan merged as
  `2c4e91e`, plus catalog and plan commits. Rebased with no conflict; the setup's
  ruleset `cp` and its installed path sit beside this plan's hunks. The verification
  below was all re-run after the rebase.

### Verification results

1. `bash scripts/check-blueprint.sh` on `05cf340`, twice in a row. Both ended
   `Self-check passed: every guard caught its defect, the clean baseline passed, and the
   framework repository's own guards passed.` with 50 `caught` lines. Every new overlay
   is caught: `duplicate-id`, `dangling-after`, `order-cycle`, `shipped-with-blocker`,
   `superseded-shipped`, `shelved-not-true`, `shelf-on-building`, `spike-with-modules`
   and `missing-module` (catalog-entries); `dangling-reference` (framework-integrity);
   `unasserted-clause`, `clause-unknown-entry` and `orphan-assertion` (rule-claims);
   `undrained-flush` (flush-drained); `unfilled-placeholder` and `unrouted-learnings`
   (review-record). The existing `missing-review`, `unpromoted-delivery`,
   `undispatchable-plan` and `unpaired-projection` are still caught.
2. The installed guards against this repository, through the *Traps* runner with
   `FRAMEWORK_ROOT` at the worktree: `catalog-entries`, `framework-integrity`,
   `doc-currency`, `review-record`, `plan-dispatchable`, `catalog-drift`, `rule-claims`
   and `flush-drained`. The result was `Tests: 92 passed, 92 total` after the rebase
   (89 before it).
3. A fresh scratch project after the rebase (`git init`, the setup,
   `npm --prefix .tropis install`, `npm --prefix .tropis test`): `added 257 packages`,
   then `Test Suites: 13 passed, 13 total`, `Tests: 60 passed, 60 total`.
4. `git diff --stat origin/main...HEAD` on `05cf340`: `43 files changed, 1107
   insertions(+), 112 deletions(-)`. See Scope.

**Fresh-agent check (Task 8).** I checked the instructions that load for every project
on this machine first. They say nothing about temporary clauses or rule-claims
assertions, so the probe ran locally. Tool: Claude Code 2.1.300 (`claude -p`), macOS
26.2, Darwin arm64. The scratch project was set up from this worktree at the Task 7 commit
(`e044ff1` after the rebase), with a one-line `src/api.js`
(`export const get = (url) => fetch(url);`) and a shaped `api-client-sets-timeouts`
entry. Its checks passed (60 tests) before the probe. The prompt was the plan's,
verbatim: *"This is a probe; the output will be discarded. Our API client in
`src/api.js` has no request timeout. Write a rule in `.claude/rules/api.md` (paths:
`src/**`) saying every request must set one, and record that the existing client does
not yet. There is a catalog entry `api-client-sets-timeouts` for the fix."*

The agent wrote the following:

- `.claude/rules/api.md` with `paths: ["src/**"]`. It requires a timeout on every
  request, and says `get` in `src/api.js` does not have one and must not be copied. The
  clause ends with the exact marker, wrapped across two lines: `Temporary — until
  api-client-sets-timeouts. Asserted by rule-claims › api client get has no timeout.`
- Inside the project-owned block of `.tropis/guards/rule-claims.test.js`, a matching
  `temporary('api client get has no timeout', …)`. It expects `get`'s own definition to
  still be the timeout-less one.
- The regenerated `.cursor/rules/api.mdc`.

The agent then gave `get` a timeout on its own initiative. It saw the assertion fail
with the "delete the paragraph" message, and reverted. I re-ran the project's checks:
`Tests: 61 passed, 61 total`. **Pass.** The agent's own report also says it ran a
nested fresh agent on a further task. That nested run found the agent's first
assertion read the whole file, and the agent narrowed it to `get`'s line. This is a
lesson about writing such assertions, not a gap in the learnings text: the rule says
the assertion "expects the defect to still be there", and narrowing it is the project's
judgment.

### Scope

- Worktree used: `../tropis-checks`, on `plan/set-up-project-checks`. Nothing was edited
  or committed in the specifying session's checkout. The only command run there was
  the isolation helper.
- Files in the diff and not in the File Structure table (each also under Judgment calls):
  `templates/catalog.yaml` and `fixtures/base/.claude/commands/installed-roster.md`.
  The overlays `unfilled-placeholder` and `unrouted-learnings` fall under the table's
  `fixtures/defects/<name>/` row, but are not in its list of names.
- Every other file in `git diff --name-only origin/main...HEAD` is in the table.
  `templates/rule-claims.test.js` shows as deleted and `guards/rule-claims.test.js` as
  added: the content changed too much for git to pair them as a move.

### Judgment calls

- **The catalog template's seed entry now names `AGENTS.md` as its module.** It was
  `shipped` with `src/path/to/implementation.js`, and its comment said "the reality
  guard will correctly reject" it. With the new module check, a freshly set-up project
  failed its own checks. That contradicts Decision 7, and the plan listed this file as
  "checked, and unchanged". `AGENTS.md` exists in every set-up project, the way the
  fixture base uses `CLAUDE.md`. `/scope` still replaces the seed by id.
- **`doc-currency` skips an installed file only while it is unchanged** (its fingerprint
  matches the record), not every listed file. Decision 2's wording would have stopped
  the existing `stale-verification` overlay, which dates the shipped
  `.claude/framework/model-tiers.md`, from being caught. Decision 2's reason, re-dating
  would turn `installed-files` red, applies only to an unchanged file. A changed one is
  already red there, so dating it costs nothing.
- **A clean-baseline file proves the skip:** `fixtures/base/.claude/commands/installed-roster.md`
  is dated 2020-01-01 and fingerprinted at compose time. The same tree with no installed
  record failed with `.claude/framework/installed-roster.md — verified 2020-01-01, 2495
  days ago` when that file sat in `.claude/framework/`. It moved to `.claude/commands/`
  because `rule-delivery` requires every framework document to be reachable.
- **Two extra review-record overlays**, `unfilled-placeholder` and `unrouted-learnings`, so
  the `set-up-project-checks-its-plans` criteria map onto planted defects rather than
  only onto `missing-review`.
- **`doc-currency` uses `path.relative`.** The self-check's conformance root is
  `${TMPDIR}/conformance-…`, and macOS's `TMPDIR` ends in `/`. So
  `slice(root.length + 1)` dropped a character and matched no record key.
- **Decision 7's command.** `--config .tropis/jest.config.js --rootDir .tropis` from the
  project root failed with `Could not find a config file based on provided values`. The
  test runs Jest from `.tropis/` with no `--config`, exactly as `npm --prefix .tropis
  test` does, and with `--runInBand`. Without the single worker, three self-check runs failed
  intermittently. The failures were
  `take-version.mjs › removes its scratch folder on every exit path` and two
  `update.mjs fetch` tests, each of which passes alone. They snapshot the shared temp
  folder or run on Jest's default timeout, and a second worker pool inside the
  self-check pushed them over. After the change, two consecutive self-checks passed.
- **`temporary(name, fn, { register, root })`.** The optional third argument is a seam
  so `temporary-clauses.test.js` can run the registered check and assert its message.
  The shipped guard and projects call it with two arguments. `temporary` wraps its `it`
  in `describe('rule-claims')`, so the project's block sits at the top level of the file.
- **`rule-claims.test.js`'s own messages avoid a quote after `temporary(`.** The first
  draft's message `temporary('${name}')` was read as a project assertion, and a fresh
  project failed the pairing test on it.
- **The marker is matched with whitespace collapsed**, so a clause wrapped across lines
  (the fixture's, and the probe agent's) is found. A marker written with `<id>` does not
  match, so the learnings rule's own example is not read as a clause; a unit test
  covers this.
- **The rule-claims template's `sourceFiles` and `read` helpers stay outside the block**,
  as shipped helpers for a project's assertions; the probe agent used `read`.

### What the plan got wrong

- *Checked, and unchanged: `templates/catalog.yaml`*: false. Its seed entry failed the
  new module check in a fresh project (see Judgment calls).
- Decision 2's "skips every file listed in `installed.json`" would have made the existing
  `stale-verification` overlay uncatchable.
- Decision 7's literal Jest command does not find the config from the project root.
- Decision 7's test, as specified with a full worker pool, made the self-check flaky
  through other files' timing-sensitive tests.
- *The flush plan Task 7 adds* in *Traps* means Task 6.

### Outstanding

- **`fetch-depth: 0` has not run on a real pull request.** Nothing here can run GitHub
  Actions. The first project to take this release will be the first to see `origin/main`
  resolve in its framework checks job; until then only `framework-checks-workflow.test.js`,
  which reads the template, backs it.
- **Adopters may go red at their next `/update`.** The new checks judge things that were
  always wrong: a dangling `after`, a shipped entry's missing module, a review record
  with no *Learnings routed*, a stale dated document, an undrained queue. The release
  notes should say so, and that each message names the fix.
  This repository is the first such adopter. Its five dangling `after` ids are already
  moved, and the eight guards pass on it.
- **The race between `take-version.test.js`, `update.test.js` and
  `check-version.test.js` remains.** Each snapshots the shared temp folder for its own
  scratch directories, so they can see each other's under load. The in-band change
  removes the load this plan added; it does not fix the race.
- The fresh-agent check covers the learnings section; the planning and catalog rule
  edits are path renames and a list of what a guard checks, with no new instruction to
  an agent, and got no separate probe.
