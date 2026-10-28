# Portability notes

What this blueprint is made of, and how that was decided.

The framework layer existed in two real projects: one where it grew over about six
months, and one it was ported into afterwards. **The difference between those two
installations is the empirical boundary between generic and project-specific.** This
document records that difference. Nothing here was decided by asking "does this look
generic" — that question is exactly the one that produced the material in bucket 3.

The two are referred to below as **A** (where the framework grew — a service-desk
application) and **B** (the port target — a document-generation application). Both are
JavaScript/TypeScript applications on the same hosting platform, which is a real limit on
how much this proves: a port to a third project in a different language would test things
these two never did.

---

## Bucket 1 — Transferred unchanged

These survived the port with no edit beyond renaming. They are the blueprint.

**The injection mechanism.** Identical in shape in both: read the tool's JSON payload
from stdin, extract the target path, strip the repository root, dispatch through a `case`
with most-specific-first ordering, exit silently on no match. Even the ordering comment
survived nearly verbatim in both copies. B added session deduplication; see bucket 4.

**The learning-capture two-phase structure.** Both ask the same two questions in the same
order: where does the *reference record* go, and separately, would an agent violate this
if they did not see it at the moment they act? The second question is worded almost
identically in both. Both end with: draft, ask the developer, wait, write the reference
record first and the rule second.

**The operational-check rule** (`rules/learnings.md`). The one rule file whose *content*
transferred. It is a rule about rules, which is why.

**The layer tag.** `<!-- layer: framework | project | platform -->` at the top of every
rule file, in both, unprompted by the port.

**"What can someone do now that they could not before?"** as the test for a commit body.
Both projects state it in nearly the same words, and both give a good/bad example pair
that differ only in domain. Same for scoping the message against the actual diff rather
than the conversation.

**Verify platform claims rather than recalling them.** A's workflow: training-data
knowledge about API capabilities must not be treated as ground truth. B's: recall about
the rendering engines and the platform is not ground truth. Independently arrived at,
same rule.

**Silent skips are the failure.** Both state that steps may be skipped and that the skip
must be stated with its reason. A enforces it per numbered step; B states it as a
principle. The principle is what transferred.

**Run the suite immediately after changing a test.** A hard gate in both, in the same
words, for the same stated reason.

**The hook wiring** — Read, Edit, Write, all three pointed at the same script — is
identical in both `settings.json` files.

## Bucket 2 — The shape transferred, the content did not

These are in the blueprint as templates with guidance, never as content.

**The entry file.** Structurally identical: an import of the workflow, an identity
paragraph, a pointer list with load conditions, key constants, comment philosophy,
commands. Word-for-word overlap outside the comment-philosophy section: essentially none.
Shipped as `templates/CLAUDE.md`.

**Every rule file.** See bucket 4 — this is the finding, not just a classification.

**`settings.json` beyond the three matchers.** Same skeleton; A adds a credential deny
list, a secrets-guard hook, and a commit-message hook, all specific to how A works.

**The commit scope list.** Same field, disjoint values: A's seven scopes and B's eight
share none. Shipped as a note on how to choose a closed set, not as a list.

**The framework decision record.** Same file, same purpose, same entry shape, zero
overlapping entries — and both had independently allocated `FW-001` and `FW-002` to
different decisions. Shipped seeded with the four decisions that are actually about the
framework, plus a warning about the identifier collision.

**The bootstrap guide.** A had one; roughly 60% of it was platform-specific. The step
sequence transferred; the steps' contents did not.

**Commands as a set.** Both have `capture-learning` and `idea`. Everything else differs
entirely — A has scope, backlog, epic-start, epic-close, test-plan, release; B has
feature, render-check, refresh-model-tiers.

## Bucket 3 — Present in one only, and excluded

**From A, excluded as platform-specific:** its platform layer (a third directory beside
`framework/` and `rules/`, holding the hosting platform's own quirks and decisions), the
baseline-file override table for platforms that ship their own agent instructions, the
credential guard hooks, and ten of its seventeen rule files.

**From A, excluded as ceremony rather than mechanism:** the ten-step numbered cycle with
mandatory stop-and-ask gates at steps 2 and 4, the epic/backlog work-unit model, and the
per-stage skills wrapping them. Excluded because none of it survived the port — B rebuilt
the same cycle in five steps with the ceremony removed, and lost nothing it later had to
add back. The deploy, manual-verify, and release steps *did* have real content, and are
in `framework/workflow.md` as clearly-marked optional sections.

**From A, excluded but worth naming:** two of its four framework-layer decision records
are not framework decisions at all. One is about TypeScript discriminated unions in form
components; another is about rollback in a deploy pipeline. Both sat in a file whose own
header says its contents "would apply to any project using this workflow framework". The
generalisable half of the second one is in the optional release section.

**From B, excluded as domain-specific:** the rendering-engine rules, the token-engine
rules, and the catalog contents. The *pattern* behind each is in the blueprint; the
content is not.

## Bucket 4 — What the port revealed that neither project knew

This is the part that could not have been guessed, and the most valuable output of the
exercise.

**1. Rule content is not merely hard to port. It is unportable.** Five rule files share a
filename across the two projects — `backend`, `frontend`, `shared`, `tests`, `ci`. Not
one shares a sentence with its counterpart. A's backend rules are about resolver
thinness, schema validation, and conditional-write semantics; B's are about container
reuse across tenants and a service→repository→provider layering. The identical mechanism
carried nothing across it. **Only the convention ports: area-scoped, layer-tagged,
compact, paired with a hook branch.** Any future attempt to ship a "standard rule set"
with this blueprint is refuted by its own evidence.

**2. The injection hook needs session deduplication.** Discovered only by measuring the
cost in a real session: without it, one session editing ten files in one area re-injects
the same rules ten times, at ~1900 lines of repeated context for a single test-writing
session. Nothing in A's version suggested this; the hook looked correct and behaved
correctly. It was invisible until someone counted.

**3. The workflow needs a closing step.** A had no doc-closeout step, and the cost showed
up as a guideline ten months stale, describing a subsystem that had been deleted. Work
that ends at "tests green, merge" leaves every reference document drifting, and nothing
reports it. This is now the step the blueprint argues hardest for.

**4. A rule must state its precondition, or it fails silently when ported.** Two
instances in a single day, both from rules that were correct where they were written:

- *"Never hold module-level state"* assumed the platform did not reuse containers. It
  does, and across tenants — so the hazard was real but the prohibition was over-broad,
  banning immutable configuration along with the mutable tenant data that was the actual
  danger. Unpicking it took a research round against the platform documentation.
- *"Split application and framework changes into separate commits"* assumed merges
  preserve branch commits. Ported into a project that squash-merges, it asked for
  bookkeeping the merge discards. It was caught only because the developer noticed that
  two conventions in the same repository could not both matter.

A ported rule whose precondition is unmet does not error. It goes on being obeyed while
producing nothing, or goes on being trusted while wrong. **Extraction is exactly the
activity that strips preconditions**, because it means judging rules written for one
project against all projects — so this is a blueprint concern first and a project concern
second. Applied at three levels: a rule needs its **mechanism** to be understood, its
**boundary** to be applied, and its **precondition** to be ported.

**5. The extraction test already existed in A, and nothing fired it.** A's
learning-capture command instructs, for anything written to the framework layer: strip
all project-specific context — the entry must read as if it came from a different project
entirely. That is precisely the test this extraction used. It was never applied to A's
own framework layer, which is how two platform decisions ended up filed as framework
decisions in a file that says otherwise in its header. The rule was correct, present, and
unreachable at the moment it was needed. **This is the same delivery failure the
framework diagnoses everywhere else, occurring inside the framework** — and it is the
argument for the integrity guard and the fresh-agent check, neither of which existed in A.

**6. The two installations diverged in a consistent direction.** A's framework grew
*ceremony*: more numbered steps, more mandatory stop-and-ask gates, more skills wrapping
each stage. B's grew *mechanism*: deduplication in the hook, projection into a second
tool's format, integrity guards, dispatch prompts that carry their own reading list.
Almost none of A's ceremony survived the port; nearly all of B's mechanism is in this
blueprint. The sharper rule this suggests, beyond "keep it generic":

> **What transfers is machinery that fires by itself. What does not transfer is process
> that depends on a session choosing to follow it.**

**7. Independent convergence is the strongest portability evidence available.** Where the
two projects arrived at the same thing without contact — the layer tag, the two-phase
capture, "value not files" in a commit body, verify-don't-recall — that is better evidence
than any judgment about whether something *looks* generic. Where they diverged, no amount
of the content looking generic made it so. Convergence beat inspection every time it was
tested here.

**8. The framework needs the separation it imposes on everything else.** Every plan is
executed by a session that did not write it, because an author cannot see the gaps in
their own work. The framework itself is written and reviewed in one context, and that
asymmetry produced three defects in a day in B. It is structural rather than incidental:
any project adopting this inherits the same blind spot, because the framework is always
the thing being used to check everything else. The mitigation is cheap — the fresh-agent
check at closeout, plus a guard for the properties that are mechanically checkable.

**9. The hook carried a latent silent failure that six months in two projects never
surfaced.** It stripped the repository root from the incoming path by comparing against
`git rev-parse --show-toplevel`. Git reports the *physical* path; an agent tool may pass
the *logical* one. Any symlinked ancestor makes the two differ — macOS symlinks `/tmp` by
default — and when they do, the strip fails, the path stays absolute, no branch matches,
and **the hook emits nothing at all.** No error, no output, every rule silently gone.

Neither source project was under a symlink, so neither ever saw it. It was found by
dry-running the bootstrap guide into an empty repository under `/tmp`, on the first
attempt to fire the hook. The fix is four lines. The point is not the bug: it is that
**installing the layer somewhere unfamiliar found in one command what two projects of
daily use did not** — the same argument, at a smaller scale, as the fresh-agent check.

---

## Upstream queue flush — 2026-07-27

The port target kept a queue of learnings judged portable at the moment they were made,
flushed here by hand. Where each entry landed, so a reader can check nothing was quietly
dropped:

| Queued learning | Landed in |
|---|---|
| Rule injection must deduplicate per session | Bucket 4 item 2; `framework/DECISIONS.md` FW-001; the hook's own header |
| The workflow needs a doc-closeout step | Bucket 4 item 3; `framework/workflow.md` doc-closeout table |
| A framework rule must state the condition under which it holds | Bucket 4 item 4; `commands/capture-learning.md` Phase 2 question 2; precondition notes in `rules/planning.md` and `rules/learnings.md` |
| The framework needs the separation it imposes on everything else | Bucket 4 item 8; `framework/workflow.md` fresh-agent check; `framework/DECISIONS.md` FW-004 |

The queue held four entries covering roughly two days of work. That rate is why the
flush is manual and stays manual: cross-repository sync automation would be machinery
serving a queue that fills a few times a year.

## Upstream queue flush — 2026-08-01

A second flush, after a day that found and fixed several defects in the framework itself
— two of which this blueprint was still shipping. Where each queued learning landed:

| Queued learning | Landed in |
|---|---|
| A plan's enforced file list must account for what is on the other side of everything it touches | `rules/planning.md` — *The File Structure table is a claim about the repository, not about the diff* |
| The review write-up needs a section recording where each generalisable finding was written down | `rules/planning.md` — *Every review leaves a record* (*Learnings routed*) |
| A unit test that mocks the state its own upstream caller writes cannot see a contract break | **Did not land this round** — needs a test-strategy playbook the blueprint does not carry |
| A guard's cases must assert what the mechanism should do, not what it was observed doing | `guards/rule-delivery.test.js` — harness and the comment on writing cases from intent |
| "Could I be wrong about what the fix should be?" is not enough once a review turns up design defects | `framework/workflow.md` — *When review finds a defect* |
| A lesson in a commit message is undelivered; fire once when a plan merges | `rules/learnings.md` (hook-delivery); `scripts/capture-at-merge.sh`; `templates/settings.json` |
| A rule that codifies a convention must name the existing code that violates it | `templates/rule-claims.test.js` — shape only; the assertions are the seeded project's to write |

Also landed in this flush, from the same day but not as queue rows: the narrowed
branching carve-out and commit-body fresh-agent check (`framework/workflow.md`); the
handover table (`framework/workflow.md`); the handover report, who-reviews, and review
record sections (`rules/planning.md`); `scripts/framework-commit-check.sh`;
`guards/doc-currency.test.js` and `guards/review-record.test.js`; and the two entry-file
fixes in `templates/CLAUDE.md`.

### Deliberately not ported

- **The `shelved` flag** — needs `next-work.js` and `next.mjs`, which the blueprint does
  not carry. Porting the flag without the machinery gives a seeded project a rule about
  a command it does not have.
- **`rules/catalogs.md` material** — the blueprint ships no `catalogs.md`; it has
  `templates/catalog.js` only.
- **`rule-claims` as a guard** — ships as a template instead. Its assertions are claims
  about a specific codebase; shipping someone else's would assert things about a project
  that does not exist yet.
- **The unit-test / mock-boundary lesson** (queue row above) — portable in principle, but
  the blueprint has nowhere to put a testing playbook yet.

**One item travelled the other way.** The scope list in `framework/commit-format.md` —
"one per area a change can belong to, chosen once and kept short" — was already correct
here, while the installation it came from had drifted to a closed list of eight that most
of its own commits violated. The blueprint was ahead, and the drift was found only when an
agent grepped that project's history instead of trusting its rule. Generalising a rule can
improve it, and the generalised copy is worth checking against the specific one in both
directions.

---

## Upstream queue flush — 2026-08-17

A third flush. Four queue rows; all four lessons land. One code artifact is
deliberately left behind.

| Queued learning | Landed in |
|---|---|
| Doc closeout names operator and adopter READMEs as two narrow rows | `framework/workflow.md` closeout table; `rules/planning.md` checklist item 5; `framework/DECISIONS.md` FW-006; `guards/operator-page-closeout.test.js` |
| A guard that falls back across checkouts green-washes a worktree rename | `rules/tests.md` (containment rule + precondition). **The overlay helper did not land** — `existsTracked` / `HARNESS_*` need overlay path resolution this repository does not ship |
| Edit/Write of a rule surfaces the three-question check from the command file | `scripts/capture-at-write.sh`; `templates/settings.json`; `commands/capture-learning.md` extract markers; `rules/learnings.md`; `guards/rule-delivery.test.js` |
| A unit test that mocks the state its own upstream caller writes cannot see a contract break | `rules/tests.md` (faked-boundary). Held back on 2026-08-01 for lack of a landing place; `blueprint-test-design-rules` is that place |

### Deliberately not ported this round

- **`existsTracked` / sidecar overlay path resolution** — the rule ports; the helper stays in the installation that has two-checkout overlay resolution. Porting the helper without that machinery is the same defect as porting `shelved` without `next.mjs` in 2026-08-01.
- **Sidecar `capture-learning` Branch 1 destination sentences** (app checkout vs sidecar) — those paths are this installation’s split. The blueprint command already names generic destinations. The extract wraps Phase 2 only.

## Upstream queue flush — 2026-09-08

Eleven queue rows judged; eight ports land; one held; two declined. The table below has
nine PORTS rows, not eight: the checkout-table lesson was raised while judging the held
row rather than queued, so it ports without being one of the eleven. Words only — no new
modules, guards, or hook patterns. Row 2b (a dispatch validator that refuses a plan
without a checkout table) is future work outside this flush.

| Queued learning | Decision | Landed in |
|---|---|---|
| Shipped/guard seam — which wins when an unobserved criterion remains | PORTS, full shape | `rules/catalogs.md` (guard wins); `rules/planning.md` *Outstanding disposition* |
| Isolation cell is a command field (validator exact-match) | PORTS (hold released 2026-09-09) | `guards/plan-dispatchable.test.js` now ships the checker; behaviour described in `rules/planning.md` (*A plan names the checkouts…*) |
| Plans name checkouts and roles (raised while judging the hold) | PORTS | `rules/planning.md` (*A plan names the checkouts…*); `framework/dispatch.md` template |
| Verification commands per edit-here checkout | PORTS | `rules/planning.md` (*Verification covers every checkout…*) |
| Adding an import is a shape change | PORTS, generalised | `rules/planning.md` fifth shape bullet + checklist item 2 |
| A skipped rule needs evidence, not a second copy | PORTS, generalised | `rules/learnings.md` new section |
| Assert a shared fake by name, not by call count | PORTS | `rules/tests.md` third lesson |
| State a cause in *Found* only once verified | PORTS | `rules/planning.md` *Found* / *Outstanding disposition* |
| A filtered audit hides the surprise | DOES NOT PORT | product-layer; no blueprint landing place |
| A preflight must not abort the run it diagnoses | DOES NOT PORT | same judgment as the audit row; referent already complies |
| Comparable readings before claiming change over time | PORTS, generalised | `framework/workflow.md` cycle step 2 |
| Environment boundary at the deploy command (third part only) | PORTS, third part | `framework/workflow.md` *Optional — deploy* first bullet; first two parts already upstream |

### Deliberately not ported this round

- ~~**Isolation-cell / worktree-command validator behaviour**~~ — was held because it
  described a checker the blueprint did not ship. Released 2026-09-09: the blueprint now
  ships `guards/plan-dispatchable.test.js`, and the two behaviours the held lesson
  described — the isolation cell is matched as a command, and the scan reaches the whole
  document — are stated in `rules/planning.md` beside the requirement they qualify.
- **Filtered audit / diagnostic that must not abort its own run** — product-layer scripts
  inspecting live external data. The blueprint has none and will not grow a rule file for
  them. Already recorded in the installation that owns those scripts. Declining matches
  this document's own cancelled-section reasoning: do not write a description of something
  that already exists as code when nobody who needs the lesson cannot read the code.

### Raised outside this flush

- **Dispatch-time refusal of a plan that does not name its checkouts** — code plus hosting
  for a blueprint-owned runner. Catalog entry for the developer to raise at `layer:
  blueprint`; not created here.

## Upstream queue flush — 2026-10-07

Twenty-five queue rows judged, plus one blueprint-layer entry folded in. Nine rows land
as prose; twelve become nine blueprint-layer catalog entries in the installation that
built them (three lessons fold into a capability's entry, and one describes a defect the
blueprint must fix rather than document); one row was already upstream; three are
declined. Words only — no new modules, guards, or hook
patterns. The capabilities are recorded, not built.

| Queued learning | Decision | Landed in |
|---|---|---|
| Isolation cell is a command field | ALREADY UPSTREAM | `rules/planning.md` (ported 2026-09-09; the queue row was never drained) |
| Closeout asks what a change built, not only what it taught | PORTS, generalised | `framework/workflow.md` closeout table; `commands/capture-learning.md` Branch 6 |
| A developer-only step is a handover; check before stopping | PORTS | `rules/planning.md` *Plans must be self-contained* |
| Skip-review and skip-CI are one list | PORTS, principle only | `framework/workflow.md` *Branching* |
| Say whether anything enforces the merge gate | PORTS, first half | `framework/workflow.md` *Branching* |
| Writing deployment automation is not running a deploy | PORTS, first half | `framework/workflow.md` *Optional — deploy* |
| A reused fixture is checked for its new purpose | PORTS, second half | `rules/tests.md` |
| A test filter matching the worktree name selects everything | PORTS, generalised | `rules/tests.md` |
| A generated region inside a hand-written page | PORTS, as prose | `rules/catalogs.md` |
| `/dispatch`, with per-row isolation | RAISES ENTRY | `blueprint-plans-dispatch-from-one-command` |
| `/flush-upstream` | RAISES ENTRY | `blueprint-queue-drains-from-one-command` |
| Rule hook blind to the sibling checkout | RAISES ENTRY | `blueprint-rules-reach-the-sibling-checkout` |
| Rule area for harness scripts | RAISES ENTRY | `blueprint-harness-scripts-have-a-rule-area` |
| Arc progress below the work | RAISES ENTRY | `blueprint-arc-progress-follows-the-work` |
| Plan file list checked against projections | RAISES ENTRY | `blueprint-plan-file-lists-are-checked-against-projections` |
| `/manual-check` | RAISES ENTRY | `blueprint-manual-checks-have-one-command` |
| `/release`, with notes drafted from the catalog | RAISES ENTRY | `blueprint-releases-from-one-command` |
| Working-copy setup command | RAISES ENTRY | `blueprint-working-copy-sets-up-in-one-command` |
| A pull-request path filter sees the whole diff | DOES NOT PORT | GitHub Actions-specific |
| A private platform rollout owes a privacy statement | DOES NOT PORT | platform-specific; general shape is the generated-region row |
| An opinion layer beside a fact layer goes stale | DOES NOT PORT | no board in the blueprint for it to attach to |

### Folded in — `blueprint-carries-its-own-premises`

What the 2026-08-01 flush left behind, now carried: the premise *A commit message is not
a delivery mechanism* heads the hook-delivery paragraphs in `rules/learnings.md`; the four
paragraphs on aiming a fresh-agent check are in `framework/workflow.md`; and
`bootstrap.md` and `templates/settings.json` describe the Bash matcher.

---

## Upstream queue flush — 2026-10-10

Five queue rows judged. Two land as prose; two become blueprint-layer catalog entries in
the installation that built them; one is declined. Words only — no new modules, guards,
or hook patterns. The capabilities are recorded, not built.

| Queued learning | Decision | Landed in |
|---|---|---|
| Hooks reply in the one shape both tools hear; the rule hook is unwired | RAISES ENTRY | `blueprint-hooks-reach-the-agent` |
| The model roster lists only what the supported tools offer | PORTS, generalised | `commands/refresh-model-tiers.md`; `framework/model-tiers.md` |
| The overlay copies instruction files and links only scripts | RAISES ENTRY | `blueprint-overlay-copies-instruction-files` |
| A test never writes into a folder a tool reads | DOES NOT PORT | the blueprint writes no worktree-local briefing for a test to erase |
| A measurement names its tool, version and machine | PORTS, generalised | `framework/workflow.md`; `rules/planning.md`; `scripts/framework-commit-check.sh` |

---

## Upstream queue flush — 2026-10-14

Six queue rows judged. Three land as prose, and one of those also becomes a
blueprint-layer catalog entry in the installation that built them; one more becomes a
catalog entry only; two are declined. Words only — no new modules, guards, or hook
patterns. The capabilities are recorded, not built.

| Queued learning | Decision | Landed in |
|---|---|---|
| Wire a hook once and match at command position | PORTS, and RAISES ENTRY | `rules/harness-scripts.md`; `hooks-match-at-command-position` |
| A measurement names its tool; any install may run it | PORTS, replaces the earlier requirement | `framework/workflow.md`; `rules/planning.md` |
| A fresh-agent check is a third kind of catalog evidence | PORTS | `rules/catalogs.md` |
| Rules load by area, and stay under a size cap | DOES NOT PORT | headers and the generator are already here; the size cap was rejected under *No size limit* in `framework/DECISIONS.md` |
| The backlog board | RAISES ENTRY | `backlog-shows-open-work-on-one-page` |
| A plan keeps its file-structure test after a handover | DOES NOT PORT | `guards/plan-dispatchable.test.js` already keeps one test per plan and decides inside it whether to check |

Per-flush sections stop being written by flushes. One-line-per-PR submissions would all
edit this same file and conflict; the merged pull requests are the record from now on.
Existing sections stay.

---

## What this evidence does not cover

Both source projects are JavaScript/TypeScript, on the same hosting platform, worked on
by the same developer, with the same test runner and the same merge model. So:

- Anything **language-specific** in the guards is untested outside JavaScript.
- The **squash-merge assumption** runs through the commit and planning conventions. It is
  now stated wherever it applies, but it has never been exercised under a different merge
  model.
- **Single-developer** assumptions may hide in the workflow — nothing here has been tested
  against concurrent human reviewers.

A third port, ideally in another language, is what would test these. Until then, treat
this document as evidence from a sample of two.

### Since resolved by decision — 2026-08-12

The gap above was read for a long time as a defect: the framework looked technology-bound
and the evidence could not prove otherwise. Re-examined, the premise was wrong. **No guard
shipped here reads a line of the adopting project's source** — every path they resolve is
under `.claude/`, `docs/`, the entry file, or the injection hook. The adopting project's
language is not a variable they can see, so the sample-of-two limit never applied to them
in the way it applies to the rules.

What *is* assumed, and now stated rather than inherited, is a set of tools on the
developer's machine: `git`, `bash`, `python3`, and `node`. Three of those were already
required — the injection hook has parsed its payload with `python3` since the bootstrap
guide was written.

`framework/DECISIONS.md` records this as *Independent of the project's technology,
opinionated about its own*, with what follows for what is shipped and what is refused.
**The bullets above still stand**: this decision rests on a structural property of the
artifact rather than on a port, and a third installation in another language remains the
thing that would test it.

### An exclusion reversed — 2026-08-14

The 2026-08-01 flush left `rules/catalogs.md` behind, on the grounds that this repository
shipped a catalog template and no catalog rule. That was a statement about what existed,
not a finding that the material could not port, and it is reversed now: the rule ships,
and with it a schema for the backlog and one canonical format.

**This is the third rule file here, and bucket 4 item 1 is not contradicted by it.** That
finding — that any standard rule set is refuted by this blueprint's own evidence — rests
on five rule files sharing a filename across two installations and not one sentence.
Every one of those described *a project's code*: its backend, its frontend, its tests.
This rule describes *the framework's own data model*, which is why it ports for the same
reason `learnings.md` does. The test remains what it always was: does the content read as
though it came from a different project entirely?

**The format was proven before it was canonised.** An installation migrated a real backlog
of sixty-six entries to YAML first, and the document generated from it came out
byte-for-byte identical. That is the same method this document argues for everywhere else
— evidence from a working installation rather than judgment about what looks generic —
applied to a decision that had no precedent to draw on.

The `shelved` flag, excluded in the same 2026-08-01 list, ships here as part of the
schema. The reason it was held back was that it needed a backlog command this repository
did not carry; that reasoning covers *how a command lists a shelved entry*, which is still
absent, and not what the field means to someone reading the backlog.

### A planned section, cancelled — 2026-08-16

A written definition of what every guard and command must do was planned, so a project on
an unsupported stack could reimplement them. It was cancelled before it was written, and
the reasoning is worth keeping because the mistake is an easy one to repeat.

The technology decision here requires `node`. A description aimed at someone who cannot run
`node` therefore serves a reader that decision had already ruled out. Worse, a description
of what code must do, sitting beside that code, is a second statement of one thing — and
the strongest finding in this document is that two copies of a statement drift, silently,
because each looks complete from where you are standing.

What replaced it is smaller: a command that reports which required tools are missing, and
one document stating what rule delivery must achieve. That second one survives the argument
because its portability problem is not about language — it is about what an agent tool can
do — and no runtime settles it.

**The general form, which is what ports:** before writing a description of something that
already exists as code, ask who cannot read the code. If the answer is nobody, the
description is a copy waiting to drift.
