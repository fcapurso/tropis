# Conformance fixtures

A small project with faults planted in it, so every guard can be seen to fail.

**A guard that has only ever passed is not evidence.** It may be correct; it may also be
checking nothing, and the two look identical from the outside. Nine verification checks
written while this framework was being built turned out to be in the second group.

## Layout

- `base/` — a clean sample project. Every guard passes against it.
- `defects/<name>/` — an overlay holding **only** the files that differ. Copied over a
  fresh copy of `base/`.
- **When `INSTRUCTIONS` names a blueprint checkout** (`check-blueprint.sh` sets it),
  `compose()` lays that blueprint's shipped rule texts and their areas, framework
  documents, commands and entry-file templates over `base/`, so the clean baseline checks the real instruction
  layer rather than the stubs. That is why `base/docs/` holds documents nothing in the
  sample project uses: the shipped prose names them, and a set-up project has them.
  `base/docs/backlog-board/bands.yaml` is the header-only bands file the refresh command names.
- `compose()` installs the hooks and scripts named in `scripts/installed-hooks.txt` and
  `scripts/installed-scripts.txt` under `.tropis/hooks/` and `.tropis/scripts/`, as
  the setup does, and runs the shipped rule generator. The composed project carries a
  record written by `compose()`, at version `conformance`. The base holds its shipped
  stubs in `.tropis/rules/`, their areas in `.claude/rule-areas.json`, and one
  additions file in `.claude/rule-additions/<name>.md`; never a generated file: no
  `.mdc`, and no `.claude/rules/` file for a shipped rule.

**`base/` carries no hook scripts of its own, on purpose.** `compose()` copies in the
ones that actually ship — the lists are `scripts/installed-hooks.txt` and
`scripts/installed-scripts.txt`, the same files the setup installs from — after the base
and before the defect overlay. A fixture
holding its own copies would be the thing checked instead of the thing shipped, and the
two would drift apart silently: that is how a hook shipped for six weeks looking for its
rules relative to the working directory, emitting nothing from any subdirectory, while
the conformance run passed against a corrected copy sitting in this directory. The run
now refuses to start if `base/` regrows a script.

## Running it

`scripts/check-conformance.sh`, run by `scripts/check-blueprint.sh`.
For each defect it composes the tree, points the guards at it, and requires the guard to
fail. It also runs the clean baseline and requires every guard to pass.

## Adding a defect

Make a directory under `defects/`, put in it only the files that change, and add one line
to the table in `scripts/check-conformance.sh`. Nothing else.

**Break one thing per overlay.** An overlay that breaks two makes it impossible to tell
which one the guard noticed.

## Two things that will catch you out

- **A project's own rule added to the fixtures needs a `paths:` header** in
  `.claude/rules/`; `rule-areas` fails the clean baseline without one, and the generator
  refuses it. A shipped rule's stub goes in `.tropis/rules/` with no header and an
  entry in `.claude/rule-areas.json`. Every `.mdc` and every shipped rule's
  `.claude/rules/` file is generated — never write one into `base/`.
- **Every path the fixtures mention must exist inside the fixtures**, because
  `framework-integrity` resolves them. A rule that references a file for realism will fail
  the clean baseline.
