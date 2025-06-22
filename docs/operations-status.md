# MMT Operations Status Report

Generated: 2025-06-16T17:04:54.526Z

## Summary

- **Total Operations**: 5
- **Implemented**: 1
- **Tested**: 0
- **Coverage**: 0%

## Script Operations

These operations can be used in MMT scripts to manipulate documents.

| Operation | Description | Status | Tests |
|-----------|-------------|--------|-------|
| `move` | Move documents to a new location | ❌ Not Implemented | ❌ None |
| `rename` | Rename documents | ❌ Not Implemented | ❌ None |
| `updateFrontmatter` | Update document frontmatter fields | ❌ Not Implemented | ❌ None |
| `delete` | Delete documents | ❌ Not Implemented | ❌ None |
| `custom` | Execute custom operations | ✅ Implemented | ❌ None |


## Query Operators

These operators can be used in selection criteria to find documents.

| Operator | Description | Examples | Status |
|----------|-------------|----------|--------|
| `fm:` | Query frontmatter fields | `fm:status=draft`<br>`fm:tags~meeting` | ✅ |
| `fs:` | Query filesystem properties | `fs:path=Daily/*`<br>`fs:name~test` | ✅ |
| `content:` | Search document content | `content:~TODO`<br>`content:"exact phrase"` | ✅ |
| `link:` | Query document links | `link:to=[[Target]]`<br>`link:from=[[Source]]` | ✅ |


## Implementation Details

### Currently Implemented

1. **Indexing** (`@mmt/indexer`)
   - Multi-index architecture for fast queries
   - Frontmatter parsing
   - Link extraction (wikilinks and markdown links)
   - Tag indexing
   - Path-based queries

2. **Scripting** (`@mmt/scripting`)
   - Script loading and execution
   - Query-based document selection
   - Safe-by-default execution (preview mode)
   - Custom operation support

3. **Configuration** (`@mmt/config`)
   - YAML-based configuration
   - Schema validation
   - Required explicit config (no defaults)

### Not Yet Implemented

1. **Document Operations** (`@mmt/operations`)
   - Move, rename, delete operations
   - Link preservation during moves
   - Bulk operations with rollback

2. **File Relocator** (`@mmt/file-relocator`)
   - Smart link updating
   - Conflict resolution
   - Undo/redo support

3. **Query Parser** (`@mmt/query-parser`)
   - Full query syntax parsing
   - Complex boolean queries
   - Query optimization

## Testing Coverage

```
packages/
├── indexer/        ✅ Full test coverage
├── scripting/      ✅ Core functionality tested
├── config/         ✅ Full test coverage
├── entities/       ✅ Schema validation tested
├── filesystem/     ✅ Basic tests
├── operations/     ❌ Not yet implemented
├── file-relocator/ ❌ Not yet implemented
└── query-parser/   ❌ Not yet implemented
```

## Next Steps

1. Implement document operations package (Issue #10)
2. Add link extraction demonstration (Issue #8)
3. Build file relocator with link preservation (Issue #11)
4. Create query parser for complex queries

---

*This report is automatically generated. To update, run `pnpm run report:operations`*
