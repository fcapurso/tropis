# What still keeps a framework document from the agent that needs it — finding

**Backlog item:** `framework-doc-delivery` (spike). **Date:** 2026-11-04.

## The answer

In Claude Code, nothing important is still missing. The workflow loads at session start
through the entry file's import. Area rules load by path. Hooks speak when an agent
commits, merges, writes a rule or creates a branch. A command's body loads when the
command runs. Every other framework document reaches an agent only through a link. For
each of those, either the action it governs is already covered by something delivered
(the workflow, an area rule, a hook, or a command's own script), or the document is one
the agent consults by choice before deciding something.

Three gaps are left. Two are small and the same in both tools; one is Cursor's:

1. **Cursor gets the workflow only if it obeys one sentence.** Cursor does not expand
   the import, so the workflow reaches its agent only through the line in `AGENTS.md`
   telling it to read `.claude/framework/workflow.md`. Nobody has measured whether that
   agent does. The fix is the existing `framework-reaches-every-tool`, re-shaped to that
   single gap (see *Recommendations*).
2. **The tier definitions do not reach the session choosing a plan's tier.** The plan
   rule tells its author to choose a tier, but neither carries nor points at the five
   definitions. `/dispatch` accepts a tier name that is not one of the five and prints
   `(no row for this tier)` without saying what is wrong. New idea:
   `plan-tier-is-chosen-against-the-tiers`.
3. **The rule against hand-written documents describing current state does not reach
   an agent writing one.** That rule is `doc-architecture.md`'s: a document either
   states timeless rules or is generated and guarded. It is reached only through the
   entry file's load map. No area rule covers a project's documentation folder, and the
   write hook does not fire on writes there. New idea:
   `document-rule-reaches-a-new-document`.

One question is still open, and needs Cursor to settle: whether Cursor offers the
commands in `.claude/commands/`. No measurement exists, and Cursor's documentation could
not be reached from this session. New idea: `commands-reach-cursor`.

**No per-file delivery map is needed.** The guard that is missing is a lighter one, and it
belongs in `framework-reaches-every-tool`. So `instruction-files-have-a-delivery-map` is
dropped, with this finding as the reason (*The delivery map*).

The kick-off prompt stays thin. None of the proposals has it carry a document's text.

## How each reaches an agent

The delivery values:

- **always** — in context at session start without a tool call;
- **by path** — loaded when the agent touches a file in an area;
- **at a hook** — a hook's reply at a tool call;
- **when run** — a command's body, loaded when it is invoked;
- **listed** — its name and description are in context from the start, its body is not;
- **linked only** — reached only when the agent chooses to open a path that something it
  has names;
- **never**.

The evidence values:

- **measured** — with tool, version, operating system and architecture;
- **earlier** — measured before and recorded where named;
- **unchecked**.

### The measurement made for this finding

Claude Code 2.1.318, Linux x86_64, model `claude-opus-5-5` (the tool's default:
`dispatch.mjs --tier Large` named no pick, since no subscriptions are recorded in this
session). Signed in with the subscription (`claude auth status`: `oauth_token`). There
were no user-level instructions (`~/.claude/CLAUDE.md` absent). Run in a worktree of this
repository at `a59bf5a` as
`claude -p … --output-format stream-json --verbose --allowedTools Read "Bash(git log *)"`.
That shows each tool call, each hook and each reply. The agent was told the run was a
probe, that its output would be discarded, and not to open `.claude/`, `.cursor/`,
`.tropis/`, `AGENTS.md` or `CLAUDE.md`. It was asked three things, in order:

1. Before any tool call: which of `AGENTS.md`, `CLAUDE.md`, the seven framework documents
   and the area rules were in its context, quoting the first sentence of each. Also which
   commands it could see, and whether it had their bodies.
2. Then to read `docs/superpowers/plans/2026-11-03-fresh-clone-runs-clean.md` and answer
   the first question again.
3. Then to run `git log --oneline -1` and say whether a hook replied.

What happened:

- **Before any tool call**, `CLAUDE.md`, `AGENTS.md` and `.claude/framework/workflow.md`
  were in context. The agent quoted "The spine of a change." from the workflow and said
  "The import expanded." None of `commit-format.md`, `dispatch.md`, `model-tiers.md`,
  `doc-architecture.md`, `rule-delivery.md`, `DECISIONS.md` or any area rule was in
  context: "mentioned by name only". The init event listed all sixteen of this
  repository's commands as skills. The agent said it had "only a name and a one-line
  description, not the body" of each.
- **After the read**, `.claude/rules/planning.md` arrived as a separate system message
  after the Read result. Nothing else arrived. In particular `dispatch.md`, which
  `planning.md` names, did not.
- **At `git log`**, two `PreToolUse:Bash` hooks ran. Both exited 0 with empty output, and
  nothing reached the agent. That is the documented quiet case: neither command is one a
  hook speaks at.

### Framework documents

| Document | Claude Code | Cursor (IDE) | `cursor-agent` |
|---|---|---|---|
| `workflow.md` | always: through the `@` import in `AGENTS.md` — measured above | linked only: `AGENTS.md` (or `CLAUDE.md`) is received, the import is not expanded, and its fallback line tells the agent to read the workflow — earlier (Cursor 3.24.12, `rule-delivery.md`); whether the agent then reads it: unchecked | linked only, the same way: root `AGENTS.md` received at start, import not expanded — earlier (2025.09.18-7ae6800, FW-031); whether it reads the workflow: unchecked |
| `commit-format.md` | linked only — measured above | linked only — unchecked (nothing projects it) | linked only — unchecked |
| `dispatch.md` | linked only — measured above | linked only — unchecked | linked only — unchecked |
| `model-tiers.md` | linked only — measured above | linked only — unchecked | linked only — unchecked |
| `doc-architecture.md` | linked only — measured above | linked only — unchecked | linked only — unchecked |
| `rule-delivery.md` | linked only — measured above | linked only — unchecked | linked only — unchecked |
| `DECISIONS.md` | linked only — measured above | linked only — unchecked | linked only — unchecked |

"Linked only — unchecked" in Cursor is not a guess. Nothing in `.cursor/` names or
carries these documents, and Cursor has received nothing outside `.cursor/rules/`, the
entry files and hooks in any measurement made so far. It is marked unchecked because no
Cursor run in this finding confirmed it.

### Area rules and hooks, for completeness

| Channel | Claude Code | Cursor (IDE) | `cursor-agent` |
|---|---|---|---|
| Area rules (`.claude/rules/`, `.cursor/rules/`) | by path: on a read or write in the area — measured above, and earlier (2.1.295, `rule-delivery.md`) | by path: on a read in the area, not on a create without a read — earlier (3.24.12, `rule-delivery.md`) | unchecked |
| Hooks in `.claude/settings.json` | at a hook — earlier (2.1.260–2.1.295, `rules/harness-scripts.md`) | at a hook: heard on Read and Shell; `if` ignored — earlier (3.23.12, same table) | unchecked |

### Commands

Each command is **when run** by its nature. What differs between tools is whether the
agent can see that the command exists.

| Command | Action it governs | Claude Code | Cursor (IDE) and `cursor-agent` |
|---|---|---|---|
| `bootstrap` | setting the framework up in a project | listed, when run — measured above (start only) | unchecked |
| `capture-learning` | routing a lesson to its layer | listed, when run — measured above | unchecked |
| `dispatch` | handing a plan to an executor | listed, when run — measured above | unchecked |
| `feature` | moving a backlog item's status | listed, when run — measured above | unchecked |
| `flush-upstream` | sending a project's lessons to the framework | listed, when run, in a project; absent in this repository by design (CLAUDE.md, *A lesson goes straight into the source*) | unchecked |
| `idea` | capturing an idea | listed, when run — measured above | unchecked |
| `manual-check` | a check only a person can make | listed, when run — measured above | unchecked |
| `next` | the backlog report | listed, when run — measured above | unchecked |
| `refresh-board` | rebuilding and banding the board | listed, when run — measured above | unchecked |
| `refresh-model-tiers` | refreshing the model picks | listed, when run — measured above | unchecked |
| `refresh-readme` | refreshing the README | listed, when run — measured above | unchecked |
| `release` | a release | listed, when run — measured above | unchecked |
| `scope` | shaping a new project | listed, when run — measured above | unchecked |
| `sprint` | planning and running a sprint | listed, when run — measured above | unchecked |
| `update` | taking a framework release | listed, when run — measured above | unchecked |

"Measured above" covers the listing at start. The body loading when a command runs is the
tool's documented behaviour for skills, and this probe did not invoke one. This
repository's own `absorb-flush` and `rule-trial` were listed the same way.

## The documents reached only by a link

For each one: the action it applies to, and what already reaches the agent at that action.

- **`commit-format.md`** — writing a commit message, above all the squash message that
  survives. **Covered, except a closed list.** The workflow is always loaded. Its
  *Merging* section carries the message template: `<type>(<scope>): <what is now true>`,
  a body of intent rather than inventory, `Implements:` and `Plan:`. The project's
  scopes are in its `AGENTS.md`, also always loaded. `planning.md` points here when a
  plan is written. Three things reach no one: the closed list of types; "every commit
  has a body", which matters only for working commits a squash discards; and "scope the
  message against the diff". No hook checks a message (`framework-commit-check.sh`
  speaks only about where a commit belongs). **No backlog item.** At worst a squash
  subject gets an unlisted type, and review sees it. By FW-022 the normal flow handles
  that.
- **`dispatch.md`** — handing a plan over, and writing a plan so it can be handed over.
  **Covered by a command's script and by a rule by path.** The hand-over is `/dispatch`,
  whose script refuses a plan that lacks `Repositories`, `Global Constraints`, `Traps` or
  `Delivers`, or whose header field reads empty. It prints the thin prompt, so the
  document's prompt contents are produced rather than remembered. Writing the plan loads
  `planning.md` by path, which carries the handover report, the review record, testing
  every claim and the tier decision. The document's other rules are covered too:
  re-running the merge criteria after a rebase is in the workflow's *Merging*, step 4,
  and the instruction to read the whole plan is in the prompt the script prints.
- **`model-tiers.md`** — choosing a plan's tier, and choosing the model for a plan, a
  team member or a probe. **Choosing the model is covered by a script.**
  `dispatch.mjs` names the pick from the plan's tier, and from `--tier Large` for team
  members and probes, which the workflow names. **Choosing the tier is not covered.**
  `planning.md`, delivered when the plan is written, says to decide the tier by "how much
  judgment … executing it" needs. It neither carries the five definitions nor points at
  them. For a plan, the script prints `(no row for this tier)` for a name outside the
  five instead of refusing it, although the same script refuses one passed with `--tier`
  (`isTier`). **Gap 2.**
- **`doc-architecture.md`** — adding a document, or writing prose that describes the
  current state. **Not covered.** It is reached through the entry file's load map ("Before
  adding a document…"), a link the agent must choose to follow. No shipped area rule
  covers the folders where a project keeps its documents. `capture-at-write.sh` fires only
  on `DECISIONS.md`, the rules and the framework folder. The workflow's doc-closeout table
  says which artifact to update. It does not carry the rule that decides how such an
  artifact may be written. **Gap 3.**
- **`rule-delivery.md`** — adding or changing a rule, its area, or the tool that delivers
  it. **Covered by a rule by path and a hook.** Writing under `.claude/rules/` or
  `.claude/rule-additions/` loads `learnings.md`. That rule carries the mechanics: the
  `paths:` header, `.claude/rule-areas.json`, the additions file, running
  `npm --prefix .tropis run rules`. The write itself fires `capture-at-write.sh`, and
  committing it fires `framework-commit-check.sh`. The document's remaining content is the
  measured evidence per tool. It is a reference, consulted when delivery itself is in
  question.
- **`DECISIONS.md`** (the framework's) — proposing a change to how the framework works.
  **A reference, linked by design.** Its action is a decision the agent is about to
  propose, and that touches no file before it is made. So no path or hook can mark it.
  The load map in `AGENTS.md` names it with its moment (FW-002, the entry file stays
  thin), and writing a decision fires `capture-at-write.sh`. Delivering 2,200 lines of
  history at every session would cost more context than the occasional missed
  consultation does. No gap.

## The delivery map

`instruction-files-have-a-delivery-map` asked for one row per instruction file, with a
delivery value per tool, and a check that every file has a row. The finding shows that
delivery is decided by **a handful of channels, by category, not by file**:

- the entry file and what it imports;
- area rules, written for both tools by one generator from one source;
- hooks, from one settings file both tools read;
- commands, from one folder;
- and everything else, by link.

A map of thirty-odd rows would repeat those five facts per file. Each tool update would
make it drift, and it would add nothing a reader cannot see from the folder a file sits
in.

What can actually go wrong between the tools is narrower, and parts of it are already
guarded:

- An area rule with no Cursor copy fails `npm --prefix .tropis run rules -- --check`
  today.
- A document Claude Code loads at start that Cursor does not fails nothing. That is the
  workflow case.

So **a lighter guard is enough**: every document the entry file imports, which Claude
Code therefore loads at start, has an always-applied projection for Cursor written by the
same generator. That guard is `framework-reaches-every-tool`'s third criterion, narrowed.
**The map is not needed**, and the backlog item is dropped.

## Recommendations

- **`framework-reaches-every-tool` — re-shape to the workflow alone.**
  - Its first criterion already holds, so remove it.
  - Keep the second, made specific: the generator writes the workflow as an
    always-applied Cursor rule. Do not rely on the fallback line. A delivery that
    depends on the agent choosing to follow an instruction is the failure
    `rule-delivery.md`'s first requirement names ("A rule that depends on someone
    remembering is not delivered"). Projecting the workflow costs Cursor the context
    Claude Code already spends on it.
  - Narrow the third to the lighter guard above.
  - Add that a run in Cursor confirms the workflow is in context before any tool call.
    That needs the developer's machine, through `/manual-check`.
- **`plan-tier-is-chosen-against-the-tiers`** (new idea, gap 2). `/dispatch` refuses a
  plan whose tier is not one of the five and prints the five definitions. `planning.md`'s
  tier clause points at `model-tiers.md`.
- **`document-rule-reaches-a-new-document`** (new idea, gap 3). Writing a document in a
  project's documentation folders delivers the rule that a document states timeless
  rules or is generated and guarded. That could be a shipped area rule whose area the
  project names in `.claude/rule-areas.json`, like every other shipped rule.
- **`commands-reach-cursor`** (new idea, the open question). Measure in Cursor, IDE and
  command line, whether the commands in `.claude/commands/` are offered. If they are
  not, write them where Cursor reads commands, from the same source.
- **`instruction-files-have-a-delivery-map`** — dropped (*The delivery map*).

## What this finding did not check

- No Cursor run. Cursor is not installed in this session, and cursor.com was outside its
  network. Every Cursor value is earlier evidence or marked unchecked.
- No command was invoked in the probe, so "when run" rests on the tool's documented
  behaviour.
- One Claude Code version, on one operating system.
