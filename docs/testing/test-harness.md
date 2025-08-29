# Test Harness

## Overview

The MMT Test Harness is a development-mode testing page that provides direct access to all API functionality without the complexity of the main UI. This page is designed for:

1. **Manual testing** - Quickly test API endpoints and operations
2. **Debugging** - See detailed API call logs and responses
3. **Playwright testing** - Provides simple, reliable UI elements for automated tests
4. **Development** - Verify new features work correctly before integrating with main UI

## Accessing the Test Harness

### Via Browser
Navigate to: `http://localhost:5173/test-harness` (only available in development mode)

### Via Command Line
```bash
./bin/test-harness
```

## Features

### Vault Operations
- **Load Vaults** - Fetches all configured vaults from the API
- **Check Status** - Gets index status for each vault
- **Check Similarity** - Verifies if similarity search is available

### Document Operations
- **Fetch Documents** - Loads documents for a specific vault into a tab
- **Apply Filter** - Tests natural language filter parsing
- **View Counts** - Shows document counts and loading states

### File Operations
- **Reveal in Finder** - Tests file reveal functionality
- **QuickLook Preview** - Tests macOS QuickLook integration

### Search Operations
- **Text Search** - Standard text-based document search
- **Similarity Search** - AI-powered similarity search (if configured)
- **Search Mode Toggle** - Switch between search modes

### Debug Output
- **API Call Log** - Complete history of all API calls with timestamps
- **Error Log** - Tracks any errors that occur
- **Store State** - Current state of the document store
- **Clear Functions** - Reset logs for clean testing

## Test Attributes

All interactive elements have `data-testid` attributes for Playwright testing:

```typescript
// Vault operations
data-testid="load-vaults"
data-testid="vault-count"
data-testid="vault-{id}"
data-testid="check-status-{id}"
data-testid="fetch-docs-{id}"
data-testid="check-similarity-{id}"

// Document operations
data-testid="active-tab"
data-testid="document-count"
data-testid="documents-loading"
data-testid="documents-error"
data-testid="filter-input"
data-testid="apply-filter"

// File operations
data-testid="file-path-input"
data-testid="reveal-in-finder"
data-testid="quicklook-preview"
data-testid="file-operation-status"

// Search operations
data-testid="text-search-input"
data-testid="text-search-button"
data-testid="similarity-search-input"
data-testid="similarity-search-button"
data-testid="search-mode"
data-testid="search-results-count"

// Debug output
data-testid="api-calls"
data-testid="error-log"
data-testid="store-state"
```

## Playwright Tests

The test harness has comprehensive Playwright tests in `/apps/web/playwright/test-harness.test.ts`:

```bash
# Run all test harness tests
pnpm --filter @mmt/web test:e2e --grep "Test Harness"

# Run with UI mode for debugging
pnpm --filter @mmt/web test:e2e:ui --grep "Test Harness"
```

## Implementation Details

### Component Location
`/apps/web/src/components/TestHarness.tsx`

### Key Features
1. **No Complex CSS** - Uses inline styles for simplicity
2. **Direct API Calls** - Shows exactly what's happening
3. **Real Store Integration** - Uses the actual document store
4. **Console Logging** - All operations log to browser console
5. **Error Handling** - Captures and displays all errors

### API Endpoints Tested
- `GET /api/vaults` - Load vault list
- `GET /api/vaults/{id}/status` - Check vault index status
- `GET /api/vaults/{id}/documents` - Fetch documents
- `POST /api/vaults/{id}/documents/parse-query` - Parse filter queries
- `GET /api/vaults/{id}/similarity/status` - Check similarity availability
- `POST /api/vaults/{id}/similarity/search` - Perform similarity search
- `POST /api/files/reveal` - Reveal file in Finder
- `POST /api/files/quicklook` - QuickLook preview

## Usage Tips

1. **Start Fresh** - Use "Clear API Calls" and "Clear Errors" to reset state
2. **Check Console** - Browser console has additional debug information
3. **Test in Order** - Load vaults first, then create tabs, then test operations
4. **Verify States** - Check loading states and error handling
5. **Test Edge Cases** - Try invalid inputs, missing files, etc.

## Common Test Scenarios

### Basic Workflow Test
1. Load vaults
2. Check status for each vault
3. Fetch documents for a vault
4. Apply a filter
5. Perform a text search
6. Check debug output

### Similarity Search Test
1. Load vaults
2. Check similarity status
3. Fetch documents
4. Switch to similarity mode
5. Perform similarity search
6. Verify results

### Error Handling Test
1. Try operations without loading vaults
2. Use invalid file paths
3. Search with no active tab
4. Apply malformed filters