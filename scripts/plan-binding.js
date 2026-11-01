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
 * Every path a plan's File Structure section claims it will touch: the first backticked
 * span of each table row under that heading. Prose and bullets there are not claims —
 * a plan may name a file it deliberately leaves alone.
 * @param {string} markdown
 * @returns {string[]}
 */
export function fileStructurePaths(markdown) {
  const section = extractSection(markdown, 'File Structure');
  if (section == null) return [];
  return [...section.matchAll(/^\|\s*`([^`]+)`/gm)].map((m) => m[1]);
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
];

/**
 * The plan's three header fields, each read from the line it starts on to the end of its
 * paragraph (a blank line, or a line starting with bold, ends it). A field is written
 * `**Name:** value` or with the bold spanning the colon, `**Name: value.**`. Tier and
 * merge authority keep the text before the first full stop; Requires keeps all of it.
 * `line` is the 1-based line the field starts on, null when the plan has no such field.
 * @param {string} markdown
 * @returns {Record<'tier'|'merge'|'requires', {value: string, line: number|null}>}
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
 * }} opts
 * @returns {string}
 */
export function renderThinPrompt(opts) {
  const { planPath, protocol, repos, picks, lastVerified, stale, setups = [], here = '' } = opts;
  const lines = [
    `**Tier:** ${protocol.tier} · **Requires:** ${protocol.requires} · **Merge:** ${protocol.merge}`,
  ];
  // No picks file means the project has never refreshed: name no models rather than
  // invent them. The framework ships none.
  if (picks === null) {
    lines.push('**Picks today:** none — this project has no `docs/model-picks.md`. Run /refresh-model-tiers to write it.');
  } else {
    lines.push(`**Picks today:** ${picks}`);
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
