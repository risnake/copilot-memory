---
name: init
description: Initialize a vault or start a new project with onboarding
---

# Init Command

Initialize a vault or start a new project with onboarding.

## Usage

```bash
# Bootstrap vault only (creates vault structure)
copilot-memory init [--vault <path>]

# Greenfield mode (new project from scratch)
copilot-memory init --mode greenfield [options]

# Brownfield mode (analyze existing codebase)
copilot-memory init --mode brownfield [--path <codebase-path>]
```

## Options

**Global:**
- `--vault <path>` — Vault location (default: `.copilot-memory-vault`, or set via `COPILOT_MEMORY_VAULT` env var)

**Greenfield Mode:**
- `--mode greenfield` — Start new project onboarding
- `--idea <text>` — Project idea/goal (or use `--title`)
- `--stack <techs>` — Tech stack (comma-separated)
- `--constraints <text>` — Requirements/constraints
- `--research <questions>` — Research questions (comma-separated)
- `--session <id>` — Session ID (auto-generated if omitted)
- `--tags <tags>` — Additional tags (comma-separated)

**Brownfield Mode:**
- `--mode brownfield` — Analyze existing codebase
- `--path <path>` — Codebase path to analyze (default: current directory)
- `--session <id>` — Session ID (auto-generated if omitted)
- `--tags <tags>` — Additional tags (comma-separated)

## Examples

```bash
# Bootstrap vault only
copilot-memory init
copilot-memory init --vault ~/my-vault

# Greenfield: interactive prompts
copilot-memory init --mode greenfield

# Greenfield: with flags
copilot-memory init --mode greenfield \
  --idea "Task management API" \
  --stack "Node.js,TypeScript,PostgreSQL" \
  --constraints "REST API, JWT auth"

# Brownfield: analyze current directory
copilot-memory init --mode brownfield

# Brownfield: analyze specific path
copilot-memory init --mode brownfield --path ~/my-project
```

## Behavior

**Plain `init`:** Creates vault structure and exits. Use this for vault setup.

**With `--mode greenfield`:** Gathers project requirements (interactively or via flags), generates structured planning note with phases and research questions.

**With `--mode brownfield`:** Analyzes codebase structure, infers tech stack from key files, creates analysis note with exploration tasks.
