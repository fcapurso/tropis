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
// without the file it succeeds. `api` answers with route-answer the same way, or prints
// route-stdout and succeeds, or {"enabled":true,"merge_method":"squash"} without either.
// An `api` call whose path is exactly repos/{owner}/{repo}/pulls/<n>, with no further
// segment, is the pull request read: it prints pull.json, or fails with a 404 while the
// file pull-fails exists; every other `api` call answers as above.
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
  case "$2" in
    repos/*/pulls/[0-9]*)
      case "\${2#repos/*/*/pulls/}" in
        *[!0-9]*) ;;
        *)
          if [ -f "$STUB_DIR/pull-fails" ]; then echo 'gh: Not Found (HTTP 404)' >&2; exit 1; fi
          cat "$STUB_DIR/pull.json"; exit 0 ;;
      esac ;;
  esac
  answer route-answer
  if [ -f "$STUB_DIR/route-stdout" ]; then cat "$STUB_DIR/route-stdout"; exit 0; fi
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
  let baseSha;
  let proseSha;
  let codeSha;
  const pullIs = (head, base = baseSha) => writeFileSync(join(dir, 'pull.json'), JSON.stringify({
    number: 17, base: { ref: 'main', sha: base }, head: { sha: head },
  }));
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
    // A real history, so the prose check runs the real planStages: a base commit and two
    // branches from it, one changing only a framework path and one changing code.
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'config', 'user.email', 'test@example.com');
    writeFileSync(join(repo, 'README.md'), 'base\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'base');
    baseSha = git(repo, 'rev-parse', 'HEAD');
    git(repo, 'checkout', '-q', '-b', 'prose');
    writeFileSync(join(repo, 'feature-catalog.yaml'), 'items: []\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'backlog edit');
    proseSha = git(repo, 'rev-parse', 'HEAD');
    git(repo, 'checkout', '-q', 'main');
    git(repo, 'checkout', '-q', '-b', 'code');
    mkdirSync(join(repo, 'src'));
    writeFileSync(join(repo, 'src/app.js'), 'export {};\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'code change');
    codeSha = git(repo, 'rev-parse', 'HEAD');
    git(repo, 'checkout', '-q', 'main');
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

  it.each([
    ['does not say it was enabled', '{"enabled":false}', "the cloud session's route did not say it was enabled"],
    ['answers with something other than JSON', 'not json', "the cloud session's route answered with something other than JSON"],
  ])('reports a cloud route that %s, though gh exited 0', (_, said, why) => {
    writeFileSync(join(dir, 'merge-answer'), `1\n${GRAPHQL_403}\n`);
    writeFileSync(join(dir, 'route-stdout'), `${said}\n`);
    const r = cli(...standard);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe(`Pull request #17: not set to merge itself — ${why}.\n`);
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
    [['17', '--rebase', '--subject', subject]],
    [['17', '--rebase', '--body', body]],
    [['17', '--subject', subject, '--body', body, '--rebase']],
    [['17', '--rebase', '--rebase']],
  ])('refuses the command line %j with its usage and exit 2', (args) => {
    const r = cli(...args);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('usage: auto-merge.mjs <number> --subject <subject> --body <body>');
    expect(r.stderr).toContain('auto-merge.mjs <number> --rebase');
    expect(calls()).toEqual([]);
  });

  describe('--rebase, for a pull request of prose alone', () => {
    const NOT_PROSE = "Pull request #17: not set to merge itself — it is not prose: the pipeline's plan runs "
      + 'sanity, unit, integration, end-to-end, deploy on it, and only prose merges by rebase.\n';
    const reads = () => calls().filter((c) => c[0] === 'api' && c[1] === 'repos/{owner}/{repo}/pulls/17');
    const merges = () => calls().filter((c) => c[0] === 'pr');
    const routes = () => calls().filter((c) => c[0] === 'api' && c[3]?.endsWith('/ccr/auto_merge'));

    it('sets a rebase with gh pr merge, no title and no message', () => {
      pullIs(proseSha);
      const r = cli('17', '--rebase');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('Pull request #17: set to merge itself by rebase.\n');
      expect(reads()).toHaveLength(1);
      expect(merges()).toEqual([['pr', 'merge', '17', '--auto', '--rebase']]);
      expect(routes()).toEqual([]);
    });

    it('sets a rebase through the cloud session route on the GraphQL refusal, with no title or message', () => {
      pullIs(proseSha);
      writeFileSync(join(dir, 'merge-answer'), `1\n${GRAPHQL_403}\n`);
      writeFileSync(join(dir, 'route-stdout'), '{"enabled":true,"merge_method":"rebase"}\n');
      const r = cli('17', '--rebase');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe(
        "Pull request #17: set to merge itself by rebase, through the cloud session's route.\n",
      );
      expect(routes()).toEqual([[
        'api', '-X', 'PUT', 'repos/{owner}/{repo}/pulls/17/ccr/auto_merge', '-f', 'merge_method=rebase',
      ]]);
    });

    it('refuses a pull request that is not prose, and sets nothing', () => {
      pullIs(codeSha);
      const r = cli('17', '--rebase');
      expect(r.status).toBe(1);
      expect(r.stdout).toBe(NOT_PROSE);
      expect(merges()).toEqual([]);
      expect(routes()).toEqual([]);
    });

    it.each([
      ['head', (sha) => pullIs(sha)],
      ['base', (sha) => pullIs(proseSha, sha)],
    ])('refuses when the %s commit is not in the repository', (_, set) => {
      const missing = 'deadbeef'.repeat(5);
      set(missing);
      const r = cli('17', '--rebase');
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('Pull request #17: not set to merge itself — deadbee is not in this repository; '
        + 'run git fetch origin and run this again.\n');
      expect(merges()).toEqual([]);
      expect(routes()).toEqual([]);
    });

    it('refuses when the pull request cannot be read', () => {
      pullIs(proseSha);
      writeFileSync(join(dir, 'pull-fails'), '');
      const r = cli('17', '--rebase');
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('Pull request #17: not set to merge itself — gh could not read the pull request: '
        + 'gh: Not Found (HTTP 404).\n');
      expect(merges()).toEqual([]);
    });

    it('does not read the pull request for a squash', () => {
      pullIs(codeSha);
      const r = cli(...standard);
      expect(r.status).toBe(0);
      expect(reads()).toEqual([]);
    });
  });
});

// The backlog item a-sessions-prose-lands-as-one-pull-request is shipped on these
// statements: each one is what an acceptance criterion says the workflow tells a session.
// Joined on whitespace, since the source wraps its lines.
describe('the workflow tells a session how its prose lands', () => {
  const read = (path) => readFileSync(join(resolve(here, '..'), path), 'utf8').replace(/\s+/g, ' ');
  const workflow = read('framework/workflow.md');

  it.each([
    ['the batch, one commit and one push per step', '**One commit per step, with its own message, pushed when the step is done.**'],
    ['its worktree of its own', 'on a branch `prose/<yyyy-mm-dd>-<slug>` in a worktree `../<repo>-prose-<slug>`'],
    ['prose as the pipeline plan says', 'prints `framework=run` and `skipped` for every other stage. Nothing else decides it.'],
    ['the developer\'s word', '**The pull request opens on the developer\'s word.**'],
    ['the rebase merge', 'Set it to merge itself by rebase, `node .tropis/scripts/auto-merge.mjs <N> --rebase`'],
    ['a turn that ends with steps not landed', 'It names the batch\'s branch and the subject of each commit on it.'],
    ['a dispatch first', 'Before a dispatch, say that the plan is not on the main branch yet'],
    ['a step that is not prose, by cherry-pick', 'cherry-pick that commit onto a branch of its own from `origin/main`'],
    ['never the stash', 'Never `git stash`'],
    ['nobody to give the word', '**A session with nobody to give the word does not batch.**'],
  ])('says %s', (_, statement) => {
    expect(workflow).toContain(statement);
  });

  it('has dispatch land a plan still in the batch first', () => {
    expect(read('commands/dispatch.md')).toContain('say that it is not on the main branch yet and ask the developer for the word to land the batch');
  });
});
