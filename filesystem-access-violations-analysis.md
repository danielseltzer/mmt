# Filesystem Access Violations Analysis

## Executive Summary

The compliance checker identified **427 total filesystem violations**, with **103 in production code** and **324 in test files**. The violations are concentrated in specific packages and follow clear patterns that can be systematically addressed.

## Key Findings

### 1. Violation Distribution

- **Total violations**: 427
- **Production code**: 103 violations (24%)
- **Test files**: 324 violations (76%)

### 2. Most Affected Packages

| Package | Violations | Type |
|---------|------------|------|
| apps/api-server | 97 | Mixed (routes, services, test helpers) |
| packages/document-operations | 73 | Operations using context.fs |
| packages/scripting | 56 | File output operations |
| packages/indexer | 49 | Already uses filesystem-access |
| packages/file-relocator | 34 | Already uses filesystem-access |
| apps/cli | 25 | Config reading |
| packages/config | 24 | Config file access |
| apps/control-manager | 20 | PID file management |

### 3. Common Patterns Identified

#### Pattern A: Dynamic Imports of fs modules
```javascript
const { existsSync } = await import('fs');
const fs = await import('fs/promises');
```
**Found in**: apps/api-server/src/routes/documents.ts

#### Pattern B: Using context.fs (already correct!)
```javascript
await context.fs.readFile(documentPath);
await context.fs.exists(fullPath);
```
**Found in**: Most of api-server and document-operations
**Status**: ✅ These are FALSE POSITIVES - already using filesystem-access

#### Pattern C: Direct fs usage in test helpers
```javascript
await fs.mkdtemp(path.join(os.tmpdir(), 'mmt-test-'));
await fs.writeFile(filePath, content);
```
**Found in**: Test files and test helpers

#### Pattern D: Synchronous operations in control-manager
```javascript
fs.existsSync(pidFile);
fs.writeFileSync(pidFile, pid);
fs.unlinkSync(pidFile);
```
**Found in**: apps/control-manager (PID file management)

#### Pattern E: Config file reading
```javascript
readFileSync(configPath, 'utf-8');
existsSync(configPath);
```
**Found in**: packages/config, apps/cli

## Detailed Analysis by Category

### 1. FALSE POSITIVES (Already Compliant)

**~60% of violations are false positives** where the code already uses filesystem-access:

- `context.fs.*` in api-server - This IS the filesystem-access instance
- `this.fs.*` in packages that inject filesystem-access
- `this.fileSystem.*` in indexer and file-relocator

**Recommendation**: Update compliance checker to recognize these patterns.

### 2. Test Files (324 violations)

Test files using direct fs operations for:
- Creating temp directories (`mkdtemp`)
- Writing test fixtures
- Cleaning up after tests

**Recommendation**: Test files should be EXEMPT from this rule as per the "no mocks" principle - tests need direct fs access for real file operations.

### 3. Production Code Requiring Updates

#### A. apps/api-server (2 actual violations)

1. **documents.ts:467** - Uses `existsSync` for QuickLook preview
   - **Solution**: Add `existsSync()` to filesystem-access or use async `exists()`
   
2. **documents.ts:541** - Direct `fs.readFile` import
   - **Solution**: Use `context.fs.readFile()` instead

#### B. apps/control-manager (20 violations)

All related to PID file management using synchronous operations:
- **Solution**: Add sync methods to filesystem-access OR refactor to async

#### C. packages/config (4 violations)

Config loading uses synchronous operations:
- **Solution**: Already has filesystem-access, needs to use it

#### D. apps/cli (1 violation)

Reading package.json synchronously:
- **Solution**: Use filesystem-access or make async

#### E. packages/scripting (3 violations in production)

File output operations:
- **Solution**: Inject filesystem-access dependency

## Recommendations

### 1. Immediate Actions

1. **Fix False Positives in Checker**
   ```javascript
   // Update checker to recognize these patterns:
   - context.fs.*
   - this.fs.*
   - this.fileSystem.*
   ```

2. **Exempt Test Files**
   - Test files should be allowed to use direct fs per "no mocks" principle
   - Update checker to skip test files for filesystem rule

3. **Add Missing Functions to filesystem-access**
   ```typescript
   interface FileSystemAccess {
     // Add synchronous variants for control-manager
     existsSync(path: string): boolean;
     readFileSync(path: string, encoding?: string): string;
     writeFileSync(path: string, content: string): void;
     unlinkSync(path: string): void;
     mkdirSync(path: string, options?: { recursive?: boolean }): void;
     
     // Add utility functions
     mkdtemp(prefix: string): Promise<string>;
     appendFile(path: string, content: string): Promise<void>;
     rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
   }
   ```

### 2. Package-Specific Fixes

#### apps/api-server
- Line 467: Change `existsSync` to `await context.fs.exists()`
- Line 541: Use `context.fs.readFile()` instead of direct import

#### apps/control-manager
- Option 1: Add sync methods to filesystem-access
- Option 2: Refactor to async/await pattern

#### packages/config
- Use injected filesystem-access instead of direct fs

#### packages/scripting
- Accept filesystem-access as dependency injection

### 3. Long-term Improvements

1. **Create filesystem-access/testing submodule**
   - Provide test utilities using filesystem-access
   - Include mkdtemp, fixture creation, cleanup helpers

2. **Update all packages to dependency injection**
   - Pass filesystem-access instance to constructors
   - Remove all direct fs imports

3. **Add lint rule**
   - ESLint rule to prevent direct fs imports
   - Exclude test files from rule

## Summary

The majority of violations (76%) are in test files which should be exempt. Of the remaining 103 production violations, approximately 60% are false positives where the code already uses filesystem-access through dependency injection.

**Actual violations requiring fixes**: ~40 instances across 5 packages

The fixes are straightforward:
1. Update compliance checker to reduce false positives
2. Add missing sync methods to filesystem-access
3. Fix the ~40 actual violations in production code
4. Exempt test files from this rule

This aligns with the architectural principle of centralizing fs access while maintaining the "no mocks" testing philosophy.