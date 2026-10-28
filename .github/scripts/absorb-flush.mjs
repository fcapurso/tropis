// This repository's flush intake. Tested by guards/absorb-flush.test.js.
// Not shipped to projects: nothing here is in the installed-script list.
// It reads a listing as JSON on stdin and does everything else with git.
// Pushing, opening, merging and closing stay in the command that runs it.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Files that never decide a pull request's home, and never count as a span. */
const ASIDE = new Set(['feature-catalog.yaml', 'docs/backlog-board/bands.yaml']);

/**
 * Old-side line ranges from `git diff -U0`. A header `@@ -a,b +c,d @@` covers
 * [a, a+b-1]. When b is omitted it is 1. When b is 0 the hunk is an insertion
 * after line a, and the range is [a, a] so it can still sit within the slack
 * of a neighbour.
 * @param {string} diffText
 * @returns {{ path: string, start: number, end: number }[]}
 */
export function parseHunks(diffText) {
  const ranges = [];
  let file = null;
  for (const line of diffText.split('\n')) {
    const git = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (git) {
      file = git[2];
      continue;
    }
    const plus = /^\+\+\+ b\/(.+)$/.exec(line);
    if (plus && plus[1] !== '/dev/null') file = plus[1];
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/.exec(line);
    if (!hunk || !file) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const end = count === 0 ? start : start + count - 1;
    ranges.push({ path: file, start, end });
  }
  return ranges;
}

/**
 * Pairs of pull requests whose ranges on one path lie within `slack` lines.
 * Both members of `appendOnly` are not paired on `feature-catalog.yaml`.
 * @param {Map<number, { path: string, start: number, end: number }[]>} rangesByPr
 * @param {Set<number>} appendOnly
 * @param {number} [slack]
 * @returns {[number, number, string][]}
 */
export function overlappingPairs(rangesByPr, appendOnly, slack = 3) {
  /** @type {Map<string, { pr: number, start: number, end: number }[]>} */
  const byPath = new Map();
  for (const [pr, ranges] of rangesByPr) {
    for (const range of ranges) {
      if (!byPath.has(range.path)) byPath.set(range.path, []);
      byPath.get(range.path).push({ pr, start: range.start, end: range.end });
    }
  }
  const seen = new Set();
  const pairs = [];
  for (const [file, items] of byPath) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const left = items[i];
        const right = items[j];
        if (left.pr === right.pr) continue;
        const a = Math.min(left.pr, right.pr);
        const b = Math.max(left.pr, right.pr);
        if (file === 'feature-catalog.yaml' && appendOnly.has(a) && appendOnly.has(b)) continue;
        const near = left.start <= right.end + slack && right.start <= left.end + slack;
        if (!near) continue;
        const key = `${a}\0${b}\0${file}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push([a, b, file]);
      }
    }
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0));
  return pairs;
}

/**
 * The file a pull request changes most (additions plus deletions). The catalog
 * and the bands file are ignored unless they are all it changes, in which case
 * the catalog is the home. A tie goes to the alphabetically first path.
 * @param {{ files: { path: string, additions: number, deletions: number }[] }} pr
 * @returns {string}
 */
export function homeFile(pr) {
  const ranked = pr.files.filter((f) => !ASIDE.has(f.path));
  const pool = ranked.length > 0
    ? ranked
    : pr.files.filter((f) => f.path === 'feature-catalog.yaml');
  if (pool.length === 0) {
    throw new Error('a pull request with no files has no home');
  }
  let best = pool[0];
  for (const file of pool.slice(1)) {
    const weight = file.additions + file.deletions;
    const bestWeight = best.additions + best.deletions;
    if (weight > bestWeight || (weight === bestWeight && file.path < best.path)) best = file;
  }
  return best.path;
}

/**
 * Groups keyed by home file, in path order. Pull requests in a group are in
 * number order. A pull request spans a group when another file it changes is
 * that group's home.
 * @param {{ number: number, files: { path: string, additions: number, deletions: number }[] }[]} prs
 */
export function proposeGroups(prs) {
  /** @type {Map<string, typeof prs>} */
  const byHome = new Map();
  for (const pr of prs) {
    const home = homeFile(pr);
    if (!byHome.has(home)) byHome.set(home, []);
    byHome.get(home).push(pr);
  }
  const homes = new Set(byHome.keys());
  return [...byHome.keys()].sort().map((home) => {
    const members = byHome.get(home).slice().sort((a, b) => a.number - b.number);
    const spans = [];
    for (const pr of members) {
      const also = pr.files
        .map((f) => f.path)
        .filter((p) => p !== home && !ASIDE.has(p) && homes.has(p))
        .sort();
      if (also.length > 0) spans.push({ pr: pr.number, also });
    }
    return { home, prs: members.map((pr) => pr.number), spans };
  });
}

/**
 * The bytes a catalog grew by, when `headText` begins with `baseText` and is
 * longer. Any other change, including an identical file, is null.
 * @param {string} baseText
 * @param {string} headText
 * @returns {string | null}
 */
export function catalogTail(baseText, headText) {
  if (headText.length <= baseText.length) return null;
  if (!headText.startsWith(baseText)) return null;
  return headText.slice(baseText.length);
}

/**
 * @param {number[]} previous
 * @param {number[]} current
 * @returns {{ arrived: number[], gone: number[] }}
 */
export function arrivedSince(previous, current) {
  const before = new Set(previous);
  const after = new Set(current);
  return {
    arrived: current.filter((n) => !before.has(n)).sort((a, b) => a - b),
    gone: previous.filter((n) => !after.has(n)).sort((a, b) => a - b),
  };
}

/**
 * Indexes, into `after`'s split lines, of lines that `before` does not have.
 * Copies count: a line that appears twice before and three times after has one
 * touched copy, the one left after the earlier copies are paired off.
 * @param {string} before
 * @param {string} after
 * @returns {Set<number>}
 */
export function touchedLines(before, after) {
  const counts = new Map();
  for (const line of before.split('\n')) counts.set(line, (counts.get(line) ?? 0) + 1);
  const touched = new Set();
  after.split('\n').forEach((line, index) => {
    const left = counts.get(line) ?? 0;
    if (left > 0) counts.set(line, left - 1);
    else touched.add(index);
  });
  return touched;
}

const LIST_ITEM = /^(\s*)([-*]|\d+\.) (.*)$/;
const BOLD_ONLY = /^\s*\*\*[^*]+\*\*[.:]?\s*$/;

/** True for a line that ends a unit and is never rewritten. */
function boundaryAt(lines, index, frontMatter) {
  if (frontMatter.has(index)) return true;
  const line = lines[index];
  if (line.trim() === '') return true;
  if (BOLD_ONLY.test(line)) return true;
  const text = line.trimStart();
  return text.startsWith('|') || text.startsWith('#') || text.startsWith('→')
    || text.startsWith('<!--');
}

/**
 * Front matter is a first line `---` through the next `---`. Fenced code is
 * every line from a fence through its closer, fences included. Both are
 * boundaries, so a unit cannot run through them.
 * @param {string[]} lines
 * @returns {Set<number>}
 */
function protectedRegions(lines) {
  /** @type {Set<number>} */
  const marked = new Set();
  if (lines[0] === '---') {
    marked.add(0);
    for (let i = 1; i < lines.length; i++) {
      marked.add(i);
      if (lines[i] === '---') break;
    }
  }
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    // A fence may be indented, as it is inside a numbered step.
    const opener = /^\s*(```|~~~)/.exec(lines[i]);
    if (!fence && opener) {
      fence = opener[1];
      marked.add(i);
      continue;
    }
    if (fence) {
      marked.add(i);
      if (lines[i].trimStart().startsWith(fence)) fence = null;
    }
  }
  return marked;
}

/**
 * @param {string[]} words
 * @param {string} firstPrefix
 * @param {string} contPrefix
 * @param {number} width
 */
function fillLines(words, firstPrefix, contPrefix, width) {
  const lines = [];
  let prefix = firstPrefix;
  let line = null;
  for (const word of words) {
    const limit = width - prefix.length;
    if (line === null) {
      line = prefix + word;
      if (word.length > limit) {
        lines.push(line);
        line = null;
        prefix = contPrefix;
      }
      continue;
    }
    if (line.length + 1 + word.length <= width) {
      line += ' ' + word;
    } else {
      lines.push(line);
      prefix = contPrefix;
      if (word.length > width - prefix.length) {
        lines.push(prefix + word);
        line = null;
      } else {
        line = prefix + word;
      }
    }
  }
  if (line !== null) lines.push(line);
  return lines;
}

function wordsOf(lines, indexes) {
  const first = lines[indexes[0]];
  const item = LIST_ITEM.exec(first);
  const prefix = item ? item[1] + item[2] + ' ' : (/^(\s*)/.exec(first) ?? ['', ''])[1];
  const words = [];
  indexes.forEach((index, nth) => {
    const raw = nth === 0 ? lines[index].slice(prefix.length) : lines[index].trim();
    if (raw !== '') words.push(...raw.split(/\s+/).filter(Boolean));
  });
  return { prefix, words };
}

/**
 * Rewraps a unit only when it holds a touched line and a line longer than
 * `width`. Boundaries — blank lines, front matter, fences, tables, headings,
 * arrow lines, comments, bold-only lines — are copied unchanged, and a list
 * item never joins the item after it.
 * @param {string} before
 * @param {string} after
 * @param {number} [width]
 * @returns {string}
 */
export function rewrapTouched(before, after, width = 88) {
  const lines = after.split('\n');
  const touched = touchedLines(before, after);
  const frontMatter = protectedRegions(lines);
  const boundary = lines.map((_, index) => boundaryAt(lines, index, frontMatter));
  /** @type {number[][]} */
  const units = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    if (boundary[i]) {
      current = null;
      continue;
    }
    if (current === null || LIST_ITEM.test(lines[i])) {
      current = [i];
      units.push(current);
    } else {
      current.push(i);
    }
  }

  /** @type {string[]} */
  const out = [];
  let cursor = 0;
  for (const unit of units) {
    while (cursor < unit[0]) out.push(lines[cursor++]);
    const hasTouched = unit.some((index) => touched.has(index));
    const hasLong = unit.some((index) => lines[index].length > width);
    if (!hasTouched || !hasLong) {
      for (const index of unit) out.push(lines[index]);
    } else {
      const { prefix, words } = wordsOf(lines, unit);
      const cont = ' '.repeat(prefix.length);
      out.push(...fillLines(words, prefix, cont, width));
    }
    cursor = unit[unit.length - 1] + 1;
  }
  while (cursor < lines.length) out.push(lines[cursor++]);
  return out.join('\n');
}

/**
 * The contributor's message, trailing whitespace removed, then a blank line
 * and `Absorbed from <url>: <note>`. The note is one line; empty is refused.
 * @param {string} original
 * @param {string} url
 * @param {string} note
 * @returns {string}
 */
export function absorbedMessage(original, url, note) {
  if (note === '' || note.includes('\n')) {
    throw new Error('the absorb note must be one non-empty line');
  }
  return `${original.replace(/\s+$/, '')}\n\nAbsorbed from ${url}: ${note}\n`;
}

/**
 * Absorbed commits from `git log --format=%H%x1f%B%x1e`, in the log's order.
 * The note is the text after the last `Absorbed from` line in the message.
 * @param {string} logText
 * @returns {{ number: number, url: string, sha: string, note: string }[]}
 */
export function landedFrom(logText) {
  const found = [];
  for (const record of logText.split('\x1e')) {
    if (record === '') continue;
    const sep = record.indexOf('\x1f');
    if (sep < 0) continue;
    const sha = record.slice(0, sep).trim();
    const body = record.slice(sep + 1);
    const marks = [...body.matchAll(/^Absorbed from (\S+): (.*)$/gm)];
    if (marks.length === 0) continue;
    const mark = marks[marks.length - 1];
    const url = mark[1];
    const number = Number(/\/pull\/(\d+)/.exec(url)?.[1]);
    found.push({ number, url, sha, note: mark[2] });
  }
  return found;
}

const REWRAP_SUFFIX = '; rewrapped to 88 columns';
const MARKER = /^(<<<<<<< |>>>>>>> )/m;

function git(args, { cwd, env, input } = {}) {
  return spawnSync('git', ['--no-pager', ...args], {
    cwd,
    input,
    encoding: 'utf8',
    // The maintainer's own git config stays in force: fetching from a private origin
    // needs its credential helper, and committing needs its committer identity. Author
    // values are passed in per commit, so the config never decides them.
    env: { ...process.env, ...env },
  });
}

function fail(code, text) {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
  process.exit(code);
}

function repository() {
  const r = git(['rev-parse', '--show-toplevel']);
  if (r.status !== 0) fail(2, r.stderr || 'not a git repository');
  return r.stdout.trim();
}

function gitOut(root, args, extra) {
  const r = git(args, { cwd: root, ...extra });
  if (r.status !== 0) fail(2, r.stderr || r.stdout || `git ${args[0]} failed`);
  return r.stdout;
}

function absoluteGitPath(root, flag) {
  const dir = gitOut(root, ['rev-parse', flag]).trim();
  return path.isAbsolute(dir) ? dir : path.resolve(root, dir);
}

function noteFrom(argv, fallback) {
  const index = argv.indexOf('--note');
  if (index < 0) return fallback;
  const note = argv[index + 1];
  if (!note) fail(2, 'refusing: --note needs text');
  return note;
}

function blob(root, rev, file) {
  const r = git(['show', `${rev}:${file}`], { cwd: root });
  return r.status === 0 ? r.stdout : '';
}

function authorOf(root, number) {
  const raw = gitOut(root, ['log', '-1', `--format=%an%x1f%ae%x1f%ad%x1f%B`, '--date=raw', `refs/absorb/${number}`]);
  const parts = raw.split('\x1f');
  return {
    name: parts[0],
    email: parts[1],
    date: parts[2],
    message: parts.slice(3).join('\x1f'),
  };
}

function fetchHead(root, number) {
  const r = git(['fetch', 'origin', `+refs/pull/${number}/head:refs/absorb/${number}`], { cwd: root });
  if (r.status !== 0) fail(2, r.stderr || `fetch of #${number} failed`);
}

/** @returns {boolean} whether a markdown file changed */
function rewrapStaged(root) {
  const names = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root }).stdout
    .split('\n')
    .filter((file) => file.endsWith('.md'));
  let changed = false;
  for (const file of names) {
    const before = blob(root, 'HEAD', file);
    const full = path.join(root, file);
    const after = readFileSync(full, 'utf8');
    const wrapped = rewrapTouched(before, after);
    if (wrapped === after) continue;
    writeFileSync(full, wrapped);
    gitOut(root, ['add', '--', file]);
    changed = true;
  }
  return changed;
}

function appendCatalog(root, tail) {
  const file = path.join(root, 'feature-catalog.yaml');
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  writeFileSync(file, current + tail);
  gitOut(root, ['add', '--', 'feature-catalog.yaml']);
}

function withRewrap(note, rewrapped) {
  return rewrapped && !note.endsWith(REWRAP_SUFFIX) ? `${note}${REWRAP_SUFFIX}` : note;
}

function commitAbsorb(root, author, url, note) {
  const body = absorbedMessage(author.message, url, note);
  const r = git(['commit', '-F', '-'], {
    cwd: root,
    input: body,
    env: {
      GIT_AUTHOR_NAME: author.name,
      GIT_AUTHOR_EMAIL: author.email,
      GIT_AUTHOR_DATE: author.date,
    },
  });
  if (r.status !== 0) fail(2, r.stderr || r.stdout || 'commit failed');
}

function pendingFile(root) {
  return path.join(absoluteGitPath(root, '--git-dir'), 'absorb-flush', 'pending.json');
}

function writePending(root, record) {
  const file = pendingFile(root);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`);
}

function markersRemain(root) {
  const unmerged = git(['diff', '--name-only', '--diff-filter=U'], { cwd: root }).stdout
    .split('\n').filter(Boolean);
  if (unmerged.length > 0) return true;
  const staged = git(['diff', '--cached', '--name-only'], { cwd: root }).stdout
    .split('\n').filter(Boolean);
  return staged.some((file) => {
    const shown = git(['show', `:${file}`], { cwd: root });
    return shown.status === 0 && MARKER.test(shown.stdout);
  });
}

function listingFile(root, prefix) {
  const common = absoluteGitPath(root, '--git-common-dir');
  return path.join(common, 'absorb-flush', `${prefix.replaceAll('/', '_')}.json`);
}

function cmdList(root, prefix) {
  if (!prefix) fail(2, 'refusing: list needs a branch prefix');
  const parsed = JSON.parse(readFileSync(0, 'utf8'));
  const kept = parsed.filter((pr) => String(pr.headRefName).startsWith(prefix));
  for (const pr of kept) fetchHead(root, pr.number);

  const rangesByPr = new Map();
  const appendOnly = new Set();
  for (const pr of kept) {
    const head = `refs/absorb/${pr.number}`;
    const base = gitOut(root, ['merge-base', head, 'origin/main']).trim();
    rangesByPr.set(pr.number, parseHunks(gitOut(root, ['diff', '-U0', base, head])));
    const tail = catalogTail(blob(root, base, 'feature-catalog.yaml'), blob(root, head, 'feature-catalog.yaml'));
    if (tail !== null) appendOnly.add(pr.number);
  }

  const groups = proposeGroups(kept);
  const overlaps = overlappingPairs(rangesByPr, appendOnly);
  const record = listingFile(root, prefix);
  const previous = existsSync(record) ? JSON.parse(readFileSync(record, 'utf8')) : null;
  const current = kept.map((pr) => pr.number);
  const lines = [];
  if (!previous) lines.push('First listing.');
  else {
    const { arrived, gone } = arrivedSince(previous, current);
    lines.push(`Arrived: ${arrived.length ? arrived.map((n) => `#${n}`).join(', ') : 'none'}`);
    lines.push(`Gone: ${gone.length ? gone.map((n) => `#${n}`).join(', ') : 'none'}`);
  }
  lines.push('');
  const byNumber = new Map(kept.map((pr) => [pr.number, pr]));
  for (const group of groups) {
    lines.push(`Group: ${group.home}`);
    for (const number of group.prs) {
      const pr = byNumber.get(number);
      lines.push(`#${number} ${pr.title}`);
      for (const file of pr.files) lines.push(`  ${file.path} +${file.additions} -${file.deletions}`);
    }
    for (const span of group.spans) lines.push(`spans: #${span.pr} also ${span.also.join(', ')}`);
    lines.push('');
  }
  lines.push('Overlaps:');
  if (overlaps.length === 0) lines.push('none');
  for (const [a, b, file] of overlaps) lines.push(`#${a} #${b} ${file}`);
  process.stdout.write(`${lines.join('\n')}\n`);

  mkdirSync(path.dirname(record), { recursive: true });
  writeFileSync(record, `${JSON.stringify(current)}\n`);
}

function cmdApply(root, argv) {
  const number = Number(argv[0]);
  const url = argv[1];
  if (!number || !url) fail(2, 'refusing: apply needs a number and a url');
  const note = noteFrom(argv, 'taken unchanged');
  const dirty = git(['status', '--porcelain'], { cwd: root }).stdout;
  if (dirty !== '') fail(2, 'refusing: dirty tree');

  fetchHead(root, number);
  const head = `refs/absorb/${number}`;
  const base = gitOut(root, ['merge-base', head, 'origin/main']).trim();
  const count = Number(gitOut(root, ['rev-list', '--count', `${base}..${head}`]).trim());
  if (count !== 1) fail(2, `refusing: ${count} commits`);

  const tail = catalogTail(
    blob(root, base, 'feature-catalog.yaml'),
    blob(root, head, 'feature-catalog.yaml'),
  );
  const diffArgs = ['diff', base, head];
  if (tail !== null) diffArgs.push('--', '.', ':(exclude)feature-catalog.yaml');
  const diff = gitOut(root, diffArgs);
  let conflicted = [];
  if (diff !== '') {
    const applied = git(['apply', '-3'], { cwd: root, input: diff });
    conflicted = git(['diff', '--name-only', '--diff-filter=U'], { cwd: root }).stdout
      .split('\n').filter(Boolean);
    if (conflicted.length === 0 && applied.status !== 0) {
      fail(2, applied.stderr || applied.stdout || 'apply failed');
    }
  }
  if (tail !== null) appendCatalog(root, tail);
  if (conflicted.length > 0) {
    writePending(root, { number, url, note });
    process.stdout.write(conflicted.map((file) => `conflict: ${file}`).join('\n') + '\n');
    process.exit(3);
  }
  const author = authorOf(root, number);
  commitAbsorb(root, author, url, withRewrap(note, rewrapStaged(root)));
}

function cmdCommit(root, argv) {
  const file = pendingFile(root);
  if (!existsSync(file)) fail(2, 'refusing: no pending absorb');
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  if (markersRemain(root)) fail(2, 'refusing: conflict markers remain');
  const note = noteFrom(argv, saved.note);
  const author = authorOf(root, saved.number);
  commitAbsorb(root, author, saved.url, withRewrap(note, rewrapStaged(root)));
  rmSync(file);
}

function cmdLanded(root, since) {
  if (!since) fail(2, 'refusing: landed needs the main sha from before the merge');
  const log = gitOut(root, ['log', '--reverse', `--format=%H%x1f%B%x1e`, `${since}..origin/main`]);
  for (const row of landedFrom(log)) {
    process.stdout.write(`#${row.number}\t${row.sha.slice(0, 7)}\t${row.url}\t${row.note}\n`);
  }
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const root = repository();
  if (cmd === 'list') cmdList(root, rest[0]);
  else if (cmd === 'apply') cmdApply(root, rest);
  else if (cmd === 'commit') cmdCommit(root, rest);
  else if (cmd === 'landed') cmdLanded(root, rest[0]);
  else fail(2, 'usage: absorb-flush.mjs list|apply|commit|landed');
}

const invoked = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invoked) main();
