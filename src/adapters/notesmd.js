import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { FilesystemAdapter } from './filesystem.js';

/**
 * NotesMD CLI adapter with filesystem fallback
 * Wraps notesmd-cli commands with error handling
 */
export class NotesMDAdapter {
  constructor(config) {
    this.config = config;
    this.fsAdapter = new FilesystemAdapter(config);
    this.notesmdAvailable = null;
  }

  /**
   * Check if notesmd-cli is available
   */
  async checkAvailability() {
    if (this.notesmdAvailable !== null) {
      return this.notesmdAvailable;
    }

    if (!this.config.useNotesmd) {
      this.notesmdAvailable = false;
      return false;
    }

    try {
      await this._runCommand(['--version']);
      this.notesmdAvailable = true;
      return true;
    } catch (error) {
      console.warn(`Warning: notesmd not available (${error.message}), using filesystem fallback`);
      this.notesmdAvailable = false;
      return false;
    }
  }

  /**
   * Create a new note
   * Tries notesmd-cli first, falls back to filesystem
   */
  async createNote(path, frontmatter, body) {
    const available = await this.checkAvailability();
    
    if (available) {
      try {
        // Try using notesmd-cli create command
        const content = this.fsAdapter._serializeNote(frontmatter, body);
        const args = ['create', path];
        const result = await this._runCommand(args, content);
        return { path, frontmatter, body };
      } catch (error) {
        console.warn(`Warning: notesmd-cli create failed (${error.message}), using filesystem fallback`);
      }
    }
    
    return await this.fsAdapter.createNote(path, frontmatter, body);
  }

  /**
   * Read a note
   * Tries notesmd-cli first, falls back to filesystem
   */
  async readNote(path) {
    const available = await this.checkAvailability();
    
    if (available) {
      try {
        // Try using notesmd-cli print command
        const args = ['print', path];
        const result = await this._runCommand(args);
        return this._parseNote(result.stdout, path);
      } catch (error) {
        console.warn(`Warning: notesmd-cli print failed (${error.message}), using filesystem fallback`);
      }
    }
    
    return await this.fsAdapter.readNote(path);
  }

  /**
   * Update a note
   * Falls back to filesystem (notesmd-cli doesn't have reliable update command)
   */
  async updateNote(path, frontmatter, body) {
    // notesmd-cli doesn't have a reliable 'update' command
    // Always use filesystem for updates
    console.warn('Warning: notesmd-cli does not support update operation, using filesystem');
    return await this.fsAdapter.updateNote(path, frontmatter, body);
  }

  /**
   * List notes in a directory
   * Falls back to filesystem (notesmd-cli list doesn't support recursive/pattern options reliably)
   */
  async listNotes(dir, options = {}) {
    const available = await this.checkAvailability();
    
    if (available && !options.recursive && !options.pattern) {
      try {
        // Basic list without options might work
        const args = ['list', dir];
        const result = await this._runCommand(args);
        return this._parseList(result.stdout);
      } catch (error) {
        console.warn(`Warning: notesmd-cli list failed (${error.message}), using filesystem fallback`);
      }
    } else if (available && (options.recursive || options.pattern)) {
      console.warn('Warning: notesmd-cli does not reliably support recursive/pattern filtering, using filesystem fallback');
    }

    return await this.fsAdapter.listNotes(dir, options);
  }

  /**
   * Search notes by content
   * Tries notesmd-cli first, falls back to filesystem
   */
  async searchNotes(dir, query, options = {}) {
    const available = await this.checkAvailability();
    
    if (available) {
      try {
        // Use search-content command if available
        const args = ['search-content', dir, query];
        if (options.caseSensitive) args.push('--case-sensitive');

        const result = await this._runCommand(args);
        return this._parseSearchResults(result.stdout);
      } catch (error) {
        console.warn(`Warning: notesmd-cli search-content failed (${error.message}), using filesystem fallback`);
      }
    }

    return await this.fsAdapter.searchNotes(dir, query, options);
  }

  /**
   * Get file statistics (delegates to filesystem)
   */
  async getStats(path) {
    return await this.fsAdapter.getStats(path);
  }

  /**
   * Check if file exists (delegates to filesystem)
   */
  exists(path) {
    return this.fsAdapter.exists(path);
  }

  /**
   * Parse note content from notesmd output
   */
  _parseNote(content, path) {
    const { frontmatter, body } = this.fsAdapter._parseFrontmatter(content);
    return { path, frontmatter, body };
  }

  /**
   * Run a notesmd-cli command
   */
  async _runCommand(args, input = null) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.config.notesmdPath, args, {
        env: process.env,
        cwd: this.config.vaultPath
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`notesmd-cli exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }
    });
  }

  /**
   * Parse list command output
   */
  _parseList(output) {
    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());
  }

  /**
   * Parse search command output
   */
  _parseSearchResults(output) {
    // Expected format: path:line:content
    const results = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, path, lineNum, content] = match;
        results.push({
          path,
          line: parseInt(lineNum, 10),
          preview: content.trim()
        });
      }
    }

    return results;
  }
}

export default NotesMDAdapter;
