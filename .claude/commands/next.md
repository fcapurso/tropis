---
description: Show what is in flight, ready, and blocked
---

<!-- project-owned: begin — the command that prints this project's backlog report. -->
Run `npm --prefix .tropis run next` and report its output.
<!-- project-owned: end -->

Then — because the backlog cannot know these — also check:

```bash
git status
gh pr list --state open
git worktree list
```

Report anything in flight in the repository that the backlog does not show.
A mismatch between the two is itself the finding: either an entry was left at
`building` after a merge, or real work is running without the status transition
`.claude/rules/catalogs.md` requires.
