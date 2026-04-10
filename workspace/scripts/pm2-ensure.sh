#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
pm2_home="${PM2_HOME:-$HOME/.pm2}"
dump_file="$pm2_home/dump.pm2"
pm2_cmd=(bash "$script_dir/pm2w.sh")

start_from_ecosystem() {
	"${pm2_cmd[@]}" start "$workspace_dir/ecosystem.config.cjs" --update-env
}

mkdir -p "$pm2_home"

if [[ -s "$dump_file" ]]; then
	if ! "${pm2_cmd[@]}" resurrect; then
		echo "PM2 resurrect failed, falling back to ecosystem.config.cjs" >&2
		start_from_ecosystem
	fi
else
	start_from_ecosystem
fi

"${pm2_cmd[@]}" save --force