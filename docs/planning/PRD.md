# Product Requirements Document: Markdown Management Toolkit

## Executive Summary

Markdown Management Toolkit (MMT) is a desktop application for power users who need to manage large collections of markdown files at scale. Unlike traditional single-file editors like Obsidian, MMT operates on sets of documents, enabling bulk operations, sophisticated filtering, and intelligent suggestions powered by vector similarity search.

## Problem Statement

Current markdown editors excel at working with individual files but lack capabilities for:
- Bulk operations across hundreds or thousands of files
- Complex filtering and organization of large document sets
- Metadata management at scale
- Intelligent suggestions for file organization based on content similarity

## Target User

Power users who:
- Maintain multiple markdown vaults with 5,000+ files
- Need to organize, categorize, and maintain large knowledge bases
- Want to perform bulk operations efficiently
- Value automation and intelligent suggestions for file management

## Core Features

### 1. Document Set Management

#### 1.1 Query/Filter System
Build document sets using a GitHub-style search syntax:
- **Text search**: Full-text search across file contents
- **File metadata filters**: 
  - Created/modified dates with operators (e.g., `modified:>2024-01-01`)
  - File size ranges
  - Path-based filters (e.g., `path:/Making/*`)
- **Frontmatter property filters**:
  - Dynamic property detection on vault load
  - Filter by property existence (`has:property`) or specific values (`property:value`)
  - Support for common property types (string, number, boolean, array)
  - Primary focus on string values, especially `key:value` patterns

#### 1.2 DocSetView Configuration
- All filter parameters stored in a Zod-validated schema
- Named views can be saved and recalled
- Last active view (even unnamed) persists between sessions
- "Clear filters" option to reset to unfiltered vault view

### 2. Tabular Document View

#### 2.1 Column Configuration
Default columns (all configurable):
- Document preview (first ~100 chars, scalable)
- Filename
- Path
- Modified date
- Metadata keys (as tags/chips)
- File size

#### 2.2 Table Interactions
- **Column management**:
  - Drag to reorder columns
  - Click-drag to resize column widths
  - Right-click menu to hide/show columns
  - Click column headers to sort (ascending/descending)
- **Row selection**:
  - Select all/none checkbox in header
  - Individual row checkboxes
  - "Select visible" option for filtered results
  - Multi-select with Shift/Cmd+click
- **Display modes**:
  - Compact mode (no preview, single line)
  - Standard mode (with preview)
  - Adjustable row density
- **Row limits**:
  - Display limited to 500 rows
  - Message shown when results exceed limit: "Showing first 500 of X results. Refine your filters to see all results."

### 3. Bulk Operations

#### 3.1 Move to Folder
- Select target folder via dialog or path input
- Preview of operation showing affected files
- Confirmation dialog with file count
- Maintains file references/links integrity via dedicated file-relocator package
- Conflict detection: Operations fail if files would be overwritten at destination
- User must resolve conflicts before operation can proceed

#### 3.2 Update Properties
- Add new frontmatter properties
- Modify existing property values
- Remove properties
- Bulk property operations with templates
- Preview changes before applying

#### 3.3 Future: LLM Processing
- Send document sets to LLM with custom prompts
- Batch processing
- Save processed results back to files

### 4. Single File Enhancement

#### 4.1 File Inspector/Editor
- View and edit individual file metadata
- Rich frontmatter property editor
- Link management interface
- Move file with intelligent suggestions

#### 4.2 AI-Powered Suggestions
Powered by the QM vector index service:
- **Folder suggestions**: Based on similar content locations
- **Property suggestions**: 
  - Recommended properties based on similar files
  - Suggested values for existing properties
- **Link suggestions**: Related files that could be linked
- **Similarity score** displayed for transparency

### 5. Integration with QM Vector Index

#### 5.1 API Integration
- RESTful API communication with local QM service
- Endpoints used:
  - `/status` - Service health check
  - `/search` - Text and vector similarity search
  - `/similar` - Find similar documents
  - Additional endpoints as needed

#### 5.2 Data Flow
- QM provides document content, metadata, and similarity scores
- MMT handles all file system operations
- Refresh capability to re-sync with QM index

## Technical Requirements

### Performance
- Handle vaults with 5,000+ files smoothly
- Responsive table with up to 500 rows displayed
- Bulk operations on 100s of files < 5 seconds
- Instant filtering and sorting

### Data Persistence
- DocSetView configurations stored locally
- User preferences and window state preserved
- Named views saved in app storage

### Safety
- Confirmation dialogs for all destructive operations
- File operation counts shown before execution
- Snapshot-based undo using hard links (`cp -al`) for fast backup/restore
  - Hard links protect against file deletion/moves
  - Optional operations log in development mode captures content changes
  - Full content recovery possible for file truncation scenarios
- Safe handling of file conflicts (operations fail if conflicts detected)
- Preview of all changes before execution

### UI/UX
- Native desktop app feel
- Keyboard shortcuts for power users
- Responsive during long operations
- Clear progress indicators for bulk operations

## MVP Scope

### Phase 1 (MVP)
1. Core filtering system with all filter types
2. Configurable table view with full interactions
3. Bulk move to folder operation
4. Bulk property update operation
5. DocSetView persistence and management
6. Basic QM integration for search
7. CSV export of filtered document sets

### Phase 2
1. Single file enhancement view
2. AI-powered suggestions (folder, properties, links)
3. Advanced QM integration for similarity
4. Additional bulk operations

### Phase 3
1. LLM processing pipeline
2. Multi-vault support
3. File watching and auto-refresh
4. Advanced visualization options

## Success Metrics

- Time to organize 100 files reduced by 80%
- Ability to filter and operate on complex document sets
- Consistent metadata across vault files
- Improved discoverability of related content

## Constraints

- macOS only (initial release)
- Single vault at a time (configured via config file with vault path and QM service URL)
- Requires QM service running locally
- Direct file system access (no cloud sync)

## Open Questions

1. Should the app support custom property types beyond standard JSON types?
2. How should the app handle very large files (>1MB)?
3. Should there be a batch preview mode for reviewing changes across many files?

## Architecture Notes (To Be Moved)

- **file-relocator package**: Handles maintaining link integrity when files are moved
  - Updates both `[[wikilinks]]` and markdown `[text](path)` links
  - Requires efficient link index for finding all references
  - May leverage QM service, Obsidian's Dataview index, or custom index
