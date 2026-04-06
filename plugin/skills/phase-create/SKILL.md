---
name: phase-create
description: "Create a new development phase with directory structure for research, execution, and handoff tracking. Use when the user wants to start a new phase, begin a project milestone, scaffold phase directories, or organize work into structured phases."
---

# Create Phase

Create a new development phase with organized directory structure for research, execution, and handoff tracking.

## Usage

```bash
copilot-memory phase create --title "{{TITLE}}" --goal "{{GOAL}}"
```

## Parameters

- `--title <title>` — Phase title (required)
- `--goal <goal>` — Phase goal or objective
- `--id <id>` — Custom phase ID (optional, auto-generated if omitted)
- `--tags <tag1,tag2>` — Tags

## Example

```bash
copilot-memory phase create --title "Authentication" --goal "Implement OAuth2 with JWT"
```

## What It Creates

- Phase directory at `.copilot-memory-vault/phases/{{PHASE_ID}}/`
- `phase.md` file with frontmatter (title, goal, status, timestamps)
- Subdirectories: `research/`, `execution/`, `handoffs/`
- Sets the phase as active in the tracker

## Verification

Confirm the phase was created:

```bash
ls .copilot-memory-vault/phases/{{PHASE_ID}}/
# Expected: phase.md  research/  execution/  handoffs/
```

## Next Steps

1. Add research: `copilot-memory phase research --title "Findings"`
2. Work on the phase
3. Complete: `copilot-memory phase handoff --title "Phase Complete"`
