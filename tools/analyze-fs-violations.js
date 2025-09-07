#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Node fs methods that should only be in filesystem-access package
const fsPatterns = [
  { pattern: /\bfs\./, name: 'fs.' },
  { pattern: /\breadFile(?:Sync)?\(/, name: 'readFile' },
  { pattern: /\bwriteFile(?:Sync)?\(/, name: 'writeFile' },
  { pattern: /\breaddir(?:Sync)?\(/, name: 'readdir' },
  { pattern: /\bmkdir(?:Sync)?\(/, name: 'mkdir' },
  { pattern: /\brmdir(?:Sync)?\(/, name: 'rmdir' },
  { pattern: /\bunlink(?:Sync)?\(/, name: 'unlink' },
  { pattern: /\bexists(?:Sync)?\(/, name: 'exists' },
  { pattern: /\bstat(?:Sync)?\(/, name: 'stat' },
  { pattern: /\baccess(?:Sync)?\(/, name: 'access' }
];

function getAllFiles() {
  const files = [];
  const walk = (dir) => {
    // Skip certain directories
    if (dir.includes('node_modules') || 
        dir.includes('.git') || 
        dir.includes('dist') || 
        dir.includes('build') ||
        dir.includes('.turbo') ||
        dir.includes('coverage')) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && 
                 (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || 
                  entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        files.push(fullPath);
      }
    }
  };

  walk(projectRoot);
  return files;
}

function analyzeViolations() {
  const files = getAllFiles();
  const violations = new Map();
  const stats = {
    total: 0,
    byPackage: new Map(),
    byMethod: new Map(),
    testFiles: 0,
    productionFiles: 0
  };

  for (const file of files) {
    // Skip filesystem-access package itself and tools
    if (file.includes('packages/filesystem-access') || 
        file.includes('/tools/')) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(projectRoot, file);
    const isTestFile = file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__');
    
    lines.forEach((line, index) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') || 
          line.trim().startsWith('*') ||
          line.includes('import ') ||
          line.includes('require(')) {
        return;
      }
      
      for (const { pattern, name } of fsPatterns) {
        if (pattern.test(line)) {
          if (!violations.has(relativePath)) {
            violations.set(relativePath, []);
          }
          
          violations.get(relativePath).push({
            line: index + 1,
            content: line.trim(),
            method: name
          });
          
          // Update stats
          stats.total++;
          stats.byMethod.set(name, (stats.byMethod.get(name) || 0) + 1);
          
          if (isTestFile) {
            stats.testFiles++;
          } else {
            stats.productionFiles++;
          }
          
          // Determine package
          const packageMatch = relativePath.match(/^(apps|packages)\/([^/]+)/);
          if (packageMatch) {
            const pkgName = `${packageMatch[1]}/${packageMatch[2]}`;
            stats.byPackage.set(pkgName, (stats.byPackage.get(pkgName) || 0) + 1);
          }
          
          break; // Only report once per line
        }
      }
    });
  }

  return { violations, stats };
}

// Main execution
console.log('Analyzing filesystem access violations...\n');

const { violations, stats } = analyzeViolations();

console.log('=== SUMMARY ===');
console.log(`Total violations: ${stats.total}`);
console.log(`Test files: ${stats.testFiles}`);
console.log(`Production files: ${stats.productionFiles}`);
console.log('');

console.log('=== BY PACKAGE ===');
const sortedPackages = Array.from(stats.byPackage.entries())
  .sort((a, b) => b[1] - a[1]);
for (const [pkg, count] of sortedPackages) {
  console.log(`${pkg}: ${count} violations`);
}
console.log('');

console.log('=== BY METHOD ===');
const sortedMethods = Array.from(stats.byMethod.entries())
  .sort((a, b) => b[1] - a[1]);
for (const [method, count] of sortedMethods) {
  console.log(`${method}: ${count} violations`);
}
console.log('');

console.log('=== PRODUCTION FILES WITH VIOLATIONS ===');
for (const [file, fileViolations] of violations.entries()) {
  if (!file.includes('.test.') && !file.includes('.spec.') && !file.includes('__tests__')) {
    console.log(`\n${file}:`);
    for (const v of fileViolations) {
      console.log(`  Line ${v.line}: ${v.method} - ${v.content.substring(0, 80)}${v.content.length > 80 ? '...' : ''}`);
    }
  }
}