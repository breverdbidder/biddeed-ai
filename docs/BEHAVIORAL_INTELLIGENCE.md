# Behavioral Intelligence Architecture

See full module: [`behavioral-intelligence/`](../behavioral-intelligence/README.md)

## Quick Reference

- **SQL Migration**: `behavioral-intelligence/migrations/20260308_behavioral_intelligence.sql`
- **Edge Functions**: `behavioral-intelligence/supabase/functions/`
- **PostHog Config**: `behavioral-intelligence/lib/posthog/config.ts`
- **Architecture Doc**: `behavioral-intelligence/docs/BEHAVIORAL_INTELLIGENCE_ARCHITECTURE.docx`

## New Stack Components

| Tool | Purpose | Cost |
|------|---------|------|
| PostHog | Behavioral tracking | $0 |
| Novu | Multi-channel notifications | $0 |
| Twilio | SMS (Tier 3 teasers) | $10-15/mo |
| Firebase Cloud Messaging | Push notifications | $0 |

## New Supabase Tables

- `user_events` — behavioral signals
- `user_buy_boxes` — computed buy boxes
- `user_teasers` — teaser delivery + outcomes
- `user_preferences` — channel preferences

## pg_cron Jobs

- 2:00 AM EST — compute_buy_boxes
- 6:00 AM EST — match_auctions
- 6:05 AM EST — send_teasers
