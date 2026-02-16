# Phase Create Command

Create a new phase with organized directory structure.

## Usage

```bash
copilot-memory phase create --title "{{TITLE}}" --goal "{{GOAL}}"
```

## Parameters

- `--title <title>`: Phase title (required)
- `--goal <goal>`: Phase goal or objective
- `--id <id>`: Custom phase ID (optional)
- `--tags <tag1,tag2>`: Tags

## Example

```bash
copilot-memory phase create --title "Authentication" --goal "Implement OAuth2 with JWT"
```

## Creates

- Phase directory at `.copilot-memory-vault/phases/{{PHASE_ID}}/`
- `phase.md` file with frontmatter
- Subdirectories: `research/`, `execution/`, `handoffs/`

## Next Steps

1. Add research: `copilot-memory phase research --phase {{PHASE_ID}}`
2. Work on the phase
3. Complete: `copilot-memory phase handoff --phase {{PHASE_ID}}`
