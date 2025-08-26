# Test Coverage Analysis for Issue #228 - Large File Refactoring

## Executive Summary

Before refactoring the three large files, we've analyzed their current test coverage. The results show varying levels of coverage with significant gaps that should be addressed before refactoring begins.

## Coverage Analysis

### 1. TableView.tsx (675 lines)
**Package**: `packages/table-view/src/TableView.tsx`
**Test File**: `packages/table-view/tests/table-view.test.tsx`
**Status**: ⚠️ **ALL TESTS SKIPPED**

#### Current Coverage
- **Test Cases**: 13 (all skipped with `describe.skip`)
- **Reason**: "Component rapidly evolving"
- **Actual Coverage**: 0%

#### What Should Be Tested (Currently Skipped)
- Basic rendering with documents
- Column visibility and configuration
- Row selection (single and multiple)
- Context menu operations
- Sorting functionality
- Filtering capabilities
- Keyboard shortcuts
- Column resizing
- Performance with large datasets

#### Risk Assessment
- **HIGH RISK** for refactoring without active tests
- Component is complex with TanStack Table integration
- Many user interactions that could break

### 2. document-store.ts (707 lines)
**Package**: `apps/web/src/stores/document-store.ts`
**Test Files**: Multiple integration tests reference it
**Status**: ⚠️ **PARTIAL COVERAGE**

#### Current Coverage
- **Direct Unit Tests**: 1 file (`sorting.test.tsx`)
- **Integration Tests**: 43 test cases across multiple files
- **Estimated Coverage**: ~40%

#### What IS Tested
- Document sorting functionality
- Basic store operations (setDocuments, setLoading, setError)
- Integration with DocumentTable component
- Some tab management (via integration tests)

#### What IS NOT Tested
- Complex tab state management
- Filter persistence
- Local storage operations
- Error recovery scenarios
- Performance optimizations
- Bulk operations
- Search functionality
- Pipeline operations
- Export functionality

#### Files Testing document-store
1. `apps/web/src/__tests__/sorting.test.tsx` - Sorting logic
2. `apps/web/tests/integration/document-table.test.jsx` - Integration
3. `apps/web/tests/integration/full-stack.test.jsx` - E2E flows
4. `apps/web/tests/integration/ui-components.test.jsx` - UI integration
5. `apps/web/tests/integration/components.test.jsx` - Component integration

### 3. documents.ts (669 lines)
**Package**: `apps/api-server/src/routes/documents.ts`
**Test Files**: Limited route testing
**Status**: ⚠️ **MINIMAL COVERAGE**

#### Current Coverage
- **Test Cases**: 10 total (8 + 2)
- **Files**:
  - `search-documents.test.js`: 8 tests (search functionality only)
  - `documents-mtime.test.js`: 2 tests (mtime sorting only)
- **Estimated Coverage**: ~15%

#### What IS Tested
- Basic search functionality
- Search with filters
- mtime-based sorting
- Basic route responses

#### What IS NOT Tested
- Document filtering logic
- Complex query building
- Pipeline execution
- Export functionality
- Error handling
- Validation logic
- Pagination
- Bulk operations
- Performance with large datasets
- Edge cases

## Pre-Refactoring Recommendations

### Critical - Must Do Before Refactoring

#### 1. TableView.tsx
- [ ] Re-enable the 13 skipped tests
- [ ] Fix any failing tests or update for current implementation
- [ ] Add tests for critical paths:
  - [ ] Rendering with empty/large datasets
  - [ ] Selection state management
  - [ ] Context menu operations
  - [ ] Column configuration persistence

#### 2. document-store.ts
- [ ] Create dedicated unit test file
- [ ] Test critical state management:
  - [ ] Tab lifecycle (create, switch, close)
  - [ ] Filter state persistence
  - [ ] Local storage sync
  - [ ] Error states and recovery
- [ ] Test the extracted modules (already created):
  - [ ] tab-manager.ts
  - [ ] filter-manager.ts
  - [ ] document-api.ts

#### 3. documents.ts
- [ ] Add comprehensive route tests:
  - [ ] All filter combinations
  - [ ] Error scenarios (invalid input, missing data)
  - [ ] Large dataset handling
  - [ ] Pipeline execution paths
  - [ ] Export functionality

## Testing Strategy for Refactoring

### Phase 1: Baseline (Before Refactoring)
1. **Create Integration Tests**
   - Capture current behavior exactly
   - Use snapshot testing for responses
   - Record performance metrics

2. **Fix/Enable Existing Tests**
   - TableView: Re-enable skipped tests
   - Update assertions for current behavior

### Phase 2: During Refactoring
1. **Test After Each Extraction**
   - Run tests after moving each piece
   - Ensure no regression

2. **Add Unit Tests for New Modules**
   - Test extracted components in isolation
   - Higher coverage for new code

### Phase 3: Post-Refactoring
1. **Verify Integration Tests Pass**
   - All baseline tests should still pass
   - Performance should not degrade

2. **Update Documentation**
   - Document new module boundaries
   - Update test documentation

## Coverage Targets

### Minimum Before Starting
- TableView.tsx: 50% coverage (re-enable tests)
- document-store.ts: 60% coverage (add unit tests)
- documents.ts: 40% coverage (add route tests)

### Target After Refactoring
- All extracted modules: 80% coverage
- Integration tests: 100% passing
- Performance: No degradation

## Risk Matrix

| File | Current Coverage | Risk Level | Pre-work Required |
|------|-----------------|------------|-------------------|
| TableView.tsx | 0% | HIGH | Re-enable tests, add critical path tests |
| document-store.ts | ~40% | HIGH | Add unit tests for state management |
| documents.ts | ~15% | MEDIUM | Add route tests, validate API contract |

## Recommended Approach

1. **Start with documents.ts** (not TableView)
   - Easier to test routes
   - Clear input/output contract
   - Can add tests quickly

2. **Then TableView.tsx**
   - Re-enable existing tests first
   - Component boundaries are clear
   - Visual testing can help

3. **Finally document-store.ts**
   - Most complex state management
   - Need comprehensive tests first
   - Consider using feature flags

## Time Estimate Updates

With testing requirements:
- **documents.ts**: 4-5 hours (1 hour for tests, 3-4 for refactoring)
- **TableView.tsx**: 3-4 hours (1 hour for tests, 2-3 for refactoring)
- **document-store.ts**: 6-8 hours (2 hours for tests, 4-6 for refactoring)
- **Total**: 13-17 hours (vs original 9-13 hours)

## Conclusion

The current test coverage is insufficient for safe refactoring, particularly for TableView.tsx (0% coverage) and documents.ts (~15% coverage). We strongly recommend adding baseline tests before beginning refactoring work to ensure no regressions occur.

The additional time investment in testing (4 hours) will significantly reduce the risk of breaking changes and make the refactoring process more confident and systematic.