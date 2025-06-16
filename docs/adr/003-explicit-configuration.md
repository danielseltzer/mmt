# ADR-003: Explicit Configuration (No Defaults)

## Status

Accepted

## Context

Many applications use configuration defaults, environment variables, and fallback values to make getting started easier. However, this can lead to:
- Confusion about what configuration is actually being used
- Different behavior in different environments
- Hidden dependencies on environment state
- Difficult debugging when defaults don't match expectations

MMT manages markdown vaults that could be anywhere on the file system. There is no sensible default for vault location or index storage.

## Decision

MMT requires explicit configuration with no defaults:
- The `--config` flag is required (except for help/version commands)
- All configuration paths must be absolute
- No environment variables are consulted
- No default values are provided
- Configuration must be valid or the application exits with clear errors

Example:
```yaml
# Required configuration
vaultPath: /absolute/path/to/vault
indexPath: /absolute/path/to/index
```

## Consequences

**Positive:**
- No ambiguity about configuration
- Same behavior across all environments
- Clear error messages for missing/invalid config
- Forces users to make explicit choices
- Easier to debug configuration issues

**Negative:**
- Cannot run without configuration file
- Users must create config before first use
- No "quick start" with defaults
- More verbose for simple use cases

**Mitigation:**
- Provide example configuration files
- Clear error messages with config format
- Documentation includes config examples
- Future: config generation wizard