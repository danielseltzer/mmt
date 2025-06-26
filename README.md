# MMT - Markdown Management Toolkit

A desktop application for managing large markdown vaults with bulk operations, sophisticated filtering, and optional vector similarity search.

## Configuration

MMT requires explicit configuration with no defaults. Create a YAML config file:

```yaml
# mmt-config.yaml
vaultPath: /absolute/path/to/your/vault
indexPath: /absolute/path/to/store/index

# Optional: Enable file watching for automatic index updates
fileWatching:
  enabled: true
```

See [example-config.yaml](example-config.yaml) for a complete example.

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