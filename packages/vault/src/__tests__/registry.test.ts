import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vaultRegistry } from '../registry.js';
import type { Config } from '@mmt/entities';
import { 
  TestVaultFactory, 
  suppressConsoleError
} from './test-utils.js';

describe('VaultRegistry', () => {
  let factory: TestVaultFactory;

  beforeEach(() => {
    factory = new TestVaultFactory();
    // Clear any previous test state
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await factory.cleanupAll();
    // Shutdown registry after each test to prevent resource leaks
    try {
      await vaultRegistry.shutdown();
    } catch {
      // Registry might already be shut down
    }
  });

  describe('initialization', () => {
    it('should initialize with single vault configuration', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'main.md': '# Main Document'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('main-vault', path)],
        apiPort: 3001,
        webPort: 5173
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('main-vault');
      expect(vault).toBeDefined();
      expect(vault.id).toBe('main-vault');
      expect(vault.config.path).toBe(path);
      expect(vault.status).toBe('ready');

      await cleanup();
    });

    it('should initialize with multiple vault configurations', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault({
        'vault1.md': '# Vault 1'
      });
      
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault({
        'vault2.md': '# Vault 2'
      });

      const config: Config = {
        vaults: [
          factory.createVaultConfig('vault-1', path1),
          factory.createVaultConfig('vault-2', path2)
        ],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      // Default vault (first) should be ready immediately
      const vault1 = vaultRegistry.getVault('vault-1');
      expect(vault1).toBeDefined();
      expect(vault1.status).toBe('ready');

      // Additional vault (second) initializes asynchronously
      const vault2 = vaultRegistry.getVault('vault-2');
      expect(vault2).toBeDefined();
      
      // Wait for second vault to be ready
      await factory.waitForVaultReady(vault2);
      expect(vault2.status).toBe('ready');

      await cleanup1();
      await cleanup2();
    });

    it('should prevent multiple initializations', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path)],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      // Second initialization should return the same promise
      const promise2 = vaultRegistry.initializeVaults(config);
      await expect(promise2).resolves.toBeUndefined();

      await cleanup();
    });

    it('should fail if no vault configurations provided', async () => {
      const config: Config = { vaults: [], apiPort: 3001, webPort: 5173 };
      
      await expect(vaultRegistry.initializeVaults(config))
        .rejects
        .toThrow('No vaults configured');
    });

    it('should throw error if default vault fails to initialize', async () => {
      const restoreConsoleError = suppressConsoleError();

      try {
        const config: Config = {
          vaults: [factory.createVaultConfig('bad-vault', '/nonexistent/path')],
          apiPort: 3001,
          webPort: 5173
        };
        
        await expect(vaultRegistry.initializeVaults(config))
          .rejects
          .toThrow('Failed to initialize default vault bad-vault');
        
      } finally {
        restoreConsoleError();
      }
    });

    it('should continue if additional vaults fail to initialize', async () => {
      const restoreConsoleError = suppressConsoleError();

      try {
        const { path: validPath, cleanup } = await factory.createTempVault();
        
        const config: Config = {
          vaults: [
            factory.createVaultConfig('valid-vault', validPath),
            factory.createVaultConfig('invalid-vault', '/nonexistent/path')
          ],
          apiPort: 3001,
          webPort: 5173
        };

        await vaultRegistry.initializeVaults(config);

        // Valid vault should be ready
        const validVault = vaultRegistry.getVault('valid-vault');
        expect(validVault.status).toBe('ready');

        // Invalid vault should exist but be in error state
        const invalidVault = vaultRegistry.getVault('invalid-vault');
        expect(invalidVault).toBeDefined();

        // Wait a bit for async initialization to fail
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(invalidVault.status).toBe('error');

        await cleanup();
      } finally {
        restoreConsoleError();
      }
    });
  });

  describe('vault access', () => {
    it('should get specific vault by ID', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path)],
        apiPort: 3001,
        webPort: 5173
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('test-vault');
      expect(vault).toBeDefined();
      expect(vault.id).toBe('test-vault');

      expect(() => vaultRegistry.getVault('does-not-exist'))
        .toThrow('Vault not found: does-not-exist');

      await cleanup();
    });

    it('should get default vault', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault();
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault();

      const config: Config = {
        vaults: [
          factory.createVaultConfig('first-vault', path1),
          factory.createVaultConfig('second-vault', path2)
        ],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      const defaultVault = vaultRegistry.getDefaultVault();
      expect(defaultVault).toBeDefined();
      expect(defaultVault?.id).toBe('first-vault');

      await cleanup1();
      await cleanup2();
    });

    it('should get all vaults', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault();
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault();

      const config: Config = {
        vaults: [
          factory.createVaultConfig('vault-1', path1),
          factory.createVaultConfig('vault-2', path2)
        ],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      const allVaults = vaultRegistry.getAllVaults();
      expect(allVaults).toHaveLength(2);

      const vaultIds = allVaults.map(v => v.id);
      expect(vaultIds).toContain('vault-1');
      expect(vaultIds).toContain('vault-2');

      await cleanup1();
      await cleanup2();
    });

    it('should get all vault IDs', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault();
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault();

      const config: Config = {
        vaults: [
          factory.createVaultConfig('vault-1', path1),
          factory.createVaultConfig('vault-2', path2)
        ],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      const vaultIds = vaultRegistry.getVaultIds();
      expect(vaultIds).toHaveLength(2);
      expect(vaultIds).toContain('vault-1');
      expect(vaultIds).toContain('vault-2');

      await cleanup1();
      await cleanup2();
    });

    it('should check if vault exists', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path)],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      expect(vaultRegistry.hasVault('test-vault')).toBe(true);
      expect(vaultRegistry.hasVault('non-existent')).toBe(false);

      await cleanup();
    });
  });

  describe('file watching', () => {
    it('should initialize vaults with file watching enabled', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config: Config = {
        vaults: [factory.createVaultConfig('watched-vault', path, true)],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('watched-vault');
      expect(vault).toBeDefined();
      expect(vault.status).toBe('ready');
      expect(vault.config.fileWatching?.enabled).toBe(true);

      await cleanup();
    });

    it('should handle mixed file watching configurations', async () => {
      const { path: watchedPath, cleanup: cleanup1 } = await factory.createTempVault();
      const { path: unwatchedPath, cleanup: cleanup2 } = await factory.createTempVault();

      const config: Config = {
        vaults: [
          factory.createVaultConfig('watched-vault', watchedPath, true),
          factory.createVaultConfig('unwatched-vault', unwatchedPath, false)
        ],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      const watchedVault = vaultRegistry.getVault('watched-vault');
      const unwatchedVault = vaultRegistry.getVault('unwatched-vault');

      expect(watchedVault.status).toBe('ready');
      expect(watchedVault.config.fileWatching?.enabled).toBe(true);
      
      await factory.waitForVaultReady(unwatchedVault);
      expect(unwatchedVault.status).toBe('ready');
      expect(unwatchedVault.config.fileWatching).toBeUndefined();

      await cleanup1();
      await cleanup2();
    });
  });

  describe('shutdown and cleanup', () => {
    it('should shutdown all vaults and clear registry', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault();
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault();

      const config: Config = {
        vaults: [
          factory.createVaultConfig('vault-1', path1),
          factory.createVaultConfig('vault-2', path2)
        ],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      // Verify vaults exist
      expect(vaultRegistry.getAllVaults()).toHaveLength(2);

      await vaultRegistry.shutdown();

      // Registry should be cleared
      expect(vaultRegistry.getAllVaults()).toHaveLength(0);
      expect(vaultRegistry.getVaultIds()).toHaveLength(0);

      await cleanup1();
      await cleanup2();
    });

    it('should handle shutdown when not initialized', async () => {
      // Should not throw
      // Should not throw even without await
      const promise = vaultRegistry.shutdown();
      await expect(promise).resolves.not.toThrow();
    });

    it('should allow re-initialization after shutdown', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path)],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);
      expect(vaultRegistry.getAllVaults()).toHaveLength(1);

      await vaultRegistry.shutdown();
      expect(vaultRegistry.getAllVaults()).toHaveLength(0);

      // Should be able to initialize again
      await vaultRegistry.initializeVaults(config);
      expect(vaultRegistry.getAllVaults()).toHaveLength(1);

      await cleanup();
    });
  });

  describe('singleton behavior', () => {
    it('should maintain singleton state', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path)],
        apiPort: 3001,
        webPort: 5173
      };

      await vaultRegistry.initializeVaults(config);

      // Import registry again (simulating different module)
      const { vaultRegistry: registry2 } = await import('../registry.js');
      
      // Should be the same instance
      expect(registry2).toBe(vaultRegistry);
      expect(registry2.getVault('test-vault')).toBeDefined();

      await cleanup();
    });
  });

  describe('error handling', () => {
    it('should handle vault initialization summary', async () => {
      const restoreConsoleError = suppressConsoleError();

      try {
        const { path: validPath, cleanup } = await factory.createTempVault();

        const config: Config = {
          vaults: [
            factory.createVaultConfig('valid-vault', validPath),
            factory.createVaultConfig('invalid-vault', '/nonexistent/path')
          ],
          apiPort: 3001,
          webPort: 5173
        };

        await vaultRegistry.initializeVaults(config);

        // Wait for async initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that initialization completed by checking vault states
        const allVaults = vaultRegistry.getAllVaults();
        expect(allVaults).toHaveLength(2);

        // One vault should be ready, one should have error
        const readyVaults = allVaults.filter(v => v.status === 'ready');
        const errorVaults = allVaults.filter(v => v.status === 'error');

        expect(readyVaults).toHaveLength(1);
        expect(errorVaults).toHaveLength(1);
        expect(readyVaults[0].id).toBe('valid-vault');
        expect(errorVaults[0].id).toBe('invalid-vault');

        await cleanup();
      } finally {
        restoreConsoleError();
      }
    });
  });
});