# Find out whether an area rule comes back after compaction — Implementation Plan

> **For agentic workers:** this plan is built by its author, not dispatched (see
> *Shape*). A fresh reviewer reads it, the finding and the diff, and writes the review
> record. Nothing in it stops for the developer.

**Goal:** a written finding says, measured in Claude Code with its version and platform,
whether an agent that touches a file in an area after `/compact` or `/clear` is given that
area's rule again, and `framework/rule-delivery.md` says what was measured.

**Backlog item:** `rules-return-after-compaction` in `feature-catalog.yaml` (type
spike). Spec: `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`,
entry 2 and *What changes in the arc*: "whether Claude Code re-attaches a rule loaded by
its `paths:` header after `/compact` or `/clear`, and whether Cursor re-attaches its
projection. If both do, the entry closes with no work."

**One plan:** what becomes true is one sentence — the framework knows, measured, whether
Claude Code gives an area rule again after `/compact` and after `/clear`.

**Why.** Claude Code loads an area rule the first time the agent touches a file matching
its `paths:` header (FW-009). If the record that the rule was loaded survives compaction
while the rule's text does not, a long session works on without its rules exactly when it
has run longest, and nothing says so.

## Shape

**Built by its author and sent to a fresh reviewer** (`.claude/rules/planning.md`, *Do
not rehearse the work to write its plan*). The deliverable is a measurement nobody can
state before running it; describing it for an executor would mean writing every expected
output as "whatever the tool does". The reviewer is an agent with only the repository, on
the model `node .tropis/scripts/dispatch.mjs --tier Large` names (Claude Opus 5.5; this
session records no subscription, so the picks file's Large row is read directly: Opus 5.5
is included on every Claude Code plan). It re-reads the raw transcripts the finding
quotes, which are kept outside the repository, from the excerpts committed in the finding.

**Shaping decisions, made by the delivering session (the developer agreed the sprint):**

- **Cursor is split into its own backlog item,** `cursor-rules-return-after-summarize`.
  This session runs in a Linux cloud container with no Cursor application and no
  `cursor-agent`; the Cursor half needs the developer at Cursor and is a check only a
  person can perform. Splitting lets the Claude Code half ship, rather than parking the
  whole spike on a check the developer has not been asked for.
- **Read the rule's arrival from the transcript, not only from the agent's answer.**
  Claude Code writes each session's transcript as JSON lines; a rule loaded by its header
  appears there as an attachment carrying the rule's text. The marker sentence in the
  rule is the second signal, read from the agent's reply.
- **The runs:** in a throwaway project with one invented area rule
  (`.claude/rules/alpha.md`, `paths: ["areas/alpha/**"]`) whose body is a marker sentence.
  1. *Baseline:* a fresh session reads `areas/alpha/one.js`; the rule arrives.
  2. *After `/compact`:* the same session is compacted, then reads `areas/alpha/one.js`
     again; then `areas/alpha/two.js`, a file in the area it has not touched.
  3. *After `/clear`:* the same for `/clear`.
  4. *Control:* a session that never touched the area before compaction reads
     `areas/alpha/one.js` after it.
  Headless runs use `claude -p --resume <session>`, with `/compact` sent as the prompt;
  where a command does not run headless, the run is made in an interactive session
  driven through `tmux`, and the finding says which.

## Delivers

- `rules-return-after-compaction`

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-rules-after-compact -b plan/rules-return-after-compaction origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Nothing under `.claude/`, `.tropis/`,
  `CLAUDE.md` or `AGENTS.md` changes.
- **The probe is throwaway,** in the session's scratchpad, never in this repository.
- **This repository is public.** No home paths, hostnames, session ids or computer names
  in anything committed: transcript excerpts are quoted with session ids replaced by
  `<session>`.
- **Every agent runs on the developer's plan (FW-053):** the `claude` command signed in
  through this session, no API key.
- **A measurement names its tool, version and platform** (`claude --version`, `uname -sm`).

## Traps

- `framework/rule-delivery.md` is a framework document: its edit needs a fresh-agent
  check, recorded in the commit body.
- A path in backticks under `docs/`, `scripts/` or `.claude/` in a framework document
  must exist; the finding's own path does, the probe's paths must be written in plain
  text.
- A colon followed by a space inside an unquoted backlog value breaks the YAML.

## File Structure

| File | Change |
|---|---|
| `docs/superpowers/plans/2026-11-04-rules-return-after-compaction.md` | this plan, its handover report and review record |
| `docs/superpowers/specs/2026-11-04-rules-after-compaction-finding.md` | new: the finding |
| `framework/rule-delivery.md` | what was measured after `/compact` and `/clear` |
| `framework/DECISIONS.md` | FW-009's consequence names the finding instead of the open entry, if the result changes it |
| `feature-catalog.yaml` | the backlog item shaped, building, then shipped; the Cursor item added |
| `docs/backlog-board/bands.yaml` | the Cursor item banded |

## Tasks

1. Build the probe and run the four runs; keep the transcripts in the scratchpad.
2. Write the finding: how it was measured, a table of the runs with what arrived, the
   transcript excerpts, and a recommendation.
3. Update `framework/rule-delivery.md` and, if the result changes it, FW-009's
   consequence.
4. Run the fresh-agent check on the `rule-delivery.md` change.
5. Move the backlog item to `shipped`; run `bash scripts/check-blueprint.sh` and
   `npm --prefix .tropis test` on the committed branch.
6. Write the handover report; send the branch to the fresh reviewer, who writes the
   review record.
7. Merge as the workflow's *Merging* says.

**Model tier: Large** (the author builds it). **Merge authority: self-merge after the
fresh reviewer's record,** by the delivering session.

## Handover report

### Task completion

1. **Probe and runs: done.** Seven sessions in a throwaway repository in the session's
   scratchpad: A, B, D (control), E (automatic compaction), F (short rule, edit without
   a read), G (60-clause rule) headless, and one interactive session through `tmux` for
   `/clear` and a second `/compact`. Runs F and G were added beyond the plan's four, to
   test what the summary keeps and whether an edit without a read brings the rule back.
2. **Finding: done**, `docs/superpowers/specs/2026-11-04-rules-after-compaction-finding.md`.
3. **`framework/rule-delivery.md` and FW-009's consequence: done.** The result changed
   FW-009's consequence, which named this backlog item as the open question.
4. **Fresh-agent check: done**, outcome below.
5. **Backlog: done.** `rules-return-after-compaction` shipped, its band removed;
   `cursor-rules-return-after-summarize` added as an idea, band C.
6. This report; the fresh reviewer writes the review record.

### Verification results

All on Claude Code 2.1.318, node v22.23.4, git on Ubuntu 24.04.5 LTS, Linux x86_64.

- `bash scripts/check-blueprint.sh` on the branch's committed content: `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`, exit 0.
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 175 passed,
  175 total`.
- `node .tropis/scripts/plan-overlap.mjs --claim` on this plan: `No overlap: … shares no
  file with a plan in building.`
- `node .tropis/scripts/dispatch.mjs` on this plan validates (the plan check passes).
- Measurements: the finding's *Results* table, read from each session's transcript.
- **Fresh-agent check** on the `rule-delivery.md` and FW-009 change: `claude -p
  --model claude-opus-5-5 --output-format stream-json --verbose`, Claude Code 2.1.318,
  from this worktree, no user-level instructions present (`~/.claude/CLAUDE.md` absent).
  Task: an invented proposal for a SessionStart hook that re-prints every area rule
  after `/compact` or `/clear`; decide from `framework/` and `rules/` whether to build
  it. Its calls: a grep for `compact|/clear|SessionStart` in `framework/` and `rules/`,
  reads of `framework/rule-delivery.md` lines 35–70 and FW-008/FW-009 in
  `framework/DECISIONS.md`. Its answer: "do not build the compact/clear SessionStart
  hook. After `/compact`, automatic compaction or `/clear`, Claude Code puts an area rule
  back by itself", naming the one-edit gap, FW-008, and Cursor as unmeasured. It found
  what the change intended.

### Scope

`git diff --stat origin/main...HEAD`: `docs/backlog-board/bands.yaml`, this plan, the
finding, `feature-catalog.yaml`, `framework/DECISIONS.md`, `framework/rule-delivery.md`
— every one in the File Structure table. Worktrees: `../tropis-rules-compaction` for the
claim, `../tropis-rules-after-compact` for this branch, stacked on the claim commit and
rebased onto `main` once the claim lands.

### Judgment calls

- The Cursor half is split into its own backlog item (see *Shape*).
- `/clear` was measured interactively only: headless `/clear` starts a new session id
  and resuming the old one restores the cleared conversation, so it measures nothing.
- Automatic compaction was forced with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=1`, an
  environment variable this cloud session already sets (to 80); the transcript's
  `"trigger":"auto"` confirms it ran as automatic compaction.
- The recommendation leaves the first-edit gap alone rather than proposing a backlog
  item; it is recorded in `rule-delivery.md` so it can be reopened with evidence.
- The `claude` banner reads "Claude API" in this cloud session; no API key was set, and
  the child processes used the session's own sign-in, which is the developer's plan.

### What the plan got wrong

- It listed `docs/backlog-board/index.html`; the board is not committed here, and the
  row was removed before the claim.
- Its four runs could not show the first-edit gap; runs F and G were needed.

### Outstanding

- Why the interactive `/compact` restored the rule file itself and the headless ones did
  not was not established; either way the rule was back before the agent's next action
  in the area had a result.
- Cursor: `cursor-rules-return-after-summarize`, needing the developer at Cursor.

## Review record

Reviewed by a fresh agent with only the repository and the uncommitted evidence copies,
as *Shape* asks: Claude Code (model `claude-opus-5-5`; `claude --version` was refused by
the session's permission settings, so the version is not re-read here), node v22.23.4,
Linux x86_64 (`uname -sm`), in the worktree `../tropis-rules-after-compact`, at branch
head `57b20cc` on `origin/main` `a59bf5a` (`git merge-base HEAD origin/main` is
`a59bf5a…`, so the branch is up to date).

### Checks re-run

- **The Results table, row by row, against the transcripts.** A small node script printed
  each transcript's prompts, tool calls, tool results, `compact_boundary` metadata and
  `file`/`nested_memory` attachments in order (sessionA/B/D/E/F/G.jsonl and the three
  interactive files, ordered by first timestamp 10:34:38, 10:35:11, 10:36:01).
  - **A:** prompt 1 no `nested_memory`, answer `No.`; read of `alpha/one.js` →
    `ATT nested_memory .claude/rules/alpha.md` after the tool result, answer ends
    `ALPHA-RULE-PRESENT`; compact boundary `"trigger":"manual","preTokens":37110,…,"postTokens":7099`;
    then `ATT file areas/alpha/one.js` only; the marker question gets no `nested_memory`,
    answer (a3.json) `Yes, but only as a quote inside the compaction summary…`; re-read of
    `one.js` → `nested_memory` after the result; read of `two.js` → none. **Matches,
    except the token figure: the table gives A "36,982 tokens before", which is run B's
    figure; A's is 37,110.**
  - **B:** `nested_memory` after the first read; boundary `manual`, `preTokens":36982`;
    after it only `ATT file areas/alpha/one.js`; read of `two.js` → `nested_memory` after
    the result, `ALPHA-RULE-PRESENT`. Matches, and the excerpt's `36982` is B's.
  - **D:** read of `beta/b.js` → no `nested_memory`, no closing line; boundary `manual`;
    read of `alpha/one.js` → `nested_memory` alpha after the result, `ALPHA-RULE-PRESENT`.
    Matches.
  - **E:** `nested_memory` after the first read; on `Say hello.` the boundary is
    `"trigger":"auto","preTokens":37019,"postTokens":6960`, answer `Hello!  ALPHA-RULE-PRESENT`
    with no `nested_memory`; read of `two.js` → `nested_memory` after the result. Matches.
  - **Interactive:** file 1, read of `one.js` → `nested_memory` after the result. File 2,
    `/clear`, marker question → none, `No.`; read of `one.js` → `nested_memory`. File 3,
    `/clear`, read of `two.js` → `nested_memory`; `/compact` boundary
    `"trigger":"manual","preTokens":39998,"postTokens":7083`, followed by
    `ATT file .claude/rules/alpha.md` and `ATT file areas/alpha/two.js`; read of `one.js` →
    no `nested_memory`, `ALPHA-RULE-PRESENT`. Matches. The screen strings ("Loaded …",
    "Read … (7 lines)") are not in the transcripts and were not re-checked.
  - **F:** `nested_memory` beta after the read; boundary `manual`; `ATT file areas/beta/b.js`;
    codeword without tools `The beta codeword is HERON-5512.`; Edit with no prior Read,
    result `…has been updated successfully.`, **then** `ATT nested_memory .claude/rules/beta.md`.
    The summary (2,694 characters) quotes the beta rule's sentence verbatim. Matches.
  - **G:** `nested_memory` gamma after the read; boundary `manual`, summary 2,523
    characters; codeword `Yes, it's **OSPREY-2093**.`; Edit with no prior Read, then
    `nested_memory` gamma after its result. Matches; see *Found* on what the summary kept.
  - `probe-rules/`: alpha and beta are as the probe table says; `gamma.md` is 9,589 bytes
    (`wc -c`), 60 clauses, clause 37 on line 42 begins `Marker:` and holds `OSPREY-2093`.
  - Every one of the 29 headless output files reads `is_error` false. `c1`–`c4.json` are a
    headless `/clear` attempt with no transcript here: after `c2` (the `/clear`), `c3`
    answers `Yes.  ALPHA-RULE-PRESENT`, which bears out the handover's reason for measuring
    `/clear` interactively only.
- **Backlog parses.** A node script loading `yaml` from `.tropis/node_modules` printed
  `feature-catalog.yaml errors: 0 warnings: 0`, `rules-return-after-compaction shipped
  criteria: 4 refs: 3`, `cursor-rules-return-after-summarize idea criteria: 0 refs: 2`,
  `docs/backlog-board/bands.yaml errors: 0 warnings: 0`, `cursor band: C ; old band
  present: false`.
- **Scope.** `git diff --stat origin/main...HEAD`: 6 files (`docs/backlog-board/bands.yaml`,
  this plan, the finding, `feature-catalog.yaml`, `framework/DECISIONS.md`,
  `framework/rule-delivery.md`), 411 insertions, 19 deletions — every one in the File
  Structure table. `.review-evidence/` is untracked (`git status --short` shows
  `?? .review-evidence/`) and not in the diff.
- **Not re-run: `npm --prefix .tropis test` and `bash scripts/check-blueprint.sh`.** Both
  were refused by this session's permission settings ("This command requires approval"),
  so the handover's `13 passed` / `175 passed` and the self-check pass are not
  independently confirmed here. The pull request's `pipeline / gate`, which `main`
  requires, runs them before anything lands.
- **The fresh-agent check** was not re-run and its stream is not in the evidence folder;
  its record in the handover names the tool, version, model, calls and answer, as the
  workflow asks.

### Found

**Public exposure:** the diff was read line by line, and
`git diff origin/main...HEAD | grep -n -i -E '/home/|/root|/tmp/|/Users/|@[a-z0-9-]+\.[a-z]|session_[0-9A-Za-z]|[0-9a-f]{8}-[0-9a-f]{4}-|hostname|\.local\b|atlassian|…'`
(with the developer's names added) printed one line, 122, the plan's own constraint
"No home paths, hostnames, session ids…", which also shows the pattern finds a hit.
Transcript excerpts use `<probe>` and `<session>`; no home path, hostname, session id,
email or person's name is in the diff. The raw transcripts do carry scratchpad paths and
session ids, and stay uncommitted. Nothing.

1. **A wrong figure in the finding's Results table (fix before merge, mechanical).** Run
   A's `/compact` row says "36,982 tokens before"; sessionA.jsonl's boundary says
   `"preTokens":37110` (and `"postTokens":7099`). 36,982 is run B's. The fix is the one
   number in `docs/superpowers/specs/2026-11-04-rules-after-compaction-finding.md`; it
   changes no conclusion. This review was told to edit only the plan file, so the
   delivering session makes it.
2. **The finding overstates what run G's summary dropped (reword, not blocking).** The
   Summary says the summary kept, "of a 60-clause rule, only its marker clause", and
   point 4 says 59 clauses "were not" quoted. G's summary did not quote them, but it did
   keep their content: ".claude/rules/gamma.md … has 60 clauses saying a gamma module's
   exported constants should stay plain integer literals, and that the module comment
   should explain why when one doesn't." The probe's 59 other clauses are near-identical
   (`Clause 1. Keep each gamma module so that its exported constant number 1 stays a plain
   integer literal…`), so one sentence of gist covers them all, and the probe cannot show
   whether distinct clauses would be lost. Recommended wording: the summary paraphrased
   the rule in one sentence and kept the marker clause; whether a rule of distinct clauses
   survives was not measured. The recommendation does not depend on it: the gap is one
   edit, and the rule arrives with that edit's result either way.
3. **The claim did not land before the work (process, not blocking).** The claim commit
   `dd23f1e` (move to `building`) is on this branch, not on `main`, so the backlog item
   goes `idea` → `shipped` in one pull request and the overlap check of any session
   claiming meanwhile could not see it. Nothing overlapped (the handover's
   `plan-overlap.mjs --claim` printed `No overlap`), so it cost nothing here.

The conclusions themselves — the rule returns on the next touch after manual compaction,
automatic compaction and `/clear`, for a touched and an untouched file, the control
distinguishes return from first arrival, and an edit without a read after compaction is
answered before the rule is attached — are each borne out by the transcripts above.
`framework/rule-delivery.md` and FW-009's consequence say no more than that.

### Outstanding disposition

- **Why the interactive `/compact` restored the rule file and the headless ones did
  not:** dropped, unexplained. The transcripts confirm the symptom
  (`ATT file .claude/rules/alpha.md` only in the interactive file); no cause was tested,
  and none is written. It changes no recommendation, because in every run the rule was in
  context before the agent's next result in the area; *What does not become a backlog
  item* applies to a question whose answer changes nothing.
- **Cursor:** `cursor-rules-return-after-summarize` (added, `idea`, band C), needing the
  developer at Cursor.
- **Criteria only a person can observe:** none; the change has no screen.
- **The handover's test and self-check figures** are confirmed by the pull request's
  `pipeline / gate`, not by this review (see *Checks re-run*).

### Learnings routed

- **The behaviour measured** is routed by this plan itself: `framework/rule-delivery.md`
  and FW-009's consequence.
- **A probe whose filler clauses are identical cannot show what a summary drops**: not
  routed as a rule. It is specific to this finding's design and is recorded here and in
  *Found* 2; it becomes evidence only if someone reopens the first-edit gap, which
  `rule-delivery.md` already invites.
- **Evidence outside the reviewer's reach** (the first review run): routed to the
  backlog as `author-built-evidence-reaches-the-reviewer`.
- **A figure copied between runs' rows** (Found 1): not routed. The planning rule's
  check-every-claim clause already covers it; this review is that check working.

### Merged because

The transcripts bear out every conclusion and every `nested_memory` placement in the
Results table, the backlog parses and the diff is inside the File Structure table with
nothing private in it; it is fit to merge once run A's token figure is corrected to
37,110 (a one-number mechanical fix, no further review needed) and `pipeline / gate` is
green, with the gamma wording in *Found* 2 recommended in the same commit.

**Applied after the review, by the delivering session:** run A's figure is now 37,110,
and the finding says run G's summary kept the marker clause and a one-sentence gist of
the other 59, which are near-identical, so the probe does not show what a rule of
distinct clauses would lose. *Found* 3: the claim went first as its own pull request,
landed before this branch, which is stacked on it and rebased onto `main` after it.
