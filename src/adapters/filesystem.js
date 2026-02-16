import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { parseFrontmatter, serializeFrontmatter } from '../utils/frontmatter.js';

/**
 * Filesystem adapter for note operations
 * Direct file system operations as fallback
 */
export class FilesystemAdapter {
  constructor(config) {
    this.config = config;
  }

  /**
   * Parse frontmatter from content (public method for notesmd adapter)
   */
  _parseFrontmatter(content) {
    return parseFrontmatter(content);
  }

  /**
   * Serialize note to markdown (public method for notesmd adapter)
   */
  _serializeNote(frontmatter, body) {
    return serializeFrontmatter(frontmatter, body);
  }

  /**
   * Create a new note
   */
  async createNote(path, frontmatter, body) {
    const content = serializeFrontmatter(frontmatter, body);
    const dir = path.substring(0, path.lastIndexOf('/'));
    
    await mkdir(dir, { recursive: true });
    await writeFile(path, content, 'utf-8');
    
    return { path, frontmatter, body };
  }

  /**
   * Read a note
   */
  async readNote(path) {
    if (!existsSync(path)) {
      throw new Error(`Note not found: ${path}`);
    }

    const content = await readFile(path, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    
    return { path, frontmatter, body };
  }

  /**
   * Update a note
   */
  async updateNote(path, frontmatter, body) {
    const content = serializeFrontmatter(frontmatter, body);
    await writeFile(path, content, 'utf-8');
    
    return { path, frontmatter, body };
  }

  /**
   * List notes in a directory
   */
  async listNotes(dir, options = {}) {
    const { recursive = false, pattern = null } = options;

    if (!existsSync(dir)) {
      return [];
    }

    const results = [];

    async function scan(currentDir) {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory() && recursive) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          if (!pattern || entry.name.match(pattern)) {
            results.push(fullPath);
          }
        }
      }
    }

    await scan(dir);
    return results;
  }

  /**
   * Search notes by content
   */
  async searchNotes(dir, query, options = {}) {
    const { recursive = true, caseSensitive = false } = options;
    const notes = await this.listNotes(dir, { recursive });
    const results = [];

    const searchRegex = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      caseSensitive ? 'g' : 'gi'
    );

    for (const notePath of notes) {
      try {
        const content = await readFile(notePath, 'utf-8');
        const matches = [...content.matchAll(searchRegex)];

        if (matches.length > 0) {
          const { frontmatter, body } = parseFrontmatter(content);
          results.push({
            path: notePath,
            frontmatter,
            matches: matches.length,
            preview: this._getPreview(body, matches[0].index)
          });
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return results;
  }

  /**
   * Get file statistics
   */
  async getStats(path) {
    if (!existsSync(path)) {
      return null;
    }
    return await stat(path);
  }

  /**
   * Check if file exists
   */
  exists(path) {
    return existsSync(path);
  }

  /**
   * Get a preview snippet around a match
   */
  _getPreview(text, matchIndex, contextLength = 100) {
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + contextLength);
    let preview = text.substring(start, end);

    if (start > 0) preview = '...' + preview;
    if (end < text.length) preview = preview + '...';

    return preview;
  }
}

export default FilesystemAdapter;
