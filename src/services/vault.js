import { join } from 'path';
import { randomUUID } from 'crypto';
import { createFrontmatter } from '../utils/frontmatter.js';

/**
 * Vault service for managing notes
 * High-level operations on the vault
 */
export class VaultService {
  constructor(config, adapter) {
    this.config = config;
    this.adapter = adapter;
  }

  /**
   * Initialize the vault
   */
  async initialize() {
    await this.config.ensureVaultStructure();
  }

  /**
   * Create a handoff note
   */
  async createHandoff(data) {
    const { sessionId, phaseId, title, content, tags = [] } = data;
    
    // Get previous handoff if exists
    const previousHandoff = await this.getLatestHandoff();
    
    const frontmatter = createFrontmatter('handoff', {
      session_id: sessionId || randomUUID(),
      phase_id: phaseId || null,
      status: 'active',
      tags: ['handoff', ...tags],
      links: previousHandoff ? [previousHandoff.path] : [],
      extra: {
        title,
        previous_handoff: previousHandoff ? previousHandoff.frontmatter.id : null
      }
    });

    const filename = this.config.generateFilename('handoff', sessionId || 'session', title);
    const path = join(this.config.getDatedPath('handoffs'), filename);

    // Add wikilink to previous handoff in content if exists
    let finalContent = content;
    if (previousHandoff) {
      const basename = previousHandoff.path.split('/').pop().replace('.md', '');
      finalContent = `## Previous Context\n\n[[${basename}]]\n\n` + content;
    }

    const note = await this.adapter.createNote(path, frontmatter, finalContent);
    
    // Update latest handoff index
    await this._updateLatestHandoff(note);

    return note;
  }

  /**
   * Create a session note
   */
  async createSession(data) {
    const { sessionId, title, content, tags = [] } = data;
    
    const frontmatter = createFrontmatter('session', {
      session_id: sessionId || randomUUID(),
      phase_id: null,
      status: 'active',
      tags: ['session', ...tags],
      extra: {
        title
      }
    });

    const filename = this.config.generateFilename('session', sessionId || 'session', title);
    const path = join(this.config.getDatedPath('sessions'), filename);

    return await this.adapter.createNote(path, frontmatter, content);
  }

  /**
   * Create a phase
   */
  async createPhase(data) {
    const { phaseId, title, goal, status = 'planned', tags = [] } = data;
    const id = phaseId || randomUUID();
    
    const frontmatter = createFrontmatter('phase', {
      id,
      session_id: null,
      phase_id: id,
      status,
      tags: ['phase', ...tags],
      extra: {
        title,
        goal
      }
    });

    const content = `# ${title}\n\n## Goal\n\n${goal}\n\n## Status\n\n${status}`;
    const filename = 'phase.md';
    const path = this.config.getPath('phases', id, filename);

    return await this.adapter.createNote(path, frontmatter, content);
  }

  /**
   * Create a research note for a phase
   */
  async createPhaseResearch(data) {
    const { phaseId, title, content, tags = [] } = data;
    
    const frontmatter = createFrontmatter('research', {
      session_id: null,
      phase_id: phaseId,
      status: 'active',
      tags: ['research', 'phase', ...tags],
      extra: {
        title
      }
    });

    const filename = this.config.generateFilename('research', 'phase', title);
    const path = this.config.getPath('phases', phaseId, 'research', filename);

    return await this.adapter.createNote(path, frontmatter, content);
  }

  /**
   * Create a phase handoff note
   */
  async createPhaseHandoff(data) {
    const { phaseId, sessionId, title, content, tags = [] } = data;
    
    const frontmatter = createFrontmatter('handoff', {
      session_id: sessionId || null,
      phase_id: phaseId,
      status: 'active',
      tags: ['handoff', 'phase', ...tags],
      extra: {
        title
      }
    });

    const filename = this.config.generateFilename('handoff', 'phase', title);
    const path = this.config.getPath('phases', phaseId, 'handoffs', filename);

    const note = await this.adapter.createNote(path, frontmatter, content);
    
    // Update latest handoff index
    await this._updateLatestHandoff(note);

    return note;
  }

  /**
   * Get the latest handoff
   */
  async getLatestHandoff() {
    const indexPath = this.config.getPath('indexes', 'latest-handoff.md');
    
    if (!this.adapter.exists(indexPath)) {
      return null;
    }

    try {
      const index = await this.adapter.readNote(indexPath);
      const handoffPath = index.frontmatter.handoff_path;
      
      if (handoffPath && this.adapter.exists(handoffPath)) {
        return await this.adapter.readNote(handoffPath);
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  /**
   * List all handoffs
   */
  async listHandoffs(options = {}) {
    const dir = this.config.getPath('handoffs');
    return await this.adapter.listNotes(dir, { 
      recursive: true,
      pattern: /--handoff--/,
      ...options 
    });
  }

  /**
   * List all phases
   */
  async listPhases() {
    const dir = this.config.getPath('phases');
    return await this.adapter.listNotes(dir, { 
      recursive: true,
      pattern: /phase\.md$/
    });
  }

  /**
   * Get a phase by ID
   */
  async getPhase(phaseId) {
    const path = this.config.getPath('phases', phaseId, 'phase.md');
    
    if (!this.adapter.exists(path)) {
      throw new Error(`Phase not found: ${phaseId}`);
    }

    return await this.adapter.readNote(path);
  }

  /**
   * Search notes
   */
  async search(query, options = {}) {
    const dir = options.dir || this.config.vaultPath;
    return await this.adapter.searchNotes(dir, query, {
      recursive: true,
      ...options
    });
  }

  /**
   * Create a greenfield note
   */
  async createGreenfieldNote(data) {
    const { sessionId, title, content, tags = [] } = data;
    
    const frontmatter = createFrontmatter('greenfield', {
      session_id: sessionId || randomUUID(),
      phase_id: null,
      status: 'active',
      tags: ['greenfield', 'planning', ...tags],
      extra: {
        title
      }
    });

    const filename = this.config.generateFilename('greenfield', sessionId || 'session', title);
    const path = join(this.config.getDatedPath('sessions'), filename);

    return await this.adapter.createNote(path, frontmatter, content);
  }

  /**
   * Create a brownfield note
   */
  async createBrownfieldNote(data) {
    const { sessionId, title, content, tags = [] } = data;
    
    const frontmatter = createFrontmatter('brownfield', {
      session_id: sessionId || randomUUID(),
      phase_id: null,
      status: 'active',
      tags: ['brownfield', 'analysis', ...tags],
      extra: {
        title
      }
    });

    const filename = this.config.generateFilename('brownfield', sessionId || 'session', title);
    const path = join(this.config.getDatedPath('sessions'), filename);

    return await this.adapter.createNote(path, frontmatter, content);
  }

  /**
   * Update latest handoff index
   */
  async _updateLatestHandoff(handoffNote) {
    const basename = handoffNote.path.split('/').pop().replace('.md', '');
    
    const frontmatter = createFrontmatter('index', {
      session_id: null,
      phase_id: null,
      status: 'active',
      tags: ['index', 'latest-handoff'],
      extra: {
        handoff_path: handoffNote.path,
        handoff_id: handoffNote.frontmatter.id,
        title: 'Latest Handoff'
      }
    });

    const content = `# Latest Handoff

This index tracks the most recent handoff note.

**Current Handoff:** [[${basename}]]

**Path:** ${handoffNote.path}
**ID:** ${handoffNote.frontmatter.id}
**Updated:** ${new Date().toISOString()}`;
    
    const path = this.config.getPath('indexes', 'latest-handoff.md');

    // Check if index exists first
    if (this.adapter.exists(path)) {
      await this.adapter.updateNote(path, frontmatter, content);
    } else {
      await this.adapter.createNote(path, frontmatter, content);
    }
  }
}

export default VaultService;
