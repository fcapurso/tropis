// Level: unit
/**
 * Keeps the framework's prose to the backlog's words: epic, backlog item, effort points.
 * Scans the commands, framework documents, rules (not incident records), template
 * documents, the two root pages and the comments of the two backlog templates, after
 * removing every backtick span so file names, fields and identifiers are never matched.
 *
 * Skips when the tree under test is not the framework repository.
 */
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

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

const REFUSED = [
  /\barcs?\b/i,
  /\bstory points?\b/i,
  // Not part of a name such as feature-catalog.yaml; a sentence-ending full stop is fine.
  /(?<![-./_\w])catalogs?(?![-/_\w]|\.\w)/i,
];

/** Markdown files directly in `rel`, or below it when `deep`, skipping `skip` paths. */
function markdownIn(dir, rel, { deep = false, skip = [] } = {}) {
  const out = [];
  const full = join(dir, rel);
  if (!existsSync(full)) return out;
  for (const e of readdirSync(full, { withFileTypes: true })) {
    const path = `${rel}/${e.name}`;
    if (skip.includes(path)) continue;
    if (e.isDirectory()) {
      if (deep) out.push(...markdownIn(dir, path, { deep, skip }));
    } else if (e.name.endsWith('.md')) out.push(path);
  }
  return out;
}

/** Every refused word in the scanned files of `dir`, one message per match. */
function scan(dir) {
  const files = [
    ...markdownIn(dir, 'commands'),
    ...markdownIn(dir, 'framework', { skip: ['framework/DECISIONS.md'] }),
    ...markdownIn(dir, 'rules', { deep: true, skip: ['rules/incidents'] }),
    ...markdownIn(dir, 'templates'),
    ...['bootstrap.md', 'CONTRIBUTING.md'].filter((f) => existsSync(join(dir, f))),
  ].map((path) => ({ path, commentsOnly: false }));
  for (const path of ['templates/catalog.yaml', 'templates/backlog-bands.yaml']) {
    if (existsSync(join(dir, path))) files.push({ path, commentsOnly: true });
  }
  const found = [];
  for (const { path, commentsOnly } of files) {
    readFileSync(join(dir, path), 'utf8').split('\n').forEach((line, i) => {
      if (commentsOnly && !/^\s*#/.test(line)) return;
      const text = line.replace(/`[^`]*`/g, '');
      for (const re of REFUSED) {
        const m = re.exec(text);
        if (m) {
          found.push(`${path}:${i + 1}: "${m[0]}" — say epic, backlog or effort points (Decision 1 of the backlog-words plan)`);
        }
      }
    });
  }
  return found;
}

describe('the backlog words', () => {
  describe('on a small tree', () => {
    let dir;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'backlog-words-'));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));
    const put = (path, text) => {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), `${text}\n`);
    };

    it('refuses "arc" in a command', () => {
      put('commands/x.md', 'Pick an arc.');
      expect(scan(dir)).toHaveLength(1);
    });
    it('refuses "story points" in a framework document', () => {
      put('framework/x.md', '20 story points');
      expect(scan(dir)).toHaveLength(1);
    });
    it('refuses "catalog" in a rule', () => {
      put('rules/x.md', 'Add it to the catalog.');
      expect(scan(dir)).toHaveLength(1);
    });
    it('passes file names and fields in backticks', () => {
      put('rules/x.md', 'Edit `feature-catalog.yaml` and `rules/catalogs.md`.');
      expect(scan(dir)).toEqual([]);
    });
    it('does not scan incident records', () => {
      put('rules/incidents/x.md', 'an arc');
      expect(scan(dir)).toEqual([]);
    });
    it('does not scan the decision record', () => {
      put('framework/DECISIONS.md', 'an arc');
      expect(scan(dir)).toEqual([]);
    });
    it('reads only the comments of the backlog templates', () => {
      put('templates/catalog.yaml', 'arc: x');
      expect(scan(dir)).toEqual([]);
    });
    it('refuses an old word in a template comment', () => {
      put('templates/catalog.yaml', '  # an arc');
      expect(scan(dir)).toHaveLength(1);
    });
  });

  if (!isBlueprintTree(root)) {
    it('skips outside the framework repository', () => {
      // The self-check sets this where it runs the guard on the framework repository.
      expect(process.env.TROPIS_EXPECT_FRAMEWORK ?? '').toBe('');
    });
    return;
  }

  it('finds no old word in the framework repository', () => {
    expect(scan(root)).toEqual([]);
  });
});
