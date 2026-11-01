# The merge token can live on GitHub — spike plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions*, *Traps* and *Global Constraints*. Nothing in it stops for the
> developer.

**Goal:** the sprint design's open question on the merge token gets a recorded answer,
from probes against this repository: whether GitHub holds a ref outside branches and
tags here, whether creating one that exists is refused so only one session can take it,
how its holder is read and how it is released safely, whether it starts a pipeline run,
what a cloud session's credentials may do with it, and whether GitHub's merge queue is
offered on a personal account's repository. A decision records what the marker is and
which operation takes and releases it.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md`, §3 *The merge token*,
the bullets *Open — first spike* and the merge-queue bullet after it. The entry is
`merge-token-can-live-on-github` in `feature-catalog.yaml`; its seven acceptance
criteria are what done means. This is the first plan written from that spec, so there
are no earlier review records to read.

**What the specifying session verified on 2026-11-02, against `main` at `c189fd3`, with
gh 2.103.2 and git 2.49.0 on macOS 26.2, arm64:**

- **The repository.** `gh api repos/fcapurso/tropis` reports owner type `User`,
  visibility `public`, default branch `main`, auto-merge allowed, merged branches
  deleted.
- **Its rulesets.** Three, all `active`, none with bypass actors:
  *Tropis: the main branch takes green pull requests only* (target `branch`, includes
  `~DEFAULT_BRANCH`; rules `deletion`, `non_fast_forward`, `pull_request`,
  `required_status_checks`); *main: no force pushes or deletion* (target `branch`,
  `~DEFAULT_BRANCH`; `deletion`, `non_fast_forward`); *release tags: never moved or
  deleted* (target `tag`, `refs/tags/v*`; `deletion`, `update`). No ruleset targets
  anything but branches and tags, so a ref under `refs/spike/` is outside every one of
  them on paper. Whether GitHub accepts it is what Task 2 finds out.
- **What refs exist.** `git ls-remote origin` lists `HEAD`, `refs/heads/*`,
  `refs/pull/*` and `refs/tags/*`; `git ls-remote origin 'refs/spike/*'` printed nothing.
- **Credentials.** `gh auth status`: logged in over `https`, token scopes `gist`,
  `read:org`, `repo`, `workflow`. git pushes over https through gh's credential helper.
- **What starts a pipeline.** `.github/workflows/pipeline.yml` runs on `push` to
  `branches: [main]` and on `pull_request`; `ci.yml` only on `workflow_dispatch`; the
  other three only on `workflow_call`. So nothing in this repository's own workflows
  should start on a ref under `refs/spike/`; Task 5 checks that it does not, and whether
  GitHub records a push at all, which is what a project with an unfiltered `on: push`
  would see.
- **Decision numbers.** The last decision in `framework/DECISIONS.md` is FW-048. Other
  sessions are working in parallel and may take FW-049; use FW-049, and the reviewing
  session renumbers it at merge if it was taken.

**Model tier: Medium.** The probes and their pass and fail outputs are written out; the
judgment is in reading GitHub's replies honestly and writing the answer and the decision
from them.

**Merge authority: parent review.** The answer starts the next piece of the epic, and the
probes write to the public repository. Stop after the handover report (Task 8); do not
open a pull request, do not write a review record, do not merge.

**Requires:** `gh`, authenticated to github.com with write access to fcapurso/tropis, and `git`.

Do not store a kick-off prompt on this plan.

---

## Delivers

merge-token-can-live-on-github

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-merge-token -b plan/merge-token-can-live-on-github origin/main` |

## Global Constraints

- **What the probes may write on GitHub, and nothing else:** refs under
  `refs/spike/merge-token-<R>-…` on fcapurso/tropis, where `<R>` is the run id set in
  Task 1, and the commit objects those refs point at (created by a push or by the git
  data API). Every such ref is deleted before the plan ends, and Task 7 shows it.
  **Nothing under `refs/heads/` or `refs/tags/` beyond pushing this plan's own branch.
  No new repository, no change to repository settings or rulesets, no merge queue
  turned on, no workflow run started by hand, no pull request.**
- If an answer would need anything beyond that, do not get it: record the question as
  unanswered with what it would take, and carry on with the rest.
- **Probe with `bash`**, not the login shell; the snippets use bash syntax.
- **Do not edit the installed release**: `.claude/`, `.tropis/`, `.cursor/`,
  `CLAUDE.md`. Add no dependency. Do not lower, skip or delete a guard or a test. Every
  commit has a body saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths are relative to the worktree or written as
  `$TMPDIR/…`. The holder names written into probe markers are `probe-a`, `probe-b`, …,
  never a person. Request ids and the repository's own URLs in GitHub's replies are fine;
  cut anything else that identifies a person or a machine.
- **Write the probes yourself**; say in the handover which named source, if any, you
  worked from. Documentation is quoted in at most one short phrase per source, under 15
  words, and otherwise paraphrased.

## Decisions

### 1. What a marker is, for the probes

A marker is a ref pointing at a **commit whose message names the holder and the time it
was taken**, with this repository's `main` tree and no parent:

```bash
T="$(git rev-parse origin/main^{tree})"
mk() { git commit-tree "$T" -m "merge token
holder: $1
taken: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; }
```

For the API way, the same commit is made on GitHub with
`gh api -X POST repos/fcapurso/tropis/git/commits -f message="…" -f tree="$T" --jq .sha`.
Using `main`'s tree means GitHub already holds it, so a push uploads one small object, and
the commit carries no workflow file change. Once its ref is deleted the commit is
unreachable, and GitHub collects it in time; that is expected and needs no cleanup.

### 2. The two ways of creating a ref

- **Push:** `git push origin "$C:refs/spike/merge-token-$R-<name>"`, and its lock form
  `git push --force-with-lease="refs/spike/merge-token-$R-<name>:" origin "$C:refs/spike/merge-token-$R-<name>"`
  — a lease with an empty expected value means *the ref must not exist yet*. The push
  protocol sends the expected old value with the update and the server checks it while
  holding the ref's lock; Task 3 shows whether GitHub honours that.
- **API:** `gh api -X POST repos/fcapurso/tropis/git/refs -f ref="refs/spike/merge-token-$R-<name>" -f sha="$C"`.
  GitHub's REST documentation describes this endpoint as creating a reference; Task 3
  records what it answers when the ref already exists.

### 3. Where the answer is written

- **In the spec**, `docs/superpowers/specs/2026-11-01-sprint-design.md`: replace the
  bullet that starts `**Open — first spike:**` with one that starts
  `**Answered — first spike (2026-11-02):**`, saying in plain words, in five to ten lines,
  what the probes found and what the token is therefore built on, and pointing at the new
  last section. Replace the merge-queue bullet after it with what was found. If a finding
  contradicts another line of §3 — for example that *try to create the marker* is safe
  whichever way it is created — correct that line too, and say so in the handover. Add a
  last section, `## Evidence from the first spike`, after *Sources*: one subsection per
  task 2 to 7, each with the commands as run and GitHub's replies, trimmed to the lines
  that carry the answer, and the tool, version, operating system and architecture once at
  the top.
- **In `framework/DECISIONS.md`**, a new entry FW-049 after FW-048, in the shape FW-048
  has: a `## FW-049: <what is now decided>` heading, a `**Date:** 2026-11-02 ·
  **Status:** Accepted.` line, then **Decision**, **Evidence**, **Rejected**,
  **Consequences**. It says what the marker is (a ref outside `refs/heads/` and
  `refs/tags/`, or the fallback branch if Task 2 refuses the ref), which operation takes
  it and which releases it, and why the others were rejected — in particular any way of
  creating that reports success on a ref already there, and any delete that does not check
  who holds the marker. It leaves the marker's name to the merge-token entry
  (`merges-take-turns-under-one-token`): the spec leaves names to the builder. If Task 2
  finds the ref refused, the decision is the fallback the spec names — a dedicated branch
  as the marker — and says what the ruleset and the branch-deletion setting mean for it,
  from what is verified above; do not create a branch to test it.

### 4. The catalog and the board, at the end

On `merge-token-can-live-on-github` in `feature-catalog.yaml`: `status: shipped`, keep
`modules: []` (the catalog guard requires a spike to have none), and add directly above
its `- id:` line, below the comments already there:

```yaml
# Shipped by plan docs/superpowers/plans/2026-11-01-merge-token-can-live-on-github.md;
# the answer is in the sprint design's section 3 and its evidence section, and FW-049.
```

Remove the entry's row (the `merge-token-can-live-on-github:` key and its indented lines)
from `docs/backlog-board/bands.yaml`. Then run `npm --prefix .tropis run board`, which
rewrites `docs/backlog-board/index.html`; commit that file if it changed.

## Traps

- **A plain push to a ref that exists can succeed.** Pushing the same commit again prints
  `Everything up-to-date` and exits 0, and pushing a descendant fast-forwards the ref — a
  second session would "take" a token someone holds. That is a finding to record, not a
  failure of the probe. Task 3 tests it on purpose.
- **A local error is not GitHub's refusal.** Parallel pushes from one clone can fail on a
  local lock file or a network error. Count an attempt as refused by GitHub only when
  stderr carries the server's reply (`! [rejected]`, `stale info`, `Reference already
  exists`, an HTTP 422); record anything else separately and re-run that round.
- **`gh api` exits non-zero on a 4xx** and prints GitHub's JSON to stdout with the status
  on stderr. Capture both (`gh api … 2>&1; echo "exit $?"`, or `-i` for the status
  line).
- **The events API lags.** A push event can take from seconds to minutes to appear in
  `repos/…/events`. Task 5 waits and says how long; an absence after that wait is
  recorded as *not seen within N minutes*, not as proof.
- **A ref under `refs/spike/` is not fetched by a default clone**, whose refspec is
  `refs/heads/*`. Read it with `git ls-remote` or fetch it by name.
- **Something must delete what the probes create even when a probe fails.** Task 1 sets
  a cleanup you run before handing back, whatever happened.
- **Do not cite this plan in backticks in `framework/DECISIONS.md`.** The integrity guard
  requires every backticked path under `docs/` in a framework document to exist in every
  project; name the plan in plain text, or cite the spec, which is how FW-031's review
  went.
- **A colon followed by a space inside an unquoted YAML value breaks the catalog.** The
  comment lines in Decision 4 are comments, so they are safe.

## File Structure

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-11-01-sprint-design.md` | Decision 3: the answer in §3 and the evidence section |
| `framework/DECISIONS.md` | Decision 3: FW-049 |
| `feature-catalog.yaml` | Decision 4: the entry to shipped |
| `docs/backlog-board/bands.yaml` | Decision 4: the entry's row removed |
| `docs/backlog-board/index.html` | Decision 4: rebuilt, if it changed |
| `docs/superpowers/plans/2026-11-01-merge-token-can-live-on-github.md` | Task 8: the handover report |

Doc closeout, decided by the specifying session: the spec and the decision record are
the documents a spike owes. No rule: nothing is built yet, and the merge-token entry
writes the rule into the workflow. No release-note line: a spike changes nothing a
project receives. Nothing for an upstream queue: this repository is the upstream.

## Tasks

### Task 1 — Setup, and the cleanup

Isolate (the Repositories table; run it from the primary checkout after
`git fetch origin`). In the worktree run `npm --prefix .tropis ci`, then
`git status --porcelain` (passes when it prints nothing), then
`bash scripts/check-blueprint.sh` (passes when its last line starts `Self-check passed`;
any other last line, stop and hand back). Record `git --version`, `gh --version`,
`node --version`, `uname -sm`, the operating system's version, your tool and version, and
the commit you started from, and which credential helper git uses for github.com
(`git config --get-all credential.https://github.com.helper`, else `credential.helper`;
the helper's name, never a token).

Then, in one bash session you keep for Tasks 2 to 7:

```bash
R="$(date -u +%Y%m%d%H%M%S)"; P="refs/spike/merge-token-$R"; echo "$P"
git ls-remote origin 'refs/spike/*'          # must print nothing
cleanup() { for r in $(git ls-remote origin "$P-*" | awk '{print $2}'); do git push origin ":$r"; done; git ls-remote origin "$P-*"; }
gh run list --limit 5 --json databaseId,event,headBranch,createdAt   # the runs before
```

If the first `ls-remote` prints anything, someone else is probing: stop and hand back.
Whatever happens later, run `cleanup` before you hand back.

### Task 2 — Does GitHub accept the ref? (criterion 1)

Make two markers with Decision 1 (`probe-a` locally; `probe-b` through the git data API)
and create `$P-push` by a plain push of the first and `$P-api` through the API with the
second. Record each command, its exit status and GitHub's reply, then
`git ls-remote origin "$P-*"`.

**Passes when** both refs are listed with the commits you sent. **If either way is
refused**, record GitHub's reply verbatim and carry on with the way that worked; if both
are refused, skip Tasks 3 and 4, run Tasks 5 and 6, write the fallback decision
(Decision 3), and say so in the handover.

### Task 3 — Is creating one that exists refused? (criterion 2)

Against the refs from Task 2:

1. API, same commit again, and a new marker (`probe-c`) — expect a refusal each time.
2. Plain push, the same commit again — record whether it exits 0.
3. Plain push, a new marker whose parent is the held commit
   (`git commit-tree "$T" -p "$C" -m …`) — record whether the ref moved.
4. Lock-form push (Decision 2) of a new marker — expect a refusal.

Then **at the same moment**, for each of the API and the lock-form push: on a fresh ref
name per round, start five attempts in the background, each with its own marker
(`probe-1` … `probe-5`), `wait`, and count which succeeded; check the ref holds the
winner's commit. Three rounds per way. Make the five markers before starting the round so
the attempts start together.

**Passes when** you have, per way and per round, the number of attempts GitHub accepted
and the reply of every refused one. The answer is what those numbers say: exactly one
accepted every time is a lock; anything else is a finding and goes in the answer as
such. Delete each round's ref when the round is done.

### Task 4 — Reading the holder, and releasing safely (criterion 3)

1. **Read:** for one held ref, by API —
   `gh api "repos/fcapurso/tropis/git/ref/${P#refs/}-api" --jq .object.sha`, then
   `gh api repos/fcapurso/tropis/git/commits/<sha> --jq '.message, .committer.date'` —
   and by git, `git fetch origin "$P-api"` then `git log -1 --format='%B%cI' FETCH_HEAD`.
   Passes when both show `holder: …` and `taken: …`.
2. **Release only your own:** take `$P-rel` with marker A (lock-form push). Delete it.
   Take it again with marker B. Now release as the stale holder A:
   `git push --force-with-lease="$P-rel:$A" origin ":$P-rel"` — expect a refusal and the
   ref still on B. Then release as B with `--force-with-lease="$P-rel:$B"` — expect it
   gone.
3. **The API's delete:** take `$P-rel2` with marker A by API, then delete it by API
   (`gh api -X DELETE "repos/fcapurso/tropis/git/refs/${P#refs/}-rel2"`) without saying
   who you are. Record that it succeeds, and whether GitHub's REST documentation for this
   endpoint offers any condition on the current value; then delete it again and record
   the reply for a ref that is not there.

### Task 5 — Does it start a run or show as a push? (criterion 4)

After Tasks 2 to 4: `gh run list --limit 10 --json databaseId,event,headBranch,createdAt`
and compare with Task 1's list; any run created since the probes began is named with its
event and branch. Then
`gh api repos/fcapurso/tropis/events --jq '.[] | select(.type=="PushEvent") | [.created_at, .payload.ref] | @tsv' | head -20`,
at once and again five minutes later; record whether any `refs/spike/` push appears.

### Task 6 — Cloud sessions and the merge queue (criterion 5)

Documentation only; nothing here writes to GitHub.

- **Cloud session credentials.** Read Claude Code's documentation on sessions running in
  the cloud (`https://code.claude.com/docs/en/claude-code-on-the-web`, and the pages it
  links on GitHub access and security) and record what it says such a session may push,
  and whether `gh` or a GitHub token is available there. Mark the finding *documented,
  not probed*: this plan cannot start a cloud session. Write, in the evidence section, a
  three-command probe a person could paste into a cloud session to settle it (take a
  `refs/spike/…` ref by lock-form push, list it, delete it), so the merge-token entry can
  run it.
- **Merge queue.** Read GitHub's documentation page on managing a merge queue
  (`https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue`)
  and record which repositories it says can use one; set beside it the owner type
  verified above (`User`).

### Task 7 — Everything deleted (criterion 6)

Run `cleanup`, then `git ls-remote origin 'refs/spike/*'`. **Passes when it prints
nothing.** Paste that command and its empty output as the last block of the spec's
evidence section. If anything remains, delete it, and if it cannot be deleted, stop and
hand back with the ref's name.

### Task 8 — Write the answer, ship the entry, hand over

1. Write the spec changes and FW-049 (Decision 3). Re-read every line of your diff for
   private material (Global Constraints).
2. Catalog and board (Decision 4).
3. Commit, with a body saying what is now known and that the entry has shipped.
4. Run, and record the output:

   ```bash
   bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
   npm --prefix .tropis test              # passes: Jest reports no failed suite
   git diff --stat origin/main...HEAD     # passes: only the File Structure files
   ```

   On a failure in this plan's files, fix and re-run; otherwise stop and hand back.
5. For each of the entry's seven acceptance criteria, name the task and the evidence
   subsection that answers it, in a table in the handover.
6. Append `## Handover report` to this plan file with the six sections the planning rule
   names (Task completion, Verification results, Scope, Judgment calls, What the plan got
   wrong, Outstanding); the criteria table; the spike's answer in three sentences; and the
   worktree path used. Commit, push the branch (`git push -u origin
   plan/merge-token-can-live-on-github`), and stop. **Do not open a pull request**, do not
   write a review record, do not merge.

## Criteria and their evidence

| # | Criterion (short) | Task |
|---|---|---|
| 1 | Accepted, both ways, replies quoted | 2 |
| 2 | Existing refused, simultaneous attempts, any way that reports success | 3 |
| 3 | Holder read; release cannot delete another's | 4 |
| 4 | Pipeline run or push shown | 5 |
| 5 | Cloud credentials; merge queue | 6 |
| 6 | Tool, version, platform; nothing left | 1, 7 |
| 7 | The decision | 8 |

## Handover report

### Task completion

Tasks 1 to 8 done. Task 6 is documentation only, as the plan says. The pull request and
review record were not made, as instructed.

### Verification results

Run with git 2.49.0, gh 2.103.2, Node 22.15.0 on macOS 26.2, arm64.

- `bash scripts/check-blueprint.sh` before the work: last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.` After the commit: the same line.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 146 passed, 146 total`.
- `git diff --stat origin/main...HEAD` (before this report): `bands.yaml`, the sprint design, `feature-catalog.yaml`, `framework/DECISIONS.md`; 4 files, 222 insertions, 24 deletions.
- `git ls-remote origin 'refs/spike/*'` after cleanup: empty (also shown in the spec's evidence section).
- `npm --prefix .tropis run board` rewrote nothing: `docs/backlog-board/index.html` was unchanged.

### Scope

Only files in the File Structure table, plus this plan file. Worktree used: `../tropis-merge-token`.

### Judgment calls

- Decision in FW-049: take with the API create, release with the expected-value delete push. The lock-form push also locks, but its losers often fail on a GitHub storage error, which a taker cannot tell from a network failure.
- Ran the lock-form race a second time with the objects uploaded beforehand, to separate the lock from that storage error.
- Corrected three lines of section 3 (the lock sentence, Take, Release) because a plain push is not a lock.

### What the plan got wrong

- Nothing blocking. Task 3's "expect a refusal" for the plain push of a descendant was wrong: it succeeded and moved the ref, which the plan's Traps had anticipated.
- The plan's probe snippets use `${PIPESTATUS[0]}`-style exit capture; I ran them under bash, since the login shell is zsh and gave blank statuses at first (re-run under bash).

### Outstanding

- Cloud session behaviour is documented, not probed: a person must paste the three-command probe (in the spec's evidence section) into a cloud session; the proxy is documented to refuse non-branch pushes and deletions.
- The server-side check of a conditional delete under a collision was not shown; the stale-holder refusal seen was the client's `stale info`.
- The merge queue on a personal account is unanswered: GitHub's pages read do not say, and testing would change settings.
- The events feed never showed any push in the window, including a real push to `main`, so it says nothing about whether the spike refs show as pushes.
- FW-049 may need renumbering at merge if another session took it.

### Acceptance criteria

| # | Task | Evidence subsection |
|---|---|---|
| 1 | 2 | Task 2 |
| 2 | 3 | Task 3 |
| 3 | 4 | Task 4 |
| 4 | 5 | Task 5 |
| 5 | 6 | Task 6 |
| 6 | 1, 7 | header and Task 7 |
| 7 | 8 | FW-049 |

### The spike's answer

GitHub accepts a ref outside branches and tags on this repository, and the API refuses to create one that exists, with exactly one of five simultaneous attempts accepted in each of nine rounds. A plain push is not a lock, and a push naming the commit it expects refuses to delete another holder's marker, while the API's delete is unconditional. The ref started no pipeline run, and cloud-session use and the merge queue are unanswered.

## Review record

### Checks re-run

With gh 2.103.2 and git 2.49.0 on macOS 26.2, arm64, by the specifying session:

- `git diff --stat origin/main...HEAD`: five files, the File Structure table's
  (`docs/backlog-board/index.html` unchanged, as the handover says).
- `git ls-remote origin 'refs/spike/*'` before and after the probe below: empty both times.
- An independent probe of the take: `gh api -X POST repos/fcapurso/tropis/git/refs -f ref=refs/spike/merge-token-review-<time> -f sha=<main>` returned the ref; the same call again returned `{"message":"Reference already exists", … "status":"422"}` (`gh: Reference already exists (HTTP 422)`); `gh api -i -X DELETE …` returned `HTTP/2.0 204 No Content`; the listing was then empty. This matches Task 3 and Task 4.
- GitHub's merge-queue pages were read again through a fetch agent: neither the page on
  managing a merge queue nor the page on merging with one states which repositories may
  use it, and the merging-guide address the plan gave returns 404. The handover's
  *unanswered* stands.
- The self-check and the installed checks are re-run after the rebase, when the token is
  held, and their results are in the merge commit's body.

### Found

Public exposure: the diff was read for private material; nothing found. The holder names
are `probe-…`, the credential helper is named and no token appears, and the only
repository and branch names are this repository's own.

One untrue line, fixed on the branch by the reviewer as mechanical: FW-049's *Rejected*
said a dedicated branch would sit under the ruleset that governs branches. Both branch
rulesets include only `~DEFAULT_BRANCH`, so it would not; the clause is removed, and the
reason left (GitHub accepts the ref) is sufficient.

The stale-holder refusal of the release was the client's `stale info`, as the handover
says. The push protocol also sends the expected old value with each update for the server
to check, so the release is conditional on the server too; that is git's documented
protocol, not something this spike observed under a collision.

### Outstanding disposition

- **Cloud sessions, documented not probed:** goes to `merges-take-turns-under-one-token`.
  Its design must not depend on a cloud session taking the token (the spec already says
  correctness never does), and its plan runs the three-command probe in the sprint
  design's evidence section, or says why not, before it relies on a cloud session.
- **Server-side check of a colliding conditional delete:** dropped. The protocol checks
  the old value on the server, and two holders releasing the same marker at once cannot
  happen, since only one holds it.
- **Merge queue on a personal account:** dropped. The token does not depend on it, and
  answering it would need a settings change on a repository the developer owns.
- **The events feed:** dropped. The run list answered criterion 4 for this repository's
  pipelines, and the feed showed no pushes at all in the window.
- **FW-049 renumbering:** done at merge if another session took the number; the merge
  commit says so.

### Learnings routed

- *A plain `git push` is not a lock; create through the API and release with an
  expected-value push.* Written where the next builder stands: FW-049 and the sprint
  design's section 3, which `merges-take-turns-under-one-token` is planned from.
- Nothing else generalises beyond this epic.

### Merged because

Every criterion has its evidence in the sprint design's evidence section, the answer is
recorded where the open question sat and as FW-049, the reviewer's own probe agreed, and
no probe ref remains.
