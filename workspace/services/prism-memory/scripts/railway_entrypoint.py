from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from urllib import error, request


def _api_command() -> list[str]:
    port = os.environ.get("PORT", "8080")
    base = os.environ.get("PRISM_API_BASE_PATH", os.environ.get("OPENCLAW_MEMORY_API_BASE", "superprism_poc"))
    space = os.environ.get("PRISM_API_SPACE", os.environ.get("OPENCLAW_MEMORY_API_SPACE", "raidguild"))
    command = [
        sys.executable,
        "-m",
        "superprism_poc.raidguild.code.community_memory_api.server",
        "--host",
        "0.0.0.0",
        "--port",
        port,
        "--base",
        base,
        "--space",
        space,
    ]
    return command


def _run_api() -> int:
    command = _api_command()
    completed = subprocess.run(command)
    return completed.returncode


def _run_trigger() -> int:
    api_base = os.environ.get("PRISM_API_BASE", "").rstrip("/")
    api_key = os.environ.get("PRISM_API_OPS_KEY", os.environ.get("PRISM_API_KEY", os.environ.get("OPENCLAW_MEMORY_API_KEY", "")))
    trigger_path = os.environ.get("PRISM_TRIGGER_PATH", "").strip()
    if not api_base or not api_key or not trigger_path:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "PRISM_API_BASE, PRISM_API_OPS_KEY, and PRISM_TRIGGER_PATH are required",
                }
            ),
            file=sys.stderr,
        )
        return 2

    url = f"{api_base}{trigger_path}"
    req = request.Request(
        url,
        data=b"",
        headers={
            "X-Prism-Api-Key": api_key,
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=300) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(body)
            return 0
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(
            json.dumps(
                {
                    "ok": False,
                    "status": exc.code,
                    "url": url,
                    "body": body,
                }
            ),
            file=sys.stderr,
        )
        return 1
    except Exception as exc:  # pragma: no cover
        print(json.dumps({"ok": False, "url": url, "error": str(exc)}), file=sys.stderr)
        return 1


def main() -> int:
    os.chdir(Path(__file__).resolve().parents[1])
    mode = os.environ.get("PRISM_SERVICE_MODE", "api").strip().lower()
    if mode == "api":
        return _run_api()
    if mode == "trigger":
        return _run_trigger()
    print(json.dumps({"ok": False, "error": f"Unsupported PRISM_SERVICE_MODE: {mode}"}), file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
