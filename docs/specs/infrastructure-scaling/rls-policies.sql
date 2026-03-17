-- RLS Policies for Infrastructure Scaling Spec
-- Deployed: 2026-03-17
-- Purpose: Public-safe access for Cloudflare Pages deployment
--
-- Anon (public) access:
--   SELECT: All 5 tables (read-only config + snapshots)
--   INSERT: scaling_snapshots only (Save Snapshot button)
--   UPDATE: DENIED on all tables
--   DELETE: DENIED on all tables
--
-- Service Role (server-side) access:
--   Full CRUD on all tables (bypasses RLS)

-- Enable RLS
ALTER TABLE scaling_workloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_routing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_infra_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_snapshots ENABLE ROW LEVEL SECURITY;

-- Read-only policies for config tables
CREATE POLICY "anon_read_workloads" ON scaling_workloads
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_routing" ON scaling_routing_tiers
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_infra" ON scaling_infra_costs
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_phases" ON scaling_phases
  FOR SELECT TO anon USING (true);

-- Snapshots: read + insert (no update/delete)
CREATE POLICY "anon_read_snapshots" ON scaling_snapshots
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_snapshots" ON scaling_snapshots
  FOR INSERT TO anon WITH CHECK (true);
