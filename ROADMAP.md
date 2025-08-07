# MMT V3 Implementation Roadmap

## Overview

This roadmap outlines the implementation path from MMT V2 (single-vault, single-focus) to MMT V3 (multi-vault IDE with workflows). The implementation is divided into 6 phases over approximately 9 weeks, with clear milestones and deliverables for each phase.

## Current State (V2)
- ✅ Single vault configuration
- ✅ Single document set view
- ✅ Pipeline builder (filter, transform, output)
- ✅ Similarity search backend
- ✅ Basic document operations
- ❌ No multi-vault support
- ❌ No workflow history
- ❌ No manual selection
- ❌ No similarity UI

## Target State (V3 MVP)
- ✅ Multiple vaults in single config
- ✅ Tab-based multi-document-set interface
- ✅ Workflow history (sequence of pipelines)
- ✅ Manual document selection/exclusion
- ✅ Set operations across tabs
- ✅ Similarity search UI
- ✅ Status bar and output panel
- ✅ Document preview
- ✅ Workflow persistence (save/load)

---

## Phase 1: Foundation (Weeks 1-2)
**Goal: Enable multi-vault configuration and tab infrastructure**

### Milestone 1.1: Multi-Vault Configuration
- [ ] Update configuration schema to support multiple vaults
- [ ] Migrate existing single-vault configs
- [ ] Add vault validation and error handling
- [ ] Update API to accept vault identifier
- [ ] Create vault selector component

### Milestone 1.2: Tab Infrastructure
- [ ] Implement tab bar component
- [ ] Create tab state management (per-tab stores)
- [ ] Add tab switching and persistence
- [ ] Implement tab naming/renaming
- [ ] Add tab close confirmation

### Deliverables
- Working multi-vault configuration
- Basic tab switching between vaults
- Each tab shows its own document set

---

## Phase 2: Workflows (Weeks 3-4)
**Goal: Transform pipelines into workflow history**

### Milestone 2.1: Pipeline History
- [ ] Refactor pipeline to support execution history
- [ ] Create pipeline history data structure
- [ ] Implement pipeline → history transition
- [ ] Add read-only pipeline display
- [ ] Create history UI component

### Milestone 2.2: Workflow Persistence
- [ ] Design workflow YAML schema
- [ ] Implement workflow serialization
- [ ] Create save/load workflow functions
- [ ] Add duplicate pipeline functionality
- [ ] Build workflow management UI

### Deliverables
- Executed pipelines become history
- Can save/load complete workflows
- Pipeline duplication for reuse

---

## Phase 3: Selection & Exclusion (Week 5)
**Goal: Enable manual document selection and exclusion**

### Milestone 3.1: Selection Infrastructure
- [ ] Add checkbox column to document table
- [ ] Implement selection state management
- [ ] Create select all/none controls
- [ ] Add selection count to status
- [ ] Handle selection persistence

### Milestone 3.2: Exclusion Filters
- [ ] Create "Exclude Selected" action
- [ ] Generate exclusion filter from selection
- [ ] Update filter UI to show exclusions
- [ ] Add exclusion to filter types
- [ ] Test exclusion in pipeline execution

### Deliverables
- Checkbox-based document selection
- Exclusion filters from selection
- Selection state in workflows

---

## Phase 4: Core Features (Weeks 6-7)
**Goal: Add essential IDE features**

### Milestone 4.1: Status Bar & Output Panel
- [ ] Create status bar component
- [ ] Show tab info and document counts
- [ ] Add memory usage indicator
- [ ] Build collapsible output panel
- [ ] Implement error/warning display

### Milestone 4.2: Document Preview
- [ ] Create preview modal/panel component
- [ ] Add markdown rendering
- [ ] Implement preview triggers
- [ ] Add keyboard shortcuts (ESC to close)
- [ ] Cache preview content

### Milestone 4.3: Set Operations
- [ ] Create set operations panel
- [ ] List available tabs/sets
- [ ] Implement union operation
- [ ] Implement intersection operation
- [ ] Implement difference operation
- [ ] Add "open as new tab" for results

### Deliverables
- Professional IDE-like status indicators
- Document preview capability
- Working set operations

---

## Phase 5: Similarity Search UI (Week 8)
**Goal: Complete similarity search integration**

### Milestone 5.1: Similarity Panel
- [ ] Create similarity search panel
- [ ] Add text input for queries
- [ ] Implement vault selector
- [ ] Show index status
- [ ] Handle Ollama connection states

### Milestone 5.2: Results Integration
- [ ] Display similarity scores
- [ ] Show result excerpts
- [ ] Add right-click context menu
- [ ] Implement "open as new set"
- [ ] Add preview for results

### Deliverables
- Full similarity search UI
- Integration with tab system
- Index status management

---

## Phase 6: Polish & Testing (Week 9)
**Goal: Production readiness**

### Milestone 6.1: Testing
- [ ] Comprehensive workflow testing
- [ ] Multi-tab stress testing
- [ ] Set operation validation
- [ ] Error handling verification
- [ ] Performance benchmarking

### Milestone 6.2: Polish
- [ ] UI consistency pass
- [ ] Keyboard navigation
- [ ] Loading states optimization
- [ ] Error message improvements
- [ ] Memory leak detection

### Milestone 6.3: Documentation
- [ ] Update user documentation
- [ ] Create migration guide
- [ ] Document workflow format
- [ ] Add example workflows
- [ ] Update API documentation

### Deliverables
- Production-ready V3
- Complete documentation
- Migration tools

---

## Implementation Priority Order

### Critical Path (Must Have for V3)
1. Multi-vault configuration
2. Tab infrastructure
3. Workflow history
4. Manual selection/exclusion
5. Status bar & output panel

### High Priority (Should Have)
6. Workflow save/load
7. Set operations
8. Document preview
9. Similarity search UI

### Nice to Have (Could Have)
10. Keyboard shortcuts
11. Tab groups
12. Memory optimization
13. Advanced error recovery

---

## Success Criteria

### Phase Checkpoints
- **Phase 1**: Can open multiple vaults in tabs
- **Phase 2**: Can see and replay pipeline history
- **Phase 3**: Can exclude specific documents
- **Phase 4**: Has professional IDE features
- **Phase 5**: Similarity search is usable
- **Phase 6**: Ready for daily use

### MVP Acceptance
- [ ] User can work with 2+ vaults simultaneously
- [ ] Workflows are saved and reproducible
- [ ] Manual selection works reliably
- [ ] Set operations produce correct results
- [ ] Similarity search returns relevant results
- [ ] No data loss during operations
- [ ] Performance meets targets (< 5s for 500 docs)

---

## Risk Mitigation

### Technical Risks
1. **State management complexity**
   - Mitigation: Incremental refactoring, comprehensive testing
2. **Memory usage with multiple tabs**
   - Mitigation: Lazy loading, monitor in status bar
3. **Migration breaking changes**
   - Mitigation: Backward compatibility mode

### Schedule Risks
1. **Scope creep**
   - Mitigation: Strict MVP definition, defer enhancements
2. **Integration issues**
   - Mitigation: Early integration testing
3. **Performance problems**
   - Mitigation: Benchmark at each phase

---

## Future Enhancements (Post-V3)

### V3.1 (Month 3)
- Split view for side-by-side comparison
- Workspace saving (multiple tabs + layouts)
- Command palette (Cmd+K)
- Keyboard shortcut system

### V3.2 (Month 4)
- Similarity search as filter type
- Static/frozen document sets
- Cross-vault operations
- Pipeline templates library

### V3.3 (Month 5)
- Visual pipeline builder
- Undo/redo system
- Collaboration features
- Scheduled workflow execution

---

## GitHub Issues Structure

### Milestones
1. **Milestone 7: Multi-Vault Foundation** (Phase 1)
2. **Milestone 8: Workflow System** (Phase 2)
3. **Milestone 9: Selection & Exclusion** (Phase 3)
4. **Milestone 10: IDE Features** (Phase 4)
5. **Milestone 11: Similarity Search UI** (Phase 5)
6. **Milestone 12: V3 Polish** (Phase 6)

### Issue Labels
- `v3-core`: Core V3 functionality
- `v3-ui`: User interface changes
- `v3-api`: API modifications
- `v3-migration`: Migration related
- `v3-docs`: Documentation updates

### Issue Template
```markdown
## Feature: [Feature Name]
**Phase**: [1-6]
**Priority**: [Critical/High/Medium]
**Milestone**: [Milestone Name]

### Description
[What needs to be built]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Dependencies
- Depends on: #[issue]
- Blocks: #[issue]

### Technical Notes
[Implementation considerations]
```

---

## Communication Plan

### Weekly Updates
- Progress against current phase
- Blockers and solutions
- Next week's focus

### Phase Completion
- Demo of new functionality
- Performance metrics
- Decision on next phase

### V3 Launch
- Migration guide published
- Feature documentation complete
- Performance benchmarks shared

---

*Last Updated: 2025-08-06*
*Version: 1.0*
*Status: Ready for Implementation*