#!/usr/bin/env node

/**
 * @fileoverview Analyze what specific exports each package uses from its dependencies
 * This helps understand coupling and identify opportunities for interface segregation
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

async function findImports(sourceFile, targetPackage) {
  try {
    const content = fs.readFileSync(path.join(projectRoot, sourceFile), 'utf-8');
    
    // Match various import patterns
    const importRegex = new RegExp(
      `import\\s+(?:{([^}]+)}|([\\w]+)|\\*\\s+as\\s+([\\w]+))\\s+from\\s+['"]${targetPackage}(?:/[^'"]*)?['"]`,
      'g'
    );
    
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        // Named imports: import { A, B } from 'package'
        const names = match[1].split(',').map(s => s.trim());
        imports.push(...names.map(name => {
          const parts = name.split(/\s+as\s+/);
          return {
            type: 'named',
            imported: parts[0].trim(),
            local: parts[1]?.trim() || parts[0].trim()
          };
        }));
      } else if (match[2]) {
        // Default import: import Something from 'package'
        imports.push({
          type: 'default',
          imported: 'default',
          local: match[2]
        });
      } else if (match[3]) {
        // Namespace import: import * as Something from 'package'
        imports.push({
          type: 'namespace',
          imported: '*',
          local: match[3]
        });
      }
    }
    
    // Also check for type imports
    const typeImportRegex = new RegExp(
      `import\\s+type\\s+(?:{([^}]+)}|([\\w]+))\\s+from\\s+['"]${targetPackage}(?:/[^'"]*)?['"]`,
      'g'
    );
    
    while ((match = typeImportRegex.exec(content)) !== null) {
      if (match[1]) {
        const names = match[1].split(',').map(s => s.trim());
        imports.push(...names.map(name => ({
          type: 'type',
          imported: name,
          local: name
        })));
      } else if (match[2]) {
        imports.push({
          type: 'type',
          imported: match[2],
          local: match[2]
        });
      }
    }
    
    return imports;
  } catch (error) {
    return [];
  }
}

async function analyzeImports() {
  // Read the dependency analysis
  const analysisPath = path.join(projectRoot, 'code-analysis/2025-06-25/dependency-graph/dependency-analysis.json');
  if (!fs.existsSync(analysisPath)) {
    console.error('No dependency analysis found. Run "pnpm run analyze:all" first.');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  
  // Build detailed import map
  const importMap = {};
  
  for (const module of data.modules) {
    // Skip test files
    if (module.source.includes('.test.') || module.source.includes('/test/')) continue;
    
    for (const dep of module.dependencies) {
      // Only process local package dependencies
      if (dep.module.startsWith('@mmt/') || dep.module.startsWith('packages/')) {
        const targetPackage = dep.module.startsWith('@mmt/') ? dep.module : '@mmt/' + dep.module.split('/')[1];
        const imports = await findImports(module.source, targetPackage);
        
        if (imports.length > 0) {
          const key = `${module.source} -> ${targetPackage}`;
          importMap[key] = imports;
        }
      }
    }
  }
  
  // Aggregate by package
  const packageImports = {};
  
  for (const [key, imports] of Object.entries(importMap)) {
    const [source, target] = key.split(' -> ');
    const sourcePackage = source.match(/packages\/([^/]+)\//)?.[1];
    const targetPackage = target.replace('@mmt/', '');
    
    if (sourcePackage && targetPackage && sourcePackage !== targetPackage) {
      const pkgKey = `@mmt/${sourcePackage} -> @mmt/${targetPackage}`;
      
      if (!packageImports[pkgKey]) {
        packageImports[pkgKey] = {
          imports: new Map(),
          files: []
        };
      }
      
      packageImports[pkgKey].files.push(source);
      
      for (const imp of imports) {
        const importKey = `${imp.type}:${imp.imported}`;
        const count = packageImports[pkgKey].imports.get(importKey) || 0;
        packageImports[pkgKey].imports.set(importKey, count + 1);
      }
    }
  }
  
  // Generate report
  let report = `# Detailed Import Analysis\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Sort by source package
  const sortedKeys = Object.keys(packageImports).sort();
  
  for (const key of sortedKeys) {
    const [source, target] = key.split(' -> ');
    const data = packageImports[key];
    
    report += `## ${source} imports from ${target}\n\n`;
    report += `Used in ${data.files.length} file(s)\n\n`;
    report += `### Imported Items:\n\n`;
    report += `| Type | Import | Usage Count |\n`;
    report += `|------|--------|-------------|\n`;
    
    // Sort imports by usage count
    const sortedImports = Array.from(data.imports.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [importKey, count] of sortedImports) {
      const [type, imported] = importKey.split(':');
      const typeLabel = type === 'type' ? '🔷 Type' : type === 'named' ? '📦 Named' : type === 'default' ? '📄 Default' : '🌐 Namespace';
      report += `| ${typeLabel} | ${imported} | ${count} |\n`;
    }
    
    report += `\n### Source Files:\n`;
    for (const file of data.files) {
      report += `- ${file}\n`;
    }
    report += `\n---\n\n`;
  }
  
  // Add summary of most imported items
  report += `## Most Imported Items Across All Packages\n\n`;
  
  const allImports = new Map();
  for (const [key, data] of Object.entries(packageImports)) {
    const [, target] = key.split(' -> ');
    for (const [importKey, count] of data.imports) {
      const fullKey = `${target}:${importKey}`;
      allImports.set(fullKey, (allImports.get(fullKey) || 0) + count);
    }
  }
  
  const topImports = Array.from(allImports.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  report += `| Package | Type | Import | Total Usage |\n`;
  report += `|---------|------|--------|-------------|\n`;
  
  for (const [key, count] of topImports) {
    const [pkg, type, imported] = key.split(':');
    const typeLabel = type === 'type' ? '🔷' : type === 'named' ? '📦' : type === 'default' ? '📄' : '🌐';
    report += `| ${pkg} | ${typeLabel} | ${imported} | ${count} |\n`;
  }
  
  // Write report
  const reportPath = path.join(projectRoot, 'code-analysis/2025-06-25/import-analysis.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\nDetailed import analysis generated: ${reportPath}`);
  
  // Output summary
  console.log('\n=== Import Summary ===\n');
  console.log('Top 5 most imported items:');
  topImports.slice(0, 5).forEach(([key, count]) => {
    const [pkg, , imported] = key.split(':');
    console.log(`  ${imported} from ${pkg}: ${count} imports`);
  });
}

analyzeImports().catch(console.error);