#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${AGENT_BASE_URL:-}}"

if [[ -z "$base_url" ]]; then
  echo "Usage: $0 <agent-base-url>"
  exit 1
fi

curl --fail --silent --show-error "$base_url/site" >/dev/null
curl --fail --silent --show-error "$base_url/api/health" >/dev/null

echo "Site and API health checks passed for $base_url"