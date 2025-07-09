import { VaultIndexer } from '@mmt/indexer';
import { FileRelocator } from '@mmt/file-relocator';
import { OperationRegistry, MoveOperation, UpdateFrontmatterOperation, RenameOperation, DeleteOperation } from '@mmt/document-operations';
import { ConfigService } from '@mmt/config';
import type { Config } from '@mmt/entities';
import { NodeFileSystem } from '@mmt/filesystem-access';

export interface Context {
  config: Config;
  indexer: VaultIndexer;
  fileRelocator: FileRelocator;
  operationRegistry: OperationRegistry;
  fs: NodeFileSystem;
}

export async function createContext(): Promise<Context> {
  // Load config from environment or default location
  const configPath = process.env.MMT_CONFIG || 'mmt.config.yaml';
  const configService = new ConfigService();
  const config = await configService.load(configPath);
  
  // Initialize services
  const fs = new NodeFileSystem();
  
  const indexer = new VaultIndexer({
    vaultPath: config.vaultPath,
    fileSystem: fs,
    cacheDir: config.indexPath,
    useCache: true,
    fileWatching: config.fileWatching,
  });
  await indexer.initialize();
  
  const fileRelocator = new FileRelocator(fs, {
    updateMovedFile: true,
    extensions: ['.md'],
  });
  
  // OperationRegistry already has default operations registered
  const operationRegistry = new OperationRegistry();
  
  return {
    config,
    indexer,
    fileRelocator,
    operationRegistry,
    fs,
  };
}