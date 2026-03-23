---
pattern: "src/scrapers/**"
---
# Scraper Rules (loaded only when editing scraper files)

- Anti-detection MANDATORY: randomized delays (2-7s), rotating User-Agent, session cookies
- NEVER hardcode selectors without fallback patterns — use 3+ regex alternatives
- All scraper output → Supabase, never local files
- Rate limit: max 1 req/3s per domain. Circuit breaker after 3 consecutive failures
- pdfplumber for PDF extraction, selenium ONLY when JS rendering required
- Log every HTTP status to scraper_runs table with timestamp + response_ms
- On 403/429: backoff exponential (5s/15s/60s), then STOP and log blocker
- NEVER fabricate scraped data. If field missing → null, not invented value
