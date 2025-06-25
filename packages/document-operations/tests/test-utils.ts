import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Document } from '@mmt/entities';
import type { OperationContext } from '../src/types.js';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { VaultIndexer } from '@mmt/indexer';

/**
 * Create a temporary test vault with real files
 */
export async function createTestVault(): Promise<{
  vaultPath: string;
  cleanup: () => Promise<void>;
}> {
  const vaultPath = await mkdtemp(join(tmpdir(), 'mmt-test-vault-'));
  
  const cleanup = async () => {
    await rm(vaultPath, { recursive: true, force: true });
  };
  
  return { vaultPath, cleanup };
}

/**
 * Create a test document in the vault
 */
export async function createTestDocument(
  vaultPath: string,
  relativePath: string,
  content: string,
  frontmatter?: Record<string, any>
): Promise<Document> {
  const fullPath = join(vaultPath, relativePath);
  const dir = join(fullPath, '..');
  await mkdir(dir, { recursive: true });
  
  let fullContent = content;
  if (frontmatter && Object.keys(frontmatter).length > 0) {
    fullContent = `---\n${Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}\n---\n\n${content}`;
  }
  
  await writeFile(fullPath, fullContent, 'utf-8');
  
  return {
    path: fullPath,
    content: fullContent,
    metadata: {
      name: relativePath.replace(/\.md$/, '').split('/').pop() || relativePath,
      modified: new Date(),
      size: Buffer.byteLength(fullContent),
      frontmatter: frontmatter || {},
      tags: [],
      links: [],
      backlinks: []
    }
  };
}

/**
 * Create a real operation context for testing
 */
export async function createTestContext(vaultPath: string): Promise<OperationContext> {
  const fs = new NodeFileSystem();
  const indexer = new VaultIndexer({
    vaultPath,
    fileSystem: fs,
    useCache: false,
    useWorkers: false
  });
  
  await indexer.initialize();
  
  return {
    vault: { path: vaultPath },
    fs,
    indexer,
    options: {
      dryRun: false,
      updateLinks: true,
      createBackup: false,
      continueOnError: false
    }
  };
}