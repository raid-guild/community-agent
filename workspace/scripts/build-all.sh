#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"

npm_install_for_build() {
	npm install --workspaces --include-workspace-root --include=dev
}

apply_pinata_runtime_defaults() {
	if [[ "${PINATA_USE_AGENT_HOST_PLACEHOLDER:-0}" != "1" ]]; then
		return
	fi

	export SITE_BASE_PATH="${SITE_BASE_PATH:-/site}"
	export API_BASE_PATH="${API_BASE_PATH:-/api}"
}

apply_pinata_runtime_defaults

bash "$script_dir/stop-all.sh"

cd "$workspace_dir"

npm_install_for_build
npm run build
npm run migrate
npm run seed

npm run --workspace services/discord-bot build
npm run --workspace services/prism-memory build
rm -rf "$workspace_dir/portfolio-site/.next"
npm run --workspace portfolio-site build:site