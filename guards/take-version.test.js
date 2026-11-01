// Level: unit
/**
 * `scripts/take-version.mjs` brings a set-up project to the release tag of a Tropis checkout.
 *
 * Each case builds a scratch Tropis repository from this blueprint's own source folders,
 * tags its first commit `v0.2.0`, sets a scratch project up from that tag and commits it,
 * then commits a later release in the scratch Tropis, checks the tag out and runs the
 * command on the project. The blueprint's own repository is never touched: during the
 * self-check this folder is an exported stage with no `.git`.
 *
 * Not installed into projects: only a Tropis checkout has tags to take.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync,
  statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, recordOf, recordProblems, shippedFiles } from '../scripts/installed-files.js';
import { appendMissingLines } from '../scripts/take-version.mjs';

const blueprint = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FOLDERS = ['rules', 'framework', 'commands', 'scripts', 'guards', 'templates'];
const SLOW = 120000;
// A spawned command that has not returned by then is killed, so a hang fails the test that
// started it by name instead of blocking the worker until the whole run is stopped.
const CHILD = SLOW - 20000;

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || args.join(' '));
  return r.stdout;
}

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
const write = (root, rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const edit = (root, rel, fn) => write(root, rel, fn(read(root, rel)));

/** Every file under `dir` outside `.git`, by relative path. */
function snapshot(dir) {
  const files = {};
  for (const rel of readdirSync(dir, { recursive: true })) {
    if (rel === '.git' || rel.startsWith('.git/') || rel.startsWith('.git\\')) continue;
    if (statSync(join(dir, rel)).isFile()) files[rel] = readFileSync(join(dir, rel));
  }
  return files;
}

const BEGIN_TO_END = /(<!-- project-owned: begin[^\n]*\n)[\s\S]*?(<!-- project-owned: end -->)/;
const fillBlock = (text, inner) => text.replace(BEGIN_TO_END, (_, begin, end) => `${begin}${inner}\n${end}`);

/**
 * A scratch Tropis repository tagged `v0.2.0` and a project set up from it and committed.
 * `v020` adds files to the Tropis before that tag; `name` is the display name setup is given.
 */
function world({ v020 = {}, name } = {}) {
  const parent = mkdtempSync(join(tmpdir(), 'tv-test-'));
  const tropis = join(parent, 'tropis');
  mkdirSync(tropis);
  // The command's own temporary folder, so another run's scratch folders are not this run's leftovers.
  const tmp = join(parent, 'tmp');
  mkdirSync(tmp);
  for (const folder of SOURCE_FOLDERS) {
    cpSync(join(blueprint, folder), join(tropis, folder), {
      recursive: true,
      filter: (src) => !/[\\/](node_modules|\.self-check)([\\/]|$)/.test(src),
    });
  }
  for (const [rel, text] of Object.entries(v020)) write(tropis, rel, text);
  git(tropis, 'init', '-q', '-b', 'main');
  git(tropis, 'add', '-A');
  git(tropis, 'commit', '-qm', 'v0.2.0');
  git(tropis, 'tag', 'v0.2.0');

  const project = join(parent, 'example-project');
  mkdirSync(project);
  git(project, 'init', '-q', '-b', 'main');
  const named = name === undefined ? [] : [name];
  const setup = spawnSync('bash', [join(tropis, 'scripts/set-up-project.sh'), project, ...named], { encoding: 'utf8' });
  if (setup.status !== 0) throw new Error(setup.stderr);
  git(project, 'add', '-A');
  git(project, 'commit', '-qm', 'set up');

  return {
    parent,
    tropis,
    project,
    tmp,
    /** Commit a change to the scratch Tropis and tag it. */
    release(tag, change) {
      git(tropis, 'checkout', '-q', 'main');
      change(tropis);
      git(tropis, 'add', '-A');
      git(tropis, 'commit', '-qm', tag);
      git(tropis, 'tag', tag);
    },
    /** Commit the project's current state. */
    commit(message = 'project change') {
      git(project, 'add', '-A');
      git(project, 'commit', '-qm', message);
    },
    /** Check `ref` out in the scratch Tropis and run the command on the project. */
    take(ref, ...flags) {
      return this.takeWith({}, ref, ...flags);
    },
    /** `take` with extra environment and, optionally, a shorter limit for the child. */
    takeWith({ env = {}, timeout = CHILD }, ref, ...flags) {
      git(tropis, 'checkout', '-q', ref);
      return spawnSync('node', [join(tropis, 'scripts/take-version.mjs'), project, ...flags], {
        encoding: 'utf8',
        env: { ...process.env, TMPDIR: tmp, ...env },
        timeout,
        killSignal: 'SIGKILL',
      });
    },
    /** A file of the scratch Tropis at a tag. */
    at(tag, rel) {
      return git(tropis, 'show', `${tag}:${rel}`);
    },
    clean() {
      rmSync(parent, { recursive: true, force: true });
    },
  };
}

/** Run `fn(world)` and always remove the scratch folders. */
function inWorld(options, fn) {
  const w = world(options);
  try {
    return fn(w);
  } finally {
    w.clean();
  }
}

const bumpNext = (root) => edit(root, 'commands/next.md', (t) => `${t}\nA line from the next version.\n`);
const recordOfProject = (project) => JSON.parse(read(project, '.tropis/installed.json'));
const takeVersionDirs = (dir) => readdirSync(dir).filter((f) => f.startsWith('take-version-'));

/** Add a `scripts.extra` to the release's package template, asserting the edit changed it. */
const addExtraScript = (root) => edit(root, 'templates/package.json', (t) => {
  const pkg = JSON.parse(t);
  pkg.scripts.extra = 'echo extra';
  const changed = `${JSON.stringify(pkg, null, 2)}\n`;
  expect(changed).not.toBe(t);
  return changed;
});

/** Make a git worktree of the project in `example-project-update` and run the command on it at `ref`. */
function takeInWorktree(w, ref, ...flags) {
  const worktree = join(w.parent, 'example-project-update');
  git(w.project, 'worktree', 'add', '-q', worktree, '-b', 'update');
  git(w.tropis, 'checkout', '-q', ref);
  const r = spawnSync('node', [join(w.tropis, 'scripts/take-version.mjs'), worktree, ...flags], {
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: w.tmp },
    timeout: CHILD,
    killSignal: 'SIGKILL',
  });
  return { r, worktree };
}

const packageOf = (root) => JSON.parse(read(root, '.tropis/package.json'));

const PROJECT_FILES = [
  'CLAUDE.md', 'AGENTS.md', 'feature-catalog.yaml', 'docs/verification-log.md', '.tropis/README.md',
];

describe('take-version.mjs', () => {
  it('takes a version', () => inWorld({}, (w) => {
    w.release('v0.2.1', (root) => {
      bumpNext(root);
      write(root, 'framework/new-doc.md', '# A new document\n');
    });
    const before = snapshot(w.project);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);

    expect(read(w.project, '.claude/commands/next.md')).toBe(w.at('v0.2.1', 'commands/next.md'));
    expect(read(w.project, '.claude/framework/new-doc.md')).toBe(w.at('v0.2.1', 'framework/new-doc.md'));
    const record = recordOfProject(w.project);
    const source = realpathSync(w.tropis);
    expect(record.version).toBe('v0.2.1');
    expect(record.source).toBe(source);
    expect(record).toEqual(recordOf(w.project, 'v0.2.1', source));
    expect(record.files['.claude/framework/new-doc.md']).toBe(fingerprint('# A new document\n'));
    expect(recordProblems(w.project)).toEqual([]);
    for (const rel of PROJECT_FILES) expect(read(w.project, rel)).toBe(before[rel].toString());
    expect(git(w.project, 'log', '--oneline').trim().split('\n')).toHaveLength(1);
    expect(r.stdout).toContain('npm --prefix .tropis test');
  }), SLOW);

  it('records the Tropis checkout origin when the checkout has one', () => inWorld({}, (w) => {
    git(w.tropis, 'remote', 'add', 'origin', 'https://example.test/tropis.git');
    w.release('v0.2.1', (root) => bumpNext(root));
    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
    expect(recordOfProject(w.project).source).toBe('https://example.test/tropis.git');
  }), SLOW);

  it("leaves the project's model picks alone, and they are not a fingerprinted file", () => inWorld({}, (w) => {
    const picks = '# Model picks\n\n**Last verified: 2026-01-01.**\n\n| Tier | Models |\n|---|---|\n| **Small** | Example Model |\n';
    write(w.project, 'docs/model-picks.md', picks);
    // Writing picks, as /refresh-model-tiers does, leaves the installed-files check green.
    expect(recordProblems(w.project)).toEqual([]);
    expect(shippedFiles(w.project)).not.toContain('docs/model-picks.md');
    w.commit('refresh the model picks');
    w.release('v0.2.1', (root) => {
      bumpNext(root);
      edit(root, 'framework/model-tiers.md', (t) => `${t}\nA line from the next version.\n`);
    });

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(w.project, 'docs/model-picks.md')).toBe(picks);
    expect(recordProblems(w.project)).toEqual([]);
  }), SLOW);

  it('refuses a dirty tree, changing nothing', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    write(w.project, 'stray.txt', 'not committed\n');
    const before = snapshot(w.project);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toBe(
      `take-version: ${w.project} has uncommitted changes. Commit or stash them first; git is this command's backup.\n`,
    );
    expect(r.stdout).toBe('');
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('writes a .new beside a file the project changed and the new version changed too', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    edit(w.project, '.claude/commands/next.md', (t) => `${t}\nOur own line.\n`);
    w.commit();
    const mine = read(w.project, '.claude/commands/next.md');

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(read(w.project, '.claude/commands/next.md')).toBe(mine);
    expect(read(w.project, '.claude/commands/next.md.new')).toBe(w.at('v0.2.1', 'commands/next.md'));
    expect(r.stdout).toContain('.claude/commands/next.md.new');
    expect(recordProblems(w.project)).toHaveLength(1);
    expect(recordProblems(w.project)[0]).toMatch(/^\.claude\/commands\/next\.md was changed after it was installed/);
  }), SLOW);

  it('leaves a changed file alone when the new version did not change it', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    edit(w.project, '.claude/framework/dispatch.md', (t) => `${t}\nOur own line.\n`);
    w.commit();
    const mine = read(w.project, '.claude/framework/dispatch.md');

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(read(w.project, '.claude/framework/dispatch.md')).toBe(mine);
    expect(existsSync(join(w.project, '.claude/framework/dispatch.md.new'))).toBe(false);
    expect(r.stdout).not.toContain('dispatch.md');
  }), SLOW);

  it("never touches a project's own README skeleton or settings", () => inWorld({}, (w) => {
    const skeleton = '## Ours\n- **Job:** ours.\n';
    const settings = 'level: suggests\nrefreshedAt: ""\n';
    write(w.project, 'docs/readme/skeleton.md', skeleton);
    write(w.project, 'docs/readme/readme.yaml', settings);
    w.commit();
    w.release('v0.2.1', (root) => edit(root, 'templates/readme-skeleton.md', (t) => `${t}\nA line from the next version.\n`));

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(read(w.project, 'docs/readme/skeleton.md')).toBe(skeleton);
    expect(read(w.project, 'docs/readme/readme.yaml')).toBe(settings);
    expect(existsSync(join(w.project, 'docs/readme/skeleton.md.new'))).toBe(false);
    expect(existsSync(join(w.project, 'docs/readme/readme.yaml.new'))).toBe(false);
    // The take did replace the default skeleton, so the project's copy was left alone by
    // choice, not because nothing changed.
    expect(read(w.project, '.tropis/templates/readme-skeleton.md')).toContain('A line from the next version.');
  }), SLOW);

  it('moves .claude/project.json into .tropis/project.json, keeping the name', () => inWorld({ name: 'Example Project' }, (w) => {
    // The hooks read the settings from .tropis/ now; an update that left the old file
    // behind would silence the public-exposure hook with no sign it had.
    write(w.project, '.claude/project.json', '{ "public": true, "ungated": "no gate on this host" }\n');
    w.commit('declare the project public');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    const settings = JSON.parse(read(w.project, '.tropis/project.json'));
    expect(settings).toEqual({ name: 'Example Project', public: true, ungated: 'no gate on this host' });
    expect(Object.keys(settings)[0]).toBe('name');
    expect(existsSync(join(w.project, '.claude/project.json'))).toBe(false);
    expect(existsSync(join(w.project, '.tropis/project.json.new'))).toBe(false);
    expect(r.stdout).toContain('Moved:');
    expect(r.stdout).toContain('.claude/project.json → .tropis/project.json');
    expect(Object.keys(recordOfProject(w.project).files)).not.toContain('.tropis/project.json');
  }), SLOW);

  it('moves .claude/project.json when setup wrote no name', () => inWorld({}, (w) => {
    write(w.project, '.claude/project.json', '{ "public": true }\n');
    w.commit('declare the project public');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(JSON.parse(read(w.project, '.tropis/project.json'))).toEqual({ public: true });
    expect(existsSync(join(w.project, '.claude/project.json'))).toBe(false);
  }), SLOW);

  it('refuses when the two settings files disagree, and changes nothing', () => inWorld({ name: 'Example Project' }, (w) => {
    write(w.project, '.claude/project.json', '{ "name": "Other" }\n');
    w.commit('an old name');
    w.release('v0.2.1', bumpNext);
    const before = snapshot(w.project);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('.claude/project.json and');
    expect(r.stderr).toContain('.tropis/project.json both set "name", differently.');
    expect(git(w.project, 'status', '--porcelain')).toBe('');
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('refuses a settings file that is not a JSON object', () => inWorld({}, (w) => {
    write(w.project, '.claude/project.json', '[1]\n');
    w.commit('a list');
    w.release('v0.2.1', bumpNext);
    const before = snapshot(w.project);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('.claude/project.json is not a JSON object.');
    expect(git(w.project, 'status', '--porcelain')).toBe('');
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('moves .claude/worktree-setup.txt to .tropis/', () => inWorld({}, (w) => {
    const setup = 'npm ci\nnpm --prefix .tropis ci\n';
    write(w.project, '.claude/worktree-setup.txt', setup);
    w.commit('a worktree setup');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(read(w.project, '.tropis/worktree-setup.txt')).toBe(setup);
    expect(existsSync(join(w.project, '.claude/worktree-setup.txt'))).toBe(false);
    expect(r.stdout).toContain('.claude/worktree-setup.txt → .tropis/worktree-setup.txt');
    expect(Object.keys(recordOfProject(w.project).files)).not.toContain('.tropis/worktree-setup.txt');

    w.commit('taken');
    w.release('v0.2.2', (root) => edit(root, 'commands/next.md', (t) => `${t}\nAnother line.\n`));
    const again = w.take('v0.2.2');
    expect(again.status).toBe(0);
    expect(read(w.project, '.tropis/worktree-setup.txt')).toBe(setup);
  }), SLOW);

  it('refuses when both worktree setup files exist and differ', () => inWorld({}, (w) => {
    write(w.project, '.claude/worktree-setup.txt', 'npm ci\n');
    write(w.project, '.tropis/worktree-setup.txt', 'npm run other\n');
    w.commit('two setups');
    w.release('v0.2.1', bumpNext);
    const before = snapshot(w.project);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('.claude/worktree-setup.txt and');
    expect(r.stderr).toContain('.tropis/worktree-setup.txt both exist, with different commands.');
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('carries a filled project-owned block into the new text', () => inWorld({}, (w) => {
    const filled = '- Run from: the root of this repository.';
    w.release('v0.2.1', (root) => edit(root, 'commands/release.md', (t) => {
      const next = t.replace('## Stage 1 — Pre-flight', '## Stage 1 — Preflight');
      expect(next).not.toBe(t);
      return next;
    }));
    edit(w.project, '.claude/commands/release.md', (t) => fillBlock(t, filled));
    w.commit();

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(existsSync(join(w.project, '.claude/commands/release.md.new'))).toBe(false);
    const result = read(w.project, '.claude/commands/release.md');
    expect(result).toBe(fillBlock(w.at('v0.2.1', 'commands/release.md'), filled));
    expect(result).toContain('## Stage 1 — Preflight');
    expect(result).toContain(filled);
  }), SLOW);

  it('removes a file no longer shipped when unchanged, keeps it when changed', () => inWorld({
    v020: { 'framework/gone-a.md': '# Gone A\n', 'framework/gone-b.md': '# Gone B\n' },
  }, (w) => {
    w.release('v0.2.1', (root) => {
      rmSync(join(root, 'framework/gone-a.md'));
      rmSync(join(root, 'framework/gone-b.md'));
    });
    edit(w.project, '.claude/framework/gone-b.md', (t) => `${t}Our own line.\n`);
    w.commit();
    expect(existsSync(join(w.project, '.claude/framework/gone-a.md'))).toBe(true);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(existsSync(join(w.project, '.claude/framework/gone-a.md'))).toBe(false);
    expect(read(w.project, '.claude/framework/gone-b.md')).toBe('# Gone B\nOur own line.\n');
    expect(r.stdout).toContain('.claude/framework/gone-b.md — no longer shipped, kept because you changed it');
    expect(r.stdout).not.toMatch(/gone-a\.md — no longer shipped/);
    expect(shippedFiles(w.project)).not.toContain('.claude/framework/gone-a.md');
    expect(recordOfProject(w.project).files).not.toHaveProperty(['.claude/framework/gone-b.md']);
  }), SLOW);

  it('does not restore a file the project deleted', () => inWorld({}, (w) => {
    w.release('v0.2.1', (root) => edit(root, 'commands/idea.md', (t) => `${t}\nA line from the next version.\n`));
    rmSync(join(w.project, '.claude/commands/idea.md'));
    w.commit();

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(existsSync(join(w.project, '.claude/commands/idea.md'))).toBe(false);
    expect(existsSync(join(w.project, '.claude/commands/idea.md.new'))).toBe(false);
    expect(r.stdout).toContain('.claude/commands/idea.md — removed by the project, not restored');
  }), SLOW);

  it('names a file the project deleted even when the new version left it unchanged', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    rmSync(join(w.project, '.claude/commands/idea.md'));
    w.commit();

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    expect(existsSync(join(w.project, '.claude/commands/idea.md'))).toBe(false);
    expect(r.stdout).toContain('.claude/commands/idea.md — removed by the project, not restored');
  }), SLOW);

  it('adds the pipeline workflows to a project whose record never listed them', () => inWorld({}, (w) => {
    const paths = [
      '.github/workflows/tropis-framework-checks.yml',
      '.github/workflows/tropis-pipeline.yml',
    ];
    for (const rel of paths) rmSync(join(w.project, rel));
    const record = JSON.parse(read(w.project, '.tropis/installed.json'));
    for (const rel of paths) delete record.files[rel];
    write(w.project, '.tropis/installed.json', `${JSON.stringify(record, null, 2)}\n`);
    w.commit('record from before the pipeline workflows shipped');
    w.release('v0.2.1', (root) => edit(root, 'templates/github/tropis-pipeline.yml', (t) => `${t}\n# release\n`));

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(
      /Added:\n {2}\.github\/workflows\/tropis-framework-checks\.yml\n {2}\.github\/workflows\/tropis-pipeline\.yml\n/,
    );
    for (const rel of paths) expect(existsSync(join(w.project, rel))).toBe(true);
  }), SLOW);

  it('with --from, writes a shipped file the project never had, even when the new version left it unchanged', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    rmSync(join(w.project, '.claude/commands/idea.md'));
    rmSync(join(w.project, '.tropis/installed.json'));
    w.commit('never had idea.md, and no record');

    const r = w.take('v0.2.1', '--from', 'v0.2.0');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(w.project, '.claude/commands/idea.md')).toBe(w.at('v0.2.1', 'commands/idea.md'));
    expect(r.stdout).toMatch(/Added:\n(?: {2}.*\n)* {2}\.claude\/commands\/idea\.md\n/);
    expect(r.stdout).not.toContain('idea.md — removed by the project');
  }), SLOW);

  it('merges settings.json: the project keeps its keys and hooks, the shipped hooks follow', () => inWorld({}, (w) => {
    const own = { type: 'command', command: 'bash scripts/our-bash-guard.sh' };
    const readGroup = { matcher: 'Read', hooks: [{ type: 'command', command: 'bash scripts/our-read-guard.sh' }] };
    const settings = JSON.parse(read(w.project, '.claude/settings.json'));
    delete settings._comment;
    settings.permissions = { deny: ['Read(.env)'] };
    const bash = settings.hooks.PreToolUse.find((g) => g.matcher === 'Bash');
    bash.hooks.push(own);
    settings.hooks.PreToolUse.push(readGroup);
    write(w.project, '.claude/settings.json', `${JSON.stringify(settings, null, 2)}\n`);
    w.commit();

    w.release('v0.2.1', (root) => edit(root, 'templates/settings.json', (t) => {
      const next = t.replace('capture-at-merge.sh"', 'capture-at-merge.sh --v021"');
      expect(next).not.toBe(t);
      return next;
    }));

    const r = w.take('v0.2.1');
    expect(r.status).toBe(0);
    const after = JSON.parse(read(w.project, '.claude/settings.json'));
    expect(after.permissions).toEqual({ deny: ['Read(.env)'] });
    expect(after).not.toHaveProperty('_comment');
    const groups = after.hooks.PreToolUse;
    expect(groups.filter((g) => g.matcher === 'Read')).toEqual([readGroup]);
    const afterBash = groups.filter((g) => g.matcher === 'Bash');
    expect(afterBash).toHaveLength(1);
    expect(afterBash[0].hooks.map((h) => h.command)).toEqual([
      'bash scripts/our-bash-guard.sh',
      'bash .tropis/hooks/capture-at-merge.sh --v021',
      'bash .tropis/hooks/framework-commit-check.sh',
      'bash .tropis/hooks/branch-in-worktree.sh',
      'bash .tropis/hooks/public-exposure-check.sh',
    ]);
    expect(afterBash[0].hooks[1].if).toBe('Bash(gh pr merge *)');
    expect(groups.map((g) => g.matcher).sort()).toEqual(['Bash', 'Edit', 'Read', 'Write']);
    expect(r.stdout).not.toContain('settings.json.new');
    expect(existsSync(join(w.project, '.claude/settings.json.new'))).toBe(false);
  }), SLOW);

  it('adds new rule areas and ignore lines, keeping the project values', () => inWorld({}, (w) => {
    const areasPath = '.claude/rule-areas.json';
    const areas = JSON.parse(read(w.project, areasPath));
    areas.catalogs = ['feature-catalog.yaml', 'our-catalog.yaml'];
    write(w.project, areasPath, `${JSON.stringify(areas, null, 2)}\n`);
    w.commit();

    w.release('v0.2.1', (root) => {
      write(root, 'rules/extra.md', '# An extra rule\n<!-- layer: framework -->\n\n- Be extra.\n');
      edit(root, 'templates/rule-areas.json', (t) => {
        const next = t.replace('"catalogs"', '"extra": ["extra/**"],\n  "catalogs"');
        expect(next).not.toBe(t);
        return next;
      });
      edit(root, 'scripts/set-up-project.sh', (t) => {
        const line = "append_once .gitignore '.claude/settings.local.json'";
        const next = t.replace(line, `${line}\nappend_once .gitignore '.tropis/extra-output/'`);
        expect(next).not.toBe(t);
        return next;
      });
    });

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(JSON.parse(read(w.project, areasPath))).toEqual({ ...areas, extra: ['extra/**'] });
    expect(read(w.project, areasPath)).toContain('"extra": ["extra/**"]');
    expect(existsSync(join(w.project, '.claude/rules/extra.md'))).toBe(true);
    expect(existsSync(join(w.project, '.cursor/rules/extra.mdc'))).toBe(true);
    const ignore = read(w.project, '.gitignore').split('\n');
    expect(ignore.filter((l) => l === '.tropis/extra-output/')).toHaveLength(1);
    expect(ignore).toContain('.tropis/node_modules/');
    expect(r.stdout).toContain('extra');
  }), SLOW);

  it('adds no ignore or export-ignore line the project has in the other form', () => inWorld({}, (w) => {
    edit(w.project, '.gitattributes', (t) => {
      const next = t.replace(/^\/(\S+ export-ignore)$/gm, '$1');
      expect(next).not.toBe(t);
      return next;
    });
    edit(w.project, '.gitignore', (t) => {
      const next = t.replace(/^\.tropis\/node_modules\/$/m, '/.tropis/node_modules/');
      expect(next).not.toBe(t);
      return next;
    });
    w.commit();
    const attributes = read(w.project, '.gitattributes');
    const ignore = read(w.project, '.gitignore');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(w.project, '.gitattributes')).toBe(attributes);
    expect(read(w.project, '.gitignore')).toBe(ignore);
  }), SLOW);

  it('adds no export-ignore line for a path the project keeps', () => inWorld({}, (w) => {
    edit(w.project, '.gitattributes', (t) => {
      const next = t.replace('/docs/readme/ export-ignore\n', '');
      expect(next).not.toBe(t);
      return `${next}docs/readme/ -export-ignore\n`;
    });
    w.commit();
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    const lines = read(w.project, '.gitattributes').split('\n').filter(Boolean);
    expect(lines).not.toContain('/docs/readme/ export-ignore');
    expect(lines).not.toContain('docs/readme/ export-ignore');
    expect(lines.at(-1)).toBe('docs/readme/ -export-ignore');
  }), SLOW);

  it('adds a new export-ignore line anchored', () => inWorld({}, (w) => {
    const before = read(w.project, '.gitattributes');
    w.release('v0.2.1', (root) => {
      bumpNext(root);
      edit(root, 'scripts/set-up-project.sh', (t) => {
        const next = t.replace('docs/BLUEPRINT-UPSTREAM.md;', 'docs/BLUEPRINT-UPSTREAM.md docs/extra/;');
        expect(next).not.toBe(t);
        return next;
      });
    });

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(w.project, '.gitattributes')).toBe(`${before}/docs/extra/ export-ignore\n`);
  }), SLOW);

  it("this repository's own ignore files gain nothing from the lines setup writes", () => {
    const parent = mkdtempSync(join(tmpdir(), 'tv-own-'));
    try {
      const project = join(parent, 'example-project');
      mkdirSync(project);
      git(project, 'init', '-q', '-b', 'main');
      const setup = spawnSync('bash', [join(blueprint, 'scripts/set-up-project.sh'), project], { encoding: 'utf8' });
      expect(setup.status).toBe(0);
      for (const file of ['.gitignore', '.gitattributes']) {
        const own = read(blueprint, file);
        expect(appendMissingLines(own, read(project, file), { attributes: file === '.gitattributes' }))
          .toBe(own);
      }
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }, SLOW);

  it('the operator guide says how to keep a framework path in exported copies', () => {
    expect(read(blueprint, 'templates/README.md').replace(/\s+/g, ' ')).toContain(
      'add a line such as `/docs/readme/ -export-ignore` to `.gitattributes`, and no update excludes it again',
    );
  });

  it('needs --accept-breaking for a breaking release', () => inWorld({}, (w) => {
    w.release('v0.3.0', bumpNext);
    const before = snapshot(w.project);

    const refused = w.take('v0.3.0');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toBe(
      'take-version: v0.3.0 is a breaking release for a project on v0.2.0. Read its section in RELEASES.md, then run again with --accept-breaking.\n',
    );
    expect(snapshot(w.project)).toEqual(before);

    const taken = w.take('v0.3.0', '--accept-breaking');
    expect(taken.stderr).toBe('');
    expect(taken.status).toBe(0);
    expect(recordOfProject(w.project).version).toBe('v0.3.0');
    expect(read(w.project, '.claude/commands/next.md')).toBe(w.at('v0.3.0', 'commands/next.md'));
  }), SLOW);

  it('refuses a version that is not newer than the one held', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    expect(w.take('v0.2.1').status).toBe(0);
    w.commit('took v0.2.1');
    const before = snapshot(w.project);

    const r = w.take('v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toBe(`take-version: ${w.project} already holds v0.2.1; v0.2.1 is not newer.\n`);
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('needs --from when there is no record', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    edit(w.project, '.claude/commands/next.md', (t) => `${t}\nOur own line.\n`);
    w.commit();
    const mine = read(w.project, '.claude/commands/next.md');
    rmSync(join(w.project, '.tropis/installed.json'));
    w.commit('delete the record');
    const before = snapshot(w.project);

    const refused = w.take('v0.2.1');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toBe(
      `take-version: ${w.project} has no .tropis/installed.json. Say which version it holds: --from vX.Y.Z.\n`,
    );
    expect(snapshot(w.project)).toEqual(before);

    const r = w.take('v0.2.1', '--from', 'v0.2.0');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(w.project, '.claude/commands/next.md')).toBe(mine);
    expect(read(w.project, '.claude/commands/next.md.new')).toBe(w.at('v0.2.1', 'commands/next.md'));
    expect(r.stdout).toContain('.claude/commands/next.md.new');
    expect(recordOfProject(w.project).version).toBe('v0.2.1');
  }), SLOW);

  it('reads a describe string as later than its numbers and earlier than the next release', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    const short = git(w.tropis, 'rev-parse', '--short', 'v0.2.0').trim();
    const held = `v0.2.0-3-g${short}`;
    const record = recordOfProject(w.project);
    write(w.project, '.tropis/installed.json', `${JSON.stringify({ ...record, version: held }, null, 2)}\n`);
    w.commit('record a describe string');
    const before = snapshot(w.project);

    const refused = w.take('v0.2.0');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toBe(`take-version: ${w.project} already holds ${held}; v0.2.0 is not newer.\n`);
    expect(snapshot(w.project)).toEqual(before);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(recordOfProject(w.project).version).toBe('v0.2.1');
  }), SLOW);

  it('refuses a checkout that is not at a tag', () => inWorld({}, (w) => {
    git(w.tropis, 'checkout', '-q', 'main');
    bumpNext(w.tropis);
    git(w.tropis, 'add', '-A');
    git(w.tropis, 'commit', '-qm', 'untagged');
    const described = git(w.tropis, 'describe', '--tags', '--always').trim();
    const before = snapshot(w.project);

    const r = w.take('main');
    expect(r.status).toBe(1);
    expect(r.stderr).toBe(
      `take-version: check out a release tag first (git checkout vX.Y.Z); this checkout is ${described}.\n`,
    );
    expect(described).toMatch(/^v0\.2\.0-1-g/);
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('refuses a project that holds .framework/ beside .tropis/, changing nothing', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    mkdirSync(join(w.project, '.framework'));
    write(w.project, '.framework/marker', 'old\n');
    w.commit('both folders');
    const before = snapshot(w.project);

    const r = w.take('v0.2.1', '--accept-breaking');
    expect(r.status).toBe(1);
    expect(r.stderr).toBe(
      `take-version: ${w.project} holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and set the project up again with scripts/set-up-project.sh.\n`,
    );
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('refuses a project that has neither folder, changing nothing', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    rmSync(join(w.project, '.tropis'), { recursive: true });
    w.commit('neither folder');
    const before = snapshot(w.project);

    const r = w.take('v0.2.1', '--accept-breaking');
    expect(r.status).toBe(1);
    expect(r.stderr).toBe(
      `take-version: ${w.project} has no .tropis/. Set it up with scripts/set-up-project.sh first.\n`,
    );
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('refuses a project that holds only .framework/, changing nothing', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    renameSync(join(w.project, '.tropis'), join(w.project, '.framework'));
    w.commit('old layout');
    const before = snapshot(w.project);

    const r = w.take('v0.2.1', '--accept-breaking');
    expect(r.status).toBe(1);
    expect(r.stderr).toBe(
      `take-version: ${w.project} holds the framework in .framework/, a layout this release no longer takes. Remove .framework/, commit, and set the project up again with scripts/set-up-project.sh.\n`,
    );
    expect(snapshot(w.project)).toEqual(before);
  }), SLOW);

  it('writes the new text unchanged when the block counts differ', () => inWorld({}, (w) => {
    w.release('v0.2.1', (root) => edit(root, 'commands/release.md', (t) => {
      const next = t.replace('## Stage 1 — Pre-flight', '## Stage 1 — Preflight');
      expect(next).not.toBe(t);
      return next;
    }));
    // A second block makes the project's count two against the new version's one.
    edit(w.project, '.claude/commands/release.md', (t) => `${t}\n<!-- project-owned: begin — our own -->\nours\n<!-- project-owned: end -->\n`);
    w.commit();
    const mine = read(w.project, '.claude/commands/release.md');
    expect((mine.match(/project-owned: begin/g) ?? [])).toHaveLength(2);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(w.project, '.claude/commands/release.md')).toBe(mine);
    expect(read(w.project, '.claude/commands/release.md.new')).toBe(w.at('v0.2.1', 'commands/release.md'));
    expect(r.stdout).toContain('.claude/commands/release.md.new — project-owned blocks differ in number');
  }), SLOW);

  it('stops with a way back when the project generator fails', () => inWorld({}, (w) => {
    const generator = '.tropis/scripts/generate-rules.mjs';
    write(w.project, generator, "console.log('OUR-GENERATOR-FAILED');\nprocess.exit(1);\n");
    w.commit('replace the generator');
    w.release('v0.2.1', (root) => edit(root, 'scripts/generate-rules.mjs', (t) => `${t}\n// changed in v0.2.1\n`));

    const r = w.take('v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('OUR-GENERATOR-FAILED');
    expect(r.stderr).toContain('git restore . && git clean -fd');
    // The project's copy was left in place, so it is the one that ran.
    expect(read(w.project, generator)).toContain('OUR-GENERATOR-FAILED');
    expect(read(w.project, `${generator}.new`)).toBe(w.at('v0.2.1', 'scripts/generate-rules.mjs'));
    // The record is written last, so a failed run leaves the old version recorded.
    expect(recordOfProject(w.project).version).toBe('v0.2.0');
  }), SLOW);

  it('removes its scratch folder on every exit path', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    const known = new Set(takeVersionDirs(w.tmp));
    const leftover = () => takeVersionDirs(w.tmp).filter((d) => !known.has(d));

    expect(w.take('v0.2.1').status).toBe(0);
    expect(leftover()).toEqual([]);
    w.commit('took v0.2.1');

    // Refused after the scratch exists: the held version named by --from is not a tag
    // of this checkout, so its baseline cannot be built.
    rmSync(join(w.project, '.tropis/installed.json'));
    w.commit('delete the record');
    const unbuildable = w.take('v0.2.1', '--from', 'v0.2.0-9-gdeadbee');
    expect(unbuildable.status).toBe(1);
    expect(unbuildable.stderr).toMatch(/^take-version: cannot read v0\.2\.0-9-gdeadbee/);
    expect(leftover()).toEqual([]);
  }), SLOW);

  it('stops a step that does not finish, says which, and removes its scratch folder', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    // A tar that never reads its input or returns. `exec` makes the process that is
    // stopped the sleep itself, so nothing is left holding the pipe open.
    const fake = join(w.parent, 'fake-bin');
    mkdirSync(fake);
    writeFileSync(join(fake, 'tar'), '#!/bin/sh\nexec sleep 600\n');
    chmodSync(join(fake, 'tar'), 0o755);
    const r = w.takeWith({
      env: { PATH: `${fake}:${process.env.PATH}`, TROPIS_STEP_TIMEOUT_MS: '3000' },
      timeout: 30000,
    }, 'v0.2.1');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/^take-version: unpacking v0\.2\.1 did not finish within 3 s and was stopped\./m);
    expect(takeVersionDirs(w.tmp)).toEqual([]);
  }), SLOW);

  it('leaves an already-pointed entry pair untouched', () => inWorld({}, (w) => {
    const agents = '# Kept aside.\n';
    write(w.project, 'AGENTS.md', agents);
    write(w.project, 'CLAUDE.md', '@AGENTS.md\n');
    w.commit('already pointed');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(agents));
    expect(readFileSync(join(w.project, 'CLAUDE.md'))).toEqual(Buffer.from('@AGENTS.md\n'));
    expect(r.stdout).not.toContain('Pointed CLAUDE.md at AGENTS.md');
    expect(r.stdout).not.toContain('Moved the entry instructions from CLAUDE.md');
    expect(r.stdout).not.toContain('Wrote CLAUDE.md as the single line');
    expect(r.stdout).not.toContain('CLAUDE.md and AGENTS.md differ');
  }), SLOW);

  it('points CLAUDE.md at an identical AGENTS.md and leaves AGENTS.md unchanged', () => inWorld({}, (w) => {
    const text = '# The entry\nOne copy.\n';
    write(w.project, 'AGENTS.md', text);
    write(w.project, 'CLAUDE.md', text);
    w.commit('identical pair');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(text));
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(r.stdout).toContain('Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.');
  }), SLOW);

  it('moves entry instructions from CLAUDE.md when AGENTS.md is absent', () => inWorld({}, (w) => {
    const text = '# Only in Claude\n';
    rmSync(join(w.project, 'AGENTS.md'));
    write(w.project, 'CLAUDE.md', text);
    w.commit('claude only');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(text));
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(r.stdout).toContain(
      'Moved the entry instructions from CLAUDE.md to AGENTS.md, and pointed CLAUDE.md at it.',
    );
  }), SLOW);

  it('writes the CLAUDE.md pointer when only AGENTS.md is present', () => inWorld({}, (w) => {
    const text = '# Only in agents\n';
    rmSync(join(w.project, 'CLAUDE.md'));
    write(w.project, 'AGENTS.md', text);
    w.commit('agents only');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(text));
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(r.stdout).toContain('Wrote CLAUDE.md as the single line @AGENTS.md.');
  }), SLOW);

  it('replaces a CLAUDE.md symlinked to AGENTS.md with a regular file, then points it', () => inWorld({}, (w) => {
    const text = '# The entry\nBehind a link.\n';
    write(w.project, 'AGENTS.md', text);
    rmSync(join(w.project, 'CLAUDE.md'));
    symlinkSync('AGENTS.md', join(w.project, 'CLAUDE.md'));
    w.commit('claude symlink');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(lstatSync(join(w.project, 'CLAUDE.md')).isSymbolicLink()).toBe(false);
    expect(lstatSync(join(w.project, 'AGENTS.md')).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(text));
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    const a = r.stdout.indexOf('Replaced the symlink CLAUDE.md with a regular file holding the text it pointed at.');
    const b = r.stdout.indexOf('Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.');
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
  }), SLOW);

  it('replaces an AGENTS.md symlinked to CLAUDE.md with a regular file, then points CLAUDE.md', () => inWorld({}, (w) => {
    const text = '# The entry\nBehind a link.\n';
    write(w.project, 'CLAUDE.md', text);
    rmSync(join(w.project, 'AGENTS.md'));
    symlinkSync('CLAUDE.md', join(w.project, 'AGENTS.md'));
    w.commit('agents symlink');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(lstatSync(join(w.project, 'CLAUDE.md')).isSymbolicLink()).toBe(false);
    expect(lstatSync(join(w.project, 'AGENTS.md')).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(text));
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    const a = r.stdout.indexOf('Replaced the symlink AGENTS.md with a regular file holding the text it pointed at.');
    const b = r.stdout.indexOf('Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.');
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
  }), SLOW);

  it('removes a dangling CLAUDE.md symlink and writes the AGENTS.md pointer', () => inWorld({}, (w) => {
    const text = '# Only in agents\n';
    write(w.project, 'AGENTS.md', text);
    rmSync(join(w.project, 'CLAUDE.md'));
    symlinkSync('missing.md', join(w.project, 'CLAUDE.md'));
    w.commit('dangling symlink');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(lstatSync(join(w.project, 'CLAUDE.md')).isSymbolicLink()).toBe(false);
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(text));
    expect(existsSync(join(w.project, 'missing.md'))).toBe(false);
    expect(r.stdout).toContain('Removed the dangling symlink CLAUDE.md.');
    expect(r.stdout).toContain('Wrote CLAUDE.md as the single line @AGENTS.md.');
  }), SLOW);

  it('reports a replaced CLAUDE.md symlink to another file even on an early return', () => inWorld({}, (w) => {
    const agents = '# Kept aside.\n';
    write(w.project, 'AGENTS.md', agents);
    write(w.project, 'pointer.md', '@AGENTS.md\n');
    rmSync(join(w.project, 'CLAUDE.md'));
    symlinkSync('pointer.md', join(w.project, 'CLAUDE.md'));
    w.commit('symlink to a pointer file');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(lstatSync(join(w.project, 'CLAUDE.md')).isSymbolicLink()).toBe(false);
    expect(read(w.project, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(agents));
    expect(read(w.project, 'pointer.md')).toBe('@AGENTS.md\n');
    expect(r.stdout).toContain('Replaced the symlink CLAUDE.md with a regular file holding the text it pointed at.');
    expect(r.stdout).not.toContain('Pointed CLAUDE.md at AGENTS.md');
    expect(r.stdout).not.toContain('Moved the entry instructions');
    expect(r.stdout).not.toContain('Wrote CLAUDE.md as the single line');
    expect(r.stdout).not.toContain('CLAUDE.md and AGENTS.md differ');
  }), SLOW);

  it('changes neither file when CLAUDE.md and AGENTS.md differ', () => inWorld({}, (w) => {
    const agents = 'agents only\n';
    const claude = 'claude only\n';
    write(w.project, 'AGENTS.md', agents);
    write(w.project, 'CLAUDE.md', claude);
    w.commit('differing pair');
    w.release('v0.2.1', bumpNext);

    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(readFileSync(join(w.project, 'AGENTS.md'))).toEqual(Buffer.from(agents));
    expect(readFileSync(join(w.project, 'CLAUDE.md'))).toEqual(Buffer.from(claude));
    expect(r.stdout).toContain('CLAUDE.md and AGENTS.md differ, so neither was changed');
    expect(r.stdout).toContain('+claude only');
    expect(r.stdout).toContain('-agents only');
    expect(r.stdout).toContain('Merge CLAUDE.md into AGENTS.md');
    const next = r.stdout.split('Next:')[1];
    expect(next).toContain('Merge CLAUDE.md into AGENTS.md');
  }), SLOW);

  it('keeps the package name when the update runs in a folder of another name', () => inWorld({}, (w) => {
    w.release('v0.2.1', addExtraScript);
    const { r, worktree } = takeInWorktree(w, 'v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(packageOf(worktree).name).toBe('example-project-framework');
    expect(packageOf(worktree).scripts.extra).toBe('echo extra');
    expect(existsSync(join(worktree, '.tropis/package.json.new'))).toBe(false);
    expect(recordProblems(worktree)).toEqual([]);
  }), SLOW);

  it('keeps the package name with --from when there is no record', () => inWorld({}, (w) => {
    w.release('v0.2.1', addExtraScript);
    rmSync(join(w.project, '.tropis/installed.json'));
    w.commit('delete the record');
    const { r, worktree } = takeInWorktree(w, 'v0.2.1', '--from', 'v0.2.0');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(packageOf(worktree).name).toBe('example-project-framework');
    expect(packageOf(worktree).scripts.extra).toBe('echo extra');
    expect(existsSync(join(worktree, '.tropis/package.json.new'))).toBe(false);
    expect(recordProblems(worktree)).toEqual([]);
  }), SLOW);

  // Set up with a name, so the file exists when setup records what it installed: a file
  // the record listed would be deleted by the update as no longer shipped.
  it('leaves .tropis/project.json as setup wrote it', () => inWorld({ name: 'Example Project' }, (w) => {
    const text = read(w.project, '.tropis/project.json');
    expect(text).toBe(`${JSON.stringify({ name: 'Example Project' }, null, 2)}\n`);
    w.release('v0.2.1', addExtraScript);
    const { r, worktree } = takeInWorktree(w, 'v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(read(worktree, '.tropis/project.json')).toBe(text);
    expect(existsSync(join(worktree, '.tropis/project.json.new'))).toBe(false);
    expect(Object.keys(JSON.parse(read(worktree, '.tropis/installed.json')).files)).not.toContain('.tropis/project.json');
    expect(recordProblems(worktree)).toEqual([]);
  }), SLOW);

  it('names the package after the folder when the package names nothing', () => inWorld({}, (w) => {
    w.release('v0.2.1', addExtraScript);
    const { name, ...nameless } = packageOf(w.project);
    expect(name).toBe('example-project-framework');
    write(w.project, '.tropis/package.json', `${JSON.stringify(nameless, null, 2)}\n`);
    w.commit('drop the package name');
    const committed = read(w.project, '.tropis/package.json');
    const { r, worktree } = takeInWorktree(w, 'v0.2.1');
    expect(r.status).toBe(0);
    expect(read(worktree, '.tropis/package.json')).toBe(committed);
    expect(JSON.parse(read(worktree, '.tropis/package.json.new')).name).toBe('example-project-update-framework');
  }), SLOW);

  /** Change the release's lockfile by one key, asserting the edit changed it. */
  const changeLockfile = (root) => edit(root, 'templates/package-lock.json', (t) => {
    const changed = `${JSON.stringify({ ...JSON.parse(t), probe: 1 }, null, 2)}\n`;
    expect(changed).not.toBe(t);
    return changed;
  });
  const lockOf = (root) => read(root, '.tropis/package-lock.json');

  it("replaces the project's lockfile when it kept the shipped package file", () => inWorld({}, (w) => {
    w.release('v0.2.1', changeLockfile);
    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    const expected = w.at('v0.2.1', 'templates/package-lock.json').replace(/PROJECT_SLUG/g, 'example-project');
    expect(lockOf(w.project)).toBe(expected);
    expect(r.stdout).toMatch(/Replaced:\n(?: {2}.*\n)* {2}\.tropis\/package-lock\.json\n/);
    const next = r.stdout.split('Next:')[1];
    expect(next).toContain('npm --prefix .tropis ci');
    expect(next).not.toContain('npm --prefix .tropis install');
  }), SLOW);

  it("leaves the lockfile alone when the project changed its package file", () => inWorld({}, (w) => {
    edit(w.project, '.tropis/package.json', (t) => {
      const pkg = JSON.parse(t);
      pkg.scripts.mine = 'echo mine';
      return `${JSON.stringify(pkg, null, 2)}\n`;
    });
    w.commit('our own script');
    const before = lockOf(w.project);
    w.release('v0.2.1', changeLockfile);
    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(lockOf(w.project)).toBe(before);
    expect(r.stdout.split('Next:')[1] ?? '').not.toContain('npm --prefix .tropis ci');
  }), SLOW);

  it('adds the lockfile to a project that has none', () => inWorld({}, (w) => {
    rmSync(join(w.project, '.tropis/package-lock.json'));
    w.commit('no lockfile');
    w.release('v0.2.1', bumpNext);
    const r = w.take('v0.2.1');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(lockOf(w.project)).toBe(w.at('v0.2.1', 'templates/package-lock.json').replace(/PROJECT_SLUG/g, 'example-project'));
    expect(r.stdout).toMatch(/Added:\n(?: {2}.*\n)* {2}\.tropis\/package-lock\.json\n/);
  }), SLOW);
});
