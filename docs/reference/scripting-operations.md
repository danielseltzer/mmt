# Scripting Operations Reference

## Current Status

As of now, **no file modification operations are implemented**. Scripts can:
- ✅ Select documents using the indexer
- ✅ Filter documents with custom logic
- ✅ Preview what would happen
- ❌ Actually modify files (not yet implemented)

## Defined Operations

The following operations are defined in the schema but will throw errors if executed:

### File Operations (Not Implemented)

#### `move`
Move files to a different directory.
```typescript
{ type: 'move', destination: 'archive/2023' }
```
**Status**: Requires `@mmt/file-relocator` package

#### `rename`
Rename files based on patterns or templates.
```typescript
{ type: 'rename', template: '{{date}}-{{title}}' }
```
**Status**: Requires `@mmt/file-relocator` package

#### `delete`
Delete files permanently.
```typescript
{ type: 'delete' }
```
**Status**: Requires filesystem integration

#### `updateFrontmatter`
Add, update, or remove frontmatter fields.
```typescript
{ 
  type: 'updateFrontmatter',
  updates: { status: 'archived', archived_date: '2024-01-01' }
}
```
**Status**: Requires `@mmt/document-operations` package

### Custom Operations

#### `custom`
For non-file operations like counting or analysis.
```typescript
{ type: 'custom', action: 'count' }
{ type: 'custom', action: 'list' }
```
**Status**: Can be used for read-only operations

## What Works Today

Scripts can currently:

1. **Select documents** using indexer queries:
   ```typescript
   select: { 'fm:status': 'draft' }
   select: { 'fs:path': 'projects/*' }
   select: { 'tag': 'important' }
   ```

2. **Filter documents** with custom logic:
   ```typescript
   filter: doc => doc.metadata.size > 10000
   ```

3. **Output results** in various formats:
   ```typescript
   output: { format: 'summary' }  // or 'detailed', 'csv', 'json'
   ```

4. **Preview operations** (default behavior):
   - Shows what would be done
   - Doesn't modify any files
   - Safe by default

## Example Working Script

```typescript
// This works today - counts files by type
export default class CountByType implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 'fm:type': 'daily' },
      operations: [
        { type: 'custom', action: 'count' }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}
```

## When Operations Will Work

File operations will be implemented when their required packages are built:
- Issue #8: File Relocator Package (move, rename)
- Issue #9: Document Operations Package (updateFrontmatter)
- Integration with filesystem-access (delete)

Until then, scripts are limited to read-only analysis and previewing.