# Vault Package Test Plan - Issue #195

## Overview

This document outlines the comprehensive test plan for adding test coverage to the `@mmt/vault` package. The vault package is a critical component of MMT V3's multi-vault architecture, managing file collections and their lifecycle.

## Context

- **Issue**: #195 - Add test coverage for vault package
- **Priority**: HIGH - Must complete before continuing with Issue #190
- **Current State**: Zero test coverage after refactor
- **Testing Policy**: STRICT NO MOCKS - All tests use real files in temp directories

## Architecture Understanding

After analysis, the vault package implements a well-designed factory pattern:

### Core Components

1. **`Vault` class** - Represents a single markdown file collection from one directory
   - Manages file discovery and access operations
   - Provides real-time updates via file watching
   - Encapsulates all operations for one vault

2. **`VaultProvider` class** - Factory and lifecycle manager for Vault instances
   - Creates and manages multiple vault instances
   - Handles dependency injection (FileWatcher)
   - Ensures proper resource cleanup

3. **`VaultRegistry` class** - Singleton registry for application-wide vault management
   - Manages all vaults in the application
   - Implements smart initialization (default vault sync, others async)
   - Provides centralized access to all vaults

The naming is appropriate and follows standard patterns - no renaming needed.

## Test Structure

```
packages/vault/src/
├── __tests__/
│   ├── vault.test.ts                 # Core Vault class tests
│   ├── vault-provider.test.ts        # VaultProvider factory tests  
│   ├── registry.test.ts              # VaultRegistry singleton tests
│   ├── integration.test.ts           # Integration with real indexer
│   ├── test-utils.ts                 # Shared test utilities
│   └── fixtures/                     # Test markdown files
│       ├── test-vault-1/
│       │   ├── doc1.md
│       │   ├── doc2.md
│       │   └── nested/doc3.md
│       └── test-vault-2/
│           └── other.md
```

## Test Implementation Plan

### Phase 1: Documentation Enhancement

Add JSDoc comments to clarify the relationship between classes:

```typescript
// vault.ts
/**
 * Represents a single vault containing markdown files from a specific directory.
 * Manages file discovery, access, and real-time updates for one file collection.
 * 
 * @example
 * const vault = new Vault('/path/to/markdown/files', fileWatcher);
 * const files = await vault.getFiles();
 * const hasReadme = vault.hasFile('README.md');
 */
export class Vault implements VaultInterface {
  // ...
}

// vault-provider.ts  
/**
 * Factory and lifecycle manager for Vault instances.
 * Creates vaults, manages their lifecycle, and ensures proper resource cleanup.
 * Supports multiple simultaneous vaults for different directories.
 * 
 * @example
 * const provider = new VaultProvider(fileWatcher);
 * const vault = await provider.createVault({ id: 'my-vault', rootDir: '/path' });
 * // ... use vault
 * await provider.closeVault('my-vault'); // Clean up resources
 */
export class VaultProvider {
  // ...
}

// registry.ts
/**
 * Singleton registry managing all vaults in the application.
 * Handles multi-vault initialization with smart loading strategy:
 * - Default vault loads synchronously (blocking)
 * - Additional vaults load asynchronously (non-blocking)
 * 
 * @example
 * const registry = VaultRegistry.getInstance();
 * await registry.initializeVaults(config);
 * const vault = registry.getVault('personal');
 */
export class VaultRegistry {
  // ...
}
```

### Phase 2: Test Utilities

Create shared test utilities following the NO MOCKS rule:

```typescript
// test-utils.ts
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';

export class TestVaultFactory {
  private tempDirs: string[] = [];
  
  /**
   * Creates a test vault with real markdown files in a temp directory
   */
  async createTestVault(name: string, files: Record<string, string>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), `mmt-test-${name}-`));
    this.tempDirs.push(dir);
    
    // Create real markdown files
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(dir, path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf8');
    }
    
    return dir;
  }
  
  /**
   * Cleans up all temp directories created by this factory
   */
  async cleanup(): Promise<void> {
    for (const dir of this.tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

/**
 * Creates a standard test vault structure with sample markdown files
 */
export async function createStandardTestVault(): Promise<string> {
  const factory = new TestVaultFactory();
  return factory.createTestVault('standard', {
    'README.md': '# Test Vault\n\nThis is a test vault.',
    'docs/guide.md': '# Guide\n\nSee [[README]] for more info.',
    'notes/daily/2024-01-01.md': '# Daily Note\n\nToday I learned...',
    'projects/mmt.md': '# MMT Project\n\n- [ ] Add tests\n- [ ] Document',
  });
}
```

### Phase 3: Core Vault Tests

#### vault.test.ts - Test Scenarios

```typescript
describe('Vault', () => {
  let testFactory: TestVaultFactory;
  
  beforeEach(() => {
    testFactory = new TestVaultFactory();
  });
  
  afterEach(async () => {
    await testFactory.cleanup();
  });
  
  describe('Construction and Initialization', () => {
    it('should create vault with valid root directory');
    it('should handle non-existent directory gracefully');
    it('should initialize with empty directory');
  });
  
  describe('File Operations with Real Files', () => {
    it('should return all markdown files with getFiles()');
    it('should retrieve specific file with getFile(path)');
    it('should correctly identify existing files with hasFile(path)');
    it('should convert absolute to relative paths with getRelativePath()');
    it('should handle nested directory structures');
    it('should ignore non-markdown files');
  });
  
  describe('File Watching Integration', () => {
    it('should update when files are added (real file creation)');
    it('should update when files are deleted (real file deletion)');
    it('should update when files are modified (real file writes)');
    it('should handle rapid file changes with debouncing');
  });
  
  describe('Edge Cases', () => {
    it('should handle empty vault directory');
    it('should handle deeply nested structures');
    it('should handle special characters in filenames');
    it('should handle large number of files (100+)');
    it('should handle concurrent file operations');
  });
});
```

### Phase 4: Factory Tests

#### vault-provider.test.ts - Test Scenarios

```typescript
describe('VaultProvider', () => {
  let testFactory: TestVaultFactory;
  let provider: VaultProvider;
  
  beforeEach(() => {
    testFactory = new TestVaultFactory();
    provider = new VaultProvider(mockFileWatcher);
  });
  
  afterEach(async () => {
    await testFactory.cleanup();
  });
  
  describe('Vault Creation', () => {
    it('should create vault with valid config');
    it('should create multiple vaults simultaneously');
    it('should handle duplicate vault IDs');
    it('should validate vault configuration');
  });
  
  describe('Vault Retrieval', () => {
    it('should return correct vault instance with getVault()');
    it('should handle non-existent vault ID');
    it('should maintain vault references');
  });
  
  describe('Vault Cleanup', () => {
    it('should properly clean resources with closeVault()');
    it('should stop file watcher on close');
    it('should prevent access to closed vault');
    it('should handle closing non-existent vault');
  });
  
  describe('Resource Management', () => {
    it('should isolate multiple vaults with different directories');
    it('should maintain proper isolation between vaults');
    it('should clean up memory after closing vaults');
    it('should handle resource limits gracefully');
  });
});
```

### Phase 5: Registry Tests

#### registry.test.ts - Test Scenarios

```typescript
describe('VaultRegistry', () => {
  let testFactory: TestVaultFactory;
  let registry: VaultRegistry;
  
  beforeEach(() => {
    testFactory = new TestVaultFactory();
    // Reset singleton for testing
    VaultRegistry.resetInstance();
    registry = VaultRegistry.getInstance();
  });
  
  afterEach(async () => {
    await registry.shutdown();
    await testFactory.cleanup();
  });
  
  describe('Singleton Pattern', () => {
    it('should return same instance with getInstance()');
    it('should prevent multiple registry creation');
    it('should maintain state across getInstance() calls');
  });
  
  describe('Multi-Vault Initialization', () => {
    it('should initialize multiple vaults from config');
    it('should initialize default vault synchronously');
    it('should initialize additional vaults asynchronously');
    it('should handle initialization failures gracefully');
    it('should report initialization progress');
  });
  
  describe('Vault Access', () => {
    it('should retrieve initialized vaults with getVault()');
    it('should return all vaults with getAllVaults()');
    it('should handle missing vault requests');
    it('should provide vault status information');
  });
  
  describe('Shutdown', () => {
    it('should close all vaults on shutdown()');
    it('should stop file watchers for all vaults');
    it('should have clean state after shutdown');
    it('should handle shutdown with no vaults');
  });
});
```

### Phase 6: Integration Tests

#### integration.test.ts - Real Indexer Integration

```typescript
describe('Vault-Indexer Integration', () => {
  let testFactory: TestVaultFactory;
  let registry: VaultRegistry;
  
  beforeEach(async () => {
    testFactory = new TestVaultFactory();
    registry = VaultRegistry.getInstance();
  });
  
  afterEach(async () => {
    await registry.shutdown();
    await testFactory.cleanup();
  });
  
  describe('Vault + Indexer Integration', () => {
    it('should create vault with real markdown files and index them');
    it('should query documents through indexer');
    it('should resolve backlinks correctly');
    it('should handle frontmatter metadata');
  });
  
  describe('File Watching + Indexing', () => {
    it('should update index when vault detects file changes');
    it('should index new files automatically');
    it('should remove deleted files from index');
    it('should handle file modifications');
  });
  
  describe('Multi-Vault Indexing', () => {
    it('should maintain separate indexes for multiple vaults');
    it('should prevent cross-contamination between vault indexes');
    it('should isolate search results per vault');
    it('should handle concurrent indexing operations');
  });
});
```

## Test Data Strategy

### Fixture Files

Create realistic markdown files that represent actual MMT usage:

```markdown
# fixtures/test-vault-1/doc1.md
---
title: Document One
tags: [test, sample]
created: 2024-01-01
---

# Document One

This is a test document with [[doc2|a link to doc2]].

## Section One

Content with a backlink to [[nested/doc3]].
```

```markdown
# fixtures/test-vault-1/doc2.md
---
title: Document Two
tags: [test]
---

# Document Two

Reference back to [[doc1]].
```

```markdown
# fixtures/test-vault-1/nested/doc3.md
# Nested Document

This document is in a subdirectory.
Links can go up: [[../doc1]]
```

## Coverage Goals

### Target: 100% Coverage for Critical Paths

#### Must Cover:
- All public methods of Vault, VaultProvider, and VaultRegistry
- Error handling paths
- Resource cleanup code
- Multi-vault scenarios
- File watching integration

#### Acceptable to Skip:
- Private utility methods with trivial logic
- Simple getters/setters
- Logging statements

### Coverage Metrics:
- Line Coverage: > 90%
- Branch Coverage: > 85%
- Function Coverage: 100%

## Implementation Timeline

1. **Hour 1**: Add JSDoc documentation to all classes
2. **Hour 2**: Implement test utilities and fixtures
3. **Hour 3-4**: Write and run vault.test.ts
4. **Hour 5-6**: Write and run vault-provider.test.ts
5. **Hour 7**: Write and run registry.test.ts
6. **Hour 8**: Write and run integration.test.ts
7. **Hour 9**: Coverage analysis and gap filling
8. **Hour 10**: Documentation and PR preparation

## Success Criteria

- [ ] All test files created and passing
- [ ] NO MOCKS used - only real files in temp directories
- [ ] Coverage goals met (>90% line coverage)
- [ ] Integration tests with real indexer passing
- [ ] Multi-vault scenarios tested
- [ ] Resource cleanup verified (no file descriptor leaks)
- [ ] Documentation added to clarify class relationships
- [ ] CI pipeline passes all tests

## Risk Mitigation

### Potential Issues and Solutions:

1. **File System Timing Issues**
   - Solution: Use proper async/await patterns
   - Add appropriate delays for file watching debounce

2. **Temp Directory Cleanup Failures**
   - Solution: Always use try/finally for cleanup
   - Force cleanup with `{ force: true }` flag

3. **Cross-Platform Path Issues**
   - Solution: Use Node.js `path` module for all path operations
   - Test on multiple OS platforms in CI

4. **File Watcher Resource Leaks**
   - Solution: Ensure all watchers are stopped in afterEach
   - Monitor file descriptor usage in tests

## Notes

- The vault package architecture is well-designed - no refactoring needed
- Focus on testing the existing functionality thoroughly
- Ensure tests demonstrate proper multi-vault usage patterns
- Tests will serve as documentation for proper vault usage