/**
 * Extracts metadata from markdown files
 */

import matter from 'gray-matter';
import { createHash } from 'crypto';
import { basename, relative } from 'path';
import type { PageMetadata, Heading } from './types.js';
import type { FileSystemAccess } from '@mmt/filesystem-access';

export class MetadataExtractor {
  constructor(private vaultPath: string, private fs?: FileSystemAccess) {}
  
  /**
   * Extract metadata from a markdown file
   */
  async extract(fullPath: string, content: string): Promise<PageMetadata> {
    const stats = await this.getFileStats(fullPath);
    const { data: frontmatter, content: body } = matter(content);
    
    const relativePath = relative(this.vaultPath, fullPath);
    const name = basename(fullPath, '.md');
    
    // Calculate folder path relative to vault root
    const lastSlash = relativePath.lastIndexOf('/');
    const folderPath = lastSlash === -1 ? '/' : '/' + relativePath.substring(0, lastSlash);
    
    return {
      path: fullPath,
      relativePath,
      folderPath,
      basename: name,
      
      // Extract title from first H1 or use filename
      title: this.extractTitle(body, name),
      aliases: this.extractAliases(frontmatter),
      
      // File stats
      ctime: stats.ctime,
      mtime: stats.mtime,
      size: stats.size,
      
      // Extract tags from frontmatter and content
      tags: this.extractTags(frontmatter, body),
      etags: this.extractExactTags(frontmatter, body),
      frontmatter,
      
      // Content structure
      headings: this.extractHeadings(body),
      lists: this.countLists(body),
      tasks: this.countTasks(body),
      
      // Content hash for change detection
      hash: this.computeHash(content),
    };
  }
  
  /**
   * Get file stats
   */
  private async getFileStats(path: string): Promise<{ctime: number; mtime: number; size: number}> {
    if (this.fs) {
      const stats = await this.fs.stat(path);
      return {
        ctime: stats.ctime.getTime(),
        mtime: stats.mtime.getTime(),
        size: stats.size,
      };
    }
    
    // Fallback for tests
    return {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
    };
  }
  
  /**
   * Extract title from content or use filename
   */
  private extractTitle(content: string, filename: string): string {
    // Look for first H1
    const h1Match = /^#\s+(.+)$/mu.exec(content);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    // Fall back to filename (prettified)
    return filename
      .replace(/-/gu, ' ')
      .replace(/_/gu, ' ')
      .replace(/\b\w/gu, l => l.toUpperCase());
  }
  
  /**
   * Extract aliases from frontmatter
   */
  private extractAliases(frontmatter: Record<string, unknown>): string[] {
    if (frontmatter.aliases === undefined || frontmatter.aliases === null) {
      return [];
    }
    
    if (Array.isArray(frontmatter.aliases)) {
      return frontmatter.aliases as string[];
    }
    
    if (typeof frontmatter.aliases === 'string') {
      return [frontmatter.aliases];
    }
    
    return [];
  }
  
  /**
   * Extract all tags (normalized, with hierarchy)
   */
  private extractTags(frontmatter: Record<string, unknown>, content: string): string[] {
    const tags = new Set<string>();
    
    // From frontmatter
    if (frontmatter.tags !== undefined && frontmatter.tags !== null) {
      const fmTags = Array.isArray(frontmatter.tags) 
        ? frontmatter.tags 
        : [frontmatter.tags];
      
      for (const tag of fmTags) {
        this.addTagWithHierarchy(tags, String(tag));
      }
    }
    
    // From content #tags
    const tagMatches = content.matchAll(/#([\w\-/]+)/gu);
    for (const match of tagMatches) {
      this.addTagWithHierarchy(tags, match[1]);
    }
    
    return Array.from(tags);
  }
  
  /**
   * Extract exact tags as written
   */
  private extractExactTags(frontmatter: Record<string, unknown>, content: string): string[] {
    const tags = new Set<string>();
    
    // From frontmatter
    if (frontmatter.tags !== undefined && frontmatter.tags !== null) {
      const fmTags = Array.isArray(frontmatter.tags) 
        ? frontmatter.tags 
        : [frontmatter.tags];
      
      for (const tag of fmTags) {
        tags.add(String(tag));
      }
    }
    
    // From content #tags
    const tagMatches = content.matchAll(/#([\w\-/]+)/gu);
    for (const match of tagMatches) {
      tags.add(`#${match[1]}`);
    }
    
    return Array.from(tags);
  }
  
  /**
   * Add tag with hierarchy support
   * #parent/child -> #parent, #parent/child
   */
  private addTagWithHierarchy(tags: Set<string>, tag: string): void {
    const normalized = tag.toLowerCase().replace(/^#/u, '');
    const parts = normalized.split('/');
    
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      tags.add(current);
    }
  }
  
  /**
   * Extract headings from content
   */
  private extractHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gmu;
    
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = this.slugify(text);
      
      headings.push({ level, text, slug });
    }
    
    return headings;
  }
  
  /**
   * Create URL-safe slug from text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/gu, '')
      .replace(/\s+/gu, '-')
      .replace(/-+/gu, '-')
      .trim();
  }
  
  /**
   * Count list items in content
   */
  private countLists(content: string): number {
    const listRegex = /^[\s]*[-*+]\s+/gmu;
    return (content.match(listRegex) ?? []).length;
  }
  
  /**
   * Count task items in content
   */
  private countTasks(content: string): number {
    const taskRegex = /^[\s]*[-*+]\s+\[[x\s]\]/gmiu;
    return (content.match(taskRegex) ?? []).length;
  }
  
  /**
   * Compute hash of content for change detection
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}