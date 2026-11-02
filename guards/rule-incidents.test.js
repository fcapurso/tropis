// Level: integration
/**
 * Holds the shipped rules and their incident records together. A rule in rules/<name>.md
 * carries its mechanism; the occasion it was learned on lives in rules/incidents/<name>.md,
 * named from the rule by a pointer `.tropis/rules/incidents/<name>.md#<slug>`. Fails on a
 * pointer that leads nowhere, a record section nothing points at, a record with no rule,
 * a kept-inline clause the index quotes and the rule no longer has, and a record that
 * reaches a session through the files agent tools load.
 *
 * Skips when the tree under test is not the framework repository.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '..');

function isBlueprintTree(dir) {
  return (
    existsSync(join(dir, 'bootstrap.md')) &&
    existsSync(join(dir, 'framework/workflow.md')) &&
    existsSync(join(dir, 'commands')) &&
    existsSync(join(dir, 'README.md'))
  );
}

const INDEX = 'README.md';
const POINTER = /`\.tropis\/rules\/incidents\/([^`]*)`/g;

/** A heading's anchor: lowercased, only a-z, 0-9, space and hyphen kept, spaces to hyphens. */
function slug(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
}

const collapse = (text) => text.replace(/\s+/g, ' ');
const mdFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []);

/** The `## ` sections of a markdown text outside code fences, as { heading, body }. */
function sections(text) {
  const found = [];
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const m = !fenced && /^## (.+?)\s*$/.exec(line);
    if (m) found.push({ heading: m[1], body: [] });
    else if (found.length) found[found.length - 1].body.push(line);
  }
  return found;
}

/** Pointers in a rule text, as the span after `.tropis/rules/incidents/`. Placeholders (<…>) are not pointers. */
function pointers(text) {
  return [...text.matchAll(POINTER)].map((m) => m[1]).filter((p) => !/[<>]/.test(p));
}

/** Checks 1 to 4: pointers, record sections, records and the kept-inline index. */
function problems(dir) {
  const rulesDir = join(dir, 'rules');
  const recordsDir = join(rulesDir, 'incidents');
  const found = [];
  const rules = mdFiles(rulesDir);
  const records = mdFiles(recordsDir).filter((f) => f !== INDEX);
  const pointed = new Map();

  for (const rule of rules) {
    const text = readFileSync(join(rulesDir, rule), 'utf8');
    for (const p of pointers(text)) {
      const m = /^([^#]+)#(.+)$/.exec(p);
      if (!m) {
        found.push(`rules/${rule}: pointer .tropis/rules/incidents/${p} has no #<slug>; point at a section heading`);
        continue;
      }
      const [, file, anchor] = m;
      if (file !== rule) {
        found.push(`rules/${rule}: pointer ${p} names incidents/${file}; a rule points only into incidents/${rule}`);
        continue;
      }
      const recordPath = join(recordsDir, file);
      if (!existsSync(recordPath)) {
        found.push(`rules/${rule}: pointer ${p} leads nowhere: rules/incidents/${file} does not exist; add the record or remove the pointer`);
        continue;
      }
      const slugs = sections(readFileSync(recordPath, 'utf8')).map((s) => slug(s.heading));
      if (!slugs.includes(anchor)) {
        found.push(`rules/${rule}: pointer ${p} leads nowhere: rules/incidents/${file} has no ## heading with slug ${anchor}; add the section or fix the pointer`);
        continue;
      }
      if (!pointed.has(file)) pointed.set(file, new Set());
      pointed.get(file).add(anchor);
    }
  }

  for (const record of records) {
    if (!rules.includes(record)) {
      found.push(`rules/incidents/${record} has no rule rules/${record}; move its sections to the record of the rule they belong to, or remove it`);
      continue;
    }
    for (const { heading } of sections(readFileSync(join(recordsDir, record), 'utf8'))) {
      if (!pointed.get(record)?.has(slug(heading))) {
        found.push(`rules/incidents/${record}: section "## ${heading}" is named by no pointer in rules/${record}; point at it as \`.tropis/rules/incidents/${record}#${slug(heading)}\`, or remove it`);
      }
    }
  }

  const indexPath = join(recordsDir, INDEX);
  if (!existsSync(indexPath)) {
    found.push('rules/incidents/README.md is missing; it is the index of the records and of the clauses kept inline');
    return found;
  }
  const kept = sections(readFileSync(indexPath, 'utf8')).find((s) => s.heading === 'Kept inline');
  if (!kept) {
    found.push('rules/incidents/README.md has no "## Kept inline" section; add it, empty if nothing is kept inline');
    return found;
  }
  for (const line of kept.body.filter((l) => /^- /.test(l))) {
    const file = /`rules\/([^`/]+\.md)`/.exec(line)?.[1];
    const phrase = /"([^"]+)"/.exec(line)?.[1];
    if (!file || !phrase) {
      found.push(`rules/incidents/README.md: Kept inline bullet names no \`rules/<name>.md\` or no "quoted phrase": ${line}`);
      continue;
    }
    if (!rules.includes(file)) {
      found.push(`rules/incidents/README.md: Kept inline names rules/${file}, which does not exist; fix or remove the bullet`);
      continue;
    }
    if (phrase.trim().split(/\s+/).length < 6) {
      found.push(`rules/incidents/README.md: Kept inline phrase "${phrase}" is under six words; quote enough to find the clause`);
    }
    const text = collapse(readFileSync(join(rulesDir, file), 'utf8'));
    if (!text.includes(collapse(phrase))) {
      found.push(`rules/incidents/README.md: Kept inline quotes "${phrase}", which rules/${file} no longer has; update the quote, or move the clause's incident to its record`);
    }
  }
  return found;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? [p, ...walk(p)] : [p];
  });
}

/** Check 5: in a project the setup builds, the records ship and no file an agent tool loads carries them. */
function deliveryProblems(dir) {
  const parent = mkdtempSync(join(tmpdir(), 'rule-incidents-'));
  const project = join(parent, 'example-project');
  mkdirSync(project);
  try {
    const init = spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: project, encoding: 'utf8' });
    if (init.status !== 0) return [`git init failed: ${init.stderr}`];
    const setup = spawnSync('bash', [join(dir, 'scripts/set-up-project.sh'), project], { encoding: 'utf8' });
    if (setup.status !== 0) return [`scripts/set-up-project.sh failed: ${setup.stderr}`];

    const found = [];
    const recordsDir = join(dir, 'rules/incidents');
    const records = mdFiles(recordsDir);
    for (const f of records) {
      if (!existsSync(join(project, '.tropis/rules/incidents', f))) {
        found.push(`rules/incidents/${f} is not installed at .tropis/rules/incidents/${f}; scripts/set-up-project.sh must copy it there`);
      }
    }
    const delivered = [join(project, '.claude/rules'), join(project, '.cursor/rules')].flatMap(walk);
    const bodyLines = records
      .filter((f) => f !== INDEX)
      .flatMap((f) => sections(readFileSync(join(recordsDir, f), 'utf8')).flatMap((s) => s.body.map((l) => [f, l.trim()])))
      .filter(([, l]) => l.length > 40);
    for (const path of delivered) {
      const rel = path.slice(project.length + 1);
      if (/incidents/i.test(rel)) {
        found.push(`${rel} is delivered to sessions and is named for incidents; records go only in .tropis/rules/incidents/`);
        continue;
      }
      if (statSync(path).isDirectory()) continue;
      const text = readFileSync(path, 'utf8');
      if (/^# Incidents behind /m.test(text)) found.push(`${rel} is delivered to sessions and is an incident record`);
      for (const [f, line] of bodyLines) {
        if (text.includes(line)) found.push(`${rel} is delivered to sessions and carries a line of rules/incidents/${f}: "${line}"; keep the story only in the record`);
      }
    }
    return found;
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

describe('rule incident records', () => {
  if (!isBlueprintTree(root)) {
    it('skips outside the framework repository', () => {
      // The self-check sets this where it runs the guard on the framework repository.
      expect(process.env.TROPIS_EXPECT_FRAMEWORK ?? '').toBe('');
    });
    return;
  }

  it('every pointer leads to a section, every section is pointed at, and every kept-inline quote is in its rule', () => {
    expect(problems(root)).toEqual([]);
  });

  it('ships the records under .tropis/rules/incidents/ and delivers none of them to a session', () => {
    expect(deliveryProblems(root)).toEqual([]);
  }, 60000);

  describe('on a small tree', () => {
    let dir;
    const put = (path, text) => {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    };
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'rule-incidents-tree-'));
      put('rules/incidents/README.md', '# Rule incidents\n\n## Kept inline\n\n## What the split bought\n');
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('slugs a heading as the pointer names it', () => {
      expect(slug('A plan that forbade its own regeneration')).toBe('a-plan-that-forbade-its-own-regeneration');
      expect(slug('Ten days red, 2026-08')).toBe('ten-days-red-2026-08');
    });

    it('passes a rule whose pointer names a section of its own record', () => {
      put('rules/tests.md', 'Fix the clock. (Incident: `.tropis/rules/incidents/tests.md#a-red-night`)\n');
      put('rules/incidents/tests.md', '# Incidents behind rules/tests.md\n\n## A red night\n\nIt went red.\n');
      expect(problems(dir)).toEqual([]);
    });

    it('reports a pointer into a missing record, a missing heading, and another rule\'s record', () => {
      put('rules/tests.md', 'A `.tropis/rules/incidents/tests.md#gone`.\nB `.tropis/rules/incidents/other.md#x`.\n');
      put('rules/catalogs.md', 'C `.tropis/rules/incidents/catalogs.md#none`.\n');
      put('rules/incidents/tests.md', '# Incidents behind rules/tests.md\n');
      const found = problems(dir);
      expect(found).toHaveLength(3);
      expect(found.some((p) => p.includes('no ## heading with slug gone'))).toBe(true);
      expect(found.some((p) => p.includes('names incidents/other.md'))).toBe(true);
      expect(found.some((p) => p.includes('rules/incidents/catalogs.md does not exist'))).toBe(true);
    });

    it('reports a section no pointer names and a record with no rule', () => {
      put('rules/tests.md', 'No pointer.\n');
      put('rules/incidents/tests.md', '# Incidents behind rules/tests.md\n\n## Orphan\n\nText.\n');
      put('rules/incidents/gone.md', '# Incidents behind rules/gone.md\n');
      const found = problems(dir);
      expect(found).toHaveLength(2);
      expect(found.some((p) => p.includes('"## Orphan" is named by no pointer'))).toBe(true);
      expect(found.some((p) => p.includes('rules/incidents/gone.md has no rule'))).toBe(true);
    });

    it('checks each kept-inline quote against its rule, whitespace collapsed', () => {
      put('rules/tests.md', 'never pin it in the code\nonly to make a test pass\n');
      put(
        'rules/incidents/README.md',
        '# Rule incidents\n\n## Kept inline\n\n' +
          '- `rules/tests.md`: "never pin it in the code only to make a test pass" — why.\n' +
          '- `rules/tests.md`: "a phrase the rule does not have at all" — why.\n' +
          '- `rules/nope.md`: "never pin it in the code only" — why.\n',
      );
      const found = problems(dir);
      expect(found).toHaveLength(2);
      expect(found.some((p) => p.includes('which rules/tests.md no longer has'))).toBe(true);
      expect(found.some((p) => p.includes('rules/nope.md, which does not exist'))).toBe(true);
    });

    it('reports a missing index', () => {
      rmSync(join(dir, 'rules/incidents/README.md'));
      expect(problems(dir)).toEqual([
        'rules/incidents/README.md is missing; it is the index of the records and of the clauses kept inline',
      ]);
    });
  });
});
