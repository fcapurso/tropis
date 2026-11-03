// Shared machinery: no part of this file is project-owned.
/**
 * Which subscriptions the developer holds, as text for `parseSubscriptions`.
 *
 * The local record, `<git common dir>/tropis/subscriptions.txt`, wins where it exists.
 * A fresh clone has none, because the record is personal and never committed; a session
 * there, such as a cloud session, is told through the environment variable
 * `TROPIS_SUBSCRIPTIONS`, the same `<tool>: <subscription>` lines separated by `;`. Set
 * it in that environment's settings, never in a committed file.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

/**
 * @param {string} root the project root
 * @param {Record<string, string|undefined>} [env]
 * @returns {string|null} the record's text, or null when neither source says anything
 */
export function readSubscriptions(root, env = process.env) {
  const g = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: root, encoding: 'utf8' });
  if (g.status === 0) {
    try {
      return readFileSync(join(resolve(root, g.stdout.trim()), 'tropis/subscriptions.txt'), 'utf8');
    } catch {
      // No local record: fall through to the variable.
    }
  }
  const given = (env.TROPIS_SUBSCRIPTIONS ?? '').split(';').map((part) => part.trim()).filter(Boolean);
  return given.length === 0 ? null : given.join('\n');
}
