// Level: unit
/**
 * Every rule loads by its area, and every shipped rule's area is in the areas file.
 *
 * Claude Code loads a rule from .claude/rules/ when the agent first touches a file its
 * `paths:` header matches; a rule with no header loads in every session, whatever the
 * session is about (DECISIONS.md, "Rules load by area"). Copied into every set-up
 * project by set-up-project.sh, so a project's own checks fail on such a rule.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRule, areaProblems } from '../scripts/rule-areas.js';

const here = dirname(fileURLToPath(import.meta.url));
// In a set-up project this file is .tropis/guards/, two levels below the root.
// check-conformance.sh points it at a composed fixture instead.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');
const rulesDir = resolve(root, '.claude/rules');
const rules = readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
const shippedDir = resolve(root, '.tropis/rules');
const shipped = existsSync(shippedDir)
  ? readdirSync(shippedDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
  : [];
const text = (f) => readFileSync(resolve(rulesDir, f), 'utf8');

describe('rule areas', () => {
  it('gives every rule a paths header naming at least one path', () => {
    const missing = rules.filter((f) => {
      const { paths } = parseRule(text(f));
      return !paths || paths.length === 0;
    });
    expect(missing).toEqual([]);
  });

  it('names every shipped rule in the areas file, and only those, each with at least one glob', () => {
    const areas = JSON.parse(readFileSync(resolve(root, '.claude/rule-areas.json'), 'utf8'));
    expect(areaProblems(areas, shipped)).toEqual([]);
  });
});
