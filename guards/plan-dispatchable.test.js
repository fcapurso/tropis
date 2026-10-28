/**
 * Fails when a plan that claims to be dispatchable would be refused at dispatch.
 *
 * A `## Repositories` heading is the signal that a plan is meant to be dispatched.
 * Once it exists the table is a claim, and this checks the claim.
 *
 * A plan usually edits one repository, and sometimes another as well — the framework's,
 * in a flush. The plan format requires a plan to say which checkouts it may edit and how
 * each is isolated. Nothing checked it, so the first sign that a plan
 * forgot was an executor changing files nobody meant it to touch, or stalling between an
 * instruction and a file list that contradict each other.
 *
 * The rules come from scripts/plan-binding.js — the same module the dispatch command
 * and the isolation helper read — so this guard and the command cannot disagree about a
 * plan. The setup installs that module in `.tropis/scripts/`.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSection, validateDispatchable, missingProjections } from '../scripts/plan-binding.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../../..');
const plansDir = resolve(root, 'docs/superpowers/plans');

describe('a plan that claims to be dispatchable is dispatchable', () => {
  const plans = existsSync(plansDir)
    ? readdirSync(plansDir).filter((f) => f.endsWith('.md'))
    : [];

  it('finds the plans directory', () => {
    expect(existsSync(plansDir)).toBe(true);
  });

  it.each(plans.length ? plans : ['(no plans yet)'])('%s', (file) => {
    if (file === '(no plans yet)') return;
    const markdown = readFileSync(join(plansDir, file), 'utf8');
    // No Repositories heading means the plan is not claiming to be dispatchable.
    if (extractSection(markdown, 'Repositories') == null) return;
    const result = validateDispatchable(markdown);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    // A plan still waiting to run must also list the projection of every rule file it
    // lists, in a project that projects them. Once its handover is written the table
    // is history, and this stops applying.
    if (existsSync(resolve(root, '.cursor/rules')) && extractSection(markdown, 'Handover report') == null) {
      const shipped = [resolve(root, '.tropis/rules'), resolve(root, 'rules')]
        .filter((d) => existsSync(d))
        .flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')));
      const unpaired = missingProjections(markdown, shipped).map(({ source, projection }) => `${source} → ${projection}`);
      expect(unpaired).toEqual([]);
    }
  });
});

describe('what a plan must list beside a rule source', () => {
  const table = (...paths) => `## File Structure\n\n| File | Change |\n|---|---|\n${paths.map((p) => `| \`${p}\` | x |`).join('\n')}\n`;
  const missing = (md, shipped) => missingProjections(md, shipped).map((m) => m.projection);

  it("asks for a project's own rule's Cursor file", () => {
    expect(missing(table('.claude/rules/app.md'))).toEqual(['.cursor/rules/app.mdc']);
    expect(missing(table('.claude/rules/app.md', '.cursor/rules/app.mdc'))).toEqual([]);
  });

  it("asks for both generated files of a shipped rule when its additions file is listed", () => {
    const both = ['.claude/rules/tests.md', '.cursor/rules/tests.mdc'];
    expect(missing(table('.claude/rule-additions/tests.md'))).toEqual(both);
    expect(missing(table('.claude/rule-additions/tests.md', ...both))).toEqual([]);
  });

  it('asks for both generated files of a shipped text in .tropis/rules/', () => {
    const both = ['.claude/rules/tests.md', '.cursor/rules/tests.mdc'];
    expect(missing(table('.tropis/rules/tests.md'))).toEqual(both);
    expect(missing(table('.tropis/rules/tests.md', ...both))).toEqual([]);
  });

  it('asks nothing for a file under a top-level rules/ folder, which nothing generates from', () => {
    expect(missing(table('rules/tests.md'))).toEqual([]);
  });

  it("asks for every shipped rule's two files when the areas file is listed", () => {
    expect(missing(table('.claude/rule-areas.json'), ['catalogs', 'tests'])).toEqual([
      '.claude/rules/catalogs.md', '.cursor/rules/catalogs.mdc',
      '.claude/rules/tests.md', '.cursor/rules/tests.mdc',
    ]);
  });
});

describe("the planning rule's example Repositories table", () => {
  it('is accepted by the dispatch script', () => {
    const rule = readFileSync(resolve(here, '../rules/planning.md'), 'utf8');
    const lines = rule.split('\n');
    const start = lines.findIndex((l) => /^\|\s*Checkout\s*\|\s*Role\s*\|\s*Isolation\s*\|/.test(l));
    expect(start).toBeGreaterThan(-1);
    const table = [];
    for (let i = start; i < lines.length && lines[i].trim().startsWith('|'); i++) table.push(lines[i]);
    const plan = [
      '## Delivers', 'None.',
      '## Repositories', table.join('\n'),
      '## Global Constraints', 'None.',
      '## Traps', 'None.',
    ].join('\n\n');
    expect(validateDispatchable(plan).errors).toEqual([]);
  });
});
