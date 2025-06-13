# MMT Language Specification

## Overview

MMT is fundamentally a domain-specific language for operating on collections of markdown documents. This specification defines the complete vocabulary of objects, operations, and rules that comprise the MMT language.

## Core Principle

Every user action in MMT can be expressed as a sequence of operations from this language. The UI is merely a way to construct and execute these operations. This ensures:

1. **Conceptual Integrity**: All features use the same underlying model
2. **Predictability**: Operations have clear, composable semantics  
3. **Testability**: We can verify the language independent of UI
4. **Extensibility**: New features compose existing operations

## Objects (Nouns)

### 1. Document
A single markdown file with its metadata and content.

```typescript
type Document = {
  path: string;              // Absolute path
  content: string;           // Raw markdown content
  metadata: {
    name: string;            // Filename without extension
    modified: Date;          // Last modified
    size: number;            // File size in bytes
    frontmatter: Record<string, unknown>;
    tags: string[];          // Extracted from frontmatter/content
    links: string[];         // Outgoing [[wiki-links]]
  };
};
```

### 2. DocumentSet
An immutable collection of documents, created by queries or operations.

```typescript
type DocumentSet = {
  id: string;                // Unique identifier
  documents: Document[];     // The documents in this set
  source: Query | Operation; // How this set was created
};
```

### 3. Query
A declarative filter specification (GitHub-style).

```typescript
type Query = {
  text?: string;       // Full-text search
  path?: string;       // Path glob pattern
  tag?: string[];      // Has all listed tags
  has?: string[];      // Has properties in frontmatter
  is?: string[];       // State filters (e.g., 'draft')
  sort?: SortField;    // Sort order
};
```

### 4. Operation
An atomic transformation that can be applied to documents.

```typescript
type Operation = 
  | { type: 'move'; from: string; to: string; }
  | { type: 'update-metadata'; path: string; updates: Partial<Metadata>; }
  | { type: 'delete'; path: string; }
  | { type: 'create'; path: string; content: string; metadata?: Partial<Metadata>; };
```

### 5. Vault
The complete state of all documents at a point in time.

```typescript
type Vault = {
  basePath: string;           // Root directory
  documents: Map<string, Document>; // Path -> Document
  index: VaultIndex;          // Derived search structures
};
```

## Operations (Verbs)

### Query Operations

#### `select(vault: Vault, query: Query): DocumentSet`
Select documents matching a query.

**Rules:**
- Returns immutable DocumentSet
- Empty query selects all documents
- Query fields are ANDed together

**Example:**
```typescript
const drafts = select(vault, { tag: ['draft'], path: 'posts/**' });
```

#### `union(sets: DocumentSet[]): DocumentSet`
Combine multiple document sets.

#### `intersect(sets: DocumentSet[]): DocumentSet`
Find documents present in all sets.

#### `difference(set1: DocumentSet, set2: DocumentSet): DocumentSet`
Documents in set1 but not in set2.

### Transformation Operations

#### `move(vault: Vault, documents: DocumentSet, destination: string): Operation[]`
Generate move operations for a document set.

**Rules:**
- Maintains link integrity (updates [[wiki-links]])
- Preserves frontmatter
- Creates destination directory if needed
- Returns operations, doesn't execute them

**Example:**
```typescript
const ops = move(vault, drafts, 'archive/2024/');
```

#### `updateMetadata(documents: DocumentSet, updates: Partial<Metadata>): Operation[]`
Generate metadata update operations.

**Rules:**
- Merges with existing frontmatter by default
- Can specify replace mode
- Validates frontmatter remains valid YAML

#### `bulkCreate(specs: Array<{path: string, content: string}>): Operation[]`
Generate creation operations for multiple documents.

### Execution Operations

#### `execute(vault: Vault, operations: Operation[]): Result<Vault>`
Apply operations to create a new vault state.

**Rules:**
- Operations are atomic - all succeed or all fail
- Returns new Vault (immutable)
- Validates all operations before executing
- Maintains referential integrity

**Example:**
```typescript
const result = execute(vault, ops);
if (result.success) {
  vault = result.value; // New vault state
}
```

#### `snapshot(vault: Vault, operations: Operation[]): Snapshot`
Create a restorable backup before operations.

**Rules:**
- Uses hard links for efficiency
- Captures vault state + operations
- Can be restored later

### Analysis Operations

#### `analyze(documents: DocumentSet): Analysis`
Compute aggregate statistics.

```typescript
type Analysis = {
  count: number;
  totalSize: number;
  tags: Map<string, number>;      // Tag frequency
  properties: Set<string>;         // All frontmatter keys
  brokenLinks: Array<{from: string, to: string}>;
};
```

#### `findBrokenLinks(vault: Vault): Array<BrokenLink>`
Find all broken [[wiki-links]].

#### `findOrphans(vault: Vault): DocumentSet`
Find documents with no incoming links.

## Composition Rules

### 1. Immutability
All operations return new objects, never mutate existing ones.

```typescript
// Good: Returns new vault
const newVault = execute(vault, operations);

// Bad: Would mutate vault
vault.execute(operations); // ❌ Not allowed
```

### 2. Operation Pipelines
Operations can be composed into pipelines:

```typescript
// Select → Transform → Execute
const drafts = select(vault, { tag: ['draft'] });
const moves = move(vault, drafts, 'published/');
const result = execute(vault, moves);
```

### 3. Transactional Semantics
Operations either fully succeed or fully fail:

```typescript
const ops = [
  move(vault, doc1, 'path1/'),
  move(vault, doc2, 'path2/'),
  updateMetadata(doc3, { status: 'published' })
];

const result = execute(vault, ops);
// Either all 3 succeed, or none do
```

### 4. Lazy Evaluation
Queries and transformations are descriptions, not executions:

```typescript
// This doesn't touch the filesystem
const ops = move(vault, documents, 'archive/');

// This actually performs the operations
const result = execute(vault, ops);
```

## Constraints

### 1. Path Safety
- All paths must be within vault
- No traversal outside vault (../.. attacks)
- Paths are normalized and validated

### 2. Link Integrity
- Moving documents updates all references
- Broken links are tracked but allowed
- Link updates are part of move operations

### 3. Atomicity
- No partial operations
- Filesystem operations use temp + rename
- Rollback on any failure

### 4. Performance Bounds
- Operations on DocumentSets are O(n) in document count
- Index updates are incremental where possible
- Hard links for snapshots (O(1) backup)

## Implementation Strategy

1. **Pure Functions**: All operations are pure functions that return descriptions
2. **Separate Execution**: A single executor handles all side effects
3. **Validation First**: Operations are validated before execution
4. **Rollback Support**: All operations can be rolled back

## Example: Complex Workflow

```typescript
// "Archive all completed posts older than 30 days"

// 1. Select completed posts
const completed = select(vault, { 
  has: ['status'],
  path: 'posts/**' 
});

// 2. Filter by date (composed operation)
const old = filter(completed, doc => 
  doc.metadata.frontmatter.date < thirtyDaysAgo
);

// 3. Generate move operations
const archiveOps = move(vault, old, 'archive/2024/');

// 4. Add metadata updates
const updateOps = updateMetadata(old, { 
  archived: new Date().toISOString() 
});

// 5. Create snapshot before executing
const snapshot = snapshot(vault, [...archiveOps, ...updateOps]);

// 6. Execute all operations atomically
const result = execute(vault, [...archiveOps, ...updateOps]);

if (result.success) {
  console.log(`Archived ${old.documents.length} posts`);
} else {
  console.error('Failed:', result.error);
  // Could restore from snapshot here
}
```

## Next Steps

This language specification will be implemented in the `@mmt/core-operations` package, providing:

1. Type-safe operation constructors
2. Validation functions
3. A single executor with rollback support
4. Comprehensive tests for all operations

The rest of MMT will be built on top of this language, ensuring consistency and predictability throughout the application.