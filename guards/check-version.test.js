// Level: unit
/**
 * `scripts/check-version.mjs` tells a set-up project whether a Tropis release is safe
 * to take. It writes nothing in the project. Not installed into projects.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync,
  rmSync, statSync, symlinkSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const blueprint = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FOLDERS = ['rules', 'framework', 'commands', 'scripts', 'guards', 'templates'];
const SLOW = 120000;

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

/** Every file under `dir` outside `.git` and `.tropis/node_modules`. */
function snapshot(dir) {
  const files = {};
  const skip = (rel) => rel === '.git' || rel.startsWith('.git/')
    || rel === '.tropis/node_modules' || rel.startsWith('.tropis/node_modules/');
  for (const rel of readdirSync(dir, { recursive: true })) {
    const name = String(rel);
    if (skip(name)) continue;
    if (statSync(join(dir, name)).isFile()) files[name] = readFileSync(join(dir, name));
  }
  return files;
}

const BEGIN_TO_END = /(<!-- project-owned: begin[^\n]*\n)[\s\S]*?(<!-- project-owned: end -->)/;
const fillBlock = (text, inner) => text.replace(BEGIN_TO_END, (_, begin, end) => `${begin}${inner}\n${end}`);

/**
 * A scratch Tropis repository tagged `v0.2.0` and a project set up from it and committed.
 * The project's checks can run: its `.tropis/node_modules` links the self-check's tools.
 */
function world({ v020 = {} } = {}) {
  const parent = mkdtempSync(join(tmpdir(), 'cv-test-'));
  const tropis = join(parent, 'tropis');
  mkdirSync(tropis);
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
  const setup = spawnSync('bash', [join(tropis, 'scripts/set-up-project.sh'), project], { encoding: 'utf8' });
  if (setup.status !== 0) throw new Error(setup.stderr || setup.stdout);
  git(project, 'add', '-A');
  git(project, 'commit', '-qm', 'set up');
  symlinkSync(realpathSync(join(blueprint, 'node_modules')), join(project, '.tropis/node_modules'));
  // The setup ignore is `.tropis/node_modules/`, which matches a directory and not a
  // symlink, so the link the checks need would otherwise be an uncommitted change.
  const exclude = join(project, '.git/info/exclude');
  writeFileSync(exclude, `${existsSync(exclude) ? readFileSync(exclude, 'utf8') : ''}.tropis/node_modules\n`);

  return {
    parent,
    tropis,
    project,
    release(tag, change) {
      git(tropis, 'checkout', '-q', 'main');
      change(tropis);
      git(tropis, 'add', '-A');
      git(tropis, 'commit', '-qm', tag);
      git(tropis, 'tag', tag);
    },
    commit(message = 'project change') {
      git(project, 'add', '-A');
      git(project, 'commit', '-qm', message);
    },
    /**
     * Check `ref` out in the scratch Tropis and run the check on the project.
     * The run gets its own temporary folder, so a sibling test's scratch dirs are
     * not this run's leftovers.
     */
    check(ref, ...flags) {
      git(tropis, 'checkout', '-q', ref);
      const scratch = mkdtempSync(join(tmpdir(), 'cv-assert-'));
      try {
        const result = spawnSync('node', [join(tropis, 'scripts/check-version.mjs'), project, ...flags], {
          encoding: 'utf8',
          env: { ...process.env, TMPDIR: scratch },
        });
        expect(readdirSync(scratch).filter(
          (name) => name.startsWith('check-version-') || name.startsWith('take-version-'),
        )).toEqual([]);
        return result;
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    },
    clean() {
      rmSync(parent, { recursive: true, force: true });
    },
  };
}

function inWorld(options, fn) {
  const w = world(options);
  try {
    return fn(w);
  } finally {
    w.clean();
  }
}

function kept(w, run) {
  const before = snapshot(w.project);
  const head = git(w.project, 'rev-parse', 'HEAD');
  const status = git(w.project, 'status', '--porcelain');
  const result = run();
  expect(snapshot(w.project)).toEqual(before);
  expect(git(w.project, 'status', '--porcelain')).toBe(status);
  expect(git(w.project, 'rev-parse', 'HEAD')).toBe(head);
  return result;
}

const bumpNext = (root) => edit(root, 'commands/next.md', (t) => `${t}\nA line from the next version.\n`);

const passedLine = (stdout) => {
  const match = stdout.match(/(\d+) passed, (\d+) failed/);
  expect(match).not.toBeNull();
  return { passed: Number(match[1]), failed: Number(match[2]) };
};

describe('check-version.mjs', () => {
  it('says a release that only changes an untouched file is safe', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
    expect(r.stdout.split('\n')[0]).toMatch(/is safe\.$/);
    expect(r.stdout).toContain('Files the release changes');
    expect(r.stdout).toContain('.claude/commands/next.md');
    const tests = passedLine(r.stdout);
    expect(tests.passed).toBeGreaterThan(0);
    expect(tests.failed).toBe(0);
  }), SLOW);

  it('treats a file the project also changed as a step, and the checks still pass', () => inWorld({}, (w) => {
    edit(w.project, '.claude/commands/next.md', (t) => `${t}\nThe project's own line.\n`);
    w.commit();
    w.release('v0.2.1', bumpNext);
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('is safe with these steps.');
    expect(r.stdout).toContain('Files you changed');
    expect(r.stdout).toContain('.claude/commands/next.md.new');
    expect(r.stdout).toContain("the tests ran with the project's version of .claude/commands/next.md");
    expect(passedLine(r.stdout).failed).toBe(0);
  }), SLOW);

  it('says not now when the release breaks the project checks', () => inWorld({}, (w) => {
    w.release('v0.2.1', (root) => {
      unlinkSync(join(root, 'commands/next.md'));
      edit(root, 'templates/project-layout.test.js', (t) => {
        const rooted = t.replace(
          "const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');",
          'const root = process.env.FRAMEWORK_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), \'../..\');',
        );
        if (rooted === t) throw new Error('project-layout root line was not found');
        return rooted.replace(
          "describe('set-up project layout', () => {",
          "describe('set-up project layout', () => {\n  it('fails on purpose for the version check', () => {\n    expect(existsSync(resolve(root, '.claude/commands/next.md'))).toBe(true);\n  });\n",
        );
      });
    });
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('is not now.');
    expect(r.stdout).toContain('set-up project layout fails on purpose for the version check');
  }), SLOW);

  it('names an additions file and an area for a rule the release drops', () => inWorld({
    v020: {
      'rules/extra.md': '# Extra\n\nA rule this release ships.\n',
      'templates/rule-areas.json': `${JSON.stringify({
        ...JSON.parse(readFileSync(join(blueprint, 'templates/rule-areas.json'), 'utf8')),
        extra: ['extra/**'],
      }, null, 2)}\n`,
    },
  }, (w) => {
    write(w.project, '.claude/rule-additions/extra.md', 'Remember the extra thing.\n');
    const generated = spawnSync('node', ['.tropis/scripts/generate-rules.mjs'], { cwd: w.project, encoding: 'utf8' });
    if (generated.status !== 0) throw new Error(generated.stderr || generated.stdout);
    w.commit('additions to extra');
    w.release('v0.2.1', (root) => {
      unlinkSync(join(root, 'rules/extra.md'));
      const areas = JSON.parse(read(root, 'templates/rule-areas.json'));
      delete areas.extra;
      write(root, 'templates/rule-areas.json', `${JSON.stringify(areas, null, 2)}\n`);
    });
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('is safe with these steps.');
    expect(r.stdout).toContain('Settings that no longer fit');
    expect(r.stdout).toContain('move or delete .claude/rule-additions/extra.md');
    expect(r.stdout).toContain('the take removes its areas from .claude/rule-areas.json');
    expect(r.stdout).toContain('rule extra');
    expect(passedLine(r.stdout).failed).toBe(0);
  }), SLOW);

  it('names a project hook whose script the release no longer ships', () => inWorld({}, (w) => {
    w.release('v0.2.1', (root) => edit(root, 'scripts/installed-scripts.txt', (t) => {
      const next = t.replace('probe-hook-channels.sh\n', '');
      expect(next).not.toBe(t);
      return next;
    }));
    const settings = JSON.parse(read(w.project, '.claude/settings.json'));
    settings.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: 'bash .tropis/scripts/probe-hook-channels.sh' }],
    });
    write(w.project, '.claude/settings.json', `${JSON.stringify(settings, null, 2)}\n`);
    w.commit('a hook of our own');
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Settings that no longer fit');
    expect(r.stdout).toContain('hook bash .tropis/scripts/probe-hook-channels.sh names .tropis/scripts/probe-hook-channels.sh, which the release does not ship');
  }), SLOW);

  it('names a command whose project-owned blocks differ in number', () => inWorld({}, (w) => {
    edit(w.project, '.claude/commands/release.md', (t) => fillBlock(t, 'our own release line'));
    w.commit();
    w.release('v0.2.1', (root) => edit(root, 'commands/release.md', (t) => `${t}\n<!-- project-owned: begin — second -->\n\n<!-- project-owned: end -->\n`));
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Settings that no longer fit');
    expect(r.stdout).toContain('project-owned blocks differ in number; carry your fill-ins into .claude/commands/release.md.new by hand');
  }), SLOW);

  it('shows the diff of a shipped rule whose text changes, with its areas', () => inWorld({}, (w) => {
    const areas = JSON.parse(read(w.project, '.claude/rule-areas.json'));
    w.release('v0.2.1', (root) => edit(root, 'rules/tests.md', (t) => `${t}\nA line agents will be told.\n`));
    const r = kept(w, () => w.check('v0.2.1'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Rules that change what agents are told');
    expect(r.stdout).toContain(`tests (areas: ${areas.tests.join(', ')})`);
    expect(r.stdout).toMatch(/\+A line agents will be told\./);
  }), SLOW);

  it('names --accept-breaking for a breaking release and leaves the project on v0.2.0', () => inWorld({}, (w) => {
    w.release('v0.3.0', bumpNext);
    const r = kept(w, () => w.check('v0.3.0'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('is safe with these steps.');
    expect(r.stdout).toContain('--accept-breaking');
    expect(r.stdout).toContain('breaking release for a project on v0.2.0');
    expect(JSON.parse(read(w.project, '.tropis/installed.json')).version).toBe('v0.2.0');
  }), SLOW);

  it('says there is nothing to take for the version the project holds', () => inWorld({}, (w) => {
    const r = kept(w, () => w.check('v0.2.0'));
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
    expect(r.stdout).toContain('Nothing to take');
    expect(r.stdout).toContain(w.project);
  }), SLOW);

  it('refuses a dirty tree, an untagged checkout, and a missing record without naming the clone', () => inWorld({}, (w) => {
    write(w.project, 'notes.txt', 'not committed\n');
    const dirty = kept(w, () => w.check('v0.2.0'));
    expect(dirty.status).toBe(1);
    expect(dirty.stdout).toBe('');
    expect(dirty.stderr).toBe(
      `check-version: ${w.project} has uncommitted changes. Commit or stash them first; the check reads what is committed.\n`,
    );
    unlinkSync(join(w.project, 'notes.txt'));

    git(w.tropis, 'checkout', '-q', 'main');
    edit(w.tropis, 'commands/next.md', (t) => `${t}\nUntagged.\n`);
    git(w.tropis, 'add', '-A');
    git(w.tropis, 'commit', '-qm', 'not a release');
    const untagged = kept(w, () => w.check('HEAD'));
    expect(untagged.status).toBe(1);
    expect(untagged.stdout).toBe('');
    expect(untagged.stderr).toMatch(/^check-version: /);

    w.release('v0.2.1', bumpNext);
    unlinkSync(join(w.project, '.tropis/installed.json'));
    w.commit('record gone');
    const missing = kept(w, () => w.check('v0.2.1'));
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe('');
    expect(missing.stderr).toContain(w.project);
    expect(missing.stderr).not.toContain('check-version-');
  }), SLOW);

  it('passes --from through and then answers safe', () => inWorld({}, (w) => {
    w.release('v0.2.1', bumpNext);
    unlinkSync(join(w.project, '.tropis/installed.json'));
    w.commit('record gone');
    const r = kept(w, () => w.check('v0.2.1', '--from', 'v0.2.0'));
    expect(r.status).toBe(0);
    expect(r.stdout.split('\n')[0]).toMatch(/is safe\.$/);
  }), SLOW);
});
