#!/usr/bin/env python3
"""Auto-promote triaged knowledge inbox items into the canonical KB."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "superprism_poc" / "raidguild" / "knowledge" / "kb" / "triage" / "inbox"
DOCS_BASE = ROOT / "superprism_poc" / "raidguild" / "knowledge" / "kb" / "docs"
META_BASE = ROOT / "superprism_poc" / "raidguild" / "knowledge" / "kb" / "metadata"

PROMOTED = []
SKIPPED = []

for meta_path in sorted(INBOX.glob("*.meta.json")):
    name = meta_path.name
    if not name.endswith('.meta.json'):
        continue
    slug = name[:-len('.meta.json')]
    doc_path = INBOX / f"{slug}.md"
    if not doc_path.exists():
        SKIPPED.append((slug, "missing_markdown"))
        continue

    data = json.loads(meta_path.read_text())
    kind = data.get("kind", "reference").strip()
    if not kind:
        kind = "reference"

    doc_target = DOCS_BASE / kind / f"{slug}.md"
    meta_target = META_BASE / kind / f"{slug}.meta.json"

    doc_target.parent.mkdir(parents=True, exist_ok=True)
    meta_target.parent.mkdir(parents=True, exist_ok=True)

    if doc_target.exists() or meta_target.exists():
        SKIPPED.append((slug, "target_exists"))
        continue

    shutil.move(str(doc_path), doc_target)
    shutil.move(str(meta_path), meta_target)
    PROMOTED.append((slug, kind, doc_target, meta_target))

if PROMOTED:
    print("[knowledge-promote] promoted inbox items:")
    for slug, kind, doc_target, meta_target in PROMOTED:
        print(f"  - {slug} (kind={kind}) -> {doc_target.relative_to(ROOT)}")
else:
    print("[knowledge-promote] no inbox items to promote")

if SKIPPED:
    print("[knowledge-promote] skipped items:")
    for slug, reason in SKIPPED:
        print(f"  - {slug}: {reason}")
