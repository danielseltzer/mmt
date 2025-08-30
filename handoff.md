# Handoff Document - MMT Project Status

## Date: 2025-01-29

## Current State

### ✅ Completed Work (This Session)

#### High Priority Tasks
1. **#234 - TableView Testing Strategy (P1)** ✅
   - Refactored 675-line component to 213 lines
   - Created TableCore class for business logic
   - Added 19 comprehensive headless tests
   - All tests passing without mocks

2. **#150 - Preview API Migration (P0)** ✅
   - Moved preview functionality from client to server
   - Created `/api/vaults/:vaultId/documents/preview/:path` endpoint
   - Works correctly with all vaults

3. **#225 - Code Review Cleanup** ✅
   - Refactored script-runner.ts from 744 to 213 lines (71% reduction)
   - Removed all console.log statements from production code
   - Fixed async/promise handling in tests

4. **#223 - TypeScript Cleanup** ✅
   - Fixed all TypeScript compilation errors
   - All packages type-check successfully

5. **#246 - Remove Electron References** ✅
   - Deleted unused Electron scripts
   - Cleaned configuration files
   - Clarified as pure web application

6. **Stop Command Fix** ✅
   - Now properly kills all processes (web on 5173, API on 3001)
   - No orphaned processes left behind

7. **Similarity Endpoint Fix** ✅
   - Fixed 404 errors on `/api/vaults/:vaultId/similarity/status`
   - Added `mergeParams: true` to router
   - Fixed middleware vault access pattern
   - Browser health check now shows HEALTHY

### 🔴 Critical Issues Remaining

#### 1. Playwright Tests Opening Browser Windows (HIGH PRIORITY)
**Problem**: Despite headless configuration, tests still open browser tabs
- Config has `headless: process.env.PWDEBUG !== '1'` 
- Tests ignore this setting and open browser windows anyway
- Disrupts development workflow

**Files to Check**:
- `/tests/playwright.config.ts` - Configuration already updated but not working
- `/tests/e2e/global-setup.ts` - May be overriding headless setting
- Check if there's a hidden `--headed` flag being passed somewhere

#### 2. Only Personal Vault Showing in UI
**Problem**: UI only displays "Personal" vault, missing "InD BizDev" and "Work"
- API correctly returns all 3 vaults at `/api/vaults`
- No error messages shown to user
- Missing vaults should appear grayed out if unavailable (not happening)
- Tab bar component may not be rendering all vaults

**Investigation Needed**:
- `/apps/web/src/components/TabBar.tsx` - Check vault rendering logic
- `/apps/web/src/stores/document-store.ts` - Check vault loading
- Test shows 0 instances of "InD BizDev" and "Work" in DOM

### 🎯 Application Status
- **API Server**: ✅ Running correctly on port 3001
- **Web UI**: ✅ Running on port 5173
- **Browser Health**: ✅ HEALTHY (no console errors)
- **Vaults Loaded**: 
  - Personal: 5,992 docs ✅
  - InD BizDev: 165 docs (API ✅, UI ❌)
  - Work: 5,126 docs (API ✅, UI ❌)

## Next Priority Actions

### 1. Fix Playwright Headless Issue (URGENT)
**Why**: Tests keep opening browser windows, disrupting workflow

**Approach**:
1. Check if global-setup.ts is forcing headed mode
2. Look for any CLI flags or environment variables overriding config
3. Consider adding explicit `--headless` flag to test command
4. May need to use `headless: true` (explicit boolean) instead of conditional

### 2. Fix Missing Vaults in UI
**Why**: Users can only see 1 of 3 configured vaults

**Approach**:
1. Debug TabBar component vault rendering
2. Check if vaults are being filtered somewhere
3. Verify vault store is loading all vaults
4. Ensure grayed-out state works for unavailable vaults
5. Add user-visible error messages if vault loading fails

### 3. Lower Priority Issues
- **#228** - Refactor remaining large files
- **#149** - Move control-manager to /apps
- **#132** - Remove hard-coded URLs/ports

## Commands Reference

```bash
# Start application
./bin/mmt start --config config/daniel-vaults.yaml

# Check status
./bin/mmt status

# Stop application (now properly kills all processes)
./bin/mmt stop

# Run tests (WARNING: Opens browser windows currently)
pnpm test:e2e

# Browser health check (headless, works correctly)
node tools/check-browser-health.js

# Build API server
pnpm --filter @mmt/api-server build

# Type check
pnpm type-check
```

## Test Files Created
- `/tests/e2e/similarity-status.test.ts` - Captures similarity endpoint and vault display issues

## Key Fixes Applied
- Similarity router: Added `mergeParams: true` and fixed vault access pattern
- Stop command: Now kills processes by port (5173, 3001)
- TableView: Refactored with TableCore for testability
- All TypeScript errors resolved
- Console.logs removed from production

## Known Issues
- **Playwright headless not working** - Tests open browser despite config
- **Vaults missing from UI** - Only Personal shows, no error messages
- **YAML parsing errors** - 11 files in InD BizDev vault have frontmatter issues (non-blocking)

## Notes for Next Session
1. **PRIORITY**: Fix Playwright headless - it's disrupting development
2. Then fix vault display - users need to see all configured vaults
3. Consider adding explicit error UI when vaults fail to load
4. All core functionality is working, just UI/testing issues remain