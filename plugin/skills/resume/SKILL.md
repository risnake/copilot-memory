---
name: resume
description: "Resume from the latest handoff note to restore work context and outstanding tasks at the start of a session. Use when the user wants to continue previous work, pick up where they left off, restore session context, or start a new work session."
---

# Resume from Latest Handoff

Resume from the latest handoff note to restore context and outstanding tasks.

## Usage

```bash
copilot-memory resume
```

## What It Does

1. Finds the most recent handoff note
2. Displays its content for context
3. Creates a new session linked to that handoff
4. Updates the tracker with the new session

## Example

```bash
$ copilot-memory resume
Found latest handoff: Sprint 1 Complete (2024-01-15)

## Completed
- User authentication
- Database setup

## Next Steps
- API endpoints
- Testing suite
```

## No Handoff Found

If no handoff note exists, the command exits with a message indicating no handoffs are available. Create one first with `copilot-memory handoff`.

## When to Use

Run this at the start of each work session to quickly restore context from where you left off. The sessionStart hook runs this automatically if configured.
