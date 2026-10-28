# Rule delivery
<!-- layer: framework -->

**The aim:** when someone is about to act on a file, the rules governing that area of the
codebase are in front of them, without anyone choosing to fetch them — and the rules for
areas they are not working in are not, because every line an agent carries costs context
on every turn.

**In Claude Code the aim is met.** Each rule opens with a `paths:` header naming the files
it governs, and Claude Code loads the rule when the agent first touches a matching file —
not at session start, and not for areas the session never touches (`DECISIONS.md`
FW-009). A shipped rule's header is generated from the project's `.claude/rule-areas.json`
(FW-012). A project adds clauses to a shipped rule in `.claude/rule-additions/<name>.md`
— plain text, no header, named after the shipped rule — and runs
`npm --prefix .tropis run rules`. The one Claude Code file and the one Cursor file
then hold the shipped text, a fixed separator, then the additions. The additions win
where they contradict, and the separator tells the agent to tell the operator which
shipped clause it set aside. Never edit the shipped text in `.tropis/rules/` or a
generated file. A project's additions to a framework document go in its own `AGENTS.md`
(FW-013). In Cursor the generated rules are written in the form measured to attach; see
below.

Claude Code 2.1.300, on dev-laptop (Darwin 25.2.0, macOS 26.2), Task 6 of
this plan: before any tool, no sentence beginning "Marker". After reading a file in
the tests area, both the shipped sentence (name test files `.check.js`) and the
project's sentence (name them `.spec.js`). Asked to write a test for `sum`, it created
a file ending in `.spec.js` and said it set aside the shipped `.check.js` clause
because the project's addition wins where the two contradict. It did not quote the
separator's heading; it stated that the project's addition wins. Cursor 3.24.12, on
the same machine, Task 7 of this plan: before any tool, no sentence beginning
"Marker". After reading a file in the tests area, both marker sentences. Asked to
write a test for `sum`, it created a file ending in `.spec.js` and said the project's
addition wins where the two disagree, so it set the shipped `.check.js` clause aside.
It did not quote the separator's heading.

A rule that is correct, committed, and not delivered has the same effect as no rule at
all — and it looks exactly like a rule that is working.

## What each tool delivers today

Measured in the project this framework came from, in fresh sessions, with a real
`.claude/` folder (a linked one behaves differently — see below).

- **Claude Code** loads a rule by its `paths:` header, by itself: no area rule at session
  start, and the area's rules once the agent reads or writes a file in it. No hook is
  involved. Measured 2026-10-12 (Claude Code 2.1.295) and confirmed in one repository on
  2026-10-13 (2.1.260). A header only works for files inside the session's own folder,
  which is why the framework is set up inside the project's own repository (FW-010).
  Before the headers, on 2026-10-09 (2.1.293), every rule loaded at session start.
- **Cursor** (3.24.12, measured 2026-10-15) receives an always-applied rule and the
  root `CLAUDE.md`. It does not receive a glob rule whose `globs` value is a JSON array,
  which is what the generator writes. An unquoted glob and a comma-separated glob list,
  the two forms Cursor's own rules docs show, attached when the agent read a file in the
  area, and so did a nested `AGENTS.md`, a nested `CLAUDE.md`, and the same unquoted glob
  written by rulesync. None of those attached when the agent created a file without
  reading one, or when it appended to a file through the shell without reading it. A
  `.claude/rules` file with a `paths:` header did not attach. A hook on Read and Write
  did. The body of a description-only rule did not attach; its description was listed
  from the start of the chat. Tables and versions are in the framework repository,
  docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md.
  The command-line agent (`cursor-agent` 2025.09.18-7ae6800, measured 2026-10-27) receives
  the root `AGENTS.md` at session start, with no tool call, and does not expand an `@`
  import inside it — which is why the entry instructions live there (FW-031). Run it with
  stdin closed: with stdin open, `cursor-agent -p` printed nothing and did not return.

**Hooks do not deliver rules.** This framework once shipped a hook that printed the
matching rules whenever a file was read or edited. Its output never reached an agent in
either tool — a hook's plain output is dropped by Claude Code and refused by Cursor — and
made audible it would have given Claude Code every rule twice. It was removed
(`DECISIONS.md` FW-008). Hooks now speak only at moments nothing else marks: writing a
rule, committing one, merging a plan.

**A linked `.claude/` folder delivers no rule file in Claude Code** unless someone once
approved "external imports" for that folder interactively — so a new working copy, a
cloud session or a fresh worktree reached through links gets no rules and says nothing.
Measured the same day. Instruction files that must reach an agent belong in a real
folder.

## What is not met, and what would meet it

- **A project's own areas, in a project already set up.** A newly set-up project changes a
  shipped rule's area in `.claude/rule-areas.json` (FW-012). A project set up earlier still
  has the old layout, with the area in the shipped rule's header, until
  `project-takes-a-framework-version`.
- **Cursor — an area rule from the generator.** The generator now writes `.cursor/rules/*.mdc`
  in the form measured on 2026-10-15: an unquoted `globs` line, several globs separated by
  a comma and a space. Measured 2026-10-15 (Cursor 3.24.12,
  `docs/verification-log.md`): all four shapes attached on a read — a glob naming one file
  (`feature-catalog.yaml`), a glob beginning with `*` (`**/*.test.*`), several
  comma-separated globs, and a project's own rule — and, with the hash line after the body,
  the rule's text arrived intact. Nothing attached before a read.

## What must be true, however you deliver

1. **Path-triggered.** What arrives is determined by what is being touched, not by the
   session choosing to load it. A rule that depends on someone remembering is not
   delivered. *Met in Claude Code by the `paths:` header; in Cursor by the generated glob — see above.*
2. **Silent on no match.** Most files in a repository have no rule. A mechanism that
   complains about them fires constantly and gets switched off.
3. **One source, however many formats.** Where two tools need two formats, generate the
   second from the first and check they agree. Two hand-maintained copies diverge, and the
   divergence is invisible from inside either tool, because each sees a set that looks
   complete.
4. **Observable on demand.** There must be a way to ask "what did this session receive?"
   and see the answer. Without it, the difference between working and silently broken
   cannot be established.

## Checking it works

Start a fresh session of your agent tool in the project and, before it uses any tool, ask
it to list the first heading of every `.claude/rules/` file it was given. In Claude Code
none should appear. Then have it read a file in one rule's area and ask again: that
area's rule should appear. `bootstrap.md` Step 6 does this as part of setup.

**Do this again whenever the agent tool changes**, not only at setup. Delivery is the one
part of this framework that another tool's update can break without touching a single file
in your repository. For hooks, `.tropis/scripts/probe-hook-channels.sh` builds a
throwaway project that measures which reply shapes reach the agent; the table it produced is in
`.claude/rules/harness-scripts.md`.

## If your tool can do none of it

Then rules cannot be delivered automatically, and the honest thing is to stop relying on
delivery rather than to assume it. Name the rule files in the entry file your tool loads at
session start, accept the context cost, and delete the claims elsewhere in this framework
that a rule arrives without being fetched — because for you it will not.
