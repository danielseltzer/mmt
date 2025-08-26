#!/usr/bin/env tsx

/**
 * Type Coverage Checker
 * 
 * Analyzes TypeScript code to find areas with missing or implicit types.
 * Helps maintain type safety across the codebase.
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { glob } from 'glob';

interface TypeCoverageReport {
  totalFiles: number;
  filesWithImplicitAny: number;
  filesWithExplicitAny: number;
  untypedExports: number;
  untypedParameters: number;
  details: FileReport[];
}

interface FileReport {
  file: string;
  implicitAny: number;
  explicitAny: number;
  untypedExports: number;
  untypedParameters: number;
  issues: string[];
}

async function analyzeFile(filePath: string): Promise<FileReport> {
  const content = await readFile(filePath, 'utf-8');
  const relativePath = relative(process.cwd(), filePath);
  const issues: string[] = [];
  
  // Skip test files
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
    return {
      file: relativePath,
      implicitAny: 0,
      explicitAny: 0,
      untypedExports: 0,
      untypedParameters: 0,
      issues: []
    };
  }

  // Check for explicit any
  const explicitAnyMatches = content.match(/:\s*any\b/g) || [];
  
  // Check for untyped function parameters (simple heuristic)
  const untypedParamMatches = content.match(/\(([^)]*)\)\s*(?:=>|\{)/g) || [];
  let untypedParams = 0;
  untypedParamMatches.forEach(match => {
    // Check if parameters have types
    const params = match.match(/\(([^)]*)\)/)?.[1];
    if (params && params.trim() && !params.includes(':')) {
      untypedParams++;
      const line = content.substring(0, content.indexOf(match)).split('\n').length;
      issues.push(`Line ${line}: Untyped parameters in function`);
    }
  });
  
  // Check for untyped exports
  const exportMatches = content.match(/export\s+(const|let|var|function)\s+\w+\s*=/g) || [];
  let untypedExports = 0;
  exportMatches.forEach(match => {
    const afterMatch = content.substring(content.indexOf(match) + match.length);
    // Simple check: if the next character isn't a type annotation, it might be untyped
    if (!afterMatch.trimStart().startsWith(':')) {
      untypedExports++;
      const line = content.substring(0, content.indexOf(match)).split('\n').length;
      issues.push(`Line ${line}: Potentially untyped export`);
    }
  });
  
  // Record explicit any usage locations
  if (explicitAnyMatches.length > 0) {
    let searchFrom = 0;
    explicitAnyMatches.forEach(() => {
      const index = content.indexOf(': any', searchFrom);
      if (index !== -1) {
        const line = content.substring(0, index).split('\n').length;
        issues.push(`Line ${line}: Explicit 'any' type used`);
        searchFrom = index + 1;
      }
    });
  }

  return {
    file: relativePath,
    implicitAny: 0, // Would need TypeScript compiler API to detect properly
    explicitAny: explicitAnyMatches.length,
    untypedExports,
    untypedParameters: untypedParams,
    issues
  };
}

async function generateReport(): Promise<TypeCoverageReport> {
  // Find all TypeScript files in src directories
  const files = await glob('**/src/**/*.{ts,tsx}', {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**'
    ]
  });

  const fileReports = await Promise.all(files.map(analyzeFile));
  
  const report: TypeCoverageReport = {
    totalFiles: fileReports.length,
    filesWithImplicitAny: fileReports.filter(f => f.implicitAny > 0).length,
    filesWithExplicitAny: fileReports.filter(f => f.explicitAny > 0).length,
    untypedExports: fileReports.reduce((sum, f) => sum + f.untypedExports, 0),
    untypedParameters: fileReports.reduce((sum, f) => sum + f.untypedParameters, 0),
    details: fileReports.filter(f => f.issues.length > 0)
  };

  return report;
}

async function main() {
  console.log('🔍 Analyzing type coverage...\n');
  
  const report = await generateReport();
  
  console.log('📊 Type Coverage Report');
  console.log('========================');
  console.log(`Total files analyzed: ${report.totalFiles}`);
  console.log(`Files with explicit 'any': ${report.filesWithExplicitAny}`);
  console.log(`Untyped exports found: ${report.untypedExports}`);
  console.log(`Untyped parameters found: ${report.untypedParameters}`);
  
  const coverage = ((report.totalFiles - report.filesWithExplicitAny) / report.totalFiles * 100).toFixed(1);
  console.log(`\n✨ Type Coverage: ${coverage}% (files without 'any')`);
  
  if (report.details.length > 0) {
    console.log('\n⚠️  Files with type issues:');
    console.log('---------------------------');
    
    report.details.forEach(file => {
      if (file.issues.length > 0) {
        console.log(`\n📄 ${file.file}`);
        file.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
    });
  }
  
  // Exit with error if coverage is below threshold
  const threshold = 95; // 95% of files should not have 'any'
  if (parseFloat(coverage) < threshold) {
    console.log(`\n❌ Type coverage ${coverage}% is below threshold of ${threshold}%`);
    process.exit(1);
  } else {
    console.log(`\n✅ Type coverage ${coverage}% meets threshold of ${threshold}%`);
  }
}

main().catch(error => {
  console.error('Error running type coverage check:', error);
  process.exit(1);
});