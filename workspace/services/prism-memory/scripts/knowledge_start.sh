#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/prism-env.sh"
load_prism_env
ensure_prism_python
export_prism_defaults
ensure_prism_space_config

"$ROOT_DIR/.venv/bin/python" scripts/knowledge_promote_inbox.py
"$ROOT_DIR/.venv/bin/python" -m community_knowledge validate --base superprism_poc --space raidguild
"$ROOT_DIR/.venv/bin/python" -m community_knowledge index --base superprism_poc --space raidguild

echo "[knowledge-start] recent activity:"
tail -n 12 superprism_poc/raidguild/knowledge/kb/activity/kb_activity.jsonl || true

