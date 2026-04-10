#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
mode="${1:-runtime}"

apply_pinata_runtime_defaults() {
	if [[ "${PINATA_USE_AGENT_HOST_PLACEHOLDER:-0}" != "1" ]]; then
		return
	fi

	export SITE_BASE_PATH="${SITE_BASE_PATH:-/site}"
	export API_BASE_PATH="${API_BASE_PATH:-/api}"
}

load_env_file() {
	local env_path="$1"
	if [[ -f "$env_path" ]]; then
		set -a
		# shellcheck disable=SC1090
		source "$env_path"
		set +a
	fi
}

load_env_file "$workspace_dir/.env"
load_env_file "$workspace_dir/.env.local"

apply_pinata_runtime_defaults

cd "$workspace_dir"

case "$mode" in
	runtime)
		bash "$script_dir/verify-runtime-ready.sh" runtime
		bash "$script_dir/stop-all.sh"
		exec bash "$script_dir/pm2w.sh" pm2-runtime start ecosystem.config.cjs
		;;
	daemon)
		bash "$script_dir/verify-runtime-ready.sh" daemon
		exec bash "$script_dir/pm2-ensure.sh"
		;;
	*)
		echo "Usage: bash scripts/start-all.sh [runtime|daemon]" >&2
		exit 1
		;;
esac