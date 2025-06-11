# MMT Testing Strategy

This document outlines our approach to testing the MMT codebase, focusing on real-world behavior with zero tolerance for mocks.

## Testing Philosophy

### ABSOLUTE RULE: NO MOCKS ALLOWED

**This codebase has a ZERO TOLERANCE policy for mocks, test doubles, stubs, or any form of test substitutes.**

Our testing strategy prioritizes:

1. **Real implementations only** - no mocks, no exceptions
2. **End-to-end workflows** that verify actual user scenarios
3. **Integration tests** with real dependencies
4. **Limited unit tests** only for complex business logic (still no mocks)

We learned through painful experience that mocks are harmful:
- They create false confidence while the real system fails
- They waste developer time with constant maintenance
- They hide integration issues until production
- Every mock is a lie that causes pain

Since MMT operates on real files and integrates multiple packages, we test with real implementations exclusively. No mocks means no lies.

## Testing Approach

### 1. End-to-End Tests for Core Workflows

These tests verify complete user workflows from start to finish:

**Test Scenarios:**
- Search a vault of test markdown files and verify correct results
- Move multiple files and verify all links are updated
- Update frontmatter properties across multiple files
- Save and restore table view configurations
- Export filtered results to CSV

**Benefits:**
- Verifies the system works as a whole
- Tests real-world user scenarios
- Catches integration issues between packages

### 2. Integration Tests for Key Components

These tests focus on critical integration points with real dependencies:

**Test Scenarios:**
- Test indexer with a vault of 100+ real markdown files
- Test file-relocator with complex link structures
- Test document-operations with snapshot/restore cycles
- Test query-parser with various GitHub-style queries
- Test IPC communication between main and renderer

**Benefits:**
- Verifies package integrations work correctly
- Tests with real files and operations
- Identifies issues at package boundaries

### 3. Limited Unit Tests for Complex Logic

We use unit tests (with ZERO mocking) only for areas with complex business logic:

**Areas:**
- Query parsing logic for GitHub-style syntax
- Link resolution algorithms in file-relocator
- Zod schema validation edge cases
- Path manipulation and validation

**Benefits:**
- Focuses unit testing where it adds the most value
- Tests complex logic in isolation
- Provides faster feedback for core algorithms

## Implementation Plan

### Phase 1: Foundation Tests (Milestone 1)

1. **Test Zod Schemas**:
   - Validate all entity schemas with realistic data
   - Test edge cases and validation errors
   - Ensure TypeScript types match runtime validation

2. **Test FileSystem Access**:
   - Create, read, update, delete real files
   - Test directory operations
   - Verify error handling for missing files

3. **Test Config Loading**:
   - Valid and invalid YAML files
   - Missing required fields
   - Path validation

### Phase 2: Indexing Tests (Milestone 2)

1. **Test Query Parser**:
   - Parse various GitHub-style queries
   - Handle syntax errors gracefully
   - Verify query structure output

2. **Test Indexer Performance**:
   - Create test vault with 5000 files
   - Measure indexing time < 5 seconds
   - Test incremental updates via file watching

### Phase 3: Operations Tests (Milestone 3)

1. **Test Document Operations**:
   - Move files with snapshot creation
   - Update frontmatter properties
   - Verify rollback on failure

2. **Test File Relocator**:
   - Update wikilinks when files move
   - Handle relative and absolute paths
   - Preserve link text

## Test Data Management

1. **Test Fixtures**:
   - Small test vault (10-20 files) for integration tests
   - Large test vault (5000+ files) for performance tests
   - Files with complex link structures
   - Various frontmatter patterns

2. **Test Environment**:
   - Use OS temp directories via `mkdtemp()`
   - Clean up after each test
   - No shared state between tests
   - Real file operations only

## Measuring Success

Rather than focusing solely on coverage metrics, we measure success by:

1. **Workflow Verification**: Do the core user workflows work correctly?
2. **Regression Prevention**: Do tests catch breaking changes?
3. **Documentation Value**: Do tests serve as executable documentation?
4. **Maintenance Cost**: Are tests easy to maintain and not brittle?

## Test Execution

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @mmt/indexer test

# Run tests in watch mode
pnpm test --watch

# Run performance tests
pnpm test:perf
```

### Writing New Tests
1. Write the test FIRST (TDD)
2. Use real files in temp directories
3. Clean up after each test
4. Test behavior, not implementation
5. Include performance assertions where relevant

## Conclusion

This testing strategy ensures MMT works correctly with real files and real operations. By refusing to use mocks, we guarantee our tests reflect actual behavior. This approach has proven to catch more bugs, require less maintenance, and provide greater confidence than mock-based testing.
