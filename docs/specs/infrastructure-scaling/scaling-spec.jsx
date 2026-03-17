import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Supabase Config ───────────────────────────────────────
const SUPABASE_URL = "https://mocerqjnksmhcjzxrewo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2VycWpua3NtaGNqenhyZXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzI1MjYsImV4cCI6MjA4MDEwODUyNn0.YOUR_ANON_KEY_HERE"; // Replace with actual anon key for client-side

// Fallback data if Supabase unavailable (matches seeded DB values)
const FALLBACK_WORKLOADS = {
  biddeed: {
    product: "biddeed", display_name: "BidDeed.AI", emoji: "🏠",
    description: "Auction analysis pipeline: Lien priority, valuations, bid calculations, reports",
    properties_per_user_monthly: 30, llm_calls_per_property: 2.5,
    tokens_per_call: 2500, chat_queries_per_user_monthly: 15, tokens_per_chat: 1500,
  },
  zonewise: {
    product: "zonewise", display_name: "ZoneWise.AI", emoji: "🗺️",
    description: "Zoning lookups, parcel queries, NLP chat, bulk spatial analysis",
    properties_per_user_monthly: 0, llm_calls_per_property: 0,
    tokens_per_call: 0, chat_queries_per_user_monthly: 40, tokens_per_chat: 1200,
  },
};

const FALLBACK_TIERS = {
  cache: { name: "Cache Hit", cost: 0, color: "#10B981" },
  flash: { name: "Gemini Flash", cost: 0.15, color: "#3B82F6" },
  deepseek: { name: "DeepSeek V3.2", cost: 0.35, color: "#8B5CF6" },
  sonnet: { name: "Claude Sonnet", cost: 9.0, color: "#F59E0B" },
};

const FALLBACK_ROUTING = {
  biddeed:    { launch: { cache: 0.55, flash: 0.25, deepseek: 0.12, sonnet: 0.08 },
                optimized: { cache: 0.70, flash: 0.18, deepseek: 0.08, sonnet: 0.04 }},
  zonewise:   { launch: { cache: 0.65, flash: 0.22, deepseek: 0.08, sonnet: 0.05 },
                optimized: { cache: 0.80, flash: 0.13, deepseek: 0.05, sonnet: 0.02 }},
};

const FALLBACK_INFRA = {
  supabase:   { 100: 25, 1000: 99, 5000: 299, 10000: 599 },
  compute:    { 100: 50, 1000: 150, 5000: 400, 10000: 800 },
  scraping:   { 100: 30, 1000: 120, 5000: 350, 10000: 700 },
  firecrawl:  { 100: 19, 1000: 49, 5000: 149, 10000: 299 },
  monitoring: { 100: 0, 1000: 50, 5000: 200, 10000: 400 },
};

const FALLBACK_PHASES = [
  { phase_number: 1, phase_name: "Launch", user_range: "0-500", infra_description: "Hetzner (existing) + Supabase Pro + CLIProxyAPI Gateway", llm_description: "Gemini Flash free + DeepSeek V3.2 + Sonnet via Max plan", cost_range: "$100-300/mo", status: "active" },
  { phase_number: 2, phase_name: "Growth", user_range: "500-2,500", infra_description: "Add Redis cache layer, Supabase Team, 2nd Hetzner node", llm_description: "Paid Gemini Flash + DeepSeek + Sonnet API. Semantic cache online.", cost_range: "$500-1,200/mo", status: "planned" },
  { phase_number: 3, phase_name: "Scale", user_range: "2,500-10,000", infra_description: "Kubernetes on Hetzner, Supabase Enterprise, CDN for static assets", llm_description: "Volume discounts. Self-hosted open models for Tier 1. Pre-computation handles 70%+ queries.", cost_range: "$1,500-3,000/mo", status: "planned" },
  { phase_number: 4, phase_name: "Enterprise", user_range: "10,000+", infra_description: "Multi-region, dedicated GPU nodes for self-hosted inference, enterprise DB", llm_description: "Hybrid: self-hosted Nemotron/Llama for T1-T2, API for T3 only. 85%+ cache/pre-compute.", cost_range: "$3,000-8,000/mo", status: "planned" },
];

// ─── Computation Helpers ────────────────────────────────────
function calcTokens(workload, users) {
  const propTokens = workload.properties_per_user_monthly * workload.llm_calls_per_property * workload.tokens_per_call;
  const chatTokens = workload.chat_queries_per_user_monthly * workload.tokens_per_chat;
  return (propTokens + chatTokens) * users;
}

function calcLLMCost(totalTokens, routing, tierCosts) {
  const costs = {};
  let total = 0;
  for (const [tier, pct] of Object.entries(routing)) {
    const tierTokens = totalTokens * pct;
    const cost = (tierTokens / 1_000_000) * (tierCosts[tier]?.cost || 0);
    costs[tier] = cost;
    total += cost;
  }
  return { ...costs, total };
}

function getInfraCost(users, infraData) {
  const bracket = users <= 100 ? 100 : users <= 1000 ? 1000 : users <= 5000 ? 5000 : 10000;
  return Object.values(infraData).reduce((sum, brackets) => sum + (brackets[bracket] || 0), 0);
}

const fmt = (n) => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : n.toFixed(0);
const fmtUSD = (n) => n < 1 ? "$"+n.toFixed(3) : n < 100 ? "$"+n.toFixed(2) : "$"+n.toLocaleString("en-US",{maximumFractionDigits:0});

// ─── UI Components ──────────────────────────────────────────
const Bar = ({ value, max, color, label, amount }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
    <div style={{ width: 100, fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, height: 20, background: "#0F172A", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.max((value / max) * 100, 1)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
    </div>
    <div style={{ width: 70, fontSize: 12, color: "#E2E8F0", textAlign: "right", flexShrink: 0 }}>{amount}</div>
  </div>
);

const MetricCard = ({ label, value, sub, accent = "#F59E0B" }) => (
  <div style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, padding: "14px 16px", borderTop: `3px solid ${accent}` }}>
    <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sub}</div>}
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F59E0B", marginBottom: 16, borderBottom: "1px solid #1E293B", paddingBottom: 8, letterSpacing: 0.5 }}>{title}</h2>
    {children}
  </div>
);

const ArchLayer = ({ name, items, color, num }) => (
  <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: color, color: "#020617", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{num}</div>
      <span style={{ fontWeight: 700, color: "#F8FAFC", fontSize: 14 }}>{name}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 32 }}>
      {items.map((item, i) => (
        <span key={i} style={{ background: `${color}20`, color, fontSize: 11, padding: "3px 8px", borderRadius: 4, border: `1px solid ${color}30` }}>{item}</span>
      ))}
    </div>
  </div>
);

const StatusBadge = ({ connected }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: connected ? "#10B981" : "#F59E0B", background: connected ? "#10B98115" : "#F59E0B15", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#10B981" : "#F59E0B" }} />
    {connected ? "SUPABASE LIVE" : "OFFLINE MODE"}
  </span>
);

// ─── Main Component ─────────────────────────────────────────
const TABS = [
  { id: "cost", label: "💰 Cost Model" },
  { id: "arch", label: "⚡ Architecture" },
  { id: "investor", label: "📊 Investor View" },
];

export default function ScalingSpec() {
  const [tab, setTab] = useState("cost");
  const [users, setUsers] = useState(1000);
  const [optimized, setOptimized] = useState(false);
  const [pricePerUser, setPricePerUser] = useState(49);
  const [dbConnected, setDbConnected] = useState(false);
  const [workloads, setWorkloads] = useState(FALLBACK_WORKLOADS);
  const [routing, setRouting] = useState(FALLBACK_ROUTING);
  const [infraCosts, setInfraCosts] = useState(FALLBACK_INFRA);
  const [phases, setPhases] = useState(FALLBACK_PHASES);
  const [tierCosts, setTierCosts] = useState(FALLBACK_TIERS);
  const [lastSync, setLastSync] = useState(null);

  // Supabase fetch helper
  const sbFetch = useCallback(async (table, query = "") => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch { return null; }
  }, []);

  // Load from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const [wl, rt, ic, ph] = await Promise.all([
          sbFetch("scaling_workloads", "select=*"),
          sbFetch("scaling_routing_tiers", "select=*&order=product,tier_name"),
          sbFetch("scaling_infra_costs", "select=*&order=component,user_bracket"),
          sbFetch("scaling_phases", "select=*&order=phase_number"),
        ]);

        if (wl?.length) {
          const mapped = {};
          wl.forEach(w => { mapped[w.product] = w; });
          setWorkloads(mapped);
        }

        if (rt?.length) {
          const routMap = {};
          const costMap = { ...FALLBACK_TIERS };
          rt.forEach(r => {
            if (!routMap[r.product]) routMap[r.product] = { launch: {}, optimized: {} };
            routMap[r.product].launch[r.tier_name] = parseFloat(r.pct_launch);
            routMap[r.product].optimized[r.tier_name] = parseFloat(r.pct_optimized);
            costMap[r.tier_name] = { ...costMap[r.tier_name], cost: parseFloat(r.cost_per_1m_tokens), name: r.model_name || costMap[r.tier_name]?.name };
          });
          setRouting(routMap);
          setTierCosts(costMap);
        }

        if (ic?.length) {
          const infraMap = {};
          ic.forEach(c => {
            if (!infraMap[c.component]) infraMap[c.component] = {};
            infraMap[c.component][c.user_bracket] = parseFloat(c.monthly_cost);
          });
          setInfraCosts(infraMap);
        }

        if (ph?.length) setPhases(ph);

        if (wl?.length || rt?.length) {
          setDbConnected(true);
          setLastSync(new Date().toLocaleTimeString());
        }
      } catch {
        // Fallbacks already loaded
      }
    })();
  }, [sbFetch]);

  // Save snapshot to Supabase
  const saveSnapshot = useCallback(async () => {
    const bd = workloads.biddeed, zw = workloads.zonewise;
    const bdTokens = calcTokens(bd, users);
    const zwTokens = calcTokens(zw, users);
    const mode = optimized ? "optimized" : "launch";
    const bdCost = calcLLMCost(bdTokens, routing.biddeed[mode], tierCosts);
    const zwCost = calcLLMCost(zwTokens, routing.zonewise[mode], tierCosts);
    const totalLLM = bdCost.total + zwCost.total;
    const infra = getInfraCost(users, infraCosts);
    const cogs = totalLLM + infra;
    const mrr = users * pricePerUser;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/scaling_snapshots`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          user_count: users, price_per_user: pricePerUser, router_mode: mode,
          total_llm_cost: Math.round(totalLLM * 100) / 100,
          total_infra_cost: infra,
          total_cogs: Math.round(cogs * 100) / 100,
          cost_per_user: Math.round((cogs / users) * 10000) / 10000,
          mrr, gross_margin_pct: Math.round(((mrr - cogs) / mrr) * 10000) / 100,
          biddeed_tokens: bdTokens, zonewise_tokens: zwTokens,
          metadata: { saved_from: "scaling-spec-ui", timestamp: new Date().toISOString() }
        })
      });
    } catch { /* silent */ }
  }, [users, pricePerUser, optimized, workloads, routing, infraCosts, tierCosts]);

  // Computed data
  const data = useMemo(() => {
    const mode = optimized ? "optimized" : "launch";
    const results = {};
    for (const [key, wl] of Object.entries(workloads)) {
      const tokens = calcTokens(wl, users);
      const rt = routing[key]?.[mode] || {};
      const llm = calcLLMCost(tokens, rt, tierCosts);
      results[key] = { tokens, llm, routing: rt };
    }
    const totalLLM = (results.biddeed?.llm.total || 0) + (results.zonewise?.llm.total || 0);
    const infra = getInfraCost(users, infraCosts);
    const totalCost = totalLLM + infra;
    const revenue = users * pricePerUser;
    const grossMargin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;
    return { ...results, totalLLM, infra, totalCost, costPerUser: totalCost / users, revenue, grossMargin };
  }, [users, optimized, pricePerUser, workloads, routing, infraCosts, tierCosts]);

  const userStops = [100, 500, 1000, 2500, 5000, 10000];
  const phaseColors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];
  const tierColors = { cache: "#10B981", flash: "#3B82F6", deepseek: "#8B5CF6", sonnet: "#F59E0B" };

  return (
    <div style={{ background: "#020617", color: "#E2E8F0", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", padding: "24px 20px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, borderBottom: "2px solid #1E3A5F", paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#1E3A5F", color: "#F59E0B", fontWeight: 800, fontSize: 13, padding: "4px 10px", borderRadius: 4, letterSpacing: 1 }}>SPEC v1.0</div>
            <span style={{ color: "#64748B", fontSize: 12 }}>March 2026</span>
          </div>
          <StatusBadge connected={dbConnected} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F8FAFC", margin: "8px 0 4px" }}>Infrastructure Scaling Spec</h1>
        <div style={{ color: "#94A3B8", fontSize: 13 }}>
          BidDeed.AI + ZoneWise.AI — Cost Model / Architecture / Investor Economics
          {lastSync && <span style={{ marginLeft: 8, fontSize: 10, color: "#475569" }}>synced {lastSync}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0F172A", borderRadius: 8, padding: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 8px", background: tab === t.id ? "#1E3A5F" : "transparent", color: tab === t.id ? "#F59E0B" : "#64748B", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      {/* User Slider */}
      <div style={{ background: "#0F172A", borderRadius: 8, padding: "16px 20px", marginBottom: 24, border: "1px solid #1E293B" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>ACTIVE USERS</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#F59E0B" }}>{users.toLocaleString()}</span>
        </div>
        <input type="range" min={50} max={10000} step={50} value={users} onChange={(e) => setUsers(+e.target.value)} style={{ width: "100%", accentColor: "#F59E0B", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {userStops.map((s) => (
            <button key={s} onClick={() => setUsers(s)} style={{ background: users === s ? "#F59E0B" : "#1E293B", color: users === s ? "#020617" : "#64748B", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{s >= 1000 ? s / 1000 + "K" : s}</button>
          ))}
        </div>
      </div>

      {/* ═══ COST TAB ═══ */}
      {tab === "cost" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => setOptimized(false)} style={{ padding: "6px 14px", background: !optimized ? "#F59E0B" : "#1E293B", color: !optimized ? "#020617" : "#94A3B8", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Launch Router</button>
            <button onClick={() => setOptimized(true)} style={{ padding: "6px 14px", background: optimized ? "#10B981" : "#1E293B", color: optimized ? "#020617" : "#94A3B8", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Optimized Router (6-mo)</button>
            <div style={{ flex: 1 }} />
            <button onClick={saveSnapshot} style={{ padding: "6px 14px", background: "#1E3A5F", color: "#F59E0B", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📸 Save Snapshot</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            <MetricCard label="Total Monthly" value={fmtUSD(data.totalCost)} sub="all infrastructure" />
            <MetricCard label="Per User" value={fmtUSD(data.costPerUser)} sub="/month" accent="#10B981" />
            <MetricCard label="LLM Cost" value={fmtUSD(data.totalLLM)} sub={`${((data.totalLLM / data.totalCost) * 100).toFixed(0)}% of total`} accent="#8B5CF6" />
            <MetricCard label="Infra Cost" value={fmtUSD(data.infra)} sub="DB + compute + scrape" accent="#3B82F6" />
          </div>

          {Object.entries(workloads).map(([key, wl]) => {
            const d = data[key];
            if (!d) return null;
            const maxCost = Math.max(d.llm.flash || 0, d.llm.deepseek || 0, d.llm.sonnet || 0, 1);
            return (
              <Section key={key} title={`${wl.emoji} ${wl.display_name}`}>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12, marginTop: -8 }}>{wl.description}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <MetricCard label="Monthly Tokens" value={fmt(d.tokens)} sub={`${fmt(d.tokens / users)}/user`} accent={key === "biddeed" ? "#F59E0B" : "#3B82F6"} />
                  <MetricCard label="LLM Cost" value={fmtUSD(d.llm.total)} sub={fmtUSD(d.llm.total / users) + "/user"} accent={key === "biddeed" ? "#F59E0B" : "#3B82F6"} />
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, textTransform: "uppercase" }}>Routing Distribution</div>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                  {Object.entries(d.routing).map(([tier, pct]) => (
                    <div key={tier} style={{ width: `${pct * 100}%`, background: tierColors[tier] || "#666", transition: "width 0.4s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  {Object.entries(d.routing).map(([tier, pct]) => (
                    <span key={tier} style={{ fontSize: 11, color: tierColors[tier] || "#999" }}>● {tierCosts[tier]?.name || tier} {(pct * 100).toFixed(0)}%</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, textTransform: "uppercase" }}>Cost by Tier</div>
                {["flash", "deepseek", "sonnet"].map(t => (
                  <Bar key={t} label={tierCosts[t]?.name || t} value={d.llm[t] || 0} max={maxCost} color={tierColors[t]} amount={fmtUSD(d.llm[t] || 0)} />
                ))}
              </Section>
            );
          })}

          <Section title="🖥️ Infrastructure Breakdown">
            {Object.entries(infraCosts).map(([key, brackets]) => {
              const bracket = users <= 100 ? 100 : users <= 1000 ? 1000 : users <= 5000 ? 5000 : 10000;
              return <Bar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={brackets[bracket] || 0} max={800} color="#1E3A5F" amount={fmtUSD(brackets[bracket] || 0)} />;
            })}
          </Section>
        </>
      )}

      {/* ═══ ARCHITECTURE TAB ═══ */}
      {tab === "arch" && (
        <>
          <Section title="Smart Router V2 — Tiered Inference Architecture">
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 16 }}>Every LLM request flows through the Smart Router which determines the cheapest model that can handle the query at acceptable quality. Cache-first, escalate-on-complexity.</p>
            <ArchLayer num={0} name="Cache Layer — $0" color="#10B981" items={["Redis/Supabase cache", "Pre-computed zoning data", "Static property lookups", "Identical query dedup", "Batch-processed parcel data"]} />
            <ArchLayer num={1} name="FREE Tier — Gemini Flash 2.5" color="#3B82F6" items={["Simple Q&A", "Data formatting", "Report templating", "Basic classifications", "Entity extraction"]} />
            <ArchLayer num={2} name="CHEAP Tier — DeepSeek V3.2 ($0.28/1M)" color="#8B5CF6" items={["Multi-step reasoning", "Lien priority analysis", "Zoning interpretation", "Complex lookups"]} />
            <ArchLayer num={3} name="POWER Tier — Claude Sonnet ($9/1M avg)" color="#F59E0B" items={["Legal document analysis", "Novel edge cases", "Complex NLP chat", "Multi-source synthesis"]} />
          </Section>

          <Section title="Pre-Computation Strategy — Kill LLM Calls Before They Happen">
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { title: "Zoning Data Materialization", desc: "Batch-process ALL 252K parcels through LLM once, store structured results. User queries hit DB, not LLM. Refresh monthly.", saving: "Eliminates 80% of ZoneWise LLM calls", color: "#3B82F6" },
                { title: "Property Profile Cache", desc: "Pre-compute ARV, repair estimates, comps for every active foreclosure. Pipeline runs nightly, users get instant results.", saving: "Eliminates 60% of BidDeed per-property LLM calls", color: "#F59E0B" },
                { title: "Semantic Query Cache", desc: "Embed every query. If cosine similarity > 0.95 to a cached query, serve cached response. Users ask similar questions.", saving: "15-25% additional cache hits at scale", color: "#10B981" },
                { title: "Report Template Engine", desc: "Move from LLM-generated reports to template + data injection. LLM only needed for narrative sections, not structure.", saving: "Cuts report generation tokens by 70%", color: "#8B5CF6" },
              ].map((item, i) => (
                <div key={i} style={{ background: `${item.color}08`, border: `1px solid ${item.color}25`, borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${item.color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#F8FAFC" }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, lineHeight: 1.6 }}>{item.desc}</div>
                  <div style={{ fontSize: 11, color: item.color, marginTop: 6, fontWeight: 700 }}>▸ {item.saving}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Scaling Phases (from Supabase)">
            {phases.map((p, i) => (
              <div key={i} style={{ background: "#0F172A", border: `1px solid ${phaseColors[i]}30`, borderRadius: 8, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 800, color: phaseColors[i], fontSize: 14 }}>Phase {p.phase_number}: {p.phase_name}</span>
                    <span style={{ color: "#64748B", fontSize: 12, marginLeft: 8 }}>{p.user_range} users</span>
                    {p.status === "active" && <span style={{ marginLeft: 8, fontSize: 10, background: "#10B98120", color: "#10B981", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>}
                  </div>
                  <span style={{ background: `${phaseColors[i]}20`, color: phaseColors[i], padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{p.cost_range}</span>
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8, lineHeight: 1.6 }}>
                  <strong style={{ color: "#CBD5E1" }}>Infra:</strong> {p.infra_description}
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, lineHeight: 1.6 }}>
                  <strong style={{ color: "#CBD5E1" }}>LLM:</strong> {p.llm_description}
                </div>
              </div>
            ))}
          </Section>
        </>
      )}

      {/* ═══ INVESTOR TAB ═══ */}
      {tab === "investor" && (
        <>
          <div style={{ background: "#0F172A", borderRadius: 8, padding: "12px 20px", marginBottom: 20, border: "1px solid #1E293B", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>AVG PRICE / USER</span>
            <input type="range" min={19} max={199} step={5} value={pricePerUser} onChange={(e) => setPricePerUser(+e.target.value)} style={{ flex: 1, accentColor: "#F59E0B" }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#F59E0B", minWidth: 60, textAlign: "right" }}>${pricePerUser}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            <MetricCard label="MRR" value={fmtUSD(data.revenue)} sub={`${users.toLocaleString()} × $${pricePerUser}`} accent="#10B981" />
            <MetricCard label="Total COGS" value={fmtUSD(data.totalCost)} sub="LLM + Infra" accent="#EF4444" />
            <MetricCard label="Gross Margin" value={data.grossMargin.toFixed(1) + "%"} sub={data.grossMargin > 80 ? "SaaS-grade ✓" : data.grossMargin > 60 ? "Healthy" : "Needs optimization"} accent={data.grossMargin > 80 ? "#10B981" : data.grossMargin > 60 ? "#F59E0B" : "#EF4444"} />
            <MetricCard label="Cost / User" value={fmtUSD(data.costPerUser)} sub={`LTM: ${fmtUSD(data.costPerUser * 12)}`} accent="#8B5CF6" />
          </div>

          <Section title="📈 Unit Economics at Scale">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #1E3A5F" }}>
                    {["Users", "MRR", "LLM Cost", "Infra", "Total COGS", "Gross Margin", "$/User"].map(h => (
                      <th key={h} style={{ textAlign: "right", padding: "8px 10px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[100, 500, 1000, 2500, 5000, 10000].map((u) => {
                    const mode = optimized ? "optimized" : "launch";
                    const bdT = calcTokens(workloads.biddeed, u);
                    const zwT = calcTokens(workloads.zonewise, u);
                    const llm = calcLLMCost(bdT, routing.biddeed[mode], tierCosts).total + calcLLMCost(zwT, routing.zonewise[mode], tierCosts).total;
                    const inf = getInfraCost(u, infraCosts);
                    const total = llm + inf;
                    const rev = u * pricePerUser;
                    const margin = ((rev - total) / rev) * 100;
                    return (
                      <tr key={u} style={{ borderBottom: "1px solid #1E293B", background: u === users ? "#1E3A5F15" : "transparent" }}>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#F8FAFC" }}>{u.toLocaleString()}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#10B981" }}>{fmtUSD(rev)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#8B5CF6" }}>{fmtUSD(llm)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#3B82F6" }}>{fmtUSD(inf)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#EF4444" }}>{fmtUSD(total)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: margin > 80 ? "#10B981" : margin > 60 ? "#F59E0B" : "#EF4444" }}>{margin.toFixed(1)}%</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#94A3B8" }}>{fmtUSD(total / u)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="🎯 Investor Talking Points">
            {[
              { point: "Near-zero marginal LLM cost at scale", detail: `At ${users.toLocaleString()} users, LLM costs are ${fmtUSD(data.totalLLM)}/mo — ${fmtUSD(data.totalLLM / users)}/user. Pre-computation and semantic caching reduce token consumption 70-85% vs naive architecture.` },
              { point: "SaaS-grade margins on an AI-native product", detail: `${data.grossMargin.toFixed(0)}% gross margin at $${pricePerUser}/user. Infrastructure costs dominated by database and compute, not LLM — margins IMPROVE with scale.` },
              { point: "No GPU lock-in required", detail: "Smart Router architecture = model-agnostic. As models get cheaper, margins improve automatically. No GPU capex until 10K+ users." },
              { point: "Domain data is the moat, not the AI layer", detail: "252K parcels with structured zoning data, foreclosure lien chains, and municipal GIS integrations. 10+ years of domain expertise." },
              { point: "LangChain + NVIDIA validation", detail: "Architecture pattern (multi-agent, stateful graphs, tiered inference) is now enterprise standard backed by NVIDIA. Built independently for vertical use." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#0F172A", borderRadius: 8, padding: "12px 16px", marginBottom: 8, borderLeft: "3px solid #F59E0B" }}>
                <div style={{ fontWeight: 700, color: "#F59E0B", fontSize: 13 }}>{item.point}</div>
                <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>{item.detail}</div>
              </div>
            ))}
          </Section>
        </>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1E293B", paddingTop: 12, marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
        <span>Everest Capital USA — Confidential</span>
        <span>Source: Supabase scaling_* tables | GitHub: biddeed-ai/docs/specs/</span>
      </div>
    </div>
  );
}
