#!/usr/bin/env node

/**
 * @fileoverview Analyze package dependencies to understand:
 * 1. What depends on each package and what each package depends on
 * 2. What specific imports are used from each dependency
 * 3. Whether dependencies are appropriate for separation of concerns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Read the dependency analysis JSON
const analysisPath = path.join(projectRoot, 'code-analysis/2025-06-25/dependency-graph/dependency-analysis.json');
if (!fs.existsSync(analysisPath)) {
  console.error('No dependency analysis found. Run "pnpm run analyze:all" first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

// Helper to get package name from path
function getPackageName(filePath) {
  const match = filePath.match(/^packages\/([^/]+)\//);
  if (match) return `@mmt/${match[1]}`;
  
  const appMatch = filePath.match(/^apps\/([^/]+)\//);
  if (appMatch) return `app:${appMatch[1]}`;
  
  return null;
}

// Build package-level dependency map
const packageDeps = {};
const packageImports = {}; // Track what specific things are imported

// Process all modules
for (const module of data.modules) {
  const sourcePackage = getPackageName(module.source);
  if (!sourcePackage) continue;
  
  // Skip test files
  if (module.source.includes('.test.') || module.source.includes('/test/')) continue;
  
  if (!packageDeps[sourcePackage]) {
    packageDeps[sourcePackage] = {
      dependsOn: new Set(),
      dependedOnBy: new Set(),
      internal: {
        files: 0,
        dependencies: 0
      }
    };
  }
  
  packageDeps[sourcePackage].internal.files++;
  
  // Process dependencies
  for (const dep of module.dependencies) {
    const targetPackage = getPackageName(dep.resolved);
    
    if (targetPackage && targetPackage !== sourcePackage) {
      // Track package-level dependency
      packageDeps[sourcePackage].dependsOn.add(targetPackage);
      
      // Track what's being imported
      const importKey = `${sourcePackage} -> ${targetPackage}`;
      if (!packageImports[importKey]) {
        packageImports[importKey] = {
          imports: new Set(),
          files: new Set()
        };
      }
      
      // Extract what's being imported
      let importDetails = 'default import';
      if (dep.dependencyTypes && dep.dependencyTypes.includes('type')) {
        importDetails = 'type import';
      }
      
      // Try to get more specific import info from the module
      const importingFile = module.source.split('/').pop();
      const importedFile = dep.resolved.split('/').pop();
      
      packageImports[importKey].imports.add(`${importingFile} imports from ${importedFile}`);
      packageImports[importKey].files.add(module.source);
    } else if (targetPackage === sourcePackage) {
      packageDeps[sourcePackage].internal.dependencies++;
    }
  }
}

// Build reverse dependencies
for (const [pkg, deps] of Object.entries(packageDeps)) {
  for (const dep of deps.dependsOn) {
    if (packageDeps[dep]) {
      packageDeps[dep].dependedOnBy.add(pkg);
    }
  }
}

// Convert Sets to Arrays for output
for (const pkg of Object.values(packageDeps)) {
  pkg.dependsOn = Array.from(pkg.dependsOn).sort();
  pkg.dependedOnBy = Array.from(pkg.dependedOnBy).sort();
}

// Generate report
let report = `# Package Dependency Analysis

Generated: ${new Date().toISOString()}

## 1. Package Dependency Summary

| Package | Depends On | Depended On By | Internal Files | Internal Deps |
|---------|------------|----------------|----------------|---------------|
`;

// Sort packages by number of dependents (most depended on first)
const sortedPackages = Object.entries(packageDeps)
  .sort((a, b) => b[1].dependedOnBy.length - a[1].dependedOnBy.length);

for (const [pkg, deps] of sortedPackages) {
  const dependsOn = deps.dependsOn.length > 0 ? deps.dependsOn.join(', ') : '_none_';
  const dependedOnBy = deps.dependedOnBy.length > 0 ? deps.dependedOnBy.join(', ') : '_none_';
  report += `| ${pkg} | ${dependsOn} | ${dependedOnBy} | ${deps.internal.files} | ${deps.internal.dependencies} |\n`;
}

// Section 2: Detailed import analysis
report += `\n## 2. What Each Package Imports From Its Dependencies\n\n`;

const sortedImports = Object.entries(packageImports).sort();
let currentSource = '';

for (const [importPath, details] of sortedImports) {
  const [source, target] = importPath.split(' -> ');
  
  if (source !== currentSource) {
    if (currentSource) report += '\n';
    report += `### ${source}\n\n`;
    currentSource = source;
  }
  
  report += `**From ${target}:**\n`;
  report += `- Used in ${details.files.size} file(s)\n`;
  report += `- Import patterns:\n`;
  
  // Show first 5 import patterns as examples
  const imports = Array.from(details.imports).slice(0, 5);
  for (const imp of imports) {
    report += `  - ${imp}\n`;
  }
  
  if (details.imports.size > 5) {
    report += `  - ...(${details.imports.size - 5} more)\n`;
  }
  report += '\n';
}

// Section 3: Architecture Analysis
report += `## 3. Architecture Analysis & Recommendations\n\n`;

// Analyze for common issues
const issues = [];

// Check for circular dependencies (simplified check)
for (const [pkg, deps] of Object.entries(packageDeps)) {
  for (const dep of deps.dependsOn) {
    if (packageDeps[dep] && packageDeps[dep].dependsOn.includes(pkg)) {
      issues.push(`⚠️ Potential circular dependency: ${pkg} <-> ${dep}`);
    }
  }
}

// Check for packages that depend on too many others
for (const [pkg, deps] of Object.entries(packageDeps)) {
  if (deps.dependsOn.length > 5) {
    issues.push(`⚠️ High coupling: ${pkg} depends on ${deps.dependsOn.length} packages`);
  }
}

// Check for violations of architectural principles
const allowedDependencies = {
  '@mmt/entities': [], // Should not depend on anything
  '@mmt/filesystem-access': ['@mmt/entities'],
  '@mmt/config': ['@mmt/entities', '@mmt/filesystem-access'],
  '@mmt/query-parser': ['@mmt/entities'],
  '@mmt/indexer': ['@mmt/entities', '@mmt/filesystem-access'],
  '@mmt/document-operations': ['@mmt/entities', '@mmt/filesystem-access', '@mmt/indexer'],
  '@mmt/core-operations': ['@mmt/entities', '@mmt/filesystem-access', '@mmt/query-parser'],
  '@mmt/scripting': ['@mmt/entities', '@mmt/filesystem-access', '@mmt/indexer', '@mmt/query-parser', '@mmt/document-operations'],
  '@mmt/document-set': ['@mmt/entities']
};

for (const [pkg, deps] of Object.entries(packageDeps)) {
  if (allowedDependencies[pkg]) {
    const violations = deps.dependsOn.filter(dep => !allowedDependencies[pkg].includes(dep));
    if (violations.length > 0) {
      issues.push(`❌ Architecture violation: ${pkg} should not depend on ${violations.join(', ')}`);
    }
  }
}

// Check for missing expected dependencies
if (!packageDeps['@mmt/document-operations'].dependsOn.includes('@mmt/filesystem-access')) {
  issues.push(`❌ Missing dependency: @mmt/document-operations should use @mmt/filesystem-access for file operations`);
}

report += `### Issues Found\n\n`;
if (issues.length > 0) {
  for (const issue of issues) {
    report += `${issue}\n`;
  }
} else {
  report += `✅ No major architectural issues found.\n`;
}

// Recommendations based on dependency count
report += `\n### Dependency Metrics\n\n`;
report += `| Package | Afferent Coupling | Efferent Coupling | Instability |\n`;
report += `|---------|------------------|-------------------|-------------|\n`;

for (const [pkg, deps] of sortedPackages) {
  const ca = deps.dependedOnBy.length; // Afferent coupling (incoming)
  const ce = deps.dependsOn.length;     // Efferent coupling (outgoing)
  const instability = ca + ce > 0 ? (ce / (ca + ce)).toFixed(2) : 'N/A';
  
  report += `| ${pkg} | ${ca} | ${ce} | ${instability} |\n`;
}

report += `\n**Metrics Explanation:**\n`;
report += `- **Afferent Coupling (Ca)**: Number of packages that depend on this package\n`;
report += `- **Efferent Coupling (Ce)**: Number of packages this package depends on\n`;
report += `- **Instability (I)**: Ce / (Ca + Ce) - ranges from 0 (stable) to 1 (unstable)\n`;
report += `  - 0 = Maximally stable (many depend on it, it depends on nothing)\n`;
report += `  - 1 = Maximally unstable (nothing depends on it, it depends on many)\n`;

// Layer analysis
report += `\n### Suggested Package Layers\n\n`;
report += `Based on the dependency analysis, here's the suggested layered architecture:\n\n`;
report += `\`\`\`\n`;
report += `Layer 0 (Core - No dependencies):\n`;
report += `  - @mmt/entities (schemas/contracts)\n`;
report += `  - @mmt/filesystem-access (file system abstraction)\n\n`;
report += `Layer 1 (Foundation - Depends only on Layer 0):\n`;
report += `  - @mmt/config\n`;
report += `  - @mmt/query-parser\n`;
report += `  - @mmt/document-set\n\n`;
report += `Layer 2 (Services - Depends on Layers 0-1):\n`;
report += `  - @mmt/indexer\n`;
report += `  - @mmt/core-operations\n\n`;
report += `Layer 3 (Operations - Depends on Layers 0-2):\n`;
report += `  - @mmt/document-operations\n\n`;
report += `Layer 4 (Applications - Can depend on all layers):\n`;
report += `  - @mmt/scripting\n`;
report += `  - app:cli\n`;
report += `\`\`\`\n`;

// Write report
const reportPath = path.join(projectRoot, 'code-analysis/2025-06-25/package-dependency-report.md');
fs.writeFileSync(reportPath, report);

console.log(`\nPackage dependency report generated: ${reportPath}`);

// Also output a summary to console
console.log('\n=== Quick Summary ===\n');
console.log('Most depended-on packages:');
sortedPackages.slice(0, 5).forEach(([pkg, deps]) => {
  console.log(`  ${pkg}: ${deps.dependedOnBy.length} dependents`);
});

console.log('\nPackages with most dependencies:');
Object.entries(packageDeps)
  .sort((a, b) => b[1].dependsOn.length - a[1].dependsOn.length)
  .slice(0, 5)
  .forEach(([pkg, deps]) => {
    console.log(`  ${pkg}: depends on ${deps.dependsOn.length} packages`);
  });

if (issues.length > 0) {
  console.log(`\n⚠️  Found ${issues.length} architectural issues - see report for details`);
}