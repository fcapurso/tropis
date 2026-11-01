// Level: unit
/**
 * The pipeline every set-up project runs. Six stages stay in one order, and the
 * deploy gate runs only when every earlier stage passed or was empty. Changing
 * the order or how the gate decides is a breaking release.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  stagingSlot,
  stagingSummary,
  environmentName,
  firstGreenRun,
  gateDecision,
  gateIsGreen,
  isProseAndFramework,
  matchesProse,
  runsFromRepository,
  STAGES,
} from '../scripts/pipeline.mjs';

const blueprint = join(dirname(fileURLToPath(import.meta.url)), '..');

const pipeline = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'pipeline.mjs');
const temps = [];

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function write(root, rel, text) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

/** An empty repository. Rename detection is on, so a plan that forgets --no-renames is visible. */
function repository() {
  const root = mkdtempSync(join(tmpdir(), 'tropis-plan-'));
  temps.push(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'diff.renames', 'true');
  return root;
}

function commit(root, message) {
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', message, '--allow-empty');
  return git(root, 'rev-parse', 'HEAD');
}

/** A repository whose origin has both `Fix/A` and `fix-a`. */
function collidingRepository() {
  const root = repository();
  const origin = mkdtempSync(join(tmpdir(), 'tropis-origin-'));
  temps.push(origin);
  git(origin, 'init', '-q', '--bare', '-b', 'main');
  commit(root, 'base');
  git(root, 'remote', 'add', 'origin', origin);
  git(root, 'branch', 'Fix/A');
  git(root, 'branch', 'fix-a');
  git(root, 'push', '-q', 'origin', 'Fix/A', 'fix-a');
  return root;
}

const BRANCH_SCRIPTS = ['create.sh', 'deploy.sh', 'remove.sh'];
const STAGING_SCRIPTS = ['reset.sh', 'deploy.sh'];

function fillBranchSlot(root, body = 'exit 0\n') {
  for (const name of BRANCH_SCRIPTS) write(root, `pipeline/branch/${name}`, body);
}

function fillStagingSlot(root, body = 'exit 0\n') {
  for (const name of STAGING_SCRIPTS) write(root, `pipeline/staging/${name}`, body);
}

function runPipeline(root, args, { env, input } = {}) {
  return spawnSync(process.execPath, [pipeline, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: env ? { ...process.env, ...env } : process.env,
    input,
  });
}

function parsePlan(stdout) {
  const stages = {};
  const lines = stdout.split('\n').filter((line) => line !== '');
  for (const line of lines) {
    const eq = line.indexOf('=');
    stages[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return { stages, lines };
}

const BREAKING = 'Changing the stage order is breaking: say so in RELEASES.md.';

const ORDER = ['framework', 'sanity', 'unit', 'integration', 'end-to-end', 'deploy'];
const BEFORE_DEPLOY = ORDER.slice(0, -1);

function pin(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${BREAKING}\n${label}\nexpected ${JSON.stringify(expected)}\ngot      ${JSON.stringify(actual)}`,
    );
  }
}

function planOf(overrides = {}) {
  const plan = {};
  for (const stage of ORDER) plan[stage] = 'run';
  return { ...plan, ...overrides };
}

function resultsOf(overrides = {}) {
  const results = {};
  for (const stage of BEFORE_DEPLOY) results[stage] = 'success';
  return { ...results, ...overrides };
}

describe('pipeline stages', () => {
  it('pins the six stages in order', () => {
    pin([...STAGES], ORDER, 'STAGES');
  });
});

describe('environment name', () => {
  it('names a plain branch, the long example, and a branch that starts with a digit', () => {
    expect(environmentName('feature/try-it')).toBe('feature-try-it');
    expect(environmentName('plan/setup-offers-ci-for-its-host')).toBe('plan-setup-offers-7b9e86');
    expect(environmentName('2-hotfix')).toBe('b-2-hotfix');
  });

  it('gives two long branches that share their first 17 characters different names', () => {
    const one = environmentName('plan/setup-offers-ci-for-its-host');
    const two = environmentName('plan/setup-offers-xx-different-name');
    expect(one).toBe('plan-setup-offers-7b9e86');
    expect(two).toBe('plan-setup-offers-715425');
    expect(one).not.toBe(two);
  });

  it('rejects a branch of only symbols', () => {
    expect(() => environmentName('///')).toThrow(/symbol/);
  });

  it('names both branches when case or punctuation collide, and exits 1', () => {
    const root = collidingRepository();
    const result = runPipeline(root, ['environment', 'Fix/A']);
    expect(result.status).toBe(1);
    const text = `${result.stdout}${result.stderr}`;
    expect(text).toContain('Fix/A');
    expect(text).toContain('fix-a');
  });

  it('prints the name when the repository has no origin', () => {
    const root = repository();
    const result = runPipeline(root, ['environment', 'feature/try-it']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('feature-try-it\n');
  });

  it('prints the name and exits 0 with --no-check when another branch would collide', () => {
    const root = collidingRepository();
    const skipped = runPipeline(root, ['environment', 'Fix/A', '--no-check']);
    expect(skipped.status).toBe(0);
    expect(skipped.stdout).toBe('fix-a\n');
    const checked = runPipeline(root, ['environment', 'Fix/A']);
    expect(checked.status).toBe(1);
    const text = `${checked.stdout}${checked.stderr}`;
    expect(text).toContain('Fix/A');
    expect(text).toContain('fix-a');
  });

  it('exits 2 when environment is given an argument other than --no-check', () => {
    const root = collidingRepository();
    const result = runPipeline(root, ['environment', 'Fix/A', '--other']);
    expect(result.status).toBe(2);
  });
});

describe('branch slot', () => {
  it('prints branch=empty with no slot and branch=filled when all three scripts exist', () => {
    const root = repository();
    const empty = runPipeline(root, ['plan']);
    expect(empty.status).toBe(0);
    expect(empty.stdout.trim().split('\n').at(-1)).toBe('branch=empty');
    fillBranchSlot(root);
    const filled = runPipeline(root, ['plan']);
    expect(filled.status).toBe(0);
    expect(filled.stdout.trim().split('\n').at(-1)).toBe('branch=filled');
  });

  it('exits 1 and names the missing script when two of the three exist', () => {
    const root = repository();
    write(root, 'pipeline/branch/create.sh', 'exit 0\n');
    write(root, 'pipeline/branch/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['plan']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('remove.sh');
    expect(result.stderr).not.toContain('create.sh');
    expect(result.stderr).not.toContain('deploy.sh');
  });

  it('runs deploy.sh with the environment name and the branch', () => {
    const root = repository();
    fillBranchSlot(root, 'exit 0\n');
    write(root, 'pipeline/branch/deploy.sh', 'printf "%s\\n%s\\n" "$TROPIS_ENVIRONMENT" "$TROPIS_BRANCH" > seen.txt\n');
    const result = runPipeline(root, ['branch', 'deploy', 'feature/try-it']);
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe('feature-try-it\nfeature/try-it\n');
  });

  it('remove runs when another branch would share the name, and deploy does not', () => {
    const root = collidingRepository();
    fillBranchSlot(root, 'exit 0\n');
    write(root, 'pipeline/branch/deploy.sh', 'printf deployed > seen.txt\n');
    write(root, 'pipeline/branch/remove.sh', 'printf removed > seen.txt\n');
    const deploy = runPipeline(root, ['branch', 'deploy', 'Fix/A']);
    expect(deploy.status).toBe(1);
    expect(statSync(join(root, 'seen.txt'), { throwIfNoEntry: false })).toBeUndefined();
    const removed = runPipeline(root, ['branch', 'remove', 'Fix/A']);
    expect(removed.status).toBe(0);
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe('removed');
  });

  it('create with an empty slot prints the empty line and exits 0', () => {
    const root = repository();
    const result = runPipeline(root, ['branch', 'create', 'feature/try-it']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('branch: empty — no pipeline/branch/\n');
  });

  describe('permanent environments', () => {
    const DEFAULT_WHY = '(a default permanent name; list yours in pipeline/branch/permanent.txt)';
    const LISTED_WHY = '(listed in pipeline/branch/permanent.txt)';
    const ran = (root) => statSync(join(root, 'seen.txt'), { throwIfNoEntry: false }) !== undefined;

    it.each(['create', 'deploy', 'remove'])('%s refuses production by default and runs nothing', (action) => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      const result = runPipeline(root, ['branch', action, 'production']);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe(
        `branch: production would use the environment production, which is permanent ${DEFAULT_WHY} — rename the branch.\n`,
      );
      expect(result.stdout).toBe('');
      expect(ran(root)).toBe(false);
    });

    it('refuses staging and development by their environment names', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      const staging = runPipeline(root, ['branch', 'deploy', 'Staging']);
      expect(staging.status).toBe(1);
      expect(staging.stderr).toBe(
        `branch: Staging would use the environment staging, which is permanent ${DEFAULT_WHY} — rename the branch.\n`,
      );
      const development = runPipeline(root, ['branch', 'create', 'development/']);
      expect(development.status).toBe(1);
      expect(development.stderr).toBe(
        `branch: development/ would use the environment development, which is permanent ${DEFAULT_WHY} — rename the branch.\n`,
      );
      expect(ran(root)).toBe(false);
    });

    it('a permanent.txt replaces the default list', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      write(root, 'pipeline/branch/permanent.txt', '  Live\r\n# comment\n\n');
      const live = runPipeline(root, ['branch', 'deploy', 'live']);
      expect(live.status).toBe(1);
      expect(live.stderr).toBe(
        `branch: live would use the environment live, which is permanent ${LISTED_WHY} — rename the branch.\n`,
      );
      expect(ran(root)).toBe(false);
      const production = runPipeline(root, ['branch', 'deploy', 'production']);
      expect(production.status).toBe(0);
      expect(ran(root)).toBe(true);
    });

    it('an empty permanent.txt refuses nothing', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      write(root, 'pipeline/branch/permanent.txt', '');
      const result = runPipeline(root, ['branch', 'deploy', 'production']);
      expect(result.status).toBe(0);
      expect(ran(root)).toBe(true);
    });

    it('an empty slot still prints its line for a permanent name', () => {
      const root = repository();
      const result = runPipeline(root, ['branch', 'create', 'production']);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('branch: empty — no pipeline/branch/\n');
      expect(result.stderr).toBe('');
    });

    it('refuses before listing origin', () => {
      const root = repository();
      fillBranchSlot(root, 'printf ran > seen.txt\n');
      git(root, 'remote', 'add', 'origin', join(root, 'no-such-origin'));
      const result = runPipeline(root, ['branch', 'create', 'production']);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('which is permanent');
      expect(result.stderr).not.toContain('could not list branches on origin');
      expect(ran(root)).toBe(false);
    });

    it('environment still prints a permanent name', () => {
      const root = repository();
      const result = runPipeline(root, ['environment', 'production']);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('production\n');
    });

    it('the operator guide names the list and what deploy.sh does with no environment', () => {
      const guide = readFileSync(join(blueprint, 'templates', 'README.md'), 'utf8').replace(/\s+/g, ' ');
      expect(guide).toContain('pipeline/branch/permanent.txt');
      expect(guide).toContain('replaces the default list');
      expect(guide).toContain('must not create one');
      expect(guide).toContain('close and reopen the pull request');
    });
  });

  it('passes secret values to a branch script without forwarding the payload', () => {
    const root = repository();
    fillBranchSlot(root, 'exit 0\n');
    write(root, 'pipeline/branch/deploy.sh', [
      'node -e "',
      'if (process.env.TROPIS_SECRETS) process.exit(7);',
      'if (process.env.MODE === \'see\' && process.env.A !== \'1\') process.exit(8);',
      'if (process.env.MODE === \'keep\' && process.env.A !== \'kept\') process.exit(9);',
      'if (process.env.TROPIS_ENVIRONMENT !== \'feature-try-it\') process.exit(10);',
      'if (process.env.TROPIS_BRANCH !== \'feature/try-it\') process.exit(11);',
      '"',
      '',
    ].join('\n'));
    const seen = runPipeline(root, ['branch', 'deploy', 'feature/try-it'], {
      env: { MODE: 'see', TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(seen.status).toBe(0);
    const kept = runPipeline(root, ['branch', 'deploy', 'feature/try-it'], {
      env: { MODE: 'keep', A: 'kept', TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(kept.status).toBe(0);
  });
});

describe('staging slot', () => {
  it('prints staging=empty with no scripts and staging=filled when both exist', () => {
    const root = repository();
    expect(stagingSlot(root)).toEqual({ slot: 'empty' });
    const empty = runPipeline(root, ['staging', 'slot']);
    expect(empty.status).toBe(0);
    expect(empty.stdout).toBe('staging=empty\n');
    fillStagingSlot(root);
    expect(stagingSlot(root)).toEqual({ slot: 'filled' });
    const filled = runPipeline(root, ['staging', 'slot']);
    expect(filled.status).toBe(0);
    expect(filled.stdout).toBe('staging=filled\n');
  });

  it('exits 1 and names only the missing script when one of the two exists', () => {
    const missingDeploy = repository();
    write(missingDeploy, 'pipeline/staging/reset.sh', 'exit 0\n');
    expect(stagingSlot(missingDeploy).error).toBe('staging: pipeline/staging/ is missing deploy.sh');
    const deploy = runPipeline(missingDeploy, ['staging', 'slot']);
    expect(deploy.status).toBe(1);
    expect(deploy.stderr).toBe('staging: pipeline/staging/ is missing deploy.sh\n');

    const missingReset = repository();
    write(missingReset, 'pipeline/staging/deploy.sh', 'exit 0\n');
    expect(stagingSlot(missingReset).error).toBe('staging: pipeline/staging/ is missing reset.sh');
    const reset = runPipeline(missingReset, ['staging', 'slot']);
    expect(reset.status).toBe(1);
    expect(reset.stderr).toBe('staging: pipeline/staging/ is missing reset.sh\n');
  });

  it('refuses the old pipeline/candidate/ folder, from slot and from deploy, and names the move', () => {
    const root = repository();
    commit(root, 'base');
    write(root, 'pipeline/candidate/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/candidate/deploy.sh', 'printf ran > deploy-ran.txt\n');
    const message = 'staging: pipeline/candidate/ is the old name of pipeline/staging/ — run git mv pipeline/candidate pipeline/staging';
    expect(stagingSlot(root).error).toBe(message);
    const slot = runPipeline(root, ['staging', 'slot']);
    expect(slot.status).toBe(1);
    expect(slot.stdout).toBe('');
    expect(slot.stderr).toBe(`${message}\n`);
    const deploy = runPipeline(root, ['staging', 'deploy']);
    expect(deploy.status).toBe(1);
    expect(deploy.stderr).toBe(`${message}\n`);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'deploy-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    fillStagingSlot(root);
    expect(stagingSlot(root).error).toBe(message);
  });

  it('refuses a staging script that still reads TROPIS_CANDIDATE, from slot and from deploy', () => {
    const root = repository();
    commit(root, 'base');
    write(root, 'pipeline/staging/reset.sh', 'exit 0\n');
    write(root, 'pipeline/staging/deploy.sh', 'printf "%s" "$TROPIS_CANDIDATE" > saw.txt\n');
    const message = 'staging: pipeline/staging/deploy.sh reads TROPIS_CANDIDATE, now TROPIS_STAGING_COMMIT';
    expect(stagingSlot(root).error).toBe(message);
    const slot = runPipeline(root, ['staging', 'slot']);
    expect(slot.status).toBe(1);
    expect(slot.stderr).toBe(`${message}\n`);
    const deploy = runPipeline(root, ['staging', 'deploy']);
    expect(deploy.status).toBe(1);
    expect(deploy.stderr).toBe(`${message}\n`);
    expect(statSync(join(root, 'saw.txt'), { throwIfNoEntry: false })).toBeUndefined();
    write(root, 'pipeline/staging/deploy.sh', 'exit 0\n');
    write(root, 'pipeline/staging/lib/common.sh', 'echo "$TROPIS_CANDIDATE"\n');
    expect(stagingSlot(root).error)
      .toBe('staging: pipeline/staging/lib/common.sh reads TROPIS_CANDIDATE, now TROPIS_STAGING_COMMIT');
  });

  it('exits 2 and names slot and deploy when the subcommand is missing or unknown', () => {
    const root = repository();
    const none = runPipeline(root, ['staging']);
    expect(none.status).toBe(2);
    expect(none.stderr).toContain('slot');
    expect(none.stderr).toContain('deploy');
    const unknown = runPipeline(root, ['staging', 'nope']);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('slot');
    expect(unknown.stderr).toContain('deploy');
  });
});

function summaryFor({ hash, reset, deploy, byHand }) {
  const lines = [
    '### Deploy to staging',
    '',
    `- Commit: \`${hash}\``,
    `- Reset: ${reset}`,
    `- Deploy: ${deploy}`,
  ];
  if (byHand == null) lines.push('- By hand: not known — the deploy did not finish');
  else if (byHand.length === 0) lines.push('- By hand: nothing, as deploy.sh reported');
  else {
    lines.push('- By hand:');
    for (const line of byHand) lines.push(`  - ${line}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Two version tags, then a later commit, so the archive must be the higher tag. */
function versionedRepository() {
  const root = repository();
  write(root, 'version.txt', 'v0.9.0\n');
  commit(root, 'nine');
  git(root, 'tag', 'v0.9.0');
  write(root, 'version.txt', 'v0.10.0\n');
  commit(root, 'ten');
  git(root, 'tag', 'v0.10.0');
  write(root, 'version.txt', 'later\n');
  commit(root, 'later');
  return root;
}

describe('staging deploy', () => {
  it('prints the empty line and records that nothing ran when the slot is empty', () => {
    const root = repository();
    const hash = commit(root, 'base');
    const summary = join(root, 'summary.md');
    writeFileSync(summary, 'prior\n');
    const result = runPipeline(root, ['staging', 'deploy', '--summary', summary]);
    const text = summaryFor({
      hash,
      reset: 'not run — no pipeline/staging/',
      deploy: 'not run — no pipeline/staging/',
      byHand: null,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`staging: empty — no pipeline/staging/, so nothing was deployed to staging\n${text}`);
    expect(readFileSync(summary, 'utf8')).toBe(`prior\n${text}`);
    expect(stagingSummary({
      hash,
      reset: 'not run — no pipeline/staging/',
      deploy: 'not run — no pipeline/staging/',
      byHand: null,
    })).toBe(text);
  });

  it('does not run reset when there is no tag at all like a release, and says no release yet', () => {
    const root = repository();
    const hash = commit(root, 'base');
    git(root, 'tag', 'not-a-release');
    write(root, 'pipeline/staging/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/staging/deploy.sh', 'printf "%s" "$TROPIS_STAGING_COMMIT" > saw-commit.txt\n');
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(0);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(readFileSync(join(root, 'saw-commit.txt'), 'utf8')).toBe(hash);
    expect(result.stdout).toBe(summaryFor({
      hash,
      reset: 'not needed — no release yet',
      deploy: 'deployed',
      byHand: [],
    }));
    expect(result.stderr).toBe('');
  });

  it('resets to the highest release tag, then deploys, and removes the archive afterwards', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    fillStagingSlot(root, 'exit 0\n');
    write(root, 'pipeline/staging/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'printf "%s" "$TROPIS_PRODUCTION_DIR" > saw-dir.txt',
      'printf "%s" "$TROPIS_PRODUCTION_TAG" > saw-tag.txt',
      '',
    ].join('\n'));
    write(root, 'pipeline/staging/deploy.sh', [
      'printf "%s" "$TROPIS_STAGING_COMMIT" > saw-commit.txt',
      'if [ -n "${TROPIS_PRODUCTION_TAG+x}" ]; then printf set > saw-deploy-tag.txt; fi',
      'if [ -n "${TROPIS_PRODUCTION_DIR+x}" ]; then printf set > saw-deploy-dir.txt; fi',
      '',
    ].join('\n'));
    const summary = join(root, 'summary.md');
    writeFileSync(summary, 'prior\n');
    const result = runPipeline(root, ['staging', 'deploy', '--summary', summary]);
    const text = summaryFor({
      hash,
      reset: 'to `v0.10.0`',
      deploy: 'deployed',
      byHand: [],
    });
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'saw-tag.txt'), 'utf8')).toBe('v0.10.0');
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v0.10.0\n');
    expect(readFileSync(join(root, 'saw-commit.txt'), 'utf8')).toBe(hash);
    const dir = readFileSync(join(root, 'saw-dir.txt'), 'utf8');
    expect(statSync(dir, { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'saw-deploy-tag.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'saw-deploy-dir.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(readFileSync(summary, 'utf8')).toBe(`prior\n${text}`);
    expect(result.stdout).toBe(text);
    expect(result.stderr).toBe('');
  });

  it('hands reset.sh a tag whose archive is larger than a spawn buffer, and only its files', () => {
    const root = repository();
    write(root, 'version.txt', 'v1.0.0\n');
    // Random bytes do not compress, so the archive stays several MiB.
    writeFileSync(join(root, 'large.bin'), randomBytes(4 * 1024 * 1024));
    commit(root, 'one');
    git(root, 'tag', 'v1.0.0');
    write(root, 'version.txt', 'later\n');
    commit(root, 'later');
    write(root, 'pipeline/staging/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'wc -c < "$TROPIS_PRODUCTION_DIR/large.bin" | tr -d " " > saw-size.txt',
      'ls -A "$TROPIS_PRODUCTION_DIR" > saw-files.txt',
      '',
    ].join('\n'));
    write(root, 'pipeline/staging/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.stderr).not.toContain('could not read the production tag');
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v1.0.0\n');
    expect(readFileSync(join(root, 'saw-size.txt'), 'utf8')).toBe(`${4 * 1024 * 1024}\n`);
    expect(readFileSync(join(root, 'saw-files.txt'), 'utf8')).toBe('large.bin\nversion.txt\n');
  });

  it('resets to the highest vX.Y.Z tag, not to a pre-release tag above it', () => {
    const root = repository();
    write(root, 'version.txt', 'v1.0.0-rc.1\n');
    commit(root, 'rc');
    git(root, 'tag', 'v1.0.0-rc.1');
    write(root, 'version.txt', 'v1.0.0\n');
    commit(root, 'one');
    git(root, 'tag', 'v1.0.0');
    write(root, 'version.txt', 'v1.1.0-rc.1\n');
    commit(root, 'next-rc');
    git(root, 'tag', 'v1.1.0-rc.1');
    write(root, 'version.txt', 'later\n');
    const hash = commit(root, 'later');
    write(root, 'pipeline/staging/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'printf "%s" "$TROPIS_PRODUCTION_TAG" > saw-tag.txt',
      '',
    ].join('\n'));
    write(root, 'pipeline/staging/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'saw-tag.txt'), 'utf8')).toBe('v1.0.0');
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v1.0.0\n');
    expect(result.stdout).toBe(summaryFor({
      hash,
      reset: 'to `v1.0.0`',
      deploy: 'deployed',
      byHand: [],
    }));
  });

  it('does not run reset when no tag is of the form vX.Y.Z, and says no release yet', () => {
    const root = repository();
    const hash = commit(root, 'base');
    git(root, 'tag', 'v1.0.0-rc.1');
    git(root, 'tag', 'v2');
    git(root, 'tag', 'release-1.0.0');
    write(root, 'pipeline/staging/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/staging/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(0);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(result.stdout).toBe(summaryFor({
      hash,
      reset: 'not needed — no release yet',
      deploy: 'deployed',
      byHand: [],
    }));
  });

  it('removes the archive and skips deploy when reset.sh fails', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    write(root, 'pipeline/staging/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'printf "%s" "$TROPIS_PRODUCTION_DIR" > saw-dir.txt',
      'exit 3',
      '',
    ].join('\n'));
    write(root, 'pipeline/staging/deploy.sh', 'printf ran > deploy-ran.txt\n');
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(3);
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v0.10.0\n');
    const dir = readFileSync(join(root, 'saw-dir.txt'), 'utf8');
    expect(statSync(dir, { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'deploy-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(result.stdout).toBe(summaryFor({
      hash,
      reset: 'failed — reset.sh exited 3',
      deploy: 'not run — reset.sh failed',
      byHand: null,
    }));
  });

  it('lists by-hand lines in the order deploy.sh wrote them', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    write(root, 'pipeline/staging/reset.sh', 'exit 0\n');
    write(root, 'pipeline/staging/deploy.sh', [
      'printf "%s\\n" "Approve the new permissions" >> "$TROPIS_BY_HAND"',
      'printf "%s\\n" "Restart the worker" >> "$TROPIS_BY_HAND"',
      '',
    ].join('\n'));
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(summaryFor({
      hash,
      reset: 'to `v0.10.0`',
      deploy: 'deployed',
      byHand: ['Approve the new permissions', 'Restart the worker'],
    }));
  });

  it('does not report by-hand lines when deploy.sh fails', () => {
    const root = repository();
    const hash = commit(root, 'base');
    write(root, 'pipeline/staging/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/staging/deploy.sh', [
      'printf "%s\\n" "Approve the new permissions" >> "$TROPIS_BY_HAND"',
      'exit 4',
      '',
    ].join('\n'));
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(4);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(result.stdout).toBe(summaryFor({
      hash,
      reset: 'not needed — no release yet',
      deploy: 'failed — deploy.sh exited 4',
      byHand: null,
    }));
  });

  it('passes secret values to reset and deploy without forwarding the payload', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    write(root, 'pipeline/staging/reset.sh', 'printf \'%s\\n\' reset >> seen.txt\nif [ -n "${TROPIS_SECRETS+x}" ]; then printf \'%s\\n\' secrets-set >> seen.txt; else printf \'%s\\n\' secrets-unset >> seen.txt; fi\nprintf \'A=%s\\n\' "$A" >> seen.txt\nprintf \'commit=%s\\n\' "$TROPIS_STAGING_COMMIT" >> seen.txt\nprintf \'tag=%s\\n\' "$TROPIS_PRODUCTION_TAG" >> seen.txt\n');
    write(root, 'pipeline/staging/deploy.sh', `printf '%s\\n' deploy >> seen.txt\nif [ -n "\${TROPIS_SECRETS+x}" ]; then printf '%s\\n' secrets-set >> seen.txt; else printf '%s\\n' secrets-unset >> seen.txt; fi\nprintf 'A=%s\\n' "$A" >> seen.txt\nprintf 'commit=%s\\n' "$TROPIS_STAGING_COMMIT" >> seen.txt\n`);
    const seen = runPipeline(root, ['staging', 'deploy'], {
      env: { TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(seen.status).toBe(0);
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe(
      `reset\nsecrets-unset\nA=1\ncommit=${hash}\ntag=v0.10.0\ndeploy\nsecrets-unset\nA=1\ncommit=${hash}\n`,
    );
    const kept = runPipeline(root, ['staging', 'deploy'], {
      env: { A: 'kept', TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(kept.status).toBe(0);
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe(
      `reset\nsecrets-unset\nA=1\ncommit=${hash}\ntag=v0.10.0\n`
      + `deploy\nsecrets-unset\nA=1\ncommit=${hash}\n`
      + `reset\nsecrets-unset\nA=kept\ncommit=${hash}\ntag=v0.10.0\n`
      + `deploy\nsecrets-unset\nA=kept\ncommit=${hash}\n`,
    );
  });

  it('exits 1 and names the missing script when the slot has only one', () => {
    const root = repository();
    commit(root, 'base');
    write(root, 'pipeline/staging/reset.sh', 'printf ran > reset-ran.txt\n');
    const result = runPipeline(root, ['staging', 'deploy']);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('staging: pipeline/staging/ is missing deploy.sh\n');
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
  });

  it('lists the deploy to staging in the host command list', () => {
    const root = repository();
    const result = runPipeline(root, ['commands']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain([
      '# Deploy to staging. Started by hand for one commit on the main branch, never on a push.',
      '# Every stage first, as on a push with nothing skipped; then:',
      'node .tropis/scripts/pipeline.mjs staging deploy',
      '',
    ].join('\n'));
  });
});

/**
 * A main branch: a base, the staged commit, and the promotion commit that changes
 * only the notes and the version file. A side branch holds a commit main does not.
 */
function promotedRepository() {
  const root = repository();
  write(root, 'RELEASES.md', '## [Unreleased]\n\n- A change.\n');
  write(root, 'package.json', '{ "version": "1.0.0" }\n');
  write(root, 'src/app.js', 'one\n');
  const base = commit(root, 'base');
  write(root, 'src/app.js', 'two\n');
  const staged = commit(root, 'the staged commit');
  write(root, 'RELEASES.md', '## [Unreleased]\n\n## [1.1.0] — 2026-11-01\n\n- A change.\n');
  write(root, 'package.json', '{ "version": "1.1.0" }\n');
  const promotion = commit(root, 'chore(release): 1.1.0');
  git(root, 'checkout', '-q', '-b', 'side', base);
  write(root, 'side.txt', 'side\n');
  const side = commit(root, 'side work');
  git(root, 'checkout', '-q', 'main');
  return { root, base, staged, promotion, side };
}

const ALLOW = ['--allow', 'RELEASES.md', '--allow', 'package.json'];

describe('promote check', () => {
  it('passes a commit main holds whose change since staging is only the allowed files', () => {
    const { root, staged, promotion } = promotedRepository();
    fillStagingSlot(root);
    const result = runPipeline(root, ['promote', 'check', promotion, '--staged', staged, ...ALLOW]);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`promote: ${promotion} may be tagged\n`);
  });

  it('passes a commit main holds with no --staged when the staging slot is empty', () => {
    const { root, promotion } = promotedRepository();
    const result = runPipeline(root, ['promote', 'check', promotion]);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`promote: ${promotion} may be tagged\n`);
  });

  it('refuses a commit or a staged commit that is not a full hash', () => {
    const { root, staged, promotion } = promotedRepository();
    const short = runPipeline(root, ['promote', 'check', promotion.slice(0, 7)]);
    expect(short.status).toBe(1);
    expect(short.stderr).toBe(`promote: "${promotion.slice(0, 7)}" is not a full commit hash\n`);
    expect(short.stdout).toBe('');
    const upper = runPipeline(root, ['promote', 'check', promotion.toUpperCase()]);
    expect(upper.status).toBe(1);
    expect(upper.stderr).toBe(`promote: "${promotion.toUpperCase()}" is not a full commit hash\n`);
    const stagedShort = runPipeline(root, ['promote', 'check', promotion, '--staged', 'HEAD~1']);
    expect(stagedShort.status).toBe(1);
    expect(stagedShort.stderr).toBe('promote: "HEAD~1" is not a full commit hash\n');
    expect(staged).not.toBe(promotion);
  });

  it('refuses a full hash that names no commit here', () => {
    const { root, promotion } = promotedRepository();
    const missing = 'a'.repeat(40);
    const result = runPipeline(root, ['promote', 'check', missing]);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(`promote: ${missing} is not a commit here\n`);
    const tree = git(root, 'rev-parse', 'HEAD^{tree}');
    const notCommit = runPipeline(root, ['promote', 'check', tree]);
    expect(notCommit.status).toBe(1);
    expect(notCommit.stderr).toBe(`promote: ${tree} is not a commit here\n`);
    const stagedMissing = runPipeline(root, ['promote', 'check', promotion, '--staged', missing]);
    expect(stagedMissing.status).toBe(1);
    expect(stagedMissing.stderr).toBe(`promote: ${missing} is not a commit here\n`);
  });

  it('refuses a commit the main branch does not hold', () => {
    const { root, side } = promotedRepository();
    const result = runPipeline(root, ['promote', 'check', side]);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(`promote: ${side} is not on the main branch — tag only a commit main holds\n`);
    expect(result.stdout).toBe('');
  });

  it('refuses to go without --staged when the project deploys to staging', () => {
    const { root, promotion } = promotedRepository();
    fillStagingSlot(root);
    const result = runPipeline(root, ['promote', 'check', promotion, ...ALLOW]);
    expect(result.status).toBe(1);
    expect(result.stderr)
      .toBe('promote: this project deploys to staging — give --staged <the commit staging was checked on>\n');
  });

  it('refuses a commit that does not contain the staged commit', () => {
    const { root, base, side } = promotedRepository();
    git(root, 'merge', '-q', '--no-ff', '-m', 'merge side', side);
    const result = runPipeline(root, ['promote', 'check', base, '--staged', side, ...ALLOW]);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(`promote: ${base} does not contain the staged commit ${side}\n`);
  });

  it('refuses every path changed since staging that is not allowed, and names them all', () => {
    const { root, base, staged, promotion } = promotedRepository();
    const onlyNotes = runPipeline(root, ['promote', 'check', promotion, '--staged', staged, '--allow', 'RELEASES.md']);
    expect(onlyNotes.status).toBe(1);
    expect(onlyNotes.stderr)
      .toBe(`promote: package.json changed since staging was checked — deploy ${promotion} to staging first\n`);
    const fromBase = runPipeline(root, ['promote', 'check', promotion, '--staged', base]);
    expect(fromBase.status).toBe(1);
    expect(fromBase.stderr).toBe(
      `promote: RELEASES.md, package.json, src/app.js changed since staging was checked — deploy ${promotion} to staging first\n`,
    );
    write(root, 'src/app.js', 'three\n');
    const later = commit(root, 'feat: merged after staging');
    const result = runPipeline(root, ['promote', 'check', later, '--staged', staged, ...ALLOW]);
    expect(result.status).toBe(1);
    expect(result.stderr)
      .toBe(`promote: src/app.js changed since staging was checked — deploy ${later} to staging first\n`);
  });

  it('exits 2 with the usage line on a missing or unknown argument', () => {
    const { root, promotion } = promotedRepository();
    const usage = 'promote: use check <commit> [--staged <commit>] [--allow <path>]...\n';
    for (const args of [
      ['promote'],
      ['promote', 'nope'],
      ['promote', 'check'],
      ['promote', 'check', promotion, '--staged'],
      ['promote', 'check', promotion, '--allow'],
      ['promote', 'check', promotion, '--other', 'x'],
      ['promote', 'check', promotion, promotion],
    ]) {
      const result = runPipeline(root, args);
      expect(result.status).toBe(2);
      expect(result.stderr).toBe(usage);
    }
  });

  it('is in the host command list, as what the promote pipeline runs before it tags', () => {
    const root = repository();
    const result = runPipeline(root, ['commands']);
    expect(result.stdout.endsWith([
      '# Promote to production: the project\'s own pipeline runs this before it tags <commit>.',
      'node .tropis/scripts/pipeline.mjs promote check "$COMMIT" --staged "$STAGED" --allow <notes file> --allow <each version file>',
      '',
    ].join('\n'))).toBe(true);
  });
});

describe('deploy gate', () => {
  const cases = [
    {
      label: 'every stage passed on a push',
      plan: planOf(),
      results: resultsOf(),
      event: 'push',
      expected: 'run',
    },
    {
      label: 'the same results on a pull request do not deploy',
      plan: planOf(),
      results: resultsOf(),
      event: 'pull_request',
      expected: 'skipped',
    },
    {
      label: 'framework failed and the four stage jobs were skipped',
      plan: planOf(),
      results: resultsOf({
        framework: 'failure',
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'push',
      expected: 'held',
    },
    {
      label: 'a stage planned run finished skipped',
      plan: planOf({ sanity: 'empty', integration: 'empty', 'end-to-end': 'empty' }),
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'push',
      expected: 'held',
    },
    {
      label: 'a stage failed',
      plan: planOf(),
      results: resultsOf({ unit: 'failure' }),
      event: 'push',
      expected: 'held',
    },
    {
      label: 'a stage was cancelled',
      plan: planOf(),
      results: resultsOf({ integration: 'cancelled' }),
      event: 'push',
      expected: 'held',
    },
    {
      label: 'a failure is held even on a pull request',
      plan: planOf(),
      results: resultsOf({ unit: 'failure' }),
      event: 'pull_request',
      expected: 'held',
    },
    {
      label: 'a failure is held even when that stage was planned empty',
      plan: planOf({ unit: 'empty' }),
      results: resultsOf({ unit: 'failure' }),
      event: 'push',
      expected: 'held',
    },
    {
      label: 'deploy planned empty, earlier stages passed, on a push',
      plan: planOf({
        sanity: 'empty',
        unit: 'empty',
        integration: 'empty',
        'end-to-end': 'empty',
        deploy: 'empty',
      }),
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'push',
      expected: 'empty',
    },
    {
      label: 'a prose-only change on a push skips deploy',
      plan: planOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
        deploy: 'skipped',
      }),
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'push',
      expected: 'skipped',
    },
    {
      label: 'empty stages beside one that ran still deploy on a push',
      plan: planOf({ sanity: 'empty', integration: 'empty', 'end-to-end': 'empty' }),
      results: resultsOf({
        sanity: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'push',
      expected: 'run',
    },
    {
      label: 'a pull request does not deploy even when deploy was planned empty',
      plan: planOf({
        sanity: 'empty',
        unit: 'empty',
        integration: 'empty',
        'end-to-end': 'empty',
        deploy: 'empty',
      }),
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'pull_request',
      expected: 'skipped',
    },
    {
      label: 'a green pull request with a filled slot runs',
      plan: planOf(),
      results: resultsOf(),
      event: 'pull_request',
      branch: 'filled',
      expected: 'run',
    },
    {
      label: 'a green pull request with a filled slot, where the change was prose only, does not deploy',
      plan: planOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
        deploy: 'skipped',
      }),
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'pull_request',
      branch: 'filled',
      expected: 'skipped',
    },
    {
      label: 'a failed stage holds even when the slot is filled',
      plan: planOf(),
      results: resultsOf({ unit: 'failure' }),
      event: 'pull_request',
      branch: 'filled',
      expected: 'held',
    },
    {
      label: 'a push ignores the slot',
      plan: planOf({
        sanity: 'empty',
        unit: 'empty',
        integration: 'empty',
        'end-to-end': 'empty',
        deploy: 'empty',
      }),
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      event: 'push',
      branch: 'filled',
      expected: 'empty',
    },
  ];

  it.each(cases)('$label', ({ plan, results, event, branch, expected, label }) => {
    pin(gateDecision({ plan, results, event, branch }), expected, label);
  });
});

describe('deploy gate with a passed commit', () => {
  const PASSED = 'b'.repeat(40);
  const skippedStages = { sanity: 'skipped', unit: 'skipped', integration: 'skipped', 'end-to-end': 'skipped' };
  const plan = { ...planOf(skippedStages), passed: PASSED };
  const results = resultsOf(skippedStages);

  it('does not redeploy the branch environment on a pull request, even with the slot filled', () => {
    expect(gateDecision({ plan, results, event: 'pull_request', branch: 'filled' })).toBe('skipped');
  });

  it('still deploys on the push to main', () => {
    expect(gateDecision({ plan, results, event: 'push' })).toBe('run');
  });

  it('holds on both events when a stage that was planned to run did not pass', () => {
    const bad = resultsOf({ ...skippedStages, framework: 'failure' });
    expect(gateDecision({ plan, results: bad, event: 'push' })).toBe('held');
    expect(gateDecision({ plan, results: bad, event: 'pull_request', branch: 'filled' })).toBe('held');
  });
});

describe('prose patterns', () => {
  const prose = [
    '# comment',
    '',
    'docs/',
    '!docs/kept.md',
    '*.md',
    'src/*.js',
    'notes/**/*.md',
  ].join('\n');

  it('matches a directory, a single segment, and across segments', () => {
    expect(matchesProse('docs/a.md', prose)).toBe(true);
    expect(matchesProse('docs/sub/a.md', prose)).toBe(true);
    expect(matchesProse('docs-extra/a.md', prose)).toBe(false);
    expect(matchesProse('README.md', prose)).toBe(true);
    expect(matchesProse('docs/README.md', '*.md')).toBe(false);
    expect(matchesProse('src/a.js', prose)).toBe(true);
    expect(matchesProse('src/lib/a.js', prose)).toBe(false);
    expect(matchesProse('notes/a.md', prose)).toBe(true);
    expect(matchesProse('notes/sub/a.md', prose)).toBe(true);
  });

  it('lets the last matching line win, including a re-include', () => {
    expect(matchesProse('docs/kept.md', prose)).toBe(false);
    expect(matchesProse('docs/kept.md', '!docs/kept.md\ndocs/\n')).toBe(true);
    expect(matchesProse('docs/a.md', null)).toBe(false);
  });

  it('treats a change as prose and framework only when every path is one or the other', () => {
    expect(isProseAndFramework(['docs/a.md', '.claude/x.md'], 'docs/\n')).toBe(true);
    expect(isProseAndFramework(['docs/a.md', 'src/a.js'], 'docs/\n')).toBe(false);
    expect(isProseAndFramework([], 'docs/\n')).toBe(false);
  });
});

describe('plan from a git repository', () => {
  const ZEROS = '0000000000000000000000000000000000000000';

  function expectPlan(root, args, expected, stderrIncludes) {
    const result = runPipeline(root, ['plan', ...args]);
    expect(result.status).toBe(0);
    const { stages, lines } = parsePlan(result.stdout);
    expect(lines.filter((line) => !line.startsWith('branch='))).toHaveLength(STAGES.length);
    expect(stages.branch).toBe('empty');
    delete stages.branch;
    expect(stages).toEqual(expected);
    if (stderrIncludes === undefined) expect(result.stderr).toBe('');
    else expect(result.stderr.trim()).toBe(stderrIncludes);
  }

  function skipped() {
    const stages = { framework: 'run' };
    for (const stage of STAGES) if (stage !== 'framework') stages[stage] = 'skipped';
    return stages;
  }

  function full(present = []) {
    const stages = { framework: 'run' };
    for (const stage of STAGES) {
      if (stage === 'framework') continue;
      stages[stage] = present.includes(stage) ? 'run' : 'empty';
    }
    return stages;
  }

  it('prints the six stage names', () => {
    const root = repository();
    const result = runPipeline(root, ['stages']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${STAGES.join('\n')}\n`);
  });

  it('skips every stage but framework when only prose and framework files changed', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    const base = commit(root, 'base');
    write(root, 'docs/a.md', 'a\n');
    write(root, '.claude/x.md', 'x\n');
    commit(root, 'docs and framework');
    expectPlan(root, ['--base', base], skipped());
  });

  it('runs or leaves empty each stage that has a script when code changed too', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    write(root, 'pipeline/unit.sh', 'exit 0\n');
    write(root, 'pipeline/deploy.sh', 'exit 0\n');
    const base = commit(root, 'base');
    write(root, 'docs/a.md', 'a\n');
    write(root, 'src/a.js', 'a\n');
    commit(root, 'code');
    expectPlan(root, ['--base', base], full(['unit', 'deploy']));
  });

  it('lists both sides of a move, so a file moved into prose is not prose only', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    write(root, 'src/a.js', 'same\n');
    const base = commit(root, 'base');
    mkdirSync(join(root, 'docs'));
    git(root, 'mv', 'src/a.js', 'docs/a.md');
    commit(root, 'move');
    // The fixture is a rename. Without --no-renames only the prose path remains.
    const renamed = git(root, 'diff', '--name-only', `${base}...HEAD`);
    const both = git(root, 'diff', '--name-only', '--no-renames', `${base}...HEAD`);
    expect(renamed.split('\n').filter(Boolean)).toEqual(['docs/a.md']);
    expect(both.split('\n').filter(Boolean).sort()).toEqual(['docs/a.md', 'src/a.js']);
    expectPlan(root, ['--base', base], full());
  });

  it('runs everything when a prose directory re-includes a guarded document', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', '# guarded\n\ndocs/\n!docs/kept.md\n');
    const base = commit(root, 'base');
    write(root, 'docs/kept.md', 'kept\n');
    commit(root, 'guarded');
    expectPlan(root, ['--base', base], full());
    git(root, 'checkout', '-q', '-b', 'other', base);
    write(root, 'docs/other.md', 'other\n');
    const head = commit(root, 'other');
    expectPlan(root, ['--base', base, '--head', head], skipped());
  });

  it('does not treat docs as prose when prose.txt is missing', () => {
    const root = repository();
    const base = commit(root, 'base');
    write(root, 'docs/a.md', 'a\n');
    commit(root, 'docs');
    expectPlan(root, ['--base', base], full());
  });

  it('matches * inside one segment and ** across segments', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'src/*.js\nnotes/**/*.md\n');
    const base = commit(root, 'base');
    write(root, 'src/a.js', 'a\n');
    const star = commit(root, 'star');
    expectPlan(root, ['--base', base, '--head', star], skipped());
    git(root, 'checkout', '-q', '-b', 'nested', base);
    write(root, 'src/lib/a.js', 'a\n');
    const nested = commit(root, 'nested');
    expectPlan(root, ['--base', base, '--head', nested], full());
    git(root, 'checkout', '-q', '-b', 'deep', base);
    write(root, 'notes/sub/a.md', 'a\n');
    const deep = commit(root, 'deep');
    expectPlan(root, ['--base', base, '--head', deep], skipped());
  });

  it('lets a later docs/ line win over an earlier re-include', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', '!docs/kept.md\ndocs/\n');
    const base = commit(root, 'base');
    write(root, 'docs/kept.md', 'kept\n');
    commit(root, 'kept');
    expectPlan(root, ['--base', base], skipped());
  });

  it('counts the two framework paths that are not in the export-ignore loop', () => {
    const root = repository();
    const base = commit(root, 'base');
    write(root, 'docs/model-picks.md', 'picks\n');
    write(root, 'pipeline/framework.sh', 'exit 0\n');
    commit(root, 'framework');
    expectPlan(root, ['--base', base], skipped());
  });

  it('does a full run when no base is given, and says why', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    commit(root, 'base');
    write(root, 'docs/a.md', 'a\n');
    commit(root, 'docs');
    expectPlan(root, [], full(), 'plan: no base was given, so this is a full run');
  });

  it('does a full run when the base is all zeros, and says why', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    commit(root, 'base');
    write(root, 'docs/a.md', 'a\n');
    commit(root, 'docs');
    expectPlan(root, ['--base', ZEROS], full(), 'plan: the base is all zeros, so this is a full run');
  });

  it('does a full run when the base does not resolve, and says why', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    commit(root, 'base');
    write(root, 'docs/a.md', 'a\n');
    commit(root, 'docs');
    expectPlan(
      root,
      ['--base', 'not-a-revision'],
      full(),
      'plan: the base does not resolve, so this is a full run',
    );
  });

  it('on --closed, skips every stage and says whether the slot is empty or filled', () => {
    const emptyRoot = repository();
    const empty = runPipeline(emptyRoot, ['plan', '--closed']);
    expect(empty.status).toBe(0);
    const skipped = [...STAGES.map((stage) => `${stage}=skipped`), 'branch=empty'].join('\n');
    expect(empty.stdout).toBe(`${skipped}\n`);
    const filledRoot = repository();
    fillBranchSlot(filledRoot);
    const filled = runPipeline(filledRoot, ['plan', '--closed']);
    expect(filled.status).toBe(0);
    expect(filled.stdout).toBe(`${skipped.replace('branch=empty', 'branch=filled')}\n`);
  });

  it('on --closed, exits 1 and names the missing script when the slot is partial', () => {
    const root = repository();
    write(root, 'pipeline/branch/create.sh', 'exit 0\n');
    write(root, 'pipeline/branch/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['plan', '--closed']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('remove.sh');
    expect(result.stderr).not.toContain('create.sh');
    expect(result.stderr).not.toContain('deploy.sh');
  });

  it('exits 2 when --closed is given --base', () => {
    const root = repository();
    const result = runPipeline(root, ['plan', '--closed', '--base', 'x']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--closed takes no other arguments');
  });

  it('does a full run when the diff lists no paths, and says why', () => {
    const root = repository();
    write(root, 'pipeline/prose.txt', 'docs/\n');
    const base = commit(root, 'base');
    expectPlan(
      root,
      ['--base', base, '--head', base],
      full(),
      'plan: the diff lists no paths, so this is a full run',
    );
  });

  describe('with --passed', () => {
    const NONE = 'a'.repeat(40);

    /** Base, then a code commit that "passed" on the branch. */
    function passedProject() {
      const root = repository();
      write(root, 'pipeline/prose.txt', 'docs/\n');
      write(root, 'pipeline/unit.sh', 'exit 0\n');
      write(root, 'pipeline/deploy.sh', 'exit 0\n');
      write(root, 'src/keep.js', 'keep\n');
      const base = commit(root, 'base');
      write(root, 'src/a.js', 'a\n');
      const passed = commit(root, 'code, which passed');
      return { root, base, passed };
    }

    function planWith(root, args) {
      const result = runPipeline(root, ['plan', ...args]);
      expect(result.status).toBe(0);
      const lines = result.stdout.split('\n').filter((line) => line !== '');
      return { lines, stages: parsePlan(result.stdout).stages, stderr: result.stderr.trim() };
    }

    const SKIPS = {
      framework: 'run', sanity: 'skipped', unit: 'skipped', integration: 'skipped', 'end-to-end': 'skipped', deploy: 'run',
    };
    const TODAY = {
      framework: 'run', sanity: 'empty', unit: 'run', integration: 'empty', 'end-to-end': 'empty', deploy: 'run',
    };
    const stagesOnly = (stages) => Object.fromEntries(STAGES.map((stage) => [stage, stages[stage]]));

    it('skips the four stages and still deploys when only prose followed the passed commit', () => {
      const { root, base, passed } = passedProject();
      write(root, 'docs/a.md', 'a\n');
      commit(root, 'prose');
      const out = planWith(root, ['--base', base, '--passed', passed]);
      expect(stagesOnly(out.stages)).toEqual(SKIPS);
      expect(out.lines).toEqual([...STAGES.map((stage) => `${stage}=${SKIPS[stage]}`), `passed=${passed}`, 'branch=empty']);
      expect(out.stderr).toBe(`plan: the code passed at ${passed.slice(0, 7)}, so the stages are skipped`);
    });

    it('skips them when the tree is identical to the passed one, as on the push to main', () => {
      const { root, base, passed } = passedProject();
      const merged = git(root, 'commit-tree', `${passed}^{tree}`, '-p', base, '-m', 'squash');
      const out = planWith(root, ['--base', base, '--head', merged, '--passed', passed]);
      expect(stagesOnly(out.stages)).toEqual(SKIPS);
      expect(out.stages.passed).toBe(passed);
    });

    it('plans from the whole diff when code changed after the passed commit', () => {
      const { root, base, passed } = passedProject();
      write(root, 'src/b.js', 'b\n');
      commit(root, 'more code');
      const out = planWith(root, ['--base', base, '--passed', passed]);
      expect(stagesOnly(out.stages)).toEqual(TODAY);
      expect(out.lines.some((line) => line.startsWith('passed='))).toBe(false);
      expect(out.stderr).toBe(`plan: code changed since ${passed.slice(0, 7)} passed, so this is planned from the whole diff`);
    });

    it('plans from the whole diff when the passed commit does not resolve', () => {
      const { root, base } = passedProject();
      const out = planWith(root, ['--base', base, '--passed', NONE]);
      expect(stagesOnly(out.stages)).toEqual(TODAY);
      expect(out.lines.some((line) => line.startsWith('passed='))).toBe(false);
      expect(out.stderr).toBe(`plan: ${NONE} does not resolve, so this is planned from the whole diff`);
    });

    it('plans as before without --passed (the existing test "runs or leaves empty each stage that has a script" covers the same diff shape)', () => {
      const { root, base } = passedProject();
      const out = planWith(root, ['--base', base]);
      expect(stagesOnly(out.stages)).toEqual(TODAY);
      expect(out.lines).toHaveLength(STAGES.length + 1);
      expect(out.stderr).toBe('');
    });

    it('leaves a prose-only diff skipped, deploy included, and prints no passed line', () => {
      const { root, passed } = passedProject();
      write(root, 'docs/a.md', 'a\n');
      commit(root, 'prose');
      const out = planWith(root, ['--base', passed, '--passed', passed]);
      expect(stagesOnly(out.stages)).toEqual({
        framework: 'run', sanity: 'skipped', unit: 'skipped', integration: 'skipped', 'end-to-end': 'skipped', deploy: 'skipped',
      });
      expect(out.lines.some((line) => line.startsWith('passed='))).toBe(false);
    });

    it('compares trees, so a change the passed commit had and the head dropped counts as code', () => {
      const root = repository();
      write(root, 'pipeline/prose.txt', 'docs/\n');
      write(root, 'pipeline/unit.sh', 'exit 0\n');
      write(root, 'pipeline/deploy.sh', 'exit 0\n');
      write(root, 'README.txt', 'x\n');
      const base = commit(root, 'base');
      write(root, 'src/b.js', 'b\n');
      const shared = commit(root, 'shared code');
      write(root, 'src/a.js', 'a\n');
      const passed = commit(root, 'passed has a.js');
      git(root, 'checkout', '-q', '-b', 'other', shared);
      write(root, 'docs/a.md', 'a\n');
      commit(root, 'head only adds prose');
      // From the merge base the head differs from `passed` in prose only; tree to tree it lacks src/a.js.
      expect(git(root, 'diff', '--name-only', `${passed}...HEAD`)).toBe('docs/a.md');
      const out = planWith(root, ['--base', base, '--passed', passed]);
      expect(stagesOnly(out.stages)).toEqual(TODAY);
      expect(out.lines.some((line) => line.startsWith('passed='))).toBe(false);
      expect(out.stderr).toContain('code changed since');
    });

    it('refuses --passed with --closed', () => {
      const root = repository();
      const result = runPipeline(root, ['plan', '--closed', '--passed', 'x']);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('--closed takes no other arguments');
    });
  });
});

describe('run, gate and commands', () => {
  it('prints the empty line and exits 0 when the stage script is absent', () => {
    const root = repository();
    const result = runPipeline(root, ['run', 'unit']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('unit: empty — no pipeline/unit.sh\n');
  });

  it('exits with the stage script status', () => {
    const root = repository();
    write(root, 'pipeline/unit.sh', 'exit 3\n');
    const result = runPipeline(root, ['run', 'unit']);
    expect(result.status).toBe(3);
  });

  it('runs a stage script that is not executable', () => {
    const root = repository();
    const script = join(root, 'pipeline', 'unit.sh');
    write(root, 'pipeline/unit.sh', 'exit 0\n');
    chmodSync(script, 0o644);
    expect(statSync(script).mode & 0o111).toBe(0);
    const result = runPipeline(root, ['run', 'unit']);
    expect(result.status).toBe(0);
  });

  it('runs the project framework script after the framework tests', () => {
    const root = repository();
    write(root, '.tropis/package.json', '{"scripts":{"test":"true"}}\n');
    write(root, 'pipeline/framework.sh', 'exit 4\n');
    const result = runPipeline(root, ['run', 'framework']);
    expect(result.status).toBe(4);
  });

  it('stops the framework stage when its tests fail', () => {
    const root = repository();
    write(root, '.tropis/package.json', '{"scripts":{"test":"false"}}\n');
    write(root, 'pipeline/framework.sh', 'touch framework-ran\nexit 0\n');
    const result = runPipeline(root, ['run', 'framework']);
    expect(result.status).toBe(1);
    expect(statSync(join(root, 'framework-ran'), { throwIfNoEntry: false })).toBeUndefined();
  });

  it('passes secret values to the stage without overriding or forwarding the payload', () => {
    const root = repository();
    write(root, 'pipeline/unit.sh', [
      'node -e "',
      'if (process.env.TROPIS_SECRETS) process.exit(7);',
      'if (process.env.MODE === \'see\' && process.env.A !== \'1\') process.exit(8);',
      'if (process.env.MODE === \'keep\' && process.env.A !== \'kept\') process.exit(9);',
      '"',
      '',
    ].join('\n'));
    const seen = runPipeline(root, ['run', 'unit'], {
      env: { MODE: 'see', TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(seen.status).toBe(0);
    const kept = runPipeline(root, ['run', 'unit'], {
      env: { MODE: 'keep', A: 'kept', TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(kept.status).toBe(0);
  });

  it('rejects an unknown stage and names the six', () => {
    const root = repository();
    const result = runPipeline(root, ['run', 'nope']);
    expect(result.status).toBe(2);
    for (const stage of STAGES) expect(result.stderr).toContain(stage);
  });

  function gate(root, { plan, event, results, summary, prior, branch, input }) {
    if (prior !== undefined) writeFileSync(summary, prior);
    return runPipeline(root, [
      'gate', '--plan', '-', '--event', event,
      ...(branch ? ['--branch', branch] : []),
      ...(summary ? ['--summary', summary] : []),
      ...STAGES.slice(0, -1).map((stage) => `${stage}=${results[stage]}`),
    ], { input: input ?? `${STAGES.map((stage) => `${stage}=${plan[stage]}`).join('\n')}\n` });
  }

  it('words a skip because the same code passed, and does not deploy a pull request', () => {
    const root = repository();
    const summary = join(root, 'summary.md');
    const passed = 'c'.repeat(40);
    const input = `${STAGES.map((stage) => `${stage}=${['sanity', 'unit', 'integration', 'end-to-end'].includes(stage) ? 'skipped' : 'run'}`).join('\n')}\npassed=${passed}\n`;
    const results = resultsOf({ sanity: 'skipped', unit: 'skipped', integration: 'skipped', 'end-to-end': 'skipped' });
    const pr = gate(root, { plan: planOf(), event: 'pull_request', results, summary, branch: 'filled', input });
    expect(pr.status).toBe(0);
    expect(pr.stdout).toBe('deploy=skipped\n');
    const text = readFileSync(summary, 'utf8');
    expect(text).toContain('| unit | skipped — the same code passed at `ccccccc` |');
    expect(text).toContain('| deploy | skipped — the same code passed at `ccccccc`, and the environment has it |');
    const push = gate(root, { plan: planOf(), event: 'push', results, input });
    expect(push.stdout).toBe('deploy=run\n');
    expect(push.stderr).toContain('| deploy | will run |');
    expect(push.stderr).toContain('| framework | run — passed |');
  });

  it('holds a deploy when framework failed and the other stage jobs were skipped', () => {
    const root = repository();
    const summary = join(root, 'summary.md');
    const result = gate(root, {
      plan: planOf(),
      event: 'push',
      results: resultsOf({
        framework: 'failure',
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      summary,
      prior: 'before\n',
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('deploy=held\n');
    const text = readFileSync(summary, 'utf8');
    expect(text.startsWith('before\n')).toBe(true);
    expect(text).toContain('held — framework, sanity, unit, integration, end-to-end did not pass');
    expect(text).toContain('not run — an earlier stage failed');
    expect(text).not.toContain('will run');
  });

  it('holds a stage that was planned to run and finished skipped', () => {
    const root = repository();
    const result = gate(root, {
      plan: planOf({ sanity: 'empty', integration: 'empty', 'end-to-end': 'empty' }),
      event: 'push',
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('deploy=held\n');
    expect(result.stderr).toContain('held — unit did not pass');
  });

  it('fails with no plan, saying the plan job did not finish', () => {
    const root = repository();
    const summary = join(root, 'summary.md');
    const result = gate(root, { event: 'push', results: resultsOf(), summary, prior: '', input: '' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('the plan job did not finish');
    expect(result.stdout).toBe('');
    expect(readFileSync(summary, 'utf8')).toContain('the plan job did not finish');
  });

  it('skips deploy on a green pull request and runs it for the same results on a push', () => {
    const root = repository();
    const plan = planOf();
    const results = resultsOf();
    const pull = gate(root, { plan, event: 'pull_request', results });
    expect(pull.status).toBe(0);
    expect(pull.stdout).toBe('deploy=skipped\n');
    expect(pull.stderr).toContain('skipped — no pipeline/branch/');
    const push = gate(root, { plan, event: 'push', results });
    expect(push.status).toBe(0);
    expect(push.stdout).toBe('deploy=run\n');
    expect(push.stderr).toContain('will run');
    expect(push.stderr).not.toContain("will run — to the branch's environment");
    expect(push.stderr).toContain('run — passed');
    const toBranch = gate(root, { plan, event: 'pull_request', results, branch: 'filled' });
    expect(toBranch.status).toBe(0);
    expect(toBranch.stdout).toBe('deploy=run\n');
    expect(toBranch.stderr).toContain("will run — to the branch's environment");
    const prose = gate(root, {
      plan: planOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
        deploy: 'skipped',
      }),
      event: 'pull_request',
      results: resultsOf({
        sanity: 'skipped',
        unit: 'skipped',
        integration: 'skipped',
        'end-to-end': 'skipped',
      }),
      branch: 'filled',
    });
    expect(prose.status).toBe(0);
    expect(prose.stdout).toBe('deploy=skipped\n');
    expect(prose.stderr).toContain('skipped — only prose and framework files changed');
  });

  it('names every stage, in order, with when to run each command', () => {
    const root = repository();
    const result = runPipeline(root, ['commands']);
    expect(result.status).toBe(0);
    const positions = STAGES.map((stage) => result.stdout.indexOf(stage));
    expect(positions.every((at) => at >= 0)).toBe(true);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    expect(result.stdout).toContain('npm --prefix .tropis ci');
    expect(result.stdout).toContain('deploy=run');
    for (const action of ['create', 'deploy', 'remove']) {
      const command = `node .tropis/scripts/pipeline.mjs branch ${action}`;
      const at = result.stdout.indexOf(command);
      expect(at).toBeGreaterThan(-1);
      const before = result.stdout.slice(0, at).trimEnd();
      expect(before.slice(before.lastIndexOf('\n') + 1).startsWith('#')).toBe(true);
    }
    const commands = result.stdout.split('\n').filter((line) => line !== '' && !line.startsWith('#'));
    expect(commands.length).toBeGreaterThan(0);
    expect(result.stdout).toMatch(/^#/m);
  });
});

describe('host', () => {
  const OUTSIDE = 'host: whether the main branch is gated is read from GitHub, in the pipeline; nothing to check here.';
  const APPLY = 'gh api repos/acme/app/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json';
  const NOT_A_REASON = 'host: "ungated" in .tropis/project.json must say why the main branch is not gated, in words.';
  const GATED_RULES = [{ type: 'pull_request' }, { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'renamed / job' }] } }];

  /** A project with a stub gh first on PATH. GITHUB_ACTIONS is always set explicitly. */
  function hostProject({ projectJson } = {}) {
    const root = repository();
    if (projectJson !== undefined) write(root, '.tropis/project.json', projectJson);
    const bin = mkdtempSync(join(tmpdir(), 'tropis-gh-'));
    temps.push(bin);
    writeFileSync(join(bin, 'gh'), `#!/bin/sh
echo "$*" >> "$STUB_LOG"
if [ "$*" = "api repos/acme/app" ]; then
  if [ -n "$STUB_REPO_ERR" ]; then echo "$STUB_REPO_ERR" >&2; fi
  printf '%s' "$STUB_REPO"
  exit "\${STUB_REPO_EXIT:-0}"
fi
case "$*" in
  "api repos/acme/app/rules/branches/"*) printf '%s' "$STUB_RULES"; exit 0 ;;
esac
echo "stub gh: unexpected call: $*" >&2
exit 99
`);
    chmodSync(join(bin, 'gh'), 0o755);
    const log = join(bin, 'calls.log');
    writeFileSync(log, '');
    const summary = join(bin, 'summary.md');
    writeFileSync(summary, '');
    return { root, bin, log, summary };
  }

  function host(project, { actions = 'true', repo = { default_branch: 'main', allow_auto_merge: true }, rules = GATED_RULES, env = {} } = {}) {
    return runPipeline(project.root, ['host', '--summary', project.summary], {
      env: {
        PATH: `${project.bin}:${process.env.PATH}`,
        GITHUB_ACTIONS: actions,
        GITHUB_REPOSITORY: 'acme/app',
        GH_TOKEN: 'stub',
        STUB_LOG: project.log,
        STUB_REPO: JSON.stringify(repo),
        STUB_RULES: JSON.stringify(rules),
        STUB_REPO_EXIT: '0',
        STUB_REPO_ERR: '',
        ...env,
      },
    });
  }

  const calls = (project) => readFileSync(project.log, 'utf8').split('\n').filter((line) => line !== '');
  const summaryOf = (project) => readFileSync(project.summary, 'utf8');

  it('outside GitHub Actions it says it reads the host in the pipeline and passes', () => {
    const project = hostProject();
    const result = host(project, { actions: '' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${OUTSIDE}\n`);
    expect(calls(project)).toEqual([]);
  });

  it('passes when the main branch requires a pull request and any check, and auto-merge is allowed', () => {
    const project = hostProject();
    const result = host(project);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const line = 'host: main requires a pull request and a passing check, and auto-merge is allowed.';
    expect(result.stdout).toBe(`${line}\n`);
    expect(summaryOf(project)).toContain(line);
    const log = calls(project);
    expect(log.filter((call) => call === 'api repos/acme/app')).toHaveLength(1);
    expect(log.filter((call) => call === 'api repos/acme/app/rules/branches/main?per_page=100')).toHaveLength(1);
  });

  it('fails on a branch with no rules, naming each gap, the command and the opt-out', () => {
    const project = hostProject();
    const result = host(project, { repo: { default_branch: 'main', allow_auto_merge: false }, rules: [] });
    expect(result.status).toBe(1);
    for (const text of [result.stderr, summaryOf(project)]) {
      for (const expected of [
        'host: the main branch main is not gated:',
        'no pull request is required',
        'no check is required',
        'auto-merge is not allowed',
        APPLY,
        'Settings → General → Pull Requests → Allow auto-merge',
        '"ungated"',
        'Pro, Team or Enterprise',
        'a classic branch protection rule does not count',
      ]) expect(text).toContain(expected);
    }
  });

  it('names only what is missing', () => {
    const project = hostProject();
    const result = host(project, { rules: [{ type: 'pull_request' }] });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no check is required');
    expect(result.stderr).not.toContain('no pull request is required');
    expect(result.stderr).not.toContain('auto-merge is not allowed');
  });

  it('reads the default branch from the repository', () => {
    const project = hostProject();
    const result = host(project, { repo: { default_branch: 'trunk', allow_auto_merge: true } });
    expect(result.status).toBe(0);
    expect(calls(project)).toContain('api repos/acme/app/rules/branches/trunk?per_page=100');
  });

  it('an ungated reason passes without asking GitHub, and the summary carries it', () => {
    const project = hostProject({ projectJson: '{"public": true, "ungated": "private, on the free plan"}\n' });
    const result = host(project, { rules: [] });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('host: the main branch is not gated — private, on the free plan (.tropis/project.json)\n');
    expect(summaryOf(project)).toBe('**The main branch is not gated.** private, on the free plan — recorded in .tropis/project.json.\n');
    expect(calls(project)).toEqual([]);
  });

  it('a reason recorded only in the old .claude/project.json counts as no reason recorded', () => {
    const old = hostProject();
    write(old.root, '.claude/project.json', '{"ungated": "a reason"}\n');
    const bare = hostProject();
    const expected = host(bare, { rules: [] });
    const result = host(old, { rules: [] });
    expect(expected.status).toBe(1);
    expect(result.status).toBe(expected.status);
    expect(result.stderr).toBe(expected.stderr);
  });

  it('an ungated value that is not a reason fails', () => {
    for (const value of ['"  "', 'true']) {
      const project = hostProject({ projectJson: `{"ungated": ${value}}\n` });
      const result = host(project);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe(`${NOT_A_REASON}\n`);
      expect(calls(project)).toEqual([]);
    }
  });

  it('fails when GitHub cannot be asked, saying why and how to opt out', () => {
    const project = hostProject();
    const result = host(project, { env: { STUB_REPO_EXIT: '1', STUB_REPO_ERR: 'HTTP 403: Resource not accessible' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('host: the main branch is not gated: could not ask GitHub');
    expect(result.stderr).toContain('HTTP 403');
    expect(result.stderr).toContain('"ungated"');
  });

  it('passes, saying so, when GitHub does not say whether auto-merge is allowed', () => {
    const project = hostProject();
    const result = host(project, { repo: { default_branch: 'main' } });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const line = 'host: main requires a pull request and a passing check. GitHub does not tell the pipeline whether auto-merge is allowed, so that is not checked.';
    expect(result.stdout).toBe(`${line}\n`);
    expect(result.stdout).not.toContain('auto-merge is allowed.');
    expect(summaryOf(project)).toContain(line);
  });

  it('takes no argument but --summary <file>', () => {
    const project = hostProject();
    const result = runPipeline(project.root, ['host', '--other'], { env: { GITHUB_ACTIONS: '' } });
    expect(result.status).toBe(2);
    expect(result.stderr).toBe('host: the only argument is --summary <file>\n');
  });
});

describe('passed', () => {
  const HEAD = 'd'.repeat(40);
  const OTHER = 'e'.repeat(40);
  const MERGED = 'f'.repeat(40);
  const GREEN = [{ name: 'pipeline / plan', conclusion: 'success' }, { name: 'pipeline / gate', conclusion: 'success' }];
  const CLOSED = [{ name: 'pipeline / plan', conclusion: 'success' }, { name: 'pipeline / gate', conclusion: 'skipped' }];
  const mine = (id, sha = HEAD, repo = 'acme/app') => ({ id, head_sha: sha, head_repository: { full_name: repo } });

  /** A stub gh first on PATH that answers only the calls `passed` should make. */
  function passedProject() {
    const root = repository();
    const bin = mkdtempSync(join(tmpdir(), 'tropis-gh-'));
    temps.push(bin);
    writeFileSync(join(bin, 'gh'), `#!/bin/sh
echo "$*" >> "$STUB_LOG"
if [ -n "$STUB_FAIL" ]; then echo "$STUB_FAIL" >&2; exit 1; fi
case "$*" in
  "api repos/acme/app/actions/runs/77") printf '%s' '{"workflow_id": 5}'; exit 0 ;;
  "api repos/acme/app/actions/workflows/5/runs?event=pull_request&branch=fix%2Fa&per_page=10") printf '%s' "$STUB_RUNS"; exit 0 ;;
  "api repos/acme/app/actions/workflows/5/runs?event=pull_request&head_sha=$STUB_HEAD&per_page=10") printf '%s' "$STUB_RUNS"; exit 0 ;;
  "api repos/acme/app/actions/runs/"*"/jobs?per_page=100")
    id=\${2#repos/acme/app/actions/runs/}; id=\${id%%/*}
    eval "printf '%s' \\"\\$STUB_JOBS_$id\\""; exit 0 ;;
  "api repos/acme/app/commits/"*"/pulls") printf '%s' "$STUB_PULLS"; exit 0 ;;
esac
echo "stub gh: unexpected call: $*" >&2
exit 99
`);
    chmodSync(join(bin, 'gh'), 0o755);
    const log = join(bin, 'calls.log');
    writeFileSync(log, '');
    const summary = join(bin, 'summary.md');
    writeFileSync(summary, '');
    return { root, bin, log, summary };
  }

  function passed(project, args, { env = {}, runs = [], jobs = {}, pulls = [], summary = true } = {}) {
    const jobEnv = Object.fromEntries(Object.entries(jobs).map(([id, list]) => [`STUB_JOBS_${id}`, JSON.stringify({ jobs: list })]));
    return runPipeline(project.root, ['passed', ...args, ...(summary ? ['--summary', project.summary] : [])], {
      env: {
        PATH: `${project.bin}:${process.env.PATH}`,
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'acme/app',
        GITHUB_RUN_ID: '77',
        GH_TOKEN: 'stub',
        STUB_LOG: project.log,
        STUB_HEAD: HEAD,
        STUB_RUNS: JSON.stringify({ workflow_runs: runs }),
        STUB_PULLS: JSON.stringify(pulls),
        STUB_FAIL: '',
        ...jobEnv,
        ...env,
      },
    });
  }

  const calls = (project) => readFileSync(project.log, 'utf8').split('\n').filter((line) => line !== '');
  const BRANCH = ['--branch', 'fix/a', '--repository', 'acme/app'];

  it('picks the head of the newest run whose gate passed, past a closed run and a fork', () => {
    const project = passedProject();
    const result = passed(project, BRANCH, {
      runs: [mine(1, OTHER, 'fork/app'), mine(2, OTHER), mine(3, HEAD)],
      jobs: { 2: CLOSED, 3: GREEN },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${HEAD}\n`);
    expect(result.stderr).toBe(`passed: run 3 passed at ${HEAD.slice(0, 7)}\n`);
    expect(readFileSync(project.summary, 'utf8')).toContain(`passed: run 3 passed at ${HEAD.slice(0, 7)}`);
    expect(calls(project).some((line) => line.includes('/runs/1/jobs'))).toBe(false);
  });

  it('prints nothing and says why when no run of the pull request is green', () => {
    const project = passedProject();
    const result = passed(project, BRANCH, { runs: [mine(2)], jobs: { 2: CLOSED } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('passed: no green run of this pull request, so it is planned from the whole diff\n');
  });

  it('for a merge commit, picks the green run of the pull request that merged as it', () => {
    const project = passedProject();
    const pulls = [
      { number: 9, merge_commit_sha: OTHER, head: { sha: OTHER } },
      { number: 10, merge_commit_sha: MERGED, head: { sha: HEAD } },
    ];
    const result = passed(project, ['--merged', MERGED], { pulls, runs: [mine(4), mine(3)], jobs: { 4: CLOSED, 3: GREEN } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${HEAD}\n`);
    expect(result.stderr).toBe(`passed: pull request #10 passed at ${HEAD.slice(0, 7)}\n`);
  });

  it('for a merge commit whose pull request has no green run, prints nothing', () => {
    const project = passedProject();
    const pulls = [{ number: 10, merge_commit_sha: MERGED, head: { sha: HEAD } }];
    const result = passed(project, ['--merged', MERGED], { pulls, runs: [mine(4)], jobs: { 4: CLOSED } });
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(`passed: pull request #10 has no green run at ${HEAD.slice(0, 7)}, so every stage runs\n`);
  });

  it('for a commit no pull request merged as, prints nothing', () => {
    const project = passedProject();
    const pulls = [{ number: 9, merge_commit_sha: OTHER, head: { sha: OTHER } }];
    const result = passed(project, ['--merged', MERGED], { pulls });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(`passed: ${MERGED.slice(0, 7)} was not merged from a pull request, so every stage runs\n`);
  });

  it('never fails the run: a gh failure prints nothing, exits 0, and says why in the summary', () => {
    const project = passedProject();
    const result = passed(project, BRANCH, { env: { STUB_FAIL: 'HTTP 403: Resource not accessible by integration' } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('passed: could not ask GitHub');
    expect(result.stderr).toContain('HTTP 403');
    expect(result.stderr).toContain('nothing is skipped');
    expect(readFileSync(project.summary, 'utf8')).toContain('HTTP 403');
  });

  it('prints nothing for an answer of the wrong shape', () => {
    const project = passedProject();
    const result = passed(project, BRANCH, { env: { STUB_RUNS: '{"total_count": 0}' } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('unexpected shape');
  });

  it('prints nothing outside GitHub Actions, and asks nothing', () => {
    const project = passedProject();
    const result = passed(project, BRANCH, { env: { GITHUB_ACTIONS: '' } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('passed: not in GitHub Actions, so nothing is skipped\n');
    expect(calls(project)).toEqual([]);
  });

  it('names a missing variable and prints nothing', () => {
    const project = passedProject();
    const result = passed(project, BRANCH, { env: { GITHUB_RUN_ID: '' } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('GITHUB_RUN_ID');
  });

  it.each([
    [[]],
    [['--branch', 'fix/a']],
    [['--merged', MERGED, '--branch', 'fix/a', '--repository', 'acme/app']],
    [['--summary', 'x']],
  ])('exits 2 on a usage error: %j', (args) => {
    const project = passedProject();
    const result = passed(project, args, { summary: false });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('passed: use --branch <ref> --repository <owner/name>, or --merged <commit>\n');
  });

  it('judges a gate by name, not a run by its conclusion', () => {
    expect(gateIsGreen(GREEN)).toBe(true);
    expect(gateIsGreen(CLOSED)).toBe(false);
    expect(gateIsGreen([{ name: 'gate', conclusion: 'success' }])).toBe(true);
    expect(gateIsGreen([{ name: 'pipeline / host', conclusion: 'success' }])).toBe(false);
    expect(runsFromRepository([mine(1, HEAD, 'fork/app'), mine(2)], 'acme/app').map((run) => run.id)).toEqual([2]);
    expect(firstGreenRun([mine(1), mine(2)], (run) => ({ jobs: run.id === 2 ? GREEN : CLOSED })).run.id).toBe(2);
    expect(firstGreenRun([mine(1)], () => ({ error: 'boom' }))).toEqual({ error: 'boom' });
  });
});

describe('GitHub workflow', () => {
  it('gives each stage its own job, and the four filled stages run side by side', () => {
    const pipelineDoc = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-pipeline.yml'), 'utf8'));
    const checks = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-framework-checks.yml'), 'utf8'));
    const jobs = pipelineDoc.jobs;
    expect(Object.keys(jobs)).toEqual([
      'plan',
      'host',
      'framework',
      'sanity',
      'unit',
      'integration',
      'end-to-end',
      'branch-create',
      'gate',
      'deploy',
      'branch-remove',
    ]);
    for (const stage of ['sanity', 'unit', 'integration', 'end-to-end']) {
      expect([...jobs[stage].needs].sort()).toEqual(['framework', 'plan']);
    }
    expect(jobs.gate.needs).toEqual(['plan', ...STAGES.slice(0, -1)]);
    expect(jobs.host.needs).toBeUndefined();
    expect(String(jobs.host.if)).toContain("github.event.action != 'closed'");
    const hostRun = jobs.host.steps.find((step) => step.run);
    expect(hostRun.run).toBe('node .tropis/scripts/pipeline.mjs host --summary "$GITHUB_STEP_SUMMARY"');
    expect(hostRun.env.GH_TOKEN).toBe('${{ github.token }}');
    expect([].concat(jobs.gate.needs)).not.toContain('host');
    expect([].concat(jobs.deploy.needs)).not.toContain('host');
    expect(String(jobs.gate.if)).toContain('always()');
    expect(String(jobs.gate.if)).toContain("github.event.action != 'closed'");
    expect(String(jobs.framework.if)).toContain("github.event.action != 'closed'");
    expect([].concat(jobs.deploy.needs)).toEqual(['plan', 'gate', 'branch-create']);
    expect(String(jobs.deploy.if)).toContain('!cancelled()');
    expect(String(jobs.deploy.if)).not.toContain('always()');
    expect(String(jobs.deploy.if)).toContain("needs.gate.outputs.deploy == 'run'");
    expect(String(jobs.deploy.if)).toContain("needs.branch-create.result != 'failure'");
    const group = "tropis-env-${{ github.repository }}-${{ needs.plan.outputs.environment || 'shared' }}";
    for (const id of ['branch-create', 'deploy', 'branch-remove']) {
      expect(jobs[id].concurrency.group).toBe(group);
      expect(jobs[id].concurrency['cancel-in-progress']).toBe(false);
      expect(JSON.stringify(jobs[id])).toContain('TROPIS_SECRETS');
    }
    const caller = YAML.parse(readFileSync(join(blueprint, 'templates/pipeline-caller.yml'), 'utf8'));
    expect(caller.on.pull_request.types).toEqual(['opened', 'synchronize', 'reopened', 'closed']);
    expect(caller.on.push.branches).toEqual(['main']);
    expect(readFileSync(join(blueprint, 'templates/pipeline-caller.yml'), 'utf8'))
      .toContain('closed is what removes a branch\'s environment');
    for (const stage of STAGES) {
      const text = stage === 'framework' ? JSON.stringify(checks) : JSON.stringify(jobs[stage]);
      expect(text).toContain(`run ${stage}`);
    }
    const planRun = String(jobs.plan.steps.find((step) => step.id === 'plan').run);
    expect(planRun).toContain('plan --closed');
    expect(planRun).toContain('--no-check');
    expect(planRun).not.toContain('for script in');
    expect(planRun).toContain('environment "$HEAD_REF" --no-check)');
    expect(planRun).toMatch(/else\n\s*environment=\$\(node \.tropis\/scripts\/pipeline\.mjs environment "\$HEAD_REF"\)\n/);
    expect(planRun).toContain('plan --closed >> "$GITHUB_OUTPUT"');
  });

  it('runs every stage between framework and deploy on the commit it deploys to staging', () => {
    const stagingPath = join(blueprint, 'templates/github/tropis-staging.yml');
    const stagingText = readFileSync(stagingPath, 'utf8');
    const staging = YAML.parse(stagingText);
    expect(Object.keys(staging.jobs)).toEqual(['framework', 'stages', 'deploy']);
    expect(staging.on.workflow_call.inputs.commit.required).toBe(true);
    const between = STAGES.filter((stage) => stage !== 'framework' && stage !== 'deploy');
    expect(staging.jobs.stages.strategy.matrix.stage).toEqual(between);
    expect(staging.jobs.stages.strategy['fail-fast']).toBe(false);
    expect([].concat(staging.jobs.stages.needs)).toEqual(['framework']);
    expect([].concat(staging.jobs.deploy.needs)).toEqual(['stages']);
    expect(staging.jobs.deploy.if).toBeUndefined();
    expect(staging.jobs.deploy.concurrency).toEqual({
      group: 'tropis-staging-${{ github.repository }}',
      'cancel-in-progress': false,
    });
    expect(staging.name).toBe('Tropis deploy to staging');
    expect(staging.jobs.framework.uses).toBe('./.github/workflows/tropis-framework-checks.yml');
    expect(staging.jobs.framework.with).toEqual({
      'node-version': '${{ inputs.node-version }}',
      ref: '${{ inputs.commit }}',
    });
    const checkouts = (job) => (job.steps || []).filter((step) => String(step.uses).startsWith('actions/checkout'));
    for (const id of ['stages', 'deploy']) {
      const steps = checkouts(staging.jobs[id]);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.with.ref).toBe('${{ inputs.commit }}');
    }
    const deployCheckout = checkouts(staging.jobs.deploy)[0];
    expect(deployCheckout.with['fetch-depth']).toBe(0);
    const stageRun = staging.jobs.stages.steps.find((step) => step.run);
    const deployRun = staging.jobs.deploy.steps.find((step) => step.run);
    expect(stageRun.env.TROPIS_SECRETS).toBe('${{ toJSON(secrets) }}');
    expect(deployRun.env.TROPIS_SECRETS).toBe('${{ toJSON(secrets) }}');
    expect(stageRun.run).toBe('node .tropis/scripts/pipeline.mjs run ${{ matrix.stage }}');
    expect(deployRun.run).toBe('node .tropis/scripts/pipeline.mjs staging deploy --summary "$GITHUB_STEP_SUMMARY"');
    const stagesAt = stagingText.indexOf('\n  stages:');
    expect(stagingText.slice(0, stagesAt)).toContain('no gate');
    expect(stagingText.slice(0, stagesAt)).toContain('skips none');

    const checks = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-framework-checks.yml'), 'utf8'));
    const checksCheckout = checks.jobs.checks.steps.find((step) => String(step.uses).startsWith('actions/checkout'));
    expect(checksCheckout.with.ref).toBe('${{ inputs.ref }}');
    expect(checks.on.workflow_call.inputs.ref.default).toBe('');
    const pipelineText = readFileSync(join(blueprint, 'templates/github/tropis-pipeline.yml'), 'utf8');
    expect(YAML.parse(pipelineText).jobs.framework.with).toEqual({
      'node-version': '${{ inputs.node-version }}',
    });
    expect(pipelineText).not.toContain('inputs.commit');

    const callerPath = join(blueprint, 'templates/staging-caller.yml');
    const callerText = readFileSync(callerPath, 'utf8');
    const caller = YAML.parse(callerText);
    expect(caller.name).toBe('Deploy to staging');
    expect(caller['run-name']).toBe('Deploy to staging ${{ inputs.commit || github.sha }}');
    expect(Object.keys(caller.on)).toEqual(['workflow_dispatch']);
    expect(caller.on.workflow_dispatch.inputs.commit.required).toBe(false);
    expect(Object.values(caller.jobs).map((job) => job.uses)).toEqual(['./.github/workflows/tropis-staging.yml']);
    expect(callerText).toContain('${{ inputs.commit || github.sha }}');
    expect(callerText).toContain('gh workflow run staging.yml --ref main -f commit=<commit>');
    expect(callerText).toContain('never by an agent');
  });

  it('plans from a passed commit only on a push to a pull request and on a push to main, and never for staging', () => {
    const pipelineText = readFileSync(join(blueprint, 'templates/github/tropis-pipeline.yml'), 'utf8');
    const planStep = YAML.parse(pipelineText).jobs.plan.steps.find((step) => step.id === 'plan');
    expect(planStep.env.GH_TOKEN).toBe('${{ github.token }}');
    expect(planStep.env.HEAD_REPO).toBe('${{ github.event.pull_request.head.repo.full_name }}');
    const run = String(planStep.run);
    expect(run.match(/passed --branch/g)).toHaveLength(1);
    expect(run.match(/passed --merged/g)).toHaveLength(1);
    expect(run).toMatch(/"\$EVENT_NAME" = "pull_request" \] && \[ "\$ACTION" = "synchronize" \][\s\S]*passed --branch "\$HEAD_REF" --repository "\$HEAD_REPO"/);
    expect(run).toMatch(/elif \[ "\$EVENT_NAME" = "push" \][\s\S]*passed --merged "\$PUSH_SHA"/);
    expect(run).toContain('git fetch --no-tags --quiet origin "$passed" || true');
    expect(run).toContain('passed_args=(--passed "$passed")');
    expect(run).toContain('"${passed_args[@]}"');
    const staging = readFileSync(join(blueprint, 'templates/github/tropis-staging.yml'), 'utf8');
    expect(staging).not.toContain('pipeline.mjs passed');
    expect(staging).not.toContain('pipeline.mjs plan');
    expect(staging).not.toContain('--passed');
  });

  it('the ruleset requires a pull request and the gate, and lets nobody bypass it', () => {
    const ruleset = JSON.parse(readFileSync(join(blueprint, 'templates/github/main-branch-ruleset.json'), 'utf8'));
    const caller = YAML.parse(readFileSync(join(blueprint, 'templates/pipeline-caller.yml'), 'utf8'));
    const template = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-pipeline.yml'), 'utf8'));
    expect(template.jobs.gate).toBeDefined();
    expect(ruleset.enforcement).toBe('active');
    expect(ruleset.bypass_actors).toEqual([]);
    expect(ruleset.conditions.ref_name.include).toEqual(['~DEFAULT_BRANCH']);
    const rule = (type) => ruleset.rules.find((r) => r.type === type);
    expect(ruleset.rules.map((r) => r.type).sort()).toEqual([
      'deletion',
      'non_fast_forward',
      'pull_request',
      'required_status_checks',
    ]);
    expect(rule('pull_request').parameters.required_approving_review_count).toBe(0);
    const checks = rule('required_status_checks').parameters;
    expect(checks.strict_required_status_checks_policy).toBe(true);
    expect(checks.required_status_checks.map((c) => c.context)).toEqual([`${Object.keys(caller.jobs)[0]} / gate`]);
  });
});
