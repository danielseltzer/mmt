import { VaultIndexer } from '@mmt/indexer';
import { FileRelocator } from '@mmt/file-relocator';
import { OperationRegistry, MoveOperation, UpdateFrontmatterOperation, RenameOperation, DeleteOperation } from '@mmt/document-operations';
import { ConfigService } from '@mmt/config';
import type { Config } from '@mmt/entities';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { vaultRegistry } from '@mmt/vault';

export interface Context {
  config: Config;
  indexer: VaultIndexer; // Legacy: for backward compatibility
  fileRelocator: FileRelocator;
  operationRegistry: OperationRegistry;
  fs: NodeFileSystem;
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
  
  // Note: Similarity search is now initialized per-vault in the Vault class
  // Access via: vaultRegistry.getVault(vaultId).similaritySearch
  
  return {
    config,
    indexer: vault.indexer,
    fileRelocator,
    operationRegistry,
    fs,
    vaultRegistry,
  };
}