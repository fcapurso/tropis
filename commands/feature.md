---
description: Move a backlog item to its next lifecycle status
---

Promote a backlog item in `feature-catalog.yaml` through `idea → shaped → building →
shipped`, or close one as `dropped`.

**To `shaped`:** the backlog item must have acceptance criteria written as observable
conditions — what a person could check, not what the code does. Add the spec path
to `refs` once one exists.

**To `building`:** add the plan path to `refs`. Then run
`node .tropis/scripts/plan-overlap.mjs --claim <plan>` and land the claim with whatever
it wrote into the plan's header: `.claude/framework/workflow.md`, *Plans that touch the
same files*.

**To `shipped`, all of these must hold:**

- `modules` lists the implementing paths, and they exist.
<!-- project-owned: begin ship-requires — what else this project requires before an item ships. -->
- Every acceptance criterion is covered by an automated test **or** a recorded entry
  in `docs/verification-log.md`, drafted and recorded through `/manual-check`. State
  which, per criterion, in the commit body.
- The project's checks pass (`npm --prefix .tropis test`).
<!-- project-owned: end -->

If a criterion has no test and no recorded manual check, the backlog item does not ship.
Say so rather than promoting it — an unbacked `shipped` backlog item is exactly the kind
of false claim the guard exists to prevent.

**Shelving is not a status change.** To park an `idea` or `shaped` backlog item until
something changes, add `shelved: true` and leave `status` as it was; to un-shelve, delete
the line. Say why it is parked in the backlog item's `value` and in the commit body — a
shelf with no recorded reason reads as forgotten. The rule is `.claude/rules/catalogs.md`,
*Shelving*.

**Dropping closes a backlog item that will not be done.** Set `status: dropped` on an
`idea` or `shaped` backlog item, remove `shelved` if it has it, and remove its id from
every other backlog item's `blockedBy`. Its `value` says why, starting `Dropped <date> -`,
and so does the commit body. Shelve it instead when you can name what would make the work
worth doing. The rule is `.claude/rules/catalogs.md`, *Dropping*.
