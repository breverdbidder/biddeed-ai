---
pattern: "tests/**"
---
# Test Rules (loaded only when editing test files)

- Real data ONLY from Supabase historical_auctions. No synthetic/mocked auction data
- Integration tests hit actual endpoints (staging), not mocks
- Every test must assert on EXACT values, never "truthy" or "exists"
- Test names: test_{what}_{scenario}_{expected} format
- Eval assertions: binary pass/fail (AUTOLOOP L2 compatible)
- Coverage target: 80%+ on agents/, scrapers/, ml/ directories
- Failed test = blocker. Never skip or mark xfail without Supabase insight log
