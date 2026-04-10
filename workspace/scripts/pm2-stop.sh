#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

apps=(
	prism-agent-api
	prism-agent-site
	prism-agent-discord-bot
	prism-agent-prism-memory
	prism-agent-prism-memory-workers
)

for app in "${apps[@]}"; do
	bash "$script_dir/pm2w.sh" delete "$app" >/dev/null 2>&1 || true
done