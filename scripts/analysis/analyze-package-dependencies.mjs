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
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
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

// Main analysis function
async function analyzePackageDependencies() {
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

// Section 2 removed - not adding value

// Section 2: Architecture Analysis  
report += `## 2. Architecture Analysis & Recommendations\n\n`;

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

// Helper function to create visual bars
function createBar(count, maxCount = 10, char = '█') {
  if (count === 0) return '·';
  const normalized = Math.min(count, maxCount);
  return char.repeat(normalized);
}

// Recommendations based on dependency count
report += `\n### Dependency Metrics\n\n`;

// Find max values for normalization
let maxCa = 0, maxCe = 0;
for (const [, deps] of sortedPackages) {
  maxCa = Math.max(maxCa, deps.dependedOnBy.length);
  maxCe = Math.max(maxCe, deps.dependsOn.length);
}

report += `| Package | Afferent Coupling | Efferent Coupling | Instability |\n`;
report += `|---------|------------------|-------------------|-------------|\n`;

for (const [pkg, deps] of sortedPackages) {
  const ca = deps.dependedOnBy.length; // Afferent coupling (incoming)
  const ce = deps.dependsOn.length;     // Efferent coupling (outgoing)
  const instability = ca + ce > 0 ? (ce / (ca + ce)).toFixed(2) : 'N/A';
  
  // Create visual representations
  const caBar = createBar(ca, maxCa, '▮');
  const ceBar = createBar(ce, maxCe, '▮');
  
  // Color-code instability
  let stabilityIndicator = instability;
  if (instability !== 'N/A') {
    const val = parseFloat(instability);
    if (val === 0) stabilityIndicator = `✅ ${instability}`;
    else if (val <= 0.3) stabilityIndicator = `🟢 ${instability}`;
    else if (val <= 0.7) stabilityIndicator = `🟡 ${instability}`;
    else stabilityIndicator = `🔴 ${instability}`;
  }
  
  report += `| ${pkg} | ${ca} ${caBar} | ${ce} ${ceBar} | ${stabilityIndicator} |\n`;
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

// Generate DOT file for layer diagram
let dotContent = `digraph PackageLayers {
  rankdir=TB;
  node [shape=box, style="rounded,filled", fontname="Arial"];
  edge [color="#666666"];
  
  // Define layers with subgraphs
  subgraph cluster_0 {
    label="Layer 0: Core (No dependencies)";
    style=filled;
    fillcolor="#e8f4fd";
    color="#1f77b4";
    fontsize=14;
    fontname="Arial Bold";
    
    entities [label="@mmt/entities\\n(schemas/contracts)", fillcolor="#ffffff"];
    filesystem [label="@mmt/filesystem-access\\n(file system abstraction)", fillcolor="#ffffff"];
  }
  
  subgraph cluster_1 {
    label="Layer 1: Foundation";
    style=filled;
    fillcolor="#d4e8fc";
    color="#1f77b4";
    fontsize=14;
    fontname="Arial Bold";
    
    config [label="@mmt/config", fillcolor="#ffffff"];
    queryparser [label="@mmt/query-parser", fillcolor="#ffffff"];
    documentset [label="@mmt/document-set", fillcolor="#ffffff"];
  }
  
  subgraph cluster_2 {
    label="Layer 2: Services";
    style=filled;
    fillcolor="#c0dcfb";
    color="#1f77b4";
    fontsize=14;
    fontname="Arial Bold";
    
    indexer [label="@mmt/indexer", fillcolor="#ffffff"];
    coreops [label="@mmt/core-operations", fillcolor="#ffffff"];
  }
  
  subgraph cluster_3 {
    label="Layer 3: Operations";
    style=filled;
    fillcolor="#acd0fa";
    color="#1f77b4";
    fontsize=14;
    fontname="Arial Bold";
    
    docops [label="@mmt/document-operations", fillcolor="#ffffff"];
  }
  
  subgraph cluster_4 {
    label="Layer 4: Applications";
    style=filled;
    fillcolor="#98c4f9";
    color="#1f77b4";
    fontsize=14;
    fontname="Arial Bold";
    
    scripting [label="@mmt/scripting", fillcolor="#ffffff"];
    cli [label="app:cli", fillcolor="#ffffff"];
  }
  
  // Add actual dependencies as edges
  config -> entities;
  queryparser -> entities;
  documentset -> entities;
  
  indexer -> entities;
  indexer -> filesystem;
  
  coreops -> entities;
  coreops -> filesystem;
  coreops -> queryparser;
  
  docops -> entities;
  docops -> filesystem;
  docops -> indexer;
  
  scripting -> entities;
  scripting -> filesystem;
  scripting -> queryparser;
  scripting -> indexer;
  scripting -> docops;
  
  cli -> entities;
  cli -> filesystem;
  cli -> queryparser;
  cli -> config;
  cli -> scripting;
}`;

// Write DOT file
const dotPath = path.join(projectRoot, 'code-analysis/2025-06-25/package-layers.dot');
fs.writeFileSync(dotPath, dotContent);

// Generate SVG
try {
  await execAsync(`dot -Tsvg ${dotPath} -o ${dotPath.replace('.dot', '.svg')}`);
  report += `![Package Layers Diagram](./package-layers.svg)\n\n`;
  report += `_[View full diagram](./package-layers.svg)_\n\n`;
} catch (error) {
  console.warn('Could not generate layer diagram:', error.message);
  report += `_Layer diagram generation failed. Install graphviz to generate the diagram._\n\n`;
}

report += `#### Layer Descriptions:\n\n`;
report += `- **Layer 0 (Core)**: No dependencies, used by all other layers\n`;
report += `- **Layer 1 (Foundation)**: Basic services that depend only on core\n`;
report += `- **Layer 2 (Services)**: Business logic services\n`;
report += `- **Layer 3 (Operations)**: Complex operations that orchestrate services\n`;
report += `- **Layer 4 (Applications)**: End-user applications\n`;

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
}

// Run the analysis
analyzePackageDependencies().catch(console.error);