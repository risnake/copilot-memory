import { randomUUID } from 'crypto';

/**
 * Phase create command
 */
export async function phaseCreateCommand(vault, args, tracker) {
  const phaseId = args.id || randomUUID();
  const title = args.title || 'New Phase';
  const goal = args.goal || '';

  const phase = await vault.createPhase({
    phaseId,
    title,
    goal,
    status: 'planned',
    tags: args.tags || []
  });

  if (tracker) {
    await tracker.setActivePhase(phaseId);
  }

  return {
    success: true,
    message: 'Phase created',
    phase: {
      id: phaseId,
      path: phase.path,
      title
    }
  };
}

/**
 * Phase research command
 */
export async function phaseResearchCommand(vault, args, tracker) {
  const phaseId = tracker
    ? await tracker.resolvePhaseId(args.phaseId || args.phase)
    : (args.phaseId || args.phase);
  const title = args.title || 'Research Notes';
  
  if (!phaseId) {
    return {
      success: false,
      message: 'Phase ID is required (pass --phase or set active phase with "copilot-memory vault tracker --phase <id>")'
    };
  }

  let content = args.content || '';
  
  // If reading from stdin
  if (args.stdin) {
    const { stdin } = await import('process');
    const chunks = [];
    for await (const chunk of stdin) {
      chunks.push(chunk);
    }
    content = Buffer.concat(chunks).toString('utf-8');
  }

  if (!content) {
    content = `# ${title}\n\n## Findings\n\n[Add research findings]\n\n## References\n\n`;
  }

  const note = await vault.createPhaseResearch({
    phaseId,
    title,
    content,
    tags: args.tags || []
  });

  return {
    success: true,
    message: 'Research note created',
    note: {
      path: note.path,
      id: note.frontmatter.id,
      phaseId
    }
  };
}

/**
 * Phase handoff command
 */
export async function phaseHandoffCommand(vault, args, tracker) {
  const phaseId = tracker
    ? await tracker.resolvePhaseId(args.phaseId || args.phase)
    : (args.phaseId || args.phase);
  const sessionId = args.sessionId || args.session;
  const title = args.title || 'Phase Handoff';

  if (!phaseId) {
    return {
      success: false,
      message: 'Phase ID is required (pass --phase or set active phase with "copilot-memory vault tracker --phase <id>")'
    };
  }

  let content = args.content || '';
  
  if (args.stdin) {
    const { stdin } = await import('process');
    const chunks = [];
    for await (const chunk of stdin) {
      chunks.push(chunk);
    }
    content = Buffer.concat(chunks).toString('utf-8');
  }

  if (!content) {
    content = `# ${title}\n\n## Phase Summary\n\n[Summarize phase work]\n\n## Completion Status\n\n[Describe completion status]\n\n## Next Phase\n\n[What comes next]\n`;
  }

  const note = await vault.createPhaseHandoff({
    phaseId,
    sessionId,
    title,
    content,
    tags: args.tags || []
  });

  return {
    success: true,
    message: 'Phase handoff created',
    note: {
      path: note.path,
      id: note.frontmatter.id,
      phaseId
    }
  };
}

/**
 * Namespace dispatcher for phase commands
 * Enables: phase <subcommand> [args...]
 */
export async function phaseCommand(vault, args) {
  const subcommand = args._[0];
  
  if (!subcommand) {
    return {
      success: false,
      message: 'Phase subcommand required. Use: phase create|research|handoff'
    };
  }

  // Shift args for subcommand
  const subArgs = {
    ...args,
    _: args._.slice(1)
  };

  switch (subcommand) {
    case 'create':
      return await phaseCreateCommand(vault, subArgs, args.tracker);
    case 'research':
      return await phaseResearchCommand(vault, subArgs, args.tracker);
    case 'handoff':
      return await phaseHandoffCommand(vault, subArgs, args.tracker);
    default:
      return {
        success: false,
        message: `Unknown phase subcommand: ${subcommand}. Use: create|research|handoff`
      };
  }
}

export default {
  create: phaseCreateCommand,
  research: phaseResearchCommand,
  handoff: phaseHandoffCommand,
  // Namespace dispatcher
  phase: phaseCommand
};
