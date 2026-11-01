# Bootstrap

> **Prefer `/bootstrap`.** This document is the fallback when your tool cannot run
> that command, and the reference for what the command does. Follow the same stages
> in order; each one is verifiable before you move on.

Written to be followable literally, by an agent, with no knowledge of where any of this
came from. If a step cannot be completed from what is written here, that is a defect in
this guide — fix it rather than guessing.

**Vocabulary.** *Entry file* — `AGENTS.md`, which holds this project's entry
instructions. `CLAUDE.md` is the single line `@AGENTS.md`. *Rule* — a compact constraint
delivered at the moment it applies. *Catalog* — the pure-data source of truth for what
the product does. *Framework folders* — `.claude/` (rules, framework documents, commands,
hook wiring) and `.tropis/` (the framework's code and checks), both committed in the
project's repository. *Project* — the repository being built; an exported copy of it
carries none of the framework.

**Prerequisites:** `git`, `bash`, `python3` and `node` on the path. The hook uses
`python3` to parse JSON; `node` runs the reference implementations of the guards and the
backlog command.

These are tools on your machine, not dependencies of your project — **this framework
does not care what language your project is written in**, and no guard it ships reads a
line of your source. The set-up project runs the framework's own checks with
`npm --prefix .tropis test`. See `framework/DECISIONS.md`, *Independent of the
project's technology, opinionated about its own*.

---

## Step 0 — Preflight

```bash
BP=<path to this blueprint repository>
bash "$BP"/scripts/check-prerequisites.sh
```

It reports each required tool and how to install any that are missing, and exits
non-zero when something required is absent. Nothing below will work until it exits `0`.

Confirm the project path is the root of a git repository (`git init` there first if it is
not). If it already holds any path the setup writes — `CLAUDE.md`, `AGENTS.md`,
`feature-catalog.yaml`, `docs/verification-log.md`, `.claude/rules/`,
`.claude/framework/`, `.claude/commands/`, `.claude/settings.json`, `.cursor/rules/` or
`.tropis/` — move those aside first and merge your own content back into `AGENTS.md`
afterwards.
Most often that is an existing `CLAUDE.md`. The setup refuses, changing nothing, and
lists what it found.

## Step 1 — Name the project

Ask for, then confirm before creating anything:

- project path (the root of its git repository)
- project display name
- blueprint URL (the blueprint remote, or the local path the operator names)

Take the display name exactly as given — capitals, spaces and symbols included. Setup
stores it in `.tropis/project.json`; the backlog board, the operator guide and the
package name in `.tropis/package.json` take it from there, and fall back to the
project's folder name when it is absent.

## Step 2 — Set the framework up in the project

```bash
bash "$BP"/scripts/set-up-project.sh <project-root> "<display name>"
```

Refuse to continue if that exits non-zero. It writes these, inside the project only.
`.claude/rule-additions/` is the exception: setup leaves it absent.

| In the project | What it is |
|---|---|
| `.tropis/rules/` | the text of each shipped rule |
| `.tropis/project.json` | the project's own settings — its display name, written when setup is given one, and later whether it is public and why its main branch is not gated — yours, never replaced by an update |
| `.claude/rule-areas.json` | which files each shipped rule governs — yours to change |
| `.claude/rule-additions/<name>.md` | not created by setup. Plain text, no header, named after a shipped rule: this project's additions to that rule. Write it, then run `npm --prefix .tropis run rules`. The additions follow the shipped text in the one file each tool loads, and win where they contradict. Never edit the shipped text in `.tropis/rules/` or a generated file |
| `.claude/rules/`, `.claude/framework/`, `.claude/commands/` | the shipped rules as Claude Code reads them (generated), your own rules, the framework documents and the commands |
| `.claude/settings.json` | the hook wiring |
| `.cursor/rules/*.mdc` | each rule as Cursor reads it, generated |
| `.tropis/hooks/`, `.tropis/scripts/` | the hooks, and the scripts behind the commands |
| `.tropis/guards/` | the framework's checks on this project |
| `.tropis/package.json`, `.tropis/jest.config.js`, `.tropis/README.md` | what runs the checks, and the operator guide |
| `.tropis/templates/project-brief.md` | the skeleton `/scope` drafts the brief from |
| `AGENTS.md` | the entry file, from the template |
| `CLAUDE.md` | the single line `@AGENTS.md` |
| `feature-catalog.yaml`, `docs/verification-log.md` | the backlog, and the record of manual checks |
| `.gitignore`, `.gitattributes` | lines appended once, never replacing yours: ignore `.tropis/node_modules/`, and keep the framework out of any exported copy |

It does not commit. A project's additions to a framework document go in its own `AGENTS.md`, because each framework version replaces `.claude/framework/`.

### Then prune what this project does not need

Carrying a file with no subject is worse than not having it, because it reads as
though someone decided it applied. From the project root:

- `.claude/commands/manual-check.md` and `docs/verification-log.md` — keep both only if
  something the project produces needs a person to look at it or click through it.
  Otherwise delete both, and drop the verification-log clause from
  `.claude/commands/feature.md` and `.claude/rules/catalogs.md`.
- `.claude/commands/release.md` — keep only if the project ships versioned releases. Then
  copy `templates/RELEASES.md` from the blueprint to the project root, fill in the
  command's project-owned block, and build the pipeline the workflow's release section
  describes. Otherwise delete it.
- `.claude/commands/feature.md`, `idea.md`, `.claude/rules/catalogs.md` — the setup
  includes the catalog; keep these. Prune all three together only if you are
  deliberately not using a catalog.
- `.claude/framework/model-tiers.md`, `.claude/commands/refresh-model-tiers.md` — keep
  only if plans get dispatched to different models. The framework ships the tier
  definitions and no picks; `/refresh-model-tiers` writes this project's own to
  `docs/model-picks.md`.

Verify:

```bash
ls -R <project-root>/.claude/
```

### Then wire the hook

`.claude/settings.json` arrived from the template with
`.tropis/hooks/capture-at-write.sh` wired to Edit and Write, and a Bash matcher
carrying two hooks for moments no file path marks — merging a plan and committing a
framework change. No hook delivers rules: the agent tool loads them itself
(`framework/rule-delivery.md`). Two things to do:

1. **Delete the `_comment` key.** It is documentation; some tools reject unknown keys.
2. Confirm the file parses:

```bash
python3 -c "import json;json.load(open('.claude/settings.json'));print('settings valid')"
```

Each hook exits silently on any path or command it does not recognise. That is
intended: a hook that fails loudly on unmatched paths fires on every file in the
repository.

## Step 3 — Shape

From the project root, run `/scope`. Do not invent the brief from inference — the
conversation is the source.

`/scope` writes `docs/project-brief.md` and the initial `feature-catalog.yaml`
entries (`idea` or `shaped` only). It refuses to overwrite an existing brief.

If your tool cannot run `/scope`, follow `commands/scope.md` by hand from the
project root.

## Step 3a — Choose how Tropis keeps the README

Ask which level the project wants: Tropis writes the README from its skeleton
(`writes`), Tropis only reports what is behind (`suggests`), or Tropis stays out of it
(`manual`). Recommend `writes` when the project had no `README.md` before the setup, and
`suggests` when it had one. Then write `docs/readme/readme.yaml` by hand, in this
format, with `level` set to the answer and `refreshedAt` left empty:

```yaml
# How Tropis keeps this project's README. Change it with /refresh-readme <level>.
level: writes          # writes · suggests · manual
refreshedAt: ""        # the commit the README was last refreshed at; empty until then
```

## Step 4 — Fill the operator guide

The setup copied `templates/README.md` to `.tropis/README.md` with the display name at
its head. Replace this placeholder from the Step 1 answers:

- `{{BLUEPRINT_URL}}`

Do not restate the workflow in this file. It points at the blueprint.

## Step 5 — Draft the entry point

The setup left `AGENTS.md` as the template and `CLAUDE.md` as the single line
`@AGENTS.md`. Fill `AGENTS.md` from the brief's identity. Title it with the name in
`.tropis/project.json`. Work through the template's comments and replace every
placeholder. Then delete the comments, including the block at the bottom listing
what does *not* belong in `AGENTS.md` — read it before deleting it.

**Write the gotchas section first, and write it from experience.** The highest-value
content in an entry file is what is *surprising* about this project, not what it is.
Anything descriptive can be discovered by looking; a gotcha cannot.

**Ask for gotchas; do not accept silence.** For a greenfield project, leave an
explicit "expected to grow" note rather than inventing three fake gotchas.

> **The test: if you cannot list three things that would cost an hour to rediscover, you
> do not yet know the project well enough to write its entry point.** Write the identity
> paragraph, leave the gotchas section empty with a note, and come back after the first
> real piece of work. An invented gotcha is worse than a missing one — it spends context
> on every session to warn about something that never happens.

This is the step the port these files came from proved matters most, and the one most
often skipped, because the descriptive sections are easy to write and feel productive.

## Step 6 — Draft the first rules

A rule needs **two** things or it reaches nobody: a file, and the files it governs. The
setup already installed the shipped rules, with their areas in `.claude/rule-areas.json`.
Your own rules are files under `.claude/rules/`, each with a `paths:` header naming the
files it governs. Propose compact rule files for areas the
brief implies. **Confirm each with the developer before writing.** A guessed rule is
worse than an absent one.

1. For each confirmed area — a backend, a UI layer, a shared layer, tests, CI — write
   `.claude/rules/<area>.md`. Keep each one short enough to be useful when it arrives
   mid-task. Open it with the header, exactly this shape — one line, a JSON list:

   ```
   ---
   paths: ["src/backend/**"]
   ---
   ```

   then a first heading naming the area it governs, and a `<!-- layer: project -->`
   comment beneath it. `rule-areas` fails a rule without a header, and Claude Code would
   load such a rule in every session. Do not write a rule under the name of a shipped one;
   the rules command refuses it.

   **What belongs in a rule:** a constraint plus the mechanism behind it. Not "do not
   do X", but "X causes Y because of Z" — a bare prohibition cannot be applied to a
   case its author did not foresee. Where the rule depends on something outside the
   file being true, say what. See `.claude/commands/capture-learning.md` for the three
   questions every rule has to answer.

   **Do not copy rule content from another project.** In the two installations this
   blueprint was extracted from, five rule files shared a filename and not one shared
   a sentence. What ports is the convention; the content is yours to write.

   **Exception — `tests`.** The setup already installed the shipped `tests` rule with
   the portable test-design lessons (a faked writer/reader pair, and path-existence
   containment across worktrees). Do not edit it or its generated files. This
   project's test conventions may go in the `tests` additions file
   (`.claude/rule-additions/<name>.md`, plain text, no header) or a rule of its own.
   Then run `npm --prefix .tropis run rules`: the additions follow the shipped
   text in the one rule each tool loads, and win where they contradict. If this
   project keeps its tests somewhere else, change the area of the shipped rules in
   `.claude/rule-areas.json`.

2. The setup installed the rule generator. After writing or changing a rule of your own,
   or an area in `.claude/rule-areas.json`, run it:

   ```bash
   npm --prefix .tropis run rules
   ```

   It writes the shipped rules' Claude Code files and every rule's Cursor file.
   `npm --prefix .tropis test` fails while they are out of date.

Verify the rules arrive — this is the first end-to-end check that the layer works.
Start a fresh session of your agent tool in the project and, before it uses any tool,
ask it:

> List the first heading line of every `.claude/rules/` file you were given.

Expected in Claude Code: none. Then have it read a file in one rule's area and ask
again. Expected: that area's rule. `framework/rule-delivery.md` says why.

**If a rule is missing,** in order of likelihood: the file is not directly under
`.claude/rules/` or does not end `.md`; its `paths:` header does not match the file that
was read; or the session was started somewhere other than the project root. A session
where no rules arrive looks exactly like one where none were needed.

**If your agent tool does not load a rules folder by itself**, this check cannot pass and
the shipped layout is not the one for you. `framework/rule-delivery.md` states what
delivery has to achieve and what to do instead — read it before working around this.

Leave `DECISIONS.md` and `docs/BLUEPRINT-UPSTREAM.md` uncreated until the first real
decision or portable learning. Empty ceremony is not a setup.

## Step 7 — Install and verify

**Model picks come later.** The setup ships the tier definitions and no picks, so
nothing here is dated on the day it is copied. Before dispatching the first plan, run
`/refresh-model-tiers`: it writes `docs/model-picks.md`, and `/dispatch` says to run it
until that file exists.

From the project root:

```bash
npm --prefix .tropis ci
npm --prefix .tropis test
bash .tropis/scripts/check-prerequisites.sh
```

Then commit everything, including `.tropis/package-lock.json`. A clone is now a
working copy: `npm --prefix .tropis ci` after cloning is all it needs.

Check that an exported copy carries none of the framework — this prints nothing:

```bash
git archive HEAD | tar -t | grep -E '^(\.claude|\.cursor|\.tropis)/'
```

The setup did **not** copy this blueprint's own checks of itself into the project. It
copied six into `.tropis/guards/`: `project-layout.test.js`, a smoke check that the
framework is where the setup put it; `catalog-entries.test.js`, which fails when a catalog
entry lacks a required field or `/idea` stops naming one; `rule-areas.test.js`, which
fails a rule with no area; `rules-generated.test.js`, which fails a generated rule
file that is out of date or was edited by hand; `installed-files.test.js`, which fails a
framework file edited after it was installed; and `entry-file.test.js`, which fails a
`CLAUDE.md` that is not the single line `@AGENTS.md`. `npm --prefix .tropis test` runs all of them.

### Then start the loop

The framework is installed. What keeps it from rotting is one habit:

**Every unit of work ends by updating the durable artifact it affected, or by stating
explicitly that none is affected.** The table in `.claude/framework/workflow.md` says
which artifact for which kind of change.

When a learning does not obviously belong anywhere, run `/capture-learning`. When it
would be true for any project using this framework — not about this codebase, this
platform, or this domain — append it to an upstream queue at
`docs/BLUEPRINT-UPSTREAM.md` so it can be flushed back into the blueprint.
`/flush-upstream` sends the queue back as pull requests; the framework's CONTRIBUTING.md
says how, and what it needs.

Day to day, start from `/next` (or `npm --prefix .tropis run next`).

Report what was set up, what the conversation produced, and what is deliberately
still empty.

---

## Checklist

- [ ] `check-prerequisites.sh` exits `0`
- [ ] The setup ran on the project's own repository, and nothing was written outside it
- [ ] Commands with no subject in this project pruned
- [ ] `.claude/settings.json` parses, `_comment` removed
- [ ] `/scope` (or `commands/scope.md`) produced a brief and catalog from conversation
- [ ] README level chosen (`docs/readme/readme.yaml`)
- [ ] `.tropis/README.md` placeholders filled
- [ ] Entry file written, gotchas section first (or an explicit "expected to grow" note)
- [ ] Each first rule confirmed before writing, with a `paths:` header; `npm --prefix .tropis run rules` run
- [ ] A fresh session has no area rule at start, and the area's rule after reading a file in it
- [ ] `npm --prefix .tropis test` and `check-prerequisites.sh` pass; everything committed
- [ ] `git archive HEAD` carries none of `.claude/`, `.cursor/`, `.tropis/`
