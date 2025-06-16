# API Documentation Strategy

## Overview

Generate a single-page API reference for scripting operations on every build using TypeScript's documentation capabilities.

## Recommended Approach: TSDoc + API Extractor

### 1. Annotate Source Code with TSDoc

```typescript
/**
 * Operation types that can be performed on documents
 * @public
 */
export const OperationTypeSchema = z.enum([
  /**
   * Move files to a different directory
   * @example
   * ```typescript
   * { type: 'move', destination: 'archive/2023' }
   * ```
   * @status Not Implemented - Requires @mmt/file-relocator
   */
  'move',
  
  /**
   * Rename files based on patterns
   * @example
   * ```typescript
   * { type: 'rename', template: '{{date}}-{{title}}' }
   * ```
   * @status Not Implemented - Requires @mmt/file-relocator
   */
  'rename',
  
  /**
   * Update frontmatter fields
   * @example
   * ```typescript
   * { type: 'updateFrontmatter', updates: { status: 'archived' } }
   * ```
   * @status Not Implemented - Requires @mmt/document-operations
   */
  'updateFrontmatter',
  
  /**
   * Delete files permanently
   * @example
   * ```typescript
   * { type: 'delete' }
   * ```
   * @status Not Implemented
   */
  'delete',
  
  /**
   * Custom operations for analysis
   * @example
   * ```typescript
   * { type: 'custom', action: 'count' }
   * ```
   * @status Available
   */
  'custom',
]);
```

### 2. Use Custom TSDoc Tags

Define custom tags for our specific needs:

```typescript
/**
 * @operationCategory File Management
 * @availability v0.2.0
 * @requiredPackages @mmt/file-relocator
 * @permissions write
 */
```

### 3. Extract with API Extractor

```json
// api-extractor.json
{
  "mainEntryPointFilePath": "<projectFolder>/dist/index.d.ts",
  "docModel": {
    "enabled": true
  },
  "apiReport": {
    "enabled": true,
    "reportFileName": "scripting-api.md"
  }
}
```

### 4. Generate on Build

```json
// package.json
{
  "scripts": {
    "build": "tsc && api-extractor run --local",
    "docs": "api-documenter markdown -i temp -o docs/api"
  }
}
```

## Alternative: TypeDoc

Simpler but less control:

```bash
# Install
pnpm add -D typedoc typedoc-plugin-markdown

# Configure
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "hideBreadcrumbs": true,
  "hideInPageTOC": true
}
```

## Custom Build Script Approach

For maximum control, parse TypeScript AST directly:

```typescript
// scripts/generate-api-docs.ts
import ts from 'typescript';
import { writeFileSync } from 'fs';

function extractOperations(sourceFile: ts.SourceFile) {
  const operations: OperationDoc[] = [];
  
  ts.forEachChild(sourceFile, node => {
    if (ts.isEnumDeclaration(node)) {
      // Extract enum members and their JSDoc
      node.members.forEach(member => {
        const jsDoc = ts.getJSDocCommentRanges(sourceFile, member.pos);
        // Parse and extract...
      });
    }
  });
  
  return operations;
}

// Generate markdown
const markdown = generateMarkdown(operations);
writeFileSync('docs/api/operations.md', markdown);
```

## Decorators Approach (Experimental)

If we enable decorators:

```typescript
@Operation({
  category: 'File Management',
  status: 'Not Implemented',
  requires: ['@mmt/file-relocator'],
  example: '{ type: "move", destination: "archive" }'
})
class MoveOperation implements ScriptOperation {
  // ...
}

// Then use reflect-metadata to extract at build time
```

## Recommended Implementation

1. **Phase 1**: Add comprehensive TSDoc comments to existing schemas
2. **Phase 2**: Set up API Extractor to generate on build
3. **Phase 3**: Create custom tags for operation-specific metadata
4. **Phase 4**: Add to build pipeline

This will generate `docs/api/scripting-operations.md` automatically on every build with:
- All available operations
- Current implementation status
- Required packages
- Code examples
- Permissions needed