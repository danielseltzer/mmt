# MMT Project Handoff - July 22, 2025

## Current Status

### ✅ Recently Completed
- **Removed Electron** (#133) - Now a pure web app with API server
- **Unified Execution Engine** (#130) - API is the single execution engine
- **Integration Test Infrastructure** - Shared API server for all integration tests
- **UXR Research** (#125) - Documented requirements for all GUI Alpha features
- **Filter System** - Fully implemented with natural language date/size filters

### 🏗️ Architecture State
- **Web-based GUI** running on Vite dev server
- **API Server** handles all operations and indexing
- **CLI** communicates with API server
- **Monorepo** with 13 packages, all properly connected

## Next Priorities

### 1. 🔧 API Refactoring (#126) - **START HERE**
**What**: Refactor API to use OperationPipelineSchema for mutation operations
**Why**: Required foundation for GUI panels
**Scope**: Support move, rename, updateFrontmatter, delete operations only
**Future**: Analysis operations (analyze, transform, aggregate) tracked separately
**Location**: `apps/api-server/src/routes/pipelines.ts`
**Key Changes**:
- Update endpoint to accept full pipeline objects
- Remove old operation-specific endpoints
- Ensure proper validation with Zod schemas
- Analysis operations return clear "not yet implemented" errors

### 2. 🎨 SELECT/TRANSFORM/OUTPUT Panels (#127)
**What**: Implement three collapsible panels for visual pipeline building
**Why**: Core GUI functionality for document operations
**Dependencies**: Requires #126 completion
**Components**:
- SELECT panel (reuse existing FilterBar)
- TRANSFORM panel (new OperationBuilder component)
- OUTPUT panel (new OutputConfig component)

### 3. 📊 Execution Feedback (#128)
**What**: Real-time progress and results display
**Why**: Users need feedback during bulk operations
**Features**:
- Progress indicators (X of Y files)
- Success/error summaries
- Operation history
- WebSocket or SSE for real-time updates

### 4. 🔍 Document Preview (#12)
**What**: Right-click context menu with Preview/Open options
**Requirements** (from UXR-002):
- Preview: Modal dialog with rendered markdown
- Open: Launch in Obsidian via `obsidian://open?vault=X&file=Y`

### 5. 💾 View Persistence (#14)
**What**: Auto-save/restore filter and column state
**MVP**: localStorage with auto-save on navigation
**Future**: Named views like "Draft Posts", "Recent Changes"

### 6. 📤 Export UI (#18)
**What**: Export filtered documents in multiple formats
**MVP Formats**:
- CSV (visible columns)
- JSON (structured data)
- PDF (with TOC and sections)

## Quick Start Commands

```bash
# Install dependencies
pnpm install

# Start development (API + Web)
pnpm dev

# Run specific app
pnpm --filter @mmt/api-server dev
pnpm --filter @mmt/web dev
pnpm --filter @mmt/cli dev

# Run tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests with shared API
pnpm test:all        # Everything

# Check types and lint
pnpm type-check
pnpm lint
```

## Test Infrastructure Notes
- Integration tests use a shared API server on port 3001
- File watching enabled for test server (50ms debounce)
- Some tests still failing (#141) but don't block feature work
- Table-view tests are skipped (rapidly evolving component)

## Key Decisions Made
- NO MOCKS in tests - use real file operations
- Integration-first testing strategy
- Config-driven (no defaults, explicit --config required)
- Zod schemas define all contracts between packages
- API server is the single source of truth for operations

## File Locations
- API routes: `apps/api-server/src/routes/`
- Web components: `apps/web/src/components/`
- Shared schemas: `packages/entities/src/`
- Operations: `packages/operations/src/`

## Current Pain Points
- Some integration tests failing due to timing/formatting issues (#141)
- Need to remove redundant operation schemas (#135)
- Hard-coded URLs still exist in some places (#132)

## Resources
- Technical Architecture: `/docs/planning/technical-architecture.md`
- Testing Strategy: `/docs/building/testing-strategy.md`
- UXR Findings: `/docs/decisions/UXR-001-filter-system.md`, `UXR-002-gui-features.md`
- Package boundaries: `/docs/planning/package-boundaries.md`

---
*Ready to implement the GUI Alpha features with clear user requirements and a solid foundation!*