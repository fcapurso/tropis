#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
set -euo pipefail
# Resolves the runner from this script's own location, so it is found from any working
# directory inside the repository.
here=$(cd "$(dirname "$0")" && pwd -P)
exec node "$here/isolate-for-plan.mjs" "$@"
