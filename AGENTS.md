@.claude/framework/workflow.md

**If the line above did not expand into the development workflow, read
`.claude/framework/workflow.md` now.** `@` imports are a feature of some agent tools and
not others; a tool that does not expand them reads this file as plain text and would
otherwise get every area rule and none of the process — no preflight, no branching rule,
no merge sequence, no documentation closeout.

# Tropis — project config

This repository builds Tropis: the rules, framework documents,
commands, hooks and checks that set up and govern agent-assisted projects. It is
developed with its own last release installed, like any project: `.claude/` and
`.tropis/` hold that release, and the next one is built in `rules/`, `framework/`,
`commands/`, `scripts/`, `guards/` and `templates/`. Bash and Node (ES modules), checked
with Jest; no package file at the root.

## Gotchas

- **Two copies of the framework: edit the source.** `rules/`, `framework/`, `commands/`,
  `scripts/`, `guards/`, `templates/` are the next release. `.claude/` and `.tropis/`
  are the last one, and change only by installing a release. Claude Code refuses an
  edit to the installed rules, framework documents and framework code; in Cursor
  nothing stops you, so check the path before editing.
- **A lesson goes straight into the source.** This repository is the upstream: a
  doc-closeout row that says "the upstream queue" means the source folders here, and
  there is no `/flush-upstream`.
- **The self-check checks committed content only.** `bash scripts/check-blueprint.sh`
  exports `HEAD` with `git archive`; commit first. The export has no `.git`, so a guard
  that runs git against its own tree, such as comparing a file with `main`, fails there:
  do that only when the guard is inside a checkout. `npm --prefix .tropis test` is a
  different thing — the installed release's checks on this repository as a project (its
  backlog, its rule areas and generated rules, its installed files), not on the source.
  So are `npm --prefix .tropis run board` and `run next`: they run the installed
  release's scripts, so a change to the board or the backlog report does not show
  through them until a release is installed. Check the source with its own guards, or by
  running the changed scripts from a scratch copy of `.tropis/` built from the source.
- **A framework document may name an absent file only through the integrity guard.** A
  path in backticks under `docs/`, `scripts/` or `.claude/` must exist, or
  `framework-integrity` fails the self-check. A file the framework names and no project has
  yet, like `docs/model-picks.md`, goes in that guard's exemption, and a plan that adds one
  lists `guards/framework-integrity.test.js`. Two plans in a row missed it. A file no
  project will ever have, such as a plan cited by a decision, is named in plain text
  instead, never exempted: FW-031 cited its plan in backticks and drew an exemption that
  review then removed.
- **A plan header field must sit on one line.** The dispatch script reads the first line
  of `Requires:` and the other header fields, and drops the rest without saying so.
- **The worktree command may appear in a plan only in its Repositories table.** Anywhere
  else in the plan, the plan check refuses it as undispatchable.
- **A colon followed by a space inside an unquoted backlog value breaks the YAML.**
  Rephrase or quote it.
- **This repository is public.** Evidence from another project names it by pseudonym
  (the first adopter is `first-adopter`) and never quotes its internals. A measurement
  names the tool, version, operating system and architecture, never the computer.
  `guards/private-material.test.js` refuses home paths, hostnames, Atlassian sites,
  session ids, unlisted email addresses and hashed names in every committed file
  outside the installed release, but **a name nobody has hashed yet passes**: read
  your own diff for names before pushing.
- **What GitHub enforces here, checked 2026-10-31.** On `main`, the ruleset Tropis ships:
  nothing lands except through a pull request (no approval needed) whose check
  `pipeline / gate` is green on a branch up to date with `main`, with no bypass, no force
  push and no deletion. So commit on a branch and merge with
  `gh pr merge <N> --auto --squash`; a direct push to `main` is refused. Auto-merge and
  automatic deletion of merged branches are on, and the pipeline's `host` job re-checks
  the gate on every run. On tags `v*`: no update and no deletion. Workflows from a
  first-time contributor's fork wait for approval, workflows get read-only access by
  default and cannot approve pull requests, and secret scanning, push protection,
  Dependabot alerts and private vulnerability reporting are on.
- **The private history is in `fcapurso/tropis-archive`.** This repository's history
  starts at one commit made from that archive's `main`. A clone made before the move
  still names `fcapurso/tropis` as `origin`, which is now this public repository: check
  `git remote -v` before pushing from one.

## Setting up a working copy

Run `npm --prefix .tropis ci` after cloning. The self-check installs its own test
tools into `.self-check/` the first time it runs.

## Load on demand

Do not read these at session start. Read the one that matches the work:

| File | When |
|---|---|
| `README.md` | What adopters are told. Before changing how a project is set up or started. |
| `framework/DECISIONS.md` | Before proposing a change to how the framework works — the next release's decision record. |
| `.claude/framework/DECISIONS.md` | The installed release's decisions, which govern this session. |
| `.claude/framework/doc-architecture.md` | Before adding a document, or describing current state in prose. |
| `RELEASES.md` | Before drafting release notes. |
| `docs/superpowers/specs/` | The design behind an arc, before planning in it. |

Area rules under `.claude/rules/` reach you without asking in Claude Code: each loads
when you first touch a file in its area, source folders included. Cursor does not attach
them, so **in Cursor, read the area's rule yourself before changing files there.**

## Commands

```bash
bash scripts/check-blueprint.sh           # the framework's self-check; committed content only
npm --prefix .tropis test                 # the installed release's checks on this repository
npm --prefix .tropis run next             # the backlog report
npm --prefix .tropis run board            # the backlog board, one page to open in a browser
npm --prefix .tropis run rules            # after .claude/rule-areas.json or a rule additions file changes
```

## Comment philosophy

Comment API contracts, non-obvious platform behaviour, invariants, and usage of
shared utilities. Do not narrate. A comment that restates the identifier is noise;
a module docstring that re-describes the filename is noise.
