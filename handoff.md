# MMT Development Handoff

## Current State (January 14, 2025)

### Recently Completed Features (PR #120 - Merged)

1. **Natural Language Date Filtering**
   - Multiple syntax options: `< 7 days`, `last 30 days`, `> 2024-01-01`, `since 2024`
   - Shorthand support: `< 7d`, `> 2w`, `< 3m`, `> 1y`
   - Operator support: `<`, `>`, `<=`, `>=` with dates
   - Fixed operator logic: `<` means recent files, `>` means older files

2. **Natural Language Size Filtering**
   - Natural language: `over 1mb`, `under 500k`, `at least 100k`
   - Operator syntax: `> 10mb`, `<= 500k`, `>= 1.5gb`
   - Multiple unit support: k/K, m/M, g/G, bytes

3. **Two-Stage Metadata Filtering**
   - Replaced "Tags" with "Metadata" in UI
   - Autocomplete search for metadata keys
   - After selecting key, shows available values
   - Visual badges for selected key:value pairs
   - Support for array values in frontmatter

4. **UI Fixes**
   - Fixed inability to type spaces in filter inputs
   - Fixed document count to show filtered/total (e.g., "234/5968 docs")
   - Added shadcn/ui Badge component

### Technical Implementation Details

- **Date Parser**: `/packages/entities/src/date-parser.ts` - Handles all date parsing logic
- **Size Parser**: `/packages/entities/src/size-parser.ts` - Handles size expressions
- **API Filtering**: `/apps/api-server/src/routes/documents.ts` - Server-side filtering
- **Metadata Filter**: `/apps/web/src/components/MetadataFilter.jsx` - Two-stage UI component
- **Filter Bar**: `/apps/web/src/components/FilterBar.jsx` - Main filter interface

### Current Architecture Status

- Monorepo with 15 packages using pnpm + Turborepo
- Electron app with React frontend
- Express API server for document operations
- Indexer successfully handles 5968 markdown files in ~1.25s
- File watching supported via `--watch` flag

### What's Working

1. **Core Functionality**
   - Document indexing and caching
   - Table view with real-time filtering
   - Multi-criteria filtering (name, content, folders, metadata, date, size)
   - Fast performance (5968 files indexed in 1.25s)

2. **UI Components**
   - Responsive table with TanStack Table
   - Multi-select dropdowns for folders
   - Filter bar with all filter types
   - Dark mode support via shadcn/ui

### Known Issues

- API server sometimes has port conflicts requiring restart
- Some shadcn/ui components need proper configuration

### Next Priority Features

1. **File Operations** (from PRD)
   - Move, rename, delete with undo support
   - Bulk operations on selected files
   - Integration with file-relocator package

2. **Export Functionality**
   - CSV export with column selection
   - JSON export for data processing
   - Already has API endpoint, needs UI

3. **Bulk Frontmatter Editing**
   - Edit metadata across multiple files
   - Add/remove/modify frontmatter fields
   - Preview changes before applying

4. **Advanced Scripting**
   - Custom JavaScript transformations
   - Batch processing capabilities
   - Integration with scripting package

### Development Commands

```bash
# Start development
pnpm dev

# Build all packages
pnpm build

# Run with config
pnpm dev -- --config test-config.yaml

# Clean build artifacts
pnpm clean

# Run tests
pnpm test
```

### Important Notes

- Follow NO MOCKS testing policy - use real files in temp directories
- All file operations must go through filesystem-access package
- Maintain performance target: 5000 files < 5 seconds
- Use Zod schemas for all data contracts
- No backward compatibility needed (single user)

### Configuration

The app requires a config file specified with `--config` flag:

```yaml
vaultPath: /path/to/markdown/vault
indexPath: .mmt-index
fileWatching: true
includePatterns:
  - "**/*.md"
excludePatterns:
  - "**/.git/**"
  - "**/node_modules/**"
```

### Recent UI Framework Integration

- Successfully integrated shadcn/ui (New York style)
- Components available: Button, Input, Card, Table, Badge, Dialog, etc.
- Dark theme support configured
- Tailwind CSS with slate color scheme

## Getting Started for Next Session

1. Pull latest changes from main branch
2. Run `pnpm install` to ensure dependencies are up to date
3. Start with `pnpm dev` using test config
4. Check GitHub Issues for next priorities
5. Reference `/docs/planning/` for detailed architecture docs