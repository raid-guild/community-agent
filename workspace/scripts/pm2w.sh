#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
binary_name="${1:-pm2}"

if [[ "$binary_name" == "pm2" || "$binary_name" == "pm2-runtime" ]]; then
	shift
else
	binary_name="pm2"
fi

local_binary="$workspace_dir/node_modules/.bin/$binary_name"

if [[ -x "$local_binary" ]]; then
	exec "$local_binary" "$@"
fi

if command -v "$binary_name" >/dev/null 2>&1; then
	exec "$(command -v "$binary_name")" "$@"
fi

echo "Required runtime binary '$binary_name' is unavailable. Run 'npm install' in workspace/ or install PM2 on PATH." >&2
exit 1