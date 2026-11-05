// Shared machinery: no part of this file is project-owned.
/**
 * The files a release ships, and the fingerprint a project is checked against.
 *
 * A fingerprint is the SHA-256 of a file's UTF-8 text with the inner lines of each
 * project-owned block removed. The marker lines stay, so filling a block in does not
 * count as a change. `.tropis/installed.json` records one version and those
 * fingerprints. `record-installed.mjs` writes it; the installed-files guard reads it.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A line matches when it contains the marker. Commands write the begin marker as an
// HTML comment that continues onto the following lines; only this line is the marker.
// Assembled at runtime: this file is shipped, and a literal marker would be a block.
const marker = (kind) => `project-owned: ${kind}`;
const BEGIN = new RegExp(marker('begin'));
const END = new RegExp(marker('end'));

/** Roots walked for shipped files, relative to the project root. */
export const SHIPPED_ROOTS = ['.tropis', '.claude/framework', '.claude/commands'];

/**
 * Shipped files outside those roots. A project's other workflows are not
 * among them: only these paths are added, and only when the file exists.
 */
export const SHIPPED_PATHS = [
  '.github/workflows/tropis-pipeline.yml',
  '.github/workflows/tropis-framework-checks.yml',
  '.github/workflows/tropis-staging.yml',
];

/**
 * Left out of a release. `.tropis/node_modules` is a directory: it and everything
 * under it are skipped. The others are files. `installed.json` is this record;
 * `README.md` is the project's operator guide. `project.json` is the project's own
 * settings, written by setup when it is given a name; `worktree-setup.txt` is the
 * project's own worktree setup.
 */
export const EXCLUDED = [
  '.tropis/node_modules',
  '.tropis/package-lock.json',
  '.tropis/installed.json',
  '.tropis/README.md',
  '.tropis/project.json',
  '.tropis/worktree-setup.txt',
];

/**
 * Visit every line that is not strictly inside a complete project-owned block, and
 * each such block's inner lines. An unclosed begin stays in the text as ordinary
 * lines. Splitting on `\n` leaves a trailing empty string when the text ends in a
 * newline, so joining the kept lines restores that newline.
 * @param {string} text
 * @param {(line: string) => void} onKept
 * @param {(inner: string[]) => void} onBlock Called between the begin and end markers.
 */
function scan(text, onKept, onBlock) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (BEGIN.test(line)) {
      let end = i + 1;
      while (end < lines.length && !END.test(lines[end])) end += 1;
      if (end < lines.length) {
        onKept(line);
        onBlock(lines.slice(i + 1, end));
        onKept(lines[end]);
        i = end + 1;
        continue;
      }
    }
    onKept(line);
    i += 1;
  }
}

/**
 * Lowercase hex SHA-256 of `text` after the inner lines of each project-owned block
 * are removed. Marker lines stay.
 * @param {string} text
 * @returns {string}
 */
export function fingerprint(text) {
  const kept = [];
  scan(text, (line) => kept.push(line), () => {});
  return createHash('sha256').update(kept.join('\n'), 'utf8').digest('hex');
}

/**
 * Inner lines of each project-owned block, in order. Marker lines are excluded.
 * A block with nothing between its markers contributes an empty array.
 * @param {string} text
 * @returns {string[][]}
 */
export function blocks(text) {
  const found = [];
  scan(text, () => {}, (inner) => found.push(inner));
  return found;
}

/**
 * `nextText` with each block's inner lines replaced by the project's, in order.
 * When the two texts have different numbers of blocks, `nextText` is returned
 * unchanged and `mismatch` is true — that is how a count mismatch is reported.
 * @param {string} projectText
 * @param {string} nextText
 * @returns {{ text: string, mismatch: boolean }}
 */
export function carryBlocks(projectText, nextText) {
  const projectBlocks = blocks(projectText);
  const nextBlocks = blocks(nextText);
  if (projectBlocks.length !== nextBlocks.length) {
    return { text: nextText, mismatch: true };
  }
  let n = 0;
  const out = [];
  scan(nextText, (line) => out.push(line), () => {
    out.push(...projectBlocks[n]);
    n += 1;
  });
  return { text: out.join('\n'), mismatch: false };
}

// A named begin marker: `begin <name>[ (was <old>[, <old>…])] — <purpose> -->`, on one
// line. Built from `marker()` for the same reason as BEGIN.
const NAMED = new RegExp(
  `${marker('begin')} ([a-z][a-z0-9-]*)(?: \\(was ([a-z0-9, -]+)\\))? — (.*?) -->\\s*$`,
);

/**
 * Every complete block in order: `{ begin, body }`, plus `name`, `was` and `purpose`
 * when its begin marker names it.
 * @param {string} text
 */
function allBlocks(text) {
  const found = [];
  let begin = null;
  scan(text, (line) => {
    if (BEGIN.test(line)) begin = line;
  }, (body) => {
    const m = NAMED.exec(begin);
    if (!m) found.push({ begin, body });
    else {
      found.push({
        begin,
        body,
        name: m[1],
        was: m[2] === undefined ? [] : m[2].split(',').map((s) => s.trim()).filter(Boolean),
        purpose: m[3].trim(),
      });
    }
  });
  return found;
}

/**
 * The named fill-ins of `text`, in order. A fill-in is a project-owned block whose
 * begin marker carries a name, any former names, and its purpose. Unnamed blocks and
 * an unclosed begin are left out.
 * @param {string} text
 * @returns {{ name: string, was: string[], purpose: string, body: string[] }[]}
 */
export function fillIns(text) {
  return allBlocks(text)
    .filter((b) => b.name !== undefined)
    .map(({ name, was, purpose, body }) => ({ name, was, purpose, body }));
}

const collapse = (s) => s.replace(/\s+/g, ' ').trim();
const filled = (lines) => lines.some((l) => l.trim() !== '');

/**
 * An unnamed block of an earlier release read as items: `- <Label>:` lines and what
 * follows them. Comments are the shipped help and are dropped; non-blank lines before
 * the first item are one unlabelled chunk.
 * @param {string[]} body
 * @returns {{ label?: string, lines: string[] }[]}
 */
function itemsOf(body) {
  const items = [];
  let current = null;
  const close = () => {
    if (!current) return;
    while (current.lines.length && current.lines[current.lines.length - 1].trim() === '') {
      current.lines.pop();
    }
    if (current.label !== undefined || current.lines.length) items.push(current);
    current = null;
  };
  let i = 0;
  while (i < body.length) {
    const line = body[i];
    if (line.trim().startsWith('<!--')) {
      close();
      while (i < body.length && !body[i].includes('-->')) i += 1;
      i += 1;
      continue;
    }
    const m = /^- ([^:]+):(\s|$)/.exec(line);
    if (m) {
      close();
      current = { label: m[1].trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim() !== '') {
      current = { lines: [line] };
    }
    i += 1;
  }
  close();
  return items;
}

const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * `nextText` with the project's fill-ins carried into it by name, and a note for each
 * fill-in a reader has to look at. When `nextText` has no named fill-in this is
 * `carryBlocks`. Otherwise each named fill-in of `nextText` takes the body of the
 * project's fill-in of the same name, or of its first former name the project has;
 * unnamed blocks are carried by position and must agree in number. A project with no
 * named fill-in, whose unnamed blocks have nowhere to go by position, has them moved
 * into the named fill-ins: whole, when there is one block and one fill-in, else item by
 * item, each `- <Label>:` line to the fill-in named after its label.
 *
 * Notes, each with `kind`: `renamed` (from, name), `purpose` (name, was, now), `new`
 * (name, purpose), `moved` (from, name), `removed` (name, purpose, lines),
 * `unplaced` (lines).
 * @param {string} projectText
 * @param {string} nextText
 * @returns {{ text: string, mismatch: boolean, notes: object[] }}
 */
export function carryFillIns(projectText, nextText) {
  const next = allBlocks(nextText);
  const nextNamed = next.filter((b) => b.name !== undefined);
  if (nextNamed.length === 0) return { ...carryBlocks(projectText, nextText), notes: [] };

  const project = allBlocks(projectText);
  const projectNamed = project.filter((b) => b.name !== undefined);
  const projectUnnamed = project.filter((b) => b.name === undefined);
  const nextUnnamed = next.filter((b) => b.name === undefined);
  if (nextUnnamed.length > 0 && nextUnnamed.length !== projectUnnamed.length) {
    return { text: nextText, mismatch: true, notes: [] };
  }

  // The move: the project's blocks of an earlier release, read into the named fill-ins.
  const moved = new Map();
  const unplaced = [];
  if (projectNamed.length === 0 && projectUnnamed.length > 0 && nextUnnamed.length === 0) {
    if (projectUnnamed.length === 1 && nextNamed.length === 1) {
      moved.set(nextNamed[0].name, { from: 'the block', lines: projectUnnamed[0].body });
    } else {
      for (const block of projectUnnamed) {
        for (const item of itemsOf(block.body)) {
          const key = item.label === undefined ? undefined : slug(item.label);
          const target = key === undefined ? undefined : nextNamed.find((f) =>
            !moved.has(f.name) && (f.name === key || f.was.includes(key)));
          if (target) moved.set(target.name, { from: `"${item.label}"`, lines: item.lines });
          else unplaced.push({ kind: 'unplaced', lines: item.lines });
        }
      }
    }
  }

  const notes = [];
  const taken = new Set();
  const bodies = next.map((b) => {
    if (b.name === undefined) return null;
    const source = projectNamed.find((p) => p.name === b.name)
      ?? b.was.map((w) => projectNamed.find((p) => p.name === w)).find(Boolean);
    if (source) {
      taken.add(source);
      if (source.name !== b.name) notes.push({ kind: 'renamed', from: source.name, name: b.name });
      if (collapse(source.purpose) !== collapse(b.purpose)) {
        notes.push({ kind: 'purpose', name: b.name, was: source.purpose, now: b.purpose });
      }
      return source.body;
    }
    if (moved.has(b.name)) {
      const { from, lines } = moved.get(b.name);
      notes.push({ kind: 'moved', from, name: b.name });
      return lines;
    }
    notes.push({ kind: 'new', name: b.name, purpose: b.purpose });
    return b.body;
  });

  for (const p of projectNamed) {
    if (!taken.has(p) && filled(p.body)) {
      notes.push({ kind: 'removed', name: p.name, purpose: p.purpose, lines: p.body });
    }
  }
  if (projectNamed.length > 0) {
    for (const p of projectUnnamed) {
      // Carried by position when the new text has unnamed blocks of its own.
      if (nextUnnamed.length === 0 && filled(p.body)) {
        notes.push({ kind: 'unplaced', lines: p.body });
      }
    }
  }
  notes.push(...unplaced);

  let n = 0;
  let u = 0;
  const out = [];
  scan(nextText, (line) => out.push(line), () => {
    const body = bodies[n];
    out.push(...(body === null ? projectUnnamed[u++].body : body));
    n += 1;
  });
  return { text: out.join('\n'), mismatch: false, notes };
}

/** @param {string} rel A path relative to the project root, with `/` separators. */
function excluded(rel) {
  return EXCLUDED.some((item) => rel === item || rel.startsWith(`${item}/`));
}

/**
 * @param {string} absDir
 * @param {string} relDir Path of `absDir` relative to the project root.
 * @param {string[]} out
 */
function walk(absDir, relDir, out) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return;
    throw e;
  }
  for (const entry of entries) {
    const rel = `${relDir}/${entry.name}`;
    if (excluded(rel)) continue;
    if (entry.isDirectory()) walk(join(absDir, entry.name), rel, out);
    else if (entry.isFile()) out.push(rel);
  }
}

/**
 * Shipped files under `root`: sorted paths relative to the project root, `/`
 * separators, files only.
 * @param {string} root
 * @returns {string[]}
 */
export function shippedFiles(root) {
  const out = [];
  for (const relRoot of SHIPPED_ROOTS) {
    walk(join(root, ...relRoot.split('/')), relRoot, out);
  }
  for (const rel of SHIPPED_PATHS) {
    const abs = join(root, ...rel.split('/'));
    if (existsSync(abs) && statSync(abs).isFile()) out.push(rel);
  }
  out.sort();
  return out;
}

/**
 * The record object: the version, and every shipped path mapped to its fingerprint.
 * Keys of `files` are sorted. This is the object; the writer adds the JSON layout.
 * `source`, when given, sits between `version` and `files`: where this framework
 * came from, so a later update can fetch the next release from the same place.
 * @param {string} root
 * @param {string} version
 * @param {string} [source]
 * @returns {{ version: string, source?: string, files: Record<string, string> }}
 */
export function recordOf(root, version, source) {
  const files = {};
  for (const rel of shippedFiles(root)) {
    files[rel] = fingerprint(readFileSync(join(root, ...rel.split('/')), 'utf8'));
  }
  if (source === undefined) return { version, files };
  // The record is committed, so a token in a cloned URL (https://<token>@host/...)
  // must not reach it. An ssh address (git@host:path) has no scheme and is kept.
  return { version, source: source.replace(/^(https?:\/\/)[^@/]*@/, '$1'), files };
}

/**
 * One message per recorded file that exists and no longer matches its fingerprint.
 * No record means the project was set up before versions were recorded, which passes.
 * A recorded path the project has removed is left out, including when a directory
 * stands where the file was: a project may remove a command it cannot use.
 * @param {string} root
 * @returns {string[]}
 */
export function recordProblems(root) {
  const recordPath = join(root, '.tropis', 'installed.json');
  if (!existsSync(recordPath)) return [];
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  const problems = [];
  for (const [rel, recorded] of Object.entries(record.files)) {
    const abs = join(root, ...rel.split('/'));
    // A directory where the file was is the project removing it, same as absence.
    let info;
    try {
      info = statSync(abs);
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    if (!info.isFile()) continue;
    if (fingerprint(readFileSync(abs, 'utf8')) !== recorded) {
      problems.push(
        `${rel} was changed after it was installed. Framework files are replaced on update: move the change into a project-owned block, a rule additions file or a file of your own, or merge the ${rel}.new beside it.`,
      );
    }
  }
  return problems;
}
