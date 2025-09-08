## Current Status

### ✅ PR #266 Merged to Main
Panel functionality restored with proper utility files recovered from git history.

### Recent Work Completed
- **PR #266**: Fixed panel visibility issues
  - Restored original filter-utils.ts and template-utils.ts from git history
  - Added missing setFilters method to document store
  - Created Playwright tests for panel verification
  - Filter and Output panels now working correctly

### Current Issues

#### Test Failures
- **CLI tests**: 18 failed / 25 passed
- **Web tests**: Some failures in unit tests
- **API Server tests**: Some failures

#### Linting Errors (90 total)
- **entities package**: 58 errors (deprecated URLs, template expressions)
- **scripting package**: 32 errors (Issue #263)

#### Panel Issues Still Need Fixes (Issue #265)
- Transform panel "Add operation" dropdown not appearing
- Panel collapsibility mechanism broken
- Preview button not visible
- Panel summaries don't update with content changes

## Prioritized Action Plan

### 🔥 P0 - Critical (Blocking functionality)
**Complete Panel Fixes (Issue #265)**
- Fix Transform panel dropdown
  - Check why "Add operation" button isn't appearing
  - May need to fix TransformPanel component state management
- Fix panel collapsibility
  - Panels should close when clicking header again
  - Only one panel should be open at a time
- Fix Preview button visibility
  - Button should be visible in the pipeline bar
- Fix panel summary updates
  - Summaries should reflect current filter/transform state
- **Estimate**: 1-2 hours
- **Test with**: `npx playwright test panels-visibility.spec.ts`

### 🚨 P1 - High (Test failures affecting development)
**Fix Failing Tests**
- **CLI tests**: 18 failures to investigate
  - Run: `pnpm --filter @mmt/cli test:unit`
  - Likely related to recent refactors
- **Web tests**: Unit test failures
  - Run: `pnpm --filter @mmt/web test:unit`
  - May be related to panel/store changes
- **API Server tests**: Some failures
  - Run: `pnpm --filter @mmt/api-server test:unit`
- **Estimate**: 2-3 hours depending on complexity

### ⚠️ P2 - Medium (Build quality)
**Address Linting Errors (90 total)**
- **entities package** (58 errors):
  - Deprecated URL usage - need to update to use network configuration
  - Template expression type issues
  - Run: `pnpm --filter @mmt/entities lint`
- **scripting package** (32 errors - Issue #263):
  - TypeScript strict mode violations
  - Run: `pnpm --filter @mmt/scripting lint`
- **Estimate**: 1-2 hours

### 📋 P3 - Lower (Tech debt)
**TypeScript Strict Mode (Issue #263)**
- Already tracked in Issue #263
- Part of scripting package cleanup
- Can be addressed with P2 linting work

## Recommended Approach

**Start with P0 (Panel Fixes)** because:
1. User-facing features should work correctly
2. Panels are core to the application workflow
3. Relatively quick fixes (1-2 hours)
4. Playwright tests already exist to verify fixes

**Then P1 (Tests)** to ensure:
1. Development confidence
2. CI/CD pipeline success
3. No hidden regressions

**Finally P2/P3 (Linting/TypeScript)** for:
1. Code quality improvements
2. Better maintainability
3. Reduced technical debt