---
description: Plan a sprint with the developer and run it with a team
---

The developer is the product owner and this session is the sprint session. It plans,
starts team members and reports. It does not shape, plan, review or merge an entry,
and it does not decide the order of merges: each team member does those under
`.claude/framework/workflow.md`, *Delivering an entry*. Keep this conversation small:
read what the script prints, not the team members' work.

Every step runs `node .tropis/scripts/sprint.mjs`, which reads the backlog on `origin`'s
main branch and keeps the agreed sprint in a local file git does not track, so a sprint
survives this conversation being reset. **Start by running
`node .tropis/scripts/sprint.mjs status`.** If it shows a sprint, carry on with it; if it
says none is under way, plan one.

## 1. Plan

Run `node .tropis/scripts/sprint.mjs propose`, or `propose --points <n>` when the
developer names a budget; 20 story points is where it starts. Show the proposal and say
how team members will start (below). The developer adds, drops, reorders and resizes it;
run `propose` again for a new budget. An entry you find missing a `blockedBy` while
looking is proposed to the developer like any backlog edit. What the developer agrees is
what the team is approved to do: each entry, in that order, carried through the whole
workflow to its own merge.

## 2. Start the whole team, on the developer's word

When the developer says to start, in that same turn run
`node .tropis/scripts/sprint.mjs start <id> ... --points <n> --way <way>`, with the ids
in the agreed order, and then start every team member at once: one per entry, or per
bundle (one brief, for the bundle's first entry, naming the others). Do not keep any for
later — a later turn may not be one the developer typed, and some tools refuse to start
a session on such a turn. An entry blocked by another starts too: its team member waits
by itself until that entry ships. Pass each team member the brief
`node .tropis/scripts/sprint.mjs brief <id>` prints, as it stands, and run
`node .tropis/scripts/sprint.mjs mark <id> planning` for it.

| `--way` | How | Where |
|---|---|---|
| `session` | one session of this tool per team member, which the developer can open | a tool that starts sessions, such as the Claude desktop app |
| `here` | this session delivers the entries itself, one at a time, in sprint order | every tool; the fallback |

Never start a team member the developer cannot open, such as a subagent of this
session or a command line run in the background. Every team member runs signed in to
the plan the developer already pays for, never on a key billed per use. The sprint adds
no limit of its own to what a team member may run: that is the tool's permission
settings, and a permission prompt is answered in that team member's session.

## 3. Where are we?

When the developer asks, run `node .tropis/scripts/sprint.mjs status` and report it as it
stands. Team members that stopped or parked come first, with their reasons: each one
waits for the developer in its own session. It also shows who holds the merge token: a
token it marks stale is broken only on the developer's word, with the command it names.

When a team member's last line reaches you, or `status` shows a new stopped or parked
one, tell the developer the tool's way, with a notification where the tool has one,
naming the entry and its reason. A `SHIPPED` line needs nothing: `status` reads shipped
from the main branch, and an entry the main branch does not show as shipped is not
shipped. Record each decision a team member reports with
`node .tropis/scripts/sprint.mjs note <id> <decision>`.

## 4. New entries

When `status` lists entries new in the backlog since the start, raise them, bugs first,
and offer to slide each into the sprint. On the developer's word,
`node .tropis/scripts/sprint.mjs add <id>` adds one and says which entries not yet
started would then fall outside the budget; drop those with
`node .tropis/scripts/sprint.mjs drop <id>` only on the developer's word. Start the new
entry's team member in that same turn, as in step 2.

## 5. End

When every entry has shipped, parked or stopped, or the developer ends the sprint, run
`node .tropis/scripts/sprint.mjs end` and report what it prints: what shipped and its
points, points per hour, what was parked and what the developer must decide, what
stopped, the decisions team members reported, and the new entries.
