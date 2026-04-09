#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/prism-env.sh"
load_prism_env
ensure_prism_python
export_prism_defaults

TODAY=$(TZ=America/Denver date +%F)
LOCAL_TIME=$(TZ=America/Denver date +%H:%M)

"$ROOT_DIR/.venv/bin/python" -m community_memory.pipeline collect --base superprism_poc --space raidguild

if [[ "${LOCAL_TIME}" > "17:29" ]]; then
  "$ROOT_DIR/.venv/bin/python" -m community_memory.pipeline digest --base superprism_poc --space raidguild --date "${TODAY}"
fi

if [[ "${LOCAL_TIME}" > "17:44" ]]; then
  "$ROOT_DIR/.venv/bin/python" -m community_memory.pipeline memory --base superprism_poc --space raidguild --date "${TODAY}"
  "$ROOT_DIR/.venv/bin/python" -m community_memory.pipeline seeds --base superprism_poc --space raidguild --date "${TODAY}"
fi

echo "[memory-start] recent activity:"
tail -n 8 superprism_poc/raidguild/activity/activity.jsonl

