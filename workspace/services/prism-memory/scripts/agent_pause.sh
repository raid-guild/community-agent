#!/usr/bin/env bash
set -euo pipefail

AGENT="${1:-all}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="${ROOT_DIR}/superprism_poc/raidguild/state/agent_control_state.json"

if [[ "${AGENT}" != "all" && "${AGENT}" != "memory" && "${AGENT}" != "knowledge" ]]; then
  echo "usage: $0 [all|memory|knowledge]"
  exit 2
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

targets = ["memory", "knowledge"] if agent == "all" else [agent]
now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
for key in targets:
    item = agents.setdefault(key, {})
    item["paused"] = True
    item["paused_at"] = now

state_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(f"[agent-control] paused: {', '.join(targets)}")
PY

