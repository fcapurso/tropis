#!/usr/bin/env bash
# The framework's self-check: the source folders checked as the next release.
set -euo pipefail
# The self-check needs the release tags; the pipeline's checkout is shallow and has none.
if [ "$(git rev-parse --is-shallow-repository)" = true ]; then
  git fetch --quiet --unshallow --tags origin
fi
bash scripts/check-blueprint.sh
