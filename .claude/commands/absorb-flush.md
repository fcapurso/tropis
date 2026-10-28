---
description: "Take in a project's flush: list its pull requests, decide them a group at a time, and land each group as one pull request with one commit per contribution."
---

This command lives in this repository only and never ships. No release installs
it into a project. Nothing here pushes, merges or closes until the maintainer
has said yes, and the script it runs never talks to GitHub.

The unit of merge, before anything else: one pull request per group; one commit
per contribution, with its contributor as author; landed by rebase; a pull
request that edits several files travels whole with the group of the file it
changes most.

## 1. Preflight

`gh auth status` must succeed, and the account must be able to push to this
repository. Otherwise say so and stop. Nothing in the command works without
both.

If the flush's branch prefix was not given, ask for it. An example is
`upstream/first-adopter/2026-10-19-`.

## 2. List

```bash
gh pr list --state open --limit 200 --json number,title,url,headRefName,files \
  | node .github/scripts/absorb-flush.mjs list <prefix>
```

Show the output. State the unit of merge from the top of this command before
anything else you say about the listing. Invite the maintainer to move pull
requests between groups.

Re-run the listing whenever the maintainer asks or a new group starts, and say
what arrived.

## 3. Decide one group at a time

For each pull request, read its whole diff:

```bash
git diff $(git merge-base refs/absorb/<N> origin/main) refs/absorb/<N>
```

Where it claims something about how code or a tool behaves, read that code or
run that tool first, and name the file and line, or the command and machine,
in the recommendation. Check the claim against the whole file the contribution
lands in, not only the nearest evidence. Give a recommendation for each.
Present a judgment call with its impact, pros and cons, and present pairs the
listing flagged together. Ask the maintainer for each to be taken, taken with
a stated change, or declined with a reason. Wait for the answers.

## 4. Build

In a sibling worktree, on a new branch started from `origin/main`:

```bash
git worktree add ../tropis-absorb-<group-slug> -b absorb/<group-slug> origin/main
npm --prefix ../tropis-absorb-<group-slug>/.tropis ci
```

Run every command from here to step 7 in that worktree.

For each accepted pull request, in number order, with a one-line note saying
what changed in absorbing it (`taken unchanged` when nothing did):

```bash
node .github/scripts/absorb-flush.mjs apply <N> <url> --note "<note>"
```

The script appends `; rewrapped to 88 columns` itself when a rewrap changed
the text. Do not put that clause in the note.

On exit 3, resolve the conflict in the later contribution, keeping both where
both stand, and run:

```bash
node .github/scripts/absorb-flush.mjs commit --note "<how>"
```

A conflict between two that cannot both stand goes back to the maintainer.
Make a stated change as one more edit inside that contribution's commit
(`git commit --amend`), keeping the author and the `Absorbed from` line, with
the note updated. Band new catalog entries in one last commit, following step
2 of `.claude/commands/refresh-board.md`:

```text
backlog: band the entries absorbed from <project>'s flush
```

## 5. Check and ask

Show the full diff. A rewrap still needs its diff read.

```bash
git diff origin/main...HEAD
git rev-parse HEAD
bash scripts/check-blueprint.sh
npm --prefix .tropis test
```

Show both results with that sha. Then ask whether to push and open the pull
request. Push nothing in this step.

## 6. Push and open, after a yes

```bash
git push -u origin absorb/<group-slug>
```

`gh pr create` with a body listing every pull request in the group and what
became of it: taken, taken with a change (say which), or declined (say why).
Wait for CI:

```bash
gh pr checks <number> --watch
```

Then ask whether to merge.

## 7. Merge, after a yes

In this order. Never squash a group, and never push to `main`. Note the sha the
first line prints: step 8 needs it.

```bash
git fetch origin && git rev-parse origin/main
git worktree remove --force ../tropis-absorb-<group-slug>
git branch -D absorb/<group-slug>
gh pr merge <number> --rebase --delete-branch
```

## 8. Close

```bash
git fetch origin
node .github/scripts/absorb-flush.mjs landed <sha of origin/main before the merge>
```

Close each absorbed pull request:

```bash
gh pr close <N> --comment "Landed on main as <short sha>, reviewed in \
<group pull request URL>: <note>. Thank you."
```

Close each declined one with the reason the maintainer gave. List the head
branches of the closed pull requests and the `refs/absorb/*` refs for the
maintainer to delete. Delete none of them.

## Do not

- Push or merge in the step that asks.
- Squash a group.
- Push to `main`.
- Close a pull request before the commit carrying it has landed.
- Absorb a pull request with more than one commit without asking.
- Use a union merge.
