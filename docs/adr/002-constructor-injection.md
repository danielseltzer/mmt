# ADR-002: Constructor Injection for Dependencies

## Status

Accepted

## Context

As the codebase grows with multiple packages, we need a consistent pattern for managing dependencies between components. Options considered:
1. Service locator pattern
2. Dependency injection framework
3. Constructor injection
4. Factory pattern
5. Singleton/global instances

We need a solution that is:
- Explicit and easy to understand
- Type-safe with TypeScript
- Testable with our no-mocks strategy
- Simple without framework magic

## Decision

We will use constructor injection for all dependencies. Each class explicitly declares its dependencies as constructor parameters.

Example:
```typescript
export class VaultIndexer {
  constructor(
    private config: IndexerConfig,
    private fs: FileSystemAccess
  ) {}
}
```

Package-specific configuration is passed via Zod schemas, not individual parameters:
```typescript
// Good
constructor(config: IndexerConfig, fs: FileSystemAccess)

// Bad  
constructor(indexPath: string, vaultPath: string, fs: FileSystemAccess)
```

## Consequences

**Positive:**
- Dependencies are explicit and visible
- Easy to test with real implementations
- Type-safe with TypeScript
- No framework or magic required
- Natural fit with our no-mocks testing strategy
- Easy to understand for new developers

**Negative:**
- Can lead to long constructor parameter lists
- Manual wiring required at application entry points
- No automatic lifecycle management

**Mitigation:**
- Use configuration objects to group related parameters
- ApplicationDirector handles wiring at the top level
- Keep classes focused with single responsibilities