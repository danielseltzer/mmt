/**
 * @fileoverview Centralized file system access layer for MMT.
 * All file operations in the application must go through this package.
 */

// Export file watcher functionality
export { FileWatcher } from './file-watcher.js';
export type { FileWatcherOptions, FileChangeEvent } from './file-watcher.js';

import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  access,
  unlink as fsUnlink,
  mkdir as fsMkdir,
  readdir as fsReaddir,
  stat as fsStat,
  rename as fsRename,
  copyFile as fsCopyFile,
  link as fsLink,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { constants } from 'node:fs';
import type { Stats } from 'node:fs';
import matter from 'gray-matter';

/**
 * File system access interface. All file operations in MMT go through this interface.
 */
export interface FileSystemAccess {
  // Basic file operations
  readFile(path: string, encoding?: string): Promise<string>;
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
  async readFile(path: string, encoding?: string): Promise<string> {
    return fsReadFile(path, (encoding ?? 'utf-8') as BufferEncoding);
  }

  async writeFile(path: string, content: string): Promise<void> {
    // Create parent directory if it doesn't exist
    const dir = dirname(path);
    await this.mkdir(dir, { recursive: true });
    await fsWriteFile(path, content, 'utf-8');
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async unlink(path: string): Promise<void> {
    await fsUnlink(path);
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await fsMkdir(path, options);
  }

  async readdir(path: string): Promise<string[]> {
    return fsReaddir(path);
  }

  async stat(path: string): Promise<Stats> {
    return fsStat(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await fsRename(oldPath, newPath);
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await fsCopyFile(source, destination);
  }

  async hardLink(source: string, destination: string): Promise<void> {
    await fsLink(source, destination);
  }

  async readMarkdownFile(path: string): Promise<{
    content: string;
    frontmatter: Record<string, unknown>;
  }> {
    const raw = await this.readFile(path);
    const { content, data } = matter(raw);
    return {
      content,
      frontmatter: data as Record<string, unknown>,
    };
  }

  async writeMarkdownFile(
    path: string,
    content: string,
    frontmatter?: Record<string, unknown>
  ): Promise<void> {
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
      // No frontmatter, just write the content
      await this.writeFile(path, content);
    } else {
      // Use gray-matter to stringify with frontmatter
      const fileContent = matter.stringify(content, frontmatter);
      await this.writeFile(path, fileContent);
    }
  }
}