// Shared machinery: no part of this file is project-owned.
/**
 * Today's date in the project's time zone, as YYYY-MM-DD.
 *
 * `.tropis/project.json` may name an IANA time zone as `"timeZone"`; without one, today
 * is UTC's. The date is assembled from the year, month and day parts Intl gives for that
 * zone, with the locale, calendar and digits fixed, so neither the machine's clock zone
 * nor its locale changes the answer.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} [timeZone] an IANA time zone; UTC when omitted
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD
 */
export function todayIn(timeZone = 'UTC', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

/**
 * The time zone `.tropis/project.json` names as `"timeZone"`, or UTC. A missing,
 * unreadable or non-object file, or no key, is UTC. A key that is not a time zone
 * throws, naming the file, so a typo does not fall back to UTC unseen.
 * @param {string} root the project root
 * @returns {string}
 */
export function projectTimeZone(root) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(join(root, '.tropis', 'project.json'), 'utf8'));
  } catch {
    return 'UTC';
  }
  if (!doc || typeof doc !== 'object' || doc.timeZone === undefined) return 'UTC';
  const zone = doc.timeZone;
  try {
    if (typeof zone !== 'string' || zone === '') throw new RangeError();
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    throw new Error(
      `.tropis/project.json: "timeZone" must be an IANA time zone such as "Europe/Rome", not ${JSON.stringify(zone)}.`,
    );
  }
  return zone;
}

/**
 * Today in the project's time zone.
 * @param {string} root the project root
 * @param {Date} [now]
 */
export const projectToday = (root, now = new Date()) => todayIn(projectTimeZone(root), now);

/**
 * The plan file names, `YYYY-MM-DD-<slug>.md`, dated after `today`.
 * @param {string[]} names
 * @param {string} today YYYY-MM-DD
 * @returns {string[]}
 */
export function plansDatedAfter(names, today) {
  return names.filter((n) => {
    const m = /^(\d{4}-\d{2}-\d{2})-/.exec(n);
    return m !== null && m[1] > today;
  });
}
