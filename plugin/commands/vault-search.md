# Vault Search Command

Search for content across all vault notes.

## Usage

```bash
copilot-memory vault search "{{QUERY}}" [options]
```

## Parameters

- `query`: Search query (required)
- `--case`: Case-sensitive search
- `--dir <path>`: Search specific directory

## Examples

```bash
# Basic search
copilot-memory vault search "authentication"

# Case-sensitive
copilot-memory vault search "OAuth2" --case

# Search in specific directory
copilot-memory vault search "TODO" --dir .copilot-memory-vault/phases
```

## Output

Returns matching notes with file path, match count, and context preview:

```bash
$ copilot-memory vault search "JWT"
✓ Found 3 matches

Results:
  phases/auth-001/research/20240115-120000Z--research--phase--jwt.md
    ...use JWT tokens for stateless authentication...
  handoffs/2024/01/20240115-130000Z--handoff--session--auth-complete.md
    ...implemented JWT middleware...
```
