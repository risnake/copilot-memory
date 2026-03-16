# AGENTS.md

This repository supports GitHub Copilot coding agents and Copilot CLI workflows.

## Plugin Installation

Install as a Copilot CLI plugin:

```bash
# From local path
copilot plugin install ./plugin

# From GitHub repository
copilot plugin install OWNER/copilot-memory
```

## Automatic Hooks

The plugin includes lifecycle hooks that run automatically:

- **sessionStart**: Runs `copilot-memory resume` to restore context from the latest handoff
- **sessionEnd**: Runs `copilot-memory handoff` to auto-capture session context

## Available Skills

The plugin provides 11 skills that Copilot loads when relevant:

| Skill | Purpose |
|-------|---------|
| `init` | Initialize vault or onboard a project |
| `handoff` | Create a handoff note |
| `resume` | Resume from latest handoff |
| `phase-create` | Create a new phase |
| `phase-research` | Add research to a phase |
| `phase-handoff` | Complete a phase |
| `vault-index` | Regenerate indexes |
| `vault-search` | Search vault content |
| `vault-doctor` | Run health checks |
| `vault-prune` | Prune old notes |
| `vault-tracker` | Deterministic project state |

## Preferred Workflow

1. Initialize vault if needed: `copilot-memory init`
2. Set deterministic tracking state:
   - `copilot-memory vault tracker --phase <phase-id>`
   - `copilot-memory vault tracker --session <session-id>`
3. Use phase workflows:
   - `copilot-memory phase create --title "<title>" --goal "<goal>"`
   - `copilot-memory phase research --title "<title>"` (uses tracked phase if set)
   - `copilot-memory phase handoff --title "<title>"` (uses tracked phase if set)
4. Resume safely: `copilot-memory resume`

## Deterministic State

`copilot-memory vault tracker` stores state in:

- `.copilot-memory-vault/indexes/tracker-state.json`

This is intended to reduce reliance on model memory.

## Copilot CLI Hooks (manual setup)

If not using the plugin, you can add hooks manually to keep state synchronized:

```bash
copilot-memory vault tracker --phase "$COPILOT_PHASE_ID"
copilot-memory vault tracker --session "$COPILOT_SESSION_ID"
```
