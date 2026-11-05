# The Dependabot alerts on main, 2026-11-05

The answer to the spike `dependabot-alerts-are-assessed`. A push on 2026-11-05 reported
"GitHub found 2 vulnerabilities on fcapurso/tropis's default branch (1 moderate, 1 low)".

## How this was found

The session that ran the spike could not read the alerts themselves: the Dependabot
alerts endpoint answered HTTP 403 to a Claude Code cloud session's token. So the alerts
were reconstructed from the same advisory database, with `npm audit` (npm 10, Node.js
22.23.4, Linux x86_64) run on each lockfile on `main` at 770a494, and every advisory
traced to the code that pulls it in.

## What is there

Both lockfiles on `main`, `templates/package-lock.json` and `.tropis/package-lock.json`,
are the same apart from the package name, and carry the same three advisories. Every
one comes in through Jest, a development dependency, and none through `yaml`.

| Advisory | Severity | Package, version locked | Pulled in by | Patched in | Within Jest's range? |
|---|---|---|---|---|---|
| GHSA-3g3m-2fjr-6pw4, AbortSignal cancellation bypass allows post-timeout filesystem traversal | moderate | glob 13.0.6 | `@jest/reporters`, `jest-config`, `jest-runtime`, `test-exclude` | 14.0.2 | no: Jest 30.5.2 asks for `^13.0.6` |
| GHSA-g3hv-75wg-m249, denial of service via globparts amplification | moderate | minimatch 10.2.6 | `glob`, `test-exclude` | 11.0.1 | no: they ask for `^10.2.2` |
| GHSA-gcqx-w48m-w2h4, `mergeObject()` allows prototype poisoning | low | deepmerge 4.3.1 | `jest-config` | none: 4.3.1 is the latest | — |

npm reports 19 entries per lockfile (3 low, 16 moderate) because it also lists every
Jest package above these three; there are three advisories.

The push message counted two (one moderate, one low). The low one is deepmerge. The
moderate one is glob or minimatch; the minimatch advisory has the higher npm advisory
number of the two, so it is likely the one published after that push. The Security tab
shows which; nothing below depends on it.

## Whether they reach projects

**Yes, all three ship.** `scripts/set-up-project.sh` copies `templates/package-lock.json`
to a project's `.tropis/package-lock.json`, and a release brings it along on update. So
every project set up or updated from this release has the same three alerts on its own
repository, if Dependabot is on there.

**None is reachable from input an attacker controls.** These packages run only when the
project's own checks run, on the developer's machine or in its pipeline, and only on the
project's own files:

- **glob.** The flaw is in honouring an `AbortSignal`. No Jest package, nor
  `test-exclude`, passes a `signal` to glob (none of them names one in its built code).
- **minimatch.** The denial of service needs a crafted pattern. The patterns are the
  project's own Jest configuration (`testMatch`, coverage settings), written by the
  project.
- **deepmerge.** `jest-config` calls it in two places: `mergeConfig()`, a helper Jest
  exports and runs only when a configuration file calls it, and the merge of a preset's
  `globals` with the project's. The configuration Tropis ships,
  `templates/framework-jest.config.js`, uses neither, so deepmerge never runs in the
  framework's checks. A project that adds either merges only its own configuration.

The argument assumes the checks run on code the project trusts. A pull request from a
fork runs its own test code in the pipeline anyway, so these packages add nothing to what
such a pull request can already do, and fork workflows here wait for approval.

## What happens to each

- **glob and minimatch: fixed in the next release, on purpose.** An `overrides` entry in
  `templates/package.json` lifts them to the patched majors, glob `^14.0.3` and minimatch
  `^11.0.4`. Tried on a copy of this repository: `npm audit` then reports neither, and
  186 of the installed release's 187 tests pass. The one that fails checks that the
  installed files match their install fingerprints, and fails because the copy's
  package file had been edited. That change is the backlog item
  `test-tools-take-patched-glob`. This repository's own `.tropis/` follows when that
  release is installed. Two consequences go with it: minimatch 11 requires Node.js 20
  or 22 and later, where Jest 30 still runs on 18.14, so the override drops Node.js 18
  for projects; and `scripts/check-blueprint.sh` installs its test tools from the same
  lockfile, so the self-check moves with it.
- **deepmerge: dismissed, with the reason "Vulnerable code is not actually used".** No
  patched version exists, and the framework's checks never call it.
  The dismissal is the developer's to make on the Security tab, since the session cannot
  write to the alerts. If deepmerge publishes a fix, Dependabot opens a new alert for it.
