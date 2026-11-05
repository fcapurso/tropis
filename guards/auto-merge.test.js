// Level: unit
/**
 * Setting a pull request to merge itself: gh pr merge on a computer, the cloud session's
 * route only where gh is refused GraphQL.
 *
 * Runs the shipped auto-merge.mjs in throwaway repositories against a stub gh placed
 * first on PATH, so nothing here reaches GitHub. The stub's log shows which route ran.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(resolve(here, '..'), 'scripts/auto-merge.mjs');

const GRAPHQL_403 = 'non-200 OK status code: 403 Forbidden body: "{\\"message\\":\\"GitHub GraphQL is not '
  + 'available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...).\\"}"';

// Logs every call with each argument on its own line, then a line `--`. `pr merge` answers
// with the file merge-answer: its first line is the exit code, the rest goes to stderr;
// without the file it succeeds. `api` answers with route-answer the same way, or
// {"enabled":true,"merge_method":"squash"} without it.
const STUB_GH = `#!/usr/bin/env bash
for a in "$@"; do printf '%s\\n' "$a" >> "$STUB_DIR/gh.log"; done
echo -- >> "$STUB_DIR/gh.log"
answer() {
  if [ -f "$STUB_DIR/$1" ]; then
    code=$(head -n 1 "$STUB_DIR/$1"); tail -n +2 "$STUB_DIR/$1" >&2; exit "$code"
  fi
}
case "$1 $2" in
  "pr merge") answer merge-answer; exit 0 ;;
esac
if [ "$1" = api ]; then
  answer route-answer
  echo '{"enabled":true,"merge_method":"squash"}'; exit 0
fi
echo "stub gh: unexpected call: $*" >&2
exit 99
`;

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

describe('auto-merge', () => {
  let dir;
  let repo;
  let env;
  const calls = () => readFileSync(join(dir, 'gh.log'), 'utf8')
    .split('--\n').filter(Boolean).map((c) => c.replace(/\n$/, '').split('\n'));
  const cli = (...args) => spawnSync('node', [script, ...args], { cwd: repo, env, encoding: 'utf8' });
  const subject = 'fix(release): a release runs from a cloud session';
  const body = 'Line one: with a colon.\n\nImplements: example';
  const standard = ['17', '--subject', subject, '--body', body];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'auto-merge-'));
    mkdirSync(join(dir, 'bin'));
    writeFileSync(join(dir, 'bin/gh'), STUB_GH);
    chmodSync(join(dir, 'bin/gh'), 0o755);
    writeFileSync(join(dir, 'gh.log'), '');
    repo = join(dir, 'repo');
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'remote', 'add', 'origin', 'https://github.com/acme/example.git');
    env = { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, STUB_DIR: dir };
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('sets it with gh pr merge, the subject and the body, and calls nothing else', () => {
    const r = cli(...standard);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('Pull request #17: set to merge itself as a squash.\n');
    expect(calls()).toEqual([
      ['pr', 'merge', '17', '--auto', '--squash', '--subject', subject, '--body', ...body.split('\n')],
    ]);
  });

  it('falls back to the cloud session route, with the subject and body, on the GraphQL refusal', () => {
    writeFileSync(join(dir, 'merge-answer'), `1\n${GRAPHQL_403}\n`);
    const r = cli(...standard);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(
      "Pull request #17: set to merge itself as a squash, through the cloud session's route.\n",
    );
    const routed = calls().filter((c) => c[0] === 'api');
    expect(routed).toEqual([[
      'api', '-X', 'PUT', 'repos/{owner}/{repo}/pulls/17/ccr/auto_merge',
      '-f', 'merge_method=squash', '-f', `commit_title=${subject}`,
      '-f', ...`commit_message=${body}`.split('\n'),
    ]]);
  });

  it('reports any other refusal of gh pr merge and never tries the cloud route', () => {
    writeFileSync(join(dir, 'merge-answer'),
      '1\nGraphQL: Pull request Auto merge is not allowed for this repository (enablePullRequestAutoMerge)\n');
    const r = cli(...standard);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('Pull request #17: not set to merge itself — gh pr merge answered: '
      + 'GraphQL: Pull request Auto merge is not allowed for this repository (enablePullRequestAutoMerge).\n');
    expect(calls().filter((c) => c[0] === 'api')).toEqual([]);
  });

  it('reports a refused cloud route with its answer', () => {
    writeFileSync(join(dir, 'merge-answer'), `1\n${GRAPHQL_403}\n`);
    writeFileSync(join(dir, 'route-answer'), '1\ngh: Pull request is a draft (HTTP 422)\n');
    const r = cli(...standard);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('Pull request #17: not set to merge itself — gh is refused GraphQL here, '
      + "and the cloud session's route answered: gh: Pull request is a draft (HTTP 422).\n");
  });

  it('runs no gh at all where origin is not on GitHub', () => {
    git(repo, 'remote', 'set-url', 'origin', 'https://gitlab.example/acme/example.git');
    const r = cli(...standard);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('Pull request #17: not set to merge itself — origin is not on GitHub.\n');
    expect(calls()).toEqual([]);
  });

  it.each([
    [[]],
    [['17']],
    [['17', '--subject', subject]],
    [['x', '--subject', subject, '--body', body]],
    [['17', '--subject', '', '--body', body]],
    [['17', '--subject', subject, '--body', body, '--rebase', 'yes']],
  ])('refuses the command line %j with its usage and exit 2', (args) => {
    const r = cli(...args);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('usage: auto-merge.mjs <number> --subject <subject> --body <body>');
    expect(calls()).toEqual([]);
  });
});
