import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { VaultIndexer } from '../vault-indexer.js';
import { NodeFileSystem } from '@mmt/filesystem-access';

describe('Vault Relative Paths', () => {
  let tempDir: string;
  let vaultPath: string;
  let indexer: VaultIndexer;

  beforeAll(async () => {
    // Create temporary vault directory
    tempDir = mkdtempSync(join(tmpdir(), 'vault-paths-test-'));
    vaultPath = join(tempDir, 'vault');
    
    // Create directory structure with files at different levels
    mkdirSync(vaultPath, { recursive: true });
    mkdirSync(join(vaultPath, 'folder1'), { recursive: true });
    mkdirSync(join(vaultPath, 'folder1', 'subfolder'), { recursive: true });
    mkdirSync(join(vaultPath, 'folder2'), { recursive: true });
    
    // Create files at root
    writeFileSync(join(vaultPath, 'root-note.md'), '# Root Note');
    writeFileSync(join(vaultPath, 'index.md'), '# Index');
    
    // Create files in folders
    writeFileSync(join(vaultPath, 'folder1', 'note1.md'), '# Note 1');
    writeFileSync(join(vaultPath, 'folder1', 'subfolder', 'deep-note.md'), '# Deep Note');
    writeFileSync(join(vaultPath, 'folder2', 'note2.md'), '# Note 2');
    
    // Initialize indexer
    const fs = new NodeFileSystem();
    indexer = new VaultIndexer({
      vaultPath,
      fileSystem: fs,
      fileWatching: { enabled: false },
      useCache: false,
      useWorkers: false
    });
    
    await indexer.initialize();
  });

  afterAll(() => {
    // Clean up
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return "/" for files at vault root', () => {
    const documents = indexer.getAllDocuments();
    
    // Find root files
    const rootNote = documents.find(d => d.path.endsWith('root-note.md'));
    const indexFile = documents.find(d => d.path.endsWith('index.md'));
    
    expect(rootNote).toBeDefined();
    expect(indexFile).toBeDefined();
    
    // Check that folderPath shows "/" for root files
    expect(rootNote?.folderPath).toBe('/');
    expect(indexFile?.folderPath).toBe('/');
  });

  it('should return relative folder path for files in subdirectories', () => {
    const documents = indexer.getAllDocuments();
    
    // Find files in different folders
    const note1 = documents.find(d => d.path.endsWith('folder1/note1.md'));
    const deepNote = documents.find(d => d.path.endsWith('subfolder/deep-note.md'));
    const note2 = documents.find(d => d.path.endsWith('folder2/note2.md'));
    
    expect(note1).toBeDefined();
    expect(deepNote).toBeDefined();
    expect(note2).toBeDefined();
    
    // Check folder paths
    expect(note1?.folderPath).toBe('/folder1');
    expect(deepNote?.folderPath).toBe('/folder1/subfolder');
    expect(note2?.folderPath).toBe('/folder2');
  });

  it('should have a path property showing the full absolute path', () => {
    const documents = indexer.getAllDocuments();
    
    // All documents should have the full path
    documents.forEach(doc => {
      expect(doc.path).toContain(vaultPath);
      expect(doc.path).toMatch(/\.md$/u);
    });
  });

  it('should have metadata.name showing just the filename without extension', () => {
    const documents = indexer.getAllDocuments();
    
    const rootNote = documents.find(d => d.path.endsWith('root-note.md'));
    const note1 = documents.find(d => d.path.endsWith('note1.md'));
    
    expect(rootNote?.basename).toBe('root-note');
    expect(note1?.basename).toBe('note1');
  });

  it('should provide enough information to display "folder/filename" in UI', () => {
    const documents = indexer.getAllDocuments();
    
    // For each document, we should be able to construct a display path
    documents.forEach(doc => {
      const fileName = doc.basename || '';
      const folderPath = doc.folderPath || '/';
      
      // Should be able to create display like "/folder/filename"
      const displayPath = folderPath === '/' 
        ? `/${fileName}`
        : `${folderPath}/${fileName}`;
      
      expect(displayPath).toMatch(/^\//u); // Should start with /
      expect(displayPath).not.toContain(vaultPath); // Should not contain absolute path
    });
  });
});