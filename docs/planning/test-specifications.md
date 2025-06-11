# MMT Test Specifications

## Testing Philosophy

**NO MOCKS, NO DOUBLES, NO FAKES**

All tests use real implementations running against real data. This ensures our tests actually verify the system works as users will experience it.

## Testing Strategy

### Test Types

1. **Integration Tests** (Primary Focus)
   - Test complete features across multiple packages
   - Use real file systems, real data, real services
   - Verify package contracts and boundaries
   
2. **E2E Tests** (Critical Paths)
   - Test complete user workflows through the GUI
   - Use Playwright for Electron app testing
   - Cover the most important user journeys

3. **Unit Tests** (Minimal)
   - Only for complex algorithms (e.g., query parsing logic)
   - Still no mocks - use real data structures

## Test Environment Setup

### Prerequisites

1. **Local Indexer**
   - Tests use local file indexing (no external services required)
   - Index is built from test vault during test setup
   - No mocks - real file operations

2. **QM Service (Optional)**
   - Only needed for testing vector similarity features
   - Use qm-control from https://github.com/danielseltzer/mq6t if testing QM integration
   - Most tests work without QM

2. **Test Vault**
   - Tests run against a copy of real markdown vault data
   - Test config specifies vault location
   - Each test run uses a fresh copy to ensure consistency

3. **File System**
   - All tests use real file system operations
   - Test data is copied to temp directories
   - Cleanup happens after each test

## Integration Test Assertions

### Query System
- Parse GitHub-style query syntax: `"text search"`, `path:/Projects/*`, `modified:>2024-01-01`, `kind:ideas`
- Execute queries against real markdown files with frontmatter
- Return only documents that match ALL query conditions (AND logic)
- Return clear error messages for invalid syntax (e.g., "Unknown operator '~' in 'modified:~2024'")
- Return maximum 500 results with message: "Showing first 500 of X results. Refine your filters to see all results."

### Document Operations
- Move files to new locations and update all `[[wikilinks]]` and `[markdown](links)` pointing to them
- Add new frontmatter properties without disturbing existing content
- Remove specified frontmatter properties completely
- Create snapshot using `cp -al` (hard links) before any operation for instant undo
- Report success/failure individually for each file in the operation
- Refuse to execute operation if any target files already exist (no overwrites)

### File Relocator
- Find all `[[filename]]` wikilinks pointing to moved files across entire vault
- Find all `[text](path/to/file.md)` markdown links pointing to moved files
- Update link paths while preserving link text and anchors (e.g., `[[file#heading]]`)
- Update relative paths correctly based on the linking file's location
- Process multiple file moves in a single pass for efficiency

### Configuration
- Load config from path specified at startup (e.g., `mmt --config /path/to/config.yaml`)
- Exit with error if no config path provided: "Error: --config flag is required"
- Exit with error if config file doesn't exist at specified path
- Validate ALL required fields are present: `vaultPath`, `providers` array
- Validate field values: `vaultPath` must exist, `qmServiceUrl` must be valid URL if in providers
- Exit with specific error for any missing or invalid field
- NO defaults, NO fallbacks, NO environment variables - everything must be explicit in config

### DocSet Building
- Parse query string if needed, or accept pre-parsed Query object
- Use local indexer for metadata/link queries
- Optionally enhance with QM for similarity search
- Include metadata: unique ID, timestamp of execution, original query, total count
- Limit results to 500 documents even if query matches more

### View Persistence
- Save view configurations to `~/.mmt/views/*.yaml` with Zod-validated schema
- Load saved views by name or ID
- Automatically save and restore last active view between sessions
- Preserve: column order array, column visibility flags, sort direction, row density, query

### CSV Export
- Export current DocSet (filtered results) to CSV file
- Include only visible columns in current column order
- Escape commas, quotes, and newlines per RFC 4180 CSV standard
- Include header row with column names
- Exclude document content/preview to keep file size manageable

## E2E Test Scenarios (Playwright)

### Critical User Paths

1. **Search and Filter Documents**
   - Enter query in search box
   - View filtered results in table
   - See result count
   - Clear filters

2. **Bulk Move Operations**
   - Search for documents
   - Select multiple documents
   - Choose move operation
   - Select target folder
   - Confirm and execute
   - Verify success message

3. **Update Properties in Bulk**
   - Select documents
   - Choose update properties operation
   - Add/remove frontmatter properties
   - Preview changes
   - Execute operation

4. **Save and Load Views**
   - Create custom query
   - Configure table columns
   - Sort by column
   - Save view with name
   - Load saved view later
   - Verify all settings restored

5. **Export to CSV**
   - Filter documents
   - Select export option
   - Choose columns to include
   - Download CSV file
   - Verify file contents

## Test Execution

- Tests are run manually for now
- Integration tests before commits
- E2E tests before merging
- All tests use real implementations
- No coverage goals initially - we'll evaluate as we go

## Testing Without External Dependencies

Most tests run with just the local indexer:
1. Copy test vault to temp directory
2. Build index from markdown files
3. Run queries against local index
4. Clean up temp files after tests

## Optional QM Integration Testing

For vector similarity features only:
1. Start QM service with test vault
2. Run similarity search tests
3. Verify results combine properly with local index
4. Stop QM service after tests
