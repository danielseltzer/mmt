# ADR-004: Schema-Driven Package Contracts

## Status

Accepted

## Context

In a monorepo with multiple packages, we need clear contracts between packages. Options include:
- TypeScript interfaces only
- JSON Schema
- Protocol Buffers
- Zod schemas
- Plain objects with runtime validation

We need:
- Runtime validation for external inputs
- Type safety at compile time
- Clear documentation of data shapes
- Ability to parse and transform data

## Decision

All data contracts between packages are defined as Zod schemas in the `@mmt/entities` package.

Rules:
1. Every package defines its configuration needs as a Zod schema
2. All inter-package data transfer uses validated schemas
3. Runtime validation at package boundaries
4. TypeScript types are inferred from schemas

Example:
```typescript
// In @mmt/entities
export const IndexerConfigSchema = z.object({
  indexPath: z.string(),
  vaultPath: z.string(),
});

// In @mmt/indexer  
constructor(config: IndexerConfig, fs: FileSystemAccess) {
  // config is already validated
}
```

## Consequences

**Positive:**
- Single source of truth for data shapes
- Runtime validation prevents invalid data
- TypeScript types automatically stay in sync
- Self-documenting with descriptions
- Can generate documentation from schemas
- Transformation and parsing built-in

**Negative:**
- Additional dependency on Zod
- Runtime overhead for validation
- Must define schemas before types
- Learning curve for Zod syntax

**Mitigation:**
- Zod is lightweight and well-maintained
- Validation overhead is negligible for our use case
- Good TypeScript integration minimizes friction