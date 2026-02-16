import { existsSync } from 'fs';
import { validateFrontmatter } from '../utils/frontmatter.js';

/**
 * Doctor service for vault health checks
 */
export class DoctorService {
  constructor(config, adapter) {
    this.config = config;
    this.adapter = adapter;
  }

  /**
   * Run all health checks
   */
  async runDiagnostics() {
    const results = {
      folders: await this.checkFolders(),
      indexes: await this.checkIndexes(),
      frontmatter: await this.checkFrontmatter()
    };

    results.healthy = 
      results.folders.healthy &&
      results.indexes.healthy &&
      results.frontmatter.healthy;

    return results;
  }

  /**
   * Check required folders exist
   */
  async checkFolders() {
    const requiredFolders = [
      'handoffs',
      'sessions',
      'phases',
      'indexes',
      'templates'
    ];

    const missing = [];
    const present = [];

    for (const folder of requiredFolders) {
      const path = this.config.getPath(folder);
      if (existsSync(path)) {
        present.push(folder);
      } else {
        missing.push(folder);
      }
    }

    return {
      healthy: missing.length === 0,
      missing,
      present,
      message: missing.length === 0 
        ? 'All required folders exist'
        : `Missing folders: ${missing.join(', ')}`
    };
  }

  /**
   * Check index integrity
   */
  async checkIndexes() {
    const indexes = [
      'latest-handoff.md',
      'catalog.md',
      'phase-summary.md'
    ];

    const results = {
      healthy: true,
      issues: []
    };

    for (const indexName of indexes) {
      const path = this.config.getPath('indexes', indexName);
      
      if (!existsSync(path)) {
        results.healthy = false;
        results.issues.push({
          index: indexName,
          issue: 'missing',
          message: `Index ${indexName} does not exist`
        });
        continue;
      }

      try {
        const note = await this.adapter.readNote(path);
        
        // Validate frontmatter
        const validation = validateFrontmatter(note.frontmatter);
        if (!validation.valid) {
          results.healthy = false;
          results.issues.push({
            index: indexName,
            issue: 'invalid_frontmatter',
            message: `Missing fields: ${validation.missing.join(', ')}`
          });
        }

        // Check latest-handoff specific requirements
        if (indexName === 'latest-handoff.md') {
          const handoffPath = note.frontmatter.handoff_path;
          if (!handoffPath || !existsSync(handoffPath)) {
            results.healthy = false;
            results.issues.push({
              index: indexName,
              issue: 'broken_link',
              message: 'Handoff path is missing or invalid'
            });
          }
        }
      } catch (error) {
        results.healthy = false;
        results.issues.push({
          index: indexName,
          issue: 'read_error',
          message: error.message
        });
      }
    }

    return results;
  }

  /**
   * Check frontmatter completeness across all notes
   */
  async checkFrontmatter(options = {}) {
    const { sampleSize = 50 } = options;
    const folders = ['handoffs', 'sessions', 'phases'];
    
    const results = {
      healthy: true,
      checked: 0,
      invalid: [],
      summary: {}
    };

    for (const folder of folders) {
      const dir = this.config.getPath(folder);
      const paths = await this.adapter.listNotes(dir, { recursive: true });
      
      // Sample notes to check
      const sampled = paths.slice(0, Math.min(sampleSize, paths.length));
      
      for (const path of sampled) {
        results.checked++;
        
        try {
          const note = await this.adapter.readNote(path);
          const validation = validateFrontmatter(note.frontmatter);
          
          if (!validation.valid) {
            results.healthy = false;
            results.invalid.push({
              path,
              missing: validation.missing
            });
          }
        } catch (error) {
          results.healthy = false;
          results.invalid.push({
            path,
            error: error.message
          });
        }
      }
      
      results.summary[folder] = {
        total: paths.length,
        sampled: sampled.length
      };
    }

    return results;
  }

  /**
   * Attempt to fix common issues
   */
  async autoFix() {
    const fixed = [];

    // Create missing folders
    try {
      await this.config.ensureVaultStructure();
      fixed.push('Created missing folders');
    } catch (error) {
      // Already exists or permission error
    }

    return {
      fixed,
      message: fixed.length > 0 
        ? `Fixed ${fixed.length} issues`
        : 'No auto-fixable issues found'
    };
  }
}

export default DoctorService;
