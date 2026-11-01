# A flush reveals nothing of the project — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a project can flush from private work without leaking itself. The name it
flushes under is explained, kept, generated when there is none, and refused when another
account already uses it; and what it sends is written in the framework's terms, shown to
the operator as it will be sent, approved, and read again before it is pushed.

**Spec:** the entry `flush-name-is-explained-and-unique` in `feature-catalog.yaml`, its
nine acceptance criteria, and its row in `docs/backlog-board/bands.yaml`. It builds on
the shipped entry `project-chooses-the-name-it-flushes-under`, whose plan and review
record are docs/superpowers/plans/2026-10-28-project-chooses-the-name-it-flushes-under.md.

**What the specifying session verified on 2026-11-01, against `main` at `3d2e9ff`, with
git 2.49.0, in Claude Code desktop 2.1.300 (Opus 5.5) on macOS 26.2, arm64:**

- `commands/flush-upstream.md` step 1 (lines 20–26) reads `Flushes as: <name>.` from
  `docs/BLUEPRINT-UPSTREAM.md`; when it is missing it asks the operator, saying only that
  the name will be public, and suggests no name. Step 5 (lines 77–96) has each task
  commit "with a body that quotes the queue entry, with all its parts" and write a pull
  request body holding "the queue entry, with all its parts". Nothing reads either text
  for the project's own material before the push.
- `scripts/submit-upstream.sh` has two subcommands, `preflight <project-root>` and
  `open <project-root> <OWNER/NAME> <branch> <title> <body-file>`. `open` reads the name
  with
  `sed -n 's/^[[:space:]]*Flushes as:[[:space:]]*\(.*[^[:space:].]\)[.[:space:]]*$/\1/p'`,
  so the whole rest of the line is the name: an explanation on the same line would become
  part of the name and be refused. It checks the name against `^[a-z0-9][a-z0-9-]*$` and
  the branch against `upstream/<name>/`, then pushes and runs `gh pr create`. It runs
  under `set -euo pipefail`. Nothing checks whether another account uses the name.
- `guards/submit-upstream.test.js` runs the source script against a stub `gh` (the
  `STUB_GH` string) that logs each call and exits 99 with `stub gh: unexpected call` on
  anything it does not know. It knows `auth status`, `api user`, `repo fork`,
  `pr create` and two `repo view` forms; not `pr list`.
- `commands/capture-learning.md` Branch 6 (lines 38–44) appends to the upstream queue and
  says nothing about how the entry is worded.
- `CONTRIBUTING.md` line 14–15 says the flush name is public; lines 53–54, under
  *Not yet*, say "Nothing yet checks that a flush name is not already used by another
  project, so pick one nobody else is likely to." `guards/contributing-page.test.js`
  checks that every backticked path and command on that page exists.
- `scripts/public-exposure-check.sh` is the exposure check the entry refers to: a hook
  that, in a public project, tells the agent at `git commit` and `git push` to read what
  is about to go out for private material and to ask the developer before going on. It
  fires in the project's checkout; a submission task works inside a clone of the
  framework, so nothing reads the submission's commit message or body today.
- No other branch in flight touches `commands/flush-upstream.md`,
  `commands/capture-learning.md`, `scripts/submit-upstream.sh` or
  `guards/submit-upstream.test.js` (the delivery sessions' shared notes, read
  2026-11-01).
- The user-level instructions that load on the developer's machine say nothing about
  flush names or queue wording, so the fresh-agent check may run locally.

**Model tier: Medium.** The decisions and the exact sentences are given; the script
change and its tests need building in an existing test world, and the command edits need
care to keep the steps' numbering and voice.

**Requires:** a current agent CLI (for Claude Code, `claude`) for the fresh-agent check in Task 5.

**Merge authority: parent review.** It changes a command every adopter's operator runs
and the script that publishes to the framework. You stop once the branch is pushed with
the handover report on it (Task 7): do not open a pull request, do not write the review
record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

flush-name-is-explained-and-unique

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-flush-name -b plan/flush-name-is-explained-and-unique origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.** They
  are the installed release. Edit the source folders only.
- **Add no dependency. Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Never push to `main`, never force-push, never open
  a pull request, never merge. Never run a release or push a tag.
- **This repository is public.** Read your own diff for people's names, other projects'
  names, home paths and hostnames before each push. Examples use `example`, `acme` and
  `someone`, as the existing tests do.

## Decisions

Taken by the specifying session on 2026-11-01.

### 1. What the name is for, said in two sentences, in the command and in the queue

These two sentences, verbatim, are said to the operator whenever the command asks for or
proposes a name, and are written into the queue's header on the line directly below
`Flushes as: <name>.`:

> This name is how the framework's maintainer knows this project across flushes, and it
> is public in every branch, commit and pull request a flush opens. Never change it: a
> new name reads as a new project, and the maintainer loses its history.

They go on their own line, not after the name, because `open` reads the whole rest of
the `Flushes as:` line as the name (see what was verified above). Do not change that
parser. A queue that already has the name but not the sentences gets the sentences
added below it at the next sitting.

### 2. How a name is chosen, in `/flush-upstream` step 1

When the queue has no `Flushes as:` line, in this order:

1. Ask whether this project has flushed before, or is already named in the framework's
   records — a pseudonym in its decisions, catalog or release notes, such as the one
   the framework uses for its first adopter. If so, propose that name.
2. Otherwise propose the name `bash .tropis/scripts/submit-upstream.sh suggest-name`
   prints.
3. Never propose a name derived from the folder, the repository or the product (the
   existing sentence stays).
4. Whatever name the operator settles on, run
   `bash .tropis/scripts/submit-upstream.sh check-name OWNER/NAME <name>` (with
   `OWNER/NAME` from the preflight). On a non-zero exit, show its line and ask for
   another name. Write the line and the sentences only once it exits 0.

When the queue already has the name, run `check-name` on it too, every sitting: another
account may have started using it since. On a refusal, stop the sitting and tell the
operator; changing an existing name is theirs to decide, against *Decision 1*'s "never
change it".

### 3. `submit-upstream.sh suggest-name`

Prints `adopter-` followed by six lowercase hexadecimal characters, and a newline, and
nothing else; exits 0. The suffix comes from `/dev/urandom` through `od`, reading only
the three bytes it needs:
`od -An -N3 -tx1 /dev/urandom | tr -d ' \n'`. No other tool, no network, no `gh`.
The result always matches `^[a-z0-9][a-z0-9-]*$`.

### 4. `submit-upstream.sh check-name <OWNER/NAME> <name>`

Refuses — through the existing `refuse`, one line on stderr, exit 1 — when:

- the name does not match `^[a-z0-9][a-z0-9-]*$` (the message is the one `open` already
  uses for that case);
- another account has a pull request on the framework, in any state, whose head branch
  starts with `upstream/<name>/`. The message names the name and the account or
  accounts, and says to choose another name.

Otherwise prints nothing and exits 0.

It asks `gh api user -q .login` for the signed-in account, and
`gh pr list --repo <OWNER/NAME> --state all --limit 1000 --json headRefName,author -q '.[] | "\(.headRefName) \(.author.login)"'`
for every pull request as one `branch login` line each. It compares the **head branch
without the fork owner**: `headRefName` is the branch name alone, the same whether the
branch was pushed to the framework or to a fork, so `someone:upstream/example/…` and
`upstream/example/…` are the same name. Pull requests by the signed-in account itself
never count: that is this project flushing again.

`open` runs the same check, after its existing queue, name and branch checks and before
the permission lookup, so a name that came to clash after it was written is refused
before anything is pushed. Put the check in one function that both call.

Update the script's header comment and its usage line for both new subcommands.

### 5. A queue entry is written in the framework's terms — `/capture-learning`

In Branch 6, where it says to append to the upstream queue, add: write the entry in the
framework's terms — no file, path or name of the project's own, no product or customer,
and only the figures the point needs. What it leaves out goes in the project's own
record: the local rule, decision or document this learning also lands in, or, where it
lands nowhere else here, the project's `DECISIONS.md` (or its equivalent) as the evidence
for the queue line. A queue entry the project's own records need in order to make sense
says so by pointing at that record, not by repeating it.

### 6. What is sent is shown, approved and quoted — `/flush-upstream` steps 4 and 5

- **Step 4, Flush (both kinds):** before moving to the next entry, show the operator the
  text as it will be sent — the entry with anything of the project's own taken out:
  its files, paths and names, its product and customers, and figures the point does not
  need — and get their approval of that text. The plan's `## Decisions` records the
  approved text for each flushed entry.
- **Step 4, a reworded entry:** when the operator rewords an entry in the queue itself,
  say that any project file naming that entry by its wording — a comment, a plan, a
  catalog reference — must be changed to match in the same commit, or it no longer
  points at anything.
- **Step 5, each task:** the commit body and the pull request body quote **the approved
  text from the plan's Decisions, not the queue line**. Before running `open`, the task
  reads its commit message (`git log -1 --format=%B`) and its pull request body file for
  anything of the project's own — the list above, plus home paths and hostnames — as the
  exposure check does for the project's own pushes. If it finds any, it stops for the
  operator: no push and no pull request for that entry, and the drain task keeps the
  entry in the queue with that as its note.
- **Step 1** uses *Decision 2*; the sentence asking for the name is replaced by it.

Keep every existing step and bullet that these do not replace. The step numbering stays.

### 7. `CONTRIBUTING.md`

- In *From a project*, the *Flush the queue* bullet: replace the two sentences about the
  name with: the name is how the maintainer knows the project and never changes; a new
  project is offered a generated one; a name another account already uses is refused;
  and each entry is shown to you as it will be sent, with the project's own details
  taken out, for your approval.
- In *Not yet*, delete the sentence "Nothing yet checks that a flush name is not already
  used by another project, so pick one nobody else is likely to." Keep the rest.
- Name no path in backticks that does not exist; `guards/contributing-page.test.js`
  checks every one.

### 8. No decision record

`framework/DECISIONS.md` FW-011 decides that a flush reaches the framework as pull
requests; this plan changes how the name is picked and how the text is reviewed, inside
that mechanism, and chooses between no framework-level alternatives. No entry is added.
State this in the handover's *Judgment calls* only if you disagree.

## Traps

- **`set -o pipefail` and a reader that stops early.** `tr -dc … < /dev/urandom | head -c 6`
  kills `tr` with SIGPIPE, and under `pipefail` the script then exits non-zero, after
  printing. Use the `od -N3` form in *Decision 3*, which reads three bytes and ends.
- **The stub `gh` exits 99 on a call it does not know.** Every `open` test now reaches
  `gh pr list` through the clash check, so the stub must answer `pr list` — print the
  contents of an environment variable such as `STUB_PRS` (empty by default), standing in
  for gh's output after its `-q` filter. That is a change to the stub, not a weakened
  test. Assert on calls by name (`calls().filter(c => c.startsWith('pr list'))`), never
  by index or total count.
- **A refusal test must isolate the check it names.** The 2026-10-28 review found an
  invalid-name test that passed through a different refusal whose message happened to
  contain the same words. For the clash refusal, use a valid name and a branch under it,
  so only the clash check can refuse; and re-plant: remove the clash check in a throwaway
  commit, see the clash tests go red, drop the commit.
- **The self-check reads committed content only.** Commit, then run
  `bash scripts/check-blueprint.sh`.
- **`npm --prefix .tropis test` runs the installed release's checks**, not the source
  guards; it does not show the new tests. Run the source guard directly (Task 1) and the
  self-check.
- **A file the framework names in backticks must exist.** In the command texts, write
  `.tropis/scripts/submit-upstream.sh` (it is installed) and `docs/BLUEPRINT-UPSTREAM.md`
  (already named there); add no new backticked path under `docs/`, `scripts/` or
  `.claude/` that no project has.

## File Structure

| File | Change |
|---|---|
| `scripts/submit-upstream.sh` | *Decisions 3 and 4* |
| `guards/submit-upstream.test.js` | Task 1 |
| `commands/flush-upstream.md` | *Decisions 1, 2 and 6* |
| `commands/capture-learning.md` | *Decision 5* |
| `CONTRIBUTING.md` | *Decision 7* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment naming this plan |
| `docs/backlog-board/bands.yaml` | the entry's row removed |
| `docs/superpowers/plans/2026-11-01-flush-reveals-nothing-of-the-project.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: its last line starts
`Self-check passed`). If the self-check is red before you change anything, record its
output under *Outstanding* and carry on.

### Task 1 — Tests first, then the script

Run the source guard as the self-check stages it, or directly with the installed Jest:
`node --experimental-vm-modules .tropis/node_modules/jest/bin/jest.js --rootDir . guards/submit-upstream.test.js`
(if that runner path does not exist, find the Jest binary under `.tropis/node_modules`
and say which you used). Record the passing count before any change.

In `guards/submit-upstream.test.js`, teach the stub `pr list` (see *Traps*) and add:

- **suggest-name:** run it ten times; each prints one line matching
  `^adopter-[0-9a-f]{6}$`, exits 0, writes nothing on stderr, and logs no `gh` call; and
  the ten are not all equal.
- **check-name refuses another account's name:** `STUB_PRS` holds
  `upstream/example/2026-10-01-x other` (signed-in login `someone`). `check-name acme/framework example`
  exits 1, prints nothing on stdout, one line on stderr naming `example` and `other`.
- **…and compares the branch without the fork owner:** the same, where the other
  account's pull request came from its fork — the line is still
  `upstream/example/2026-10-01-x other`, since `headRefName` carries no owner. Say so in
  the test's comment; this is the case the criterion names.
- **check-name accepts the account's own earlier flushes:** `STUB_PRS` holds
  `upstream/example/2026-10-01-x someone`; exit 0, nothing printed.
- **check-name accepts a name nobody uses**, including when another account uses a name
  that merely starts the same way: `STUB_PRS` holds `upstream/example-two/2026-10-01-x other`;
  `check-name … example` exits 0.
- **check-name refuses an invalid name** (`Example Project`) with the name-format
  message, and makes no `pr list` call.
- **open refuses a clashing name before pushing:** a valid queue and branch, `STUB_PRS`
  naming another account under `upstream/example/`; non-zero exit, stderr naming the
  other account, nothing in either bare repository, no `pr create`.
- Every existing `open` test still passes with `STUB_PRS` empty.

Run them against the current script and record how each new one fails. Then apply
*Decisions 3 and 4* and run until green. Re-plant the clash check (see *Traps*) and
record the red count. Commit.

### Task 2 — `/flush-upstream`

Apply *Decisions 1, 2 and 6* to `commands/flush-upstream.md`. Then check, and paste the
output of each:

- `grep -c "how the framework's maintainer knows this project across flushes" commands/flush-upstream.md`
  prints `1` or more (it printed `0` before this task);
- `grep -n "suggest-name\|check-name" commands/flush-upstream.md` prints at least one
  line for each (it printed nothing before);
- `grep -n "quotes the queue entry" commands/flush-upstream.md` prints nothing (it
  printed one line before).

Commit.

### Task 3 — `/capture-learning`

Apply *Decision 5* to `commands/capture-learning.md`, inside Branch 6, before the
paragraph that begins "**Something built here**". Check:
`grep -n "framework's terms" commands/capture-learning.md` prints one line (it printed
nothing before). Commit.

### Task 4 — `CONTRIBUTING.md`

Apply *Decision 7*. Check: `grep -n "Nothing yet checks that a flush name" CONTRIBUTING.md`
prints nothing (it printed one line before). Commit.

### Task 5 — Fresh-agent check

The command changes alter what an agent is told to do, so they owe one. Make a scratch
project in a new temporary folder: `git init`, then
`bash <worktree>/scripts/set-up-project.sh <scratch>`, then a `docs/BLUEPRINT-UPSTREAM.md`
holding `# Upstream queue`, a blank line, `Last flushed: 2026-10-01.`, and one entry,
verbatim:

> - 2026-10-20: In Lantern's billing service, `src/billing/retry.ts` retried a webhook
>   41 times for customer Northwind before the lock in `src/billing/lock.ts` released.
>   Lesson: a retry loop around a lock needs a ceiling, or it outlives the lock's holder.

and no `Flushes as:` line. (`Lantern` and `Northwind` are invented.) Start a fresh agent
session in it — for Claude Code,
`claude -p --output-format stream-json --verbose "<prompt>"` so its tool calls show; any
current agent tool will do — with this prompt, verbatim:

> This is a probe and will be discarded; do not push, open or submit anything, and make
> no network call. Read `.claude/commands/flush-upstream.md`. Without running the
> preflight, say what step 1 would ask and propose about the flush name, and what it
> would write into the queue. Then suppose the operator decides to flush the one queue
> entry as a lesson: give the exact text that would be shown to the operator for
> approval, and say which text the commit body and pull request body would quote.

Pass, every point: it says it would ask whether the project has flushed before or is
named in the framework's records; it proposes running `suggest-name` (or a name of that
form) and running `check-name` before accepting; it says the two sentences of
*Decision 1* (or their substance) and that they are written below the `Flushes as:`
line; its approval text carries the lesson but none of `Lantern`, `Northwind`,
`src/billing`, `41`; and it says the bodies quote the approved text, not the queue line.

The probe runs against the **installed** `.claude/commands/` of the scratch project,
which `set-up-project.sh` copies from the worktree's source — check that the scratch
copy contains `check-name` before running it; if it does not, the setup did not take the
source and the probe proves nothing: say so and stop this task.

Record the prompt, the relevant tool calls and the reply, and the tool, version,
operating system and architecture (`uname -sm` and the system's version command). If a
point fails, fix the command text and run the probe again; record both runs. If no
agent tool can be started here, say so under *Outstanding*. Delete the scratch folder.

### Task 6 — Catalog and board

In `feature-catalog.yaml`, for `flush-name-is-explained-and-unique`: `status: shipped`;
`modules` to `commands/flush-upstream.md`, `commands/capture-learning.md`,
`scripts/submit-upstream.sh`, `guards/submit-upstream.test.js` and `CONTRIBUTING.md`; and
above the entry, below its existing comment, a line
`# Shipped by the plan handover at docs/superpowers/plans/2026-11-01-flush-reveals-nothing-of-the-project.md.`
If Task 5 did not run or did not pass, leave the entry at `building` and say so.

In `docs/backlog-board/bands.yaml`, remove the whole `flush-name-is-explained-and-unique:`
row (every line down to the next entry's key), only if the entry ships.

Commit, then run `npm --prefix .tropis test` and `bash scripts/check-blueprint.sh` and
record both last lines. If either is red, fix the work and run again; a failure you
cannot trace to this plan goes under *Outstanding* with its output.

### Task 7 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names:
*Task completion*, *Verification results* (each command and its actual output, with the
tool, version, operating system and architecture), *Scope* (`git diff --stat origin/main...HEAD`,
confirmation each file is in the File Structure table, and the worktree path used),
*Judgment calls*, *What the plan got wrong*, *Outstanding*. Commit, and push the branch
to `origin`. Do not open a pull request and do not merge.

## Handover report

### Task completion

Tasks 0 to 7 done. Task 5 passed on its first run. Source worked from: nothing in particular; the script and tests are written against this repository's existing ones.

### Verification results

Platform: macOS 26.2 on arm64 (Darwin); git as installed; Claude Code 2.1.300 for the probe.

- Task 0, self-check before any change: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1, source guard (installed Jest at `.tropis/node_modules/jest/bin/jest.js`, inline `--config` JSON, with an untracked `{"type":"module"}` package.json in the worktree that I removed afterwards; passing counts: before any change 19 of 19. New tests against the old script: 7 failed, 19 passed (26 total): suggest-name 1, check-name 5, open clash 1. After the script change: 26 of 26.
- Re-plant: with the `check_name` call removed from `open` in a throwaway commit, 1 failed, 25 passed; the red one was "open refuses a name another account already uses, before pushing". Throwaway commit dropped; the script was restored byte for byte.
- Task 2 greps: how-the-maintainer-knows sentence count 1; suggest-name and check-name each appear; "quotes the queue entry" prints nothing. Task 3: "framework's terms" prints one line. Task 4: "Nothing yet checks that a flush name" prints nothing.
- Task 5 probe (Claude Code 2.1.300, macOS 26.2, arm64, run in a scratch project set up from the worktree's source; the scratch copy contained `check-name` three times before running; prompt verbatim from the plan; the probe ran locally and the user-level instructions say nothing on this): the agent ran `cat` on the command, then `suggest-name` (offline) and read the script. Its reply: asked whether the project flushed before or is named in the framework's records; proposed the `suggest-name` output; ran `check-name` before accepting; said the two sentences and wrote them on their own line below `Flushes as:`; its approval text was "A retry loop around a lock needs a ceiling, or it outlives the lock's holder..." with none of Lantern, Northwind, src/billing or 41; the bodies quote the approved text from Decisions, not the queue line. Pass on every point. Scratch folder deleted.
- Task 6: `npm --prefix .tropis test`: `Tests: 140 passed, 140 total`. `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`

### Scope

`git diff --stat origin/main...HEAD` before this report:

```
 CONTRIBUTING.md                | 10 +++---
 commands/capture-learning.md   |  7 ++++
 commands/flush-upstream.md     | 54 ++++++++++++++++++++++++++-----
 docs/backlog-board/bands.yaml  | 14 --------
 feature-catalog.yaml           |  5 ++-
 guards/submit-upstream.test.js | 72 ++++++++++++++++++++++++++++++++++++++++++
 scripts/submit-upstream.sh     | 49 +++++++++++++++++++++++++++-
 7 files changed, 182 insertions(+), 29 deletions(-)
```

Every file is in the File Structure table. Worktree: ../tropis-flush-name (the plan's row).

### Judgment calls

- `check-name` reports an invalid name with "the flush name "X" is not lowercase letters, digits and hyphens: change it", the same wording as `open`'s without its "in <queue>" part, because `check-name` has no queue; the test matches that.
- The stub `pr list` prints `STUB_PRS` verbatim plus a newline when set.
- Others listed in the refusal are joined with ", ", sorted and de-duplicated.

### What the plan got wrong

- The Jest runner line in Task 1 does not work as written: the source has no jest config and no package.json with `"type":"module"`, so `--rootDir .` finds no config and ES module tests fail to load.
- It says "the message is the one `open` already uses"; that message includes the queue path, so it cannot be identical.

### Outstanding

Nothing. No pull request opened and nothing merged, as instructed.

## Review record

Reviewed 2026-11-01 by the specifying session, in the worktree ../tropis-flush-name, on
Claude Code desktop 2.1.300 (Opus 5.5), macOS 26.2 on arm64, git 2.49.0, Node v22.15.0.
Reviewed head before this record: `8151870`.

### Checks re-run

- `git diff --stat origin/main...HEAD`: 8 files, `CONTRIBUTING.md`,
  `commands/capture-learning.md`, `commands/flush-upstream.md`,
  `docs/backlog-board/bands.yaml`, `feature-catalog.yaml`,
  `guards/submit-upstream.test.js`, `scripts/submit-upstream.sh` and this plan. All are
  in the File Structure table.
- Source guard, the executor's way (installed Jest, inline `--config`, a temporary
  `{"type":"module"}` package.json removed afterwards): `Tests: 26 passed, 26 total`.
- Re-planting, each a working-tree edit restored with `git checkout` (Jest reads the
  working tree, so no throwaway commit was needed):
  - `open` without its `check_name` call: 1 failed, 25 passed (the open clash test).
  - the clash filter never matching another account: 3 failed, 23 passed (the two
    check-name refusals and the open clash test).
  - the filter counting the signed-in account's own pull requests: 1 failed, 25 passed
    (the own-earlier-flushes test).
- `npm --prefix .tropis test`: `Tests: 140 passed, 140 total`.
- `bash scripts/check-blueprint.sh` on `8151870`: "Self-check passed: every guard caught
  its defect, the clean baseline passed, and the framework repository's own guards
  passed."
- The fresh-agent check (Task 5) was not re-run. Its recorded reply covers every pass
  point, and the command text it read differs from the reviewed text only by the
  rewrap below.

The handover's two diagnoses were checked as well as its figures. The Jest line is
wrong as the handover says: the source tree has no Jest config and no package.json, and
the guard is an ES module. The invalid-name message has to differ from `open`'s, because
`open`'s names the queue file and `check-name` has none.

### Found

- Public exposure: I read the diff for people's names, other projects' names, home paths
  and hostnames. Nothing found. The probe's subjects, Lantern and Northwind, are made up
  and appear only in this plan.
- **Two bullets in `commands/flush-upstream.md` step 5 still had the line breaks of the
  text they replaced.** This is mechanical, so **the reviewer fixed it on the branch** in
  `8151870`. The wording is unchanged.
- The test "compares the branch without the fork owner" runs the same input as the
  refusal test before it. That is unavoidable with a stub: gh reports `headRefName`
  without an owner whether the pull request came from a fork or not, and the test says
  so in its comment. The comparison it stands for is covered by the second re-plant
  above. Left as it is.
- Nothing else.

### Outstanding disposition

- The handover lists nothing outstanding.
- The plan's broken Jest line is a defect of this plan only, and it has merged as
  history. Dropped: other plans name the self-check or a runner of their own, and this
  line was not copied from a rule.
- No screen is involved, so there is no developer check. Criteria 1 to 3 and 5 to 8
  rest on the Task 5 fresh-agent check. Criteria 3, 4 and 9 rest on the source guard.

### Learnings routed

- "To run one source guard on its own in this repository, Jest needs an inline config
  and an ES-module package.json." This applies only to this repository, and the
  self-check is the supported way to run the guards. Not routed.
- Nothing else generalises.

### Merged because

Every check passed again on the reviewed head. Each clash-check path went red when it
was re-planted, the diff matches the File Structure table, and the only defect found
was formatting, fixed and declared above.
