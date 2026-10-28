// Level: unit
/**
 * A flush reaches the framework as one branch and one pull request, and never merges it.
 *
 * submit-upstream.sh, installed at .tropis/scripts/, is the only place that talks to
 * GitHub. Its preflight must say what is missing before anything is asked of the person,
 * and its open step must push to the framework when the account can write there and to
 * the account's own fork when it cannot. This runs the shipped script against a stub gh
 * placed first on PATH and local bare repositories standing in for the framework and
 * the fork, so nothing here reaches GitHub.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../scripts/submit-upstream.sh');

// Answers from the environment the test sets, and logs every call as one line.
const STUB_GH = `#!/usr/bin/env bash
echo "$*" >> "$STUB_LOG"
case "$1 $2" in
  "auth status") [ "\${STUB_SIGNED_IN:-1}" = 1 ]; exit ;;
  "api user") echo "$STUB_LOGIN"; exit 0 ;;
  "repo fork") echo "✓ Created fork $STUB_LOGIN/framework"; exit 0 ;;
  "pr create") echo "https://github.com/$STUB_UPSTREAM/pull/1"; exit 0 ;;
  "repo view")
    case "$*" in
      *viewerPermission*) echo "$STUB_PERMISSION"; exit 0 ;;
      *--json\\ url*) var="STUB_URL_$(echo "$3" | tr -c 'A-Za-z0-9\\n' '_')"; echo "\${!var}"; exit 0 ;;
    esac ;;
esac
echo "stub gh: unexpected call: $*" >&2
exit 99
`;

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

const UPSTREAM = 'acme/framework';
const BRANCH = 'upstream/example/2026-10-28-x';

describe('submitting a flush upstream', () => {
  let dir;
  let bin;
  let log;
  let upstream;
  let fork;
  let clone;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'submit-upstream-'));
    bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'gh'), STUB_GH);
    chmodSync(join(bin, 'gh'), 0o755);
    log = join(dir, 'gh.log');
    writeFileSync(log, '');

    upstream = join(dir, 'upstream.git');
    fork = join(dir, 'fork.git');
    git(dir, 'init', '--bare', '-q', upstream);
    git(dir, 'init', '--bare', '-q', fork);

    clone = join(dir, 'clone');
    mkdirSync(clone);
    git(clone, 'init', '-q', '-b', 'work');
    git(clone, 'config', 'user.name', 'Test');
    git(clone, 'config', 'user.email', 'test@example.com');
    writeFileSync(join(clone, 'change.txt'), 'a change\n');
    git(clone, 'add', '.');
    git(clone, 'commit', '-q', '-m', 'a change');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const env = (extra = {}) => ({
    PATH: `${bin}:${process.env.PATH}`,
    HOME: dir,
    STUB_LOG: log,
    STUB_UPSTREAM: UPSTREAM,
    STUB_LOGIN: 'someone',
    STUB_PERMISSION: 'WRITE',
    STUB_URL_acme_framework: upstream,
    STUB_URL_someone_framework: fork,
    ...extra,
  });

  const run = (args, { cwd = dir, env: e = env() } = {}) =>
    spawnSync('/bin/bash', [script, ...args], { cwd, env: e, encoding: 'utf8' });

  const calls = () => readFileSync(log, 'utf8').split('\n').filter(Boolean);

  const project = (readme) => {
    const root = join(dir, 'project');
    mkdirSync(join(root, '.tropis'), { recursive: true });
    if (readme !== null) writeFileSync(join(root, '.tropis', 'README.md'), readme);
    return root;
  };
  const readmeFor = (address) =>
    `# Framework\n\nThis project was set up from the framework at \`${address}\`. General adoption,\nthe development cycle are documented there.\n`;

  const branches = (bare) => git(bare, 'for-each-ref', '--format=%(refname)', 'refs/heads');

  describe('preflight', () => {
    it.each([
      ['https://github.com/acme/framework'],
      ['https://github.com/acme/framework.git'],
      ['git@github.com:acme/framework.git'],
    ])('prints OWNER/NAME for %s', (address) => {
      const r = run(['preflight', project(readmeFor(address))]);
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe('acme/framework');
    });

    it('refuses a local-path address and names it', () => {
      const r = run(['preflight', project(readmeFor('/Users/someone/framework'))]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toContain('/Users/someone/framework');
    });

    it('refuses when the README does not say where the framework is', () => {
      const r = run(['preflight', project('# Framework\n\nNothing about where it came from.\n')]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toMatch(/set up from the framework at/);
    });

    it('refuses when gh is not signed in', () => {
      const r = run(['preflight', project(readmeFor('https://github.com/acme/framework'))], {
        env: env({ STUB_SIGNED_IN: '0' }),
      });
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toContain('gh auth login');
    });

    it('refuses when gh is not installed', () => {
      const empty = join(dir, 'empty');
      mkdirSync(empty);
      const r = run(['preflight', project(readmeFor('https://github.com/acme/framework'))], {
        env: env({ PATH: empty }),
      });
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toMatch(/gh not installed/);
    });
  });

  describe('open', () => {
    const body = () => {
      const file = join(dir, 'body.md');
      writeFileSync(file, 'What this changes.\n');
      return file;
    };
    // A project root whose queue holds the given text, or no queue at all when null.
    const queueRoot = (queue) => {
      const root = join(dir, 'queue-project');
      mkdirSync(join(root, 'docs'), { recursive: true });
      if (queue !== null) writeFileSync(join(root, 'docs', 'BLUEPRINT-UPSTREAM.md'), queue);
      return root;
    };
    const named = (name) => `# Upstream queue\n\nLast flushed: 2026-10-01.\nFlushes as: ${name}.\n`;
    const root = () => queueRoot(named('example'));
    const openWith = (queueText, branch, e = env()) =>
      run(['open', queueRoot(queueText), UPSTREAM, branch, 'A title', body()], { cwd: clone, env: e });
    const open = (e) => run(['open', root(), UPSTREAM, BRANCH, 'A title', body()], { cwd: clone, env: e });

    it('pushes to the framework itself when the account can write there', () => {
      const r = open(env({ STUB_PERMISSION: 'WRITE' }));
      expect(r.stderr).not.toContain('stub gh: unexpected call');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(`https://github.com/${UPSTREAM}/pull/1`);

      expect(branches(upstream)).toBe(`refs/heads/${BRANCH}`);
      expect(git(upstream, 'rev-parse', BRANCH)).toBe(git(clone, 'rev-parse', 'HEAD'));
      expect(branches(fork)).toBe('');

      const made = calls();
      expect(made.some((c) => c.startsWith('repo fork'))).toBe(false);
      const pr = made.filter((c) => c.startsWith('pr create'));
      expect(pr).toHaveLength(1);
      expect(pr[0]).toContain(`--repo ${UPSTREAM}`);
      expect(pr[0]).toContain('--base main');
      expect(pr[0]).toContain(`--head ${BRANCH} `);
      expect(pr[0]).not.toContain(':');
    });

    it('pushes to the account\u2019s own fork when it can only read', () => {
      const r = open(env({ STUB_PERMISSION: 'READ' }));
      expect(r.stderr).not.toContain('stub gh: unexpected call');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(`https://github.com/${UPSTREAM}/pull/1`);

      expect(branches(fork)).toBe(`refs/heads/${BRANCH}`);
      expect(git(fork, 'rev-parse', BRANCH)).toBe(git(clone, 'rev-parse', 'HEAD'));
      expect(branches(upstream)).toBe('');

      const made = calls();
      expect(made.filter((c) => c.startsWith('repo fork'))).toHaveLength(1);
      expect(made.find((c) => c.startsWith('repo fork'))).toContain(UPSTREAM);
      const pr = made.filter((c) => c.startsWith('pr create'));
      expect(pr).toHaveLength(1);
      expect(pr[0]).toContain(`--head someone:${BRANCH}`);
    });

    it('stops naming the fork it looked for when that fork does not exist', () => {
      const r = open(env({ STUB_PERMISSION: 'READ', STUB_URL_someone_framework: '' }));
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      // gh's own report of the fork comes first on stderr; the refusal is the last line.
      expect(r.stderr.trim().split('\n').pop()).toContain('someone/framework');
      expect(branches(upstream)).toBe('');
      expect(branches(fork)).toBe('');
      expect(calls().some((c) => c.startsWith('pr create'))).toBe(false);
    });

    it('refuses a branch named main before pushing anything', () => {
      const r = run(['open', root(), UPSTREAM, 'main', 'A title', body()], {
        cwd: clone,
        env: env({ STUB_PERMISSION: 'WRITE' }),
      });
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toContain('main');
      expect(branches(upstream)).toBe('');
      expect(calls().some((c) => c.startsWith('pr create'))).toBe(false);
    });

    describe('refuses a branch not under the flush name', () => {
      const nothingSent = (r, pattern) => {
        expect(r.status).not.toBe(0);
        expect(r.stdout).toBe('');
        expect(r.stderr).toMatch(pattern);
        expect(branches(upstream)).toBe('');
        expect(branches(fork)).toBe('');
        expect(calls().some((c) => c.startsWith('pr create'))).toBe(false);
      };

      it('when the project has no queue file', () => {
        nothingSent(openWith(null, BRANCH), /BLUEPRINT-UPSTREAM\.md/);
      });
      it('when the queue has no Flushes as line', () => {
        nothingSent(openWith('# Upstream queue\n\nLast flushed: 2026-10-01.\n', BRANCH), /Flushes as/);
      });
      it('when the name is not a valid name', () => {
        // The branch is under the invalid name, so only the name check can refuse it.
        nothingSent(
          openWith(named('Example Project'), 'upstream/Example Project/2026-10-28-x'),
          /"Example Project" .* is not lowercase letters, digits and hyphens/,
        );
      });
      it('when the branch is under another name', () => {
        nothingSent(openWith(named('example'), 'upstream/other/2026-10-28-x'), /upstream\/example\//);
      });
      it('when the branch is not under upstream/', () => {
        nothingSent(openWith(named('example'), 'flush/example'), /upstream\/example\//);
      });
      it('and accepts the name without its trailing full stop', () => {
        const r = openWith('Last flushed: 2026-10-01.\nFlushes as: example\n', BRANCH);
        expect(r.status).toBe(0);
        expect(branches(upstream)).toBe(`refs/heads/${BRANCH}`);
      });
    });

    it.each(['WRITE', 'READ'])('never merges and never pushes to main (%s)', (permission) => {
      const r = open(env({ STUB_PERMISSION: permission }));
      expect(r.status).toBe(0);
      expect(calls().some((c) => /^pr merge/.test(c))).toBe(false);
      for (const bare of [upstream, fork]) {
        expect(existsSync(join(bare, 'refs/heads/main'))).toBe(false);
        expect(branches(bare)).not.toContain('refs/heads/main');
      }
    });
  });
});
