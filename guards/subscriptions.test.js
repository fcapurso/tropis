// Level: unit
/**
 * Which subscriptions the developer holds, as a session in a fresh clone is told them:
 * the TROPIS_SUBSCRIPTIONS variable, used where no local record exists. The record
 * itself is never committed, so a cloud session has none.
 *
 * Each case builds a throwaway repository laid out as the setup lays one out.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const blueprint = resolve(here, '..');

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || args.join(' '));
};

/** The environment a child runs with: the variable set as given, never inherited. */
const envWith = (subscriptions) => {
  const env = { ...process.env };
  delete env.TROPIS_SUBSCRIPTIONS;
  if (subscriptions !== undefined) env.TROPIS_SUBSCRIPTIONS = subscriptions;
  return env;
};

const TODAY = new Date().toISOString().slice(0, 10);
// Invented models and an invented subscription: nothing here is anyone's real plan.
const PICKS = `**Last verified: ${TODAY}.**

| Tier | Models |
|---|---|
| **Large** | Alder 3 *(all)* |
| **Medium–large** | Any pick from a higher tier |
| **Medium** | Any pick from a higher tier |
| **Small–medium** | Any pick from a higher tier |
| **Small** | Any pick from a higher tier |

| Model | Usage per task | Included on |
|---|---|---|
| Alder 3 | $9 per task (Example Index v1, high) | Claude Code: Gold |
`;

const parents = [];
afterAll(() => parents.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A repository shaped as a set-up project, with picks and, when given, a local record. */
function project(record) {
  const parent = mkdtempSync(join(tmpdir(), 'subscriptions-'));
  parents.push(parent);
  const root = join(parent, 'example-project');
  const scripts = join(root, '.tropis/scripts');
  mkdirSync(scripts, { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(join(root, '.claude/framework'), { recursive: true });
  const installed = readFileSync(join(blueprint, 'scripts/installed-scripts.txt'), 'utf8').split('\n').filter(Boolean);
  for (const f of installed) copyFileSync(join(blueprint, 'scripts', f), join(scripts, f));
  writeFileSync(join(root, '.tropis/package.json'), '{"type":"module"}\n');
  copyFileSync(join(blueprint, 'framework/model-tiers.md'), join(root, '.claude/framework/model-tiers.md'));
  writeFileSync(join(root, 'docs/model-picks.md'), PICKS);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 't@t');
  git(root, 'config', 'user.name', 't');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'seed');
  if (record !== undefined) {
    mkdirSync(join(root, '.git/tropis'), { recursive: true });
    writeFileSync(join(root, '.git/tropis/subscriptions.txt'), record);
  }
  return root;
}

const readerIn = async (root) => (await import(join(root, '.tropis/scripts/subscriptions.js'))).readSubscriptions;
const tier = (root, subscriptions) => spawnSync(
  'node', ['.tropis/scripts/dispatch.mjs', '--tier', 'Large'],
  { cwd: root, encoding: 'utf8', env: envWith(subscriptions) },
).stdout;

describe('the subscriptions record', () => {
  test('† reads the record from TROPIS_SUBSCRIPTIONS where no local record exists', async () => {
    const root = project();
    const read = await readerIn(root);
    expect(read(root, { TROPIS_SUBSCRIPTIONS: 'Claude Code: Gold; Cursor: Basic' }))
      .toBe('Claude Code: Gold\nCursor: Basic');
    expect(read(root, { TROPIS_SUBSCRIPTIONS: '  ' })).toBeNull();
    expect(read(root, {})).toBeNull();
  });

  test('† a local record wins over the variable', async () => {
    const root = project('# mine\nClaude Code: Silver\n');
    const read = await readerIn(root);
    expect(read(root, { TROPIS_SUBSCRIPTIONS: 'Claude Code: Gold' })).toBe('# mine\nClaude Code: Silver\n');
  });

  test('† dispatch names the included pick from the variable', () => {
    const root = project();
    expect(tier(root, 'Claude Code: Gold')).toContain('**Use:** Alder 3, in Claude Code');
    expect(tier(root)).toContain(
      '**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers, or set TROPIS_SUBSCRIPTIONS.',
    );
  });
});
