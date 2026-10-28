# What absorbing one project's flush took — finding, 2026-10-19

Evidence for shaping `maintainer-absorbs-contributions-in-groups`. Written while the
batch was being absorbed, group by group; a section that says *pending* has not been
reached yet.

## The batch

first-adopter's upstream flush of 2026-10-19 opened one pull request per queue entry,
#49 to #85: 37 pull requests, all from branches `upstream/first-adopter/2026-10-19-*`, all
on the same base (`d3b5da3`, `main` at the time). A 38th, entry 6
(`2026-10-19-checkouts-as-dispatch-reads-them`, editing `rules/planning.md`), had not
arrived when the review started at about 11:40 UTC: no pull request and no branch.

The review session was a cloud session with the repository and the GitHub connector, no
`gh` CLI. Listing the pull requests took one call. Getting each one's changed files took
one `git fetch` of the 37 branches and a `git diff --stat` loop — far cheaper than one
connector call per pull request, and the loop is the obvious thing to automate.

## Grouping

The maintainer's brief proposed a grouping by file. Checked against the diffs, it was
right in shape and wrong in six places:

- **#76 was in no group.** It edits `rules/tests.md`, a file no other pull request
  touches. It forms a group of one.
- **"Backlog plus a prose edit" is not one kind of thing.** Its five members edit five
  different prose files: #52 `rules/learnings.md`, #62 `rules/catalogs.md`, #66
  `framework/workflow.md`, #70 `framework/workflow.md` + `rules/planning.md` +
  `templates/README.md`, #85 `commands/capture-learning.md` + `commands/flush-upstream.md`
  + `framework/DECISIONS.md`. Each prose half belongs with the group of its file; only
  the catalog half belongs with the backlog batch.
- **`rules/catalogs.md` has three editors, not two:** #49, #59 and #62.
- **`commands/capture-learning.md` has two:** #53 and #85.
- **Pull requests reach files the grouping did not name:** #54 also edits
  `scripts/capture-at-merge.sh`; #68 also edits `guards/set-up-project.test.js`; #69 also
  edits `PORTABILITY-NOTES.md`; #84 edits `commands/manual-check.md` and
  `commands/release.md` besides `rules/harness-scripts.md`.
- **Not every backlog pull request appends.** #78 reshapes an existing entry in the
  middle of the file, so it merges cleanly beside the appends.

Grouping by file is therefore a good first cut and a poor final one: a pull request that
touches several files belongs to several groups, and the useful unit for a decision is
the *file*, while the useful unit for a merge is the *pull request*. A tool that groups
should show both.

## Group 1 — backlog only

Twelve pull requests: #51, 58, 61, 63, 67, 72, 73, 78, 80, 81, 82, 83. Each adds one
entry to `feature-catalog.yaml` except #78, which shapes `hooks-match-at-command-position`.

**Combining them.** Tried in a scratch worktree before anything was proposed:

1. Plain sequential `git merge` of the twelve: the first and #78 merged; the other ten
   each conflicted, because each appends after the same last line.
2. `merge=union` for `feature-catalog.yaml`: all twelve merged without a conflict, the
   self-check (`scripts/check-blueprint.sh`) passed — and the result was wrong. Union
   merge drops lines it sees repeated across the conflicting sides, so most new entries
   lost `type`, `layer`, `modules` and `refs`. The self-check does not look at this
   repository's catalog; only `npm --prefix .tropis test`
   (`catalog-entries` › *gives every entry every required field*) caught it. **Union
   merge is unsafe for a YAML list whose entries share line text, and a green self-check
   is not evidence the catalog is whole.**
3. Verbatim append: check that each branch's catalog begins byte-for-byte with `main`'s,
   append the rest in pull-request order, then merge #78 normally. Both checks passed;
   290 lines added, 3 removed. This is mechanical and is the step to automate.

**Side effects a combined branch owes.** The backlog board reports eleven new ids with
no band and one band (`hooks-match-at-command-position`) whose entry moved. Banding is
the maintainer's judgment, so the combined branch is where it gets done, not in the
contributors' pull requests.

**Judgment needed.** Three entries carried decisions rather than facts: #80 removes the
starter roster of model-tier picks; #83 chooses to read a wrapped header field, where
the existing idea `dispatch-refuses-a-blank-header-field` would refuse it; #82 is a
large feature shaped from one adoption. The rest were accept-or-not on their face.

**One pull request per group — settled by the maintainer.** The first proposal held the
backlog group's pull request open until group 2 was decided, so the catalog halves of
the mixed pull requests could join it. The maintainer read that as one pull request for
everything and expected one per group. Settled: one pull request per group, merged when
that group is decided, and a mixed pull request travels **whole** with the group of its
prose — its catalog entry included. The price is one end-of-file conflict on
`feature-catalog.yaml` for each later group that adds an entry, resolved by the same
verbatim append. A tool should state the unit of merge up front; "group" alone was
ambiguous between *a decision* and *a merge*.

That dissolves "backlog plus a prose edit" as a group: its members join the group of
their prose file.

**Late arrival.** Entry 6 arrived during the group 1 review as #86 (`rules/planning.md`,
same base `d3b5da3`). It joins the planning group. A tool that lists a flush has to be
re-runnable mid-review, and should say what changed since the last listing.

**Decisions.** Nine entries were accepted on their face. The three judgment calls took two
more rounds with the maintainer, and both rounds corrected the reviewer:

- *#80, model-tier picks.* I first proposed keeping a starter roster, in the belief that
  dispatch would refuse without one. Reading `scripts/dispatch.mjs` showed it already
  prints the prompt with no roster, so the risk I had named did not exist. The
  maintainer took the entry as submitted: Tropis ships no picks. **A recommendation that
  rests on how the code behaves needs the code read before it is made, not after it is
  questioned.**
- *#82, adopting into an existing framework.* Taken as an `idea`, its draft criteria kept
  in a comment. Two of them cannot be tested as written, and it was designed from one
  adoption.
- *#83, reading a wrapped header field.* Folded into the existing
  `dispatch-refuses-a-blank-header-field` rather than linked, so one plan changes the
  parser once. Folding meant writing one criterion (refusing a field that parses empty),
  which is a small piece of shaping inside a review, shown to the maintainer before it
  was committed.

The maintainer asked for impact, pros and cons before deciding. A tool that presents
judgment calls should present them in that form from the start.

**Banding.** Ten new ids and two moved bands were proposed in the same branch, following
`/refresh-board`. Four ids that were already unbanded on `main` were left alone, because
they belong to no pull request in the batch.

**Result.** One pull request, #87, on `backlog/first-adopter-flush-2026-10-19` (commit
`50e615b`). It changes `feature-catalog.yaml` and `docs/backlog-board/bands.yaml`; the
self-check passed on that commit, and so did 28 of 28 project checks.

**Process slip.** A tool call that the maintainer rejected had already committed and
pushed before the rejection took effect. The reviewer reported "nothing committed" and
found the commit only on the next run. A step that commits and pushes should be split
from the step that asks, so a stop lands before the write.

**Merge.** CI (`self-check`) went green on #87, `main` had not moved, and it was
squash-merged as `07d35ba` with an explicit subject and body. Deleting the merged branch
from the session failed: the cloud session's git proxy refused the push that deletes it
(HTTP 403), so the maintainer deletes it by hand. A tool run from such a session needs
another way to delete branches, or should say up front that it cannot.

**Closing comments.** Twelve, posted and closed in two parallel batches of tool calls.
Nine said: *"Taken in by #87, unchanged, as `<id>` (band X). Thank you — closing this one
in favour of the combined change."* The three judgment calls each named what changed and
why: #80 that the comment above the entry records the reversal; #82 that it is an idea,
which two criteria cannot be tested, and that its criteria are kept verbatim; #83 that it
was folded into an existing entry with one criterion added. Every comment ended with the
attribution footer. The nine are pure templating; the three are a sentence of judgment
each, already written during the decision.

**Time.** About three hours from first listing to merge, most of it in the three
judgment calls and two rounds of explanation. The mechanical parts (listing, diffing,
combining, checking, closing) took minutes of tool time each.

## Group 2 — `rules/planning.md`

Seven pull requests: #50, 55, 56, 57, 75, 86, and #70 whole (#70 also edits
`framework/workflow.md` and `templates/README.md`, and adds a catalog entry).

**Combining them.** In pull-request order, #56 conflicts with #55 (both insert after
the same bullet), and #70's catalog entry conflicts with #87's appends. Both are
adjacent-insertion conflicts with an obvious resolution: keep both.

**What reviewing needed that listing did not show.**
- Every contribution writes each paragraph as one long line; the file wraps at about 88
  columns. Rewrapping is mechanical and the review should do it, not the contributor.
- #75 states as general that `git grep -E` does not implement `\b`. On this session's
  Linux (git 2.43, glibc) it does: a planted hit was found by `-E`, `-P` and `-F` alike.
  The lesson was measured in a project on macOS. The advice holds; the claim needs its
  platform. **A claim about tool behaviour has to be re-checked on the reviewer's
  machine, and it can come out differently.**
- #86 cites `checkoutName()`; reading it confirmed the claim (first backticked span).
- #70's `templates/README.md` part is about a fresh project's first install, not about
  worktrees. It is true (`set-up-project.sh` prints the same instruction), but it is a
  second thing riding along.
- Rule changes ask for a fresh-agent check. In this repository, source rules reach an
  agent only once a release installs them, and past source-rule commits record no
  check. That is a question for the maintainer, not a mechanical step.

**Decision.** Accepted in one round: all seven, with #75's claim scoped to its platform;
the fresh-agent check deferred to the release that installs these rules, and said so in
the commit body. Laying out the facts first (what was checked, and on which machine)
made this round a single yes, where group 1 took three.

**Combining, as done.** `git diff main...branch | git apply -3` per pull request onto a
fresh branch. #56's conflict with #55 needed the conflict markers stripped (keep both);
#70's catalog entry went in by the verbatim append. The rewrap was a script over lines
added and longer than 88 columns. All of this is mechanical. The commit was made and
checked first, and pushed in a separate step, after group 1's rejected-but-executed
push.

Pull request #88, commit `2c90970`; self-check exit 0, 28 of 28 project checks.

Merged as squash `e267a26` and its seven pull requests closed — then replaced; see the
next section.

## Squash or keep the commits — and rewriting `main`

Building group 3, the reviewer named the cost of one pull request per group: one squash
commit carrying six unrelated lessons, no way to revert one alone, and a subject that
strains the workflow's "one thing that becomes true". The maintainer overruled the
squash for flushed contributions. **The squash rule exists because a plan's branch
serves one catalog entry; a group of flushed contributions is many things, so it keeps
one commit per contribution and lands by rebase.** A plan for a single entry keeps
the squash.

Groups 1 and 2 had already been squashed. The reviewer first advised against rewriting
`main` (a force-push strands every clone), and offered a mapping table instead. The
maintainer chose the rewrite: they are the only developer, and their machine was still
on the flush's base, so nothing would be stranded. **Whether rewriting is safe is a fact
about who has pulled, and only the maintainer knows it.**

**How the rewrite was done.** On a branch from the flush's base:

- Each contribution became one commit: the contributor's own commit, re-applied with
  its author, date and message, then a line naming its pull request and what changed in
  absorbing it (rewrapped; taken as an idea; folded into an existing entry; scoped to a
  platform). Each band went into the commit of its entry. Rule commits also carry the
  fresh-agent line, which a commit touching rules owes.
- Conflicts were resolved in the later contribution's commit, and its message says so:
  #56 "follows #55's two bullets, which insert at the same place"; #71 "placed before
  the fresh-agent bullet, which #66 had already widened". Catalog entries appended at
  the end were added verbatim, after checking that the contributor's file began
  byte-for-byte with the base, so they never conflicted.
- Each group's last commit was checked byte-identical to the squash it replaced
  (`07d35ba`, `e267a26`). So CI's earlier pass held, and nothing had to be re-reviewed.
- `main` was force-pushed with a lease on its old head; the proxy allowed it.

The reviewer's first attempt at #71's commit misplaced a bullet inside the paragraph
before it; the byte comparison caught it. **A rebuild is only as good as its
comparison against the approved text.**

**Pointing the contributors at the right place.** The closing comments said "Taken in by
#87". After the rewrite #87 still exists, but its commit is not on `main`. All nineteen
comments were edited, not added to, to open with "Landed on `main` as `<commit>`
(reviewed in #87)". #87 and #88 each got a comment mapping their pull requests to the
commits that replaced them. For group 3, the closing comments are written only after the
rebase-merge, because GitHub's rebase-merge gives every commit a new hash. **Close an
absorbed pull request with the commit that carries it, once that commit has landed.**

| From | Commit on `main` | From | Commit on `main` |
|---|---|---|---|
| #51 | 127f37f | #83 | 63aad5b |
| #58 | 6953283 | #50 | 8b641c2 |
| #61 | 383bd8b | #55 | 2f293ad |
| #63 | 609c45a | #56 | 29059cb |
| #67 | 7092e71 | #57 | 4d402b0 |
| #72 | d8045e3 | #75 | ffb6678 |
| #73 | 64a6945 | #86 | 0a21ac4 |
| #78 | 4bf323a | #70 | d4ebc35 |
| #80 | 8d412aa | | |
| #81 | d8c4cd3 | | |
| #82 | c467bb7 | | |

Every pull request's original commit also stays reachable on GitHub as
`refs/pull/<N>/head`, even after its branch is deleted.

**Mechanical or judgment.** All of the rebuild was mechanical once the decisions were
made: re-applying commits, appending entries, rewrapping, adding a note line,
comparing trees, editing comments. A tool could do it. Judgment went into whether to
rewrite at all, and into the one-line note on each commit.

## Group 3 — `framework/workflow.md` and `framework/commit-format.md`

Pull request #89: #54, 66, 68, 71, 77, 79, and one commit of the maintainer's. #69 was
declined. It proposed an open scope list kept sortable by reusing names found in
`git log`. The maintainer's objection: reading the history has no stopping point; the
whole of it does not scale, and the last few commits bring back the drift. A fixed list
in the project's own `CLAUDE.md` stays, growing only when none fits, with the reason in
the commit body. #68 and #69 edited the same paragraph with opposite intent, the one
real conflict of judgment in the batch.

Rebase-merged as `7e5737e`…`601967b` after the rewrite; its six pull requests and #69
closed with the landed commit named. CI sat queued for about ten minutes before a
runner picked it up. A tool should wait on CI without the maintainer having to ask.

## Groups 4 to 7

All four ran the same way, each in one round with the maintainer. Each round: the
reviewer showed every change with a recommendation, the maintainer said yes, and the
reviewer built the commits, ran both checks, opened the pull request, rebase-merged it
when CI passed, and closed the originals naming their commits.

| Group | Pull request | Contributions | What review changed |
|---|---|---|---|
| 4 — `rules/catalogs.md` | #90 | #49, #59, #62 | Tropis backlog ids taken out of a rule that ships to every project; #59 and #62 edit one bullet, and #62's commit carries both |
| 5 — hook rules | #91 | #64, #65, #84 | #64's sentence on permission keys reworded to avoid repeating the rule (see the correction below); #84 changes a block's shape, which `RELEASES.md` counts as breaking, so a release note was added |
| 6 — commands and templates | #92 | #53, #60, #74, #85 | none; #85 amends FW-011 to one pull request per entry |
| 7 — one-offs | #93 | #52, #76 | none |

What only reading the code found: #62's guard really is missing from set-up projects
(`.tropis/guards`); #84's old block tail survives an update, because `carryBlocks` carries
a block's lines by position; #85's "lesson(s)" is in `scripts/next.mjs:127`; and
`templates/rule-claims.test.js` exists but nothing installs it. Each confirmed or
corrected a contribution, so **the reviewer reads the code a claim names, every
time.** That is judgment, not something to automate away.

**A correction, found after the merge.** The reviewer cut #64's claim that Cursor reads
`"allow"` as the hook approving the call, as unmeasured, having checked it against the
rule's table only. The same rule already said it, in its bullet on `hook-reply.sh`, a few
lines above the table. The reworded sentence is still true; the reason given to the
maintainer and the contributor was not, and #64's closing comment was corrected. **Check
a claim against the whole file it lands in, not only the nearest evidence.**

**The rewrap is not a one-liner.** The first rewrap understood only `- ` bullets. In
group 6 it merged `flush-upstream.md`'s YAML front matter and numbered steps into
paragraphs, and joined a bold heading and a `→` line to their text. The diff caught it
before anything was pushed. The working version wraps only an item a contribution
touched, together with that item's continuation lines, and leaves front matter, fenced
code, tables and `→` lines alone. Groups 2 to 5 were unaffected: their full diffs had
been read. **A mechanical step that rewrites prose still needs its full diff read.**

## What it took

About six and a half hours, from the first listing at 11:40 UTC to the last merge, for
38 pull requests in 7 groups. Thirty-seven were taken in (#83 folded into an existing
entry) and one, #69, was declined. The time went:

- **Decisions, about half.** Three rounds on group 1's judgment calls; one on how many
  pull requests a group makes; one on #69's scope list; three on squash versus commits,
  rewriting `main`, and the closing-comment pointers. Each was the maintainer's to make.
- **Reading the code a claim names.** Roughly one check per group, each a minute or two,
  each worth it.
- **Mechanical work.** Listing, diffing, combining, rewrapping, checking, opening, merging,
  closing: minutes of tool time per group, but most of the rework (union merge, the
  misplaced #71 bullet, the group 6 rewrap) happened here.
- **Waiting on CI.** Three to ten minutes per group, during which the next group was
  reviewed.

**Mechanical enough to automate:** listing a flush and its changed files; grouping by
file and flagging pull requests that span groups or edit the same lines; re-applying
each contribution as its own commit with author, date, message and a note line;
appending catalog entries after a base-prefix check; rewrapping touched items; comparing
the result against approved text; running both checks on the exact head; waiting for CI;
rebase-merging; closing each original with its landed commit; listing branches to
delete.

**Judgment:** whether each contribution is right (read the code it names); what to change
when it is not quite; which of two conflicting contributions stands; bands; whether
history may be rewritten; the one-line note on each commit.

**What the environment did:** this cloud session's git proxy refused branch deletion
(HTTP 403) but allowed a force-push with a lease. The tool classifier refused an
amend and a force-push until the maintainer approved them in so many words. A rejected
tool call had already committed and pushed before the rejection. Branches left for the
maintainer to delete: `backlog/first-adopter-flush-2026-10-19`,
`rules/planning-from-first-adopter-flush`, `framework/workflow-from-first-adopter-flush`,
`rules/catalogs-from-first-adopter-flush`, `rules/hooks-from-first-adopter-flush`,
`commands/from-first-adopter-flush`, `rules/one-offs-from-first-adopter-flush`,
`rewrite/main-2026-10-19`, and the 38 `upstream/first-adopter/2026-10-19-*`.

**A rule that was never the repository's.** Every change in this absorption reached `main`
through a pull request, the finding and a plan file included, because the brief that
opened the session said "never push to main directly". The workflow lets plan, spec and
backlog files go straight to `main`, and the same brief allowed it for the finding. The
reviewer applied the stricter line to everything without checking it against the
repository's own rule. Shaping should not read the pull requests for #94 to #96 as a
requirement: what goes through a pull request is what the workflow says needs a branch.

## Proposed acceptance criteria for `maintainer-absorbs-contributions-in-groups`

Proposed, not decided; shaping the entry is a separate pass.

1. A command lists a flush's open pull requests with the files each changes, groups them
   by file, and flags each pull request that spans groups and each pair that edits the
   same lines. Re-run mid-review, it says what arrived since the last listing.
2. For a group the maintainer has decided, it builds one branch with one commit per
   accepted contribution: the contributor's commit re-applied with its author, date and
   message, plus a line naming the pull request and what changed in absorbing it.
3. Contributions apply in a fixed order. A conflict is resolved in the later commit, and
   its message says so. A catalog entry appended at the end goes on verbatim once the
   contributor's file is checked to begin with the base.
4. Rewrapping touches only the items a contribution changed, and leaves front matter,
   lists, tables, fenced code and `→` lines as they are.
5. Before asking to merge, it compares the branch with the text the maintainer approved
   and runs the framework's self-check and the project's checks on the exact head, and
   shows both results.
6. It merges by rebase only after the maintainer says so, and never pushes to `main`.
7. After the merge, it closes each absorbed pull request with a comment naming the commit
   on `main` that carries it, and each declined one with the reason; it lists the
   branches left to delete.
8. A plan for a single catalog entry still lands as one squash-merge, and the workflow
   names the exception for flushed groups.
