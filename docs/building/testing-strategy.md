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

### Core Philosophy: Integration Over Unit Tests

**MMT is fundamentally a system of components talking to each other.** Most of our code integrates third-party libraries (React, TanStack Table, Electron, etc.) rather than implementing complex algorithms. Therefore:

1. **Integration tests are primary** - Test components working together
2. **Unit tests are rare** - Only for packages with actual business logic
3. **UI is always integration tested** - No value in unit testing React components
4. **Backend logic gets unit tests** - Parsing, indexing, and file operations have real algorithms

### 1. Integration Tests (Primary Testing Strategy)

Integration tests verify components working together with real implementations:

**Always Integration Test:**
- **All UI components** - Test with real stores, real DOM, real event handling
- **API endpoints** - Test with running server and real database/indexer
- **File operations** - Test with real files in temp directories
- **End-to-end workflows** - Test complete user journeys

**Test Scenarios:**
- Web app with running API server
- CLI commands with real file operations
- Electron main/renderer communication
- Complete workflows (search → filter → export)

### 2. Unit Tests (Only for Business Logic)

Unit tests are LIMITED to packages with actual algorithms and business logic:

**Packages with Unit Tests:**
- **@mmt/entities** - Schema validation, date/size parsing utilities
- **@mmt/query-parser** - Query language parsing (fs:*.md, fm:status:draft)
- **@mmt/indexer** - Document indexing, backlink graph, performance requirements
- **@mmt/vault** - Query execution, set operations (union/intersect/difference)
- **@mmt/document-operations** - File operations with link preservation
- **@mmt/config** - Configuration validation and loading
- **@mmt/cli** - Command parsing and execution logic
- **@mmt/scripting** - Pipeline execution engine

**Packages WITHOUT Unit Tests:**
- **@mmt/filesystem-access** - Just wraps Node's fs module
- **@mmt/web** - React components tested via integration
- **@mmt/table-view** - Component behavior tested via integration
- **@mmt/api-server** - Endpoints tested via integration

### 3. Test Organization

```
packages/
  indexer/
    src/
      index.test.ts        # Unit tests for indexing logic
  web/
    tests/
      unit/               # Minimal unit tests (date parsing only)
      integration/        # All component and API tests
```

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
# Run all tests (unit + integration)
pnpm test

# Run only unit tests (fast, no external dependencies)
pnpm test:unit

# Run only integration tests (requires API server, slower)
pnpm test:integration

# Run tests for specific package
pnpm --filter @mmt/indexer test

# Run tests in watch mode
pnpm test --watch
```

### Test Commands by Package Type

**For packages with business logic:**
```bash
pnpm --filter @mmt/indexer test:unit     # Fast unit tests
pnpm --filter @mmt/vault test:unit        # Query execution tests
```

**For UI packages:**
```bash
pnpm --filter @mmt/web test:integration   # Requires API server
pnpm --filter @mmt/table-view test        # Component behavior tests
```

### Writing New Tests
1. Write the test FIRST (TDD)
2. Use real files in temp directories
3. Clean up after each test
4. Test behavior, not implementation
5. Include performance assertions where relevant

## Conclusion

This testing strategy ensures MMT works correctly with real files and real operations. By refusing to use mocks, we guarantee our tests reflect actual behavior. This approach has proven to catch more bugs, require less maintenance, and provide greater confidence than mock-based testing.
