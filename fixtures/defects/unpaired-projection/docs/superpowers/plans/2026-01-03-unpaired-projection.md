# Unpaired Projection Plan

A plan that claims to be dispatchable and is not: its file list names a rule file but
not that rule's projection. Nothing else about it is wrong.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| the-app | execute here | `git worktree add ../the-app-unpaired -b plan/unpaired` |

## Global Constraints

None.

## Traps

None.

## Delivers

None.

## File Structure

| File | Change |
|---|---|
| `.claude/rules/tests.md` | One bullet |
