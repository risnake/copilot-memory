#!/usr/bin/env node

import { Config } from '../src/config.js';
import { NotesMDAdapter } from '../src/adapters/notesmd.js';
import { VaultService } from '../src/services/vault.js';
import { IndexService } from '../src/services/index.js';
import { DoctorService } from '../src/services/doctor.js';
import { PruneService } from '../src/services/prune.js';
import handoffCommands from '../src/commands/handoff.js';
import phaseCommands from '../src/commands/phase.js';
import memoryCommands from '../src/commands/memory.js';
import initCommands from '../src/commands/init.js';
import { getCommandHelp } from '../src/commands/registry.js';

/**
 * Parse command line arguments
 */
function parseArgs(argv) {
  const args = {
    _: [],
    stdin: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        args[key] = nextArg;
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      args[key] = true;
    } else {
      args._.push(arg);
    }
  }

  return args;
}

/**
 * Format output
 */
function formatOutput(result) {
  if (result.success) {
    console.log(`✓ ${result.message}`);
    
    if (result.note) {
      console.log(`  Path: ${result.note.path}`);
      console.log(`  ID: ${result.note.id}`);
    }

    if (result.phase) {
      console.log(`  Phase: ${result.phase.title} (${result.phase.id})`);
      console.log(`  Path: ${result.phase.path}`);
    }

    if (result.handoff) {
      console.log(`  Handoff: ${result.handoff.title || result.handoff.id}`);
      console.log(`  Path: ${result.handoff.path}`);
    }

    if (result.session) {
      console.log(`  Session: ${result.session.id}`);
      console.log(`  Path: ${result.session.path}`);
    }

    if (result.results) {
      console.log(`\nResults:`);
      for (const item of result.results.slice(0, 10)) {
        console.log(`  ${item.path}`);
        if (item.preview) {
          console.log(`    ${item.preview.substring(0, 80)}...`);
        }
      }
      if (result.results.length > 10) {
        console.log(`  ... and ${result.results.length - 10} more`);
      }
    }

    if (result.diagnostics) {
      console.log(`\nDiagnostics:`);
      console.log(`  Folders: ${result.diagnostics.folders.healthy ? '✓' : '✗'} ${result.diagnostics.folders.message}`);
      console.log(`  Indexes: ${result.diagnostics.indexes.healthy ? '✓' : '✗'} ${result.diagnostics.indexes.issues.length} issues`);
      console.log(`  Frontmatter: ${result.diagnostics.frontmatter.healthy ? '✓' : '✗'} ${result.diagnostics.frontmatter.checked} checked, ${result.diagnostics.frontmatter.invalid.length} invalid`);
      
      if (!result.diagnostics.healthy) {
        console.log(`\nIssues:`);
        for (const issue of result.diagnostics.indexes.issues) {
          console.log(`  - ${issue.index}: ${issue.message}`);
        }
        for (const invalid of result.diagnostics.frontmatter.invalid.slice(0, 5)) {
          console.log(`  - ${invalid.path}: missing ${invalid.missing?.join(', ') || 'unknown fields'}`);
        }
      }
    }

    if (result.result && result.result.summary) {
      const summary = result.result.summary;
      console.log(`\nSummary:`);
      console.log(`  Candidates: ${summary.candidates}`);
      console.log(`  Deleted: ${summary.deleted}`);
      console.log(`  Errors: ${summary.errors}`);
    }
  } else {
    console.error(`✗ ${result.message}`);
    process.exit(1);
  }
}

/**
 * Display help for core commands
 */
function showHelp() {
  console.log(`
Copilot Memory - Persistent context management for GitHub Copilot CLI

Usage:
  copilot-memory <command> [options]

Core Commands:
  init [--mode <greenfield|brownfield>]
                    Initialize vault or start new project with onboarding
  handoff           Create a handoff note to capture work state
  resume            Resume from the latest handoff
  phase <subcommand> Manage development phases
  vault <subcommand> Manage vault content and health
  help [command]    Show help for a command

Phase Subcommands:
  create            Create a new development phase
  research          Add research notes to a phase
  handoff           Complete a phase with handoff note

Vault Subcommands:
  index             Regenerate vault indexes
  search <query>    Search vault content
  doctor            Run vault health diagnostics
  prune             Clean up old notes

Options:
  --vault <path>    Specify vault location (or use COPILOT_MEMORY_VAULT env var)
  --help, -h        Show this help message
  --verbose, -v     Show detailed error messages

Examples:
  copilot-memory init
  copilot-memory init --mode greenfield --idea "Build a REST API" --stack "Node.js, Express"
  copilot-memory init --mode brownfield --path /path/to/project
  copilot-memory handoff --title "Feature Complete"
  copilot-memory resume
  copilot-memory phase create --title "Authentication"
  copilot-memory phase research --phase <id> --title "OAuth Best Practices"
  copilot-memory vault search "authentication"
  copilot-memory vault doctor
  copilot-memory vault index
  copilot-memory vault prune --days 90 --dry-run

For more details: https://github.com/yourusername/copilot-memory
`);
}

/**
 * Main CLI function
 */
async function main() {
  const argv = process.argv.slice(2);
  
  // Handle no arguments - show help
  if (argv.length === 0) {
    showHelp();
    process.exit(0);
  }

  // Parse top-level command
  const command = argv[0];
  
  // Handle global help flags
  if (command === 'help' || command === '--help' || command === '-h') {
    if (argv[1]) {
      const help = getCommandHelp(argv[1]);
      if (help) {
        console.log(help);
      } else {
        console.error(`Unknown command: ${argv[1]}`);
        process.exit(1);
      }
    } else {
      showHelp();
    }
    process.exit(0);
  }

  // Parse remaining arguments
  const args = parseArgs(argv.slice(1));
  
  // Handle command-level help flag
  if (args.help || args.h) {
    const help = getCommandHelp(command);
    if (help) {
      console.log(help);
    } else {
      showHelp();
    }
    process.exit(0);
  }

  // Initialize services (with global --vault option)
  const config = new Config({
    vaultPath: args.vault || process.env.COPILOT_MEMORY_VAULT
  });

  const adapter = new NotesMDAdapter(config);
  const vault = new VaultService(config, adapter);
  const indexService = new IndexService(config, adapter);
  const doctorService = new DoctorService(config, adapter);
  const pruneService = new PruneService(config, adapter);

  let result;

  try {
    // Handle legacy command warnings
    const legacyCommands = {
      'continuous-resume': 'resume',
      'continous-handoff': 'handoff',
      'continous-resume': 'resume',
      'continous-greenfield': 'init',
      'continous-brownfield': 'init',
      'phase-create': 'phase create',
      'phase-research': 'phase research',
      'phase-handoff': 'phase handoff',
      'memory-index': 'vault index',
      'memory-search': 'vault search',
      'memory-doctor': 'vault doctor',
      'memory-prune': 'vault prune',
      'commands-list': 'help',
      'commands-status': 'vault doctor'
    };

    if (legacyCommands[command]) {
      console.error(`\n❌ BREAKING CHANGE: Command '${command}' has been removed.`);
      console.error(`   Please use: copilot-memory ${legacyCommands[command]}`);
      console.error(`   See migration guide: https://github.com/yourusername/copilot-memory#migration\n`);
      process.exit(1);
    }

    // Route to command handlers based on new concise model
    switch (command) {
      case 'init':
        // Initialize vault, then route to mode-based flows
        await vault.initialize();
        
        // If mode is provided, route to init command handler for onboarding
        if (args.mode) {
          result = await initCommands.init(vault, args);
        } else {
          // No mode provided - just vault init (basic usage)
          result = {
            success: true,
            message: 'Vault initialized. Use --mode greenfield|brownfield for onboarding.',
            path: config.vaultPath
          };
          console.log(`✓ ${result.message}`);
          console.log(`  Path: ${result.path}`);
          process.exit(0);
        }
        break;

      case 'handoff':
        await vault.initialize();
        result = await handoffCommands.handoff(vault, args);
        break;

      case 'resume':
        await vault.initialize();
        result = await handoffCommands.continuousResume(vault, args);
        break;

      case 'phase':
        await vault.initialize();
        // Validate subcommand exists
        const phaseSubcommand = args._[0];
        if (!phaseSubcommand) {
          console.error('Error: phase subcommand required');
          console.log('\nValid subcommands: create, research, handoff');
          console.log('\nExamples:');
          console.log('  copilot-memory phase create --title "Authentication"');
          console.log('  copilot-memory phase research --phase <id> --title "Research"');
          console.log('  copilot-memory phase handoff --phase <id> --title "Complete"');
          process.exit(1);
        }
        
        // Validate subcommand is recognized
        if (!['create', 'research', 'handoff'].includes(phaseSubcommand)) {
          console.error(`Error: unknown phase subcommand '${phaseSubcommand}'`);
          console.log('\nValid subcommands: create, research, handoff');
          process.exit(1);
        }
        
        result = await phaseCommands.phase(vault, args);
        break;

      case 'vault':
        await vault.initialize();
        // Validate subcommand exists
        const vaultSubcommand = args._[0];
        if (!vaultSubcommand) {
          console.error('Error: vault subcommand required');
          console.log('\nValid subcommands: index, search, doctor, prune');
          console.log('\nExamples:');
          console.log('  copilot-memory vault index');
          console.log('  copilot-memory vault search "query"');
          console.log('  copilot-memory vault doctor');
          console.log('  copilot-memory vault prune --days 90');
          process.exit(1);
        }
        
        // Validate subcommand is recognized
        if (!['index', 'search', 'doctor', 'prune'].includes(vaultSubcommand)) {
          console.error(`Error: unknown vault subcommand '${vaultSubcommand}'`);
          console.log('\nValid subcommands: index, search, doctor, prune');
          process.exit(1);
        }
        
        result = await memoryCommands.vault(indexService, doctorService, pruneService, vault, args);
        break;

      default:
        console.error(`Error: unknown command '${command}'`);
        console.log('\nValid commands: init, handoff, resume, phase, vault, help');
        console.log('\nRun \'copilot-memory help\' for more information');
        process.exit(1);
    }

    formatOutput(result);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (args.verbose || args.v) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
