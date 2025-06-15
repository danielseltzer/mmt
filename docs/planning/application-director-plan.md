# Application Director Implementation Plan

## Overview

The Application Director is the central orchestrator for MMT, responsible for bootstrapping the application, wiring dependencies, and routing to appropriate command handlers. It follows the dependency injection strategy documented in `/docs/building/dependency-injection.md`.

## Design Principles

1. **Thin Orchestration Layer**: No business logic, only wiring and routing
2. **Explicit Dependencies**: All dependencies passed via constructor injection
3. **Fail Fast**: Clear error messages for invalid commands or configurations
4. **Schema-Based Configs**: Each package receives only its required config via Zod schemas
5. **Command Pattern**: Extensible routing to different command handlers

## Architecture

### Package Structure
```
apps/cli/
├── src/
│   ├── index.ts                 # Main entry point #!/usr/bin/env node
│   ├── application-director.ts  # Main orchestrator class
│   ├── cli-parser.ts           # Command-line argument parsing
│   ├── commands/              # Command handlers
│   │   ├── index.ts
│   │   ├── script-command.ts   # Script execution handler
│   │   └── help-command.ts     # Help display handler
│   └── schemas/               # CLI and command schemas
│       └── cli.schema.ts
├── test/
│   ├── application-director.test.ts
│   ├── cli-parser.test.ts
│   └── commands/
│       └── script-command.test.ts
├── package.json                # name: "@mmt/cli", bin: { "mmt": "./dist/index.js" }
├── tsconfig.json
└── vitest.config.ts
```

### Core Components

#### 1. CLI Schema
```typescript
// schemas/cli.schema.ts
export const CliArgsSchema = z.object({
  // Special flags
  version: z.boolean().default(false).describe('Show version and exit'),
  debug: z.boolean().default(false).describe('Enable debug output'),
  
  // Config and command
  configPath: z.string().optional().describe('Path to config file from --config flag'),
  command: z.enum(['script', 'gui', 'help']).optional(),
  commandArgs: z.array(z.string()).default([]),
});

export const ScriptCommandArgsSchema = z.object({
  scriptPath: z.string().describe('Path to script file to execute'),
  scriptArgs: z.array(z.string()).default([]).describe('Arguments to pass to script'),
});

// Global debug flag accessible to all components
export let DEBUG = false;
export function setDebug(value: boolean): void {
  DEBUG = value;
}
```

#### 2. CLI Parser
```typescript
// cli-parser.ts
export class CliParser {
  parse(args: string[]): CliArgs {
    const parsed: Partial<CliArgs> = {
      commandArgs: [],
    };
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === '--version') {
        parsed.version = true;
      } else if (arg === '--debug') {
        parsed.debug = true;
      } else if (arg.startsWith('--config=')) {
        parsed.configPath = arg.slice('--config='.length);
      } else if (arg === '--help' || arg === '-h') {
        parsed.command = 'help';
      } else if (!parsed.command && !arg.startsWith('-')) {
        // First non-flag arg is the command
        parsed.command = arg as any;
      } else if (parsed.command) {
        // Everything after command goes to commandArgs
        parsed.commandArgs!.push(arg);
      }
      
      i++;
    }
    
    return CliArgsSchema.parse(parsed);
  }
}
```

#### 3. Application Director
```typescript
// application-director.ts
export class ApplicationDirector {
  private commands: Map<string, CommandHandler>;

  constructor() {
    this.commands = new Map([
      [ScriptCommand.COMMAND_NAME, new ScriptCommand()],
      [HelpCommand.COMMAND_NAME, new HelpCommand()],
      // GUI command will be added later
    ]);
  }

  async run(args: string[]): Promise<void> {
    try {
      // 1. Parse CLI arguments
      const cliArgs = new CliParser().parse(args);
      
      // 2. Handle special flags first
      if (cliArgs.version) {
        console.log('mmt version 0.1.0');  // TODO: Read from package.json
        process.exit(0);
      }
      
      if (cliArgs.debug) {
        setDebug(true);
        console.debug('Debug mode enabled');
      }
      
      // 3. Default to help if no command
      if (!cliArgs.command) {
        cliArgs.command = 'help';
      }
      
      // 4. Help doesn't require config
      if (cliArgs.command === 'help') {
        const handler = this.commands.get('help');
        await handler!.execute({} as AppContext, cliArgs.commandArgs);
        return;
      }
      
      // 5. All other commands require config
      if (!cliArgs.configPath) {
        this.exitWithError('--config flag is required');
      }
      
      // 6. Load configuration
      const configService = new ConfigService();
      const config = await configService.load(cliArgs.configPath);
      
      // 7. Create app context
      const context: AppContext = { config };
      
      // 8. Get command handler
      const handler = this.commands.get(cliArgs.command);
      if (!handler) {
        this.exitWithError(`Unknown command: ${cliArgs.command}`);
      }
      
      // 9. Execute command
      await handler.execute(context, cliArgs.commandArgs);
      
    } catch (error) {
      // ConfigService already handles its own errors
      // This catches unexpected errors
      console.error('Unexpected error:', error);
      process.exit(1);
    }
  }

  private exitWithError(message: string): never {
    console.error(`Error: ${message}\n`);
    console.error('Usage: mmt --config=<path> <command> [options]');
    console.error('Commands:');
    console.error('  script <path>  Execute a script');
    console.error('  help          Show help');
    process.exit(1);
  }
}
```

#### 4. Command Handler Interface
```typescript
// commands/index.ts
export interface CommandHandler {
  execute(context: AppContext, args: string[]): Promise<void>;
}
```

#### 5. Script Command (Placeholder)
```typescript
// commands/script-command.ts
export class ScriptCommand implements CommandHandler {
  static readonly COMMAND_NAME = 'script';
  
  async execute(context: AppContext, args: string[]): Promise<void> {
    // Parse script-specific args
    const scriptArgs = ScriptCommandArgsSchema.parse({
      scriptPath: args[0],
      scriptArgs: args.slice(1),
    });
    
    if (!scriptArgs.scriptPath) {
      throw new Error('Script path required');
    }
    
    // For now, just validate and log
    console.log(`Would execute script: ${scriptArgs.scriptPath}`);
    console.log(`With config: ${context.config.vaultPath}`);
    
    // Later: Create ScriptRunner with proper config
    // const scriptConfig = { vaultPath: context.config.vaultPath };
    // const runner = new ScriptRunner(scriptConfig, fs);
    // await runner.execute(scriptArgs.scriptPath, context);
  }
}
```

#### 6. Help Command
```typescript
// commands/help-command.ts
export class HelpCommand implements CommandHandler {
  static readonly COMMAND_NAME = 'help';
  
  async execute(context: AppContext, args: string[]): Promise<void> {
    console.log('MMT - Markdown Management Toolkit');
    console.log('\nUsage: mmt --config=<path> <command> [options]');
    console.log('\nCommands:');
    console.log('  script <path>  Execute a script');
    console.log('  help           Show this help message');
    console.log('\nRequired flags:');
    console.log('  --config=<path>  Path to configuration file');
  }
}
```

### Dependencies

```json
{
  "dependencies": {
    "@mmt/config": "workspace:*",
    "@mmt/entities": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

Note: Intentionally minimal dependencies. Will add more as we implement commands.

### CLI Entry Point

The CLI entry point is in the same package:

```typescript
// apps/cli/src/index.ts
#!/usr/bin/env node
import { ApplicationDirector } from './application-director.js';

const director = new ApplicationDirector();
director.run(process.argv.slice(2)).catch(() => {
  // Error already handled by director
  process.exit(1);
});
```

## Testing Strategy

### 1. CLI Parser Tests
- Parses --config flag correctly
- Identifies commands
- Handles missing config flag
- Collects command arguments

### 2. Application Director Tests
- Routes to correct command handlers
- Creates AppContext correctly
- Handles unknown commands
- Integrates with ConfigService

### 3. Command Tests
- Script command validates arguments
- Help command outputs usage

### Test Approach
- Use real file operations (no mocks)
- Test with temporary config files
- Verify process.exit calls
- Check error messages

## Implementation Order

1. **Create package structure**
2. **Implement CLI argument parsing**
   - CliArgsSchema
   - CliParser class
   - Tests for parser
3. **Implement ApplicationDirector**
   - Basic run() method
   - Error handling
   - Tests for director
4. **Add command handlers**
   - CommandHandler interface
   - HelpCommand (simple)
   - ScriptCommand (placeholder)
5. **Create CLI entry point**
   - Separate package/app
   - Executable script

## Success Criteria

- [x] Parses --config flag from command line
- [x] Loads configuration using ConfigService
- [x] Creates AppContext with validated config
- [x] Routes to appropriate command handlers
- [x] Shows help when no command provided
- [x] Clear error messages for:
  - Missing --config flag
  - Unknown commands
  - Invalid arguments
- [x] All tests use real files
- [x] Follows constructor injection pattern

## Future Extensions

When we implement ScriptRunner (Issue #27):
```typescript
// Wire up real script execution
const scriptConfig: ScriptRunnerConfig = {
  vaultPath: context.config.vaultPath,
  scriptPath: scriptArgs.scriptPath,
};
const runner = new ScriptRunner(scriptConfig, new NodeFileSystem());
await runner.execute(context);
```

When we add GUI support:
```typescript
// Add GUI command handler
this.commands.set('gui', new GuiCommand());

// GuiCommand launches Electron app with context
```

## Decisions Made

1. **Package location**: `apps/cli` - It's an application entry point, not a reusable library
2. **Executable name**: `mmt` - Clean and simple
3. **Version handling**: Add `--version` flag support in initial implementation
4. **Debug mode**: Add `--debug` flag for verbose output
5. **Help format**: Plain text for now (can add colors later if desired)

## Example Usage

```bash
# After implementation
mmt --config=./my-vault.yaml script ./hello.js

# With debug output
mmt --debug --config=./my-vault.yaml script ./hello.js

# Show version
mmt --version

# Show help (no config required)
mmt --help
mmt -h
mmt help

# Future: GUI mode
mmt --config=./my-vault.yaml gui
```