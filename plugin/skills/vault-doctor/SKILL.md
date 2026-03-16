---
name: vault-doctor
description: Run health checks on the vault structure and notes to detect and fix issues
---

# Vault Health Check

Run health checks on the vault structure and notes.

## Usage

```bash
copilot-memory vault doctor [--fix]
```

## Parameters

- `--fix` — Attempt automatic fixes (creates missing folders)

## What It Checks

1. **Folders** — Required directories exist
2. **Indexes** — Index files are valid and up-to-date
3. **Frontmatter** — Note metadata is complete (samples up to 50 files)

## Examples

```bash
# Check vault health
$ copilot-memory vault doctor
Vault is healthy

Diagnostics:
  Folders: All required folders exist
  Indexes: 0 issues
  Frontmatter: 50 checked, 0 invalid

# Auto-fix issues
$ copilot-memory vault doctor --fix
Auto-fix attempted. Run doctor again to verify.
```

## When to Use

- After vault errors or unexpected behavior
- As part of periodic maintenance
- After manual edits to vault files
