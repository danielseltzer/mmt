# Test Coverage Status for Recent Features

## Current Test Status

### 🔴 Missing Test Coverage for New Features

1. **OutputPanel Component** (`/apps/web/src/components/OutputPanel.jsx`)
   - No tests for format selection
   - No tests for format-specific options
   - No tests for preview generation
   - No tests for copy/download functionality

2. **PreviewModal Component** (`/apps/web/src/components/PreviewModal.jsx`)
   - No tests for modal display
   - No tests for operation descriptions
   - No tests for filter summary
   - No tests for execute/cancel functionality

3. **SortConfig Component** (`/packages/table-view/src/SortConfig.tsx`)
   - No tests for sort dropdown
   - No tests for sort direction toggle
   - No tests for sort field selection

4. **PipelinePanels Updates**
   - No tests for Preview button
   - No tests for panel state management with new components

### ⚠️ Existing Test Issues

1. **Table View Tests** (`/packages/table-view/tests/table-view.test.tsx`)
   - All 13 tests are SKIPPED with reason: "Component rapidly evolving"
   - Tests need to be updated to match current implementation

2. **Integration Tests** (`/apps/web/tests/integration/`)
   - 10 tests FAILING due to connection issues (ECONNREFUSED)
   - Tests expect API on port 3000 but it's running on 3001
   - document-table.test.jsx failing to find expected date format

3. **CLI Tests**
   - ScriptCommand tests failing with "Failed to parse URL from http://localhost:undefined/api/pipelines/execute"
   - Missing API port configuration in test environment

### ✅ Passing Tests

1. **Web Unit Tests** (16 tests passing)
   - filter-conversion.test.js (10 tests)
   - date-parsing.test.js (3 tests)  
   - table-rendering.test.jsx (3 tests)

2. **Other Package Tests**
   - Most core packages have passing tests
   - entities, config, query-parser, vault, indexer all passing

## Recommendations

### High Priority
1. Create tests for OutputPanel component
2. Create tests for PreviewModal component
3. Create tests for SortConfig component
4. Fix integration test configuration (port mismatch)

### Medium Priority
1. Update or rewrite table-view tests to match current implementation
2. Fix CLI test configuration for API port
3. Add tests for PipelinePanels with new features

### Test Approach
Following the project's NO MOCKS policy:
- Use real DOM for component tests
- Use temp directories for file operations
- Test actual behavior, not implementation details