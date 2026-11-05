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

// Answers from the environment the test sets, and logs every call as one line. Like a
// Claude Code cloud session, it refuses every gh command that goes through GraphQL and
// answers only gh api, GitHub's REST interface, and only the routes the script asks for.
const STUB_GH = `#!/usr/bin/env bash
echo "$*" >> "$STUB_LOG"
unexpected() { echo "stub gh: unexpected call: $ALL" >&2; exit 99; }
graphql() { echo "HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...). (https://api.github.com/graphql)" >&2; exit 1; }
ALL="$*"
case "$1" in
  auth) [ "\${STUB_AUTH_STATUS:-1}" = 1 ]; exit ;;
  pr|repo) graphql ;;
  api) shift ;;
  *) unexpected ;;
esac
method=GET route="" jq=""
while [ $# -gt 0 ]; do
  case "$1" in
    -X|--method) method="$2"; shift 2 ;;
    -q|--jq) jq="$2"; shift 2 ;;
    -f|-F|--field|--raw-field|-H|--header) shift 2 ;;
    --paginate) echo "Numeric-ID repository paths are not supported through this proxy" >&2; exit 1 ;;
    *) [ -n "$route" ] || route="$1"; shift ;;
  esac
done
case "$method $route" in
  "GET user")
    [ "\${STUB_SIGNED_IN:-1}" = 1 ] || { echo "HTTP 401: Bad credentials (https://api.github.com/user)" >&2; exit 1; }
    echo "$STUB_LOGIN"; exit 0 ;;
  "GET repos/$STUB_UPSTREAM/pulls?state=all&per_page=100&page="*)
    case "\${route##*page=}" in
      1) out="\${STUB_PRS:-}" ;;
      2) out="\${STUB_PRS_PAGE2:-}" ;;
      *) out="" ;;
    esac
    printf '%s' "$out"; [ -z "$out" ] || echo; exit 0 ;;
  "POST repos/$STUB_UPSTREAM/forks") echo "$STUB_LOGIN/framework"; exit 0 ;;
  "POST repos/$STUB_UPSTREAM/pulls") echo "https://github.com/$STUB_UPSTREAM/pull/1"; exit 0 ;;
  "GET repos/"*)
    full="\${route#repos/}"
    case "$jq" in
      .permissions.push) [ "$full" != "$STUB_UPSTREAM" ] || { echo "$STUB_CAN_PUSH"; exit 0; } ;;
      .clone_url) var="STUB_URL_$(echo "$full" | tr -c 'A-Za-z0-9\\n' '_')"; echo "\${!var}"; exit 0 ;;
    esac ;;
esac
unexpected
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
    STUB_CAN_PUSH: 'true',
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

  // A project root whose queue holds the given text, or no queue at all when null.
  const queueRoot = (queue) => {
    const root = join(dir, 'queue-project');
    mkdirSync(join(root, 'docs'), { recursive: true });
    if (queue !== null) writeFileSync(join(root, 'docs', 'BLUEPRINT-UPSTREAM.md'), queue);
    return root;
  };
  const named = (name) => `# Upstream queue\n\nLast flushed: 2026-10-01.\nFlushes as: ${name}.\n`;

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

    it('passes where gh auth status fails and GitHub answers', () => {
      const r = run(['preflight', project(readmeFor('https://github.com/acme/framework'))], {
        env: env({ STUB_AUTH_STATUS: '0' }),
      });
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe('acme/framework');
    });

    it('never asks gh auth status', () => {
      const r = run(['preflight', project(readmeFor('https://github.com/acme/framework'))]);
      expect(r.status).toBe(0);
      expect(calls().some((c) => c.startsWith('auth'))).toBe(false);
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


  describe('suggest-name', () => {
    it('prints one generated name, uses no gh, and varies', () => {
      const names = [];
      for (let i = 0; i < 10; i++) {
        const r = run(['suggest-name']);
        expect(r.status).toBe(0);
        expect(r.stderr).toBe('');
        expect(r.stdout).toMatch(/^adopter-[0-9a-f]{6}\n$/);
        names.push(r.stdout);
      }
      expect(new Set(names).size).toBeGreaterThan(1);
      expect(calls()).toEqual([]);
    });
  });

  describe('check-name', () => {
    const prsCalls = () => calls().filter((c) => c.startsWith('api') && c.includes('/pulls?state=all'));
    const check = (name, prs, page2 = '') =>
      run(['check-name', UPSTREAM, name], { env: env({ STUB_PRS: prs, STUB_PRS_PAGE2: page2 }) });
    // The stub refuses gh pr and gh repo as a cloud session does, so these cases run where
    // GraphQL is refused; this asserts none was even tried.
    const noGraphQL = () => {
      expect(calls().some((c) => c.startsWith('pr ') || c.startsWith('repo '))).toBe(false);
    };

    it('refuses a name another account has a pull request under', () => {
      const r = check('example', 'upstream/example/2026-10-01-x other');
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toContain('example');
      expect(r.stderr).toContain('other');
      noGraphQL();
    });

    it('compares the branch without the fork owner', () => {
      // gh reports headRefName without the owner, so a pull request opened from the other
      // account's fork reads the same as one pushed to the framework itself.
      const r = check('example', 'upstream/example/2026-10-01-x other');
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('other');
      expect(prsCalls()).toHaveLength(2);
    });

    it('lists pull requests through the REST pulls route, page by page', () => {
      const r = check('example', 'upstream/example/2026-10-01-x someone', 'upstream/elsewhere/2026-10-01-y other');
      expect(r.status).toBe(0);
      const pages = prsCalls();
      expect(pages).toHaveLength(3);
      pages.forEach((c, i) => {
        expect(c).toContain(`repos/${UPSTREAM}/pulls?state=all&per_page=100&page=${i + 1}`);
        expect(c).not.toContain('--paginate');
      });
      expect(calls().some((c) => c.startsWith('pr '))).toBe(false);
    });

    it('refuses a name used only on a later page', () => {
      const r = check('example', 'upstream/elsewhere/2026-10-01-y someone', 'upstream/example/2026-10-01-x other');
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toContain('other');
    });

    it('accepts the signed-in account\u2019s own earlier flushes', () => {
      const r = check('example', 'upstream/example/2026-10-01-x someone');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
      expect(r.stderr).toBe('');
    });

    it('accepts a name nobody uses, even when another name starts the same way', () => {
      const r = check('example', 'upstream/example-two/2026-10-01-x other');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
      expect(r.stderr).toBe('');
      noGraphQL();
    });

    it('refuses an invalid name before asking gh for pull requests', () => {
      const r = check('Example Project', '');
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr).toMatch(/"Example Project" is not lowercase letters, digits and hyphens/);
      expect(prsCalls()).toHaveLength(0);
    });
  });

  // A pull request is opened by POSTing to the framework's REST pulls route.
  const isPullRequest = (c) => c.includes('-X POST') && c.includes(`repos/${UPSTREAM}/pulls`);

  describe('open', () => {
    const body = () => {
      const file = join(dir, 'body.md');
      writeFileSync(file, 'What this changes.\n');
      return file;
    };
    const root = () => queueRoot(named('example'));
    const openWith = (queueText, branch, e = env()) =>
      run(['open', queueRoot(queueText), UPSTREAM, branch, 'A title', body()], { cwd: clone, env: e });
    const open = (e) => run(['open', root(), UPSTREAM, BRANCH, 'A title', body()], { cwd: clone, env: e });

    it('pushes to the framework itself when the account can write there', () => {
      const r = open(env({ STUB_CAN_PUSH: 'true' }));
      expect(r.stderr).not.toContain('stub gh: unexpected call');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(`https://github.com/${UPSTREAM}/pull/1`);

      expect(branches(upstream)).toBe(`refs/heads/${BRANCH}`);
      expect(git(upstream, 'rev-parse', BRANCH)).toBe(git(clone, 'rev-parse', 'HEAD'));
      expect(branches(fork)).toBe('');

      const made = calls();
      expect(made.some((c) => c.includes('/forks'))).toBe(false);
      const pr = made.filter(isPullRequest);
      expect(pr).toHaveLength(1);
      expect(pr[0]).toContain('base=main');
      expect(pr[0]).toContain(`head=${BRANCH} `);
      expect(pr[0]).not.toContain('head=someone:');
      expect(pr[0]).toContain('body=@');
    });

    it('opens its pull request with no GraphQL call', () => {
      const r = open(env({ STUB_CAN_PUSH: 'true' }));
      expect(r.status).toBe(0);
      expect(calls().some((c) => c.startsWith('pr ') || c.startsWith('repo '))).toBe(false);
    });

    it('pushes to the account\u2019s own fork when it can only read', () => {
      const r = open(env({ STUB_CAN_PUSH: 'false' }));
      expect(r.stderr).not.toContain('stub gh: unexpected call');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(`https://github.com/${UPSTREAM}/pull/1`);

      expect(branches(fork)).toBe(`refs/heads/${BRANCH}`);
      expect(git(fork, 'rev-parse', BRANCH)).toBe(git(clone, 'rev-parse', 'HEAD'));
      expect(branches(upstream)).toBe('');

      const made = calls();
      const forks = made.filter((c) => c.includes('/forks'));
      expect(forks).toHaveLength(1);
      expect(forks[0]).toContain('-X POST');
      expect(forks[0]).toContain(`repos/${UPSTREAM}/forks`);
      const pr = made.filter(isPullRequest);
      expect(pr).toHaveLength(1);
      expect(pr[0]).toContain('base=main');
      expect(pr[0]).toContain(`head=someone:${BRANCH}`);
      expect(pr[0]).toContain('body=@');
    });

    it('stops naming the fork it looked for when that fork does not exist', () => {
      const r = open(env({ STUB_CAN_PUSH: 'false', STUB_URL_someone_framework: '' }));
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      // The fork's full name comes first on stderr; the refusal is the last line.
      expect(r.stderr.trim().split('\n').pop()).toContain('someone/framework');
      expect(branches(upstream)).toBe('');
      expect(branches(fork)).toBe('');
      expect(calls().some(isPullRequest)).toBe(false);
    });

    it('refuses a branch named main before pushing anything', () => {
      const r = run(['open', root(), UPSTREAM, 'main', 'A title', body()], {
        cwd: clone,
        env: env({ STUB_CAN_PUSH: 'true' }),
      });
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr.trim().split('\n')).toHaveLength(1);
      expect(r.stderr).toContain('main');
      expect(branches(upstream)).toBe('');
      expect(calls().some(isPullRequest)).toBe(false);
    });

    describe('refuses a branch not under the flush name', () => {
      const nothingSent = (r, pattern) => {
        expect(r.status).not.toBe(0);
        expect(r.stdout).toBe('');
        expect(r.stderr).toMatch(pattern);
        expect(branches(upstream)).toBe('');
        expect(branches(fork)).toBe('');
        expect(calls().some(isPullRequest)).toBe(false);
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

    it('refuses a name another account already uses, before pushing', () => {
      const r = open(env({ STUB_PRS: `${BRANCH} other` }));
      expect(r.status).not.toBe(0);
      expect(r.stdout).toBe('');
      expect(r.stderr).toContain('other');
      expect(branches(upstream)).toBe('');
      expect(branches(fork)).toBe('');
      expect(calls().some(isPullRequest)).toBe(false);
    });

    it.each(['true', 'false'])('never merges and never pushes to main (can push: %s)', (canPush) => {
      const r = open(env({ STUB_CAN_PUSH: canPush }));
      expect(r.status).toBe(0);
      expect(calls().some((c) => c.includes('merge'))).toBe(false);
      for (const bare of [upstream, fork]) {
        expect(existsSync(join(bare, 'refs/heads/main'))).toBe(false);
        expect(branches(bare)).not.toContain('refs/heads/main');
      }
    });
  });

  describe('check-open', () => {
    const checkOpen = (queueText, branch, e = env()) =>
      run(['check-open', queueRoot(queueText), UPSTREAM, branch], { cwd: clone, env: e });
    const nothingSent = () => {
      expect(branches(upstream)).toBe('');
      expect(branches(fork)).toBe('');
      const made = calls();
      expect(made.some((c) => c.includes('/forks'))).toBe(false);
      expect(made.some((c) => c.includes('-X POST'))).toBe(false);
      expect(made.some((c) => c.includes('.permissions.push'))).toBe(false);
    };

    it('passes and sends nothing when every check holds', () => {
      const r = checkOpen(named('example'), BRANCH);
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
      nothingSent();
    });

    describe('refuses as open does', () => {
      const refused = (r, pattern) => {
        expect(r.status).not.toBe(0);
        expect(r.stdout).toBe('');
        expect(r.stderr).toMatch(pattern);
        nothingSent();
      };

      it('when the project has no queue file', () => {
        refused(checkOpen(null, BRANCH), /BLUEPRINT-UPSTREAM\.md/);
      });
      it('when the queue has no Flushes as line', () => {
        refused(checkOpen('# Upstream queue\n\nLast flushed: 2026-10-01.\n', BRANCH), /Flushes as/);
      });
      it('when the branch is under another name', () => {
        refused(checkOpen(named('example'), 'upstream/other/2026-10-28-x'), /upstream\/example\//);
      });
      it('when the branch is named main', () => {
        refused(checkOpen(named('example'), 'main'), /main/);
      });
      it('when another account uses the name', () => {
        refused(checkOpen(named('example'), BRANCH, env({ STUB_PRS: `${BRANCH} other` })), /other/);
      });
    });
  });
});
