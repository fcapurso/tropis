---
description: Move a feature catalog entry to its next lifecycle status
---

Promote an entry in `feature-catalog.yaml` through `idea → shaped → building → shipped`,
or close one as `dropped`.

**To `shaped`:** the entry must have acceptance criteria written as observable
conditions — what a person could check, not what the code does. Add the spec path
to `refs` once one exists.

**To `building`:** add the plan path to `refs`.

**To `shipped`, all of these must hold:**

- `modules` lists the implementing paths, and they exist.
<!-- project-owned: begin — what else this project requires before an entry ships. -->
- Every acceptance criterion is covered by an automated test **or** a recorded entry
  in `docs/verification-log.md`, drafted and recorded through `/manual-check`. State
  which, per criterion, in the commit body.
- The project's checks pass (`npm --prefix .tropis test`).
<!-- project-owned: end -->

If a criterion has no test and no recorded manual check, the entry does not ship. Say so
rather than promoting it — an unbacked `shipped` entry is exactly the kind of false claim
the guard exists to prevent.

**Shelving is not a status change.** To park an `idea` or `shaped` entry until something
changes, add `shelved: true` and leave `status` as it was; to un-shelve, delete the line.
Say why it is parked in the entry's `value` and in the commit body — a shelf with no
recorded reason reads as forgotten. The rule is `.claude/rules/catalogs.md`, *Shelving*.

**Dropping closes an entry that will not be done.** Set `status: dropped` on an `idea`
or `shaped` entry, remove `shelved` if it has it, and remove its id from every other
entry's `blockedBy`. Its `value` says why, starting `Dropped <date> -`, and so does the
commit body. Shelve it instead when you can name what would make the work worth doing.
The rule is `.claude/rules/catalogs.md`, *Dropping*.
