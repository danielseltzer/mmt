import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Vault } from '../vault.js';
import { TestVaultFactory } from './test-utils.js';

describe('Vault', () => {
  let factory: TestVaultFactory;

  beforeEach(() => {
    factory = new TestVaultFactory();
  });

  afterEach(async () => {
    await factory.cleanupAll();
  });

  describe('initialization', () => {
    it('should start with initializing status', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config = factory.createVaultConfig('test-vault', path);
      
      const vault = new Vault('test-vault', config);
      
      expect(vault.status).toBe('initializing');
      expect(vault.id).toBe('test-vault');
      expect(vault.config.path).toBe(path);
      expect(vault.error).toBeUndefined();

      await cleanup();
    });

    it('should transition to ready status when initialization succeeds', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'test.md': '# Test File\n\nSome content.'
      });
      
      const config = factory.createVaultConfig('test-vault', path);
      const vault = new Vault('test-vault', config);
      
      await vault.initialize();
      
      expect(vault.status).toBe('ready');
      expect(vault.error).toBeUndefined();

      await cleanup();
    });

    it('should transition to error status when vault path does not exist', async () => {
      const nonExistentPath = '/path/that/does/not/exist';
      const config = factory.createVaultConfig('test-vault', nonExistentPath);
      const vault = new Vault('test-vault', config);

      await expect(vault.initialize()).rejects.toThrow();
      
      expect(vault.status).toBe('error');
      expect(vault.error).toBeDefined();
      expect(vault.error?.message).toContain('ENOENT');
    });

    it('should handle file watching configuration', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config = factory.createVaultConfig('watched-vault', path, true);
      
      const vault = new Vault('watched-vault', config);
      await vault.initialize();
      
      expect(vault.status).toBe('ready');
      expect(vault.config.fileWatching?.enabled).toBe(true);

      vault.shutdown();
      await cleanup();
    });
  });

  describe('indexer access', () => {
    it('should provide indexer when vault is ready', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'doc1.md': '# Document 1\n\nContent here.',
        'doc2.md': '# Document 2\n\nMore content.'
      });
      
      const config = factory.createVaultConfig('test-vault', path);
      const vault = new Vault('test-vault', config);
      await vault.initialize();
      
      const {indexer} = vault;
      expect(indexer).toBeDefined();
      
      // Test that indexer is functional
      const documents = indexer.getAllDocuments();
      expect(documents).toHaveLength(2);

      await cleanup();
    });

    it('should throw error when accessing indexer before initialization', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config = factory.createVaultConfig('test-vault', path);
      const vault = new Vault('test-vault', config);

      // Should throw while still initializing
      expect(() => vault.indexer).toThrow('Vault test-vault is not initialized or failed to initialize');

      await cleanup();
    });

    it('should throw error when accessing indexer after initialization failed', async () => {
      const config = factory.createVaultConfig('test-vault', '/nonexistent/path');
      const vault = new Vault('test-vault', config);
      
      try {
        await vault.initialize();
      } catch {
        // Expected to fail
      }

      expect(vault.status).toBe('error');
      expect(() => vault.indexer).toThrow('Vault test-vault is not initialized or failed to initialize');
    });
  });

  describe('lifecycle management', () => {
    it('should shutdown successfully when ready', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config = factory.createVaultConfig('test-vault', path, true);
      const vault = new Vault('test-vault', config);
      
      await vault.initialize();
      expect(vault.status).toBe('ready');
      
      // Should not throw
      expect(() => {
        vault.shutdown();
      }).not.toThrow();

      await cleanup();
    });

    it('should reset status to initializing after shutdown', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config = factory.createVaultConfig('test-vault', path);
      const vault = new Vault('test-vault', config);
      
      await vault.initialize();
      expect(vault.status).toBe('ready');
      
      vault.shutdown();
      expect(vault.status).toBe('initializing');
      expect(vault.services).toBeUndefined();

      await cleanup();
    });

    it('should handle file watching lifecycle', async () => {
      const { path, cleanup } = await factory.createTempVault();
      const config = factory.createVaultConfig('test-vault', path, true);
      const vault = new Vault('test-vault', config);
      
      await vault.initialize();
      
      // Add a new file to test file watching
      const newFilePath = join(path, 'new-file.md');
      await writeFile(newFilePath, '# New File\n\nAdded after initialization.');
      
      // Give file watcher time to detect the change
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Shutdown should stop file watching
      vault.shutdown();

      await cleanup();
    });
  });

  describe('multiple vaults', () => {
    it('should handle multiple independent vaults', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault({
        'vault1.md': '# Vault 1 File'
      });
      
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault({
        'vault2.md': '# Vault 2 File'
      });

      const config1 = factory.createVaultConfig('vault-1', path1);
      const config2 = factory.createVaultConfig('vault-2', path2);
      
      const vault1 = new Vault('vault-1', config1);
      const vault2 = new Vault('vault-2', config2);

      await vault1.initialize();
      await vault2.initialize();

      expect(vault1.id).toBe('vault-1');
      expect(vault2.id).toBe('vault-2');
      expect(vault1.config.path).toBe(path1);
      expect(vault2.config.path).toBe(path2);

      // Each vault should have its own indexer
      const docs1 = vault1.indexer.getAllDocuments();
      const docs2 = vault2.indexer.getAllDocuments();

      expect(docs1).toHaveLength(1);
      expect(docs2).toHaveLength(1);

      await cleanup1();
      await cleanup2();
    });
  });

  describe('edge cases', () => {
    it('should handle empty vault directory', async () => {
      const { path, cleanup } = await factory.createTempVault({});
      const config = factory.createVaultConfig('empty-vault', path);
      const vault = new Vault('empty-vault', config);
      
      await vault.initialize();
      
      const documents = vault.indexer.getAllDocuments();
      expect(documents).toHaveLength(3); // Default test files
      
      await cleanup();
    });

    it('should handle vault with only non-markdown files', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'text.txt': 'Plain text file',
        'config.json': '{"key": "value"}',
        'image.png': 'fake image data'
      });
      
      const config = factory.createVaultConfig('non-md-vault', path);
      const vault = new Vault('non-md-vault', config);
      await vault.initialize();
      
      // Indexer should only pick up markdown files
      const documents = vault.indexer.getAllDocuments();
      expect(documents).toHaveLength(0);
      
      await cleanup();
    });

    it('should handle deeply nested markdown files', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'level1/level2/level3/deep.md': '# Deep File\n\nNested content.',
        'level1/sibling.md': '# Sibling\n\nSibling to deep path.',
        'root.md': '# Root\n\nAt root level.'
      });
      
      const config = factory.createVaultConfig('nested-vault', path);
      const vault = new Vault('nested-vault', config);
      await vault.initialize();
      
      const documents = vault.indexer.getAllDocuments();
      expect(documents).toHaveLength(3);
      
      await cleanup();
    });
  });
});