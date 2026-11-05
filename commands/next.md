---
description: Show what is in flight, ready, and blocked
---

<!-- project-owned: begin report-command — the command that prints this project's backlog report. -->
Run `npm --prefix .tropis run next` and report its output.
<!-- project-owned: end -->

Its first line says whether the main branch's last finished pipeline run passed or
failed, or that it could not tell and why. Report that line first, as it stands. A red
main branch comes before anything in the backlog: say so before suggesting any backlog
item, and that repairing it, through a pull request, is the next piece of work.

Its second line says who holds the merge token and for how long, or that it is free
(`.claude/framework/workflow.md`, *The merge token*). Report it as it stands. A token
it marks stale is broken only on the developer's word, with the command the line names.

Then — because the backlog cannot know these — also check:

```bash
git status
gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=100' --jq '.[] | "#\(.number) \(.head.ref) \(.title)"'
git worktree list
```

The pull requests are listed through GitHub's REST interface, which answers on the
developer's computer and in a Claude Code cloud session alike; `gh pr` commands use GraphQL,
which a cloud session refuses. Where 100 come back, ask for `&page=2` and so on, never
`--paginate`, whose next-page link the cloud session refuses.

Report anything in flight in the repository that the backlog does not show.
A mismatch between the two is itself the finding: either a backlog item was left at
`building` after a merge, or real work is running without the status transition
`.claude/rules/catalogs.md` requires.
