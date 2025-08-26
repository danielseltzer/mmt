# MMT Configuration Files

This directory contains configuration files for MMT, organized into:
- `examples/` - Example configurations for reference
- `test/` - Test configurations for development and testing

## User Configuration

User-specific configuration files should be stored in `~/.mmt/config/` to:
- Keep them separate from the project codebase
- Prevent accidental commits of personal vault paths
- Allow multiple users to work on the project

Example:
```bash
# Create your personal config directory
mkdir -p ~/.mmt/config

# Copy and customize an example config
cp config/examples/example.yaml ~/.mmt/config/my-vault.yaml

# Edit with your vault paths
vim ~/.mmt/config/my-vault.yaml

# Use it with MMT
pnpm mmt --config ~/.mmt/config/my-vault.yaml script examples/analysis/vault-link-statistics.mmt.ts
```

## Files

### Available Configurations

#### examples/
- `example.yaml` - Basic configuration template
- `personal-vault-config.yaml` - Example personal vault setup
- `personal-vault-similarity-config.yaml` - Example with similarity search

#### test/
- `dev-config.yaml` - Development configuration
- `test-minimal-config.yaml` - Minimal test setup
- `test-notes-config.yaml` - Test notes vault
- `test-small-vault.yaml` - Small test vault
- `multi-vault-test-config.yaml` - Multi-vault testing

Update the `vaultPath` to point to your actual vault before running test scripts:

```yaml
vaultPath: /path/to/your/obsidian/vault
```

## Usage

Reference config files when running MMT commands:

```bash
# Run a script with example config
pnpm mmt script path/to/script.mmt.ts --config config/examples/example.yaml

# Run with test config
pnpm mmt script path/to/script.mmt.ts --config config/test/dev-config.yaml

# Other commands that need config
pnpm mmt <command> --config config/examples/your-config.yaml
```

## Config Schema

All config files should follow the schema defined in `@mmt/config` package:

```yaml
# Required fields
vaultPath: /absolute/path/to/vault
indexPath: /absolute/path/to/index

# Optional fields
cache:
  enabled: true
  location: /path/to/cache

performance:
  maxConcurrent: 4
  useWorkers: true
```