#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
site_dir="$workspace_dir/portfolio-site"

if [[ ! -f "$site_dir/.next/BUILD_ID" ]]; then
	echo "Prism Agent site build is missing. Run 'npm run bootstrap' from workspace/." >&2
	exit 1
fi

if [[ ! -x "$workspace_dir/node_modules/.bin/next" && ! -x "$site_dir/node_modules/.bin/next" ]]; then
	echo "Prism Agent site dependencies are missing. Run 'npm install' from workspace/." >&2
	exit 1
fi

cd "$workspace_dir"
exec npm run --workspace portfolio-site start:site