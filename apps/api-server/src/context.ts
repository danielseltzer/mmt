import { VaultIndexer } from '@mmt/indexer';
import { FileRelocator } from '@mmt/file-relocator';
import { OperationRegistry, MoveOperation, UpdateFrontmatterOperation, RenameOperation, DeleteOperation } from '@mmt/document-operations';
import { ConfigService } from '@mmt/config';
import type { Config } from '@mmt/entities';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { SimilaritySearchService } from './services/similarity-search.js';

export interface Context {
  config: Config;
  indexer: VaultIndexer;
  fileRelocator: FileRelocator;
  operationRegistry: OperationRegistry;
  fs: NodeFileSystem;
  similaritySearch?: SimilaritySearchService;
}

export async function createContext(): Promise<Context> {
  // Load config from environment or default location
  const configPath = process.env.MMT_CONFIG || 'mmt.config.yaml';
  const configService = new ConfigService();
  const config = await configService.load(configPath);
  
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
  
  return {
    config,
    indexer,
    fileRelocator,
    operationRegistry,
    fs,
    similaritySearch,
  };
}