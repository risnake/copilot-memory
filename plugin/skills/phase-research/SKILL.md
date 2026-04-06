---
name: phase-research
description: "Add structured research notes, findings, and references to a development phase. Use when the user wants to attach research, document findings, record investigation results, or save reference material for a specific project phase."
---

# Add Phase Research

Add research notes, findings, and references to a development phase for documentation during work.

## Usage

```bash
copilot-memory phase research [--phase {{PHASE_ID}}] --title "{{TITLE}}" [options]
```

## Parameters

- `--phase <id>` — Phase ID (optional when active phase is set via `vault tracker`)
- `--title <title>` — Research title
- `--content <text>` — Research content
- `--stdin` — Read from stdin
- `--tags <tag1,tag2>` — Tags

## Examples

```bash
# With content
copilot-memory phase research --phase abc123 --title "OAuth2 patterns" --content "## Findings..."

# From stdin (uses active phase from tracker)
echo "## JWT Best Practices..." | copilot-memory phase research --stdin --title "JWT Study"
```

## Behavior

Research notes are stored in `.copilot-memory-vault/phases/{{PHASE_ID}}/research/` with timestamped filenames. If no `--phase` is specified, the active phase from `vault tracker` is used.
