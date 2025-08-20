# Qdrant Similarity Provider

Qdrant vector database provider for MMT similarity search.

## Requirements

1. **Docker** - Required to run Qdrant
2. **Ollama** (optional) - For generating embeddings if not provided

## Setup

### 1. Start Qdrant

```bash
# From project root
docker-compose up -d qdrant

# Or run directly
docker run -p 6333:6333 -v ./qdrant_storage:/qdrant/storage qdrant/qdrant
```

### 2. Start Ollama (if using for embeddings)

```bash
# Install Ollama from https://ollama.ai
ollama serve

# Pull the embedding model
ollama pull nomic-embed-text
```

## Configuration

Add to your MMT configuration:

```yaml
similarity:
  enabled: true
  provider: qdrant
  ollamaUrl: http://localhost:11434  # Optional, for embeddings
  model: nomic-embed-text             # Optional, for embeddings
  
  qdrant:
    url: http://localhost:6333
    collectionName: documents
    onDisk: false  # Store vectors in memory (faster) or on disk
```

## Features

- Stores vectors in Qdrant for fast similarity search
- Supports pre-computed embeddings or generates via Ollama
- Automatic collection creation and management
- Batch indexing for performance
- Configurable similarity thresholds
- Persistent storage (survives restarts)

## Testing

Integration tests require Qdrant to be running:

```bash
# Start Qdrant first
docker-compose up -d qdrant

# Run tests
pnpm test
```

## Performance

- Handles millions of vectors efficiently
- Sub-100ms search latency for most queries
- Memory usage depends on index size and `onDisk` setting
- Batch indexing recommended for large document sets