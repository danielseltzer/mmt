# Query Namespace Design

## Overview

Queries in MMT use namespace prefixes to clearly distinguish between different sources of metadata. This solves the ambiguity problem where properties like "path" could refer to either filesystem metadata or frontmatter properties.

## Namespace Prefixes

| Prefix | Source | Example Properties |
|--------|--------|-------------------|
| `fs:` | Filesystem metadata | path, name, ext, modified, created, size |
| `fm:` | Frontmatter (YAML) | Any user-defined properties |
| `content:` | Document content | text (search), regex (pattern matching) |
| `inline:` | Inline metadata | tags (#hashtag), mentions (@user), tasks |

## Query Syntax

### User-Facing API

Users write queries using simple namespace:property strings:

```typescript
vault.select({
  'fs:path': 'posts/**/*.md',
  'fs:modified': '>2024-01-01',
  'fm:status': 'published',
  'fm:author': 'John Doe',
  'content:text': 'important update',
  'inline:tags': { $contains: '#urgent' }
});
```

### Internal Representation

The query parser transforms namespace strings into a structured format:

```typescript
{
  filesystem: {
    path: 'posts/**/*.md',
    modified: { $gt: '2024-01-01' }
  },
  frontmatter: {
    status: { $eq: 'published' },
    author: { $eq: 'John Doe' }
  },
  content: {
    text: 'important update'
  },
  inline: {
    tags: { $contains: '#urgent' }
  }
}
```

## Query Operators

Operators provide flexible matching capabilities:

```typescript
// Comparison operators
'fs:size': { $lt: '10kb' }
'fs:modified': { $gte: '2024-01-01' }
'fm:priority': { $between: [1, 5] }

// String operators
'fm:title': { $regex: '^RFC:' }
'fs:name': { $match: '*.test' }

// Array operators
'fm:tags': { $contains: 'urgent' }
'fm:tags': { $containsAll: ['urgent', 'bug'] }
'fm:tags': { $containsAny: ['feature', 'enhancement'] }

// Existence
'fm:deprecated': { $exists: true }
'fm:category': { $exists: false }

// Shorthand (string/number/boolean = exact match)
'fm:status': 'draft'  // Same as { $eq: 'draft' }
```

## Schema Definitions

### Query Input Schema (User-Facing)

```typescript
export const QueryInputSchema = z.object({
  // Sort options (special case, no namespace)
  sort: z.enum(['name', 'modified', 'created', 'size']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})
.catchall(QueryOperatorSchema) // All other properties are namespace:property
.refine(
  (obj) => {
    // Validate namespace prefixes
    const namespacePattern = /^(fs|fm|content|inline):[a-zA-Z_][a-zA-Z0-9_]*$/;
    return Object.keys(obj).every(key => 
      key === 'sort' || key === 'order' || namespacePattern.test(key)
    );
  },
  { message: 'Query properties must use namespace:property format' }
);
```

### Structured Query Schema (Internal)

```typescript
export const StructuredQuerySchema = z.object({
  filesystem: z.object({
    path: QueryOperatorSchema.optional(),
    name: QueryOperatorSchema.optional(),
    ext: QueryOperatorSchema.optional(),
    modified: QueryOperatorSchema.optional(),
    created: QueryOperatorSchema.optional(),
    size: QueryOperatorSchema.optional(),
  }).optional(),
  
  frontmatter: z.record(z.string(), QueryOperatorSchema).optional(),
  
  content: z.object({
    text: z.string().optional(),
    regex: z.string().optional(),
  }).optional(),
  
  inline: z.object({
    tags: QueryOperatorSchema.optional(),
    mentions: QueryOperatorSchema.optional(),
    tasks: QueryOperatorSchema.optional(),
  }).optional(),
  
  // Sort options
  sort: z.object({
    field: z.enum(['name', 'modified', 'created', 'size']),
    order: z.enum(['asc', 'desc']).default('asc'),
  }).optional(),
});
```

## Query Parser

The parser transforms user queries into structured queries:

```typescript
function parseQuery(input: QueryInput): StructuredQuery {
  const structured: StructuredQuery = {};
  
  for (const [key, value] of Object.entries(input)) {
    if (key === 'sort' || key === 'order') {
      // Handle sort options
      structured.sort = { 
        field: input.sort, 
        order: input.order || 'asc' 
      };
      continue;
    }
    
    // Parse namespace:property
    const [namespace, property] = key.split(':');
    
    switch (namespace) {
      case 'fs':
        structured.filesystem ??= {};
        structured.filesystem[property] = value;
        break;
      case 'fm':
        structured.frontmatter ??= {};
        structured.frontmatter[property] = value;
        break;
      case 'content':
        structured.content ??= {};
        structured.content[property] = value;
        break;
      case 'inline':
        structured.inline ??= {};
        structured.inline[property] = value;
        break;
    }
  }
  
  return structured;
}
```

## Examples

### Basic Queries

```typescript
// Find all draft posts
vault.select({
  'fs:path': 'posts/**',
  'fm:status': 'draft'
});

// Find recently modified large files
vault.select({
  'fs:modified': '>7d',
  'fs:size': { $gt: '1mb' }
});

// Search content with specific frontmatter
vault.select({
  'content:text': 'breaking change',
  'fm:tags': { $contains: 'api' },
  'fm:version': { $exists: true }
});
```

### Complex Queries

```typescript
// Find orphaned images mentioned in drafts
vault.select({
  'fs:path': 'images/**',
  'fs:ext': { $in: ['.png', '.jpg', '.svg'] },
  'inline:mentions': { $exists: false }
}).intersect(
  vault.select({
    'fs:path': 'posts/**',
    'fm:status': 'draft',
    'content:regex': '!\\[.*\\]\\(.*\\)'
  })
);

// Archive old completed tasks
vault.select({
  'inline:tasks': { 
    $contains: { checked: true } 
  },
  'fs:modified': { $lt: '90d' },
  'fm:archived': { $exists: false }
})
.updateMetadata({ 
  'archived': new Date(),
  'archivedFrom': 'task-cleanup' 
})
.move('archive/tasks/');
```

## Benefits

1. **Clarity** - No ambiguity about which "path" or "modified" you mean
2. **Extensibility** - Easy to add new namespaces (e.g., `git:author`, `ai:summary`)
3. **Validation** - Can validate properties per namespace
4. **Consistency** - Same pattern works for all metadata sources
5. **Intuitive** - Namespace prefix clearly indicates the source

## Future Extensions

Potential namespaces to add later:

- `git:` - Git metadata (author, commit, branch)
- `ai:` - AI-generated metadata (summary, sentiment, topics)
- `link:` - Link graph metadata (backlinks, outlinks)
- `compute:` - Computed properties (wordCount, readTime)