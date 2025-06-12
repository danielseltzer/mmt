/**
 * @fileoverview Tests for the filesystem-access package.
 * These tests are written FIRST before implementation (TDD).
 * NO MOCKS - all tests use real file operations in temp directories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FileSystemAccess } from './index.js';

// We'll import the actual implementation once it exists
// For now, this will fail, which is expected in TDD
import { NodeFileSystem } from './index.js';

describe('FileSystemAccess', () => {
  let fs: FileSystemAccess;
  let testDir: string;

  beforeEach(async () => {
    // Create a real temp directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'mmt-fs-test-'));
    fs = new NodeFileSystem();
  });

  afterEach(async () => {
    // Clean up the temp directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('readFile', () => {
    it('should read a text file', async () => {
      const filePath = join(testDir, 'test.md');
      const content = '# Test\n\nThis is a test file.';
      
      // First write a file using Node's fs (since our implementation doesn't exist yet)
      await fs.writeFile(filePath, content);
      
      // Now test reading it
      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = join(testDir, 'does-not-exist.md');
      
      await expect(fs.readFile(filePath)).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write content to a file', async () => {
      const filePath = join(testDir, 'new-file.md');
      const content = '# New File\n\nContent here.';
      
      await fs.writeFile(filePath, content);
      
      // Verify by reading it back
      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = join(testDir, 'existing.md');
      const originalContent = 'Original content';
      const newContent = 'New content';
      
      await fs.writeFile(filePath, originalContent);
      await fs.writeFile(filePath, newContent);
      
      const result = await fs.readFile(filePath);
      expect(result).toBe(newContent);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = join(testDir, 'nested', 'deep', 'file.md');
      const content = 'Nested file content';
      
      await fs.writeFile(filePath, content);
      
      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = join(testDir, 'exists.md');
      await fs.writeFile(filePath, 'content');
      
      const result = await fs.exists(filePath);
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = join(testDir, 'does-not-exist.md');
      
      const result = await fs.exists(filePath);
      expect(result).toBe(false);
    });

    it('should return true for directory', async () => {
      const dirPath = join(testDir, 'subdir');
      await fs.mkdir(dirPath);
      
      const result = await fs.exists(dirPath);
      expect(result).toBe(true);
    });
  });

  describe('mkdir', () => {
    it('should create a directory', async () => {
      const dirPath = join(testDir, 'new-dir');
      
      await fs.mkdir(dirPath);
      
      const exists = await fs.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('should create nested directories with recursive option', async () => {
      const dirPath = join(testDir, 'a', 'b', 'c');
      
      await fs.mkdir(dirPath, { recursive: true });
      
      const exists = await fs.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('should not throw if directory already exists with recursive option', async () => {
      const dirPath = join(testDir, 'existing-dir');
      await fs.mkdir(dirPath);
      
      // Should not throw
      await fs.mkdir(dirPath, { recursive: true });
      
      const exists = await fs.exists(dirPath);
      expect(exists).toBe(true);
    });
  });

  describe('readdir', () => {
    it('should list files in directory', async () => {
      // Create some test files
      await fs.writeFile(join(testDir, 'file1.md'), 'content1');
      await fs.writeFile(join(testDir, 'file2.md'), 'content2');
      await fs.mkdir(join(testDir, 'subdir'));
      
      const entries = await fs.readdir(testDir);
      
      expect(entries).toHaveLength(3);
      expect(entries).toContain('file1.md');
      expect(entries).toContain('file2.md');
      expect(entries).toContain('subdir');
    });

    it('should return empty array for empty directory', async () => {
      const emptyDir = join(testDir, 'empty');
      await fs.mkdir(emptyDir);
      
      const entries = await fs.readdir(emptyDir);
      
      expect(entries).toEqual([]);
    });

    it('should throw for non-existent directory', async () => {
      const fakePath = join(testDir, 'does-not-exist');
      
      await expect(fs.readdir(fakePath)).rejects.toThrow();
    });
  });

  describe('stat', () => {
    it('should return stats for a file', async () => {
      const filePath = join(testDir, 'test.md');
      const content = 'Test content';
      await fs.writeFile(filePath, content);
      
      const stats = await fs.stat(filePath);
      
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.size).toBe(content.length);
      expect(stats.mtime).toBeInstanceOf(Date);
    });

    it('should return stats for a directory', async () => {
      const dirPath = join(testDir, 'subdir');
      await fs.mkdir(dirPath);
      
      const stats = await fs.stat(dirPath);
      
      expect(stats.isFile()).toBe(false);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should throw for non-existent path', async () => {
      const fakePath = join(testDir, 'does-not-exist');
      
      await expect(fs.stat(fakePath)).rejects.toThrow();
    });
  });

  describe('unlink', () => {
    it('should delete a file', async () => {
      const filePath = join(testDir, 'to-delete.md');
      await fs.writeFile(filePath, 'delete me');
      
      await fs.unlink(filePath);
      
      const exists = await fs.exists(filePath);
      expect(exists).toBe(false);
    });

    it('should throw when deleting non-existent file', async () => {
      const fakePath = join(testDir, 'does-not-exist.md');
      
      await expect(fs.unlink(fakePath)).rejects.toThrow();
    });
  });

  describe('rename', () => {
    it('should move a file', async () => {
      const oldPath = join(testDir, 'old.md');
      const newPath = join(testDir, 'new.md');
      const content = 'File content';
      
      await fs.writeFile(oldPath, content);
      await fs.rename(oldPath, newPath);
      
      const oldExists = await fs.exists(oldPath);
      const newExists = await fs.exists(newPath);
      const newContent = await fs.readFile(newPath);
      
      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
      expect(newContent).toBe(content);
    });

    it('should move file to different directory', async () => {
      const oldPath = join(testDir, 'file.md');
      const newDir = join(testDir, 'subdir');
      const newPath = join(newDir, 'file.md');
      const content = 'Move me';
      
      await fs.mkdir(newDir);
      await fs.writeFile(oldPath, content);
      await fs.rename(oldPath, newPath);
      
      const oldExists = await fs.exists(oldPath);
      const newExists = await fs.exists(newPath);
      const newContent = await fs.readFile(newPath);
      
      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
      expect(newContent).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const oldPath = join(testDir, 'source.md');
      const newPath = join(testDir, 'target.md');
      const sourceContent = 'Source content';
      const targetContent = 'Target content';
      
      await fs.writeFile(oldPath, sourceContent);
      await fs.writeFile(newPath, targetContent);
      await fs.rename(oldPath, newPath);
      
      const oldExists = await fs.exists(oldPath);
      const newContent = await fs.readFile(newPath);
      
      expect(oldExists).toBe(false);
      expect(newContent).toBe(sourceContent);
    });
  });

  describe('hardLink', () => {
    it('should create a hard link to a file', async () => {
      const originalPath = join(testDir, 'original.md');
      const linkPath = join(testDir, 'link.md');
      const content = 'Shared content';
      
      await fs.writeFile(originalPath, content);
      await fs.hardLink(originalPath, linkPath);
      
      // Both should exist and have same content
      const originalContent = await fs.readFile(originalPath);
      const linkContent = await fs.readFile(linkPath);
      
      expect(originalContent).toBe(content);
      expect(linkContent).toBe(content);
      
      // Modifying one should affect the other (same inode)
      const newContent = 'Modified content';
      await fs.writeFile(linkPath, newContent);
      
      const updatedOriginal = await fs.readFile(originalPath);
      expect(updatedOriginal).toBe(newContent);
    });

    it('should throw when source does not exist', async () => {
      const fakePath = join(testDir, 'does-not-exist.md');
      const linkPath = join(testDir, 'link.md');
      
      await expect(fs.hardLink(fakePath, linkPath)).rejects.toThrow();
    });
  });

  describe('copyFile', () => {
    it('should copy a file', async () => {
      const sourcePath = join(testDir, 'source.md');
      const destPath = join(testDir, 'dest.md');
      const content = 'Copy this content';
      
      await fs.writeFile(sourcePath, content);
      await fs.copyFile(sourcePath, destPath);
      
      const sourceExists = await fs.exists(sourcePath);
      const destExists = await fs.exists(destPath);
      const destContent = await fs.readFile(destPath);
      
      expect(sourceExists).toBe(true);
      expect(destExists).toBe(true);
      expect(destContent).toBe(content);
      
      // Modifying copy should not affect original
      await fs.writeFile(destPath, 'Modified copy');
      const originalContent = await fs.readFile(sourcePath);
      expect(originalContent).toBe(content);
    });

    it('should overwrite existing destination', async () => {
      const sourcePath = join(testDir, 'source.md');
      const destPath = join(testDir, 'dest.md');
      const sourceContent = 'Source content';
      const destContent = 'Destination content';
      
      await fs.writeFile(sourcePath, sourceContent);
      await fs.writeFile(destPath, destContent);
      await fs.copyFile(sourcePath, destPath);
      
      const copiedContent = await fs.readFile(destPath);
      expect(copiedContent).toBe(sourceContent);
    });
  });

  describe('readMarkdownFile', () => {
    it('should parse markdown with frontmatter', async () => {
      const filePath = join(testDir, 'with-frontmatter.md');
      const content = `---
title: Test Document
tags: [test, example]
date: 2024-01-01
---

# Test Document

This is the content.`;
      
      await fs.writeFile(filePath, content);
      const result = await fs.readMarkdownFile(filePath);
      
      expect(result.content).toBe('\n# Test Document\n\nThis is the content.');
      expect(result.frontmatter).toEqual({
        title: 'Test Document',
        tags: ['test', 'example'],
        date: '2024-01-01'
      });
    });

    it('should handle markdown without frontmatter', async () => {
      const filePath = join(testDir, 'no-frontmatter.md');
      const content = '# Just Content\n\nNo frontmatter here.';
      
      await fs.writeFile(filePath, content);
      const result = await fs.readMarkdownFile(filePath);
      
      expect(result.content).toBe(content);
      expect(result.frontmatter).toEqual({});
    });

    it('should handle empty frontmatter', async () => {
      const filePath = join(testDir, 'empty-frontmatter.md');
      const content = `---
---

# Document`;
      
      await fs.writeFile(filePath, content);
      const result = await fs.readMarkdownFile(filePath);
      
      expect(result.content).toBe('\n# Document');
      expect(result.frontmatter).toEqual({});
    });
  });

  describe('writeMarkdownFile', () => {
    it('should write markdown with frontmatter', async () => {
      const filePath = join(testDir, 'output.md');
      const frontmatter = {
        title: 'Generated Document',
        tags: ['auto', 'test'],
        count: 42
      };
      const content = '# Generated\n\nThis was generated.';
      
      await fs.writeMarkdownFile(filePath, content, frontmatter);
      
      const written = await fs.readFile(filePath);
      expect(written).toContain('---');
      expect(written).toContain('title: Generated Document');
      expect(written).toContain('tags:');
      expect(written).toContain('  - auto');
      expect(written).toContain('  - test');
      expect(written).toContain('count: 42');
      expect(written).toContain('# Generated');
    });

    it('should write markdown without frontmatter', async () => {
      const filePath = join(testDir, 'no-fm.md');
      const content = '# Plain Document';
      
      await fs.writeMarkdownFile(filePath, content);
      
      const written = await fs.readFile(filePath);
      expect(written).toBe(content);
      expect(written).not.toContain('---');
    });

    it('should handle empty frontmatter object', async () => {
      const filePath = join(testDir, 'empty-fm.md');
      const content = '# Document';
      
      await fs.writeMarkdownFile(filePath, content, {});
      
      const written = await fs.readFile(filePath);
      expect(written).toBe(content);
      expect(written).not.toContain('---');
    });
  });
});