// This repository's release-time rule trial: which rule file grew most since the last
// release, and whether the record of past trials is sound. Tested by
// guards/rule-trial.test.js. Not shipped to projects.
//   node .github/scripts/rule-trial.mjs growth <tag>     rule files by growth since the tag
//   node .github/scripts/rule-trial.mjs check [record]   check docs/rule-trials.md
// Starting the agent, removing the clause and landing the change stay in the command
// that runs this (/rule-trial).
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RECORD = 'docs/rule-trials.md';
const OUTCOMES = ['kept', 'removed', 'inconclusive', 'skipped'];
const TRIED_FIELDS = ['Rule file', 'Clause', 'Task', 'What the agent did', 'Ran on'];

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** @param {{ file: string, before: number, after: number }[]} rows */
export function rankGrowth(rows) {
  return rows
    .map((r) => ({ ...r, delta: r.after - r.before }))
    .sort((a, b) => b.delta - a.delta || a.file.localeCompare(b.file));
}

/**
 * Reads the record: `## ` headings, each with `- Name: value` fields. Indented lines
 * continue the field above; lines inside a ``` fence (the format example) are ignored.
 * @returns {{ heading: string, fields: Record<string, string>, clauses: number, line: number }[]}
 */
export function parseRecord(text) {
  const entries = [];
  let entry = null;
  let field = null;
  let fenced = false;
  text.split('\n').forEach((raw, i) => {
    if (/^\s*```/.test(raw)) { fenced = !fenced; return; }
    if (fenced) return;
    const heading = /^## (.+?)\s*$/.exec(raw);
    if (heading) {
      entry = { heading: heading[1], fields: {}, clauses: 0, line: i + 1 };
      entries.push(entry);
      field = null;
      return;
    }
    if (!entry) return;
    const start = /^- ([^:]+): ?(.*)$/.exec(raw);
    if (start) {
      field = start[1].trim();
      if (field === 'Clause') entry.clauses += 1;
      if (!(field in entry.fields)) entry.fields[field] = start[2].trim();
      else field = null;
      return;
    }
    if (field && /^ {2,}\S/.test(raw)) {
      entry.fields[field] = `${entry.fields[field]} ${raw.trim()}`.trim();
    } else if (raw.trim() === '') {
      field = null;
    }
  });
  return entries;
}

const bare = (s) => (s ?? '').replace(/`/g, '').trim();

/** @returns {string[]} one message per problem, each naming the heading; empty when sound */
export function recordProblems(entries) {
  const out = [];
  const seen = new Set();
  const kept = [];
  for (const e of entries) {
    const name = `"${e.heading}"`;
    if (!/^Since v\d+\.\d+\.\d+$/.test(e.heading)) {
      out.push(`${name}: a heading names the release the trial ran after, as "Since vX.Y.Z"`);
    }
    if (seen.has(e.heading)) out.push(`${name} appears twice: one trial per release`);
    seen.add(e.heading);
    if (e.clauses > 1) out.push(`${name} tries more than one clause: one per release`);
    const outcome = e.fields.Outcome;
    if (!OUTCOMES.includes(outcome)) {
      out.push(`${name}: Outcome must be kept, removed, inconclusive or skipped`);
      continue;
    }
    if (outcome === 'skipped') {
      if (!e.fields.Why) out.push(`${name}: missing Why`);
      continue;
    }
    for (const f of TRIED_FIELDS) if (!e.fields[f]) out.push(`${name}: missing ${f}`);
    const key = `${bare(e.fields['Rule file'])}\n${bare(e.fields.Clause)}`;
    const earlier = kept.find((k) => k.key === key);
    if (earlier && e.fields['Rule file'] && e.fields.Clause) {
      out.push(`${name} tries again a clause kept at "${earlier.heading}"`);
    }
    if (outcome === 'kept') kept.push({ key, heading: e.heading });
  }
  return out;
}

/** The non-skipped trials made from one rule file. */
export function triedFrom(entries, file) {
  return entries
    .filter((e) => e.fields.Outcome !== 'skipped' && bare(e.fields['Rule file']) === file)
    .map((e) => ({ heading: e.heading, outcome: e.fields.Outcome, clause: e.fields.Clause }));
}

function git(args) {
  return spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function words(rev, file) {
  const r = git(['show', `${rev}:${file}`]);
  return r.status === 0 ? wordCount(r.stdout) : 0;
}

function ruleFiles(rev) {
  const r = git(['ls-tree', '--name-only', rev, 'rules/']);
  return r.status === 0 ? r.stdout.split('\n').filter((f) => f.endsWith('.md')) : [];
}

function fail(message) {
  process.stdout.write(`${message}\n`);
  process.exit(1);
}

function readRecord(file) {
  return existsSync(file) ? parseRecord(readFileSync(file, 'utf8')) : [];
}

function cmdCheck(file = RECORD) {
  const entries = readRecord(file);
  const problems = recordProblems(entries);
  if (problems.length) fail(problems.join('\n'));
  process.stdout.write(`rule-trials: ${entries.length} trials, no problems\n`);
}

function cmdGrowth(tag) {
  if (!tag || git(['rev-parse', '--verify', '--quiet', `${tag}^{commit}`]).status !== 0) {
    fail(`${tag} is not a commit here`);
  }
  const entries = readRecord(RECORD);
  const problems = recordProblems(entries);
  if (problems.length) fail(problems.join('\n'));
  const files = new Set([...ruleFiles('HEAD'), ...ruleFiles(tag)]);
  const rows = rankGrowth([...files].map((file) => ({
    file, before: words(tag, file), after: words('HEAD', file),
  })));
  const width = Math.max(...rows.map((r) => r.file.length), 0);
  const num = Math.max(...rows.flatMap((r) => [String(r.before).length, String(r.after).length]), 1);
  const lines = [`Rule files since ${tag}, by growth in words:`];
  for (const r of rows) {
    const sign = r.delta >= 0 ? '+' : '-';
    lines.push(`  ${r.file.padEnd(width)}  ${String(r.before).padStart(num)} → `
      + `${String(r.after).padStart(num)}  ${sign}${Math.abs(r.delta)}`);
  }
  const top = rows[0];
  if (top) {
    const tried = triedFrom(entries, top.file);
    if (tried.length) {
      lines.push(`Tried before from ${top.file}:`);
      for (const t of tried) lines.push(`  ${t.heading}  ${t.outcome}  ${t.clause}`);
    } else {
      lines.push(`Nothing tried before from ${top.file}.`);
    }
  }
  if (!top || top.delta <= 0) lines.push(`No rule file grew since ${tag}: record a skipped trial.`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'check') cmdCheck(arg);
  else if (cmd === 'growth') cmdGrowth(arg);
  else fail('usage: rule-trial.mjs growth <tag> | check [record]');
}

const invoked = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invoked) main();
