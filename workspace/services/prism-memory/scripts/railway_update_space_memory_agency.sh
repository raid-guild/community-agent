#!/usr/bin/env bash
# Update live Prism Memory space.json on Railway to exclude the 'agency' bucket from rolling memory.
# Usage:
#   export PRISM_OPS_KEY=your_ops_or_shared_key
#   ./scripts/railway_update_space_memory_agency.sh

set -euo pipefail

if [[ -z "${PRISM_OPS_KEY:-}" ]]; then
  echo "ERROR: PRISM_OPS_KEY is not set" >&2
  exit 1
fi

curl -sS -X PUT \
  -H "Content-Type: application/json" \
  -H "X-Prism-Api-Key: $PRISM_OPS_KEY" \
  -d @- \
  https://prism-api-production-409d.up.railway.app/config/space <<'EOF'
{
  "config": {
    "space_slug": "raidguild",
    "timezone": "America/Denver",
    "collectors": [
      {
        "key": "discord_latest",
        "enabled": true,
        "window_minutes": 60,
        "initial_backfill_hours": 72
      },
      {
        "key": "latest_meetings",
        "enabled": true,
        "window_minutes": 60,
        "initial_backfill_hours": 72
      },
      {
        "key": "inbox_memory",
        "enabled": true,
        "window_minutes": 60,
        "initial_backfill_hours": 1
      }
    ],
    "discord": {
      "category_to_bucket": {
        "684227450955235329": "townsquare",
        "685273857338376246": "guildhq",
        "685533846837788672": "raids",
        "1470894727342723082": "governance",
        "1009434800676946022": "cohort",
        "1470888731241087128": "agency",
        "1470885162848882809": "infrastructure",
        "1470884971060400169": "brand"
      },
      "bucket_defaults": {
        "mode": "high_signal"
      },
      "bucket_overrides": {
        "tavern": {
          "mode": "noisy_highlights",
          "max_highlights": 25
        }
      },
      "thread_promotion": {
        "enabled": true,
        "thread_ids": [],
        "min_messages": 6,
        "min_participants": 2
      }
    },
    "meetings": {
      "bucket": "meetings"
    },
    "knowledge": {
      "enabled": true,
      "docs_root": "superprism_poc/raidguild/knowledge/kb/docs",
      "metadata_root": "superprism_poc/raidguild/knowledge/kb/metadata",
      "index_root": "superprism_poc/raidguild/knowledge/kb/indexes",
      "triage_root": "superprism_poc/raidguild/knowledge/kb/triage",
      "activity_path": "superprism_poc/raidguild/knowledge/kb/activity/kb_activity.jsonl",
      "state_path": "superprism_poc/raidguild/knowledge/kb/state/kb_index_state.json",
      "triage_run_time_local": "18:15",
      "index_run_time_local": "18:25",
      "max_docs_per_triage_run": 20,
      "kinds": [
        "architecture",
        "guide",
        "policy",
        "proposal",
        "reference",
        "note"
      ],
      "constraints": {
        "allowed_kinds": [
          "architecture",
          "guide",
          "policy",
          "proposal",
          "reference",
          "note"
        ],
        "allowed_tags": [
          "cohort",
          "governance",
          "guildhq",
          "agency",
          "townsquare",
          "knowledge",
          "meetings",
          "memory",
          "operations",
          "workflow",
          "template",
          "newsletter",
          "announcement",
          "meeting",
          "onboarding",
          "security",
          "content",
          "funding",
          "partnerships",
          "events",
          "become-a-member",
          "become-an-apprentice",
          "bots",
          "champion-a-member",
          "cleric-sop",
          "code-of-conduct",
          "communication",
          "create-an-escrow",
          "culture",
          "dao",
          "dao-operations",
          "dao-roles",
          "dao-tokens",
          "delivery",
          "design-system",
          "discord",
          "escrow",
          "etiquette",
          "finance",
          "funding-an-escrow",
          "getting-paid",
          "glossary",
          "handbook",
          "intro",
          "intro-to-raiding",
          "intro-to-smartinvoice",
          "join-the-guild",
          "learn-about-web3",
          "membership",
          "navigation",
          "overview",
          "people",
          "raid-guild-shares",
          "raiding-on-optimism-chain",
          "raids",
          "resources",
          "rips",
          "skills-roles",
          "social-media",
          "what-is-raidguild"
        ],
        "allowed_status": [
          "draft",
          "active",
          "archived",
          "deprecated"
        ],
        "allowed_audiences": [
          "internal",
          "public"
        ],
        "allowed_stability": [
          "evergreen",
          "evolving"
        ],
        "max_tags_per_doc": 12,
        "max_entities_per_doc": 20,
        "max_related_docs_per_doc": 20,
        "require_owner": true,
        "strict_tag_enforcement": true
      }
    },
    "inbox": {
      "memory": {
        "default_bucket": "knowledge",
        "channel_name": "memory-inbox",
        "max_files_per_run": 100,
        "allowed_extensions": [
          ".md",
          ".json"
        ]
      }
    },
    "memory": {
      "exclude_buckets": [
        "agency"
      ],
      "stale_mark_days": 2,
      "stale_drop_days": 4,
      "max_counts": {
        "open_threads": 10,
        "key_decisions": 10,
        "action_items": 10,
        "facts": 10,
        "upcoming": 5
      }
    },
    "state": {
      "projects": {
        "enabled": true,
        "activity_windows": {
          "active_days": 7,
          "watching_days": 30
        },
        "detection": {
          "category_rules": [
            {
              "rule_id": "raids-prefix",
              "bucket": "raids",
              "channel_name_prefixes": [
                "raid-"
              ],
              "mode": "canonical_project_channel"
            }
          ],
          "fallback_channel_name_prefixes": []
        }
      }
    },
    "run": {
      "digest_run_time_local": "17:30",
      "memory_run_time_local": "17:45",
      "github_backup_run_time_local": "18:05"
    }
  }
}
EOF

echo "space.json updated to exclude 'agency' from rolling memory."
