# MMT Issues and Milestones

## Development Phases

### Milestone 1: Foundation & Core (Week 1-2)
**Goal**: Set up monorepo structure and foundational packages

### Milestone 2: Local Indexing System (Week 3-4)
**Goal**: Build local file indexing based on Dataview patterns

### Milestone 3: Document Operations (Week 5-6)
**Goal**: Implement file operations with link integrity

### Milestone 4: UI & Table View (Week 7-8)
**Goal**: Build the React UI with table view

### Milestone 5: Integration & Polish (Week 9-10)
**Goal**: Wire everything together, test, and polish

### Milestone 6: QM Enhancement (Week 11-12)
**Goal**: Add optional vector similarity search via QM

---

## Issues by Milestone

### Milestone 1: Foundation & Core

#### Issue #1: Initialize Monorepo Structure
**Labels**: `setup`, `infrastructure`, `p0`
**Description**:
- Create Electron + React + TypeScript monorepo using electron-vite
- Set up pnpm workspaces and Turborepo
- Configure TypeScript project references
- Set up ESLint, Prettier
- Create 13 package folders

**Acceptance Criteria**:
- [ ] `pnpm dev` starts the application
- [ ] Hot reload works for renderer
- [ ] TypeScript compiles without errors
- [ ] All 13 packages have proper structure
- [ ] Turborepo build pipeline configured

---

#### Issue #2: Create Entities Package
**Labels**: `package`, `entities`, `p0`
**Description**:
Create `@mmt/entities` package with all Zod schemas:
- Document, DocSet, Query schemas
- Operation schemas (Move, UpdateProperties)
- DocSetView schema
- VaultConfig schema
- LinkReference schema (placeholder)

**Test Requirements**:
```typescript
// entities.test.ts - Write these tests FIRST
describe('Document Schema', () => {
  it('validates document with all field types')
  it('accepts frontmatter with strings, numbers, arrays, objects')
  it('rejects invalid date formats')
  it('makes preview optional')
})

describe('VaultConfig Schema', () => {
  it('requires vaultPath and validates it exists')
  it('validates qmServiceUrl as proper URL when provided')
  it('rejects config with missing required fields')
})
```

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] All schemas defined with Zod
- [ ] TypeScript types exported via inference
- [ ] Frontmatter supports all types (string, number, boolean, date, arrays, objects)
- [ ] Package has clean exports from index.ts

---

#### Issue #3: Implement FileSystem Access Package
**Labels**: `package`, `filesystem-access`, `p0`
**Description**:
Create `@mmt/filesystem-access` as centralized file operations layer:
- Read/write file operations
- Directory operations
- Path validation
- Single IPC boundary for all file access

**Acceptance Criteria**:
- [ ] All file operations go through this package
- [ ] IPC handlers for main process
- [ ] Client API for renderer process
- [ ] Path validation prevents directory traversal
- [ ] Real file operations (no mocks in tests)

---

#### Issue #4: Create Config Package
**Labels**: `package`, `config`, `p0`
**Description**:
Create `@mmt/config` for explicit configuration:
- Load config from specified path (--config flag required)
- Validate against VaultConfig schema
- No defaults, no fallbacks, no env vars
- Exit with clear errors if invalid

**Acceptance Criteria**:
- [ ] Requires --config flag at startup
- [ ] Validates all required fields
- [ ] Clear error messages for missing/invalid config
- [ ] Config path must be absolute

---

### Milestone 2: Local Indexing System

#### Issue #5: Create Query Parser Package
**Labels**: `package`, `query-parser`, `p0`
**Description**:
Create `@mmt/query-parser` package:
- Parse GitHub-style query syntax
- Support: text, path filters, date filters, property filters
- Examples: `"text" path:/Projects/* modified:>2024-01-01 kind:ideas`
- Return Query schema objects

**Test Requirements**:
```typescript
// query-parser.test.ts - Write these tests FIRST
describe('QueryParser', () => {
  it('parses "hello world" as text search')
  it('parses path:/Projects/* as path filter with wildcard')
  it('parses modified:>2024-01-01 as date after filter')
  it('parses kind:ideas as property equals filter')
  it('parses has:status as property exists filter')
  it('combines "text" path:/Projects/* kind:ideas with AND logic')
  it('returns clear error for invalid syntax like modified:~2024')
  it('handles edge cases: empty quotes, special characters')
})
```

**Acceptance Criteria**:
- [ ] All test cases written first and failing
- [ ] Implementation makes all tests pass
- [ ] Parser handles all query types
- [ ] Error messages helpful for users
- [ ] Query syntax documented with examples

---

#### Issue #6: Build Indexer Package (Dataview-inspired)
**Labels**: `package`, `indexer`, `p0`
**Description**:
Create `@mmt/indexer` adapting Dataview's patterns:
- Index markdown files: frontmatter, links, tags
- Build indices: LinkIndex, FrontmatterIndex, PathIndex
- Watch for file changes and update incrementally
- Execute queries against local index

**Reference**: Study https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/data-index/index.ts

**Test Requirements**:
```typescript
// indexer.test.ts - Write these E2E tests FIRST
describe('Indexer E2E', () => {
  // Set up test vault with these files:
  // - doc1.md: contains [[doc2]] and [[doc3]]
  // - doc2.md: contains [[doc1]] 
  // - doc3.md: contains [link to doc1](doc1.md)
  
  it('indexes a small vault and finds all documents')
  it('finds all files linking TO doc1 (should return doc2, doc3)')
  it('finds all files linked FROM doc1 (should return doc2, doc3)')
  it('queries by frontmatter property kind:test')
  it('queries by path pattern path:/folder/*')
  it('combines text search with property filter')
  it('updates index when file is modified')
  it('updates links when file is moved')
  it('handles 5000 files in < 5 seconds')
})
```

**Acceptance Criteria**:
- [ ] All E2E test cases pass with real files
- [ ] No mocks - actual file operations
- [ ] Indexes 5000+ files efficiently
- [ ] Extracts wikilinks and markdown links correctly
- [ ] Query execution returns correct Document arrays

---

#### Issue #7: Implement Link Extraction
**Labels**: `package`, `indexer`, `p1`
**Description**:
Within indexer, implement link parsing:
- Extract `[[wikilinks]]` with regex
- Extract `[markdown](links)` with regex
- Build bidirectional link index
- Handle link anchors (`[[file#heading]]`)

**Acceptance Criteria**:
- [ ] Find all outgoing links from a document
- [ ] Find all incoming links to a document
- [ ] Preserve link text and anchors
- [ ] Handle edge cases (links in code blocks, etc.)

---

#### Issue #8: Create DocSet Builder
**Labels**: `package`, `docset-builder`, `p1`
**Description**:
Create `@mmt/docset-builder`:
- Accept string query or Query object
- Use query-parser if needed
- Execute via indexer
- Build DocSet with metadata
- Enforce 500 document limit

**Acceptance Criteria**:
- [ ] Builds DocSet from queries
- [ ] Includes metadata (ID, timestamp, query)
- [ ] Limits results to 500 with appropriate message
- [ ] Validates output against schema

---

### Milestone 3: Document Operations

#### Issue #9: Implement Document Operations Package
**Labels**: `package`, `document-operations`, `p0`
**Description**:
Create `@mmt/document-operations`:
- Define Operation types (move, updateProperties)
- Implement OperationOrchestrator
- Create snapshots using hard links (`cp -al`)
- Execute operations with detailed results

**Test Requirements**:
```typescript
// document-operations.test.ts - Write these tests FIRST
describe('Document Operations E2E', () => {
  it('moves file and updates all links pointing to it')
  it('refuses to move if destination file exists')
  it('creates snapshot before operation using hard links')
  it('restores from snapshot if operation fails halfway')
  it('adds new frontmatter property without disturbing content')
  it('removes frontmatter property completely')
  it('reports success/failure per file in batch operation')
  
  // Performance test
  it('moves 100 files in < 10 seconds with link updates')
})
```

**Acceptance Criteria**:
- [ ] All test cases pass with real file operations
- [ ] Snapshot/restore mechanism verified
- [ ] Move operations work correctly
- [ ] Property updates modify frontmatter properly
- [ ] Conflict detection prevents overwrites
- [ ] Detailed per-file results returned

---

#### Issue #10: Build File Relocator Package
**Labels**: `package`, `file-relocator`, `p0`
**Description**:
Create `@mmt/file-relocator` for link integrity:
- Find all references to moved files
- Update wikilinks with new paths
- Update markdown links with new paths
- Batch updates for efficiency

**Test Requirements**:
```typescript
// file-relocator.test.ts - Write these tests FIRST
describe('File Relocator E2E', () => {
  // Test vault structure:
  // - /Projects/project1.md: contains [[Tasks/task1]] and [](../Archive/old.md)
  // - /Tasks/task1.md: contains [[project1]] with relative path
  // - /Archive/old.md: empty
  
  it('finds all wikilinks [[task1]] pointing to moved file')
  it('updates [[Tasks/task1]] to [[Archive/2024/task1]] after move')
  it('preserves link text in [my task](Tasks/task1.md) -> [my task](Archive/2024/task1.md)')
  it('updates relative paths: [[task1]] -> [[../Archive/2024/task1]]')
  it('handles link anchors: [[task1#heading]] -> [[Archive/2024/task1#heading]]')
  it('processes 50 files with 200 links in < 2 seconds')
  it('does not update links in code blocks or comments')
})
```

**Acceptance Criteria**:
- [ ] All test cases pass with real files
- [ ] Updates all link types correctly
- [ ] Preserves link text and anchors
- [ ] Handles relative path updates
- [ ] Performance acceptable for bulk operations

---

#### Issue #11: Create Document Previews Package
**Labels**: `package`, `document-previews`, `p2`
**Description**:
Create `@mmt/document-previews`:
- Extract first ~100 chars for text preview
- Lazy load previews on demand
- Cache previews for performance
- Future: visual thumbnails

**Acceptance Criteria**:
- [ ] Text previews load on demand
- [ ] Previews cached in memory
- [ ] Clean API for table-view integration
- [ ] Handles various content types

---

### Milestone 4: UI & Table View

#### Issue #12: Implement Table View Component
**Labels**: `package`, `table-view`, `p0`
**Description**:
Create `@mmt/table-view` with TanStack Table:
- Display documents in configurable columns
- Column management (order, resize, hide/show)
- Row selection with checkboxes
- Sorting by any column
- Limit display to 500 rows

**Test Requirements**:
```typescript
// table-view.test.tsx - Write these tests FIRST
describe('Table View Component', () => {
  it('renders 500 documents without performance issues')
  it('shows message when results exceed 500: "Showing first 500 of 1234 results"')
  it('sorts by filename when header clicked')
  it('sorts by date descending on second click')
  it('hides column when right-click -> hide')
  it('selects all visible rows with header checkbox')
  it('selects range with shift-click')
  it('emits operation event with selected documents')
  it('preserves column widths after resize')
  it('loads preview text only when preview column visible')
})
```

**Acceptance Criteria**:
- [ ] All component tests pass
- [ ] Renders document table with TanStack Table
- [ ] All column interactions work smoothly
- [ ] Multi-select with Shift/Cmd works
- [ ] Performance stays smooth with 500 rows
- [ ] Events properly typed and emitted

---

#### Issue #13: Build View Persistence Package
**Labels**: `package`, `view-persistence`, `p1`
**Description**:
Create `@mmt/view-persistence`:
- Save DocSetView to YAML files
- Load saved views by name
- Auto-save/load last active view
- Preserve all view settings

**Acceptance Criteria**:
- [ ] Views persist between sessions
- [ ] YAML format is human-readable
- [ ] Column settings preserved
- [ ] Query and filters preserved

---

#### Issue #14: Create Main Application UI
**Labels**: `app`, `ui`, `p0`
**Description**:
Build the main Electron app UI:
- Search bar with query syntax help
- Integrate table-view component
- Operation buttons (move, update)
- View management dropdown
- Status indicators

**Acceptance Criteria**:
- [ ] Clean, native macOS feel
- [ ] All components integrated
- [ ] Keyboard shortcuts defined
- [ ] Dark mode support

---

#### Issue #15: Implement State Management
**Labels**: `app`, `state`, `p0`
**Description**:
Set up Zustand store:
- Current DocSet and query
- Selected documents
- Active view configuration
- Operation queue
- UI state (loading, errors)

**Acceptance Criteria**:
- [ ] State updates trigger UI updates
- [ ] Actions are type-safe
- [ ] Performance with large DocSets
- [ ] Integrates with IPC layer

---

### Milestone 5: Integration & Polish

#### Issue #16: Wire Up IPC with electron-trpc
**Labels**: `app`, `integration`, `p0`
**Description**:
Implement type-safe IPC using electron-trpc:
- Define tRPC router with all operations
- Use existing Zod schemas
- Handle errors appropriately
- Set up context with all services

**Test Requirements**:
```typescript
// ipc-integration.test.ts - Write these tests FIRST
describe('IPC Integration E2E', () => {
  it('executes query from renderer and returns DocSet')
  it('validates input with Zod schema - rejects invalid query')
  it('propagates file not found error from main to renderer')
  it('executes file move operation via IPC')
  it('streams progress updates for long operations')
  it('handles concurrent IPC calls without blocking')
  it('measures round-trip time < 50ms for simple query')
})
```

**Acceptance Criteria**:
- [ ] All integration tests pass
- [ ] IPC calls are fully type-safe
- [ ] Errors include stack traces in dev mode
- [ ] No manual channel management needed
- [ ] Performance meets targets

---

#### Issue #17: Create Reports Package
**Labels**: `package`, `reports`, `p1`
**Description**:
Create `@mmt/reports` for data export:
- Export DocSet to CSV
- Include only visible columns
- Handle special characters per RFC 4180
- Future: other export formats

**Acceptance Criteria**:
- [ ] Valid CSV generation
- [ ] Respects column visibility/order
- [ ] Handles large DocSets
- [ ] Clean API for UI integration

---

#### Issue #18: End-to-End Testing
**Labels**: `testing`, `integration`, `p0`
**Description**:
Create Playwright E2E tests:
- Search and filter documents
- Perform bulk move operation
- Update properties in bulk
- Save and load views
- Export to CSV

**Test Requirements**:
```typescript
// e2e/app.spec.ts - Critical user journeys
describe('MMT E2E Tests', () => {
  it('user searches "project alpha" and sees filtered results')
  it('user selects 10 files and moves to /Archive/2024')
  it('user adds "status:archived" property to selected files')
  it('user saves view as "Archived Projects" and reloads it')
  it('user exports current view to CSV and verifies file')
  it('user clicks column to sort by modified date')
  it('app shows error when moving to existing file')
  it('app restores from snapshot when operation fails')
})
```

**Acceptance Criteria**:
- [ ] All E2E tests pass consistently
- [ ] Tests use real vault with 100+ files
- [ ] No mocks - actual file operations
- [ ] Tests complete in < 60 seconds
- [ ] Screenshots captured on failure

---

#### Issue #19: Performance Optimization
**Labels**: `performance`, `p1`
**Description**:
Optimize for 5000+ file vaults:
- Profile indexing performance
- Optimize table rendering
- Implement lazy loading where needed
- Memory usage optimization

**Acceptance Criteria**:
- [ ] Initial index < 5 seconds for 5000 files
- [ ] Smooth table scrolling
- [ ] Memory usage reasonable
- [ ] File operations < 100ms per file

---

### Milestone 6: QM Enhancement (Optional)

#### Issue #20: Create QM Provider Package
**Labels**: `package`, `qm-provider`, `p2`
**Description**:
Create `@mmt/qm-provider` for vector search:
- Check QM service availability
- Execute similarity searches
- Combine results with local index
- Show UI indicators when available

**Acceptance Criteria**:
- [ ] Detects QM availability
- [ ] Executes similarity searches
- [ ] Graceful when unavailable
- [ ] Results merge properly

---

#### Issue #21: Add Similarity Features
**Labels**: `feature`, `enhancement`, `p2`
**Description**:
Add QM-powered features to UI:
- "Find similar" context menu
- Similarity scores in results
- AI-powered suggestions
- Semantic search option

**Acceptance Criteria**:
- [ ] Features only show when QM available
- [ ] Good UX when QM offline
- [ ] Performance acceptable
- [ ] Results are helpful

---

## Test-Driven Development Approach

### Why TDD for MMT

1. **Prevents implementation drift** - Tests define the spec, implementation follows
2. **Catches integration issues early** - Real file operations reveal problems immediately  
3. **Documents behavior** - Tests show exactly how components should work
4. **Enables confident refactoring** - Change implementation, tests verify behavior unchanged
5. **Forces good design** - Hard-to-test code usually has poor architecture

### TDD Workflow

1. **Write failing tests FIRST** - Define expected behavior
2. **Run tests** - Verify they fail (red)
3. **Write minimal code** - Just enough to pass tests (green)
4. **Refactor** - Improve code while tests stay green
5. **Repeat** - Next test case

### Testing Principles

- **No mocks** - Test with real files, real operations
- **Integration over unit** - Test behavior, not implementation
- **E2E for critical paths** - Verify the full user journey works
- **Performance tests** - Include performance criteria in tests
- **Test data** - Use a consistent test vault structure

## Development Workflow

1. **Pick issue** from current milestone
2. **Create branch**: `feature/issue-XX-description`
3. **Write ALL tests first** - They should fail
4. **Implement solution** - Make tests pass
5. **Verify with real data** - No mocks
6. **Create PR** - Include test output
7. **Merge** when all tests green

## Issue Labels

### Priority
- `p0` - MVP blocker
- `p1` - Important for MVP
- `p2` - Nice to have
- `p3` - Future enhancement

### Type
- `package` - New package development
- `feature` - New user feature
- `bug` - Something broken
- `infrastructure` - Build/test/tooling

### Status
- `ready` - Ready to start
- `in-progress` - Being worked on
- `blocked` - Waiting on dependency
- `review` - In code review

## Success Metrics

- **Performance**: Index 5000 files < 5 seconds
- **Reliability**: Zero data loss operations
- **Quality**: Integration tests for all features
- **Simplicity**: No external services for MVP