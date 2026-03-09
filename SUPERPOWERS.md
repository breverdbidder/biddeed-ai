# Superpowers Integration Directives
## Copy-paste these sections into your CLAUDE.md files

---

## Verification Before Completion (Superpowers)

IRON LAW: No completion claims without fresh verification evidence.

Before marking ANY task `[x]` in TODO.md or claiming work is done:

1. **IDENTIFY**: What command proves this works?
2. **RUN**: Execute the command (fresh, complete — not a cached result)
3. **READ**: Full output, check exit code, count failures
4. **VERIFY**: Does output confirm the claim?
5. **ONLY THEN**: Mark complete or claim success

**RED FLAGS** — if you catch yourself writing any of these, STOP:
- "should work now"
- "probably fine"
- "looks correct"
- "I'm confident this fixes it"
- Any positive claim without showing command output

These words mean you haven't verified. Run the command first.

---

## Systematic Debugging Protocol (Superpowers)

IRON LAW: No fixes without root cause investigation first.

### Phase 1: Root Cause Investigation (BEFORE any fix attempt)
- Read error messages completely (stack traces, line numbers, error codes)
- Reproduce the issue consistently
- Check recent changes (git diff, new dependencies, config changes)
- For multi-component systems: add diagnostic logging at EACH component boundary, run once, analyze WHERE it breaks

### Phase 2: Pattern Analysis
- Find working examples of similar code in the codebase
- Compare working vs broken — list EVERY difference
- Don't assume "that can't matter"

### Phase 3: Hypothesis Testing
- State clearly: "I think X is the root cause because Y"
- Make the SMALLEST possible change to test
- One variable at a time — never fix multiple things at once

### Phase 4: Implementation
- Create failing test case reproducing the bug
- Implement single fix addressing root cause
- Verify fix AND verify no regressions

### CIRCUIT BREAKER
After 3 failed fix attempts: **STOP**. Question the architecture.
- Each fix revealing new problems in different places = architectural issue
- Don't attempt fix #4 without discussing the approach
- This is NOT a failed hypothesis — this is a wrong architecture

---

## Code Review Gate (Superpowers)

Before pushing significant changes to main:

1. Get git SHAs:
   ```bash
   BASE_SHA=$(git merge-base HEAD origin/main)
   HEAD_SHA=$(git rev-parse HEAD)
   ```

2. Review the diff for:
   - **Code Quality**: Clean separation, error handling, DRY, edge cases
   - **Testing**: Tests verify real behavior (not mock behavior), edge cases covered
   - **Requirements**: All requirements met, no scope creep
   - **Production Readiness**: No obvious bugs, breaking changes documented

3. Categorize issues:
   - **Critical** (must fix): bugs, security issues, data loss risks
   - **Important** (should fix): architecture problems, missing features, test gaps
   - **Minor** (note for later): style, optimization, documentation

4. Fix Critical and Important before pushing. Never skip because "it's simple."

---

## Testing Anti-Patterns (Superpowers)

### Gate Functions — ask BEFORE writing tests:

**Before asserting on any mock element:**
> "Am I testing real component behavior or just mock existence?"
> If testing mock existence → DELETE the assertion or unmock the component

**Before adding any method to a production class:**
> "Is this method only used by tests?"
> If yes → Move to test utilities, not production code

**Before mocking any method:**
> "What side effects does the real method have? Does this test depend on them?"
> If test depends on side effects → Mock at a lower level, preserve the behavior

**Before creating mock responses:**
> "Does this mock include ALL fields the real API returns?"
> Partial mocks hide structural assumptions → Mirror real API completely

### TDD Scope:
- **MANDATORY**: Financial calculations (lien priority, max bid, ML pipeline scores)
- **MANDATORY**: Data integrity code (auction data parsing, bid/judgment ratios)
- **RECOMMENDED**: API integrations, data transformations
- **OPTIONAL**: Scrapers, deployment scripts, UI components, one-off automation

---

## YAGNI Gate Function (Superpowers)

Before implementing any "improvement", "proper implementation", or feature suggestion:

1. `grep` the codebase for actual usage of the feature/endpoint
2. If **unused** → Remove it (YAGNI). Don't build what nobody calls.
3. If **used** → Then implement properly

This applies to:
- Code review suggestions ("implement proper X")
- Refactoring ideas ("add configurable Y")
- "Nice to have" features
- "Professional" patterns nobody uses
