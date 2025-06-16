# ADR-006: Command Pattern for CLI Routing

## Status

Accepted

## Context

The CLI application needs to route different commands (script, help, gui, etc.) to appropriate handlers. As we add more commands, we need a maintainable pattern that:
- Avoids large switch/if-else statements
- Allows commands to be self-contained
- Makes testing individual commands easy
- Supports future extension

Options considered:
1. Switch statement in main application
2. Command pattern with handler interface
3. Function map with loose coupling
4. Framework like Commander.js

## Decision

Use the Command Pattern where each command implements a `CommandHandler` interface and exports its own command name.

```typescript
export interface CommandHandler {
  execute(context: AppContext, args: string[]): Promise<void>;
}

export class ScriptCommand implements CommandHandler {
  static readonly COMMAND_NAME = 'script';
  
  async execute(context: AppContext, args: string[]) {
    // implementation
  }
}
```

Commands are registered in a Map in the ApplicationDirector, using their exported names.

## Consequences

**Positive:**
- Each command is self-contained
- Easy to add new commands
- Commands can be tested in isolation
- No string literals in registration
- Clear interface contract
- Follows Open/Closed Principle

**Negative:**
- Additional abstraction layer
- Must maintain CommandHandler interface
- Slightly more boilerplate per command

**Mitigation:**
- Simple interface minimizes maintenance
- Boilerplate is minimal and consistent
- Benefits outweigh the small overhead