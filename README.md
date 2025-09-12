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
./bin/mmt start --config config/examples/your-config.yaml

# Stop MMT
./bin/mmt stop

# Check status
./bin/mmt status
```

### Commands

#### Application Commands
- `./bin/mmt start --config <file>` - Start both API and web servers
- `./bin/mmt stop` - Stop all running servers
- `./bin/mmt status` - Show whether MMT is running

#### Test Service Commands (for development)
- `./bin/mmt test:start` - Start Ollama and Qdrant services for testing
- `./bin/mmt test:stop` - Stop test services
- `./bin/mmt test:status` - Check test service health

### Logs

MMT writes logs to the `logs/` directory in the project root:
- Log files are named: `mmt-YYYY-MM-DD.log`
- Logs include output from both API and web servers
- Useful for debugging issues when running in background

View logs:
```bash
# Follow latest log
tail -f logs/mmt-*.log

# View today's log
cat logs/mmt-$(date +%Y-%m-%d).log
```

### Configuration

MMT requires explicit configuration with no defaults. Create a YAML config file:

```yaml
# config/examples/your-config.yaml
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
- [dev-config.yaml](config/test/dev-config.yaml) - For development with test vault
- [example-config.yaml](config/examples/example.yaml) - Basic configuration template
- [personal-vault-config.yaml](config/examples/personal-vault-config.yaml) - Example with real vault

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

### Testing

MMT uses real file operations for testing (no mocks). Some tests require similarity search services:

```bash
# Start test services (Ollama and Qdrant)
./bin/mmt test:start

# Run all tests
pnpm test

# Stop test services when done
./bin/mmt test:stop
```

Tests that require similarity services will fail fast with clear error messages if services are not available.