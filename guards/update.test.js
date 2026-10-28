// Level: unit
/**
 * `.tropis/scripts/update.mjs` fetches a framework release and removes the clone.
 *
 * Every source is a local bare repository. Nothing in this file reaches the network.
 * The breaking rule is the one in `take-version.mjs`; this file asserts the copy in
 * `update.mjs` still agrees with it.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { breaking, parseVersion } from '../scripts/take-version.mjs';
import { versionBreaks } from '../scripts/update.mjs';

const blueprint = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(blueprint, 'scripts/update.mjs');

const NO_SOURCE = 'update: no source recorded. Run again with --source <where Tropis comes from>.\n';

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || args.join(' '));
  return r.stdout;
}

const RELEASES = `# Releases

## [0.4.0] — 2026-10-01

The held release.

### After updating: what to do by hand

**1. Do not include this.** It belongs to the version already held.

## [0.5.0] — 2026-10-02

A minor release.

### After updating: what to do by hand

**1. Create a file.** Create docs/updated.md containing the word done.
The second line stays part of the step.

**2. Optional: say hello.** Run echo hello.

## [0.5.1] — 2026-10-03

A patch with nothing to do by hand.
`;

/** A bare repository tagged v0.4.0, v0.5.0 and v0.5.1, plus tags that are not releases. */
function bareSource() {
  const parent = mkdtempSync(join(tmpdir(), 'update-src-'));
  const work = join(parent, 'work');
  const bare = join(parent, 'tropis.git');
  mkdirSync(work);
  git(work, 'init', '-q', '-b', 'main');
  writeFileSync(join(work, 'RELEASES.md'), RELEASES);
  git(work, 'add', '-A');
  git(work, 'commit', '-qm', 'v0.4.0');
  git(work, 'tag', 'v0.4.0');
  // Not release tags, and not on a release commit: describe must name the target.
  git(work, 'tag', 'v0.5.2-rc.1');
  git(work, 'tag', 'nightly');
  git(work, 'commit', '-qm', 'v0.5.0', '--allow-empty');
  git(work, 'tag', 'v0.5.0');
  git(work, 'commit', '-qm', 'v0.5.1', '--allow-empty');
  git(work, 'tag', 'v0.5.1');
  git(work, 'clone', '--bare', '-q', work, bare);
  return { parent, bare };
}

/** A project whose installed record holds `version` and, unless omitted, `source`. */
function project({ version, source }) {
  const parent = mkdtempSync(join(tmpdir(), 'update-proj-'));
  const dir = join(parent, 'example-project');
  mkdirSync(join(dir, '.tropis/scripts'), { recursive: true });
  writeFileSync(join(dir, '.tropis/scripts/update.mjs'), readFileSync(script));
  const record = { version, files: {} };
  if (source !== undefined) record.source = source;
  writeFileSync(join(dir, '.tropis/installed.json'), `${JSON.stringify(record, null, 2)}\n`);
  return { parent, dir };
}

const run = (dir, ...args) => spawnSync(
  'node',
  [join(dir, '.tropis/scripts/update.mjs'), ...args],
  { encoding: 'utf8' },
);

const clones = () => readdirSync(tmpdir()).filter((name) => name.startsWith('tropis-update-'));

describe('the breaking rule', () => {
  it('agrees with take-version.mjs', () => {
    const pairs = [
      ['v0.4.0', 'v0.5.0'],
      ['v0.5.0', 'v0.5.1'],
      ['v0.9.1', 'v1.0.0'],
      ['v1.0.0', 'v1.0.1'],
      ['v1.2.3', 'v1.3.0'],
      ['v1.4.0', 'v2.0.0'],
    ];
    for (const [held, target] of pairs) {
      expect(versionBreaks(target, held)).toBe(breaking(parseVersion(target), parseVersion(held)));
    }
  });
});

describe('update.mjs fetch', () => {
  it('picks the highest release, a named one, and rejects a tag that does not exist', () => {
    const source = bareSource();
    const highest = project({ version: 'v0.4.0', source: source.bare });
    const named = project({ version: 'v0.4.0', source: source.bare });
    const missing = project({ version: 'v0.4.0', source: source.bare });
    const clonesBefore = clones();
    try {
      const top = run(highest.dir, 'fetch');
      expect(top.status).toBe(0);
      expect(top.stderr).toBe('');
      const topJson = JSON.parse(top.stdout);
      expect(topJson.target).toBe('v0.5.1');
      expect(topJson.held).toBe('v0.4.0');
      expect(topJson.source).toBe(source.bare);
      expect(topJson.breaking).toBe(true);
      expect(git(topJson.clone, 'describe', '--tags', '--exact-match', 'HEAD').trim()).toBe('v0.5.1');

      const exact = run(named.dir, 'fetch', 'v0.5.0');
      expect(exact.status).toBe(0);
      const exactJson = JSON.parse(exact.stdout);
      expect(exactJson.target).toBe('v0.5.0');
      expect(exactJson.breaking).toBe(true);
      expect(git(exactJson.clone, 'describe', '--tags', '--exact-match', 'HEAD').trim()).toBe('v0.5.0');

      const absent = run(missing.dir, 'fetch', 'v9.9.9');
      expect(absent.status).toBe(1);
      expect(absent.stdout).toBe('');
      expect(absent.stderr).toContain('v9.9.9');
      expect(clones().filter((name) => !clonesBefore.includes(name)).length).toBe(2);
    } finally {
      for (const made of [highest, named, missing]) {
        const listed = clones().filter((name) => !clonesBefore.includes(name));
        for (const name of listed) rmSync(join(tmpdir(), name), { recursive: true, force: true });
      }
      rmSync(source.parent, { recursive: true, force: true });
      rmSync(highest.parent, { recursive: true, force: true });
      rmSync(named.parent, { recursive: true, force: true });
      rmSync(missing.parent, { recursive: true, force: true });
    }
  });

  it('reports an up-to-date project and clones nothing', () => {
    const source = bareSource();
    const held = project({ version: 'v0.5.1', source: source.bare });
    const before = clones();
    try {
      const r = run(held.dir, 'fetch');
      expect(r.status).toBe(0);
      expect(r.stderr).toBe('');
      expect(JSON.parse(r.stdout).target).toBeNull();
      expect(clones()).toEqual(before);
    } finally {
      rmSync(source.parent, { recursive: true, force: true });
      rmSync(held.parent, { recursive: true, force: true });
    }
  });

  it('exits 2 when no source is recorded and none is given', () => {
    const held = project({ version: 'v0.4.0' });
    try {
      const r = run(held.dir, 'fetch');
      expect(r.status).toBe(2);
      expect(r.stdout).toBe('');
      expect(r.stderr).toBe(NO_SOURCE);
    } finally {
      rmSync(held.parent, { recursive: true, force: true });
    }
  });

  it('uses --source when the record has none', () => {
    const source = bareSource();
    const held = project({ version: 'v0.5.0' });
    try {
      const r = run(held.dir, 'fetch', '--source', source.bare);
      expect(r.status).toBe(0);
      const json = JSON.parse(r.stdout);
      expect(json.source).toBe(source.bare);
      expect(json.target).toBe('v0.5.1');
      expect(json.breaking).toBe(false);
      rmSync(json.clone, { recursive: true, force: true });
    } finally {
      rmSync(source.parent, { recursive: true, force: true });
      rmSync(held.parent, { recursive: true, force: true });
    }
  });

  it('returns only the steps between the held version and the target', () => {
    const source = bareSource();
    const held = project({ version: 'v0.4.0', source: source.bare });
    try {
      const r = run(held.dir, 'fetch', 'v0.5.1');
      expect(r.status).toBe(0);
      const json = JSON.parse(r.stdout);
      expect(json.steps).toEqual([
        {
          version: 'v0.5.0',
          optional: false,
          text: '**1. Create a file.** Create docs/updated.md containing the word done.\nThe second line stays part of the step.',
        },
        {
          version: 'v0.5.0',
          optional: true,
          text: '**2. Optional: say hello.** Run echo hello.',
        },
      ]);
      rmSync(json.clone, { recursive: true, force: true });
    } finally {
      rmSync(source.parent, { recursive: true, force: true });
      rmSync(held.parent, { recursive: true, force: true });
    }
  });
});

describe('update.mjs discard', () => {
  it('removes a clone and refuses anything else', () => {
    const source = bareSource();
    const held = project({ version: 'v0.4.0', source: source.bare });
    const outsider = mkdtempSync(join(tmpdir(), 'not-update-'));
    try {
      const r = run(held.dir, 'fetch', 'v0.5.1');
      const json = JSON.parse(r.stdout);
      expect(existsSync(json.clone)).toBe(true);
      const removed = run(held.dir, 'discard', json.clone);
      expect(removed.status).toBe(0);
      expect(removed.stderr).toBe('');
      expect(existsSync(json.clone)).toBe(false);

      const tmpItself = run(held.dir, 'discard', '/tmp');
      expect(tmpItself.status).toBe(1);
      expect(existsSync('/tmp')).toBe(true);

      const outside = run(held.dir, 'discard', blueprint);
      expect(outside.status).toBe(1);
      expect(existsSync(blueprint)).toBe(true);

      const misnamed = run(held.dir, 'discard', outsider);
      expect(misnamed.status).toBe(1);
      expect(existsSync(outsider)).toBe(true);
    } finally {
      rmSync(outsider, { recursive: true, force: true });
      rmSync(source.parent, { recursive: true, force: true });
      rmSync(held.parent, { recursive: true, force: true });
    }
  });
});
