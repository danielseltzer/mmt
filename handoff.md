# MMT Handoff Document

## Current Status (2024-01-07)

### What Was Just Completed
1. **Declarative Filter System** (PR #142)
   - Replaced JavaScript function-based filters with declarative Zod schemas
   - API now has full control over pipeline execution
   - All MVP filter types implemented: text, folder, tag, metadata, date, size
   - Filter evaluation logic implemented in both API and script runner
   - Examples and tests updated to use new format

### Current State of the Codebase
- Main branch includes the declarative filter implementation
- All tests pass except for unrelated issues
- API successfully handles declarative filters
- Script runner replicates filter logic for analysis operations
- FilterBar component still uses old format (needs update)

## Immediate Next Steps

### 1. Update FilterBar Component (Priority: HIGH)
The FilterBar in `apps/web/src/components/FilterBar.jsx` currently generates filters in this format:
```javascript
{
  name: "search term",
  content: "content search", 
  folders: ["/path1", "/path2"],
  metadata: ["key1", "key2"],
  dateExpression: "< 7 days",
  sizeExpression: "over 1mb"
}
```

It needs to generate the new declarative format:
```javascript
{
  conditions: [
    { field: 'name', operator: 'contains', value: 'search term' },
    { field: 'content', operator: 'contains', value: 'content search' },
    { field: 'folders', operator: 'in', value: ['/path1', '/path2'] },
    { field: 'metadata', operator: 'equals', key: 'key1', value: true },
    // etc.
  ],
  logic: 'AND'
}
```

**Key tasks:**
- Parse date expressions (e.g., "< 7 days") into proper date filters
- Parse size expressions (e.g., "over 1mb") into proper size filters
- Convert folder array into proper folder filter
- Convert metadata array into multiple metadata conditions
- Update document-store.ts to use FilterCollection type

### 2. Fix Remaining Technical Debt (Priority: HIGH)
Several packages have accumulated lint and type errors:
- **scripting package**: Multiple TypeScript errors need fixing
- **indexer package**: Lint errors with case declarations
- **web tests**: Unused imports need cleanup

Run `pnpm lint` and `pnpm type-check` to see all issues.

### 3. Implement GUI Pipeline Builder (#127) (Priority: HIGH)
Now that the API uses OperationPipelineSchema throughout, we can build the visual pipeline builder:
- SELECT panel: Visual query builder
- FILTER panel: Visual filter builder using new declarative format
- TRANSFORM panel: Operation selection and configuration
- OUTPUT panel: Format and destination selection

### 4. Add Execution Feedback (#128) (Priority: MEDIUM)
- Real-time progress updates during execution
- Show results in the GUI after pipeline execution
- Display errors clearly

### 5. Future Enhancements (Priority: LOW)
- Document Preview (#12)
- View Persistence (#14)
- Export UI (#18)

## Important Technical Context

### Filter System Architecture
1. **FilterCollection** is the top-level container with conditions[] and logic
2. **FilterCondition** is a discriminated union based on the `field` property
3. Each filter type has specific operators and value types
4. The same evaluation logic is implemented in both:
   - `apps/api-server/src/services/pipeline-executor.ts`
   - `packages/scripting/src/script-runner.ts`

### API Integration Points
- `/api/documents` endpoint accepts filters in query param (JSON stringified)
- `/api/pipelines/execute` accepts full OperationPipeline with filters
- Document content is loaded during selection for content-based filtering

### Testing Approach
- Integration tests use real API server (no mocks)
- Test config uses different ports (3002, 8002) to avoid conflicts
- All file operations use temp directories

## Known Issues
1. Created date filtering not supported (document schema lacks creation date)
2. Some TypeScript errors in scripting package need resolution
3. FilterBar hardcodes vault path (should use fetched config)

## Development Commands
```bash
# Full rebuild and test
pnpm clean
pnpm install
pnpm build
pnpm lint
pnpm test

# Run specific package commands
pnpm --filter @mmt/web dev
pnpm --filter @mmt/api-server dev

# Run integration tests only
pnpm --filter @mmt/web test:integration
```

## Architecture Reminders
- NO MOCKS policy - test with real files
- NO DEFAULTS - explicit configuration required
- Fail fast with clear error messages
- All file operations go through filesystem-access package
- Zod schemas define all contracts between packages