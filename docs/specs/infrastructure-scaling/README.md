# Infrastructure Scaling Spec v1.0

**BidDeed.AI + ZoneWise.AI** — Cost Model / Architecture / Investor Economics

## Overview

Interactive scaling spec that models infrastructure costs from 50 to 10,000+ users across both products. All configuration data lives in Supabase and is editable without code changes.

## Supabase Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `scaling_workloads` | 2 | Per-product LLM workload definitions |
| `scaling_routing_tiers` | 8 | Model routing % per product per tier |
| `scaling_infra_costs` | 20 | Infrastructure costs per user bracket |
| `scaling_phases` | 4 | Architecture scaling milestones |
| `scaling_snapshots` | 4+ | Historical projection snapshots |

## Files

- `scaling-spec.jsx` — Interactive React component (renders in Claude.ai artifacts or any React host)
- `migration.sql` — Supabase table creation SQL
- `README.md` — This file

## Smart Router V2 Tiers

| Tier | Model | Cost/1M tokens | Purpose |
|------|-------|----------------|---------|
| 0 - Cache | Redis/Supabase | $0 | Pre-computed data, dedup |
| 1 - FREE | Gemini Flash 2.5 | $0.15 | Simple Q&A, formatting |
| 2 - CHEAP | DeepSeek V3.2 | $0.35 | Multi-step reasoning |
| 3 - POWER | Claude Sonnet | $9.00 | Legal docs, edge cases |

## Scaling Phases

- **Phase 1 (0-500)**: Existing Hetzner + Supabase Pro — $100-300/mo
- **Phase 2 (500-2.5K)**: Add Redis cache, 2nd node — $500-1,200/mo
- **Phase 3 (2.5K-10K)**: K8s, Enterprise DB — $1,500-3,000/mo
- **Phase 4 (10K+)**: Multi-region, self-hosted models — $3,000-8,000/mo

## Key Insight

Pre-computation is the #1 cost lever. Batch-processing 252K ZoneWise parcels once eliminates 80% of real-time LLM calls. At 10K users, this saves ~$18K/month in avoided token costs.

## Updating Config

Edit directly in Supabase Dashboard or via API:
```sql
-- Example: Update DeepSeek pricing
UPDATE scaling_routing_tiers 
SET cost_per_1m_tokens = 0.28 
WHERE tier_name = 'deepseek';

-- Example: Mark Phase 2 as active
UPDATE scaling_phases 
SET status = 'active' 
WHERE phase_number = 2;
```

The JSX component fetches fresh data on every load.

---
*Everest Capital USA — Confidential*
