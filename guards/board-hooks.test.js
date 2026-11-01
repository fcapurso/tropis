// Level: seam
/**
 * The backlog board keeps itself current through git hooks that the framework package's
 * install writes. These check the hooks do their one job in the git operations that
 * change the backlog (commit, checkout, merge, rebase, a linked worktree), that the
 * installer leaves a project's own hooks and core.hooksPath alone, that it stays out of
 * a repository it merely sits inside, and that the wiring (the package's prepare script,
 * the installed-scripts list, the self-check's --ignore-scripts) is in place. A hook
 * that quietly does nothing would leave a stale board that looks current.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..');
const scripts = join(src, 'scripts');

const HOOKS = ['post-commit', 'post-merge', 'post-checkout', 'post-rewrite'];
const HOOK = `#!/bin/sh
# tropis-backlog-board: written by .tropis/scripts/install-board-hooks.mjs at each npm --prefix .tropis install.
# Rebuilds the backlog board, docs/backlog-board/index.html, from the backlog as checked out. Never fails or prints.
[ -d .tropis/node_modules ] || exit 0
node .tropis/scripts/build-backlog-board.mjs >/dev/null 2>&1
exit 0
`;
const PROJECT_LINE =
  '[ -d .tropis/node_modules ] && node .tropis/scripts/build-backlog-board.mjs >/dev/null 2>&1 || true';

const entry = (id, status = 'idea') => `- id: ${id}
  title: Title of ${id}
  status: ${status}
  type: feature
  layer: product
  value: Do this.
  acceptanceCriteria: []
  modules: []
  refs: []
`;
const BANDS = `base:
  band: B
  verdict: Later.
  seen:
    status: idea
    blockers: []
`;

const emptyConfig = join(mkdtempSync(join(tmpdir(), 'board-hooks-config-')), 'empty');
writeFileSync(emptyConfig, '');
const env = { ...process.env, GIT_CONFIG_GLOBAL: emptyConfig, GIT_CONFIG_NOSYSTEM: '1' };

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, env, encoding: 'utf8' });
}
function git(cwd, ...args) {
  const r = run('git', args, cwd);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}
function link(dir) {
  symlinkSync(join(src, 'node_modules'), join(dir, '.tropis/node_modules'));
}
function fill(dir) {
  const fw = join(dir, '.tropis');
  mkdirSync(join(fw, 'scripts'), { recursive: true });
  mkdirSync(join(fw, 'templates'), { recursive: true });
  for (const f of ['build-backlog-board.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js', 'install-board-hooks.mjs']) {
    copyFileSync(join(scripts, f), join(fw, 'scripts', f));
  }
  copyFileSync(join(src, 'templates/backlog-board.html'), join(fw, 'templates/backlog-board.html'));
  writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
  link(dir);
  writeFileSync(join(dir, '.gitignore'), 'docs/backlog-board/index.html\n.tropis/node_modules\n');
  writeFileSync(join(dir, 'feature-catalog.yaml'), entry('base'));
  mkdirSync(join(dir, 'docs/backlog-board'), { recursive: true });
  writeFileSync(join(dir, 'docs/backlog-board/bands.yaml'), BANDS);
}

const made = [];
function parent() {
  const p = mkdtempSync(join(tmpdir(), 'board-hooks-'));
  made.push(p);
  return p;
}
function project({ install = true } = {}) {
  const dir = join(parent(), 'proj');
  mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'config', 'user.email', 'test@example.com');
  fill(dir);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'initial');
  const out = install ? installer(dir) : null;
  return { dir, out };
}
function installer(dir) {
  return run('node', ['scripts/install-board-hooks.mjs'], join(dir, '.tropis'));
}
function hooksDir(dir) {
  return join(dir, '.git/hooks');
}
function page(dir) {
  return readFileSync(join(dir, 'docs/backlog-board/index.html'), 'utf8');
}
function catalogCommit(dir, ...ids) {
  const file = join(dir, 'feature-catalog.yaml');
  writeFileSync(file, readFileSync(file, 'utf8') + ids.map((i) => entry(i)).join(''));
  git(dir, 'add', 'feature-catalog.yaml');
  git(dir, 'commit', '-q', '-m', `add ${ids.join()}`);
}

afterAll(() => {
  for (const p of made) rmSync(p, { recursive: true, force: true });
  rmSync(dirname(emptyConfig), { recursive: true, force: true });
});

describe('backlog board hooks', () => {
  it('install writes the four hooks, identical and executable, and builds the page', () => {
    const { dir, out } = project();
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Backlog board: rebuilds itself at each commit, merge, checkout and rebase.');
    for (const h of HOOKS) {
      expect(readFileSync(join(hooksDir(dir), h), 'utf8')).toBe(HOOK);
      expect(statSync(join(hooksDir(dir), h)).mode & 0o111).not.toBe(0);
    }
    expect(page(dir)).toContain('base');
  });

  it('a committed catalog change shows on the page and leaves the tree clean', () => {
    const { dir } = project();
    catalogCommit(dir, 'fresh-entry');
    expect(page(dir)).toContain('fresh-entry');
    expect(git(dir, 'status', '--porcelain')).toBe('');
  });

  it('checkout, merge and rebase each bring the page to the catalog they leave', () => {
    const { dir } = project();
    git(dir, 'checkout', '-q', '-b', 'side');
    catalogCommit(dir, 'side-entry');
    git(dir, 'checkout', '-q', 'main');
    expect(page(dir)).not.toContain('side-entry');
    git(dir, 'checkout', '-q', 'side');
    expect(page(dir)).toContain('side-entry');

    git(dir, 'checkout', '-q', 'main');
    git(dir, 'merge', '-q', '--no-ff', '-m', 'merge side', 'side');
    expect(page(dir)).toContain('side-entry');

    git(dir, 'checkout', '-q', '-b', 'topic', 'HEAD~1');
    writeFileSync(join(dir, 'note.txt'), 'x');
    git(dir, 'add', 'note.txt');
    git(dir, 'commit', '-q', '-m', 'note');
    expect(page(dir)).not.toContain('side-entry');
    git(dir, 'rebase', '-q', 'main');
    expect(page(dir)).toContain('side-entry');
  });

  it('a rebuild leaves the bands file byte-identical', () => {
    const { dir } = project();
    const before = readFileSync(join(dir, 'docs/backlog-board/bands.yaml'));
    catalogCommit(dir, 'another');
    expect(readFileSync(join(dir, 'docs/backlog-board/bands.yaml')).equals(before)).toBe(true);
  });

  it('every hook, run directly, exits 0 and prints nothing, with and without the tools installed', () => {
    const { dir } = project();
    for (const withTools of [true, false]) {
      if (!withTools) rmSync(join(dir, '.tropis/node_modules'));
      for (const h of HOOKS) {
        const r = run('sh', [join(hooksDir(dir), h)], dir);
        expect([h, r.status, r.stdout, r.stderr]).toEqual([h, 0, '', '']);
      }
    }
  });

  it('a hook of the project is left as it is, the others are written, and the line to add is printed', () => {
    const dir = join(parent(), 'proj');
    mkdirSync(dir);
    git(dir, 'init', '-q', '-b', 'main');
    fill(dir);
    mkdirSync(hooksDir(dir), { recursive: true });
    const own = '#!/bin/sh\necho mine\n';
    writeFileSync(join(hooksDir(dir), 'post-commit'), own);
    chmodSync(join(hooksDir(dir), 'post-commit'), 0o755);
    const out = installer(dir);
    expect(out.status).toBe(0);
    expect(readFileSync(join(hooksDir(dir), 'post-commit'), 'utf8')).toBe(own);
    for (const h of HOOKS.filter((x) => x !== 'post-commit')) {
      expect(readFileSync(join(hooksDir(dir), h), 'utf8')).toBe(HOOK);
    }
    expect(out.stdout).toContain('left your post-commit hook as it is');
    expect(out.stdout).toContain(PROJECT_LINE);
  });

  it('writes no hook where core.hooksPath is set, and prints the line to add', () => {
    const dir = join(parent(), 'proj');
    mkdirSync(dir);
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'config', 'core.hooksPath', 'my-hooks');
    fill(dir);
    mkdirSync(join(dir, 'my-hooks'));
    const out = installer(dir);
    expect(out.status).toBe(0);
    for (const h of HOOKS) {
      expect(existsSync(join(dir, 'my-hooks', h))).toBe(false);
      expect(existsSync(join(hooksDir(dir), h))).toBe(false);
    }
    expect(out.stdout).toContain('core.hooksPath is set');
    expect(out.stdout).toContain(PROJECT_LINE);
  });

  it('a second install changes nothing', () => {
    const { dir } = project();
    const before = HOOKS.map((h) => readFileSync(join(hooksDir(dir), h), 'utf8'));
    const again = installer(dir);
    expect(again.status).toBe(0);
    expect(HOOKS.map((h) => readFileSync(join(hooksDir(dir), h), 'utf8'))).toEqual(before);
  });

  it('a linked worktree uses the same hooks and rebuilds its own page', () => {
    const { dir } = project();
    const sibling = join(dirname(dir), 'linked');
    git(dir, 'worktree', 'add', '-q', sibling, '-b', 'wt');
    link(sibling);
    catalogCommit(sibling, 'in-worktree');
    expect(page(sibling)).toContain('in-worktree');
    expect(page(dir)).not.toContain('in-worktree');
  });

  it('a project folder inside a repository, not its top, gets no hook written there', () => {
    const outer = parent();
    git(outer, 'init', '-q', '-b', 'main');
    const dir = join(outer, 'sub');
    mkdirSync(dir);
    fill(dir);
    const out = installer(dir);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("is not the top of a git repository");
    for (const h of HOOKS) expect(existsSync(join(outer, '.git/hooks', h))).toBe(false);
  });

  it('the package, the installed-scripts list and the self-check carry the wiring', () => {
    const pkg = JSON.parse(readFileSync(join(src, 'templates/package.json'), 'utf8'));
    expect(pkg.scripts.prepare).toBe('node ./scripts/install-board-hooks.mjs');
    expect(readFileSync(join(scripts, 'installed-scripts.txt'), 'utf8').split('\n')).toContain('install-board-hooks.mjs');
    const line = readFileSync(join(scripts, 'check-blueprint.sh'), 'utf8')
      .split('\n').find((l) => l.includes('npm install --prefix "$TOOLS"'));
    expect(line).toContain('--ignore-scripts');
  });
});
