---
name: phase-handoff
description: Complete or pause a phase with a summary handoff note
---

# Phase Handoff

Complete or pause a phase with a summary handoff note.

## Usage

```bash
copilot-memory phase handoff [--phase {{PHASE_ID}}] --title "{{TITLE}}" [options]
```

## Parameters

- `--phase <id>` — Phase ID (optional when active phase is set via `vault tracker`)
- `--title <title>` — Handoff title
- `--content <text>` — Handoff content
- `--stdin` — Read from stdin
- `--session <id>` — Session ID
- `--tags <tag1,tag2>` — Tags

## Examples

```bash
# Basic phase handoff
copilot-memory phase handoff --phase abc123 --title "Phase Complete" --content "## Summary..."

# From stdin (uses active phase from tracker)
echo "## Done\n- OAuth2\n- Tests" | copilot-memory phase handoff --stdin --title "Auth Done"
```

## Behavior

The handoff is stored in `.copilot-memory-vault/phases/{{PHASE_ID}}/handoffs/` and updates the `indexes/latest-handoff.md` pointer.
