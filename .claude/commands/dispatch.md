---
description: Print the thin kick-off prompt for a plan
---

From the project root, run `npm --prefix .tropis run dispatch -- <plan-path>` and paste
what it prints into a **new** session.

If it exits non-zero, the plan is not dispatchable, and stderr names each problem — a
missing heading, no checkout anyone may edit, or isolation that is not a sibling
worktree. Fix the plan. Do not write a prompt by hand instead.

The command does not start a session, and it does not refresh the model picks: if they
are stale or the project has none, the prompt says so, and `/refresh-model-tiers` is a
separate step.
