#!/usr/bin/env node

import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const pluginDir = join(rootDir, 'plugin');
const distDir = join(rootDir, 'dist');

// Read plugin metadata
const pluginJsonPath = join(pluginDir, '.github', 'plugin', 'plugin.json');
const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
const { name, version } = pluginJson;

// Create dist directory if it doesn't exist
mkdirSync(distDir, { recursive: true });

// Output filename
const outputFilename = `${name}-${version}.tar.gz`;
const outputPath = join(distDir, outputFilename);

console.log(`Packaging plugin: ${name} v${version}`);
console.log(`Source: ${pluginDir}`);
console.log(`Output: ${outputPath}`);

// Use tar command to create archive
// Change to plugin directory and tar its contents
try {
  execSync(
    `tar -czf "${outputPath}" -C "${pluginDir}" .`,
    { stdio: 'inherit' }
  );
  
  console.log(`✓ Plugin packaged successfully!`);
  console.log(`  Artifact: ${outputFilename}`);
  console.log(`  Location: ${distDir}`);
} catch (error) {
  console.error('✗ Packaging failed:', error.message);
  process.exit(1);
}
