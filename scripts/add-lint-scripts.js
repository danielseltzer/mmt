#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

// Find all package.json files
const packageJsonFiles = await glob([
  'packages/*/package.json',
  'apps/*/package.json'
]);

console.log(`Found ${packageJsonFiles.length} package.json files to update`);

for (const file of packageJsonFiles) {
  const content = readFileSync(file, 'utf-8');
  const pkg = JSON.parse(content);
  
  // Add lint script if it doesn't exist
  if (!pkg.scripts.lint) {
    pkg.scripts.lint = 'eslint src';
    
    // Sort scripts alphabetically
    pkg.scripts = Object.keys(pkg.scripts)
      .sort()
      .reduce((acc, key) => {
        acc[key] = pkg.scripts[key];
        return acc;
      }, {});
    
    // Write back with proper formatting
    writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✓ Updated ${file}`);
  } else {
    console.log(`- Skipped ${file} (already has lint script)`);
  }
}

console.log('\nDone! All packages now have lint scripts.');