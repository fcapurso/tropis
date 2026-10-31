// Shared machinery: no part of this file is project-owned.
/**
 * Temporary clauses and the assertions that retire them.
 *
 * A temporary clause is a paragraph in a rule that exists only because the code is still
 * wrong. It carries, exactly, the marker
 *
 *   Temporary — until <id>. Asserted by rule-claims › <name>.
 *
 * where <id> is a catalog id and <name> a test name with no full stop. Its assertion,
 * in the project-owned block of .tropis/guards/rule-claims.test.js, is a call to
 * temporary() below whose function expects the defect to still be there. Once the fix
 * lands that function throws, and temporary() turns it into a message saying which
 * paragraph to delete.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Installed at .tropis/scripts/, two levels below the project root.
const defaultRoot = () => process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');

// Matched against text with every run of whitespace made one space, so a marker a rule
// wraps across lines is still found.
const MARKER = /Temporary — until ([a-z0-9]+(?:-[a-z0-9]+)*)\. Asserted by rule-claims › ([^.]+?)\./g;

const flat = (text) => text.replace(/\s+/g, ' ');

/**
 * Every temporary clause in .claude/rules/*.md, in file order. `file` is the one a
 * person edits: the rule's additions file when the clause is in it, otherwise the rule.
 * @param {string} root
 * @returns {{ file: string, id: string, name: string }[]}
 */
export function temporaryClauses(root) {
  const rulesDir = join(root, '.claude/rules');
  if (!existsSync(rulesDir)) return [];
  const clauses = [];
  for (const entry of readdirSync(rulesDir).filter((f) => f.endsWith('.md')).sort()) {
    const additions = join(root, '.claude/rule-additions', entry);
    const additionsText = existsSync(additions) ? flat(readFileSync(additions, 'utf8')) : '';
    for (const m of flat(readFileSync(join(rulesDir, entry), 'utf8')).matchAll(MARKER)) {
      const file = additionsText.includes(m[0]) ? `.claude/rule-additions/${entry}` : `.claude/rules/${entry}`;
      clauses.push({ file, id: m[1], name: m[2] });
    }
  }
  return clauses;
}

/**
 * The names of the temporary() calls in a test file's text.
 * @param {string} text
 * @returns {string[]}
 */
export function assertionNames(text) {
  return [...text.matchAll(/temporary\(\s*(['"`])(.+?)\1/g)].map((m) => m[2]);
}

/**
 * Registers a test, inside describe('rule-claims'), that passes while `fn` passes: `fn`
 * expects the defect a temporary clause waits on to still be there. When `fn` throws,
 * the defect is fixed, and the test fails saying which paragraph to delete.
 * `register` and `root` are for this module's own tests.
 * @param {string} name
 * @param {() => unknown} fn
 * @param {{ register?: Function, root?: string }} [options]
 */
export function temporary(name, fn, { register, root } = {}) {
  const check = async () => {
    try {
      await fn();
    } catch {
      throw new Error(fixedMessage(name, root ?? defaultRoot()));
    }
  };
  if (register) return register(name, check);
  describe('rule-claims', () => it(name, check));
}

function fixedMessage(name, root) {
  const clause = temporaryClauses(root).find((c) => c.name === name);
  if (!clause) {
    return `The defect "${name}" waits on is fixed, and no rule in .claude/rules/ carries `
      + `"Asserted by rule-claims › ${name}." Delete this assertion.`;
  }
  return `The defect "${name}" waits on is fixed. Delete the paragraph marked `
    + `"Temporary — until ${clause.id}" in ${clause.file}, then delete this assertion.`;
}
