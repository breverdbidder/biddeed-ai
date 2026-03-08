// supabase/functions/send-teasers/index.ts
// BidDeed.AI Behavioral Intelligence — Teaser Delivery via Novu
// Runs at 6:05 AM EST via pg_cron (5 min after match-auctions)
// Reads pending teasers from user_teasers, sends via Novu multi-channel

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const NOVU_API_KEY = Deno.env.get("NOVU_API_KEY") || "";
const NOVU_API_URL = "https://api.novu.co/v1";

async function sendNovuNotification(
  subscriberId: string,
  templateId: string,
  payload: Record<string, any>
): Promise<string | null> {
  try {
    const response = await fetch(`${NOVU_API_URL}/events/trigger`, {
      method: "POST",
      headers: {
        Authorization: `ApiKey ${NOVU_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: templateId,
        to: { subscriberId },
        payload,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[send-teasers] Novu error for ${subscriberId}:`, err);
      return null;
    }

    const data = await response.json();
    return data?.data?.transactionId || null;
  } catch (error) {
    console.error(`[send-teasers] Novu request failed:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    console.log("[send-teasers] Starting teaser delivery...");

    // Get all pending teasers from today
    const { data: pendingTeasers, error: fetchError } = await supabase
      .from("user_teasers")
      .select("*, user_preferences!inner(email_enabled, push_enabled, sms_enabled, peak_window_start, peak_window_end, timezone, min_match_score_for_push, min_match_score_for_sms, max_sms_per_week, phone_number, email_override)")
      .eq("delivery_status", "pending")
      .gte("created_at", new Date().toISOString().slice(0, 10))
      .order("match_score", { ascending: false })
      .limit(500);

    if (fetchError) {
      // If join fails (no preferences), get teasers without preferences
      const { data: teasersOnly, error: e2 } = await supabase
        .from("user_teasers")
        .select("*")
        .eq("delivery_status", "pending")
        .gte("created_at", new Date().toISOString().slice(0, 10))
        .order("match_score", { ascending: false })
        .limit(500);

      if (e2) throw e2;
      if (!teasersOnly?.length) {
        return new Response(JSON.stringify({ status: "no_pending_teasers" }));
      }
    }

    const teasers = pendingTeasers || [];
    if (!teasers.length) {
      return new Response(JSON.stringify({ status: "no_pending_teasers" }));
    }

    console.log(`[send-teasers] Processing ${teasers.length} pending teasers`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const teaser of teasers) {
      try {
        // Determine Novu template based on tier
        let templateId: string;
        switch (teaser.tier) {
          case 3:
            templateId = "biddeed-teaser-tier3-urgent";
            break;
          case 2:
            templateId = "biddeed-teaser-tier2-strong";
            break;
          default:
            templateId = "biddeed-teaser-tier1-digest";
        }

        // For Tier 1, skip individual sends (batch into weekly digest)
        if (teaser.tier === 1) {
          await supabase
            .from("user_teasers")
            .update({
              delivery_status: "digest_queued",
              scheduled_for: getNextDigestDate(),
            })
            .eq("id", teaser.id);
          skipped++;
          continue;
        }

        // Build Novu payload
        const payload = {
          teaser_text: teaser.teaser_text,
          match_score: teaser.match_score,
          county: teaser.county,
          auction_date: teaser.auction_date,
          property_id: teaser.property_id,
          tier: teaser.tier,
          cta_url: `https://biddeed.ai/property/${teaser.property_id}`,
        };

        // Send via Novu
        const notificationId = await sendNovuNotification(
          teaser.user_id,
          templateId,
          payload
        );

        if (notificationId) {
          await supabase
            .from("user_teasers")
            .update({
              delivery_status: "sent",
              sent_at: new Date().toISOString(),
              novu_notification_id: notificationId,
            })
            .eq("id", teaser.id);
          sent++;
        } else {
          await supabase
            .from("user_teasers")
            .update({ delivery_status: "failed" })
            .eq("id", teaser.id);
          failed++;
        }
      } catch (e) {
        console.error(`[send-teasers] Teaser ${teaser.id} failed:`, e);
        failed++;
      }
    }

    const result = {
      status: "completed",
      total_processed: teasers.length,
      sent,
      failed,
      digest_queued: skipped,
      timestamp: new Date().toISOString(),
    };

    console.log("[send-teasers] Complete:", result);

    await supabase.from("insights").insert({
      type: "behavioral_engine",
      action: "send_teasers",
      details: result,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-teasers] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Get next Monday for weekly digest
function getNextDigestDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(7, 0, 0, 0); // 7 AM UTC = ~2-3 AM EST
  return nextMonday.toISOString();
}
