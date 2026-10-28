# Whether an existing rule-sync tool should replace our own projection — finding, 2026-10-15

## Summary

Four tools were run on a throwaway copy of the shipped rules and hooks: rulesync 35.0.0, Ruler 0.3.44, AlignTrue 0.9.3 and ai-rulez 5.3.0. In a fresh Claude Code 2.1.300 session rulesync and ai-rulez delivered a rule for its own area and nothing before it; Ruler did so only for an area that is a folder, and AlignTrue either loaded every rule at start or delivered none.
No tool wrote the Cursor form the Cursor spike measured for all five shipped rules (AlignTrue came nearest), and no tool kept a project's areas (N6) or a project's added clauses (N7) outside the shipped rule: each would still need the framework's own step in front of it.
Adopting any of them would put an 11 MB to 160 MB dependency behind a generator the framework already has in 154 lines, and still leave that step to write.
Recommendation: keep the framework's own generator, and borrow two things from ai-rulez: a content hash in each generated file's header, and a `--check` mode. Nothing was measured in Cursor.

## How this was tried

Everything ran on `dev-laptop.local`, Darwin arm64 25.2.0 (`sw_vers`: macOS 26.2, build 25C56), Node v22.15.0, npm 11.6.4, on 2026-10-15 between about 16:15 and 16:45 (UTC+2). Claude Code is 2.1.300 (`claude --version`), the same build the Cursor spike used. No Cursor session was opened. Cursor is judged by form (Decision 3), against `docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md`.

The Cursor finding's working form, which N2 is judged against: `.cursor/rules/<name>.mdc`, front matter `alwaysApply: false`, a `description`, and `globs:` written unquoted — one glob (C2U, C10) or several separated by a comma and a space (C2C). Each delivered on a read in Cursor 3.24.12 and not on a shell append or a create. Not measured there: a glob that names one file, commas without a space, a quoted glob string, a folder inside `.cursor/rules`. A nested `AGENTS.md` (C5) and a nested `CLAUDE.md` (C6) delivered on a read only. The JSON-array glob the framework generates today delivered nothing.

| Tool | Version | Source |
|---|---|---|
| rulesync | 35.0.0 | `npm install rulesync`; also the release binary `rulesync-darwin-arm64` |
| Ruler | 0.3.44 | `npm install @intellectronica/ruler` |
| AlignTrue | 0.9.3 | `npm install aligntrue`, with the override described in its section |
| ai-rulez | 5.3.0 | `npm install ai-rulez`, which downloads its Go binary on first run |

**The trial folder** was `../rule-tooling-trial/`, a `git init` repository with one commit, `trial start state`:

- `.claude/rules/{catalogs,harness-scripts,learnings,planning,tests}.md`, copied from `rules/` with their `paths:` headers. They sit in `.claude/rules/` rather than `rules/` because that is where a project has them and where the framework's generator reads them.
- `.claude/settings.json`, copied from `templates/settings.json`, and `.framework/hooks/{capture-at-write.sh,capture-at-merge.sh,framework-commit-check.sh,hook-reply.sh}`.
- One empty sample file per area glob: `feature-catalog.yaml`, `DECISIONS.md`, `.framework/sample.js`, `.claude/framework/sample.md`, `.claude/commands/sample.md`, `docs/superpowers/plans/sample-plan.md`, `docs/superpowers/specs/sample-spec.md`, `src/__tests__/a.js`, `src/a.test.js`, `src/a.spec.js`, `test/a.js`, `tests/a.js`, plus `src/app.js` in no area.
- One marker line appended to each rule: `Probe marker R-<rule>: <two words>.` (catalogs: amber lantern; harness-scripts: violet compass; learnings: copper spindle; planning: marble kettle; tests: silent orchard). The plan lists the markers after the commit; they were added before it, so every reset keeps them. The copied rule files are 5,860, 5,638, 4,414, 21,436 and 2,939 bytes.

Between tools the trial was reset to that commit. The plan's `git checkout -- . && git clean -fd` leaves behind files a tool's own `.gitignore` hid, and the session's command review refused a `-x` clean, so later tools ran in a fresh `git clone` of the start commit placed at the same path. Each tool was therefore run on exactly the committed state.

**The Claude Code session (N1)** was one `claude -p` process per tool, run from the trial root, with `--permission-mode acceptEdits --allowedTools Read --disallowedTools Bash Edit Write Grep Glob`. The prompt, verbatim, with `src/a.test.js` replaced by `docs/superpowers/plans/sample-plan.md` for Ruler's nested run:

~~~~
This is a measurement. The project is a throwaway. Write nothing and change nothing.

Step 1, before using any tool: quote every sentence beginning `Probe marker` that is in your instructions, and for each say which file it came from. Name the first heading of every rule or instruction file you were given. If there are none, say so.

Step 2: read `src/a.test.js`, and only that file. Do not open, list or search `.claude/`, `.cursor/`, `.rulesync/`, `.ruler/`, `.ai-rulez/`, `.aligntrue/`, any `AGENTS.md` or `CLAUDE.md`, and do not search for the word "marker".

Step 3: after the read, quote every `Probe marker` sentence you have received since the start of the session, whether in your instructions, a tool result or a system message. For each, say where it arrived (instructions, tool result, system message) and which file it came from. If none arrived at this step, say so.

Your final message is the only thing kept. It must contain both headings in full — "Before any tool" (what you answered in Step 1, written before you ran any tool) and "After the read" — and the Step 1 section must list every `Probe marker` sentence you had at that point, or say there were none.
~~~~

`src/a.test.js` is in the tests area only, so a pass is: no marker before any tool, `R-tests` after the read, and no other. There is no root `CLAUDE.md` in the trial unless a tool wrote one, and where a tool wrote one the answer says which file each marker came from. Where a tool does not generate `.claude/rules/` (Ruler, AlignTrue, and ai-rulez's first output) the hand-written copies were set aside first, so that only the tool's own output could deliver; this is noted in each section. The first run of a session on rulesync returned only the second half of the report, so the prompt's last paragraph was added and that run repeated.

**The baseline** is the framework's own generator, copied into the trial's `.framework/scripts/` (`generate-cursor-rules.mjs`, `rule-areas.js`, `projections.js`) and run there. Its output for `planning`:

~~~~
---
description: planning rules (generated from .claude/rules/planning.md — do not edit)
globs: ["docs/superpowers/plans/**","docs/superpowers/specs/**"]
alwaysApply: false
---

# Spec and plan rules
~~~~

Run twice, its output is identical (checked with `shasum`). Its body is the source body plus one trailing newline: 5,821, 5,606, 4,316, 21,363 and 2,852 bytes against sources of 5,820, 5,605, 4,315, 21,362 and 2,851.

## The needs

| # | Need | Why |
|---|---|---|
| N1 | A rule loads only for its area in Claude Code | FW-009; the cost control the framework exists for |
| N2 | The rule reaches Cursor by the mechanism the Cursor finding measured | `cursor-agents-receive-area-rules` |
| N3 | Delivery through each tool's own mechanism, or one both share — not a hook | Decision 2 |
| N4 | Rules arrive whole at their current sizes, `planning.md`'s 21,395 bytes included | A truncated rule fails silently |
| N5 | The framework's hooks keep working in both tools: generated, or left alone untouched | `templates/settings.json`; audit S2 |
| N6 | A project's areas live in a file of its own, not inside shipped rule files | `rule-areas-are-project-data` |
| N7 | A project adds clauses to a shipped rule in a file of its own, and both arrive as one rule | `shipped-rules-have-project-companions` |
| N8 | Shipped files can be replaced by a fingerprinted update without merging, and generation is deterministic | `project-takes-a-framework-version`; *Decided: copy with fingerprints* |
| N9 | Whether it needs Node, or another runtime, in the project | `harness-does-not-need-node` |

A tool is judged need by need: *meets*, *meets with work* (the work is said), *does not meet*, *not tried*. There is no score.

## rulesync 35.0.0

**Install footprint.** `npm install rulesync` took 18 s and added 273 packages (222 top-level folders), 14,111 files and 160 MB in `node_modules/`, a `package.json` (`"dependencies": {"rulesync": "^35.0.0"}`) and a 123,215-byte `package-lock.json`. The release binary `rulesync-darwin-arm64` is 141,250,658 bytes; its sha256 matched `SHA256SUMS`, and it ran with `PATH=/usr/bin:/bin`, where `node` does not resolve, and wrote the same files as the npm install (identical `shasum`).

**Configuration, verbatim.** `rulesync.jsonc`:

~~~~json
{
  "targets": ["claudecode", "cursor"],
  "features": ["rules"]
}
~~~~

The source was made with `npx rulesync import --targets claudecode --features rules`, which read `.claude/rules/` and wrote `.rulesync/rules/<name>.md`. Each source carries the areas twice, as `globs:` and as `claudecode.paths:`. To reach the baseline's front matter, each source was then given a top-level `description:` and a `cursor:` block. `.rulesync/rules/planning.md` as run:

~~~~yaml
---
root: false
description: "planning rules (generated from .claude/rules/planning.md — do not edit)"
targets:
  - '*'
globs:
  - docs/superpowers/plans/**
  - docs/superpowers/specs/**
cursor:
  alwaysApply: false
claudecode:
  paths:
    - docs/superpowers/plans/**
    - docs/superpowers/specs/**
---
~~~~

**What it wrote.** `npx rulesync generate` wrote `.claude/rules/<name>.md` and `.cursor/rules/<name>.mdc` for the five rules and nothing else (it warns that no `root: true` rule exists, once per target).

- *Claude Code files.* `paths:` becomes a YAML block list in place of the one-line JSON array. Each body is byte-identical to its source (5,820, 5,605, 4,315, 21,362, 2,851 bytes, markers present). When `.claude/rules/` already holds files that mean the same, it reports them up to date and does not rewrite them; with the folder removed it wrote them.
- *Cursor files, against the baseline.* Four lines differ per file and nothing else; the body is identical to the baseline's. The description line is the same text. Field order is `alwaysApply`, `description`, `globs` where the baseline has `description`, `globs`, `alwaysApply`. `globs:` is `docs/superpowers/plans/**,docs/superpowers/specs/**` — unquoted, patterns joined by a comma with no space — where the baseline writes a JSON array. A single directory glob, `.framework/**`, is written unquoted, which is the finding's C10 form field by field.
- *Without the extra source fields* the Cursor file has only `globs:`: no `alwaysApply`, no `description`. Neither field is in the import.
- *The separator cannot be changed.* `cursor.globs` accepts only an array, and a string is refused (`expected array, received string`); an array is joined with a bare comma.
- *Root rule.* With a `root: true` rule it also wrote `CLAUDE.md` (the body only) and `.cursor/rules/overview.mdc` with `globs: **/*`. Without one it wrote neither, so the trial's entry files were not touched.
- *Hooks.* With `"features": ["rules", "hooks"]`, after `import --features hooks` made `.rulesync/hooks.jsonc`, it rewrote `.claude/settings.json` — a `$schema` line added, `if` moved before `command`, `_comment` kept — and wrote `.cursor/hooks.json` (`version: 1`, `preToolUse`, matchers `Edit`, `Write`, `Bash`) **without the `if` conditions**, so in Cursor every `Bash` hook would run on every shell command. With `features: ["rules"]` `.claude/settings.json` was not touched.

**The needs.**

- **N1 — meets.** Claude Code 2.1.300, 2026-10-15T14:22:51Z: before any tool, no marker; after reading `src/a.test.js`, `Probe marker R-tests: silent orchard.` as a system message from `.claude/rules/tests.md`, and no other.
- **N2 — does not meet.** Compared field by field to the finding's form, the one difference is the separator: `a,b` where the finding measured `a, b` (C2C). Planning, learnings and tests have several patterns, and catalogs is one file name, which the finding did not measure either. Only `harness-scripts` (`.framework/**`) matches a measured form exactly. Nothing was run in Cursor.
- **N3 — meets.** Rules go to `.claude/rules/` and `.cursor/rules/`, each tool's own mechanism; the hooks feature is not used for rules.
- **N4 — meets.** Bodies byte-identical in Claude Code files; Cursor files identical to the baseline's, which carry one added newline.
- **N5 — meets.** Left alone with `features: ["rules"]`. With `hooks` on it rewrites `.claude/settings.json` equivalently and writes Cursor hooks that drop `if`; the Cursor file was not tried in Cursor.
- **N6 — does not meet.** Areas are `globs:` and `claudecode.paths:` in each rule's own source. A second source root (`inputRoots: [".rulesync", ".rulesync-project"]`) lets a project override a rule, but a same-path file replaces the whole rule: the shipped body was gone and the project's `projectarea/**` globs replaced the shipped ones.
- **N7 — does not meet.** The overlay above replaces. A second file with the same globs (`tests-project.md`) was written as a second rule in each tool, `tests-project.md` and `tests-project.mdc`, beside `tests`.
- **N8 — meets.** Generating from a clean slate twice gave identical `shasum` for all ten files. Sources are plain files and the project's choices sit in `rulesync.jsonc`, but because N6 puts areas inside the source rules, a project's area edit would be an edit to a shipped file. The generated files carry no fingerprint.
- **N9 — meets.** The release binary runs without Node (above). The npm route needs Node.

**Licence and maintenance.** MIT. Maintainer `dyoshikawa`, 1,519 stars, last push 2026-10-15T05:03:41Z, latest release v35.0.0 on 2026-10-15T04:34:44Z, and 2,852 commits since 2026-07-17 (all pages of the commits API; bot commits are not separated out).

**What the framework would stop maintaining**, if it adopted it for generation: `scripts/generate-cursor-rules.mjs` (53 lines) and `scripts/projections.js` (21 lines), and the writing half of `guards/cursor-rules-projection.test.js` (56 lines), which would compare rulesync's output instead. `scripts/rule-areas.js` (24 lines) would stay or be replaced by a step that writes `.rulesync/rules/` from the project's areas file, since rulesync does not read one (N6, N7). It would add `rulesync.jsonc`, `.rulesync/`, and either the 141 MB binary or `package.json` plus Node.

## Ruler 0.3.44

**Install footprint.** `npm install @intellectronica/ruler` took 2 s: 20 packages (18 top-level folders), 1,190 files, 11 MB, `"dependencies": {"@intellectronica/ruler": "^0.3.44"}`, a 9,166-byte `package-lock.json`. No standalone binary was found; Node is the runtime.

**Configuration, verbatim.** Flat: the five rules copied to `.ruler/<name>.md` and `.ruler/ruler.toml`:

~~~~toml
default_agents = ["claude", "cursor"]
~~~~

Nested: `.ruler/ruler.toml` as

~~~~toml
default_agents = ["claude", "cursor"]
nested = true
~~~~

with `planning.md` copied into `docs/superpowers/plans/.ruler/` and `docs/superpowers/specs/.ruler/`. Commands: `npx ruler apply --agents claude,cursor` and `--nested`.

**What it wrote.**

- *Flat.* `AGENTS.md` (40,519 bytes), `CLAUDE.md` (40,491 bytes), `.gitignore` (a managed block naming `/AGENTS.md`, `/AGENTS.md.bak`, `/CLAUDE.md`, `/CLAUDE.md.bak`, so the generated files are ignored by git) and, on the second apply, `CLAUDE.md.bak`. All five rules are inside, each preceded by `<!-- Source: .ruler/<name>.md -->`; each `paths:` header sits there as literal text. No `.cursor/` at all, and `.claude/settings.json` was not touched. This is the trap the plan names: whole, and always loaded.
- *Nested.* The root `AGENTS.md` (28 bytes) and `CLAUDE.md` (0 bytes) are empty, and `docs/superpowers/plans/` and `.../specs/` each hold a `CLAUDE.md` (21,475 bytes) and `AGENTS.md` (21,503 bytes) with the rule, header text included. Still no `.cursor/rules/`. Nested mode prints that it is experimental.

**The needs.**

- **N1 — does not meet.** Flat, with `.claude/rules/` set aside (2026-10-15T14:27:22Z): all five markers before any tool, from the project `CLAUDE.md`; nothing is scoped. Nested, reading `docs/superpowers/plans/sample-plan.md` (14:28:29Z): no marker before, `R-planning` after, from `docs/superpowers/plans/CLAUDE.md`, as the finding measured for a nested `CLAUDE.md` (C6). That works only for a folder. Two shipped areas are folders (`planning`, `harness-scripts`); three are not: `feature-catalog.yaml`, `learnings` (which includes the file `DECISIONS.md`) and the test patterns.
- **N2 — does not meet.** It writes no `.mdc`. For Cursor it writes `AGENTS.md`: the root one always loaded, and nested ones, the form the finding measured delivering on a read only (C5), unusable for the same three areas.
- **N3 — meets.** No hook; Claude Code's nested `CLAUDE.md`, Cursor's nested `AGENTS.md`.
- **N4 — meets.** Each rule file is whole inside the concatenation (all five full files found verbatim, markers present).
- **N5 — meets.** `.claude/settings.json` untouched; Ruler has no hook feature in this path.
- **N6 — does not meet.** An area is the folder a `.ruler/` sits in, so a project's areas are file placement, and each area carries its own 21 KB copy of the rule (planning twice).
- **N7 — meets with work.** `docs/superpowers/plans/.ruler/planning-project.md` was concatenated into the same `CLAUDE.md`, ahead of the shipped body (alphabetical order). The work: the rule must sit in the area folder.
- **N8 — meets with work.** Flat: three applies gave the same `shasum`. Nested with a root `.ruler/` holding only `ruler.toml`: each apply grew the root `AGENTS.md` and `CLAUDE.md` by 58 bytes (144, 202, 260, 318 bytes on four runs) because it reads its own generated root `AGENTS.md` back as a source. With a `root.md` in `.ruler/` three applies were identical. The work: a root file. It also writes `.gitignore` entries and `.bak` files.
- **N9 — does not meet.** Node and npm.

**Licence and maintenance.** MIT. Maintainer `intellectronica`, 2,945 stars, last push 2026-10-14T19:05:42Z, latest release v0.3.44 on 2026-06-30T12:45:52Z, 50 commits since 2026-07-17.

**What the framework would stop maintaining.** Nothing it now maintains: Ruler writes no file the framework generates, so `.claude/rules/`, the `paths:` header and the Cursor generator all stay.

## AlignTrue 0.9.3

**Install footprint.** `npm install aligntrue` took 5 s: 55 packages (44 top-level folders), 3,362 files, 29 MB, `"dependencies": {"aligntrue": "^0.9.3"}`, a 23,935-byte `package-lock.json`.

**It did not start.** `npx aligntrue --version` failed: `SyntaxError: The requested module 'js-yaml' does not provide an export named 'default'`. `@aligntrue/core` 0.9.3 (published 2025-12-20) declares `"js-yaml": ">=4.1.1"`, and a fresh install today resolves 5.4.3. The work: an npm override in the trial's `package.json`, after which `--version` prints 0.9.3:

~~~~json
{
  "dependencies": { "aligntrue": "^0.9.3" },
  "overrides": { "@aligntrue/core": { "js-yaml": "4.1.1" } }
}
~~~~

**Configuration, verbatim.** `npx aligntrue init --yes --no-starters --exporters cursor,claude --no-sync` wrote `.aligntrue/config.yaml`, `README.md` and `.gitignore` (without `--no-starters` it also wrote four starter rules, which are not the framework's):

~~~~yaml
mode: solo
sources:
  - type: local
    path: .aligntrue/rules
exporters:
  - cursor
  - claude
~~~~

The five sources were written by script into `.aligntrue/rules/<name>.md`, bodies taken byte-for-byte from the shipped rules. `tests.md`'s front matter:

~~~~yaml
---
title: tests
description: "tests rules (generated from .claude/rules/tests.md — do not edit)"
globs: "**/__tests__/**, **/*.test.*, **/*.spec.*, test/**, tests/**"
cursor:
  alwaysApply: false
---
~~~~

The globs are a string, because the exporter passes `globs` through as written. `npx aligntrue sync --yes --non-interactive` then wrote the files below. Sync did not rewrite the source files.

**What it wrote.**

- *Cursor files, against the baseline.* `.cursor/rules/<name>.mdc` with `alwaysApply: false`, `description`, `globs`, in that order. For `planning`: `globs: docs/superpowers/plans/**, docs/superpowers/specs/**`, which is the finding's C2C form. For `planning`, ten lines differ from the baseline: the three front matter lines, and a six-line HTML comment between the front matter and the body (`READ-ONLY: This file is auto-generated by AlignTrue. ...`, 162 bytes) that the baseline lacks. The source body is verbatim inside all five. Two more differences: `harness-scripts`'s description is folded over two lines by the YAML writer, and `tests`'s globs are written as a double-quoted string because the first pattern begins with `*`.
- *Claude Code.* No `.claude/rules/` file. `CLAUDE.md` (1,321 bytes) is a list of links, one line per rule: `- tests (./.aligntrue/rules/tests.md): tests rules (...). For files: ...`, with "AI agents should follow these linked guidelines". With `--content-mode inline` it is 41,160 bytes with all five bodies in it.
- *Others.* A managed block in `.gitignore` naming `.cursor/rules/*.mdc` and `CLAUDE.md`, so generated files are ignored by git; `.cursorignore`, which names `CLAUDE.md` "to prevent duplicate context"; and `.aligntrue/.backups/`, a safety backup on each sync (six after the runs below). `.claude/settings.json` was not touched.

**The needs.**

- **N1 — does not meet.** Default links, with `.claude/rules/` set aside (2026-10-15T14:33:36Z): no marker before any tool, none after the read — the rule was never delivered. `--content-mode inline` (14:34:06Z): all five markers before any tool from the project `CLAUDE.md`, none new after.
- **N2 — meets with work.** `alwaysApply: false`, `description` and a comma-and-space `globs` match the measured C2C form for catalogs, learnings and planning. The work: keep each description short enough not to fold (harness-scripts). The `tests` rule's quoted glob string and the 162-byte comment are forms the finding did not measure.
- **N3 — meets.** No hook.
- **N4 — does not meet.** In links mode a rule does not arrive at all in Claude Code. The Cursor bodies are whole; inline mode is whole and always loaded.
- **N5 — meets.** `.claude/settings.json` untouched. It writes a `.cursorignore` that names `CLAUDE.md`, which could hide the project's `CLAUDE.md` from Cursor; not tried in Cursor.
- **N6 — does not meet.** Areas are the rule's own `globs:`. `aligntrue override add --selector 'rule[id=tests]' --set 'globs=projectarea/**'` was accepted and written to `config.yaml` under `overlays.overrides`, and the Cursor file's globs did not change; nothing warned.
- **N7 — does not meet.** `--set content=extra` was accepted, and **replaced the whole `tests.mdc` body with the word `extra`** (the file went to 345 bytes, with neither the shipped heading nor the marker). A second file, `tests-project.md`, was written as a second rule, `tests-project.mdc`.
- **N8 — meets.** Two syncs gave identical `shasum` for `.cursor/` and `CLAUDE.md`.
- **N9 — does not meet.** Node and npm, and the fresh install did not run without the override.

**Licence and maintenance.** MIT. Maintainer `AlignTrue`, 26 stars, last push 2026-10-13, 1 commit since 2026-07-17 (a chore on 2026-07-25), no GitHub releases (tags `v1.0.0-alpha.6`, `v0.9.2`, `v0.9.1`), npm `latest` 0.9.3 published 2025-12-20.

**What the framework would stop maintaining.** `scripts/generate-cursor-rules.mjs` and `scripts/projections.js` could go, since it writes the Cursor files, but `.claude/rules/` and the `paths:` header stay: it writes nothing Claude Code loads by area.

## ai-rulez 5.3.0

**Install footprint.** `npm install ai-rulez` took 1 s: one package, 52 KB, five files (`README.md`, `ai-rulez.js`, `install.js`, `package.json`), no dependencies and no install scripts. The first `npx ai-rulez --version` downloaded `checksums.txt` (501 bytes) and an archive of 31,205,505 bytes from `github.com/Goldziher/ai-rulez/releases/download/v5.3.0`, verified the sha256 (it fails closed) and extracted `bin/ai-rulez-bin`, 90,904,562 bytes; `node_modules/` was then 87 MB. It asked for no credentials. The binary ran with `PATH=/usr/bin:/bin`: `ai-rulez version 5.3.0`.

**Configuration, verbatim.** `npx ai-rulez init --from auto --yes --skip-content` imported the trial's `.claude/` into `.ai-rulez/`: `config.toml`, `rules/<name>.md`, an indexes and a `.converted.json`. Its report: 9 mapped, 0 approximated, 1 dropped (the `_comment` key), 1 needs-action (the hooks, written as a commented block). `config.toml` as run:

~~~~toml
version = '5.0'
name = 'rule-tooling-trial'
presets = ['claude', 'cursor']

[[hooks]]
event = 'PreToolUse'
matcher = 'Bash'
targets = ['claude', 'cursor']

[[hooks.hooks]]
command = 'bash .framework/hooks/capture-at-merge.sh'
if = 'Bash(gh pr merge *)'

[[hooks.hooks]]
command = 'bash .framework/hooks/framework-commit-check.sh'
if = 'Bash(git commit *)'

[[hooks]]
event = 'PreToolUse'
matcher = 'Edit'
targets = ['claude', 'cursor']

[[hooks.hooks]]
command = 'bash .framework/hooks/capture-at-write.sh'

[[hooks]]
event = 'PreToolUse'
matcher = 'Write'
targets = ['claude', 'cursor']

[[hooks.hooks]]
command = 'bash .framework/hooks/capture-at-write.sh'
~~~~

Each source rule's front matter, `tests`:

~~~~yaml
---
type: Decision
title: Tests
x-ai-rulez:
  kind: rule
  id: tests
  metadata:
    activation: glob
    globs:
      - '**/__tests__/**'
      - '**/*.test.*'
      - '**/*.spec.*'
      - test/**
      - tests/**
---
~~~~

**What it wrote.** `npx ai-rulez generate` wrote 15 to 19 files.

- *Claude Code rules.* `.claude/rules/<name>.ai-rulez.md` (it warned about each hand-written `<name>.md` and avoided it; with those set aside it wrote plain `<name>.md`), with `paths:` as a block list, then a comment `Generated by ai-rulez from .ai-rulez/rules/<name>.md. Edit the source, not this file.` and `Content-Hash: blake3:<64 hex>`.
- *Cursor files, against the baseline.* Ten lines differ per file. Front matter: `description` is absent, `alwaysApply: false` comes first, and `globs: docs/superpowers/plans/**,docs/superpowers/specs/**` is unquoted with no space after the comma. Then the generated comment and hash, and the rule's first heading line replaced: `# Spec and plan rules` became `# planning`, `# Test-design lessons that transfer` became `# tests`. The rest of each body is verbatim in both tools' files. I found no way to add a `description`; not tried further.
- *Others.* `AGENTS.md` (399 bytes, one heading), `CLAUDE.md` (389 bytes, `@AGENTS.md`), `.mcp.json`, `.claude/skills/sample/SKILL.md` and `.cursor/commands/sample.md` from the imported command, and a `.gitignore` block naming only `.ai-rulez/.generated-manifest.local.json`, so generated files are committed. The `.mcp.json` adds `{"command": "npx", "args": ["-y", "ai-rulez@latest", "mcp"]}` for the tool itself; `--no-self-mcp` turns that off.
- *Hooks.* `.claude/settings.json` is merged. Into a file with only a `_comment` key it wrote the hooks with `if` kept and `_comment` kept; into the framework's own settings it wrote no change. For Cursor it warned `[[hooks]] not generated for cursor: a PreToolUse handler sets 'if', which cursor has no equivalent of; running it unconditionally would widen it`, and wrote `.cursor/hooks.json` with only the `Write` hook (`"matcher": "^Write$"`).
- *A hand-written `CLAUDE.md`.* `generate` refused: `refusing to overwrite 1 existing file(s) ai-rulez cannot prove it wrote: CLAUDE.md`, exit 1, unless `--force`. So it does not silently rewrite a project's entry file.

**The needs.**

- **N1 — meets.** `.claude/rules/` hand-written files set aside (2026-10-15T14:37:39Z): no marker before any tool; after the read, `R-tests` as a system message from `.claude/rules/tests.ai-rulez.md`, and no other.
- **N2 — does not meet.** Missing `description`, and the unspaced comma separator.
- **N3 — meets.** Generated rule files; the hook is not used for rules.
- **N4 — meets.** Bodies verbatim apart from the first heading line; the planning rule is 21,615 bytes in the Claude Code file and 21,622 in the Cursor file, which include the generated header.
- **N5 — meets.** It generates the Claude Code hooks by merging, and declines to write `if` hooks to Cursor rather than widen them. Not tried in Cursor.
- **N6 — does not meet.** Areas are `x-ai-rulez.metadata.globs` in each rule's own file. Its `local` overlay is, per its help, for personal presets, profiles, MCP servers and secrets.
- **N7 — does not meet.** A second rule file, `tests-project.md`, was written as a second rule in each tool.
- **N8 — meets.** Generating twice gave identical `shasum` for every generated file, and `generate --check` printed `Generated files are up to date` and exited 0. Each file carries a content hash.
- **N9 — meets.** The binary runs without Node; the npm package is only a launcher. Its default `.mcp.json` brings `npx` back unless opted out.

**Licence and maintenance.** MIT. Maintainer `Goldziher`, 161 stars, last push 2026-10-15, 2,547 commits since 2026-07-17 (bot commits not separated out), releases v5.3.0 (2026-10-14), v5.2.1 (2026-10-14), v5.2.0 (2026-10-13) and a moving `v1` tag (2026-10-15).

**What the framework would stop maintaining**, the same set as for rulesync (`generate-cursor-rules.mjs`, `projections.js`, the writing half of the projection guard), and it would move the hook wiring from `templates/settings.json` into `.ai-rulez/config.toml`, which is not less to maintain. The areas-to-source step stays.

## Comparison

One word per cell. "Today" is the framework's own generator, for reference; its N1 was not re-run here (the Cursor finding measured a `paths:` header arriving in Claude Code 2.1.300), and its N2 is the JSON-array glob that delivered nothing.

| Need | Today | rulesync | Ruler | AlignTrue | ai-rulez |
|---|---|---|---|---|---|
| N1 per-area in Claude Code | not tried | meets | no | no | meets |
| N2 Cursor form | no | no | no | work | no |
| N3 no hook | meets | meets | meets | meets | meets |
| N4 whole | meets | meets | meets | no | meets |
| N5 hooks | meets | meets | meets | meets | meets |
| N6 areas in project file | no | no | no | no | no |
| N7 project companion | no | no | work | no | no |
| N8 deterministic, replaceable | meets | meets | work | meets | meets |
| N9 no Node | no | meets | no | no | meets |

## Recommendation

For the developer to decide: **keep the framework's own generator, and borrow two small things from ai-rulez.** This is a recommendation, not a change; nothing in `scripts/`, `rules/`, `guards/`, `templates/`, `commands/`, `framework/`, `.claude/` or `.cursor/` was edited.

Why not adopt:

- No tool meets N6 or N7. Every one keeps a rule's areas inside the rule's own source, and every one writes a project's companion as a second rule or replaces the shipped body (AlignTrue's `content` overlay did so silently, and its `globs` overlay was accepted and ignored). To get the two entries the framework must write a step that reads the project's areas file and companions and writes the tool's source. That step is most of what the framework's generator is: 154 lines across four files today.
- No tool wrote the Cursor form the Cursor spike measured for all five rules. The nearest, AlignTrue, writes a quoted glob string for one rule, a folded description and a comment block; the others differ by a missing space after the comma, which is unmeasured and which I could not configure out of rulesync. The framework's own generator can write the measured form directly.
- Two of the four deliver the wrong thing in Claude Code (Ruler concatenates, AlignTrue links), and AlignTrue 0.9.3 does not start on a fresh install today.
- The cost is a dependency of 11 MB to 160 MB (ai-rulez's launcher is 52 KB, but it fetches a 91 MB binary) behind a generator that is, for the two tools that work in Claude Code, a 53-line script's job.

What to borrow, from ai-rulez:

1. **A content hash and generated-by comment in each generated file's header**, so a fingerprinted update (N8) can tell a generated file from a hand-edited one. Whether Cursor accepts an HTML comment between the front matter and the body was not measured, so a first version would put the hash where the finding's form is untouched.
2. **A check mode**, `generate --check`, that lists generated files differing from what the sources would write and exits non-zero. The framework's projection guard (`guards/cursor-rules-projection.test.js`) already does this for one pair of files; a mode of the generator would let a project run it too.

It also refuses to overwrite a hand-written entry file without `--force`, which any generator the framework writes should do for `CLAUDE.md`.

One thing the trial changes for `harness-does-not-need-node`: the framework's generator is a Node script. rulesync's release binary and ai-rulez's Go binary both run with no Node on the machine, so if that entry lands first, a generator written in bash or python3 is the alternative to either binary, and the developer may prefer a 141 MB or 91 MB file to maintaining it. This finding does not take that decision.

**The change to `rule-areas-are-project-data`** (proposed, not made). Append to its `value`: *"The generator stays the framework's own. It reads the project's areas file and writes, for each shipped rule, the Claude Code file with its `paths:` header and the Cursor file in the form the Cursor measurement found delivering — `alwaysApply: false`, a description, and an unquoted `globs:` with a comma and a space between patterns — and writes nothing else."* And set `acceptanceCriteria` (empty today) to:

- A project's areas are declared in one file of its own, outside every shipped rule file; changing an area edits only that file.
- One framework command writes, from that file and the shipped rules, each rule's Claude Code file and Cursor file, and nothing else; running it twice writes identical files.
- A fresh Claude Code session that reads a file in one area receives that area's marker sentence and no other area's, and none before the read.
- A guard compares each Cursor file with the measured form field by field (field names, unquoted globs, separator).
- A check mode lists generated files that differ from what the sources would write and exits non-zero; each generated file carries a content hash (borrowed from ai-rulez).
- The command refuses to overwrite a hand-written `CLAUDE.md` or `AGENTS.md` without an explicit flag.

**The change to `shipped-rules-have-project-companions`** (proposed, not made). Append to its `value`: *"No existing rule-sync tool does this — three of four write the companion as a second rule or replace the shipped body — so the framework's generator joins them: it writes the shipped rule and its companion into the one file each tool receives, the companion after the shipped text."* And set `acceptanceCriteria` to:

- A companion file beside a shipped rule is read by the generator, and its text follows the shipped body in the one Claude Code file and the one Cursor file for that rule; no second rule file is written.
- A new framework version replaces the shipped rule files and leaves the companion files and the areas file untouched; a guard proves it.
- A fresh Claude Code session that reads a file in the area receives both the shipped and the companion marker sentence, and neither before the read.
- Whether a Cursor agent receives both on a read is measured by the developer in Cursor, as the Cursor spike was; the criterion says unmeasured until then.

## Tools rejected

- **vibe-rules** (`FutureExcited/vibe-rules`, MIT, 528 stars): no commits since 2025-08-21, none in the last 90 days.
- **ai-rules-sync** (`PanisHandsome/ai-rules-sync`, MIT, 101 stars, v0.3.0 on 2026-06-01): no commits in the last 90 days.
- **AIS / ai-rules-sync** (`lbb00/ai-rules-sync`, Unlicense, 41 stars, 11 commits in 90 days): by its own README "an asset federation toolkit, not a format converter", linking native files by symbolic link. It generates no per-tool rule format.
- **Single-file `AGENTS.md` copiers** (`Hexi1997/agent-root-cli`, `Blackwindow6/agent-sync`, `trick77/agents-md-sync` and similar, 0 to 2 stars): found by search and judged from their one-line descriptions only, not run. They copy one file to several tools and have no per-area rule.
- **`ruler` on npm** (`1.0.0`, 2022, Apache): a different package; the tool is `@intellectronica/ruler`.

AlignTrue was kept in the trial although it has one commit in 90 days and no release since 2025-12-20, because the plan names it; its maintenance is recorded above.

## What was not measured

- Anything in Cursor. N2 is a comparison of files with the finding's form. The `.cursorignore` AlignTrue wrote, and the Cursor hook files rulesync and ai-rulez wrote, were not tried in Cursor.
- Rulesync's and Ruler's behaviour on Linux or Windows, and a Claude Code version other than 2.1.300.
- Whether any tool's own `--check`-style mode exists beyond ai-rulez's (rulesync's was not looked for).
- Whether Cursor accepts the generated comment blocks the tools write between front matter and body.
- `rulesync fetch`, AlignTrue's team mode and remote sources, ai-rulez's lock, signing and policy features: not relevant to the needs and not exercised.
