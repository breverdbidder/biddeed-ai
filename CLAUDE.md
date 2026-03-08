# BidDeed.AI — Claude Code Root Directive

## Identity
BidDeed.AI is "Claude AI for Real Estate" — an agentic foreclosure auction intelligence platform.
Forked from vercel/chatbot. House brand: Navy #1E3A5F, Orange #F59E0B, Inter font, bg #020617.

## Architecture
- **Frontend:** Next.js 15 App Router + Vercel AI SDK + shadcn/ui + Tailwind
- **Auth:** Clerk (shared with ZoneWise.AI — same Clerk org, SSO)
- **Database:** Supabase Postgres (shared instance: mocerqjnksmhcjzxrewo.supabase.co)
- **AI Model:** Claude Sonnet 4.5 via Vercel AI SDK streamText()
- **Deploy:** Vercel (web) + Render (agents)
- **Maps:** Mapbox (account: everest18)
- **Scheduler:** claude-code-scheduler plugin for autonomous ops

## Shared Resources with ZoneWise.AI
- Same Supabase instance (multi_county_auctions table: BidDeed WRITES, ZoneWise READS)
- Same Clerk organization (users sign up once, SSO across both apps)
- Same Mapbox account (everest18)
- API Bridge via Supabase Edge Functions

## Key Tables (bd_ prefix to avoid ZoneWise collision)
- bd_chat_sessions, bd_chat_messages
- bd_auction_analysis, bd_property_reports
- bd_bid_decisions, bd_user_preferences
- multi_county_auctions (SHARED — 245,017 rows, 46 FL counties)

## Claude Tools (Vercel AI SDK tool calling)
- search_auctions → Supabase multi_county_auctions
- lookup_zoning → Edge Fn /api/v1/zoning-for-parcel
- calculate_max_bid → (ARV*70%)-Repairs-$10K-MIN($25K,15%*ARV)
- search_liens → AcclaimWeb scraper
- generate_report → docx-js server-side
- get_property_details → BCPAO API

## Decision Thresholds
- Bid/Judgment ≥ 75% → BID (green)
- Bid/Judgment 60-74% → REVIEW (yellow)
- Bid/Judgment < 60% → SKIP (red)

## Rules
- NEVER use Google Drive, ZIP files, or local installations
- TODO.md is mandatory — load before any task, mark [x] when done
- All commits need descriptive messages
- Test before pushing
- Update this file when architecture changes
- bd_ prefix on all new Supabase tables
- House brand colors on all UI work
