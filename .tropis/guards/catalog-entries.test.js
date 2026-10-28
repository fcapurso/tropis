// Level: unit
/**
 * Every backlog entry carries the fields the catalog template marks required, and the
 * /idea command names each of them.
 *
 * Unlike most guards, this one is copied into every set-up project: it checks the
 * project's catalog and command, not the blueprint's tree. Without it an incomplete entry
 * is accepted silently, and the backlog report prints "undefined" where its title and
 * type belong.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
// In a set-up project this file is .tropis/guards/, two levels below the root.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');

// The REQUIRED block at the top of templates/catalog.yaml, as a list. Change both together.
const REQUIRED = [
  'id',
  'title',
  'status',
  'type',
  'layer',
  'value',
  'acceptanceCriteria',
  'modules',
  'refs',
];

describe('catalog entries', () => {
  it('gives every entry every required field', () => {
    const catalog = YAML.parse(readFileSync(resolve(root, 'feature-catalog.yaml'), 'utf8')) ?? [];
    const missing = [];
    catalog.forEach((entry, i) => {
      for (const field of REQUIRED) {
        if (entry?.[field] == null) missing.push(`${entry?.id ?? `entry ${i + 1}`} → ${field}`);
      }
    });
    expect(missing).toEqual([]);
  });

  it('names every required field in the /idea command', () => {
    const idea = readFileSync(resolve(root, '.claude/commands/idea.md'), 'utf8');
    const unnamed = REQUIRED.filter((field) => !new RegExp(`\`${field}[\`:]`).test(idea));
    expect(unnamed).toEqual([]);
  });
});
