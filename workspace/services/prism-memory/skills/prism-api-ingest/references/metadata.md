# Knowledge Metadata Rules

Use these heuristics:

- `guide`: how-to, process, onboarding, operational playbook
- `policy`: rules, governance, standards, decisions with ongoing force
- `reference`: lookup material, glossary, external resource summary
- `note`: narrow write-up, brownbag summary, transient but useful context
- `proposal`: suggested future change
- `architecture`: technical system design

Workflow and template guidance:

- reusable workflow docs should usually be `guide`
- workflows with mandatory or governance force may be `policy`
- reusable content or meeting templates should usually be `reference`
- avoid using `note` for artifacts intended to be reused repeatedly

Use the deployed config as the authority for allowed tags.

If the deployed config allows them, use tags that make retrieval easier:

- `workflow`
- `template`
- `newsletter`
- `announcement`
- `meeting`

Avoid:

- invented owners
- speculative entities
- vague summaries like "notes from a meeting"

Prefer:

- stable slugs
- explicit audiences
- factual summaries with no hype
