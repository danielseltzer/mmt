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
  
  // For Phase 1: Use the first vault as default
  const defaultVault = config.vaults[0];
  
  const indexer = new VaultIndexer({
    vaultPath: defaultVault.path,
    fileSystem: fs,
    cacheDir: defaultVault.indexPath,
    useCache: true,
    fileWatching: defaultVault.fileWatching,
  });
  await indexer.initialize();
  
  const fileRelocator = new FileRelocator(fs, {
    updateMovedFile: true,
    extensions: ['.md'],
  });
  
  // OperationRegistry already has default operations registered
  const operationRegistry = new OperationRegistry();
  
  // Initialize similarity search if enabled
  let similaritySearch: SimilaritySearchService | undefined;
  if (config.similarity?.enabled) {
    similaritySearch = new SimilaritySearchService(config);
    await similaritySearch.initialize();
  }

  // Initialize vault registry with all configured vaults
  await vaultRegistry.initializeVaults(config);
  
  return {
    config,
    indexer,
    fileRelocator,
    operationRegistry,
    fs,
    similaritySearch,
    vaultRegistry,
  };
}