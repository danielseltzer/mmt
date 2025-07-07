# Handoff Note - E2E Testing Implementation

## Current Status
Working on the MMT (Markdown Management Toolkit) project on branch `feat/17-electron-trpc-ipc`.

### ⚠️ CRITICAL ISSUE: React Error #185 in E2E Tests
The app works fine when run manually (`npx electron apps/electron-main/dist/index.js`) but fails with React Error #185 (hooks called conditionally) when run through Playwright E2E tests. This issue persists despite multiple fix attempts.

## Recent Work Completed

### 1. **E2E Test Implementation (Issue #19)** ✅
- Implemented all 7 priority E2E test workflows in `tests/e2e/app.spec.ts`:
  1. Search and filter documents ("project alpha")
  2. Bulk move operation (10 files to /Archive/2024)
  3. Bulk property update (add "status:archived") 
  4. Save and load views ("Archived Projects")
  5. Export to CSV with verification
  6. Column sorting by modified date
  7. Error handling for file conflicts
- Created test infrastructure:
  - `test-vault-generator.ts` - Generates 100+ test markdown files
  - Updated `electron-helpers.ts` for test vault creation
  - Added E2E test scripts to package.json

### 2. **Fixed tRPC Version Mismatch (Issue #92)** ✅
- Aligned all packages to tRPC v10 by downgrading electron-trpc from 0.6.0 to 0.5.2
- Fixed TypeScript configuration for table-view package (added DOM types)
- All packages now build successfully

### 3. **Resolved Electron Launch Issue (Issue #93)** ✅
- **Root Cause**: electron-trpc has a bug where it uses ESM named imports from 'electron' which is a CommonJS module
- **The Bug**: Affects ALL versions of electron-trpc (tested 0.5.2, 0.7.1, 1.0.0-alpha)
- **Solution**: Implemented workaround using `createRequire` to load electron-trpc as CommonJS
- This is a known issue affecting multiple Electron libraries, confirmed by other developers

### 4. **Attempted React Error #185 Fixes** ❌
Tried multiple approaches based on research:
1. **Upgraded from proxy client to React integration**:
   - Installed `@trpc/react-query@10.45.2` (compatible with tRPC v10)
   - Downgraded `@tanstack/react-query` to v4.40.1 (from v5)
   - Created `trpcReact` instance using `createTRPCReact`
   - Wrapped app with proper `trpcReact.Provider` and `QueryClientProvider`

2. **Moved client creation inside React component**:
   - Created `AppWithProviders` wrapper component
   - Used `useMemo` to create tRPC client inside React render cycle
   - This approach should have prevented hooks from being called outside components

3. **Created custom IPC link**:
   - Built custom `createIPCLink()` in `api/ipc-link.ts`
   - Properly returns Observable using `@trpc/server/observable`
   - Handles `window.electronTRPC` availability checks
   - Replaces `ipcLink()` from `electron-trpc/renderer`

Despite these fixes, React Error #185 persists ONLY in E2E tests. The app works perfectly when launched manually.

## Current State

### Working
- All packages build successfully
- Electron app launches properly when run with `npx electron`
- tRPC versions are aligned to 0.5.2
- E2E tests are fully written and ready
- Playwright can now launch Electron app successfully
- Renderer path issues resolved for test mode
- Off-screen mode implemented for E2E tests (no window popup)
- electronTRPC preload script issues resolved

### Not Yet Working
- React Error #185 in renderer (hooks being called outside component)
- E2E tests can't interact with UI due to React rendering error

## Next Steps

### Critical: Fix React Error #185 in E2E Tests

The error only occurs when running E2E tests, not manual execution. Possible root causes:

1. **Timing Issue with window.electronTRPC**
   - E2E tests might be loading React before preload script exposes electronTRPC
   - Consider adding a delay or checking for window.electronTRPC availability

2. **Environment Differences**
   - E2E tests set `NODE_ENV=test` and pass `--test-offscreen`
   - Something in the build or runtime might behave differently in test mode

3. **Alternative Solutions to Try**:
   - **Mock IPC in tests**: Create a mock version of electron-trpc for E2E tests
   - **Use a different IPC approach**: Consider using plain Electron IPC for tests
   - **Debug with source maps**: Enable source maps in Vite build to get better error traces
   - **Test with development build**: Run E2E tests against dev server instead of production build
   - **Check React StrictMode**: Try disabling StrictMode in test environment

4. **Nuclear Option**:
   - Replace electron-trpc with manual IPC implementation using contextBridge
   - This would eliminate the dependency on the problematic library

### Once React Error is Fixed
- Verify all 7 E2E test scenarios pass
- Add to CI/CD pipeline
- Document the E2E testing approach and any workarounds needed

## Key Technical Details

### ESM/CommonJS Situation
- Our entire codebase uses ESM (`"type": "module"`)
- Only electron-trpc requires CommonJS workaround due to its bug
- Electron v36 fully supports ESM (since v28)
- The workaround is isolated to one import in `apps/electron-main/src/index.ts`

### Preload Script Fix
- electron-trpc 0.5.2's `exposeElectronTRPC` function doesn't work correctly
- Had to manually implement the preload script:
```javascript
contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (message: any) => ipcRenderer.send('electron-trpc.main', message),
  onMessage: (callback: (message: any) => void) => 
    ipcRenderer.on('electron-trpc.renderer', (_event, message) => callback(message)),
});
```

### File Locations
- E2E tests: `/tests/e2e/`
- Main app entry: `apps/electron-main/dist/index.js`
- Preload script: `apps/electron-preload/dist/preload.js`
- Renderer: `apps/electron-renderer/dist/`

### Test Commands
```bash
pnpm build              # Build all packages
pnpm test:e2e          # Run E2E tests (currently hangs)
pnpm test:e2e:ui       # Run with Playwright UI

# Debug commands
npx electron apps/electron-main/dist/index.js  # Works!
pnpm playwright test tests/e2e/minimal.spec.ts # Hangs
```

## Important Notes

1. **Don't Remove the CommonJS Workaround** - It's necessary for ALL versions of electron-trpc
2. **The App Works** - The issue is specifically with Playwright launching it
3. **Build Order Matters** - Always run `pnpm build` before testing

Good luck with the next session! The E2E tests are ready to go once the Playwright launch issue is resolved.