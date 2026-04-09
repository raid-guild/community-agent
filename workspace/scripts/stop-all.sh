#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd "$script_dir/.." && pwd)"
current_pid="$$"
parent_pid="$PPID"

cd "$workspace_dir"

npm run pm2:stop --silent >/dev/null 2>&1 || true

repo_pattern='/home/dekanjbrown/Projects/raidguild/pinata-sites/prism-agent'

mapfile -t repo_pids < <(pgrep -f "$repo_pattern" || true)
kill_pids=()

for pid in "${repo_pids[@]}"; do
  if [[ "$pid" == "$current_pid" || "$pid" == "$parent_pid" ]]; then
    continue
  fi

  cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  if [[ -z "$cmd" ]]; then
    continue
  fi

  case "$cmd" in
    *"/workspace/scripts/start-all.sh"*|*"/workspace/scripts/stop-all.sh"*)
      continue
      ;;
  esac

  kill_pids+=("$pid")
done

if [[ ${#kill_pids[@]} -gt 0 ]]; then
  kill "${kill_pids[@]}" 2>/dev/null || true
  sleep 1
fi

remaining="$(pgrep -f "$repo_pattern" || true)"
if [[ -n "$remaining" ]]; then
  force_pids=()

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    if [[ "$pid" == "$current_pid" || "$pid" == "$parent_pid" ]]; then
      continue
    fi

    cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    if [[ -z "$cmd" ]]; then
      continue
    fi

    case "$cmd" in
      *"/workspace/scripts/start-all.sh"*|*"/workspace/scripts/stop-all.sh"*)
        continue
        ;;
    esac

    force_pids+=("$pid")
  done <<< "$remaining"

  if [[ ${#force_pids[@]} -gt 0 ]]; then
    kill -9 "${force_pids[@]}" 2>/dev/null || true
  fi
fi

for port in 3000 4433 8788 8790; do
  listeners="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$listeners" ]]; then
    kill $listeners 2>/dev/null || true
    sleep 1
    listeners="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$listeners" ]]; then
      kill -9 $listeners 2>/dev/null || true
    fi
  fi
done