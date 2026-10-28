---
description: Move a feature catalog entry to its next lifecycle status
---

Promote an entry in `feature-catalog.yaml` through `idea → shaped → building → shipped`.

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

**Shelving is not a status change.** To park an `idea` or `shaped` entry, add `shelved:
true` and leave `status` as it was; to un-shelve, delete the line. Say why it is parked
in the entry's `value` and in the commit body — a shelf with no recorded reason reads as
forgotten. The rule is `.claude/rules/catalogs.md`, *Shelving*.
