# MMT Project Handoff

## Current State (2025-08-13)

### ✅ Recently Completed Features

#### Multi-Vault Support (V3 - COMPLETE)
- **Issue #156**: Multi-vault configuration schema (PR #188 merged)
- **Issue #186**: Vault context architecture (PR #192 merged)
- **Issue #190**: Vault initialization with VaultRegistry (PR #196 merged)
- **Issue #191**: Vault selector UI component (PR #200 merged)
  - Dropdown selector in navigation bar
  - Vault isolation working correctly
  - Path display shows relative paths
  - Table sorting fixed (bidirectional)
  - Checkbox selection fixed (unique row IDs)

### 🚀 Working Features

1. **Multi-Vault Management**
   - Switch between multiple vaults via UI dropdown
   - Each vault maintains separate index
   - Vault state persisted in localStorage
   - API routes are vault-aware (`/api/vaults/:vaultId/...`)

2. **Document Management**
   - View documents with relative path display (e.g., "/" for root)
   - Filter by name, content, folders, tags, metadata, date, size
   - Sort by name, path, modified date, size (click to toggle asc/desc)
   - Export to CSV/JSON
   - Individual checkbox selection works correctly

3. **File Operations** 
   - Rename files (updates links automatically)
   - Move files (updates links automatically)
   - Delete files
   - All operations maintain referential integrity

4. **Search & Query**
   - Full-text search across documents
   - Natural language date filters (e.g., "last 30 days")
   - Complex filter combinations with AND/OR logic
   - Server-side filtering for performance

### 📁 Project Structure

```
mmt/
├── apps/
│   ├── api-server/     # Express API server
│   ├── cli/            # CLI entry point
│   └── web/            # React web UI (with VaultSelector)
├── packages/
│   ├── config/         # Configuration management
│   ├── document-operations/  # File operations
│   ├── entities/       # Shared types & Zod schemas
│   ├── file-relocator/ # Link updating logic
│   ├── filesystem-access/  # File system abstraction
│   ├── indexer/        # Document indexing (with folderPath)
│   ├── query-parser/   # Query language parser
│   ├── scripting/      # Operation pipelines
│   ├── table-view/     # React table (with sorting fixes)
│   └── vault/          # Vault management & registry
├── config/
│   └── multi-vault.yaml  # Example multi-vault configuration
└── docs/               # Extensive documentation
```

### 🔧 Configuration

The app requires a YAML configuration file. Example multi-vault setup:

```yaml
# config/multi-vault.yaml
vaults:
  - name: 'Personal'
    path: /Users/yourname/Notes/Personal
    fileWatching:
      enabled: true
      debounceMs: 500
      ignorePatterns:
        - '**/.git/**'
        - '**/.obsidian/**'
  
  - name: 'Work'
    path: /Users/yourname/Notes/Work
    fileWatching:
      enabled: true
      debounceMs: 500

  - name: 'Projects'
    path: /Users/yourname/Notes/Projects
    fileWatching:
      enabled: false

apiPort: 3001
webPort: 5173
```

### 🚀 Running the Application

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start with configuration
./bin/mmt start --config config/multi-vault.yaml

# Or run in development mode
pnpm dev -- --config config/multi-vault.yaml
```

Access points:
- Web UI: http://localhost:5173
- API: http://localhost:3001
- Vault selector: Top navigation bar dropdown

### 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @mmt/vault test
pnpm --filter @mmt/indexer test

# Key test files for recent features
pnpm --filter @mmt/vault test vault-isolation.test.ts
pnpm --filter @mmt/indexer test vault-relative-paths.test.ts
```

### 📝 API Endpoints

#### Vault Management
- `GET /api/vaults` - List all configured vaults
- `GET /api/vaults/:vaultId/status` - Get vault status

#### Document Operations (Vault-Aware)
- `GET /api/vaults/:vaultId/documents` - List documents
- `GET /api/vaults/:vaultId/documents/by-path/*` - Get document by path
- `POST /api/vaults/:vaultId/operations/rename` - Rename document
- `POST /api/vaults/:vaultId/operations/move` - Move document
- `POST /api/vaults/:vaultId/operations/delete` - Delete document
- `POST /api/vaults/:vaultId/export` - Export documents

### 🐛 Known Issues & Limitations

1. **YAML Parsing Errors**: Some markdown files with invalid frontmatter cause parsing errors
   - Non-breaking, just logged to console
   - Common in files with template variables like `{{DATE}}`

2. **Performance**: Large vaults (5000+ files) take 1-2 seconds to index initially
   - Subsequent loads use cache for faster startup

3. **No Hot Reload**: File changes update index but don't refresh UI automatically
   - Manual refresh required to see changes

4. **Limited Export**: Export only includes metadata, not full content

5. **No Similarity Search**: Infrastructure exists but not integrated (#155)

### 🎯 Next Development Areas

#### Immediate Priorities
1. **Auto-refresh UI** when file changes detected
2. **Fix YAML parsing** - handle template variables gracefully
3. **Performance optimization** for large vaults
4. **Search improvements** - highlight matches, relevance ranking

#### V3 Remaining Work
- Issue #158: Per-tab vault state (frontend work)
- Issue #157: Tab bar component for vault switching
- Issue #162: Vault-specific settings

#### Future Features
1. **Similarity search** using embeddings (#155)
2. **Saved views** - persist filter/sort configurations
3. **Bulk operations** - apply operations to multiple files
4. **Content preview** in table or sidebar
5. **Plugin system** for custom operations

### 💡 Development Tips

1. **No Mocks Policy**: Always test with real files in temp directories
2. **Schema-First**: All data contracts defined in `@mmt/entities`
3. **TDD Approach**: Write tests first, especially for bug fixes
4. **Explicit Config**: No defaults, always require --config flag
5. **Clean Commits**: Use conventional commits (feat:, fix:, docs:, etc.)

### 🔍 Debugging

Enable debug logging:
```bash
DEBUG=mmt:* ./bin/mmt start --config config/multi-vault.yaml
```

Check vault status:
```bash
curl http://localhost:3001/api/vaults | jq
```

Test vault-specific documents:
```bash
# List documents from a specific vault
curl "http://localhost:3001/api/vaults/Personal/documents?limit=5" | jq

# Check fullPath is included (for unique row IDs)
curl "http://localhost:3001/api/vaults/Personal/documents?limit=1" | jq '.documents[0].fullPath'
```

### 📚 Key Documentation

- `/docs/planning/PRD-v3.md` - V3 product requirements
- `/docs/adr/006-vault-as-container-architecture.md` - Vault architecture decisions
- `/docs/building/testing-strategy.md` - Testing approach (NO MOCKS!)
- `/docs/building/principles.md` - Development principles
- `/CLAUDE.md` - AI assistant instructions
- `/ROADMAP.md` - Project roadmap

### 🔄 Recent Changes (2025-08-13 Session)

1. **Vault Isolation Fix**
   - Changed from `context.indexer` to `req.vault.indexer` in documents route
   - Each vault now returns only its own documents

2. **Path Display Fix**
   - Added `folderPath` property to PageMetadata
   - Files at root show "/" instead of full path
   - Subdirectory files show relative paths like "/folder"

3. **Table Sorting Fix**
   - Added synchronization between external and internal sort state
   - Bidirectional sorting works on all columns
   - Disabled sorting on checkbox column

4. **Checkbox Selection Fix**
   - Added `fullPath` field to API response
   - Changed table row ID from `path` to `fullPath`
   - Each document now has unique identifier

### 📞 Contact & Support

- Repository: https://github.com/danielseltzer/mmt
- Issues: https://github.com/danielseltzer/mmt/issues
- Latest merged PR: #200 (Multi-vault support with fixes)

## Quick Start for Next Session

1. **Pull latest changes**: 
   ```bash
   git pull origin main
   ```

2. **Install & build**:
   ```bash
   pnpm install
   pnpm build
   ```

3. **Start application**:
   ```bash
   ./bin/mmt start --config config/multi-vault.yaml
   ```

4. **Open browser**: http://localhost:5173

5. **Test vault switching**: Use the dropdown in the top navigation bar

The multi-vault feature is fully functional. All major bugs have been fixed. The application is ready for daily use with multiple vaults.