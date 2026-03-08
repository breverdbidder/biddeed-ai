# BidDeed.AI Platform Architecture Plan
## "Claude AI for Real Estate" — Verified OSS Fork Strategy

**Author:** Claude AI Architect | **Date:** March 8, 2026
**For:** Ariel Shapira, Solo Founder — Everest Capital USA

---

## 1. CORRECTION: Why My Initial LibreChat Recommendation Was WRONG

After verifying against our actual stack, LibreChat is a **terrible fit**:

| Requirement          | Our Stack              | LibreChat              | Verdict |
|----------------------|------------------------|------------------------|---------|
| Database             | Supabase (Postgres)    | MongoDB (hard req)     | ❌ KILL |
| Auth                 | Clerk (ZoneWise uses)  | Own JWT/bcrypt/OAuth   | ❌ KILL |
| Framework            | Next.js App Router     | Express.js + React SPA | ❌ KILL |
| Deploy               | Vercel + Cloudflare    | Docker Compose only    | ❌ KILL |
| AI SDK               | Vercel AI SDK          | Custom LangChain       | ❌ MISS |
| Shared DB w/ZoneWise | Same Supabase instance | Isolated MongoDB       | ❌ KILL |

**5 out of 6 requirements FAIL.** LibreChat would require rewriting the entire backend.

Same problem with Open-Claude (Damienchakma): client-side only, localStorage persistence, no real backend, no auth system, no database. It's a pure frontend demo — useful for UI patterns only.

Same problem with Open Claude Cowork (Composio): Electron desktop app, Express backend, no Next.js, no Supabase, no Clerk.

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USERS / CLIENTS                              │
│   Browser (biddeed.ai)              Browser (zonewise.ai)           │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐          ┌─────────────────────────┐
│   BidDeed.AI Web    │          │    ZoneWise.AI Web      │
│   (Vercel)          │          │    (Vercel)             │
│                     │          │                         │
│ ┌─────────────────┐ │          │ ┌─────────────────────┐ │
│ │  Next.js 15     │ │          │ │  Next.js 15         │ │
│ │  App Router     │ │          │ │  App Router         │ │
│ │  Vercel AI SDK  │ │          │ │  CraftAgents UI     │ │
│ │  Clerk Auth     │ │          │ │  Clerk Auth (same)  │ │
│ └─────────────────┘ │          │ └─────────────────────┘ │
│                     │          │                         │
│ ┌─────────────────┐ │          │ ┌─────────────────────┐ │
│ │ CHAT    │REPORT │ │          │ │ CHAT  │ MAP │ ZONES │ │
│ │ (left)  │(right)│ │          │ │       │     │       │ │
│ │ Claude  │Auction│ │          │ │ Claude│Mapbx│County │ │
│ │ Stream  │Artfct │ │          │ │ Agent │     │ Data  │ │
│ └─────────────────┘ │          │ └─────────────────────┘ │
└──────────┬──────────┘          └────────────┬────────────┘
           │                                  │
           │         ┌──────────────┐         │
           │         │  Clerk Auth  │         │
           ├────────►│  (Shared)    │◄────────┤
           │         │  SSO across  │         │
           │         │  both apps   │         │
           │         └──────────────┘         │
           │                                  │
           ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (SHARED INSTANCE)                       │
│                mocerqjnksmhcjzxrewo.supabase.co                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SHARED TABLES                             │   │
│  │                                                             │   │
│  │  multi_county_auctions (245,017 rows, 46 FL counties)       │   │
│  │    ├── BidDeed.AI WRITES: daily scrape via GitHub Actions   │   │
│  │    └── ZoneWise.AI READS: auction overlay on zoning maps    │   │
│  │                                                             │   │
│  │  master_index (repos/files/docs/chats registry)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────┐   ┌────────────────────────────────┐     │
│  │  BidDeed.AI Tables   │   │  ZoneWise.AI Tables            │     │
│  │                      │   │                                │     │
│  │  bd_chat_sessions    │   │  zoning_districts              │     │
│  │  bd_chat_messages    │   │  county_configs                │     │
│  │  bd_auction_analysis │   │  user_lookups                  │     │
│  │  bd_property_reports │   │  scraper_runs                  │     │
│  │  bd_bid_decisions    │   │                                │     │
│  │  bd_user_preferences │   │                                │     │
│  └──────────────────────┘   └────────────────────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    API BRIDGE (Edge Functions)               │   │
│  │                                                             │   │
│  │  /api/v1/auctions                                           │   │
│  │    → Serves auction data to ZoneWise.AI                     │   │
│  │    → Filters by county, status, date range                  │   │
│  │                                                             │   │
│  │  /api/v1/auctions/geojson                                   │   │
│  │    → GeoJSON FeatureCollection for ZoneWise map overlay     │   │
│  │                                                             │   │
│  │  /api/v1/zoning-lookup                                      │   │
│  │    → BidDeed.AI queries zoning for auction properties       │   │
│  │    → Returns permitted uses, setbacks, restrictions         │   │
│  │                                                             │   │
│  │  /api/v1/auction-zoning-enriched                            │   │
│  │    → JOIN auctions + zoning in single response              │   │
│  │    → Both platforms consume this                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI / AGENT LAYER                                  │
│                                                                     │
│  ┌─────────────────────┐   ┌─────────────────────────────────┐     │
│  │  Anthropic API      │   │  LangGraph Orchestration         │     │
│  │  Claude Sonnet 4.5  │   │  (Render)                        │     │
│  │  (primary model)    │   │                                   │     │
│  │                     │   │  ┌───────────┐ ┌───────────────┐ │     │
│  │  Via Vercel AI SDK: │   │  │ Scraper   │ │ Analysis      │ │     │
│  │  streamText()       │   │  │ Agent     │ │ Agent         │ │     │
│  │  generateObject()   │   │  │ (auctions)│ │ (liens/title) │ │     │
│  │  tool calling       │   │  └───────────┘ └───────────────┘ │     │
│  └─────────────────────┘   │  ┌───────────┐ ┌───────────────┐ │     │
│                             │  │ Report    │ │ Zoning        │ │     │
│                             │  │ Agent     │ │ Agent         │ │     │
│                             │  │ (DOCX/PDF)│ │ (ZoneWise API)│ │     │
│                             │  └───────────┘ └───────────────┘ │     │
│                             └─────────────────────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  GitHub Actions (Nightly 11PM EST)                           │   │
│  │    → Scrape 46 FL county auctions                           │   │
│  │    → Normalize county names (fix miami-dade → miami_dade)   │   │
│  │    → Write to multi_county_auctions                         │   │
│  │    → Trigger ZoneWise cache invalidation                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. BidDeed.AI UI LAYOUT

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────┐  BidDeed.AI                    [User] ▼  [Settings] ⚙   │
│  │ LOGO │  "Claude AI for Real Estate"                              │
│  └──────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│  [💬 Chat]  [📊 Analysis]  [📄 Reports]          ← 3 TAB MODES    │
├────────────────────────────┬────────────────────────────────────────┤
│                            │                                        │
│  CHAT PANEL (LEFT)         │  ARTIFACTS PANEL (RIGHT)               │
│                            │                                        │
│  ┌──────────────────────┐  │  ┌──────────────────────────────────┐  │
│  │ 🤖 Welcome to        │  │  │                                  │  │
│  │ BidDeed.AI! I can    │  │  │  [Auction Report]                │  │
│  │ analyze foreclosure  │  │  │                                  │  │
│  │ auctions, check      │  │  │  Property: 2826 Hester Ave SE    │  │
│  │ liens, estimate ARV, │  │  │  Palm Bay, FL 32909              │  │
│  │ and generate bid     │  │  │                                  │  │
│  │ recommendations.     │  │  │  Judgment: $185,000              │  │
│  │                      │  │  │  ARV Est:  $265,000              │  │
│  │ What property would  │  │  │  Max Bid:  $145,500              │  │
│  │ you like to analyze? │  │  │  Decision: ✅ BID               │  │
│  └──────────────────────┘  │  │                                  │  │
│                            │  │  Liens Found: 6                  │  │
│  ┌──────────────────────┐  │  │  ├─ Mortgage: $142,000           │  │
│  │ 👤 Analyze the Dec 3 │  │  │  ├─ Tax Cert: $3,200            │  │
│  │ Brevard auction for  │  │  │  ├─ HOA Lien: $8,500            │  │
│  │ properties under     │  │  │  ├─ Utility: $1,200             │  │
│  │ $200K judgment       │  │  │  ├─ Utility: $800               │  │
│  └──────────────────────┘  │  │  └─ Code Lien: $2,500           │  │
│                            │  │                                  │  │
│  ┌──────────────────────┐  │  │  [📥 Download DOCX] [📊 Full]   │  │
│  │ 🤖 Found 7 matching  │  │  │                                  │  │
│  │ properties. Report → │  │  └──────────────────────────────────┘  │
│  └──────────────────────┘  │                                        │
│                            │  ┌──────────────────────────────────┐  │
│  ┌──────────────────────┐  │  │ 🗺️ PROPERTY MAP                 │  │
│  │ 💬 Type a message... │  │  │  [Mapbox with auction pins]      │  │
│  │              [Send ▶]│  │  │  green=BID red=SKIP yellow=REV   │  │
│  └──────────────────────┘  │  └──────────────────────────────────┘  │
├────────────────────────────┴────────────────────────────────────────┤
│  House Brand: Navy #1E3A5F | Orange #F59E0B | Inter Font           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. CORRECTED OSS EVALUATION

### Our Non-Negotiable Requirements

```
MUST HAVE:
  ✓ Next.js App Router          (matches ZoneWise)
  ✓ Supabase Postgres           (same instance, shared tables)
  ✓ Clerk Auth                  (SSO across BidDeed + ZoneWise)
  ✓ Vercel deployment           (matches ZoneWise)
  ✓ Vercel AI SDK               (streaming, tool calling)
  ✓ Split-screen chat+artifacts (Claude-style UI)
  ✓ API bridge                  (feed auctions → ZoneWise)
  ✓ House brand                 (Navy/Orange/Inter)
```

### Candidate Scoring (Verified)

```
┌──────────────────────────────┬────────┬────────┬────────┬─────────┐
│ Criteria (weight)            │Vercel  │Open-   │Libre-  │Supabase │
│                              │Chatbot │Claude  │Chat    │Chatbot  │
│                              │vercel/ │Damien/ │danny/  │supa-com/│
│                              │chatbot │Open-cl │LibreCh │ai-chatbt│
├──────────────────────────────┼────────┼────────┼────────┼─────────┤
│ Next.js App Router (15%)     │ ✅ 15  │ ⚠️  8  │ ❌  0  │ ✅  15  │
│ Supabase Postgres (20%)      │ ⚠️ 10  │ ❌  0  │ ❌  0  │ ✅  20  │
│ Clerk Auth Swap (10%)        │ ✅ 10  │ ❌  0  │ ❌  0  │ ⚠️   5  │
│ Vercel Deploy (10%)          │ ✅ 10  │ ⚠️  5  │ ❌  0  │ ✅  10  │
│ Vercel AI SDK (10%)          │ ✅ 10  │ ❌  0  │ ❌  0  │ ✅  10  │
│ Split-Screen Artifacts (15%) │ ⚠️  8  │ ✅ 15  │ ✅ 15  │ ⚠️   5  │
│ 3-Tab Mode Switch (10%)      │ ❌  0  │ ✅ 10  │ ⚠️  5  │ ❌   0  │
│ Community / Stars (5%)       │ ✅  5  │ ⚠️  2  │ ✅  5  │ ⚠️   3  │
│ Active Maintenance (5%)      │ ✅  5  │ ⚠️  2  │ ✅  5  │ ⚠️   3  │
├──────────────────────────────┼────────┼────────┼────────┼─────────┤
│ TOTAL (100)                  │  73    │  42    │  30    │   71    │
└──────────────────────────────┴────────┴────────┴────────┴─────────┘

VERDICT: No single repo scores >75. Use HYBRID approach.
```

### Winning Strategy: Hybrid Fork

```
FOUNDATION ──► vercel/chatbot                    (73/100 base)
  + DB SWAP ──► supabase-community pattern       (fills Postgres gap)
  + UI GRAFT ─► Open-Claude artifact panel       (fills split-screen gap)
  + UI GRAFT ─► Open-Claude ModeSwitcher.jsx     (fills 3-tab gap)
  + AUTH ─────► Clerk middleware from ZoneWise    (already built)
  + NEW ──────► Supabase Edge Functions           (API bridge)
```

---

## 5. BidDeed.AI ↔ ZoneWise.AI DATA FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                             │
│                                                                 │
│  BIDDEED.AI (PRODUCER)                                          │
│  ┌──────────────────┐                                           │
│  │ GitHub Actions    │──── Nightly 11PM EST ────┐               │
│  │ Scrape 46 counties│                          │               │
│  └──────────────────┘                          ▼               │
│                                    ┌──────────────────┐         │
│                                    │ multi_county_     │         │
│                                    │ auctions          │         │
│                                    │ (245,017 rows)    │         │
│                                    │                   │         │
│                                    │ judgment_amount   │         │
│                                    │ market_value      │         │
│                                    │ property_address  │         │
│                                    │ auction_date      │         │
│                                    │ status            │         │
│                                    │ lat/lng           │         │
│                                    └────────┬─────────┘         │
│                                             │                   │
│  ┌──────────────────────────────────────────┼──────────────┐    │
│  │         SUPABASE EDGE FUNCTIONS          │              │    │
│  │                                          │              │    │
│  │  GET /api/v1/auctions                    │              │    │
│  │    ?county=brevard&status=active          │              │    │
│  │    → JSON array of auctions              │              │    │
│  │                                          │              │    │
│  │  GET /api/v1/auctions/geojson            │              │    │
│  │    ?county=brevard                       │              │    │
│  │    → GeoJSON FeatureCollection           │              │    │
│  │    → For ZoneWise map overlay            │              │    │
│  │                                          │              │    │
│  │  GET /api/v1/zoning-for-parcel           │              │    │
│  │    ?parcel_id=12-34-56                   │              │    │
│  │    → BidDeed reads from ZoneWise tables  │              │    │
│  │                                          │              │    │
│  │  GET /api/v1/auction-zoning-enriched     │              │    │
│  │    → Auctions JOIN zoning data           │              │    │
│  │    → Combined view for both platforms    │              │    │
│  │                                          │              │    │
│  │  Auth: Clerk JWT on all endpoints        │              │    │
│  │  Rate: 100 req/min per user              │              │    │
│  └──────────────────────────────────────────┘              │    │
│                                             │                   │
│  ZONEWISE.AI (CONSUMER)                     ▼                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  New Feature: "Auction Overlay" Toggle               │       │
│  │  - Fetches active auctions from Edge Function        │       │
│  │  - Renders pins on Mapbox zoning map                 │       │
│  │  - Pin colors match BidDeed decisions:               │       │
│  │    🟢 green = BID   🟡 yellow = REVIEW   🔴 red = SKIP│       │
│  │  - Click pin → popup: judgment, value, zoning info   │       │
│  │  - Filter by county, price range, auction date       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
│  DATA FIX NEEDED:                                               │
│  21 rows "miami-dade" (hyphen) vs 19,498 "miami_dade"           │
│  → Normalize in nightly scrape pipeline                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. TECH STACK ALIGNMENT

```
┌──────────────────┬────────────────────┬────────────────────────┐
│ Layer            │ BidDeed.AI         │ ZoneWise.AI            │
├──────────────────┼────────────────────┼────────────────────────┤
│ Frontend         │ Next.js 15         │ Next.js 15             │
│ UI Framework     │ Tailwind + shadcn  │ Tailwind + shadcn      │
│ Auth             │ Clerk (SHARED)     │ Clerk (SHARED)         │
│ Database         │ Supabase (SHARED)  │ Supabase (SHARED)      │
│ AI SDK           │ Vercel AI SDK      │ Vercel AI SDK          │
│ AI Model         │ Claude Sonnet 4.5  │ Claude Sonnet 4.5      │
│ Deploy (Web)     │ Vercel             │ Vercel                 │
│ Deploy (Agents)  │ Render             │ Render                 │
│ Maps             │ Mapbox (everest18) │ Mapbox (everest18)     │
│ CI/CD            │ GitHub Actions     │ GitHub Actions         │
│ Brand Colors     │ Navy/Orange/Inter  │ Navy/Orange/Inter      │
│ Domain           │ biddeed.ai         │ zonewise.ai            │
├──────────────────┴────────────────────┴────────────────────────┤
│ SHARED: Clerk org, Supabase instance, GitHub org, Mapbox acct  │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. CLERK SHARED AUTH

```
┌─────────────────────────────────────────────────┐
│            CLERK ORGANIZATION                    │
│                                                  │
│  ┌──────────────┐    ┌────────────────────┐     │
│  │ App 1        │    │ App 2              │     │
│  │ biddeed.ai   │    │ zonewise.ai        │     │
│  │ CLERK_KEY_BD │    │ CLERK_KEY_ZW       │     │
│  └──────┬───────┘    └────────┬───────────┘     │
│         └─────────┬───────────┘                  │
│         ┌─────────▼──────────┐                   │
│         │  Shared User Pool  │                   │
│         │  Sign up on either │                   │
│         │  → same user_id    │                   │
│         │                    │                   │
│         │  JWT includes:     │                   │
│         │  - sub (user_id)   │                   │
│         │  - email           │                   │
│         └────────────────────┘                   │
│                                                  │
│  Supabase RLS:                                   │
│  auth.jwt() ->> 'sub' = clerk_user_id            │
│  Same policy applies across both apps            │
└──────────────────────────────────────────────────┘
```

---

## 8. IMPLEMENTATION PLAN (Traycer Issues)

### Phase 1: Foundation (Week 1)
```
ISSUE-001: Fork vercel/chatbot → breverdbidder/biddeed-ai
  - Fork repo
  - Replace Vercel Postgres → Supabase client (@supabase/ssr)
  - Replace NextAuth → Clerk (reuse ZoneWise middleware.ts)
  - Apply house brand (Navy #1E3A5F, Orange #F59E0B, Inter)
  - Set Anthropic as default model via Vercel AI SDK
  - Deploy to Vercel as biddeed-ai.vercel.app
  - VERIFY: Clerk auth works, Claude streams, Supabase persists

ISSUE-002: Create Supabase schema for BidDeed.AI
  - Tables: bd_chat_sessions, bd_chat_messages,
    bd_auction_analysis, bd_property_reports,
    bd_bid_decisions, bd_user_preferences
  - RLS policies: auth.jwt() ->> 'sub' = user_id
  - Migration files: supabase/migrations/
  - bd_ prefix to avoid collision with ZoneWise tables
```

### Phase 2: Split-Screen UI (Week 2)
```
ISSUE-003: Build Artifacts Panel (right side)
  - Borrow layout pattern from Open-Claude ArtifactPanel.jsx
  - Artifact types: auction report, lien summary, property map
  - Render: React components inline, Mapbox embeds, HTML reports
  - Resizable split with drag handle
  - Collapse to bottom sheet on mobile

ISSUE-004: Add 3-Tab Mode Switcher
  - Tab 1: Chat (Claude conversation + artifacts)
  - Tab 2: Analysis (auction pipeline dashboard, batch ops)
  - Tab 3: Reports (generated DOCX/PDF viewer + history)
  - Borrow pattern from Open-Claude ModeSwitcher.jsx
  - Persist active tab in URL params
```

### Phase 3: API Bridge (Week 3)
```
ISSUE-005: Supabase Edge Functions for cross-platform API
  - /api/v1/auctions — filtered auction list
  - /api/v1/auctions/geojson — GeoJSON for ZoneWise maps
  - /api/v1/zoning-for-parcel — BidDeed reads ZoneWise data
  - /api/v1/auction-zoning-enriched — JOIN view
  - Clerk JWT verification on all endpoints
  - Rate limit: 100 req/min per user
  - Deploy via: supabase functions deploy

ISSUE-006: ZoneWise "Auction Overlay" feature
  - New toggle switch on ZoneWise map view
  - Fetches active auctions via Edge Function
  - Renders auction pins with BidDeed decision colors
  - Click pin → popup: judgment, market value, zoning
  - Filter controls: county, price range, date
```

### Phase 4: AI Agent Integration (Week 4)
```
ISSUE-007: Wire Claude tools via Vercel AI SDK
  - Tool: search_auctions → query multi_county_auctions
  - Tool: lookup_zoning → call ZoneWise API bridge
  - Tool: calculate_max_bid → (ARV×70%)-Repairs-$10K-MIN($25K,15%ARV)
  - Tool: generate_report → create DOCX artifact
  - Tool: search_liens → AcclaimWeb lookup
  - All via Vercel AI SDK experimental_createToolCallingStream

ISSUE-008: Connect LangGraph orchestration (Render)
  - Scraper Agent → Analysis Agent → Report Agent → Decision Agent
  - State persistence to Supabase bd_* tables
  - Circuit breakers on AcclaimWeb, BCPAO, RealForeclose
  - Webhook callback to BidDeed.AI when pipeline completes
```

### Phase 5: Data Quality + Production (Week 5)
```
ISSUE-009: Data cleanup
  - Fix 21 "miami-dade" → "miami_dade" rows
  - Add county name normalization to nightly scrape
  - Validate all 46 county names match enum list

ISSUE-010: Production deployment
  - Point biddeed.ai domain → Vercel
  - Clerk production keys + allowed origins
  - Supabase RLS audit (pen test all endpoints)
  - Load test: 100 concurrent users
  - Monitoring: Supabase dashboard + Vercel analytics
```

---

## 9. REPO STRUCTURE

```
breverdbidder/biddeed-ai/           ← FORK of vercel/chatbot
├── .github/workflows/
│   └── scrape-auctions.yml         ← Nightly 46-county scrape
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/ ← Clerk
│   │   └── sign-up/[[...sign-up]]/ ← Clerk
│   ├── (chat)/
│   │   ├── page.tsx                 ← Split-screen chat
│   │   └── layout.tsx
│   ├── (analysis)/
│   │   └── page.tsx                 ← Auction pipeline
│   ├── (reports)/
│   │   └── page.tsx                 ← Report viewer
│   └── api/chat/
│       └── route.ts                 ← Vercel AI SDK stream
├── components/
│   ├── chat/
│   │   ├── chat-panel.tsx
│   │   └── message.tsx
│   ├── artifacts/
│   │   ├── artifact-panel.tsx       ← Right-side panel
│   │   ├── auction-report.tsx
│   │   ├── lien-summary.tsx
│   │   └── property-map.tsx         ← Mapbox embed
│   ├── mode-switcher.tsx            ← 3-tab nav
│   └── ui/                          ← shadcn
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── ai/
│   │   ├── tools.ts                 ← Claude tool defs
│   │   ├── prompts.ts               ← System prompts
│   │   └── max-bid.ts               ← Bid formula
│   └── api/
│       └── zonewise-bridge.ts       ← ZoneWise API client
├── supabase/
│   ├── migrations/
│   │   ├── 001_chat_tables.sql
│   │   ├── 002_auction_analysis.sql
│   │   └── 003_api_bridge_functions.sql
│   └── functions/
│       ├── auctions/index.ts
│       ├── auctions-geojson/index.ts
│       ├── zoning-lookup/index.ts
│       └── auction-zoning-enriched/index.ts
├── middleware.ts                     ← Clerk (from ZoneWise)
├── CLAUDE.md
└── TODO.md
```

---

## 10. COST ANALYSIS

```
┌────────────────────────┬──────────┬───────────────────────────┐
│ Service                │ Monthly  │ Notes                     │
├────────────────────────┼──────────┼───────────────────────────┤
│ Vercel (BidDeed)       │ $0       │ Hobby tier                │
│ Vercel (ZoneWise)      │ $0       │ Already deployed          │
│ Supabase               │ $0       │ Free tier, shared         │
│ Clerk                  │ $0       │ Free tier, 10K MAU        │
│ Anthropic API          │ ~$50     │ Max plan usage            │
│ Render (agents)        │ $7       │ Starter instance          │
│ Mapbox                 │ $0       │ Free tier                 │
│ GitHub Actions         │ $0       │ Free for public repos     │
│ Domain (biddeed.ai)    │ ~$1      │ Annual / 12               │
├────────────────────────┼──────────┼───────────────────────────┤
│ TOTAL NEW COST         │ ~$58/mo  │ Under $100/mo target ✅   │
└────────────────────────┴──────────┴───────────────────────────┘
```

---

## SUMMARY: Initial vs Corrected Recommendation

| Initial (WRONG)                    | Corrected (RIGHT)                         |
|------------------------------------|-------------------------------------------|
| Fork LibreChat (MongoDB)           | Fork vercel/chatbot (Supabase/Postgres)   |
| LibreChat auth (JWT/bcrypt)        | Clerk (shared with ZoneWise SSO)          |
| Docker Compose deployment          | Vercel (same as ZoneWise)                 |
| Express.js backend                 | Next.js App Router + API routes           |
| Isolated database                  | Shared Supabase instance                  |
| No API bridge planned              | Edge Functions connecting both platforms   |
| Steal from 3 repos                 | Fork 1 + graft UI from 1 other            |
| No auction data flow               | multi_county_auctions feeds ZoneWise maps  |
