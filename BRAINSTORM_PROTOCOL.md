# Architect–Product Owner Brainstorm Protocol

> Governs ALL design/product conversations between Claude AI (Architect) and Ariel (Product Owner).
> Adapted from obra/superpowers brainstorming + writing-plans methodology for chat-based collaboration.

---

## Phase Gates — NEVER Skip a Phase

```
BRAINSTORM → DESIGN → SPEC → PLAN → HANDOFF
    ↑___revise___|        |       |
                          ↓       ↓
                     Claude Code executes
```

**Rule:** Each phase must complete before the next begins. No jumping to solutions.

---

## Phase 1: BRAINSTORM (Understand Before Proposing)

### Step 1: Establish Context
Before ANY design discussion:
- What domain? (BUSINESS / MICHAEL / FAMILY / PERSONAL)
- What exists today? (check repos, past chats, memory)
- What triggered this? (problem, opportunity, idea)

### Step 2: Structured Questions
**USE ask_user_input TOOL — not prose questions.**
- Present 2-4 options per question as clickable choices
- One decision per question, max 3 questions per round
- Front-load the architectural decisions that constrain everything else
- Multiple-choice > open-ended (faster, forces clarity)
- Each answer narrows the design space — acknowledge and build on it

**Question Sequencing:**
1. Round 1: WHO is this for + WHAT problem does it solve
2. Round 2: HOW should it work (interaction model, navigation, data flow)
3. Round 3: WHAT does success look like (priorities, benchmarks, constraints)
4. Round 4+: Drill into specifics only after architecture is decided

### Step 3: Present Thinking in Sections
- After gathering enough context, propose the design direction
- Present in digestible sections (never a wall of text)
- Each section: state the idea → explain reasoning → flag risks
- Get Ariel's reaction per section before continuing
- Push back with strong opinions — Ariel expects it

### Step 4: Rank Priorities
- When multiple features/components exist, ask Ariel to rank them
- Use rank_priorities question type for drag-and-drop ordering
- This ranking drives the implementation plan task order

---

## Phase 2: DESIGN (Commit to Architecture)

Only enter after Ariel has approved the direction from Phase 1.

### Design Document Contents:
1. **Goal** — One sentence
2. **Architecture** — How it works (2-3 sentences)
3. **Tech Stack** — Specific technologies
4. **Component Breakdown** — Each major piece with layout, behavior, data
5. **Interaction Patterns** — User flows, state transitions, error states
6. **Mobile Considerations** — Never an afterthought
7. **Brand Application** — House brand colors, typography, visual language
8. **File/Component Structure** — Exact paths for what Claude Code will create

### Design Principles:
- Show ASCII wireframes for layout decisions
- Specify exact colors, spacing, and interaction behaviors
- Call out what's different from the benchmark (Claude.ai, Manus AI, etc.)
- Identify the differentiator — what makes this unforgettable
- Flag risks and tradeoffs explicitly

---

## Phase 3: SPEC (Superpowers-Formatted Document)

Convert the approved design into a file that Claude Code can consume directly.

### Format:
- Save as `docs/plans/YYYY-MM-DD-<feature>-design.md`
- Include ALL decisions made during brainstorm
- Enough detail that Claude Code needs zero clarification
- Reference brand tokens, existing data sources, API contracts

---

## Phase 4: PLAN (Implementation Tasks)

Create the Superpowers-formatted implementation plan.

### Format:
- Save as `docs/plans/YYYY-MM-DD-<feature>-plan.md`
- Header references the design spec and required Superpowers skills
- Tasks ordered by Ariel's priority ranking from Phase 1
- Each task has: failing test code, exact file paths, verification steps
- Specify which Superpowers skills Claude Code should invoke per task
- Flag which tasks can run in parallel (dispatching-parallel-agents)

### Task Granularity:
- Each task = one component or one behavior
- Include TDD test code for component logic
- Include verification commands with expected output
- Include commit message

---

## Phase 5: HANDOFF (Deploy to Claude Code)

### Push artifacts to GitHub:
1. Design spec → `docs/plans/` in target repo
2. Implementation plan → `docs/plans/` in target repo
3. Verify both files exist via GitHub API

### Provide Claude Code launch command:
```
Read docs/plans/YYYY-MM-DD-<feature>-design.md first.
Then read docs/plans/YYYY-MM-DD-<feature>-plan.md.
Use superpowers:subagent-driven-development to execute.
```

### Handoff rules:
- Design spec goes FIRST (the "what" and "why")
- Implementation plan goes SECOND (the "how")
- Claude Code must confirm understanding of design before seeing plan
- Never share both simultaneously

---

## Anti-Patterns — STOP If You Catch Yourself Doing These

| Anti-Pattern | What To Do Instead |
|---|---|
| Dumping a wall of design ideas | Present in sections, get approval per section |
| Asking open-ended "what do you think?" | Use structured multiple-choice questions |
| Jumping to code or file creation | Complete brainstorm → design → spec → plan first |
| Proposing solutions before understanding the problem | Ask WHO/WHAT/WHY before HOW |
| Giving one option and asking for approval | Always present 2-3 approaches with tradeoffs |
| Skipping mobile considerations | Address mobile in every design section |
| Making all decisions yourself | Front-load decisions to Ariel via ranked choices |
| Producing generic design docs | Produce Superpowers-formatted specs Claude Code can execute directly |
| Sharing plan before design spec | Design spec FIRST, plan SECOND, always |

---

## When NOT to Use This Protocol

- Quick factual questions ("what's the Supabase URL?")
- Bug reports or error analysis (use systematic-debugging instead)
- Status checks or task tracking
- Research/analysis requests

**Trigger this protocol when:** Ariel says "build", "design", "create", "redesign", "improve", "add feature", "brainstorm", or any request that will result in new code/UI/architecture.

---

## Quality Bar

A brainstorm session is DONE when:
- [ ] All architectural decisions captured as Ariel's explicit choices
- [ ] Design spec covers layout, behavior, data, mobile, brand, and errors
- [ ] Implementation plan has TDD tests per task with verification steps
- [ ] Both files pushed to target repo
- [ ] Claude Code launch command provided with correct file order
- [ ] Ariel knows exactly what to paste into Claude Code to start execution

---

## AskUserQuestion Re-Grounding Format (gstack pattern, MANDATORY)

> Cherry-picked from garrytan/gstack (MIT License), Mar 17, 2026

Every time Claude presents a question to Ariel — whether during brainstorm, review, or any workflow — it MUST follow this structure:

### The 4-Part Format

1. **Re-ground:** State the project name, the current branch (or task), and what we're working on right now. (1-2 sentences max)
2. **ELI16:** Explain the problem in plain English that a smart 16-year-old could follow. No function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]`
4. **Options:** Lettered options: `A) ... B) ... C) ...`

### Why This Exists

Ariel has ADHD and operates on 20 min/day oversight. When a question appears, he may not have context loaded. The re-grounding step eliminates the "wait, what was I working on?" moment. The ELI16 step prevents the "I don't understand the tradeoff" paralysis. The recommendation gives a default path if he wants to move fast.

### Example

**Bad (no context, jargon-heavy):**
> Should we use STRtree bulk spatial join or per-centroid query against the municipal GIS layer for Palm Bay parcels?

**Good (re-grounded, ELI16, recommended):**
> We're working on **ZoneWise Scraper V4** (branch: `feat/palm-bay-conquest`), adding zoning data for Palm Bay's 78K parcels.
>
> Think of it like looking up zoning for every house in Palm Bay. We can either: batch all 78K lookups into one big request (faster, but if it fails we lose everything), or check each house one at a time against the city's map (slower, but if one fails the others still work).
>
> RECOMMENDATION: Choose A because bulk is 10x faster and we can add retry logic for the rare failure case.
>
> A) Bulk spatial join (fast, one request, needs retry logic)
> B) Per-centroid individual queries (slow, resilient, no retry needed)
> C) Hybrid — bulk first, fall back to individual on failure

### When NOT to Re-ground

- Follow-up questions in the same decision flow (Ariel just answered, context is fresh)
- Simple confirmations ("Ready to deploy? Y/N")
- The question IS the re-grounding ("What should we work on next?")
