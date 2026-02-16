---
name: vault-prune
description: Prune old notes to keep the vault manageable
---

# Vault Prune Command

Prune old notes to keep the vault manageable.

## Usage

```bash
# Preview (dry run)
copilot-memory vault prune --days {{DAYS}} --dry-run

# Actually delete
copilot-memory vault prune --days {{DAYS}}
```

## Parameters

- `--days <n>`: Age threshold in days (default: 30)
- `--dry-run`: Preview without deleting
- `--research`: Prune research notes
- `--phase <id>`: Target specific phase research

## Default Behavior

Prunes handoffs and sessions older than threshold. Does NOT prune:
- Phase definition files
- Index files
- Templates

## Examples

```bash
# Preview pruning (safe)
copilot-memory vault prune --days 60 --dry-run

# Delete notes older than 90 days
copilot-memory vault prune --days 90

# Prune old research notes
copilot-memory vault prune --research --days 120

# Prune specific phase research
copilot-memory vault prune --research --phase abc123 --days 90
```

## Output

```bash
$ copilot-memory vault prune --days 60 --dry-run
✓ Would delete 15 notes older than 60 days

Summary:
  Candidates: 15
  Deleted: 0
  Errors: 0
```

⚠️ **Warning**: Pruning is permanent. Always use `--dry-run` first.
