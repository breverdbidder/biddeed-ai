-- Infrastructure Scaling Spec - Supabase Migration
-- Created: 2026-03-17
-- Tables: scaling_workloads, scaling_routing_tiers, scaling_infra_costs, scaling_phases, scaling_snapshots

-- Workload definitions per product
CREATE TABLE IF NOT EXISTS scaling_workloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product text NOT NULL CHECK (product IN ('biddeed', 'zonewise')),
  display_name text NOT NULL,
  emoji text,
  description text,
  properties_per_user_monthly int DEFAULT 0,
  llm_calls_per_property numeric(4,2) DEFAULT 0,
  tokens_per_call int DEFAULT 0,
  chat_queries_per_user_monthly int DEFAULT 0,
  tokens_per_chat int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product)
);

-- Model routing configurations per product per tier
CREATE TABLE IF NOT EXISTS scaling_routing_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product text NOT NULL CHECK (product IN ('biddeed', 'zonewise')),
  tier_name text NOT NULL CHECK (tier_name IN ('cache', 'flash', 'deepseek', 'sonnet')),
  model_name text,
  cost_per_1m_tokens numeric(8,4) DEFAULT 0,
  pct_launch numeric(4,3) NOT NULL,
  pct_optimized numeric(4,3) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product, tier_name)
);

-- Infrastructure costs per user bracket
CREATE TABLE IF NOT EXISTS scaling_infra_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  component text NOT NULL CHECK (component IN ('supabase', 'compute', 'scraping', 'firecrawl', 'monitoring')),
  user_bracket int NOT NULL CHECK (user_bracket IN (100, 1000, 5000, 10000)),
  monthly_cost numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(component, user_bracket)
);

-- Architecture scaling phases
CREATE TABLE IF NOT EXISTS scaling_phases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_number int NOT NULL UNIQUE,
  phase_name text NOT NULL,
  user_range text NOT NULL,
  infra_description text,
  llm_description text,
  cost_range text,
  status text DEFAULT 'planned' CHECK (status IN ('active', 'planned', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Computed projection snapshots for historical tracking
CREATE TABLE IF NOT EXISTS scaling_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date DEFAULT CURRENT_DATE,
  user_count int NOT NULL,
  price_per_user numeric(8,2) NOT NULL,
  router_mode text DEFAULT 'launch' CHECK (router_mode IN ('launch', 'optimized')),
  total_llm_cost numeric(10,2),
  total_infra_cost numeric(10,2),
  total_cogs numeric(10,2),
  cost_per_user numeric(8,4),
  mrr numeric(12,2),
  gross_margin_pct numeric(5,2),
  biddeed_tokens bigint,
  zonewise_tokens bigint,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scaling_snapshots_date ON scaling_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_scaling_snapshots_users ON scaling_snapshots(user_count);
