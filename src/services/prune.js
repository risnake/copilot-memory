import { unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Prune service for cleaning old notes
 */
export class PruneService {
  constructor(config, adapter) {
    this.config = config;
    this.adapter = adapter;
  }

  /**
   * Prune old notes
   */
  async prune(options = {}) {
    const {
      days = 30,
      dryRun = false,
      folders = ['handoffs', 'sessions']
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    // Add 1 second to ensure "days: 0" catches files created "now"
    if (days === 0) {
      cutoffDate.setSeconds(cutoffDate.getSeconds() + 1);
    }

    const results = {
      dryRun,
      cutoffDate: cutoffDate.toISOString(),
      days,
      candidates: [],
      deleted: [],
      errors: []
    };

    for (const folder of folders) {
      const dir = this.config.getPath(folder);
      const paths = await this.adapter.listNotes(dir, { recursive: true });

      for (const path of paths) {
        try {
          const stats = await this.adapter.getStats(path);
          
          if (stats && stats.mtime < cutoffDate) {
            results.candidates.push({
              path,
              mtime: stats.mtime.toISOString(),
              size: stats.size
            });

            if (!dryRun) {
              await unlink(path);
              results.deleted.push(path);
            }
          }
        } catch (error) {
          results.errors.push({
            path,
            error: error.message
          });
        }
      }
    }

    results.summary = {
      candidates: results.candidates.length,
      deleted: results.deleted.length,
      errors: results.errors.length
    };

    return results;
  }

  /**
   * Prune specific research notes
   */
  async pruneResearch(options = {}) {
    const {
      days = 90,
      dryRun = false,
      phaseId = null
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = {
      dryRun,
      cutoffDate: cutoffDate.toISOString(),
      days,
      candidates: [],
      deleted: [],
      errors: []
    };

    // Find research notes in phases
    const phasesDir = this.config.getPath('phases');
    let researchDirs = [];

    if (phaseId) {
      researchDirs.push(this.config.getPath('phases', phaseId, 'research'));
    } else {
      // Scan all phase research directories
      const phasePaths = await this.adapter.listNotes(phasesDir, {
        recursive: true,
        pattern: /phase\.md$/
      });

      for (const phasePath of phasePaths) {
        const phaseDir = phasePath.replace('/phase.md', '');
        researchDirs.push(join(phaseDir, 'research'));
      }
    }

    for (const dir of researchDirs) {
      try {
        const paths = await this.adapter.listNotes(dir, { recursive: false });

        for (const path of paths) {
          const stats = await this.adapter.getStats(path);
          
          if (stats && stats.mtime < cutoffDate) {
            results.candidates.push({
              path,
              mtime: stats.mtime.toISOString(),
              size: stats.size
            });

            if (!dryRun) {
              await unlink(path);
              results.deleted.push(path);
            }
          }
        }
      } catch (error) {
        // Research directory might not exist
        continue;
      }
    }

    results.summary = {
      candidates: results.candidates.length,
      deleted: results.deleted.length,
      errors: results.errors.length
    };

    return results;
  }

  /**
   * Get prune preview
   */
  async preview(days = 30) {
    return await this.prune({ days, dryRun: true });
  }
}

export default PruneService;
