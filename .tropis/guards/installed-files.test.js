// Level: unit
/**
 * Installed framework files still match the fingerprint recorded at setup.
 *
 * `.tropis/installed.json` maps each shipped path to the SHA-256 of its text with
 * the inner lines of project-owned blocks removed. Filling in a block is the project's
 * own text; editing outside one is a change that the update replaces. No record means
 * the project was set up before versions were recorded, and the check passes. A
 * recorded file the project has removed is left alone.
 *
 * The root is the project under test: FRAMEWORK_ROOT when the self-check points it at
 * a composed fixture, otherwise two levels above this file, which is where it sits
 * once installed at `.tropis/guards/`.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blocks, carryBlocks, fingerprint, recordOf, recordProblems, shippedFiles,
} from '../scripts/installed-files.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');
const scripts = resolve(here, '../scripts');

const marker = (kind) => `<!-- project-owned: ${kind}`;
const slashMarker = (kind) => `// project-owned: ${kind}`;

const changed = (path) =>
  `${path} was changed after it was installed. Framework files are replaced on update: move the change into a project-owned block, a rule additions file or a file of your own, or merge the ${path}.new beside it.`;

function tempProject() {
  return mkdtempSync(join(tmpdir(), 'installed-files-'));
}

if (!existsSync(resolve(root, '.tropis/installed.json'))) {
  it('no record — set up before versions were recorded', () => {
    expect(recordProblems(root)).toEqual([]);
  });
} else {
  it('match the fingerprints recorded at install', () => {
    expect(recordProblems(root)).toEqual([]);
  });
}

describe('fingerprint', () => {
  const text = [
    'Keep.',
    marker('begin — fill in:'),
    '     - Run from: here',
    '     - Trigger: go -->',
    marker('end -->'),
    'Also keep.',
    '',
  ].join('\n');

  const emptied = [
    'Keep.',
    marker('begin — fill in:'),
    marker('end -->'),
    'Also keep.',
    '',
  ].join('\n');

  it('is unchanged by an edit inside a block and changed by an edit outside one', () => {
    const inside = text.replace('here', 'there');
    const outside = text.replace('Keep.', 'Kept.');
    expect(fingerprint(inside)).toBe(fingerprint(text));
    expect(fingerprint(text)).toBe(fingerprint(emptied));
    expect(fingerprint(outside)).not.toBe(fingerprint(text));
    expect(fingerprint(emptied)).not.toBe(fingerprint(emptied.replace(/\n$/, '')));
  });
});

describe('blocks', () => {
  it('lists each block\'s inner lines, in order, markers excluded', () => {
    const text = [
      marker('begin -->'),
      'one',
      'two',
      marker('end -->'),
      'between',
      marker('begin -->'),
      marker('end -->'),
      '',
    ].join('\n');
    expect(blocks(text)).toEqual([['one', 'two'], []]);
    expect(blocks('no markers\n')).toEqual([]);
  });
});

describe('carryBlocks', () => {
  it('substitutes block contents in order', () => {
    const project = [
      marker('begin -->'),
      'A1',
      'A2',
      marker('end -->'),
      marker('begin -->'),
      marker('end -->'),
      '',
    ].join('\n');
    const next = [
      'top',
      marker('begin -->'),
      'old A',
      marker('end -->'),
      'mid',
      marker('begin -->'),
      'old B1',
      'old B2',
      marker('end -->'),
      'bottom',
      '',
    ].join('\n');
    const carried = carryBlocks(project, next);
    expect(carried.mismatch).toBe(false);
    expect(carried.text).toBe([
      'top',
      marker('begin -->'),
      'A1',
      'A2',
      marker('end -->'),
      'mid',
      marker('begin -->'),
      marker('end -->'),
      'bottom',
      '',
    ].join('\n'));
  });

  it('reports a mismatch in block count and leaves the next file unchanged', () => {
    const project = `${marker('begin -->')}\nonly\n${marker('end -->')}\n`;
    const next = [
      marker('begin -->'),
      'first',
      marker('end -->'),
      marker('begin -->'),
      'second',
      marker('end -->'),
      '',
    ].join('\n');
    const carried = carryBlocks(project, next);
    expect(carried.mismatch).toBe(true);
    expect(carried.text).toBe(next);
  });
});

describe('shipped files', () => {
  it('lists the three roots, sorted, and skips what a release leaves out', () => {
    const dir = tempProject();
    try {
      mkdirSync(join(dir, '.tropis/node_modules/pkg'), { recursive: true });
      mkdirSync(join(dir, '.tropis/sub'), { recursive: true });
      mkdirSync(join(dir, '.claude/framework'), { recursive: true });
      mkdirSync(join(dir, '.claude/commands'), { recursive: true });
      mkdirSync(join(dir, '.claude/rules'), { recursive: true });
      writeFileSync(join(dir, '.tropis/a.js'), 'aaa\n');
      writeFileSync(join(dir, '.tropis/sub/b.js'), 'bbb\n');
      writeFileSync(join(dir, '.tropis/node_modules/pkg/index.js'), 'nope\n');
      writeFileSync(join(dir, '.tropis/package-lock.json'), '{}\n');
      writeFileSync(join(dir, '.tropis/installed.json'), '{}\n');
      writeFileSync(join(dir, '.tropis/README.md'), 'guide\n');
      writeFileSync(join(dir, '.claude/framework/doc.md'), 'doc\n');
      writeFileSync(join(dir, '.claude/commands/cmd.md'), 'cmd\n');
      writeFileSync(join(dir, '.claude/rules/own.md'), 'own\n');
      writeFileSync(join(dir, 'CLAUDE.md'), 'project\n');

      const expected = [
        '.claude/commands/cmd.md',
        '.claude/framework/doc.md',
        '.tropis/a.js',
        '.tropis/sub/b.js',
      ];
      expect(shippedFiles(dir)).toEqual(expected);
      const record = recordOf(dir, 'v0.2.0');
      expect(record.version).toBe('v0.2.0');
      expect(Object.keys(record.files)).toEqual(expected);
      expect(record.files['.tropis/a.js']).toBe(fingerprint('aaa\n'));
      expect(Object.keys(record)).toEqual(['version', 'files']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('puts a source between version and files, and leaves the object unchanged without one', () => {
    const dir = tempProject();
    try {
      mkdirSync(join(dir, '.tropis'), { recursive: true });
      writeFileSync(join(dir, '.tropis/a.js'), 'aaa\n');
      const source = 'https://example.test/tropis.git';
      const withSource = recordOf(dir, 'v0.2.0', source);
      expect(Object.keys(withSource)).toEqual(['version', 'source', 'files']);
      expect(withSource.source).toBe(source);
      expect(withSource.files).toEqual(recordOf(dir, 'v0.2.0').files);

      expect(recordOf(dir, 'v0.2.0', 'https://x-token:secret@github.com/o/tropis.git').source)
        .toBe('https://github.com/o/tropis.git');
      expect(recordOf(dir, 'v0.2.0', 'git@github.com:o/tropis.git').source)
        .toBe('git@github.com:o/tropis.git');

      const plain = recordOf(dir, 'v0.2.0');
      expect(Object.keys(plain)).toEqual(['version', 'files']);
      expect(plain).not.toHaveProperty('source');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('shipped pipeline workflows', () => {
  it('includes the Tropis workflows when they exist, and no other workflow', () => {
    const dir = tempProject();
    try {
      mkdirSync(join(dir, '.tropis'), { recursive: true });
      mkdirSync(join(dir, '.github/workflows'), { recursive: true });
      writeFileSync(join(dir, '.tropis/a.js'), 'aaa\n');
      writeFileSync(join(dir, '.github/workflows/ci.yml'), 'name: own\n');
      writeFileSync(join(dir, '.github/workflows/tropis-pipeline.yml'), 'name: pipeline\n');
      writeFileSync(join(dir, '.github/workflows/tropis-framework-checks.yml'), 'name: checks\n');
      writeFileSync(join(dir, '.github/workflows/tropis-staging.yml'), 'name: staging\n');
      expect(shippedFiles(dir)).toEqual([
        '.github/workflows/tropis-framework-checks.yml',
        '.github/workflows/tropis-pipeline.yml',
        '.github/workflows/tropis-staging.yml',
        '.tropis/a.js',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('recordProblems', () => {
  it('names a file changed outside a block, ignores an edit inside one, and omits a missing file', () => {
    const dir = tempProject();
    const path = '.tropis/kept.mjs';
    const original = `const x = 1;\n${slashMarker('begin')}\nmine\n${slashMarker('end')}\n`;
    try {
      mkdirSync(join(dir, '.tropis'), { recursive: true });
      expect(recordProblems(dir)).toEqual([]);

      writeFileSync(join(dir, '.tropis/kept.mjs'), original);
      writeFileSync(join(dir, '.tropis/installed.json'), `${JSON.stringify({
        version: 'v0.1.0',
        files: {
          '.claude/commands/removed.md': fingerprint('gone\n'),
          [path]: fingerprint(original),
        },
      }, null, 2)}\n`);

      writeFileSync(join(dir, '.tropis/kept.mjs'), original.replace('mine', 'ours'));
      expect(recordProblems(dir)).toEqual([]);

      writeFileSync(join(dir, '.tropis/kept.mjs'), original.replace('const x = 1;', 'const x = 2;'));
      expect(recordProblems(dir)).toEqual([changed(path)]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('omits a recorded path that is a directory', () => {
    const dir = tempProject();
    try {
      mkdirSync(join(dir, '.tropis/scripts'), { recursive: true });
      writeFileSync(join(dir, '.tropis/installed.json'), `${JSON.stringify({
        version: 'v0.1.0',
        files: { '.tropis/scripts': fingerprint('was a file\n') },
      }, null, 2)}\n`);
      expect(recordProblems(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('record-installed.mjs', () => {
  const script = join(scripts, 'record-installed.mjs');

  it('exits 1 with the usage line when given no version', () => {
    const r = spawnSync('node', [script], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('usage: record-installed.mjs <version>\n');
  });

  it('writes the record for its own project and prints nothing', () => {
    const dir = tempProject();
    try {
      const bin = join(dir, '.tropis/scripts');
      mkdirSync(bin, { recursive: true });
      mkdirSync(join(dir, '.claude/commands'), { recursive: true });
      copyFileSync(join(scripts, 'installed-files.js'), join(bin, 'installed-files.js'));
      copyFileSync(script, join(bin, 'record-installed.mjs'));
      writeFileSync(join(dir, '.claude/commands/release.md'), `${marker('begin -->')}\nfill\n${marker('end -->')}\n`);
      writeFileSync(join(dir, '.tropis/README.md'), 'operator guide\n');
      writeFileSync(join(dir, '.tropis/project.json'), '{"name":"x"}\n');
      writeFileSync(join(dir, '.tropis/worktree-setup.txt'), 'npm ci\n');

      const r = spawnSync('node', [join(bin, 'record-installed.mjs'), 'v1.2.3'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
      expect(r.stderr).toBe('');

      const written = readFileSync(join(dir, '.tropis/installed.json'), 'utf8');
      expect(written).toBe(`${JSON.stringify(recordOf(dir, 'v1.2.3'), null, 2)}\n`);
      expect(written.endsWith('\n')).toBe(true);
      expect(Object.keys(JSON.parse(written).files)).not.toContain('.tropis/README.md');
      expect(Object.keys(JSON.parse(written).files)).not.toContain('.tropis/project.json');
      expect(Object.keys(JSON.parse(written).files)).not.toContain('.tropis/worktree-setup.txt');
      expect(recordProblems(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a source between version and files when given one', () => {
    const dir = tempProject();
    try {
      const bin = join(dir, '.tropis/scripts');
      mkdirSync(bin, { recursive: true });
      copyFileSync(join(scripts, 'installed-files.js'), join(bin, 'installed-files.js'));
      copyFileSync(script, join(bin, 'record-installed.mjs'));
      writeFileSync(join(dir, '.tropis/a.js'), 'aaa\n');

      const source = 'https://example.test/tropis.git';
      const r = spawnSync('node', [join(bin, 'record-installed.mjs'), 'v1.2.3', source], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
      expect(r.stderr).toBe('');

      const written = JSON.parse(readFileSync(join(dir, '.tropis/installed.json'), 'utf8'));
      expect(Object.keys(written)).toEqual(['version', 'source', 'files']);
      expect(written.source).toBe(source);
      expect(written.version).toBe('v1.2.3');
      expect(written.files).toEqual(recordOf(dir, 'v1.2.3').files);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
