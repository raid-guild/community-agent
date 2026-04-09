#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

: "${MEMORY_API_URL:?MEMORY_API_URL must be set (e.g. https://host/memory-api)}"
: "${PRISM_API_KEY:=${OPENCLAW_MEMORY_API_KEY:-}}"
: "${PRISM_API_KEY:?PRISM_API_KEY must be set for the server restart}"

LOG_DIR="${ROOT_DIR}/logs"
mkdir -p "${LOG_DIR}"
LOCK_FILE="${LOG_DIR}/memory-api-watchdog.lock"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "$(date --iso-8601=seconds) [watchdog] lock held, skipping" >> "${LOG_DIR}/memory-api.log"
  exit 0
fi

BASE_URL="${MEMORY_API_URL%/}"
HEALTH_URL="${BASE_URL}/health"

if curl -fsS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  exit 0
fi

echo "$(date --iso-8601=seconds) [watchdog] health check failed, restarting service" >> "${LOG_DIR}/memory-api.log"

pkill -f "community_memory_api.server" >/dev/null 2>&1 || true
sleep 1

PYTHON="${ROOT_DIR}/.venv/bin/python"
if [[ ! -x "${PYTHON}" ]]; then
  PYTHON="python3"
fi

MEMORY_API_HOST="${PRISM_API_HOST:-${OPENCLAW_MEMORY_API_HOST:-0.0.0.0}}"
MEMORY_API_PORT="${PRISM_API_PORT:-${OPENCLAW_MEMORY_API_PORT:-8788}}"

nohup env \
  MEMORY_API_URL="${MEMORY_API_URL}" \
  PRISM_API_KEY="${PRISM_API_KEY}" \
  PRISM_API_PORT="${MEMORY_API_PORT}" \
  PRISM_API_STRIP_PREFIX="${PRISM_API_STRIP_PREFIX:-${OPENCLAW_MEMORY_API_STRIP_PREFIX:-/agents/${AGENT_ID:-xbp1hytd}}}" \
  "${PYTHON}" -m superprism_poc.raidguild.code.community_memory_api.server \
    --host "${MEMORY_API_HOST}" \
    --port "${MEMORY_API_PORT}" \
  >> "${LOG_DIR}/memory-api.log" 2>&1 &

echo "$(date --iso-8601=seconds) [watchdog] restart triggered (pid $!)" >> "${LOG_DIR}/memory-api.log"
