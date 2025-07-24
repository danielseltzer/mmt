import { FileSystemAccess } from '@mmt/filesystem-access';
import path from 'path';
import { FileReferences, Link, RelocatorOptions } from './types';

export class FileRelocator {
  private fileSystem: FileSystemAccess;
  private options: Required<RelocatorOptions>;

  constructor(
    fileSystem: FileSystemAccess,
    options: RelocatorOptions = {}
  ) {
    this.fileSystem = fileSystem;
    this.options = {
      updateMovedFile: options.updateMovedFile ?? false,
      extensions: options.extensions ?? ['.md'],
      excludePaths: options.excludePaths ?? [],
    };
  }

  /**
   * Find all files that reference the given file
   */
  async findReferences(
    targetFilePath: string,
    vaultPath: string
  ): Promise<FileReferences[]> {
    const references: FileReferences[] = [];
    const targetName = path.basename(targetFilePath, path.extname(targetFilePath));
    const targetRelative = path.relative(vaultPath, targetFilePath);

    // Walk through all files in the vault
    const files = await this.getAllMarkdownFiles(vaultPath);
    
    for (const filePath of files) {
      // Skip the target file itself
      if (filePath === targetFilePath) {continue;}
      
      const links = await this.findLinksInFile(filePath, targetName, targetRelative, vaultPath);
      if (links.length > 0) {
        references.push({ filePath, links });
      }
    }

    return references;
  }

  /**
   * Update all references from oldPath to newPath
   */
  async updateReferences(
    oldPath: string,
    newPath: string,
    vaultPath: string
  ): Promise<void> {
    const references = await this.findReferences(oldPath, vaultPath);
    
    for (const { filePath, links } of references) {
      await this.updateLinksInFile(filePath, links, oldPath, newPath, vaultPath);
    }
  }

  /**
   * Get all markdown files in the vault
   */
  private async getAllMarkdownFiles(vaultPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const processDirectory = async (dirPath: string): Promise<void> => {
      const entries = await this.fileSystem.readdir(dirPath);
      
      for (const entryName of entries) {
        const fullPath = path.join(dirPath, entryName);
        
        // Skip excluded paths
        if (this.isExcluded(fullPath)) {continue;}
        
        // Get file stats to check if it's a directory
        try {
          const stats = await this.fileSystem.stat(fullPath);
          
          if (stats.isDirectory()) {
            await processDirectory(fullPath);
          } else if (stats.isFile() && this.isMarkdownFile(entryName)) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files we can't stat
          console.warn(`Could not stat ${fullPath}:`, error);
        }
      }
    };
    
    await processDirectory(vaultPath);
    return files;
  }

  /**
   * Find all links in a file that point to the target
   */
  private async findLinksInFile(
    filePath: string,
    targetName: string,
    targetRelative: string,
    vaultPath: string
  ): Promise<Link[]> {
    const content = await this.fileSystem.readFile(filePath, 'utf-8');
    const links: Link[] = [];
    
    // Split content into lines for line number tracking
    const lines = content.split('\n');
    
    // Track if we're in a code block
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Check for code block boundaries
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      // Skip if in code block
      if (inCodeBlock) {continue;}
      
      // Skip HTML comments
      if (line.includes('<!--') && line.includes('-->')) {continue;}
      
      // Find wikilinks
      const wikilinks = this.findWikilinksInLine(line, targetName, targetRelative);
      for (const link of wikilinks) {
        links.push({ ...link, line: lineNumber });
      }
      
      // Find markdown links
      const mdLinks = this.findMarkdownLinksInLine(line, targetName, targetRelative, filePath, vaultPath);
      for (const link of mdLinks) {
        links.push({ ...link, line: lineNumber });
      }
    }
    
    return links;
  }

  /**
   * Find wikilinks in a line that point to the target
   */
  private findWikilinksInLine(
    line: string,
    targetName: string,
    targetRelative: string
  ): Omit<Link, 'line'>[] {
    const links: Omit<Link, 'line'>[] = [];
    const wikilinkRegex = /\[\[([^\]]+)\]\]/gu;
    
    let match;
    while ((match = wikilinkRegex.exec(line)) !== null) {
      const [, linkTarget] = match;
      const [targetPath, anchor] = linkTarget.split('#');
      
      // Check if this link points to our target
      if (this.isLinkToTarget(targetPath, targetName, targetRelative)) {
        links.push({
          type: 'wikilink',
          raw: match[0],
          target: targetPath,
          anchor,
        });
      }
    }
    
    return links;
  }

  /**
   * Find markdown links in a line that point to the target
   */
  private findMarkdownLinksInLine(
    line: string,
    targetName: string,
    targetRelative: string,
    sourceFilePath: string,
    vaultPath: string
  ): Omit<Link, 'line'>[] {
    const links: Omit<Link, 'line'>[] = [];
    const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/gu;
    
    let match;
    while ((match = mdLinkRegex.exec(line)) !== null) {
      const [, linkText, linkPath] = match;
      const [targetPath, anchor] = linkPath.split('#');
      
      // Check if this link points to our target
      if (this.isMarkdownLinkToTarget(targetPath, targetName, targetRelative, sourceFilePath, vaultPath)) {
        links.push({
          type: 'markdown',
          raw: match[0],
          target: targetPath,
          text: linkText,
          anchor,
        });
      }
    }
    
    return links;
  }

  /**
   * Check if a wikilink target points to our file
   */
  private isLinkToTarget(
    linkTarget: string,
    targetName: string,
    targetRelative: string
  ): boolean {
    // Remove extension from relative path for comparison
    const targetRelativeNoExt = targetRelative.replace(/\.[^.]+$/u, '');
    
    // Normalize paths for comparison (forward slashes)
    const normalizedTarget = targetRelativeNoExt.replace(/\\/gu, '/');
    const normalizedLink = linkTarget.replace(/\\/gu, '/');
    
    // Exact match with relative path (with or without extension)
    if (normalizedLink === targetRelative.replace(/\\/gu, '/') || 
        normalizedLink === normalizedTarget) {
      return true;
    }
    
    // Just the filename (common for wikilinks)
    if (normalizedLink === targetName) {
      return true;
    }
    
    // Partial path match (e.g., "Tasks/task1" matching "Tasks/task1.md")
    if (normalizedTarget.endsWith(`/${ normalizedLink}`)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a markdown link target points to our file
   */
  private isMarkdownLinkToTarget(
    linkPath: string,
    targetName: string,
    targetRelative: string,
    sourceFilePath: string,
    vaultPath: string
  ): boolean {
    // For markdown links, we need to resolve relative paths
    const sourceDir = path.dirname(sourceFilePath);
    
    // Resolve the link path from the source file location
    const resolvedPath = path.resolve(sourceDir, linkPath);
    
    // Get the absolute path of the target
    const targetAbsolute = path.resolve(vaultPath, targetRelative);
    
    // Normalize for comparison
    const normalizedResolved = resolvedPath.replace(/\\/gu, '/');
    const normalizedTarget = targetAbsolute.replace(/\\/gu, '/');
    
    // Check with and without extension
    return normalizedResolved === normalizedTarget || 
           normalizedResolved === normalizedTarget.replace(/\.[^.]+$/u, '');
  }

  /**
   * Update links in a file
   */
  private async updateLinksInFile(
    filePath: string,
    links: Link[],
    oldPath: string,
    newPath: string,
    vaultPath: string
  ): Promise<void> {
    let content = await this.fileSystem.readFile(filePath, 'utf-8');
    
    // Sort links by position (reverse order to avoid position shifts)
    const sortedLinks = [...links].sort((a, b) => b.line - a.line);
    
    // Calculate the new paths
    const fileDir = path.dirname(filePath);
    const newRelativePath = path.relative(fileDir, newPath);
    const newRelativePathNoExt = newRelativePath.replace(/\.[^.]+$/u, '');
    const newVaultRelative = path.relative(vaultPath, newPath);
    const newVaultRelativeNoExt = newVaultRelative.replace(/\.[^.]+$/u, '');
    
    // Process each link
    for (const link of sortedLinks) {
      const newLink = this.createUpdatedLink(
        link, 
        newRelativePathNoExt, 
        newRelativePath,
        newVaultRelativeNoExt,
        newVaultRelative
      );
      content = content.replace(link.raw, newLink);
    }
    
    await this.fileSystem.writeFile(filePath, content);
  }

  /**
   * Create an updated link string
   */
  private createUpdatedLink(
    link: Link,
    newRelativePathNoExt: string,
    newRelativePath: string,
    newVaultRelativeNoExt: string,
    _newVaultRelative: string
  ): string {
    if (link.type === 'wikilink') {
      // Determine which path to use based on the original link format
      let newTarget: string;
      
      // If the original link was a simple filename, keep it relative from file
      if (!link.target.includes('/') && !link.target.includes('\\')) {
        newTarget = newRelativePathNoExt;
      } else {
        // Otherwise use vault-relative path
        newTarget = newVaultRelativeNoExt;
      }
      
      newTarget = newTarget.replace(/\\/gu, '/');
      const anchor = link.anchor ? `#${link.anchor}` : '';
      return `[[${newTarget}${anchor}]]`;
    } 
      // For markdown links, preserve relative path structure
      const newTarget = newRelativePath.replace(/\\/gu, '/');
      const anchor = link.anchor ? `#${link.anchor}` : '';
      return `[${link.text ?? ''}](${newTarget}${anchor})`;
    
  }

  /**
   * Check if a file is a markdown file
   */
  private isMarkdownFile(fileName: string): boolean {
    return this.options.extensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Check if a path should be excluded
   */
  private isExcluded(filePath: string): boolean {
    return this.options.excludePaths.some(excluded => 
      filePath.includes(excluded)
    );
  }
}