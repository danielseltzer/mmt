# Test Commands Reference

This document describes the test commands available in the MMT project.

## Test Categories

The project has three categories of tests:

1. **Unit Tests** - Fast tests that don't require external services
2. **Integration Tests** - Tests that require the API server or other services
3. **E2E Tests** - End-to-end tests using Playwright (not yet implemented)

## Running Tests

### Run All Tests
```bash
pnpm test
# or
pnpm test:all
```
This runs both unit and integration tests.

### Run Unit Tests Only
```bash
pnpm test:unit
```
Unit tests are fast and don't require any services. Most packages only have unit tests.

### Run Integration Tests Only
```bash
pnpm test:integration
```
Integration tests require the API server. Currently only these packages have integration tests:
- `@mmt/web` - API endpoint tests
- `@mmt/scripting` - Tests that spawn API server for operations

### Run Tests for Specific Package
```bash
# Unit tests for a specific package
pnpm --filter @mmt/indexer test:unit

# Integration tests for a specific package  
pnpm --filter @mmt/web test:integration

# All tests for a specific package
pnpm --filter @mmt/scripting test
```

### Watch Mode
```bash
pnpm test:watch
```
Runs tests in watch mode for development.

## Test Configuration

### API Server Configuration
Integration tests use a test configuration file at `config/test.config.yaml`:
```yaml
vaultPath: /tmp/mmt-test-vault
indexPath: /tmp/mmt-test-index
apiPort: 3001
fileWatching:
  enabled: false
```

### Environment Variables
- `VITE_API_URL` - API URL for web app tests (default: `http://localhost:3001`)

## How Integration Tests Work

### Web App Integration Tests
The web app's integration tests (`src/tests/api.test.jsx`) are configured to:
1. Start an API server before all tests
2. Create a temporary vault with test documents
3. Run tests against the real API
4. Clean up after tests complete

Setup is handled by `apps/web/tests/setup-integration.ts`.

### Scripting Integration Tests
The scripting package tests spawn their own API server for each test to ensure isolation.

## Adding New Tests

### Adding Unit Tests
1. Create test files with `.test.ts` or `.test.tsx` extension
2. Place them next to the code they test or in a `tests/` directory
3. They will automatically be picked up by `pnpm test:unit`

### Adding Integration Tests
1. For web app: Add to `src/tests/` with clear integration test naming
2. Update `vitest.integration.config.ts` to include the new test
3. Ensure the test can work with the shared API server instance

## Troubleshooting

### Integration Tests Failing with Connection Errors
- Check that port 3001 is not in use
- Ensure the API server builds successfully: `pnpm --filter @mmt/api-server build`
- Check the integration test logs for API server startup errors

### Tests Hanging
- Integration tests have a 30-second timeout
- If tests hang, check for:
  - API server not starting properly
  - Port conflicts
  - Missing dependencies

## Test Philosophy

Remember: **NO MOCKS ALLOWED**
- All tests use real implementations
- File operations use temporary directories
- Integration tests use real API server
- This ensures tests reflect actual user experience