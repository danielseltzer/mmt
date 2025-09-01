# MMT Development Tools

This directory contains development tools for the MMT project.

## Compliance Checker (`check-compliance.js`)

Automated enforcement of critical rules from CLAUDE.md to maintain code quality and consistency.

### What It Checks

1. **NO MOCKS** - Tests must use real file operations in temp directories, not mocks/stubs/spies
2. **NO DEFAULTS** - All configuration must be explicit (no `|| defaultValue` patterns)
3. **ENV VARS** - Environment variables only for secrets, not configuration
4. **NO BACKWARD COMPAT** - Never add deprecated code, aliases, or legacy support
5. **FILESYSTEM ACCESS** - All file operations must go through `@mmt/filesystem-access` package

### Usage

```bash
# Check all files in the project
pnpm check:compliance

# Check only staged files (useful for pre-commit)
pnpm check:compliance:staged

# Or run directly
node tools/check-compliance.js [--staged]
```

### Pre-commit Hook

The compliance checker is automatically run before each commit via `.git/hooks/pre-commit`. This prevents committing code that violates project rules.

### Exit Codes

- `0` - All checks passed
- `1` - Violations found

### Example Output

```
MMT Compliance Check Results
============================================================
✅ NO MOCKS: Clean
❌ NO DEFAULTS: Found 1 violation
   → apps/web/vite.config.ts:17
     target: `http://localhost:${process.env.MMT_API_PORT || '3001'}`,
     Issue: Default value for configuration
✅ ENV VARS: Clean
✅ NO BACKWARD COMPAT: Clean
✅ FILESYSTEM ACCESS: Clean
============================================================

❌ Compliance check failed
Fix the violations above before committing.
```

### Fixing Common Violations

- **NO MOCKS**: Replace mocks with real file operations using temp directories
- **NO DEFAULTS**: Remove `|| 'defaultValue'` patterns, require explicit config
- **ENV VARS**: Move configuration from environment variables to config files
- **NO BACKWARD COMPAT**: Remove deprecated/legacy code completely
- **FILESYSTEM ACCESS**: Import from `@mmt/filesystem-access` instead of using `fs` directly

## Browser Health Check (`check-browser-health.js`)

Verifies the web UI loads without JavaScript errors.

```bash
# Basic health check
node tools/check-browser-health.js

# Verbose mode (shows all console logs)
node tools/check-browser-health.js http://localhost:5173 --verbose
```

## Test IDs Checker (`check-testids.js`)

Validates that all UI elements have proper test IDs for E2E testing.

```bash
node tools/check-testids.js [url]
```