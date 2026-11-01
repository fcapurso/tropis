// Level: unit
/**
 * A plan that shares a file with a plan already being built records that it merges after
 * it, and waits for it before merging.
 *
 * The pure functions are imported; the command-line cases run a copy of the script
 * installed at .tropis/scripts/ in a temporary project, as a session would run it. The
 * waiting cases use a bare repository as origin so the script's fetch is the thing under
 * test.
 */
import { spawnSync } from 'node:child_process';
import {
  readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, symlinkSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sharedFiles, BOOKKEEPING } from '../scripts/plan-overlap.mjs';
import {
  mergesAfterIds, withMergesAfter, validateDispatchable,
} from '../scripts/plan-binding.js';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = resolve(here, '../scripts');
const FILES = ['plan-overlap.mjs', 'plan-binding.js', 'projections.js'];

const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};
const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, env: ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
const identify = (cwd) => {
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'user.email', 'test@example.com');
};

const plan = (files, { header = '', delivers = 'None.' } = {}) => `# A plan

${header}

## Delivers

${delivers}

## File Structure

| File | Change |
|---|---|
${files.map((f) => `| \`${f}\` | change |`).join('\n')}
`;

const HEADER = `**Model tier: Medium.** Care.

**Merge authority: parent review.** Reviewed.

**Requires:** nothing special.`;

const catalog = (entries) => entries.map(({ id, status, refs = [] }) => `- id: ${id}
  status: ${status}
  refs:
${refs.length ? refs.map((r) => `    - ${r}`).join('\n') : '    []'}
`).join('');

const roots = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

function stage() {
  const root = mkdtempSync(join(tmpdir(), 'plan-overlap-'));
  roots.push(root);
  mkdirSync(join(root, '.tropis/scripts'), { recursive: true });
  for (const f of FILES) copyFileSync(join(shipped, f), join(root, '.tropis/scripts', f));
  writeFileSync(join(root, '.tropis/package.json'), '{"type":"module"}\n');
  symlinkSync(resolve(here, '../node_modules'), join(root, '.tropis/node_modules'));
  mkdirSync(join(root, 'docs/superpowers/plans'), { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  identify(root);
  return root;
}
const put = (root, rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const run = (root, ...args) => spawnSync('node', ['.tropis/scripts/plan-overlap.mjs', ...args], {
  cwd: root, env: ENV, encoding: 'utf8',
});
const P = (name) => `docs/superpowers/plans/${name}.md`;

function claimProject({ own, ownHeader = '' }) {
  const root = stage();
  put(root, 'feature-catalog.yaml', catalog([
    { id: 'a', status: 'building', refs: [P('a')] },
    { id: 'b', status: 'building', refs: [P('b')] },
  ]));
  put(root, P('a'), plan(['src/x.js', 'feature-catalog.yaml']));
  put(root, P('b'), plan(own, { header: ownHeader || HEADER, delivers: 'b' }));
  return root;
}

describe('sharedFiles', () => {
  test('ignores every bookkeeping path and returns a shared source file', () => {
    const a = plan(['src/x.js', ...BOOKKEEPING]);
    const b = plan(['src/y.js', 'src/x.js', ...BOOKKEEPING]);
    expect(sharedFiles(a, b)).toEqual(['src/x.js']);
  });
});

describe('Merges after in a plan header', () => {
  test('is inserted after Requires, keeping what is there', () => {
    const out = withMergesAfter(plan(['src/x.js'], { header: HEADER }), ['a']);
    expect(out).toContain('**Requires:** nothing special.\n\n**Merges after:** a\n\n## Delivers');
    expect(mergesAfterIds(out)).toEqual(['a']);
  });

  test('keeps existing ids, appends new ones without duplicates', () => {
    let out = withMergesAfter(plan(['src/x.js'], { header: HEADER }), ['z', 'a']);
    out = withMergesAfter(out, ['a', 'c', 'z']);
    expect(mergesAfterIds(out)).toEqual(['z', 'a', 'c']);
    expect(out).toContain('**Merges after:** z, a, c');
  });

  test('returns the input unchanged when nothing is new', () => {
    const once = withMergesAfter(plan(['src/x.js'], { header: HEADER }), ['a']);
    expect(withMergesAfter(once, ['a'])).toBe(once);
    expect(withMergesAfter(once, [])).toBe(once);
  });

  test('a plan with no header field gets the line before its first heading', () => {
    const out = withMergesAfter('# T\n\nintro\n\n## Delivers\n\nNone.\n', ['a']);
    expect(out).toBe('# T\n\nintro\n\n**Merges after:** a\n\n## Delivers\n\nNone.\n');
  });

  test('an empty field is refused as dispatchable, naming it; one with an id is not', () => {
    const base = readFileSync(resolve(here, '../docs/superpowers/plans/2026-11-01-overlapping-plans-merge-in-order.md'), 'utf8');
    const stripped = base.split('\n').filter((l) => !l.startsWith('**Merges after')).join('\n');
    const empty = validateDispatchable(`${stripped}\n\n**Merges after:**\n`);
    expect(empty.errors.join('\n')).toMatch(/"Merges after"/);
    const filled = validateDispatchable(withMergesAfter(stripped, ['a']));
    expect(filled.errors.join('\n')).not.toMatch(/Merges after/);
  });
});

describe('--claim', () => {
  test('on an overlap names the entry and file, writes the field, ignores bookkeeping and itself', () => {
    const root = claimProject({ own: ['src/x.js', 'src/y.js', 'feature-catalog.yaml'] });
    const r = run(root, '--claim', P('b'));
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Overlaps a .*src\/x\.js/);
    expect(r.stdout).not.toMatch(/Overlaps a .*feature-catalog\.yaml/);
    expect(r.stdout).not.toMatch(/Overlaps b/);
    expect(readFileSync(join(root, P('b')), 'utf8')).toContain('**Merges after:** a');
  });

  test('with no overlap says so and leaves the plan byte for byte', () => {
    const root = claimProject({ own: ['src/y.js', 'feature-catalog.yaml'] });
    const before = readFileSync(join(root, P('b')), 'utf8');
    const r = run(root, '--claim', P('b'));
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/No overlap/);
    expect(readFileSync(join(root, P('b')), 'utf8')).toBe(before);
  });

  test('adds to a field the plan already has', () => {
    const root = claimProject({
      own: ['src/x.js'],
      ownHeader: `${HEADER}\n\n**Merges after:** z`,
    });
    expect(run(root, '--claim', P('b')).status).toBe(0);
    expect(readFileSync(join(root, P('b')), 'utf8')).toContain('**Merges after:** z, a');
  });

  test('exits 2 on a plan with no File Structure table', () => {
    const root = claimProject({ own: ['src/x.js'] });
    put(root, P('b'), '# No table\n\n## Delivers\n\nb\n');
    expect(run(root, '--claim', P('b')).status).toBe(2);
  });
});

describe('--wait', () => {
  // origin is a bare repository; `clone` is the session's checkout.
  function waitProject({ status, header = '**Merges after:** a' }) {
    const root = mkdtempSync(join(tmpdir(), 'plan-overlap-wait-'));
    roots.push(root);
    const origin = join(root, 'origin.git');
    git(root, 'init', '-q', '--bare', '-b', 'main', origin);
    const clone = join(root, 'clone');
    git(root, 'clone', '-q', origin, clone);
    identify(clone);
    git(clone, 'checkout', '-q', '-b', 'main');
    mkdirSync(join(clone, '.tropis/scripts'), { recursive: true });
    for (const f of FILES) copyFileSync(join(shipped, f), join(clone, '.tropis/scripts', f));
    writeFileSync(join(clone, '.tropis/package.json'), '{"type":"module"}\n');
    symlinkSync(resolve(here, '../node_modules'), join(clone, '.tropis/node_modules'));
    put(clone, '.gitignore', '.tropis/\n');
    put(clone, 'feature-catalog.yaml', catalog([{ id: 'a', status }]));
    put(clone, P('mine'), plan(['src/x.js'], { header: `${HEADER}\n\n${header}` }));
    git(clone, 'add', '-A');
    git(clone, 'commit', '-q', '-m', 'catalog');
    git(clone, 'push', '-q', 'origin', 'main');
    return { root, origin, clone };
  }
  const FAST = ['--interval', '0', '--timeout', '0.01'];

  test('stops naming the entry when it has not shipped in time', () => {
    const { clone } = waitProject({ status: 'building' });
    const r = run(clone, '--wait', P('mine'), ...FAST);
    expect(r.status).toBe(3);
    expect(r.stdout).toMatch(/STOPPED: waiting on a/);
  });

  test('sees a ship pushed from another clone after this one last fetched', () => {
    const { root, origin, clone } = waitProject({ status: 'building' });
    const other = join(root, 'other');
    git(root, 'clone', '-q', origin, other);
    identify(other);
    put(other, 'feature-catalog.yaml', catalog([{ id: 'a', status: 'shipped' }]));
    git(other, 'commit', '-q', '-am', 'a ships');
    git(other, 'push', '-q', 'origin', 'main');
    const r = run(clone, '--wait', P('mine'), ...FAST);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/go ahead/);
  });

  test('goes ahead when the entry was dropped', () => {
    const { clone } = waitProject({ status: 'dropped' });
    expect(run(clone, '--wait', P('mine'), ...FAST).status).toBe(0);
  });

  test('exits 2 naming an id the origin catalog lacks', () => {
    const { clone } = waitProject({ status: 'shipped', header: '**Merges after:** ghost' });
    const r = run(clone, '--wait', P('mine'), ...FAST);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/ghost/);
  });

  test('a plan with no Merges after goes ahead with no origin at all', () => {
    const root = stage();
    put(root, P('mine'), plan(['src/x.js'], { header: HEADER }));
    const r = run(root, '--wait', P('mine'));
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/go ahead/);
  });
});
