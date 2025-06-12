/**
 * @fileoverview Centralized file system access layer for MMT.
 * All file operations in the application must go through this package.
 */

import type { Stats } from 'node:fs';

/**
 * File system access interface. All file operations in MMT go through this interface.
 */
export interface FileSystemAccess {
  // Basic file operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  unlink(path: string): Promise<void>;
  
  // Directory operations
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  
  // File metadata
  stat(path: string): Promise<Stats>;
  
  // File movement/copying
  rename(oldPath: string, newPath: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  hardLink(source: string, destination: string): Promise<void>;
  
  // Markdown-specific operations
  readMarkdownFile(path: string): Promise<{
    content: string;
    frontmatter: Record<string, unknown>;
  }>;
  
  writeMarkdownFile(
    path: string,
    content: string,
    frontmatter?: Record<string, unknown>
  ): Promise<void>;
}

/**
 * Node.js implementation of FileSystemAccess
 */
export class NodeFileSystem implements FileSystemAccess {
  async readFile(path: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async writeFile(path: string, content: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async exists(path: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async unlink(path: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    throw new Error('Not implemented');
  }

  async readdir(path: string): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async stat(path: string): Promise<Stats> {
    throw new Error('Not implemented');
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async copyFile(source: string, destination: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async hardLink(source: string, destination: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async readMarkdownFile(path: string): Promise<{
    content: string;
    frontmatter: Record<string, unknown>;
  }> {
    throw new Error('Not implemented');
  }

  async writeMarkdownFile(
    path: string,
    content: string,
    frontmatter?: Record<string, unknown>
  ): Promise<void> {
    throw new Error('Not implemented');
  }
}