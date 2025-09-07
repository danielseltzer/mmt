/**
 * @fileoverview Centralized file system access layer for MMT.
 * All file operations in the application must go through this package.
 */

// Export file watcher functionality
export { FileWatcher } from './file-watcher.js';
export type { FileWatcherOptions, FileChangeEvent } from './file-watcher.js';

// Export file revealer functionality
export { 
  FileRevealer,
  SystemFileRevealStrategy,
  TestFileRevealStrategy,
  DryRunFileRevealStrategy
} from './file-revealer.js';
export type { FileRevealStrategy } from './file-revealer.js';

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
  rm as fsRm,
  appendFile as fsAppendFile,
  mkdtemp as fsMkdtemp,
} from 'node:fs/promises';
import {
  readFileSync as fsReadFileSync,
  writeFileSync as fsWriteFileSync,
  existsSync as fsExistsSync,
  mkdirSync as fsMkdirSync,
  rmSync as fsRmSync,
  mkdtempSync as fsMkdtempSync,
  appendFileSync as fsAppendFileSync,
  unlinkSync as fsUnlinkSync,
  statSync as fsStatSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { constants } from 'node:fs';
import type { Stats } from 'node:fs';
import { tmpdir } from 'node:os';
import matter from 'gray-matter';

/**
 * File system access interface. All file operations in MMT go through this interface.
 */
export interface FileSystemAccess {
  // Basic file operations (async)
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  unlink(path: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  
  // Basic file operations (sync)
  readFileSync(path: string, encoding?: string): string;
  writeFileSync(path: string, content: string): void;
  existsSync(path: string): boolean;
  unlinkSync(path: string): void;
  appendFileSync(path: string, content: string): void;
  
  // Directory operations (async)
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  mkdtemp(prefix: string): Promise<string>;
  
  // Directory operations (sync)
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  mkdtempSync(prefix: string): string;
  
  // File metadata
  stat(path: string): Promise<Stats>;
  statSync(path: string): Stats;
  
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

  async appendFile(path: string, content: string): Promise<void> {
    await fsAppendFile(path, content, 'utf-8');
  }

  async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    await fsRm(path, options);
  }

  async mkdtemp(prefix: string): Promise<string> {
    const tmpPath = join(tmpdir(), prefix);
    return fsMkdtemp(tmpPath);
  }

  // Sync methods
  readFileSync(path: string, encoding?: string): string {
    return fsReadFileSync(path, (encoding ?? 'utf-8') as BufferEncoding);
  }

  writeFileSync(path: string, content: string): void {
    // Create parent directory if it doesn't exist
    const dir = dirname(path);
    this.mkdirSync(dir, { recursive: true });
    fsWriteFileSync(path, content, 'utf-8');
  }

  existsSync(path: string): boolean {
    return fsExistsSync(path);
  }

  unlinkSync(path: string): void {
    fsUnlinkSync(path);
  }

  appendFileSync(path: string, content: string): void {
    fsAppendFileSync(path, content, 'utf-8');
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    fsMkdirSync(path, options);
  }

  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    fsRmSync(path, options);
  }

  mkdtempSync(prefix: string): string {
    const tmpPath = join(tmpdir(), prefix);
    return fsMkdtempSync(tmpPath);
  }

  statSync(path: string): Stats {
    return fsStatSync(path);
  }
}