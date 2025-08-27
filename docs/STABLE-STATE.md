# Project Stable State Definition

## Overview
This document defines what constitutes a "stable state" for the MMT project and provides a workflow to restore stability after periods of development.

## Stable State Criteria

A project is considered to be in a **stable state** when ALL of the following conditions are met:

### 1. Build Pipeline Health ✅
- [ ] `pnpm clean` executes without errors
- [ ] `pnpm install` executes without errors or warnings
- [ ] `pnpm build` executes without errors or warnings
- [ ] `pnpm lint` executes without errors or warnings
- [ ] `pnpm test` executes without errors (all tests pass)
- [ ] `pnpm type-check` executes without errors

### 2. No Critical Issues ✅
- [ ] No HIGH priority GitHub issues that impact system functionality
- [ ] No BLOCKER issues preventing normal use
- [ ] No open PRs with failing CI checks
- [ ] No security vulnerabilities in dependencies

### 3. Clean Root Directory ✅

**IMPORTANT**: Only these 3 .md files are allowed in root. All other .md files must be stored in `/docs/`.

**Allowed files in root:**
- `README.md` - Project documentation
- `CLAUDE.md` - AI assistant instructions  
- `handoff.md` - Development handoff notes
- `package.json` - Root package configuration
- `pnpm-lock.yaml` - Lock file
- `pnpm-workspace.yaml` - Workspace configuration
- `turbo.json` - Turborepo configuration
- `tsconfig.json` - TypeScript configuration
- `tsconfig.base.json` - Base TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `.gitignore` - Git ignore rules
- `.npmrc` - NPM configuration
- `.eslintignore` - ESLint ignore rules
- `.dependency-cruiser.cjs` - Dependency cruiser config
- `.env.local` - Local environment variables
- `.trackdown.yaml` - Trackdown configuration
- `LICENSE` - License file

**Allowed directories in root:**
- `.git/` - Git repository
- `.claude/` - Claude-specific files
- `.claude-mpm/` - Claude MPM files
- `.turbo/` - Turborepo cache
- `.idea/` - IDE configuration
- `.mmt-data/` - MMT data directory
- `.prompt-cache/` - Prompt cache
- `node_modules/` - Dependencies
- `apps/` - Application packages
- `packages/` - Library packages
- `tools/` - Development tools
- `docs/` - Documentation
- `bin/` - Executable scripts
- `config/` - Configuration files
- `data/` - Data files
- `logs/` - Log files
- `reports/` - Report files (test results should go here)
- `scripts/` - Utility scripts
- `tests/` - Test files
- `code-analysis/` - Code analysis results

**NOT allowed in root:**
- Any .md files except README.md, CLAUDE.md, and handoff.md (all others go in `/docs/`)
- Temporary test files (`*.test.js`, `test-*.md`)
- Build artifacts (`dist/`, `*.log`)
- STABLE-STATE.md (this file belongs in `/docs/`)
- ROADMAP.md or any other documentation files
- Development scripts (`temp-*.js`, `debug-*.js`)
- Extra config files (unless explicitly needed)
- Personal notes or TODO files
- Cache directories (except `.turbo/`)

### 4. Documentation Consistency ✅
- [ ] `CLAUDE.md` is up-to-date with current commands
- [ ]<bsp>`README.md` accurately reflects project state
- [ ] No orphaned documentation files
- [ ] No conflicting information across docs

### 5. Git Hygiene ✅
- [ ] Working directory is clean or has only intended changes
- [ ] No uncommitted files that should be tracked
- [ ] No untracked files that should be ignored
- [ ] Current branch has descriptive name
- [ ] No merge conflicts

## Stability Verification Workflow

### Quick Check Command
```bash
# Run this command to quickly check stability
pnpm clean && pnpm install && pnpm build && pnpm lint && pnpm test && echo "✅ STABLE STATE ACHIEVED"
```

### Detailed Verification Steps

#### Step 1: Check Build Pipeline
```bash
# Clean and rebuild everything
pnpm clean
pnpm install
pnpm build
pnpm lint
pnpm type-check
pnpm test
```

#### Step 2: Check GitHub Issues
```bash
# List high priority issues
gh issue list --label "high-priority" --state open
gh issue list --label "blocker" --state open

# Check for PRs with failing checks
gh pr list --state open
```

#### Step 3: Audit Root Directory
```bash
# List all files in root (review against allowed list)
ls -la

# Find potentially unwanted files
find . -maxdepth 1 -type f -name "*.test.*" -o -name "temp-*" -o -name "debug-*"
```

#### Step 4: Check Git Status
```bash
git status
git diff --stat
```

## Recovery Workflow

When the project is NOT in a stable state, follow this workflow:

### Phase 1: Immediate Fixes
1. **Fix failing tests**
   ```bash
   pnpm test 2>&1 | grep -E "FAIL|Error"
   # Fix each failing test file
   ```

2. **Fix lint errors**
   ```bash
   pnpm lint --fix
   # Manually fix remaining issues
   ```

3. **Fix type errors**
   ```bash
   pnpm type-check
   # Fix each type error
   ```

### Phase 2: Clean Up
1. **Remove unwanted root files**
   ```bash
   # Review and remove temporary files
   rm -f test-*.md temp-*.js debug-*.js
   ```

2. **Clean git status**
   ```bash
   # Stage intended changes
   git add -A
   # Review changes
   git status
   ```

3. **Update dependencies if needed**
   ```bash
   pnpm update --interactive
   ```

### Phase 3: Issue Resolution
1. **Address high-priority issues**
   - Review each high-priority issue
   - Create plan to resolve blockers
   - Fix or defer with justification

2. **Fix failing PRs**
   - Review PR checks
   - Fix CI failures
   - Merge or close PRs

### Phase 4: Final Verification
```bash
# Run full stability check
pnpm clean && pnpm install && pnpm build && pnpm lint && pnpm test

# Verify clean root
ls -la | grep -vE "^d|README|CLAUDE|STABLE-STATE|handoff|package|pnpm|turbo|\.git|\.npmrc|tsconfig|eslint|LICENSE"

# Check issues again
gh issue list --label "high-priority" --state open

# If all pass:
echo "✅ STABLE STATE RESTORED"
```

## Automation Script

Save this as `tools/check-stability.js`:

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALLOWED_ROOT_FILES = new Set([
  'README.md', 'CLAUDE.md', 'handoff.md',
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'turbo.json', '.gitignore', '.npmrc', 'tsconfig.json', 'tsconfig.base.json',
  'eslint.config.js', 'LICENSE', '.eslintignore', '.dependency-cruiser.cjs',
  '.env.local', '.trackdown.yaml'
]);

const ALLOWED_ROOT_DIRS = new Set([
  '.git', '.claude', '.claude-mpm', 'node_modules', 'apps', 'packages',
  'tools', 'docs', 'bin', '.turbo', '.idea', '.mmt-data', '.prompt-cache',
  'config', 'data', 'logs', 'reports', 'scripts', 'tests', 'code-analysis'
]);

let stable = true;
const issues = [];

// Check build pipeline
console.log('🔍 Checking build pipeline...');
try {
  execSync('pnpm clean', { stdio: 'pipe' });
  execSync('pnpm install', { stdio: 'pipe' });
  execSync('pnpm build', { stdio: 'pipe' });
  execSync('pnpm lint', { stdio: 'pipe' });
  execSync('pnpm type-check', { stdio: 'pipe' });
  execSync('pnpm test', { stdio: 'pipe' });
  console.log('✅ Build pipeline healthy');
} catch (error) {
  stable = false;
  issues.push('❌ Build pipeline has errors');
}

// Check root directory
console.log('🔍 Checking root directory...');
const rootItems = fs.readdirSync('.');
const invalidItems = rootItems.filter(item => {
  const stats = fs.statSync(item);
  if (stats.isDirectory()) {
    return !ALLOWED_ROOT_DIRS.has(item) && !item.startsWith('.');
  } else {
    return !ALLOWED_ROOT_FILES.has(item) && !item.startsWith('.');
  }
});

if (invalidItems.length > 0) {
  stable = false;
  issues.push(`❌ Unexpected items in root: ${invalidItems.join(', ')}`);
} else {
  console.log('✅ Root directory clean');
}

// Check git status
console.log('🔍 Checking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim().length > 0) {
    console.log('⚠️  Working directory has changes (review if intentional)');
  } else {
    console.log('✅ Git working directory clean');
  }
} catch (error) {
  issues.push('❌ Git status check failed');
}

// Summary
console.log('\n' + '='.repeat(50));
if (stable && issues.length === 0) {
  console.log('✅ PROJECT IS IN STABLE STATE');
  process.exit(0);
} else {
  console.log('❌ PROJECT IS NOT IN STABLE STATE');
  issues.forEach(issue => console.log(issue));
  console.log('\nRun recovery workflow from STABLE-STATE.md');
  process.exit(1);
}
```

## Usage

### Check Stability
```bash
# Quick check
node tools/check-stability.js

# Or if made executable
./tools/check-stability.js
```

### Restore Stability
```bash
# When unstable, tell Claude:
"The project is not in a stable state. Please follow the recovery workflow in docs/STABLE-STATE.md to restore stability."
```

## Maintenance

- Review and update this document when project requirements change
- Add new criteria as needed
- Keep the allowed files/directories list current
- Update recovery workflow based on common issues encountered