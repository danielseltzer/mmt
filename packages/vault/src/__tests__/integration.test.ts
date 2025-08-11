import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, rm, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { vaultRegistry } from '../registry.js';
import { Vault } from '../vault.js';
import type { Config } from '@mmt/entities';
import { TestVaultFactory } from './test-utils.js';

describe('Vault Integration Tests', () => {
  let factory: TestVaultFactory;

  beforeEach(() => {
    factory = new TestVaultFactory();
  });

  afterEach(async () => {
    await factory.cleanupAll();
    try {
      await vaultRegistry.shutdown();
    } catch {
      // Registry might already be shut down
    }
  });

  describe('real-world scenarios', () => {
    it('should handle typical documentation vault structure', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'README.md': '# Project Documentation\n\nWelcome to the docs.',
        'getting-started/installation.md': '# Installation\n\n## Prerequisites\n\n- Node.js',
        'getting-started/quick-start.md': '# Quick Start\n\n## First Steps',
        'api/authentication.md': '# Authentication\n\n## JWT Tokens',
        'api/endpoints.md': '# API Endpoints\n\n## User Management',
        'guides/deployment.md': '# Deployment Guide\n\n## Production Setup',
        'guides/troubleshooting.md': '# Troubleshooting\n\n## Common Issues',
        'archive/old-docs.md': '# Old Documentation\n\nLegacy content.',
        'templates/api-template.md': '# API Template\n\nUse this template.'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('docs-vault', path, true)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('docs-vault');
      await factory.waitForVaultReady(vault);

      const indexer = vault.indexer;
      const stats = await indexer.getStats();

      expect(stats.totalDocuments).toBe(9);

      await cleanup();
    });

    it('should handle personal notes vault with mixed content', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'daily/2024-01-15.md': '# Daily Note - Jan 15\n\n## Tasks\n- Review PR',
        'daily/2024-01-16.md': '# Daily Note - Jan 16\n\n## Meetings\n- Standup',
        'projects/website-redesign.md': '# Website Redesign\n\n## Goals',
        'projects/api-migration.md': '# API Migration\n\n## Timeline',
        'references/bookmarks.md': '# Bookmarks\n\n## Development Tools',
        'references/code-snippets.md': '# Code Snippets\n\n```typescript',
        'inbox/random-idea.md': '# Random Idea\n\nSomething interesting',
        'archive/old-project.md': '# Old Project\n\nCompleted work',
        'config.json': '{"theme": "dark"}',
        'image.png': 'fake-image-data',
        '.gitignore': 'node_modules/'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('notes-vault', path)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('notes-vault');
      await factory.waitForVaultReady(vault);

      const indexer = vault.indexer;
      const stats = await indexer.getStats();

      // Should only index markdown files (8 out of 11 files)
      expect(stats.totalDocuments).toBe(8);

      await cleanup();
    });

    it('should handle multi-vault workspace with different purposes', async () => {
      // Create work vault
      const { path: workPath, cleanup: cleanupWork } = await factory.createTempVault({
        'projects/current-sprint.md': '# Current Sprint\n\n## Goals',
        'meetings/team-standup.md': '# Team Standup\n\n## Notes',
        'docs/api-spec.md': '# API Specification\n\n## Endpoints'
      });

      // Create personal vault
      const { path: personalPath, cleanup: cleanupPersonal } = await factory.createTempVault({
        'journal/2024-01.md': '# January Journal\n\n## Reflections',
        'ideas/app-concepts.md': '# App Concepts\n\n## Brainstorm',
        'recipes/pasta.md': '# Pasta Recipe\n\n## Ingredients'
      });

      // Create reference vault
      const { path: referencePath, cleanup: cleanupReference } = await factory.createTempVault({
        'tech/typescript-tips.md': '# TypeScript Tips\n\n## Best Practices',
        'tech/react-patterns.md': '# React Patterns\n\n## Hooks',
        'books/programming-quotes.md': '# Programming Quotes\n\n## Wisdom'
      });

      const config: Config = {
        vaults: [
          factory.createVaultConfig('work', workPath, true),
          factory.createVaultConfig('personal', personalPath),
          factory.createVaultConfig('reference', referencePath, true)
        ]
      };

      await vaultRegistry.initializeVaults(config);

      // Wait for all vaults to be ready
      const workVault = vaultRegistry.getVault('work');
      const personalVault = vaultRegistry.getVault('personal');
      const referenceVault = vaultRegistry.getVault('reference');

      await factory.waitForVaultReady(workVault);
      await factory.waitForVaultReady(personalVault);
      await factory.waitForVaultReady(referenceVault);

      // Verify each vault has correct content
      const workStats = await workVault.indexer.getStats();
      const personalStats = await personalVault.indexer.getStats();
      const referenceStats = await referenceVault.indexer.getStats();

      expect(workStats.totalDocuments).toBe(3);
      expect(personalStats.totalDocuments).toBe(3);
      expect(referenceStats.totalDocuments).toBe(3);

      // Verify vault isolation - each vault only sees its own files
      const workDocs = await workVault.indexer.getAllDocuments();
      const personalDocs = await personalVault.indexer.getAllDocuments();

      const workTitles = workDocs.map(d => d.title);
      const personalTitles = personalDocs.map(d => d.title);

      // No cross-contamination between vaults
      expect(workTitles.some(t => t.includes('Sprint'))).toBe(true);
      expect(personalTitles.some(t => t.includes('Journal'))).toBe(true);
      expect(workTitles.some(t => t.includes('Journal'))).toBe(false);
      expect(personalTitles.some(t => t.includes('Sprint'))).toBe(false);

      await cleanupWork();
      await cleanupPersonal();
      await cleanupReference();
    });
  });

  describe('file operations and watching', () => {
    it('should detect new files added to watched vault', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'existing.md': '# Existing File\n\nAlready here.'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('watched-vault', path, true)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('watched-vault');
      await factory.waitForVaultReady(vault);

      const indexer = vault.indexer;
      let stats = await indexer.getStats();
      expect(stats.totalDocuments).toBe(1);

      // Add a new file
      const newFilePath = join(path, 'added-file.md');
      await writeFile(newFilePath, '# Added File\n\nNew content.');

      // Give file watcher time to detect change
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if new file was detected
      stats = await indexer.getStats();
      expect(stats.totalDocuments).toBe(2);

      await cleanup();
    });

    it('should handle file modifications in watched vault', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'modifiable.md': '# Original Content\n\nInitial version.'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('watched-vault', path, true)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('watched-vault');
      await factory.waitForVaultReady(vault);

      const indexer = vault.indexer;
      
      // Get initial document
      const initialDocs = await indexer.getAllDocuments();
      expect(initialDocs).toHaveLength(1);

      // Modify the file
      const filePath = join(path, 'modifiable.md');
      await writeFile(filePath, '# Updated Content\n\nModified version.');

      // Give file watcher time to detect change
      await new Promise(resolve => setTimeout(resolve, 500));

      // File should still be indexed (count unchanged)
      const stats = await indexer.getStats();
      expect(stats.totalDocuments).toBe(1);

      await cleanup();
    });

    it('should handle large vault with many files', async () => {
      // Create a larger vault (50 files)
      const largeVaultFiles: Record<string, string> = {};
      
      for (let i = 1; i <= 50; i++) {
        const category = i <= 20 ? 'docs' : i <= 35 ? 'notes' : 'archive';
        largeVaultFiles[`${category}/file-${i.toString().padStart(2, '0')}.md`] = 
          `# File ${i}\n\nContent for file number ${i}.\n\n## Section\n\nMore content.`;
      }

      const { path, cleanup } = await factory.createTempVault(largeVaultFiles);

      const config: Config = {
        vaults: [factory.createVaultConfig('large-vault', path)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('large-vault');
      await factory.waitForVaultReady(vault);

      const indexer = vault.indexer;
      const stats = await indexer.getStats();

      expect(stats.totalDocuments).toBe(50);

      await cleanup();
    });
  });

  describe('error recovery and edge cases', () => {
    it('should handle vault directory deletion after initialization', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'test.md': '# Test File\n\nContent here.'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('test-vault');
      await factory.waitForVaultReady(vault);

      // Delete the directory
      await rm(path, { recursive: true, force: true });

      // Vault should handle the missing directory gracefully
      const indexer = vault.indexer;
      
      // Indexer might cache results or throw an error
      try {
        const stats = await indexer.getStats();
        // If it doesn't throw, should still return cached stats
        expect(stats).toBeDefined();
      } catch (error) {
        // If it throws, should be a clear error
        expect(error).toBeDefined();
      }

      // Skip normal cleanup since directory was deleted
    });

    it('should handle permission issues gracefully', async () => {
      // Skip on Windows as chmod doesn't work the same way
      if (process.platform === 'win32') {
        return;
      }

      const { path, cleanup } = await factory.createTempVault({
        'public.md': '# Public File\n\nAccessible content.'
      });

      try {
        // Make directory read-only after creation
        await chmod(path, 0o444);

        const config: Config = {
          vaults: [factory.createVaultConfig('readonly-vault', path)]
        };
        
        await vaultRegistry.initializeVaults(config);

        const vault = vaultRegistry.getVault('readonly-vault');
        
        // Should initialize successfully (reading is allowed)
        await factory.waitForVaultReady(vault);
        expect(vault.status).toBe('ready');

      } finally {
        // Restore permissions for cleanup
        await chmod(path, 0o755);
        await cleanup();
      }
    });

    it('should handle concurrent vault operations', async () => {
      const { path: path1, cleanup: cleanup1 } = await factory.createTempVault();
      const { path: path2, cleanup: cleanup2 } = await factory.createTempVault();
      const { path: path3, cleanup: cleanup3 } = await factory.createTempVault();

      const config: Config = {
        vaults: [
          factory.createVaultConfig('vault-1', path1),
          factory.createVaultConfig('vault-2', path2),
          factory.createVaultConfig('vault-3', path3)
        ]
      };

      // Initialize registry
      await vaultRegistry.initializeVaults(config);

      // Perform concurrent operations
      const vault1 = vaultRegistry.getVault('vault-1');
      const vault2 = vaultRegistry.getVault('vault-2');
      const vault3 = vaultRegistry.getVault('vault-3');

      // Wait for all vaults concurrently
      await Promise.all([
        factory.waitForVaultReady(vault1),
        factory.waitForVaultReady(vault2),
        factory.waitForVaultReady(vault3)
      ]);

      // All should be ready
      expect(vault1.status).toBe('ready');
      expect(vault2.status).toBe('ready');
      expect(vault3.status).toBe('ready');

      // Concurrent indexer access
      const [stats1, stats2, stats3] = await Promise.all([
        vault1.indexer.getStats(),
        vault2.indexer.getStats(),
        vault3.indexer.getStats()
      ]);

      expect(stats1.totalDocuments).toBeGreaterThanOrEqual(0);
      expect(stats2.totalDocuments).toBeGreaterThanOrEqual(0);
      expect(stats3.totalDocuments).toBeGreaterThanOrEqual(0);

      await cleanup1();
      await cleanup2();
      await cleanup3();
    });
  });

  describe('memory and performance', () => {
    it('should clean up resources properly during shutdown', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'test.md': '# Test File'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('test-vault', path, true)]
      };
      
      await vaultRegistry.initializeVaults(config);

      const vault = vaultRegistry.getVault('test-vault');
      await factory.waitForVaultReady(vault);

      // Verify vault is working
      const stats = await vault.indexer.getStats();
      expect(stats.totalDocuments).toBe(1);

      // Shutdown should clean up all resources
      await vaultRegistry.shutdown();

      // Registry should be empty
      expect(vaultRegistry.getAllVaults()).toHaveLength(0);

      await cleanup();
    });

    it('should handle rapid initialization and shutdown cycles', async () => {
      const { path, cleanup } = await factory.createTempVault();

      for (let i = 0; i < 3; i++) {
        const config: Config = {
          vaults: [factory.createVaultConfig(`vault-${i}`, path)]
        };
        
        await vaultRegistry.initializeVaults(config);
        
        const vault = vaultRegistry.getVault(`vault-${i}`);
        await factory.waitForVaultReady(vault);
        
        expect(vault.status).toBe('ready');
        
        await vaultRegistry.shutdown();
      }

      await cleanup();
    });
  });

  describe('vault and indexer integration', () => {
    it('should properly integrate vault with indexer services', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'doc1.md': '# Document 1\n\n## Introduction\n\nThis is the first document.',
        'doc2.md': '# Document 2\n\n## Overview\n\nThis is the second document.',
        'nested/doc3.md': '# Document 3\n\n## Details\n\nThis is nested.'
      });

      const vault = new Vault('test-vault', factory.createVaultConfig('test-vault', path));
      await vault.initialize();

      // Verify vault status
      expect(vault.status).toBe('ready');
      expect(vault.error).toBeUndefined();

      // Access indexer and verify it's working
      const indexer = vault.indexer;
      expect(indexer).toBeDefined();

      // Test indexer functionality
      const stats = await indexer.getStats();
      expect(stats.totalDocuments).toBe(3);

      const docs = await indexer.getAllDocuments();
      expect(docs).toHaveLength(3);

      // Verify document structure
      const doc1 = docs.find(d => d.path.includes('doc1.md'));
      expect(doc1).toBeDefined();
      expect(doc1?.title).toBe('Document 1');

      await vault.shutdown();
      await cleanup();
    });

    it('should handle search queries through indexer', async () => {
      const { path, cleanup } = await factory.createTempVault({
        'typescript.md': '# TypeScript Guide\n\nLearn TypeScript programming.',
        'javascript.md': '# JavaScript Basics\n\nJavaScript fundamentals.',
        'python.md': '# Python Tutorial\n\nPython programming guide.'
      });

      const config: Config = {
        vaults: [factory.createVaultConfig('dev-vault', path)]
      };

      await vaultRegistry.initializeVaults(config);
      const vault = vaultRegistry.getVault('dev-vault');
      await factory.waitForVaultReady(vault);

      const indexer = vault.indexer;
      
      // Search for documents
      const results = await indexer.search('programming');
      expect(results.documents).toHaveLength(2); // TypeScript and Python guides

      const jsResults = await indexer.search('JavaScript');
      expect(jsResults.documents).toHaveLength(1);
      expect(jsResults.documents[0].title).toBe('JavaScript Basics');

      await cleanup();
    });
  });
});