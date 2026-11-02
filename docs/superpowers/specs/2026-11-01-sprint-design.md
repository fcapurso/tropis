# Sprints: the developer plans, a self-organising team delivers — design

**Date:** 2026-11-01 · **Status:** agreed with the developer, not yet planned

## Why

On 2026-11-01 the developer worked through this repository's backlog in one long session
of the Claude desktop app, in a way they want every project to have. A parent session
built a queue of open entries in rank order and agreed it with the developer. Each entry,
or bundle, got its own delivery session, which shaped it, planned it, claimed it,
dispatched an executor, reviewed, merged and moved it to shipped, then reported one line:
`SHIPPED`, `PARKED: …` or `STOPPED: …`. Entries whose files did not overlap ran at the
same time. Pull requests opened one at a time under a merge token the parent handed out,
so a gated `main` that requires branches up to date did not force every sibling to
rebase and re-run its checks each time one landed. Between midnight and 18:03 that day,
25 entries shipped, worth 46 effort points on the board.

It worked, but only in one tool, held together by one long conversation, with the parent
nudged by hand whenever the app stopped waking it, and with every rule living in that
conversation rather than in the framework. This design makes it a feature: the thing a
developer does on opening a project with any tool Tropis supports — "let's get some work
done" — and then it starts.

## The picture

The developer is the product owner. They run `/sprint`. The **sprint session** looks at
the backlog and proposes a sprint of about 20 story points. The developer adds, drops,
reorders and resizes until they agree. The sprint session then starts **team members**,
one per entry or bundle, as many at a time as the tool allows. Each team member delivers
its entry through the normal workflow and merges its own work. They stay out of each
other's way by rules every session follows — the merge token, the overlap check at
claim — not by asking the sprint session. At any time the developer can ask where the
sprint stands. When a team member adds an entry to the backlog, a bug above all, the
sprint session raises it and offers to slide it in. At the end there is a short report.

## Goals

1. One command, `/sprint`, plans a sprint with the developer and runs it.
2. The sprint session stays small: it plans, starts team members, reports. It does not
   merge, review or decide merge order, so its conversation does not grow with the work.
3. Team members organise themselves: each judges its own overlaps and merge order and
   takes the merge token itself.
4. Nothing in the coordination depends on one tool's messaging. Team members
   coordinate only through the repository and GitHub, so a sprint can mix tools — a
   Claude sprint session can start work in Cursor.
5. Every tool can run a sprint; what a tool cannot do is stated, not hidden. In a tool
   that cannot start sessions or agents, the sprint session works through the entries
   one at a time itself.
6. The backlog speaks the language of a sprint: arcs become **epics**, entries become
   **user stories**, the effort score becomes **story points**.

## Non-goals

- Consuming the whole backlog. A sprint is what the developer agrees to, no more.
- A merge-time order. The agreed order decides who starts; at merge the token is first
  come, first served. A tie-break by rank was considered and left out until it is
  shown to matter: it changes only which of two branches ready within minutes of each
  other merges first.
- Building every way of starting a team member. Two are built; the rest is a seam.
- Usage limits, archiving finished sessions, waking the sprint session. These are the
  tool's. The framework says what must hold — stop before the plan's usage runs out; a
  finished session leaves nothing open — and each tool does it its own way.
- Scrum ceremony beyond the words: no fixed sprint length, no commitment, no
  retrospective.

## Anti-goals — failure even if it works

- `main` going red, or a merge landing out of an order a dependency requires.
- The sprint session's context growing with every entry, until it is the bottleneck.
- A rule that lives only in the sprint session, so a session the developer starts by
  hand does not follow it.
- A team member waiting forever with nobody told.

## How it works

### 1. Planning the sprint

- The sprint session proposes about **20 story points** to start with. The developer
  can change the number while planning; 20 is only the starting proposal, to be revisited
  once a few sprints have run.
- It fills the budget from the top of the ranking (band, then value over effort, as the
  board orders it), skipping entries that are blocked, waiting on a decision from the
  developer, or shelved, and keeping a bundle whole.
- The developer refines scope and order. The agreed order decides who starts first.
- *Designer's call:* the agreed sprint is written to a local, uncommitted file, so the
  sprint session can pick the sprint up again after its conversation is reset. Where it
  lives is the builder's call.
- An entry the sprint session finds missing a `blockedBy` while grooming is proposed to
  the developer like any backlog edit.

### 2. A team member's life

One team member per entry or bundle, running the whole workflow as today's delivery
sessions did:

1. Shape the entry; write its plan.
2. Claim it: land the plan and the move to `building`, through a pull request under the
   merge token. Before landing, run the **overlap check** (§4).
3. Dispatch an executor on the model the plan's tier calls for — a subagent where the
   tool has them, or itself where it does not — and review its branch.
4. Wait for anything the plan must merge after (§5).
5. Take the merge token (§3); rebase once on `origin/main`; re-run the plan's merge
   criteria; open the pull request; set it to merge itself; wait for `main` to go green
   (`main-status.mjs --pull-request`). Keep the token for a follow-up pull request, such
   as the move to shipped; then release it.
6. End with one line: `SHIPPED`, `PARKED: <why>` or `STOPPED: <why>`.

A clean rebase needs no re-review, only the merge criteria again. A conflict needs its
resolution reviewed. A fix that needs judgement hands the token back first.

**Parking.** A team member parks an entry, and the sprint moves on, only when it needs
something it is not allowed to do or that is dangerous, a judgement only the developer
can make, or a check only a person can perform by hand. Otherwise it decides, and
reports its decisions. Entries that depend on a parked one are skipped. A parked entry
goes back on the board as needing a decision. *Designer's call:* an entry parked after
its claim moves back from `building` to `shaped`, with its plan kept and the reason in a
comment, landed under the token like any backlog edit; it then leaves the overlap set,
since only plans in `building` count.

**A bundle** gets one plan, as today's bundles did, and one team member: overlap, `Merges
after` and the token work per plan, and the bundle reports one final line.

### 3. The merge token

The token is a single named marker on GitHub — a git ref — holding the name of the branch
or person that has it and when it was taken. Creating a ref that already exists is
refused when it is created through the API or by a push that says the ref must not exist
yet (a plain push is not refused: see below), so the marker is a lock that needs no
messages: if two team members try at the same moment, one gets it.

- **Take:** try to create the marker through the API. If it exists, wait and try again every 30 seconds,
  as `main-status.mjs` waits.
- **Release:** delete the marker with a push that names the commit it expects the marker
  to hold, so a release cannot remove another holder's marker.
- **Hold:** the developer — or the sprint session on their word — takes the token in
  their own name, for example to run a release, and releases it afterwards. Every team
  member waits meanwhile. One command does this for a person.
- **Stale token:** the marker names its holder and its age. The sprint session's status,
  and `/next`, show a token held too long by a branch nothing is working on, and break it
  on the developer's word. *Designer's call:* nothing is working on a branch when it has
  no open pull request and no push within a time the builder sets; a hold by a person is
  never stale.
- **Waiting for the token has a time limit too** (*designer's call*), as the wait in §5
  does. When it runs out, the team member stops with `STOPPED: waiting for the token,
  held by <holder>`, so a dead holder leaves every waiter stopped and reported rather
  than waiting forever.
- **Every session follows it.** The token rule goes into the workflow's merge sequence,
  not into the sprint session, so a session the developer starts by hand takes the token
  like a team member. The sprint session's status shows such work, as `/next` shows open
  pull requests the backlog does not know.
- **Correctness never depends on it.** Something that ignores the token — a project on
  an older release, a tool not following the workflow, a person merging on GitHub —
  still cannot put a red or out-of-date change on a gated `main`. The worst case is the
  cost the token avoids: the holder's branch falls behind, `main-status` brings it up to
  date, checks run again. *Designer's call:* no pipeline check refuses a pull request
  opened without the token.
- **Answered — first spike (2026-11-02):** GitHub accepts a ref under `refs/spike/…` on
  this repository, by `git push` and by the REST API, and no ruleset touches it. Creating
  a ref that already exists is refused by the API every time (HTTP 422, "Reference already
  exists"), and by a push that states the ref must not exist yet; of five attempts made at
  the same moment, exactly one was accepted in each of nine rounds. A plain `git push` is
  not a lock: pushing the same commit again succeeds, and pushing a descendant moves the
  ref. The marker's commit message names the holder and the time, and both the API and
  `git fetch` read it back. A push that says which commit it expects to delete is refused
  when someone else holds the marker; the API's delete takes no such condition. The ref
  started no pipeline run. A cloud session's git proxy is documented to refuse deletions
  and anything but branches, so whether a cloud session can use the push form is open.
  So the token is a ref outside `refs/heads/` and `refs/tags/`, taken with the API's
  create and released with the conditional delete; FW-049 records it, and the evidence is
  at the end of this document.
- **Merge queue (first spike):** GitHub's two pages on merge queues do not say which
  repositories can use one, and turning it on would change this repository's settings,
  which the spike may not do. This repository belongs to a personal account (owner type
  `User`). Unanswered; the token does not depend on it.

### 4. Overlap, judged at claim

Overlap between entries is judged from their plans, not their descriptions: a plan
lists every file it touches.

- Claims land under the token, so they reach `main` one at a time, and at claim every
  earlier claimed plan is already there.
- At claim, a script compares the new plan's file list with the plans of every entry in
  `building` on `main`.
- No overlap: build. Overlap: the team member writes `Merges after: <entry id>` into its
  own plan's header before landing the claim, then builds in parallel. Whoever claims
  second waits.
- The script compares files, not lines, so two plans touching one file in unrelated
  places still wait for each other. That is safe; the one rebase resolves it.
- *Designer's call:* the check ignores the bookkeeping files every plan touches — the
  catalog, the bands file, the generated board, the release notes and the decision
  record. Counting them would make every pair of plans overlap and the sprint run one
  entry at a time. A conflict in them on rebase is resolved mechanically (keep both
  sides' entries, rebuild the board) and needs no review; a conflict anywhere else
  does. The list is one named constant the builder can extend.
- The sprint session's guess from entry descriptions decides only what to start in
  parallel. A wrong guess costs waiting, never a broken merge.

### 5. Dependencies

- **`blockedBy`** (on the entry, set when shaping): the work cannot be done without the
  other entry's code. The sprint session does not start it until the other has shipped.
- **`after`** (on the entry, existing: a designed order, where starting early would
  still work): the sprint proposal and the start order respect it, and nothing more. It
  does not turn into `Merges after`; the overlap check decides that from files.
- **`Merges after`** (in the plan's header, new): the work can be built at the same time
  but must land after. The team member sets it at claim (§4), or when it finds a
  dependency while planning. A team member may add one, never remove one.
- Before taking the token, a team member checks `origin/main`: has every entry it merges
  after shipped? If not, it waits in the same 30-second loop, without trying for the
  token.
- *Designer's call:* that wait has a time limit. When it runs out the team member stops
  with `STOPPED: waiting on <id>`, and the sprint session starts it again once that
  entry ships. This covers waiting on an entry that was parked.
- *Designer's call:* no branch is built on another unmerged branch. Needing the other's
  code is `blockedBy`.

### 6. Status on demand

The developer asks "where are we?" and gets what shipped, what is in flight and at which
step (planning, building, waiting to merge, merging), what is parked and why, and what is
left in the sprint. It is built from `main`'s backlog, open pull requests and the token
marker, so it is right whichever tool each team member ran in. *Designer's call:* a team
member still planning leaves no trace on GitHub; the sprint session reads "planning"
from its own sprint file, since it started that team member. A session the developer
started by hand shows only once it has claimed.

### 7. New entries from team members

When team members add entries to the backlog, the sprint session raises them, bugs first,
and offers to slide each into the sprint, saying what it would push out of the budget.
*Designer's guess:* it notices by comparing the backlog's ids on `main` with those at the
start of the sprint.

### 8. End of sprint

A short report: what shipped and its story points, points per hour of elapsed time, what
was parked and what the developer must decide, decisions team members made on their own,
and new entries. Points per hour is what later moves the starting budget.

### 9. Starting team members — one seam

A team member is anything that takes an entry's brief, runs the workflow and leaves a
handover report on its branch and a final line. How one is started is named per tool,
through a small seam:

- **in the sprint session itself, one at a time** — every tool; the fallback;
- **a sub-session or subagent of the same tool** — Claude Code, and Cursor, which runs
  parallel and background subagents;
- **a command line that starts another tool's agent** — such as `cursor-agent -p` or
  `claude -p` — so a sprint session in one tool starts work in another;
- **a printed prompt** the developer pastes into a new window, as `/dispatch` does.

The first two are built with `/sprint`. The command-line way is its own entry. The
sprint plan says which ways this tool has, and the sprint runs with those.

**Answered — second spike (2026-11-02):** Two command lines work today, and both run an
agent with nobody watching: `claude -p "<prompt>" --output-format json --model <m>
--setting-sources project --permission-mode acceptEdits --allowedTools "Bash(git *)"
--max-turns <n>` and `cursor-agent -p "<prompt>" --output-format json --model <m> --trust`
with `permissions.allow` rules in the project's `.cursor/cli.json` (for example
`Shell(git)`). Each takes the working directory from where it is started, prints one JSON
object with the agent's whole reply in `result` and an id in `session_id`, and exits 0
whether or not the work was done. So the last line is read from the end of `result`, but
the result is believed only once the repository agrees: a branch on the remote holding the
handover report. A Cursor run that was refused every shell command still ended `SHIPPED`.
Both resume a run with `--resume <session_id>`. With nothing granted, Claude Code denies
what needs approval, tells the agent so, goes on, and lists the denials in
`permission_denials`; Cursor refuses every shell command and still edits files. Neither
waited for an answer. Granting everything (`--dangerously-skip-permissions`, `--force`) was
not needed and is not recommended. Cursor's cloud agent API (`POST /v1/agents`, then the
run's `status`, `result` and `git.branches`) is documented but needs a key and a paid
cloud agent, so it is unproven, as is starting a cloud agent from the command line. The
choice is recorded as FW-050. Evidence: section "Second spike — evidence" below.

### 10. Epics, user stories, story points

The developer wants the backlog to speak a sprint's language: an arc becomes an
**epic**, an entry a **user story**, the effort score **story points**. This renames
words in the rules, the catalog template, the board, the backlog report and the
commands, and in every project that takes the release. It is the last piece of the epic
and may be left out: nothing else depends on it. The ranking design of 2026-10-30 listed
story points as a non-goal, meaning arithmetic beyond value over effort; this renames the
effort score and adds no arithmetic. Whether the rename reaches field names (`effort` in
every project's bands file, which needs a step in `/update`) or only the words people
read is decided when the piece is shaped; it sets the piece's size.

## How this sits with what exists

- **Separate specification and execution (FW-004)** holds: the team member specifies
  and reviews; its executor builds.
- **Ranking (FW-034)** gives the sprint proposal its order.
- **An agent that sets a pull request to merge itself stays until `main` is green
  (FW-039)** is step 5 of a team member's life, unchanged.
- **A session creates its branch in a worktree of its own (FW-040)** holds for every
  team member.
- **`/next`** stays the one-glance report; it gains the token's holder and age.
- **`/dispatch`** stays how a plan is handed to an executor, and is the printed-prompt
  way of starting a team member.
- **`/release`** takes the token as a hold while a release runs.

## The pieces

The feature is one epic: the entries below share this spec. Each lands as its own merge.

1. *Spike* `merge-token-can-live-on-github`: the merge token as a ref on GitHub (§3).
2. `merges-take-turns-under-one-token`: take, release, hold, stale, in the workflow for
   every session. Blocked by 1.
3. `overlapping-plans-merge-in-order`: the overlap check at claim and `Merges after`
   (§4, §5).
4. `sprint-plans-and-runs-a-team`: planning, the team, status, new entries,
   end-of-sprint report, the first two ways of starting team members. Blocked by 2;
   after 3.
5. *Spike* `another-tools-agent-can-be-started`: starting another tool's agent from a
   session (§9).
6. `team-members-start-in-another-tool`. Blocked by 5; after 4.
7. `backlog-speaks-in-epics-stories-and-points` (§10). After 4; may be left out.

2 and 3 are useful without the rest.

## What is left to the builder

Names of the ref and of the token command; where the local sprint file lives; the wait
limit before the token; how stale a token must be before it is shown; the words of
`/sprint`'s proposal and reports.

## Second spike — evidence

Read and run on 2026-11-02. Command lines: Claude Code 2.1.300 and Cursor's `cursor-agent`
2026.10.22-27dcf5f, on macOS 26.2, arm64, git 2.49. Documentation addresses are given in
full under Sources. The runs were started from inside a Claude Code session (so with
variables whose names start `CLAUDE_CODE_` set, among them one marking the session as a
child session), with no terminal on input, in a throwaway repository with a local bare
remote; no network remote and no cloud agent was touched. The task each run was given
asked for a branch, a file `HANDOVER.md` with a `## Handover report` heading, a commit, a
push, and a last line `SHIPPED`. Models: `haiku` alias (resolved to the cheapest Claude
model) for Claude Code; `gpt-5.3-codex-low` for Cursor, the cheapest the account's
`--list-models` offered that is not a "fast" variant. Each run used a five-minute limit; none
came near it (11 to 59 seconds).

### What each command line takes

| | Claude Code `claude -p` | Cursor `cursor-agent -p` |
|---|---|---|
| Prompt | argument, or stdin; `-p` is print mode (headless page; `--help`) | argument; `-p` "for scripts or non-interactive use" (`--help`; cli/headless) |
| Working directory | where it is started; `--add-dir` adds more (`--help`) | where it is started; `--workspace <path>` (`--help`; cli/reference/parameters) |
| Model | `--model <alias or full name>` (`--help`) | `--model <id>`; `--list-models` lists them (`--help`) |
| Output | `--output-format text, json, stream-json`; stream-json also wants `--verbose` (headless page) | `--output-format text, json, stream-json` (`--help`; cli/reference/output-format) |
| Limits | `--max-turns`, `--max-budget-usd` (print mode only; cli-reference) | none found in `--help` or the documentation read |
| Permissions | `--permission-mode`, `--allowedTools`, `--disallowedTools`, `--dangerously-skip-permissions`, `--permission-prompts none` (v2.1.259 and later) (cli-reference, headless) | `--force` / `--yolo`, `--sandbox`, `--trust`, and `permissions.allow` / `deny` rules in `~/.cursor/cli-config.json` or `<project>/.cursor/cli.json` (`--help`; cli/reference/permissions) |
| Limiting which settings load | `--setting-sources user,project,local` (`--help`; cli-reference); `--bare` skips them all but then needs an API key, not the signed-in login (headless) | no flag found; the run loaded the signed-in user's own skills (see runs) |
| Resume | `--resume <session_id>`, `--continue`, `--fork-session`, `--session-id <uuid>` (headless; cli-reference) | `--resume [chatId]`, `--continue`; `create-chat` makes an empty chat and prints its id (`--help`; cli/overview) |
| Isolation help | none of its own | `--worktree [name]` runs in a git worktree it makes under its own folder (`--help`) |

### What each returns

| | Claude Code | Cursor |
|---|---|---|
| Exit code | 0 on success, non-zero when the run fails; a failure inside the run, such as no sign-in, is printed as the result on stdout (headless); 143 on SIGTERM | non-zero on failure with an error on stderr; the documentation gives no numbers (cli/reference/output-format) |
| `json` shape (field names, from the runs) | `type`, `subtype`, `is_error`, `result`, `session_id`, `num_turns`, `terminal_reason`, `stop_reason`, `permission_denials`, `total_cost_usd`, `usage`, `modelUsage`, `duration_ms`, `uuid` and timing fields | `type`, `subtype`, `is_error`, `result`, `session_id`, `request_id`, `duration_ms`, `duration_api_ms`, `usage` |
| Last line | end of `result` | end of `result` |
| Resume id | `session_id` | `session_id` |
| Documentation says | "The last line of the stream is a `result` message" for stream-json (headless) | stream-json events: `system`, `user`, `assistant`, `tool_call`, `result`; a failed run "may end without a terminal `result` event" (output-format) |

### Trial runs

Commands are shown with the prompt as `<task>` and paths relative to the probe repository.

| # | Command | Result |
|---|---|---|
| C1 | `claude -p <task> --output-format json --model haiku --setting-sources project --permission-mode acceptEdits --allowedTools "Bash(git *)" --max-turns 12` | exit 0 after 11 s; `is_error` false, `subtype` success, `terminal_reason` completed, `num_turns` 3, `permission_denials` empty; `result` ended `SHIPPED`. Read back from the remote: `git log --oneline probe/claude` listed the agent's commit above the first commit, and `git show probe/claude:HANDOVER.md` printed `## Handover report` and one line. |
| C4 | `claude -p "Which file did you write? End with the line DONE." --resume <session-id> --output-format json --model haiku --setting-sources project --max-turns 3` | exit 0; same `session_id`; the answer named `HANDOVER.md` and ended `DONE`. |
| C3 | as C1, with no `--permission-mode` and no `--allowedTools` (settings: project only) | exit 0 after 16 s, not waiting. `permission_denials` listed three calls (a `git checkout -b` command, a file write, and the same command again), the agent said "Nothing was shipped" and did not print `SHIPPED`. No branch reached the remote. |
| U1 | `cursor-agent -p <task> --output-format json --model gpt-5.3-codex-low --force --trust` | exit 0 after 42 s; `result` ended `SHIPPED`; the remote held `probe/cursor` with the commit and a correct `HANDOVER.md`. |
| U4 | `cursor-agent -p "Which file did you write? End with the line DONE." --resume <session-id> --output-format json --model gpt-5.3-codex-low --trust` | exit 0; same `session_id`; answered `HANDOVER.md` and `DONE`. |
| U3 | as U1 without `--force` | exit 0 after 26 s, not waiting. The agent wrote `HANDOVER.md` but every shell command, even `pwd`, was refused; it said so and **still ended its reply with `SHIPPED`**. The remote had no branch. |
| U5 | as U3, with `.cursor/cli.json` in the project allowing `Shell(git)` and `Write(HANDOVER.md)` | exit 0 after 59 s; commit and push succeeded; the remote held `probe/cursor` with a one-file commit. The allow rules were enough: `--force` was not needed. |

Settings that loaded: for Claude Code, project settings only (`--setting-sources project`)
on C1, C3 and C4; its other user-level instructions were not shown to be excluded by that
flag. For Cursor there is no equivalent flag, and the agent announced it was using one of the
signed-in user's own skills, so U3's and U5's result may reflect the user's own
configuration. The probe repository had no rule files.

### Cursor's cloud agent API (documentation only, nothing run)

From cursor.com/docs/cloud-agent/api/endpoints (v1, public beta), read on 2026-11-02, first
100,000 of about 136,000 characters; the rest was not read.

- **Base and authentication:** `https://api.cursor.com`; an API key as the basic-auth user
  with an empty password, or bearer.
- **Start:** `POST /v1/agents` with `prompt.text` (required), `repos[]` of `url`,
  `startingRef` (branch or full SHA) and `prUrl`, `workOnCurrentBranch` (false puts commits
  on a new `cursor/...` branch), `autoCreatePR`, `model`, `mode` (`agent` or `plan`), `env`.
  It returns the `agent` and its first `run` with status `CREATING`.
- **Read:** `GET /v1/agents/{id}` (status `ACTIVE`, `IDLE`, `ARCHIVED`, and `latestRunId`);
  `GET /v1/agents/{id}/runs/{runId}` for the run's `status` (`CREATING`, `RUNNING`,
  `WAITING_FOR_BACKGROUND_WORK`, `FINISHED`, `ERROR`, `CANCELLED`, `EXPIRED`), `result` (the
  final reply) and `git.branches[]` with `branch` and `prUrl`; a stream of events at
  `.../stream`.
- **Follow-up:** `POST /v1/agents/{id}/runs` with `prompt` (409 `agent_busy` while a run is
  active), or with `delivery: "steer"` to steer the active run.
- **Cancel and delete:** `POST .../cancel` on a run; `DELETE /v1/agents/{id}`.
- **Unproven, and what proving it would take:** all of it. It needs an API key from a Cursor
  account's dashboard and a repository the cloud agent can reach on GitHub, and it runs a paid
  cloud agent. The calls to try are `POST /v1/agents` against a throwaway repository, then
  `GET` on the run until terminal. Also unproven: that a cloud agent's `result` ends with
  the final line, and whether approvals apply there at all (the pages read do not say).
  Cursor's command line is documented to send a conversation to a cloud agent when a
  message starts with `&` (cli/overview, cli/using); the pages say nothing about doing this
  in print mode, and nothing was run.

### Not proven by any run

Claude Code waiting for an answer (it never waited; the documented waiting case is with
an Agent SDK host or `--permission-prompt-tool`); `--permission-prompts none`; Claude
Code started in a plain terminal rather than inside another session; Cursor's exit code on
a failed run; a started agent running this repository's workflow rather than the probe
task; the Claude Code documentation page on the SDK message types, which was read only in
part, so the field names above come from the runs.

## Sources

Worked from the way of working described above, as run in this repository on 2026-11-01,
and from this repository's own workflow, dispatch, backlog and decision records. No
external project's design was used. Cursor's capabilities were first read from its changelog and from third-party
integration docs on 2026-11-01; the second spike checked them against Cursor's own
documentation and trial runs on 2026-11-02. Addresses read on that date:
code.claude.com/docs/en/headless, /cli-reference, /permission-modes and
/agent-sdk/typescript; cursor.com/docs/cli/headless, /cli/overview, /cli/using,
/cli/reference/parameters, /cli/reference/output-format, /cli/reference/permissions and
/cloud-agent/api/endpoints; and the installed tools' `--help`. The text of the evidence
section is the spike's own wording.

## Evidence from the first spike

Run on 2026-11-02 against this repository (public, owner type `User`), main at `f86cc62`.
Tools: git 2.49.0, gh 2.103.2, Node 22.15.0, on macOS 26.2, arm64; git pushed over https
through the `osxkeychain` credential helper; `gh` token scopes `gist`, `read:org`, `repo`,
`workflow`. Refs were named `refs/spike/merge-token-<run>-<name>`, each pointing at a
parentless commit with `main`'s tree whose message reads `holder: probe-x`, `taken: <time>`.
The commands are shown as run; replies are trimmed to the lines that carry the answer.
Worked from no named source: the probes were written from the plan's description and
GitHub's replies.

### Task 2 — Does GitHub accept the ref?

```
git push origin "$A:$P-push"
 * [new reference]   6a7b815… -> refs/spike/merge-token-<run>-push        (exit 0)
gh api -X POST repos/fcapurso/tropis/git/commits -f message=… -f tree="$T"   -> 4567b47…
gh api -X POST repos/fcapurso/tropis/git/refs -f ref="$P-api" -f sha=4567b47…
 {"ref":"refs/spike/merge-token-<run>-api", … "object":{"sha":"4567b476…"}}   (exit 0)
git ls-remote origin "$P-*"
4567b476…  refs/spike/merge-token-<run>-api
6a7b815d…  refs/spike/merge-token-<run>-push
```

Both ways were accepted and both refs came back with the commits sent.

### Task 3 — Is creating one that exists refused?

One at a time, against the held refs:

```
API, same commit again:   {"message":"Reference already exists", … "status":"422"}   gh: … (HTTP 422)
API, a new marker:        the same reply
git push (same commit):   Everything up-to-date          exit 0   <- reports success on a held ref
git push (descendant):    6a7b815..0df3fb9 -> refs/spike/…-push     exit 0   <- the ref moved
git push --force-with-lease="$P-push:" (new marker, ref held):
 ! [rejected] 9a353e5… -> refs/spike/…-push (stale info)             exit 1
```

A plain push of an unrelated commit onto a held ref also exits 1 when it is not a
descendant (a push of the original commit onto the moved ref was refused, exit 1).

At the same moment, five attempts per round, each with its own marker, a fresh ref per
round, the ref's holder checked against the accepted attempt's commit every time:

| Way | Round 1 | Round 2 | Round 3 | Refusals |
|---|---|---|---|---|
| API create | 1 accepted | 1 accepted | 1 accepted | all four others HTTP 422 "Reference already exists" |
| Lock-form push (`--force-with-lease=ref:`) | 1 accepted | 1 accepted | 1 accepted | see below |
| Lock-form push, objects uploaded beforehand | 1 accepted | 1 accepted | 1 accepted | all four others `[remote rejected] … (cannot lock ref '…': reference already exists)` |

In the lock-form rounds with markers uploaded in the same push, most losers did not reach
the ref lock. They failed with the server's `remote: error: unable to write file …/pack/…:
No such file or directory` and `remote: fatal: unable to rename temporary…` (a storage
error on GitHub's side, which appeared only while five pushes uploaded objects together;
the cause was not investigated), and only some with `cannot
lock ref … reference already exists` (one in round 1, one in round 2, none in round 3).
These are server replies and the push failed, so none reported success; but a failed push
does not by itself mean the marker is held, and a taker that gets one must read the marker
before deciding. Uploading the objects first (second lock-form row) removed the storage
errors and showed the lock refusal in every loser. Exactly one attempt was accepted in
all nine rounds. The refs of every round were deleted when it ended.

### Task 4 — Reading the holder, releasing safely

```
gh api "repos/fcapurso/tropis/git/ref/${P#refs/}-api" --jq .object.sha   -> 4567b476…
gh api repos/fcapurso/tropis/git/commits/4567b476… --jq '.message, .committer.date'
 merge token / holder: probe-b / taken: 2026-11-01T23:23:08Z      2026-11-01T23:23:08Z
git fetch origin "$P-api"; git log -1 --format='%B%cI' FETCH_HEAD
 merge token / holder: probe-b / taken: 2026-11-01T23:23:08Z      2026-11-02T00:23:08+01:00
```

Both read the holder and the time. Release:

```
take $P-rel with A (lock-form): [new reference] 71ddc3d…     delete it: [deleted]
take $P-rel with B (lock-form): [new reference] 4e1d454…
git push --force-with-lease="$P-rel:$A" origin ":$P-rel"
 ! [rejected] (delete) -> refs/spike/…-rel (stale info)       exit 1; ls-remote: still 4e1d454… (B)
git push --force-with-lease="$P-rel:$B" origin ":$P-rel"
 - [deleted] refs/spike/…-rel                                  ls-remote: empty
```

The stale holder's delete was refused with the client's `stale info`: git compares the
expected value with the ref it was just told of, and also sends it with the update, but
this probe did not make two deletes collide, so the server's own check of a delete is not
shown. Taking a ref (the rounds above) is shown to be checked on the server.

The API's delete, with no holder named:

```
gh api -X POST …/git/refs -f ref="$P-rel2" -f sha=<A>           -> refs/spike/…-rel2
gh api -i -X DELETE "repos/fcapurso/tropis/git/refs/${P#refs/}-rel2"   -> HTTP/2.0 204 No Content
gh api -X DELETE (again): {"message":"Reference does not exist", … "status":"422"}
```

It succeeded for whoever asks. GitHub's REST page for deleting a reference (linked from the
reply as `rest/git/refs#delete-a-reference`) was not read for a condition parameter, and the
reply carries none; treat the API delete as unconditional.

### Task 5 — Does it start a run, or show as a push?

`gh run list` before the probes (23:22 UTC) and after them (23:27, 23:28, 23:33): the
runs created since the probes began were three `pull_request` runs and one `push` run on
`main`, all on another session's backlog branch (`backlog/claim-another-tools-agent-can-be-started`)
and `main`; none on a `refs/spike/` ref. `.github/workflows/pipeline.yml` runs on pushes to
`main` only, so this was expected; a project with an unfiltered `on: push` would see runs.

The repository events feed showed no `refs/spike/` push at once, nor five minutes later
(23:33 UTC): *not seen within about ten minutes of the first push*. The feed also showed
no push at all since 2026-10-31, although `main` took a push at 23:21 UTC the same day, so
its absence for the spike refs says nothing: the feed does not list pushes promptly.

### Task 6 — Cloud sessions and the merge queue (documented, not probed)

Claude Code's cloud-sessions pages say that in Anthropic-hosted environments git
credentials never enter the session's VM and that GitHub operations go through a proxy;
that the proxy rejects branch deletions and pushes of anything other than a branch; that
`gh api` calls for attached repositories work through the proxy (the token reads as a
placeholder); and that GraphQL is refused. So, from a cloud session, a lock-form push to
`refs/spike/…` and the conditional delete are likely refused, while the REST create and
delete may work. This was not probed: a cloud session cannot be started from here. A person
can settle it by pasting this into a cloud session in a repository attached to it:

```bash
git push --force-with-lease="refs/spike/probe-cloud:" origin "$(git rev-parse HEAD):refs/spike/probe-cloud"
git ls-remote origin 'refs/spike/*'
git push origin :refs/spike/probe-cloud
```

If the first or third is refused, repeat with
`gh api -X POST repos/{owner}/{repo}/git/refs -f ref=refs/spike/probe-cloud -f sha="$(git rev-parse HEAD)"`
and `gh api -X DELETE repos/{owner}/{repo}/git/refs/spike/probe-cloud`.

Merge queue: GitHub's page on managing a merge queue, and the page on merging with one,
state no rule about which repositories may use a queue (they mention a branch protection
setting only); a third page that might (an "about" page) was not found at the address
tried. The repository's owner type is `User`. Not answered: finding out would mean turning
the setting on, which the plan forbids.

### Task 7 — Everything deleted

```
$ git ls-remote origin 'refs/spike/*'
$
```
(empty output, after the cleanup deleted the `-api` and `-push` refs)
