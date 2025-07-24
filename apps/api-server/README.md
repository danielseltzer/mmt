# MMT API Server

The MMT API Server provides a RESTful interface for document operations and pipeline execution.

## Endpoints

### POST /api/pipelines/execute

Execute an operation pipeline using the unified SELECT → FILTER → TRANSFORM → OUTPUT model.

**Request Body**: `OperationPipeline` schema

```typescript
{
  // SELECT: Choose documents
  select: {
    files?: string[],     // Explicit file paths
    query?: string,       // Query string (future)
    all?: boolean        // Select all documents (future)
  },
  
  // FILTER: Refine selection (optional)
  filter?: {
    conditions: [
      { field: 'name', operator: 'contains', value: 'test' },
      { field: 'size', operator: 'gt', value: 1000 },
      { field: 'metadata', key: 'status', operator: 'equals', value: 'draft' }
    ],
    logic: 'AND' | 'OR'
  },
  
  // TRANSFORM: Operations to perform
  operations: [
    { type: 'move', destination: '/new/path' },
    { type: 'rename', newName: 'new-name.md' },
    { type: 'updateFrontmatter', updates: { key: 'value' } },
    { type: 'delete', permanent: false }
  ],
  
  // OUTPUT: Result format (optional)
  output?: {
    format: 'summary' | 'detailed' | 'json' | 'csv',
    destination?: string
  },
  
  // OPTIONS: Execution options (optional)
  options?: {
    destructive: boolean,  // false = preview mode (default)
    continueOnError: boolean,
    updateLinks: boolean
  }
}
```

**Response**: `PipelineExecutionResult`

```typescript
{
  success: boolean,
  documentsProcessed: number,
  operations: {
    succeeded: number,
    failed: number,
    skipped: number
  },
  results?: {
    succeeded: [...],
    failed: [...],
    skipped: [...]
  },
  errors?: [...],
  output?: any
}
```

### Supported Operations

#### Mutation Operations (Implemented)
- **move**: Move documents to a new location
- **rename**: Rename documents
- **updateFrontmatter**: Update document frontmatter
- **delete**: Delete documents (trash or permanent)

#### Analysis Operations (Not Yet Implemented)
- **analyze**: Analyze document properties
- **transform**: Transform document content
- **aggregate**: Aggregate data from multiple documents

### Example: Rename Documents in Preview Mode

```bash
curl -X POST http://localhost:3000/api/pipelines/execute \
  -H "Content-Type: application/json" \
  -d '{
    "select": {
      "files": ["/vault/old-name.md"]
    },
    "operations": [{
      "type": "rename",
      "newName": "new-name.md"
    }],
    "options": {
      "destructive": false
    }
  }'
```

### Example: Move Draft Posts

```bash
curl -X POST http://localhost:3000/api/pipelines/execute \
  -H "Content-Type: application/json" \
  -d '{
    "select": {
      "files": ["/vault/post1.md", "/vault/post2.md"]
    },
    "filter": {
      "conditions": [{
        "field": "metadata",
        "key": "status",
        "operator": "equals",
        "value": "draft"
      }],
      "logic": "AND"
    },
    "operations": [{
      "type": "move",
      "destination": "/vault/drafts"
    }],
    "options": {
      "destructive": true,
      "updateLinks": true
    }
  }'
```

## Other Endpoints

### GET /api/documents
Search and filter documents with pagination.

### GET /api/config
Get current vault configuration.

### GET /api/config/stats
Get vault statistics (document count, size, etc).

### POST /api/documents/export
Export filtered documents in various formats.

## Configuration

The API server requires a configuration file specified with `--config`:

```bash
node server.js --config /path/to/config.yaml
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in development mode
pnpm dev -- --config test-config.yaml

# Run tests
pnpm test
```