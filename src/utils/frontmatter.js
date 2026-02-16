import { randomUUID } from 'crypto';

/**
 * Utilities for working with Markdown frontmatter
 */

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;
  const frontmatter = {};

  // Simple YAML parser for our needs
  const lines = frontmatterText.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Array item
    if (line.match(/^\s*-\s+/)) {
      const value = line.replace(/^\s*-\s+/, '').trim();
      if (currentArray) {
        currentArray.push(value);
      }
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key.trim();
      
      if (value.trim() === '') {
        // Start of array
        currentArray = [];
        frontmatter[currentKey] = currentArray;
      } else {
        // Regular value
        frontmatter[currentKey] = value.trim();
        currentArray = null;
      }
    }
  }

  return { frontmatter, body: body.trim() };
}

/**
 * Serialize frontmatter and body into markdown
 */
export function serializeFrontmatter(frontmatter, body) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(body);

  return lines.join('\n');
}

/**
 * Create standard frontmatter for a note
 */
export function createFrontmatter(type, options = {}) {
  const now = new Date().toISOString();
  
  return {
    id: options.id || randomUUID(),
    type,
    created_at: options.created_at || now,
    updated_at: options.updated_at || now,
    session_id: options.session_id || null,
    phase_id: options.phase_id || null,
    status: options.status || 'active',
    tags: options.tags || [],
    links: options.links || [],
    ...options.extra
  };
}

/**
 * Validate frontmatter has required fields
 */
export function validateFrontmatter(frontmatter) {
  const required = ['id', 'type', 'created_at', 'updated_at', 'session_id', 'phase_id', 'status', 'tags', 'links'];
  const missing = [];

  for (const field of required) {
    if (!(field in frontmatter)) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Extract all markdown links from content
 */
export function extractLinks(content) {
  const links = [];
  
  // Match [[wikilinks]]
  const wikilinks = content.matchAll(/\[\[([^\]]+)\]\]/g);
  for (const match of wikilinks) {
    links.push({ type: 'wikilink', target: match[1] });
  }

  // Match [text](url) links
  const mdlinks = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
  for (const match of mdlinks) {
    links.push({ type: 'markdown', text: match[1], url: match[2] });
  }

  return links;
}

export default {
  parseFrontmatter,
  serializeFrontmatter,
  createFrontmatter,
  validateFrontmatter,
  extractLinks
};
