// Level: unit
/**
 * Guards the framework against itself.
 *
 * Every other guard in a repository points from the framework at the code. This one
 * points at the framework: a document pointing at a file that does not exist sends its
 * reader nowhere, and nothing fails loudly on its own.
 *
 * This is the framework-integrity property that is mechanically checkable. The
 * ones that are not — whether a rule states its mechanism, its precondition, and where
 * it is delivered — are handled by /capture-learning and the doc-closeout step. Do not
 * read this suite passing as evidence the framework is correct; it is evidence the
 * framework is internally consistent.
 *
 * ── ADOPTING THIS ────────────────────────────────────────────────────────────
 * Written for Jest with ESM; nothing here depends on Jest beyond describe/it/expect. The
 * one property it checks: every path referenced in backticks by the framework's own
 * documents resolves. Rule areas are checked by rule-areas.test.js.
 *
 * One thing to set on adoption: `root` below, so it resolves to the repository root from
 * wherever this file lands.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// SET ON ADOPTION: levels from this file up to the repository root.
// Pointed at fixtures/ by scripts/check-conformance.sh, so this guard can be seen to
// fail. Unset in normal use, when it resolves to the repository root as before.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../../..');

const rulesDir = resolve(root, '.claude/rules');

describe('framework integrity', () => {
  it('references no file that does not exist', () => {
    // Any `path/like/this.ext` inside backticks, in the framework and its own documents.
    const scanned = [
      ...readdirSync(rulesDir).map((f) => resolve(rulesDir, f)),
      ...readdirSync(resolve(root, '.claude/framework')).map((f) =>
        resolve(root, '.claude/framework', f)
      ),
      ...readdirSync(resolve(root, '.claude/commands')).map((f) =>
        resolve(root, '.claude/commands', f)
      ),
      resolve(root, 'AGENTS.md'),
    ].filter((p) => p.endsWith('.md'));

    const dangling = [];
    for (const file of scanned) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/`((?:src|docs|scripts|\.claude|\.github)\/[^`\s]+?\.[a-z]{2,4})`/g)) {
        const ref = m[1];
        // Skip globs and placeholders — they are patterns, not paths.
        if (/[*<>]/.test(ref)) continue;
        // The framework names these files and ships neither. A project writes the picks by
        // running /refresh-model-tiers, and its worktree setup only when its worktrees need
        // more than the framework's install; until then each path is absent on purpose.
        // A project may not have its README settings or skeleton yet.
        if (
          ref === 'docs/model-picks.md' ||
          // A project creates it when it declares itself public; until then it is absent.
          ref === '.claude/project.json' ||
          ref === '.claude/worktree-setup.txt' ||
          ref === 'docs/readme/readme.yaml' ||
          ref === 'docs/readme/skeleton.md' ||
          // Written into a project by bootstrap or update, not present in this tree.
          ref === '.github/workflows/tropis-pipeline.yml' ||
          ref === '.github/workflows/tropis-framework-checks.yml' ||
          ref === '.github/workflows/tropis-candidate.yml' ||
          ref === '.github/workflows/pipeline.yml' ||
          ref === '.github/workflows/candidate.yml' ||
          ref === '.github/workflows/project-pipeline.yml'
        ) continue;
        if (!existsSync(resolve(root, ref))) dangling.push(`${basename(file)} → ${ref}`);
      }
    }
    expect(dangling).toEqual([]);
  });
});
