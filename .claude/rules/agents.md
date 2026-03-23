---
pattern: "src/agents/**"
---
# Agent Rules (loaded only when editing agent files)

- MAX 4-5 tools per agent. If more needed → decompose into subagents
- Every agent MUST have circuit breaker: 3 failures → escalate, never infinite retry
- State persistence via Supabase checkpoints, never in-memory only
- Tool descriptions: specify BOTH when to use AND when NOT to use each tool
- stop_reason is the ONLY signal for loop termination. Never parse text for "done"
- Subagents get broad goals, not narrow checklists — let them decompose
- Error propagation: what broke + what tried + partial results + next options
- LangGraph state must include: task_id, attempt_count, partial_results, error_chain
