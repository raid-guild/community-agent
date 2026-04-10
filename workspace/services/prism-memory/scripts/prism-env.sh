#!/usr/bin/env bash
set -euo pipefail

PRISM_SERVICE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRISM_CODE_ROOT="$PRISM_SERVICE_ROOT/superprism_poc/raidguild/code"
PRISM_WORKSPACE_ROOT="$(cd "$PRISM_SERVICE_ROOT/../.." && pwd)"

get_prism_active_data_root() {
  if [[ -n "${PRISM_API_DATA_ROOT:-}" ]]; then
    printf '%s' "$PRISM_API_DATA_ROOT"
    return 0
  fi

  printf '%s' "$PRISM_SERVICE_ROOT/superprism_poc/raidguild"
}

load_prism_env() {
  if [[ -f "$PRISM_WORKSPACE_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PRISM_WORKSPACE_ROOT/.env"
    set +a
  fi

  if [[ -f "$PRISM_WORKSPACE_ROOT/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PRISM_WORKSPACE_ROOT/.env.local"
    set +a
  fi
}

derive_prism_shared_token() {
  local explicit_token="${PRISM_API_KEY:-${INTERNAL_SERVICE_TOKEN:-${SERVICE_SHARED_TOKEN:-}}}"
  if [[ -n "$explicit_token" ]]; then
    printf '%s' "$explicit_token"
    return 0
  fi

  local admin_password="${ADMIN_PASSWORD:-changeme}"
  printf '%s:prism-agent-internal-service' "$admin_password" | sha256sum | awk '{print $1}'
}

ensure_prism_python() {
  if [[ ! -x "$PRISM_SERVICE_ROOT/.venv/bin/python" ]]; then
    bash "$PRISM_SERVICE_ROOT/scripts/build-service.sh"
  fi
}

export_prism_defaults() {
  local shared_token
  shared_token="$(derive_prism_shared_token)"
  local active_data_root
  active_data_root="$(get_prism_active_data_root)"

  export PYTHONPATH="$PRISM_CODE_ROOT${PYTHONPATH:+:$PYTHONPATH}"
  export PRISM_API_HOST="${PRISM_API_HOST:-0.0.0.0}"
  export PRISM_API_PORT="${PRISM_API_PORT:-8788}"
  export PRISM_API_ROOT_PATH="${PRISM_API_ROOT_PATH:-/prism-memory}"
  export PRISM_API_BASE_PATH="${PRISM_API_BASE_PATH:-superprism_poc}"
  export PRISM_API_SPACE="${PRISM_API_SPACE:-raidguild}"
  export PRISM_API_STORAGE_BACKEND="${PRISM_API_STORAGE_BACKEND:-filesystem}"
  export PRISM_API_DATA_ROOT="${PRISM_API_DATA_ROOT:-$active_data_root}"
  export PRISM_API_KEY="${PRISM_API_KEY:-$shared_token}"
  export DISCORD_LATEST_URL="${DISCORD_LATEST_URL:-http://127.0.0.1:${DISCORD_BOT_PORT:-8790}/discord/latest-messages}"
}

ensure_prism_space_config() {
  if [[ "${PRISM_SYNC_SPACE_CONFIG:-1}" == "0" ]]; then
    return 0
  fi

  node "$PRISM_SERVICE_ROOT/scripts/sync-space-config.mjs"
}