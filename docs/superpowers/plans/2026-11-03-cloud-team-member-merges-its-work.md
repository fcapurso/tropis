# A team member in a cloud session merges its work — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the merge token becomes the branch `tropis/merge-token`, taken and released by
git pushes alone, so a session whose `gh` cannot write (a Claude Code cloud session)
takes turns under the same token as every other; and the workflow tells such a session
how to open, update, set to merge and wait for its pull request with its own GitHub
tools.

**Backlog item:** `cloud-team-member-merges-its-work` in `feature-catalog.yaml` (type
feature). Decision: FW-063 in `framework/DECISIONS.md`. Spec:
`docs/superpowers/specs/2026-11-03-cloud-sprint-design.md`, *The answer* and *The
pieces, in order*, piece 2.

**One plan:** what becomes true is one sentence — a session merges under the one merge
token whether or not its `gh` can write.

**What the specifying session verified on 2026-11-03, against `origin/main` at `1fe8668`
(git 2.49.0, node v22.15.0, macOS 26.2 on arm64), and what a cloud session measured
(Claude Code 2.1.317, Claude Code cloud session, Linux x86_64):**

- **The cloud refuses the token as it is.** Every push to a ref outside `refs/heads/`
  answered `error: RPC failed; HTTP 403`, and every `gh` write answered
  `Write access to this GitHub API path is not permitted through this proxy. (HTTP 403)`.
  `gh` reads work there (`merge-token.mjs status`, `main-status.mjs`, `gh api … check-runs`).
- **A branch works as the token there.** With `B=refs/heads/probe/cloud-token` and a
  parentless commit whose message is the marker: `git push --force-with-lease=$B: origin
  <commit>:$B` created it; a second push with the same empty lease answered
  `! [rejected] … (stale info)` and left it; `git push --force-with-lease=$B:<first>
  origin <free commit>:$B`, the free commit's message saying `holder: none`, answered
  `(forced update)`. Deleting the branch answered HTTP 403.
- **The cloud session's GitHub tools** opened a pull request (`create_pull_request`:
  `owner`, `repo`, `title`, `head`, `base`, `body`, …), set auto-merge as a squash and
  turned it off (`enable_pr_auto_merge`: `owner`, `repo`, `pullNumber`, `mergeMethod`;
  **no subject or body**), brought its branch up to date
  (`update_pull_request_branch`, `expectedHeadSha`), closed it
  (`update_pull_request`, `state: closed`), and `subscribe_pr_activity` woke the session
  on auto-merge changes and on each check suite completing.
- **This repository's squash setting** was changed on 2026-11-03 to
  `squash_merge_commit_title: PR_TITLE`, `squash_merge_commit_message: PR_BODY`
  (`gh api repos/fcapurso/tropis --jq '{squash_merge_commit_title, squash_merge_commit_message}'`).
  Its rulesets cover only the default branch and `refs/tags/v*`, so a branch named
  `tropis/merge-token` is under neither.
- **The token today** (`scripts/merge-token.mjs`): `TOKEN_REF = 'refs/tropis/merge-token'`.
  On a GitHub origin, `readMarker` reads through `gh api …/git/ref/…` and
  `…/git/commits/<sha>`, `tryTake` creates the commit and the ref through
  `gh api -X POST …/git/commits` and `…/git/refs` (HTTP 422 meaning held), and
  `tryRelease` pushes a delete with a lease and falls back to `gh api -X DELETE`. On any
  other origin, reads are `git ls-remote` and `git fetch`, the take is
  `git push --force-with-lease=<ref>: origin <sha>:<ref>`, and the release a delete push.
  The marker commit's tree is `origin/main`'s (`markerTree`). `--ref` refuses anything
  under `refs/heads/` or `refs/tags/`. Stale judging (`judgeStale`) reads pull requests
  and the holder's branch through `gh api`, which works in the cloud.
- **Its callers:** `scripts/next.mjs` and `scripts/sprint.mjs` call `tokenStatus`; the
  workflow, `commands/release.md` and the operator guide `templates/README.md` run the
  command. `guards/merge-token.test.js` fakes a GitHub origin with a github.com URL whose
  pushes go to a path that does not exist, and a stateful stub `gh`.
- **The pull-request wait in the cloud.** `scripts/main-status.mjs` `seeThrough` brings a
  pull request behind its base up to date with `gh api -X PUT …/update-branch`; where
  that fails it stops with exit 4 and the line
  `Pull request #N: did not merge — it is behind <base> and could not be brought up to date: <reason>.`
  It otherwise only reads, so it waits correctly in the cloud.
- **Where the wording lives.** `framework/workflow.md` *The merge token* (lines 275–327)
  names the ref and the release semantics; *Merge and clean up* (329–396) gives the `gh`
  merge, `main-status.mjs --pull-request`, `gh run rerun`, and the paragraph beginning
  "Pass `--subject` and `--body` explicitly", which says the squash otherwise inherits the
  branch commits' messages. *Branching* (around line 127) repeats the merge steps.
  `commands/bootstrap.md` *The gate* and `templates/README.md` (around line 224) tell the
  developer to turn on *Allow auto-merge* and *Automatically delete head branches*;
  `templates/README.md` lines 86–91 describe the token. `guards/release.test.js` asserts
  that `commands/bootstrap.md` contains `Allow auto-merge` and the workflow contains
  `gh pr merge <N> --auto --squash` and `Automatically delete head branches`.

**Decided by the specifying session**, within FW-063:

- **One route for every origin.** Reads, takes and releases go through git
  (`ls-remote`, `fetch`, `push` with a lease) on GitHub as everywhere else; no token step
  calls `gh` any more. Stale judging keeps reading GitHub through `gh`, since reads work
  everywhere.
- **The marker commit's tree is the empty tree**
  (`git hash-object -t tree --stdin -w </dev/null`, written into the local object store
  before the push), not `origin/main`'s, so the token branch never looks like a copy of
  the code and the take no longer needs `origin/main` to be known.
- **Free** is either no `refs/heads/tropis/merge-token` on origin, or one whose commit's
  marker says `holder: none`. A take leases on what it read: empty for no branch, the
  free commit's hash otherwise. A release pushes a new free commit with the lease on the
  holder's commit. `none` is refused as a `--holder`.
- **`--ref` takes a branch for tests and live checks**: it must start with `refs/heads/`,
  and must not be the default branch or any ref outside `refs/heads/`.
- **The old ref is left alone.** A project on an earlier release still uses
  `refs/tropis/merge-token`; the operator guide says to delete it, with
  `git push origin :refs/tropis/merge-token`, once every checkout has taken this release.
  Nothing deletes it automatically.

**Model tier: Large.** The token's code changes shape (one route, a free marker), its
tests' GitHub fake has to be rebuilt around a real bare origin, and the workflow wording
is judgment.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 7; do not open a pull request, write a review record
or merge.

**A fresh-agent check is owed**, because `framework/workflow.md` changes: Task 6.

Do not store a kick-off prompt on this plan.

---

## Delivers

cloud-team-member-merges-its-work

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-cloud-merge -b plan/cloud-team-member-merges-its-work origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; a case that
  asserts the old route (an API create, an API delete) is rewritten to assert the new one,
  never dropped.
- **Never touch the live token or `main` of `fcapurso/tropis`.** Every test runs against
  a local bare origin. No live probe is part of this plan.
- **Every commit has a body** saying what becomes true; a commit touching
  `framework/` states the fresh-agent check's outcome (Task 6) once it has run.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

### 1. `scripts/merge-token.mjs`

- `TOKEN_REF` becomes `'refs/heads/tropis/merge-token'`. Update the module comment: the
  token is that branch; free is no branch or a `holder: none` marker; every command is
  git alone; stale judging asks GitHub through `gh` where origin is on GitHub.
- `readMarker` uses the git path for every origin, and returns
  `{ state: 'free', sha }` for a marker whose holder is `none` (keep `{ state: 'free' }`
  with no `sha` for an absent branch).
- `markerTree` is replaced by writing the empty tree; `tryTake` builds the marker commit
  on it and pushes with `--force-with-lease=<ref>:<sha or empty>` from what it read. A
  push refused with `stale info` (or `already exists`, or `fetch first`) means another
  took it first: read again.
- `tryRelease(ctx, sha)` pushes a new commit on the empty tree whose message is
  `merge token\n\nholder: none\n`, with `--force-with-lease=<ref>:<sha>`. Drop the delete
  push and the API fallback, and the `through the API` wording.
- `holderFor` refuses `--holder none` (`--holder must not be none, which marks a free token`).
- `parseArgs`: `--ref` must match `refs/heads/…`, refusing `refs/heads/main`, the
  default branch where it can be read, `refs/tags/…` and anything else.
- `tokenStatus`, `take`, `release` and `breakToken` keep their signatures and their
  lines, so `next.mjs` and `sprint.mjs` need no change.

### 2. `framework/workflow.md`

- *The merge token*: the token is the branch `tropis/merge-token` on `origin`, whose last
  commit names its holder; a free token is no such branch or one whose commit says
  `holder: none`; it is never deleted. Add one sentence that it is taken and released by
  git pushes alone, so it works where `gh` cannot write.
- *Merge and clean up*: add a paragraph, **Where `gh` cannot write**, for a session whose
  `gh` writes are refused (a Claude Code cloud session's answer HTTP 403). It takes and
  releases the token as everyone does. With its own GitHub tools it opens the pull
  request with the subject as its title and the body as its description, sets it to
  merge itself as a squash, and brings its branch up to date. It waits with
  `main-status.mjs --pull-request <N>`, which only reads; when that stops because the
  branch could not be brought up to date, it brings the branch up to date with its tool
  and runs the wait again. Where its tool can subscribe to the pull request's activity,
  that wakes it on each check result. Where a run must be re-run by hand (`gh run
  rerun`), it reports the line and the run's address to the developer instead. It cannot
  delete a branch, and does not need to: the repository deletes merged head branches.
- Rewrite the paragraph that begins "Pass `--subject` and `--body` explicitly": a squash
  takes its message from the pull request's title and description where the repository
  is set so (setup asks for it); pass `--subject` and `--body` anyway where `gh` can, and
  where it cannot, the title and description are the subject and body.
- *Branching*, the bullet around line 127 that lists the merge steps: add "or, where
  `gh` cannot write, as *Merge and clean up* says" after the `gh pr merge` step. Keep
  `gh pr merge <N> --auto --squash` in the text: `guards/release.test.js` asserts it.

### 3. `commands/bootstrap.md` and `templates/README.md`

- Where each tells the developer to turn on *Allow auto-merge* and *Automatically delete
  head branches*, add: and under *Allow squash merging*, set the default commit message to
  *Pull request title and description*. Keep the existing phrases: guards assert them.
- `templates/README.md`, the token paragraph (around lines 86–91): the token is the
  branch `tropis/merge-token`; add that a project which took an earlier release can
  delete the old token, `git push origin :refs/tropis/merge-token`, once every checkout
  runs this release.

## Tests

In `guards/merge-token.test.js`:

1. Rebuild the GitHub fake around a real bare origin: the clone's `origin` URL stays a
   github.com URL, with `url.<bare path>.insteadOf` (or a push and fetch URL set to the
   bare repository) so git reaches the bare repository, and the stub `gh` serves only
   what stale judging reads. Read how the file builds its clones and its stub before
   changing them.
2. Rewrite every case that asserts the old route — an API create, an API delete, the
   `through the API` line, the ref `refs/tropis/merge-token` — to assert the new one:
   the branch, the push with a lease, the `holder: none` release. Keep every behaviour
   the file tests (taken, held, kept by its holder, waits, stale, a hold, break, timeouts,
   errors).
3. † `test('a free marker is read as free, and the next take leases on it', …)`: take,
   release, then expect status `Merge token: free.`, the branch present on the bare
   origin with a `holder: none` commit, and a second session's take to succeed.
4. † `test('takes and releases where gh refuses every write and the origin refuses pushes outside branches', …)`:
   a stub `gh` that answers every non-GET with the cloud's 403 message, and a bare
   origin with a `pre-receive` hook that refuses any ref outside `refs/heads/`. Expect
   take, release and a second take to exit 0.
5. † `test('refuses none as a holder', …)` and † a case that `--ref refs/heads/main` and
   `--ref refs/tropis/x` are refused, `--ref refs/heads/probe/x` accepted.

Run `guards/next-report.test.js`, `guards/sprint.test.js` and
`guards/team-member-cli.test.js`; change them only where a case names the old ref or
the API route, and say which in the handover.

Every † case must fail before the change and pass after it.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change. The installed `merge-token.mjs`
  still uses the old ref; do not take the live token with the source script.
- **Run a single guard the way the self-check runs one**: `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs guards there
  through `scripts/check-conformance.sh`. Run the guards you change against that tree
  with the jest under `.self-check/`, and say the exact command in the handover.
- **A framework document may name a path in backticks only if it exists in a project**
  (`framework-integrity`). Name the spec, plans and anything under `docs/superpowers/`
  in plain text in `framework/workflow.md`, `commands/` and `templates/`.
- **`--force-with-lease=<ref>:` with an empty value** is the lock form: it refuses when
  the ref exists. The lease must name exactly the commit that was read.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/merge-token.mjs` | the token is a branch; one git route; the free marker |
| `guards/merge-token.test.js` | the fake rebuilt around a bare origin; cases rewritten and added |
| `guards/next-report.test.js` | only where a case names the old ref or route |
| `guards/sprint.test.js` | only where a case names the old ref or route |
| `guards/team-member-cli.test.js` | only where a case names the old ref or route |
| `framework/workflow.md` | *The merge token*, *Merge and clean up*, *Branching* |
| `commands/bootstrap.md` | the squash setting |
| `templates/README.md` | the squash setting; the token's place; deleting the old one |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to cases (Task 7) |
| `docs/backlog-board/bands.yaml` | the item's row removed (Task 7) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-cloud-team-member-merges-its-work.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the workflow, the setup command and the
operator guide change here; FW-063 is the decision, already recorded; no rule names the
token's ref. No upstream queue: this repository is the upstream. A release-note line is
the developer's at `/release`; it should name the two steps an adopting project takes:
the squash setting, and deleting the old token ref once every checkout has updated.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version`, `uname -sm` and `claude --version`.

### Task 1 — The tests, red

Rebuild the fake and add the † cases (*Tests*, items 1, 3, 4 and 5); leave the existing
cases' assertions as they are for now. Commit. Run the guard alone. Expected: the †
cases fail, and the existing cases still pass on the rebuilt fake. Paste the failing
names.

### Task 2 — The token

Change `scripts/merge-token.mjs` as *The change* §1 says, and rewrite the existing cases
that assert the old route (*Tests*, item 2). Commit. Run the guard alone: all pass.
Then run the three other guards alone and fix only what names the old ref or route.
Commit if anything changed.

### Task 3 — The workflow

Change `framework/workflow.md` as *The change* §2 says. Commit (the body's fresh-agent
line is added when Task 6 has run).

### Task 4 — Setup and the operator guide

Change `commands/bootstrap.md` and `templates/README.md` as *The change* §3 says. Commit.

### Task 5 — The self-check

`bash scripts/check-blueprint.sh`; last line starts `Self-check passed`. Paste it.

### Task 6 — The fresh-agent check

In a scratch clone of this branch outside the repository, run
`claude -p --output-format stream-json --verbose` with a prompt saying that it is a
probe and its output is discarded, that it is a team member in a Claude Code cloud
session where every `gh` write answers HTTP 403 but `gh` reads, git pushes to branches
and its own GitHub tools work, that the reviewed branch `plan/example-change` of an
invented plan is ready, and asking it to list, in order, every command and tool call it
would run to merge it under this repository's workflow, without running any. The agent
has only the repository. It passes when its list takes the token with
`merge-token.mjs take`, opens the pull request with its own tool with the subject as
title and the body as description, sets auto-merge as a squash with its tool, waits with
`main-status.mjs --pull-request` or a subscription and brings the branch up to date with
its tool, and releases the token with `--holder`. Quote the relevant part of its answer
in the handover, with its tool, version, operating system and architecture. If it
misses a step, change the workflow's wording until a new run finds it, and say so. Then
amend Task 3's commit body, or add a commit, stating the outcome.

### Task 7 — The backlog, the board and the handover

1. In `feature-catalog.yaml`, on `cloud-team-member-merges-its-work`: set
   `status: shipped`, set `modules` to `scripts/merge-token.mjs` and
   `framework/workflow.md`, and add above the item a comment
   `# Shipped by docs/superpowers/plans/2026-11-03-cloud-team-member-merges-its-work.md.`
   with one line per acceptance criterion naming the case or check that covers it. No
   `: ` inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the item's whole block, nothing else.
3. Commit. Run `npm --prefix .tropis test` (paste `Tests:`), `bash scripts/check-blueprint.sh`
   (paste the last line) and `git diff --stat origin/main...HEAD` (paste it).
4. Append `## Handover report` with the six sections the planning rule names: Task
   completion, Verification results (each command, its output, and the tool, version,
   operating system and architecture — never the computer's name), Scope, Judgment
   calls, What the plan got wrong, Outstanding (say the change has no screen; the live
   check, a cloud session merging under the new token, is the developer's to run after
   release). Commit.
5. `git push -u origin plan/cloud-team-member-merges-its-work`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in place.

## Handover report

### Task completion

Tasks 0 to 7 are done. Task 1's red run: 19 of 34 cases failed against the old script,
including the four new cases and the two new refusal cases. Most of the others failed
only because the guard's `REF` constant already named the new branch (see *What the plan
got wrong*). Task 6 needed no wording change.

### Verification results

All on git 2.49.0, node v22.15.0, macOS 26.2 on arm64 (`uname -sm`: Darwin arm64),
Claude Code 2.1.300.

- Guards alone, run the way the self-check runs one: export `HEAD` with `git archive`
  into a scratch folder, add `{"type":"module"}` as `package.json`, copy
  `templates/framework-jest.config.js` to `jest.config.js`, link `.self-check/node_modules`,
  then `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js
  guards/merge-token.test.js guards/next-report.test.js guards/sprint.test.js
  guards/team-member-cli.test.js`. Output: `Test Suites: 4 passed, 4 total`,
  `Tests: 134 passed, 134 total`.
- `npm --prefix .tropis test`: `Tests:       161 passed, 161 total`.
- `bash scripts/check-blueprint.sh`, last line: `Self-check passed: every guard caught its
  defect, the clean baseline passed, and the framework repository's own guards passed.`
  Run on the final head, and earlier on the workflow commit.
- Fresh-agent check (Task 6): `claude -p --output-format stream-json --verbose` in a
  scratch clone of the branch outside the repository, no `ANTHROPIC_API_KEY`, signed in
  on the developer's plan. Its only tool calls were two read-only `grep`/`sed` reads of
  `framework/workflow.md`. Its list: `plan-overlap.mjs --wait`, `merge-token.mjs take`,
  rebase, merge criteria, push, "Create the pull request with my GitHub tool ... The
  title is the squash subject ... The description is the squash body", "Enable
  auto-merge with my GitHub tool ... method squash", subscribe to the pull request's
  activity, `main-status.mjs --pull-request <N>` with "Exit 4 because the branch fell
  behind ...: I update it with my GitHub tool and run step 10 again", "`gh run rerun`,
  which I can't run here. Instead I report the line and the run's address to the
  developer", and `merge-token.mjs release --holder plan/example-change`. It passes.
  The probe was told to follow `framework/workflow.md` (the source), because the
  installed copy under `.claude/` is the last release. The author's global instructions
  loaded in the probe and say nothing about merging. It also noted that the installed
  `.tropis/scripts/` still hold the old token script, which is expected until a release.

### Scope

`git diff --stat origin/main...HEAD` lists eight files, all in the File Structure table:
`commands/bootstrap.md`, `docs/backlog-board/bands.yaml`, `feature-catalog.yaml`,
`framework/workflow.md`, `guards/merge-token.test.js`, `guards/next-report.test.js`,
`scripts/merge-token.mjs`, `templates/README.md` (plus this plan file, below). Worktree:
`../tropis-cloud-merge`, from the `tropis` checkout. `docs/backlog-board/index.html` did
not change. `guards/sprint.test.js` and `guards/team-member-cli.test.js` needed no change.

### Judgment calls

- Named source: none. The code is written against this repository's own script.
- The GitHub-origin fake uses a `git` shim on `PATH` that swaps `origin` for the bare
  repository's path in `ls-remote`, `fetch` and `push`, because `git remote get-url`
  expands `url.<x>.insteadOf` rules, so the plan's suggested `insteadOf` would have made
  the script see a non-GitHub origin.
- The lost-reply case (create succeeded, reply lost) cannot happen with a push, so it
  became "retries a push that failed for another reason" (a one-time `pre-receive`
  refusal); the rival-422 case became a planted rival marker; the three-failed-reads
  case points the shim at a missing path.
- `--ref` is also checked inside `open`, so callers of the exported functions get the
  same refusals; `refs/heads/master` is refused as well as `main`, and the default
  branch is read from `refs/remotes/origin/HEAD` where it exists.
- `guards/next-report.test.js` changed (the plan allowed it only where a case names the
  old route): its red-main case stubbed the token read through `gh api`; it now uses a
  `git` shim that reads an empty local repository, since the read is git alone. Without
  the change that case would have run `git ls-remote` against github.com.
- A refused `--ref` on the command line is a usage error from argument parsing (exit 2,
  no token line); only the exported functions report it as a token line.

### What the plan got wrong

- Task 1 expected the existing cases to pass on the rebuilt fake before the script
  changed. They cannot: they read the token at `REF`, which this change moves, so they
  fail until the script moves too. I changed `REF` in the same commit as the new cases.
- The `url.<bare>.insteadOf` suggestion does not work (see Judgment calls).
- "`next.mjs` and `sprint.mjs` need no change" is true, but `guards/next-report.test.js`
  needed one, as above, which the plan's wording ("only where a case names the old ref
  or route") allowed.

### Outstanding

The change has no screen. The live check, a cloud session taking, releasing and merging
under the new token, is the developer's to run after release. A project on an earlier
release deletes the old token ref with `git push origin :refs/tropis/merge-token` once
every checkout has taken this release (written in the operator guide); the release note
should name that and the squash setting. Until a release is installed, the installed
`.tropis/scripts/merge-token.mjs` still uses the old ref, so do not use it against a
project that has taken this source.
