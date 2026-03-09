#!/usr/bin/env node
/**
 * BidDeed.AI — O&E Title Search Report Generator
 * ================================================
 * Industry-standard 8-section Ownership & Encumbrance report
 * Matches EasyTitleSearch/ProTitleUSA/PropertyOnion format
 * with BidDeed.AI branding + AI-powered enhancements
 *
 * Sections:
 *   1. Legal Snapshot (header bar)
 *   2. Property Information
 *   3. Chain of Title Information
 *   4. Mortgage Lien Information
 *   5. Mortgage Litigation
 *   6. Additional Mortgage Info (Assignments)
 *   7. Other Encumbrances & Comments
 *   8. Tax Information
 *   9. BidDeed.AI Intelligence (EXCLUSIVE — not in competitors)
 *
 * Data Source: property_documents + multi_county_auctions + ownership_chains + title_defects
 */

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, PageBreak, PageNumber, LevelFormat } = require('docx');

// ═══════════════════════════════════════════════════════════════
// BRAND COLORS
// ═══════════════════════════════════════════════════════════════
const C = {
  NAVY: '1E3A5F',
  ORANGE: 'F59E0B',
  DARK: '020617',
  WHITE: 'FFFFFF',
  LIGHT: 'F8FAFC',
  GRAY: 'E2E8F0',
  MED_GRAY: '94A3B8',
  GREEN: '10B981',
  GREEN_BG: 'ECFDF5',
  RED: 'EF4444',
  RED_BG: 'FEE2E2',
  YELLOW_BG: 'FEF9C3',
  BLUE_BG: 'EFF6FF',
  SECTION_BG: 'F1F5F9',
};

// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA — Replace with Supabase query in production
// This sample mirrors the EasyTitleSearch report format exactly
// ═══════════════════════════════════════════════════════════════
const SAMPLE = {
  report: {
    creation_date: 'March 9, 2026',
    effective_date: 'March 7, 2026',
    report_id: 'BD-2026-00147',
  },
  // Section 1: Legal Snapshot
  snapshot: {
    mortgages_found: 2,
    litigation: true,
    delinquent_taxes: false,
    hoa_lien: true,
    title_health: 'REVIEW',  // BidDeed exclusive
    defects_found: 3,        // BidDeed exclusive
  },
  // Section 2: Property Information
  property: {
    address: '4821 Coconut Palm Drive',
    city: 'Melbourne',
    state: 'FL',
    zip: '32940',
    county: 'Brevard',
    owner_name: 'James R. Thompson and Lisa A. Thompson, Husband and Wife',
    parcel_id: '25-36-21-00-00123.0-0000.00',
    legal_description: 'Lot 14, Block 3, PALM BAY ESTATES UNIT 2, according to the plat thereof recorded in Plat Book 27, Page 45, Public Records of Brevard County, Florida',
  },
  // Section 3: Chain of Title
  chain_of_title: {
    deed_type: 'Warranty Deed',
    vested_in: 'James R. Thompson and Lisa A. Thompson, Husband and Wife',
    grantor: 'Robert M. Williams and Sandra K. Williams, Husband and Wife',
    execution_date: '03/15/2018',
    recording_date: '03/22/2018',
    book_page: '8234/1567',
    comments: 'None',
  },
  // Section 4+5+6: Mortgages
  mortgages: [
    {
      number: 1,
      amount: 285000.00,
      date_originated: '03/15/2018',
      date_recorded: '03/22/2018',
      book_page: '8234/1572',
      lender: 'Wells Fargo Bank, N.A.',
      borrower: 'James R. Thompson and Lisa A. Thompson, Husband and Wife',
      // Section 5: Litigation
      litigation: [
        { type: 'Lis Pendens', date: '09/14/2025', book_page: '9876/432', case_number: '05-2025-CA-045678' },
        { type: 'Final Judgment Foreclosure', date: '01/22/2026', book_page: '9945/118', amount: 312456.89 },
      ],
      // Section 6: Assignments
      assignments: [
        { date: '06/15/2019', book_page: '8567/234', assignee: 'Nationstar Mortgage LLC d/b/a Mr. Cooper' },
        { date: '11/02/2022', book_page: '9123/789', assignee: 'U.S. Bank Trust National Association, as Trustee' },
      ],
      comments: 'MERS as nominee on original mortgage. Two assignments recorded.',
    },
    {
      number: 2,
      amount: 50000.00,
      date_originated: '08/10/2020',
      date_recorded: '08/18/2020',
      book_page: '8890/345',
      lender: 'Bank of America, N.A.',
      borrower: 'James R. Thompson and Lisa A. Thompson, Husband and Wife',
      litigation: [],
      assignments: [],
      comments: 'Home equity line of credit (HELOC). No foreclosure action on this mortgage.',
    }
  ],
  // Section 7: Other Encumbrances
  encumbrances: [
    { type: 'HOA Lien', description: 'Claim of Lien by Palm Bay Estates Homeowners Association, Inc.', date: '07/12/2025', book_page: '9812/567', amount: 4850.00 },
  ],
  encumbrance_comments: 'HOA lien filed for unpaid assessments. Super-lien priority may apply per FL §720.3085.',
  // Section 8: Tax Information
  tax: {
    parcel: '25-36-21-00-00123.0-0000.00',
    tax_year: 2025,
    tax_value: 325000.00,
    exemption: 50000.00,
    delinquent: false,
    annual_tax: 4287.50,
    comments: 'Homestead exemption applied. Taxes current through 2025.',
  },
  // Section 9: BidDeed.AI Intelligence (EXCLUSIVE)
  intelligence: {
    judgment_amount: 312456.89,
    market_value: 385000.00,
    equity_spread_pct: 18.8,
    max_bid: 172500.00,
    recommendation: 'REVIEW',
    recommendation_reason: 'Second mortgage (HELOC $50K) may survive if first mortgage is being foreclosed. HOA lien super-priority adds risk. Equity spread is marginal at 18.8%.',
    defects: [
      { rule: 'LIEN_002', severity: 'HIGH', description: 'Multiple active mortgages — second HELOC from Bank of America may survive foreclosure sale' },
      { rule: 'HOA_002', severity: 'HIGH', description: 'HOA super-lien priority — $4,850 in unpaid assessments' },
      { rule: 'MORT_002', severity: 'MEDIUM', description: 'MERS mortgage — assignment chain requires verification' },
    ],
    ownership_chain_complete: true,
    chain_links: 3,
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
const border = { style: BorderStyle.SINGLE, size: 1, color: C.GRAY };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cm = { top: 60, bottom: 60, left: 120, right: 120 };
const CONTENT_WIDTH = 9360; // US Letter - 1" margins each side

function labelCell(label, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: C.SECTION_BG, type: ShadingType.CLEAR },
    margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 18, color: C.NAVY })] })]
  });
}

function valueCell(value, width, opts = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text: String(value || ''), font: 'Arial', size: 18, color: opts.color || C.DARK, bold: opts.bold || false })] })]
  });
}

function sectionHeader(number, title) {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.NAVY } },
    children: [
      new TextRun({ text: `${number}.  `, font: 'Arial', size: 24, bold: true, color: C.ORANGE }),
      new TextRun({ text: title, font: 'Arial', size: 24, bold: true, color: C.NAVY }),
    ]
  });
}

function kvRow(label, value, labelW, valueW) {
  return new TableRow({
    children: [labelCell(label, labelW), valueCell(value, valueW)]
  });
}

function kvTable(rows, labelW = 2200, valueW = 7160) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    rows: rows.map(([l, v]) => kvRow(l, v, labelW, valueW))
  });
}

function multiKvRow(pairs, widths) {
  const children = [];
  pairs.forEach(([label, value], i) => {
    children.push(labelCell(label, widths[i * 2]));
    children.push(valueCell(value, widths[i * 2 + 1]));
  });
  return new TableRow({ children });
}

function spacer(h = 100) {
  return new Paragraph({ spacing: { before: h } });
}

function fmt$(amount) {
  if (!amount) return 'N/A';
  return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ═══════════════════════════════════════════════════════════════
// BUILD THE REPORT
// ═══════════════════════════════════════════════════════════════
const d = SAMPLE;

const children = [];

// ─── HEADER BAR ────────────────────────────────────────────
children.push(
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4000, 5360],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders, width: { size: 4000, type: WidthType.DXA },
          shading: { fill: C.NAVY, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 120 },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'BidDeed.AI', font: 'Arial', size: 32, bold: true, color: C.WHITE })] }),
            new Paragraph({ children: [new TextRun({ text: 'Title Intelligence Report', font: 'Arial', size: 18, color: C.ORANGE })] }),
          ]
        }),
        new TableCell({
          borders: noBorders, width: { size: 5360, type: WidthType.DXA },
          shading: { fill: C.NAVY, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 120, right: 200 },
          children: [
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [
              new TextRun({ text: 'Report On: ', font: 'Arial', size: 16, color: C.MED_GRAY }),
              new TextRun({ text: `${d.property.address}`, font: 'Arial', size: 18, bold: true, color: C.WHITE }),
            ]}),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [
              new TextRun({ text: `${d.property.city}, ${d.property.state} ${d.property.zip}`, font: 'Arial', size: 16, color: C.MED_GRAY }),
            ]}),
            new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 60 }, children: [
              new TextRun({ text: `Created: ${d.report.creation_date}`, font: 'Arial', size: 14, color: C.MED_GRAY }),
              new TextRun({ text: `   Effective: ${d.report.effective_date}`, font: 'Arial', size: 14, color: C.MED_GRAY }),
              new TextRun({ text: `   ID: ${d.report.report_id}`, font: 'Arial', size: 14, color: C.MED_GRAY }),
            ]}),
          ]
        }),
      ]
    })]
  })
);

// ─── SECTION 1: LEGAL SNAPSHOT BAR ─────────────────────────
children.push(spacer(200));
children.push(
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1872, 1872, 1872, 1872, 1872],
    rows: [new TableRow({
      children: [
        // Mortgages Found
        new TableCell({
          borders, width: { size: 1872, type: WidthType.DXA },
          shading: { fill: C.SECTION_BG, type: ShadingType.CLEAR }, margins: cm,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mortgages', font: 'Arial', size: 14, color: C.MED_GRAY })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(d.snapshot.mortgages_found), font: 'Arial', size: 28, bold: true, color: C.NAVY })] }),
          ]
        }),
        // Litigation
        new TableCell({
          borders, width: { size: 1872, type: WidthType.DXA },
          shading: { fill: d.snapshot.litigation ? C.RED_BG : C.GREEN_BG, type: ShadingType.CLEAR }, margins: cm,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Litigation', font: 'Arial', size: 14, color: C.MED_GRAY })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.snapshot.litigation ? 'YES' : 'NO', font: 'Arial', size: 28, bold: true, color: d.snapshot.litigation ? C.RED : C.GREEN })] }),
          ]
        }),
        // Delinquent Taxes
        new TableCell({
          borders, width: { size: 1872, type: WidthType.DXA },
          shading: { fill: d.snapshot.delinquent_taxes ? C.RED_BG : C.GREEN_BG, type: ShadingType.CLEAR }, margins: cm,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Delinquent Taxes', font: 'Arial', size: 14, color: C.MED_GRAY })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.snapshot.delinquent_taxes ? 'YES' : 'NO', font: 'Arial', size: 28, bold: true, color: d.snapshot.delinquent_taxes ? C.RED : C.GREEN })] }),
          ]
        }),
        // HOA Lien (BidDeed enhancement)
        new TableCell({
          borders, width: { size: 1872, type: WidthType.DXA },
          shading: { fill: d.snapshot.hoa_lien ? C.YELLOW_BG : C.GREEN_BG, type: ShadingType.CLEAR }, margins: cm,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HOA Lien', font: 'Arial', size: 14, color: C.MED_GRAY })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.snapshot.hoa_lien ? 'YES' : 'NO', font: 'Arial', size: 28, bold: true, color: d.snapshot.hoa_lien ? 'B45309' : C.GREEN })] }),
          ]
        }),
        // BidDeed Recommendation (EXCLUSIVE)
        new TableCell({
          borders, width: { size: 1872, type: WidthType.DXA },
          shading: { fill: d.snapshot.title_health === 'SKIP' ? C.RED_BG : d.snapshot.title_health === 'REVIEW' ? C.YELLOW_BG : C.GREEN_BG, type: ShadingType.CLEAR }, margins: cm,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AI Recommendation', font: 'Arial', size: 14, color: C.ORANGE })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.snapshot.title_health, font: 'Arial', size: 28, bold: true, color: d.snapshot.title_health === 'SKIP' ? C.RED : d.snapshot.title_health === 'REVIEW' ? 'B45309' : C.GREEN })] }),
          ]
        }),
      ]
    })]
  })
);

// ─── SECTION 2: PROPERTY INFORMATION ──────────────────────
children.push(sectionHeader('2', 'Property Information'));
children.push(kvTable([
  ['Site Address', `${d.property.address}, ${d.property.city}, ${d.property.state} ${d.property.zip}`],
  ['County', d.property.county],
  ['Owner Name', d.property.owner_name],
  ['Tax ID / Parcel', d.property.parcel_id],
  ['Legal Description', d.property.legal_description],
]));

// ─── SECTION 3: CHAIN OF TITLE ───────────────────────────
children.push(sectionHeader('3', 'Chain of Title Information'));
children.push(kvTable([
  ['Deed Type', d.chain_of_title.deed_type],
  ['Title Vested In', d.chain_of_title.vested_in],
  ['Grantor', d.chain_of_title.grantor],
]));
// Date row with multiple columns
children.push(new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [1100, 1800, 1100, 1800, 1200, 2360],
  rows: [new TableRow({
    children: [
      labelCell('Dated', 1100), valueCell(d.chain_of_title.execution_date, 1800),
      labelCell('Recorded', 1100), valueCell(d.chain_of_title.recording_date, 1800),
      labelCell('Book/Page', 1200), valueCell(d.chain_of_title.book_page, 2360),
    ]
  })]
}));
children.push(kvTable([['Comments', d.chain_of_title.comments]]));

// ─── SECTIONS 4-6: MORTGAGES ─────────────────────────────
for (const mtg of d.mortgages) {
  children.push(sectionHeader(`4.${mtg.number}`, `Mortgage ${mtg.number}`));

  // Mortgage header row
  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1000, 2100, 900, 1700, 1200, 2460],
    rows: [new TableRow({
      children: [
        labelCell('Amount', 1000), valueCell(fmt$(mtg.amount), 2100, { bold: true }),
        labelCell('Dated', 900), valueCell(mtg.date_originated, 1700),
        labelCell('Book/Page', 1200), valueCell(mtg.book_page, 2460),
      ]
    })]
  }));
  children.push(kvTable([
    ['Lender', mtg.lender],
    ['Borrower', mtg.borrower],
  ]));

  // Section 5: Litigation for this mortgage
  if (mtg.litigation.length > 0) {
    children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [
      new TextRun({ text: `  5.${mtg.number}  `, font: 'Arial', size: 20, bold: true, color: C.ORANGE }),
      new TextRun({ text: 'Litigation', font: 'Arial', size: 20, bold: true, color: C.NAVY }),
    ]}));
    for (const lit of mtg.litigation) {
      const litText = lit.amount
        ? `${lit.type} ${lit.date} ${lit.book_page} ${lit.case_number || ''} ${fmt$(lit.amount)}`
        : `${lit.type} ${lit.date} ${lit.book_page} ${lit.case_number || ''}`;
      children.push(kvTable([['Litigation', litText]]));
    }
  }

  // Section 6: Assignments
  if (mtg.assignments.length > 0) {
    children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [
      new TextRun({ text: `  6.${mtg.number}  `, font: 'Arial', size: 20, bold: true, color: C.ORANGE }),
      new TextRun({ text: 'Assignment History', font: 'Arial', size: 20, bold: true, color: C.NAVY }),
    ]}));
    for (const asn of mtg.assignments) {
      children.push(kvTable([
        ['Assignment', `${asn.date}  ${asn.book_page}  ${asn.assignee}`],
      ]));
    }
  }

  if (mtg.comments) {
    children.push(kvTable([['Comments', mtg.comments]]));
  }
}

// ─── SECTION 7: OTHER ENCUMBRANCES ───────────────────────
children.push(sectionHeader('7', 'Other Encumbrances & Comments'));
if (d.encumbrances.length > 0) {
  for (const enc of d.encumbrances) {
    children.push(kvTable([
      ['Type', enc.type],
      ['Description', `${enc.description} ${enc.date} ${enc.book_page} ${enc.amount ? fmt$(enc.amount) : ''}`],
    ]));
  }
}
children.push(kvTable([['Comments', d.encumbrance_comments]]));

// ─── SECTION 8: TAX INFORMATION ──────────────────────────
children.push(sectionHeader('8', 'Tax Information'));
children.push(new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [1100, 2700, 1100, 1900, 1200, 1360],
  rows: [
    new TableRow({ children: [
      labelCell('Parcel #', 1100), valueCell(d.tax.parcel, 2700),
      labelCell('Tax Year', 1100), valueCell(String(d.tax.tax_year), 1900),
      labelCell('Delinquent', 1200), valueCell(d.tax.delinquent ? 'YES' : 'No', 1360, { color: d.tax.delinquent ? C.RED : C.GREEN, bold: true }),
    ]}),
    new TableRow({ children: [
      labelCell('Tax Value', 1100), valueCell(fmt$(d.tax.tax_value), 2700),
      labelCell('Exemption', 1100), valueCell(fmt$(d.tax.exemption), 1900),
      labelCell('Annual Tax', 1200), valueCell(fmt$(d.tax.annual_tax), 1360),
    ]}),
  ]
}));
children.push(kvTable([['Comments', d.tax.comments]]));

// ─── SECTION 9: BIDDEED.AI INTELLIGENCE (EXCLUSIVE) ──────
children.push(spacer(200));
children.push(
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: C.ORANGE }, bottom: border, left: border, right: border },
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        shading: { fill: '0F172A', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 60, left: 200, right: 200 },
        children: [
          new Paragraph({ children: [
            new TextRun({ text: '9.  ', font: 'Arial', size: 24, bold: true, color: C.ORANGE }),
            new TextRun({ text: 'BidDeed.AI Intelligence', font: 'Arial', size: 24, bold: true, color: C.WHITE }),
            new TextRun({ text: '  — AI-Powered Analysis (Not Available from Other Providers)', font: 'Arial', size: 16, color: C.MED_GRAY }),
          ]}),
        ]
      })]
    })]
  })
);

// Intelligence metrics
children.push(new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [1560, 1560, 1560, 1560, 1560, 1560],
  rows: [new TableRow({
    children: [
      labelCell('Judgment', 1560), valueCell(fmt$(d.intelligence.judgment_amount), 1560, { bold: true }),
      labelCell('Market Value', 1560), valueCell(fmt$(d.intelligence.market_value), 1560, { bold: true }),
      labelCell('Equity Spread', 1560), valueCell(`${d.intelligence.equity_spread_pct}%`, 1560, { bold: true, color: d.intelligence.equity_spread_pct > 30 ? C.GREEN : d.intelligence.equity_spread_pct > 15 ? 'B45309' : C.RED }),
    ]
  }),
  new TableRow({
    children: [
      labelCell('Max Bid', 1560), valueCell(fmt$(d.intelligence.max_bid), 1560, { bold: true, color: C.NAVY }),
      labelCell('Recommendation', 1560), valueCell(d.intelligence.recommendation, 1560, { bold: true, color: d.intelligence.recommendation === 'BID' ? C.GREEN : d.intelligence.recommendation === 'SKIP' ? C.RED : 'B45309' }),
      labelCell('Chain Complete', 1560), valueCell(d.intelligence.ownership_chain_complete ? 'YES' : 'BREAK DETECTED', 1560, { bold: true, color: d.intelligence.ownership_chain_complete ? C.GREEN : C.RED }),
    ]
  })]
}));

// Recommendation reasoning
children.push(kvTable([
  ['AI Analysis', d.intelligence.recommendation_reason],
]));

// Title defects
if (d.intelligence.defects.length > 0) {
  children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [
    new TextRun({ text: '  Title Defects Detected:', font: 'Arial', size: 20, bold: true, color: C.RED }),
  ]}));

  const defectRows = d.intelligence.defects.map(def => {
    const fill = def.severity === 'HIGH' ? C.RED_BG : def.severity === 'CRITICAL' ? C.RED_BG : C.YELLOW_BG;
    return new TableRow({
      children: [
        new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR }, margins: cm,
          children: [new Paragraph({ children: [new TextRun({ text: def.rule, font: 'Arial', size: 16, bold: true, color: C.DARK })] })] }),
        new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR }, margins: cm,
          children: [new Paragraph({ children: [new TextRun({ text: def.severity, font: 'Arial', size: 16, bold: true, color: def.severity === 'HIGH' ? C.RED : 'B45309' })] })] }),
        new TableCell({ borders, width: { size: 6960, type: WidthType.DXA }, margins: cm,
          children: [new Paragraph({ children: [new TextRun({ text: def.description, font: 'Arial', size: 16, color: C.DARK })] })] }),
      ]
    });
  });

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1200, 1200, 6960],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill: C.NAVY, type: ShadingType.CLEAR }, margins: cm,
            children: [new Paragraph({ children: [new TextRun({ text: 'Rule', bold: true, color: C.WHITE, font: 'Arial', size: 16 })] })] }),
          new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill: C.NAVY, type: ShadingType.CLEAR }, margins: cm,
            children: [new Paragraph({ children: [new TextRun({ text: 'Severity', bold: true, color: C.WHITE, font: 'Arial', size: 16 })] })] }),
          new TableCell({ borders, width: { size: 6960, type: WidthType.DXA }, shading: { fill: C.NAVY, type: ShadingType.CLEAR }, margins: cm,
            children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, color: C.WHITE, font: 'Arial', size: 16 })] })] }),
        ]
      }),
      ...defectRows,
    ]
  }));
}

// ─── FOOTER DISCLAIMER ───────────────────────────────────
children.push(spacer(300));
children.push(new Paragraph({
  border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.ORANGE } },
  spacing: { before: 100 },
  children: [new TextRun({ text: 'DISCLAIMER: ', font: 'Arial', size: 14, bold: true, color: C.RED }),
    new TextRun({ text: 'This report is for investment analysis purposes only and does not constitute legal advice, a title opinion, or title insurance. BidDeed.AI is not a title company, law firm, or licensed abstractor. Data is sourced from public county records and may not reflect all encumbrances. Always consult a licensed title professional or attorney before making purchase decisions. AI-generated analysis may contain errors.', font: 'Arial', size: 14, color: C.MED_GRAY }),
  ]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200 },
  children: [
    new TextRun({ text: 'BidDeed.AI', font: 'Arial', size: 18, bold: true, color: C.NAVY }),
    new TextRun({ text: '  —  Agentic AI Ecosystem for Distressed Asset Intelligence  —  ', font: 'Arial', size: 14, color: C.MED_GRAY }),
    new TextRun({ text: 'biddeed.ai', font: 'Arial', size: 14, color: C.ORANGE }),
  ]
}));

// ═══════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 720, right: 1440, bottom: 720, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [] })
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'CONFIDENTIAL — For Investment Analysis Only — Not a Title Opinion or Legal Advice', font: 'Arial', size: 12, color: C.MED_GRAY }),
        ]})
      ]})
    },
    children
  }]
});

const outputPath = '/mnt/user-data/outputs/BidDeed_AI_Title_Intelligence_Report_TEMPLATE.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Report generated: ' + outputPath);
}).catch(err => console.error('Error:', err));
