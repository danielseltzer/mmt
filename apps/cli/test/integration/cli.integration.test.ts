import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../test-utils.js';

describe('CLI Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-cli-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('version flag', () => {
    it('should show version and exit successfully', async () => {
      const result = await runCli(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(/^mmt version \d+\.\d+\.\d+$/);
      expect(result.stderr).toBe('');
    });
  });

  describe('help command', () => {
    it('should show help for explicit help command', async () => {
      const result = await runCli(['help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('MMT - Markdown Management Toolkit');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('Examples:');
    });

    it('should show help for --help flag', async () => {
      const result = await runCli(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('MMT - Markdown Management Toolkit');
    });

    it('should show help when no command given', async () => {
      const result = await runCli([]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('MMT - Markdown Management Toolkit');
    });
  });

  describe('config requirement', () => {
    it('should require config for script command', async () => {
      const result = await runCli(['script', './test.js']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--config flag is required');
    });

    it('should handle invalid config path', async () => {
      const result = await runCli(['--config=/nonexistent/config.yaml', 'script', './test.js']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Config file not found');
    });

    it('should load valid config', async () => {
      // Create valid config
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}\napiPort: 3002\nwebPort: 8002`);
      
      // Create test script and markdown files
      const scriptPath = join(tempDir, 'test.mjs');
      writeFileSync(join(vaultPath, 'test1.md'), '# Test 1');
      writeFileSync(join(vaultPath, 'test2.md'), '# Test 2');
      
      writeFileSync(scriptPath, `
export default {
  define(context) {
    return {
      select: { files: [] },
      operations: [{
        type: 'move',
        fromPath: '/test.md',
        toPath: '/moved.md'
      }]
    };
  }
};
`);
      
      const result = await runCli(['--config=' + configPath, 'script', scriptPath]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('PREVIEW MODE');
    });
  });

  describe('unknown command', () => {
    it('should exit with error for unknown command', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}\napiPort: 3002\nwebPort: 8002`);
      
      const result = await runCli(['--config=' + configPath, 'unknown']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command: unknown');
    });
  });

  describe('script command', () => {
    it('should execute script in preview mode by default', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}\napiPort: 3002\nwebPort: 8002`);
      
      // Create test script and markdown files
      const scriptPath = join(tempDir, 'hello.mjs');
      writeFileSync(join(vaultPath, 'test1.md'), '# Test 1');
      writeFileSync(join(vaultPath, 'test2.md'), '# Test 2');
      
      writeFileSync(scriptPath, `
export default {
  define(context) {
    return {
      select: { files: [] },
      operations: [{
        type: 'move',
        fromPath: '/test.md',
        toPath: '/moved.md'
      }]
    };
  }
};
`);
      
      const result = await runCli(['--config=' + configPath, 'script', scriptPath]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('PREVIEW MODE');
      expect(result.stdout).not.toContain('EXECUTION COMPLETE');
    });

    it('should execute script with --execute flag', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}\napiPort: 3002\nwebPort: 8002`);
      
      // Create test script and markdown files
      const scriptPath = join(tempDir, 'hello.mjs');
      writeFileSync(join(vaultPath, 'test1.md'), '# Test 1');
      writeFileSync(join(vaultPath, 'test2.md'), '# Test 2');
      
      writeFileSync(scriptPath, `
export default {
  define(context) {
    return {
      select: { files: [] },
      operations: [{
        type: 'move',
        fromPath: '/test.md',
        toPath: '/moved.md'
      }]
    };
  }
};
`);
      
      const result = await runCli([
        '--config=' + configPath,
        'script',
        scriptPath,
        '--execute'
      ]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('EXECUTION COMPLETE');
      expect(result.stdout).not.toContain('PREVIEW MODE');
    });

    it('should require script path', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}\napiPort: 3002\nwebPort: 8002`);
      
      const result = await runCli(['--config=' + configPath, 'script']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Script path required');
    });

    it('should handle invalid script path', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}\napiPort: 3002\nwebPort: 8002`);
      
      const result = await runCli([
        '--config=' + configPath,
        'script',
        join(tempDir, 'nonexistent.mjs')
      ]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Failed to load script');
    });
  });

  describe('debug mode', () => {
    it('should enable debug output', async () => {
      const result = await runCli(['--debug', 'help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('[DEBUG] Debug mode enabled');
      expect(result.stdout).toContain('MMT - Markdown Management Toolkit');
    });
  });
});