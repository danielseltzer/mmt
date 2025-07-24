# MMT - Markdown Management Toolkit

A desktop application for managing large markdown vaults with bulk operations, sophisticated filtering, and optional vector similarity search.

## Critical Rules for Contributors

- Mocks are forbidden. No mocks, test fakes or doubles. Read the testing strategy doc for more info.
- No defaults for configuration, no env var overrides for config values, no cascading or default config file locations. Explicit everything is required.
- Don't guess at calls or symbols, look up the correct and current form of a call or symbol.
- Don't make decisions about design without checking in first.
- Always use git workflow -- work from a github issue and open a branch, create a pr when done.
- Don't invest functionality that isn't needed. Keep it simple and clear. 
- Always run the complete clean/install/build/lint/test cycle after completing an issue and report any lint or test failures.

## Running MMT

### Quick Start

```bash
# Start MMT
./bin/mmt start --config your-config.yaml

# Stop MMT
# Press Ctrl+C in the terminal where it's running
```

### Commands

- `./bin/mmt start --config <file>` - Start both API and web servers
- `./bin/mmt stop` - Stop all running servers (not yet implemented - use Ctrl+C)
- `./bin/mmt status` - Show status of servers (not yet implemented)

### Configuration

MMT requires explicit configuration with no defaults. Create a YAML config file:

```yaml
# your-config.yaml
vaultPath: /absolute/path/to/your/vault
indexPath: /absolute/path/to/store/index
apiPort: 3001
webPort: 5173

# Optional: Enable file watching for automatic index updates
fileWatching:
  enabled: true
  debounceMs: 200
```

Example configurations:
- [dev-config.yaml](dev-config.yaml) - For development with test vault
- [personal-vault-config.yaml](personal-vault-config.yaml) - Example with real vault

## Documentation

### Planning & Architecture
- [Product Requirements](docs/planning/PRD.md)
- [Technical Architecture](docs/planning/technical-architecture.md)
- [Implementation Guide](docs/planning/implementation-guide.md)
- [Architecture Decision Records](docs/adr/README.md)

### Development
- [Engineering Principles](docs/building/principles.md)
- [Dependency Injection](docs/building/dependency-injection.md)

### Features
- [File Watching](docs/features/file-watching.md) - Automatic index updates when files change

## Development

See [Implementation Guide](docs/planning/implementation-guide.md) for setup instructions.