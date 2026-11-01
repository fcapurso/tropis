// Level: unit
/**
 * This repository is public: no committed file may carry a home path, a computer's
 * hostname, an Atlassian site, a session id, an email address outside the allowlist, or
 * a word whose SHA-256 is on the list of private names below.
 *
 * Scans every file of the checked tree except `.tropis/` and the paths in
 * `.tropis/installed.json` (the installed release, replaced by taking a release).
 * check-blueprint.sh hands it a full copy of HEAD, export-ignored paths included, in
 * FRAMEWORK_ROOT. Skips outside the blueprint tree. Runs no git: the copy has no `.git`.
 *
 * The test sources and fixtures are written so that this file does not match its own
 * patterns; fixtures are built at run time.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, sep } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '..');

function isBlueprintTree(dir) {
  return (
    existsSync(join(dir, 'bootstrap.md')) &&
    existsSync(join(dir, 'framework/workflow.md')) &&
    existsSync(join(dir, 'commands')) &&
    existsSync(join(dir, 'README.md'))
  );
}

/**
 * SHA-256 of lower-cased private names (letters and digits only). Hashes, never names:
 * publishing this list publishes nothing. To add one:
 *   printf '%s' <word> | shasum -a 256
 * A name nobody has hashed passes this guard; read your own diff for names.
 */
export const HASHED_NAMES = [
  '9c3bb2dc2d5961ecd4a1e8112b15da950ca6bb225dc10c34504bce040fe1311c',
  '0eb2b6cff49729f68d65231514874eb08810e19ae5c5e595ec2ea34c5976c969',
];

const EXACT_ADDRESSES = new Set([
  'git@github.com',
  'secret@github.com',
  'cursoragent@cursor.com',
  'hello@moxy.studio',
]);
const HOME_NAMES = new Set(['user', 'someone', 'runner']);
const EXAMPLE_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'example.test']);

const sha = (word) => createHash('sha256').update(word).digest('hex');
const shaCache = new Map();
function hashOf(word) {
  let h = shaCache.get(word);
  if (h === undefined) {
    h = sha(word);
    shaCache.set(word, h);
  }
  return h;
}

/** Reports of one line: [{kind, text}]. */
export function scanLine(line, hashes = HASHED_NAMES) {
  const found = [];
  const add = (kind, text) => found.push({ kind, text });

  for (const m of line.matchAll(/\/(?:Users|home)\/([A-Za-z0-9._-]+)/g)) {
    const name = m[1];
    if (!HOME_NAMES.has(name) && !name.startsWith('<')) add('home path', m[0]);
  }
  for (const m of line.matchAll(/\b[A-Za-z0-9][A-Za-z0-9-]*-MacBook[A-Za-z0-9-]*/gi)) {
    add('hostname', m[0]);
  }
  for (const m of line.matchAll(/\b[A-Za-z0-9-]+\.local\b(?![.\w-])/g)) {
    if (m[0] !== 'dev-laptop.local') add('hostname', m[0]);
  }
  for (const m of line.matchAll(/\b([a-z0-9-]+)\.atlassian\.net\b/gi)) {
    if (!['example', 'your-site'].includes(m[1].toLowerCase())) add('Atlassian site', m[0]);
  }
  for (const m of line.matchAll(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  )) {
    add('session id', m[0]);
  }
  for (const m of line.matchAll(/\bsession_[A-Za-z0-9]{16,}\b/g)) add('session id', m[0]);
  for (const m of line.matchAll(
    /([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g,
  )) {
    const local = m[1].toLowerCase();
    const domain = m[2].toLowerCase();
    const ok =
      EXAMPLE_DOMAINS.has(domain) ||
      domain.endsWith('.example') ||
      local === 'noreply' ||
      domain === 'users.noreply.github.com' ||
      EXACT_ADDRESSES.has(`${local}@${domain}`);
    if (!ok) add('email', m[0]);
  }
  for (const m of line.toLowerCase().matchAll(/[a-z0-9]+/g)) {
    if (hashes.includes(hashOf(m[0]))) add('hashed name', m[0].replace(/./g, '*'));
  }
  return found;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

/** Every hit in the tree as `<path>:<line>: <kind>: <text>`. */
export function scanTree(dir, hashes = HASHED_NAMES) {
  const installedPath = join(dir, '.tropis', 'installed.json');
  const installed = existsSync(installedPath)
    ? new Set(Object.keys(JSON.parse(readFileSync(installedPath, 'utf8')).files ?? {}))
    : new Set();
  const hits = [];
  for (const file of walk(dir)) {
    const rel = relative(dir, file).split(sep).join('/');
    if (rel.startsWith('.tropis/') || installed.has(rel)) continue;
    const buf = readFileSync(file);
    if (isBinary(buf)) continue;
    buf
      .toString('utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const f of scanLine(line, hashes)) hits.push(`${rel}:${i + 1}: ${f.kind}: ${f.text}`);
      });
  }
  return hits;
}

const blueprint = isBlueprintTree(root);

describe('scanner: each kind is reported', () => {
  const slash = (...parts) => ['', ...parts].join('/');
  const kinds = (line) => scanLine(line).map((f) => f.kind);

  it('a home path', () => {
    expect(kinds(`see ${slash('Users', 'alice', 'x')}`)).toEqual(['home path']);
    expect(kinds(`see ${slash('home', 'bob', 'x')}`)).toEqual(['home path']);
  });
  it('a hostname', () => {
    expect(kinds(`on ${['alice', 'MacBook', 'Pro'].join('-')}`)).toEqual(['hostname']);
    expect(kinds(`on ${['alice-laptop', 'local'].join('.')}`)).toEqual(['hostname']);
  });
  it('an Atlassian site', () => {
    expect(kinds(`at ${['acme', 'atlassian', 'net'].join('.')}`)).toEqual(['Atlassian site']);
  });
  it('a session id', () => {
    expect(kinds(`id ${['123e4567', 'e89b', '12d3', 'a456', '426614174000'].join('-')}`)).toEqual(['session id']);
    expect(kinds(`id ${['session', '0123456789abcdefABCD'].join('_')}`)).toEqual(['session id']);
  });
  it('an email address outside the allowlist', () => {
    expect(kinds(`mail ${['alice', ['corp', 'com'].join('.')].join('@')}`)).toEqual(['email']);
  });
  it('a word whose hash is on the list, without printing it', () => {
    const word = 'zorblax';
    const hits = scanLine(`the ${word.toUpperCase()}-thing`, [sha(word)]);
    expect(hits).toEqual([{ kind: 'hashed name', text: '*'.repeat(word.length) }]);
  });
});

describe('scanner: allowlisted text is silent', () => {
  const slash = (...parts) => ['', ...parts].join('/');
  it.each([
    ['home path user', slash('home', 'user', 'x')],
    ['home path someone', slash('Users', 'someone', 'framework')],
    ['home path runner', slash('home', 'runner', 'work')],
    ['home path placeholder', slash('Users', '<name>', 'x')],
    ['neutral hostname', 'on dev-laptop.local'],
    ['settings.local.json', '.claude/settings.local.json'],
    ['MacBook prose', "the developer's MacBook Pro"],
    ['catalog wording', 'a hostname of the form *-MacBook* or *.local'],
    ['atlassian example', ['example', 'atlassian', 'net'].join('.')],
    ['atlassian your-site', ['your-site', 'atlassian', 'net'].join('.')],
    ['example.com', ['a', 'example.com'].join('@')],
    ['example.test', ['a', 'example.test'].join('@')],
    ['x.example', ['a', 'b.example'].join('@')],
    ['noreply', ['noreply', 'corp.com'].join('@')],
    ['github noreply', ['12345+alice', 'users.noreply.github.com'].join('@')],
    ['ssh remote', ['git', 'github.com'].join('@')],
    ['secret in a URL', ['secret', 'github.com'].join('@')],
    ['cursor agent', ['cursoragent', 'cursor.com'].join('@')],
    ['library licence', ['hello', 'moxy.studio'].join('@')],
    ['npm scope', '@types/node and @scope/pkg'],
  ])('%s', (_name, line) => {
    expect(scanLine(line)).toEqual([]);
  });
});

describe('the hash list', () => {
  it('is not empty and holds 64 hex characters per entry', () => {
    expect(HASHED_NAMES.length).toBeGreaterThanOrEqual(2);
    for (const h of HASHED_NAMES) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('holds the hash of no word in this file', () => {
    const own = readFileSync(fileURLToPath(import.meta.url), 'utf8').toLowerCase();
    for (const m of own.matchAll(/[a-z0-9]+/g)) {
      expect(HASHED_NAMES).not.toContain(sha(m[0]));
    }
  });
});

describe('private material in the repository', () => {
  if (!blueprint) {
    it('skips outside the blueprint tree', () => {
      if (process.env.TROPIS_EXPECT_FRAMEWORK) {
        throw new Error(`Expected the framework repository at ${root}`);
      }
      expect(blueprint).toBe(false);
    });
    return;
  }
  it('no committed file carries any', () => {
    expect(scanTree(root)).toEqual([]);
  });
});
