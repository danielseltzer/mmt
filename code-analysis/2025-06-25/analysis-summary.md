# Dependency Analysis Summary - 2025-06-25

## Overview

- Total Modules Analyzed: 83
- Total Violations: 64
- Errors: 57
- Warnings: 0
- Info: 7

## Violation Details

### package-dependency-only-through-entities (57 violations)

| From | To |
|------|----|
| packages/config/src/index.ts | packages/config/src/config-service.ts |
| packages/core-operations/src/index.ts | packages/core-operations/src/vault-operations.ts |
| packages/core-operations/src/vault-operations.ts | packages/filesystem-access/src/index.ts |
| packages/core-operations/src/vault-operations.ts | packages/query-parser/src/index.ts |
| packages/document-operations/src/core/operation-registry.ts | packages/document-operations/src/operations/delete-operation.ts |
| packages/document-operations/src/core/operation-registry.ts | packages/document-operations/src/operations/move-operation.ts |
| packages/document-operations/src/core/operation-registry.ts | packages/document-operations/src/operations/rename-operation.ts |
| packages/document-operations/src/core/operation-registry.ts | packages/document-operations/src/operations/update-frontmatter.ts |
| packages/document-operations/src/core/operation-registry.ts | packages/document-operations/src/types.ts |
| packages/document-operations/src/index.ts | packages/document-operations/src/core/operation-registry.ts |

_...and 47 more violations_

### apps-can-depend-on-packages (7 violations)

| From | To |
|------|----|
| apps/cli/src/application-director.ts | packages/config/src/index.ts |
| apps/cli/src/commands/help-command.ts | packages/entities/src/index.ts |
| apps/cli/src/commands/index.ts | packages/entities/src/index.ts |
| apps/cli/src/commands/script-command.ts | packages/entities/src/index.ts |
| apps/cli/src/commands/script-command.ts | packages/filesystem-access/src/index.ts |
| apps/cli/src/commands/script-command.ts | packages/query-parser/src/index.ts |
| apps/cli/src/commands/script-command.ts | packages/scripting/src/index.ts |

## Visualizations

- [Architecture Overview](./dependency-graph/dependency-architecture.svg)
- [Detailed Dependencies](./dependency-graph/dependency-detailed.svg)
- [Folder Structure](./dependency-graph/dependency-folder.svg)
- [PDF Report](./dependency-graph/dependency-graph.pdf)
