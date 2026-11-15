# A session's prose changes land as one pull request — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** a session on a gated main branch collects its prose steps — a backlog edit, a
board refresh, a plan file, a claim — on one branch, one commit per step, and lands them
through one pull request that merges by rebase, so a sitting costs one set of pipeline
runs instead of one per step, and the main branch still keeps one revertible commit per
step. The tools make that possible: `auto-merge.mjs` sets a rebase merge, on both its
routes, only for a pull request that is prose, and `main-status.mjs --pull-request`
stops a rebase-merge pull request that fell behind instead of merging the base into it.

**Backlog item:** `a-sessions-prose-lands-as-one-pull-request` in `feature-catalog.yaml`
(type improvement). No spec: the backlog item's acceptance criteria, the decisions in the
comment above it, and this plan are the spec.

**One plan:** what becomes true is one sentence — a session's prose lands as one pull
request with one commit per step. The two script changes exist only to serve that
clause.

**Model tier: Medium.** Every piece of prose is given verbatim below; the two script
changes are specified case by case, and their tests are the executor's to write against
the existing stubs.

**Merge authority: parent review.** The specifying session reviews, runs the fresh-agent
check of the workflow clause, opens the pull request and merges. Stop after Task 8; do
not open a pull request, write a review record or merge.

**A fresh-agent check is owed, and is not the executor's.** The change alters what every
session is told in `framework/workflow.md`, `commands/dispatch.md` and
`commands/refresh-board.md`. The workflow says whoever wrote the clause dispatches the
probe; the specifying session wrote it (it is verbatim below), so it runs the probe at
review and records it in the squash commit's body.

**Where the wording came from.** first-adopter runs this as a local rule, written
2026-11-13; the developer relayed a brief of it on 2026-11-15. The clause below is this
repository's own restatement of that brief, in Tropis's names. Nothing of that project's
text, paths or pull request numbers is quoted, and nothing may be: this repository is
public.

**What the specifying session verified on 2026-11-15, against `origin/main` at
`a464046`:**

- `scripts/auto-merge.mjs` runs `gh pr merge <N> --auto --squash --subject … --body …`,
  and only on gh's answer containing `GitHub GraphQL is not available` calls
  `gh api -X PUT repos/{owner}/{repo}/pulls/<N>/ccr/auto_merge -f merge_method=squash
  -f commit_title=… -f commit_message=…`, and accepts the route's answer only when its
  JSON has `enabled: true`. `parseArgs` reads flags in pairs and requires both
  `--subject` and `--body`. It imports `originOnGitHub` from `./main-status.mjs`.
- `guards/auto-merge.test.js`'s last case lists
  `['17', '--subject', subject, '--body', body, '--rebase', 'yes']` among the command
  lines refused with exit 2, and every refusal is asserted to print a usage containing
  `usage: auto-merge.mjs <number> --subject <subject> --body <body>`. Its stub gh answers
  every `api` call with the cloud route's answer.
- `scripts/main-status.mjs`'s `seeThrough`, on `mergeable_state === 'behind'`, calls
  `PUT repos/{owner}/{repo}/pulls/<N>/update-branch`, once per head commit. That endpoint
  only merges the base in. The pull request it reads carries `auto_merge`, which is
  `null` when auto-merge is off and otherwise an object with `merge_method`. Its
  docstring says it "makes no local git change". `guards/main-status.test.js` stubs
  gh by path: `pulls/<n>` answers `pull-<k>.json` on its k-th call, else `pull.json`.
- `scripts/pipeline.mjs` exports `planStages(root, { base, head })`, which diffs
  `base...head` (three dots: from the merge base) and returns `{ stages, reason }`;
  `stages.framework` is always `run`, every other stage is `skipped` exactly when every
  path is a framework path (`FRAMEWORK_PATHS`) or prose under `pipeline/prose.txt`, and
  `reason` is non-null only for a full run (no base, an unresolved base, an empty diff).
  `pipeline.mjs` runs its command line only when run directly, so importing it is safe.
  This is the definition decision 5 names: `pipeline.mjs plan --base <merge-base> --head
  HEAD` prints these values.
- The maintainer's flushed groups land by rebase through `.claude/commands/absorb-flush.md`,
  which runs `gh pr merge <number> --rebase --delete-branch` itself and never calls
  `auto-merge.mjs`. So a prose check inside `auto-merge.mjs` cannot refuse them. That
  command is this repository's own, not shipped, and this plan does not touch it.
- These guards pin wording this plan keeps, and must keep passing unchanged:
  `guards/release.test.js` (the workflow contains `gh pr merge <N> --auto --squash`,
  `then run \`node .tropis/scripts/main-status.mjs --pull-request <N>\``, and
  `node .tropis/scripts/auto-merge.mjs <N> --subject <subject> --body <body>`; the
  release command contains `It runs \`gh pr merge <N> --auto --squash\`, and only where`),
  `guards/rule-delivery.test.js` (the merge hooks' squash commands, and the commit hook
  saying `gh pr merge <N> --auto --squash`), and `scripts/framework-commit-check.sh`.
  The squash route stays the route for everything that is not a prose batch, so none of
  that wording changes.
- `templates/README.md` (the operator guide projects get as `.tropis/README.md`)
  describes `auto-merge.mjs` and `main-status.mjs --pull-request` in two paragraphs
  starting `` `/next` opens with one line on the main branch `` and
  `` `node .tropis/scripts/auto-merge.mjs <N> --subject <subject> --body <body>` sets a pull ``.
- The last decision in `framework/DECISIONS.md` is FW-075. `RELEASES.md` has
  `_Nothing yet._` under `## [Unreleased]`.
- GitHub's REST answer for this repository allows rebase merges, and the main ruleset
  lists `allowed_merge_methods: merge, squash, rebase` (the developer checked it
  2026-11-15).

**Measured before this plan was dispatched.** A rebase merge of one commit through the
cloud route answered `{"enabled":true,"merge_method":"rebase"}` and `merge_commit_sha`
named the commit the main branch moved to (first-adopter, 2026-11-13, Claude Code
2.1.323, Linux x86_64). This plan's own claim — two commits — lands by rebase through
the same route, and the specifying session reads what `merge_commit_sha` names and
whether the push run is found on it before dispatching. Task 6 has the executor read
that result again and record it.

**Decisions this plan carries (the developer's, 2026-11-15, and the specifying
session's):**

1. A batch belongs to one session; it never adds to a branch another or an earlier
   session started.
2. One commit per step, its own message, pushed after each step.
3. The pull request opens only on the developer's word.
4. It merges by rebase.
5. Prose is what `pipeline.mjs plan` says; no second definition anywhere.
6. A session with nobody to give the word — a sprint's team member — does not batch.
7. Before a dispatch, the session says the plan is not on the main branch and asks for
   the word.
8. A turn ending with steps not landed names the branch and each commit's subject.
9. When the main branch moves under a pull request set to merge by rebase,
   `main-status.mjs` stops with exit 4 and says to rebase and run it again. It makes no
   local git change and pushes nothing. (This is how the seventh acceptance criterion is
   read: the session rebases; the script never merges the base in.)
10. `auto-merge.mjs` refuses a rebase for a pull request that is not prose.
11. **The command line (the specifying session's choice):**
    `auto-merge.mjs <number> --rebase`, with no `--subject` and no `--body`: a rebase
    writes no commit of its own, so there is no message to give. `--rebase` given with
    either is refused as a command line it does not understand (exit 2), never ignored.
12. **How `auto-merge.mjs` decides prose (the specifying session's choice):** it asks
    the host for the pull request (`gh api repos/{owner}/{repo}/pulls/<N>`), takes
    `base.sha` and `head.sha`, and calls `planStages(root, { base: base.sha, head:
    head.sha })` from `./pipeline.mjs` — the function behind `pipeline.mjs plan`, three
    dots, so from the merge base. Prose is `reason` null, `framework` `run` and every
    other stage `skipped`. It runs no fetch: a commit missing locally is refused with a
    line that says to fetch `origin` and run it again.

---

## Delivers

a-sessions-prose-lands-as-one-pull-request

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-prose-batches -b plan/a-sessions-prose-lands-as-one-pull-request origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every existing
  case in `guards/auto-merge.test.js` and `guards/main-status.test.js` keeps passing with
  its assertions unchanged.
- **Keep the squash route and its wording.** Nothing in this plan changes how a plan, a
  claim on its own, or a release lands.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover, and nothing quoted from first-adopter.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `scripts/auto-merge.mjs` | `--rebase`: the prose check, then `gh pr merge --auto --rebase`, or the cloud route with `merge_method=rebase`; header comment and usage follow |
| `guards/auto-merge.test.js` | new cases for `--rebase`; the stub gh answers the pull request read |
| `scripts/main-status.mjs` | `seeThrough` stops a rebase-merge pull request that is behind; header comment and docstring follow |
| `guards/main-status.test.js` | new cases for a rebase-merge pull request behind its base |
| `framework/workflow.md` | the prose-batch clause in *Branching*; one sentence each in *Branching*'s gated bullet, *Merge and clean up*, *Merging* and *Delivering a backlog item* |
| `commands/dispatch.md` | a paragraph: a plan still in a batch is landed first |
| `commands/refresh-board.md` | step 6 names the batch |
| `templates/README.md` | the operator guide's two paragraphs on the two scripts |
| `framework/DECISIONS.md` | FW-076 appended |
| `RELEASES.md` | one line under `## [Unreleased]`, replacing `_Nothing yet._` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session does this at merge; the executor does not touch it) |
| `docs/superpowers/plans/2026-11-15-a-sessions-prose-lands-as-one-pull-request.md` | this plan; the handover report |

## Task 1 — `auto-merge.mjs --rebase`, tests first

**The tests.** In `guards/auto-merge.test.js`:

- Extend the stub gh so an `api` call whose path is exactly
  `repos/{owner}/{repo}/pulls/<n>` (no further segment) prints the file
  `$STUB_DIR/pull.json` and exits 0; every other `api` call keeps today's behaviour. Say
  so in the stub's comment.
- Give the throwaway repository a real history, so the prose check runs the real
  `planStages`: an identity of its own (`git config user.name`/`user.email` in that
  repository), a first commit, and two branches from it — one whose commit changes only
  `feature-catalog.yaml` (a framework path, so prose) and one whose commit changes
  `src/app.js` (neither framework nor prose). `pull.json` names the first commit as
  `base.sha` (`base.ref` `main`) and one of the two as `head.sha`.

Cases, each asserting exit code, the exact line printed and the gh calls, filtered by
kind as the existing cases do (`.claude/rules/tests.md`, *Assert a shared fake by
name*):

1. Prose head: `cli('17', '--rebase')` exits 0, prints
   `Pull request #17: set to merge itself by rebase.`, and its `pr merge` call is exactly
   `['pr', 'merge', '17', '--auto', '--rebase']`.
2. Prose head, gh refused GraphQL: exits 0, prints
   `Pull request #17: set to merge itself by rebase, through the cloud session's route.`,
   and its `ccr/auto_merge` call is exactly
   `['api', '-X', 'PUT', 'repos/{owner}/{repo}/pulls/17/ccr/auto_merge', '-f', 'merge_method=rebase']`
   — no title, no message.
3. Code head: exits 1, prints
   `Pull request #17: not set to merge itself — it is not prose: the pipeline's plan runs <stages> on it, and only prose merges by rebase.`
   where `<stages>` is the stages other than `framework` that `planStages` did not mark
   `skipped`, comma-separated, in pipeline order (build the expected value from the
   repository you made: with no `pipeline/*.sh` in it they are `empty`, so list every
   stage that is not `skipped`, whatever its value). No `pr merge` call and no
   `ccr/auto_merge` call.
4. `head.sha` names a commit that is not in the repository (forty hex digits that
   resolve to nothing): exits 1, prints
   `Pull request #17: not set to merge itself — <short sha> is not in this repository; run git fetch origin and run this again.`
   with the first seven characters. No `pr merge` call. The same for `base.sha`.
5. The pull request read fails (make the stub fail that path when a file
   `pull-fails` exists, answering `gh: Not Found (HTTP 404)` on stderr): exits 1, prints
   `Pull request #17: not set to merge itself — gh could not read the pull request: gh: Not Found (HTTP 404).`
6. Command lines refused with exit 2 and the usage, with no gh call: add
   `['17', '--rebase', '--subject', subject]`, `['17', '--rebase', '--body', body]`,
   `['17', '--subject', subject, '--body', body, '--rebase']` and
   `['17', '--rebase', '--rebase']` to the existing table. The existing
   `['17', '--subject', subject, '--body', body, '--rebase', 'yes']` stays and must stay
   refused.
7. Every case in the table asserts the usage still contains
   `usage: auto-merge.mjs <number> --subject <subject> --body <body>`, as today, and now
   also `auto-merge.mjs <number> --rebase`.

Run the file (Task 8, step 2, says how) and see cases 1–5 fail and the new rows of the
table fail — they pass today only because today's parser refuses everything unknown, so
the four new rows may pass before the change; say which did in the handover.

**The script.** In `scripts/auto-merge.mjs`:

- `parseArgs` returns `{ number, rebase: true }` for exactly `<number> --rebase`, the
  squash options as today for `<number> --subject … --body …` in either order, and null
  for anything else, `--rebase` mixed with `--subject` or `--body` included.
- `USAGE` becomes two lines:
  ```
  usage: auto-merge.mjs <number> --subject <subject> --body <body>
         auto-merge.mjs <number> --rebase
  ```
- `autoMerge` with `rebase`: after the origin check, read the pull request with
  `gh api repos/{owner}/{repo}/pulls/<N>` (parse its JSON; a failure is case 5's line,
  with gh's first stderr line, without a trailing full stop added twice). Check each of
  `base.sha` and `head.sha` resolves with `git rev-parse --verify --quiet <sha>^{commit}`
  in `root` (case 4). Call `planStages(root, { base: base.sha, head: head.sha })`; if it
  returns `error`, refuse with `the pipeline's plan failed: <error>`. Prose when `reason`
  is null and every stage but `framework` is `skipped`; otherwise case 3. Then
  `gh pr merge <N> --auto --rebase`, and on the GraphQL refusal only, the route with
  `-f merge_method=rebase` and nothing else. Every other refusal and route answer is
  handled exactly as for a squash today, with `by rebase` where the success lines say
  `as a squash`.
- The squash path does not read the pull request and does not run the prose check.
- Import `planStages` from `./pipeline.mjs`.
- The header comment states both command lines, that a rebase is for a pull request of
  prose alone and how prose is decided (the plan command's own function, so there is no
  second definition), that a rebase sets no title or message because it writes no commit
  of its own, that the maintainer's flushed groups run `gh pr merge --rebase` themselves
  and never come here, and the measurement: the cloud route answered `enabled` with
  `merge_method` `rebase` (2026-11-13, Claude Code 2.1.323, Linux x86_64).

Run the file again: every case passes.

## Task 2 — `main-status.mjs` stops a rebase-merge pull request that is behind

**The tests.** In `guards/main-status.test.js`, in the `--pull-request` block, beside
`brings a branch that is behind up to date once, and waits on`:

1. A pull request with `mergeable_state: 'behind'` and
   `auto_merge: { merge_method: 'rebase' }`: exits 4, prints exactly
   `Pull request #7: did not merge — it is behind main and set to merge by rebase, which this does not update: rebase the branch on main, push it with --force-with-lease, and run this again.`
   and `updates()` is `[]`.
2. The same with `merge_method: 'squash'` behaves as today: one update-branch call, and
   on to the merge (reuse the existing case's sequence).
3. A rebase-merge pull request that is `clean` and then merged waits and reports green
   as any other: rebase changes nothing but the behind case.

Look at how the existing cases build `pull(...)` (the helper sets `auto_merge`; check
what it sets by default and override it). See case 1 fail first.

**The script.** In `seeThrough`, when `mergeable_state === 'behind'` and
`pull.auto_merge?.merge_method === 'rebase'`, return `stopped(...)` with the line above,
before any update-branch call. Update the module's header comment (the list of reasons
it exits 4 gains this one) and `seeThrough`'s docstring: a branch behind its base is
brought up to date through update-branch only when the pull request is set to merge
other than by rebase, since update-branch merges the base in and a rebase merge would
then carry that merge commit; a rebase-merge pull request that is behind stops with
exit 4. It still makes no local git change.

Run the file: every case passes.

## Task 3 — the workflow

All in `framework/workflow.md`. Insert the text exactly as given; reflow nothing else.

**3a.** In *Branching*, insert this bullet directly after the bullet that starts
`- **Where the main branch is gated, nothing goes directly to \`main\`.**` and ends
`the plan (*Plans that touch the same files*).`, and before the bullet starting
`- **Where it is not gated, what may go directly to \`main\`**`:

```markdown
- **A session's prose lands as one pull request.** On a gated main branch each pull
  request starts the pipeline when it opens, again when it merges, and on the push to
  `main`. So a session that makes several prose steps in one sitting — a backlog edit,
  a board refresh, a plan file, a claim — collects them on one branch and lands them
  together, and the main branch still keeps one commit per step.
  - **Prose is what the pipeline says it is.** A step is prose when
    `node .tropis/scripts/pipeline.mjs plan --base "$(git merge-base origin/main HEAD)" --head HEAD`,
    run on the batch, prints `framework=run` and `skipped` for every other stage.
    Nothing else decides it. A change under `.claude/`, `.tropis/` or the project's
    tooling that the pipeline counts as framework is prose here too, and a step touching
    rules, rule additions, framework documents or commands still owes its fresh-agent
    check, written in that step's own commit body.
  - **A batch is one session's.** The first prose step of a sitting starts it, on a
    branch `prose/<yyyy-mm-dd>-<slug>` in a worktree `../<repo>-prose-<slug>`, from
    `origin/main` like any branch. A session adds only to the batch it started itself,
    never to a branch another session or an earlier one started.
  - **One commit per step, with its own message, pushed when the step is done.** The
    message says what the step makes true, as a squash message would: it is the commit
    the main branch will keep.
  - **A step that is not prose leaves the batch.** After committing a step, run the
    plan command above. When it runs any other stage, cherry-pick that commit onto a
    branch of its own from `origin/main`, in a worktree of its own, then
    `git reset --hard HEAD~1` in the batch's worktree, and land the step as a plan or a
    change of its own. Never `git stash`: the stash is shared by every worktree of the
    repository, so another session can take it.
  - **The pull request opens on the developer's word.** Until then the steps wait on the
    branch. Ask when the sitting's prose is done, or as soon as something needs a step
    on `main`. Then land it as the gated bullet above says, with two differences. Set it
    to merge itself by rebase, `node .tropis/scripts/auto-merge.mjs <N> --rebase`, which
    refuses a pull request that is not prose; the pull request's title and description
    then say only what the batch holds, because no squash commit is written from them.
    And when `main-status.mjs --pull-request <N>` stops because the branch is behind,
    run `git fetch origin && git rebase origin/main` in the batch's worktree, push with
    `--force-with-lease`, and run it again.
  - **A claim in the batch is checked again before it lands.** It was overlap-checked
    against `main` as it stood when the step was made. Before the pull request opens,
    run `node .tropis/scripts/plan-overlap.mjs --claim <plan>` again for each claim in
    the batch, and commit any `Merges after` line it writes as one more step.
  - **Whatever needs a step on `main` waits for the batch to land.** A dispatch is one:
    its executor starts from `origin/main`, where a plan still in the batch is not.
    Before a dispatch, say that the plan is not on the main branch yet, and ask for the
    word to land the batch.
  - **A turn that ends with steps not landed says so.** It names the batch's branch and
    the subject of each commit on it.
  - **After it lands, check that it landed as steps.** Note `origin/main` before the
    merge. Afterwards `git log --merges <before>..origin/main` prints nothing, and each
    step's subject appears once in `git log --format=%s <before>..origin/main`. Commits
    other pull requests landed meanwhile appear there too and are not a fault. Then
    remove the worktree and delete the branch, as *Merge and clean up* does.
  - **A session with nobody to give the word does not batch.** A team member a sprint
    started lands each step through a pull request of its own, as the gated bullet
    above says.
```

**3b.** In the gated bullet itself, replace the sentence

```
The command brings it up to date and keeps waiting, and
  stops, naming the pull request, when it conflicts, a check fails, or auto-merge is
  off.
```

with

```
The command brings it up to date and keeps waiting, and
  stops, naming the pull request, when it conflicts, a check fails, auto-merge is
  off, or a pull request set to merge by rebase falls behind.
```

(match the line breaks as they are in the file; only the end of the sentence changes).

**3c.** In *Merge and clean up*, in the paragraph that begins
`**Where the main branch is gated, the merge is`, after the sentence ending
`on the merge commit itself rather than on \`HEAD\`.`, insert:

```markdown
A pull request set to merge by rebase — a session's prose batch, *Branching* — is
never brought up to date that way, because the host's update merges `main` into the
branch, and a rebase would carry that merge commit onto `main`: the command stops with
exit 4 instead, and the session rebases and pushes the branch and runs it again.
```

**3d.** In *Merging*, at the end of the paragraph that begins
`**In the framework's own repository, a group of flushed contributions is the exception.**`
(it ends `A plan for one backlog item still lands as one squash-merge.`), append:

```markdown
A session's batch of prose steps lands by rebase too, for the same reason, in every
project (*Branching*, *A session's prose lands as one pull request*).
```

**3e.** In *Delivering a backlog item*, step 2 ends `under the merge token.`; append to
it:

```markdown
A team member a sprint started lands it as its own pull request: it has nobody to give
the word a batch waits for.
```

## Task 4 — the commands and the operator guide

**4a.** `commands/dispatch.md`: after its first paragraph (ending `into a **new**
session.`), insert:

```markdown
The executor starts from `origin/main`. If the plan, or its claim, is still a step in
this session's batch of prose (workflow.md, *Branching*), say that it is not on the main
branch yet and ask the developer for the word to land the batch; dispatch once it has
landed.
```

**4b.** `commands/refresh-board.md`, step 6: replace

```
It is a file under `docs/`, so it goes directly on `main`, or, where the main branch
is gated, through a pull request that merges itself (workflow.md, *Branching*).
```

with

```
It is a file under `docs/`, so it goes directly on `main`, or, where the main branch
is gated, through a pull request that merges itself (workflow.md, *Branching*) — or,
where this session is collecting its prose on one branch, as one more step on it.
```

(match the line breaks as they are; only the end of the sentence changes).

**4c.** `templates/README.md`:

- In the paragraph starting `` `/next` opens with one line on the main branch ``, after
  `It waits until it has merged, bringing its branch up to date when \`main\` moves, and
  says why when it did not merge.`, insert: `A pull request set to merge by rebase is
  not brought up to date that way: it stops and says to rebase the branch and run it
  again.`
- At the end of the paragraph starting
  `` `node .tropis/scripts/auto-merge.mjs <N> --subject <subject> --body <body>` sets a pull ``,
  append: `` `node .tropis/scripts/auto-merge.mjs <N> --rebase` sets it to merge by
  rebase instead, keeping each of its commits on \`main\`, and refuses unless the pull
  request is prose by the pipeline's own plan: a session's batch of prose steps lands
  this way (\`.claude/framework/workflow.md\`, *Branching*). ``

## Task 5 — the decision record

Append to `framework/DECISIONS.md`, after FW-075, with a blank line before the heading:

```markdown
## FW-076: A session's prose lands as one pull request, merged by rebase

**Date:** 2026-11-15 · **Status:** Accepted; built by the backlog item
`a-sessions-prose-lands-as-one-pull-request`.

**Decision:** On a gated main branch, a session collects its prose steps on one branch
of its own, one commit and one push per step, and lands them through one pull request,
opened on the developer's word, that merges by rebase so the main branch keeps one
commit per step. Prose is what `pipeline.mjs plan` says: the framework stage runs and
every other stage is skipped. `auto-merge.mjs <N> --rebase` sets the rebase merge on
both its routes and refuses a pull request that is not prose, asking the same function
the plan command uses. `main-status.mjs --pull-request` does not bring a rebase-merge
pull request up to date: it stops with exit 4 and the session rebases and runs it again.
A session with nobody to give the word, such as a sprint's team member, does not batch.

**Evidence:** first-adopter, where each pull request costs a run on opening, one on
merging and one on the push to its main branch, about 14 billed minutes, and a sitting
of small prose steps paid that once per step; it has worked this way under a rule of its
own since 2026-11-13. The cloud session's auto-merge route accepted `merge_method`
`rebase` there, and after a rebase merge of one commit `merge_commit_sha` named the
commit its main branch moved to (Claude Code 2.1.323, Linux x86_64). <MEASURED>
Source: first-adopter's rule, restated; no text copied.

**Rejected:** Waiting until the two backlog items that make a prose pull request
cheaper had shipped, and measuring a week: first-adopter's use already answers whether a
second way to land is worth having. Squash-merging the batch: it would fold several
steps into one commit and one message, and a step could no longer be reverted alone.
Letting `main-status.mjs` rebase and push the branch itself: it makes no local git
change and pushes nothing, and a rebase can conflict, which is the session's to
resolve. Bringing it up to date with the host's update-branch, as for a squash: that
merges the base in, and a rebase merge would carry the merge commit onto `main`, which
nobody has measured. Refusing a rebase only by convention: nothing would stop a code
change landing as several unreviewed commits.

**Consequences:** Two ways to land on a gated main branch, told apart by what the pull
request holds: a plan, and anything that is not prose, as one squash commit; a session's
prose batch as its commits. The maintainer's flushed groups keep their own rebase merge,
which `absorb-flush` runs with `gh pr merge --rebase` and which never passes through
`auto-merge.mjs`. A plan still in a batch is not on `main`, so a dispatch waits for the
batch to land.
```

Task 6 replaces `<MEASURED>`.

## Task 6 — the measurement this plan's claim took, recorded

This plan's claim landed by a rebase merge of two commits through the cloud route. Find
it: the two commits on `origin/main` whose subjects begin `backlog: shape
a-sessions-prose-lands-as-one-pull-request` and `backlog: claim
a-sessions-prose-lands-as-one-pull-request` (`git log --format='%H %s' origin/main`).
Then:

1. `gh api 'repos/{owner}/{repo}/commits/<sha of the claim commit>/pulls' --jq '.[0].number'`
   names the pull request.
2. `gh api 'repos/{owner}/{repo}/pulls/<N>' --jq '[.merged, .merge_commit_sha] | @tsv'`.
3. `gh run list --workflow pipeline.yml --commit <merge_commit_sha> --event push --json status,conclusion,headSha`.

Record in the handover which of the two commits `merge_commit_sha` names (expected: the
later one, the commit `main` moved to), and whether step 3 found the push run. Replace
`<MEASURED>` in FW-076 with one sentence saying what was found, in this form, filled in:
`In this repository, a rebase merge of two commits through the same route named the
later of them as merge_commit_sha, and the push run was <found on it | not found on
it> (2026-11-15, Claude Code <version>, Linux x86_64).` Use the Claude Code version
from `claude --version` and `uname -sm` for the platform. If `gh` refuses a call, record
the refusal and write `not measured here: <the refusal>` in place of the sentence.

If `merge_commit_sha` is **not** the later commit, or the push run is not found on it,
stop after recording it and say so at the top of the handover: `main-status.mjs` waits
on that commit, and the plan relies on it.

## Task 7 — the release notes

In `RELEASES.md`, replace `_Nothing yet._` under `## [Unreleased]` with:

```markdown
- On a gated main branch, a session can collect its prose steps — backlog edits, board refreshes, plans, claims — on one branch and land them through one pull request merged by rebase, so a sitting costs one set of pipeline runs and `main` still keeps one commit per step. `node .tropis/scripts/auto-merge.mjs <N> --rebase` sets that merge and refuses a pull request that is not prose; `main-status.mjs --pull-request` stops such a pull request when it falls behind and says to rebase it.
```

## Task 8 — verification, then the handover report

Commit everything first: the self-check reads committed content only.

1. `bash scripts/check-blueprint.sh` from the worktree. It must end with `Self-check
   passed:`. A red verdict names its log folder; fix and re-run, or stop and report.
2. Run `guards/auto-merge.test.js` and `guards/main-status.test.js` alone, staged as
   `CLAUDE.md` says (*To run one source guard alone, stage it the way the self-check
   does*): in an export of `HEAD` (`git archive HEAD | tar -x -C <dir>`), write
   `{"type":"module"}` to `package.json`, copy `templates/framework-jest.config.js` to
   `jest.config.js`, link a `node_modules` holding Jest (the one the self-check installs
   under `.self-check/`, or `.tropis/node_modules`), and run
   `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/auto-merge.test.js guards/main-status.test.js`.
   Passing: every case passes; report the counts.
3. Prove both new behaviours are what the tests catch: in that export, put
   `origin/main`'s `scripts/auto-merge.mjs` and `scripts/main-status.mjs` back
   (`git show origin/main:scripts/auto-merge.mjs > scripts/auto-merge.mjs`, likewise the
   other), run step 2's command again, and report the failing case names: Task 1's cases
   1–5 and Task 2's case 1 must be among them.
4. `npm --prefix .tropis test` from the worktree (after `npm --prefix .tropis ci`): it
   must pass; report its count.
5. Read back the workflow: `grep -c 'auto-merge.mjs <N> --rebase' framework/workflow.md`
   prints `1` (before the change `0`), and
   `grep -c 'gh pr merge <N> --auto --squash' framework/workflow.md` prints the same
   number as on `origin/main` (`git show origin/main:framework/workflow.md | grep -c …`).
6. `git diff --stat origin/main...HEAD`: every file in the File Structure table except
   `feature-catalog.yaml`, and nothing else.
7. Report `node --version`, `git --version`, `gh --version | head -1` and `uname -sm`.

Then append `## Handover report` to this plan, with the six sections
`.claude/rules/planning.md` names (*Every plan ends with a handover report*), commit it,
run step 1 again on that commit, and push the branch.

## Traps

- **`npm --prefix .tropis test` runs the installed release**, not this change; it shows
  nothing about the new scripts. Step 2's staged run is what tests them. Do not edit
  `.tropis/` to make the change show there.
- **The four new refused command lines may pass before the change.** Today's parser
  refuses anything it does not know, `--rebase` included. They pin that the new parser
  still refuses them; do not make them fail first.
- **Assert gh calls by kind.** The stub logs the pull request read, `pr merge` and the
  route alike; filter (`c[0] === 'api' && c[3]?.endsWith('/ccr/auto_merge')`, and so on),
  never count all calls.
- **Each throwaway repository needs its own identity** for its commits, set in that
  repository, not on the script's git calls (`.claude/rules/harness-scripts.md`, *A
  script that runs git uses the git config in force*).
- **No test may reach the network.** The origin is a GitHub URL so that gh is reached,
  and gh is the stub; the script runs no fetch (decision 12), so nothing else needs one.
- **The new clause names the batch's worktree by its directory only**, and says "from
  `origin/main` like any branch" instead of quoting the command. Keep it that way: the
  plan check refuses the worktree command in a plan outside its Repositories table, and
  this plan quotes the clause.
- **Your own session's hooks are the installed release's.** A commit touching
  `framework/` or `commands/` on your plan branch may make `framework-commit-check.sh`
  say the body must carry a fresh-agent check: say in that commit's body that the
  specifying session runs it at review, as this plan says.
