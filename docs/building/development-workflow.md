# Development Workflow

## Feature Development Cycle

When implementing new features, follow this comprehensive workflow to ensure quality and real-world validation:

### 1. Test-Driven Development
- Write failing tests that capture expected behavior
- Fix code to make tests pass
- This prevents regression and clarifies intent

### 2. Full Build Validation
```bash
# Clean everything
pnpm clean
rm -rf node_modules .turbo

# Fresh install
pnpm install

# Full build
pnpm build

# Run linting
pnpm lint

# Run all tests
pnpm test
```

### 3. Real-World Validation
Create minimal test scripts to validate against production data:

```bash
# Test with real vault
mmt --config config/test-vault.yaml script test-scripts/validate-feature.mmt.ts
```

### 4. Error Message Quality
- Ensure errors are immediately actionable
- Include what IS allowed, not just what isn't
- Provide examples in error messages
- Test error paths with real usage

## Example: Indexer Integration

The indexer integration revealed several insights:
1. **CLI parsing needed both `--config=value` and `--config value` formats**
2. **Config schema was too strict** - error message didn't explain allowed fields
3. **Template files with `{{}}` syntax** cause YAML parsing errors (expected)
4. **Performance validation** - 5919 files indexed successfully

## Benefits

This workflow ensures:
- Features work with real data, not just test fixtures
- Error messages guide users effectively  
- Performance meets real-world requirements
- Integration points are properly tested
- No surprises when users try the feature

## Quick Validation Script

For rapid testing during development:

```bash
#!/bin/bash
# dev-test.sh
set -e

echo "🧹 Cleaning..."
pnpm clean

echo "📦 Installing..."
pnpm install

echo "🔨 Building..."
pnpm build

echo "✅ Testing..."
pnpm test

echo "🌍 Real-world test..."
mmt --config config/daniel-vault-simple.yaml script test-scripts/count-all.mmt.ts

echo "✨ All checks passed!"
```

This practice should be standard before merging any significant feature.