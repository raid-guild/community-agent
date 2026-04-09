# Ingest Contracts

Memory inbox example:

```json
{
  "source": "discord-agent",
  "ts": "2026-03-23T18:00:00Z",
  "type": "summary",
  "content": "Key decisions from the guild ops sync...",
  "bucket_hint": "guildhq",
  "author": "ops-bot",
  "participants": ["alice", "bob"],
  "participant_count": 2
}
```

Knowledge inbox example:

```json
{
  "filename": "ops-playbook.md",
  "content": "# Ops Playbook\n\nBody...",
  "metadata": {
    "title": "Ops Playbook",
    "slug": "ops-playbook",
    "kind": "guide",
    "summary": "How to run core guild ops.",
    "tags": ["operations", "workflow"],
    "owners": ["ops-team"],
    "status": "draft",
    "audience": "internal",
    "stability": "evolving",
    "updated": "2026-03-23",
    "entities": [],
    "related_docs": [],
    "triaged_at": "2026-03-23T18:00:00Z"
  }
}
```

Workflow knowledge inbox example:

```json
{
  "filename": "weekly-publishing-workflow.md",
  "content": "# Weekly Publishing Workflow\n\n## Purpose\n\nRun the weekly publishing cycle...\n",
  "metadata": {
    "title": "Weekly Publishing Workflow",
    "slug": "weekly-publishing-workflow",
    "kind": "guide",
    "summary": "Step-by-step workflow for planning, drafting, review, and publishing the weekly content cycle.",
    "tags": ["workflow"],
    "owners": ["content-team"],
    "status": "draft",
    "audience": "internal",
    "stability": "evolving",
    "updated": "2026-03-27",
    "entities": [],
    "related_docs": [],
    "triaged_at": "2026-03-27T18:00:00Z"
  }
}
```

Template knowledge inbox example:

```json
{
  "filename": "newsletter-template.md",
  "content": "# Newsletter Template\n\n## Subject\n\n## Intro\n\n## Highlights\n\n## CTA\n",
  "metadata": {
    "title": "Newsletter Template",
    "slug": "newsletter-template",
    "kind": "reference",
    "summary": "Reusable template for internal or external newsletter drafts.",
    "tags": ["template", "newsletter"],
    "owners": ["content-team"],
    "status": "draft",
    "audience": "internal",
    "stability": "evolving",
    "updated": "2026-03-27",
    "entities": [],
    "related_docs": [],
    "triaged_at": "2026-03-27T18:05:00Z"
  }
}
```
