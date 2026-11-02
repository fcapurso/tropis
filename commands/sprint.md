---
description: Plan a sprint with the developer and run it with a team
---

The developer is the product owner and this session is the sprint session. It plans,
starts team members and reports. It does not shape, plan, review or merge a backlog item,
and it does not decide the order of merges: each team member does those under
`.claude/framework/workflow.md`, *Delivering a backlog item*. Keep this conversation
small: read what the script prints, not the team members' work.

Every step runs `node .tropis/scripts/sprint.mjs`, which reads the backlog on `origin`'s
main branch and keeps the agreed sprint in a local file git does not track, so a sprint
survives this conversation being reset. **Start by running
`node .tropis/scripts/sprint.mjs status`.** If it shows a sprint, carry on with it; if it
says none is under way, plan one.

## 1. Plan

Run `node .tropis/scripts/sprint.mjs propose`, or `propose --points <n>` when the
developer names a budget; 20 effort points is where it starts. Show the proposal and say
how team members will start (below). The developer adds, drops, reorders and resizes it;
run `propose` again for a new budget. A backlog item you find missing a `blockedBy` while
looking is proposed to the developer like any backlog edit. What the developer agrees is
what the team is approved to do: each backlog item, in that order, carried through the
whole workflow to its own merge.

## 2. Start the whole team, on the developer's word

When the developer says to start, in that same turn run
`node .tropis/scripts/sprint.mjs start <id> ... --points <n> --way <way>`, with the ids
in the agreed order, and then start every team member at once: one per backlog item, or
per bundle (one brief, for the bundle's first backlog item, naming the others). Do not
keep any for later — a later turn may not be one the developer typed, and some tools
refuse to start a session on such a turn. A backlog item blocked by another starts too:
its team member waits by itself until that backlog item ships. Pass each team member the
brief `node .tropis/scripts/sprint.mjs brief <id>` prints, as it stands, and run
`node .tropis/scripts/sprint.mjs mark <id> planning` for it. For `session`, start each
team member on the model the last line of `start` names: the first pick of the Large
tier that a subscription the developer holds includes, since a team member shapes,
plans and reviews. Where that line names none, start it on the tool's default model.

| `--way` | How | Where |
|---|---|---|
| `session` | one session of this tool per team member, which the developer can open | a tool that starts sessions, such as the Claude desktop app |
| `here` | this session delivers the backlog items itself, one at a time, in sprint order | every tool; the fallback |
| `claude` | one Claude Code command-line run per team member, started with `sprint.mjs launch` | a sprint session in Cursor |
| `cursor` | one Cursor command-line run per team member, started with `sprint.mjs launch` | a sprint session in Claude Code |

For `claude` or `cursor`, start each team member with
`node .tropis/scripts/sprint.mjs launch <id>` in place of a session and its brief,
and `--tool <tool>` to start one backlog item in a tool other than the sprint's way.
`launch` starts each team member on the Large tier's first pick that the developer's
subscription in that tool includes, by the name that tool's command line takes, or says
why it starts on the tool's default model; pass `--model <model>` only to choose
another. Each run starts at once, waits by itself for what its backlog item
is blocked by, and works with nobody watching. Then run `node .tropis/scripts/sprint.mjs watch` as a background
command where this tool runs them; each time it ends, tell the developer the line it
printed unless it is `SHIPPED`, and run it again until it says none is running.

Never start a team member of this tool that the developer cannot open, such as a
subagent of this session or this tool's own command line run in the background. The
other tool's command line is the exception: `status` names the command that opens
each run's session. Every team member runs signed in to
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
naming the backlog item and its reason. A `SHIPPED` line needs nothing: `status` reads
shipped from the main branch, and a backlog item the main branch does not show as shipped
is not shipped. Record each decision a team member reports with
`node .tropis/scripts/sprint.mjs note <id> <decision>`.

## 4. New backlog items

When `status` lists backlog items new in the backlog since the start, raise them, bugs
first, and offer to slide each into the sprint. On the developer's word,
`node .tropis/scripts/sprint.mjs add <id>` adds one and says which backlog items not yet
started would then fall outside the budget; drop those with
`node .tropis/scripts/sprint.mjs drop <id>` only on the developer's word. Start the new
backlog item's team member in that same turn, as in step 2. Start it on the model the
last line of `add` names.

## 5. End

When every backlog item has shipped, parked or stopped, or the developer ends the sprint,
run `node .tropis/scripts/sprint.mjs end` and report what it prints: what shipped and its
points, points per hour, what was parked and what the developer must decide, what stopped,
the decisions team members reported, and the new backlog items.
