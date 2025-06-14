/**
 * @fileoverview Test utilities for creating test vaults and documents
 */
import type { FileSystemAccess } from '@mmt/filesystem-access';
import type { Document, Vault } from '@mmt/entities';
export interface TestFile {
    path: string;
    content: string;
    frontmatter?: Record<string, unknown>;
}
/**
 * Creates a minimal test vault with common scenarios
 */
export declare function createTestVault(tempDir: string, fs?: FileSystemAccess): Promise<void>;
/**
 * Creates a large test vault for performance testing
 */
export declare function createLargeTestVault(tempDir: string, fileCount?: number, fs?: FileSystemAccess): Promise<void>;
/**
 * Creates a temporary directory for testing
 */
export declare function createTempDir(): Promise<string>;
/**
 * Cleans up a test directory
 */
export declare function cleanupTempDir(dir: string): Promise<void>;
/**
 * Test lifecycle helper
 */
export declare class TestVault {
    private tempDir;
    private fs;
    constructor(fs?: FileSystemAccess);
    setup(large?: boolean): Promise<string>;
    cleanup(): Promise<void>;
    get path(): string;
}
/**
 * Custom assertions for vault operations
 */
export declare const vaultAssertions: {
    /**
     * Assert that a file exists at the given path
     */
    fileExists(vault: Vault, relativePath: string): Promise<void>;
    /**
     * Assert that a file does not exist
     */
    fileNotExists(vault: Vault, relativePath: string): Promise<void>;
    /**
     * Assert that a document has specific frontmatter
     */
    documentHasFrontmatter(doc: Document, key: string, value: unknown): void;
    /**
     * Assert that links have been updated correctly
     */
    linksUpdated(doc: Document, oldTarget: string, newTarget: string): void;
};
//# sourceMappingURL=test-utils.d.ts.map