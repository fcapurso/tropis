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
import { appendFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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

/**
 * Six stage values for the diff `base...head` in `root`. `reason` is the one
 * stderr line when the result is a full run because the base is missing, all
 * zeros, unresolved, or the diff is empty.
 * @param {string} root
 * @param {{ base?: string, head?: string }} [options]
 * @returns {{ stages?: Record<string, string>, reason?: string | null, error?: string }}
 */
export function planStages(root, { base, head = 'HEAD' } = {}) {
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
  const prosePath = join(root, 'pipeline', 'prose.txt');
  const proseText = existsSync(prosePath) ? readFileSync(prosePath, 'utf8') : null;
  return { stages: classify(root, isProseAndFramework(paths, proseText)), reason: null };
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
 * request, prose and framework alone stays skipped; a filled branch slot
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
    if (plan.deploy === 'skipped') return 'skipped';
    if (branch === 'filled') return 'run';
    return 'skipped';
  }
  return plan.deploy;
}

function plannedCell(stage, plan, results) {
  const planned = plan[stage];
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
    if (arg !== '--base' && arg !== '--head') return { error: `plan: unknown argument ${arg}` };
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
const CANDIDATE_SCRIPTS = ['reset.sh', 'deploy.sh'];

/**
 * `filled` when `pipeline/candidate/` has reset and deploy. `empty` when
 * it has neither. One without the other is an error naming the missing
 * script, the same shape as `branchSlot`.
 * @param {string} root
 * @returns {{ slot?: 'filled' | 'empty', error?: string }}
 */
export function candidateSlot(root) {
  const missing = CANDIDATE_SCRIPTS
    .filter((name) => !existsSync(join(root, 'pipeline', 'candidate', name)));
  if (missing.length === CANDIDATE_SCRIPTS.length) return { slot: 'empty' };
  if (missing.length === 0) return { slot: 'filled' };
  return { error: `candidate: pipeline/candidate/ is missing ${missing.join(', ')}` };
}

/**
 * The summary every rehearse writes. `byHand` null means the deploy did not
 * finish, so lines it may have written are left out.
 * @param {{ hash: string, reset: string, deploy: string, byHand: string[] | null }} outcome
 * @returns {string}
 */
export function candidateSummary({ hash, reset, deploy, byHand }) {
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

function writeCandidateSummary(summary, text) {
  if (summary) appendFileSync(summary, text);
  else process.stderr.write(text);
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
function rehearseReset(root, env, tag) {
  const dir = mkdtempSync(join(tmpdir(), 'tropis-candidate-'));
  try {
    if (!extractTag(root, tag, dir)) {
      process.stderr.write('candidate: could not read the production tag\n');
      return { status: 1, failed: 'extract' };
    }
    const status = runScript(root, join(root, 'pipeline', 'candidate', 'reset.sh'), {
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
function rehearseDeploy(root, env) {
  const dir = mkdtempSync(join(tmpdir(), 'tropis-by-hand-'));
  const byHandPath = join(dir, 'by-hand.txt');
  writeFileSync(byHandPath, '');
  try {
    const status = runScript(root, join(root, 'pipeline', 'candidate', 'deploy.sh'), {
      ...env,
      TROPIS_BY_HAND: byHandPath,
    });
    const byHand = status === 0 ? byHandLines(readFileSync(byHandPath, 'utf8')) : null;
    return { status, byHand };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function rehearse(root, summary) {
  const hash = headHash(root);
  if (!hash) {
    process.stderr.write('candidate: the checkout has no commit\n');
    return 1;
  }
  const slot = candidateSlot(root);
  if (slot.error) {
    process.stderr.write(`${slot.error}\n`);
    return 1;
  }
  if (slot.slot === 'empty') {
    process.stdout.write('candidate: empty — no pipeline/candidate/, so no candidate was rehearsed\n');
    writeCandidateSummary(summary, candidateSummary({
      hash,
      reset: 'not run — no pipeline/candidate/',
      deploy: 'not run — no pipeline/candidate/',
      byHand: null,
    }));
    return 0;
  }
  const env = stageEnv();
  if (!env) return 1;
  env.TROPIS_CANDIDATE = hash;
  const tag = highestReleaseTag(root);
  if (tag === null) {
    process.stderr.write('candidate: could not list tags\n');
    return 1;
  }
  let reset = 'not needed — no release yet';
  if (tag !== '') {
    const resetRun = rehearseReset(root, env, tag);
    if (resetRun.failed) return resetRun.status;
    if (resetRun.status !== 0) {
      writeCandidateSummary(summary, candidateSummary({
        hash,
        reset: `failed — reset.sh exited ${resetRun.status}`,
        deploy: 'not run — reset.sh failed',
        byHand: null,
      }));
      return resetRun.status;
    }
    reset = `to \`${tag}\``;
  }
  const deployRun = rehearseDeploy(root, env);
  writeCandidateSummary(summary, candidateSummary({
    hash,
    reset,
    deploy: deployRun.status === 0 ? 'deployed' : `failed — deploy.sh exited ${deployRun.status}`,
    byHand: deployRun.byHand,
  }));
  return deployRun.status;
}

function parseRehearseArgs(argv) {
  let summary;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== '--summary') return null;
    summary = argv[i + 1];
    if (summary === undefined) return null;
    i += 1;
  }
  return { summary };
}

function candidateUsage() {
  process.stderr.write('candidate: use slot or rehearse\n');
  return 2;
}

/** `slot` reports the slot. `rehearse` resets, deploys, and writes the summary. */
function candidateCommand(root, sub, rest) {
  if (sub === 'slot') {
    if (rest.length !== 0) return candidateUsage();
    const slot = candidateSlot(root);
    if (slot.error) {
      process.stderr.write(`${slot.error}\n`);
      return 1;
    }
    process.stdout.write(`candidate=${slot.slot}\n`);
    return 0;
  }
  if (sub === 'rehearse') {
    const parsed = parseRehearseArgs(rest);
    if (!parsed) return candidateUsage();
    return rehearse(root, parsed.summary);
  }
  return candidateUsage();
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

/**
 * Runs `pipeline/branch/<action>.sh` with the stage environment plus
 * `TROPIS_ENVIRONMENT` and `TROPIS_BRANCH`. Remove does not check for a
 * colliding name: the environment may already exist to be deleted. An
 * empty slot prints one line and exits 0.
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

/** One stdout line, and the summary table appended to a file or written to stderr. Exit 0. */
function gateCommand({ event, summary, results, branch }) {
  const plan = readPlan(readFileSync(0, 'utf8'));
  const decision = gateDecision({ plan, results, event, branch });
  const table = summaryTable({ plan, results, event, branch });
  if (summary) appendFileSync(summary, table);
  else process.stderr.write(table);
  process.stdout.write(`deploy=${decision}\n`);
  return 0;
}

/** Commands for a host that has no wiring file, each with when to run it. */
function commandList() {
  const lines = [
    '# Always. Prints whether each stage runs, is empty, or is skipped.',
    'node .tropis/scripts/pipeline.mjs plan --base "$BASE" --head "$HEAD"',
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
    '# Release candidate. Started by hand for one commit on the main branch, never on a push.',
    '# Every stage first, as on a push with nothing skipped; then:',
    'node .tropis/scripts/pipeline.mjs candidate rehearse',
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
  const lines = STAGES.map((stage) => `${stage}=${outcome.stages[stage]}`);
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
  } else if (command === 'commands') {
    process.stdout.write(commandList());
  } else if (command === 'candidate') {
    const root = projectRoot();
    if (!root) {
      process.stderr.write('pipeline: not a git repository\n');
      process.exitCode = 1;
    } else {
      process.exitCode = candidateCommand(root, args[0], args.slice(1));
    }
  } else {
    process.stderr.write('pipeline: unknown command\n');
    process.exitCode = 2;
  }
}
