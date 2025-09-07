import type { VaultConfig, Config } from '@mmt/entities';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem, type FileSystemAccess } from '@mmt/filesystem-access';
import type { Vault as IVault, VaultStatus, VaultServices } from './types.js';
import { Loggers, type Logger } from '@mmt/logger';
import { SimilaritySearchService } from './similarity-search-service.js';

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
  private globalConfig?: Config; // For fallback similarity config

  constructor(id: string, config: VaultConfig, globalConfig?: Config) {
    this.id = id;
    this.config = config;
    this.globalConfig = globalConfig;
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

      // Initialize similarity search if configured
      let similaritySearch: SimilaritySearchService | undefined;
      
      // Use per-vault config if available, otherwise fall back to global config
      const similarityConfig = this.config.similarity ?? this.globalConfig?.similarity;
      
      if (similarityConfig?.enabled) {
        try {
          similaritySearch = new SimilaritySearchService(similarityConfig, this.id, this.config.path);
          await similaritySearch.initialize();
          this.vaultDebugLogger.debug(`Initialized similarity search for vault ${this.id}`);
        } catch (error) {
          // Log error but don't fail vault initialization
          this.logger.warn(`Failed to initialize similarity search for vault ${this.id}`, { error });
        }
      }

      // Store services
      this.services = {
        indexer,
        similaritySearch
      };

      this.status = 'ready';
      this.logger.info(`Vault ${this.id} initialized successfully`);
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error : new Error(String(error));
      const errorMsg = this.error.message;
       
      console.error(`✗ Failed to initialize vault ${this.id}: ${errorMsg}`);
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
   * Gets the vault's similarity search service if configured.
   * 
   * WHY: Provides controlled access to similarity search while allowing it to be optional.
   * - Returns undefined if similarity search is not configured
   * - Enforces proper vault lifecycle (must be ready)
   * - Allows vaults to have different similarity configurations
   * 
   * @returns SimilaritySearchService instance or undefined
   */
  get similaritySearch(): SimilaritySearchService | undefined {
    return this.services?.similaritySearch;
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
  async shutdown(): Promise<void> {
     
    this.logger.info(`Shutting down vault: ${this.id}`);
    
    // Shutdown similarity search if it exists
    if (this.services?.similaritySearch !== undefined) {
      await this.services.similaritySearch.shutdown();
    }
    
    // Indexer will handle its own cleanup including file watcher
    // Additional cleanup can be added here as needed

    this.services = undefined;
    this.status = 'initializing'; // Reset to initial state
  }
}