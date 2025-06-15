# Dependency Injection Strategy

## Overview

MMT uses constructor injection with Zod schema-based configuration objects. This approach provides type safety, explicit dependencies, and clear contracts between packages.

## Core Principles

1. **Constructor Injection**: All dependencies are passed through constructors
2. **Schema-Based Configs**: Package dependencies are defined as Zod schemas
3. **No Dependency Frameworks**: Manual wiring only, no IoC containers
4. **Application Director Pattern**: Single orchestration point for wiring

## Architecture

### Application Director

The Application Director is a lean orchestrator that:
- Parses command-line arguments
- Loads and validates configuration
- Creates package-specific config objects
- Wires up all dependencies
- Routes to appropriate handlers (script, GUI, etc.)

```typescript
class ApplicationDirector {
  async run(args: string[]) {
    // 1. Parse command line
    const { configPath, command, ...options } = parseArgs(args);
    
    // 2. Load user config (no dependencies needed)
    const configService = new ConfigService();
    const config = await configService.load(configPath);
    
    // 3. Create app context
    const context: AppContext = { config };
    
    // 4. Wire dependencies with explicit configs
    const fs = new NodeFileSystem();
    
    const indexerConfig: IndexerConfig = {
      indexPath: config.indexPath,
      vaultPath: config.vaultPath,
    };
    const indexer = new VaultIndexer(indexerConfig, fs);
    
    // 5. Route to handlers
    // ... handle different commands
  }
}
```

### Package Config Schemas

Each package defines its configuration requirements as a Zod schema:

```typescript
// @mmt/indexer/src/config.ts
export const IndexerConfigSchema = z.object({
  indexPath: z.string().describe('Path to index database'),
  vaultPath: z.string().describe('Path to vault to index'),
});

export type IndexerConfig = z.infer<typeof IndexerConfigSchema>;

// @mmt/indexer/src/indexer.ts
export class VaultIndexer {
  constructor(
    private config: IndexerConfig,
    private fs: FileSystemAccess
  ) {}
}
```

### Dependency Flow

```
CLI Arguments
    ↓
Application Director
    ├─→ ConfigService (no deps)
    │      ↓
    │   User Config
    │      ↓
    ├─→ AppContext { config }
    │
    ├─→ IndexerConfig → VaultIndexer
    ├─→ ScriptConfig → ScriptRunner
    └─→ QueryConfig → QueryParser
```

## Patterns

### 1. Config Service (No Dependencies)

The config package is special - it has no dependencies:

```typescript
export class ConfigService {
  // No constructor dependencies
  async load(configPath: string): Promise<Config> {
    // Validate path is absolute
    // Read YAML file
    // Validate against schema
    // Check paths exist
    // Return validated config
  }
}
```

### 2. Standard Package Pattern

Most packages follow this pattern:

```typescript
// Define what you need
export const PackageConfigSchema = z.object({
  someValue: z.string(),
  anotherValue: z.number(),
});

// Accept config + services
export class PackageService {
  constructor(
    private config: PackageConfig,
    private fs: FileSystemAccess,
    private otherService: OtherService
  ) {}
}
```

### 3. Script Usage

Minimal scripts can use packages directly:

```typescript
// script.ts
const config = await new ConfigService().load('./config.yaml');

const indexerConfig = {
  indexPath: config.indexPath,
  vaultPath: config.vaultPath,
};

const indexer = new VaultIndexer(indexerConfig, new NodeFileSystem());
await indexer.initialize();

const results = await indexer.query({ pattern: '*.md' });
```

## Benefits

1. **Type Safety**: Zod schemas provide compile-time and runtime safety
2. **Explicit Dependencies**: Clear what each package needs
3. **Testability**: Easy to test with real implementations
4. **No Magic**: Everything is explicit and traceable
5. **Script-Friendly**: Works naturally in minimal scripts
6. **Extensible**: Easy to add new fields to configs

## Example: Adding a New Package

1. Define config schema:
```typescript
export const ReportsConfigSchema = z.object({
  outputPath: z.string(),
  format: z.enum(['json', 'markdown', 'html']),
});
```

2. Create service with constructor injection:
```typescript
export class ReportsService {
  constructor(
    private config: ReportsConfig,
    private fs: FileSystemAccess,
    private indexer: VaultIndexer
  ) {}
}
```

3. Wire in Application Director:
```typescript
const reportsConfig: ReportsConfig = {
  outputPath: config.reportsPath,
  format: 'markdown',
};
const reports = new ReportsService(reportsConfig, fs, indexer);
```

## Testing

Constructor injection with real implementations:

```typescript
it('should index vault', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'mmt-test-'));
  
  const config: IndexerConfig = {
    indexPath: join(tempDir, 'index.db'),
    vaultPath: tempDir,
  };
  
  const fs = new NodeFileSystem();
  const indexer = new VaultIndexer(config, fs);
  
  // Test with real files
  await fs.writeFile(join(tempDir, 'test.md'), '# Test');
  await indexer.initialize();
  
  const results = await indexer.query({ pattern: '*.md' });
  expect(results).toHaveLength(1);
});
```

## Anti-Patterns to Avoid

1. ❌ **God Context**: Don't put everything in AppContext
2. ❌ **Service Locator**: Don't use `context.getService('indexer')`
3. ❌ **Hidden Dependencies**: Don't use singletons or global state
4. ❌ **Framework Magic**: No decorators or reflection
5. ❌ **Individual Parameters**: Use config schemas, not loose parameters