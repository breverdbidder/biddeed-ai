# BidDeed.AI — Claude Code Bootstrap (v2.0)
## Paste into Claude Code session — all steps sequential

---

## Step 1: Install Plugins (2 slash commands)

```
/plugin marketplace add jshchnz/claude-code-scheduler
/plugin install scheduler@claude-code-scheduler
```

Then also install debug-skill (deployed to all repos March 8):
```
/plugin marketplace add AlmogBaku/debug-skill
/plugin install debugging-code@debug-skill-marketplace
```

---

## Step 2: Clone and Setup

```
git clone https://github.com/breverdbidder/biddeed-ai.git ~/repos/biddeed-ai
cd ~/repos/biddeed-ai
npm install
```

---

## Step 3: Initialize shadcn/ui (CRITICAL — missing from v1.0)

Neither biddeed-ai nor zonewise-web had components.json initialized (confirmed March 6 audit). The fork from vercel/chatbot may have one, but it needs house brand override.

Tell Claude:

```
Initialize shadcn/ui in this project with these exact settings:

1. Run: npx shadcn@latest init
   - Style: New York
   - Base color: Slate
   - CSS variables: Yes
   - RSC: Yes (this is Next.js App Router)
   - Tailwind CSS: tailwind.config.ts
   - Components alias: @/components
   - Utils alias: @/lib/utils

2. Override the generated CSS variables in app/globals.css with our house brand:

   :root {
     --background: 222.2 84% 4.9%;
     --foreground: 210 40% 98%;
     --primary: 213 52% 24%;
     --primary-foreground: 0 0% 100%;
     --secondary: 213 52% 30%;
     --secondary-foreground: 0 0% 100%;
     --accent: 38 92% 50%;
     --accent-foreground: 0 0% 0%;
     --muted: 217.2 32.6% 17.5%;
     --muted-foreground: 215 20.2% 65.1%;
     --card: 222.2 84% 6%;
     --card-foreground: 210 40% 98%;
     --border: 217.2 32.6% 17.5%;
     --input: 217.2 32.6% 17.5%;
     --ring: 213 52% 24%;
     --destructive: 0 84.2% 60.2%;
     --destructive-foreground: 0 0% 98%;
   }

3. Add custom tokens to tailwind.config.ts extend.colors:
   'bb-navy': '#1E3A5F',
   'bb-orange': '#F59E0B',
   'bb-dark': '#020617',
   'decision-bid': '#22C55E',
   'decision-review': '#EAB308',
   'decision-skip': '#EF4444',

4. Set font-family to Inter in tailwind.config.ts:
   fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }

5. Install essential shadcn components:
   npx shadcn@latest add button card input scroll-area tabs badge
   npx shadcn@latest add avatar dropdown-menu sheet separator
   npx shadcn@latest add resizable tooltip dialog

   Also try these NEW v4 components (skip if unavailable):
   npx shadcn@latest add spinner field empty

6. If shadcn CLI v4 Skills are available:
   npx shadcn@latest skill list
   Install all available skills to teach Claude Code the component API.
```

---

## Step 4: Register Scheduled Tasks

```
Schedule these tasks for BidDeed.AI:

1. "nightly-auction-scrape-verify" — Every night at 11:30 PM EST, autonomous:
   Check Supabase multi_county_auctions for today's scrape. Verify all 46 FL
   counties have new rows. Fix 'miami-dade' to 'miami_dade'. Flag NULL
   judgment_amount > 5%. Create GitHub issue if county failed.
   Working directory: ~/repos/biddeed-ai

2. "morning-auction-brief" — Every weekday at 8:30 AM EST, read-only:
   Query active Brevard auctions. Run max bid formula on < $300K properties.
   Categorize BID/REVIEW/SKIP. Save ~/daily-briefs/YYYY-MM-DD-auction-brief.md
   Working directory: ~/repos/biddeed-ai

3. "weekly-supabase-health" — Every Monday at 10 AM EST, read-only:
   Health check mocerqjnksmhcjzxrewo.supabase.co. Table sizes, RLS active,
   Edge Functions responding, storage vs free tier.
   Working directory: ~/repos/biddeed-ai

4. "friday-shabbat-guard" — Every Friday at 3 PM EST, autonomous:
   Push uncommitted work. Disable overnight-dev for Fri/Sat. Generate
   ~/weekly-status/YYYY-MM-DD-pre-shabbat.md
   Working directory: ~/repos/biddeed-ai
```

---

## Step 5: Start ISSUE-001 (The Big One)

```
Load TODO.md from this repo. Start executing ISSUE-001: Fork Setup.

Context:
- This is a fork of vercel/chatbot → becoming BidDeed.AI
- Swap Vercel Postgres → Supabase (mocerqjnksmhcjzxrewo.supabase.co)
- Swap NextAuth → Clerk (reuse pattern from breverdbidder/zonewise-web)
- Set Claude Sonnet 4.5 as default via Vercel AI SDK
- Apply house brand: Navy #1E3A5F, Orange #F59E0B, Inter font, bg #020617
- Read CLAUDE.md for full architecture context

CRITICAL shadcn notes (from our March 6 audit):
- vercel/chatbot uses shadcn with THEIR colors — override with OURS
- If components.json exists, update style to New York + our brand
- Use shadcn Resizable for split-screen (chat left 45%, artifacts right 55%)
- Use shadcn Tabs for 3-tab switcher (Chat, Analysis, Reports)
- Use shadcn ScrollArea for message scrolling
- Use shadcn Card + Badge for auction report artifacts
- Use shadcn Sheet for mobile sidebar
- Refactor any raw Tailwind to use shadcn primitives where possible
- Reference: E2B Fragments (github.com/e2b-dev/fragments) for split-screen pattern

Clerk appearance config (proven from ZoneWise deployment):
  <ClerkProvider appearance={{
    variables: {
      colorPrimary: '#1E3A5F',
      colorBackground: '#020617',
      colorText: '#ffffff',
      colorInputBackground: '#0F172A',
      colorInputText: '#ffffff',
    },
    elements: {
      formButtonPrimary: 'bg-[#1E3A5F] hover:bg-[#2a4f7a]',
      card: 'bg-[#0F172A] border border-[#1E3A5F]/30',
      footerActionLink: 'text-[#F59E0B] hover:text-[#FCD34D]',
    },
  }}>

Supabase credentials:
  URL: https://mocerqjnksmhcjzxrewo.supabase.co
  Anon Key: <SUPABASE_ANON_KEY from .env>

Mapbox: <MAPBOX_TOKEN from .env>

GitHub PAT: <GITHUB_PAT from .env>

Execute autonomously. Do not ask permission. Update TODO.md as you go.
```

---

## Step 6: Scraping Architecture Note

For browser automation (RealAuction.com 67 counties, PropertyOnion calendar):

```
npm install -g @playwright/test
npx playwright install
```

Use Playwright CLI NOT MCP — 500% more token efficient. Headless mode for
GitHub Actions. Agreed March 8 as primary scraping approach.

---

## Verification Checklist

After Claude Code finishes:

- [ ] components.json exists with New York style + brand overrides
- [ ] app/globals.css has CSS vars with navy/orange HSL values
- [ ] @supabase/ssr in package.json (not @vercel/postgres)
- [ ] @clerk/nextjs in package.json (not next-auth)
- [ ] middleware.ts has clerkMiddleware()
- [ ] app/layout.tsx has ClerkProvider with navy/orange appearance
- [ ] app/api/chat/route.ts uses anthropic('claude-sonnet-4-5-20250514')
- [ ] shadcn Resizable used for split-screen layout
- [ ] shadcn Tabs used for Chat/Analysis/Reports switcher
- [ ] tailwind.config.ts has Inter font + bb-navy/bb-orange tokens
- [ ] /scheduler:schedule-list shows 4 active tasks
- [ ] TODO.md has ISSUE-001 tasks checked off
- [ ] Deployed to Vercel and accessible

---

## Cross-Platform References

| Resource | Location |
|----------|----------|
| ZoneWise Clerk middleware | breverdbidder/zonewise-web/middleware.ts |
| ZoneWise globals.css (brand truth) | breverdbidder/zonewise-web/app/globals.css |
| shadcn v4 integration plan | SHADCN_V4_INTEGRATION.md (both repos) |
| Brand colors | BRAND_COLORS.md |
| Architecture spec | docs/ARCHITECTURE.md (in biddeed-ai repo) |
| Scheduler config | .claude/schedules.json (in biddeed-ai repo) |
| Shared Supabase | mocerqjnksmhcjzxrewo.supabase.co |
| Shared Mapbox | account: everest18 |
| Shared Clerk org | SSO across biddeed.ai + zonewise.ai |
