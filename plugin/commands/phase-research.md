---
name: phase-research
description: Add research notes to a phase for documentation and reference
---

# Phase Research Command

Add research notes to a phase for documentation and reference.

## Usage

```bash
copilot-memory phase research [--phase {{PHASE_ID}}] --title "{{TITLE}}" [options]
```

## Parameters

- `--phase <id>`: Phase ID (optional when active phase is set via `vault tracker`)
- `--title <title>`: Research title
- `--content <text>`: Research content
- `--stdin`: Read from stdin
- `--tags <tag1,tag2>`: Tags

## Examples

```bash
# With content
copilot-memory phase research --phase abc123 --title "OAuth2 patterns" --content "## Findings..."

# From stdin
echo "## JWT Best Practices..." | copilot-memory phase research --phase abc123 --stdin --title "JWT Study"
```

Research notes are stored in `.copilot-memory-vault/phases/{{PHASE_ID}}/research/` with timestamped filenames.
