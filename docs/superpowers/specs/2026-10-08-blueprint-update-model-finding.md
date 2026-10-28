# How a seeded project updates to the latest blueprint — finding

**Catalog entry:** `harness-takes-the-blueprints-improvements` (spike).
**Plan:** `docs/superpowers/plans/2026-10-08-harness-takes-the-blueprints-improvements.md`.
**Measured against:** blueprint `main` at `6300a05`, this harness at `b9acbf1`, Claude Code
2.1.260 (`claude -p`, model `claude-sonnet-5`).

## Summary — the recommendation

A seeded project can take a new blueprint version the way it updates a library for
everything except its own prose, and the prose can be kept beside the shipped files rather
than inside them. Three changes get it there. **First, move the project's settings out of
the shipped scripts into data files the scripts read** — the prototype did this for the
hardest one, the hook's rule ladder, and the hook and the Cursor projection delivered
exactly what they did before for every path tried (18 of 18 paths, 11 of 11 projected
files byte-identical), with the blueprint's own check green. **Second, keep a project's
additions to a shipped rule in a companion file beside it** — measured: the hook, the
Cursor projection and Claude Code's session-start loading all deliver both, and a fresh
agent applied them together. That works for rules only; a companion to a command becomes a
second command, and a companion to a framework document is never read unless the entry
file names it. **Third, take versions with a copy step that records what it copied** — a
lock file of version and per-file fingerprints — rather than a git submodule or package,
because the submodule route renames every command (`/release` becomes `/shipped:release`)
and moves the paths every document and tool refers to. The lock is also what makes the
update check possible: it tells a shipped file the project changed from one the blueprint
changed. Run by hand for this harness, the check answers **not now**: the harness was never
seeded — the blueprint was extracted from it — so it has no record of which version it
holds, and taking `main` today turns 49 of its 388 tests red. A reviewed merge stays
needed exactly once, to bring this harness onto the new model; after that, it is needed
only when a project has edited a shipped file the blueprint has also changed.

---

## 1. Inventory — what the seed installs, and what this harness did to each

**Starting list.** Every `cp` in the blueprint's `scripts/seed-sidecar.sh` plus the five
hooks in `scripts/installed-hooks.txt`: 49 files.

**One fact changes how every row below reads.** This harness was **not** seeded. Its first
commit (`d1d8f0d`, 2026-08-14) imports an overlay from the application checkout, and the
blueprint's first commit (`1d9173d`, 2026-07-27) is titled *extract the portable framework
layer from two installations*. The blueprint was cut **from** this harness and has been
fed by its upstream queue since. So a difference here is one of four things, and only one
of them means "the project owns this":

- **project content** — this project's paths, names, incidents, platform;
- **behind** — the blueprint generalised or fixed something this harness never took back
  (for example: optional paths in the overlay script, the `project-owned` region markers,
  `existsSync` guards, the sibling-checkout fix in the hook);
- **ahead** — this harness improved something the upstream queue has not yet carried (for
  example: `framework-commit-check.sh` gating `.claude/commands/` and warning about
  non-document commits on `main`; `capture-at-merge.sh` asking what a plan *built*;
  `isolate-for-plan.mjs` writing `executing-plan.mdc`; the Cursor generator projecting
  framework documents as always-on rules);
- **reworded** — the same portable point, phrased differently on each side. For prose this
  is most of the difference: across the fourteen documents compared, word-level diff runs that
  mention anything project-specific (this project's names, Forge, Jira, PDF, rendering,
  "here", the sidecar) are 2–13 per file against 15–240 differing runs in total.

**Scripts** — from `bash scripts/check-drift.sh ../first-adopter-harness-update-spike`, run
from the blueprint: *10 of 11 script(s) differ from the blueprint outside their
project-owned regions*. Lines shown as blueprint-only / harness-only after the check strips
comments, blank lines and project-owned regions.

| File | Sort | Spot or content | Why it differs |
|---|---|---|---|
| `.claude/scripts/inject-rules.sh` | edited in one spot | the rule ladder (11 areas, plus a second pass that adds `tests.md`) and the marker prefix `first-adopter-rules` | ladder is project content; the harness copy predates the region markers and the sibling-checkout fix (behind) |
| `.claude/scripts/capture-at-write.sh` | edited in one spot | marker prefix `first-adopter-capture-write` (1/1 lines) | project value |
| `.claude/scripts/capture-at-merge.sh` | edited, not in one spot | 55/16 | blueprint inlined the plan-lookup helpers; harness imports them from `src/shared/` (layout) and asks what a plan built (ahead) |
| `.claude/scripts/framework-commit-check.sh` | edited, not in one spot | 5/32 | harness gates commands and non-document commits on `main` (ahead) |
| `.claude/scripts/check-prerequisites.sh` | not present | — | shipped after the harness's setup |
| `.claude/scripts/isolate-for-plan.sh` | never edited | clean | — |
| `scripts/isolate-for-plan.mjs` | edited, not in one spot | 17/60 | writes `executing-plan.mdc` and recognises the harness by its package name (ahead, with one project value) |
| `scripts/dispatch.mjs` | edited, not in one spot | 19/19 | import path into `src/shared/` (layout); blueprint made model tiers and projection checks optional (behind) |
| `scripts/next.mjs` | rewritten | 60/76 | three streams — product, harness, upstream queue — because this project has two catalogs' worth of work in one file (project content and ahead) |
| `scripts/install-overlay.sh` | edited in one spot | default app path and two extra linked documents | project values; blueprint made each link optional (behind) |
| `scripts/setup-working-copy.sh` | edited, not in one spot | app name, URL, submodule step, `npm ci` helper (17/20) | values belong in the blueprint's project-owned block, which the harness predates; submodule step is project content |
| `scripts/generate-cursor-rules.mjs` | edited in one spot | the glob table, plus an always-on projection of framework documents | table is project content; always-on projection is ahead. **The seed does not install this file at all** — a seeded project gets no Cursor generator |
| `scripts/next-work.js`, `plan-binding.js`, `projections.js` | moved | live in `src/shared/` here, with their tests | layout: the harness tests its helpers as modules |

**Rules** (`.claude/rules/`). The harness also has six rule files of its own (`backend`,
`frontend`, `shared`, `providers`, `tokens`, `ci`) — project-owned, never shipped.

| File | Sort | Spot or content |
|---|---|---|
| `tests.md` | rewritten | marked `layer: project`. Project rules (run through npm, 80% backend coverage, level marker on line 1, file naming, fixtures folder, locale-formatted values) interleaved with the portable lessons, which are worded differently on each side |
| `catalogs.md` | rewritten | marked `layer: project`. Names this project's two catalogs and generators, then the portable status rules, reworded |
| `planning.md` | edited throughout | portable rule, with this project's plan folder, two-checkout table and incidents woven into paragraphs; 4 headings differ |
| `learnings.md` | edited throughout | two sections the blueprint lacks (a rule that claims something carries an assertion; a temporary clause names its expiry) — portable, so ahead; "in the project this came from" vs "here" |
| `harness-scripts.md` | reworded | the same bullets; the blueprint's added the project-owned-regions bullet (behind), the harness's has two extra sentences of evidence |

**Framework documents** (`.claude/framework/`).

| File | Sort | Spot or content |
|---|---|---|
| `DECISIONS.md` | rewritten | a decision record; each side records its own decisions. Not shippable content at all — it is the project's |
| `model-tiers.md` | rewritten | the roster and benchmark notes, refreshed by `/refresh-model-tiers` in each project; the tier definitions above it are shared |
| `workflow.md` | edited throughout | portable process with this project's render check, generated-document exceptions and Forge notes woven in; mostly reworded |
| `commit-format.md` | edited in two spots | the list of scopes in use; a *Two remotes* section for the app checkout. The rest reworded |
| `dispatch.md` | reworded | the blueprint restructured it (behind) |
| `doc-architecture.md`, `rule-delivery.md` | not present | shipped after extraction |

**Commands** (`.claude/commands/`).

| File | Sort | Spot or content |
|---|---|---|
| `refresh-model-tiers.md` | never edited | identical |
| `release.md` | rewritten | this project's release: Forge, the GitHub workflow, the Jira *Manage apps* upgrade, the Actions URL |
| `capture-learning.md`, `manual-check.md` | edited throughout | which checkout owns each destination; render and screen checks |
| `flush-upstream.md`, `idea.md`, `feature.md`, `next.md`, `dispatch.md` | reworded | 2–5 project-flavoured runs each; the rest is wording |
| `bootstrap.md`, `scope.md` | not present | shipped after extraction |
| `refresh-board.md` | project-owned | harness only |

**Entry file, settings, templates.**

| File | Sort | Spot or content |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md` | rewritten | it is the project's entry file by design — Gotchas, setup, the *Load on demand* table. `AGENTS.md` is a link to it here |
| `.claude/settings.json` | edited by addition | five extra hook entries (`inject-plan-binding.sh` on three tools, `deploy-environment-check.sh` on four command shapes); the template's explanatory `_comment` removed |
| `feature-catalog.yaml` | project-owned | the backlog — never shared content |
| `package.json`, `jest.config.mjs` | project-owned | the harness's own scripts and test runner |
| `README.md`, `templates/*`, `docs/verification-log.md`, `guards/*` | not present / replaced | the harness has its own README; its 29 guards live in `src/shared/__tests__/`; the verification log lives in the app checkout |

**What the inventory says.** Five things a project edits are true settings — values or a
table in one recognisable spot: the rule ladder, the glob table, the two marker prefixes,
the app name and URL, the overlay's extra links, and the extra hook entries. Everything
else that differs is either the project's own document by nature (catalog, entry file,
decision record, model roster), **prose with project content mixed into portable content**
(`tests`, `catalogs`, `planning`, `workflow`, `release`, `capture-learning`,
`manual-check`), or drift in both directions that an update model must stop from
recurring.

## 2. Project settings in the project's own files

**Where each spot can live.**

| Spot | Can it be a project file? | How |
|---|---|---|
| Rule ladder + glob table | yes — prototyped | `.claude/rule-areas.json`, read by the hook and the generator |
| Marker prefixes (two hooks) | yes | one line in the same file, or derive it from the repository name; nothing else reads it |
| App name and URL in `setup-working-copy.sh` | yes | already a project-owned block today; a two-key settings file would let the script be copied untouched |
| Overlay's extra linked documents | yes | a list in a settings file; the script already skips missing links |
| Extra hook entries in `settings.json` | partly | the project's hooks can sit in the same file as the shipped ones only if the take step merges by matcher; alternatively the shipped wiring is regenerated and project entries kept in a second list. Claude Code's documentation says it also merges hooks from `.claude/settings.local.json` (not measured here), but that file is per-machine and normally untracked, so it is the wrong home for a project's guard. Not prototyped |
| Scopes list in `commit-format.md`, `Two remotes` section | no — prose | a companion (section 3) |

**Prototype — the hook's rule ladder as data.** In a throwaway clone of the blueprint
under the system temp folder:

- `scripts/inject-rules.sh` — the ladder region replaced by a lookup: read
  `.claude/rule-areas.json` (`{ "<rule>.md": ["<glob>", ...] }`), emit every rule whose
  glob matches the path. The match is done in the `python3` the hook already uses to read
  its payload, with Cursor's glob meaning (`*` stops at a slash, `**` crosses any number).
  The one remaining project-owned region is the marker prefix.
- `scripts/generate-cursor-rules.mjs` — its `GLOBS` table replaced by a read of the same
  file. No project-owned region left.
- `templates/rule-areas.json` added, and `seed-sidecar.sh` copies it.
- Adapting the blueprint's own guards and fixtures: `framework-integrity` reads the areas
  file instead of parsing `emit` lines, and its *hook and glob map agree* check is deleted —
  the two tools now read one file, so they cannot disagree; the sample project's areas
  moved into `fixtures/base/.claude/rule-areas.json`; the `broken-ladder` defect became an
  areas file that sends backend files nowhere; the sibling-checkout test writes an areas
  file next to the hook; `check-drift`'s fixture stopped editing a ladder that no longer
  exists.

**Blueprint check on the clone** —
`env -u CLAUDECODE NODE_MODULES=<sidecar>/node_modules bash scripts/check-blueprint.sh`:

```
  caught      orphan-rule            framework-integrity
  ...
  caught      broken-ladder          rule-delivery
  ...
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

All 12 planted defects caught. The first run failed two guards on the clean baseline; both
were mistakes in adapting the guards (a deleted declaration, a fixture edit aimed at the
removed ladder), fixed, and the second run is the one above.

**Seeded from the clone**, with this harness's eleven rule files and its glob table as the
areas file, the prototype hook was compared with this harness's real hook — the rule names
each emitted, read from each hook's per-session marker folder:

```
src/backend/rendering/providers/prince.js   ladder: backend.md providers.md   data: backend.md providers.md   same
src/backend/utils/token-resolver/index.js   ladder: backend.md tokens.md      data: backend.md tokens.md      same
src/backend/__tests__/x.test.js             ladder: backend.md tests.md       data: backend.md tests.md       same
src/shared/token-catalog.js                 ladder: catalogs.md shared.md     data: catalogs.md shared.md     same
src/shared/__tests__/rule-claims.test.js    ladder: shared.md tests.md        data: shared.md tests.md        same
feature-catalog.yaml                        ladder: catalogs.md               data: catalogs.md               same
manifest.yml                                ladder: ci.md                     data: ci.md                     same
.claude/rules/tests.md                      ladder: learnings.md              data: learnings.md              same
package.json                                ladder: tests.md                  data: tests.md                  same
README.md                                   ladder: (none)                    data: (none)                    same
... 18 of 18 paths the same
```

The prototype generator, run in the seeded harness, wrote 11 `.mdc` files; all 11 are
byte-identical to what this harness's own generator writes from the same rules. (The
harness's generator also writes `workflow.mdc`, from its always-on projection of
framework documents, which the blueprint does not have.)

**What it changes for each tool.**

- **Claude Code** — nothing it can see. The hook still prints the same rules for the same
  paths. (Whether that output reaches the agent at all is the separate open question in
  `hook-injected-rules-reach-the-agent`; this design neither helps nor hurts it.)
- **Cursor** — nothing it can see. The same `.mdc` files are written.
- **Both together** — the one real gain. "Every match fires" is how Cursor already
  attaches rules, so the hook now means what Cursor means. The ladder's first-match order,
  and the *ordering* rule in the hook's header, go away. The harness's second `case` pass
  for `tests.md` — a workaround for first-match — needs no special form. And a mismatch
  between the two tools becomes impossible rather than guarded: today
  `framework-integrity` compares only *which rule files* the two name, never their globs,
  and the blueprint's own sample shows the gap — its shipped ladder sends `CATALOG.yaml` to
  `catalogs.md` while the fixture's glob table sends `feature-catalog.yaml`, and the check
  passes.

**What it costs.**

- **No new interpreter.** The hook already requires `python3`; the generator already runs
  under Node.
- **A format**, JSON: no comments. The ladder's comments ("narrow areas first", why the
  harness-scripts branch exists) would move to the rule files or a README line.
- **A migration**: one file per project, mechanical — the existing `GLOBS` table *is* the
  areas file. A project whose ladder has paths that are not globs (none here) would need
  them rewritten.
- **Guards**: `framework-integrity` gets simpler; `rule-delivery`'s scratch harnesses must
  write an areas file; `check-drift`'s fixture loses its ladder edit; three fixture files
  change. About ten blueprint files in all, most of them guards and fixtures.

## 3. Shipped prose beside a project companion

**Rules — prototyped and measured.** In a throwaway seeded harness (from the prototype
clone), `tests.md` was set to the blueprint's shipped version and this harness's
project-only test rules went into `tests.project.md` beside it, opening with *This
project's own test rules. They extend the shipped lessons in `tests.md` beside this file.*
The areas file lists the companion with the same globs as `tests.md`.

- **Hook** — for `src/backend/__tests__/foo.test.js` it emitted `backend.md`, `tests.md`,
  `tests.project.md`, in that order: headings *Backend rules*, *Test-design lessons that
  transfer*, *Test rules — this project*; 9,380 bytes.
- **Cursor projection** — wrote `tests.mdc` and `tests.project.mdc`, both with
  `globs: ["**/__tests__/**","**/*.test.js","package.json","jest.config.mjs"]`. Cursor
  attaches both for any test file. Not observed inside Cursor (see *Could not run*).
- **Claude Code's native loading** — a fresh `claude -p` session in that folder, all tools
  disabled, asked which `.claude/rules/` files were already in its context: it listed all
  twelve, including `tests.md` (*Test-design lessons that transfer*) and
  `tests.project.md` (*Test rules — this project*).
- **Does a fresh agent read them as one rule?** A second fresh session, tools disabled,
  was told it was about to create `src/backend/__tests__/invoice.test.js` and asked what
  the test rules require. It gave one twelve-item list mixing both files — the level
  marker, npm-only, the 80% threshold and locale-formatted values from the companion; the
  real-sequence and shared-fake lessons from the shipped file — and, asked, attributed
  them to their files — each to the right one, though it swapped two item numbers.
  Asked what it would do if two conflicted: *"I'd follow `tests.project.md` over
  `tests.md`"*, citing the companion's own header sentence. So the agent **applies** them
  as one rule set, **knows** they are two files, and takes precedence from the one
  sentence the companion carries. That sentence is load-bearing and should be a fixed
  form.

**Framework documents — delivered by reference — the companion is missed.** In the same
harness, `.claude/framework/workflow.project.md` was added with one project requirement (a
render check recorded before an entry that affects a rendered PDF ships). A fresh session,
read tools allowed, was asked what the workflow requires before such an entry ships. It
read four files, listed `.claude/framework/*.md` (so the companion's name was in front of
it), and answered at length — without the companion's requirement, and its list of files
read does not include it. `workflow.md` reaches the agent because the entry file imports
it by name (`@.claude/framework/workflow.md`); nothing names the companion. **A framework
document's companion is delivered only if the entry file imports it** — one line per
companion in `CLAUDE.md`, which is itself project-owned, so this is cheap, but it is a step
someone must remember and a guard must check.

**Commands — delivered by name — a companion becomes a second command.** With
`.claude/commands/release.project.md` present, the session's start-up record listed both
`release` and `release.project` as slash commands. A command companion cannot sit beside
its command under any name ending `.md`. The workable shapes are a project file the
command *reads* (`/release` says "then follow `docs/release-steps.md` if it exists") or a
settings file the command consults. That puts the extension point inside the shipped
command, so each command that projects extend needs one, named.

## 4. How a project takes a new version

Two ways compared. A third — an npm package from a git tag — behaves like the submodule
for everything below except that it needs a registry or a tag URL, so it is folded into
the first.

| | **A. Blueprint as a pinned dependency** (git submodule at `vendor/blueprint`, linked into `.claude/`) | **B. Copy step with a lock** (`scripts/take-blueprint.sh <ref>` copies the shipped files and writes `.claude/blueprint.lock`: version + one fingerprint per file) |
|---|---|---|
| Update | bump the submodule pin, re-run the link step, regenerate projections | run the take step for the new ref; it copies, regenerates projections, rewrites the lock — one commit |
| Pin / roll back | the pin is the submodule commit; roll back by reverting it | the lock names the version; roll back by reverting the take commit, or taking the older ref |
| A shipped file the project changed anyway | cannot be changed in place without dirtying the submodule — good — but a project that needs to will copy it out and lose updates silently | the take step sees the file's fingerprint no longer matches the lock and **refuses to overwrite it**, naming the file — the input the update check needs |
| Needs on the machine | git submodules in two checkouts linked by an overlay; `setup-working-copy.sh` must init them; nested links app → harness → vendor | nothing new: `bash`, `git`, `node` |
| How the tools find files | **rules**: measured — Claude Code loads `.claude/rules/shipped/` through a linked folder. **commands**: measured — a linked `commands/shipped/` folder renames every command: `/release` becomes `/shipped:release`, `/next` becomes `/shipped:next`, and every document that says `/release` is wrong. Linking files one by one avoids that — which is a copy step under another name. **Hooks**: settings would call `vendor/blueprint/scripts/…`. **Cursor**: needs generated `.mdc` either way. **Framework imports**: `@.claude/framework/workflow.md` must point through the link | every file stays where every document, hook, guard and tool already looks. Nothing about the overlay changes |

**Recommendation: B.** The submodule's one real advantage — a shipped file cannot quietly
become a project file — the lock gives as well, by detection rather than prevention, and
detection is what the update check needs anyway. Everything else favours B: no command is
renamed, no path in any document moves, nothing new is needed on the machine, and a take is
one reviewable, revertible commit. The comparison turned on how the tools find commands
and rules through a link, so that was measured rather than read (section 3 harness, plus a
second throwaway with `vendor/blueprint` linked in).

## 5. The update check

**What it examines.** Run from the project as
`scripts/take-blueprint.sh --check <ref>`, it reads `.claude/blueprint.lock` and the
blueprint at `<ref>`, and answers five questions:

1. **What changes.** The shipped files that differ between the locked version and `<ref>`
   — changed, added, removed — and the blueprint's commit subjects between the two. The
   blueprint already writes each commit as what becomes true (*a seeded project dispatches
   a plan with one command*), so the subjects are the summary a person reads.
2. **Has the project changed any of them.** Each shipped file's fingerprint against the
   lock. A changed file that `<ref>` also changes is a conflict; a changed file `<ref>`
   leaves alone is reported and left.
3. **Do the project's settings and companions still fit.** Every rule file has an area;
   every area names a file that exists; every companion's shipped partner still exists;
   any setting a new version requires (a new key in the areas or settings file, a new
   companion the entry file must import) is present.
4. **Does it still work.** In a scratch copy: take `<ref>`, regenerate projections, run the
   project's own suite (twice, for the known fresh-checkout flake) and the delivery probes.
5. **What agents will be told differently.** For each changed rule, framework document or
   command, the word-level diff and the commit subject that changed it, grouped by file,
   for a person to read. This is not judged by the check; it is put in front of the person.

**How it decides.**

- **safe** — no conflicts (2), settings fit (3), suite green in scratch (4).
- **safe with these steps** — no conflicts, and every gap in (3) or failure in (4) is one
  of a known list of mechanical steps the check can name: add an area for a new rule file,
  import a new framework companion, regenerate projections, fill a new setting. It prints
  the steps and re-runs (4) with them applied; it answers this only if that run is green.
- **not now** — any conflict in (2), or any failure in (4) not cleared by a named step.
  It says which files and which tests, and what each would need.

**Worked through once, by hand, for this harness against `main` (`6300a05`).**

*What it needs first.* This harness has no lock: it was never seeded, so no version is
recorded. The nearest honest baseline is the blueprint commit that absorbed the last flush
(2026-10-07; `PORTABILITY-NOTES.md` § *Upstream queue flush — 2026-10-07*), but the harness
did not take that commit, so fingerprints against it would mark every file as changed. It
needs an adoption step before the check can mean anything (section 6, entry 4).

*What it would examine and find,* reproduced by hand — a scratch copy of this harness (its
suite green twice: 29 suites, 388 tests), with every file the seed installs overwritten
from `main` except the project's own (catalog, entry file, settings, package, test config),
37 files in all, then `npm test`:

```
Test Suites: 10 failed, 19 passed, 29 total
Tests:       49 failed, 339 passed, 388 total
```

1. **What changes:** 37 files — 29 this harness has and `main` changes, and 8 it does not
   have: `doc-architecture.md`, `rule-delivery.md`, `bootstrap.md`, `scope.md`,
   `check-prerequisites.sh`, and three helpers it keeps under `src/shared/` instead.
2. **Project changed them:** every shipped file the harness has except
   `refresh-model-tiers.md` and `isolate-for-plan.sh` — all conflicts, since `main`
   differs too.
3. **Settings fit:** no — there is no areas file; the shipped ladder replaces the
   project's, so `providers.md` and `tokens.md` lose their branch
   (`framework integrity › fires every rule file from a hook pattern` received
   `["providers.md", "tokens.md"]`); `doc-architecture.md` is reached from nothing
   (`rule delivery › framework documents are reachable`).
4. **Still works:** 49 failures, which fall into four causes:
   - **Project settings overwritten — 25.** The ladder (12 path cases in
     `rule-delivery`, 3 in `framework-integrity`), the app name and URL
     (`setup-working-copy.sh`, 6: *no clone at …/\_\_APP_NAME\_\_*), the release specifics
     (2), the projections not regenerated (2 — a step, not a failure).
   - **Harness improvements lost — 13.** The command gate and the main-branch warning in
     `framework-commit-check.sh` (2), the *what did it build* question in
     `capture-at-merge.sh` (1), the checkout-ownership line in `capture-at-write` (1),
     `executing-plan.mdc` from `isolate-for-plan.mjs` (1), the three-stream `/next` report
     and its no-conducting check (8).
   - **Harness guards that pin harness prose — 10.** `planning.md` (7 — the headings and
     one-place rules the harness's `rule-text-claims` asserts), the instruction-surface
     map (1), and the operator-page closeout naming harness READMEs (2). These are the
     harness asserting its own wording of shared prose.
   - **A new shipped document reached from nothing — 1** (`doc-architecture.md`, above).
5. **Told differently:** every rule, framework document and command — too broad to read
   usefully, which is itself the finding: until the reworded prose is reconciled once,
   this summary is noise.

*Answer:* **not now.** Conflicts on 28 shipped files, a red suite, and causes that no
mechanical step clears. Before the check can answer anything else this harness needs, in
order: the rule areas moved to a data file (prototyped above); its improvements queued
upstream (the "ahead" rows of section 1 — the queue's own mechanism); its project prose
split into companions, and its guards that pin shared wording moved to assert only the
companions; then one reviewed merge of the shared prose, after which it records a lock.

## 6. What remains, and the proposal

**What still cannot be separated.**

- **Prose with project content woven into paragraphs.** `planning.md`, `workflow.md`,
  `release.md` carry this project's incidents and paths *inside* portable sentences ("got
  wrong three times in one day here"). A companion holds additions; it cannot hold a
  rewording of a shipped sentence. Each such sentence has to be either generalised upstream
  or accepted as the shipped wording. That is a one-time editorial job, not machinery.
- **Commands that projects rewrite.** `/release` is this project's release process; the
  blueprint's is a template for one. A command companion cannot exist as a file beside it
  (section 3). The shipped command needs a named point it hands over to.
- **The decision record and the model roster.** `DECISIONS.md` and the roster in
  `model-tiers.md` are each project's own, and should stop being shipped as files a project
  edits: ship the shared part (tier definitions) and an empty record.
- **Precedence between a shipped rule and its companion** is carried only by a sentence the
  agent reads. Measured to work once; whether it holds when the two genuinely conflict was
  not tested.

**Proposal** — the entries to raise, in the order I would build them. You decide.

1. **The rule areas are project data** — *a project's rule areas live in one file both
   tools read, so the hook and Cursor cannot disagree and a new blueprint never overwrites
   them.* Depends on nothing. Prototyped here; about ten blueprint files, most of them
   guards and fixtures.
2. **The seed installs the Cursor generator** — *a seeded project gets the projection the
   blueprint documents.* Found in passing: `seed-sidecar.sh` never copies
   `generate-cursor-rules.mjs`. Depends on nothing; small.
3. **A shipped rule has a project companion** — *a project adds to a shipped rule in its own
   file, and every tool delivers both.* A fixed header sentence carrying precedence; the
   integrity guard requires every companion to have a shipped partner and an area; entry
   file imports for framework-document companions; a named hand-over point for commands
   instead of a companion file. Depends on 1.
4. **A project takes a blueprint version with one command** — *the take step and its lock:
   copy, refuse to overwrite a file the project changed, record the version.* Depends on
   1 and 3, so that there is somewhere for project content to go when the take refuses.
5. **A project knows before updating whether it is safe** — *the check in section 5,
   answering safe / safe with these steps / not now, with reasons.* Depends on 4 (it needs
   the lock).
6. **This harness adopts the update model** — *the hard case, once:* move its areas to data,
   flush its "ahead" improvements, split its prose into companions, retarget the guards
   that pin shared wording, reconcile the reworded prose in one reviewed merge, record a
   lock. Depends on 1–4; the check (5) then confirms it answers *safe*.

**Is the downstream merge command still needed?** As a standing command, no: after entry
6, updates go through the take step and the check, and a project merges by hand only when
the check says a file it changed was also changed upstream — which entry 3 makes rare.
For the one-off adoption in entry 6 a merge is needed, but it is a single reviewed plan,
not a command worth building.

## Could not run

- **Cursor observed from inside.** `cursor-agent` is installed but `cursor-agent status` did
  not return within two minutes (it waits on a login), so no Cursor agent was asked about
  the companion pair. The projection was shown from its output files only. To settle:
  in Cursor, open a test file in a harness with `tests.mdc` and `tests.project.mdc` and ask
  the agent what the test rules require.
- **Hook output reaching the agent.** Not re-measured; the hook's *output* was compared,
  not its delivery, per `hook-injected-rules-reach-the-agent`.
- **Settings merge for hook entries.** Not prototyped; section 2 says what would settle it.
