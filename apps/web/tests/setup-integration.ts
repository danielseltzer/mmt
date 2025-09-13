import { beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// The API server is already running via globalSetup
// We just need to set up test-specific data

let testVaultDir: string;

beforeEach(async () => {
  // Create a unique vault directory for each test
  const testDir = mkdtempSync(join(tmpdir(), 'mmt-test-'));
  testVaultDir = join(testDir, 'vault');
  mkdirSync(testVaultDir, { recursive: true });
  
  // Store the test vault path for tests to use
  process.env.MMT_TEST_VAULT = testVaultDir;
});

afterEach(async () => {
  // Clean up test-specific data
  if (testVaultDir) {
    try {
      const parent = join(testVaultDir, '..');
      rmSync(parent, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  }
});