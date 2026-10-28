// Shared machinery: no part of this file is project-owned.
/**
 * Writes `.tropis/installed.json` for the project this script belongs to.
 *
 * The project root is two levels above this file, which is `.tropis/scripts/`
 * once the script is installed. The version is required. A second argument, when
 * given, is where the framework came from and is stored between `version` and
 * `files`. The file is the record object as JSON: two-space indent, a final
 * newline, paths sorted. Success prints nothing.
 *
 * Run: `node .tropis/scripts/record-installed.mjs <version> [source]`
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordOf } from './installed-files.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const version = process.argv[2];
const source = process.argv[3];

if (version === undefined) {
  console.error('usage: record-installed.mjs <version>');
  process.exit(1);
}

writeFileSync(
  resolve(root, '.tropis/installed.json'),
  `${JSON.stringify(recordOf(root, version, source), null, 2)}\n`,
);
