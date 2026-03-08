// supabase/functions/compute-buy-boxes/index.ts
// BidDeed.AI Behavioral Intelligence — Buy Box Computation Engine
// Runs nightly at 2 AM EST via pg_cron
// Analyzes user_events to build/update user_buy_boxes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface BuyBox {
  counties: { name: string; weight: number }[];
  zip_affinities: { zip: string; weight: number }[];
  judgment_range: { min: number | null; max: number | null };
  market_value_range: { min: number | null; max: number | null };
  min_equity_spread: number | null;
  max_repair_estimate: number | null;
  property_types: string[];
  risk_profile: string;
  strategy_tags: string[];
  archetype: string;
  peak_activity_window: string | null;
  avg_session_frequency: string;
  confidence_score: number;
  data_points_count: number;
}

// Classify user archetype based on behavioral patterns
function classifyArchetype(events: any[]): string {
  const totalEvents = events.length;
  const uniqueDays = new Set(events.map((e: any) => e.created_at?.slice(0, 10))).size;
  const avgEventsPerDay = totalEvents / Math.max(uniqueDays, 1);
  const deepActions = events.filter((e: any) =>
    ["analyze", "report", "lien_search"].includes(e.event_type)
  ).length;
  const deepRatio = deepActions / Math.max(totalEvents, 1);

  if (uniqueDays >= 20 && avgEventsPerDay > 10) return "scanner";
  if (deepRatio > 0.4 && avgEventsPerDay > 5) return "researcher";
  if (uniqueDays <= 8 && deepRatio > 0.3) return "sniper";
  if (uniqueDays <= 4) return "opportunist";
  return "scanner";
}

// Compute peak activity window from event timestamps
function computePeakWindow(events: any[]): string | null {
  if (events.length < 10) return null;
  const hours: Record<number, number> = {};
  for (const e of events) {
    const h = new Date(e.created_at).getHours();
    hours[h] = (hours[h] || 0) + 1;
  }
  const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  if (!peakHour) return null;
  const h = parseInt(peakHour[0]);
  return `${String(h).padStart(2, "0")}:00-${String(h + 2).padStart(2, "0")}:00`;
}

// Compute session frequency
function computeFrequency(events: any[]): string {
  const days = new Set(events.map((e: any) => e.created_at?.slice(0, 10)));
  const uniqueDays = days.size;
  const span = events.length > 1
    ? (new Date(events[0].created_at).getTime() - new Date(events[events.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 1;
  const ratio = uniqueDays / Math.max(span, 1);
  if (ratio > 0.7) return "daily";
  if (ratio > 0.3) return "weekly";
  if (ratio > 0.1) return "biweekly";
  return "irregular";
}

// Extract weighted preferences from events
function extractWeightedPrefs(events: any[], field: string): { name: string; weight: number }[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const e of events) {
    const val = e.metadata?.[field];
    if (val) {
      counts[val] = (counts[val] || 0) + 1;
      total++;
    }
  }
  if (total === 0) return [];
  return Object.entries(counts)
    .map(([name, count]) => ({ name, weight: Math.round((count / total) * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    console.log("[compute-buy-boxes] Starting nightly computation...");

    // Get all users with events in the last 90 days
    const { data: activeUsers, error: userError } = await supabase
      .from("user_events")
      .select("user_id")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("user_id");

    if (userError) throw userError;

    const uniqueUserIds = [...new Set(activeUsers?.map((u: any) => u.user_id) || [])];
    console.log(`[compute-buy-boxes] Processing ${uniqueUserIds.length} active users`);

    let processed = 0;
    let errors = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Fetch all events for this user (last 90 days)
        const { data: events, error: evError } = await supabase
          .from("user_events")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(5000);

        if (evError || !events || events.length < 3) continue;

        // Build buy box from behavioral signals
        const buyBox: any = {
          user_id: userId,
          counties: extractWeightedPrefs(events, "county"),
          zip_affinities: extractWeightedPrefs(events, "zip"),
          property_types: [...new Set(events
            .map((e: any) => e.metadata?.property_type)
            .filter(Boolean)
          )],
          strategy_tags: [...new Set(events
            .map((e: any) => e.metadata?.strategy)
            .filter(Boolean)
          )],
          archetype: classifyArchetype(events),
          peak_activity_window: computePeakWindow(events),
          avg_session_frequency: computeFrequency(events),
          confidence_score: Math.min(events.length / 200, 1.0),
          data_points_count: events.length,
          last_activity: events[0]?.created_at,
          last_computed: new Date().toISOString(),
        };

        // Extract financial ranges from search/click events
        const financialEvents = events.filter((e: any) =>
          e.metadata?.judgment_amount || e.metadata?.market_value
        );
        if (financialEvents.length > 0) {
          const judgments = financialEvents
            .map((e: any) => e.metadata?.judgment_amount)
            .filter(Boolean)
            .map(Number);
          const marketVals = financialEvents
            .map((e: any) => e.metadata?.market_value)
            .filter(Boolean)
            .map(Number);

          if (judgments.length > 2) {
            buyBox.judgment_range = {
              min: Math.min(...judgments) * 0.8,
              max: Math.max(...judgments) * 1.2,
            };
          }
          if (marketVals.length > 2) {
            buyBox.market_value_range = {
              min: Math.min(...marketVals) * 0.8,
              max: Math.max(...marketVals) * 1.2,
            };
          }
        }

        // Determine risk profile from behavior
        const skipRate = events.filter((e: any) => e.event_type === "skip").length / events.length;
        const deepDiveRate = events.filter((e: any) =>
          ["lien_search", "report"].includes(e.event_type)
        ).length / events.length;

        if (skipRate > 0.7 || deepDiveRate > 0.3) {
          buyBox.risk_profile = "conservative";
        } else if (skipRate < 0.3) {
          buyBox.risk_profile = "aggressive";
        } else {
          buyBox.risk_profile = "moderate";
        }

        // Upsert buy box
        const { error: upsertError } = await supabase
          .from("user_buy_boxes")
          .upsert(buyBox, { onConflict: "user_id" });

        if (upsertError) {
          console.error(`[compute-buy-boxes] Error for user ${userId}:`, upsertError);
          errors++;
        } else {
          processed++;
        }
      } catch (e) {
        console.error(`[compute-buy-boxes] User ${userId} failed:`, e);
        errors++;
      }
    }

    const result = {
      status: "completed",
      users_processed: processed,
      errors,
      timestamp: new Date().toISOString(),
    };

    console.log("[compute-buy-boxes] Complete:", result);

    // Log to insights table
    await supabase.from("insights").insert({
      type: "behavioral_engine",
      action: "compute_buy_boxes",
      details: result,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[compute-buy-boxes] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
