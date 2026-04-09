#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Usage: bash scripts/start-workers.sh

Environment:
  PRISM_WORKERS_ENABLED=1
  PRISM_WORKER_INTERVAL_MINUTES=30
  PRISM_WORKER_INITIAL_BACKFILL_DAYS=3
  PRISM_WORKER_RUN_BACKFILL_ON_START=1
  PRISM_WORKER_RUN_ON_START=1
EOF
  exit 0
fi

# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/prism-env.sh"
load_prism_env
ensure_prism_python
export_prism_defaults

log() {
  printf '[prism-workers] %s %s\n' "$(date -Is)" "$*"
}

api_base="${PRISM_WORKER_API_BASE:-http://127.0.0.1:${PRISM_API_PORT:-8788}}"
interval_minutes="${PRISM_WORKER_INTERVAL_MINUTES:-30}"
backfill_days="${PRISM_WORKER_INITIAL_BACKFILL_DAYS:-3}"
run_backfill_on_start="${PRISM_WORKER_RUN_BACKFILL_ON_START:-1}"
run_knowledge="${PRISM_WORKER_RUN_KNOWLEDGE:-1}"
run_on_start="${PRISM_WORKER_RUN_ON_START:-1}"
worker_state_dir="${PRISM_WORKER_STATE_DIR:-$(get_prism_active_data_root)/state/runtime}"
backfill_marker="$worker_state_dir/initial-backfill.done"

if ! [[ "$interval_minutes" =~ ^[0-9]+$ ]] || [[ "$interval_minutes" -lt 1 ]]; then
  echo "PRISM_WORKER_INTERVAL_MINUTES must be a positive integer" >&2
  exit 1
fi

if ! [[ "$backfill_days" =~ ^[0-9]+$ ]]; then
  echo "PRISM_WORKER_INITIAL_BACKFILL_DAYS must be zero or a positive integer" >&2
  exit 1
fi

mkdir -p "$worker_state_dir"

api_post() {
  local path="$1"
  log "POST $path"
  curl --fail --silent --show-error \
    -X POST \
    -H "X-Prism-Api-Key: ${PRISM_API_KEY}" \
    "$api_base$path" >/dev/null
}

wait_for_api() {
  local attempts=60

  while (( attempts > 0 )); do
    if curl --fail --silent --show-error "$api_base/health" >/dev/null; then
      return 0
    fi

    attempts=$((attempts - 1))
    sleep 2
  done

  return 1
}

run_cycle() {
  api_post "/ops/memory/run"

  if [[ "$run_knowledge" != "0" ]]; then
    api_post "/ops/knowledge/run"
  fi
}

run_initial_backfill() {
  if [[ "$run_backfill_on_start" == "0" || "$backfill_days" == "0" || -f "$backfill_marker" ]]; then
    return 1
  fi

  api_post "/ops/memory/backfill?days=$backfill_days"

  if [[ "$run_knowledge" != "0" ]]; then
    api_post "/ops/knowledge/run"
  fi

  printf '%s\n' "$(date -Is)" > "$backfill_marker"
  log "Initial backfill complete (days=$backfill_days)"
  return 0
}

trap 'log "Stopping worker loop"; exit 0' INT TERM

log "Waiting for Prism Memory API at $api_base"
wait_for_api
log "Prism Memory API is reachable"

ran_initial_backfill=0

if [[ "$run_backfill_on_start" != "0" && "$backfill_days" != "0" && ! -f "$backfill_marker" ]]; then
  run_initial_backfill
  ran_initial_backfill=1
fi

if [[ "$ran_initial_backfill" == "0" && "$run_on_start" != "0" ]]; then
  run_cycle
fi

while true; do
  log "Sleeping for $interval_minutes minute(s)"
  sleep "$((interval_minutes * 60))"
  run_cycle
done