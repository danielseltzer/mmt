# MMT Implementation Guide

## Overview

This guide covers implementing the Markdown Management Toolkit (MMT) - a desktop application for managing large markdown vaults with bulk operations, sophisticated filtering, and optional vector similarity search.

## Architecture Summary

- **13 packages** in a monorepo structure
- **Electron + React + TypeScript** with electron-vite
- **Local indexing** adapted from Dataview patterns
- **Test-first development** with real file operations (no mocks)
- **Type-safe IPC** using electron-trpc
- **Optional QM integration** for vector similarity

## Initial Setup

### Prerequisites
```bash
# Required tools
node --version  # v20.x or higher
pnpm --version  # v9.x or higher

# Install pnpm if needed
npm install -g pnpm@latest
```

### Create Project Structure
```bash
# Create project directory
mkdir mmt && cd mmt
git init

# Create monorepo structure
mkdir -p apps/electron apps/renderer
mkdir -p packages/{entities,filesystem-access,config,query-parser,indexer,qm-provider}
mkdir -p packages/{document-operations,file-relocator,document-previews,docset-builder}
mkdir -p packages/{view-persistence,table-view,reports}

# Initialize pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Root package.json
cat > package.json << 'EOF'
{
  "name": "mmt",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF
```

## Monorepo Configuration

### Turbo Configuration
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    }
  }
}
```

## Package Implementation Order

Following our milestones, implement packages in this order:

### Phase 1: Foundation
1. `@mmt/entities` - Core data schemas
2. `@mmt/filesystem-access` - File operations layer
3. `@mmt/config` - Configuration management

### Phase 2: Indexing
4. `@mmt/query-parser` - Query syntax parsing
5. `@mmt/indexer` - Local file indexing

### Phase 3: Operations
6. `@mmt/document-operations` - File operations
7. `@mmt/file-relocator` - Link integrity

### Phase 4: UI
8. `@mmt/table-view` - React table component
9. `@mmt/view-persistence` - Save/load views

## Core Package Implementations

### 1. Entities Package

```bash
cd packages/entities
pnpm init
pnpm add zod
pnpm add -D typescript @types/node vitest
```

```typescript
/**
 * @fileoverview Entities Package - Core Data Schemas
 * 
 * This package defines all shared data structures using Zod schemas.
 * These schemas serve as the contracts between packages, ensuring type safety
 * at compile time AND runtime. By centralizing all entities here, we:
 * 
 * 1. Enforce loose coupling - packages depend on schemas, not implementations
 * 2. Enable runtime validation at package boundaries
 * 3. Generate TypeScript types automatically from schemas
 * 4. Maintain a single source of truth for data structures
 * 
 * Design principles:
 * - All data crossing package boundaries MUST be validated
 * - Schemas are the ONLY shared dependency between packages
 * - Each schema includes JSDoc comments for clarity
 * - Use Zod's type inference to avoid duplicate type definitions
 */

// packages/entities/src/index.ts
export * from './schemas/document'
export * from './schemas/query'
export * from './schemas/operation'
export * from './schemas/config'
export * from './schemas/view'
```

```typescript
/**
 * @fileoverview Document Schema - Core Document Entity
 * 
 * The Document entity represents a single markdown file in the vault.
 * This schema is designed to be:
 * 
 * 1. Filesystem-agnostic: Works with any storage backend
 * 2. Content-lazy: Preview is optional, full content loaded on demand
 * 3. Frontmatter-flexible: Supports all YAML types via gray-matter
 * 4. Query-optimized: Includes derived properties for fast filtering
 * 
 * Key decisions:
 * - No 'content' field - loaded separately to keep documents lightweight
 * - Frontmatter uses z.record() with union types for maximum flexibility
 * - Properties array enables efficient property-exists queries
 * - All paths are absolute for unambiguous file operations
 */

// packages/entities/src/schemas/document.ts
import { z } from 'zod'

export const DocumentSchema = z.object({
  // File system properties
  path: z.string().describe('Absolute path to the file'),
  relativePath: z.string().describe('Path relative to vault root'),
  filename: z.string().describe('Just the filename with extension'),
  size: z.number().describe('File size in bytes'),
  created: z.date().describe('File creation timestamp'),
  modified: z.date().describe('Last modification timestamp'),
  
  // Content properties
  preview: z.string().optional().describe('First ~100 chars of content'),
  
  // Parsed frontmatter (gray-matter compatible)
  // Supports all YAML types: string, number, boolean, date, arrays, objects
  frontmatter: z.record(
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.date(),
      z.array(z.any()),
      z.record(z.any()),
    ])
  ).default({}).describe('Parsed YAML frontmatter'),
  
  // Derived properties for efficient querying
  properties: z.array(z.string()).describe('Top-level frontmatter keys'),
  hasIncompleteTasks: z.boolean().optional().describe('Contains unchecked tasks'),
  wordCount: z.number().optional().describe('Approximate word count'),
})

export type Document = z.infer<typeof DocumentSchema>
```

**Write tests first:**
```typescript
/**
 * @fileoverview Document Schema Tests
 * 
 * These tests demonstrate our test-first approach and NO MOCKS policy.
 * We test actual schema validation, not mocked behavior. This ensures:
 * 
 * 1. Schemas work as intended with real data
 * 2. Edge cases are discovered early
 * 3. Tests serve as living documentation
 * 4. No false positives from mocked validations
 */

// packages/entities/src/schemas/document.test.ts
import { describe, it, expect } from 'vitest'
import { DocumentSchema } from './document'

describe('Document Schema', () => {
  it('validates document with all field types', () => {
    // Test real-world document structure with diverse frontmatter
    const doc = {
      path: '/vault/test.md',
      relativePath: 'test.md',
      filename: 'test.md',
      size: 1024,
      created: new Date(),
      modified: new Date(),
      frontmatter: {
        title: 'Test',
        count: 42,
        published: true,
        tags: ['test', 'example'],
        metadata: { nested: 'value' }
      },
      properties: ['title', 'count', 'published', 'tags', 'metadata']
    }
    
    expect(() => DocumentSchema.parse(doc)).not.toThrow()
  })
  
  it('makes preview optional', () => {
    // Minimal valid document - tests our lazy-loading strategy
    const doc = {
      path: '/vault/test.md',
      relativePath: 'test.md',
      filename: 'test.md',
      size: 0,
      created: new Date(),
      modified: new Date(),
      properties: []
    }
    
    const parsed = DocumentSchema.parse(doc)
    expect(parsed.preview).toBeUndefined()
  })
})
```

### 2. FileSystem Access Package

```typescript
/**
 * @fileoverview FileSystem Access Layer - Centralized File Operations
 * 
 * This package provides the ONLY way to access the filesystem in MMT.
 * By centralizing all file operations here, we achieve:
 * 
 * 1. Single IPC boundary - all file ops go through one channel
 * 2. Consistent error handling and path validation
 * 3. Easy testing with real files (no mocks needed)
 * 4. Future portability to cloud storage or mobile
 * 
 * Design principles:
 * - Interface-first design enables multiple implementations
 * - All paths must be absolute to avoid ambiguity
 * - Operations are atomic where possible (mkdir -p before write)
 * - No business logic - this is pure infrastructure
 * 
 * Security considerations:
 * - Path validation prevents directory traversal attacks
 * - All operations are restricted to vault paths in production
 * - Errors include safe messages, not system details
 */

// packages/filesystem-access/src/index.ts
import { homedir } from 'os'
import { join, resolve, dirname } from 'path'
import { 
  readFile, 
  writeFile, 
  rename, 
  unlink,
  mkdir,
  readdir,
  stat,
  copyFile
} from 'fs/promises'

/**
 * FileInfo represents filesystem metadata for a single file or directory.
 * Minimal interface focused on what the app actually needs.
 */
export interface FileInfo {
  path: string          // Always absolute
  size: number          // Bytes
  created: Date         // Birth time
  modified: Date        // Last modification
  isDirectory: boolean  // Type discriminator
}

/**
 * FileSystemAccess interface defines all filesystem operations.
 * This is the contract that all implementations must fulfill.
 * 
 * Key decisions:
 * - Async-only API (no sync operations)
 * - UTF-8 encoding assumed for all text files
 * - Errors bubble up (no silent failures)
 * - Operations ensure parent directories exist
 */
export interface FileSystemAccess {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  moveFile(from: string, to: string): Promise<void>
  deleteFile(path: string): Promise<void>
  listDirectory(path: string): Promise<FileInfo[]>
  exists(path: string): Promise<boolean>
  createDirectory(path: string): Promise<void>
  copyFile(from: string, to: string): Promise<void>
}

/**
 * NodeFileSystem implements FileSystemAccess using Node.js fs module.
 * This is the production implementation for Electron main process.
 * 
 * Implementation notes:
 * - Uses fs/promises for cleaner async code
 * - mkdir recursive ensures parent dirs exist
 * - stat used for exists check (faster than access)
 * - No caching - filesystem is source of truth
 */
export class NodeFileSystem implements FileSystemAccess {
  async readFile(path: string): Promise<string> {
    return await readFile(path, 'utf-8')
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    // Ensure parent directory exists before writing
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf-8')
  }
  
  async moveFile(from: string, to: string): Promise<void> {
    // Ensure target directory exists before moving
    await mkdir(dirname(to), { recursive: true })
    await rename(from, to)
  }
  
  async deleteFile(path: string): Promise<void> {
    await unlink(path)
  }
  
  async listDirectory(path: string): Promise<FileInfo[]> {
    const entries = await readdir(path, { withFileTypes: true })
    const files: FileInfo[] = []
    
    for (const entry of entries) {
      const fullPath = join(path, entry.name)
      const stats = await stat(fullPath)
      
      files.push({
        path: fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: entry.isDirectory()
      })
    }
    
    return files
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path)
      return true
    } catch {
      return false
    }
  }
  
  async createDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true })
  }
  
  async copyFile(from: string, to: string): Promise<void> {
    // Ensure target directory exists before copying
    await mkdir(dirname(to), { recursive: true })
    await copyFile(from, to)
  }
}
```

### 3. Config Package

```typescript
/**
 * @fileoverview Configuration Management - Explicit Config Loading
 * 
 * This package handles loading and validating configuration files.
 * Key design decisions:
 * 
 * 1. NO DEFAULTS - Every field must be explicitly set
 * 2. Required --config flag at startup
 * 3. Fail fast with clear errors on invalid config
 * 4. YAML format for human readability
 * 
 * Philosophy:
 * - Explicit is better than implicit
 * - Configuration should be deterministic
 * - Errors should be caught at startup, not runtime
 * - No magic - what you see is what you get
 * 
 * This approach prevents:
 * - Confusion about which config is active
 * - Hidden defaults causing unexpected behavior
 * - Environment-specific bugs
 * - "Works on my machine" issues
 */

// packages/config/src/index.ts
import { VaultConfig, VaultConfigSchema } from '@mmt/entities'
import { FileSystemAccess } from '@mmt/filesystem-access'
import { parse as parseYaml } from 'js-yaml'
import { resolve } from 'path'

/**
 * ConfigService loads and validates vault configuration.
 * 
 * Design principles:
 * - Single responsibility: Just load and validate config
 * - No defaults: Every field must be in the config file
 * - Clear errors: Tell user exactly what's wrong
 * - Path validation: Ensure vault path exists and is accessible
 */
export class ConfigService {
  constructor(private fs: FileSystemAccess) {}
  
  /**
   * Load configuration from specified path.
   * Validates schema and filesystem paths.
   * Exits process on any error (fail fast).
   */
  async load(configPath: string): Promise<VaultConfig> {
    // Require absolute config path
    if (!configPath) {
      this.exitWithError('Config path is required. Use --config=path/to/config.yaml')
    }
    
    const absoluteConfigPath = resolve(configPath)
    
    // Check config file exists
    if (!await this.fs.exists(absoluteConfigPath)) {
      this.exitWithError(`Config file not found: ${absoluteConfigPath}`)
    }
    
    // Load and parse YAML
    let rawConfig: unknown
    try {
      const content = await this.fs.readFile(absoluteConfigPath)
      rawConfig = parseYaml(content)
    } catch (error) {
      this.exitWithError(`Failed to parse config file: ${error.message}`)
    }
    
    // Validate against schema
    const result = VaultConfigSchema.safeParse(rawConfig)
    if (!result.success) {
      const errors = result.error.errors
        .map(err => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n')
      this.exitWithError(`Invalid configuration:\n${errors}`)
    }
    
    const config = result.data
    
    // Validate vault path exists
    const vaultPath = resolve(config.vaultPath)
    if (!await this.fs.exists(vaultPath)) {
      this.exitWithError(`Vault path does not exist: ${vaultPath}`)
    }
    
    // Return config with resolved paths
    return {
      ...config,
      vaultPath
    }
  }
  
  /**
   * Exit process with clear error message.
   * This is intentional - bad config should prevent startup.
   */
  private exitWithError(message: string): never {
    console.error(`\nConfiguration Error:\n${message}\n`)
    console.error('Example config.yaml:')
    console.error('---')
    console.error('vaultPath: /Users/you/Documents/vault')
    console.error('qmServiceUrl: http://localhost:8080  # Optional')
    console.error()
    process.exit(1)
  }
}

/**
 * Example usage in main process:
 * 
 * const configPath = process.argv.find(arg => arg.startsWith('--config='))
 *   ?.replace('--config=', '')
 * 
 * if (!configPath) {
 *   console.error('Error: --config flag is required')
 *   process.exit(1)
 * }
 * 
 * const config = await configService.load(configPath)
 * // App continues only with valid config
 */
```

### 4. Indexer Package (Dataview-Inspired)

```typescript
/**
 * @fileoverview Vault Indexer - Local File Indexing System
 * 
 * This package provides fast, in-memory indexing of markdown vaults,
 * inspired by Obsidian Dataview but standalone and framework-agnostic.
 * 
 * Key capabilities:
 * 1. Full-text indexing of markdown files
 * 2. Frontmatter property indexing for fast queries
 * 3. Bidirectional link tracking (wikilinks and markdown links)
 * 4. File watching for real-time updates
 * 
 * Design principles:
 * - Memory-efficient: Only metadata in memory, content loaded on demand
 * - Query-optimized: Multiple indices for different query types
 * - Incremental updates: File changes update only affected indices
 * - No external dependencies: Works with any markdown vault
 * 
 * Performance targets:
 * - Initial index: 5000 files in < 5 seconds
 * - Query response: < 100ms for most queries
 * - Memory usage: ~100 bytes per document + indices
 * 
 * Inspired by: https://github.com/blacksmithgu/obsidian-dataview
 */

// packages/indexer/src/index.ts
import { Document, Query } from '@mmt/entities'
import { FileSystemAccess, FileInfo } from '@mmt/filesystem-access'
import matter from 'gray-matter'
import { minimatch } from 'minimatch'
import { basename } from 'path'
import chokidar from 'chokidar'

/**
 * LinkReference tracks a single link between documents.
 * Used for both link traversal and link integrity operations.
 */
export interface LinkReference {
  sourceFile: string      // Absolute path of file containing the link
  targetFile: string      // Absolute path of linked file
  linkType: 'wikilink' | 'markdown'  // [[wiki]] vs [text](url)
  linkText: string        // Display text or link target
}

/**
 * VaultIndex is the core indexing engine for MMT.
 * Maintains multiple indices for efficient querying:
 * - documents: Path -> Document metadata
 * - linkIndex: Path -> Outgoing links
 * - propertyIndex: Property name -> Set of paths
 * 
 * File watching is handled via chokidar for cross-platform reliability.
 * All operations are async to prevent blocking the UI.
 */
export class VaultIndex {
  private documents = new Map<string, Document>()
  private linkIndex = new Map<string, LinkReference[]>()
  private propertyIndex = new Map<string, Set<string>>()
  private watcher: chokidar.FSWatcher | null = null
  
  constructor(
    private vaultPath: string,
    private fs: FileSystemAccess
  ) {}
  
  /**
   * Initialize the index by scanning the vault and setting up file watching.
   * This is the only method that should be called after construction.
   */
  async initialize(): Promise<void> {
    // Initial index of all files
    await this.indexDirectory(this.vaultPath)
    
    // Set up file watching for incremental updates
    this.startWatching()
  }
  
  /**
   * Set up file watching using chokidar.
   * Handles add, change, and delete events for .md files.
   * 
   * Why chokidar:
   * - Cross-platform reliability (fs.watch has platform quirks)
   * - Handles edge cases like atomic saves and network drives
   * - Built-in debouncing for rapid changes
   * - Used by webpack, VSCode, and other major tools
   */
  private startWatching(): void {
    this.watcher = chokidar.watch(this.vaultPath, {
      ignored: [
        /(^|[\/\\])\../,     // Ignore dotfiles
        /node_modules/,       // Ignore dependencies
        /.obsidian/,          // Ignore Obsidian config
        /.snapshots/          // Ignore MMT snapshots
      ],
      persistent: true,
      ignoreInitial: true,    // Don't fire for existing files
      awaitWriteFinish: {     // Handle atomic saves
        stabilityThreshold: 100,
        pollInterval: 100
      }
    })
    
    this.watcher
      .on('add', path => this.handleFileAdded(path))
      .on('change', path => this.handleFileChanged(path))
      .on('unlink', path => this.handleFileDeleted(path))
  }
  
  private async indexDirectory(dirPath: string): Promise<void> {
    const files = await this.fs.listDirectory(dirPath)
    
    for (const file of files) {
      if (file.isDirectory) {
        await this.indexDirectory(file.path)
      } else if (file.path.endsWith('.md')) {
        await this.indexFile(file)
      }
    }
  }
  
  private async indexFile(fileInfo: FileInfo): Promise<void> {
    const content = await this.fs.readFile(fileInfo.path)
    const { data: frontmatter, content: body } = matter(content)
    
    const relativePath = fileInfo.path.substring(this.vaultPath.length + 1)
    
    const doc: Document = {
      path: fileInfo.path,
      relativePath,
      filename: basename(fileInfo.path),
      size: fileInfo.size,
      created: fileInfo.created,
      modified: fileInfo.modified,
      frontmatter,
      properties: Object.keys(frontmatter),
      preview: body.substring(0, 100)
    }
    
    this.documents.set(fileInfo.path, doc)
    
    // Index frontmatter properties for fast property queries
    for (const [key, value] of Object.entries(frontmatter)) {
      if (!this.propertyIndex.has(key)) {
        this.propertyIndex.set(key, new Set())
      }
      this.propertyIndex.get(key)!.add(fileInfo.path)
    }
    
    // Index links for graph queries
    this.indexLinks(fileInfo.path, body)
  }
  
  /**
   * Extract and index all links from document content.
   * Supports both [[wikilinks]] and [markdown](links).
   * Links are resolved relative to the source document.
   */
  private indexLinks(sourcePath: string, content: string): void {
    const links: LinkReference[] = []
    
    // Extract wikilinks [[target]] or [[target|display]]
    const wikilinks = content.matchAll(/\[\[([^\]]+)\]\]/g)
    for (const match of wikilinks) {
      links.push({
        sourceFile: sourcePath,
        targetFile: this.resolveLink(match[1], sourcePath),
        linkType: 'wikilink',
        linkText: match[1]
      })
    }
    
    // Extract markdown links [text](target)
    const mdLinks = content.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)
    for (const match of mdLinks) {
      links.push({
        sourceFile: sourcePath,
        targetFile: this.resolveLink(match[2], sourcePath),
        linkType: 'markdown',
        linkText: match[1]
      })
    }
    
    this.linkIndex.set(sourcePath, links)
  }
  
  /**
   * Resolve a link target to an absolute path.
   * Handles relative paths, vault-relative paths, and link anchors.
   */
  private resolveLink(target: string, sourcePath: string): string {
    // Implementation depends on vault link resolution rules
    // This is a simplified version
    return target // TODO: Implement proper link resolution
  }
  
  /**
   * Execute a query against the index.
   * Applies conditions sequentially with AND logic.
   * Results are limited to 500 documents for UI performance.
   */
  async query(query: Query): Promise<Document[]> {
    let results = Array.from(this.documents.values())
    
    for (const condition of query.conditions) {
      results = this.applyCondition(results, condition)
    }
    
    return results.slice(0, 500)
  }
  
  /**
   * File watching event handlers for incremental updates.
   * These maintain index consistency as files change.
   */
  private async handleFileAdded(path: string): Promise<void> {
    if (!path.endsWith('.md')) return
    
    const stats = await this.fs.stat(path)
    await this.indexFile({
      path,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: false
    })
  }
  
  private async handleFileChanged(path: string): Promise<void> {
    if (!path.endsWith('.md')) return
    
    // Remove old index entries
    this.removeFromIndices(path)
    
    // Re-index the file
    await this.handleFileAdded(path)
  }
  
  private handleFileDeleted(path: string): void {
    if (!path.endsWith('.md')) return
    this.removeFromIndices(path)
  }
  
  private removeFromIndices(path: string): void {
    // Remove from document index
    const doc = this.documents.get(path)
    if (doc) {
      // Remove from property index
      for (const prop of doc.properties) {
        this.propertyIndex.get(prop)?.delete(path)
      }
    }
    this.documents.delete(path)
    
    // Remove from link index
    this.linkIndex.delete(path)
  }
  
  getOutgoingLinks(docPath: string): LinkReference[] {
    return this.linkIndex.get(docPath) || []
  }
  
  getIncomingLinks(docPath: string): LinkReference[] {
    const incoming: LinkReference[] = []
    
    for (const [_, links] of this.linkIndex) {
      for (const link of links) {
        if (link.targetFile === docPath) {
          incoming.push(link)
        }
      }
    }
    
    return incoming
  }
  
  /**
   * Clean up resources when shutting down.
   * Important for preventing memory leaks and zombie processes.
   */
  async dispose(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }
}
```

### 4. Document Operations Package

```typescript
/**
 * @fileoverview Document Operations - Bulk File Operations with Safety
 * 
 * This package handles all file modifications with safety guarantees.
 * Key features:
 * 
 * 1. Snapshot-based undo using hard links (cp -al)
 * 2. Optional operations log for content recovery
 * 3. Atomic operations with rollback on failure
 * 4. Detailed per-file operation results
 * 
 * Snapshot strategy:
 * - Hard links provide instant snapshots with minimal disk usage
 * - Protects against file deletion and moves
 * - Operations log adds protection against content corruption
 * 
 * Design principles:
 * - Every operation is reversible
 * - Failures are atomic - all or nothing
 * - Clear reporting of what changed
 * - Development mode adds extra safety
 */

// packages/document-operations/src/index.ts
import { Operation, OperationExecRequest, OperationExecResult } from '@mmt/entities'
import { FileSystemAccess } from '@mmt/filesystem-access'
import { FileRelocator } from '@mmt/file-relocator'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Operations log entry for content recovery.
 * Only used in development mode for extra safety.
 */
interface OperationLogEntry {
  timestamp: Date
  operation: Operation
  filesModified: Array<{
    path: string
    originalContent: string    // Full content before modification
    originalHash: string       // SHA256 for verification
    newContent?: string        // After modification (for debugging)
  }>
}

/**
 * OperationOrchestrator coordinates complex file operations.
 * 
 * Responsibilities:
 * - Create snapshots before operations
 * - Execute operations with proper error handling
 * - Maintain operations log in development
 * - Rollback on failure
 * - Report detailed results
 */
export class OperationOrchestrator {
  private enableOperationLog = process.env.NODE_ENV === 'development'
  
  constructor(
    private fs: FileSystemAccess,
    private fileRelocator: FileRelocator
  ) {}
  
  async execute(request: OperationExecRequest): Promise<OperationExecResult> {
    // Create snapshot using hard links for instant backup
    const snapshotPath = await this.createSnapshot(request.vaultPath)
    const logEntry: OperationLogEntry | null = this.enableOperationLog ? {
      timestamp: new Date(),
      operation: request.operation,
      filesModified: []
    } : null
    
    try {
      // Capture original content for operations that modify files
      if (logEntry && this.modifiesContent(request.operation)) {
        await this.captureOriginalContent(request.operation, logEntry)
      }
      
      // Execute the actual operations
      const results = await this.executeOperation(request.operation)
      
      // Write operations log for recovery capability
      if (logEntry) {
        await this.writeOperationLog(logEntry)
      }
      
      return {
        requestId: request.id,
        executedAt: new Date(),
        snapshotPath,
        results,
        summary: this.summarizeResults(results)
      }
    } catch (error) {
      // Restore from snapshot on any failure
      await this.restoreSnapshot(snapshotPath, request.vaultPath)
      throw error
    }
  }
  
  /**
   * Create a snapshot using hard links.
   * This is nearly instant and uses minimal disk space.
   */
  private async createSnapshot(vaultPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotDir = `${vaultPath}/.snapshots/${timestamp}`
    
    // Create snapshots directory if needed
    await this.fs.createDirectory(`${vaultPath}/.snapshots`)
    
    // Use cp -al for hard link snapshot
    // -a preserves attributes, -l creates hard links
    await execAsync(`cp -al "${vaultPath}" "${snapshotDir}"`)
    
    return snapshotDir
  }
  
  /**
   * Restore vault from snapshot.
   * Used when operations fail partway through.
   */
  private async restoreSnapshot(snapshotPath: string, vaultPath: string): Promise<void> {
    // Remove current vault state
    await execAsync(`rm -rf "${vaultPath}"`)
    
    // Restore from snapshot
    await execAsync(`cp -al "${snapshotPath}" "${vaultPath}"`)
  }
  
  /**
   * Capture file content before modifications.
   * This protects against file truncation or corruption.
   */
  private async captureOriginalContent(
    operation: Operation,
    logEntry: OperationLogEntry
  ): Promise<void> {
    for (const file of operation.source.files) {
      const content = await this.fs.readFile(file)
      const hash = await this.hashContent(content)
      
      logEntry.filesModified.push({
        path: file,
        originalContent: content,
        originalHash: hash
      })
    }
  }
  
  /**
   * Write operations log for recovery capability.
   * Stored in .operations/logs/ within the vault.
   */
  private async writeOperationLog(entry: OperationLogEntry): Promise<void> {
    const logDir = `${this.vaultPath}/.operations/logs`
    await this.fs.createDirectory(logDir)
    
    const logFile = `${logDir}/${entry.timestamp.toISOString()}.json`
    await this.fs.writeFile(logFile, JSON.stringify(entry, null, 2))
  }
  
  private modifiesContent(operation: Operation): boolean {
    return operation.operation === 'updateProperties'
  }
  
  private async hashContent(content: string): Promise<string> {
    // Implementation would use crypto.createHash('sha256')
    return 'hash-placeholder'
  }
}
```

## Electron Application Structure

### Main Process with electron-trpc

```typescript
/**
 * @fileoverview Electron Main Process Entry Point
 * 
 * Sets up the main Electron window and initializes IPC communication.
 * Uses electron-trpc for type-safe communication with renderer.
 * 
 * Security principles:
 * - Context isolation enabled for renderer security
 * - Node integration disabled to prevent XSS attacks
 * - Preload script provides controlled API access
 * - All file operations go through validated IPC
 */

// apps/electron/src/main.ts
import { app, BrowserWindow } from 'electron'
import { createIPCHandler } from 'electron-trpc/main'
import { appRouter } from './router'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,      // Security: Isolate renderer
      nodeIntegration: false       // Security: No direct Node access
    }
  })
  
  // Set up tRPC for type-safe IPC
  createIPCHandler({
    router: appRouter,
    windows: [mainWindow]
  })
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
```

```typescript
/**
 * @fileoverview IPC Router - Type-Safe API for Renderer
 * 
 * This router defines all operations available to the renderer process.
 * Uses tRPC with Zod validation for automatic type safety and validation.
 * 
 * Architecture principles:
 * - All data validated at IPC boundary using existing Zod schemas
 * - Services are instantiated once and reused (singleton pattern)
 * - Explicit initialization required (no implicit defaults)
 * - Operations return validated results or throw typed errors
 * 
 * Why electron-trpc:
 * - Automatic TypeScript types shared between main/renderer
 * - Built-in validation using our Zod schemas
 * - No manual IPC channel management
 * - Type-safe errors and responses
 */

// apps/electron/src/router.ts
import { router, procedure } from '@trpc/server'
import { z } from 'zod'
import { VaultIndex } from '@mmt/indexer'
import { NodeFileSystem } from '@mmt/filesystem-access'
import { ConfigService } from '@mmt/config'
import { OperationOrchestrator } from '@mmt/document-operations'
import { QueryParser } from '@mmt/query-parser'

// Singleton services - instantiated once, used everywhere
const fs = new NodeFileSystem()
const config = new ConfigService(fs)
const queryParser = new QueryParser()
let indexer: VaultIndex | null = null

export const appRouter = router({
  /**
   * Initialize the application with a config file.
   * Must be called before any other operations.
   * Validates config and initializes the indexer.
   */
  init: procedure
    .input(z.object({ configPath: z.string() }))
    .mutation(async ({ input }) => {
      // Load and validate config (will throw on invalid)
      const vaultConfig = await config.load(input.configPath)
      
      // Initialize indexer with vault path
      indexer = new VaultIndex(vaultConfig.vaultPath, fs)
      await indexer.initialize()
      
      return { success: true }
    }),
  
  /**
   * Search for documents using GitHub-style query syntax.
   * Parses the query and executes against the index.
   * Returns up to 500 documents for UI performance.
   */
  search: procedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      if (!indexer) throw new Error('Not initialized')
      
      // Parse query string into structured query
      const parsed = await queryParser.parse(input.query)
      
      // Execute query against index
      return await indexer.query(parsed)
    }),
  
  /**
   * File operations sub-router.
   * All operations that modify files go here.
   * Each operation creates snapshots for undo capability.
   */
  operations: router({
    move: procedure
      .input(z.object({
        files: z.array(z.string()),
        targetFolder: z.string()
      }))
      .mutation(async ({ input }) => {
        const orchestrator = new OperationOrchestrator(fs, indexer!)
        return await orchestrator.moveFiles(input.files, input.targetFolder)
      })
  })
})

// Export router type for renderer type generation
export type AppRouter = typeof appRouter
```

### Renderer with React

```typescript
/**
 * @fileoverview Renderer Process Entry Point
 * 
 * Standard React 18 setup with strict mode enabled.
 * The renderer process runs in a sandboxed environment with
 * access to the main process only through the tRPC client.
 */

// apps/renderer/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

```typescript
/**
 * @fileoverview Main Application Component
 * 
 * The root component that orchestrates the UI.
 * Manages global state and coordinates between components.
 * 
 * State management strategy:
 * - Local state for UI-only concerns (query input)
 * - tRPC queries for server state (documents)
 * - Zustand for complex client state (selection, views)
 * 
 * Component responsibilities:
 * - Initialize app with config on startup
 * - Manage search query and results
 * - Coordinate operations on selected documents
 * - Handle global keyboard shortcuts
 */

// apps/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { QueryBar } from './components/QueryBar'
import { TableView } from '@mmt/table-view'
import { trpc } from './lib/trpc'

export function App() {
  const [query, setQuery] = useState('')
  
  // tRPC query with automatic caching and refetching
  const { data: documents, isLoading } = trpc.search.useQuery(
    { query },
    { 
      enabled: !!query,           // Only search if query exists
      staleTime: 5 * 60 * 1000,   // Cache for 5 minutes
      refetchOnWindowFocus: false // Don't refetch on focus
    }
  )
  
  useEffect(() => {
    // Initialize app with config path from command line
    const configPath = window.electronAPI?.argv?.find(arg => 
      arg.startsWith('--config=')
    )?.replace('--config=', '')
    
    if (configPath) {
      trpc.init.mutate({ configPath })
    } else {
      console.error('No config path provided. Use --config=path/to/config.yaml')
    }
  }, [])
  
  const handleOperation = async (type: string, selected: string[]) => {
    // Execute operations through tRPC
    if (type === 'move') {
      // Show move dialog and execute
      const targetFolder = await showMoveDialog()
      if (targetFolder) {
        await trpc.operations.move.mutate({
          files: selected,
          targetFolder
        })
      }
    }
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <QueryBar 
          value={query} 
          onChange={setQuery}
          placeholder="Search documents... (e.g., modified:>2024-01-01 kind:project)"
        />
      </header>
      
      <main className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <span>Searching...</span>
          </div>
        )}
        
        {documents && (
          <TableView 
            documents={documents}
            onOperation={handleOperation}
          />
        )}
        
        {!query && !isLoading && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Enter a search query to begin</p>
              <p className="text-sm">
                Try: <code className="bg-gray-100 px-2 py-1 rounded">path:/Projects/*</code>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

## Testing Strategy

### Integration Test Example

```typescript
/**
 * @fileoverview Indexer Integration Tests
 * 
 * These tests demonstrate our NO MOCKS testing philosophy.
 * We create real files in a temporary directory and test against them.
 * 
 * Testing principles demonstrated:
 * 1. Real file operations - no fs mocks or stubs
 * 2. Complete setup/teardown - clean test environment
 * 3. Test behavior, not implementation - focus on outcomes
 * 4. Performance assertions - ensure scalability goals
 * 
 * Benefits of this approach:
 * - Catches real filesystem edge cases
 * - Tests are documentation of actual behavior
 * - No false positives from mocked behavior
 * - Confidence that code works in production
 */

// packages/indexer/test/indexer.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { VaultIndex } from '../src'
import { NodeFileSystem } from '@mmt/filesystem-access'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

describe('VaultIndex E2E', () => {
  let testDir: string
  let indexer: VaultIndex
  const fs = new NodeFileSystem()
  
  beforeAll(async () => {
    // Create real test vault in OS temp directory
    testDir = await mkdtemp(join(tmpdir(), 'mmt-test-'))
    
    // Create test files with realistic content
    await fs.writeFile(
      join(testDir, 'doc1.md'),
      `---
title: Document 1
kind: test
---
# Document 1

This links to [[doc2]] and [[doc3]].`
    )
    
    await fs.writeFile(
      join(testDir, 'doc2.md'),
      `---
title: Document 2
kind: test
---
# Document 2

This links back to [[doc1]].`
    )
    
    // Initialize indexer with real filesystem
    indexer = new VaultIndex(testDir, fs)
    await indexer.initialize()
  })
  
  afterAll(async () => {
    // Clean up real files
    await indexer.dispose()  // Stop file watching
    await rm(testDir, { recursive: true })
  })
  
  it('finds all files linking TO doc1', () => {
    const incoming = indexer.getIncomingLinks(join(testDir, 'doc1.md'))
    expect(incoming).toHaveLength(1)
    expect(incoming[0].sourceFile).toContain('doc2.md')
  })
  
  it('finds all files linked FROM doc1', () => {
    const outgoing = indexer.getOutgoingLinks(join(testDir, 'doc1.md'))
    expect(outgoing).toHaveLength(2)
    expect(outgoing.map(l => l.linkText)).toEqual(['doc2', 'doc3'])
  })
  
  it('queries by frontmatter property', async () => {
    const results = await indexer.query({
      raw: 'kind:test',
      conditions: [{
        type: 'property',
        key: 'kind',
        operator: 'equals',
        value: 'test'
      }],
      logic: 'AND'
    })
    
    expect(results).toHaveLength(2)
  })
  
  it('updates index when file changes', async () => {
    // Modify a real file
    await fs.writeFile(
      join(testDir, 'doc1.md'),
      `---
title: Updated Document
kind: test
status: modified
---
# Updated

New content without links.`
    )
    
    // Wait for file watcher to process
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Verify index updated
    const results = await indexer.query({
      raw: 'status:modified',
      conditions: [{
        type: 'property',
        key: 'status',
        operator: 'equals',
        value: 'modified'
      }],
      logic: 'AND'
    })
    
    expect(results).toHaveLength(1)
    expect(results[0].frontmatter.title).toBe('Updated Document')
    
    // Verify links were updated
    const outgoing = indexer.getOutgoingLinks(join(testDir, 'doc1.md'))
    expect(outgoing).toHaveLength(0)  // Links removed
  })
})

/**
 * Performance tests ensure we meet our scalability goals.
 * Run with larger datasets in CI to catch regressions.
 */
describe('VaultIndex Performance', () => {
  it('indexes 5000 files in under 5 seconds', async () => {
    // Test implementation would create 5000 files
    // and measure indexing time
  })
})
```

## Development Workflow

### 1. Start with failing tests
```bash
# Write test first
cd packages/indexer
pnpm test --watch

# Test fails (red)
# Write minimal implementation
# Test passes (green)
# Refactor if needed
```

### 2. Run the development environment
```bash
# Terminal 1: Start all packages in dev mode
pnpm dev

# Terminal 2: Run tests
pnpm test --watch

# Terminal 3: Type checking
pnpm type-check --watch
```

### 3. Manual testing
```bash
# Create test config
cat > test-config.yaml << EOF
vaultPath: /Users/you/test-vault
EOF

# Run the app
pnpm dev -- --config test-config.yaml
```

## Key Implementation Notes

### Architecture Principles

1. **No Mocks** - All tests use real file operations
   - Tests reflect actual behavior, not mocked assumptions
   - Catches real edge cases early
   - No false confidence from stubbed implementations

2. **Test First** - Write failing tests before implementation
   - Tests define the specification
   - Implementation follows the test requirements
   - Prevents scope creep and over-engineering

3. **Type Safety** - Use Zod schemas everywhere
   - Runtime validation at package boundaries
   - Automatic TypeScript type generation
   - Single source of truth for data structures

4. **Separation of Concerns** - Each package has one responsibility
   - Easy to understand and test in isolation
   - Dependencies flow in one direction
   - Packages communicate only through schemas

5. **Performance** - Target 5000 files in < 5 seconds
   - Memory-efficient indexing strategies
   - Incremental updates, not full re-scans
   - Lazy loading for expensive operations

### Why These Choices Matter

- **Loose Coupling**: Packages depend on interfaces (schemas), not implementations. This makes the system flexible and testable.

- **Clear Dependencies**: The monorepo structure with explicit package boundaries prevents circular dependencies and makes the architecture clear.

- **Real Testing**: By avoiding mocks, we ensure our tests actually verify the system works. A passing test means the feature works in production.

- **Scalability**: The architecture supports large vaults from day one. Performance isn't an afterthought.

- **Maintainability**: With clear separation of concerns and comprehensive documentation, new developers can understand and contribute quickly.

## Next Steps

1. **Implement packages in order** following the milestones
2. **Write tests first** for each component
3. **Use real file operations** for all testing
4. **Keep the indexer fast** and memory-efficient
5. **Add QM integration** only after core features work

Remember: The goal is a simple, fast, reliable tool for managing markdown at scale. Every decision should support that goal.