/**
 * @fileoverview Tests for vault operations (TDD - tests first!)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import type { Vault, Document, DocumentSet } from '@mmt/entities';
import { TestVault, vaultAssertions } from '../test/test-utils.js';
import { loadVault, createVaultContext } from './vault.js';

describe('Vault Operations', () => {
  const testVault = new TestVault();
  let vault: Vault;
  let vaultPath: string;
  
  beforeEach(async () => {
    vaultPath = await testVault.setup();
    vault = await loadVault(vaultPath);
  });
  
  afterEach(async () => {
    await testVault.cleanup();
  });
  
  describe('loadVault', () => {
    it('should load all markdown files from directory', () => {
      // Should have loaded 9 test files
      expect(vault.documents.size).toBe(9);
      expect(vault.basePath).toBe(vaultPath);
    });
    
    it('should parse frontmatter correctly', () => {
      const draftPost = vault.documents.get(join(vaultPath, 'posts/draft-post.md'));
      expect(draftPost).toBeDefined();
      expect(draftPost!.metadata.frontmatter.status).toBe('draft');
      expect(draftPost!.metadata.frontmatter.tags).toEqual(['blog', 'testing']);
    });
    
    it('should extract links from content', () => {
      const publishedPost = vault.documents.get(join(vaultPath, 'posts/published-post.md'));
      expect(publishedPost).toBeDefined();
      expect(publishedPost!.metadata.links).toContain('draft-post');
      expect(publishedPost!.metadata.links).toContain('../projects/active/project-a');
    });
    
    it('should build indices correctly', () => {
      // Tag index
      expect(vault.index.byTag.get('blog')).toHaveLength(2);
      expect(vault.index.byTag.get('testing')).toHaveLength(1);
      
      // Path index
      expect(vault.index.byPath.get('posts')).toHaveLength(2);
      expect(vault.index.byPath.get('projects/active')).toHaveLength(2);
    });
  });
  
  describe('select operation', () => {
    it('should select all documents with empty query', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({});
      
      expect(result.selection.documents).toHaveLength(9);
    });
    
    it('should select by filesystem path pattern', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 'fs:path': 'posts/**' });
      
      expect(result.selection.documents).toHaveLength(2);
      result.selection.documents.forEach(doc => {
        expect(doc.path).toMatch(/posts\//);
      });
    });
    
    it('should select by exact filesystem name', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 'fs:name': 'draft-post' });
      
      expect(result.selection.documents).toHaveLength(1);
      expect(result.selection.documents[0].metadata.name).toBe('draft-post');
    });
    
    it('should select by frontmatter property', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 'fm:status': 'draft' });
      
      expect(result.selection.documents).toHaveLength(1);
      expect(result.selection.documents[0].metadata.frontmatter.status).toBe('draft');
    });
    
    it('should select by frontmatter tag with contains operator', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 
        'fm:tags': { $contains: 'blog' } 
      });
      
      expect(result.selection.documents).toHaveLength(2);
      result.selection.documents.forEach(doc => {
        expect(doc.metadata.frontmatter.tags).toContain('blog');
      });
    });
    
    it('should combine multiple criteria with AND', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 
        'fs:path': 'posts/**',
        'fm:status': 'published'
      });
      
      expect(result.selection.documents).toHaveLength(1);
      const doc = result.selection.documents[0];
      expect(doc.path).toMatch(/posts\//);
      expect(doc.metadata.frontmatter.status).toBe('published');
    });
    
    it('should select by content text search', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 
        'content:text': 'draft post'
      });
      
      expect(result.selection.documents).toHaveLength(1); // Only in the draft post itself
      expect(result.selection.documents[0].metadata.name).toBe('draft-post');
    });
    
    it('should select by inline tags', () => {
      const ctx = createVaultContext(vault);
      const result = ctx.select({ 
        'inline:tags': { $contains: '#active' }
      });
      
      expect(result.selection.documents).toHaveLength(1);
      expect(result.selection.documents[0].content).toContain('#active');
    });
    
    it('should handle frontmatter property that conflicts with fs property', () => {
      const ctx = createVaultContext(vault);
      
      // Select by filesystem path
      const byFsPath = ctx.select({ 'fs:path': 'notes/**' });
      expect(byFsPath.selection.documents).toHaveLength(1);
      expect(byFsPath.selection.documents[0].path).toMatch(/notes\//);
      
      // Select by frontmatter path property
      const byFmPath = ctx.select({ 'fm:path': '/old/location/note.md' });
      expect(byFmPath.selection.documents).toHaveLength(1);
      expect(byFmPath.selection.documents[0].metadata.frontmatter.path)
        .toBe('/old/location/note.md');
    });
  });
  
  describe('filter operation', () => {
    it('should filter selected documents', () => {
      const ctx = createVaultContext(vault);
      const result = ctx
        .select({ 'fs:path': 'projects/**' })
        .filter(doc => doc.metadata.frontmatter.priority === 'high');
      
      expect(result.selection.documents).toHaveLength(1);
      expect(result.selection.documents[0].metadata.frontmatter.priority).toBe('high');
    });
    
    it('should handle empty selection', () => {
      const ctx = createVaultContext(vault);
      const result = ctx
        .select({ 'fm:nonexistent': 'value' })
        .filter(doc => true);
      
      expect(result.selection.documents).toHaveLength(0);
    });
  });
  
  describe('union operation', () => {
    it('should combine two selections without duplicates', () => {
      const ctx = createVaultContext(vault);
      const drafts = ctx.select({ 'fm:status': 'draft' });
      const posts = ctx.select({ 'fs:path': 'posts/**' });
      
      const combined = drafts.union(posts);
      
      // Should have 2 posts (1 draft, 1 published), no duplicates
      expect(combined.selection.documents).toHaveLength(2);
    });
  });
  
  describe('intersect operation', () => {
    it('should find common documents', () => {
      const ctx = createVaultContext(vault);
      const posts = ctx.select({ 'fs:path': 'posts/**' });
      const published = ctx.select({ 'fm:status': 'published' });
      
      const intersection = posts.intersect(published);
      
      expect(intersection.selection.documents).toHaveLength(1);
      expect(intersection.selection.documents[0].metadata.frontmatter.status)
        .toBe('published');
    });
  });
  
  describe('difference operation', () => {
    it('should find documents in first but not second set', () => {
      const ctx = createVaultContext(vault);
      const allProjects = ctx.select({ 'fs:path': 'projects/**' });
      const archived = ctx.select({ 'fm:status': 'archived' });
      
      const activeProjects = allProjects.difference(archived);
      
      expect(activeProjects.selection.documents).toHaveLength(2);
      activeProjects.selection.documents.forEach(doc => {
        expect(doc.metadata.frontmatter.status).not.toBe('archived');
      });
    });
  });
});