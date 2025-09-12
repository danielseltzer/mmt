import { SimilaritySearchService } from '@mmt/vault';
import type { Config } from '@mmt/entities';

/**
 * Factory function to create a SimilaritySearchService instance for testing
 * This wraps the actual service to match the test interface expectations
 */
export async function createSimilarityService(config: Partial<Config>): Promise<any> {
  // Convert old format to new format if needed
  let fullConfig: Config;
  
  if ('vaultPath' in config && 'indexPath' in config) {
    // Old format - convert to new format
    const { vaultPath, indexPath, ...rest } = config as any;
    fullConfig = {
      vaults: [{
        name: 'TestVault',
        path: vaultPath || '/tmp/test-vault',
        indexPath: indexPath || '/tmp/test-index',
        fileWatching: (config as any).fileWatching
      }],
      apiPort: 3001,
      webPort: 5173,
      ...rest
    } as Config;
  } else {
    // New format - ensure we have minimum required config
    fullConfig = {
      vaults: config.vaults || [{
        name: 'TestVault',
        path: '/tmp/test-vault',
        indexPath: '/tmp/test-index'
      }],
      apiPort: config.apiPort || 3001,
      webPort: config.webPort || 5173,
      ...config
    } as Config;
  }
  
  const service = new SimilaritySearchService(fullConfig);
  await service.initialize();
  
  // Wrap the service to match test expectations
  return {
    async indexDirectory(directory: string, pattern?: string) {
      return service.indexDirectory(directory, pattern);
    },
    
    async search(query: string, options?: { limit?: number }) {
      return service.search(query, options);
    },
    
    async getStatus() {
      const status = await service.getStatus();
      // Map to expected interface
      return {
        documentsIndexed: status.stats.documentsIndexed,
        indexSize: status.stats.indexSize,
        lastUpdated: status.stats.lastUpdated
      };
    },
    
    async shutdown() {
      return service.shutdown();
    },
    
    async indexFile(filePath: string, content?: string) {
      return service.indexFile(filePath, content);
    },
    
    async reindexFile(filePath: string, content?: string) {
      return service.reindexFile(filePath, content);
    },
    
    async removeFile(filePath: string) {
      return service.removeFile(filePath);
    },
    
    getIndexingErrors() {
      return service.getIndexingErrors();
    },
    
    clearIndexingErrors() {
      return service.clearIndexingErrors();
    }
  };
}