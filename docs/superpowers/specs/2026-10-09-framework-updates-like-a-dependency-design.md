# The framework updates like a dependency — design

> **Amended 2026-10-13.** The project moves into one repository and the framework is installed
> into it (`docs/superpowers/specs/2026-10-13-project-lives-in-one-repository-design.md`).
> This arc's remaining entries move to the framework repository and are replanned there for
> that layout; read the decisions below about links, copies and two checkouts as history.

Written 2026-10-09. Scope and order agreed by the developer in the specifying session the
same day, after the update-model spike
(`docs/superpowers/specs/2026-10-08-blueprint-update-model-finding.md`) and a comparison
with Trellis. One decision is deliberately left to an entry inside the arc: the
framework's name. Everything already found on it is recorded below so the entry that
decides does not have to look again. A second, copy with fingerprints versus a git
submodule, was decided by the developer on 2026-10-09: copy with fingerprints, in the
separate harness repository.

## The problem

A project seeded from the blueprint gets a copy of the framework and then edits that
copy in place. So:

- **An improvement made upstream does not reach a project** — from this project or any
  other using the blueprint — except by sorting differences by eye. This harness's seven
  copies of blueprint scripts differ by 409 lines, unclassified.
- **A project's own settings sit inside framework files.** The rule ladder in
  `inject-rules.sh`, the Cursor globs, additions to shipped rules — each is a reason a new
  version cannot simply replace the old one.
- **Nothing tells a project whether taking a version is safe.**

Separately, two delivery gaps came out of the Trellis comparison and the spike:

- Rules delivered mid-session by a hook do not reach the agent in Claude Code, and in
  Cursor a hook printing Markdown makes the tool refuse the call
  (`hook-injected-rules-reach-the-agent`, measured 2026-09-15).
- A rule delivered once per session is not delivered again after `/compact` or `/clear`:
  the marker that says "already delivered" is keyed on `session_id`
  (`.claude/scripts/inject-rules.sh`, where the marker directory is built from it), and
  that id survives both.

## What becomes true

A project takes a new framework version with one command, the way it updates a library;
its own settings and additions live in its own files, so the command never has to merge
them; before taking a version it can ask whether doing so is safe and be told why; and
the rules it is given reach the agent in every supported tool, including after the
conversation is compacted.

## Decisions already made

- **Keep this framework and borrow four ideas from Trellis**, rather than adopting
  Trellis. The four: its update model (idea 1), rule re-delivery after compaction
  (idea 2), hooks answering in each tool's own format (idea 3), and measuring an
  instruction with and without it (idea 4). We write our own code for each — Trellis is
  AGPL-3.0, and none of its code is copied. Reasons are in *The Trellis comparison*
  below.
- **The project's application history stays clean**: the framework lives in its own
  repository beside the application and is linked in, as today, rather than committed
  into the application. A nested repository inside the application was rejected again
  (it was first rejected on 2026-08-14): worktrees do not carry it, and forgetting to
  push it loses work silently. The setup command may write the links into
  `.git/info/exclude` instead of the application's `.gitignore`, so the application
  carries no trace of the framework at all; that is a detail for the take-a-version
  entry.

  **Changed 2026-10-09, accepted by the developer:** the framework's *instruction files*
  — `CLAUDE.md`, `.claude/rules/`, `.claude/framework/`, `.claude/commands/`,
  `.claude/settings.json` — are **copied** into the application, still gitignored, and
  refreshed from the harness; the rest stays linked. Claude Code loads no instruction
  file reached through a link, at any depth, unless the folder once had an interactive
  approval, and Cursor runs no hook through the linked folder. The measurements and the
  trade-off are in
  `docs/superpowers/specs/2026-10-09-application-sessions-carry-their-rules-design.md`.
  The application's history still carries nothing.
- **Root files shrink to two links.** *(Superseded for `.claude/` by the change above:
  it is copied, not linked.)* `CLAUDE.md` moves to `.claude/CLAUDE.md`, which
  Claude Code reads, and `AGENTS.md` is dropped. The overlay then links only `.claude/`
  and `.cursor/` into the application.
- **A project holds the framework as a copy with fingerprints**, in the separate harness
  repository, not as a submodule. Decided 2026-10-09; see below.
- **The folder takes the framework's new name**, once the naming entry has chosen one.
- **The downstream merge command first proposed in the spike is not built.** After this
  arc, updates go through the take step and the check; a hand merge happens only when a
  file a project changed was also changed upstream, which companions make rare. This
  harness's own one-time move is a single reviewed plan, not a command.

## The entries, in build order

The order follows the spike's proposal, with the four borrowed ideas slotted in where
they depend on nothing or on one entry.

1. **`hook-injected-rules-reach-the-agent`** (exists, framework). Hooks answer in each
   tool's own format, so what a hook says reaches the agent and Cursor does not refuse
   the call — borrowed idea 3. Measured on 2026-10-09: in Claude Code the rule hook's
   output never reached an agent, while Claude Code loaded all eleven rule files at the
   start of every session by itself — about 17.8k tokens, `planning.md` alone about 6.3k
   (the `/doctor` report of 2026-10-09 agrees). The per-area loading the framework was
   designed for (FW-001) had never happened. The plan first also gave every rule a
   `paths:` header, which makes Claude Code load a rule only for its area in a real
   `.claude/` folder — but with the headers the application, whose `.claude/` is a link,
   got no rules at all. **Re-scoped the same day, by the developer:** this entry ships
   the hook replies and switches off the dead rule hook; rules keep loading at session
   start.

   **`rules-load-only-for-their-area`** (new, framework) takes per-area loading over:
   first how the application actually receives its rules — a fresh, trusted clone of it
   with the full overlay loads none, the real one loads all eleven, and nobody yet knows
   why — then the headers or whatever replaces them. After the audit, which asks the
   first half as its Q3.

   **Then, before entries 2, 3 and 5 are shaped: `framework-claims-are-measured`** (new,
   framework, spike). Every claim the framework makes that something works is sorted by
   what it rests on — measured at the agent or the person, checked on our own side only,
   or never checked — because the rule hook passed its tests for months while reaching
   nobody. Broken claims about rules or hooks go to entry 1's plan or its review; others
   become entries in this arc. The sorting is kept in `docs/instruction-surface.md` as
   one more column, so a later reader sees the evidence beside the claim.
2. **`rules-return-after-compaction`** (new, framework). After `/compact` or `/clear` an
   agent touching a file in an area receives that area's rule again. Borrowed idea 2:
   Trellis resets its delivered markers from a `SessionStart` hook whose `source` is
   `compact` or `clear`. Since entry 1 the question is narrower: whether Claude Code
   re-attaches a path-scoped rule after compaction, and whether Cursor re-attaches a
   `.mdc`. If both do, the entry closes with no work.
3. **`rule-areas-are-project-data`** (new, blueprint). A project's rule areas live in one
   file both tools read. Prototyped in the spike: 18 of 18 paths and 11 of 11 projections
   identical.
4. **`seed-installs-cursor-generator`** (new, blueprint). Found in the spike:
   `seed-sidecar.sh` never copies `generate-cursor-rules.mjs`, so a seeded project lacks
   the projection the blueprint documents.
5. **`shipped-rules-have-project-companions`** (new, blueprint, after 3). A project adds
   to a shipped rule in its own file and every tool delivers both. Two things the spike
   could not run belong in its criteria: a Cursor agent asked from inside what a rule
   with a companion requires, and precedence when the two genuinely conflict.
6. **`blueprint-tool-agnostic-name`** (exists, idea, blueprint). **Its first step is
   agreeing the name** with the developer, from the research below; nothing else in the
   entry starts before that. Then the repository, the folder and the command take it.
7. **`project-takes-a-framework-version`** (new, blueprint, blocked by 3, 5 and 6). One
   command takes a version and records it, with Trellis's safety: a backup before
   writing, a file the project changed is never overwritten but the new version is
   written beside it as `.new`, and a version marked breaking needs an explicit yes.
   The project holds the framework as a copy with fingerprints, in the separate harness
   repository — decided 2026-10-09, analysis below — with a check in the suite that
   fails when a shipped file no longer matches its fingerprint. The entry also decides where a project's own hook entries in `.claude/settings.json`
   live, which the spike did not prototype.
8. **`project-knows-whether-to-update`** (new, blueprint, blocked by 7). Run against the
   current project, it answers *safe*, *safe with these steps*, or *not now*, with
   reasons. The spike worked it through once by hand for this harness: *not now*, with
   49 of 388 tests red against the current blueprint.
9. **`harness-adopts-the-update-model`** (new, framework, blocked by 7). This harness
   moves onto the model once, in one reviewed plan: its rule areas to data, its "ahead"
   improvements flushed, its additions split into companions, the guards that pin shared
   wording retargeted, a version recorded. Entry 8 then answers *safe* for it.
   Supersedes `harness-scripts-match-the-blueprint`, the same sync done by hand.
10. **`rule-is-measured-with-and-without`** (new, framework, spike). Borrowed idea 4:
    Trellis's `ablate` runs the same task with and without an instruction and compares.
    The spike decides whether that measurement is worth having here and what it costs;
    it is related to `rules-are-retired-on-evidence`, whose trial removes one clause per
    flush sitting and watches one agent.
11. **`framework-installs-as-a-package`** (new, blueprint, idea, after 8). The framework
    installs as a command-line package — `npx <name> init`, `update`, `check` — with
    thin per-tool wrappers on top, such as a Claude Code plugin skill
    `/<name>:init`. Trellis is the proof this works with copying: it is an npm package
    that installs by copying files.

## Added from the claims audit — 2026-10-09

The audit (an unpublished record of 2026-10-09) found
that the application's rules, workflow and hooks reach an agent only where Claude Code
once approved external includes, and that no area rule reached a Cursor agent. Its
accepted proposals join this arc, because every later entry assumes instructions reach
the session they are written for:

- **`application-sessions-carry-their-rules`** — first; per-area loading follows it.
- **`write-moment-check-heard-in-the-application`**, **`plan-binding-survives-the-test-suite`**,
  **`gated-hooks-speak-once`** — small bugs the audit measured.
- **`delivery-claims-say-what-is-true`** and **`measurements-name-their-tool-and-machine`**
  — the framework's pages and its measurements say what is true and where it was seen.

## Re-ordered 2026-10-12 — per-area loading before rule areas

Agreed by the developer after a review of this spec, the spike, the claims audit and every
plan merged on the arc. The order to entry 3 is now:

1. **`blueprint-hooks-reach-the-agent`** (blueprint, joins the arc). Entry 1 carried to the
   blueprint: every hook replies in the shape both tools deliver, and the rule hook is
   removed. The blueprint's rule-delivery page is rewritten to say what a project gets:
   every rule at session start in Claude Code, the workflow and no area rule in Cursor.
2. **`rules-load-only-for-their-area`** (framework), narrowed to Claude Code. The blocker
   that took `paths:` headers out on 2026-10-09 — the application's rules were links — was
   removed by `application-sessions-carry-their-rules`; the audit measured a `paths:`
   rule attaching on a matching read in a real `.claude` folder (Q5). It also removes the
   harness's unwired rule hook and the guards still asserting its ladder.
3. **`cursor-agents-receive-area-rules`** (framework, spike, new). No Cursor glob rule
   attached in any case the audit measured (Q2), so generating Cursor globs from an areas
   file would feed a mechanism that delivers nothing until this is answered.
4. **`blueprint-overlay-copies-instruction-files`** (blueprint, joins the arc). The
   blueprint's overlay still links `.claude`, the layout in which a `paths:` header
   delivered nothing; a seeded project needs copies before per-area loading can work.
5. **`rule-tooling-spike`** (framework, spike, added 2026-10-12). Rule-sync tools
   (rulesync, AlignTrue, Ruler) already generate each agent tool's native rule files from
   one source. Before entry 3 builds that by hand, this finds out whether one should be
   adopted, and what it cannot do that this project needs.
6. **Entry 3, `rule-areas-are-project-data`**, blocked by 2, 3, 4 and 5. Its areas file
   becomes the source of whatever loads a rule per area in each tool. One question is left
   to its shaping: a `paths:` header sits inside the rule file, so writing a project's
   paths into a shipped rule changes a file entry 7 fingerprints. Either the header is
   left out of the fingerprint, or `.claude/rules/` becomes a generated folder.

This does not give up on loading only the rules a session needs. Removing the rule hook
costs nothing — its output never reached an agent — and per-area loading comes from
`paths:` headers in step 2.

**Step 2 shaped 2026-10-12** (`docs/superpowers/specs/2026-10-12-rules-load-only-for-their-area-design.md`):
`paths:` loads a rule only for a file inside the session's own folder, so a small hook
delivers the rule for a file in the other checkout; a hook reply arrives whole only under
about 10,000 characters, so `planning.md` is split in three.

## Replanned 2026-10-14 — a project lives in one repository

On 2026-10-13 first-adopter stopped using a sibling harness: its rules, commands, backlog,
specs, plans and the framework's code are committed in the application repository, and
the harness is archived (`first-adopter:docs/superpowers/specs/2026-10-13-project-lives-in-one-repository-design.md`,
step 3 of which is this replan, agreed with the developer). Wherever this spec says
"harness", "sidecar", "overlay" or "the other checkout", read the project's own
repository: the framework is copied into its `.claude/` and `.framework/`.

- **New first build, `project-is-set-up-in-its-own-repository`.** The blueprint still seeds
  a sibling harness, links or copies an overlay and sets up two checkouts. That setup is
  rebuilt once, here, in the shape entry 7 needs, instead of now and again when updating
  arrives. It absorbs `seed-installs-cursor-generator`, now superseded. first-adopter's
  step 2 is the worked example.
- **Entry 7, `project-takes-a-framework-version`,** builds on it: the fingerprinted copy
  lands in the project's `.claude/` and `.framework/`.
- **Entry 3, `rule-areas-are-project-data`,** loses two blockers: per-area loading has
  shipped, and the overlay-copy entry is superseded — a project in one repository has no
  overlay. Its open question about `paths:` headers inside fingerprinted files stands.
- **`rules-return-after-compaction`** becomes a spike: whether Claude Code re-attaches a
  rule loaded by its `paths:` header after `/compact` or `/clear`, and whether Cursor
  re-attaches its projection. The hooks it first asked about are gone.
- **Smaller rewordings:** `rule-tooling-spike` no longer asks about loading across two
  checkouts; `harness-does-not-need-node` speaks of a project's `.framework/` and follows
  the new first build; `integrity-guard-is-green-on-a-fresh-checkout` and
  `learnings-can-be-declined` drop "harness".

The order of the remaining entries is otherwise unchanged.

## Decided: copy with fingerprints, not a submodule

Decided by the developer on 2026-10-09: copy with fingerprints, in the separate harness
repository, with the suite check below. The analysis is kept so the reasons travel with
the decision. Both keep the application's history clean, since
in both the framework's files are linked into the application from the separate
repository, as today; the question is how the separate repository holds the framework.

**Copy with fingerprints.** The take step copies the framework's files in and records a
fingerprint (a hash) of each file as shipped. On the next update, a file whose hash
still matches was not touched by the project and is replaced; a file whose hash differs
was changed by the project, so the new version is written beside it as `.new`.

- Files sit where every tool already looks, with no prefix on commands.
- Proven at scale: this is how Trellis updates, with 149 migration manifests behind it.
- Separation is *detected*, not enforced: nothing stops someone editing a shipped file.
  A check in the suite closes that: it fails when a shipped file no longer matches its
  fingerprint and is not a declared project file, so an edit to framework machinery is
  caught the same day rather than at the next update.
- Works as a package: an npm package can install by copying.

**Submodule.** The framework is a git submodule inside the harness; the submodule's pin
is the version.

- Physical separation: a shipped file cannot be edited by accident without it showing as
  a change in another repository. This is the developer's preference, for that reason.
- The version is the pin; no lock file needed.
- Unverified, and each could fail: whether `CLAUDE.md` imports resolve through the
  links, whether hooks run correctly from the submodule's path, and whether Cursor reads
  rules through links.
- Needs a submodule checkout on every machine, in every worktree, and in every cloud
  session — where it would be a third repository to attach.
- Commands become prefixed if delivered as a plugin; the developer considers that
  acceptable (superpowers does the same).

**Why copy with fingerprints, plus the suite check.** It gives the same day-to-day
protection — an edit to a shipped file goes red — without the three unverified
mechanisms and the extra checkout everywhere.

## Plugins, as found

From Claude Code's documentation, read 2026-10-08:

- A plugin can ship skills, commands, hooks (using `${CLAUDE_PLUGIN_ROOT}`), agents, MCP
  servers and executables. It cannot ship `CLAUDE.md` or rules content.
- Its commands are always prefixed `/<plugin>:<name>`.
- A project can enable plugins in `.claude/settings.json` but cannot pin a version.
  Marketplaces can be private git repositories.
- Plugins are Claude Code only.

So a plugin can be a front door (entry 11) but cannot be the whole framework: rules and
`CLAUDE.md` still have to be files in the project.

## The Trellis comparison

From a comparison run by a separate agent on 2026-10-08; the commit and catalog figures
were checked in this session.

**Trellis** — `github.com/mindfold-ai/Trellis`, about 14,900 stars, AGPL-3.0. One
maintainer wrote 88% of its commits, and activity fell from 305 commits a month in April
2026 to 10 in September.

**Stronger than ours on:**
- updates — `trellis update` with fingerprints, 149 migration manifests, a backup, `.new`
  on conflict, and a gate on breaking versions;
- reach — 22 tools supported;
- re-delivering rules after compaction;
- session memory, and a short state reminder on every prompt.

**Ours is stronger on:**
- the backlog, isolated dispatch, review records and the manual-check log;
- guards proven by fixtures that are broken on purpose;
- rules delivered at the moment a file is touched, before the edit;
- Cursor `.mdc` projections;
- a clean application history — Trellis writes `.trellis/` and its tool folders straight
  into the application repository, with no overlay;
- this project's specifics.

**Cost note.** Since 2026-08-14 the harness has 311 commits against the application's 43,
and 68 of 104 shipped entries are framework or blueprint work against 36 product. That
cost is the case for taking Trellis's ideas rather than inventing our own, and for not
growing the framework further than this arc.

## Naming research

For entry 6. Checked 2026-10-08 and 2026-10-09; nothing decided. The rule applied: a
name already used by an AI or agent tool is out; an npm name being taken matters only if
the framework is published there (entry 11), and plugin names are per marketplace.

**Candidates still standing:**

- **Fairlead** — the cleanest. The fitting that guides a rope so it runs true without
  chafing. No AI coding or developer tool found under the name; only tiny unrelated
  repositories with one or two stars, one of them a Pydantic AI runtime called
  "fairlead". The npm name is taken.
- **Keel** — taken by small AI projects (KeelDev-tech/keel, an AI product builder; a Rust
  agent harness by Dane Balia), plus keel-hq/keel (Kubernetes, about 2,700 stars) and
  teamkeel/keel. npm `keel` and PyPI `keel-kit` are taken. Usable, but crowded.
- **Lodestar** — an Ethereum client (about 1,400 stars) and a tiny agent project
  ("trust layer for AI agents").
- **Ballast** and **Sextant** were also checked; Sextant is used by mattpocock/sextant.

**Ruled out — already an AI or agent tool:**

| Name | Existing use |
|---|---|
| Trellis | the agent framework compared above (about 15k stars); also Microsoft's 3D model; npm taken |
| Bosun | bosun-ai |
| Belay | agent-belay hook server, and a Belay Claude Code plugin |
| Jig | an agent firewall |
| Gantry | knacklabs agent runtime |
| Steward | scala-steward |
| Truss | Baseten's AI model serving |
| Docket | agent evidence tools |
| Plumb, Plumbline | an agent MCP server and an analyser |
| Waymark | agent governance |
| Cairn | cairn-dev background agent, and cairn-code |
| Keelson | spec-driven development for Claude Code |

**Sources:** glama.ai (Waymark); github.com/cairn-dev/cairn;
github.com/euxaristia/cairn-code; tomevault (agent-belay, plumbline); pkg.go.dev
plumbkit/plumb; github.com/KeelDev-tech/keel; everydev.ai (daneb); github.com/teamkeel/keel;
github.com/keel-hq/keel; socket.dev (npm keel); pypi.org (keel-kit); the Trellis README
on jsdelivr; docs.trytrellis.app.

## Not in scope

- Supporting tools beyond Claude Code and Cursor.
- Session memory and the per-prompt state reminder Trellis has: noted as strengths, not
  borrowed.
- Building any of this here — each entry gets its own plan.
