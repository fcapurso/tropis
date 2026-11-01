# A contributor can read how contributing to the framework works — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `CONTRIBUTING.md` at the repository root says how a contribution reaches the
framework — by a flush from a project, or by a change made here — and what happens to it;
`README.md` and `bootstrap.md` point at it; the doc-closeout table makes a change to the
contribution mechanism update it; and a guard, run in the self-check, fails when the page
names something that does not exist or misstates whether fork pull requests get CI.

**Spec:** the entry `contributors-know-how-to-contribute` in `feature-catalog.yaml`: its
seven acceptance criteria and the comments above it. The mechanism the page describes is
decided in `framework/DECISIONS.md` FW-011 (with its 2026-10-19 amendment) and implemented
in `commands/flush-upstream.md`, `scripts/submit-upstream.sh` and, on the maintainer's
side, `.claude/commands/absorb-flush.md`; read all four before writing.

**Revised 2026-11-01.** The first version of this plan (2026-10-15) was never dispatched
and no longer matched the repository: `.framework/` is now `.tropis/`, a flush goes out
under a flush name, the maintainer absorbs flushes in groups, the self-check now runs the
guards that check this repository's own pages, and pull requests now run CI. This version
replaces it.

**What the specifying session verified on 2026-11-01, against `origin/main` at `9a670c4`,
with git 2.49.0 and Node v22.15.0 in Claude Code 2.1.300 on macOS (Darwin 25.2.0) arm64:**

- **There is no `CONTRIBUTING.md`** anywhere in the repository.
- **How a contribution travels from a project** (`commands/flush-upstream.md`, FW-011): an
  entry waits in the project's upstream queue, `docs/BLUEPRINT-UPSTREAM.md`, put there by
  `/capture-learning` when it would be true for any project (`commands/capture-learning.md`
  line 43). `/flush-upstream` is a sitting: it runs
  `bash .tropis/scripts/submit-upstream.sh preflight .`; reads the queue header's
  `Flushes as: <name>` line, asking the operator for a name if it is missing and saying the
  name will be public; puts each entry to the operator with all its parts — flush, hold or
  decline — saying whether it is a lesson (travels as the edit it proposes) or a capability
  (travels as a shaped backlog entry). It drafts a plan with one task per flushed entry; after
  `/dispatch`, each task clones the framework's current `main` afresh, branches
  `upstream/<flush name>/<flush-date>-<entry-slug>`, makes the edit, runs
  `bash scripts/check-blueprint.sh` in the clone (no pull request when it fails), and opens one
  pull request with `submit-upstream.sh open`. The branch goes to the framework repository
  when the signed-in account can push there, otherwise to the contributor's fork, created
  if missing. A drain task removes submitted and declined entries from the queue and keeps
  held ones with their note. The flush never merges.
- **What a flush needs** (`scripts/submit-upstream.sh`, header): `gh` installed and signed
  in, and the project's `.tropis/README.md` line "set up from the framework at `X`" naming a
  GitHub repository; otherwise preflight exits 1 with one line saying what is missing.
  `.tropis/README.md` is installed from `templates/README.md` (`scripts/set-up-project.sh`
  line 80).
- **What happens on the maintainer's side** (`.claude/commands/absorb-flush.md`, which lives
  in this repository only and never ships; `framework/workflow.md`, *Merging*): the
  maintainer lists a flush's pull requests by branch prefix, decides them a group at a
  time — taken, taken with a stated change, or declined with a reason — and lands each group
  as one pull request with one commit per contribution, the contributor as its author,
  merged by rebase. Each absorbed pull request is then closed with a comment naming the
  commit it landed as; a declined one is closed with the reason. The script it runs is
  `.github/scripts/absorb-flush.mjs`.
- **CI on pull requests:** `.github/workflows/pipeline.yml` triggers on `push` to `main` and
  on `pull_request` (`types: [opened, synchronize, reopened, closed]`). `ci.yml` is now only
  the hand-started release job. The repository's settings (this repository's `CLAUDE.md`,
  checked 2026-10-31) make workflows from a first-time contributor's fork wait for the
  maintainer's approval. `gh pr list --state all` shows 89 pull requests, none from a fork:
  no fork pull request has yet run through the pipeline. FW-011's *Consequences* still says
  "Pull requests from forks get no CI until ci.yml also runs on `pull_request`", which is no
  longer true.
- **What is not yet true of a flush:** the entry `flush-name-is-explained-and-unique`
  (shaped) will make `/flush-upstream` explain the flush name and refuse one another account
  already flushes under. Today nothing checks that. That later entry changes
  `/flush-upstream`; this plan describes the flush as it works today and does not change it.
- **How a change made here travels:** `framework/workflow.md` (*Branching*, *Preflight*,
  *Scope check*, *Merge and clean up*, *Doc closeout*, the fresh-agent check),
  `rules/planning.md`, `framework/dispatch.md`; the self-check is
  `bash scripts/check-blueprint.sh`. This repository's `CLAUDE.md` says the source folders
  (`rules/`, `framework/`, `commands/`, `scripts/`, `guards/`, `templates/`) are the next
  release and `.claude/`, `.tropis/` the installed one, and that `main` takes changes only
  through a pull request that merges itself once `pipeline / gate` is green.
- **`README.md`** line 192–194, under *Where to go next*, is one bullet: "**Contributing:** a
  project sends its suggestions back with `/flush-upstream`, one pull request per suggestion
  and under the name it chooses, the same way for a project's maintainer or a contributor
  with a fork." The README is refreshed whole by `/refresh-readme` from
  `docs/readme/skeleton.md`, whose *Where to go next* job is "links to the deeper documents,
  how to contribute, the licence." (line 64).
- **`bootstrap.md`** lines 309–314 tell a newly set-up project about the queue and then
  describe the flush in two sentences ("`/flush-upstream` drafts the porting plan; a person
  decides what ports. The flush then submits each decided line as a pull request and needs
  `gh` signed in.").
- **The doc-closeout table** is in `framework/workflow.md` under *Doc closeout — required*.
  `guards/operator-page-closeout.test.js` asserts its two README rows by regex; a new row
  does not disturb those.
- **How this repository's own guards run in the self-check** (`scripts/check-blueprint.sh`,
  lines 89–150): `FRAMEWORK_GUARDS` lists them; any guard file containing
  `isBlueprintTree` and missing from that list makes the self-check fail (`UNLISTED`);
  `run_guard` runs one with `FRAMEWORK_ROOT` set to the staged tree and
  `TROPIS_EXPECT_FRAMEWORK=1`, so its skip case fails there; `plant <guard> <file> [line]`
  copies the staged tree, deletes the file or every line containing the text, and requires
  the guard to fail. `guards/readme-usable.test.js` is the pattern: root from
  `process.env.FRAMEWORK_ROOT ?? resolve(here, '..')`, `isBlueprintTree`, and a skip case
  that expects `TROPIS_EXPECT_FRAMEWORK` to be empty.
- **The staged tree is `git archive HEAD`**, which leaves out what `.gitattributes` marks
  `export-ignore`: `.claude/`, `.tropis/`, `docs/superpowers/`, `docs/backlog-board/`,
  `docs/BLUEPRINT-UPSTREAM.md` among them. So in the self-check, `.claude/commands/absorb-flush.md`
  and anything under `.tropis/` do not exist; `.github/` and the root files do.
- **`scripts/set-up-project.sh` copies named files only**; `CONTRIBUTING.md` is not among
  them. `guards/set-up-project.test.js` › *sets a project up in its own repository* builds a
  project in a temporary directory with it.

**Model tier: Medium.** The page's content and the guard's behaviour are stated; the prose
and a small guard are written to them.

**Requires:** a current Claude Code CLI (`claude`) on the machine for the fresh-agent check in Task 6.

**Merge authority: parent review.** An adopter-facing page, a framework document and a decision amendment change. You stop once the pull request is open with the handover on it (Task 7): do not write the review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

contributors-know-how-to-contribute

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-contributing -b plan/contributors-know-how-to-contribute origin/main` |

## Global Constraints

- **Describe the mechanism as it is.** Do not change `commands/flush-upstream.md`,
  `scripts/submit-upstream.sh`, `commands/capture-learning.md`, `.claude/commands/absorb-flush.md`
  or any workflow under `.github/`. If the page cannot be written truthfully without a change
  to one of them, stop and report.
- **Point, do not restate.** The page links to the documents that define a step and says
  in a sentence what the step is for; it does not copy their rules.
- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`** at the root —
  the installed release and this repository's own entry pair.
- **Do not change `readme-usable.test.js` or `operator-page-closeout.test.js`.**
- **No new dependency. Do not lower, skip or delete a guard or a test.** Every commit has a
  body.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, the handover or the probe record. A project is named only as
  `first-adopter`.

## Decisions

Taken by the specifying session; do not reopen them.

1. **The name is `CONTRIBUTING.md`**, at the root, because GitHub links that name from a
   new pull request — where someone arriving through a flush will be.
2. **Two ways in, one page:** a flush from a project, and a change made in this repository.
   The maintainer's side of a flush (`/absorb-flush`) is described in a short paragraph,
   because it is "what happens to the pull request once it is open".
3. **`README.md` and `bootstrap.md` keep one sentence each** about contributing and point at
   `CONTRIBUTING.md`.
4. **The README bullet is edited by this plan, and the skeleton is changed so a refresh
   keeps it.** The closeout table says a plan does not patch the README. That rule exists so
   the README is not patched with new behaviour between whole-page refreshes; this edit only
   replaces a description of the mechanism with a link to the page that now owns it, which is
   what the next refresh would write once the skeleton asks for it. So the skeleton's
   *Where to go next* job names `CONTRIBUTING.md`, and the README bullet is changed to match.
   `docs/readme/readme.yaml` (`refreshedAt`) is not touched.
5. **The fork-CI statement is one fixed sentence, chosen by the workflow, so the guard can
   find it.** While `.github/workflows/pipeline.yml` has a `pull_request` trigger, the page
   carries, unbroken on one line:
   `A pull request from a fork runs the pipeline once the maintainer approves the run.`
   and not `A pull request from a fork gets no CI run yet.`; without the trigger, the reverse.
6. **The page's *Not yet* section says, as it stands today:** that no pull request from a
   fork has yet run through the pipeline, so a fork's first run is the first test of it; and
   that nothing yet checks that a flush name is not already used by another project, so a
   contributor should pick one nobody else is likely to (plain prose — no catalog id). The
   later entry `flush-name-is-explained-and-unique` will remove the second sentence under the
   closeout row this plan adds.
7. **FW-011 gets a dated amendment, not a new decision.** Its *Consequences* line about fork
   CI is false; nothing is chosen between alternatives, so no new FW number. Append after the
   *Consequences* paragraph of FW-011, verbatim:

   ```
   **Amended 2026-11-01 — pull requests from forks run the pipeline.** `pipeline.yml` runs on
   `pull_request`, so the consequence above no longer holds. A first-time contributor's run
   waits for the maintainer's approval, a repository setting. `CONTRIBUTING.md` says which
   is true, and `contributing-page.test.js` holds it to `pipeline.yml`.
   ```

   Check that `framework-integrity` accepts `CONTRIBUTING.md` and `pipeline.yml` in that
   paragraph (neither is under `docs/`, `scripts/` or `.claude/`). If it refuses either,
   write that name in plain text and say so under *Judgment calls*.

## Traps

- **The page names paths of two kinds.** Most are this repository's
  (`commands/flush-upstream.md`); some are a project's (`docs/BLUEPRINT-UPSTREAM.md`) or the
  installed form of a source file (`.tropis/README.md`, `.tropis/scripts/submit-upstream.sh`).
  In the staged tree `.claude/` and `.tropis/` do not exist. The guard maps installed paths
  to their source and allows a short named list of project-only paths — see Task 4. Keep the
  list to what the page needs.
- **The guard runs in the self-check only if it is listed.** It calls `isBlueprintTree`, so
  `scripts/check-blueprint.sh` fails with `UNLISTED` until `contributing-page` is in
  `FRAMEWORK_GUARDS`, and it must be planted (Task 5).
- **The self-check reads committed content only.** Commit before each run. A red run of an
  uncommitted break proves nothing: make the break a throwaway commit, run, then
  `git reset --hard HEAD~1` — only on this plan's branch, only that throwaway commit.
- **A fixed sentence wrapped across two lines is not found.** Both the guard and the
  self-check's line-deleting plant need Decision 5's sentence on one line.
- **`/flush-upstream` is not in `.claude/commands/` here** (this repository is the upstream
  and never flushes). It is `commands/flush-upstream.md`. `/absorb-flush` is the other way
  round: only `.claude/commands/absorb-flush.md`, which the staged tree lacks.

## File Structure

| File | Change |
|---|---|
| `CONTRIBUTING.md` | New — the page |
| `README.md` | The *Contributing* bullet under *Where to go next*: one sentence and a link |
| `docs/readme/skeleton.md` | *Where to go next* job names `CONTRIBUTING.md` |
| `bootstrap.md` | The queue sentence kept; the flush's description replaced by a pointer |
| `framework/workflow.md` | Doc-closeout table: a row for the contribution mechanism |
| `framework/DECISIONS.md` | FW-011: the dated amendment of Decision 7 |
| `guards/contributing-page.test.js` | New — the page's names exist; the fork-CI sentence matches `pipeline.yml` |
| `guards/set-up-project.test.js` | *Sets a project up in its own repository*: `CONTRIBUTING.md` is not in the set-up project |
| `scripts/check-blueprint.sh` | `contributing-page` in `FRAMEWORK_GUARDS`, and two plants |
| `feature-catalog.yaml` | `contributors-know-how-to-contribute` to `shipped`, with its modules |
| `docs/superpowers/plans/2026-10-15-contributors-know-how-to-contribute.md` | Handover report |

Doc closeout, decided here: an adopter-facing page changes (README, bootstrap), covered
above; a framework document changes, so Task 6 runs the fresh-agent check; a decision is
amended (Decision 7); no rule changes, so no rule regeneration; nothing portable is learned
beyond what this plan ships.

---

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version`, `claude --version` and
`uname -sm` for the handover.

### Task 1 — The page

Write `CONTRIBUTING.md`, plain and short, in this order:

1. **`# Contributing to Tropis`**, then one paragraph: two ways to contribute — from a
   project using the framework, or by changing it here.
2. **`## From a project`** — what a contributor does and what happens:
   - an entry goes into the project's queue, `docs/BLUEPRINT-UPSTREAM.md`, when it would be
     true for any project (point at `/capture-learning`);
   - `/flush-upstream` is a sitting: each entry is put to the operator — flush, hold or
     decline — and a lesson travels as the edit it proposes, a capability as a shaped backlog
     entry; the flush goes out under the name in the queue's `Flushes as:` line, which is
     public, so a private project picks one that does not identify it;
   - the plan it drafts, once dispatched, opens one pull request per flushed entry, from a
     fresh clone of the framework's `main`, after the framework's self-check passes in that
     clone; the branch goes to the framework repository or, without push access, to the
     contributor's fork;
   - what is needed: `gh` installed and signed in, and `.tropis/README.md` naming the
     framework's GitHub repository (`.tropis/scripts/submit-upstream.sh preflight` says which
     is missing);
   - what happens next — one short paragraph: the maintainer takes a flush in with
     `/absorb-flush`, a group of related pull requests at a time; each is taken, taken with a
     stated change, or declined with a reason; taken ones land as one commit each, with the
     contributor as author; the original pull request is then closed with a comment naming
     where it landed, or the reason it was declined. A declined lesson stays applied in the
     project that raised it.
3. **`## Changing the framework here`** — the path a change takes, each step one line with a
   pointer, not a restatement: a backlog entry in `feature-catalog.yaml` (`/idea`); a plan
   (`rules/planning.md`); a branch in a worktree of its own (`framework/workflow.md`,
   *Branching*); the self-check, `bash scripts/check-blueprint.sh`; a fresh-agent check for a
   change to a rule or framework document (`framework/workflow.md`, *Doc closeout*); review
   and a squash-merge through a pull request, since `main` takes nothing else. Say in one
   sentence that the source folders (`rules/`, `framework/`, `commands/`, `scripts/`,
   `guards/`, `templates/`) are the next release and `.claude/` and `.tropis/` the installed
   one, which change only by installing a release.
4. **`## Not yet`** — Decision 5's sentence for the current `pipeline.yml` (the
   *runs the pipeline once the maintainer approves the run* one), on its own line, then the
   two statements of Decision 6.
5. **`## Keeping this page true`** — one sentence: a change to how a contribution reaches
   the framework updates this page in the same plan (`framework/workflow.md`,
   *Doc closeout*).

Every backticked path must resolve under the guard's rules in Task 4. Commit.

### Task 2 — The pointers

- `README.md`, the *Contributing* bullet under *Where to go next*: replace it with one
  sentence — a project sends its suggestions back as pull requests with `/flush-upstream` —
  followed by a link to [`CONTRIBUTING.md`](CONTRIBUTING.md) for how that works and how to
  change the framework directly. Change nothing else in the README.
- `docs/readme/skeleton.md`, *Where to go next*, the **Job** line: make it
  `links to the deeper documents, how to contribute as one line linking CONTRIBUTING.md, the licence.`
- `bootstrap.md`, lines 309–314: keep the sentences telling the project to run
  `/capture-learning` and to append a portable learning to `docs/BLUEPRINT-UPSTREAM.md`;
  replace the two sentences describing `/flush-upstream` with one: `/flush-upstream` sends
  the queue back as pull requests, and the framework's CONTRIBUTING.md (plain text, not
  backticks — a set-up project has no such file) says how and what it needs.

Commit.

### Task 3 — The closeout row and the amendment

In `framework/workflow.md`, *Doc closeout — required*, add directly after the row that
begins `| taught **or built** something portable`:

```
| alters how a contribution reaches the framework — the upstream queue, the flush, its pull requests, how the maintainer takes them in, CI for them | `CONTRIBUTING.md`, in the same plan. Only the framework's own repository has it |
```

Apply Decision 7 to `framework/DECISIONS.md`. Commit.

### Task 4 — The guard, red then green

`guards/contributing-page.test.js`, in the style of `guards/readme-usable.test.js`
(`// Level: unit` first line, a header comment saying what it locks and that it skips
outside the framework repository, `isBlueprintTree` as there, root from
`process.env.FRAMEWORK_ROOT ?? resolve(here, '..')`, the same skip case expecting
`TROPIS_EXPECT_FRAMEWORK` empty). Export nothing; define one function `problems(root)`
returning a list of strings, one per problem:

- `CONTRIBUTING.md is missing` when there is no page (and nothing else is checked).
- **Paths.** Take every backticked span. Split it on whitespace. A word is a path when it has
  none of `*<>{}`, does not start with `/` or `-`, and either contains `/` or ends in
  `.md`, `.js`, `.mjs`, `.sh`, `.yml`, `.yaml` or `.json`; a trailing `/` is dropped (a
  folder). Resolve it: `.claude/rules/X` → `rules/X`, `.claude/framework/X` →
  `framework/X`, `.claude/commands/X` → `commands/X`, `.tropis/scripts/X` and
  `.tropis/hooks/X` → `scripts/X`, `.tropis/README.md` → `templates/README.md`; anything
  else as written. A path on the project-only list — `docs/BLUEPRINT-UPSTREAM.md` — is
  accepted. Otherwise report `names <path>, which does not exist` when the resolved path is
  absent under `root`.
- **Commands.** A backticked span (or its first word) matching `^/[a-z][a-z-]*$` names a
  command; report `names /<name>, which is not a command` unless `commands/<name>.md`
  exists, or the name is on the repository-only list — `absorb-flush`, held to
  `.github/scripts/absorb-flush.mjs` existing.
- **Fork CI.** `pipeline.yml` has a trigger when `.github/workflows/pipeline.yml` has a line
  matching `^\s+pull_request:`. With the trigger, report a problem when Decision 5's
  *runs the pipeline* sentence is absent or the *gets no CI run yet* sentence present;
  without it, the reverse. The problem names which sentence is expected.

Cases:

1. `problems(root)` equals `[]` on the real tree.
2. A temporary blueprint-shaped directory (the four entries `isBlueprintTree` needs, a
   `commands/` with one command, a `.github/workflows/pipeline.yml` with no `pull_request`
   trigger) whose page names `scripts/missing.sh` and `/nonesuch` and carries the
   *runs the pipeline* sentence: `problems` reports exactly three problems, naming
   `scripts/missing.sh`, `/nonesuch`, and the expected *gets no CI run yet* sentence.
3. The same directory without a page: `problems` equals `['CONTRIBUTING.md is missing']`.

Run it red first. The page already exists (Task 1), so make a throwaway commit that renames one backticked path in
`CONTRIBUTING.md` to a missing one, run
`bash scripts/check-blueprint.sh` (its tools land in `.self-check/` on the first run), see case 1 fail naming that path, and drop the commit
(*Traps*). Paste the failing line. Then green.

`guards/set-up-project.test.js`, *sets a project up in its own repository*: add an assertion
that `CONTRIBUTING.md` does not exist in the set-up project directory. Run that file. Commit.

To run one guard faster, `run_guard` in `scripts/check-blueprint.sh` shows how the
self-check invokes jest on a staged tree; any way you use, say which under *Verification results*.

### Task 5 — The guard in the self-check

In `scripts/check-blueprint.sh`: add `contributing-page` to `FRAMEWORK_GUARDS`, and after the
`plant readme-usable …` lines add:

```bash
plant contributing-page CONTRIBUTING.md
plant contributing-page CONTRIBUTING.md "A pull request from a fork runs the pipeline once the maintainer approves the run."
```

Commit. Run `bash scripts/check-blueprint.sh`. Expected: last line starts
`Self-check passed`, and the output has two lines starting `  caught      contributing-page:`.
Paste them. If either says `NOT CAUGHT` or `FAILED`, fix the guard or the page and run again.

### Task 6 — Catalog, full verification and the fresh-agent check

In `feature-catalog.yaml`, on `contributors-know-how-to-contribute`: set `status: shipped`
(it reads `building` once dispatched; if it reads anything else, set `shipped` anyway and
say so under *Judgment calls*). Set `modules` to `CONTRIBUTING.md`,
`guards/contributing-page.test.js` and `scripts/check-blueprint.sh`. Add directly above the
entry's `- id:` line, below the existing comments:

```yaml
# 2026-11-01, shipped by docs/superpowers/plans/2026-10-15-contributors-know-how-to-contribute.md,
# revised that day. The fork-CI example in the criteria was out of date by then; the page
# states what is true now, held to pipeline.yml by contributing-page.test.js.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit.

Then, after committing everything, from the worktree:

- `npm --prefix .tropis test` — paste the `Tests:` line.
- `bash scripts/check-blueprint.sh` — paste the last line, which must start
  `Self-check passed`.
- `git diff --stat origin/main...HEAD` — paste it; every file must be in *File Structure*.

**Fresh-agent check** (`framework/workflow.md` changed). Push the branch first. Clone it
into a scratch folder outside the repository (`git clone --branch plan/contributors-know-how-to-contribute <origin url> <scratch>`),
and in that clone run:

```bash
claude -p --output-format stream-json --verbose "This is a probe and its output will be discarded. An invented plan in this repository changes scripts/submit-upstream.sh so that a flush always pushes its branch to the contributor's fork, even when the contributor could push to the framework repository. Using only this repository, list every document the plan must update besides the script itself, and say for each which rule or table makes it owed." > <scratch>/probe.jsonl
```

Pass: the final answer names `CONTRIBUTING.md` and attributes it to the doc-closeout row in
`framework/workflow.md` (or its installed copy). Quote from `probe.jsonl` the tool call
that read the closeout table and the answer's sentence about `CONTRIBUTING.md`. A fail means
the row is not clear enough: fix the row, commit, push, and run again. Record the prompt,
the quotes, pass or fail, and the tool, its version, the operating system and architecture
— never the computer's name — in the body of an empty commit
(`git commit --allow-empty`) titled `chore(probe): fresh-agent check of the contribution closeout row`.
Delete the scratch clone.

### Task 7 — Handover report and pull request

1. Append `## Handover report` to this plan with the six sections the planning rule names:
   Task completion, Verification results (each command, its actual output, and the tool,
   version, operating system and architecture), Scope (diff stat, every file in
   *File Structure*, the worktree path used), Judgment calls, What the plan got wrong,
   Outstanding. Say in Outstanding that the change has no screen, so there is no developer
   check. Commit and push.
2. Open a pull request against `main` titled
   `docs(contributing): a contributor can read how contributing to the framework works`,
   whose body says what is now true and names the fresh-agent check's result, ending with the
   attribution lines your session gives.
3. Wait for its checks (`gh pr checks <N> --watch`) and report whether they are green.
   **Stop there.** Do not write a review record, set auto-merge or merge. Leave the worktree
   in place; the reviewer removes it.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| The page explains a flush from a project, its needs, and what happens after | `CONTRIBUTING.md`, *From a project*; names held by `contributing-page.test.js` |
| The page gives the path of a change made here, by pointing | `CONTRIBUTING.md`, *Changing the framework here* |
| The page says what does not work yet | `CONTRIBUTING.md`, *Not yet*; the fork-CI sentence held to `pipeline.yml` |
| README and bootstrap point at the page | Task 2 diff; `docs/readme/skeleton.md` keeps it through a refresh |
| Doc-closeout row | `framework/workflow.md`; Task 6 fresh-agent check |
| A check fails on a name that does not exist | `contributing-page.test.js` case 2; the self-check's plants |
| Not copied into a set-up project | `set-up-project.test.js` |

## Not in this plan

- **Explaining the flush name and refusing one already in use.**
  `flush-name-is-explained-and-unique`; it updates `CONTRIBUTING.md` under the new row.
- **Proving a fork pull request passes the pipeline.** Nothing can until one is opened; the
  page says so.

## Handover report

### Task completion

- Task 0: done. Tools: git 2.49.0, Node v22.15.0, Claude Code 2.1.300, Darwin arm64 (macOS 26.2).
- Tasks 1 to 3: done in one commit (page, pointers, closeout row, FW-011 amendment).
- Task 4: done; the guard and the set-up assertion are in their own commit.
- Task 5: done. Task 6: done, including the fresh-agent check (two runs; see below).
- Task 7: step 1 done. Steps 2 and 3 (open a pull request, wait for checks) are skipped on the
  dispatching session's instruction: no pull request was opened. The branch is pushed.

### Verification results

- Red then green (Task 4): the self-check takes minutes, so the guard was run alone with jest
  (Jest from `.self-check/node_modules`, `node --experimental-vm-modules`, the template config,
  `FRAMEWORK_ROOT` and `TROPIS_EXPECT_FRAMEWORK=1`) on a `git archive HEAD` copy, with a
  throwaway edit to the copy rather than a throwaway commit. Red: `names rules/planing.md, which
  does not exist`, 1 failed, 2 passed. A first run was also red for a real reason:
  `names feature-catalog.yaml, which does not exist` (the file is export-ignored, so absent from
  the staged tree); the page now says "the feature catalog" in plain text. Green: 3 passed.
- `guards/set-up-project.test.js` on the staged copy: 19 passed, 19 total.
- `npm --prefix .tropis test`: `Tests: 137 passed, 137 total`.
- `bash scripts/check-blueprint.sh`: last line `Self-check passed: every guard caught its defect, the
  clean baseline passed, and the framework repository's own guards passed.` Both lines
  `  caught      contributing-page: CONTRIBUTING.md planted` appear. Two earlier runs failed on the
  clean baseline in `guards/main-status.test.js` (`--pull-request` cases "brings a branch that is
  behind up to date once" and "never asks twice to update the same head", exit 3 instead of 0),
  while the machine load average was about 12 to 16. The same file passes 37 of 37 alone on
  `origin/main` and on this branch, and a third full run passed.
- Fresh-agent check: see the body of the commit titled `chore(probe): fresh-agent check of the
  contribution closeout row`. Run 1 failed (the agent never read the row); the row was reworded;
  run 2 passed, quoting the row at `framework/workflow.md`.
- Diff stat: `git diff --stat origin/main...HEAD`, taken after the last commit before this report:
  CONTRIBUTING.md, README.md, bootstrap.md, docs/readme/skeleton.md, feature-catalog.yaml,
  framework/DECISIONS.md, framework/workflow.md, guards/contributing-page.test.js,
  guards/set-up-project.test.js, scripts/check-blueprint.sh, and this plan.

### Scope

Every changed file is in *File Structure*. Worktree: `../tropis-contributing` on branch
`plan/contributors-know-how-to-contribute`, rebased on `origin/main` once (a backlog commit
landed meanwhile).

### Judgment calls

- Tasks 1 to 3 landed as one commit.
- `feature-catalog.yaml` is export-ignored, so the page cannot name it in backticks under the
  guard; it says "the feature catalog".
- The guard reports the fork-CI sentence problem as one problem, whichever way it is wrong, so
  case 2 yields exactly three problems as the plan states.
- The closeout row's wording was changed after probe run 1 (it adds "and the branches they
  come from").
- Catalog entry status was `building`, as expected. `framework-integrity` accepted
  `CONTRIBUTING.md` and `pipeline.yml` in the FW-011 amendment (the self-check passed).
- Sources worked from: none in particular; the page was written from the repository's own
  documents named in the plan.

### What the plan got wrong

- The page could not name `feature-catalog.yaml` in backticks (absent from the staged tree).
- Task 4's red step by throwaway commit through the whole self-check is slow; a staged jest run
  was used instead.
- The closeout row as first worded did not lead a fresh agent to read it.

### Outstanding

- `guards/main-status.test.js` timing cases fail the clean baseline under heavy machine load.
  Not caused by this change; worth an entry if it recurs.
- The change has no screen, so there is no developer check.

## Review record

Reviewed by the dispatching session, which holds parent-review authority.

### Checks re-run

All with git 2.49.0 and Node v22.15.0, in Claude Code 2.1.300 on macOS (Darwin 25.2.0),
arm64, on the branch head `cb636b7`, up to date with `origin/main`.

- `npm --prefix .tropis test`: `Tests: 137 passed, 137 total`.
- `bash scripts/check-blueprint.sh`: exit 0, last line `Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards passed.`,
  with both `caught      contributing-page: CONTRIBUTING.md planted` lines (the page removed,
  and the fork-CI sentence deleted). The guard runs with `TROPIS_EXPECT_FRAMEWORK=1` there, so
  its real cases executed, not its skip case. The `main-status.test.js` failures the executor
  saw under load did not recur.
- Scope: `git diff --stat origin/main...HEAD` lists the eleven files in *File Structure*,
  nothing else.
- Read the whole page against `commands/flush-upstream.md`, `scripts/submit-upstream.sh`,
  `.claude/commands/absorb-flush.md` and `.github/workflows/pipeline.yml`: each statement
  holds today. Each acceptance criterion maps to the evidence in *Criteria and their
  evidence*.
- The fresh-agent check's record (commit `d13db07`): run 1 failed honestly and the row was
  reworded; run 2 shows the agent reading the table and quoting the row.

### Found

- The fixed fork-CI sentence says a fork's run waits for the maintainer's approval; the
  repository setting applies that to a first-time contributor only. That wording is this
  session's, from the plan's Decision 5, not the executor's. Accepted as it stands: a flush's
  contributor is nearly always a first-time one, and FW-011's amendment says it precisely.
  No change.
- The executor ran the red step on a staged copy rather than through a throwaway commit and
  the whole self-check. That is equivalent, since it is the same Jest run against the same
  `git archive` tree. Accepted.
- Public exposure: read the whole diff, the probe commit and the handover for people's names,
  home paths, hostnames, other projects and email addresses: nothing.

No defects fixed by the reviewer.

### Outstanding disposition

- No developer check: the change has no screen.
- The `main-status.test.js` failure under load, failing twice and passing on a rerun with
  nothing changed: a check that passes on a rerun is a bug (`framework/workflow.md`,
  *Merging*), so it goes into the backlog as its own entry, in the pull request that unbands
  this one.
- The stale fork-CI example in the entry's third criterion: left as written, with the
  catalog comment saying what the page states instead.

### Learnings routed

- The export-ignored catalog path the guard refused: specific to this page, and handled in
  it. Nothing generalises.
- The probe that found the right file by another route in run 1: already covered by
  *Judge the check by what the agent did* in `framework/workflow.md`. The executor applied it.
- The load-dependent test failure: a backlog entry, as above.

### Merged because

Every criterion has its evidence, the self-check and the installed checks are green, the
new guard fails on both planted defects, the fresh-agent check passed with its calls shown,
and the diff is exactly the plan's.
