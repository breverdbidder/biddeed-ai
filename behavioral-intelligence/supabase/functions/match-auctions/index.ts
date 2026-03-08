// supabase/functions/match-auctions/index.ts
// BidDeed.AI Behavioral Intelligence — Auction Matching Engine
// Runs at 6 AM EST via pg_cron
// Matches user_buy_boxes against new/upcoming auctions in multi_county_auctions
// Produces scored teasers in user_teasers table

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface MatchResult {
  user_id: string;
  property_id: string;
  county: string;
  auction_date: string;
  match_score: number;
  match_reasons: string[];
  tier: number;
  teaser_text: string;
}

function scoreTier(score: number): number {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 60) return 1;
  return 0; // Below threshold, don't send
}

function generateTeaser(match: MatchResult, auction: any): string {
  const daysUntil = Math.ceil(
    (new Date(auction.auction_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const equitySpread = auction.market_value && auction.judgment_amount
    ? Math.round((1 - auction.judgment_amount / auction.market_value) * 100)
    : null;

  // Curiosity gap format: reveal enough to excite, withhold enough to pull
  if (match.tier === 3) {
    return `🎯 Perfect match in ${auction.county} — ${equitySpread ? equitySpread + '%+ equity spread, ' : ''}${daysUntil} days until auction. Details inside →`;
  } else if (match.tier === 2) {
    return `Strong match in ${auction.county}: ${equitySpread ? equitySpread + '% equity' : 'below-market opportunity'}, auction in ${daysUntil} days. Open to analyze →`;
  } else {
    return `New ${auction.county} listing matches your criteria. ${daysUntil} days until auction.`;
  }
}

Deno.serve(async (req) => {
  try {
    console.log("[match-auctions] Starting auction matching...");

    // Get all buy boxes with sufficient confidence
    const { data: buyBoxes, error: bbError } = await supabase
      .from("user_buy_boxes")
      .select("*")
      .gte("confidence_score", 0.15)
      .gte("last_activity", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (bbError) throw bbError;
    if (!buyBoxes?.length) {
      return new Response(JSON.stringify({ status: "no_active_buy_boxes" }));
    }

    console.log(`[match-auctions] Matching against ${buyBoxes.length} active buy boxes`);

    // Get upcoming auctions (next 30 days) that were scraped recently
    const { data: auctions, error: auctionError } = await supabase
      .from("multi_county_auctions")
      .select("*")
      .gte("auction_date", new Date().toISOString().slice(0, 10))
      .lte("auction_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .not("status", "eq", "cancelled")
      .limit(2000);

    if (auctionError) throw auctionError;
    if (!auctions?.length) {
      return new Response(JSON.stringify({ status: "no_upcoming_auctions" }));
    }

    console.log(`[match-auctions] ${auctions.length} upcoming auctions to match`);

    const matches: MatchResult[] = [];

    for (const buyBox of buyBoxes) {
      // Get user preferences for teaser limits
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", buyBox.user_id)
        .single();

      const maxTeasers = prefs?.max_teasers_per_day || 5;
      let userMatches: MatchResult[] = [];

      for (const auction of auctions) {
        let score = 0;
        const reasons: string[] = [];
        const auctionCounty = (auction.county || "").toLowerCase().replace(/[-\s]/g, "_");

        // County match (0-25 points)
        const countyPrefs = buyBox.counties || [];
        const countyMatch = countyPrefs.find((c: any) =>
          c.name.toLowerCase().replace(/[-\s]/g, "_") === auctionCounty
        );
        if (countyMatch) {
          score += Math.round(25 * countyMatch.weight);
          reasons.push("county_match");
        }

        // Zip match (0-15 points)
        const zipPrefs = buyBox.zip_affinities || [];
        const auctionZip = auction.zip || auction.property_zip;
        if (auctionZip) {
          const zipMatch = zipPrefs.find((z: any) => z.zip === auctionZip);
          if (zipMatch) {
            score += Math.round(15 * zipMatch.weight);
            reasons.push("zip_match");
          }
        }

        // Judgment range match (0-20 points)
        const jRange = buyBox.judgment_range;
        const jAmount = auction.judgment_amount ? Number(auction.judgment_amount) : null;
        if (jAmount && jRange?.min && jRange?.max) {
          if (jAmount >= jRange.min && jAmount <= jRange.max) {
            score += 20;
            reasons.push("judgment_in_range");
          } else if (jAmount >= jRange.min * 0.8 && jAmount <= jRange.max * 1.2) {
            score += 10;
            reasons.push("judgment_near_range");
          }
        }

        // Equity spread (0-25 points)
        const mValue = auction.market_value ? Number(auction.market_value) : null;
        if (jAmount && mValue && mValue > 0) {
          const spread = (mValue - jAmount) / mValue;
          const minSpread = buyBox.min_equity_spread || 0.3;
          if (spread >= minSpread) {
            score += Math.min(25, Math.round(spread * 50));
            reasons.push("equity_above_threshold");
          }
        }

        // Property type match (0-10 points)
        const propType = auction.property_type;
        if (propType && buyBox.property_types?.includes(propType)) {
          score += 10;
          reasons.push("property_type_match");
        }

        // Time urgency bonus (0-5 points)
        const daysUntil = Math.ceil(
          (new Date(auction.auction_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7) {
          score += 5;
          reasons.push("auction_soon");
        }

        // Cap at 100
        score = Math.min(score, 100);
        const tier = scoreTier(score);

        if (tier > 0) {
          userMatches.push({
            user_id: buyBox.user_id,
            property_id: auction.id || auction.case_number || `${auction.county}_${auction.auction_date}`,
            county: auction.county,
            auction_date: auction.auction_date,
            match_score: score,
            match_reasons: reasons,
            tier,
            teaser_text: "",
          });
        }
      }

      // Sort by score, take top N
      userMatches.sort((a, b) => b.match_score - a.match_score);
      userMatches = userMatches.slice(0, maxTeasers);

      // Generate teaser text for selected matches
      for (const match of userMatches) {
        const auction = auctions.find((a: any) =>
          (a.id || a.case_number) === match.property_id
        );
        if (auction) {
          match.teaser_text = generateTeaser(match, auction);
        }
      }

      matches.push(...userMatches);
    }

    console.log(`[match-auctions] Generated ${matches.length} teasers for ${buyBoxes.length} users`);

    // Batch insert teasers
    if (matches.length > 0) {
      const teaserRows = matches.map((m) => ({
        user_id: m.user_id,
        property_id: m.property_id,
        county: m.county,
        auction_date: m.auction_date,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        tier: m.tier,
        teaser_text: m.teaser_text,
        channels: m.tier === 3 ? ["sms", "push", "email"] :
                  m.tier === 2 ? ["push", "email"] : ["email"],
        delivery_status: "pending",
      }));

      const { error: insertError } = await supabase
        .from("user_teasers")
        .insert(teaserRows);

      if (insertError) {
        console.error("[match-auctions] Insert error:", insertError);
      }
    }

    const result = {
      status: "completed",
      buy_boxes_processed: buyBoxes.length,
      auctions_scanned: auctions.length,
      teasers_generated: matches.length,
      tier_breakdown: {
        tier_1: matches.filter((m) => m.tier === 1).length,
        tier_2: matches.filter((m) => m.tier === 2).length,
        tier_3: matches.filter((m) => m.tier === 3).length,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("[match-auctions] Complete:", result);

    await supabase.from("insights").insert({
      type: "behavioral_engine",
      action: "match_auctions",
      details: result,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[match-auctions] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
