#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"

npm_install_for_build() {
	npm install --include=dev
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

for service_dir in "$workspace_dir"/services/*; do
	if [[ ! -d "$service_dir" || ! -f "$service_dir/package.json" ]]; then
		continue
	fi

	cd "$service_dir"
	npm_install_for_build

	if npm run | grep -q '^  build'; then
		npm run build
	fi
done

cd "$workspace_dir/portfolio-site"
npm_install_for_build
rm -rf .next
npm run build:site