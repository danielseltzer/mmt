# MMT Handoff Document

## Current Status (2025-01-24)

### Recently Completed Work

1. **#144 - Updated FilterBar Component** ✅
   - FilterBar now generates declarative FilterCollection format
   - Proper parsing of date and size expressions
   - Integration with document store using new format

2. **#126 - Refactored API to use OperationPipelineSchema** ✅
   - Created `/api/pipelines/execute` endpoint
   - Pipeline executor supports SELECT → FILTER → TRANSFORM → OUTPUT model
   - Full integration tests passing

3. **Fixed File Watcher Integration** ✅
   - Files created after server startup are now properly indexed
   - Pipeline operations can immediately access new files with full metadata
   - Added timing documentation for file watcher behavior

### Current State of the Codebase
- All integration tests passing
- File watching properly detects and indexes new documents
- API pipeline endpoint fully functional with declarative filters
- FilterBar generates correct declarative filter format
- No known blocking bugs

## Priority Work Queue

### 1. GUI Pipeline Builder (#127) - **HIGHEST PRIORITY** 🔥
Build the visual pipeline interface with four panels:

**SELECT Panel:**
- File picker (browse vault files)
- Query builder (search by content/name)
- Recent files selector
- "All files" option

**FILTER Panel:**
- Visual filter builder using declarative format
- Add/remove filter conditions
- AND/OR logic selector
- Filter presets (e.g., "Modified this week", "Large files")

**TRANSFORM Panel:**
- Operation type selector (rename, move, update frontmatter, delete)
- Operation-specific configuration forms
- Preview mode toggle
- Batch operation settings

**OUTPUT Panel:**
- Results display format
- Export options (CSV, JSON)
- Summary statistics

**Implementation approach:**
- Start with basic SELECT panel
- Add one operation type (rename) to test end-to-end
- Incrementally add features
- Use existing DocumentList component where possible

### 2. Fix Integration Test Failures (#141) - **HIGH PRIORITY**
- Investigate failures after shared API server implementation
- Update tests to work with new architecture
- Ensure all packages have passing tests

### 3. Remove Hardcoded URLs/Ports (#132) - **HIGH PRIORITY**
- Create configuration service for frontend
- Load API URL from environment/config
- Remove hardcoded localhost:3001 references
- Support deployment to different environments

### 4. Add Execution Feedback (#128) - **MEDIUM PRIORITY**
- Progress indicator during pipeline execution
- Real-time status updates
- Results display after completion
- Error handling and display
- Operation history/log

### 5. End-to-End Testing (#19) - **MEDIUM PRIORITY**
- Set up Playwright or similar
- Test complete user workflows
- Cover main use cases:
  - Search and filter documents
  - Execute rename operation
  - Bulk metadata updates
  - Export results

### 6. Fix Table-View Tests (#138, #122) - **MEDIUM PRIORITY**
- Update tests to match current implementation
- Remove references to non-existent UI features
- Ensure consistent test coverage

## Lower Priority Items

### Documentation & Cleanup
- #143 - Update CLAUDE.md to reflect current architecture
- #72 - Create scripting documentation with examples
- #66 - Create ADR for package documentation standards

### Feature Enhancements
- #18 - Create Reports Package (p1)
- #14 - Build View Persistence Package (p1)
- #12 - Create Document Previews Package (p2)
- #22 - Add Similarity Features (p2)

### Technical Debt
- #135 - Remove redundant operation schemas
- #86 - Fix flaky file watcher test (may be fixed already)
- #56 - Review and prune test scripts collection

## Technical Context

### API Endpoints
- `GET /api/config` - Returns vault configuration
- `GET /api/documents` - List/search documents with filters
- `POST /api/pipelines/execute` - Execute operation pipeline
- `GET /api/documents/by-path/*` - Get single document metadata

### Key Data Structures

**OperationPipeline:**
```typescript
{
  select: SelectCriteria,      // What documents to operate on
  filter?: FilterCollection,   // Additional filtering
  operations: Operation[],     // What to do with them
  output?: OutputConfig[],     // How to format results
  options?: ExecutionOptions   // Preview mode, error handling
}
```

**FilterCollection:**
```typescript
{
  conditions: FilterCondition[],  // Array of filters
  logic: 'AND' | 'OR'            // How to combine them
}
```

### Testing Strategy
- NO MOCKS - use real file operations
- Integration tests use temp directories
- Test config uses different ports (3002, 8002)
- File watcher needs 200-300ms delay in tests

### Development Commands
```bash
# Start development servers
pnpm dev                    # Start all services
pnpm --filter @mmt/web dev  # Frontend only
pnpm --filter @mmt/api-server dev  # API only

# Testing
pnpm test                   # All tests
pnpm test:integration       # Integration tests only
pnpm --filter @mmt/web test # Package-specific tests

# Code quality
pnpm lint                   # ESLint
pnpm type-check            # TypeScript checking
pnpm clean && pnpm install && pnpm build  # Full rebuild
```

## Known Issues & Gotchas

1. **File Watcher Timing**: New files need ~200-300ms to be indexed due to debouncing
2. **Created Date**: Not supported in filters (documents don't store creation date)
3. **Hardcoded Vault Path**: FilterBar still hardcodes path (should use config)
4. **API URL**: Frontend hardcodes localhost:3001 (needs config service)

## Architecture Decisions

1. **Declarative Filters**: All filtering uses Zod-validated schemas, no executable code
2. **Schema-First**: Every API endpoint has request/response Zod schemas
3. **No Defaults**: Explicit configuration required for everything
4. **Real Testing**: No mocks, test with actual file operations
5. **Fail Fast**: Clear error messages, no silent failures

## Next Session Starting Point

Begin with issue #127 - implement the GUI pipeline builder:
1. Create the four-panel layout
2. Start with basic SELECT panel using existing DocumentList
3. Add simple rename operation to test end-to-end flow
4. Incrementally add features

The API is ready, the filters work, and all the pieces are in place. The GUI is the missing piece that will make this system usable by end users.