// Level: unit
/**
 * Asserts the claims the rule files make about this codebase.
 *
 * Installed in every set-up project at .tropis/guards/. The assertions are the
 * project's to write, inside the project-owned block below: each one backs a claim the
 * project's own rules make about its own code. The block is kept across updates; the
 * rest of this file is replaced.
 *
 * Every other guard here checks wiring or freshness — that a rule is fired by a
 * hook, that a generated file matches its source. None checks whether a rule is
 * TRUE. Two rules in this repository were false when audited, and both were
 * followed for a while before anyone noticed.
 *
 * One test per claim, named for the rule it backs. When a rule changes, the
 * assertion changes with it — and when the code drifts, this goes red instead of
 * the rule quietly becoming a lie.
 *
 * A paragraph that exists only because the code is still wrong is a temporary clause:
 * it ends with the marker scripts/rule-claims.js describes, and its assertion in the
 * block is a call temporary(<name>, …) whose function expects the defect to still be
 * there. The shipped test below fails when a clause and its assertion are not paired.
 *
 * Claims that cannot be tested are listed in the block with the reason. That
 * list is deliberately visible: an untestable claim is a real gap, not an
 * exemption.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import YAML from 'yaml';
import { temporaryClauses, assertionNames, temporary } from '../scripts/rule-claims.js';

const here = dirname(fileURLToPath(import.meta.url));
// Installed at .tropis/guards/, two levels below the project root.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');

/** Every .js file under a directory, recursively, excluding tests. For the block. */
function sourceFiles(dir, acc = []) {
  const full = resolve(root, dir);
  if (!existsSync(full)) return acc;
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === '__fixtures__') continue;
    const p = join(full, entry.name);
    if (entry.isDirectory()) sourceFiles(join(dir, entry.name), acc);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) acc.push(p);
  }
  return acc;
}

const read = (p) => readFileSync(p, 'utf8');

describe('rule-claims', () => {
  // The assertions are read from the project's installed copy of this file, by root,
  // so a fixture tree can plant its own.
  it('temporary clauses are paired', () => {
    const clauses = temporaryClauses(root);
    const claimsFile = '.tropis/guards/rule-claims.test.js';
    const claimsPath = resolve(root, claimsFile);
    const names = existsSync(claimsPath) ? assertionNames(read(claimsPath)) : [];
    const catalogPath = resolve(root, 'feature-catalog.yaml');
    const catalog = existsSync(catalogPath) ? YAML.parse(read(catalogPath)) ?? [] : [];
    const ids = new Set(catalog.map((e) => e?.id));
    const problems = [];
    for (const c of clauses) {
      if (!ids.has(c.id)) {
        problems.push(`${c.file}: "Temporary — until ${c.id}" names an entry that is not in feature-catalog.yaml`);
      }
      if (!names.includes(c.name)) {
        problems.push(`${c.file}: the clause until ${c.id} names rule-claims › ${c.name}, and ${claimsFile} has no temporary() of that name`);
      }
    }
    for (const name of names) {
      const naming = clauses.filter((c) => c.name === name);
      if (naming.length === 0) {
        problems.push(`${claimsFile}: the temporary() named "${name}" has no clause in .claude/rules/ naming it`);
      } else if (naming.length > 1) {
        problems.push(`${naming.map((c) => c.file).join(', ')}: ${naming.length} clauses name rule-claims › ${name}; each needs its own assertion`);
      }
    }
    expect(problems).toEqual([]);
  });
});

// project-owned: begin
// Write the project's assertions here, one per claim, named for the rule it backs. A
// temporary clause's assertion is a call to temporary with the clause's name and a
// function that expects the defect to still be there.
//
// Claims in the rules that are NOT asserted here, and why. Keep this current —
// it is the honest record of what this guard does not cover.
//
// - <rule-file> "<claim>": <why it cannot be asserted structurally>
// project-owned: end
