# MMT Agent Usage Guide

This guide provides practical instructions for agents to interact with the MMT (Markdown Management Toolkit) system. It covers CLI commands, API endpoints, configuration, and common operations.

## Quick Start

### 1. Start MMT Services

```bash
# Start MMT with a config file (REQUIRED - no defaults)
./bin/mmt start --config config/test-config.yaml

# For Qdrant similarity search
./bin/mmt start --config config/test-qdrant-config.yaml
```

### 2. Check Status

```bash
# Check if MMT is running
./bin/mmt status

# Verbose status (includes Docker services)
./bin/mmt status --verbose
```

### 3. Stop Services

```bash
# Stop all MMT services
./bin/mmt stop
```

## Configuration

### Basic Configuration (No Similarity Search)

```yaml
# config/test-config.yaml
vaultPath: /absolute/path/to/vault  # REQUIRED: Path to markdown files
indexPath: /absolute/path/to/index  # REQUIRED: Where to store the index
apiPort: 3001                        # REQUIRED: API server port
webPort: 5173                        # REQUIRED: Web UI port
```

### Configuration with Qdrant Similarity Search

```yaml
# config/test-qdrant-config.yaml
vaults:
  - id: test-vault
    name: Test Vault
    path: /tmp/test-vault
    indexPath: /tmp/test-vault/.mmt

apiPort: 3001
webPort: 5173

similarity:
  enabled: true
  provider: qdrant
  ollamaUrl: http://localhost:11434  # Ollama for embeddings
  model: nomic-embed-text            # Embedding model
  
  qdrant:
    url: http://localhost:6333       # Qdrant REST API
    collectionName: test-documents
    onDisk: false
```

### Multi-Vault Configuration

```yaml
vaults:
  - id: personal
    name: Personal Notes
    path: /Users/username/personal-notes
    indexPath: .mmt-data/indexes/personal
  
  - id: work
    name: Work Documentation
    path: /Users/username/work-docs
    indexPath: .mmt-data/indexes/work
```

## Available Config Files

Located in `/config` directory:
- `example.yaml` - Template with all options documented
- `test-config.yaml` - Simple single-vault config
- `test-qdrant-config.yaml` - Config with Qdrant similarity search
- `personal-vault-config.yaml` - Real-world example
- `multi-vault.yaml` - Multiple vaults example

## API Endpoints

Base URL when running: `http://localhost:3001`

### Health Check

```bash
GET /health
# Returns: { status: 'ok', version: '0.1.0', vaults: 1 }
```

### Vault Management

```bash
# List all vaults
GET /api/vaults

# Get vault status
GET /api/vaults/{vaultId}/status
```

### Documents

```bash
# List/search documents
GET /api/vaults/{vaultId}/documents
# Query params:
#   - name: Filter by filename
#   - content: Search in content
#   - folders: Filter by folders (array)
#   - tags: Filter by tags (array)
#   - metadata: Filter by frontmatter (array)
#   - date: Filter by modification date
#   - sort: Sort field
#   - order: asc/desc
#   - limit: Max results
#   - offset: Pagination offset

# Get document by path
GET /api/vaults/{vaultId}/documents/by-path/*

# Export documents
POST /api/vaults/{vaultId}/documents/export
Body: {
  documentIds: ["path1", "path2"],
  format: "json" | "csv" | "markdown"
}
```

### Similarity Search (Requires Qdrant)

```bash
# Check similarity status
GET /api/vaults/{vaultId}/similarity/status
# Returns: {
#   indexStatus: 'ready' | 'indexing' | 'error',
#   documentsIndexed: 100,
#   lastUpdated: '2024-01-01T00:00:00Z'
# }

# Search for similar documents
POST /api/vaults/{vaultId}/similarity/search
Body: {
  query: "search text",           # Text to find similar docs for
  documentPath: "/path/to/doc",   # OR use existing doc as query
  limit: 10,                       # Max results
  includeExcerpt: true            # Include content excerpts
}

# Trigger reindexing
POST /api/vaults/{vaultId}/similarity/reindex
Body: {
  force: false  # Force restart if already indexing
}

# Server-sent events for status updates
GET /api/vaults/{vaultId}/similarity/events
```

### Pipelines (Bulk Operations)

```bash
POST /api/vaults/{vaultId}/pipelines/execute
Body: {
  filters: [...],      # Document filters
  operations: [...],   # Operations to apply
  preview: true        # Preview mode (don't execute)
}
```

### Configuration

```bash
# Get current configuration
GET /api/config
```

## Service Architecture

### Required Services

1. **API Server** (Port 3001)
   - REST API for all operations
   - Document indexing and search
   - Pipeline execution

2. **Web UI** (Port 5173)
   - React-based interface
   - Table view with filtering
   - Preview and export capabilities

3. **Qdrant** (Port 6333) - Optional
   - Vector database for similarity search
   - Requires Docker
   - Auto-managed by MMT CLI

### Service Ports

- **3001**: API Server (REST API)
- **5173**: Web UI (Vite dev server)
- **6333**: Qdrant REST API (if enabled)
- **6334**: Qdrant gRPC (if enabled)
- **11434**: Ollama API (for embeddings)

## Common Operations

### 1. Run a Similarity Search

```bash
# Using curl
curl -X POST http://localhost:3001/api/vaults/test-vault/similarity/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "woodworking techniques",
    "limit": 5,
    "includeExcerpt": true
  }'
```

### 2. Search Documents with Filters

```bash
curl "http://localhost:3001/api/vaults/test-vault/documents?\
name=guide&\
tags=tutorial&\
sort=mtime&\
order=desc&\
limit=10"
```

### 3. Check Indexing Status

```bash
curl http://localhost:3001/api/vaults/test-vault/similarity/status
```

### 4. Export Documents

```bash
curl -X POST http://localhost:3001/api/vaults/test-vault/documents/export \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": ["/path/to/doc1.md", "/path/to/doc2.md"],
    "format": "json"
  }'
```

## Troubleshooting

### Service Won't Start

1. **Missing Config**: Ensure --config flag is provided (no defaults)
2. **Port Conflict**: Check if ports 3001/5173 are in use
3. **Invalid Config**: Validate YAML syntax and required fields

### Qdrant Issues

1. **Docker Not Running**: Start Docker Desktop
2. **Container Issues**: Check with `docker ps -a`
3. **Port Conflict**: Ensure port 6333 is free
4. **Storage Path**: Verify `qdrant_storage` directory exists

### Similarity Search Not Working

1. **Ollama Not Running**: Start with `ollama serve`
2. **Model Not Pulled**: Run `ollama pull nomic-embed-text`
3. **Index Not Built**: Trigger reindex via API
4. **Config Issue**: Verify similarity config section

## File Structure

```
mmt/
├── bin/mmt                    # CLI entry point
├── config/                    # Configuration files
│   ├── example.yaml          # Template config
│   └── test-*.yaml          # Test configurations
├── apps/
│   ├── api-server/          # REST API server
│   ├── cli/                 # CLI application
│   └── web/                 # React web UI
├── tools/
│   └── control-manager/     # Service orchestration
├── packages/                # Shared packages
└── qdrant_storage/         # Qdrant data (auto-created)
```

## Testing the System

### Quick Test Sequence

```bash
# 1. Start services
./bin/mmt start --config config/test-qdrant-config.yaml

# 2. Check health
curl http://localhost:3001/health

# 3. List vaults
curl http://localhost:3001/api/vaults

# 4. Get documents
curl http://localhost:3001/api/vaults/test-vault/documents

# 5. Test similarity (if enabled)
curl -X POST http://localhost:3001/api/vaults/test-vault/similarity/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "limit": 5}'

# 6. Stop services
./bin/mmt stop
```

## Key Implementation Details

### No Defaults Policy
- **ALL configuration is explicit** - no default values
- Must provide --config flag with valid YAML file
- System fails fast on invalid/missing config

### Schema-Driven Architecture
- All data contracts defined with Zod schemas
- Located in `@mmt/entities` package
- Validates request/response at boundaries

### Testing Approach
- **NO MOCKS** - tests use real file operations
- Temp directories for test data
- Real Qdrant/Ollama for integration tests

### Performance Targets
- Index 5000 files in < 5 seconds
- Sub-100ms query response time
- Streaming for large result sets

## Advanced Usage

### Custom Embeddings

Modify similarity config to use different models:

```yaml
similarity:
  model: mxbai-embed-large  # Or any Ollama model
  ollamaUrl: http://custom-ollama:11434
```

### Persistence

Index and Qdrant data persist between restarts:
- Index: Stored at `indexPath` in config
- Qdrant: Stored in `./qdrant_storage` by default

### Monitoring

Use Server-Sent Events for real-time updates:

```javascript
const events = new EventSource(
  'http://localhost:3001/api/vaults/test-vault/similarity/events'
);
events.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status update:', data);
};
```

## Summary for Agents

When working with MMT:

1. **Always use explicit config** - no defaults exist
2. **Start with `./bin/mmt start --config <file>`**
3. **API is at `http://localhost:3001`**
4. **Web UI is at `http://localhost:5173`**
5. **Qdrant (if needed) runs in Docker on port 6333**
6. **Use test configs in `/config` for examples**
7. **Check `/health` endpoint to verify services**
8. **Similarity search requires Qdrant + Ollama**

This guide should enable any agent to quickly understand and use the MMT system without exploring the codebase.
