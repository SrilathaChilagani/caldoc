# Project Instructions

## Memory Bank Protocol (MANDATORY)

This project uses a shared **`memory-bank/`** directory as persistent memory across
sessions and across agents (Claude Code and Gemini via Roo Code both read/write it).
Treat it as the source of truth. Follow this protocol on **every** task.

### 🛑 STOP — READ-FIRST GATE (do this before anything else)
If you have not, in **this** task, read every file in `memory-bank/`, then STOP.
Do NOT produce any plan, design, interface, or code until you have read them all.
Your first actions in any task must be the reads below. When you start producing output,
briefly confirm you've read the memory-bank and state the current architectural direction
(e.g. the latest Accepted ADR). Do not infer the project from the task title — the
memory-bank overrides assumptions.

### At the START of every task
1. Read ALL files in `memory-bank/` before doing anything else:
   - `productContext.md` — philosophy, telehealth domain & roles, integrations
   - `systemPatterns.md` — stack, security guidelines, API schemas
   - `architecturalDecisions.md` — ADR log (why DB/queue/isolation choices were made)
   - `activeContext.md` — what's being worked on right now (the live handoff channel)
   - `progress.md` — what works, what's broken, what's next
2. Treat their contents as authoritative. Do NOT contradict recorded decisions
   without explicitly proposing a new ADR in `architecturalDecisions.md`.
3. If a placeholder (`_<...>_`) is relevant to the task and still unfilled, ask the
   user rather than guessing.

### DURING the task
- Keep `activeContext.md` current: what you're doing, files touched, assumptions made,
  and the next concrete step. This is how the other agent picks up where you left off.

### At the END of every task
1. Update `activeContext.md`:
   - Set Current Focus / Next Action to reflect the new state.
   - Clear stale notes from the previous task.
2. Update `progress.md`:
   - Move finished items to ✅ Done / Working.
   - Record anything newly broken under 🐞.
   - Add/reorder 📋 Next Up.
   - Update the `Last updated` line with the date and `Claude Code`.
3. If you made a significant architectural/tech choice, append an ADR to
   `architecturalDecisions.md` (don't rewrite old ones — supersede them).
4. If product rules or integrations changed, update `productContext.md`.
   If stack/conventions/security/API contracts changed, update `systemPatterns.md`.

### Rules
- One writer at a time per file — read immediately before writing to avoid clobbering
  the other agent's updates.
- `activeContext.md` is volatile (overwrite freely). The other four are stable —
  edit deliberately.
- Never store secrets, API keys, or real PHI in the memory bank.
