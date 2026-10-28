// Level: unit
/**
 * Grouping, overlap, rewrap and the absorb-flush subcommands. The script is this
 * repository's own and is not shipped.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseHunks, overlappingPairs, homeFile, proposeGroups, catalogTail, arrivedSince,
  touchedLines, rewrapTouched, absorbedMessage, landedFrom,
} from '../.github/scripts/absorb-flush.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '../.github/scripts/absorb-flush.mjs');

const planningDiff = [
  'diff --git a/rules/planning.md b/rules/planning.md',
  'index 1111111..2222222 100644',
  '--- a/rules/planning.md',
  '+++ b/rules/planning.md',
  '@@ -5,2 +5,3 @@',
  '-old',
  '+new',
  '+extra',
  '@@ -9 +10 @@',
  '-one',
  '+two',
  '@@ -20,0 +22,4 @@',
  '+a',
  '+b',
  '+c',
  '+d',
  'diff --git a/framework/workflow.md b/framework/workflow.md',
  'index 3333333..4444444 100644',
  '--- a/framework/workflow.md',
  '+++ b/framework/workflow.md',
  '@@ -1 +1 @@',
  '-x',
  '+y',
].join('\n');

describe('parseHunks', () => {
  it('reads old-side ranges, treating an omitted count as 1 and a zero count as an insertion', () => {
    const ranges = parseHunks(planningDiff);
    expect(ranges.filter((r) => r.path === 'rules/planning.md')).toEqual([
      { path: 'rules/planning.md', start: 5, end: 6 },
      { path: 'rules/planning.md', start: 9, end: 9 },
      { path: 'rules/planning.md', start: 20, end: 20 },
    ]);
    expect(ranges.filter((r) => r.path === 'framework/workflow.md')).toEqual([
      { path: 'framework/workflow.md', start: 1, end: 1 },
    ]);
  });
});

describe('overlappingPairs', () => {
  const planning = (pr, start, end) => ({ path: 'rules/planning.md', start, end });

  it('flags two insertions after the same line', () => {
    const ranges = new Map([
      [55, [planning(55, 40, 40)]],
      [56, [planning(56, 40, 40)]],
    ]);
    expect(overlappingPairs(ranges, new Set())).toEqual([
      [55, 56, 'rules/planning.md'],
    ]);
  });

  it('does not flag ranges 10 lines apart, and does flag ranges 3 apart', () => {
    const apart = new Map([
      [1, [planning(1, 1, 1)]],
      [2, [planning(2, 11, 11)]],
    ]);
    expect(overlappingPairs(apart, new Set())).toEqual([]);

    const close = new Map([
      [1, [planning(1, 1, 1)]],
      [2, [planning(2, 4, 4)]],
    ]);
    expect(overlappingPairs(close, new Set())).toEqual([
      [1, 2, 'rules/planning.md'],
    ]);
  });

  it('skips the catalog when both pull requests only append, and still flags another file', () => {
    const ranges = new Map([
      [1, [
        { path: 'feature-catalog.yaml', start: 100, end: 100 },
        planning(1, 10, 12),
      ]],
      [2, [
        { path: 'feature-catalog.yaml', start: 100, end: 100 },
        planning(2, 10, 12),
      ]],
    ]);
    expect(overlappingPairs(ranges, new Set([1, 2]))).toEqual([
      [1, 2, 'rules/planning.md'],
    ]);
  });
});

function pr(number, files) {
  return {
    number,
    url: `https://github.com/example/tropis/pull/${number}`,
    headRefName: `upstream/demo/${number}`,
    title: `change ${number}`,
    files,
  };
}

describe('homeFile', () => {
  it('picks the file with the most additions and deletions', () => {
    expect(homeFile(pr(1, [
      { path: 'rules/small.md', additions: 1, deletions: 0 },
      { path: 'rules/big.md', additions: 10, deletions: 4 },
    ]))).toBe('rules/big.md');
  });

  it('ignores the catalog and the bands file', () => {
    expect(homeFile(pr(1, [
      { path: 'feature-catalog.yaml', additions: 100, deletions: 0 },
      { path: 'docs/backlog-board/bands.yaml', additions: 40, deletions: 10 },
      { path: 'rules/tests.md', additions: 2, deletions: 1 },
    ]))).toBe('rules/tests.md');
  });

  it('breaks a tie toward the alphabetically first path', () => {
    expect(homeFile(pr(1, [
      { path: 'rules/b.md', additions: 3, deletions: 2 },
      { path: 'rules/a.md', additions: 5, deletions: 0 },
    ]))).toBe('rules/a.md');
  });

  it('uses the catalog when a pull request changes only the catalog and the bands file', () => {
    expect(homeFile(pr(1, [
      { path: 'docs/backlog-board/bands.yaml', additions: 9, deletions: 0 },
      { path: 'feature-catalog.yaml', additions: 3, deletions: 0 },
    ]))).toBe('feature-catalog.yaml');
  });
});

describe('proposeGroups', () => {
  it('keeps a multi-file pull request with its home and lists the other groups it spans', () => {
    const groups = proposeGroups([
      pr(70, [
        { path: 'rules/planning.md', additions: 40, deletions: 5 },
        { path: 'framework/workflow.md', additions: 10, deletions: 2 },
        { path: 'templates/README.md', additions: 8, deletions: 0 },
        { path: 'feature-catalog.yaml', additions: 20, deletions: 0 },
      ]),
      pr(66, [
        { path: 'framework/workflow.md', additions: 15, deletions: 1 },
      ]),
    ]);
    expect(groups).toEqual([
      { home: 'framework/workflow.md', prs: [66], spans: [] },
      {
        home: 'rules/planning.md',
        prs: [70],
        spans: [{ pr: 70, also: ['framework/workflow.md'] }],
      },
    ]);
  });
});

describe('catalogTail', () => {
  it('returns the bytes after an exact prefix, and null when the head edits or matches', () => {
    expect(catalogTail('abc\n', 'abc\nxyz\n')).toBe('xyz\n');
    expect(catalogTail('abc\ndef\n', 'abc\nXXX\n')).toBeNull();
    expect(catalogTail('abc\n', 'abc\n')).toBeNull();
  });
});

describe('arrivedSince', () => {
  it('names numbers that arrived and numbers that are gone', () => {
    expect(arrivedSince([49, 50], [50, 86])).toEqual({ arrived: [86], gone: [49] });
  });
});

describe('touchedLines', () => {
  it('counts copies, so one extra occurrence of a repeated line is the touched one', () => {
    const before = 'same\nsame\nother\n';
    const after = 'same\nsame\nsame\nother\n';
    expect(touchedLines(before, after)).toEqual(new Set([2]));
  });
});

const BULLET = `- ${'omega '.repeat(24).trimEnd()} xxxx`;
const BULLET_WRAPPED = [
  '- omega omega omega omega omega omega omega omega omega omega omega omega omega omega',
  '  omega omega omega omega omega omega omega omega omega omega xxxx',
].join('\n');
const STEP_WORDS = BULLET.slice(2);
const STEP_ONE = [
  '1. omega omega omega omega omega omega omega omega omega omega omega omega omega omega',
  '   omega omega omega omega omega omega omega omega omega omega xxxx',
].join('\n');
const STEP_TWO = STEP_ONE.replace('1. ', '2. ');
const WRAPPED_PARAGRAPH = [
  'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november',
  'oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu alpha bravo',
  'charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa',
  'quebec romeo sierra tango uniform victor whiskey xray yankee zulu alpha bravo charlie',
  'delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec',
  'romeo sierra tango uniform victor whiskey xray yankee zulu',
].join('\n');

describe('rewrapTouched', () => {
  it('leaves front matter unchanged', () => {
    const before = '---\ntitle: short\n---\n\nHello.\n';
    const after = `---\ntitle: ${'m'.repeat(100)}\n---\n\nHello.\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('leaves fenced code unchanged', () => {
    const before = 'See.\n\n```\ncode\n```\n';
    const after = `See.\n\n\`\`\`\n${'m'.repeat(100)}\n\`\`\`\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('leaves an indented fence inside a numbered step unchanged', () => {
    const before = '1. Run:\n\n   ```bash\n   short\n   ```\n';
    const after = `1. Run:\n\n   \`\`\`bash\n   ${'m '.repeat(50)}\n   \`\`\`\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('leaves a table row unchanged', () => {
    const before = 'Intro.\n\n| a | b |\n';
    const after = `Intro.\n\n| ${'m'.repeat(100)} | b |\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('leaves a → line unchanged', () => {
    const before = '→ short\n';
    const after = `→ ${'m'.repeat(100)}\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('leaves a heading unchanged', () => {
    const before = '# Short\n';
    const after = `# ${'m'.repeat(100)}\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('leaves an HTML comment unchanged', () => {
    const before = '<!-- short -->\n';
    const after = `<!-- ${'m'.repeat(100)} -->\n`;
    expect(rewrapTouched(before, after)).toBe(after);
  });

  it('wraps two numbered steps as two items', () => {
    const before = '1. one\n2. two\n';
    const after = `1. ${STEP_WORDS}\n2. ${STEP_WORDS}\n`;
    expect(rewrapTouched(before, after)).toBe(`${STEP_ONE}\n${STEP_TWO}\n`);
  });

  it('keeps a bold-only line on its own line', () => {
    const before = '**Keep this.**\nshort\n';
    const after = `**Keep this.**\n${STEP_WORDS}\n`;
    const result = rewrapTouched(before, after);
    expect(result.startsWith('**Keep this.**\n')).toBe(true);
    expect(result).not.toBe(after);
    const lines = result.replace(/\n$/, '').split('\n');
    expect(lines[0]).toBe('**Keep this.**');
    expect(lines.slice(1).join('\n')).not.toMatch(/\*\*/);
    expect(lines.slice(1).every((line) => line.length <= 88)).toBe(true);
  });

  it('leaves an untouched paragraph alone when another paragraph is touched', () => {
    const wide = 'z'.repeat(100);
    const before = `Short paragraph.\n\n${wide}\n`;
    const after = `${BULLET.slice(2)}\n\n${wide}\n`;
    const result = rewrapTouched(before, after);
    expect(result.endsWith(`\n\n${wide}\n`)).toBe(true);
    expect(result).not.toContain(BULLET.slice(2));
  });

  it('wraps a touched dash item of 150 characters', () => {
    expect(BULLET).toHaveLength(150);
    const before = 'rules\n';
    const result = rewrapTouched(before, `${BULLET}\n`);
    expect(result).toBe(`${BULLET_WRAPPED}\n`);
    expect(result.split('\n').filter(Boolean).every((line) => line.length <= 88)).toBe(true);
    expect(result.split('\n')[1].startsWith('  ')).toBe(true);
  });

  it('leaves a touched paragraph that is already wrapped, and stays stable', () => {
    const before = 'Earlier.\n';
    const after = `${WRAPPED_PARAGRAPH}\n`;
    expect(WRAPPED_PARAGRAPH.split('\n').every((line) => line.length <= 88)).toBe(true);
    const once = rewrapTouched(before, after);
    expect(once).toBe(after);
    expect(rewrapTouched(before, once)).toBe(once);
  });
});

describe('absorbedMessage', () => {
  it('appends the absorbed line and trims trailing whitespace', () => {
    const original = 'Fix the rule.\n\nThe paragraph.  \n\n';
    expect(absorbedMessage(original, 'https://github.com/o/r/pull/7', 'taken unchanged')).toBe(
      'Fix the rule.\n\nThe paragraph.\n\n'
      + 'Absorbed from https://github.com/o/r/pull/7: taken unchanged\n',
    );
  });

  it('throws on an empty note and on a note containing a newline', () => {
    expect(() => absorbedMessage('Fix.\n', 'https://github.com/o/r/pull/7', '')).toThrow();
    expect(() => absorbedMessage('Fix.\n', 'https://github.com/o/r/pull/7', 'one\ntwo')).toThrow();
  });
});

describe('landedFrom', () => {
  it('reads the absorbed commits in log order and skips the rest', () => {
    const log = [
      'aaa1111\x1fSubject\n\nAbsorbed from https://github.com/o/r/pull/2: taken unchanged\n',
      'bbb2222\x1fOther\n\nNothing to close.\n',
      'ccc3333\x1fSubject\n\nAbsorbed from https://github.com/o/r/pull/9: resolves the conflict\n',
    ].join('\x1e') + '\x1e';
    expect(landedFrom(log)).toEqual([
      {
        number: 2,
        url: 'https://github.com/o/r/pull/2',
        sha: 'aaa1111',
        note: 'taken unchanged',
      },
      {
        number: 9,
        url: 'https://github.com/o/r/pull/9',
        sha: 'ccc3333',
        note: 'resolves the conflict',
      },
    ]);
  });
});

function lineOf(length) {
  let text = '-';
  while (text.length + 6 <= length) text += ' omega';
  while (text.length < length) text += 'x';
  return text;
}

const BULLET_120 = lineOf(120);
const BASE_CATALOG = 'entries:\n';
const TAIL_ONE = '- id: one\n  title: One\n';
const TAIL_TWO = '- id: two\n  title: Two\n';
const PLANNING = 'alpha is the anchor line.\nbeta follows.\ngamma closes the page.\n';
const AUTHORS = {
  1: ['Ada Lovelace', 'ada@example.com', '2026-10-01T00:00:00Z'],
  2: ['Grace Hopper', 'grace@example.com', '2026-10-02T00:00:00Z'],
  3: ['Mary Jackson', 'mary@example.com', '2026-10-03T00:00:00Z'],
  4: ['Katherine Johnson', 'katherine@example.com', '2026-10-04T00:00:00Z'],
};

function git(cwd, args, env = {}) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_AUTHOR_NAME: 'Maintainer',
      GIT_AUTHOR_EMAIL: 'maintainer@example.com',
      GIT_AUTHOR_DATE: '2026-09-01T00:00:00Z',
      ...env,
    },
  });
  if (r.status !== 0) throw new Error(`${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r.stdout;
}

// The script uses whatever git config is in force, as it must on a real machine; the
// tests isolate it from the developer's here, not inside the script.
function runScript(cwd, args, input, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', ...env },
  });
}

function commitAs(cwd, number, message) {
  const [name, email, date] = AUTHORS[number];
  git(cwd, ['add', '-A']);
  git(cwd, ['commit', '-q', '-m', message], {
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_AUTHOR_DATE: date,
  });
}

function configure(cwd) {
  git(cwd, ['config', 'user.name', 'Maintainer']);
  git(cwd, ['config', 'user.email', 'maintainer@example.com']);
}

function groupSection(output, home) {
  const marker = `Group: ${home}\n`;
  const start = output.indexOf(marker);
  const rest = output.slice(start + marker.length);
  const ends = ['\nGroup: ', '\nOverlaps:']
    .map((token) => rest.indexOf(token))
    .filter((index) => index >= 0);
  return rest.slice(0, ends.length ? Math.min(...ends) : rest.length);
}

describe('absorb-flush subcommands', () => {
  let root;
  let contrib;
  let listDir;
  let applyDir;
  let oldMain;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'absorb-flush-'));
    const origin = join(root, 'origin');
    contrib = join(root, 'contrib');
    mkdirSync(origin);
    git(origin, ['init', '-q', '--bare', '-b', 'main']);
    mkdirSync(contrib);
    git(contrib, ['init', '-q', '-b', 'main']);
    configure(contrib);
    git(contrib, ['remote', 'add', 'origin', origin]);
    mkdirSync(join(contrib, 'rules'));
    writeFileSync(join(contrib, 'feature-catalog.yaml'), BASE_CATALOG);
    writeFileSync(join(contrib, 'rules/planning.md'), PLANNING);
    git(contrib, ['add', '-A']);
    git(contrib, ['commit', '-q', '-m', 'base']);
    git(contrib, ['push', '-q', 'origin', 'main']);

    const planning = join(contrib, 'rules/planning.md');
    const catalog = join(contrib, 'feature-catalog.yaml');
    git(contrib, ['checkout', '-q', '-b', 'pr1']);
    writeFileSync(planning, PLANNING.replace('beta follows.\n', `${BULLET_120}\nbeta follows.\n`));
    writeFileSync(catalog, BASE_CATALOG + TAIL_ONE);
    commitAs(contrib, 1, 'add a bullet');
    git(contrib, ['push', '-q', 'origin', 'pr1:refs/pull/1/head']);

    git(contrib, ['checkout', '-q', 'main']);
    git(contrib, ['checkout', '-q', '-b', 'pr2']);
    writeFileSync(catalog, BASE_CATALOG + TAIL_TWO);
    commitAs(contrib, 2, 'add an entry');
    git(contrib, ['push', '-q', 'origin', 'pr2:refs/pull/2/head']);

    git(contrib, ['checkout', '-q', 'main']);
    git(contrib, ['checkout', '-q', '-b', 'pr3']);
    writeFileSync(planning, PLANNING.replace('beta follows.\n', 'from three\nbeta follows.\n'));
    commitAs(contrib, 3, 'insert a line');
    git(contrib, ['push', '-q', 'origin', 'pr3:refs/pull/3/head']);

    git(contrib, ['checkout', '-q', 'main']);
    git(contrib, ['checkout', '-q', '-b', 'pr4']);
    writeFileSync(planning, `${PLANNING}one\n`);
    commitAs(contrib, 4, 'first of two');
    writeFileSync(planning, `${PLANNING}two\n`);
    commitAs(contrib, 4, 'second of two');
    git(contrib, ['push', '-q', 'origin', 'pr4:refs/pull/4/head']);

    git(contrib, ['checkout', '-q', 'main']);
    git(contrib, ['checkout', '-q', '-b', 'pr5']);
    writeFileSync(planning, `${PLANNING}late\n`);
    commitAs(contrib, 1, 'late arrival');
    git(contrib, ['push', '-q', 'origin', 'pr5:refs/pull/5/head']);

    git(root, ['clone', '-q', origin, 'list']);
    git(root, ['clone', '-q', origin, 'apply']);
    listDir = join(root, 'list');
    applyDir = join(root, 'apply');
    configure(listDir);
    configure(applyDir);
    oldMain = git(applyDir, ['rev-parse', 'main']).trim();
    git(applyDir, ['checkout', '-q', '-b', 'absorb/group']);
  });

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  function listed(numbers) {
    const files = {
      1: [
        { path: 'rules/planning.md', additions: 5, deletions: 0 },
        { path: 'feature-catalog.yaml', additions: 1, deletions: 0 },
      ],
      2: [{ path: 'feature-catalog.yaml', additions: 1, deletions: 0 }],
      3: [{ path: 'rules/planning.md', additions: 1, deletions: 0 }],
      5: [{ path: 'rules/planning.md', additions: 1, deletions: 0 }],
    };
    const titles = { 1: 'add a bullet', 2: 'add an entry', 3: 'insert a line', 5: 'late arrival' };
    return JSON.stringify(numbers.map((number) => ({
      number,
      title: titles[number],
      url: `https://github.com/o/r/pull/${number}`,
      headRefName: `upstream/demo/${number}`,
      files: files[number],
    })));
  }

  it('lists groups, spans nothing here, flags the shared lines, and reports a later arrival', () => {
    expect(BULLET_120).toHaveLength(120);
    const first = runScript(listDir, ['list', 'upstream/demo/'], listed([1, 2, 3]));
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('First listing.');
    expect(groupSection(first.stdout, 'rules/planning.md')).toMatch(/#1 add a bullet/);
    expect(groupSection(first.stdout, 'rules/planning.md')).toMatch(/#3 insert a line/);
    expect(groupSection(first.stdout, 'rules/planning.md')).not.toMatch(/#2 /);
    expect(groupSection(first.stdout, 'feature-catalog.yaml')).toMatch(/#2 add an entry/);
    expect(first.stdout).toMatch(/#1 #3 rules\/planning\.md/);
    expect(first.stdout).not.toMatch(/#1 #2 feature-catalog\.yaml/);

    const second = runScript(listDir, ['list', 'upstream/demo/'], listed([1, 2, 3, 5]));
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('Arrived: #5');
  });

  it('applies one commit per contribution, stops on a conflict and on two commits, and maps what landed', () => {
    const head = git(applyDir, ['rev-parse', 'HEAD']);
    const tree = git(applyDir, ['rev-parse', 'HEAD^{tree}']);
    const two = runScript(applyDir, ['apply', '4', 'https://github.com/o/r/pull/4']);
    expect(two.status).toBe(2);
    expect(two.stdout).toMatch(/2 commits/);
    expect(git(applyDir, ['rev-parse', 'HEAD'])).toBe(head);
    expect(git(applyDir, ['rev-parse', 'HEAD^{tree}'])).toBe(tree);
    expect(git(applyDir, ['status', '--porcelain'])).toBe('');

    writeFileSync(join(applyDir, 'stray.txt'), 'x\n');
    const dirty = runScript(applyDir, ['apply', '2', 'https://github.com/o/r/pull/2']);
    expect(dirty.status).toBe(2);
    expect(dirty.stdout).toMatch(/dirty/);
    rmSync(join(applyDir, 'stray.txt'));

    expect(spawnSync('git', ['rev-parse', '--verify', 'refs/absorb/2'], {
      cwd: applyDir, encoding: 'utf8',
    }).status).not.toBe(0);

    expect(runScript(applyDir, ['apply', '2', 'https://github.com/o/r/pull/2']).status).toBe(0);
    expect(runScript(applyDir, ['apply', '1', 'https://github.com/o/r/pull/1']).status).toBe(0);

    const authors = git(applyDir, ['log', '-2', '--format=%an %ad', '--date=raw']).trim().split('\n');
    expect(authors[0]).toBe(git(contrib, ['log', '-1', '--format=%an %ad', '--date=raw', 'pr1']).trim());
    expect(authors[1]).toBe(git(contrib, ['log', '-1', '--format=%an %ad', '--date=raw', 'pr2']).trim());
    const messages = git(applyDir, ['log', '-2', '--format=%B%x1e']).split('\x1e');
    expect(messages[0]).toContain('Absorbed from https://github.com/o/r/pull/1: taken unchanged; rewrapped to 88 columns');
    expect(messages[1]).toContain('Absorbed from https://github.com/o/r/pull/2: taken unchanged');
    expect(readFileSync(join(applyDir, 'feature-catalog.yaml'), 'utf8')).toBe(BASE_CATALOG + TAIL_TWO + TAIL_ONE);
    const planning = readFileSync(join(applyDir, 'rules/planning.md'), 'utf8');
    expect(planning).not.toContain(BULLET_120);
    expect(planning.split('\n').every((line) => line.length <= 88)).toBe(true);

    const conflict = runScript(applyDir, ['apply', '3', 'https://github.com/o/r/pull/3']);
    expect(conflict.status).toBe(3);
    expect(conflict.stdout).toContain('conflict: rules/planning.md');
    const pendingPath = join(applyDir, '.git', 'absorb-flush', 'pending.json');
    expect(JSON.parse(readFileSync(pendingPath, 'utf8'))).toEqual({
      number: 3,
      url: 'https://github.com/o/r/pull/3',
      note: 'taken unchanged',
    });

    const refused = runScript(applyDir, ['commit']);
    expect(refused.status).toBe(2);

    const text = readFileSync(join(applyDir, 'rules/planning.md'), 'utf8');
    writeFileSync(
      join(applyDir, 'rules/planning.md'),
      text.replace(/^<<<<<<< .*\n/gm, '').replace(/^=======\n/gm, '').replace(/^>>>>>>> .*\n/gm, ''),
    );
    git(applyDir, ['add', 'rules/planning.md']);
    const resolved = runScript(applyDir, [
      'commit', '--note', 'resolves the conflict with #1 by keeping both lines',
    ]);
    expect(resolved.status).toBe(0);
    expect(git(applyDir, ['log', '-1', '--format=%an'])).toBe('Mary Jackson\n');
    expect(git(applyDir, ['log', '-1', '--format=%B'])).toContain(
      'Absorbed from https://github.com/o/r/pull/3: resolves the conflict with #1 by keeping both lines',
    );

    git(applyDir, ['push', '-q', 'origin', 'HEAD:main']);
    git(applyDir, ['fetch', '-q', 'origin']);
    const landed = runScript(applyDir, ['landed', oldMain]);
    expect(landed.status).toBe(0);
    const rows = landed.stdout.trim().split('\n').map((line) => line.split('\t'));
    expect(rows.map((row) => row[0])).toEqual(['#2', '#1', '#3']);
    expect(rows[0][1]).toHaveLength(7);
    expect(rows[0][2]).toBe('https://github.com/o/r/pull/2');
    expect(rows[0][3]).toBe('taken unchanged');
    expect(rows[1][3]).toBe('taken unchanged; rewrapped to 88 columns');
    expect(rows[2][3]).toBe('resolves the conflict with #1 by keeping both lines');
  });
  it('commits with the git config in force, so a global committer identity is used', () => {
    const globalDir = join(root, 'global');
    git(root, ['clone', '-q', join(root, 'origin'), 'global']);
    git(globalDir, ['checkout', '-q', '-b', 'absorb/global', oldMain]);
    const globalConfig = join(root, 'global.gitconfig');
    writeFileSync(globalConfig, '[user]\n\tname = Global Maintainer\n\temail = global@example.com\n');
    const r = runScript(globalDir, ['apply', '2', 'https://github.com/o/r/pull/2'], undefined, {
      GIT_CONFIG_GLOBAL: globalConfig,
    });
    expect(r.status).toBe(0);
    expect(git(globalDir, ['log', '-1', '--format=%cn|%an'])).toBe('Global Maintainer|Grace Hopper\n');
  });
});
