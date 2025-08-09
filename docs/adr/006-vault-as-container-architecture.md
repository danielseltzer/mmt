# ADR-006: Vault as Container Architecture

## Status
Accepted

## Context
MMT V3 introduces support for multiple vaults (markdown document collections) that users can work with simultaneously in a tab-based interface. Each vault represents a different data source with its own configuration, indexing, and state.

The initial implementation (Issue #156) added multi-vault configuration support but used a "first vault as default" pattern to minimize code changes. Issue #186 requires establishing a proper architectural pattern for vault context that will:
- Flow through all API operations as a first-class concept
- Become part of the domain language that future agents will understand
- Provide clear, consistent vault identification throughout the system
- Avoid ad-hoc parameter passing of vault IDs

## Decision Drivers
1. **Services are stateful**: Indexer, file watcher, and similarity search maintain vault-specific state
2. **Performance requirements**: Must support 5000+ files per vault with fast indexing
3. **Multi-vault operations**: System must handle multiple vaults simultaneously
4. **Clear domain model**: Architecture must be understandable by future AI agents
5. **Fail-fast principle**: Invalid vault operations should fail immediately with clear errors

## Considered Options

### Option 1: Context Parameter Passing
Pass a `VaultContext` object as the first parameter to every function:
```typescript
interface VaultContext {
  vaultId: string;
  vault: VaultConfig;
}
indexer.query(context, query);
service.search(context, filters);
```

**Pros:**
- Explicit context at every call site
- Stateless services possible
- Easy to trace vault usage

**Cons:**
- Verbose API with context everywhere
- Services are inherently stateful (indexer, watcher)
- Doesn't reflect the true domain model

### Option 2: Dependency Injection
Inject vault context when constructing services:
```typescript
const indexer = new VaultIndexer(vaultContext);
indexer.query(query); // context already bound
```

**Pros:**
- Cleaner API without context parameters
- Services maintain their vault association

**Cons:**
- Need service factory or registry
- Unclear service lifecycle management
- Still treats context as separate from vault

### Option 3: Vault as Container (Chosen)
Make Vault the primary domain object that owns all vault-specific services:
```typescript
interface Vault {
  id: string;
  config: VaultConfig;
  indexer: VaultIndexer;
  watcher?: FileWatcher;
  similaritySearch?: SimilaritySearchService;
}
```

**Pros:**
- Vault is the first-class domain concept
- Clear ownership of stateful services
- Natural service lifecycle (tied to vault)
- Clean API: `vault.indexer.query(query)`
- Matches mental model: "a vault has an indexer"

**Cons:**
- Requires vault registry for management
- Services must be vault-aware at construction

## Decision
We will implement **Option 3: Vault as Container** with a singleton VaultRegistry to manage all vaults.

### Architecture Details

#### 1. Package Structure
Create new package `@mmt/vault` as the central domain package:
```
packages/vault/
├── src/
│   ├── types.ts      // Vault interface
│   ├── vault.ts      // Vault implementation
│   ├── registry.ts   // VaultRegistry singleton
│   └── index.ts      // Public exports
```

#### 2. Core Interfaces
```typescript
interface Vault {
  id: string;
  config: VaultConfig;
  status: 'initializing' | 'ready' | 'error';
  indexer?: VaultIndexer;
  watcher?: FileWatcher;
  similaritySearch?: SimilaritySearchService;
  error?: Error;
}

class VaultRegistry {
  private static instance: VaultRegistry;
  private vaults: Map<string, Vault>;
  
  static getInstance(): VaultRegistry;
  async initializeVaults(config: Config): Promise<void>;
  getVault(id: string): Vault;
  getAllVaults(): Vault[];
}
```

#### 3. Initialization Strategy
- **Default vault**: Synchronous initialization at startup (blocking)
- **Additional vaults**: Asynchronous initialization immediately after default
- **File watchers**: Start for ALL vaults after indexing completes
- **Similarity search**: Background initialization, starting with default vault
- **Error handling**: Fail fast on initialization errors

#### 4. API Layer Integration
Use URL path pattern for vault identification:
```
GET  /api/vaults/:vaultId/documents
POST /api/vaults/:vaultId/operations/rename
GET  /api/vaults/:vaultId/search
```

Benefits:
- RESTful design with vault as resource
- Explicit vault requirement (cannot be forgotten)
- Clear hierarchy for nested resources
- Better HTTP caching semantics

#### 5. Service Access Pattern
```typescript
// Instead of passing context everywhere:
// indexer.query(context, query)

// Services are accessed through vault:
const vault = vaultRegistry.getVault(vaultId);
const results = await vault.indexer.query(query);
```

## Consequences

### Positive
- **Clear domain model**: Vault is the central concept that owns services
- **Simplified API**: No context parameter proliferation
- **Natural lifecycle**: Services live and die with their vault
- **Better encapsulation**: Vault-specific state contained within vault
- **AI-friendly**: Clear structure for future agents to understand
- **Type safety**: TypeScript ensures vault exists before service access

### Negative
- **Registry complexity**: Need singleton registry management
- **Migration effort**: Existing code must be refactored to use vaults
- **Memory usage**: Each vault maintains its own service instances
- **Startup time**: Multiple vaults mean multiple initializations

### Neutral
- API routes must include vault ID (more explicit but longer)
- Services must be designed to be vault-specific from construction
- Background operations need vault reference

## Implementation Notes

1. **Singleton Registry**: Use module-level instance to ensure single registry
2. **Lazy Loading**: Consider lazy initialization for rarely-used vaults
3. **Resource Cleanup**: Implement proper cleanup when vaults are closed
4. **Error Boundaries**: Each vault's errors shouldn't affect others
5. **Monitoring**: Track per-vault metrics and performance

## References
- Issue #186: Establish vault context as first-class domain concept
- Issue #156: Multi-vault configuration support
- MMT V3 Planning: `/docs/planning/PRD-v3.md`
- Engineering Principles: `/docs/building/principles.md`