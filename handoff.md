# MMT Handoff Document

## Current Status (2025-08-07)

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

### 📍 Phase 1: Multi-Vault Foundation (Weeks 1-2) - START HERE
**Issues #156-160 in Milestone 7**

Priority order:
1. **#156**: Update configuration schema for multiple vaults
2. **#159**: Update API endpoints to accept vault identifier  
3. **#158**: Create per-tab state management
4. **#157**: Implement tab bar component
5. **#160**: Create vault selector component

**First Steps**:
```bash
# Start with config schema update
git checkout -b feat/156-multi-vault-config
# Update packages/config/src/schema.ts to support vaults array
# See PRD-v3.md for exact schema specification
```

### Upcoming Phases
- **Phase 2**: Workflow System (#161-165)
- **Phase 3**: Selection & Exclusion (#166-170)
- **Phase 4**: IDE Features (#171-175)
- **Phase 5**: Similarity Search UI (#176-180)
- **Phase 6**: V3 Polish (#181-185)

## Critical Implementation Notes

### Multi-Vault Configuration Schema
```yaml
# New V3 format
vaults:
  - name: "Personal"
    path: "/absolute/path/to/personal"
    indexPath: "/absolute/path/to/personal-index"
  - name: "Work"
    path: "/absolute/path/to/work"
    indexPath: "/absolute/path/to/work-index"
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

### What Needs V3 Updates
- ❌ No multi-vault support (hardcoded single vault)
- ❌ No tab interface
- ❌ No workflow history
- ❌ No manual selection/exclusion
- ❌ No similarity search UI

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

1. **Start with Issue #156** - Update configuration schema
2. **Then #159** - API vault support (backend parallel work)
3. **Then #158** - State management refactor (critical path)
4. **Visual comes last** - Tab bar UI after state works

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

---

*This handoff includes complete context for V3 implementation. All planning is done - execute Phase 1 starting with issue #156.*