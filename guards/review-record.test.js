// Level: unit
/**
 * Fails when a plan file carries an unfilled record template.
 *
 * A missing section is visible; a template that looks filled is not. P0 merged with
 * its verification record reading "<paste the run URL>" three times, against a merge
 * criterion that explicitly required the URL recorded — and six plan files carried
 * unfilled templates for two days before anyone looked.
 *
 * This checks the placeholders are gone, not that the content is good. No test can
 * check whether a review was thorough; this checks it was written at all.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// Pointed at fixtures/ by scripts/check-conformance.sh, so this guard can be seen to
// fail. Unset in normal use, when it resolves to the repository root as before.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../../..');
const plansDir = resolve(root, 'docs/superpowers/plans');

/**
 * Was this plan already executed on `origin/main`?
 *
 * Under parent review the executor writes the handover and the REVIEWER writes
 * the record, so between those two commits the record legitimately does not
 * exist. Without an exemption the suite is red on every parent-review branch
 * from the handover commit until merge — making "full suite green" a criterion
 * the executor cannot satisfy, and turning the pull request's CI red for reasons
 * unrelated to the work. Found reviewing P13.
 *
 * The exemption is deliberately NOT "any plan file this branch touched". That
 * version was written first and is too wide: it lets a branch DELETE a review
 * record from an already-merged plan and stay green. The question asked here is
 * narrower — did the handover report exist on origin/main? If it did, the record
 * was owed then and is still owed. If it did not, this branch is the execution
 * and the reviewer has not had their turn yet.
 *
 * Fails CLOSED. If origin/main cannot be read — a shallow clone, a detached
 * checkout with no remote — nothing is exempt and every plan is checked. A guard
 * that switches itself off when it cannot orient is worse than one that is noisy.
 */
function executedOnMain(name) {
  const result = spawnSync(
    'git',
    ['show', `origin/main:docs/superpowers/plans/${name}`],
    { cwd: root, encoding: 'utf8' }
  );
  if (result.status !== 0) return true; // not on main, or unreadable — fail closed
  // Fences stripped for the same reason the caller strips them: a plan may QUOTE a
  // handover heading inside a code block. One that specifies fixture files which are
  // themselves sample plans quotes it twice, and the raw text then says the plan was
  // already executed when main carries no handover at all — so the branch that is the
  // execution loses its exemption and goes red for the reviewer's unwritten record.
  return /^## Handover report/m.test(stripFences(result.stdout));
}

/**
 * Placeholders that mean "nobody filled this in".
 *
 * `[^>\n]` not `[^>]`: without the newline exclusion the pattern spans a line
 * break and matches prose that merely DISCUSSES a placeholder. A review record
 * quoting one while explaining it is legitimate content, and an earlier draft of
 * this guard flagged exactly that.
 */
const PLACEHOLDER = /<paste [^>\n]*>|<list>|<n>|yes \/ no|<result, or [^>\n]*>|<one line per gap>/;

/** Blank out inline `code` spans — a record may quote a placeholder to discuss it. */
function stripInlineCode(text) {
  return text.replace(/`[^`\n]*`/g, '``');
}

/** Only the sections a human is supposed to fill after the fact. */
const RECORD_SECTIONS = /^## (Verification record|Review record|Handover report)/m;

function planFiles() {
  return readdirSync(plansDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(plansDir, f));
}

/** Blank out fenced code blocks, preserving line count. */
function stripFences(text) {
  let inFence = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

/**
 * The part of a plan from its first record HEADING onward.
 *
 * Two scoping bugs were found here before this plan was dispatched, both
 * producing false positives that would have sent an executor to "fix" text that
 * was correct:
 *
 *   1. indexOf(m[0]) matched the heading text inside backticks in prose and
 *      sliced too early. Use search(), which honours the ^ anchor.
 *   2. A handover report legitimately QUOTES another plan's record as evidence,
 *      inside a code fence. The quoted heading matched. Fences are stripped first.
 */
function recordPortion(text) {
  const stripped = stripInlineCode(stripFences(text));
  const idx = stripped.search(RECORD_SECTIONS);
  return idx === -1 ? null : stripped.slice(idx);
}

describe('review and verification records', () => {
  it('gives every executed plan a review record', () => {
    // A plan that was executed carries a handover report. It must also carry a
    // review record — an executed plan that nobody recorded reviewing is the
    // failure this guard exists for.
    const missing = [];
    for (const file of planFiles()) {
      const name = basename(file);
      const body = stripFences(readFileSync(file, 'utf8'));
      if (!/^## Handover report/m.test(body)) continue; // not executed under this convention
      if (/^## Review record/m.test(body)) continue;
      // Executed on this branch and not yet reviewed — the reviewer's turn.
      if (!executedOnMain(name)) continue;
      missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it('has no unfilled placeholder in a record that exists', () => {
    const offenders = [];
    for (const file of planFiles()) {
      const portion = recordPortion(readFileSync(file, 'utf8'));
      if (!portion) continue;
      const hit = portion.match(PLACEHOLDER);
      if (hit) offenders.push(`${file.split('/').pop()}: ${hit[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('gives every review record a Learnings routed section', () => {
    // planning.md requires five sections; until this assertion the guard checked
    // that a record existed and had no placeholders, and nothing more. The
    // obligation was stated and unenforced.
    //
    // Scope to the review-record portion with the same fence/inline stripping
    // recordPortion already applies — a plan that quotes the heading in prose
    // is not a plan that has one.
    const missing = [];
    for (const file of planFiles()) {
      const body = stripInlineCode(stripFences(readFileSync(file, 'utf8')));
      const idx = body.search(/^## Review record/m);
      if (idx === -1) continue;
      const record = body.slice(idx);
      if (!/^### Learnings routed/m.test(record)) {
        missing.push(basename(file));
      }
    }
    expect(missing).toEqual([]);
  });
});
