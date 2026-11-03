# A sprint runs from a cloud session — design

**Date:** 2026-11-03 · **Status:** evidence gathered; the design waits on the probe below

## Why

The developer wants to run a sprint when they are away from their computer. The desktop
app refuses to start sessions on a turn that arrives over Remote Control, and does not
show session cards there, so from a phone the one place left to run `/sprint` is a cloud
session in Claude Code on the web. FW-053 allows that: a cloud session signed in to the
developer's plan adds no charge.

On 2026-11-03 a cloud session tried it on this repository and got as far as `propose`.
What it found is below. Most of it comes down to one thing: the cloud's connection to
GitHub lets a session read and push branches, but refuses every write through `gh`.

## What a cloud session hit

Measured with Claude Code 2.1.317 in a Claude Code cloud session (Anthropic cloud
environment, permission mode auto), Linux x86_64, on a fresh clone at `c4e7722`.
Outbound HTTPS goes through the environment's proxy.

1. **`gh` cannot write.** `merge-token.mjs take` answered
   `Write access to this GitHub API path is not permitted through this proxy. (HTTP 403)`,
   and so did an API branch delete. Reads work: `merge-token.mjs status` and
   `main-status.mjs` gave correct answers. `gh auth status` reports the token as invalid,
   which is misleading, since the proxy adds the credentials. So the token, `gh pr create`,
   `gh pr merge --auto`, the branch update `main-status.mjs --pull-request` makes, and
   `gh run rerun` all fail. A team member can build and push, but not merge.
2. **Branch pushes work, branch deletes do not.** `git push` of a new branch succeeded;
   `git push --delete` hung up and left the branch. Merged branches are deleted by the
   repository's own setting, so only clean-up of abandoned branches is affected.
3. **Starting sessions looks possible.** The session has a tool that creates another
   cloud session in the same environment, which the developer can open on claude.ai/code,
   with a prompt, a model and the branch it pushes to. Nothing was started, so this is
   untested.
4. **The sprint's record lives in the container.** `sprint.mjs` keeps it under the git
   directory, which is gone once the container is reclaimed, so a resumed sprint session
   finds no sprint while its team is still working.
5. **Long waits live in the container too.** A background wait for a blocked item, for
   the token or for another plan ends when an idle container is reclaimed.
6. **No subscription record.** `dispatch.mjs --tier Large` names no model, because the
   record under `.git/tropis/` is never committed and a fresh clone has none.
7. **A fresh clone cannot run the installed scripts** until `npm --prefix .tropis ci` has
   run: `sprint.mjs status` failed on a missing package.
8. **Python's cache folder appears under `.tropis/hooks/`** once the hooks run, so the
   preflight's clean-tree check fails until it is ignored.
9. **A cloud session starts on a branch assigned to it** and is told to push only there,
   while the workflow wants a branch per plan in a worktree of its own.

## The question that comes first

Can a cloud session write to GitHub at all, by some route Tropis can use? Three to try:

- taking and releasing the merge token by `git push` to its ref, with a lease, instead
  of the API, since pushes get through;
- opening, updating and setting a pull request to merge with the cloud session's own
  GitHub tools, and waking on a merge or a red check through them;
- whether the cloud environment can be set to allow `gh` writes.

If none works, a sprint cannot merge from the cloud, and the rest of this epic is not
worth building. If one does, the pieces below follow from it.

## The pieces, in order

1. The probe above.
2. A cloud team member takes the token and merges its pull request by the route the
   probe found, and the workflow says so for a session where `gh` cannot write.
3. The sprint's record lives on GitHub, beside the merge token, so a resumed sprint
   session finds it.
4. A wait that may outlast the container is kept by a scheduled check that wakes the
   session, rather than one long background command.
5. A cloud session can be told which subscriptions the developer holds without anything
   personal being committed, for instance through a variable the cloud environment sets.
6. A fresh clone says to run `npm --prefix .tropis ci` when the installed packages are
   missing, rather than failing on an import.
7. Python's cache under `.tropis/hooks/` is ignored.
8. The workflow says what a cloud session does with the branch it is assigned.

Pieces 6 and 7 are worth doing whatever the probe finds: they hit any fresh clone.
