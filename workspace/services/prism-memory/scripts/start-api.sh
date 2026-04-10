#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/prism-env.sh"

cd "$ROOT_DIR"
load_prism_env
ensure_prism_python
export_prism_defaults
ensure_prism_space_config

exec "$ROOT_DIR/.venv/bin/python" -m community_memory_api.server \
  --host "$PRISM_API_HOST" \
  --port "$PRISM_API_PORT" \
  --base "$PRISM_API_BASE_PATH" \
  --space "$PRISM_API_SPACE" \
  --log-level "${PRISM_API_LOG_LEVEL:-info}"