import { readFileSync, existsSync, statSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { ConfigSchema, type Config } from '@mmt/entities';
import { z } from 'zod';

/**
 * Service for loading and validating MMT configuration.
 * 
 * This service has no dependencies and performs full validation including:
 * - Path format validation (must be absolute)
 * - File existence checks
 * - YAML parsing
 * - Schema validation
 * - Directory existence verification
 * 
 * The service follows MMT's fail-fast principle with clear error messages.
 */
export class ConfigService {
  /**
   * Load and validate configuration from a YAML file.
   * 
   * @param configPath - Absolute path to the configuration file
   * @returns Validated configuration object
   * @throws Exits process with code 1 on any error
   */
  async load(configPath: string): Promise<Config> {
    // Validate config path is provided
    if (!configPath) {
      this.exitWithError('Configuration path is required');
    }

    // Validate config path is absolute
    if (!isAbsolute(configPath)) {
      this.exitWithError(`Config path must be absolute, got: ${configPath}`);
    }

    // Check config file exists
    if (!existsSync(configPath)) {
      this.exitWithError(`Config file not found: ${configPath}`);
    }

    // Read config file
    let configContent: string;
    try {
      configContent = readFileSync(configPath, 'utf-8');
    } catch (error) {
      this.exitWithError(`Failed to read config file: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Parse YAML
    let rawConfig: unknown;
    try {
      rawConfig = loadYaml(configContent);
    } catch (error) {
      this.exitWithError(`Invalid YAML in config file: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate against schema
    let config: Config;
    try {
      config = ConfigSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => {
          // Provide helpful context for unrecognized keys
          if (issue.code === 'unrecognized_keys') {
            const unrecognized = (issue as any).keys || [];
            return `  - Unrecognized fields: ${unrecognized.join(', ')}\n    Allowed fields: vaultPath, indexPath`;
          }
          return `  - ${issue.path.join('.')}: ${issue.message}`;
        }).join('\n');
        
        this.exitWithError(
          `Configuration validation failed:\n${issues}\n\n` +
          `Valid config example:\n` +
          `---\n` +
          `vaultPath: /absolute/path/to/vault\n` +
          `indexPath: /absolute/path/to/index\n` +
          `---\n\n` +
          `Note: Only vaultPath and indexPath are currently supported.`
        );
      }
      this.exitWithError(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate vault path is absolute (only if it exists after schema validation)
    if (config.vaultPath && !isAbsolute(config.vaultPath)) {
      this.exitWithError(`Vault path must be absolute, got: ${config.vaultPath}`);
    }

    // Validate index path is absolute (only if it exists after schema validation)
    if (config.indexPath && !isAbsolute(config.indexPath)) {
      this.exitWithError(`Index path must be absolute, got: ${config.indexPath}`);
    }

    // Check vault directory exists
    if (!existsSync(config.vaultPath)) {
      this.exitWithError(`Vault directory not found: ${config.vaultPath}`);
    }

    // Verify vault path is a directory
    try {
      const stats = statSync(config.vaultPath);
      if (!stats.isDirectory()) {
        this.exitWithError(`Vault path is not a directory: ${config.vaultPath}`);
      }
    } catch (error) {
      this.exitWithError(`Cannot access vault directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Note: We don't check if indexPath exists because it might be created by the indexer
    // We only validate it's an absolute path

    return config;
  }

  /**
   * Exit the process with an error message and example config.
   * 
   * @param message - Error message to display
   */
  private exitWithError(message: string): never {
    console.error(`\nError: ${message}\n`);
    console.error('Example config format:');
    console.error('---');
    console.error('vaultPath: /absolute/path/to/vault');
    console.error('indexPath: /absolute/path/to/index');
    console.error('---\n');
    process.exit(1);
  }
}