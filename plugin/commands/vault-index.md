# Vault Index Command

Regenerate all vault indexes for quick access and navigation.

## Usage

```bash
copilot-memory vault index
```

## What it does

Regenerates three key indexes:

1. **Catalog** (`indexes/catalog.md`): Complete inventory of all notes by type
2. **Phase Summary** (`indexes/phase-summary.md`): Overview of phases by status
3. **Latest Handoff** (`indexes/latest-handoff.md`): Pointer to most recent handoff

## When to use

- After bulk vault operations
- When indexes are out of sync
- After importing external notes
- As part of regular maintenance

## Example

```bash
$ copilot-memory vault index
✓ Indexes regenerated
  Catalog: ✓
  Phase Summary: ✓
  Latest Handoff: ✓
```

Indexes use Obsidian-compatible wikilink format.
