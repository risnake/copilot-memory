# Copilot Memory

A memory management system for GitHub Copilot CLI using Obsidian-compatible Markdown. Enables persistent context across work sessions through handoffs, phases, and structured note-taking.

## Features

- 📝 **Handoff Management**: Create handoff notes to capture work state and transition smoothly between sessions
- 🔄 **Continuous Resume**: Automatically resume from the latest handoff
- 📊 **Phase Organization**: Structure work into phases with research, execution, and handoff tracking
- 🔍 **Content Search**: Full-text search across all vault notes
- 🏥 **Health Checks**: Validate vault structure and note integrity
- 🧹 **Pruning**: Clean up old notes to keep the vault manageable
- 🔗 **Obsidian Compatible**: Use Obsidian or any Markdown editor alongside the CLI
- 📦 **Minimal Dependencies**: Zero runtime dependencies, built on Node.js stdlib

## Installation

### As a Local Tool

```bash
# Clone the repository
git clone https://github.com/yourusername/copilot-memory.git
cd copilot-memory

# Install globally
npm install -g .

# Or use locally without installation
npm link
```

### As a Copilot Plugin

```bash
# Install the plugin
copilot plugin install /path/to/copilot-memory/plugin

# Use commands
copilot copilot-memory init
copilot copilot-memory handoff --title "Work Complete"
copilot copilot-memory resume
copilot copilot-memory phase create --title "Auth"
copilot copilot-memory vault search "bug"
```

## Quick Start

```bash
# Initialize vault
copilot-memory init

# Create a handoff note
copilot-memory handoff --title "Feature Complete" --content "## Progress
- Implemented authentication
- Added tests

## Next Steps
- Deploy to staging"

# Resume from latest handoff
copilot-memory resume

# Create a phase
copilot-memory phase create --title "Authentication" --goal "Implement OAuth2 with JWT"

# Add research to phase
copilot-memory phase research --phase <phase-id> --title "OAuth2 Best Practices" --stdin < research.md

# Complete a phase
copilot-memory phase handoff --phase <phase-id> --title "Auth Complete"

# Search vault
copilot-memory vault search "authentication"

# Check vault health
copilot-memory vault doctor

# Regenerate indexes
copilot-memory vault index

# Clean up old notes
copilot-memory vault prune --days 90 --dry-run
```

### Command Syntax

Commands use a simple, flat structure:

**Core Commands:**
- `copilot-memory init` - Initialize vault
- `copilot-memory handoff` - Create handoff note
- `copilot-memory resume` - Resume from latest handoff
- `copilot-memory help` - Show command help

**Phase Commands:**
- `copilot-memory phase create` - Create new phase
- `copilot-memory phase research` - Add research to phase
- `copilot-memory phase handoff` - Complete phase

**Vault Commands:**
- `copilot-memory vault index` - Regenerate indexes
- `copilot-memory vault search` - Search content
- `copilot-memory vault doctor` - Run health checks
- `copilot-memory vault prune` - Prune old notes

## Vault Structure

The vault follows a standardized directory structure:

```
.copilot-memory-vault/
├── handoffs/
│   └── YYYY/
│       └── MM/
│           └── YYYYMMDD-HHmmssZ--handoff--session--slug.md
├── sessions/
│   └── YYYY/
│       └── MM/
│           └── YYYYMMDD-HHmmssZ--session--session--slug.md
├── phases/
│   └── <phase-id>/
│       ├── phase.md
│       ├── research/
│       │   └── YYYYMMDD-HHmmssZ--research--phase--slug.md
│       ├── execution/
│       └── handoffs/
│           └── YYYYMMDD-HHmmssZ--handoff--phase--slug.md
├── indexes/
│   ├── latest-handoff.md  # Wikilink pointer to newest handoff
│   ├── catalog.md
│   └── phase-summary.md
└── templates/
```

### Filename Convention

All notes follow the **exact** format: `YYYYMMDD-HHmmssZ--<type>--<scope>--<slug>.md`

Examples:
- `20240115-143000Z--handoff--session--sprint-complete.md`
- `20240115-150000Z--research--phase--oauth2-investigation.md`
- `20240116-091500Z--handoff--phase--feature-complete.md`

### Handoff Linking

Each handoff automatically:
- Links to the previous handoff in frontmatter (`previous_handoff` field)
- Includes a wikilink to the previous handoff in content
- Updates `indexes/latest-handoff.md` with a wikilink pointer to itself

## Frontmatter

Every note includes YAML frontmatter with required fields:

```yaml
---
id: uuid-here
type: handoff
created_at: 2024-01-15T14:30:00.000Z
updated_at: 2024-01-15T14:30:00.000Z
session_id: session-uuid
phase_id: null
status: active
tags:
  - handoff
  - sprint
links: []
title: Sprint Complete
---
```

## Commands

### Core Commands

#### `init`
Initialize a new vault.

```bash
copilot-memory init
copilot-memory init ~/my-vault
```

#### `handoff`
Create a handoff note.

```bash
copilot-memory handoff --title "Work Complete" --content "Summary"
echo "Content" | copilot-memory handoff --stdin --title "From stdin"
```

**Options:**
- `--title <title>`: Handoff title
- `--content <text>`: Handoff content
- `--stdin`: Read content from stdin
- `--session <id>`: Session ID
- `--phase <id>`: Phase ID
- `--tags <tag1,tag2>`: Tags

#### `resume`
Resume from the latest handoff.

```bash
copilot-memory resume
```

### Phase Commands

#### `phase create`
Create a new phase.

```bash
copilot-memory phase create \
  --title "Authentication" \
  --goal "Implement OAuth2 authentication with JWT tokens"
```

**Options:**
- `--title <title>`: Phase title
- `--goal <goal>`: Phase goal
- `--id <id>`: Custom phase ID (optional)
- `--tags <tags>`: Tags

#### `phase research`
Create a research note for a phase.

```bash
copilot-memory phase research \
  --phase <phase-id> \
  --title "OAuth2 Investigation" \
  --content "Research findings..."
```

**Options:**
- `--phase <id>`: Phase ID (required)
- `--title <title>`: Research title
- `--content <text>`: Content
- `--stdin`: Read from stdin
- `--tags <tags>`: Tags

#### `phase handoff`
Create a handoff note for a phase.

```bash
copilot-memory phase handoff \
  --phase <phase-id> \
  --title "Phase Complete" \
  --content "Summary of completed work"
```

**Options:**
- `--phase <id>`: Phase ID (required)
- `--title <title>`: Handoff title
- `--session <id>`: Session ID
- `--content <text>`: Content
- `--stdin`: Read from stdin
- `--tags <tags>`: Tags

### Vault Commands

#### `vault index`
Regenerate vault indexes.

```bash
copilot-memory vault index
```

Regenerates:
- `indexes/catalog.md`: Complete note inventory
- `indexes/phase-summary.md`: Phase overview
- `indexes/latest-handoff.md`: Latest handoff wikilink pointer

#### `vault search`
Search vault content.

```bash
copilot-memory vault search "authentication"
copilot-memory vault search "TODO" --case
copilot-memory vault search "bug" --dir .copilot-memory-vault/phases
```

**Options:**
- `--case`: Case-sensitive search
- `--dir <path>`: Search specific directory

#### `vault doctor`
Run vault health checks.

```bash
copilot-memory vault doctor
copilot-memory vault doctor --fix
```

Checks:
- Required folders exist
- Index files are valid
- Frontmatter is complete

**Options:**
- `--fix`: Attempt auto-fix (creates missing folders)

#### `vault prune`
Prune old notes.

```bash
# Preview (dry run)
copilot-memory vault prune --days 60 --dry-run

# Actually delete
copilot-memory vault prune --days 90

# Prune research notes
copilot-memory vault prune --research --days 120

# Prune specific phase research
copilot-memory vault prune --research --phase <phase-id> --days 90
```

**Options:**
- `--days <n>`: Age threshold (default: 30)
- `--dry-run`: Preview without deleting
- `--research`: Prune research notes
- `--phase <id>`: Target specific phase

### Help Command

#### `help`
Show help for commands.

```bash
copilot-memory help
copilot-memory help handoff
copilot-memory help phase
```

## Configuration

### Vault Path

The vault path is resolved in the following priority order:

1. **Command line option**: `--vault /path/to/vault`
2. **Environment variable**: `COPILOT_MEMORY_VAULT`
3. **Config file**: `.copilot-memory/config.json` in current directory
4. **Default**: `.copilot-memory-vault` in current directory

### Configuration File

Create `.copilot-memory/config.json` in your project root:

```json
{
  "vaultPath": "/custom/vault/path",
  "notesmdPath": "notesmd-cli",
  "useNotesmd": true
}
```

### Environment Variables

```bash
# Set vault path
export COPILOT_MEMORY_VAULT=/path/to/vault

# Set notesmd path (if not in PATH)
export COPILOT_MEMORY_NOTESMD_PATH=/path/to/notesmd

# Use commands
copilot-memory handoff --title "Test"
```

### NotesMD CLI Integration

The system uses `notesmd-cli` as the primary adapter with automatic filesystem fallback:

- **Create/Read operations**: Attempts notesmd-cli first (using `create` and `print` commands), falls back to filesystem with warning
- **Update operations**: Always uses filesystem (notesmd-cli does not support reliable update)
- **List operations**: Attempts notesmd-cli for basic listing, falls back to filesystem for recursive/pattern filtering
- **Search operations**: Attempts notesmd-cli `search-content` command, falls back to filesystem with warning
- **Automatic detection**: Checks for notesmd-cli availability on first use
- **Explicit warnings**: Clear messages when falling back to filesystem
- **Zero-dependency fallback**: Always works even without notesmd-cli installed

To disable notesmd integration, set in config.json:
```json
{
  "useNotesmd": false
}
```

## Obsidian Integration

The vault is fully compatible with Obsidian:

1. Open Obsidian
2. "Open folder as vault"
3. Select `.copilot-memory-vault`

Features that work in Obsidian:
- Wikilinks (`[[note-name]]`)
- YAML frontmatter
- Tags
- Graph view
- Search
- Daily notes

## Development

### Running Tests

```bash
npm test
```

Tests cover:
- Handoff → resume flow
- Phase create → research → handoff
- Index generation
- Doctor diagnostics
- Prune dry-run and execution

### Project Structure

```
copilot-memory/
├── bin/
│   └── copilot-memory.js        # CLI entry point
├── src/
│   ├── config.js                # Configuration management
│   ├── adapters/
│   │   ├── filesystem.js        # Direct filesystem operations
│   │   └── notesmd.js           # NotesMD CLI wrapper
│   ├── services/
│   │   ├── vault.js             # Vault operations
│   │   ├── index.js             # Index generation
│   │   ├── doctor.js            # Health checks
│   │   └── prune.js             # Note pruning
│   ├── commands/
│   │   ├── handoff.js           # Handoff commands
│   │   ├── phase.js             # Phase commands
│   │   ├── memory.js            # Memory commands
│   │   └── registry.js          # Command registry
│   └── utils/
│       └── frontmatter.js       # Frontmatter utilities
├── plugin/                       # Copilot plugin commands
│   ├── handoff.md
│   ├── continuous-resume.md
│   └── ...
├── .github/plugin/
│   ├── plugin.json              # Plugin metadata
│   └── marketplace.json         # Marketplace metadata
├── test/
│   └── integration.test.js      # Integration tests
└── package.json
```

## Use Cases

### Daily Development Workflow

```bash
# Start of day: resume from yesterday
copilot-memory resume

# During work: capture progress
copilot-memory handoff --title "Auth module complete" --stdin < notes.txt

# End of day: final handoff
copilot-memory handoff --title "EOD - Auth testing" --content "..."
```

### Phase-Based Development

```bash
# Start new phase
PHASE_ID=$(copilot-memory phase create --title "User Management" --goal "CRUD for users" | grep ID | awk '{print $2}')

# Research
copilot-memory phase research --phase $PHASE_ID --title "User schema design" --stdin < design.md

# More research
copilot-memory phase research --phase $PHASE_ID --title "Security considerations" --stdin < security.md

# Complete phase
copilot-memory phase handoff --phase $PHASE_ID --title "User Management Complete" --stdin < summary.md
```

### Knowledge Management

```bash
# Search for past decisions
copilot-memory vault search "architecture decision"

# Review phase history
cat .copilot-memory-vault/indexes/phase-summary.md

# Check vault health monthly
copilot-memory vault doctor

# Clean up quarterly
copilot-memory vault prune --days 90 --dry-run
copilot-memory vault prune --days 90
```

## Tips & Best Practices

1. **Regular Handoffs**: Create handoffs at natural breakpoints (end of task, day, sprint)
2. **Descriptive Titles**: Use clear titles for easy searching later
3. **Tag Consistently**: Use consistent tags for better organization
4. **Phase Discipline**: Keep phase scope focused and manageable
5. **Search Often**: Your past notes are valuable - search them!
6. **Prune Periodically**: Keep vault size manageable with regular pruning
7. **Obsidian Sync**: Use Obsidian alongside CLI for rich viewing/editing
8. **Backup**: Vault is just markdown - version control it!

## Troubleshooting

### Vault not found

```bash
# Check current vault path
copilot-memory status

# Set explicit vault path
export COPILOT_MEMORY_VAULT=/path/to/vault
```

### Index out of sync

```bash
# Regenerate all indexes
copilot-memory vault index
```

### Missing folders

```bash
# Run doctor with auto-fix
copilot-memory vault doctor --fix
```

### notesmd-cli not found

The system automatically falls back to filesystem operations. To explicitly disable notesmd:

```bash
# Set in config or it will auto-detect
```

## Contributing

Contributions welcome! The codebase is intentionally minimal with zero runtime dependencies.

## License

MIT

## Acknowledgments

- Inspired by Obsidian's markdown-based knowledge management
- Built for seamless integration with GitHub Copilot CLI
- Designed for developer workflows and context persistence
