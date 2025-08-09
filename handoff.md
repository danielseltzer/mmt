# MMT Handoff Document

## Current Status (2025-08-07 - Evening Update)

### 🚀 V3 Implementation In Progress

**COMPLETED TODAY**: 
- ✅ Issue #156: Multi-vault configuration schema (PR #188 merged)
- ✅ Issue #186: Vault context architecture implemented
  - Created `@mmt/vault` package with VaultRegistry singleton
  - Documented in ADR-006: Vault as Container Architecture
  - Branch `feat/186-vault-context-architecture` ready for PR

**READY TO START**:
- 📋 Issue #189: Update API server routes to vault-aware pattern
- 📋 Issue #190: Initialize vaults at application startup
- 📋 Issue #191: Add vault selector to web UI

### 🎯 MAJOR UPDATE: V3 Planning Complete - Ready for Implementation

A comprehensive planning session has been completed for **MMT V3**, transforming MMT from a single-vault tool into an **IDE-like multi-document-set environment**. All planning documents, GitHub milestones, and issues have been created.

### Key Documents Created
- **[/docs/planning/PRD-v3.md](docs/planning/PRD-v3.md)** - Complete V3 Product Requirements Document
- **[/ROADMAP.md](ROADMAP.md)** - Detailed 9-week implementation roadmap with 6 phases

### GitHub Structure Created
- **6 New Milestones** (Milestones 7-12) with due dates
- **30 New Issues** (#156-185) across all phases
- **5 New Labels**: `v3-core`, `v3-ui`, `v3-api`, `v3-migration`, `v3-docs`

## V3 Vision Summary

### Core Concept
MMT V3 introduces **multiple document sets in tabs**, where each tab represents:
- A vault (data source)
- A workflow (sequence of executed pipelines)
- Independent state (filters, selections, history)

### Key Innovations
1. **Tab-based Interface**: Work with multiple vaults simultaneously
2. **Workflows**: Pipelines become immutable history entries after execution
3. **Manual Selection**: Checkboxes for excluding specific documents
4. **Set Operations**: Union, intersection, difference across tabs
5. **IDE Features**: Status bar, output panel, document preview

### Terminology Established
- **Transform**: Atomic action (rename, move, etc.)
- **Pipeline**: Complete unit (filters + transforms + output)
- **Workflow**: Sequence of pipelines in a tab (saveable/reloadable)

## Implementation Phases (Start Immediately)

### 📍 Phase 1: Multi-Vault Foundation (Weeks 1-2) - IN PROGRESS
**Issues in Milestone 7**

Priority order:
1. **#156**: ✅ DONE - Update configuration schema for multiple vaults (PR #188 merged)
2. **#186**: ✅ DONE - Establish vault context as first-class domain concept
3. **#189**: 📋 READY - Update API endpoints to vault-aware pattern `/api/vaults/:vaultId`
4. **#190**: 📋 READY - Initialize vaults at application startup
5. **#191**: 📋 READY - Add vault selector component to web UI
6. **#158**: ⏳ FUTURE - Create per-tab state management
7. **#157**: ⏳ FUTURE - Implement tab bar component

## 🎯 Work Completed Today (Issue #186)

### Vault Package Created (`@mmt/vault`)
```typescript
// Vault as container for all services
interface Vault {
  id: string;
  config: VaultConfig;
  status: 'initializing' | 'ready' | 'error';
  services?: {
    indexer: VaultIndexer;
    // watcher and similarity search will be added
  };
  get indexer(): VaultIndexer; // Convenience accessor
}

// Singleton registry manages all vaults
class VaultRegistry {
  private vaults: Map<string, Vault>;
  async initializeVaults(config: Config): Promise<void>;
  getVault(id: string): Vault;
  getAllVaults(): Vault[];
}

// Global singleton instance
export const vaultRegistry = VaultRegistry.getInstance();
```

### Key Architecture Decisions (ADR-006)
- **Vault as Container**: Each vault owns its stateful services
- **URL Path Pattern**: `/api/vaults/:vaultId/documents`
- **Initialization**: Default vault sync, others async in background
- **File Watchers**: Run for ALL vaults to keep indexes current
- **Error Handling**: Fail fast for default vault, graceful for others

## 📝 Next Session Instructions

### Option 1: Create PR for Issue #186
```bash
# The work is complete on branch feat/186-vault-context-architecture
git add .
git commit -m "feat: implement vault context architecture (#186)

- Create @mmt/vault package with VaultRegistry singleton
- Implement vault as container for services
- Document architecture in ADR-006
- Ready for API integration"

gh pr create --title "feat: implement vault context architecture (#186)" \
  --body "Implements vault as first-class domain concept per ADR-006" \
  --base main
```

### Option 2: Start Issue #189 (API Routes)
```bash
git checkout -b feat/189-vault-aware-api
# Update apps/api-server/src/routes/*.ts
# See issue #189 for detailed requirements
```

### Option 3: Start Issue #190 (Vault Initialization)
```bash
git checkout -b feat/190-vault-initialization
# Update tools/control-manager/src/control-manager.ts
# See issue #190 for detailed requirements
```

### Upcoming Phases
- **Phase 2**: Workflow System (#161-165)
- **Phase 3**: Selection & Exclusion (#166-170)
- **Phase 4**: IDE Features (#171-175)
- **Phase 5**: Similarity Search UI (#176-180)
- **Phase 6**: V3 Polish (#181-185)

## Critical Implementation Notes

### Multi-Vault Configuration Schema (✅ IMPLEMENTED)
```yaml
# New V3 format - NOW LIVE IN CODEBASE
vaults:
  - name: "Personal"
    path: "/absolute/path/to/personal"
    indexPath: "/absolute/path/to/personal-index"
    fileWatching:  # Optional
      enabled: true
      debounceMs: 200
  - name: "Work"
    path: "/absolute/path/to/work"
    indexPath: "/absolute/path/to/work-index"
```

### Vault Access Pattern (✅ IMPLEMENTED)
```typescript
// The vault IS the context - it owns all services
import { vaultRegistry } from '@mmt/vault';

// Initialize all vaults at startup
await vaultRegistry.initializeVaults(config);

// Access vault and its services
const vault = vaultRegistry.getVault('Personal');
const documents = await vault.indexer.getAllDocuments();
const backlinks = vault.indexer.getBacklinks('some-doc.md');

// API routes will use this pattern
app.get('/api/vaults/:vaultId/documents', (req, res) => {
  const vault = vaultRegistry.getVault(req.params.vaultId);
  res.json(vault.indexer.getAllDocuments());
});
```

### State Management Architecture
Each tab needs independent state:
```typescript
interface TabState {
  id: string;
  vaultName: string;
  documents: Document[];
  workflow: Pipeline[]; // History of executed pipelines
  currentPipeline: Pipeline | null;
  selection: Set<string>;
}
```

### Workflow YAML Format (Phase 2)
```yaml
name: "Monthly Review"
vault: "personal-vault"
pipelines:
  - id: "p1"
    executed: "2024-01-15T10:32:00Z"
    filters: [...]
    transforms: [...]
    results: { matched: 47, modified: 47 }
```

## Technical Decisions Made

1. **Selection → Filter Pattern**: Manual selections become declarative exclusion filters
2. **Pipeline History**: Executed pipelines become read-only history entries
3. **Tab State**: Each tab has completely independent state
4. **Set Operations**: Create new tabs with results
5. **Similarity Search**: Initially separate panel, later integrated as filter type

## Current Codebase State

### What's Working
- ✅ Single vault with full pipeline functionality
- ✅ Similarity search backend (API complete)
- ✅ Document filtering and operations
- ✅ Pipeline preview mode
- ✅ Multi-vault configuration support
- ✅ Vault package with registry architecture

### What Needs Implementation (Issues Created)
- 🔄 #189: API routes with vault ID in path
- 🔄 #190: Vault initialization at startup
- 🔄 #191: Web UI vault selector
- ⏳ Tab interface (#157)
- ⏳ Per-tab state (#158)
- ⏳ Workflow history
- ⏳ Manual selection/exclusion
- ⏳ Similarity search UI

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build

# Type checking
pnpm type-check
```

## Architecture Notes for Implementation

### Frontend Structure
- **Current**: Single Zustand store for one document set
- **V3 Need**: Refactor to support multiple document sets
- **Location**: `apps/web/src/stores/document-store.ts`

### API Changes Needed
- Add `vaultId` parameter to all document endpoints
- New endpoint: `GET /api/vaults` to list configured vaults
- Update indexer to handle multiple vault indexes

### Component Updates
- **New**: TabBar component (use Radix UI tabs)
- **Update**: QueryBar to be tab-aware
- **Update**: DocumentTable to show selection checkboxes
- **New**: StatusBar component at bottom
- **New**: OutputPanel for operation results

## Testing Strategy

- Write tests for multi-vault configuration first
- Test tab state isolation
- Ensure no regressions in existing functionality
- Performance test with multiple tabs open

## Next Session Recommendations

### Priority 1: Complete Current Branch
```bash
# Create PR for completed work on Issue #186
git status  # Should be on feat/186-vault-context-architecture
git add .
git commit -m "feat: implement vault context architecture (#186)"
gh pr create
```

### Priority 2: API Routes (#189)
Most critical for multi-vault - all other work depends on this:
- Update all routes in `apps/api-server/src/routes/`
- Add vault management endpoints
- Test with multiple vaults

### Priority 3: Vault Initialization (#190)
Makes multi-vault actually work:
- Update `tools/control-manager/src/control-manager.ts`
- Import and use vaultRegistry
- Test startup with multiple vaults

### Priority 4: Web UI (#191)
User-facing changes:
- Add vault selector component
- Update document store
- Update all API calls

## Key Decisions from This Session

1. **Vault as Container** - Vault owns all stateful services (indexer, watcher, etc.)
2. **Singleton Registry** - Global VaultRegistry manages all vaults
3. **URL Path Pattern** - API uses `/api/vaults/:vaultId/...` for all endpoints
4. **Initialization Strategy** - Default vault sync, others async, all watchers run
5. **Fail Fast** - Default vault must work or app won't start
6. **Package Structure** - New `@mmt/vault` package as central domain concept

## Performance Targets
- Tab switching: < 100ms
- Filter application: < 500ms for 10k documents
- Pipeline execution: < 5s for 500 documents
- Memory per tab: < 50MB for 1000 documents

## Questions Resolved in Planning
- ✅ Tabs, not split panes (for MVP)
- ✅ Dynamic document sets (not frozen)
- ✅ Pipelines become history after execution
- ✅ Selections generate exclusion filters
- ✅ Set operations create new tabs
- ✅ Similarity search as separate panel initially

## Files Created/Modified Today

### New Package Created
- `/packages/vault/` - Complete vault package with:
  - `src/vault.ts` - Vault class implementation
  - `src/registry.ts` - VaultRegistry singleton
  - `src/types.ts` - TypeScript interfaces
  - `src/index.ts` - Package exports

### Documentation
- `/docs/adr/006-vault-as-container-architecture.md` - Architecture decision record

### GitHub Issues Created
- #189: API vault-aware routes
- #190: Vault initialization at startup  
- #191: Web UI vault selector

---

*This handoff includes complete implementation of Issue #186. The vault architecture is ready - next steps are API integration (#189) and startup initialization (#190).*