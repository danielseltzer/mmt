# ADR-001: No Mocks Testing Strategy

## Status

Accepted

## Context

Testing file system operations and other I/O-bound code often leads developers to use mocks, stubs, and test doubles. However, mocks have significant drawbacks:
- They can hide real integration issues
- They require maintenance when interfaces change
- They don't test actual behavior, only our assumptions
- They can give false confidence about code correctness

MMT is fundamentally about file system operations - reading, writing, and transforming markdown files. Testing with mocks would mean we're not actually testing the core functionality.

## Decision

We will test only with real file operations in temporary directories. No mocks, stubs, or test doubles are allowed in the codebase.

All tests must:
- Use real file system operations via the FileSystemAccess interface
- Create temporary directories for test isolation
- Clean up after themselves
- Test actual behavior, not mocked behavior

## Consequences

**Positive:**
- Tests verify actual behavior, not assumptions
- No mock maintenance burden
- Real integration issues are caught early
- Tests serve as living documentation of real usage
- Higher confidence that code works in production

**Negative:**
- Tests may run slightly slower than pure unit tests
- Tests require real file system access
- Need to ensure proper cleanup of temp directories
- Can't test certain error conditions that are hard to reproduce

**Mitigation:**
- Use OS temp directories for fast I/O
- Run tests in parallel where possible
- Careful test design to minimize I/O operations