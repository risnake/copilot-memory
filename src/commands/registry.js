/**
 * Command registry and help system
 */

export const COMMANDS = {
  init: {
    name: 'init',
    description: 'Initialize vault or start project onboarding',
    usage: 'copilot-memory init [--mode greenfield|brownfield] [options]',
    options: [
      '--vault <path>          Vault location (or use COPILOT_MEMORY_VAULT env)',
      '--mode <mode>           greenfield (new project) or brownfield (analyze existing)',
      '  Greenfield options:',
      '    --idea <text>        Project idea/goal',
      '    --stack <techs>      Tech stack (comma-separated)',
      '    --constraints <text> Requirements/constraints',
      '    --research <qs>      Research questions (comma-separated)',
      '  Brownfield options:',
      '    --path <path>        Codebase path to analyze (default: cwd)',
      '  Common:',
      '    --session <id>       Session ID (auto-generated if omitted)',
      '    --tags <tags>        Tags (comma-separated)'
    ],
    examples: [
      'copilot-memory init',
      'copilot-memory init --vault ~/my-vault',
      'copilot-memory init --mode greenfield --idea "Todo API" --stack "Node.js,PostgreSQL"',
      'copilot-memory init --mode brownfield --path ~/existing-app'
    ]
  },

  handoff: {
    name: 'handoff',
    description: 'Create a handoff note',
    usage: 'copilot-memory handoff [options]',
    options: [
      '--title <title>         Handoff title',
      '--content <text>        Handoff content',
      '--stdin                 Read content from stdin',
      '--session <id>          Session ID',
      '--phase <id>            Phase ID',
      '--tags <tag1,tag2>      Tags'
    ],
    examples: [
      'copilot-memory handoff --title "Sprint Complete"',
      'echo "## Done\\nAuth module" | copilot-memory handoff --stdin'
    ]
  },

  resume: {
    name: 'resume',
    description: 'Resume from latest handoff',
    usage: 'copilot-memory resume',
    options: [],
    examples: [
      'copilot-memory resume'
    ]
  },

  'phase create': {
    name: 'phase create',
    description: 'Create a new phase',
    usage: 'copilot-memory phase create [options]',
    options: [
      '--title <title>         Phase title',
      '--goal <goal>           Phase goal',
      '--id <id>               Custom phase ID',
      '--tags <tag1,tag2>      Tags'
    ],
    examples: [
      'copilot-memory phase create --title "Auth" --goal "Implement OAuth2"'
    ]
  },

  'phase research': {
    name: 'phase research',
    description: 'Add research to a phase',
    usage: 'copilot-memory phase research --phase <id> [options]',
    options: [
      '--phase <id>            Phase ID (required)',
      '--title <title>         Research title',
      '--content <text>        Research content',
      '--stdin                 Read from stdin',
      '--tags <tag1,tag2>      Tags'
    ],
    examples: [
      'copilot-memory phase research --phase abc123 --title "OAuth2 patterns"'
    ]
  },

  'phase handoff': {
    name: 'phase handoff',
    description: 'Complete a phase with handoff',
    usage: 'copilot-memory phase handoff --phase <id> [options]',
    options: [
      '--phase <id>            Phase ID (required)',
      '--title <title>         Handoff title',
      '--content <text>        Handoff content',
      '--stdin                 Read from stdin',
      '--session <id>          Session ID',
      '--tags <tag1,tag2>      Tags'
    ],
    examples: [
      'copilot-memory phase handoff --phase abc123 --title "Phase Complete"'
    ]
  },

  'vault index': {
    name: 'vault index',
    description: 'Regenerate vault indexes',
    usage: 'copilot-memory vault index',
    options: [],
    examples: [
      'copilot-memory vault index'
    ]
  },

  'vault search': {
    name: 'vault search',
    description: 'Search vault content',
    usage: 'copilot-memory vault search <query> [options]',
    options: [
      '--case                  Case-sensitive search',
      '--dir <path>            Search specific directory'
    ],
    examples: [
      'copilot-memory vault search "authentication"',
      'copilot-memory vault search "TODO" --case'
    ]
  },

  'vault doctor': {
    name: 'vault doctor',
    description: 'Run vault health checks',
    usage: 'copilot-memory vault doctor [options]',
    options: [
      '--fix                   Auto-fix issues'
    ],
    examples: [
      'copilot-memory vault doctor',
      'copilot-memory vault doctor --fix'
    ]
  },

  'vault prune': {
    name: 'vault prune',
    description: 'Prune old notes',
    usage: 'copilot-memory vault prune [options]',
    options: [
      '--days <n>              Days threshold (default: 30)',
      '--dry-run               Preview without deleting',
      '--research              Prune research notes',
      '--phase <id>            Prune specific phase'
    ],
    examples: [
      'copilot-memory vault prune --days 60 --dry-run',
      'copilot-memory vault prune --days 90'
    ]
  },

  help: {
    name: 'help',
    description: 'Show help for commands',
    usage: 'copilot-memory help [command]',
    options: [],
    examples: [
      'copilot-memory help',
      'copilot-memory help handoff',
      'copilot-memory help phase'
    ]
  }
};

/**
 * Get command help
 */
export function getCommandHelp(commandName) {
  const command = COMMANDS[commandName];
  if (!command) {
    return null;
  }

  let help = `\n${command.name}`;
  help += `\n${'-'.repeat(command.name.length)}\n`;
  help += `\n${command.description}\n`;
  help += `\nUsage:\n  ${command.usage}\n`;

  if (command.options.length > 0) {
    help += `\nOptions:\n`;
    for (const option of command.options) {
      help += `  ${option}\n`;
    }
  }

  if (command.examples.length > 0) {
    help += `\nExamples:\n`;
    for (const example of command.examples) {
      help += `  ${example}\n`;
    }
  }

  return help;
}

/**
 * List all commands
 */
export function listCommands() {
  let output = '\nCopilot Memory - Command Reference\n';
  output += '==================================\n\n';
  
  output += 'Core Commands:\n';
  output += '  init                 Initialize vault\n';
  output += '  handoff              Create handoff note\n';
  output += '  resume               Resume from latest handoff\n';
  output += '  help                 Show command help\n\n';

  output += 'Phase Commands:\n';
  output += '  phase create         Create new phase\n';
  output += '  phase research       Add research to phase\n';
  output += '  phase handoff        Complete phase\n\n';

  output += 'Vault Commands:\n';
  output += '  vault index          Regenerate indexes\n';
  output += '  vault search         Search content\n';
  output += '  vault doctor         Run health checks\n';
  output += '  vault prune          Prune old notes\n\n';

  output += 'Run "copilot-memory help <command>" for detailed help.\n';

  return output;
}

export default {
  COMMANDS,
  getCommandHelp,
  listCommands
};
