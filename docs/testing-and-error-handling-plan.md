# Testing and Error Handling Plan for MMT

## Date: 2025-01-29

## Executive Summary

This document outlines a comprehensive plan to address critical issues in the MMT application:
- Disconnect between test results and actual UI behavior
- Silent failures in vault loading and file operations
- Lack of observability into what's actually happening
- Need for automated E2E testing with Playwright

## Core Problems

1. **Testing Disconnect**: Current tests verify API endpoints work but don't validate actual UI behavior
2. **Silent Failures**: Errors in vault loading, file operations, and search aren't visible to users
3. **Swallowed Errors**: Exceptions and failed promises may be getting silently consumed
4. **Architecture Issues**: File operations work in isolation but fail in UI context
5. **No Observability**: Can't see what's happening when operations fail

## Proposed Solutions

### 1. Test Harness Page for Playwright

Create a dedicated testing page at `/test-harness` that exercises all API functionality without UI complexity.

#### Design Principles
- **Simple HTML**: No complex CSS or animations
- **Direct API Calls**: Each operation as a separate, testable action
- **Clear Status**: Visible success/failure indicators
- **Deterministic**: Predictable element IDs and data attributes

#### Test Harness Components

```html
<!-- /apps/web/src/test-harness.html -->
<div id="test-harness">
  <!-- Vault Operations -->
  <section id="vault-tests">
    <button data-testid="load-vaults">Load Vaults</button>
    <div data-testid="vault-status"></div>
    <div data-testid="vault-errors"></div>
  </section>

  <!-- Document Operations -->
  <section id="document-tests">
    <button data-testid="fetch-documents" data-vault="Personal">Fetch Personal Docs</button>
    <button data-testid="fetch-documents" data-vault="Work">Fetch Work Docs</button>
    <div data-testid="document-count"></div>
    <div data-testid="document-errors"></div>
  </section>

  <!-- File Operations -->
  <section id="file-operations">
    <button data-testid="reveal-in-finder" data-path="/test/file.md">Reveal Test File</button>
    <button data-testid="quicklook" data-path="/test/file.md">Preview Test File</button>
    <div data-testid="operation-status"></div>
    <div data-testid="operation-errors"></div>
  </section>

  <!-- Search Operations -->
  <section id="search-tests">
    <input data-testid="search-query" />
    <button data-testid="text-search">Text Search</button>
    <button data-testid="similarity-search">Similarity Search</button>
    <div data-testid="search-results"></div>
    <div data-testid="search-errors"></div>
  </section>

  <!-- Debug Output -->
  <section id="debug-output">
    <div data-testid="api-calls"></div>
    <div data-testid="error-log"></div>
  </section>
</div>
```

#### Benefits
- **Fast Testing**: No waiting for complex UI to render
- **Reliable Selectors**: Predictable test IDs
- **Clear Assertions**: Simple pass/fail states
- **API Coverage**: Tests exact same endpoints as production UI

### 2. Error Audit and Remediation

#### Audit Checklist

##### Frontend Error Patterns to Find and Fix
```typescript
// BAD: Swallowed errors
fetch('/api/data')
  .then(res => res.json())
  .catch(() => {}); // Silent failure

// GOOD: Logged and reported errors
fetch('/api/data')
  .then(res => res.json())
  .catch(error => {
    console.error('Failed to fetch data:', error);
    setError(error.message);
    reportToMonitoring(error);
  });
```

##### Common Error Swallowing Patterns
1. **Empty catch blocks**: `catch(() => {})`
2. **Unhandled promise rejections**: Missing `.catch()`
3. **Async without try-catch**: `async` functions without error handling
4. **Silent state updates**: Setting loading=false without checking for errors
5. **Ignored response status**: Not checking `response.ok`

##### Backend Error Patterns to Fix
```typescript
// BAD: Error swallowed
router.get('/api/data', async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch {
    res.json([]); // Returns empty data on error
  }
});

// GOOD: Error reported
router.get('/api/data', async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (error) {
    console.error('getData failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve data',
      details: error.message
    });
  }
});
```

### 3. Enhanced Error Visibility

#### Vault Tab Error States

```typescript
interface VaultTab {
  id: string;
  name: string;
  status: 'loading' | 'ready' | 'error' | 'partial';
  error?: {
    message: string;
    details: string;
    phase: 'initialization' | 'indexing' | 'connection';
    recoverable: boolean;
    timestamp: Date;
  };
  documentCount?: number;
  failedOperations: number;
}
```

#### Visual Error Indicators
- **Gray/Red tabs** for vaults with errors
- **Warning badges** showing error count
- **Hover tooltips** with error details
- **Click behavior** opens error detail panel
- **Retry buttons** for recoverable errors

### 4. File Operations Architecture Redesign

#### Problem
Server-side `spawn` commands complete successfully but don't result in visible OS actions.

#### Solution: Multi-Layer Approach

```typescript
interface FileOperationResult {
  success: boolean;
  method: 'native' | 'url-scheme' | 'fallback';
  action: 'reveal' | 'preview';
  command?: string;
  output?: string;
  error?: string;
  fallback: {
    available: boolean;
    message: string;
    copyPath: string;
    downloadUrl?: string;
  };
}
```

#### Implementation Layers
1. **Primary**: Native OS command with validation
2. **Secondary**: Custom URL scheme (if registered)
3. **Tertiary**: Modal with path and copy button
4. **Always**: Status notification with details

### 5. Robust Vault Initialization

```typescript
// Always show ALL configured vaults
async function initializeVaults(config: Config) {
  const results: VaultInitResult[] = [];
  
  for (const vaultConfig of config.vaults) {
    const result: VaultInitResult = {
      id: vaultConfig.id,
      name: vaultConfig.name,
      status: 'pending',
      errors: []
    };
    
    try {
      // Phase 1: Connection
      await connectToVault(vaultConfig);
      
      // Phase 2: Indexing
      const indexed = await indexDocuments(vaultConfig);
      result.documentsIndexed = indexed;
      
      // Phase 3: Watching
      await startWatcher(vaultConfig);
      
      result.status = 'success';
    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        phase: getCurrentPhase(),
        message: error.message,
        timestamp: new Date()
      });
    }
    
    results.push(result);
    
    // ALWAYS create tab, even for failed vaults
    createVaultTab(result);
  }
  
  return results;
}
```

### 6. Implementation Phases

#### Phase 1: Observability (Day 1)
- [ ] Add comprehensive logging to all operations
- [ ] Create test harness page at `/test-harness`
- [ ] Implement debug panel in main UI
- [ ] Add operation history tracking
- [ ] Add `data-testid` to all interactive elements

#### Phase 2: Error Handling (Day 1-2)
- [ ] Audit and fix all swallowed errors
- [ ] Implement vault tab error states
- [ ] Add error notifications for all operations
- [ ] Create fallback UI for failed operations
- [ ] Show initialization errors in UI

#### Phase 3: Playwright Tests (Day 2-3)
- [ ] Set up Playwright infrastructure
- [ ] Create tests for test harness page
- [ ] Create page object models for main UI
- [ ] Write critical user journey tests
- [ ] Add visual regression tests

#### Phase 4: Architecture Improvements (Day 3-4)
- [ ] Implement response validation for file operations
- [ ] Add retry logic for vault initialization
- [ ] Create operation status tracking
- [ ] Implement progressive enhancement for file operations

### 7. Playwright Test Suite

#### Test Structure
```
tests/
├── e2e/
│   ├── test-harness.spec.ts    # API functionality tests
│   ├── vault-loading.spec.ts   # Vault initialization tests
│   ├── file-operations.spec.ts # Reveal/Preview tests
│   ├── search.spec.ts          # Search functionality
│   └── error-handling.spec.ts  # Error state tests
├── fixtures/
│   └── test-config.yaml        # Known good configuration
└── page-objects/
    ├── test-harness.page.ts
    └── main-app.page.ts
```

#### Example Test
```typescript
test('all configured vaults create tabs', async ({ page }) => {
  await page.goto('/test-harness');
  
  // Load vaults
  await page.click('[data-testid="load-vaults"]');
  
  // Wait for completion
  await page.waitForSelector('[data-testid="vault-status"]:has-text("complete")');
  
  // Verify all vaults present
  const vaults = await page.$$('[data-testid^="vault-tab-"]');
  expect(vaults).toHaveLength(3);
  
  // Check for errors
  const errors = await page.textContent('[data-testid="vault-errors"]');
  if (errors) {
    console.log('Vault errors detected:', errors);
  }
});
```

### 8. Success Criteria

1. **Testability**: Every user action testable via test harness and Playwright
2. **Visibility**: All errors visible in UI with actionable messages
3. **Reliability**: Operations work consistently or show clear failure reasons
4. **Debuggability**: Can diagnose issues from UI without checking server logs
5. **Coverage**: No swallowed errors anywhere in codebase

### 9. Error Monitoring and Reporting

#### Client-Side Error Boundary
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary:', error, info);
    
    // Report to UI
    this.setState({
      hasError: true,
      error: error.message,
      componentStack: info.componentStack
    });
    
    // Could send to monitoring service
    reportError({
      message: error.message,
      stack: error.stack,
      component: info.componentStack,
      timestamp: new Date()
    });
  }
}
```

#### Global Error Handler
```typescript
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Show notification
  showErrorNotification({
    title: 'Unexpected Error',
    message: event.reason?.message || 'An unexpected error occurred',
    action: 'Retry'
  });
});
```

### 10. Branch Strategy

```bash
# Create feature branch
git checkout -b feature/testing-and-error-handling

# Work will be done in phases
# Each phase gets its own commit
# PR after Phase 2 for initial improvements
# Follow-up PR for Playwright tests
```

## Next Steps

1. **Immediate**: Create feature branch and test harness page
2. **Day 1**: Complete error audit and implement observability
3. **Day 2**: Fix error handling and create Playwright tests
4. **Day 3-4**: Architecture improvements and comprehensive testing
5. **Day 5**: Integration testing and documentation

## Expected Outcomes

- **Developer Experience**: Clear visibility into what's happening
- **User Experience**: Errors are visible with recovery options
- **Testing**: Automated E2E tests catch regressions
- **Reliability**: File operations work or clearly explain why not
- **Maintainability**: Easy to diagnose and fix issues

## Risk Mitigation

- **Incremental Changes**: Each phase independently valuable
- **Backward Compatible**: No breaking changes to existing functionality
- **Feature Flags**: Can toggle debug features on/off
- **Rollback Plan**: Each phase can be reverted independently