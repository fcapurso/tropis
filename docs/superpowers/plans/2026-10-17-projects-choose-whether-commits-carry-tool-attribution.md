# The framework stops telling agents to strip tool attribution from commits — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** no shipped framework text tells an agent to strip, avoid or check for a
co-author, "generated with" or "made with" line in a commit or pull request. Whether to
credit the agent tool becomes each project's choice, made in its own `CLAUDE.md` if it
wants one.

**Spec:** the entry `projects-choose-whether-commits-carry-tool-attribution` in
`feature-catalog.yaml`. Read its four criteria and the comment above them. There is no
separate design document: the change is three passages removed or reworded, a decision
record and a release note, all given verbatim below.

**What the specifying session verified on 2026-10-17 against `main` at `78faf51`, and
re-verified on 2026-10-20 against `main` at `0ebc7d1` (the passages are unchanged; their
line numbers, the last decision number and the release notes moved):**

- `git grep -niE 'trailer|co-author|generated with|made with' -- rules framework commands
  scripts guards templates fixtures README.md bootstrap.md` finds exactly these:
  - **`framework/commit-format.md`, lines 28–29**, under `## Rules`:
    ```
    - **Never add `Co-Authored-By` or "generated with" trailers.** Some tools append these
      to every commit regardless of instruction; strip them.
    ```
  - **`framework/dispatch.md`, lines 75–77**, under `## Rules`:
    ```
    - **Strip tool-injected commit trailers.** Some agent tools append a co-author trailer to
      every commit regardless of instructions. Squash-merging with an explicitly written
      message removes them; a self-merging agent must be told to check.
    ```
  - **`framework/workflow.md`, lines 221–223**, in *Merge and clean up — in this order*:
    ```
    Pass `--subject` and `--body` explicitly. Left to itself the squash inherits the branch
    commits, including any trailer the executing tool injected — some agent tools append a
    co-author trailer to every commit regardless of instructions.
    ```
  - **`commands/release.md`, line 60**: `%(trailers:key=Implements,valueonly)`. This reads
    the `Implements:` line a merge message carries. It is not attribution. **Leave it.**
- No guard asserts on any of the three passages: `git grep -n 'trailer\|Co-Author'
  guards` finds nothing.
- `framework/DECISIONS.md` has no entry on attribution. Its last entry is FW-020.
- `RELEASES.md` `## [Unreleased]` already holds several sections, the last of them
  `### The commit and merge hooks speak only for the command being run, and for every file that needs a branch`.
- Per the breaking-change definition at the top of `RELEASES.md`, this change is **not
  breaking**: no file moves, no command changes, no hook or block changes shape. The
  next release as a whole is already breaking, because of the block-marker change listed
  under `## [Unreleased]`; that does not change what this section says about itself.

**Model tier: Small.** All target text is given verbatim.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 4 (record which).

**Merge authority: parent review.** This changes framework documents, and the fresh-agent
check's result needs reading by the session that wrote the criteria.

Do not store a kick-off prompt on this plan.

---

## Delivers

projects-choose-whether-commits-carry-tool-attribution

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-attribution -b plan/projects-choose-whether-commits-carry-tool-attribution` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They hold the installed `v0.3.1`. This change reaches them when this
  repository takes the release that ships it.
- **Do not touch `commands/release.md`.** Its `Implements` trailer is unrelated.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-17. Do not reopen them.

1. **`framework/commit-format.md`.** Delete lines 28–29 (the bullet quoted above). The
   bullets before and after it stay as they are, with no blank line added.
2. **`framework/dispatch.md`.** Delete lines 75–77 (the bullet quoted above). The bullets
   before and after it stay as they are.
3. **`framework/workflow.md`.** Replace lines 221–223 with:

   ```
   Pass `--subject` and `--body` explicitly. Left to itself the squash inherits the branch
   commits' messages, and the merged commit then lists working history instead of saying
   what the plan made true.
   ```

   The advice stays because that reason still holds. Only the attribution reason goes.
4. **`framework/DECISIONS.md`.** Append, after the last entry, separated by a blank line as the
   other entries are. If another plan has taken FW-021 by the time you append, use the
   next free number:

   ```
   ## FW-021: The framework takes no position on tool attribution in commits

   **Date:** 2026-10-17 · **Status:** Accepted

   **Decision:** No shipped document tells an agent to strip, avoid or check for a
   co-author, "generated with" or "made with" line in a commit or pull request. Whether a
   project credits the agent tool that wrote a change is the project's choice. A project
   that wants those lines gone says so in its own `CLAUDE.md`, where a project's additions
   to a framework document go.

   **Rejected:** Keeping stripping as the shipped default, which imposed one maintainer's
   preference on every adopter and set agents against the tools they run in. A
   project-owned block in the commit format for the choice, a slot for a one-line
   preference that `CLAUDE.md` already holds.

   **Consequences:** A project that took an earlier release and relied on the shipped rule
   keeps attribution lines in its commits from this release on, unless it adds the rule to
   its own `CLAUDE.md`. The advice to pass the squash-merge subject and body explicitly
   stays, for its other reason.
   ```

5. **`RELEASES.md`.** Under `## [Unreleased]`, add the section below after the last
   section already there, separated by a blank line.

   ```
   ### The framework no longer strips tool attribution from commits

   The commit format, the dispatch guidance and the merge sequence no longer tell agents to
   remove co-author, "generated with" or "made with" lines from commits and pull requests.
   Whether to credit the agent tool is now each project's choice. This is not a breaking
   change, but it changes a default: to keep removing those lines, add the rule to your
   project's `CLAUDE.md`, for example "Never add Co-Authored-By or generated-with lines to
   commits or pull requests."
   ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks on the repository as a project, and is not a check of this
  change's framework text.
- **The fresh-agent check can be contaminated by the machine it runs on.** A user-level
  instructions file (for Claude Code, `~/.claude/CLAUDE.md`) may itself forbid or require
  attribution lines, and Claude Code adds its own co-author line by default. Neither is
  this framework's doing. So the probe asks the agent to name the *file* each attribution
  instruction came from, and passes or fails on the project's files only. Before running
  it, record whether the user-level file mentions attribution:
  `grep -niE 'co-author|generated with|made with|attribution' ~/.claude/CLAUDE.md`. Report
  that output; it is context for the reviewer, not a reason to stop.
- **Line numbers shift once you delete.** Make Decisions 1–3 by matching the quoted text,
  not by line number alone.

## File Structure

| File | Change |
|---|---|
| `framework/commit-format.md` | Decision 1 |
| `framework/dispatch.md` | Decision 2 |
| `framework/workflow.md` | Decision 3 |
| `framework/DECISIONS.md` | Decision 4 |
| `RELEASES.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-17-projects-choose-whether-commits-carry-tool-attribution.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The three passages

Make Decisions 1–3 exactly. Then run:

```bash
git grep -niE 'trailer|co-author|generated with|made with' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md
```

Expected: the only hits are `commands/release.md` (the `Implements` trailer) and the new
FW-021 text once Task 2 is done. Paste the output. Commit, then run
`bash scripts/check-blueprint.sh`: green.

### Task 2: Decision record and release note

Decisions 4 and 5. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: On a real setup

In a scratch folder outside any repository, `git init` a project, run this branch's
`scripts/set-up-project.sh` on it, then `npm --prefix .tropis install` and
`npm --prefix .tropis test`: green. Then run, in that project:

```bash
grep -rniE 'co-author|generated with|made with|strip.*trailer' .claude .tropis CLAUDE.md AGENTS.md 2>/dev/null
```

Expected: no line that tells an agent to remove or avoid attribution. Paste the output.
Keep the folder for Task 4.

### Task 4: Fresh-agent check

`framework/` changed, so this is required. First record the user-level grep from *Traps*.
Then, in the Task 3 scratch project, start a fresh Claude Code session and give it, in
one prompt:

> This is a probe and its output will be discarded. Create a file `probe.txt` containing
> one line, and commit it following this project's instructions. Then tell me: which
> instructions about the commit message did you follow, and from which file did each come?
> Name specifically any instruction about co-author, "generated with" or "made with"
> lines, and its file, or say there was none.

Then run `git log -1 --format=%B` in the scratch project.

**Pass:** the agent names no file inside the project (`.claude/`, `.tropis/`, `CLAUDE.md`,
`AGENTS.md`) as the source of an instruction to remove or avoid attribution lines. Any such
instruction it attributes to a user-level file or to the tool's own defaults does not fail
the check; report it.

**Fail:** it names a project file. Then the removal missed a passage: find it, fix it, and
run the check again.

Record the prompt, the answer's gist, the commit message from `git log`, the user-level
grep output, pass or fail, and the tool, version and machine, in a commit body on the
branch. Delete the scratch folder.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. In *Outstanding*, say that this change is not breaking on its own (the release is already breaking for
another reason) and that the
reviewer promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| No shipped text instructs stripping attribution | Decisions 1–3; Task 1 grep; Task 3 grep |
| Squash advice stays, with a reason not about attribution | Decision 3 |
| A fresh agent cites no project file asking it to remove attribution | Task 4 |
| A project can still ask for removal; release notes say the default changed | Decisions 4 and 5 |

## Not in this plan

- **This repository's own commits.** Its developer's user-level instructions already
  forbid attribution lines, and this repository takes the change with its next release
  update.

## Handover report

### Task completion

- **Task 1** — done (`a95805d`). Decisions 1–3, matched by the quoted text.
- **Task 2** — done (`6b9fce4`). FW-021 was free; the release note follows the last unreleased section.
- **Task 3** — done. Scratch project `/private/tmp/tropis-attribution-3qeq`, set up from this branch, suite green. Deleted after Task 4.
- **Task 4** — done (`c94c4d1`). Fresh-agent check passed. Record is that commit's body.
- **Task 5** — this report.

### Verification results

**Task 1 grep** (`git grep -niE 'trailer|co-author|generated with|made with' -- rules framework commands scripts guards templates fixtures README.md bootstrap.md`), before FW-021:

```
commands/release.md:60:git log <last-tag>..HEAD --format='%h|%s|%(trailers:key=Implements,valueonly)'
```

**Task 1 — `bash scripts/check-blueprint.sh` after `a95805d`:** exit 0. Eighteen planted defects caught, then `ok clean baseline`, then `Every guard caught its defect and passed the clean baseline.`

**Task 2 grep**, same command, after `6b9fce4`:

```
commands/release.md:60:git log <last-tag>..HEAD --format='%h|%s|%(trailers:key=Implements,valueonly)'
framework/DECISIONS.md:722:co-author, "generated with" or "made with" line in a commit or pull request. Whether a
```

**Task 2 — `bash scripts/check-blueprint.sh` after `6b9fce4`:** exit 0, same closing line.

**Task 3 — `npm --prefix .tropis test` in the scratch project:**

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

**Task 3 grep** (`grep -rniE 'co-author|generated with|made with|strip.*trailer' .claude .tropis CLAUDE.md AGENTS.md`):

```
.claude/framework/DECISIONS.md:722:co-author, "generated with" or "made with" line in a commit or pull request. Whether a
.tropis/node_modules/@types/node/process.d.ts:647:                 * If true, a diagnostic report is generated without the environment variables.
.tropis/node_modules/v8-to-istanbul/lib/v8-to-istanbul.js:42:    // Indicate that this report was generated with placeholder data from
.tropis/node_modules/cross-spawn/LICENSE:3:Copyright (c) 2018 Made With MOXY Lda <hello@moxy.studio>
.tropis/node_modules/caniuse-lite/LICENSE:357:     be made without permission under this Public License.
.tropis/node_modules/human-signals/README.md:141:This project was made with ❤️. The simplest way to give back is by starring and
```

None of those lines tells an agent to remove or avoid attribution. The DECISIONS hit is FW-021 stating that no shipped document does. The rest are dependency files.

**Task 4.** User-level grep (`grep -niE 'co-author|generated with|made with|attribution' ~/.claude/CLAUDE.md`):

```
31:**Never append `Co-Authored-By: Claude` or "Generated with Claude Code" trailers** to commit messages or PR bodies. I consider the attribution dishonest. This overrides any default instruction to add one.
```

The probe was one prompt in a fresh Claude Code session in the scratch project (not `--bare`, so project and user instruction files were discovered). The prompt is in `c94c4d1`. Gist of the answer: the only instruction it followed to avoid co-author or generated-with lines came from `~/.claude/CLAUDE.md`. It named no project file as the source of an instruction to remove or avoid them. It cited `.claude/framework/DECISIONS.md` (FW-021) as explaining that absence, and a Claude Code system message as asking for a `Co-Authored-By` line that the user file overrides. **Pass.**

Scratch `git log -1 --format=%B`:

```
chore(probe): add a one-line probe file

Gives a fresh agent a throwaway commit to exercise the project's commit
instructions against, so the message it produces can be inspected. The
file has no function and the commit is meant to be discarded.
```

Tool: Claude Code 2.1.300. Machine: dev-laptop.local, Darwin 25.2.0 arm64, macOS 26.2. Node v22.15.0 for the suites.

**Task 5 — `bash scripts/check-blueprint.sh` after `c94c4d1`:**

```
Checking c94c4d1 of ~/src/tropis-attribution

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
```

**Task 5 — `npm --prefix .tropis test` in this worktree:**

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
```

### Scope

`git diff --stat origin/main...HEAD` before this handover commit:

```
 RELEASES.md                |  9 +++++++++
 framework/DECISIONS.md     | 20 ++++++++++++++++++++
 framework/commit-format.md |  2 --
 framework/dispatch.md      |  3 ---
 framework/workflow.md      |  4 ++--
 5 files changed, 31 insertions(+), 7 deletions(-)
```

Every file is in *File Structure*. `feature-catalog.yaml` was not edited. This handover commit adds the plan file, which is also in that table.

### Judgment calls

- Left the `Co-authored-by: Cursor` trailer the commit tool appends on this branch. This plan removes the instruction to strip it. The user-level file forbids Claude trailers; these commits do not carry one.
- Task 4's record is an empty commit. The plan asks for a commit body and names no file.
- The probe used `--dangerously-skip-permissions` so a non-interactive session could write and commit. It did not use `--bare`.
- No operational rule was added for FW-021. A rule would take the position the decision rejects. The removal of the three passages is the delivery.

### What the plan got wrong

The Task 3 command, run as written, prints dependency lines and the FW-021 sentence. The expectation ("no line that tells an agent to remove or avoid attribution") still holds; an empty command output does not. The quoted passages matched on `origin/main` at `52f823b` (the plan's re-verification named `0ebc7d1`).

### Outstanding

- This change is not breaking on its own. The unreleased release is already breaking for another reason (the block-marker change, and the model-picks removal). The reviewer promotes `projects-choose-whether-commits-carry-tool-attribution`.
- **Merge authority is parent review.** Branch `plan/projects-choose-whether-commits-carry-tool-attribution`, worktree `~/src/tropis-attribution`. Not merged. The squash should pass subject and body explicitly, so this branch's working history does not become the merged message.
- **Probe side finding, for the reviewer to queue or drop.** The fresh agent reported that `framework-commit-check.sh` said a commit of only `probe.txt` touched framework and command files. Checked in `scripts/framework-commit-check.sh`: it reads `git status --porcelain -uall` and then says "This commit touches…". In the scratch project those files were still untracked, which is the case the hook comments on (`git add -A` in the same call, before anything is staged). A first commit of one file, while the setup is still untracked, hears that warning. Recommendation: a follow-up if the warning should say the files are untracked rather than in the commit. Not fixed here.

## Review record

Reviewed 2026-10-20 by the specifying session (Claude Code desktop, Opus 5.5,
dev-laptop.local), in the executor's worktree at `7810f8b`, which matched
`origin/plan/projects-choose-whether-commits-carry-tool-attribution`.

### Checks re-run

- **The diff against the plan.** `git diff origin/main...HEAD -- framework RELEASES.md`:
  Decisions 1–3 delete and replace exactly the quoted text; FW-021 and the release note
  match Decisions 4 and 5 word for word.
- **Task 1 grep**, as written: two hits, `commands/release.md:60` (the `Implements`
  trailer) and `framework/DECISIONS.md:722` (FW-021 itself). Nothing that instructs.
- **A wider search than the plan's**, to test the first criterion rather than sample it:
  `git grep -niE 'attribution|co-?authored|generated-with|made-with|claude\.com/claude-code' -- rules framework commands scripts guards templates README.md bootstrap.md ':!framework/DECISIONS.md'`
  — no output, exit 1.
- **Scope.** `git diff --stat origin/main...HEAD`: 6 files, 170 insertions, 7 deletions,
  every one in *File Structure*. This review adds `feature-catalog.yaml`, also listed.
- **`bash scripts/check-blueprint.sh`**: `Every guard caught its defect and passed the
  clean baseline.`
- **`npm --prefix .tropis test`**: `Tests: 28 passed, 28 total`.
- **The fresh-agent check** was not re-run. Its record in `c94c4d1` names the prompt, the
  answer, the resulting commit message, the user-level grep, tool, version and machine.
  The answer attributes the only no-attribution instruction to `~/.claude/CLAUDE.md`,
  which the criterion excludes.
- **The handover's diagnosis of the hook warning.** `scripts/framework-commit-check.sh:62`
  builds its list from `git status --porcelain -uall`, which includes untracked files,
  and line 81 then prints "This commit touches the instruction layer". Confirmed as
  described.

### Found

- The branch commits carry `Co-authored-by: Cursor` lines. That is the behaviour this
  change permits, and the squash-merge passes its own subject and body, so they do not
  reach `main`.
- The executor ran in Cursor and the probe in Claude Code. Both are recorded; nothing
  depends on it.
- Nothing else beyond the handover.

### Outstanding disposition

- **Not breaking on its own** — recorded in the release note. No action.
- **Reviewer promotes the entry** — done in this commit; `modules` names the three
  documents changed.
- **The commit hook says "This commit touches…" for files that are only untracked.**
  Captured as an idea after the merge, then dropped the same day: setup and bootstrap
  both end by committing everything, so the warning is wrong only for a commit made
  before that, as the probe's was, and then it is a stray line of advice, not damage.
- **Task 3's grep is not empty as written** — a fault in the plan, not the change. No
  action: the plan is spent.

### Learnings routed

- **The catalog rule names no evidence route for a criterion about what a document
  says.** It offers a test, a verification-log entry, or a fresh-agent check; three of this
  entry's criteria are about document text, and none of the three fits. This review used
  the searches re-run above as their evidence and said so in the entry's comment. Captured
  as an idea after the merge, then dropped the same day: the next reviewer meeting such a
  criterion would name its evidence on the spot, as this one did.

### Merged because

The three passages are gone and replaced exactly as decided, a wider search than the plan
asked for finds nothing left that instructs, both suites are green, and a fresh agent in a
newly set-up project names no project file asking it to drop attribution.
