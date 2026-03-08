# BidDeed.AI — Behavioral Intelligence Module

## Nir Eyal Hooked Model Integration

Passive behavioral tracking + automated teaser delivery for distressed asset investors.

### Current Status (March 9, 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase tables (4) | ✅ LIVE | user_events, user_buy_boxes, user_teasers, user_preferences |
| Indexes (22) | ✅ LIVE | Optimized for buy box computation queries |
| Triggers (3) | ✅ LIVE | Auto-update updated_at |
| Analytics views (2) | ✅ LIVE | v_teaser_funnel, v_buy_box_health |
| RLS + policies | ✅ LIVE | service_role access only (user policies added when auth ready) |
| Vault secret | ✅ LIVE | service_role_key stored for future pg_cron auth |
| Edge Functions (4) | ⏸️ CODE READY | Not deployed — deploy when 50+ users active |
| pg_cron jobs (3) | ⏸️ COMMENTED OUT | Re-enable after Edge Functions deployed |
| PostHog tracking | ⏸️ CODE READY | Deploy JS snippet when frontend goes live |
| Novu notifications | ⏸️ NOT STARTED | Sign up + configure when teaser engine needed |

### Activation Checklist

Deploy these **in order** when user count justifies each phase:

```
Phase 1: PostHog (deploy at launch, even with 1 user)
  □ Sign up at https://us.posthog.com/signup (free, 1M events/mo)
  □ Get project API key
  □ Set NEXT_PUBLIC_POSTHOG_KEY in Cloudflare Pages env vars
  □ PostHogProvider.tsx already in biddeed-ai-ui — just needs the key

Phase 2: Edge Functions + Cron (deploy at 50+ active users)
  □ supabase functions deploy compute-buy-boxes
  □ supabase functions deploy match-auctions
  □ supabase functions deploy posthog-webhook
  □ Set POSTHOG_WEBHOOK_SECRET as Edge Function secret
  □ Configure PostHog webhook → Edge Function URL
  □ Uncomment pg_cron jobs in migration file, run in SQL Editor

Phase 3: Novu + Channels (deploy at 100+ active users)
  □ Sign up at https://web.novu.co/auth/signup (free)
  □ Create templates: biddeed-teaser-tier1-digest, tier2-strong, tier3-urgent
  □ Connect Resend as email provider
  □ Connect Firebase Cloud Messaging for push
  □ supabase functions deploy send-teasers
  □ Set NOVU_API_KEY as Edge Function secret

Phase 4: SMS (deploy at 200+ active users with proven engagement)
  □ Sign up for Twilio
  □ Connect Twilio as SMS provider in Novu
  □ Enable Tier 3 SMS delivery
```

### File Structure

```
behavioral-intelligence/
├── README.md                                    # This file
├── migrations/
│   └── 20260308_behavioral_intelligence.sql     # Tables + indexes + views
│                                                 # pg_cron jobs COMMENTED OUT
├── supabase/functions/
│   ├── compute-buy-boxes/index.ts               # Buy box engine (2 AM)
│   ├── match-auctions/index.ts                  # Auction matcher (6 AM)
│   ├── send-teasers/index.ts                    # Novu delivery (6:05 AM)
│   └── posthog-webhook/index.ts                 # PostHog → user_events sync
├── lib/
│   └── posthog/config.ts                        # 20 tracking functions
└── docs/
    └── BEHAVIORAL_INTELLIGENCE_ARCHITECTURE.docx
```

### Key Design Decisions

**No foreign keys on user_id** — Tables use `UUID NOT NULL` without FK to `auth.users`. This allows PostHog to write events using distinct_id before Supabase auth signup, and avoids CASCADE issues during development. Add FK constraints when user auth is stable.

**pg_cron jobs commented out** — The cron jobs call Edge Functions that aren't deployed yet. Running them would generate silent 404 failures in `cron.job_run_details`. Uncomment and run only after Edge Functions are live.

**PostHog webhook has auth** — The `posthog-webhook` Edge Function validates an `x-webhook-secret` header. Generate a random string, set it as both the Supabase secret and the PostHog webhook header.

**RLS is service_role only** — Current policies grant full access to service_role (Edge Functions, admin). User-facing `auth.uid()` policies are in the migration as comments — enable when user auth flows are built.

### Monthly Cost (When Fully Active)

| Tool | Cost |
|------|------|
| PostHog | $0 (1M events/mo free) |
| Supabase Edge Functions + pg_cron | $0 (included in Pro) |
| Novu | $0 (open source free tier) |
| Resend | $0-20/mo |
| Twilio SMS (Tier 3 only) | $10-15/mo |
| Firebase Cloud Messaging | $0 |
| **Total** | **$10-35/mo** |

---

*Module designed by Claude AI Architect — March 8, 2026*
