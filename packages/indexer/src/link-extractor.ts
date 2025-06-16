/**
 * Extracts links from markdown content
 */

import { join, dirname, basename } from 'path';
import type { LinkEntry } from './types.js';

export class LinkExtractor {
  // Maps for efficient link resolution
  private pathToFile = new Map<string, string>();      // relative path -> full path
  private nameToFiles = new Map<string, string[]>();   // basename -> possible full paths
  
  constructor(private vaultPath: string) {}
  
  /**
   * Update the file lookup maps
   */
  updateFileLookup(files: string[]): void {
    this.pathToFile.clear();
    this.nameToFiles.clear();
    
    for (const fullPath of files) {
      const relativePath = fullPath.substring(this.vaultPath.length + 1);
      this.pathToFile.set(relativePath, fullPath);
      
      const name = basename(fullPath, '.md');
      if (!this.nameToFiles.has(name)) {
        this.nameToFiles.set(name, []);
      }
      this.nameToFiles.get(name)!.push(fullPath);
    }
  }
  
  /**
   * Extract all links from markdown content
   */
  extract(sourcePath: string, content: string): LinkEntry[] {
    const links: LinkEntry[] = [];
    
    // Extract wikilinks [[target]] or [[target|display]]
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    
    while ((match = wikilinkRegex.exec(content)) !== null) {
      const target = match[1].trim();
      const display = match[2]?.trim();
      
      const resolvedTarget = this.resolveLink(target, sourcePath);
      if (resolvedTarget) {
        links.push({
          source: sourcePath,
          target: resolvedTarget,
          display: display || target,
          type: 'wikilink',
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }
    
    // Extract markdown links [text](target)
    const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const display = match[1].trim();
      const target = match[2].trim();
      
      // Only process internal links (not http://, etc.)
      if (!target.match(/^[a-z]+:\/\//)) {
        const resolvedTarget = this.resolveLink(target, sourcePath);
        if (resolvedTarget) {
          links.push({
            source: sourcePath,
            target: resolvedTarget,
            display: display || basename(target),
            type: 'markdown',
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
          });
        }
      }
    }
    
    return links;
  }
  
  /**
   * Resolve a link to an absolute path
   * Based on Dataview's algorithm but simplified
   */
  private resolveLink(link: string, sourcePath: string): string | null {
    // Remove .md extension if present
    const linkWithoutExt = link.replace(/\.md$/i, '');
    
    // 1. Try exact relative path match
    const exactMatch = this.pathToFile.get(linkWithoutExt + '.md') || 
                       this.pathToFile.get(linkWithoutExt);
    if (exactMatch) {
      return exactMatch;
    }
    
    // 2. Try relative to source file
    const sourceDir = dirname(sourcePath);
    const relativePath = join(sourceDir, linkWithoutExt + '.md')
      .substring(this.vaultPath.length + 1);
    
    const relativeMatch = this.pathToFile.get(relativePath);
    if (relativeMatch) {
      return relativeMatch;
    }
    
    // 3. Try by basename
    const linkBasename = basename(linkWithoutExt);
    const candidates = this.nameToFiles.get(linkBasename) || [];
    
    if (candidates.length === 0) {
      return null; // Link target not found
    }
    
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // 4. Multiple candidates - prefer same folder
    const sameFolderMatch = candidates.find(
      candidate => dirname(candidate) === sourceDir
    );
    
    if (sameFolderMatch) {
      return sameFolderMatch;
    }
    
    // 5. Fall back to first match
    return candidates[0];
  }
}