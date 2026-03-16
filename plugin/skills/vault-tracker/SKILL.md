---
name: vault-tracker
description: Show or update deterministic project tracking state for active phase, session, and handoff
---

# Deterministic Tracker

Show or update deterministic project tracking state stored in `indexes/tracker-state.json`.

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

## Why Use This

- Avoids relying on LLM memory for current phase/session
- Lets `phase research` and `phase handoff` run without `--phase` when active phase is set
- Provides a deterministic state file for scripting and hooks

## Examples

```bash
# Check current state
$ copilot-memory vault tracker
Tracker:
  Active phase: auth-001
  Session: session-abc
  Latest handoff: handoff-xyz

# Set active phase for subsequent commands
copilot-memory vault tracker --phase auth-001

# Use with environment variables in hooks
copilot-memory vault tracker --phase "$COPILOT_PHASE_ID"
copilot-memory vault tracker --session "$COPILOT_SESSION_ID"
```
