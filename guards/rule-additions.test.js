/**
 * A project's additions to a shipped rule, on a project the setup actually created.
 *
 * Not installed: a set-up project has no additions file, and rules-generated.test.js
 * already runs the check mode there. This runs the generator against a scratch
 * repository and asserts what an additions file does to the two files agents read.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADDITIONS_SEPARATOR } from '../scripts/rule-areas.js';

const blueprint = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const setup = join(blueprint, 'scripts/set-up-project.sh');

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || args.join(' '));
  return r.stdout;
}

/** A repository with src/app.js committed, alone in a fresh temporary folder. */
function repository() {
  const parent = mkdtempSync(join(tmpdir(), 'set-up-'));
  const dir = join(parent, 'example-project');
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src/app.js'), 'console.log(1);\n');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'init');
  return { parent, dir };
}

const runSetup = (dir) => spawnSync('bash', [setup, dir], { encoding: 'utf8' });

function generate(dir, ...args) {
  return spawnSync('node', [join(dir, '.tropis/scripts/generate-rules.mjs'), ...args], { encoding: 'utf8' });
}

/** The bytes of every file under the two generated folders, keyed by relative path. */
function generatedBytes(dir) {
  const out = {};
  for (const folder of ['.claude/rules', '.cursor/rules']) {
    for (const name of readdirSync(join(dir, folder)).sort()) {
      out[`${folder}/${name}`] = readFileSync(join(dir, folder, name));
    }
  }
  return out;
}

function containsInOrder(text, parts) {
  let from = 0;
  for (const part of parts) {
    const at = text.indexOf(part, from);
    if (at < 0) return false;
    from = at + part.length;
  }
  return true;
}

describe('rule additions on a set-up project', () => {
  it('joins additions after the shipped text in both files, and writes no second file', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const namesBefore = {
        claude: readdirSync(join(dir, '.claude/rules')).sort(),
        cursor: readdirSync(join(dir, '.cursor/rules')).sort(),
      };
      const shipped = readFileSync(join(dir, '.tropis/rules/tests.md'), 'utf8').trimEnd();
      mkdirSync(join(dir, '.claude/rule-additions'));
      writeFileSync(join(dir, '.claude/rule-additions/tests.md'), 'Ours: marker A.\n');
      expect(generate(dir).status).toBe(0);
      for (const path of ['.claude/rules/tests.md', '.cursor/rules/tests.mdc']) {
        const text = readFileSync(join(dir, path), 'utf8');
        expect(containsInOrder(text, [shipped, ADDITIONS_SEPARATOR, 'Ours: marker A.'])).toBe(true);
      }
      expect(readdirSync(join(dir, '.claude/rules')).sort()).toEqual(namesBefore.claude);
      expect(readdirSync(join(dir, '.cursor/rules')).sort()).toEqual(namesBefore.cursor);
      expect(generate(dir, '--check').status).toBe(0);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('writes the same bytes when the additions file is empty', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const before = generatedBytes(dir);
      mkdirSync(join(dir, '.claude/rule-additions'));
      writeFileSync(join(dir, '.claude/rule-additions/tests.md'), '');
      expect(generate(dir).status).toBe(0);
      expect(generatedBytes(dir)).toEqual(before);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reports both files stale when additions change, and again when they are removed', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const setupBytes = generatedBytes(dir);
      const additions = join(dir, '.claude/rule-additions/tests.md');
      mkdirSync(join(dir, '.claude/rule-additions'));
      writeFileSync(additions, 'Ours: marker A.\n');
      expect(generate(dir).status).toBe(0);

      writeFileSync(additions, 'Ours: marker B.\n');
      const changed = generate(dir, '--check');
      expect(changed.status).toBe(1);
      expect(changed.stderr).toContain('.claude/rules/tests.md: stale');
      expect(changed.stderr).toContain('.cursor/rules/tests.mdc: stale');
      expect(generate(dir).status).toBe(0);
      expect(generate(dir, '--check').status).toBe(0);

      rmSync(additions);
      const removed = generate(dir, '--check');
      expect(removed.status).toBe(1);
      expect(removed.stderr).toContain('.claude/rules/tests.md: stale');
      expect(removed.stderr).toContain('.cursor/rules/tests.mdc: stale');
      expect(generate(dir).status).toBe(0);
      expect(generatedBytes(dir)).toEqual(setupBytes);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses an unknown name, a header and an own rule, and writes nothing', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const additionsDir = join(dir, '.claude/rule-additions');
      mkdirSync(additionsDir);
      const cases = [
        { file: 'pricing.md', text: 'Ours.\n', message: 'no shipped rule is named "pricing"' },
        { file: 'tests.md', text: '---\npaths: ["x/**"]\n---\nOurs.\n', message: 'carries no header' },
        { file: 'app.md', text: 'Ours.\n', message: '.claude/rules/app.md itself', own: true },
      ];
      for (const c of cases) {
        if (c.own) {
          writeFileSync(join(dir, '.claude/rules/app.md'), '---\npaths: ["src/app.js"]\n---\nOwn.\n');
        }
        writeFileSync(join(additionsDir, c.file), c.text);
        const before = generatedBytes(dir);
        const r = generate(dir);
        expect(r.status).toBe(1);
        expect(r.stderr.startsWith('rules: nothing written.')).toBe(true);
        expect(r.stderr).toContain(c.message);
        expect(generatedBytes(dir)).toEqual(before);
        rmSync(join(additionsDir, c.file));
      }
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('ignores a file that is not markdown', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const before = generatedBytes(dir);
      mkdirSync(join(dir, '.claude/rule-additions'));
      writeFileSync(join(dir, '.claude/rule-additions/README'), 'Not a rule.\n');
      writeFileSync(join(dir, '.claude/rule-additions/tests.md~'), 'Ours: backup.\n');
      expect(generate(dir).status).toBe(0);
      expect(generatedBytes(dir)).toEqual(before);
      expect(generate(dir, '--check').status).toBe(0);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('keeps the additions file when the shipped text is replaced', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const additions = join(dir, '.claude/rule-additions/tests.md');
      mkdirSync(join(dir, '.claude/rule-additions'));
      writeFileSync(additions, 'Ours: marker A.\n');
      expect(generate(dir).status).toBe(0);
      const additionBytes = readFileSync(additions);
      const shippedPath = join(dir, '.tropis/rules/tests.md');
      writeFileSync(shippedPath, `${readFileSync(shippedPath, 'utf8').trimEnd()}\nMarker new shipped line.\n`);
      expect(generate(dir).status).toBe(0);
      expect(readFileSync(additions)).toEqual(additionBytes);
      const text = readFileSync(join(dir, '.claude/rules/tests.md'), 'utf8');
      expect(containsInOrder(text, ['Marker new shipped line.', ADDITIONS_SEPARATOR, 'Ours: marker A.'])).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('writes no additions folder', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      expect(existsSync(join(dir, '.claude/rule-additions'))).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
