#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
mode="${1:-all}"

if [[ "${SKIP_RUNTIME_PREFLIGHT:-0}" == "1" ]]; then
	exit 0
fi

errors=()

add_error() {
	errors+=("$1")
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

require_env_var() {
	local key="$1"
	local guidance="$2"
	if [[ -z "${!key:-}" ]]; then
		add_error "$key is required for the full Prism Agent stack. $guidance"
	fi
}

load_env_file "$workspace_dir/.env"
load_env_file "$workspace_dir/.env.local"
load_env_file "$workspace_dir/services/prism-memory/.env"

check_root_runtime() {
	if [[ ! -x "$workspace_dir/node_modules/.bin/pm2-runtime" ]]; then
		add_error "Workspace dependencies are missing. Run 'npm install' in workspace/, then 'npm run bootstrap'."
	fi

	if [[ ! -f "$workspace_dir/dist/server.js" ]]; then
		add_error "API build output is missing at workspace/dist/server.js. Run 'npm run bootstrap' in workspace/."
	fi
}

check_site_runtime() {
	local site_dir="$workspace_dir/portfolio-site"

	if [[ ! -x "$workspace_dir/node_modules/.bin/next" && ! -x "$site_dir/node_modules/.bin/next" ]]; then
		add_error "Site dependencies are missing. Run 'npm install' in workspace/, then 'npm run bootstrap'."
	fi

	if [[ ! -f "$site_dir/.next/BUILD_ID" ]]; then
		add_error "Site production build output is missing in workspace/portfolio-site/.next. Run 'npm run bootstrap' in workspace/."
	fi
}

check_discord_runtime() {
	local discord_dir="$workspace_dir/services/discord-bot"

	if [[ ! -f "$discord_dir/package.json" ]]; then
		add_error "Discord bot service is missing at workspace/services/discord-bot. Restore the bundled service before starting the template."
		return 0
	fi

	require_env_var "DISCORD_BOT_TOKEN" "Add it to workspace/.env or workspace/.env.local."
	require_env_var "DISCORD_GUILD_ID" "Add it to workspace/.env or workspace/.env.local so the Discord wrapper and Prism collectors target the correct server."

	if [[ ! -f "$workspace_dir/node_modules/discord.js/package.json" && ! -f "$discord_dir/node_modules/discord.js/package.json" ]]; then
		add_error "Discord bot dependencies are missing. Run 'npm install' in workspace/, then 'npm run bootstrap'."
	fi

	if [[ ! -x "$workspace_dir/node_modules/.bin/tsx" && ! -x "$discord_dir/node_modules/.bin/tsx" ]]; then
		add_error "Discord bot runtime binary is missing. Run 'npm install' in workspace/, then 'npm run bootstrap'."
	fi
}

check_prism_runtime() {
	local prism_dir="$workspace_dir/services/prism-memory"

	if [[ ! -f "$prism_dir/package.json" ]]; then
		add_error "Prism Memory service is missing at workspace/services/prism-memory. Restore the bundled service before starting the template."
		return 0
	fi

	if [[ ! -x "$prism_dir/.venv/bin/python" ]]; then
		add_error "Prism Memory virtualenv is missing at workspace/services/prism-memory/.venv. Run 'npm run bootstrap' in workspace/."
	fi
}

check_root_runtime
check_site_runtime
check_discord_runtime
check_prism_runtime

case "$mode" in
	base|all|runtime|daemon)
		;;
	*)
		add_error "Unknown runtime preflight mode '$mode'. Expected one of: base, all, runtime, daemon."
		;;
esac

if (( ${#errors[@]} == 0 )); then
	exit 0
fi

{
	echo "Prism Agent runtime preflight failed:"
	for error in "${errors[@]}"; do
		echo "- $error"
	done
	echo
	echo "Recommended recovery:"
	echo "  1. Fill the required secrets in workspace/.env or workspace/.env.local"
	echo "  2. Run npm install"
	echo "  3. Run npm run bootstrap"
} >&2

exit 1