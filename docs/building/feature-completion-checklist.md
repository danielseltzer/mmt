# Feature Completion Checklist

## Purpose
This document defines the standard validation steps required before declaring any feature "complete" in MMT. It balances thorough validation with maintainability, avoiding brittle UI tests while ensuring features actually work.

## Mandatory Validation Steps

### 1. Code Quality ✅
```bash
# All must pass with zero errors
pnpm lint                    # ESLint check
pnpm type-check              # TypeScript compilation
pnpm test:unit               # Unit tests
pnpm build                   # Full build
```

### 2. Browser Health Check ✅
```bash
# Verify no console errors in browser
node tools/check-browser-health.js http://localhost:5173 --verbose
```
- Must return exit code 0 (no errors)
- Filters out expected 501s for unconfigured features
- Catches React errors, mount failures, runtime exceptions

### 3. Visual Feature Validation (Semi-Manual) 🔍

#### Minimal Playwright Smoke Test
Create a lightweight test that validates the feature EXISTS and is VISIBLE:

```typescript
// Example: validate-status-indicators.test.ts
test('vault status indicators appear', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Wait for app to load
  await page.waitForSelector('[data-testid="vault-selector"]', { timeout: 10000 });
  
  // Verify status indicator exists
  const statusIndicator = await page.locator('[data-testid="vault-status-indicator"]');
  await expect(statusIndicator).toBeVisible();
  
  // Verify it has content (not just empty div)
  const statusText = await statusIndicator.textContent();
  expect(statusText).toContain('documents'); // Basic content check
});
```

**Key Principles:**
- Use `data-testid` attributes (stable, not tied to styling)
- Check for EXISTENCE and VISIBILITY only
- Don't test exact text/numbers (those change)
- Don't test complex interactions (too brittle)
- Keep under 10 assertions per feature

#### Manual Verification Checklist
Document what to manually verify (takes < 2 minutes):

```markdown
## Feature: Vault Status Indicators
- [ ] Status icon appears next to vault name
- [ ] Document count is visible
- [ ] Re-index button is clickable
- [ ] Progress bar appears during indexing
- [ ] Error states show red icon
```

### 4. API Endpoint Validation ✅
```bash
# Test new endpoints return expected structure
curl http://localhost:3001/api/vaults/Personal/index/status
# Should return JSON with: status, documentCount, lastIndexed

# For SSE endpoints, verify stream opens
curl -N http://localhost:3001/api/vaults/Personal/index/events
# Should start streaming events
```

### 5. Multi-Vault Testing 🔄
```bash
# Start with multi-vault config
./bin/mmt start --config config/daniel-vaults.yaml

# Verify feature works across vaults
# - Switch between vaults in UI
# - Ensure feature appears/works for each
```

## Feature Completion Report Template

```markdown
## Feature Completion: [Feature Name]

### ✅ Code Quality
- [ ] `pnpm lint` - PASSED (0 errors)
- [ ] `pnpm type-check` - PASSED
- [ ] `pnpm test:unit` - PASSED (X tests)
- [ ] `pnpm build` - SUCCESSFUL

### ✅ Browser Health
- [ ] `check-browser-health.js` - Exit code 0
- [ ] No console errors
- [ ] App mounts successfully

### ✅ Visual Validation
- [ ] Smoke test written: `tests/e2e/[feature].test.ts`
- [ ] Test passes: Feature visible in UI
- [ ] Manual checklist verified (see below)

### ✅ API Validation (if applicable)
- [ ] New endpoints return correct data
- [ ] SSE streams work (if applicable)
- [ ] Error cases handled gracefully

### Manual Verification
- [ ] Feature appears in correct location
- [ ] Basic interactions work
- [ ] Responsive at different screen sizes
- [ ] Works across all configured vaults

### Evidence
- Screenshot: [feature-screenshot.png]
- API Response: `{ status: "ready", documentCount: 5992 }`
- Test Output: "15 tests passed"
```

## Balanced Testing Philosophy

### What We DO Test
1. **Unit tests** - Core logic, utilities, data transformations
2. **API tests** - Endpoint contracts, error handling
3. **Smoke tests** - Feature EXISTS and is VISIBLE
4. **Browser health** - No runtime errors

### What We DON'T Test
1. **Exact UI layout** - Too brittle, changes frequently
2. **Complex interactions** - Manual testing more efficient
3. **Pixel-perfect rendering** - Not worth maintenance cost
4. **Full E2E workflows** - Too slow, too brittle

### When to Add More Tests
Add comprehensive tests ONLY when:
- Feature is stable and unlikely to change
- Bug was found that tests would have caught
- Core business logic that rarely changes
- API contracts that other systems depend on

## Quick Validation Script

Create `scripts/validate-feature.sh`:
```bash
#!/bin/bash
set -e

echo "🔍 Feature Validation Starting..."

echo "1️⃣ Running lint..."
pnpm lint || exit 1

echo "2️⃣ Running type-check..."
pnpm type-check || exit 1

echo "3️⃣ Running tests..."
pnpm test:unit || exit 1

echo "4️⃣ Building project..."
pnpm build || exit 1

echo "5️⃣ Starting services..."
./bin/mmt start --config config/daniel-vaults.yaml &
SERVER_PID=$!
sleep 10

echo "6️⃣ Checking browser health..."
node tools/check-browser-health.js http://localhost:5173 || (kill $SERVER_PID && exit 1)

echo "7️⃣ Running smoke test (if exists)..."
if [ -f "tests/e2e/current-feature.test.ts" ]; then
  pnpm test:e2e tests/e2e/current-feature.test.ts || (kill $SERVER_PID && exit 1)
fi

kill $SERVER_PID
echo "✅ All validations passed!"
```

## Usage

1. During development, run individual checks as needed
2. Before declaring "complete", run full validation
3. Include validation results in PR description
4. For UI features, include screenshot as evidence
5. Document any manual testing performed

This checklist ensures features are properly validated without creating an unmaintainable test suite.