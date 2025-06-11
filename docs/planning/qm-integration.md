# QM Service Integration Specification

## Overview

The QM service (from https://github.com/danielseltzer/mq6t) provides vector similarity search and RAG capabilities for the markdown vault. This document specifies how MMT integrates with and depends on QM.

## Integration Strategy

### QM as Optional Enhancement

**Decision**: Local indexer handles all queries except vector similarity. QM adds advanced search.

- MMT works fully without QM using local indexer
- QM adds vector similarity search when available
- Graceful enhancement, not hard dependency
- Check QM availability at startup
- Show UI indicator when QM features available

## Version Management

### Compatibility Requirements
- Document minimum QM version required
- Test against specific QM releases
- Use semantic versioning to indicate breaking changes

### Version Strategy
```yaml
# In MMT config
qmServiceUrl: "http://localhost:8080"
qmMinVersion: "0.5.0"  # Optional: verify compatibility
```

### Division of Responsibilities

**Local Indexer Handles:**
- Frontmatter property queries
- Path-based filtering
- Date/size filtering
- Link extraction and queries
- Text search (basic)
- File watching and updates

**QM Provides When Available:**
- Vector similarity search
- Advanced semantic search
- "Find similar documents" feature
- AI-powered suggestions

**No New QM Features Needed:**
Since the local indexer handles metadata queries, QM can focus on what it does best - vector similarity. No need to add link indexing or query extensions to QM.

## Failure Handling

### Service Unavailable
- Log warning: "QM service not available - similarity search disabled"
- Continue with local indexer functionality
- Disable "Find Similar" UI features
- Check periodically for QM availability

### Performance Degradation
- Set reasonable timeouts (e.g., 5s for search)
- Fall back if QM is too slow
- Cache QM results where appropriate

### Data Consistency
- QM index may be stale relative to filesystem
- Handle missing documents gracefully
- Consider "refresh index" operation

## Development Workflow

### For MMT Development
```bash
# Start QM with test data
cd /path/to/mq6t
qm-control start --config test-config.yaml --port 8081

# Run MMT tests against test QM instance
cd /path/to/mmt
pnpm test --config test/config.yaml
```

### Test Data Requirements
- Need consistent test vault for both QM and MMT
- Should include diverse document types
- Minimum 100-500 documents for realistic testing

## Configuration Examples

### Development Config
```yaml
vaultPath: /Users/dev/test-vault
providers: [qm, filesystem]
qmServiceUrl: http://localhost:8081
```

### Production Config Examples

**Basic (Local Only)**
```yaml
vaultPath: /Users/user/Documents/vault
# No qmServiceUrl = local indexing only
```

**Enhanced (With QM)**
```yaml
vaultPath: /Users/user/Documents/vault  
qmServiceUrl: http://localhost:8080
# QM adds similarity search when available
```

## Future Considerations

### Embedding QM
If we embed QM in the future:
- Use go-plugin or similar for process management
- Allocate dedicated port range (e.g., 10500-10599)
- Store QM data in app data directory
- Provide UI for index management

### API Evolution
- Monitor QM API changes
- Maintain adapter layer if needed
- Consider GraphQL for more stable interface

### Performance Optimization
- Batch requests where possible
- Implement local caching layer
- Consider partial index for quick searches

## Testing Strategy

### Integration Tests
- Run against real QM instance (no mocks)
- Test failover scenarios
- Verify result consistency

### QM Version Matrix
- Test against minimum supported version
- Test against latest stable version
- Document any version-specific behaviors

## Implementation Plan

### Phase 1: Use Existing QM Features
- Implement basic search and filtering with current QM API
- Handle only features QM currently supports
- Identify specific gaps for Phase 2

### Phase 2: Enhance QM for MMT
- Add link indexing to QM
- Extend query language for filters
- Add bulk update endpoints
- Coordinate development between projects

## Open Questions

1. Should we bundle qm-control with MMT for easier setup?
2. What's the minimum QM version we should support?
3. Should MMT's GitHub repo include QM enhancement issues?
4. How do we coordinate feature development between projects?
5. Should we version the QM API to ensure compatibility?