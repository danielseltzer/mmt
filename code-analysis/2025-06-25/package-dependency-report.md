# Package Dependency Analysis

Generated: 2025-06-25T20:59:56.924Z

## 1. Package Dependency Summary

| Package | Depends On | Depended On By | Internal Files | Internal Deps |
|---------|------------|----------------|----------------|---------------|
| @mmt/entities | _none_ | @mmt/config, @mmt/core-operations, @mmt/document-operations, @mmt/indexer, @mmt/query-parser, @mmt/scripting, app:cli | 10 | 16 |
| @mmt/filesystem-access | _none_ | @mmt/core-operations, @mmt/document-operations, @mmt/indexer, @mmt/scripting, app:cli | 1 | 0 |
| @mmt/query-parser | @mmt/entities | @mmt/core-operations, @mmt/scripting, app:cli | 1 | 0 |
| @mmt/indexer | @mmt/entities, @mmt/filesystem-access | @mmt/document-operations, @mmt/scripting | 11 | 18 |
| @mmt/scripting | @mmt/document-operations, @mmt/entities, @mmt/filesystem-access, @mmt/indexer, @mmt/query-parser | app:cli | 7 | 13 |
| @mmt/document-operations | @mmt/entities, @mmt/filesystem-access, @mmt/indexer | @mmt/scripting | 7 | 15 |
| @mmt/config | @mmt/entities | app:cli | 2 | 1 |
| app:cli | @mmt/config, @mmt/entities, @mmt/filesystem-access, @mmt/query-parser, @mmt/scripting | _none_ | 8 | 10 |
| @mmt/core-operations | @mmt/entities, @mmt/filesystem-access, @mmt/query-parser | _none_ | 2 | 1 |

## 2. What Each Package Imports From Its Dependencies

### @mmt/config

**From @mmt/entities:**
- Used in 2 file(s)
- Import patterns:
  - index.ts imports from index.ts
  - config-service.ts imports from index.ts


### @mmt/core-operations

**From @mmt/entities:**
- Used in 2 file(s)
- Import patterns:
  - index.ts imports from index.ts
  - vault-operations.ts imports from index.ts

**From @mmt/filesystem-access:**
- Used in 1 file(s)
- Import patterns:
  - vault-operations.ts imports from index.ts

**From @mmt/query-parser:**
- Used in 1 file(s)
- Import patterns:
  - vault-operations.ts imports from index.ts


### @mmt/document-operations

**From @mmt/entities:**
- Used in 5 file(s)
- Import patterns:
  - delete-operation.ts imports from index.ts
  - types.ts imports from index.ts
  - move-operation.ts imports from index.ts
  - rename-operation.ts imports from index.ts
  - update-frontmatter.ts imports from index.ts

**From @mmt/filesystem-access:**
- Used in 1 file(s)
- Import patterns:
  - types.ts imports from index.ts

**From @mmt/indexer:**
- Used in 1 file(s)
- Import patterns:
  - types.ts imports from index.ts


### @mmt/indexer

**From @mmt/entities:**
- Used in 1 file(s)
- Import patterns:
  - types.ts imports from index.ts

**From @mmt/filesystem-access:**
- Used in 1 file(s)
- Import patterns:
  - vault-indexer.ts imports from index.ts


### @mmt/query-parser

**From @mmt/entities:**
- Used in 1 file(s)
- Import patterns:
  - index.ts imports from index.ts


### @mmt/scripting

**From @mmt/document-operations:**
- Used in 1 file(s)
- Import patterns:
  - script-runner.ts imports from index.ts

**From @mmt/entities:**
- Used in 7 file(s)
- Import patterns:
  - index.ts imports from index.ts
  - analysis-pipeline.ts imports from index.ts
  - analysis-runner.ts imports from index.ts
  - result-formatter.ts imports from index.ts
  - markdown-report-generator.ts imports from index.ts
  - ...(2 more)

**From @mmt/filesystem-access:**
- Used in 1 file(s)
- Import patterns:
  - script-runner.ts imports from index.ts

**From @mmt/indexer:**
- Used in 1 file(s)
- Import patterns:
  - script-runner.ts imports from index.ts

**From @mmt/query-parser:**
- Used in 1 file(s)
- Import patterns:
  - script-runner.ts imports from index.ts


### app:cli

**From @mmt/config:**
- Used in 1 file(s)
- Import patterns:
  - application-director.ts imports from index.ts

**From @mmt/entities:**
- Used in 3 file(s)
- Import patterns:
  - help-command.ts imports from index.ts
  - index.ts imports from index.ts
  - script-command.ts imports from index.ts

**From @mmt/filesystem-access:**
- Used in 1 file(s)
- Import patterns:
  - script-command.ts imports from index.ts

**From @mmt/query-parser:**
- Used in 1 file(s)
- Import patterns:
  - script-command.ts imports from index.ts

**From @mmt/scripting:**
- Used in 1 file(s)
- Import patterns:
  - script-command.ts imports from index.ts

## 3. Architecture Analysis & Recommendations

### Issues Found

✅ No major architectural issues found.

### Dependency Metrics

| Package | Afferent Coupling | Efferent Coupling | Instability |
|---------|------------------|-------------------|-------------|
| @mmt/entities | 7 | 0 | 0.00 |
| @mmt/filesystem-access | 5 | 0 | 0.00 |
| @mmt/query-parser | 3 | 1 | 0.25 |
| @mmt/indexer | 2 | 2 | 0.50 |
| @mmt/scripting | 1 | 5 | 0.83 |
| @mmt/document-operations | 1 | 3 | 0.75 |
| @mmt/config | 1 | 1 | 0.50 |
| app:cli | 0 | 5 | 1.00 |
| @mmt/core-operations | 0 | 3 | 1.00 |

**Metrics Explanation:**
- **Afferent Coupling (Ca)**: Number of packages that depend on this package
- **Efferent Coupling (Ce)**: Number of packages this package depends on
- **Instability (I)**: Ce / (Ca + Ce) - ranges from 0 (stable) to 1 (unstable)
  - 0 = Maximally stable (many depend on it, it depends on nothing)
  - 1 = Maximally unstable (nothing depends on it, it depends on many)

### Suggested Package Layers

Based on the dependency analysis, here's the suggested layered architecture:

```
Layer 0 (Core - No dependencies):
  - @mmt/entities (schemas/contracts)
  - @mmt/filesystem-access (file system abstraction)

Layer 1 (Foundation - Depends only on Layer 0):
  - @mmt/config
  - @mmt/query-parser
  - @mmt/document-set

Layer 2 (Services - Depends on Layers 0-1):
  - @mmt/indexer
  - @mmt/core-operations

Layer 3 (Operations - Depends on Layers 0-2):
  - @mmt/document-operations

Layer 4 (Applications - Can depend on all layers):
  - @mmt/scripting
  - app:cli
```
