import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { VaultRegistry } from '../registry.js';
import { Vault } from '../vault.js';
import type { Config } from '@mmt/entities';

describe('Vault Isolation', () => {
  let tempDir: string;
  let personalVaultPath: string;
  let workVaultPath: string;
  let config: Config;
  let registry: VaultRegistry;

  beforeAll(() => {
    // Create temporary directories for vaults
    tempDir = mkdtempSync(join(tmpdir(), 'vault-isolation-test-'));
    personalVaultPath = join(tempDir, 'personal');
    workVaultPath = join(tempDir, 'work');
    
    mkdirSync(personalVaultPath, { recursive: true });
    mkdirSync(workVaultPath, { recursive: true });
    
    // Create different markdown files in each vault
    writeFileSync(
      join(personalVaultPath, 'personal-note.md'),
      '# Personal Note\nThis is a personal note.'
    );
    writeFileSync(
      join(personalVaultPath, 'diary.md'),
      '# Diary\nPersonal diary entry.'
    );
    
    writeFileSync(
      join(workVaultPath, 'meeting-notes.md'),
      '# Meeting Notes\nWork meeting notes.'
    );
    writeFileSync(
      join(workVaultPath, 'project-plan.md'),
      '# Project Plan\nWork project planning.'
    );
    
    // Create config with multiple vaults
    config = {
      vaults: [
        {
          name: 'Personal',
          path: personalVaultPath,
          indexPath: join(tempDir, '.index-personal'),
          fileWatching: { 
            enabled: false,
            debounceMs: 500,
            ignorePatterns: []
          }
        },
        {
          name: 'Work',
          path: workVaultPath,
          indexPath: join(tempDir, '.index-work'),
          fileWatching: { 
            enabled: false,
            debounceMs: 500,
            ignorePatterns: []
          }
        }
      ],
      apiPort: 3001,
      webPort: 5173
    };
    
    registry = VaultRegistry.getInstance();
  });

  afterAll(() => {
    // Clean up
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return different documents for different vaults', async () => {
    // Initialize vaults
    await registry.initializeVaults(config);
    
    // Get Personal vault
    const personalVault = registry.getVault('Personal');
    expect(personalVault).toBeDefined();
    expect(personalVault.config.path).toBe(personalVaultPath);
    
    // Get Work vault
    const workVault = registry.getVault('Work');
    expect(workVault).toBeDefined();
    expect(workVault.config.path).toBe(workVaultPath);
    
    // Get documents from Personal vault
    const personalDocs = await personalVault.indexer.getAllDocuments();
    const personalPaths = personalDocs.map(doc => doc.path);
    
    // Get documents from Work vault
    const workDocs = await workVault.indexer.getAllDocuments();
    const workPaths = workDocs.map(doc => doc.path);
    
    // Verify Personal vault only contains personal documents
    expect(personalDocs).toHaveLength(2);
    expect(personalPaths).toContain(join(personalVaultPath, 'personal-note.md'));
    expect(personalPaths).toContain(join(personalVaultPath, 'diary.md'));
    expect(personalPaths).not.toContain(join(workVaultPath, 'meeting-notes.md'));
    expect(personalPaths).not.toContain(join(workVaultPath, 'project-plan.md'));
    
    // Verify Work vault only contains work documents
    expect(workDocs).toHaveLength(2);
    expect(workPaths).toContain(join(workVaultPath, 'meeting-notes.md'));
    expect(workPaths).toContain(join(workVaultPath, 'project-plan.md'));
    expect(workPaths).not.toContain(join(personalVaultPath, 'personal-note.md'));
    expect(workPaths).not.toContain(join(personalVaultPath, 'diary.md'));
    
    // Verify the documents have different content
    const personalNote = personalDocs.find(d => d.path.includes('personal-note.md'));
    const meetingNotes = workDocs.find(d => d.path.includes('meeting-notes.md'));
    
    expect(personalNote).toBeDefined();
    expect(meetingNotes).toBeDefined();
    expect(personalNote?.path).not.toBe(meetingNotes?.path);
  });
  
  it('should maintain separate indexer instances for each vault', async () => {
    await registry.initializeVaults(config);
    
    const personalVault = registry.getVault('Personal');
    const workVault = registry.getVault('Work');
    
    // Verify indexers are different instances
    expect(personalVault.indexer).not.toBe(workVault.indexer);
    
    // Verify each vault returns documents from its own path
    const personalDocs = await personalVault.indexer.getAllDocuments();
    const workDocs = await workVault.indexer.getAllDocuments();
    
    // All personal docs should be from personal vault path
    personalDocs.forEach(doc => {
      expect(doc.path).toContain(personalVaultPath);
    });
    
    // All work docs should be from work vault path
    workDocs.forEach(doc => {
      expect(doc.path).toContain(workVaultPath);
    });
  });
});