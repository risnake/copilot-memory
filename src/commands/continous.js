/**
 * Continous command suite - greenfield and brownfield modes
 */
import { randomUUID } from 'crypto';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { stdin } from 'process';
import { createInterface } from 'readline';

/**
 * Continous handoff - alias for regular handoff
 */
export async function continousHandoffCommand(vault, args) {
  const { handoffCommand } = await import('./handoff.js');
  return await handoffCommand(vault, args);
}

/**
 * Continous resume - alias for continuous resume
 */
export async function continousResumeCommand(vault, args) {
  const { continuousResumeCommand } = await import('./handoff.js');
  return await continuousResumeCommand(vault, args);
}

/**
 * Greenfield mode - for no-code start
 * Gathers development preferences/research questions and creates structured markdown note
 */
export async function greenfieldCommand(vault, args) {
  // Gather inputs - from flags or interactive prompt
  let projectIdea = args.idea || args.title;
  let techStack = args.stack || args.tech;
  let constraints = args.constraints;
  let researchQuestions = args.research || args.questions;
  
  // Interactive prompts if key inputs missing
  if (!projectIdea || !techStack) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
    
    try {
      if (!projectIdea) {
        projectIdea = await question('Project idea/goal: ');
      }
      if (!techStack) {
        techStack = await question('Preferred tech stack (comma-separated): ');
      }
      if (!constraints) {
        constraints = await question('Constraints/requirements (optional): ');
      }
      if (!researchQuestions) {
        researchQuestions = await question('Research questions (optional, comma-separated): ');
      }
    } finally {
      rl.close();
    }
  }
  
  // Parse inputs
  const techList = techStack ? techStack.split(',').map(t => t.trim()).filter(Boolean) : [];
  const researchList = researchQuestions ? researchQuestions.split(',').map(q => q.trim()).filter(Boolean) : [];
  
  // Generate structured content
  const content = generateGreenfieldNote({
    projectIdea,
    techStack: techList,
    constraints,
    researchQuestions: researchList
  });
  
  // Create note in vault
  const sessionId = args.session || randomUUID();
  const title = `Greenfield: ${projectIdea.substring(0, 50)}`;
  
  const note = await vault.createGreenfieldNote({
    sessionId,
    title,
    content,
    tags: ['greenfield', 'planning', ...(args.tags ? args.tags.split(',') : [])]
  });
  
  return {
    success: true,
    message: 'Greenfield note created',
    note: {
      path: note.path,
      id: note.frontmatter.id
    }
  };
}

/**
 * Brownfield mode - for existing codebase analysis
 * Analyzes codebase and creates markdown note with architecture/context summary
 */
export async function brownfieldCommand(vault, args) {
  const targetPath = args.path || process.cwd();
  
  // Analyze codebase
  const analysis = await analyzeCodebase(targetPath);
  
  // Generate structured content
  const content = generateBrownfieldNote(analysis);
  
  // Create note in vault
  const sessionId = args.session || randomUUID();
  const title = `Brownfield: ${basename(targetPath)}`;
  
  const note = await vault.createBrownfieldNote({
    sessionId,
    title,
    content,
    tags: ['brownfield', 'analysis', ...(args.tags ? args.tags.split(',') : [])]
  });
  
  return {
    success: true,
    message: 'Brownfield analysis note created',
    note: {
      path: note.path,
      id: note.frontmatter.id
    }
  };
}

/**
 * Generate greenfield note content
 */
function generateGreenfieldNote(data) {
  const { projectIdea, techStack, constraints, researchQuestions } = data;
  
  let content = `# Greenfield Project\n\n`;
  content += `## Project Idea\n\n${projectIdea}\n\n`;
  
  if (techStack && techStack.length > 0) {
    content += `## Tech Stack Preferences\n\n`;
    for (const tech of techStack) {
      content += `- ${tech}\n`;
    }
    content += `\n`;
  }
  
  if (constraints) {
    content += `## Constraints & Requirements\n\n${constraints}\n\n`;
  }
  
  if (researchQuestions && researchQuestions.length > 0) {
    content += `## Research Questions\n\n`;
    for (const question of researchQuestions) {
      content += `- [ ] ${question}\n`;
    }
    content += `\n`;
  }
  
  content += `## Implementation Breakdown\n\n`;
  content += `### Phase 1: Setup & Foundation\n`;
  content += `- [ ] Initialize project structure\n`;
  content += `- [ ] Set up development environment\n`;
  content += `- [ ] Configure tooling and dependencies\n\n`;
  
  content += `### Phase 2: Core Features\n`;
  content += `- [ ] Implement core functionality\n`;
  content += `- [ ] Add essential integrations\n`;
  content += `- [ ] Set up data models/schemas\n\n`;
  
  content += `### Phase 3: Testing & Quality\n`;
  content += `- [ ] Write unit tests\n`;
  content += `- [ ] Add integration tests\n`;
  content += `- [ ] Perform security audit\n\n`;
  
  content += `### Phase 4: Deployment\n`;
  content += `- [ ] Configure deployment pipeline\n`;
  content += `- [ ] Set up monitoring\n`;
  content += `- [ ] Deploy to production\n\n`;
  
  content += `## Notes\n\n`;
  content += `_Created: ${new Date().toISOString()}_\n`;
  
  return content;
}

/**
 * Analyze existing codebase
 */
async function analyzeCodebase(targetPath) {
  const analysis = {
    path: targetPath,
    folders: [],
    files: [],
    extensions: {},
    keyFiles: [],
    techStack: []
  };
  
  try {
    // Get directory contents
    const entries = await readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip common ignore patterns
      if (entry.name.startsWith('.') && entry.name !== '.github') {
        continue;
      }
      if (['node_modules', 'dist', 'build', 'target', '__pycache__', 'vendor'].includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        analysis.folders.push(entry.name);
      } else {
        analysis.files.push(entry.name);
        
        // Track extensions
        const ext = extname(entry.name);
        if (ext) {
          analysis.extensions[ext] = (analysis.extensions[ext] || 0) + 1;
        }
        
        // Identify key files
        if (isKeyFile(entry.name)) {
          analysis.keyFiles.push(entry.name);
        }
      }
    }
    
    // Infer tech stack from key files
    analysis.techStack = inferTechStack(analysis.keyFiles, analysis.extensions);
    
  } catch (error) {
    console.error(`Warning: Could not analyze ${targetPath}: ${error.message}`);
  }
  
  return analysis;
}

/**
 * Check if file is a key configuration/metadata file
 */
function isKeyFile(filename) {
  const keyFiles = [
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'Cargo.toml', 'Cargo.lock',
    'go.mod', 'go.sum',
    'requirements.txt', 'Pipfile', 'poetry.lock', 'setup.py',
    'pom.xml', 'build.gradle', 'build.gradle.kts',
    'Gemfile', 'Gemfile.lock',
    'composer.json', 'composer.lock',
    'Makefile', 'CMakeLists.txt',
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    '.gitignore', '.env.example', 'README.md',
    'tsconfig.json', 'jsconfig.json', 'babel.config.js', 'webpack.config.js',
    'tailwind.config.js', 'next.config.js', 'vite.config.js'
  ];
  
  return keyFiles.includes(filename);
}

/**
 * Infer tech stack from key files and extensions
 */
function inferTechStack(keyFiles, extensions) {
  const stack = new Set();
  
  // Node.js / JavaScript / TypeScript
  if (keyFiles.includes('package.json')) {
    stack.add('Node.js');
    if (extensions['.ts'] || extensions['.tsx'] || keyFiles.includes('tsconfig.json')) {
      stack.add('TypeScript');
    } else {
      stack.add('JavaScript');
    }
    
    if (extensions['.jsx'] || extensions['.tsx']) {
      stack.add('React');
    }
    if (keyFiles.includes('next.config.js')) {
      stack.add('Next.js');
    }
    if (keyFiles.includes('vite.config.js')) {
      stack.add('Vite');
    }
  }
  
  // Python
  if (keyFiles.some(f => ['requirements.txt', 'Pipfile', 'setup.py', 'poetry.lock'].includes(f))) {
    stack.add('Python');
  }
  
  // Rust
  if (keyFiles.includes('Cargo.toml')) {
    stack.add('Rust');
  }
  
  // Go
  if (keyFiles.includes('go.mod')) {
    stack.add('Go');
  }
  
  // Java
  if (keyFiles.some(f => ['pom.xml', 'build.gradle'].includes(f))) {
    stack.add('Java');
  }
  
  // Ruby
  if (keyFiles.includes('Gemfile')) {
    stack.add('Ruby');
  }
  
  // PHP
  if (keyFiles.includes('composer.json')) {
    stack.add('PHP');
  }
  
  // Docker
  if (keyFiles.some(f => f.startsWith('Dockerfile') || f.includes('docker-compose'))) {
    stack.add('Docker');
  }
  
  return Array.from(stack);
}

/**
 * Generate brownfield note content
 */
function generateBrownfieldNote(analysis) {
  let content = `# Brownfield Codebase Analysis\n\n`;
  content += `**Path:** \`${analysis.path}\`\n\n`;
  
  content += `## Structure Summary\n\n`;
  content += `**Folders:** ${analysis.folders.length}\n`;
  content += `**Files:** ${analysis.files.length}\n\n`;
  
  if (analysis.folders.length > 0) {
    content += `### Key Folders\n\n`;
    const displayFolders = analysis.folders.slice(0, 20);
    for (const folder of displayFolders) {
      content += `- ${folder}\n`;
    }
    if (analysis.folders.length > 20) {
      content += `- _(${analysis.folders.length - 20} more...)_\n`;
    }
    content += `\n`;
  }
  
  if (analysis.keyFiles.length > 0) {
    content += `### Key Files\n\n`;
    for (const file of analysis.keyFiles) {
      content += `- ${file}\n`;
    }
    content += `\n`;
  }
  
  if (Object.keys(analysis.extensions).length > 0) {
    content += `### File Extensions\n\n`;
    const sorted = Object.entries(analysis.extensions).sort((a, b) => b[1] - a[1]);
    for (const [ext, count] of sorted.slice(0, 10)) {
      content += `- ${ext}: ${count} files\n`;
    }
    content += `\n`;
  }
  
  if (analysis.techStack.length > 0) {
    content += `## Inferred Tech Stack\n\n`;
    for (const tech of analysis.techStack) {
      content += `- ${tech}\n`;
    }
    content += `\n`;
  }
  
  content += `## Architecture Context\n\n`;
  content += `_Add notes about architecture patterns, key components, and design decisions._\n\n`;
  
  content += `## Suggested Exploration Tasks\n\n`;
  content += `- [ ] Review main entry points and application flow\n`;
  content += `- [ ] Identify core business logic and domain models\n`;
  content += `- [ ] Map out external dependencies and integrations\n`;
  content += `- [ ] Check test coverage and testing approach\n`;
  content += `- [ ] Review build and deployment configuration\n`;
  content += `- [ ] Document API contracts and data schemas\n`;
  content += `- [ ] Identify technical debt and improvement opportunities\n\n`;
  
  content += `## Notes\n\n`;
  content += `_Analysis created: ${new Date().toISOString()}_\n`;
  
  return content;
}

export default {
  continousHandoff: continousHandoffCommand,
  continousResume: continousResumeCommand,
  greenfield: greenfieldCommand,
  brownfield: brownfieldCommand
};
