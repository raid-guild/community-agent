#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
tsconfig_path="$workspace_dir/tsconfig.json"

if [[ ! -f "$tsconfig_path" ]]; then
	echo "Missing root TypeScript config at $tsconfig_path" >&2
	exit 1
fi

tsc_bin="$workspace_dir/node_modules/.bin/tsc"
if [[ ! -x "$tsc_bin" ]]; then
	if command -v tsc >/dev/null 2>&1; then
		tsc_bin="$(command -v tsc)"
	else
		echo "TypeScript compiler is missing. Run 'npm install' in workspace/." >&2
		exit 1
	fi
fi

exec "$tsc_bin" -p "$tsconfig_path"