#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# BidDeed.AI — Claude Code Launcher
# Usage: bash launch-biddeed-build.sh
# ═══════════════════════════════════════════════════════════════

set -e

REPO_DIR="$HOME/repos/biddeed-ai"
ENV_SOURCE="$HOME/.secrets/biddeed-ai.env.local"

echo "═══════════════════════════════════════════════════════════"
echo "  BidDeed.AI — Claude Code Build Launcher"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────
# STEP 0: Verify .env.local exists in secure location
# ─────────────────────────────────────────────────────────────
if [ ! -f "$ENV_SOURCE" ]; then
  echo "❌ Missing: $ENV_SOURCE"
  echo ""
  echo "Create it first:"
  echo "  mkdir -p ~/.secrets"
  echo "  cp biddeed-ai.env.local ~/.secrets/biddeed-ai.env.local"
  echo "  chmod 600 ~/.secrets/biddeed-ai.env.local"
  echo ""
  exit 1
fi

echo "✅ Credentials found: $ENV_SOURCE"

# ─────────────────────────────────────────────────────────────
# STEP 1: Clone repo if not present
# ─────────────────────────────────────────────────────────────
if [ ! -d "$REPO_DIR" ]; then
  echo "📥 Cloning breverdbidder/biddeed-ai..."
  git clone https://github.com/breverdbidder/biddeed-ai.git "$REPO_DIR"
else
  echo "✅ Repo exists: $REPO_DIR"
  cd "$REPO_DIR" && git pull origin main
fi

# ─────────────────────────────────────────────────────────────
# STEP 2: Copy .env.local into repo (gitignored)
# ─────────────────────────────────────────────────────────────
cp "$ENV_SOURCE" "$REPO_DIR/.env.local"
chmod 600 "$REPO_DIR/.env.local"
echo "✅ .env.local copied to repo (gitignored, 600 perms)"

# ─────────────────────────────────────────────────────────────
# STEP 3: Install plugins (interactive — only runs once)
# ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  STEP 3: Plugin Install (interactive — one time only)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "If plugins are already installed, skip this step."
echo "Otherwise, open claude and run these two commands:"
echo ""
echo "  /plugin marketplace add jshchnz/claude-code-scheduler"
echo "  /plugin install scheduler@claude-code-scheduler"
echo ""
echo "  /plugin marketplace add AlmogBaku/debug-skill"
echo "  /plugin install debugging-code@debug-skill-marketplace"
echo ""
read -p "Press ENTER when plugins are installed (or already were)..."

# ─────────────────────────────────────────────────────────────
# STEP 4: Launch Claude Code in DAP mode
# ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  STEP 4: Launching Claude Code (autonomous mode)"
echo "═══════════════════════════════════════════════════════════"
echo ""

cd "$REPO_DIR"

claude -p "
You are the AI Engineer for BidDeed.AI. Execute ISSUE-001 autonomously.

FIRST: Read CLAUDE.md and TODO.md from this repo for full context.

ENVIRONMENT: .env.local is already in place with all credentials (Supabase, Clerk, Anthropic, Mapbox, GitHub). Use process.env references — never hardcode secrets.

EXECUTE THESE TASKS IN ORDER:

1. DEPENDENCIES
   - Remove @vercel/postgres, @vercel/kv, next-auth and related packages
   - Install: @supabase/ssr @supabase/supabase-js @clerk/nextjs
   - Run npm install

2. SUPABASE CLIENT
   - Create lib/supabase/client.ts (browser client using @supabase/ssr with cookies)
   - Create lib/supabase/server.ts (server-side client)
   - Replace ALL Vercel KV/Postgres imports and calls with Supabase equivalents
   - Use env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

3. CLERK AUTH
   - Create middleware.ts:
     import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
     const isPublic = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)'])
     export default clerkMiddleware(async (auth, req) => { if (!isPublic(req)) await auth.protect() })
   - Create app/(auth)/sign-in/[[...sign-in]]/page.tsx with Clerk SignIn component
   - Create app/(auth)/sign-up/[[...sign-up]]/page.tsx with Clerk SignUp component
   - Wrap app/layout.tsx with ClerkProvider using appearance config:
     variables: { colorPrimary: '#1E3A5F', colorBackground: '#020617', colorText: '#ffffff', colorInputBackground: '#0F172A', colorInputText: '#ffffff' }
     elements: { formButtonPrimary: 'bg-[#1E3A5F] hover:bg-[#2a4f7a]', card: 'bg-[#0F172A] border border-[#1E3A5F]/30', footerActionLink: 'text-[#F59E0B] hover:text-[#FCD34D]' }

4. SHADCN/UI BRAND OVERRIDE
   - If components.json exists, update style to 'new-york', base to 'slate'
   - If not, run: npx shadcn@latest init (New York, Slate, CSS vars yes, RSC yes)
   - Override app/globals.css CSS variables:
     --primary: 213 52% 24% (navy #1E3A5F)
     --accent: 38 92% 50% (orange #F59E0B)
     --background: 222.2 84% 4.9% (#020617)
     --card: 222.2 84% 6%
   - Add to tailwind.config.ts extend.colors:
     'bb-navy': '#1E3A5F', 'bb-orange': '#F59E0B', 'bb-dark': '#020617'
     'decision-bid': '#22C55E', 'decision-review': '#EAB308', 'decision-skip': '#EF4444'
   - Set fontFamily.sans to ['Inter', 'system-ui', 'sans-serif']
   - Install components: npx shadcn@latest add button card input scroll-area tabs badge avatar dropdown-menu sheet separator resizable tooltip dialog

5. AI MODEL
   - Update app/api/chat/route.ts to use: import { anthropic } from '@ai-sdk/anthropic'
   - Set model: anthropic('claude-sonnet-4-5-20250514')
   - Verify streamText() is the streaming method

6. SPLIT-SCREEN LAYOUT
   - Use shadcn Resizable for chat (left 45%) + artifacts (right 55%)
   - Use shadcn Tabs for 3-tab mode switcher: Chat, Analysis, Reports
   - Use shadcn ScrollArea for message list
   - Use shadcn Sheet for mobile sidebar/bottom-sheet fallback
   - Reference pattern: github.com/e2b-dev/fragments

7. UPDATE TODO.md
   - Mark each completed task with [x]
   - Commit after each major step with descriptive message

8. VERIFY
   - npm run build must pass
   - No hardcoded secrets anywhere (grep for them)
   - .env.local is in .gitignore
   - All shadcn components render with navy/orange brand colors
   - Clerk sign-in page renders

9. COMMIT AND PUSH
   - git add -A
   - git commit -m 'feat: ISSUE-001 complete — Clerk auth + Supabase DB + shadcn brand + Claude AI'
   - git push origin main

RULES:
- NEVER hardcode any secret/key/token — always use process.env
- NEVER commit .env.local
- If blocked, try 3 alternatives before reporting
- Update TODO.md after each step
- Commit frequently
" --dangerously-skip-permissions

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Claude Code session complete."
echo "  Check: https://github.com/breverdbidder/biddeed-ai"
echo "═══════════════════════════════════════════════════════════"
