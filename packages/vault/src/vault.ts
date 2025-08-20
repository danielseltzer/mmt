import type { VaultConfig } from '@mmt/entities';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem, type FileSystemAccess } from '@mmt/filesystem-access';
import type { Vault as IVault, VaultStatus, VaultServices } from './types.js';
import { Loggers, type Logger } from '@mmt/logger';

/**
 * Represents a single vault containing markdown files with associated indexing capabilities.
 * 
 * WHY: Encapsulates a vault's lifecycle, configuration, and services (indexer, file system).
 * Each vault manages a single directory of markdown files with its own indexing state.
 * 
 * DESIGN DECISION: Uses promise-based initialization because:
 * - Indexing operations are inherently async (file system access)
 * - Allows for proper error handling during vault setup
 * - Enables status tracking for UI feedback
 * 
 * INITIALIZATION PATTERN:
 * 1. Create Vault instance (status: 'initializing')
 * 2. Call initialize() to setup indexer and services
 * 3. Status transitions to 'ready' on success or 'error' on failure
 * 4. Access services only when status is 'ready'
 * 
 * ARCHITECTURE: Created and managed by VaultRegistry which handles:
 * - Default vault initialization (synchronous, fail-fast)
 * - Additional vault initialization (asynchronous, fail-gracefully)
 */
export class Vault implements IVault {
  public id: string;
  public config: VaultConfig;
  public status: VaultStatus;
  public services?: VaultServices;
  public error?: Error;
  private fileSystem: FileSystemAccess;
  private logger: Logger;
  private vaultDebugLogger: Logger;

  constructor(id: string, config: VaultConfig) {
    this.id = id;
    this.config = config;
    this.status = 'initializing';
    this.fileSystem = new NodeFileSystem();
    this.logger = Loggers.vault();
    this.vaultDebugLogger = Loggers.vaultDebug();
  }

  /**
   * Initializes the vault by setting up indexer and services.
   * 
   * WHY: Separates construction from initialization to allow for:
   * - Async operations (file system access, indexing)
   * - Proper error handling and status tracking
   * - Registry to manage initialization timing (sync vs async)
   * 
   * @throws Error if initialization fails (allows fail-fast for default vault)
   */
  async initialize(): Promise<void> {
    try {
      // eslint-disable-next-line no-console
      this.logger.info(`Initializing vault: ${this.id}`);
      this.vaultDebugLogger.debug(`Vault ID: ${this.id}, Path: ${this.config.path}`);
      this.status = 'initializing';

      // Initialize indexer with vault configuration
      const indexer = new VaultIndexer({
        vaultPath: this.config.path,
        fileSystem: this.fileSystem,
        fileWatching: this.config.fileWatching,
        useCache: true,
        useWorkers: true
      });
      this.vaultDebugLogger.debug(`Created indexer for ${this.id} with path: ${this.config.path}`);

      await indexer.initialize();

      // Store services
      this.services = {
        indexer
      };

      this.status = 'ready';
      // eslint-disable-next-line no-console
      this.logger.info(`Vault ${this.id} initialized successfully`);
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to initialize vault ${this.id}`, { error });
      throw error; // Re-throw to allow fail-fast behavior
    }
  }

  /**
   * Gets the vault's indexer instance.
   * 
   * WHY: Provides controlled access to indexing capabilities while enforcing proper lifecycle.
   * - Only accessible when vault is in 'ready' state
   * - Prevents access to uninitialized or failed indexers
   * - Throws clear error messages for improper usage
   * 
   * @returns VaultIndexer instance for this vault
   * @throws Error if vault is not initialized or failed to initialize
   */
  get indexer(): VaultIndexer {
    if (!this.services?.indexer) {
      throw new Error(`Vault ${this.id} is not initialized or failed to initialize`);
    }
    return this.services.indexer;
  }

  /**
   * Shuts down the vault and cleans up resources.
   * 
   * WHY: Ensures proper cleanup of file watchers and indexer resources.
   * - Prevents resource leaks in long-running applications
   * - Allows graceful shutdown and restart cycles
   * - Resets state for potential re-initialization
   * 
   * NOTE: After shutdown, vault must be re-initialized before use.
   */
  shutdown(): void {
    // eslint-disable-next-line no-console
    this.logger.info(`Shutting down vault: ${this.id}`);
    
    // Indexer will handle its own cleanup including file watcher
    // Additional cleanup can be added here as needed

    this.services = undefined;
    this.status = 'initializing'; // Reset to initial state
  }
}