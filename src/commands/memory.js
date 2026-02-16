/**
 * Memory index command
 */
export async function memoryIndexCommand(indexService, args) {
  const result = await indexService.regenerateIndexes();

  return {
    success: true,
    message: 'Indexes regenerated',
    indexes: result
  };
}

/**
 * Memory search command
 */
export async function memorySearchCommand(vault, args) {
  const query = args.query || args._[0];
  
  if (!query) {
    return {
      success: false,
      message: 'Query is required'
    };
  }

  const results = await vault.search(query, {
    caseSensitive: args.caseSensitive || args.case,
    dir: args.dir
  });

  return {
    success: true,
    message: `Found ${results.length} matches`,
    results: results.map(r => ({
      path: r.path,
      matches: r.matches || 1,
      preview: r.preview
    }))
  };
}

/**
 * Memory doctor command
 */
export async function memoryDoctorCommand(doctorService, args) {
  const diagnostics = await doctorService.runDiagnostics();

  let result = {
    success: true,
    message: diagnostics.healthy ? 'Vault is healthy' : 'Issues found',
    diagnostics
  };

  // Auto-fix if requested and issues found
  if (args.fix && !diagnostics.healthy) {
    const fixed = await doctorService.autoFix();
    result.fixed = fixed;
    result.message = 'Attempted auto-fix. Run doctor again to verify.';
  }

  return result;
}

/**
 * Memory prune command
 */
export async function memoryPruneCommand(pruneService, args) {
  const days = parseInt(args.days || args.d || 30, 10);
  const dryRun = args.dryRun || args.dry;
  const research = args.research || args.r;

  let result;

  if (research) {
    result = await pruneService.pruneResearch({
      days,
      dryRun,
      phaseId: args.phase
    });
  } else {
    result = await pruneService.prune({
      days,
      dryRun,
      folders: args.folders || ['handoffs', 'sessions']
    });
  }

  const message = dryRun 
    ? `Would delete ${result.summary.candidates} notes older than ${days} days`
    : `Deleted ${result.summary.deleted} notes older than ${days} days`;

  return {
    success: true,
    message,
    result
  };
}

/**
 * Deterministic tracker command
 */
export async function memoryTrackerCommand(tracker, args) {
  if (!tracker) {
    return { success: false, message: 'Tracker service unavailable' };
  }

  if (args.clearPhase || args['clear-phase']) {
    const state = await tracker.setActivePhase(null);
    return { success: true, message: 'Active phase cleared', tracker: state };
  }

  if (args.phase) {
    const state = await tracker.setActivePhase(args.phase);
    return { success: true, message: `Active phase set to ${args.phase}`, tracker: state };
  }

  if (args.session) {
    const state = await tracker.setSession(args.session);
    return { success: true, message: `Session set to ${args.session}`, tracker: state };
  }

  const trackerState = await tracker.getState();
  return { success: true, message: 'Tracker state loaded', tracker: trackerState };
}

/**
 * Namespace dispatcher for vault commands
 * Enables: vault <subcommand> [args...]
 * Vault is an alias for memory commands
 */
export async function vaultCommand(indexService, doctorService, pruneService, vault, trackerOrArgs, maybeArgs) {
  const tracker = maybeArgs ? trackerOrArgs : null;
  const args = maybeArgs || trackerOrArgs;
  const subcommand = args._[0];
  
  if (!subcommand) {
    return {
      success: false,
      message: 'Vault subcommand required. Use: vault index|search|doctor|prune|tracker'
    };
  }

  // Shift args for subcommand
  const subArgs = {
    ...args,
    _: args._.slice(1)
  };

  switch (subcommand) {
    case 'index':
      return await memoryIndexCommand(indexService, subArgs);
    case 'search':
      return await memorySearchCommand(vault, subArgs);
    case 'doctor':
      return await memoryDoctorCommand(doctorService, subArgs);
    case 'prune':
      return await memoryPruneCommand(pruneService, subArgs);
    case 'tracker':
      return await memoryTrackerCommand(tracker, subArgs);
    default:
      return {
        success: false,
        message: `Unknown vault subcommand: ${subcommand}. Use: index|search|doctor|prune|tracker`
      };
  }
}

/**
 * Namespace dispatcher for memory commands (legacy alias)
 * Enables: memory <subcommand> [args...]
 */
export async function memoryCommand(indexService, doctorService, pruneService, vault, trackerOrArgs, maybeArgs) {
  if (maybeArgs) {
    return await vaultCommand(indexService, doctorService, pruneService, vault, trackerOrArgs, maybeArgs);
  }
  return await vaultCommand(indexService, doctorService, pruneService, vault, trackerOrArgs);
}

export default {
  index: memoryIndexCommand,
  search: memorySearchCommand,
  doctor: memoryDoctorCommand,
  prune: memoryPruneCommand,
  tracker: memoryTrackerCommand,
  // Namespace dispatchers
  vault: vaultCommand,
  memory: memoryCommand
};
