#!/usr/bin/env node
/**
 * @fileoverview Generates a markdown report of all tests and what they verify
 * This serves as living documentation of the system's actual functionality
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestCase {
  description: string;
  given: string;
  when: string;
  then: string;
  file: string;
  line: number;
}

interface TestSuite {
  description: string;
  tests: TestCase[];
}

/**
 * Extract test information from test files
 */
async function extractTests(filePath: string): Promise<TestSuite[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = filePath.replace(process.cwd() + '/', '');
  
  const suites: TestSuite[] = [];
  let currentSuite: TestSuite | null = null;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Match describe blocks
    const describeMatch = line.match(/describe\(['"`](.+?)['"`]/);
    if (describeMatch) {
      currentSuite = {
        description: describeMatch[1],
        tests: []
      };
      suites.push(currentSuite);
      continue;
    }
    
    // Match it blocks
    const itMatch = line.match(/it\(['"`](.+?)['"`]/);
    if (itMatch && currentSuite) {
      const testDescription = itMatch[1];
      
      // Look for GIVEN/WHEN/THEN comments in the next few lines
      let given = '';
      let when = '';
      let then = '';
      
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const commentLine = lines[j];
        
        if (commentLine.includes('GIVEN:')) {
          given = commentLine.split('GIVEN:')[1].trim();
        } else if (commentLine.includes('WHEN:')) {
          when = commentLine.split('WHEN:')[1].trim();
        } else if (commentLine.includes('THEN:')) {
          then = commentLine.split('THEN:')[1].trim();
        }
        
        // Stop if we hit code (not a comment)
        if (!commentLine.trim().startsWith('//') && commentLine.trim().length > 0) {
          break;
        }
      }
      
      currentSuite.tests.push({
        description: testDescription,
        given,
        when,
        then,
        file: relativePath,
        line: lineNumber
      });
    }
  }
  
  return suites;
}

/**
 * Generate markdown report
 */
function generateReport(testSuites: Map<string, TestSuite[]>): string {
  const report: string[] = [];
  
  report.push('# MMT Test Coverage Report');
  report.push(`\nGenerated: ${new Date().toISOString()}\n`);
  report.push('This report documents all tested functionality in MMT based on actual test cases.\n');
  
  // Summary
  let totalTests = 0;
  for (const suites of testSuites.values()) {
    for (const suite of suites) {
      totalTests += suite.tests.length;
    }
  }
  
  report.push('## Summary\n');
  report.push(`- **Total test files**: ${testSuites.size}`);
  report.push(`- **Total test cases**: ${totalTests}\n`);
  
  // Detailed coverage by package
  for (const [packageName, suites] of testSuites) {
    report.push(`## ${packageName}\n`);
    
    for (const suite of suites) {
      report.push(`### ${suite.description}\n`);
      
      for (const test of suite.tests) {
        report.push(`#### ✓ ${test.description}`);
        
        if (test.given || test.when || test.then) {
          report.push('');
          if (test.given) report.push(`- **Given**: ${test.given}`);
          if (test.when) report.push(`- **When**: ${test.when}`);
          if (test.then) report.push(`- **Then**: ${test.then}`);
        }
        
        report.push(`\n_Source: ${test.file}:${test.line}_\n`);
      }
    }
  }
  
  // Functionality summary
  report.push('## Verified Functionality\n');
  report.push('Based on the tests, MMT provides the following verified capabilities:\n');
  
  // Extract functionality categories
  const functionality = new Map<string, string[]>();
  
  for (const suites of testSuites.values()) {
    for (const suite of suites) {
      for (const test of suite.tests) {
        const category = suite.description;
        if (!functionality.has(category)) {
          functionality.set(category, []);
        }
        
        // Create a concise statement of what works
        if (test.then) {
          functionality.get(category)!.push(test.then);
        } else {
          functionality.get(category)!.push(test.description);
        }
      }
    }
  }
  
  for (const [category, capabilities] of functionality) {
    report.push(`### ${category}`);
    report.push('');
    for (const capability of capabilities) {
      report.push(`- ${capability}`);
    }
    report.push('');
  }
  
  return report.join('\n');
}

/**
 * Generate CSV report for tracking
 */
function generateCSV(testSuites: Map<string, TestSuite[]>): string {
  const rows: string[] = [];
  rows.push('Package,Suite,Test,Given,When,Then,File,Line');
  
  for (const [packageName, suites] of testSuites) {
    for (const suite of suites) {
      for (const test of suite.tests) {
        const row = [
          packageName,
          suite.description,
          test.description,
          `"${test.given.replace(/"/g, '""')}"`,
          `"${test.when.replace(/"/g, '""')}"`,
          `"${test.then.replace(/"/g, '""')}"`,
          test.file,
          test.line.toString()
        ];
        rows.push(row.join(','));
      }
    }
  }
  
  return rows.join('\n');
}

/**
 * Main function
 */
async function main() {
  const packagesDir = join(__dirname, '..', '..');
  const testFiles = await glob('packages/*/src/**/*.test.ts', {
    cwd: packagesDir,
    absolute: true
  });
  
  console.log(`Found ${testFiles.length} test files\n`);
  
  const allTests = new Map<string, TestSuite[]>();
  
  for (const file of testFiles) {
    const packageMatch = file.match(/packages\/([^/]+)\//);
    const packageName = packageMatch ? `@mmt/${packageMatch[1]}` : 'unknown';
    
    const suites = await extractTests(file);
    if (!allTests.has(packageName)) {
      allTests.set(packageName, []);
    }
    allTests.get(packageName)!.push(...suites);
  }
  
  // Generate reports
  const markdownReport = generateReport(allTests);
  const csvReport = generateCSV(allTests);
  
  // Save reports
  const reportsDir = join(__dirname, '..', '..', '..', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().split('T')[0];
  await fs.writeFile(join(reportsDir, 'test-coverage.md'), markdownReport);
  await fs.writeFile(join(reportsDir, `test-coverage-${timestamp}.csv`), csvReport);
  
  console.log('Reports generated:');
  console.log(`- reports/test-coverage.md`);
  console.log(`- reports/test-coverage-${timestamp}.csv`);
  
  // Also output summary to console
  console.log('\n=== Test Coverage Summary ===\n');
  
  let totalTests = 0;
  for (const [packageName, suites] of allTests) {
    let packageTests = 0;
    for (const suite of suites) {
      packageTests += suite.tests.length;
    }
    totalTests += packageTests;
    console.log(`${packageName}: ${packageTests} tests`);
  }
  
  console.log(`\nTotal: ${totalTests} tests`);
}

main().catch(console.error);