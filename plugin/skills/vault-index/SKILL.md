---
name: vault-index
description: Regenerate all vault indexes for quick access and navigation
---

# Regenerate Vault Indexes

Regenerate all vault indexes for quick access and navigation.

## Usage

```bash
copilot-memory vault index
```

## What It Regenerates

1. **Catalog** (`indexes/catalog.md`) — Complete inventory of all notes by type
2. **Phase Summary** (`indexes/phase-summary.md`) — Overview of phases by status
3. **Latest Handoff** (`indexes/latest-handoff.md`) — Pointer to most recent handoff

## When to Use

- After bulk vault operations
- When indexes are out of sync
- After importing external notes
- As part of regular maintenance

## Example

```bash
$ copilot-memory vault index
Indexes regenerated
  Catalog: done
  Phase Summary: done
  Latest Handoff: done
```
