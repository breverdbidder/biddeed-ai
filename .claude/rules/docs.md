---
pattern: "docs/**"
---
# Documentation Rules (loaded only when editing docs)

- Mermaid for flows/pipelines/state machines. NEVER ASCII art
- YAML for configs/checklists/structured data. NEVER prose for structured content
- Specs follow BRAINSTORM_PROTOCOL: BRAINSTORM→DESIGN→SPEC→PLAN→HANDOFF
- All docs reference Supabase table names, not abstract descriptions
- Version docs with date stamps. Stale docs (>30d untouched) get staleness warning
- INFRASTRUCTURE.md is authoritative for deployment topology
- Keep docs under 500 lines. Split into focused files if exceeding
