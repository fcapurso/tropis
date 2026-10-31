// This repository's release: the next version and the notes promotion, which
// /release runs before its notes commit, and the check the release job in ci.yml
// runs before it tags. Tested by guards/release.test.js. Not shipped to projects.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BUMPS = ['patch', 'minor', 'major'];
const PLACEHOLDER = '_Nothing yet._';

/**
 * The version after `lastTag` for a `bump`. Below 1.0 a breaking (`major`) release raises
 * the middle number and anything else the last; from 1.0, semantic versioning.
 * @param {string} bump patch, minor or major
 * @param {string} lastTag the last release tag, vX.Y.Z, or '' when there is none
 * @returns {string} X.Y.Z, without the v
 */
export function nextVersion(bump, lastTag) {
  if (!BUMPS.includes(bump)) throw new Error(`Unknown bump "${bump}": use patch, minor or major.`);
  if (!lastTag) return '0.1.0';
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(lastTag);
  if (!m) throw new Error(`Cannot read the last tag "${lastTag}" as vX.Y.Z.`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (major === 0) return bump === 'major' ? `0.${minor + 1}.0` : `0.${minor}.${patch + 1}`;
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * The notes with the Unreleased section moved under `version`, dated, and an empty
 * Unreleased section left above it. The section ends at the next `## [` heading or a
 * `---` line.
 */
export function promote(text, version, date) {
  const lines = text.split('\n');
  const start = lines.indexOf('## [Unreleased]');
  if (start === -1) throw new Error('The notes have no "## [Unreleased]" section.');
  if (lines.some((l) => l.startsWith(`## [${version}]`))) {
    throw new Error(`The notes already have a section for ${version}.`);
  }
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## [') && lines[end] !== '---') end++;
  const body = lines.slice(start + 1, end).join('\n').trim();
  if (body === '' || body === PLACEHOLDER) {
    throw new Error('Nothing to release: the Unreleased section is empty. Run /release first.');
  }
  if (body.includes('(ask)')) {
    throw new Error('The notes still say (ask): answer "Checked on the release candidate" first.');
  }
  const section = ['## [Unreleased]', '', PLACEHOLDER, '', `## [${version}] — ${date}`, '', body, ''];
  return [...lines.slice(0, start), ...section, ...lines.slice(end)].join('\n');
}

/**
 * Throws unless the notes have already been promoted to `version`: an empty
 * Unreleased section, and `version` the newest section below it.
 * @param {string} text the notes
 * @param {string} version X.Y.Z, without the v
 */
export function checkReleased(text, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`"${version}" is not a version of the form X.Y.Z.`);
  const lines = text.split('\n');
  const start = lines.indexOf('## [Unreleased]');
  if (start === -1) throw new Error('The notes have no "## [Unreleased]" section.');
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## [') && lines[end] !== '---') end++;
  const body = lines.slice(start + 1, end).join('\n').trim();
  if (body !== '' && body !== PLACEHOLDER) {
    throw new Error('The Unreleased section still holds notes: promote them under the version first.');
  }
  const next = lines.slice(start + 1).find((l) => l.startsWith('## ['));
  if (next === undefined) throw new Error('The notes have no version section below Unreleased.');
  if (!next.startsWith(`## [${version}]`)) {
    const found = /^## \[([^\]]*)\]/.exec(next)[1];
    throw new Error(`The newest version in the notes is ${found}, not ${version}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'version') {
    console.log(nextVersion(args[0], args[1] ?? ''));
  } else if (command === 'promote') {
    const [file, version, date] = args;
    writeFileSync(file, promote(readFileSync(file, 'utf8'), version, date));
  } else if (command === 'check') {
    const [file, version] = args;
    try {
      checkReleased(readFileSync(file, 'utf8'), version);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  } else {
    console.error(
      'usage: release.mjs version <bump> [<lastTag>] | promote <file> <version> <date> | check <file> <version>',
    );
    process.exit(2);
  }
}
