// Level: unit
/**
 * A sprint team member started in Claude Code's or Cursor's command line: the seam
 * (scripts/team-member-cli.mjs) and the launcher, the detached run and the watch in
 * scripts/sprint.mjs (framework/DECISIONS.md, the decision after FW-055; commands/sprint.md).
 *
 * Nothing here reaches the network or a real agent. A folder first on PATH holds fake
 * `claude` and `cursor-agent` scripts that record how they were started and print
 * stream-json lines chosen by FAKE_MODE. The script under test is a copy installed at
 * .tropis/scripts/ in a clone of a local bare repository, as a team member would run it.
 */
import { spawnSync } from 'node:child_process';
import {
  readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, rmSync,
  existsSync, symlinkSync, realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
// Namespace imports, so a missing export fails the case that uses it and not the file.
import * as cli from '../scripts/team-member-cli.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = resolve(here, '../scripts');
const FILES = [
  'sprint.mjs', 'next-work.js', 'board-bands.js', 'plan-binding.js', 'projections.js',
  'main-status.mjs', 'merge-token.mjs', 'team-member-cli.mjs',
];
const read = (path) => readFileSync(resolve(here, '..', path), 'utf8');
const T = 60000;

const roots = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));
const pids = new Set();
afterAll(() => pids.forEach((pid) => { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }));
const scratch = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
delete ENV.TROPIS_SPRINT_NOW;
delete ENV.TROPIS_TEAM_PROMPT;
const git = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, env: ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });
const until = async (test, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (test()) return true;
    await sleep(100);
  }
  return false;
};

const entry = (id, over = {}) => ({
  id, title: `Title ${id}`, status: 'shaped', value: 'A value.', acceptanceCriteria: [],
  type: 'feature', layer: 'product', modules: [], refs: [], ...over,
});
const row = (band, value, effort) => ({
  band, value, valueWhy: 'why', effort, effortWhy: 'why', verdict: 'verdict',
});

function makeWorld(entries, bands, extra = {}) {
  const dir = scratch('team-cli-');
  const bare = join(dir, 'origin.git');
  git(dir, ['init', '-q', '--bare', '-b', 'main', bare]);
  const seed = join(dir, 'seed');
  git(dir, ['init', '-q', '-b', 'main', seed]);
  git(seed, ['config', 'user.name', 'Seed']);
  git(seed, ['config', 'user.email', 'seed@example.com']);
  const world = { dir, bare, seed };
  publish(world, {
    'feature-catalog.yaml': YAML.stringify(entries),
    'docs/backlog-board/bands.yaml': YAML.stringify(bands),
    ...extra,
  }, 'seed');
  return world;
}

function publish(world, files, message = 'change') {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(world.seed, path)), { recursive: true });
    writeFileSync(join(world.seed, path), text);
  }
  git(world.seed, ['add', '.']);
  git(world.seed, ['commit', '-q', '-m', message]);
  git(world.seed, ['push', '-q', world.bare, 'main']);
}

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

const run = (clone, args, env = ENV) => spawnSync(
  'node', [join(clone, '.tropis/scripts/sprint.mjs'), ...args],
  { cwd: clone, env, encoding: 'utf8' },
);
const lines = (r) => r.stdout.split('\n').filter((l) => l !== '');
const teamDir = (clone) => join(resolve(clone, git(clone, ['rev-parse', '--git-common-dir'])), 'tropis/team');
const sprintFile = (clone) => join(resolve(clone, git(clone, ['rev-parse', '--git-common-dir'])), 'tropis/sprint.json');
const readSprint = (clone) => JSON.parse(readFileSync(sprintFile(clone), 'utf8'));
const resultOf = (clone, id) => JSON.parse(readFileSync(join(teamDir(clone), `${id}.json`), 'utf8'));
const hasResult = (clone, id) => existsSync(join(teamDir(clone), `${id}.json`));
const worktreeOf = (clone, id) => join(dirname(clone), `${clone.split('/').pop()}-team-${id}`);

const FAKE = `#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const argv = process.argv.slice(2);
if (argv[0] === '--version') { console.log('fake 1.0'); process.exit(0); }
const env = {};
for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CURSOR_API_KEY']) env[k] = k in process.env;
if (process.env.FAKE_RECORD) {
  fs.appendFileSync(process.env.FAKE_RECORD, JSON.stringify({ argv, cwd: process.cwd(), pid: process.pid, env }) + '\\n');
}
const mode = process.env.FAKE_MODE || 'shipped';
const emit = (o) => console.log(JSON.stringify(o));
const sid = 'sess-1';
const result = (extra) => emit({ type: 'result', subtype: 'success', is_error: false, session_id: sid, ...extra });
const ship = () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-'));
  const g = (args, cwd) => cp.execFileSync('git', ['-c', 'user.name=Fake', '-c', 'user.email=fake@example.com', ...args],
    { cwd, env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' }, stdio: 'ignore' });
  g(['clone', '-q', process.env.FAKE_ORIGIN, path.join(tmp, 'c')], tmp);
  fs.writeFileSync(path.join(tmp, 'c/feature-catalog.yaml'), fs.readFileSync(process.env.FAKE_CATALOG));
  g(['commit', '-qam', 'ship'], path.join(tmp, 'c'));
  g(['push', '-q', 'origin', 'HEAD:main'], path.join(tmp, 'c'));
};
const go = () => {
  if (mode === 'silent') process.exit(1);
  if (mode === 'error') { result({ is_error: true, subtype: 'error_during_execution', result: 'boom\\nmore' }); return; }
  if (mode === 'parked') { result({ result: 'blocked\\nPARKED: needs a decision' }); return; }
  if (mode === 'denied') {
    result({ result: 'refused\\nSTOPPED: git push refused', permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'git push' } }] });
    return;
  }
  if (mode === 'shipped') ship();
  result({ result: 'done\\nSHIPPED' });
};
console.log('not json at all');
emit({ type: 'system', subtype: 'init', session_id: sid });
if (mode === 'slow') setTimeout(() => result({ result: 'late\\nSHIPPED' }), Number(process.env.FAKE_SLEEP || 5) * 1000);
else go();
`;

/** Fake tools first on PATH, and the environment a launch is run with. */
function withFakes(world, extra = {}) {
  const bin = join(world.dir, 'fakebin');
  mkdirSync(bin, { recursive: true });
  for (const name of ['claude', 'cursor-agent']) {
    writeFileSync(join(bin, name), FAKE);
    chmodSync(join(bin, name), 0o755);
  }
  const record = join(world.dir, 'record.jsonl');
  writeFileSync(join(world.dir, 'shipped-catalog.yaml'), '');
  return {
    record,
    env: {
      ...ENV,
      PATH: `${bin}:${ENV.PATH}`,
      FAKE_RECORD: record,
      FAKE_ORIGIN: world.bare,
      FAKE_CATALOG: join(world.dir, 'shipped-catalog.yaml'),
      ANTHROPIC_API_KEY: 'k1',
      ANTHROPIC_AUTH_TOKEN: 'k2',
      CURSOR_API_KEY: 'k3',
      ...extra,
    },
    records: () => (existsSync(record)
      ? readFileSync(record, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : []),
  };
}

/** Runs launch and remembers the pids it started, so afterAll can kill them. */
function launch(clone, args, env) {
  const r = run(clone, ['launch', ...args], env);
  try {
    for (const l of Object.values(readSprint(clone).launched ?? {})) pids.add(l.pid);
  } catch { /* no sprint */ }
  return r;
}
const noteFakePids = (fakes) => fakes.records().forEach((r) => pids.add(r.pid));

const CMD = (name) => `You were started in ${name}'s command line, in print mode, and nobody is watching this
run. A background command does not wake you here: run every wait in the foreground,
and run it again whenever the tool stops it, until it ends. Everything this entry is
blocked by has shipped already, so skip the wait for it. When a command you need is
refused, end with STOPPED and name the command.
`;
const CURSOR_ONLY = '`.cursor/cli.json` holds the grants this run was started with. It is not part of your work: never commit it.\n';

const ids = ['e1', 'e2', 'blocker'];
const bandsFor = (list) => Object.fromEntries(list.map((id) => [id, row('A', 3, 3)]));
const simple = () => makeWorld([entry('e1'), entry('e2')], bandsFor(['e1', 'e2']));

/** The catalog with e1 shipped, which the fake pushes in mode shipped. */
function shippedCatalog(world, list) {
  writeFileSync(join(world.dir, 'shipped-catalog.yaml'), YAML.stringify(list));
}

describe('the seam', () => {
  it('† builds the command line for each tool, with and without a model, and never a bypass', () => {
    const rules = cli.claudeRules();
    const claude = cli.commandLine('claude', { prompt: 'P' });
    expect(claude.command).toBe('claude');
    expect(claude.args).toEqual([
      '-p', 'P', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
      '--setting-sources', 'project', '--allowedTools', rules.join(','),
    ]);
    expect(cli.commandLine('claude', { prompt: 'P', model: 'haiku' }).args.slice(-2)).toEqual(['--model', 'haiku']);
    const cursor = cli.commandLine('cursor', { prompt: 'P' });
    expect(cursor.command).toBe('cursor-agent');
    expect(cursor.args).toEqual(['-p', 'P', '--output-format', 'stream-json', '--trust']);
    expect(cli.commandLine('cursor', { prompt: 'P', model: 'composer-2' }).args.slice(-2)).toEqual(['--model', 'composer-2']);
    for (const tool of ['claude', 'cursor']) {
      const text = cli.commandLine(tool, { prompt: 'P', model: 'm' }).args.join(' ');
      for (const bad of ['--bare', '--dangerously-skip-permissions', '--force', '--yolo']) {
        expect(text).not.toContain(bad);
      }
    }
    expect(rules).toContain('Bash(git *)');
    expect(rules).toContain('Bash(bash scripts/*)');
    for (const c of ['bash', 'sh', 'zsh', 'rm', 'curl']) {
      expect(rules).not.toContain(`Bash(${c})`);
      expect(rules).not.toContain(`Bash(${c} *)`);
    }
    expect(cli.cursorGrants()).toEqual({
      permissions: { allow: cli.GRANTED_COMMANDS.map((c) => `Shell(${c})`), deny: [] },
    });
    expect(cli.cursorGrants().permissions.allow).not.toContain('Shell(bash)');
  });

  it('† agentEnv drops the three keys and keeps everything else', () => {
    const out = cli.agentEnv({
      ANTHROPIC_API_KEY: 'a', ANTHROPIC_AUTH_TOKEN: 'b', CURSOR_API_KEY: 'c', PATH: '/bin', HOME: '/h',
    });
    expect(out).toEqual({ PATH: '/bin', HOME: '/h' });
  });

  it('† finalLine reads the last line of a reply, and nothing else', () => {
    expect(cli.finalLine('work\n**SHIPPED**\n')).toBe('SHIPPED');
    expect(cli.finalLine('work\n  `PARKED: why`  \n\n')).toBe('PARKED: why');
    expect(cli.finalLine('x\nSTOPPED: a b')).toBe('STOPPED: a b');
    expect(cli.finalLine('STOPPED:')).toBeNull();
    expect(cli.finalLine('SHIPPED soon')).toBeNull();
    expect(cli.finalLine('SHIPPED\nand then more')).toBeNull();
    expect(cli.finalLine('')).toBeNull();
  });

  it('† judge applies the first of its five rules, and appends denials to a line that is not SHIPPED', () => {
    const ok = (over = {}) => ({ type: 'result', is_error: false, result: 'x\nSHIPPED', ...over });
    const j = (result, entryStatus = 'shipped', exit = 0) => cli.judge({
      tool: 'claude', id: 'e1', exit, run: { sessionId: 's', result }, entryStatus,
    });
    expect(j(null, 'shipped', 1).line).toBe('STOPPED: Claude Code ended without a result (exit 1)');
    expect(j(ok({ is_error: true, result: 'boom\nmore' })).line).toBe('STOPPED: Claude Code reported an error — boom');
    expect(j(ok({ is_error: true, result: '', subtype: 'error_max_turns' })).line)
      .toBe('STOPPED: Claude Code reported an error — error_max_turns');
    expect(j(ok({ result: 'no final line' })).line)
      .toBe('STOPPED: Claude Code ended without SHIPPED, PARKED or STOPPED as its last line');
    expect(j(ok({ result: 'done\n**SHIPPED**' })).line).toBe('SHIPPED');
    expect(j(ok(), 'building').line).toBe('STOPPED: it said SHIPPED, but origin/main shows e1 as building');
    expect(j(ok(), undefined).line).toBe('STOPPED: it said SHIPPED, but origin/main shows e1 as missing');
    expect(j(ok({ result: 'PARKED: needs a decision' }), 'shaped').line).toBe('PARKED: needs a decision');
    expect(cli.judge({ tool: 'cursor', id: 'e1', exit: null, run: { result: null }, entryStatus: 'shaped' }).line)
      .toBe('STOPPED: Cursor ended without a result (exit null)');

    const denials = [
      { tool_name: 'Bash', tool_input: { command: 'git push' } },
      { tool_name: 'Bash', tool_input: { command: 'git push' } },
      { tool_name: 'Edit', tool_input: { file_path: 'x' } },
    ];
    const denied = j(ok({ result: 'STOPPED: nope', permission_denials: denials }));
    expect(denied.denied).toEqual(['Bash(git push)', 'Edit']);
    expect(denied.line).toBe('STOPPED: nope — denied: Bash(git push); Edit');
    const shippedDenied = j(ok({ permission_denials: denials }));
    expect(shippedDenied.line).toBe('SHIPPED');
    expect(shippedDenied.denied).toEqual(['Bash(git push)', 'Edit']);
    expect(j(ok()).denied).toEqual([]);
  });

  it('† readRun skips lines that are not JSON, takes the first session id and the last result', () => {
    const text = [
      'Sprint: launcher line',
      JSON.stringify({ type: 'system', session_id: 'first' }),
      '{broken',
      JSON.stringify({ type: 'assistant', session_id: 'second' }),
      JSON.stringify({ type: 'result', result: 'one' }),
      JSON.stringify({ type: 'result', result: 'two', session_id: 'second' }),
      '',
    ].join('\n');
    expect(cli.readRun(text)).toEqual({ sessionId: 'first', result: { type: 'result', result: 'two', session_id: 'second' } });
    expect(cli.readRun('nothing here\n')).toEqual({ sessionId: null, result: null });
  });

  it('† openCommand changes to the worktree and resumes the session', () => {
    expect(cli.openCommand('claude', '/w/x', 'abc')).toBe('cd /w/x && claude --resume abc');
    expect(cli.openCommand('cursor', '/w/x', 'abc')).toBe('cd /w/x && cursor-agent --resume abc');
  });
});

describe('launch refuses', () => {
  it('† when there is no sprint, the entry is not in it, or the tool is unknown or missing', () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world);
    expect(launch(clone, ['e1', '--tool', 'claude'], fakes.env).stdout)
      .toBe('Sprint: none under way; run propose, then start.\n');

    expect(run(clone, ['start', 'e1', '--way', 'session']).status).toBe(0);
    expect(launch(clone, ['e9', '--tool', 'claude'], fakes.env).stdout).toBe('Sprint: e9 is not in the sprint.\n');
    for (const args of [['e1', '--tool', 'vim'], ['e1']]) {
      const r = launch(clone, args, fakes.env);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('Sprint: --tool takes claude or cursor.\n');
    }
    const bare = { ...fakes.env, PATH: `${dirname(process.execPath)}:/usr/bin:/bin` };
    const r = launch(clone, ['e1', '--tool', 'claude'], bare);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('Sprint: claude is not installed, so Claude Code cannot start a team member.\n');
    expect(existsSync(worktreeOf(clone, 'e1'))).toBe(false);
  }, T);

  it('† a second launch while the first still runs', async () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'slow', FAKE_SLEEP: '20' });
    expect(run(clone, ['start', 'e1', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    const again = launch(clone, ['e1'], fakes.env);
    noteFakePids(fakes);
    expect(again.status).toBe(1);
    expect(again.stdout).toMatch(/^Sprint: e1's team member is still running \(pid \d+\)\.\n$/);
  }, T);
});

describe('launch', () => {
  it('† starts the tool at once, detached, in a worktree of origin/main, with the brief and no key', async () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'slow', FAKE_SLEEP: '8' });
    expect(run(clone, ['start', 'e1', '--way', 'claude']).status).toBe(0);
    const brief = run(clone, ['brief', 'e1'], fakes.env).stdout;

    const began = Date.now();
    const r = launch(clone, ['e1', '--model', 'haiku'], fakes.env);
    const took = Date.now() - began;
    expect(r.status).toBe(0);
    expect(took).toBeLessThan(6000);
    const worktree = worktreeOf(clone, 'e1');
    const sprint = readSprint(clone);
    const out = lines(r);
    expect(out[0]).toBe(`Sprint: e1 started in Claude Code's command line (pid ${sprint.launched.e1.pid}), in ${worktree}.`);
    expect(out[1]).toBe(`Sprint: its log is ${join(teamDir(clone), 'e1.log')}; status names the command that opens its session.`);
    expect(sprint.marks.e1).toEqual({ state: 'planning' });
    expect(sprint.launched.e1).toMatchObject({ tool: 'claude', model: 'haiku', worktree });

    expect(existsSync(worktree)).toBe(true);
    expect(git(worktree, ['rev-parse', 'HEAD'])).toBe(git(clone, ['rev-parse', 'origin/main']));
    expect(spawnSync('git', ['symbolic-ref', '-q', 'HEAD'], { cwd: worktree, env: ENV }).status).not.toBe(0);

    expect(await until(() => fakes.records().length > 0)).toBe(true);
    noteFakePids(fakes);
    const [seen] = fakes.records();
    const prompt = readFileSync(join(teamDir(clone), 'e1.brief.md'), 'utf8');
    expect(prompt).toBe(`${brief}\n${CMD('Claude Code')}`);
    expect(seen.argv).toEqual(cli.commandLine('claude', { prompt, model: 'haiku' }).args);
    expect(realpathSync(seen.cwd)).toBe(realpathSync(worktree));
    expect(seen.env).toEqual({ ANTHROPIC_API_KEY: false, ANTHROPIC_AUTH_TOKEN: false, CURSOR_API_KEY: false });
    expect(existsSync(join(teamDir(clone), 'e1.log'))).toBe(true);
  }, T);

  it('† for cursor, writes the grants into a worktree that has none and leaves an existing file alone', async () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'parked' });
    expect(run(clone, ['start', 'e1', '--way', 'cursor']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    const grants = join(worktreeOf(clone, 'e1'), '.cursor/cli.json');
    expect(JSON.parse(readFileSync(grants, 'utf8'))).toEqual(cli.cursorGrants());
    expect(await until(() => hasResult(clone, 'e1'))).toBe(true);
    noteFakePids(fakes);
    const prompt = readFileSync(join(teamDir(clone), 'e1.brief.md'), 'utf8');
    expect(prompt).toBe(`${run(clone, ['brief', 'e1'], fakes.env).stdout}\n${CMD('Cursor')}${CURSOR_ONLY}`);
    expect(fakes.records()[0].argv).toEqual(cli.commandLine('cursor', { prompt }).args);

    const own = '{"permissions":{"allow":["Shell(ls)"],"deny":[]}}\n';
    const other = makeWorld([entry('e1')], bandsFor(['e1']), { '.cursor/cli.json': own });
    const clone2 = makeClone(other);
    const fakes2 = withFakes(other, { FAKE_MODE: 'parked' });
    expect(run(clone2, ['start', 'e1', '--way', 'cursor']).status).toBe(0);
    expect(launch(clone2, ['e1'], fakes2.env).status).toBe(0);
    expect(readFileSync(join(worktreeOf(clone2, 'e1'), '.cursor/cli.json'), 'utf8')).toBe(own);
    expect(await until(() => hasResult(clone2, 'e1'))).toBe(true);
    noteFakePids(fakes2);
  }, T);
});

describe('a run ends', () => {
  async function ended(mode, extra = {}) {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: mode, FAKE_ID: 'e1', ...extra });
    shippedCatalog(world, [entry('e1', { status: 'shipped' }), entry('e2')]);
    expect(run(clone, ['start', 'e1', 'e2', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    expect(await until(() => hasResult(clone, 'e1'))).toBe(true);
    noteFakePids(fakes);
    return { world, clone, fakes, result: resultOf(clone, 'e1'), status: lines(run(clone, ['status'], fakes.env)) };
  }

  it('† SHIPPED when the repository agrees, with the command that opens the session', async () => {
    const { clone, result, status } = await ended('shipped');
    expect(result).toMatchObject({ tool: 'claude', line: 'SHIPPED', denied: [], sessionId: 'sess-1', exit: 0 });
    expect(typeof result.finished).toBe('string');
    expect(status).toContain(`  e1 — shipped — in Claude Code, ended; open it with cd ${worktreeOf(clone, 'e1')} && claude --resume sess-1`);
  }, T);

  it('† STOPPED when it claimed SHIPPED and the repository does not show it, listed as needing the developer', async () => {
    const { result, status } = await ended('claims');
    expect(result.line).toBe('STOPPED: it said SHIPPED, but origin/main shows e1 as shaped');
    const need = status.indexOf('Sprint: needs you — 1 stopped or parked.');
    expect(need).toBeGreaterThan(-1);
    expect(status[need + 1]).toMatch(/^ {2}e1 — stopped: it said SHIPPED, but origin\/main shows e1 as shaped — in Claude Code, ended; open it with /);
  }, T);

  it('† parked, with the reason, from the tool\'s own last line', async () => {
    const { result, status } = await ended('parked');
    expect(result.line).toBe('PARKED: needs a decision');
    expect(status.some((l) => l.startsWith('  e1 — parked: needs a decision — in Claude Code, ended'))).toBe(true);
  }, T);

  it('† STOPPED naming the command a permission denial refused', async () => {
    const { result } = await ended('denied');
    expect(result.line).toBe('STOPPED: git push refused — denied: Bash(git push)');
    expect(result.denied).toEqual(['Bash(git push)']);
  }, T);

  it('† STOPPED with the exit status when the tool printed no result, and when it reported an error', async () => {
    expect((await ended('silent')).result.line).toBe('STOPPED: Claude Code ended without a result (exit 1)');
    expect((await ended('error')).result.line).toBe('STOPPED: Claude Code reported an error — boom');
  }, T);

  it('† shows a running entry with its log', async () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'slow', FAKE_SLEEP: '20' });
    expect(run(clone, ['start', 'e1', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    expect(await until(() => fakes.records().length > 0)).toBe(true);
    noteFakePids(fakes);
    expect(lines(run(clone, ['status'], fakes.env)))
      .toContain(`  e1 — planning — in Claude Code, running; log ${join(teamDir(clone), 'e1.log')}`);
  }, T);
});

describe('a blocked entry', () => {
  const blocked = () => makeWorld(
    [entry('blocker', { status: 'building' }), entry('e2', { blockedBy: ['blocker'] })],
    bandsFor(['blocker', 'e2']),
  );

  it('† starts the tool only once what blocks it has shipped', async () => {
    const world = blocked();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'parked' });
    expect(run(clone, ['start', 'e2', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e2', '--interval', '0.2'], fakes.env).status).toBe(0);
    await sleep(2000);
    expect(fakes.records()).toEqual([]);
    publish(world, { 'feature-catalog.yaml': YAML.stringify([entry('blocker', { status: 'shipped' }), entry('e2', { blockedBy: ['blocker'] })]) });
    expect(await until(() => fakes.records().length > 0)).toBe(true);
    noteFakePids(fakes);
  }, T);

  it('† never starts the tool when what blocks it was parked, and the result says so', async () => {
    const world = blocked();
    const clone = makeClone(world);
    const fakes = withFakes(world);
    expect(run(clone, ['start', 'e2', 'blocker', '--way', 'claude']).status).toBe(0);
    expect(run(clone, ['mark', 'blocker', 'parked', 'needs', 'a', 'decision']).status).toBe(0);
    expect(launch(clone, ['e2', '--interval', '0.2'], fakes.env).status).toBe(0);
    expect(await until(() => hasResult(clone, 'e2'))).toBe(true);
    expect(resultOf(clone, 'e2').line).toBe('PARKED: depends on blocker');
    expect(fakes.records()).toEqual([]);
  }, T);

  it('† an entry blocked by a launched entry that parked parks too', async () => {
    const world = makeWorld([entry('e1'), entry('e2', { blockedBy: ['e1'] })], bandsFor(['e1', 'e2']));
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'parked' });
    expect(run(clone, ['start', 'e1', 'e2', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    expect(await until(() => hasResult(clone, 'e1'))).toBe(true);
    noteFakePids(fakes);
    const r = run(clone, ['wait', 'e2', '--interval', '0.2']);
    expect(r.status).toBe(3);
    expect(r.stdout).toContain('PARKED: depends on e1');
  }, T);
});

describe('watch', () => {
  it('† reports an ended entry once, then says none is running', async () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'parked' });
    expect(run(clone, ['start', 'e1', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    expect(await until(() => hasResult(clone, 'e1'))).toBe(true);
    noteFakePids(fakes);

    const first = run(clone, ['watch', '--interval', '0.2'], fakes.env);
    expect(first.status).toBe(0);
    expect(lines(first)).toEqual([
      'Sprint: e1 ended in Claude Code — PARKED: needs a decision',
      `Sprint: open it with cd ${worktreeOf(clone, 'e1')} && claude --resume sess-1`,
    ]);
    const second = run(clone, ['watch', '--interval', '0.2'], fakes.env);
    expect(second.status).toBe(1);
    expect(second.stdout).toBe('Sprint: no team member started by command line is running.\n');
  }, T);

  it('† reports a run whose process died without a result', async () => {
    const world = simple();
    const clone = makeClone(world);
    const fakes = withFakes(world, { FAKE_MODE: 'slow', FAKE_SLEEP: '30' });
    expect(run(clone, ['start', 'e1', '--way', 'claude']).status).toBe(0);
    expect(launch(clone, ['e1'], fakes.env).status).toBe(0);
    expect(await until(() => fakes.records().length > 0)).toBe(true);
    noteFakePids(fakes);
    const { pid } = readSprint(clone).launched.e1;
    process.kill(pid, 'SIGKILL');
    await sleep(500);

    const r = run(clone, ['watch', '--interval', '0.2'], fakes.env);
    expect(r.status).toBe(0);
    expect(lines(r)[0]).toBe('Sprint: e1 ended in Claude Code — STOPPED: the run ended without writing a result');
    expect(lines(run(clone, ['status'], fakes.env)))
      .toContain('  e1 — stopped: the run ended without writing a result — in Claude Code, ended');
  }, T);
});

describe('the documents', () => {
  it('the command, the operator guide and the install list name the launcher', () => {
    const command = read('commands/sprint.md');
    for (const phrase of ['sprint.mjs launch', 'sprint.mjs watch', '--model',
      'The other tool\'s command line is the exception']) {
      expect(command).toContain(phrase);
    }
    expect(read('templates/README.md')).toContain('sprint.mjs launch');
    expect(read('scripts/installed-scripts.txt').split('\n')).toContain('team-member-cli.mjs');
  });
});
