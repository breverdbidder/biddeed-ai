# DOCUMENT EXTRACTION AGENT — Claude Code Mission Spec
# BidDeed.AI Dono Parity: 46 Data Points Per Recorded Document
# 
# TARGET: Claude Code 7-hour autonomous session
# REPO: breverdbidder/brevard-bidder-scraper
# TABLES: property_documents, ownership_chains, title_defects, document_extractions
# SUPABASE: mocerqjnksmhcjzxrewo.supabase.co

## OBJECTIVE

Build `src/agents/document_extraction_agent.py` — an autonomous agent that:
1. Takes a case_number or parcel_id from multi_county_auctions
2. Fetches ALL recorded documents from AcclaimWeb (party search)
3. Extracts 46 structured data points per document using Gemini Flash
4. Writes results to `property_documents` table
5. Builds ownership chain → `ownership_chains` table
6. Runs 24 title rules → `title_defects` table
7. Logs extraction metrics → `document_extractions` table

## ARCHITECTURE

```
multi_county_auctions (existing)
    │ case_number, defendant, plaintiff, parcel_id
    ▼
┌─────────────────────────────────────────────────────────────┐
│             DOCUMENT EXTRACTION AGENT                        │
│                                                              │
│  Step 1: FETCH DOCUMENTS                                     │
│  ├── AcclaimWeb party search (defendant name)                │
│  ├── AcclaimWeb party search (plaintiff name)                │
│  ├── BCPAO parcel lookup (if parcel_id available)            │
│  └── Returns: list of document references                    │
│                                                              │
│  Step 2: EXTRACT DATA POINTS                                 │
│  ├── For each document reference:                            │
│  │   ├── Fetch document image/details from AcclaimWeb        │
│  │   ├── Send to Gemini 2.0 Flash (FREE) for extraction      │
│  │   ├── Parse structured JSON response                      │
│  │   ├── Validate against schema (46 fields)                 │
│  │   └── Insert into property_documents                      │
│  └── Log to document_extractions                             │
│                                                              │
│  Step 3: BUILD OWNERSHIP CHAIN                               │
│  ├── Filter property_documents WHERE instrument_type = deed  │
│  ├── Sort by recording_date ASC                              │
│  ├── Link grantor→grantee sequences                          │
│  ├── Detect chain breaks                                     │
│  └── Insert into ownership_chains                            │
│                                                              │
│  Step 4: RUN TITLE RULES                                     │
│  ├── Load rules from title_rules (24 rules)                  │
│  ├── Evaluate each rule against property_documents           │
│  ├── Flag defects with severity + curative action             │
│  └── Insert into title_defects                               │
│                                                              │
│  Step 5: UPDATE AUCTION RECORD                               │
│  └── Update multi_county_auctions with:                      │
│      - documents_extracted: count                            │
│      - title_health: CLEAR/REVIEW/SKIP                       │
│      - ownership_chain_complete: boolean                     │
└─────────────────────────────────────────────────────────────┘
```

## FILE STRUCTURE

```
src/agents/
├── document_extraction_agent.py     # Main orchestrator (THIS FILE)
├── extractors/
│   ├── acclaimweb_fetcher.py        # Fetch doc references from AcclaimWeb
│   ├── gemini_extractor.py          # Gemini 2.0 Flash document extraction
│   └── field_validator.py           # Validate 46 fields against schema
├── analyzers/
│   ├── ownership_chain_builder.py   # Build grantor→grantee chain
│   └── title_rules_engine.py        # Evaluate 24 FL title rules
└── models/
    └── document_models.py           # Pydantic models for all 46 fields
```

## DATA MODELS

```python
# src/agents/models/document_models.py

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum

class InstrumentType(str, Enum):
    DEED = "deed"
    MORTGAGE = "mortgage"
    SATISFACTION = "satisfaction"
    ASSIGNMENT = "assignment"
    LIEN = "lien"
    HOA_LIEN = "hoa_lien"
    TAX_CERT = "tax_cert"
    JUDGMENT = "judgment"
    LIS_PENDENS = "lis_pendens"
    RELEASE = "release"
    MODIFICATION = "modification"
    SUBORDINATION = "subordination"
    POWER_OF_ATTORNEY = "power_of_attorney"
    AFFIDAVIT = "affidavit"
    COURT_ORDER = "court_order"

class EntityType(str, Enum):
    INDIVIDUAL = "individual"
    CORPORATION = "corporation"
    LLC = "llc"
    TRUST = "trust"
    ESTATE = "estate"
    GOVERNMENT = "government"
    BANK = "bank"
    HOA = "hoa"

class LienStatus(str, Enum):
    ACTIVE = "active"
    SATISFIED = "satisfied"
    RELEASED = "released"
    PARTIAL = "partial"
    ASSIGNED = "assigned"

class VestingType(str, Enum):
    FEE_SIMPLE = "fee_simple"
    LIFE_ESTATE = "life_estate"
    JOINT_TENANCY = "joint_tenancy"
    TENANTS_IN_COMMON = "tenants_in_common"
    TENANCY_BY_ENTIRETY = "tenancy_by_entirety"

class DeedType(str, Enum):
    WARRANTY = "warranty"
    QUITCLAIM = "quitclaim"
    SPECIAL_WARRANTY = "special_warranty"
    TRUSTEES_DEED = "trustees_deed"
    TAX_DEED = "tax_deed"
    SHERIFFS_DEED = "sheriffs_deed"
    PERSONAL_REP = "personal_rep"
    DEED_IN_LIEU = "deed_in_lieu"

class ExtractedDocument(BaseModel):
    """46 data points per recorded document — Dono parity model"""
    
    # Party Information (6)
    grantor_name: Optional[str] = None
    grantee_name: Optional[str] = None
    grantor_entity_type: Optional[EntityType] = None
    grantee_entity_type: Optional[EntityType] = None
    witness_names: Optional[List[str]] = None
    notary_info: Optional[str] = None
    
    # Document Identification (6)
    instrument_type: InstrumentType
    instrument_number: Optional[str] = None
    recording_date: Optional[date] = None
    execution_date: Optional[date] = None
    book_page: Optional[str] = None
    recording_county: Optional[str] = None
    
    # Property Information (6)
    legal_description: Optional[str] = None
    property_address: Optional[str] = None
    subdivision_name: Optional[str] = None
    lot_number: Optional[str] = None
    block_number: Optional[str] = None
    property_type: Optional[str] = None
    
    # Financial Terms (6)
    consideration_amount: Optional[float] = None
    mortgage_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    maturity_date: Optional[date] = None
    loan_type: Optional[str] = None
    doc_stamps: Optional[float] = None
    
    # Lien Status (5)
    lien_status: Optional[LienStatus] = LienStatus.ACTIVE
    satisfaction_date: Optional[date] = None
    satisfaction_instrument: Optional[str] = None
    lien_priority: Optional[int] = None
    related_documents: Optional[List[str]] = None
    
    # Title Chain (5)
    vesting_type: Optional[VestingType] = None
    deed_type: Optional[DeedType] = None
    conveyance_conditions: Optional[str] = None
    easement_references: Optional[List[str]] = None
    exception_language: Optional[str] = None
    
    # Court/Judgment (6)
    court_case_number: Optional[str] = None
    court_jurisdiction: Optional[str] = None
    court_plaintiff: Optional[str] = None
    court_defendant: Optional[str] = None
    judgment_amount: Optional[float] = None
    lis_pendens_status: Optional[str] = None
    
    # Extraction metadata
    extraction_confidence: float = 1.0
    needs_human_review: bool = False
```

## GEMINI EXTRACTION PROMPT

```python
# src/agents/extractors/gemini_extractor.py

EXTRACTION_SYSTEM_PROMPT = """You are a Florida title document extraction AI. 
Extract EXACTLY these data points from the recorded document. 
Return ONLY valid JSON. No markdown, no explanation.

DOCUMENT TYPES (instrument_type):
deed, mortgage, satisfaction, assignment, lien, hoa_lien, tax_cert, 
judgment, lis_pendens, release, modification, subordination, 
power_of_attorney, affidavit, court_order

ENTITY TYPES:
individual, corporation, llc, trust, estate, government, bank, hoa

LIEN STATUS:
active, satisfied, released, partial, assigned

Output JSON schema:
{
  "grantor_name": "string or null",
  "grantee_name": "string or null", 
  "grantor_entity_type": "string or null",
  "grantee_entity_type": "string or null",
  "witness_names": ["string"] or null,
  "notary_info": "string or null",
  "instrument_type": "REQUIRED string",
  "instrument_number": "string or null",
  "recording_date": "YYYY-MM-DD or null",
  "execution_date": "YYYY-MM-DD or null",
  "book_page": "string (e.g., '1234/567') or null",
  "recording_county": "string or null",
  "legal_description": "string or null",
  "property_address": "string or null",
  "subdivision_name": "string or null",
  "lot_number": "string or null",
  "block_number": "string or null",
  "property_type": "SFH/condo/townhouse/land/commercial or null",
  "consideration_amount": number or null,
  "mortgage_amount": number or null,
  "interest_rate": number (e.g., 6.5) or null,
  "maturity_date": "YYYY-MM-DD or null",
  "loan_type": "conventional/fha/va/usda/heloc/commercial or null",
  "doc_stamps": number or null,
  "lien_status": "active/satisfied/released/partial/assigned",
  "satisfaction_date": "YYYY-MM-DD or null",
  "satisfaction_instrument": "string or null",
  "lien_priority": integer or null,
  "related_documents": ["instrument_number"] or null,
  "vesting_type": "fee_simple/life_estate/joint_tenancy/tenants_in_common/tenancy_by_entirety or null",
  "deed_type": "warranty/quitclaim/special_warranty/trustees_deed/tax_deed/sheriffs_deed/personal_rep/deed_in_lieu or null",
  "conveyance_conditions": "string or null",
  "easement_references": ["string"] or null,
  "exception_language": "string or null",
  "court_case_number": "string or null",
  "court_jurisdiction": "string or null",
  "court_plaintiff": "string or null",
  "court_defendant": "string or null",
  "judgment_amount": number or null,
  "lis_pendens_status": "active/dismissed/resolved or null",
  "extraction_confidence": number between 0.0 and 1.0,
  "needs_human_review": boolean
}

RULES:
- Extract ONLY what is explicitly stated in the document
- Do NOT infer or guess values
- If a field is not present in the document, set it to null
- Set needs_human_review=true if document is unclear or partially illegible
- Set extraction_confidence based on document quality (1.0=clear, 0.5=partial, 0.2=mostly illegible)
- For Florida documents, recording_county is typically "Brevard" unless stated otherwise
- Parse dollar amounts as numbers WITHOUT $ signs or commas
- Parse dates as YYYY-MM-DD format
- For book/page, use format "BOOK/PAGE" e.g., "6789/1234"
"""

EXTRACTION_USER_PROMPT = """Extract all 46 data points from this AcclaimWeb document record:

Document Type: {doc_type}
Recording Date: {recording_date}
Book/Page: {book_page}
Grantor: {grantor}
Grantee: {grantee}
Consideration: {consideration}
Legal Description: {legal_desc}

{additional_text}

Return ONLY the JSON object. No markdown fences, no explanation."""
```

## ACCLAIMWEB FETCHER

The existing `acclaimweb_scraper.py` (679 lines) uses Browserless.io for party searches.
Extend it — don't rewrite. Add a method that returns raw document details for extraction.

```python
# Extend src/scrapers/acclaimweb_scraper.py with:

async def fetch_document_details(self, party_name: str, role: str = "GRANTOR") -> List[Dict]:
    """
    Fetch ALL document records for a party from AcclaimWeb.
    Returns raw document data suitable for Gemini extraction.
    
    Each result contains:
    - document_number, document_type, recording_date, book_page
    - grantor, grantee, consideration, legal_description
    """
    # Use existing Browserless party search
    # Parse ALL rows from results table (not just mortgages)
    # Return complete document list including:
    #   DEE (deeds), MTG (mortgages), SMTG (satisfactions),
    #   AMTG (assignments), LIEN, LP (lis pendens), etc.
    pass
```

## TITLE RULES ENGINE

```python
# src/agents/analyzers/title_rules_engine.py

class TitleRulesEngine:
    """Evaluates 24 FL foreclosure title rules against extracted documents."""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.rules = self._load_rules()
    
    def _load_rules(self) -> List[Dict]:
        """Load enabled rules from title_rules table."""
        result = self.supabase.table("title_rules").select("*").eq("enabled", True).execute()
        return result.data
    
    def evaluate(self, parcel_id: str, documents: List[ExtractedDocument], 
                 chain: List[Dict]) -> List[Dict]:
        """
        Run all rules against documents and chain.
        Returns list of title_defects to insert.
        """
        defects = []
        
        for rule in self.rules:
            result = self._evaluate_rule(rule, documents, chain)
            if result:
                defects.append({
                    "parcel_id": parcel_id,
                    "county": documents[0].recording_county if documents else "unknown",
                    "rule_id": rule["rule_id"],
                    "rule_category": rule["category"],
                    "rule_name": rule["name"],
                    "severity": rule["severity"],
                    "defect_description": result["description"],
                    "affected_parties": result.get("parties", []),
                    "curative_action": rule.get("curative_action"),
                    "bid_impact": self._determine_bid_impact(rule["severity"]),
                    "bid_discount_pct": self._calculate_discount(rule),
                })
        
        return defects
    
    def _evaluate_rule(self, rule: Dict, docs: List, chain: List) -> Optional[Dict]:
        """Evaluate a single rule. Returns defect details or None."""
        
        category = rule["rule_id"]
        
        # CHAIN rules
        if category == "CHAIN_001":
            # Break in chain of title
            for i, link in enumerate(chain):
                if not link.get("chain_complete", True):
                    return {"description": f"Chain break at position {link['chain_position']}: "
                            f"{link.get('gap_description', 'unknown gap')}",
                            "parties": [link.get("from_party"), link.get("to_party")]}
        
        elif category == "HOA_001":
            # HOA foreclosure with surviving senior mortgage
            lis_pendens = [d for d in docs if d.instrument_type == "lis_pendens"]
            mortgages = [d for d in docs if d.instrument_type == "mortgage" 
                        and d.lien_status == "active"]
            for lp in lis_pendens:
                if lp.court_plaintiff and any(kw in lp.court_plaintiff.lower() 
                    for kw in ["hoa", "association", "homeowner", "condominium"]):
                    if mortgages:
                        total_mortgage = sum(m.mortgage_amount or 0 for m in mortgages)
                        return {"description": f"HOA foreclosure — {len(mortgages)} active "
                                f"mortgage(s) totaling ${total_mortgage:,.0f} survive the sale",
                                "parties": [lp.court_plaintiff, mortgages[0].grantee_name]}
        
        elif category == "TAX_002":
            # Outstanding tax certificates
            tax_certs = [d for d in docs if d.instrument_type == "tax_cert" 
                        and d.lien_status == "active"]
            if tax_certs:
                return {"description": f"{len(tax_certs)} outstanding tax certificate(s) "
                        f"held by third party",
                        "parties": [tc.grantee_name for tc in tax_certs]}
        
        elif category == "JUDG_002":
            # Federal tax lien
            fed_liens = [d for d in docs if "federal" in (d.grantee_name or "").lower()
                        or "irs" in (d.grantee_name or "").lower()
                        or "internal revenue" in (d.grantee_name or "").lower()]
            if fed_liens:
                return {"description": "Federal tax lien — IRS has 120-day redemption right",
                        "parties": [fl.grantor_name for fl in fed_liens]}
        
        # ... implement remaining 20 rules following same pattern
        
        return None
    
    def _determine_bid_impact(self, severity: str) -> str:
        if severity == "critical": return "skip"
        if severity == "high": return "reduce_bid"
        return "none"
    
    def _calculate_discount(self, rule: Dict) -> Optional[float]:
        if rule["severity"] == "high": return 10.0
        if rule["severity"] == "critical": return None  # skip, not discount
        return None
```

## OWNERSHIP CHAIN BUILDER

```python
# src/agents/analyzers/ownership_chain_builder.py

class OwnershipChainBuilder:
    """Builds grantor→grantee ownership chain from extracted deed documents."""
    
    def build(self, parcel_id: str, county: str, case_number: str,
              documents: List[ExtractedDocument]) -> List[Dict]:
        """
        Build ownership chain from deed documents.
        Returns list of ownership_chains rows to insert.
        """
        # Filter to deed-type documents only
        deeds = sorted(
            [d for d in documents if d.instrument_type in 
             ("deed", "trustees_deed", "tax_deed", "sheriffs_deed", "personal_rep")],
            key=lambda d: d.recording_date or date.min
        )
        
        if not deeds:
            return []
        
        chain = []
        for i, deed in enumerate(deeds):
            # Check chain continuity
            chain_complete = True
            gap_description = None
            
            if i > 0:
                prev_grantee = chain[i-1]["to_party"].lower().strip()
                curr_grantor = (deed.grantor_name or "").lower().strip()
                
                # Fuzzy match (handle name variations)
                if prev_grantee and curr_grantor:
                    if prev_grantee not in curr_grantor and curr_grantor not in prev_grantee:
                        chain_complete = False
                        gap_description = (f"Previous grantee '{chain[i-1]['to_party']}' "
                                         f"does not match current grantor '{deed.grantor_name}'")
            
            chain.append({
                "parcel_id": parcel_id,
                "county": county,
                "case_number": case_number,
                "chain_position": i + 1,
                "transfer_date": str(deed.recording_date) if deed.recording_date else None,
                "from_party": deed.grantor_name or "UNKNOWN",
                "from_party_type": deed.grantor_entity_type,
                "to_party": deed.grantee_name or "UNKNOWN",
                "to_party_type": deed.grantee_entity_type,
                "deed_type": deed.deed_type,
                "consideration": deed.consideration_amount,
                "instrument_number": deed.instrument_number,
                "chain_complete": chain_complete,
                "gap_description": gap_description,
            })
        
        return chain
```

## MAIN ORCHESTRATOR

```python
# src/agents/document_extraction_agent.py

async def extract_property_documents(case_number: str, county: str = "brevard"):
    """
    Main entry point. Extracts all documents for a foreclosure case.
    
    Pipeline: AcclaimWeb fetch → Gemini extraction → Chain build → Rules check
    Writes to: property_documents, ownership_chains, title_defects, document_extractions
    """
    
    # 1. Get auction record
    auction = supabase.table("multi_county_auctions") \
        .select("*").eq("case_number", case_number).single().execute()
    
    defendant = auction.data["plaintiff"]  # Search defendant AND plaintiff
    plaintiff = auction.data.get("plaintiff")
    parcel_id = auction.data.get("parcel_id")
    
    # 2. Fetch ALL document references from AcclaimWeb
    fetcher = AcclaimWebFetcher()
    doc_refs = await fetcher.fetch_document_details(defendant, role="GRANTOR")
    doc_refs += await fetcher.fetch_document_details(defendant, role="GRANTEE")
    if plaintiff:
        doc_refs += await fetcher.fetch_document_details(plaintiff, role="GRANTEE")
    
    # Deduplicate by instrument number
    seen = set()
    unique_refs = []
    for ref in doc_refs:
        key = ref.get("instrument_number") or ref.get("book_page")
        if key and key not in seen:
            seen.add(key)
            unique_refs.append(ref)
    
    # 3. Extract 46 data points per document via Gemini
    extractor = GeminiExtractor()
    extracted = []
    for ref in unique_refs:
        result = await extractor.extract(ref)
        if result:
            result.case_number = case_number
            result.parcel_id = parcel_id
            result.county = county
            extracted.append(result)
    
    # 4. Insert into property_documents
    for doc in extracted:
        supabase.table("property_documents").insert(doc.dict()).execute()
    
    # 5. Build ownership chain
    chain_builder = OwnershipChainBuilder()
    chain = chain_builder.build(parcel_id, county, case_number, extracted)
    for link in chain:
        supabase.table("ownership_chains").insert(link).execute()
    
    # 6. Run title rules
    rules_engine = TitleRulesEngine(supabase)
    defects = rules_engine.evaluate(parcel_id, extracted, chain)
    for defect in defects:
        supabase.table("title_defects").insert(defect).execute()
    
    # 7. Log extraction metrics
    supabase.table("document_extractions").insert({
        "parcel_id": parcel_id,
        "county": county,
        "extraction_method": "gemini_vision",
        "model_used": "gemini-2.0-flash",
        "fields_extracted": sum(sum(1 for v in doc.dict().values() if v is not None) for doc in extracted),
        "fields_confident": sum(1 for doc in extracted if doc.extraction_confidence > 0.8),
        "confidence_avg": sum(d.extraction_confidence for d in extracted) / max(len(extracted), 1),
    }).execute()
    
    return {
        "case_number": case_number,
        "documents_extracted": len(extracted),
        "chain_links": len(chain),
        "chain_complete": all(l.get("chain_complete", True) for l in chain),
        "defects_found": len(defects),
        "critical_defects": sum(1 for d in defects if d["severity"] == "critical"),
        "title_health": "SKIP" if any(d["severity"] == "critical" for d in defects)
                        else "REVIEW" if any(d["severity"] == "high" for d in defects)
                        else "CLEAR",
    }
```

## GITHUB ACTION WORKFLOW

```yaml
# .github/workflows/document_extraction.yml
name: Document Extraction Pipeline
on:
  workflow_dispatch:
    inputs:
      case_number:
        description: 'Case number to extract (or "batch" for all pending)'
        required: true
        default: 'batch'
      county:
        description: 'County'
        required: true
        default: 'brevard'
      max_properties:
        description: 'Max properties to process in batch mode'
        required: false
        default: '10'

jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install httpx pydantic supabase google-generativeai
      - run: python src/agents/document_extraction_agent.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          BROWSERLESS_API_KEY: ${{ secrets.BROWSERLESS_API_KEY }}
          CASE_NUMBER: ${{ github.event.inputs.case_number }}
          COUNTY: ${{ github.event.inputs.county }}
          MAX_PROPERTIES: ${{ github.event.inputs.max_properties }}
```

## COST ESTIMATE

Per property (assuming ~25 documents average):
- AcclaimWeb fetch: $0 (Browserless free tier or existing subscription)
- Gemini 2.0 Flash extraction: $0 (FREE tier, 60 RPM)
- Supabase writes: $0 (included in Pro plan)
- Total per property: $0

Per batch of 10 properties:
- ~250 Gemini calls × $0 = $0
- Processing time: ~15-30 minutes (rate limited by AcclaimWeb)

## TESTING STRATEGY

1. Start with ONE known Brevard case (pick from next auction)
2. Manually verify extracted data against AcclaimWeb records
3. Check ownership chain against BCPAO deed history
4. Verify title rules fire correctly for known HOA foreclosures
5. Scale to 10 properties, then full batch

## SUCCESS CRITERIA

- [ ] 46 fields extracted per document (vs current 9)
- [ ] Ownership chain built with gap detection
- [ ] 24 title rules evaluated per property
- [ ] v_lien_stack view returns correct active lien counts
- [ ] v_title_health view returns BID/REVIEW/SKIP correctly
- [ ] Zero cost per extraction (Gemini FREE tier)
- [ ] < 3 minutes per property average processing time
