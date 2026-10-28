// Shared machinery: no part of this file is project-owned.
/**
 * Tells a set-up project whether taking this checkout's release is safe.
 *
 * Run from a Tropis checkout that sits exactly on a release tag, never from a project:
 * `node scripts/check-version.mjs <project-root> [--from <version>]`.
 * The tag is the target version. This file is not installed into projects.
 *
 * It takes the release in a scratch clone, with `takeVersion`, then runs the project's
 * checks there. It writes nothing in the project. Exit 0 with a verdict on stdout
 * (including nothing to take), or exit 1 with one `check-version:` line on stderr.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync,
  symlinkSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './installed-files.js';
import { Refusal, takeVersion } from './take-version.mjs';

const tropis = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK_PATH = /\.tropis\/[^\s"'`;|&)]+/g;

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
}

const git = (cwd, ...args) => run('git', ['-C', cwd, ...args]);

function parseArgs(argv) {
  let project = null;
  let from = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from') {
      from = argv[i + 1];
      i += 1;
      if (from === undefined) return { error: '--from needs a version: --from vX.Y.Z.' };
    } else if (arg.startsWith('--')) return { error: `unknown option ${arg}.` };
    else if (project === null) project = arg;
    else return { error: `unexpected argument ${arg}.` };
  }
  if (project === null) {
    return { error: 'usage: node scripts/check-version.mjs <project-root> [--from <version>]' };
  }
  return { project: resolve(project), from };
}

function isGitRoot(project) {
  const top = git(project, 'rev-parse', '--show-toplevel');
  if (top.status !== 0) return false;
  try {
    return realpathSync(top.stdout.trim()) === realpathSync(project);
  } catch {
    return false;
  }
}

function tail(text, n = 15) {
  const lines = String(text ?? '').replace(/\s+$/, '').split('\n');
  return lines.slice(-n);
}

function readAreas(root) {
  try {
    return JSON.parse(readFileSync(join(root, '.claude/rule-areas.json'), 'utf8'));
  } catch {
    return null;
  }
}

function areasLabel(name, areas) {
  if (!areas || !Object.prototype.hasOwnProperty.call(areas, name)) return 'its own paths header';
  const value = areas[name];
  return Array.isArray(value) ? value.join(', ') : JSON.stringify(value);
}

function ruleNames(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3)).sort();
}

/** Additions to a rule the target does not ship. Committed in the clone so the take can run. */
function dropStaleAdditions(clone, target) {
  const listed = git(tropis, 'ls-tree', '--name-only', target, 'rules/');
  if (listed.status !== 0) return { error: listed.stderr.trim() };
  const shipped = new Set(
    listed.stdout.split('\n').filter((line) => line.endsWith('.md')).map((line) => basename(line, '.md')),
  );
  const dir = join(clone, '.claude/rule-additions');
  if (!existsSync(dir)) return { dropped: [] };
  const dropped = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const path = join(dir, file);
    if (!statSync(path).isFile()) continue;
    const name = file.slice(0, -'.md'.length);
    if (shipped.has(name)) continue;
    unlinkSync(path);
    dropped.push(name);
  }
  if (dropped.length === 0) return { dropped };
  git(clone, 'add', '-A', '--', '.claude/rule-additions');
  const commit = run('git', [
    '-C', clone,
    '-c', 'user.name=check-version',
    '-c', 'user.email=check-version@localhost',
    'commit', '-qm', 'drop additions to rules the release does not ship',
  ]);
  if (commit.status !== 0) return { error: (commit.stderr || commit.stdout).trim() };
  return { dropped };
}

function dependencyLink(project, clone) {
  const folder = '.tropis';
  if (!existsSync(join(project, folder, 'node_modules'))) return { linked: false };
  const projectPackage = join(project, folder, 'package.json');
  const clonePackage = join(clone, '.tropis/package.json');
  if (!existsSync(projectPackage) || !existsSync(clonePackage)) return { linked: false };
  if (!readFileSync(projectPackage).equals(readFileSync(clonePackage))) return { linked: false };
  symlinkSync(join(project, folder, 'node_modules'), join(clone, '.tropis/node_modules'));
  return { linked: true };
}

/**
 * A `.new` is the project's own text left in place. Point the record at that text so
 * the installed-files check does not report the release as broken.
 */
function acceptNewFiles(clone, newFiles) {
  const recordPath = join(clone, '.tropis/installed.json');
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  const pointed = [];
  for (const rel of newFiles) {
    const path = join(clone, rel);
    if (!existsSync(path) || !statSync(path).isFile()) continue;
    record.files[rel] = fingerprint(readFileSync(path, 'utf8'));
    pointed.push(rel);
  }
  if (pointed.length > 0) writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  return pointed;
}

function failingNames(parsed, clone) {
  const names = [];
  for (const suite of parsed.testResults ?? []) {
    const failed = (suite.assertionResults ?? []).filter((item) => item.status === 'failed');
    if (suite.status === 'failed' && failed.length === 0) {
      const file = typeof suite.name === 'string' && suite.name.startsWith(`${clone}/`)
        ? suite.name.slice(clone.length + 1)
        : suite.name;
      const first = String(suite.message ?? '').split('\n')[0];
      names.push(`${file}: ${first}`);
    } else {
      for (const item of failed) names.push(item.fullName);
    }
  }
  return names;
}

function settingsThatDoNotFit(clone, dropped, result) {
  const lines = [];
  for (const name of dropped) {
    lines.push(`the release no longer ships rule ${name}; move or delete .claude/rule-additions/${name}.md`);
  }
  for (const key of result.areasRemoved) {
    lines.push(`the release no longer ships rule ${key}; the take removes its areas from .claude/rule-areas.json`);
  }
  for (const rel of result.blockMismatch) {
    lines.push(`project-owned blocks differ in number; carry your fill-ins into ${rel}.new by hand`);
  }
  let settings;
  try {
    settings = JSON.parse(readFileSync(join(clone, '.claude/settings.json'), 'utf8'));
  } catch {
    settings = {};
  }
  for (const groups of Object.values(settings.hooks ?? {})) {
    for (const group of groups ?? []) {
      for (const hook of group.hooks ?? []) {
        if (typeof hook.command !== 'string') continue;
        for (const rel of hook.command.match(HOOK_PATH) ?? []) {
          if (!existsSync(join(clone, rel))) {
            lines.push(`hook ${hook.command} names ${rel}, which the release does not ship`);
          }
        }
      }
    }
  }
  return lines;
}

function ruleChanges(project, clone, held, target) {
  const projectDir = join(project, '.claude/rules');
  const cloneDir = join(clone, '.claude/rules');
  const projectNames = new Set(ruleNames(projectDir));
  const cloneNames = new Set(ruleNames(cloneDir));
  const cloneAreas = readAreas(clone);
  const projectAreas = readAreas(project);
  const lines = [];
  for (const name of [...projectNames].filter((item) => cloneNames.has(item)).sort()) {
    const projectFile = join(projectDir, `${name}.md`);
    const cloneFile = join(cloneDir, `${name}.md`);
    const projectText = readFileSync(projectFile, 'utf8');
    const cloneText = readFileSync(cloneFile, 'utf8');
    if (projectText === cloneText) continue;
    lines.push(`${name} (areas: ${areasLabel(name, cloneAreas)})`);
    const diff = run('diff', [
      '-u',
      '-L', `${held}/.claude/rules/${name}.md`,
      '-L', `${target}/.claude/rules/${name}.md`,
      projectFile,
      cloneFile,
    ]);
    lines.push(...diff.stdout.replace(/\n$/, '').split('\n'));
  }
  for (const name of [...cloneNames].filter((item) => !projectNames.has(item)).sort()) {
    lines.push(`added ${name} (areas: ${areasLabel(name, cloneAreas)})`);
  }
  for (const name of [...projectNames].filter((item) => !cloneNames.has(item)).sort()) {
    lines.push(`removed ${name} (areas: ${areasLabel(name, projectAreas)})`);
  }
  return lines;
}

function section(lines, title, body) {
  if (body.length === 0) return;
  lines.push('', title);
  for (const line of body) lines.push(line.startsWith('+') || line.startsWith('-') || line.startsWith('@@')
    || line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ') || line.startsWith('index ')
    ? line
    : `  ${line}`);
}

function changedLines(result) {
  return [
    ...result.newFiles.map((rel) => `${rel}.new would be left beside yours`),
    ...result.removedByProject.map((rel) => `${rel} — removed by the project, not restored`),
    ...result.keptButGone.map((rel) => `${rel} — no longer shipped, kept because you changed it`),
  ];
}

function releaseLines(result) {
  const lines = [];
  const group = (title, items) => {
    if (items.length === 0) return;
    lines.push(`${title}:`);
    for (const item of items) lines.push(`  ${item}`);
  };
  group('Replaced', result.replaced);
  group('Added', result.added);
  group('Deleted', result.deleted);
  return lines;
}

function stepsFor(held, breaking, changed, settings) {
  const lines = [];
  if (breaking) {
    lines.push(`this is a breaking release for a project on ${held}: read its section in RELEASES.md, then take it with --accept-breaking`);
  }
  lines.push(...changed, ...settings);
  return lines;
}

function reprefix(message, clone, project) {
  return message.replaceAll(clone, project).replaceAll('take-version:', 'check-version:');
}

/**
 * @returns {{ status: number, text: string }}
 */
function checkVersion({ project, from = null }) {
  if (!isGitRoot(project)) {
    return { status: 1, text: `check-version: ${project} is not the root of a git repository.\n` };
  }
  if (git(project, 'status', '--porcelain').stdout.trim() !== '') {
    return {
      status: 1,
      text: `check-version: ${project} has uncommitted changes. Commit or stash them first; the check reads what is committed.\n`,
    };
  }

  const tmp = mkdtempSync(join(tmpdir(), 'check-version-'));
  const clone = join(tmp, basename(project));
  try {
    const cloned = run('git', ['clone', '-q', '--no-hardlinks', project, clone]);
    if (cloned.status !== 0) {
      return { status: 1, text: `check-version: cannot clone ${project}: ${(cloned.stderr || cloned.stdout).trim()}\n` };
    }

    const exact = git(tropis, 'describe', '--tags', '--exact-match', 'HEAD');
    let dropped = [];
    if (exact.status === 0) {
      const cleared = dropStaleAdditions(clone, exact.stdout.trim());
      if (cleared.error) {
        return { status: 1, text: `check-version: ${cleared.error}\n` };
      }
      dropped = cleared.dropped;
    }

    let applied;
    try {
      applied = takeVersion({ project: clone, from, acceptBreaking: true });
    } catch (e) {
      if (!(e instanceof Refusal)) throw e;
      const text = reprefix(e.message, clone, project);
      if (e.kind === 'not-newer') return { status: 0, text: `${text} Nothing to take.\n` };
      return { status: 1, text: `${text}\n` };
    }

    const show = (text) => text.replaceAll(clone, project);
    if (applied.status !== 0) {
      return {
        status: 0,
        text: render({
          project,
          held: applied.held,
          target: applied.target,
          verdict: 'not now',
          why: show(applied.text).replace(/\n$/, '').split('\n'),
          steps: [],
          release: [],
          changed: [],
          settings: [],
          tests: [],
          rules: [],
        }),
      };
    }

    const { held, target, breaking, result } = applied;
    const linked = dependencyLink(project, clone);
    if (!linked.linked) {
      const installed = run('npm', ['--prefix', '.tropis', 'install', '--no-audit', '--no-fund'], { cwd: clone });
      if (installed.status !== 0) {
        return {
          status: 0,
          text: render({
            project, held, target, verdict: 'not now',
            why: tail(`${installed.stdout}\n${installed.stderr}`),
            steps: [], release: [], changed: [], settings: [], tests: [], rules: [],
          }),
        };
      }
    }

    const pointed = acceptNewFiles(clone, result.newFiles);

    const resultsPath = join(tmp, 'results.json');
    // A nested run inherits FRAMEWORK_ROOT and would check that tree instead of the clone.
    const env = { ...process.env };
    delete env.FRAMEWORK_ROOT;
    // The check is itself a Jest test during the self-check. A nested Jest that
    // inherits the worker id does not run the clone's suite.
    for (const key of Object.keys(env)) if (key.startsWith('JEST_')) delete env[key];
    const tested = run('npm', [
      '--prefix', '.tropis', 'test', '--', '--json', `--outputFile=${resultsPath}`,
    ], { cwd: clone, env });

    let results = null;
    if (existsSync(resultsPath)) {
      try {
        results = JSON.parse(readFileSync(resultsPath, 'utf8'));
      } catch {
        results = null;
      }
    }
    if (results === null) {
      return {
        status: 0,
        text: render({
          project, held, target, verdict: 'not now',
          why: tail(`${tested.stdout}\n${tested.stderr}`),
          steps: [], release: [], changed: [], settings: [], tests: [], rules: [],
        }),
      };
    }

    const names = failingNames(results, clone);
    const passed = results.numPassedTests ?? 0;
    const failed = results.numFailedTests ?? 0;
    const testsFailed = failed > 0 || names.length > 0;
    const changed = changedLines(result);
    const settings = settingsThatDoNotFit(clone, dropped, result);
    const steps = stepsFor(held, breaking, changed, settings);
    const verdict = testsFailed ? 'not now' : (steps.length > 0 ? 'safe with these steps' : 'safe');
    const why = testsFailed ? ['the project\'s checks failed against the release'] : [];

    return {
      status: 0,
      text: render({
        project, held, target, verdict, why, steps,
        release: releaseLines(result),
        changed,
        settings,
        tests: [
          `${passed} passed, ${failed} failed`,
          ...names,
          ...pointed.map((rel) => `the tests ran with the project's version of ${rel}`),
        ],
        rules: ruleChanges(project, clone, held, target),
      }),
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function render({
  project, held, target, verdict, why, steps, release, changed, settings, tests, rules,
}) {
  const lines = [`check-version: ${project} holds ${held}; taking ${target} is ${verdict}.`];
  section(lines, 'Why not now', why);
  section(lines, 'Steps', steps);
  section(lines, 'Files the release changes', release);
  section(lines, 'Files you changed', changed);
  section(lines, 'Settings that no longer fit', settings);
  section(lines, `Tests against ${target} in a scratch copy`, tests);
  section(lines, 'Rules that change what agents are told', rules);
  return `${lines.join('\n')}\n`;
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
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    process.stderr.write(`check-version: ${parsed.error}\n`);
    process.exitCode = 1;
  } else {
    try {
      const outcome = checkVersion(parsed);
      const stream = outcome.status === 0 ? process.stdout : process.stderr;
      stream.write(outcome.text);
      process.exitCode = outcome.status;
    } catch (e) {
      process.stderr.write(`check-version: ${e.message}\n`);
      process.exitCode = 1;
    }
  }
}
