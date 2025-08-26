# Deferred Refactoring Tasks

## Files Requiring Complex Refactoring

### 1. document-store.ts (707 lines)
**File**: `apps/web/src/stores/document-store.ts`
**Complexity**: High - Tightly integrated Zustand store
**Why Deferred**: 
- Complex state management with Zustand
- Tightly coupled tab management, filtering, and document operations
- Would require significant refactoring of component dependencies
- Risk of breaking existing functionality

**Partial Work Done**:
- Created `tab-manager.ts` - Tab lifecycle and persistence logic
- Created `filter-manager.ts` - Document filtering logic  
- Created `types.ts` - Shared type definitions
- Created `document-api.ts` - API communication layer

**Recommended Approach**:
1. Gradually migrate functions to use the extracted modules
2. Test thoroughly after each migration
3. Consider using a facade pattern to maintain backward compatibility
4. May need to refactor consuming components simultaneously

### 2. documents.ts (669 lines)
**File**: `apps/api-server/src/routes/documents.ts`
**Complexity**: Medium - Large route handler file
**Why Deferred**:
- Contains many inline filter and processing functions
- Mixed concerns between routing, validation, and business logic
- Would benefit from controller/service pattern

**Recommended Approach**:
1. Extract filter logic to a DocumentFilterService
2. Extract route handlers to DocumentController
3. Keep routes file as thin routing layer
4. Move business logic to service classes

### 3. TableView.tsx (675 lines)
**File**: `packages/table-view/src/TableView.tsx`
**Complexity**: Medium - Large React component
**Why Deferred**:
- Complex table logic with TanStack Table
- Mixed presentation and business logic
- Context menu and selection handling tightly coupled

**Recommended Approach**:
1. Extract column definitions to TableColumns.tsx
2. Extract hooks (useContextMenu, useRowSelection, etc.)
3. Split into smaller sub-components
4. Keep main component as orchestrator

## Technical Debt Summary

These files represent significant technical debt but require careful refactoring to avoid breaking functionality. Each should be tackled in a dedicated PR with comprehensive testing.

## Recommended Priority

1. **TableView.tsx** - Least risky, most straightforward
2. **documents.ts** - Medium risk, clear separation patterns
3. **document-store.ts** - Highest risk, most complex state management

## Notes

- All three files are functional but violate the 500-line guideline
- Refactoring would improve maintainability and testability
- Consider feature flags or gradual migration strategies
- Ensure comprehensive test coverage before refactoring

---
*Created: 2025-08-26*
*Issue Reference: To be created as follow-up to #225*