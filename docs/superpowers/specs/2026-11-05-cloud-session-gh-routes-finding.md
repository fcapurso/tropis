# Can gh api reach GitHub from a cloud session — finding

**Date:** 2026-11-05 · **Backlog item:** cloud-session-gh-routes · **Status:** answered

## The question

In a Claude Code cloud session, `gh pr list` answers
`HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API
(gh api repos/{owner}/{repo}/...)`, and names routes under `/pulls/{n}/ccr/` for review
threads, auto-merge and draft state. The cloud-sprint probe of 2026-11-03 found every
`gh` write refused and chose the session's own GitHub tools instead, without trying
these routes: it measured the merge token through the API and an API branch delete
refused, and inferred from those that opening, merging and updating a pull request
would be refused too. Three backlog items wait on the answer:
`release-and-next-run-in-a-cloud-session`, `flush-runs-in-a-cloud-session` and
`absorb-flush-runs-in-a-cloud-session`. Each can keep its `gh` calls, moved to
`gh api`, or describe the session's own GitHub tools.

## How it was measured

On 2026-11-05, in a Claude Code cloud session (Claude Code 2.1.318, `gh` 2.89.0,
Linux x86_64, permission mode auto), against this repository. Outbound HTTPS goes
through the environment's proxy, which adds the credentials: `gh auth status` reports
the token invalid, and calls succeed anyway, as on 2026-11-03. The target was this
spike's own pull request, #245, opened as a draft for the purpose. A `4xx` with
GitHub's own message and documentation link means the proxy passed the call to GitHub;
the proxy's refusal says `not permitted through this proxy`.

## The routes the refusal names

| Route | Answer |
|---|---|
| `GET pulls/{n}/ccr/review_threads` | 200 and `[]` on #245, #244, #230 and #200, which have no review comments; 404 `Could not resolve to a PullRequest` for a number that does not exist |
| `POST pulls/{n}/ccr/ready_for_review` | 200, `{"draft":false}`; `GET pulls/{n}` then shows `draft: false` |
| `POST pulls/{n}/ccr/convert_to_draft` | 200, `{"draft":true}`; `GET pulls/{n}` shows `draft: true` |
| `PUT pulls/{n}/ccr/auto_merge`, no body, on a draft | 422 `Pull request is a draft`, GitHub's own refusal |
| `PUT pulls/{n}/ccr/auto_merge` with `merge_method=squash`, `commit_title`, `commit_message` | 200, `{"enabled":true,"merge_method":"squash"}`; `GET pulls/{n}` shows `auto_merge` with that method, title and message |
| `DELETE pulls/{n}/ccr/auto_merge` | 200, `{"enabled":false}`; `GET pulls/{n}` shows `auto_merge: null` |
| `POST pulls/{n}/ccr/comments/{id}/resolve` and `/unresolve`, on a comment id that does not exist | 404 from the route itself: `No review thread on this pull request contains that comment ID. List threads with GET .../pulls/{n}/ccr/review_threads; comment_ids are the REST review-comment IDs.` The route is reached; resolving a real thread was not tried, since this repository has no review comment |

So every route tried works through `gh api`, and the auto-merge route takes the squash
subject and body, which the session's own auto-merge tool does not (2026-11-03). What
was not seen: the shape of a non-empty review-thread list, and resolving a real thread.

These routes are the proxy's, not GitHub's: GitHub's REST API has no auto-merge, draft
or review-thread endpoint (they are GraphQL only) and no `ccr` path. So on the
developer's computer these calls are `gh pr merge --auto`, `gh pr ready` and a GraphQL
query, and in a cloud session the `ccr` routes. That was inferred from GitHub's REST
documentation, not measured from a computer.

## The other writes

| Call | Answer |
|---|---|
| `gh api -X POST pulls` (open a pull request, `draft=true`) | 201: #245 opened |
| `gh api -X PATCH pulls/{n}` (change its title) | 200 |
| `gh api -X PUT pulls/{n}/update-branch` | 422 `There are no new commits on the base branch`, GitHub's own answer for a branch already up to date: the call reaches GitHub |
| `gh api -X POST issues/{n}/comments` on a number that does not exist | 404 from GitHub: the proxy passes it |
| `gh api -X POST actions/runs/{id}/rerun` on a run that does not exist | 404 from GitHub: the proxy passes it |
| `gh api -X DELETE git/refs/heads/{branch}` | 403 `Write access to this GitHub API path is not permitted through this proxy` |
| `gh run list` | Works (REST) |
| `gh pr list`, `gh pr view --json mergeCommit`, `gh pr merge --auto` | 403, the GraphQL refusal |

`gh pr view <n> --json number` printed the number without asking GitHub, so it is no
evidence that `gh pr view` works.

On 2026-11-03 opening, merging and updating a pull request were inferred to be
refused, without being tried; measured today, opening, editing and updating one pass the
proxy, and deleting a ref is refused as it was then. Whether the proxy changed in
between is not known. Merging outright (`PUT pulls/{n}/merge`) and closing (`PATCH` with
`state=closed`) were not tried, to leave #245 to land normally; that they pass, as the
other pull-request writes do, is inferred, not measured.

Also not tried, all writes **to another repository**: every write here went to the
session's own repository. A flush opens its pull request on the framework's repository,
possibly from a fork (`scripts/submit-upstream.sh` calls `gh repo fork` and
`gh pr create --repo`), so whether the proxy passes `POST pulls` or `POST forks` there is
open.

Two reads matter to the plans. `gh run view <id> --log` works (seen by the reviewer of
this finding). `gh api --paginate` does not: the next-page link names the repository by
numeric id, which the proxy refuses (`Numeric-ID repository paths are not supported
through this proxy`, recorded on `flush-runs-in-a-cloud-session`), and asking for
`page=1`, `2` and so on works. A list longer than one page asks page by page.

## Recommendations

**Keep `gh` in the commands and scripts, through `gh api`; describe no session tools.**
The commands and scripts make one call per step, and each step has a call that works
in both places:

- **Same call everywhere (REST):** listing open pull requests
  (`gh api repos/{owner}/{repo}/pulls?state=open`, as `sprint.mjs` already does),
  opening one (`POST pulls`), reading the merge commit (`merge_commit_sha` from
  `GET pulls/{n}`), checks (`GET commits/{sha}/check-runs`), bringing a branch up to
  date (`update-branch`, as `main-status.mjs` already does), closing (`PATCH`, untried),
and the run reads (`gh run list`, `gh run view --log`), which need no change. Lists are
read page by page, never with `--paginate`.
- **Two calls, chosen by the answer (GraphQL locally, `ccr` in a cloud session):**
  setting auto-merge with its subject and body, turning it off, draft and ready, review
  threads. A script tries the `gh` command first and, on the GraphQL refusal (`HTTP 403`
  and `GitHub GraphQL is not available`), calls the `ccr` route. One script, one place
  that knows about the cloud.

Per backlog item:

- **`release-and-next-run-in-a-cloud-session`** — `/next`'s pull-request check moves to
  the REST list. `/release` opens its pull requests with `POST pulls`, sets auto-merge
  through a script call that falls back to `ccr/auto_merge` with the subject and body,
  and reads the merge commit from `merge_commit_sha`. Its run reads stay as they are
  (`gh run watch` untried). Keep `gh`.
- **`flush-runs-in-a-cloud-session`** — the clone is `git clone` (already in its
  criteria). `scripts/submit-upstream.sh` must stop treating a failing `gh auth status`
  as fatal, list with the REST pulls route page by page, and replace `gh repo view` with
  `gh api repos/{owner}/{repo}`. Its pull requests would open with `POST pulls` on the
  framework's repository, and that, with the fork, is untried: its plan tries them first.
  Keep `gh` if they pass; its criterion that `/flush-upstream` describes the session's own
  GitHub tools stands only for whichever of the two is refused.
- **`absorb-flush-runs-in-a-cloud-session`** — list, open and watch by REST; the rebase
  merge through `ccr/auto_merge` with `merge_method=rebase` (untried; `squash` was) or
  `PUT pulls/{n}/merge`; close by `PATCH`. Its preflight must stop treating a failing
  `gh auth status` as fatal, since `gh` works there while that reports the token
  invalid. Keep `gh`; its plan tries the outright merge and the close first.

**The workflow's *Where gh cannot write* is now partly untrue for a cloud session**: `gh`
writes to pull requests pass there. Whichever of the three plans lands first should
correct it, keeping the session's own GitHub tools only for what still has no `gh`
route: deleting a branch, and a wait woken by pull-request activity.
