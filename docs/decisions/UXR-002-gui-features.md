# UXR-002: GUI Feature Requirements

**Status**: Accepted  
**Date**: 2025-07-22  
**Context**: User research to define requirements for remaining GUI Alpha features

## Document Previews (#12)

### Decision
- **NOT** a tooltip on hover (content too large)
- Implement as right-click context menu with two options:
  - **Preview**: Opens modal dialog with rendered markdown content
  - **Open**: Launches document in Obsidian using URL scheme

### Implementation
```
obsidian://open?vault=MyVault&file=MyNote
```

## View Persistence (#14)

### MVP
- **Auto-save** current filter/column state when user navigates away
- **Auto-restore** when returning to the app
- **Reset button** to clear all filters and return to defaults

### Future Enhancement
- Named views (e.g., "Draft Posts", "Recent Changes")
- Manual save with custom names
- View switcher to load saved views

## Reports/Export UI (#18)

### MVP
Three export formats:
1. **CSV** - Document list with visible columns
2. **JSON** - Document list with visible columns
3. **PDF** - Concatenated documents with:
   - Table of contents up front
   - Each document as a new section
   - Section headers from document titles

### Future Enhancement
- LLM integration for analysis and summarization
- RAG-type Q&A embedded in markdown reports
- Custom report templates

## Summary

The current GUI Alpha milestone features provide comprehensive MVP functionality:
- SELECT panel (filters) - implemented
- TRANSFORM panel (operations) - issue #127
- OUTPUT panel (export) - issue #127
- Execution feedback - issue #128
- Document preview/open - issue #12
- View persistence - issue #14
- Export functionality - issue #18

No additional features identified as blockers for MVP.