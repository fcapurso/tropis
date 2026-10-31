// Level: unit
/**
 * The main branch's pipeline status: one line, from GitHub through gh, or a line saying
 * why it could not tell.
 *
 * Runs the shipped main-status.mjs in throwaway repositories against a stub gh placed
 * first on PATH, so nothing here reaches GitHub. A repository whose origin is not on
 * GitHub must never run gh at all; the stub's log shows it.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mainStatus } from '../scripts/main-status.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const blueprint = resolve(here, '..');
const script = join(blueprint, 'scripts/main-status.mjs');

// Logs every call as one line. `api` answers the default branch; `run list` answers
// runs-<n>.json on its n-th call when that file exists, and runs.json otherwise.
const STUB_GH = `#!/usr/bin/env bash
echo "$*" >> "$STUB_DIR/gh.log"
case "$1 $2" in
  "api repos/{owner}/{repo}") echo "{\\"default_branch\\":\\"\${STUB_DEFAULT:-main}\\"}"; exit 0 ;;
  "run list")
    n=$(( $(cat "$STUB_DIR/count" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$STUB_DIR/count"
    f="$STUB_DIR/runs-$n.json"; [ -f "$f" ] || f="$STUB_DIR/runs.json"
    cat "$f"; exit 0 ;;
esac
echo "stub gh: unexpected call: $*" >&2
exit 99
`;

const run = (status, conclusion, headSha, createdAt, extra = {}) => ({
  status, conclusion, headSha, createdAt, displayTitle: `title of ${headSha.slice(0, 7)}`,
  url: `https://github.com/acme/example/actions/runs/${headSha.slice(0, 4)}`, ...extra,
});
const RED_RUN = run('completed', 'failure', 'bad0000aaaaaaaa', '2026-10-31T11:00:00Z');
const GREEN_RUN = run('completed', 'success', 'good000bbbbbbbb', '2026-10-31T10:00:00Z');
const GOING = run('in_progress', '', 'busy000cccccccc', '2026-10-31T12:00:00Z');
const CANCELLED = run('completed', 'cancelled', 'gone000dddddddd', '2026-10-31T11:30:00Z');

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

describe('main branch status', () => {
  let dir;
  let repo;
  let env;
  const log = () => readFileSync(join(dir, 'gh.log'), 'utf8');
  const runs = (list, n) => writeFileSync(join(dir, n ? `runs-${n}.json` : 'runs.json'), JSON.stringify(list));
  const cli = (...args) => spawnSync('node', [script, ...args], { cwd: repo, env, encoding: 'utf8' });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'main-status-'));
    mkdirSync(join(dir, 'bin'));
    writeFileSync(join(dir, 'bin/gh'), STUB_GH);
    chmodSync(join(dir, 'bin/gh'), 0o755);
    writeFileSync(join(dir, 'gh.log'), '');
    runs([]);
    repo = join(dir, 'repo');
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'seed');
    git(repo, 'remote', 'add', 'origin', 'https://github.com/acme/example.git');
    env = { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, STUB_DIR: dir };
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('names the commit and the run when the last finished run failed, and exits 0', () => {
    runs([GOING, RED_RUN, GREEN_RUN]);
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(
      'Main branch: red — the pipeline failed on bad0000 (title of bad0000). '
      + 'Run: https://github.com/acme/example/actions/runs/bad0\n',
    );
    expect(log()).toBe(
      'api repos/{owner}/{repo}\n'
      + 'run list --workflow pipeline.yml --branch main --event push --limit 20 '
      + '--json status,conclusion,headSha,url,createdAt,displayTitle\n',
    );
  });

  it('says green on one line when the last finished run passed', () => {
    runs([GOING, GREEN_RUN, RED_RUN].map((r, i) => ({ ...r, createdAt: `2026-10-31T1${2 - i}:00:00Z` })));
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('Main branch: green — the pipeline passed on good000 (title of good000).\n');
  });

  it('skips a run that was cancelled', () => {
    runs([CANCELLED, RED_RUN]);
    expect(cli().stdout).toContain('Main branch: red — the pipeline failed on bad0000');
  });

  it('asks about the default branch GitHub names', () => {
    runs([RED_RUN]);
    env.STUB_DEFAULT = 'trunk';
    expect(cli().status).toBe(0);
    expect(log()).toContain('--branch trunk ');
  });

  it.each([
    ['no finished run', () => runs([GOING]), 'no finished push run of pipeline.yml on main'],
    ['gh failing', () => writeFileSync(join(dir, 'bin/gh'),
      '#!/usr/bin/env bash\necho "To get started with GitHub CLI, please run:  gh auth login" >&2\nexit 4\n'),
    'gh failed: To get started with GitHub CLI, please run:  gh auth login'],
    ['gh answering something else', () => writeFileSync(join(dir, 'runs.json'), 'not json'),
      'gh answered with something other than JSON'],
  ])('says it could not tell, and why, for %s', (_, arrange, reason) => {
    arrange();
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(`Main branch: could not tell — ${reason}.\n`);
  });

  it('says gh is not installed when there is none on PATH', () => {
    const bare = join(dir, 'bare');
    mkdirSync(bare);
    for (const tool of ['node', 'git']) {
      symlinkSync(spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim(), join(bare, tool));
    }
    env.PATH = bare;
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('Main branch: could not tell — gh is not installed.\n');
  });

  it('says gh did not answer when it hangs', () => {
    writeFileSync(join(dir, 'bin/gh'), '#!/usr/bin/env bash\nsleep 5\n');
    const status = mainStatus(repo, { env, ghTimeoutMs: 300 });
    expect(status.line).toBe('Main branch: could not tell — gh did not answer within 0.3 seconds.');
  });

  it.each([
    ['no origin', () => git(repo, 'remote', 'remove', 'origin'), 'no remote named origin'],
    ['an origin not on GitHub', () => git(repo, 'remote', 'set-url', 'origin', join(dir, 'elsewhere.git')),
      'origin is not on GitHub'],
  ])('never runs gh with %s', (_, arrange, reason) => {
    arrange();
    expect(cli().stdout).toBe(`Main branch: could not tell — ${reason}.\n`);
    expect(cli('--wait', 'HEAD', '--interval', '0', '--timeout', '0.01').stdout)
      .toBe(`Main branch: could not tell — ${reason}.\n`);
    expect(log()).toBe('');
  });

  describe('--wait', () => {
    const fast = ['--interval', '0.05', '--timeout', '0.05'];

    it('waits for the run on the commit to appear and finish, and exits 1 when it failed', () => {
      const head = git(repo, 'rev-parse', 'HEAD');
      runs([], 1);
      runs([run('queued', '', head, '2026-10-31T12:00:00Z')], 2);
      runs([run('completed', 'failure', head, '2026-10-31T12:00:00Z')]);
      const r = cli('--wait', 'HEAD', ...fast);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe(
        `Main branch: red — the pipeline failed on ${head.slice(0, 7)} (title of ${head.slice(0, 7)}). `
        + `Run: https://github.com/acme/example/actions/runs/${head.slice(0, 4)}\n`,
      );
      const calls = log().split('\n').filter((l) => l.startsWith('run list'));
      expect(calls).toHaveLength(3);
      // The full hash: GitHub matches --commit against the whole SHA only.
      expect(calls[0]).toBe(
        `run list --workflow pipeline.yml --commit ${head} --event push --limit 20 `
        + '--json status,conclusion,headSha,url,createdAt,displayTitle',
      );
    });

    it('exits 0 with the green line when the run passed', () => {
      const head = git(repo, 'rev-parse', 'HEAD');
      runs([run('completed', 'success', head, '2026-10-31T12:00:00Z')]);
      const r = cli('--wait', head, ...fast);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/^Main branch: green — the pipeline passed on /);
    });

    it('says it could not tell when the run was cancelled', () => {
      const head = git(repo, 'rev-parse', 'HEAD');
      runs([run('completed', 'cancelled', head, '2026-10-31T12:00:00Z')]);
      const r = cli('--wait', 'HEAD', ...fast);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/^Main branch: could not tell — the pipeline run on \w{7} ended cancelled \(/);
    });

    it('exits 3 when nothing has finished by the timeout', () => {
      const r = cli('--wait', 'HEAD', '--interval', '0.05', '--timeout', '0.005');
      expect(r.status).toBe(3);
      expect(r.stdout).toMatch(/^Main branch: still running — no pipeline run on \w{7} finished within 0\.005 minutes\.\n$/);
    });

    it.each([[['--wait']], [['--wait', '--interval']], [['--interval', '1']], [['--wait', 'HEAD', '--timeout', '0']]])(
      'refuses %j with the usage and exit 2', (args) => {
        const r = cli(...args);
        expect(r.status).toBe(2);
        expect(r.stderr).toContain('usage: main-status.mjs');
        expect(log()).toBe('');
      },
    );

    it('refuses a commit that is not here', () => {
      const r = cli('--wait', 'no-such-ref', ...fast);
      expect(r.status).toBe(2);
      expect(r.stderr).toBe('main-status: no-such-ref is not a commit here\n');
      expect(log()).toBe('');
    });
  });

  it('the merge sequence ends by waiting for the run the merge started, and stops on red', () => {
    const workflow = readFileSync(join(blueprint, 'framework/workflow.md'), 'utf8');
    const section = workflow.split('## Merge and clean up')[1].split('\n## ')[0];
    const block = section.split('```bash')[1].split('```')[0].trim().split('\n');
    expect(block.at(-1)).toMatch(/^node \.tropis\/scripts\/main-status\.mjs --wait HEAD(\s|$)/);
    const prose = section.replace(/\s+/g, ' ');
    expect(prose).toContain('Exit 1 means the main branch is red');
    expect(prose).toContain('and stop.');
  });
});
