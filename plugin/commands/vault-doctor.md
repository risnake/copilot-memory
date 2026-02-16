---
name: vault-doctor
description: Run health checks on the vault structure and notes
---

# Vault Doctor Command

Run health checks on the vault structure and notes.

## Usage

```bash
copilot-memory vault doctor [--fix]
```

## Parameters

- `--fix`: Attempt automatic fixes

## What it checks

1. **Folders**: Required directories exist
2. **Indexes**: Index files are valid
3. **Frontmatter**: Note metadata is complete

## Examples

```bash
# Check vault health
$ copilot-memory vault doctor
✓ Vault is healthy

Diagnostics:
  Folders: ✓ All required folders exist
  Indexes: ✓ 0 issues
  Frontmatter: ✓ 50 checked, 0 invalid
```

With issues:

```bash
$ copilot-memory vault doctor
✗ Issues found

Diagnostics:
  Folders: ✗ Missing: templates
  Indexes: ✗ 1 issues
  Frontmatter: ✗ 2 invalid

# Attempt fixes
$ copilot-memory vault doctor --fix
✓ Auto-fix attempted. Run doctor again to verify.
```

The `--fix` flag creates missing folders. Use `vault index` for index issues.
