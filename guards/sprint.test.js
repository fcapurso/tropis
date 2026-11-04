// Level: unit
/**
 * The sprint script: it proposes a sprint from the backlog, keeps the agreed sprint in a
 * local file git does not track, waits for a blocker to ship, and says where the sprint
 * stands (framework/workflow.md, *Delivering a backlog item*; commands/sprint.md).
 *
 * The command-line cases run a copy of the script installed at .tropis/scripts/ in a
 * clone of a local bare repository, as a team member would, so the fetch of origin's main
 * branch is the thing under test. The cases for an origin on GitHub fake it: the clone
 * is made from the local repository, then its origin URL is pointed at a github.com URL
 * and the script is run with GIT_ALLOW_PROTOCOL=file, so its fetch is refused at once
 * without reaching the network and it reads origin/main as last fetched. A stub gh first
 * on PATH answers the REST pull request route (`gh api repos/{owner}/{repo}/pulls?...`)
 * and fails every other call. Nothing here reaches the network.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, rmSync,
  existsSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
// A namespace import, so a missing export fails the case that uses it and not the file.
import * as sprint from '../scripts/sprint.mjs';
import * as binding from '../scripts/plan-binding.js';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = resolve(here, '../scripts');
const FILES = [
  'sprint.mjs', 'load-yaml.mjs', 'next-work.js', 'board-bands.js', 'plan-binding.js', 'projections.js', 'subscriptions.js',
  'main-status.mjs', 'merge-token.mjs', 'team-member-cli.mjs',
];

const spawned = [];
afterAll(() => spawned.forEach((child) => child.kill()));
const roots = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));
const scratch = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

const ENV = { ...process.env, TROPIS_SUBSCRIPTIONS: undefined, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
delete ENV.TROPIS_SPRINT_NOW;
const git = (cwd, args, env = ENV) => {
  const r = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });
const at = (time, extra = {}) => ({ ...ENV, TROPIS_SPRINT_NOW: time, ...extra });

const T0 = '2026-11-02T09:00:00Z';

const entry = (id, over = {}) => ({
  id, title: `Title ${id}`, status: 'shaped', value: 'A value.', acceptanceCriteria: [],
  type: 'feature', layer: 'product', modules: [], refs: [], ...over,
});
const row = (band, value, effort, extra = {}) => ({
  band, value, valueWhy: 'why', effort, effortWhy: 'why', verdict: 'verdict', ...extra,
});

/** A bare origin whose main holds the catalog, the bands and any other files given. */
function makeWorld(entries, bands, extra = {}) {
  const dir = scratch('sprint-');
  const bare = join(dir, 'origin.git');
  git(dir, ['init', '-q', '--bare', '-b', 'main', bare]);
  const seed = join(dir, 'seed');
  git(dir, ['init', '-q', '-b', 'main', seed]);
  git(seed, ['config', 'user.name', 'Seed']);
  git(seed, ['config', 'user.email', 'seed@example.com']);
  const world = { dir, bare, seed };
  publish(world, { 'feature-catalog.yaml': YAML.stringify(entries), ...(bands ? { 'docs/backlog-board/bands.yaml': YAML.stringify(bands) } : {}), ...extra }, 'seed');
  return world;
}

/** Commits files to origin's main from the seed clone. */
function publish(world, files, message = 'change') {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(world.seed, path)), { recursive: true });
    writeFileSync(join(world.seed, path), text);
  }
  git(world.seed, ['add', '.']);
  git(world.seed, ['commit', '-q', '-m', message]);
  git(world.seed, ['push', '-q', world.bare, 'main']);
}

/** Installs the script and what it imports as a project has them. */
function install(dir) {
  mkdirSync(join(dir, '.tropis/scripts'), { recursive: true });
  for (const f of FILES) copyFileSync(join(shipped, f), join(dir, '.tropis/scripts', f));
  writeFileSync(join(dir, '.tropis/package.json'), '{"type":"module"}\n');
  if (!existsSync(join(dir, '.tropis/node_modules'))) {
    symlinkSync(resolve(here, '../node_modules'), join(dir, '.tropis/node_modules'));
  }
}

function makeClone(world, name = 'clone') {
  const clone = join(world.dir, name);
  git(world.dir, ['clone', '-q', world.bare, clone]);
  git(clone, ['config', 'user.name', `Session ${name}`]);
  git(clone, ['config', 'user.email', `${name}@example.com`]);
  install(clone);
  return clone;
}

const scriptOf = (clone) => join(clone, '.tropis/scripts/sprint.mjs');
const run = (clone, args, env = ENV) => spawnSync('node', [scriptOf(clone), ...args], {
  cwd: clone, env, encoding: 'utf8',
});
const lines = (r) => r.stdout.split('\n').filter((l) => l !== '');
const sprintFile = (clone) => join(
  resolve(clone, git(clone, ['rev-parse', '--git-common-dir'])), 'tropis/sprint.json',
);
/** The record kept in the local file, as a project without an origin keeps it. */
const readLocal = (clone) => JSON.parse(readFileSync(sprintFile(clone), 'utf8'));
/** The text of the record on the branch `tropis/sprint` of the clone's origin, or null. */
const textOnOrigin = (clone) => {
  const r = spawnSync('git', ['--git-dir', git(clone, ['config', 'remote.origin.url']), 'show',
    'refs/heads/tropis/sprint:sprint.json'], { env: ENV, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
};
const onOrigin = (clone) => {
  const text = textOnOrigin(clone);
  return text === null ? null : JSON.parse(text);
};
const readSprint = onOrigin;

function spawnScript(clone, args, env = ENV) {
  const child = spawn('node', [scriptOf(clone), ...args], { cwd: clone, env });
  spawned.push(child);
  const out = { stdout: '', exit: null, child };
  child.stdout.on('data', (d) => { out.stdout += d; });
  out.done = new Promise((done) => { child.on('close', (code) => { out.exit = code; done(out); }); });
  return out;
}
const until = async (test, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (test()) return true;
    await sleep(100);
  }
  return false;
};

const STUB_GH = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dir = process.env.STUB_DIR;
const args = process.argv.slice(2);
fs.appendFileSync(path.join(dir, 'gh.log'), JSON.stringify(args) + '\\n');
if (args[0] === 'api' && String(args[1]).startsWith('repos/{owner}/{repo}/pulls?') && fs.existsSync(path.join(dir, 'pulls.json'))) {
  process.stdout.write(fs.readFileSync(path.join(dir, 'pulls.json'), 'utf8'));
  process.exit(0);
}
process.stderr.write('stub gh: unexpected call: ' + args.join(' ') + '\\n');
process.exit(99);
`;

/** A stub gh whose open pull requests are `pulls`; returns the environment to run with. */
function stubGh(world, pulls) {
  const stub = join(world.dir, 'stub');
  mkdirSync(join(stub, 'bin'), { recursive: true });
  writeFileSync(join(stub, 'bin/gh'), STUB_GH);
  chmodSync(join(stub, 'bin/gh'), 0o755);
  writeFileSync(join(stub, 'gh.log'), '');
  if (pulls) {
    writeFileSync(join(stub, 'pulls.json'), JSON.stringify(
      pulls.map((p) => ({ number: p.number, head: { ref: p.headRefName } })),
    ));
  }
  return {
    env: { STUB_DIR: stub, PATH: `${join(stub, 'bin')}:${process.env.PATH}` },
    calls: () => readFileSync(join(stub, 'gh.log'), 'utf8').split('\n').filter(Boolean),
  };
}

/** Points the clone's origin at GitHub. The script's fetch is then refused at once. */
function pretendGitHub(clone) {
  git(clone, ['remote', 'set-url', 'origin', 'https://github.com/acme/kiln.git']);
  return { GIT_ALLOW_PROTOCOL: 'file' };
}

describe('propose', () => {
  const entries = [
    entry('a1', { status: 'idea' }), entry('a2'), entry('a3', { status: 'idea' }),
    entry('b1'), entry('b2', { status: 'idea' }), entry('b3'),
    entry('c1'), entry('u1'), entry('s1', { shelved: true }),
    entry('sh1', { status: 'shipped' }), entry('d1', { layer: 'docs' }),
  ];
  const bands = {
    a1: row('A', 5, 5), a2: row('A', 5, 2), a3: row('A', 4, 4),
    b1: row('B', 5, 5), b2: row('B', 3, 1), b3: row('B', 2, 5),
    c1: row('C', 5, 1), s1: row('A', 5, 1), sh1: row('A', 5, 1), d1: row('A', 5, 1),
  };

  it('† fills 20 points in the order /next suggests, from ideas and shaped entries', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    const sha = git(clone, ['rev-parse', '--short=7', 'origin/main']);

    const r = run(clone, ['propose']);
    expect(r.status).toBe(0);
    expect(lines(r)).toEqual([
      `Sprint: proposed 17 of 20 effort points for 5 team members, from main at ${sha}.`,
      '  1. a2 — 2 pts, band A — Title a2',
      '  2. a1 — 5 pts, band A — Title a1',
      '  3. a3 — 4 pts, band A — Title a3',
      '  4. b2 — 1 pts, band B — Title b2',
      '  5. b1 — 5 pts, band B — Title b1',
      'Sprint: next in line, over the budget — b3 (5 pts).',
    ]);
  });

  it('† takes the budget from --points and refuses one that is not a whole number', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    const sha = git(clone, ['rev-parse', '--short=7', 'origin/main']);

    expect(lines(run(clone, ['propose', '--points', '5']))).toEqual([
      `Sprint: proposed 3 of 5 effort points for 2 team members, from main at ${sha}.`,
      '  1. a2 — 2 pts, band A — Title a2',
      '  2. b2 — 1 pts, band B — Title b2',
      'Sprint: next in line, over the budget — a1 (5 pts).',
    ]);
    for (const bad of ['0', 'x', '2.5', '-3']) {
      const r = run(clone, ['propose', '--points', bad]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('Sprint: --points takes a whole number above 0.\n');
    }
  });

  it('† says so when nothing is free to start', () => {
    const world = makeWorld([entry('only')], { only: row('C', 3, 3) });
    const clone = makeClone(world);
    const r = run(clone, ['propose']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(
      'Sprint: nothing to propose — no idea or shaped backlog item banded A or B is free to start.\n',
    );
  });

  it('† leaves out an entry blocked by an unshipped one outside the sprint, and puts one blocked by a lower-ranked sprint entry after it', () => {
    const world = makeWorld([
      entry('free'), entry('outside'), entry('x1', { blockedBy: ['outside'] }),
      entry('x2', { blockedBy: ['y2'] }), entry('y2'),
      entry('done', { status: 'shipped' }), entry('x3', { blockedBy: ['done'] }),
    ], {
      free: row('A', 3, 3), outside: row('C', 3, 3), x1: row('A', 5, 1), x2: row('A', 4, 1),
      y2: row('B', 2, 1), x3: row('B', 1, 4),
    });
    const clone = makeClone(world);
    const r = run(clone, ['propose']);
    expect(lines(r).slice(1).map((l) => l.split(' ')[3])).toEqual(['free', 'y2', 'x3', 'x2']);
    expect(r.stdout).not.toContain('x1');
  });

  it('† moves an entry after the one it names in `after`', () => {
    const world = makeWorld([entry('p', { after: ['q'] }), entry('q')], {
      p: row('A', 5, 1), q: row('A', 1, 1),
    });
    const clone = makeClone(world);
    expect(lines(run(clone, ['propose'])).slice(1).map((l) => l.split(' ')[3])).toEqual(['q', 'p']);
  });

  it('† brings a bundle whole, at its first member\'s place, or not at all', () => {
    const world = makeWorld([
      entry('f1'), entry('k1'), entry('k2'), entry('m1'), entry('s1'),
    ], {
      f1: row('A', 5, 5), k1: row('A', 4, 5, { bundle: 'kiln' }),
      k2: row('B', 4, 5, { bundle: 'kiln' }), m1: row('B', 5, 5), s1: row('B', 1, 2),
    });
    const clone = makeClone(world);
    const ids = (r) => lines(r).slice(1).filter((l) => /^ {2}\d+\./.test(l)).map((l) => l.split(' ')[3]);

    const small = run(clone, ['propose', '--points', '9']);
    expect(ids(small)).toEqual(['f1', 's1']);
    expect(small.stdout).toContain('Sprint: next in line, over the budget — k1 (10 pts).');

    const roomy = run(clone, ['propose']);
    expect(roomy.status).toBe(0);
    expect(lines(roomy)[0]).toContain(' for 3 team members, ');
    expect(lines(roomy).slice(1)).toEqual([
      '  1. f1 — 5 pts, band A — Title f1',
      '  2. bundle kiln — 10 pts, 2 backlog items',
      '       k1 — 5 pts, band A — Title k1',
      '       k2 — 5 pts, band B — Title k2',
      '  3. m1 — 5 pts, band B — Title m1',
      'Sprint: next in line, over the budget — s1 (2 pts).',
    ]);
  });

  it('† keeps a bundle under one entry when an entry falls between its members', () => {
    const world = makeWorld([
      entry('k1'), entry('k2', { after: ['x'] }), entry('x'),
    ], {
      k1: row('A', 5, 1, { bundle: 'kiln' }), k2: row('A', 4, 1, { bundle: 'kiln' }), x: row('B', 1, 1),
    });
    const clone = makeClone(world);
    const r = run(clone, ['propose']);
    expect(r.status).toBe(0);
    expect(lines(r)[0]).toContain(' for 2 team members, ');
    expect(lines(r).slice(1)).toEqual([
      '  1. bundle kiln — 2 pts, 2 backlog items',
      '       k1 — 1 pts, band A — Title k1',
      '       k2 — 1 pts, band A — Title k2',
      '  2. x — 1 pts, band B — Title x',
    ]);
  });

  it('† says team member, not team members, for one', () => {
    const world = makeWorld([entry('solo')], { solo: row('A', 3, 3) });
    const clone = makeClone(world);
    const r = run(clone, ['propose']);
    expect(r.status).toBe(0);
    expect(lines(r)[0]).toContain(' for 1 team member, ');
  });
});

describe('start, and the sprint file', () => {
  const entries = [entry('e1'), entry('e2'), entry('e3')];
  const bands = { e1: row('A', 3, 3), e2: row('A', 2, 2, { bundle: 'kiln' }), e3: row('B', 1, 1) };

  it('† writes the sprint under the git common dir, refuses a second start, an unknown id and a way of subagent, and is read and marked from a second worktree', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);

    const none = run(clone, ['start']);
    expect(none.status).toBe(1);
    const unknown = run(clone, ['start', 'e1', 'nope']);
    expect(unknown.status).toBe(1);
    expect(unknown.stdout).toBe('Sprint: no backlog item nope in the backlog.\n');
    const way = run(clone, ['start', 'e1', '--way', 'subagent']);
    expect(way.status).toBe(1);
    expect(way.stdout).toContain('--way');
    expect(onOrigin(clone)).toBeNull();

    const started = run(clone, ['start', 'e2', 'e1', '--points', '12', '--way', 'session'], at(T0));
    expect(started.status).toBe(0);
    expect(started.stdout).toBe(
      'Sprint: started with 2 backlog items, 5 of 12 effort points; team members start as session.\n'
      + "Sprint: each team member's session is left open once its work ships.\n"
      + "Sprint: team members run on the Large tier. **Use:** not chosen — this project has no model picks. Run /refresh-model-tiers. Start them on the tool's default model.\n",
    );
    expect(existsSync(sprintFile(clone))).toBe(false);
    expect(readSprint(clone)).toEqual({
      started: T0,
      budget: 12,
      way: 'session',
      archive: false,
      archived: [],
      entries: [{ id: 'e2', points: 2, bundle: 'kiln' }, { id: 'e1', points: 3 }],
      baseline: ['e1', 'e2', 'e3'],
      marks: {},
      notes: {},
    });
    expect(textOnOrigin(clone)).toMatch(/^\{\n {2}"started"/);
    expect(textOnOrigin(clone).endsWith('}\n')).toBe(true);

    const again = run(clone, ['start', 'e3'], at('2026-11-02T10:00:00Z'));
    expect(again.status).toBe(1);
    expect(again.stdout).toBe(`Sprint: one is under way since ${T0}; end it first.\n`);
    expect(readSprint(clone).entries).toHaveLength(2);

    const second = join(world.dir, 'second');
    git(clone, ['worktree', 'add', '-q', second, '-b', 'other']);
    install(second);
    const marked = run(second, ['mark', 'e1', 'parked', 'needs', 'a', 'printer']);
    expect(marked.status).toBe(0);
    expect(marked.stdout).toBe('Sprint: e1 marked parked.\n');
    expect(readSprint(clone).marks).toEqual({ e1: { state: 'parked', reason: 'needs a printer' } });
    const status = run(second, ['status'], at('2026-11-02T10:00:00Z'));
    expect(status.stdout).toContain('  e1 — parked: needs a printer\n');
  });

  it('† defaults to one entry at a time and records the default way', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    const r = run(clone, ['start', 'e1']);
    expect(r.stdout).toBe('Sprint: started with 1 backlog items, 3 of 20 effort points; team members start as here.\n');
    expect(readSprint(clone).way).toBe('here');
  });
});

describe('wait', () => {
  const catalog = (blockerStatus = 'shaped') => [
    entry('up', { status: blockerStatus }), entry('down', { blockedBy: ['up'] }), entry('loose'),
  ];
  const bands = { up: row('A', 3, 3), down: row('A', 3, 3), loose: row('A', 3, 3) };

  it('† exits 0 at once when every blocker has shipped, or it has none, with no sprint file', () => {
    const world = makeWorld(catalog('shipped'), bands);
    const clone = makeClone(world);
    for (const id of ['down', 'loose']) {
      const r = run(clone, ['wait', id, '--interval', '1']);
      expect(r.status).toBe(0);
      expect(r.stdout).toBe(`Sprint: ${id} can start — nothing it is blocked by is still open.\n`);
    }
    const missing = run(clone, ['wait', 'nope']);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe('Sprint: no backlog item nope in the backlog.\n');
  });

  it('† keeps waiting without a time limit and carries on within a few intervals of the blocker shipping on origin', async () => {
    const world = makeWorld(catalog(), bands);
    const clone = makeClone(world);
    const waiting = spawnScript(clone, ['wait', 'down', '--interval', '1']);

    expect(await until(() => waiting.stdout.includes('waits for'))).toBe(true);
    expect(waiting.stdout).toBe('Sprint: down waits for up to ship.\n');
    await sleep(3500);
    expect(waiting.exit).toBeNull();

    publish(world, { 'feature-catalog.yaml': YAML.stringify(catalog('shipped')) }, 'ship up');
    expect(await until(() => waiting.exit !== null, 8000)).toBe(true);
    expect(waiting.exit).toBe(0);
    expect(waiting.stdout).toBe(
      'Sprint: down waits for up to ship.\n'
      + 'Sprint: down can start — nothing it is blocked by is still open.\n',
    );
  }, 30000);

  it('† stops with PARKED once the blocker is marked parked in the sprint file', async () => {
    const world = makeWorld(catalog(), bands);
    const clone = makeClone(world);
    expect(run(clone, ['start', 'up', 'down']).status).toBe(0);
    const waiting = spawnScript(clone, ['wait', 'down', '--interval', '1']);
    expect(await until(() => waiting.stdout.includes('waits for'))).toBe(true);

    expect(run(clone, ['mark', 'up', 'parked', 'needs', 'a', 'choice']).status).toBe(0);
    expect(await until(() => waiting.exit !== null, 8000)).toBe(true);
    expect(waiting.exit).toBe(3);
    expect(waiting.stdout).toContain('PARKED: depends on up\n');
  }, 30000);

  it('† stops with PARKED once the blocker is dropped on origin', async () => {
    const world = makeWorld(catalog(), bands);
    const clone = makeClone(world);
    const waiting = spawnScript(clone, ['wait', 'down', '--interval', '1']);
    expect(await until(() => waiting.stdout.includes('waits for'))).toBe(true);

    publish(world, { 'feature-catalog.yaml': YAML.stringify(catalog('dropped')) }, 'drop up');
    expect(await until(() => waiting.exit !== null, 8000)).toBe(true);
    expect(waiting.exit).toBe(3);
    expect(waiting.stdout).toContain('PARKED: depends on up\n');
  }, 30000);
});

describe('wait --once', () => {
  const catalog = (blockerStatus = 'shaped') => [
    entry('up', { status: blockerStatus }), entry('down', { blockedBy: ['up'] }),
  ];
  const bands = { up: row('A', 3, 3), down: row('A', 3, 3) };

  it('† exits 5 with Still waiting and the blocker while it is open, and 0 once it has shipped', () => {
    const world = makeWorld(catalog('building'), bands);
    const clone = makeClone(world);
    const waiting = run(clone, ['wait', 'down', '--once']);
    expect(waiting.status).toBe(5);
    expect(waiting.stdout).toBe('Still waiting: down is blocked by up, which has not shipped.\n');

    publish(world, { 'feature-catalog.yaml': YAML.stringify(catalog('shipped')) }, 'ship up');
    const done = run(clone, ['wait', 'down', '--once']);
    expect(done.status).toBe(0);
    expect(done.stdout).toBe('Sprint: down can start — nothing it is blocked by is still open.\n');
  });

  it('† exits 3 with PARKED when the blocker was parked', () => {
    const world = makeWorld(catalog(), bands);
    const clone = makeClone(world);
    expect(run(clone, ['start', 'up', 'down']).status).toBe(0);
    expect(run(clone, ['mark', 'up', 'parked', 'needs', 'a', 'choice']).status).toBe(0);
    const r = run(clone, ['wait', 'down', '--once']);
    expect(r.status).toBe(3);
    expect(r.stdout).toContain('PARKED: depends on up\n');
  });
});

describe('status', () => {
  it('† reads the backlog from origin after fetching, and an entry shipped on main is shipped whatever its mark says', () => {
    const world = makeWorld(
      [entry('e1'), entry('e2', { status: 'shipped' }), entry('e3')],
      { e1: row('A', 3, 3), e2: row('A', 3, 2), e3: row('A', 3, 1) },
    );
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1', 'e2', 'e3'], at(T0)).status).toBe(0);
    expect(run(clone, ['mark', 'e2', 'parked', 'was', 'stuck']).status).toBe(0);
    // e1 ships on origin after the clone last fetched.
    publish(world, {
      'feature-catalog.yaml': YAML.stringify([
        entry('e1', { status: 'shipped' }), entry('e2', { status: 'shipped' }), entry('e3'),
      ]),
    });

    const r = run(clone, ['status'], at('2026-11-02T10:30:00Z'));
    expect(r.status).toBe(0);
    const out = lines(r);
    expect(out[0]).toBe('Sprint: started 2026-11-02T09:00:00Z, 1.5 h ago; 5 of 6 effort points shipped, 20 budgeted.');
    expect(out).toContain('  e1 — shipped');
    expect(out).toContain('  e2 — shipped');
    expect(out).toContain('  e3 — not started');
    expect(r.stdout).not.toContain('parked:');
  });

  it('† prints no "needs you" line when nothing is stopped or parked', () => {
    const world = makeWorld([entry('e1'), entry('e2')], { e1: row('A', 3, 3), e2: row('A', 3, 2) });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1', 'e2'], at(T0)).status).toBe(0);
    expect(run(clone, ['mark', 'e2', 'planning']).status).toBe(0);
    const out = lines(run(clone, ['status'], at(T0)));
    expect(out[0]).toMatch(/^Sprint: started 2026-11-02T09:00:00Z, 0\.0 h ago; 0 of 5 effort points shipped, 20 budgeted\.$/);
    expect(out[1]).toMatch(/^Merge token: /);
    expect(out.slice(2, 4)).toEqual(['  e1 — not started', '  e2 — planning']);
    expect(out.join('\n')).not.toContain('needs you');
    expect(out.join('\n')).not.toContain('Sprint: the rest.');
  });

  it('† shows each of the eleven states for an origin on GitHub, stopped and parked entries first', () => {
    const ids = [
      'shipped1', 'dropped1', 'parked1', 'stopped1', 'merging1', 'claiming1', 'waitmerge1',
      'building1', 'blocked1', 'planning1', 'fresh1',
    ];
    const plan = 'docs/superpowers/plans/2026-11-02-waitmerge.md';
    const catalog = [
      entry('shipped1', { status: 'shipped' }),
      entry('dropped1', { status: 'dropped' }),
      entry('parked1'),
      entry('stopped1'),
      entry('merging1', { status: 'building' }),
      entry('claiming1'),
      entry('waitmerge1', { status: 'building', refs: ['docs/superpowers/specs/s.md', plan] }),
      entry('building1', { status: 'building' }),
      entry('blocked1', { blockedBy: ['notship1'] }),
      entry('planning1'),
      entry('fresh1'),
      entry('notship1', { status: 'idea' }),
    ];
    const bands = Object.fromEntries(ids.map((id) => [id, row('A', 3, 3)]));
    const world = makeWorld(catalog, bands, {
      [plan]: '# Plan\n\n**Merges after:** building1\n\n## Delivers\n\nwaitmerge1\n',
    });
    const clone = makeClone(world);
    expect(run(clone, ['start', ...ids], at(T0)).status).toBe(0);
    run(clone, ['mark', 'parked1', 'parked', 'needs', 'a', 'choice']);
    run(clone, ['mark', 'stopped1', 'stopped', 'usage', 'limit']);
    run(clone, ['mark', 'planning1', 'planning']);
    const gh = stubGh(world, [
      { number: 11, headRefName: 'plan/merging1-slug' },
      { number: 12, headRefName: 'plan/claiming1-slug' },
      { number: 99, headRefName: 'feature/unrelated' },
    ]);
    const env = at('2026-11-02T10:30:00Z', { ...pretendGitHub(clone), ...gh.env });

    const r = run(clone, ['status'], env);
    expect(r.status).toBe(0);
    const out = lines(r);
    expect(out[0]).toMatch(/^Sprint: could not fetch origin — .+; reading origin\/main as last fetched\.$/);
    expect(out.slice(1, 3)).toEqual([
      'Sprint: started 2026-11-02T09:00:00Z, 1.5 h ago; 3 of 33 effort points shipped, 20 budgeted.',
      expect.stringMatching(/^Merge token: /),
    ]);
    expect(out.slice(3)).toEqual([
      'Sprint: needs you — 2 stopped or parked.',
      '  parked1 — parked: needs a choice',
      '  stopped1 — stopped: usage limit',
      'Sprint: the rest.',
      '  shipped1 — shipped',
      '  dropped1 — dropped',
      '  merging1 — merging (#11)',
      '  claiming1 — claiming (#12)',
      '  waitmerge1 — waiting to merge, after building1',
      '  building1 — building',
      '  blocked1 — waiting for notship1 to ship',
      '  planning1 — planning',
      '  fresh1 — not started',
      'Sprint: other open pull requests — #99 feature/unrelated.',
    ]);
  });

  it('† lists an open pull request no entry accounts for, and a new bug and a new feature, the bug first', () => {
    const world = makeWorld([entry('e1')], { e1: row('A', 3, 3) });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1'], at(T0)).status).toBe(0);
    publish(world, {
      'feature-catalog.yaml': YAML.stringify([
        entry('e1'), entry('f-new', { type: 'feature', title: 'A new feature' }),
        entry('b-new', { type: 'bug', title: 'A new bug' }),
      ]),
    });
    git(clone, ['fetch', '-q', 'origin']);
    const gh = stubGh(world, [
      { number: 5, headRefName: 'plan/e1-slug' }, { number: 7, headRefName: 'other/work' },
      { number: 8, headRefName: 'dependabot/x' },
    ]);
    const env = at(T0, { ...pretendGitHub(clone), ...gh.env });

    const out = lines(run(clone, ['status'], env));
    expect(out).toContain('Sprint: other open pull requests — #7 other/work, #8 dependabot/x.');
    expect(out).toContain('  e1 — claiming (#5)');
    expect(out[out.length - 1]).toBe(
      'Sprint: new in the backlog since the start — b-new [bug] A new bug; f-new [feature] A new feature.',
    );
  });

  it('† says open pull requests are unknown when origin is not on GitHub, and never runs gh', () => {
    const world = makeWorld([entry('e1')], { e1: row('A', 3, 3) });
    const clone = makeClone(world);
    const gh = stubGh(world, []);
    const env = at(T0, gh.env);
    expect(run(clone, ['start', 'e1'], env).status).toBe(0);

    const r = run(clone, ['status'], env);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Sprint: open pull requests unknown — origin is not on GitHub.\n');
    expect(r.stdout).toContain('  e1 — not started');
    expect(gh.calls()).toEqual([]);
  });

  it('† asks GitHub for open pull requests through the REST API, never gh pr list', () => {
    const world = makeWorld([entry('e1')], { e1: row('A', 3, 3) });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1'], at(T0)).status).toBe(0);
    const gh = stubGh(world, [{ number: 5, headRefName: 'plan/e1-slug' }]);
    const env = at(T0, { ...pretendGitHub(clone), ...gh.env });

    const out = lines(run(clone, ['status'], env));
    expect(out).toContain('  e1 — claiming (#5)');
    const pullCalls = gh.calls().map((c) => JSON.parse(c)).filter((c) => ['pr', 'api'].includes(c[0]));
    expect(pullCalls).toEqual([['api', 'repos/{owner}/{repo}/pulls?state=open&per_page=100']]);
  });

  it('† says open pull requests are unknown with gh’s own line when gh refuses', () => {
    const world = makeWorld([entry('e1')], { e1: row('A', 3, 3) });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1'], at(T0)).status).toBe(0);
    const gh = stubGh(world, null);
    const env = at(T0, { ...pretendGitHub(clone), ...gh.env });

    const r = run(clone, ['status'], env);
    expect(r.status).toBe(0);
    const out = lines(r);
    expect(out).toContainEqual(expect.stringMatching(
      /^Sprint: open pull requests unknown — stub gh: unexpected call: api repos\/\{owner\}\/\{repo\}\/pulls/,
    ));
    expect(out).toContain('  e1 — not started');
  });
});

describe('add, drop, mark and note', () => {
  const entries = ['e1', 'e2', 'e5', 'e3', 'e4'].map((id) => entry(id));
  const bands = Object.fromEntries(['e1', 'e2', 'e5', 'e3', 'e4'].map((id) => [id, row('A', 3, 3)]));

  it('† names the entries not started that would make room, from the end, and removes none', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1', 'e2', 'e5', '--points', '9'], at(T0)).status).toBe(0);
    run(clone, ['mark', 'e1', 'planning']);

    const first = run(clone, ['add', 'e3']);
    expect(first.status).toBe(0);
    expect(lines(first)).toEqual([
      'Sprint: added e3 (3 pts); 12 of 9 effort points.',
      'Sprint: over the budget by 3 effort points — e5 not started yet would leave the sprint to make room.',
    ]);
    const second = run(clone, ['add', 'e4']);
    expect(lines(second)).toEqual([
      'Sprint: added e4 (3 pts); 15 of 9 effort points.',
      'Sprint: over the budget by 6 effort points — e3, e5 not started yet would leave the sprint to make room.',
    ]);
    expect(readSprint(clone).entries.map((e) => e.id)).toEqual(['e1', 'e2', 'e5', 'e3', 'e4']);

    expect(run(clone, ['add', 'e3']).status).toBe(1);
    expect(run(clone, ['add', 'nope']).status).toBe(1);
  });

  it('† adds within the budget with one line, and drop removes an entry and its mark and notes', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1', 'e2'], at(T0)).status).toBe(0);
    expect(run(clone, ['add', 'e3']).stdout).toBe('Sprint: added e3 (3 pts); 9 of 20 effort points.\n');

    run(clone, ['mark', 'e2', 'planning']);
    expect(run(clone, ['note', 'e2', 'took', 'FW-060']).stdout).toBe('Sprint: noted for e2.\n');
    expect(readSprint(clone).notes).toEqual({ e2: ['took FW-060'] });

    const dropped = run(clone, ['drop', 'e2']);
    expect(dropped.stdout).toBe('Sprint: dropped e2; 6 of 20 effort points.\n');
    const file = readSprint(clone);
    expect(file.entries.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(file.marks).toEqual({});
    expect(file.notes).toEqual({});
    expect(run(clone, ['drop', 'e2']).status).toBe(1);

    expect(run(clone, ['mark', 'e1', 'parked']).status).toBe(1);
    expect(run(clone, ['mark', 'e1', 'sleeping']).status).toBe(1);
    expect(run(clone, ['mark', 'e4', 'planning']).status).toBe(1);
    run(clone, ['mark', 'e1', 'stopped', 'a', 'limit']);
    expect(run(clone, ['mark', 'e1', 'clear']).stdout).toBe('Sprint: e1 mark cleared.\n');
    expect(readSprint(clone).marks).toEqual({});
  });
});

describe('archiving team members\' sessions', () => {
  const ids = ['a1', 'k1', 'k2', 'p1', 'n1'];
  const entries = ids.map((id) => entry(id));
  const bands = {
    a1: row('A', 3, 3), k1: row('A', 3, 2, { bundle: 'kiln' }), k2: row('A', 3, 2, { bundle: 'kiln' }),
    p1: row('A', 3, 1), n1: row('A', 3, 1),
  };
  const shippedCatalog = (...done) => YAML.stringify(
    ids.map((id) => entry(id, done.includes(id) ? { status: 'shipped' } : {})),
  );
  const READY = 'Sprint: ready to archive, once the decisions each reported are noted — ';

  /** A session sprint over all five entries, p1 parked. */
  function begin(archive) {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    const started = run(clone, ['start', ...ids, '--way', 'session', '--archive', archive], at(T0));
    expect(started.status).toBe(0);
    expect(run(clone, ['mark', 'p1', 'parked', 'waits', 'for', 'you']).status).toBe(0);
    return { world, clone };
  }

  it('† start records the answer for a session sprint and refuses it for another way', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    const yes = run(clone, ['start', 'a1', '--way', 'session', '--archive', 'yes'], at(T0));
    expect(yes.status).toBe(0);
    expect(lines(yes)[1]).toBe("Sprint: each team member's session is archived once its work ships.");
    expect(readSprint(clone)).toMatchObject({ archive: true, archived: [] });

    const other = makeClone(makeWorld(entries, bands));
    const no = run(other, ['start', 'a1', '--way', 'session', '--archive', 'no'], at(T0));
    expect(no.status).toBe(0);
    expect(lines(no)[1]).toBe("Sprint: each team member's session is left open once its work ships.");
    expect(readSprint(other)).toMatchObject({ archive: false, archived: [] });

    const unsaid = makeClone(makeWorld(entries, bands));
    expect(run(unsaid, ['start', 'a1', '--way', 'session'], at(T0)).status).toBe(0);
    expect(readSprint(unsaid).archive).toBe(false);

    const elsewhere = makeClone(makeWorld(entries, bands));
    const refused = run(elsewhere, ['start', 'a1', '--way', 'here', '--archive', 'yes'], at(T0));
    expect(refused.status).toBe(1);
    expect(refused.stdout).toBe('Sprint: --archive yes needs --way session; no other way leaves a session of this tool to archive.\n');
    expect(readSprint(elsewhere)).toBeNull();

    const maybe = makeClone(makeWorld(entries, bands));
    expect(run(maybe, ['start', 'a1', '--way', 'session', '--archive', 'maybe'], at(T0)).status).toBe(1);
    expect(readSprint(maybe)).toBeNull();
  });

  it('† status names a team member ready to archive only once all it carried has shipped and it is not parked or stopped', () => {
    const { world, clone } = begin('yes');
    publish(world, { 'feature-catalog.yaml': shippedCatalog('a1', 'k1', 'p1') });
    expect(run(clone, ['status'], at(T0)).stdout).toContain(`${READY}a1.\n`);

    publish(world, { 'feature-catalog.yaml': shippedCatalog('a1', 'k1', 'k2', 'p1') });
    expect(run(clone, ['status'], at(T0)).stdout).toContain(`${READY}a1, k1.\n`);

    const archived = run(clone, ['archive', 'a1']);
    expect(archived.status).toBe(0);
    expect(archived.stdout).toBe("Sprint: a1's session is recorded as archived; archive it now.\n");
    expect(run(clone, ['status'], at(T0)).stdout).toContain(`${READY}k1.\n`);

    const { world: w2, clone: c2 } = begin('no');
    publish(w2, { 'feature-catalog.yaml': shippedCatalog(...ids) });
    expect(run(c2, ['status'], at(T0)).stdout).not.toContain('ready to archive');
  });

  it('† archive refuses what it must not record', () => {
    const { world, clone } = begin('yes');
    const refusal = (args) => {
      const r = run(clone, args);
      expect(r.status).toBe(1);
      return r.stdout;
    };
    expect(refusal(['archive', 'n1'])).toBe("Sprint: n1's team member has work not shipped on main — n1.\n");
    expect(refusal(['archive', 'k2'])).toBe("Sprint: k2 is carried by k1's team member; name k1.\n");
    expect(refusal(['archive', 'p1'])).toBe("Sprint: p1's team member is parked; its session stays open.\n");
    refusal(['archive', 'nope']);

    publish(world, { 'feature-catalog.yaml': shippedCatalog('a1') });
    expect(run(clone, ['archive', 'a1']).status).toBe(0);
    expect(refusal(['archive', 'a1'])).toContain("a1's session is already recorded as archived.");
    expect(readSprint(clone).archived).toEqual(['a1']);

    const { clone: c2 } = begin('no');
    const left = run(c2, ['archive', 'a1']);
    expect(left.status).toBe(1);
    expect(left.stdout).toBe('Sprint: this sprint leaves sessions open; archiving was not agreed at its start.\n');
  });
});

describe('brief', () => {
  const BRIEF = (id, title, design) => `Take the backlog item \`${id}\` (${title}) in \`feature-catalog.yaml\` to shipped.
${design ? `Its design: ${design}.\n` : ''}
Follow \`.claude/framework/workflow.md\`, *Delivering a backlog item*, from the wait for what it
is blocked by to the merge: take the merge token yourself and land your own pull
requests. The developer has agreed this sprint, so make the decisions yourself and
report each one. Stop only for what that section allows.

Run every agent signed in to the plan the developer already pays for, never on a key
billed per use.

End your last message with exactly one line: SHIPPED, PARKED: <why> or STOPPED: <why>.
`;

  it('† prints the team member\'s brief, with the design line only for an entry that has a spec', () => {
    const world = makeWorld([
      entry('with', { title: 'With a design', refs: ['docs/superpowers/specs/a.md', 'docs/superpowers/plans/p.md', 'docs/superpowers/specs/b.md'] }),
      entry('without', { title: 'Without one', refs: ['docs/superpowers/plans/p.md'] }),
    ], { with: row('A', 3, 3), without: row('A', 3, 3) });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'with', 'without']).status).toBe(0);

    const a = run(clone, ['brief', 'with']);
    expect(a.status).toBe(0);
    expect(a.stdout).toBe(BRIEF('with', 'With a design',
      '`docs/superpowers/specs/a.md`, `docs/superpowers/specs/b.md`'));
    const b = run(clone, ['brief', 'without']);
    expect(b.stdout).toBe(BRIEF('without', 'Without one', null));
    expect(run(clone, ['brief', 'nope']).status).toBe(1);
  });
});

describe('report and end', () => {
  const entries = [
    entry('s1', { title: 'Shipped one' }), entry('s2', { title: 'Shipped two' }),
    entry('pk'), entry('st'), entry('nd'),
  ];
  const bands = {
    s1: row('A', 3, 3), s2: row('A', 3, 2), pk: row('A', 3, 1), st: row('A', 3, 1), nd: row('A', 3, 1),
  };

  it('† reports what shipped, points per hour, what needs a decision, what is not done, notes and new entries, and end removes the file', () => {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    expect(run(clone, ['start', 's1', 's2', 'pk', 'st', 'nd'], at(T0)).status).toBe(0);
    run(clone, ['mark', 'pk', 'parked', 'needs', 'your', 'call']);
    run(clone, ['mark', 'st', 'stopped', 'usage', 'limit']);
    run(clone, ['note', 'nd', 'took', 'FW-060', 'for', 'the', 'sound']);
    publish(world, {
      'feature-catalog.yaml': YAML.stringify([
        entry('s1', { status: 'shipped' }), entry('s2', { status: 'shipped' }),
        entry('pk'), entry('st'), entry('nd'),
        entry('newbug', { type: 'bug', title: 'A fresh bug' }),
      ]),
    });
    const later = '2026-11-02T11:00:00Z';
    const report = [
      'Sprint report: 2026-11-02T09:00:00Z to 2026-11-02T11:00:00Z, 2.0 h.',
      'Shipped: 2 backlog items, 5 effort points, 2.5 effort points per hour.',
      '  s1 — 3 pts',
      '  s2 — 2 pts',
      'Parked, needs your decision:',
      '  pk — needs your call',
      'Stopped:',
      '  st — usage limit',
      'Not done:',
      '  nd — not started',
      'Decisions team members reported:',
      '  nd — took FW-060 for the sound',
      'New backlog items:',
      '  newbug [bug] — A fresh bug',
    ];

    const r = run(clone, ['report'], at(later));
    expect(r.status).toBe(0);
    expect(lines(r)).toEqual(report);
    expect(onOrigin(clone)).not.toBeNull();

    const ended = run(clone, ['end'], at(later));
    expect(ended.status).toBe(0);
    expect(lines(ended)).toEqual([...report, 'Sprint: ended; the record on origin says no sprint is under way.']);
    expect(onOrigin(clone)).toBeNull();
  });

  it('† prints none under each heading and 0.0 points per hour when nothing has happened', () => {
    const world = makeWorld([entry('e1')], { e1: row('A', 3, 3) });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'e1'], at(T0)).status).toBe(0);
    expect(lines(run(clone, ['report'], at(T0)))).toEqual([
      'Sprint report: 2026-11-02T09:00:00Z to 2026-11-02T09:00:00Z, 0.0 h.',
      'Shipped: 0 backlog items, 0 effort points, 0.0 effort points per hour.',
      '  none.',
      'Parked, needs your decision:',
      '  none.',
      'Stopped:',
      '  none.',
      'Not done:',
      '  e1 — not started',
      'Decisions team members reported:',
      '  none.',
      'New backlog items:',
      '  none.',
    ]);
  });
});

describe('with no sprint under way', () => {
  it('† every command but propose, start and wait exits 1 with one line, and an unknown command exits 2', () => {
    const world = makeWorld([entry('e1')], { e1: row('A', 3, 3) });
    const clone = makeClone(world);
    for (const args of [
      ['status'], ['report'], ['end'], ['add', 'e1'], ['drop', 'e1'],
      ['mark', 'e1', 'planning'], ['note', 'e1', 'x'], ['brief', 'e1'], ['archive', 'e1'],
    ]) {
      const r = run(clone, args);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('Sprint: none under way; run propose, then start.\n');
    }
    const unknown = run(clone, ['frobnicate']);
    expect(unknown.status).toBe(2);
    expect(unknown.stdout).toContain('usage: sprint.mjs');
  });
});

describe('the documents', () => {
  const read = (path) => readFileSync(resolve(here, '..', path), 'utf8');

  it('the workflow has "Delivering a backlog item" before "The cycle", with the rules a team member follows', () => {
    const text = read('framework/workflow.md');
    const section = text.indexOf('## Delivering a backlog item');
    expect(section).toBeGreaterThan(-1);
    expect(section).toBeLessThan(text.indexOf('## The cycle'));
    for (const phrase of ['sprint.mjs wait', 'PARKED: <why>', 'moves back', 'sprint.mjs brief']) {
      expect(text.slice(section, text.indexOf('## The cycle'))).toContain(phrase);
    }
  });

  it('the command names every script command it runs, starts the team in that same turn, and has the two ways', () => {
    const text = read('commands/sprint.md');
    for (const verb of ['propose', 'start', 'brief', 'mark', 'note', 'status', 'add', 'drop', 'end', 'archive']) {
      expect(text).toContain(`sprint.mjs ${verb}`);
    }
    expect(text).toContain('in that same turn');
    expect(text).toContain('--archive yes');
    expect(text).toContain('--archive no');
    expect(text).toContain('--way');
    const ways = text.split('\n').map((l) => l.match(/^\| `([a-z]+)` \|/)?.[1]).filter(Boolean);
    expect(ways).toEqual(['session', 'here', 'claude', 'cursor']);
  });

  it('setup installs the script and the project\'s package has the script', () => {
    expect(read('scripts/installed-scripts.txt').split('\n')).toContain('sprint.mjs');
    expect(JSON.parse(read('templates/package.json')).scripts.sprint).toBe('node ./scripts/sprint.mjs');
  });

  it('exports its pure parts', () => {
    expect(typeof sprint.proposeSprint).toBe('function');
    expect(typeof sprint.statusOf).toBe('function');
  });
});

describe('the team member\'s model', () => {
  const today = new Date().toISOString().slice(0, 10);
  const PICKS = `**Last verified: ${today}.**

| Tier | Models |
|---|---|
| **Large** | Birch 2 *(all)*; Alder 3 *(all)* |
| **Medium–large** | Any pick from a higher tier |
| **Medium** | Cedar 1 *(Cursor)*; or any pick from a higher tier |
| **Small–medium** | Any pick from a higher tier |
| **Small** | Elm 0 *(Cursor)*; Dogwood 1 *(Cursor)*; or any pick from a higher tier |

| Model | Usage per task | Included on |
|---|---|---|
| Alder 3 | $9 per task (Example Index v1, high) | Claude Code: Max (to half the weekly limit), Ultra; Cursor: none |
| Birch 2 | $4 per task (Example Index v1, high) | Claude Code: none; Cursor: Premium |
| Cedar 1 | $1 per task (Example Index v1, high) | Cursor: Plus, Premium |
| Dogwood 1 | unmeasured | Cursor: Premium |
`;
  const RECORD = 'Claude Code: Max\n';
  const entries = [entry('e1'), entry('e2'), entry('e3')];
  const bands = { e1: row('A', 3, 3), e2: row('A', 2, 2), e3: row('B', 1, 1) };
  const DEFAULT = " Start them on the tool's default model.";

  /** A clone, with a picks file and a subscriptions record when given. */
  function setup(picks, record) {
    const world = makeWorld(entries, bands);
    const clone = makeClone(world);
    if (picks !== null) {
      mkdirSync(join(clone, 'docs'), { recursive: true });
      writeFileSync(join(clone, 'docs/model-picks.md'), picks);
    }
    if (record !== null) {
      mkdirSync(join(clone, '.git/tropis'), { recursive: true });
      writeFileSync(join(clone, '.git/tropis/subscriptions.txt'), record);
    }
    return clone;
  }
  const modelLine = (r) => lines(r).find((l) => l.includes('Large tier'));

  it('† a: start for a session sprint names the included Large pick that costs least per task, as dispatch does', () => {
    const clone = setup(PICKS, RECORD);
    const r = run(clone, ['start', 'e1', '--way', 'session']);
    expect(lines(r)).toHaveLength(3);
    expect(lines(r)[2]).toBe(
      'Sprint: team members run on the Large tier. **Use:** Alder 3, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.',
    );
    expect(lines(r)[2].split('tier. ')[1]).toBe(binding.pickToUse(PICKS, 'Large', RECORD));
  });

  it('† b: add under a session sprint ends with the same line', () => {
    const clone = setup(PICKS, RECORD);
    const started = run(clone, ['start', 'e1', '--way', 'session']);
    const added = run(clone, ['add', 'e2']);
    expect(lines(added)).toHaveLength(2);
    expect(lines(added)[0].startsWith('Sprint: added e2')).toBe(true);
    expect(lines(added)[1]).toBe(lines(started)[2]);
  });

  it('† c: with no picks file the line says so and the default model is used', () => {
    const clone = setup(null, RECORD);
    const r = run(clone, ['start', 'e1', '--way', 'session']);
    expect(modelLine(r).endsWith(
      `**Use:** not chosen — this project has no model picks. Run /refresh-model-tiers.${DEFAULT}`,
    )).toBe(true);
  });

  it('† e: with no local record, TROPIS_SUBSCRIPTIONS names the pick', () => {
    const clone = setup(PICKS, null);
    const r = run(clone, ['start', 'e1', '--way', 'session'], { ...ENV, TROPIS_SUBSCRIPTIONS: 'Claude Code: Max' });
    expect(modelLine(r)).toContain('**Use:** Alder 3, in Claude Code');
    expect(modelLine(r)).not.toContain('not chosen');
  });

  it.each([
    ['no record', PICKS, null],
    ['no inclusion table', '**Last verified: 2026-11-02.**\n\n| Tier | Models |\n|---|---|\n| **Large** | Birch 2 *(all)*; Alder 3 *(all)* |\n', RECORD],
    ['no included pick', PICKS, 'Claude Code: Pro\nCursor: none\n'],
  ])('† d: %s names no model and uses the default', (_name, picks, record) => {
    const clone = setup(picks, record);
    const line = modelLine(run(clone, ['start', 'e1', '--way', 'session']));
    expect(line.endsWith(DEFAULT)).toBe(true);
    expect(line).toContain(binding.pickToUse(picks, 'Large', record));
    expect(line).not.toContain('Alder 3');
    expect(line).not.toContain('Birch 2');
  });

  it('† e: a sprint whose team members start here names no model', () => {
    const clone = setup(PICKS, RECORD);
    expect(lines(run(clone, ['start', 'e1']))).toHaveLength(1);
    expect(run(clone, ['add', 'e2']).stdout).not.toContain('Large tier');
  });
});

describe('the record on origin', () => {
  const catalog = [entry('e1'), entry('e2'), entry('e3')];
  const bands = { e1: row('A', 3, 3), e2: row('A', 3, 2), e3: row('B', 2, 5) };

  it('† a sprint started in one clone is under way in another', () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    expect(run(a, ['start', 'e1'], at(T0)).status).toBe(0);
    const b = makeClone(world, 'b');
    const status = run(b, ['status'], at('2026-11-02T10:00:00Z'));
    expect(status.status).toBe(0);
    expect(status.stdout).toContain('Sprint: started 2026-11-02T09:00:00Z');
    expect(onOrigin(b).entries.map((e) => e.id)).toEqual(['e1']);
  });

  it("† a mark from a team member's clone reaches the sprint session", () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    expect(run(a, ['start', 'e1', 'e2'], at(T0)).status).toBe(0);
    const b = makeClone(world, 'b');
    expect(run(b, ['mark', 'e1', 'parked', 'needs', 'a', 'printer']).status).toBe(0);
    expect(run(b, ['note', 'e2', 'took FW-060']).status).toBe(0);
    const status = run(a, ['status'], at('2026-11-02T10:00:00Z'));
    expect(status.stdout).toContain('  e1 — parked: needs a printer\n');
    expect(onOrigin(a).notes).toEqual({ e2: ['took FW-060'] });
  });

  it('† two changes at once both land', () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    const b = makeClone(world, 'b');
    expect(run(a, ['start', 'e1', 'e2'], at(T0)).status).toBe(0);
    // The first change's push is overtaken: b writes while a's change is being computed.
    let calls = 0;
    const result = sprint.updateSprint(a, ENV, (current) => {
      calls += 1;
      if (calls === 1) expect(run(b, ['mark', 'e2', 'parked', 'later']).status).toBe(0);
      return { ...current, marks: { ...current.marks, e1: { state: 'planning' } } };
    });
    expect(calls).toBe(2);
    expect(result.marks).toEqual({ e2: { state: 'parked', reason: 'later' }, e1: { state: 'planning' } });
    expect(onOrigin(a).marks).toEqual(result.marks);
  });

  it('† a change that is overtaken every time refuses with one line', () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    const b = makeClone(world, 'b');
    expect(run(a, ['start', 'e1'], at(T0)).status).toBe(0);
    let n = 0;
    expect(() => sprint.updateSprint(a, ENV, (current) => {
      n += 1;
      run(b, ['note', 'e1', `n${n}`]);
      return { ...current };
    })).toThrow('Sprint: the record kept changing under this command; run it again.');
    expect(n).toBe(5);
  });

  it('† end leaves the branch with no record, and a new sprint can start', () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    expect(run(a, ['start', 'e1'], at(T0)).status).toBe(0);
    const ended = run(a, ['end'], at('2026-11-02T10:00:00Z'));
    expect(ended.status).toBe(0);
    expect(lines(ended).pop()).toBe('Sprint: ended; the record on origin says no sprint is under way.');
    expect(onOrigin(a)).toBeNull();
    expect(git(a, ['ls-remote', 'origin', 'refs/heads/tropis/sprint'])).not.toBe('');
    expect(run(a, ['status']).stdout).toBe('Sprint: none under way; run propose, then start.\n');
    const b = makeClone(world, 'b');
    expect(run(b, ['start', 'e2'], at('2026-11-02T11:00:00Z')).status).toBe(0);
    expect(onOrigin(a).entries.map((e) => e.id)).toEqual(['e2']);
  });

  it('† a local sprint file is carried to origin by the next change', () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    const file = sprintFile(a);
    mkdirSync(dirname(file), { recursive: true });
    const old = {
      started: T0, budget: 20, way: 'here', entries: [{ id: 'e1', points: 3 }],
      baseline: ['e1', 'e2', 'e3'], marks: {}, notes: {},
    };
    writeFileSync(file, `${JSON.stringify(old, null, 2)}\n`);
    expect(run(a, ['status'], at('2026-11-02T10:00:00Z')).stdout).toContain('Sprint: started');
    expect(onOrigin(a)).toBeNull();
    expect(run(a, ['mark', 'e1', 'planning']).status).toBe(0);
    expect(onOrigin(a)).toEqual({ ...old, marks: { e1: { state: 'planning' } } });
    expect(existsSync(file)).toBe(false);
  });

  it('† without an origin the record stays local', () => {
    const world = makeWorld(catalog, bands);
    const a = makeClone(world, 'a');
    git(a, ['remote', 'remove', 'origin']);
    // Without origin there is no origin/main either, so the working tree is the backlog.
    writeFileSync(join(a, 'feature-catalog.yaml'), YAML.stringify(catalog));
    mkdirSync(join(a, 'docs/backlog-board'), { recursive: true });
    writeFileSync(join(a, 'docs/backlog-board/bands.yaml'), YAML.stringify(bands));
    const started = run(a, ['start', 'e1'], at(T0));
    expect(started.status).toBe(0);
    expect(readLocal(a).entries.map((e) => e.id)).toEqual(['e1']);
    expect(run(a, ['mark', 'e1', 'planning']).status).toBe(0);
    expect(readLocal(a).marks).toEqual({ e1: { state: 'planning' } });
    const ended = run(a, ['end'], at('2026-11-02T10:00:00Z'));
    expect(lines(ended).pop()).toBe('Sprint: ended; the sprint file is removed.');
    expect(existsSync(sprintFile(a))).toBe(false);
  });
});
