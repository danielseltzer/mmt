# ADR-004: Similarity Search Testing Strategy

## Status
Proposed

## Context
The similarity search feature uses Orama vector database with Ollama embeddings to find related documents in large markdown vaults (5000+ files). The current implementation lacks comprehensive testing, which creates uncertainty about reliability, error handling, and performance characteristics. We need a testing strategy that validates core functionality while being practical to maintain.

## Decision
We will implement a test-driven development (TDD) approach for similarity search with three levels of testing:

### 1. Integration Tests (Primary Focus)
Integration tests will validate the complete similarity search workflow using real files in temporary directories:

#### Core Functionality Tests
- **Basic Indexing**: Index a small set of generated markdown files and verify document count
- **Similarity Search**: Create topic clusters (e.g., 5 woodworking files, 5 cooking files, 5 unrelated) and verify similar documents rank higher
- **Empty Document Handling**: Verify empty files are skipped with appropriate error logging
- **Error Reporting**: Verify failed documents are tracked and reported in summary statistics

#### Persistence Tests
- Index documents to a persistent location
- Simulate shutdown by destroying the service instance
- Create new instance and load from disk
- Verify document count matches and search still works

#### File System Integration Tests
- **File Updates**: Modify file content and verify re-indexing updates embeddings
- **File Deletion**: Delete files and verify removal from index
- **File Movement**: Move files and verify index updates appropriately
- (Leverage existing patterns from the main indexer where possible)

### 2. Error Visibility and Reporting
All indexing operations must provide clear error reporting:

#### Console Logging
- Error-level messages for indexing failures (not just to files)
- Include document path and failure reason
- Distinguish between document issues vs system failures

#### Error Summary Files
- Write timestamped error logs to project root (e.g., `similarity-errors-2025-08-05-143022.log`)
- Include: document path, error type, error message, timestamp
- Summary statistics: total docs, indexed, failed, success percentage

#### Test Helpers
- Create a test utility to verify Ollama availability at test suite start
- Fail fast with clear message if Ollama is not running
- Consider extending `bin/mmt status` to include Ollama health check

### 3. Smoke Tests
Simple tests with generated documents to ensure basic functionality:
- Create 10 documents with obvious topic clustering
- Index all documents
- Search for a document from each cluster
- Verify at least one related document appears in top 5 results

### Non-Goals
- **Quality Metrics**: We will NOT attempt to measure result quality in automated tests
- **Performance Benchmarks**: While we'll track indexing time, we won't set hard limits
- **Mock Services**: No mocking of Ollama or file system per project principles
- **Retry Logic**: Failed documents won't be retried (deterministic failures expected)

## Test Data Strategy

### Generated Test Documents
For integration tests, generate simple markdown files in `/tmp`:
```markdown
# Woodworking Project 1
Building a oak bookshelf with hand tools.
Materials: oak boards, wood glue, sandpaper.
Tools: saw, chisel, measuring tape.
```

### Production Vault Testing
- User acceptance testing (UAT) against 6k document vault
- Manual verification of result quality
- Not part of automated test suite

## Success Criteria
A test run is considered successful when:
1. All documents that should index do index (no false negatives)
2. Failed documents are clearly reported with actionable error messages
3. Persistence works across service restarts
4. File system changes are properly reflected in the index
5. Ollama unavailability is detected and reported clearly

## Consequences

### Positive
- High confidence in reliability through real-world testing
- Clear error visibility prevents silent failures
- TDD approach ensures testability is built-in
- Simple test data strategy is maintainable

### Negative
- No automated quality assurance (relies on UAT)
- Requires Ollama to be running for tests
- Test execution may be slower due to real embeddings

## Implementation Notes
1. Start with basic indexing tests to establish patterns
2. Add persistence tests once basic indexing works
3. Implement error reporting early for debugging
4. Keep test documents simple and focused on obvious relationships
5. Run full test suite before any PR merge