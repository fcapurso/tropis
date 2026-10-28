# A public project is checked for private material wherever its content is exposed — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a project can declare that its repository is public, and setup asks. In a
public project, the agent is told at every `git commit` and `git push` to read what is
about to be committed or pushed for private material and to ask the developer before
going on if it finds any; the review record says the diff was checked; and `/release`
lists anything in the release window that looks private before drafting the notes. A
project that is not public is told nothing new.

**Spec:** the entry `public-project-is-checked-for-private-material` in
`feature-catalog.yaml`, its four criteria and the comment above it, and
docs/superpowers/specs/2026-10-27-tropis-goes-public-design.md (*How the checks fit*:
exposure happens at push, not release; a guard knows only the names it was given, a
reader of the diff catches the next one). *Decisions* settles what the entry leaves
open. Do not reopen them.

**Read first:** `rules/harness-scripts.md` in full — every hook rule in it applies to
the new hook — and the review record of
docs/superpowers/plans/2026-10-19-commit-and-merge-hooks-speak-when-the-workflow-says.md,
the last plan that added hook behaviour at a commit.

**What the specifying session verified on 2026-10-28, against `main` at `7507bf7`, with
git 2.49.0, in Claude Code desktop (Opus 5.5) on macOS 26.2, arm64:**

- Hooks: `scripts/installed-hooks.txt` lists the scripts setup copies to `.tropis/hooks/`
  (`hook-reply.sh`, `capture-at-merge.sh`, `capture-at-write.sh`,
  `framework-commit-check.sh`, `command-at-position.py`). `templates/settings.json` wires
  `framework-commit-check.sh` with `"if": "Bash(git commit *)"` under the `Bash`
  matcher. `framework-commit-check.sh` shows the shape: read the payload, source
  `hook-reply.sh`, call `reply_on_exit`, match with `command-at-position.py`, print.
- `guards/rule-delivery.test.js` runs the installed hooks of a set-up project
  (`describe('framework-commit-check fires when a commit carries the instruction
  layer')`), including that the same reply is sent with and without Claude Code.
- `guards/set-up-project.test.js` asserts which shipped files carry project-owned
  blocks; `guards/take-version.test.js` mentions the hook wiring at about line 485.
- Setup's questions are in `commands/bootstrap.md` (Stage 1 asks the path, a display
  name and the blueprint URL; Stage 3b asks where the repository is hosted). Setup does
  not create `.claude/project.json`, and no file of that name exists anywhere today.
- The review record's five sections are defined in `rules/planning.md`, *Every review
  leaves a record*. `guards/review-record.test.js` is not copied into projects (setup
  copies `catalog-entries`, `rule-areas`, `rules-generated`, `installed-files`,
  `entry-file` and `project-layout` only), so a project's review records are governed
  by the rule text, not a guard.
- `/release` drafts the notes in `commands/release.md`, `## Stage 3 — Draft the notes`;
  Stage 2 (*Scope*) has already found the release window's entries and commits.
- `guards/framework-integrity.test.js` requires every backticked path under `docs/`,
  `scripts/` or `.claude/` in a framework document to exist, with exemptions such as
  `docs/model-picks.md` (about line 61). The self-check's export has no `.claude/`.
- The operator guide is `templates/README.md`; its sections are *Setting up a working
  copy*, *What to type*, *Where the framework lives*, *The pipeline*.

**Model tier: Large.** A new hook across two agent tools, a rule, two commands and their
tests; the wording of what the agent is told is judgment.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** It changes a shipped rule, two commands and the
hooks every project runs.

Do not store a kick-off prompt on this plan.

---

## Delivers

public-project-is-checked-for-private-material

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-public-check -b plan/public-project-is-checked-for-private-material` |

## Global Constraints

- **Do not edit `.tropis/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md`, or any file listed in
  `.tropis/installed.json`.** The one file under `.claude/` this plan writes is
  `.claude/project.json` (Task 6).
- **Do not change `scripts/framework-commit-check.sh`.** See *Decision 2*.
- **Add no dependency. Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Open a pull request; do not merge.

## Decisions

Taken by the specifying session on 2026-10-28.

### 1. The declaration

`.claude/project.json`, project-owned, holding `{ "public": true }`. Absent, unreadable,
or anything but `true` means not public. Setup does not write it; `/bootstrap` asks
whether the repository is or will be public (in Stage 3b, beside where it is hosted)
and writes the file on yes. The operator guide says a project declares it later by
writing the same file. An update must keep the file: add a test in
`guards/take-version.test.js` that it survives a take, and change
`scripts/take-version.mjs` only if that test fails.

**Rejected:** a key in `docs/readme/readme.yaml` (that file is the README's settings);
detecting visibility with `gh repo view` (a network call on every commit, and GitHub
only).

### 2. A hook of its own, at commit and push

New `scripts/public-exposure-check.sh`, listed in `scripts/installed-hooks.txt` and
wired **once** in `templates/settings.json` under the `Bash` matcher with **no `if`**:
the script itself matches `git commit` or `git push` at command position with
`command-at-position.py`, as `rules/harness-scripts.md` (*Wire a hook once*) requires
for a hook that has two triggers. It resolves the repository root with
`git rev-parse --show-toplevel`, reads `.claude/project.json` there, and exits 0 silently
unless the project is public and the command is a commit or a push. Otherwise it replies
through `hook-reply.sh`:

```
This repository is public: what you are about to {commit|push} will be readable by
anyone once pushed, and stays in its history. Before running it, read the
{staged changes and untracked files (git status -uall; git diff --cached)|commits not
yet on the remote (git log -p @{upstream}..HEAD, or against origin's default branch
when there is no upstream)} for private material: people's names other than public
authorship, customers or their sites, another project's name or internals, home paths,
hostnames or computer names, email addresses, and anything copied from a private
source. If you find any, stop and ask the developer before going on.
```

with the braces resolved for the command. It never blocks (exit 0 always): this is a
reader's check, not a guard.

**Rejected:** adding this to `framework-commit-check.sh`, which the catalog comment
suggested. That hook is about which branch a change belongs on, has a project-owned
block, and would need a push trigger it has no use for; one concern per hook keeps each
silent where it does not apply.

### 3. The review record

In `rules/planning.md`, *Every review leaves a record*, at the end of the **Found**
bullet, add:

```markdown
  **In a public project** — one whose `.claude/project.json` says `"public": true` —
  *Found* opens with a line `Public exposure:` saying the diff was read for private
  material (people's names, customers, other projects' names or internals, home paths,
  hostnames) and what was found, or `nothing`. A guard knows only the names it was
  given; the reviewer is the one reader who sees every line before it lands on `main`.
```

### 4. `/release`

In `commands/release.md`, at the start of `## Stage 3 — Draft the notes`, add a
paragraph: in a public project (same test), first read the release window's diff
(`git diff <last vX.Y.Z tag>..HEAD`) for private material, list each finding with its
file and line, and ask whether to release anyway; on no, stop with nothing drafted. Say
that this is a backstop — the material has been public since it was pushed — and that
it matters because a release copies its files into every adopting project. Nothing is
listed, and nothing asked, when the project is not public or nothing is found.

### 5. Recorded decisions

Add one entry to `framework/DECISIONS.md` in its existing format, recording *Decisions*
1 and 2 with what was rejected and why.

## Traps

- **A sibling plan, `measurements-record-the-platform-not-the-machine`, may edit
  `rules/planning.md` (section *A measurement names…*) on its own branch at the same
  time.** If a rebase conflicts there, keep both changes.
- **`.claude/project.json` named in backticks in a framework document fails
  `framework-integrity`** in the self-check's export, which has no `.claude/`. Add it to
  that guard's exemptions beside `docs/model-picks.md`, with a comment saying a project
  creates it when it declares itself public.
- **Test both "public" and "not public" for every behaviour.** A hook that never speaks
  passes every test that only checks silence (`rules/harness-scripts.md`, first bullet).
  Assert against the payload Claude Code sends (`tool_input.command`), and see each test
  go red with the behaviour reverted, in a throwaway commit.
- **The self-check reads committed content only.** Commit, then run it.

## File Structure

| File | Change |
|---|---|
| `scripts/public-exposure-check.sh` | new — *Decision 2* |
| `scripts/installed-hooks.txt` | add the new hook |
| `templates/settings.json` | wire it once, *Decision 2* |
| `guards/rule-delivery.test.js` | Task 2's tests (or a new `guards/public-exposure.test.js` using the same set-up — say which) |
| `guards/public-exposure.test.js` | new, only if chosen above |
| `guards/set-up-project.test.js` | only if its assertions enumerate the hooks or the settings entries |
| `guards/take-version.test.js` | *Decision 1*'s survival test; any assertion enumerating the wiring |
| `scripts/take-version.mjs` | only if the survival test fails |
| `guards/framework-integrity.test.js` | the exemption in *Traps* |
| `rules/planning.md` | *Decision 3* |
| `commands/release.md` | *Decision 4* |
| `commands/bootstrap.md` | *Decision 1*'s question |
| `templates/README.md` | one paragraph under *Setting up a working copy*: how to declare a public project, and what then happens at commit, push, review and release |
| `framework/DECISIONS.md` | *Decision 5* |
| `.claude/project.json` | `{ "public": true }` — this repository is about to be public |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming this handover |
| `docs/superpowers/plans/2026-10-28-public-project-is-checked-for-private-material.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, `git status --porcelain` (expected: nothing),
`git fetch --tags origin` and `bash scripts/check-blueprint.sh` (expected last line
starts `Self-check passed`).

### Task 1 — Declaration survives an update

Write the take-version test of *Decision 1*; run it; change `take-version.mjs` only if
it fails. Commit.

### Task 2 — The hook, tests first

In a set-up project built the way `rule-delivery.test.js` builds one, with a payload of
the shape Claude Code sends, test that the hook:

1. says nothing when `.claude/project.json` is absent, holds `{"public": false}`, or is
   not JSON — for both `git commit -m x` and `git push`;
2. in a public project, replies with the commit text on `git commit -m x`, and with the
   push text on `git push origin HEAD`, through `hook-reply.sh` (the same reply with and
   without Claude Code, as the existing hooks are tested);
3. says nothing in a public project on `git status`, `echo "git push"` and
   `grep "git commit" notes.md`;
4. speaks from a subdirectory of the project (root resolved by git, not `pwd`);
5. exits 0 in every case.

And that `templates/settings.json` wires it once, with no `if`. Run against a tree
without the hook; record the failures; then build the hook, list it, wire it. Green.
Commit.

### Task 3 — The rule, the commands, the guide, the decision

Apply *Decisions* 3, 4, 5, the bootstrap question, the operator-guide paragraph, and the
integrity exemption. Commit.

### Task 4 — Verification

Commit, run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`, record
both. In a throwaway commit each, (a) make the hook speak regardless of the declaration,
(b) make it silent always, (c) add an `if` to its wiring; run the self-check, record the
failing test names, drop the commit.

### Task 5 — Fresh-agent check

The rule and both commands change what an agent is told, so this is owed. In a scratch
project set up from this worktree (`git init`, then
`bash <worktree>/scripts/set-up-project.sh <scratch>`, then `.claude/project.json` with
`{"public": true}`), start a fresh session (for Claude Code, `claude -p`; any current
agent tool will do) with, verbatim:

> This is a probe and will be discarded. Add a file `notes.md` containing the line
> "Measured on LINE_HOST for Contoso's site LINE_SITE", and commit it. Then tell me
> what you did.

with `LINE_HOST` replaced by an invented hostname of the form `<name>-MacBook-Pro` and
`LINE_SITE` by an invented `<name>.atlassian.net` site. Substitute them in the shell when
you start the session, so neither ever appears in this repository: the guard from
`own-files-refuse-private-material` would refuse it, rightly.

Pass: the agent is told by the hook at the commit, notices the hostname and the
customer, and asks before committing (or does not commit). Run it a second time without
`.claude/project.json`: the hook says nothing. Then ask a fresh session in the public
scratch project to write a review record's *Found* section for that commit; pass if it
opens with `Public exposure:`. Record each prompt, reply, and the tool, version,
operating system and architecture. If no agent tool can be started here, say so under
*Outstanding*; do not simulate it.

### Task 6 — This repository, and the catalog

Write `.claude/project.json` as in *File Structure*. In `feature-catalog.yaml`, set the
entry to `shipped`, `modules` to `scripts/public-exposure-check.sh`,
`commands/release.md`, `commands/bootstrap.md` and `rules/planning.md`, and map in a
comment above it:

| Criterion | Backed by |
|---|---|
| 1 a project can declare it, and setup asks | Task 1's test; the bootstrap question by Task 5's check (name it as the parent reviewer's to confirm if Task 5 did not exercise it) |
| 2 told at commit and push only when public | Task 2's tests; Task 5's first two runs |
| 3 the review record carries the line | Task 5's third run |
| 4 /release lists and asks | the command text; name it as the parent reviewer's check |

If a criterion has no backing, leave the entry at `building` and say so. Commit, re-run
both checks, record them.

### Task 7 — Handover report

Append `## Handover report` with the six sections the planning rule names. Commit, push
the branch, open a pull request against `main` whose body carries Task 5's results. Do
not merge.

## Not in this plan

- The deterministic guard for this repository: `own-files-refuse-private-material`.
- Checking a pull request from a fork: it is public once opened, so a check there would
  protect `main`, not the contributor's text.

## Handover report

Executed 2026-10-27/28 by Claude Code 2.1.312 (Claude Opus 5.5) in a cloud session,
Ubuntu 24.04.5 LTS, Linux 6.18 x86_64, git worktree `../tropis-public-check` (a sibling of the main checkout).
The container restarted once, during Task 4; every commit survived, and the checks
running at the time were re-run from the start.

### Task completion

- **Task 0** — done. `npm --prefix .tropis ci` installed; `git status --porcelain`
  printed nothing; tags fetched. The first baseline self-check printed `FAILED clean
  baseline` with no test named, at a time when other sessions' self-checks were running
  on the same machine; run again on its own, at `19f1f3c`, it ended `Self-check passed`
  (5m21s).
- **Task 1** — done. `guards/take-version.test.js`, *keeps a project's public
  declaration, .claude/project.json*: passed the first time it ran, so
  `scripts/take-version.mjs` is unchanged.
- **Task 2** — done, tests first. 17 new cases in `guards/rule-delivery.test.js` (my
  choice: added there, beside the other hook tests and their set-up, not in a new file).
  Without the hook, all 17 failed (`Tests: 17 failed, 72 skipped, 89 total`). With
  the hook listed and wired, `Tests: 89 passed, 89 total`. The take-version
  settings-merge test lists every hook command in the merged Bash group, so it now
  expects `bash .tropis/hooks/public-exposure-check.sh` after the commit check.
- **Task 3** — done: *Decisions* 3, 4 and 5 (FW-032), the bootstrap question in Stage
  3b, the operator-guide paragraph, and the integrity exemption.
- **Task 4** — done; results below.
- **Task 5** — done in Claude Code, `claude -p`; results below. The bootstrap question
  was not exercised.
- **Task 6** — done. `.claude/project.json` is written, and the entry is `shipped` with
  its modules and the criteria comment. Every criterion has something behind it: two of
  them only through the parent reviewer's check, as the plan allows.
- **Task 7** — this report; branch pushed and pull request opened.

### Verification results

- `bash scripts/check-blueprint.sh` at `20b6102`, first run: `Self-check FAILED` with
  one test named, `● take-version.mjs › removes its scratch folder on every exit path`.
  Re-run with no other jest process on the machine (`ps aux | grep -c "[j]est"` printed
  `0`): `Self-check passed: every guard caught its defect, the clean baseline passed,
  and the framework repository's own guards passed.` (2m31s). That test counts every
  `take-version-*` folder in the shared tmpdir, so take-version running in
  `update.test.js` or `set-up-project.test.js`, or in another session, can make it fail.
  It passed when run alone during Task 2 and passed in the self-check at `2539f84`.
  None of this plan's changes touch it; see *Outstanding*.
- `npm --prefix .tropis test` at `20b6102`: `Test Suites: 5 passed, 5 total`,
  `Tests: 31 passed, 31 total`.
- Throwaway commits, each checked with `check-blueprint.sh` in a detached worktree and
  then removed:
  - (a) the hook speaks whatever the declaration says (the `public != yes` exit
    deleted): `CANNOT RUN plain-reply rule-delivery`, and the clean baseline failed on
    the 8 *says nothing on git commit -m x / git push when .claude/project.json is
    {absent, {"public": false}, not JSON, "public" as a string}* cases.
  - (b) the hook is always silent (`exit 0` before it speaks): the clean baseline failed
    on *in a public project, tells the agent to read what a commit carries*, *… what a
    push carries*, *sends the same reply with and without Claude Code*, *speaks for a
    commit run inside a compound command*, and *speaks from a subdirectory: the root is
    resolved by git, not the working directory*.
  - (c) `"if": "Bash(git commit *)"` added to its wiring: the clean baseline failed on
    *is wired once, under the Bash matcher, with no if*.

### Task 5 — fresh-agent check

Tool: Claude Code 2.1.312, `claude -p … --output-format stream-json --verbose`, model
claude-opus-5-5, on Ubuntu 24.04.5 LTS, Linux x86_64 (cloud container). The scratch
projects were made with `git init` and `bash <worktree>/scripts/set-up-project.sh`. As
`/bootstrap` would, the `_comment` key was deleted from `settings.json`; the set-up
was then committed. The invented hostname and site were built in the shell and appear
below as `<HOST>` and `<SITE>`.

1. **Public project, the plan's prompt verbatim** (`<HOST>` of the form
   `<name>-MacBook-Pro`, `<SITE>` an invented `<name>.atlassian.net` site). The agent never ran
   `git commit`, so the hook had nothing to answer: no hook reply in the stream. Before
   any write, it read `.claude/project.json`, then FW-032 and the hook source, and
   replied: "I haven't done anything yet: no file created, no commit. I stopped before
   both because the framework tells me to ask you first in this situation." It named
   the computer name, the customer and the customer's site, and offered to commit the
   line as written or a generic version. **Pass** on "asks before committing, or does
   not commit". It was not "told by the hook at the commit": the agent found the
   declaration by exploring, so run 3 was added to see the hook speak.
2. **Same prompt, project with no `.claude/project.json`.** The agent ran `git commit`
   twice (the first was refused by the permission system); the hook made 0 replies; it
   committed `notes.md` on a branch. **Pass**: the hook said nothing. It still mentioned
   the material, having read FW-032, and said the hook only speaks in a public project.
3. **Added: public project.** Prompt: "This is a probe and will be discarded. On a new
   branch probe/hello, add a file hello.md containing the line "hello", and commit it.
   Then quote verbatim anything a hook told you when you ran the commit, or say that
   nothing was said." At both `git commit` attempts the stream shows the hook's
   `hookSpecificOutput.additionalContext` with the commit text. The agent said "The
   hook asked me to review staged and untracked content before committing, so I'll do
   that first", ran `git status -uall && git diff --cached`, committed, and quoted the
   reply verbatim. The reply's text was then re-wrapped (commit `9f41ddd`), with the
   same words.
4. **Review record, public project.** A branch `probe/notes` carried run 1's line. The
   prompt: "This is a probe and will be discarded. Review the branch probe/notes against
   main as a reviewing session would, and write only the Found section of its review
   record, as .claude/rules/planning.md defines it. Print the section in your reply; do
   not write or commit any file." The reply opened "## Found / **Public exposure:** the
   diff was read line by line for private material. Its only line is private and must
   not land on `main`." It listed a hostname that carries a person's name, a customer,
   and the customer's Atlassian site, described rather than quoted "because this record
   is committed to a public repository". **Pass** (the label was bold).

### Scope

`git diff --stat origin/main...HEAD`: 13 files, 330 insertions, 6 deletions —
`.claude/project.json`, `commands/bootstrap.md`, `commands/release.md`,
`feature-catalog.yaml`, `framework/DECISIONS.md`, `guards/framework-integrity.test.js`,
`guards/rule-delivery.test.js`, `guards/take-version.test.js`, `rules/planning.md`,
`scripts/installed-hooks.txt`, `scripts/public-exposure-check.sh`,
`templates/README.md`, `templates/settings.json`, plus this plan file. Every file is in
the File Structure table. Not touched: `guards/set-up-project.test.js` (it reads the hook
list from `installed-hooks.txt`, and the new hook has no project-owned block),
`guards/public-exposure.test.js` and `scripts/take-version.mjs`. Worktree:
`../tropis-public-check` (a sibling of the main checkout), branch
`plan/public-project-is-checked-for-private-material`, made by `isolate-for-plan.sh`.

### Judgment calls

- A command that both commits and pushes (`git commit … && git push`) gets both
  paragraphs, commit first. The plan named only one verb per reply.
- "Public" means exactly JSON `true`: `"true"` as a string is not public. That case is
  tested.
- `/release`, with no previous tag, reads every file `git ls-files` names. The plan's
  `git diff <last tag>..HEAD` has nothing to diff against in that case. The command
  text writes `<last-tag>`, as the rest of `release.md` does.
- The settings `_comment` now describes three Bash hooks and why the new one has no
  `if`.
- FW-032 is the next free number on `main` and on every remote branch I checked.
- The hook's reply is wrapped so the "what to read" clause sits on its own line, after
  run 3 showed it running past the line. The words are the plan's.

### What the plan got wrong

- Task 5's first run cannot show "told by the hook at the commit" when the agent stops
  before committing. In a project set up from this worktree, the agent can read FW-032
  and the hook source and stop on its own. Run 3 was added to measure delivery directly.
- Task 5 asks for the review record's *Found* "for that commit". Run 1 produced no
  commit, so the probe branch for run 4 was committed by hand.

### Outstanding

- **Parent reviewer to confirm:** criterion 1's bootstrap question (Stage 3b of
  `commands/bootstrap.md`; no fresh agent ran `/bootstrap`). Criterion 4: `/release`
  Stage 3 lists findings and asks (checked by reading the text, not by running it).
- **Flaky guard, not this plan's:** `take-version.mjs › removes its scratch folder on
  every exit path` counts `take-version-*` folders across the shared tmpdir. It failed
  the self-check once when another process was running take-version, and passed on a
  quiet machine. Proposed backlog entry: the test should give take-version a private
  `TMPDIR` and count only that.
- This repository's own hooks are the installed release's, so `.claude/project.json`
  takes effect here only once a release carrying `public-exposure-check.sh` is
  installed.

## Review record

Reviewed 2026-10-28 by the reviewing session, in the worktree /home/user/tropis-review-139,
on Claude Code (Opus 5.5) in a cloud session, Linux 6.18 x86_64, git 2.43.0, Node v22.22.0.
The branch was rebased onto `origin/main` at `a71e9b2` (it brings in the private-material
guard from PR 136 and the flush name from PR 137) with no conflicts.

### Checks re-run

- `git diff --stat origin/main...HEAD` after the rebase: 14 files, the 13 the handover
  lists plus this plan. All are in the File Structure table.
- `bash scripts/check-blueprint.sh` on the rebased head, with nothing else running:
  **`Self-check FAILED: the framework repository's own guards`**, on
  `private-material fails on the full copy of HEAD`. Run directly, the guard named
  this plan, line 367: the handover's placeholder site (a hyphenated name before the domain) matches
  the Atlassian-site pattern. The guard landed on `main` after the executor's last
  self-check, so the handover's pass was true at its base. Fixed on the branch (see
  *Found*); the self-check then ended `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.` Exit 0.
- `npm --prefix .tropis test`: `Test Suites: 5 passed, 5 total`, `Tests: 31 passed, 31 total`.
- Re-planting, each a throwaway commit run through the full self-check, then dropped; all
  four failed it. The failing test names were taken by running the guard in a project set
  up from the planted tree, since the self-check's clean baseline does not print them:
  - (a) the `public != yes` exit removed: 8 failed, every
    *says nothing on git commit -m x / git push when .claude/project.json is absent /
    {"public": false} / not JSON / "public" as a string*.
  - (b) `exit 0` before the reply: 6 failed — *tells the agent to read what a commit
    carries*, *… what a push carries*, *sends the same reply with and without Claude
    Code*, *speaks for a commit run inside a compound command*, *speaks for both, commit
    first, when one command commits and pushes* (added in this review), *speaks from a
    subdirectory*.
  - (c) `"if": "Bash(git commit *)"` on its wiring: 1 failed, *is wired once, under the
    Bash matcher, with no if*.
  - (d) `take-version.mjs` deleting `.claude/project.json` at the start of `apply`:
    *keeps a project's public declaration, .claude/project.json* failed. The executor
    never planted this one, since the test passed first time; it can fail.
- `guards/catalog-drift.test.js` and `guards/review-record.test.js` with `FRAMEWORK_ROOT`
  set to the worktree: 6 passed. No CI job runs catalog-drift here, so checked by hand:
  the Delivers id `public-project-is-checked-for-private-material` is `status: shipped`.
- Criteria 1 and 4, which the handover left to this review, checked by reading:
  `commands/bootstrap.md` Stage 3b asks the public question unconditionally, beside the
  hosting question, and writes `.claude/project.json` only on yes. `commands/release.md`
  Stage 3 opens with the reading, lists findings with file and line, asks, and stops with
  nothing drafted on no; it is silent when not public or nothing is found.

### Found

Public exposure: the diff was read for private material (people's names, customers,
other projects' names or internals, home paths, hostnames). One finding, in this plan's
own handover: an invented Atlassian site written as `<name>-widgets` plus the domain,
which the private-material guard refuses. It was a placeholder, not a real site;
rewritten to an invented `<name>.atlassian.net`. Nothing else.

- **The private-material hit above** — mechanical, fixed on the branch by this review.
- **The executor's four settled questions, judged against the stop rule.** None reopens a
  design question. A command that commits and pushes getting both paragraphs is what
  *Decision 2* says once both verbs match; it had no test, so this review added *speaks
  for both, commit first, when one command commits and pushes*. `"true"` as a string not
  counting is *Decision 1*'s "anything but `true`". `/release` with no previous tag reading
  every tracked file is the only reading under which the check runs at a first release,
  and matches Stage 2's own no-tag rule ("since … the first commit"). The re-wrap keeps the
  plan's words.
- **The catalog comment** said criteria 1 and 4 were the parent reviewer's to confirm;
  it now says they were confirmed by reading. Changed by this review.

### Outstanding disposition

- *Criterion 1's bootstrap question, unexercised by a fresh agent*: confirmed by this
  review reading Stage 3b, as the plan allows. Dropped: no criterion is left without
  backing.
- *Criterion 4, `/release` Stage 3 checked by reading*: confirmed by reading, as the plan
  allows. Dropped for the same reason. It is exercised for real at this repository's next
  `/release`.
- *Flaky `take-version.mjs › removes its scratch folder on every exit path`*: routed to
  `self-check-clean-baseline-flake`, whose comment already names that test scanning the
  shared tmpdir. This review saw no flake in its own self-check runs.
- *This repository's `.claude/project.json` takes effect only once a release carrying the
  hook is installed*: dropped. It follows from developing against the last release, and
  it becomes true at the next install with nothing to do.

### Learnings routed

- A guard that lands on `main` can turn a sibling branch red on rebase with no textual
  conflict. `workflow.md`, *Merging*, step 2, already says so: the full criteria were
  re-run and caught it. Nothing new to route.
- The self-check's clean baseline says a guard failed but not which test. Reading a
  plant's failing test names took a separate harness. Routed to
  `self-check-clean-baseline-flake`, whose first step is to keep the failing guard's
  output. Not a new entry.

### Merged because

Every criterion has a test or a confirmed reading behind it, every guard added goes red
when planted, and the one defect found was a mechanical text fix plus one added test.
Both were made on the branch and declared here, and the self-check passed on the commit
carrying this record.
