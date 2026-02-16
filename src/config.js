import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { mkdir } from 'fs/promises';

/**
 * Configuration manager for copilot-memory
 * Handles vault path resolution, environment variables, and folder structure
 */
export class Config {
  constructor(options = {}) {
    // Load config hierarchy: options > env > config file > defaults
    const projectConfig = this._loadProjectConfig();
    const envConfig = this._loadEnvConfig();
    
    this.vaultPath = options.vaultPath || 
                     envConfig.vaultPath ||
                     projectConfig.vaultPath ||
                     join(process.cwd(), '.copilot-memory-vault');
    
    this.notesmdPath = options.notesmdPath || 
                      envConfig.notesmdPath ||
                      projectConfig.notesmdPath ||
                      'notesmd-cli';
    
    this.useNotesmd = options.useNotesmd !== undefined 
                      ? options.useNotesmd 
                      : (projectConfig.useNotesmd !== undefined 
                         ? projectConfig.useNotesmd 
                         : true);
  }

  /**
   * Load config from .copilot-memory/config.json if it exists
   */
  _loadProjectConfig() {
    const configPath = join(process.cwd(), '.copilot-memory', 'config.json');
    if (existsSync(configPath)) {
      try {
        const data = readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.warn(`Warning: Failed to parse config file: ${error.message}`);
      }
    }
    return {};
  }

  /**
   * Load config from environment variables
   */
  _loadEnvConfig() {
    return {
      vaultPath: process.env.COPILOT_MEMORY_VAULT,
      notesmdPath: process.env.COPILOT_MEMORY_NOTESMD_PATH,
    };
  }

  /**
   * Get the full path to a vault subfolder
   */
  getPath(...segments) {
    return join(this.vaultPath, ...segments);
  }

  /**
   * Get dated folder structure (e.g., handoffs/2024/01)
   */
  getDatedPath(baseFolder, date = new Date()) {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return this.getPath(baseFolder, year, month);
  }

  /**
   * Ensure all required vault folders exist
   */
  async ensureVaultStructure() {
    const folders = [
      'handoffs',
      'sessions',
      'phases',
      'indexes',
      'templates'
    ];

    for (const folder of folders) {
      const path = this.getPath(folder);
      await mkdir(path, { recursive: true });
    }
  }

  /**
   * Check if vault exists
   */
  vaultExists() {
    return existsSync(this.vaultPath);
  }

  /**
   * Generate a standardized filename
   * Format: YYYYMMDD-HHmmssZ--<type>--<scope>--<slug>.md
   */
  generateFilename(type, scope, slug, date = new Date()) {
    const iso = date.toISOString();
    // Format: YYYYMMDD-HHmmssZ
    const timestamp = iso.substring(0, 10).replace(/-/g, '') + '-' + 
                     iso.substring(11, 19).replace(/:/g, '') + 'Z';
    
    const sanitizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${timestamp}--${type}--${scope}--${sanitizedSlug}.md`;
  }

  /**
   * Parse a standardized filename into components
   */
  parseFilename(filename) {
    // Match: YYYYMMDD-HHmmssZ--type--scope--slug.md
    // Use non-greedy match for parts separated by --
    const match = filename.match(/^(\d{8}-\d{6}Z)--(.+?)--(.+?)--(.+)\.md$/);
    if (!match) return null;

    const [, timestamp, type, scope, slug] = match;
    
    // Parse timestamp into Date
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    const second = timestamp.substring(13, 15);
    const isoStr = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    
    return { 
      timestamp, 
      type, 
      scope, 
      slug,
      date: new Date(isoStr)
    };
  }
}

export default Config;
