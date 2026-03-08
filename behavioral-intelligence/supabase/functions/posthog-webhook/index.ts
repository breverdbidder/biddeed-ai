// supabase/functions/posthog-webhook/index.ts
// Receives PostHog events via webhook and syncs to user_events table
// 
// SETUP: 
//   1. Deploy: supabase functions deploy posthog-webhook
//   2. Set secret: supabase secrets set POSTHOG_WEBHOOK_SECRET=<generate-a-random-string>
//   3. PostHog Dashboard → Settings → Webhooks → Add URL:
//      https://mocerqjnksmhcjzxrewo.supabase.co/functions/v1/posthog-webhook
//      Header: x-webhook-secret = <same-random-string>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WEBHOOK_SECRET = Deno.env.get("POSTHOG_WEBHOOK_SECRET") || "";

// Map PostHog event names to our event types
const EVENT_MAP: Record<string, string> = {
  auction_search: "search",
  property_view: "view",
  property_click: "click",
  equity_analysis: "analyze",
  lien_search: "analyze",
  comp_analysis: "analyze",
  historical_query: "analyze",
  report_generated: "report",
  watchlist_added: "watchlist",
  watchlist_removed: "watchlist",
  bid_decision: "bid_decision",
  chat_query: "chat_query",
  agent_invoked: "agent_invoked",
  teaser_opened: "teaser_opened",
  teaser_converted: "teaser_converted",
  property_dwell: "dwell",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
      },
    });
  }

  // Auth check — reject requests without valid webhook secret
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret") || "";
    if (provided !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const body = await req.json();
    const events = Array.isArray(body) ? body : [body];
    let inserted = 0;
    let skipped = 0;

    for (const event of events) {
      const eventName = event.event || event.name;

      // Skip PostHog internal events ($pageview, $identify, etc.)
      if (!eventName || eventName.startsWith("$")) {
        skipped++;
        continue;
      }

      // Skip events we don't track
      if (!EVENT_MAP[eventName]) {
        skipped++;
        continue;
      }

      const userId = event.distinct_id || event.properties?.$user_id;
      if (!userId) {
        skipped++;
        continue;
      }

      const eventType = EVENT_MAP[eventName];
      const props = event.properties || {};

      // Build clean metadata (strip nulls)
      const rawMeta: Record<string, any> = {
        county: props.county,
        zip: props.zip,
        judgment_amount: props.judgment_amount,
        market_value: props.market_value,
        property_type: props.property_type,
        equity_spread: props.equity_spread,
        strategy: props.strategy,
        agent: props.agent,
        dwell_ms: props.dwell_ms,
        decision: props.decision,
        search_query: props.search_query,
        tier: props.tier,
      };
      const metadata = Object.fromEntries(
        Object.entries(rawMeta).filter(([_, v]) => v != null)
      );

      const row = {
        user_id: userId,
        event_type: eventType,
        entity_type: props.property_id
          ? "property"
          : props.county
            ? "county"
            : null,
        entity_id: props.property_id || null,
        metadata,
        session_id: props.$session_id || null,
        source: "web",
        created_at: event.timestamp || new Date().toISOString(),
      };

      const { error } = await supabase.from("user_events").insert(row);
      if (error) {
        console.error("[posthog-webhook] Insert error:", error.message);
      } else {
        inserted++;
      }
    }

    return new Response(JSON.stringify({ status: "ok", inserted, skipped }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[posthog-webhook] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
