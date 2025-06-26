# ADR-011: Script Execution Model

## Status
Accepted

## Context

Issue #45 originally called for an ADR about the script execution model, particularly focusing on async/sync execution patterns and custom operation handlers. Since the issue was created, the architecture has evolved:

1. Arquero has been adopted for data manipulation operations (ADR-009)
2. Custom operations have been explicitly blocked to maintain safety
3. The scripting system has been implemented for analysis operations
4. Mutation operations (move, rename, delete, updateFrontmatter) await implementation

We need to formalize the execution model before implementing mutation operations.

## Decision

### 1. Sequential Execution Model

All operations will execute **sequentially** rather than in parallel:
- Operations on a single document are applied in order
- Documents are processed one at a time
- No concurrent file system operations

Rationale:
- Simplicity and predictability
- Avoids file system conflicts
- Easier link integrity maintenance
- Most operations involve tens to hundreds of files, where sequential performance is acceptable
- A minute for complex sequences on hundreds of files is acceptable

### 2. No Custom Operations

Custom operations will remain blocked:
- The existing error "Custom operations are not supported" will be maintained
- All mutations must use built-in operations
- Analysis operations should use Arquero's extensive functionality

Rationale:
- No clear need for custom operations has emerged
- Arquero handles data manipulation needs
- Avoids security concerns with arbitrary code execution
- Maintains predictability and safety

### 3. Error Handling Without Transactions

Operations will use explicit error tracking without automatic rollback:
- Each operation records success/failure independently  
- Failed operations are collected with error details
- No automatic rollback or transaction support
- Existing backup mechanisms (timestamps, trash folder) provide recovery options

Rationale:
- Manual recovery is sufficient for the use case
- Transaction complexity not justified
- Clear reporting enables targeted fixes
- Users can re-run operations on failed documents

### 4. Activity Logging

Every mutation operation will be logged to provide a complete audit trail:

**Log Format:**
```
2024-01-15T10:30:45.123Z | Move | Success | /docs/old/file1.md -> /docs/new/file1.md
2024-01-15T10:30:45.456Z | Rename | Success | /docs/new/file1.md -> /docs/new/renamed1.md  
2024-01-15T10:30:45.789Z | UpdateFrontmatter | Success | /docs/new/renamed1.md | tags: added "processed"
2024-01-15T10:30:46.123Z | Move | Failed | /docs/old/file2.md -> /docs/new/file2.md | Error: Target directory does not exist
```

**File Organization:**
- Directory: `/logs/activity/` in vault root
- Filename: `MMT_actlog_YYYYMMDD_HHMMSS.log` (timestamp when pipeline started)
- One file per script execution
- Header with script name, parameters, and document count

**Implementation:**
- Real-time logging as operations occur
- Atomic line writes
- Directory created automatically if needed

Rationale:
- Provides complete record for manual recovery
- Easy to find logs from specific executions
- Enables analysis of failure patterns
- Simple format for both human and machine reading

### 5. Performance Approach

No performance optimizations until demonstrated need:
- No batching
- No parallel processing  
- No streaming for large sets
- Simple in-memory processing

Rationale:
- Current performance is acceptable
- Premature optimization avoided
- Can revisit if real-world usage shows bottlenecks

## Consequences

### Positive
- Simple, predictable execution model
- Clear audit trail for all operations
- Easy to understand and debug
- No complex state management
- Focused on actual vs theoretical needs

### Negative  
- No automatic recovery from partial failures
- Sequential processing may be slower for very large operations
- No custom operations limits extensibility
- Manual intervention required for failure recovery

### Neutral
- Activity logs will accumulate over time (may need cleanup strategy later)
- Users must understand backup/recovery options
- Re-running failed operations requires manual script adjustment

## Implementation Notes

1. The activity logging should be implemented before mutation operations
2. Existing `ExecutionResult` types already capture needed information
3. The `failFast` option provides control over partial execution
4. Backup mechanisms (`.backup.<timestamp>`, trash folders) already exist

## Future Considerations

If performance becomes an issue with larger vaults:
- Could add opt-in parallel processing for read operations
- Could implement batched writes with configurable sizes
- Could add streaming for memory efficiency

If custom operations become necessary:
- Would need sandboxing strategy
- Should remain read-only
- Must maintain type safety