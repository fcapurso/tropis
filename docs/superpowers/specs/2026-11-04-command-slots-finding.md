# Can commands be extended through fixed slots and still update mechanically — finding

**Backlog item:** `command-slots-spike` (spike). **Date:** 2026-11-04.
**Design:** `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`.

## The answer

Yes. A fixed procedure with named slots holds every customisation a real project made to a
shipped command that is the project's own to make: 23 of the 40 changes found, and a
24th already lives in a data file a script reads. Two of the 23 are transitional (A1,
A3). Of the other 16, 8 were stale copies, 5 were fixes the framework has since taken,
and 3 changed the procedure itself. All 3 of those had a better home outside the
command. An
update can carry slots by name across versions without a hand merge. The prototype took
`first-adopter`'s release command from v0.5.2 to v0.8.1 and carried every fill-in. It
listed the one slot that went away, the one that was renamed and the two whose purpose
changed. Seven new headings came through, three of them replacing headings that went. A
fresh agent following the
slotted command did what `first-adopter`'s own command makes it do (*The fresh agent*).

What slots add over today is not room. Today's one free-text block per command already
holds everything. They add **names an update can reason about**:

- **A changed meaning gets listed.** Today a block is carried as one lump. v0.8.1 renamed
  two of `/release`'s fields and added two more. The update carried `first-adopter`'s
  block silently, still under the old names. The command itself has to tell the agent, at
  run time, to read the old names as the new ones and to ask about any missing field. Even
  that misses: the note names the old field "Trigger", and `first-adopter` called it
  "Release trigger".
- **A change in the number of blocks is not a hand merge.** Today, when a release adds or
  removes a block, the update writes the whole command beside the project's as `.new`
  and leaves the merge to a person (`scripts/take-version.mjs`, "project-owned blocks
  differ in number"). Carrying by name has no count to mismatch.
- **Behaviour sits at the point it changes.** Today's block sits at the top of the
  command, so a project that changes what happens at one stage has to name the stage.
  This repository's own `/release` block names Stages 1, 1b, 2, 3 and 5. A slot placed
  at the point needs no stage number, so renumbering cannot break it.

**A fixed procedure does not limit the adopters we have.** The three procedure changes
were: a backlog report the project wanted shaped differently, which belongs to the
report's script; a guard that the shipped report made moot; and a command removed by a
project it does not apply to, which the update already keeps removed. None needed the
command's text to change. An escape hatch should stay all the same: a project that edits
outside the slots forks the command, and the update writes `.new` as it does today.

**Recommendation:** build it, under the name *fill-ins* rather than *slots*. "Slot"
already means the staging slot of `pipeline.mjs`, and `/release` uses both. Give the
six commands that have a block today named fill-ins at the points the evidence found,
and leave the other nine with none. One backlog item follows (*Recommendations*).

## The evidence

What a project changed is measured against the release it installed, never against the
current source. Each project's `.tropis/installed.json` records the release and the
fingerprint of each shipped file. `fingerprint()` in `scripts/installed-files.js` hashes
a file without its project-owned blocks, so a matching fingerprint means nothing changed
outside them.

| Source | Installed | Commands compared | Changed outside a block | Blocks filled |
|---|---|---|---|---|
| `first-adopter`, today | v0.5.2 | 14 shipped | 0 | 5: feature, idea, manual-check, refresh-board, release |
| this repository's installed copy, today | v0.8.1 | 15 shipped | 0; `flush-upstream.md` deleted | 3 differ from the shipped default: idea, manual-check, release; feature, next and refresh-board carry it |
| `first-adopter`, before it took Tropis | its own copies, from `first-adopter-harness` | 12 | the whole file: they were copies | — |
| `embryo-project` | never took Tropis | 9 forerunners | n/a | n/a |

The comparison was run with the installed `fingerprint()` and `blocks()` on each project's
`.claude/commands/`, against `git show <tag>:commands/<name>.md` in this repository. All
29 baseline fingerprints matched the tag's text, so the baselines are the right ones.

The changes `first-adopter` made before taking Tropis come from three sources: its triage
ledger, which labelled every framework item against Tropis v0.3.1 and v0.4.1 on
2026-10-17 and 2026-10-22; the commit where it took v0.4.1 (`first-adopter@379760e`); and
the harness commits that ledger cites. Each row below names its source. Nothing in this
finding quotes either project's text: each change is described here in this
repository's words.

`embryo-project` is where Tropis's commands were first written, before Tropis existed.
Its nine commands are forerunners, not an adopter's changes to shipped commands. So they
are not counted. They show where two of the counted changes came from (*Where the
changes came from*).

## Every change, classified

Five classes, from the backlog item:

- **value** — data the procedure uses: a path, a command, a list, a name.
- **behaviour at a point** — something extra the project does at one point in the
  procedure.
- **procedure** — a change to the steps themselves.
- **fix** — something every project would want, which the framework should take.
- **stale** — a copy left behind by a later change upstream.

A row's diff is either `<tag>:commands/<name>.md` against the project's file today, or the
commit named.

### `first-adopter`

| # | Command | Change | Class | Diff |
|---|---|---|---|---|
| A1 | feature | Before shipping, rebuild a document the project generates from its backlog and commit it with the backlog item | behaviour at a point; transitional, since the backlog board replaces such documents (FW-043) | v0.5.2 against today, block |
| A2 | feature | Before shipping, run the project's second suite of process checks as well as Tropis's | value | v0.5.2 against today, block |
| A3 | idea | Rebuild that generated document and commit it with the backlog | behaviour at a point; transitional, as A1 | v0.5.2 against today, block |
| A4 | idea | Run three suites, not one, before committing | value | v0.5.2 against today, block |
| A5 | manual-check | The project's two kinds of check, what triggers each, and where its procedure is | value | v0.5.2 against today, block |
| A6 | refresh-board | Publish the built page to the board's hosted address before committing | behaviour at a point | v0.5.2 against today, block |
| A7 | release | Where it runs from | value | v0.5.2 against today, block |
| A8 | release | The notes file and its placeholder | value | same |
| A9 | release | Who reads the notes | value | same |
| A10 | release | What forces a major version: a change to what the product is permitted to access | value | same |
| A11 | release | What the notes say when that happens: who must approve the update and where, what never to tell a customer, and leaving the line out of a first release | behaviour at a point | same |
| A12 | release | The version a first release takes | value | same |
| A13 | release | What its pipeline publishes: the notes without the check line, plus a document of its own | behaviour at a point | same |
| A14 | release | The candidate trigger, and where the candidate runs | value | same |
| A15 | release | The release trigger | value | same |
| A16 | release | "Print the trigger, never run it; the developer runs it" | stale: restates the shipped Stage 6 | same |
| A17 | release | Where the runs are watched | value | same |
| A18 | refresh-model-tiers | Which tools and model lists count, and writing the picks to a project file rather than the shipped tier document | fix, taken: picks now live in `docs/model-picks.md` | ledger; `first-adopter-harness@d1ca1ca` |
| A19 | capture-learning | Branch 6 opens with the scope its own test implies: the shell, git, the hook contract | fix, taken | ledger; `first-adopter-harness@9a31fa5` |
| A20 | feature | How to shelve and un-shelve a backlog item | fix, taken in v0.4.1 | ledger; `first-adopter@d0ec7c2` |
| A21 | next | A report in two streams, with a flush suggestion and a framework section | procedure: belongs to the report script, queued there | ledger; `first-adopter-harness@53f969c`, `@590b379` |
| A22 | next | "Do not start /dispatch or anything else from here" | procedure: moot once the shipped report suggested nothing to run | ledger |
| A23 | flush-upstream | The retired route to the framework | stale | ledger |
| A24 | dispatch | The old framework folder's path | stale | ledger; `first-adopter@a1e0003` |
| A25 | idea | Long type and layer lists, including a retired layer, and a paragraph the backlog rule now holds | stale | ledger |
| A26 | release, manual-check | The wording of the two-checkout layout | stale | ledger; `first-adopter@a1e0003` |
| A27 | capture-learning | An old address, a size cap Tropis rejected, "commit `.claude/` separately" | stale | ledger |
| A28 | dispatch | In a cloud session, attach every other repository the plan's Repositories table names before isolating, kept in its own `AGENTS.md` | fix, taken after v0.5.2: the prompt `/dispatch` prints says it since `4060054` (`scripts/plan-binding.js`) | its `AGENTS.md` |
| A29 | dispatch | The worktree setup commands `/dispatch` prints | value, already a data file (`.claude/worktree-setup.txt`) | `first-adopter@379760e` |

### This repository's installed copy

| # | Command | Change | Class | Diff |
|---|---|---|---|---|
| T1 | flush-upstream | Deleted: the upstream has nothing to flush | procedure: the command does not apply here | `19b8fcc` body; the update keeps it removed |
| T2 | idea | The block still says "catalog" and "entry", the words from before the rename to "backlog" and "backlog item" | stale | v0.8.1 against today, block |
| T3 | manual-check | One kind, *Setup*, with its procedure | value | same |
| T4 | release | Where it runs from | value | same |
| T5 | release | At Stage 5, work out the version and promote the notes before committing, so the release job only tags | stale: a behaviour at Stage 5 that v0.8.1's promotion pull request replaced | same |
| T6 | release | Where the main branch is gated, Stages 1b and 5 commit through a pull request | fix, taken: v0.8.1's Stage 5 says it; now stale | same |
| T7 | release | Before Stage 1, run `/rule-trial`; name a removed clause in the notes | behaviour at a point | same |
| T8 | release | Who reads the notes | value | same |
| T9 | release | What breaking means, and how a bump maps before 1.0 | value | same |
| T10 | release | The trigger, under the field name from before v0.8.1, with which commit to give it | value; its field was renamed in v0.8.1 | same |
| T11 | release | Where the runs are watched | value | same |

Its two own commands, `/absorb-flush` and `/rule-trial`, are not changes to a shipped
command, and are not counted. A project adding a command is already free to do so.

### The count

| Class | `first-adopter` | this repository | Total | Held by a fill-in |
|---|---|---|---|---|
| value | 12 | 6 | 18 | 17. A29 is held by its data file, as today. |
| behaviour at a point | 5 | 1 | 6 | 6, two of them transitional (A1, A3) |
| procedure | 2 | 1 | 3 | 0, and none needs one (*Does a fixed procedure limit adopters*) |
| fix | 4 | 1 | 5 | 0. All five are taken. |
| stale | 6 | 2 | 8 | 0. Nothing to hold. |
| **Total** | **29** | **11** | **40** | **23**, and A29 by its file |

Today's single block also holds all 23, as free text. The difference is what an update
can do with them (*The answer*). Four stale rows (A16, T2, T5, and T6, a fix whose text
is now stale) sit inside a block
today, where nothing will ever point at them. A fill-in whose purpose changes gets
listed, but text that goes stale under an unchanged purpose does not. Neither design
catches T2: it needs a person reading.

### Where the changes came from

`embryo-project`'s forerunners show the origin of two counted changes:

- **Its release command read named values from files.** It took its trigger, its
  workflow's name and what counts as breaking from a platform file and from a section of
  the project's entry file, merged in that order. That is the value fill-in, a year
  early. Tropis then moved the values into a block of the command itself.
- **Its release command ran the trigger itself.** Tropis reversed that: an agent never
  runs a trigger. A16 is the lesson repeated in `first-adopter`'s own words, after the
  shipped text already said it.

Its other commands map onto Tropis's as forerunners: its epic start and close onto the
workflow, `/dispatch` and the merge sequence; its test plan onto `/manual-check`; its
release setup onto `/bootstrap`'s pipeline stage; its backlog, idea, scope and
capture-learning commands onto the same names. None of them is an adopter's change.

## The proposed procedure and fill-ins, per command

The rule used: a command gets a fill-in only where a real project put something, at the
point the evidence puts it. Values a script reads stay in the data files they are in
today. Where a value is only for the agent to read, it is a fill-in.

| Command | Fixed procedure | Fill-ins, and what each is for | Real changes held |
|---|---|---|---|
| bootstrap | all of it | none: it runs once, and no project changed it | 0 |
| capture-learning | all of it | none: the destinations come from the project's own files (`AGENTS.md`, the rule areas) | 0; A19 taken, A27 stale |
| dispatch | all of it | none: the picks and setup commands are data files the script reads | A29, by its file; A28 taken |
| feature | the transitions and the shipping refusal | `ship-requires`: what else must hold before an item ships, beyond the shipped default (the verification log, the project's checks) · `before-ship-commit`: what to rebuild and commit with the promotion, transitional (A1) | A1, A2 |
| flush-upstream | all of it | none: a project it does not apply to deletes it | T1, by deletion |
| idea | steps 1 to 6 | `checks`: the commands that check a new backlog item · `before-commit`: what to rebuild and commit with it, transitional (A3) | A3, A4 |
| manual-check | steps 2 to 6 | `kinds`: each kind of check, what in a change triggers it, and where its procedure is | A5, T3 |
| next | the report and what to say about it | `report-command`: the command that prints the report | 0; the shipped default is the only use |
| refresh-board | steps 1 to 3 and 5 | `publish`: a step after the build and before the commit that puts the page somewhere | A6 |
| refresh-model-tiers | all of it | none: picks and subscriptions are data files | 0; A18 taken |
| refresh-readme | all of it | none: the level is `docs/readme/readme.yaml` | 0 |
| release | every stage and step | values: `run-from`, `notes-file`, `readers`, `breaking`, `version-files`, `first-release`, `promote-trigger`, `staging-trigger`, `staging-workflow`, `runs-url` · behaviour: `before-preflight` (top of Stage 1), `breaking-notes` (Stage 3's by-hand section), `notes-also` (end of Stage 3), `published` (Step 2) | A7–A15, A17, T4, T7–T11 |
| scope | all of it | none | 0 |
| sprint | all of it | none | 0 |
| update | all of it | none. It is the command that moves fill-ins, so it is the last that should have any. | 0 |

Nine commands need none. The six that get fill-ins are exactly the six with a block
today; `/next`'s holds only the shipped default, but it is a value a project may need
to change.

**The two transitional fill-ins.** `before-ship-commit` and `idea`'s `before-commit` rest
only on A1 and A3: rebuilding a document the project generates from its backlog. FW-043
retires such documents in favour of the backlog board, and the backlog rule tells a
project to replace its own through a backlog item. Build them only if another project
needs them; otherwise `ship-requires` and `checks` are enough.

**A behaviour slot the evidence no longer supports.** The prototype also carried a
`before-notes-commit` slot in Stage 5, from T5. T5 is stale since v0.8.1, so it is not
proposed. It stayed empty in the run and changed nothing there.

## The prototype

Throwaway, not committed as code. It ran in this session's scratch folder, on Node
v22.23.4, Linux x86_64. *Appendix: the prototype* shows the carrying logic as run. Its
inputs were throwaway files, described below, and are not committed.

**The fill-in format it used.** A slot is two comment lines with the fill-in between them:

```
<!-- slot NAME[ (was OLD)]: PURPOSE -->
…the project's fill-in…
<!-- end slot -->
```

`(was OLD)` lets a new version rename a slot and still find the fill-in.

**The inputs.**

1. The v0.5.2 and v0.8.1 `/release` texts, rewritten into skeletons. A script replaced
   each version's block with the value slots it lists, then put the five behaviour slots
   after fixed anchors. Outside the slots, the text is the shipped text. Between the two
   versions, three things changed: `candidate-trigger` became `staging-trigger (was
   candidate-trigger)`, with a new purpose; `release-trigger` went; and `version-files`,
   `promote-trigger` and `staging-workflow` were added. v0.8.1 itself treated the old
   trigger as renamed to the promote trigger. The skeleton models it as a removal on
   purpose: the old trigger took a bump, and the promote trigger takes commits, so a
   fill-in for the one is no answer for the other. Modelled as a rename with a new
   purpose, it would have been listed as `renamed` and `purpose changed`, as
   `staging-trigger` was.
   `published` moved from Stage 6 to Step 2, with "promote" added to its purpose.
2. `first-adopter`'s own `/release` as v0.5.2 plus its block. Its 21 block lines were put
   into the v0.5.2 skeleton's slots by name: 20 lines into 10 slots. One sentence was
   left out because it restates the shipped Stage 6 (A16).

**The run** (`node take-slots.mjs skeleton-v0.5.2.md skeleton-v0.8.1.md
fa-slotted-v0.5.2.md fa-slotted-v0.8.1.md`, exit 0):

```
carried       run-from
carried       notes-file
carried       readers
carried       breaking
new           version-files: empty — each file that carries the version, and where in it
new           promote-trigger: empty — the command that starts the project's promote pipeline, with <commit> and, where the project deploys to staging, <staged>
renamed       candidate-trigger -> staging-trigger: fill-in carried
purpose changed staging-trigger
                was: where a candidate is rehearsed, the command that starts it, with <commit>
                now: where the project deploys to staging, the command that starts it, with <commit>
                check that your fill-in still answers it
new           staging-workflow: empty — the file name of the staging workflow
carried       runs-url
carried       first-release
carried       breaking-notes
carried       published
purpose changed published
                was: what this project's pipeline publishes besides the notes
                now: what this project's promote pipeline publishes besides the notes
                check that your fill-in still answers it
removed       release-trigger: the new version has no such slot; its 2 line(s) are in fa-slotted-v0.8.1.md.removed
stage added   The merge token
stage added   Stage 5 — Commit the notes
stage added   Step 1 — Deploy to staging
stage added   Stage 6 — The check on staging
stage added   Resume at staging
stage added   Stage 7 — The promotion pull request
stage added   Step 2 — Promote to production
stage gone    Stage 5 — Commit the notes, nothing else
stage gone    Stage 6 — Print the next trigger. Do not run it.
stage gone    Stage 7 — After the candidate

result: 13 sections, the same as the new version; skeleton outside slots identical to the new version's
```

Each of the four things the criterion asks for is shown: fill-ins carried by name (eight
carried, one through a rename); a removed slot listed, with its fill-in kept aside rather
than lost; two slots whose purpose changed listed, old and new side by side; and seven
new headings, three of them replacing headings that went, all of which survive because
the skeleton is replaced whole.

**A fork is still caught.** Changing one word outside the slots (the first sentence of
Stage 3) made the same run print
`FORKED: the project changed the command outside its slots; the new version is written
beside it as .new`, exit 2, and write only the `.new` file.

**Today's update on the same move**, using the installed `fingerprint()` and
`carryBlocks()`:

```
outside the block, project equals v0.5.2: true
block count mismatch: false — the update writes the result in place and reports it as replaced
result still says "Release trigger": true | has a Promote trigger line: false | has Version files: false
```

So today the move succeeds silently with stale field names and two fields missing. The
shipped command makes up for that at run time, in the agent's instructions.

**What the run taught about the design:**

- **A purpose is a contract, so it should change only when the meaning does.** The
  `published` slot was listed because one word, "promote", was added to its purpose. A
  real build should list a fill-in only when its purpose's wording changes, and authors
  should treat that wording as an API.
- **An empty new slot needs a default.** `version-files` and `staging-workflow` came
  through empty. The shipped text should say what the command does when a fill-in is
  empty: ask, as v0.8.1 already does, or do the shipped default.
- **A removed fill-in must not be lost.** The prototype wrote it to `.removed`. The real
  update should print it in the take's report, as the `.new` files are today.

## The fresh agent

Run by Claude Code 2.1.318, `claude -p --output-format stream-json --verbose`, model
`claude-opus-5-5`, on Linux x86_64. That is the pick `node .tropis/scripts/dispatch.mjs
--tier Large` names. The session was signed in through the cloud session's own account,
with no API key in the environment.

**The setup.** Two copies of `first-adopter`, identical but for one file. `own` keeps its
`/release` (v0.5.2 plus its block). `slotted` has the same command rewritten into the
v0.5.2 skeleton's slots, the file the prototype started from. Each copy pushes only to a
local bare repository. One commit was planted on top, the same in both, adding a
permission the product asks for. That is the project's own reason for a major
version, so the run would reach the `breaking` and `breaking-notes` fill-ins. `gh` was
replaced by a stub that only logs calls. The probes could use only reading tools and
read-only git commands.

**The stated task**, given to both word for word: run `/release` as far as Stage 6, as
the command says, with the developer's answers given in advance. At Stage 5, say what
would be written and committed rather than doing it. Then print what Stage 6 prints.

**What each did**, from the tool calls and the final reply:

| | `own` | `slotted` |
|---|---|---|
| Pre-flight, the candidate check | passed; candidate `filled` | passed; candidate `filled` |
| The README stage | skipped, level `manual` | skipped, level `manual` |
| Bump | major, because of the planted permission | major, because of the planted permission |
| The by-hand section | one step: who must approve the update, and where, in the product's own terms | the same step, in other words |
| Readers named in the notes' voice | the project's readers | the project's readers |
| Notes end with | the candidate's check line, `(after the candidate)` | the same |
| Stage 6 printed | the candidate trigger with the full hash, where the candidate runs, the runs address, and the three next steps | the same four things |
| Ran a trigger | no (`gh` log: one `gh pr list` call) | no (`gh` log: one `gh pr list` call) |

Each reply was compared against what the command's fill-ins say, line by line. Every
fill-in that applies to the task shaped both runs the same way: the major bump, the
approval step, never telling a customer to run a tool, the readers, the check line, the
candidate trigger and where it runs, and the runs address. The `first-release`,
`published` and `release-trigger` fill-ins were not exercised: this is not a first
release, and the task stopped before the release itself.

**Both met the same problem the probe itself caused.** The source clone was shallow, so
neither copy could reach the last release tag from `HEAD`, and the command's tag query
answered "no previous tag". Both noticed, refused to treat this as a first release, and
scoped from the last tag by hand. Both also said the planted permission had no feature
behind it, and should be questioned before a real release. That agreement is the
agents', not the command's. It is reported here so it is not mistaken for a difference
between the two commands.

**An earlier run** of the same pair stopped at pre-flight, because the copies were on the
wrong branch and a permission list was misquoted. Both stopped at the same check for the
same reasons. That run is not counted.

## Does a fixed procedure limit adopters

All three procedure changes found, and what a project does instead:

- **A21, the report in two streams.** The report is printed by a script
  (`scripts/next.mjs`). Its shape changes there, upstream, for everyone. The ledger
  queued it there. The command only runs the script.
- **A22, "start nothing from here".** The shipped report suggests no command to run, so
  there is nothing to start. A project that wants the guard anyway can write one
  sentence in its own `AGENTS.md`, where additions to the framework's documents already
  go. The procedure does not change.
- **T1, a command that does not apply.** Delete it. The update records a shipped file the
  project removed and does not bring it back (`scripts/take-version.mjs`, the
  `removedByProject` list). A command can also say when to delete it, as `/release` does.

Three more routes stay open:

1. **A project's own command.** `/absorb-flush` and `/rule-trial` in this repository are
   commands no release ships. Nothing limits that.
2. **A change upstream.** A procedure that is wrong for one project is often wrong for
   everyone. A19 and A20 went that way and are now shipped text.
3. **A fork.** A project may still edit outside the fill-ins. The update then writes the
   new version as `.new` and leaves the merge to a person, which is all it can do for any
   project today. That should stay, as a deliberate and visible cost, rather than be
   forbidden.

`embryo-project` shows the cost of the opposite extreme. With no shared skeleton, its
forerunner commands and Tropis's diverged on how a release works, down to who runs the
trigger. A project on such a copy gets none of the later fixes.

**The balance recommended.** The framework owns the procedure. A project owns named
fill-ins at the points where real projects needed them, and values a script reads stay in
data files. A project that needs a different procedure first proposes it upstream, writes
its own command if it is only its own, and forks only as a last resort, knowing each
update will then need a hand merge. That is stable where it matters and leaves every
change found a home. It is the line FW-017 drew for `/refresh-board`'s publish step: keep
the procedure shared, and make the part that differs a named hole.

## Recommendations

1. **`commands-have-named-fill-ins`** (new, idea). The six commands with a block today
   get named fill-ins at the points this finding lists. `/update` carries them by name,
   lists a fill-in that is new, renamed, re-purposed or removed, keeps a removed one's
   text in its report, and writes `.new` only for a change outside the fill-ins. A
   project's existing blocks are moved into the named fill-ins once, by the take that
   introduces them, with anything it cannot place listed. The criteria should include
   the prototype's four cases, on the real `/release` and the real update.

Nothing else from the classification needs work: the five fixes the framework took are
shipped, and the stale rows go when each project next takes a release or re-reads its
block. T2, this repository's own stale wording, is the one an agent working on `/idea`
would correct on the spot, so it gets no backlog item (`.claude/rules/catalogs.md`, *What
does not become a backlog item*).

## Appendix: the prototype

`take-slots.mjs`, as run:

```js
// Throwaway prototype for command-slots-spike: take a new version of a slotted command.
// A slot is `<!-- slot NAME[ (was OLD[, OLD])]: PURPOSE -->` … `<!-- end slot -->`.
import { readFileSync, writeFileSync } from 'node:fs';
const [oldPath, newPath, projectPath, outPath] = process.argv.slice(2);
const OPEN = /^<!-- slot ([a-z0-9-]+)(?: \(was ([a-z0-9, -]+)\))?: (.*) -->$/;
function parse(text) {
  const skeleton = []; const slots = new Map(); let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(OPEN);
    if (m) { cur = { name: m[1], was: m[2] ? m[2].split(',').map((s) => s.trim()) : [], purpose: m[3], body: [] }; slots.set(cur.name, cur); skeleton.push(line); continue; }
    if (line === '<!-- end slot -->') { cur = null; skeleton.push(line); continue; }
    if (cur) cur.body.push(line); else skeleton.push(line);
  }
  return { skeleton: skeleton.join('\n'), slots };
}
const old = parse(readFileSync(oldPath, 'utf8'));
const next = parse(readFileSync(newPath, 'utf8'));
const proj = parse(readFileSync(projectPath, 'utf8'));
const report = [];
if (proj.skeleton !== old.skeleton) {
  writeFileSync(`${outPath}.new`, readFileSync(newPath, 'utf8'));
  console.log('FORKED: the project changed the command outside its slots; the new version is written beside it as .new');
  process.exit(2);
}
const consumed = new Set(); const out = [];
const headings = (t) => t.split('\n').filter((l) => l.startsWith('## '));
for (const line of readFileSync(newPath, 'utf8').split('\n')) {
  const m = line.match(OPEN);
  if (m && next.slots.has(m[1])) {
    out.push(line);
    const slot = next.slots.get(m[1]);
    const from = [slot.name, ...slot.was].find((n) => proj.slots.has(n) && proj.slots.get(n).body.length);
    if (from) {
      consumed.add(from);
      out.push(...proj.slots.get(from).body);
      const was = old.slots.get(from)?.purpose;
      if (from !== slot.name) report.push(`renamed       ${from} -> ${slot.name}: fill-in carried`);
      else report.push(`carried       ${slot.name}`);
      if (was !== undefined && was !== slot.purpose) report.push(`purpose changed ${slot.name}\n                was: ${was}\n                now: ${slot.purpose}\n                check that your fill-in still answers it`);
    } else if (!old.slots.has(slot.name) && !slot.was.some((n) => old.slots.has(n))) {
      report.push(`new           ${slot.name}: empty — ${slot.purpose}`);
    }
    continue;
  }
  if (line === '<!-- end slot -->' || !next.slots.size) { out.push(line); continue; }
  // skip shipped default bodies of slots: the new file's own slot bodies are empty in a skeleton
  out.push(line);
}
const removed = [...proj.slots.values()].filter((s) => s.body.length && !consumed.has(s.name));
for (const s of removed) report.push(`removed       ${s.name}: the new version has no such slot; its ${s.body.length} line(s) are in ${outPath}.removed`);
if (removed.length) writeFileSync(`${outPath}.removed`, removed.map((s) => `<!-- ${s.name}: ${s.purpose} -->\n${s.body.join('\n')}`).join('\n\n') + '\n');
writeFileSync(outPath, out.join('\n'));
const oh = headings(old.skeleton), nh = headings(next.skeleton), rh = headings(out.join('\n'));
for (const h of nh.filter((h) => !oh.includes(h))) report.push(`stage added   ${h.slice(3)}`);
for (const h of oh.filter((h) => !nh.includes(h))) report.push(`stage gone    ${h.slice(3)}`);
console.log(report.join('\n'));
console.log(`\nresult: ${rh.length} sections, ${JSON.stringify(rh) === JSON.stringify(nh) ? 'the same as the new version' : 'DIFFERENT from the new version'}; skeleton outside slots ${parse(out.join('\n')).skeleton === next.skeleton ? 'identical to' : 'DIFFERS from'} the new version's`);
```
