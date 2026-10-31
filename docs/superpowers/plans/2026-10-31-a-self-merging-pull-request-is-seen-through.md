# An agent that sets a pull request to merge itself stays until it has merged and main is green — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `node .tropis/scripts/main-status.mjs --pull-request <N>` waits until a pull
request set to merge itself has merged, keeping its branch up to date with `main` while
it waits. It then waits for the run the merge started on `main` and prints one line. It
stops, naming the pull request and the cause, when the branch conflicts, a check fails,
auto-merge is off or the pull request was closed. The workflow, `/release` and the commit
hook all name it as the step after setting auto-merge.

**Spec:** the entry `a-self-merging-pull-request-is-seen-through` in
`feature-catalog.yaml` and the comment above it. There is no design document; the
decisions below are the design.

**What the specifying session verified on 2026-10-31, against `main` at `919879e`, with
gh 2.103.2 in Claude Code on macOS (Darwin 25.2.0) arm64:**

- **What happened.** PR 47 (the board refresh) was set to auto-merge, and the agent
  moved on. `main` then moved (the v0.7.1 update), and the ruleset requires a branch up
  to date with `main`. Auto-merge does not update a branch, so the pull request sat
  behind `main` until the developer noticed.
- **The workflow says so only in passing.** In `framework/workflow.md`, *Branching*, the
  gated bullet ends "A pull request behind `main` waits too … rebase it on `origin/main`
  and push". *Merge and clean up* says of the gated merge "It returns at once … Pull
  `main` once the pull request says merged." Nothing watches a pull request, so each
  agent writes its own wait loop or none.
- **The places that set auto-merge.** `git grep -nF -- '--auto' framework commands rules
  templates scripts guards` finds: `framework/workflow.md` (the *Branching* bullet and the
  gated paragraph in *Merge and clean up*); `commands/release.md`, Stage 1b ("run `gh pr
  merge <N> --auto --squash`, and wait until it has merged.") and Stage 5 ("…and wait
  until it has merged; the commit Stage 6 names is then the one the merge made on
  `main`."); and `scripts/framework-commit-check.sh`, in the heredoc it prints on a gated
  `main`. The other three hits are tests that pin these texts (`guards/release.test.js`
  twice, `guards/rule-delivery.test.js` once). `commands/refresh-board.md` and `/dispatch`
  name no command. They defer to *Branching* ("through a pull request that merges itself
  (workflow.md, *Branching*)"; "Dispatch's move of an entry to `building` is such a
  change"), so the *Branching* edit covers them.
- **What `scripts/main-status.mjs` already does.** It asks GitHub only through `gh`, and
  only once origin is on GitHub (`originOnGitHub`). It reads JSON from `gh` through
  `askGh`, which turns every failure into `{ error }`. `waitForRun(root, sha, options)`
  waits for the push run of `pipeline.yml` on a full commit hash, and returns `{ state,
  line, exit }`: exit 0 green, 1 red, 3 not finished by the timeout, and 0 with a
  "could not tell" line. It uses the REST API only, because GraphQL is refused in some
  agent sessions (the module comment says so). `gh pr view`, `gh pr checks` and
  `gh pr update-branch` use GraphQL, so this plan uses `gh api` only. The command line
  accepts `--wait <commit>`, `--interval <seconds>` and `--timeout <minutes>`, and exits 2
  with the usage line on anything else.
- **What GitHub's REST API returns.** For a pull request,
  `gh api 'repos/{owner}/{repo}/pulls/47'` returned the fields `state` (`closed`),
  `merged` (`true`), `merge_commit_sha` (`6305da6b…`), `mergeable_state` (`unknown`),
  `auto_merge` (an object with `merge_method: squash`, or `null` when it is off),
  `head.sha` and `base.ref`. For checks,
  `gh api 'repos/{owner}/{repo}/commits/<head sha>/check-runs'` returned
  `{ total_count, check_runs: [{ name, status, conclusion, html_url, … }] }`. That was 22
  runs, with names repeated across events (such as `pipeline / gate`, `pipeline / host`
  and `pipeline / framework / checks`), and with `skipped` and `success` conclusions. By
  default the endpoint returns the latest run of each check. The branch's rules
  (`gh api 'repos/{owner}/{repo}/rules/branches/main'`) require the status check
  `pipeline / gate`.
- **What the specifying session took from GitHub's REST documentation and did not
  probe.** `mergeable_state` is `behind` when the base has commits the head lacks and
  the branch must be up to date, `dirty` on a merge conflict, `blocked` while a required
  check is pending, `clean` when mergeable, and `unknown` while GitHub is still
  computing. `PUT repos/{owner}/{repo}/pulls/{n}/update-branch` with
  `expected_head_sha` merges the base into the head branch and answers 202. On a conflict
  it answers 422, and `gh api` then exits non-zero with the message on stderr. Task 4
  probes the read paths against the real host. The update path is first exercised for
  real when this plan's own pull request merges (see *Outstanding* in Task 6).
- **The tests fake `gh`.** `guards/main-status.test.js` writes a bash stub `gh` first on
  `PATH`. The stub logs each call to `gh.log` and routes on `"$1 $2"`: `api
  repos/{owner}/{repo}` answers the default branch, and `run list` answers
  `runs-<n>.json` on its n-th call, else `runs.json`. A test then asserts the log. Its
  last test reads `framework/workflow.md` and asserts that the merge sequence's code
  block ends with `node .tropis/scripts/main-status.mjs --wait HEAD`. That block does not
  change.
- **The script is already installed into projects.** `scripts/installed-scripts.txt`
  lists `main-status.mjs`, so no install list changes.
- **Review records read.** `docs/superpowers/plans/2026-10-31-a-failing-push-is-visible.md`
  built `main-status.mjs`. Two things in its record apply here. First, a tests-only red
  commit failed far more tests than the plan predicted, because staged test files copy
  scripts that did not yet exist. Here the script already exists, so that cannot recur,
  but do not predict an exact red count beyond what Task 1 states. Second, its review ran
  a probe of the **gated** sequence and found that `--wait HEAD` after an early pull
  waits on the commit before the merge. The new command removes that hazard: it waits on
  the pull request's `merge_commit_sha`, never on `HEAD`.

**Model tier: Medium.** The behaviour, every printed line and the documentation text
are given below. The code and its tests are the executor's to write.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** This rewrites how every later session lands a pull
request on a gated `main`. The update path cannot be exercised for real before merge, so
the reviewing session watches it on this plan's own pull request. Stop after the handover
report (Task 6). Do not write a review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

a-self-merging-pull-request-is-seen-through

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-see-through -b plan/a-self-merging-pull-request-is-seen-through` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's own entry
  pair. The work is in `scripts/`, `guards/`, `framework/`, `commands/` and `templates/`.
- **Use `gh api` only.** No `gh pr view`, `gh pr checks`, `gh pr update-branch` or
  `gh repo view`: they need GraphQL.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body. A commit touching `framework/` states in its body what the fresh-agent check
  found, or that it is recorded in the handover report because the probe runs later.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, in the handover or in the probe's scratch project. Tests use
  `acme/example`.

## Decisions

### 1. One new mode of `main-status.mjs`, not a new script

Add `--pull-request <N>` to `scripts/main-status.mjs`, and an exported
`async function seeThrough(root, number, options)` beside `waitForRun`, taking the same
options (`env`, `ghTimeoutMs`, `intervalMs`, `timeoutMs`). It reuses `originOnGitHub`,
`askGh` and `waitForRun`. Update the module comment's first paragraph to describe the new
mode in one or two sentences, in the voice of the existing ones. Add to the comment's
second paragraph that the workflow's gated merge, `/release` and the commit hook name
`--pull-request`. Update `USAGE` to:

```
usage: main-status.mjs [--wait <commit> | --pull-request <number>] [--interval <seconds>] [--timeout <minutes>]
```

`--pull-request` takes a positive integer. Given together with `--wait`, or with a value
that is not a positive integer, the command prints the usage and exits 2, as today.

### 2. What one poll does, in this order

Each poll starts with `gh api repos/{owner}/{repo}/pulls/<N>`, then:

1. **Merged** (`merged` true): call `waitForRun(root, merge_commit_sha, options)`, with
   the same interval and a fresh timeout. Return its `state` and `exit`, with its line
   prefixed by `Pull request #<N> merged as <short sha>. `. A merged pull request with no
   `merge_commit_sha` is a "could not tell".
2. **Closed** (`state` is `closed`, not merged): stop, exit 4.
3. **Auto-merge off** (`auto_merge` is `null`): stop, exit 4.
4. **A check failed.** Ask
   `gh api 'repos/{owner}/{repo}/commits/<head.sha>/check-runs?per_page=100'`. If any
   run's `conclusion` is in the existing `RED` set (`failure`, `timed_out`,
   `startup_failure`), stop, exit 4, naming the first such run. A `cancelled` or
   `skipped` run is not a failure.
5. **Conflict** (`mergeable_state` is `dirty`): stop, exit 4.
6. **Behind** (`mergeable_state` is `behind`): if this head has not already been
   updated during this run, call
   `gh api -X PUT repos/{owner}/{repo}/pulls/<N>/update-branch -f expected_head_sha=<head.sha>`,
   remember the head, and write to stderr
   `main-status: pull request #<N> was behind <base.ref>; brought it up to date`. If the
   call fails, stop, exit 4. Never ask twice for the same head.
7. Otherwise (`blocked`, `clean`, `unstable`, `unknown`, or anything else) keep waiting.
   Past the deadline, return exit 3. Then sleep `intervalMs` and poll again.

Any `askGh` error returns the "could not tell" line with exit 0, as `--wait` does. The
"bring it up to date" step is what the update-branch call does; the code makes no local
git change.

### 3. The lines, verbatim

`<N>` is the number, `<short>` the first seven characters of a hash, and `<base>` the
pull request's `base.ref`. On success and red, the main-branch half is exactly the line
`waitForRun` returns today.

| Outcome | stdout | exit |
|---|---|---|
| merged, main green | `Pull request #<N> merged as <short>. Main branch: green — the pipeline passed on <short> (<title>).` | 0 |
| merged, main red | `Pull request #<N> merged as <short>. Main branch: red — the pipeline failed on <short> (<title>). Run: <url>` | 1 |
| merged, run not finished | `Pull request #<N> merged as <short>. Main branch: still running — …` (as `waitForRun`) | 3 |
| merged, main unknown | `Pull request #<N> merged as <short>. Main branch: could not tell — <reason>.` | 0 |
| closed | `Pull request #<N>: did not merge — it was closed without merging.` | 4 |
| auto-merge off | `Pull request #<N>: did not merge — auto-merge is off.` | 4 |
| check failed | `Pull request #<N>: did not merge — the check <name> failed on <short>. Run: <html_url>` | 4 |
| conflict | `Pull request #<N>: did not merge — it conflicts with <base>.` | 4 |
| update refused | `Pull request #<N>: did not merge — it is behind <base> and could not be brought up to date: <reason>.` | 4 |
| not merged by the deadline | `Pull request #<N>: still open — not merged within <minutes> minutes.` | 3 |
| could not ask | `Pull request #<N>: could not tell — <reason>.` | 0 |

`<reason>` in the "update refused" line is the `askGh` error text, without the leading
`gh failed: `. Before it starts, the command writes one stderr line, like `--wait` does:
`main-status: waiting for pull request #<N> to merge, asking every <s> s for up to <m> min`.

### 4. The documentation text, verbatim

**`framework/workflow.md`, *Branching*, the gated bullet.** Replace from `There every
change,` to the end of the bullet (`green again.`) with:

```markdown
  There every change, a backlog edit or a plan file included, reaches
  `main` through a pull request that merges itself once green: commit on a branch, push
  it, open the pull request, run `gh pr merge <N> --auto --squash` with `--subject` and
  `--body`, and then run `node .tropis/scripts/main-status.mjs --pull-request <N>`.
  **Setting auto-merge does not finish the job; the change is done when that command
  reports the main branch green.** Auto-merge does not update a branch, and the host
  requires one up to date with `main`, so a pull request that falls behind sits
  unmerged with nobody told. The command brings it up to date and keeps waiting, and
  stops, naming the pull request, when it conflicts, a check fails, or auto-merge is
  off. Dispatch's move of an entry to `building` is such a change: the
  dispatching session lands it through its pull request and waits until it has merged
  before the executor starts.
```

**`framework/workflow.md`, *Merge and clean up*, the gated paragraph.** Replace its last
sentence, `Pull `main` once the pull request says merged.`, with:

```markdown
Then run `node .tropis/scripts/main-status.mjs --pull-request <N>`, in place of the
code block's last line. It waits until the pull request has merged, bringing its branch
up to date whenever `main` moves under it, then waits for the run the merge started on
`main`, on the merge commit itself rather than on `HEAD`. Its exits are those of
`--wait` below, plus 4 when the pull request did not merge. Its line then names why:
a conflict, a failed check, auto-merge off, or the pull request closed. On 4, fix what
it names, set auto-merge again if it was off, and run it again. Pull `main` once it has
reported.
```

**`commands/release.md`, Stage 1b.** Replace `pull request, run `gh pr merge <N> --auto
--squash`, and wait until it has merged.` with:

```markdown
pull request, run `gh pr merge <N> --auto --squash`, then
`node .tropis/scripts/main-status.mjs --pull-request <N>`, and go on only once it
reports the main branch green; on any other line, show it and stop.
```

**`commands/release.md`, Stage 5.** Replace the text from `` `gh pr merge <N> --auto
--squash` with the same subject and body`` to the end of that paragraph (`the one the
merge made on `main`.`) with:

```markdown
`gh pr merge <N> --auto --squash` with the same subject and body, then
`node .tropis/scripts/main-status.mjs --pull-request <N>`, and go on only once it
reports the main branch green; on any other line, show it and stop. The commit Stage 6
names is then the one the merge made on `main`, which that line names.
```

**`scripts/framework-commit-check.sh`, the gated heredoc.** Replace its four lines with:

```
This project's main branch is gated: .claude/project.json records no "ungated", so
nothing reaches main except through a pull request (workflow.md, Branching). Commit on
a branch, push it, open a pull request, and run gh pr merge <N> --auto --squash with
--subject and --body; then run node .tropis/scripts/main-status.mjs --pull-request <N>,
which waits until it has merged and says whether main is green.
```

**`templates/README.md`**, the paragraph naming `main-status.mjs`. After the sentence
ending `exits non-zero when it fails.`, add:

```markdown
On a gated main branch, `node .tropis/scripts/main-status.mjs --pull-request <N>` does
the same for a pull request set to merge itself. It waits until it has merged, bringing
its branch up to date when `main` moves, and says why when it did not merge.
```

### 5. The decision record

Add to `framework/DECISIONS.md` the next free `FW-` number (FW-039 unless another plan
has taken it), in the format of FW-037 (heading, `**Date:** 2026-10-31 · **Status:**
Accepted`, then **Decision**, **Evidence**, **Rejected**, **Consequences**). Its content:

- **Decision:** An agent that sets a pull request to merge itself runs
  `main-status.mjs --pull-request <N>` and stays until the merge and the main branch's
  run have finished. The command keeps the branch up to date through GitHub's
  update-branch endpoint, which merges `main` into the branch.
- **Evidence:** PR 47 here, behind `main` after the v0.7.1 update, with nobody told.
  The REST fields probed on 2026-10-31 (as above).
- **Rejected:** Rebasing locally and force-pushing. That needs a checkout of the branch,
  which a session that has already removed its worktree no longer has. The squash
  discards the merge commit anyway. Leaving the wait to each agent: that is what
  happened, and the wait was never written. `gh pr` subcommands, which need GraphQL.
- **Consequences:** A check that is not required and fails stops the command, even
  though auto-merge would still merge. The agent then reports a failure the host would
  have let through. The command makes no local git change, so the session pulls `main`
  afterwards.

### 6. What this owes, and does not

- **A fresh-agent check** (Task 4), because `framework/workflow.md` changes.
- **The operator guide** (`templates/README.md`), because it names the `main-status.mjs`
  commands.
- **No rule edit.** No file under `rules/` states the gated merge.
- **No release-notes edit.** `/release` drafts the notes from the backlog.

## Traps

- **The tests must fail first.** Task 1 commits the tests before the code, and the
  self-check must then fail on them. That is the red step, not a breakage.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **The stub routes on `"$1 $2"`.** The update call is `gh api -X PUT …`, so `"$1 $2"` is
  `api -X`. Route on the path argument (match `*pulls/*/update-branch*`, `*check-runs*`,
  `*pulls/*`, in that order), and keep the existing `api repos/{owner}/{repo}` and
  `run list` cases working.
- **Never ask GitHub for real in a test.** Every test that gives a repository a
  `github.com` origin puts the stub first on `PATH`.
- **The existing workflow assertions must keep passing.** `guards/release.test.js` pins
  `gh pr merge <N> --auto --squash`, `waits until it has merged before the executor
  starts`, `Where the host marks no check as required, its auto-merge merges at once.`
  and (in `release.md`) `gh pr merge <N> --auto --squash`. `guards/rule-delivery.test.js`
  pins `gh pr merge <N> --auto --squash` and `main branch is gated` in the hook's output.
  `guards/main-status.test.js` pins the code block's last line. The text in *Decision 4*
  keeps all of them.
- **The live probes in Task 4 are read-only.** Never set auto-merge, update a branch or
  merge from this plan, except as Task 6 says.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/main-status.mjs` | *Decisions 1–3* |
| `guards/main-status.test.js` | the new tests (Task 1) |
| `guards/release.test.js` | assertions that both stages of `release.md` and the *Branching* bullet name `--pull-request <N>` |
| `guards/rule-delivery.test.js` | assertion that the gated hook output names `main-status.mjs --pull-request <N>` |
| `framework/workflow.md` | *Decision 4* |
| `commands/release.md` | *Decision 4* |
| `scripts/framework-commit-check.sh` | *Decision 4* |
| `templates/README.md` | *Decision 4* |
| `framework/DECISIONS.md` | *Decision 5* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to tests |
| `docs/superpowers/plans/2026-10-31-a-self-merging-pull-request-is-seen-through.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table). In the worktree run `npm --prefix .tropis ci`, then
`git status --porcelain` (expected: nothing), then `bash scripts/check-blueprint.sh`
(expected: last line starts `Self-check passed`). Record `git --version`,
`node --version`, `gh --version` and `uname -sm`, and the commit you started from.

### Task 1 — The tests, red

In `guards/main-status.test.js`, extend the stub so that `api` calls are routed by path:
`pulls/<n>` answers `pull-<k>.json` on its k-th call (else `pull.json`), `check-runs`
answers `checks.json`, and `update-branch` logs and answers `{}` (or fails when a file
`update-fails` exists, printing `gh: merge conflict between base and head (HTTP 422)` to
stderr and exiting 1). Then add a `describe('--pull-request')` with these tests. Each
asserts the exact stdout line from *Decision 3* and the exit code:

1. Merged on the first ask, main green: exit 0, and the `run list` call asks for
   `--commit <full merge_commit_sha>`.
2. Merged, main red: exit 1.
3. Behind, then clean, then merged: exactly one `update-branch` call, carrying
   `expected_head_sha=<head>`; then the green line, exit 0.
4. Behind twice with the same head, then merged: still exactly one `update-branch` call.
5. Behind, update refused: the "update refused" line with reason
   `merge conflict between base and head (HTTP 422)`, exit 4.
6. `dirty`: the conflict line, exit 4, no `update-branch` call.
7. A check run concluded `failure`, beside one `cancelled` and one `skipped`: the check
   line names the failed one, exit 4.
8. Only `cancelled` and `skipped` runs, then merged: green, exit 0.
9. `auto_merge: null`: exit 4.
10. Closed, not merged: exit 4.
11. Never merged by the deadline: exit 3.
12. `gh` failing: the "could not tell" line, exit 0.

Also add `--pull-request` to the existing *never runs gh with %s* test, and to the
usage refusals: `['--pull-request']`, `['--pull-request', 'abc']`,
`['--pull-request', '0']` and `['--wait', 'HEAD', '--pull-request', '1']`, each exit 2
with an empty `gh.log`.

In `guards/release.test.js`, assert that `framework/workflow.md` (whitespace-collapsed)
contains `then run \`node .tropis/scripts/main-status.mjs --pull-request <N>\`` and
`Setting auto-merge does not finish the job`, and that `commands/release.md` contains
`node .tropis/scripts/main-status.mjs --pull-request <N>` at least twice. In
`guards/rule-delivery.test.js`, in *on a gated main names the backlog…*, assert that the
hook output contains `main-status.mjs --pull-request <N>`.

Commit. Run `bash scripts/check-blueprint.sh`. It must fail. Every new `--pull-request`
test and every new text assertion fails, and the existing tests pass. Paste the failing
test names.

### Task 2 — The command

Apply *Decisions 1–3*. Commit. Run `bash scripts/check-blueprint.sh`. Only the text
assertions may still fail. Paste the result.

### Task 3 — The text and the decision

Apply *Decisions 4 and 5*. Commit, with the fresh-agent check noted as pending in the
body. Run `bash scripts/check-blueprint.sh`. The last line must start
`Self-check passed`. Paste it.

### Task 4 — Live read-only probes and the fresh-agent check

1. **Against the real host, read-only.** From the worktree:
   `node scripts/main-status.mjs --pull-request 47 --interval 5 --timeout 1` must print
   `Pull request #47 merged as 6305da6. Main branch: …`. Paste it whole: green, red or
   could not tell, and `waitForRun` decides which. Then push the branch, open this plan's
   pull request **without** setting auto-merge, and run
   `node scripts/main-status.mjs --pull-request <its number> --interval 5 --timeout 1`.
   It must print `Pull request #<N>: did not merge — auto-merge is off.` and exit 4.
   Paste both.
2. **Fresh-agent check**, aimed at the *Branching* bullet. Run it where the developer's
   own user-level instructions do not load, such as a cloud session. If you run it
   locally, first check whether those instructions say anything about waiting on a
   pull request, and say so in the record. Set up a scratch project with this branch's
   `scripts/set-up-project.sh`, with origin `https://github.com/acme/example.git`. Put a
   stub `gh` first on `PATH` that answers `pr create` with a URL ending `/pull/7`, logs
   `pr merge`, and serves `pulls/7` as `behind` first, then `clean`, then merged with a
   `merge_commit_sha`, and a green push run on that sha. Prompt, piped on stdin: "This is
   a probe; its output will be discarded. In this project, add a line `- probe` to
   `docs/notes.md` and land it on `main` as the workflow requires. Report when you are
   done." **Pass** when the agent runs `main-status.mjs --pull-request 7` after
   `gh pr merge 7 --auto --squash`, and reports done only after it prints the merged and
   green line. Record the tool, its version, the operating system and the architecture,
   the stub's log, and the reply, abridged. Then remove the scratch project.

### Task 5 — Catalog and full verification

In `feature-catalog.yaml`, on `a-self-merging-pull-request-is-seen-through`: set
`status: shipped`, and set `modules` to `scripts/main-status.mjs`,
`scripts/framework-commit-check.sh`, `framework/workflow.md` and
`commands/release.md`. Add this comment directly above the entry's `- id:` line, below
the existing comment:

```yaml
# Shipped by docs/superpowers/plans/2026-10-31-a-self-merging-pull-request-is-seen-through.md.
# Criteria 1, 2 and 3 are covered by main-status.test.js (--pull-request), which runs the
# command against a stub gh. Criterion 4 is covered by release.test.js and
# rule-delivery.test.js, plus the fresh-agent check in the handover.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit. Then, from the
worktree:

- `npm --prefix .tropis test`: paste the `Tests:` line.
- `bash scripts/check-blueprint.sh`: paste the last line, which must start
  `Self-check passed`.
- `git diff --stat origin/main...HEAD`: paste it; every file must be in *File Structure*.

### Task 6 — Handover report, then stop

Append `## Handover report` to this plan with the six sections the planning rule names:

- **Task completion.**
- **Verification results:** each command, its actual output, and the tool, version,
  operating system and architecture, never the computer's name.
- **Scope:** the diff stat, confirmation that every file is in *File Structure*, and the
  worktree path used.
- **Judgment calls.**
- **What the plan got wrong.**
- **Outstanding.** Under it, state that the update-branch path has not run against the
  real host, and that the reviewing session should merge this pull request with
  `gh pr merge <N> --auto --squash` followed by the new command, from the worktree's
  `scripts/main-status.mjs`. It should record whether the pull request was behind
  `main` and what the command printed.

Say where the code came from: nothing outside this repository, unless something was. In
that case, name it. Commit and push. Make the pull request's body say what is now true,
ending with the attribution lines your session gives. Then stop: parent review merges.
