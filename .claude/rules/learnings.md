---
paths: ["DECISIONS.md",".claude/framework/**",".claude/rules/**",".claude/commands/**","rules/**","framework/**","commands/**"]
---
# Learning capture — operational check
<!-- layer: framework -->

Reference records (`DECISIONS.md`, the architecture document) capture the **why**.
Rules (`.claude/rules/`) enforce the **what**, at the moment of action.
A learning recorded only in a reference document will not reliably shape behaviour.

**After writing any entry here:** ask whether an agent would violate this learning if
they did not see it at the moment they touch the relevant code. If yes, also write a
compact rule. A project's own rule goes in `.claude/rules/<area>.md` with a `paths:`
header naming the files it governs; a shipped rule's area is set in
`.claude/rule-areas.json`, never in its text or its generated files. A project's
addition to a shipped rule goes in `.claude/rule-additions/<name>.md` — plain text,
no header, named after the shipped rule. Then run `npm --prefix .tropis run rules`.
The additions follow the shipped text in the one rule each tool loads, and win where
they contradict. Never edit the shipped text in `.tropis/rules/` or a generated file.

Full routing in `.claude/commands/capture-learning.md`.

<!--
  Precondition: this rule assumes rules are delivered at the moment of action by a
  hook or an equivalent mechanism. In a project where the whole rule set is loaded
  at session start instead, the second paragraph has nothing to check — but the
  first paragraph still holds, and so does the discipline of writing the rule and
  not only the reference record.
-->

## A commit message is not a delivery mechanism

A commit body is committed and never loaded. Nothing reads `git log` before writing a
plan, a rule, or a test — so a lesson recorded there is preserved and undelivered, which
is indistinguishable from recorded until somebody asks.

Before writing a lesson into a commit body, ask where the next person will be standing
when they need it, and write it there first. The commit can then state it in one line
and point at the durable place.

Got wrong three times in one day in the project this came from — a file-list lesson, an
environment note, and the evidence for a framework boundary — and each time the developer
had to ask before it moved.

**A rule file alone cannot deliver this rule at the moment it matters, and hooks cover
the gap.** Rules arrive as files the agent tool loads; none of them is in front of an
agent at the instant it merges a plan or commits, which is when this rule applies.

A `PreToolUse` hook can match `Bash`, its payload carries the full command, and an `if`
condition narrows it to one command shape. Two moments are wired that way:

- **Merging a plan** — `capture-at-merge.sh`. Fires once, when the work is finished and
  its lessons are known, at the same instant the review record owes its *Learnings
  routed* section and the doc-closeout table applies.
- **Committing something that belongs on a branch** — `framework-commit-check.sh`. On
  any branch it names the instruction layer (`.claude/rules/`, `.claude/rule-additions/`,
  `.claude/framework/`) and commands, and states that the body must carry the
  fresh-agent check outcome; on `main` it also names every other file outside the paths
  that may go straight there, and says a branch is required.

Both Bash hooks, and the write hook, are asserted in `rule-delivery.test.js` by running
the script, not by reading it — a hook that emits nothing looks exactly like one that
works, and that is the shape of the defect which once took the entire rule layer to zero.

**Writing a rule, a rule addition, a decision record, or a framework document** is a
third moment, and it is not a Bash command. `capture-at-write.sh` fires on Edit and
Write of `.claude/rules/`, `.claude/rule-additions/`, `DECISIONS.md`, and
`.claude/framework/`, and prints the
three-question check from `.claude/commands/capture-learning.md`. That file is the
only copy of the questions; the hook extracts them. `/capture-learning` still works
by hand.

All three reply through `.tropis/hooks/hook-reply.sh`, the one shape both Claude Code
and Cursor pass to the agent.

## A rule that was skipped needs evidence, not a second copy

When a rule turns out to have been ignored, the reflex is to write it again at another
moment — a second copy, in another file, saying the same thing. That is the drift this
document exists to prevent, arriving disguised as the fix for it.

A rule that is correct, complete and evidence-free is the one that gets skipped. It reads
as boilerplate because nothing in it shows what it cost. Attach the incident to the rule
that already exists — what happened, and what it cost — and leave only the action at the
other moment.

This applies to rules that have actually been broken. A rule nobody has ignored yet does
not need a story attached, and a rule file padded with hypotheticals is one nobody finishes
reading.

## A rule that describes a defect names the defective code

When a rule states a convention the code does not yet follow everywhere, name the code
that does not, and pair the naming with an assertion that goes red once it is fixed. An
agent drafting new code copies the nearest example, so the codebase competes with the
rule and wins unless the rule names the exception. Verified by a fresh-agent check in
the project this came from, on a rule requiring an in-flight state for every backend
call. The naming is a temporary clause, and the next section says where its assertion
goes.

## A rule that says the code is a certain way is asserted

Such a rule gets an assertion in `.tropis/guards/rule-claims.test.js`, inside its
project-owned block, or a line on the untestable list there saying why it cannot have one.
A clause that exists only because the code is still wrong is a temporary clause: it ends
with the marker `Temporary — until <id>. Asserted by rule-claims › <name>.`, where `<id>`
is the catalog entry for the fix and `<name>` a test name with no full stop. Its assertion
is a call to `temporary` from `.tropis/scripts/rule-claims.js` with that name, inside the
block, whose function expects the defect to still be there; it goes red once the fix
lands, and says which paragraph to delete.
<!-- generated by .tropis/scripts/generate-rules.mjs · sha256:969e25a8ec21bf3b5a64ae3e68e81d66350af8db559a16e73f4593cd8de691d1 -->
