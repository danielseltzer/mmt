import { VaultIndexer } from '@mmt/indexer';
import { FileRelocator } from '@mmt/file-relocator';
import { OperationRegistry, MoveOperation, UpdateFrontmatterOperation, RenameOperation, DeleteOperation } from '@mmt/document-operations';
import { ConfigService } from '@mmt/config';
import type { Config } from '@mmt/entities';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { vaultRegistry } from '@mmt/vault';
import { SimilaritySearchService } from './services/similarity-search.js';

export interface Context {
  config: Config;
  indexer: VaultIndexer;
  fileRelocator: FileRelocator;
  operationRegistry: OperationRegistry;
  fs: NodeFileSystem;
  similaritySearch?: SimilaritySearchService;
  vaultRegistry: typeof vaultRegistry;
}

export async function createContext(config: Config): Promise<Context> {
  
  // Initialize services
  const fs = new NodeFileSystem();
  
  // Initialize vault registry with all configured vaults
  // This creates and manages all indexers
  await vaultRegistry.initializeVaults(config);
  
  // Get the default vault's indexer for backward compatibility
  // (some routes still expect a single indexer in the context)
  const defaultVault = config.vaults[0];
  if (!defaultVault) {
    throw new Error('No vaults configured. At least one vault is required.');
  }
  
  const vault = vaultRegistry.getVault(defaultVault.name);
  if (!vault) {
    throw new Error(`Default vault '${defaultVault.name}' not found in registry.`);
  }
  
  const fileRelocator = new FileRelocator(fs, {
    updateMovedFile: true,
    extensions: ['.md'],
  });
  
  // OperationRegistry already has default operations registered
  const operationRegistry = new OperationRegistry();
  
  // Initialize similarity search if enabled
  let similaritySearch: SimilaritySearchService | undefined;
  if (config.similarity?.enabled) {
    // Use the default vault for similarity search (for now)
    similaritySearch = new SimilaritySearchService(config, defaultVault.name, defaultVault.path);
    await similaritySearch.initialize();
  }
  
  return {
    config,
    indexer: vault.indexer,
    fileRelocator,
    operationRegistry,
    fs,
    similaritySearch,
    vaultRegistry,
  };
}