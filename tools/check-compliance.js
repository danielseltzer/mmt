#!/usr/bin/env node

/**
 * MMT Compliance Checker
 * 
 * Enforces critical rules from CLAUDE.md:
 * - NO MOCKS: Zero tolerance for mocks, stubs, or test doubles
 * - NO DEFAULTS: All configuration must be explicit
 * - ENV VARS: Environment variables only for secrets, not configuration
 * - NO BACKWARD COMPATIBILITY: Never add legacy support or aliases
 * - FILESYSTEM ACCESS: All file operations must go through @mmt/filesystem-access
 * - NO HARDCODED URLS: URLs must come from configuration, not hardcoded
 * - NO ESLINT DISABLE: Fix underlying issues instead of suppressing warnings
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class ComplianceChecker {
  constructor(stagedOnly = false) {
    this.stagedOnly = stagedOnly;
    this.violations = {};
    this.projectRoot = path.resolve(__dirname, '..');
  }

  /**
   * Get list of files to check
   */
  getFilesToCheck() {
    if (this.stagedOnly) {
      try {
        const result = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
        return result.split('\n')
          .filter(file => file && (file.endsWith('.ts') || file.endsWith('.tsx') || 
                                   file.endsWith('.js') || file.endsWith('.jsx')))
          .map(file => path.join(this.projectRoot, file));
      } catch (e) {
        // Fall back to all files if git command fails
        return this.getAllFiles();
      }
    }
    return this.getAllFiles();
  }

  /**
   * Get all TypeScript and JavaScript files in the project
   */
  getAllFiles() {
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

    walk(this.projectRoot);
    return files;
  }

  /**
   * Check for mock/stub/spy usage in test files
   */
  checkNoMocks(files) {
    const testFiles = files.filter(f => 
      f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')
    );

    const mockPatterns = [
      /\bmock\b/i,
      /\bstub\b/i,
      /\bspy\b/i,
      /\bvi\.mock\b/,
      /\bjest\.mock\b/,
      /\bsinon\./,
      /\.mockImplementation\b/,
      /\.mockReturnValue\b/,
      /\.spyOn\b/
    ];

    const violations = [];
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        for (const pattern of mockPatterns) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              content: line.trim(),
              pattern: pattern.toString()
            });
            break; // Only report once per line
          }
        }
      });
    }

    this.violations['NO_MOCKS'] = violations;
  }

  /**
   * Check for default value patterns (|| with defaults)
   */
  checkNoDefaults(files) {
    // Patterns that indicate default values for configuration
    const defaultPatterns = [
      /\|\|\s*['"]3001['"]/,          // Default port 3001
      /\|\|\s*['"]5173['"]/,          // Default port 5173
      /\|\|\s*['"]localhost/,         // Default localhost
      /\|\|\s*['"]http:\/\/localhost/, // Default URLs
      /\|\|\s*\d{4}/,                 // Default port numbers
      /=\s*process\.env\.\w+\s*\|\|/, // Environment var with fallback
      /process\.env\.\w+\s*\?\?/,     // Nullish coalescing for env vars
    ];

    const violations = [];
    
    // Special files to always check for defaults
    const configFiles = files.filter(f => 
      f.includes('config') || 
      f.includes('vite.config') || 
      f.includes('.env') ||
      f.endsWith('api.ts') ||
      f.endsWith('api.js')
    );

    for (const file of configFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comments and type definitions
        if (line.trim().startsWith('//') || 
            line.trim().startsWith('*') ||
            line.includes('interface ') ||
            line.includes('type ')) {
          return;
        }
        
        for (const pattern of defaultPatterns) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              content: line.trim(),
              issue: 'Default value for configuration'
            });
            break;
          }
        }
      });
    }

    this.violations['NO_DEFAULTS'] = violations;
  }

  /**
   * Check for environment variable misuse (non-secrets)
   */
  checkEnvVars(files) {
    // Environment variables that should NOT be used for configuration
    // Note: MMT_API_PORT is allowed as internal plumbing for control manager
    const configEnvVars = [
      'VITE_API_PORT',
      'VITE_API_URL', 
      'VITE_WS_URL',
      'API_PORT',
      'PORT',
      'HOST',
      'BACKEND_URL'
    ];

    const violations = [];
    
    for (const file of files) {
      // Skip test files and .env examples
      if (file.includes('.test.') || file.includes('.env')) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        // Check for process.env usage
        if (line.includes('process.env.') || line.includes('import.meta.env.')) {
          // Skip MMT_API_PORT as it's internal plumbing
          if (line.includes('MMT_API_PORT')) {
            return;
          }
          
          for (const envVar of configEnvVars) {
            // Use word boundary to avoid false positives (e.g., MMT_API_PORT matching PORT)
            const regex = new RegExp(`\\b${envVar}\\b`);
            if (regex.test(line)) {
              violations.push({
                file: path.relative(this.projectRoot, file),
                line: index + 1,
                content: line.trim(),
                envVar: envVar,
                issue: 'Configuration via environment variable (not a secret)'
              });
            }
          }
        }
      });
    }

    this.violations['ENV_VARS'] = violations;
  }

  /**
   * Check for backward compatibility code
   */
  checkNoBackwardCompatibility(files) {
    const backwardCompatPatterns = [
      /@deprecated/i,
      /\bdeprecated\b/i,
      /\blegacy\b/i,
      /\bbackward[s-]?compat/i,
      /\/\/ TODO.*remove.*version/i,
      /\/\/ TODO.*backwards/i
    ];

    const violations = [];
    
    for (const file of files) {
      // Skip CLAUDE.md, dependency-cruiser config, and tools
      if (file.endsWith('CLAUDE.md') || 
          file.includes('dependency-cruiser') ||
          file.includes('/tools/')) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        for (const pattern of backwardCompatPatterns) {
          if (pattern.test(line)) {
            // Filter out false positives
            if (line.includes('no-deprecated') || // dependency-cruiser rule names
                line.includes('not-to-deprecated') ||
                line.includes('NO BACKWARD COMPATIBILITY') || // Our own docs
                line.includes('.dependency-cruiser') || // Dependency cruiser config file
                (line.includes('deprecated') && line.includes('rule')) || // Rule names that include 'deprecated'
                (line.includes('aliases') && (line.includes('frontmatter') || line.includes('metadata') || line.includes('document'))) || // Document metadata aliases field
                (line.includes('oldPath') && (line.includes('rename') || line.includes('move') || line.includes('relocate'))) || // File operations with oldPath/newPath
                (line.includes('oldPath') && line.includes('newPath')) || // Common pairing in file operations
                (pattern.toString().includes('old[A-Z]') && line.match(/\bold[A-Z]\w+/) && line.includes('Path'))) { // oldPath, newPath in file operations
              continue;
            }

            violations.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              content: line.trim(),
              pattern: pattern.toString()
            });
            break;
          }
        }
      });
    }

    this.violations['BACKWARD_COMPAT'] = violations;
  }

  /**
   * Check for direct filesystem access outside of @mmt/filesystem-access
   */
  checkFilesystemAccess(files) {
    const violations = [];
    
    for (const file of files) {
      // Skip filesystem-access package itself, tools, and ALL test files
      if (file.includes('packages/filesystem-access') || 
          file.includes('/tools/') ||
          file.includes('.test.') ||
          file.includes('.spec.') ||
          file.includes('__tests__') ||
          file.includes('/tests/') ||
          file.includes('/test/')) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      // Check for direct fs imports (the real violation)
      const hasDirectFsImport = lines.some(line => {
        // Look for direct fs imports
        return /^import\s+.*from\s+['"](?:node:)?fs(?:\/promises)?['"]/.test(line) ||
               /^import\s+fs\s+from\s+['"](?:node:)?fs['"]/.test(line) ||
               /^const\s+fs\s*=\s*require\(['"]fs['"]\)/.test(line) ||
               /^const\s+\{.*\}\s*=\s*require\(['"]fs['"]\)/.test(line);
      });
      
      if (hasDirectFsImport) {
        lines.forEach((line, index) => {
          if (/^import\s+.*from\s+['"](?:node:)?fs(?:\/promises)?['"]/.test(line) ||
              /^const\s+.*require\(['"]fs['"]\)/.test(line)) {
            violations.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              content: line.trim(),
              issue: 'Direct fs import - must use @mmt/filesystem-access'
            });
          }
        });
      }
      
      // Also check for direct fs usage without proper context
      // BUT: Allow context.fs.*, this.fs.*, this.fileSystem.* as these are legitimate
      // Also need to check if 'fs' is a NodeFileSystem instance
      const hasNodeFileSystemImport = lines.some(line => 
        line.includes('NodeFileSystem') && (line.includes('import') || line.includes('from'))
      );
      
      // Check if fs is assigned to a NodeFileSystem instance
      const hasNodeFileSystemAssignment = lines.some(line =>
        /const\s+fs\s*=\s*new\s+NodeFileSystem/.test(line) ||
        /this\.fs\s*=\s*new\s+NodeFileSystem/.test(line)
      );
      
      lines.forEach((line, index) => {
        // Skip comments, type definitions, and import statements
        if (line.trim().startsWith('//') || 
            line.trim().startsWith('*') ||
            line.includes('import ') ||
            line.includes('require(') ||
            line.includes('interface ') ||
            line.includes('type ')) {
          return;
        }
        
        // Check for direct fs.* calls (not context.fs.* or this.fs.* or this.fileSystem.*)
        if (/\bfs\./.test(line)) {
          // Exclude legitimate uses through context or this
          if (!/\b(?:context|this)\.(?:fs|fileSystem)\./.test(line)) {
            // If we have NodeFileSystem import and assignment, fs is legitimate
            if (!hasNodeFileSystemImport || !hasNodeFileSystemAssignment) {
              violations.push({
                file: path.relative(this.projectRoot, file),
                line: index + 1,
                content: line.trim(),
                issue: 'Direct fs usage - must use injected filesystem-access instance'
              });
            }
          }
        }
        
        // Check for standalone fs functions (not prefixed with context/this)
        const fsFunctions = [
          'readFileSync', 'writeFileSync', 'existsSync', 'mkdirSync', 
          'unlinkSync', 'rmdirSync', 'readdirSync', 'statSync',
          'readFile', 'writeFile', 'mkdir', 'unlink', 'rmdir', 'readdir', 'stat'
        ];
        
        for (const func of fsFunctions) {
          const regex = new RegExp(`\\b${func}\\s*\\(`);
          if (regex.test(line)) {
            // Make sure it's not context.fs.func or this.fs.func or this.fileSystem.func or fs.func where fs is NodeFileSystem
            if (!line.includes('context.fs.') && 
                !line.includes('this.fs.') && 
                !line.includes('this.fileSystem.') &&
                !line.includes('await fs.') && // Allow await fs. if fs is from filesystem-access
                !line.includes(`fs.${func}`) && // Allow fs.func if fs is NodeFileSystem
                !line.includes('fs' + func.charAt(0).toUpperCase() + func.slice(1))) { // Allow fsReadFile style naming
              // Only flag if we don't have NodeFileSystem
              if (!hasNodeFileSystemImport || !hasNodeFileSystemAssignment) {
                violations.push({
                  file: path.relative(this.projectRoot, file),
                  line: index + 1,
                  content: line.trim(),
                  issue: `Direct ${func} call - must use filesystem-access`
                });
                break;
              }
            }
          }
        }
      });
    }

    this.violations['FILESYSTEM_ACCESS'] = violations;
  }

  /**
   * Check for hardcoded URLs (localhost, 127.0.0.1, specific ports)
   */
  checkNoHardcodedURLs(files) {
    // Patterns for hardcoded URLs that should be configured
    const urlPatterns = [
      /https?:\/\/localhost(?::\d+)?/,     // http://localhost or http://localhost:port
      /https?:\/\/127\.0\.0\.1(?::\d+)?/,  // http://127.0.0.1 or http://127.0.0.1:port
      /https?:\/\/0\.0\.0\.0(?::\d+)?/,    // http://0.0.0.0 or http://0.0.0.0:port
      /localhost:\d{4}/,                    // localhost:3001, localhost:5173, etc.
      /127\.0\.0\.1:\d{4}/,                 // 127.0.0.1:3001, etc.
      /:\d{4}\/api\//,                      // :3001/api/, :5173/api/
      /['"]\/api\/[^'"]*['"]\.split/,       // API paths that might be concatenated
    ];

    const violations = [];
    
    for (const file of files) {
      // Skip test files, config files, tools, and documentation
      if (file.includes('.test.') || 
          file.includes('.spec.') ||
          file.includes('/tools/') ||
          file.includes('config/') ||
          file.includes('.md') ||
          file.endsWith('vite.config.ts') ||
          file.endsWith('vitest.config.ts')) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comments and type definitions
        if (line.trim().startsWith('//') || 
            line.trim().startsWith('*') ||
            line.includes('interface ') ||
            line.includes('type ')) {
          return;
        }
        
        for (const pattern of urlPatterns) {
          if (pattern.test(line)) {
            // Skip if it's in an error message or console log
            if (line.includes('console.') || 
                line.includes('throw ') ||
                line.includes('Error(')) {
              continue;
            }
            
            violations.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              content: line.trim(),
              issue: 'Hardcoded URL - should come from configuration'
            });
            break;
          }
        }
      });
    }

    this.violations['HARDCODED_URLS'] = violations;
  }

  /**
   * Check for eslint disable comments (checking for suppression of linting rules)
   */
  checkNoEslintDisable(files) {
    // Patterns for linting rule suppression
    const eslintDisablePatterns = [
      /eslint-disable(?:-next-line|-line)?/,  // Matches suppression comments
      /\/\*\s*eslint-disable/,                 // Block comment suppression
      /\/\/\s*eslint-disable/,                 // Line comment suppression
      /@ts-ignore/,                            // TypeScript ignore (also problematic)
      /@ts-nocheck/,                           // TypeScript nocheck (also problematic)
    ];

    const violations = [];
    
    for (const file of files) {
      // Skip the compliance checker itself
      if (file.endsWith('check-compliance.js')) {
        continue;
      }
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        for (const pattern of eslintDisablePatterns) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              content: line.trim(),
              issue: 'ESLint/TypeScript suppression - fix the underlying issue instead'
            });
            break;
          }
        }
      });
    }

    this.violations['NO_ESLINT_DISABLE'] = violations;
  }

  /**
   * Format and display results
   */
  displayResults() {
    const rules = [
      { key: 'NO_MOCKS', label: 'NO MOCKS', description: 'Test with real files, not mocks' },
      { key: 'NO_DEFAULTS', label: 'NO DEFAULTS', description: 'All config must be explicit' },
      { key: 'ENV_VARS', label: 'ENV VARS', description: 'Only for secrets, not config' },
      { key: 'BACKWARD_COMPAT', label: 'NO BACKWARD COMPAT', description: 'Direct changes only' },
      { key: 'FILESYSTEM_ACCESS', label: 'FILESYSTEM ACCESS', description: 'Use @mmt/filesystem-access' },
      { key: 'HARDCODED_URLS', label: 'NO HARDCODED URLS', description: 'URLs from config, not hardcoded' },
      { key: 'NO_ESLINT_DISABLE', label: 'NO ESLINT DISABLE', description: 'Fix issues, don\'t suppress' }
    ];

    let hasViolations = false;

    console.log(`\n${colors.bold}MMT Compliance Check Results${colors.reset}\n`);
    console.log('=' .repeat(60));

    for (const rule of rules) {
      const violations = this.violations[rule.key] || [];
      
      if (violations.length === 0) {
        console.log(`${colors.green}✅${colors.reset} ${colors.bold}${rule.label}${colors.reset}: Clean`);
      } else {
        hasViolations = true;
        console.log(`${colors.red}❌${colors.reset} ${colors.bold}${rule.label}${colors.reset}: Found ${violations.length} violation${violations.length > 1 ? 's' : ''}`);
        console.log(`   ${colors.yellow}${rule.description}${colors.reset}`);
        
        // Show first 5 violations
        const displayCount = Math.min(5, violations.length);
        for (let i = 0; i < displayCount; i++) {
          const v = violations[i];
          console.log(`   ${colors.blue}→${colors.reset} ${v.file}:${v.line}`);
          
          // Show the problematic line (truncated if too long)
          const content = v.content.length > 70 
            ? v.content.substring(0, 67) + '...' 
            : v.content;
          console.log(`     ${colors.yellow}${content}${colors.reset}`);
          
          if (v.issue) {
            console.log(`     ${colors.red}Issue: ${v.issue}${colors.reset}`);
          }
          if (v.envVar) {
            console.log(`     ${colors.red}Env var: ${v.envVar}${colors.reset}`);
          }
        }
        
        if (violations.length > displayCount) {
          console.log(`   ${colors.yellow}... and ${violations.length - displayCount} more${colors.reset}`);
        }
        console.log();
      }
    }

    console.log('=' .repeat(60));

    if (hasViolations) {
      console.log(`\n${colors.red}${colors.bold}❌ Compliance check failed${colors.reset}`);
      console.log(`${colors.yellow}Fix the violations above before committing.${colors.reset}\n`);
      
      // Provide fix suggestions
      console.log(`${colors.bold}Quick fixes:${colors.reset}`);
      if (this.violations['NO_MOCKS']?.length) {
        console.log(`• Replace mocks with real file operations in temp directories`);
      }
      if (this.violations['NO_DEFAULTS']?.length) {
        console.log(`• Remove default values - require explicit configuration`);
      }
      if (this.violations['ENV_VARS']?.length) {
        console.log(`• Move config from env vars to config files`);
      }
      if (this.violations['BACKWARD_COMPAT']?.length) {
        console.log(`• Remove deprecated code and aliases`);
      }
      if (this.violations['FILESYSTEM_ACCESS']?.length) {
        console.log(`• Use @mmt/filesystem-access for file operations`);
      }
      if (this.violations['HARDCODED_URLS']?.length) {
        console.log(`• Move hardcoded URLs to configuration`);
      }
      if (this.violations['NO_ESLINT_DISABLE']?.length) {
        console.log(`• Fix the underlying lint/type issues instead of suppressing`);
      }
      console.log();
    } else {
      console.log(`\n${colors.green}${colors.bold}✅ All compliance checks passed!${colors.reset}\n`);
    }

    return !hasViolations;
  }

  /**
   * Run all compliance checks
   */
  run() {
    console.log(`${colors.blue}Checking MMT compliance...${colors.reset}`);
    
    const files = this.getFilesToCheck();
    
    if (files.length === 0) {
      console.log('No files to check.');
      return true;
    }

    console.log(`Checking ${files.length} file${files.length > 1 ? 's' : ''}...`);

    // Run all checks
    this.checkNoMocks(files);
    this.checkNoDefaults(files);
    this.checkEnvVars(files);
    this.checkNoBackwardCompatibility(files);
    this.checkFilesystemAccess(files);
    this.checkNoHardcodedURLs(files);
    this.checkNoEslintDisable(files);

    // Display results
    return this.displayResults();
  }
}

// Main execution
const args = process.argv.slice(2);
const stagedOnly = args.includes('--staged');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
MMT Compliance Checker

Usage: node check-compliance.js [options]

Options:
  --staged    Only check staged files (useful for pre-commit hooks)
  --help, -h  Show this help message

This tool enforces critical rules from CLAUDE.md:
- NO MOCKS: Test with real files, not mocks
- NO DEFAULTS: All configuration must be explicit  
- ENV VARS: Environment variables only for secrets
- NO BACKWARD COMPAT: Never add legacy support
- FILESYSTEM ACCESS: Use @mmt/filesystem-access package
- NO HARDCODED URLS: URLs from configuration, not hardcoded
- NO ESLINT DISABLE: Fix issues instead of suppressing

Exit codes:
  0 - All checks passed
  1 - Violations found
`);
  process.exit(0);
}

const checker = new ComplianceChecker(stagedOnly);
const success = checker.run();

process.exit(success ? 0 : 1);