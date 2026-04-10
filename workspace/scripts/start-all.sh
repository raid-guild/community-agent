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

resolve_runtime_binary() {
	local binary_name="$1"
	local local_binary="$workspace_dir/node_modules/.bin/$binary_name"

	if [[ -x "$local_binary" ]]; then
		printf '%s\n' "$local_binary"
		return 0
	fi

	if command -v "$binary_name" >/dev/null 2>&1; then
		command -v "$binary_name"
		return 0
	fi

	echo "Required runtime binary '$binary_name' is unavailable. Run 'npm install' in workspace/ or install PM2 on PATH." >&2
	return 1
}

cd "$workspace_dir"

case "$mode" in
	runtime)
		bash "$script_dir/verify-runtime-ready.sh" runtime
		bash "$script_dir/stop-all.sh"
		exec "$(resolve_runtime_binary pm2-runtime)" start ecosystem.config.cjs
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