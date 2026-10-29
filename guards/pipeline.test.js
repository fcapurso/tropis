// Level: unit
/**
 * The pipeline every set-up project runs. Six stages stay in one order, and the
 * deploy gate runs only when every earlier stage passed or was empty. Changing
 * the order or how the gate decides is a breaking release.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  candidateSlot,
  candidateSummary,
  environmentName,
  gateDecision,
  isProseAndFramework,
  matchesProse,
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
const CANDIDATE_SCRIPTS = ['reset.sh', 'deploy.sh'];

function fillBranchSlot(root, body = 'exit 0\n') {
  for (const name of BRANCH_SCRIPTS) write(root, `pipeline/branch/${name}`, body);
}

function fillCandidateSlot(root, body = 'exit 0\n') {
  for (const name of CANDIDATE_SCRIPTS) write(root, `pipeline/candidate/${name}`, body);
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

describe('candidate slot', () => {
  it('prints candidate=empty with no scripts and candidate=filled when both exist', () => {
    const root = repository();
    expect(candidateSlot(root)).toEqual({ slot: 'empty' });
    const empty = runPipeline(root, ['candidate', 'slot']);
    expect(empty.status).toBe(0);
    expect(empty.stdout).toBe('candidate=empty\n');
    fillCandidateSlot(root);
    expect(candidateSlot(root)).toEqual({ slot: 'filled' });
    const filled = runPipeline(root, ['candidate', 'slot']);
    expect(filled.status).toBe(0);
    expect(filled.stdout).toBe('candidate=filled\n');
  });

  it('exits 1 and names only the missing script when one of the two exists', () => {
    const missingDeploy = repository();
    write(missingDeploy, 'pipeline/candidate/reset.sh', 'exit 0\n');
    expect(candidateSlot(missingDeploy).error).toBe('candidate: pipeline/candidate/ is missing deploy.sh');
    const deploy = runPipeline(missingDeploy, ['candidate', 'slot']);
    expect(deploy.status).toBe(1);
    expect(deploy.stderr).toBe('candidate: pipeline/candidate/ is missing deploy.sh\n');

    const missingReset = repository();
    write(missingReset, 'pipeline/candidate/deploy.sh', 'exit 0\n');
    expect(candidateSlot(missingReset).error).toBe('candidate: pipeline/candidate/ is missing reset.sh');
    const reset = runPipeline(missingReset, ['candidate', 'slot']);
    expect(reset.status).toBe(1);
    expect(reset.stderr).toBe('candidate: pipeline/candidate/ is missing reset.sh\n');
  });

  it('exits 2 and names slot and rehearse when the subcommand is missing or unknown', () => {
    const root = repository();
    const none = runPipeline(root, ['candidate']);
    expect(none.status).toBe(2);
    expect(none.stderr).toContain('slot');
    expect(none.stderr).toContain('rehearse');
    const unknown = runPipeline(root, ['candidate', 'nope']);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('slot');
    expect(unknown.stderr).toContain('rehearse');
  });
});

function summaryFor({ hash, reset, deploy, byHand }) {
  const lines = [
    '### Release candidate',
    '',
    `- Candidate: \`${hash}\``,
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

describe('candidate rehearse', () => {
  it('prints the empty line and records that nothing ran when the slot is empty', () => {
    const root = repository();
    const hash = commit(root, 'base');
    const summary = join(root, 'summary.md');
    writeFileSync(summary, 'prior\n');
    const result = runPipeline(root, ['candidate', 'rehearse', '--summary', summary]);
    const text = summaryFor({
      hash,
      reset: 'not run — no pipeline/candidate/',
      deploy: 'not run — no pipeline/candidate/',
      byHand: null,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('candidate: empty — no pipeline/candidate/, so no candidate was rehearsed\n');
    expect(result.stdout).not.toContain('### Release candidate');
    expect(readFileSync(summary, 'utf8')).toBe(`prior\n${text}`);
    expect(candidateSummary({
      hash,
      reset: 'not run — no pipeline/candidate/',
      deploy: 'not run — no pipeline/candidate/',
      byHand: null,
    })).toBe(text);
  });

  it('does not run reset when there is no tag at all like a release, and says no release yet', () => {
    const root = repository();
    const hash = commit(root, 'base');
    git(root, 'tag', 'not-a-release');
    write(root, 'pipeline/candidate/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/candidate/deploy.sh', 'printf "%s" "$TROPIS_CANDIDATE" > saw-candidate.txt\n');
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(0);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(readFileSync(join(root, 'saw-candidate.txt'), 'utf8')).toBe(hash);
    expect(result.stderr).toBe(summaryFor({
      hash,
      reset: 'not needed — no release yet',
      deploy: 'deployed',
      byHand: [],
    }));
    expect(result.stdout).toBe('');
  });

  it('resets to the highest release tag, then deploys, and removes the archive afterwards', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    fillCandidateSlot(root, 'exit 0\n');
    write(root, 'pipeline/candidate/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'printf "%s" "$TROPIS_PRODUCTION_DIR" > saw-dir.txt',
      'printf "%s" "$TROPIS_PRODUCTION_TAG" > saw-tag.txt',
      '',
    ].join('\n'));
    write(root, 'pipeline/candidate/deploy.sh', [
      'printf "%s" "$TROPIS_CANDIDATE" > saw-candidate.txt',
      'if [ -n "${TROPIS_PRODUCTION_TAG+x}" ]; then printf set > saw-deploy-tag.txt; fi',
      'if [ -n "${TROPIS_PRODUCTION_DIR+x}" ]; then printf set > saw-deploy-dir.txt; fi',
      '',
    ].join('\n'));
    const summary = join(root, 'summary.md');
    writeFileSync(summary, 'prior\n');
    const result = runPipeline(root, ['candidate', 'rehearse', '--summary', summary]);
    const text = summaryFor({
      hash,
      reset: 'to `v0.10.0`',
      deploy: 'deployed',
      byHand: [],
    });
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'saw-tag.txt'), 'utf8')).toBe('v0.10.0');
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v0.10.0\n');
    expect(readFileSync(join(root, 'saw-candidate.txt'), 'utf8')).toBe(hash);
    const dir = readFileSync(join(root, 'saw-dir.txt'), 'utf8');
    expect(statSync(dir, { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'saw-deploy-tag.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'saw-deploy-dir.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(readFileSync(summary, 'utf8')).toBe(`prior\n${text}`);
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
    write(root, 'pipeline/candidate/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'wc -c < "$TROPIS_PRODUCTION_DIR/large.bin" | tr -d " " > saw-size.txt',
      'ls -A "$TROPIS_PRODUCTION_DIR" > saw-files.txt',
      '',
    ].join('\n'));
    write(root, 'pipeline/candidate/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['candidate', 'rehearse']);
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
    write(root, 'pipeline/candidate/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'printf "%s" "$TROPIS_PRODUCTION_TAG" > saw-tag.txt',
      '',
    ].join('\n'));
    write(root, 'pipeline/candidate/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'saw-tag.txt'), 'utf8')).toBe('v1.0.0');
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v1.0.0\n');
    expect(result.stderr).toBe(summaryFor({
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
    write(root, 'pipeline/candidate/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/candidate/deploy.sh', 'exit 0\n');
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(0);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(result.stderr).toBe(summaryFor({
      hash,
      reset: 'not needed — no release yet',
      deploy: 'deployed',
      byHand: [],
    }));
  });

  it('removes the archive and skips deploy when reset.sh fails', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    write(root, 'pipeline/candidate/reset.sh', [
      'cat "$TROPIS_PRODUCTION_DIR/version.txt" > saw-version.txt',
      'printf "%s" "$TROPIS_PRODUCTION_DIR" > saw-dir.txt',
      'exit 3',
      '',
    ].join('\n'));
    write(root, 'pipeline/candidate/deploy.sh', 'printf ran > deploy-ran.txt\n');
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(3);
    expect(readFileSync(join(root, 'saw-version.txt'), 'utf8')).toBe('v0.10.0\n');
    const dir = readFileSync(join(root, 'saw-dir.txt'), 'utf8');
    expect(statSync(dir, { throwIfNoEntry: false })).toBeUndefined();
    expect(statSync(join(root, 'deploy-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(result.stderr).toBe(summaryFor({
      hash,
      reset: 'failed — reset.sh exited 3',
      deploy: 'not run — reset.sh failed',
      byHand: null,
    }));
  });

  it('lists by-hand lines in the order deploy.sh wrote them', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    write(root, 'pipeline/candidate/reset.sh', 'exit 0\n');
    write(root, 'pipeline/candidate/deploy.sh', [
      'printf "%s\\n" "Approve the new permissions" >> "$TROPIS_BY_HAND"',
      'printf "%s\\n" "Restart the worker" >> "$TROPIS_BY_HAND"',
      '',
    ].join('\n'));
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe(summaryFor({
      hash,
      reset: 'to `v0.10.0`',
      deploy: 'deployed',
      byHand: ['Approve the new permissions', 'Restart the worker'],
    }));
  });

  it('does not report by-hand lines when deploy.sh fails', () => {
    const root = repository();
    const hash = commit(root, 'base');
    write(root, 'pipeline/candidate/reset.sh', 'printf ran > reset-ran.txt\n');
    write(root, 'pipeline/candidate/deploy.sh', [
      'printf "%s\\n" "Approve the new permissions" >> "$TROPIS_BY_HAND"',
      'exit 4',
      '',
    ].join('\n'));
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(4);
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
    expect(result.stderr).toBe(summaryFor({
      hash,
      reset: 'not needed — no release yet',
      deploy: 'failed — deploy.sh exited 4',
      byHand: null,
    }));
  });

  it('passes secret values to reset and deploy without forwarding the payload', () => {
    const root = versionedRepository();
    const hash = git(root, 'rev-parse', 'HEAD');
    write(root, 'pipeline/candidate/reset.sh', 'printf \'%s\\n\' reset >> seen.txt\nif [ -n "${TROPIS_SECRETS+x}" ]; then printf \'%s\\n\' secrets-set >> seen.txt; else printf \'%s\\n\' secrets-unset >> seen.txt; fi\nprintf \'A=%s\\n\' "$A" >> seen.txt\nprintf \'candidate=%s\\n\' "$TROPIS_CANDIDATE" >> seen.txt\nprintf \'tag=%s\\n\' "$TROPIS_PRODUCTION_TAG" >> seen.txt\n');
    write(root, 'pipeline/candidate/deploy.sh', `printf '%s\\n' deploy >> seen.txt\nif [ -n "\${TROPIS_SECRETS+x}" ]; then printf '%s\\n' secrets-set >> seen.txt; else printf '%s\\n' secrets-unset >> seen.txt; fi\nprintf 'A=%s\\n' "$A" >> seen.txt\nprintf 'candidate=%s\\n' "$TROPIS_CANDIDATE" >> seen.txt\n`);
    const seen = runPipeline(root, ['candidate', 'rehearse'], {
      env: { TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(seen.status).toBe(0);
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe(
      `reset\nsecrets-unset\nA=1\ncandidate=${hash}\ntag=v0.10.0\ndeploy\nsecrets-unset\nA=1\ncandidate=${hash}\n`,
    );
    const kept = runPipeline(root, ['candidate', 'rehearse'], {
      env: { A: 'kept', TROPIS_SECRETS: '{"A":"1"}' },
    });
    expect(kept.status).toBe(0);
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe(
      `reset\nsecrets-unset\nA=1\ncandidate=${hash}\ntag=v0.10.0\n`
      + `deploy\nsecrets-unset\nA=1\ncandidate=${hash}\n`
      + `reset\nsecrets-unset\nA=kept\ncandidate=${hash}\ntag=v0.10.0\n`
      + `deploy\nsecrets-unset\nA=kept\ncandidate=${hash}\n`,
    );
  });

  it('exits 1 and names the missing script when the slot has only one', () => {
    const root = repository();
    commit(root, 'base');
    write(root, 'pipeline/candidate/reset.sh', 'printf ran > reset-ran.txt\n');
    const result = runPipeline(root, ['candidate', 'rehearse']);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('candidate: pipeline/candidate/ is missing deploy.sh\n');
    expect(statSync(join(root, 'reset-ran.txt'), { throwIfNoEntry: false })).toBeUndefined();
  });

  it('ends the host command list with the candidate rehearse', () => {
    const root = repository();
    const result = runPipeline(root, ['commands']);
    expect(result.status).toBe(0);
    expect(result.stdout.endsWith([
      '# Release candidate. Started by hand for one commit on the main branch, never on a push.',
      '# Every stage first, as on a push with nothing skipped; then:',
      'node .tropis/scripts/pipeline.mjs candidate rehearse',
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

  function gate(root, { plan, event, results, summary, prior, branch }) {
    if (prior !== undefined) writeFileSync(summary, prior);
    return runPipeline(root, [
      'gate', '--plan', '-', '--event', event,
      ...(branch ? ['--branch', branch] : []),
      ...(summary ? ['--summary', summary] : []),
      ...STAGES.slice(0, -1).map((stage) => `${stage}=${results[stage]}`),
    ], { input: `${STAGES.map((stage) => `${stage}=${plan[stage]}`).join('\n')}\n` });
  }

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
    expect(result.status).toBe(0);
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
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('deploy=held\n');
    expect(result.stderr).toContain('held — unit did not pass');
  });

  it('skips deploy on a green pull request and runs it for the same results on a push', () => {
    const root = repository();
    const plan = planOf();
    const results = resultsOf();
    const pull = gate(root, { plan, event: 'pull_request', results });
    expect(pull.stdout).toBe('deploy=skipped\n');
    expect(pull.stderr).toContain('skipped — no pipeline/branch/');
    const push = gate(root, { plan, event: 'push', results });
    expect(push.stdout).toBe('deploy=run\n');
    expect(push.stderr).toContain('will run');
    expect(push.stderr).not.toContain("will run — to the branch's environment");
    expect(push.stderr).toContain('run — passed');
    const toBranch = gate(root, { plan, event: 'pull_request', results, branch: 'filled' });
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

describe('GitHub workflow', () => {
  it('gives each stage its own job, and the four filled stages run side by side', () => {
    const pipelineDoc = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-pipeline.yml'), 'utf8'));
    const checks = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-framework-checks.yml'), 'utf8'));
    const jobs = pipelineDoc.jobs;
    expect(Object.keys(jobs)).toEqual([
      'plan',
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

  it('rehearses every stage between framework and deploy on the chosen commit', () => {
    const candidatePath = join(blueprint, 'templates/github/tropis-candidate.yml');
    const candidateText = readFileSync(candidatePath, 'utf8');
    const candidate = YAML.parse(candidateText);
    expect(Object.keys(candidate.jobs)).toEqual(['framework', 'stages', 'rehearse']);
    expect(candidate.on.workflow_call.inputs.commit.required).toBe(true);
    const between = STAGES.filter((stage) => stage !== 'framework' && stage !== 'deploy');
    expect(candidate.jobs.stages.strategy.matrix.stage).toEqual(between);
    expect(candidate.jobs.stages.strategy['fail-fast']).toBe(false);
    expect([].concat(candidate.jobs.stages.needs)).toEqual(['framework']);
    expect([].concat(candidate.jobs.rehearse.needs)).toEqual(['stages']);
    expect(candidate.jobs.rehearse.if).toBeUndefined();
    expect(candidate.jobs.rehearse.concurrency).toEqual({
      group: 'tropis-candidate-${{ github.repository }}',
      'cancel-in-progress': false,
    });
    expect(candidate.jobs.framework.uses).toBe('./.github/workflows/tropis-framework-checks.yml');
    expect(candidate.jobs.framework.with).toEqual({
      'node-version': '${{ inputs.node-version }}',
      ref: '${{ inputs.commit }}',
    });
    const checkouts = (job) => (job.steps || []).filter((step) => String(step.uses).startsWith('actions/checkout'));
    for (const id of ['stages', 'rehearse']) {
      const steps = checkouts(candidate.jobs[id]);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.with.ref).toBe('${{ inputs.commit }}');
    }
    const rehearseCheckout = checkouts(candidate.jobs.rehearse)[0];
    expect(rehearseCheckout.with['fetch-depth']).toBe(0);
    const stageRun = candidate.jobs.stages.steps.find((step) => step.run);
    const rehearseRun = candidate.jobs.rehearse.steps.find((step) => step.run);
    expect(stageRun.env.TROPIS_SECRETS).toBe('${{ toJSON(secrets) }}');
    expect(rehearseRun.env.TROPIS_SECRETS).toBe('${{ toJSON(secrets) }}');
    expect(stageRun.run).toBe('node .tropis/scripts/pipeline.mjs run ${{ matrix.stage }}');
    expect(rehearseRun.run).toBe('node .tropis/scripts/pipeline.mjs candidate rehearse --summary "$GITHUB_STEP_SUMMARY"');
    const stagesAt = candidateText.indexOf('\n  stages:');
    expect(candidateText.slice(0, stagesAt)).toContain('no gate');
    expect(candidateText.slice(0, stagesAt)).toContain('skips none');

    const checks = YAML.parse(readFileSync(join(blueprint, 'templates/github/tropis-framework-checks.yml'), 'utf8'));
    const checksCheckout = checks.jobs.checks.steps.find((step) => String(step.uses).startsWith('actions/checkout'));
    expect(checksCheckout.with.ref).toBe('${{ inputs.ref }}');
    expect(checks.on.workflow_call.inputs.ref.default).toBe('');
    const pipelineText = readFileSync(join(blueprint, 'templates/github/tropis-pipeline.yml'), 'utf8');
    expect(YAML.parse(pipelineText).jobs.framework.with).toEqual({
      'node-version': '${{ inputs.node-version }}',
    });
    expect(pipelineText).not.toContain('inputs.commit');
    // The self-check runs this guard from an archive with no .git, so the byte
    // comparison with main is only available in a checkout of this repository.
    const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: blueprint, encoding: 'utf8' });
    if (top.status === 0 && realpathSync(top.stdout.trim()) === realpathSync(blueprint)) {
      const committed = spawnSync('git', ['show', 'main:templates/github/tropis-pipeline.yml'], {
        cwd: blueprint,
        encoding: 'utf8',
      });
      expect(committed.status).toBe(0);
      expect(pipelineText).toBe(committed.stdout);
    }

    const callerPath = join(blueprint, 'templates/candidate-caller.yml');
    const callerText = readFileSync(callerPath, 'utf8');
    const caller = YAML.parse(callerText);
    expect(Object.keys(caller.on)).toEqual(['workflow_dispatch']);
    expect(caller.on.workflow_dispatch.inputs.commit.required).toBe(false);
    expect(callerText).toContain('${{ inputs.commit || github.sha }}');
    expect(callerText).toContain('gh workflow run candidate.yml --ref main -f commit=<commit>');
    expect(callerText).toContain('never by an agent');
  });
});
