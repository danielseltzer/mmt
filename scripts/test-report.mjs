#!/usr/bin/env node
/**
 * @fileoverview Generates a test coverage report showing what functionality is verified
 */

import { promises as fs } from 'node:fs';
import { relative, join, basename } from 'node:path';
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
    const itMatch = line.match(/^\s*it\s*\(\s*['"`](.+?)['"`]/);
    if (itMatch && currentSuite) {
      let testName = itMatch[1];
      
      // Clean up test name - remove literal newlines and trim
      testName = testName.replace(/\\n/g, ' ').trim();
      if (testName === '') {
        testName = '(empty test name)';
      }
      
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
 * Generate hierarchical markdown report
 */
function generateMarkdown(allTests) {
  const lines = [];
  
  lines.push('# MMT Test Coverage Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  
  // Summary section
  // A test is only fully documented if it has all three: GIVEN, WHEN, and THEN
  const undocumentedTests = allTests.filter(test => !test.given || !test.when || !test.then);
  const documentedCount = allTests.length - undocumentedTests.length;
  const percentage = Math.round((documentedCount / allTests.length) * 100);
  
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Tests**: ${allTests.length}`);
  lines.push(`- **Documented**: ${documentedCount} (${percentage}%)`);
  lines.push(`- **Missing Documentation**: ${undocumentedTests.length}`);
  lines.push('');
  
  // Tests needing documentation
  if (undocumentedTests.length > 0) {
    lines.push('## ⚠️ Tests Needing Documentation');
    lines.push('');
    lines.push('| Test | Location | Issue |');
    lines.push('|------|----------|-------|');
    
    for (const test of undocumentedTests) {
      const packageName = test.file.match(/packages\/([^/]+)\//)?.[1] || 'unknown';
      let testName = test.test;
      
      // Handle empty or whitespace-only test names
      if (!testName || testName.trim() === '' || testName === '(empty test name)') {
        testName = '*(empty test name)*';
      }
      
      const location = `${test.file}:${test.line}`;
      
      // Determine what's missing
      const issues = [];
      if (!test.test || test.test.trim() === '' || test.test === '(empty test name)') {
        issues.push('Missing test name');
      }
      if (!test.given && !test.when && !test.then) {
        issues.push('No GIVEN/WHEN/THEN documentation');
      } else {
        if (!test.given) issues.push('Missing GIVEN');
        if (!test.when) issues.push('Missing WHEN');
        if (!test.then) issues.push('Missing THEN');
      }
      
      const issue = issues.join(', ');
      const breadcrumb = `${packageName} › ${basename(test.file)} › ${test.suite}`;
      
      lines.push(`| ${testName}<br><sub>${breadcrumb}</sub> | \`${location}\` | ${issue} |`);
    }
    
    lines.push('');
  }
  
  // Group tests hierarchically
  const byPackage = new Map();
  
  for (const test of allTests) {
    const packageMatch = test.file.match(/packages\/([^/]+)\//);
    const pkg = packageMatch ? packageMatch[1] : 'unknown';
    
    if (!byPackage.has(pkg)) {
      byPackage.set(pkg, new Map());
    }
    
    const byFile = byPackage.get(pkg);
    const fileName = basename(test.file);
    
    if (!byFile.has(fileName)) {
      byFile.set(fileName, {
        path: test.file,
        suites: new Map()
      });
    }
    
    const fileSuites = byFile.get(fileName).suites;
    
    if (!fileSuites.has(test.suite)) {
      fileSuites.set(test.suite, []);
    }
    
    fileSuites.get(test.suite).push(test);
  }
  
  // Generate package coverage overview
  lines.push('## Package Coverage Overview');
  lines.push('');
  lines.push('| Package | Files | Tests | Documented | Coverage |');
  lines.push('|---------|-------|-------|------------|----------|');
  
  for (const [pkg, files] of byPackage) {
    let totalTests = 0;
    let documentedTests = 0;
    
    for (const [, fileData] of files) {
      for (const [, tests] of fileData.suites) {
        totalTests += tests.length;
        documentedTests += tests.filter(t => t.given && t.when && t.then).length;
      }
    }
    
    const pkgPercentage = Math.round((documentedTests / totalTests) * 100);
    const status = pkgPercentage === 100 ? '✅' : pkgPercentage >= 80 ? '⚠️' : '❌';
    
    lines.push(`| ${pkg} | ${files.size} | ${totalTests} | ${documentedTests} | ${pkgPercentage}% ${status} |`);
  }
  
  lines.push('');
  
  // Detailed test documentation
  lines.push('## Test Documentation');
  lines.push('');
  
  // Sort packages alphabetically
  const sortedPackages = Array.from(byPackage.keys()).sort();
  
  for (const pkg of sortedPackages) {
    lines.push(`### Package: ${pkg}`);
    lines.push('');
    
    const files = byPackage.get(pkg);
    const sortedFiles = Array.from(files.keys()).sort();
    
    for (const fileName of sortedFiles) {
      const fileData = files.get(fileName);
      lines.push(`#### File: ${fileName}`);
      lines.push(`<sub>${fileData.path}</sub>`);
      lines.push('');
      
      const sortedSuites = Array.from(fileData.suites.keys()).sort();
      
      for (const suite of sortedSuites) {
        const tests = fileData.suites.get(suite);
        lines.push(`##### Suite: ${suite}`);
        lines.push('');
        
        for (const test of tests) {
          // Test is only fully documented if it has all three parts
          const hasDocumentation = test.given && test.when && test.then;
          
          if (hasDocumentation) {
            lines.push(`###### ✓ ${test.test}`);
            lines.push(`<sub>${pkg} › ${fileName} › ${suite}</sub>`);
            lines.push('');
            
            if (test.given) {
              lines.push(`- **Given**: ${test.given}`);
            }
            if (test.when) {
              lines.push(`- **When**: ${test.when}`);
            }
            if (test.then) {
              lines.push(`- **Then**: ${test.then}`);
            }
          } else {
            lines.push(`###### 📝 ${test.test}`);
            lines.push(`<sub>${pkg} › ${fileName} › ${suite}</sub>`);
            lines.push('');
            lines.push('> ⚠️ Missing GIVEN/WHEN/THEN documentation');
          }
          
          lines.push('');
        }
      }
    }
  }
  
  // Functionality summary
  lines.push('## Functionality Summary');
  lines.push('');
  lines.push('Quick reference of what each package can do:');
  lines.push('');
  
  for (const pkg of sortedPackages) {
    const capabilities = new Set();
    const files = byPackage.get(pkg);
    
    for (const [, fileData] of files) {
      for (const [, tests] of fileData.suites) {
        for (const test of tests) {
          if (test.then) {
            capabilities.add(test.then);
          }
        }
      }
    }
    
    if (capabilities.size > 0) {
      lines.push(`### Package: ${pkg}`);
      lines.push('');
      
      for (const capability of Array.from(capabilities).sort()) {
        lines.push(`- ${capability}`);
      }
      
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('Scanning for test files...\n');
  
  // Find all test files
  const testFiles = await glob('packages/*/{src,tests}/**/*.test.{ts,js}', {
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