# Framework decisions
<!-- layer: framework -->

Decisions about the framework itself — the ones that shaped what this blueprint
contains, kept so an adopting project can see what was weighed rather than only what
was concluded. Decisions about the application built on top live in the project's own
root `DECISIONS.md`.

**On identifiers.** These are `FW-NNN`, numbered per installation. The two projects this
blueprint was extracted from had both allocated `FW-001` and `FW-002` — to four
different decisions. Framework decision records fork the moment a project starts making
its own; they do not merge back. So **cite a decision by its title when writing about it
in another project**, never by its number, and continue the local sequence rather than
trying to keep it aligned with anyone else's.

---

## FW-001: Rules are injected per area, deduplicated per session

**Date:** 2026-07-26 · **Status:** Never in effect in Claude Code — see FW-008

**Decision:** Area-specific rules are injected by a pre-tool hook keyed on the target
path, and each rule file is emitted at most once per session.

**Rationale:** Loading every rule at session start spends context on areas the session
never touches. Injecting at the moment of action is deterministic — it does not depend
on the model choosing to load anything. Deduplication is required because the hook fires
on every Read, Edit, and Write; without it a session working in one area re-injects the
same rules on every file touch. Measured once at ~1900 lines of repeated context in a
single session.

**Consequences:** A rule needs both a file and a hook pattern; adding one without the
other means it never fires. `/capture-learning` enforces the pairing and
`guards/framework-integrity.test.js` fails if it is broken.

**Precondition:** the tool provides a pre-tool hook and passes a session identifier.
Where it does not, rules must be delivered some other way — see FW-003.

---

## FW-002: The agent instruction file stays thin

**Date:** 2026-07-26 · **Status:** Accepted

**Decision:** The entry file carries identity, gotchas, key constants, and a map of what
to load when. Architecture, feature inventory, and test strategy live in `docs/` and are
loaded on demand.

**Rationale:** Guidance current models do not need, and content discoverable from the
file structure, costs context on every session and narrows exploration. Gotchas — things
that are surprising and would otherwise be got wrong — are what earn the space.

**Consequences:** A reader must follow a pointer for depth. The load map must stay
accurate or the pointers dangle; the integrity guard checks that they resolve.

---

## FW-003: One rule file, many trigger paths

**Date:** 2026-06-10 · **Status:** Accepted

**Decision:** When a rule applies to several areas, write it once and give it every
relevant area. Never copy the text into each area's rule file.

**Rationale:** Duplicated rule content diverges silently — a correction to one copy does
not reach the others, and nothing fails when they disagree. One source with several
triggers keeps the rule consistent and makes one list the single place that governs
where it applies.

**Consequences:** The list of rule areas, not the rule's text, is where "which areas care
about this?" is answered. Adding a trigger is one line there and no change to the rule.
That list was the rule-injection hook's `case` ladder when this was written; since FW-008
it is the Cursor generator's glob table.

---

## FW-004: Specification and execution are separate sessions

**Date:** 2026-07-26 · **Status:** Accepted

**Decision:** The session that shapes a change and writes its plan does not execute it.
Execution is dispatched to a separate agent, which receives the plan and a kick-off
prompt and nothing else.

**Rationale:** An author cannot see the gaps in their own work. A plan that reads as
complete to the person holding all the context is the normal case, not the exception,
and the only reliable way to find what is missing is to hand it to someone who does not
have that context.

**Consequences:** Plans must be self-contained, which is a real cost — the evidence and
reasoning go in the plan rather than staying in the conversation. The failure mode this
prevents is worse: an executor that has to ask what something means has already lost the
independence the split exists to buy.

**The exception is the framework itself,** which by construction is written and reviewed
in one context. That asymmetry produced three defects in a day in one of the source
projects. The mitigation is the fresh-agent check in `framework/workflow.md` plus the
mechanical guard in `guards/`.

---

## FW-005: Independent of the project's technology, opinionated about its own

**Date:** 2026-08-12 · **Status:** Accepted

**Decision:** This framework is independent of the language, runtime, and toolchain of
the project it governs, and deliberately opinionated about the tools the framework layer
itself runs on: `git`, `bash`, `python3`, and `node`.

Those four are **developer-machine tools, not project dependencies**. They appear in no
project manifest, are imported by no project code, and constrain the project's language
not at all. That distinction is what the whole claim rests on.

**Rationale:** The binding was believed to be to JavaScript, because the guards ship as
test files for one JavaScript runner. They are not. **No guard here reads a line of the
adopting project's source** — every path the five of them resolve is under `.claude/`,
`docs/`, the entry file, or the hooks. They are text analysis over the
instruction layer, and the project's language is not a variable they can see. The one
guard that would read project source ships as a template rather than a guard, for exactly
this reason, and always will.

Nor is `node` a new kind of assumption. The rule-injection hook — then the central
mechanism of the whole framework, removed since (FW-008) — shelled out to `python3` to
parse its payload from the day the bootstrap guide was written, as have both commit-time
hooks. This framework has never been
runtime-independent. It was runtime-*unstated*, which is a different and worse condition,
because an adopter cannot plan around an assumption nobody wrote down.

**What this ships:**

- Prose, which binds to nothing and is the bulk of the value.
- Mechanisms in `bash`, `git`, and `python3`.
- Guards and commands as **working code on a required runtime**, not as descriptions of
  themselves. The one exception is rule delivery, whose requirement is stated separately
  because it depends on the agent tool rather than the runtime — see the amendment below.
- A **catalog schema** with one canonical interchange format, **YAML** — chosen because it
  preserves comments, which this framework uses load-bearingly, and because more than one
  language reads it natively. A project may hold its backlog in another representation
  provided it can produce the canonical one, so the reference tooling and the shared
  fixtures still apply.
- A **conformance fixture tree**: a deliberately broken project, shipped as inert data.
  Every shipped check must catch its own planted defect, so that passing one means
  something — a check nobody has seen fail is not evidence.

**What this refuses to ship:**

- **Rule content.** Refuted by this framework's own evidence: five rule files shared a
  filename across the two source installations and not one shared a sentence. Only the
  convention ports.
- **A test runner or package manifest of its own.** Conformance is proven at install time,
  in the project that will use the guards, where a runner already exists. A blueprint
  running its own suite would only prove its files work in the blueprint.
- **Anything that reads the adopting project's source.** This is the structural fact the
  claim rests on. A shipped guard that broke it would break the claim.

**Where things live:**

- `.claude/` is for **tool-specific delivery machinery** — the hooks, their settings, the
  rules, the slash commands. Those genuinely are one agent tool's mechanism.
- **Tool-neutral framework data goes neither there nor in the application's source tree.**
  The catalog lives at the repository root. It is read by tooling, read by the developer
  in every diff an agent makes to it, and belongs to neither the application nor any one
  vendor.

**What an adopter without `node` gets:** told, immediately and by a command rather than a
paragraph. `.framework/scripts/check-prerequisites.sh` reports what is missing and how to
install it, and exits non-zero until it is there. The tools are a precondition, not a preference.

**Amended 2026-08-16.** This originally promised written properties for every guard and
command, so a project could reimplement them in another language. That contradicted the
decision it sits in: if `node` is required, the reader who would reimplement has declined a
precondition, and writing nine descriptions to serve them is work for nobody. It also
created a second statement of what each guard does, alongside the guard — and this
framework's own evidence is that two copies of one statement drift silently.

**Requiring the tooling and shipping a check for it is strictly better than describing an
alternative to it**, because a check fails loudly and a paragraph does not.

**Amended 2026-10-07 — how the blueprint checks itself without a runner.**
`check-blueprint.sh` borrows a seeded project's installed dependencies, stages the
blueprint's committed content, and runs the conformance check with the shipped
instruction layer laid over the sample project. That proves the files work where they
will be used — installed, in a project — which is what the refusal above protects; it is
not a suite proving they work in the blueprint. Its first run found the clean baseline
already red, and pointers that resolved in the blueprint's own layout and nowhere an
installed project looks.

**Amended 2026-10-15 — the self-check brings its own tools.** It no longer borrows a
set-up project's: it installs the tools a set-up project gets, as the blueprint's
package template names them, into a folder of its own that git ignores, so it runs in
CI and on a fresh clone. The blueprint still has no package file of its own and no
runner of its own.

**One description survives, for a reason that is not about language.** Rule delivery
depends on what the *agent tool* can do — run a script before a file is read, match file
patterns, or neither — and no runtime settles that. `.claude/framework/rule-delivery.md` states
what delivery must achieve, separately from the script that achieves it here.

**Evidence standard.** This claim does **not** rest on a port. It rests on a structural
property of the artifact — no shipped guard reads project source — which is mechanically
checkable and will be checked. That is stronger evidence than the sample of two behind
`PORTABILITY-NOTES.md`, because it is a property of the thing rather than an observation
about two uses of it.

It rests on **no experience of an installation outside JavaScript**, and does not pretend
otherwise. The squash-merge and single-developer assumptions remain exactly as untested as
`PORTABILITY-NOTES.md` already says.

**What would widen it:** a third installation in another language, testing three things
this cannot — whether the properties are complete enough to reimplement from, whether the
fixture tree actually catches a wrong reimplementation, and whether the canonical format
survives a project whose tooling prefers otherwise. Until one exists, there is no public
commitment.

**Consequences:** Five follow-on changes become writable — migrating a real installation's
backlog to the canonical format, canonising that format here afterwards, porting the
backlog command, stating every guard and command as a property, and building the fixture
tree. Anything added to this framework from now on is testable against this record: a new
guard that reads project source, or a new command that assumes a package manager, is
refused by the decision rather than by taste.

**Precondition:** the four tools above are on the developer's machine. Where `node` is
not, the reference implementations do not run and the properties plus fixtures are what
the adopter works from.

## FW-006: Operator and adopter pages close out narrowly

**Date:** 2026-08-16 · **Status:** Accepted. Its blueprint-README row is superseded by FW-025, which also narrows its operator-guide row to working with the framework

**Decision:** A plan owes a README edit only when it changes what that page
claims — commands named, start path, jobs, or streams. The project's operator
guide, `.framework/README.md` (what an operator of an adopting project is told),
and the blueprint README (what an adopter of the framework is told) are separate
closeout rows; the blueprint README is edited only by a plan that executes in the
blueprint repository. Most project work does not touch either page.

**Rejected:** a blanket “any harness, framework, or blueprint change → update
README” closeout row; pulling blueprint README edits into harness plans;
treating dedicated page-rewrite entries as a substitute for this closeout
(those entries still own large rewrites; closeout covers the forgot-the-page case).

**Consequences:** Specifying sessions that omit the matching README from the
File Structure table when claims change leave the page stale on purpose until
the table is fixed. Executors must not “helpfully” edit a README that the plan
forbade.

## FW-007: The rule hook works out the project root, and says how when git cannot

**Date:** 2026-09-09 · **Status:** Superseded — the rule hook was removed (FW-008). Kept
as history; its lasting point, resolve against the root and never the working directory,
is a bullet in `.claude/rules/harness-scripts.md`.

**Decision:** `inject-rules.sh` resolves the rule directory against the project
root, never against the working directory. It asks git first. Where git cannot
answer — the tool ran outside a repository, or before `git init` — it falls back
to the script's own location, two levels up from `.claude/scripts/`, rather than
to `pwd`.

**Rejected:** keeping a relative `RULES_DIR`, which is what shipped and is the
defect this records — every `[ -f ]` in `emit()` misses from any subdirectory,
`emit()` skips every rule, and the hook prints nothing while exiting 0.
Also rejected: refusing to guess and exiting with a message when git is silent.
A hook that fails loudly on a pre-`git init` seeded project would fire during
bootstrap, when the adopter has no way to interpret it and nothing has gone
wrong.

**Consequences:** The guess is a real one and is recorded here because it is a
guess: a `.claude/scripts/` moved elsewhere in the tree would resolve a wrong
root, silently. That is an acceptable trade against the alternative, because
the layout is fixed by the blueprint and an adopter who moves it has changed
more than this script. The failure this replaces was worse in kind — silent,
total, and identical in appearance to a hook with nothing to say.

---

## FW-008: Hooks speak only where nothing else does; the rule hook is removed

**Date:** 2026-10-12 · **Status:** Accepted. Its statement that Claude Code loads every
rule at session start is replaced by FW-009.

**Decision:** No hook delivers rules, and `inject-rules.sh` is not shipped. A hook speaks
only at a moment nothing else serves — writing a rule, decision record or framework
document, committing one, merging a plan — and replies through
`.framework/hooks/hook-reply.sh` with `hookSpecificOutput.additionalContext`, never a
permission key, and the same reply whichever tool runs it.

**Evidence:** Measured on 2026-10-09 in the project this framework came from. In Claude
Code (2.1.260, 2.1.289, 2.1.295) a hook's plain stdout reached no agent and the JSON reply
did. In Cursor 3.23.12, with real folders, plain stdout made it refuse the call ("returned
invalid JSON") and the same JSON reply reached the agent. The rule hook's output had never
reached an agent: Claude Code loads every `.claude/rules/*.md` at session start by itself,
which is how agents had their rules all along. Cursor attached no glob rule in any case
measured. The measurement table is in `.claude/rules/harness-scripts.md`;
`.framework/scripts/probe-hook-channels.sh` repeats it.

**Rejected:** making the rule hook heard — it would give Claude Code every rule twice.
Keeping it unwired — every project would still carry its list of areas as dead code
inside a framework file. Choosing a reply by detecting the tool — one reply works in both,
and the two hooks that did this said nothing at all in Cursor.

**Consequences:** FW-001's mechanism never worked in Claude Code, and its reason — not
paying for every rule in every session — is unmet: every Claude Code session carries every
rule from the start. `framework/rule-delivery.md` says so, and names what would meet it.
Where a project keeps the Cursor projection, the Cursor
generator's glob table is its only list of rule areas, and
`guards/framework-integrity.test.js` checks it. A project without it has no list of areas
at all, and needs none while Claude Code loads every rule file.

## FW-009: Rules load by area, through Claude Code's `paths:` header

**Date:** 2026-10-14 · **Status:** Accepted

**Decision:** Every shipped and project rule opens with a one-line `paths:` header holding
a JSON list of the files it governs. The header is the only list of rule areas: Claude
Code loads the rule when the agent first touches a matching file, the Cursor generator
turns it into globs, and `rule-areas.test.js` — shipped to every project — fails a rule
without one. The generator's glob table is removed.

**Evidence:** Measured in first-adopter on 2026-10-12, desktop Claude Code 2.1.295, on the
developer's Mac: a header-scoped rule loaded on a read or write of a matching file inside
the session's own folder and not at session start, and did not load for a file in another
checkout or behind a link. Confirmed in one repository on 2026-10-13, Claude Code 2.1.260:
no rule at start; the area's rules after reading a file in it. Recorded there as "Rules
load by area, through Claude Code's header and one hook across checkouts".

**No size limit.** first-adopter also caps rules at 9,500 characters and split its
`planning.md` to fit, because a hook carrying rules across its checkouts had its reply cut
above about 10,000 characters. One repository has no such hook, so neither the cap nor
the split is ported; a size check comes back only with a measurement of a limit in a
tool.

**Rejected:** every rule loaded at session start — FW-008's consequence, where every
session pays for every rule. A glob table beside the headers — two lists of areas that
can disagree.

**Consequences:** A session starts with no area rule. A header only works for files inside
the session's own folder, which is why it takes effect with FW-010. A project's areas live
in shipped rule files until `rule-areas-are-project-data`; rules after `/compact` are
`rules-return-after-compaction`'s; Cursor is `cursor-agents-receive-area-rules`'s.

## FW-010: A project is set up inside its own repository

**Date:** 2026-10-14 · **Status:** Accepted

**Decision:** `set-up-project.sh` installs the framework into the project's `.claude/`,
`.framework/` and root, all committed. Every command runs from an entry point under
`.framework/`, and `.gitattributes` keeps the framework out of an exported copy. The
sibling harness, the overlay of links and the working-copy clone are removed with their
three scripts.

**Evidence:** first-adopter's two-repository layout, 2026-08-14 to 2026-10-13, needed a
measured workaround at every crossing: links that loaded nothing without a one-time
approval; `paths:` rules that loaded only inside the session's folder; a hook to carry
rules across; a personal setting that loaded rules twice in one direction. After its move
into one repository its checks, product suite and a fresh session all passed (first-adopter's
plan docs/superpowers/plans/2026-10-13-project-lives-in-one-repository.md, review record).
The agent frameworks surveyed in its spec all install into the project's repository.

**Rejected:** keeping the sidecar — the workarounds keep growing. A submodule for
`.framework/` — the developer chose copies with fingerprints on 2026-10-09
(`project-takes-a-framework-version`).

**Consequences:** Plans usually name one repository, and isolation makes one worktree,
which carries the rules and hooks because they are committed. A project with its own
`CLAUDE.md` moves it aside to set up. Taking a later version is
`project-takes-a-framework-version`'s.

## FW-011: A flush reaches the framework as pull requests

**Date:** 2026-10-15 · **Status:** Accepted

**Decision:** A flush submits one pull request per queue line, so each suggestion is
accepted or declined on its own. The path is the same for everyone: the maintainer
flushing from their own project is a contributor like any other, and the branch goes to
the framework repository when the submitter can push there, otherwise to their fork. The
operator decides line by line — flush, hold or decline — and the command waits for each
answer; classifying the line as a lesson or a capability and stating what the framework
already has are the agent's work, shown with the question. A capability arrives as a
shaped entry, a value and acceptance criteria written with the operator in the same
sitting; one the operator wants to flush but cannot shape now is held, marked as waiting
to be shaped, and never submitted as an idea. A lesson arrives as the edit it proposes:
the exact words, at a named place in the framework's rules or documents. The work happens
in a temporary clone of the framework's current main, never an existing clone; a fork
only receives the branch. A line leaves the project's queue when its pull request opens,
and the pull request is the record. A declined line leaves with its reason in the
project's flush plan; a held line stays, with a note of what it waits for. No GitHub
issue is filed. Without `gh` signed in, or with a framework address that is not a GitHub
repository, the command stops before drafting anything. The blueprint layer value is
retired.

**Amended 2026-10-19 — an entry, not a line.** A queue entry is one purpose and may hold
parts: indented lines whose changes deliver their value only together. The flush puts
each entry to the operator with all its parts and submits one pull request per entry,
carrying every part; a part is decided only with its entry. Changes that only share a
topic stay separate entries and separate pull requests; grouping those is the receiving
maintainer's (`maintainer-absorbs-contributions-in-groups`). Evidence: first-adopter's
queue grew to 64 lines that were 38 purposes (first-adopter `0e53c01`).

**Evidence:** first-adopter's 2026-10-14 flush raised two capabilities as blueprint-layer
entries in its own catalog, which nothing in the framework reads; they were moved by hand
(`8e80701`).

**Rejected:** writing entries directly into the framework repository — it works only for
its maintainer. One pull request per flush — accepting one suggestion means editing
someone's branch. A GitHub issue per capability — a second record of the same thing.
Tracking each pull request in the project's queue until decided — a declined lesson is
already applied in its project.

**Consequences:** A flush needs `gh` and a GitHub-hosted framework; there is no fallback
without them. Pull requests from forks get no CI until ci.yml also runs on `pull_request`.

## FW-012: A shipped rule's area is the project's data; only shipped rules are generated

**Date:** 2026-10-15 · **Status:** Accepted

**Decision:** The text of each shipped rule lives in `.framework/rules/<name>.md` with no
header. Its area is the project's own data, in `.claude/rule-areas.json` — an object keyed
by shipped rule name, each value a non-empty list of globs, shipped with the five default
areas. `.framework/scripts/generate-rules.mjs` (`npm --prefix .framework run rules`) writes each
shipped rule's Claude Code file in `.claude/rules/` and every rule's Cursor file in the
form measured to reach a Cursor agent. A project's own rules stay hand-written in
`.claude/rules/` with their own `paths:` header, and the generator never writes them.
Every generated file ends in a line holding the SHA-256 of what precedes it, and
`rules -- --check` lists any file that is missing, extra, stale or edited by hand; a guard
shipped to every project runs it. The areas file is JSON, because globs beginning with `*`
must be quoted in YAML. The generator refuses, writing nothing, an areas file that lacks a
shipped rule, names an unknown one or gives an empty list, a glob containing a comma, and a
project rule with a shipped rule's name or no header.

**Evidence:** A project that wanted a shipped rule to cover more of its tree had to edit
the header of a framework file (FW-009's consequences). Cursor attached an unquoted,
comma-separated `globs` line and attached nothing for the JSON array the old generator
wrote (docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md). The rule-tooling
survey (docs/superpowers/specs/2026-10-15-rule-tooling-finding.md) found the hash and the
check mode in ai-rulez and no tool that writes the measured Cursor form from per-project areas.

**Rejected:** generating every rule, own rules included — a hand-written rule would then
have a second home to edit, and its header is already its area. Leaving the header out of
the fingerprint — a changed area would then pass the check. Adopting a rule-sync tool — a
dependency, a configuration system and a second source of areas for a generator that is
about a hundred lines.

**Consequences:** A project changes a shipped rule's area in one file it owns and runs one
command. Existing projects keep the old layout until `project-takes-a-framework-version`.
A glob with a comma cannot be written. Whether a single-file glob and a glob beginning with
`*` attach in Cursor is measured in `docs/verification-log.md`.

## FW-013: A project adds to a shipped rule in its own file

**Date:** 2026-10-15 · **Status:** Accepted

**Decision:** A project adds clauses to a shipped rule in
`.claude/rule-additions/<name>.md`, plain text with no header, named after the shipped
rule. The area stays the shipped rule's, from `.claude/rule-areas.json`. For a shipped
rule with additions, the text handed to both renderers is the shipped text with trailing
whitespace removed, a blank line, the separator, a blank line, the additions trimmed at
both ends, and a newline. The separator says the text below is this project's addition,
that it wins where the two contradict, and that an agent following it tells the operator
which clause above it set aside and why. An additions file that is empty or only
whitespace counts as absent; with no additions the text is passed through untouched. The
generator writes nothing and exits 1 when an additions file is named for one of the
project's own rules, named for no rule at all, or begins with a header. Only `.md` files
in the folder are read. A project's own rules get no additions file. Additions to a
framework document go in the project's own `CLAUDE.md`; nothing else is built for them.

**Evidence:** A fresh Claude Code session given a shipped `tests` rule and a companion
beside it applied them as one list and, asked about a conflict, said it would follow the
project file because that file said so
(docs/superpowers/specs/2026-10-08-blueprint-update-model-finding.md, section 3). No
rule-sync tool joins a companion into the one file each tool loads: three of four write
it as a second rule or replace the shipped body
(docs/superpowers/specs/2026-10-15-rule-tooling-finding.md, N7). Claude Code 2.1.300
on dev-laptop (Darwin 25.2.0), Task 6 of this plan: no Marker sentence before
a tool; after reading a file in the tests area, both the shipped sentence and the
project's; asked to write a test, it used the project's suffix and said it had set the
shipped one aside because the addition wins. It did not quote the separator's heading.
Cursor 3.24.12 on the same machine, Task 7 of this plan: no Marker sentence before a
tool; after reading a file in the tests area, both marker sentences; asked to write a
test, it used the project's suffix and said the addition wins where the two disagree.
It did not quote the separator's heading.

**Rejected:** a companion beside the rule in `.claude/rules/` — Claude Code would load
that file by itself, and Cursor and every surveyed tool would write it as a second rule.
Companions for framework documents imported from `CLAUDE.md` — the project's `CLAUDE.md`
already holds them, and an `@` import is not expanded by every tool. The shipped rule
winning — a project with a real reason to differ would edit the shipped file again.
Detecting conflicts mechanically — not possible.

**Consequences:** A project can quietly override a framework lesson, and the separator
makes the agent say so when it does. A rule with no additions file is written byte for
byte as before.

## FW-014: A project takes a new framework version with one command

**Date:** 2026-10-15 · **Status:** Accepted

**Decision:** `.framework/installed.json` records the version a project holds and a
fingerprint of each shipped file. Paths are relative to the project root, sorted, with
two-space indent and a final newline. Setup writes the record last; the take command
rewrites it after an update. A fingerprint is the SHA-256 of the file's UTF-8 text
after the inner lines between a block's markers are removed. The marker lines stay,
so filling in a project-owned block never changes the fingerprint.

Shipped files are every file under `.framework/`, `.claude/framework/` and
`.claude/commands/`, except `.framework/node_modules/`, `.framework/package-lock.json`,
the record itself and `.framework/README.md` — the project's operator guide. Generated
files under `.claude/rules/` and `.cursor/rules/` are regenerated and never compared.
`.claude/settings.json` is merged. `.gitignore`, `.gitattributes` and
`.claude/rule-areas.json` are adjusted, not fingerprinted. The entry files, the
backlog and the verification log are the project's and are never touched.

Settings are merged, and the file never gets a `<path>.new`. Shipped hooks — a hook
whose command contains `.framework/hooks/` — are removed from the project, and the new
version's hooks are appended after the project's own hooks in the matching group, so
the project's hooks run first. Every key other than hooks is left as the project had
it. The shipped comment is never copied in.

Nothing is written until the refusals have been checked. The command refuses when the
Tropis checkout is not exactly at a release tag, when the project root is not a git
repository root, when the project has uncommitted changes, when it has no
`.claude/rule-areas.json` — set up before rule areas were project data; that move is
not built yet — when there is no record and no `--from`, when the target is not newer
than the version held, and when the target is breaking and `--accept-breaking` was not
given.

Versions compare as major, minor and patch. A held version with a suffix after its
numbers counts as later than those numbers and earlier than the next release: taking
the numbered version over it is refused, and taking the next release is allowed. A
held version that does not parse is treated as no record, and `--from` must parse.
Below 1.0 a release is breaking when its major is above 0 or its minor is higher than
the held minor. From 1.0 it is breaking when its major is higher.

For each path in the baseline or the new version, the action is one of replace, leave,
`<path>.new`, delete or keep. An unchanged shipped file is replaced, carrying
project-owned blocks. A file the project changed and the new version left alone is
left. A file both changed is left, and the new text is written to `<path>.new`. A file
only the new version has is written, or written to `<path>.new` when the project
already has something at that path. A file the new version no longer ships is deleted
when the project had not changed it, and kept when it had. A shipped file the project
removed is left absent, whether or not the new version still ships it.

**Amended 2026-10-19 — a missing file is never left out in silence.** With a record, a
shipped file the project lacks was removed by it: it stays absent, and the take lists it
as removed by the project whether or not the new version changed it. Before, a file the
new version left unchanged was left out with no message. With `--from` there is no
record, and the baseline lists what that version ships rather than what the project was
given, so a shipped file the project lacks is written and listed as added. Evidence:
first-adopter's first take ran with `--from`, installed nothing for twelve files it kept
elsewhere, and stopped half-written when the rule generator could not import one
(first-adopter docs/superpowers/specs/2026-10-17-this-project-takes-tropis-design.md).

**Evidence:** The update-model finding's spike worked the take step through once by
hand and compared a copy-and-lock with a submodule
(docs/superpowers/specs/2026-10-08-blueprint-update-model-finding.md, sections 4 and
5). The shaping notes on the catalog entry project-takes-a-framework-version, dated
2026-10-15, record the same choices: compare a project set up before fingerprints
existed with the version it holds, keep git as the backup, merge settings because
every project changes that file on day one, run from a Tropis checkout until the
package install, treat breaking as a version-number test, and leave project-owned
blocks out of the fingerprint.

**Rejected:** A backup folder — git is the backup. Plain `.new` for settings — every
project changes the file on day one. A submodule — the 2026-10-09 decision
(docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md).

**Consequences:** A project's edit to a framework file keeps the suite red until it is
moved or merged. Updating needs a Tropis clone until the package install exists
(`framework-installs-as-a-package`). The move to `.tropis/` is a later plan.

## FW-015: The framework folder is `.tropis/`, and an earlier install moves there

**Date:** 2026-10-16 · **Status:** Accepted; its migration superseded by FW-033

**Decision:** Decisions 1 and 3–7 of
docs/superpowers/plans/2026-10-16-framework-moves-to-tropis.md. A project set up from
this release holds the framework in `.tropis/`, and setup refuses a project that still
has `.framework/`. `take-version` recognises the current layout, an areas-layout install
still in `.framework/`, and a `v0.1.0` install, and refuses a project that has both
folders or neither. After every refusal it renames `.framework/` to `.tropis/` before
any other write, rewrites the settings, ignore lines and area globs that name the old
folder, and for a `v0.1.0` install builds the areas file from the rule headers, keeps
edited rule text for the operator, and deletes the shipped rule files so the generator
can rewrite them.

**Evidence:** The name decision in `blueprint-tool-agnostic-name` left the folder for
the entry that renames it (`feature-catalog.yaml`, the comment of 2026-10-15, and the
criterion that the folder keeps its name). This repository's `v0.1.0` install is that
folder: `.framework/`, rule text in `.claude/rules/`, and no areas file.

**Rejected:** A separate migration command, since one command is what an operator
learns. Keeping `.framework/` as an alias, since two folders mean two places for every
path.

**Consequences:** The release is breaking, and the entry files are listed rather than
rewritten.

## FW-016: A project is told whether a release is safe before it takes it

**Date:** 2026-10-16 · **Status:** Accepted

**Decision:** The check runs from a Tropis checkout beside the take command, and it
takes the release in a scratch clone by calling that command's own code, so the two
cannot disagree about which files the project changed. The project's checks then run
in the clone. Where the take would leave a `<path>.new`, the clone's installed-file
record is pointed at the file in place for the duration of those checks, and the
report says the project's version of that file was what ran. The verdict is not now
when the take, the install, or the checks fail; safe with these steps when the take
would leave a decision, a setting no longer fits, or the release is breaking; and
safe otherwise. Routine take steps — install, run the checks, commit — are not steps
in the verdict.

**Rejected:** A second classifier that predicts what the take would do, because two
copies of one judgment drift. Running the checks in the project itself, because that
writes to the project. Counting a `.new` as a failing check, because every project
that changed a file would read not now.

**Consequences:** The check costs a full take plus a test run. A release that changes
the package file needs the network to check.

## FW-017: The backlog board is a local page, and bands stay the project's

**Date:** 2026-10-16 · **Status:** Accepted

**Decision:** The board is one HTML page the build writes at docs/backlog-board/index.html.
It prints that path and tells the reader to open it in a browser. Nothing publishes it.
`/refresh-board` leaves publishing as one project-owned block, empty as shipped apart
from a comment saying what the block is for. The bands file is the project's: setup
copies a header-only template to docs/backlog-board/bands.yaml, and taking a release
never writes under docs/, so an update does not replace a project's verdicts. `/next`
reads those bands when the file has rows and suggests by them — highest band first,
an arc already under way first within a band, D and E listed and never suggested. With
no bands file, or a header and no rows, `/next` prints what it printed before bands
existed. Amended by FW-034: four bands, C and D listed and never suggested.

**Rejected:** Publishing to a hosted page, which works in one agent tool, and whose
address belongs to one project. Bands inside the catalog, a judgment beside facts,
rewritten by every promotion. Counting no bands as all-E, which would make `/next`
suggest nothing in every project that has not banded.

**Consequences:** A project that takes this release has no bands file until it copies
.tropis/templates/backlog-bands.yaml to docs/backlog-board/bands.yaml. The page loads
its fonts from Google Fonts, so offline it falls back to system fonts.

## FW-018: A project's model picks are its own data

**Date:** 2026-10-19 · **Status:** Accepted

**Decision:** The framework ships the tier definitions, the rule for which models may be
listed, and `/refresh-model-tiers`, and no picks. `/refresh-model-tiers` writes a
project's picks to `docs/model-picks.md`, outside the fingerprinted roots, and
`/dispatch` reads the picks and their `Last verified` date from there. A project with no
picks file is told by `/dispatch` to run `/refresh-model-tiers`.

**Evidence:** The picks shipped inside `.claude/framework/model-tiers.md`, which is
fingerprinted and has no project-owned block, so refreshing them turned the
installed-files check red, the next update wrote its own snapshot beside them, and every
project dispatched with the framework's picks as of its last release. Raised by
first-adopter and taken in from its flush of 2026-10-19 (`tier-picks-are-project-data`).

**Rejected:** A starter roster beside the definitions — it is stale on the day it is
copied, and dispatch already prints a prompt without one. A project-owned block inside
`model-tiers.md` — the picks are most of what changes in that file, and their date would
still sit in a file the framework replaces.

**Consequences:** A project taking this release names no models when it dispatches until
it runs `/refresh-model-tiers`. One that had refreshed `model-tiers.md` itself moves its
pick table, date and notes to `docs/model-picks.md` and takes the new file.

## FW-019: The maintainer takes in a flush a group at a time, one commit per contribution

**Date:** 2026-10-19 · **Status:** Accepted

**Decision:** The framework repository's own command, `/absorb-flush`, lists a flush's
pull requests, proposes groups by the file each changes most, and builds each group
the maintainer decides as one pull request. That pull request keeps one commit per
accepted contribution — the contributor's commit with its author, date and message,
and a line naming the original pull request and what changed in absorbing it — and
lands by rebase. Each original is closed with the commit on main that carries it,
once that commit has landed. The command lives in this repository only and is not
shipped: only the framework receives flushes.

**Evidence:** absorbing first-adopter's 38 pull requests by hand took about six and a
half hours, and most of the rework was in mechanical steps
(docs/superpowers/specs/2026-10-19-absorbing-a-flush-finding.md).

**Rejected:** one squash per group, which carries many unrelated lessons under one
message and cannot revert one alone. One merge per contribution, which is the review
load this exists to cut. A line-union merge for the catalog, which dropped fields
while the self-check stayed green.

**Consequences:** `main` carries commits authored by contributors and not squashed;
the squash rule in the workflow names this exception. A flushed pull request with more
than one commit is put to the maintainer rather than absorbed.

## FW-020: A worktree's setup is the project's own list

**Date:** 2026-10-19 · **Status:** Accepted

**Decision:** The prompt `/dispatch` prints shows, for each worktree a plan creates, the
commands in that checkout's `.claude/worktree-setup.txt`, in order, in place of the
framework's install line. A checkout without the file gets `npm --prefix .tropis ci`, as
before. The file is the project's: one command per line, `#` for a comment, and nothing
the framework ships writes or fingerprints it.

**Evidence:** first-adopter needs a submodule, its own install and a second tools package
before its suite runs. An executor that followed the fixed install line ran the parent
checkout's test binary against a worktree that was never set up (first-adopter `225e2f4`).

**Rejected:** A fenced block under a heading in the project's `CLAUDE.md` — a heading is
prose a project rewrites, and setup writes `CLAUDE.md` and `AGENTS.md` as two copies.
Adding the project's steps after the framework's install — the order would not be the
project's, and a project that installs differently could not drop it.

**Consequences:** A project whose worktrees need more than the framework's install writes
the file once, its install line included.

## FW-021: The framework takes no position on tool attribution in commits

**Date:** 2026-10-17 · **Status:** Accepted

**Decision:** No shipped document tells an agent to strip, avoid or check for a
co-author, "generated with" or "made with" line in a commit or pull request. Whether a
project credits the agent tool that wrote a change is the project's choice. A project
that wants those lines gone says so in its own `CLAUDE.md`, where a project's additions
to a framework document go.

**Rejected:** Keeping stripping as the shipped default, which imposed one maintainer's
preference on every adopter and set agents against the tools they run in. A
project-owned block in the commit format for the choice, a slot for a one-line
preference that `CLAUDE.md` already holds.

**Consequences:** A project that took an earlier release and relied on the shipped rule
keeps attribution lines in its commits from this release on, unless it adds the rule to
its own `CLAUDE.md`. The advice to pass the squash-merge subject and body explicitly
stays, for its other reason.

## FW-022: A finding the normal flow would handle does not become an entry

**Date:** 2026-10-20 · **Status:** Accepted

**Decision:** The catalog rule names two kinds of finding that do not become backlog
entries — an improvement the next agent in that area would make on the spot, and a bug
of little or no impact that the normal flow would catch and neutralise — and dropping
one, with a one-line reason, is a complete answer wherever a finding is routed. A bug
that fails silently is always an entry.

**Evidence:** In the five days to 2026-10-20 this repository's backlog gained 49
entries and shipped 21. One review filed two ideas for one shipped entry, and both were
dropped the same day (`efeabf6`).

**Rejected:** A size or effort threshold — a small silent bug is the most important kind
to log, and size says nothing about whether the flow catches it. Asking the developer
about each finding — it moves the backlog's growth into the conversation instead of
stopping it. Stating the test in each place that routes a finding — four copies drift;
each place points at the one in the catalog rule.

**Consequences:** Reviews, handovers and fresh-agent checks drop more findings, each with
a reason where it was reported. A dropped finding that turns out to matter is found
again by the flow that was trusted to catch it, and then becomes an entry.

## FW-023: A project updates with one command, on its own branch

**Date:** 2026-10-20 · **Status:** Accepted

**Decision:** A project records where its framework came from, and `/update` fetches the
next release from there, checks it, and takes it on a new branch `update/<version>` — or
leaves the project untouched. The command does every by-hand step the notes do not mark
optional, and asks when a step needs the user; optional steps are only printed.

**Evidence:** The developer asked on 2026-10-20 for one slash command that either leaves
the project ready to use the new version or does not go through when it is not safe. The
0.4.0 notes, and this repository's own takes, needed four steps done by hand around
`take-version.mjs`: clone Tropis, check out the tag, run the check and the take from
that checkout, then read the notes.

**Rejected:** Leaving the result uncommitted on the current branch — that breaks the
branch rule when the current branch is `main`, and aborting means discarding files.
Committing on the current branch — that lands framework changes on `main`. A shallow
clone — `take-version.mjs` needs the tag and may need history. A machine-readable
migration file per release — a second copy of what the notes already say.

**Consequences:** Release notes are now read by a command as well as a person, so the
`After updating` heading and the numbered bold leads are a format. A step a project may
skip starts with `Optional:` inside its bold lead.

## FW-024: The self-check runs the guards that check the framework repository

**Date:** 2026-10-20 · **Status:** Accepted

**Decision:** The guards that check this repository's own pages run in
`check-blueprint.sh` on HEAD as staged, from an explicit list. A skip there is a failure,
and each listed guard is shown to fail on a planted defect, as every conformance case is.
Any guard that calls the repository test `isBlueprintTree` and is missing from the list is
named as unlisted.

**Evidence:** Until 2026-10-20 those guards ran nowhere: the conformance run builds a
project-shaped tree, where they skip and pass, and CI runs only the self-check. A
rewrite of one was green while untested.

**Rejected:** Composing the framework's layout into the conformance tree — that tree is
a set-up project by design, and every other guard reads it as one. Choosing the guards
by searching for a function name alone — renaming it would run every guard, or none,
against the wrong tree.

**Consequences:** A new guard that checks this repository is added to the list and given
a planted defect. One that recognises the repository some other way than `isBlueprintTree`
is not caught as unlisted, so it should use that test.

## FW-025: A product's README is refreshed as a whole page, at a level the project chooses

**Date:** 2026-10-20 · **Status:** Accepted. The fact check its Consequences anticipate was dropped: see FW-026

**Decision:** A project may own its README skeleton; otherwise it uses the one Tropis
ships, and updates never write the project's copy. The project records one of three
levels — Tropis writes the page, Tropis only reports, or Tropis stays out — in a
settings file it owns. `/refresh-readme` rewrites out-of-date sections whole and
commits only when the developer says yes. A plan no longer patches the product's README.

**Evidence:** The two abandoned plans of 2026-10-20 (PR fcapurso/tropis#110): per-plan
patching accrues, and a check at dispatch misses work built without it.

**Rejected:** a closeout row per plan; a check at dispatch; markers in the README for
fixed text (the skeleton holds it).

**Consequences:** the fact check, the nudge and the `/release` step follow in their own
plans. The operator-guide row is narrowed to what someone developing the project is told
about working with the framework, so it no longer catches a project's own developer
commands. The README may go directly to main, in the workflow's Branching list and in
the commit hook, because it cannot change how an agent behaves. One exception to plans
not patching the README: a plan that removes or renames a command, file or link the
README names corrects that reference, and adds nothing else — so a check that the README
names only what exists can always be met. A plan that changes a behaviour the README
describes still leaves the page behind until the next refresh; the nudge and the refresh
are what catch that.

## FW-026: A README is not checked mechanically between refreshes

**Date:** 2026-10-21 · **Status:** Accepted

**Decision:** The README is kept honest between releases by the doc-closeout step at
merge (a change correcting what it made wrong, adding nothing), the nudge in `/next`
and the board, and the whole-page refresh in `/release`; no check in a project's suite.

**Evidence:** PR fcapurso/tropis#115 (closed): a check that a README names only what
exists raised false alarms on web routes, MIME types, branch and package names,
footnotes and protocol-relative images, or lost its rules one by one until only
broken links were left.

**Rejected:** That check, by the developer; a warning-only version of it (it adds a
parser to every project for broken links the refresh finds anyway).

**Consequences:** This repository's README check keeps only what a refresh guarantees;
nothing in a set-up project's suite reads its README.

## FW-027: Model picks rest only on figures that can be compared

**Date:** 2026-10-21 · **Status:** Accepted

**Decision:** `/refresh-model-tiers` ranks one model above another only on scores that
share the benchmark and its version, the harness, the effort setting, and a period in
which the benchmark did not change, each taken from its primary source. The supported
tools' own benchmarks count as evidence, with a tool's score for its own model marked
self-published. Cost is left out: each model sits in the highest tier its evidence
supports, and a lower row names only models that reach no higher. Tokens per task from a
shared board are recorded beside the picks for the dispatcher, and no placement rests on
them.

**Evidence:** The first pass in this repository (`d2add2e`) ranked Grok 4.7 below
Composer 2.5 on Coding Agent Index scores taken four months apart across a change to
that index, used a press figure the evaluator's own article contradicts, and passed over
CursorBench 4.0, the one board scoring both, as vendor marketing; there Grok scored
46.3% and Composer 27.7%. Neither Cursor nor Anthropic publishes how fast each model
uses up a plan's limits, so a per-token price compares nothing across the two tools.

**Rejected:** Excluding a tool's own benchmark as vendor marketing (a tool that sells
every vendor's models is no model's vendor, and its board is often the only shared one);
keeping prices as indicative (they hide a model that spends many tokens, and say
nothing about subscription limits); listing cheap models again in lower rows (a cost
choice, which is now the dispatcher's); dropping token usage along with prices (it is the
half of cost that can be compared, when it comes from one board).

**Consequences:** A picks file has no price column, and a placement with no shared board
behind it is marked unconfirmed. A project's existing picks file keeps working until its
next refresh.

## FW-028: Every project runs one pipeline, its stages filled by the project

**Date:** 2026-10-25 · **Status:** Accepted

**Decision:** Every set-up project runs one pipeline whose stages are framework,
sanity, unit, integration, end-to-end, and deploy, in that order. The project fills
a stage with pipeline/<stage>.sh and lists its prose in pipeline/prose.txt; a stage
it has not filled is empty and passes, and a deploy runs only when every earlier
stage passed or was empty, never from a pull request. On GitHub each stage is its
own job in a workflow Tropis installs and replaces on update, and a project that
owns the pipeline keeps a copy its caller points at instead.

**Evidence:** first-adopter's review of 2026-10-22. It had two workflows, and its
deploy waited for only one. Its auto-merge merged with checks pending. The design
is that checkout's docs/superpowers/specs/2026-10-22-pipeline-and-environments-design.md,
sections The pipeline and Delivery: Tropis first.

**Rejected:** Conditions written in the workflow file (they cannot be tested); a
project-owned block inside Tropis's workflow (Tropis's files and the project's
never share a file); sweeping all of .github/workflows/ into the shipped roots
(that would claim the project's own workflows); calling a reusable workflow from
Tropis's repository (it is private, and a project pins a release, not a branch).

**Consequences:** Tropis's pipeline files are installed in every project, including
those hosted elsewhere, where they are inert. Changing the stage order or the gate
is breaking.

## FW-029: A branch's environment is named from the branch and lives as long as its pull request

**Date:** 2026-10-25 · **Status:** Accepted

**Decision:** A project may fill pipeline/branch/ with create.sh, deploy.sh and
remove.sh; the slot is filled only when all three exist, and each script receives
TROPIS_ENVIRONMENT and TROPIS_BRANCH. The environment's name is derived from the
branch — lowercased, with punctuation collapsed to hyphens, a letter prefix when
it would not start with a letter, and a hash of the original name past 24
characters — and a collision with another branch's name fails the command. On
GitHub, opening or reopening a pull request creates that environment, a green
pull request deploys to it, and closing the pull request removes it, while a
push to main still deploys the shared environment; at most one of those jobs
runs per environment, a newer pending job replaces an older pending one, and a
running job is never cancelled.

**Evidence:** The first-adopter design and its Forge spike of 2026-10-22, which
created, deployed, installed, uninstalled and deleted an environment from CI.

**Rejected:** A name chosen at creation and stored somewhere, because it cannot
be worked out by hand. Creating the environment on the first green push, because
an opened pull request would have nothing to try until its stages passed. An
environment per branch without a pull request, because a pushed branch would
cost an environment nobody asked for.

**Consequences:** A project's existing pipeline.yml needs closed added by hand
to remove environments. The gate decides as before unless the slot is filled.

## FW-030: A release is rehearsed on a candidate, and the tag sits one commit above it

**Date:** 2026-10-26 · **Status:** Accepted

**Decision:** A project fills pipeline/candidate/ with reset.sh and deploy.sh,
both or neither, and a rehearsal resets the pre-production environment to the
highest v* tag before deploying the candidate and listing what must be done by
hand. On GitHub the candidate is a separate called workflow, started by hand
for one commit, which runs every stage on that commit and then the rehearsal;
the framework checks accept a ref so that commit is what they check out. The
release tags a commit one above the candidate, whose code is the candidate's,
and a project that leaves the slot empty releases from the main branch as
before.

**Evidence:** The first-adopter design of 2026-10-22,
docs/superpowers/specs/2026-10-22-pipeline-and-environments-design.md, section
*Staging as the release candidate*, where the developer decided that production
ships exactly the commit the pre-production environment was checked on, never
the main branch as it stands. Its release built from main, tagged and deployed
in one run.

**Rejected:** Tagging the candidate itself, because the tagged commit must
carry the promoted notes and the version, which are set only once the candidate
passed. Writing the check's outcome into the notes on the main branch, because
the candidate's commit is fixed before the check, so the line could only reach
the release by taking the main branch's notes, which carry changes merged
since. A gate in the candidate workflow, because it runs every stage and skips
none. Tropis shipping the release step, because version files, tags and
production differ per project; Tropis states what the step must do.

**Consequences:** A project rehearsing a candidate must change its release
pipeline to take a commit. /release runs twice for such a release. A project
that leaves the slot empty releases as before.

**Amended 2026-10-27 — only a vX.Y.Z tag counts.** The rehearsal resets to the highest
tag of the form `vX.Y.Z`, and `/release` counts from the last one, not from any `v*` tag.
`git tag --sort=-v:refname` ranks `v1.1.0-rc.1` above `v1.0.0` and `v1.0.0-rc.1` above
`v1.0.0`, so a project tagging pre-releases had its pre-production environment reset to
a version production never ran. A tag of any other form may mark anything a project
likes; a project-owned pattern was rejected as a setting no project had asked for.

## FW-031: A project's entry instructions live in AGENTS.md, and CLAUDE.md points at it

**Date:** 2026-10-27 · **Status:** Accepted

**Context:** Setup wrote the entry template into both `CLAUDE.md` and `AGENTS.md`, and
`/bootstrap` filled both. Nothing kept them together. In this repository a sentence went
into `CLAUDE.md` only, and the copy Cursor reads went stale with no sign of it.

**Decision:** `AGENTS.md` holds the entry instructions. `CLAUDE.md` is the single line
`@AGENTS.md`, and the project's checks fail on anything else. An update turns an
identical pair into that shape. Where the two differ it changes neither, and names the
lines for the developer to merge. Where an earlier entry says a project's own
`CLAUDE.md`, read `AGENTS.md`.

**Evidence:** Claude Code expands `@` imports, including one inside an imported file, so
a session still receives the workflow `AGENTS.md` imports (measured in the plan
docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md). Cursor does
not expand them, so the content cannot live behind an import Cursor would have to follow.

**Rejected:** A symlink from `CLAUDE.md` to `AGENTS.md` — unreliable on Windows
checkouts. Merging a differing pair during the update — which lines win is the
developer's call.

**Consequences:** A project edits one file. A project whose pair differed has a failing
check after the update until it merges them.

---

## FW-032: A project declares itself public in .claude/project.json, and a hook of its own speaks at commit and push

**Date:** 2026-10-28 · **Status:** Accepted

**Context:** In a public repository, what is pushed is readable by anyone and stays in
its history. A guard can refuse the names it was given, and only a reader of the diff
catches the next one. Exposure happens at push, not at release, so a check that waits
for `/release` comes after the fact.

**Decision:** A project is public when `.claude/project.json`, which the project owns,
holds `{ "public": true }`. Absent, unreadable, or anything but `true` means not
public. Setup does not write it; `/bootstrap` asks beside where the repository is hosted
and writes it on yes, and a project that goes public later writes the same file. An
update keeps it. In a public project `public-exposure-check.sh`, a hook of its own wired
once under the Bash matcher with no `if`, matches `git commit` and `git push` at command
position and tells the agent what to read for private material, and to ask the
developer before going on if it finds any. It never blocks. A review record's *Found*
opens with a `Public exposure:` line, and `/release` lists findings in the window before
drafting.

**Rejected:** A key in `docs/readme/readme.yaml` — that file is the README's settings.
Detecting visibility with `gh repo view` — a network call on every commit, and GitHub
only. Adding the reminder to `framework-commit-check.sh` — that hook is about which
branch a change belongs on, has a project-owned block, and would need a push trigger it
has no use for; one concern per hook keeps each silent where it does not apply.

**Consequences:** A project that is not public is told nothing new. A public project's
agent reads the outgoing diff at every commit and push; the hook asks for a reading, so
what it catches depends on the reader, and the review record and `/release` are the
second and third readings.

---

## FW-033: A project in `.framework/` is set up afresh, not moved

**Date:** 2026-10-28 · **Status:** Accepted

**Decision:** `take-version` and setup refuse a project holding `.framework/`, and the
migration FW-015 described is removed.

**Evidence:** The public repository cannot carry the `v0.1.0` tag its tests needed (the
Why of the plan dated 2026-10-28 whose slug is the-self-check-needs-no-private-tag), and
no adopting project is on that layout.

**Rejected:** A fixture built from the `v0.1.0` tree, since that tree holds private
material. Skipping the tests when the tag is absent, since the public pipeline would
then check less than it claims.

**Consequences:** A project still in `.framework/` must set up again.

---

## FW-034: The backlog is ranked by value over effort inside four bands

**Date:** 2026-10-30 · **Status:** Accepted

**Decision:** There are four bands, each with a written meaning: A do now (high value,
and urgent or blocking other work), B do next (worth doing, no deadline), C decide first
(an open question only the developer can answer stands in the way), D leave it (nothing
to do until something happens). Inside a band an entry is ranked by value divided by
effort, each scored 1 to 5 in the bands file with a one-line reason; an entry missing
either score comes last. `/next` suggests only from A and B, lists C marked as needing a
decision and D, and names a waiting entry that would outrank the suggestion. Shipped,
replaced and shelved entries are out of the bands and listed in a collapsed section at the
bottom of the board. An entry waiting on another is banded on its own value, as though
what it waits on were done, and the board marks the wait.

**Rejected:** One ranked list across all bands, where a cheap low-value entry would climb
above urgent work. Keeping a cheap-win band, since the effort score already says it. A
conversion step for an existing bands file: the missing scores flag every old row, and the
refresh re-judges each one.

**Consequences:** A project's first refresh after taking this release re-judges every row.
Until then an old C row reads as decide first, an old D row as leave it, and an old E row
as unbanded, which counts as D; none of them is suggested.

---

## FW-035: Grooming is a mode of `/refresh-board`, on every refresh for what moved and in full on request

**Date:** 2026-10-30 · **Status:** Accepted

**Decision:** `/refresh-board` proposes four kinds of finding about the backlog: two
entries describing the same work (merge), two that cannot both be done as written
(conflict), entries better done together (bundle) and an entry already done or no longer
true (close). On every refresh it compares the entries it banded, re-banded or re-scored
against all other open entries; `/refresh-board groom` compares every open entry against
every other. It applies nothing without the developer's yes, and changes the catalog only
through `/feature`. Rows sharing a `bundle` name in the bands file are tagged together on
the board, and `/next`, suggesting one of them, names the rest.

**Rejected:** A separate grooming command, since the refresh is where backlog judgments
already live. A full pass on every refresh, which is slow and noisy once the backlog is
large.

**Consequences:** A grooming pass is judgment, so its findings are not tested; the
mechanics around it (the bundle field, the page tag, the one-row report, the `/next` line)
are.

---

## FW-036: A branch's environment is never a permanent one

**Date:** 2026-10-31 · **Status:** Accepted

**Decision:** `branch create`, `branch deploy` and `branch remove` refuse, before listing
origin or running any project script, a branch whose environment name is on the
project's permanent list. The list is pipeline/branch/permanent.txt, one name per line,
trimmed and lowercased, and is compared with the environment name derived from the
branch, so `Production` and `production/` are refused when `production` is listed. When
the file exists it replaces the default list; when it does not, the list is production,
staging and development. An empty slot is still empty, and `environment` still prints
any name.

**Evidence:** first-adopter's upstream flush of 2026-10-29, from its queue entry of
2026-10-28: a branch named like a permanent environment would deploy over it and remove
it when its pull request closed, and the project guarded against that by hand.

**Rejected:** Extending the default with the file's names, because a project could then
never take a default name back, and one that writes its own list has said what is
permanent. Comparing the branch name, because `Production` and `production/` name the
same environment as `production`. Refusing in `environment`, because it touches no
environment and the workflow calls it for every pull request to name its concurrency
group.

**Consequences:** A project whose permanent environments have other names must list
them, and a list drops any default it does not repeat. Closing a pull request from a
refused branch fails its remove job, having touched nothing. `deploy.sh` may still find
no environment; the operator guide says it must fail, not create one.
