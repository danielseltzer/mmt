# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the MMT project.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences.

## ADR Format

We use a lightweight format based on Michael Nygard's template:

```markdown
# Title

## Status

[Accepted|Rejected|Deprecated|Superseded by ADR-XXX]

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?
```

## Index

- [ADR-001](001-no-mocks-testing-strategy.md) - No Mocks Testing Strategy
- [ADR-002](002-constructor-injection.md) - Constructor Injection for Dependencies
- [ADR-003](003-explicit-configuration.md) - Explicit Configuration (No Defaults)
- [ADR-004](004-schema-driven-contracts.md) - Schema-Driven Package Contracts
- [ADR-005](005-script-first-development.md) - Script-First Development
- [ADR-006](006-command-pattern-cli.md) - Command Pattern for CLI Routing