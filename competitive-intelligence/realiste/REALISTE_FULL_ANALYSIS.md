# REALISTE AI — FULL REVERSE ENGINEERING ANALYSIS
## Compiled from 13 pages, 12 API files, 601KB JS bundle | March 11, 2026

---

## 1. INFRASTRUCTURE ARCHITECTURE (3 Separate Servers)

| Domain | Server | CDN | Tracking | Auth Headers |
|--------|--------|-----|----------|-------------|
| realiste.ai | Cloudflare | Yes | Ahoy (ahoy_visit 4h, ahoy_visitor 4h) + Sentry | x-client-token, x-encrypted-token, x-api-key |
| titleman.ai | **Nginx (NO Cloudflare!)** | No | None visible | x-client-token, x-encrypted-token, x-api-key, **jwt-aud, authorization** |
| cloud.realiste.ai | Cloudflare | Yes | i18n cookie (1yr expiry) | Same as titleman (jwt-aud, authorization) |

**Key finding:** Titleman runs on Nginx without Cloudflare protection. Realiste and cloud.realiste.ai run behind Cloudflare. All three share identical CORS config (access-control-allow-origin: *).

**Auth architecture (from JS bundle):**
- JWT-TOKEN stored in cookie
- JWT-AUD (audience claim) — identifies which platform (realiste vs titleman)
- JWT-REFRESH-TOKEN for session renewal
- Authorization header format: `${type} ${token}` (Bearer token)
- USER-EMAIL cookie for identification

---

## 2. GRAPHQL API (15 Operations Discovered)

These are the actual GraphQL operations compiled into the JS bundle:

| Operation | Type | Purpose |
|-----------|------|---------|
| `agglomeration` | Query | City/region data aggregation |
| `agglomerationArea` | Query | Geographic area boundaries |
| `agglomerationsP` | Query | Paginated city/region list |
| `app` | Query | Application config/state |
| `authRefreshToken` | Mutation | JWT token refresh |
| `buildingInfo` | Query | **Core: Individual property/building data** |
| `currentClient` | Query | Logged-in user profile |
| `exchangeRate` | Query | Currency conversion rates |
| `govTransactionStats` | Query | **Government transaction statistics** |
| `govTransactionsShort` | Query | Abbreviated transaction records |
| `imageProcessor` | Query/Mutation | Image handling |
| `projectOnSale` | Query | Active project listings |
| `specialEventsByPoint` | Query | Location-based events/developments |
| `tags` | Query | Category/filter tags |

**Critical insight:** `govTransactionStats` and `govTransactionsShort` mean they pull GOVERNMENT TRANSACTION DATA. This is their secret sauce — actual recorded transactions from government registries (like Dubai Land Department), not just listing data.

---

## 3. COMPLETE DATA MODEL (238 Real Estate Terms Extracted)

### Property/Unit Level KPIs (Per Property):

**Pricing (15 KPIs):**
- building_unit__price (current price)
- building_unit__price_area (price per area)
- building_unit__price_forecast_1_year
- building_unit__price_forecast_2_year
- building_unit__price_forecast_3_year
- building_unit__price_forecast_4_year
- building_unit__price_forecast_5_year
- unitprice (by bedrooms: 0br, 1br, 2br, 3br, 4br)
- unitpricearea (price/area by bedrooms: 0br-4br)

**Rental & ROI (20 KPIs):**
- building_unit__rent_roi
- building_unit__roi
- building_info__rent_income
- building_info__rent_roi
- building_info__building_rent_income_rooms_0br through 4br (5 KPIs)
- building_info__building_rent_roi_rooms_0br through 4br (5 KPIs)
- roi_rooms_0br through 4br (5 KPIs)
- rentalyield
- roioncapital
- roiyear

**Sales/Market Activity (8 KPIs):**
- building_info__sold_last_week
- building_info__units_available
- building_info__units_sold
- building_info__exposition_for_sold_last_week
- unitssold
- unitssoldarea
- unitsavailable
- unitsstockupdatedat

**Building/Property Attributes (15+ KPIs):**
- building_info__building_class
- building_info__building_nbr
- building_info__booked_level
- buildinghandover (completion date)
- buildingprelaunch (pre-launch status)
- building_ratings + building_ratings_order
- developer__rating
- buildingfloorplan
- property_types
- unit_group_types
- unit_states
- unitbedrooms
- unitfloornumber
- unitgrouptype
- apartments, villa (property type flags)

**Forecast & Analytics (10 KPIs):**
- forecast1y through forecast5y (5 separate year forecasts)
- forecastdata
- forecastlimit
- forecastavailable
- forecastvisible
- propertypricechangeslices (price history segments)

**Pricing by Bedroom Count (20 KPIs):**
- building_sprice_rooms_0br through 4br (sale price by room count)
- building_tprice_rooms_0br through 4br (target/estimated price by room count)
- building_rent_income_rooms_0br through 4br
- building_rent_roi_rooms_0br through 4br

**Developer Analytics:**
- developerlayers (map layers by developer)
- developerrange
- developerscount
- developersfilters
- developermanagers
- developermanagersvisible

**Project Analytics:**
- projectlayers (map overlays)
- project_layers_pro_required (paywall indicator!)
- project_layers_super_pro_required (premium paywall!)
- projectofmonthbanner (featured project promotion)
- projects_with_virtual_tour

**Government Data:**
- govTransactionStats
- govTransactionsShort

**Other:**
- mortgage_interest_rate
- mortgagerate
- exchangeRate (multi-currency)
- investmentvariants
- investmentopportunity
- propertyvaluation (AVM output)
- propertyestimationformhasonboarding

### TOTAL UNIQUE KPIs: ~90+ per property

---

## 4. THIRD-PARTY SERVICE INTEGRATIONS

| Service | Purpose | Cost Indicator |
|---------|---------|---------------|
| **Sentry** | Error tracking + distributed tracing | Paid tier (production) |
| **Ahoy** (Ruby gem) | Session analytics + visitor tracking | Free (self-hosted) |
| **Tolgee** (app.tolgee.io) | Translation management (11 languages) | Paid ($$$) |
| **Yandex Metrika** | Russian analytics (confirms RU origin) | Free |
| **Google Tag Manager** | Marketing analytics | Free |
| **Iconify** | Icon CDN | Free |
| **Intercom** | Customer chat/support | Paid ($$$) |
| **HubSpot** | CRM/marketing automation | Paid ($$$) |
| **Facebook/Meta** | Pixel tracking | Free |
| **WhatsApp** (wa.me/) | Direct messaging integration | Free |
| **Telegram** (@Jucica_Brown) | AI consultant bot | Custom built |
| **Apple App Store** | iOS app distribution | $99/yr |

**Key: Intercom + HubSpot = serious B2B/B2C customer pipeline.** They're paying for enterprise-grade CRM and support.

---

## 5. PAYWALL/TIER STRUCTURE (Discovered in JS)

Found in the bundle:
- `project_layers_pro_required` — certain map layers locked behind Pro tier
- `project_layers_super_pro_required` — additional layers behind Super Pro tier
- `unitpriceforecastvisible` — price forecasts can be hidden/shown based on tier
- `forecastvisible` — forecast visibility toggle
- `roivisible` — ROI can be hidden/shown

**This confirms a freemium model:**
- Free: Basic property view, limited KPIs
- Pro: Map layers, forecasts, ROI data
- Super Pro: Premium map layers, full analytics

---

## 6. WEBSOCKET REAL-TIME DATA

The bundle contains WebSocket references (`wsLink`, `wsLinkOptions`, `httpEndpoint`). This means:
- Real-time property updates
- Live transaction notifications
- Dynamic price changes pushed to client

BidDeed.AI equivalent: Supabase Realtime for live auction status updates.

---

## 7. KEY URLS DISCOVERED

| URL | Purpose |
|-----|---------|
| `https://ae.realiste.io/` | UAE-specific subdomain (separate from .ai) |
| `https://realiste.io/` | Original domain (still active) |
| `https://storage.realiste.dev/partner-public-assets/...` | Cloud storage for partner assets |
| `https://app.tolgee.io` | Translation management |
| `https://t.me/Jucica_Brown` | Telegram AI bot |
| `https://www.instagram.com/jucica_brown` | Instagram presence |
| `https://wa.me/` | WhatsApp integration |
| `https://api.iconify.design` | Icon CDN |

**`realiste.dev` domain** — developer/staging environment exists. `storage.realiste.dev` is their asset CDN.

**`realiste.io` domain** — original domain, UAE-specific. They operate on BOTH .ai and .io.

---

## 8. KPI PARITY MATRIX: REALISTE vs BIDDEED.AI

| Category | Realiste KPIs | BidDeed.AI KPIs | Gap |
|----------|--------------|-----------------|-----|
| **Pricing** | 15 (current + 5yr forecast + per-bedroom) | 5 (judgment, market value, ARV, max bid, bid/judgment ratio) | Different focus |
| **Rental/ROI** | 20 (yield, ROI, income per bedroom count) | 0 | BUILD for ZoneWise |
| **Market Activity** | 8 (sold last week, units available, exposition days) | 3 (auction status, sold amount, third-party purchase) | Different markets |
| **Building Attributes** | 15+ (class, ratings, floor plans, handover) | 8 (beds, baths, sqft, year built, property type) | They win on new dev |
| **Forecasting** | 10 (1-5yr forecasts with visibility controls) | 1 (ML third-party probability) | They win on price forecast |
| **Developer Analytics** | 10 (ratings, managers, layers) | 0 | N/A (not relevant for foreclosure) |
| **Government Data** | 2 (transaction stats from registries) | 5+ (clerk of court, lien records, tax certs) | WE WIN on legal data |
| **Lien/Legal** | 0 | 15+ (mortgage, HOA, tax liens, lien priority, judgment analysis) | ABSOLUTE MOAT |
| **Zoning** | 0 | IN DEV (67 FL counties) | ABSOLUTE MOAT |
| **Demographics** | 0 visible | 10+ (Census API integration) | We win |
| **TOTAL** | ~90 | ~130 | BidDeed wins on depth |

---

## 9. ARCHITECTURE COMPARISON FOR BIDDEED.AI

| Component | Realiste | BidDeed.AI Equivalent |
|-----------|---------|----------------------|
| Frontend | Nuxt.js 3 (Vue SSR) | Next.js (React) on Cloudflare |
| API | GraphQL + REST | REST + Supabase PostgREST |
| Real-time | WebSocket (custom) | Supabase Realtime |
| Database | Unknown (proprietary) | Supabase PostgreSQL |
| CDN | Cloudflare | Cloudflare |
| Auth | JWT with audience claims | Supabase Auth + ESF RLS |
| CRM | HubSpot + Intercom | Not implemented (opportunity) |
| Analytics | Ahoy + Yandex + GTM | Not implemented (opportunity) |
| Translation | Tolgee (11 languages) | English only (sufficient for FL) |
| Error tracking | Sentry | Not implemented (add) |
| ML/AI | Custom AVM + forecasting | XGBoost + LLM pipeline |
| Mobile | iOS App Store | Not implemented |
| Bot | Jucica Brown (Telegram) | AgentRemote (Telegram) |

---

## 10. WHAT TO STEAL FOR BIDDEED.AI + ZONEWISE.AI

### Immediate (from this analysis):
1. **Per-bedroom pricing/ROI** — Realiste breaks down every metric by bedroom count (0-4br). Apply this to rental analysis in ZoneWise.
2. **5-year price forecasting** — They forecast 1-5 years per property. BidDeed should forecast ARV trajectory.
3. **Paywall tiers** — `pro_required` and `super_pro_required` flags. Implement in BidDeed freemium model.
4. **Government transaction data** — They pull from DLD. We pull from Clerk of Court. Same pattern, different source.
5. **WebSocket for live data** — Supabase Realtime can do this today for auction status updates.
6. **Sentry error tracking** — Add to production stack.

### Strategic (from white-label model):
7. **HubSpot CRM integration** — For managing title company and lender partnerships.
8. **Ahoy-style session tracking** — Understand how users interact with auction reports.
9. **Multi-domain architecture** — BidDeed.AI (auctions) + ZoneWise.AI (zoning) as separate frontends, shared backend (like realiste.ai vs titleman.ai).
