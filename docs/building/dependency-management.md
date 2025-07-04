# Dependency Management Architecture

This document describes the dependency management patterns and practices used in the MMT project. These patterns have resulted in a clean, maintainable architecture with clear separation of concerns and easily traceable dependencies.

## Core Design Goals

### 1. Schema-Driven Architecture
- **Central Schema Package**: All shared data contracts live in `@mmt/entities` as Zod schemas
- **No Direct Implementation Dependencies**: Packages depend only on schemas, never on other packages' implementations
- **Runtime Validation**: All data crossing package boundaries is validated against schemas
- **Type Inference**: TypeScript types are derived from schemas, ensuring a single source of truth

### 2. Unidirectional Dependency Flow
Our architecture enforces strict layered dependencies:

```
Layer 0 (Core): entities, filesystem-access
Layer 1 (Foundation): config, query-parser, document-set
Layer 2 (Services): indexer, core-operations
Layer 3 (Operations): document-operations
Layer 4 (Applications): cli, electron apps
```

Dependencies flow upward only - higher layers can depend on lower layers, but never the reverse.

### 3. Zero Circular Dependencies
- Enforced through dependency-cruiser rules
- Violations cause build failures
- Regular analysis to detect issues early

### 4. Infrastructure Isolation
- All file system operations go through `@mmt/filesystem-access`
- External dependencies are centralized in dedicated packages
- Easy to swap implementations (e.g., for cloud storage)

## Implementation Patterns

### Package Structure
```typescript
// Each package has:
// - Single responsibility
// - Clear public API in index.ts
// - Manual dependency injection (no DI frameworks)
// - Dependencies passed as constructor parameters

// Example from config package:
export class ConfigService {
  constructor(private fs: FileSystemAccess) {}
  
  async loadConfig(path: string): Promise<Config> {
    // Implementation using injected filesystem
  }
}
```

### Communication Rules
1. **Schema-Based Contracts**: Packages communicate through Zod schemas
2. **Type-Safe IPC**: Using electron-trpc with Zod schemas for main-renderer communication
3. **Event-Driven UI**: UI components emit events rather than executing operations directly
4. **Validation at Boundaries**: All inputs validated when entering a package

### Testing Philosophy
- **NO MOCKS Policy**: Test only with real implementations
- **Temp Directory Testing**: Use OS temp directories for file operations
- **Integration Focus**: Test behavior across package boundaries
- **Dependency Injection for Testing**: Pass real implementations, not mocks

### Configuration Management
- **No Defaults**: All configuration must be explicit via `--config` flag
- **Schema Validation**: Config validated with Zod schemas
- **Fail Fast**: Exit immediately on invalid configuration
- **Type Safety**: Configuration types derived from schemas

## Dependency Analysis Tools

### 1. dependency-cruiser Configuration
Our `.dependency-cruiser.cjs` enforces:
- No circular dependencies
- Layered architecture rules
- Package boundary restrictions
- Infrastructure isolation

### 2. Analysis Scripts
```bash
# Run comprehensive dependency analysis
npm run analyze

# Outputs:
# - code-analysis/YYYY-MM-DD/dependency-graph/*.svg (multiple views)
# - code-analysis/YYYY-MM-DD/package-dependency-report.md
# - code-analysis/YYYY-MM-DD/analysis-summary.md
```

### 3. Visualization Types
- **Architecture View**: High-level package relationships
- **Detailed View**: All file-level dependencies
- **Folder View**: Dependencies grouped by folders
- **Layer View**: Custom visualization showing architectural layers

### 4. Key Metrics
- **Afferent Coupling (Ca)**: Number of packages depending on this package
- **Efferent Coupling (Ce)**: Number of packages this package depends on
- **Instability (I)**: Ce / (Ca + Ce) - measures likelihood of change
- **Layer Violations**: Dependencies that break architectural rules

## Best Practices

### 1. When Creating New Packages
- Define clear single responsibility
- Create schemas in `@mmt/entities` first
- Expose minimal public API
- Document dependencies in package.json

### 2. When Adding Dependencies
- Check if dependency maintains unidirectional flow
- Run `npm run analyze` to verify no violations
- Consider if dependency belongs in current layer
- Update architecture documentation if needed

### 3. Regular Maintenance
- Run dependency analysis before each PR
- Review coupling metrics quarterly
- Refactor high-instability packages
- Keep dependency graph documentation updated

## Common Patterns

### Provider Pattern with Fallbacks
```typescript
// In config package
export interface ConfigProvider {
  loadConfig(path: string): Promise<Config>;
}

// Multiple implementations with fallback chain
const providers = [
  new YamlConfigProvider(fs),
  new JsonConfigProvider(fs),
  new DefaultConfigProvider()
];
```

### Event-Driven Communication
```typescript
// UI emits events
ipcRenderer.send('index:start', { paths });

// Main process handles via tRPC
export const indexerRouter = router({
  start: procedure
    .input(IndexerStartSchema)
    .mutation(async ({ input }) => {
      return indexer.start(input);
    })
});
```

### Schema-First Development
```typescript
// 1. Define schema in entities
export const DocumentSchema = z.object({
  id: z.string(),
  path: z.string(),
  content: z.string(),
  metadata: MetadataSchema
});

// 2. Derive types
export type Document = z.infer<typeof DocumentSchema>;

// 3. Use in packages
export class DocumentService {
  async getDocument(id: string): Promise<Document> {
    const doc = await this.loadDocument(id);
    return DocumentSchema.parse(doc); // Runtime validation
  }
}
```

## Troubleshooting

### Issue: Circular Dependency Detected
1. Run `npm run analyze` to identify the cycle
2. Review the dependency graph SVG
3. Refactor to break the cycle (usually by extracting shared code to entities)

### Issue: Layer Violation
1. Check which package is violating layer rules
2. Consider if the dependency is necessary
3. Move functionality to appropriate layer
4. Update dependency-cruiser rules if architecture change is intentional

### Issue: High Coupling Metrics
1. Review packages with high efferent coupling (Ce > 5)
2. Consider breaking apart large packages
3. Extract common functionality to shared packages
4. Ensure packages have single responsibility

## Architecture Evolution

Our dependency management approach supports evolution through:
1. **Historical Analysis**: Date-versioned analysis results track changes
2. **Metrics Tracking**: Monitor coupling metrics over time
3. **Automated Validation**: CI/CD runs dependency checks
4. **Clear Migration Paths**: Schema versioning enables gradual updates

This architecture has proven effective for maintaining clarity and preventing architectural decay as the codebase grows.