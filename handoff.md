# MMT Handoff Document

## Current Status (2025-07-28 - Updated)

### Recently Completed Work

1. **Vault-Level Sorting Implementation** ✅ NEW!
   - Added Sort button next to Columns button in table view
   - Sort options: File (name), Path, Modified, Size
   - Click same field to toggle between ascending/descending order
   - Visual indicators: ↑ for ascending, ↓ for descending  
   - Sorts at vault level BEFORE pagination (shows top 500 by sort criteria)
   - API properly sorts all documents before applying limit
   - Integrated with document store for automatic re-fetching

2. **Configuration System Overhaul (#132)** ✅
   - Replaced complex `/config` endpoint with Vite's built-in proxy
   - Web app uses relative URLs (`/api/*`) that proxy to API server
   - Pass API port via `MMT_API_PORT` environment variable
   - Removed config store and related complexity
   - No more hardcoded URLs or ports

3. **TRANSFORM Panel Implementation (#127)** ✅
   - Fully functional operation builder with drag-and-drop reordering
   - Operations: Rename, Move, Delete, Update Frontmatter
   - Template support with variables: `{name}`, `{date}`, `{timestamp}`, `{counter}`
   - Live preview showing template expansion
   - Compact table-like UI with minimal padding
   - Help tooltips for template variables
   - Filterable folder picker for move operations
   - Frontmatter operations support add/update/remove

4. **Control Manager Improvements (#147)** ✅
   - Implemented `mmt stop` command with PID file tracking
   - Implemented `mmt status` command
   - Added comprehensive logging to `logs/mmt-YYYY-MM-DD.log`
   - Fixed process management and cleanup
   - Better error handling for port conflicts

5. **Test Infrastructure Fixes (#141)** ✅
   - Fixed API server unit test configuration with `passWithNoTests`
   - Cleaned up logging to distinguish info from errors
   - Integration tests passing (web tests outdated but lower priority)

### Current Architecture

```
MMT Control Manager (./bin/mmt)
├── Reads config file (YAML)
├── Writes PID file for process management
├── Logs all output to logs/mmt-YYYY-MM-DD.log
├── Starts API server
│   └── Reads config directly
└── Starts Web server (Vite)
    └── Gets API port via MMT_API_PORT env var
    └── Proxies /api/* requests to API server
```

### Working Branch
`main` - All recent work has been merged

## Next High Priority Work

### 1. **OUTPUT Panel (#127)** - IMMEDIATE
The OUTPUT panel needs to be implemented to complete the pipeline builder:
- Format selection (JSON, YAML, CSV, Markdown table)
- Preview of output format
- Options specific to each format (e.g., CSV delimiter, JSON pretty print)
- File download or copy-to-clipboard functionality

### 2. **Execute Button & Pipeline Submission (#127)** - HIGH
Wire up the pipeline execution:
- Add Execute button (with preview/dry-run option)
- Convert UI state to pipeline API format
- Send to `/api/pipelines/execute` endpoint
- Show progress/spinner during execution
- Display results (success/error counts, affected files)
- Handle errors gracefully

### 3. **Update CLAUDE.md (#143)** - MEDIUM
Document the new architecture:
- Vite proxy configuration approach
- Control manager with logging
- Template system and variables
- Pipeline builder components

## Technical Context

### Key Files Changed Recently
- `/packages/table-view/src/SortConfig.tsx` - NEW! Sort dropdown component
- `/packages/table-view/src/TableView.tsx` - Added sort props and UI
- `/apps/web/src/stores/document-store.ts` - Added sortBy/sortOrder state
- `/apps/web/src/components/DocumentTable.jsx` - Wired up sorting
- `/apps/api-server/src/routes/documents.ts` - Fixed to sort BEFORE pagination
- `/tools/control-manager/src/control-manager.ts` - Logging, PID file, stop/status
- `/apps/web/vite.config.ts` - Proxy configuration (made API port optional for builds)
- `/apps/web/src/components/TransformPanel.jsx` - Full TRANSFORM implementation
- `/apps/web/src/utils/template-utils.js` - Shared template expansion function
- `/README.md` - Updated with stop/status commands and logging info

### Template System
The `expandTemplate()` function in `utils/template-utils.js` supports:
- `{name}` - Document filename without extension
- `{date}` - Current date as YYYY-MM-DD
- `{timestamp}` - ISO 8601 timestamp (e.g., 2025-07-28T15:30:45.123Z)
- `{counter}` - Sequential counter (currently shows "1" in preview)

### UI Patterns Established
- Compact table-like rows with minimal padding
- Drag handles for reordering (using @dnd-kit)
- Trash icon for deletion
- Help tooltips with ? icon
- Preview text showing template expansion
- Filterable dropdowns for selection

### How Sorting Works

1. **User Interface**: Sort button appears next to Columns button
2. **Sort Fields**: 
   - File (sorts by document name)
   - Path (sorts by full file path)
   - Modified (sorts by modification date)
   - Size (sorts by file size)
3. **Behavior**:
   - First click on a field sorts ascending
   - Click same field again to toggle to descending
   - Sorting happens at the API level before pagination
   - Returns the top 500 documents according to sort criteria
   - Empty/null values are placed at the end when sorting

## Known Issues

1. **Web Integration Tests** - Need updating to match current components
2. **Counter Variable** - Currently hardcoded to "1" in preview
3. **Vitest Version Mismatch** - Peer dependency warnings throughout
4. **Linting Errors** - Multiple eslint violations in table-view package (mostly style issues)

## Next Session Starting Point

1. Start with OUTPUT panel implementation
2. Then add Execute button and wire up pipeline submission
3. Test full pipeline flow: Select → Transform → Output → Execute

## Running MMT

```bash
# Start
./bin/mmt start --config personal-vault-config.yaml

# Check logs
tail -f logs/mmt-*.log

# Stop
./bin/mmt stop

# Status
./bin/mmt status
```

The app runs at http://localhost:5173/