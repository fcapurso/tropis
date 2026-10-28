// Level: unit
/**
 * Asserts the claims the rule files make about this codebase.
 *
 * TEMPLATE. The assertions here are yours to write: each one backs a claim your
 * own rules make about your own code. Shipping someone else's claims would assert
 * things about a codebase that does not exist yet.
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
 * Claims that cannot be tested are listed at the bottom with the reason. That
 * list is deliberately visible: an untestable claim is a real gap, not an
 * exemption.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

/** Every .js file under a directory, recursively, excluding tests. */
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

/**
 * Claims in the rules that are NOT asserted here, and why. Keep this current —
 * it is the honest record of what this guard does not cover.
 *
 * - <rule-file> "<claim>": <why it cannot be asserted structurally>
 */
