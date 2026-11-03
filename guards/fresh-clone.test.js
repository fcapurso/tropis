// Level: integration
/**
 * A fresh clone: the framework's scripts say what to install when their packages are
 * missing, import the yaml package only through one module, and the branch hook leaves no
 * Python cache behind in the hooks folder.
 *
 * The scripts run in a child node process from a copy under the operating system's
 * temporary directory, where no node_modules sits above them.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Set by the conformance run to a project-shaped tree; unset, the repository root.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../../..');
const scriptsDir = resolve(root, '.tropis/scripts');
const hooksDir = resolve(root, '.tropis/hooks');

const tmps = [];
afterAll(() => tmps.forEach((d) => rmSync(d, { recursive: true, force: true })));
const scratch = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  tmps.push(d);
  return d;
};

describe('a fresh clone', () => {
  test('a script without its packages says to install them', () => {
    const dir = scratch('fresh-clone-scripts-');
    const copy = join(dir, 'scripts');
    cpSync(scriptsDir, copy, { recursive: true });

    // The case proves nothing where a parent folder holds the package.
    const probe = spawnSync('node', ['--input-type=module', '-e', "await import('yaml')"], {
      cwd: copy, encoding: 'utf8',
    });
    expect(probe.status).not.toBe(0);

    for (const args of [['next.mjs'], ['sprint.mjs', 'status']]) {
      const r = spawnSync('node', [join(copy, ...args.slice(0, 1)), ...args.slice(1)], {
        cwd: dir, encoding: 'utf8',
      });
      expect(r.error).toBeUndefined();
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('npm --prefix .tropis ci');
      expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    }
  });

  test('no framework script imports yaml except through load-yaml', () => {
    const offenders = readdirSync(scriptsDir)
      .filter((f) => /\.(mjs|js)$/.test(f) && f !== 'load-yaml.mjs')
      .filter((f) => {
        const text = readFileSync(join(scriptsDir, f), 'utf8');
        return text.includes("from 'yaml'") || text.includes("import('yaml')");
      });
    expect(offenders).toEqual([]);
  });

  test('the branch hook leaves no cache behind', () => {
    const parent = scratch('fresh-clone-hook-');
    const hooks = join(parent, 'hooks');
    cpSync(hooksDir, hooks, { recursive: true, filter: (src) => !src.endsWith('__pycache__') });
    const repo = join(parent, 'main-checkout');
    mkdirSync(repo);
    const git = (...args) => {
      const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    };
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'probe@example.test');
    git('config', 'user.name', 'Probe');
    writeFileSync(join(repo, 'a.txt'), 'a\n');
    git('add', '.');
    git('commit', '-q', '-m', 'a');

    expect(existsSync(join(hooks, '__pycache__'))).toBe(false);
    const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git checkout -b x' } });
    const r = spawnSync('bash', [join(hooks, 'branch-in-worktree.sh')], {
      input: payload, cwd: repo, encoding: 'utf8',
    });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(2); // reached the module load: the branch was refused
    expect(existsSync(join(hooks, '__pycache__'))).toBe(false);
  });
});
