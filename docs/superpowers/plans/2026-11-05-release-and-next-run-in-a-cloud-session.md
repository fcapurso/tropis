# /release and /next work from a cloud session — Implementation Plan

> **For agentic workers:** this plan is built by its author and reviewed by a fresh
> reviewer (*Shape*, below). Nothing in it stops for the developer.

**Goal:** `/next` and `/release` reach GitHub only through calls that answer in a Claude
Code cloud session as on the developer's computer: REST through `gh api`, and, for
auto-merge, a script that falls back to the cloud session's route when `gh` is refused
GraphQL. The workflow says the same for every merge.

**Backlog item:** `release-and-next-run-in-a-cloud-session` in `feature-catalog.yaml`
(type bug). The design is the spike `cloud-session-gh-routes`, whose finding is
`docs/superpowers/specs/2026-11-05-cloud-session-gh-routes-finding.md`, *Recommendations*,
first bullet of *Per backlog item*; the decisions below apply it.

**One plan:** what becomes true is one sentence — a session in the cloud opens, sets to
merge and reads its pull requests with the same `gh` commands as one on a computer, so a
developer can run `/next` and carry a release through from there.

**What the specifying session verified on 2026-11-05, against `origin/main` at
`c128b23` (gh 2.89.0, Claude Code in a cloud session, Linux x86_64):**

- **Refused there:** `gh pr list --state open` answered `HTTP 403: GitHub GraphQL is not
  available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...)`.
  The finding records the same for `gh pr view --json mergeCommit` and `gh pr merge
  --auto`; `gh pr create` is GraphQL too.
- **Answered there:** `gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=5'`;
  `gh api repos/{owner}/{repo}/pulls/244 --jq .merge_commit_sha` printed the merge commit;
  `gh run list --json …`, `gh run watch <id> --exit-status` and `gh run view <id> --log`.
  `POST repos/{owner}/{repo}/pulls` with a missing head answered GitHub's own `422`, and
  the finding opened #245 that way (201).
- **Auto-merge (the finding, measured on #245):** `PUT pulls/{n}/ccr/auto_merge` with
  `merge_method=squash`, `commit_title` and `commit_message` answered
  `{"enabled":true,"merge_method":"squash"}` and `GET pulls/{n}` then showed `auto_merge`
  with that title and message. The route is the cloud proxy's: GitHub's REST API has no
  auto-merge endpoint, so on a computer the call stays `gh pr merge --auto`. The route
  also answered `enabled` for an already merged pull request (#244, this session), so its
  answer is not proof; `main-status.mjs --pull-request` reads `auto_merge` and stops on
  `auto-merge is off`, which covers it.
- **Where the refused calls are:** `commands/next.md:22` (`gh pr list --state open`);
  `commands/release.md` lines 100, 269 and 414 (`gh pr merge <N> --auto --squash`) and
  273 and 431 (`gh pr view <N> --json mergeCommit -q .mergeCommit.oid`). Stage 1 says
  "List any open pull requests against `main`" with no command.
- **The workflow's paragraph *Where `gh` cannot write*** (`framework/workflow.md`,
  *Merge and clean up*) sends such a session to its own GitHub tools for opening,
  setting auto-merge and updating, on FW-063's evidence of 2026-11-03, which inferred
  those writes refused without trying them. The finding measured them passing and says
  whichever of the three cloud plans lands first corrects the paragraph; neither
  `flush-runs-in-a-cloud-session`'s plan (in `building`) nor any other lists
  `framework/workflow.md`.
- **The precedent:** `scripts/sprint.mjs` lists open pull requests through REST, guarded by
  `guards/sprint.test.js` "† asks GitHub for open pull requests through the REST API, never
  gh pr list"; `scripts/main-status.mjs` already brings a branch up to date through
  `PUT pulls/{n}/update-branch` and exports `originOnGitHub`.
- **Guards that read these files:** `guards/release.test.js` "release and refresh-board use
  a pull request on a gated main" needs `gh pr merge <N> --auto --squash` or `merges
  itself` in `commands/release.md`; "sees a pull request set to merge itself through to a
  green main branch" needs `main-status.mjs --pull-request <N>` there at least twice; "the
  gate in the workflow" needs `gh pr merge <N> --auto --squash` in `framework/workflow.md`.
  All stay true. No guard quotes the paragraph *Where `gh` cannot write*.
- **Shipping a script:** `scripts/installed-scripts.txt` lists what setup and the update
  install into `.tropis/scripts/`; a script's second line says which parts a project owns.
- **Out of scope:** `scripts/submit-upstream.sh` (`flush-runs-in-a-cloud-session`) and
  `/absorb-flush` (`absorb-flush-runs-in-a-cloud-session`), which may later use the script.

## Shape

**Built by its author, reviewed by a fresh reviewer** (`rules/planning.md`, *Do not
rehearse the work to write its plan*): a fifty-line script whose tests state its
behaviour, and wording the probe judges. The reviewer runs as a fresh subagent of the
cloud session, signed in to the developer's plan.

**Merge authority: self-merge after the fresh review.**

**Merges after:** commands-have-named-fill-ins

**Fresh-agent check: owed**, since `framework/workflow.md` and the commands change what an
agent is told. The probe is put in an invented project in a session where every `gh pr`
command answers the GraphQL 403, at `/release` Stage 5 with its notes committed on a
branch, and asked which commands it runs, in order, to open the pull request, set it to
merge itself, wait for it and name the commit for step 1; and what `/next` runs for its
in-flight check. It passes if it opens through `gh api … pulls`, sets auto-merge with
`auto-merge.mjs`, waits with `main-status.mjs --pull-request`, reads `merge_commit_sha`
through `gh api`, and lists through `gh api`, never naming a `gh pr` command or the
session's own GitHub tools for any of them. Read-only tools only (Read, Grep, Glob), so
the answer comes from the files.

## Delivers

release-and-next-run-in-a-cloud-session

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-cloud-release -b plan/release-and-next-run-in-a-cloud-session origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body**; the commit touching `framework/workflow.md` states the
  fresh-agent check's outcome, with tool, version, model, operating system and
  architecture.
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Decisions

1. **One code path for every read and for opening.** REST through `gh api` answers on a
   computer and in a cloud session, so `/next` and `/release` list open pull requests with
   `gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=100'`, read the merge commit
   with `gh api 'repos/{owner}/{repo}/pulls/<N>' --jq .merge_commit_sha`, and `/release`
   opens its pull requests with `gh api -X POST 'repos/{owner}/{repo}/pulls'`. A list of
   100 asks for the next `page=`; never `--paginate`, whose next-page link the cloud's
   proxy refuses.
2. **Auto-merge is one script with two routes:** `scripts/auto-merge.mjs <N> --subject
   <s> --body <b>` runs `gh pr merge <N> --auto --squash --subject <s> --body <b>`, and
   only where that answers the GraphQL refusal (`GitHub GraphQL is not available`) calls
   `gh api -X PUT repos/{owner}/{repo}/pulls/<N>/ccr/auto_merge` with `merge_method=squash`,
   `commit_title` and `commit_message`. It prints one line and exits 0 when set, 1 naming
   gh's answer when not, 2 on a bad command line. Any other refusal of `gh pr merge` is
   reported, never retried by the other route. It runs `gh` only when origin is on GitHub
   (`originOnGitHub` from `main-status.mjs`). Rejected: the session's own GitHub tools in
   each command (FW-063's route; they cannot set the squash subject and body, and every
   command would describe them); and calling `ccr` first (the route exists only in the
   cloud).
3. **The workflow's paragraph becomes *Where `gh pr` is refused*,** and says what the
   finding measured: `gh api` reads and writes pull requests there, so the session opens
   with `gh api`, sets auto-merge with the script, brings its branch up to date through
   `main-status.mjs`, and keeps its own GitHub tools only for waking on the pull request's
   activity; it cannot delete a branch and does not need to. The gated-merge bullet in
   *Branching* points there. Recorded as FW-071, amending FW-063.
4. **`/release` says this once,** in a section *Pull requests* after *The merge token*,
   and each place that opens one refers to it, rather than repeating three commands at
   three stages.
5. **Guards:** `guards/auto-merge.test.js` runs the script against a stub `gh` for the
   computer route, the cloud fallback with its fields, a refusal that is not GraphQL (no
   fallback), a refused fallback, an origin not on GitHub (no `gh` at all) and a bad
   command line. `guards/release.test.js` asserts neither `commands/next.md` nor
   `commands/release.md` contains `gh pr list`, `gh pr view` or `gh pr create`, that both
   list through `gh api`, and that `/release` names `auto-merge.mjs`.

## Traps

- `commands/` and `framework/` are the source; `.claude/` is the installed release.
- A path in backticks under `docs/`, `scripts/` or `.claude/` must exist in a framework
  document. `.tropis/scripts/auto-merge.mjs` is not under those, and the source
  `scripts/auto-merge.mjs` exists.
- `gh api` with a `{owner}` placeholder and `?`/`&` must be quoted for the shell.
- The fallback must test for the GraphQL refusal, not for any 403: a 403 for missing
  permission on a computer is gh's real answer and must be reported.

## File Structure

| File | Change |
|---|---|
| `scripts/auto-merge.mjs` | new: Decision 2 |
| `scripts/installed-scripts.txt` | the new script |
| `guards/auto-merge.test.js` | new: Decision 5 |
| `guards/release.test.js` | Decision 5's command assertions |
| `commands/next.md` | the in-flight check lists through `gh api` |
| `commands/release.md` | *Pull requests*; Stage 1's listing; Stages 1b, 5, 7 and Step 2 refer to it |
| `framework/workflow.md` | Decision 3 |
| `framework/DECISIONS.md` | FW-071 |
| `feature-catalog.yaml` | the item shaped, then `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-05-release-and-next-run-in-a-cloud-session.md` | the handover report and the review record |

## Tasks

1. Write the script and its guard; run the guard and see each case fail with the script's
   fallback removed.
2. Change the commands, the workflow and the decision record; add the command assertions.
3. Commit; run `bash scripts/check-blueprint.sh`.
4. Run the fresh-agent check with its tool calls visible; amend the commit body.
5. Move the item to `shipped`, write the handover report.
6. Send the branch to the fresh reviewer, who writes the review record.
