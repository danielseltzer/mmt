import type { VaultConfig } from '@mmt/entities';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem, type FileSystemAccess } from '@mmt/filesystem-access';
import type { Vault as IVault, VaultStatus, VaultServices } from './types.js';

export class Vault implements IVault {
  public id: string;
  public config: VaultConfig;
  public status: VaultStatus;
  public services?: VaultServices;
  public error?: Error;
  private fileSystem: FileSystemAccess;

  constructor(id: string, config: VaultConfig) {
    this.id = id;
    this.config = config;
    this.status = 'initializing';
    this.fileSystem = new NodeFileSystem();
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Initializing vault: ${this.id}`);
      this.status = 'initializing';

      // Initialize indexer with vault configuration
      const indexer = new VaultIndexer({
        vaultPath: this.config.path,
        fileSystem: this.fileSystem,
        fileWatching: this.config.fileWatching,
        useCache: true,
        useWorkers: true
      });

      await indexer.initialize();

      // Store services
      this.services = {
        indexer
      };

      this.status = 'ready';
      console.log(`Vault ${this.id} initialized successfully`);
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to initialize vault ${this.id}:`, error);
      throw error; // Re-throw to allow fail-fast behavior
    }
  }

  get indexer(): VaultIndexer {
    if (!this.services?.indexer) {
      throw new Error(`Vault ${this.id} is not initialized or failed to initialize`);
    }
    return this.services.indexer;
  }

  async shutdown(): Promise<void> {
    console.log(`Shutting down vault: ${this.id}`);
    
    // Indexer will handle its own cleanup including file watcher
    // Additional cleanup can be added here as needed

    this.services = undefined;
    this.status = 'initializing'; // Reset to initial state
  }
}