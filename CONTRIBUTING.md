# Contributing to Tropis

There are two ways to contribute. From a project that uses the framework, you send back
what the project learned or built. Or you change the framework here, in this repository.

## From a project

- **Put it in the queue.** When a learning or a new capability would be true for any
  project, not only yours, `/capture-learning` appends it to the project's upstream queue,
  `docs/BLUEPRINT-UPSTREAM.md`.
- **Flush the queue.** `/flush-upstream` is a sitting. Each entry is put to you with all its
  parts, and you flush it, hold it or decline it. A lesson travels as the edit it proposes;
  a capability travels as a shaped backlog entry. The flush goes out under the name in the
  queue's `Flushes as:` line. That name is public, so a private project picks one that does
  not identify it.
- **Pull requests open.** The plan the flush drafts, once dispatched, opens one pull request
  per flushed entry. Each starts from a fresh clone of the framework's `main`, and opens only
  after the framework's self-check passes in that clone. The branch goes to the framework
  repository or, if you cannot push there, to your fork.
- **What you need.** `gh` installed and signed in, and `.tropis/README.md` naming the
  framework's GitHub repository. `.tropis/scripts/submit-upstream.sh` run with `preflight`
  says which of the two is missing.
- **What happens next.** The maintainer takes a flush in with `/absorb-flush`, a group of
  related pull requests at a time. Each one is taken, taken with a stated change, or
  declined with a reason. Taken ones land as one commit each, with you as the author. Your
  pull request is then closed with a comment naming where it landed, or the reason it was
  declined. A declined lesson stays applied in the project that raised it.

The mechanism is decided in `framework/DECISIONS.md` (FW-011) and written out in
`commands/flush-upstream.md`.

## Changing the framework here

Each step is defined in the document it points at.

1. A backlog entry in `feature-catalog.yaml`, started with `/idea`.
2. A plan, written to `rules/planning.md`.
3. A branch in a worktree of its own: `framework/workflow.md`, *Branching*.
4. The self-check: `bash scripts/check-blueprint.sh`. It reads committed content only.
5. For a change to a rule or a framework document, a fresh-agent check:
   `framework/workflow.md`, *Doc closeout*.
6. Review, then a squash-merge through a pull request, since `main` takes nothing else.

The source folders (`rules/`, `framework/`, `commands/`, `scripts/`, `guards/`,
`templates/`) are the next release. The installed copies in .claude/ and .tropis/ are the
last one, and change only by installing a release.

## Not yet

A pull request from a fork runs the pipeline once the maintainer approves the run.

No pull request from a fork has yet run through the pipeline, so a fork's first run is the
first test of it. Nothing yet checks that a flush name is not already used by another
project, so pick one nobody else is likely to.

## Keeping this page true

A change to how a contribution reaches the framework updates this page in the same plan
(`framework/workflow.md`, *Doc closeout*).
