#!/usr/bin/env bash
set -euo pipefail

AGENT="${1:-}"
if [[ "${AGENT}" != "memory" && "${AGENT}" != "knowledge" ]]; then
  echo "usage: $0 [memory|knowledge]"
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="${ROOT_DIR}/superprism_poc/raidguild/state/agent_control_state.json"

cd "${ROOT_DIR}"
export PYTHONPATH=superprism_poc/raidguild/code

if [[ -n "${GITHUB_OWNER:-}" && -n "${GITHUB_REPO:-}" && -n "${GITHUB_TOKEN:-}" ]]; then
  echo "[agent-control] GitHub env detected for ${GITHUB_OWNER}/${GITHUB_REPO}"
else
  echo "[agent-control] GitHub env vars are not fully set; relying on existing git auth"
fi

python3 -m tools.agent_coord acquire \
  --resource repo_write \
  --holder "${AGENT}-control" \
  --ttl-minutes 30 \
  --note "unpause-sync"

cleanup() {
  python3 -m tools.agent_coord release \
    --resource repo_write \
    --holder "${AGENT}-control" || true
}
trap cleanup EXIT

git fetch origin
git pull --ff-only origin main

if [[ "${AGENT}" == "memory" ]]; then
  FILES=(
    docs/assistants/memory-manager/HEARTBEAT.md
    docs/assistants/memory-manager/IDENTITY.md
  )
else
  FILES=(
    docs/assistants/knowledge-manager/HEARTBEAT.md
    docs/knowledge-source-of-truth.md
    docs/assistants/knowledge-manager/IDENTITY.md
    README.md
  )
fi

if ! git diff --quiet origin/main -- "${FILES[@]}"; then
  echo "[agent-control] identity/runbook drift vs origin/main for ${AGENT}"
  git diff --name-only origin/main -- "${FILES[@]}"
  exit 3
fi

if ! git diff --quiet -- "${FILES[@]}"; then
  echo "[agent-control] local unstaged drift in identity/runbook files for ${AGENT}"
  git diff --name-only -- "${FILES[@]}"
  exit 4
fi

mkdir -p "$(dirname "${STATE_FILE}")"
if [[ ! -f "${STATE_FILE}" ]]; then
  cat > "${STATE_FILE}" <<'JSON'
{
  "agents": {
    "memory": {"paused": false},
    "knowledge": {"paused": false}
  }
}
JSON
fi

python3 - "${STATE_FILE}" "${AGENT}" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

state_path = Path(sys.argv[1])
agent = sys.argv[2]
payload = json.loads(state_path.read_text(encoding="utf-8"))
agents = payload.setdefault("agents", {})
item = agents.setdefault(agent, {})
now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
item["paused"] = False
item["unpaused_at"] = now

state_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(f"[agent-control] unpaused: {agent}")
PY

echo "[agent-control] synced main at $(git rev-parse --short HEAD)"
