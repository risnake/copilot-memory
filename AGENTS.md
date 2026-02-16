# AGENTS.md

This repository supports GitHub Copilot coding agents and Copilot CLI workflows.

## Preferred workflow

1. Initialize vault if needed: `copilot-memory init`
2. Set deterministic tracking state:
   - `copilot-memory vault tracker --phase <phase-id>`
   - `copilot-memory vault tracker --session <session-id>`
3. Use phase workflows:
   - `copilot-memory phase create --title "<title>" --goal "<goal>"`
   - `copilot-memory phase research --title "<title>"` (uses tracked phase if set)
   - `copilot-memory phase handoff --title "<title>"` (uses tracked phase if set)
4. Resume safely: `copilot-memory resume`

## Deterministic state

`copilot-memory vault tracker` stores state in:

- `.copilot-memory-vault/indexes/tracker-state.json`

This is intended to reduce reliance on model memory.

## Copilot CLI hooks (example)

Use hooks to keep state synchronized:

```bash
copilot-memory vault tracker --phase "$COPILOT_PHASE_ID"
copilot-memory vault tracker --session "$COPILOT_SESSION_ID"
```
