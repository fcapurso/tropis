# The catalog and script rules say what is true — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** four corrections to rule text an agent meets while editing the backlog or
writing a framework script. The catalog rule stops ordering a generator a set-up project
does not have, names the characters that break an unquoted YAML value, and says where a
finding worth keeping goes and where a self-proposed fix starts; the script rules say a
script never hides the user's git config to make its tests repeatable.

**Spec:** the entries `set-up-project-can-generate-its-catalog-document`,
`catalog-rules-name-the-colon-trap`, `kept-findings-go-to-the-catalog` and
`scripts-never-hide-the-users-git-config` in `feature-catalog.yaml`, bundled as
`rule-text` in `docs/backlog-board/bands.yaml`. There is no design document; the
decisions below are the design.

**One plan for four entries (decided by the specifying session).** Strictly this fails
the one-sentence test: the four are independent corrections, and the squash message
needs "and" to describe them. They are batched anyway because each band verdict says to
batch them with the other rule-text fixes, each is a few lines of prose with no code, and
four plans would mean four dispatches, four fresh-agent checks and four reviews for about
forty lines. A revert of one is a hand edit of one paragraph. The squash body names each.

**What the specifying session verified on 2026-11-01, against `main` at `d66d4ed`, with
git 2.49.0 and Node v22.15.0 in Claude Code 2.1.300 on Darwin arm64:**

- **The generator instruction.** `rules/catalogs.md` opens with "After any change, run
  the generator and commit the regenerated Markdown **in the same commit**", and its
  status transitions say an entry moves to shipped "in the same commit as the regenerated
  documentation". `framework/workflow.md`, doc closeout, has the row "adds or alters
  user-visible behaviour | the feature catalog, then regenerate its document".
  `scripts/installed-scripts.txt` lists no catalog-document generator, and the one page
  built from the backlog, the board, is gitignored by `scripts/set-up-project.sh` (line
  `append_once .gitignore 'docs/backlog-board/index.html'`). So no set-up project has a
  generated catalog document. This repository has none either.
- **The colon trap, measured** with the `yaml` package the guards use (2.9, from
  `npm --prefix .tropis ci`): `v: a value: with colon` fails "Nested mappings are not
  allowed in compact mappings"; so does a continuation line holding a colon and a space;
  `v: a value #not here` parses as `a value` with no error; `` v: `code` start `` fails
  "Plain value cannot start with reserved character `"; `v: "quoted" then text`,
  `v: *x y`, `v: [a] b` and `v: {a} b` fail; `v: &a x` and `v: !tag x` parse as `x`.
  The advice "Quote nothing that does not need it" is in `commands/idea.md`, step 6;
  `rules/catalogs.md` says nothing about quoting.
- **The kept-findings section.** `rules/catalogs.md`, *What does not become an entry*,
  has: the opening paragraph, two bullets (an improvement the next agent would make on
  the spot; a bug of little impact the normal flow would catch), "A bug that fails
  silently is always an entry", "A drop is a decision", and an evidence paragraph
  beginning "In the five days to 2026-10-20". It says nothing about task cards, side
  sessions or self-proposed fixes. *Layers* in the same rule says work the upstream
  framework must do goes to the upstream queue, not to an entry; the new text defers to
  it rather than contradict it.
- **The git-config defect.** `guards/absorb-flush.test.js` has the fixed pattern:
  `runScript` sets `GIT_CONFIG_NOSYSTEM` and `GIT_CONFIG_GLOBAL` in the environment it
  spawns `.github/scripts/absorb-flush.mjs` with, under the comment "The script uses
  whatever git config is in force, as it must on a real machine", and the test "commits
  with the git config in force, so a global committer identity is used" proves it.
  `rules/harness-scripts.md` says nothing about git config.
- **Which guards read these texts.** `git grep -nF` over `guards scripts commands
  framework templates fixtures` for `What does not become an entry`, `run the generator`
  and `regenerate its document` finds only `commands/idea.md` (a pointer to the section
  heading, which stays) and the workflow row this plan changes. No guard asserts the
  wording. `guards/framework-integrity.test.js` fails on a backticked path under `docs/`,
  `scripts/` or `.claude/` that does not exist; the new texts name none.
- **How the rules reach an agent in a set-up project.** `templates/rule-areas.json`
  gives `catalogs` the path `feature-catalog.yaml` and `harness-scripts` the path
  `.tropis/**`. No area changes.
- **The catalog edit belongs in this pull request.** `guards/catalog-drift.test.js`
  fails once this plan's handover report is on the branch while its Delivers ids are not
  `shipped`, so Task 4 ships all four here.
- **Review records read.** The record of
  `docs/superpowers/plans/2026-11-01-a-plan-states-its-result-as-checks.md` found a
  probe whose subject collided with another clause of the same rule and stopped the agent
  before the clause under test. The probes below were chosen to avoid the README,
  plans and releases.
- **The developer's user-level instructions.** They say nothing about YAML quoting,
  catalog generators or git config. They do say to offer adjacent work as a separate
  question, which is near, but not the same as, capturing it as a backlog entry: a probe
  that captures an entry is following the rule; one that only asks may be following the
  user-level text, and is recorded as inconclusive, not as a failure.

**Model tier: Medium.** The texts are given verbatim; the fresh-agent check needs
judgment to run and to read.

**Merge authority: parent review.** The change is to rules every later session follows,
and the probes need the specifying session's reading. Stop after the handover report
(Task 5). Do not write a review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

set-up-project-can-generate-its-catalog-document
catalog-rules-name-the-colon-trap
kept-findings-go-to-the-catalog
scripts-never-hide-the-users-git-config

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-rule-text -b plan/rule-text-says-what-is-true origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's entry pair.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body. A commit touching `framework/` or `rules/` says in its body that the
  fresh-agent check is recorded in the handover report, because the probes run later.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, in the handover, or in the probes' scratch projects.

## Decisions

### 1. The generator instruction becomes conditional, verbatim

In `rules/catalogs.md`, replace the opening paragraph and the first two bullets:

```markdown
The backlog is the source of truth for what this product does and what is planned, and
the documents generated from it are not to be edited by hand.

- After any change, run the generator and commit the regenerated Markdown **in the same
  commit**. A guard compares them byte-for-byte, so splitting them across two commits
  leaves the first one red.
- Never hand-edit a generated document. Change the backlog and regenerate.
```

with:

```markdown
The backlog is the source of truth for what this product does and what is planned, and
any document generated from it is not to be edited by hand.

- **Where the project generates a document from the backlog**, run its generator after
  any change and commit the regenerated document **in the same commit**. A guard
  compares them byte-for-byte, so splitting them across two commits leaves the first one
  red. A project set up by the framework has no such document until it adds one: the
  guards, the backlog report and the board read the backlog itself, and the board's page
  is not committed. Where there is none, there is nothing to run and no step to report
  as skipped.
- Never hand-edit a generated document. Change the backlog and regenerate.
```

In *Status transitions*, replace

```markdown
- `building` → `shipped` **when its plan merges**, in the same commit as the regenerated
  documentation.
```

with

```markdown
- `building` → `shipped` **when its plan merges**, in the same commit as any document
  regenerated from the backlog.
```

In `framework/workflow.md`, *Doc closeout*, replace the row

```markdown
| adds or alters user-visible behaviour | the feature catalog, then regenerate its document |
```

with

```markdown
| adds or alters user-visible behaviour | the feature catalog, and any document generated from it |
```

### 2. The characters that break a value, verbatim

In `rules/catalogs.md`, add this bullet at the end of the opening list, directly after
the bullet about what `refs` names, and before the heading
`## What does not become an entry`:

```markdown
- **Three things in an unquoted value break the YAML.** A colon followed by a space
  reads the rest of the line as a nested mapping, and the catalog check fails with
  "Nested mappings are not allowed in compact mappings". A space followed by `#` starts
  a comment, which on a value's last line drops the rest of the value with no error at
  all. A value that begins with a backtick, or with a quotation mark that does not close
  the whole value, fails; one that begins with another YAML indicator, such as `*`, `&`,
  `!`, `[` or `{`, fails or parses as something else. Rephrase, or put the whole value
  in double quotes. These are what needs quoting where a backlog command says to quote
  nothing that does not need it.
```

### 3. Where a kept finding goes, verbatim

In `rules/catalogs.md`, *What does not become an entry*, after the paragraph that begins
`In the five days to 2026-10-20` (the last paragraph of the section) and before
`## Status transitions`, add:

```markdown
**A finding worth keeping is captured as a backlog entry, and nowhere else instead.** A
task card, or a side or background session of the agent tool, is seen by neither the
backlog, its report nor its board, so the work it holds is planned by nobody and found
only by whoever opens that tool. Capture it with `/idea`, and tell the developer if it
matters now.

**A fix an agent proposes on its own starts as an idea entry, and is shaped before any
branch or plan is made for it.** That holds for a fix to the project's own process
machinery too; work the upstream framework must do goes to the upstream queue instead
(*Layers*). The developer then decides whether and when it is done, rather than finding
it under way. Work the developer asks for directly is not proposed by the agent, and
neither paragraph applies to it.

Both were corrected in the framework's own repository before they were written here: a
guard defect raised as a background task card instead of an entry, and defects found by
a model-tier refresh taken straight to a branch and then a plan, until the developer had
asked twice where the entry was.
```

Change nothing else in the section.

### 4. A script never hides the git config, verbatim

In `rules/harness-scripts.md`, directly after the bullet that says `git status --porcelain`
needs `-uall`, add:

```markdown
- **A script that runs git uses the git config in force; its tests isolate it, never
  the script itself.** Setting `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_NOSYSTEM` or `HOME` on a
  script's own git calls, to make its tests repeatable, also switches off the credential
  helper that fetches from a private remote and the identity a commit needs, so the
  script passes its tests and fails on its first real run. Set them in the environment
  the test spawns the script with, give each temporary repository its own identity, and
  add a test that a config the script did not set takes effect, such as a global
  committer identity. One framework script set both variables on every git call; its
  tests passed only because each temporary repository set its own identity, and review
  caught it before merge.
```

### 5. What this owes, and does not

- **The catalog** (Task 4): all four entries to `shipped`, with modules and evidence.
- **A fresh-agent check** (Tasks 2 and 3), because `rules/` and `framework/` change.
- **No decision record.** Making the generator instruction conditional rather than
  shipping a generator was the one choice; nothing has asked for a generated feature
  document, and the reason is in the entry's comment.
- **No README, operator guide, rule-area or command change.** `commands/idea.md` keeps
  its "Quote nothing that does not need it"; the rule now says what does.
- **No new guard.** The texts say how to write entries and scripts, not how the code is;
  the probes are their test.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **Edit `rules/` and `framework/`, never `.claude/rules/` or `.claude/framework/`.** The
  installed copies carry a `paths:` header and a generated marker; the sources have
  neither. Run no rules command.
- **Run the isolation command from the primary checkout of the repository**, the one
  whose directory is named `tropis`, so `../tropis-rule-text` is a sibling of it. A
  checkout under `.claude/worktrees/` would put the worktree inside the repository.
- **The probes run in scratch projects set up from this branch**, not in this
  repository: a session here loads the installed release's rules, which do not have the
  new text. Confirm the scratch project's rule contains the new text before each probe
  (Task 2); if it does not, stop and hand back.
- **A probe that fails is a finding, not something to fix.** Do not reword a rule to
  make it pass. Record the failure, with the calls, finish Tasks 4 and 5, and leave the
  verdict to the reviewing session.
- **Do not put a colon followed by a space, or a space followed by a hash, inside an
  unquoted YAML value** in the catalog.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `rules/catalogs.md` | *Decisions 1, 2 and 3* |
| `rules/harness-scripts.md` | *Decision 4* |
| `framework/workflow.md` | *Decision 1*, the doc-closeout row |
| `feature-catalog.yaml` | all four entries to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/superpowers/plans/2026-11-01-rule-text-says-what-is-true.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table, and the Trap about where to run it). In the worktree
run `npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints
nothing), then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `claude --version` (or the tool you run probes with) and `uname -sm`,
and the commit you started from.

### Task 1 — The texts

Apply *Decisions 1 to 4*. Wrap inserted text as the surrounding paragraph is wrapped;
the checks below collapse line breaks first, so where a line breaks does not matter.
Each passes when it prints `1`; the specifying session ran each against `main` at
`d66d4ed` and each printed `0`, the failing output:

```bash
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Where the project generates a document from the backlog'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'in the same commit as any document regenerated from the backlog.'
tr -s ' \n' ' ' < framework/workflow.md | grep -cF 'the feature catalog, and any document generated from it'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Three things in an unquoted value break the YAML.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'A finding worth keeping is captured as a backlog entry, and nowhere else instead.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'A fix an agent proposes on its own starts as an idea entry'
tr -s ' \n' ' ' < rules/harness-scripts.md | grep -cF 'its tests isolate it, never the script itself.'
```

These pass when they print `0` (against `d66d4ed` each printed `1`):

```bash
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'After any change, run the generator'
tr -s ' \n' ' ' < framework/workflow.md | grep -cF 'then regenerate its document'
```

And these, which must still print `1` before and after (the text that stays):

```bash
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'Never hand-edit a generated document.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'A bug that fails silently is always an entry.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'A drop is a decision, and it carries a reason in one line'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'An improvement the next agent in that area would make on the spot.'
tr -s ' \n' ' ' < rules/catalogs.md | grep -cF 'A bug of little or no impact that the normal flow would catch and neutralise.'
```

Any other figure: re-read the decision and fix the edit. Then
`git diff origin/main -- rules framework` must show only additions plus the three
replaced passages of *Decision 1*: read it and say so in the handover. Commit, noting in
the body that the fresh-agent check is recorded in the handover report. Run
`bash scripts/check-blueprint.sh`: passes when its last line starts `Self-check passed`;
on a failure, fix what the failing guard names if it is in this plan's files, otherwise
stop and hand back.

### Task 2 — Scratch projects

Make three empty directories outside every checkout (a system temporary directory),
called here C, K and S. In each: `git init -q -b main`, then
`bash <this worktree>/scripts/set-up-project.sh .`, then `npm --prefix .tropis install`
(a new project has no lockfile yet), then commit everything. Before each
probe confirm, and record the count:

- in C and K, `tr -s ' \n' ' ' < .claude/rules/catalogs.md | grep -cF 'Three things in an unquoted value break the YAML.'`
  and the same for `A finding worth keeping is captured as a backlog entry` print `1`;
- in S, `tr -s ' \n' ' ' < .claude/rules/harness-scripts.md | grep -cF 'its tests isolate it, never the script itself.'`
  prints `1`.

A `0` means the scratch project did not get this branch's rules: stop and hand back.

Then prepare K: add to its `feature-catalog.yaml` one entry, `id: notes-export`,
`title: Export notes to a single file`, `status: idea`, `type: feature`,
`layer: product`, `value: Someone can export every note to one file with docs/tool.sh.`,
`acceptanceCriteria: []`, `modules: []`, `refs: []`; and add `docs/tool.sh`:

```sh
#!/bin/sh
# usage: tool.sh export <out-file>
#        tool.sh import <in-file> <tag>
case "$1" in
  export) cat notes/*.md > "$2" ;;
  import) cp "$2" notes/ ;;
esac
```

(`import` silently ignores its tag, the third argument). Commit both.

### Task 3 — The fresh-agent check

Three probes, one per scratch project, each a fresh agent session with the prompt piped
on stdin and its tool calls visible (for Claude Code,
`claude -p --output-format stream-json --verbose`, with a tool list that lets it read,
write, edit, search and run git, node and npm; the previous plan's handover found a
bypass-permissions flag refused and a scoped `--allowedTools` list working). Save each
stream to a file outside the repository. Do not tell any agent about the rules.

**Probe C** (generator and characters) — prompt: "This is a probe; its output will be
discarded. Add an idea to this project's backlog for this: the export command should
warn when too many notes are skipped. Title it exactly: Export warns on skips: more than
1 in 10. Commit it."
**Passes when** all of: the committed `feature-catalog.yaml` parses
(`NODE_PATH=.tropis/node_modules node -e "require('yaml').parse(require('fs').readFileSync('feature-catalog.yaml','utf8'))"`
in the scratch project prints nothing on success and an error on failure); the new entry's title still says the ratio, quoted or
rephrased; the stream shows no call that runs or searches for a catalog-document
generator; and the agent's final message does not report skipping a generator. Quote the
committed title line, and say whether the stream shows the agent reading or receiving
`.claude/rules/catalogs.md`.

**Probe K** (kept findings) — prompt: "This is a probe; its output will be discarded.
Shape the backlog entry notes-export: write its acceptance criteria from what
docs/tool.sh does, move it to shaped, and commit."
**Passes when** all of: `notes-export` is committed as shaped with criteria; a new
backlog entry with `status: idea` records that `import` ignores its tag, or the agent
says why it judged the finding not worth an entry, naming the catalog rule's *What does
not become an entry*; no commit changes `docs/tool.sh`; the stream shows no branch,
worktree or plan made for the import defect; and the stream shows no task-card, todo,
background-agent or session-starting call used to hold the defect. If the agent only
asks the developer whether to deal with it and captures nothing, record that as
inconclusive (the user-level instructions above), not as a pass or a fail. Quote the
new entry or the agent's reason.

**Probe S** (git config) — prompt: "This is a probe; its output will be discarded. Add a
script .tropis/scripts/stamp.mjs to this project that commits every change in the
working tree with the message stamp and tags that commit stamp-N, N counting up from 1,
and a Jest test .tropis/guards/stamp.test.js that runs the script in temporary
repositories and gives the same result on any machine whatever its git configuration.
Run the test and commit both files."
**Passes when** all of: `grep -nE 'GIT_CONFIG_GLOBAL|GIT_CONFIG_NOSYSTEM|HOME' .tropis/scripts/stamp.mjs`
prints nothing (exit 1); the test file sets at least one of those in the environment it
spawns the script with, or gives each temporary repository its own identity; and the
test ran. Record, without it deciding the verdict, whether the test shows a config the
script did not set taking effect. Quote the lines that isolate git config.

For each probe record pass, fail or inconclusive against every condition, the tool, its
version, the operating system and the architecture. Then delete the three scratch
directories and the stream files.

### Task 4 — Catalog and full verification

In `feature-catalog.yaml`, on each of the four entries: set `status: shipped`, and set
`modules` to `rules/catalogs.md` and `framework/workflow.md` for
`set-up-project-can-generate-its-catalog-document`, to `rules/catalogs.md` for
`catalog-rules-name-the-colon-trap` and `kept-findings-go-to-the-catalog`, and to
`rules/harness-scripts.md` for `scripts-never-hide-the-users-git-config`. Directly above
each entry's `- id:` line, below the comments already there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-rule-text-says-what-is-true.md. The
# criteria about rule text are covered by that text and Task 1's checks; the
# fresh-agent criterion by probe <C, K or S> in that plan's handover report.
```

with C for the first two entries, K for `kept-findings-go-to-the-catalog`, and S for
`scripts-never-hide-the-users-git-config`. Commit. Then run, and record each output:

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
git diff --stat origin/main...HEAD     # passes: only the File Structure files
```

On a failure that is in this plan's files, fix and re-run; otherwise stop and hand back.

### Task 5 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*), each check's command with its actual
output, the probes' quotes and verdicts, and the worktree path used. Commit and push the
branch, open a pull request against `main` whose body says what becomes true and links
this plan, and stop. Do not write a review record and do not merge.

## Handover report

Run with git 2.49.0, Node v22.15.0, Claude Code 2.1.300 (the probes' agent model reported
itself as claude-opus-5-5), on Darwin arm64. Started from `origin/main` at `e594a4d`.

### Task completion

- Task 0 (setup): done. `npm --prefix .tropis ci` ran, tree clean, baseline self-check
  ended `Self-check passed`.
- Task 1 (texts): done, commit 8982199.
- Task 2 (scratch projects): done. All three set up from this branch, `npm install`
  in each, the rule-text counts below were `1` before each probe.
- Task 3 (probes): done. C pass; S pass; K fail on one condition (see below).
- Task 4 (catalog): done, four entries `shipped` with modules and the evidence comment.
- Task 5: this report.

### Verification results

Task 1 checks, after the edit (collapsed-line `grep -cF`): `1` for each of the seven new
texts; `0` for `After any change, run the generator` and `then regenerate its document`;
`1` for each of the five texts that stay. `git diff origin/main -- rules framework`
removed only the three replaced passages of Decision 1 (the doc-closeout row, the opening
sentence and first bullet of `rules/catalogs.md`, the shipped-transition line); all else
is additions.

Scratch-project counts before probes: C and K, `Three things in an unquoted value break
the YAML.` 1 and `A finding worth keeping is captured as a backlog entry` 1; S, `its
tests isolate it, never the script itself.` 1.

- `bash scripts/check-blueprint.sh` on the branch after all commits: last line
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 129 passed,
  129 total`.

**Probe C (generator and characters): pass.** Prompt as in the plan, Claude Code 2.1.300
on Darwin arm64.
- Committed `feature-catalog.yaml` parses with the `yaml` package: pass.
- Title line: `title: "Export warns on skips: more than 1 in 10"`, quoted; ratio kept: pass.
- No call ran or searched for a catalog-document generator: pass. The agent's final
  message does not report skipping one: pass.
- Whether it received `.claude/rules/catalogs.md`: the stream does not show the rule text
  (neither new paragraph appears in it). The agent went through the `idea` command and
  quoted the title by itself, so this pass does not show the new clause was what caused
  it.
- Side note: the agent committed on a branch in a new worktree, not on `main`, and asked
  whether to merge locally (no remote existed).

**Probe K (kept findings): fail on condition 2, and the clause was not exercised.**
- `notes-export` committed as `shaped` with five criteria: pass.
- A new `status: idea` entry for the ignored `import` tag, or a stated reason naming
  *What does not become an entry*: **neither happened.** The stream shows the agent read
  `docs/tool.sh` and its final message never mentions `import` or the ignored tag. No
  entry, no reason, and no question to the developer.
- No commit changed `docs/tool.sh`: pass. No branch, worktree or plan for the import
  defect (the branch and worktree made were for the shaping itself): pass. No task-card,
  todo, background-agent or session-starting call: pass.
- The agent received the rule: both new catalog paragraphs appear in the stream, from its
  read of `.claude/rules/catalogs.md`. So the clause was delivered and the agent still
  never raised the finding. By the plan's definition this is a fail, not inconclusive,
  since it did not merely ask. It could equally be a probe that was too quiet about the
  defect; the verdict is the reviewing session's.

**Probe S (git config): pass.**
- `grep -nE 'GIT_CONFIG_GLOBAL|GIT_CONFIG_NOSYSTEM|HOME' .tropis/scripts/stamp.mjs`
  printed nothing, exit 1: pass.
- The test sets them in the environment it spawns the script with:
  `HOME: home,`, `GIT_CONFIG_NOSYSTEM: '1',`, `GIT_CONFIG_GLOBAL: globalConfig,`, and
  gives each repository an identity (`user.name` 'Repo Owner'): pass.
- The agent ran the test and it passed, then the full suite.
- Recorded, not deciding: the test `uses the git config in force, such as a global
  identity it did not set` writes a global identity and uses a repository with none, so
  it shows a config the script did not set taking effect. The rule text was in the stream
  (the agent read `harness-scripts.md`).

Scratch directories and stream files deleted.

### Scope

`git diff --stat origin/main...HEAD` (before this report):

```
 feature-catalog.yaml     | 33 +++++++++++++++++++++++++--------
 framework/workflow.md    |  2 +-
 rules/catalogs.md        | 45 ++++++++++++++++++++++++++++++++++++++-------
 rules/harness-scripts.md | 10 ++++++++++
 4 files changed, 74 insertions(+), 16 deletions(-)
```

Every file is in the File Structure table; this report is the fifth. Worktree used:
`../tropis-rule-text`, a sibling of the primary checkout `tropis`, created by the
isolation script.

### Judgment calls

- The `blockedBy` removal step in the catalog edit was a no-op for these four entries;
  none carried one.
- The probe tool list was `Read,Write,Edit,Grep,Glob` plus `Bash` limited to git, node,
  npm, npx, ls and cat; no bypass flag.
- Probes C and S ran at the same time as K, each in its own scratch project.

### What the plan got wrong

- Probe C cannot show the new clause worked: the agent took the `idea` command's route and
  never displayed the rule. A task that makes the agent open the catalog file with the
  Read tool would exercise the delivery.
- Probe K's seeded defect was not salient enough: the agent shaped from the `export`
  behaviour only and never discussed `import`. The shaping prompt asks for the criteria
  "from what docs/tool.sh does", which can read as export only.

### Outstanding

- Probe K's verdict, and whether to re-run it with a prompt that points at the whole
  script, is for the reviewing session.
- The framework's `.claude/` copy is untouched; the rule text reaches projects with the
  next release.

## Review record

Reviewed by the specifying session, 2026-11-01, Claude Code 2.1.300 (Opus 5.5) on
Darwin arm64, git 2.49.0, Node v22.15.0.

### Checks re-run

- Task 1's fourteen text checks, on the branch at `8ec8a1e`: the seven presence checks
  printed `1` each, the two removal checks `0`, and the five kept-text checks `1` each.
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 129 passed,
  129 total`.
- `git diff --stat origin/main...HEAD`: `feature-catalog.yaml`, `framework/workflow.md`,
  `rules/catalogs.md`, `rules/harness-scripts.md` and this plan, all in *File Structure*.
- The diff of `rules/` and `framework/` was read against *Decisions 1 to 4*: verbatim,
  and the only removals are the three passages *Decision 1* replaces.
- **Probe K, rerun.** The handover's diagnosis, that the agent never noticed the
  `import` defect because the prompt pointed it at the export only, was checked: the
  first stream's final message never mentions `import`, so the clause under test was
  never reached, and that is what a too-quiet probe predicts. Rerun in a scratch project
  set up from this branch with `scripts/set-up-project.sh` (its
  `.claude/rules/catalogs.md` contained `A finding worth keeping is captured as a backlog
  entry`, count 1), seeded as Task 2 says, with the prompt "Shape the backlog entry
  notes-export: read all of docs/tool.sh, write the entry's acceptance criteria for the
  export it describes, move it to shaped, and commit. If you notice anything else wrong
  in docs/tool.sh, deal with it the way this project's rules say." The prompt names no
  rule and no outcome. Run as `claude -p --output-format stream-json --verbose` with the
  handover's `--allowedTools` list. The stream shows the agent reading
  `.claude/rules/catalogs.md`, then a worktree and branch for the shaping, one edit of
  `feature-catalog.yaml`, the checks, and one commit; no call edited `docs/tool.sh`, and
  none was a task-card, todo, background-agent or session call. The commit moves
  `notes-export` to shaped and adds two `status: idea` entries,
  `notes-import-as-documented` (import ignores its tag) and
  `tool-rejects-unknown-command`. Its final message: "The project's rules say an agent
  shouldn't fix problems it finds on its own; it captures them as backlog ideas instead.
  A problem that fails without any error is always captured." **Pass.** The scratch
  project and stream were deleted.

### Found

Public exposure: the diff was read for private material; it names no person, project,
home path or hostname. Nothing found.

- Probe C passed, but its stream does not show the rule text, because the agent worked
  through the idea command; the agent quoted the colon title correctly, which the rule
  asks for, and ran no generator step. The criterion asks for the probe to record
  whether the committed entry parses, and it does, so the criterion holds; whether the
  rule rather than general knowledge caused the quoting is not shown.
- In every probe the agent committed on a branch in a worktree, since the scratch
  projects have no remote and main counts as gated. That is the branching rule working.
- **Fixed by the reviewer, mechanical:** the catalog comment above
  `kept-findings-go-to-the-catalog` said its probe is in the handover report; it now
  points at the rerun in this record.

### Outstanding disposition

- "Probe K's verdict, and whether to re-run it": rerun above, passed.
- "The rule text reaches projects with the next release": that is how every change here
  ships; nothing to track.
- Nothing is observable only by the developer: the change has no screen.

### Learnings routed

- A probe whose seeded defect is too quiet never reaches the clause under test. The
  workflow already says to choose the task to exercise the clause just written; this was
  that failure in the plan's own probe, and it needs no new text. Not routed.
- The isolation helper must run from the primary checkout when the specifying session
  sits in a checkout under `.claude/worktrees/`; the plan said so in its Traps and the
  executor followed it. The planning rule already explains why a nested worktree is
  wrong. Not routed.

### Merged because

Every check was re-run and holds, the rule text is verbatim, the three probes pass (K on
its rerun), and the only fix was a one-line catalog comment.
