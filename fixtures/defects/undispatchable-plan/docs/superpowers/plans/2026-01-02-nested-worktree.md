# Nested Worktree Plan

A plan that claims to be dispatchable and is not: its isolation puts the worktree
inside the repository rather than beside it. Nothing else about it is wrong.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| the-app | execute here | `git worktree add .claude/worktrees/nested -b plan/nested` |

## Global Constraints

None.

## Traps

None.

## Delivers

None.
