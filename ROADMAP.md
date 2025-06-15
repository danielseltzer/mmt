# MMT Development Roadmap

## Project Vision

MMT (Markdown Management Toolkit) provides both programmatic (scripting) and visual (GUI) interfaces for managing large markdown collections. Scripts enable automation and CI/CD integration, while the GUI provides interactive exploration and operation building.

## Architecture Principles

1. **Script-First Development**: Every feature must be scriptable before GUI implementation
2. **Config-Driven**: All operations require explicit configuration context
3. **Operation Pipeline**: Both scripts and GUI construct operation pipelines that execute against a vault
4. **Test with Scripts**: Use scripting API for all automated testing

## Development Phases

### Phase 1: Foundation & Core (Milestone 1)

**Goal**: Establish config management and scripting architecture. By the end of this milestone, we can run the app from command line with a config and a simple script that writes to console.

1. **Issue #5: Config Package** ⚡ CRITICAL
   - Load and validate configurations
   - Validate paths exist
   - Provide config context to all operations

2. **Issue #35: Application Director** ⚡ CRITICAL
   - Parse command-line arguments
   - Load configuration via ConfigService
   - Wire up dependencies
   - Route to appropriate handlers

3. **Issue #26: Design Scripting Architecture** 📋 PLANNING
   - Define scripting API patterns
   - Operation pipeline design
   - Result collection and reporting
   - Error handling strategies
   - Example script specifications

4. **Issue #27: Basic Scripting Package** 
   - Implement @mmt/scripting
   - ScriptRunner class
   - Basic console output
   - Script loading and execution

### Phase 2: Local Indexing System (Milestone 2)

**Goal**: Build Dataview-inspired indexing with script support

1. **Issue #7: Indexer Package** (partially exists)
   - Extract from core-operations
   - Formalize indexing API
   - Performance: <5s for 5000 files

2. **Issue #8: Link Extraction**
   - Parse markdown links
   - Build link graph
   - Support for backlinks

3. **Issue #9: DocSet Builder**
   - Query result management
   - Result set operations

4. **NEW Issue: Indexing Script API**
   - Add indexing operations to scripting
   - Query builder for scripts
   - Scriptable result filtering

### Phase 3: Document Operations (Milestone 3)

**Goal**: Implement file operations with link integrity

1. **Issue #10: Document Operations Package**
   - CRUD operations on documents
   - Bulk operations support
   - Transaction-like behavior

2. **Issue #11: File Relocator Package**
   - Move/rename with link updates
   - Bulk relocations
   - Rollback support

3. **Issue #12: Document Previews Package** (P2)
   - Generate preview snippets
   - Cached previews

4. **NEW Issue: Operations Script API**
   - Expose all operations in scripting
   - Pipeline operation chaining
   - Dry-run support

### Phase 4: UI & Table View (Milestone 4)

**Goal**: Build interactive GUI on top of script operations

1. **Issue #13: Table View Component**
   - TanStack Table implementation
   - Virtual scrolling for performance
   - Column configuration

2. **Issue #14: View Persistence Package**
   - Save/load table configurations
   - User preferences

3. **Issue #15: Main Application UI**
   - Electron app shell
   - Layout and navigation
   - Config selection

4. **Issue #16: State Management**
   - Application state with Zustand
   - Sync with main process

5. **NEW Issue: Script Builder UI**
   - Visual operation builder
   - Save/load scripts
   - Execute and view results

### Phase 5: Integration & Polish (Milestone 5)

**Goal**: Complete integration, testing, and polish

1. **Issue #17: IPC with electron-trpc**
   - Type-safe main-renderer communication
   - Operation invocation from UI

2. **Issue #18: Reports Package**
   - Operation history
   - Statistics and analytics

3. **Issue #19: End-to-End Testing**
   - Full workflow tests
   - Performance benchmarks

4. **Issue #20: Performance Optimization**
   - Profiling and optimization
   - Caching strategies

5. **Issue #23: Test Documentation** 
   - GIVEN/WHEN/THEN format
   - Example-driven docs

6. **Issue #24: Package Standards**
   - Architecture documentation
   - Contribution guidelines

7. **NEW Issue: Advanced Scripting**
   - Conditional operations
   - Error recovery
   - Parallel execution

### Phase 6: QM Enhancement (Milestone 6)

**Goal**: Add optional AI-powered similarity search

1. **Issue #21: QM Provider Package**
   - Abstract QM interface
   - Provider implementations

2. **Issue #22: Similarity Features**
   - Find similar documents
   - Semantic search
   - Clustering support

## Current Status

- ✅ Monorepo structure (Issue #1)
- ✅ Entities package (Issue #2)
- ✅ FileSystem access (Issue #4)
- ✅ Query parser (Issue #6)
- 🚧 Partial indexer implementation exists
- ⏳ Config package needed next

## Next Steps

1. **Immediate**: Implement Config Package (Issue #5)
2. **Then**: Design Scripting Architecture (new issue)
3. **Then**: Implement Basic Scripting Package (new issue)
4. **Ongoing**: Add script support as each feature is built