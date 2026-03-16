---
name: handoff
description: Create a handoff note to capture work state and enable smooth session transitions
---

# Create Handoff

Create a handoff note to capture work state and enable smooth session transitions.

## Usage

```bash
copilot-memory handoff --title "{{TITLE}}" [options]
```

## Parameters

- `--title <title>` — Handoff title (required)
- `--content <text>` — Handoff content
- `--stdin` — Read content from stdin
- `--session <id>` — Session ID
- `--phase <id>` — Phase ID
- `--tags <tag1,tag2>` — Tags

## Examples

```bash
# Basic handoff
copilot-memory handoff --title "Sprint Complete" --content "## Done\n- Auth module"

# From stdin
echo "## Progress\nCompleted auth" | copilot-memory handoff --stdin --title "Auth Complete"

# With phase context
copilot-memory handoff --title "Feature Done" --phase auth-001 --tags "auth,complete"
```

## Behavior

Creates a handoff note in the vault and updates the `indexes/latest-handoff.md` pointer. Each handoff automatically links to the previous handoff for continuity.
