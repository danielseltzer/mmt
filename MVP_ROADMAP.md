# MMT MVP Roadmap

## MVP Definition
A desktop application that can:
1. ✅ Index markdown files from a vault
2. ✅ Display files in a searchable table
3. ✅ Filter files by various criteria
4. ✅ Perform bulk operations (rename, move, delete, update frontmatter)
5. 🔄 Execute operations with proper preview and feedback
6. ⏳ Export/save operation results

## Current Status
- ✅ Core infrastructure complete (indexing, API, web UI)
- ✅ Basic pipeline builder UI (SELECT/TRANSFORM/OUTPUT panels)
- ✅ Preview modal showing operation details
- 🔴 Preview logic in wrong layer (client instead of API)
- 🔴 No execution feedback/progress
- 🔴 Integration tests failing

## Priority 0 (MVP Blockers)
Must complete before MVP release:

### 1. #150 - Move preview functionality from client to API [NEW]
- **Why**: Business logic in wrong layer, not testable
- **Work**: Move operation descriptions and preview logic to API
- **Estimate**: 1-2 days

### 2. #128 - Add operation execution feedback and progress in GUI
- **Why**: Users need to see what's happening during execution
- **Work**: Progress indicators, real-time updates, error handling
- **Estimate**: 2-3 days

### 3. #19 - End-to-End Testing
- **Why**: Need confidence that full workflow works
- **Work**: Create E2E tests for complete pipeline execution
- **Estimate**: 2-3 days

## Priority 1 (Important for MVP)
Should complete for good MVP experience:

### 4. #18 - Create Reports Package
- **Why**: Users need to export/save results
- **Work**: Implement CSV/JSON export functionality
- **Estimate**: 2-3 days

### 5. #141 - Fix integration test failures
- **Why**: Tests currently broken (port config issues)
- **Work**: Fix test configuration and ensure all pass
- **Estimate**: 1 day

### 6. #14 - Build View Persistence Package
- **Why**: Users want to save/load filter configurations
- **Work**: Save and restore pipeline configurations
- **Estimate**: 2-3 days

## Priority 2 (Nice to Have)
Can ship MVP without these:

- #143 - Update CLAUDE.md documentation
- #138 - Fix table-view tests (UI rapidly changing)
- #122 - Update table-view tests
- #12 - Document Previews Package
- #147 - Stop/status commands (already implemented)
- #132 - Remove hard-coded URLs (already fixed)

## Recommended Development Order

### Phase 1: Fix Core Issues (Week 1)
1. **#150** - Move preview to API (2 days)
2. **#141** - Fix integration tests (1 day)
3. **#128** - Execution feedback (3 days)

### Phase 2: Complete Features (Week 2)
4. **#18** - Reports/Export package (3 days)
5. **#19** - E2E tests (2 days)

### Phase 3: Polish (Week 3)
6. **#14** - View persistence (2 days)
7. Documentation updates
8. Bug fixes from testing

## MVP Timeline
- **Estimated**: 3 weeks
- **Core Features**: 1-2 weeks
- **Testing & Polish**: 1 week

## Post-MVP Priorities
- #22 - Similarity features (vector search)
- #21 - QM Provider integration
- #53 - Claude prompt generation
- Advanced scripting functionality

## Success Criteria
MVP is ready when:
- [ ] User can filter and select documents
- [ ] User can preview operations with detailed descriptions
- [ ] User can execute operations with progress feedback
- [ ] User can export results
- [ ] All P0 tests passing
- [ ] Basic documentation complete