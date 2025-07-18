# MMT Development Handoff

## Current State (January 15, 2025)

### Just Completed

1. **Advanced Scripting Removal (PR #129 - Merged)**
   - Removed all advanced scripting features (conditionals, loops, try-catch, etc.)
   - Scripts are now simple SELECT → TRANSFORM → OUTPUT pipelines
   - Deleted 2,171 lines of complexity
   - Core scripting functionality preserved

2. **Issue Cleanup**
   - Closed: #110, #109, #106, #108, #47, #91, #90, #89, #31
   - Created: #121 (advanced scripting review), #122 (table-view tests), #124 (remove advanced scripting), #125 (UXR), #126 (API refactoring), #127 (GUI panels), #128 (operation feedback)
   - Created GUI Alpha milestone with UXR as P0

### Next Priority: API Refactoring (#126)

**Goal**: Replace ad-hoc operation endpoints with unified pipeline execution using `OperationPipelineSchema`.

**Implementation Plan**:

1. **Add ScriptRunner to API Context**
   - Update `/apps/api-server/src/context.ts` to include ScriptRunner
   - Initialize in `createContext()` with indexer

2. **Create Pipeline Router**
   - New file: `/apps/api-server/src/routes/pipelines.ts`
   - Single endpoint: `POST /api/pipelines/execute`
   - Parse body as `OperationPipelineSchema`, execute with ScriptRunner

3. **Remove Old Endpoints**
   - Delete `/apps/api-server/src/routes/operations.ts`
   - No backward compatibility needed (single user)

4. **Update API Schemas**
   - Clean up `/packages/entities/src/api-schemas.ts`
   - Add pipeline request/response schemas

5. **Update GUI**
   - Modify operation calls to use new pipeline endpoint
   - Build proper pipeline objects (select → operations → output)

**Key Decision**: File watcher already handles index updates correctly (delete+create for moves, modify for content changes). No need for manual index updates.

### Architecture Clarifications

- **No Adapters**: Direct implementation, no legacy support
- **No Advanced Features**: Just simple pipelines after #124
- **Unified Model**: Same `OperationPipelineSchema` everywhere
- **File Watcher Works**: Tested - handles all index updates via FS events

### Upcoming Work Queue

1. **#126** - API refactoring (ready to implement)
2. **#127** - GUI panels (SELECT/TRANSFORM/OUTPUT)
3. **#128** - Operation feedback UI
4. **#125** - UXR work (P0 for GUI Alpha)

### Key Principles Maintained

- No mocks in tests
- No backward compatibility
- Scripts are simple pipelines, not programming languages
- Single source of truth (OperationPipelineSchema)
- Let file watcher handle index updates

### Development Commands

```bash
# Start development
pnpm dev

# Run with config
pnpm dev -- --config test-config.yaml

# Build and test
pnpm build
pnpm lint  # Has some unrelated web app issues
pnpm test  # Table-view tests failing (tracked in #122)
```

### Current Issues to Review

- **#86** - File watcher test (important for operations)
- **#56** - Review test scripts (low priority)
- **#55** - Multiple output formats (important)
- **#19** - E2E testing (needs update for web)
- **#18** - Reports/Export (has API, needs UI)
- **#14** - View persistence
- **#12** - Document previews (tooltip idea)

## Ready to Continue

Start with implementing #126 using the simplified plan - no manual index updates needed, just let the file watcher do its job.