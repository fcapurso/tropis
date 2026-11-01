// Level: unit
/**
 * Guards what the hooks SAY, as behaviour.
 *
 * A test that reads a script cannot tell you the script runs, and a test that reads a
 * hook's raw stdout cannot tell you an agent hears it. Plain stdout from a PreToolUse
 * hook reaches no agent: Claude Code drops it and Cursor refuses the call. Measured on
 * 2026-10-09 in the project this framework came from; the table is in
 * .claude/rules/harness-scripts.md. So every assertion on what a hook said reads it
 * through contextOf(), which fails unless the hook sent the one reply both tools pass
 * on — and a hook that goes back to printing plain text turns this file red.
 *
 * Rules themselves are not delivered by a hook: Claude Code loads every
 * .claude/rules/*.md at session start (FW-008). This file covers the hooks that speak at
 * a moment — writing a rule, committing one, merging a plan.
 *
 * Each case uses a unique session id, because a hook that deduplicates per session would
 * make every case after the first assert on empty output.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, rmSync, readdirSync, readFileSync, existsSync,
  mkdirSync, writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
// Pointed at fixtures/ by scripts/check-conformance.sh, so this guard can be seen to
// fail. Unset in normal use, when it resolves to the repository root as before.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../../..');
const mergeHook = resolve(root, '.tropis/hooks/capture-at-merge.sh');

let seq = 0;
const freshSession = () => `p13-${process.pid}-${seq++}`;

/**
 * Run capture-at-merge.sh the way Claude Code does for Bash PreToolUse.
 * @param {string} command The Bash tool_input.command string.
 * @param {NodeJS.ProcessEnv} [env] Environment override; defaults to inheriting.
 */
function runMergeHook(command, env) {
  const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  const result = spawnSync('bash', [mergeHook], {
    input: payload,
    cwd: root,
    encoding: 'utf8',
    ...(env ? { env } : {}),
  });
  if (result.error) throw result.error;
  return { stdout: result.stdout, status: result.status };
}

const writeHook = resolve(here, '../scripts/capture-at-write.sh');
const PHASE2 = 'Does it state its mechanism?';

function runWriteHookOn(repoRoot, relPath, opts = {}) {
  const session = opts.session ?? freshSession();
  const payload = opts.payload ?? JSON.stringify({
    file_path: resolve(repoRoot, relPath),
    session_id: session,
  });
  const result = spawnSync('bash', [writeHook], {
    input: payload,
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return { stdout: result.stdout, status: result.status, session };
}

/** A throwaway repo with the command file the hook extracts from. */
function repoWithCaptureCommand() {
  const dir = mkdtempSync(join(tmpdir(), 'capture-write-'));
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  mkdirSync(resolve(dir, '.claude/rules'), { recursive: true });
  mkdirSync(resolve(dir, '.claude/commands'), { recursive: true });
  mkdirSync(resolve(dir, '.claude/framework'), { recursive: true });
  writeFileSync(resolve(dir, '.claude/rules/backend.md'), '# backend\n');
  writeFileSync(resolve(dir, '.claude/framework/workflow.md'), '# workflow\n');
  writeFileSync(
    resolve(dir, '.claude/commands/capture-learning.md'),
    [
      'preamble that must not print',
      '<!-- capture-check:begin -->',
      '## Phase 2 — Assess operational reach',
      '',
      '**1. Does it state its mechanism?** Not "do not do X".',
      '**3. Where is it delivered?**',
      '<!-- capture-check:end -->',
      '## Then',
      'must not print',
      '',
    ].join('\n'),
  );
  return dir;
}

/** The environment as another tool would present it — no Claude Code marker. */
function withoutClaudeCode() {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  return env;
}

/** The environment Claude Code presents — its marker set. */
function asClaudeCode() {
  return { ...process.env, CLAUDECODE: '1' };
}

/**
 * What a hook's reply delivers to the agent: the additionalContext of the one JSON
 * object it printed. Throws when the hook printed anything else — plain stdout reaches
 * no agent, so a hook that prints it has stopped speaking, and the test that called this
 * must go red. Also fails on a permission key: Cursor reads "permission" as the hook's
 * verdict on the call, and a hook that answers "allow" has approved whatever it saw.
 * @param {string} stdout
 * @returns {string}
 */
function contextOf(stdout) {
  const reply = JSON.parse(stdout);
  expect(reply.hookSpecificOutput?.hookEventName).toBe('PreToolUse');
  expect(Object.keys(reply).filter((k) => /permission|decision/i.test(k))).toEqual([]);
  expect(Object.keys(reply.hookSpecificOutput).filter((k) => /permission|decision/i.test(k))).toEqual([]);
  return reply.hookSpecificOutput.additionalContext;
}

describe('rule delivery', () => {

  describe('capture-at-merge fires on a plan merge and stays silent otherwise', () => {
    // A text-level check cannot tell whether this hook runs. A script that emits
    // nothing looks exactly like one that works.
    it('emits the routing questions for gh pr merge', () => {
      const { stdout, status } = runMergeHook('gh pr merge 21 --squash');
      expect(status).toBe(0);
      const said = contextOf(stdout);
      expect(said).toContain('Learnings routed');
      expect(said).toContain('.claude/framework/workflow.md');
    });

    it('emits nothing for a non-merge command', () => {
      const { stdout, status } = runMergeHook('npm test');
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('names the review record the merging party owes', () => {
      const { stdout } = runMergeHook('gh pr merge 27 --squash --delete-branch');
      const said = contextOf(stdout);
      expect(said).toContain('Review record');
      expect(said).toMatch(/self-merg/i);
    });

    it('stays silent when a search only mentions gh pr merge', () => {
      const { stdout, status } = runMergeHook("grep -rn 'gh pr merge' docs/");
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('stays silent when a commit message only mentions gh pr merge', () => {
      const { stdout, status } = runMergeHook('git commit -m "say when to gh pr merge"');
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('emits the routing questions for gh pr merge with a pull request number', () => {
      const { stdout, status } = runMergeHook('gh pr merge 3 --squash');
      expect(status).toBe(0);
      expect(contextOf(stdout)).toContain('Learnings routed');
    });
  });

  describe('a hook sends the same reply whichever tool runs it', () => {
    // These hooks used to say nothing outside Claude Code, because Cursor refused their
    // plain stdout. The JSON reply is accepted by both, so one reply goes to both: each
    // hook is run with and without the marker Claude Code sets, and must send identical
    // bytes.
    const commitHookPath = resolve(root, '.tropis/hooks/framework-commit-check.sh');
    const tmpDirs = [];

    afterAll(() => {
      for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
    });

    /** A repo with a modified rule file — the state that triggers the advisory. */
    function dirtyRuleRepo() {
      const dir = mkdtempSync(join(tmpdir(), 'hook-reply-'));
      tmpDirs.push(dir);
      spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
      mkdirSync(resolve(dir, '.claude/rules'), { recursive: true });
      writeFileSync(resolve(dir, '.claude/rules/backend.md'), 'x\n');
      return dir;
    }

    function runCommitHook(cwd, env) {
      const payload = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "x"' },
      });
      const r = spawnSync('bash', [commitHookPath], {
        input: payload, cwd, encoding: 'utf8', env,
      });
      if (r.error) throw r.error;
      return { stdout: r.stdout, status: r.status };
    }

    it('framework-commit-check sends the same reply with and without Claude Code', () => {
      const dir = dirtyRuleRepo();
      const inClaude = runCommitHook(dir, asClaudeCode());
      const elsewhere = runCommitHook(dir, withoutClaudeCode());

      expect(contextOf(inClaude.stdout)).toContain('fresh-agent check');
      expect(elsewhere.stdout).toBe(inClaude.stdout);
      expect(elsewhere.status).toBe(0);
    });

    it('capture-at-merge sends the same reply with and without Claude Code', () => {
      const cmd = 'gh pr merge 29 --squash';
      const inClaude = runMergeHook(cmd, asClaudeCode());
      const elsewhere = runMergeHook(cmd, withoutClaudeCode());

      expect(contextOf(inClaude.stdout)).toContain('Learnings routed');
      expect(elsewhere.stdout).toBe(inClaude.stdout);
    });

    it('capture-at-write sends the same reply with and without Claude Code', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      const payload = (session) => JSON.stringify({
        session_id: session,
        tool_name: 'Edit',
        tool_input: { file_path: resolve(dir, '.claude/rules/backend.md') },
      });
      const run = (env) => spawnSync('bash', [writeHook], {
        input: payload(freshSession()), cwd: dir, encoding: 'utf8', env,
      });
      const inClaude = run(asClaudeCode());
      const elsewhere = run(withoutClaudeCode());

      expect(contextOf(inClaude.stdout)).toContain(PHASE2);
      expect(elsewhere.stdout).toBe(inClaude.stdout);
    });
  });

  describe('framework-commit-check fires when a commit carries the instruction layer', () => {
    // This hook exists because the requirement it carries was stated in text and
    // did not reach a fresh agent under test — twice, once when the agent was
    // asked outright to enumerate every obligation on the commit. So the text
    // version is not evidence that anything is delivered, and only running the
    // script is.
    //
    // Each case builds a throwaway repository, because the hook reads the
    // working tree: asserting against this repository's own tree would make the
    // result depend on whatever the suite happened to be run beside.
    const commitHook = resolve(root, '.tropis/hooks/framework-commit-check.sh');
    const tmps = [];

    afterAll(() => {
      for (const d of tmps) rmSync(d, { recursive: true, force: true });
    });

    /**
     * A git repository containing exactly the given paths, uncommitted.
     * @param {string[]} paths Repo-relative paths to create.
     * @param {string} [branch] Branch name to check out.
     * @param {object} [projectJson] Written as .tropis/project.json and committed first,
     *   so the hook does not list it as a change.
     */
    function repoWith(paths, branch = 'plan/x', projectJson) {
      const dir = mkdtempSync(join(tmpdir(), 'commit-hook-'));
      tmps.push(dir);
      spawnSync('git', ['init', '-q', '-b', branch], { cwd: dir });
      if (projectJson !== undefined) {
        mkdirSync(resolve(dir, '.tropis'), { recursive: true });
        writeFileSync(resolve(dir, '.tropis/project.json'), `${JSON.stringify(projectJson)}\n`);
        spawnSync('git', ['add', '.tropis/project.json'], { cwd: dir });
        const c = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'project'], { cwd: dir });
        if (c.status !== 0) throw new Error('could not commit .tropis/project.json');
      }
      for (const p of paths) {
        mkdirSync(dirname(resolve(dir, p)), { recursive: true });
        writeFileSync(resolve(dir, p), 'x\n');
      }
      return dir;
    }

    /**
     * Run the hook the way Claude Code does for a Bash PreToolUse.
     * @param {string} command The Bash tool_input.command string.
     * @param {string} cwd Directory to run it in.
     */
    function runCommitHook(command, cwd) {
      const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
      const r = spawnSync('bash', [commitHook], {
        input: payload,
        cwd,
        encoding: 'utf8',
      });
      if (r.error) throw r.error;
      return { stdout: r.stdout, status: r.status };
    }

    it('names the fresh-agent-check obligation when a rule file is being committed', () => {
      const dir = repoWith(['.claude/rules/backend.md']);
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      const said = contextOf(stdout);
      expect(said).toContain('.claude/rules/backend.md');
      expect(said).toContain('fresh-agent check');
    });

    it('asks for the operating system and architecture, not the machine', () => {
      const dir = repoWith(['.claude/rules/backend.md']);
      const { stdout } = runCommitHook('git commit -m "x"', dir);
      const said = contextOf(stdout);
      expect(said).toContain('operating system and architecture');
      expect(said).not.toContain('machine');
    });

    it('fires for .claude/framework/ as well as .claude/rules/', () => {
      const dir = repoWith(['.claude/framework/workflow.md']);
      const { stdout } = runCommitHook('git commit -m "x"', dir);
      expect(contextOf(stdout)).toContain('.claude/framework/workflow.md');
    });

    it('fires when the add and the commit are one command, nothing staged yet', () => {
      // `git add -A && git commit` is the common shape. At PreToolUse time the
      // add has not run, so a hook reading only the index would see nothing.
      const dir = repoWith(['.claude/rules/tests.md']);
      const { stdout } = runCommitHook('git add -A && git commit -m "x"', dir);
      expect(contextOf(stdout)).toContain('.claude/rules/tests.md');
    });

    it('says a branch is required when the commit is on main', () => {
      const dir = repoWith(['.claude/rules/backend.md'], 'main');
      const { stdout } = runCommitHook('git commit -m "x"', dir);
      const said = contextOf(stdout);
      expect(said).toContain('on main');
      expect(said).toContain('branch');
    });

    it('does not raise the branch warning when already on a branch', () => {
      const dir = repoWith(['.claude/rules/backend.md'], 'plan/y');
      const { stdout } = runCommitHook('git commit -m "x"', dir);
      const said = contextOf(stdout);
      expect(said).toContain('fresh-agent check');
      expect(said).not.toContain('on main');
    });

    it('stays silent for a commit that touches no instruction-layer file', () => {
      const dir = repoWith(['src/backend/thing.js']);
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('stays silent for a command that is not a commit', () => {
      const dir = repoWith(['.claude/rules/backend.md']);
      const { stdout, status } = runCommitHook('npm test', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('names a command and requires a branch when the commit is on main', () => {
      const dir = repoWith(['.claude/commands/x.md'], 'main');
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('This commit touches commands:');
      expect(said).toContain('.claude/commands/x.md');
      expect(said).toContain('commit body must say what');
      expect(said).toContain(
        'You are on main. workflow.md requires a change under .claude/commands/ to arrive on a branch.',
      );
    });

    it('treats a rule addition as the instruction layer', () => {
      const dir = repoWith(['.claude/rule-additions/x.md'], 'main');
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('This commit touches the instruction layer:');
      expect(said).toContain('.claude/rule-additions/x.md');
      expect(said).toContain('fresh-agent check');
    });

    it('names a file outside the may-go-to-main paths when the commit is on main', () => {
      const dir = repoWith(['src/app.js'], 'main', { ungated: "the probe's reason" });
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('src/app.js');
      expect(said).toContain('belong on a branch');
    });

    it('stays silent on main for a docs file alone when a reason is recorded', () => {
      const dir = repoWith(['docs/notes.md'], 'main', { ungated: "the probe's reason" });
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('stays silent on main for the release notes alone, which /release commits there when a reason is recorded', () => {
      const dir = repoWith(['RELEASES.md'], 'main', { ungated: "the probe's reason" });
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('stays silent on main for the README alone, which /refresh-readme commits there when a reason is recorded', () => {
      const dir = repoWith(['README.md'], 'main', { ungated: "the probe's reason" });
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('stays silent on main for the backlog alone when a reason is recorded', () => {
      const dir = repoWith(['feature-catalog.yaml'], 'main', { ungated: "the probe's reason" });
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('on a gated main names the backlog and says to use a pull request that merges itself', () => {
      const dir = repoWith(['feature-catalog.yaml'], 'main');
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('feature-catalog.yaml');
      expect(said).toContain('belong on a branch');
      expect(said).toContain('main branch is gated');
      expect(said).toContain('gh pr merge <N> --auto --squash');
      expect(said).toContain('main-status.mjs --pull-request <N>');
    });

    it('on a gated main names docs too', () => {
      const dir = repoWith(['docs/notes.md'], 'main');
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('docs/notes.md');
      expect(said).toContain('main branch is gated');
    });

    it('a reason recorded only in the old .claude/project.json counts as gated', () => {
      const dir = repoWith(['docs/notes.md'], 'main');
      mkdirSync(resolve(dir, '.claude'), { recursive: true });
      writeFileSync(resolve(dir, '.claude/project.json'), '{ "ungated": "a reason" }\n');
      spawnSync('git', ['add', '.claude/project.json'], { cwd: dir });
      spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'old place'], { cwd: dir });
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('main branch is gated');
    });

    it('a blank ungated counts as gated', () => {
      const dir = repoWith(['docs/notes.md'], 'main', { ungated: ' ' });
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('main branch is gated');
    });

    it('stays silent off main whether or not a reason is recorded', () => {
      const dir = repoWith(['docs/notes.md'], 'plan/x');
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('stays silent off main for a file outside the instruction layer and commands', () => {
      const dir = repoWith(['src/app.js']);
      const { stdout, status } = runCommitHook('git commit -m "x"', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('names a command without the main warning when already on a branch', () => {
      const dir = repoWith(['.claude/commands/x.md']);
      const said = contextOf(runCommitHook('git commit -m "x"', dir).stdout);
      expect(said).toContain('This commit touches commands:');
      expect(said).toContain('.claude/commands/x.md');
      expect(said).not.toContain('on main');
    });

    it('stays silent when the command only mentions git commit', () => {
      const dir = repoWith(['.claude/rules/x.md'], 'main');
      const { stdout, status } = runCommitHook('grep -rn "git commit" .', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('still names the instruction layer when the commit message mentions gh pr merge', () => {
      const dir = repoWith(['.claude/rules/x.md'], 'main');
      const command = [
        'git commit -m "$(cat <<\'EOF\'',
        'fix: say when to gh pr merge',
        'EOF',
        ')"',
      ].join('\n');
      const said = contextOf(runCommitHook(command, dir).stdout);
      expect(said).toContain('This commit touches the instruction layer:');
      expect(said).toContain('.claude/rules/x.md');
    });
  });

  describe('public-exposure-check speaks at commit and push, and only in a public project', () => {
    // A guard knows only the names it was given; a reader of the diff catches the next
    // one. This hook puts that reader in front of the diff at the two moments content
    // becomes exposed. A hook that never speaks passes every silence test, so each
    // silence below has a twin where the same command in a public project must speak.
    const exposureHook = resolve(root, '.tropis/hooks/public-exposure-check.sh');
    const settingsTemplate = resolve(here, '../templates/settings.json');
    const COMMIT_SAYS = 'what you are about to commit';
    const PUSH_SAYS = 'what you are about to push';
    const tmps = [];

    afterAll(() => {
      for (const d of tmps) rmSync(d, { recursive: true, force: true });
    });

    /**
     * A git repository with a subdirectory, and .tropis/project.json holding `declaration`
     * verbatim — or no such file when it is undefined.
     * @param {string} [declaration]
     */
    function project(declaration) {
      const dir = mkdtempSync(join(tmpdir(), 'exposure-hook-'));
      tmps.push(dir);
      spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
      mkdirSync(resolve(dir, 'src/deep'), { recursive: true });
      writeFileSync(resolve(dir, 'src/deep/a.js'), 'x\n');
      if (declaration !== undefined) {
        mkdirSync(resolve(dir, '.tropis'), { recursive: true });
        writeFileSync(resolve(dir, '.tropis/project.json'), declaration);
      }
      return dir;
    }

    const PUBLIC = '{ "public": true }\n';

    /**
     * Run the hook with the payload Claude Code sends for a Bash PreToolUse.
     * @param {string} command tool_input.command
     * @param {string} cwd
     * @param {NodeJS.ProcessEnv} [env]
     */
    function runExposureHook(command, cwd, env) {
      const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
      const r = spawnSync('bash', [exposureHook], {
        input: payload, cwd, encoding: 'utf8', ...(env ? { env } : {}),
      });
      if (r.error) throw r.error;
      return { stdout: r.stdout, status: r.status };
    }

    const notPublic = [
      ['absent', undefined],
      ['{"public": false}', '{"public": false}\n'],
      ['not JSON', 'public: true\n'],
      ['"public" as a string', '{"public": "true"}\n'],
    ];
    for (const [label, declaration] of notPublic) {
      for (const command of ['git commit -m x', 'git push']) {
        it(`says nothing on ${command} when .tropis/project.json is ${label}`, () => {
          const { stdout, status } = runExposureHook(command, project(declaration));
          expect(status).toBe(0);
          expect(stdout).toBe('');
        });
      }
    }

    it('says nothing when only the old .claude/project.json declares the project public', () => {
      const dir = project(undefined);
      mkdirSync(resolve(dir, '.claude'), { recursive: true });
      writeFileSync(resolve(dir, '.claude/project.json'), PUBLIC);
      const { stdout, status } = runExposureHook('git commit -m x', dir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('in a public project, tells the agent to read what a commit carries', () => {
      const { stdout, status } = runExposureHook('git commit -m x', project(PUBLIC));
      expect(status).toBe(0);
      const said = contextOf(stdout);
      expect(said).toContain('This repository is public');
      expect(said).toContain(COMMIT_SAYS);
      expect(said).toContain('git status -uall; git diff --cached');
      expect(said).toContain('stop and ask the developer before going on');
      expect(said).not.toContain(PUSH_SAYS);
    });

    it('in a public project, tells the agent to read what a push carries', () => {
      const { stdout, status } = runExposureHook('git push origin HEAD', project(PUBLIC));
      expect(status).toBe(0);
      const said = contextOf(stdout);
      expect(said).toContain('This repository is public');
      expect(said).toContain(PUSH_SAYS);
      expect(said).toContain('git log -p @{upstream}..HEAD');
      expect(said).toContain('stop and ask the developer before going on');
      expect(said).not.toContain(COMMIT_SAYS);
    });

    it('sends the same reply with and without Claude Code', () => {
      const dir = project(PUBLIC);
      for (const command of ['git commit -m x', 'git push origin HEAD']) {
        const inClaude = runExposureHook(command, dir, asClaudeCode());
        const elsewhere = runExposureHook(command, dir, withoutClaudeCode());
        expect(contextOf(inClaude.stdout)).toContain('This repository is public');
        expect(elsewhere.stdout).toBe(inClaude.stdout);
        expect(elsewhere.status).toBe(0);
      }
    });

    it('speaks for a commit run inside a compound command', () => {
      const said = contextOf(runExposureHook('git add -A && git commit -m x', project(PUBLIC)).stdout);
      expect(said).toContain(COMMIT_SAYS);
    });

    it('speaks for both, commit first, when one command commits and pushes', () => {
      const said = contextOf(runExposureHook('git commit -m x && git push', project(PUBLIC)).stdout);
      expect(said).toContain(COMMIT_SAYS);
      expect(said).toContain(PUSH_SAYS);
      expect(said.indexOf(COMMIT_SAYS)).toBeLessThan(said.indexOf(PUSH_SAYS));
    });

    for (const command of ['git status', 'echo "git push"', 'grep "git commit" notes.md']) {
      it(`says nothing in a public project on ${command}`, () => {
        const { stdout, status } = runExposureHook(command, project(PUBLIC));
        expect(status).toBe(0);
        expect(stdout).toBe('');
      });
    }

    it('speaks from a subdirectory: the root is resolved by git, not the working directory', () => {
      const dir = project(PUBLIC);
      const { stdout, status } = runExposureHook('git commit -m x', resolve(dir, 'src/deep'));
      expect(status).toBe(0);
      expect(contextOf(stdout)).toContain(COMMIT_SAYS);
    });

    it('is wired once, under the Bash matcher, with no if', () => {
      // Two triggers through one if is impossible, and Cursor ignores if anyway
      // (harness-scripts.md, Wire a hook once): the script filters for itself.
      const settings = JSON.parse(readFileSync(settingsTemplate, 'utf8'));
      const wired = settings.hooks.PreToolUse.flatMap((group) => (group.hooks ?? [])
        .filter((h) => h.command.includes('public-exposure-check.sh'))
        .map((h) => ({ matcher: group.matcher, ...h })));
      expect(wired).toEqual([
        { matcher: 'Bash', type: 'command', command: 'bash .tropis/hooks/public-exposure-check.sh' },
      ]);
    });
  });

  describe('branch-in-worktree refuses a branch created in the main checkout', () => {
    // A refusal is exit 2 with the message on stderr and nothing on stdout: measured to
    // stop the call and reach the agent in both tools (harness-scripts.md).
    const branchHook = resolve(root, '.tropis/hooks/branch-in-worktree.sh');
    const settingsTemplate = resolve(here, '../templates/settings.json');
    const installedHooks = resolve(here, '../scripts/installed-hooks.txt');
    const tmps = [];
    const git = (cwd, ...args) => {
      const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
      return r.stdout.trim();
    };

    afterAll(() => {
      for (const d of tmps) rmSync(d, { recursive: true, force: true });
    });

    /**
     * A main checkout named `main-checkout` inside its own scratch folder, with one commit
     * and, unless `origin` is false, a bare repository as origin with main pushed.
     * @param {{ origin?: boolean }} [options]
     */
    function checkout({ origin = true } = {}) {
      const parent = mkdtempSync(join(tmpdir(), 'branch-hook-'));
      tmps.push(parent);
      const dir = join(parent, 'main-checkout');
      mkdirSync(dir);
      git(dir, 'init', '-q', '-b', 'main');
      git(dir, 'config', 'user.email', 'probe@example.test');
      git(dir, 'config', 'user.name', 'Probe');
      writeFileSync(join(dir, 'a.txt'), 'a\n');
      git(dir, 'add', '.');
      git(dir, 'commit', '-q', '-m', 'a');
      if (origin) {
        const bare = join(parent, 'origin.git');
        git(parent, 'init', '-q', '--bare', bare);
        git(dir, 'remote', 'add', 'origin', bare);
        git(dir, 'push', '-q', 'origin', 'main');
      }
      return { parent, dir };
    }

    function runBranchHook(command, cwd) {
      const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
      const r = spawnSync('bash', [branchHook], { input: payload, cwd, encoding: 'utf8' });
      if (r.error) throw r.error;
      return { stdout: r.stdout, stderr: r.stderr, status: r.status };
    }

    const refused = [
      'git checkout -b feature/x',
      'git checkout -B feature/x',
      'git switch -c feature/x',
      'git switch --create feature/x',
      'git switch --create=feature/x',
      'git branch feature/x',
      'git branch feature/x main',
      'git -C . checkout -b feature/x',
      'git fetch origin && git checkout -b feature/x',
    ];
    const LINE = 'git worktree add ../main-checkout-x -b feature/x';

    for (const command of refused) {
      it(`refuses ${command}`, () => {
        const { dir } = checkout();
        const r = runBranchHook(command, dir);
        expect(r.status).toBe(2);
        expect(r.stdout).toBe('');
        expect(r.stderr).toContain('This is the main checkout of main-checkout.');
        expect(r.stderr.replace(/\s+/g, ' ')).toContain('based on origin/main');
        expect(r.stderr).toContain(`  git fetch origin && ${LINE} origin/main\n`);
      });
    }

    it('refuses from a subdirectory of the main checkout', () => {
      const { dir } = checkout();
      mkdirSync(join(dir, 'src/deep'), { recursive: true });
      const r = runBranchHook('git switch -c feature/x', join(dir, 'src/deep'));
      expect(r.status).toBe(2);
      expect(r.stderr).toContain('This is the main checkout of main-checkout.');
    });

    it('says main, not origin/main, when there is no origin', () => {
      const { dir } = checkout({ origin: false });
      const r = runBranchHook('git checkout -b feature/x', dir);
      expect(r.status).toBe(2);
      expect(r.stdout).toBe('');
      expect(r.stderr.replace(/\s+/g, ' ')).toContain('based on main');
      expect(r.stderr).not.toContain('origin/main');
      expect(r.stderr).toContain(`  ${LINE} main\n`);
    });

    it('is silent in a linked worktree', () => {
      const { parent, dir } = checkout();
      const linked = join(parent, 'linked');
      git(dir, 'worktree', 'add', '-q', linked, '-b', 'other');
      for (const command of refused) {
        const r = runBranchHook(command, linked);
        expect({ command, ...r }).toEqual({ command, status: 0, stdout: '', stderr: '' });
      }
    });

    const allowed = [
      'git checkout main',
      'git switch main',
      'git branch',
      'git branch -d x',
      'git branch -D x',
      'git branch -m a b',
      "git branch --list 'p*'",
      'git branch --show-current',
      'git branch -a',
      'git worktree add ../y -b y origin/main',
      'git commit -m "git checkout -b x"',
      'grep -rn "git switch -c" .',
      'git status',
    ];
    for (const command of allowed) {
      it(`is silent in the main checkout on ${command}`, () => {
        const { dir } = checkout();
        const r = runBranchHook(command, dir);
        expect(r).toEqual({ status: 0, stdout: '', stderr: '' });
      });
    }

    it('is silent outside a repository', () => {
      const dir = mkdtempSync(join(tmpdir(), 'branch-hook-none-'));
      tmps.push(dir);
      const r = runBranchHook('git checkout -b feature/x', dir);
      expect(r).toEqual({ status: 0, stdout: '', stderr: '' });
    });

    it('prints a command that bases the branch on origin/main, not on the checked-out branch', () => {
      const { parent, dir } = checkout();
      const a = git(dir, 'rev-parse', 'HEAD');
      git(dir, 'switch', '-q', '-c', 'other');
      writeFileSync(join(dir, 'b.txt'), 'b\n');
      git(dir, 'add', '.');
      git(dir, 'commit', '-q', '-m', 'b');
      const b = git(dir, 'rev-parse', 'HEAD');
      const r = runBranchHook('git checkout -b feature/x', dir);
      const line = r.stderr.split('\n').find((l) => l.startsWith('  git fetch origin'));
      expect(line).toBeDefined();
      const run = spawnSync('bash', ['-c', line.trim()], { cwd: dir, encoding: 'utf8' });
      expect(run.status).toBe(0);
      const worktree = join(parent, 'main-checkout-x');
      expect(existsSync(worktree)).toBe(true);
      expect(git(worktree, 'rev-parse', 'HEAD')).toBe(a);
      expect(git(dir, 'rev-parse', 'HEAD')).toBe(b);
      expect(git(dir, 'branch', '--show-current')).toBe('other');
      git(dir, 'worktree', 'remove', '--force', worktree);
    });

    it('is wired once, under the Bash matcher with no if, between the commit check and the exposure check', () => {
      const settings = JSON.parse(readFileSync(settingsTemplate, 'utf8'));
      const bash = settings.hooks.PreToolUse.find((g) => g.matcher === 'Bash');
      const commands = bash.hooks.map((h) => h.command);
      const index = commands.indexOf('bash .tropis/hooks/branch-in-worktree.sh');
      expect(index).toBeGreaterThan(-1);
      expect(commands.indexOf('bash .tropis/hooks/framework-commit-check.sh')).toBe(index - 1);
      expect(commands.indexOf('bash .tropis/hooks/public-exposure-check.sh')).toBe(index + 1);
      expect(bash.hooks[index]).not.toHaveProperty('if');
      const wired = settings.hooks.PreToolUse.flatMap((g) => g.hooks ?? [])
        .filter((h) => h.command.includes('branch-in-worktree.sh'));
      expect(wired).toHaveLength(1);
      expect(readFileSync(installedHooks, 'utf8').split('\n')).toContain('branch-in-worktree.sh');
    });
  });

  describe('framework documents are reachable', () => {
    const FRAMEWORK_DIR = resolve(root, '.claude/framework');

    /** Files whose content is guaranteed to reach an agent. */
    function reachableRoots() {
      const entry = resolve(root, 'AGENTS.md');
      const roots = [entry];
      for (const dir of ['.claude/rules', '.claude/commands']) {
        const d = resolve(root, dir);
        for (const f of readdirSync(d)) if (f.endsWith('.md')) roots.push(resolve(d, f));
      }
      // The entry file's load-on-demand table is a route too, one hop out.
      // Without this, .claude/framework/DECISIONS.md reads as an orphan when it
      // is reached from the root DECISIONS.md that AGENTS.md names.
      for (const m of readFileSync(entry, 'utf8').matchAll(/`([^`\s]+\.md)`/g)) {
        const p = resolve(root, m[1]);
        if (existsSync(p)) roots.push(p);
      }
      return roots;
    }

    /** Framework filenames this text points at, by path or by @-import. */
    function pointsAt(text) {
      const names = new Set();
      for (const m of text.matchAll(/\.claude\/framework\/([A-Za-z0-9._-]+\.md)/g)) {
        names.add(m[1]);
      }
      return names;
    }

    it('reaches every file in .claude/framework from the entry file, a rule, or a command', () => {
      const all = readdirSync(FRAMEWORK_DIR).filter((f) => f.endsWith('.md'));

      const reached = new Set();
      const queue = reachableRoots().map((p) => readFileSync(p, 'utf8'));

      while (queue.length) {
        for (const name of pointsAt(queue.pop())) {
          if (reached.has(name)) continue;
          reached.add(name);
          const target = resolve(FRAMEWORK_DIR, name);
          // A dangling pointer is framework-integrity.test.js's property, not this one.
          if (existsSync(target)) queue.push(readFileSync(target, 'utf8'));
        }
      }

      const orphans = all.filter((f) => !reached.has(f));
      expect(orphans).toEqual([]);
    });
  });

  describe('capture-at-write surfaces Phase 2 when a rule is written', () => {
    const tmpDirs = [];
    afterAll(() => {
      for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
    });

    it('emits the check for a rule addition', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      mkdirSync(resolve(dir, '.claude/rule-additions'), { recursive: true });
      writeFileSync(resolve(dir, '.claude/rule-additions/planning.md'), '# planning\n');
      const { stdout, status } = runWriteHookOn(dir, '.claude/rule-additions/planning.md');
      expect(status).toBe(0);
      expect(contextOf(stdout)).toContain(PHASE2);
    });

    it('emits the three-question check for a rule file', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      const { stdout, status } = runWriteHookOn(dir, '.claude/rules/backend.md');
      expect(status).toBe(0);
      const said = contextOf(stdout);
      expect(said).toContain(PHASE2);
      expect(said).toContain('Where is it delivered?');
      expect(said).not.toContain('must not print');
    });

    it('emits for a decision record and a framework document', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      writeFileSync(resolve(dir, 'DECISIONS.md'), '# decisions\n');
      for (const rel of ['DECISIONS.md', '.claude/framework/workflow.md']) {
        const { stdout, status } = runWriteHookOn(dir, rel);
        expect(status).toBe(0);
        expect(contextOf(stdout)).toContain(PHASE2);
      }
    });

    it('emits nothing for a path that is not a rule, decision, or framework document', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      mkdirSync(resolve(dir, 'src/shared'), { recursive: true });
      writeFileSync(resolve(dir, 'src/shared/feature-catalog.js'), 'x\n');
      const { stdout, status } = runWriteHookOn(dir, 'src/shared/feature-catalog.js');
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('prints the check from the command file, not from a second copy in the hook', () => {
      const script = readFileSync(writeHook, 'utf8');
      expect(script).not.toContain(PHASE2);
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      const { stdout } = runWriteHookOn(dir, '.claude/rules/backend.md');
      expect(contextOf(stdout)).toContain(PHASE2);
    });

    it('emits the check at most once per session', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      writeFileSync(resolve(dir, '.claude/rules/tests.md'), '# tests\n');
      const session = freshSession();
      const first = runWriteHookOn(dir, '.claude/rules/backend.md', { session });
      const second = runWriteHookOn(dir, '.claude/rules/tests.md', { session });
      expect(contextOf(first.stdout)).toContain(PHASE2);
      expect(second.stdout).toBe('');
    });

    it('is wired on Edit and Write, and not on Read', () => {
      const settingsPath = resolve(here, '../templates/settings.json');
      if (!existsSync(settingsPath)) return;
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      const commandsFor = (matcher) => {
        const entry = settings.hooks.PreToolUse.find((h) => h.matcher === matcher);
        return (entry?.hooks ?? []).map((h) => h.command);
      };
      const script = 'bash .tropis/hooks/capture-at-write.sh';
      expect(commandsFor('Edit')).toContain(script);
      expect(commandsFor('Write')).toContain(script);
      expect(commandsFor('Read')).not.toContain(script);
    });

    it('wires no rule-injection hook on any matcher', () => {
      // Rules reach Claude Code by their paths: header; a hook printing them reached no agent
      // and, made audible, would deliver every rule twice (FW-008).
      const settingsPath = resolve(here, '../templates/settings.json');
      if (!existsSync(settingsPath)) return;
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      const all = settings.hooks.PreToolUse.flatMap((h) => h.hooks.map((x) => x.command));
      expect(all.filter((c) => /inject-rules/.test(c))).toEqual([]);
    });

    it('exits 0 with no output on malformed JSON', () => {
      const result = spawnSync('bash', [writeHook], {
        input: '{',
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    });

    it('emits for the Claude Code PreToolUse envelope', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      const payload = JSON.stringify({
        session_id: freshSession(),
        tool_name: 'Write',
        tool_input: { file_path: resolve(dir, '.claude/rules/backend.md') },
      });
      const { stdout, status } = runWriteHookOn(dir, '.claude/rules/backend.md', { payload });
      expect(status).toBe(0);
      expect(contextOf(stdout)).toContain(PHASE2);
    });

    it('stays silent for a Cursor-shaped path field', () => {
      const dir = repoWithCaptureCommand();
      tmpDirs.push(dir);
      const payload = JSON.stringify({
        session_id: freshSession(),
        path: resolve(dir, '.claude/rules/backend.md'),
      });
      const { stdout, status } = runWriteHookOn(dir, '.claude/rules/backend.md', { payload });
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });
  });

  describe('command-at-position', () => {
    // The commit and merge hooks decide through this script. A quoted mention
    // and a command actually being run are the same characters; only the exit
    // code tells them apart.
    const script = resolve(here, '../scripts/command-at-position.py');

    function exitFor(command, watched) {
      return spawnSync('python3', [script, ...watched], {
        input: command,
        encoding: 'utf8',
      }).status;
    }

    const heredocMessage = [
      'git commit -m "$(cat <<\'EOF\'',
      'fix: say when to gh pr merge',
      'EOF',
      ')"',
    ].join('\n');

    const gc = 'git commit -m x';

    const rows = [
      ['1', 'git commit -m "x"', ['git commit'], 0],
      ['2', 'git add -A && git commit -m "x"', ['git commit'], 0],
      ['3', 'cd sub; git commit', ['git commit'], 0],
      ['4', '(cd sub && git commit)', ['git commit'], 0],
      ['5', 'echo hi | git commit -F -', ['git commit'], 0],
      ['6', ['git status', 'git commit -m x'].join('\n'), ['git commit'], 0],
      ['7', 'echo $(git commit -m x)', ['git commit'], 0],
      ['8', 'echo `git commit`', ['git commit'], 0],
      ['9', 'GIT_AUTHOR_NAME=x git commit -m y', ['git commit'], 0],
      ['10', 'env -u HOME FOO=1 git commit', ['git commit'], 0],
      ['11', 'git -C ../other commit -m x', ['git commit'], 0],
      ['12', 'npx gh pr merge 3 --squash', ['gh pr merge'], 0],
      ['13', 'gh -R o/r pr merge 3', ['gh pr merge'], 0],
      ['14', 'gh pr view 3 && gh pr merge 3', ['gh pr merge'], 0],
      ['15', 'grep -rn "git commit" scripts/', ['git commit'], 1],
      ['16', 'grep -rn \'gh pr merge\' docs/', ['gh pr merge'], 1],
      ['17', 'echo git commit', ['git commit'], 1],
      ['18', 'git commit-tree HEAD^{tree}', ['git commit'], 1],
      ['19', 'git log --grep \'git commit\'', ['git commit'], 1],
      ['20', ['cat > notes.md <<\'EOF\'', 'run git commit later', 'EOF'].join('\n'), ['git commit'], 1],
      ['21', ['bash <<\'EOF\'', 'git commit -m x', 'EOF'].join('\n'), ['git commit'], 0],
      ['22', heredocMessage, ['gh pr merge'], 1],
      ['23', heredocMessage, ['git commit'], 0],
      ['24', 'echo "unterminated && git commit', ['git commit'], 0],
      ['25', 'echo "unterminated quote', ['git commit'], 0],
      ['26', 'git commit -m x', ['git commit', 'gh pr merge'], 0],
      // Found in review: shell keywords open a command position, and a backslash at the end
      // of a line continues it. The substring match caught these; the matcher must too.
      ['27', 'if ! git diff --quiet; then git commit -m x; fi', ['git commit'], 0],
      ['28', 'for f in a b; do git commit -m "$f"; done', ['git commit'], 0],
      ['29', 'while true; do git commit; done', ['git commit'], 0],
      ['30', '{ git commit -m x; }', ['git commit'], 0],
      ['31', '! git commit', ['git commit'], 0],
      ['32', ['git add . && \\', 'git commit -m x'].join('\n'), ['git commit'], 0],
      ['33', 'if true; then echo git commit; fi', ['git commit'], 1],
      // The shells that read a heredoc, comments, and the unparseable-means-match answer.
      ['34', ["dash <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['35', ["ksh <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['36', ["ssh host <<'EOF'", 'git push', 'EOF'].join('\n'), ['git push'], 0],
      ['37', ["ssh -p 2222 host <<'EOF'", 'git push', 'EOF'].join('\n'), ['git push'], 0],
      ['38', ["/bin/bash <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['39', ["cat <<'EOF' | bash", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['40', ["cat <<'EOF' | sh -s", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['41', ["bash > log.txt 2>&1 <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['42', ["2>/dev/null bash <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['43', ["<<'EOF' bash", gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['44', ["cat <<'EOF' | grep x", gc, 'EOF'].join('\n'), ['git commit'], 1],
      ['45', ["cat <<'EOF' > bash.txt", gc, 'EOF'].join('\n'), ['git commit'], 1],
      ['46', ["cat <<'EOF' || bash", gc, 'EOF'].join('\n'), ['git commit'], 1],
      ['47', ["bashful <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 1],
      ['48', ['# notes: cat <<EOF', gc, 'EOF'].join('\n'), ['git commit'], 0],
      ['49', ['# see <<EOF', 'echo hi'].join('\n'), ['git commit'], 1],
      ['50', ["# don't", 'echo hi'].join('\n'), ['git commit'], 1],
      ['51', ["# don't", gc].join('\n'), ['git commit'], 0],
      ['52', 'echo hi # ; git commit', ['git commit'], 1],
      ['53', '# git commit', ['git commit'], 1],
      ['54', 'git commit -m fix#12', ['git commit'], 0],
      ['55', "echo 'a # b' && git commit", ['git commit'], 0],
      ['56', ["cat <<'EOF'", gc].join('\n'), ['git commit'], 0],
      ['57', ["cat > f <<'EOF'", 'nothing here'].join('\n'), ['git commit'], 0],
      ['58', "echo 'unterminated", ['gh pr merge'], 0],
      ['59', 'grep -rn "git commit" scripts/ # a search', ['git commit'], 1],
      ['60', ["sudo -u ci bash <<'EOF'", gc, 'EOF'].join('\n'), ['git commit'], 0],
      // Found in review: the rest of a heredoc's own line, and every line after its body,
      // are commands too. The old matcher joined them to the command before the heredoc.
      ['61', ["cat > f <<'EOF'", 'body', 'EOF', gc].join('\n'), ['git commit'], 0],
      ['62', ["cat > f <<'EOF' && git commit -m x", 'body', 'EOF'].join('\n'), ['git commit'], 0],
      ['63', ["cat <<'A' <<'B'", 'a', 'A', 'b', 'B', gc].join('\n'), ['git commit'], 0],
      ['64', ["cat > f <<'EOF'", gc, 'EOF', 'echo done'].join('\n'), ['git commit'], 1],
      ['65', ["cat <<'A' | bash <<'B'", 'a', 'A', gc, 'B'].join('\n'), ['git commit'], 0],
    ];

    for (const [n, command, watched, expected] of rows) {
      it(`row ${n} ${expected === 0 ? 'matches' : 'does not match'}`, () => {
        expect(exitFor(command, watched)).toBe(expected);
      });
    }
  });
});
