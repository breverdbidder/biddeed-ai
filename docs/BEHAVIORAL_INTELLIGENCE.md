# Behavioral Intelligence Architecture

See full module: [`behavioral-intelligence/`](../behavioral-intelligence/README.md)

## Current Status: TABLES LIVE, ENGINE PAUSED

**What's running now:**
- 4 Supabase tables with 22 indexes, RLS, triggers
- 2 analytics views (v_teaser_funnel, v_buy_box_health)
- Vault secret stored for future Edge Function auth

**What's paused (code ready, not deployed):**
- 4 Edge Functions (deploy when 50+ active users)
- 3 pg_cron jobs (commented out, enable after Edge Functions)
- PostHog tracking (deploy JS snippet at launch)
- Novu notifications (sign up when teaser engine needed)

## Activation Triggers

| Milestone | Action |
|-----------|--------|
| Frontend launch | Deploy PostHog JS snippet |
| 50+ active users | Deploy Edge Functions + enable pg_cron |
| 100+ active users | Set up Novu + notification channels |
| 200+ active users | Add Twilio SMS for Tier 3 teasers |

## Architecture Doc

Full ASCII diagrams and stack inventory:
`behavioral-intelligence/docs/BEHAVIORAL_INTELLIGENCE_ARCHITECTURE.docx`
