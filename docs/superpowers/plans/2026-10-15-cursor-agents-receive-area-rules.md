# What makes an area rule reach a Cursor agent — Spike Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 4 is a handover to the developer: it stops the
> plan until the developer has run three Cursor chats.

**Goal:** A written finding says, from measurements in the Cursor application, which ways
of delivering an area rule reach a Cursor agent when it reads, edits or creates a file in
the area; which of the hook-free ones also work in Claude Code; and which mechanism
`rule-areas-are-project-data` should generate — and `framework/rule-delivery.md` says what
was measured.

**Spec:** none. The entry `cursor-agents-receive-area-rules` in `feature-catalog.yaml` is
the specification: its six acceptance criteria and the comment above it. The arc it
belongs to is `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`;
the measurement it follows is the claims audit of 2026-10-09 (an unpublished record),
*Q1*, *Q2*, S1 rows 1.16–1.17, S2 rows 2.0 and 2.9, and *Appendix B* (the two Cursor
prompts' answers, which show the shape of a run that worked). Read those before Task 1.

**What this delivers:** `cursor-agents-receive-area-rules`, all six criteria. See
*Criteria and their evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `994defa`:**

- `scripts/generate-cursor-rules.mjs` writes one `.cursor/rules/<name>.mdc` per rule, with
  this front matter — the globs are a JSON array of quoted strings, from
  `JSON.stringify` of the rule's `paths:` header:

  ```
  ---
  description: catalogs rules (generated from .claude/rules/catalogs.md — do not edit)
  globs: ["feature-catalog.yaml"]
  alwaysApply: false
  ---
  ```

  `.cursor/rules/catalogs.mdc` in this repository is that output, verbatim.
- `scripts/rule-areas.js` reads a rule's area from a one-line `paths: [...]` JSON header,
  e.g. `paths: ["docs/superpowers/plans/**", "docs/superpowers/specs/**"]` at the top of
  `.claude/rules/planning.md`. Claude Code loads such a rule when the agent first touches a
  matching file (`framework/rule-delivery.md`, *What each tool delivers today*).
- The audit (Cursor 3.23.12, 2026-10-09) found: Cursor gave its agent `CLAUDE.md`,
  `AGENTS.md` and the always-applied `workflow.mdc` before any tool, and **no glob rule on
  a Read in either layout, nor with the file open in a tab** (Q2, S1 1.16). In a checkout
  with real folders, a hook wired in `.claude/settings.json` with a `Read` matcher spoke on
  the first Read and Cursor passed its reply to the agent as a system reminder (B2; S2 2.1,
  2.9). In a linked `.claude/` folder Cursor ran no hook at all (Q1).
- `scripts/hook-reply.sh` is the one reply shape both tools pass to the agent
  (`hookSpecificOutput.additionalContext`); it needs `python3`. A hook sources it and calls
  `reply_on_exit`; everything printed after that is sent as one reply.
- `framework/rule-delivery.md` is the page that says what each tool delivers. No guard
  pins its wording (`grep -rn "rule-delivery.md" guards` names none of its sentences).
- On the developer's Mac: Cursor 3.24.12 is installed, and a `cursor-agent` command-line
  build dated 2025.09.18. Recorded, not required — see *Global Constraints*.

**Model tier: Medium–large.** The route is laid out, but designing prompts that cannot be
answered by guessing, telling a real attachment from a confound, and writing the
recommendation all need judgment with no mechanical check.

**Requires:** the developer at the Cursor application for Task 4, and any current Claude Code CLI for Tasks 3 and 7 (record which).

**Merge authority: parent review.** The finding steers the rest of the arc, and the developer decides on its recommendation.

Do not store a kick-off prompt on this plan.

---

## Delivers

cursor-agents-receive-area-rules

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-cursor-rules -b plan/cursor-agents-receive-area-rules` |

The probe project of Task 1 is a throwaway folder, not a checkout of anything; it is not
in this table and nothing in it is committed anywhere.

## Global Constraints

- **Measure; do not fix.** No change to `scripts/`, `rules/`, `guards/`, `templates/`,
  `commands/`, `.claude/` or `.cursor/` in this repository, even if the cause turns out to
  be one line in the generator. A fix is the next plan, decided by the developer from the
  finding.
- **Every probe runs in the throwaway project of Task 1**, never in this repository or in
  any real project. Its rule areas and file contents are invented.
- **Never require a particular install, version or machine**, and never stop because one
  is absent. Record the tool, version and machine of every run. A run you cannot make (no
  `cursor-agent`, say) is recorded as not made, with the reason.
- **A rule-sync tool is installed only inside the probe project**, from its public
  registry, and only to generate one candidate's files. Nothing is installed in this
  repository.
- **Do not edit `feature-catalog.yaml`** except the promotion the reviewer makes at merge.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken in the specifying session; do not reopen them. If one cannot be carried out as
written, stop and report.

1. **The Cursor application is the ground truth.** What the IDE agent receives is what the
   criteria ask. The command-line `cursor-agent`, where installed, is run on the same
   prompts and recorded in its own column, never in place of an application run.
2. **Hook-free first.** The developer asked, on 2026-10-15, for a mechanism without hooks:
   either one both tools share, or each tool's own native one, the way the `paths:` header
   is Claude Code's. The hook candidate (C9) is measured so the finding is complete, and is
   recommended only if no hook-free candidate delivers. `DECISIONS.md` FW-008 removed the
   framework's rule hook; recommending one reopens that, and the finding must say so.
3. **One project, one area per candidate, one marker per area.** Each candidate delivers
   its rule to its own folder, and each rule carries a marker sentence found nowhere else.
   Which candidate worked is read from which marker the agent quotes.
4. **Three fresh chats per tool, one per moment:** *read* an existing file, *edit* an
   existing file, *create* a new file — the last is the criteria's "working in the area
   without opening the file". Within a chat the agent touches every area at that moment,
   in order, and after each touch reports the markers it has received so far. A fresh chat
   per moment, because once a rule has attached it stays for the rest of the chat.
5. **Positive controls in every run.** An always-applied Cursor rule and a root
   `CLAUDE.md`, each with its own marker, prove the session read the project's rule files
   at all. A run where neither control arrives is void, not a negative result.
6. **The audit's case comes first** (C1, the generator's output as it is today), so a
   change in Cursor since 3.23.12 is told apart from a candidate that works.
7. **The finding is named for this plan's date** —
   `docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md` — whatever day it runs,
   because `rule-tooling-spike`'s plan cites it by that path.
8. **`framework/rule-delivery.md` reports the measurement and changes nothing it
   recommends.** Its Cursor sentences become what was measured, with version and date; it
   does not adopt the finding's recommendation, which is the developer's to accept.

## The candidates

Each is one folder under `areas/` in the probe project, holding one existing file,
`sample.js` (a few lines of invented code). Marker sentences take the form
`Probe marker <code>: <two invented words>.` — e.g. `Probe marker C1: amber lantern.` —
and must not appear in any file name, prompt or other file.

| Id | Folder | How the rule is delivered |
|---|---|---|
| C1 | `areas/c1-generator/` | `.cursor/rules/c1.mdc` exactly as `generate-cursor-rules.mjs` writes it: `globs: ["areas/c1-generator/**"]`, `alwaysApply: false`, a `description` line |
| C2… | `areas/c2-…/` etc. | The same rule with its globs written in **each other form Cursor's documentation shows at the time of the run** — one candidate per form. Read the current Cursor rules documentation first and quote the forms it shows. Unverified expectation, to be checked not assumed: an unquoted single glob (`globs: areas/c2/**`) and a comma-separated list. |
| C3 | `areas/c3-layout/` | Cursor's **current rule-file layout**, if its documentation now describes one other than `.cursor/rules/*.mdc` (for example a folder per rule). If it describes none, C3 is recorded as not applicable, with the page and date read. |
| C4 | `areas/c4-described/` | A rule Cursor applies on its own judgement: a `description` naming the area's folder and purpose, no globs, `alwaysApply: false` |
| C5 | `areas/c5-agents/` | An `AGENTS.md` inside the area folder |
| C6 | `areas/c6-claude/` | A `CLAUDE.md` inside the area folder. Claude Code loads a folder's `CLAUDE.md` when it reads files there; Cursor gave its agent the root `CLAUDE.md` in the audit (S1 1.1). If both load a nested one, this is a mechanism the two tools share. |
| C7 | `areas/c7-nested/` | A `.cursor/rules/` folder **inside the area folder**, holding one always-applied rule, if Cursor's documentation says nested rule folders are read |
| C8 | `areas/c8-claude-rules/` | `.claude/rules/c8.md` with a `paths: ["areas/c8-claude-rules/**"]` header — Claude Code's own mechanism, measured in Cursor to see whether Cursor reads it too |
| C9 | `areas/c9-hook/` | A hook, wired in the probe's `.claude/settings.json` as `PreToolUse` with matchers `Read`, `Edit` and `Write`, that replies through a copy of `scripts/hook-reply.sh` with the rule text when the path is under `areas/c9-hook/`, and prints nothing otherwise |
| C10 | `areas/c10-sync/` | What a rule-sync tool (rulesync; Ruler if rulesync cannot be run) generates for Cursor from one source rule whose area is `areas/c10-sync/**`. Record the tool, version and exact command. If its output is byte-identical in form to a candidate above, say which and still measure it. |

Add a candidate if Cursor's documentation describes a further way of attaching a rule by
file or folder; give it the next id. Do not drop one: a candidate that cannot be built is
recorded as such, with the reason.

Controls, at the probe root: `.cursor/rules/control.mdc` with `alwaysApply: true`, and a
root `CLAUDE.md`, each holding a marker of its own (`K1`, `K2`) and nothing else that
names the probe.

## Traps

- **An agent that goes looking finds every marker.** The prompts forbid opening, listing or
  searching any rule or instruction file — `.cursor/`, `.claude/`, any `AGENTS.md` or
  `CLAUDE.md` — and searching for the word "marker". A marker the agent quotes after it
  opened one of those files is a confound, not a delivery: ask it to say which files it
  opened at each step, and discard any such result.
- **C4 may attach whatever is touched.** A rule applied on judgement can arrive on any
  step. Report the step it first arrived on; the finding says whether it followed the
  area or not.
- **C9's hook also runs in Claude Code** in Task 3. That is expected; its marker is its
  own. Do not remove it for the Claude Code runs.
- **C8 and the root `CLAUDE.md` are Claude Code's own mechanisms** and will arrive in Claude
  Code. That is the comparison, not a confound.
- **The edit moment may force a read.** If a tool refuses to edit a file it has not read,
  the agent says so, reads it, and the marker is attributed to the read; the finding
  records that the edit moment could not be separated for that tool.
- **A void run is not a negative.** No control marker means the session did not read the
  project's rule files — wrong folder opened, workspace not trusted. Re-run it.

## File Structure

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md` | New — the finding |
| `framework/rule-delivery.md` | The Cursor bullet under *What each tool delivers today* and the Cursor item under *What is not met* say what was measured |
| `feature-catalog.yaml` | `cursor-agents-receive-area-rules` to `shipped`, at merge, by the reviewer |
| `docs/superpowers/plans/2026-10-15-cursor-agents-receive-area-rules.md` | Handover report |

Doc closeout: the only durable page whose claim changes is `framework/rule-delivery.md`.
`README.md` points at that page rather than restating it, so it is unchanged. No decision
is taken (the recommendation is the developer's), so no `DECISIONS.md` entry. A
framework document changes, so Task 7 runs the fresh-agent check.

---

### Task 1: Build the probe project

1. Read the current Cursor documentation on rules (and on `AGENTS.md` and nested rules, if
   separate pages). Write down, for the finding: each URL, the date read, the glob forms
   it shows, the rule-file layout it describes, and whether it says nested `.cursor/rules`
   folders or nested `AGENTS.md` files are read. Do the same for Claude Code's memory
   documentation on nested `CLAUDE.md` files.
2. Create `../cursor-rule-probe/` beside this repository, and `git init` it. Build the
   candidates and controls exactly as *The candidates* lays out. One `sample.js` per
   folder; no other files in the areas.
3. Record the whole tree and every rule or instruction file verbatim — the finding carries
   them, so the probe can be rebuilt and deleted.
4. After Task 2's prompts are written, commit the probe once, in its own throwaway
   repository, so the reset between runs has something to return to.

### Task 2: The prompts

Write three prompts into the probe root, `prompt-read.md`, `prompt-edit.md`,
`prompt-create.md`. Each says:

- This is a measurement; the project is a throwaway; nothing it writes is kept.
- Before using any tool: quote every sentence beginning `Probe marker` that is in your
  instructions, and name the first heading of every rule or instruction file you were
  given.
- Do not open, list or search `.cursor/`, `.claude/`, any `AGENTS.md` or `CLAUDE.md`, and
  do not search for the word "marker".
- Then, for each area folder in turn, in the order of *The candidates*: *read*
  `sample.js` / *edit* `sample.js` by appending one comment line, without reading it first
  if your tool allows / *create* `new.js` with one comment line, without reading anything
  in the folder. After each, quote every `Probe marker` sentence you have received since
  the previous step — in your instructions, a tool result or a system message — and say
  where it arrived and which files you opened.
- Write your report to `answer-<moment>.md` at the probe root, step by step.

Commit nothing in the probe; it is not a repository anyone keeps.

### Task 3: Claude Code and the command-line Cursor agent

Run each prompt in a **fresh** Claude Code session in the probe root
(`claude -p "$(cat prompt-read.md)"` or the interactive equivalent), one session per
moment. Save each answer as `answer-claude-<moment>.md`. Record the version
(`claude --version`) and machine.

If `cursor-agent` is installed, run the three prompts the same way and save
`answer-cursor-cli-<moment>.md`, with its version. If it is not, or it cannot sign in,
record that and go on.

Reset the probe between runs:
`git -C ../cursor-rule-probe checkout -- . && git -C ../cursor-rule-probe clean -fd -e 'answer-*' -e 'prompt-*'`

### Task 4: Handover — three Cursor chats

**The task is the handover. Do not simulate it.**

**Check first:** do `../cursor-rule-probe/answer-cursor-read.md`,
`answer-cursor-edit.md` and `answer-cursor-create.md` all exist, each with a first line
`Cursor version: <version>`? If yes, the developer acted early: record that in the handover
report and go to Task 5.

**If not, print this to the developer and stop:**

> Three runs in the Cursor application, please — about ten minutes.
>
> 1. Open `../cursor-rule-probe` (the folder beside `claude-project-framework`) as a Cursor
>    workspace, and trust it if asked.
> 2. For each of `prompt-read.md`, `prompt-edit.md`, `prompt-create.md`: start a **new**
>    Agent chat, paste the whole file in, and let it finish. Then in a terminal run
>    `git -C ../cursor-rule-probe checkout -- . && git -C ../cursor-rule-probe clean -fd -e 'answer-*' -e 'prompt-*'`
>    to reset the files before the next one.
> 3. Each chat writes `answer-<moment>.md`. Rename it to `answer-cursor-<moment>.md` and
>    put `Cursor version: <version from Cursor › About>` as its first line.
>
> Done looks like: three `answer-cursor-*.md` files in the probe folder, each starting with
> the version line. Then tell me to carry on.

**On resumption,** run the same check again and proceed on its result, not on being told.

### Task 5: Read the results

For every run — Cursor application, Claude Code, Cursor command line — and every candidate
and moment, record one of: **arrived** (at which step, by which channel), **not arrived**,
**confounded** (the agent opened a rule file), **void** (no control marker), or **not
run** (and why). Put them in one table per tool: candidates down, moments across.

Then answer, from the tables only:

- Did C1 still deliver nothing, as in the audit? If it now delivers, say Cursor changed
  between 3.23.12 and the version measured.
- Which hook-free candidates delivered in Cursor, at which moments?
- Of those, which also delivered in Claude Code? A candidate delivering in both is a shared
  mechanism.
- Did C9, the hook, deliver?
- What does each working candidate cost a project: does it fit an area that is not a folder
  (this repository's `catalogs.md` covers one file, `feature-catalog.yaml`), and does it
  put a file inside the project's own source folders?

### Task 6: The finding and the page

Write `docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md`:

- **Summary** — five lines at most: what delivers in Cursor, what is shared, the
  recommendation.
- **How this was measured** — tools, versions, machine, dates; the documentation read,
  with URLs and dates.
- **The probe** — the tree and every rule file verbatim; the three prompts verbatim.
- **Results** — the tables from Task 5, and the answers under them.
- **Recommendation for `rule-areas-are-project-data`**, in this order of preference
  (Decision 2): a mechanism both tools share, if one delivered at every moment; otherwise
  Cursor's own native mechanism beside Claude Code's `paths:` header; a hook only if no
  hook-free candidate delivered, saying that this reopens FW-008; and if nothing delivered,
  what the framework should then tell Cursor users. Name what the areas file would have to
  generate, and any area shape a mechanism cannot express.
- **What was not measured**, and why.
- **Appendix** — every answer file, verbatim, in `~~~~markdown` fences.

Then edit `framework/rule-delivery.md`:

- *What each tool delivers today*, the **Cursor** bullet: replace the 3.23.12 sentences
  with what was measured — version, date, which mechanisms delivered and which did not,
  and a pointer to the finding by path.
- *What is not met*, the **Cursor** item: if a hook-free mechanism delivered, say it was
  found and is not yet what the framework generates, naming
  `rule-areas-are-project-data`; if none did, keep "No mechanism is known to work" and say
  what was tried.
- Change nothing else on the page.

Copy every answer into the finding before deleting `../cursor-rule-probe/`. Delete it last,
after Task 7.

Commit on the branch, with a body saying what the finding found.

### Task 7: Checks and fresh-agent check

Run, in the worktree, and paste the outputs into the handover:

```bash
npm --prefix .framework test
git add -A && git commit -m "…" && bash scripts/check-blueprint.sh
git diff --stat origin/main...HEAD
```

Expected: both suites green; the diff stat names exactly the files in *File Structure*
except `feature-catalog.yaml`.

**Fresh-agent check** (the page under `framework/` changed). In a fresh clone of this
branch in a scratch folder, start a fresh Claude Code session and give it this task:

> This is a probe and its output will be discarded. An invented project set up with this
> framework has a rule for its `src/billing/` area. Its developer works in Cursor. Using
> only this repository, say whether a Cursor agent that edits `src/billing/invoice.js`
> receives that rule, and what, if anything, the developer should do about it.

Pass: the answer matches the finding — what delivers, what does not, and that the
framework does not yet generate the working mechanism (or that none works). Record the
prompt, the answer's gist, pass or fail, and the tool, version and machine, in the body
of a commit on the branch. A fail means Task 6's page edit is not clear enough: fix the
wording and run it again.

### Task 8: Handover

Append `## Handover report` to this file with the six sections the planning rules name,
and commit. The reviewer puts the recommendation to the developer, promotes the entry and
writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Each candidate × read, edit, create, with version and machine | Finding, *Results*; answer files in the appendix |
| The named candidates are all measured | Finding, *The probe* and *Results* (C1–C10, plus any added) |
| Throwaway project, invented areas, marker sentences | Finding, *The probe* |
| The audit's case repeated first | C1 row of each table |
| Hook-free candidates also measured in Claude Code | Claude Code table (Task 3 runs every candidate) |
| Recommendation, in order of preference, put to the developer; the page says what was measured | Finding, *Recommendation*; `framework/rule-delivery.md`; Task 7 fresh-agent check |

The recommendation is put to the developer at review; the entry ships on the finding, not
on the developer accepting it.

## Not in this plan

- **Changing the generator or any rule** to use what works. That is the next plan, chosen
  by the developer, most likely inside `rule-areas-are-project-data`.
- **`rule-tooling-spike`**, which follows this one and reads its finding.
- **`rules-return-after-compaction`** — whether a delivered rule comes back after
  `/compact` or `/clear`. Different question; do not extend the prompts to it.

## Handover report

### Task completion

1. Done. Documentation read 2026-10-15. The probe is `../cursor-rule-probe`, commit `df11464`. C7 was not built: the Cursor docs do not say a `.cursor/rules` folder inside an area is read. The two glob forms the docs show are C2U and C2C.
2. Done. The three prompts are in that commit. Task 1 step 4 requires the one commit after the prompts exist, so the reset has a tree to return to.
3. Done for Claude Code 2.1.300, three sessions. `cursor-agent` 2025.09.18-7ae6800 is installed and not logged in, so those three runs were not made.
4. Done by the developer: three fresh chats, answers saved as `answer-cursor-read.md`, `answer-cursor-edit.md`, `answer-cursor-create.md`. The git reset between chats was not run. The runs were kept: the read changed no file, the edit appended `// measured` once, and the create wrote `new.js` without opening `sample.js`. The version line was added from the About dialog the developer pasted: Cursor 3.24.12.
5. Done. The tables are in the finding.
6. Done. The finding and the two edits to `framework/rule-delivery.md`.
7. Done. Both suites green. Fresh-agent check passed. The probe directory was deleted after the answers were in the finding.
8. This report.

### Verification results

`npm --prefix .framework test` at `e4dfe4d`:

```
Test Suites: 3 passed, 3 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        0.261 s, estimated 1 s
Ran all test suites.
```

`bash scripts/check-blueprint.sh` at `e4dfe4d`:

```
Checking e4dfe4d of ~/src/claude-project-framework-cursor-rules

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       cursor-rules-projection
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

The first self-check, at `bc9e8b5`, failed `framework integrity › references no file that does not exist`. The Cursor bullet backticked the finding's path. That file is in this repository and not in a project the page is installed into. `e4dfe4d` keeps the path and names it as the framework repository's file, without backticks. The guard was not changed.

`git diff --stat origin/main...HEAD` after this handover is committed is in *Scope*.

Fresh-agent check. Scratch clone `/tmp/cursor-area-rules-fresh` at `e4dfe4d`. Claude Code 2.1.300, `dev-laptop.local`, Darwin arm64, 2026-10-15. Command: `claude -p` with `--permission-mode acceptEdits --permission-prompts none`, prompt as Task 7 states it. Pass. The answer says the generator's JSON-array glob does not arrive, an unquoted glob arrives on a read and not on a create or a shell append, the `paths:` header does not arrive in Cursor, and the generator change is `rule-areas-are-project-data`, which is not done. Gist of the recommendation it gave the developer: have the agent read the rule file before editing, because the projection does not deliver. It also found `templates/CLAUDE.md` still saying Claude Code loads every area rule at session start, and that no area rule reached a Cursor agent. That is recorded under *Outstanding*. The output is a probe and was discarded.

### Scope

```
 .../2026-10-15-cursor-agents-receive-area-rules.md |   92 ++
 .../specs/2026-10-15-cursor-area-rules-finding.md  | 1003 ++++++++++++++++++++
 framework/rule-delivery.md                         |   21 +-
 3 files changed, 1110 insertions(+), 6 deletions(-)
```

`feature-catalog.yaml` is absent from this three-dot diff. A two-dot diff against `origin/main` (`356247e`) also shows a catalog entry that landed on main after this branch was cut from `75d70ac`. That entry is not this plan's edit. The reviewer promotes `cursor-agents-receive-area-rules` at merge.

### Judgment calls

- The docs show two glob forms, so C2 is C2U (unquoted) and C2C (comma-separated).
- C3 is the documented subfolder of `.cursor/rules`, with C1's JSON-array frontmatter, so the folder is the new variable. The miss is not evidence that subfolders are ignored.
- C7 was not built. `.cursorrules` was not measured: the help page calls it legacy, with no area scope.
- Claude Code print sessions used `--permission-mode acceptEdits --permission-prompts none`. After the first edit session appended with the shell, the edit re-run and the create session also passed `--disallowedTools Bash`.
- The Cursor edit column is the shell append the chat actually did. It is not Cursor's Edit tool.
- The missed reset between the three Cursor chats does not void them, for the reason under task 4.
- The version line on the three Cursor answers was written by this session from the developer's About paste.

### What the plan got wrong

- Task 2 says to commit nothing in the probe. Task 1 step 4 says to commit it once the prompts exist. The one commit is step 4.
- No guard pins a sentence of `rule-delivery.md`. The integrity guard does pin a backticked `docs/` path in an installed framework document, and the pointer the plan asks for is such a path. The clean baseline failed until the backticks came off.
- The edit prompt does not keep the agent off the shell. The first Claude Code edit and the Cursor edit both appended with a shell redirect, opened no file, and received no marker. The hook is matched to Read, Edit and Write, so a shell redirect does not fire it.

### Outstanding

- Parent review merges. This session does not. The reviewer promotes the catalog entry and writes the review record.
- The recommendation, for the developer to accept or decline: `rule-areas-are-project-data` should generate Cursor's unquoted glob (comma-separated when an area has several patterns) beside the `paths:` header. Not a nested `AGENTS.md` or `CLAUDE.md`, and not the hook. The hook delivered, and adopting it would reopen FW-008. Hook-free candidates delivered on a read, so the preference never reaches the hook. Until the generator changes, the projection this framework writes still does not reach a Cursor agent.
- `cursor-agent` was not logged in. There is no command-line column.
- Cursor's Edit tool was not measured, nor a glob that names a single file, nor a file left open in a tab.
- The fresh-agent check recommends a follow-up, not a change in this plan. `templates/CLAUDE.md` still tells an adopting project that Claude Code loads every area rule when a session starts, and that no area rule reached a Cursor agent. The first is false since the `paths:` header. The second is true of the generator's JSON-array form and false of the unquoted glob. The file is not in this plan's table. Recommend correcting it in its own change.

## Review record

Reviewed 2026-10-15 by the specifying session (Claude Code, Claude Opus 5.5, on the
developer's Mac). **Executor: Grok 4.7 in Cursor**, chosen by the developer — one tier
below this plan's Medium–large (`model-tiers.md` places Grok 4.7 in Medium). Because of
that, the review read the raw answers rather than the executor's tables.

### Checks re-run

- Rebased onto `origin/main` at `a44e2d2` (three commits behind, none touching this plan's
  files); clean.
- `npm --prefix .framework test`: `Tests: 4 passed, 4 total`.
- `bash scripts/check-blueprint.sh`: "Every guard caught its defect and passed the clean
  baseline."
- `git diff --stat origin/main...HEAD` before promotion: the plan, the finding and
  `framework/rule-delivery.md` — all in *File Structure*.
- Re-read `answer-cursor-read.md` and `answer-cursor-create.md` in the finding's appendix
  against the Cursor table, cell by cell: they agree. Every marker reported as arrived names
  only `sample.js` as the file opened, and names the channel (a "cursor rule files are
  relevant" attachment on the tool result, or a system reminder for the hook). No confound
  found. Controls K1 and K2 arrived before any tool in all three chats.
- The fresh-agent check is recorded in the body of `b34dd95` (Claude Code 2.1.300,
  dev-laptop.local): pass.

### Found

- The edit moment was not measured as intended in either tool: Cursor appended through the
  shell, and Claude Code's Edit tool needed a read first. The handover says so; the read
  and create moments carry the finding.
- The branch commits carry `Co-authored-by: Cursor` trailers, injected by the tool. The
  squash message is written explicitly and drops them.
- Nothing else beyond the handover.

### Outstanding disposition

- Recommendation — **accepted by the developer on 2026-10-15**, knowing a Cursor rule
  attached on a read and not on a create. Recorded above `rule-areas-are-project-data`,
  whose blocker on this entry is removed.
- `cursor-agent` not logged in, so no command-line column — dropped: the application is
  the ground truth (Decision 1).
- Cursor's Edit tool, a single-file glob, a file open in a tab — not scheduled now; the
  single-file glob matters for areas like `feature-catalog.yaml` and belongs in the
  verification of `rule-areas-are-project-data` when it generates such a glob.
- `templates/CLAUDE.md`'s stale delivery sentences — `entry-file-says-how-rules-arrive`
  (`a44e2d2`).

### Learnings routed

- What each tool delivers is now in `framework/rule-delivery.md` (this plan). The
  decision on what to generate goes to `rule-areas-are-project-data`, not a rule yet —
  nothing is built on it until that entry ships.
- A prompt that asks for an edit without a read must also forbid the shell, or the agent
  dodges the moment being measured. Not routed as a rule: it applies to probe prompts,
  and the finding records it where the next probe author will read it.

### Merged because

The finding answers the entry's question from measurements whose raw answers were re-read
and hold, and the one page it changes says only what was measured.
