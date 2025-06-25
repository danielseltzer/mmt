# Detailed Import Analysis

Generated: 2025-06-25T21:01:01.282Z

## @mmt/config imports from @mmt/entities

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | ConfigSchema | 1 |
| 📦 Named | type Config | 1 |

### Source Files:
- packages/config/src/config-service.ts

---

## @mmt/core-operations imports from @mmt/entities

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | VaultSchema | 1 |
| 📦 Named | DocumentSchema | 1 |
| 📦 Named | VaultContextSchema | 1 |
| 📦 Named |  | 1 |
| 🔷 Type | Vault | 1 |
| 🔷 Type | VaultContext | 1 |
| 🔷 Type | Document | 1 |
| 🔷 Type | DocumentSet | 1 |
| 🔷 Type | Query | 1 |
| 🔷 Type | StructuredQuery | 1 |
| 🔷 Type | VaultIndex | 1 |
| 🔷 Type |  | 1 |

### Source Files:
- packages/core-operations/src/vault-operations.ts

---

## @mmt/core-operations imports from @mmt/filesystem-access

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | NodeFileSystem | 1 |
| 📦 Named | type FileSystemAccess | 1 |

### Source Files:
- packages/core-operations/src/vault-operations.ts

---

## @mmt/core-operations imports from @mmt/query-parser

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | parseQuery | 1 |

### Source Files:
- packages/core-operations/src/vault-operations.ts

---

## @mmt/document-operations imports from @mmt/entities

Used in 5 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | Document | 5 |

### Source Files:
- packages/document-operations/src/operations/delete-operation.ts
- packages/document-operations/src/types.ts
- packages/document-operations/src/operations/move-operation.ts
- packages/document-operations/src/operations/rename-operation.ts
- packages/document-operations/src/operations/update-frontmatter.ts

---

## @mmt/document-operations imports from @mmt/filesystem-access

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | FileSystemAccess | 1 |

### Source Files:
- packages/document-operations/src/types.ts

---

## @mmt/document-operations imports from @mmt/indexer

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | VaultIndexer | 1 |

### Source Files:
- packages/document-operations/src/types.ts

---

## @mmt/indexer imports from @mmt/entities

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | QueryInput | 1 |

### Source Files:
- packages/indexer/src/types.ts

---

## @mmt/indexer imports from @mmt/filesystem-access

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | FileSystemAccess | 1 |

### Source Files:
- packages/indexer/src/vault-indexer.ts

---

## @mmt/query-parser imports from @mmt/entities

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | StructuredQuerySchema | 1 |
| 🔷 Type | QueryInput | 1 |
| 🔷 Type | StructuredQuery | 1 |

### Source Files:
- packages/query-parser/src/index.ts

---

## @mmt/scripting imports from @mmt/document-operations

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | OperationRegistry | 1 |
| 🔷 Type | OperationContext | 1 |
| 🔷 Type | OperationOptions | 1 |
| 🔷 Type | OperationResult | 1 |

### Source Files:
- packages/scripting/src/script-runner.ts

---

## @mmt/scripting imports from @mmt/entities

Used in 6 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | Document | 3 |
| 🔷 Type |  | 3 |
| 🔷 Type | ScriptExecutionResult | 3 |
| 🔷 Type | OperationPipeline | 3 |
| 🔷 Type | OperationReadyDocumentSet | 2 |
| 🔷 Type | ToDocumentSetOptions | 2 |
| 🔷 Type | ScriptOperation | 2 |
| 🔷 Type | OutputConfig | 2 |
| 🔷 Type | OutputSpec | 2 |
| 🔷 Type | ScriptContext | 2 |
| 🔷 Type | OutputFormat | 1 |
| 🔷 Type | AgentAnalysis | 1 |
| 📦 Named | OperationPipelineSchema | 1 |
| 🔷 Type | ExecutionOptions | 1 |
| 🔷 Type | ExecuteOptions | 1 |
| 🔷 Type | SelectCriteria | 1 |
| 🔷 Type | SuccessResult | 1 |
| 🔷 Type | FailureResult | 1 |
| 🔷 Type | SkippedResult | 1 |

### Source Files:
- packages/scripting/src/analysis-pipeline.ts
- packages/scripting/src/analysis-runner.ts
- packages/scripting/src/result-formatter.ts
- packages/scripting/src/markdown-report-generator.ts
- packages/scripting/src/script-runner.ts
- packages/scripting/src/script.interface.ts

---

## @mmt/scripting imports from @mmt/filesystem-access

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 🔷 Type | FileSystemAccess | 1 |

### Source Files:
- packages/scripting/src/script-runner.ts

---

## @mmt/scripting imports from @mmt/indexer

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | VaultIndexer | 1 |
| 🔷 Type | Query | 1 |
| 🔷 Type | PageMetadata | 1 |

### Source Files:
- packages/scripting/src/script-runner.ts

---

## @mmt/scripting imports from @mmt/query-parser

Used in 1 file(s)

### Imported Items:

| Type | Import | Usage Count |
|------|--------|-------------|
| 📦 Named | QueryParser | 1 |

### Source Files:
- packages/scripting/src/script-runner.ts

---

## Most Imported Items Across All Packages

| Package | Type | Import | Total Usage |
|---------|------|--------|-------------|
| @mmt/entities | 🔷 | Document | 9 |
| @mmt/entities | 🔷 |  | 4 |
| @mmt/entities | 🔷 | ScriptExecutionResult | 3 |
| @mmt/entities | 🔷 | OperationPipeline | 3 |
| @mmt/filesystem-access | 🔷 | FileSystemAccess | 3 |
| @mmt/entities | 🔷 | QueryInput | 2 |
| @mmt/entities | 🔷 | StructuredQuery | 2 |
| @mmt/entities | 🔷 | OperationReadyDocumentSet | 2 |
| @mmt/entities | 🔷 | ToDocumentSetOptions | 2 |
| @mmt/entities | 🔷 | ScriptOperation | 2 |
| @mmt/entities | 🔷 | OutputConfig | 2 |
| @mmt/entities | 🔷 | OutputSpec | 2 |
| @mmt/entities | 🔷 | ScriptContext | 2 |
| @mmt/entities | 📦 | StructuredQuerySchema | 1 |
| @mmt/entities | 🔷 | OutputFormat | 1 |
| @mmt/entities | 🔷 | AgentAnalysis | 1 |
| @mmt/entities | 📦 | OperationPipelineSchema | 1 |
| @mmt/entities | 🔷 | ExecutionOptions | 1 |
| @mmt/entities | 🔷 | ExecuteOptions | 1 |
| @mmt/entities | 🔷 | SelectCriteria | 1 |
