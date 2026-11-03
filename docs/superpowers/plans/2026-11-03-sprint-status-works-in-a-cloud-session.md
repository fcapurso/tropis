# The sprint status lists open pull requests in a cloud session — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `sprint.mjs status` asks GitHub for open pull requests through the REST API, so
it lists them in a Claude Code cloud session, where `gh`'s GraphQL route is refused.

**Backlog item:** `sprint-status-works-in-a-cloud-session` in `feature-catalog.yaml`.

**One plan:** what becomes true is one sentence — the sprint status lists open pull
requests wherever `gh api` answers.

**What the specifying session verified on 2026-11-03, against `origin/main` at `fbeb529`
(gh 2.89.0, node v22, Claude Code cloud session, Linux x86_64):**

- **`openPullRequests`** in `scripts/sprint.mjs` (around line 149) runs
  `gh pr list --state open --limit 100 --json number,headRefName` and returns
  `{ value: [{ number, headRefName }] }` or `{ error }`. Its one caller, `statuses`
  (around line 656), reads `number` and `headRefName` from each item.
- **In a cloud session that call fails:** `gh pr list` answers
  `HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...)`,
  and status prints `Sprint: open pull requests unknown — HTTP 403: …`.
- **The REST route answers there:**
  `gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=100'` returned the open pull
  request, each item carrying `number` and `head.ref`. `gh api` fills `{owner}/{repo}`
  from the checkout's remote.
- **`scripts/merge-token.mjs`**, function `judgeStale`, already asks exactly that route
  for the same reason; `scripts/main-status.mjs` uses `gh api` throughout.
- **The tests:** `guards/sprint.test.js`. Its stub `gh` (`STUB_GH`, around line 148)
  answers only `pr list` from `pulls.json` and exits 99 with
  `stub gh: unexpected call: …` on anything else. `stubGh(world, pulls)` writes
  `pulls` as given, in the `{ number, headRefName }` shape. Cases using it: the full
  status case (around line 508), the "other open pull requests" case (around 552), and
  the "not on GitHub, never runs gh" case (around 566).

**Decided by the specifying session:**

- **The call becomes**
  `gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=100'` (argv
  `['api', 'repos/{owner}/{repo}/pulls?state=open&per_page=100']`), the route
  `merge-token.mjs` uses. One page of 100, as `--limit 100` was; no `--paginate`.
- **`openPullRequests` maps each item to `{ number, headRefName: item.head?.ref }`**
  in JavaScript, no `--jq`, and keeps its return shape, so `statuses` does not change.
  An answer that is not a JSON array is still `gh answered with something unexpected`.
  The doc comment above it says it asks the REST API because `gh pr list` goes through
  GraphQL, which a Claude Code cloud session refuses.
- **Every error line stays as it is.**

**Model tier: Small.** The call and the mapping are given verbatim.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request, write a review record
or merge.

**Merges after:** sprint-proposal-groups-bundles

**No fresh-agent check is owed.** No file under `framework/`, `rules/` or `commands/`
changes; no agent is told anything new.

Do not store a kick-off prompt on this plan.

---

## Delivers

sprint-status-works-in-a-cloud-session

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-sprint-rest -b plan/sprint-status-works-in-a-cloud-session origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; a case whose
  expected input or output changes is rewritten to the new one.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change

1. **`scripts/sprint.mjs`**, function `openPullRequests` only: the call and the mapping
   *Decided* gives, and its doc comment.

## Tests

In `guards/sprint.test.js`:

1. **The stub answers the REST route, in the REST shape.** `STUB_GH` answers
   `args[0] === 'api'` with `args[1]` starting `repos/{owner}/{repo}/pulls?` from
   `pulls.json`, and no longer answers `pr list` (it falls through to the
   `unexpected call` exit). `stubGh(world, pulls)` keeps its callers' arguments
   (`{ number, headRefName }`) and writes them to `pulls.json` as
   `{ number, head: { ref: headRefName } }`, so no case's input changes. Update the
   file's header comment (around line 12), which says the stub answers `pr list`.
2. † New case in the status `describe`, `test('† asks GitHub for open pull requests through the REST API, never gh pr list', …)`:
   one entry `e1`, a stub with `[{ number: 5, headRefName: 'plan/e1-slug' }]`, origin
   pretending GitHub; status prints `  e1 — claiming (#5)`, and the stub's calls,
   filtered to those whose first word is `pr` or `api`, are exactly
   `[["api","repos/{owner}/{repo}/pulls?state=open&per_page=100"]]` (assert by name, not
   by total count — the tests rule).
3. † New case, `test('† says open pull requests are unknown with gh’s own line when gh refuses', …)`:
   a stub with no `pulls.json` (pass `null` to `stubGh`), origin pretending GitHub;
   status exits 0 and prints a line starting `Sprint: open pull requests unknown — stub gh: unexpected call: api repos/{owner}/{repo}/pulls`,
   and the entry `  e1 — not started`. (Check the exact line by running it; this is the
   path a 403 takes.)

The two existing cases at around 508 and 552 must pass unchanged once item 1 is done;
after item 1 and before the change, they fail, and so does item 2. Item 3 may pass
before the change only if its expected line is written loosely — write it to fail
before (the old call logs `pr list`, not `api …`).

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
- **Run a single guard the way the self-check runs one**, on the project-shaped tree
  `scripts/check-blueprint.sh` builds from a `git archive` of `HEAD`, with the jest under
  `.self-check/`. Read the script to find how, and say the exact command in the handover.
- **The installed `.tropis/scripts/sprint.mjs` is the old one.** Never run it to check
  this change; the guards install the source into their test clones.
- **`{owner}/{repo}` is literal in the argument**; `gh` fills it. Do not resolve it in
  the script.
- **Another plan in flight edits `scripts/sprint.mjs` and `guards/sprint.test.js`**
  (`sprint-proposal-groups-bundles`, in `propose` and the propose cases). Touch nothing
  outside `openPullRequests`, the stub, its header comment and the two new cases, so the
  rebase stays clean.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | `openPullRequests` asks the REST API |
| `guards/sprint.test.js` | the stub answers the REST route; two cases added |
| `feature-catalog.yaml` | the item to `shipped`, a comment mapping criteria to cases (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's row removed, if it has one (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-03-sprint-status-works-in-a-cloud-session.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: no document describes how status asks
for pull requests, so none changes. No decision record: the route follows
`merge-token.mjs`, with no real alternative. No upstream queue: this repository is the
upstream. A release-note line is the developer's at `/release`: the sprint status lists
open pull requests in a Claude Code cloud session.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, `git status --porcelain` (nothing), and
`bash scripts/check-blueprint.sh` (last line starts `Self-check passed`). Record
`git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

*Tests* items 1–3. Commit. Run `guards/sprint.test.js` alone: the † cases and the two
existing status cases that read pull requests fail. Paste their names.

### Task 2 — The change

*The change* item 1. Commit. Run `guards/sprint.test.js` alone: all pass. Then
`bash scripts/check-blueprint.sh`: last line starts `Self-check passed`.

### Task 3 — A run by hand

`status` needs a sprint, so prove the route instead: from the worktree, paste the
output of
`gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=100' --jq '[.[]|{number,ref:.head.ref}]'`
and the first line of `gh pr list --state open`, saying whether your environment refuses
the second.

### Task 4 — The backlog, the board and the handover

1. In `feature-catalog.yaml`, the item to `status: shipped`, `modules` set to
   `scripts/sprint.mjs`, and above it a
   `# Shipped by docs/superpowers/plans/2026-11-03-sprint-status-works-in-a-cloud-session.md.`
   comment with one line per acceptance criterion naming the case that covers it. No
   `: ` inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the item's block if it has one, nothing
   else.
3. Commit. Run `npm --prefix .tropis test`, `bash scripts/check-blueprint.sh` and
   `git diff --stat origin/main...HEAD`; paste each.
4. Append `## Handover report` with the six sections the planning rule names
   (Outstanding says there is no screen). Commit.
5. `git push -u origin plan/sprint-status-works-in-a-cloud-session`. **Do not open a
   pull request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.
