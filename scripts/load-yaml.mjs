// Shared machinery: no part of this file is project-owned.
/**
 * The yaml package, for the framework's scripts. A script that imports `yaml` directly
 * fails before any of its code runs when the framework's packages are not installed, as
 * in a fresh clone; importing it from here turns that into one line saying what to run.
 */
import { basename } from 'node:path';

let YAML;
try {
  ({ default: YAML } = await import('yaml'));
} catch (e) {
  if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  const script = basename(process.argv[1] ?? 'this script');
  process.stderr.write(
    `${script}: the framework's packages are not installed. `
    + 'Run npm --prefix .tropis ci from the repository root, then run this again.\n',
  );
  process.exit(1);
}

export default YAML;
