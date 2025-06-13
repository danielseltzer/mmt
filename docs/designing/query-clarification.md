# Query Property Clarification

## The Problem

When querying documents, there's ambiguity between filesystem properties and frontmatter properties:

```typescript
vault.select({ 
  path: 'posts/**',      // Filesystem path or frontmatter.path?
  has: ['status'],       // Clearly frontmatter
  modified: '>2024-01-01' // Filesystem or frontmatter.modified?
});
```

## Proposed Solutions

### Option 1: Namespace Prefixes

Use prefixes to distinguish property types:

```typescript
vault.select({
  'fs.path': 'posts/**',          // Filesystem path
  'fs.modified': '>2024-01-01',    // File modification time
  'fm.status': 'published',        // Frontmatter property
  'fm.path': '/old/location',      // Frontmatter path property
});
```

### Option 2: Separate Query Sections

Structure the query with explicit sections:

```typescript
vault.select({
  filesystem: {
    path: 'posts/**',
    modified: { after: '2024-01-01' },
    size: { max: 10000 }
  },
  frontmatter: {
    status: 'published',
    author: 'John',
    has: ['category', 'tags']
  },
  content: {
    text: 'search terms',
    regex: '/TODO|FIXME/i'
  }
});
```

### Option 3: Reserved Keywords (Recommended)

Define reserved keywords for filesystem properties, everything else is frontmatter:

```typescript
// Reserved filesystem keywords:
// - $path (filesystem path)
// - $name (filename without extension)  
// - $modified (file modification date)
// - $created (file creation date)
// - $size (file size in bytes)
// - $ext (file extension)

vault.select({
  $path: 'posts/**',           // Filesystem path
  $modified: '>2024-01-01',    // File modification date
  status: 'published',         // Frontmatter property
  author: 'John',             // Frontmatter property
  path: '/old/location'        // Frontmatter property named 'path'
});
```

## Updated Query Schema

```typescript
export const QuerySchema = z.object({
  // Filesystem properties ($ prefix)
  $path: z.string().optional().describe('Filesystem path pattern'),
  $name: z.string().optional().describe('Filename pattern'),
  $modified: z.string().optional().describe('File modification date filter'),
  $created: z.string().optional().describe('File creation date filter'),
  $size: z.string().optional().describe('File size filter'),
  $ext: z.string().optional().describe('File extension'),
  
  // Content search
  $text: z.string().optional().describe('Full-text search in content'),
  $regex: z.string().optional().describe('Regex search in content'),
  
  // Frontmatter queries (no prefix)
  // Any other properties are treated as frontmatter queries
}).catchall(z.unknown()).describe('Query with filesystem and frontmatter filters');
```

## Examples with Clarified Syntax

```typescript
// Find all draft posts modified in the last 30 days
const recentDrafts = vault.select({
  $path: 'posts/**',
  $modified: '>30d',    // Supports relative dates
  status: 'draft'       // Frontmatter property
});

// Find documents with a frontmatter 'path' property
const withPathProperty = vault.select({
  path: { $exists: true }  // Frontmatter.path exists
});

// Complex query mixing filesystem and frontmatter
const complex = vault.select({
  $path: 'projects/**/README.md',
  $size: '<10kb',
  $modified: '2024-*',
  priority: 'high',
  tags: { $contains: 'urgent' },
  assignee: { $exists: true }
});
```

## Query Operators

For more complex queries, support operators:

```typescript
{
  // Comparison operators
  $modified: { $gt: '2024-01-01' },
  $size: { $lte: 10000 },
  wordCount: { $between: [1000, 5000] },
  
  // Array operators
  tags: { $contains: 'urgent' },
  tags: { $containsAll: ['urgent', 'bug'] },
  tags: { $containsAny: ['feature', 'enhancement'] },
  
  // Existence
  category: { $exists: true },
  deprecated: { $exists: false },
  
  // Pattern matching
  $name: { $match: '*.test.md' },
  title: { $regex: '^RFC:' }
}
```

## Benefits of $ Prefix Approach

1. **Clear distinction** - $ immediately signals filesystem property
2. **No ambiguity** - `path` is always frontmatter, `$path` is always filesystem
3. **Familiar pattern** - Similar to MongoDB, jQuery
4. **Extensible** - Can add new $ properties without breaking changes
5. **Simple parsing** - Easy to separate filesystem from frontmatter queries