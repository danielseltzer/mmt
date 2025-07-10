# Documentation Strategy: Pros and Cons

## Option 1: Static Documentation (Current Approach)

### Pros:
- **Immediate availability** - Can create comprehensive docs right now
- **Human-friendly** - Can organize and structure for optimal learning
- **Examples-focused** - Can provide rich, contextual examples
- **No tooling required** - Just markdown files

### Cons:
- **Gets outdated** - Must manually sync with code changes
- **Duplication** - Same information in code and docs
- **Maintenance burden** - Extra work to keep current
- **No validation** - Examples might break without notice

## Option 2: Extractable Documentation from Source

### Pros:
- **Always current** - Extracted directly from implementation
- **Single source of truth** - Documentation lives with code
- **Type-safe examples** - Can validate examples compile
- **Auto-generated API docs** - Tools like TypeDoc work out of the box
- **IDE integration** - JSDoc comments show in tooltips

### Cons:
- **Tooling required** - Need documentation generator
- **Limited formatting** - Constrained by comment syntax
- **Scattered docs** - Information spread across files
- **Less narrative** - Harder to tell a cohesive story

## Recommended Hybrid Approach

### 1. JSDoc + Custom Tags for API Documentation

```typescript
/**
 * @description Execute operations conditionally based on document properties
 * @category Advanced Operations
 * @example
 * ```typescript
 * {
 *   type: 'conditional',
 *   condition: (doc) => doc.metadata.size > 1000,
 *   then: { type: 'updateFrontmatter', updates: { large: true } },
 *   else: { type: 'updateFrontmatter', updates: { large: false } }
 * }
 * ```
 * @since 0.2.0
 */
export interface ConditionalOperation {
  // ...
}
```

### 2. Dedicated Example Files

```typescript
// examples/conditional-operations.example.ts
// @doc-example: Conditional Operations
// @doc-description: Process files differently based on their properties

import { mmt } from '@mmt/scripting';

export const example = mmt()
  .query('status:draft')
  .conditional(
    doc => doc.metadata.size > 1000000,
    operations().moveToFolder('large-drafts').build()[0],
    operations().addTag('small-draft').build()[0]
  )
  .build();
```

### 3. Extraction Script

```typescript
// tools/extract-docs.ts
import { Project } from 'ts-morph';
import { extractExamples } from './doc-extractor';

// Extract from source files
const examples = extractExamples('packages/*/src/**/*.ts');
const apiDocs = extractApiDocs('packages/*/src/**/*.ts');

// Generate cheat sheet
generate.cheatSheet({
  examples,
  apiDocs,
  output: 'SCRIPTING_CHEATSHEET.md'
});
```

### 4. Custom Doc Tags

```typescript
/**
 * @mmt-cheatsheet
 * @mmt-category "Error Handling"
 * @mmt-priority 1
 * @mmt-example
 * ```typescript
 * // Gracefully handle risky operations
 * {
 *   type: 'try-catch',
 *   try: { type: 'move', targetPath: '/risky/path' },
 *   catch: { type: 'updateFrontmatter', updates: { error: true } }
 * }
 * ```
 */
```

## Implementation Plan

1. **Phase 1**: Create static cheat sheet (✅ Done)
2. **Phase 2**: Add JSDoc comments to all public APIs
3. **Phase 3**: Create example files with extractable metadata
4. **Phase 4**: Build extraction tool to generate docs
5. **Phase 5**: Add to CI/CD to ensure docs stay current

## Benefits of Hybrid Approach

- **Best of both worlds** - Immediate docs + future automation
- **Progressive enhancement** - Start simple, add tooling later
- **Multiple audiences** - Cheat sheet for users, JSDoc for developers
- **Validation** - Can test that examples actually work
- **Versioning** - Can generate docs for different versions
