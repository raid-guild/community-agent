# Collector Authoring

The starter supports three collector modes in `superprism_poc/raidguild/config/space.json`:

- `builtin`
- `python`
- `command`

## Builtin

Use this for the collectors shipped in the starter:

- `discord_latest`
- `latest_meetings`
- `inbox_memory`

Example:

```json
{
  "key": "discord_latest",
  "type": "builtin",
  "enabled": true,
  "window_minutes": 60,
  "initial_backfill_hours": 72
}
```

## Python

Use this when your fork adds a collector class to a Python module.

Example:

```json
{
  "key": "forum_sync",
  "type": "python",
  "module": "custom_collectors.forum_sync",
  "class_name": "ForumSyncCollector",
  "enabled": true,
  "window_minutes": 60,
  "initial_backfill_hours": 24,
  "options": {
    "bucket": "forum",
    "endpoint_env": "FORUM_SYNC_URL"
  }
}
```

Expected class constructor:

```python
Collector(
    base_path=Path(...),
    config=SpaceConfig(...),
    collector_conf=CollectorConfig(...),
    state=StateManager(...),
    activity=ActivityLogger(...),
)
```

Expected runtime interface:

```python
collector.collector_key
collector.run(now=None, force=False, backfill_hours=None) -> dict
```

## Command

Use this when your fork wants collectors to point at scripts directly.

Example:

```json
{
  "key": "custom_feed",
  "type": "command",
  "command": [
    "python3",
    "examples/custom_collectors/example_command_collector.py"
  ],
  "enabled": true,
  "window_minutes": 60,
  "initial_backfill_hours": 24,
  "env": {
    "EXAMPLE_COLLECTOR_BUCKET": "custom"
  },
  "options": {
    "channel_name": "custom-feed"
  }
}
```

The command runs from repo root and receives these env vars:

- `PRISM_REPO_ROOT`
- `PRISM_BASE_PATH`
- `PRISM_CONFIG_PATH`
- `PRISM_STATE_PATH`
- `PRISM_ACTIVITY_PATH`
- `PRISM_SPACE_SLUG`
- `PRISM_COLLECTOR_KEY`
- `PRISM_COLLECTOR_OPTIONS` as JSON
- `PRISM_NOW`
- `PRISM_FORCE`
- `PRISM_BACKFILL_HOURS`

It should emit a JSON object on the last stdout line.

Minimum useful result:

```json
{
  "status": "ok",
  "outputs": [
    "superprism_poc/raidguild/buckets/custom/raw/2026-03-20/1000-1100.md"
  ],
  "windows_processed": 1,
  "collector_state": {
    "last_until": "2026-03-20T11:00:00Z",
    "window_minutes": 60
  }
}
```

Optional fields:

- `run_key`
- `activity_events`
- `processed_last_run`
- `rejected_last_run`

## Raw Output Contract

Downstream `digest -> memory -> seeds` stays unchanged as long as the collector writes raw files in the same shape used by the built-ins:

- path: `buckets/<bucket>/raw/YYYY-MM-DD/HHMM-HHMM.json`
- sibling markdown transcript: `buckets/<bucket>/raw/YYYY-MM-DD/HHMM-HHMM.md`

Required JSON structure:

```json
{
  "bucket": "custom",
  "since": "2026-03-20T10:00:00Z",
  "until": "2026-03-20T11:00:00Z",
  "window_key": "2026-03-20T100000Z_2026-03-20T110000Z",
  "channels": [
    {
      "channel_id": "custom-feed",
      "category_id": "custom_feed",
      "channel_name": "custom-feed",
      "channel_topic": "Optional topic",
      "messages": [
        {
          "id": "msg-1",
          "author": {
            "id": "source",
            "username": "source",
            "display_name": "Source"
          },
          "content": "Message text",
          "created_at": "2026-03-20T10:15:00Z",
          "jump_url": "https://example.com/item/1",
          "attachments": [],
          "embeds": []
        }
      ]
    }
  ],
  "skipped": [],
  "totals": {
    "channels": 1,
    "messages": 1
  }
}
```

## Shortcut

If you do not want to build the raw transcript files manually, import and use:

`community_memory.custom_collectors.write_collector_window`

That helper writes the markdown and JSON transcript pair in the expected format.
