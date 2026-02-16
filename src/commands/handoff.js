/**
 * Handoff command - create a new handoff note
 */
export async function handoffCommand(vault, args) {
  const sessionId = args.sessionId || args.session;
  const phaseId = args.phaseId || args.phase;
  const title = args.title || 'Work Handoff';
  
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

  // Generate default content if none provided
  if (!content) {
    content = `# ${title}\n\n## Context\n\n[Add context here]\n\n## Current State\n\n[Describe current state]\n\n## Next Steps\n\n- [ ] Task 1\n- [ ] Task 2\n`;
  }

  const note = await vault.createHandoff({
    sessionId,
    phaseId,
    title,
    content,
    tags: args.tags || []
  });

  if (args.tracker) {
    await args.tracker.setSession(note.frontmatter.session_id || null);
    await args.tracker.recordHandoff(note);
    if (phaseId) {
      await args.tracker.setActivePhase(phaseId);
    }
  }

  return {
    success: true,
    message: 'Handoff created',
    note: {
      path: note.path,
      id: note.frontmatter.id
    }
  };
}

/**
 * Continuous resume command - resume from latest handoff
 */
export async function continuousResumeCommand(vault, args) {
  const latestHandoff = await vault.getLatestHandoff();

  if (!latestHandoff) {
    return {
      success: false,
      message: 'No handoff found to resume from'
    };
  }

  // Create a new session note that references the handoff
  const sessionNote = await vault.createSession({
    sessionId: latestHandoff.frontmatter.session_id,
    title: `Resume from ${latestHandoff.frontmatter.title || 'handoff'}`,
    content: `# Session Resume\n\nResuming from handoff: [[${latestHandoff.path}]]\n\n## Previous Context\n\n${latestHandoff.body.substring(0, 500)}...\n\n## Session Notes\n\n`,
    tags: ['resume']
  });

  if (args.tracker) {
    await args.tracker.setSession(latestHandoff.frontmatter.session_id || null);
    await args.tracker.recordHandoff(latestHandoff);
    if (latestHandoff.frontmatter.phase_id) {
      await args.tracker.setActivePhase(latestHandoff.frontmatter.phase_id);
    }
  }

  return {
    success: true,
    message: 'Resumed from latest handoff',
    handoff: {
      path: latestHandoff.path,
      id: latestHandoff.frontmatter.id,
      title: latestHandoff.frontmatter.title
    },
    session: {
      path: sessionNote.path,
      id: sessionNote.frontmatter.id
    }
  };
}

export default {
  handoff: handoffCommand,
  continuousResume: continuousResumeCommand
};
