---
pattern: "src/ml/**"
---
# ML Rules (loaded only when editing ML model files)

- NEVER-LIE: report EXACT metrics from eval runs. No rounding up, no invented accuracy
- All predictions must include confidence score + data provenance
- XGBoost model changes require before/after eval comparison logged to Supabase
- Feature engineering: document every feature with source table + transformation
- Model outputs branded "BidDeed.AI ML" in reports, never raw model name
- Validation: k-fold on historical_auctions, never train/test on same auction date
- Max bid formula is BUSINESS LOGIC — externalized, never baked into model weights
