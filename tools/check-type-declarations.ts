#!/usr/bin/env tsx

/**
 * Type Declaration Checker
 * 
 * Ensures that all packages properly generate TypeScript declaration files
 * and export necessary types for consumers.
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { existsSync } from 'fs';
import { glob } from 'glob';

interface PackageReport {
  name: string;
  path: string;
  hasTypes: boolean;
  declarationFiles: string[];
  missingDeclarations: string[];
  issues: string[];
}

async function checkPackage(packagePath: string): Promise<PackageReport> {
  const packageJsonPath = join(packagePath, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return {
      name: packagePath,
      path: packagePath,
      hasTypes: false,
      declarationFiles: [],
      missingDeclarations: [],
      issues: ['No package.json found']
    };
  }

  const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);
  const packageName = packageJson.name || 'unknown';
  const issues: string[] = [];
  
  // Check if package has TypeScript configuration
  const tsConfigPath = join(packagePath, 'tsconfig.json');
  if (!existsSync(tsConfigPath)) {
    issues.push('No tsconfig.json found');
  }

  // Check for types field in package.json
  if (!packageJson.types && !packageJson.typings) {
    issues.push('No "types" or "typings" field in package.json');
  }

  // Find all TypeScript source files
  const srcPath = join(packagePath, 'src');
  const sourceFiles = existsSync(srcPath) 
    ? await glob('**/*.{ts,tsx}', {
        cwd: srcPath,
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/__tests__/**']
      })
    : [];

  // Find all declaration files
  const distPath = join(packagePath, 'dist');
  const declarationFiles = existsSync(distPath)
    ? await glob('**/*.d.ts', { cwd: distPath })
    : [];

  // Check which source files are missing declarations
  const missingDeclarations: string[] = [];
  for (const sourceFile of sourceFiles) {
    const expectedDeclaration = sourceFile.replace(/\.tsx?$/, '.d.ts');
    if (!declarationFiles.includes(expectedDeclaration)) {
      missingDeclarations.push(sourceFile);
    }
  }

  if (missingDeclarations.length > 0) {
    issues.push(`Missing ${missingDeclarations.length} declaration files`);
  }

  // Check if index.d.ts exists
  const indexDtsPath = join(distPath, 'index.d.ts');
  if (!existsSync(indexDtsPath)) {
    issues.push('No dist/index.d.ts file found');
  }

  return {
    name: packageName,
    path: relative(process.cwd(), packagePath),
    hasTypes: declarationFiles.length > 0,
    declarationFiles,
    missingDeclarations,
    issues
  };
}

async function main() {
  console.log('🔍 Checking TypeScript declaration files...\n');

  // Find all packages
  const packages = await glob('packages/*/');
  const reports = await Promise.all(packages.map(checkPackage));

  // Summary statistics
  const totalPackages = reports.length;
  const packagesWithTypes = reports.filter(r => r.hasTypes).length;
  const packagesWithIssues = reports.filter(r => r.issues.length > 0).length;

  console.log('📊 Type Declaration Report');
  console.log('==========================');
  console.log(`Total packages: ${totalPackages}`);
  console.log(`Packages with type declarations: ${packagesWithTypes}/${totalPackages}`);
  console.log(`Packages with issues: ${packagesWithIssues}`);

  // Show packages with issues
  if (packagesWithIssues > 0) {
    console.log('\n⚠️  Packages with issues:');
    console.log('-------------------------');

    for (const report of reports) {
      if (report.issues.length > 0) {
        console.log(`\n📦 ${report.name} (${report.path})`);
        report.issues.forEach(issue => {
          console.log(`   ❌ ${issue}`);
        });
        
        if (report.missingDeclarations.length > 0 && report.missingDeclarations.length <= 5) {
          console.log('   Missing declarations for:');
          report.missingDeclarations.forEach(file => {
            console.log(`     - ${file}`);
          });
        }
      }
    }
  }

  // Show successful packages
  const successfulPackages = reports.filter(r => r.hasTypes && r.issues.length === 0);
  if (successfulPackages.length > 0) {
    console.log('\n✅ Packages with proper type declarations:');
    successfulPackages.forEach(report => {
      console.log(`   - ${report.name} (${report.declarationFiles.length} .d.ts files)`);
    });
  }

  // Exit with error if not all packages have proper types
  const successRate = (packagesWithTypes / totalPackages * 100).toFixed(1);
  const threshold = 100; // All packages should have type declarations

  if (parseFloat(successRate) < threshold) {
    console.log(`\n❌ Only ${successRate}% of packages have type declarations (threshold: ${threshold}%)`);
    process.exit(1);
  } else {
    console.log(`\n✅ All packages have type declarations!`);
  }
}

main().catch(error => {
  console.error('Error checking type declarations:', error);
  process.exit(1);
});