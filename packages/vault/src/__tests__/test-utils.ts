import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { VaultConfig } from '@mmt/entities';

/**
 * Test factory for creating temporary vaults with real markdown files.
 * 
 * WHY: Follows NO MOCKS policy by using real file system operations.
 * - Creates actual temp directories with markdown content
 * - Provides cleanup utilities to prevent test pollution
 * - Supports various vault configurations for testing
 * 
 * DESIGN DECISION: Factory pattern allows for:
 * - Consistent test vault creation across all test files
 * - Easy customization of vault content and configuration
 * - Centralized cleanup logic to prevent resource leaks
 */
export class TestVaultFactory {
  private createdPaths: string[] = [];

  /**
   * Creates a temporary vault directory with markdown files.
   * 
   * @param files Object mapping relative paths to content
   * @returns Object with vault path and cleanup function
   */
  async createTempVault(
    files: Record<string, string> = {}
  ): Promise<{ path: string; cleanup: () => Promise<void> }> {
    const tempDir = await mkdtemp(join(tmpdir(), 'mmt-vault-test-'));
    this.createdPaths.push(tempDir);

    // Create default files if none provided
    const defaultFiles = Object.keys(files).length > 0 ? files : {
      'readme.md': '# Test Vault\n\nThis is a test vault.',
      'docs/guide.md': '# Guide\n\nSome documentation.',
      'notes/meeting.md': '# Meeting Notes\n\n- Topic 1\n- Topic 2'
    };

    // Write all files to temp directory
    for (const [filename, content] of Object.entries(defaultFiles)) {
      const filepath = join(tempDir, filename);
      const dir = join(filepath, '..');
      
      // Ensure directory exists
      await mkdir(dir, { recursive: true });
      await writeFile(filepath, content);
    }

    const cleanup = async () => {
      try {
        await rm(tempDir, { recursive: true, force: true });
        const index = this.createdPaths.indexOf(tempDir);
        if (index > -1) {
          this.createdPaths.splice(index, 1);
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp vault ${tempDir}:`, error);
      }
    };

    return { path: tempDir, cleanup };
  }

  /**
   * Creates a VaultConfig object for testing.
   * 
   * @param name Vault name/identifier
   * @param path Vault directory path
   * @param fileWatching Whether to enable file watching
   * @returns VaultConfig object
   */
  createVaultConfig(
    name: string,
    path: string,
    fileWatching = false
  ): VaultConfig {
    return {
      name,
      path,
      indexPath: join(path, '.mmt-index'),
      fileWatching: fileWatching ? {
        enabled: true,
        debounceMs: 100,
        ignorePatterns: ['.git/**', '.obsidian/**', '.trash/**', 'node_modules/**']
      } : undefined
    };
  }

  /**
   * Waits for a vault to reach ready or error state.
   * 
   * @param vault Vault instance to wait for
   * @param timeoutMs Maximum time to wait in milliseconds
   * @returns Promise that resolves when vault is ready or rejects on error/timeout
   */
  async waitForVaultReady(vault: any, timeoutMs = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (vault.status === 'initializing') {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Vault ${vault.id} did not initialize within ${timeoutMs}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (vault.status === 'error') {
      throw vault.error || new Error(`Vault ${vault.id} failed to initialize`);
    }
  }

  /**
   * Cleans up all created temp directories.
   * Should be called in afterEach/afterAll hooks.
   */
  async cleanupAll(): Promise<void> {
    await Promise.all(
      this.createdPaths.map(async (path) => {
        try {
          await rm(path, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to cleanup ${path}:`, error);
        }
      })
    );
    this.createdPaths = [];
  }
}

/**
 * Utility to suppress console.error during tests.
 * Useful when testing error conditions that log to console.
 */
export function suppressConsoleError(): () => void {
  const originalError = console.error;
  console.error = () => {};
  
  return () => {
    console.error = originalError;
  };
}