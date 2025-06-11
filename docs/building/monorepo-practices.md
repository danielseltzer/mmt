# MMT Monorepo Best Practices

This guide outlines best practices for working with the MMT TypeScript monorepo.

## Monorepo Structure

MMT uses a pnpm workspace with Turbo for build orchestration:

- `/packages/*` - 13 single-responsibility packages
- `/apps/*` - Electron main and renderer applications
- `/docs/*` - Architecture and development documentation

## Build Configuration

### TypeScript Configuration
- Base config in `tsconfig.base.json`
- Each package extends the base with its own `tsconfig.json`
- Use composite projects for incremental builds
- Declaration files generated for all packages

### Turbo Configuration
- Defined in `turbo.json`
- Pipeline includes: build, lint, test, clean
- Proper task dependencies ensure correct build order
- Cache enabled for faster rebuilds

## Development Workflow

### Package Dependencies
- Use workspace protocol: `"@mmt/entities": "workspace:*"`
- Run `pnpm install` from root to link packages
- Turbo handles build order automatically
- Dependencies flow in one direction only

### Common Commands
```bash
# From root directory
pnpm build      # Build all packages
pnpm test       # Run all tests
pnpm lint       # Lint all packages
pnpm clean      # Clean all build artifacts
pnpm dev        # Start development mode

# For specific package
pnpm --filter @mmt/indexer build
pnpm --filter @mmt/indexer test
```

## Testing Best Practices

### Test Organization
- Tests in `src/__tests__/` within each package
- Integration tests test cross-package behavior
- E2E tests verify complete workflows

### Test Runner
- Vitest for all testing
- Fast, supports TypeScript natively
- Compatible with our build setup

### Test Principles
- **NO MOCKS** - Use real implementations
- Test with real files in temp directories
- Clean up after each test
- See `testing-strategy.md` for details

## Dependency Management

### Adding Dependencies
```bash
# Add to specific package
pnpm add <package> --filter @mmt/indexer

# Add to root (dev dependencies)
pnpm add -D <package> -w

# Add workspace dependency
pnpm add @mmt/entities --filter @mmt/indexer
```

### Updating Dependencies
```bash
# Update all packages
pnpm update --recursive

# Check outdated
pnpm outdated --recursive
```

## Build Troubleshooting

### Common Issues
1. **Missing JavaScript files**: Run `pnpm clean && pnpm build`
2. **Type errors**: Use `pnpm build` which uses Turbo to ensure packages are built in dependency order
3. **Module not found**: Check workspace dependencies

### Build Cache
- Turbo caches builds in `.turbo/`
- Delete cache if experiencing issues: `rm -rf .turbo`
- Force rebuild: `pnpm build --force`

## Code Standards

### TypeScript
- Strict mode enabled
- No implicit any
- All data validated with Zod schemas
- Types derived from schemas, not duplicated

### Package Structure
- Single responsibility per package
- Clear public API in index.ts
- @fileoverview comments in all files
- Dependencies flow one direction

### Documentation
- Comprehensive README per package
- JSDoc for all public APIs
- Comments explain WHY, not WHAT
- Examples for complex usage

## Release Process

### Version Management
- Fixed versioning across all packages
- Changesets for version tracking (coming soon)
- Semantic versioning (MAJOR.MINOR.PATCH)

### Publishing
- Currently not published to npm
- Internal use only
- Build artifacts in `dist/` directories

## Performance Tips

### Build Performance
- Use `--filter` to build only what you need
- Leverage Turbo cache
- Run parallel builds with proper CPU allocation

### Development Performance
- Use `tsx` for development without building
- Hot reload with `--watch` flags where available
- Incremental TypeScript compilation

## Security Considerations

### Dependencies
- Regular security audits: `pnpm audit`
- Keep dependencies updated
- Review dependency licenses

### Code Security
- No secrets in code
- **NO environment variables** - Use explicit config files only
- Required --config flag with absolute paths
- Config validated with Zod schemas
- Fail fast on invalid configuration
- No defaults or fallbacks

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Clean old build artifacts
- Review and update documentation
- Run full test suite before releases

### Code Quality
- Consistent formatting (ESLint)
- Regular refactoring
- Performance profiling for bottlenecks
- Memory leak detection

## Package Development Guidelines

### Creating a New Package
1. Create directory in `/packages/`
2. Add `package.json` with proper name (`@mmt/package-name`)
3. Create `tsconfig.json` extending base config
4. Add `src/index.ts` as main entry point
5. Write tests FIRST in `src/__tests__/`
6. Document with comprehensive README

### Package Principles
- **Single Responsibility**: One clear purpose per package
- **Schema Dependencies Only**: Import schemas, not implementations
- **Test First**: Write failing tests before code
- **Real Testing**: Use actual files, no mocks
- **Clear Boundaries**: Explicit exports in index.ts

This guide ensures consistent, maintainable code across the MMT monorepo. When in doubt, favor explicit, simple, tested solutions.