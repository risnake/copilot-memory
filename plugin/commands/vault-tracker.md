# Vault Tracker Command

Show or update deterministic project tracking state.

## Usage

```bash
# Show state
copilot-memory vault tracker

# Set active phase
copilot-memory vault tracker --phase "{{PHASE_ID}}"

# Clear active phase
copilot-memory vault tracker --clear-phase

# Set session
copilot-memory vault tracker --session "{{SESSION_ID}}"
```

## Why use this

- Avoids relying on LLM memory for current phase/session
- Lets phase research/handoff run without `--phase` when active phase is set
- Provides a deterministic state file at `indexes/tracker-state.json`

## Hook-friendly examples

```bash
copilot-memory vault tracker --phase "$COPILOT_PHASE_ID"
copilot-memory vault tracker --session "$COPILOT_SESSION_ID"
```
