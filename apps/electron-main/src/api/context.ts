import { NodeFileSystem } from '@mmt/filesystem-access';
import { VaultIndexer } from '@mmt/indexer';
import { QueryParser } from '@mmt/query-parser';
import { OperationRegistry } from '@mmt/document-operations';
import { FileRelocator } from '@mmt/file-relocator';
import { ScriptRunner } from '@mmt/scripting';
import type { Config } from '@mmt/entities';

export interface Context {
  config: Config;
  fileSystem: NodeFileSystem;
  indexer: VaultIndexer;
  queryParser: QueryParser;
  operationRegistry: OperationRegistry;
  fileRelocator: FileRelocator;
  scriptRunner: ScriptRunner;
}

export async function createContext(config: Config): Promise<Context> {
  const fileSystem = new NodeFileSystem();
  
  // Initialize indexer
  const indexer = new VaultIndexer({
    vaultPath: config.vaultPath,
    fileSystem,
    useCache: true,
    useWorkers: true,
    fileWatching: {
      enabled: true,
      debounceMs: 500,
    },
  });
  
  await indexer.initialize();
  
  // Create other services
  const queryParser = new QueryParser();
  const operationRegistry = new OperationRegistry();
  const fileRelocator = new FileRelocator(fileSystem);
  
  const scriptRunner = new ScriptRunner({
    config,
    fileSystem,
    queryParser,
    outputStream: process.stdout,
  });
  
  return {
    config,
    fileSystem,
    indexer,
    queryParser,
    operationRegistry,
    fileRelocator,
    scriptRunner,
  };
}