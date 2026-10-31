// Level: unit
/**
 * Every backlog entry carries the fields the catalog template marks required, and the
 * /idea command names each of them. And the catalog keeps the invariants the catalog
 * rule states: ids are unique; blockedBy, after and supersededBy name entries in this
 * catalog and form no cycle; a shipped entry records no blocker and is not superseded;
 * shelved is true or absent, and only on an idea or shaped entry; a spike has no
 * modules; and a shipped entry's modules exist.
 *
 * Unlike most guards, this one is copied into every set-up project: it checks the
 * project's catalog and command, not the blueprint's tree. Without it an incomplete entry
 * is accepted silently, and the backlog report prints "undefined" where its title and
 * type belong.
 */
import { existsSync, readFileSync } from 'node:fs';
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

const readCatalog = () => YAML.parse(readFileSync(resolve(root, 'feature-catalog.yaml'), 'utf8')) ?? [];

/** A field that may be a string or a list, as a list. */
const ids = (value) => (value == null ? [] : [].concat(value));

const ORDER_FIELDS = ['blockedBy', 'after', 'supersededBy'];

describe('catalog entries', () => {
  it('gives every entry every required field', () => {
    const catalog = readCatalog();
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

// Each test collects one line per breach, naming the entry and what it breaks.
describe('catalog invariants', () => {
  const catalog = readCatalog().filter((e) => e && typeof e === 'object');
  const byId = new Map(catalog.map((e) => [e.id, e]));

  it('gives no two entries the same id', () => {
    const seen = new Set();
    const bad = [];
    for (const e of catalog) {
      if (seen.has(e.id)) bad.push(`${e.id}: two entries have this id`);
      seen.add(e.id);
    }
    expect(bad).toEqual([]);
  });

  it('names only entries in this catalog in blockedBy, after and supersededBy', () => {
    const bad = [];
    for (const e of catalog) {
      for (const field of ORDER_FIELDS) {
        for (const other of ids(e[field])) {
          if (!byId.has(other)) bad.push(`${e.id}: ${field} names ${other}, which is not in the catalog`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('has no cycle through blockedBy and after', () => {
    const next = (e) => [...ids(e.blockedBy), ...ids(e.after)].filter((o) => byId.has(o));
    const bad = [];
    const done = new Set();
    const visit = (id, path) => {
      if (path.includes(id)) {
        const cycle = [...path.slice(path.indexOf(id)), id];
        bad.push(`${id}: in a cycle through blockedBy/after: ${cycle.join(' → ')}`);
        return;
      }
      if (done.has(id)) return;
      for (const o of next(byId.get(id))) visit(o, [...path, id]);
      done.add(id);
    };
    for (const e of catalog) visit(e.id, []);
    expect(bad).toEqual([]);
  });

  it('records no blocker on a shipped entry', () => {
    const bad = catalog
      .filter((e) => e.status === 'shipped' && e.blockedBy != null)
      .map((e) => `${e.id}: shipped, but still records blockedBy`);
    expect(bad).toEqual([]);
  });

  it('ships no superseded entry', () => {
    const bad = catalog
      .filter((e) => e.status === 'shipped' && ids(e.supersededBy).length > 0)
      .map((e) => `${e.id}: superseded, so it cannot be shipped`);
    expect(bad).toEqual([]);
  });

  it('writes shelved only as true', () => {
    const bad = catalog
      .filter((e) => 'shelved' in e && e.shelved !== true)
      .map((e) => `${e.id}: shelved must be true or absent`);
    expect(bad).toEqual([]);
  });

  it('shelves only an idea or a shaped entry', () => {
    const bad = catalog
      .filter((e) => e.shelved === true && !['idea', 'shaped'].includes(e.status))
      .map((e) => `${e.id}: shelved on a ${e.status} entry`);
    expect(bad).toEqual([]);
  });

  it('gives a spike no modules', () => {
    const bad = catalog
      .filter((e) => e.type === 'spike' && ids(e.modules).length > 0)
      .map((e) => `${e.id}: a spike has no modules`);
    expect(bad).toEqual([]);
  });

  it("finds every shipped entry's modules", () => {
    const bad = [];
    for (const e of catalog.filter((x) => x.status === 'shipped')) {
      for (const path of ids(e.modules)) {
        if (!existsSync(resolve(root, path))) bad.push(`${e.id}: module ${path} does not exist`);
      }
    }
    expect(bad).toEqual([]);
  });
});
