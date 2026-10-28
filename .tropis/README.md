# Project governance framework — working with the framework

This project is developed with the project governance framework, set up inside this
repository: rules, commands and hook wiring in `.claude/`, the framework's code and
checks in `.tropis/`, the backlog in `feature-catalog.yaml`, specs and plans in
`docs/superpowers/`. All of it is committed, so a clone is a working copy.

## Setting up a working copy

    npm --prefix .tropis ci

## What to type

    npm --prefix .tropis run next

`/next` is a report. It does not start the next command. `npm --prefix .tropis run board` writes one page of the open backlog to open in a browser; `/refresh-board` walks through banding and refreshing it; with bands written, `/next` suggests by band. Before merging a change to
`.claude/` or `.tropis/`, run the framework's checks:

    npm --prefix .tropis test

## Where the framework lives

This repository is the framework itself. The release installed here was set up from its
own tag `v0.1.0` with that release's setup script; the source of the next release is in
the folders at the root, starting at `README.md`.

Commands you will type here: `/idea`, `/feature`, `/next`, `/refresh-board`, `/dispatch`,
`/capture-learning`, `/refresh-model-tiers`.
