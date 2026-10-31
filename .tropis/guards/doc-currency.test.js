// Level: unit
/**
 * Fails when a hand-written document asserts current state.
 *
 * A document either states timeless rules, or is generated from a source of truth and
 * guarded, or is labelled as a historical record. The fourth possibility — hand-written
 * prose asserting what the code currently does — is the one that rots, and it rotted
 * here for ten months while describing a subsystem that had been deleted.
 *
 * Three ways to satisfy this guard, in order of preference: generate the document,
 * rewrite the claim as a rule, or label the document as history.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';
import { fingerprint } from '../scripts/installed-files.js';

const here = dirname(fileURLToPath(import.meta.url));
// Installed at .tropis/guards/, two levels below the project root. Pointed at fixtures/
// by scripts/check-conformance.sh, so this guard can be seen to fail.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');

/**
 * Is this a file the framework installed, unchanged since? Read from
 * .tropis/installed.json. Such a file is not the project's to re-date: editing it would
 * turn installed-files red, so the staleness check leaves it to the next release. A file
 * changed since it was installed is checked like any other. No record, nothing skipped.
 */
function installedUnchanged() {
  const record = resolve(root, '.tropis/installed.json');
  if (!existsSync(record)) return () => false;
  const files = JSON.parse(readFileSync(record, 'utf8')).files ?? {};
  return (file, text) => files[relative(root, file)] === fingerprint(text);
}

/** Markers that assert a point-in-time claim rather than a durable rule. */
const CURRENCY_MARKERS = /✅|⚠️|❌|^Status:|\bCOMPLETED\b|\bNeeds review\b|\bWIP\b/m;

/** Exempt: generated output, and anything declaring itself a record. */
const GENERATED = /Generated from|Do not edit by hand/;
const HISTORICAL = /^>\s*\*\*Historical record\.\*\*/m;

function docsToCheck(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    // docs/superpowers/ is an archive of dated specs and plans by design.
    if (entry.isDirectory() && entry.name !== 'superpowers' && entry.name !== 'fixtures') docsToCheck(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

describe('document currency', () => {
  it('has no hand-written document asserting current state', () => {
    const offenders = [];
    for (const file of docsToCheck(resolve(root, 'docs'))) {
      const text = readFileSync(file, 'utf8');
      if (GENERATED.test(text) || HISTORICAL.test(text)) continue;
      if (CURRENCY_MARKERS.test(text)) offenders.push(file.replace(`${root}/`, ''));
    }
    expect(offenders).toEqual([]);
  });
});

/** How long a `Last verified` declaration stays trustworthy. Stated as
 *  "~45 days" in dispatch.md and refresh-model-tiers.md; this is that number. */
const STALE_AFTER_DAYS = 45;

/** A document declaring when it was last checked against the outside world. */
const LAST_VERIFIED = /Last verified:\s*(\d{4}-\d{2}-\d{2})/;

/** Every .md under a directory, recursively.
 *
 * Skips `worktrees/` and `fixtures/`, the way the scan above skips `superpowers/`.
 * A harness may place an agent's worktree at `.claude/worktrees/<id>`, and this
 * repository keeps a permanent one there — a whole second checkout, months old.
 * Walking into it scans another commit's documents as though they were this one's,
 * so a stale date in a checkout nobody is working on would fail the suite locally
 * while CI, which has no such directory, stayed green. `fixtures/` holds a sample
 * project with deliberately stale dates for the conformance check; scanning it
 * would fail every suite that has installed the tree.
 */
function claudeDocs(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'worktrees' && entry.name !== 'fixtures') claudeDocs(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

describe('framework staleness', () => {
  // ADR-003 says a document is generated and guarded, states timeless rules, or is
  // labelled history. A project's model picks, `docs/model-picks.md`, are none of
  // those and are exempt from being generated on purpose: it describes the outside
  // world — a model roster, prices, launch dates — and no source of truth in this
  // repository can produce it.
  //
  // That exemption is what this guard replaces. The file states its own staleness
  // rule and asks the reader to check the date, which is the mechanism ADR-003 was
  // written to stop trusting. The check is now mechanical.
  //
  // Scope note: `.claude/` is scanned for staleness declarations ONLY, not for the
  // CURRENCY_MARKERS above. No framework document trips those markers today; applying
  // them here is a separate change with separate consequences.
  it('has no framework document or model picks whose verification has gone stale', () => {
    const stale = [];
    const installed = installedUnchanged();
    const picks = resolve(root, 'docs/model-picks.md');
    const dated = [...claudeDocs(resolve(root, '.claude')), ...(existsSync(picks) ? [picks] : [])];
    for (const file of dated) {
      const text = readFileSync(file, 'utf8');
      if (installed(file, text)) continue;
      const match = text.match(LAST_VERIFIED);
      if (!match) continue;
      const ageDays = (Date.now() - Date.parse(match[1])) / 86_400_000;
      if (ageDays > STALE_AFTER_DAYS) {
        stale.push(
          `${file.replace(`${root}/`, '')} — verified ${match[1]}, `
          + `${Math.floor(ageDays)} days ago. Run /refresh-model-tiers.`,
        );
      }
    }
    expect(stale).toEqual([]);
  });
});
