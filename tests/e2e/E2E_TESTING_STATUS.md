# E2E Testing Status

## Current Issue: React Error #185

The E2E tests are currently blocked by React Error #185 (hooks called conditionally) that occurs ONLY when running through Playwright. The app works perfectly when launched manually.

### Root Cause
The issue appears to be with how `electron-trpc` initializes in the test environment. The `ipcLink()` function seems to use React hooks in a way that breaks when:
- `NODE_ENV=test` 
- App is launched with `--test-offscreen` flag
- Playwright controls the Electron app

### Attempted Fixes
1. Upgraded to `@trpc/react-query` for proper React integration
2. Moved tRPC client creation inside React component with `useMemo`
3. Created custom IPC link implementation with proper Observable handling
4. Downgraded `@tanstack/react-query` to v4 for compatibility

None of these resolved the issue.

### Workaround Options
1. Mock IPC communication in E2E tests
2. Test against development server instead of production build
3. Replace electron-trpc with manual IPC implementation
4. Skip E2E tests until migrating to web app architecture

### Test Coverage
All 7 E2E test scenarios are implemented and ready to run:
- Search and filter documents
- Bulk move operations
- Bulk property updates
- Save/load views
- Export to CSV
- Column sorting
- Error handling

The tests themselves are likely correct - it's the electron-trpc + React + Playwright combination causing issues.