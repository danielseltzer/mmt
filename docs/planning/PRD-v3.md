# Product Requirements Document - MMT V3

## Executive Summary

MMT V3 transforms the application from a single-vault document manager into an IDE-like environment for exploring and transforming multiple document sets simultaneously. The core innovation is treating document management as a development workflow, with reproducible pipelines, version history, and powerful cross-set operations.

## Vision

Create a document management IDE where users can:
- Work with multiple document sets (vaults) simultaneously in tabs
- Build and execute reproducible transformation workflows
- Explore document relationships through similarity search
- Perform set operations across different collections
- Maintain a complete history of operations for audit and replay

## Core Concepts

### 1. Document Sets and Tabs

A **document set** is a collection of documents defined by:
- **Source vault**: The originating vault from configuration
- **Workflow**: A sequence of pipelines that filter and transform the documents
- **State**: Current view of documents after applying workflow

Each document set is displayed in a **tab**, similar to browser tabs or IDE editor tabs. Users can:
- Have multiple tabs open simultaneously (typically 1-2, up to 5)
- Switch between tabs to work with different sets
- Create new tabs from vault selection or operation results
- Name/rename tabs for clarity

### 2. Workflows and Pipelines

#### Workflow
A **workflow** is a sequence of pipelines associated with a tab. It represents the complete transformation history from raw vault to current state.

#### Pipeline
A **pipeline** is a complete unit of work containing:
- **Filters**: Conditions to select documents (by path, content, metadata, etc.)
- **Transforms**: Operations to apply (rename, move, update frontmatter, delete)
- **Output configuration**: Format for results (JSON, CSV, etc.)

#### Execution Model
1. User builds a pipeline interactively
2. Pipeline can be previewed before execution
3. Upon execution, pipeline becomes read-only history
4. New pipeline builder appears for next operation
5. Each execution is timestamped and summarized

### 3. Document Identity and Comparison

- Documents are identified by their **absolute path**
- Two documents with the same path are considered identical
- Set operations compare documents by path
- Future: content-based comparison for similarity

### 4. Manual Selection and Exclusion

Users can manually refine filtered sets through:
- **Checkboxes** on each document row
- **Select/Deselect All** operations
- **Exclude Selected** action that generates exclusion filters
- Exclusions become part of the declarative pipeline (reproducible)

## User Workflows

### Example: Organizing Woodworking Projects

1. **Open personal vault** in Tab 1
2. **Create Pipeline #1**:
   - Filter: content contains "wood" or "woodwork"
   - Review ~25 matching documents
   - Select 3 documents to exclude (old/irrelevant)
   - Click "Exclude Selected" → adds exclusion filter
   - Transform: Add frontmatter "category: woodworking"
   - Preview shows 22 documents will be modified
3. **Similarity Search**:
   - Open similarity panel
   - Search for "woodworking tools and techniques"
   - Find 8 additional related documents
   - "Open as new set" → Tab 2
4. **Set Operation**:
   - Union Tab 1 and Tab 2 → Tab 3 (30 documents)
   - Apply bulk operation to combined set

## Feature Requirements

### MVP Features

#### 1. Multi-Vault Configuration
- Single configuration file listing multiple vaults
- Each vault has name, path, and index location
- Vault picker when creating new tabs
- If single vault configured, auto-select

#### 2. Tab Management
- **Tab bar** at top of application
- **Tab contents**: Vault name + timestamp initially
- **User-renameable** tabs
- **Tab switching** maintains independent state
- **Close tabs** with confirmation if unsaved workflow

#### 3. Workflow Management
- **Pipeline builder** per tab (current UI enhanced)
- **Pipeline history** showing executed pipelines
- **Read-only display** of executed pipelines with:
  - Timestamp of execution
  - Summary of operations
  - Document count affected
  - "Save" and "Duplicate" actions
- **Workflow persistence** as YAML files

#### 4. Document Selection
- **Checkboxes** in document table
- **Selection actions**:
  - Select All / Deselect All
  - Exclude Selected (generates filter)
- **Selection state** shown in status bar
- **Bulk operations** on selected documents

#### 5. Set Operations Panel
- **Available sets**: List of open tabs
- **Operations**: Union, Intersection, Difference
- **Execute button**: Creates new tab with results
- **Operation naming**: Auto-generated with timestamp

#### 6. Similarity Search Panel
- **Text input** for search query
- **Vault selector** (from configured vaults)
- **Index status** indicator
- **Results display**:
  - Document title
  - Similarity score
  - Preview excerpt
  - Right-click actions (preview, open in Obsidian)
- **"Open as new set"** button → creates new tab

#### 7. IDE Features
- **Status bar**:
  - Current tab name and document count
  - "Showing X of Y documents" when filtered
  - Pipeline state (ready/executing/complete)
  - Memory usage indicator
- **Output panel**:
  - Operation results and statistics
  - Error messages and warnings
  - API response details
  - Collapsible/expandable

#### 8. Document Preview
- **Modal or side panel** for document content
- **Triggered by** click or hover action
- **Read-only view** with syntax highlighting
- **Quick close** with ESC or click outside

### Future Enhancements (Post-MVP)

#### Phase 1 Enhancements
- **Split view**: See 2-3 tabs side by side
- **Workspace saving**: Save all open tabs and layouts
- **Similarity as filter**: Add similarity search to filter bar
- **Static sets**: Freeze dynamic sets to static lists

#### Phase 2 Enhancements
- **Command palette** (Cmd+K): Quick access to all commands
- **Keyboard shortcuts**: Navigate and execute without mouse
- **Cross-vault operations**: Move/copy between vaults
- **Pipeline templates**: Pre-built common workflows

#### Phase 3 Enhancements
- **Visual pipeline builder**: Drag-drop flow diagram
- **Undo/redo**: Reverse operations
- **Collaboration**: Share workflows with others
- **Scheduling**: Run workflows on schedule

## Technical Requirements

### Performance Targets
- **Tab switching**: < 100ms
- **Filter application**: < 500ms for 10,000 documents
- **Pipeline execution**: < 5 seconds for 500 documents
- **Memory per tab**: < 50MB for 1,000 documents

### Scale Expectations
- **Vaults**: 5,000-10,000 documents typical
- **Working sets**: 20-500 documents typical
- **Open tabs**: 1-2 typical, 5 maximum
- **Workflow length**: 1-2 pipelines typical
- **Pipeline complexity**: 1-2 filters, 1-2 transforms typical

### Data Persistence

#### Workflow File Format
```yaml
# example-workflow.mmt-workflow
name: "Monthly Project Review"
vault: "personal-vault"
created: "2024-01-15T10:30:00Z"
pipelines:
  - id: "pipeline-1"
    executed: "2024-01-15T10:32:00Z"
    filters:
      - type: "content"
        field: "content"
        operator: "contains"
        value: "woodwork"
      - type: "exclusion"
        field: "path"
        operator: "not_in"
        value: 
          - "/archive/old-project.md"
          - "/tmp/draft.md"
    transforms:
      - type: "update-frontmatter"
        operations:
          - key: "category"
            value: "woodworking"
          - key: "reviewed"
            value: "2024-01-15"
    results:
      matched: 25
      excluded: 3
      modified: 22
```

### API Requirements

#### New Endpoints
- `GET /api/vaults` - List configured vaults
- `GET /api/vaults/:id/documents` - Get documents from specific vault
- `POST /api/sets/operation` - Perform set operation
- `GET /api/similarity/status/:vault` - Check vault index status
- `POST /api/workflows/save` - Persist workflow
- `GET /api/workflows/load` - Load workflow

#### Modified Endpoints
- Add vault parameter to all document operations
- Support exclusion filters in filter API
- Return operation statistics in pipeline execution

## User Interface Design

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│ [Personal Vault] [Work Projects*] [Search Results] + │ <- Tab Bar
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Pipeline History:                                │ │
│ │ ▼ Pipeline #1 - 10:32am - 22 docs modified      │ │
│ │   Filters: content contains "wood", exclude 3   │ │
│ │   Transforms: Added category=woodworking        │ │
│ │   [Save] [Duplicate]                            │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Current Pipeline:                                │ │
│ │ [Filter] [Transform] [Output] [Preview] [Execute]│ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Documents (showing 22 of 1,247):                 │ │
│ │ □ Select All  [Exclude Selected]                 │ │
│ │ ┌───┬──────────────┬──────────┬────────────┐   │ │
│ │ │ □ │ Title         │ Modified  │ Folder      │   │ │
│ │ ├───┼──────────────┼──────────┼────────────┤   │ │
│ │ │ ☑ │ Workbench.md  │ 2024-01-14│ /projects   │   │ │
│ │ │ □ │ Tools.md      │ 2024-01-10│ /reference  │   │ │
│ │ └───┴──────────────┴──────────┴────────────┘   │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Output Panel (collapsible):                          │
│ Pipeline executed successfully: 22 documents modified │
│ Warning: 3 documents skipped due to permissions      │
├─────────────────────────────────────────────────────┤
│ Ready | Personal Vault (22/1,247) | Mem: 45MB       │ <- Status Bar
└─────────────────────────────────────────────────────┘
```

### Visual States
- **Tab indicators**: Modified (*), Executing (spinner), Error (!)
- **Pipeline states**: Building, Preview, Executing, Complete
- **Document selection**: Checkbox, highlighted row when selected
- **Similarity search**: Loading, indexed, not-indexed, error

## Success Metrics

### MVP Success Criteria
1. Can open and work with 2+ vaults simultaneously
2. Can build and execute multi-pipeline workflows
3. Can save and reload workflows
4. Can perform set operations across tabs
5. Can use similarity search to discover related documents
6. Can manually exclude specific documents from operations

### Quality Metrics
- Zero data loss during operations
- All operations are reversible or previewable
- Workflows are 100% reproducible
- Clear error messages for all failure cases
- Sub-second response for all UI interactions

## Migration Strategy

### From V2 to V3
1. **Configuration migration**: Tool to convert single-vault to multi-vault config
2. **Backward compatibility**: V3 can open single vault in V2 mode
3. **Feature flags**: Gradual rollout of V3 features
4. **Documentation**: Complete migration guide with examples

## Risks and Mitigations

### Technical Risks
1. **Memory usage with multiple tabs**
   - Mitigation: Lazy loading, pagination, unload inactive tabs
2. **Complexity of workflow management**
   - Mitigation: Start simple, iterative enhancement
3. **Similarity search performance**
   - Mitigation: Background indexing, caching, progress indicators

### User Experience Risks
1. **Learning curve for workflows**
   - Mitigation: Templates, examples, guided tours
2. **Confusion with multiple tabs**
   - Mitigation: Clear visual indicators, tab management tools
3. **Data loss from operations**
   - Mitigation: Preview everything, confirmation dialogs, undo capability

## Appendix: Detailed Feature Specifications

### A. Filter Types
- **Content**: Text search in document body
- **Path**: Exact or pattern match on file path
- **Folder**: Documents within folder(s)
- **Frontmatter**: Key-value matches in metadata
- **Modified**: Date-based filtering with natural language
- **Size**: File size comparisons
- **Tags**: Tag-based filtering
- **Exclusion**: Explicit path exclusions
- **Similarity** (future): Vector similarity search

### B. Transform Types
- **Rename**: Pattern-based file renaming
- **Move**: Relocate to different folders
- **Delete**: Remove documents (with confirmation)
- **Update Frontmatter**: Add/modify/remove metadata
- **Extract**: Create new documents from content
- **Merge** (future): Combine multiple documents

### C. Output Formats
- **JSON**: Structured data export
- **CSV**: Tabular export
- **Markdown**: Formatted list
- **Clipboard**: Copy to system clipboard
- **Archive**: ZIP file download

### D. Set Operations Specification
- **Union (A ∪ B)**: All unique documents from both sets
- **Intersection (A ∩ B)**: Documents present in both sets
- **Difference (A - B)**: Documents in A but not in B
- **Symmetric Difference** (future): Documents in either but not both

## Document History

- **Version 1.0** - 2025-08-06 - Initial PRD for MMT V3
- **Based on**: Extensive user interview and requirements gathering session
- **Author**: MMT Development Team