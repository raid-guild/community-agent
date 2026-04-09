#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

download_virtualenv_pyz() {
	local cache_dir="$ROOT_DIR/.cache"
	local pyz_path="$cache_dir/virtualenv.pyz"

	mkdir -p "$cache_dir"

	if [[ -f "$pyz_path" ]]; then
		printf '%s\n' "$pyz_path"
		return 0
	fi

	python3 - "$pyz_path" <<'PY'
from pathlib import Path
from urllib.request import urlopen
import sys

target = Path(sys.argv[1])
target.write_bytes(urlopen("https://bootstrap.pypa.io/virtualenv.pyz").read())
PY

	printf '%s\n' "$pyz_path"
}

create_virtualenv() {
	local venv_log

	if [[ -x .venv/bin/python ]] && .venv/bin/python -m pip --version >/dev/null 2>&1; then
		return 0
	fi

	rm -rf .venv
	venv_log="$(mktemp)"

	if python3 -m venv .venv >"$venv_log" 2>&1; then
		rm -f "$venv_log"
		return 0
	fi

	rm -rf .venv
	echo "python3 -m venv is unavailable on this host; falling back to virtualenv.pyz." >&2
	python3 "$(download_virtualenv_pyz)" .venv
	rm -f "$venv_log"
}

create_virtualenv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt