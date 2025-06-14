#!/usr/bin/env node
/**
 * @fileoverview Generates a test coverage report showing what functionality is verified
 */

import { promises as fs } from 'node:fs';
import { relative, join } from 'node:path';
import { glob } from 'glob';

/**
 * Extract test descriptions from a test file
 */
async function extractTests(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = relative(process.cwd(), filePath);
  
  const tests = [];
  const lines = content.split('\n');
  
  // Track current describe block
  let currentSuite = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find describe blocks
    const describeMatch = line.match(/describe\s*\(\s*['"`](.+?)['"`]/);
    if (describeMatch) {
      currentSuite = describeMatch[1];
      continue;
    }
    
    // Find it blocks
    const itMatch = line.match(/it\s*\(\s*['"`](.+?)['"`]/);
    if (itMatch && currentSuite) {
      const testName = itMatch[1];
      
      // Extract GIVEN/WHEN/THEN from comments
      let given = '', when = '', then = '';
      
      // Look ahead for comments
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const commentLine = lines[j].trim();
        
        if (commentLine.includes('GIVEN:')) {
          given = commentLine.substring(commentLine.indexOf('GIVEN:') + 6).trim();
        } else if (commentLine.includes('WHEN:')) {
          when = commentLine.substring(commentLine.indexOf('WHEN:') + 5).trim();
        } else if (commentLine.includes('THEN:')) {
          then = commentLine.substring(commentLine.indexOf('THEN:') + 5).trim();
        }
        
        // Stop at non-comment line
        if (!commentLine.startsWith('//') && commentLine.length > 0) break;
      }
      
      tests.push({
        suite: currentSuite,
        test: testName,
        given,
        when,
        then,
        file: relativePath,
        line: i + 1
      });
    }
  }
  
  return tests;
}

/**
 * Generate markdown report
 */
function generateMarkdown(allTests) {
  const lines = [];
  
  lines.push('# MMT Test Coverage Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  
  // Check for tests without documentation
  const undocumentedTests = allTests.filter(test => !test.given && !test.when && !test.then);
  if (undocumentedTests.length > 0) {
    lines.push('## ⚠️ Tests Needing Documentation');
    lines.push('');
    lines.push(`Found ${undocumentedTests.length} tests without GIVEN/WHEN/THEN comments:`);
    lines.push('');
    
    for (const test of undocumentedTests) {
      lines.push(`- 🚨 **${test.suite}** → ${test.test}`);
      lines.push(`  <sub>${test.file}:${test.line}</sub>`);
    }
    lines.push('');
  }
  
  lines.push('## What This System Does');
  lines.push('');
  lines.push('Based on verified test cases, MMT provides the following functionality:');
  lines.push('');
  
  // Group by package
  const byPackage = new Map();
  
  for (const test of allTests) {
    const packageMatch = test.file.match(/packages\/([^/]+)\//);
    const pkg = packageMatch ? packageMatch[1] : 'unknown';
    
    if (!byPackage.has(pkg)) {
      byPackage.set(pkg, []);
    }
    byPackage.get(pkg).push(test);
  }
  
  // Generate functionality statements
  for (const [pkg, tests] of byPackage) {
    lines.push(`### ${pkg}`);
    lines.push('');
    
    // Group by suite
    const bySuite = new Map();
    for (const test of tests) {
      if (!bySuite.has(test.suite)) {
        bySuite.set(test.suite, []);
      }
      bySuite.get(test.suite).push(test);
    }
    
    for (const [suite, suiteTests] of bySuite) {
      // Get the file path from the first test in this suite
      const filePath = suiteTests[0].file;
      
      lines.push(`**${suite}**`);
      lines.push(`<sub>${filePath}</sub>`);
      lines.push('');
      
      for (const test of suiteTests) {
        const hasDocumentation = test.given || test.when || test.then;
        const icon = hasDocumentation ? '✓' : '📝';
        const description = test.then || test.test;
        
        lines.push(`- ${icon} ${description}`);
        
        // Add warning if missing documentation
        if (!hasDocumentation) {
          lines.push(`  <sub>⚠️ Missing GIVEN/WHEN/THEN at line ${test.line}</sub>`);
        }
      }
      lines.push('');
    }
  }
  
  // Summary statistics
  lines.push('## Test Statistics');
  lines.push('');
  lines.push(`- Total tests: ${allTests.length}`);
  lines.push(`- Documented tests: ${allTests.filter(t => t.given || t.when || t.then).length}`);
  lines.push(`- Missing documentation: ${undocumentedTests.length}`);
  lines.push(`- Packages tested: ${byPackage.size}`);
  
  // Coverage matrix
  lines.push('');
  lines.push('## Coverage Matrix');
  lines.push('');
  lines.push('| Package | Suite | Tests | Documented | Status |');
  lines.push('|---------|-------|-------|------------|--------|');
  
  for (const [pkg, tests] of byPackage) {
    const suites = new Set(tests.map(t => t.suite));
    const documented = tests.filter(t => t.given || t.when || t.then).length;
    const percentage = Math.round((documented / tests.length) * 100);
    const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
    
    lines.push(`| ${pkg} | ${suites.size} suites | ${tests.length} tests | ${documented}/${tests.length} (${percentage}%) | ${status} |`);
  }
  
  return lines.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('Scanning for test files...\n');
  
  // Find all test files
  const testFiles = await glob('packages/*/src/**/*.test.{ts,js}', {
    cwd: process.cwd()
  });
  
  console.log(`Found ${testFiles.length} test files`);
  
  // Extract all tests
  const allTests = [];
  for (const file of testFiles) {
    const tests = await extractTests(file);
    allTests.push(...tests);
  }
  
  console.log(`Extracted ${allTests.length} test cases\n`);
  
  // Generate reports
  const markdown = generateMarkdown(allTests);
  
  // Ensure reports directory exists
  await fs.mkdir('reports', { recursive: true });
  
  // Save report
  await fs.writeFile('reports/test-coverage.md', markdown);
  console.log('Generated: reports/test-coverage.md');
  
  // Also generate a simple text summary
  console.log('\n=== Verified Functionality ===\n');
  
  const byPackage = new Map();
  for (const test of allTests) {
    const packageMatch = test.file.match(/packages\/([^/]+)\//);
    const pkg = packageMatch ? packageMatch[1] : 'unknown';
    
    if (!byPackage.has(pkg)) {
      byPackage.set(pkg, new Set());
    }
    
    if (test.then) {
      byPackage.get(pkg).add(test.then);
    }
  }
  
  for (const [pkg, capabilities] of byPackage) {
    console.log(`${pkg}:`);
    for (const capability of capabilities) {
      console.log(`  - ${capability}`);
    }
    console.log('');
  }
}

// Run
main().catch(console.error);