---
description: Set the framework up in a project's own repository, shape the project, draft entry files, verify
---

Set this framework up inside a project's **own repository**, then shape the
project. Run from a session that can see the blueprint checkout. `bootstrap.md`
in the blueprint is the long form of every stage.

## Stage 0 — Preflight

Confirm: `git`, `bash`, `python3`, and `node` are on the path
(`bash "$BP"/scripts/check-prerequisites.sh`). Confirm the project path is
the root of a git repository. If it already holds a path the setup writes —
most often its own `CLAUDE.md` — move it aside first and merge it back
into `AGENTS.md` afterwards; the setup refuses, changing nothing, and lists what it found.

## Stage 1 — Name the project

Ask for: the project path, a display name, and the blueprint URL (remote or local
path the operator names). Confirm before creating anything. Take the display name
exactly as given — capitals, spaces and symbols included. Setup stores it in
`.tropis/project.json`, and the framework takes the project's name from there
wherever it writes one.

## Stage 2 — Set the framework up

```bash
bash "$BP"/scripts/set-up-project.sh <project-root> "<display name>"
```

Refuse to continue if that exits non-zero. It writes `.claude/`, `.cursor/rules/`,
`.tropis/`, the entry file and the backlog into the project, and appends to its
`.gitignore` and `.gitattributes`. It does not commit. With the display name it also
writes `.tropis/project.json`, a file of the project's own that an update never
replaces, names the package after the name, and puts the name at the head of
`.tropis/README.md`. Prune what the project does not need, delete the `_comment` key
from `.claude/settings.json`, and confirm the file parses.

## Stage 3 — Shape

From the project root, run `/scope`. Do not invent the brief from inference —
the conversation is the source.

## Stage 3a — Choose how Tropis keeps the README

Ask which level the project wants: Tropis writes the README from its skeleton
(`writes`), Tropis only reports what is behind (`suggests`), or Tropis stays out of it
(`manual`). Recommend `writes` when the project had no `README.md` before the setup, and
`suggests` when it had one. Then run `/refresh-readme <level>`.

## Stage 3b — The pipeline

Ask where the repository is hosted, and whether it is or will be public. On yes, write
`.tropis/project.json` holding `{ "public": true }`, keeping any key already there (setup
may have written the name). From then on the agent is told at
every `git commit` and `git push` to read what is going out for private material, a
review record says the diff was read, and `/release` lists anything private in the window
before drafting. On no, write nothing: a project whose `.tropis/project.json` holds no `"public": true` is
not public.

**GitHub.** Offer to write `.github/workflows/pipeline.yml` from
`.tropis/templates/pipeline-caller.yml`, and to create `pipeline/` holding a
`prose.txt` that lists `README.md` and `docs/`. Every other stage starts empty.
A stage is filled by `pipeline/<stage>.sh`, run with `bash` from the project
root. `pipeline/framework.sh` is the project's own checks of framework files,
and it runs after Tropis's checks in the framework stage. Tropis never writes
or reads anything under `pipeline/` except to run it.

**The gate.** Ask whether the host should refuse a merge that has not passed the
pipeline. On GitHub, print, with `<owner>/<name>` taken from `origin`:
`gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json`,
and say to turn on *Allow auto-merge* and *Automatically delete head branches* under
Settings → General → Pull Requests. The developer runs it; never run it yourself. A
private repository on GitHub's free plan cannot have rulesets. If the developer will not
or cannot apply it, or the host is not GitHub, ask why, and write their reason into
`.tropis/project.json` as `"ungated": "<reason>"`, keeping any key already there. Until
one of the two is done, the pipeline's `host` job fails on every run, by design.

**Any other host.** Show the output of `node .tropis/scripts/pipeline.mjs commands`
and say that those are the commands to put in that host's CI.

## Stage 4 — Fill the operator guide

In `.tropis/README.md`, replace `{{BLUEPRINT_URL}}` from the Stage 1 answers.
Setup has already written the display name at its head.

## Stage 5 — Draft the entry point

Fill `AGENTS.md` from the brief's identity, and title it with the name in
`.tropis/project.json`. Leave `CLAUDE.md` as it is: the single line `@AGENTS.md`,
which Claude Code follows to `AGENTS.md`. **Ask for gotchas; do not accept
silence.** For a greenfield project, leave an explicit “expected to grow” note
rather than inventing three fake gotchas.

## Stage 6 — Draft the first rules

Propose compact rule files for areas the brief implies. Every rule opens
with a `paths:` header naming the files it governs — `rule-areas` fails one
without. Confirm each with the developer before writing. A guessed rule is
worse than an absent one. A shipped rule's area is set in `.claude/rule-areas.json`;
change it there if this project keeps those files elsewhere. To add clauses to a
shipped rule, write `.claude/rule-additions/<name>.md` — plain text, no header,
named after the shipped rule. Never edit the shipped text in `.tropis/rules/`
or a generated file. Then `npm --prefix .tropis run rules`: the additions follow
the shipped text in the one rule each tool loads, and win where they contradict.

## Stage 7 — Install and verify

```bash
npm --prefix .tropis install
npm --prefix .tropis test
bash .tropis/scripts/check-prerequisites.sh
```

Commit everything, including `.tropis/package-lock.json`. Then confirm
`git archive HEAD | tar -t | grep -E '^(\.claude|\.cursor|\.tropis)/'`
prints nothing — an exported copy carries none of the framework.

Report what was set up, what the conversation produced, and what is
deliberately still empty.
