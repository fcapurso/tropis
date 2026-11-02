// Shared machinery: no part of this file is project-owned.
/**
 * The host-neutral pipeline a set-up project runs. Stages stay in one order.
 * The deploy gate runs on a push only when every earlier stage passed or was
 * empty. A pull request deploys to the branch's environment when the branch
 * slot is filled and the change is not prose and framework alone. `plan`
 * decides which stages run from the diff, and the block at the bottom runs
 * only when this file is the program.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * In order: framework checks, sanity checks, unit and seam tests, integration
 * tests, end-to-end tests, deploy.
 */
export const STAGES = Object.freeze([
  'framework',
  'sanity',
  'unit',
  'integration',
  'end-to-end',
  'deploy',
]);

const BEFORE_DEPLOY = STAGES.slice(0, -1);

/**
 * The name of a branch's environment. Lowercase, each run of characters
 * outside `[a-z0-9]` becomes one `-`, and `-` is trimmed from both ends.
 * A name that does not start with a letter is prefixed with `b-`. A name
 * longer than 24 characters keeps its first 17, drops a trailing `-`, and
 * appends `-` plus the first 6 hex characters of the SHA-1 of the original
 * branch name. A branch of only symbols has no name.
 * @param {string} branch
 * @returns {string}
 */
export function environmentName(branch) {
  let name = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (name === '') throw new Error('environment: a branch of only symbols has no name');
  if (!/^[a-z]/.test(name)) name = `b-${name}`;
  if (name.length > 24) {
    const prefix = name.slice(0, 17).replace(/-+$/, '');
    const hash = createHash('sha1').update(branch).digest('hex').slice(0, 6);
    name = `${prefix}-${hash}`;
  }
  return name;
}

/**
 * Paths that count as framework. The directory entries are the `for p in`
 * loop in set-up-project.sh that writes export-ignore. The last two are not
 * in that loop: a project's model picks, and its own framework-stage script.
 */
export const FRAMEWORK_PATHS = Object.freeze([
  '.claude/',
  '.cursor/',
  '.tropis/',
  'CLAUDE.md',
  'AGENTS.md',
  'feature-catalog.yaml',
  'docs/superpowers/',
  'docs/backlog-board/',
  'docs/verification-log.md',
  'docs/project-brief.md',
  'docs/readme/',
  'docs/BLUEPRINT-UPSTREAM.md',
  'docs/model-picks.md',
  'pipeline/framework.sh',
]);

const FULL_RUN = {
  missingBase: 'plan: no base was given, so this is a full run',
  zeroBase: 'plan: the base is all zeros, so this is a full run',
  unresolvedBase: 'plan: the base does not resolve, so this is a full run',
  emptyDiff: 'plan: the diff lists no paths, so this is a full run',
};

function git(root, args) {
  return spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}

/** `*` stays inside one path segment. `**` crosses segments, including none. */
function globToRegExp(pattern) {
  let source = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith('**/', i)) {
      source += '(?:.*/)?';
      i += 3;
      continue;
    }
    if (pattern.startsWith('**', i)) {
      source += '.*';
      i += 2;
      continue;
    }
    if (pattern[i] === '*') {
      source += '[^/]*';
      i += 1;
      continue;
    }
    const ch = pattern[i];
    source += '\\^$+?()[]{}|.'.includes(ch) ? `\\${ch}` : ch;
    i += 1;
  }
  return new RegExp(`^${source}$`);
}

function patternMatches(pattern, path) {
  if (pattern.endsWith('/')) {
    const dir = pattern.slice(0, -1);
    return path === dir || path.startsWith(`${dir}/`);
  }
  return globToRegExp(pattern).test(path);
}

function matchesFramework(path) {
  return FRAMEWORK_PATHS.some((pattern) => patternMatches(pattern, path));
}

/**
 * Whether `path` is prose under `proseText`. Blank lines and `#` lines are
 * ignored. A line ending in `/` is that directory and everything under it.
 * A line starting with `!` re-includes the path. The last matching line wins.
 * A missing file (`null`) means nothing is prose.
 * @param {string} path
 * @param {string | null} proseText
 * @returns {boolean}
 */
export function matchesProse(path, proseText) {
  if (proseText == null) return false;
  let prose = false;
  for (const raw of proseText.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const negated = line.startsWith('!');
    const pattern = (negated ? line.slice(1) : line).trim();
    if (pattern === '' || !patternMatches(pattern, path)) continue;
    prose = !negated;
  }
  return prose;
}

/**
 * True when there is at least one path and every path is framework or prose.
 * An empty diff is not this: it is a full run.
 * @param {string[]} paths
 * @param {string | null} proseText
 * @returns {boolean}
 */
export function isProseAndFramework(paths, proseText) {
  return paths.length > 0
    && paths.every((path) => matchesFramework(path) || matchesProse(path, proseText));
}

function classify(root, proseOnly) {
  const stages = {};
  for (const stage of STAGES) {
    if (stage === 'framework') stages[stage] = 'run';
    else if (proseOnly) stages[stage] = 'skipped';
    else if (existsSync(join(root, 'pipeline', `${stage}.sh`))) stages[stage] = 'run';
    else stages[stage] = 'empty';
  }
  return stages;
}

function readProse(root) {
  const prosePath = join(root, 'pipeline', 'prose.txt');
  return existsSync(prosePath) ? readFileSync(prosePath, 'utf8') : null;
}

const CODE_STAGES = STAGES.filter((stage) => stage !== 'framework' && stage !== 'deploy');

/**
 * Narrows a plan that would run code stages when the tree about to be tested
 * differs from `passed` only in prose and framework files. The diff is
 * two-dot (tree against tree), not from the merge base, so a change the passed
 * commit had and `head` dropped still counts. It only ever turns stages into
 * skips; `deploy` keeps its value. Returns the plan unchanged, with a note on
 * why, when the code differs or `passed` does not resolve.
 */
function applyPassed(root, outcome, { passed, head }) {
  if (!CODE_STAGES.some((stage) => outcome.stages[stage] === 'run')) return outcome;
  const short = passed.slice(0, 7);
  const resolved = git(root, ['rev-parse', '--verify', '--quiet', `${passed}^{commit}`]);
  if (resolved.status !== 0) {
    return { ...outcome, note: `plan: ${passed} does not resolve, so this is planned from the whole diff` };
  }
  const diff = git(root, ['diff', '--name-only', '--no-renames', passed, head]);
  if (diff.status !== 0) return { error: (diff.stderr || 'plan: git diff failed').trim() };
  const paths = diff.stdout.split('\n').filter((line) => line !== '');
  if (paths.length > 0 && !isProseAndFramework(paths, readProse(root))) {
    return { ...outcome, note: `plan: code changed since ${short} passed, so this is planned from the whole diff` };
  }
  const stages = { ...outcome.stages };
  for (const stage of CODE_STAGES) stages[stage] = 'skipped';
  return {
    ...outcome,
    stages,
    passed: resolved.stdout.trim(),
    note: `plan: the code passed at ${short}, so the stages are skipped`,
  };
}

function planFromDiff(root, { base, head }) {
  if (base === undefined) return { stages: classify(root, false), reason: FULL_RUN.missingBase };
  if (/^0+$/.test(base)) return { stages: classify(root, false), reason: FULL_RUN.zeroBase };
  const resolved = git(root, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`]);
  if (resolved.status !== 0) {
    return { stages: classify(root, false), reason: FULL_RUN.unresolvedBase };
  }
  const diff = git(root, ['diff', '--name-only', '--no-renames', `${base}...${head}`]);
  if (diff.status !== 0) return { error: (diff.stderr || 'plan: git diff failed').trim() };
  const paths = diff.stdout.split('\n').filter((line) => line !== '');
  if (paths.length === 0) return { stages: classify(root, false), reason: FULL_RUN.emptyDiff };
  return { stages: classify(root, isProseAndFramework(paths, readProse(root))), reason: null };
}

/**
 * Six stage values for the diff `base...head` in `root`. `reason` is the one
 * stderr line when the result is a full run because the base is missing, all
 * zeros, unresolved, or the diff is empty. With `passed` (a commit whose code
 * already passed) the code stages are skipped when only prose and framework
 * files differ from it; `passed` in the result is then its full hash, and
 * `note` says what was decided either way.
 * @param {string} root
 * @param {{ base?: string, head?: string, passed?: string }} [options]
 * @returns {{ stages?: Record<string, string>, reason?: string | null, passed?: string, note?: string, error?: string }}
 */
export function planStages(root, { base, head = 'HEAD', passed } = {}) {
  const outcome = planFromDiff(root, { base, head });
  if (outcome.error || passed === undefined) return outcome;
  return applyPassed(root, outcome, { passed, head });
}

/**
 * Stages that block a deploy: a failure or a cancellation, or a stage that was
 * planned to run and finished as anything other than success. A stage GitHub
 * skipped because an earlier one failed is in that second group.
 * @param {Record<string, string>} plan
 * @param {Record<string, string>} results
 * @returns {string[]}
 */
function stagesThatDidNotPass(plan, results) {
  return BEFORE_DEPLOY.filter((stage) => {
    const result = results[stage];
    if (result === 'failure' || result === 'cancelled') return true;
    return plan[stage] === 'run' && result !== 'success';
  });
}

/**
 * `run`, `held`, `empty` or `skipped`. Held wins over everything. On a pull
 * request, a plan carrying `passed` (the same code already passed, and the
 * branch's environment holds it) skips, as does prose and framework alone; a filled branch slot
 * runs; otherwise the pull request skips. `branch` defaults to `empty`, so
 * a caller that does not know about the slot decides as before. A push
 * ignores the slot and uses the deploy's own planned value.
 * @param {{
 *   plan: Record<string, string>,
 *   results: Record<string, string>,
 *   event: string,
 *   branch?: 'filled' | 'empty',
 * }} input
 * @returns {'run' | 'held' | 'empty' | 'skipped'}
 */
export function gateDecision({ plan, results, event, branch = 'empty' }) {
  if (stagesThatDidNotPass(plan, results).length > 0) return 'held';
  if (event === 'pull_request') {
    if (plan.passed) return 'skipped';
    if (plan.deploy === 'skipped') return 'skipped';
    if (branch === 'filled') return 'run';
    return 'skipped';
  }
  return plan.deploy;
}

function plannedCell(stage, plan, results) {
  const planned = plan[stage];
  if (planned === 'skipped' && plan.passed) {
    return `skipped — the same code passed at \`${plan.passed.slice(0, 7)}\``;
  }
  if (planned === 'skipped') return 'skipped — only prose and framework files changed';
  if (planned === 'empty') return `empty — no pipeline/${stage}.sh`;
  const result = results[stage];
  if (result === 'success') return 'run — passed';
  if (result === 'failure') return 'run — failed';
  if (result === 'cancelled') return 'run — cancelled';
  return 'not run — an earlier stage failed';
}

function deployCell(plan, results, event, branch = 'empty') {
  const decision = gateDecision({ plan, results, event, branch });
  if (decision === 'held') {
    return `held — ${stagesThatDidNotPass(plan, results).join(', ')} did not pass`;
  }
  if (event === 'pull_request') {
    if (plan.passed) {
      return `skipped — the same code passed at \`${plan.passed.slice(0, 7)}\`, and the environment has it`;
    }
    if (plan.deploy === 'skipped') return 'skipped — only prose and framework files changed';
    if (branch === 'filled') return "will run — to the branch's environment";
    return 'skipped — no pipeline/branch/';
  }
  if (plan.deploy === 'empty') return 'empty';
  if (plan.deploy === 'skipped') return 'skipped — only prose and framework files changed';
  return 'will run';
}

/**
 * One Markdown row per stage, deploy included. The second column starts with
 * the phrase for what happened to that stage.
 * @param {{
 *   plan: Record<string, string>,
 *   results: Record<string, string>,
 *   event: string,
 *   branch?: 'filled' | 'empty',
 * }} input
 * @returns {string}
 */
export function summaryTable({ plan, results, event, branch = 'empty' }) {
  const rows = STAGES.map((stage) => {
    const cell = stage === 'deploy'
      ? deployCell(plan, results, event, branch)
      : plannedCell(stage, plan, results);
    return `| ${stage} | ${cell} |`;
  });
  return ['| Stage | Result |', '| --- | --- |', ...rows, ''].join('\n');
}

function parsePlanArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg !== '--base' && arg !== '--head' && arg !== '--passed') return { error: `plan: unknown argument ${arg}` };
    const value = argv[i + 1];
    if (value === undefined) return { error: `plan: ${arg} needs a revision` };
    opts[arg.slice(2)] = value;
    i += 1;
  }
  return { opts };
}

/**
 * Branch names on `origin`, or null when this repository has no origin.
 * False when origin is configured and listing it fails.
 * @param {string} root
 * @returns {string[] | null | false}
 */
function originBranches(root) {
  const remote = git(root, ['remote', 'get-url', 'origin']);
  if (remote.status !== 0) return null;
  const listed = git(root, ['ls-remote', '--heads', 'origin']);
  if (listed.status !== 0) {
    process.stderr.write(`environment: could not list branches on origin\n${listed.stderr ?? ''}`);
    return false;
  }
  const names = [];
  for (const line of listed.stdout.split('\n')) {
    if (line === '') continue;
    const ref = line.slice(line.indexOf('\t') + 1);
    if (ref.startsWith('refs/heads/')) names.push(ref.slice('refs/heads/'.length));
  }
  return names;
}

const BRANCH_ACTIONS = ['create', 'deploy', 'remove'];
const STAGING_SCRIPTS = ['reset.sh', 'deploy.sh'];

/** Every file under dir, as paths relative to it, in sorted order. */
function filesUnder(dir, prefix = '') {
  const found = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...filesUnder(dir, rel));
    else if (entry.isFile()) found.push(rel);
  }
  return found.sort();
}

/**
 * `filled` when `pipeline/staging/` has reset and deploy. `empty` when it has
 * neither. One without the other is an error naming the missing script, the
 * same shape as `branchSlot`. A project still on the layout this replaced is
 * refused rather than read as empty: the old folder, or a script reading the
 * old variable, would otherwise deploy nothing and say nothing.
 * @param {string} root
 * @returns {{ slot?: 'filled' | 'empty', error?: string }}
 */
export function stagingSlot(root) {
  if (existsSync(join(root, 'pipeline', 'candidate'))) {
    return {
      error: 'staging: pipeline/candidate/ is the old name of pipeline/staging/ — run git mv pipeline/candidate pipeline/staging',
    };
  }
  const dir = join(root, 'pipeline', 'staging');
  if (existsSync(dir)) {
    const stale = filesUnder(dir)
      .find((rel) => readFileSync(join(dir, rel), 'utf8').includes('TROPIS_CANDIDATE'));
    if (stale) {
      return { error: `staging: pipeline/staging/${stale} reads TROPIS_CANDIDATE, now TROPIS_STAGING_COMMIT` };
    }
  }
  const missing = STAGING_SCRIPTS.filter((name) => !existsSync(join(dir, name)));
  if (missing.length === STAGING_SCRIPTS.length) return { slot: 'empty' };
  if (missing.length === 0) return { slot: 'filled' };
  return { error: `staging: pipeline/staging/ is missing ${missing.join(', ')}` };
}

/**
 * The summary every deploy to staging writes. `byHand` null means the deploy
 * did not finish, so lines it may have written are left out.
 * @param {{ hash: string, reset: string, deploy: string, byHand: string[] | null }} outcome
 * @returns {string}
 */
export function stagingSummary({ hash, reset, deploy, byHand }) {
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

/**
 * The summary goes to stdout always, where /release reads it from the run's log,
 * and to the summary file too when one is given.
 */
function writeStagingSummary(summary, text) {
  if (summary) appendFileSync(summary, text);
  process.stdout.write(text);
}

function headHash(root) {
  const result = git(root, ['rev-parse', 'HEAD']);
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

const RELEASE_TAG = /^v\d+\.\d+\.\d+$/;

/**
 * Production's version: the highest tag of the form vX.Y.Z by version order. Any other
 * tag, such as v1.1.0-rc.1, is not a release. `''` when there is none, null when git fails.
 */
function highestReleaseTag(root) {
  const listed = git(root, ['tag', '--list', 'v*', '--sort=-v:refname']);
  if (listed.status !== 0) return null;
  return listed.stdout.split('\n').find((line) => RELEASE_TAG.test(line)) ?? '';
}

function byHandLines(text) {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

/**
 * Writes the tag's files into dir. The archive goes through a file, never a spawn
 * buffer: spawnSync's default maxBuffer is 1 MiB, and a real project's tag archives
 * to more than that, which fails with ENOBUFS and no exit status.
 */
function extractTag(root, tag, dir) {
  const tarPath = join(dir, '.tropis-production.tar');
  const archive = spawnSync('git', ['-C', root, 'archive', '-o', tarPath, tag]);
  if ((archive.status ?? 1) !== 0) return false;
  const extracted = spawnSync('tar', ['-xf', tarPath, '-C', dir]);
  rmSync(tarPath, { force: true });
  return (extracted.status ?? 1) === 0;
}

/** Runs reset.sh against the tag's files. The directory is removed either way. */
function stagingReset(root, env, tag) {
  const dir = mkdtempSync(join(tmpdir(), 'tropis-staging-'));
  try {
    if (!extractTag(root, tag, dir)) {
      process.stderr.write('staging: could not read the production tag\n');
      return { status: 1, failed: 'extract' };
    }
    const status = runScript(root, join(root, 'pipeline', 'staging', 'reset.sh'), {
      ...env,
      TROPIS_PRODUCTION_TAG: tag,
      TROPIS_PRODUCTION_DIR: dir,
    });
    return { status };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Runs deploy.sh. By-hand lines count only when it exits 0. */
function stagingDeployScript(root, env) {
  const dir = mkdtempSync(join(tmpdir(), 'tropis-by-hand-'));
  const byHandPath = join(dir, 'by-hand.txt');
  writeFileSync(byHandPath, '');
  try {
    const status = runScript(root, join(root, 'pipeline', 'staging', 'deploy.sh'), {
      ...env,
      TROPIS_BY_HAND: byHandPath,
    });
    const byHand = status === 0 ? byHandLines(readFileSync(byHandPath, 'utf8')) : null;
    return { status, byHand };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function deployToStaging(root, summary) {
  const hash = headHash(root);
  if (!hash) {
    process.stderr.write('staging: the checkout has no commit\n');
    return 1;
  }
  const slot = stagingSlot(root);
  if (slot.error) {
    process.stderr.write(`${slot.error}\n`);
    return 1;
  }
  if (slot.slot === 'empty') {
    process.stdout.write('staging: empty — no pipeline/staging/, so nothing was deployed to staging\n');
    writeStagingSummary(summary, stagingSummary({
      hash,
      reset: 'not run — no pipeline/staging/',
      deploy: 'not run — no pipeline/staging/',
      byHand: null,
    }));
    return 0;
  }
  const env = stageEnv();
  if (!env) return 1;
  env.TROPIS_STAGING_COMMIT = hash;
  const tag = highestReleaseTag(root);
  if (tag === null) {
    process.stderr.write('staging: could not list tags\n');
    return 1;
  }
  let reset = 'not needed — no release yet';
  if (tag !== '') {
    const resetRun = stagingReset(root, env, tag);
    if (resetRun.failed) return resetRun.status;
    if (resetRun.status !== 0) {
      writeStagingSummary(summary, stagingSummary({
        hash,
        reset: `failed — reset.sh exited ${resetRun.status}`,
        deploy: 'not run — reset.sh failed',
        byHand: null,
      }));
      return resetRun.status;
    }
    reset = `to \`${tag}\``;
  }
  const deployRun = stagingDeployScript(root, env);
  writeStagingSummary(summary, stagingSummary({
    hash,
    reset,
    deploy: deployRun.status === 0 ? 'deployed' : `failed — deploy.sh exited ${deployRun.status}`,
    byHand: deployRun.byHand,
  }));
  return deployRun.status;
}

function parseStagingDeployArgs(argv) {
  let summary;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== '--summary') return null;
    summary = argv[i + 1];
    if (summary === undefined) return null;
    i += 1;
  }
  return { summary };
}

function stagingUsage() {
  process.stderr.write('staging: use slot or deploy\n');
  return 2;
}

/** `slot` reports the slot. `deploy` resets, deploys, and writes the summary. */
function stagingCommand(root, sub, rest) {
  if (sub === 'slot') {
    if (rest.length !== 0) return stagingUsage();
    const slot = stagingSlot(root);
    if (slot.error) {
      process.stderr.write(`${slot.error}\n`);
      return 1;
    }
    process.stdout.write(`staging=${slot.slot}\n`);
    return 0;
  }
  if (sub === 'deploy') {
    const parsed = parseStagingDeployArgs(rest);
    if (!parsed) return stagingUsage();
    return deployToStaging(root, parsed.summary);
  }
  return stagingUsage();
}

/**
 * `filled` when `pipeline/branch/` has create, deploy and remove. `empty`
 * when it has none of them. Anything between is an error naming what is
 * missing, so a run fails at plan rather than at a later script.
 * @param {string} root
 * @returns {{ slot?: 'filled' | 'empty', error?: string }}
 */
function branchSlot(root) {
  const missing = BRANCH_ACTIONS
    .map((action) => `${action}.sh`)
    .filter((name) => !existsSync(join(root, 'pipeline', 'branch', name)));
  if (missing.length === BRANCH_ACTIONS.length) return { slot: 'empty' };
  if (missing.length === 0) return { slot: 'filled' };
  return { error: `plan: pipeline/branch/ is missing ${missing.join(', ')}` };
}

/**
 * The environment name, or a status when the branch cannot be named.
 * Create and deploy refuse when another remote branch would get the same
 * name, and the message names both branches. With no origin there is
 * nothing to compare. `message` is omitted when listing origin already
 * wrote the reason.
 * @param {string} root
 * @param {string | undefined} branch
 * @param {{ checkCollision?: boolean }} [options]
 * @returns {{ name?: string, status?: number, message?: string }}
 */
function resolveEnvironment(root, branch, { checkCollision = true } = {}) {
  if (!branch) return { status: 2, message: 'environment: needs a branch\n' };
  let name;
  try {
    name = environmentName(branch);
  } catch (error) {
    return { status: 1, message: `${error.message}\n` };
  }
  if (!checkCollision) return { name };
  const heads = originBranches(root);
  if (heads === false) return { status: 1 };
  if (heads) {
    const collisions = [];
    for (const other of heads) {
      if (other === branch) continue;
      try {
        if (environmentName(other) === name) collisions.push(other);
      } catch {
        // A remote branch of only symbols has no name, so it cannot collide.
      }
    }
    if (collisions.length > 0) {
      const listed = [branch, ...collisions].join(' and ');
      return { status: 1, message: `environment: ${listed} both name ${name}\n` };
    }
  }
  return { name };
}

/**
 * Prints the environment name. `--no-check` skips listing origin, so closing
 * a pull request can still name an environment another branch now shares.
 * Any other argument after the branch exits 2. Exit status is otherwise the
 * resolver's.
 * @param {string} root
 * @param {string[]} args
 * @returns {number}
 */
function environmentCommand(root, args) {
  const [branch, ...rest] = args;
  if (rest.length > 1 || (rest.length === 1 && rest[0] !== '--no-check')) {
    const unknown = rest.find((arg) => arg !== '--no-check') ?? rest[1];
    process.stderr.write(`environment: unknown argument ${unknown}\n`);
    return 2;
  }
  const resolved = resolveEnvironment(root, branch, { checkCollision: rest.length === 0 });
  if (resolved.message) process.stderr.write(resolved.message);
  if (resolved.status) return resolved.status;
  process.stdout.write(`${resolved.name}\n`);
  return 0;
}

/**
 * Six skipped stage lines and the slot, without reading a diff. A partial
 * slot is the same error `plan` already gives.
 * @param {string} root
 * @returns {number}
 */
function closedPlan(root) {
  const slot = branchSlot(root);
  if (slot.error) {
    process.stderr.write(`${slot.error}\n`);
    return 1;
  }
  const stages = {};
  for (const stage of STAGES) stages[stage] = 'skipped';
  writePlan({ stages, branch: slot.slot });
  return 0;
}

const PERMANENT_DEFAULT = Object.freeze(['production', 'staging', 'development']);

/**
 * The refusal for a branch whose environment is permanent, or null. When
 * pipeline/branch/permanent.txt exists its names replace the default list,
 * so a file with no names refuses nothing. A missing or nameless branch is
 * left to resolveEnvironment, which reports it.
 * @param {string} root
 * @param {string | undefined} branch
 * @returns {string | null}
 */
function permanentRefusal(root, branch) {
  if (!branch) return null;
  let name;
  try {
    name = environmentName(branch);
  } catch {
    return null;
  }
  const listPath = join(root, 'pipeline', 'branch', 'permanent.txt');
  const listed = existsSync(listPath);
  const names = listed
    ? readFileSync(listPath, 'utf8')
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line !== '' && !line.startsWith('#'))
    : PERMANENT_DEFAULT;
  if (!names.includes(name)) return null;
  const why = listed
    ? 'listed in pipeline/branch/permanent.txt'
    : 'a default permanent name; list yours in pipeline/branch/permanent.txt';
  return `branch: ${branch} would use the environment ${name}, which is permanent (${why}) — rename the branch.\n`;
}

/**
 * Runs `pipeline/branch/<action>.sh` with the stage environment plus
 * `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH`. Remove does not check for a
 * colliding name: the environment may already exist to be deleted. All three
 * refuse a branch whose environment is permanent, before origin is listed or
 * any script runs. An empty slot prints one line and exits 0.
 * @param {string} root
 * @param {string | undefined} action
 * @param {string | undefined} branch
 * @returns {number}
 */
function branchCommand(root, action, branch) {
  if (!BRANCH_ACTIONS.includes(action)) {
    process.stderr.write('branch: action must be create, deploy or remove\n');
    return 2;
  }
  const slot = branchSlot(root);
  if (slot.error) {
    process.stderr.write(`${slot.error}\n`);
    return 1;
  }
  if (slot.slot === 'empty') {
    process.stdout.write('branch: empty — no pipeline/branch/\n');
    return 0;
  }
  const refusal = permanentRefusal(root, branch);
  if (refusal) {
    process.stderr.write(refusal);
    return 1;
  }
  const resolved = resolveEnvironment(root, branch, { checkCollision: action !== 'remove' });
  if (resolved.message) process.stderr.write(resolved.message);
  if (resolved.status) return resolved.status;
  const env = stageEnv();
  if (!env) return 1;
  env.TROPIS_ENVIRONMENT = resolved.name;
  env.TROPIS_BRANCH = branch;
  return runScript(root, join(root, 'pipeline', 'branch', `${action}.sh`), env);
}

function projectRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

/**
 * Environment for a stage. A JSON object in `TROPIS_SECRETS` supplies
 * variables the stage does not already have. The payload itself is never
 * passed on, and nothing here writes it.
 * @returns {NodeJS.ProcessEnv | null}
 */
function stageEnv() {
  const env = { ...process.env };
  const raw = env.TROPIS_SECRETS;
  delete env.TROPIS_SECRETS;
  if (raw === undefined) return env;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    process.stderr.write('pipeline: TROPIS_SECRETS is not a JSON object\n');
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    process.stderr.write('pipeline: TROPIS_SECRETS is not a JSON object\n');
    return null;
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'TROPIS_SECRETS' || env[key] !== undefined || value == null) continue;
    env[key] = String(value);
  }
  return env;
}

function runScript(root, script, env) {
  const ran = spawnSync('bash', [script], { cwd: root, env, stdio: 'inherit' });
  return ran.status ?? 1;
}

/** Exit status of one stage, run from the project root. */
function runCommand(root, stage) {
  if (!STAGES.includes(stage)) {
    process.stderr.write(`pipeline: unknown stage ${stage ?? ''}. Stages: ${STAGES.join(', ')}\n`);
    return 2;
  }
  const env = stageEnv();
  if (!env) return 1;
  const script = join(root, 'pipeline', `${stage}.sh`);
  if (stage === 'framework') {
    const tests = spawnSync('npm', ['--prefix', '.tropis', 'test'], { cwd: root, env, stdio: 'inherit' });
    if ((tests.status ?? 1) !== 0) return tests.status ?? 1;
    if (!existsSync(script)) return 0;
    return runScript(root, script, env);
  }
  if (!existsSync(script)) {
    process.stdout.write(`${stage}: empty — no pipeline/${stage}.sh\n`);
    return 0;
  }
  return runScript(root, script, env);
}

function parseGateArgs(argv) {
  let event;
  let summary;
  let branch = 'empty';
  let planFromStdin = false;
  const results = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--plan') {
      if (argv[i + 1] !== '-') return { error: 'gate: --plan reads the plan from stdin' };
      planFromStdin = true;
      i += 1;
    } else if (arg === '--event') {
      event = argv[i + 1];
      if (event === undefined) return { error: 'gate: --event needs push or pull_request' };
      i += 1;
    } else if (arg === '--branch') {
      branch = argv[i + 1];
      if (branch !== 'filled' && branch !== 'empty') return { error: 'gate: --branch needs filled or empty' };
      i += 1;
    } else if (arg === '--summary') {
      summary = argv[i + 1];
      if (summary === undefined) return { error: 'gate: --summary needs a file' };
      i += 1;
    } else {
      const eq = arg.indexOf('=');
      if (eq === -1) return { error: `gate: unknown argument ${arg}` };
      results[arg.slice(0, eq)] = arg.slice(eq + 1);
    }
  }
  if (!planFromStdin) return { error: 'gate: --plan - is required' };
  if (!event) return { error: 'gate: --event is required' };
  for (const stage of BEFORE_DEPLOY) {
    if (results[stage] === undefined) return { error: `gate: missing result for ${stage}` };
  }
  return { event, summary, results, branch };
}

function readPlan(text) {
  const plan = {};
  for (const line of text.split('\n')) {
    if (line === '') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    plan[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return plan;
}

/**
 * One stdout line, and the summary table appended to a file or written to
 * stderr. Exits 1 when it holds the deploy, so the gate job is the run's
 * required check: green means the run passed. A plan missing any stage means
 * the plan job did not finish; that is said on stderr and in the summary, no
 * `deploy=` line is printed, and it exits 1.
 */
function gateCommand({ event, summary, results, branch }) {
  const plan = readPlan(readFileSync(0, 'utf8'));
  if (STAGES.some((stage) => plan[stage] === undefined)) {
    const line = 'gate: no plan — the plan job did not finish, so this run cannot pass.\n';
    process.stderr.write(line);
    if (summary) appendFileSync(summary, line);
    return 1;
  }
  const decision = gateDecision({ plan, results, event, branch });
  const table = summaryTable({ plan, results, event, branch });
  if (summary) appendFileSync(summary, table);
  else process.stderr.write(table);
  process.stdout.write(`deploy=${decision}\n`);
  return decision === 'held' ? 1 : 0;
}

const HOST_OUTSIDE_ACTIONS =
  'host: whether the main branch is gated is read from GitHub, in the pipeline; nothing to check here.';

/**
 * Why the project's main branch is not gated, from `ungated` in
 * `.tropis/project.json`. A missing, unreadable or non-object file, or no key,
 * is no reason. A key that is not a string with words in it is an error.
 * @returns {{ reason: string | null } | { error: string }}
 */
export function ungatedReason(root) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(join(root, '.tropis', 'project.json'), 'utf8'));
  } catch {
    return { reason: null };
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc) || !('ungated' in doc)) {
    return { reason: null };
  }
  if (typeof doc.ungated !== 'string' || doc.ungated.trim() === '') {
    return { error: 'host: "ungated" in .tropis/project.json must say why the main branch is not gated, in words.' };
  }
  return { reason: doc.ungated.trim() };
}

/**
 * What keeps the default branch from being gated, in order. Any required check
 * counts, whatever its name, so a renamed job is not punished.
 * @param {{ allow_auto_merge?: unknown }} repository GitHub's answer for the repository
 * A repository answer with no allow_auto_merge is not a gap: GitHub leaves it out
 * for the pipeline's token.
 * @param {Array<{ type?: string }>} rules GitHub's active rules for the default branch
 * @returns {string[]}
 */
export function gateGaps(repository, rules) {
  const types = new Set(rules.map((rule) => rule && rule.type));
  const gaps = [];
  if (!types.has('pull_request')) gaps.push('no pull request is required');
  if (!types.has('required_status_checks')) gaps.push('no check is required');
  if (repository.allow_auto_merge === false) gaps.push('auto-merge is not allowed');
  return gaps;
}

function parseHostArgs(argv) {
  if (argv.length === 0) return {};
  if (argv.length === 2 && argv[0] === '--summary' && argv[1] !== '') return { summary: argv[1] };
  return { error: 'host: the only argument is --summary <file>' };
}

function askGitHub(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  const failure = (why) => ({ error: `could not ask GitHub (gh ${args.join(' ')}): ${why}` });
  if (result.error) return failure(result.error.message);
  if (result.status !== 0) {
    const line = (result.stderr || '').split('\n').map((l) => l.trim()).find((l) => l !== '');
    return failure(line || `gh exited ${result.status}`);
  }
  try {
    return { value: JSON.parse(result.stdout) };
  } catch (error) {
    return failure(error.message);
  }
}

function readHost(repo) {
  const answer = askGitHub(['api', `repos/${repo}`]);
  if (answer.error) return answer;
  const repository = answer.value;
  if (repository === null || typeof repository !== 'object' || typeof repository.default_branch !== 'string') {
    return { error: `could not ask GitHub (gh api repos/${repo}): the answer has no default_branch` };
  }
  const branch = repository.default_branch;
  const rulesArgs = ['api', `repos/${repo}/rules/branches/${encodeURIComponent(branch)}?per_page=100`];
  const rules = askGitHub(rulesArgs);
  if (rules.error) return { branch, error: rules.error };
  if (!Array.isArray(rules.value)) {
    return { branch, error: `could not ask GitHub (gh ${rulesArgs.join(' ')}): the answer is not a list of rules` };
  }
  return {
    branch,
    gaps: gateGaps(repository, rules.value),
    autoMergeKnown: typeof repository.allow_auto_merge === 'boolean',
  };
}

function notGatedText(repo, branch, gaps) {
  const subject = branch ? `the main branch ${branch}` : 'the main branch';
  return [
    `host: ${subject} is not gated: ${gaps.join('; ')}.`,
    'Only rulesets are read: a classic branch protection rule does not count.',
    'If your plan allows it (a public repository, or a private one on GitHub Pro, Team or Enterprise), apply the ruleset Tropis ships:',
    `  gh api repos/${repo}/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json`,
    'and turn on Settings → General → Pull Requests → Allow auto-merge.',
    'Otherwise record why in .tropis/project.json, as "ungated": "<the reason>".',
    '',
  ].join('\n');
}

/**
 * Whether the default branch is gated by GitHub, or the project has said why
 * not. Fails until the branch requires a pull request and a check and GitHub
 * does not say auto-merge is off, or `.tropis/project.json` records `ungated`.
 */
function hostCommand(root, { summary }) {
  const recorded = ungatedReason(root);
  if (recorded.error) {
    process.stderr.write(`${recorded.error}\n`);
    return 1;
  }
  if (recorded.reason !== null) {
    process.stdout.write(`host: the main branch is not gated — ${recorded.reason} (.tropis/project.json)\n`);
    if (summary) {
      appendFileSync(summary, `**The main branch is not gated.** ${recorded.reason} — recorded in .tropis/project.json.\n`);
    }
    return 0;
  }
  const repo = process.env.GITHUB_REPOSITORY || '';
  if (repo === '') {
    process.stderr.write('host: GITHUB_REPOSITORY is not set\n');
    return 1;
  }
  const answer = readHost(repo);
  const gaps = answer.error ? [answer.error] : answer.gaps;
  if (gaps.length === 0) {
    const line = answer.autoMergeKnown
      ? `host: ${answer.branch} requires a pull request and a passing check, and auto-merge is allowed.\n`
      : `host: ${answer.branch} requires a pull request and a passing check. GitHub does not tell the pipeline whether auto-merge is allowed, so that is not checked.\n`;
    process.stdout.write(line);
    if (summary) appendFileSync(summary, line);
    return 0;
  }
  const text = notGatedText(repo, answer.branch, gaps);
  process.stderr.write(text);
  if (summary) appendFileSync(summary, text);
  return 1;
}

const FULL_HASH = /^[0-9a-f]{40}$/;
const PROMOTE_USAGE = 'promote: use check <commit> [--staged <commit>] [--allow <path>]...';

function parsePromoteArgs(argv) {
  if (argv[0] !== 'check' || argv[1] === undefined || argv[1].startsWith('--')) return null;
  const parsed = { commit: argv[1], staged: undefined, allow: [] };
  for (let i = 2; i < argv.length; i += 2) {
    const value = argv[i + 1];
    if (value === undefined) return null;
    if (argv[i] === '--staged') parsed.staged = value;
    else if (argv[i] === '--allow') parsed.allow.push(value);
    else return null;
  }
  return parsed;
}

function isCommit(root, hash) {
  return git(root, ['cat-file', '-e', `${hash}^{commit}`]).status === 0;
}

/** True when `ancestor` is `descendant` or one of its ancestors; null when git fails. */
function contains(root, descendant, ancestor) {
  const result = git(root, ['merge-base', '--is-ancestor', ancestor, descendant]);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return null;
}

/**
 * The refusal the promote pipeline runs before it tags, so it is the same in
 * every project: `commit` must be on the main branch (an ancestor of `HEAD`,
 * which is a checkout of it), and where the project deploys to staging, must
 * contain the staged commit and differ from it only in the allowed files.
 * Returns the line to print and the exit status.
 * @param {string} root
 * @param {{ commit: string, staged?: string, allow: string[] }} args
 * @returns {{ status: number, line: string }}
 */
export function promoteCheck(root, { commit, staged, allow }) {
  const refuse = (line) => ({ status: 1, line: `promote: ${line}` });
  for (const hash of [commit, staged]) {
    if (hash !== undefined && !FULL_HASH.test(hash)) return refuse(`"${hash}" is not a full commit hash`);
  }
  for (const hash of [commit, staged]) {
    if (hash !== undefined && !isCommit(root, hash)) return refuse(`${hash} is not a commit here`);
  }
  const onMain = contains(root, 'HEAD', commit);
  if (onMain === null) return refuse('could not compare with HEAD');
  if (!onMain) return refuse(`${commit} is not on the main branch — tag only a commit main holds`);
  if (staged === undefined) {
    const slot = stagingSlot(root);
    if (slot.error) return { status: 1, line: slot.error };
    if (slot.slot === 'filled') {
      return refuse('this project deploys to staging — give --staged <the commit staging was checked on>');
    }
    return { status: 0, line: `promote: ${commit} may be tagged` };
  }
  const holdsStaged = contains(root, commit, staged);
  if (holdsStaged === null) return refuse('could not compare the commit with the staged commit');
  if (!holdsStaged) return refuse(`${commit} does not contain the staged commit ${staged}`);
  const diff = git(root, ['diff', '--name-only', '--no-renames', staged, commit]);
  if (diff.status !== 0) return refuse('could not list what changed since staging');
  const changed = diff.stdout.split('\n').filter((path) => path !== '' && !allow.includes(path));
  if (changed.length > 0) {
    return refuse(`${changed.join(', ')} changed since staging was checked — deploy ${commit} to staging first`);
  }
  return { status: 0, line: `promote: ${commit} may be tagged` };
}

function promoteCommand(root, args) {
  const parsed = parsePromoteArgs(args);
  if (!parsed) {
    process.stderr.write(`${PROMOTE_USAGE}\n`);
    return 2;
  }
  const outcome = promoteCheck(root, parsed);
  if (outcome.status === 0) process.stdout.write(`${outcome.line}\n`);
  else process.stderr.write(`${outcome.line}\n`);
  return outcome.status;
}

/**
 * Whether a run's jobs show a green gate: a job named `gate`, or ending in
 * `/ gate` (a called workflow's jobs are named `<caller job> / <job>`), that
 * concluded `success`. The run's own conclusion is not used: a closed pull
 * request's run is `success` with every stage skipped.
 * @param {{ name?: string, conclusion?: string }[]} jobs
 * @returns {boolean}
 */
export function gateIsGreen(jobs) {
  return jobs.some((job) => (job.name === 'gate' || String(job.name).endsWith('/ gate'))
    && job.conclusion === 'success');
}

/** Runs whose head commit came from `repository` (owner/name). */
export function runsFromRepository(runs, repository) {
  return runs.filter((run) => run.head_repository?.full_name === repository);
}

/**
 * The first run, newest first, with a green gate. `jobsOf(run)` returns
 * `{ jobs }` or `{ error }`; an error ends the search.
 * @returns {{ run?: object, error?: string }}
 */
export function firstGreenRun(runs, jobsOf) {
  for (const run of runs) {
    const answer = jobsOf(run);
    if (answer.error) return { error: answer.error };
    if (gateIsGreen(answer.jobs)) return { run };
  }
  return {};
}

const PASSED_USAGE = 'passed: use --branch <ref> --repository <owner/name>, or --merged <commit>';

function parsePassedArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (!['--branch', '--repository', '--merged', '--summary'].includes(arg)
      || value === undefined || value === '') return { error: PASSED_USAGE };
    opts[arg.slice(2)] = value;
  }
  const byBranch = opts.branch !== undefined && opts.repository !== undefined && opts.merged === undefined;
  const byMerge = opts.merged !== undefined && opts.branch === undefined && opts.repository === undefined;
  if (!byBranch && !byMerge) return { error: PASSED_USAGE };
  return { opts };
}

/**
 * Asks GitHub for a commit whose code passed this workflow, for a pull
 * request branch or for the commit a pull request merged as. Never throws:
 * `{ commit }` or `{ line }` only, and `line` always says what was found or
 * why nothing was.
 */
function findPassed(opts, env) {
  const nothing = (why) => ({ line: `passed: ${why}` });
  const failed = (error) => nothing(`${error}; nothing is skipped`);
  const repo = env.GITHUB_REPOSITORY;
  if (env.GITHUB_ACTIONS !== 'true') return nothing('not in GitHub Actions, so nothing is skipped');
  if (!repo) return nothing('GITHUB_REPOSITORY is not set; nothing is skipped');
  if (!env.GITHUB_RUN_ID) return nothing('GITHUB_RUN_ID is not set; nothing is skipped');
  const own = askGitHub(['api', `repos/${repo}/actions/runs/${env.GITHUB_RUN_ID}`]);
  if (own.error) return failed(own.error);
  const workflow = own.value?.workflow_id;
  if (workflow === undefined) return failed('this run has no workflow_id');
  const listRuns = (query) => {
    const answer = askGitHub(['api', `repos/${repo}/actions/workflows/${workflow}/runs?event=pull_request&${query}&per_page=10`]);
    if (answer.error) return answer;
    if (!Array.isArray(answer.value?.workflow_runs)) return { error: 'the list of runs had an unexpected shape' };
    return { runs: answer.value.workflow_runs };
  };
  const jobsOf = (run) => {
    const answer = askGitHub(['api', `repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`]);
    if (answer.error) return answer;
    if (!Array.isArray(answer.value?.jobs)) return { error: 'the list of jobs had an unexpected shape' };
    return { jobs: answer.value.jobs };
  };
  const short = (hash) => String(hash).slice(0, 7);

  if (opts.merged === undefined) {
    const listed = listRuns(`branch=${encodeURIComponent(opts.branch)}`);
    if (listed.error) return failed(listed.error);
    const found = firstGreenRun(runsFromRepository(listed.runs, opts.repository), jobsOf);
    if (found.error) return failed(found.error);
    if (!found.run) return nothing('no green run of this pull request, so it is planned from the whole diff');
    return { commit: found.run.head_sha, line: `passed: run ${found.run.id} passed at ${short(found.run.head_sha)}` };
  }

  const pulls = askGitHub(['api', `repos/${repo}/commits/${opts.merged}/pulls`]);
  if (pulls.error) return failed(pulls.error);
  if (!Array.isArray(pulls.value)) return failed('the list of pull requests had an unexpected shape');
  const pull = pulls.value.find((candidate) => candidate.merge_commit_sha === opts.merged);
  if (!pull) return nothing(`${short(opts.merged)} was not merged from a pull request, so every stage runs`);
  const head = pull.head?.sha;
  if (!head) return failed('the pull request has no head commit');
  const listed = listRuns(`head_sha=${encodeURIComponent(head)}`);
  if (listed.error) return failed(listed.error);
  const found = firstGreenRun(listed.runs, jobsOf);
  if (found.error) return failed(found.error);
  if (!found.run) return nothing(`pull request #${pull.number} has no green run at ${short(head)}, so every stage runs`);
  return { commit: head, line: `passed: pull request #${pull.number} passed at ${short(head)}` };
}

function passedCommand(argv) {
  const parsed = parsePassedArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n`);
    return 2;
  }
  const result = findPassed(parsed.opts, process.env);
  process.stderr.write(`${result.line}\n`);
  if (parsed.opts.summary) appendFileSync(parsed.opts.summary, `${result.line}\n\n`);
  if (result.commit) process.stdout.write(`${result.commit}\n`);
  return 0;
}

/** Commands for a host that has no wiring file, each with when to run it. */
function commandList() {
  const lines = [
    '# Always. Prints whether each stage runs, is empty, or is skipped. --passed "$PASSED" when the next command printed a commit.',
    'node .tropis/scripts/pipeline.mjs plan --base "$BASE" --head "$HEAD"',
    '# On a push to a pull request, or to the main branch. Prints a commit whose code passed, or nothing.',
    'node .tropis/scripts/pipeline.mjs passed --branch "$HEAD_REF" --repository "$HEAD_REPO" --summary "$SUMMARY"',
    'node .tropis/scripts/pipeline.mjs passed --merged "$COMMIT" --summary "$SUMMARY"',
    '# Always, before the framework stage.',
    'npm --prefix .tropis ci',
    '# Always. Framework checks run even when the rest of the plan is skipped.',
    'node .tropis/scripts/pipeline.mjs run framework',
  ];
  for (const stage of STAGES) {
    if (stage === 'framework' || stage === 'deploy') continue;
    lines.push(`# When the plan says ${stage}=run.`, `node .tropis/scripts/pipeline.mjs run ${stage}`);
  }
  lines.push(
    '# After the five stages. Reads the plan on stdin, one result per stage, and whether the slot is filled.',
    'node .tropis/scripts/pipeline.mjs gate --plan - --event "$EVENT" --branch "$SLOT" '
      + 'framework="$FRAMEWORK" sanity="$SANITY" unit="$UNIT" '
      + 'integration="$INTEGRATION" end-to-end="$END_TO_END"',
    '# When the gate prints deploy=run on a push. That deploys the shared environment.',
    'node .tropis/scripts/pipeline.mjs run deploy',
    '# When a pull request opens or reopens and the plan says branch=filled.',
    'node .tropis/scripts/pipeline.mjs branch create "$BRANCH"',
    '# When the gate prints deploy=run for a pull request.',
    'node .tropis/scripts/pipeline.mjs branch deploy "$BRANCH"',
    '# When a pull request closes and the plan says branch=filled.',
    'node .tropis/scripts/pipeline.mjs branch remove "$BRANCH"',
    '# Deploy to staging. Started by hand for one commit on the main branch, never on a push.',
    '# Every stage first, as on a push with nothing skipped; then:',
    'node .tropis/scripts/pipeline.mjs staging deploy',
    '# Promote to production: the project\'s own pipeline runs this before it tags <commit>.',
    'node .tropis/scripts/pipeline.mjs promote check "$COMMIT" --staged "$STAGED" --allow <notes file> --allow <each version file>',
  );
  return `${lines.join('\n')}\n`;
}

function writePlan(outcome) {
  if (outcome.error) {
    process.stderr.write(`${outcome.error}\n`);
    process.exitCode = 1;
    return;
  }
  if (outcome.reason) process.stderr.write(`${outcome.reason}\n`);
  if (outcome.note) process.stderr.write(`${outcome.note}\n`);
  const lines = STAGES.map((stage) => `${stage}=${outcome.stages[stage]}`);
  if (outcome.passed) lines.push(`passed=${outcome.passed}`);
  if (outcome.branch) lines.push(`branch=${outcome.branch}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

const ranDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (ranDirectly) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'stages') {
    process.stdout.write(`${STAGES.join('\n')}\n`);
  } else if (command === 'plan') {
    if (args[0] === '--closed') {
      if (args.length !== 1) {
        process.stderr.write('plan: --closed takes no other arguments\n');
        process.exitCode = 2;
      } else {
        const root = projectRoot();
        if (!root) {
          process.stderr.write('pipeline: not a git repository\n');
          process.exitCode = 1;
        } else {
          process.exitCode = closedPlan(root);
        }
      }
    } else {
      const parsed = parsePlanArgs(args);
      if (parsed.error) {
        process.stderr.write(`${parsed.error}\n`);
        process.exitCode = 2;
      } else {
        const root = projectRoot();
        if (!root) {
          process.stderr.write('pipeline: not a git repository\n');
          process.exitCode = 1;
        } else {
          const slot = branchSlot(root);
          if (slot.error) {
            process.stderr.write(`${slot.error}\n`);
            process.exitCode = 1;
          } else {
            const outcome = planStages(root, parsed.opts);
            outcome.branch = slot.slot;
            writePlan(outcome);
          }
        }
      }
    }
  } else if (command === 'run') {
    const found = projectRoot();
    if (!found) {
      process.stderr.write('pipeline: not a git repository\n');
      process.exitCode = 1;
    } else {
      process.exitCode = runCommand(found, args[0]);
    }
  } else if (command === 'gate') {
    const parsed = parseGateArgs(args);
    if (parsed.error) {
      process.stderr.write(`${parsed.error}\n`);
      process.exitCode = 2;
    } else {
      process.exitCode = gateCommand(parsed);
    }
  } else if (command === 'branch') {
    const root = projectRoot();
    if (!root) {
      process.stderr.write('pipeline: not a git repository\n');
      process.exitCode = 1;
    } else {
      process.exitCode = branchCommand(root, args[0], args[1]);
    }
  } else if (command === 'environment') {
    const root = projectRoot();
    if (!root) {
      process.stderr.write('pipeline: not a git repository\n');
      process.exitCode = 1;
    } else {
      process.exitCode = environmentCommand(root, args);
    }
  } else if (command === 'host') {
    const parsed = parseHostArgs(args);
    if (parsed.error) {
      process.stderr.write(`${parsed.error}\n`);
      process.exitCode = 2;
    } else if (process.env.GITHUB_ACTIONS !== 'true') {
      process.stdout.write(`${HOST_OUTSIDE_ACTIONS}\n`);
    } else {
      const root = projectRoot();
      if (!root) {
        process.stderr.write('pipeline: not a git repository\n');
        process.exitCode = 1;
      } else {
        process.exitCode = hostCommand(root, parsed);
      }
    }
  } else if (command === 'passed') {
    process.exitCode = passedCommand(args);
  } else if (command === 'commands') {
    process.stdout.write(commandList());
  } else if (command === 'staging') {
    const root = projectRoot();
    if (!root) {
      process.stderr.write('pipeline: not a git repository\n');
      process.exitCode = 1;
    } else {
      process.exitCode = stagingCommand(root, args[0], args.slice(1));
    }
  } else if (command === 'promote') {
    const root = projectRoot();
    if (!root) {
      process.stderr.write('pipeline: not a git repository\n');
      process.exitCode = 1;
    } else {
      process.exitCode = promoteCommand(root, args);
    }
  } else {
    process.stderr.write('pipeline: unknown command\n');
    process.exitCode = 2;
  }
}
