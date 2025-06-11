# MMT Engineering Principles

## Goals
Build a fast, reliable, and maintainable tool for managing markdown at scale.

## Core Principles

### 1. Explicit Over Implicit
- NO DEFAULTS - Every configuration must be explicit
- No magic values or hidden behavior
- Clear, deterministic execution paths
- What you configure is what you get

### 2. Schema-Driven Architecture
- All data structures defined as Zod schemas
- Schemas are the contracts between packages
- Runtime validation at all boundaries
- TypeScript types derived from schemas

### 3. Separation of Concerns
- Each package has ONE clear responsibility
- No business logic in infrastructure packages
- Dependencies flow in one direction only
- Packages communicate only through schemas

### 4. Test with Reality
- NO MOCKS - Test with real implementations only
- Integration tests over unit tests
- Test files use temporary directories
- Performance tests with realistic data sizes

### 5. Fail Fast and Clear
- Validate early, at startup when possible
- Exit immediately on invalid configuration
- Provide actionable error messages
- No silent failures or fallbacks

## Concrete Rules

### Code Organization
- No function longer than 50 lines
- No file longer than 300 lines
- Each file has a single, clear purpose
- All packages include @fileoverview documentation

### Testing
- Write tests FIRST (TDD)
- NO mocks, stubs, or test doubles - EVER
- Test behavior, not implementation
- Include performance tests for scale (5000+ files)

### Dependencies
- Packages depend only on schemas, not implementations
- Circular dependencies are forbidden
- Minimize external dependencies
- Use mature, well-maintained libraries

### Documentation
- Every package has comprehensive README
- All public APIs have JSDoc comments
- Code comments explain WHY, not WHAT
- Include examples for complex features

### Error Handling
- Throw early with descriptive errors
- Include context in error messages
- No catch-and-ignore patterns
- Let errors bubble to appropriate handlers

### Performance
- Target: Index 5000 files in < 5 seconds
- Memory-efficient data structures
- Lazy loading where appropriate
- Profile before optimizing

## Architecture Patterns

### Monorepo Structure
```
packages/
├── entities/          # Shared schemas only
├── filesystem-access/ # Centralized file operations
├── config/           # Explicit configuration
├── indexer/          # Local file indexing
├── [feature]/        # Single-responsibility packages
```

### Data Flow
1. User input → Validation (Zod) → Processing → Output
2. All IPC through electron-trpc with schema validation
3. File operations only through filesystem-access
4. State changes are explicit and traceable

### Testing Strategy
1. Write failing test
2. Implement minimal solution
3. Refactor while tests pass
4. No implementation without tests

## What We Don't Do
- No environment variables for configuration
- No implicit defaults or magic values
- No mocking in tests
- No premature optimization
- No clever code - clarity wins

## Summary
These principles ensure MMT remains fast, reliable, and maintainable as it scales. When in doubt, choose the explicit, simple, tested solution.
