import { join, basename } from 'path';
import { createFrontmatter } from '../utils/frontmatter.js';

/**
 * Indexing service for catalog and summary generation
 */
export class IndexService {
  constructor(config, adapter) {
    this.config = config;
    this.adapter = adapter;
  }

  /**
   * Regenerate all indexes
   */
  async regenerateIndexes() {
    await this.generateCatalog();
    await this.generatePhaseSummary();
    // Latest handoff is updated when handoffs are created
    
    return {
      catalog: true,
      phaseSummary: true,
      latestHandoff: true
    };
  }

  /**
   * Generate catalog index of all notes
   */
  async generateCatalog() {
    const sections = {
      handoffs: await this._catalogSection('handoffs'),
      sessions: await this._catalogSection('sessions'),
      phases: await this._catalogPhases()
    };

    let content = '# Vault Catalog\n\n';
    content += `Generated: ${new Date().toISOString()}\n\n`;

    // Handoffs
    content += '## Handoffs\n\n';
    content += `Total: ${sections.handoffs.length}\n\n`;
    for (const item of sections.handoffs.slice(0, 20)) {
      content += `- [[${basename(item.path)}]] - ${item.date}\n`;
    }
    if (sections.handoffs.length > 20) {
      content += `\n... and ${sections.handoffs.length - 20} more\n`;
    }

    // Sessions
    content += '\n## Sessions\n\n';
    content += `Total: ${sections.sessions.length}\n\n`;
    for (const item of sections.sessions.slice(0, 20)) {
      content += `- [[${basename(item.path)}]] - ${item.date}\n`;
    }
    if (sections.sessions.length > 20) {
      content += `\n... and ${sections.sessions.length - 20} more\n`;
    }

    // Phases
    content += '\n## Phases\n\n';
    content += `Total: ${sections.phases.length}\n\n`;
    for (const phase of sections.phases) {
      content += `- [[${basename(phase.path)}]] - ${phase.title || 'Untitled'} (${phase.status})\n`;
    }

    const frontmatter = createFrontmatter('index', {
      session_id: null,
      phase_id: null,
      status: 'active',
      tags: ['index', 'catalog'],
      extra: {
        title: 'Vault Catalog',
        total_notes: sections.handoffs.length + sections.sessions.length + sections.phases.length
      }
    });

    const path = this.config.getPath('indexes', 'catalog.md');
    await this.adapter.createNote(path, frontmatter, content);

    return { path, sections };
  }

  /**
   * Generate phase summary index
   */
  async generatePhaseSummary() {
    const phasesDir = this.config.getPath('phases');
    const phasePaths = await this.adapter.listNotes(phasesDir, {
      recursive: true,
      pattern: /phase\.md$/
    });

    const phases = [];
    for (const path of phasePaths) {
      try {
        const note = await this.adapter.readNote(path);
        phases.push({
          path,
          id: note.frontmatter.phase_id,
          title: note.frontmatter.title || 'Untitled',
          status: note.frontmatter.status,
          goal: note.frontmatter.goal || ''
        });
      } catch (error) {
        // Skip invalid phases
        continue;
      }
    }

    let content = '# Phase Summary\n\n';
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `Total Phases: ${phases.length}\n\n`;

    const statusGroups = {
      planned: [],
      active: [],
      completed: [],
      other: []
    };

    for (const phase of phases) {
      const group = statusGroups[phase.status] || statusGroups.other;
      group.push(phase);
    }

    for (const [status, items] of Object.entries(statusGroups)) {
      if (items.length === 0) continue;

      content += `## ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n`;
      
      for (const phase of items) {
        content += `### ${phase.title}\n\n`;
        content += `- **ID:** ${phase.id}\n`;
        content += `- **Status:** ${phase.status}\n`;
        if (phase.goal) {
          content += `- **Goal:** ${phase.goal}\n`;
        }
        content += `- **Path:** [[${basename(phase.path)}]]\n\n`;
      }
    }

    const frontmatter = createFrontmatter('index', {
      session_id: null,
      phase_id: null,
      status: 'active',
      tags: ['index', 'phase-summary'],
      extra: {
        title: 'Phase Summary',
        total_phases: phases.length
      }
    });

    const path = this.config.getPath('indexes', 'phase-summary.md');
    await this.adapter.createNote(path, frontmatter, content);

    return { path, phases };
  }

  /**
   * Catalog a section of notes
   */
  async _catalogSection(sectionName) {
    const dir = this.config.getPath(sectionName);
    const paths = await this.adapter.listNotes(dir, { recursive: true });

    const items = [];
    for (const path of paths) {
      const stats = await this.adapter.getStats(path);
      if (stats) {
        items.push({
          path,
          date: stats.mtime.toISOString()
        });
      }
    }

    // Sort by date, newest first
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    return items;
  }

  /**
   * Catalog phases with metadata
   */
  async _catalogPhases() {
    const dir = this.config.getPath('phases');
    const paths = await this.adapter.listNotes(dir, {
      recursive: true,
      pattern: /phase\.md$/
    });

    const items = [];
    for (const path of paths) {
      try {
        const note = await this.adapter.readNote(path);
        items.push({
          path,
          title: note.frontmatter.title,
          status: note.frontmatter.status
        });
      } catch (error) {
        // Skip invalid phases
        continue;
      }
    }

    return items;
  }
}

export default IndexService;
