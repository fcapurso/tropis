// Level: unit
/**
 * Fails when a flush has run and the upstream queue was not drained.
 *
 * A flush plan's drain task removes the submitted and declined entries from
 * docs/BLUEPRINT-UPSTREAM.md, keeps the held ones, and sets `Last flushed` to the flush
 * date. Skipped, the queue still lists what was sent, and the next flush sends it again.
 * A flush plan has run once its handover report is written; the queue's date must then
 * be no earlier than the latest such plan's.
 *
 * Installed in every set-up project at .tropis/guards/. With no flush plan that has run,
 * or no queue, there is nothing to check.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// Installed at .tropis/guards/, two levels below the project root. Pointed at fixtures/
// by scripts/check-conformance.sh, so this guard can be seen to fail.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');
const plansDir = resolve(root, 'docs/superpowers/plans');
const queue = 'docs/BLUEPRINT-UPSTREAM.md';

/** Blank out fenced code blocks, preserving line count: a plan may quote a heading. */
function stripFences(text) {
  let inFence = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

describe('the upstream queue after a flush', () => {
  it('is drained once a flush plan has run', () => {
    const queuePath = resolve(root, queue);
    if (!existsSync(plansDir) || !existsSync(queuePath)) return;
    const ran = readdirSync(plansDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}-flush-upstream\.md$/.test(f))
      .filter((f) => /^## Handover report/m.test(stripFences(readFileSync(join(plansDir, f), 'utf8'))))
      .sort();
    if (ran.length === 0) return;
    const latest = ran[ran.length - 1];
    const flushDate = latest.slice(0, 10);
    const flushed = (readFileSync(queuePath, 'utf8').match(/Last flushed:\s*(\d{4}-\d{2}-\d{2})/) || [])[1];
    const problems = [];
    if (!flushed || flushed < flushDate) {
      const state = flushed ? `Last flushed is ${flushed}` : 'has no Last flushed date';
      problems.push(
        `${queue}: ${state}, but the flush plan ${latest} has run. Drain the queue as that `
        + `plan's drain task says, and set "Last flushed: ${flushDate}."`,
      );
    }
    expect(problems).toEqual([]);
  });
});
