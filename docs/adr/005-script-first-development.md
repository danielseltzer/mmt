# ADR-005: Script-First Development

## Status

Accepted

## Context

MMT needs to support both programmatic (scripting) and visual (GUI) interfaces. The order of development and the relationship between these interfaces affects:
- API design quality
- Testing approach  
- Feature completeness
- User flexibility

Options considered:
1. GUI-first with scripting added later
2. Build both interfaces simultaneously
3. Script-first with GUI as a layer on top

## Decision

Every feature must be scriptable before GUI implementation. The GUI is one interface to the underlying operations, not the primary interface.

This means:
- All operations are implemented as scriptable APIs first
- GUI constructs and executes operation pipelines
- Scripts have full access to all functionality
- Testing primarily uses the scripting API
- GUI is a visual script builder

## Consequences

**Positive:**
- Forces good API design
- Natural automation and CI/CD integration
- Power users can extend beyond GUI limitations
- Testing is more straightforward
- Clear separation of concerns
- Enables headless operation

**Negative:**
- GUI development must wait for script API
- May need to refactor APIs based on GUI needs
- Additional abstraction layer
- Script API must be user-friendly

**Mitigation:**
- Design script APIs with both users in mind
- Iterate on API design based on usage
- Provide good script examples and documentation