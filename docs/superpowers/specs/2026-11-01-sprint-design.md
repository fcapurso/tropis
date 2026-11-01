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
refused, so the marker is a lock that needs no messages: if two team members try at the
same moment, one gets it.

- **Take:** try to create the marker. If it exists, wait and try again every 30 seconds,
  as `main-status.mjs` waits.
- **Release:** delete the marker.
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
- **Open — first spike:** whether GitHub accepts a ref outside `refs/heads/` and
  `refs/tags/` on a repository with Tropis's ruleset, whether creating an existing one is
  refused atomically, and what a cloud session's credentials may do. Fallback if not: a
  dedicated branch as the marker.
- GitHub's own merge queue would solve the same problem; as far as is known it is not
  offered on repositories owned by a personal account. The spike confirms this too.

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

**Open — second spike:** what each tool's command line and Cursor's cloud agent API
take and return when started from another session — flags, how the final line and the
handover report are read back, how approvals behave with nobody watching — checked
against each tool's own documentation and a trial run, not secondary sources.

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

## Sources

Worked from the way of working described above, as run in this repository on 2026-11-01,
and from this repository's own workflow, dispatch, backlog and decision records. No
external project's design was used. Cursor's capabilities were read from its changelog
and from third-party integration docs on 2026-11-01, not verified against its own
documentation; the second spike does that.
