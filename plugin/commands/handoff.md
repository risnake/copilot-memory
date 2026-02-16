# Handoff Command

Create a handoff note to capture work state and enable smooth session transitions.

## Usage

```bash
copilot-memory handoff --title "{{TITLE}}" [options]
```

## Parameters

- `--title <title>`: Handoff title (required)
- `--content <text>`: Handoff content
- `--stdin`: Read content from stdin
- `--session <id>`: Session ID
- `--phase <id>`: Phase ID
- `--tags <tag1,tag2>`: Tags

## Examples

```bash
# Basic handoff
copilot-memory handoff --title "Sprint Complete" --content "## Done\n- Auth module"

# From stdin
echo "## Progress\nCompleted auth" | copilot-memory handoff --stdin --title "Auth Complete"
```

Creates a handoff note in the vault and updates the latest-handoff index.
