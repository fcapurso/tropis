// Shared machinery: no part of this file is project-owned.
/**
 * The rules a dispatchable plan must satisfy, and the thin prompt that hands it over.
 *
 * One copy, read by three things: the dispatch command, the isolation helper, and the
 * guard that checks every plan claiming to be dispatchable. Before this module the
 * guard carried its own copy of the rules, so the guard and the command could disagree
 * about the same plan without either being wrong on its own.
 *
 * Pure: strings in, values out. No file or process access, so a guard can import it.
 */

import { projectionOf, AREAS_FILE } from './projections.js';

/**
 * The body under `## <heading>` up to the next `## ` or the end. Missing → null.
 * @param {string} markdown
 * @param {string} heading
 * @returns {string|null}
 */
export function extractSection(markdown, heading) {
  const re = new RegExp(`^## ${heading}\\s*$`, 'm');
  const m = re.exec(markdown);
  if (!m) return null;
  const rest = markdown.slice(m.index + m[0].length);
  const next = /^## /m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

/**
 * Every path a plan's File Structure section claims it will touch: each backticked span
 * in the first cell of each table row under that heading, so a row may list several
 * files. Prose and bullets there are not claims — a plan may name a file it deliberately
 * leaves alone — and nothing after the first cell is read.
 * @param {string} markdown
 * @returns {string[]}
 */
export function fileStructurePaths(markdown) {
  const section = extractSection(markdown, 'File Structure');
  if (section == null) return [];
  return section.split('\n')
    .filter((line) => /^\|\s*`/.test(line))
    .flatMap((line) => [...line.split('|')[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]));
}

/**
 * Source files the File Structure table lists without what the rule generator writes from
 * them, each paired with the missing file — "missing .mdc" is not actionable, "tests.md is
 * projected to tests.mdc, which is not listed" is. Listing the areas file asks for both
 * files of every shipped rule, so `shipped` names them; without it that case asks for
 * nothing. Meaningful only in a project that generates its rules; the caller decides that.
 * @param {string} markdown
 * @param {string[]} [shipped] Names of the shipped rules.
 * @returns {Array<{source: string, projection: string}>}
 */
export function missingProjections(markdown, shipped = []) {
  const listed = fileStructurePaths(markdown);
  const have = new Set(listed);
  const missing = [];
  for (const source of listed) {
    const written = source === AREAS_FILE
      ? shipped.flatMap((n) => [`.claude/rules/${n}.md`, `.cursor/rules/${n}.mdc`])
      : projectionOf(source);
    for (const projection of written) {
      if (!have.has(projection)) missing.push({ source, projection });
    }
  }
  return missing;
}

/**
 * The rows of a Repositories table: checkout, role, isolation command ('' for none).
 * @param {string|null} section
 * @returns {Array<{checkout: string, role: string, isolation: string}>}
 */
export function parseRepositories(section) {
  if (!section) return [];
  const rows = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const [checkout, role, isolationRaw] = cells;
    if (/^checkout$/i.test(checkout)) continue;
    if (cells.every((c) => /^:?-+:?$/.test(c.replace(/\s/g, '')))) continue;
    let isolation = isolationRaw ?? '';
    isolation = ['', '—', '-'].includes(isolation) ? '' : isolation.replace(/^`+|`+$/g, '');
    rows.push({ checkout, role, isolation });
  }
  return rows;
}

/**
 * A sibling worktree — `git worktree add ../…` — and never one nested inside the
 * repository, where a second install puts a second copy of every tool in the path.
 * @param {string} isolation
 * @returns {boolean}
 */
export function isSiblingWorktree(isolation) {
  if (!isolation) return false;
  if (isolation.includes('.claude/worktrees')) return false;
  return isolation.includes('git worktree add ../');
}

/**
 * The commit a `git worktree add` isolation command branches from: its start point, or
 * HEAD when it gives none. Flags that take a value (`-b`, `-B`, `--reason`) are skipped
 * with that value; the first remaining word is the path, the second the start point.
 * @param {string} isolation
 * @returns {string}
 */
export function isolationBase(isolation) {
  const words = isolation.trim().split(/\s+/).slice(3);
  const rest = [];
  for (let i = 0; i < words.length; i++) {
    if (['-b', '-B', '--reason'].includes(words[i])) i++;
    else if (!words[i].startsWith('-')) rest.push(words[i]);
  }
  return rest[1] ?? 'HEAD';
}

/**
 * The directory a Repositories row names: the first backticked span of its checkout
 * cell — "app (`my-app`)" → "my-app" — or the cell itself when it has none.
 * @param {string} cell
 * @returns {string}
 */
export function checkoutName(cell) {
  const m = cell.match(/`([^`]+)`/);
  return (m ? m[1] : cell).trim();
}

/**
 * Whether a plan can be dispatched, and every reason it cannot.
 * @param {string} markdown
 * @returns {{ok: boolean, errors: string[], repos: Array<{checkout: string, role: string, isolation: string}>}}
 */
export function validateDispatchable(markdown) {
  const errors = [];
  const reposSection = extractSection(markdown, 'Repositories');
  for (const heading of ['Repositories', 'Global Constraints', 'Traps', 'Delivers']) {
    if (extractSection(markdown, heading) == null) errors.push(`Missing heading: ${heading}`);
  }

  const repos = parseRepositories(reposSection);
  if (reposSection != null && !repos.some((r) => /execute here/i.test(r.role))) {
    errors.push('Repositories must include an execute here row');
  }

  for (const row of repos) {
    if (/do not edit/i.test(row.role)) continue;
    if (!isSiblingWorktree(row.isolation)) {
      errors.push(
        `Isolation for "${row.checkout}" must be a sibling worktree (git worktree add ../…), not nested`,
      );
    }
  }

  // The isolation cell is a command field, not a prose field: a cell carrying a note
  // after the command will not match, and a plan that merely quotes a worktree command
  // it is not declaring fails the same way. Both are deliberate — the alternative is a
  // scan that reads a declaration into any example.
  const cells = new Set(repos.map((r) => r.isolation).filter(Boolean));
  const cmds = markdown.match(/`git worktree add [^`]+`|git worktree add \S+(?:\s+-b\s+\S+)?/g) || [];
  for (const raw of cmds) {
    const cmd = raw.replace(/^`+|`+$/g, '');
    if (!cells.has(cmd)) errors.push(`Worktree command not in Repositories isolation: ${cmd}`);
  }

  // A field that is there and reads nothing is a mistake the reader would otherwise pass
  // on silently: the executor starts without what the field was meant to tell it.
  const fields = headerFields(markdown);
  for (const { key, name } of HEADER_FIELDS) {
    const { value, line } = fields[key];
    if (line !== null && value === '') {
      errors.push(`Header field "${name}" on line ${line} reads empty: write it as **${name}:** followed by its value`);
    }
  }

  return { ok: errors.length === 0, errors, repos };
}

const HEADER_FIELDS = [
  { key: 'tier', name: 'Model tier', cut: true },
  { key: 'merge', name: 'Merge authority', cut: true },
  { key: 'requires', name: 'Requires', cut: false },
  { key: 'mergesAfter', name: 'Merges after', cut: false },
];

/**
 * The plan's header fields, each read from the line it starts on to the end of its
 * paragraph (a blank line, or a line starting with bold, ends it). A field is written
 * `**Name:** value` or with the bold spanning the colon, `**Name: value.**`. Tier and
 * merge authority keep the text before the first full stop; Requires and Merges after keep
 * all of it.
 * `line` is the 1-based line the field starts on, null when the plan has no such field.
 * @param {string} markdown
 * @returns {Record<'tier'|'merge'|'requires'|'mergesAfter', {value: string, line: number|null}>}
 */
export function headerFields(markdown) {
  const text = markdown.split('\n');
  const result = {};
  for (const { key, name, cut } of HEADER_FIELDS) {
    result[key] = { value: '', line: null };
    const start = text.findIndex((l) => new RegExp(`^ *\\*\\*${name}(:\\*\\*|\\*\\*:|:)`).test(l));
    if (start === -1) continue;
    const para = [text[start]];
    for (let i = start + 1; i < text.length; i++) {
      if (text[i].trim() === '' || /^ *\*\*/.test(text[i])) break;
      para.push(text[i]);
    }
    const joined = para.map((l) => l.trim()).join(' ').trim();
    let rest = joined.slice(joined.indexOf(name) + name.length);
    if (rest.startsWith(':**')) rest = rest.slice(3);
    else if (rest.startsWith('**:')) rest = rest.slice(3);
    else {
      rest = rest.slice(1);
      const close = rest.indexOf('**');
      if (close !== -1) rest = rest.slice(0, close);
    }
    rest = rest.trim();
    if (cut) {
      const stop = rest.indexOf('. ');
      if (stop !== -1) rest = rest.slice(0, stop);
      rest = rest.replace(/\.$/, '');
    }
    result[key] = { value: rest.trim(), line: start + 1 };
  }
  return result;
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The entry ids in the plan's `Merges after` field, in order, without duplicates.
 * @param {string} markdown
 * @returns {string[]}
 */
export function mergesAfterIds(markdown) {
  const { value } = headerFields(markdown).mergesAfter;
  return [...new Set(value.split(/[\s,]+/).filter((t) => ID.test(t)))];
}

/**
 * The catalog ids under `## Delivers`: one per line or comma separated, an optional
 * leading `-` or `*`, comments ignored, `None.` for no ids.
 * @param {string} markdown
 * @returns {string[]}
 */
export function deliversIds(markdown) {
  const section = extractSection(markdown.replace(/<!--[\s\S]*?-->/g, ''), 'Delivers');
  if (section == null || section === 'None.') return [];
  const ids = [];
  for (const line of section.split('\n')) {
    for (const part of line.split(',')) {
      const token = part.trim().replace(/^[-*]\s*/, '');
      if (ID.test(token)) ids.push(token);
    }
  }
  return ids;
}

/** Index one past the last line of the header paragraph starting at `start`. */
function paragraphEnd(lines, start) {
  let i = start + 1;
  while (i < lines.length && lines[i].trim() !== '' && !/^ *\*\*/.test(lines[i])) i++;
  return i;
}

/**
 * The plan with its header saying it merges after the ids it already names plus `ids`:
 * existing ids first, then new ones in the order given; never removes one. An existing
 * field is replaced whole by one line; otherwise the line is a paragraph of its own after
 * the last of Requires, Merge authority and Model tier, or before the first `## ` heading.
 * Byte for byte the input when nothing is new.
 * @param {string} markdown
 * @param {string[]} ids
 * @returns {string}
 */
export function withMergesAfter(markdown, ids) {
  const have = mergesAfterIds(markdown);
  const all = [...new Set([...have, ...ids])];
  if (all.length === have.length) return markdown;
  const line = `**Merges after:** ${all.join(', ')}`;
  const lines = markdown.split('\n');
  const startOf = (name) => lines.findIndex((l) => new RegExp(`^ *\\*\\*${name}(:\\*\\*|\\*\\*:|:)`).test(l));
  const existing = startOf('Merges after');
  if (existing !== -1) {
    lines.splice(existing, paragraphEnd(lines, existing) - existing, line);
    return lines.join('\n');
  }
  const anchors = ['Requires', 'Merge authority', 'Model tier'].map(startOf).filter((i) => i !== -1);
  let at;
  if (anchors.length) {
    at = paragraphEnd(lines, Math.max(...anchors));
  } else {
    at = lines.findIndex((l) => l.startsWith('## '));
    if (at === -1) at = lines.length;
  }
  lines.splice(at, 0, ...(at > 0 && lines[at - 1].trim() !== '' ? [''] : []), line,
    ...(at >= lines.length || lines[at]?.trim() !== '' ? [''] : []));
  return lines.join('\n');
}

/**
 * Tier, merge authority and requirements as the plan states them.
 * @param {string} markdown
 * @returns {{tier: string, merge: string, requires: string}}
 */
export function parseExecutionProtocol(markdown) {
  const f = headerFields(markdown);
  return { tier: f.tier.value, merge: f.merge.value, requires: f.requires.value };
}

/**
 * @param {string} tiersText
 * @returns {string|null}
 */
export function parseLastVerified(tiersText) {
  const m = tiersText.match(/Last verified:\s*(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Older than the ~45 days the roster itself says it stays trustworthy.
 * @param {string} iso
 * @param {Date} now
 * @returns {boolean}
 */
export function isStale(iso, now) {
  return (now.getTime() - Date.parse(`${iso}T00:00:00Z`)) / 86400000 > 45;
}

function normalizeTier(name) {
  return name.toLowerCase().replace(/[-–]/g, '–');
}

/**
 * The models the roster lists for a tier, from its `| Tier | Models |` table only.
 * @param {string} tiersText
 * @param {string} tier
 * @returns {string}
 */
export function picksForTier(tiersText, tier) {
  const parts = tiersText.split(/\| Tier \| Models \|/);
  if (parts.length < 2) return '';
  const want = normalizeTier(tier || '');
  for (const line of parts.slice(1).join('| Tier | Models |').split('\n')) {
    if (!line.includes('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (normalizeTier(cells[0].replace(/\*\*/g, '').trim()) === want) return cells[1].trim();
  }
  return '';
}

const TIER_ORDER = ['Small', 'Small–medium', 'Medium', 'Medium–large', 'Large'];

/** True when `name` is a tier, matched as `pickToUse` matches it. */
export function isTier(name) {
  return TIER_ORDER.some((t) => normalizeTier(t) === normalizeTier(name || ''));
}

/** What `/dispatch` and `dispatch.mjs --tier` print when a project has no picks file. */
export const NO_PICKS_USE = '**Use:** not chosen — this project has no model picks. Run /refresh-model-tiers.';
const INCLUSION_HEADER = '| Model | Usage per task | Included on |';

/** A name with any parenthesised note and the spaces around it removed, lower-cased. */
function bareName(text) {
  return text.replace(/\([^)]*\)/g, '').trim().toLowerCase();
}

/**
 * The subscriptions the developer holds, from the local record: one `<tool>: <value>`
 * line per tool, `none` for a tool with no subscription. Blank lines, `#` lines and
 * lines of any other shape are ignored.
 * @param {string} text
 * @returns {Map<string, Set<string>>} lower-cased tool → lower-cased subscriptions
 */
export function parseSubscriptions(text) {
  const held = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (!m) continue;
    const value = bareName(m[2]);
    held.set(m[1].trim().toLowerCase(), value === 'none' || value === '' ? new Set() : new Set([value]));
  }
  return held;
}

/**
 * Which subscriptions of each tool include each model, from the picks file's
 * `| Model | Usage per task | Included on |` table. Null when the file has no such table.
 * @param {string} picksText
 * @returns {Map<string, Map<string, {name: string, subscriptions: Set<string>}>>|null}
 */
export function inclusionTable(picksText) {
  const all = picksText.split('\n');
  const start = all.findIndex((l) => l.startsWith(INCLUSION_HEADER));
  if (start === -1) return null;
  const table = new Map();
  for (const line of all.slice(start + 1)) {
    if (!line.startsWith('|')) break;
    if (/^\|\s*-{3}/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const tools = new Map();
    // A note in parentheses may hold a comma or semicolon; drop it before splitting.
    for (const part of cells[2].replace(/\([^)]*\)/g, '').split(';')) {
      const m = part.match(/^([^:]+):\s*(.*)$/);
      if (!m) continue;
      const name = m[1].trim();
      const subscriptions = new Set(
        m[2].split(',').map((x) => x.trim().toLowerCase()).filter((x) => x !== '' && x !== 'none'),
      );
      tools.set(name.toLowerCase(), { name, subscriptions });
    }
    table.set(cells[0], tools);
  }
  return table;
}

/**
 * Each model the tier table lists for the tier at `from` in the tier order and every
 * tier above it — tier by tier, each in the table's own order — with the tier it is
 * listed in. A model listed in two tiers keeps the first.
 * @param {string} picksText
 * @param {number} from
 * @returns {{model: string, tier: string}[]}
 */
function picksFrom(picksText, from) {
  const seen = new Set();
  const out = [];
  for (let i = from; i < TIER_ORDER.length; i++) {
    const models = picksForTier(picksText, TIER_ORDER[i])
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part !== '' && !/^(or\s+)?any pick from a higher tier\.?$/i.test(part))
      .map((part) => part.replace(/\s*\*\([^)]*\)\*\s*$/, ''));
    for (const model of models) {
      if (seen.has(model)) continue;
      seen.add(model);
      out.push({ model, tier: TIER_ORDER[i] });
    }
  }
  return out;
}

/**
 * Each model's usage per task, from the first dollar figure in its `Usage per task`
 * cell of the picks file's inclusion table; null where the cell has none, such as
 * `unmeasured`. Empty when the file has no such table.
 * @param {string} picksText
 * @returns {Map<string, number|null>}
 */
export function usagePerTask(picksText) {
  const all = picksText.split('\n');
  const start = all.findIndex((l) => l.startsWith(INCLUSION_HEADER));
  const usage = new Map();
  if (start === -1) return usage;
  for (const line of all.slice(start + 1)) {
    if (!line.startsWith('|')) break;
    if (/^\|\s*-{3}/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const m = cells[1].match(/\$\s*(\d[\d,]*(?:\.\d+)?)/);
    usage.set(cells[0], m ? Number(m[1].replace(/,/g, '')) : null);
  }
  return usage;
}

/**
 * The candidate whose usage per task is least. One with no figure ranks after every one
 * with a figure; on a tie the earlier candidate wins, so the plan's own tier comes before
 * a tier above it. Null when there is no candidate.
 * @template {{model: string}} T
 * @param {T[]} candidates in the order `picksFrom` gives
 * @param {Map<string, number|null>} usage
 * @returns {(T & {cost: number|null})|null}
 */
function cheapest(candidates, usage) {
  let best = null;
  for (const candidate of candidates) {
    const cost = usage.get(candidate.model) ?? null;
    if (best === null || (cost !== null && (best.cost === null || cost < best.cost))) {
      best = { ...candidate, cost };
    }
  }
  return best;
}

/**
 * The prompt line naming the pick to run a plan on: of the picks for the plan's tier and
 * every tier above it that one of the developer's recorded subscriptions includes
 * without a charge on top (FW-053), the one whose usage per task is least (FW-070).
 * Null when the tier is not one of the five.
 * @param {string} picksText
 * @param {string} tier
 * @param {string|null} subscriptionsText the local record, or null when there is none
 * @returns {string|null}
 */
export function pickToUse(picksText, tier, subscriptionsText) {
  const from = TIER_ORDER.findIndex((t) => normalizeTier(t) === normalizeTier(tier || ''));
  if (from === -1) return null;
  const included = inclusionTable(picksText);
  if (included === null) {
    return '**Use:** not chosen — the picks do not say which subscriptions include each model. Run /refresh-model-tiers.';
  }
  const held = subscriptionsText === null ? new Map() : parseSubscriptions(subscriptionsText);
  if (held.size === 0) {
    return '**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers, or set TROPIS_SUBSCRIPTIONS.';
  }
  const candidates = [];
  for (const { model, tier: listedIn } of picksFrom(picksText, from)) {
    for (const [key, { name, subscriptions }] of included.get(model) ?? []) {
      const mine = held.get(key);
      if (mine && [...mine].some((sub) => subscriptions.has(sub))) {
        candidates.push({ model, tier: listedIn, name });
        break;
      }
    }
  }
  const best = cheapest(candidates, usagePerTask(picksText));
  if (best === null) {
    return '**Use:** none — no pick for this tier or above is included in your subscriptions, and a model that costs extra is not used (FW-053).';
  }
  return best.cost === null
    ? `**Use:** ${best.model}, in ${best.name} — no included pick for this tier or above has a usage figure, so this is the first one, from the ${best.tier} tier.`
    : `**Use:** ${best.model}, in ${best.name} — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the ${best.tier} tier.`;
}

/**
 * The command-line names the picks file's inclusion table gives in its `Command-line
 * name` column (`<tool>: <name>; <tool>: <name>`, `none` where a tool lacks the model).
 * @param {string} picksText
 * @returns {Map<string, Map<string, string>>} model → lower-cased tool → name
 */
function commandLineNames(picksText) {
  const all = picksText.split('\n');
  const start = all.findIndex((l) => l.startsWith(INCLUSION_HEADER));
  const names = new Map();
  if (start === -1) return names;
  for (const line of all.slice(start + 1)) {
    if (!line.startsWith('|')) break;
    if (/^\|\s*-{3}/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    const tools = new Map();
    for (const part of cells[3].replace(/\([^)]*\)/g, '').split(';')) {
      const m = part.match(/^([^:]+):\s*(.*)$/);
      if (m) tools.set(m[1].trim().toLowerCase(), m[2].trim());
    }
    names.set(cells[0], tools);
  }
  return names;
}

/**
 * The model a tool's command line should start a run of this tier on: of the picks for
 * the tier and every tier above it that the recorded subscription *in that tool*
 * includes, the one whose usage per task is least (FW-070), by its command-line name for
 * that tool. `model` is that name, or null with `reason` saying why none could be named.
 * @param {string|null} picksText the picks file, or null when there is none
 * @param {string} tier
 * @param {string|null} subscriptionsText the local record, or null when there is none
 * @param {string} toolName as the Included on cells write it, such as "Claude Code"
 * @returns {{model: string|null, pick: string|null, reason: string|null}}
 */
export function pickForTool(picksText, tier, subscriptionsText, toolName) {
  const fail = (reason, pick = null) => ({ model: null, pick, reason });
  const refresh = ' Run /refresh-model-tiers.';
  if (picksText === null) return fail(`this project has no model picks.${refresh}`);
  const included = inclusionTable(picksText);
  if (included === null) return fail(`the picks do not say which subscriptions include each model.${refresh}`);
  const key = toolName.toLowerCase();
  const mine = subscriptionsText === null ? undefined : parseSubscriptions(subscriptionsText).get(key);
  if (mine === undefined) {
    return fail(`which ${toolName} subscription you have is not recorded on this machine.${refresh}`);
  }
  const from = TIER_ORDER.findIndex((t) => normalizeTier(t) === normalizeTier(tier || ''));
  const candidates = picksFrom(picksText, Math.max(from, 0)).filter(({ model }) => {
    const entry = included.get(model)?.get(key);
    return entry !== undefined && [...mine].some((sub) => entry.subscriptions.has(sub));
  });
  const best = cheapest(candidates, usagePerTask(picksText));
  if (best === null) {
    return fail(`no ${tier} pick or above is included in your ${toolName} subscription, and a model that costs extra is not used (FW-053).`);
  }
  const name = commandLineNames(picksText).get(best.model)?.get(key);
  if (!name || name.toLowerCase() === 'none') {
    return fail(`the picks do not give ${toolName}'s name for ${best.model}.${refresh}`, best.model);
  }
  return { model: name, pick: best.model, reason: null };
}

/** A checkout's own worktree setup, read by the dispatch command. */
export const WORKTREE_SETUP = '.tropis/worktree-setup.txt';
// A checkout on a release before this one keeps its setup here.
export const OLD_WORKTREE_SETUP = '.claude/worktree-setup.txt';

/**
 * The steps in a worktree setup file: one command per line, in order. Blank lines and
 * lines starting with `#` are not steps. No steps → null, and the prompt falls back to
 * the framework's install.
 * @param {string} text
 * @returns {string[]|null}
 */
export function parseWorktreeSetup(text) {
  const steps = text.split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('#'));
  return steps.length > 0 ? steps : null;
}

/**
 * The thin kick-off prompt. It points at the plan rather than restating it: the plan is
 * self-contained, and a second copy of its constraints in the prompt is a copy that can
 * disagree with it.
 * @param {{
 *   planPath: string,
 *   protocol: {tier: string, merge: string, requires: string},
 *   repos: Array<{checkout: string, role: string, isolation: string}>,
 *   picks: string|null,
 *   lastVerified: string,
 *   stale: boolean,
 *   setups?: Array<{checkout: string, steps: string[]|null}>,
 *   here?: string,
 *   use?: string|null,
 * }} opts
 * @returns {string}
 */
export function renderThinPrompt(opts) {
  const { planPath, protocol, repos, picks, lastVerified, stale, setups = [], here = '', use = null } = opts;
  const lines = [
    `**Tier:** ${protocol.tier} · **Requires:** ${protocol.requires} · **Merge:** ${protocol.merge}`,
  ];
  // No picks file means the project has never refreshed: name no models rather than
  // invent them. The framework ships none.
  if (picks === null) {
    lines.push('**Picks today:** none — this project has no `docs/model-picks.md`. Run /refresh-model-tiers to write it.');
  } else {
    lines.push(`**Picks today:** ${picks}`);
    if (use !== null) lines.push(use);
    lines.push(`**Last verified: ${lastVerified}** (\`docs/model-picks.md\`)`);
    if (stale) {
      lines.push('Picks are older than ~45 days — run /refresh-model-tiers before trusting them.');
    }
  }
  lines.push('');
  const executeCheckouts = repos.filter((r) => /execute here/i.test(r.role)).map((r) => r.checkout);
  lines.push(`Execute ${planPath} in ${executeCheckouts.join(' and ')}.`);
  lines.push(
    'Read the whole plan before starting. Its Global Constraints and Traps bind you, '
    + 'and it says what to report and who merges.',
  );
  lines.push('');
  // A session may start with only this checkout, as a cloud session does; the helper
  // looks for the others beside it and refuses when one is missing.
  const commands = repos.filter((r) => r.isolation);
  const others = commands.map((r) => checkoutName(r.checkout)).filter((name) => name !== here);
  if (commands.length > 1 && others.length > 0) {
    lines.push(
      'Before isolating: this session may have started with only this checkout, as a cloud session does. '
      + 'For each checkout below that is not already beside this one, attach it with your tool for adding '
      + 'a repository to the session, where you have one, and clone it beside this one under exactly this directory name:',
    );
    for (const name of others) lines.push(`  - ${name}`);
    lines.push('');
  }
  lines.push(
    "Isolate (from the Repositories table), then work in the execute-here worktree — not the specifying session's directory:",
  );
  lines.push(`  bash .tropis/scripts/isolate-for-plan.sh ${planPath}`);
  lines.push('');
  // A checkout may need more than the framework's install before its suite can run — a
  // submodule, its own dependencies — and lists it in its own worktree setup file.
  if (setups.every((s) => s.steps === null)) {
    lines.push('In each worktree it creates that has a .tropis/ folder, before running anything else:');
    lines.push('  npm --prefix .tropis ci');
  } else {
    lines.push('Before running anything else, set up each worktree it creates:');
    for (const { checkout, steps } of setups) {
      if (steps === null) {
        lines.push(`  In ${checkout}, if it has a .tropis/ folder:`);
        lines.push('    npm --prefix .tropis ci');
      } else {
        lines.push(`  In ${checkout}:`);
        for (const step of steps) lines.push(`    ${step}`);
      }
    }
  }
  // Listed to show what isolation will do, NOT as commands to run. Unlabelled under the
  // isolate line they read as a command list — and running them by hand from one
  // checkout is the defect the helper exists to prevent: every worktree lands in
  // whichever repository you are standing in.
  if (commands.length) {
    lines.push('');
    lines.push(
      'That helper runs the following, each in the checkout its row names. Do not run '
      + 'them yourself — from one checkout they all land in that one:',
    );
    for (const row of commands) lines.push(`  - ${row.checkout}: ${row.isolation}`);
  }
  // A plan that edits two checkouts must be verified in both, and plans have named the
  // second in their tasks and listed checks for only the first.
  if (executeCheckouts.length > 1) {
    lines.push('');
    lines.push(
      `Verify in EACH execute-here checkout (${executeCheckouts.join(', ')}), not just the first — `
      + 'a suite you did not run is not a suite that passed.',
    );
  }
  return lines.join('\n');
}
