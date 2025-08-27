#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ALLOWED_ROOT_FILES = new Set([
  'README.md', 'CLAUDE.md', 'handoff.md',
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'turbo.json', '.gitignore', '.npmrc', 'tsconfig.json', 'tsconfig.base.json',
  'eslint.config.js', 'LICENSE', '.eslintignore', '.dependency-cruiser.cjs',
  '.env.local', '.trackdown.yaml', '.DS_Store'
]);

const ALLOWED_ROOT_DIRS = new Set([
  '.git', '.claude', '.claude-mpm', 'node_modules', 'apps', 'packages',
  'tools', 'docs', 'bin', '.turbo', '.idea', '.mmt-data', '.prompt-cache',
  'config', 'data', 'logs', 'reports', 'scripts', 'tests',
  'code-analysis'
]);

let stable = true;
const issues = [];

console.log('🔍 MMT Stability Check\n' + '='.repeat(50));

// Check build pipeline
console.log('\n📦 Checking build pipeline...');
const commands = [
  { cmd: 'pnpm clean', name: 'Clean' },
  { cmd: 'pnpm install', name: 'Install' },
  { cmd: 'pnpm build', name: 'Build' },
  { cmd: 'pnpm lint', name: 'Lint' },
  { cmd: 'pnpm type-check', name: 'Type Check' },
  { cmd: 'pnpm test', name: 'Test' }
];

for (const { cmd, name } of commands) {
  try {
    console.log(`  Running ${name}...`);
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  ✅ ${name} passed`);
  } catch (error) {
    stable = false;
    issues.push(`❌ ${name} failed`);
    console.log(`  ❌ ${name} failed`);
  }
}

// Check root directory
console.log('\n📁 Checking root directory...');
const rootItems = fs.readdirSync('.');
const invalidItems = rootItems.filter(item => {
  const stats = fs.statSync(item);
  if (stats.isDirectory()) {
    return !ALLOWED_ROOT_DIRS.has(item);
  } else {
    return !ALLOWED_ROOT_FILES.has(item);
  }
});

if (invalidItems.length > 0) {
  stable = false;
  issues.push(`❌ Unexpected items in root: ${invalidItems.join(', ')}`);
  console.log(`  ❌ Found unexpected items: ${invalidItems.join(', ')}`);
} else {
  console.log('  ✅ Root directory clean');
}

// Check for high priority issues
console.log('\n🐛 Checking GitHub issues...');
try {
  const highPriority = execSync('gh issue list --label "high-priority" --state open --json number', { encoding: 'utf8' });
  const blockers = execSync('gh issue list --label "blocker" --state open --json number', { encoding: 'utf8' });
  
  const highPriorityIssues = JSON.parse(highPriority || '[]');
  const blockerIssues = JSON.parse(blockers || '[]');
  
  if (highPriorityIssues.length > 0) {
    issues.push(`⚠️  ${highPriorityIssues.length} high-priority issue(s) open`);
    console.log(`  ⚠️  ${highPriorityIssues.length} high-priority issue(s) open`);
  }
  
  if (blockerIssues.length > 0) {
    stable = false;
    issues.push(`❌ ${blockerIssues.length} blocker issue(s) open`);
    console.log(`  ❌ ${blockerIssues.length} blocker issue(s) open`);
  }
  
  if (highPriorityIssues.length === 0 && blockerIssues.length === 0) {
    console.log('  ✅ No critical issues');
  }
} catch (error) {
  console.log('  ⚠️  Could not check GitHub issues');
}

// Check git status
console.log('\n🔀 Checking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const modifiedFiles = gitStatus.trim().split('\n').filter(line => line.length > 0);
  
  if (modifiedFiles.length > 0) {
    console.log(`  ⚠️  Working directory has ${modifiedFiles.length} change(s)`);
    if (modifiedFiles.length <= 5) {
      modifiedFiles.forEach(file => console.log(`      ${file}`));
    }
  } else {
    console.log('  ✅ Git working directory clean');
  }
} catch (error) {
  issues.push('❌ Git status check failed');
  console.log('  ❌ Git status check failed');
}

// Check for common problem files
console.log('\n🔍 Checking for problem files...');
const problemPatterns = [
  { pattern: 'test-*.md', name: 'test markdown files' },
  { pattern: 'temp-*.js', name: 'temporary JavaScript files' },
  { pattern: 'debug-*.js', name: 'debug JavaScript files' },
  { pattern: '*.log', name: 'log files' }
];

let foundProblems = false;
problemPatterns.forEach(({ pattern, name }) => {
  try {
    const files = execSync(`find . -maxdepth 1 -name "${pattern}" 2>/dev/null`, { encoding: 'utf8' });
    if (files.trim()) {
      foundProblems = true;
      console.log(`  ⚠️  Found ${name}: ${files.trim().split('\n').join(', ')}`);
    }
  } catch (error) {
    // Ignore - no files found
  }
});

if (!foundProblems) {
  console.log('  ✅ No problem files detected');
}

// Summary
console.log('\n' + '='.repeat(50));
if (stable && issues.length === 0) {
  console.log('✅ PROJECT IS IN STABLE STATE');
  console.log('\nAll stability criteria met!');
  process.exit(0);
} else {
  console.log('❌ PROJECT IS NOT IN STABLE STATE\n');
  console.log('Issues found:');
  issues.forEach(issue => console.log('  ' + issue));
  console.log('\n📋 Next steps:');
  console.log('  1. Review STABLE-STATE.md for recovery workflow');
  console.log('  2. Fix each issue listed above');
  console.log('  3. Run this check again to verify stability');
  process.exit(1);
}