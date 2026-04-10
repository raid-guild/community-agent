#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
pm2_home="${PM2_HOME:-$HOME/.pm2}"
dump_file="$pm2_home/dump.pm2"

resolve_pm2_binary() {
	local local_binary="$workspace_dir/node_modules/.bin/pm2"

	if [[ -x "$local_binary" ]]; then
		printf '%s\n' "$local_binary"
		return 0
	fi

	if command -v pm2 >/dev/null 2>&1; then
		command -v pm2
		return 0
	fi

	echo "Required runtime binary 'pm2' is unavailable. Run 'npm install' in workspace/ or install PM2 on PATH." >&2
	return 1
}

pm2_bin="$(resolve_pm2_binary)"

start_from_ecosystem() {
	"$pm2_bin" start "$workspace_dir/ecosystem.config.cjs" --update-env
}

mkdir -p "$pm2_home"

if [[ -s "$dump_file" ]]; then
	if ! "$pm2_bin" resurrect; then
		echo "PM2 resurrect failed, falling back to ecosystem.config.cjs" >&2
		start_from_ecosystem
	fi
else
	start_from_ecosystem
fi

"$pm2_bin" save --force