# BidDeed.AI — TODO.md
## Phase 1: Foundation (Week 1)

### ISSUE-001: Fork Setup + Auth + DB Swap
- [ ] Remove Vercel Postgres dependencies, install @supabase/ssr @supabase/supabase-js
- [ ] Create lib/supabase/client.ts (browser client)
- [ ] Create lib/supabase/server.ts (server-side client with cookies)
- [ ] Remove NextAuth, install @clerk/nextjs
- [ ] Create middleware.ts with Clerk auth (copy pattern from ZoneWise)
- [ ] Create app/(auth)/sign-in/[[...sign-in]]/page.tsx
- [ ] Create app/(auth)/sign-up/[[...sign-up]]/page.tsx
- [ ] Update app/layout.tsx with ClerkProvider + house brand colors
- [ ] Update app/api/chat/route.ts to use Anthropic Claude via Vercel AI SDK
- [ ] Replace all Vercel KV/Postgres calls with Supabase queries
- [ ] Set env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CLERK keys, ANTHROPIC_API_KEY
- [ ] Apply house brand: Navy #1E3A5F, Orange #F59E0B, Inter font, bg #020617
- [ ] Deploy to Vercel, verify auth + chat streaming works
- [ ] Test: sign in → send message → get Claude response → message persists in Supabase

### ISSUE-002: Supabase Schema
- [ ] Create supabase/migrations/001_biddeed_tables.sql
- [ ] Table: bd_chat_sessions (id, user_id, title, created_at, updated_at)
- [ ] Table: bd_chat_messages (id, session_id, role, content, tool_calls, created_at)
- [ ] Table: bd_auction_analysis (id, user_id, county, auction_date, properties_analyzed, created_at)
- [ ] Table: bd_property_reports (id, analysis_id, parcel_id, address, judgment, arv, max_bid, decision, liens_json)
- [ ] Table: bd_bid_decisions (id, report_id, decision, ratio, notes, created_at)
- [ ] Table: bd_user_preferences (user_id, default_county, max_judgment, notification_prefs)
- [ ] RLS policies: auth.jwt() ->> 'sub' = user_id on all bd_* tables
- [ ] Run migration against mocerqjnksmhcjzxrewo.supabase.co
- [ ] Verify RLS works with Clerk JWT

## Phase 2: Split-Screen UI (Week 2)

### ISSUE-003: Artifacts Panel
- [ ] Create components/artifacts/artifact-panel.tsx (right-side panel)
- [ ] Create components/artifacts/auction-report.tsx
- [ ] Create components/artifacts/lien-summary.tsx
- [ ] Create components/artifacts/property-map.tsx (Mapbox embed)
- [ ] Implement resizable split with drag handle
- [ ] Mobile: collapse artifacts to bottom sheet
- [ ] Wire artifact rendering from Claude tool call responses

### ISSUE-004: 3-Tab Mode Switcher
- [ ] Create components/mode-switcher.tsx
- [ ] Tab 1: Chat (current view + artifacts)
- [ ] Tab 2: Analysis (auction pipeline dashboard, batch operations)
- [ ] Tab 3: Reports (DOCX/PDF viewer + download history)
- [ ] Persist active tab in URL search params
- [ ] Keyboard shortcuts: Cmd+1/2/3

## Phase 3: API Bridge (Week 3)

### ISSUE-005: Supabase Edge Functions
- [ ] Create supabase/functions/auctions/index.ts
- [ ] Create supabase/functions/auctions-geojson/index.ts
- [ ] Create supabase/functions/zoning-lookup/index.ts
- [ ] Create supabase/functions/auction-zoning-enriched/index.ts
- [ ] Clerk JWT verification middleware for Edge Functions
- [ ] Rate limiting: 100 req/min per user
- [ ] Deploy: supabase functions deploy

### ISSUE-006: ZoneWise Auction Overlay
- [ ] Add "Auction Overlay" toggle to ZoneWise map view
- [ ] Fetch active auctions via Edge Function
- [ ] Render auction pins with BidDeed decision colors
- [ ] Click pin → popup with judgment, market value, zoning
- [ ] Filter controls: county, price range, auction date

## Phase 4: AI Agent Integration (Week 4)

### ISSUE-007: Claude Tools
- [ ] Create lib/ai/tools.ts with all 6 tool definitions
- [ ] Create lib/ai/prompts.ts with BidDeed system prompt
- [ ] Create lib/ai/max-bid.ts with formula implementation
- [ ] Wire tools into app/api/chat/route.ts streamText()
- [ ] Test each tool individually
- [ ] Test multi-tool conversations

### ISSUE-008: LangGraph Orchestration
- [ ] Connect Render-hosted agent pipeline
- [ ] Scraper → Analysis → Report → Decision agent flow
- [ ] State persistence to Supabase bd_* tables
- [ ] Circuit breakers on AcclaimWeb, BCPAO, RealForeclose
- [ ] Webhook callback to BidDeed.AI on pipeline completion

## Phase 5: Production (Week 5)

### ISSUE-009: Data Quality
- [ ] Fix 21 "miami-dade" → "miami_dade" rows in multi_county_auctions
- [ ] Add county name normalization to nightly scrape GitHub Action
- [ ] Validate all 46 county names match standardized enum

### ISSUE-010: Production Launch
- [ ] Point biddeed.ai domain → Vercel
- [ ] Clerk production keys + allowed origins for both domains
- [ ] Supabase RLS audit (pen test all endpoints)
- [ ] Load test: 100 concurrent users
- [ ] Install claude-code-scheduler plugin
- [ ] Configure all 6 scheduled tasks
- [ ] Monitoring: Supabase dashboard + Vercel analytics
