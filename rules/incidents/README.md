# Rule incidents

A shipped rule states each constraint and why it holds. The occasion it was learned on —
who hit it, when, what it cost, how many times — lives here, in a record that mirrors the
rule file: the incidents behind `rules/<name>.md` are in `rules/incidents/<name>.md`,
installed in a project at `.tropis/rules/incidents/<name>.md`. No agent tool loads this
folder: a record is read on demand, from a pointer in its rule.

**Pointer.** The rule names the incident's place as an installed project sees it, in
backticks, introduced by `Incident:` — or `Incidents:` before several, each in its own
backticks: `` `.tropis/rules/incidents/<name>.md#<slug>` ``. A rule points only into the
record of its own name.

**Slug.** The section heading lowercased, every character other than `a-z`, `0-9`, space
and hyphen dropped, each space replaced by a hyphen. A heading names the incident, not the
rule.

**A project's own incidents.** A project's own rule (`.claude/rules/<area>.md`) or
addition (`.claude/rule-additions/<name>.md`) keeps its incidents in
`docs/rule-incidents/<name>.md`, in the same format, with pointers naming that path.

The guard `guards/rule-incidents.test.js` keeps the pointers, the record sections and the
quotes below in step, and checks that a set-up project delivers no record to a session.

## Kept inline

Clauses left in their rule with their occasion, because the occasion is the only
statement of the failure mode.

## What the split bought
