// Level: unit
/**
 * The merge token: pull requests open one at a time, under a ref on origin that a session
 * takes, waits for, and releases (framework/workflow.md, *The merge token*).
 *
 * The pure functions are imported. The command-line cases run a copy of the script
 * installed at .tropis/scripts/ in a clone of a local bare repository, as a session
 * would, so the lock form of a push is tested for real, including two sessions at once.
 * The cases for an origin on GitHub fake it: the clone's origin URL is a github.com URL
 * whose pushes are redirected to a path that does not exist, and a stateful stub gh
 * placed first on PATH answers the REST calls. Nothing here reaches the network.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, rmSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as token from '../scripts/merge-token.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = resolve(here, '../scripts');
const REF = 'refs/tropis/merge-token';

const roots = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));
const scratch = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (cwd, args, env = ENV) => {
  const r = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

/** A bare origin with main pushed. */
function makeOrigin() {
  const dir = scratch('merge-token-');
  const bare = join(dir, 'origin.git');
  git(dir, ['init', '-q', '--bare', '-b', 'main', bare]);
  const seed = join(dir, 'seed');
  git(dir, ['init', '-q', '-b', 'main', seed]);
  git(seed, ['config', 'user.name', 'Seed']);
  git(seed, ['config', 'user.email', 'seed@example.com']);
  writeFileSync(join(seed, 'README.md'), 'seed\n');
  git(seed, ['add', '.']);
  git(seed, ['commit', '-q', '-m', 'seed']);
  git(seed, ['push', '-q', bare, 'main']);
  return { dir, bare };
}

/** A clone of the origin on `branch`, with the script installed as a project has it. */
function makeClone({ dir, bare }, name, { branch, identity = true } = {}) {
  const clone = join(dir, name);
  git(dir, ['clone', '-q', bare, clone]);
  if (identity) {
    git(clone, ['config', 'user.name', `Session ${name}`]);
    git(clone, ['config', 'user.email', `${name}@example.com`]);
  }
  if (branch) git(clone, ['checkout', '-q', '-b', branch]);
  mkdirSync(join(clone, '.tropis/scripts'), { recursive: true });
  for (const f of ['merge-token.mjs', 'main-status.mjs']) {
    copyFileSync(join(shipped, f), join(clone, '.tropis/scripts', f));
  }
  writeFileSync(join(clone, '.tropis/package.json'), '{"type":"module"}\n');
  return clone;
}

const scriptOf = (clone) => join(clone, '.tropis/scripts/merge-token.mjs');
const run = (clone, args, env = ENV) => spawnSync('node', [scriptOf(clone), ...args], {
  cwd: clone, env, encoding: 'utf8',
});
const runAsync = (clone, args) => new Promise((done) => {
  const child = spawn('node', [scriptOf(clone), ...args], { cwd: clone, env: ENV });
  let stdout = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.on('close', (status) => { done({ status, stdout }); });
});
const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });
const marker = (bare) => git(bare, ['log', '-1', '--format=%B', REF]);
const dropMarker = (bare) => git(bare, ['update-ref', '-d', REF]);

describe('markerMessage and parseMarker', () => {
  it('round-trip the holder, kind and time', () => {
    const parsed = token.parseMarker(token.markerMessage({
      holder: 'plan/a-b', kind: 'hold', taken: '2026-11-02T06:30:00Z',
    }));
    expect(parsed).toEqual({ holder: 'plan/a-b', kind: 'hold', taken: '2026-11-02T06:30:00Z' });
  });

  it('says branch when the kind is absent, and null for a time that is not one', () => {
    expect(token.parseMarker('merge token\n\nholder: x\ntaken: yesterday\n'))
      .toEqual({ holder: 'x', kind: 'branch', taken: null });
  });

  it('returns null without a holder line', () => {
    expect(token.parseMarker('merge token\n\nkind: branch\n')).toBeNull();
    expect(token.parseMarker('')).toBeNull();
  });
});

describe('isStale', () => {
  const base = { kind: 'branch', minutes: 30, openPull: false, tipMinutes: null };
  it.each([
    ['a branch at 30 minutes with no pull request and no branch', base],
    ['a branch whose tip is 30 minutes old', { ...base, tipMinutes: 30 }],
  ])('is stale for %s', (_, input) => expect(token.isStale(input)).toBe(true));

  it.each([
    ['29 minutes', { ...base, minutes: 29 }],
    ['an open pull request', { ...base, openPull: true }],
    ['a tip 5 minutes old', { ...base, tipMinutes: 5 }],
    ['a hold at any age', { ...base, kind: 'hold', minutes: 5000 }],
  ])('is not stale for %s', (_, input) => expect(token.isStale(input)).toBe(false));
});

describe('against a local origin', () => {
  it('takes the token for the branch, shows it held, and keeps it on a second take', () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a', { branch: 'plan/a' });

    expect(run(a, []).stdout).toBe('Merge token: free.\n');
    const taken = run(a, ['take']);
    expect(taken.stdout).toBe('Merge token: taken by plan/a.\n');
    expect(taken.status).toBe(0);
    expect(marker(origin.bare)).toContain('holder: plan/a');
    expect(marker(origin.bare)).toContain('kind: branch');
    expect(run(a, ['status']).stdout).toBe('Merge token: held by plan/a for 0 min.\n');
    const again = run(a, ['take']);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('already held by plan/a');
  });

  it('lets exactly one of two simultaneous takes through, five rounds running', async () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a');
    const b = makeClone(origin, 'b');
    // Without a delay on the server, one session finishes before the other has read,
    // and the loser never reaches the push. Holding every push for half a second lets
    // both read "free" and both push, so the refusal of the second is what is tested.
    const hook = join(origin.bare, 'hooks/pre-receive');
    writeFileSync(hook, '#!/bin/sh\nsleep 0.5\n');
    chmodSync(hook, 0o755);
    for (let round = 0; round < 5; round += 1) {
      const [ra, rb] = await Promise.all([
        runAsync(a, ['take', '--holder', 'a', '--interval', '0', '--timeout', '0.02']),
        runAsync(b, ['take', '--holder', 'b', '--interval', '0', '--timeout', '0.02']),
      ]);
      const [winner, loser, winnerName] = ra.status === 0 ? [ra, rb, 'a'] : [rb, ra, 'b'];
      expect([ra.status, rb.status].sort()).toEqual([0, 3]);
      expect(winner.stdout).toContain(`taken by ${winnerName}`);
      expect(loser.stdout).toBe(`STOPPED: waiting for the token, held by ${winnerName}\n`);
      expect(marker(origin.bare)).toContain(`holder: ${winnerName}`);
      dropMarker(origin.bare);
    }
  }, 60000);

  it('gets the token when the holder releases while it waits', async () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a');
    const b = makeClone(origin, 'b');
    expect(run(a, ['take', '--holder', 'a']).status).toBe(0);

    const waiting = runAsync(b, ['take', '--holder', 'b', '--interval', '0.1', '--timeout', '0.5']);
    await sleep(1000);
    expect(run(a, ['release', '--holder', 'a']).status).toBe(0);
    const result = await waiting;

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('taken by b');
    expect(marker(origin.bare)).toContain('holder: b');
  }, 30000);

  it('releases only for its holder', () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a');
    expect(run(a, ['take', '--holder', 'a']).status).toBe(0);
    const before = git(origin.bare, ['rev-parse', REF]);

    const refused = run(a, ['release', '--holder', 'b']);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toContain('held by a, not b');
    expect(git(origin.bare, ['rev-parse', REF])).toBe(before);

    const released = run(a, ['release', '--holder', 'a']);
    expect(released.status).toBe(0);
    expect(released.stdout).toBe('Merge token: released by a.\n');
    expect(spawnSync('git', ['rev-parse', '--verify', '--quiet', REF], { cwd: origin.bare }).status).not.toBe(0);

    const nothing = run(a, ['release', '--holder', 'a']);
    expect(nothing.status).toBe(0);
    expect(nothing.stdout).toContain('nothing to release');
  });

  it('breaks the token for whoever is named, and only that holder', () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a');
    expect(run(a, ['take', '--holder', 'a']).status).toBe(0);
    const other = run(a, ['break', '--holder', 'b']);
    expect(other.status).toBe(1);
    expect(other.stdout).toContain('held by a, not b; not broken');
    expect(git(origin.bare, ['rev-parse', '--verify', REF])).toMatch(/^[0-9a-f]{40}$/);

    const broken = run(a, ['break', '--holder', 'a']);
    expect(broken.status).toBe(0);
    expect(broken.stdout).toBe('Merge token: broken — it was held by a.\n');
    expect(run(a, []).stdout).toBe('Merge token: free.\n');
    expect(run(a, ['break', '--holder', 'a']).stdout).toContain('nothing to break');
  });

  it('holds the token in git user.name for a hold, and says so', () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a', { identity: false });
    const config = join(origin.dir, 'global.gitconfig');
    writeFileSync(config, '[user]\n\tname = Hold Person\n\temail = hold@example.com\n');
    const env = { ...ENV, GIT_CONFIG_GLOBAL: config };

    const taken = run(a, ['take', '--hold'], env);
    expect(taken.stdout).toBe('Merge token: taken by Hold Person.\n');
    expect(marker(origin.bare)).toContain('kind: hold');
    expect(run(a, [], env).stdout).toBe('Merge token: held by Hold Person (a hold) for 0 min.\n');
    expect(run(a, ['release', '--hold'], env).stdout).toBe('Merge token: released by Hold Person.\n');
  });

  it('exits 2 with no remote named origin', () => {
    const dir = scratch('merge-token-bare-');
    git(dir, ['init', '-q', '-b', 'main']);
    mkdirSync(join(dir, '.tropis/scripts'), { recursive: true });
    for (const f of ['merge-token.mjs', 'main-status.mjs']) {
      copyFileSync(join(shipped, f), join(dir, '.tropis/scripts', f));
    }
    writeFileSync(join(dir, '.tropis/package.json'), '{"type":"module"}\n');
    const r = run(dir, ['take', '--holder', 'a']);
    expect(r.status).toBe(2);
    expect(r.stdout).toBe('Merge token: could not take — no remote named origin.\n');
    expect(run(dir, []).stdout).toBe('Merge token: could not tell — no remote named origin.\n');
  });

  it('refuses a ref under refs/heads/ and one that is not a ref', () => {
    const origin = makeOrigin();
    const a = makeClone(origin, 'a');
    expect(run(a, ['take', '--holder', 'a', '--ref', 'refs/heads/x']).status).toBe(2);
    expect(run(a, ['take', '--holder', 'a', '--ref', 'refs/tags/x']).status).toBe(2);
    expect(run(a, ['take', '--holder', 'a', '--ref', 'x']).status).toBe(2);
    expect(run(a, ['break']).status).toBe(2);
    expect(run(a, ['take', '--holder', 'a\nb']).status).toBe(2);
    expect(spawnSync('git', ['for-each-ref', 'refs/heads/x'], { cwd: origin.bare, encoding: 'utf8' }).stdout).toBe('');
  });
  describe('with no time limit', () => {
    const GIT_IDENTITY = {
      ...ENV,
      GIT_AUTHOR_NAME: 'Seed', GIT_AUTHOR_EMAIL: 'seed@example.com',
      GIT_COMMITTER_NAME: 'Seed', GIT_COMMITTER_EMAIL: 'seed@example.com',
    };
    const stamp = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

    /** Writes a marker straight into the bare origin, taken `minutesAgo` minutes ago. */
    function plantMarker({ bare }, holder, minutesAgo, kind = 'branch') {
      const tree = git(bare, ['rev-parse', 'main^{tree}']);
      const text = token.markerMessage({ holder, kind, taken: stamp(Date.now() - minutesAgo * 60000) });
      const sha = git(bare, ['commit-tree', tree, '-m', text], GIT_IDENTITY);
      git(bare, ['update-ref', REF, sha]);
    }

    /** take through the command line, with no --timeout, killed if it never stops. */
    const takeUnlimited = (clone, holder) => spawnSync('node', [
      scriptOf(clone), 'take', '--holder', holder, '--interval', '0',
    ], { cwd: clone, env: ENV, encoding: 'utf8', timeout: 15000 });

    /** A clock that moves 20 minutes on each pause; `onPause(n)` runs the n-th one. */
    function simulatedTime(onPause) {
      const clock = { ms: Date.now(), pauses: 0 };
      return {
        clock,
        now: () => clock.ms,
        sleep: async () => {
          clock.pauses += 1;
          clock.ms += 20 * 60000;
          await onPause(clock.pauses, clock.ms);
        },
      };
    }

    it('takes the token after two hours of waiting on a holder that keeps pushing', async () => {
      const origin = makeOrigin();
      const a = makeClone(origin, 'a');
      const b = makeClone(origin, 'b', { branch: 'plan/b' });
      expect(run(b, ['take']).status).toBe(0);
      git(b, ['push', '-q', 'origin', 'plan/b']);
      const { now, sleep: pause, clock } = simulatedTime((n, ms) => {
        git(b, ['commit', '-q', '--allow-empty', '-m', `work ${n}`], { ...ENV, GIT_COMMITTER_DATE: stamp(ms) });
        git(b, ['push', '-q', 'origin', 'plan/b']);
        if (n === 6) expect(run(b, ['release']).status).toBe(0);
      });

      const result = await token.take(a, {
        env: ENV, holder: 'plan/a', intervalMs: 0, now, sleep: pause,
      });

      expect(result.exit).toBe(0);
      expect(result.line).toContain('taken by plan/a');
      expect(clock.pauses).toBeGreaterThanOrEqual(6);
    }, 60000);

    it('stops, naming a holder with no branch and no push for half an hour', () => {
      const origin = makeOrigin();
      const a = makeClone(origin, 'a');
      plantMarker(origin, 'plan/gone', 45);
      const r = takeUnlimited(a, 'plan/a');
      expect(r.stdout).toBe('STOPPED: waiting for the token, held by plan/gone, which is stale — '
        + 'no push for 30 min. Break it only on the developer\'s word: '
        + 'node .tropis/scripts/merge-token.mjs break --holder plan/gone\n');
      expect(r.status).toBe(3);
    }, 20000);

    it('shows that holder as stale in the status line, and not once its branch has a push', () => {
      const origin = makeOrigin();
      const a = makeClone(origin, 'a', { branch: 'plan/a' });
      plantMarker(origin, 'plan/gone', 45);
      const line = run(a, []).stdout;
      expect(line).toContain('held by plan/gone for 45 min — stale: no push for 30 min.');
      expect(line).toContain('break --holder plan/gone');

      git(a, ['push', '-q', 'origin', 'HEAD:refs/heads/plan/gone']);
      expect(run(a, []).stdout).not.toContain('stale');
    });

    it('keeps waiting on a hold, however old, until it is released', async () => {
      const origin = makeOrigin();
      const a = makeClone(origin, 'a');
      const b = makeClone(origin, 'b');
      plantMarker(origin, 'Some Person', 500, 'hold');
      const { now, sleep: pause, clock } = simulatedTime((n) => {
        if (n === 6) expect(run(b, ['release', '--holder', 'Some Person']).status).toBe(0);
      });

      const result = await token.take(a, {
        env: ENV, holder: 'plan/a', intervalMs: 0, now, sleep: pause,
      });

      expect(clock.pauses).toBe(6);
      expect(result.exit).toBe(0);
      expect(result.line).toContain('taken by plan/a');
    }, 60000);
  });
});

describe('against an origin on GitHub, faked', () => {
  // A stub gh that keeps its state in $STUB_DIR/state.json and logs each call to
  // gh.log. State: ref (sha or null), commits (sha to message), createReplies (one per
  // ref create: ok, ok-but-500, 500, rival-422), rival (sha and message a 422 leaves
  // behind), readsFail, pulls, branch (a date, or null for no such branch).
  const STUB_GH = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dir = process.env.STUB_DIR;
const file = path.join(dir, 'state.json');
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const args = process.argv.slice(2);
fs.appendFileSync(path.join(dir, 'gh.log'), JSON.stringify(args) + '\\n');
const save = () => fs.writeFileSync(file, JSON.stringify(state));
const fail = (status, message, body) => {
  if (body) process.stdout.write(JSON.stringify({ message, status: String(status) }));
  process.stderr.write('gh: ' + message + ' (HTTP ' + status + ')\\n');
  process.exit(1);
};
const flag = (name) => {
  const hit = args.find((a, i) => args[i - 1] === '-f' && a.startsWith(name + '='));
  return hit ? hit.slice(name.length + 1) : undefined;
};
const url = args.find((a) => a.startsWith('repos/'));
const method = args.includes('-X') ? args[args.indexOf('-X') + 1] : 'GET';
if (args[0] !== 'api' || !url) { process.stderr.write('stub gh: unexpected call: ' + args.join(' ') + '\\n'); process.exit(99); }
if (method === 'POST' && url.endsWith('/git/commits')) {
  state.counter = (state.counter || 0) + 1;
  const sha = String(state.counter).padStart(40, 'c');
  state.commits[sha] = flag('message');
  save();
  process.stdout.write(JSON.stringify({ sha }));
} else if (method === 'POST' && url.endsWith('/git/refs')) {
  const reply = (state.createReplies || []).shift() || 'ok';
  const sha = flag('sha');
  if (reply === 'ok' || reply === 'ok-but-500') state.ref = sha;
  if (reply === 'rival-422') { state.ref = state.rival.sha; state.commits[state.rival.sha] = state.rival.message; }
  save();
  if (reply === 'ok') process.stdout.write('{}');
  else if (reply === '422' || reply === 'rival-422') fail(422, 'Reference already exists', true);
  else fail(500, 'Internal Server Error', false);
} else if (method === 'DELETE') {
  state.ref = null;
  save();
} else if (url.includes('/git/ref/')) {
  if (state.readsFail) fail(500, 'Internal Server Error', false);
  if (!state.ref) fail(404, 'Not Found', true);
  process.stdout.write(JSON.stringify({ object: { sha: state.ref } }));
} else if (url.includes('/git/commits/')) {
  process.stdout.write(JSON.stringify({ message: state.commits[url.split('/').pop()] }));
} else if (url.startsWith('repos/{owner}/{repo}/pulls')) {
  process.stdout.write(JSON.stringify(state.pulls || []));
} else if (url.includes('/branches/')) {
  if (!state.branch) fail(404, 'Branch not found', true);
  process.stdout.write(JSON.stringify({ commit: { commit: { committer: { date: state.branch } } } }));
} else { process.stderr.write('stub gh: unexpected call: ' + args.join(' ') + '\\n'); process.exit(99); }
`;

  const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const message = (holder, taken, kind = 'branch') => token.markerMessage({ holder, kind, taken });

  /** A clone whose origin is on GitHub as far as the script can tell. */
  function stage(initial = {}) {
    const origin = makeOrigin();
    const clone = makeClone(origin, 'a', { branch: 'plan/a' });
    git(clone, ['remote', 'set-url', 'origin', 'https://github.com/acme/kiln.git']);
    git(clone, ['config', 'url./no/such/path.pushInsteadOf', 'https://github.com/acme/kiln.git']);
    const stub = join(origin.dir, 'stub');
    mkdirSync(join(stub, 'bin'), { recursive: true });
    writeFileSync(join(stub, 'bin/gh'), STUB_GH);
    chmodSync(join(stub, 'bin/gh'), 0o755);
    writeFileSync(join(stub, 'gh.log'), '');
    writeFileSync(join(stub, 'state.json'), JSON.stringify({ ref: null, commits: {}, ...initial }));
    const env = { ...ENV, STUB_DIR: stub, PATH: `${join(stub, 'bin')}:${process.env.PATH}` };
    const calls = () => readFileSync(join(stub, 'gh.log'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const callsTo = (method, part) => calls().filter((c) => {
      const m = c.includes('-X') ? c[c.indexOf('-X') + 1] : 'GET';
      return m === method && c.some((a) => a.includes(part));
    });
    return { clone, env, calls, callsTo };
  }

  const SHA = 'a'.repeat(40);

  it('reads the marker before deciding when the create fails for another reason', () => {
    // The create in fact succeeded and the reply was lost: the next read shows the
    // marker this session sent, so it holds the token and does not create it again.
    const { clone, env, callsTo } = stage({ createReplies: ['ok-but-500'] });
    const r = run(clone, ['take', '--holder', 'plan/a', '--interval', '0', '--timeout', '0.01'], env);
    expect(r.stdout).toContain('already held by plan/a');
    expect(r.status).toBe(0);
    expect(callsTo('POST', '/git/refs')).toHaveLength(1);
  });

  it('waits and stops, naming the holder, when the create says the reference exists', () => {
    const rival = { sha: SHA, message: message('other', ago(1)) };
    const { clone, env } = stage({ createReplies: ['rival-422'], rival });
    const r = run(clone, ['take', '--holder', 'plan/a', '--interval', '0', '--timeout', '0.01'], env);
    expect(r.status).toBe(3);
    expect(r.stdout).toBe('STOPPED: waiting for the token, held by other\n');
  });

  it('gives up after three failed reads', () => {
    const { clone, env, callsTo } = stage({ readsFail: true });
    const r = run(clone, ['take', '--holder', 'plan/a', '--interval', '0'], env);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/^Merge token: could not take — /);
    expect(callsTo('GET', '/git/ref/')).toHaveLength(3);
  });

  it('releases through the API when the push cannot, but only its own marker', () => {
    const mine = stage({ ref: SHA, commits: { [SHA]: message('plan/x', ago(1)) } });
    const done = run(mine.clone, ['release', '--holder', 'plan/x'], mine.env);
    expect(done.stdout).toBe('Merge token: released by plan/x through the API.\n');
    expect(done.status).toBe(0);
    expect(mine.callsTo('DELETE', '/git/refs/tropis/merge-token')).toHaveLength(1);

    const theirs = stage({ ref: SHA, commits: { [SHA]: message('other', ago(1)) } });
    const refused = run(theirs.clone, ['release', '--holder', 'plan/x'], theirs.env);
    expect(refused.status).toBe(1);
    expect(theirs.callsTo('DELETE', '/git/refs')).toHaveLength(0);
  });

  it('stops naming a holder GitHub shows stale: no pull request and no push for half an hour', () => {
    const { clone, env } = stage({
      ref: SHA, commits: { [SHA]: message('plan/x', ago(45)) }, pulls: [], branch: null,
    });
    const r = spawnSync('node', [scriptOf(clone), 'take', '--holder', 'plan/a', '--interval', '0'], {
      cwd: clone, env, encoding: 'utf8', timeout: 15000,
    });
    expect(r.stdout).toBe('STOPPED: waiting for the token, held by plan/x, which is stale — '
      + 'no open pull request and no push for 30 min. Break it only on the developer\'s word: '
      + 'node .tropis/scripts/merge-token.mjs break --holder plan/x\n');
    expect(r.status).toBe(3);
  }, 20000);

  it('does not call a holder with an open pull request stale: only the limit stops the wait', () => {
    const { clone, env } = stage({
      ref: SHA, commits: { [SHA]: message('plan/x', ago(45)) },
      pulls: [{ head: { ref: 'plan/x' } }], branch: null,
    });
    const r = run(clone, ['take', '--holder', 'plan/a', '--interval', '0', '--timeout', '0.01'], env);
    expect(r.status).toBe(3);
    expect(r.stdout).toBe('STOPPED: waiting for the token, held by plan/x\n');
  });

  it('shows a token held 45 minutes by a branch with no pull request and no push as stale', () => {
    const held = { ref: SHA, commits: { [SHA]: message('plan/x', ago(45)) } };
    const stale = stage({ ...held, pulls: [], branch: null });
    const line = run(stale.clone, [], stale.env).stdout;
    expect(line).toContain('held by plan/x for 45 min');
    expect(line).toContain('stale');
    expect(line).toContain('break --holder plan/x');

    const open = stage({ ...held, pulls: [{ head: { ref: 'plan/x' } }], branch: null });
    expect(run(open.clone, [], open.env).stdout).not.toContain('stale');

    const pushed = stage({ ...held, pulls: [], branch: ago(5) });
    expect(run(pushed.clone, [], pushed.env).stdout).not.toContain('stale');

    const hold = stage({ ref: SHA, commits: { [SHA]: message('Some Person', ago(500), 'hold') }, pulls: [], branch: null });
    const holdLine = run(hold.clone, [], hold.env).stdout;
    expect(holdLine).toContain('(a hold)');
    expect(holdLine).not.toContain('stale');
  });
});

describe('the documents', () => {
  const read = (path) => readFileSync(resolve(here, '..', path), 'utf8');

  it('workflow.md takes the token after the wait for overlapping plans and releases it after', () => {
    const workflow = read('framework/workflow.md');
    const merging = workflow.slice(workflow.indexOf('\n## Merging'));
    const wait = merging.indexOf('plan-overlap.mjs --wait');
    const take = merging.indexOf('merge-token.mjs take');
    const rebase = merging.indexOf('git rebase origin/main');
    const release = merging.indexOf('merge-token.mjs release');
    expect(wait).toBeGreaterThan(-1);
    expect(take).toBeGreaterThan(wait);
    expect(rebase).toBeGreaterThan(take);
    expect(release).toBeGreaterThan(rebase);
    expect(existsSync(resolve(here, '../scripts/merge-token.mjs'))).toBe(true);
  });

  it('release.md takes and gives back a hold', () => {
    const release = read('commands/release.md');
    expect(release).toContain('merge-token.mjs take --hold');
    expect(release).toContain('merge-token.mjs release --hold');
  });

  it('next.md mentions the merge token', () => {
    expect(read('commands/next.md')).toContain('merge token');
  });
});
