# MMT Package Boundaries

## Package Structure

```
packages/
├── entities/          # Shared Zod schemas
├── filesystem-access/ # Centralized file system operations
├── config/            # Load and validate configuration
├── query-parser/      # Parse search strings into Query objects
├── indexer/           # Local file indexing (adapted from Dataview)
├── qm-provider/       # Optional vector similarity via QM service
├── document-operations/ # Define and execute file operations with orchestration
├── file-relocator/    # Handle link integrity when moving files
├── document-previews/ # Generate text and visual previews
├── docset-builder/    # Orchestrate query execution and DocSet creation
├── view-persistence/  # Save/load DocSetView configurations
├── table-view/        # React components for document table
└── reports/           # Export and transform data (CSV, etc.)

apps/
├── electron/          # Main process
└── renderer/          # React app that composes packages
```

## Package Definitions

### 1. `@mmt/entities`
**Purpose**: Define all shared Zod schemas and TypeScript types

**Exports**:
- All Zod schemas (Document, DocSet, Query, Operation, etc.)
- TypeScript type exports via inference
- Schema validation utilities

**Dependencies**: 
- `zod`

**Boundaries**:
- NO business logic
- NO side effects
- Pure data definitions only

---

### 2. `@mmt/query-parser`
**Purpose**: Parse search string syntax into structured Query objects

**Responsibilities**:
- Parse query strings like `"markdown tools" modified:>2024-01-01 kind:ideas`
- Validate syntax
- Convert to Query schema objects
- Provide helpful parse error messages

**Exports**:
```typescript
interface QueryParser {
  parse(input: string): Result<Query, ParseError>
  validate(query: Query): boolean
}
```

**Dependencies**:
- `@mmt/entities` (for Query schema)
- `zod`

**Boundaries**:
- Does NOT execute queries
- Does NOT access filesystem or network
- Pure string parsing only

**Test Examples**:
- Parse simple text search: `"hello world"` → text condition
- Parse date queries: `modified:>2024-01-01`
- Parse property queries: `kind:ideas`
- Handle invalid syntax gracefully
- Parse complex combined queries

---

### 3. `@mmt/indexer`
**Purpose**: Local file indexing adapted from Dataview patterns

**Responsibilities**:
- Index markdown files: frontmatter, links, tags, metadata
- Execute queries against local index
- Watch for file changes and update index
- Parse wikilinks and markdown links
- No external service dependencies

**Exports**:
```typescript
interface VaultIndex {
  initialize(): Promise<void>
  query(query: Query): Promise<Document[]>
  getLinks(docPath: string): LinkReference[]
  getBacklinks(docPath: string): LinkReference[]
  onFileChange(path: string): Promise<void>
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/filesystem-access`
- `gray-matter` (frontmatter parsing)
- Dataview parsing patterns (adapted)

**Boundaries**:
- Local indexing only
- No network calls
- Returns validated Document arrays
- Handles all non-vector queries

---

### 4. `@mmt/qm-provider` (Optional Enhancement)
**Purpose**: Add vector similarity search via QM service

**Responsibilities**:
- Check QM service availability
- Translate Query objects to QM API format
- Call QM REST endpoints
- Map QM responses to Document schema
- Handle service errors with clear messages

**Exports**:
```typescript
interface QMProvider {
  execute(query: Query): Promise<Document[]>
  test(): Promise<boolean> // Test connectivity
  getLinks(documentId: string): Promise<LinkReference[]> // Phase 2
  getBacklinks(documentId: string): Promise<LinkReference[]> // Phase 2
}
```

**Dependencies**:
- `@mmt/entities`
- `node-fetch` or similar for HTTP

**Boundaries**:
- Only communicates with QM service
- No direct filesystem access
- Returns validated Document arrays
- Exits app if QM unavailable

**Test Examples**:
- Index a test vault
- Query by text, path, properties
- Update index on file changes
- Verify link extraction
- Performance with 5000+ files

---

### 5. `@mmt/filesystem-access`
**Purpose**: Centralized file system access layer

**Responsibilities**:
- Provide unified file system operations
- Handle all file I/O for other packages
- Abstract file system for future portability (cloud, mobile)
- Single IPC boundary to main process

**Exports**:
```typescript
interface FileSystemAccess {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  moveFile(from: string, to: string): Promise<void>
  deleteFile(path: string): Promise<void>
  listDirectory(path: string): Promise<FileInfo[]>
  exists(path: string): Promise<boolean>
  createDirectory(path: string): Promise<void>
  copyFile(from: string, to: string): Promise<void>
}
```

**Dependencies**:
- Node.js `fs` module (in main process)
- IPC communication (in renderer)

**Boundaries**:
- Only package with direct file system access
- All other packages use this for file operations
- NO MOCKS - test with real file operations

---

### 6. `@mmt/config`
**Purpose**: Load and validate configuration

**Responsibilities**:
- Load configuration from standard location
- Validate against VaultConfig schema
- Provide typed configuration to other packages
- Handle missing/invalid config gracefully

**Exports**:
```typescript
interface ConfigService {
  load(): Promise<VaultConfig>
  save(config: VaultConfig): Promise<void>
  getConfigPath(): string
}
```

**Dependencies**:
- `@mmt/entities` (for VaultConfig schema)
- `@mmt/filesystem-access`
- `zod`

**Boundaries**:
- Only handles configuration
- No business logic
- Returns validated schemas only

---

### 7. `@mmt/document-operations`
**Purpose**: Define and execute file operations with orchestration

**Responsibilities**:
- Create Operation objects from parameters
- Serialize operations to YAML
- Load operations from `.operations/` folder
- Execute operations on filesystem
- Track operation results

**Exports**:
```typescript
interface OperationService {
  create(type: 'move' | 'updateProperties', params: any): Operation
  save(operation: Operation, vaultPath: string): Promise<void>
  load(operationId: string, vaultPath: string): Promise<Operation>
  list(vaultPath: string): Promise<Operation[]>
}

interface OperationOrchestrator {
  execute(request: OperationExecRequest): Promise<OperationExecResult>
  createSnapshot(vaultPath: string): Promise<string> // Returns snapshot path
  restoreSnapshot(snapshotPath: string): Promise<void>
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/filesystem-access`
- `@mmt/file-relocator` (for move operations)
- `js-yaml`

**Boundaries**:
- Handles both operation definition and orchestrated execution
- Manages snapshots for undo functionality
- Coordinates with file-relocator for link integrity
- NO MOCKS - test with real file operations

**Test Examples**:
- Create move operation
- Serialize/deserialize to YAML
- Execute move on test files with link updates
- Handle file conflicts
- Update frontmatter properties
- Create and restore snapshots
- Report operation results

---

### 8. `@mmt/file-relocator`
**Purpose**: Maintain link integrity when moving files

**Responsibilities**:
- Find all references to moved files
- Update `[[wikilinks]]` and markdown links
- Handle relative and absolute link paths
- Batch updates for performance

**Exports**:
```typescript
interface FileRelocator {
  updateLinksForMove(from: string, to: string, vaultPath: string): Promise<LinkUpdateResult>
  findReferences(targetFile: string, vaultPath: string): Promise<LinkReference[]>
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/filesystem-access`

**Boundaries**:
- Only handles link integrity
- Called by document-operations during moves
- NO MOCKS - test with real files and links

---

### 9. `@mmt/document-previews`
**Purpose**: Generate text and visual previews of documents

**Responsibilities**:
- Extract first ~100 chars for text preview
- Generate visual thumbnails for documents
- Lazy load previews on demand
- Cache previews for performance

**Exports**:
```typescript
interface DocumentPreviewService {
  getTextPreview(path: string): Promise<string>
  getVisualThumbnail(path: string): Promise<string> // Base64 or URL
  preloadPreviews(paths: string[]): Promise<void>
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/filesystem-access`
- Image generation library (TBD)

**Boundaries**:
- Only generates previews
- No document modification
- Separate text and visual preview methods

---

### 10. `@mmt/docset-builder`
**Purpose**: Orchestrate query execution and DocSet assembly

**Responsibilities**:
- Accept search queries (string or Query object)
- Use query-parser if needed
- Execute query via QM provider
- Assemble results into DocSet
- Add metadata (timestamp, query, etc.)
- Exit if QM unavailable

**Exports**:
```typescript
interface DocSetBuilder {
  build(query: string | Query, options: BuildOptions): Promise<DocSet>
  setProvider(provider: QueryProvider): void
}

interface BuildOptions {
  vaultPath: string
  includeContent?: boolean
  limit?: number
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/query-parser`
- `@mmt/indexer`
- `@mmt/qm-provider` (optional)
- `@mmt/config`

**Boundaries**:
- Orchestration only
- No direct filesystem access
- No UI concerns
- NO MOCKS - test with real implementations

**Test Examples**:
- Build DocSet from string query
- Build DocSet from Query object
- Handle provider errors
- Respect build options
- Verify DocSet schema

---

### 11. `@mmt/reports`
**Purpose**: Export and transform data for external use

**Responsibilities**:
- Export DocSet to CSV format
- Transform data for different representations
- Future: PDF reports, statistics, etc.
- Handle large datasets efficiently

**Exports**:
```typescript
interface ReportService {
  exportCSV(docSet: DocSet, columns: string[]): Promise<string>
  saveCSV(docSet: DocSet, columns: string[], path: string): Promise<void>
  // Future: exportPDF, exportStats, etc.
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/filesystem-access`
- CSV generation library

**Boundaries**:
- Only handles data export/transformation
- No data modification
- No UI concerns

---

### 12. `@mmt/view-persistence`
**Purpose**: Save and load DocSetView configurations

**Responsibilities**:
- Save DocSetView to YAML files
- Load saved views
- Manage "last active" view
- List available saved views
- Validate loaded views

**Exports**:
```typescript
interface ViewPersistence {
  save(view: DocSetView, name?: string): Promise<void>
  load(id: string): Promise<DocSetView>
  loadLast(): Promise<DocSetView | null>
  list(): Promise<DocSetView[]>
  delete(id: string): Promise<void>
}
```

**Dependencies**:
- `@mmt/entities`
- `@mmt/filesystem-access`
- `js-yaml`

**Boundaries**:
- Only handles DocSetView persistence
- No query execution
- No table rendering
- NO MOCKS - test with real file operations

**Test Examples**:
- Save view to YAML
- Load view from YAML
- Handle missing files
- Validate schema on load
- Track last active view

---

### 13. `@mmt/table-view`
**Purpose**: React components for displaying and interacting with DocSets

**Responsibilities**:
- Render Document table with TanStack Table
- Column management (order, visibility, width)
- Sorting and selection
- Emit events for operations
- Display DocSet metadata

**Exports**:
```typescript
interface TableViewProps {
  docSet: DocSet
  view: DocSetView
  onViewChange: (view: DocSetView) => void
  onOperation: (type: string, documents: Document[]) => void
}

export const TableView: React.FC<TableViewProps>
```

**Dependencies**:
- `@mmt/entities`
- `@tanstack/react-table`
- `react`, `react-dom`
- `@heroicons/react`

**Boundaries**:
- Pure presentation layer
- No filesystem access
- No query execution
- Receives data via props only

**Test Examples**:
- Render table with documents
- Sort by columns
- Select multiple rows
- Reorder columns
- Hide/show columns
- Emit operation events

---

## Integration Points

### Electron Main Process (`apps/electron`)
- Initializes filesystem provider
- Manages QM service connection
- Handles file operation execution
- Provides IPC handlers

### Renderer Process (`apps/renderer`)
- Composes all UI packages
- Manages application state
- Coordinates between packages
- Handles user interactions

## Key Principles

1. **Single Responsibility**: Each package has one clear job
2. **Schema-First**: All data crosses boundaries as validated schemas
3. **No Circular Dependencies**: Clear hierarchy
4. **NO MOCKS Policy**: Test with real implementations only, no mocks or test doubles
5. **Integration Testing**: Focus on integration tests over unit tests
6. **Provider Pattern**: Config-driven provider selection with fallback
7. **Event-Driven**: UI emits events, doesn't execute directly
8. **Package-Specific Errors**: Each package defines its own error types
