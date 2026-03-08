// lib/posthog/config.ts
// BidDeed.AI PostHog Integration
// Tracks user behavior for buy box computation

import posthog from "posthog-js";

// PostHog project config — replace with actual values after setup
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function initPostHog() {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
    persistence: "memory", // No localStorage per Claude.ai restrictions
  });
}

// ============================================================================
// BEHAVIORAL EVENT TRACKING
// These events feed into the buy box computation via PostHog webhook → Supabase
// ============================================================================

export const BiddeedEvents = {
  // Search & Browse
  AUCTION_SEARCH: "auction_search",
  PROPERTY_VIEW: "property_view",
  PROPERTY_CLICK: "property_click",
  COUNTY_FILTER: "county_filter",
  ZIP_FILTER: "zip_filter",
  PRICE_FILTER: "price_filter",

  // Analysis Actions
  EQUITY_ANALYSIS: "equity_analysis",
  LIEN_SEARCH: "lien_search",
  COMP_ANALYSIS: "comp_analysis",
  HISTORICAL_QUERY: "historical_query",

  // High-Value Actions
  REPORT_GENERATED: "report_generated",
  WATCHLIST_ADDED: "watchlist_added",
  WATCHLIST_REMOVED: "watchlist_removed",
  BID_DECISION: "bid_decision",

  // Chatbot Interactions
  CHAT_QUERY: "chat_query",
  AGENT_INVOKED: "agent_invoked",

  // Teaser Interactions
  TEASER_OPENED: "teaser_opened",
  TEASER_IGNORED: "teaser_ignored",
  TEASER_CONVERTED: "teaser_converted",

  // Engagement
  SESSION_START: "session_start",
  SESSION_END: "session_end",
  PROPERTY_DWELL: "property_dwell",
  PAGE_SCROLL_DEPTH: "page_scroll_depth",
} as const;

// ============================================================================
// TRACKING FUNCTIONS
// Call these from UI components to log behavioral signals
// ============================================================================

export function trackSearch(params: {
  counties?: string[];
  zipCodes?: string[];
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  query?: string;
}) {
  posthog.capture(BiddeedEvents.AUCTION_SEARCH, {
    county: params.counties?.[0],
    zip: params.zipCodes?.[0],
    price_min: params.priceMin,
    price_max: params.priceMax,
    property_type: params.propertyType,
    search_query: params.query,
    filter_count: Object.values(params).filter(Boolean).length,
  });
}

export function trackPropertyView(property: {
  id: string;
  county: string;
  zip?: string;
  judgmentAmount?: number;
  marketValue?: number;
  propertyType?: string;
  equitySpread?: number;
}) {
  posthog.capture(BiddeedEvents.PROPERTY_VIEW, {
    property_id: property.id,
    county: property.county,
    zip: property.zip,
    judgment_amount: property.judgmentAmount,
    market_value: property.marketValue,
    property_type: property.propertyType,
    equity_spread: property.equitySpread,
  });
}

export function trackPropertyDwell(propertyId: string, dwellMs: number) {
  if (dwellMs < 2000) return; // Ignore sub-2s views
  posthog.capture(BiddeedEvents.PROPERTY_DWELL, {
    property_id: propertyId,
    dwell_ms: dwellMs,
    dwell_seconds: Math.round(dwellMs / 1000),
  });
}

export function trackAgentUse(agentName: string, query: string, county?: string) {
  posthog.capture(BiddeedEvents.AGENT_INVOKED, {
    agent: agentName,
    query_length: query.length,
    county,
    strategy: inferStrategy(query),
  });
}

export function trackReportGenerated(propertyId: string, county: string) {
  posthog.capture(BiddeedEvents.REPORT_GENERATED, {
    property_id: propertyId,
    county,
  });
}

export function trackWatchlistAdd(propertyId: string, county: string, criteria?: string) {
  posthog.capture(BiddeedEvents.WATCHLIST_ADDED, {
    property_id: propertyId,
    county,
    criteria,
  });
}

export function trackTeaserOpened(teaserId: string, tier: number, source: string) {
  posthog.capture(BiddeedEvents.TEASER_OPENED, {
    teaser_id: teaserId,
    tier,
    source, // push, email, sms, in_app
  });
}

export function trackBidDecision(
  propertyId: string,
  decision: "bid" | "skip" | "review",
  county: string,
  equitySpread?: number
) {
  posthog.capture(BiddeedEvents.BID_DECISION, {
    property_id: propertyId,
    decision,
    county,
    equity_spread: equitySpread,
    strategy: decision === "bid" ? "aggressive" : decision === "skip" ? "conservative" : "moderate",
  });
}

// Helper: infer strategy from chatbot query
function inferStrategy(query: string): string | undefined {
  const q = query.toLowerCase();
  if (q.includes("flip") || q.includes("arv") || q.includes("repair")) return "flip";
  if (q.includes("rental") || q.includes("rent") || q.includes("cash flow")) return "rental";
  if (q.includes("hoa") || q.includes("association")) return "HOA_foreclosure";
  if (q.includes("tax deed") || q.includes("tax cert")) return "tax_deed";
  if (q.includes("wholesale")) return "wholesale";
  return undefined;
}

export default posthog;
