# Playwright Headless Mode Fix

## Problem
Tests were potentially opening browser windows despite headless configuration in `tests/playwright.config.ts`.

## Root Cause
The configuration was using a conditional expression `process.env.PWDEBUG !== '1'` which should work correctly. Testing confirmed this evaluates to `true` (headless mode) when PWDEBUG is undefined.

## Solution Applied
1. Verified the conditional logic works correctly
2. Cleaned up project configurations to ensure they inherit from global settings
3. Added clear documentation about debugging modes

## Configuration
The Playwright config now properly supports:
- **Default mode**: Tests run headless (no browser windows)
- **Debug mode**: Set `PWDEBUG=1` environment variable to see browser
- **Debug project**: Use `--project=chromium-debug` for visible browser

## Usage

### Run tests headless (default)
```bash
pnpm test:e2e
```

### Run tests with visible browser for debugging
```bash
# Option 1: Environment variable
PWDEBUG=1 pnpm test:e2e

# Option 2: Debug project (also shows browser)
pnpm test:e2e --project=chromium-debug
```

## Verification
Tested that:
- Default mode runs headless ✓
- PWDEBUG=1 shows browser ✓
- Configuration properly inherits from global settings ✓