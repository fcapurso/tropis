# Rule incidents

A shipped rule states each constraint and why it holds. The occasion it was learned
on — who hit it, when, what it cost, how many times — lives here, in a record that
mirrors the rule file: the incidents behind `rules/<name>.md` are in
`rules/incidents/<name>.md`, installed in a project at
`.tropis/rules/incidents/<name>.md`. No agent tool loads this folder: a record is read
on demand, from a pointer in its rule.

**Pointer.** The rule names the incident's place as an installed project sees it, in
backticks, introduced by `Incident:` — or `Incidents:` before several, each in its own
backticks: `` `.tropis/rules/incidents/<name>.md#<slug>` ``. A rule points only into the
record of its own name.

**Slug.** The section heading lowercased, every character other than `a-z`, `0-9`,
space and hyphen dropped, each space replaced by a hyphen. A heading names the incident,
not the rule.

**A project's own incidents.** A project's own rule (`.claude/rules/<area>.md`) or
addition (`.claude/rule-additions/<name>.md`) keeps its incidents in
`docs/rule-incidents/<name>.md`, in the same format, with pointers naming that path.

In the framework's own repository, the guard rule-incidents.test.js keeps the pointers,
the record sections and the quotes below in step, and checks that a set-up project
delivers no record to a session.

## Kept inline

Clauses left in their rule with their occasion, because the occasion is the only
statement of the failure mode.

- `rules/tests.md`: "never pin it in the code only to make a test pass" — the occasion
  shows the failure: an assertion written against one machine's format drags the
  product's format to meet it, for every user.

## What the split bought

Measured on 2026-11-02 with `wc -c -w` (BSD wc, macOS 26.2, arm64). Before: `d236f34`
on `main`, the commit the split started from. After: the rule files as the split left
them, in the commit that brought this folder to `main`.

| Rule file | Bytes before | Bytes after | Words before | Words after |
|---|---|---|---|---|
| `rules/catalogs.md` | 12687 | 12120 | 2187 | 2032 |
| `rules/harness-scripts.md` | 7713 | 7777 | 1272 | 1217 |
| `rules/learnings.md` | 6172 | 6881 | 1025 | 1092 |
| `rules/planning.md` | 29271 | 28246 | 4917 | 4533 |
| `rules/tests.md` | 4620 | 4622 | 815 | 772 |
| **Total** | **60463** | **59646** | **10216** | **9646** |

Words fell by 570 (6%) and bytes by 817 (1%). Each pointer costs about 70 bytes and
counts as two or three words, so a rule that lost a short story to one pointer barely
shrank in bytes. `rules/learnings.md` grew because it gained the clause that says where
an incident goes. The five records hold 1707 words, headings included, in files no
session loads.
