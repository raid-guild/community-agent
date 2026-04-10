#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
discord_dir="$workspace_dir/services/discord-bot"

if [[ -z "${DISCORD_BOT_TOKEN:-}" ]]; then
	echo "DISCORD_BOT_TOKEN is required for the bundled Discord bot. Fill workspace/.env or workspace/.env.local before starting the stack." >&2
	exit 1
fi

if [[ ! -f "$discord_dir/package.json" ]]; then
	echo "Discord bot service is missing at workspace/services/discord-bot." >&2
	exit 1
fi

if [[ ! -f "$workspace_dir/node_modules/discord.js/package.json" && ! -f "$discord_dir/node_modules/discord.js/package.json" ]]; then
	echo "Discord bot dependencies are missing. Run 'npm install' from workspace/." >&2
	exit 1
fi

cd "$workspace_dir"
exec npm run --workspace services/discord-bot start